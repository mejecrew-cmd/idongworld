/**
 * packages/backend/src/modules/ship/balance.ts
 * ------------------------------------------------------------
 * 역할: packages/modules/ship/balance.csv의 ship type config를 backend service가 검증 가능한 형태로 읽는다.
 * 연결: ship service와 customs adapter가 배 종류 변경, slot 검증, cargo capacity 검증에 이 loader를 사용한다.
 * 주의: CSV schema를 바꾸면 shipTypeId 저장 방식과 cargo capacity 계산도 함께 확인한다.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const shipBalancePath = path.resolve(__dirname, '../../../../modules/ship/balance.csv')

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

function configError(shipTypeId: string, field: string, reason: string): Error {
  return new Error(`Invalid ship type config: ${shipTypeId}.${field} ${reason}`)
}

function toNonNegativeInteger(row: ShipTypeRow, field: keyof ShipTypeRow): number {
  const value = Number(row[field])
  if (!Number.isInteger(value) || value < 0) {
    throw configError(row.shipTypeId, String(field), 'must be a non-negative integer')
  }
  return value
}

function toPositiveInteger(row: ShipTypeRow, field: keyof ShipTypeRow): number {
  const value = Number(row[field])
  if (!Number.isInteger(value) || value <= 0) {
    throw configError(row.shipTypeId, String(field), 'must be a positive integer')
  }
  return value
}

function toShipType(row: ShipTypeRow): ShipTypeConfig {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.shipTypeId)) {
    throw configError(row.shipTypeId || '<empty>', 'shipTypeId', 'must be kebab-case')
  }

  return {
    shipTypeId: row.shipTypeId,
    name: row.name || row.shipTypeId,
    cabinSlots: toPositiveInteger(row, 'cabinSlots'),
    deckSlots: toPositiveInteger(row, 'deckSlots'),
    cargoCapacity: toPositiveInteger(row, 'cargoCapacity'),
    diceBonus: toNonNegativeInteger(row, 'diceBonus'),
    isDefault: row.isDefault === 'true',
    description: row.description,
    phase: row.phase,
  }
}

function loadShipTypes(): ShipTypeConfig[] {
  if (!fs.existsSync(shipBalancePath)) {
    throw new Error(`[ship] balance.csv not found: ${shipBalancePath}`)
  }

  const shipTypes = parseRows(fs.readFileSync(shipBalancePath, 'utf8')).map(toShipType)
  if (shipTypes.length === 0) throw new Error('[ship] at least one ship type is required')

  const ids = new Set<string>()
  for (const shipType of shipTypes) {
    if (ids.has(shipType.shipTypeId)) {
      throw new Error(`[ship] duplicate shipTypeId: ${shipType.shipTypeId}`)
    }
    ids.add(shipType.shipTypeId)
  }

  const defaults = shipTypes.filter((shipType) => shipType.isDefault)
  if (defaults.length !== 1) {
    throw new Error(`[ship] exactly one default ship type is required, found ${defaults.length}`)
  }

  return shipTypes
}

const SHIP_TYPES = loadShipTypes()
const shipTypeMap = new Map(SHIP_TYPES.map((shipType) => [shipType.shipTypeId, shipType]))
const DEFAULT_SHIP_TYPE = SHIP_TYPES.find((shipType) => shipType.isDefault)!

export function listShipTypeConfigs(): ShipTypeConfig[] {
  return [...SHIP_TYPES]
}

export function getShipTypeConfig(shipTypeId: string): ShipTypeConfig | undefined {
  return shipTypeMap.get(shipTypeId)
}

export function requireShipTypeConfig(shipTypeId: string): ShipTypeConfig {
  const config = getShipTypeConfig(shipTypeId)
  if (!config) throw new Error('invalid_ship_type')
  return config
}

export function getDefaultShipTypeConfig(): ShipTypeConfig {
  return DEFAULT_SHIP_TYPE
}
