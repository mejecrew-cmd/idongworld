/**
 * packages/modules/zone-garden/src/config.ts
 * ------------------------------------------------------------
 * 역할: zone-garden 모듈이 외부 앱 환경에 의존해야 하는 hook을 주입받는다.
 * 연결: frontend bootstrap이 backend zone action API 호출 함수를 주입한다.
 * 주의: 모듈 본체는 frontend userStore나 api.ts를 직접 import하지 않는다.
 */
export interface GardenHarvestPayload {
  resources: Record<string, number>
  clearId?: string
  result?: Record<string, unknown>
  idempotencyKey?: string
}

export interface GardenHooks {
  onHarvest?: (payload: GardenHarvestPayload) => void
}

let hooks: GardenHooks = {}

export function configure(next: GardenHooks): void {
  hooks = { ...hooks, ...next }
}

export function getHooks(): GardenHooks {
  return hooks
}

export function _resetForTest(): void {
  hooks = {}
}
