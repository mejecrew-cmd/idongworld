/// <reference path="./csv.d.ts" />
/**
 * 📁 ship/src/shipTypes.ts — ship type CSV accessor
 *
 * balance.csv의 shipTypeId, slot 수, cargo capacity를 frontend/module 코드에서 조회한다.
 * backend 검증은 packages/backend/src/modules/ship/balance.ts에서 같은 CSV를 다시 읽는다.
 */
import shipTypeCsv from '../balance.csv?raw'

export interface ShipTypeConfig {
  shipTypeId: string
  name: string
  cabinSlots: number
  deckSlots: number
  cargoCapacity: number
  diceBonus: number
  isDefault: boolean
  description: string
  phase: string
}

interface ShipTypeRow {
  shipTypeId: string
  name: string
  cabinSlots: string
  deckSlots: string
  cargoCapacity: string
  diceBonus: string
  isDefault: string
  description: string
  phase: string
}

function parseRows(csvText: string): ShipTypeRow[] {
  const lines = csvText.split(/\r?\n/)
  const headerIndex = lines.findIndex((line) => {
    const trimmed = line.trim()
    return Boolean(trimmed) && !trimmed.startsWith('#')
  })
  if (headerIndex < 0) return []

  const headers = lines[headerIndex]!.split(',').map((value) => value.trim())
  const rows: ShipTypeRow[] = []
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i]!.trim()
    if (!line || line.startsWith('#')) continue
    const columns = lines[i]!.split(',').map((value) => value.trim())
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = columns[index] ?? ''
    })
    if (record.shipTypeId) rows.push(record as unknown as ShipTypeRow)
  }
  return rows
}

function toInteger(row: ShipTypeRow, field: keyof ShipTypeRow): number {
  const value = Number(row[field])
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`[ship] invalid ship type config: ${row.shipTypeId}.${String(field)}`)
  }
  return value
}

function toShipType(row: ShipTypeRow): ShipTypeConfig {
  return {
    shipTypeId: row.shipTypeId,
    name: row.name || row.shipTypeId,
    cabinSlots: toInteger(row, 'cabinSlots'),
    deckSlots: toInteger(row, 'deckSlots'),
    cargoCapacity: toInteger(row, 'cargoCapacity'),
    diceBonus: toInteger(row, 'diceBonus'),
    isDefault: row.isDefault === 'true',
    description: row.description,
    phase: row.phase,
  }
}

const SHIP_TYPES = parseRows(shipTypeCsv).map(toShipType)
const shipTypeMap = new Map(SHIP_TYPES.map((shipType) => [shipType.shipTypeId, shipType]))
const DEFAULT_SHIP_TYPE = SHIP_TYPES.find((shipType) => shipType.isDefault) ?? SHIP_TYPES[0]

export function listShipTypes(): ShipTypeConfig[] {
  return [...SHIP_TYPES]
}

export function getShipType(shipTypeId: string): ShipTypeConfig | undefined {
  return shipTypeMap.get(shipTypeId)
}

export function getDefaultShipType(): ShipTypeConfig {
  if (!DEFAULT_SHIP_TYPE) {
    throw new Error('[ship] default ship type is not configured')
  }
  return DEFAULT_SHIP_TYPE
}
