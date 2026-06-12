/**
 * 📁 lib/codexBootstrap.ts — codex 광역 모듈 DI
 * ───────────────────────────────────────────────
 * 📌 역할: codex 모듈에 useUserStore 백업 도감·일기 해금 훅 주입.
 *           vnTrigger 잔여 useUserStore 직접 호출 정착의 기반.
 *
 * 🔗 main.tsx → bootstrapCodex() 1회
 */
import { configure } from '@idongworld/codex'
import type { AidongCharacterId } from '@/stores/userStore'
import { applyActionApiResponse } from './actionApiSync'
import { api } from './api'
import { accountStoreFacade, codexStoreFacade } from './storeFacades'

const MODULE_ACTION_API_SYNC = import.meta.env.VITE_MODULE_ACTION_API_SYNC === 'true'

const VALID_CHARS: AidongCharacterId[] = ['황금멍', '춤냥', '양털곰', '단풍볼', '날카여우']
const isValidChar = (id: string): id is AidongCharacterId =>
  (VALID_CHARS as string[]).includes(id)

function syncCodexAction(action: 'diary' | 'slot' | 'full', id: string): void {
  if (!MODULE_ACTION_API_SYNC) return
  const uid = accountStoreFacade.getFirebaseUid()
  if (!uid) return
  const request =
    action === 'diary'
      ? api.unlockCodexDiary(uid, id)
      : action === 'slot'
        ? api.unlockCodexSlot(uid, id)
        : api.fullyRegisterCodex(uid, id)

  void request
    .then(applyActionApiResponse)
    .catch((error) => console.warn('[codex] action api failed', error))
}

export function bootstrapCodex(): void {
  configure({
    getUnlockedDiariesList: () => codexStoreFacade.getCodexState().unlockedDiaries,
    doUnlockDiary: (id) => {
      codexStoreFacade.unlockDiary(id)
      syncCodexAction('diary', id)
    },

    getCodexEntriesList: () => codexStoreFacade.getCodexState().unlockedCodexEntries,
    getFullyRegisteredList: () => codexStoreFacade.getCodexState().codexFullyRegistered,

    doUnlockCodexSlot: (id) => {
      if (isValidChar(id)) {
        codexStoreFacade.unlockCodexSlot(id)
        syncCodexAction('slot', id)
      }
    },
    doFullyRegisterCodex: (id) => {
      if (isValidChar(id)) {
        codexStoreFacade.fullyRegisterCodex(id)
        syncCodexAction('full', id)
      }
    },
  })
}
