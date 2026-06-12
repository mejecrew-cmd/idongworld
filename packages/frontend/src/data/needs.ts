/**
 * 📁 data/needs.ts — 캐릭터 6 욕구 모델 SoT
 * ───────────────────────────────────────────────
 * 📌 역할: 다마고치 코어의 6 욕구(배고픔·활력·사회·청결·즐거움·건강) 정의.
 *           각 캐릭터마다 0~10 스케일로 보유. 시퀀스 진입 시 -1 감소.
 *
 * 🔗 연결:
 *   - 기획 SoT: 모듈/다마고치코어.md §5 (욕구 모델)
 *   - stores/userStore.ts → 캐릭터별 needs 저장·감소·회복
 *   - data/careActions.ts → 케어 액션이 어떤 욕구를 회복하는지
 *   - components/CareModal.tsx → 6 욕구 게이지 UI 표시
 *
 * 💡 초보자 안내:
 *   - calcMoodScore: 6 욕구 평균 → mood_score
 *   - moodFromScore: score → mood (excited·happy·normal·worried·sad·sleepy)
 *   - moodToExpression: mood → 5표정 (PNG 작화 5종에 매핑)
 *     · sad·worried → worried PNG로 통합
 *     · excited·happy → happy PNG로 통합
 *   - 잠 시퀀스(zone 4) 진입 시 mood_score 무관하게 sleepy 강제.
 */

// ──────────────────────────────────────────────
// 데이터 연결 명시:
// 📊 SoT: 기획/모듈/다마고치코어.md §5 (6 욕구 모델)
// 📊 친밀도 임계: 기획/모듈/능력치파라메터.md §3-7
// 📦 store: stores/userStore.ts (needs[charId][NeedKey], affinities[charId])
// 🔄 감소: stores/userStore.ts tickSequenceDecay (zone 진입 시 -1)
// 💝 회복: data/careActions.ts (CARE_ACTIONS의 needsRecover)
// 🖼️ UI: components/CareModal.tsx (6 게이지 LinearProgress)
// 🎭 표정: moodToExpression → AidongSprite expression prop
// 📚 카탈로그: /dev/catalog 13번 need 탭
// ──────────────────────────────────────────────

export type NeedKey = 'hunger' | 'energy' | 'social' | 'hygiene' | 'fun' | 'health'

export const NEED_LABELS: Record<NeedKey, { ko: string; emoji: string }> = {
  hunger: { ko: '배고픔', emoji: '🍽️' },
  energy: { ko: '활력', emoji: '⚡' },
  social: { ko: '사회', emoji: '💬' },
  hygiene: { ko: '청결', emoji: '🛁' },
  fun: { ko: '즐거움', emoji: '🎈' },
  health: { ko: '건강', emoji: '💪' },
}

export const NEED_KEYS: NeedKey[] = ['hunger', 'energy', 'social', 'hygiene', 'fun', 'health']

export const INITIAL_NEEDS: Record<NeedKey, number> = {
  hunger: 8, energy: 8, social: 7, hygiene: 8, fun: 7, health: 9,
}

// 다마고치코어 §5-2 mood_score → mood
export type MoodKey = 'excited' | 'happy' | 'normal' | 'worried' | 'sad' | 'sleepy'

export function calcMoodScore(needs: Record<NeedKey, number>): number {
  const sum = NEED_KEYS.reduce((acc, k) => acc + (needs[k] ?? 0), 0)
  return sum / NEED_KEYS.length
}

export function moodFromScore(score: number, isSleepZone = false): MoodKey {
  if (isSleepZone) return 'sleepy'
  if (score >= 8) return 'excited'
  if (score >= 6) return 'happy'
  if (score >= 4) return 'normal'
  if (score >= 2) return 'worried'
  return 'sad'
}

// PNG 표정으로 정합 (5표정만 — sad·excited는 흡수)
export type ExpressionId = 'normal' | 'happy' | 'surprised' | 'worried' | 'sleepy'

export function moodToExpression(mood: MoodKey): ExpressionId {
  if (mood === 'sleepy') return 'sleepy'
  if (mood === 'excited' || mood === 'happy') return 'happy'
  if (mood === 'worried' || mood === 'sad') return 'worried'
  return 'normal'
}
