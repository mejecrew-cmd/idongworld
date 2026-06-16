/**
 * packages/backend/src/modules/route-neighbor/landing.ts
 * ------------------------------------------------------------
 * 역할: route-neighbor 보드 칸에 도착했을 때 열릴 목적지와 보상 후보를 정의한다.
 * 연결: rollRoute는 이 데이터를 응답하고, clearCurrentLanding은 mission rewards를 backend 권위로 지급한다.
 * 주의: 항해 도착 섬 보상은 destination island 모듈 상태에 우선 저장한다.
 */
export type RouteLandingSlotType =
  | 'home'
  | 'character'
  | 'treasure'
  | 'storm'
  | 'resource'
  | 'empty'

export type RouteLandingWorldScope = 'home-island' | 'destination-island' | 'voyage-route'

export interface RouteLandingReward {
  scope: 'module' | 'host'
  moduleId?: string
  resource: string
  amount: number
  compatibility?: boolean
}

export interface RouteLandingMission {
  missionId: string
  startAction: string
  clearAction: string
  rewards: RouteLandingReward[]
}

export interface RouteLandingCandidate {
  landingId: string
  routeId: string
  boardPosition: number
  slotType: RouteLandingSlotType
  label: string
  targetWorldScope: RouteLandingWorldScope
  landingModuleId: string
  action: string
  screenPath?: string
  characterId?: string
  mission?: RouteLandingMission
}

const BOARD_SIZE = 30
const CHARACTER_SLOT_INDEXES = [4, 10, 17, 23]
const RESOURCE_SLOT_INDEXES = [6, 14, 22, 28]
const TREASURE_SLOT_INDEXES = [7, 13, 20, 26]
const STORM_SLOT_INDEXES = [3, 15, 25]

const CHARACTER_IDS = ['황금멍', '춤냥', '묘세공', '풍풍보']
const DEFAULT_DESTINATION_ISLAND_MODULE_ID = 'destination-shell-island'
const DEFAULT_DESTINATION_ISLAND_PATH = '/voyage/island/shell'

function normalizePosition(position: number): number {
  return ((position % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE
}

function makeLandingId(routeId: string, boardPosition: number): string {
  return `${routeId}:${boardPosition}`
}

function characterIdForPosition(boardPosition: number): string | undefined {
  const order = CHARACTER_SLOT_INDEXES.indexOf(boardPosition)
  return order >= 0 ? CHARACTER_IDS[order] : undefined
}

export function getRouteLandingCandidate(routeId: string, position: number): RouteLandingCandidate {
  const boardPosition = normalizePosition(position)
  const landingId = makeLandingId(routeId, boardPosition)

  if (boardPosition === 0) {
    return {
      landingId,
      routeId,
      boardPosition,
      slotType: 'home',
      label: '항구',
      targetWorldScope: 'home-island',
      landingModuleId: 'ship',
      action: 'return-harbor',
      screenPath: '/island/harbor',
    }
  }

  const characterId = characterIdForPosition(boardPosition)
  if (characterId) {
    return {
      landingId,
      routeId,
      boardPosition,
      slotType: 'character',
      label: `${characterId}의 섬`,
      targetWorldScope: 'destination-island',
      landingModuleId: DEFAULT_DESTINATION_ISLAND_MODULE_ID,
      action: 'character-landing',
      screenPath: DEFAULT_DESTINATION_ISLAND_PATH,
      characterId,
    }
  }

  if (RESOURCE_SLOT_INDEXES.includes(boardPosition)) {
    return {
      landingId,
      routeId,
      boardPosition,
      slotType: 'resource',
      label: '조개빛 섬',
      targetWorldScope: 'destination-island',
      landingModuleId: DEFAULT_DESTINATION_ISLAND_MODULE_ID,
      action: 'destination-resource-mission',
      screenPath: DEFAULT_DESTINATION_ISLAND_PATH,
      mission: {
        missionId: `${landingId}:resource-mission`,
        startAction: '/api/modules/route-neighbor/landing/current',
        clearAction: '/api/modules/route-neighbor/landing/clear',
        rewards: [
          {
            scope: 'module',
            moduleId: DEFAULT_DESTINATION_ISLAND_MODULE_ID,
            resource: 'shell-fragment',
            amount: 1,
          },
          {
            scope: 'module',
            moduleId: 'route-neighbor',
            resource: 'deck-cargo',
            amount: 1,
            compatibility: true,
          },
        ],
      },
    }
  }

  if (TREASURE_SLOT_INDEXES.includes(boardPosition)) {
    return {
      landingId,
      routeId,
      boardPosition,
      slotType: 'treasure',
      label: '보물섬',
      targetWorldScope: 'destination-island',
      landingModuleId: DEFAULT_DESTINATION_ISLAND_MODULE_ID,
      action: 'treasure-landing',
      screenPath: DEFAULT_DESTINATION_ISLAND_PATH,
      mission: {
        missionId: `${landingId}:treasure-mission`,
        startAction: '/api/modules/route-neighbor/landing/current',
        clearAction: '/api/modules/route-neighbor/landing/clear',
        rewards: [
          {
            scope: 'host',
            resource: 'coins',
            amount: 30,
          },
        ],
      },
    }
  }

  if (STORM_SLOT_INDEXES.includes(boardPosition)) {
    return {
      landingId,
      routeId,
      boardPosition,
      slotType: 'storm',
      label: '폭풍',
      targetWorldScope: 'voyage-route',
      landingModuleId: 'route-neighbor',
      action: 'storm-event',
    }
  }

  return {
    landingId,
    routeId,
    boardPosition,
    slotType: 'empty',
    label: '빈 바다',
    targetWorldScope: 'voyage-route',
    landingModuleId: 'route-neighbor',
    action: 'pass',
  }
}
