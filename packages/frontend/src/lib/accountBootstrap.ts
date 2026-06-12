/**
 * 📁 lib/accountBootstrap.ts — account 광역 모듈 DI + Firebase 통합
 * ───────────────────────────────────────────────
 * 📌 역할: account 모듈에 useUserStore + Firebase Auth 백업 훅 주입.
 *           Firebase 활성 (env 완비) 시 signInAnonymously·signInWithPopup,
 *           비활성 시 기존 게스트 흐름 유지.
 *
 * 🔗 연결:
 *   - main.tsx → bootstrapAccount() 1회
 *   - lib/firebase.ts (isFirebaseEnabled·firebaseSignInGuest·firebaseSignOut)
 *   - Auth_정책_초안 §3 Step 2
 */
import { configure } from '@idongworld/account'
import {
  isFirebaseEnabled,
  firebaseSignInGuest,
  firebaseSignOut,
  onFirebaseAuthChanged,
} from './firebase'
import { accountStoreFacade } from './storeFacades'

export function bootstrapAccount(): void {
  configure({
    getState: () => {
      const s = accountStoreFacade.getAccountState()
      return {
        firebaseUid: s.firebaseUid,
        isGuest: s.isGuest,
        nickname: s.nickname,
        hostName: s.hostName,
      }
    },

    doLoginGuest: () => {
      if (isFirebaseEnabled) {
        // Firebase 익명 로그인 — uid 는 onFirebaseAuthChanged 가 store 에 동기
        void firebaseSignInGuest().catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('[account] Firebase signInGuest 실패 → 게스트 fallback', err)
          accountStoreFacade.loginGuest()
        })
      } else {
        // Firebase 비활성 — 기존 로컬 게스트
        accountStoreFacade.loginGuest()
      }
    },

    doLogout: () => {
      if (isFirebaseEnabled) {
        void firebaseSignOut().catch(() => {
          // 실패해도 로컬 logout 강행
        })
      }
      accountStoreFacade.logout()
    },

    doSetNickname: (nickname) => accountStoreFacade.setNickname(nickname),
  })

  // Firebase 인증 상태 → store 동기 (활성 시만)
  if (isFirebaseEnabled) {
    onFirebaseAuthChanged((user) => {
      if (user) {
        accountStoreFacade.mergeAccountState({
          firebaseUid: user.uid,
          isGuest: user.isAnonymous,
          nickname: user.displayName ?? '게스트',
        })
      }
    })
  }
}
