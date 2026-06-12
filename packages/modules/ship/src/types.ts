/**
 * 📁 ship/src/types.ts — ship 모듈 공개 타입
 */
export type ShipSlotId = string
export type ShipInventory = Record<string, number>
export type ShipCabinAssignments = Record<ShipSlotId, string>

export interface ShipStateSnapshot {
  harborAssignedChars: string[]
  harborLastChargedAt?: number
  shipInventory: ShipInventory
  cabins: ShipCabinAssignments
}

export type ShipMutateResult = boolean
