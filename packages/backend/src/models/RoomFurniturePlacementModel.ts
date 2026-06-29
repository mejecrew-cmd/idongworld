/**
 * packages/backend/src/models/RoomFurniturePlacementModel.ts
 * ------------------------------------------------------------
 * 역할: roomFurniturePlacements collection의 schema와 document 타입을 정의한다.
 */
import mongoose, { Schema } from 'mongoose'
import type { RoomFurniturePlacementDoc } from '../repositories/sooksoRepository.js'

const RoomFurniturePlacementSchema = new Schema<RoomFurniturePlacementDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    uid: { type: String, required: true, index: true },
    roomId: { type: String, required: true },
    itemId: { type: String, required: true },
    placementIndex: { type: Number, required: true },
    placedAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'roomFurniturePlacements',
    minimize: false,
    versionKey: false,
  },
)

RoomFurniturePlacementSchema.index({ uid: 1, roomId: 1, placementIndex: 1 }, { unique: true })

export const RoomFurniturePlacementModel =
  mongoose.models.RoomFurniturePlacement
    ?? mongoose.model<RoomFurniturePlacementDoc>('RoomFurniturePlacement', RoomFurniturePlacementSchema)
