/**
 * packages/frontend/src/data/zones.ts
 * ------------------------------------------------------------
 * 역할: 마이섬 AREA-01~15 static definition의 frontend SoT다.
 * 연결: IslandFullMapScreen, dev catalog, 이후 myIslandStates.zoneSlots와 대응된다.
 * 주의: AREA-02 항구와 AREA-13 숙소는 anchor slot이므로 Aidong 편입 대상이 아니다.
 *       기존 구현 route는 M1 전환 중 호환을 위해 route/legacyRoute로 남긴다.
 */

export type ZonePhase = 1 | 2 | 3 | 4
export type ZoneKind = 'anchor' | 'fillable'
export type ZoneLockedReason = 'harbor' | 'lodge'

export interface Zone {
  id: string
  areaNo: string
  num: number
  name: string
  kind: ZoneKind
  phase: ZonePhase
  emoji: string
  emotion: string
  activity: string
  defaultUnlocked?: boolean
  route?: string
  legacyRoute?: string
  lockedReason?: ZoneLockedReason
}

export const ZONES: Zone[] = [
  {
    id: 'lighthouse',
    areaNo: 'AREA-01',
    num: 1,
    name: '꿈꾸는 등대',
    kind: 'fillable',
    phase: 1,
    emoji: '🗼',
    emotion: '미래의 길잡이',
    activity: '온보딩 힌트·길잡이',
    defaultUnlocked: true,
  },
  {
    id: 'harbor',
    areaNo: 'AREA-02',
    num: 2,
    name: '감정의 파도 항구',
    kind: 'anchor',
    phase: 1,
    emoji: '⛵',
    emotion: '떠남·돌아옴',
    activity: '항구·항해 진입',
    defaultUnlocked: true,
    route: '/island/harbor',
    legacyRoute: '/island/harbor',
    lockedReason: 'harbor',
  },
  {
    id: 'memory-forest',
    areaNo: 'AREA-03',
    num: 3,
    name: '기억의 숲',
    kind: 'fillable',
    phase: 1,
    emoji: '🌳',
    emotion: '추억·소중한 것',
    activity: '신경쇠약·일기 회독',
    defaultUnlocked: true,
    route: '/island/memory',
    legacyRoute: '/island/memory',
  },
  {
    id: 'worry-cave',
    areaNo: 'AREA-04',
    num: 4,
    name: '고민 해결 동굴',
    kind: 'fillable',
    phase: 2,
    emoji: '🕳️',
    emotion: '걱정·털어놓기',
    activity: '대화·우연 케어',
  },
  {
    id: 'confidence-waterfall',
    areaNo: 'AREA-05',
    num: 5,
    name: '자신감 폭포',
    kind: 'fillable',
    phase: 3,
    emoji: '💧',
    emotion: '흔들리는 자존감·다시',
    activity: '광산·시그니처 발화',
  },
  {
    id: 'oasis',
    areaNo: 'AREA-06',
    num: 6,
    name: '휴식의 오아시스',
    kind: 'fillable',
    phase: 1,
    emoji: '🌊',
    emotion: '쉼·평온',
    activity: '방치형·재우기',
    defaultUnlocked: true,
    route: '/island/oasis',
    legacyRoute: '/island/oasis',
  },
  {
    id: 'sand-square',
    areaNo: 'AREA-07',
    num: 7,
    name: '시간의 모래 광장',
    kind: 'fillable',
    phase: 4,
    emoji: '⏳',
    emotion: '시간의 가치',
    activity: '일기 5조각',
  },
  {
    id: 'reflection-trail',
    areaNo: 'AREA-08',
    num: 8,
    name: '성찰의 등산로',
    kind: 'fillable',
    phase: 3,
    emoji: '🥾',
    emotion: '자기 들여다보기',
    activity: '산책·일기 통편',
  },
  {
    id: 'goal-mountain',
    areaNo: 'AREA-09',
    num: 9,
    name: '목표의 반짝 산',
    kind: 'fillable',
    phase: 2,
    emoji: '✨',
    emotion: '작은 목표·이루는 기쁨',
    activity: '데뷔 무대 게이트',
  },
  {
    id: 'friendship-bridge',
    areaNo: 'AREA-10',
    num: 10,
    name: '우정의 다리',
    kind: 'fillable',
    phase: 2,
    emoji: '🌉',
    emotion: '관계·연결',
    activity: '동행·소셜 후보',
  },
  {
    id: 'creative-spring',
    areaNo: 'AREA-11',
    num: 11,
    name: '창의의 샘',
    kind: 'fillable',
    phase: 2,
    emoji: '🎨',
    emotion: '영감·표현',
    activity: '크래프팅·예술 능력치',
  },
  {
    id: 'challenge-cliff',
    areaNo: 'AREA-12',
    num: 12,
    name: '도전의 절벽',
    kind: 'fillable',
    phase: 1,
    emoji: '⛰️',
    emotion: '두려움·용기',
    activity: '광산·새 항로 도전',
    defaultUnlocked: true,
    route: '/island/mine',
    legacyRoute: '/island/mine',
  },
  {
    id: 'lodge',
    areaNo: 'AREA-13',
    num: 13,
    name: '꿈 조각 하우스',
    kind: 'anchor',
    phase: 1,
    emoji: '🏠',
    emotion: '안식처',
    activity: '숙소 SOOKSO·방 꾸미기·옷·밥',
    defaultUnlocked: true,
    route: '/island/lodge',
    legacyRoute: '/island/lodge',
    lockedReason: 'lodge',
  },
  {
    id: 'growth-garden',
    areaNo: 'AREA-14',
    num: 14,
    name: '성장의 정원',
    kind: 'fillable',
    phase: 1,
    emoji: '🌱',
    emotion: '천천히 자람',
    activity: '정원·재배',
    defaultUnlocked: true,
    route: '/island/garden',
    legacyRoute: '/island/garden',
  },
  {
    id: 'regret-lake',
    areaNo: 'AREA-15',
    num: 15,
    name: '반성의 호수',
    kind: 'fillable',
    phase: 4,
    emoji: '🪞',
    emotion: '비추어 봄',
    activity: '풀샷·도감 회독',
  },
]

export const PHASE_LABEL: Record<ZonePhase, string> = {
  1: 'M1 우선',
  2: '후속 확장 1',
  3: '후속 확장 2',
  4: 'M3+ 후속',
}

export const PHASE_COLOR: Record<ZonePhase, string> = {
  1: '#FFC8A2',
  2: '#A2C8FF',
  3: '#C8A2FF',
  4: '#A2FFC8',
}
