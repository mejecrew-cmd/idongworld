/**
 * packages/backend/src/modules/aidong-island/routes.ts
 * ------------------------------------------------------------
 * 역할: M22 아이동섬 module의 HTTP action API를 정의한다.
 * 연결: frontend가 상륙, 이동/상호작용, 영입, 이탈 요청을 보내면 service로 넘긴다.
 * 주의: route는 입력 검증과 HTTP 응답 변환만 담당하고, 영입/편입 책임은 service 경계를 따른다.
 */
import { Router } from 'express'
import { getRequestUid } from '../../middleware/auth.js'
import { asString, ServiceError } from '../shared.js'
import {
  getAidongIslandConfig,
  interactAidongIsland,
  landAidongIsland,
  leaveAidongIsland,
  moveAidongIsland,
  recruitFromAidongIsland,
} from './service.js'

const DIRECTIONS = new Set(['north', 'south', 'west', 'east'])

function handleAidongIslandError(error: unknown, res: import('express').Response) {
  if (error instanceof ServiceError) {
    return res.status(error.status).json({ error: error.code })
  }
  throw error
}

export const aidongIslandRouter = Router()

aidongIslandRouter.get('/config', (req, res) => {
  const islandId = asString(req.query?.islandId) || 'first-aidong-island'
  try {
    res.json({ ok: true, config: getAidongIslandConfig(islandId) })
  } catch (error) {
    return handleAidongIslandError(error, res)
  }
})

aidongIslandRouter.post('/land', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const islandId = asString(req.body?.islandId) || 'first-aidong-island'
  try {
    const state = await landAidongIsland(uid, islandId)
    res.json({ ok: true, state })
  } catch (error) {
    return handleAidongIslandError(error, res)
  }
})

aidongIslandRouter.post('/move', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const direction = asString(req.body?.direction)
  if (!DIRECTIONS.has(direction)) return res.status(400).json({ error: 'invalid_direction' })

  try {
    const state = await moveAidongIsland(uid, direction as 'north' | 'south' | 'west' | 'east')
    res.json({ ok: true, state })
  } catch (error) {
    return handleAidongIslandError(error, res)
  }
})

aidongIslandRouter.post('/interact', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const hotspotId = asString(req.body?.hotspotId)
  if (!hotspotId) return res.status(400).json({ error: 'invalid_hotspot_id' })

  try {
    const result = await interactAidongIsland(uid, hotspotId)
    res.json({ ok: true, ...result })
  } catch (error) {
    return handleAidongIslandError(error, res)
  }
})

aidongIslandRouter.post('/recruit', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const characterId = asString(req.body?.characterId)
  if (!characterId) return res.status(400).json({ error: 'invalid_character_id' })

  try {
    const result = await recruitFromAidongIsland(uid, characterId)
    res.json({ ok: true, ...result })
  } catch (error) {
    return handleAidongIslandError(error, res)
  }
})

aidongIslandRouter.post('/leave', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  try {
    const state = await leaveAidongIsland(uid)
    res.json({ ok: true, state })
  } catch (error) {
    return handleAidongIslandError(error, res)
  }
})