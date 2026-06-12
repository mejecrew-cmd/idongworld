/**
 * 📁 ship/src/actions.ts — ship 모듈 action 표면
 *
 * 현재는 항구 배정과 주사위 충전의 frontend hook wrapper만 제공한다.
 * 배 종류 변경, 선실/갑판 배정, 선박 인벤토리 조작은 backend API와 config가 준비된 뒤 확장한다.
 */
import { getHooks } from './config.ts'
import type { ShipStateSnapshot, ShipMutateResult } from './types.ts'

const EMPTY_SHIP_STATE: ShipStateSnapshot = {
  harborAssignedChars: [],
  shipInventory: {},
  cabins: {},
}

export function getShipState(): ShipStateSnapshot {
  return getHooks().getShipState?.() ?? EMPTY_SHIP_STATE
}

export function toggleHarborAssign(characterId: string): ShipMutateResult {
  const fn = getHooks().doToggleHarborAssign
  if (!fn) {
    warn('toggleHarborAssign')
    return false
  }
  fn(characterId)
  return true
}

export function chargeDiceFromHarbor(): number {
  return getHooks().doChargeDiceFromHarbor?.() ?? 0
}

function warn(label: string): void {
  // eslint-disable-next-line no-console
  console.warn(`[ship] ${label} — 훅 미주입 (frontend bootstrap 호출 누락 가능).`)
}
