/**
 * lodge/src/actions.ts - lodge 모듈 action 표면
 *
 * 현재는 숙소 상태 조회와 Aidong 숙소 배치 toggle만 제공한다.
 * 숙소 인벤토리 이동은 후속 customs rule/API 작업에서 backend 권위 흐름으로 연결한다.
 */
import { getHooks } from './config.ts'
import type { LodgeMutateResult, LodgeStateSnapshot } from './types.ts'

const EMPTY_LODGE_STATE: LodgeStateSnapshot = {
  lodgeInventory: {},
  assignedAidongs: [],
  rooms: {},
  furniture: {},
}

export function getLodgeState(): LodgeStateSnapshot {
  return getHooks().getLodgeState?.() ?? EMPTY_LODGE_STATE
}

export function toggleAssignedAidong(characterId: string): LodgeMutateResult {
  const fn = getHooks().doToggleAssignedAidong
  if (!fn) {
    warn('toggleAssignedAidong')
    return false
  }
  fn(characterId)
  return true
}

function warn(label: string): void {
  // eslint-disable-next-line no-console
  console.warn(`[lodge] ${label} 훅이 아직 주입되지 않았습니다. frontend bootstrap 연결을 확인하세요.`)
}
