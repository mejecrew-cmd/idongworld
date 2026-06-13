/**
 * packages/backend/src/models/AidongIslandStateModel.ts
 * ------------------------------------------------------------
 * 역할: M22 아이동섬 module의 MongoDB document 구조를 정의한다.
 * 연결: aidong-island backend service가 상륙, 상호작용, 영입 후보, 영입 기록을 저장한다.
 * 주의: 실제 Aidong 보유 상태는 my-aidong이 소유하고, 마이섬 13슬롯 편입은 my-island가 소유한다.
 */
import mongoose, { Schema } from 'mongoose'

export interface AidongIslandRecruitmentCandidate {
  characterId: string
  status: 'met' | 'recruitable' | 'recruited'
  metAt: number
  recruitableAt?: number
  recruitedAt?: number
  sourceIslandId: string
}

export interface AidongIslandStateDoc {
  uid: string
  moduleId: string
  currentIslandId?: string
  currentNodeId?: string
  visitedIslandIds: string[]
  visitedNodeIds: string[]
  metAidongIds: string[]
  recruitedAidongIds: string[]
  recruitmentCandidates: Record<string, AidongIslandRecruitmentCandidate>
  interactionLog: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

const AidongIslandStateSchema = new Schema<AidongIslandStateDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    moduleId: { type: String, required: true, default: 'aidong-island' },
    currentIslandId: String,
    currentNodeId: String,
    visitedIslandIds: { type: [String], required: true, default: [] },
    visitedNodeIds: { type: [String], required: true, default: [] },
    metAidongIds: { type: [String], required: true, default: [] },
    recruitedAidongIds: { type: [String], required: true, default: [] },
    recruitmentCandidates: { type: Schema.Types.Mixed, required: true, default: {} },
    interactionLog: { type: Schema.Types.Mixed, required: true, default: {} },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'aidongIslandStates',
    minimize: false,
    versionKey: false,
  },
)

export const AidongIslandStateModel =
  mongoose.models.AidongIslandState ??
  mongoose.model<AidongIslandStateDoc>('AidongIslandState', AidongIslandStateSchema)