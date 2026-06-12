/**
 * 📁 zone-garden/src/routes.tsx — 정원 모듈 라우트 (자율 등록)
 * ───────────────────────────────────────────────
 * 📌 역할: 본 모듈이 제공하는 라우트를 frontend 가 collectRoutes 로 합성.
 *           App.tsx 의 거대 <Routes> 분산.
 *
 * 🔗 연결:
 *   - manifest.route = '/island/garden'
 *   - frontend/lib/moduleRoutes.tsx (renderer)
 *   - core/router.ts (RouteSpec·ModuleRoutes 타입)
 *
 * 💡 시범:
 *   - 정원 zone 진입 화면 — 미니게임 직접 + (Phase 2) 풍경 컷씬
 */
import type { ModuleRoutes } from '@idongworld/core'
import { GardenZoneScreen } from './GardenZoneScreen.tsx'

const routes: ModuleRoutes = {
  moduleId: 'zone-garden',
  prefix: '/island/garden',
  routes: [
    {
      path: '',           // → /island/garden (인덱스)
      Component: GardenZoneScreen,
    },
  ],
}

export default routes
