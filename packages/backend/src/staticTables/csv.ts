import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import { parseStaticTableCodeFromFileName, resolveStaticTableDefinition, type StaticTableDefinition } from './registry.js'

export type StaticTableCellValue = string | number | boolean | undefined

export interface StaticTableCsvParseIssue {
  level: 'error' | 'warning'
  code: string
  message: string
  rowNo?: number
  column?: string
}

export interface StaticTableCsvRow {
  rowNo: number
  original: Record<string, string>
  values: Record<string, StaticTableCellValue>
}

export interface StaticTableCsvParseResult {
  tableCode: string
  tableDefinition?: StaticTableDefinition
  fileName?: string
  sourceHash: string
  headers: string[]
  originalHeaders: string[]
  rows: StaticTableCsvRow[]
  issues: StaticTableCsvParseIssue[]
}

const NUMERIC_COLUMN_PATTERNS = [
  /(?:^|\.)(?:no|num|count|amount|qty|quantity|order|index|level|rank|weight|rate|ratio|price|cost|value|score)$/i,
  /(?:No|Num|Count|Amount|Qty|Quantity|Order|Index|Level|Rank|Weight|Rate|Ratio|Price|Cost|Value|Score)$/i,
  /(?:^|\.)(?:row|col|column|x|y|z|width|height|left|top|right|bottom)$/i,
  /(?:Row|Col|Column|X|Y|Z|Width|Height|Left|Top|Right|Bottom)$/i,
  /(?:^|\.)(?:min|max|start|end|from|to|duration|cooldown|capacity|limit|offset|priority)$/i,
  /(?:Min|Max|Start|End|From|To|Duration|Cooldown|Capacity|Limit|Offset|Priority)$/i,
  /(?:^|\.)(?:slotNo|pageNo|lineNo|sortOrder|utcOffsetMinutes)$/i,
]

const BOOLEAN_COLUMN_PATTERNS = [
  /^(?:is|has|can|should|allow|enable|enabled|required|optional|visible|locked|active)[A-Z_]?.*/i,
  /(?:^|\.)(?:enabled|required|optional|visible|locked|active|default)$/i,
]

export function stripUtf8Bom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

export function calculateStaticTableFileHash(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex')
}

export function toCamelCaseColumnName(columnName: string): string {
  const trimmed = columnName.trim()
  if (!trimmed) throw new Error('column_name_empty')
  if (!/^_?[A-Za-z][A-Za-z0-9_]*$/.test(trimmed)) throw new Error(`invalid_column_name:${columnName}`)
  if (!trimmed.includes('_')) return trimmed

  const privatePrefix = trimmed.startsWith('_') ? '_' : ''
  const body = privatePrefix ? trimmed.slice(1) : trimmed

  return privatePrefix + body
    .toLowerCase()
    .replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase())
}

export function parseCsvRecords(csvText: string): string[][] {
  const text = stripUtf8Bom(csvText)
  const records: string[][] = []
  let record: string[] = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        cell += '"'
        index += 1
        continue
      }
      if (char === '"') {
        inQuotes = false
        continue
      }
      cell += char
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }
    if (char === ',') {
      record.push(cell)
      cell = ''
      continue
    }
    if (char === '\n') {
      record.push(dropTrailingCarriageReturn(cell))
      records.push(record)
      record = []
      cell = ''
      continue
    }

    cell += char
  }

  if (inQuotes) throw new Error('csv_unclosed_quote')

  if (cell.length > 0 || record.length > 0 || text.endsWith(',')) {
    record.push(dropTrailingCarriageReturn(cell))
    records.push(record)
  }

  return records.filter((row) => row.some((cellValue) => cellValue.trim() !== ''))
}

export function normalizeStaticTableValue(columnName: string, value: string): StaticTableCellValue {
  const trimmed = value.trim()
  if (trimmed === '') return undefined

  const booleanValue = parseBooleanValue(trimmed)
  if (booleanValue !== undefined && shouldNormalizeBoolean(columnName)) return booleanValue

  if (shouldNormalizeNumber(columnName) && isNumericLiteral(trimmed)) {
    return Number(trimmed)
  }

  return value
}

export function parseStaticTableCsvText(
  csvText: string,
  options: {
    tableCode?: string
    fileName?: string
  } = {},
): StaticTableCsvParseResult {
  const sourceHash = calculateStaticTableFileHash(csvText)
  const issues: StaticTableCsvParseIssue[] = []
  const tableCode = options.tableCode ?? (options.fileName ? parseStaticTableCodeFromFileName(options.fileName) : undefined)
  if (!tableCode) throw new Error('static_table_code_not_found')

  const records = repairStaticTableRecords(parseCsvRecords(csvText), tableCode)
  const [headerRecord, ...bodyRecords] = records

  if (!headerRecord) throw new Error('csv_header_required')

  const originalHeaders = headerRecord.map((header) => header.trim())
  const headers = originalHeaders.map((header) => {
    try {
      return toCamelCaseColumnName(header)
    } catch (error) {
      issues.push({
        level: 'error',
        code: 'invalid_column_name',
        column: header,
        message: error instanceof Error ? error.message : String(error),
      })
      return header
    }
  })

  const duplicateHeaders = findDuplicates(headers)
  for (const header of duplicateHeaders) {
    issues.push({
      level: 'error',
      code: 'duplicate_column_name',
      column: header,
      message: `Duplicate column after camelCase conversion: ${header}`,
    })
  }

  const rows = bodyRecords.map((record, index): StaticTableCsvRow => {
    const rowNo = index + 2
    const original: Record<string, string> = {}
    const values: Record<string, StaticTableCellValue> = {}

    for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
      const originalHeader = originalHeaders[columnIndex]
      const header = headers[columnIndex]
      const rawValue = record[columnIndex] ?? ''
      original[originalHeader] = rawValue
      values[header] = normalizeStaticTableValue(header, rawValue)
    }

    if (record.length > headers.length) {
      issues.push({
        level: 'warning',
        code: 'extra_csv_cells',
        rowNo,
        message: `Row has ${record.length - headers.length} extra cell(s).`,
      })
    }

    return { rowNo, original, values }
  })

  return {
    tableCode,
    tableDefinition: resolveStaticTableDefinition(tableCode),
    fileName: options.fileName,
    sourceHash,
    headers,
    originalHeaders,
    rows,
    issues,
  }
}

export async function parseStaticTableCsvFile(filePath: string): Promise<StaticTableCsvParseResult> {
  const csvText = await fs.readFile(filePath, 'utf8')
  return parseStaticTableCsvText(csvText, { fileName: filePath })
}

function repairStaticTableRecords(records: string[][], tableCode: string): string[][] {
  if (tableCode !== 'X-CHR-00') return records

  return records.map((record) => {
    if (record.length < 2) return record
    if (!record[0].includes(',') || !record[1].includes(',')) return record

    const stitched = `${record[0]}${record[1]}`.replace(/\bsource_index_ile\b/g, 'source_index_file')
    return [...stitched.split(','), ...record.slice(2)]
  })
}

function dropTrailingCarriageReturn(value: string): string {
  return value.endsWith('\r') ? value.slice(0, -1) : value
}

function parseBooleanValue(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase()
  if (['true', '1', 'y', 'yes'].includes(normalized)) return true
  if (['false', '0', 'n', 'no'].includes(normalized)) return false
  return undefined
}

function shouldNormalizeBoolean(columnName: string): boolean {
  return BOOLEAN_COLUMN_PATTERNS.some((pattern) => pattern.test(columnName))
}

function shouldNormalizeNumber(columnName: string): boolean {
  return NUMERIC_COLUMN_PATTERNS.some((pattern) => pattern.test(columnName))
}

function isNumericLiteral(value: string): boolean {
  return /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value)
    seen.add(value)
  }
  return [...duplicates]
}
