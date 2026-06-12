/**
 * 📁 host/src/types.ts — host 광역 모듈 타입
 * ───────────────────────────────────────────────
 * 📌 역할: 글로벌 자원·재화·인벤토리 shape 정의.
 *           frontend userStore 와 정합 — 동일 키 사용.
 *
 * 💡 키 컨벤션:
 *   - coins:     게임 내 일반 재화 (가챠 X·구매 OK)
 *   - gems:      소프트 재화 (친밀도·하트)
 *   - diamonds:  하드 재화 (BM·결제) — Phase 2
 *   - diceCount: 항해 보드 주사위 잔량
 *   - inventory: 자재 ID → 개수 (basic_food·rest_token·memory_piece·ore·basic_water·basic_wood·flower)
 */

/** 자재 ID 카탈로그 (data/materials.ts 와 정합). */
export type MaterialId =
  | 'basic_food'
  | 'rest_token'
  | 'memory_piece'
  | 'ore'
  | 'basic_water'
  | 'basic_wood'
  | 'flower'

/** host 가 소유하는 자원 묶음. */
export interface HostResources {
  coins: number
  gems: number
  diamonds: number
  diceCount: number
  inventory: Partial<Record<MaterialId, number>>
}

/** 자원 변경 결과. false 시 변경 미적용 (보유 부족 등). */
export type HostMutateResult = boolean
