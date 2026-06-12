/**
 * packages/backend/src/repositories/memoryModuleRepositories.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import type { CodexStateDoc } from '../models/CodexStateModel.js'
import type { DestinationIslandStateDoc } from '../models/DestinationIslandStateModel.js'
import type { LodgeStateDoc } from '../models/LodgeStateModel.js'
import type { MyAidongStateDoc } from '../models/MyAidongStateModel.js'
import type { MyIslandStateDoc } from '../models/MyIslandStateModel.js'
import type { RouteNeighborStateDoc } from '../models/RouteNeighborStateModel.js'
import type { ShipStateDoc } from '../models/ShipStateModel.js'
import type { ZoneStateDoc } from '../models/ZoneStateModel.js'
import { createMemoryDedicatedRepository } from './memoryDedicatedRepository.js'
import {
  createCodexDefault,
  createDestinationIslandDefault,
  createLodgeDefault,
  createMyAidongDefault,
  createMyIslandDefault,
  createRouteNeighborDefault,
  createShipDefault,
  createZoneDefault,
} from './moduleDefaults.js'

export const memoryMyAidongRepository =
  createMemoryDedicatedRepository<MyAidongStateDoc>(createMyAidongDefault)

export const memoryMyIslandRepository =
  createMemoryDedicatedRepository<MyIslandStateDoc>(createMyIslandDefault)

export const memoryCodexRepository =
  createMemoryDedicatedRepository<CodexStateDoc>(createCodexDefault)

export const memoryLodgeRepository =
  createMemoryDedicatedRepository<LodgeStateDoc>(createLodgeDefault)

export const memoryRouteNeighborRepository =
  createMemoryDedicatedRepository<RouteNeighborStateDoc>(createRouteNeighborDefault)

export const memoryShipRepository =
  createMemoryDedicatedRepository<ShipStateDoc>(createShipDefault)

export function createMemoryZoneRepository(moduleId: string) {
  return createMemoryDedicatedRepository<ZoneStateDoc>(
    (uid, seed) => createZoneDefault(uid, moduleId, seed),
  )
}

export function createMemoryDestinationIslandRepository(
  moduleId: string,
  initialNodeId = 'beach-center',
) {
  return createMemoryDedicatedRepository<DestinationIslandStateDoc>(
    (uid, seed) => createDestinationIslandDefault(uid, moduleId, initialNodeId, seed),
  )
}






