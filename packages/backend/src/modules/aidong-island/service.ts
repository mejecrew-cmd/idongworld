/**
 * packages/backend/src/modules/aidong-island/service.ts
 * ------------------------------------------------------------
 * 역할: M22 아이동섬의 최소 backend domain action을 담당한다.
 * 연결: 항해에서 아이동섬에 상륙한 뒤 고정맵 node, 상호작용, 영입 후보, 영입 완료를 저장한다.
 * 주의: 이 service는 섬 진행 상태만 직접 수정한다. 실제 Aidong 보유는 my-aidong service,
 *       마이섬 편입은 my-island slots/incorporate API가 담당한다.
 */
import { recruitAidong } from '../my-aidong/service.js'
import { requireModuleRepo, ServiceError, type LooseState } from '../shared.js'

type Direction = 'north' | 'south' | 'west' | 'east'

interface AidongIslandNodeConfig {
  nodeId: string
  name: string
  exits: Partial<Record<Direction, string>>
  hotspotIds: string[]
}

interface AidongIslandHotspotConfig {
  hotspotId: string
  nodeId: string
  kind: 'meet-aidong' | 'flavor'
  characterId?: string
  label: string
}

interface AidongIslandConfig {
  islandId: string
  name: string
  moduleId: 'aidong-island'
  initialNodeId: string
  nodes: AidongIslandNodeConfig[]
  hotspots: AidongIslandHotspotConfig[]
}

const MODULE_ID = 'aidong-island'

const AIDONG_ISLAND_CONFIGS: Record<string, AidongIslandConfig> = {
  'first-aidong-island': {
    islandId: 'first-aidong-island',
    name: '첫 만남의 섬',
    moduleId: MODULE_ID,
    initialNodeId: 'landing-beach',
    nodes: [
      {
        nodeId: 'landing-beach',
        name: '잔잔한 선착장',
        exits: { north: 'small-grove' },
        hotspotIds: ['welcome-shell'],
      },
      {
        nodeId: 'small-grove',
        name: '작은 숲 공터',
        exits: { south: 'landing-beach' },
        hotspotIds: ['meet-hwanggumeong'],
      },
    ],
    hotspots: [
      {
        hotspotId: 'welcome-shell',
        nodeId: 'landing-beach',
        kind: 'flavor',
        label: '파도에 닳은 작은 표식',
      },
      {
        hotspotId: 'meet-hwanggumeong',
        nodeId: 'small-grove',
        kind: 'meet-aidong',
        characterId: '황금멍',
        label: '반짝이는 발자국',
      },
    ],
  },
}

function getConfig(islandId: string): AidongIslandConfig {
  const config = AIDONG_ISLAND_CONFIGS[islandId]
  if (!config) throw new ServiceError('invalid_aidong_island', 404)
  return config
}

function getArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function getObjectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)]
}

export function getAidongIslandConfig(islandId = 'first-aidong-island'): AidongIslandConfig {
  return getConfig(islandId)
}

export async function landAidongIsland(uid: string, islandId = 'first-aidong-island') {
  const config = getConfig(islandId)
  const repo = requireModuleRepo(MODULE_ID)
  const state = await repo.getOrCreate(uid) as LooseState
  const currentNodeId = config.initialNodeId

  return await repo.patch(uid, {
    moduleId: MODULE_ID,
    currentIslandId: islandId,
    currentNodeId,
    visitedIslandIds: uniqueStrings([...getArray(state.visitedIslandIds), islandId]),
    visitedNodeIds: uniqueStrings([...getArray(state.visitedNodeIds), currentNodeId]),
  })
}

export async function leaveAidongIsland(uid: string) {
  const repo = requireModuleRepo(MODULE_ID)
  return await repo.patch(uid, {
    currentIslandId: undefined,
    currentNodeId: undefined,
  })
}

export async function moveAidongIsland(uid: string, direction: Direction) {
  const repo = requireModuleRepo(MODULE_ID)
  const state = await repo.getOrCreate(uid) as LooseState
  const islandId = typeof state.currentIslandId === 'string' ? state.currentIslandId : undefined
  if (!islandId) throw new ServiceError('aidong_island_not_landed', 409)

  const config = getConfig(islandId)
  const currentNodeId = typeof state.currentNodeId === 'string' ? state.currentNodeId : config.initialNodeId
  const currentNode = config.nodes.find((node) => node.nodeId === currentNodeId)
  const nextNodeId = currentNode?.exits[direction]
  if (!nextNodeId) throw new ServiceError('invalid_aidong_island_exit', 400)

  return await repo.patch(uid, {
    currentNodeId: nextNodeId,
    visitedNodeIds: uniqueStrings([...getArray(state.visitedNodeIds), currentNodeId, nextNodeId]),
  })
}

export async function interactAidongIsland(uid: string, hotspotId: string) {
  const repo = requireModuleRepo(MODULE_ID)
  const state = await repo.getOrCreate(uid) as LooseState
  const islandId = typeof state.currentIslandId === 'string' ? state.currentIslandId : undefined
  if (!islandId) throw new ServiceError('aidong_island_not_landed', 409)

  const config = getConfig(islandId)
  const currentNodeId = typeof state.currentNodeId === 'string' ? state.currentNodeId : config.initialNodeId
  const hotspot = config.hotspots.find((item) => item.hotspotId === hotspotId)
  if (!hotspot) throw new ServiceError('invalid_aidong_island_hotspot', 400)
  if (hotspot.nodeId !== currentNodeId) throw new ServiceError('aidong_island_hotspot_not_here', 409)

  const interactionLog = getObjectRecord(state.interactionLog)
  const currentLog = getObjectRecord(interactionLog[hotspotId])
  const metAidongIds = getArray(state.metAidongIds)
  const recruitmentCandidates = getObjectRecord(state.recruitmentCandidates)
  const now = Date.now()
  let candidate

  if (hotspot.kind === 'meet-aidong' && hotspot.characterId) {
    candidate = {
      ...(getObjectRecord(recruitmentCandidates[hotspot.characterId])),
      characterId: hotspot.characterId,
      status: 'recruitable',
      metAt: Number(getObjectRecord(recruitmentCandidates[hotspot.characterId]).metAt ?? now),
      recruitableAt: now,
      sourceIslandId: islandId,
    }
  }

  const nextState = await repo.patch(uid, {
    metAidongIds: hotspot.characterId ? uniqueStrings([...metAidongIds, hotspot.characterId]) : metAidongIds,
    recruitmentCandidates: candidate && hotspot.characterId
      ? {
          ...recruitmentCandidates,
          [hotspot.characterId]: candidate,
        }
      : recruitmentCandidates,
    interactionLog: {
      ...interactionLog,
      [hotspotId]: {
        interacted: true,
        count: Number(currentLog.count ?? 0) + 1,
        lastInteractedAt: now,
      },
    },
  })

  return { state: nextState, hotspot, candidate }
}

export async function recruitFromAidongIsland(uid: string, characterId: string) {
  const repo = requireModuleRepo(MODULE_ID)
  const state = await repo.getOrCreate(uid) as LooseState
  const recruitmentCandidates = getObjectRecord(state.recruitmentCandidates)
  const candidate = getObjectRecord(recruitmentCandidates[characterId])

  if (candidate.status !== 'recruitable' && candidate.status !== 'recruited') {
    throw new ServiceError('aidong_island_candidate_not_recruitable', 409)
  }

  const aidongState = await recruitAidong(uid, characterId)
  const recruitedAidongIds = uniqueStrings([...getArray(state.recruitedAidongIds), characterId])
  const now = Date.now()
  const islandState = await repo.patch(uid, {
    recruitedAidongIds,
    recruitmentCandidates: {
      ...recruitmentCandidates,
      [characterId]: {
        ...candidate,
        characterId,
        status: 'recruited',
        recruitedAt: now,
      },
    },
  })

  return {
    state: islandState,
    aidongState,
    nextActions: ['my-island/slots/incorporate'],
  }
}