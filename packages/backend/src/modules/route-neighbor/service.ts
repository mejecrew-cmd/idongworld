/**
 * packages/backend/src/modules/route-neighbor/service.ts
 * ------------------------------------------------------------
 * 역할: 모듈별 domain rule과 상태 전이를 담당하는 service 계층이다.
 * 연결: userStore action으로 처리하던 로직을 backend 권위 로직으로 옮기는 위치다.
 * 주의: 자기 module document만 직접 수정하고, 다른 module/host 자원 이동은 adapter 또는 customs를 통한다.
 */
import { getHostStateRepository } from '../../repositories/index.js'
import { asNumber, requireModuleRepo, ServiceError, type LooseState } from '../shared.js'
import { getRouteLandingCandidate, type RouteLandingCandidate } from './landing.js'

const BOARD_SIZE = 30

interface RouteLandingState {
  last?: RouteLandingCandidate & {
    landedAt: number
    status: 'arrived' | 'cleared'
  }
  cleared?: Record<string, number>
}

function asLandingState(value: unknown): RouteLandingState {
  return typeof value === 'object' && value ? value as RouteLandingState : {}
}

function asResourceMap(value: unknown): Record<string, number> {
  return typeof value === 'object' && value ? value as Record<string, number> : {}
}

function addResource(
  resources: Record<string, number>,
  resource: string,
  amount: number,
): Record<string, number> {
  return {
    ...resources,
    [resource]: (resources[resource] ?? 0) + amount,
  }
}

function toDynamicZoneId(characterId: string): string {
  return `aidong-${characterId}-zone`
}

function getRouteProgress(state: LooseState): Record<string, unknown> {
  const value = state.progress
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function getAcceptedEncounters(progress: Record<string, unknown>): Record<string, unknown> {
  const value = progress.acceptedEncounters
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function hasShipCrew(state: LooseState): boolean {
  const cabinAssignments = typeof state.cabinAssignments === 'object' && state.cabinAssignments
    ? Object.values(state.cabinAssignments as Record<string, unknown>)
    : []
  const deckAssignments = typeof state.deckAssignments === 'object' && state.deckAssignments
    ? Object.values(state.deckAssignments as Record<string, unknown>)
    : []
  return [...cabinAssignments, ...deckAssignments].some((characterId) => typeof characterId === 'string' && characterId)
}

export async function startRoute(uid: string, routeId: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(routeId)) {
    throw new ServiceError('invalid_route_id', 400)
  }
  const repo = requireModuleRepo('route-neighbor')
  const routeState = await repo.getOrCreate(uid) as LooseState
  if (typeof routeState.currentRoute === 'string' && routeState.currentRoute) {
    throw new ServiceError('route_already_started', 409)
  }
  const shipState = await requireModuleRepo('ship').getOrCreate(uid) as LooseState
  if (!hasShipCrew(shipState)) {
    throw new ServiceError('ship_crew_required', 409)
  }
  return await repo.patch(uid, {
    currentRoute: routeId,
    boardPosition: 0,
  })
}

export async function rollRoute(uid: string, requestedSteps?: number) {
  const repo = requireModuleRepo('route-neighbor')
  if (requestedSteps !== undefined && (!Number.isInteger(requestedSteps) || requestedSteps < 1 || requestedSteps > 6)) {
    throw new ServiceError('invalid_steps', 400)
  }
  const steps = requestedSteps !== undefined && Number.isFinite(requestedSteps)
    ? Math.max(1, Math.min(6, Math.floor(requestedSteps)))
    : Math.floor(Math.random() * 6) + 1

  try {
    const state = await repo.getOrCreate(uid) as LooseState
    if (typeof state.currentRoute !== 'string' || !state.currentRoute) {
      throw new ServiceError('route_not_started', 409)
    }
    const current = asNumber(state.boardPosition, 0)
    if (!Number.isInteger(current) || current < 0 || current >= BOARD_SIZE) {
      throw new ServiceError('invalid_board_position', 409)
    }
    const host = await getHostStateRepository().mutateResource(uid, 'diceCount', -1)
    const boardPosition = (current + steps) % BOARD_SIZE
    const routeId = String(state.currentRoute)
    const landing = getRouteLandingCandidate(routeId, boardPosition)
    const landings = {
      ...asLandingState(state.landings),
      last: {
        ...landing,
        landedAt: Date.now(),
        status: 'arrived' as const,
      },
    }
    const updated = await repo.patch(uid, { boardPosition, landings })
    return { steps, landing, host, state: updated }
  } catch (error) {
    if (error instanceof Error && error.message === 'insufficient_host_resource') {
      throw new ServiceError('insufficient_dice', 409)
    }
    throw error
  }
}

export async function endRoute(uid: string) {
  const repo = requireModuleRepo('route-neighbor')
  return await repo.patch(uid, {
    currentRoute: null,
    boardPosition: 0,
  })
}

export async function getCurrentLanding(uid: string) {
  const repo = requireModuleRepo('route-neighbor')
  const state = await repo.getOrCreate(uid) as LooseState
  return asLandingState(state.landings).last
}

export async function clearCurrentLanding(uid: string, landingId?: string) {
  const repo = requireModuleRepo('route-neighbor')
  const state = await repo.getOrCreate(uid) as LooseState
  const landings = asLandingState(state.landings)
  const landing = landings.last

  if (!landing) throw new ServiceError('landing_not_found', 404)
  if (landingId && landing.landingId !== landingId) {
    throw new ServiceError('landing_id_mismatch', 409)
  }
  if (landing.status === 'cleared' || landings.cleared?.[landing.landingId]) {
    return { landing, state }
  }
  if (!landing.mission) {
    throw new ServiceError('landing_has_no_mission', 409)
  }

  const localResources = asResourceMap(state.localResources)
  let host
  let nextLocalResources = localResources
  const moduleStates: Record<string, unknown> = {}

  for (const reward of landing.mission.rewards) {
    if (reward.scope === 'host') {
      host = await getHostStateRepository().mutateResource(uid, reward.resource as 'coins', reward.amount)
      continue
    }
    if (reward.scope === 'module' && reward.moduleId === 'route-neighbor') {
      nextLocalResources = addResource(nextLocalResources, reward.resource, reward.amount)
      continue
    }
    if (reward.scope === 'module' && reward.moduleId) {
      const targetRepo = requireModuleRepo(reward.moduleId)
      const targetState = await targetRepo.getOrCreate(uid) as LooseState
      moduleStates[reward.moduleId] = await targetRepo.patch(uid, {
        localResources: addResource(asResourceMap(targetState.localResources), reward.resource, reward.amount),
      })
    }
  }

  const nextLandings: RouteLandingState = {
    ...landings,
    last: {
      ...landing,
      status: 'cleared',
    },
    cleared: {
      ...(landings.cleared ?? {}),
      [landing.landingId]: Date.now(),
    },
  }
  const updated = await repo.patch(uid, {
    localResources: nextLocalResources,
    landings: nextLandings,
  })

  return {
    landing: nextLandings.last,
    rewards: landing.mission.rewards,
    host,
    moduleStates,
    state: updated,
  }
}

// Aidong 만남 수락 shell:
// 실제 encounter pool, 확률, 스토리 컷은 확정 전이므로 characterId를 직접 받는다.
// route-neighbor는 수락 기록과 후보 정보만 소유한다.
// 실제 영입은 my-aidong action, 13구역 편입은 my-island slots/incorporate action이 따로 담당한다.
export async function acceptAidongEncounter(
  uid: string,
  input: {
    characterId: string
    encounterId?: string
    zoneId?: string
  },
) {
  const repo = requireModuleRepo('route-neighbor')
  const state = await repo.getOrCreate(uid) as LooseState
  const progress = getRouteProgress(state)
  const acceptedEncounters = getAcceptedEncounters(progress)
  const encounterId = input.encounterId || `encounter-${input.characterId}`
  const zoneId = input.zoneId || toDynamicZoneId(input.characterId)
  const existing = acceptedEncounters[encounterId]

  if (existing) {
    return {
      state,
      encounter: existing,
      aidongState: await requireModuleRepo('my-aidong').getOrCreate(uid),
      islandState: await requireModuleRepo('my-island').getOrCreate(uid),
      nextActions: ['my-aidong/recruit', 'my-island/slots/incorporate'],
      replayed: true,
    }
  }

  const acceptedAt = Date.now()
  const encounter = {
    encounterId,
    characterId: input.characterId,
    zoneId,
    acceptedAt,
    status: 'accepted',
  }

  const nextState = await repo.patch(uid, {
    progress: {
      ...progress,
      acceptedEncounters: {
        ...acceptedEncounters,
        [encounterId]: encounter,
      },
      lastAcceptedEncounter: encounter,
    },
  })

  return {
    state: nextState,
    encounter,
    aidongState: await requireModuleRepo('my-aidong').getOrCreate(uid),
    islandState: await requireModuleRepo('my-island').getOrCreate(uid),
    nextActions: ['my-aidong/recruit', 'my-island/slots/incorporate'],
  }
}






