/**
 * packages/backend/src/models/ShipStateModel.ts
 * ------------------------------------------------------------
 * 역할: MongoDB collection의 schema와 document 타입을 정의한다.
 * 연결: userStore의 큰 상태를 collection 단위 문서로 나눠 저장할 때 기준이 된다.
 * 주의: 필드를 추가하면 repository default, modelSpecs, migration compatibility도 함께 확인한다.
 */
import mongoose, { Schema } from 'mongoose'
import type { AidongCharacterId } from '../store/memoryStore.js'

export interface ShipStateDoc {
  uid: string
  shipTypeId: string
  harborAssignedChars: AidongCharacterId[]
  harborLastChargedAt?: number
  /** 배에 실린 운송/재료 자원의 권위 인벤토리다. customs target/source는 이 필드를 사용한다. */
  shipInventory: Record<string, number>
  cabinAssignments: Record<string, AidongCharacterId>
  deckAssignments: Record<string, AidongCharacterId>
  /** 선실 꾸미기 아이템 구매 수량의 권위 필드다. */
  cabinFurniture: Record<string, number>
  /** @deprecated cargoCapacity는 balance.csv로 계산하고, 적재 수량은 shipInventory를 사용한다. */
  cargo: Record<string, number>
  /** @deprecated 선실별 꾸미기 배치 호환 필드다. 구매 수량은 cabinFurniture를 사용한다. */
  cabins: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

const ShipStateSchema = new Schema<ShipStateDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    shipTypeId: { type: String, required: true, default: 'dinghy', index: true },
    harborAssignedChars: { type: [String], required: true, default: [] },
    harborLastChargedAt: Number,
    shipInventory: { type: Schema.Types.Mixed, required: true, default: {} },
    cabinAssignments: { type: Schema.Types.Mixed, required: true, default: {} },
    deckAssignments: { type: Schema.Types.Mixed, required: true, default: {} },
    cabinFurniture: { type: Schema.Types.Mixed, required: true, default: {} },
    cargo: { type: Schema.Types.Mixed, required: true, default: {} },
    cabins: { type: Schema.Types.Mixed, required: true, default: {} },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'shipStates',
    minimize: false,
    versionKey: false,
  },
)

export const ShipStateModel =
  mongoose.models.ShipState ?? mongoose.model<ShipStateDoc>('ShipState', ShipStateSchema)






