/**
 * 📁 customs/src/engine.test.ts — 세관 엔진 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { registerRule, simulate, apply, _resetForTest as resetEngine } from './engine.ts'
import { configure, _resetForTest as resetConfig } from './config.ts'
import { _resetForTest as resetBus } from '../../../core/src/bus.ts'
import type { CustomsRule } from './types.ts'

const RULE: CustomsRule = {
  ruleId: 'test-acorn-coin',
  fromModule: 'zone-test',
  fromResource: 'acorn',
  toScope: 'global',
  toResource: 'coins',
  ratio: 5,
  label: 'test',
  uiConfirmRequired: false,
}

beforeEach(() => {
  resetEngine()
  resetConfig()
  resetBus()
})

describe('registerRule', () => {
  it('정상 룰 등록', () => {
    registerRule(RULE)
    expect(simulate({ ruleId: RULE.ruleId, amount: 5 }).feasible).toBe(true)
  })

  it('중복 ruleId → throw', () => {
    registerRule(RULE)
    expect(() => registerRule(RULE)).toThrow('중복 ruleId')
  })

  it('ratio ≤ 0 → throw', () => {
    expect(() => registerRule({ ...RULE, ratio: 0 })).toThrow('ratio 양수')
  })
})

describe('simulate — 잔량 처리', () => {
  beforeEach(() => registerRule(RULE))

  it('정확한 배수 — 잔량 0', () => {
    const sim = simulate({ ruleId: RULE.ruleId, amount: 10 })
    expect(sim).toMatchObject({ feasible: true, fromAmount: 10, toAmount: 2, remainder: 0 })
  })

  it('남는 양 — remainder', () => {
    const sim = simulate({ ruleId: RULE.ruleId, amount: 12 })
    expect(sim).toMatchObject({ feasible: true, fromAmount: 10, toAmount: 2, remainder: 2 })
  })

  it('비율 미만 — feasible=false', () => {
    const sim = simulate({ ruleId: RULE.ruleId, amount: 3 })
    expect(sim.feasible).toBe(false)
  })

  it('수량 0 또는 음수 → feasible=false', () => {
    expect(simulate({ ruleId: RULE.ruleId, amount: 0 }).feasible).toBe(false)
    expect(simulate({ ruleId: RULE.ruleId, amount: -5 }).feasible).toBe(false)
  })

  it('알 수 없는 ruleId → feasible=false', () => {
    expect(simulate({ ruleId: 'no-such', amount: 10 }).feasible).toBe(false)
  })
})

describe('apply — debit·credit 흐름', () => {
  it('정상 적용 → onDebit + onCredit 호출', async () => {
    registerRule(RULE)
    const onDebit = vi.fn(() => true)
    const onCredit = vi.fn()
    configure({ onDebit, onCredit })
    const r = await apply({ ruleId: RULE.ruleId, amount: 10 })
    expect(r.applied).toBe(true)
    expect(onDebit).toHaveBeenCalledWith({ module: 'zone-test', resource: 'acorn', amount: 10 })
    expect(onCredit).toHaveBeenCalledWith({ scope: 'global', module: undefined, resource: 'coins', amount: 2 })
  })

  it('onDebit false → applied=false', async () => {
    registerRule(RULE)
    configure({ onDebit: () => false, onCredit: () => {} })
    const r = await apply({ ruleId: RULE.ruleId, amount: 10 })
    expect(r.applied).toBe(false)
    expect(r.rejectedReason).toContain('onDebit')
  })

  it('uiConfirmRequired + 훅 미주입 → reject', async () => {
    registerRule({ ...RULE, ruleId: 'r2', uiConfirmRequired: true })
    const r = await apply({ ruleId: 'r2', amount: 10 })
    expect(r.applied).toBe(false)
    expect(r.rejectedReason).toContain('confirmUI')
  })
})
