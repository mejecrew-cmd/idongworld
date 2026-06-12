/**
 * 📁 zone-oasis/src/routes.tsx — 오아시스 모듈 라우트 (자율 등록)
 * 📌 manifest.route = '/island/oasis' 와 정합. frontend collectRoutes 합성.
 */
import type { ModuleRoutes } from '@idongworld/core'
import { ZoneScreen } from './ZoneScreen.tsx'

const routes: ModuleRoutes = {
  moduleId: 'zone-oasis',
  prefix: '/island/oasis',
  routes: [
    { path: '', Component: ZoneScreen },
  ],
}

export default routes
