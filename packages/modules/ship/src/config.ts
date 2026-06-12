/**
 * 📁 ship/src/config.ts — DI 훅
 *
 * ship 모듈은 frontend store 구현을 직접 알지 않는다.
 * 앱 bootstrap이 필요한 read/mutate 함수를 주입하고, 모듈 공개 action은 이 훅만 호출한다.
 */
import type { ShipStateSnapshot } from './types.ts'

export interface ShipHooks {
  getShipState?: () => ShipStateSnapshot
  doToggleHarborAssign?: (characterId: string) => void
  doChargeDiceFromHarbor?: () => number
}

let hooks: ShipHooks = {}

export function configure(nextHooks: ShipHooks): void {
  hooks = { ...hooks, ...nextHooks }
}

export function getHooks(): ShipHooks {
  return hooks
}

export function _resetForTest(): void {
  hooks = {}
}
