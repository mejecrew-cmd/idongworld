/**
 * packages/backend/src/repositories/memoryMydongRepository.ts
 * ------------------------------------------------------------
 * 역할: 개발/테스트용 in-memory mydong repository 구현이다.
 */
import {
  createMydongDoc,
  normalizeAidongIds,
  type MydongCreateInput,
  type MydongDoc,
  type MydongRepository,
  type MydongAcquisitionSource,
} from './mydongRepository.js'

const mydongs = new Map<string, MydongDoc>()

function clone(value: MydongDoc): MydongDoc {
  return { ...value }
}

function upsert(uid: string, input: MydongCreateInput): MydongDoc {
  const existing = Array.from(mydongs.values()).find((doc) => (
    doc.uid === uid && doc.aidongId === input.aidongId && doc.status === 'active'
  ))
  if (existing) return clone(existing)
  const created = createMydongDoc(uid, input)
  mydongs.set(created.mydongUid, created)
  return clone(created)
}

export const memoryMydongRepository: MydongRepository = {
  async list(uid) {
    return Array.from(mydongs.values())
      .filter((doc) => doc.uid === uid && doc.status === 'active')
      .sort((a, b) => a.acquiredAt - b.acquiredAt)
      .map(clone)
  },

  async getByMydongUid(uid, mydongUid) {
    const doc = mydongs.get(mydongUid)
    return doc && doc.uid === uid ? clone(doc) : undefined
  },

  async getActiveByAidongId(uid, aidongId) {
    const doc = Array.from(mydongs.values()).find((entry) => (
      entry.uid === uid && entry.aidongId === aidongId && entry.status === 'active'
    ))
    return doc ? clone(doc) : undefined
  },

  async getOrCreateForAidong(uid, input) {
    return upsert(uid, input)
  },

  async seedFromAidongIds(uid, aidongIds, source: MydongAcquisitionSource = 'migration') {
    for (const aidongId of normalizeAidongIds(aidongIds)) {
      upsert(uid, { aidongId, acquisitionSource: source })
    }
    return this.list(uid)
  },

  async delete(uid) {
    let deleted = false
    for (const [mydongUid, doc] of mydongs.entries()) {
      if (doc.uid !== uid) continue
      mydongs.delete(mydongUid)
      deleted = true
    }
    return deleted
  },
}
