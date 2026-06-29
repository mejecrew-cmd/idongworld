/**
 * packages/backend/src/repositories/memoryUserInventoryRepository.ts
 * ------------------------------------------------------------
 * 역할: 개발/테스트용 in-memory user inventory repository다.
 */
import {
  normalizeInventoryMap,
  type UserInventoryRepository,
} from './userInventoryRepository.js'

const inventories = new Map<string, Record<string, number>>()

function clone(value: Record<string, number>): Record<string, number> {
  return { ...value }
}

export const memoryUserInventoryRepository: UserInventoryRepository = {
  async getInventoryMap(uid, seed) {
    const existing = inventories.get(uid)
    if (existing) return clone(existing)
    const created = normalizeInventoryMap(seed)
    inventories.set(uid, created)
    return clone(created)
  },

  async replaceInventory(uid, inventory) {
    const next = normalizeInventoryMap(inventory)
    inventories.set(uid, next)
    return clone(next)
  },

  async mutateInventory(uid, itemId, delta) {
    const current = await this.getInventoryMap(uid)
    const nextAmount = (current[itemId] ?? 0) + delta
    if (nextAmount < 0) throw new Error('insufficient_host_inventory')
    const next = {
      ...current,
      [itemId]: nextAmount,
    }
    if (next[itemId] <= 0) delete next[itemId]
    inventories.set(uid, next)
    return clone(next)
  },

  async delete(uid) {
    return inventories.delete(uid)
  },
}
