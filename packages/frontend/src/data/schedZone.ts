/**
 * 📁 data/schedZone.ts — 5존 시간대 헬퍼
 * ───────────────────────────────────────────────
 * 📌 역할: 현재 시각을 5존(휴식·아침·점심·저녁·밤) 중 하나로 분류.
 *           backend의 scheduler.ts와 동일 로직 (VVNS 직이식).
 *
 * 🔗 연결:
 *   - Backend: packages/backend/src/utils/scheduler.ts (동일 로직)
 *   - data/careActions.ts → 시간대 한정 케어 액션 활성화 판정
 *   - components/HUD.tsx → 시간대 chip 표시
 *   - 기획 SoT: 모듈/다마고치코어.md §7-1
 *
 * 💡 초보자 안내:
 *   - zone 0: 낮·휴식 (10~13, 16~17, 20~22)
 *   - zone 1: 🌅 기상·아침 (5~12)
 *   - zone 2: ☀️ 점심 (13~16)
 *   - zone 3: 🌆 저녁 (17~20)
 *   - zone 4: 🌙 밤·잠 (22~04)
 *   - 시퀀스 진입 = zone 변경 = 욕구 -1 감소 트리거
 */

export type ZoneIdx = 0 | 1 | 2 | 3 | 4

export function getZoneIdx(hours: number): ZoneIdx {
  if (hours >= 5 && hours < 12) return 1
  if (hours >= 13 && hours < 16) return 2
  if (hours >= 17 && hours < 20) return 3
  if ((hours >= 22 && hours < 24) || (hours >= 0 && hours < 4)) return 4
  return 0
}

export function getCurrentZone(): ZoneIdx {
  return getZoneIdx(new Date().getHours())
}
