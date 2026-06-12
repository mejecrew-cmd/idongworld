/**
 * packages/backend/src/models/ModuleStateModel.ts
 * ------------------------------------------------------------
 * 역할: MongoDB collection의 schema와 document 타입을 정의한다.
 * 연결: userStore의 큰 상태를 collection 단위 문서로 나눠 저장할 때 기준이 된다.
 * 주의: 필드를 추가하면 repository default, modelSpecs, migration compatibility도 함께 확인한다.
 */
import mongoose, { Schema } from 'mongoose'

export interface ModuleStateDoc {
  uid: string
  moduleId: string
  state: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

const ModuleStateSchema = new Schema<ModuleStateDoc>(
  {
    uid: { type: String, required: true, index: true },
    moduleId: { type: String, required: true, index: true },
    state: { type: Schema.Types.Mixed, required: true, default: {} },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'moduleStates',
    versionKey: false,
  },
)

ModuleStateSchema.index({ uid: 1, moduleId: 1 }, { unique: true })

export const ModuleStateModel =
  mongoose.models.ModuleState ?? mongoose.model<ModuleStateDoc>('ModuleState', ModuleStateSchema)






