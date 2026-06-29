/**
 * packages/backend/src/repositories/diceResourceRepository.ts
 * ------------------------------------------------------------
 * 역할: 주사위 수량과 충전 메타데이터를 diceResources 문서로 관리한다.
 * 연결: HostStateRepository는 기존 응답 호환을 위해 diceCount mirror를 유지하되 실제 권위는 이 저장소를 사용한다.
 * 주의: 항해 세션 위치/현재 칸은 DB에 저장하지 않는다.
 */
import type { ClientSession } from 'mongoose'

export interface DiceResourceDoc {
  uid: string
  diceQuantity: number
  maxDiceQuantity: number
  chargeIntervalMinutes: number
  nextChargeAt?: number
  lastChargedAt?: number
  dailyRollCount: number
  dailyRollDate?: string
  lastServerRollId?: string
  createdAt: number
  updatedAt: number
}

export interface DiceResourceSeed {
  diceQuantity?: number
  maxDiceQuantity?: number
  chargeIntervalMinutes?: number
  nextChargeAt?: number
  lastChargedAt?: number
  dailyRollCount?: number
  dailyRollDate?: string
  lastServerRollId?: string
}

export interface DiceResourceRepository {
  getOrCreate(uid: string, seed?: DiceResourceSeed, session?: ClientSession): Promise<DiceResourceDoc>
  replaceDiceQuantity(uid: string, diceQuantity: number, session?: ClientSession): Promise<DiceResourceDoc>
  mutateDice(uid: string, delta: number, session?: ClientSession): Promise<DiceResourceDoc>
  patch(uid: string, patch: Partial<DiceResourceSeed>, session?: ClientSession): Promise<DiceResourceDoc>
  delete(uid: string, session?: ClientSession): Promise<boolean>
}

export function normalizeDiceQuantity(value: unknown, fallback = 6): number {
  const amount = Math.floor(Number(value))
  return Number.isFinite(amount) && amount >= 0 ? amount : fallback
}

export function createDefaultDiceResource(uid: string, seed: DiceResourceSeed = {}): DiceResourceDoc {
  const now = Date.now()
  return {
    uid,
    diceQuantity: normalizeDiceQuantity(seed.diceQuantity, 6),
    maxDiceQuantity: normalizeDiceQuantity(seed.maxDiceQuantity, 6),
    chargeIntervalMinutes: normalizeDiceQuantity(seed.chargeIntervalMinutes, 60),
    nextChargeAt: seed.nextChargeAt,
    lastChargedAt: seed.lastChargedAt,
    dailyRollCount: normalizeDiceQuantity(seed.dailyRollCount, 0),
    dailyRollDate: seed.dailyRollDate,
    lastServerRollId: seed.lastServerRollId,
    createdAt: now,
    updatedAt: now,
  }
}
