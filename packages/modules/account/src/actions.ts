/**
 * 📁 account/src/actions.ts — 인증·세션 표준 API
 * ───────────────────────────────────────────────
 * 📌 역할: 다른 모듈이 인증 상태를 조회·변경하는 표준 API.
 *           내부에서 config.ts 의 hooks dispatch.
 */
import { getHooks } from './config.ts'
import type { AccountState } from './types.ts'

const EMPTY: AccountState = { isGuest: false }

export function getAccount(): AccountState {
  const fn = getHooks().getState
  if (!fn) return EMPTY
  return fn()
}

export function isLoggedIn(): boolean {
  return Boolean(getAccount().firebaseUid)
}

export function isGuest(): boolean {
  return getAccount().isGuest === true
}

export function loginGuest(): void {
  const fn = getHooks().doLoginGuest
  if (!fn) {
    // eslint-disable-next-line no-console
    console.warn('[account] loginGuest — 훅 미주입')
    return
  }
  fn()
}

export function logout(): void {
  const fn = getHooks().doLogout
  if (!fn) {
    // eslint-disable-next-line no-console
    console.warn('[account] logout — 훅 미주입')
    return
  }
  fn()
}

export function setNickname(nickname: string): void {
  const fn = getHooks().doSetNickname
  if (!fn) {
    // eslint-disable-next-line no-console
    console.warn('[account] setNickname — 훅 미주입')
    return
  }
  fn(nickname)
}
