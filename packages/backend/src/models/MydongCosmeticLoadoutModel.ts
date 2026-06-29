/**
 * packages/backend/src/models/MydongCosmeticLoadoutModel.ts
 * ------------------------------------------------------------
 * 역할: mydongCosmeticLoadouts collection의 schema와 document 타입을 정의한다.
 */
import mongoose, { Schema } from 'mongoose'
import type { MydongCosmeticLoadoutDoc } from '../repositories/mydongCosmeticRepository.js'

const MydongCosmeticLoadoutSchema = new Schema<MydongCosmeticLoadoutDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    uid: { type: String, required: true, index: true },
    mydongUid: { type: String, required: true, index: true },
    aidongId: { type: String, required: true, index: true },
    outfitId: String,
    equippedItemIds: { type: [String], required: true, default: [] },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'mydongCosmeticLoadouts',
    minimize: false,
    versionKey: false,
  },
)

MydongCosmeticLoadoutSchema.index({ uid: 1, mydongUid: 1 }, { unique: true })
MydongCosmeticLoadoutSchema.index({ uid: 1, aidongId: 1 })

export const MydongCosmeticLoadoutModel =
  mongoose.models.MydongCosmeticLoadout ??
  mongoose.model<MydongCosmeticLoadoutDoc>('MydongCosmeticLoadout', MydongCosmeticLoadoutSchema)
