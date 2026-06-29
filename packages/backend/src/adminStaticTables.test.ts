import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import express from 'express'
import { describe, expect, it } from 'vitest'
import { authMiddleware } from './middleware/auth.js'
import { getAdminRepository, getStaticTableRepository, initializeRepositories } from './repositories/index.js'
import { adminRouter } from './routes/admin.js'

function testUid(label: string) {
  return `test-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function closeTestServer(server: ReturnType<ReturnType<typeof express>['listen']>) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

async function createStaticTableFixtureDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'idong-static-tables-'))
  await fs.writeFile(
    path.join(dir, 'X-ECO-00_currency_master.csv'),
    [
      'currency_id,currency_name,enabled',
      'coin,Coin,true',
      'diamond,Diamond,true',
    ].join('\n'),
    'utf8',
  )
  await fs.writeFile(
    path.join(dir, 'G-USR-01_users.csv'),
    [
      'uid,status',
      'dynamic-user,active',
    ].join('\n'),
    'utf8',
  )
  return dir
}

describe('admin static table APIs', () => {
  it('guards registry, validate, dry-run, commit, history, and activate by admin role', async () => {
    initializeRepositories()
    const previousNodeEnv = process.env.NODE_ENV
    const previousSourceDir = process.env.STATIC_TABLE_SOURCE_DIR
    process.env.NODE_ENV = 'development'
    process.env.STATIC_TABLE_SOURCE_DIR = await createStaticTableFixtureDir()

    const ownerUid = testUid('static-owner')
    const operatorUid = testUid('static-operator')
    const viewerUid = testUid('static-viewer')
    const normalUid = testUid('static-normal')

    await getAdminRepository().upsertAdminUser({ uid: ownerUid, role: 'owner', enabled: true })
    await getAdminRepository().upsertAdminUser({
      uid: operatorUid,
      role: 'operator',
      permissions: ['db.read', 'db.write'],
      enabled: true,
    })
    await getAdminRepository().upsertAdminUser({
      uid: viewerUid,
      role: 'viewer',
      permissions: ['db.read'],
      enabled: true,
    })

    const app = express()
    app.use(express.json())
    app.use('/api', authMiddleware)
    app.use('/api/admin', adminRouter)
    const server = app.listen(0)

    try {
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('invalid_test_server_address')
      const baseUrl = `http://127.0.0.1:${address.port}/api/admin`

      const normalRegistry = await fetch(`${baseUrl}/static-tables/registry`, {
        headers: { 'X-Uid': normalUid },
      })
      expect(normalRegistry.status).toBe(403)

      const viewerRegistry = await fetch(`${baseUrl}/static-tables/registry`, {
        headers: { 'X-Uid': viewerUid },
      })
      expect(viewerRegistry.status).toBe(200)
      await expect(viewerRegistry.json()).resolves.toMatchObject({
        definitions: expect.any(Array),
        importableDefinitions: expect.any(Array),
      })

      const viewerValidate = await fetch(`${baseUrl}/static-tables/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Uid': viewerUid,
        },
      })
      expect(viewerValidate.status).toBe(403)

      const operatorValidate = await fetch(`${baseUrl}/static-tables/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Uid': operatorUid,
        },
      })
      expect(operatorValidate.status).toBe(200)
      await expect(operatorValidate.json()).resolves.toMatchObject({
        ok: true,
        files: [expect.objectContaining({ tableCode: 'X-ECO-00' })],
      })

      const dynamicCommit = await fetch(`${baseUrl}/static-tables/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Uid': operatorUid,
        },
        body: JSON.stringify({
          importBatchId: 'dynamic-table-blocked',
          version: 'test-dynamic',
          tableCodes: ['G-USR-01'],
        }),
      })
      expect(dynamicCommit.status).toBe(422)
      await expect(dynamicCommit.json()).resolves.toMatchObject({
        error: 'static_import_validation_failed',
        ok: false,
        validation: {
          errors: [expect.objectContaining({ code: 'excluded_table_commit_blocked' })],
          summaries: [expect.objectContaining({ tableCode: 'G-USR-01' })],
        },
      })

      const dryRun = await fetch(`${baseUrl}/static-tables/dry-run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Uid': operatorUid,
        },
        body: JSON.stringify({
          importBatchId: 'static-table-dry-run',
          version: 'test-v1',
        }),
      })
      expect(dryRun.status).toBe(200)
      await expect(dryRun.json()).resolves.toMatchObject({
        ok: true,
        tableRowCount: 2,
        runtimeRowCounts: { staticCurrencyMasters: 2 },
      })

      const commit = await fetch(`${baseUrl}/static-tables/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Uid': operatorUid,
        },
        body: JSON.stringify({
          importBatchId: 'static-table-commit',
          version: 'test-v1',
        }),
      })
      expect(commit.status).toBe(200)
      await expect(commit.json()).resolves.toMatchObject({
        committed: true,
        importBatchId: 'static-table-commit',
        runtimeRowCounts: { staticCurrencyMasters: 2 },
      })

      const runtimeRows = await getStaticTableRepository().listRuntimeRows('staticCurrencyMasters', 'test-v1')
      expect(runtimeRows).toHaveLength(2)
      expect(runtimeRows[0]).toMatchObject({ tableCode: 'X-ECO-00', version: 'test-v1' })

      const operatorActivate = await fetch(`${baseUrl}/static-tables/imports/static-table-commit/activate`, {
        method: 'POST',
        headers: { 'X-Uid': operatorUid },
      })
      expect(operatorActivate.status).toBe(403)

      const ownerActivate = await fetch(`${baseUrl}/static-tables/imports/static-table-commit/activate`, {
        method: 'POST',
        headers: { 'X-Uid': ownerUid },
      })
      expect(ownerActivate.status).toBe(200)
      await expect(ownerActivate.json()).resolves.toMatchObject({
        ok: true,
        import: {
          importBatchId: 'static-table-commit',
          status: 'activated',
        },
      })

      const history = await fetch(`${baseUrl}/static-tables/imports`, {
        headers: { 'X-Uid': viewerUid },
      })
      expect(history.status).toBe(200)
      await expect(history.json()).resolves.toMatchObject({
        imports: expect.arrayContaining([
          expect.objectContaining({ importBatchId: 'static-table-commit', status: 'activated' }),
        ]),
      })
    } finally {
      await closeTestServer(server)
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = previousNodeEnv
      if (previousSourceDir === undefined) delete process.env.STATIC_TABLE_SOURCE_DIR
      else process.env.STATIC_TABLE_SOURCE_DIR = previousSourceDir
    }
  })
})
