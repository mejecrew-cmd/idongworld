/**
 * packages/backend/src/routes/care.ts
 * ------------------------------------------------------------
 * 역할: HTTP 요청을 backend service/repository 계층으로 연결한다.
 * 연결: frontend에서 온 요청을 uid 검증, payload 검증, 저장 계층 호출 순서로 처리한다.
 * 주의: route에 domain rule을 몰아넣지 말고 service/repository 경계를 유지한다.
 */
import { Router } from 'express'
import type { AidongCharacterId } from '../store/memoryStore.js'
import { getRequestUid } from '../middleware/auth.js'
import { getUserRepository } from '../repositories/index.js'

export const careRouter = Router()

careRouter.post('/sync', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })
  const repo = getUserRepository()
  const user = await repo.getUser(uid)
  if (!user) return res.status(404).json({ error: 'not_found' })

  const { affinities, needs, coins } = req.body
  const updated = await repo.updateUser(uid, {
    affinities: affinities ?? user.affinities,
    needs: needs ?? user.needs,
    coins: coins ?? user.coins,
  })

  res.json({ user: updated })
})

careRouter.get('/state/:char', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })
  const user = await getUserRepository().getUser(uid)
  if (!user) return res.status(404).json({ error: 'not_found' })

  const char = req.params.char as AidongCharacterId
  res.json({
    affinity: user.affinities[char],
    needs: user.needs[char],
  })
})






