/**
 * lodge/manifest.ts - content module: 숙소
 *
 * 역할: 내 섬의 숙소 화면과 숙소 전용 상태를 정식 모듈 registry에 올린다.
 * 연결: frontend의 기존 /island/lodge 화면은 유지하고, backend는 lodgeStates 전용 문서를 권위로 삼는다.
 * 주의: 숙소 인벤토리로 들어오거나 나가는 자원 이동은 직접 수정하지 않고 customs를 통해 처리한다.
 */
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'content',
  id: 'lodge',
  name: '숙소',
  version: '0.1.0',
  description: 'Aidong 휴식, 숙소 배치, 숙소 전용 인벤토리를 소유하는 내 섬 숙소 모듈.',
  tech: 'react',
  worldScope: 'lodge',
  requires: ['customs'],
  customs: 'customs.csv',
  balance: 'balance.csv',
  items: 'items.csv',
  decor: 'decor.csv',
  route: '/island/lodge',
  i18nNamespace: 'lodge',
  assetCategory: 'backgrounds',
})
