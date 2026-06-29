import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { InMemoryStaticTableRepository } from './repository.js'
import { commitStaticTableImport, previewStaticTableImport, scanTableFiles, validateStaticTableFiles } from './service.js'

async function createPrioritySmokeFixtureDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'static-table-priority-smoke-'))
  await fs.writeFile(
    path.join(dir, 'X-ECO-00_currency_master.csv'),
    [
      'currency_id,display_name,enabled',
      'coin,코인,true',
      'diamond,다이아,true',
    ].join('\n'),
    'utf8',
  )
  await fs.writeFile(
    path.join(dir, 'G-ITM-01_item_catalog.csv'),
    [
      'item_id,display_name,item_type,enabled',
      'basic_food,기본 먹이,consumable,true',
      'aidong_ribbon,아이동 리본,cosmetic,true',
    ].join('\n'),
    'utf8',
  )
  await fs.writeFile(
    path.join(dir, 'G-CHR-01_aidong_master.csv'),
    [
      'aidong_id,display_name,rarity,enabled',
      'hwanggumeong,황금멍,common,true',
      'chumnyang,춤냥,common,true',
    ].join('\n'),
    'utf8',
  )
  return dir
}

describe('static table priority smoke', () => {
  it('commits currency, item catalog, and Aidong master rows end-to-end', async () => {
    const dir = await createPrioritySmokeFixtureDir()
    const scan = await scanTableFiles(dir)

    expect(scan.errors).toEqual([])
    expect(scan.files.map((file) => file.tableCode).sort()).toEqual([
      'G-CHR-01',
      'G-ITM-01',
      'X-ECO-00',
    ])
    await expect(validateStaticTableFiles(scan.files)).resolves.toMatchObject({ ok: true })

    const preview = await previewStaticTableImport(scan.files, {
      version: 'priority-smoke-v1',
      importBatchId: 'priority-smoke-batch',
      now: 1000,
    })
    expect(preview).toMatchObject({
      ok: true,
      tableRowCount: 6,
      runtimeRowCounts: {
        staticAidongMasters: 2,
        staticCurrencyMasters: 2,
        staticItemCatalogs: 2,
      },
      bundleCounts: {},
    })

    const repository = new InMemoryStaticTableRepository()
    const commit = await commitStaticTableImport(scan.files, 'admin-smoke', {
      repository,
      version: 'priority-smoke-v1',
      importBatchId: 'priority-smoke-batch',
      now: 1000,
    })

    expect(commit.committed).toBe(true)
    expect(await repository.listImportBatches()).toEqual([
      expect.objectContaining({
        importBatchId: 'priority-smoke-batch',
        status: 'committed',
        actorUid: 'admin-smoke',
        sourceFiles: expect.arrayContaining([
          expect.objectContaining({ tableCode: 'X-ECO-00', rowCount: 2 }),
          expect.objectContaining({ tableCode: 'G-ITM-01', rowCount: 2 }),
          expect.objectContaining({ tableCode: 'G-CHR-01', rowCount: 2 }),
        ]),
      }),
    ])

    expect(await repository.listRuntimeRows('staticCurrencyMasters', 'priority-smoke-v1')).toEqual([
      expect.objectContaining({ rowKey: 'coin', data: expect.objectContaining({ currencyId: 'coin' }) }),
      expect.objectContaining({ rowKey: 'diamond', data: expect.objectContaining({ currencyId: 'diamond' }) }),
    ])
    expect(await repository.listRuntimeRows('staticItemCatalogs', 'priority-smoke-v1')).toEqual([
      expect.objectContaining({ rowKey: 'basic_food', data: expect.objectContaining({ itemId: 'basic_food' }) }),
      expect.objectContaining({ rowKey: 'aidong_ribbon', data: expect.objectContaining({ itemId: 'aidong_ribbon' }) }),
    ])
    expect(await repository.listRuntimeRows('staticAidongMasters', 'priority-smoke-v1')).toEqual([
      expect.objectContaining({ rowKey: 'hwanggumeong', data: expect.objectContaining({ aidongId: 'hwanggumeong' }) }),
      expect.objectContaining({ rowKey: 'chumnyang', data: expect.objectContaining({ aidongId: 'chumnyang' }) }),
    ])

    expect(await repository.listTableRows('X-ECO-00', 'priority-smoke-v1')).toHaveLength(2)
    expect(await repository.listTableRows('G-ITM-01', 'priority-smoke-v1')).toHaveLength(2)
    expect(await repository.listTableRows('G-CHR-01', 'priority-smoke-v1')).toHaveLength(2)
  })
})
