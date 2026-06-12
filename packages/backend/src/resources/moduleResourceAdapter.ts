/**
 * packages/backend/src/resources/moduleResourceAdapter.ts
 * ------------------------------------------------------------
 * 역할: customs가 host/module 자원을 공통 방식으로 debit/credit하도록 돕는 adapter다.
 * 연결: 각 repository의 실제 document 구조를 customs service에서 직접 알지 않게 한다.
 * 주의: adapter는 자기 scope의 자원만 다루고 cross-module 조합은 customs service에 맡긴다.
 */
import {
  getDedicatedModuleRepositories,
  getModuleStateRepository,
} from '../repositories/index.js'
import { getDefaultShipTypeConfig, requireShipTypeConfig } from '../modules/ship/balance.js'
import { getModuleResourceBinding } from './moduleResourceRegistry.js'
import type { ResourceAdapter, ResourceRef } from './resourceAdapter.js'

function requireModuleId(ref: ResourceRef): string {
  if (!ref.moduleId) throw new Error('module_resource_requires_moduleId')
  return ref.moduleId
}

function pickResources(state: Record<string, unknown>, field: string): Record<string, unknown> {
  const value = state[field]
  return typeof value === 'object' && value ? value as Record<string, unknown> : {}
}

function getPositiveResourceAmount(value: unknown): number {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function getResourceLoad(resources: Record<string, unknown>): number {
  return Object.values(resources).reduce<number>(
    (total, value) => total + getPositiveResourceAmount(value),
    0,
  )
}

function getShipCargoCapacity(state: Record<string, unknown>): number {
  const shipTypeId = typeof state.shipTypeId === 'string'
    ? state.shipTypeId
    : getDefaultShipTypeConfig().shipTypeId
  return requireShipTypeConfig(shipTypeId).cargoCapacity
}

function assertCreditCapacity(
  moduleId: string,
  resourceField: string,
  state: Record<string, unknown>,
  resources: Record<string, unknown>,
  amount: number,
): void {
  if (moduleId !== 'ship' || resourceField !== 'shipInventory') return

  const nextLoad = getResourceLoad(resources) + amount
  const cargoCapacity = getShipCargoCapacity(state)
  if (nextLoad > cargoCapacity) {
    throw new Error('ship_cargo_capacity_exceeded')
  }
}

async function getDedicatedState(uid: string, moduleId: string, session?: import('mongoose').ClientSession) {
  const repo = getDedicatedModuleRepositories()[moduleId]
  if (!repo) return undefined
  return await repo.getOrCreate(uid, undefined, session) as Record<string, unknown>
}

async function patchDedicatedResources(
  uid: string,
  moduleId: string,
  field: string,
  resources: Record<string, unknown>,
  session?: import('mongoose').ClientSession,
) {
  const repo = getDedicatedModuleRepositories()[moduleId]
  if (!repo) return false
  await repo.patch(uid, { [field]: resources }, session)
  return true
}

export const moduleResourceAdapter: ResourceAdapter = {
  async canDebit(uid, ref, amount, session) {
    const moduleId = requireModuleId(ref)
    const { resourceField } = getModuleResourceBinding(moduleId)
    const dedicatedState = await getDedicatedState(uid, moduleId, session)
    if (dedicatedState) {
      const resources = pickResources(dedicatedState, resourceField)
      return Number(resources[ref.resource] ?? 0) >= amount
    }

    const doc = await getModuleStateRepository().getState(uid, moduleId, session)
    const state = doc?.state ?? {}
    const resources = typeof state.resources === 'object' && state.resources
      ? state.resources as Record<string, unknown>
      : state
    return Number(resources[ref.resource] ?? 0) >= amount
  },

  async debit(uid, ref, amount, session) {
    const moduleId = requireModuleId(ref)
    const { resourceField } = getModuleResourceBinding(moduleId)
    const dedicatedState = await getDedicatedState(uid, moduleId, session)
    if (dedicatedState) {
      const resources = pickResources(dedicatedState, resourceField)
      const current = Number(resources[ref.resource] ?? 0)
      const next = current - amount
      if (next < 0) throw new Error('insufficient_module_resource')
      await patchDedicatedResources(uid, moduleId, resourceField, {
        ...resources,
        [ref.resource]: next,
      }, session)
      return
    }

    const doc = await getModuleStateRepository().getState(uid, moduleId, session)
    const state = doc?.state ?? {}
    const resources = typeof state.resources === 'object' && state.resources
      ? state.resources as Record<string, unknown>
      : {}
    const current = Number(resources[ref.resource] ?? 0)
    const next = current - amount
    if (next < 0) throw new Error('insufficient_module_resource')
    await getModuleStateRepository().patchState(uid, moduleId, {
      resources: { ...resources, [ref.resource]: next },
    }, session)
  },

  async credit(uid, ref, amount, session) {
    const moduleId = requireModuleId(ref)
    const { resourceField } = getModuleResourceBinding(moduleId)
    const dedicatedState = await getDedicatedState(uid, moduleId, session)
    if (dedicatedState) {
      const resources = pickResources(dedicatedState, resourceField)
      const current = Number(resources[ref.resource] ?? 0)
      assertCreditCapacity(moduleId, resourceField, dedicatedState, resources, amount)
      await patchDedicatedResources(uid, moduleId, resourceField, {
        ...resources,
        [ref.resource]: current + amount,
      }, session)
      return
    }

    const doc = await getModuleStateRepository().getState(uid, moduleId, session)
    const state = doc?.state ?? {}
    const resources = typeof state.resources === 'object' && state.resources
      ? state.resources as Record<string, unknown>
      : {}
    const current = Number(resources[ref.resource] ?? 0)
    await getModuleStateRepository().patchState(uid, moduleId, {
      resources: { ...resources, [ref.resource]: current + amount },
    }, session)
  },
}






