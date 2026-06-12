/**
 * packages/backend/src/routes/assets.ts
 * ------------------------------------------------------------
 * 역할: asset ref를 실제 사용 가능한 URL 또는 signed URL 필요 상태로 해석하는 API skeleton이다.
 * 연결: frontend/PixiJS/Rive 화면은 DB에 저장된 URL이 아니라 asset ref를 보내고,
 *       backend는 public/protected 정책에 따라 URL 해석 결과를 반환한다.
 * 주의: 실제 S3/CloudFront signed URL provider는 아직 붙이지 않는다. protected 자산은
 *       local 개발 fallback 또는 provider 대기 상태로만 응답한다.
 */
import { Router } from 'express'
import { getRequestUid } from '../middleware/auth.js'

export type AssetVisibility = 'public' | 'protected'

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

export interface BackendAssetResolvePlan extends AssetResolvePlan {
  signedUrlProvider: 'local-fallback' | 'pending-provider' | 'not-required'
  expiresAt?: number
}

const DEFAULT_SIGNED_URL_TTL_MS = 10 * 60 * 1000

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isAssetVisibility(value: unknown): value is AssetVisibility {
  return value === 'public' || value === 'protected'
}

function normalizeVersion(value: unknown): string | number | undefined {
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return undefined
}

function readAssetRef(value: unknown): AssetRef | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const input = value as Record<string, unknown>
  if (!hasText(input.assetId)) return undefined
  if (!hasText(input.category)) return undefined
  if (!hasText(input.assetKey)) return undefined
  if (!isAssetVisibility(input.visibility)) return undefined

  return {
    assetId: input.assetId,
    category: input.category,
    assetKey: input.assetKey,
    visibility: input.visibility,
    version: normalizeVersion(input.version),
  }
}

function readAssetRefs(body: unknown): AssetRef[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return []
  const input = body as Record<string, unknown>
  if (Array.isArray(input.assets)) {
    return input.assets.map(readAssetRef).filter((ref): ref is AssetRef => Boolean(ref))
  }
  const single = readAssetRef(input.asset)
  return single ? [single] : []
}

function isLocalProtectedFallbackEnabled(): boolean {
  const explicit = process.env.ASSET_PROTECTED_LOCAL_FALLBACK_ENABLED
  if (explicit === 'true') return true
  if (explicit === 'false') return false
  return process.env.NODE_ENV !== 'production'
}

function withVersion(assetKey: string, version?: string | number): string {
  if (version === undefined || version === '') return assetKey
  const separator = assetKey.includes('?') ? '&' : '?'
  return `${assetKey}${separator}v=${encodeURIComponent(String(version))}`
}

function trimSlash(value: string): string {
  let next = value
  if (next.startsWith('/')) next = next.slice(1)
  if (next.endsWith('/')) next = next.slice(0, -1)
  return next
}

function publicAsset(category: string, assetKey: string): string {
  const base = process.env.ASSET_PUBLIC_BASE_URL ?? '/assets'
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
  const normalizedCategory = trimSlash(category)
  const normalizedKey = assetKey.startsWith('/') ? assetKey.slice(1) : assetKey
  return `${normalizedBase}/${normalizedCategory}/${normalizedKey}`
}

function assetCacheKey(ref: AssetRef): string {
  return `${ref.assetId}@${ref.version ?? 'latest'}`
}

function resolveAssetRef(ref: AssetRef): AssetResolvePlan {
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
    url: publicAsset(ref.category, withVersion(ref.assetKey, ref.version)),
  }
}

function protectedFallbackUrl(ref: AssetRef): string {
  return publicAsset(ref.category, withVersion(`protected/${ref.assetKey}`, ref.version))
}

export function resolveBackendAssetRef(ref: AssetRef, uid?: string): BackendAssetResolvePlan {
  const resolved = resolveAssetRef(ref)
  if (!resolved.requiresSignedUrl) {
    return {
      ...resolved,
      signedUrlProvider: 'not-required',
    }
  }

  if (!uid) {
    return {
      ...resolved,
      signedUrlProvider: 'pending-provider',
    }
  }

  if (isLocalProtectedFallbackEnabled()) {
    return {
      ...resolved,
      signedUrlProvider: 'local-fallback',
      url: protectedFallbackUrl(ref),
      expiresAt: Date.now() + DEFAULT_SIGNED_URL_TTL_MS,
    }
  }

  return {
    ...resolved,
    signedUrlProvider: 'pending-provider',
  }
}

export const assetsRouter = Router()

assetsRouter.post('/resolve', (req, res) => {
  const uid = getRequestUid(req)
  const refs = readAssetRefs(req.body)
  if (refs.length === 0) {
    return res.status(400).json({ error: 'invalid_asset_refs' })
  }

  res.json({
    ok: true,
    assets: refs.map((ref) => resolveBackendAssetRef(ref, uid)),
  })
})

assetsRouter.get('/signed-url', (req, res) => {
  const ref = readAssetRef({
    assetId: req.query.assetId,
    category: req.query.category,
    assetKey: req.query.assetKey,
    visibility: req.query.visibility,
    version: req.query.version,
  })
  if (!ref) return res.status(400).json({ error: 'invalid_asset_ref' })

  const uid = getRequestUid(req)
  res.json({
    ok: true,
    asset: resolveBackendAssetRef(ref, uid),
  })
})
