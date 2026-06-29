/**
 * packages/backend/src/repositories/mydongRepository.ts
 * ------------------------------------------------------------
 * 역할: 유저가 보유한 Aidong 개체를 mydongUid 기준 row 구조로 관리한다.
 * 연결: my-aidong module state의 recruitedAidongs 배열은 기존 API 호환 mirror로만 유지한다.
 * 주의: aidongId는 원형 캐릭터 ID, mydongUid는 유저가 보유한 개별 Aidong ID다.
 */
import type { ClientSession } from 'mongoose'

export type MydongStatus = 'active' | 'inactive' | 'released' | string
export type MydongAcquisitionSource = 'opening' | 'voyage-encounter' | 'gacha' | 'manual' | 'migration' | string

export interface MydongDoc {
  mydongUid: string
  uid: string
  aidongId: string
  nickname?: string
  acquiredAt: number
  acquisitionSource: MydongAcquisitionSource
  favoriteLevel: number
  status: MydongStatus
  createdAt: number
  updatedAt: number
}

export interface MydongCreateInput {
  aidongId: string
  nickname?: string
  acquisitionSource?: MydongAcquisitionSource
  acquiredAt?: number
}

export interface MydongRepository {
  list(uid: string, session?: ClientSession): Promise<MydongDoc[]>
  getByMydongUid(uid: string, mydongUid: string, session?: ClientSession): Promise<MydongDoc | undefined>
  getActiveByAidongId(uid: string, aidongId: string, session?: ClientSession): Promise<MydongDoc | undefined>
  getOrCreateForAidong(uid: string, input: MydongCreateInput, session?: ClientSession): Promise<MydongDoc>
  seedFromAidongIds(uid: string, aidongIds: string[], source?: MydongAcquisitionSource, session?: ClientSession): Promise<MydongDoc[]>
  delete(uid: string, session?: ClientSession): Promise<boolean>
}

export function normalizeAidongIds(aidongIds: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const aidongId of aidongIds) {
    if (!aidongId || seen.has(aidongId)) continue
    seen.add(aidongId)
    result.push(aidongId)
  }
  return result
}

export function legacyMydongUid(uid: string, aidongId: string): string {
  return `${uid}:${aidongId}`
}

export function createMydongDoc(uid: string, input: MydongCreateInput): MydongDoc {
  const now = input.acquiredAt ?? Date.now()
  return {
    mydongUid: legacyMydongUid(uid, input.aidongId),
    uid,
    aidongId: input.aidongId,
    nickname: input.nickname,
    acquiredAt: now,
    acquisitionSource: input.acquisitionSource ?? 'manual',
    favoriteLevel: 0,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }
}
