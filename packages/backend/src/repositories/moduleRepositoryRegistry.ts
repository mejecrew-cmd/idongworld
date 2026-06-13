/**
 * packages/backend/src/repositories/moduleRepositoryRegistry.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import type { DedicatedModuleStateRepository } from './dedicatedModuleStateRepository.js'
import {
  createMemoryDestinationIslandRepository,
  createMemoryZoneRepository,
  memoryAidongIslandRepository,
  memoryLodgeRepository,
  memoryCodexRepository,
  memoryMyAidongRepository,
  memoryMyIslandRepository,
  memoryRouteNeighborRepository,
  memoryShipRepository,
} from './memoryModuleRepositories.js'
import {
  createMongoDestinationIslandRepository,
  createMongoZoneRepository,
  mongoAidongIslandRepository,
  mongoLodgeRepository,
  mongoCodexRepository,
  mongoMyAidongRepository,
  mongoMyIslandRepository,
  mongoRouteNeighborRepository,
  mongoShipRepository,
} from './mongoModuleRepositories.js'

export type ModuleRepositoryMap = Record<string, DedicatedModuleStateRepository<object>>

const ZONE_MODULE_IDS = ['zone-garden', 'zone-oasis', 'zone-memory', 'zone-mine']
const DESTINATION_ISLAND_MODULE_IDS = ['destination-shell-island']

export function createDedicatedModuleRepositories(kind: 'memory' | 'mongo'): ModuleRepositoryMap {
  const isMongo = kind === 'mongo'
  const repositories: ModuleRepositoryMap = {
    'my-aidong': (isMongo ? mongoMyAidongRepository : memoryMyAidongRepository) as DedicatedModuleStateRepository<object>,
    'my-island': (isMongo ? mongoMyIslandRepository : memoryMyIslandRepository) as DedicatedModuleStateRepository<object>,
    codex: (isMongo ? mongoCodexRepository : memoryCodexRepository) as DedicatedModuleStateRepository<object>,
    lodge: (isMongo ? mongoLodgeRepository : memoryLodgeRepository) as DedicatedModuleStateRepository<object>,
    'route-neighbor': (isMongo ? mongoRouteNeighborRepository : memoryRouteNeighborRepository) as DedicatedModuleStateRepository<object>,
    ship: (isMongo ? mongoShipRepository : memoryShipRepository) as DedicatedModuleStateRepository<object>,
    'aidong-island': (isMongo ? mongoAidongIslandRepository : memoryAidongIslandRepository) as DedicatedModuleStateRepository<object>,
  }

  for (const moduleId of ZONE_MODULE_IDS) {
    repositories[moduleId] = (
      isMongo ? createMongoZoneRepository(moduleId) : createMemoryZoneRepository(moduleId)
    ) as DedicatedModuleStateRepository<object>
  }

  for (const moduleId of DESTINATION_ISLAND_MODULE_IDS) {
    repositories[moduleId] = (
      isMongo
        ? createMongoDestinationIslandRepository(moduleId)
        : createMemoryDestinationIslandRepository(moduleId)
    ) as DedicatedModuleStateRepository<object>
  }

  return repositories
}






