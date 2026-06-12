/**
 * packages/backend/src/resources/resourceAdapter.ts
 * ------------------------------------------------------------
 * 역할: customs가 host/module 자원을 공통 방식으로 debit/credit하도록 돕는 adapter다.
 * 연결: 각 repository의 실제 document 구조를 customs service에서 직접 알지 않게 한다.
 * 주의: adapter는 자기 scope의 자원만 다루고 cross-module 조합은 customs service에 맡긴다.
 */
import type { ClientSession } from 'mongoose'

export interface ResourceRef {
  scope: 'host' | 'module'
  moduleId?: string
  resource: string
}

export interface ResourceAdapter {
  canDebit(uid: string, ref: ResourceRef, amount: number, session?: ClientSession): Promise<boolean>
  debit(uid: string, ref: ResourceRef, amount: number, session?: ClientSession): Promise<void>
  credit(uid: string, ref: ResourceRef, amount: number, session?: ClientSession): Promise<void>
}

const RESERVED_MODULE_IDS = new Set(['host', 'global'])

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function validateResourceRef(ref: ResourceRef): string | undefined {
  if (ref.scope !== 'host' && ref.scope !== 'module') return 'unknown_resource_scope'
  if (!hasText(ref.resource)) return 'invalid_resource'

  if (ref.scope === 'host') {
    if (hasText(ref.moduleId)) return 'host_resource_must_not_have_moduleId'
    return undefined
  }

  if (!hasText(ref.moduleId)) return 'module_resource_requires_moduleId'
  if (RESERVED_MODULE_IDS.has(ref.moduleId)) return 'reserved_moduleId_for_module_resource'
  return undefined
}

export function assertValidResourceRef(ref: ResourceRef): void {
  const error = validateResourceRef(ref)
  if (error) throw new Error(error)
}






