/**
 * packages/frontend/src/lib/moduleRegistry.test.ts - 모듈 registry 회귀 테스트
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { listAll, listByKind, _resetForTest as resetRegistry } from '@idongworld/core'
import { registerModules } from './moduleRegistry.ts'

beforeEach(() => {
  resetRegistry()
})

describe('registerModules 모듈 등록', () => {
  it('throw 없이 등록하고 validate를 통과한다', () => {
    expect(() => registerModules()).not.toThrow()
  })

  it('총 18개 모듈을 등록한다', () => {
    registerModules()
    expect(listAll()).toHaveLength(18)
  })

  it('분류별 등록 수를 유지한다', () => {
    registerModules()
    expect(listByKind('global')).toHaveLength(6)
    expect(listByKind('system')).toHaveLength(4)
    expect(listByKind('content')).toHaveLength(8)
  })

  it('광역 모듈 ID를 등록한다', () => {
    registerModules()
    const ids = listByKind('global').map((m) => m.id).sort()
    expect(ids).toEqual(['account', 'codex', 'host', 'my-aidong', 'my-island', 'ship'])
  })

  it('시스템 모듈 ID를 등록한다', () => {
    registerModules()
    const ids = listByKind('system').map((m) => m.id).sort()
    expect(ids).toEqual(['customs', 'cutscene-runner', 'gacha', 'vn-runner'])
  })

  it('콘텐츠 모듈 ID를 등록한다', () => {
    registerModules()
    const ids = listByKind('content').map((m) => m.id).sort()
    expect(ids).toEqual([
      'aidong-island',
      'destination-shell-island',
      'lodge',
      'route-neighbor',
      'zone-garden',
      'zone-memory',
      'zone-mine',
      'zone-oasis',
    ])
  })

  it('세관 목적지 판단용 worldScope를 등록한다', () => {
    registerModules()
    const scopes = new Map(listAll().map((m) => [m.id, m.worldScope]))

    expect(scopes.get('ship')).toBe('ship')
    expect(scopes.get('lodge')).toBe('lodge')
    expect(scopes.get('route-neighbor')).toBe('voyage-route')
    expect(scopes.get('aidong-island')).toBe('destination-island')
    expect(scopes.get('destination-shell-island')).toBe('destination-island')

    for (const moduleId of ['zone-garden', 'zone-oasis', 'zone-memory', 'zone-mine']) {
      expect(scopes.get(moduleId)).toBe('home-island')
    }
  })
})
