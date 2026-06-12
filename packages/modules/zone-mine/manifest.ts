/**
 * 📁 zone-mine/manifest.ts — 콘텐츠 모듈: 도전의 절벽 (Mine) (⛏️)
 * 📌 역할: 광산 타일 파기 — 자재 채굴
 * 🔗 헌법: kind:'content'·route:'/island/mine'·primary:ore
 *           customs.csv 보유 (PM 더미 룰 — Phase 1.5+ 작가/디자이너 검수 후 finalize)
 */
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'content',
  id: 'zone-mine',
  name: '도전의 절벽 (Mine)',
  version: '0.1.0',
  description: '광산 타일 파기 — 자재 채굴',
  tech: 'react',
  worldScope: 'home-island',
  requires: ['customs'],
  customs: 'customs.csv',
  balance: 'balance.csv',
  items: 'items.csv',
  route: '/island/mine',
  i18nNamespace: 'mine',
  assetCategory: 'backgrounds',
})
