/**
 * packages/backend/src/repositories/currencyRepository.ts
 * ------------------------------------------------------------
 * 역할: coins/diamonds 같은 고정 재화를 xlsx 기준 balance/ledger 구조로 저장한다.
 * 연결: HostStateRepository는 기존 응답 호환을 위해 coins/diamonds mirror를 유지하되 실제 권위는 이 저장소를 사용한다.
 * 주의: diceCount는 5번 diceResources 단계에서 별도로 분리한다.
 */
import type { ClientSession } from 'mongoose'

export type CurrencyId = 'coin' | 'diamond' | string

export interface UserCurrencyBalanceDoc {
  id: string
  uid: string
  currencyId: CurrencyId
  balance: number
  createdAt: number
  updatedAt: number
}

export interface UserCurrencyLedgerDoc {
  id: string
  uid: string
  currencyId: CurrencyId
  delta: number
  balanceAfter: number
  reason: string
  source: 'game' | 'admin' | 'purchase' | 'migration' | 'system' | string
  requestId?: string
  createdAt: number
  createdBy?: string
}

export interface CurrencyBalances {
  coin: number
  diamond: number
  [currencyId: string]: number
}

export interface CurrencyMutationMeta {
  reason?: string
  source?: UserCurrencyLedgerDoc['source']
  requestId?: string
  createdBy?: string
}

export interface CurrencyRepository {
  getBalances(uid: string, seed?: Partial<CurrencyBalances>, session?: ClientSession): Promise<CurrencyBalances>
  replaceBalances(uid: string, balances: Partial<CurrencyBalances>, meta?: CurrencyMutationMeta, session?: ClientSession): Promise<CurrencyBalances>
  mutateCurrency(uid: string, currencyId: CurrencyId, delta: number, meta?: CurrencyMutationMeta, session?: ClientSession): Promise<CurrencyBalances>
  delete(uid: string, session?: ClientSession): Promise<boolean>
}

export function hostResourceToCurrencyId(resource: string): CurrencyId | undefined {
  if (resource === 'coins') return 'coin'
  if (resource === 'diamonds') return 'diamond'
  return undefined
}

export function currencyIdToHostResource(currencyId: string): 'coins' | 'diamonds' | undefined {
  if (currencyId === 'coin') return 'coins'
  if (currencyId === 'diamond') return 'diamonds'
  return undefined
}

export function currencyBalanceId(uid: string, currencyId: CurrencyId): string {
  return `${uid}:${currencyId}`
}

export function currencyLedgerId(uid: string, currencyId: CurrencyId, createdAt: number): string {
  return `${uid}:${currencyId}:${createdAt}:${Math.random().toString(36).slice(2, 10)}`
}

export function normalizeCurrencyAmount(value: unknown, fallback = 0): number {
  const amount = Math.floor(Number(value))
  return Number.isFinite(amount) && amount >= 0 ? amount : fallback
}
