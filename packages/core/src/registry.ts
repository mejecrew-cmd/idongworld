/**
 * 📁 core/registry.ts — 모듈 레지스트리
 * ───────────────────────────────────────────────
 * 📌 역할: 앱 구동 시 모든 모듈 manifest 를 등록·검증·조회하는 단일 창구.
 *           ID 충돌·의존성 누락·kind 불일치를 부팅 시점에 감지.
 *
 * 🔗 연결:
 *   - manifests.ts (5분류 타입)
 *   - frontend/src/main.tsx (앱 시작 시 register() 호출)
 *   - router.ts·i18n-loader.ts·asset-helper.ts (registry 조회)
 *
 * 💡 초보자 안내:
 *   - 레지스트리는 앱 시작 시 한 번 채워지고 그 뒤로는 읽기 전용처럼 사용.
 *   - 의존성 누락은 부팅 시 throw → 빠른 실패로 디버깅 쉬움.
 */
import type { AnyManifest, ContentManifest, GlobalManifest, ManifestKind, SystemManifest } from './manifests.ts'

/** 내부 저장소 — id → manifest. */
const _registry = new Map<string, AnyManifest>()

/**
 * 모듈 등록. 중복 ID 차단 + kind/id 정합 검증.
 * 부팅 시 초기화 단계에서만 호출.
 */
export function register(manifest: AnyManifest): void {
  if (_registry.has(manifest.id)) {
    throw new Error(`[registry] 중복 모듈 ID: ${manifest.id}`)
  }
  if (!manifest.id || !manifest.kind) {
    throw new Error(`[registry] 필수 필드 누락 (id·kind): ${JSON.stringify(manifest)}`)
  }
  _registry.set(manifest.id, manifest)
}

/** 일괄 등록. 순서는 보장하지 않음 (해석은 resolve 시점). */
export function registerAll(manifests: AnyManifest[]): void {
  for (const m of manifests) register(m)
}

/** ID로 manifest 조회. 없으면 undefined. */
export function get(id: string): AnyManifest | undefined {
  return _registry.get(id)
}

/** 존재 보장 조회 — 없으면 throw. */
export function require_(id: string): AnyManifest {
  const m = _registry.get(id)
  if (!m) throw new Error(`[registry] 모듈 미등록: ${id}`)
  return m
}

/** kind 필터 조회. */
export function listByKind<K extends ManifestKind>(kind: K): Extract<AnyManifest, { kind: K }>[] {
  const out: AnyManifest[] = []
  for (const m of _registry.values()) {
    if (m.kind === kind) out.push(m)
  }
  return out as Extract<AnyManifest, { kind: K }>[]
}

/** 전체 manifest 배열 (등록 순). */
export function listAll(): AnyManifest[] {
  return Array.from(_registry.values())
}

/**
 * 전체 정합성 검증 — 부팅 마지막에 호출 권장.
 * 다음 4종 검사·모든 위반을 모아 한 번에 throw.
 *
 *   1. requires 의존성   : content 모듈의 requires 가 system 모듈에 매칭
 *   2. route 충돌        : 같은 route prefix 를 가진 모듈 2개 이상 (content)
 *   3. storeSlice 중복   : 같은 storeSlice 키를 가진 광역 모듈 2개 이상
 *   4. i18nNamespace 충돌: 같은 namespace 를 가진 모듈 2개 이상
 *
 * 💡 부팅 시점 빠른 실패 — 사용자 화면 진입 전에 catch.
 */
export function validate(): void {
  const errors: string[] = []
  const systemIds = new Set(listByKind('system').map((m) => m.id))

  // 1. requires 의존성
  for (const m of _registry.values()) {
    if (m.kind !== 'content') continue
    const c = m as ContentManifest
    for (const dep of c.requires) {
      if (!systemIds.has(dep)) {
        errors.push(`[${c.id}] requires '${dep}' — system 모듈 미등록`)
      }
    }
  }

  // 2. route 충돌 (content 모듈의 prefix)
  const routeMap = new Map<string, string[]>()
  for (const m of _registry.values()) {
    if (m.kind !== 'content') continue
    const route = (m as ContentManifest).route
    if (!route) continue
    const list = routeMap.get(route) ?? []
    list.push(m.id)
    routeMap.set(route, list)
  }
  for (const [route, ids] of routeMap) {
    if (ids.length > 1) {
      errors.push(`route '${route}' 충돌: ${ids.join(', ')}`)
    }
  }

  // 3. storeSlice 중복 (광역 모듈)
  const sliceMap = new Map<string, string[]>()
  for (const m of _registry.values()) {
    if (m.kind !== 'global') continue
    const slice = (m as GlobalManifest).storeSlice
    if (!slice) continue
    const list = sliceMap.get(slice) ?? []
    list.push(m.id)
    sliceMap.set(slice, list)
  }
  for (const [slice, ids] of sliceMap) {
    if (ids.length > 1) {
      errors.push(`storeSlice '${slice}' 중복: ${ids.join(', ')}`)
    }
  }

  // 4. i18nNamespace 충돌 (content 모듈)
  const nsMap = new Map<string, string[]>()
  for (const m of _registry.values()) {
    if (m.kind !== 'content') continue
    const ns = (m as ContentManifest).i18nNamespace
    if (!ns) continue
    const list = nsMap.get(ns) ?? []
    list.push(m.id)
    nsMap.set(ns, list)
  }
  for (const [ns, ids] of nsMap) {
    if (ids.length > 1) {
      errors.push(`i18nNamespace '${ns}' 충돌: ${ids.join(', ')}`)
    }
  }

  if (errors.length) {
    throw new Error(`[registry] 정합성 검증 실패:\n  - ${errors.join('\n  - ')}`)
  }
}

/** 시스템 모듈만 ID-인덱스 조회. */
export function getSystem(id: string): SystemManifest | undefined {
  const m = _registry.get(id)
  return m && m.kind === 'system' ? m : undefined
}

/** 테스트·HMR 용 초기화. 운영 코드에서 호출 X. */
export function _resetForTest(): void {
  _registry.clear()
}
