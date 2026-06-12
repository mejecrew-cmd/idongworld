/**
 * packages/backend/src/repositories/mongoHostStateRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import { HostStateModel, type HostStateDoc } from '../models/HostStateModel.js'
import type { HostResource, HostStatePatch, HostStateRepository } from './hostStateRepository.js'

function toHostStateDoc(doc: unknown): HostStateDoc {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  return plain as unknown as HostStateDoc
}

function createDefaultState(uid: string, seed: HostStatePatch = {}) {
  const now = Date.now()
  return {
    uid,
    hostName: seed.hostName,
    coins: seed.coins ?? 100,
    gems: seed.gems ?? 0,
    diamonds: seed.diamonds ?? 0,
    diceCount: seed.diceCount ?? 6,
    inventory: seed.inventory ?? {},
    createdAt: now,
    updatedAt: now,
  }
}

export const mongoHostStateRepository: HostStateRepository = {
  async getOrCreate(uid, seed, session) {
    const doc = await HostStateModel.findOneAndUpdate(
      { uid },
      {
        $setOnInsert: createDefaultState(uid, seed),
      },
      { upsert: true, new: true, lean: true, session },
    )
    return toHostStateDoc(doc)
  },

  async patch(uid, patch, session) {
    await this.getOrCreate(uid, patch, session)
    const doc = await HostStateModel.findOneAndUpdate(
      { uid },
      { $set: { ...patch, updatedAt: Date.now() } },
      { new: true, lean: true, session },
    )
    if (!doc) throw new Error('host_state_not_found')
    return toHostStateDoc(doc)
  },

  async mutateResource(uid, resource: HostResource, delta, session) {
    const current = await this.getOrCreate(uid, undefined, session)
    const next = current[resource] + delta
    if (next < 0) throw new Error('insufficient_host_resource')
    return this.patch(uid, { [resource]: next }, session)
  },

  async mutateInventory(uid, itemId, delta, session) {
    const current = await this.getOrCreate(uid, undefined, session)
    const next = (current.inventory[itemId] ?? 0) + delta
    if (next < 0) throw new Error('insufficient_host_inventory')
    return this.patch(uid, {
      inventory: { ...current.inventory, [itemId]: next },
    }, session)
  },
}






