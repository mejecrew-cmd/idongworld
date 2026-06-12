/**
 * 📁 route-neighbor/src/routes.tsx — 이웃섬 항로 자율 라우트
 * 📌 manifest.route = '/voyage' — 본 모듈은 '/voyage/neighbor' 진입점만.
 *     현재 보드 실 UI는 frontend NavigationBoardScene (/voyage/board).
 */
import type { ModuleRoutes } from '@idongworld/core'
import { ZoneScreen } from './ZoneScreen.tsx'

const routes: ModuleRoutes = {
  moduleId: 'route-neighbor',
  prefix: '/voyage/neighbor',
  routes: [
    { path: '', Component: ZoneScreen },
  ],
}

export default routes
