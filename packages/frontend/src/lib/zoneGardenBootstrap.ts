/**
 * packages/frontend/src/lib/zoneGardenBootstrap.ts
 * ------------------------------------------------------------
 * 역할: zone-garden 모듈의 frontend DI hook을 실제 backend action API에 연결한다.
 * 연결: GardenMiniGame harvest가 zone-garden local resource와 host reward를 backend action으로 저장한다.
 * 주의: 모듈 UI는 결과 이벤트만 전달하고, host reward 지급은 backend clear action이 담당한다.
 */
import { configure, type GardenHarvestPayload } from '@idongworld/zone-garden'
import { applyHostActionState } from './actionApiSync'
import { api } from './api'
import { accountStoreFacade } from './storeFacades'

const MODULE_ACTION_API_SYNC = import.meta.env.VITE_MODULE_ACTION_API_SYNC === 'true'

function syncGardenHarvest(payload: GardenHarvestPayload): void {
  if (!MODULE_ACTION_API_SYNC) return
  const uid = accountStoreFacade.getFirebaseUid()
  if (!uid) return

  for (const [resource, amount] of Object.entries(payload.resources)) {
    if (amount > 0) {
      void api.collectZoneResource(uid, 'zone-garden', resource, amount)
        .catch((error) => console.warn('[zone-garden] collect action api failed', error))
    }
  }

  void api.clearZone(uid, 'zone-garden', payload.clearId, payload.result, payload.idempotencyKey)
    .then((response) => applyHostActionState(response.host))
    .catch((error) => console.warn('[zone-garden] clear action api failed', error))
}

export function bootstrapZoneGarden(): void {
  configure({
    onHarvest: syncGardenHarvest,
  })
}
