/**
 * 📁 host/src/index.ts — @idongworld/host 공개 표면
 *
 * 사용 예 (다른 모듈):
 *   import { rewardCoins, spendGems, addMaterial } from '@idongworld/host'
 *
 * 사용 예 (frontend bootstrap):
 *   import { configure } from '@idongworld/host'
 */
export type * from './types.ts'
export {
  getResources,
  rewardCoins,
  spendCoins,
  rewardGems,
  spendGems,
  rewardDiamonds,
  rewardDice,
  addMaterial,
  consumeMaterial,
} from './actions.ts'
export { configure, getHooks } from './config.ts'
export type { HostHooks } from './config.ts'

export { balance, getBalance } from './balance.ts'

import { getBalance as _getBalance } from './balance.ts'

/** balance.csv 기반: 게임 시작 시 코인. */
export function getInitialCoins(): number {
  return _getBalance('initial_coins', 100)
}

/** balance.csv 기반: 게임 시작 시 보석. */
export function getInitialGems(): number {
  return _getBalance('initial_gems', 0)
}

/** balance.csv 기반: 게임 시작 시 다이아 (BM 재화). */
export function getInitialDiamonds(): number {
  return _getBalance('initial_diamonds', 0)
}

/** balance.csv 기반: 게임 시작 시 주사위 잔량. */
export function getInitialDice(): number {
  return _getBalance('initial_dice', 6)
}

/** balance.csv 기반: 항구 충전 시 다이스 최대 누적. */
export function getDiceMaxCapacity(): number {
  return _getBalance('dice_max_capacity', 30)
}

/** balance.csv 기반: backend sync 디바운스 (ms). */
export function getSyncDebounceMs(): number {
  return _getBalance('sync_debounce_ms', 5_000)
}
