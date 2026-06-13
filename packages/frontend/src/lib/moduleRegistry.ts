/**
 * packages/frontend/src/lib/moduleRegistry.ts - 모듈 manifest 등록
 * ------------------------------------------------------------
 * 역할: 앱 시작 시 모든 module manifest를 @idongworld/core registry에 등록한다.
 * 연결: main.tsx가 registerModules()를 호출하고, moduleRegistry.test.ts가 등록 결과를 검증한다.
 * 주의: 새 모듈을 추가하면 manifest import와 ALL_MANIFESTS 배열을 함께 갱신한다.
 */
import { registerAll, validate, listAll } from '@idongworld/core'

// 시스템 모듈
import vnRunnerManifest from '@idongworld/vn-runner/manifest'
import gachaManifest from '@idongworld/gacha/manifest'
import cutsceneRunnerManifest from '@idongworld/cutscene-runner/manifest'
import customsManifest from '@idongworld/customs/manifest'

// 광역 모듈
import hostManifest from '@idongworld/host/manifest'
import accountManifest from '@idongworld/account/manifest'
import myAidongManifest from '@idongworld/my-aidong/manifest'
import myIslandManifest from '@idongworld/my-island/manifest'
import codexManifest from '@idongworld/codex/manifest'
import shipManifest from '@idongworld/ship/manifest'

// 콘텐츠 모듈
import lodgeManifest from '@idongworld/lodge/manifest'
import zoneGardenManifest from '@idongworld/zone-garden/manifest'
import zoneOasisManifest from '@idongworld/zone-oasis/manifest'
import zoneMemoryManifest from '@idongworld/zone-memory/manifest'
import zoneMineManifest from '@idongworld/zone-mine/manifest'
import routeNeighborManifest from '@idongworld/route-neighbor/manifest'
import destinationShellIslandManifest from '@idongworld/destination-shell-island/manifest'
import aidongIslandManifest from '@idongworld/aidong-island/manifest'

const ALL_MANIFESTS = [
  // 광역 모듈 (6)
  hostManifest,
  accountManifest,
  myAidongManifest,
  myIslandManifest,
  codexManifest,
  shipManifest,
  // 시스템 모듈 (4)
  vnRunnerManifest,
  gachaManifest,
  cutsceneRunnerManifest,
  customsManifest,
  // 콘텐츠 모듈 (8)
  lodgeManifest,
  zoneGardenManifest,
  zoneOasisManifest,
  zoneMemoryManifest,
  zoneMineManifest,
  routeNeighborManifest,
  destinationShellIslandManifest,
  aidongIslandManifest,
]

export function registerModules(): void {
  registerAll(ALL_MANIFESTS)
  validate()
  if (import.meta.env.DEV) {
    const all = listAll()
    // eslint-disable-next-line no-console
    console.info(
      `[modules] 등록 ${all.length}개`,
      all.map((m) => `${m.kind}:${m.id}@${m.version}`).join(', '),
    )
  }
}
