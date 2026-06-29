/**
 * packages/backend/src/repositories/mongoUserInventoryRepository.ts
 * ------------------------------------------------------------
 * 역할: MongoDB 기반 normalized user inventory repository 구현이다.
 */
import { UserInventoryItemModel } from '../models/UserInventoryItemModel.js'
import type { ClientSession } from 'mongoose'
import {
  normalizeInventoryMap,
  userInventoryItemId,
  type UserInventoryRepository,
} from './userInventoryRepository.js'

function docsToInventoryMap(docs: Array<{ itemId: string; quantity: number }>): Record<string, number> {
  const inventory: Record<string, number> = {}
  for (const doc of docs) {
    const quantity = Math.max(0, Math.floor(Number(doc.quantity)))
    if (doc.itemId && Number.isFinite(quantity) && quantity > 0) inventory[doc.itemId] = quantity
  }
  return inventory
}

async function seedInventoryIfMissing(uid: string, seed?: Record<string, number>, session?: ClientSession) {
  const normalized = normalizeInventoryMap(seed)
  if (!Object.keys(normalized).length) return
  const existingCount = await UserInventoryItemModel.countDocuments({ uid }).session(session ?? null)
  if (existingCount > 0) return
  const now = Date.now()
  await UserInventoryItemModel.bulkWrite(
    Object.entries(normalized).map(([itemId, quantity]) => ({
      updateOne: {
        filter: { uid, itemId },
        update: {
          $setOnInsert: {
            id: userInventoryItemId(uid, itemId),
            uid,
            itemId,
            quantity,
            acquiredAt: now,
            createdAt: now,
          },
          $set: {
            updatedAt: now,
          },
        },
        upsert: true,
      },
    })),
    { session },
  )
}

export const mongoUserInventoryRepository: UserInventoryRepository = {
  async getInventoryMap(uid, seed, session) {
    await seedInventoryIfMissing(uid, seed, session)
    const docs = await UserInventoryItemModel.find({ uid, quantity: { $gt: 0 } }).session(session ?? null).lean()
    return docsToInventoryMap(docs as unknown as Array<{ itemId: string; quantity: number }>)
  },

  async replaceInventory(uid, inventory, session) {
    const normalized = normalizeInventoryMap(inventory)
    const now = Date.now()
    await UserInventoryItemModel.deleteMany({ uid }).session(session ?? null)
    const entries = Object.entries(normalized)
    if (entries.length) {
      await UserInventoryItemModel.insertMany(
        entries.map(([itemId, quantity]) => ({
          id: userInventoryItemId(uid, itemId),
          uid,
          itemId,
          quantity,
          acquiredAt: now,
          createdAt: now,
          updatedAt: now,
        })),
        { session },
      )
    }
    return normalized
  },

  async mutateInventory(uid, itemId, delta, session) {
    const current = await this.getInventoryMap(uid, undefined, session)
    const nextAmount = (current[itemId] ?? 0) + delta
    if (nextAmount < 0) throw new Error('insufficient_host_inventory')
    const now = Date.now()
    if (nextAmount <= 0) {
      await UserInventoryItemModel.deleteOne({ uid, itemId }).session(session ?? null)
    } else {
      await UserInventoryItemModel.findOneAndUpdate(
        { uid, itemId },
        {
          $set: {
            quantity: nextAmount,
            updatedAt: now,
          },
          $setOnInsert: {
            id: userInventoryItemId(uid, itemId),
            uid,
            itemId,
            acquiredAt: now,
            createdAt: now,
          },
        },
        { upsert: true, new: true, session },
      )
    }
    const next = { ...current }
    if (nextAmount <= 0) delete next[itemId]
    else next[itemId] = nextAmount
    return next
  },

  async delete(uid, session) {
    const result = await UserInventoryItemModel.deleteMany({ uid }).session(session ?? null)
    return result.deletedCount > 0
  },
}
