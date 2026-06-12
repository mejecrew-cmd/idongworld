/**
 * 📁 gacha/src/types.ts — 가챠 타입 정의
 * ───────────────────────────────────────────────
 * 📌 역할: 가챠 풀·결과·확률 가중치 타입.
 * 🔗 연결: pools.ts (FIRST_GACHA_POOL) · pick.ts (pick 함수) · config.ts
 *
 * 💡 초보자 안내:
 *   - GachaEntry: 풀의 한 항목 (캐릭터 ID + 시나리오 ID + 가중치)
 *   - GachaPool: 항목 배열
 *   - GachaResult: 픽 결과 (어떤 캐릭터, 시나리오 ID 무엇)
 *   - 1주차 균등 1/5 = 모든 weight = 1
 *   - Phase 2: 5성 1% / 4성 10% 등 가중치로 표현
 */

/** 한 풀 항목. */
export interface GachaEntry {
  /** 캐릭터 ID (한글). 예: '황금멍'. */
  characterId: string
  /** 시나리오 영문 ID. 예: 'hwanggumeong' (recruit_hwanggumeong·settle_hwanggumeong 으로 사용). */
  scenarioId: string
  /** 픽 가중치. 기본 1. 합산 후 비례 확률. */
  weight?: number
}

/** 한 가챠 풀 = 항목 배열 + 옵션 메타. */
export interface GachaPool {
  /** 풀 식별자. 예: 'first-meeting'·'season-1'. */
  id: string
  /** 사용자 표시명. */
  name: string
  /** 항목 배열. */
  entries: GachaEntry[]
}

/** 픽 1회 결과. */
export interface GachaResult {
  /** 뽑힌 캐릭터 ID. */
  characterId: string
  /** 해당 시나리오 영문 ID. */
  scenarioId: string
  /** 풀 식별자 (디버그·로그용). */
  poolId: string
}
