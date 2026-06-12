/**
 * packages/backend/src/models/ZoneStateModel.ts
 * ------------------------------------------------------------
 * 역할: MongoDB collection의 schema와 document 타입을 정의한다.
 * 연결: userStore의 큰 상태를 collection 단위 문서로 나눠 저장할 때 기준이 된다.
 * 주의: 필드를 추가하면 repository default, modelSpecs, migration compatibility도 함께 확인한다.
 */
import mongoose, { Schema } from 'mongoose'

export interface ZoneStateDoc {
  uid: string
  moduleId: string
  localResources: Record<string, number>
  clearedCount: number
  progress: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

const ZoneStateSchema = new Schema<ZoneStateDoc>(
  {
    uid: { type: String, required: true, index: true },
    moduleId: { type: String, required: true, index: true },
    localResources: { type: Schema.Types.Mixed, required: true, default: {} },
    clearedCount: { type: Number, required: true, default: 0 },
    progress: { type: Schema.Types.Mixed, required: true, default: {} },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'zoneStates',
    minimize: false,
    versionKey: false,
  },
)

ZoneStateSchema.index({ uid: 1, moduleId: 1 }, { unique: true })

export const ZoneStateModel =
  mongoose.models.ZoneState ?? mongoose.model<ZoneStateDoc>('ZoneState', ZoneStateSchema)






