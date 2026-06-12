/**
 * 📁 cutscene-runner/src/config.ts — DI 훅
 * ───────────────────────────────────────────────
 * 📌 역할: cutscene-runner 가 frontend store 를 직접 import 하지 않고
 *           영속(watched) · 추가 게이트(shouldFire) 를 외부에서 주입받기.
 *
 * 🔗 연결:
 *   - frontend bootstrap (lib/cutsceneBootstrap.tsx) 1회 configure 호출
 *   - registry.ts 에서 getHooks() 로 조회
 */
import type { CutsceneRegistration } from './types.ts'

export interface CutsceneRunnerHooks {
  /** watched 마커 영속 — frontend localStorage 또는 store. */
  isWatched?: (key: string) => boolean
  markWatched?: (key: string) => void

  /**
   * 추가 게이트 — 매 findFor 시 평가.
   * 예: 차일드 잠금·모달 열림 중·dialog 활성 시 false 반환.
   */
  shouldFire?: (reg: CutsceneRegistration) => boolean
}

let _hooks: CutsceneRunnerHooks = {}

export function configure(hooks: CutsceneRunnerHooks): void {
  _hooks = { ..._hooks, ...hooks }
}

export function getHooks(): CutsceneRunnerHooks {
  return _hooks
}

export function _resetForTest(): void {
  _hooks = {}
}
