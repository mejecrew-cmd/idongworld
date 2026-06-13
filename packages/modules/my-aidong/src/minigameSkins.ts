/// <reference path="./csv.d.ts" />
/**
 * my-aidong/src/minigameSkins.ts
 * ------------------------------------------------------------
 * 역할: my-aidong/minigame-skins.csv를 Aidong별 미니게임 skin catalog로 변환한다.
 * 연결: M4 이후 공통 미니게임 engine과 Aidong별 배경/보상/asset 후보를 같은 static catalog로 참조한다.
 * 주의: 이 파일은 static catalog만 제공한다. 실제 result validation, 입장재 소비, 보상 지급은 backend service가 담당한다.
 */
import minigameSkinsCsv from '../minigame-skins.csv?raw'
import type { AidongMinigameEngineId, AidongMinigameSkin } from './types.ts'

const ENGINE_IDS = new Set<AidongMinigameEngineId>(['garden-grow', 'idle-rest', 'memory-match', 'mine-dig'])

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
  if (!value) throw new Error(`[my-aidong] minigame skin row missing ${key}`)
  return value
}

function optionalText(row: Record<string, string>, key: string): string {
  return row[key]?.trim() ?? ''
}

function parseEngineId(row: Record<string, string>): AidongMinigameEngineId {
  const engineId = requireText(row, 'engineId') as AidongMinigameEngineId
  if (!ENGINE_IDS.has(engineId)) throw new Error(`[my-aidong] unsupported minigame engineId: ${engineId}`)
  return engineId
}

function parseRewardAmount(row: Record<string, string>): number {
  const amount = Number(requireText(row, 'rewardAmount'))
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error('[my-aidong] minigame rewardAmount must be a non-negative integer')
  }
  return amount
}

function parseMinigameSkins(csvText: string): AidongMinigameSkin[] {
  const skins = parseCsvRows(csvText).map((row) => ({
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
    if (skinIds.has(skin.skinId)) throw new Error(`[my-aidong] duplicated minigame skinId: ${skin.skinId}`)
    skinIds.add(skin.skinId)

    const pairKey = `${skin.characterId}:${skin.engineId}`
    if (characterEnginePairs.has(pairKey)) {
      throw new Error(`[my-aidong] duplicated minigame skin for character/engine: ${pairKey}`)
    }
    characterEnginePairs.add(pairKey)
  }

  return skins
}

export const aidongMinigameSkins = parseMinigameSkins(minigameSkinsCsv)

export function getAidongMinigameSkins(characterId: string): AidongMinigameSkin[] {
  return aidongMinigameSkins
    .filter((skin) => skin.characterId === characterId)
    .sort((a, b) => a.skinId.localeCompare(b.skinId))
}

export function getAidongMinigameSkin(skinId: string): AidongMinigameSkin | undefined {
  return aidongMinigameSkins.find((skin) => skin.skinId === skinId)
}

export function getAidongMinigameSkinByEngine(
  characterId: string,
  engineId: AidongMinigameEngineId,
): AidongMinigameSkin | undefined {
  return aidongMinigameSkins.find((skin) => skin.characterId === characterId && skin.engineId === engineId)
}