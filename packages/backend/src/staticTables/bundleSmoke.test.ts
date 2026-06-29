import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { InMemoryStaticTableRepository } from './repository.js'
import { commitStaticTableImport, previewStaticTableImport, scanTableFiles, validateStaticTableFiles } from './service.js'

async function createBundleSmokeFixtureDir(options: { duplicateBoardSlot?: boolean; badRewardCurrency?: boolean } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'static-table-bundle-smoke-'))
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
    ].join('\n'),
    'utf8',
  )
  await fs.writeFile(
    path.join(dir, 'X-CFG-01_board_set_master.csv'),
    [
      'board_set_id,display_name,enabled',
      'neighbor,이웃 항로,true',
    ].join('\n'),
    'utf8',
  )
  await fs.writeFile(
    path.join(dir, 'M05-MAP-02_board_slot.csv'),
    [
      'board_set_id,slot_no,slot_type,reward_currency_id,reward_item_id',
      `neighbor,2,sea,${options.badRewardCurrency ? 'missing_coin' : 'coin'},`,
      'neighbor,1,start,,basic_food',
      options.duplicateBoardSlot ? 'neighbor,1,duplicate,,basic_food' : '',
    ].filter(Boolean).join('\n'),
    'utf8',
  )
  await fs.writeFile(
    path.join(dir, 'M04-MAP-02_house_master.csv'),
    [
      'house_id,display_name,enabled',
      'basic,기본 숙소,true',
    ].join('\n'),
    'utf8',
  )
  await fs.writeFile(
    path.join(dir, 'M04-MAP-03_room_placement_slot.csv'),
    [
      'house_id,placement_slot_id,slot_no,slot_type',
      'basic,wall,2,wall',
      'basic,floor,1,floor',
    ].join('\n'),
    'utf8',
  )
  return dir
}

describe('static table bundle smoke', () => {
  it('commits board and sookso JSON bundles end-to-end', async () => {
    const dir = await createBundleSmokeFixtureDir()
    const scan = await scanTableFiles(dir)

    expect(scan.errors).toEqual([])
    await expect(validateStaticTableFiles(scan.files)).resolves.toMatchObject({ ok: true })

    const preview = await previewStaticTableImport(scan.files, {
      version: 'bundle-smoke-v1',
      importBatchId: 'bundle-smoke-batch',
      now: 1000,
    })
    expect(preview).toMatchObject({
      ok: true,
      tableRowCount: 9,
      runtimeRowCounts: {
        staticBoardSetMasters: 1,
        staticBoardSlots: 2,
        staticCurrencyMasters: 2,
        staticHouseMasters: 1,
        staticItemCatalogs: 1,
        staticRoomPlacementSlots: 2,
      },
      bundleCounts: {
        staticBoardSets: 1,
        staticSooksoRuleSets: 1,
      },
    })

    const repository = new InMemoryStaticTableRepository()
    const commit = await commitStaticTableImport(scan.files, 'admin-smoke', {
      repository,
      version: 'bundle-smoke-v1',
      importBatchId: 'bundle-smoke-batch',
      now: 1000,
    })
    expect(commit.committed).toBe(true)

    expect(await repository.listRuntimeBundles('staticBoardSets', 'bundle-smoke-v1')).toEqual([
      expect.objectContaining({
        bundleId: 'neighbor',
        sourceTableCodes: ['X-CFG-01', 'M05-MAP-02'],
        data: expect.objectContaining({
          boardSetId: 'neighbor',
          slots: [
            expect.objectContaining({ slotNo: 1, rewardItemId: 'basic_food' }),
            expect.objectContaining({ slotNo: 2, rewardCurrencyId: 'coin' }),
          ],
        }),
      }),
    ])
    expect(await repository.listRuntimeBundles('staticSooksoRuleSets', 'bundle-smoke-v1')).toEqual([
      expect.objectContaining({
        bundleId: 'basic',
        sourceTableCodes: ['M04-MAP-02', 'M04-MAP-03'],
        data: expect.objectContaining({
          houseId: 'basic',
          placementSlots: [
            expect.objectContaining({ placementSlotId: 'floor', slotNo: 1 }),
            expect.objectContaining({ placementSlotId: 'wall', slotNo: 2 }),
          ],
        }),
      }),
    ])
    expect(await repository.listTableRows('M05-MAP-02', 'bundle-smoke-v1')).toHaveLength(2)
    expect(await repository.listTableRows('M04-MAP-03', 'bundle-smoke-v1')).toHaveLength(2)
  })

  it('reports duplicate board slots and bad optional reward references before commit', async () => {
    const duplicateDir = await createBundleSmokeFixtureDir({ duplicateBoardSlot: true })
    const duplicateScan = await scanTableFiles(duplicateDir)
    await expect(validateStaticTableFiles(duplicateScan.files)).resolves.toMatchObject({
      ok: false,
      errors: [
        expect.objectContaining({
          code: 'duplicate_primary_key',
        }),
      ],
    })

    const badRewardDir = await createBundleSmokeFixtureDir({ badRewardCurrency: true })
    const badRewardScan = await scanTableFiles(badRewardDir)
    await expect(validateStaticTableFiles(badRewardScan.files)).resolves.toMatchObject({
      ok: true,
      errors: [
        expect.objectContaining({
          level: 'warning',
          code: 'dependency_value_not_found',
          column: 'rewardCurrencyId',
        }),
      ],
    })
  })
})
