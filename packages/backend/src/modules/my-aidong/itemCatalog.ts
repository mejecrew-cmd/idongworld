/**
 * packages/backend/src/modules/my-aidong/itemCatalog.ts
 * ------------------------------------------------------------
 * 역할: my-aidong/items.csv를 읽어 Aidong 소지/착용 가능 아이템을 검증한다.
 * 연결: my-aidong service의 equippedItems API가 host inventory에 들어온 itemId를 검증할 때 사용한다.
 * 주의: 실제 보유 수량은 hostStates.inventory가 권위이고, 이 catalog는 착용 가능한 id 목록만 정의한다.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export interface AidongItemCatalogEntry {
  itemId: string
  name: string
  kind: string
  stackable: boolean
  maxStack: number
  scope: string
  description: string
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const catalogPath = path.resolve(__dirname, '../../../../modules/my-aidong/items.csv')

function parseCatalog(): AidongItemCatalogEntry[] {
  const text = fs.readFileSync(catalogPath, 'utf8')
  const lines = text.split(/\r?\n/)
  const headerIndex = lines.findIndex((line) => {
    const trimmed = line.trim()
    return Boolean(trimmed) && !trimmed.startsWith('#')
  })
  if (headerIndex < 0) return []

  const headers = lines[headerIndex]!.split(',').map((value) => value.trim())
  const entries: AidongItemCatalogEntry[] = []
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const raw = lines[index] ?? ''
    const trimmed = raw.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const columns = raw.split(',').map((value) => value.trim())
    const record: Record<string, string> = {}
    headers.forEach((header, columnIndex) => {
      record[header] = columns[columnIndex] ?? ''
    })
    if (!record.itemId) continue
    entries.push({
      itemId: record.itemId,
      name: record.name,
      kind: record.kind,
      stackable: record.stackable === 'true',
      maxStack: Number(record.maxStack || 1),
      scope: record.scope,
      description: record.description,
    })
  }
  return entries
}

const catalog = parseCatalog()
const catalogById = new Map(catalog.map((entry) => [entry.itemId, entry]))

export function listAidongItemCatalog(): AidongItemCatalogEntry[] {
  return [...catalog]
}

export function getAidongItemCatalogEntry(itemId: string): AidongItemCatalogEntry | undefined {
  return catalogById.get(itemId)
}

export function isAidongEquippableItem(itemId: string): boolean {
  const entry = getAidongItemCatalogEntry(itemId)
  return entry?.kind === 'aidong-item' && entry.scope === 'aidong-global'
}
