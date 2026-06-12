/**
 * lodge/src/types.ts - lodge 모듈 공개 타입
 *
 * 역할: 숙소 화면과 bootstrap/facade가 공유할 숙소 상태 형태를 정의한다.
 * 연결: backend lodgeStates 문서의 주요 필드와 같은 이름을 사용한다.
 * 주의: 숙소 인벤토리의 item ID 목록은 추후 item catalog 작업에서 모듈 내부 정의로 확장한다.
 */
export type LodgeInventory = Record<string, number>

export interface LodgeStateSnapshot {
  lodgeInventory: LodgeInventory
  assignedAidongs: string[]
  rooms: Record<string, unknown>
  furniture: Record<string, unknown>
}

export type LodgeMutateResult = boolean
