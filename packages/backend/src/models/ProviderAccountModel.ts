/**
 * packages/backend/src/models/ProviderAccountModel.ts
 * ------------------------------------------------------------
 * 역할: 한 user가 여러 인증 provider를 연결할 수 있게 provider별 계정 row를 저장한다.
 * 연결: auth route와 UserRepository가 로그인 시 provider subject를 uid로 해석할 때 사용한다.
 * 주의: 로그인 세션을 저장하는 collection이 아니다. 세션은 현재 정책대로 DB에 저장하지 않는다.
 */
import mongoose, { Schema } from 'mongoose'
import type { ProviderAccountDoc } from '../repositories/userRepository.js'

const ProviderAccountSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    uid: { type: String, required: true, index: true },
    providerCode: { type: String, required: true, index: true },
    providerSubjectId: { type: String, required: true, index: true },
    email: String,
    emailNormalized: String,
    emailVerified: Boolean,
    displayName: String,
    photoUrl: String,
    linkedAt: { type: Number, required: true },
    lastLoginAt: Number,
    status: { type: String, required: true, default: 'active' },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'providerAccounts',
    minimize: false,
    versionKey: false,
  },
)

ProviderAccountSchema.index({ providerCode: 1, providerSubjectId: 1 }, { unique: true })
ProviderAccountSchema.index({ uid: 1, providerCode: 1, providerSubjectId: 1 }, { unique: true })

export const ProviderAccountModel =
  mongoose.models.ProviderAccount
    ?? mongoose.model<ProviderAccountDoc>('ProviderAccount', ProviderAccountSchema)
