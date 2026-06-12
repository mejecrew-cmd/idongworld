/**
 * 📁 lib/gachaBootstrap.ts — gacha DI 부트스트랩
 * ───────────────────────────────────────────────
 * 📌 역할: 앱 시작 시 @idongworld/gacha 에 frontend 의존성을 주입.
 *           - onAttempt: 시도 카운트 증가 (userStore.firstGachaAttempts++)
 *
 * 🔗 연결:
 *   - main.tsx → bootstrapGacha() 1회 호출
 *   - stores/userStore.ts (firstGachaAttempts 갱신)
 *
 * 💡 초보자 안내:
 *   - gacha 모듈은 store 를 모름 — 여기서 한 번만 연결.
 *   - 풀별 통계가 필요하면 onAttempt(poolId) 의 poolId 로 분기 가능.
 */
import { configure } from '@idongworld/gacha'
import { myAidongStoreFacade } from './storeFacades'

/** 앱 시작 시 1회. main.tsx 의 bootstrapVNRunner 직후 권장. */
export function bootstrapGacha(): void {
  configure({
    onAttempt: (poolId) => {
      // 1주차: 첫 만남 가챠만 카운트. 추후 풀별 통계 분기.
      if (poolId === 'first-meeting') {
        myAidongStoreFacade.incrementFirstGachaAttempts()
      }
    },

    // 시나리오 trigger 'gacha_retry' 명시적 카운트 (onAttempt 와 별도)
    incrementRetry: (poolId) => {
      if (poolId === 'first-meeting') {
        myAidongStoreFacade.incrementFirstGachaAttempts()
      }
    },
  })
}
