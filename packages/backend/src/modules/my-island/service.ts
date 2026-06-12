/**
 * packages/backend/src/modules/my-island/service.ts
 * ------------------------------------------------------------
 * 역할: my-island 모듈의 domain action과 상태 전이를 담당한다.
 * 연결: frontend의 zone unlock/tutorial completion 흐름을 backend 권위 API로 옮긴다.
 * 주의: my-island document와 account document만 수정한다.
 *       Aidong 만남으로 열린 가변 구역 목록은 myIslandStates.dynamicAidongZones가 소유한다.
 */
import { getUserRepository } from '../../repositories/index.js'
import { createDefaultMyIslandZoneSlots } from '../../repositories/moduleDefaults.js'
import { requireModuleRepo, ServiceError, type LooseState } from '../shared.js'
import { assertAidongRecruited } from '../my-aidong/service.js'
import type { MyIslandZoneSlot } from '../../models/MyIslandStateModel.js'

type DynamicAidongZoneStatus = 'active' | 'hidden' | 'farewelled'
type DynamicAidongZoneSource = 'voyage-encounter' | 'manual' | 'migration'

export interface DynamicAidongZoneEntry {
  zoneId: string
  characterId: string
  status: DynamicAidongZoneStatus
  displayOrder: number
  pinned: boolean
  openedAt: number
  source: DynamicAidongZoneSource
}

function getUnlockedZones(state: LooseState): string[] {
  return Array.isArray(state.unlockedZones)
    ? state.unlockedZones as string[]
    : []
}

function getDynamicAidongZones(state: LooseState): Record<string, DynamicAidongZoneEntry> {
  return state.dynamicAidongZones && typeof state.dynamicAidongZones === 'object' && !Array.isArray(state.dynamicAidongZones)
    ? state.dynamicAidongZones as Record<string, DynamicAidongZoneEntry>
    : {}
}

function getZoneSlots(state: LooseState): Record<string, MyIslandZoneSlot> {
  const existing = state.zoneSlots && typeof state.zoneSlots === 'object' && !Array.isArray(state.zoneSlots)
    ? state.zoneSlots as Record<string, MyIslandZoneSlot>
    : {}

  return {
    ...createDefaultMyIslandZoneSlots(),
    ...existing,
  }
}

function requireZoneSlot(
  zoneSlots: Record<string, MyIslandZoneSlot>,
  areaNo: string,
): MyIslandZoneSlot {
  const slot = zoneSlots[areaNo]
  if (!slot) {
    throw new ServiceError('zone_slot_not_found', 404)
  }
  return slot
}

function assertFillableSlot(slot: MyIslandZoneSlot): void {
  if (slot.kind !== 'fillable') {
    throw new ServiceError('zone_slot_anchor_locked', 409)
  }
}

function findAidongAssignedAreaNo(
  zoneSlots: Record<string, MyIslandZoneSlot>,
  characterId: string,
): string | undefined {
  return Object.values(zoneSlots).find((slot) => slot.occupantAidongId === characterId)?.areaNo
}

function getNextDisplayOrder(zones: Record<string, DynamicAidongZoneEntry>): number {
  return Object.values(zones).reduce((max, zone) => Math.max(max, Number(zone.displayOrder) || 0), 0) + 1
}

function isDynamicAidongZoneStatus(value: string): value is DynamicAidongZoneStatus {
  return value === 'active' || value === 'hidden' || value === 'farewelled'
}

function isDynamicAidongZoneSource(value: string): value is DynamicAidongZoneSource {
  return value === 'voyage-encounter' || value === 'manual' || value === 'migration'
}

export async function unlockZone(uid: string, zoneId: string) {
  const repo = requireModuleRepo('my-island')
  const state = await repo.getOrCreate(uid) as LooseState
  const unlockedZones = getUnlockedZones(state)

  if (unlockedZones.includes(zoneId)) {
    return state
  }

  return await repo.patch(uid, {
    unlockedZones: [...unlockedZones, zoneId],
  })
}

export async function listZoneSlots(uid: string) {
  const repo = requireModuleRepo('my-island')
  const state = await repo.getOrCreate(uid) as LooseState
  const zoneSlots = getZoneSlots(state)

  return await repo.patch(uid, { zoneSlots })
}

export async function incorporateSlot(
  uid: string,
  input: {
    areaNo: string
    characterId: string
  },
) {
  await assertAidongRecruited(uid, input.characterId)

  const repo = requireModuleRepo('my-island')
  const state = await repo.getOrCreate(uid) as LooseState
  const zoneSlots = getZoneSlots(state)
  const slot = requireZoneSlot(zoneSlots, input.areaNo)
  assertFillableSlot(slot)

  const assignedAreaNo = findAidongAssignedAreaNo(zoneSlots, input.characterId)
  if (assignedAreaNo && assignedAreaNo !== input.areaNo) {
    throw new ServiceError('aidong_already_in_zone_slot', 409)
  }

  if (slot.occupantAidongId && slot.occupantAidongId !== input.characterId) {
    throw new ServiceError('zone_slot_occupied', 409)
  }

  const now = Date.now()
  return await repo.patch(uid, {
    zoneSlots: {
      ...zoneSlots,
      [input.areaNo]: {
        ...slot,
        occupantAidongId: input.characterId,
        state: 'filled',
        source: 'incorporation',
        incorporatedAt: slot.incorporatedAt ?? now,
        updatedAt: now,
      },
    },
  })
}

export async function releaseSlot(
  uid: string,
  input: {
    areaNo: string
  },
) {
  const repo = requireModuleRepo('my-island')
  const state = await repo.getOrCreate(uid) as LooseState
  const zoneSlots = getZoneSlots(state)
  const slot = requireZoneSlot(zoneSlots, input.areaNo)
  assertFillableSlot(slot)

  if (!slot.occupantAidongId) {
    throw new ServiceError('zone_slot_empty', 409)
  }

  return await repo.patch(uid, {
    zoneSlots: {
      ...zoneSlots,
      [input.areaNo]: {
        ...slot,
        occupantAidongId: undefined,
        state: 'empty',
        source: 'default',
        incorporatedAt: undefined,
        updatedAt: Date.now(),
      },
    },
  })
}

export async function moveSlot(
  uid: string,
  input: {
    fromAreaNo: string
    toAreaNo: string
  },
) {
  if (input.fromAreaNo === input.toAreaNo) {
    throw new ServiceError('same_zone_slot', 400)
  }

  const repo = requireModuleRepo('my-island')
  const state = await repo.getOrCreate(uid) as LooseState
  const zoneSlots = getZoneSlots(state)
  const fromSlot = requireZoneSlot(zoneSlots, input.fromAreaNo)
  const toSlot = requireZoneSlot(zoneSlots, input.toAreaNo)
  assertFillableSlot(fromSlot)
  assertFillableSlot(toSlot)

  if (!fromSlot.occupantAidongId) {
    throw new ServiceError('zone_slot_empty', 409)
  }

  if (toSlot.occupantAidongId) {
    throw new ServiceError('zone_slot_occupied', 409)
  }

  const now = Date.now()
  return await repo.patch(uid, {
    zoneSlots: {
      ...zoneSlots,
      [input.fromAreaNo]: {
        ...fromSlot,
        occupantAidongId: undefined,
        state: 'empty',
        source: 'default',
        incorporatedAt: undefined,
        updatedAt: now,
      },
      [input.toAreaNo]: {
        ...toSlot,
        occupantAidongId: fromSlot.occupantAidongId,
        state: 'filled',
        source: 'incorporation',
        incorporatedAt: toSlot.incorporatedAt ?? now,
        updatedAt: now,
      },
    },
  })
}

export async function openDynamicAidongZone(
  uid: string,
  input: {
    zoneId: string
    characterId: string
    displayOrder?: number
    pinned?: boolean
    source?: string
  },
) {
  const repo = requireModuleRepo('my-island')
  const state = await repo.getOrCreate(uid) as LooseState
  const zones = getDynamicAidongZones(state)
  const existing = zones[input.zoneId]
  const now = Date.now()
  const source = input.source && isDynamicAidongZoneSource(input.source)
    ? input.source
    : 'voyage-encounter'

  const nextZone: DynamicAidongZoneEntry = {
    zoneId: input.zoneId,
    characterId: input.characterId,
    status: existing?.status ?? 'active',
    displayOrder: Number.isFinite(input.displayOrder)
      ? Number(input.displayOrder)
      : existing?.displayOrder ?? getNextDisplayOrder(zones),
    pinned: typeof input.pinned === 'boolean' ? input.pinned : existing?.pinned ?? false,
    openedAt: existing?.openedAt ?? now,
    source,
  }

  return await repo.patch(uid, {
    dynamicAidongZones: {
      ...zones,
      [input.zoneId]: nextZone,
    },
  })
}

export async function updateDynamicAidongZone(
  uid: string,
  input: {
    zoneId: string
    status?: string
    displayOrder?: number
    pinned?: boolean
  },
) {
  const repo = requireModuleRepo('my-island')
  const state = await repo.getOrCreate(uid) as LooseState
  const zones = getDynamicAidongZones(state)
  const existing = zones[input.zoneId]

  if (!existing) {
    throw new ServiceError('dynamic_zone_not_found', 404)
  }

  const status = input.status === undefined
    ? existing.status
    : isDynamicAidongZoneStatus(input.status)
      ? input.status
      : undefined

  if (!status) {
    throw new ServiceError('invalid_dynamic_zone_status', 400)
  }

  const displayOrder = Number.isFinite(input.displayOrder)
    ? Number(input.displayOrder)
    : existing.displayOrder

  return await repo.patch(uid, {
    dynamicAidongZones: {
      ...zones,
      [input.zoneId]: {
        ...existing,
        status,
        displayOrder,
        pinned: typeof input.pinned === 'boolean' ? input.pinned : existing.pinned,
      },
    },
  })
}

export async function completeTutorial(uid: string) {
  const updated = await getUserRepository().updateUser(uid, {
    onboardingComplete: true,
  })

  if (!updated) {
    throw new ServiceError('account_not_found', 404)
  }

  return {
    uid: updated.uid,
    isGuest: updated.isGuest,
    nickname: updated.nickname,
    openingSeen: updated.openingSeen,
    onboardingComplete: updated.onboardingComplete,
    hostName: updated.hostName,
  }
}
