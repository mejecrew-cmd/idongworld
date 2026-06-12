/**
 * 📁 customs/src/types.ts — 세관 자원 변환 타입
 * ───────────────────────────────────────────────
 * 📌 역할: 룰·신고·결과의 타입 정의.
 *
 * 💡 개념:
 *   - Rule: "X 모듈의 자원 a 1개 → Y 자원 N개" 변환 정의
 *   - Declaration: 사용자가 신고한 변환 의향 (룰 + 수량)
 *   - SimulationResult: 신고를 적용했을 때 결과 미리보기 (UI 확인용)
 *   - apply: simulate 통과 + 사용자 확인(UI) 후 실 자원 이동 (debit·credit)
 *
 * 💡 예시 룰 (도토리볕 → 항해보드):
 *   {
 *     ruleId: 'oakgarden->voyage-deck',
 *     fromModule: 'zone-oakgarden', fromResource: 'acorn',
 *     toScope: 'module', toModule: 'route-neighbor', toResource: 'deck-cargo',
 *     ratio: 5,    // 5 acorn = 1 deck-cargo
 *     uiConfirmRequired: true,
 *     label: '도토리 → 갑판 적재',
 *   }
 */

/** 변환 결과의 도착 범위. */
export type CustomsToScope = 'global' | 'module'

/** 한 변환 룰. */
export interface CustomsRule {
  /** 룰 ID. 모듈 prefix 권장 (예: 'oakgarden->voyage-deck'). */
  ruleId: string

  /** 출발 자원 (어느 모듈의 어떤 키). */
  fromModule: string
  fromResource: string

  /** 도착 범위 — 글로벌 자원 풀 vs 다른 모듈. */
  toScope: CustomsToScope
  /** toScope === 'module' 시 도착 모듈 ID. */
  toModule?: string
  toResource: string

  /**
   * 변환 비율 — fromResource N 개 = toResource 1 개.
   * 정수 권장 (소수 사용 시 잔량 처리 정책 별도).
   */
  ratio: number

  /** UI 확인 필요 (헌법 §3.2). 기본 true. */
  uiConfirmRequired?: boolean

  /** 사용자 표시명 (모달·로그). */
  label: string

  /** 1회 변환 최소·최대 수량. */
  minAmount?: number
  maxAmount?: number

  /** 디버그·검수용 메모. */
  description?: string
}

/** 사용자(또는 모듈)이 신고한 변환 의향. */
export interface CustomsDeclaration {
  ruleId: string
  /** 출발 자원 수량. */
  amount: number
}

/** simulate 결과 — apply 전 UI 미리보기. */
export interface CustomsSimulation {
  rule: CustomsRule
  fromAmount: number      // 입력 수량 (잘림 후)
  toAmount: number        // 도착 수량
  remainder: number       // 변환되지 않은 잔량 (출발 자원 측)
  feasible: boolean       // min/max 한계·잔량 정책 통과 여부
  reason?: string         // 불가 사유
}

/** apply 결과. */
export interface CustomsApplyResult extends CustomsSimulation {
  applied: boolean        // 실 적용 여부 (사용자 거절·hooks 미주입 시 false)
  rejectedReason?: string
}
