import mongoose, { Schema } from 'mongoose'
import {
  STATIC_RUNTIME_BUNDLE_MODELS,
  STATIC_RUNTIME_ROW_MODELS,
  StaticDataImportBatchModel,
  StaticTableRowModel,
  type StaticDataImportBatchDoc,
  type StaticRuntimeBundleDoc,
  type StaticRuntimeRowDoc,
  type StaticTableRowDoc,
} from '../models/StaticTableModels.js'
import type { StaticTableRepository } from './repository.js'

export const mongoStaticTableRepository: StaticTableRepository = {
  async upsertImportBatch(batch) {
    const doc = await StaticDataImportBatchModel.findOneAndUpdate(
      { importBatchId: batch.importBatchId },
      { $set: batch },
      { new: true, upsert: true },
    ).lean<StaticDataImportBatchDoc>()
    return clone(doc ?? batch)
  },

  async listImportBatches() {
    const docs = await StaticDataImportBatchModel
      .find({})
      .sort({ updatedAt: -1 })
      .lean<StaticDataImportBatchDoc[]>()
    return docs.map((doc) => clone(doc))
  },

  async upsertTableRows(rows) {
    for (const row of rows) {
      await StaticTableRowModel.findOneAndUpdate(
        { tableCode: row.tableCode, version: row.version, rowKey: row.rowKey },
        { $set: row },
        { new: true, upsert: true },
      )
    }
    return rows.map((row) => clone(row))
  },

  async listTableRows(tableCode, version) {
    const docs = await StaticTableRowModel
      .find({ tableCode, version })
      .sort({ rowNo: 1, rowKey: 1 })
      .lean<StaticTableRowDoc[]>()
    return docs.map((doc) => clone(doc))
  },

  async upsertRuntimeRows(collectionName, rows) {
    const model = getRuntimeRowModel(collectionName)
    for (const row of rows) {
      await model.findOneAndUpdate(
        { version: row.version, rowKey: row.rowKey },
        { $set: row },
        { new: true, upsert: true },
      )
    }
    return rows.map((row) => clone(row))
  },

  async listRuntimeRows(collectionName, version) {
    const model = getRuntimeRowModel(collectionName)
    const docs = await model
      .find({ version })
      .sort({ rowKey: 1 })
      .lean<StaticRuntimeRowDoc[]>()
    return docs.map((doc) => clone(doc))
  },

  async upsertRuntimeBundles(collectionName, bundles) {
    const model = getRuntimeBundleModel(collectionName)
    for (const bundle of bundles) {
      await model.findOneAndUpdate(
        { version: bundle.version, bundleId: bundle.bundleId },
        { $set: bundle },
        { new: true, upsert: true },
      )
    }
    return bundles.map((bundle) => clone(bundle))
  },

  async listRuntimeBundles(collectionName, version) {
    const model = getRuntimeBundleModel(collectionName)
    const docs = await model
      .find({ version })
      .sort({ bundleId: 1 })
      .lean<StaticRuntimeBundleDoc[]>()
    return docs.map((doc) => clone(doc))
  },
}

function getRuntimeRowModel(collectionName: string) {
  const knownModel = (STATIC_RUNTIME_ROW_MODELS as Record<string, mongoose.Model<StaticRuntimeRowDoc> | undefined>)[collectionName]
  if (knownModel) return knownModel

  const modelName = `GenericStaticRuntimeRow_${sanitizeModelName(collectionName)}`
  const existing = mongoose.models[modelName] as mongoose.Model<StaticRuntimeRowDoc> | undefined
  if (existing) return existing

  const schema = new Schema<StaticRuntimeRowDoc>(
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
    },
    {
      collection: collectionName,
      minimize: false,
      versionKey: false,
    },
  )
  schema.index({ version: 1, rowKey: 1 }, { unique: true })
  schema.index({ enabled: 1, version: 1 })
  return mongoose.model<StaticRuntimeRowDoc>(modelName, schema)
}

function getRuntimeBundleModel(collectionName: string) {
  const knownModel = (STATIC_RUNTIME_BUNDLE_MODELS as Record<string, mongoose.Model<StaticRuntimeBundleDoc> | undefined>)[collectionName]
  if (knownModel) return knownModel

  const modelName = `GenericStaticRuntimeBundle_${sanitizeModelName(collectionName)}`
  const existing = mongoose.models[modelName] as mongoose.Model<StaticRuntimeBundleDoc> | undefined
  if (existing) return existing

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
      collection: collectionName,
      minimize: false,
      versionKey: false,
    },
  )
  schema.index({ bundleId: 1, version: 1 }, { unique: true })
  schema.index({ enabled: 1, version: 1 })
  return mongoose.model<StaticRuntimeBundleDoc>(modelName, schema)
}

function sanitizeModelName(collectionName: string): string {
  return collectionName.replace(/[^a-zA-Z0-9]/g, '_')
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
