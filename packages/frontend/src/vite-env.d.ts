/**
 * 📁 vite-env.d.ts — Vite 환경 변수 타입 선언
 * ───────────────────────────────────────────────
 * 📌 역할: `.env` 파일에서 `VITE_*` 로 시작하는 변수를 TypeScript가 인식하도록.
 *
 * 💡 초보자 안내:
 *   - import.meta.env.VITE_API_URL 같이 코드에서 쓸 때 자동완성·타입체크 활성화.
 *   - .env.local 파일에 `VITE_API_URL=http://localhost:4000` 추가 가능.
 *   - 타입 선언만 있는 파일이라 빌드 결과물에는 포함되지 않음.
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string  // backend API 주소 (기본: http://localhost:4000)
  readonly VITE_GA4_MEASUREMENT_ID?: string  // GA4 측정 ID (PM Q1)
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
  readonly VITE_SOCIAL_LOGIN_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// CSV ?raw 로더 (Vite) — balance.csv·customs.csv 빌드 시점 텍스트 import
declare module '*.csv?raw' {
  const content: string
  export default content
}
