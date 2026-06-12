/**
 * 📁 my-island/manifest.ts — 광역 모듈: 마이섬
 * ───────────────────────────────────────────────
 * 📌 역할: 마이섬 zone 해금 state·튜토리얼 진행도·구역 클리어 기록 단일 소유.
 *           zone-* 콘텐츠 모듈은 본 모듈에서 unlock state 조회.
 *
 * 🔗 헌법: kind:'global'·storeSlice:'my-island'
 *           zone 해금 정책 2-gate (build phase + unlock_condition) — 친밀도 무관.
 */
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'global',
  id: 'my-island',
  name: 'My Island (마이섬)',
  version: '0.1.0',
  description: 'zone 해금 state·튜토리얼 진행도·구역 클리어 기록.',
  storeSlice: 'my-island',
  balance: 'balance.csv',
  exports: [
    'isZoneUnlocked',
    'getUnlockedZones',
    'unlockZone',
    'isTutorialComplete',
    'completeTutorial',
    'getZoneClearCount',
    'incrementZoneClear',
    'evaluateUnlockCondition',  // unlockEvaluator
    'configure',
  ],
})
