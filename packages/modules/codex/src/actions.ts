/**
 * 📁 codex/src/actions.ts — 도감·일기 해금 표준 API
 */
import { getHooks } from './config.ts'
import type { CodexEntryId } from './types.ts'
import { bus } from '@idongworld/core'

// ─── 일기 ───
export function getUnlockedDiaries(): string[] {
  return getHooks().getUnlockedDiariesList?.() ?? []
}

export function isDiaryUnlocked(id: string): boolean {
  return getUnlockedDiaries().includes(id)
}

export function unlockDiary(id: string): void {
  const fn = getHooks().doUnlockDiary
  if (!fn) {
    // eslint-disable-next-line no-console
    console.warn('[codex] unlockDiary — 훅 미주입')
    return
  }
  fn(id)
  bus.emit('codex:diary-unlocked', { diaryId: id })
}

// ─── 도감 ───
export function getCodexEntries(): CodexEntryId[] {
  return getHooks().getCodexEntriesList?.() ?? []
}

export function isCodexUnlocked(id: CodexEntryId): boolean {
  return getCodexEntries().includes(id)
}

export function isFullyRegistered(id: CodexEntryId): boolean {
  return (getHooks().getFullyRegisteredList?.() ?? []).includes(id)
}

export function unlockCodexSlot(id: CodexEntryId): void {
  const fn = getHooks().doUnlockCodexSlot
  if (!fn) {
    // eslint-disable-next-line no-console
    console.warn('[codex] unlockCodexSlot — 훅 미주입')
    return
  }
  fn(id)
  bus.emit('codex:slot-unlocked', { entryId: id })
}

export function fullyRegisterCodex(id: CodexEntryId): void {
  const fn = getHooks().doFullyRegisterCodex
  if (!fn) {
    // eslint-disable-next-line no-console
    console.warn('[codex] fullyRegisterCodex — 훅 미주입')
    return
  }
  fn(id)
  bus.emit('codex:fully-registered', { entryId: id })
}
