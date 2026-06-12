/**
 * 📁 my-island/src/types.ts — 마이섬 타입
 * ───────────────────────────────────────────────
 * 📌 역할: zone 해금 state·튜토리얼·구역 클리어 카운트 shape.
 *           zone 해금 정책 2-gate (build phase + unlock_condition).
 *
 * 💡 unlock_condition DSL:
 *   - 'always'                       — 항상 노출
 *   - 'tutorial_complete'            — 튜토리얼 완료 후
 *   - 'prev_zone_clear:garden'       — 이전 zone 클리어 후
 *   - 'recruited_count_ge:3'         — 영입 N명 이상
 *   - 'season:summer-2026'           — 시즌 활성 시
 *   - 'update:v0_2'                  — 특정 업데이트 도달 시
 *   - 'and:cond1;cond2'              — AND 합성 (예: 'and:tutorial_complete;recruited_count_ge:2')
 */

/** 빌드·업데이트 phase 컨텍스트 (Gate A 평가용). */
export interface BuildPhaseContext {
  /** 현재 빌드 phase (1·1.5·2·...). */
  buildPhase: number
  /** 현재 빌드 update ID (시즌·패치). */
  updateId: string
  /** 현재 활성 시즌 (있을 경우). */
  activeSeason?: string
}

/** 사용자 진행 컨텍스트 (Gate B 평가용). */
export interface UserProgressContext {
  tutorialComplete: boolean
  recruitedCount: number
  clearedZones: string[]      // zone ID 배열
  unlockedZones: string[]     // 명시적으로 해금된 zone (이벤트·BM)
}

/** zone 정책 (각 zone manifest·balance.csv 에서 추출). */
export interface ZonePolicy {
  zoneId: string
  /** Gate A. */
  unlockPhase: number
  requiredUpdate?: string
  active: boolean
  /** Gate B DSL. */
  unlockCondition: string
}

/** unlock 평가 결과. */
export interface ZoneUnlockResult {
  zoneId: string
  unlocked: boolean
  failedGate?: 'A' | 'B' | 'inactive'
  reason?: string
}
