/**
 * packages/backend/src/repositories/mongoModuleStateRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import { ModuleStateModel, type ModuleStateDoc } from '../models/ModuleStateModel.js'
import type { ModuleStateRepository } from './moduleStateRepository.js'

function toModuleStateDoc(doc: unknown): ModuleStateDoc {
  return JSON.parse(JSON.stringify(doc)) as ModuleStateDoc
}

export const mongoModuleStateRepository: ModuleStateRepository = {
  async getState(uid, moduleId, session) {
    const doc = await ModuleStateModel.findOne({ uid, moduleId }).session(session ?? null).lean()
    return doc ? toModuleStateDoc(doc) : undefined
  },

  async upsertState(uid, moduleId, state, session) {
    const now = Date.now()
    const doc = await ModuleStateModel.findOneAndUpdate(
      { uid, moduleId },
      {
        $set: { state, updatedAt: now },
        $setOnInsert: { uid, moduleId, createdAt: now },
      },
      { upsert: true, new: true, lean: true, session },
    )
    return toModuleStateDoc(doc)
  },

  async patchState(uid, moduleId, patch, session) {
    const current = (await this.getState(uid, moduleId, session))?.state ?? {}
    return this.upsertState(uid, moduleId, { ...current, ...patch }, session)
  },
}






