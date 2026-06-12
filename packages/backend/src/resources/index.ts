/**
 * packages/backend/src/resources/index.ts
 * ------------------------------------------------------------
 * 역할: customs가 host/module 자원을 공통 방식으로 debit/credit하도록 돕는 adapter다.
 * 연결: 각 repository의 실제 document 구조를 customs service에서 직접 알지 않게 한다.
 * 주의: adapter는 자기 scope의 자원만 다루고 cross-module 조합은 customs service에 맡긴다.
 */
import { hostResourceAdapter } from './hostResourceAdapter.js'
import { moduleResourceAdapter } from './moduleResourceAdapter.js'
import { assertValidResourceRef } from './resourceAdapter.js'
import type { ResourceAdapter, ResourceRef } from './resourceAdapter.js'

export function getResourceAdapter(ref: ResourceRef): ResourceAdapter {
  assertValidResourceRef(ref)
  if (ref.scope === 'host') return hostResourceAdapter
  if (ref.scope === 'module') return moduleResourceAdapter
  throw new Error('unknown_resource_scope')
}

export { assertValidResourceRef, validateResourceRef } from './resourceAdapter.js'
export type { ResourceAdapter, ResourceRef }






