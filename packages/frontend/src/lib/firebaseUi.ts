/**
 * FirebaseUI는 v9+ compat namespace API를 요구한다.
 * 기존 앱의 modular Firebase helper와 분리해 AuthUI 전용 compat app/auth를 제공한다.
 */
import firebase from 'firebase/compat/app'
import 'firebase/compat/auth'
import * as firebaseui from 'firebaseui'
import 'firebaseui/dist/firebaseui.css'
import { isFirebaseEnabled } from './firebase'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const PROVIDER_BY_ID = {
  google: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
  facebook: firebase.auth.FacebookAuthProvider.PROVIDER_ID,
  x: firebase.auth.TwitterAuthProvider.PROVIDER_ID,
  apple: 'apple.com',
} as const

export type FirebaseUiProviderId = keyof typeof PROVIDER_BY_ID

export interface StartFirebaseUiOptions {
  container: string | Element
  providers?: FirebaseUiProviderId[]
  onSignInSuccess: (authResult: firebaseui.auth.AuthResult) => boolean | Promise<boolean>
  onUiShown?: () => void
}

export function isFirebaseUiEnabled(): boolean {
  return isFirebaseEnabled
}

function getCompatAuth(): firebase.auth.Auth | null {
  if (!isFirebaseUiEnabled()) return null
  if (!firebase.apps.length) {
    firebase.initializeApp(config)
  }
  return firebase.auth()
}

export function startFirebaseUi(options: StartFirebaseUiOptions): firebaseui.auth.AuthUI | null {
  const auth = getCompatAuth()
  if (!auth) return null

  const ui = firebaseui.auth.AuthUI.getInstance() ?? new firebaseui.auth.AuthUI(auth)
  ui.start(options.container, {
    signInFlow: 'popup',
    signInOptions: (options.providers ?? ['google', 'x']).map((provider) => ({
      provider: PROVIDER_BY_ID[provider],
    })),
    tosUrl: '/setting',
    privacyPolicyUrl: '/setting',
    callbacks: {
      signInSuccessWithAuthResult: options.onSignInSuccess,
      uiShown: options.onUiShown,
    },
  })
  return ui
}
