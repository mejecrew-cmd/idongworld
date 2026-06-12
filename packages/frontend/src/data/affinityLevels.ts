/**
 * 📁 data/affinityLevels.ts — 친밀도 Lv 0~10 임계값 SoT
 * ───────────────────────────────────────────────
 * 📌 역할: 친밀도 score → Lv 변환 + Lv별 호칭·해금.
 *
 * 🔗 연결:
 *   - SoT: 기획/모듈/능력치파라메터.md §3-7 (Lv 0~3까지만 명시)
 *   - SoT: 기획/모듈/다마고치코어.md §8 (Lv 진화)
 *   - store: stores/userStore.ts addAffinity (Lv 자동 계산)
 *   - 사용처: CareModal·HubHeartScene·LodgeScene
 *
 * 💡 초보자 안내:
 *   - Lv 0~3은 능력치파라메터.md SoT 그대로
 *   - Lv 4~10은 본 파일에서 임시 제안 (Phase 1.5 PM 락 권장)
 *   - 호칭: Lv별 캐릭터가 호스트 부르는 톤 변화
 *   - unlock: Lv 도달 시 자동 해금 (액션·콘텐츠)
 */

export interface AffinityLevel {
  level: number
  threshold: number  // 누적 score 최소값
  callName: string   // 캐릭터가 호스트 부르는 호칭
  unlock?: string    // 해당 Lv 해금 콘텐츠
  diaryLayer?: 'surface' | 'middle' | 'deep'  // 일기 노출 레이어
}

export const AFFINITY_LEVELS: AffinityLevel[] = [
  { level: 0,  threshold: 0,    callName: '당신',   diaryLayer: 'surface' },
  { level: 1,  threshold: 10,   callName: '당신',   unlock: '간식주기·말걸기 활성', diaryLayer: 'surface' },
  { level: 2,  threshold: 25,   callName: '그쪽',   unlock: '옷 슬롯 1벌 해금', diaryLayer: 'surface' },
  { level: 3,  threshold: 50,   callName: '친구야', unlock: '시그니처 1회 미리보기 + 일기 통편 #1', diaryLayer: 'middle' },
  { level: 4,  threshold: 100,  callName: '친구야', unlock: '햄찌·우연 케어 활성', diaryLayer: 'middle' },
  { level: 5,  threshold: 175,  callName: '너',     unlock: '데뷔 스테이지 풀 해금·시그니처 활성', diaryLayer: 'middle' },
  { level: 6,  threshold: 275,  callName: '너',     unlock: '일기 깊은 레이어 진입', diaryLayer: 'deep' },
  { level: 7,  threshold: 400,  callName: '너',     unlock: '시즌 한정 의상·이스터에그', diaryLayer: 'deep' },
  { level: 8,  threshold: 550,  callName: '내 사람', unlock: '대화 깊이 +1 (AI 페르소나)', diaryLayer: 'deep' },
  { level: 9,  threshold: 750,  callName: '내 사람', unlock: '특별 일기 통편 + 사진 카드', diaryLayer: 'deep' },
  { level: 10, threshold: 1000, callName: '소중한 사람', unlock: '진화 최종·시그니처 마스터', diaryLayer: 'deep' },
]

export function calcLevel(score: number): number {
  for (let i = AFFINITY_LEVELS.length - 1; i >= 0; i--) {
    if (score >= AFFINITY_LEVELS[i]!.threshold) return AFFINITY_LEVELS[i]!.level
  }
  return 0
}

export function getCallName(level: number): string {
  return AFFINITY_LEVELS[level]?.callName ?? '당신'
}
