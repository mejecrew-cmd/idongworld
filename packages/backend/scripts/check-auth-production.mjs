/**
 * packages/backend/scripts/check-auth-production.mjs
 * ------------------------------------------------------------
 * 역할: production auth 시작 정책을 실행 단계에서 검증한다.
 * 연결: NODE_ENV=production에서는 Firebase Admin env가 없으면 backend가 시작되지 않아야 한다.
 * 주의: 이 스크립트는 실패해야 정상인 backend 프로세스를 잠깐 실행해 종료 코드와 에러 메시지를 확인한다.
 */
import { spawn } from 'node:child_process'

function pnpmCommand(args) {
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'pnpm', ...args],
    }
  }
  return {
    command: 'pnpm',
    args,
  }
}

function runProductionStartupProbe() {
  return new Promise((resolve, reject) => {
    const command = pnpmCommand(['exec', 'tsx', 'src/index.ts'])
    const child = spawn(command.command, command.args, {
      cwd: new URL('..', import.meta.url),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        AUTH_FIREBASE_REQUIRED: 'true',
        AUTH_LEGACY_UID_FALLBACK_ENABLED: 'false',
        MONGO_CONNECT_REQUIRED: 'false',
        PORT: '4999',
        FIREBASE_PROJECT_ID: '',
        FIREBASE_CLIENT_EMAIL: '',
        FIREBASE_PRIVATE_KEY: '',
      },
      windowsHide: true,
    })

    let output = ''
    const collect = (chunk) => {
      output += chunk.toString()
    }

    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    child.on('error', reject)
    child.on('exit', (code) => {
      resolve({ code, output })
    })
  })
}

async function main() {
  const result = await runProductionStartupProbe()
  if (result.code === 0) {
    throw new Error('production auth startup should fail without Firebase Admin env')
  }
  if (!result.output.includes('firebase_admin_required')) {
    throw new Error(`expected firebase_admin_required, got:\n${result.output}`)
  }

  console.log(JSON.stringify({
    ok: true,
    expectedFailure: 'firebase_admin_required',
    exitCode: result.code,
  }, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
