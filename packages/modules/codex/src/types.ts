/**
 * 📁 codex/src/types.ts — 도감·일기 해금 타입
 * ───────────────────────────────────────────────
 * 📌 역할: 해금된 일기·도감 entry·완전 등재 캐릭터 ID 목록.
 */

/** 도감 entry 식별자 — 캐릭터 ID 또는 'material:{id}' / 'trophy:{id}'. */
export type CodexEntryId = string

/** 도감 트랙. */
export type CodexTrack = 'character' | 'material' | 'trophy'

/** 도감 entry 상태 (slot vs fully). */
export type CodexEntryStatus = 'locked' | 'placeholder' | 'fully'
