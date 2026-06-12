/**
 * 📁 account/src/types.ts — 계정 상태 타입
 * ───────────────────────────────────────────────
 * 📌 역할: 인증·세션·닉네임의 단일 shape.
 *           frontend userStore 와 정합 (firebaseUid·isGuest·nickname·hostName).
 */

export interface AccountState {
  /** 인증 uid — 게스트 시 'guest-{ts}' / Firebase 시 실 uid. */
  firebaseUid?: string
  /** 게스트 여부. */
  isGuest: boolean
  /** 표시명 — 닉네임 또는 호스트명 (마이섬 명명). */
  nickname?: string
  /** 호스트명 (마이섬 명명). 닉네임과 분리. */
  hostName?: string
}
