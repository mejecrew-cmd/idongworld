import type { StaticTableCellValue, StaticTableCsvParseIssue, StaticTableCsvParseResult } from './csv.js'
import { resolveStaticTableDefinition, type StaticTableDefinition } from './registry.js'

export type StaticTableValidationMode = 'dryRun' | 'commit'

export interface StaticTableValidationIssue {
  level: 'error' | 'warning'
  rowNo?: number
  column?: string
  code: string
  message: string
}

export interface StaticTableValidationSummary {
  ok: boolean
  tableCode: string
  tableName?: string
  rowCount: number
  errors: StaticTableValidationIssue[]
}

export interface StaticTableValidationResult {
  ok: boolean
  summaries: StaticTableValidationSummary[]
  errors: StaticTableValidationIssue[]
}

export type StaticTableCustomValidator = (
  table: StaticTableCsvParseResult,
  definition: StaticTableDefinition,
) => StaticTableValidationIssue[]

export interface ValidateStaticTablesOptions {
  mode?: StaticTableValidationMode
  customValidators?: Record<string, StaticTableCustomValidator>
}

export function validateStaticTables(
  tables: StaticTableCsvParseResult[],
  options: ValidateStaticTablesOptions = {},
): StaticTableValidationResult {
  const mode = options.mode ?? 'commit'
  const referenceIndexes = buildReferenceIndexes(tables)
  const summaries = tables.map((table) =>
    validateStaticTable(table, {
      mode,
      referenceIndexes,
      customValidators: options.customValidators ?? {},
    }),
  )
  const errors = summaries.flatMap((summary) => summary.errors)
  return {
    ok: errors.every((error) => error.level !== 'error'),
    summaries,
    errors,
  }
}

function validateStaticTable(
  table: StaticTableCsvParseResult,
  context: {
    mode: StaticTableValidationMode
    referenceIndexes: Map<string, Map<string, Set<string>>>
    customValidators: Record<string, StaticTableCustomValidator>
  },
): StaticTableValidationSummary {
  const definition = table.tableDefinition ?? resolveStaticTableDefinition(table.tableCode)
  const errors: StaticTableValidationIssue[] = table.issues.map(csvIssueToValidationIssue)

  if (!definition) {
    errors.push({
      level: 'error',
      code: 'unknown_table_code',
      message: `Unknown static tableCode: ${table.tableCode}`,
    })
    return createSummary(table, undefined, errors)
  }

  if (context.mode === 'commit' && definition.importKind === 'excluded') {
    errors.push({
      level: 'error',
      code: 'excluded_table_commit_blocked',
      message: `Table ${table.tableCode} is dynamic/excluded and cannot be committed by static import.`,
    })
  }

  validateRequiredColumns(table, definition, errors)
  validatePrimaryKeys(table, definition, errors)
  validateDependencies(table, definition, context.referenceIndexes, errors)

  const customValidator = context.customValidators[table.tableCode] ?? context.customValidators[definition.tableCode]
  if (customValidator) {
    errors.push(...customValidator(table, definition))
  }

  return createSummary(table, definition, errors)
}

function validateRequiredColumns(
  table: StaticTableCsvParseResult,
  definition: StaticTableDefinition,
  errors: StaticTableValidationIssue[],
) {
  if (definition.importKind === 'excluded') return

  for (const column of definition.requiredColumns) {
    if (!table.headers.includes(column)) {
      errors.push({
        level: 'error',
        column,
        code: 'required_column_missing',
        message: `Required column is missing: ${column}`,
      })
      continue
    }

    for (const row of table.rows) {
      if (isEmptyCell(row.values[column])) {
        errors.push({
          level: 'error',
          rowNo: row.rowNo,
          column,
          code: 'required_value_missing',
          message: `Required value is missing: ${column}`,
        })
      }
    }
  }
}

function validatePrimaryKeys(
  table: StaticTableCsvParseResult,
  definition: StaticTableDefinition,
  errors: StaticTableValidationIssue[],
) {
  if (definition.importKind === 'excluded') return

  for (const column of definition.primaryKey) {
    if (!table.headers.includes(column)) {
      errors.push({
        level: 'error',
        column,
        code: 'primary_key_column_missing',
        message: `Primary key column is missing: ${column}`,
      })
    }
  }

  const seen = new Map<string, number>()
  for (const row of table.rows) {
    const rowKey = buildRowKey(row.values, definition.primaryKey)
    if (!rowKey) continue

    const previousRowNo = seen.get(rowKey)
    if (previousRowNo !== undefined) {
      errors.push({
        level: 'error',
        rowNo: row.rowNo,
        code: 'duplicate_primary_key',
        message: `Duplicate primary key "${rowKey}" also appears at row ${previousRowNo}.`,
      })
      continue
    }
    seen.set(rowKey, row.rowNo)
  }
}

function validateDependencies(
  table: StaticTableCsvParseResult,
  definition: StaticTableDefinition,
  referenceIndexes: Map<string, Map<string, Set<string>>>,
  errors: StaticTableValidationIssue[],
) {
  if (definition.importKind === 'excluded') return

  for (const dependency of definition.dependencyKeys) {
    const referencesByColumn = referenceIndexes.get(dependency.referencesTableCode)
    const referencedValues = referencesByColumn?.get(dependency.referencesColumn)

    for (const row of table.rows) {
      const value = row.values[dependency.column]
      if (isEmptyCell(value)) {
        if (!dependency.optional) {
          errors.push({
            level: 'error',
            rowNo: row.rowNo,
            column: dependency.column,
            code: 'dependency_value_missing',
            message: `Dependency value is missing: ${dependency.column}`,
          })
        }
        continue
      }

      if (!referencedValues) {
        errors.push({
          level: dependency.optional ? 'warning' : 'error',
          rowNo: row.rowNo,
          column: dependency.column,
          code: 'dependency_table_missing',
          message: `Referenced table ${dependency.referencesTableCode} is not included in this import batch.`,
        })
        continue
      }

      if (!referencedValues.has(cellKey(value))) {
        errors.push({
          level: dependency.optional ? 'warning' : 'error',
          rowNo: row.rowNo,
          column: dependency.column,
          code: 'dependency_value_not_found',
          message: `Value "${String(value)}" does not exist in ${dependency.referencesTableCode}.${dependency.referencesColumn}.`,
        })
      }
    }
  }
}

function buildReferenceIndexes(tables: StaticTableCsvParseResult[]): Map<string, Map<string, Set<string>>> {
  const indexes = new Map<string, Map<string, Set<string>>>()

  for (const table of tables) {
    const definition = table.tableDefinition ?? resolveStaticTableDefinition(table.tableCode)
    const tableCodes = new Set([table.tableCode])
    if (definition?.tableCode) tableCodes.add(definition.tableCode)

    for (const tableCode of tableCodes) {
      const columns = indexes.get(tableCode) ?? new Map<string, Set<string>>()
      indexes.set(tableCode, columns)

      for (const header of table.headers) {
        const values = columns.get(header) ?? new Set<string>()
        columns.set(header, values)
        for (const row of table.rows) {
          const value = row.values[header]
          if (!isEmptyCell(value)) values.add(cellKey(value))
        }
      }
    }
  }

  return indexes
}

function createSummary(
  table: StaticTableCsvParseResult,
  definition: StaticTableDefinition | undefined,
  errors: StaticTableValidationIssue[],
): StaticTableValidationSummary {
  return {
    ok: errors.every((error) => error.level !== 'error'),
    tableCode: table.tableCode,
    tableName: definition?.tableName,
    rowCount: table.rows.length,
    errors,
  }
}

function csvIssueToValidationIssue(issue: StaticTableCsvParseIssue): StaticTableValidationIssue {
  return {
    level: issue.level,
    rowNo: issue.rowNo,
    column: issue.column,
    code: issue.code,
    message: issue.message,
  }
}

function buildRowKey(values: Record<string, StaticTableCellValue>, columns: string[]): string | undefined {
  const parts: string[] = []
  for (const column of columns) {
    const value = values[column]
    if (isEmptyCell(value)) return undefined
    parts.push(cellKey(value))
  }
  return parts.join('\u001f')
}

function isEmptyCell(value: StaticTableCellValue): boolean {
  return value === undefined || value === ''
}

function cellKey(value: StaticTableCellValue): string {
  return String(value)
}
