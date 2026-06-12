/**
 * packages/backend/src/modules/destination-island/service.ts
 * ------------------------------------------------------------
 * 역할: 항해로 도착하는 섬 모듈의 고정맵 탐험 action을 처리한다.
 * 연결: destination-island 전용 document의 위치, 방문 이력, hotspot 상태,
 *       미션 클리어, 섬 전용 자원/아이템을 backend 권위로 갱신한다.
 * 주의: 이 service는 섬 내부 상태만 수정한다. 배, 숙소, 전역 보관소로 자원을
 *       옮기는 작업은 customs API에서 별도로 처리한다.
 */
import { requireModuleRepo, ServiceError, type LooseState } from '../shared.js'

type Direction = 'north' | 'south' | 'west' | 'east'
type RewardBucket = 'localResources' | 'localInventory'

interface DestinationNodeConfig {
  nodeId: string
  name: string
  exits: Partial<Record<Direction, string>>
}

interface DestinationReward {
  bucket: RewardBucket
  id: string
  amount: number
}

interface DestinationHotspotConfig {
  hotspotId: string
  nodeId: string
  kind: 'decorative' | 'collect' | 'mission'
  once: boolean
  missionId?: string
  rewards: DestinationReward[]
}

interface DestinationMissionConfig {
  missionId: string
  nodeId: string
  requiredResources: Record<string, number>
  rewards: DestinationReward[]
}

interface DestinationIslandConfig {
  moduleId: string
  initialNodeId: string
  nodes: DestinationNodeConfig[]
  hotspots: DestinationHotspotConfig[]
  missions: DestinationMissionConfig[]
}

const DESTINATION_ISLAND_CONFIGS: Record<string, DestinationIslandConfig> = {
  'destination-shell-island': {
    moduleId: 'destination-shell-island',
    initialNodeId: 'beach-center',
    nodes: [
      { nodeId: 'beach-center', name: '조개빛 해변', exits: { west: 'beach-west', east: 'beach-east', north: 'grove-entrance' } },
      { nodeId: 'beach-west', name: '반짝이는 조개 바위', exits: { east: 'beach-center' } },
      { nodeId: 'beach-east', name: '파도 웅덩이', exits: { west: 'beach-center', north: 'old-shrine' } },
      { nodeId: 'grove-entrance', name: '바람 숲 입구', exits: { south: 'beach-center' } },
      { nodeId: 'old-shrine', name: '오래된 조개 사당', exits: { south: 'beach-east' } },
    ],
    hotspots: [
      {
        hotspotId: 'shell-rock',
        nodeId: 'beach-west',
        kind: 'collect',
        once: true,
        rewards: [{ bucket: 'localResources', id: 'shell-fragment', amount: 2 }],
      },
      {
        hotspotId: 'tide-pool',
        nodeId: 'beach-east',
        kind: 'collect',
        once: false,
        rewards: [{ bucket: 'localResources', id: 'shell-fragment', amount: 1 }],
      },
      {
        hotspotId: 'old-shrine-door',
        nodeId: 'old-shrine',
        kind: 'mission',
        once: true,
        missionId: 'open-old-shrine',
        rewards: [],
      },
      {
        hotspotId: 'wind-shell',
        nodeId: 'grove-entrance',
        kind: 'decorative',
        once: false,
        rewards: [],
      },
    ],
    missions: [
      {
        missionId: 'open-old-shrine',
        nodeId: 'old-shrine',
        requiredResources: { 'shell-fragment': 2 },
        rewards: [{ bucket: 'localInventory', id: 'pearl-dust', amount: 1 }],
      },
    ],
  },
}

function getConfig(moduleId: string): DestinationIslandConfig {
  const config = DESTINATION_ISLAND_CONFIGS[moduleId]
  if (!config) throw new ServiceError('invalid_destination_island_module', 404)
  return config
}

function getArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function getNumberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const result: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const amount = Number(raw)
    if (Number.isFinite(amount) && amount > 0) result[key] = amount
  }
  return result
}

function getObjectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function addRewards(
  state: LooseState,
  rewards: DestinationReward[],
): {
  localResources: Record<string, number>
  localInventory: Record<string, number>
} {
  const localResources = getNumberRecord(state.localResources)
  const localInventory = getNumberRecord(state.localInventory)

  for (const reward of rewards) {
    const target = reward.bucket === 'localInventory' ? localInventory : localResources
    target[reward.id] = (target[reward.id] ?? 0) + reward.amount
  }

  return { localResources, localInventory }
}

function spendRequiredResources(
  state: LooseState,
  requiredResources: Record<string, number>,
): Record<string, number> {
  const localResources = getNumberRecord(state.localResources)

  for (const [resource, amount] of Object.entries(requiredResources)) {
    if ((localResources[resource] ?? 0) < amount) {
      throw new ServiceError('insufficient_destination_resource', 409)
    }
  }

  for (const [resource, amount] of Object.entries(requiredResources)) {
    localResources[resource] = Math.max(0, (localResources[resource] ?? 0) - amount)
    if (localResources[resource] === 0) delete localResources[resource]
  }

  return localResources
}

export function getDestinationIslandConfig(moduleId: string): DestinationIslandConfig {
  return getConfig(moduleId)
}

export async function moveDestinationIsland(
  uid: string,
  moduleId: string,
  direction: Direction,
) {
  const config = getConfig(moduleId)
  const repo = requireModuleRepo(moduleId)
  const state = await repo.getOrCreate(uid) as LooseState
  const currentNodeId = typeof state.currentNodeId === 'string'
    ? state.currentNodeId
    : config.initialNodeId
  const currentNode = config.nodes.find((node) => node.nodeId === currentNodeId)
  const nextNodeId = currentNode?.exits[direction]

  if (!nextNodeId) throw new ServiceError('invalid_destination_exit', 400)

  const visitedNodeIds = new Set(getArray(state.visitedNodeIds))
  visitedNodeIds.add(currentNodeId)
  visitedNodeIds.add(nextNodeId)

  return await repo.patch(uid, {
    currentNodeId: nextNodeId,
    visitedNodeIds: [...visitedNodeIds],
  })
}

export async function interactDestinationHotspot(
  uid: string,
  moduleId: string,
  hotspotId: string,
) {
  const config = getConfig(moduleId)
  const hotspot = config.hotspots.find((item) => item.hotspotId === hotspotId)
  if (!hotspot) throw new ServiceError('invalid_destination_hotspot', 400)

  const repo = requireModuleRepo(moduleId)
  const state = await repo.getOrCreate(uid) as LooseState
  const currentNodeId = typeof state.currentNodeId === 'string'
    ? state.currentNodeId
    : config.initialNodeId

  if (hotspot.nodeId !== currentNodeId) {
    throw new ServiceError('destination_hotspot_not_here', 409)
  }

  const hotspotStates = getObjectRecord(state.hotspotStates)
  const currentHotspotState = getObjectRecord(hotspotStates[hotspotId])
  if (hotspot.once && currentHotspotState.interacted === true) {
    return { state, rewards: [], replayed: true }
  }

  const rewardPatch = addRewards(state, hotspot.rewards)
  const nextHotspotStates = {
    ...hotspotStates,
    [hotspotId]: {
      interacted: true,
      count: Number(currentHotspotState.count ?? 0) + 1,
      lastInteractedAt: Date.now(),
    },
  }

  const nextState = await repo.patch(uid, {
    ...rewardPatch,
    hotspotStates: nextHotspotStates,
  })

  return { state: nextState, rewards: hotspot.rewards }
}

export async function clearDestinationMission(
  uid: string,
  moduleId: string,
  missionId: string,
) {
  const config = getConfig(moduleId)
  const mission = config.missions.find((item) => item.missionId === missionId)
  if (!mission) throw new ServiceError('invalid_destination_mission', 400)

  const repo = requireModuleRepo(moduleId)
  const state = await repo.getOrCreate(uid) as LooseState
  const currentNodeId = typeof state.currentNodeId === 'string'
    ? state.currentNodeId
    : config.initialNodeId
  if (mission.nodeId !== currentNodeId) {
    throw new ServiceError('destination_mission_not_here', 409)
  }

  const clearedMissionIds = getArray(state.clearedMissionIds)
  if (clearedMissionIds.includes(missionId)) {
    return { state, rewards: [], replayed: true }
  }

  const localResources = spendRequiredResources(state, mission.requiredResources)
  const rewardPatch = addRewards({ ...state, localResources }, mission.rewards)
  const nextState = await repo.patch(uid, {
    ...rewardPatch,
    clearedMissionIds: [...clearedMissionIds, missionId],
  })

  return { state: nextState, rewards: mission.rewards }
}
