/**
 * packages/backend/src/modules/route-neighbor/routes.ts
 * ------------------------------------------------------------
 * 역할: 모듈 action API의 HTTP route를 정의한다.
 * 연결: frontend action 요청을 받아 uid/payload를 검증하고 module service로 넘긴다.
 * 주의: route에는 복잡한 상태 전이를 넣지 말고 service error를 HTTP 응답으로 변환하는 데 집중한다.
 */
import { Router } from 'express'
import { getRequestUid } from '../../middleware/auth.js'
import { asString, ServiceError } from '../shared.js'
import {
  acceptAidongEncounter,
  clearCurrentLanding,
  endRoute,
  getCurrentLanding,
  rollRoute,
  startRoute,
} from './service.js'

export const routeNeighborRouter = Router()

routeNeighborRouter.post('/start', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const routeId = asString(req.body?.routeId) || 'neighbor'
  try {
    const result = await startRoute(uid, routeId)
    res.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})

routeNeighborRouter.post('/roll', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const requestedSteps = req.body?.steps === undefined ? undefined : Number(req.body.steps)
  const routeId = asString(req.body?.routeId) || undefined
  const boardPosition = req.body?.boardPosition === undefined ? undefined : Number(req.body.boardPosition)

  try {
    const result = await rollRoute(uid, requestedSteps, { routeId, boardPosition })
    res.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})

routeNeighborRouter.post('/end', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const state = await endRoute(uid)
  res.json({ ok: true, state })
})

routeNeighborRouter.get('/landing/current', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const landing = await getCurrentLanding(uid)
  res.json({ ok: true, landing })
})

routeNeighborRouter.post('/landing/clear', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const landingId = asString(req.body?.landingId)
  const routeId = asString(req.body?.routeId) || undefined
  const boardPosition = req.body?.boardPosition === undefined ? undefined : Number(req.body.boardPosition)
  try {
    const result = await clearCurrentLanding(uid, landingId, { routeId, boardPosition })
    res.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})

routeNeighborRouter.post('/encounter/accept', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const characterId = asString(req.body?.characterId)
  const encounterId = asString(req.body?.encounterId) || undefined
  const zoneId = asString(req.body?.zoneId) || undefined
  if (!characterId) return res.status(400).json({ error: 'invalid_character_id' })

  try {
    const result = await acceptAidongEncounter(uid, { characterId, encounterId, zoneId })
    res.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})






