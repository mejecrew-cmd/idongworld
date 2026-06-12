/**
 * packages/backend/src/models/LodgeStateModel.ts
 * ------------------------------------------------------------
 * 역할: 숙소 모듈의 MongoDB collection schema와 document 타입을 정의한다.
 * 연결: /api/modules/lodge/* action과 generic module state API가 lodgeStates 전용 문서를 사용한다.
 * 주의: 숙소 인벤토리 이동은 lodge service가 직접 다른 모듈을 수정하지 않고 customs를 통해 처리한다.
 */
import mongoose, { Schema } from 'mongoose'
import type { AidongCharacterId } from '../store/memoryStore.js'

export interface LodgeStateDoc {
  uid: string
  lodgeInventory: Record<string, number>
  assignedAidongs: AidongCharacterId[]
  rooms: Record<string, unknown>
  furniture: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

const LodgeStateSchema = new Schema<LodgeStateDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    lodgeInventory: { type: Schema.Types.Mixed, required: true, default: {} },
    assignedAidongs: { type: [String], required: true, default: [] },
    rooms: { type: Schema.Types.Mixed, required: true, default: {} },
    furniture: { type: Schema.Types.Mixed, required: true, default: {} },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'lodgeStates',
    minimize: false,
    versionKey: false,
  },
)

export const LodgeStateModel =
  mongoose.models.LodgeState ?? mongoose.model<LodgeStateDoc>('LodgeState', LodgeStateSchema)
