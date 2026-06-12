/**
 * 📁 codex/src/config.ts — DI 훅
 */
import type { CodexEntryId } from './types.ts'

export interface CodexHooks {
  getUnlockedDiariesList?: () => string[]
  doUnlockDiary?: (id: string) => void

  getCodexEntriesList?: () => CodexEntryId[]
  getFullyRegisteredList?: () => CodexEntryId[]
  doUnlockCodexSlot?: (id: CodexEntryId) => void
  doFullyRegisterCodex?: (id: CodexEntryId) => void
}

let _hooks: CodexHooks = {}

export function configure(hooks: CodexHooks): void {
  _hooks = { ..._hooks, ...hooks }
}

export function getHooks(): CodexHooks {
  return _hooks
}

export function _resetForTest(): void {
  _hooks = {}
}
