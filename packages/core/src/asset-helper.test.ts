/**
 * 📁 core/src/asset-helper.test.ts — 자산 URL·권한 검증 테스트
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  assetCacheKey,
  assetUrl,
  checkAccess,
  configureAssets,
  protectedAsset,
  publicAsset,
  resolveAssetRef,
  setAssetGuard,
} from './asset-helper.ts'

beforeEach(() => {
  // 기본값 복원
  configureAssets({ publicBase: '/assets', protectedBase: '/api/resources' })
  setAssetGuard(() => true)
})

describe('assetUrl / publicAsset / protectedAsset', () => {
  it('public — /assets/{cat}/{path}', () => {
    expect(publicAsset('aidong', '황금멍/board.png')).toBe('/assets/aidong/황금멍/board.png')
  })

  it('protected — /api/resources/{cat}/{path}', () => {
    expect(protectedAsset('aidong', '황금멍/body.png')).toBe('/api/resources/aidong/황금멍/body.png')
  })

  it('카테고리 앞뒤 슬래시 정리', () => {
    expect(assetUrl('public', '/aidong/', 'a.png')).toBe('/assets/aidong/a.png')
  })

  it('relPath 앞 슬래시 제거', () => {
    expect(assetUrl('public', 'aidong', '/a.png')).toBe('/assets/aidong/a.png')
  })

  it('configureAssets — base 변경', () => {
    configureAssets({ publicBase: '/static', protectedBase: '/cdn' })
    expect(publicAsset('x', 'a')).toBe('/static/x/a')
    expect(protectedAsset('x', 'a')).toBe('/cdn/x/a')
  })
})

describe('setAssetGuard / checkAccess', () => {
  it('기본 — 모두 통과', async () => {
    expect(await checkAccess('aidong', '황금멍/body.png')).toBe(true)
  })

  it('guard 거절 — false', async () => {
    setAssetGuard(() => false)
    expect(await checkAccess('aidong', 'x')).toBe(false)
  })

  it('guard 비동기 — Promise resolve', async () => {
    setAssetGuard(async () => true)
    expect(await checkAccess('aidong', 'x')).toBe(true)
  })

  it('ctx 전달', async () => {
    setAssetGuard(({ category, relPath, ctx }) => category === 'aidong' && relPath.startsWith('황금멍') && (ctx as { ok?: boolean }).ok === true)
    expect(await checkAccess('aidong', '황금멍/body.png', { ok: true })).toBe(true)
    expect(await checkAccess('aidong', '황금멍/body.png', { ok: false })).toBe(false)
  })
})

describe('asset ref resolve policy', () => {
  it('keeps stable cache keys separate from URLs', () => {
    expect(assetCacheKey({
      assetId: 'shell-bg',
      category: 'backgrounds',
      assetKey: 'destination/shell/bg.png',
      visibility: 'public',
      version: 3,
    })).toBe('shell-bg@3')
  })

  it('resolves public asset refs to public URLs', () => {
    expect(resolveAssetRef({
      assetId: 'shell-bg',
      category: 'backgrounds',
      assetKey: 'destination/shell/bg.png',
      visibility: 'public',
      version: '2026-06-05',
    })).toMatchObject({
      assetId: 'shell-bg',
      requiresSignedUrl: false,
      url: '/assets/backgrounds/destination/shell/bg.png?v=2026-06-05',
    })
  })

  it('keeps protected asset refs behind signed URL resolve', () => {
    const resolved = resolveAssetRef({
      assetId: 'shell-secret-rive',
      category: 'rive',
      assetKey: 'destination/shell/secret.riv',
      visibility: 'protected',
      version: 1,
    })

    expect(resolved).toMatchObject({
      assetId: 'shell-secret-rive',
      requiresSignedUrl: true,
    })
    expect(resolved.url).toBeUndefined()
  })
})
