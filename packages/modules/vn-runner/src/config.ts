/**
 * 📁 vn-runner/src/config.ts — DI(의존성 주입) 훅 설정
 * ───────────────────────────────────────────────
 * 📌 역할: vn-runner 가 frontend·내부 시스템에 직접 import 하지 않고
 *           render 함수·trigger 핸들러·fetch 훅을 외부에서 주입받기.
 *           모듈 간 결합도를 manifest 레벨로 낮춤.
 *
 * 🔗 연결:
 *   - frontend bootstrap (main.tsx 또는 별도 vnBootstrap.ts) 에서 1회 configure() 호출
 *   - VNPlayer·trigger.ts 내부에서 getHooks() 로 조회
 *
 * 💡 초보자 안내:
 *   - configure() 는 보통 앱 시작 시 1회. HMR 시 덮어쓰기 가능.
 *   - 등록 전 VNPlayer 사용 시: 캐릭터는 placeholder, trigger 는 console.warn.
 *   - 사용 예 (frontend):
 *       import { configure } from '@idongworld/vn-runner'
 *       configure({
 *         renderCharacter: ({ id, expression, size }) =>
 *           <AidongSprite character={id} expression={expression} size={size} />,
 *         triggerHandlers: { ... },
 *       })
 */
import type { ReactElement } from 'react'
import type { Scenario } from './types.ts'

/** VNPlayer 가 캐릭터 자리에 렌더할 컴포넌트 prop 형태. */
export interface VNCharacterRenderProps {
  /** 캐릭터 ID — 보통 본진 5명 ID (한글). */
  id: string
  /** 표정 — vn-runner ExpressionId 와 호환. 미지정 시 'normal'. */
  expression?: string
  /** 픽셀 크기. 기본 360. */
  size?: number
}

/** trigger 핸들러 시그니처 — verb별 함수, payload 는 ':' 뒤 문자열. */
export type VNTriggerHandler = (payload: string) => void | Promise<void>

/** vn-runner DI 훅 묶음. */
export interface VNRunnerHooks {
  /**
   * 캐릭터 렌더 함수. 미설정 시 빈 자리 (placeholder).
   * frontend 에서 AidongSprite 또는 호환 컴포넌트를 주입.
   */
  renderCharacter?: (props: VNCharacterRenderProps) => ReactElement | null

  /**
   * 시나리오 fetch 훅. 미설정 시 기본 `/scenarios/{id}.json`.
   * 자산 풀 protected 분기·캐싱 등 커스터마이즈 시 사용.
   */
  fetchScenario?: (scenarioId: string) => Promise<Scenario>

  /**
   * trigger 핸들러 — verb 키 → 함수.
   * 예: { 'affinity_+1': (id) => store.addAffinity(id, 1) }
   * 'navigate' 는 vn-runner 내부 처리 (라우터/시나리오 분기).
   */
  triggerHandlers?: Record<string, VNTriggerHandler>

  /**
   * 사운드 재생 훅 — Phase 1.5+ Howler 통합 시 활용.
   * 미설정 시 no-op.
   */
  onPlaySfx?: (sfx: string) => void
}

let _hooks: VNRunnerHooks = {}

/**
 * 외부에서 vn-runner DI 훅 주입.
 * 부분 갱신 (병합) — 한 키만 바꿔도 기존 다른 키는 보존.
 */
export function configure(hooks: VNRunnerHooks): void {
  _hooks = {
    ..._hooks,
    ...hooks,
    triggerHandlers: { ..._hooks.triggerHandlers, ...hooks.triggerHandlers },
  }
}

/** 현재 설정된 훅 조회 (내부용). */
export function getHooks(): VNRunnerHooks {
  return _hooks
}

/**
 * 단일 trigger 핸들러 등록 — 모듈별로 자기 trigger 만 추가할 때 편의.
 * 사용 예: registerTriggerHandler('unlock_zone', (id) => store.unlockZone(id))
 */
export function registerTriggerHandler(verb: string, handler: VNTriggerHandler): void {
  if (!_hooks.triggerHandlers) _hooks.triggerHandlers = {}
  _hooks.triggerHandlers[verb] = handler
}

/** 테스트·HMR 용 초기화. */
export function _resetForTest(): void {
  _hooks = {}
}
