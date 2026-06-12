/**
 * 📁 lib/customsModal.ts — customs.confirmUI 의 imperative API
 * ───────────────────────────────────────────────
 * 📌 역할: customs 엔진의 confirmUI 콜백을 React 모달과 연결.
 *           imperative `confirmCustoms(sim)` Promise<boolean> 반환.
 *
 * 🔗 연결:
 *   - lib/customsBootstrap.ts → confirmUI 가 본 함수 호출
 *   - components/CustomsConfirmModal.tsx → useCustomsConfirmState 로 구독
 *   - App.tsx → <CustomsConfirmModal /> 글로벌 마운트
 */
import type { CustomsSimulation } from '@idongworld/customs'

interface PendingConfirm {
  sim: CustomsSimulation
  resolve: (ok: boolean) => void
}

let _pending: PendingConfirm | null = null
const _listeners = new Set<(p: PendingConfirm | null) => void>()

/**
 * imperative API — confirmUI 훅이 호출.
 * 모달이 표시되고 사용자가 OK/취소 → resolve.
 */
export function confirmCustoms(sim: CustomsSimulation): Promise<boolean> {
  return new Promise((resolve) => {
    // 이미 다른 모달 진행 중이면 자동 거절 (race 방지)
    if (_pending) {
      _pending.resolve(false)
    }
    _pending = { sim, resolve }
    _listeners.forEach((fn) => fn(_pending))
  })
}

/** React 모달 컴포넌트가 사용. 현재 pending 상태 + 변경 구독. */
export function subscribeCustomsConfirm(fn: (p: PendingConfirm | null) => void): () => void {
  _listeners.add(fn)
  fn(_pending)  // 즉시 1회 호출
  return () => _listeners.delete(fn)
}

/** 모달 OK 클릭. */
export function resolveCustomsConfirm(ok: boolean): void {
  if (!_pending) return
  const p = _pending
  _pending = null
  p.resolve(ok)
  _listeners.forEach((fn) => fn(null))
}

export type { PendingConfirm }
