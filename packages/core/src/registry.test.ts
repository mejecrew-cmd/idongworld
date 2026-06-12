/**
 * 📁 core/src/registry.test.ts — 모듈 레지스트리 + validate 강화 테스트
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  register, registerAll, get, require_, listByKind, listAll, validate, getSystem, _resetForTest,
} from './registry.ts'
import { defineManifest } from './manifests.ts'

beforeEach(() => _resetForTest())

const sysA = defineManifest({ kind: 'system', id: 'sys-a', name: 'A', version: '1.0.0', exports: ['x'] })
const sysB = defineManifest({ kind: 'system', id: 'sys-b', name: 'B', version: '1.0.0', exports: ['y'] })
const contentA = defineManifest({
  kind: 'content', id: 'content-a', name: 'CA', version: '1.0.0',
  requires: ['sys-a'], route: '/a', i18nNamespace: 'a',
})
const globalA = defineManifest({
  kind: 'global', id: 'global-a', name: 'GA', version: '1.0.0',
  storeSlice: 'slice-a', exports: ['z'],
})

describe('register / registerAll', () => {
  it('정상 등록 + 조회', () => {
    register(sysA)
    expect(get('sys-a')).toBe(sysA)
    expect(require_('sys-a')).toBe(sysA)
  })

  it('중복 ID — throw', () => {
    register(sysA)
    expect(() => register(sysA)).toThrow('중복 모듈 ID')
  })

  it('require_ 미등록 — throw', () => {
    expect(() => require_('missing')).toThrow('미등록')
  })

  it('registerAll — 일괄', () => {
    registerAll([sysA, sysB, globalA])
    expect(listAll()).toHaveLength(3)
  })
})

describe('listByKind / getSystem', () => {
  beforeEach(() => registerAll([sysA, sysB, contentA, globalA]))

  it('listByKind=system → 2건', () => {
    expect(listByKind('system')).toHaveLength(2)
  })

  it('listByKind=content → 1건', () => {
    expect(listByKind('content')).toHaveLength(1)
  })

  it('getSystem — 시스템만 narrowing', () => {
    expect(getSystem('sys-a')).toBe(sysA)
    expect(getSystem('global-a')).toBeUndefined()
  })
})

describe('validate — 정합성 4종', () => {
  it('정상 — 통과', () => {
    registerAll([sysA, sysB, contentA, globalA])
    expect(() => validate()).not.toThrow()
  })

  it('requires 누락 — throw', () => {
    register(defineManifest({
      kind: 'content', id: 'c', name: 'C', version: '1.0.0', requires: ['missing-sys'],
    }))
    expect(() => validate()).toThrow(/requires 'missing-sys'/)
  })

  it('route 충돌 — throw', () => {
    register(defineManifest({ kind: 'content', id: 'c1', name: '1', version: '1.0.0', requires: [], route: '/dup' }))
    register(defineManifest({ kind: 'content', id: 'c2', name: '2', version: '1.0.0', requires: [], route: '/dup' }))
    expect(() => validate()).toThrow(/route '\/dup' 충돌/)
  })

  it('storeSlice 중복 — throw', () => {
    register(defineManifest({ kind: 'global', id: 'g1', name: '1', version: '1.0.0', storeSlice: 'dup', exports: [] }))
    register(defineManifest({ kind: 'global', id: 'g2', name: '2', version: '1.0.0', storeSlice: 'dup', exports: [] }))
    expect(() => validate()).toThrow(/storeSlice 'dup' 중복/)
  })

  it('i18nNamespace 충돌 — throw', () => {
    register(defineManifest({ kind: 'content', id: 'c1', name: '1', version: '1.0.0', requires: [], i18nNamespace: 'ns1' }))
    register(defineManifest({ kind: 'content', id: 'c2', name: '2', version: '1.0.0', requires: [], i18nNamespace: 'ns1' }))
    expect(() => validate()).toThrow(/i18nNamespace 'ns1' 충돌/)
  })

  it('다중 위반 — 모두 메시지에 포함', () => {
    register(defineManifest({ kind: 'content', id: 'a', name: 'A', version: '1.0.0', requires: ['x'], route: '/r' }))
    register(defineManifest({ kind: 'content', id: 'b', name: 'B', version: '1.0.0', requires: ['y'], route: '/r' }))
    expect(() => validate()).toThrow(/requires 'x'[\s\S]+requires 'y'[\s\S]+route '\/r' 충돌/)
  })
})
