/**
 * packages/backend/src/repositories/mongoDedicatedRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import type { Model } from 'mongoose'
import type { DedicatedModuleStateRepository } from './dedicatedModuleStateRepository.js'

type BaseDoc = {
  uid: string
  createdAt: number
  updatedAt: number
}

function cleanDoc<TState extends object>(doc: unknown): TState {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  return plain as TState
}

function splitPatch<TState extends BaseDoc>(patch: Partial<TState>) {
  const set: Record<string, unknown> = {}
  const unset: Record<string, ''> = {}

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      unset[key] = ''
    } else {
      set[key] = value
    }
  }

  return { set, unset }
}

export function createMongoDedicatedRepository<TState extends BaseDoc>(
  model: Model<TState>,
  createDefault: (uid: string, seed?: Partial<TState>) => TState,
): DedicatedModuleStateRepository<TState> {
  function withDefaults(uid: string, state: TState): TState {
    return {
      ...createDefault(uid, state),
      ...state,
    }
  }

  return {
    async getOrCreate(uid, seed, session) {
      const doc = await model.findOneAndUpdate(
        { uid },
        { $setOnInsert: createDefault(uid, seed) },
        { upsert: true, new: true, lean: true, session },
      )
      return withDefaults(uid, cleanDoc<TState>(doc))
    },

    async patch(uid, patch, session) {
      await this.getOrCreate(uid, patch, session)
      const { set, unset } = splitPatch(patch)
      const update: Record<string, unknown> = {
        $set: { ...set, updatedAt: Date.now() },
      }
      if (Object.keys(unset).length > 0) {
        update.$unset = unset
      }
      const doc = await model.findOneAndUpdate(
        { uid },
        update,
        { new: true, lean: true, session },
      )
      if (!doc) throw new Error('dedicated_state_not_found')
      return withDefaults(uid, cleanDoc<TState>(doc))
    },
  }
}






