/**
 * packages/backend/src/repositories/mydongCosmeticRepository.ts
 * ------------------------------------------------------------
 * 역할: 코스메틱 보유/장착/페르소나 파츠 상태를 normalized row 구조로 관리한다.
 * 연결: myAidongStates.equippedOutfit/equippedItems는 기존 API 호환 mirror로만 유지한다.
 */
import type { ClientSession } from 'mongoose'

export interface UserCosmeticInventoryDoc {
  id: string
  uid: string
  cosmeticId: string
  quantity: number
  source: string
  acquiredAt: number
  updatedAt: number
}

export interface MydongCosmeticLoadoutDoc {
  id: string
  uid: string
  mydongUid: string
  aidongId: string
  outfitId?: string
  equippedItemIds: string[]
  updatedAt: number
}

export interface MydongPersonaPartStateDoc {
  id: string
  uid: string
  mydongUid: string
  aidongId: string
  partType: string
  partId: string
  state: string
  updatedAt: number
}

export interface MydongCosmeticRepository {
  listInventory(uid: string, session?: ClientSession): Promise<UserCosmeticInventoryDoc[]>
  setInventoryQuantity(uid: string, cosmeticId: string, quantity: number, source?: string, session?: ClientSession): Promise<UserCosmeticInventoryDoc>
  listLoadouts(uid: string, session?: ClientSession): Promise<MydongCosmeticLoadoutDoc[]>
  getLoadout(uid: string, mydongUid: string, seed?: Partial<MydongCosmeticLoadoutDoc>, session?: ClientSession): Promise<MydongCosmeticLoadoutDoc>
  setOutfit(uid: string, mydongUid: string, aidongId: string, outfitId: string, session?: ClientSession): Promise<MydongCosmeticLoadoutDoc>
  setEquippedItems(uid: string, mydongUid: string, aidongId: string, itemIds: string[], session?: ClientSession): Promise<MydongCosmeticLoadoutDoc>
  listPersonaPartStates(uid: string, session?: ClientSession): Promise<MydongPersonaPartStateDoc[]>
  setPersonaPartState(uid: string, input: Omit<MydongPersonaPartStateDoc, 'id' | 'uid' | 'updatedAt'>, session?: ClientSession): Promise<MydongPersonaPartStateDoc>
  delete(uid: string, session?: ClientSession): Promise<boolean>
}

export function userCosmeticInventoryId(uid: string, cosmeticId: string): string {
  return `${uid}:${cosmeticId}`
}

export function mydongCosmeticLoadoutId(uid: string, mydongUid: string): string {
  return `${uid}:${mydongUid}`
}

export function mydongPersonaPartStateId(uid: string, mydongUid: string, partType: string): string {
  return `${uid}:${mydongUid}:${partType}`
}

export function normalizeEquippedItemIds(itemIds: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const itemId of itemIds) {
    if (!itemId || seen.has(itemId)) continue
    seen.add(itemId)
    result.push(itemId)
  }
  return result
}

export function createUserCosmeticInventoryDoc(
  uid: string,
  cosmeticId: string,
  quantity: number,
  source = 'unknown',
  now = Date.now(),
): UserCosmeticInventoryDoc {
  return {
    id: userCosmeticInventoryId(uid, cosmeticId),
    uid,
    cosmeticId,
    quantity: Math.max(0, Math.floor(quantity)),
    source,
    acquiredAt: now,
    updatedAt: now,
  }
}

export function createMydongCosmeticLoadoutDoc(
  uid: string,
  mydongUid: string,
  aidongId: string,
  seed: Partial<MydongCosmeticLoadoutDoc> = {},
  now = Date.now(),
): MydongCosmeticLoadoutDoc {
  return {
    id: mydongCosmeticLoadoutId(uid, mydongUid),
    uid,
    mydongUid,
    aidongId,
    outfitId: seed.outfitId,
    equippedItemIds: normalizeEquippedItemIds(seed.equippedItemIds ?? []),
    updatedAt: now,
  }
}

export function createMydongPersonaPartStateDoc(
  uid: string,
  input: Omit<MydongPersonaPartStateDoc, 'id' | 'uid' | 'updatedAt'>,
  now = Date.now(),
): MydongPersonaPartStateDoc {
  return {
    id: mydongPersonaPartStateId(uid, input.mydongUid, input.partType),
    uid,
    mydongUid: input.mydongUid,
    aidongId: input.aidongId,
    partType: input.partType,
    partId: input.partId,
    state: input.state,
    updatedAt: now,
  }
}

export function groupLoadoutsByAidongId(loadouts: MydongCosmeticLoadoutDoc[]) {
  const equippedOutfit: Record<string, string> = {}
  const equippedItems: Record<string, string[]> = {}
  for (const loadout of loadouts) {
    if (loadout.outfitId) equippedOutfit[loadout.aidongId] = loadout.outfitId
    equippedItems[loadout.aidongId] = loadout.equippedItemIds
  }
  return { equippedOutfit, equippedItems }
}
