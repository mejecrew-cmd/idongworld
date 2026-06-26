/**
 * packages/backend/src/routes/account.ts
 * ------------------------------------------------------------
 * 역할: account/session 관련 API를 처리한다.
 * 연결: auth/account 성격의 상태를 user/global gameplay state와 분리한다.
 * 주의: uid는 request payload가 아니라 auth middleware 결과를 기준으로 판단한다.
 */
import { Router } from 'express'
import { getRequestUid } from '../middleware/auth.js'
import { getUserRepository } from '../repositories/index.js'

export const accountRouter = Router()

const ACCOUNT_FIELDS = [
  'isGuest',
  'nickname',
  'gameStartedAt',
  'openingSeen',
  'sooksoClean',
  'onboardingComplete',
  'hostName',
  'sooksoName',
] as const

function normalizeTimestamp(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined
}

function pickAccountPatch(source: Record<string, unknown>) {
  const patch: Record<string, unknown> = {}
  for (const field of ACCOUNT_FIELDS) {
    if (field in source) patch[field] = source[field]
  }
  if ('gameStartedAt' in patch) {
    const gameStartedAt = normalizeTimestamp(patch.gameStartedAt)
    if (gameStartedAt === undefined) delete patch.gameStartedAt
    else patch.gameStartedAt = gameStartedAt
  }
  return patch
}

accountRouter.get('/state', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const user = await getUserRepository().getUser(uid)
  if (!user) return res.status(404).json({ error: 'not_found' })

  res.json({
    state: {
      uid: user.uid,
      isGuest: user.isGuest,
      nickname: user.nickname,
      gameStartedAt: user.gameStartedAt,
      openingSeen: user.openingSeen,
      sooksoClean: Boolean(user.sooksoClean),
      onboardingComplete: user.onboardingComplete,
      hostName: user.hostName,
      sooksoName: user.sooksoName,
    },
  })
})

accountRouter.patch('/state', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const patch = req.body?.patch
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return res.status(400).json({ error: 'invalid_patch' })
  }

  const updated = await getUserRepository().updateUser(uid, pickAccountPatch(patch))
  if (!updated) return res.status(404).json({ error: 'not_found' })

  res.json({
    state: {
      uid: updated.uid,
      isGuest: updated.isGuest,
      nickname: updated.nickname,
      gameStartedAt: updated.gameStartedAt,
      openingSeen: updated.openingSeen,
      sooksoClean: Boolean(updated.sooksoClean),
      onboardingComplete: updated.onboardingComplete,
      hostName: updated.hostName,
      sooksoName: updated.sooksoName,
    },
  })
})






