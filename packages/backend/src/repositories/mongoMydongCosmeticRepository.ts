/**
 * packages/backend/src/repositories/mongoMydongCosmeticRepository.ts
 * ------------------------------------------------------------
 * 역할: MongoDB 기반 mydong cosmetic repository 구현이다.
 */
import { MydongCosmeticLoadoutModel } from '../models/MydongCosmeticLoadoutModel.js'
import { MydongPersonaPartStateModel } from '../models/MydongPersonaPartStateModel.js'
import { UserCosmeticInventoryModel } from '../models/UserCosmeticInventoryModel.js'
import {
  createMydongCosmeticLoadoutDoc,
  createMydongPersonaPartStateDoc,
  createUserCosmeticInventoryDoc,
  normalizeEquippedItemIds,
  type MydongCosmeticLoadoutDoc,
  type MydongCosmeticRepository,
  type MydongPersonaPartStateDoc,
  type UserCosmeticInventoryDoc,
} from './mydongCosmeticRepository.js'

function toInventoryDoc(doc: unknown): UserCosmeticInventoryDoc {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  return plain as unknown as UserCosmeticInventoryDoc
}

function toLoadoutDoc(doc: unknown): MydongCosmeticLoadoutDoc {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  return plain as unknown as MydongCosmeticLoadoutDoc
}

function toPersonaDoc(doc: unknown): MydongPersonaPartStateDoc {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  return plain as unknown as MydongPersonaPartStateDoc
}

export const mongoMydongCosmeticRepository: MydongCosmeticRepository = {
  async listInventory(uid, session) {
    const docs = await UserCosmeticInventoryModel.find({ uid, quantity: { $gt: 0 } })
      .sort({ acquiredAt: 1 })
      .session(session ?? null)
      .lean()
    return docs.map(toInventoryDoc)
  },

  async setInventoryQuantity(uid, cosmeticId, quantity, source = 'unknown', session) {
    const now = Date.now()
    const existing = await UserCosmeticInventoryModel.findOne({ uid, cosmeticId }).session(session ?? null).lean()
    if (!existing) {
      const created = await UserCosmeticInventoryModel.create(
        [createUserCosmeticInventoryDoc(uid, cosmeticId, quantity, source, now)],
        { session },
      )
      return toInventoryDoc(created[0].toObject())
    }
    const doc = await UserCosmeticInventoryModel.findOneAndUpdate(
      { uid, cosmeticId },
      {
        $set: {
          quantity: Math.max(0, Math.floor(quantity)),
          source,
          updatedAt: now,
        },
      },
      { new: true, lean: true, session },
    )
    return toInventoryDoc(doc)
  },

  async listLoadouts(uid, session) {
    const docs = await MydongCosmeticLoadoutModel.find({ uid })
      .sort({ updatedAt: 1 })
      .session(session ?? null)
      .lean()
    return docs.map(toLoadoutDoc)
  },

  async getLoadout(uid, mydongUid, seed = {}, session) {
    const existing = await MydongCosmeticLoadoutModel.findOne({ uid, mydongUid }).session(session ?? null).lean()
    if (existing) return toLoadoutDoc(existing)
    const created = await MydongCosmeticLoadoutModel.create(
      [createMydongCosmeticLoadoutDoc(uid, mydongUid, seed.aidongId ?? '', seed)],
      { session },
    )
    return toLoadoutDoc(created[0].toObject())
  },

  async setOutfit(uid, mydongUid, aidongId, outfitId, session) {
    const now = Date.now()
    const existing = await MydongCosmeticLoadoutModel.findOne({ uid, mydongUid }).session(session ?? null).lean()
    if (!existing) {
      const created = await MydongCosmeticLoadoutModel.create(
        [createMydongCosmeticLoadoutDoc(uid, mydongUid, aidongId, { outfitId }, now)],
        { session },
      )
      return toLoadoutDoc(created[0].toObject())
    }
    const doc = await MydongCosmeticLoadoutModel.findOneAndUpdate(
      { uid, mydongUid },
      {
        $set: { aidongId, outfitId, updatedAt: now },
      },
      { new: true, lean: true, session },
    )
    return toLoadoutDoc(doc)
  },

  async setEquippedItems(uid, mydongUid, aidongId, itemIds, session) {
    const now = Date.now()
    const equippedItemIds = normalizeEquippedItemIds(itemIds)
    const existing = await MydongCosmeticLoadoutModel.findOne({ uid, mydongUid }).session(session ?? null).lean()
    if (!existing) {
      const created = await MydongCosmeticLoadoutModel.create(
        [createMydongCosmeticLoadoutDoc(uid, mydongUid, aidongId, { equippedItemIds }, now)],
        { session },
      )
      return toLoadoutDoc(created[0].toObject())
    }
    const doc = await MydongCosmeticLoadoutModel.findOneAndUpdate(
      { uid, mydongUid },
      {
        $set: { aidongId, equippedItemIds, updatedAt: now },
      },
      { new: true, lean: true, session },
    )
    return toLoadoutDoc(doc)
  },

  async listPersonaPartStates(uid, session) {
    const docs = await MydongPersonaPartStateModel.find({ uid })
      .sort({ updatedAt: 1 })
      .session(session ?? null)
      .lean()
    return docs.map(toPersonaDoc)
  },

  async setPersonaPartState(uid, input, session) {
    const now = Date.now()
    const existing = await MydongPersonaPartStateModel.findOne({
      uid,
      mydongUid: input.mydongUid,
      partType: input.partType,
    }).session(session ?? null).lean()
    if (!existing) {
      const created = await MydongPersonaPartStateModel.create(
        [createMydongPersonaPartStateDoc(uid, input, now)],
        { session },
      )
      return toPersonaDoc(created[0].toObject())
    }
    const doc = await MydongPersonaPartStateModel.findOneAndUpdate(
      { uid, mydongUid: input.mydongUid, partType: input.partType },
      {
        $set: {
          aidongId: input.aidongId,
          partId: input.partId,
          state: input.state,
          updatedAt: now,
        },
      },
      { new: true, lean: true, session },
    )
    return toPersonaDoc(doc)
  },

  async delete(uid, session) {
    const [inventory, loadouts, personaParts] = await Promise.all([
      UserCosmeticInventoryModel.deleteMany({ uid }).session(session ?? null),
      MydongCosmeticLoadoutModel.deleteMany({ uid }).session(session ?? null),
      MydongPersonaPartStateModel.deleteMany({ uid }).session(session ?? null),
    ])
    return inventory.deletedCount + loadouts.deletedCount + personaParts.deletedCount > 0
  },
}
