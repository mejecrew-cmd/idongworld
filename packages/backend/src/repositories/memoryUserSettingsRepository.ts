/**
 * packages/backend/src/repositories/memoryUserSettingsRepository.ts
 * ------------------------------------------------------------
 * 역할: 개발/테스트용 in-memory userSettings repository다.
 */
import {
  buildDefaultUserSettings,
  type UserSettingsDoc,
  type UserSettingsPatch,
  type UserSettingsRepository,
} from './userSettingsRepository.js'
import type { UserDoc } from '../store/memoryStore.js'

const settings = new Map<string, UserSettingsDoc>()

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export const memoryUserSettingsRepository: UserSettingsRepository = {
  async getOrCreate(uid, seed?: Partial<UserDoc>) {
    const existing = settings.get(uid)
    if (existing) return clone(existing)
    const created = buildDefaultUserSettings(uid, seed)
    settings.set(uid, created)
    return clone(created)
  },

  async patch(uid, patch: UserSettingsPatch) {
    const existing = settings.get(uid) ?? buildDefaultUserSettings(uid)
    const next = {
      ...existing,
      ...patch,
      uid,
      updatedAt: Date.now(),
    }
    settings.set(uid, next)
    return clone(next)
  },

  async delete(uid) {
    return settings.delete(uid)
  },
}
