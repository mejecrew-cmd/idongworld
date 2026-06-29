import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { InMemoryStaticTableRepository } from './repository.js'
import {
  commitStaticTableImport,
  previewStaticTableImport,
  scanTableFiles,
  validateStaticTableFiles,
} from './service.js'

describe('static table import service', () => {
  it('scans resources/table CSV files and reports parse errors without stopping the whole scan', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'static-table-scan-'))
    await fs.writeFile(path.join(dir, 'X-ECO-00_currency_master.csv'), 'currency_id,display_name\ncoin,Coin\n', 'utf8')
    await fs.writeFile(path.join(dir, 'UNKNOWN_table.csv'), 'id\n1\n', 'utf8')
    await fs.writeFile(path.join(dir, 'readme.txt'), 'ignore me', 'utf8')

    const result = await scanTableFiles(dir)

    expect(result.sourceDir).toBe(dir)
    expect(result.files).toEqual([
      expect.objectContaining({
        fileName: 'X-ECO-00_currency_master.csv',
        tableCode: 'X-ECO-00',
        rowCount: 1,
      }),
    ])
    expect(result.errors).toEqual([
      expect.objectContaining({
        fileName: 'UNKNOWN_table.csv',
        code: 'static_table_code_not_found',
      }),
    ])
  })

  it('validates, previews, and commits static import rows and bundles', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'static-table-import-'))
    await fs.writeFile(path.join(dir, 'X-ECO-00_currency_master.csv'), 'currency_id,display_name\ncoin,Coin\n', 'utf8')
    await fs.writeFile(path.join(dir, 'X-CFG-01_board_set_master.csv'), 'board_set_id,display_name\nneighbor,Neighbor\n', 'utf8')
    await fs.writeFile(
      path.join(dir, 'M05-MAP-02_board_slot.csv'),
      'board_set_id,slot_no,reward_currency_id\nneighbor,1,coin\n',
      'utf8',
    )

    const scan = await scanTableFiles(dir)
    expect(scan.errors).toEqual([])
    await expect(validateStaticTableFiles(scan.files)).resolves.toMatchObject({ ok: true })

    const repository = new InMemoryStaticTableRepository()
    const preview = await previewStaticTableImport(scan.files, {
      version: 'v1',
      importBatchId: 'batch-1',
      now: 1000,
    })

    expect(preview).toMatchObject({
      ok: true,
      version: 'v1',
      importBatchId: 'batch-1',
      tableRowCount: 3,
      runtimeRowCounts: {
        staticBoardSetMasters: 1,
        staticBoardSlots: 1,
        staticCurrencyMasters: 1,
      },
      bundleCounts: {
        staticBoardSets: 1,
      },
    })
    expect(await repository.listImportBatches()).toEqual([])

    const commit = await commitStaticTableImport(scan.files, 'owner-uid', {
      repository,
      version: 'v1',
      importBatchId: 'batch-1',
      now: 1000,
    })

    expect(commit.committed).toBe(true)
    expect(await repository.listImportBatches()).toEqual([
      expect.objectContaining({
        importBatchId: 'batch-1',
        status: 'committed',
        actorUid: 'owner-uid',
      }),
    ])
    expect(await repository.listTableRows('X-ECO-00', 'v1')).toEqual([
      expect.objectContaining({
        rowKey: 'coin',
        normalizedRow: expect.objectContaining({ currencyId: 'coin' }),
      }),
    ])
    expect(await repository.listRuntimeRows('staticCurrencyMasters', 'v1')).toEqual([
      expect.objectContaining({
        rowKey: 'coin',
        data: expect.objectContaining({ currencyId: 'coin' }),
      }),
    ])
    expect(await repository.listRuntimeBundles('staticBoardSets', 'v1')).toEqual([
      expect.objectContaining({
        bundleId: 'neighbor',
        data: expect.objectContaining({
          slots: [expect.objectContaining({ slotNo: 1 })],
        }),
      }),
    ])
  })

  it('records failed import batch when validation fails during commit', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'static-table-failed-'))
    await fs.writeFile(path.join(dir, 'M17-ECO-01_user_currency_balance.csv'), 'uid,currency_id,balance\nu1,coin,10\n', 'utf8')

    const scan = await scanTableFiles(dir)
    const repository = new InMemoryStaticTableRepository()

    await expect(commitStaticTableImport(scan.files, 'owner-uid', {
      repository,
      version: 'v1',
      importBatchId: 'batch-failed',
      now: 1000,
    })).rejects.toThrow('static_import_validation_failed')

    expect(await repository.listImportBatches()).toEqual([
      expect.objectContaining({
        importBatchId: 'batch-failed',
        status: 'failed',
        errorMessage: 'static_import_validation_failed',
      }),
    ])
    expect(await repository.listTableRows('M17-ECO-01', 'v1')).toEqual([])
  })
})
