/**
 * packages/backend/src/customs/rules.ts
 * ------------------------------------------------------------
 * 역할: 모듈 customs.csv를 backend 자원 이동 rule로 로딩한다.
 * 연결: packages/modules/{moduleId}/customs.csv를 /api/customs/rules와 /api/customs/apply에서 쓸 수 있는 형태로 변환한다.
 * 주의: 활성화할 moduleId와 ruleId 중복, debit/credit/min/max 해석을 함께 확인한다.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { assertValidResourceRef, type ResourceRef } from '../resources/index.js'

export interface CustomsRule {
  ruleId: string
  from: ResourceRef
  to: ResourceRef
  debitAmount: number
  creditAmount: number
  minMultiplier?: number
  maxMultiplier?: number
  label?: string
  description?: string
  sourceModule?: string
  sourceFile?: string
}

interface CustomsCsvRow {
  ruleId: string
  fromModule: string
  fromResource: string
  toScope: string
  toModule?: string
  toResource: string
  debitAmount?: string
  creditAmount?: string
  ratio?: string
  label?: string
  minAmount?: string
  maxAmount?: string
  description?: string
}

const ACTIVE_CUSTOMS_MODULES = ['zone-garden', 'route-neighbor', 'ship', 'lodge', 'destination-shell-island']

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const modulesRoot = path.resolve(__dirname, '../../../modules')

function parseRows(csvText: string): CustomsCsvRow[] {
  const lines = csvText.split(/\r?\n/)
  const headerIndex = lines.findIndex((line) => {
    const trimmed = line.trim()
    return Boolean(trimmed) && !trimmed.startsWith('#')
  })
  if (headerIndex < 0) return []

  const headers = lines[headerIndex]!.split(',').map((value) => value.trim())
  const rows: CustomsCsvRow[] = []
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i]!.trim()
    if (!line || line.startsWith('#')) continue
    const columns = lines[i]!.split(',').map((value) => value.trim())
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = columns[index] ?? ''
    })
    if (!record.ruleId) continue
    rows.push(record as unknown as CustomsCsvRow)
  }
  return rows
}

function toTargetResourceRef(
  scope: string,
  moduleId: string | undefined,
  resource: string,
  ruleId: string,
): ResourceRef {
  if (scope === 'global' || scope === 'host') {
    const ref: ResourceRef = { scope: 'host', resource }
    assertValidResourceRef(ref)
    return ref
  }
  if (scope !== 'module') {
    throw new Error(`[customs] invalid toScope for ${ruleId}: ${scope}`)
  }
  const ref: ResourceRef = { scope: 'module', moduleId, resource }
  assertValidResourceRef(ref)
  return ref
}

function toSourceResourceRef(moduleId: string, resource: string, sourceModule: string, ruleId: string): ResourceRef {
  if (moduleId !== sourceModule) {
    throw new Error(`[customs] fromModule must match source module for ${ruleId}: ${moduleId}`)
  }
  const ref: ResourceRef = { scope: 'module', moduleId, resource }
  assertValidResourceRef(ref)
  return ref
}

function toPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function rowToRule(row: CustomsCsvRow, sourceModule: string, sourceFile: string): CustomsRule {
  const legacyRatio = toPositiveNumber(row.ratio, 1)
  const debitAmount = toPositiveNumber(row.debitAmount, legacyRatio)
  const creditAmount = toPositiveNumber(row.creditAmount, 1)
  const minAmount = toPositiveNumber(row.minAmount, debitAmount)
  const maxAmount = toPositiveNumber(row.maxAmount, Number.MAX_SAFE_INTEGER)

  return {
    ruleId: row.ruleId,
    from: toSourceResourceRef(row.fromModule, row.fromResource, sourceModule, row.ruleId),
    to: toTargetResourceRef(row.toScope, row.toModule || undefined, row.toResource, row.ruleId),
    debitAmount,
    creditAmount,
    minMultiplier: Math.max(1, Math.ceil(minAmount / debitAmount)),
    maxMultiplier: Number.isSafeInteger(maxAmount)
      ? Math.max(1, Math.floor(maxAmount / debitAmount))
      : undefined,
    label: row.label || row.ruleId,
    description: row.description || undefined,
    sourceModule,
    sourceFile,
  }
}

function loadModuleRules(moduleId: string): CustomsRule[] {
  const filePath = path.join(modulesRoot, moduleId, 'customs.csv')
  if (!fs.existsSync(filePath)) return []
  const csvText = fs.readFileSync(filePath, 'utf8')
  return parseRows(csvText).map((row) => rowToRule(row, moduleId, `${moduleId}/customs.csv`))
}

function loadCustomsRules(): CustomsRule[] {
  const rules = ACTIVE_CUSTOMS_MODULES.flatMap((moduleId) => loadModuleRules(moduleId))
  const seen = new Set<string>()
  for (const rule of rules) {
    if (seen.has(rule.ruleId)) {
      throw new Error(`[customs] duplicate ruleId from csv: ${rule.ruleId}`)
    }
    seen.add(rule.ruleId)
  }
  return rules
}

const RULES = loadCustomsRules()
const ruleMap = new Map(RULES.map((rule) => [rule.ruleId, rule]))

export function listCustomsRules(): CustomsRule[] {
  return [...RULES]
}

export function getCustomsRule(ruleId: string): CustomsRule | undefined {
  return ruleMap.get(ruleId)
}

export function calculateCustomsAmounts(rule: CustomsRule, multiplier: number) {
  const min = rule.minMultiplier ?? 1
  const max = rule.maxMultiplier ?? Number.MAX_SAFE_INTEGER
  if (!Number.isInteger(multiplier) || multiplier < min || multiplier > max) {
    throw new Error('invalid_rule_multiplier')
  }
  return {
    debitAmount: rule.debitAmount * multiplier,
    creditAmount: rule.creditAmount * multiplier,
  }
}






