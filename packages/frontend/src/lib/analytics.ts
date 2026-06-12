/**
 * 📁 lib/analytics.ts — Google Analytics 4 (GA4) 통합
 * ───────────────────────────────────────────────
 * 📌 역할: GA4 측정 ID env (`VITE_GA4_MEASUREMENT_ID`) 활성 시 gtag.js 로드 + page view 추적.
 *           DUMMY 또는 미설정 시 no-op (1주차 베타 fallback).
 *
 * 🔗 연결:
 *   - .env.local (VITE_GA4_MEASUREMENT_ID)
 *   - main.tsx → bootstrapAnalytics() 1회
 *   - 화면 라우팅 시 trackPageView 자동 호출 (App.tsx 또는 useEffect)
 *
 * 💡 PM 결정 (Q1 2026-05-10): Firebase Auth + GA4 채택.
 *     게스트 무한 입장 정책 (POC 6/23 까지 동일).
 */

const MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined

/** GA4 활성 여부 — env 미설정 또는 DUMMY 시 false. */
export const isAnalyticsEnabled =
  Boolean(MEASUREMENT_ID) &&
  !String(MEASUREMENT_ID).includes('DUMMY') &&
  !String(MEASUREMENT_ID).startsWith('G-DUMMY')

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataLayer?: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void
  }
}

let _initialized = false

/**
 * GA4 gtag.js 동적 로드 + 초기화. main.tsx 에서 1회.
 * 미활성 환경에서는 no-op.
 */
export function bootstrapAnalytics(): void {
  if (!isAnalyticsEnabled || _initialized) return
  if (typeof document === 'undefined') return

  // gtag.js 스크립트 동적 삽입
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window.gtag = function gtag(...args: any[]): void {
    window.dataLayer!.push(args)
  }
  window.gtag('js', new Date())
  // SPA — 자동 page view 비활성, 라우팅 시 수동 호출
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false })

  _initialized = true
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info(`[analytics] GA4 활성: ${MEASUREMENT_ID}`)
  }
}

/**
 * SPA page view 추적 — 라우팅 시 호출.
 * @param path - 현재 경로 (예: '/island/garden')
 * @param title - 페이지 제목 (선택)
 */
export function trackPageView(path: string, title?: string): void {
  if (!isAnalyticsEnabled || !window.gtag) return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title ?? document.title,
  })
}

/**
 * 게임 이벤트 추적 — 가챠·영입·zone 해금 등.
 * GA4 권장 이벤트 또는 커스텀 이벤트.
 *
 * @example
 *   trackEvent('aidong_recruited', { character_id: '황금멍', source: 'first-gacha' })
 *   trackEvent('zone_unlocked', { zone_id: 'garden' })
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function trackEvent(name: string, params?: Record<string, any>): void {
  if (!isAnalyticsEnabled || !window.gtag) return
  window.gtag('event', name, params ?? {})
}
