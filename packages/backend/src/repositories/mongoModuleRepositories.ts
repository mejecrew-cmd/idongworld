/**
 * packages/backend/src/repositories/mongoModuleRepositories.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import {
  AidongIslandStateModel,
  type AidongIslandStateDoc,
} from '../models/AidongIslandStateModel.js'
import { CodexStateModel, type CodexStateDoc } from '../models/CodexStateModel.js'
import {
  DestinationIslandStateModel,
  type DestinationIslandStateDoc,
} from '../models/DestinationIslandStateModel.js'
import { LodgeStateModel, type LodgeStateDoc } from '../models/LodgeStateModel.js'
import { MyAidongStateModel, type MyAidongStateDoc } from '../models/MyAidongStateModel.js'
import { MyIslandStateModel, type MyIslandStateDoc } from '../models/MyIslandStateModel.js'
import {
  RouteNeighborStateModel,
  type RouteNeighborStateDoc,
} from '../models/RouteNeighborStateModel.js'
import { ShipStateModel, type ShipStateDoc } from '../models/ShipStateModel.js'
import { ZoneStateModel, type ZoneStateDoc } from '../models/ZoneStateModel.js'
import { createMongoDedicatedRepository } from './mongoDedicatedRepository.js'
import {
  createAidongIslandDefault,
  createCodexDefault,
  createDestinationIslandDefault,
  createLodgeDefault,
  createMyAidongDefault,
  createMyIslandDefault,
  createRouteNeighborDefault,
  createShipDefault,
  createZoneDefault,
} from './moduleDefaults.js'

export const mongoMyAidongRepository =
  createMongoDedicatedRepository<MyAidongStateDoc>(MyAidongStateModel, createMyAidongDefault)

export const mongoMyIslandRepository =
  createMongoDedicatedRepository<MyIslandStateDoc>(MyIslandStateModel, createMyIslandDefault)

export const mongoCodexRepository =
  createMongoDedicatedRepository<CodexStateDoc>(CodexStateModel, createCodexDefault)

export const mongoLodgeRepository =
  createMongoDedicatedRepository<LodgeStateDoc>(LodgeStateModel, createLodgeDefault)

export const mongoRouteNeighborRepository =
  createMongoDedicatedRepository<RouteNeighborStateDoc>(
    RouteNeighborStateModel,
    createRouteNeighborDefault,
  )

export const mongoShipRepository =
  createMongoDedicatedRepository<ShipStateDoc>(ShipStateModel, createShipDefault)

export const mongoAidongIslandRepository =
  createMongoDedicatedRepository<AidongIslandStateDoc>(AidongIslandStateModel, createAidongIslandDefault)

export function createMongoZoneRepository(moduleId: string) {
  return createMongoDedicatedRepository<ZoneStateDoc>(
    ZoneStateModel,
    (uid, seed) => createZoneDefault(uid, moduleId, seed),
  )
}

export function createMongoDestinationIslandRepository(
  moduleId: string,
  initialNodeId = 'beach-center',
) {
  return createMongoDedicatedRepository<DestinationIslandStateDoc>(
    DestinationIslandStateModel,
    (uid, seed) => createDestinationIslandDefault(uid, moduleId, initialNodeId, seed),
  )
}






