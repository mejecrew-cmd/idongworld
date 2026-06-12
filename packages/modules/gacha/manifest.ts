/**
 * 📁 gacha/manifest.ts — 가챠 시스템 모듈 manifest
 * ───────────────────────────────────────────────
 * 📌 역할: 본진 5명 첫 가챠 + Phase 2 본 가챠의 픽·확률 엔진 신분증.
 *
 * 🔗 연결:
 *   - @idongworld/core/manifests
 *   - 모듈분리작업계획_v1_260510.md §6.2
 *   - 기획 SoT: 모듈/가챠.md v0.2 (1회 무료 + BM)
 */
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'system',
  id: 'gacha',
  name: 'Gacha System',
  version: '0.1.0',
  description: '가챠 풀·픽·확률·시도 카운트 — 1주차 첫 가챠 균등 1/5 + Phase 2 가중치',
  tech: 'react',
  balance: 'balance.csv',
  exports: [
    'firstGachaPick',  // 첫 만남 가챠 1회 (5명 균등)
    'pick',            // 일반 픽 (가중치 지원)
    'getScenarioId',   // 캐릭터 ID → 시나리오 영문 ID (recruit_X·settle_X)
    'configure',       // DI: onAttempt 콜백
    'FIRST_GACHA_POOL', // 5명 풀 read-only
  ],
})
