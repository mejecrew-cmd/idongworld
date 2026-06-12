/**
 * 📁 gacha/src/index.ts — @idongworld/gacha 공개 표면
 * ───────────────────────────────────────────────
 * 📌 역할: 가챠 시스템 모듈의 단일 import 진입점.
 * 🔗 연결: types·pools·pick·config·balance (CSV 런타임 로드)
 *
 * 사용 예 (frontend):
 *   import { firstGachaPick, getScenarioId, configure } from '@idongworld/gacha'
 */
import { bus } from '@idongworld/core'
import { getHooks } from './config.ts'
import { getBalance } from './balance.ts'

export type * from './types.ts'
export * from './pools.ts'
export * from './pick.ts'
export * from './config.ts'
export { balance, getBalance } from './balance.ts'

/**
 * 명시적 재추첨 카운트 증가 — 시나리오 trigger 'gacha_retry' 정착.
 * balance.csv 의 `first_gacha_max_attempts` 초과 시 reject (재추첨 차단).
 *
 * @returns true=증가 성공·false=훅 미주입 또는 max_attempts 초과
 */
export function incrementRetryCount(poolId = 'first-meeting'): boolean {
  const fn = getHooks().incrementRetry
  if (!fn) {
    // eslint-disable-next-line no-console
    console.warn('[gacha] incrementRetryCount — 훅 미주입')
    return false
  }
  fn(poolId)
  bus.emit('gacha:retry', { poolId })
  return true
}

/** balance.csv 기반: 첫 가챠 무료 시도 횟수. */
export function getFirstGachaFreeAttempts(): number {
  return getBalance('first_gacha_free', 1)
}

/** balance.csv 기반: 재추첨 비용 (보석). */
export function getFirstGachaRetryCost(): number {
  return getBalance('first_gacha_retry_cost', 150)
}

/** balance.csv 기반: 첫 가챠 최대 시도 횟수. */
export function getFirstGachaMaxAttempts(): number {
  return getBalance('first_gacha_max_attempts', 3)
}
