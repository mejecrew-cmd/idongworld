/**
 * 📁 lib/moduleRoutes.tsx — 모듈 자율 등록 라우트 → React Router 변환
 * ───────────────────────────────────────────────
 * 📌 역할: 콘텐츠 모듈의 routes.tsx (ModuleRoutes) 를 collectRoutes 로 합성 →
 *           React Router 6 <Route> 트리로 변환.
 *
 * 🔗 연결:
 *   - 각 콘텐츠 모듈 routes.tsx (예: @idongworld/zone-garden/routes)
 *   - core/router.ts (collectRoutes·RouteSpec)
 *   - App.tsx → <ModuleRoutes /> 렌더 (현재 정의된 라우트와 병행)
 *
 * 💡 1주차 시범: zone-garden 만 등록 (다른 zone 모듈은 routes.tsx 추가 시 자동 합성).
 *     기존 App.tsx 라우트는 그대로 유지 — 충돌 없음 (서로 다른 path).
 */
import { Route } from 'react-router-dom'
import { collectRoutes, type ModuleRoutes as IModuleRoutes, type RouteSpec } from '@idongworld/core'
import zoneGardenRoutes from '@idongworld/zone-garden/routes'
import zoneOasisRoutes from '@idongworld/zone-oasis/routes'
import zoneMemoryRoutes from '@idongworld/zone-memory/routes'
import zoneMineRoutes from '@idongworld/zone-mine/routes'
import routeNeighborRoutes from '@idongworld/route-neighbor/routes'
import destinationShellIslandRoutes from '@idongworld/destination-shell-island/routes'
import aidongIslandRoutes from '@idongworld/aidong-island/routes'

/** 등록된 모듈 라우트 — 신규 모듈 routes 추가 시 여기에 import + push. */
const ALL_MODULE_ROUTES: IModuleRoutes[] = [
  zoneGardenRoutes,
  zoneOasisRoutes,
  zoneMemoryRoutes,
  zoneMineRoutes,
  routeNeighborRoutes,
  destinationShellIslandRoutes,
  aidongIslandRoutes,
]

/** RouteSpec → JSX <Route> 변환 (재귀). */
function specToRoute(spec: RouteSpec, key: string | number): JSX.Element {
  const Component = spec.Component
  const element = spec.element ?? (Component ? <Component /> : null)
  if (spec.index) {
    return <Route key={key} index element={element} />
  }
  return (
    <Route key={key} path={spec.path} element={element}>
      {spec.children?.map((c, i) => specToRoute(c, `${key}-${i}`))}
    </Route>
  )
}

/**
 * App.tsx 안에서 사용:
 *   <Routes>
 *     ... 기존 라우트 ...
 *     {renderModuleRoutes()}
 *   </Routes>
 */
export function renderModuleRoutes(): JSX.Element[] {
  return collectRoutes(ALL_MODULE_ROUTES).map((s, i) => specToRoute(s, `mod-${i}`))
}

/** 디버그·검수용 — 등록된 모듈 라우트 카운트. */
export function getModuleRouteCount(): number {
  return collectRoutes(ALL_MODULE_ROUTES).length
}
