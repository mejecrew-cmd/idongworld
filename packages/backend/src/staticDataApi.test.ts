import express from 'express'
import { describe, expect, it } from 'vitest'
import { authMiddleware } from './middleware/auth.js'
import { getStaticTableRepository, initializeRepositories } from './repositories/index.js'
import { staticDataRouter } from './routes/staticData.js'

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

describe('runtime static data API', () => {
  it('serves only the latest activated static import version', async () => {
    initializeRepositories()
    const previousNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    const uid = testUid('static-runtime')
    const repository = getStaticTableRepository()

    await repository.upsertImportBatch({
      importBatchId: 'static-committed-only',
      status: 'committed',
      version: 'committed-v1',
      sourceFiles: [],
      createdAt: 1000,
      updatedAt: 1000,
      committedAt: 1000,
    })
    await repository.upsertRuntimeRows('staticCurrencyMasters', [
      {
        tableCode: 'X-ECO-00',
        version: 'committed-v1',
        rowKey: 'coin',
        sourceHash: 'hash-committed',
        importBatchId: 'static-committed-only',
        enabled: true,
        data: { currencyId: 'coin', displayName: '커밋만 된 코인' },
        createdAt: 1000,
        updatedAt: 1000,
      },
    ])

    const app = express()
    app.use(express.json())
    app.use('/api', authMiddleware)
    app.use('/api/static', staticDataRouter)
    const server = app.listen(0)

    try {
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('invalid_test_server_address')
      const baseUrl = `http://127.0.0.1:${address.port}/api/static`

      const noActive = await fetch(`${baseUrl}/currencies`, {
        headers: { 'X-Uid': uid },
      })
      expect(noActive.status).toBe(404)

      await repository.upsertImportBatch({
        importBatchId: 'static-active-v1',
        status: 'activated',
        version: 'active-v1',
        sourceFiles: [],
        createdAt: 2000,
        updatedAt: 2000,
        committedAt: 2000,
        activatedAt: 2000,
      })
      await repository.upsertRuntimeRows('staticCurrencyMasters', [
        {
          tableCode: 'X-ECO-00',
          version: 'active-v1',
          rowKey: 'coin',
          sourceHash: 'hash-active',
          importBatchId: 'static-active-v1',
          enabled: true,
          data: { currencyId: 'coin', displayName: '코인' },
          createdAt: 2000,
          updatedAt: 2000,
        },
        {
          tableCode: 'X-ECO-00',
          version: 'active-v1',
          rowKey: 'disabled',
          sourceHash: 'hash-active',
          importBatchId: 'static-active-v1',
          enabled: false,
          data: { currencyId: 'disabled', displayName: '숨김' },
          createdAt: 2000,
          updatedAt: 2000,
        },
      ])
      await repository.upsertRuntimeRows('staticAidongMasters', [
        {
          tableCode: 'G-CHR-01',
          version: 'active-v1',
          rowKey: 'hwanggumeong',
          sourceHash: 'hash-active',
          importBatchId: 'static-active-v1',
          enabled: true,
          data: { aidongId: 'hwanggumeong', displayName: '황금멍' },
          createdAt: 2000,
          updatedAt: 2000,
        },
      ])
      await repository.upsertRuntimeRows('staticItemCatalogs', [
        {
          tableCode: 'G-ITM-01',
          version: 'active-v1',
          rowKey: 'basic_food',
          sourceHash: 'hash-active',
          importBatchId: 'static-active-v1',
          enabled: true,
          data: { itemId: 'basic_food', displayName: '기본 먹이' },
          createdAt: 2000,
          updatedAt: 2000,
        },
      ])
      await repository.upsertRuntimeBundles('staticBoardSets', [
        {
          bundleId: 'neighbor',
          version: 'active-v1',
          sourceTableCodes: ['X-CFG-01', 'M05-MAP-02'],
          importBatchId: 'static-active-v1',
          enabled: true,
          data: { boardSetId: 'neighbor', slots: [{ slotNo: 1 }] },
          createdAt: 2000,
          updatedAt: 2000,
        },
      ])
      await repository.upsertRuntimeBundles('staticSooksoRuleSets', [
        {
          bundleId: 'basic',
          version: 'active-v1',
          sourceTableCodes: ['M04-MAP-02', 'M04-MAP-03'],
          importBatchId: 'static-active-v1',
          enabled: true,
          data: { houseId: 'basic', placementSlots: [{ placementSlotId: 'floor' }] },
          createdAt: 2000,
          updatedAt: 2000,
        },
      ])

      const currencies = await fetch(`${baseUrl}/currencies`, {
        headers: { 'X-Uid': uid },
      })
      expect(currencies.status).toBe(200)
      await expect(currencies.json()).resolves.toMatchObject({
        ok: true,
        version: 'active-v1',
        importBatchId: 'static-active-v1',
        currencies: [{ currencyId: 'coin', displayName: '코인' }],
      })

      const aidongs = await fetch(`${baseUrl}/aidongs`, {
        headers: { 'X-Uid': uid },
      })
      expect(aidongs.status).toBe(200)
      await expect(aidongs.json()).resolves.toMatchObject({
        aidongs: [{ aidongId: 'hwanggumeong', displayName: '황금멍' }],
      })

      const items = await fetch(`${baseUrl}/items`, {
        headers: { 'X-Uid': uid },
      })
      expect(items.status).toBe(200)
      await expect(items.json()).resolves.toMatchObject({
        items: [{ itemId: 'basic_food', displayName: '기본 먹이' }],
      })

      const boardSet = await fetch(`${baseUrl}/board-sets/neighbor`, {
        headers: { 'X-Uid': uid },
      })
      expect(boardSet.status).toBe(200)
      await expect(boardSet.json()).resolves.toMatchObject({
        boardSet: { boardSetId: 'neighbor', slots: [{ slotNo: 1 }] },
      })

      const sooksoRuleSets = await fetch(`${baseUrl}/sookso-rule-set`, {
        headers: { 'X-Uid': uid },
      })
      expect(sooksoRuleSets.status).toBe(200)
      await expect(sooksoRuleSets.json()).resolves.toMatchObject({
        ruleSets: [{ houseId: 'basic', placementSlots: [{ placementSlotId: 'floor' }] }],
      })

      const sooksoRuleSet = await fetch(`${baseUrl}/sookso-rule-set?houseId=basic`, {
        headers: { 'X-Uid': uid },
      })
      expect(sooksoRuleSet.status).toBe(200)
      await expect(sooksoRuleSet.json()).resolves.toMatchObject({
        ruleSet: { houseId: 'basic', placementSlots: [{ placementSlotId: 'floor' }] },
      })

      await repository.upsertImportBatch({
        importBatchId: 'static-active-v2',
        status: 'activated',
        version: 'active-v2',
        sourceFiles: [],
        createdAt: 3000,
        updatedAt: 3000,
        committedAt: 3000,
        activatedAt: 3000,
      })
      await repository.upsertRuntimeRows('staticCurrencyMasters', [
        {
          tableCode: 'X-ECO-00',
          version: 'active-v2',
          rowKey: 'diamond',
          sourceHash: 'hash-active-v2',
          importBatchId: 'static-active-v2',
          enabled: true,
          data: { currencyId: 'diamond', displayName: '다이아' },
          createdAt: 3000,
          updatedAt: 3000,
        },
      ])

      const latest = await fetch(`${baseUrl}/currencies`, {
        headers: { 'X-Uid': uid },
      })
      expect(latest.status).toBe(200)
      await expect(latest.json()).resolves.toMatchObject({
        version: 'active-v2',
        importBatchId: 'static-active-v2',
        currencies: [{ currencyId: 'diamond', displayName: '다이아' }],
      })
    } finally {
      await closeTestServer(server)
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = previousNodeEnv
    }
  })
})
