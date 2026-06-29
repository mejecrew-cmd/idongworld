/**
 * packages/backend/src/models/DiceResourceModel.ts
 * ------------------------------------------------------------
 * 역할: diceResources collection의 schema와 document 타입을 정의한다.
 */
import mongoose, { Schema } from 'mongoose'
import type { DiceResourceDoc } from '../repositories/diceResourceRepository.js'

const DiceResourceSchema = new Schema<DiceResourceDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    diceQuantity: { type: Number, required: true, default: 6 },
    maxDiceQuantity: { type: Number, required: true, default: 6 },
    chargeIntervalMinutes: { type: Number, required: true, default: 60 },
    nextChargeAt: Number,
    lastChargedAt: Number,
    dailyRollCount: { type: Number, required: true, default: 0 },
    dailyRollDate: String,
    lastServerRollId: String,
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'diceResources',
    minimize: false,
    versionKey: false,
  },
)

export const DiceResourceModel =
  mongoose.models.DiceResource ?? mongoose.model<DiceResourceDoc>('DiceResource', DiceResourceSchema)
