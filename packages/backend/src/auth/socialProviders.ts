/**
 * packages/backend/src/auth/socialProviders.ts
 * ------------------------------------------------------------
 * 역할: 소셜 로그인 provider 목록, 공개 노출 상태, 검증 helper를 한 곳에서 관리한다.
 * 연결: auth route, user repository, frontend API 문서가 같은 provider 계약을 공유한다.
 * 주의: provider secret이나 실제 env 값은 절대 public response에 포함하지 않는다.
 */

export type SocialProvider =
  | 'google'
  | 'apple'
  | 'x'
  | 'kakao'
  | 'naver'
  | 'line'
  | 'facebook'
  | 'firebase'

export type SocialProviderStatus = 'enabled' | 'planned' | 'devOnly' | 'disabled'

export type SocialProviderAuthMode = 'firebase' | 'direct-oauth' | 'mock'

export interface SocialProviderConfig {
  provider: SocialProvider
  label: string
  status: SocialProviderStatus
  authMode: SocialProviderAuthMode
  displayOrder: number
  envKeys: string[]
  note?: string
}

export interface PublicSocialProvider {
  provider: SocialProvider
  label: string
  status: SocialProviderStatus
  authMode: SocialProviderAuthMode
  displayOrder: number
}

export const SOCIAL_PROVIDER_CONFIGS: SocialProviderConfig[] = [
  {
    provider: 'google',
    label: 'Google',
    status: 'planned',
    authMode: 'firebase',
    displayOrder: 10,
    envKeys: ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'],
    note: 'Firebase Auth 기반 Google 로그인을 붙이면 enabled로 전환한다.',
  },
  {
    provider: 'apple',
    label: 'Apple',
    status: 'planned',
    authMode: 'firebase',
    displayOrder: 20,
    envKeys: ['APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY'],
    note: '초기에는 provider 계약만 열어두고 직접 OAuth 교환은 추후 adapter로 분리한다.',
  },
  {
    provider: 'x',
    label: 'X',
    status: 'planned',
    authMode: 'direct-oauth',
    displayOrder: 30,
    envKeys: ['X_CLIENT_ID', 'X_CLIENT_SECRET'],
    note: '기존 twitter 명칭은 신규 API 계약에서 x로 정리한다.',
  },
  {
    provider: 'kakao',
    label: 'Kakao',
    status: 'planned',
    authMode: 'direct-oauth',
    displayOrder: 40,
    envKeys: ['KAKAO_CLIENT_ID', 'KAKAO_CLIENT_SECRET'],
  },
  {
    provider: 'naver',
    label: 'Naver',
    status: 'planned',
    authMode: 'direct-oauth',
    displayOrder: 50,
    envKeys: ['NAVER_CLIENT_ID', 'NAVER_CLIENT_SECRET'],
  },
  {
    provider: 'line',
    label: 'LINE',
    status: 'planned',
    authMode: 'direct-oauth',
    displayOrder: 60,
    envKeys: ['LINE_CHANNEL_ID', 'LINE_CHANNEL_SECRET'],
  },
  {
    provider: 'facebook',
    label: 'Facebook',
    status: 'planned',
    authMode: 'firebase',
    displayOrder: 70,
    envKeys: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'],
  },
  {
    provider: 'firebase',
    label: 'Firebase',
    status: 'enabled',
    authMode: 'firebase',
    displayOrder: 90,
    envKeys: ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'],
    note: '1차 실제 backend 검증 provider다.',
  },
]

const SOCIAL_PROVIDER_IDS = new Set<SocialProvider>(
  SOCIAL_PROVIDER_CONFIGS.map((config) => config.provider),
)

export function readSocialProvider(value: unknown): SocialProvider | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase()
  if (normalized === 'twitter') return 'x'
  return SOCIAL_PROVIDER_IDS.has(normalized as SocialProvider)
    ? normalized as SocialProvider
    : undefined
}

export function getSocialProviderConfig(provider: SocialProvider): SocialProviderConfig | undefined {
  return SOCIAL_PROVIDER_CONFIGS.find((config) => config.provider === provider)
}

export function isSocialProviderEnabled(provider: SocialProvider): boolean {
  return getSocialProviderConfig(provider)?.status === 'enabled'
}

export function getPublicSocialProviders(): PublicSocialProvider[] {
  return SOCIAL_PROVIDER_CONFIGS
    .map(({ provider, label, status, authMode, displayOrder }) => ({
      provider,
      label,
      status,
      authMode,
      displayOrder,
    }))
    .sort((left, right) => left.displayOrder - right.displayOrder)
}
