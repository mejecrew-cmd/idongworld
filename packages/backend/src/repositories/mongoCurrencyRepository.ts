/**
 * packages/backend/src/repositories/mongoCurrencyRepository.ts
 * ------------------------------------------------------------
 * 역할: MongoDB 기반 currency balance/ledger repository 구현이다.
 */
import type { ClientSession } from 'mongoose'
import { UserCurrencyBalanceModel } from '../models/UserCurrencyBalanceModel.js'
import { UserCurrencyLedgerModel } from '../models/UserCurrencyLedgerModel.js'
import {
  currencyBalanceId,
  currencyLedgerId,
  normalizeCurrencyAmount,
  type CurrencyBalances,
  type CurrencyId,
  type CurrencyMutationMeta,
  type CurrencyRepository,
} from './currencyRepository.js'

function docsToBalances(docs: Array<{ currencyId: string; balance: number }>): CurrencyBalances {
  const balances: CurrencyBalances = { coin: 0, diamond: 0 }
  for (const doc of docs) {
    balances[doc.currencyId as CurrencyId] = normalizeCurrencyAmount(doc.balance)
  }
  return balances
}

function normalizeSeed(seed?: Partial<CurrencyBalances>): CurrencyBalances {
  return {
    coin: normalizeCurrencyAmount(seed?.coin, 100),
    diamond: normalizeCurrencyAmount(seed?.diamond, 0),
  }
}

async function seedBalancesIfMissing(uid: string, seed?: Partial<CurrencyBalances>, session?: ClientSession) {
  const existingCount = await UserCurrencyBalanceModel.countDocuments({ uid }).session(session ?? null)
  if (existingCount > 0) return
  const now = Date.now()
  const defaults = normalizeSeed(seed)
  await UserCurrencyBalanceModel.bulkWrite(
    Object.entries(defaults).map(([currencyId, balance]) => ({
      updateOne: {
        filter: { uid, currencyId },
        update: {
          $setOnInsert: {
            id: currencyBalanceId(uid, currencyId),
            uid,
            currencyId,
            balance,
            createdAt: now,
          },
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

async function writeLedger(
  uid: string,
  currencyId: CurrencyId,
  delta: number,
  balanceAfter: number,
  meta?: CurrencyMutationMeta,
  session?: ClientSession,
) {
  if (delta === 0) return
  const createdAt = Date.now()
  await UserCurrencyLedgerModel.create([{
    id: currencyLedgerId(uid, currencyId, createdAt),
    uid,
    currencyId,
    delta,
    balanceAfter,
    reason: meta?.reason ?? 'currency_mutation',
    source: meta?.source ?? 'system',
    requestId: meta?.requestId,
    createdAt,
    createdBy: meta?.createdBy,
  }], { session })
}

export const mongoCurrencyRepository: CurrencyRepository = {
  async getBalances(uid, seed, session) {
    await seedBalancesIfMissing(uid, seed, session)
    const docs = await UserCurrencyBalanceModel.find({ uid }).session(session ?? null).lean()
    return docsToBalances(docs as unknown as Array<{ currencyId: string; balance: number }>)
  },

  async replaceBalances(uid, nextBalances, meta, session) {
    const current = await this.getBalances(uid, undefined, session)
    const normalizedEntries = Object.entries(nextBalances)
      .filter(([, amount]) => amount !== undefined)
      .map(([currencyId, amount]) => [
        currencyId as CurrencyId,
        normalizeCurrencyAmount(amount),
      ] as const)
    const now = Date.now()
    for (const [currencyId, balance] of normalizedEntries) {
      await UserCurrencyBalanceModel.findOneAndUpdate(
        { uid, currencyId },
        {
          $set: {
            balance,
            updatedAt: now,
          },
          $setOnInsert: {
            id: currencyBalanceId(uid, currencyId),
            uid,
            currencyId,
            createdAt: now,
          },
        },
        { upsert: true, new: true, session },
      )
      await writeLedger(
        uid,
        currencyId,
        balance - (current[currencyId] ?? 0),
        balance,
        meta ?? { source: 'migration', reason: 'replace_balance' },
        session,
      )
    }
    return this.getBalances(uid, undefined, session)
  },

  async mutateCurrency(uid, currencyId, delta, meta, session) {
    const current = await this.getBalances(uid, undefined, session)
    const nextAmount = (current[currencyId] ?? 0) + delta
    if (nextAmount < 0) throw new Error('insufficient_host_resource')
    const now = Date.now()
    await UserCurrencyBalanceModel.findOneAndUpdate(
      { uid, currencyId },
      {
        $set: {
          balance: nextAmount,
          updatedAt: now,
        },
        $setOnInsert: {
          id: currencyBalanceId(uid, currencyId),
          uid,
          currencyId,
          createdAt: now,
        },
      },
      { upsert: true, new: true, session },
    )
    await writeLedger(uid, currencyId, delta, nextAmount, meta, session)
    return this.getBalances(uid, undefined, session)
  },

  async delete(uid, session) {
    const [balancesResult] = await Promise.all([
      UserCurrencyBalanceModel.deleteMany({ uid }).session(session ?? null),
      UserCurrencyLedgerModel.deleteMany({ uid }).session(session ?? null),
    ])
    return balancesResult.deletedCount > 0
  },
}
