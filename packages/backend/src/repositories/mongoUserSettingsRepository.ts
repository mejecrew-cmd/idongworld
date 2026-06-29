/**
 * packages/backend/src/repositories/mongoUserSettingsRepository.ts
 * ------------------------------------------------------------
 * 역할: MongoDB 기반 userSettings repository 구현이다.
 */
import { UserSettingsModel } from '../models/UserSettingsModel.js'
import type { UserDoc } from '../store/memoryStore.js'
import {
  buildDefaultUserSettings,
  type UserSettingsDoc,
  type UserSettingsPatch,
  type UserSettingsRepository,
} from './userSettingsRepository.js'

function toUserSettingsDoc(doc: unknown): UserSettingsDoc {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  return plain as unknown as UserSettingsDoc
}

export const mongoUserSettingsRepository: UserSettingsRepository = {
  async getOrCreate(uid, seed?: Partial<UserDoc>) {
    const existing = await UserSettingsModel.findOne({ uid }).lean()
    if (existing) return toUserSettingsDoc(existing)
    const defaults = buildDefaultUserSettings(uid, seed)
    const doc = await UserSettingsModel.findOneAndUpdate(
      { uid },
      { $setOnInsert: defaults },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean()
    return toUserSettingsDoc(doc)
  },

  async patch(uid, patch: UserSettingsPatch) {
    const now = Date.now()
    const doc = await UserSettingsModel.findOneAndUpdate(
      { uid },
      {
        $set: {
          ...patch,
          uid,
          updatedAt: now,
        },
        $setOnInsert: {
          ...buildDefaultUserSettings(uid),
          createdAt: now,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean()
    return toUserSettingsDoc(doc)
  },

  async delete(uid) {
    const result = await UserSettingsModel.deleteOne({ uid })
    return result.deletedCount > 0
  },
}
