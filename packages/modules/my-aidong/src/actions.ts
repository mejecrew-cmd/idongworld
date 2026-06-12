/**
 * my-aidong/src/actions.ts
 * ------------------------------------------------------------
 * 역할: Aidong 영입, 친밀도, 욕구, 케어 액션을 다루는 모듈 공개 action facade다.
 * 연결: 실제 저장소 접근은 config hook으로 주입받으며, 모듈 내부 코드는 userStore를 직접 알지 않는다.
 * 주의: action의 의미를 바꿀 때는 frontend bootstrap과 backend my-aidong action API가 같은 규칙을 쓰는지 확인한다.
 */
import { getHooks } from './config.ts'
import type { Affinity, CareApplyResult, NeedsState } from './types.ts'

const EMPTY_AFFINITY: Affinity = { score: 0, level: 0 }

export function getAidongs(): string[] {
  return getHooks().getRecruited?.() ?? []
}

export function isRecruited(id: string): boolean {
  return getAidongs().includes(id)
}

export function recruit(id: string): void {
  const fn = getHooks().doRecruit
  if (!fn) {
    // eslint-disable-next-line no-console
    console.warn('[my-aidong] recruit hook is not configured')
    return
  }
  fn(id)
}

export function getAffinity(id: string): Affinity {
  return getHooks().getAffinityFor?.(id) ?? EMPTY_AFFINITY
}

export function addAffinity(id: string, delta: number): void {
  const fn = getHooks().doAddAffinity
  if (!fn) {
    // eslint-disable-next-line no-console
    console.warn('[my-aidong] addAffinity hook is not configured')
    return
  }
  fn(id, delta)
}

export function getNeeds(id: string): NeedsState | undefined {
  return getHooks().getNeedsFor?.(id)
}

export function tickSequenceDecay(id: string): void {
  getHooks().doTickDecay?.(id)
}

export function applyCareAction(charId: string, actionId: string): CareApplyResult {
  const fn = getHooks().doApplyCareAction
  if (!fn) {
    // eslint-disable-next-line no-console
    console.warn('[my-aidong] applyCareAction hook is not configured')
    return { ok: false, reason: 'no_char' }
  }
  return fn(charId, actionId)
}


