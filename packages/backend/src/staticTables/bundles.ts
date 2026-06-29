import type { StaticRuntimeBundleDoc } from '../models/StaticTableModels.js'
import type { StaticTableCellValue, StaticTableCsvParseResult } from './csv.js'

export interface StaticTableBundleBuildContext {
  version: string
  importBatchId: string
  now?: number
}

export interface StaticTableBundleBuildResult {
  collectionName: string
  bundles: StaticRuntimeBundleDoc[]
}

type StaticRow = Record<string, StaticTableCellValue>

const BUNDLE_BUILDERS: Array<(tables: StaticTableCsvParseResult[], context: Required<StaticTableBundleBuildContext>) => StaticTableBundleBuildResult | undefined> = [
  buildBoardSetBundles,
  buildSooksoRuleSetBundles,
  buildStringPackBundles,
  buildStoryBundles,
  buildDialoguePacks,
  buildAidongIslandBundles,
  buildCosmeticRuleSetBundles,
]

export function buildStaticTableBundles(
  tables: StaticTableCsvParseResult[],
  context: StaticTableBundleBuildContext,
): StaticTableBundleBuildResult[] {
  const resolvedContext = {
    ...context,
    now: context.now ?? Date.now(),
  }
  return BUNDLE_BUILDERS
    .map((builder) => builder(tables, resolvedContext))
    .filter((result): result is StaticTableBundleBuildResult => Boolean(result && result.bundles.length > 0))
}

function buildBoardSetBundles(
  tables: StaticTableCsvParseResult[],
  context: Required<StaticTableBundleBuildContext>,
): StaticTableBundleBuildResult | undefined {
  const boardSets = rowsFor(tables, 'X-CFG-01')
  const slots = rowsFor(tables, 'M05-MAP-02')
  if (boardSets.length === 0 && slots.length === 0) return undefined

  const slotsByBoardSetId = groupBy(slots, 'boardSetId')
  const boardSetIds = unique([
    ...boardSets.map((row) => stringValue(row.boardSetId)),
    ...slots.map((row) => stringValue(row.boardSetId)),
  ])

  return {
    collectionName: 'staticBoardSets',
    bundles: boardSetIds.map((boardSetId) => makeBundle({
      bundleId: boardSetId,
      sourceTableCodes: ['X-CFG-01', 'M05-MAP-02'],
      data: {
        boardSetId,
        boardSet: boardSets.find((row) => stringValue(row.boardSetId) === boardSetId) ?? {},
        slots: sortBy(slotsByBoardSetId.get(boardSetId) ?? [], 'slotNo'),
      },
      context,
    })),
  }
}

function buildSooksoRuleSetBundles(
  tables: StaticTableCsvParseResult[],
  context: Required<StaticTableBundleBuildContext>,
): StaticTableBundleBuildResult | undefined {
  const houses = rowsFor(tables, 'M04-MAP-02')
  const placementSlots = rowsFor(tables, 'M04-MAP-03')
  if (houses.length === 0 && placementSlots.length === 0) return undefined

  const slotsByHouseId = groupBy(placementSlots, 'houseId')
  const houseIds = unique([
    ...houses.map((row) => stringValue(row.houseId)),
    ...placementSlots.map((row) => stringValue(row.houseId) || 'default'),
  ])

  return {
    collectionName: 'staticSooksoRuleSets',
    bundles: houseIds.map((houseId) => makeBundle({
      bundleId: houseId,
      sourceTableCodes: ['M04-MAP-02', 'M04-MAP-03'],
      data: {
        houseId,
        house: houses.find((row) => stringValue(row.houseId) === houseId) ?? {},
        placementSlots: sortBy(slotsByHouseId.get(houseId) ?? [], 'placementSlotId'),
      },
      context,
    })),
  }
}

function buildStringPackBundles(
  tables: StaticTableCsvParseResult[],
  context: Required<StaticTableBundleBuildContext>,
): StaticTableBundleBuildResult | undefined {
  const strings = rowsFor(tables, 'G-STR-01')
  if (strings.length === 0) return undefined

  const groups = new Map<string, StaticRow[]>()
  for (const row of strings) {
    const namespace = stringValue(row.namespace) || 'default'
    const locale = stringValue(row.locale) || 'default'
    const key = `${namespace}:${locale}`
    const rows = groups.get(key) ?? []
    rows.push(row)
    groups.set(key, rows)
  }

  return {
    collectionName: 'staticStringPacks',
    bundles: [...groups.entries()].map(([bundleId, rows]) => {
      const [namespace, locale] = bundleId.split(':')
      return makeBundle({
        bundleId,
        sourceTableCodes: ['G-STR-01'],
        data: {
          namespace,
          locale,
          strings: Object.fromEntries(rows.map((row) => [stringValue(row.stringKey), pickStringText(row)])),
          rows: sortBy(rows, 'stringKey'),
        },
        context,
      })
    }),
  }
}

function buildStoryBundles(
  tables: StaticTableCsvParseResult[],
  context: Required<StaticTableBundleBuildContext>,
): StaticTableBundleBuildResult | undefined {
  const masters = rowsFor(tables, 'M10-STY-01')
  const episodes = rowsFor(tables, 'M10-STY-02')
  const lines = rowsFor(tables, 'M10-STY-04')
  if (masters.length === 0 && episodes.length === 0 && lines.length === 0) return undefined

  const episodesByStoryId = groupBy(episodes, 'storyId')
  const linesByEpisodeKey = groupBy(lines, (row) => `${stringValue(row.storyId)}:${stringValue(row.episodeId)}`)
  const storyIds = unique([
    ...masters.map((row) => stringValue(row.storyId)),
    ...episodes.map((row) => stringValue(row.storyId)),
    ...lines.map((row) => stringValue(row.storyId)),
  ])

  return {
    collectionName: 'staticStoryBundles',
    bundles: storyIds.map((storyId) => makeBundle({
      bundleId: storyId,
      sourceTableCodes: ['M10-STY-01', 'M10-STY-02', 'M10-STY-04'],
      data: {
        storyId,
        story: masters.find((row) => stringValue(row.storyId) === storyId) ?? {},
        episodes: sortBy(episodesByStoryId.get(storyId) ?? [], 'episodeId').map((episode) => ({
          ...episode,
          lines: sortBy(linesByEpisodeKey.get(`${storyId}:${stringValue(episode.episodeId)}`) ?? [], 'lineNo'),
        })),
      },
      context,
    })),
  }
}

function buildDialoguePacks(
  tables: StaticTableCsvParseResult[],
  context: Required<StaticTableBundleBuildContext>,
): StaticTableBundleBuildResult | undefined {
  const dialogueTables = tables.filter((table) => table.tableCode === 'X-DLG-00' || table.tableCode.startsWith('X-DLG-AIDONG-'))
  const rows: StaticRow[] = dialogueTables.flatMap((table) => table.rows.map((row): StaticRow => ({
    ...row.values,
    sourceTableCode: table.tableCode,
  })))
  if (rows.length === 0) return undefined

  const groups = new Map<string, StaticRow[]>()
  for (const row of rows) {
    const aidongId = stringValue(row.aidongId)
    const locale = stringValue(row.locale) || 'default'
    const bundleId = aidongId ? `${aidongId}:${locale}` : `global:${locale}`
    const group = groups.get(bundleId) ?? []
    group.push(row)
    groups.set(bundleId, group)
  }

  return {
    collectionName: 'staticDialoguePacks',
    bundles: [...groups.entries()].map(([bundleId, group]) => makeBundle({
      bundleId,
      sourceTableCodes: unique(group.map((row) => stringValue(row.sourceTableCode))),
      data: {
        bundleId,
        dialogues: sortBy(group, 'dialogueId'),
      },
      context,
    })),
  }
}

function buildAidongIslandBundles(
  tables: StaticTableCsvParseResult[],
  context: Required<StaticTableBundleBuildContext>,
): StaticTableBundleBuildResult | undefined {
  const islands = rowsFor(tables, 'M22-MAP-01')
  const pages = rowsFor(tables, 'M22-MAP-02')
  const hotspots = rowsFor(tables, 'M22-MAP-03')
  const scripts = rowsFor(tables, 'M22-SCR-01')
  const conditions = rowsFor(tables, 'M22-SCR-02')
  const effects = rowsFor(tables, 'M22-SCR-03')
  const choices = rowsFor(tables, 'M22-SCR-04')
  const allRows = [...islands, ...pages, ...hotspots, ...scripts, ...conditions, ...effects, ...choices]
  if (allRows.length === 0) return undefined

  const islandIds = unique([
    ...islands.map((row) => stringValue(row.islandId)),
    ...pages.map((row) => stringValue(row.islandId)),
    ...hotspots.map((row) => stringValue(row.islandId)),
    ...allRows.map((row) => stringValue(row.islandId)).filter(Boolean),
  ])
  const fallbackIslandIds = islandIds.length > 0 ? islandIds : ['default']

  return {
    collectionName: 'staticAidongIslandBundles',
    bundles: fallbackIslandIds.map((islandId) => makeBundle({
      bundleId: islandId,
      sourceTableCodes: ['M22-MAP-01', 'M22-MAP-02', 'M22-MAP-03', 'M22-SCR-01', 'M22-SCR-02', 'M22-SCR-03', 'M22-SCR-04'],
      data: {
        islandId,
        island: islands.find((row) => stringValue(row.islandId) === islandId) ?? {},
        pages: sortBy(filterByOptionalIslandId(pages, islandId), 'pageId'),
        hotspots: sortBy(filterByOptionalIslandId(hotspots, islandId), 'hotspotId'),
        scripts: sortBy(filterByOptionalIslandId(scripts, islandId), 'scriptId'),
        conditions: sortBy(filterByOptionalIslandId(conditions, islandId), 'conditionId'),
        effects: sortBy(filterByOptionalIslandId(effects, islandId), 'effectId'),
        choices: sortBy(filterByOptionalIslandId(choices, islandId), 'choiceId'),
      },
      context,
    })),
  }
}

function buildCosmeticRuleSetBundles(
  tables: StaticTableCsvParseResult[],
  context: Required<StaticTableBundleBuildContext>,
): StaticTableBundleBuildResult | undefined {
  const partSlots = rowsFor(tables, 'X-CHR-05')
  const defaults = rowsFor(tables, 'X-CHR-06')
  if (partSlots.length === 0 && defaults.length === 0) return undefined

  return {
    collectionName: 'staticCosmeticRuleSets',
    bundles: [
      makeBundle({
        bundleId: 'persona-parts',
        sourceTableCodes: ['X-CHR-05', 'X-CHR-06'],
        data: {
          personaPartSlots: sortBy(partSlots, 'partSlotId'),
          personaPartDefaults: sortBy(defaults, 'aidongId'),
        },
        context,
      }),
    ],
  }
}

function rowsFor(tables: StaticTableCsvParseResult[], tableCode: string): StaticRow[] {
  return tables
    .filter((table) => table.tableCode === tableCode || table.tableDefinition?.tableCode === tableCode)
    .flatMap((table) => table.rows.map((row) => ({ ...row.values })))
}

function makeBundle(params: {
  bundleId: string
  sourceTableCodes: string[]
  data: Record<string, unknown>
  context: Required<StaticTableBundleBuildContext>
}): StaticRuntimeBundleDoc {
  return {
    bundleId: params.bundleId,
    version: params.context.version,
    sourceTableCodes: unique(params.sourceTableCodes),
    importBatchId: params.context.importBatchId,
    enabled: true,
    data: params.data,
    createdAt: params.context.now,
    updatedAt: params.context.now,
  }
}

function groupBy(rows: StaticRow[], key: keyof StaticRow | ((row: StaticRow) => string)): Map<string, StaticRow[]> {
  const groups = new Map<string, StaticRow[]>()
  for (const row of rows) {
    const groupKey = typeof key === 'function' ? key(row) : stringValue(row[key])
    if (!groupKey) continue
    const group = groups.get(groupKey) ?? []
    group.push(row)
    groups.set(groupKey, group)
  }
  return groups
}

function sortBy(rows: StaticRow[], column: string): StaticRow[] {
  return [...rows].sort((a, b) => compareCells(a[column], b[column]))
}

function compareCells(a: StaticTableCellValue, b: StaticTableCellValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return stringValue(a).localeCompare(stringValue(b), 'en')
}

function filterByOptionalIslandId(rows: StaticRow[], islandId: string): StaticRow[] {
  return rows.filter((row) => {
    const rowIslandId = stringValue(row.islandId)
    return !rowIslandId || rowIslandId === islandId
  })
}

function pickStringText(row: StaticRow): StaticTableCellValue {
  return row.text ?? row.value ?? row.stringValue ?? row.message ?? row.label ?? row.description
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

function stringValue(value: StaticTableCellValue): string {
  if (value === undefined) return ''
  return String(value)
}
