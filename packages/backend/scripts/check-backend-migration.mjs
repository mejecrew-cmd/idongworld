/**
 * 📌 packages/backend/scripts/check-backend-migration.mjs — backend split 안내
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
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const steps = [
  {
    name: 'mongo readiness',
    script: 'check-mongo-readiness.mjs',
  },
  {
    name: 'persistence smoke',
    script: 'smoke-persistence.mjs',
  },
  {
    name: 'state route removed smoke',
    script: 'smoke-state-route-removed.mjs',
  },
]

if (process.argv.includes('--local-mongo')) {
  process.env.MONGO_URI = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/idongworld'
}

function runStep(step) {
  return new Promise((resolve, reject) => {
    console.log(`[backend:migration] ${step.name}`)
    const child = spawn(
      process.execPath,
      [path.join(__dirname, step.script)],
      {
        env: process.env,
        stdio: 'inherit',
      },
    )

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${step.name} failed with exit code ${code}`))
    })
    child.on('error', reject)
  })
}

async function main() {
  for (const step of steps) {
    await runStep(step)
  }
  console.log('[backend:migration] ok')
}

main().catch((error) => {
  console.error(error.message)
  console.error('Run `pnpm dev:be` or `pnpm dev:be:local-mongo` in another terminal before this check.')
  process.exit(1)
})



