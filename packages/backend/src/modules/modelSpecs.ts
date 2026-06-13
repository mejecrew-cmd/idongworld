/**
 * packages/backend/src/modules/modelSpecs.ts
 * ------------------------------------------------------------
 * 역할: 모듈별 backend storage ownership을 선언하는 명세다.
 * 연결: 전용 repository가 있는 moduleId, collection, owned field를 health/check API에 제공한다.
 * 주의: 전용 저장소를 추가하거나 제거하면 moduleRepositoryRegistry와 반드시 맞춘다.
 */
export interface ModuleModelSpec {
  moduleId: string
  storage: 'moduleStates' | 'dedicated'
  collectionName: string
  ownedFields: string[]
  notes?: string
}

export const MODULE_MODEL_SPECS: ModuleModelSpec[] = [
  {
    moduleId: 'my-aidong',
    storage: 'dedicated',
    collectionName: 'myAidongStates',
    ownedFields: [
      'recruitedAidongs',
      'firstGachaCandidate',
      'firstGachaAttempts',
      'affinities',
      'needs',
      'careLog',
      'lastSequenceZone',
      'lastSequenceAt',
      'equippedOutfit',
      'equippedItems',
      'aidongCodexItems',
      'aidongUpgradeState',
    ],
    notes: 'Aidong 영입/욕구/착용 상태와 Phase 1 후보인 Aidong별 도감 아이템, 업그레이드 원장을 소유한다.',
  },
  {
    moduleId: 'my-island',
    storage: 'dedicated',
    collectionName: 'myIslandStates',
    ownedFields: ['unlockedZones', 'zoneSlots', 'dynamicAidongZones', 'zoneProgress'],
    notes: '고정 구역 해금, AREA-01~15 슬롯, 항해 만남으로 열린 Aidong 가변 구역 compat 목록을 소유한다.',
  },
  {
    moduleId: 'codex',
    storage: 'dedicated',
    collectionName: 'codexStates',
    ownedFields: ['unlockedDiaries', 'unlockedCodexEntries', 'codexFullyRegistered'],
  },
  {
    moduleId: 'lodge',
    storage: 'dedicated',
    collectionName: 'lodgeStates',
    ownedFields: ['lodgeInventory', 'assignedAidongs', 'rooms', 'furniture'],
    notes: '숙소 인벤토리와 숙소 배치 Aidong 목록을 소유한다. 다른 모듈과의 자원 이동은 customs를 통한다.',
  },
  {
    moduleId: 'route-neighbor',
    storage: 'dedicated',
    collectionName: 'routeNeighborStates',
    ownedFields: ['localResources', 'landings', 'progress'],
    notes: 'route-neighbor 전용 자원, landing clear 이력, Aidong 만남 수락 기록 후보를 소유한다. 현재 항해 route와 보드 위치는 브라우저 session state가 소유한다.',
  },
  {
    moduleId: 'ship',
    storage: 'dedicated',
    collectionName: 'shipStates',
    ownedFields: [
      'shipTypeId',
      'harborAssignedChars',
      'harborLastChargedAt',
      'shipInventory',
      'cabinAssignments',
      'deckAssignments',
      'cabinFurniture',
      'cargo',
      'cabins',
    ],
    notes: '`shipInventory`는 배 적재 자원의 권위 필드다. `cabinFurniture`는 선실 꾸미기 구매 수량 원장이다. `cargoCapacity`는 ship balance config에서 계산하며, `cargo`/`cabins`는 기존 예약 필드 호환용이다.',
  },
  {
    moduleId: 'aidong-island',
    storage: 'dedicated',
    collectionName: 'aidongIslandStates',
    ownedFields: [
      'currentIslandId',
      'currentNodeId',
      'visitedIslandIds',
      'visitedNodeIds',
      'metAidongIds',
      'recruitedAidongIds',
      'recruitmentCandidates',
      'interactionLog',
    ],
    notes: 'M22 아이동섬의 상륙 위치, 상호작용, 영입 후보와 섬 내부 영입 기록을 소유한다. 실제 Aidong 보유는 my-aidong, 마이섬 편입은 my-island가 소유한다.',
  },
  {
    moduleId: 'destination-shell-island',
    storage: 'dedicated',
    collectionName: 'destinationIslandStates',
    ownedFields: [
      'currentNodeId',
      'visitedNodeIds',
      'clearedMissionIds',
      'localResources',
      'localInventory',
      'hotspotStates',
    ],
    notes: '항해로 도착한 조개빛 섬의 고정맵 탐험 위치, 방문 이력, 미션, 섬 전용 자원/아이템을 소유한다.',
  },
  {
    moduleId: 'zone-garden',
    storage: 'dedicated',
    collectionName: 'zoneStates',
    ownedFields: ['localResources', 'clearedCount', 'progress'],
  },
  {
    moduleId: 'zone-oasis',
    storage: 'dedicated',
    collectionName: 'zoneStates',
    ownedFields: ['localResources', 'clearedCount', 'progress'],
  },
  {
    moduleId: 'zone-memory',
    storage: 'dedicated',
    collectionName: 'zoneStates',
    ownedFields: ['localResources', 'clearedCount', 'progress'],
  },
  {
    moduleId: 'zone-mine',
    storage: 'dedicated',
    collectionName: 'zoneStates',
    ownedFields: ['localResources', 'clearedCount', 'progress'],
  },
]

export function listModuleModelSpecs(): ModuleModelSpec[] {
  return MODULE_MODEL_SPECS
}

export function getModuleModelSpec(moduleId: string): ModuleModelSpec | undefined {
  return MODULE_MODEL_SPECS.find((spec) => spec.moduleId === moduleId)
}






