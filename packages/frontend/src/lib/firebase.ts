/**
 * 📁 lib/firebase.ts — Firebase 클라이언트 SDK 초기화
 * ───────────────────────────────────────────────
 * 📌 역할: 환경변수 활성 시 Firebase Auth 사용 가능 — 미설정 시 게스트 fallback.
 *           accountBootstrap.ts 가 본 모듈을 import 해 광역 account actions 와 연결.
 *
 * 🔗 연결:
 *   - .env.local (VITE_FIREBASE_*)
 *   - lib/accountBootstrap.ts → Firebase 활성 시 doLoginGuest 가 signInAnonymously 호출
 *   - Auth_정책_초안_v0.1_260510.md §3 Step 2
 *
 * 💡 동작:
 *   - 환경변수 누락 시 isFirebaseEnabled = false → 기존 게스트 흐름 유지
 *   - 환경변수 완비 시 isFirebaseEnabled = true → Firebase Auth 활성
 */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  TwitterAuthProvider,
  onAuthStateChanged,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'

export type SocialAuthProvider = 'google' | 'twitter'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

function isRealFirebaseValue(value: unknown): boolean {
  if (!value) return false
  return !/DUMMY|REPLACE_ME|000000000000/.test(String(value))
}

/** 환경변수 모두 채워진 경우만 활성. DUMMY/REPLACE_ME 값은 `false` 처리. */
export const isFirebaseEnabled =
  isRealFirebaseValue(config.apiKey) &&
  isRealFirebaseValue(config.authDomain) &&
  isRealFirebaseValue(config.projectId) &&
  isRealFirebaseValue(config.appId)

let _app: FirebaseApp | null = null
let _auth: Auth | null = null

/** Firebase 앱 lazy init. 비활성 환경에서는 null. */
export function getFirebase(): { app: FirebaseApp; auth: Auth } | null {
  if (!isFirebaseEnabled) return null
  if (!_app) {
    _app = initializeApp(config)
    _auth = getAuth(_app)
  }
  return _app && _auth ? { app: _app, auth: _auth } : null
}

/** 게스트 (익명) 로그인 — anonymous Firebase user. */
export async function firebaseSignInGuest(): Promise<User | null> {
  const fb = getFirebase()
  if (!fb) return null
  const cred = await signInAnonymously(fb.auth)
  return cred.user
}

/** Google 로그인 — 팝업 흐름. */
export async function firebaseSignInGoogle(): Promise<User | null> {
  const fb = getFirebase()
  if (!fb) return null
  const provider = new GoogleAuthProvider()
  const cred = await signInWithPopup(fb.auth, provider)
  return cred.user
}

export async function firebaseSignInTwitter(): Promise<User | null> {
  const fb = getFirebase()
  if (!fb) return null
  const provider = new TwitterAuthProvider()
  const cred = await signInWithPopup(fb.auth, provider)
  return cred.user
}

export async function firebaseSignInSocial(providerId: SocialAuthProvider): Promise<User | null> {
  return providerId === 'google'
    ? firebaseSignInGoogle()
    : firebaseSignInTwitter()
}

/** 로그아웃. */
export async function firebaseSignOut(): Promise<void> {
  const fb = getFirebase()
  if (!fb) return
  await signOut(fb.auth)
}

/**
 * 인증 상태 구독.
 * Firebase 비활성 시 즉시 null 콜백 1회 호출 + unsubscribe = noop.
 */
export function onFirebaseAuthChanged(cb: (user: User | null) => void): () => void {
  const fb = getFirebase()
  if (!fb) {
    cb(null)
    return () => {}
  }
  return onAuthStateChanged(fb.auth, cb)
}

/** 현재 idToken 조회 — backend 요청 헤더용. */
export async function getCurrentIdToken(): Promise<string | null> {
  const fb = getFirebase()
  if (!fb) return null
  const u = fb.auth.currentUser
  if (!u) return null
  return u.getIdToken()
}
