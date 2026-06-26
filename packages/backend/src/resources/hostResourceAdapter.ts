/**
 * packages/backend/src/resources/hostResourceAdapter.ts
 * ------------------------------------------------------------
 * 역할: customs가 host/module 자원을 공통 방식으로 debit/credit하도록 돕는 adapter다.
 * 연결: 각 repository의 실제 document 구조를 customs service에서 직접 알지 않게 한다.
 * 주의: adapter는 자기 scope의 자원만 다루고 cross-module 조합은 customs service에 맡긴다.
 */
import type { HostResource } from '../repositories/hostStateRepository.js'
import { getHostStateRepository } from '../repositories/index.js'
import type { ResourceAdapter } from './resourceAdapter.js'

const HOST_NUMERIC_RESOURCES = new Set(['coins', 'diamonds', 'diceCount'])

function asHostResource(resource: string): HostResource | undefined {
  return HOST_NUMERIC_RESOURCES.has(resource) ? resource as HostResource : undefined
}

export const hostResourceAdapter: ResourceAdapter = {
  async canDebit(uid, ref, amount, session) {
    const state = await getHostStateRepository().getOrCreate(uid, undefined, session)
    const numeric = asHostResource(ref.resource)
    if (numeric) return state[numeric] >= amount
    return (state.inventory[ref.resource] ?? 0) >= amount
  },

  async debit(uid, ref, amount, session) {
    const numeric = asHostResource(ref.resource)
    if (numeric) {
      await getHostStateRepository().mutateResource(uid, numeric, -amount, session)
      return
    }
    await getHostStateRepository().mutateInventory(uid, ref.resource, -amount, session)
  },

  async credit(uid, ref, amount, session) {
    const numeric = asHostResource(ref.resource)
    if (numeric) {
      await getHostStateRepository().mutateResource(uid, numeric, amount, session)
      return
    }
    await getHostStateRepository().mutateInventory(uid, ref.resource, amount, session)
  },
}






