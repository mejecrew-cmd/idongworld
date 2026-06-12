/**
 * 📁 lib/busBridge.ts — bus 이벤트 → DEV 콘솔 + GA4 trackEvent 브릿지
 * ───────────────────────────────────────────────
 * 📌 역할: @idongworld/core/bus 의 표준 이벤트를 listen 해서:
 *           - DEV 빌드: console.info 로 디버그 로그
 *           - GA4 활성: trackEvent 자동 forward
 *
 * 🔗 연결:
 *   - main.tsx → bootstrapBusBridge() 1회
 *   - lib/analytics.ts (GA4 trackEvent)
 *   - @idongworld/core/bus BusEventMap (12 표준 이벤트)
 *
 * 💡 정착 정책:
 *   - 모듈은 emit 만, 본 파일이 listen 만 → 결합도 0
 *   - GA4 이벤트 명명 컨벤션: bus 키 그대로 (snake/colon → underscore 변환)
 *   - 화면별 추가 listen 은 각 화면에서 직접 (본 파일은 통합 텔레메트리만)
 */
import { bus } from '@idongworld/core'
import { trackEvent } from './analytics'

/** bus 키 → GA4 이벤트명 (콜론·하이픈 → 언더스코어). */
function toGA4Name(busKey: string): string {
  return busKey.replace(/[:-]/g, '_')
}

export function bootstrapBusBridge(): void {
  // 모든 표준 이벤트를 listen (선언적·BusEventMap 의 이벤트 키 직접 명시)
  const STANDARD_EVENTS = [
    'aidong:recruited',
    'aidong:settled',
    'aidong:affinity-changed',
    'aidong:care-applied',
    'gacha:picked',
    'gacha:retry',
    'zone:unlocked',
    'zone:cleared',
    'tutorial:complete',
    'codex:diary-unlocked',
    'codex:slot-unlocked',
    'codex:fully-registered',
    'customs:applied',
    'cutscene:played',
  ] as const

  for (const evt of STANDARD_EVENTS) {
    bus.on(evt, (payload) => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info(`[bus] ${evt}`, payload)
      }
      trackEvent(toGA4Name(evt), payload as Record<string, unknown>)
    })
  }
}
