/**
 * packages/backend/src/repositories/mongoUserRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import { DEFAULT_SOUND_SETTINGS, type UserDoc } from '../store/memoryStore.js'
import { UserModel } from '../models/UserModel.js'
import { AidongIslandStateModel } from '../models/AidongIslandStateModel.js'
import { CodexStateModel } from '../models/CodexStateModel.js'
import { CustomsLogModel } from '../models/CustomsLogModel.js'
import { DestinationIslandStateModel } from '../models/DestinationIslandStateModel.js'
import { HostStateModel } from '../models/HostStateModel.js'
import { LodgeStateModel } from '../models/LodgeStateModel.js'
import { ModuleStateModel } from '../models/ModuleStateModel.js'
import { MyAidongStateModel } from '../models/MyAidongStateModel.js'
import { MyIslandStateModel } from '../models/MyIslandStateModel.js'
import { RouteNeighborStateModel } from '../models/RouteNeighborStateModel.js'
import { ShipStateModel } from '../models/ShipStateModel.js'
import { ZoneStateModel } from '../models/ZoneStateModel.js'
import { mongoHostStateRepository } from './mongoHostStateRepository.js'
import type { HostStatePatch } from './hostStateRepository.js'
import type { PasswordUserInput, UserRepository } from './userRepository.js'

function toUserDoc(doc: unknown): UserDoc {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  if (plain.openingSeen === undefined) plain.openingSeen = true
  if (plain.sooksoClean === undefined) plain.sooksoClean = false
  if (plain.diamonds === undefined && typeof plain.gems === 'number') plain.diamonds = plain.gems
  delete plain.gems
  if (plain.soundSettings === undefined) plain.soundSettings = DEFAULT_SOUND_SETTINGS
  if (plain.gameStartedAt === undefined) plain.gameStartedAt = plain.createdAt
  return plain as unknown as UserDoc
}

function createGuestDoc(): UserDoc {
  const uid = 'guest-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
  const now = Date.now()
  return {
    uid,
    isGuest: true,
    nickname: 'guest',
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

function pickDefinedHostPatch(patch: Partial<UserDoc>): HostStatePatch {
  const hostPatch: HostStatePatch = {}
  if (patch.hostName !== undefined) hostPatch.hostName = patch.hostName
  if (patch.coins !== undefined) hostPatch.coins = patch.coins
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
      diamonds: user.diamonds,
      diceCount: user.diceCount,
      inventory: user.inventory,
    })
    return toUserDoc(created.toObject())
  },

  async createOrUpdateAuthUser(input) {
    const now = Date.now()
    const fallbackNickname = input.displayName ?? input.email ?? input.provider
    const patch: Partial<UserDoc> = {
      isGuest: false,
      authProvider: input.provider,
      providerUid: input.providerUid ?? input.uid,
      email: input.email,
      emailNormalized: input.emailNormalized,
      displayName: input.displayName,
      photoURL: input.photoURL,
      updatedAt: now,
    }

    const doc = await UserModel.findOneAndUpdate(
        { uid: input.uid },
        {
          $set: patch,
          $setOnInsert: {
            uid: input.uid,
            nickname: fallbackNickname,
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
          },
        },
        { new: true, upsert: true, lean: true, setDefaultsOnInsert: true },
      )

    const user = toUserDoc(doc)
    await mongoHostStateRepository.getOrCreate(user.uid, {
      hostName: user.hostName,
      coins: user.coins,
      diamonds: user.diamonds,
      diceCount: user.diceCount,
      inventory: user.inventory,
    })
    return user
  },

  async createPasswordUser(input) {
    const userDoc = createPasswordDoc(input)
    const created = await UserModel.create(userDoc)
    const user = toUserDoc(created.toObject())
    await mongoHostStateRepository.getOrCreate(user.uid, {
      hostName: user.hostName,
      coins: user.coins,
      diamonds: user.diamonds,
      diceCount: user.diceCount,
      inventory: user.inventory,
    })
    return user
  },

  async findByLoginId(loginIdNormalized) {
    const doc = await UserModel.findOne({ loginIdNormalized }).lean()
    return doc ? toUserDoc(doc) : undefined
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

  async deleteUser(uid) {
    const result = await UserModel.deleteOne({ uid })
    await Promise.all([
      HostStateModel.deleteOne({ uid }),
      ModuleStateModel.deleteMany({ uid }),
      MyAidongStateModel.deleteOne({ uid }),
      MyIslandStateModel.deleteOne({ uid }),
      CodexStateModel.deleteOne({ uid }),
      ShipStateModel.deleteOne({ uid }),
      RouteNeighborStateModel.deleteOne({ uid }),
      LodgeStateModel.deleteOne({ uid }),
      AidongIslandStateModel.deleteOne({ uid }),
      DestinationIslandStateModel.deleteOne({ uid }),
      ZoneStateModel.deleteMany({ uid }),
      CustomsLogModel.deleteMany({ uid }),
    ])
    return result.deletedCount > 0
  },

  async listUsers() {
    const docs = await UserModel.find().lean()
    return docs.map(toUserDoc)
  },
}






