/**
 * packages/backend/src/repositories/mongoDiceResourceRepository.ts
 * ------------------------------------------------------------
 * 역할: MongoDB 기반 dice resource repository 구현이다.
 */
import type { ClientSession } from 'mongoose'
import { DiceResourceModel } from '../models/DiceResourceModel.js'
import {
  createDefaultDiceResource,
  normalizeDiceQuantity,
  type DiceResourceDoc,
  type DiceResourceRepository,
  type DiceResourceSeed,
} from './diceResourceRepository.js'

function toDiceResourceDoc(doc: unknown): DiceResourceDoc {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  return plain as unknown as DiceResourceDoc
}

function normalizedPatch(patch: Partial<DiceResourceSeed>): Partial<DiceResourceDoc> {
  const next: Partial<DiceResourceDoc> = {}
  if (patch.diceQuantity !== undefined) next.diceQuantity = normalizeDiceQuantity(patch.diceQuantity)
  if (patch.maxDiceQuantity !== undefined) next.maxDiceQuantity = normalizeDiceQuantity(patch.maxDiceQuantity)
  if (patch.chargeIntervalMinutes !== undefined) next.chargeIntervalMinutes = normalizeDiceQuantity(patch.chargeIntervalMinutes)
  if (patch.nextChargeAt !== undefined) next.nextChargeAt = patch.nextChargeAt
  if (patch.lastChargedAt !== undefined) next.lastChargedAt = patch.lastChargedAt
  if (patch.dailyRollCount !== undefined) next.dailyRollCount = normalizeDiceQuantity(patch.dailyRollCount, 0)
  if (patch.dailyRollDate !== undefined) next.dailyRollDate = patch.dailyRollDate
  if (patch.lastServerRollId !== undefined) next.lastServerRollId = patch.lastServerRollId
  return next
}

export const mongoDiceResourceRepository: DiceResourceRepository = {
  async getOrCreate(uid, seed, session) {
    const doc = await DiceResourceModel.findOneAndUpdate(
      { uid },
      {
        $setOnInsert: createDefaultDiceResource(uid, seed),
      },
      { upsert: true, new: true, lean: true, session },
    )
    return toDiceResourceDoc(doc)
  },

  async replaceDiceQuantity(uid, diceQuantity, session) {
    const now = Date.now()
    const defaults = createDefaultDiceResource(uid, { diceQuantity })
    const doc = await DiceResourceModel.findOneAndUpdate(
      { uid },
      {
        $set: {
          diceQuantity: normalizeDiceQuantity(diceQuantity),
          updatedAt: now,
        },
        $setOnInsert: {
          uid: defaults.uid,
          maxDiceQuantity: defaults.maxDiceQuantity,
          chargeIntervalMinutes: defaults.chargeIntervalMinutes,
          dailyRollCount: defaults.dailyRollCount,
          createdAt: now,
        },
      },
      { upsert: true, new: true, lean: true, session },
    )
    return toDiceResourceDoc(doc)
  },

  async mutateDice(uid, delta, session) {
    const current = await this.getOrCreate(uid, undefined, session)
    const nextQuantity = current.diceQuantity + delta
    if (nextQuantity < 0) throw new Error('insufficient_host_resource')
    const now = Date.now()
    const doc = await DiceResourceModel.findOneAndUpdate(
      { uid },
      {
        $set: {
          diceQuantity: nextQuantity,
          updatedAt: now,
        },
        $inc: {
          dailyRollCount: delta < 0 ? Math.abs(delta) : 0,
        },
      },
      { new: true, lean: true, session },
    )
    if (!doc) throw new Error('dice_resource_not_found')
    return toDiceResourceDoc(doc)
  },

  async patch(uid, patch, session) {
    await this.getOrCreate(uid, patch, session)
    const doc = await DiceResourceModel.findOneAndUpdate(
      { uid },
      {
        $set: {
          ...normalizedPatch(patch),
          updatedAt: Date.now(),
        },
      },
      { new: true, lean: true, session },
    )
    if (!doc) throw new Error('dice_resource_not_found')
    return toDiceResourceDoc(doc)
  },

  async delete(uid, session?: ClientSession) {
    const result = await DiceResourceModel.deleteOne({ uid }).session(session ?? null)
    return result.deletedCount > 0
  },
}
