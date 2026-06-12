/**
 * 📁 gacha/src/pick.ts — 가챠 픽 로직
 * ───────────────────────────────────────────────
 * 📌 역할: 풀에서 가중치 비례 1회 픽 + 시도 카운트 증가 콜백 호출.
 *
 * 🔗 연결:
 *   - types.ts (GachaPool·GachaResult)
 *   - pools.ts (FIRST_GACHA_POOL)
 *   - config.ts (getHooks().onAttempt)
 *   - 사용 측: FirstMeetingScreen.startGacha()
 *
 * 💡 알고리즘:
 *   - cumulative weight 누적 → Math.random() * total 으로 한 점 뽑기
 *   - weight 미지정 항목은 1 로 간주
 *   - 빈 풀 호출 시 throw — 호출부에서 잡아야 함
 *   - random 함수 주입 가능 (테스트·시드)
 */
import type { GachaPool, GachaResult } from './types.ts'
import { FIRST_GACHA_POOL } from './pools.ts'
import { getHooks } from './config.ts'
import { bus } from '@idongworld/core'

export interface PickOptions {
  /** 테스트·시드용 random. 미지정 시 Math.random. */
  rand?: () => number
  /** 시도 카운트 증가 호출 안 함 (테스트·재추첨 등). */
  skipAttempt?: boolean
}

/**
 * 풀 1개에서 1회 픽.
 * 빈 풀 시 throw.
 */
export function pick(pool: GachaPool, opts: PickOptions = {}): GachaResult {
  if (!pool.entries.length) throw new Error(`[gacha] 빈 풀: ${pool.id}`)
  const rand = opts.rand ?? Math.random
  const total = pool.entries.reduce((s, e) => s + (e.weight ?? 1), 0)
  let r = rand() * total
  for (const e of pool.entries) {
    r -= e.weight ?? 1
    if (r <= 0) {
      const result = { characterId: e.characterId, scenarioId: e.scenarioId, poolId: pool.id }
      if (!opts.skipAttempt) {
        getHooks().onAttempt?.(pool.id)
        bus.emit('gacha:picked', result)
      }
      return result
    }
  }
  // 누적 부동소수 오차 방어 — 마지막 항목 보정
  const last = pool.entries[pool.entries.length - 1]!
  const result = { characterId: last.characterId, scenarioId: last.scenarioId, poolId: pool.id }
  if (!opts.skipAttempt) {
    getHooks().onAttempt?.(pool.id)
    bus.emit('gacha:picked', result)
  }
  return result
}

/**
 * 첫 만남 가챠 — 본진 5명 균등 1/5 픽.
 * FIRST_GACHA_POOL 의 단축 헬퍼.
 */
export function firstGachaPick(opts: PickOptions = {}): GachaResult {
  return pick(FIRST_GACHA_POOL, opts)
}
