/**
 * 📁 zone-memory/src/routes.tsx — 기억의 숲 모듈 라우트 (자율 등록)
 * 📌 manifest.route = '/island/memory' 와 정합. frontend collectRoutes 합성.
 */
import type { ModuleRoutes } from '@idongworld/core'
import { ZoneScreen } from './ZoneScreen.tsx'

const routes: ModuleRoutes = {
  moduleId: 'zone-memory',
  prefix: '/island/memory',
  routes: [
    { path: '', Component: ZoneScreen },
  ],
}

export default routes
