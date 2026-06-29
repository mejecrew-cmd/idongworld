/**
 * packages/backend/src/repositories/mydongPediaInventoryRepository.ts
 * ------------------------------------------------------------
 * 역할: Aidong 도감/코덱스 보유 수량을 mydongUid + pediaItemId 기준 row 구조로 관리한다.
 * 연결: myAidongStates.aidongCodexItems는 기존 API 호환 mirror로만 유지한다.
 */
import type { ClientSession } from 'mongoose'

export interface MydongPediaInventoryDoc {
  id: string
  uid: string
  mydongUid: string
  aidongId: string
  pediaItemId: string
  slotNo: number
  quantity: number
  maxQuantity: number
  firstAcquiredAt: number
  lastAcquiredAt: number
  source: string
  updatedAt: number
}

export interface MydongPediaGrantInput {
  mydongUid: string
  aidongId: string
  pediaItemId: string
  slotNo: number
  quantity: number
  maxQuantity?: number
  source?: string
}

export interface MydongPediaInventoryRepository {
  list(uid: string, session?: ClientSession): Promise<MydongPediaInventoryDoc[]>
  listForMydong(uid: string, mydongUid: string, session?: ClientSession): Promise<MydongPediaInventoryDoc[]>
  grant(uid: string, input: MydongPediaGrantInput, session?: ClientSession): Promise<MydongPediaInventoryDoc>
  delete(uid: string, session?: ClientSession): Promise<boolean>
}

export function mydongPediaInventoryId(uid: string, mydongUid: string, pediaItemId: string): string {
  return `${uid}:${mydongUid}:${pediaItemId}`
}

export function createMydongPediaInventoryDoc(
  uid: string,
  input: MydongPediaGrantInput,
  now = Date.now(),
): MydongPediaInventoryDoc {
  return {
    id: mydongPediaInventoryId(uid, input.mydongUid, input.pediaItemId),
    uid,
    mydongUid: input.mydongUid,
    aidongId: input.aidongId,
    pediaItemId: input.pediaItemId,
    slotNo: input.slotNo,
    quantity: Math.max(0, Math.floor(input.quantity)),
    maxQuantity: input.maxQuantity ?? 999,
    firstAcquiredAt: now,
    lastAcquiredAt: now,
    source: input.source ?? 'unknown',
    updatedAt: now,
  }
}

export function groupPediaInventoryByAidongId(
  items: MydongPediaInventoryDoc[],
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {}
  for (const item of items) {
    if (item.quantity <= 0) continue
    result[item.aidongId] = result[item.aidongId] ?? {}
    result[item.aidongId][item.pediaItemId] = (result[item.aidongId][item.pediaItemId] ?? 0) + item.quantity
  }
  return result
}
