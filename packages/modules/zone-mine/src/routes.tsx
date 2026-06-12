/**
 * 📁 zone-mine/src/routes.tsx — 도전의 절벽 모듈 라우트 (자율 등록)
 * 📌 manifest.route = '/island/mine' 와 정합. frontend collectRoutes 합성.
 */
import type { ModuleRoutes } from '@idongworld/core'
import { ZoneScreen } from './ZoneScreen.tsx'

const routes: ModuleRoutes = {
  moduleId: 'zone-mine',
  prefix: '/island/mine',
  routes: [
    { path: '', Component: ZoneScreen },
  ],
}

export default routes
