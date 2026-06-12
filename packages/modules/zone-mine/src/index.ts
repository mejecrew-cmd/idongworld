/**
 * 📁 zone-mine/src/index.ts — 콘텐츠 모듈 표면 (스켈레톤)
 * 📌 역할: 추후 미니게임 컴포넌트 + 자원 ID 등록.
 *           현재는 manifest + customs/balance.csv 만 보유.
 */
export const ZONE_ID = 'zone-mine'
export const PRIMARY_RESOURCE = 'ore'
export const I18N_NS = 'mine'
export { MineMiniGame } from './MineMiniGame.tsx'
export { configure } from './config.ts'
export type { MineCollectPayload, MineCompletePayload, MineHooks } from './config.ts'

/** 본 모듈 자원 ID. */
export const MINE_RESOURCES = {
  PRIMARY: 'ore',
} as const
