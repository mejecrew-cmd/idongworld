/**
 * packages/backend/src/models/MyIslandStateModel.ts
 * ------------------------------------------------------------
 * 역할: MongoDB collection의 schema와 document 타입을 정의한다.
 * 연결: userStore의 큰 상태를 collection 단위 문서로 나눠 저장할 때 기준이 된다.
 * 주의: 필드를 추가하면 repository default, modelSpecs, migration compatibility도 함께 확인한다.
 */
import mongoose, { Schema } from 'mongoose'

export interface MyIslandStateDoc {
  uid: string
  unlockedZones: string[]
  zoneSlots: Record<string, MyIslandZoneSlot>
  dynamicAidongZones: Record<string, DynamicAidongZone>
  zoneProgress: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

export interface MyIslandZoneSlot {
  areaNo: string
  areaId: string
  kind: 'anchor' | 'fillable'
  occupantAidongId?: string
  state: 'locked' | 'empty' | 'filled' | 'active' | 'standby'
  source?: 'default' | 'incorporation' | 'migration'
  incorporatedAt?: number
  updatedAt?: number
}

export interface DynamicAidongZone {
  zoneId: string
  characterId: string
  status: 'active' | 'hidden' | 'farewelled'
  displayOrder: number
  pinned: boolean
  openedAt: number
  source: 'voyage-encounter' | 'manual' | 'migration'
}

const MyIslandStateSchema = new Schema<MyIslandStateDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    unlockedZones: { type: [String], required: true, default: [] },
    zoneSlots: { type: Schema.Types.Mixed, required: true, default: {} },
    dynamicAidongZones: { type: Schema.Types.Mixed, required: true, default: {} },
    zoneProgress: { type: Schema.Types.Mixed, required: true, default: {} },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'myIslandStates',
    minimize: false,
    versionKey: false,
  },
)

export const MyIslandStateModel =
  mongoose.models.MyIslandState ??
  mongoose.model<MyIslandStateDoc>('MyIslandState', MyIslandStateSchema)






