/**
 * packages/frontend/src/lib/zoneActionSync.ts
 * ------------------------------------------------------------
 * 역할: frontend zone UI에서 발생한 local resource/clear 결과를 backend zone action API로 보낸다.
 * 연결: 아직 frontend screens 아래에 남아 있는 oasis/memory/mine 미니게임의 과도기 sync helper다.
 * 주의: host reward는 backend clear action 응답을 userStore에 병합해 반영한다.
 */
import { applyHostActionState } from './actionApiSync'
import { api } from './api'
import { accountStoreFacade } from './storeFacades'

const MODULE_ACTION_API_SYNC = import.meta.env.VITE_MODULE_ACTION_API_SYNC === 'true'

export function syncZoneCollect(moduleId: string, resource: string, amount: number): void {
  if (!MODULE_ACTION_API_SYNC || amount <= 0) return
  const uid = accountStoreFacade.getFirebaseUid()
  if (!uid) return

  void api.collectZoneResource(uid, moduleId, resource, amount)
    .catch((error) => console.warn(`[${moduleId}] collect action api failed`, error))
}

export function syncZoneClear(
  moduleId: string,
  clearId?: string,
  result?: Record<string, unknown>,
  idempotencyKey?: string,
): void {
  if (!MODULE_ACTION_API_SYNC) return
  const uid = accountStoreFacade.getFirebaseUid()
  if (!uid) return

  void api.clearZone(uid, moduleId, clearId, result, idempotencyKey)
    .then((response) => applyHostActionState(response.host))
    .catch((error) => console.warn(`[${moduleId}] clear action api failed`, error))
}
