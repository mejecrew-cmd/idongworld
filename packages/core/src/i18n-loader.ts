/**
 * 📁 core/i18n-loader.ts — 모듈 i18n namespace 합성
 * ───────────────────────────────────────────────
 * 📌 역할: 각 콘텐츠 모듈이 자체 namespace 를 갖고, loader 가 이를 모아 i18next 인스턴스에 등록.
 *           Google Language Code 70+ 호환 구조 (ko 우선·다국어 확장 가능).
 *
 * 🔗 연결:
 *   - manifests.ts (ContentManifest.i18nNamespace)
 *   - i18next (peerDependency)
 *   - frontend/src/i18n/index.ts (registerNamespaces 호출)
 *
 * 💡 초보자 안내:
 *   - 모듈마다 i18n/{locale}.json (또는 ts) 파일을 가짐.
 *   - 등록은 namespace 단위 — t('garden:tooltip.water') 처럼 사용.
 *   - Phase 0 단계: 헬퍼만 제공 (실 등록은 frontend i18n 설정에서).
 */

/** 한 namespace 의 리소스 (locale → key/value 객체). */
export type NamespaceResources = Record<string, Record<string, unknown>>

/**
 * 모듈이 export 하는 i18n 묶음.
 * 모듈 폴더의 i18n/index.ts 에서 default export 권장.
 */
export interface ModuleI18n {
  /** 모듈 ID. */
  moduleId: string
  /** namespace 이름. manifest.i18nNamespace 와 일치. */
  namespace: string
  /** locale 별 리소스. 예: { ko: {...}, en: {...} } */
  resources: NamespaceResources
}

/**
 * 다수 모듈의 i18n 을 i18next 가 받을 수 있는 형태로 변환.
 * 결과: { ko: { 'garden': {...}, 'harbor': {...} }, en: {...} }
 */
export function buildResourceBundle(modules: ModuleI18n[]): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {}
  for (const m of modules) {
    for (const [locale, dict] of Object.entries(m.resources)) {
      if (!out[locale]) out[locale] = {}
      if (out[locale][m.namespace]) {
        console.warn(`[i18n-loader] namespace 중복: ${m.namespace} (locale=${locale}). 후자가 덮어씀.`)
      }
      out[locale][m.namespace] = dict
    }
  }
  return out
}

/**
 * 모든 모듈의 namespace 이름 모음 (i18next ns 옵션에 사용).
 */
export function collectNamespaces(modules: ModuleI18n[]): string[] {
  const set = new Set<string>()
  for (const m of modules) set.add(m.namespace)
  return Array.from(set)
}

/**
 * 런타임 i18next 인스턴스에 namespace·리소스 추가.
 * i18next 미로드 환경(SSR·테스트)에서는 no-op.
 *
 * @param i18n - i18next 인스턴스 (peer dep)
 * @param modules - 추가할 모듈 i18n 배열
 */
export function registerNamespaces(
  i18n: { addResourceBundle?: (lng: string, ns: string, resources: object, deep?: boolean, overwrite?: boolean) => void } | undefined,
  modules: ModuleI18n[],
): void {
  if (!i18n || typeof i18n.addResourceBundle !== 'function') return
  for (const m of modules) {
    for (const [locale, dict] of Object.entries(m.resources)) {
      i18n.addResourceBundle(locale, m.namespace, dict, true, false)
    }
  }
}
