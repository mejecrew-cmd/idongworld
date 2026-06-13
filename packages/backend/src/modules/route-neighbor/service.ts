/**
 * packages/backend/src/modules/route-neighbor/service.ts
 * ------------------------------------------------------------
 * 역할: route-neighbor의 영속 결과와 항해 보상 지급을 담당하는 service 계층이다.
 * 연결: frontend 탭/창별 voyage session이 넘긴 route/board position payload를 검증하고 영속 결과만 DB에 남긴다.
 * 주의: 현재 항해 중인지, 현재 칸이 어디인지는 DB에 저장하지 않는다.
 */
import { getHostStateRepository } from '../../repositories/index.js'
import { requireModuleRepo, ServiceError, type LooseState } from '../shared.js'
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

function assertValidRouteId(routeId: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(routeId)) {
    throw new ServiceError('invalid_route_id', 400)
  }
}

function asBoardPosition(value: unknown): number | undefined {
  const position = Number(value)
  if (!Number.isInteger(position) || position < 0 || position >= BOARD_SIZE) return undefined
  return position
}

function landingFromInput(input: {
  landingId?: string
  routeId?: string
  boardPosition?: number
}): RouteLandingCandidate | undefined {
  if (input.routeId && input.boardPosition !== undefined) {
    assertValidRouteId(input.routeId)
    return getRouteLandingCandidate(input.routeId, input.boardPosition)
  }
  if (!input.landingId) return undefined
  const [routeId, rawPosition] = input.landingId.split(':')
  const boardPosition = asBoardPosition(rawPosition)
  if (!routeId || boardPosition === undefined) return undefined
  assertValidRouteId(routeId)
  const landing = getRouteLandingCandidate(routeId, boardPosition)
  return landing.landingId === input.landingId ? landing : undefined
}

export async function startRoute(uid: string, routeId: string) {
  assertValidRouteId(routeId)
  const state = await requireModuleRepo('route-neighbor').getOrCreate(uid) as LooseState
  const shipState = await requireModuleRepo('ship').getOrCreate(uid) as LooseState
  if (!hasShipCrew(shipState)) {
    throw new ServiceError('ship_crew_required', 409)
  }
  return {
    routeId,
    boardPosition: 0,
    state,
  }
}

export async function rollRoute(
  uid: string,
  requestedSteps?: number,
  input: {
    routeId?: string
    boardPosition?: number
  } = {},
) {
  const repo = requireModuleRepo('route-neighbor')
  if (requestedSteps !== undefined && (!Number.isInteger(requestedSteps) || requestedSteps < 1 || requestedSteps > 6)) {
    throw new ServiceError('invalid_steps', 400)
  }
  const routeId = input.routeId
  const boardPosition = asBoardPosition(input.boardPosition)
  if (!routeId || boardPosition === undefined) {
    throw new ServiceError('route_session_required', 409)
  }
  assertValidRouteId(routeId)
  const steps = requestedSteps !== undefined && Number.isFinite(requestedSteps)
    ? Math.max(1, Math.min(6, Math.floor(requestedSteps)))
    : Math.floor(Math.random() * 6) + 1

  try {
    const state = await repo.getOrCreate(uid) as LooseState
    const host = await getHostStateRepository().mutateResource(uid, 'diceCount', -1)
    const landing = getRouteLandingCandidate(routeId, boardPosition)
    return { steps, boardPosition, landing, host, state }
  } catch (error) {
    if (error instanceof Error && error.message === 'insufficient_host_resource') {
      throw new ServiceError('insufficient_dice', 409)
    }
    throw error
  }
}

export async function endRoute(uid: string) {
  return await requireModuleRepo('route-neighbor').getOrCreate(uid)
}

export async function getCurrentLanding(uid: string) {
  await requireModuleRepo('route-neighbor').getOrCreate(uid)
  return undefined
}

export async function clearCurrentLanding(
  uid: string,
  landingId?: string,
  input: {
    routeId?: string
    boardPosition?: number
  } = {},
) {
  const repo = requireModuleRepo('route-neighbor')
  const state = await repo.getOrCreate(uid) as LooseState
  const landings = asLandingState(state.landings)
  const landing = landingFromInput({ landingId, ...input })

  if (!landing) throw new ServiceError('landing_not_found', 404)
  if (landingId && landing.landingId !== landingId) {
    throw new ServiceError('landing_id_mismatch', 409)
  }
  if (landings.cleared?.[landing.landingId]) {
    return { landing: { ...landing, status: 'cleared' as const }, state }
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
    landing: { ...landing, status: 'cleared' as const },
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






