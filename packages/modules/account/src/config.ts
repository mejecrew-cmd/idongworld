/**
 * 📁 account/src/config.ts — DI 훅
 * ───────────────────────────────────────────────
 * 📌 역할: account 모듈은 zustand 직접 X. frontend 가 useUserStore 백업 주입.
 */
import type { AccountState } from './types.ts'

export interface AccountHooks {
  getState?: () => AccountState
  /** 게스트 로그인 — frontend store 의 loginGuest 위임. */
  doLoginGuest?: () => void
  /** 로그아웃 — 전체 상태 초기화. */
  doLogout?: () => void
  /** 닉네임 갱신. */
  doSetNickname?: (nickname: string) => void
}

let _hooks: AccountHooks = {}

export function configure(hooks: AccountHooks): void {
  _hooks = { ..._hooks, ...hooks }
}

export function getHooks(): AccountHooks {
  return _hooks
}

export function _resetForTest(): void {
  _hooks = {}
}
