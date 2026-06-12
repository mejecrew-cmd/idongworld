/**
 * 📌 tools/checks/checkStateRouteRuntimeLocal.mjs — state route removal local runtime check
 * ────────────────────────────────────────────────────────────
 * 🎯 역할: local Mongo, backend, frontend를 띄워 통합 state route 제거 상태를 검증한다.
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
import net from 'node:net'
import process from 'node:process'

const backendUrl = process.env.API_URL ?? 'http://localhost:4000'
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const localEnv = {
  ...process.env,
  MONGO_URI: process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/idongworld',
  MONGO_TRANSACTIONS_ENABLED: process.env.MONGO_TRANSACTIONS_ENABLED ?? 'false',
}
const children = []
let isCleaningUp = false

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

function start(name, args) {
  console.log(`[state-route:local] start ${name}: pnpm ${args.join(' ')}`)
  const command = pnpmCommand(args)
  const child = spawn(command.command, command.args, {
    stdio: 'inherit',
    env: localEnv,
    windowsHide: true,
  })
  children.push({ name, child })
  child.on('exit', (code, signal) => {
    if (code !== null && code !== 0 && !isCleaningUp) {
      console.warn(`[state-route:local] ${name} exited with code ${code}`)
    }
    if (signal && !isCleaningUp) {
      console.warn(`[state-route:local] ${name} exited by ${signal}`)
    }
  })
  return child
}

function run(args) {
  return new Promise((resolve, reject) => {
    console.log(`[state-route:local] run: pnpm ${args.join(' ')}`)
    const command = pnpmCommand(args)
    const child = spawn(command.command, command.args, {
      stdio: 'inherit',
      env: localEnv,
      windowsHide: true,
    })
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`pnpm ${args.join(' ')} failed with exit code ${code}`))
    })
    child.on('error', reject)
  })
}

async function waitFor(name, probe, timeoutMs = 30_000) {
  const startedAt = Date.now()
  let lastError
  while (Date.now() - startedAt < timeoutMs) {
    try {
      await probe()
      console.log(`[state-route:local] ready ${name}`)
      return
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  throw new Error(`Timed out waiting for ${name}: ${lastError?.message ?? 'unknown error'}`)
}

async function expectHttpOk(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`)
  }
  return response
}

async function waitForBackend() {
  await waitFor('backend', async () => {
    const response = await expectHttpOk(`${backendUrl}/health`)
    const health = await response.json()
    if (health.mongo?.connected !== true) {
      throw new Error('Mongo is not connected')
    }
    if (health.migration?.legacyStateApiRemoved !== true) {
      throw new Error('State route is not removed')
    }
    if (health.migration?.repositories?.backend !== 'mongo') {
      throw new Error('Repositories are not using Mongo')
    }
  })
}

async function waitForFrontend() {
  await waitFor('frontend', async () => {
    const response = await expectHttpOk(frontendUrl)
    const html = await response.text()
    if (!html.includes('id="root"')) {
      throw new Error('Frontend root element not found')
    }
  })
}

async function waitForTcp(host, port) {
  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port })
    socket.once('connect', () => {
      socket.end()
      resolve()
    })
    socket.once('error', reject)
  })
}

async function stopChild(child) {
  if (child.exitCode !== null || child.killed) return

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      })
      const timeout = setTimeout(() => {
        killer.kill()
        resolve()
      }, 5000)
      killer.on('exit', () => {
        clearTimeout(timeout)
        resolve()
      })
      killer.on('error', () => {
        clearTimeout(timeout)
        resolve()
      })
    })
    return
  }

  child.kill('SIGTERM')
}

async function cleanup() {
  isCleaningUp = true
  console.log('[state-route:local] cleanup')
  for (const { child } of [...children].reverse()) {
    await stopChild(child)
  }
}

process.once('SIGINT', async () => {
  await cleanup()
  process.exit(130)
})

process.once('SIGTERM', async () => {
  await cleanup()
  process.exit(143)
})

async function main() {
  start('local mongo', ['dev:mongo:local'])
  await waitFor('mongo', async () => {
    await waitForTcp('127.0.0.1', 27017)
  }, 45_000)

  start('backend', ['dev:be:local-mongo'])
  await waitForBackend()

  start('frontend', ['dev:fe'])
  await waitForFrontend()

  await run(['check:state-route-runtime'])
  console.log('[state-route:local] ok')
}

main()
  .catch((error) => {
    console.error(`[state-route:local] failed: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await cleanup()
    process.exit(process.exitCode ?? 0)
  })



