/**
 * packages/modules/aidong-island/src/config.ts
 * ------------------------------------------------------------
 * 역할: M22 아이동섬 모듈이 외부 앱 환경에 의존해야 하는 hook을 주입받는다.
 * 연결: frontend bootstrap이 backend aidong-island action API와 Zustand 병합 함수를 주입한다.
 * 주의: 모듈 화면은 frontend userStore나 api.ts를 직접 import하지 않는다.
 */
export interface AidongIslandRecruitPayload {
  islandId: string
  characterId: string
  hotspotId: string
}

export interface AidongIslandRecruitResult {
  ok: boolean
  characterId: string
  nextActions?: string[]
  message?: string
}

export interface AidongIslandHooks {
  getRecruited?: () => string[]
  onRecruitPlaceholder?: (payload: AidongIslandRecruitPayload) => Promise<AidongIslandRecruitResult>
}

let hooks: AidongIslandHooks = {}

export function configure(next: AidongIslandHooks): void {
  hooks = { ...hooks, ...next }
}

export function getHooks(): AidongIslandHooks {
  return hooks
}

export function _resetForTest(): void {
  hooks = {}
}