/**
 * lodge/src/config.ts - DI 훅
 *
 * lodge 모듈은 frontend store 구현을 직접 import하지 않는다.
 * bootstrap이 필요한 read/mutate 함수를 주입하고, 공개 action은 이 훅만 호출한다.
 */
import type { LodgeStateSnapshot } from './types.ts'

export interface LodgeHooks {
  getLodgeState?: () => LodgeStateSnapshot
  doToggleAssignedAidong?: (characterId: string) => void
}

let hooks: LodgeHooks = {}

export function configure(nextHooks: LodgeHooks): void {
  hooks = { ...hooks, ...nextHooks }
}

export function getHooks(): LodgeHooks {
  return hooks
}

export function _resetForTest(): void {
  hooks = {}
}
