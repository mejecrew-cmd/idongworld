/**
 * packages/backend/src/auth/socialProviderAdapters.ts
 * ------------------------------------------------------------
 * 역할: 소셜 provider별 token 검증을 공통 interface 뒤로 숨긴다.
 * 연결: `/api/auth/social/entry`는 이 adapter를 통해 검증된 identity만 user repository에 전달한다.
 * 주의: route에서 provider별 if/switch를 늘리지 말고 provider adapter를 추가하는 방식으로 확장한다.
 */
import { verifyIdToken } from '../lib/firebaseAdmin.js'
import {
  getSocialProviderConfig,
  type SocialProvider,
} from './socialProviders.js'

export interface SocialEntryInput {
  provider: SocialProvider
  idTokenProvider?: 'firebase'
  idToken?: string
  firebaseIdToken?: string
  providerUid?: string
  email?: string
  displayName?: string
  photoURL?: string
}

export interface VerifiedSocialIdentity {
  provider: SocialProvider
  providerUid: string
  email?: string
  emailVerified?: boolean
  displayName?: string
  photoURL?: string
}

export interface SocialProviderAdapter {
  provider: SocialProvider
  verify(input: SocialEntryInput): Promise<VerifiedSocialIdentity>
}

export type SocialProviderVerificationErrorCode =
  | 'unsupported_provider'
  | 'provider_not_enabled'
  | 'invalid_provider_token'
  | 'provider_identity_missing'

export class SocialProviderVerificationError extends Error {
  code: SocialProviderVerificationErrorCode
  status: number

  constructor(code: SocialProviderVerificationErrorCode, status = 400) {
    super(code)
    this.name = 'SocialProviderVerificationError'
    this.code = code
    this.status = status
  }
}

function pickFirebaseToken(input: SocialEntryInput): string | undefined {
  return input.firebaseIdToken ?? input.idToken
}

const firebaseAdapter: SocialProviderAdapter = {
  provider: 'firebase',

  async verify(input) {
    if (input.idTokenProvider !== 'firebase') {
      throw new SocialProviderVerificationError('invalid_provider_token', 401)
    }

    const decoded = await verifyIdToken(pickFirebaseToken(input))
    if (!decoded) {
      throw new SocialProviderVerificationError('invalid_provider_token', 401)
    }

    if (!decoded.uid) {
      throw new SocialProviderVerificationError('provider_identity_missing', 400)
    }

    return {
      provider: input.provider,
      providerUid: decoded.uid,
      email: decoded.email ?? input.email,
      emailVerified: decoded.emailVerified,
      displayName: decoded.displayName ?? input.displayName,
      photoURL: decoded.photoURL ?? input.photoURL,
    }
  },
}

const adapters: Partial<Record<SocialProvider, SocialProviderAdapter>> = {
  firebase: firebaseAdapter,
}

export function getSocialProviderAdapter(provider: SocialProvider): SocialProviderAdapter | undefined {
  return adapters[provider]
}

export async function verifySocialIdentity(input: SocialEntryInput): Promise<VerifiedSocialIdentity> {
  const config = getSocialProviderConfig(input.provider)
  if (!config) {
    throw new SocialProviderVerificationError('unsupported_provider', 400)
  }
  if (config.status !== 'enabled') {
    throw new SocialProviderVerificationError('provider_not_enabled', 409)
  }

  const adapter = getSocialProviderAdapter(input.provider)
  if (!adapter) {
    throw new SocialProviderVerificationError('unsupported_provider', 400)
  }

  return adapter.verify(input)
}
