/**
 * 📁 data/board.ts — 부루마블 보드·항로 SoT
 * ───────────────────────────────────────────────
 * 📌 역할: 항해 보드 30칸 정의 + 항로 카탈로그 (이웃섬 항로 등).
 *           영입되지 않은 본진 4명을 동적으로 4 칸에 배치.
 *
 * 🔗 연결:
 *   - 기획 SoT: 모듈/부루마블보드.md v0.2 + 섬슬롯.md v0.1
 *   - screens/HarborScene.tsx → 항로 리스트
 *   - screens/NavigationBoardScene.tsx → 보드 그리드 + 주사위 + 칸 도착
 *   - screens/IslandLandingScene.tsx → 캐릭터 칸 도착 시 영입 시나리오
 *
 * 💡 초보자 안내:
 *   - SlotType 6종:
 *     · home: 마이섬 (시작/도착)
 *     · character: 본진 4명 개인섬 (영입 가능)
 *     · treasure: 보물 (코인 +30~60)
 *     · storm: 폭풍 (코인 -10)
 *     · resource: 자원섬 (음식·기억조각)
 *     · empty: 빈 바다 (코인 +2)
 *   - buildNeighborRoute(recruited): 이미 영입한 캐릭터를 빼고
 *     남은 4명을 character 칸 4곳에 동적 매핑.
 *   - ROUTE_CATALOG: 항구에서 보이는 항로 목록 (이웃섬·별빛·고양이귀 등).
 *     unlocked=true인 것만 출항 가능.
 */
// ──────────────────────────────────────────────
// 데이터 연결 명시:
// 📊 SoT: 기획/모듈/부루마블보드.md v0.2 + 기획/모듈/섬슬롯.md v0.1
// 📦 store 매핑: stores/userStore.ts (recruitedAidongs → buildNeighborRoute)
// 🖼️ UI: screens/NavigationBoardScene.tsx (6×5 그리드) + screens/HarborScene.tsx (항로 리스트)
// 📚 카탈로그: /dev/catalog 6번 boardSlot 탭
// 🔮 확장: Phase 2 별빛·고양이 귀 항로 (currently coming soon)
//
// 🧩 모듈 정착 진행 (Phase 1.5-10):
//   - ROUTE_ID 는 @idongworld/route-neighbor 의 ROUTE_ID 와 정합 (단일 진실 소스)
//   - customs.csv (갑판 → 코인/보석) 는 모듈에서 등록 (frontend customsBootstrap)
//   - Phase 2 정착: NEIGHBOR_SLOT_TEMPLATE·buildNeighborRoute 본 모듈로 완전 이전
//     현재는 UI 친화 shape (emoji·label) 유지 위해 frontend 본 파일에 보관.
// ──────────────────────────────────────────────
import type { AidongCharacterId } from '@/stores/userStore'
import { ROUTE_ID as MODULE_ROUTE_ID } from '@idongworld/route-neighbor'

/** 모듈 ROUTE_ID 와 정합 검증 — 빌드 시점 catch. */
const _ROUTE_ID_CHECK: typeof MODULE_ROUTE_ID = 'route-neighbor'
void _ROUTE_ID_CHECK

export type SlotType =
  | 'home'        // 마이섬 (시작/도착)
  | 'character'   // 본진 4명 개인섬 (영입 가능)
  | 'treasure'    // 보물 (자재·코인)
  | 'storm'       // 폭풍 (이벤트·페널티 약함)
  | 'resource'    // 자원섬 (자재 풍부)
  | 'empty'       // 빈 바다 (안전·작은 보상)

export interface BoardSlot {
  index: number
  type: SlotType
  characterId?: AidongCharacterId
  label: string
  emoji: string
}

export interface Route {
  id: string
  name: string
  subtitle: string
  description: string
  slotsCount: number
  unlocked: boolean
  comingSoon?: boolean
  slots: BoardSlot[]
}

// 이웃섬 항로 30칸 — 본진 5명 중 픽되지 않은 4명이 4칸에 배치
// (런타임에서 character 4명 동적 매핑)
const NEIGHBOR_SLOT_TEMPLATE: Omit<BoardSlot, 'characterId'>[] = [
  { index: 0, type: 'home', label: '마이섬', emoji: '🏝️' },
  { index: 1, type: 'empty', label: '빈 바다', emoji: '🌊' },
  { index: 2, type: 'empty', label: '빈 바다', emoji: '🌊' },
  { index: 3, type: 'storm', label: '폭풍', emoji: '🌀' },
  { index: 4, type: 'character', label: '이웃 친구 1', emoji: '🐾' },
  { index: 5, type: 'empty', label: '빈 바다', emoji: '🌊' },
  { index: 6, type: 'resource', label: '자원섬', emoji: '🌴' },
  { index: 7, type: 'treasure', label: '보물', emoji: '💎' },
  { index: 8, type: 'empty', label: '빈 바다', emoji: '🌊' },
  { index: 9, type: 'empty', label: '빈 바다', emoji: '🌊' },
  { index: 10, type: 'character', label: '이웃 친구 2', emoji: '🐾' },
  { index: 11, type: 'empty', label: '빈 바다', emoji: '🌊' },
  { index: 12, type: 'empty', label: '빈 바다', emoji: '🌊' },
  { index: 13, type: 'treasure', label: '보물', emoji: '💎' },
  { index: 14, type: 'resource', label: '자원섬', emoji: '🌴' },
  { index: 15, type: 'storm', label: '폭풍', emoji: '🌀' },
  { index: 16, type: 'empty', label: '빈 바다', emoji: '🌊' },
  { index: 17, type: 'character', label: '이웃 친구 3', emoji: '🐾' },
  { index: 18, type: 'empty', label: '빈 바다', emoji: '🌊' },
  { index: 19, type: 'empty', label: '빈 바다', emoji: '🌊' },
  { index: 20, type: 'treasure', label: '보물', emoji: '💎' },
  { index: 21, type: 'empty', label: '빈 바다', emoji: '🌊' },
  { index: 22, type: 'resource', label: '자원섬', emoji: '🌴' },
  { index: 23, type: 'character', label: '이웃 친구 4', emoji: '🐾' },
  { index: 24, type: 'empty', label: '빈 바다', emoji: '🌊' },
  { index: 25, type: 'storm', label: '폭풍', emoji: '🌀' },
  { index: 26, type: 'treasure', label: '보물', emoji: '💎' },
  { index: 27, type: 'empty', label: '빈 바다', emoji: '🌊' },
  { index: 28, type: 'resource', label: '자원섬', emoji: '🌴' },
  { index: 29, type: 'empty', label: '빈 바다', emoji: '🌊' },
]

const ALL_AIDONGS: AidongCharacterId[] = ['황금멍', '춤냥', '양털곰', '단풍볼', '날카여우']

/**
 * 이웃섬 항로 칸을 알려진 영입 캐릭터 목록 기반으로 동적 생성.
 * - 영입 안 된 4명을 character 칸 4곳(4·10·17·23)에 순서대로 배치.
 */
export function buildNeighborRoute(recruited: AidongCharacterId[]): Route {
  const remaining = ALL_AIDONGS.filter((id) => !recruited.includes(id))
  const charSlotIndices = [4, 10, 17, 23]

  const slots: BoardSlot[] = NEIGHBOR_SLOT_TEMPLATE.map((s) => {
    if (s.type === 'character') {
      const slotOrder = charSlotIndices.indexOf(s.index)
      const ch = remaining[slotOrder]
      return ch
        ? { ...s, characterId: ch, label: `${ch}의 섬`, emoji: '🐾' }
        : { ...s, type: 'empty', label: '빈 바다', emoji: '🌊' }
    }
    return s
  })

  return {
    id: 'neighbor',
    name: '이웃섬 항로',
    subtitle: 'Neighbor Islands',
    description: '본진 친구들의 이웃섬을 도는 첫 항로. 30칸·1d6 주사위.',
    slotsCount: 30,
    unlocked: true,
    slots,
  }
}

export const ROUTE_CATALOG: Pick<Route, 'id' | 'name' | 'subtitle' | 'description' | 'unlocked' | 'comingSoon'>[] = [
  {
    id: 'neighbor',
    name: '이웃섬 항로',
    subtitle: 'Neighbor Islands · 30칸',
    description: '본진 친구들의 이웃섬을 도는 첫 항로',
    unlocked: true,
  },
  {
    id: 'starlight',
    name: '별빛 항로',
    subtitle: 'Starlight Route',
    description: '시즌 한정 별빛 섬 (Phase 2)',
    unlocked: false,
    comingSoon: true,
  },
  {
    id: 'cat_ear',
    name: '고양이 귀 항로',
    subtitle: 'Cat Ear Route',
    description: '고양이 친구들이 사는 군도 (Phase 2)',
    unlocked: false,
    comingSoon: true,
  },
]

export const SLOT_TYPE_COLOR: Record<SlotType, string> = {
  home: '#FFC8A2',
  character: '#FFE7B0',
  treasure: '#FFD700',
  storm: '#999AB5',
  resource: '#A2E5C8',
  empty: '#D4E5FF',
}
