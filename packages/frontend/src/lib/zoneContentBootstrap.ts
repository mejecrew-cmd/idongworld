/**
 * packages/frontend/src/lib/zoneContentBootstrap.ts
 * ------------------------------------------------------------
 * 역할: garden 외 zone 콘텐츠 모듈의 DI hook을 backend zone action API에 연결한다.
 * 연결: oasis/memory/mine 미니게임 완료·수집 이벤트를 backend zone action API로 저장한다.
 * 주의: host reward 지급은 backend clear action이 담당한다.
 */
import { configure as configureOasis, type OasisCompletePayload } from '@idongworld/zone-oasis'
import { configure as configureMemory, type MemoryCompletePayload } from '@idongworld/zone-memory'
import {
  configure as configureMine,
  type MineCollectPayload,
  type MineCompletePayload,
} from '@idongworld/zone-mine'
import { syncZoneClear, syncZoneCollect } from './zoneActionSync'

function syncResources(moduleId: string, resources: Record<string, number>): void {
  for (const [resource, amount] of Object.entries(resources)) {
    syncZoneCollect(moduleId, resource, amount)
  }
}

function syncOasisComplete(payload: OasisCompletePayload): void {
  syncResources('zone-oasis', payload.resources)
  syncZoneClear('zone-oasis', payload.clearId, payload.result, payload.idempotencyKey)
}

function syncMemoryComplete(payload: MemoryCompletePayload): void {
  syncResources('zone-memory', payload.resources)
  syncZoneClear('zone-memory', payload.clearId, payload.result, payload.idempotencyKey)
}

function syncMineCollect(payload: MineCollectPayload): void {
  syncResources('zone-mine', payload.resources)
}

function syncMineComplete(payload: MineCompletePayload): void {
  syncZoneClear('zone-mine', payload.clearId, payload.result, payload.idempotencyKey)
}

export function bootstrapZoneContent(): void {
  configureOasis({ onComplete: syncOasisComplete })
  configureMemory({ onComplete: syncMemoryComplete })
  configureMine({
    onCollect: syncMineCollect,
    onComplete: syncMineComplete,
  })
}
