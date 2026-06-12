/**
 * 📁 cutscene-runner/src/types.ts — 컷신 디스패처 타입
 * ───────────────────────────────────────────────
 * 📌 역할: callSiteId → 시나리오 매핑·조건부 발화의 타입 정의.
 *
 * 💡 callSiteId 컨벤션 (도메인:이벤트 또는 도메인:이벤트:파라미터):
 *   - 'after-recruit'                — 영입 직후 정착 컷
 *   - 'island-first-visit'           — 마이섬 첫 진입 환영
 *   - 'affinity-50:황금멍'           — 친밀도 50 도달 트리거
 *   - 'season-start:summer-2026'     — 시즌 시작
 *   - 'zone-unlock:garden'           — 구역 해금
 *
 * 💡 헌법 §3.2 예외 (하드코딩):
 *   - 'opening:*'    — 오프닝 4단계 (FullScreenLayout)
 *   - 'tutorial:*'   — 튜토리얼 청소 루프
 *   → 본 모듈을 통하지 않고 화면 자체가 직접 vn-runner 호출.
 */
import type { VNContext } from '@idongworld/vn-runner'

/** 한 호출 지점에 등록된 컷신 정의. */
export interface CutsceneRegistration {
  /** 호출 지점 ID — 도메인:이벤트(:파라미터). */
  callSiteId: string

  /** 재생할 시나리오 ID (vn-runner 가 fetch). */
  scenarioId: string

  /**
   * 발화 조건 — 미지정 시 항상 발화.
   * 사용자 상태(추가 게이트)는 frontend 가 configure() 로 주입한 shouldFire 와 함께 평가.
   */
  condition?: () => boolean

  /** 1회만 발화 (이미 본 컷신 재발화 방지). */
  oncePerUser?: boolean

  /** 우선순위 — 같은 callSiteId 다중 등록 시 큰 값이 먼저. */
  priority?: number

  /** 이 컷신 종료 후 다음 callSiteId (체이닝). */
  next?: string

  /** vn-runner 에 전달할 templating context (선택). */
  context?: VNContext

  /** 디버그·로그용 메모. */
  description?: string
}

/** registry.findFor 가 반환하는 추가 메타. */
export interface CutsceneLookupResult {
  registration: CutsceneRegistration
  /** 본 발화 후 자동 등록될 watched marker key (oncePerUser 시). */
  watchedKey?: string
}
