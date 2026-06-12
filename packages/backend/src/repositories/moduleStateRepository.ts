/**
 * packages/backend/src/repositories/moduleStateRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import type { ClientSession } from 'mongoose'
import type { ModuleStateDoc } from '../models/ModuleStateModel.js'

export interface ModuleStateRepository {
  getState(uid: string, moduleId: string, session?: ClientSession): Promise<ModuleStateDoc | undefined>
  upsertState(uid: string, moduleId: string, state: Record<string, unknown>, session?: ClientSession): Promise<ModuleStateDoc>
  patchState(uid: string, moduleId: string, patch: Record<string, unknown>, session?: ClientSession): Promise<ModuleStateDoc>
}






