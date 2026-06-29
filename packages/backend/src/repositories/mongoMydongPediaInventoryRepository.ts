/**
 * packages/backend/src/repositories/mongoMydongPediaInventoryRepository.ts
 * ------------------------------------------------------------
 * 역할: MongoDB 기반 mydong pedia inventory repository 구현이다.
 */
import { MydongPediaInventoryModel } from '../models/MydongPediaInventoryModel.js'
import {
  createMydongPediaInventoryDoc,
  type MydongPediaInventoryDoc,
  type MydongPediaInventoryRepository,
} from './mydongPediaInventoryRepository.js'

function toPediaInventoryDoc(doc: unknown): MydongPediaInventoryDoc {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  return plain as unknown as MydongPediaInventoryDoc
}

export const mongoMydongPediaInventoryRepository: MydongPediaInventoryRepository = {
  async list(uid, session) {
    const docs = await MydongPediaInventoryModel.find({ uid })
      .sort({ firstAcquiredAt: 1 })
      .session(session ?? null)
      .lean()
    return docs.map(toPediaInventoryDoc)
  },

  async listForMydong(uid, mydongUid, session) {
    const docs = await MydongPediaInventoryModel.find({ uid, mydongUid })
      .sort({ slotNo: 1 })
      .session(session ?? null)
      .lean()
    return docs.map(toPediaInventoryDoc)
  },

  async grant(uid, input, session) {
    const now = Date.now()
    const existing = await MydongPediaInventoryModel.findOne({
      uid,
      mydongUid: input.mydongUid,
      pediaItemId: input.pediaItemId,
    }).session(session ?? null).lean()

    if (!existing) {
      const created = await MydongPediaInventoryModel.create(
        [createMydongPediaInventoryDoc(uid, input, now)],
        { session },
      )
      return toPediaInventoryDoc(created[0].toObject())
    }

    const current = toPediaInventoryDoc(existing)
    const nextQuantity = Math.min(input.maxQuantity ?? current.maxQuantity, current.quantity + input.quantity)
    const doc = await MydongPediaInventoryModel.findOneAndUpdate(
      { id: current.id },
      {
        $set: {
          aidongId: input.aidongId,
          slotNo: input.slotNo,
          quantity: nextQuantity,
          maxQuantity: input.maxQuantity ?? current.maxQuantity,
          lastAcquiredAt: now,
          source: input.source ?? current.source,
          updatedAt: now,
        },
      },
      { new: true, lean: true, session },
    )
    return toPediaInventoryDoc(doc)
  },

  async delete(uid, session) {
    const result = await MydongPediaInventoryModel.deleteMany({ uid }).session(session ?? null)
    return result.deletedCount > 0
  },
}
