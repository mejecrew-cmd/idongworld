/**
 * packages/backend/src/modules/ship/routes.ts
 * ------------------------------------------------------------
 * 역할: 모듈 action API의 HTTP route를 정의한다.
 * 연결: frontend action 요청을 받아 uid/payload를 검증하고 module service로 넘긴다.
 * 주의: route에는 복잡한 상태 전이를 넣지 말고 service error를 HTTP 응답으로 변환하는 데 집중한다.
 */
import { Router } from 'express'
import { getRequestUid } from '../../middleware/auth.js'
import { asNumber, asString, ServiceError } from '../shared.js'
import {
  assignCabinSlot,
  assignDeckSlot,
  changeShipType,
  chargeHarborDice,
  getShipConfig,
  purchaseCabinFurniture,
  toggleCabinFurniture,
  toggleHarborAssign,
} from './service.js'

export const shipRouter = Router()

function handleShipError(error: unknown, res: import('express').Response) {
  if (error instanceof ServiceError) {
    return res.status(error.status).json({ error: error.code })
  }
  if (error instanceof Error && error.message === 'invalid_ship_type') {
    return res.status(400).json({ error: 'invalid_ship_type' })
  }
  throw error
}

shipRouter.get('/config', (_req, res) => {
  res.json({ ok: true, ...getShipConfig() })
})

shipRouter.post('/type/change', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const shipTypeId = asString(req.body?.shipTypeId)
  if (!shipTypeId) return res.status(400).json({ error: 'invalid_ship_type' })

  try {
    const state = await changeShipType(uid, shipTypeId)
    res.json({ ok: true, state })
  } catch (error) {
    return handleShipError(error, res)
  }
})

shipRouter.post('/cabins/assign', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const slotId = asString(req.body?.slotId)
  if (!slotId) return res.status(400).json({ error: 'invalid_cabin_slot_id' })

  const characterId = asString(req.body?.characterId) || undefined
  const context = asString(req.body?.context) === 'voyage' ? 'voyage' : 'harbor'
  try {
    const state = await assignCabinSlot(uid, slotId, characterId, context)
    res.json({ ok: true, state })
  } catch (error) {
    return handleShipError(error, res)
  }
})

shipRouter.post('/deck/assign', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const slotId = asString(req.body?.slotId)
  if (!slotId) return res.status(400).json({ error: 'invalid_deck_slot_id' })

  const characterId = asString(req.body?.characterId) || undefined
  const context = asString(req.body?.context) === 'voyage' ? 'voyage' : 'harbor'
  try {
    const state = await assignDeckSlot(uid, slotId, characterId, context)
    res.json({ ok: true, state })
  } catch (error) {
    return handleShipError(error, res)
  }
})

shipRouter.post('/harbor/assign-toggle', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const characterId = asString(req.body?.characterId)
  if (!characterId) return res.status(400).json({ error: 'invalid_character_id' })

  try {
    const state = await toggleHarborAssign(uid, characterId)
    res.json({ ok: true, state })
  } catch (error) {
    return handleShipError(error, res)
  }
})

shipRouter.post('/harbor/charge', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const now = asNumber(req.body?.now, Date.now())
  try {
    const result = await chargeHarborDice(uid, now)
    res.json({ ok: true, ...result })
  } catch (error) {
    return handleShipError(error, res)
  }
})

shipRouter.post('/cabins/furniture/purchase', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const itemId = asString(req.body?.itemId)
  if (!itemId) return res.status(400).json({ error: 'invalid_item_id' })

  try {
    const result = await purchaseCabinFurniture(uid, itemId)
    res.json({ ok: true, ...result })
  } catch (error) {
    return handleShipError(error, res)
  }
})

shipRouter.post('/cabins/furniture/toggle', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const slotId = asString(req.body?.slotId)
  const itemId = asString(req.body?.itemId)
  if (!slotId) return res.status(400).json({ error: 'invalid_cabin_slot_id' })
  if (!itemId) return res.status(400).json({ error: 'invalid_item_id' })

  try {
    const state = await toggleCabinFurniture(uid, slotId, itemId)
    res.json({ ok: true, state })
  } catch (error) {
    return handleShipError(error, res)
  }
})






