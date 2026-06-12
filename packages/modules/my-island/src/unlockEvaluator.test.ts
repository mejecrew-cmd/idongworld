/**
 * 📁 my-island/src/unlockEvaluator.test.ts — zone unlock DSL 테스트
 * 📌 핵심 로직: 2-gate (build phase + condition DSL) — 친밀도 무관
 */
import { describe, it, expect } from 'vitest'
import { evaluateUnlockCondition, evaluateConditionDsl } from './unlockEvaluator.ts'
import type { BuildPhaseContext, UserProgressContext, ZonePolicy } from './types.ts'

const build: BuildPhaseContext = { buildPhase: 1, updateId: 'update_v0_1' }
const userEmpty: UserProgressContext = {
  tutorialComplete: false,
  recruitedCount: 0,
  clearedZones: [],
  unlockedZones: [],
}

describe('evaluateUnlockCondition (Gate A·B)', () => {
  it('zone_active=false → 즉시 거절', () => {
    const policy: ZonePolicy = { zoneId: 'x', unlockPhase: 1, active: false, unlockCondition: 'always' }
    expect(evaluateUnlockCondition(policy, build, userEmpty)).toMatchObject({ unlocked: false, failedGate: 'inactive' })
  })

  it('Gate A — buildPhase 미달', () => {
    const policy: ZonePolicy = { zoneId: 'x', unlockPhase: 2, active: true, unlockCondition: 'always' }
    expect(evaluateUnlockCondition(policy, build, userEmpty)).toMatchObject({ unlocked: false, failedGate: 'A' })
  })

  it('Gate B — condition 미충족', () => {
    const policy: ZonePolicy = { zoneId: 'x', unlockPhase: 1, active: true, unlockCondition: 'tutorial_complete' }
    expect(evaluateUnlockCondition(policy, build, userEmpty)).toMatchObject({ unlocked: false, failedGate: 'B' })
  })

  it('두 Gate 모두 통과 → unlocked', () => {
    const policy: ZonePolicy = { zoneId: 'garden', unlockPhase: 1, active: true, unlockCondition: 'always' }
    expect(evaluateUnlockCondition(policy, build, userEmpty)).toMatchObject({ unlocked: true })
  })
})

describe('evaluateConditionDsl', () => {
  it('always — 항상 true', () => {
    expect(evaluateConditionDsl('always', userEmpty, build)).toBe(true)
  })

  it('tutorial_complete — flag 의존', () => {
    expect(evaluateConditionDsl('tutorial_complete', userEmpty, build)).toBe(false)
    expect(evaluateConditionDsl('tutorial_complete', { ...userEmpty, tutorialComplete: true }, build)).toBe(true)
  })

  it('prev_zone_clear:X — clearedZones 검사', () => {
    const u = { ...userEmpty, clearedZones: ['garden'] }
    expect(evaluateConditionDsl('prev_zone_clear:garden', u, build)).toBe(true)
    expect(evaluateConditionDsl('prev_zone_clear:oasis', u, build)).toBe(false)
  })

  it('recruited_count_ge:N — 영입 수 ≥ N', () => {
    const u = { ...userEmpty, recruitedCount: 3 }
    expect(evaluateConditionDsl('recruited_count_ge:2', u, build)).toBe(true)
    expect(evaluateConditionDsl('recruited_count_ge:3', u, build)).toBe(true)
    expect(evaluateConditionDsl('recruited_count_ge:5', u, build)).toBe(false)
  })

  it('season:X — activeSeason 비교', () => {
    const b = { ...build, activeSeason: 'summer-2026' }
    expect(evaluateConditionDsl('season:summer-2026', userEmpty, b)).toBe(true)
    expect(evaluateConditionDsl('season:winter-2026', userEmpty, b)).toBe(false)
  })

  it('and: 합성 — 모두 통과해야', () => {
    const u = { ...userEmpty, tutorialComplete: true, recruitedCount: 2 }
    expect(evaluateConditionDsl('and:tutorial_complete;recruited_count_ge:2', u, build)).toBe(true)
    expect(evaluateConditionDsl('and:tutorial_complete;recruited_count_ge:3', u, build)).toBe(false)
  })

  it('or: 합성 — 하나라도 통과', () => {
    const u = { ...userEmpty, recruitedCount: 1 }
    expect(evaluateConditionDsl('or:tutorial_complete;recruited_count_ge:1', u, build)).toBe(true)
    expect(evaluateConditionDsl('or:tutorial_complete;recruited_count_ge:5', u, build)).toBe(false)
  })

  it('미지원 DSL — false (보수적)', () => {
    expect(evaluateConditionDsl('unknown_dsl', userEmpty, build)).toBe(false)
  })
})
