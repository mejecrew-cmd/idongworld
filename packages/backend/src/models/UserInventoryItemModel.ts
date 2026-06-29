/**
 * packages/backend/src/models/UserInventoryItemModel.ts
 * ------------------------------------------------------------
 * 역할: 유저 전역 인벤토리 아이템 보유량을 item row 단위로 저장한다.
 * 연결: userInventory repository가 hostStates.inventory map을 대체하는 권위 저장소로 사용한다.
 */
import mongoose, { Schema } from 'mongoose'
import type { UserInventoryItemDoc } from '../repositories/userInventoryRepository.js'

const UserInventoryItemSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    uid: { type: String, required: true, index: true },
    itemId: { type: String, required: true, index: true },
    quantity: { type: Number, required: true, default: 0 },
    acquiredAt: Number,
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'userInventoryItems',
    minimize: false,
    versionKey: false,
  },
)

UserInventoryItemSchema.index({ uid: 1, itemId: 1 }, { unique: true })

export const UserInventoryItemModel =
  mongoose.models.UserInventoryItem
    ?? mongoose.model<UserInventoryItemDoc>('UserInventoryItem', UserInventoryItemSchema)
