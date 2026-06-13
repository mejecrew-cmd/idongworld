/**
 * packages/backend/src/modules/zone/service.ts
 * ------------------------------------------------------------
 * 역할: zone 계열 콘텐츠 모듈의 공통 domain action과 상태 갱신을 담당한다.
 * 연결: zone-garden/oasis/memory/mine의 localResources, clearedCount, host reward를 backend 권위 API로 갱신한다.
 * 주의: zone document는 이 서비스에서만 수정하고, host 보상은 host repository를 통해서만 갱신한다.
 */
import { getHostStateRepository, getUserRepository } from '../../repositories/index.js'
import type { HostStateDoc } from '../../models/HostStateModel.js'
import { asNumber, requireModuleRepo, ServiceError, type LooseState } from '../shared.js'
import { getZoneBalanceRule, ZONE_MODULE_IDS } from './balance.js'
import { assertAidongRecruited, grantAidongCodexItem } from '../my-aidong/service.js'
import { listAidongCodexCatalogItems, type AidongCodexCatalogItem } from '../my-aidong/codexCatalog.js'

interface HostReward {
  kind: 'resource' | 'inventory'
  id: string
  amount: number
}

interface ZoneClearActionResult {
  state: LooseState
  host: HostStateDoc
  rewards: HostReward[]
  replayed?: boolean
}

interface ZoneProductionSlot {
  characterId: string
  assignedAt: number
  status: 'assigned'
}

interface AidongCodexProductionReward {
  kind: 'aidong-codex-item'
  characterId: string
  itemId: string
  amount: number
  sourceType: 'zone-production'
  sourceId: string
  slotNo: number
}

const ZONE_MODULE_ID_SET = new Set(ZONE_MODULE_IDS)
const MAX_COLLECT_AMOUNT = 1000
const MAX_MEMORY_MOVES = 200
const MAX_MINE_ORE_FOUND = 6
const MAX_IDEMPOTENCY_KEY_LENGTH = 160

export function assertZoneModuleId(moduleId: string): void {
  if (!ZONE_MODULE_ID_SET.has(moduleId)) {
    throw new ServiceError('invalid_zone_module', 404)
  }
}

function getZoneRule(moduleId: string) {
  assertZoneModuleId(moduleId)
  return getZoneBalanceRule(moduleId)!
}

function toCanonicalZoneModuleId(zoneId: string): string {
  return zoneId.startsWith('zone-') ? zoneId : `zone-${zoneId}`
}

function toShortZoneId(moduleId: string): string {
  return moduleId.startsWith('zone-') ? moduleId.slice('zone-'.length) : moduleId
}

function getArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function isExplicitlyUnlocked(moduleId: string, islandState: LooseState): boolean {
  const unlockedZones = getArray(islandState.unlockedZones)
  return unlockedZones.includes(moduleId) || unlockedZones.includes(toShortZoneId(moduleId))
}

async function isUnlockConditionMet(uid: string, condition: string): Promise<boolean> {
  if (condition === 'always') return true

  if (condition === 'tutorial_complete') {
    const user = await getUserRepository().getUser(uid)
    return user?.onboardingComplete === true
  }

  if (condition.startsWith('prev_zone_clear:')) {
    const zoneId = condition.slice('prev_zone_clear:'.length)
    const prevModuleId = toCanonicalZoneModuleId(zoneId)
    const prevRepo = requireModuleRepo(prevModuleId)
    const prevState = await prevRepo.getOrCreate(uid) as LooseState
    return Math.max(0, Math.floor(asNumber(prevState.clearedCount, 0))) > 0
  }

  if (condition.startsWith('recruited_count_ge:')) {
    const required = asNumber(condition.slice('recruited_count_ge:'.length), Number.NaN)
    if (!Number.isInteger(required) || required < 0) return false
    const aidongState = await requireModuleRepo('my-aidong').getOrCreate(uid) as LooseState
    return getArray(aidongState.recruitedAidongs).length >= required
  }

  return false
}

async function assertZoneUnlocked(uid: string, moduleId: string): Promise<void> {
  const rule = getZoneRule(moduleId)
  if (!rule.active) throw new ServiceError('zone_inactive', 403)

  const islandState = await requireModuleRepo('my-island').getOrCreate(uid) as LooseState
  if (isExplicitlyUnlocked(moduleId, islandState)) return
  if (await isUnlockConditionMet(uid, rule.unlockCondition)) return

  throw new ServiceError('zone_locked', 403)
}

function assertAllowedResource(moduleId: string, resource: string): void {
  const rule = getZoneRule(moduleId)
  if (!rule.resources.includes(resource)) {
    throw new ServiceError('unsupported_zone_resource', 400)
  }
}

function assertAllowedClearId(moduleId: string, clearId: string | undefined): void {
  if (!clearId) throw new ServiceError('invalid_clear_id', 400)
  const rule = getZoneRule(moduleId)
  if (!rule.clearIds.includes(clearId)) {
    throw new ServiceError('unsupported_clear_id', 400)
  }
}

function getLocalResources(state: LooseState): Record<string, number> {
  const value = state.localResources
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const resources: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const amount = asNumber(raw, 0)
    if (amount > 0) resources[key] = amount
  }
  return resources
}

function getResultObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function assertValidIdempotencyKey(idempotencyKey: string | undefined): void {
  if (idempotencyKey === undefined) return
  if (!idempotencyKey || idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new ServiceError('invalid_idempotency_key', 400)
  }
}

function getProcessedClearKeys(progress: Record<string, unknown>): Record<string, unknown> {
  const value = progress.processedClearKeys
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function getProgress(state: LooseState): Record<string, unknown> {
  return state.progress && typeof state.progress === 'object' && !Array.isArray(state.progress)
    ? state.progress as Record<string, unknown>
    : {}
}

function getProductionState(progress: Record<string, unknown>): Record<string, ZoneProductionSlot> {
  const value = progress.production
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, ZoneProductionSlot>
    : {}
}

function findZoneProductionCodexItem(moduleId: string, characterId: string): AidongCodexCatalogItem | undefined {
  return listAidongCodexCatalogItems().find((item) => (
    item.characterId === characterId &&
    item.sourceType === 'zone-production' &&
    item.sourceId === moduleId
  ))
}
function getProductionClaims(progress: Record<string, unknown>): Record<string, unknown> {
  const value = progress.productionClaims
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function getRequiredInteger(
  result: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
): number {
  const value = asNumber(result[key], Number.NaN)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ServiceError('invalid_clear_result', 400)
  }
  return value
}

function getZoneClearRewards(moduleId: string, clearId: string, resultInput: unknown): HostReward[] {
  const result = getResultObject(resultInput)

  if (moduleId === 'zone-garden' && clearId === 'garden-harvest') {
    const { rewards } = getZoneRule(moduleId)
    return [
      { kind: 'inventory', id: 'basic_food', amount: rewards.gardenFood },
      { kind: 'resource', id: 'coins', amount: rewards.gardenCoins },
    ]
  }

  if (moduleId === 'zone-oasis' && clearId === 'oasis-rest') {
    const { rewards } = getZoneRule(moduleId)
    return [
      { kind: 'resource', id: 'coins', amount: rewards.oasisCoins },
    ]
  }

  if (moduleId === 'zone-memory' && clearId === 'memory-match') {
    const { rewards } = getZoneRule(moduleId)
    const moves = getRequiredInteger(result, 'moves', 0, MAX_MEMORY_MOVES)
    return [
      { kind: 'resource', id: 'coins', amount: Math.max(rewards.memoryCoinsMin, rewards.memoryCoinsBase - moves * rewards.memoryCoinsPerMovePenalty) },
    ]
  }

  if (moduleId === 'zone-mine' && clearId === 'mine-dig') {
    const { rewards } = getZoneRule(moduleId)
    const oreFound = getRequiredInteger(result, 'oreFound', 0, MAX_MINE_ORE_FOUND)
    return [
      { kind: 'resource', id: 'coins', amount: oreFound * rewards.mineCoinsPerOreFound },
    ]
  }

  return []
}

async function applyHostRewards(uid: string, rewards: HostReward[]): Promise<HostStateDoc> {
  const hostRepo = getHostStateRepository()
  let host = await hostRepo.getOrCreate(uid)

  for (const reward of rewards) {
    if (reward.amount <= 0) continue
    if (reward.kind === 'inventory') {
      host = await hostRepo.mutateInventory(uid, reward.id, reward.amount)
    } else if (reward.id === 'coins' || reward.id === 'gems' || reward.id === 'diamonds' || reward.id === 'diceCount') {
      host = await hostRepo.mutateResource(uid, reward.id, reward.amount)
    } else {
      throw new ServiceError('unsupported_host_reward', 500)
    }
  }

  return host
}

export async function collectZoneResource(
  uid: string,
  moduleId: string,
  resource: string,
  amount: number,
) {
  assertZoneModuleId(moduleId)
  await assertZoneUnlocked(uid, moduleId)
  if (!resource) throw new ServiceError('invalid_resource')
  assertAllowedResource(moduleId, resource)
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_COLLECT_AMOUNT) {
    throw new ServiceError('invalid_amount')
  }

  const repo = requireModuleRepo(moduleId)
  const state = await repo.getOrCreate(uid) as LooseState
  const localResources = getLocalResources(state)

  return await repo.patch(uid, {
    localResources: {
      ...localResources,
      [resource]: (localResources[resource] ?? 0) + amount,
    },
  })
}

export async function clearZone(
  uid: string,
  moduleId: string,
  clearId?: string,
  result?: unknown,
  idempotencyKey?: string,
): Promise<ZoneClearActionResult> {
  assertZoneModuleId(moduleId)
  assertAllowedClearId(moduleId, clearId)
  assertValidIdempotencyKey(idempotencyKey)
  await assertZoneUnlocked(uid, moduleId)

  const repo = requireModuleRepo(moduleId)
  const state = await repo.getOrCreate(uid) as LooseState
  const clearedCount = Math.max(0, Math.floor(asNumber(state.clearedCount, 0)))
  const progress = state.progress && typeof state.progress === 'object' && !Array.isArray(state.progress)
    ? state.progress as Record<string, unknown>
    : {}
  const processedClearKeys = getProcessedClearKeys(progress)
  if (idempotencyKey && processedClearKeys[idempotencyKey]) {
    return {
      state,
      host: await getHostStateRepository().getOrCreate(uid),
      rewards: [],
      replayed: true,
    }
  }

  const clearCounts = progress.clearCounts && typeof progress.clearCounts === 'object' && !Array.isArray(progress.clearCounts)
    ? progress.clearCounts as Record<string, unknown>
    : {}
  const currentClearIdCount = Math.max(0, Math.floor(asNumber(clearCounts[clearId!], 0)))

  const nextState = await repo.patch(uid, {
    clearedCount: clearedCount + 1,
    progress: {
      ...progress,
      lastClearId: clearId,
      lastClearedAt: Date.now(),
      clearCounts: {
        ...clearCounts,
        [clearId!]: currentClearIdCount + 1,
      },
      processedClearKeys: idempotencyKey
        ? {
            ...processedClearKeys,
            [idempotencyKey]: {
              clearId,
              processedAt: Date.now(),
            },
          }
        : processedClearKeys,
    },
  }) as LooseState
  const rewards = getZoneClearRewards(moduleId, clearId!, result)
  const host = await applyHostRewards(uid, rewards)

  return {
    state: nextState,
    host,
    rewards,
  }
}

// 구역 생산 배치 shell:
// 실제 생산량, 효율, 보상 item은 기획 확정 전까지 계산하지 않는다.
// 지금은 zone document의 progress.production에 어떤 Aidong이 어떤 slot에 배치됐는지만 남긴다.
export async function assignZoneProduction(
  uid: string,
  moduleId: string,
  characterId: string,
  slotId = 'default',
) {
  assertZoneModuleId(moduleId)
  await assertZoneUnlocked(uid, moduleId)
  await assertAidongRecruited(uid, characterId)
  if (!slotId) throw new ServiceError('invalid_slot_id', 400)

  const repo = requireModuleRepo(moduleId)
  const state = await repo.getOrCreate(uid) as LooseState
  const progress = getProgress(state)
  const production = getProductionState(progress)

  const alreadyAssigned = Object.values(production).some((slot) => slot.characterId === characterId)
  if (alreadyAssigned && production[slotId]?.characterId !== characterId) {
    throw new ServiceError('aidong_already_assigned_to_zone', 409)
  }

  return await repo.patch(uid, {
    progress: {
      ...progress,
      production: {
        ...production,
        [slotId]: {
          characterId,
          assignedAt: production[slotId]?.assignedAt ?? Date.now(),
          status: 'assigned',
        },
      },
      productionUpdatedAt: Date.now(),
    },
  })
}

export async function unassignZoneProduction(
  uid: string,
  moduleId: string,
  slotId = 'default',
) {
  assertZoneModuleId(moduleId)
  await assertZoneUnlocked(uid, moduleId)
  if (!slotId) throw new ServiceError('invalid_slot_id', 400)

  const repo = requireModuleRepo(moduleId)
  const state = await repo.getOrCreate(uid) as LooseState
  const progress = getProgress(state)
  const production = getProductionState(progress)

  if (!production[slotId]) {
    throw new ServiceError('production_slot_empty', 404)
  }

  const nextProduction = { ...production }
  delete nextProduction[slotId]

  return await repo.patch(uid, {
    progress: {
      ...progress,
      production: nextProduction,
      productionUpdatedAt: Date.now(),
    },
  })
}

// 구역 생산 회수 shell:
// M4에서는 elapsed time/efficiency/cap 계산 전 단계로, catalog에 연결된 Aidong 도감템 1개를 지급한다.
// 일반 생산량과 수치 밸런스는 후속 balance/config 단계에서 확장한다.
export async function claimZoneProduction(
  uid: string,
  moduleId: string,
  slotId = 'default',
  idempotencyKey?: string,
) {
  assertZoneModuleId(moduleId)
  await assertZoneUnlocked(uid, moduleId)
  if (!slotId) throw new ServiceError('invalid_slot_id', 400)

  const repo = requireModuleRepo(moduleId)
  const state = await repo.getOrCreate(uid) as LooseState
  const progress = getProgress(state)
  const production = getProductionState(progress)
  const slot = production[slotId]

  if (!slot) {
    throw new ServiceError('production_slot_empty', 404)
  }

  const productionClaims = getProductionClaims(progress)
  if (idempotencyKey && productionClaims[idempotencyKey]) {
    return {
      state,
      rewards: [],
      replayed: true,
    }
  }

  const catalogItem = findZoneProductionCodexItem(moduleId, slot.characterId)
  const rewards: AidongCodexProductionReward[] = catalogItem
    ? [{
        kind: 'aidong-codex-item',
        characterId: slot.characterId,
        itemId: catalogItem.itemId,
        amount: 1,
        sourceType: 'zone-production',
        sourceId: moduleId,
        slotNo: catalogItem.slotNo,
      }]
    : []

  let codexState: LooseState | undefined
  if (catalogItem) {
    codexState = await grantAidongCodexItem(uid, slot.characterId, catalogItem.itemId, 1, `zone-production:${moduleId}`) as LooseState
  }

  const claimRecord = {
    slotId,
    characterId: slot.characterId,
    claimedAt: Date.now(),
    status: 'placeholder',
    rewards,
  }

  const nextState = await repo.patch(uid, {
    progress: {
      ...progress,
      production,
      productionClaims: idempotencyKey
        ? {
            ...productionClaims,
            [idempotencyKey]: claimRecord,
          }
        : productionClaims,
      lastProductionClaim: claimRecord,
    },
  })

  return {
    state: nextState,
    rewards,
    aidongState: codexState,
  }
}
