/**
 * packages/frontend/src/i18n/index.ts - 공통/모듈 i18n namespace 통합
 * ------------------------------------------------------------
 * 역할: i18next를 초기화하고 각 모듈의 i18n/{ko,en}.json을 namespace로 등록한다.
 * 연결: module package를 추가하면 해당 모듈의 i18n/index.ts를 import하고 MODULE_I18N에 넣는다.
 * 주의: 공통 namespace는 public/locales에서, 모듈 namespace는 정적 import로 로드한다.
 */
import i18n from 'i18next'
import HttpBackend from 'i18next-http-backend'
import { initReactI18next } from 'react-i18next'
import { registerNamespaces, collectNamespaces, type ModuleI18n } from '@idongworld/core'

import hostI18n from '@idongworld/host/i18n'
import accountI18n from '@idongworld/account/i18n'
import myAidongI18n from '@idongworld/my-aidong/i18n'
import myIslandI18n from '@idongworld/my-island/i18n'
import codexI18n from '@idongworld/codex/i18n'
import vnRunnerI18n from '@idongworld/vn-runner/i18n'
import gachaI18n from '@idongworld/gacha/i18n'
import cutsceneRunnerI18n from '@idongworld/cutscene-runner/i18n'
import customsI18n from '@idongworld/customs/i18n'
import lodgeI18n from '@idongworld/lodge/i18n'
import zoneGardenI18n from '@idongworld/zone-garden/i18n'
import zoneOasisI18n from '@idongworld/zone-oasis/i18n'
import zoneMemoryI18n from '@idongworld/zone-memory/i18n'
import zoneMineI18n from '@idongworld/zone-mine/i18n'
import routeNeighborI18n from '@idongworld/route-neighbor/i18n'

const MODULE_I18N: ModuleI18n[] = [
  hostI18n, accountI18n, myAidongI18n, myIslandI18n, codexI18n,
  vnRunnerI18n, gachaI18n, cutsceneRunnerI18n, customsI18n,
  lodgeI18n, zoneGardenI18n, zoneOasisI18n, zoneMemoryI18n, zoneMineI18n,
  routeNeighborI18n,
]

const COMMON_NAMESPACES = ['common', 'opening', 'island', 'care']
const MODULE_NAMESPACES = collectNamespaces(MODULE_I18N)

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: 'ko',
    fallbackLng: 'ko',
    ns: [...COMMON_NAMESPACES, ...MODULE_NAMESPACES],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })

registerNamespaces(i18n, MODULE_I18N)

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info(
    `[i18n] 등록 namespace ${COMMON_NAMESPACES.length + MODULE_NAMESPACES.length}개`,
    `(공통 ${COMMON_NAMESPACES.length} + 모듈 ${MODULE_NAMESPACES.length}):`,
    [...COMMON_NAMESPACES, ...MODULE_NAMESPACES].join(', '),
  )
}

export default i18n
