/**
 * packages/modules/zone-memory/src/config.ts
 * ------------------------------------------------------------
 * 역할: zone-memory 모듈이 외부 앱 환경에 의존해야 하는 hook을 주입받는다.
 * 연결: frontend bootstrap이 backend zone action API 호출 함수를 주입한다.
 * 주의: 모듈 본체는 frontend userStore나 api.ts를 직접 import하지 않는다.
 */
export interface MemoryCompletePayload {
  resources: Record<string, number>
  clearId?: string
  result?: Record<string, unknown>
  idempotencyKey?: string
}

export interface MemoryHooks {
  onComplete?: (payload: MemoryCompletePayload) => void
}

let hooks: MemoryHooks = {}

export function configure(next: MemoryHooks): void {
  hooks = { ...hooks, ...next }
}

export function getHooks(): MemoryHooks {
  return hooks
}

export function _resetForTest(): void {
  hooks = {}
}
