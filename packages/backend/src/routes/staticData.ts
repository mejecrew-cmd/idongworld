/**
 * Runtime static data read API.
 *
 * This route reads only the latest activated static import version. Admin
 * import/dry-run endpoints stay separate under /api/admin/static-tables.
 */
import { Router } from 'express'
import type { StaticDataImportBatchDoc, StaticRuntimeRowDoc } from '../models/StaticTableModels.js'
import { getStaticTableRepository } from '../repositories/index.js'

export const staticDataRouter = Router()

staticDataRouter.get('/aidongs', async (_req, res) => {
  await respondWithRuntimeRows(res, 'staticAidongMasters', 'aidongs')
})

staticDataRouter.get('/items', async (_req, res) => {
  await respondWithRuntimeRows(res, 'staticItemCatalogs', 'items')
})

staticDataRouter.get('/currencies', async (_req, res) => {
  await respondWithRuntimeRows(res, 'staticCurrencyMasters', 'currencies')
})

staticDataRouter.get('/board-sets/:boardSetId', async (req, res) => {
  const boardSetId = readParam(req.params.boardSetId)
  if (!boardSetId) {
    res.status(400).json({ error: 'board_set_id_required' })
    return
  }

  const active = await getActiveStaticImportBatch()
  if (!active) {
    res.status(404).json({ error: 'active_static_import_not_found' })
    return
  }

  const bundle = (await getStaticTableRepository().listRuntimeBundles('staticBoardSets', active.version))
    .filter((item) => item.enabled)
    .find((item) => item.bundleId === boardSetId)
  if (!bundle) {
    res.status(404).json({ error: 'static_board_set_not_found', boardSetId, version: active.version })
    return
  }

  res.json({
    ok: true,
    version: active.version,
    importBatchId: active.importBatchId,
    boardSet: bundle.data,
  })
})

staticDataRouter.get('/sookso-rule-set', async (req, res) => {
  const houseId = typeof req.query.houseId === 'string' && req.query.houseId.trim()
    ? req.query.houseId.trim()
    : undefined
  const active = await getActiveStaticImportBatch()
  if (!active) {
    res.status(404).json({ error: 'active_static_import_not_found' })
    return
  }

  const bundles = (await getStaticTableRepository().listRuntimeBundles('staticSooksoRuleSets', active.version))
    .filter((item) => item.enabled)
  const selected = houseId ? bundles.find((item) => item.bundleId === houseId) : undefined
  if (houseId && !selected) {
    res.status(404).json({ error: 'static_sookso_rule_set_not_found', houseId, version: active.version })
    return
  }

  res.json({
    ok: true,
    version: active.version,
    importBatchId: active.importBatchId,
    ...(houseId
      ? { ruleSet: selected?.data }
      : { ruleSets: bundles.map((bundle) => bundle.data) }),
  })
})

async function respondWithRuntimeRows(
  res: Parameters<Parameters<typeof staticDataRouter.get>[1]>[1],
  collectionName: string,
  responseKey: string,
) {
  const active = await getActiveStaticImportBatch()
  if (!active) {
    res.status(404).json({ error: 'active_static_import_not_found' })
    return
  }

  const rows = (await getStaticTableRepository().listRuntimeRows(collectionName, active.version))
    .filter((row) => row.enabled)
  res.json({
    ok: true,
    version: active.version,
    importBatchId: active.importBatchId,
    [responseKey]: rows.map(runtimeRowData),
  })
}

async function getActiveStaticImportBatch(): Promise<StaticDataImportBatchDoc | undefined> {
  const imports = await getStaticTableRepository().listImportBatches()
  return imports
    .filter((item) => item.status === 'activated')
    .sort((left, right) => {
      const leftTime = left.activatedAt ?? left.updatedAt
      const rightTime = right.activatedAt ?? right.updatedAt
      return rightTime - leftTime
    })[0]
}

function runtimeRowData(row: StaticRuntimeRowDoc): Record<string, unknown> {
  return row.data
}

function readParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  return raw && raw.trim() ? raw.trim() : undefined
}
