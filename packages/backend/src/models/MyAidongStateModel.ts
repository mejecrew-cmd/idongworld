/**
 * packages/backend/src/models/MyAidongStateModel.ts
 * ------------------------------------------------------------
 * 역할: MongoDB collection의 schema와 document 타입을 정의한다.
 * 연결: userStore의 큰 상태를 collection 단위 문서로 나눠 저장할 때 기준이 된다.
 * 주의: 필드를 추가하면 repository default, modelSpecs, migration compatibility도 함께 확인한다.
 */
import mongoose, { Schema } from 'mongoose'
import type { AidongCharacterId } from '../store/memoryStore.js'

export interface MyAidongStateDoc {
  uid: string
  recruitedAidongs: AidongCharacterId[]
  firstGachaCandidate?: AidongCharacterId
  firstGachaAttempts: number
  affinities: Record<string, { score: number; level: number }>
  needs: Record<string, Record<string, number>>
  careLog: Record<string, Record<string, unknown>>
  lastSequenceZone: Record<string, number>
  lastSequenceAt: Record<string, number>
  equippedOutfit: Record<string, string>
  equippedItems: Record<string, string[]>
  aidongCodexItems: Record<string, Record<string, number>>
  aidongUpgradeState: Record<string, Record<string, unknown>>
  createdAt: number
  updatedAt: number
}

const MyAidongStateSchema = new Schema<MyAidongStateDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    recruitedAidongs: { type: [String], required: true, default: [] },
    firstGachaCandidate: String,
    firstGachaAttempts: { type: Number, required: true, default: 0 },
    affinities: { type: Schema.Types.Mixed, required: true, default: {} },
    needs: { type: Schema.Types.Mixed, required: true, default: {} },
    careLog: { type: Schema.Types.Mixed, required: true, default: {} },
    lastSequenceZone: { type: Schema.Types.Mixed, required: true, default: {} },
    lastSequenceAt: { type: Schema.Types.Mixed, required: true, default: {} },
    equippedOutfit: { type: Schema.Types.Mixed, required: true, default: {} },
    equippedItems: { type: Schema.Types.Mixed, required: true, default: {} },
    aidongCodexItems: { type: Schema.Types.Mixed, required: true, default: {} },
    aidongUpgradeState: { type: Schema.Types.Mixed, required: true, default: {} },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'myAidongStates',
    minimize: false,
    versionKey: false,
  },
)

export const MyAidongStateModel =
  mongoose.models.MyAidongState ??
  mongoose.model<MyAidongStateDoc>('MyAidongState', MyAidongStateSchema)






