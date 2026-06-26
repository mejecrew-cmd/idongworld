/**
 * packages/backend/src/repositories/memoryHostStateRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import type { HostStateDoc } from '../models/HostStateModel.js'
import type { HostResource, HostStatePatch, HostStateRepository } from './hostStateRepository.js'

const hostStates = new Map<string, HostStateDoc>()

function createHostState(uid: string, seed: HostStatePatch = {}): HostStateDoc {
  const now = Date.now()
  return {
    uid,
    hostName: seed.hostName,
    coins: seed.coins ?? 100,
    diamonds: seed.diamonds ?? 0,
    diceCount: seed.diceCount ?? 6,
    inventory: seed.inventory ?? {},
    createdAt: now,
    updatedAt: now,
  }
}

function applyPatch(current: HostStateDoc, patch: HostStatePatch): HostStateDoc {
  return {
    ...current,
    ...patch,
    inventory: patch.inventory ?? current.inventory,
    updatedAt: Date.now(),
  }
}

export const memoryHostStateRepository: HostStateRepository = {
  async getOrCreate(uid, seed, _session) {
    const current = hostStates.get(uid)
    if (current) return current
    const created = createHostState(uid, seed)
    hostStates.set(uid, created)
    return created
  },

  async patch(uid, patch, _session) {
    const current = await this.getOrCreate(uid)
    const updated = applyPatch(current, patch)
    hostStates.set(uid, updated)
    return updated
  },

  async mutateResource(uid, resource: HostResource, delta, session) {
    const current = await this.getOrCreate(uid)
    const next = current[resource] + delta
    if (next < 0) throw new Error('insufficient_host_resource')
    return this.patch(uid, { [resource]: next }, session)
  },

  async mutateInventory(uid, itemId, delta, session) {
    const current = await this.getOrCreate(uid)
    const next = (current.inventory[itemId] ?? 0) + delta
    if (next < 0) throw new Error('insufficient_host_inventory')
    return this.patch(uid, {
      inventory: { ...current.inventory, [itemId]: next },
    }, session)
  },
}






