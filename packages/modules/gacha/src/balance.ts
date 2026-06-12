/// <reference path="./csv.d.ts" />
/**
 * 📁 gacha/src/balance.ts — gacha 모듈 밸런스 (createBalance helper)
 * ───────────────────────────────────────────────
 * 📌 역할: balance.csv (?raw) → BalanceAccessor (map·get·getNumber·getString·getBoolean).
 *           core/csvLoader 통합 helper 사용 (boilerplate 제거).
 *
 * 🔗 ../balance.csv  (PM 편집·하드코딩 X) · @idongworld/core createBalance
 *
 * 사용 예:
 *   import { balance } from './balance.ts'
 *   const n = balance.getNumber('initial_coins', 100)
 */
import balanceCsv from '../balance.csv?raw'
import { createBalance } from '@idongworld/core'

export const balance = createBalance(balanceCsv)

/** 일반 조회 — paramId 직접 (typed fallback). */
export function getBalance<T extends Parameters<typeof balance.get>[1]>(paramId: string, fallback: T): T {
  return balance.get(paramId, fallback) as T
}
