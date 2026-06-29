import type {
  StaticDataImportBatchDoc,
  StaticRuntimeBundleDoc,
  StaticRuntimeRowDoc,
  StaticTableRowDoc,
} from '../models/StaticTableModels.js'

export interface StaticTableRepository {
  upsertImportBatch(batch: StaticDataImportBatchDoc): Promise<StaticDataImportBatchDoc>
  listImportBatches(): Promise<StaticDataImportBatchDoc[]>
  upsertTableRows(rows: StaticTableRowDoc[]): Promise<StaticTableRowDoc[]>
  listTableRows(tableCode: string, version: string): Promise<StaticTableRowDoc[]>
  upsertRuntimeRows(collectionName: string, rows: StaticRuntimeRowDoc[]): Promise<StaticRuntimeRowDoc[]>
  listRuntimeRows(collectionName: string, version: string): Promise<StaticRuntimeRowDoc[]>
  upsertRuntimeBundles(collectionName: string, bundles: StaticRuntimeBundleDoc[]): Promise<StaticRuntimeBundleDoc[]>
  listRuntimeBundles(collectionName: string, version: string): Promise<StaticRuntimeBundleDoc[]>
}

export class InMemoryStaticTableRepository implements StaticTableRepository {
  private readonly importBatches = new Map<string, StaticDataImportBatchDoc>()
  private readonly tableRows = new Map<string, StaticTableRowDoc>()
  private readonly runtimeRows = new Map<string, Map<string, StaticRuntimeRowDoc>>()
  private readonly runtimeBundles = new Map<string, Map<string, StaticRuntimeBundleDoc>>()

  async upsertImportBatch(batch: StaticDataImportBatchDoc): Promise<StaticDataImportBatchDoc> {
    this.importBatches.set(batch.importBatchId, { ...batch })
    return { ...batch }
  }

  async listImportBatches(): Promise<StaticDataImportBatchDoc[]> {
    return [...this.importBatches.values()].map((batch) => ({ ...batch }))
  }

  async upsertTableRows(rows: StaticTableRowDoc[]): Promise<StaticTableRowDoc[]> {
    for (const row of rows) {
      this.tableRows.set(tableRowKey(row.tableCode, row.version, row.rowKey), clone(row))
    }
    return rows.map((row) => clone(row))
  }

  async listTableRows(tableCode: string, version: string): Promise<StaticTableRowDoc[]> {
    return [...this.tableRows.values()]
      .filter((row) => row.tableCode === tableCode && row.version === version)
      .map((row) => clone(row))
  }

  async upsertRuntimeRows(collectionName: string, rows: StaticRuntimeRowDoc[]): Promise<StaticRuntimeRowDoc[]> {
    const collection = getOrCreateMap(this.runtimeRows, collectionName)
    for (const row of rows) {
      collection.set(runtimeRowKey(row.version, row.rowKey), clone(row))
    }
    return rows.map((row) => clone(row))
  }

  async listRuntimeRows(collectionName: string, version: string): Promise<StaticRuntimeRowDoc[]> {
    return [...(this.runtimeRows.get(collectionName)?.values() ?? [])]
      .filter((row) => row.version === version)
      .map((row) => clone(row))
  }

  async upsertRuntimeBundles(
    collectionName: string,
    bundles: StaticRuntimeBundleDoc[],
  ): Promise<StaticRuntimeBundleDoc[]> {
    const collection = getOrCreateMap(this.runtimeBundles, collectionName)
    for (const bundle of bundles) {
      collection.set(runtimeBundleKey(bundle.version, bundle.bundleId), clone(bundle))
    }
    return bundles.map((bundle) => clone(bundle))
  }

  async listRuntimeBundles(collectionName: string, version: string): Promise<StaticRuntimeBundleDoc[]> {
    return [...(this.runtimeBundles.get(collectionName)?.values() ?? [])]
      .filter((bundle) => bundle.version === version)
      .map((bundle) => clone(bundle))
  }
}

function tableRowKey(tableCode: string, version: string, rowKey: string): string {
  return `${tableCode}:${version}:${rowKey}`
}

function runtimeRowKey(version: string, rowKey: string): string {
  return `${version}:${rowKey}`
}

function runtimeBundleKey(version: string, bundleId: string): string {
  return `${version}:${bundleId}`
}

function getOrCreateMap<T>(target: Map<string, Map<string, T>>, collectionName: string): Map<string, T> {
  const existing = target.get(collectionName)
  if (existing) return existing
  const created = new Map<string, T>()
  target.set(collectionName, created)
  return created
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
