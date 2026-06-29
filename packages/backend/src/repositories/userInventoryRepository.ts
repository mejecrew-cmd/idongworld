/**
 * packages/backend/src/repositories/userInventoryRepository.ts
 * ------------------------------------------------------------
 * 역할: 유저 전역 인벤토리를 xlsx 기준 normalized row 구조로 저장하는 repository 계약이다.
 * 연결: HostStateRepository가 기존 map 응답 호환을 제공하면서 실제 inventory 권위 저장소로 사용한다.
 * 주의: 재화/주사위는 이 repository가 아니라 각각 currency/dice 전용 repository로 분리한다.
 */
import type { ClientSession } from 'mongoose'

export interface UserInventoryItemDoc {
  id: string
  uid: string
  itemId: string
  quantity: number
  acquiredAt?: number
  updatedAt: number
  createdAt: number
}

export interface UserInventoryRepository {
  getInventoryMap(uid: string, seed?: Record<string, number>, session?: ClientSession): Promise<Record<string, number>>
  replaceInventory(uid: string, inventory: Record<string, number>, session?: ClientSession): Promise<Record<string, number>>
  mutateInventory(uid: string, itemId: string, delta: number, session?: ClientSession): Promise<Record<string, number>>
  delete(uid: string, session?: ClientSession): Promise<boolean>
}

export function normalizeInventoryMap(value: Record<string, unknown> | Record<string, number> | undefined): Record<string, number> {
  const inventory: Record<string, number> = {}
  for (const [itemId, rawAmount] of Object.entries(value ?? {})) {
    const amount = Math.max(0, Math.floor(Number(rawAmount)))
    if (itemId && Number.isFinite(amount) && amount > 0) inventory[itemId] = amount
  }
  return inventory
}

export function userInventoryItemId(uid: string, itemId: string): string {
  return `${uid}:${itemId}`
}
