/**
 * 📌 packages/backend/scripts/check-module-model-specs.mjs — backend split 안내
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
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const backendRoot = path.resolve(__dirname, '..')

function assert(condition, message, details) {
  if (!condition) {
    const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : ''
    throw new Error(`${message}${suffix}`)
  }
}

function readSource(relativePath) {
  return fs.readFileSync(path.join(backendRoot, relativePath), 'utf8')
}

function readModuleSpecIds() {
  const source = readSource('src/modules/modelSpecs.ts')
  const objectBlocks = source.match(/\{\s*moduleId:[\s\S]*?\n\s*\}/g) ?? []
  return objectBlocks.map((block) => {
    const moduleId = block.match(/moduleId:\s*'([^']+)'/)?.[1]
    const storage = block.match(/storage:\s*'([^']+)'/)?.[1]
    const collectionName = block.match(/collectionName:\s*'([^']+)'/)?.[1]
    const ownedFieldsBlock = block.match(/ownedFields:\s*\[([\s\S]*?)\]/)?.[1] ?? ''
    const ownedFields = [...ownedFieldsBlock.matchAll(/'([^']+)'/g)].map((match) => match[1])
    return { moduleId, storage, collectionName, ownedFields }
  }).filter((spec) => Boolean(spec.moduleId))
}

function readModuleIdArray(constName) {
  const source = readSource('src/repositories/moduleRepositoryRegistry.ts')
  const match = source.match(new RegExp(`${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]`))
  return [...(match?.[1] ?? '').matchAll(/'([^']+)'/g)].map((item) => item[1])
}

function readStaticRepositoryIds() {
  const source = readSource('src/repositories/moduleRepositoryRegistry.ts')
  const repositoryBlock = source.match(/const repositories:[\s\S]*?=\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? ''
  return [...repositoryBlock.matchAll(/^\s*(?:'([^']+)'|([a-z0-9]+(?:-[a-z0-9]+)*))\s*:/gm)]
    .map((item) => item[1] ?? item[2])
}

const specs = readModuleSpecIds()
const dedicatedSpecIds = specs
  .filter((spec) => spec.storage === 'dedicated')
  .map((spec) => spec.moduleId)
  .filter(Boolean)
  .sort()

const repositoryIds = [...new Set([
  ...readStaticRepositoryIds(),
  ...readModuleIdArray('ZONE_MODULE_IDS'),
  ...readModuleIdArray('DESTINATION_ISLAND_MODULE_IDS'),
])].sort()
const duplicateSpecIds = specs
  .map((spec) => spec.moduleId)
  .filter((moduleId, index, moduleIds) => moduleIds.indexOf(moduleId) !== index)

const missingRepositories = dedicatedSpecIds.filter((moduleId) => !repositoryIds.includes(moduleId))
const undocumentedRepositories = repositoryIds.filter((moduleId) => !dedicatedSpecIds.includes(moduleId))

assert(duplicateSpecIds.length === 0, 'Duplicate module model specs found', { duplicateSpecIds })
assert(missingRepositories.length === 0, 'Dedicated specs missing repositories', {
  dedicatedSpecIds,
  repositoryIds,
  missingRepositories,
})
assert(undocumentedRepositories.length === 0, 'Repositories missing model specs', {
  dedicatedSpecIds,
  repositoryIds,
  undocumentedRepositories,
})

for (const spec of specs) {
  assert(spec.moduleId && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(spec.moduleId), 'moduleId must be kebab-case', spec)
  assert(spec.collectionName && typeof spec.collectionName === 'string', 'collectionName is required', spec)
  assert(Array.isArray(spec.ownedFields) && spec.ownedFields.length > 0, 'ownedFields must not be empty', spec)
}

console.log(JSON.stringify({
  ok: true,
  dedicatedSpecIds,
  repositoryIds,
}, null, 2))



