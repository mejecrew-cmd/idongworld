/**
 * 📁 customs/src/engine.ts — 세관 엔진 (룰 등록·시뮬레이션·적용)
 * ───────────────────────────────────────────────
 * 📌 역할: 룰 레지스트리 + simulate + apply.
 *           apply 는 UI 확인 → debit → credit 순서·실패 시 rollback 없음 (UI 게이트가 보장).
 *
 * 🔗 연결: types.ts · config.ts (hooks)
 *
 * 💡 사용 예:
 *   registerRule({ ruleId: 'a->b', fromModule:'x', fromResource:'a', toScope:'global', toResource:'b', ratio:5, label:'A→B' })
 *   const sim = simulate({ ruleId: 'a->b', amount: 12 })  // → toAmount=2, remainder=2
 *   const res = await apply({ ruleId: 'a->b', amount: 12 })  // confirmUI → debit → credit
 */
import type {
  CustomsApplyResult,
  CustomsDeclaration,
  CustomsRule,
  CustomsSimulation,
} from './types.ts'
import { getHooks } from './config.ts'
import { bus } from '@idongworld/core'

const _rules = new Map<string, CustomsRule>()

/** 룰 1개 등록. 중복 ID 차단. */
export function registerRule(rule: CustomsRule): void {
  if (!rule.ruleId) throw new Error('[customs] ruleId 필수')
  if (_rules.has(rule.ruleId)) throw new Error(`[customs] 중복 ruleId: ${rule.ruleId}`)
  if (rule.ratio <= 0) throw new Error(`[customs] ratio 양수 필수: ${rule.ruleId}`)
  if (rule.toScope === 'module' && !rule.toModule) {
    throw new Error(`[customs] toScope=module 인데 toModule 누락: ${rule.ruleId}`)
  }
  const normalized: CustomsRule = { uiConfirmRequired: true, ...rule }
  _rules.set(rule.ruleId, normalized)
  getHooks().onLog?.('register', normalized)
}

/**
 * CSV 텍스트 → 룰 다중 등록.
 * 헤더: ruleId,fromModule,fromResource,toScope,toModule,toResource,ratio,label,minAmount,maxAmount,description
 */
export function registerCsv(csv: string): number {
  const lines = csv.trim().split(/\r?\n/)
  if (!lines.length) return 0
  const headers = lines[0]!.split(',').map((s) => s.trim())
  let count = 0
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i]!
    if (!row.trim() || row.startsWith('#')) continue
    const cols = row.split(',').map((s) => s.trim())
    const rec: Record<string, string> = {}
    headers.forEach((h, j) => { rec[h] = cols[j] ?? '' })
    registerRule({
      ruleId: rec.ruleId!,
      fromModule: rec.fromModule!,
      fromResource: rec.fromResource!,
      toScope: (rec.toScope as 'global' | 'module') || 'global',
      toModule: rec.toModule || undefined,
      toResource: rec.toResource!,
      ratio: Number(rec.ratio || 1),
      label: rec.label || rec.ruleId!,
      minAmount: rec.minAmount ? Number(rec.minAmount) : undefined,
      maxAmount: rec.maxAmount ? Number(rec.maxAmount) : undefined,
      description: rec.description || undefined,
    })
    count++
  }
  return count
}

export function getRule(ruleId: string): CustomsRule | undefined {
  return _rules.get(ruleId)
}

export function listRules(): CustomsRule[] {
  return Array.from(_rules.values())
}

/**
 * apply 전 결과 미리보기.
 * - 정수 ratio 기준 잘림 + 잔량 보고
 * - min/max 한계 검사
 */
export function simulate(decl: CustomsDeclaration): CustomsSimulation {
  const rule = _rules.get(decl.ruleId)
  if (!rule) {
    return makeInfeasible({} as CustomsRule, decl.amount, `룰 없음: ${decl.ruleId}`)
  }
  if (decl.amount <= 0) {
    return makeInfeasible(rule, 0, '수량은 양수여야 함')
  }
  if (rule.minAmount && decl.amount < rule.minAmount) {
    return makeInfeasible(rule, decl.amount, `최소 ${rule.minAmount} 필요`)
  }
  if (rule.maxAmount && decl.amount > rule.maxAmount) {
    return makeInfeasible(rule, decl.amount, `최대 ${rule.maxAmount} 초과`)
  }
  const toAmount = Math.floor(decl.amount / rule.ratio)
  const remainder = decl.amount - toAmount * rule.ratio
  if (toAmount === 0) {
    return makeInfeasible(rule, decl.amount, `비율 ${rule.ratio} 미만 — 변환량 0`)
  }
  return {
    rule,
    fromAmount: decl.amount - remainder,
    toAmount,
    remainder,
    feasible: true,
  }
}

function makeInfeasible(rule: CustomsRule, fromAmount: number, reason: string): CustomsSimulation {
  return { rule, fromAmount, toAmount: 0, remainder: fromAmount, feasible: false, reason }
}

/**
 * 실 변환 적용.
 * 흐름: simulate → (uiConfirmRequired 면) confirmUI → onDebit → onCredit.
 * 어느 단계 실패 시 applied: false 반환 (rollback X — 단일 콜백 실패만 허용).
 */
export async function apply(decl: CustomsDeclaration): Promise<CustomsApplyResult> {
  const sim = simulate(decl)
  const hooks = getHooks()

  if (!sim.feasible) {
    hooks.onLog?.('reject', sim.rule, { reason: sim.reason })
    return { ...sim, applied: false, rejectedReason: sim.reason }
  }

  // UI 확인 (필수 룰)
  if (sim.rule.uiConfirmRequired) {
    if (!hooks.confirmUI) {
      const reason = 'confirmUI 훅 미주입 — uiConfirmRequired 룰 진행 불가'
      hooks.onLog?.('reject', sim.rule, { reason })
      return { ...sim, applied: false, rejectedReason: reason }
    }
    const ok = await hooks.confirmUI(sim)
    if (!ok) {
      hooks.onLog?.('reject', sim.rule, { reason: 'user-rejected' })
      return { ...sim, applied: false, rejectedReason: '사용자 거절' }
    }
  }

  if (hooks.applyBackend) {
    const ok = await hooks.applyBackend(decl, sim)
    if (!ok) {
      const reason = 'backend customs apply failed'
      hooks.onLog?.('reject', sim.rule, { reason })
      return { ...sim, applied: false, rejectedReason: reason }
    }
    hooks.onLog?.('apply', sim.rule, {
      fromAmount: sim.fromAmount,
      toAmount: sim.toAmount,
      backend: true,
    })
    bus.emit('customs:applied', {
      ruleId: sim.rule.ruleId,
      fromAmount: sim.fromAmount,
      toAmount: sim.toAmount,
    })
    return { ...sim, applied: true }
  }

  // 출발 차감
  if (hooks.onDebit) {
    const ok = await hooks.onDebit({
      module: sim.rule.fromModule,
      resource: sim.rule.fromResource,
      amount: sim.fromAmount,
    })
    if (!ok) {
      const reason = '보유 자원 부족 (onDebit false)'
      hooks.onLog?.('reject', sim.rule, { reason })
      return { ...sim, applied: false, rejectedReason: reason }
    }
  }

  // 도착 적립
  if (hooks.onCredit) {
    await hooks.onCredit({
      scope: sim.rule.toScope,
      module: sim.rule.toModule,
      resource: sim.rule.toResource,
      amount: sim.toAmount,
    })
  }

  hooks.onLog?.('apply', sim.rule, { fromAmount: sim.fromAmount, toAmount: sim.toAmount })
  bus.emit('customs:applied', {
    ruleId: sim.rule.ruleId,
    fromAmount: sim.fromAmount,
    toAmount: sim.toAmount,
  })
  return { ...sim, applied: true }
}

/** 테스트·HMR 용. */
export function _resetForTest(): void {
  _rules.clear()
}
