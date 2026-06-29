/**
 * packages/backend/src/models/RoomSlotModel.ts
 * ------------------------------------------------------------
 * 역할: roomSlots collection의 schema와 document 타입을 정의한다.
 */
import mongoose, { Schema } from 'mongoose'
import type { RoomSlotDoc } from '../repositories/sooksoRepository.js'

const RoomSlotSchema = new Schema<RoomSlotDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    uid: { type: String, required: true, index: true },
    roomId: { type: String, required: true },
    mydongUid: String,
    aidongId: String,
    state: { type: String, required: true, default: 'empty' },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'roomSlots',
    minimize: false,
    versionKey: false,
  },
)

RoomSlotSchema.index({ uid: 1, roomId: 1 }, { unique: true })

export const RoomSlotModel =
  mongoose.models.RoomSlot ?? mongoose.model<RoomSlotDoc>('RoomSlot', RoomSlotSchema)
