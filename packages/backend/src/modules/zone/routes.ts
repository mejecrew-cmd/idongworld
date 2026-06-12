/**
 * packages/backend/src/modules/zone/routes.ts
 * ------------------------------------------------------------
 * 역할: zone 계열 콘텐츠 모듈의 공통 action API route를 정의한다.
 * 연결: /api/modules/{zone-id}/collect, /clear 요청을 zone service로 넘긴다.
 * 주의: route는 uid/payload 검증과 HTTP 응답 매핑만 담당하고, 자원 이동은 customs를 우선한다.
 */
import { Router } from 'express'
import { getRequestUid } from '../../middleware/auth.js'
import { asNumber, asString, ServiceError } from '../shared.js'
import {
  assignZoneProduction,
  claimZoneProduction,
  clearZone,
  collectZoneResource,
  unassignZoneProduction,
} from './service.js'

export function createZoneRouter(moduleId: string): Router {
  const router = Router()

  router.post('/collect', async (req, res) => {
    const uid = getRequestUid(req)
    if (!uid) return res.status(401).json({ error: 'no_uid' })

    const resource = asString(req.body?.resource)
    const amount = asNumber(req.body?.amount, Number.NaN)
    if (!resource) return res.status(400).json({ error: 'invalid_resource' })
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'invalid_amount' })
    }

    try {
      const state = await collectZoneResource(uid, moduleId, resource, amount)
      res.json({ ok: true, state })
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.status).json({ error: error.code })
      }
      throw error
    }
  })

  router.post('/clear', async (req, res) => {
    const uid = getRequestUid(req)
    if (!uid) return res.status(401).json({ error: 'no_uid' })

    const clearId = asString(req.body?.clearId) || undefined
    const result = req.body?.result
    const idempotencyKey = asString(req.body?.idempotencyKey) || undefined

    try {
      const clearResult = await clearZone(uid, moduleId, clearId, result, idempotencyKey)
      res.json({ ok: true, ...clearResult })
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.status).json({ error: error.code })
      }
      throw error
    }
  })

  router.post('/production/assign', async (req, res) => {
    const uid = getRequestUid(req)
    if (!uid) return res.status(401).json({ error: 'no_uid' })

    const characterId = asString(req.body?.characterId)
    const slotId = asString(req.body?.slotId) || 'default'
    if (!characterId) return res.status(400).json({ error: 'invalid_character_id' })

    try {
      const state = await assignZoneProduction(uid, moduleId, characterId, slotId)
      res.json({ ok: true, state })
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.status).json({ error: error.code })
      }
      throw error
    }
  })

  router.post('/production/unassign', async (req, res) => {
    const uid = getRequestUid(req)
    if (!uid) return res.status(401).json({ error: 'no_uid' })

    const slotId = asString(req.body?.slotId) || 'default'

    try {
      const state = await unassignZoneProduction(uid, moduleId, slotId)
      res.json({ ok: true, state })
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.status).json({ error: error.code })
      }
      throw error
    }
  })

  router.post('/production/claim', async (req, res) => {
    const uid = getRequestUid(req)
    if (!uid) return res.status(401).json({ error: 'no_uid' })

    const slotId = asString(req.body?.slotId) || 'default'
    const idempotencyKey = asString(req.body?.idempotencyKey) || undefined

    try {
      const result = await claimZoneProduction(uid, moduleId, slotId, idempotencyKey)
      res.json({ ok: true, ...result })
    } catch (error) {
      if (error instanceof ServiceError) {
        return res.status(error.status).json({ error: error.code })
      }
      throw error
    }
  })

  return router
}
