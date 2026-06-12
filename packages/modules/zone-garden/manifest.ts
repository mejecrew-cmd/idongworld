/**
 * 📁 zone-garden/manifest.ts — 콘텐츠 모듈: 정원 구역
 * ───────────────────────────────────────────────
 * 📌 역할: 마이섬 정원 구역 (꽃·도토리 채집·미니게임).
 *           헌법 §3 콘텐츠 모듈 첫 시범 (Phase 1.5-9).
 *
 * 🔗 헌법:
 *   - kind: 'content'
 *   - requires: 시스템 모듈 사용 (customs)
 *   - customs: 자체 customs.csv 보유 (도토리 → 코인·갑판 자원)
 *   - balance: balance.csv (zone 해금은 게임 phase 기준 — 친밀도 무관)
 *   - i18nNamespace: 'zone-garden' (작가가 모듈 i18n/{ko,en}.json 채움)
 *   - assetCategory: 'backgrounds' (구역 배경) + 'audio' (BGM)
 */
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'content',
  id: 'zone-garden',
  name: '정원 (Garden)',
  version: '0.1.0',
  description: '마이섬 정원 구역. 꽃·도토리 채집·미니게임. 콘텐츠 모듈 첫 시범 (1.5-9).',
  tech: 'react',
  worldScope: 'home-island',
  requires: ['customs'],          // 도토리 → 글로벌 자원 변환에 customs 사용
  customs: 'customs.csv',         // 본 모듈 폴더 기준 상대 경로
  balance: 'balance.csv',
  items: 'items.csv',
  route: '/island/garden',
  i18nNamespace: 'zone-garden',
  assetCategory: 'backgrounds',
})
