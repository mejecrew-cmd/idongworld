/**
 * 📁 zone-memory/src/index.ts — 콘텐츠 모듈 표면 (스켈레톤)
 * 📌 역할: 추후 미니게임 컴포넌트 + 자원 ID 등록.
 *           현재는 manifest + customs/balance.csv 만 보유.
 */
export const ZONE_ID = 'zone-memory'
export const PRIMARY_RESOURCE = 'memory_piece'
export const I18N_NS = 'memory'
export { MemoryMiniGame } from './MemoryMiniGame.tsx'
export { configure } from './config.ts'
export type { MemoryCompletePayload, MemoryHooks } from './config.ts'

/** 본 모듈 자원 ID. */
export const MEMORY_RESOURCES = {
  PRIMARY: 'memory_piece',
} as const
