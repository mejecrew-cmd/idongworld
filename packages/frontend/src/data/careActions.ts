/**
 * 📁 data/careActions.ts — 14 케어 액션 카탈로그 SoT
 * ───────────────────────────────────────────────
 * 📌 역할: 다마고치코어 §6의 14 케어 액션 정의.
 *           기본 케어(시간대 한정), 자유 케어(쿨다운·일일 캡), 산책 등.
 *
 * 🔗 연결:
 *   - 기획 SoT: 모듈/다마고치코어.md §6 + 능력치파라메터.md §3
 *   - data/needs.ts → 어떤 욕구를 회복하는지
 *   - data/schedZone.ts → 시간대 활성화 판정
 *   - stores/userStore.ts → applyCareAction에서 적용
 *   - components/CareModal.tsx → 액션 버튼 그리드
 *
 * 💡 초보자 안내:
 *   - basic (시간대 한정): 깨우기·아침/점심/저녁밥·재우기·산책 (zones 필수)
 *   - free (시간 무관): 쓰다듬기·말걸기·간식·옷갈아입히기·칭찬·위로·놀기·이야기듣기
 *   - serendipity (특수 시각): 1주차 미구현
 *
 *   각 액션 필드:
 *   - needsRecover: 회복할 욕구·양 (예: { hunger: +5, social: +1 })
 *   - affinity: 친밀도 증가량
 *   - coinCost: 코인 차감
 *   - cooldownMin: 사용 후 대기 시간 (분)
 *   - dailyCap: 하루 최대 사용 횟수
 *   - zones: 활성 시간대 (없으면 모든 시간 가능)
 */
// ──────────────────────────────────────────────
// 데이터 연결 명시:
// 📊 SoT: 기획/모듈/다마고치코어.md §6 (14 케어 액션)
// 📊 능력치: 기획/모듈/능력치파라메터.md §3
// 📦 store: stores/userStore.ts (applyCareAction, careLog[char][actionId])
// 🔄 시간대 활성: data/schedZone.ts (zones 한정 케어)
// 🖼️ UI: components/CareModal.tsx (탭 basic/free + 액션 그리드)
// 📔 일기 트리거: components/DiaryFragmentToast.tsx (basic 카테고리만)
// 📚 카탈로그: /dev/catalog 11번 careAction 탭
// ──────────────────────────────────────────────
import type { NeedKey } from './needs'
import type { ZoneIdx } from './schedZone'

export type CareCategory = 'basic' | 'free' | 'serendipity'

export interface CareAction {
  id: string
  label: string
  emoji: string
  category: CareCategory
  zones?: ZoneIdx[]      // 활성 시간대 (basic만 — undefined = 모든 시간)
  needsRecover: Partial<Record<NeedKey, number>>
  affinity: number
  coinCost: number
  cooldownMin?: number   // 분
  dailyCap?: number
}

export const CARE_ACTIONS: CareAction[] = [
  // ── 기본 케어 (시간대 한정) — 6-1
  { id: 'wake', label: '깨우기', emoji: '🌅', category: 'basic',
    zones: [1], needsRecover: { energy: 3 }, affinity: 1, coinCost: 10, dailyCap: 1 },
  { id: 'breakfast', label: '아침밥', emoji: '🥐', category: 'basic',
    zones: [1], needsRecover: { hunger: 5, social: 1 }, affinity: 1, coinCost: 20, dailyCap: 1 },
  { id: 'lunch', label: '점심밥', emoji: '🍱', category: 'basic',
    zones: [2], needsRecover: { hunger: 5, fun: 1 }, affinity: 1, coinCost: 20, dailyCap: 1 },
  { id: 'dinner', label: '저녁밥', emoji: '🍲', category: 'basic',
    zones: [3], needsRecover: { hunger: 5, social: 1 }, affinity: 1, coinCost: 20, dailyCap: 1 },
  { id: 'sleep', label: '재우기', emoji: '😴', category: 'basic',
    zones: [4], needsRecover: { energy: 5, health: 1 }, affinity: 1, coinCost: 0, dailyCap: 1 },

  // ── 자유 케어 — 6-2
  { id: 'pet', label: '쓰다듬기', emoji: '✋', category: 'free',
    needsRecover: { social: 1 }, affinity: 1, coinCost: 5, cooldownMin: 30, dailyCap: 8 },
  { id: 'talk', label: '말걸기', emoji: '💬', category: 'free',
    needsRecover: { social: 1 }, affinity: 1, coinCost: 5, cooldownMin: 15, dailyCap: 12 },
  { id: 'snack', label: '간식', emoji: '🍪', category: 'free',
    needsRecover: { hunger: 1, fun: 1 }, affinity: 1, coinCost: 10, cooldownMin: 60, dailyCap: 4 },
  { id: 'dress', label: '옷갈아입히기', emoji: '👗', category: 'free',
    needsRecover: { hygiene: 3, fun: 1 }, affinity: 1, coinCost: 15, cooldownMin: 60, dailyCap: 3 },
  { id: 'praise', label: '칭찬하기', emoji: '✨', category: 'free',
    needsRecover: { social: 2 }, affinity: 2, coinCost: 0, cooldownMin: 120, dailyCap: 4 },
  { id: 'comfort', label: '위로하기', emoji: '🤗', category: 'free',
    needsRecover: { social: 2 }, affinity: 2, coinCost: 0, cooldownMin: 60, dailyCap: 4 },
  { id: 'play', label: '같이 놀기', emoji: '🎈', category: 'free',
    needsRecover: { fun: 3, social: 1 }, affinity: 2, coinCost: 0, cooldownMin: 90, dailyCap: 3 },
  { id: 'listen', label: '이야기 듣기', emoji: '👂', category: 'free',
    needsRecover: { social: 2, fun: 1 }, affinity: 1, coinCost: 0, cooldownMin: 60, dailyCap: 4 },

  // ── 산책 (점심 시퀀스만) — basic
  { id: 'walk', label: '산책', emoji: '🚶', category: 'basic',
    zones: [2], needsRecover: { fun: 2, energy: -1, hygiene: -1 }, affinity: 1, coinCost: 0, dailyCap: 2 },
]

export const ZONE_LABELS: Record<ZoneIdx, string> = {
  0: '낮 (휴식)',
  1: '🌅 기상·아침',
  2: '☀️ 점심',
  3: '🌆 저녁',
  4: '🌙 밤·잠',
}
