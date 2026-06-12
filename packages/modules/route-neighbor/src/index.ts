/**
 * 📁 route-neighbor/src/index.ts — @idongworld/route-neighbor 공개 표면
 *
 * 사용 (Phase 2 정착):
 *   - frontend data/board.ts 가 본 모듈 import 로 단일화
 *   - NavigationBoardScene 이 processLanding 호출
 */
export type * from './types.ts'
export { NEIGHBOR_SLOT_TEMPLATE, buildNeighborRoute } from './board.ts'
export { processLanding } from './landing.ts'

export const ROUTE_ID = 'route-neighbor'
