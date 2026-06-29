/**
 * packages/backend/src/models/UserCurrencyLedgerModel.ts
 * ------------------------------------------------------------
 * 역할: 유저 재화 증감 이력을 남긴다.
 */
import mongoose, { Schema } from 'mongoose'
import type { UserCurrencyLedgerDoc } from '../repositories/currencyRepository.js'

const UserCurrencyLedgerSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    uid: { type: String, required: true, index: true },
    currencyId: { type: String, required: true, index: true },
    delta: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: { type: String, required: true },
    source: { type: String, required: true },
    requestId: String,
    createdAt: { type: Number, required: true },
    createdBy: String,
  },
  {
    collection: 'userCurrencyLedger',
    minimize: false,
    versionKey: false,
  },
)

UserCurrencyLedgerSchema.index({ uid: 1, createdAt: -1 })
UserCurrencyLedgerSchema.index({ uid: 1, currencyId: 1, createdAt: -1 })

export const UserCurrencyLedgerModel =
  mongoose.models.UserCurrencyLedger
    ?? mongoose.model<UserCurrencyLedgerDoc>('UserCurrencyLedger', UserCurrencyLedgerSchema)
