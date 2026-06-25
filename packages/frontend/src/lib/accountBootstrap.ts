/**
 * packages/frontend/src/lib/accountBootstrap.ts
 * ------------------------------------------------------------
 * 역할: account 모듈에 로그인/로그아웃 구현을 주입하고 Firebase Auth 상태를 local store와 backend state에 연결한다.
 * 연결: Firebase Auth -> /api/auth/session -> split state hydrate 순서로 계정별 진행상황을 복구한다.
 * 주의: Firebase observer에서 uid만 저장하면 빈 local state로 화면이 먼저 열릴 수 있으므로, 로그인 복구 시 hydrate를 반드시 시도한다.
 */
import { configure } from '@idongworld/account'
import {
  isFirebaseEnabled,
  firebaseSignInGuest,
  firebaseSignOut,
  onFirebaseAuthChanged,
} from './firebase'
import { api } from './api'
import { clearPasswordSessionToken } from './api'
import { accountStoreFacade } from './storeFacades'
import { hydrateSplitState } from './syncStore'

function readSessionProvider(providerId?: string): 'google' | 'twitter' | 'firebase' {
  if (providerId === 'google.com') return 'google'
  if (providerId === 'twitter.com') return 'twitter'
  return 'firebase'
}

export function bootstrapAccount(): void {
  configure({
    getState: () => {
      const state = accountStoreFacade.getAccountState()
      return {
        firebaseUid: state.firebaseUid,
        isGuest: state.isGuest,
        nickname: state.nickname,
        hostName: state.hostName,
      }
    },

    doLoginGuest: () => {
      if (isFirebaseEnabled) {
        void firebaseSignInGuest().catch((error) => {
          console.warn('[account] Firebase signInGuest failed; using local guest fallback', error)
          accountStoreFacade.loginGuest()
        })
        return
      }

      accountStoreFacade.loginGuest()
    },

    doLogout: () => {
      clearPasswordSessionToken()
      accountStoreFacade.logout()
      if (isFirebaseEnabled) {
        void firebaseSignOut().catch(() => {
          // Local logout already happened.
        })
      }
    },

    doSetNickname: (nickname) => accountStoreFacade.setNickname(nickname),
  })

  if (!isFirebaseEnabled) return

  onFirebaseAuthChanged((user) => {
    if (!user) {
      clearPasswordSessionToken()
      accountStoreFacade.logout()
      return
    }

    const providerId = user.providerData?.[0]?.providerId
    accountStoreFacade.mergeAccountState({
      firebaseUid: user.uid,
      isGuest: user.isAnonymous,
      nickname: user.displayName ?? 'guest',
    })

    void api.authSession(user.uid, {
      provider: readSessionProvider(providerId),
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    })
      .then(() => hydrateSplitState(user.uid))
      .catch((error) => {
        console.warn('[account] failed to hydrate Firebase account session', error)
      })
  })
}
