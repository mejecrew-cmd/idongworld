/**
 * packages/backend/src/routes/auth.ts
 * ------------------------------------------------------------
 * 역할: HTTP 요청을 backend service/repository 계층으로 연결한다.
 * 연결: frontend에서 온 요청을 uid 검증, payload 검증, 저장 계층 호출 순서로 처리한다.
 * 주의: route에 domain rule을 몰아넣지 말고 service/repository 경계를 유지한다.
 */
import { Router } from 'express'
import { getUserRepository } from '../repositories/index.js'
import { getRequestUid, getRequestUser } from '../middleware/auth.js'

export const authRouter = Router()

type SocialProvider = 'google' | 'twitter' | 'firebase'

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readProvider(value: unknown): SocialProvider | undefined {
  if (value === 'google' || value === 'twitter' || value === 'firebase') return value
  return undefined
}

authRouter.post('/guest', async (_req, res) => {
  const user = await getUserRepository().createGuestUser()
  res.json({ uid: user.uid, user })
})

authRouter.post('/session', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const body = req.body && typeof req.body === 'object'
    ? req.body as Record<string, unknown>
    : {}
  const provider = readProvider(body.provider)
  if (!provider) return res.status(400).json({ error: 'invalid_provider' })

  const requestUser = getRequestUser(req)
  const user = await getUserRepository().createOrUpdateAuthUser({
    uid,
    provider,
    email: readString(body.email) ?? requestUser?.email,
    displayName: readString(body.displayName),
    photoURL: readString(body.photoURL),
  })

  res.json({ uid: user.uid, user })
})

authRouter.get('/me', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const user = await getUserRepository().getUser(uid)
  if (!user) return res.status(404).json({ error: 'not_found' })

  res.json({ user })
})






