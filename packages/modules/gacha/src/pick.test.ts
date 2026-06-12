/**
 * 📁 gacha/src/pick.test.ts — 가챠 픽 로직 테스트
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { pick, firstGachaPick } from './pick.ts'
import { FIRST_GACHA_POOL } from './pools.ts'
import { _resetForTest as resetGacha } from './config.ts'
import { _resetForTest as resetBus } from '../../../core/src/bus.ts'

beforeEach(() => {
  resetGacha()
  resetBus()
})

describe('pick — 가중치 비례', () => {
  it('빈 풀 → throw', () => {
    expect(() => pick({ id: 'empty', name: 'x', entries: [] }, { skipAttempt: true })).toThrow('빈 풀')
  })

  it('균등 풀 — 5명 모두 nonzero 확률 (200회 sampling)', () => {
    const counts = new Map<string, number>()
    for (let i = 0; i < 200; i++) {
      const r = pick(FIRST_GACHA_POOL, { skipAttempt: true })
      counts.set(r.characterId, (counts.get(r.characterId) ?? 0) + 1)
    }
    expect(counts.size).toBe(5)
    for (const [, c] of counts) expect(c).toBeGreaterThan(10)
  })

  it('가중치 풀 — 큰 weight 가 더 자주', () => {
    const pool = {
      id: 'weighted',
      name: 'x',
      entries: [
        { characterId: 'A', scenarioId: 'a', weight: 1 },
        { characterId: 'B', scenarioId: 'b', weight: 99 },
      ],
    }
    let bCount = 0
    for (let i = 0; i < 500; i++) {
      if (pick(pool, { skipAttempt: true }).characterId === 'B') bCount++
    }
    // 99/100 ≈ 95%~99% — 마진 두고 80% 이상이면 통과
    expect(bCount).toBeGreaterThan(400)
  })

  it('rand=0 → 첫 항목', () => {
    const r = pick(FIRST_GACHA_POOL, { rand: () => 0, skipAttempt: true })
    expect(r.characterId).toBe(FIRST_GACHA_POOL.entries[0]!.characterId)
  })

  it('rand=0.999 → 마지막 항목 (또는 부동소수 보정)', () => {
    const r = pick(FIRST_GACHA_POOL, { rand: () => 0.999999, skipAttempt: true })
    expect(FIRST_GACHA_POOL.entries.map((e) => e.characterId)).toContain(r.characterId)
  })
})

describe('firstGachaPick', () => {
  it('5명 풀에서 픽 + poolId=first-meeting', () => {
    const r = firstGachaPick({ skipAttempt: true })
    expect(r.poolId).toBe('first-meeting')
    expect(['황금멍', '춤냥', '양털곰', '단풍볼', '날카여우']).toContain(r.characterId)
  })
})
