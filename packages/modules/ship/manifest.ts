/**
 * 📁 ship/manifest.ts — 광역 모듈: 배
 * ───────────────────────────────────────────────
 * 📌 역할: 항해에 사용하는 단일 선박 상태를 소유한다.
 *           배 종류, 선실, 갑판, 선박 인벤토리의 module identity를 제공한다.
 *
 * 🔗 헌법: kind:'global'·storeSlice:'ship'
 *           route-neighbor 같은 항로 콘텐츠는 본 모듈 상태를 직접 수정하지 않고 ship API/customs를 통한다.
 *
 * 💡 현재 단계:
 *   - backend에는 이미 shipStates dedicated storage와 ship action API가 존재한다.
 *   - 본 manifest는 ship을 정식 모듈 레지스트리에 올리는 1차 작업이다.
 *   - 배 종류와 선실/갑판 slot config는 후속 작업에서 balance/config로 분리한다.
 */
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'global',
  id: 'ship',
  name: 'Ship (배)',
  version: '0.1.0',
  description: '항해 선박·선실·갑판·선박 인벤토리 상태를 소유하는 광역 모듈.',
  storeSlice: 'ship',
  worldScope: 'ship',
  balance: 'balance.csv',
  customs: 'customs.csv',
  items: 'items.csv',
  decor: 'decor.csv',
  exports: [
    'getShipState',
    'listShipTypes',
    'getShipType',
    'getDefaultShipType',
    'toggleHarborAssign',
    'chargeDiceFromHarbor',
    'configure',
  ],
})
