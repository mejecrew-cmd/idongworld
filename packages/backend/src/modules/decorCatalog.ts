/**
 * packages/backend/src/modules/decorCatalog.ts
 * ------------------------------------------------------------
 * 역할: 각 모듈 폴더의 decor.csv를 backend 권위 catalog로 읽는다.
 * 연결: lodge와 ship service가 구매 비용, 기본 보유량, 배치 가능 위치를 이 loader에서 가져온다.
 * 주의: decor 밸런스 값은 코드 상수로 중복하지 말고 CSV와 이 parser를 함께 갱신한다.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export interface DecorCatalogItem {
  itemId: string
  label: string
  cost: number
  defaultOwned: number
  placementScope: string
  description: string
  phase: string
  category?: string
  itemIconId?: string
  assetPath?: string
}

interface DecorCatalogRow {
  itemId: string
  label: string
  cost: string
  defaultOwned: string
  placementScope: string
  description: string
  phase: string
  category?: string
  itemIconId?: string
  assetPath?: string
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const modulesRoot = path.resolve(__dirname, '../../../modules')

function parseRows(csvText: string): DecorCatalogRow[] {
  const lines = csvText.split(/\r?\n/)
  const headerIndex = lines.findIndex((line) => {
    const trimmed = line.trim()
    return Boolean(trimmed) && !trimmed.startsWith('#')
  })
  if (headerIndex < 0) return []

  const headers = lines[headerIndex]!.split(',').map((value) => value.trim())
  const rows: DecorCatalogRow[] = []
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i]!.trim()
    if (!line || line.startsWith('#')) continue
    const columns = lines[i]!.split(',').map((value) => value.trim())
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = columns[index] ?? ''
    })
    if (record.itemId) rows.push(record as unknown as DecorCatalogRow)
  }
  return rows
}

function catalogError(moduleId: string, itemId: string, field: string, reason: string): Error {
  return new Error(`[decor] ${moduleId}/${itemId}.${field} ${reason}`)
}

function toNonNegativeInteger(moduleId: string, row: DecorCatalogRow, field: keyof DecorCatalogRow): number {
  const value = Number(row[field])
  if (!Number.isInteger(value) || value < 0) {
    throw catalogError(moduleId, row.itemId, String(field), 'must be a non-negative integer')
  }
  return value
}

function toDecorItem(moduleId: string, row: DecorCatalogRow): DecorCatalogItem {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.itemId)) {
    throw catalogError(moduleId, row.itemId || '<empty>', 'itemId', 'must be kebab-case')
  }
  if (!row.placementScope) {
    throw catalogError(moduleId, row.itemId, 'placementScope', 'is required')
  }

  return {
    itemId: row.itemId,
    label: row.label || row.itemId,
    cost: toNonNegativeInteger(moduleId, row, 'cost'),
    defaultOwned: toNonNegativeInteger(moduleId, row, 'defaultOwned'),
    placementScope: row.placementScope,
    description: row.description,
    phase: row.phase,
    category: row.category?.trim() || undefined,
    itemIconId: row.itemIconId?.trim() || undefined,
    assetPath: row.assetPath?.trim() || undefined,
  }
}

const catalogCache = new Map<string, DecorCatalogItem[]>()

export function listDecorCatalogItems(moduleId: string): DecorCatalogItem[] {
  const cached = catalogCache.get(moduleId)
  if (cached) return [...cached]

  const decorPath = path.join(modulesRoot, moduleId, 'decor.csv')
  if (!fs.existsSync(decorPath)) {
    throw new Error(`[decor] decor.csv not found: ${decorPath}`)
  }

  const items = parseRows(fs.readFileSync(decorPath, 'utf8')).map((row) => toDecorItem(moduleId, row))
  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.itemId)) throw new Error(`[decor] duplicate itemId: ${moduleId}/${item.itemId}`)
    ids.add(item.itemId)
  }
  catalogCache.set(moduleId, items)
  return [...items]
}

export function requireDecorCatalogItem(moduleId: string, itemId: string): DecorCatalogItem {
  const item = listDecorCatalogItems(moduleId).find((entry) => entry.itemId === itemId)
  if (!item) throw new Error('unsupported_decor_item')
  return item
}
