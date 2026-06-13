import { defineManifest } from '@idongworld/core'

export const manifest = defineManifest({
  kind: 'content',
  id: 'aidong-island',
  name: '아이동섬',
  version: '0.1.0',
  description: '항해 중 만나는 Aidong 영입용 M22 섬 module skeleton',
  tech: 'react',
  worldScope: 'destination-island',
  requires: [],
  route: '/voyage/island/:id',
  assetCategory: 'backgrounds',
})

export const aidongIslandDataFiles = {
  scenes: 'scenes.csv',
  hotspots: 'hotspots.csv',
}

export default manifest