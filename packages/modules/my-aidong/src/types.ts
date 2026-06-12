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


