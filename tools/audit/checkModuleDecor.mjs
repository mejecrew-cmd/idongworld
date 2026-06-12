/**
 * tools/audit/checkModuleDecor.mjs
 * ------------------------------------------------------------
 * 역할: packages/modules/{moduleId}/decor.csv 표준과 manifest 선언 정합성을 검사한다.
 * 연결: lodge/ship service가 사용하는 decor catalog를 backend 실행 전에 점검한다.
 * 주의: decor.csv는 구매 비용, 기본 보유량, 배치 가능 위치의 권위 데이터다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '../..')
const modulesRoot = path.join(root, 'packages/modules')

const REQUIRED_COLUMNS = [
  'itemId',
  'label',
  'cost',
  'defaultOwned',
  'placementScope',
  'description',
  'phase',
]

const VALID_PLACEMENT_SCOPES = new Set(['lodge-room', 'ship-cabin'])
const errors = []

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : ''
}

function parseCsv(filePath) {
  const text = readText(filePath)
  if (!text) return { headers: [], rows: [] }

  const lines = text.split(/\r?\n/)
  const headerIndex = lines.findIndex((line) => {
    const trimmed = line.trim()
    return trimmed && !trimmed.startsWith('#')
  })
  if (headerIndex < 0) return { headers: [], rows: [] }

  const headers = lines[headerIndex].split(',').map((value) => value.trim())
  const rows = []
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const raw = lines[index]
    const trimmed = raw.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const columns = raw.split(',').map((value) => value.trim())
    const record = {}
    headers.forEach((header, columnIndex) => {
      record[header] = columns[columnIndex] ?? ''
    })
    rows.push(record)
  }
  return { headers, rows }
}

function fail(message, detail) {
  errors.push(detail ? `${message}: ${detail}` : message)
}

function isDecorItemId(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

function isNonNegativeInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 0
}

function findDecorManifestModules() {
  const modules = []
  for (const entry of fs.readdirSync(modulesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue

    const moduleId = entry.name
    const manifestPath = path.join(modulesRoot, moduleId, 'manifest.ts')
    if (!fs.existsSync(manifestPath)) continue

    const manifestText = readText(manifestPath)
    const decorMatch = manifestText.match(/decor\s*:\s*['"]([^'"]+)['"]/)
    if (!decorMatch) continue

    modules.push({
      moduleId,
      decorFile: decorMatch[1],
      manifestPath,
    })
  }
  return modules.sort((a, b) => a.moduleId.localeCompare(b.moduleId))
}

function checkDecorCatalog({ moduleId, decorFile }) {
  if (decorFile !== 'decor.csv') {
    fail('manifest decor 경로는 현재 decor.csv만 허용합니다', `${moduleId}.${decorFile}`)
  }

  const filePath = path.join(modulesRoot, moduleId, decorFile)
  const { headers, rows } = parseCsv(filePath)
  if (!fs.existsSync(filePath)) {
    fail('manifest에 decor가 선언됐지만 파일이 없습니다', `${moduleId}.${decorFile}`)
    return { moduleId, decorCount: 0 }
  }
  if (!headers.length) {
    fail('decor.csv header가 없습니다', moduleId)
    return { moduleId, decorCount: 0 }
  }

  for (const column of REQUIRED_COLUMNS) {
    if (!headers.includes(column)) fail('decor.csv 필수 column 누락', `${moduleId}.${column}`)
  }

  const ids = new Set()
  for (const [index, row] of rows.entries()) {
    const label = `${moduleId}:row${index + 1}`
    if (!isDecorItemId(row.itemId)) fail('decor itemId 형식 오류', `${label}.${row.itemId}`)
    if (ids.has(row.itemId)) fail('decor itemId 중복', `${moduleId}.${row.itemId}`)
    ids.add(row.itemId)

    if (!row.label) fail('decor label 누락', label)
    if (!isNonNegativeInteger(row.cost)) fail('decor cost는 0 이상의 정수여야 합니다', `${label}.${row.cost}`)
    if (!isNonNegativeInteger(row.defaultOwned)) {
      fail('decor defaultOwned는 0 이상의 정수여야 합니다', `${label}.${row.defaultOwned}`)
    }
    if (!VALID_PLACEMENT_SCOPES.has(row.placementScope)) {
      fail('decor placementScope 값 오류', `${label}.${row.placementScope}`)
    }
    if (!row.description) fail('decor description 누락', label)
    if (!row.phase) fail('decor phase 누락', label)
  }

  return { moduleId, decorCount: rows.length }
}

const decorModules = findDecorManifestModules()
const results = decorModules.map((moduleInfo) => checkDecorCatalog(moduleInfo))

if (errors.length > 0) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  modules: results,
}, null, 2))
