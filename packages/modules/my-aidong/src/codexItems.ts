/// <reference path="./csv.d.ts" />
/**
 * my-aidong/src/codexItems.ts
 * ------------------------------------------------------------
 * 역할: my-aidong/codex-items.csv를 Aidong별 25칸 도감 아이템 catalog로 변환한다.
 * 연결: M4 도감/생산/데뷔 루프에서 backend reward와 frontend 마이룸 표시가 같은 static catalog를 참조한다.
 * 주의: 이 파일은 static catalog만 제공한다. 실제 수량 원장은 myAidongStates.aidongCodexItems가 소유한다.
 */
import codexItemsCsv from '../codex-items.csv?raw'
import type { AidongCodexItem, AidongCodexItemRarity, AidongCodexItemSourceType } from './types.ts'

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
  if (!value) throw new Error(`[my-aidong] codex item row missing ${key}`)
  return value
}

function parseSlotNo(row: Record<string, string>): number {
  const slotNo = Number(requireText(row, 'slotNo'))
  if (!Number.isInteger(slotNo) || slotNo < CODEX_SLOT_MIN || slotNo > CODEX_SLOT_MAX) {
    throw new Error(`[my-aidong] codex item slotNo must be ${CODEX_SLOT_MIN}~${CODEX_SLOT_MAX}`)
  }
  return slotNo
}

function parseRarity(row: Record<string, string>): AidongCodexItemRarity {
  const rarity = requireText(row, 'rarity') as AidongCodexItemRarity
  if (!RARITIES.has(rarity)) throw new Error(`[my-aidong] unsupported codex item rarity: ${rarity}`)
  return rarity
}

function parseSourceType(row: Record<string, string>): AidongCodexItemSourceType {
  const sourceType = requireText(row, 'sourceType') as AidongCodexItemSourceType
  if (!SOURCE_TYPES.has(sourceType)) throw new Error(`[my-aidong] unsupported codex item sourceType: ${sourceType}`)
  return sourceType
}

function parseCodexItems(csvText: string): AidongCodexItem[] {
  const items = parseCsvRows(csvText).map((row) => ({
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
  const slotsByCharacter = new Set<string>()
  for (const item of items) {
    if (itemIds.has(item.itemId)) throw new Error(`[my-aidong] duplicated codex itemId: ${item.itemId}`)
    itemIds.add(item.itemId)

    const slotKey = `${item.characterId}:${item.slotNo}`
    if (slotsByCharacter.has(slotKey)) {
      throw new Error(`[my-aidong] duplicated codex slot: ${slotKey}`)
    }
    slotsByCharacter.add(slotKey)
  }

  return items
}

export const aidongCodexItems = parseCodexItems(codexItemsCsv)

export function getAidongCodexItems(characterId: string): AidongCodexItem[] {
  return aidongCodexItems
    .filter((item) => item.characterId === characterId)
    .sort((a, b) => a.slotNo - b.slotNo)
}

export function getAidongCodexItem(itemId: string): AidongCodexItem | undefined {
  return aidongCodexItems.find((item) => item.itemId === itemId)
}

export function getAidongCodexItemBySlot(characterId: string, slotNo: number): AidongCodexItem | undefined {
  return aidongCodexItems.find((item) => item.characterId === characterId && item.slotNo === slotNo)
}