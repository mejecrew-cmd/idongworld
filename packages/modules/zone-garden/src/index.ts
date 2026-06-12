/**
 * 📁 zone-garden/src/index.ts — 정원 콘텐츠 모듈 표면
 * ───────────────────────────────────────────────
 * 📌 역할: 정원 구역의 자원 ID·세관 룰 등록 헬퍼.
 *           실 UI (GardenMiniGame) 는 Phase 1.5-9 다음 단계에서 본 모듈로 이동.
 *           현재는 manifest + customs 등록 패턴 확립.
 */
export { GardenMiniGame } from './GardenMiniGame.tsx'
export { configure } from './config.ts'
export type { GardenHarvestPayload, GardenHooks } from './config.ts'

export const ZONE_ID = 'zone-garden'

/** 본 모듈이 산출하는 자원 ID. */
export const GARDEN_RESOURCES = {
  ACORN: 'acorn',
  FLOWER: 'flower',
} as const

/** 본 모듈의 customs.csv 텍스트 (build time embed). */
// CSV 파일 자체는 manifest 의 customs 필드로 참조.
// 빌드 타임 import 는 향후 Vite raw 로더 활성 시 추가.

/** 본 모듈의 i18n namespace. */
export const I18N_NS = 'garden'
