/**
 * 📁 my-island/src/config.ts — DI 훅
 */
import type { BuildPhaseContext, UserProgressContext } from './types.ts'

export interface MyIslandHooks {
  getBuildContext?: () => BuildPhaseContext
  getUserProgress?: () => UserProgressContext

  doUnlockZone?: (zoneId: string) => void
  doMarkZoneClear?: (zoneId: string) => void
  doCompleteTutorial?: () => void
}

let _hooks: MyIslandHooks = {}
export function configure(hooks: MyIslandHooks): void {
  _hooks = { ..._hooks, ...hooks }
}
export function getHooks(): MyIslandHooks {
  return _hooks
}
export function _resetForTest(): void {
  _hooks = {}
}
