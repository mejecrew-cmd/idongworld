/**
 * packages/backend/src/repositories/memoryMydongCosmeticRepository.ts
 * ------------------------------------------------------------
 * 역할: 개발/테스트용 in-memory mydong cosmetic repository 구현이다.
 */
import {
  createMydongCosmeticLoadoutDoc,
  createMydongPersonaPartStateDoc,
  createUserCosmeticInventoryDoc,
  mydongCosmeticLoadoutId,
  mydongPersonaPartStateId,
  normalizeEquippedItemIds,
  userCosmeticInventoryId,
  type MydongCosmeticLoadoutDoc,
  type MydongCosmeticRepository,
  type MydongPersonaPartStateDoc,
  type UserCosmeticInventoryDoc,
} from './mydongCosmeticRepository.js'

const inventories = new Map<string, UserCosmeticInventoryDoc>()
const loadouts = new Map<string, MydongCosmeticLoadoutDoc>()
const personaParts = new Map<string, MydongPersonaPartStateDoc>()

function cloneInventory(doc: UserCosmeticInventoryDoc): UserCosmeticInventoryDoc {
  return { ...doc }
}

function cloneLoadout(doc: MydongCosmeticLoadoutDoc): MydongCosmeticLoadoutDoc {
  return { ...doc, equippedItemIds: [...doc.equippedItemIds] }
}

function clonePersona(doc: MydongPersonaPartStateDoc): MydongPersonaPartStateDoc {
  return { ...doc }
}

export const memoryMydongCosmeticRepository: MydongCosmeticRepository = {
  async listInventory(uid) {
    return Array.from(inventories.values())
      .filter((doc) => doc.uid === uid && doc.quantity > 0)
      .sort((a, b) => a.acquiredAt - b.acquiredAt)
      .map(cloneInventory)
  },

  async setInventoryQuantity(uid, cosmeticId, quantity, source = 'unknown') {
    const now = Date.now()
    const id = userCosmeticInventoryId(uid, cosmeticId)
    const existing = inventories.get(id)
    const next: UserCosmeticInventoryDoc = existing
      ? { ...existing, quantity: Math.max(0, Math.floor(quantity)), source, updatedAt: now }
      : createUserCosmeticInventoryDoc(uid, cosmeticId, quantity, source, now)
    inventories.set(id, next)
    return cloneInventory(next)
  },

  async listLoadouts(uid) {
    return Array.from(loadouts.values())
      .filter((doc) => doc.uid === uid)
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .map(cloneLoadout)
  },

  async getLoadout(uid, mydongUid, seed = {}) {
    const id = mydongCosmeticLoadoutId(uid, mydongUid)
    const existing = loadouts.get(id)
    if (existing) return cloneLoadout(existing)
    const created = createMydongCosmeticLoadoutDoc(uid, mydongUid, seed.aidongId ?? '', seed)
    loadouts.set(id, created)
    return cloneLoadout(created)
  },

  async setOutfit(uid, mydongUid, aidongId, outfitId) {
    const current = await this.getLoadout(uid, mydongUid, { aidongId })
    const next = { ...current, aidongId, outfitId, updatedAt: Date.now() }
    loadouts.set(next.id, next)
    return cloneLoadout(next)
  },

  async setEquippedItems(uid, mydongUid, aidongId, itemIds) {
    const current = await this.getLoadout(uid, mydongUid, { aidongId })
    const next = {
      ...current,
      aidongId,
      equippedItemIds: normalizeEquippedItemIds(itemIds),
      updatedAt: Date.now(),
    }
    loadouts.set(next.id, next)
    return cloneLoadout(next)
  },

  async listPersonaPartStates(uid) {
    return Array.from(personaParts.values())
      .filter((doc) => doc.uid === uid)
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .map(clonePersona)
  },

  async setPersonaPartState(uid, input) {
    const id = mydongPersonaPartStateId(uid, input.mydongUid, input.partType)
    const next = createMydongPersonaPartStateDoc(uid, input)
    personaParts.set(id, next)
    return clonePersona(next)
  },

  async delete(uid) {
    let deleted = false
    for (const [id, doc] of inventories.entries()) {
      if (doc.uid !== uid) continue
      inventories.delete(id)
      deleted = true
    }
    for (const [id, doc] of loadouts.entries()) {
      if (doc.uid !== uid) continue
      loadouts.delete(id)
      deleted = true
    }
    for (const [id, doc] of personaParts.entries()) {
      if (doc.uid !== uid) continue
      personaParts.delete(id)
      deleted = true
    }
    return deleted
  },
}
