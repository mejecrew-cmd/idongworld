/**
 * packages/backend/src/repositories/memoryMydongPediaInventoryRepository.ts
 * ------------------------------------------------------------
 * 역할: 개발/테스트용 in-memory mydong pedia inventory repository 구현이다.
 */
import {
  createMydongPediaInventoryDoc,
  mydongPediaInventoryId,
  type MydongPediaInventoryDoc,
  type MydongPediaInventoryRepository,
} from './mydongPediaInventoryRepository.js'

const pediaInventory = new Map<string, MydongPediaInventoryDoc>()

function clone(doc: MydongPediaInventoryDoc): MydongPediaInventoryDoc {
  return { ...doc }
}

export const memoryMydongPediaInventoryRepository: MydongPediaInventoryRepository = {
  async list(uid) {
    return Array.from(pediaInventory.values())
      .filter((doc) => doc.uid === uid)
      .sort((a, b) => a.firstAcquiredAt - b.firstAcquiredAt)
      .map(clone)
  },

  async listForMydong(uid, mydongUid) {
    return Array.from(pediaInventory.values())
      .filter((doc) => doc.uid === uid && doc.mydongUid === mydongUid)
      .sort((a, b) => a.slotNo - b.slotNo)
      .map(clone)
  },

  async grant(uid, input) {
    const now = Date.now()
    const id = mydongPediaInventoryId(uid, input.mydongUid, input.pediaItemId)
    const existing = pediaInventory.get(id)
    if (!existing) {
      const created = createMydongPediaInventoryDoc(uid, input, now)
      pediaInventory.set(id, created)
      return clone(created)
    }

    const next: MydongPediaInventoryDoc = {
      ...existing,
      aidongId: input.aidongId,
      slotNo: input.slotNo,
      quantity: Math.min(existing.maxQuantity, existing.quantity + input.quantity),
      maxQuantity: input.maxQuantity ?? existing.maxQuantity,
      lastAcquiredAt: now,
      source: input.source ?? existing.source,
      updatedAt: now,
    }
    pediaInventory.set(id, next)
    return clone(next)
  },

  async delete(uid) {
    let deleted = false
    for (const [id, doc] of pediaInventory.entries()) {
      if (doc.uid !== uid) continue
      pediaInventory.delete(id)
      deleted = true
    }
    return deleted
  },
}
