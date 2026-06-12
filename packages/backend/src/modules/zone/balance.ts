/**
 * packages/backend/src/modules/zone/balance.ts
 * ------------------------------------------------------------
 * 역할: packages/modules/zone-{moduleId}/balance.csv를 backend zone action service가 읽을 수 있는 rule로 변환한다.
 * 연결: zone service는 이 파일에서 allowlist, unlock condition, reward 숫자를 가져오고 검증 로직은 service에 유지한다.
 * 주의: CSV는 밸런스 값의 출처이고, action 가능 여부, payload 검증, idempotency는 backend service 책임이다.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export interface ZoneBalanceRule {
  resources: readonly string[]
  clearIds: readonly string[]
  unlockCondition: string
  active: boolean
  rewards: {
    gardenFood: number
    gardenCoins: number
    oasisCoins: number
    memoryCoinsBase: number
    memoryCoinsMin: number
    memoryCoinsPerMovePenalty: number
    mineCoinsPerOreFound: number
  }
}

interface BalanceRow {
  paramId: string
  value: string
  type?: string
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const modulesRoot = path.resolve(__dirname, '../../../../modules')

const DEFAULT_RULES = {
  'zone-garden': {
    resources: ['acorn', 'flower'],
    clearIds: ['garden-harvest'],
    unlockCondition: 'always',
    active: true,
    rewards: {
      gardenFood: 2,
      gardenCoins: 15,
      oasisCoins: 10,
      memoryCoinsBase: 60,
      memoryCoinsMin: 20,
      memoryCoinsPerMovePenalty: 3,
      mineCoinsPerOreFound: 10,
    },
  },
  'zone-oasis': {
    resources: ['rest_token'],
    clearIds: ['oasis-rest'],
    unlockCondition: 'prev_zone_clear:garden',
    active: true,
    rewards: {
      gardenFood: 2,
      gardenCoins: 15,
      oasisCoins: 10,
      memoryCoinsBase: 60,
      memoryCoinsMin: 20,
      memoryCoinsPerMovePenalty: 3,
      mineCoinsPerOreFound: 10,
    },
  },
  'zone-memory': {
    resources: ['memory_piece'],
    clearIds: ['memory-match'],
    unlockCondition: 'tutorial_complete',
    active: true,
    rewards: {
      gardenFood: 2,
      gardenCoins: 15,
      oasisCoins: 10,
      memoryCoinsBase: 60,
      memoryCoinsMin: 20,
      memoryCoinsPerMovePenalty: 3,
      mineCoinsPerOreFound: 10,
    },
  },
  'zone-mine': {
    resources: ['ore'],
    clearIds: ['mine-dig'],
    unlockCondition: 'recruited_count_ge:3',
    active: true,
    rewards: {
      gardenFood: 2,
      gardenCoins: 15,
      oasisCoins: 10,
      memoryCoinsBase: 60,
      memoryCoinsMin: 20,
      memoryCoinsPerMovePenalty: 3,
      mineCoinsPerOreFound: 10,
    },
  },
} satisfies Record<string, ZoneBalanceRule>

export const ZONE_MODULE_IDS = Object.keys(DEFAULT_RULES)

function parseRows(csvText: string): BalanceRow[] {
  const lines = csvText.split(/\r?\n/)
  const headerIndex = lines.findIndex((line) => {
    const trimmed = line.trim()
    return Boolean(trimmed) && !trimmed.startsWith('#')
  })
  if (headerIndex < 0) return []

  const headers = lines[headerIndex]!.split(',').map((value) => value.trim())
  const rows: BalanceRow[] = []
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i]!.trim()
    if (!line || line.startsWith('#')) continue
    const columns = lines[i]!.split(',').map((value) => value.trim())
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = columns[index] ?? ''
    })
    if (record.paramId) rows.push(record as unknown as BalanceRow)
  }
  return rows
}

function readModuleBalance(moduleId: string): Map<string, string> {
  const filePath = path.join(modulesRoot, moduleId, 'balance.csv')
  if (!fs.existsSync(filePath)) return new Map()
  const rows = parseRows(fs.readFileSync(filePath, 'utf8'))
  return new Map(rows.map((row) => [row.paramId, row.value]))
}

function configError(moduleId: string, paramId: string, reason: string): Error {
  return new Error(`Invalid zone balance config: ${moduleId}.${paramId} ${reason}`)
}

function splitList(
  moduleId: string,
  paramId: string,
  value: string | undefined,
  fallback: readonly string[],
): string[] {
  if (!value) return [...fallback]
  const list = value.split(';').map((part) => part.trim()).filter(Boolean)
  if (list.length === 0) throw configError(moduleId, paramId, 'must not be empty')
  return list
}

function numberValue(moduleId: string, paramId: string, value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw configError(moduleId, paramId, 'must be a finite number')
  return parsed
}

function booleanValue(moduleId: string, paramId: string, value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  if (value === 'true') return true
  if (value === 'false') return false
  throw configError(moduleId, paramId, 'must be true or false')
}

function stringValue(moduleId: string, paramId: string, value: string | undefined, fallback: string): string {
  if (value === undefined) return fallback
  const trimmed = value.trim()
  if (!trimmed) throw configError(moduleId, paramId, 'must not be empty')
  return trimmed
}

function loadZoneRule(moduleId: keyof typeof DEFAULT_RULES): ZoneBalanceRule {
  const fallback = DEFAULT_RULES[moduleId]
  const values = readModuleBalance(moduleId)
  return {
    resources: splitList(moduleId, 'zone_collect_resources', values.get('zone_collect_resources'), fallback.resources),
    clearIds: splitList(moduleId, 'zone_clear_ids', values.get('zone_clear_ids'), fallback.clearIds),
    unlockCondition: stringValue(moduleId, 'zone_unlock_condition', values.get('zone_unlock_condition'), fallback.unlockCondition),
    active: booleanValue(moduleId, 'zone_active', values.get('zone_active'), fallback.active),
    rewards: {
      gardenFood: numberValue(moduleId, 'garden_reward_food', values.get('garden_reward_food'), fallback.rewards.gardenFood),
      gardenCoins: numberValue(moduleId, 'garden_reward_coins', values.get('garden_reward_coins'), fallback.rewards.gardenCoins),
      oasisCoins: numberValue(moduleId, 'minigame_reward_coins', values.get('minigame_reward_coins'), fallback.rewards.oasisCoins),
      memoryCoinsBase: numberValue(
        moduleId,
        'memory_reward_coins_base',
        values.get('memory_reward_coins_base'),
        fallback.rewards.memoryCoinsBase,
      ),
      memoryCoinsMin: numberValue(
        moduleId,
        'memory_reward_coins_min',
        values.get('memory_reward_coins_min'),
        fallback.rewards.memoryCoinsMin,
      ),
      memoryCoinsPerMovePenalty: numberValue(
        moduleId,
        'memory_reward_coins_per_move_penalty',
        values.get('memory_reward_coins_per_move_penalty'),
        fallback.rewards.memoryCoinsPerMovePenalty,
      ),
      mineCoinsPerOreFound: numberValue(
        moduleId,
        'mine_reward_coins_per_ore_found',
        values.get('mine_reward_coins_per_ore_found'),
        fallback.rewards.mineCoinsPerOreFound,
      ),
    },
  }
}

const ZONE_BALANCE_RULES = Object.fromEntries(
  ZONE_MODULE_IDS.map((moduleId) => [moduleId, loadZoneRule(moduleId as keyof typeof DEFAULT_RULES)]),
) as Record<string, ZoneBalanceRule>

export function listZoneBalanceRules(): Record<string, ZoneBalanceRule> {
  return ZONE_BALANCE_RULES
}

export function getZoneBalanceRule(moduleId: string): ZoneBalanceRule | undefined {
  return ZONE_BALANCE_RULES[moduleId]
}

