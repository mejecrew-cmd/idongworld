import { configure } from '@idongworld/my-aidong'
import type { CareApplyResult, NeedsState } from '@idongworld/my-aidong'
import type { AidongCharacterId } from '@/stores/userStore'
import { api } from './api'
import { applyModuleActionState } from './actionApiSync'
import { accountStoreFacade, myAidongStoreFacade } from './storeFacades'

const MODULE_ACTION_API_SYNC = import.meta.env.VITE_MODULE_ACTION_API_SYNC === 'true'

const VALID_CHARS: AidongCharacterId[] = ['황금멍', '춤냥', '양털곰', '단풍볼', '날카여우']
const isValidChar = (id: string): id is AidongCharacterId =>
  (VALID_CHARS as string[]).includes(id)

function syncMyAidongState(): void {
  if (!MODULE_ACTION_API_SYNC) return
  const uid = accountStoreFacade.getFirebaseUid()
  if (!uid) return
  const s = myAidongStoreFacade.getAidongState()
  void api.patchModuleState(uid, 'my-aidong', {
    recruitedAidongs: s.recruitedAidongs,
    firstGachaCandidate: s.firstGachaCandidate,
    firstGachaAttempts: s.firstGachaAttempts,
    affinities: s.affinities,
    needs: s.needs,
    equippedOutfit: s.equippedOutfit,
    equippedItems: s.equippedItems,
  })
    .then((response) => applyModuleActionState(response.state))
    .catch((error) => console.warn('[my-aidong] api sync failed', error))
}

function syncRecruit(characterId: string): void {
  if (!MODULE_ACTION_API_SYNC) return
  const uid = accountStoreFacade.getFirebaseUid()
  if (!uid) return
  void api.recruitAidong(uid, characterId)
    .then((response) => applyModuleActionState(response.state))
    .catch((error) => console.warn('[my-aidong] recruit action api failed', error))
}

function syncAffinity(characterId: string, delta: number): void {
  if (!MODULE_ACTION_API_SYNC) return
  const uid = accountStoreFacade.getFirebaseUid()
  if (!uid) return
  void api.addAidongAffinity(uid, characterId, delta)
    .then((response) => applyModuleActionState(response.state))
    .catch((error) => console.warn('[my-aidong] affinity action api failed', error))
}

export function bootstrapMyAidong(): void {
  configure({
    getRecruited: () => myAidongStoreFacade.getAidongState().recruitedAidongs,

    doRecruit: (id) => {
      if (!isValidChar(id)) return
      myAidongStoreFacade.recruitAidong(id)
      syncRecruit(id)
    },

    getAffinityFor: (id) => {
      const a = myAidongStoreFacade.getAidongState().affinities[id]
      return a ?? { score: 0, level: 0 }
    },

    doAddAffinity: (id, delta) => {
      if (!isValidChar(id)) return
      if (delta >= 0) {
        myAidongStoreFacade.addAffinity(id, delta)
      } else {
        myAidongStoreFacade.decreaseAffinityScore(id, delta)
      }
      syncAffinity(id, delta)
    },

    getNeedsFor: (id) => {
      const n = myAidongStoreFacade.getAidongState().needs[id]
      return n ? n as NeedsState : undefined
    },

    doTickDecay: (id) => {
      if (!isValidChar(id)) return
      myAidongStoreFacade.tickSequenceDecay(id)
      syncMyAidongState()
    },

    doApplyCareAction: (charId, actionId): CareApplyResult => {
      if (!isValidChar(charId)) return { ok: false, reason: 'no_char' }
      const result = myAidongStoreFacade.applyCareAction(charId, actionId)
      if (result.ok) syncMyAidongState()
      return result
    },
  })
}
