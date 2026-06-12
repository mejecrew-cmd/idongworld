/**
 * 📁 host/src/config.ts — DI 훅 (frontend zustand 와 연결)
 * ───────────────────────────────────────────────
 * 📌 역할: host 모듈은 zustand 를 모름. 외부에서 read/mutate 함수 주입.
 *           frontend hostBootstrap.tsx 가 useUserStore 백업으로 1회 configure.
 *
 * 💡 mutate 패턴:
 *   - 결과는 Promise/sync 모두 OK
 *   - mutator 가 false 반환 → 자원 부족 등 거절 의미
 */
import type { HostResources, MaterialId } from './types.ts'

export interface HostHooks {
  /** 현재 자원 스냅샷 조회. */
  getResources?: () => HostResources

  /**
   * 코인 변경 (delta).
   * 양수 = 적립 / 음수 = 차감 (보유 부족 시 false).
   */
  mutateCoins?: (delta: number) => boolean

  /** 보석 변경. */
  mutateGems?: (delta: number) => boolean

  /** 다이아 변경 (Phase 2). */
  mutateDiamonds?: (delta: number) => boolean

  /** 주사위 변경. */
  mutateDice?: (delta: number) => boolean

  /** 인벤토리 변경. delta 양수 = 입수, 음수 = 사용 (부족 시 false). */
  mutateMaterial?: (id: MaterialId, delta: number) => boolean
}

let _hooks: HostHooks = {}

export function configure(hooks: HostHooks): void {
  _hooks = { ..._hooks, ...hooks }
}

export function getHooks(): HostHooks {
  return _hooks
}

export function _resetForTest(): void {
  _hooks = {}
}
