/**
 * packages/backend/src/repositories/memoryDiceResourceRepository.ts
 * ------------------------------------------------------------
 * 역할: 개발/테스트용 in-memory dice resource repository 구현이다.
 */
import {
  createDefaultDiceResource,
  normalizeDiceQuantity,
  type DiceResourceDoc,
  type DiceResourceRepository,
  type DiceResourceSeed,
} from './diceResourceRepository.js'

const diceResources = new Map<string, DiceResourceDoc>()

function clone(value: DiceResourceDoc): DiceResourceDoc {
  return { ...value }
}

export const memoryDiceResourceRepository: DiceResourceRepository = {
  async getOrCreate(uid, seed) {
    const existing = diceResources.get(uid)
    if (existing) return clone(existing)
    const created = createDefaultDiceResource(uid, seed)
    diceResources.set(uid, created)
    return clone(created)
  },

  async replaceDiceQuantity(uid, diceQuantity) {
    const current = await this.getOrCreate(uid)
    const next = {
      ...current,
      diceQuantity: normalizeDiceQuantity(diceQuantity, current.diceQuantity),
      updatedAt: Date.now(),
    }
    diceResources.set(uid, next)
    return clone(next)
  },

  async mutateDice(uid, delta) {
    const current = await this.getOrCreate(uid)
    const nextQuantity = current.diceQuantity + delta
    if (nextQuantity < 0) throw new Error('insufficient_host_resource')
    const next = {
      ...current,
      diceQuantity: nextQuantity,
      dailyRollCount: delta < 0 ? current.dailyRollCount + Math.abs(delta) : current.dailyRollCount,
      updatedAt: Date.now(),
    }
    diceResources.set(uid, next)
    return clone(next)
  },

  async patch(uid, patch: Partial<DiceResourceSeed>) {
    const current = await this.getOrCreate(uid)
    const next = {
      ...current,
      ...patch,
      diceQuantity: patch.diceQuantity !== undefined
        ? normalizeDiceQuantity(patch.diceQuantity, current.diceQuantity)
        : current.diceQuantity,
      maxDiceQuantity: patch.maxDiceQuantity !== undefined
        ? normalizeDiceQuantity(patch.maxDiceQuantity, current.maxDiceQuantity)
        : current.maxDiceQuantity,
      chargeIntervalMinutes: patch.chargeIntervalMinutes !== undefined
        ? normalizeDiceQuantity(patch.chargeIntervalMinutes, current.chargeIntervalMinutes)
        : current.chargeIntervalMinutes,
      dailyRollCount: patch.dailyRollCount !== undefined
        ? normalizeDiceQuantity(patch.dailyRollCount, current.dailyRollCount)
        : current.dailyRollCount,
      updatedAt: Date.now(),
    }
    diceResources.set(uid, next)
    return clone(next)
  },

  async delete(uid) {
    return diceResources.delete(uid)
  },
}
