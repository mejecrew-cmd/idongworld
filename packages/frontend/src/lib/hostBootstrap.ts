/**
 * 📁 lib/hostBootstrap.ts — host 광역 모듈 DI 부트스트랩
 * ───────────────────────────────────────────────
 * 📌 역할: @idongworld/host 의 자원 변경 훅을 useUserStore 백업으로 연결.
 *           다른 모듈이 host actions (rewardCoins·spendGems 등) 호출 시
 *           실제 zustand store 가 갱신되도록.
 *
 * 🔗 연결: main.tsx → bootstrapHost() 1회
 *           gacha·customs·care 등이 (Phase 2 정착 시) host actions 사용 → 본 부트스트랩 통과
 *
 * 💡 정착 시점:
 *   - Phase 2: 다른 모듈의 useUserStore 직접 호출을 host actions 로 점진 교체
 */
import { configure, type MaterialId } from '@idongworld/host'
import { api } from './api'
import { applyHostActionState } from './actionApiSync'
import { accountStoreFacade, hostStoreFacade } from './storeFacades'

const MODULE_ACTION_API_SYNC = import.meta.env.VITE_MODULE_ACTION_API_SYNC === 'true'

function syncHostResource(
  resource: 'coins' | 'gems' | 'diamonds' | 'diceCount',
  delta: number,
): void {
  if (!MODULE_ACTION_API_SYNC) return
  const uid = accountStoreFacade.getFirebaseUid()
  if (!uid) return
  void api.mutateHostResource(uid, resource, delta)
    .then((response) => applyHostActionState(response.state))
    .catch((error) => console.warn('[host] resource action api failed', error))
}

function syncHostInventory(itemId: string, delta: number): void {
  if (!MODULE_ACTION_API_SYNC) return
  const uid = accountStoreFacade.getFirebaseUid()
  if (!uid) return
  void api.mutateHostInventory(uid, itemId, delta)
    .then((response) => applyHostActionState(response.state))
    .catch((error) => console.warn('[host] inventory action api failed', error))
}

/** 부족 시 false 반환하는 mutator helper. */
function makeNumericMutator(
  read: () => number,
  write: (delta: number) => void,
): (delta: number) => boolean {
  return (delta) => {
    if (delta < 0 && read() + delta < 0) return false
    write(delta)
    return true
  }
}

export function bootstrapHost(): void {
  configure({
    getResources: () => {
      const s = hostStoreFacade.getResources()
      return {
        coins: s.coins,
        gems: s.gems,
        diamonds: s.diamonds,
        diceCount: s.diceCount,
        inventory: s.inventory as Record<MaterialId, number>,
      }
    },

    mutateCoins: makeNumericMutator(
      () => hostStoreFacade.getCoins(),
      (delta) => {
        hostStoreFacade.mutateCoins(delta)
        syncHostResource('coins', delta)
      },
    ),
    mutateGems: makeNumericMutator(
      () => hostStoreFacade.getGems(),
      (delta) => {
        hostStoreFacade.mutateGems(delta)
        syncHostResource('gems', delta)
      },
    ),
    mutateDiamonds: makeNumericMutator(
      () => hostStoreFacade.getDiamonds(),
      (delta) => {
        hostStoreFacade.mutateDiamonds(delta)
        syncHostResource('diamonds', delta)
      },
    ),
    mutateDice: makeNumericMutator(
      () => hostStoreFacade.getDiceCount(),
      (delta) => {
        hostStoreFacade.mutateDiceCount(delta)
        syncHostResource('diceCount', delta)
      },
    ),

    mutateMaterial: (id, delta) => {
      const cur = hostStoreFacade.getInventoryQty(id)
      if (delta < 0 && cur + delta < 0) return false
      hostStoreFacade.mutateInventory(id, delta)
      syncHostInventory(id, delta)
      return true
    },
  })
}
