/**
 * 📁 vn-runner/src/types.ts — 비주얼노벨(VN) 시나리오 JSON 타입
 * ───────────────────────────────────────────────
 * 📌 역할: VN Runner가 읽는 시나리오 JSON의 TypeScript 타입 정의.
 *           기획 SoT(매뉴얼/시스템/S09_VN_Runner.md)와 1:1 정합.
 *
 * 🔗 연결:
 *   - template.ts → 동적 변수 치환 시 이 타입 사용
 *   - trigger.ts → trigger 처리
 *   - VNPlayer.tsx → 시나리오 로드·재생 시 사용
 *   - 시나리오 JSON: 기획/시나리오/*.json (recruit·settle·diary·cutscene)
 *
 * 💡 초보자 안내:
 *   - Scenario: 시나리오 1편 전체 (제목·시작 scene·scene 모음)
 *   - Scene: 한 컷 (배경·BGM·캐릭터·텍스트·선택지·다음 scene 지정)
 *   - SceneText: 화자 + 줄(line) 배열 (탭으로 한 줄씩 진행)
 *   - SceneChoice: 분기 선택지 (next로 다음 scene 지정 + trigger로 효과 적용)
 *   - 특수 토큰:
 *     · `__END__`: 시나리오 종료
 *     · `__SCENARIO_RECRUIT__`: templating result.scenarioId로 영입 시나리오 진입
 *     · `__SCENARIO_SETTLE__`: 정착 컷 진입
 */

export type ExpressionId = 'normal' | 'happy' | 'surprised' | 'worried' | 'sleepy'
export type ScenePosition = 'left' | 'center' | 'right'
export type SceneType = 'dialogue' | 'cutscene' | 'dynamic_reveal' | 'settle'
export type TransitionType = 'fade' | 'slide' | 'instant'
export type TriggerValue = string | string[]

export interface SceneCharacter {
  id: string
  expression?: ExpressionId
  position?: ScenePosition
  outfit?: string | null
}

export interface SceneText {
  speaker: string  // character ID or 'narrator'
  lines: string[]
}

export interface SceneChoice {
  label: string
  next: string  // scene ID or special token (__END__, __SCENARIO_RECRUIT__, ...)
  trigger?: TriggerValue
  requires_material?: string
  requires_gems?: number
  max_attempts?: number
  dynamic_cost_policy?: string
}

export interface SceneEffect {
  type: string
  duration?: number
  particle?: string
  from?: string
}

export interface Scene {
  type?: SceneType
  background?: string
  bgm?: string
  sfx?: string[]
  character?: SceneCharacter | null
  text?: SceneText
  choices?: SceneChoice[]
  next?: string
  transition?: TransitionType
  duration?: number
  effects?: SceneEffect[]
}

export interface Scenario {
  id: string
  version: string
  title: string
  type?: string
  characters: string[]
  startScene: string
  metadata?: Record<string, unknown>
  scenes: Record<string, Scene>
  templating?: {
    variables?: Record<string, string>
    characterIdToScenarioId?: Record<string, string>
  }
}

export interface VNContext {
  result?: {
    characterId: string
    scenarioId: string
  }
  [key: string]: unknown
}

export interface VNCompleteState {
  visitedScenes: string[]
  triggeredEffects: string[]
  endScene: string
}
