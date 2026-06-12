/**
 * 📁 core/src/router.test.ts — RouteSpec·collectRoutes·joinPath 테스트
 */
import { describe, it, expect } from 'vitest'
import { joinPath, collectRoutes, toRouteObjects, type ModuleRoutes } from './router.ts'

describe('joinPath', () => {
  it('prefix 없음 — 자식 그대로 + 슬래시', () => {
    expect(joinPath(undefined, 'foo')).toBe('/foo')
    expect(joinPath(undefined, '/foo')).toBe('/foo')
  })

  it('prefix + 상대 자식', () => {
    expect(joinPath('/island', 'garden')).toBe('/island/garden')
    expect(joinPath('/island/', 'garden')).toBe('/island/garden')
  })

  it('자식이 절대 path — 그대로', () => {
    expect(joinPath('/island', '/other')).toBe('/other')
  })

  it('빈 자식 — prefix 그대로', () => {
    expect(joinPath('/island', '')).toBe('/island')
  })
})

describe('collectRoutes — prefix 합성', () => {
  it('단일 모듈 + prefix 적용', () => {
    const mod: ModuleRoutes = {
      moduleId: 'm1',
      prefix: '/island/garden',
      routes: [{ path: '', element: undefined }, { path: 'detail', element: undefined }],
    }
    const out = collectRoutes([mod])
    expect(out).toHaveLength(2)
    expect(out[0]!.path).toBe('/island/garden')
    expect(out[1]!.path).toBe('/island/garden/detail')
  })

  it('다중 모듈 — 모두 합성', () => {
    const m1: ModuleRoutes = { moduleId: 'a', prefix: '/a', routes: [{ path: '', element: undefined }] }
    const m2: ModuleRoutes = { moduleId: 'b', prefix: '/b', routes: [{ path: '', element: undefined }] }
    expect(collectRoutes([m1, m2])).toHaveLength(2)
  })

  it('index 라우트 — path 변경 X', () => {
    const mod: ModuleRoutes = {
      moduleId: 'm1', prefix: '/x',
      routes: [{ index: true, path: '', element: undefined }],
    }
    const out = collectRoutes([mod])
    expect(out[0]!.index).toBe(true)
  })

  it('prefix 없는 모듈 — path 그대로', () => {
    const mod: ModuleRoutes = { moduleId: 'm', routes: [{ path: 'foo', element: undefined }] }
    expect(collectRoutes([mod])[0]!.path).toBe('foo')
  })
})

describe('toRouteObjects — pass-through', () => {
  it('현재는 동일 변환', () => {
    const specs = [{ path: '/x', element: undefined }]
    expect(toRouteObjects(specs)).toEqual(specs)
  })
})
