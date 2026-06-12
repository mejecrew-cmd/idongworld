/**
 * packages/backend/src/models/RouteNeighborStateModel.ts
 * ------------------------------------------------------------
 * 역할: MongoDB collection의 schema와 document 타입을 정의한다.
 * 연결: userStore의 큰 상태를 collection 단위 문서로 나눠 저장할 때 기준이 된다.
 * 주의: 필드를 추가하면 repository default, modelSpecs, migration compatibility도 함께 확인한다.
 */
import mongoose, { Schema } from 'mongoose'

export interface RouteNeighborStateDoc {
  uid: string
  currentRoute?: string
  boardPosition: number
  localResources: Record<string, number>
  landings: Record<string, unknown>
  progress: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

const RouteNeighborStateSchema = new Schema<RouteNeighborStateDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    currentRoute: String,
    boardPosition: { type: Number, required: true, default: 0 },
    localResources: { type: Schema.Types.Mixed, required: true, default: {} },
    landings: { type: Schema.Types.Mixed, required: true, default: {} },
    progress: { type: Schema.Types.Mixed, required: true, default: {} },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'routeNeighborStates',
    minimize: false,
    versionKey: false,
  },
)

export const RouteNeighborStateModel =
  mongoose.models.RouteNeighborState ??
  mongoose.model<RouteNeighborStateDoc>('RouteNeighborState', RouteNeighborStateSchema)






