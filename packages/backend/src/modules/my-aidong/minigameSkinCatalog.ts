/**
 * packages/backend/src/modules/my-aidong/minigameSkinCatalog.ts
 * ------------------------------------------------------------
 * 역할: packages/modules/my-aidong/minigame-skins.csv를 backend 권위 검증용 catalog로 읽는다.
 * 연결: 이후 Aidong별 미니게임 start/complete action이 engine, skin, reward 후보를 검증할 때 사용한다.
 * 주의: 이 파일은 static catalog만 다룬다. result payload 검증, 입장재 소비, 보상 지급은 action service에서 처리한다.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export type AidongMinigameEngineId = 'garden-grow' | 'idle-rest' | 'memory-match' | 'mine-dig'

export interface AidongMinigameSkinCatalogItem {
  characterId: string
  skinId: string
  engineId: AidongMinigameEngineId
  entryItemId: string
  rewardItemId: string
  rewardAmount: number
  backgroundAssetId: string
  objectAssetId: string
  zoneModuleId: string
  phase: string
  description: string
}

const ENGINE_IDS = new Set<AidongMinigameEngineId>(['garden-grow', 'idle-rest', 'memory-match', 'mine-dig'])

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const catalogPath = path.resolve(__dirname, '../../../../modules/my-aidong/minigame-skins.csv')

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
  if (!value) throw new Error(`Invalid my-aidong minigame skin catalog: missing ${key}`)
  return value
}

function optionalText(row: Record<string, string>, key: string): string {
  return row[key]?.trim() ?? ''
}

function parseEngineId(row: Record<string, string>): AidongMinigameEngineId {
  const engineId = requireText(row, 'engineId') as AidongMinigameEngineId
  if (!ENGINE_IDS.has(engineId)) {
    throw new Error(`Invalid my-aidong minigame skin catalog: unsupported engineId ${engineId}`)
  }
  return engineId
}

function parseRewardAmount(row: Record<string, string>): number {
  const amount = Number(requireText(row, 'rewardAmount'))
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error('Invalid my-aidong minigame skin catalog: rewardAmount must be a non-negative integer')
  }
  return amount
}

function loadCatalog(): AidongMinigameSkinCatalogItem[] {
  if (!fs.existsSync(catalogPath)) return []
  const rows = parseCsvRows(fs.readFileSync(catalogPath, 'utf8'))
  const skins = rows.map((row) => ({
    characterId: requireText(row, 'characterId'),
    skinId: requireText(row, 'skinId'),
    engineId: parseEngineId(row),
    entryItemId: optionalText(row, 'entryItemId'),
    rewardItemId: requireText(row, 'rewardItemId'),
    rewardAmount: parseRewardAmount(row),
    backgroundAssetId: requireText(row, 'backgroundAssetId'),
    objectAssetId: requireText(row, 'objectAssetId'),
    zoneModuleId: requireText(row, 'zoneModuleId'),
    phase: requireText(row, 'phase'),
    description: optionalText(row, 'description'),
  }))

  const skinIds = new Set<string>()
  const characterEnginePairs = new Set<string>()
  for (const skin of skins) {
    if (skinIds.has(skin.skinId)) {
      throw new Error(`Invalid my-aidong minigame skin catalog: duplicated skinId ${skin.skinId}`)
    }
    skinIds.add(skin.skinId)

    const pairKey = `${skin.characterId}:${skin.engineId}`
    if (characterEnginePairs.has(pairKey)) {
      throw new Error(`Invalid my-aidong minigame skin catalog: duplicated character/engine ${pairKey}`)
    }
    characterEnginePairs.add(pairKey)
  }

  return skins
}

const CATALOG = loadCatalog()

export function listAidongMinigameSkinCatalogItems(): AidongMinigameSkinCatalogItem[] {
  return CATALOG
}

export function getAidongMinigameSkinCatalogItems(characterId: string): AidongMinigameSkinCatalogItem[] {
  return CATALOG
    .filter((skin) => skin.characterId === characterId)
    .sort((a, b) => a.skinId.localeCompare(b.skinId))
}

export function getAidongMinigameSkinCatalogItem(skinId: string): AidongMinigameSkinCatalogItem | undefined {
  return CATALOG.find((skin) => skin.skinId === skinId)
}

export function getAidongMinigameSkinCatalogItemByEngine(
  characterId: string,
  engineId: AidongMinigameEngineId,
): AidongMinigameSkinCatalogItem | undefined {
  return CATALOG.find((skin) => skin.characterId === characterId && skin.engineId === engineId)
}