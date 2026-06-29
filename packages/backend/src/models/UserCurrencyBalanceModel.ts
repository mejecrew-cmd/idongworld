/**
 * packages/backend/src/models/UserCurrencyBalanceModel.ts
 * ------------------------------------------------------------
 * 역할: 유저별 재화 잔액을 currencyId 단위 row로 저장한다.
 */
import mongoose, { Schema } from 'mongoose'
import type { UserCurrencyBalanceDoc } from '../repositories/currencyRepository.js'

const UserCurrencyBalanceSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    uid: { type: String, required: true, index: true },
    currencyId: { type: String, required: true, index: true },
    balance: { type: Number, required: true, default: 0 },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  {
    collection: 'userCurrencyBalances',
    minimize: false,
    versionKey: false,
  },
)

UserCurrencyBalanceSchema.index({ uid: 1, currencyId: 1 }, { unique: true })

export const UserCurrencyBalanceModel =
  mongoose.models.UserCurrencyBalance
    ?? mongoose.model<UserCurrencyBalanceDoc>('UserCurrencyBalance', UserCurrencyBalanceSchema)
