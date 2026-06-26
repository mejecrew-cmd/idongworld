/**
 * packages/backend/src/models/HostStateModel.ts
 * ------------------------------------------------------------
 * 역할: MongoDB collection의 schema와 document 타입을 정의한다.
 * 연결: userStore의 큰 상태를 collection 단위 문서로 나눠 저장할 때 기준이 된다.
 * 주의: 필드를 추가하면 repository default, modelSpecs, migration compatibility도 함께 확인한다.
 */
import mongoose, { Schema } from 'mongoose'

export interface HostStateDoc {
  uid: string
  hostName?: string
  coins: number
  diamonds: number
  diceCount: number
  inventory: Record<string, number>
  createdAt: number
  updatedAt: number
}

const HostStateSchema = new Schema<HostStateDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    hostName: String,
    coins: { type: Number, required: true, default: 100 },
    diamonds: { type: Number, required: true, default: 0 },
    diceCount: { type: Number, required: true, default: 6 },
    inventory: { type: Schema.Types.Mixed, required: true, default: {} },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'hostStates',
    minimize: false,
    versionKey: false,
  },
)

export const HostStateModel =
  mongoose.models.HostState ?? mongoose.model<HostStateDoc>('HostState', HostStateSchema)






