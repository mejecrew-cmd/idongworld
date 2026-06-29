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
import { memoryUserSettingsRepository } from './memoryUserSettingsRepository.js'
import { memoryUserInventoryRepository } from './memoryUserInventoryRepository.js'
import { memoryCurrencyRepository } from './memoryCurrencyRepository.js'
import { memoryDiceResourceRepository } from './memoryDiceResourceRepository.js'
import { memoryMydongRepository } from './memoryMydongRepository.js'
import { memorySooksoRepository } from './memorySooksoRepository.js'
import { memoryMydongPediaInventoryRepository } from './memoryMydongPediaInventoryRepository.js'
import { memoryMydongCosmeticRepository } from './memoryMydongCosmeticRepository.js'
import type { HostStatePatch } from './hostStateRepository.js'
import type {
  AuthProviderCode,
  AuthUserInput,
  PasswordUserInput,
  ProviderAccountDoc,
  UserRepository,
} from './userRepository.js'

const providerAccounts = new Map<string, ProviderAccountDoc>()

function providerAccountKey(providerCode: string, providerSubjectId: string): string {
  return `${providerCode}:${providerSubjectId}`
}

function providerAccountId(providerCode: string, providerSubjectId: string): string {
  return `${providerCode}-${providerSubjectId}`
}

function upsertProviderAccount(input: {
  uid: string
  providerCode: ProviderAccountDoc['providerCode']
  providerSubjectId: string
  email?: string
  emailNormalized?: string
  emailVerified?: boolean
  displayName?: string
  photoUrl?: string
  loginAt?: number
}): ProviderAccountDoc {
  const now = input.loginAt ?? Date.now()
  const key = providerAccountKey(input.providerCode, input.providerSubjectId)
  const existing = providerAccounts.get(key)
  const next: ProviderAccountDoc = {
    id: existing?.id ?? providerAccountId(input.providerCode, input.providerSubjectId),
    uid: existing?.uid ?? input.uid,
    providerCode: input.providerCode,
    providerSubjectId: input.providerSubjectId,
    email: input.email ?? existing?.email,
    emailNormalized: input.emailNormalized ?? existing?.emailNormalized,
    emailVerified: input.emailVerified ?? existing?.emailVerified,
    displayName: input.displayName ?? existing?.displayName,
    photoUrl: input.photoUrl ?? existing?.photoUrl,
    linkedAt: existing?.linkedAt ?? now,
    lastLoginAt: now,
    status: existing?.status ?? 'active',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  providerAccounts.set(key, next)
  return next
}

function pickDefinedHostPatch(patch: Partial<UserDoc>): HostStatePatch {
  const hostPatch: HostStatePatch = {}
  if (patch.hostName !== undefined) hostPatch.hostName = patch.hostName
  if (patch.coins !== undefined) hostPatch.coins = patch.coins
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
    status: 'active',
    lastLoginAt: now,
    lastLoginProvider: input.provider,
    nickname: input.displayName ?? input.email ?? input.provider,
    signupProfileCompleted: false,
    gameStartedAt: now,
    sooksoClean: false,
    coins: 100,
    diamonds: 0,
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
    status: 'active',
    lastLoginAt: now,
    lastLoginProvider: 'password',
    nickname: input.loginId,
    gameStartedAt: now,
    sooksoClean: false,
    coins: 100,
    diamonds: 0,
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
    await memoryUserSettingsRepository.delete(uid)
    await memoryUserInventoryRepository.delete(uid)
    await memoryCurrencyRepository.delete(uid)
    await memoryDiceResourceRepository.delete(uid)
    await memoryMydongRepository.delete(uid)
    await memorySooksoRepository.delete(uid)
    await memoryMydongPediaInventoryRepository.delete(uid)
    await memoryMydongCosmeticRepository.delete(uid)
    return deleteUser(uid)
  },

  async createOrUpdateAuthUser(input) {
    const existing = getUser(input.uid)
    const now = Date.now()
    const patch: Partial<UserDoc> = {
      isGuest: false,
      authProvider: input.provider,
      providerUid: input.providerUid ?? input.uid,
      email: input.email,
      emailNormalized: input.emailNormalized,
      displayName: input.displayName,
      photoURL: input.photoURL,
      status: existing?.status ?? 'active',
      lastLoginAt: now,
      lastLoginProvider: input.provider,
      nickname: existing?.nickname ?? input.displayName ?? input.email ?? input.provider,
      signupProfileCompleted: existing?.signupProfileCompleted ?? false,
    }
    upsertProviderAccount({
      uid: existing?.uid ?? input.uid,
      providerCode: input.provider,
      providerSubjectId: input.providerUid ?? input.uid,
      email: input.email,
      emailNormalized: input.emailNormalized,
      displayName: input.displayName,
      photoUrl: input.photoURL,
      loginAt: now,
    })
    if (existing) {
      return updateUser(input.uid, patch) ?? existing
    }
    const user = createAuthDoc(input)
    putUser(user)
    await memoryHostStateRepository.getOrCreate(user.uid, {
      hostName: user.hostName,
      coins: user.coins,
      diamonds: user.diamonds,
      diceCount: user.diceCount,
      inventory: user.inventory,
    })
    return user
  },

  async createPasswordUser(input) {
    const user = createPasswordDoc(input)
    putUser(user)
    upsertProviderAccount({
      uid: user.uid,
      providerCode: 'password',
      providerSubjectId: input.loginIdNormalized,
      loginAt: user.lastLoginAt,
    })
    await memoryHostStateRepository.getOrCreate(user.uid, {
      hostName: user.hostName,
      coins: user.coins,
      diamonds: user.diamonds,
      diceCount: user.diceCount,
      inventory: user.inventory,
    })
    return user
  },

  async findByLoginId(loginIdNormalized) {
    const providerAccount = providerAccounts.get(providerAccountKey('password', loginIdNormalized))
    if (providerAccount) return getUser(providerAccount.uid)
    return listUsers().find((user) => user.loginIdNormalized === loginIdNormalized)
  },

  async findByProviderAccount(providerCode, providerSubjectId) {
    const providerAccount = providerAccounts.get(providerAccountKey(providerCode, providerSubjectId))
    return providerAccount ? getUser(providerAccount.uid) : undefined
  },

  async listProviderAccounts(uid) {
    return Array.from(providerAccounts.values()).filter((account) => account.uid === uid)
  },

  async recordLogin(uid, provider: AuthProviderCode | string) {
    const existing = getUser(uid)
    if (!existing) return undefined
    const now = Date.now()
    const user = updateUser(uid, {
      lastLoginAt: now,
      lastLoginProvider: provider,
    }) ?? existing
    if (provider === 'password' && existing.loginIdNormalized) {
      upsertProviderAccount({
        uid,
        providerCode: 'password',
        providerSubjectId: existing.loginIdNormalized,
        loginAt: now,
      })
    } else if (existing.providerUid) {
      upsertProviderAccount({
        uid,
        providerCode: provider,
        providerSubjectId: existing.providerUid,
        email: existing.email,
        emailNormalized: existing.emailNormalized,
        emailVerified: existing.emailVerified,
        displayName: existing.displayName,
        photoUrl: existing.photoURL,
        loginAt: now,
      })
    }
    return user
  },

  async listUsers() {
    return listUsers()
  },
}






