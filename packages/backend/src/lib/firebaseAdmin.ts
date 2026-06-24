/**
 * packages/backend/src/lib/firebaseAdmin.ts
 * ------------------------------------------------------------
 * 역할: Firebase Admin SDK를 lazy initialize하고 ID token 검증을 감싼다.
 * 연결: auth middleware가 Bearer token을 검증할 때 이 파일의 verifyIdToken()을 사용한다.
 * 주의: env가 비어 있거나 dummy 값이면 Firebase 검증을 비활성화하고 legacy/dev auth 흐름으로 내려간다.
 */
import admin from 'firebase-admin'

const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY

// Firebase private key는 .env에서 escaped newline 형태로 들어올 수 있어 실제 개행으로 복원한다.
const privateKey = privateKeyRaw?.replace(/\\n/g, '\n')

// 필수 Firebase env가 모두 있고 dummy 값이 아닐 때만 Admin SDK 검증을 활성화한다.
export const isFirebaseAdminEnabled =
  Boolean(projectId) &&
  Boolean(clientEmail) &&
  Boolean(privateKey) &&
  !String(clientEmail).includes('dummy') &&
  !String(privateKey).includes('DUMMY')

let _initialized = false

// Firebase Admin lazy init:
// 설정이 없으면 false를 반환하고, 이미 초기화되어 있으면 재초기화하지 않는다.
export function ensureFirebaseAdmin(): boolean {
  if (!isFirebaseAdminEnabled) return false
  if (_initialized) return true
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  }
  _initialized = true
  return true
}

// Firebase ID token 검증:
// token이 없거나 Admin SDK가 비활성화된 환경에서는 null을 반환해 legacy/dev auth 흐름을 허용한다.
export async function verifyIdToken(idToken: string | undefined): Promise<{
  uid: string
  email?: string
  emailVerified?: boolean
  displayName?: string
  photoURL?: string
  signInProvider?: string
  isAnonymous: boolean
} | null> {
  if (!idToken) return null
  if (!ensureFirebaseAdmin()) return null
  try {
    const decoded = await admin.auth().verifyIdToken(idToken)
    return {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified,
      displayName: decoded.name,
      photoURL: decoded.picture,
      signInProvider: decoded.firebase?.sign_in_provider,
      isAnonymous: decoded.firebase?.sign_in_provider === 'anonymous',
    }
  } catch {
    return null
  }
}

export { admin }








