/**
 * 📁 core/src/bus.test.ts — 이벤트 버스 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { on, once, off, emit, _resetForTest } from './bus.ts'

beforeEach(() => {
  _resetForTest()
})

describe('emit / on', () => {
  it('등록된 listener 호출', () => {
    const fn = vi.fn()
    on('test:event', fn)
    emit('test:event', { foo: 1 })
    expect(fn).toHaveBeenCalledWith({ foo: 1 })
  })

  it('다중 listener 모두 호출', () => {
    const a = vi.fn()
    const b = vi.fn()
    on('multi', a)
    on('multi', b)
    emit('multi', 'payload')
    expect(a).toHaveBeenCalled()
    expect(b).toHaveBeenCalled()
  })

  it('listener 예외 격리 — 다른 listener 영향 X', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ok = vi.fn()
    on('iso', () => { throw new Error('boom') })
    on('iso', ok)
    emit('iso', null)
    expect(ok).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('등록 안 된 이벤트 emit — no-op', () => {
    expect(() => emit('nonexistent', null)).not.toThrow()
  })
})

describe('off — 구독 해제', () => {
  it('off 후 호출 X', () => {
    const fn = vi.fn()
    on('rm', fn)
    off('rm', fn)
    emit('rm', null)
    expect(fn).not.toHaveBeenCalled()
  })

  it('on 반환 함수 = off (편의)', () => {
    const fn = vi.fn()
    const unsub = on('rm2', fn)
    unsub()
    emit('rm2', null)
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('once — 1회 후 자동 해제', () => {
  it('첫 emit 만 호출', () => {
    const fn = vi.fn()
    once('one', fn)
    emit('one', 'a')
    emit('one', 'b')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('a')
  })
})
