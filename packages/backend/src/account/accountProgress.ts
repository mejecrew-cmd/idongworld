/**
 * packages/backend/src/account/accountProgress.ts
 * ------------------------------------------------------------
 * 역할: account/signup 진행 상태와 다음 화면 판단을 한 곳에서 계산한다.
 * 연결: auth route, account route, 앞으로 추가될 signup/timezone/terms route가 같은 helper를 사용한다.
 * 주의: route마다 nextStep 조건을 다시 만들지 말고 이 파일의 결과를 응답에 포함한다.
 */
import type { UserDoc } from '../store/memoryStore.js'

export type AccountNextStep = 'login' | 'signup' | 'timezone' | 'terms' | 'title'

export interface AccountProgress {
  uid: string
  isGuest: boolean
  authProvider?: UserDoc['authProvider']
  providerUid?: string
  email?: string
  emailNormalized?: string
  displayName?: string
  photoURL?: string
  nickname?: string
  nicknameNormalized?: string
  hostName?: string
  signupProfileCompleted: boolean
  timeZone?: string
  detectedTimeZone?: string
  utcOffsetMinutes?: number
  timezoneCompleted: boolean
  termsCompleted: boolean
  termsAgreements: UserDoc['termsAgreements']
  profileImageSource?: UserDoc['profileImageSource']
  onboardingComplete: boolean
  openingSeen: boolean
}

export function buildAccountProgress(user: UserDoc): AccountProgress {
  return {
    uid: user.uid,
    isGuest: user.isGuest,
    authProvider: user.authProvider,
    providerUid: user.providerUid,
    email: user.email,
    emailNormalized: user.emailNormalized,
    displayName: user.displayName,
    photoURL: user.photoURL,
    nickname: user.nickname,
    nicknameNormalized: user.nicknameNormalized,
    hostName: user.hostName,
    signupProfileCompleted: Boolean(user.signupProfileCompleted),
    timeZone: user.timeZone,
    detectedTimeZone: user.detectedTimeZone,
    utcOffsetMinutes: user.utcOffsetMinutes,
    timezoneCompleted: Boolean(user.timezoneCompleted),
    termsCompleted: Boolean(user.termsCompleted),
    termsAgreements: user.termsAgreements ?? { marketingAccepted: false },
    profileImageSource: user.profileImageSource,
    onboardingComplete: Boolean(user.onboardingComplete),
    openingSeen: Boolean(user.openingSeen),
  }
}

export function getAccountNextStep(user: UserDoc): AccountNextStep {
  if (user.isGuest) return 'title'
  if (!user.signupProfileCompleted) return 'signup'
  if (!user.timezoneCompleted) return 'timezone'
  if (!user.termsCompleted) return 'terms'
  return 'title'
}

export function buildAccountResponse(user: UserDoc) {
  return {
    account: buildAccountProgress(user),
    nextStep: getAccountNextStep(user),
  }
}
