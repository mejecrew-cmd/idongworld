/**
 * 📁 frontend/vite.config.ts — Vite 빌드·개발 서버 설정
 * ───────────────────────────────────────────────
 * 📌 역할: 프론트엔드 빌드 도구 Vite의 설정 파일.
 *           dev 서버 포트·React 플러그인·자산 경로 alias·외부 디렉토리 허용 등.
 *
 * 🔗 연결:
 *   - package.json scripts → vite·vite build·vite preview
 *   - public/assets symlink → assets-dummy 디렉토리 (Drive)
 *   - tsconfig.json → @/* 경로 alias 정합
 *
 * 💡 초보자 안내:
 *   - port 5173: vite default
 *   - host: true: 같은 네트워크 다른 기기(휴대폰)에서 접속 가능
 *   - fs.allow: vite는 기본적으로 프로젝트 root 외부 파일 차단.
 *     symlink로 연결된 Drive 자산 접근하려면 명시적 허용 필수.
 *   - alias '@': src 경로 단축 (import from '@/components/HUD')
 *   - preserveSymlinks: false → symlink 통과해 실제 파일 해석 (자산 fetch 안전)
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Drive의 더미 자산 디렉토리 절대경로 (symlink 외부 접근 허용용)
const ASSET_DUMMY = path.resolve(
  __dirname,
  '../../../../기획/와이어프레임/assets-dummy'
)

export default defineConfig({
  plugins: [react()],
  build: {
    assetsDir: 'vite-assets',
  },
  server: {
    port: 5173,
    host: true,  // LAN 다른 기기 접속 허용
    fs: {
      strict: false,
      // 외부 절대경로 허용 (symlink 자산 접근)
      allow: ['..', '../..', '../../..', '../../../..', ASSET_DUMMY],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    preserveSymlinks: false,  // symlink → 실 경로 해석
  },
})
