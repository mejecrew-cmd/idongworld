/**
 * packages/backend/src/modules/my-aidong/codexCatalog.ts
 * ------------------------------------------------------------
 * 역할: packages/modules/my-aidong/codex-items.csv를 backend 권위 검증용 catalog로 읽는다.
 * 연결: my-aidong service의 도감 아이템 지급, 25칸 progress 파생, myroom aggregation의 기준 데이터다.
 * 주의: 이 파일은 static catalog만 다룬다. 실제 보유 수량은 myAidongStates.aidongCodexItems가 소유한다.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export type AidongCodexItemRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type AidongCodexItemSourceType =
  | 'zone-production'
  | 'zone-clear'
  | 'voyage-island'
  | 'stage-placeholder'
  | 'event-placeholder'
  | 'test'

export interface AidongCodexCatalogItem {
  characterId: string
  itemId: string
  name: string
  slotNo: number
  rarity: AidongCodexItemRarity
  sourceType: AidongCodexItemSourceType
  sourceId: string
  phase: string
  description: string
}

export interface AidongCodexProgressSlot {
  slotNo: number
  status: 'locked' | 'empty' | 'owned'
  quantity: number
  item?: AidongCodexCatalogItem
}

const CODEX_SLOT_MIN = 1
const CODEX_SLOT_MAX = 25
const RARITIES = new Set<AidongCodexItemRarity>(['common', 'rare', 'epic', 'legendary'])
const SOURCE_TYPES = new Set<AidongCodexItemSourceType>([
  'zone-production',
  'zone-clear',
  'voyage-island',
  'stage-placeholder',
  'event-placeholder',
  'test',
])

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const catalogPath = path.resolve(__dirname, '../../../../modules/my-aidong/codex-items.csv')

function parseCsvRows(csvText: string): Record<string, string>[] {
  const lines = csvText
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))

  const [headerLine, ...dataLines] = lines
  if (!headerLine) return []

  const headers = headerLine.split(',').map((header) => header.trim())
  return dataLines.map((line) => {
    const values = line.split(',').map((value) => value.trim())
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })
    return row
  })
}

function requireText(row: Record<string, string>, key: string): string {
  const value = row[key]?.trim()
  if (!value) throw new Error(`Invalid my-aidong codex catalog: missing ${key}`)
  return value
}

function parseSlotNo(row: Record<string, string>): number {
  const slotNo = Number(requireText(row, 'slotNo'))
  if (!Number.isInteger(slotNo) || slotNo < CODEX_SLOT_MIN || slotNo > CODEX_SLOT_MAX) {
    throw new Error(`Invalid my-aidong codex catalog: slotNo must be ${CODEX_SLOT_MIN}~${CODEX_SLOT_MAX}`)
  }
  return slotNo
}

function parseRarity(row: Record<string, string>): AidongCodexItemRarity {
  const rarity = requireText(row, 'rarity') as AidongCodexItemRarity
  if (!RARITIES.has(rarity)) throw new Error(`Invalid my-aidong codex catalog: unsupported rarity ${rarity}`)
  return rarity
}

function parseSourceType(row: Record<string, string>): AidongCodexItemSourceType {
  const sourceType = requireText(row, 'sourceType') as AidongCodexItemSourceType
  if (!SOURCE_TYPES.has(sourceType)) throw new Error(`Invalid my-aidong codex catalog: unsupported sourceType ${sourceType}`)
  return sourceType
}

function loadCatalog(): AidongCodexCatalogItem[] {
  if (!fs.existsSync(catalogPath)) return []
  const rows = parseCsvRows(fs.readFileSync(catalogPath, 'utf8'))
  const items = rows.map((row) => ({
    characterId: requireText(row, 'characterId'),
    itemId: requireText(row, 'itemId'),
    name: requireText(row, 'name'),
    slotNo: parseSlotNo(row),
    rarity: parseRarity(row),
    sourceType: parseSourceType(row),
    sourceId: requireText(row, 'sourceId'),
    phase: requireText(row, 'phase'),
    description: row.description?.trim() ?? '',
  }))

  const itemIds = new Set<string>()
  const slots = new Set<string>()
  for (const item of items) {
    if (itemIds.has(item.itemId)) throw new Error(`Invalid my-aidong codex catalog: duplicated itemId ${item.itemId}`)
    itemIds.add(item.itemId)

    const slotKey = `${item.characterId}:${item.slotNo}`
    if (slots.has(slotKey)) throw new Error(`Invalid my-aidong codex catalog: duplicated slot ${slotKey}`)
    slots.add(slotKey)
  }

  return items
}

const CATALOG = loadCatalog()

export function listAidongCodexCatalogItems(): AidongCodexCatalogItem[] {
  return CATALOG
}

export function getAidongCodexCatalogItems(characterId: string): AidongCodexCatalogItem[] {
  return CATALOG
    .filter((item) => item.characterId === characterId)
    .sort((a, b) => a.slotNo - b.slotNo)
}

export function getAidongCodexItem(itemId: string): AidongCodexCatalogItem | undefined {
  return CATALOG.find((item) => item.itemId === itemId)
}

export function buildAidongCodexProgress(
  characterId: string,
  ownedItems: Record<string, number>,
): AidongCodexProgressSlot[] {
  const itemsBySlot = new Map<number, AidongCodexCatalogItem>()
  for (const item of getAidongCodexCatalogItems(characterId)) {
    itemsBySlot.set(item.slotNo, item)
  }

  const slots: AidongCodexProgressSlot[] = []
  for (let slotNo = CODEX_SLOT_MIN; slotNo <= CODEX_SLOT_MAX; slotNo += 1) {
    const item = itemsBySlot.get(slotNo)
    if (!item) {
      slots.push({ slotNo, status: 'locked', quantity: 0 })
      continue
    }

    const quantity = Math.max(0, Math.floor(Number(ownedItems[item.itemId] ?? 0)))
    slots.push({
      slotNo,
      item,
      quantity,
      status: quantity > 0 ? 'owned' : 'empty',
    })
  }
  return slots
}