/**
 * packages/backend/src/models/DestinationIslandStateModel.ts
 * ------------------------------------------------------------
 * 역할: 항해 중 도착하는 섬 모듈의 MongoDB document 구조를 정의한다.
 * 연결: destination-island 모듈은 고정맵 탐험 위치, 방문 노드, 미션 진행도,
 *       섬 전용 자원/아이템을 이 document에 저장한다.
 * 주의: 섬 밖으로 들고 나갈 수 없는 전용 자원은 customs를 통과하기 전까지
 *       host, ship, lodge document에 직접 반영하지 않는다.
 */
import mongoose, { Schema } from 'mongoose'

export interface DestinationHotspotState {
  interacted: boolean
  count?: number
  lastInteractedAt?: number
}

export interface DestinationIslandStateDoc {
  uid: string
  moduleId: string
  currentNodeId: string
  visitedNodeIds: string[]
  clearedMissionIds: string[]
  localResources: Record<string, number>
  localInventory: Record<string, number>
  hotspotStates: Record<string, DestinationHotspotState>
  createdAt: number
  updatedAt: number
}

const DestinationIslandStateSchema = new Schema<DestinationIslandStateDoc>(
  {
    uid: { type: String, required: true, index: true },
    moduleId: { type: String, required: true, index: true },
    currentNodeId: { type: String, required: true },
    visitedNodeIds: { type: [String], required: true, default: [] },
    clearedMissionIds: { type: [String], required: true, default: [] },
    localResources: { type: Schema.Types.Mixed, required: true, default: {} },
    localInventory: { type: Schema.Types.Mixed, required: true, default: {} },
    hotspotStates: { type: Schema.Types.Mixed, required: true, default: {} },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'destinationIslandStates',
    minimize: false,
    versionKey: false,
  },
)

DestinationIslandStateSchema.index({ uid: 1, moduleId: 1 }, { unique: true })

export const DestinationIslandStateModel =
  mongoose.models.DestinationIslandState ??
  mongoose.model<DestinationIslandStateDoc>('DestinationIslandState', DestinationIslandStateSchema)
