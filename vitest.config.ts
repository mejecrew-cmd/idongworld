/**
 * 📁 vitest.config.ts — 모노레포 테스트 셋업 (root)
 * ───────────────────────────────────────────────
 * 📌 역할: workspace 전체에서 *.test.ts 자동 수집·실행.
 * 🔗 모듈별 src/*.test.ts 파일 위치. CI 게이트.
 *
 * 💡 정책:
 *   - 환경: node (DOM 의존 코드는 jsdom 별도 spec)
 *   - typecheck X (pnpm typecheck 가 별도)
 *   - watch 비활성 (pnpm test:watch 시 활성)
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'packages/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
    globals: false,
    reporters: ['default'],
    pool: 'threads',
  },
})
