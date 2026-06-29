/**
 * packages/backend/src/modules/my-aidong/service.ts
 * ------------------------------------------------------------
 * 역할: 모듈별 domain rule과 상태 전이를 담당하는 service 계층이다.
 * 연결: userStore action으로 처리하던 로직을 backend 권위 로직으로 옮기는 위치다.
 * 주의: 자기 module document만 직접 수정하고, 다른 module/host 자원 이동은 adapter 또는 customs를 통한다.
 */
import {
  getHostStateRepository,
  getMydongCosmeticRepository,
  getMydongPediaInventoryRepository,
  getMydongRepository,
} from '../../repositories/index.js'
import { groupLoadoutsByAidongId } from '../../repositories/mydongCosmeticRepository.js'
import { groupPediaInventoryByAidongId } from '../../repositories/mydongPediaInventoryRepository.js'
import { requireModuleRepo, ServiceError, type LooseState } from '../shared.js'
import { isAidongEquippableItem } from './itemCatalog.js'
import { buildAidongCodexProgress, getAidongCodexItem } from './codexCatalog.js'

// 초기 욕구값: userStore.ts의 recruitAidong()이 새 Aidong을 영입할 때 만들던 needs 기본값이다.
// backend action API에서는 이 값을 myAidongStates.needs[characterId]에 저장한다.
const INITIAL_NEEDS = {
  hunger: 8,
  energy: 8,
  social: 7,
  hygiene: 8,
  fun: 7,
  health: 9,
}

type NeedKey = keyof typeof INITIAL_NEEDS

const LODGE_CARE_ACTIONS: Record<string, {
  label: string
  needsRecover: Partial<Record<NeedKey, number>>
  affinity: number
  coinCost: number
  dailyCap?: number
}> = {
  wake: { label: '깨우기', needsRecover: { energy: 3 }, affinity: 1, coinCost: 10, dailyCap: 1 },
  breakfast: { label: '아침밥', needsRecover: { hunger: 5, social: 1 }, affinity: 1, coinCost: 20, dailyCap: 1 },
  lunch: { label: '점심밥', needsRecover: { hunger: 5, fun: 1 }, affinity: 1, coinCost: 20, dailyCap: 1 },
  dinner: { label: '저녁밥', needsRecover: { hunger: 5, social: 1 }, affinity: 1, coinCost: 20, dailyCap: 1 },
  sleep: { label: '재우기', needsRecover: { energy: 5, health: 1 }, affinity: 1, coinCost: 0, dailyCap: 1 },
}

function clampNeed(value: number): number {
  return Math.max(0, Math.min(10, value))
}

function getTodayKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10)
}

// 친밀도 레벨 계산:
// userStore.ts의 addAffinity()와 같은 역할이다. score를 받아 표시/해금에 쓰는 level로 변환한다.
// 지금은 POC 기준 계단식 레벨이며, 밸런스 테이블이 생기면 이 함수가 교체 지점이다.
function affinityLevel(score: number): number {
  if (score >= 100) return 5
  if (score >= 50) return 3
  if (score >= 25) return 2
  if (score >= 10) return 1
  return 0
}

// 영입 목록 추출:
// repository가 돌려준 loose state에서 recruitedAidongs만 안전하게 꺼낸다.
// 데이터가 없거나 배열이 아니면 빈 배열로 보아 action이 깨지지 않게 한다.
function getRecruited(state: LooseState): string[] {
  return Array.isArray(state.recruitedAidongs)
    ? state.recruitedAidongs as string[]
    : []
}

async function listOwnedAidongIds(uid: string, state?: LooseState): Promise<string[]> {
  const legacyRecruited = state ? getRecruited(state) : []
  const repo = getMydongRepository()
  if (legacyRecruited.length) {
    const seeded = await repo.seedFromAidongIds(uid, legacyRecruited, 'migration')
    return seeded.map((mydong) => mydong.aidongId)
  }
  const owned = await repo.list(uid)
  return owned.map((mydong) => mydong.aidongId)
}

async function isAidongRecruited(uid: string, state: LooseState, characterId: string): Promise<boolean> {
  return (await listOwnedAidongIds(uid, state)).includes(characterId)
}

function getEquippedItems(state: LooseState): Record<string, string[]> {
  return state.equippedItems && typeof state.equippedItems === 'object'
    ? state.equippedItems as Record<string, string[]>
    : {}
}

function countEquippedItem(equippedItems: Record<string, string[]>, itemId: string, exceptMydongUid?: string): number {
  return Object.entries(equippedItems).reduce((total, [mydongUid, itemIds]) => {
    if (mydongUid === exceptMydongUid) return total
    return total + (Array.isArray(itemIds) ? itemIds.filter((id) => id === itemId).length : 0)
  }, 0)
}

function getNestedNumberMap(state: LooseState, key: string): Record<string, Record<string, number>> {
  return state[key] && typeof state[key] === 'object' && !Array.isArray(state[key])
    ? state[key] as Record<string, Record<string, number>>
    : {}
}

async function resolveActiveMydong(uid: string, state: LooseState, characterId: string) {
  if (!await isAidongRecruited(uid, state, characterId)) {
    throw new ServiceError('aidong_not_recruited', 409)
  }
  const existing = await getMydongRepository().getActiveByAidongId(uid, characterId)
  return existing ?? await getMydongRepository().getOrCreateForAidong(uid, {
    aidongId: characterId,
    acquisitionSource: 'migration',
  })
}

async function seedPediaInventoryFromLegacyMap(uid: string, state: LooseState) {
  const repo = getMydongPediaInventoryRepository()
  const existing = await repo.list(uid)
  if (existing.length) return existing

  const legacyItems = getNestedNumberMap(state, 'aidongCodexItems')
  for (const [aidongId, items] of Object.entries(legacyItems)) {
    const mydong = await getMydongRepository().getOrCreateForAidong(uid, {
      aidongId,
      acquisitionSource: 'migration',
    })
    for (const [itemId, quantity] of Object.entries(items)) {
      if (!Number.isFinite(quantity) || quantity <= 0) continue
      const catalogItem = getAidongCodexItem(itemId)
      if (!catalogItem || catalogItem.characterId !== aidongId) continue
      await repo.grant(uid, {
        mydongUid: mydong.mydongUid,
        aidongId,
        pediaItemId: itemId,
        slotNo: catalogItem.slotNo,
        quantity,
        source: 'migration',
      })
    }
  }

  return await repo.list(uid)
}

export async function getAidongCodexItemMap(uid: string, state?: LooseState) {
  const repo = requireModuleRepo('my-aidong')
  const myAidongState = state ?? await repo.getOrCreate(uid) as LooseState
  const rows = await seedPediaInventoryFromLegacyMap(uid, myAidongState)
  return groupPediaInventoryByAidongId(rows)
}

async function seedCosmeticLoadoutsFromLegacyMaps(uid: string, state: LooseState) {
  const repo = getMydongCosmeticRepository()
  const existing = await repo.listLoadouts(uid)
  if (existing.length) return existing

  const legacyOutfits = state.equippedOutfit && typeof state.equippedOutfit === 'object'
    ? state.equippedOutfit as Record<string, string>
    : {}
  const legacyItems = getEquippedItems(state)
  const aidongIds = Array.from(new Set([...Object.keys(legacyOutfits), ...Object.keys(legacyItems)]))
  for (const aidongId of aidongIds) {
    const mydong = await getMydongRepository().getOrCreateForAidong(uid, {
      aidongId,
      acquisitionSource: 'migration',
    })
    if (legacyOutfits[aidongId]) {
      await repo.setOutfit(uid, mydong.mydongUid, aidongId, legacyOutfits[aidongId])
    }
    if (legacyItems[aidongId]?.length) {
      await repo.setEquippedItems(uid, mydong.mydongUid, aidongId, legacyItems[aidongId])
    }
  }
  return await repo.listLoadouts(uid)
}

async function getCosmeticLoadoutMaps(uid: string, state: LooseState) {
  const loadouts = await seedCosmeticLoadoutsFromLegacyMaps(uid, state)
  return groupLoadoutsByAidongId(loadouts)
}

export async function getAidongCosmeticLoadoutMaps(uid: string, state?: LooseState) {
  const repo = requireModuleRepo('my-aidong')
  const myAidongState = state ?? await repo.getOrCreate(uid) as LooseState
  return await getCosmeticLoadoutMaps(uid, myAidongState)
}

async function syncEquippableHostItemsToCosmeticInventory(uid: string, inventory: Record<string, number>) {
  const repo = getMydongCosmeticRepository()
  for (const [itemId, quantity] of Object.entries(inventory)) {
    if (!isAidongEquippableItem(itemId)) continue
    await repo.setInventoryQuantity(uid, itemId, quantity, 'host-inventory-mirror')
  }
  return await repo.listInventory(uid)
}

function getNestedLooseMap(state: LooseState, key: string): Record<string, Record<string, unknown>> {
  return state[key] && typeof state[key] === 'object' && !Array.isArray(state[key])
    ? state[key] as Record<string, Record<string, unknown>>
    : {}
}

function assertPositiveInteger(value: number, errorCode: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ServiceError(errorCode, 400)
  }
}

// 영입 여부 검증:
// 다른 module action, 예를 들어 ship harbor assign이 Aidong을 쓰기 전에 호출하는 방어선이다.
// frontend userStore에서는 배열 includes로 끝났지만, backend에서는 전용 my-aidong repository를 권위로 본다.
export async function assertAidongRecruited(uid: string, characterId: string): Promise<void> {
  const repo = requireModuleRepo('my-aidong')
  const state = await repo.getOrCreate(uid) as LooseState
  if (!await isAidongRecruited(uid, state, characterId)) {
    throw new ServiceError('aidong_not_recruited', 409)
  }
}

// Aidong 영입:
// userStore.ts의 recruitAidong()을 backend action API로 옮긴 함수다.
// recruitedAidongs에 중복 없이 추가하고, needs/careLog 초기 슬롯을 함께 만든다.
// 이 함수는 my-aidong document만 수정하며 host나 다른 module document는 건드리지 않는다.
export async function recruitAidong(uid: string, characterId: string) {
  const repo = requireModuleRepo('my-aidong')
  const state = await repo.getOrCreate(uid) as LooseState
  await getMydongRepository().getOrCreateForAidong(uid, {
    aidongId: characterId,
    acquisitionSource: 'manual',
  })
  const recruited = await listOwnedAidongIds(uid, state)

  const next = recruited.includes(characterId) ? recruited : [...recruited, characterId]
  const needs = state.needs && typeof state.needs === 'object'
    ? state.needs as LooseState
    : {}
  const careLog = state.careLog && typeof state.careLog === 'object'
    ? state.careLog as LooseState
    : {}

  return await repo.patch(uid, {
    recruitedAidongs: next,
    needs: { ...needs, [characterId]: needs[characterId] ?? INITIAL_NEEDS },
    careLog: { ...careLog, [characterId]: careLog[characterId] ?? {} },
  })
}

export async function listOwnedMydongs(uid: string) {
  const repo = requireModuleRepo('my-aidong')
  const state = await repo.getOrCreate(uid) as LooseState
  await listOwnedAidongIds(uid, state)
  return await getMydongRepository().list(uid)
}

// 친밀도 변경:
// userStore.ts의 addAffinity()에 대응한다. 먼저 영입된 Aidong인지 확인한 뒤 score와 level을 갱신한다.
// 영입되지 않은 캐릭터에 대한 요청은 service error로 막아 route가 409로 변환하게 한다.
export async function addAidongAffinity(uid: string, characterId: string, delta: number) {
  const repo = requireModuleRepo('my-aidong')
  const state = await repo.getOrCreate(uid) as LooseState
  if (!await isAidongRecruited(uid, state, characterId)) {
    throw new ServiceError('aidong_not_recruited', 409)
  }
  const affinities = state.affinities && typeof state.affinities === 'object'
    ? state.affinities as Record<string, { score?: number; level?: number }>
    : {}
  const current = affinities[characterId] ?? { score: 0, level: 0 }
  const score = Math.max(0, Number(current.score ?? 0) + delta)

  return await repo.patch(uid, {
    affinities: {
      ...affinities,
      [characterId]: { score, level: affinityLevel(score) },
    },
  })
}

// 의상 장착:
// userStore.ts의 setOutfit()에 대응한다. equippedOutfit[characterId]만 갱신한다.
// 착용 상태는 my-aidong local state이므로 inventory 차감이나 cross-module 이동은 여기서 하지 않는다.
export async function setAidongOutfit(uid: string, characterId: string, outfitId: string) {
  const repo = requireModuleRepo('my-aidong')
  const state = await repo.getOrCreate(uid) as LooseState
  const mydong = await resolveActiveMydong(uid, state, characterId)
  await seedCosmeticLoadoutsFromLegacyMaps(uid, state)
  await getMydongCosmeticRepository().setOutfit(uid, mydong.mydongUid, characterId, outfitId)
  const { equippedOutfit } = await getCosmeticLoadoutMaps(uid, state)

  return await repo.patch(uid, {
    equippedOutfit,
  })
}

// Aidong 아이템 착용 toggle:
// 실제 소유 수량은 hostStates.inventory가 권위다.
// equippedItems는 "현재 누가 어떤 전역 아이템을 착용 중인지"만 기록하고, host inventory 수량 자체는 차감하지 않는다.
export async function toggleAidongEquippedItem(uid: string, characterId: string, itemId: string) {
  if (!isAidongEquippableItem(itemId)) {
    throw new ServiceError('unsupported_aidong_item', 400)
  }

  const repo = requireModuleRepo('my-aidong')
  const state = await repo.getOrCreate(uid) as LooseState
  const mydong = await resolveActiveMydong(uid, state, characterId)
  await seedCosmeticLoadoutsFromLegacyMaps(uid, state)
  const loadout = await getMydongCosmeticRepository().getLoadout(uid, mydong.mydongUid, {
    aidongId: characterId,
  })
  const currentItems = loadout.equippedItemIds
  const isEquipped = currentItems.includes(itemId)
  if (isEquipped) {
    await getMydongCosmeticRepository().setEquippedItems(
      uid,
      mydong.mydongUid,
      characterId,
      currentItems.filter((id) => id !== itemId),
    )
    const { equippedItems } = await getCosmeticLoadoutMaps(uid, state)
    return await repo.patch(uid, {
      equippedItems,
    })
  }

  const host = await getHostStateRepository().getOrCreate(uid)
  const cosmeticInventory = await syncEquippableHostItemsToCosmeticInventory(uid, host.inventory)
  const owned = cosmeticInventory.find((item) => item.cosmeticId === itemId)?.quantity ?? 0
  const loadouts = await getMydongCosmeticRepository().listLoadouts(uid)
  const equippedByOthers = countEquippedItem(
    Object.fromEntries(loadouts.map((entry) => [entry.mydongUid, entry.equippedItemIds])),
    itemId,
    mydong.mydongUid,
  )
  if (owned - equippedByOthers <= 0) {
    throw new ServiceError('aidong_item_not_owned_or_available', 409)
  }

  await getMydongCosmeticRepository().setEquippedItems(
    uid,
    mydong.mydongUid,
    characterId,
    [...currentItems, itemId],
  )
  const { equippedItems } = await getCosmeticLoadoutMaps(uid, state)
  return await repo.patch(uid, {
    equippedItems,
  })
}

// Aidong별 도감 아이템 지급 shell:
// 실제 25종 catalog와 획득처가 확정되기 전까지는 itemId/amount만 기록한다.
// 보상 발생 원인은 source로 남기되, 통 인벤토리나 customs에는 연결하지 않는다.
export async function grantAidongCodexItem(
  uid: string,
  characterId: string,
  itemId: string,
  amount: number,
  source = 'placeholder',
) {
  assertPositiveInteger(amount, 'invalid_amount')

  const catalogItem = getAidongCodexItem(itemId)
  if (!catalogItem) throw new ServiceError('unknown_aidong_codex_item', 400)
  if (catalogItem.characterId !== characterId) {
    throw new ServiceError('aidong_codex_item_character_mismatch', 409)
  }

  const repo = requireModuleRepo('my-aidong')
  const state = await repo.getOrCreate(uid) as LooseState
  const mydong = await resolveActiveMydong(uid, state, characterId)

  const aidongCodexItems = await getAidongCodexItemMap(uid, state)
  const currentItems = aidongCodexItems[characterId] ?? {}
  const nextItems = {
    ...currentItems,
    [itemId]: (currentItems[itemId] ?? 0) + amount,
  }
  await getMydongPediaInventoryRepository().grant(uid, {
    mydongUid: mydong.mydongUid,
    aidongId: characterId,
    pediaItemId: itemId,
    slotNo: catalogItem.slotNo,
    quantity: amount,
    source,
  })
  const aidongUpgradeState = getNestedLooseMap(state, 'aidongUpgradeState')
  const upgradeState = aidongUpgradeState[characterId] ?? {}

  return await repo.patch(uid, {
    aidongCodexItems: {
      ...aidongCodexItems,
      [characterId]: nextItems,
    },
    aidongUpgradeState: {
      ...aidongUpgradeState,
      [characterId]: {
        ...upgradeState,
        lastCodexItemId: itemId,
        lastCodexItemSource: source,
        lastCodexItemAt: Date.now(),
        lastCodexProgress: buildAidongCodexProgress(characterId, nextItems),
      },
    },
  })
}

export async function getAidongCodexProgress(uid: string, characterId: string) {
  const repo = requireModuleRepo('my-aidong')
  const state = await repo.getOrCreate(uid) as LooseState
  await resolveActiveMydong(uid, state, characterId)

  const aidongCodexItems = await getAidongCodexItemMap(uid, state)
  const ownedItems = aidongCodexItems[characterId] ?? {}
  return {
    characterId,
    ownedItems,
    progress: buildAidongCodexProgress(characterId, ownedItems),
  }
}

// Aidong 업그레이드 shell:
// recipe와 소비 재료는 아직 확정 전이므로 아이템 차감은 하지 않는다.
// 확정 뒤에는 이 함수가 recipe validation과 aidongCodexItems 차감의 진입점이 된다.
export async function requestAidongUpgrade(
  uid: string,
  characterId: string,
  upgradeId: string,
  idempotencyKey?: string,
) {
  const repo = requireModuleRepo('my-aidong')
  const state = await repo.getOrCreate(uid) as LooseState
  if (!await isAidongRecruited(uid, state, characterId)) {
    throw new ServiceError('aidong_not_recruited', 409)
  }

  const aidongUpgradeState = getNestedLooseMap(state, 'aidongUpgradeState')
  const current = aidongUpgradeState[characterId] ?? {}
  const requestedUpgrades = current.requestedUpgrades && typeof current.requestedUpgrades === 'object' && !Array.isArray(current.requestedUpgrades)
    ? current.requestedUpgrades as Record<string, unknown>
    : {}

  if (idempotencyKey && requestedUpgrades[idempotencyKey]) {
    return state
  }

  return await repo.patch(uid, {
    aidongUpgradeState: {
      ...aidongUpgradeState,
      [characterId]: {
        ...current,
        lastRequestedUpgradeId: upgradeId,
        lastRequestedUpgradeAt: Date.now(),
        requestedUpgrades: idempotencyKey
          ? {
              ...requestedUpgrades,
              [idempotencyKey]: {
                upgradeId,
                requestedAt: Date.now(),
                status: 'placeholder',
              },
            }
          : requestedUpgrades,
      },
    },
  })
}
// 숙소 케어 action shell:
// M2에서는 Hunger/Clean/Mood/Energy 4파라미터 표면을 위해 최소 기본 케어 5종만 backend 권위로 처리한다.
// 내부 저장은 기존 6욕구 needs를 유지하고, 화면에서만 4파라미터로 압축해서 보여준다.
export async function applyAidongCareAction(uid: string, characterId: string, actionId: string) {
  const action = LODGE_CARE_ACTIONS[actionId]
  if (!action) throw new ServiceError('unsupported_care_action', 400)

  const repo = requireModuleRepo('my-aidong')
  const state = await repo.getOrCreate(uid) as LooseState
  if (!await isAidongRecruited(uid, state, characterId)) {
    throw new ServiceError('aidong_not_recruited', 409)
  }

  const needsMap = state.needs && typeof state.needs === 'object'
    ? state.needs as Record<string, Record<NeedKey, number>>
    : {}
  const currentNeeds = { ...INITIAL_NEEDS, ...(needsMap[characterId] ?? {}) }

  const careLog = state.careLog && typeof state.careLog === 'object'
    ? state.careLog as Record<string, Record<string, { todayKey?: string; todayCount?: number; lastUsedAt?: number }>>
    : {}
  const charLog = careLog[characterId] ?? {}
  const logEntry = charLog[actionId] ?? {}
  const todayKey = getTodayKey()
  const todayCount = logEntry.todayKey === todayKey ? Number(logEntry.todayCount ?? 0) : 0
  if (action.dailyCap && todayCount >= action.dailyCap) {
    throw new ServiceError('care_daily_cap', 409)
  }

  if (action.coinCost > 0) {
    try {
      await getHostStateRepository().mutateResource(uid, 'coins', -action.coinCost)
    } catch (_error) {
      throw new ServiceError('insufficient_host_resource', 409)
    }
  }

  const nextNeeds = { ...currentNeeds }
  for (const [key, delta] of Object.entries(action.needsRecover)) {
    nextNeeds[key as NeedKey] = clampNeed((nextNeeds[key as NeedKey] ?? 0) + Number(delta))
  }

  const affinities = state.affinities && typeof state.affinities === 'object'
    ? state.affinities as Record<string, { score?: number; level?: number }>
    : {}
  const currentAffinity = affinities[characterId] ?? { score: 0, level: 0 }
  const score = Math.max(0, Number(currentAffinity.score ?? 0) + action.affinity)

  const nextState = await repo.patch(uid, {
    needs: {
      ...needsMap,
      [characterId]: nextNeeds,
    },
    affinities: {
      ...affinities,
      [characterId]: { score, level: affinityLevel(score) },
    },
    careLog: {
      ...careLog,
      [characterId]: {
        ...charLog,
        [actionId]: {
          todayKey,
          todayCount: todayCount + 1,
          lastUsedAt: Date.now(),
        },
      },
    },
  })

  const host = await getHostStateRepository().getOrCreate(uid)
  return {
    state: nextState,
    host,
    result: {
      actionId,
      label: action.label,
      affinityDelta: action.affinity,
      coinCost: action.coinCost,
      needs: nextNeeds,
    },
  }
}
