/**
 * packages/backend/src/repositories/memoryCurrencyRepository.ts
 * ------------------------------------------------------------
 * 역할: 개발/테스트용 in-memory currency repository 구현이다.
 */
import {
  currencyLedgerId,
  normalizeCurrencyAmount,
  type CurrencyBalances,
  type CurrencyMutationMeta,
  type CurrencyRepository,
  type UserCurrencyLedgerDoc,
} from './currencyRepository.js'

const balances = new Map<string, CurrencyBalances>()
const ledger: UserCurrencyLedgerDoc[] = []

function clone(value: CurrencyBalances): CurrencyBalances {
  return { ...value }
}

function defaults(seed?: Partial<CurrencyBalances>): CurrencyBalances {
  return {
    coin: normalizeCurrencyAmount(seed?.coin, 100),
    diamond: normalizeCurrencyAmount(seed?.diamond, 0),
  }
}

function writeLedger(uid: string, currencyId: string, delta: number, balanceAfter: number, meta?: CurrencyMutationMeta) {
  if (delta === 0) return
  const createdAt = Date.now()
  ledger.unshift({
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
  })
}

export const memoryCurrencyRepository: CurrencyRepository = {
  async getBalances(uid, seed) {
    const existing = balances.get(uid)
    if (existing) return clone(existing)
    const created = defaults(seed)
    balances.set(uid, created)
    return clone(created)
  },

  async replaceBalances(uid, nextBalances, meta) {
    const current = await this.getBalances(uid)
    const next = {
      ...current,
      ...Object.fromEntries(
        Object.entries(nextBalances)
          .filter(([, amount]) => amount !== undefined)
          .map(([currencyId, amount]) => [
            currencyId,
            normalizeCurrencyAmount(amount),
          ]),
      ),
    }
    for (const [currencyId, amount] of Object.entries(next)) {
      const delta = amount - (current[currencyId] ?? 0)
      writeLedger(uid, currencyId, delta, amount, meta ?? { source: 'migration', reason: 'replace_balance' })
    }
    balances.set(uid, next)
    return clone(next)
  },

  async mutateCurrency(uid, currencyId, delta, meta) {
    const current = await this.getBalances(uid)
    const nextAmount = (current[currencyId] ?? 0) + delta
    if (nextAmount < 0) throw new Error('insufficient_host_resource')
    const next = { ...current, [currencyId]: nextAmount }
    writeLedger(uid, currencyId, delta, nextAmount, meta)
    balances.set(uid, next)
    return clone(next)
  },

  async delete(uid) {
    return balances.delete(uid)
  },
}
