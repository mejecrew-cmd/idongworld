/**
 * 📁 data/materials.ts — 인벤토리 자재 카탈로그
 * ───────────────────────────────────────────────
 * 📌 역할: 게임 안 모든 자재·아이템 ID·이름·이모지·카테고리.
 *
 * 🔗 연결:
 *   - SoT: 기획/모듈/크래프팅.md (Phase 2 본격) + 미니게임·보드 보상
 *   - store: stores/userStore.ts (inventory: Record<itemId, qty>)
 *   - 사용처: 미니게임·보드 칸·시나리오 trigger (give_material)
 *   - 카탈로그: /dev/catalog (자재 탭 — 후속 추가 예정)
 *
 * 💡 초보자 안내:
 *   - basic_food: 자원섬·재배·자재. 영입·간식·밥에 사용.
 *   - rest_token: 휴식 토큰. 오아시스에서 획득.
 *   - memory_piece: 기억의 숲 미니게임 보상. 일기 통편 트리거 (Phase 3).
 *   - ore: 광산 미니게임 보상. 공방 자재 (Phase 2).
 *   - basic_water: 정원 자재 (Phase 2 활성).
 *   - basic_wood: 공방 자재 (Phase 2).
 */

export type MaterialCategory = 'food' | 'rest' | 'memory' | 'ore' | 'craft' | 'gift'

export interface Material {
  id: string
  name: string
  emoji: string
  category: MaterialCategory
  description: string
  source: string  // 어디서 획득
  use: string     // 어디에 쓰임
  phase: 1 | 2 | 3
}

export const MATERIALS: Record<string, Material> = {
  basic_food: {
    id: 'basic_food', name: '기본 음식', emoji: '🥐', category: 'food',
    description: '간단한 빵·견과 등 휴대 음식.',
    source: '재배(정원)·자원섬·보드 보상·시나리오 분기',
    use: '영입(자재 건넴)·간식 케어·밥 차리기',
    phase: 1,
  },
  rest_token: {
    id: 'rest_token', name: '휴식 토큰', emoji: '🌿', category: 'rest',
    description: '오아시스의 잔잔한 시간이 결정으로 응축됨.',
    source: '방치 미니게임(오아시스) · 자유 케어 누적',
    use: '재우기 강화·기분 회복(Phase 1.5)',
    phase: 1,
  },
  memory_piece: {
    id: 'memory_piece', name: '기억 조각', emoji: '💎', category: 'memory',
    description: '풍경의 한 조각이 빛으로 굳음.',
    source: '신경쇠약 미니게임(기억의 숲)·자원섬',
    use: '일기 통편 트리거(Phase 3)·도감 회독 보상',
    phase: 1,
  },
  ore: {
    id: 'ore', name: '광물', emoji: '⛏️', category: 'ore',
    description: '도전의 절벽에서 나오는 원석.',
    source: '광산 미니게임(절벽)',
    use: '공방 자재(Phase 2)·시그니처 제작',
    phase: 1,
  },
  basic_water: {
    id: 'basic_water', name: '맑은 물', emoji: '💧', category: 'craft',
    description: '정원 식물에 쓰이는 깨끗한 물.',
    source: '오아시스·자원섬',
    use: '정원 워크스테이션(Phase 2)',
    phase: 2,
  },
  basic_wood: {
    id: 'basic_wood', name: '나무', emoji: '🪵', category: 'craft',
    description: '도구·가구의 기본 자재.',
    source: '자원섬·공방',
    use: '숙소 가구 제작(Phase 2)',
    phase: 2,
  },
  flower: {
    id: 'flower', name: '꽃', emoji: '🌸', category: 'gift',
    description: '하트섬에 피는 작은 꽃.',
    source: '청소 마지막 단계·정원',
    use: '선물·우연 케어',
    phase: 1,
  },
}

export const MATERIAL_LIST = Object.values(MATERIALS)
