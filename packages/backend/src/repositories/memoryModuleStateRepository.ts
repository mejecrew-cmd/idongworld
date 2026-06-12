/**
 * packages/backend/src/repositories/memoryModuleStateRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import type { ModuleStateDoc } from '../models/ModuleStateModel.js'
import type { ModuleStateRepository } from './moduleStateRepository.js'

const moduleStates = new Map<string, ModuleStateDoc>()

function keyOf(uid: string, moduleId: string): string {
  return `${uid}:${moduleId}`
}

export const memoryModuleStateRepository: ModuleStateRepository = {
  async getState(uid, moduleId, _session) {
    return moduleStates.get(keyOf(uid, moduleId))
  },

  async upsertState(uid, moduleId, state, _session) {
    const key = keyOf(uid, moduleId)
    const now = Date.now()
    const current = moduleStates.get(key)
    const doc: ModuleStateDoc = {
      uid,
      moduleId,
      state,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    }
    moduleStates.set(key, doc)
    return doc
  },

  async patchState(uid, moduleId, patch, session) {
    const current = moduleStates.get(keyOf(uid, moduleId))?.state ?? {}
    return this.upsertState(uid, moduleId, { ...current, ...patch }, session)
  },
}






