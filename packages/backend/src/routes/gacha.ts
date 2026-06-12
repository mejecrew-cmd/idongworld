/**
 * packages/backend/src/routes/gacha.ts
 * ------------------------------------------------------------
 * 역할: HTTP 요청을 backend service/repository 계층으로 연결한다.
 * 연결: frontend에서 온 요청을 uid 검증, payload 검증, 저장 계층 호출 순서로 처리한다.
 * 주의: route에 domain rule을 몰아넣지 말고 service/repository 경계를 유지한다.
 */
import { Router } from 'express'
import type { AidongCharacterId } from '../store/memoryStore.js'
import { getRequestUid } from '../middleware/auth.js'
import { getUserRepository } from '../repositories/index.js'

export const gachaRouter = Router()

const POOL: AidongCharacterId[] = [
  'aidong-hwanggumeong',
  'aidong-chunyangi',
  'aidong-mongsegye',
  'aidong-pungpungbom',
  'aidong-kawoo',
]

const COSTS = [0, 0, 50, 100]

gachaRouter.post('/first', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })
  const repo = getUserRepository()
  const user = await repo.getUser(uid)
  if (!user) return res.status(404).json({ error: 'not_found' })

  const attempts = user.firstGachaAttempts ?? 0
  const cost = COSTS[attempts] ?? 100
  if (attempts >= COSTS.length) {
    return res.status(400).json({ error: 'limit_exceeded' })
  }
  if (user.gems < cost) {
    return res.status(402).json({ error: 'insufficient_gems', cost })
  }

  const idx = Math.floor(Math.random() * POOL.length)
  const candidate = POOL[idx]!
  const updated = await repo.updateUser(uid, {
    firstGachaCandidate: candidate,
    firstGachaAttempts: attempts + 1,
    gems: user.gems - cost,
  })

  res.json({
    result: { characterId: candidate, attempt: attempts + 1, cost },
    user: updated,
  })
})

gachaRouter.post('/confirm', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })
  const repo = getUserRepository()
  const user = await repo.getUser(uid)
  if (!user) return res.status(404).json({ error: 'not_found' })

  const charId = req.body.characterId as AidongCharacterId
  if (!POOL.includes(charId)) return res.status(400).json({ error: 'invalid_char' })

  const recruited = user.recruitedAidongs.includes(charId)
    ? user.recruitedAidongs
    : [...user.recruitedAidongs, charId]
  const updated = await repo.updateUser(uid, {
    recruitedAidongs: recruited,
    firstGachaCandidate: undefined,
  })

  res.json({ user: updated })
})






