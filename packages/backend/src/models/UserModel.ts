/**
 * packages/backend/src/models/UserModel.ts
 * ------------------------------------------------------------
 * 역할: MongoDB collection의 schema와 document 타입을 정의한다.
 * 연결: userStore의 큰 상태를 collection 단위 문서로 나눠 저장할 때 기준이 된다.
 * 주의: 필드를 추가하면 repository default, modelSpecs, migration compatibility도 함께 확인한다.
 */
import mongoose, { Schema } from 'mongoose'
import type { UserDoc } from '../store/memoryStore.js'

const UserSchema = new Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    isGuest: { type: Boolean, required: true },
    authProvider: String,
    loginId: String,
    loginIdNormalized: { type: String, index: true, unique: true, sparse: true },
    passwordHash: String,
    email: String,
    displayName: String,
    photoURL: String,
    nickname: String,
    gameStartedAt: Number,
    hostName: String,
    coins: { type: Number, required: true, default: 0 },
    diamonds: { type: Number, required: true, default: 0 },
    gems: { type: Number, required: true, default: 0 },
    openingSeen: { type: Boolean, required: true, default: false },
    onboardingComplete: { type: Boolean, required: true, default: false },
    soundSettings: {
      type: Schema.Types.Mixed,
      required: true,
      default: () => ({ bgmVolume: 100, sfxVolume: 100 }),
    },
    recruitedAidongs: { type: [String], required: true, default: [] },
    firstGachaCandidate: String,
    firstGachaAttempts: { type: Number, required: true, default: 0 },
    affinities: { type: Schema.Types.Mixed, required: true, default: {} },
    needs: { type: Schema.Types.Mixed, required: true, default: {} },
    unlockedDiaries: { type: [String], required: true, default: [] },
    unlockedCodexEntries: { type: [String], required: true, default: [] },
    codexFullyRegistered: { type: [String], required: true, default: [] },
    inventory: { type: Schema.Types.Mixed, required: true, default: {} },
    diceCount: { type: Number, required: true, default: 0 },
    boardPosition: { type: Number, required: true, default: 0 },
    currentRoute: String,
    harborAssignedChars: { type: [String], required: true, default: [] },
    harborLastChargedAt: Number,
    equippedOutfit: { type: Schema.Types.Mixed, required: true, default: {} },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'users',
    strict: false,
    minimize: false,
    versionKey: false,
  },
)

export const UserModel =
  mongoose.models.User ?? mongoose.model<UserDoc>('User', UserSchema)






