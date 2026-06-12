/**
 * packages/backend/src/modules/lodge/routes.ts
 * ------------------------------------------------------------
 * 역할: 숙소 모듈 action API의 HTTP route를 정의한다.
 * 연결: frontend 숙소 화면 요청을 받아 uid/payload를 검증하고 lodge service로 넘긴다.
 * 주의: route에는 복잡한 상태 전이를 넣지 말고 service error를 HTTP 응답으로 변환하는 데 집중한다.
 */
import { Router } from 'express'
import { getRequestUid } from '../../middleware/auth.js'
import { asString, ServiceError } from '../shared.js'
import {
  getLodgeConfig,
  purchaseLodgeFurniture,
  toggleLodgeAidongAssign,
  toggleLodgeRoomFurniture,
} from './service.js'

export const lodgeRouter = Router()

function handleLodgeError(error: unknown, res: import('express').Response) {
  if (error instanceof ServiceError) {
    return res.status(error.status).json({ error: error.code })
  }
  throw error
}

lodgeRouter.get('/config', (_req, res) => {
  res.json({ ok: true, ...getLodgeConfig() })
})

lodgeRouter.post('/aidongs/assign-toggle', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const characterId = asString(req.body?.characterId)
  if (!characterId) return res.status(400).json({ error: 'invalid_character_id' })

  try {
    const state = await toggleLodgeAidongAssign(uid, characterId)
    res.json({ ok: true, state })
  } catch (error) {
    return handleLodgeError(error, res)
  }
})

lodgeRouter.post('/furniture/purchase', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const itemId = asString(req.body?.itemId)
  if (!itemId) return res.status(400).json({ error: 'invalid_item_id' })

  try {
    const result = await purchaseLodgeFurniture(uid, itemId)
    res.json({ ok: true, ...result })
  } catch (error) {
    return handleLodgeError(error, res)
  }
})

lodgeRouter.post('/rooms/furniture/toggle', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const roomId = asString(req.body?.roomId)
  const itemId = asString(req.body?.itemId)
  if (!roomId) return res.status(400).json({ error: 'invalid_room_id' })
  if (!itemId) return res.status(400).json({ error: 'invalid_item_id' })

  try {
    const state = await toggleLodgeRoomFurniture(uid, roomId, itemId)
    res.json({ ok: true, state })
  } catch (error) {
    return handleLodgeError(error, res)
  }
})
