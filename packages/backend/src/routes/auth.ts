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
import { hashPassword, issuePasswordSessionToken, verifyPassword } from '../auth/passwordAuth.js'

export const authRouter = Router()

type SocialProvider = 'google' | 'twitter' | 'firebase'

const LOGIN_ID_PATTERN = /^[a-zA-Z0-9_]{4,20}$/
const MIN_PASSWORD_LENGTH = 6

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readProvider(value: unknown): SocialProvider | undefined {
  if (value === 'google' || value === 'twitter' || value === 'firebase') return value
  return undefined
}

function normalizeLoginId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeLoginIdKey(value: string): string {
  return value.toLocaleLowerCase('ko-KR')
}

function readPassword(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function createPasswordUid(loginIdKey: string): string {
  return `id-${loginIdKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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

authRouter.post('/password/signup', async (req, res) => {
  const loginId = normalizeLoginId(req.body?.loginId)
  const password = readPassword(req.body?.password)
  const passwordConfirm = readPassword(req.body?.passwordConfirm)

  if (!LOGIN_ID_PATTERN.test(loginId)) {
    return res.status(400).json({ error: 'invalid_login_id' })
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'invalid_password' })
  }
  if (password !== passwordConfirm) {
    return res.status(400).json({ error: 'password_mismatch' })
  }

  const repo = getUserRepository()
  const loginIdNormalized = normalizeLoginIdKey(loginId)
  const existing = await repo.findByLoginId(loginIdNormalized)
  if (existing) return res.status(409).json({ error: 'login_id_taken' })

  const user = await repo.createPasswordUser({
    uid: createPasswordUid(loginIdNormalized),
    loginId,
    loginIdNormalized,
    passwordHash: hashPassword(password),
  })
  const token = issuePasswordSessionToken(user.uid)
  res.json({ uid: user.uid, token, user })
})

authRouter.post('/password/login', async (req, res) => {
  const loginId = normalizeLoginId(req.body?.loginId)
  const password = readPassword(req.body?.password)
  if (!LOGIN_ID_PATTERN.test(loginId) || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'invalid_credentials' })
  }

  const user = await getUserRepository().findByLoginId(normalizeLoginIdKey(loginId))
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'invalid_credentials' })
  }

  const token = issuePasswordSessionToken(user.uid)
  res.json({ uid: user.uid, token, user })
})

authRouter.delete('/account', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const deleted = await getUserRepository().deleteUser(uid)
  if (!deleted) return res.status(404).json({ error: 'not_found' })

  res.json({ ok: true })
})

authRouter.get('/me', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const user = await getUserRepository().getUser(uid)
  if (!user) return res.status(404).json({ error: 'not_found' })

  res.json({ user })
})






