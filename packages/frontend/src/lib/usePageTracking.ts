/**
 * 📁 lib/usePageTracking.ts — react-router 위치 변화 → GA4 page view 추적
 * ───────────────────────────────────────────────
 * 📌 역할: useLocation 변화 감지 → trackPageView 호출.
 * 🔗 App.tsx 또는 main.tsx 에서 사용 (한 번 마운트).
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from './analytics'

export function usePageTracking(): void {
  const location = useLocation()
  useEffect(() => {
    trackPageView(location.pathname + location.search)
  }, [location])
}
