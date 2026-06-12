/**
 * 📁 zone-memory/manifest.ts — 콘텐츠 모듈: 기억의 숲 (Memory Forest) (🌳)
 * 📌 역할: 신경쇠약 카드 매칭
 * 🔗 헌법: kind:'content'·route:'/island/memory'·primary:memory_piece
 *           customs.csv 보유 (PM 더미 룰 — Phase 1.5+ 작가/디자이너 검수 후 finalize)
 */
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'content',
  id: 'zone-memory',
  name: '기억의 숲 (Memory Forest)',
  version: '0.1.0',
  description: '신경쇠약 카드 매칭',
  tech: 'react',
  worldScope: 'home-island',
  requires: ['customs'],
  customs: 'customs.csv',
  balance: 'balance.csv',
  items: 'items.csv',
  route: '/island/memory',
  i18nNamespace: 'memory',
  assetCategory: 'backgrounds',
})
