/**
 * my-aidong/src/types.ts
 * ------------------------------------------------------------
 * 역할: Aidong 영입, 친밀도, 욕구, 케어 결과에 쓰는 공유 타입을 정의한다.
 * 연결: frontend userStore, my-aidong actions, backend my-aidong state가 같은 의미의 shape를 공유한다.
 * 주의: 타입을 바꿀 때는 frontend action facade와 backend model/spec의 필드명도 함께 확인한다.
 */
/** 6개 욕구 key. frontend data/needs.ts와 같은 의미를 유지한다. */
export type NeedKey = 'hunger' | 'energy' | 'social' | 'hygiene' | 'fun' | 'health'

/** Aidong 한 명의 친밀도 상태. */
export interface Affinity {
  /** 누적 친밀도 점수. */
  score: number
  /** 점수를 단계로 매핑한 결과. */
  level: number
}

/** Aidong 한 명의 6개 욕구 상태. 값 범위는 기본적으로 0~10이다. */
export type NeedsState = Record<NeedKey, number>

/** 케어 액션 사용 로그. 하루 cap과 cooldown 검증에 사용한다. */
export interface CareLogEntry {
  /** 마지막 적용 날짜. YYYY-MM-DD. */
  lastDate: string
  /** 오늘 적용한 횟수. */
  countToday: number
  /** 마지막 적용 timestamp(ms). cooldown 계산에 사용한다. */
  lastAt: number
}

/**
 * 케어 액션 적용 결과.
 * frontend userStore와 backend action API가 같은 응답 의미를 공유한다.
 */
export interface CareApplyResult {
  /** 성공 여부. */
  ok: boolean
  /** 실패 사유. */
  reason?: 'wrong_zone' | 'cooldown' | 'cap' | 'no_coins' | 'no_char'
  /** 친밀도 변화량. */
  affinityDelta?: number
}



/** Aidong별 25칸 도감 아이템 희귀도. 6월 POC에서는 표시와 테스트 분기에만 사용한다. */
export type AidongCodexItemRarity = 'common' | 'rare' | 'epic' | 'legendary'

/** 도감 아이템의 1차 획득처 분류. 실제 지급 검증은 backend service가 담당한다. */
export type AidongCodexItemSourceType =
  | 'zone-production'
  | 'zone-clear'
  | 'voyage-island'
  | 'stage-placeholder'
  | 'event-placeholder'
  | 'test'

/**
 * Aidong 한 명에게 귀속되는 25칸 도감 아이템 catalog 행.
 * 수량 원장은 myAidongStates.aidongCodexItems가 담당하고, 이 타입은 static catalog만 표현한다.
 */
export interface AidongCodexItem {
  /** 아이템이 귀속되는 Aidong character id. 예: 황금멍 */
  characterId: string
  /** 전역 유일 item id. */
  itemId: string
  /** UI 표시명. */
  name: string
  /** Aidong별 도감 slot 번호. 1~25. */
  slotNo: number
  /** 표시/보상 연출용 희귀도. */
  rarity: AidongCodexItemRarity
  /** 주 획득처 분류. */
  sourceType: AidongCodexItemSourceType
  /** sourceType 내부의 구체 id. 예: zone-garden, stage-debut */
  sourceId: string
  /** 적용 단계. 예: Phase 1 */
  phase: string
  /** 운영/기획 설명. */
  description: string
}
/** Aidong별 미니게임이 재사용할 공통 engine id. */
export type AidongMinigameEngineId = 'garden-grow' | 'idle-rest' | 'memory-match' | 'mine-dig'

/**
 * Aidong별 미니게임 skin catalog 행.
 * 실제 미니게임 결과 검증과 보상 지급은 backend service가 담당하고, 이 타입은 static 연결 정보만 표현한다.
 */
export interface AidongMinigameSkin {
  /** 스킨이 귀속되는 Aidong character id. 예: 황금멍 */
  characterId: string
  /** 전역 유일 skin id. */
  skinId: string
  /** 재사용할 공통 미니게임 engine id. */
  engineId: AidongMinigameEngineId
  /** 미니게임 1회 입장에 필요한 item id. 미확정이면 빈 문자열. */
  entryItemId: string
  /** 완료 보상으로 연결할 item id. Aidong 도감템 또는 후속 placeholder. */
  rewardItemId: string
  /** backend가 보상 계산 시 참고할 기본 지급 수량 후보. */
  rewardAmount: number
  /** skin 배경 asset id 후보. */
  backgroundAssetId: string
  /** skin 주요 오브젝트 asset id 후보. */
  objectAssetId: string
  /** 현재 연결 후보 zone module id. */
  zoneModuleId: string
  /** 적용 단계. 예: Phase 1 */
  phase: string
  /** 운영/기획 설명. */
  description: string
}
