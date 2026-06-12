/**
 * packages/backend/src/repositories/mongoUserRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import type { UserDoc } from '../store/memoryStore.js'
import { UserModel } from '../models/UserModel.js'
import { mongoHostStateRepository } from './mongoHostStateRepository.js'
import type { HostStatePatch } from './hostStateRepository.js'
import type { AuthUserInput, UserRepository } from './userRepository.js'

function toUserDoc(doc: unknown): UserDoc {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  if (plain.openingSeen === undefined) plain.openingSeen = true
  return plain as unknown as UserDoc
}

function createGuestDoc(): UserDoc {
  const uid = 'guest-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
  const now = Date.now()
  return {
    uid,
    isGuest: true,
    nickname: 'guest',
    coins: 100,
    diamonds: 0,
    gems: 0,
    openingSeen: false,
    onboardingComplete: false,
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

function createAuthDoc(input: AuthUserInput): UserDoc {
  const now = Date.now()
  return {
    uid: input.uid,
    isGuest: false,
    authProvider: input.provider,
    email: input.email,
    displayName: input.displayName,
    photoURL: input.photoURL,
    nickname: input.displayName ?? input.email ?? input.provider,
    coins: 100,
    diamonds: 0,
    gems: 0,
    openingSeen: false,
    onboardingComplete: false,
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

export const mongoUserRepository: UserRepository = {
  async createGuestUser() {
    const user = createGuestDoc()
    const created = await UserModel.create(user)
    await mongoHostStateRepository.getOrCreate(user.uid, {
      hostName: user.hostName,
      coins: user.coins,
      gems: user.gems,
      diamonds: user.diamonds,
      diceCount: user.diceCount,
      inventory: user.inventory,
    })
    return toUserDoc(created.toObject())
  },

  async createOrUpdateAuthUser(input) {
    const existing = await UserModel.findOne({ uid: input.uid }).lean()
    const patch: Partial<UserDoc> = {
      isGuest: false,
      authProvider: input.provider,
      email: input.email,
      displayName: input.displayName,
      photoURL: input.photoURL,
      nickname: (existing as { nickname?: string } | null)?.nickname
        ?? input.displayName
        ?? input.email
        ?? input.provider,
      updatedAt: Date.now(),
    }

    const doc = existing
      ? await UserModel.findOneAndUpdate(
        { uid: input.uid },
        { $set: patch },
        { new: true, lean: true },
      )
      : (await UserModel.create({ ...createAuthDoc(input), ...patch })).toObject()

    const user = toUserDoc(doc)
    await mongoHostStateRepository.getOrCreate(user.uid, {
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
    const doc = await UserModel.findOne({ uid }).lean()
    return doc ? toUserDoc(doc) : undefined
  },

  async updateUser(uid, patch: Partial<UserDoc>) {
    const update = { ...patch, uid, updatedAt: Date.now() }
    const doc = await UserModel.findOneAndUpdate(
      { uid },
      { $set: update },
      { new: true, lean: true },
    )
    if (!doc) return undefined
    const hostPatch = pickDefinedHostPatch(patch)
    if (Object.keys(hostPatch).length) {
      await mongoHostStateRepository.patch(uid, hostPatch)
    }
    return toUserDoc(doc)
  },

  async listUsers() {
    const docs = await UserModel.find().lean()
    return docs.map(toUserDoc)
  },
}






