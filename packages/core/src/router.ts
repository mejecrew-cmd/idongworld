/**
 * 📁 core/router.ts — 모듈 라우트 합성 헬퍼
 * ───────────────────────────────────────────────
 * 📌 역할: 콘텐츠 모듈이 export 한 RouteSpec 들을 모아 react-router 객체로 변환.
 *           App.tsx 의 거대 <Routes> 를 모듈별 자율 등록으로 분산.
 *
 * 🔗 연결:
 *   - manifests.ts (ContentManifest.route prefix)
 *   - registry.ts (모듈 조회)
 *   - frontend App.tsx (collectRoutes() 결과를 <Routes>에 spread)
 *
 * 💡 초보자 안내:
 *   - 각 콘텐츠 모듈은 routes.ts 에서 RouteSpec[] 을 export.
 *   - Phase 0 단계: 타입·헬퍼만 제공 (실 통합은 Phase 1.5 vn-runner 분리부터).
 *   - react-router-dom 은 peer dep — 사용 측에서 install 되어 있으면 동작.
 */
import type { ComponentType, ReactElement } from 'react'

/**
 * 한 라우트 정의.
 * react-router-dom 6 의 RouteObject 와 호환 가능한 최소 표면.
 */
export interface RouteSpec {
  /** 모듈 prefix 기준 상대 경로. 예: 'garden' (모듈 route='/island/garden' 이면 '/island/garden/garden' X · 직접 절대 path도 지원). */
  path: string
  /** 화면 컴포넌트 (lazy 권장). */
  element?: ReactElement
  /** Component 형태로도 받음 (lazy/Outlet 패턴). */
  Component?: ComponentType
  /** index 라우트 여부. */
  index?: boolean
  /** 자식 라우트. */
  children?: RouteSpec[]
}

/**
 * 모듈이 export 하는 라우트 묶음.
 * 모듈 폴더의 routes.ts 에서 default export 권장.
 */
export interface ModuleRoutes {
  /** 모듈 ID (검증·디버그용). */
  moduleId: string
  /** prefix (manifest.route 와 동일). 없으면 절대 path 사용. */
  prefix?: string
  /** 라우트 배열. */
  routes: RouteSpec[]
}

/**
 * prefix + 자식 path 합성. '/' 중복·누락 방지.
 */
export function joinPath(prefix: string | undefined, child: string): string {
  if (!prefix) return child.startsWith('/') ? child : `/${child}`
  if (child.startsWith('/')) return child // 자식이 절대면 그대로
  const p = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
  const c = child.startsWith('/') ? child.slice(1) : child
  return c ? `${p}/${c}` : p
}

/**
 * 여러 모듈의 ModuleRoutes 를 평탄화하여 RouteSpec[] 으로 모음.
 * 사용 측: <Routes>{collectRoutes(allModules).map(...)}</Routes> 또는
 *          react-router-dom 의 useRoutes(toRouteObjects(...)) 활용.
 */
export function collectRoutes(modules: ModuleRoutes[]): RouteSpec[] {
  const out: RouteSpec[] = []
  for (const m of modules) {
    for (const r of m.routes) {
      out.push(applyPrefix(r, m.prefix))
    }
  }
  return out
}

/** 한 RouteSpec 트리에 prefix 일괄 적용 (재귀). */
function applyPrefix(r: RouteSpec, prefix: string | undefined): RouteSpec {
  if (!prefix) return r
  return {
    ...r,
    path: r.index ? r.path : joinPath(prefix, r.path),
    children: r.children?.map((c) => applyPrefix(c, undefined)), // 자식은 부모 path 기준 상대
  }
}

/**
 * react-router-dom 6 RouteObject 와 호환되도록 element/Component 필드 정리.
 * (현 시점은 동일 타입이지만 향후 라우터 변경 시 단일 변환점 확보)
 */
export function toRouteObjects(specs: RouteSpec[]): RouteSpec[] {
  return specs
}
