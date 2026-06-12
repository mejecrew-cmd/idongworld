/**
 * tools/audit/checkModuleItems.mjs
 * ------------------------------------------------------------
 * 역할: packages/modules/{moduleId}/items.csv 표준과 현재 balance/customs 참조의 정합성을 검사한다.
 * 연결: 모듈별 item/resource catalog를 customs, zone balance allowlist의 기준으로 삼는다.
 * 주의: host/global resource는 module items.csv 검증 대상이 아니다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '../..')
const modulesRoot = path.join(root, 'packages/modules')

const REQUIRED_MODULES = [
  'zone-garden',
  'zone-oasis',
  'zone-memory',
  'zone-mine',
  'route-neighbor',
  'my-aidong',
  'ship',
  'lodge',
]

const REQUIRED_COLUMNS = [
  'itemId',
  'name',
  'kind',
  'stackable',
  'maxStack',
  'scope',
  'description',
]

const VALID_SCOPES = new Set(['module-local', 'ship-inventory', 'lodge-inventory', 'aidong-global'])
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

function isItemId(value) {
  return /^[a-z0-9][a-z0-9_-]*$/.test(value)
}

function readItemCatalog(moduleId) {
  const filePath = path.join(modulesRoot, moduleId, 'items.csv')
  const { headers, rows } = parseCsv(filePath)
  if (!headers.length) {
    fail('items.csv가 없거나 header가 없습니다', moduleId)
    return new Map()
  }

  for (const column of REQUIRED_COLUMNS) {
    if (!headers.includes(column)) fail('items.csv 필수 column 누락', `${moduleId}.${column}`)
  }

  const itemMap = new Map()
  for (const [index, row] of rows.entries()) {
    const label = `${moduleId}:row${index + 1}`
    if (!isItemId(row.itemId)) fail('itemId 형식 오류', `${label}.${row.itemId}`)
    if (!row.name) fail('name 누락', label)
    if (!row.kind) fail('kind 누락', label)
    if (!['true', 'false'].includes(row.stackable)) fail('stackable은 true/false여야 합니다', label)
    if (!Number.isInteger(Number(row.maxStack)) || Number(row.maxStack) < 1) {
      fail('maxStack은 1 이상의 정수여야 합니다', label)
    }
    if (!VALID_SCOPES.has(row.scope)) fail('scope 값 오류', `${label}.${row.scope}`)
    if (!row.description) fail('description 누락', label)
    if (itemMap.has(row.itemId)) fail('중복 itemId', `${moduleId}.${row.itemId}`)
    itemMap.set(row.itemId, row)
  }

  return itemMap
}

function splitList(value) {
  return value.split(';').map((part) => part.trim()).filter(Boolean)
}

function checkZoneBalance(moduleId, itemMap) {
  const filePath = path.join(modulesRoot, moduleId, 'balance.csv')
  const { rows } = parseCsv(filePath)
  const collectRow = rows.find((row) => row.paramId === 'zone_collect_resources')
  if (!collectRow) return

  for (const resource of splitList(collectRow.value ?? '')) {
    if (!itemMap.has(resource)) fail('zone_collect_resources가 items.csv에 없습니다', `${moduleId}.${resource}`)
  }
}

function checkCustoms(moduleId, itemMap, catalogs) {
  const filePath = path.join(modulesRoot, moduleId, 'customs.csv')
  const { rows } = parseCsv(filePath)
  for (const row of rows) {
    if (!row.ruleId) continue
    if (row.fromModule !== moduleId) fail('customs fromModule은 source module과 같아야 합니다', `${moduleId}.${row.ruleId}`)
    if (row.fromResource && !itemMap.has(row.fromResource)) {
      fail('customs fromResource가 source items.csv에 없습니다', `${moduleId}.${row.ruleId}.${row.fromResource}`)
    }

    if (row.toScope === 'module' && row.toModule && catalogs.has(row.toModule)) {
      const targetCatalog = catalogs.get(row.toModule)
      if (!targetCatalog.has(row.toResource)) {
        fail('customs toResource가 target items.csv에 없습니다', `${moduleId}.${row.ruleId}.${row.toModule}.${row.toResource}`)
      }
    }
  }
}

const catalogs = new Map()
for (const moduleId of REQUIRED_MODULES) {
  catalogs.set(moduleId, readItemCatalog(moduleId))
}

for (const moduleId of REQUIRED_MODULES) {
  const itemMap = catalogs.get(moduleId)
  checkZoneBalance(moduleId, itemMap)
  checkCustoms(moduleId, itemMap, catalogs)
}

if (errors.length > 0) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  modules: [...catalogs.entries()].map(([moduleId, itemMap]) => ({
    moduleId,
    itemCount: itemMap.size,
  })),
}, null, 2))
