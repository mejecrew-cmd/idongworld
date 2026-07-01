/**
 * packages/frontend/src/lib/aidongIslandBootstrap.ts
 * ------------------------------------------------------------
 * 역할: aidong-island 모듈의 frontend DI hook을 backend action API와 Zustand 병합에 연결한다.
 * 연결: M22 아이동섬 1컷 영입 placeholder가 land -> move -> interact -> recruit 흐름을 호출한다.
 * 주의: 영입 성공 후 마이섬 편입은 자동 처리하지 않고, 다음 단계인 슬롯 선택으로 넘긴다.
 */
import { configure, type AidongIslandRecruitPayload, type AidongIslandRecruitResult } from '@idongworld/aidong-island'
import { isAidongId } from '@/data/aidongs'
import { applyModuleActionState } from './actionApiSync'
import { api } from './api'
import { accountStoreFacade, myAidongStoreFacade } from './storeFacades'

const MODULE_ACTION_API_SYNC = import.meta.env.VITE_MODULE_ACTION_API_SYNC === 'true'

async function recruitPlaceholder(payload: AidongIslandRecruitPayload): Promise<AidongIslandRecruitResult> {
  if (!isAidongId(payload.characterId)) {
    return { ok: false, characterId: payload.characterId, message: '아직 영입할 수 없는 Aidong이에요.' }
  }

  if (!MODULE_ACTION_API_SYNC) {
    myAidongStoreFacade.recruitAidong(payload.characterId)
    return {
      ok: true,
      characterId: payload.characterId,
      nextActions: ['my-island/slots/incorporate'],
      message: `${payload.characterId}이(가) 동료가 되었어요. 이제 편입 슬롯을 골라주세요.`,
    }
  }

  const uid = accountStoreFacade.getFirebaseUid()
  if (!uid) {
    return { ok: false, characterId: payload.characterId, message: '로그인 정보가 없어 영입을 저장하지 못했어요.' }
  }

  await api.landAidongIsland(uid, payload.islandId)
  await api.moveAidongIsland(uid, 'north')
  await api.interactAidongIsland(uid, payload.hotspotId)
  const recruited = await api.recruitFromAidongIsland(uid, payload.characterId)

  applyModuleActionState(recruited.aidongState)

  return {
    ok: true,
    characterId: payload.characterId,
    nextActions: recruited.nextActions,
    message: `${payload.characterId}이(가) 동료가 되었어요. 이제 편입 슬롯을 골라주세요.`,
  }
}

export function bootstrapAidongIsland(): void {
  configure({
    getRecruited: () => myAidongStoreFacade.getAidongState().recruitedAidongs,
    onRecruitPlaceholder: recruitPlaceholder,
  })
}
