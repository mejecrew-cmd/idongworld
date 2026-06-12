/**
 * my-aidong/src/config.ts
 * ------------------------------------------------------------
 * 역할: my-aidong 모듈이 외부 상태 저장소와 연결될 수 있도록 hook을 주입받는 DI 지점이다.
 * 연결: frontend bootstrap이 userStore 기반 구현을 configure()로 넣고, actions.ts는 getHooks()만 사용한다.
 * 주의: 모듈 패키지가 특정 store 구현에 직접 의존하지 않도록 hook surface를 작게 유지한다.
 */
import type { Affinity, CareApplyResult, NeedsState } from './types.ts'

export interface MyAidongHooks {
  /** 영입된 Aidong id 목록. */
  getRecruited?: () => string[]
  /** Aidong 영입 처리. */
  doRecruit?: (id: string) => void

  /** 특정 Aidong의 친밀도 조회. */
  getAffinityFor?: (id: string) => Affinity
  /** 친밀도 변경. delta는 양수/음수 모두 허용한다. */
  doAddAffinity?: (id: string, delta: number) => void

  /** 특정 Aidong의 6개 욕구 조회. */
  getNeedsFor?: (id: string) => NeedsState | undefined
  /** 시퀀스 진입 시 욕구 감소 적용. */
  doTickDecay?: (id: string) => void

  /** 케어 액션 적용. cooldown, daily cap, 자원 검증은 주입된 store 구현이 처리한다. */
  doApplyCareAction?: (charId: string, actionId: string) => CareApplyResult
}

let _hooks: MyAidongHooks = {}

export function configure(hooks: MyAidongHooks): void {
  _hooks = { ..._hooks, ...hooks }
}

export function getHooks(): MyAidongHooks {
  return _hooks
}

export function _resetForTest(): void {
  _hooks = {}
}


