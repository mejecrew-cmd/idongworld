/**
 * packages/backend/src/store/memoryStore.ts
 * ------------------------------------------------------------
 * 역할: 개발/테스트용 in-memory user store다.
 * 연결: UserRepository의 memory 구현이 guest user와 account 기본값을 보관할 때 사용한다.
 * 주의: 신규 gameplay 상태의 권위 저장소로 확장하지 말고, account/host/module repository를 우선 사용한다.
 *
 * 현재 위치:
 * - `createGuestUser`, `getUser`, `updateUser`, `listUsers`만 제공하는 단순 Map 저장소다.
 * - 서버 재시작 시 데이터가 사라진다.
 * - module/host/customs 분리 이후 새 상태는 전용 repository/API에 두는 것이 원칙이다.
 */

// AidongCharacterId:
// legacy user document 안에서 캐릭터 id를 문자열로 보관하기 위한 타입 별칭이다.
// backend 분리 이후에는 각 모듈/데이터 카탈로그의 id를 그대로 받아들이도록 string으로 둔다.
export type AidongCharacterId = string

export interface SoundSettings {
  bgmVolume: number
  sfxVolume: number
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  bgmVolume: 100,
  sfxVolume: 100,
}

export interface TermsAgreementState {
  serviceTermsVersion?: string
  privacyPolicyVersion?: string
  marketingTermsVersion?: string
  marketingAccepted: boolean
  pushNotificationAccepted?: boolean
  ageConfirmed?: boolean
  ageGateVersion?: string
  agreedAt?: number
}

// UserDoc:
// guest user와 account 초기값을 담는 memory 문서 형태다.
// gameplay module 상태는 전용 repository document에 저장하는 것이 원칙이다.
export interface UserDoc {
  uid: string
  isGuest: boolean
  authProvider?: 'guest' | 'google' | 'twitter' | 'firebase' | 'password'
  providerUid?: string
  loginId?: string
  loginIdNormalized?: string
  passwordHash?: string
  email?: string
  emailNormalized?: string
  emailVerified?: boolean
  displayName?: string
  photoURL?: string
  nickname?: string
  nicknameNormalized?: string
  signupProfileCompleted?: boolean
  timeZone?: string
  detectedTimeZone?: string
  utcOffsetMinutes?: number
  timezoneCompleted?: boolean
  termsCompleted?: boolean
  termsAgreements?: TermsAgreementState
  profileImageSource?: 'first-aidong' | 'firebase' | 'default' | string
  gameStartedAt?: number
  hostName?: string
  sooksoName?: string
  sooksoClean?: boolean
  coins: number
  diamonds: number
  gems: number
  openingSeen: boolean
  onboardingComplete: boolean
  soundSettings: SoundSettings
  recruitedAidongs: AidongCharacterId[]
  firstGachaCandidate?: AidongCharacterId
  firstGachaAttempts: number
  affinities: Record<string, { score: number; level: number }>
  needs: Record<string, Record<string, number>>
  unlockedDiaries: string[]
  unlockedCodexEntries: string[]
  codexFullyRegistered: string[]
  inventory: Record<string, number>
  diceCount: number
  boardPosition: number
  harborAssignedChars: AidongCharacterId[]
  harborLastChargedAt?: number
  createdAt: number
  updatedAt: number
}

const users = new Map<string, UserDoc>()

// 게스트 사용자 생성:
// auth가 아직 완전히 연결되지 않은 개발/POC 흐름에서 임시 uid와 기본 gameplay 값을 만든다.
// 실제 장기 저장은 UserRepository 또는 account/host/module repository 경로를 우선해야 한다.
export function createGuestUser(): UserDoc {
  const uid = 'guest-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
  const now = Date.now()
  const doc: UserDoc = {
    uid,
    isGuest: true,
    nickname: 'guest',
    gameStartedAt: now,
    coins: 100,
    diamonds: 0,
    gems: 0,
    openingSeen: false,
    onboardingComplete: false,
    soundSettings: DEFAULT_SOUND_SETTINGS,
    recruitedAidongs: [],
    firstGachaAttempts: 0,
    affinities: {},
    needs: {},
    unlockedDiaries: [],
    unlockedCodexEntries: [],
    codexFullyRegistered: [],
    inventory: {},
    diceCount: 6,
    boardPosition: 0,
    harborAssignedChars: [],
    createdAt: now,
    updatedAt: now,
  }
  users.set(uid, doc)
  return doc
}

// 사용자 조회:
// memory Map에 존재하는 UserDoc을 그대로 반환한다.
// 호출자는 undefined 가능성을 처리해야 한다.
export function getUser(uid: string): UserDoc | undefined {
  return users.get(uid)
}

// 사용자 patch:
// account 성격의 patch를 memory UserDoc에 얕게 병합한다.
// nested gameplay state 병합이나 domain validation은 하지 않으므로 module 기능 저장 로직으로 쓰면 안 된다.
export function updateUser(uid: string, patch: Partial<UserDoc>): UserDoc | undefined {
  const cur = users.get(uid)
  if (!cur) return undefined
  const updated = { ...cur, ...patch, uid, updatedAt: Date.now() }
  users.set(uid, updated)
  return updated
}

export function deleteUser(uid: string): boolean {
  return users.delete(uid)
}

// 사용자 upsert:
// 외부 인증 skeleton처럼 uid가 이미 정해진 계정을 memory 저장소에 넣을 때 사용한다.
// gameplay module 상태는 여전히 전용 repository에 둔다.
export function putUser(user: UserDoc): UserDoc {
  users.set(user.uid, user)
  return user
}

// 전체 사용자 목록:
// 개발/debug 용도다. production API의 권위 조회 방식으로 쓰지 않는다.
export function listUsers(): UserDoc[] {
  return Array.from(users.values())
}









