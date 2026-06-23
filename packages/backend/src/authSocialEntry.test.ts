/**
 * packages/backend/src/authSocialEntry.test.ts
 * ------------------------------------------------------------
 * 역할: Firebase token 검증을 mock하여 social entry 성공 분기를 검증한다.
 * 연결: auth route가 기존/신규 계정과 nextStep을 같은 계약으로 반환하는지 확인한다.
 * 주의: 실제 provider token 검증은 firebaseAdmin 구현이 담당하고, 이 테스트는 route 계약에 집중한다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import { initializeRepositories } from './repositories/index.js'
import { authRouter } from './routes/auth.js'
import { verifyIdToken } from './lib/firebaseAdmin.js'

vi.mock('./lib/firebaseAdmin.js', () => ({
  verifyIdToken: vi.fn(),
}))

const mockedVerifyIdToken = vi.mocked(verifyIdToken)

async function closeServer(server: ReturnType<ReturnType<typeof express>['listen']>) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

describe('auth social entry route', () => {
  beforeEach(() => {
    initializeRepositories()
    mockedVerifyIdToken.mockReset()
  })

  it('creates a new account from a verified Firebase identity', async () => {
    mockedVerifyIdToken.mockResolvedValue({
      uid: 'firebase-social-user',
      email: 'social@example.com',
      emailVerified: true,
      displayName: 'Social User',
      photoURL: 'https://example.com/social.png',
      signInProvider: 'google.com',
      isAnonymous: false,
    })

    const app = express()
    app.use(express.json())
    app.use('/api/auth', authRouter)
    const server = app.listen(0)

    try {
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('invalid_test_server_address')

      const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/social/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'firebase',
          idTokenProvider: 'firebase',
          idToken: 'verified-token',
        }),
      })
      expect(response.status).toBe(200)
      const payload = await response.json() as {
        ok?: boolean
        uid?: string
        isNew?: boolean
        nextStep?: string
        account?: Record<string, unknown>
        user?: Record<string, unknown>
      }
      expect(payload).toMatchObject({
        ok: true,
        uid: 'firebase-social-user',
        isNew: true,
        nextStep: 'signup',
        account: {
          authProvider: 'firebase',
          providerUid: 'firebase-social-user',
          email: 'social@example.com',
          signupProfileCompleted: false,
        },
        user: {
          uid: 'firebase-social-user',
          authProvider: 'firebase',
          providerUid: 'firebase-social-user',
          emailNormalized: 'social@example.com',
          displayName: 'Social User',
        },
      })
    } finally {
      await closeServer(server)
    }
  })

  it('returns an existing account for the same verified Firebase identity', async () => {
    mockedVerifyIdToken.mockResolvedValue({
      uid: 'firebase-social-existing-user',
      email: 'first@example.com',
      emailVerified: true,
      displayName: 'First Name',
      signInProvider: 'google.com',
      isAnonymous: false,
    })

    const app = express()
    app.use(express.json())
    app.use('/api/auth', authRouter)
    const server = app.listen(0)

    try {
      const address = server.address()
      if (!address || typeof address === 'string') throw new Error('invalid_test_server_address')
      const url = `http://127.0.0.1:${address.port}/api/auth/social/entry`

      const first = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'firebase',
          idTokenProvider: 'firebase',
          idToken: 'first-token',
        }),
      })
      expect(first.status).toBe(200)
      await expect(first.json()).resolves.toMatchObject({
        isNew: true,
        uid: 'firebase-social-existing-user',
      })

      mockedVerifyIdToken.mockResolvedValue({
        uid: 'firebase-social-existing-user',
        email: 'updated@example.com',
      emailVerified: true,
      displayName: 'Updated Name',
      signInProvider: 'google.com',
      isAnonymous: false,
      })

      const second = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'firebase',
          idTokenProvider: 'firebase',
          idToken: 'second-token',
        }),
      })
      expect(second.status).toBe(200)
      await expect(second.json()).resolves.toMatchObject({
        ok: true,
        uid: 'firebase-social-existing-user',
        isNew: false,
        account: {
          providerUid: 'firebase-social-existing-user',
          email: 'updated@example.com',
        },
        user: {
          uid: 'firebase-social-existing-user',
          emailNormalized: 'updated@example.com',
          displayName: 'Updated Name',
          nickname: 'First Name',
        },
      })
    } finally {
      await closeServer(server)
    }
  })
})
