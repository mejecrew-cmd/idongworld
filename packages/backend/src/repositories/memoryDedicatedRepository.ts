/**
 * packages/backend/src/repositories/memoryDedicatedRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import type { DedicatedModuleStateRepository } from './dedicatedModuleStateRepository.js'

type BaseDoc = {
  uid: string
  createdAt: number
  updatedAt: number
}

function applyPatch<TState extends BaseDoc>(current: TState, patch: Partial<TState>): TState {
  const updated = {
    ...current,
    updatedAt: Date.now(),
  } as Record<string, unknown>

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete updated[key]
    } else {
      updated[key] = value
    }
  }

  return updated as TState
}

export function createMemoryDedicatedRepository<TState extends BaseDoc>(
  createDefault: (uid: string, seed?: Partial<TState>) => TState,
): DedicatedModuleStateRepository<TState> {
  const states = new Map<string, TState>()

  function withDefaults(state: TState): TState {
    return {
      ...createDefault(state.uid, state),
      ...state,
    }
  }

  return {
    async getOrCreate(uid, seed, _session) {
      const current = states.get(uid)
      if (current) {
        const normalized = withDefaults(current)
        states.set(uid, normalized)
        return normalized
      }
      const created = createDefault(uid, seed)
      states.set(uid, created)
      return created
    },

    async patch(uid, patch, _session) {
      const current = await this.getOrCreate(uid, patch)
      const updated = applyPatch(current, patch)
      states.set(uid, updated)
      return updated
    },
  }
}






