/**
 * packages/backend/src/models/MydongModel.ts
 * ------------------------------------------------------------
 * 역할: mydongList collection의 schema와 document 타입을 정의한다.
 */
import mongoose, { Schema } from 'mongoose'
import type { MydongDoc } from '../repositories/mydongRepository.js'

const MydongSchema = new Schema<MydongDoc>(
  {
    mydongUid: { type: String, required: true, unique: true, index: true },
    uid: { type: String, required: true, index: true },
    aidongId: { type: String, required: true, index: true },
    nickname: String,
    acquiredAt: { type: Number, required: true },
    acquisitionSource: { type: String, required: true, default: 'manual' },
    favoriteLevel: { type: Number, required: true, default: 0 },
    status: { type: String, required: true, default: 'active' },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'mydongList',
    minimize: false,
    versionKey: false,
  },
)

MydongSchema.index({ uid: 1, aidongId: 1, status: 1 })

export const MydongModel =
  mongoose.models.Mydong ?? mongoose.model<MydongDoc>('Mydong', MydongSchema)
