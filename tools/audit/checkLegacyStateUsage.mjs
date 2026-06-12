/**
 * 📌 tools/audit/checkLegacyStateUsage.mjs — backend split 안내
 * ────────────────────────────────────────────────────────────
 * 🎯 역할: Migration/check script. userStore.ts 중심 legacy 경로가 module/host/customs API로 분리됐는지 검증한다.
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
import process from 'node:process'

const root = process.cwd()

const scanRoots = [
  'packages/frontend/src',
  'packages/backend/src',
]

const allowedFiles = new Set([])

const legacyPatterns = [
  {
    name: 'removed state route path',
    regex: /['"`]\/api\/state|\`\/api\/state/g,
  },
  {
    name: 'frontend legacy state client',
    regex: /\bapi\.(getState|patchState)\s*\(/g,
  },
]

const ignoredDirectories = new Set([
  'dist',
  'node_modules',
])

function normalize(filePath) {
  return filePath.split(path.sep).join('/')
}

function* walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      yield* walk(fullPath)
      continue
    }
    if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      yield fullPath
    }
  }
}

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length
}

const violations = []

for (const scanRoot of scanRoots) {
  const absoluteScanRoot = path.join(root, scanRoot)
  if (!fs.existsSync(absoluteScanRoot)) continue

  for (const filePath of walk(absoluteScanRoot)) {
    const relativePath = normalize(path.relative(root, filePath))
    if (allowedFiles.has(relativePath)) continue

    const source = fs.readFileSync(filePath, 'utf8')
    for (const pattern of legacyPatterns) {
      pattern.regex.lastIndex = 0
      for (const match of source.matchAll(pattern.regex)) {
        violations.push({
          file: relativePath,
          line: lineNumber(source, match.index ?? 0),
          pattern: pattern.name,
          match: match[0],
        })
      }
    }
  }
}

if (violations.length > 0) {
  console.error('[legacy-state-usage] forbidden legacy state usage found')
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} ${violation.pattern} ${JSON.stringify(violation.match)}`,
    )
  }
  console.error(
    'Use account/host/module/customs APIs instead. Runtime source must not reference /api/state.',
  )
  process.exit(1)
}

console.log('[legacy-state-usage] ok')



