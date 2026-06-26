/**
 * 📁 host/src/actions.ts — 자원 변경 단일 진입점
 * ───────────────────────────────────────────────
 * 📌 역할: 다른 모듈이 자원을 변경하는 표준 API.
 *           내부에서 config.ts 의 mutate 훅 dispatch.
 *           훅 미주입 시 console.warn + false 반환.
 *
 * 🔗 사용 (Phase 2 정착 시):
 *   - gacha → 가챠 비용 차감: spendDiamonds(150)
 *   - customs → 자원 변환 적립: rewardCoins(N)
 *   - care → 케어 비용 차감: spendCoins(N) + consumeMaterial(id)
 */
import { getHooks } from './config.ts'
import type { HostResources, MaterialId, HostMutateResult } from './types.ts'

const EMPTY_RESOURCES: HostResources = {
  coins: 0,
  diamonds: 0,
  diceCount: 0,
  inventory: {},
}

/** 현재 자원 스냅샷. 훅 미주입 시 0/{} 반환. */
export function getResources(): HostResources {
  const fn = getHooks().getResources
  if (!fn) return EMPTY_RESOURCES
  return fn()
}

/** 코인 적립 (양수). */
export function rewardCoins(amount: number): HostMutateResult {
  if (amount <= 0) return false
  return mutate('mutateCoins', amount, 'rewardCoins')
}

/** 코인 차감 (양수 → 음수 변환). 보유 부족 시 false. */
export function spendCoins(amount: number): HostMutateResult {
  if (amount <= 0) return false
  return mutate('mutateCoins', -amount, 'spendCoins')
}

/** 다이아 적립. */
export function rewardDiamonds(amount: number): HostMutateResult {
  if (amount <= 0) return false
  return mutate('mutateDiamonds', amount, 'rewardDiamonds')
}

/** 다이아 차감. */
export function spendDiamonds(amount: number): HostMutateResult {
  if (amount <= 0) return false
  return mutate('mutateDiamonds', -amount, 'spendDiamonds')
}

/** 주사위 적립. */
export function rewardDice(amount: number): HostMutateResult {
  if (amount <= 0) return false
  return mutate('mutateDice', amount, 'rewardDice')
}

/** 자재 입수 (양수). */
export function addMaterial(id: MaterialId, amount = 1): HostMutateResult {
  if (amount <= 0) return false
  const fn = getHooks().mutateMaterial
  if (!fn) {
    warn('addMaterial')
    return false
  }
  return fn(id, amount)
}

/** 자재 사용 (보유 부족 시 false). */
export function consumeMaterial(id: MaterialId, amount = 1): HostMutateResult {
  if (amount <= 0) return false
  const fn = getHooks().mutateMaterial
  if (!fn) {
    warn('consumeMaterial')
    return false
  }
  return fn(id, -amount)
}

// ─── 내부 ───
function mutate(
  key: 'mutateCoins' | 'mutateDiamonds' | 'mutateDice',
  delta: number,
  label: string,
): boolean {
  const fn = getHooks()[key]
  if (!fn) {
    warn(label)
    return false
  }
  return fn(delta)
}

function warn(label: string): void {
  // eslint-disable-next-line no-console
  console.warn(`[host] ${label} — 훅 미주입 (frontend hostBootstrap 호출 누락 가능).`)
}
