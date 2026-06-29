/**
 * Declares how CSV files under resources/table are classified and imported.
 *
 * Dynamic user-owned tables are intentionally listed as "excluded" so the
 * static data importer cannot overwrite player state by accident.
 */

export type StaticTableCategory =
  | 'aidong'
  | 'item'
  | 'economy'
  | 'island'
  | 'sookso'
  | 'board'
  | 'story'
  | 'dialogue'
  | 'aidongIsland'
  | 'cosmetic'
  | 'string'
  | 'account'
  | 'settings'
  | 'profile'

export type StaticTableImportKind = 'row' | 'bundle' | 'excluded'

export interface StaticTableDependencyKey {
  column: string
  referencesTableCode: string
  referencesColumn: string
  optional?: boolean
}

export interface StaticTableDefinition {
  tableCode: string
  tableName: string
  category: StaticTableCategory
  importKind: StaticTableImportKind
  requiredColumns: string[]
  primaryKey: string[]
  dependencyKeys: StaticTableDependencyKey[]
  targetCollection: string
  bundleCollection?: string
  bundleBuilder?: string
  fileNamePattern?: string
  notes?: string
}

type StaticTableInput = Omit<StaticTableDefinition, 'importKind'>

function row(definition: StaticTableInput): StaticTableDefinition {
  return { ...definition, importKind: 'row' }
}

function bundle(definition: StaticTableInput): StaticTableDefinition {
  return { ...definition, importKind: 'bundle' }
}

function excluded(
  definition: Omit<StaticTableInput, 'requiredColumns' | 'primaryKey' | 'dependencyKeys' | 'targetCollection'> & {
    targetCollection?: string
    notes: string
  },
): StaticTableDefinition {
  return {
    ...definition,
    importKind: 'excluded',
    requiredColumns: [],
    primaryKey: [],
    dependencyKeys: [],
    targetCollection: definition.targetCollection ?? 'excluded',
  }
}

export const STATIC_TABLE_DEFINITIONS: StaticTableDefinition[] = [
  row({
    tableCode: 'G-CHR-01',
    tableName: 'aidong_master',
    category: 'aidong',
    requiredColumns: ['aidongId'],
    primaryKey: ['aidongId'],
    dependencyKeys: [
      { column: 'animalId', referencesTableCode: 'X-CHR-02', referencesColumn: 'animalId', optional: true },
      { column: 'iconId', referencesTableCode: 'X-CHR-04', referencesColumn: 'iconId', optional: true },
    ],
    targetCollection: 'staticAidongMasters',
  }),
  excluded({
    tableCode: 'G-CHR-02',
    tableName: 'mydong_list',
    category: 'aidong',
    targetCollection: 'mydongList',
    notes: 'User-owned Aidong state, not static content.',
  }),
  row({
    tableCode: 'G-ITM-01',
    tableName: 'item_catalog',
    category: 'item',
    requiredColumns: ['itemId'],
    primaryKey: ['itemId'],
    dependencyKeys: [{ column: 'iconId', referencesTableCode: 'X-ITM-00', referencesColumn: 'iconId', optional: true }],
    targetCollection: 'staticItemCatalogs',
  }),
  row({
    tableCode: 'G-STR-01',
    tableName: 'string_table',
    category: 'string',
    requiredColumns: ['stringKey'],
    primaryKey: ['namespace', 'locale', 'stringKey'],
    dependencyKeys: [],
    targetCollection: 'staticStringRows',
    bundleCollection: 'staticStringPacks',
    bundleBuilder: 'stringPack',
    fileNamePattern: 'G-STR-01_*_string_table.csv',
    notes: 'Multiple screen/module CSV files share the same table code.',
  }),
  excluded({
    tableCode: 'G-USR-01',
    tableName: 'users',
    category: 'account',
    targetCollection: 'users',
    notes: 'Account state is owned by auth/account APIs and migrations.',
  }),
  excluded({
    tableCode: 'M01-USR-01',
    tableName: 'provider_accounts',
    category: 'account',
    targetCollection: 'providerAccounts',
    notes: 'Auth provider links are dynamic account data.',
  }),
  excluded({
    tableCode: 'M03-ECO-01',
    tableName: 'hub_progress',
    category: 'island',
    notes: 'User hub progress is dynamic state.',
  }),
  row({
    tableCode: 'M03-MAP-00',
    tableName: 'island_zones',
    category: 'island',
    requiredColumns: ['areaId'],
    primaryKey: ['areaId'],
    dependencyKeys: [],
    targetCollection: 'staticIslandZones',
  }),
  excluded({
    tableCode: 'M04-MAP-00',
    tableName: 'sookso_main',
    category: 'sookso',
    targetCollection: 'sooksoStates',
    notes: 'User sookso state is dynamic state.',
  }),
  excluded({
    tableCode: 'M04-MAP-01',
    tableName: 'room_slots',
    category: 'sookso',
    targetCollection: 'roomSlots',
    notes: 'User room slot state is dynamic state.',
  }),
  bundle({
    tableCode: 'M04-MAP-02',
    tableName: 'house_master',
    category: 'sookso',
    requiredColumns: ['houseId'],
    primaryKey: ['houseId'],
    dependencyKeys: [],
    targetCollection: 'staticHouseMasters',
    bundleCollection: 'staticSooksoRuleSets',
    bundleBuilder: 'sooksoRuleSet',
  }),
  bundle({
    tableCode: 'M04-MAP-03',
    tableName: 'room_placement_slot',
    category: 'sookso',
    requiredColumns: ['placementSlotId'],
    primaryKey: ['placementSlotId'],
    dependencyKeys: [{ column: 'houseId', referencesTableCode: 'M04-MAP-02', referencesColumn: 'houseId', optional: true }],
    targetCollection: 'staticRoomPlacementSlots',
    bundleCollection: 'staticSooksoRuleSets',
    bundleBuilder: 'sooksoRuleSet',
  }),
  excluded({
    tableCode: 'M05-ECO-01',
    tableName: 'dice_resource',
    category: 'board',
    targetCollection: 'diceResources',
    notes: 'User dice resource state is dynamic state.',
  }),
  excluded({
    tableCode: 'M05-MAP-01',
    tableName: 'board_run',
    category: 'board',
    notes: 'Voyage board session position is session-owned, not DB-owned.',
  }),
  bundle({
    tableCode: 'M05-MAP-02',
    tableName: 'board_slot',
    category: 'board',
    requiredColumns: ['boardSetId', 'slotNo'],
    primaryKey: ['boardSetId', 'slotNo'],
    dependencyKeys: [
      { column: 'boardSetId', referencesTableCode: 'X-CFG-01', referencesColumn: 'boardSetId' },
      { column: 'rewardCurrencyId', referencesTableCode: 'X-ECO-00', referencesColumn: 'currencyId', optional: true },
      { column: 'rewardItemId', referencesTableCode: 'G-ITM-01', referencesColumn: 'itemId', optional: true },
    ],
    targetCollection: 'staticBoardSlots',
    bundleCollection: 'staticBoardSets',
    bundleBuilder: 'boardSet',
  }),
  bundle({
    tableCode: 'M10-STY-01',
    tableName: 'aidong_personal_story_master',
    category: 'story',
    requiredColumns: ['storyId'],
    primaryKey: ['storyId'],
    dependencyKeys: [{ column: 'aidongId', referencesTableCode: 'G-CHR-01', referencesColumn: 'aidongId', optional: true }],
    targetCollection: 'staticStoryMasters',
    bundleCollection: 'staticStoryBundles',
    bundleBuilder: 'storyBundle',
  }),
  bundle({
    tableCode: 'M10-STY-02',
    tableName: 'aidong_personal_story_episode',
    category: 'story',
    requiredColumns: ['storyId', 'episodeId'],
    primaryKey: ['storyId', 'episodeId'],
    dependencyKeys: [{ column: 'storyId', referencesTableCode: 'M10-STY-01', referencesColumn: 'storyId' }],
    targetCollection: 'staticStoryEpisodes',
    bundleCollection: 'staticStoryBundles',
    bundleBuilder: 'storyBundle',
  }),
  bundle({
    tableCode: 'M10-STY-04',
    tableName: 'aidong_personal_story_line',
    category: 'story',
    requiredColumns: ['storyId', 'episodeId', 'lineNo'],
    primaryKey: ['storyId', 'episodeId', 'lineNo'],
    dependencyKeys: [
      { column: 'storyId', referencesTableCode: 'M10-STY-01', referencesColumn: 'storyId' },
      { column: 'episodeId', referencesTableCode: 'M10-STY-02', referencesColumn: 'episodeId' },
    ],
    targetCollection: 'staticStoryLines',
    bundleCollection: 'staticStoryBundles',
    bundleBuilder: 'storyBundle',
  }),
  excluded({
    tableCode: 'M10-USR-01',
    tableName: 'user_daily_story_state',
    category: 'story',
    notes: 'User daily story state is dynamic state.',
  }),
  excluded({
    tableCode: 'M10-USR-02',
    tableName: 'mydong_story_progress',
    category: 'story',
    notes: 'Mydong story progress is dynamic state.',
  }),
  excluded({
    tableCode: 'M13-PRS-02',
    tableName: 'mydong_persona_part_state',
    category: 'cosmetic',
    targetCollection: 'mydongPersonaPartStates',
    notes: 'Mydong persona part state is dynamic state.',
  }),
  excluded({
    tableCode: 'M17-ECO-01',
    tableName: 'user_currency_balance',
    category: 'economy',
    targetCollection: 'userCurrencyBalances',
    notes: 'User currency balance is dynamic state.',
  }),
  excluded({
    tableCode: 'M19-USR-01',
    tableName: 'user_settings',
    category: 'settings',
    targetCollection: 'userSettings',
    notes: 'User settings are dynamic state.',
  }),
  excluded({
    tableCode: 'M21-USR-01',
    tableName: 'user_profile',
    category: 'profile',
    notes: 'User profile is dynamic state.',
  }),
  bundle({
    tableCode: 'M22-MAP-01',
    tableName: 'aidong_island_master',
    category: 'aidongIsland',
    requiredColumns: ['islandId'],
    primaryKey: ['islandId'],
    dependencyKeys: [{ column: 'aidongId', referencesTableCode: 'G-CHR-01', referencesColumn: 'aidongId', optional: true }],
    targetCollection: 'staticAidongIslandMasters',
    bundleCollection: 'staticAidongIslandBundles',
    bundleBuilder: 'aidongIslandBundle',
  }),
  bundle({
    tableCode: 'M22-MAP-02',
    tableName: 'aidong_island_page_master',
    category: 'aidongIsland',
    requiredColumns: ['islandId', 'pageId'],
    primaryKey: ['islandId', 'pageId'],
    dependencyKeys: [{ column: 'islandId', referencesTableCode: 'M22-MAP-01', referencesColumn: 'islandId' }],
    targetCollection: 'staticAidongIslandPages',
    bundleCollection: 'staticAidongIslandBundles',
    bundleBuilder: 'aidongIslandBundle',
  }),
  bundle({
    tableCode: 'M22-MAP-03',
    tableName: 'aidong_island_hotspot_master',
    category: 'aidongIsland',
    requiredColumns: ['islandId', 'pageId', 'hotspotId'],
    primaryKey: ['islandId', 'pageId', 'hotspotId'],
    dependencyKeys: [
      { column: 'islandId', referencesTableCode: 'M22-MAP-01', referencesColumn: 'islandId' },
      { column: 'pageId', referencesTableCode: 'M22-MAP-02', referencesColumn: 'pageId' },
    ],
    targetCollection: 'staticAidongIslandHotspots',
    bundleCollection: 'staticAidongIslandBundles',
    bundleBuilder: 'aidongIslandBundle',
  }),
  bundle({
    tableCode: 'M22-SCR-01',
    tableName: 'aidong_island_script_master',
    category: 'aidongIsland',
    requiredColumns: ['scriptId'],
    primaryKey: ['scriptId'],
    dependencyKeys: [],
    targetCollection: 'staticAidongIslandScripts',
    bundleCollection: 'staticAidongIslandBundles',
    bundleBuilder: 'aidongIslandBundle',
  }),
  bundle({
    tableCode: 'M22-SCR-02',
    tableName: 'aidong_island_condition',
    category: 'aidongIsland',
    requiredColumns: ['conditionId'],
    primaryKey: ['conditionId'],
    dependencyKeys: [],
    targetCollection: 'staticAidongIslandConditions',
    bundleCollection: 'staticAidongIslandBundles',
    bundleBuilder: 'aidongIslandBundle',
  }),
  bundle({
    tableCode: 'M22-SCR-03',
    tableName: 'aidong_island_effect',
    category: 'aidongIsland',
    requiredColumns: ['effectId'],
    primaryKey: ['effectId'],
    dependencyKeys: [],
    targetCollection: 'staticAidongIslandEffects',
    bundleCollection: 'staticAidongIslandBundles',
    bundleBuilder: 'aidongIslandBundle',
  }),
  bundle({
    tableCode: 'M22-SCR-04',
    tableName: 'aidong_island_choice',
    category: 'aidongIsland',
    requiredColumns: ['choiceId'],
    primaryKey: ['choiceId'],
    dependencyKeys: [],
    targetCollection: 'staticAidongIslandChoices',
    bundleCollection: 'staticAidongIslandBundles',
    bundleBuilder: 'aidongIslandBundle',
  }),
  excluded({
    tableCode: 'M22-USR-01',
    tableName: 'mydong_island_state',
    category: 'aidongIsland',
    notes: 'Mydong island state is dynamic state.',
  }),
  excluded({
    tableCode: 'M22-USR-02',
    tableName: 'mydong_island_switch',
    category: 'aidongIsland',
    notes: 'Mydong island switches are dynamic state.',
  }),
  excluded({
    tableCode: 'M23-ITM-01',
    tableName: 'mydong_pedia_inventory',
    category: 'item',
    targetCollection: 'mydongPediaInventory',
    notes: 'Mydong pedia inventory is dynamic state.',
  }),
  bundle({
    tableCode: 'X-CFG-01',
    tableName: 'board_set_master',
    category: 'board',
    requiredColumns: ['boardSetId'],
    primaryKey: ['boardSetId'],
    dependencyKeys: [],
    targetCollection: 'staticBoardSetMasters',
    bundleCollection: 'staticBoardSets',
    bundleBuilder: 'boardSet',
  }),
  row({
    tableCode: 'X-CHR-00',
    tableName: 'aidong_index',
    category: 'aidong',
    requiredColumns: ['aidongId'],
    primaryKey: ['aidongId'],
    dependencyKeys: [{ column: 'aidongId', referencesTableCode: 'G-CHR-01', referencesColumn: 'aidongId' }],
    targetCollection: 'staticAidongIndexes',
  }),
  row({
    tableCode: 'X-CHR-02',
    tableName: 'aidong_animal_taxonomy',
    category: 'aidong',
    requiredColumns: ['animalId'],
    primaryKey: ['animalId'],
    dependencyKeys: [],
    targetCollection: 'staticAidongAnimalTaxonomies',
  }),
  row({
    tableCode: 'X-CHR-04',
    tableName: 'aidong_icon_master',
    category: 'aidong',
    requiredColumns: ['iconId'],
    primaryKey: ['iconId'],
    dependencyKeys: [{ column: 'aidongId', referencesTableCode: 'G-CHR-01', referencesColumn: 'aidongId', optional: true }],
    targetCollection: 'staticAidongIconMasters',
  }),
  bundle({
    tableCode: 'X-CHR-05',
    tableName: 'aidong_persona_part_slot_master',
    category: 'cosmetic',
    requiredColumns: ['partSlotId'],
    primaryKey: ['partSlotId'],
    dependencyKeys: [],
    targetCollection: 'staticPersonaPartSlotMasters',
    bundleCollection: 'staticCosmeticRuleSets',
    bundleBuilder: 'cosmeticRuleSet',
  }),
  bundle({
    tableCode: 'X-CHR-06',
    tableName: 'aidong_persona_part_default',
    category: 'cosmetic',
    requiredColumns: ['aidongId', 'partSlotId'],
    primaryKey: ['aidongId', 'partSlotId'],
    dependencyKeys: [
      { column: 'aidongId', referencesTableCode: 'G-CHR-01', referencesColumn: 'aidongId' },
      { column: 'partSlotId', referencesTableCode: 'X-CHR-05', referencesColumn: 'partSlotId' },
    ],
    targetCollection: 'staticPersonaPartDefaults',
    bundleCollection: 'staticCosmeticRuleSets',
    bundleBuilder: 'cosmeticRuleSet',
  }),
  bundle({
    tableCode: 'X-DLG-00',
    tableName: 'phase1_daily_dialogue',
    category: 'dialogue',
    requiredColumns: ['dialogueId'],
    primaryKey: ['dialogueId'],
    dependencyKeys: [{ column: 'aidongId', referencesTableCode: 'G-CHR-01', referencesColumn: 'aidongId', optional: true }],
    targetCollection: 'staticDialogueRows',
    bundleCollection: 'staticDialoguePacks',
    bundleBuilder: 'dialoguePack',
  }),
  bundle({
    tableCode: 'X-DLG-AIDONG-*',
    tableName: 'aidong_daily_dialogue',
    category: 'dialogue',
    requiredColumns: ['dialogueId'],
    primaryKey: ['dialogueId'],
    dependencyKeys: [{ column: 'aidongId', referencesTableCode: 'G-CHR-01', referencesColumn: 'aidongId', optional: true }],
    targetCollection: 'staticDialogueRows',
    bundleCollection: 'staticDialoguePacks',
    bundleBuilder: 'dialoguePack',
    fileNamePattern: 'X-DLG-AIDONG-*_daily_dialogue.csv',
  }),
  row({
    tableCode: 'X-ECO-00',
    tableName: 'currency_master',
    category: 'economy',
    requiredColumns: ['currencyId'],
    primaryKey: ['currencyId'],
    dependencyKeys: [],
    targetCollection: 'staticCurrencyMasters',
  }),
  row({
    tableCode: 'X-ECO-01',
    tableName: 'module_currency_policy',
    category: 'economy',
    requiredColumns: ['moduleId', 'currencyId'],
    primaryKey: ['moduleId', 'currencyId'],
    dependencyKeys: [{ column: 'currencyId', referencesTableCode: 'X-ECO-00', referencesColumn: 'currencyId' }],
    targetCollection: 'staticModuleCurrencyPolicies',
  }),
  row({
    tableCode: 'X-ITM-00',
    tableName: 'item_icon_master',
    category: 'item',
    requiredColumns: ['iconId'],
    primaryKey: ['iconId'],
    dependencyKeys: [],
    targetCollection: 'staticItemIconMasters',
  }),
  row({
    tableCode: 'X-ITM-01',
    tableName: 'aidong_pedia_item_master',
    category: 'item',
    requiredColumns: ['aidongId', 'pediaItemId'],
    primaryKey: ['aidongId', 'pediaItemId'],
    dependencyKeys: [
      { column: 'aidongId', referencesTableCode: 'G-CHR-01', referencesColumn: 'aidongId' },
      { column: 'itemId', referencesTableCode: 'G-ITM-01', referencesColumn: 'itemId', optional: true },
      { column: 'iconId', referencesTableCode: 'X-ITM-00', referencesColumn: 'iconId', optional: true },
    ],
    targetCollection: 'staticAidongPediaItemMasters',
  }),
]

export function isPatternTableCode(tableCode: string): boolean {
  return tableCode.includes('*')
}

function tableCodePatternToRegExp(tableCode: string): RegExp {
  const escaped = tableCode
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${escaped}$`)
}

export function listStaticTableDefinitions(): StaticTableDefinition[] {
  return [...STATIC_TABLE_DEFINITIONS]
}

export function listImportableStaticTableDefinitions(): StaticTableDefinition[] {
  return STATIC_TABLE_DEFINITIONS.filter((definition) => definition.importKind !== 'excluded')
}

export function resolveStaticTableDefinition(tableCode: string): StaticTableDefinition | undefined {
  const exact = STATIC_TABLE_DEFINITIONS.find((definition) => definition.tableCode === tableCode)
  if (exact) return exact
  return STATIC_TABLE_DEFINITIONS.find(
    (definition) => isPatternTableCode(definition.tableCode) && tableCodePatternToRegExp(definition.tableCode).test(tableCode),
  )
}

export function isStaticTableImportable(tableCode: string): boolean {
  const definition = resolveStaticTableDefinition(tableCode)
  return Boolean(definition && definition.importKind !== 'excluded')
}

export function parseStaticTableCodeFromFileName(fileName: string): string | undefined {
  const baseName = fileName.replace(/\\/g, '/').split('/').pop()?.replace(/\.csv$/i, '')
  if (!baseName) return undefined

  const doubleUnderscoreCode = baseName.includes('__') ? baseName.split('__')[0] : undefined
  if (doubleUnderscoreCode && resolveStaticTableDefinition(doubleUnderscoreCode)) return doubleUnderscoreCode

  const shortAidongDialogueMatch = /^X-DLG-A(\d+)_daily_dialogue$/i.exec(baseName)
  if (shortAidongDialogueMatch) {
    return `X-DLG-AIDONG-${shortAidongDialogueMatch[1]}`
  }

  const definitions = [...STATIC_TABLE_DEFINITIONS].sort((a, b) => b.tableCode.length - a.tableCode.length)
  for (const definition of definitions) {
    if (isPatternTableCode(definition.tableCode)) {
      const prefix = definition.tableCode.split('*')[0]
      if (baseName.startsWith(prefix)) {
        const firstPart = baseName.split('_')[0]
        if (tableCodePatternToRegExp(definition.tableCode).test(firstPart)) return firstPart
      }
      continue
    }

    if (baseName === definition.tableCode || baseName.startsWith(`${definition.tableCode}_`)) {
      return definition.tableCode
    }
  }
  return undefined
}

export function validateStaticTableRegistry(): string[] {
  const errors: string[] = []
  const exactCodes = new Set<string>()

  for (const definition of STATIC_TABLE_DEFINITIONS) {
    if (!definition.tableCode) errors.push('tableCode_required')
    if (!definition.tableName) errors.push(`${definition.tableCode}:tableName_required`)
    if (!definition.category) errors.push(`${definition.tableCode}:category_required`)
    if (!definition.targetCollection) errors.push(`${definition.tableCode}:targetCollection_required`)

    if (!isPatternTableCode(definition.tableCode)) {
      if (exactCodes.has(definition.tableCode)) errors.push(`${definition.tableCode}:duplicate_tableCode`)
      exactCodes.add(definition.tableCode)
    }

    if (definition.importKind !== 'excluded') {
      if (definition.requiredColumns.length === 0) errors.push(`${definition.tableCode}:requiredColumns_required`)
      if (definition.primaryKey.length === 0) errors.push(`${definition.tableCode}:primaryKey_required`)
    }

    if (definition.importKind === 'bundle' && !definition.bundleCollection) {
      errors.push(`${definition.tableCode}:bundleCollection_required`)
    }
    if (definition.importKind === 'bundle' && !definition.bundleBuilder) {
      errors.push(`${definition.tableCode}:bundleBuilder_required`)
    }
  }

  return errors
}
