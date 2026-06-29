/**
 * packages/backend/src/models/MydongPediaInventoryModel.ts
 * ------------------------------------------------------------
 * 역할: mydongPediaInventory collection의 schema와 document 타입을 정의한다.
 */
import mongoose, { Schema } from 'mongoose'
import type { MydongPediaInventoryDoc } from '../repositories/mydongPediaInventoryRepository.js'

const MydongPediaInventorySchema = new Schema<MydongPediaInventoryDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    uid: { type: String, required: true, index: true },
    mydongUid: { type: String, required: true, index: true },
    aidongId: { type: String, required: true, index: true },
    pediaItemId: { type: String, required: true, index: true },
    slotNo: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 0 },
    maxQuantity: { type: Number, required: true, default: 999 },
    firstAcquiredAt: { type: Number, required: true },
    lastAcquiredAt: { type: Number, required: true },
    source: { type: String, required: true, default: 'unknown' },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'mydongPediaInventory',
    minimize: false,
    versionKey: false,
  },
)

MydongPediaInventorySchema.index({ uid: 1, mydongUid: 1, pediaItemId: 1 }, { unique: true })
MydongPediaInventorySchema.index({ uid: 1, aidongId: 1 })

export const MydongPediaInventoryModel =
  mongoose.models.MydongPediaInventory ??
  mongoose.model<MydongPediaInventoryDoc>('MydongPediaInventory', MydongPediaInventorySchema)
