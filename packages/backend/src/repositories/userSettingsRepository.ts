/**
 * packages/backend/src/repositories/userSettingsRepository.ts
 * ------------------------------------------------------------
 * 역할: 약관/마케팅/푸시/사운드/시간대 설정을 users 문서에서 분리한 저장소 계약이다.
 * 연결: auth signup complete, account state route, 이후 settings API가 이 repository를 기준으로 동작한다.
 * 주의: 법적 동의 이력의 원본 감사 정책은 별도 설계 전까지 users.termsAgreements와 mirror 유지한다.
 */
import { DEFAULT_SOUND_SETTINGS, type SoundSettings, type TermsAgreementState, type UserDoc } from '../store/memoryStore.js'

export interface UserSettingsDoc {
  uid: string
  locale?: string
  timeZone?: string
  detectedTimeZone?: string
  utcOffsetMinutes?: number
  termsAccepted: boolean
  termsVersion?: string
  termsAcceptedAt?: number
  privacyAccepted: boolean
  privacyVersion?: string
  privacyAcceptedAt?: number
  marketingAccepted: boolean
  pushNotificationAccepted: boolean
  bgmVolume: number
  sfxVolume: number
  vibrationEnabled?: boolean
  reduceMotionEnabled?: boolean
  textSizeLevel?: 'small' | 'normal' | 'large'
  colorAssistMode?: string
  batterySaveEnabled?: boolean
  createdAt: number
  updatedAt: number
}

export type UserSettingsPatch = Partial<Omit<UserSettingsDoc, 'uid' | 'createdAt' | 'updatedAt'>>

export interface UserSettingsRepository {
  getOrCreate(uid: string, seed?: Partial<UserDoc>): Promise<UserSettingsDoc>
  patch(uid: string, patch: UserSettingsPatch): Promise<UserSettingsDoc>
  delete(uid: string): Promise<boolean>
}

function readSoundSettings(user?: Partial<UserDoc>): SoundSettings {
  return {
    ...DEFAULT_SOUND_SETTINGS,
    ...(user?.soundSettings ?? {}),
  }
}

function readTermsAgreements(user?: Partial<UserDoc>): TermsAgreementState | undefined {
  return user?.termsAgreements
}

export function buildDefaultUserSettings(uid: string, seed?: Partial<UserDoc>): UserSettingsDoc {
  const now = Date.now()
  const soundSettings = readSoundSettings(seed)
  const termsAgreements = readTermsAgreements(seed)
  const termsAccepted = Boolean(seed?.termsCompleted)
  return {
    uid,
    locale: seed?.locale,
    timeZone: seed?.timeZone,
    detectedTimeZone: seed?.detectedTimeZone,
    utcOffsetMinutes: seed?.utcOffsetMinutes,
    termsAccepted,
    termsVersion: termsAgreements?.serviceTermsVersion,
    termsAcceptedAt: termsAgreements?.agreedAt,
    privacyAccepted: termsAccepted,
    privacyVersion: termsAgreements?.privacyPolicyVersion,
    privacyAcceptedAt: termsAgreements?.agreedAt,
    marketingAccepted: termsAgreements?.marketingAccepted === true,
    pushNotificationAccepted: termsAgreements?.pushNotificationAccepted === true,
    bgmVolume: soundSettings.bgmVolume,
    sfxVolume: soundSettings.sfxVolume,
    createdAt: seed?.createdAt ?? now,
    updatedAt: seed?.updatedAt ?? now,
  }
}

export function userSettingsPatchFromUserPatch(patch: Partial<UserDoc>): UserSettingsPatch {
  const next: UserSettingsPatch = {}
  if (patch.locale !== undefined) next.locale = patch.locale
  if (patch.timeZone !== undefined) next.timeZone = patch.timeZone
  if (patch.detectedTimeZone !== undefined) next.detectedTimeZone = patch.detectedTimeZone
  if (patch.utcOffsetMinutes !== undefined) next.utcOffsetMinutes = patch.utcOffsetMinutes
  if (patch.soundSettings !== undefined) {
    next.bgmVolume = patch.soundSettings.bgmVolume
    next.sfxVolume = patch.soundSettings.sfxVolume
  }
  if (patch.termsCompleted !== undefined) {
    next.termsAccepted = Boolean(patch.termsCompleted)
    next.privacyAccepted = Boolean(patch.termsCompleted)
  }
  if (patch.termsAgreements !== undefined) {
    next.termsVersion = patch.termsAgreements.serviceTermsVersion
    next.termsAcceptedAt = patch.termsAgreements.agreedAt
    next.privacyVersion = patch.termsAgreements.privacyPolicyVersion
    next.privacyAcceptedAt = patch.termsAgreements.agreedAt
    next.marketingAccepted = patch.termsAgreements.marketingAccepted === true
    next.pushNotificationAccepted = patch.termsAgreements.pushNotificationAccepted === true
  }
  return next
}
