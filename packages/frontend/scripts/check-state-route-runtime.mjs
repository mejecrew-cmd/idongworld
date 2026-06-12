/**
 * 📌 packages/frontend/scripts/check-state-route-runtime.mjs — state route removal runtime check
 * ────────────────────────────────────────────────────────────
 * 🎯 역할: frontend와 backend가 통합 state route 없이 전용 API로 동작하는지 runtime에서 검증한다.
 *
 * 🔗 userStore.ts와의 연결:
 *   - frontend의 packages/frontend/src/stores/userStore.ts는 auth, host resource,
 *     Aidong, island/codex, voyage 상태를 한 Zustand store에 담는다.
 *   - backend split 이후 이 파일은 그 통합 상태 중 일부를 users, hostStates,
 *     moduleStates, 전용 module state, customsLogs 중 어디에 저장할지
 *     결정하거나 실행한다.
 *
 * 🧭 작업 안내:
 *   - 신규 기능은 account/host/module/customs/action API와 repository/service 경계를 우선 사용한다.
 *   - 다른 모듈 document를 직접 수정하지 않는다.
 *   - cross-module resource 이동은 customs와 resource adapter를 통한다.
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const frontendRoot = path.resolve(import.meta.dirname, '..')
const envPath = path.join(frontendRoot, '.env.local')
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing env file: ${filePath}`)
  }

  const entries = {}
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    entries[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim()
  }
  return entries
}

async function readJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`GET ${url} failed with ${response.status}: ${body}`)
  }
  return response.json()
}

async function readText(url) {
  const response = await fetch(url)
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`GET ${url} failed with ${response.status}: ${body}`)
  }
  return response.text()
}

function assert(condition, message, details) {
  if (!condition) {
    const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : ''
    throw new Error(`${message}${suffix}`)
  }
}

const env = readEnvFile(envPath)
const apiUrl = env.VITE_API_URL ?? 'http://localhost:4000'

assert(env.VITE_MODULE_ACTION_API_SYNC === 'true', 'VITE_MODULE_ACTION_API_SYNC must be true', env)

const health = await readJson(`${apiUrl}/health`)
const dedicatedModuleIds = health.migration?.repositories?.dedicatedModuleIds ?? []
const requiredDedicatedModules = ['codex', 'lodge', 'my-aidong', 'my-island', 'route-neighbor', 'ship']
const missingDedicatedModules = requiredDedicatedModules.filter((moduleId) => !dedicatedModuleIds.includes(moduleId))

assert(health.status === 'ok', 'Backend health status must be ok', health)
assert(health.mongo?.connected === true, 'Backend must be connected to MongoDB', health)
assert(health.migration?.legacyStateApiRemoved === true, 'State route must be removed', health)
assert(health.migration?.repositories?.backend === 'mongo', 'Repository backend must be mongo', health)
assert(missingDedicatedModules.length === 0, 'Dedicated module repositories are missing', {
  requiredDedicatedModules,
  dedicatedModuleIds,
  missingDedicatedModules,
})

const html = await readText(frontendUrl)
assert(html.includes('id="root"'), 'Frontend root element was not found', { frontendUrl })
assert(html.includes('/src/main.tsx') || html.includes('/vite-assets/'), 'Frontend entry asset was not found', {
  frontendUrl,
})

console.log(JSON.stringify({
  ok: true,
  apiUrl,
  frontendUrl,
  moduleActionApiSync: env.VITE_MODULE_ACTION_API_SYNC,
  legacyStateApiRemoved: health.migration.legacyStateApiRemoved,
  repositoryBackend: health.migration.repositories.backend,
  dedicatedModuleIds,
}, null, 2))



