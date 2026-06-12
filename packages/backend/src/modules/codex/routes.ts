/**
 * packages/backend/src/modules/codex/routes.ts
 * ------------------------------------------------------------
 * 역할: codex 모듈 action API의 HTTP route를 정의한다.
 * 연결: frontend codex action을 받아 uid/payload를 검증하고 codex service로 넘긴다.
 * 주의: route에는 복잡한 상태 전이를 넣지 말고 service error를 HTTP 응답으로 변환하는 데 집중한다.
 */
import { Router } from 'express'
import { getRequestUid } from '../../middleware/auth.js'
import { asString, ServiceError } from '../shared.js'
import { fullyRegisterCodex, unlockCodexSlot, unlockDiary } from './service.js'

export const codexRouter = Router()

codexRouter.post('/unlock-diary', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const diaryId = asString(req.body?.diaryId)
  if (!diaryId) return res.status(400).json({ error: 'invalid_diary_id' })

  try {
    const state = await unlockDiary(uid, diaryId)
    res.json({ ok: true, state })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})

codexRouter.post('/unlock-slot', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const entryId = asString(req.body?.entryId)
  if (!entryId) return res.status(400).json({ error: 'invalid_entry_id' })

  try {
    const state = await unlockCodexSlot(uid, entryId)
    res.json({ ok: true, state })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})

codexRouter.post('/fully-register', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const entryId = asString(req.body?.entryId)
  if (!entryId) return res.status(400).json({ error: 'invalid_entry_id' })

  try {
    const state = await fullyRegisterCodex(uid, entryId)
    res.json({ ok: true, state })
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.code })
    }
    throw error
  }
})
