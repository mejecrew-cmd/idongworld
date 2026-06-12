/**
 * 📁 frontend/src/lib/customsModal.test.ts — customs imperative API 테스트
 * ───────────────────────────────────────────────
 * 📌 검증: confirmCustoms Promise·subscribe pub/sub·race 자동 거절.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { confirmCustoms, subscribeCustomsConfirm, resolveCustomsConfirm } from './customsModal.ts'
import type { CustomsSimulation } from '@idongworld/customs'

const FAKE_SIM: CustomsSimulation = {
  rule: {
    ruleId: 't', fromModule: 'm', fromResource: 'a',
    toScope: 'global', toResource: 'b', ratio: 5, label: '테스트',
  },
  fromAmount: 10,
  toAmount: 2,
  remainder: 0,
  feasible: true,
}

beforeEach(() => {
  // 누적된 listener 비우기 — 직접 인터페이스 없으므로 unsubscribe 직접
  // (테스트 격리는 각 it 의 unsub 클로저로 처리)
})

describe('confirmCustoms — Promise 흐름', () => {
  it('resolve(true) → Promise true', async () => {
    const p = confirmCustoms(FAKE_SIM)
    resolveCustomsConfirm(true)
    await expect(p).resolves.toBe(true)
  })

  it('resolve(false) → Promise false', async () => {
    const p = confirmCustoms(FAKE_SIM)
    resolveCustomsConfirm(false)
    await expect(p).resolves.toBe(false)
  })
})

describe('subscribeCustomsConfirm', () => {
  it('subscribe 직후 1회 호출 (현재 pending 또는 null)', () => {
    const fn = vi.fn()
    const unsub = subscribeCustomsConfirm(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    unsub()
  })

  it('pending 변경 시 listener 호출', async () => {
    const fn = vi.fn()
    const unsub = subscribeCustomsConfirm(fn)
    fn.mockClear()

    const p = confirmCustoms(FAKE_SIM)
    expect(fn).toHaveBeenCalledTimes(1)  // pending 활성

    resolveCustomsConfirm(true)
    await p
    expect(fn).toHaveBeenCalledTimes(2)  // pending 해제 (null)
    expect(fn).toHaveBeenLastCalledWith(null)
    unsub()
  })

  it('unsubscribe 후 호출 X', async () => {
    const fn = vi.fn()
    const unsub = subscribeCustomsConfirm(fn)
    fn.mockClear()
    unsub()

    const p = confirmCustoms(FAKE_SIM)
    expect(fn).not.toHaveBeenCalled()
    resolveCustomsConfirm(true)
    await p
  })
})

describe('race 방지 — 새 confirm 이 기존 pending 거절', () => {
  it('두 confirm 동시 — 첫 번째 자동 false·두 번째 정상', async () => {
    const p1 = confirmCustoms(FAKE_SIM)
    const p2 = confirmCustoms({ ...FAKE_SIM, fromAmount: 20 })
    // p1 은 p2 진입 시 자동 false
    await expect(p1).resolves.toBe(false)
    // p2 resolve
    resolveCustomsConfirm(true)
    await expect(p2).resolves.toBe(true)
  })
})

describe('resolveCustomsConfirm — pending 없을 때', () => {
  it('no-op (no throw)', () => {
    expect(() => resolveCustomsConfirm(true)).not.toThrow()
  })
})
