/**
 * packages/backend/src/modules/index.ts
 * ------------------------------------------------------------
 * 역할: backend module API를 mount하거나 공통 helper를 제공한다.
 * 연결: 단일 Express 서버 안에서 모듈별 route/service 경계를 유지한다.
 * 주의: 새 모듈 action은 공통 route에 섞기보다 modules/{moduleId} 아래로 둔다.
 */
import { Router } from 'express'
import { codexRouter } from './codex/routes.js'
import { createDestinationIslandRouter } from './destination-island/routes.js'
import { lodgeRouter } from './lodge/routes.js'
import { myAidongRouter } from './my-aidong/routes.js'
import { myIslandRouter } from './my-island/routes.js'
import { routeNeighborRouter } from './route-neighbor/routes.js'
import { shipRouter } from './ship/routes.js'
import { createZoneRouter } from './zone/routes.js'

export const backendModuleRouter = Router()

backendModuleRouter.use('/codex', codexRouter)
backendModuleRouter.use('/lodge', lodgeRouter)
backendModuleRouter.use('/my-aidong', myAidongRouter)
backendModuleRouter.use('/my-island', myIslandRouter)
backendModuleRouter.use('/route-neighbor', routeNeighborRouter)
backendModuleRouter.use('/ship', shipRouter)
backendModuleRouter.use('/destination-shell-island', createDestinationIslandRouter('destination-shell-island'))
backendModuleRouter.use('/zone-garden', createZoneRouter('zone-garden'))
backendModuleRouter.use('/zone-oasis', createZoneRouter('zone-oasis'))
backendModuleRouter.use('/zone-memory', createZoneRouter('zone-memory'))
backendModuleRouter.use('/zone-mine', createZoneRouter('zone-mine'))






