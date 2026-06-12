/**
 * 📁 route-neighbor/manifest.ts — 콘텐츠 모듈: 이웃섬 항해 (부루마블 30칸)
 * ───────────────────────────────────────────────
 * 📌 역할: 30칸 보드·주사위·칸 도착·갑판 적재.
 *           본진 5명 미영입 칸 동적 배치 (gacha 풀 활용).
 *
 * 🔗 헌법: kind:'content'·route:'/voyage/board'
 *           requires: customs (도토리 → 갑판)
 *           고유 자원: 'deck-cargo' (갑판 적재량)
 */
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'content',
  id: 'route-neighbor',
  name: '이웃섬 항로',
  version: '0.1.0',
  description: '부루마블 30칸 보드·주사위·캐릭터 칸 영입·자원 칸·폭풍·보물.',
  tech: 'react',
  worldScope: 'voyage-route',
  requires: ['customs'],
  customs: 'customs.csv',
  items: 'items.csv',
  route: '/voyage',
  i18nNamespace: 'route-neighbor',
  assetCategory: 'backgrounds',
})
