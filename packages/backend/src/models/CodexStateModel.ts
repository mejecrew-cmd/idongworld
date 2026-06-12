/**
 * packages/backend/src/models/CodexStateModel.ts
 * ------------------------------------------------------------
 * 역할: MongoDB collection의 schema와 document 타입을 정의한다.
 * 연결: userStore의 큰 상태를 collection 단위 문서로 나눠 저장할 때 기준이 된다.
 * 주의: 필드를 추가하면 repository default, modelSpecs, migration compatibility도 함께 확인한다.
 */
import mongoose, { Schema } from 'mongoose'

export interface CodexStateDoc {
  uid: string
  unlockedDiaries: string[]
  unlockedCodexEntries: string[]
  codexFullyRegistered: string[]
  createdAt: number
  updatedAt: number
}

const CodexStateSchema = new Schema<CodexStateDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    unlockedDiaries: { type: [String], required: true, default: [] },
    unlockedCodexEntries: { type: [String], required: true, default: [] },
    codexFullyRegistered: { type: [String], required: true, default: [] },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'codexStates',
    minimize: false,
    versionKey: false,
  },
)

export const CodexStateModel =
  mongoose.models.CodexState ?? mongoose.model<CodexStateDoc>('CodexState', CodexStateSchema)






