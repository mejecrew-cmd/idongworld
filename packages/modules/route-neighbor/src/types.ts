/**
 * 📁 route-neighbor/src/types.ts — 항해 보드 타입
 * ───────────────────────────────────────────────
 * 📌 역할: 30칸 보드 슬롯 정의·도착 처리 결과.
 */

/** 슬롯 종류. */
export type SlotType =
  | 'start'        // 출발·귀항
  | 'character'    // 캐릭터 영입 (gacha 풀 미영입 자동)
  | 'resource'     // 자원 (도토리·꽃 등) — host inventory 적립
  | 'treasure'     // 보물 — 코인·보석 적립
  | 'storm'        // 폭풍 — 다이스 -1 또는 deck-cargo 손실
  | 'cutscene'     // 컷신 발화 (cutscene-runner callSiteId)
  | 'empty'        // 그냥 통과

/** 한 슬롯 정의. */
export interface BoardSlot {
  /** 0~29 칸 인덱스. */
  index: number
  type: SlotType
  /** 표시명 (i18n 키 가능). */
  label: string
  /** 슬롯별 메타 (캐릭터 ID·자원 ID·룰 ID 등). */
  meta?: Record<string, string | number>
}

/** 도착 처리 결과 (UI·상태 업데이트 입력). */
export interface LandingResult {
  type: SlotType
  /** 적립한 자원 (host actions 호출 후). */
  rewards?: { resource: string; amount: number }[]
  /** 진입할 시나리오 또는 callSiteId (있으면 화면이 발화). */
  scenarioId?: string
  callSiteId?: string
  /** 다음 칸 자동 이동 보너스 (Phase 2). */
  bonusSteps?: number
}
