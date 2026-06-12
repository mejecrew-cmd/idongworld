/**
 * packages/backend/src/modules/my-aidong/routes.ts
 * ------------------------------------------------------------
 * 역할: 모듈 action API의 HTTP route를 정의한다.
 * 연결: frontend action 요청을 받아 uid/payload를 검증하고 module service로 넘긴다.
 * 주의: route에는 복잡한 상태 전이를 넣지 말고 service error를 HTTP 응답으로 변환하는 데 집중한다.
 */
import { Router } from 'express'
import { getRequestUid } from '../../middleware/auth.js'
import { asNumber, asString, ServiceError } from '../shared.js'
import {
  addAidongAffinity,
  grantAidongCodexItem,
  recruitAidong,
  requestAidongUpgrade,
  setAidongOutfit,
  toggleAidongEquippedItem,
} from './service.js'

export const myAidongRouter = Router()

// frontend의 recruitAidong action을 backend 권위 로직으로 실행한다.
// body.characterId만 받고, 실제 중복 방지와 needs/careLog 초기화는 service가 담당한다.
myAidongRouter.post('/recruit', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const characterId = asString(req.body?.characterId)
  if (!characterId) return res.status(400).json({ error: 'invalid_character_id' })

  const state = await recruitAidong(uid, characterId)
  res.json({ ok: true, state })
})

// frontend의 addAffinity action을 backend로 옮긴 경로다.
// route는 characterId/delta 타입만 검사하고, 영입 여부와 level 계산은 service에 맡긴다.
myAidongRouter.post('/affinity', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const characterId = asString(req.body?.characterId)
  const delta = asNumber(req.body?.delta, Number.NaN)
  if (!characterId) return res.status(400).json({ error: 'invalid_character_id' })
  if (!Number.isFinite(delta)) return res.status(400).json({ error: 'invalid_delta' })

  try {
    const state = await addAidongAffinity(uid, characterId, delta)
    res.json({ ok: true, state })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})

// frontend의 setOutfit action을 backend로 옮긴 경로다.
// my-aidong document의 equippedOutfit만 바꾸며 inventory 차감 같은 cross-boundary 처리는 하지 않는다.
myAidongRouter.post('/outfit', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const characterId = asString(req.body?.characterId)
  const outfitId = asString(req.body?.outfitId)
  if (!characterId) return res.status(400).json({ error: 'invalid_character_id' })
  if (!outfitId) return res.status(400).json({ error: 'invalid_outfit_id' })

  try {
    const state = await setAidongOutfit(uid, characterId, outfitId)
    res.json({ ok: true, state })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})

// Aidong 소지/착용 아이템은 hostStates.inventory에 보관하고, 여기서는 착용 상태만 toggle한다.
myAidongRouter.post('/items/equip-toggle', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const characterId = asString(req.body?.characterId)
  const itemId = asString(req.body?.itemId)
  if (!characterId) return res.status(400).json({ error: 'invalid_character_id' })
  if (!itemId) return res.status(400).json({ error: 'invalid_item_id' })

  try {
    const state = await toggleAidongEquippedItem(uid, characterId, itemId)
    res.json({ ok: true, state })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})

// Aidong별 도감 아이템 원장 shell.
// 실제 25종 catalog와 획득처가 확정되기 전까지는 itemId/amount/source만 기록한다.
myAidongRouter.post('/codex-items/grant', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const characterId = asString(req.body?.characterId)
  const itemId = asString(req.body?.itemId)
  const amount = asNumber(req.body?.amount, Number.NaN)
  const source = asString(req.body?.source) || 'placeholder'
  if (!characterId) return res.status(400).json({ error: 'invalid_character_id' })
  if (!itemId) return res.status(400).json({ error: 'invalid_item_id' })

  try {
    const state = await grantAidongCodexItem(uid, characterId, itemId, amount, source)
    res.json({ ok: true, state })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})

// Aidong 업그레이드 요청 shell.
// recipe와 재료 차감은 기획 확정 뒤 service validation으로 승격한다.
myAidongRouter.post('/upgrades/request', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const characterId = asString(req.body?.characterId)
  const upgradeId = asString(req.body?.upgradeId)
  const idempotencyKey = asString(req.body?.idempotencyKey) || undefined
  if (!characterId) return res.status(400).json({ error: 'invalid_character_id' })
  if (!upgradeId) return res.status(400).json({ error: 'invalid_upgrade_id' })

  try {
    const state = await requestAidongUpgrade(uid, characterId, upgradeId, idempotencyKey)
    res.json({ ok: true, state })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})






