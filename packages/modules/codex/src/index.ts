/**
 * 📁 codex/src/index.ts — @idongworld/codex 공개 표면
 */
export type * from './types.ts'
export {
  getUnlockedDiaries,
  isDiaryUnlocked,
  unlockDiary,
  getCodexEntries,
  isCodexUnlocked,
  unlockCodexSlot,
  fullyRegisterCodex,
  isFullyRegistered,
} from './actions.ts'
export { configure, getHooks } from './config.ts'
export type { CodexHooks } from './config.ts'
