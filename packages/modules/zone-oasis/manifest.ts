/**
 * 📁 zone-oasis/manifest.ts — 콘텐츠 모듈: 오아시스 (Oasis) (🏖️)
 * 📌 역할: 휴식·방치형 자원 적립 (시간당 자동)
 * 🔗 헌법: kind:'content'·route:'/island/oasis'·primary:rest_token
 *           customs.csv 보유 (PM 더미 룰 — Phase 1.5+ 작가/디자이너 검수 후 finalize)
 */
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'content',
  id: 'zone-oasis',
  name: '오아시스 (Oasis)',
  version: '0.1.0',
  description: '휴식·방치형 자원 적립 (시간당 자동)',
  tech: 'react',
  worldScope: 'home-island',
  requires: ['customs'],
  customs: 'customs.csv',
  balance: 'balance.csv',
  items: 'items.csv',
  route: '/island/oasis',
  i18nNamespace: 'oasis',
  assetCategory: 'backgrounds',
})
