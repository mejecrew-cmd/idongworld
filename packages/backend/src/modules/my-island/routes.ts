/**
 * packages/backend/src/modules/my-island/routes.ts
 * ------------------------------------------------------------
 * 역할: my-island 모듈 action API의 HTTP route를 정의한다.
 * 연결: frontend bootstrap action을 받아 uid/payload를 검증하고 my-island service로 넘긴다.
 * 주의: route에는 복잡한 상태 전이를 넣지 말고 service error를 HTTP 응답으로 변환하는 데 집중한다.
 */
import { Router } from 'express'
import { getRequestUid } from '../../middleware/auth.js'
import { asNumber, asString, ServiceError } from '../shared.js'
import {
  completeTutorial,
  incorporateSlot,
  listZoneSlots,
  moveSlot,
  openDynamicAidongZone,
  releaseSlot,
  unlockZone,
  updateDynamicAidongZone,
} from './service.js'

export const myIslandRouter = Router()

function getZoneSlotsFromState(state: object) {
  return 'zoneSlots' in state ? state.zoneSlots : {}
}

myIslandRouter.post('/unlock-zone', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const zoneId = asString(req.body?.zoneId)
  if (!zoneId) return res.status(400).json({ error: 'invalid_zone_id' })

  try {
    const state = await unlockZone(uid, zoneId)
    res.json({ ok: true, state })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})

myIslandRouter.post('/tutorial/complete', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  try {
    const account = await completeTutorial(uid)
    res.json({ ok: true, account })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})

myIslandRouter.get('/slots', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  try {
    const state = await listZoneSlots(uid)
    res.json({ ok: true, state, zoneSlots: getZoneSlotsFromState(state) })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})

myIslandRouter.post('/slots/incorporate', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const areaNo = asString(req.body?.areaNo)
  const characterId = asString(req.body?.characterId)
  if (!areaNo) return res.status(400).json({ error: 'invalid_area_no' })
  if (!characterId) return res.status(400).json({ error: 'invalid_character_id' })

  try {
    const state = await incorporateSlot(uid, { areaNo, characterId })
    res.json({ ok: true, state, zoneSlots: getZoneSlotsFromState(state) })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})

myIslandRouter.post('/slots/release', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const areaNo = asString(req.body?.areaNo)
  if (!areaNo) return res.status(400).json({ error: 'invalid_area_no' })

  try {
    const state = await releaseSlot(uid, { areaNo })
    res.json({ ok: true, state, zoneSlots: getZoneSlotsFromState(state) })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})

myIslandRouter.post('/slots/move', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const fromAreaNo = asString(req.body?.fromAreaNo)
  const toAreaNo = asString(req.body?.toAreaNo)
  if (!fromAreaNo) return res.status(400).json({ error: 'invalid_from_area_no' })
  if (!toAreaNo) return res.status(400).json({ error: 'invalid_to_area_no' })

  try {
    const state = await moveSlot(uid, { fromAreaNo, toAreaNo })
    res.json({ ok: true, state, zoneSlots: getZoneSlotsFromState(state) })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})

myIslandRouter.post('/dynamic-zones/open', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const zoneId = asString(req.body?.zoneId)
  const characterId = asString(req.body?.characterId)
  if (!zoneId) return res.status(400).json({ error: 'invalid_zone_id' })
  if (!characterId) return res.status(400).json({ error: 'invalid_character_id' })

  try {
    const state = await openDynamicAidongZone(uid, {
      zoneId,
      characterId,
      displayOrder: req.body?.displayOrder === undefined
        ? undefined
        : asNumber(req.body.displayOrder, Number.NaN),
      pinned: typeof req.body?.pinned === 'boolean' ? req.body.pinned : undefined,
      source: asString(req.body?.source),
    })
    res.json({ ok: true, state })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})

myIslandRouter.post('/dynamic-zones/update', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const zoneId = asString(req.body?.zoneId)
  if (!zoneId) return res.status(400).json({ error: 'invalid_zone_id' })

  try {
    const state = await updateDynamicAidongZone(uid, {
      zoneId,
      status: req.body?.status === undefined ? undefined : asString(req.body.status),
      displayOrder: req.body?.displayOrder === undefined
        ? undefined
        : asNumber(req.body.displayOrder, Number.NaN),
      pinned: typeof req.body?.pinned === 'boolean' ? req.body.pinned : undefined,
    })
    res.json({ ok: true, state })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})
