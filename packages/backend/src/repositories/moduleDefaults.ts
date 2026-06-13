/**
 * packages/backend/src/repositories/moduleDefaults.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import type { AidongIslandStateDoc } from '../models/AidongIslandStateModel.js'
import type { CodexStateDoc } from '../models/CodexStateModel.js'
import type { DestinationIslandStateDoc } from '../models/DestinationIslandStateModel.js'
import type { LodgeStateDoc } from '../models/LodgeStateModel.js'
import type { MyAidongStateDoc } from '../models/MyAidongStateModel.js'
import type {
  MyIslandStateDoc,
  MyIslandZoneSlot,
} from '../models/MyIslandStateModel.js'
import type { RouteNeighborStateDoc } from '../models/RouteNeighborStateModel.js'
import type { ShipStateDoc } from '../models/ShipStateModel.js'
import type { ZoneStateDoc } from '../models/ZoneStateModel.js'
import { getDefaultShipTypeConfig } from '../modules/ship/balance.js'

export function createMyAidongDefault(uid: string, seed: Partial<MyAidongStateDoc> = {}): MyAidongStateDoc {
  const now = Date.now()
  return {
    uid,
    recruitedAidongs: seed.recruitedAidongs ?? [],
    firstGachaCandidate: seed.firstGachaCandidate,
    firstGachaAttempts: seed.firstGachaAttempts ?? 0,
    affinities: seed.affinities ?? {},
    needs: seed.needs ?? {},
    careLog: seed.careLog ?? {},
    lastSequenceZone: seed.lastSequenceZone ?? {},
    lastSequenceAt: seed.lastSequenceAt ?? {},
    equippedOutfit: seed.equippedOutfit ?? {},
    equippedItems: seed.equippedItems ?? {},
    aidongCodexItems: seed.aidongCodexItems ?? {},
    aidongUpgradeState: seed.aidongUpgradeState ?? {},
    createdAt: now,
    updatedAt: now,
  }
}

export function createMyIslandDefault(uid: string, seed: Partial<MyIslandStateDoc> = {}): MyIslandStateDoc {
  const now = Date.now()
  return {
    uid,
    unlockedZones: seed.unlockedZones ?? [],
    zoneSlots: {
      ...createDefaultMyIslandZoneSlots(),
      ...(seed.zoneSlots ?? {}),
    },
    dynamicAidongZones: seed.dynamicAidongZones ?? {},
    zoneProgress: seed.zoneProgress ?? {},
    createdAt: now,
    updatedAt: now,
  }
}

export function createCodexDefault(uid: string, seed: Partial<CodexStateDoc> = {}): CodexStateDoc {
  const now = Date.now()
  return {
    uid,
    unlockedDiaries: seed.unlockedDiaries ?? [],
    unlockedCodexEntries: seed.unlockedCodexEntries ?? [],
    codexFullyRegistered: seed.codexFullyRegistered ?? [],
    createdAt: now,
    updatedAt: now,
  }
}

export function createLodgeDefault(uid: string, seed: Partial<LodgeStateDoc> = {}): LodgeStateDoc {
  const now = Date.now()
  return {
    uid,
    lodgeInventory: seed.lodgeInventory ?? {},
    assignedAidongs: seed.assignedAidongs ?? [],
    rooms: seed.rooms ?? {},
    furniture: seed.furniture ?? {},
    createdAt: now,
    updatedAt: now,
  }
}

function createSlot(
  areaNo: string,
  areaId: string,
  kind: MyIslandZoneSlot['kind'],
): MyIslandZoneSlot {
  return {
    areaNo,
    areaId,
    kind,
    state: kind === 'anchor' ? 'locked' : 'empty',
    source: 'default',
  }
}

export function createDefaultMyIslandZoneSlots(): Record<string, MyIslandZoneSlot> {
  return {
    'AREA-01': createSlot('AREA-01', 'lighthouse', 'fillable'),
    'AREA-02': createSlot('AREA-02', 'harbor', 'anchor'),
    'AREA-03': createSlot('AREA-03', 'memory-forest', 'fillable'),
    'AREA-04': createSlot('AREA-04', 'worry-cave', 'fillable'),
    'AREA-05': createSlot('AREA-05', 'confidence-waterfall', 'fillable'),
    'AREA-06': createSlot('AREA-06', 'oasis', 'fillable'),
    'AREA-07': createSlot('AREA-07', 'sand-square', 'fillable'),
    'AREA-08': createSlot('AREA-08', 'reflection-trail', 'fillable'),
    'AREA-09': createSlot('AREA-09', 'goal-mountain', 'fillable'),
    'AREA-10': createSlot('AREA-10', 'friendship-bridge', 'fillable'),
    'AREA-11': createSlot('AREA-11', 'creative-spring', 'fillable'),
    'AREA-12': createSlot('AREA-12', 'challenge-cliff', 'fillable'),
    'AREA-13': createSlot('AREA-13', 'lodge', 'anchor'),
    'AREA-14': createSlot('AREA-14', 'growth-garden', 'fillable'),
    'AREA-15': createSlot('AREA-15', 'regret-lake', 'fillable'),
  }
}

export function createRouteNeighborDefault(
  uid: string,
  seed: Partial<RouteNeighborStateDoc> = {},
): RouteNeighborStateDoc {
  const now = Date.now()
  return {
    uid,
    currentRoute: seed.currentRoute,
    boardPosition: seed.boardPosition ?? 0,
    localResources: seed.localResources ?? {},
    landings: seed.landings ?? {},
    progress: seed.progress ?? {},
    createdAt: now,
    updatedAt: now,
  }
}

export function createShipDefault(uid: string, seed: Partial<ShipStateDoc> = {}): ShipStateDoc {
  const now = Date.now()
  return {
    uid,
    shipTypeId: seed.shipTypeId ?? getDefaultShipTypeConfig().shipTypeId,
    harborAssignedChars: seed.harborAssignedChars ?? [],
    harborLastChargedAt: seed.harborLastChargedAt,
    shipInventory: seed.shipInventory ?? {},
    cabinAssignments: seed.cabinAssignments ?? {},
    deckAssignments: seed.deckAssignments ?? {},
    cabinFurniture: seed.cabinFurniture ?? {},
    cargo: seed.cargo ?? {},
    cabins: seed.cabins ?? {},
    createdAt: now,
    updatedAt: now,
  }
}

export function createZoneDefault(
  uid: string,
  moduleId: string,
  seed: Partial<ZoneStateDoc> = {},
): ZoneStateDoc {
  const now = Date.now()
  return {
    uid,
    moduleId,
    localResources: seed.localResources ?? {},
    clearedCount: seed.clearedCount ?? 0,
    progress: seed.progress ?? {},
    createdAt: now,
    updatedAt: now,
  }
}

export function createDestinationIslandDefault(
  uid: string,
  moduleId: string,
  initialNodeId = 'beach-center',
  seed: Partial<DestinationIslandStateDoc> = {},
): DestinationIslandStateDoc {
  const now = Date.now()
  const currentNodeId = seed.currentNodeId ?? initialNodeId

  return {
    uid,
    moduleId,
    currentNodeId,
    visitedNodeIds: seed.visitedNodeIds ?? [currentNodeId],
    clearedMissionIds: seed.clearedMissionIds ?? [],
    localResources: seed.localResources ?? {},
    localInventory: seed.localInventory ?? {},
    hotspotStates: seed.hotspotStates ?? {},
    createdAt: now,
    updatedAt: now,
  }
}
export function createAidongIslandDefault(
  uid: string,
  seed: Partial<AidongIslandStateDoc> = {},
): AidongIslandStateDoc {
  const now = Date.now()

  return {
    uid,
    moduleId: seed.moduleId ?? 'aidong-island',
    currentIslandId: seed.currentIslandId,
    currentNodeId: seed.currentNodeId,
    visitedIslandIds: seed.visitedIslandIds ?? [],
    visitedNodeIds: seed.visitedNodeIds ?? [],
    metAidongIds: seed.metAidongIds ?? [],
    recruitedAidongIds: seed.recruitedAidongIds ?? [],
    recruitmentCandidates: seed.recruitmentCandidates ?? {},
    interactionLog: seed.interactionLog ?? {},
    createdAt: now,
    updatedAt: now,
  }
}






