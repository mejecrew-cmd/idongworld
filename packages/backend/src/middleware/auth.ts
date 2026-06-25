/**
 * packages/backend/src/middleware/auth.ts
 * ------------------------------------------------------------
 * 역할: 요청에서 uid를 추출해 Express request context에 붙이는 인증 middleware다.
 * 연결: Firebase Admin이 켜져 있으면 Bearer token을 검증하고, 개발/호환 모드에서는 legacy uid header/query/body를 읽는다.
 * 주의: route는 body.uid를 직접 신뢰하지 말고 getRequestUid()를 통해 이 middleware 결과를 사용한다.
 */
import type { NextFunction, Request, Response } from 'express'
import { isFirebaseAdminEnabled, verifyIdToken } from '../lib/firebaseAdmin.js'
import { verifyPasswordSessionToken } from '../auth/passwordAuth.js'

export interface RequestUser {
  uid: string
  email?: string
  isAnonymous: boolean
  source: 'firebase' | 'password' | 'legacy'
}

export interface AuthedRequest extends Request {
  uid?: string
  email?: string
  isAnonymous?: boolean
  authSource?: RequestUser['source']
  user?: RequestUser
}

function readLegacyUid(req: Request): string | undefined {
  const body = req.body && typeof req.body === 'object'
    ? req.body as Record<string, unknown>
    : {}
  const value = req.headers['x-uid']
    ?? req.headers['x-guest-uid']
    ?? req.query.uid
    ?? body.uid
  return typeof value === 'string' && value ? value : undefined
}

export function isLegacyAuthFallbackEnabled(): boolean {
  const explicit = process.env.AUTH_LEGACY_UID_FALLBACK_ENABLED
  if (explicit === 'true') return true
  if (explicit === 'false') return false
  return process.env.NODE_ENV !== 'production'
}

export function isFirebaseAuthRequired(): boolean {
  const explicit = process.env.AUTH_FIREBASE_REQUIRED
  if (explicit === 'true') return true
  if (explicit === 'false') return false
  return process.env.NODE_ENV === 'production'
}

export function getAuthRuntimeStatus() {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    firebaseAdminEnabled: isFirebaseAdminEnabled(),
    firebaseAuthRequired: isFirebaseAuthRequired(),
    legacyUidFallbackEnabled: isLegacyAuthFallbackEnabled(),
  }
}

export function assertAuthRuntimeReady(): void {
  const status = getAuthRuntimeStatus()
  if (status.firebaseAuthRequired && !status.firebaseAdminEnabled) {
    throw new Error('firebase_admin_required')
  }
}

function attachUser(req: AuthedRequest, user: RequestUser): void {
  req.uid = user.uid
  req.email = user.email
  req.isAnonymous = user.isAnonymous
  req.authSource = user.source
  req.user = user
}

export async function authMiddleware(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (isFirebaseAdminEnabled()) {
    const auth = req.headers.authorization
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined
    const decoded = await verifyIdToken(token)
    if (decoded) {
      attachUser(req, {
        uid: decoded.uid,
        email: decoded.email,
        isAnonymous: decoded.isAnonymous,
        source: 'firebase',
      })
      return next()
    }
  }

  const auth = req.headers.authorization
  const bearerToken = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined
  const passwordSession = verifyPasswordSessionToken(bearerToken)
  if (passwordSession) {
    attachUser(req, {
      uid: passwordSession.uid,
      isAnonymous: false,
      source: 'password',
    })
    return next()
  }

  const legacyUid = isLegacyAuthFallbackEnabled() ? readLegacyUid(req) : undefined
  if (legacyUid) {
    attachUser(req, {
      uid: legacyUid,
      isAnonymous: true,
      source: 'legacy',
    })
  }

  next()
}

export function getRequestUser(req: Request): RequestUser | undefined {
  return (req as AuthedRequest).user
}

export function getRequestUid(req: Request): string {
  return getRequestUser(req)?.uid ?? ''
}








