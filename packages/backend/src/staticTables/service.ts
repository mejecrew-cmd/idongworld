import fs from 'node:fs/promises'
import path from 'node:path'
import type { StaticRuntimeRowDoc, StaticTableRowDoc } from '../models/StaticTableModels.js'
import { buildStaticTableBundles, type StaticTableBundleBuildResult } from './bundles.js'
import { parseStaticTableCsvFile, type StaticTableCellValue, type StaticTableCsvParseResult } from './csv.js'
import { type StaticTableRepository } from './repository.js'
import { type StaticTableDefinition } from './registry.js'
import { validateStaticTables, type StaticTableValidationResult } from './validation.js'

export interface TableFile {
  filePath: string
  fileName: string
  tableCode: string
  sourceHash: string
  rowCount: number
  parsed: StaticTableCsvParseResult
}

export interface TableFileScanResult {
  sourceDir: string
  files: TableFile[]
  errors: Array<{
    fileName: string
    code: string
    message: string
  }>
}

export interface StaticImportPreview {
  ok: boolean
  version: string
  importBatchId: string
  sourceFiles: Array<{
    fileName: string
    tableCode: string
    sourceHash: string
    rowCount: number
  }>
  validation: StaticTableValidationResult
  tableRowCount: number
  runtimeRowCounts: Record<string, number>
  bundleCounts: Record<string, number>
  bundles: StaticTableBundleBuildResult[]
}

export interface StaticImportCommitResult extends StaticImportPreview {
  committed: boolean
}

export interface StaticTableImportServiceOptions {
  repository: StaticTableRepository
  version?: string
  importBatchId?: string
  now?: number
}

export async function scanTableFiles(sourceDir: string): Promise<TableFileScanResult> {
  const dirEntries = await fs.readdir(sourceDir, { withFileTypes: true })
  const csvFiles = dirEntries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.csv'))
    .map((entry) => entry.name)
    .sort()

  const files: TableFile[] = []
  const errors: TableFileScanResult['errors'] = []

  for (const fileName of csvFiles) {
    const filePath = path.join(sourceDir, fileName)
    try {
      const parsed = await parseStaticTableCsvFile(filePath)
      files.push({
        filePath,
        fileName,
        tableCode: parsed.tableCode,
        sourceHash: parsed.sourceHash,
        rowCount: parsed.rows.length,
        parsed,
      })
    } catch (error) {
      errors.push({
        fileName,
        code: error instanceof Error ? error.message : 'scan_failed',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { sourceDir, files, errors }
}

export async function validateStaticTableFiles(files: TableFile[]): Promise<StaticTableValidationResult> {
  return validateStaticTables(files.map((file) => file.parsed), { mode: 'commit' })
}

export async function previewStaticTableImport(
  files: TableFile[],
  options: Omit<StaticTableImportServiceOptions, 'repository'> = {},
): Promise<StaticImportPreview> {
  const now = options.now ?? Date.now()
  const version = options.version ?? createStaticImportVersion(now)
  const importBatchId = options.importBatchId ?? createStaticImportBatchId(now)
  const parsedTables = files.map((file) => file.parsed)
  const validation = validateStaticTables(parsedTables, { mode: 'commit' })
  const tableRows = buildStaticTableRows(files, { version, importBatchId, now })
  const runtimeRows = buildRuntimeRows(files, { version, importBatchId, now })
  const bundles = buildStaticTableBundles(parsedTables, { version, importBatchId, now })

  return {
    ok: validation.ok,
    version,
    importBatchId,
    sourceFiles: files.map((file) => ({
      fileName: file.fileName,
      tableCode: file.tableCode,
      sourceHash: file.sourceHash,
      rowCount: file.rowCount,
    })),
    validation,
    tableRowCount: tableRows.length,
    runtimeRowCounts: countByCollection(runtimeRows),
    bundleCounts: countBundlesByCollection(bundles),
    bundles,
  }
}

export async function commitStaticTableImport(
  files: TableFile[],
  actorUid: string,
  options: StaticTableImportServiceOptions,
): Promise<StaticImportCommitResult> {
  const now = options.now ?? Date.now()
  const preview = await previewStaticTableImport(files, {
    version: options.version,
    importBatchId: options.importBatchId,
    now,
  })

  if (!preview.ok) {
    await options.repository.upsertImportBatch({
      importBatchId: preview.importBatchId,
      status: 'failed',
      version: preview.version,
      sourceFiles: preview.sourceFiles,
      actorUid,
      validationSummary: preview.validation,
      errorMessage: 'static_import_validation_failed',
      createdAt: now,
      updatedAt: now,
      failedAt: now,
    })
    throw new Error('static_import_validation_failed')
  }

  const tableRows = buildStaticTableRows(files, {
    version: preview.version,
    importBatchId: preview.importBatchId,
    now,
  })
  const runtimeRows = buildRuntimeRows(files, {
    version: preview.version,
    importBatchId: preview.importBatchId,
    now,
  })

  await options.repository.upsertImportBatch({
    importBatchId: preview.importBatchId,
    status: 'committed',
    version: preview.version,
    sourceFiles: preview.sourceFiles,
    actorUid,
    validationSummary: preview.validation,
    dryRunSummary: {
      tableRowCount: preview.tableRowCount,
      runtimeRowCounts: preview.runtimeRowCounts,
      bundleCounts: preview.bundleCounts,
    },
    commitSummary: {
      tableRowCount: tableRows.length,
      runtimeRowCounts: preview.runtimeRowCounts,
      bundleCounts: preview.bundleCounts,
    },
    createdAt: now,
    updatedAt: now,
    committedAt: now,
  })
  await options.repository.upsertTableRows(tableRows)

  for (const [collectionName, rows] of runtimeRows.entries()) {
    await options.repository.upsertRuntimeRows(collectionName, rows)
  }
  for (const bundleResult of preview.bundles) {
    await options.repository.upsertRuntimeBundles(bundleResult.collectionName, bundleResult.bundles)
  }

  return {
    ...preview,
    committed: true,
  }
}

function buildStaticTableRows(
  files: TableFile[],
  context: {
    version: string
    importBatchId: string
    now: number
  },
): StaticTableRowDoc[] {
  return files.flatMap((file) => file.parsed.rows.map((row) => {
    const definition = file.parsed.tableDefinition
    return {
      tableCode: file.tableCode,
      version: context.version,
      rowKey: buildRowKey(row.values, definition),
      rowNo: row.rowNo,
      sourceFile: file.fileName,
      sourceHash: file.sourceHash,
      importBatchId: context.importBatchId,
      originalRow: row.original,
      normalizedRow: row.values,
      enabled: true,
      createdAt: context.now,
      updatedAt: context.now,
    }
  }))
}

function buildRuntimeRows(
  files: TableFile[],
  context: {
    version: string
    importBatchId: string
    now: number
  },
): Map<string, StaticRuntimeRowDoc[]> {
  const rowsByCollection = new Map<string, StaticRuntimeRowDoc[]>()

  for (const file of files) {
    const definition = file.parsed.tableDefinition
    if (!definition || definition.importKind === 'excluded') continue

    const rows = rowsByCollection.get(definition.targetCollection) ?? []
    for (const row of file.parsed.rows) {
      rows.push({
        ...pickRuntimePrimaryFields(row.values, definition),
        tableCode: file.tableCode,
        version: context.version,
        rowKey: buildRowKey(row.values, definition),
        sourceHash: file.sourceHash,
        importBatchId: context.importBatchId,
        enabled: true,
        data: row.values,
        createdAt: context.now,
        updatedAt: context.now,
      } as StaticRuntimeRowDoc)
    }
    rowsByCollection.set(definition.targetCollection, rows)
  }

  return rowsByCollection
}

function pickRuntimePrimaryFields(
  values: Record<string, StaticTableCellValue>,
  definition: StaticTableDefinition,
): Record<string, StaticTableCellValue> {
  const fields: Record<string, StaticTableCellValue> = {}
  for (const column of definition.primaryKey) {
    fields[column] = values[column]
  }
  return fields
}

function buildRowKey(
  values: Record<string, StaticTableCellValue>,
  definition: StaticTableDefinition | undefined,
): string {
  const columns = definition?.primaryKey.length ? definition.primaryKey : ['rowNo']
  return columns.map((column) => String(values[column] ?? '')).join('\u001f')
}

function countByCollection(rowsByCollection: Map<string, StaticRuntimeRowDoc[]>): Record<string, number> {
  return Object.fromEntries([...rowsByCollection.entries()].map(([collectionName, rows]) => [collectionName, rows.length]))
}

function countBundlesByCollection(bundleResults: StaticTableBundleBuildResult[]): Record<string, number> {
  return Object.fromEntries(bundleResults.map((result) => [result.collectionName, result.bundles.length]))
}

function createStaticImportVersion(now: number): string {
  return `static-${new Date(now).toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`
}

function createStaticImportBatchId(now: number): string {
  return `${createStaticImportVersion(now)}-${Math.random().toString(36).slice(2, 10)}`
}
