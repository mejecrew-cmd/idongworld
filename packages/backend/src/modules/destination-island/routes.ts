/**
 * packages/backend/src/modules/destination-island/routes.ts
 * ------------------------------------------------------------
 * 역할: destination-island 모듈의 HTTP action API를 정의한다.
 * 연결: frontend가 고정맵 이동, hotspot 상호작용, 미션 클리어 요청을 보내면
 *       uid와 payload를 검증한 뒤 service로 넘긴다.
 * 주의: route는 입력 검증과 HTTP 응답 변환만 담당하고, 상태 전이 규칙은 service에 둔다.
 */
import { Router } from 'express'
import { getRequestUid } from '../../middleware/auth.js'
import { asString, ServiceError } from '../shared.js'
import {
  clearDestinationMission,
  getDestinationIslandConfig,
  interactDestinationHotspot,
  moveDestinationIsland,
} from './service.js'

const DIRECTIONS = new Set(['north', 'south', 'west', 'east'])

function handleDestinationIslandError(error: unknown, res: import('express').Response) {
  if (error instanceof ServiceError) {
    return res.status(error.status).json({ error: error.code })
  }
  throw error
}

export function createDestinationIslandRouter(moduleId: string): Router {
  const router = Router()

  router.get('/config', (_req, res) => {
    try {
      res.json({ ok: true, config: getDestinationIslandConfig(moduleId) })
    } catch (error) {
      return handleDestinationIslandError(error, res)
    }
  })

  router.post('/move', async (req, res) => {
    const uid = getRequestUid(req)
    if (!uid) return res.status(401).json({ error: 'no_uid' })

    const direction = asString(req.body?.direction)
    if (!DIRECTIONS.has(direction)) {
      return res.status(400).json({ error: 'invalid_direction' })
    }

    try {
      const state = await moveDestinationIsland(
        uid,
        moduleId,
        direction as 'north' | 'south' | 'west' | 'east',
      )
      res.json({ ok: true, state })
    } catch (error) {
      return handleDestinationIslandError(error, res)
    }
  })

  router.post('/hotspots/interact', async (req, res) => {
    const uid = getRequestUid(req)
    if (!uid) return res.status(401).json({ error: 'no_uid' })

    const hotspotId = asString(req.body?.hotspotId)
    if (!hotspotId) return res.status(400).json({ error: 'invalid_hotspot_id' })

    try {
      const result = await interactDestinationHotspot(uid, moduleId, hotspotId)
      res.json({ ok: true, ...result })
    } catch (error) {
      return handleDestinationIslandError(error, res)
    }
  })

  router.post('/missions/clear', async (req, res) => {
    const uid = getRequestUid(req)
    if (!uid) return res.status(401).json({ error: 'no_uid' })

    const missionId = asString(req.body?.missionId)
    if (!missionId) return res.status(400).json({ error: 'invalid_mission_id' })

    try {
      const result = await clearDestinationMission(uid, moduleId, missionId)
      res.json({ ok: true, ...result })
    } catch (error) {
      return handleDestinationIslandError(error, res)
    }
  })

  return router
}
