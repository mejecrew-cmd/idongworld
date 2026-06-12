import type { ModuleRoutes } from '@idongworld/core'
import { DestinationIslandScreen } from './DestinationIslandScreen.tsx'

const routes: ModuleRoutes = {
  moduleId: 'destination-shell-island',
  prefix: '/voyage/island/shell',
  routes: [
    {
      path: '',
      Component: DestinationIslandScreen,
    },
  ],
}

export function DestinationShellIslandRoutes() {
  return <DestinationIslandScreen />
}

export default routes
