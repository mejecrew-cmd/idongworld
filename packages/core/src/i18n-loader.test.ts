/**
 * 📁 core/src/i18n-loader.test.ts — i18n namespace 합성 테스트
 */
import { describe, it, expect, vi } from 'vitest'
import { buildResourceBundle, collectNamespaces, registerNamespaces, type ModuleI18n } from './i18n-loader.ts'

const modA: ModuleI18n = {
  moduleId: 'a',
  namespace: 'ns-a',
  resources: { ko: { greeting: '안녕' }, en: { greeting: 'hi' } },
}
const modB: ModuleI18n = {
  moduleId: 'b',
  namespace: 'ns-b',
  resources: { ko: { hello: '하이' } },
}

describe('buildResourceBundle', () => {
  it('locale → namespace 구조 생성', () => {
    const bundle = buildResourceBundle([modA, modB])
    expect(bundle.ko).toEqual({ 'ns-a': { greeting: '안녕' }, 'ns-b': { hello: '하이' } })
    expect(bundle.en).toEqual({ 'ns-a': { greeting: 'hi' } })
  })

  it('빈 입력 — 빈 객체', () => {
    expect(buildResourceBundle([])).toEqual({})
  })

  it('namespace 중복 — 경고 + 후자가 덮어씀', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const dup1: ModuleI18n = { moduleId: 'a', namespace: 'same', resources: { ko: { k: 'old' } } }
    const dup2: ModuleI18n = { moduleId: 'b', namespace: 'same', resources: { ko: { k: 'new' } } }
    const bundle = buildResourceBundle([dup1, dup2])
    expect(bundle.ko.same).toEqual({ k: 'new' })
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

describe('collectNamespaces', () => {
  it('Set-like dedup', () => {
    expect(collectNamespaces([modA, modB])).toEqual(['ns-a', 'ns-b'])
  })

  it('중복 namespace — 1개로', () => {
    const dup: ModuleI18n = { moduleId: 'c', namespace: 'ns-a', resources: { ko: {} } }
    expect(collectNamespaces([modA, dup])).toEqual(['ns-a'])
  })
})

describe('registerNamespaces — i18next addResourceBundle 위임', () => {
  it('각 모듈 × 각 locale 별 호출', () => {
    const i18n = { addResourceBundle: vi.fn() }
    registerNamespaces(i18n, [modA, modB])
    expect(i18n.addResourceBundle).toHaveBeenCalledTimes(3) // a ko + a en + b ko
    expect(i18n.addResourceBundle).toHaveBeenCalledWith('ko', 'ns-a', { greeting: '안녕' }, true, false)
  })

  it('i18n 미주입 — no-op', () => {
    expect(() => registerNamespaces(undefined, [modA])).not.toThrow()
  })

  it('addResourceBundle 없는 객체 — no-op', () => {
    expect(() => registerNamespaces({} as never, [modA])).not.toThrow()
  })
})
