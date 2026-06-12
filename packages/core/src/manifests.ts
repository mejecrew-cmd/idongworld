/**
 * 📁 core/manifests.ts — 모듈 5분류 Manifest 타입 정의
 * ───────────────────────────────────────────────
 * 📌 역할: 모든 모듈이 공통으로 따르는 manifest 인터페이스 단일 소스.
 *           모듈 시스템 헌법 (모듈분리작업계획_v1_260510.md v1.1) §3 분류 락 반영.
 *
 * 🔗 연결:
 *   - 모듈분리작업계획_v1_260510.md §3 (5분류) §6 (manifest 표준)
 *   - registry.ts (manifest 수집·검증)
 *   - 각 모듈 폴더의 manifest.ts (이 타입을 satisfies)
 *
 * 💡 5분류:
 *   - 🏗️ system   : 재사용 엔진 (vn-runner·gacha·board·customs·cutscene-runner)
 *   - 📦 content  : 실 데이터·UI 인스턴스 (zone-garden·route-neighbor·summer-watermelon-2026)
 *   - 🌐 global   : 항상 active 캐리어 (account·host·my-aidong)
 *   - 🎨 asset    : 자산 풀 (resources/{category}/{public,protected}/)
 *   - 📊 shared   : 공유 스태틱 메타 (shared-data/{aidong-master,cutscene-catalog,...})
 *
 * 💡 초보자 안내:
 *   - manifest는 모듈의 신분증. 어떤 시스템을 쓰는지·자원이 어디 있는지를 선언.
 *   - registry가 manifest를 모아 의존성·라우터·i18n을 자동 합성.
 */

/** 모든 manifest 공통 필드. */
export type ModuleWorldScope =
  | 'home-island'
  | 'voyage-route'
  | 'destination-island'
  | 'ship'
  | 'lodge'

export interface ManifestBase {
  /** 모듈 고유 ID (kebab-case 권장). 예: 'vn-runner', 'zone-garden'. */
  id: string
  /** 사용자 표시용 한글 이름. */
  name: string
  /** semver. 빌드 시점 단일 (런타임 다중 X). */
  version: string
  /** 모듈 설명 (한 줄). */
  description?: string
  /** 외부 기술 명시. 예: 'react'·'unity-web'·'rive' (Phase 2). */
  tech?: 'react' | 'unity-web' | 'rive' | 'spine' | 'live2d' | 'native'
  worldScope?: ModuleWorldScope
}

/**
 * 🏗️ 시스템 모듈 — 재사용 엔진.
 * 다른 모듈이 require로 사용. 인터페이스(exports) 표면 명시 필수.
 */
export interface SystemManifest extends ManifestBase {
  kind: 'system'
  /** 외부에 제공하는 API 표면 (이름만 선언, 실 구현은 모듈 내부). */
  exports: string[]
  /** 밸런스 파라미터 CSV 상대 경로. */
  balance?: string
}

/**
 * 📦 콘텐츠 모듈 — 실 UI·데이터 인스턴스.
 * 시스템을 사용하고 자산·세관·밸런스 CSV를 가짐.
 */
export interface ContentManifest extends ManifestBase {
  kind: 'content'
  /** 사용 시스템 모듈 ID 배열. 예: ['vn-runner', 'gacha']. */
  requires: string[]
  /** 자원 변환 규칙 CSV 상대 경로 (모듈 폴더 기준). 없으면 생략. */
  customs?: string
  /** 밸런스 파라미터 CSV 상대 경로. 없으면 생략. */
  balance?: string
  items?: string
  /** 꾸미기/배치 아이템 CSV 상대 경로. 없으면 생략. */
  decor?: string
  /** 라우트 prefix. 없으면 모듈은 라우트 등록 X. 예: '/island/garden'. */
  route?: string
  /** i18n namespace ID. 없으면 ID 그대로 사용. */
  i18nNamespace?: string
  /** 자산 카테고리 (resources/{category}/...). 예: 'aidong'·'cutscenes'. */
  assetCategory?: string
}

/**
 * 🌐 광역 모듈 — 항상 active. account·host·my-aidong 등.
 * Zustand store slice + (선택) backend API 표면.
 */
export interface GlobalManifest extends ManifestBase {
  kind: 'global'
  /** Zustand store slice 키 이름. 예: 'account'·'host'. */
  storeSlice: string
  /** 외부에 제공하는 API 표면. */
  exports: string[]
  /** backend 라우트 prefix (있을 경우). 예: '/api/account'. */
  api?: string
  /** 밸런스 파라미터 CSV 상대 경로. */
  balance?: string
  items?: string
  /** 꾸미기/배치 아이템 CSV 상대 경로. */
  decor?: string
}

/**
 * 🎨 자산 풀 — 리소스 묶음 (PNG·webp·sound).
 * 노출 보호 분리: public(누구나) / protected(권한 검증).
 */
export interface AssetManifest extends ManifestBase {
  kind: 'asset'
  /** 자산 카테고리. 'aidong'·'cutscenes'·'backgrounds'·'audio' 등. */
  category: string
  /** public 폴더 절대 경로 또는 root 기준 상대 경로. */
  publicPath: string
  /** protected 폴더 경로 (권한 검증 후 stream). */
  protectedPath: string
}

/**
 * 📊 공유 데이터 풀 — 모듈 종속 X 스태틱 마스터 메타.
 * aidong-master·cutscene-catalog·species·schedule 등.
 */
export interface SharedDataManifest extends ManifestBase {
  kind: 'shared'
  /** 데이터 카테고리. 'aidong-master'·'cutscene-catalog' 등. */
  category: string
  /** 데이터 폴더 경로 (CSV·JSON 모음). */
  path: string
}

/** 모든 manifest 종류 합집합. */
export type AnyManifest =
  | SystemManifest
  | ContentManifest
  | GlobalManifest
  | AssetManifest
  | SharedDataManifest

/** manifest 종류별 키. */
export type ManifestKind = AnyManifest['kind']

/**
 * 타입 가드: kind 별 narrowing.
 */
export const isSystem = (m: AnyManifest): m is SystemManifest => m.kind === 'system'
export const isContent = (m: AnyManifest): m is ContentManifest => m.kind === 'content'
export const isGlobal = (m: AnyManifest): m is GlobalManifest => m.kind === 'global'
export const isAsset = (m: AnyManifest): m is AssetManifest => m.kind === 'asset'
export const isShared = (m: AnyManifest): m is SharedDataManifest => m.kind === 'shared'

/**
 * manifest 정의 헬퍼 — 타입 추론 도우미.
 * 사용: `export default defineManifest({ kind: 'system', id: 'vn-runner', ... })`
 */
export function defineManifest<M extends AnyManifest>(m: M): M {
  return m
}
