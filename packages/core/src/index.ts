/**
 * 📁 core/src/index.ts — @idongworld/core 공개 표면
 * ───────────────────────────────────────────────
 * 📌 역할: 모듈 시스템 골격의 단일 import 진입점.
 *           barrel re-export 로 사용 측 import 단순화.
 *
 * 🔗 연결:
 *   - manifests.ts·registry.ts·bus.ts·router.ts·i18n-loader.ts·asset-helper.ts
 *   - 사용: `import { register, defineManifest } from '@idongworld/core'`
 */
export * from './manifests.ts'
export * from './registry.ts'
export * as bus from './bus.ts'
export * from './router.ts'
export * from './i18n-loader.ts'
export * from './asset-helper.ts'
export * from './csvLoader.ts'
