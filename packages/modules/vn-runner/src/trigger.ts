/**
 * 📁 vn-runner/src/trigger.ts — 시나리오 trigger dispatcher
 * ───────────────────────────────────────────────
 * 📌 역할: 시나리오 선택지 trigger 문자열을 파싱해 등록된 핸들러로 dispatch.
 *           frontend store 의존성을 config 의 triggerHandlers 로 주입받아 결합도 제거.
 *
 * 🔗 연결:
 *   - types.ts → TriggerValue
 *   - config.ts → getHooks().triggerHandlers (외부 주입)
 *   - VNPlayer.tsx → 선택지 클릭 시 호출
 *   - 기획 SoT: 매뉴얼/시스템/S09_VN_Runner.md §1.4
 *
 * 💡 초보자 안내:
 *   - trigger 형식: "동사:대상" (예: "unlock_aidong:황금멍")
 *   - 배열·단일 문자열 모두 지원 (S09 v0.2 정합)
 *   - 'navigate' 만 vn-runner 내부 처리 (라우터·시나리오 분기 결과 반환)
 *   - 그 외 verb 는 config.triggerHandlers 에 등록된 함수로 위임
 *   - 미등록 verb: console.warn (조용한 실패)
 *
 *   주요 trigger 카탈로그 (frontend 가 등록):
 *   - affinity_+1/+2/+3:{char}    → store.addAffinity(char, N)
 *   - unlock_aidong:{char}        → store.recruitAidong(char)
 *   - unlock_diary:{id}           → store.unlockDiary(id)
 *   - unlock_codex_slot:{char}    → store.unlockCodexSlot(char)
 *   - unlock_codex_full:{char}    → store.fullyRegisterCodex(char)
 *   - give_material:{id}          → 인벤토리 차감
 *   - gacha_retry                 → 가챠 재시도 카운트 +1
 *   - deduct_gems:{N}             → 보석 차감
 *   - play_sfx:{id}               → onPlaySfx (Phase 1.5)
 *   - navigate:{path}             → 라우터·시나리오 분기 (내부)
 */
import type { TriggerValue } from './types.ts'
import { getHooks } from './config.ts'

export interface TriggerResult {
  /** 다음 라우터 경로 또는 시나리오 ID. */
  navigate?: string
  end?: boolean
}

/**
 * trigger 문자열(들) 처리. 배열·단일 모두 OK.
 * 'navigate' 는 result.navigate 로 반환 (호출부가 라우터·시나리오 전환).
 * 그 외는 config.triggerHandlers[verb] 호출 (등록 안 됐으면 warn).
 */
export async function handleTriggers(triggers: TriggerValue | undefined): Promise<TriggerResult> {
  if (!triggers) return {}
  const arr = Array.isArray(triggers) ? triggers : [triggers]
  const result: TriggerResult = {}
  const hooks = getHooks()
  const handlers = hooks.triggerHandlers ?? {}

  for (const t of arr) {
    if (!t) continue
    const [verb, payload] = t.includes(':') ? t.split(/:(.+)/) : [t, '']

    // 내부 처리 verb
    if (verb === 'navigate') {
      result.navigate = payload
      continue
    }
    if (verb === 'play_sfx') {
      hooks.onPlaySfx?.(payload)
      continue
    }

    // 등록된 핸들러로 위임
    const handler = handlers[verb]
    if (handler) {
      await handler(payload)
    } else {
      // eslint-disable-next-line no-console
      console.warn('[vn-runner] unknown trigger:', t)
    }
  }
  return result
}
