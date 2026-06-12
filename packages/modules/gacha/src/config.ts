/**
 * 📁 gacha/src/config.ts — DI(의존성 주입) 훅 설정
 * ───────────────────────────────────────────────
 * 📌 역할: gacha 모듈이 frontend store 를 직접 import 하지 않고
 *           시도 카운트·통계 콜백을 외부에서 주입받기.
 *
 * 🔗 연결:
 *   - frontend bootstrap (lib/gachaBootstrap.ts) 1회 configure 호출
 *   - pick.ts 에서 getHooks().onAttempt 호출
 *
 * 💡 초보자 안내:
 *   - configure() 미호출이어도 동작 (콜백 단순 skip).
 *   - 사용 예 (frontend):
 *       configure({
 *         onAttempt: (poolId) => useUserStore.setState((s) => ({
 *           firstGachaAttempts: s.firstGachaAttempts + 1
 *         })),
 *       })
 */

/** gacha DI 훅 묶음. */
export interface GachaHooks {
  /**
   * 픽 시 호출. poolId 로 어느 풀에서 뽑혔는지 구분.
   * frontend 가 store 의 시도 카운트·통계를 갱신할 자리.
   */
  onAttempt?: (poolId: string) => void

  /**
   * 명시적 재추첨 카운트 증가 — 시나리오 trigger 'gacha_retry' 에서 호출.
   * onAttempt 와 분리 (onAttempt = pick 자동·incrementRetry = 사용자 명시).
   */
  incrementRetry?: (poolId: string) => void
}

let _hooks: GachaHooks = {}

export function configure(hooks: GachaHooks): void {
  _hooks = { ..._hooks, ...hooks }
}

export function getHooks(): GachaHooks {
  return _hooks
}

/** 테스트·HMR 용 초기화. */
export function _resetForTest(): void {
  _hooks = {}
}
