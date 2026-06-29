/**
 * packages/backend/src/models/UserCosmeticInventoryModel.ts
 * ------------------------------------------------------------
 * 역할: userCosmeticInventory collection의 schema와 document 타입을 정의한다.
 */
import mongoose, { Schema } from 'mongoose'
import type { UserCosmeticInventoryDoc } from '../repositories/mydongCosmeticRepository.js'

const UserCosmeticInventorySchema = new Schema<UserCosmeticInventoryDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    uid: { type: String, required: true, index: true },
    cosmeticId: { type: String, required: true, index: true },
    quantity: { type: Number, required: true, default: 0 },
    source: { type: String, required: true, default: 'unknown' },
    acquiredAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'userCosmeticInventory',
    minimize: false,
    versionKey: false,
  },
)

UserCosmeticInventorySchema.index({ uid: 1, cosmeticId: 1 }, { unique: true })

export const UserCosmeticInventoryModel =
  mongoose.models.UserCosmeticInventory ??
  mongoose.model<UserCosmeticInventoryDoc>('UserCosmeticInventory', UserCosmeticInventorySchema)
