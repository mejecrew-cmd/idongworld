/**
 * packages/backend/src/repositories/memoryUserRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import {
  createGuestUser,
  deleteUser,
  DEFAULT_SOUND_SETTINGS,
  getUser,
  listUsers,
  putUser,
  updateUser,
  type UserDoc,
} from '../store/memoryStore.js'
import { memoryHostStateRepository } from './memoryHostStateRepository.js'
import type { HostStatePatch } from './hostStateRepository.js'
import type { AuthUserInput, PasswordUserInput, UserRepository } from './userRepository.js'

function pickDefinedHostPatch(patch: Partial<UserDoc>): HostStatePatch {
  const hostPatch: HostStatePatch = {}
  if (patch.hostName !== undefined) hostPatch.hostName = patch.hostName
  if (patch.coins !== undefined) hostPatch.coins = patch.coins
  if (patch.gems !== undefined) hostPatch.gems = patch.gems
  if (patch.diamonds !== undefined) hostPatch.diamonds = patch.diamonds
  if (patch.diceCount !== undefined) hostPatch.diceCount = patch.diceCount
  if (patch.inventory !== undefined) hostPatch.inventory = patch.inventory
  return hostPatch
}

function createAuthDoc(input: AuthUserInput): UserDoc {
  const now = Date.now()
  return {
    uid: input.uid,
    isGuest: false,
    authProvider: input.provider,
    providerUid: input.providerUid ?? input.uid,
    email: input.email,
    emailNormalized: input.emailNormalized,
    displayName: input.displayName,
    photoURL: input.photoURL,
    nickname: input.displayName ?? input.email ?? input.provider,
    signupProfileCompleted: false,
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
}

function createPasswordDoc(input: PasswordUserInput): UserDoc {
  const now = Date.now()
  return {
    uid: input.uid,
    isGuest: false,
    authProvider: 'password',
    loginId: input.loginId,
    loginIdNormalized: input.loginIdNormalized,
    passwordHash: input.passwordHash,
    nickname: input.loginId,
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
}

export const memoryUserRepository: UserRepository = {
  async createGuestUser() {
    const user = createGuestUser()
    await memoryHostStateRepository.getOrCreate(user.uid, {
      hostName: user.hostName,
      coins: user.coins,
      gems: user.gems,
      diamonds: user.diamonds,
      diceCount: user.diceCount,
      inventory: user.inventory,
    })
    return user
  },

  async getUser(uid) {
    return getUser(uid)
  },

  async updateUser(uid, patch: Partial<UserDoc>) {
    const user = updateUser(uid, patch)
    if (!user) return undefined
    const hostPatch = pickDefinedHostPatch(patch)
    if (Object.keys(hostPatch).length) {
      await memoryHostStateRepository.patch(uid, hostPatch)
    }
    return user
  },

  async deleteUser(uid) {
    return deleteUser(uid)
  },

  async createOrUpdateAuthUser(input) {
    const existing = getUser(input.uid)
    const patch: Partial<UserDoc> = {
      isGuest: false,
      authProvider: input.provider,
      providerUid: input.providerUid ?? input.uid,
      email: input.email,
      emailNormalized: input.emailNormalized,
      displayName: input.displayName,
      photoURL: input.photoURL,
      nickname: existing?.nickname ?? input.displayName ?? input.email ?? input.provider,
      signupProfileCompleted: existing?.signupProfileCompleted ?? false,
    }
    if (existing) {
      return updateUser(input.uid, patch) ?? existing
    }
    const user = createAuthDoc(input)
    putUser(user)
    await memoryHostStateRepository.getOrCreate(user.uid, {
      hostName: user.hostName,
      coins: user.coins,
      gems: user.gems,
      diamonds: user.diamonds,
      diceCount: user.diceCount,
      inventory: user.inventory,
    })
    return user
  },

  async createPasswordUser(input) {
    const user = createPasswordDoc(input)
    putUser(user)
    await memoryHostStateRepository.getOrCreate(user.uid, {
      hostName: user.hostName,
      coins: user.coins,
      gems: user.gems,
      diamonds: user.diamonds,
      diceCount: user.diceCount,
      inventory: user.inventory,
    })
    return user
  },

  async findByLoginId(loginIdNormalized) {
    return listUsers().find((user) => user.loginIdNormalized === loginIdNormalized)
  },

  async listUsers() {
    return listUsers()
  },
}






