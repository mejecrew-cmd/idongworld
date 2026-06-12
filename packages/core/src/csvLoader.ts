/**
 * 📁 core/csvLoader.ts — balance·customs CSV 파서
 * ───────────────────────────────────────────────
 * 📌 역할: 모듈의 balance.csv·customs.csv 를 빌드 시점에 import (?raw) 하여 파싱.
 *           결과: Record<paramId, value> + getter 헬퍼.
 *
 * 🔗 연결:
 *   - 각 모듈의 balance/index.ts 가 본 파서 사용
 *   - Vite ?raw import: `import csvText from '../balance.csv?raw'`
 *
 * 💡 형식 (balance.csv):
 *   # 주석
 *   paramId,value,type,description,phase
 *   initial_coins,100,number,...,Phase 1
 *
 * 💡 type 자동 변환:
 *   - 'number'  → Number(value)
 *   - 'boolean' → 'true'/'1' → true
 *   - 그 외     → string 그대로
 */

export type BalanceValue = number | string | boolean
export type BalanceMap = Record<string, BalanceValue>

interface BalanceRow {
  paramId: string
  value: string
  type?: string
  description?: string
  phase?: string
}

/**
 * CSV 텍스트 → BalanceRow 배열.
 * 주석 (#) 줄 무시·빈 줄 무시·헤더 자동.
 */
function parseRows(csvText: string): BalanceRow[] {
  const lines = csvText.split(/\r?\n/)
  if (!lines.length) return []
  // 첫 비주석·비빈 줄을 헤더로
  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim()
    if (!line || line.startsWith('#')) continue
    headerIdx = i
    break
  }
  if (headerIdx < 0) return []
  const headers = lines[headerIdx]!.split(',').map((s) => s.trim())
  const rows: BalanceRow[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]!.trim()
    if (!line || line.startsWith('#')) continue
    const cols = lines[i]!.split(',').map((s) => s.trim())
    const rec: Record<string, string> = {}
    headers.forEach((h, j) => { rec[h] = cols[j] ?? '' })
    if (!rec.paramId) continue
    rows.push(rec as unknown as BalanceRow)
  }
  return rows
}

/**
 * type 컬럼 기준으로 값을 변환.
 */
function coerce(value: string, type?: string): BalanceValue {
  switch ((type ?? 'string').toLowerCase()) {
    case 'number': {
      const n = Number(value)
      return Number.isFinite(n) ? n : 0
    }
    case 'boolean':
      return value === 'true' || value === '1' || value === 'yes'
    default:
      return value
  }
}

/**
 * balance.csv 텍스트 → { paramId: value } 맵.
 */
export function parseBalanceCsv(csvText: string): BalanceMap {
  const out: BalanceMap = {}
  for (const row of parseRows(csvText)) {
    out[row.paramId] = coerce(row.value, row.type)
  }
  return out
}

/**
 * BalanceMap getter — 타입 안전 fallback.
 *
 * @example
 *   const coins = getBalanceValue(host_balance, 'initial_coins', 100)
 */
export function getBalanceValue<T extends BalanceValue>(
  map: BalanceMap,
  paramId: string,
  fallback: T,
): T {
  const v = map[paramId]
  if (v === undefined) return fallback
  // 호출자가 expect 한 타입으로 narrowing — 실 타입 불일치 시 fallback (안전)
  if (typeof v === typeof fallback) return v as T
  return fallback
}

/**
 * 모듈 balance 묶음 — 각 모듈의 balance.ts boilerplate 단일 헬퍼로 통합.
 *
 * @example (모듈 balance.ts)
 *   /// <reference path="./csv.d.ts" />
 *   import csv from '../balance.csv?raw'
 *   import { createBalance } from '@idongworld/core'
 *   export const balance = createBalance(csv)
 *   // balance.map · balance.get · balance.getNumber · balance.getString · balance.getBoolean
 */
export interface BalanceAccessor {
  /** 파싱된 raw map. */
  map: BalanceMap
  /** 타입 추론 + fallback (getBalanceValue 와 동일 시그니처). */
  get<T extends BalanceValue>(paramId: string, fallback: T): T
  /** number 전용 단축. */
  getNumber(paramId: string, fallback?: number): number
  /** string 전용 단축. */
  getString(paramId: string, fallback?: string): string
  /** boolean 전용 단축. */
  getBoolean(paramId: string, fallback?: boolean): boolean
}

/** csv 텍스트 → BalanceAccessor 묶음. 각 모듈 balance.ts 한 줄로 통합. */
export function createBalance(csvText: string): BalanceAccessor {
  const map = parseBalanceCsv(csvText)
  return {
    map,
    get(paramId, fallback) { return getBalanceValue(map, paramId, fallback) },
    getNumber(paramId, fallback = 0) { return getBalanceValue(map, paramId, fallback) },
    getString(paramId, fallback = '') { return getBalanceValue(map, paramId, fallback) },
    getBoolean(paramId, fallback = false) { return getBalanceValue(map, paramId, fallback) },
  }
}
