/**
 * 📁 core/asset-helper.ts — 자산 URL 컨벤션 + public/protected 분기
 * ───────────────────────────────────────────────
 * 📌 역할: 모든 모듈이 자산 URL 을 동일한 규칙으로 생성.
 *           public(누구나) vs protected(권한 검증 후 stream) 분기 처리.
 *
 * 🔗 연결:
 *   - manifests.ts (AssetManifest.publicPath/protectedPath)
 *   - resources/{category}/{public,protected}/ 디렉토리 구조
 *   - 모듈분리작업계획_v1_260510.md §8.5 (자산 풀 노출 보호)
 *   - Phase 1.5+ : backend /api/resources/protected/ stream 라우트
 *
 * 💡 URL 컨벤션:
 *   - public:    /assets/{category}/{path}            (Vite public 또는 정적 호스팅)
 *   - protected: /api/resources/{category}/{path}     (backend 권한 검증 + stream)
 *
 * 💡 초보자 안내:
 *   - Phase 1: 모두 public (단순). 검증 함수는 통과 처리.
 *   - Phase 1.5+: protected 호출 시 user.recruitedAidongs·unlockedCutscenes 검증.
 *   - 자산 경로는 항상 이 헬퍼로 — 직접 문자열 결합 금지 (재배치 시 일괄 변경).
 */

/** 자산 노출 정책. */
export type AssetVisibility = 'public' | 'protected'

/**
 * DB나 CSV에 저장하는 자산 참조 단위.
 *
 * signed URL 같은 만료성 URL은 여기에 저장하지 않는다.
 * protected 자산은 backend resolve API를 거쳐 짧은 수명의 URL을 발급받는다.
 */
export interface AssetRef {
  assetId: string
  category: string
  assetKey: string
  visibility: AssetVisibility
  version?: string | number
}

export interface AssetResolvePlan {
  assetId: string
  category: string
  assetKey: string
  visibility: AssetVisibility
  version?: string | number
  cacheKey: string
  requiresSignedUrl: boolean
  url?: string
}

/** 자산 URL 빌드 설정. */
export interface AssetConfig {
  /** public 자산 base URL. 기본: '/assets'. */
  publicBase?: string
  /** protected 자산 base URL. 기본: '/api/resources'. */
  protectedBase?: string
}

let _config: Required<AssetConfig> = {
  publicBase: '/assets',
  protectedBase: '/api/resources',
}

/** 부팅 시 1회 설정 (frontend main.tsx 에서). */
export function configureAssets(cfg: AssetConfig): void {
  _config = { ..._config, ...cfg }
}

/**
 * 자산 URL 생성.
 *
 * @param visibility - public | protected
 * @param category   - 'aidong'·'cutscenes'·'backgrounds'·'audio' 등
 * @param relPath    - 카테고리 내부 상대 경로. 예: '황금멍/body.png'
 *
 * @example
 * assetUrl('public', 'aidong', '황금멍/board_icon.png')
 *   → '/assets/aidong/황금멍/board_icon.png'
 * assetUrl('protected', 'aidong', '황금멍/body.png')
 *   → '/api/resources/aidong/황금멍/body.png'
 */
export function assetUrl(visibility: AssetVisibility, category: string, relPath: string): string {
  const base = visibility === 'public' ? _config.publicBase : _config.protectedBase
  const cat = trimSlash(category)
  const rel = relPath.startsWith('/') ? relPath.slice(1) : relPath
  return `${base}/${cat}/${rel}`
}

/** 편의 헬퍼 — public. */
export function publicAsset(category: string, relPath: string): string {
  return assetUrl('public', category, relPath)
}

/** 편의 헬퍼 — protected. */
export function protectedAsset(category: string, relPath: string): string {
  return assetUrl('protected', category, relPath)
}

export function assetCacheKey(ref: AssetRef): string {
  return `${ref.assetId}@${ref.version ?? 'latest'}`
}

function withAssetVersion(assetKey: string, version?: string | number): string {
  if (version === undefined || version === '') return assetKey
  const separator = assetKey.includes('?') ? '&' : '?'
  return `${assetKey}${separator}v=${encodeURIComponent(String(version))}`
}

/**
 * asset ref를 URL 사용 계획으로 변환한다.
 *
 * public 자산은 즉시 public URL을 반환한다.
 * protected 자산은 URL을 직접 만들지 않고 signed URL resolve가 필요하다는
 * 신호만 반환한다.
 */
export function resolveAssetRef(ref: AssetRef): AssetResolvePlan {
  const base = {
    assetId: ref.assetId,
    category: ref.category,
    assetKey: ref.assetKey,
    visibility: ref.visibility,
    version: ref.version,
    cacheKey: assetCacheKey(ref),
  }

  if (ref.visibility === 'protected') {
    return {
      ...base,
      requiresSignedUrl: true,
    }
  }

  return {
    ...base,
    requiresSignedUrl: false,
    url: publicAsset(ref.category, withAssetVersion(ref.assetKey, ref.version)),
  }
}

/**
 * 권한 검증 인터페이스 (Phase 1.5+ 활성).
 * frontend 는 user state, backend 는 session 참조.
 *
 * Phase 1: 모두 통과(true).
 */
export type AssetGuard = (params: {
  category: string
  relPath: string
  /** 자유 컨텍스트 (uid·recruitedAidongs 등). */
  ctx?: unknown
}) => boolean | Promise<boolean>

let _guard: AssetGuard = () => true

/** 사용자 권한 검증 함수 등록 (Phase 1.5+). */
export function setAssetGuard(guard: AssetGuard): void {
  _guard = guard
}

/**
 * protected 자산 접근 권한 검증.
 * backend 라우트에서 호출. 거부 시 false → 404/403 응답.
 */
export async function checkAccess(category: string, relPath: string, ctx?: unknown): Promise<boolean> {
  return Promise.resolve(_guard({ category, relPath, ctx }))
}

function trimSlash(s: string): string {
  let v = s
  if (v.startsWith('/')) v = v.slice(1)
  if (v.endsWith('/')) v = v.slice(0, -1)
  return v
}
