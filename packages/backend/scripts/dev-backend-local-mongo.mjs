/**
 * 📌 packages/backend/scripts/dev-backend-local-mongo.mjs — backend local Mongo 실행
 * ────────────────────────────────────────────────────────────
 * 🎯 역할: backend dev server를 local MongoDB URI와 함께 실행한다.
 *
 * 🔗 userStore.ts와의 연결:
 *   - frontend의 packages/frontend/src/stores/userStore.ts는 auth, host resource,
 *     Aidong, island/codex, voyage 상태를 한 Zustand store에 담는다.
 *   - backend split 이후 이 파일은 그 통합 상태 중 일부를 users, hostStates,
 *     moduleStates, 전용 module state, customsLogs 중 어디에 저장할지
 *     결정하거나 실행한다.
 *
 * 🧭 작업 안내:
 *   - local MongoDB를 사용할 때만 이 wrapper를 쓴다.
 *   - 일반 개발 실행은 `pnpm --filter backend dev`를 사용한다.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const tsxBin = path.resolve(
  __dirname,
  process.platform === 'win32' ? '../node_modules/.bin/tsx.CMD' : '../node_modules/.bin/tsx',
)
const tsxArgs = [
  'watch',
  '--clear-screen=false',
  '--ignore',
  '../../node_modules/**',
  '--ignore',
  './node_modules/**',
  'src/index.ts',
]
const env = {
  ...process.env,
  MONGO_URI: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/idongworld',
}

const child = spawn(
  process.platform === 'win32' ? 'cmd.exe' : tsxBin,
  process.platform === 'win32' ? ['/d', '/s', '/c', tsxBin, ...tsxArgs] : tsxArgs,
  {
    env,
    stdio: 'inherit',
  },
)

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})



