import { defineManifest } from '@idongworld/core'

export const manifest = defineManifest({
  kind: 'content',
  id: 'destination-shell-island',
  name: '조개빛 섬',
  version: '0.1.0',
  description: '항해 중 도착하는 고정맵 탐험 섬 prototype',
  tech: 'react',
  worldScope: 'destination-island',
  requires: ['customs'],
  route: '/voyage/island/shell',
  items: 'items.csv',
  balance: 'balance.csv',
  customs: 'customs.csv',
  assetCategory: 'backgrounds',
})

export const destinationShellIslandDataFiles = {
  scenes: 'scenes.csv',
  hotspots: 'hotspots.csv',
  missions: 'missions.csv',
}

export default manifest
