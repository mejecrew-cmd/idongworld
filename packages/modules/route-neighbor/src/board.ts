/**
 * 📁 route-neighbor/src/board.ts — 30칸 보드 정의·미영입 캐릭터 배치
 * ───────────────────────────────────────────────
 * 📌 역할: 이웃섬 보드 슬롯 30개 템플릿 + 동적 캐릭터 배치 헬퍼.
 *           미영입 본진 캐릭터를 'character' 슬롯에 자동 매핑.
 *
 * 💡 frontend data/board.ts 의 NEIGHBOR_SLOT_TEMPLATE·buildNeighborRoute 와 정합.
 *     Phase 2: 본 모듈이 단일 진실 소스 — frontend 가 본 모듈 import.
 */
import type { BoardSlot } from './types.ts'

/** 30칸 슬롯 템플릿 (캐릭터 칸은 5개·주요 분포). */
export const NEIGHBOR_SLOT_TEMPLATE: BoardSlot[] = [
  { index: 0, type: 'start', label: '출항' },
  { index: 1, type: 'resource', label: '도토리 +5', meta: { resource: 'acorn', amount: 5 } },
  { index: 2, type: 'character', label: '캐릭터 1', meta: { slot: 'char-1' } },
  { index: 3, type: 'resource', label: '꽃 +3', meta: { resource: 'flower', amount: 3 } },
  { index: 4, type: 'treasure', label: '보물 (코인 +50)', meta: { resource: 'coins', amount: 50 } },
  { index: 5, type: 'empty', label: '잔잔한 바다' },
  { index: 6, type: 'character', label: '캐릭터 2', meta: { slot: 'char-2' } },
  { index: 7, type: 'storm', label: '폭풍', meta: { dicePenalty: 1 } },
  { index: 8, type: 'resource', label: '도토리 +10', meta: { resource: 'acorn', amount: 10 } },
  { index: 9, type: 'cutscene', label: '바다 풍경', meta: { callSiteId: 'route-neighbor:scenic-9' } },
  { index: 10, type: 'character', label: '캐릭터 3', meta: { slot: 'char-3' } },
  { index: 11, type: 'resource', label: '꽃 +5', meta: { resource: 'flower', amount: 5 } },
  { index: 12, type: 'empty', label: '석양' },
  { index: 13, type: 'treasure', label: '다이아 +1', meta: { resource: 'diamonds', amount: 1 } },
  { index: 14, type: 'character', label: '캐릭터 4', meta: { slot: 'char-4' } },
  { index: 15, type: 'resource', label: '도토리 +15', meta: { resource: 'acorn', amount: 15 } },
  { index: 16, type: 'storm', label: '큰 파도', meta: { dicePenalty: 2 } },
  { index: 17, type: 'empty', label: '안개' },
  { index: 18, type: 'character', label: '캐릭터 5', meta: { slot: 'char-5' } },
  { index: 19, type: 'resource', label: '꽃 +8', meta: { resource: 'flower', amount: 8 } },
  { index: 20, type: 'treasure', label: '보물 (코인 +100)', meta: { resource: 'coins', amount: 100 } },
  { index: 21, type: 'empty', label: '해류' },
  { index: 22, type: 'resource', label: '도토리 +20', meta: { resource: 'acorn', amount: 20 } },
  { index: 23, type: 'cutscene', label: '바다 신비', meta: { callSiteId: 'route-neighbor:scenic-23' } },
  { index: 24, type: 'storm', label: '회오리', meta: { dicePenalty: 2 } },
  { index: 25, type: 'resource', label: '꽃 +12', meta: { resource: 'flower', amount: 12 } },
  { index: 26, type: 'treasure', label: '다이아 +3', meta: { resource: 'diamonds', amount: 3 } },
  { index: 27, type: 'empty', label: '바람' },
  { index: 28, type: 'resource', label: '도토리 +25', meta: { resource: 'acorn', amount: 25 } },
  { index: 29, type: 'start', label: '귀항' },
]

/**
 * 미영입 캐릭터를 'character' 슬롯에 동적 배치.
 *
 * @param recruited - 이미 영입된 캐릭터 ID 배열
 * @param allCharacters - 전체 본진 5명 ID (gacha 풀에서)
 * @returns 캐릭터 슬롯에 ID 매핑된 BoardSlot[] (영입 완료자는 'empty' 처리)
 */
export function buildNeighborRoute(recruited: string[], allCharacters: string[]): BoardSlot[] {
  const unrecruited = allCharacters.filter((c) => !recruited.includes(c))
  let charIndex = 0
  return NEIGHBOR_SLOT_TEMPLATE.map((slot) => {
    if (slot.type !== 'character') return slot
    const charId = unrecruited[charIndex++]
    if (!charId) {
      // 모두 영입 완료 — character 칸을 빈 칸으로
      return { ...slot, type: 'empty' as const, label: '잔잔한 바다', meta: undefined }
    }
    return {
      ...slot,
      label: `${charId} 발견`,
      meta: { ...slot.meta, characterId: charId },
    }
  })
}
