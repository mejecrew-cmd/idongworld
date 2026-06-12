/**
 * 📁 lib/myIslandBootstrap.ts — my-island 광역 모듈 DI
 * ───────────────────────────────────────────────
 * 📌 역할: my-island 모듈에 빌드 컨텍스트·사용자 진행·zone unlock 훅 주입.
 *           zone unlock 2-gate 평가 (build phase + condition DSL — 친밀도 무관).
 *
 * 🔗 연결:
 *   - main.tsx → bootstrapMyIsland() 1회
 *   - shared-data/aidong-master/characters.csv (recruitedCount 매핑)
 *   - 모듈분리작업계획_v1_260510.md §10.3 1.5-18·1.5-19 (정착 완료)
 *
 * 💡 정착 정책:
 *   - buildPhase·updateId 는 빌드 시 정해짐 (현재는 1·update_v0_1 하드코딩).
 *   - userProgress 는 useUserStore 백업 — Phase 2 에 my-island 자체 store slice 추가 검토.
 */
import { configure } from '@idongworld/my-island'
import { applyActionApiResponse } from './actionApiSync'
import { api } from './api'
import { accountStoreFacade, myIslandStoreFacade } from './storeFacades'

const MODULE_ACTION_API_SYNC = import.meta.env.VITE_MODULE_ACTION_API_SYNC === 'true'

function syncMyIslandState(zoneId: string): void {
  if (!MODULE_ACTION_API_SYNC) return
  const uid = accountStoreFacade.getFirebaseUid()
  if (!uid) return
  void api.unlockMyIslandZone(uid, zoneId)
    .then(applyActionApiResponse)
    .catch((error) => console.warn('[my-island] unlock zone api failed', error))
}

function syncAccountState(): void {
  if (!MODULE_ACTION_API_SYNC) return
  const uid = accountStoreFacade.getFirebaseUid()
  if (!uid) return
  void api.completeMyIslandTutorial(uid)
    .then(applyActionApiResponse)
    .catch((error) => console.warn('[my-island] tutorial api failed', error))
}

export function bootstrapMyIsland(): void {
  configure({
    // Gate A — 빌드·업데이트 컨텍스트 (코드 빌드 시점에 결정)
    getBuildContext: () => ({
      buildPhase: 1,                  // 현재 Phase 1 — Phase 1.5 진입 시 1.5
      updateId: 'update_v0_1',        // 빌드 버전 ID
      // activeSeason 미설정 — Phase 2 시즌 도입 시 활성
    }),

    // Gate B — 사용자 진행 컨텍스트 (store 백업)
    getUserProgress: () => myIslandStoreFacade.getUserProgress(),

    doUnlockZone: (zoneId) => {
      myIslandStoreFacade.unlockZone(zoneId)
      syncMyIslandState(zoneId)
    },

    doMarkZoneClear: (_zoneId) => {
      // Phase 2 — clearedZones 추가 시 활성
      // 현재는 no-op (튜토리얼·prev_zone_clear 조건이 사용 안 됨)
    },

    doCompleteTutorial: () => {
      accountStoreFacade.setOnboardingComplete(true)
      syncAccountState()
    },
  })
}
