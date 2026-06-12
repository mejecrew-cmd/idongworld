/**
 * 📌 packages/backend/scripts/dev-local-mongo.mjs — backend split 안내
 * ────────────────────────────────────────────────────────────
 * 🎯 역할: Backend migration/check script. userStore.ts 중심 legacy 저장 흐름이 Mongo repository, module document, customs API로 분리됐는지 실행 단계에서 확인한다.
 *
 * 🔗 userStore.ts와의 연결:
 *   - frontend의 packages/frontend/src/stores/userStore.ts는 auth, host resource,
 *     Aidong, island/codex, voyage 상태를 한 Zustand store에 담는다.
 *   - backend split 이후 이 파일은 그 통합 상태 중 일부를 users, hostStates,
 *     moduleStates, 전용 module state, customsLogs 중 어디에 저장할지
 *     결정하거나 실행한다.
 *
 * 🧭 작업 안내:
 *   - 신규 기능은 account, host, module, customs, action API를 우선 사용한다.
 *   - account/host/module/customs/action API와 repository/service 경계를 우선 사용한다.
 *   - 다른 모듈 document를 직접 수정하지 않는다.
 *   - cross-module resource 이동은 customs와 resource adapter를 통한다.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const workspaceRoot = path.resolve(__dirname, '../../..')
const dbPath = path.resolve(process.env.MONGO_LOCAL_DBPATH ?? path.join(workspaceRoot, '.mongo-local-data'))
const port = process.env.MONGO_LOCAL_PORT ?? '27017'
const mongodPath = process.env.MONGOD_PATH ??
  (process.platform === 'win32'
    ? 'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe'
    : 'mongod')

fs.mkdirSync(dbPath, { recursive: true })

console.log(`[mongo:local] ${mongodPath}`)
console.log(`[mongo:local] dbPath=${dbPath}`)
console.log(`[mongo:local] uri=mongodb://127.0.0.1:${port}/idongworld`)

const child = spawn(
  mongodPath,
  ['--dbpath', dbPath, '--bind_ip', '127.0.0.1', '--port', port],
  { stdio: 'inherit' },
)

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})



