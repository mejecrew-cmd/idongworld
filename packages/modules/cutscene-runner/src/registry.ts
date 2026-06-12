/**
 * 📁 cutscene-runner/src/registry.ts — callSiteId → 컷신 등록·조회
 * ───────────────────────────────────────────────
 * 📌 역할: 호출 지점 단위 레지스트리. 같은 callSiteId 에 다중 등록 시 우선순위 분기.
 *           1회 발화·조건부 발화 지원.
 *
 * 🔗 연결:
 *   - types.ts (CutsceneRegistration)
 *   - config.ts (shouldFire 외부 게이트)
 *   - CutscenePlayer.tsx (findFor 조회)
 *
 * 💡 사용 예 (frontend bootstrap):
 *   register({ callSiteId: 'after-recruit', scenarioId: 'settle_{{result.scenarioId}}' })
 *   register({ callSiteId: 'island-first-visit', scenarioId: 'cutscene_island_welcome', oncePerUser: true })
 *
 * 💡 oncePerUser:
 *   - frontend 가 configure({ isWatched, markWatched }) 로 영속 저장 위임.
 *   - 미주입 시 메모리 Set (페이지 리로드 시 리셋).
 */
import type { CutsceneRegistration } from './types.ts'
import { getHooks } from './config.ts'

const _byId = new Map<string, CutsceneRegistration[]>()

/** 메모리 fallback (configure().isWatched 미주입 시). */
const _watchedFallback = new Set<string>()

/** 한 컷신 등록. */
export function register(reg: CutsceneRegistration): void {
  if (!reg.callSiteId || !reg.scenarioId) {
    throw new Error('[cutscene-runner] callSiteId·scenarioId 필수')
  }
  const arr = _byId.get(reg.callSiteId) ?? []
  arr.push(reg)
  // priority desc 정렬
  arr.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  _byId.set(reg.callSiteId, arr)
}

/** 일괄 등록. */
export function registerAll(regs: CutsceneRegistration[]): void {
  for (const r of regs) register(r)
}

/**
 * callSiteId 로 발화 후보 조회.
 * 순위:
 *   1) priority desc
 *   2) condition() === true
 *   3) oncePerUser 시 isWatched(key) === false
 * 모두 통과한 첫 항목 반환. 없으면 undefined.
 */
export function findFor(callSiteId: string): CutsceneRegistration | undefined {
  const arr = _byId.get(callSiteId)
  if (!arr || !arr.length) return undefined
  const hooks = getHooks()
  const isWatched = hooks.isWatched ?? ((k: string) => _watchedFallback.has(k))

  for (const r of arr) {
    if (r.condition && !r.condition()) continue
    if (r.oncePerUser) {
      const key = watchedKeyOf(r)
      if (isWatched(key)) continue
    }
    if (hooks.shouldFire && !hooks.shouldFire(r)) continue
    return r
  }
  return undefined
}

/** 컷신 발화 완료 마킹 (oncePerUser 인 경우만 의미 있음). */
export function markWatched(reg: CutsceneRegistration): void {
  if (!reg.oncePerUser) return
  const key = watchedKeyOf(reg)
  const hooks = getHooks()
  if (hooks.markWatched) hooks.markWatched(key)
  else _watchedFallback.add(key)
}

/** watched 마커 키 — callSiteId + scenarioId 합성. */
export function watchedKeyOf(reg: CutsceneRegistration): string {
  return `${reg.callSiteId}::${reg.scenarioId}`
}

/** 디버그·검수용. */
export function listAll(): CutsceneRegistration[] {
  const out: CutsceneRegistration[] = []
  for (const arr of _byId.values()) out.push(...arr)
  return out
}

/** 테스트·HMR 용 초기화. */
export function _resetForTest(): void {
  _byId.clear()
  _watchedFallback.clear()
}
