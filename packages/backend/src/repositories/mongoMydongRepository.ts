/**
 * packages/backend/src/repositories/mongoMydongRepository.ts
 * ------------------------------------------------------------
 * 역할: MongoDB 기반 mydong repository 구현이다.
 */
import type { ClientSession } from 'mongoose'
import { MydongModel } from '../models/MydongModel.js'
import {
  createMydongDoc,
  legacyMydongUid,
  normalizeAidongIds,
  type MydongDoc,
  type MydongRepository,
  type MydongAcquisitionSource,
} from './mydongRepository.js'

function toMydongDoc(doc: unknown): MydongDoc {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  return plain as unknown as MydongDoc
}

export const mongoMydongRepository: MydongRepository = {
  async list(uid, session) {
    const docs = await MydongModel.find({ uid, status: 'active' })
      .sort({ acquiredAt: 1 })
      .session(session ?? null)
      .lean()
    return docs.map(toMydongDoc)
  },

  async getByMydongUid(uid, mydongUid, session) {
    const doc = await MydongModel.findOne({ uid, mydongUid }).session(session ?? null).lean()
    return doc ? toMydongDoc(doc) : undefined
  },

  async getActiveByAidongId(uid, aidongId, session) {
    const doc = await MydongModel.findOne({ uid, aidongId, status: 'active' }).session(session ?? null).lean()
    return doc ? toMydongDoc(doc) : undefined
  },

  async getOrCreateForAidong(uid, input, session) {
    const now = input.acquiredAt ?? Date.now()
    const defaults = createMydongDoc(uid, { ...input, acquiredAt: now })
    const doc = await MydongModel.findOneAndUpdate(
      {
        uid,
        aidongId: input.aidongId,
        status: 'active',
      },
      {
        $setOnInsert: defaults,
        $set: {
          updatedAt: now,
        },
      },
      { new: true, upsert: true, lean: true, session },
    )
    return toMydongDoc(doc)
  },

  async seedFromAidongIds(uid, aidongIds, source: MydongAcquisitionSource = 'migration', session?: ClientSession) {
    const now = Date.now()
    const normalized = normalizeAidongIds(aidongIds)
    if (normalized.length) {
      await MydongModel.bulkWrite(
        normalized.map((aidongId) => ({
          updateOne: {
            filter: { mydongUid: legacyMydongUid(uid, aidongId) },
            update: {
              $setOnInsert: createMydongDoc(uid, {
                aidongId,
                acquisitionSource: source,
                acquiredAt: now,
              }),
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
    return this.list(uid, session)
  },

  async delete(uid, session) {
    const result = await MydongModel.deleteMany({ uid }).session(session ?? null)
    return result.deletedCount > 0
  },
}
