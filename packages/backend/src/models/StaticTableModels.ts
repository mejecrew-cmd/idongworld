/**
 * Mongo models for static table imports.
 *
 * Static import keeps two layers:
 * - audit collections: immutable-ish import batch and original row snapshots
 * - runtime collections: active row/bundle documents used by game APIs
 */
import mongoose, { Schema } from 'mongoose'

export type StaticDataImportBatchStatus = 'validated' | 'dryRun' | 'committed' | 'activated' | 'failed'

export interface StaticDataImportBatchFileDoc {
  fileName: string
  tableCode: string
  sourceHash: string
  rowCount: number
}

export interface StaticDataImportBatchDoc {
  importBatchId: string
  status: StaticDataImportBatchStatus
  version: string
  sourceDir?: string
  sourceFiles: StaticDataImportBatchFileDoc[]
  actorUid?: string
  validationSummary?: unknown
  dryRunSummary?: unknown
  commitSummary?: unknown
  errorMessage?: string
  createdAt: number
  updatedAt: number
  committedAt?: number
  activatedAt?: number
  failedAt?: number
}

export interface StaticTableRowDoc {
  tableCode: string
  version: string
  rowKey: string
  rowNo: number
  sourceFile: string
  sourceHash: string
  importBatchId: string
  originalRow: Record<string, unknown>
  normalizedRow: Record<string, unknown>
  enabled: boolean
  createdAt: number
  updatedAt: number
}

export interface StaticRuntimeRowDoc {
  tableCode: string
  version: string
  rowKey: string
  sourceHash: string
  importBatchId: string
  enabled: boolean
  data: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

export interface StaticAidongMasterDoc extends StaticRuntimeRowDoc {
  aidongId: string
}

export interface StaticItemCatalogDoc extends StaticRuntimeRowDoc {
  itemId: string
}

export interface StaticAidongPediaItemMasterDoc extends StaticRuntimeRowDoc {
  aidongId: string
  pediaItemId: string
}

export interface StaticIslandZoneDoc extends StaticRuntimeRowDoc {
  areaId: string
}

export interface StaticCurrencyMasterDoc extends StaticRuntimeRowDoc {
  currencyId: string
}

export interface StaticModuleCurrencyPolicyDoc extends StaticRuntimeRowDoc {
  moduleId: string
  currencyId: string
}

export interface StaticRuntimeBundleDoc {
  bundleId: string
  version: string
  sourceTableCodes: string[]
  importBatchId: string
  enabled: boolean
  data: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

const StaticDataImportBatchFileSchema = new Schema<StaticDataImportBatchFileDoc>(
  {
    fileName: { type: String, required: true },
    tableCode: { type: String, required: true, index: true },
    sourceHash: { type: String, required: true },
    rowCount: { type: Number, required: true },
  },
  {
    _id: false,
    minimize: false,
    versionKey: false,
  },
)

const StaticDataImportBatchSchema = new Schema<StaticDataImportBatchDoc>(
  {
    importBatchId: { type: String, required: true, unique: true, index: true },
    status: { type: String, required: true, index: true },
    version: { type: String, required: true, index: true },
    sourceDir: String,
    sourceFiles: { type: [StaticDataImportBatchFileSchema], required: true, default: [] },
    actorUid: { type: String, index: true },
    validationSummary: Schema.Types.Mixed,
    dryRunSummary: Schema.Types.Mixed,
    commitSummary: Schema.Types.Mixed,
    errorMessage: String,
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
    committedAt: Number,
    activatedAt: Number,
    failedAt: Number,
  },
  {
    collection: 'staticDataImportBatches',
    minimize: false,
    versionKey: false,
  },
)

StaticDataImportBatchSchema.index({ status: 1, updatedAt: -1 })
StaticDataImportBatchSchema.index({ version: 1, status: 1 })

const StaticTableRowSchema = new Schema<StaticTableRowDoc>(
  {
    tableCode: { type: String, required: true, index: true },
    version: { type: String, required: true, index: true },
    rowKey: { type: String, required: true },
    rowNo: { type: Number, required: true },
    sourceFile: { type: String, required: true },
    sourceHash: { type: String, required: true, index: true },
    importBatchId: { type: String, required: true, index: true },
    originalRow: { type: Schema.Types.Mixed, required: true, default: {} },
    normalizedRow: { type: Schema.Types.Mixed, required: true, default: {} },
    enabled: { type: Boolean, required: true, default: true, index: true },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'staticTableRows',
    minimize: false,
    versionKey: false,
  },
)

StaticTableRowSchema.index({ tableCode: 1, version: 1, rowKey: 1 }, { unique: true })
StaticTableRowSchema.index({ tableCode: 1, version: 1, enabled: 1 })

function createRuntimeRowSchema(extraFields: Record<string, unknown>) {
  const schema = new Schema(
    {
      tableCode: { type: String, required: true, index: true },
      version: { type: String, required: true, index: true },
      rowKey: { type: String, required: true },
      sourceHash: { type: String, required: true, index: true },
      importBatchId: { type: String, required: true, index: true },
      enabled: { type: Boolean, required: true, default: true, index: true },
      data: { type: Schema.Types.Mixed, required: true, default: {} },
      createdAt: { type: Number, required: true },
      updatedAt: { type: Number, required: true },
      ...extraFields,
    },
    {
      minimize: false,
      versionKey: false,
    },
  )
  schema.index({ version: 1, rowKey: 1 }, { unique: true })
  schema.index({ enabled: 1, version: 1 })
  return schema
}

function createRuntimeBundleSchema(collection: string) {
  const schema = new Schema<StaticRuntimeBundleDoc>(
    {
      bundleId: { type: String, required: true, index: true },
      version: { type: String, required: true, index: true },
      sourceTableCodes: { type: [String], required: true, default: [] },
      importBatchId: { type: String, required: true, index: true },
      enabled: { type: Boolean, required: true, default: true, index: true },
      data: { type: Schema.Types.Mixed, required: true, default: {} },
      createdAt: { type: Number, required: true },
      updatedAt: { type: Number, required: true },
    },
    {
      collection,
      minimize: false,
      versionKey: false,
    },
  )
  schema.index({ bundleId: 1, version: 1 }, { unique: true })
  schema.index({ enabled: 1, version: 1 })
  return schema
}

const StaticAidongMasterSchema = createRuntimeRowSchema({
  aidongId: { type: String, required: true, index: true },
})
StaticAidongMasterSchema.index({ aidongId: 1, version: 1 }, { unique: true })

const StaticItemCatalogSchema = createRuntimeRowSchema({
  itemId: { type: String, required: true, index: true },
})
StaticItemCatalogSchema.index({ itemId: 1, version: 1 }, { unique: true })

const StaticAidongPediaItemMasterSchema = createRuntimeRowSchema({
  aidongId: { type: String, required: true, index: true },
  pediaItemId: { type: String, required: true, index: true },
})
StaticAidongPediaItemMasterSchema.index({ aidongId: 1, pediaItemId: 1, version: 1 }, { unique: true })

const StaticIslandZoneSchema = createRuntimeRowSchema({
  areaId: { type: String, required: true, index: true },
})
StaticIslandZoneSchema.index({ areaId: 1, version: 1 }, { unique: true })

const StaticCurrencyMasterSchema = createRuntimeRowSchema({
  currencyId: { type: String, required: true, index: true },
})
StaticCurrencyMasterSchema.index({ currencyId: 1, version: 1 }, { unique: true })

const StaticModuleCurrencyPolicySchema = createRuntimeRowSchema({
  moduleId: { type: String, required: true, index: true },
  currencyId: { type: String, required: true, index: true },
})
StaticModuleCurrencyPolicySchema.index({ moduleId: 1, currencyId: 1, version: 1 }, { unique: true })

export const StaticDataImportBatchModel =
  mongoose.models.StaticDataImportBatch ??
  mongoose.model<StaticDataImportBatchDoc>('StaticDataImportBatch', StaticDataImportBatchSchema)

export const StaticTableRowModel =
  mongoose.models.StaticTableRow ??
  mongoose.model<StaticTableRowDoc>('StaticTableRow', StaticTableRowSchema)

export const StaticAidongMasterModel =
  mongoose.models.StaticAidongMaster ??
  mongoose.model<StaticAidongMasterDoc>('StaticAidongMaster', StaticAidongMasterSchema, 'staticAidongMasters')

export const StaticItemCatalogModel =
  mongoose.models.StaticItemCatalog ??
  mongoose.model<StaticItemCatalogDoc>('StaticItemCatalog', StaticItemCatalogSchema, 'staticItemCatalogs')

export const StaticAidongPediaItemMasterModel =
  mongoose.models.StaticAidongPediaItemMaster ??
  mongoose.model<StaticAidongPediaItemMasterDoc>(
    'StaticAidongPediaItemMaster',
    StaticAidongPediaItemMasterSchema,
    'staticAidongPediaItemMasters',
  )

export const StaticIslandZoneModel =
  mongoose.models.StaticIslandZone ??
  mongoose.model<StaticIslandZoneDoc>('StaticIslandZone', StaticIslandZoneSchema, 'staticIslandZones')

export const StaticCurrencyMasterModel =
  mongoose.models.StaticCurrencyMaster ??
  mongoose.model<StaticCurrencyMasterDoc>('StaticCurrencyMaster', StaticCurrencyMasterSchema, 'staticCurrencyMasters')

export const StaticModuleCurrencyPolicyModel =
  mongoose.models.StaticModuleCurrencyPolicy ??
  mongoose.model<StaticModuleCurrencyPolicyDoc>(
    'StaticModuleCurrencyPolicy',
    StaticModuleCurrencyPolicySchema,
    'staticModuleCurrencyPolicies',
  )

export const StaticBoardSetModel =
  mongoose.models.StaticBoardSet ??
  mongoose.model<StaticRuntimeBundleDoc>('StaticBoardSet', createRuntimeBundleSchema('staticBoardSets'))

export const StaticSooksoRuleSetModel =
  mongoose.models.StaticSooksoRuleSet ??
  mongoose.model<StaticRuntimeBundleDoc>('StaticSooksoRuleSet', createRuntimeBundleSchema('staticSooksoRuleSets'))

export const StaticStringPackModel =
  mongoose.models.StaticStringPack ??
  mongoose.model<StaticRuntimeBundleDoc>('StaticStringPack', createRuntimeBundleSchema('staticStringPacks'))

export const StaticAidongIslandBundleModel =
  mongoose.models.StaticAidongIslandBundle ??
  mongoose.model<StaticRuntimeBundleDoc>(
    'StaticAidongIslandBundle',
    createRuntimeBundleSchema('staticAidongIslandBundles'),
  )

export const StaticStoryBundleModel =
  mongoose.models.StaticStoryBundle ??
  mongoose.model<StaticRuntimeBundleDoc>('StaticStoryBundle', createRuntimeBundleSchema('staticStoryBundles'))

export const StaticDialoguePackModel =
  mongoose.models.StaticDialoguePack ??
  mongoose.model<StaticRuntimeBundleDoc>('StaticDialoguePack', createRuntimeBundleSchema('staticDialoguePacks'))

export const StaticCosmeticRuleSetModel =
  mongoose.models.StaticCosmeticRuleSet ??
  mongoose.model<StaticRuntimeBundleDoc>('StaticCosmeticRuleSet', createRuntimeBundleSchema('staticCosmeticRuleSets'))

export const STATIC_RUNTIME_ROW_MODELS = {
  staticAidongMasters: StaticAidongMasterModel,
  staticItemCatalogs: StaticItemCatalogModel,
  staticAidongPediaItemMasters: StaticAidongPediaItemMasterModel,
  staticIslandZones: StaticIslandZoneModel,
  staticCurrencyMasters: StaticCurrencyMasterModel,
  staticModuleCurrencyPolicies: StaticModuleCurrencyPolicyModel,
} as const

export const STATIC_RUNTIME_BUNDLE_MODELS = {
  staticBoardSets: StaticBoardSetModel,
  staticSooksoRuleSets: StaticSooksoRuleSetModel,
  staticStringPacks: StaticStringPackModel,
  staticAidongIslandBundles: StaticAidongIslandBundleModel,
  staticStoryBundles: StaticStoryBundleModel,
  staticDialoguePacks: StaticDialoguePackModel,
  staticCosmeticRuleSets: StaticCosmeticRuleSetModel,
} as const
