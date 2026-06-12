/**
 * 📁 host/manifest.ts — 광역 모듈 host
 * ───────────────────────────────────────────────
 * 📌 역할: 글로벌 자원·재화 (coins·gems·diamonds·diceCount·inventory) 단일 소유.
 *           다른 모듈은 본 모듈의 actions 를 통해서만 자원 변경.
 *
 * 🔗 헌법:
 *   - kind: 'global' (광역 — 항상 active)
 *   - storeSlice: 'host' (frontend zustand store 의 host slice)
 *   - 자원 차감/적립의 진실 소스
 *
 * 💡 사용 (Phase 2 정착): 다른 모듈은 useUserStore 직접 X → host actions 호출
 */
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'global',
  id: 'host',
  name: 'Host (호스트)',
  version: '0.1.0',
  description: '글로벌 자원·재화·인벤토리 단일 소유. 광역 — 항상 active.',
  storeSlice: 'host',
  balance: 'balance.csv',
  exports: [
    'getResources',         // 현재 자원 조회
    'rewardCoins',          // 코인 적립
    'rewardGems',           // 보석 적립
    'spendCoins',           // 코인 차감 (보유 부족 시 false)
    'spendGems',            // 보석 차감
    'addMaterial',          // 인벤토리 +1
    'consumeMaterial',      // 인벤토리 -1 (부족 시 false)
    'getInitialCoins',      // balance.csv: initial_coins
    'getInitialGems',       // balance.csv: initial_gems
    'getInitialDiamonds',   // balance.csv: initial_diamonds
    'getInitialDice',       // balance.csv: initial_dice
    'getDiceMaxCapacity',   // balance.csv: dice_max_capacity
    'getSyncDebounceMs',    // balance.csv: sync_debounce_ms
    'getBalance',           // 일반 조회
    'configure',            // DI
  ],
})
