/**
 * packages/backend/src/repositories/mongoHostStateRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import { HostStateModel, type HostStateDoc } from '../models/HostStateModel.js'
import type { HostResource, HostStatePatch, HostStateRepository } from './hostStateRepository.js'
import { hostResourceToCurrencyId, type CurrencyBalances } from './currencyRepository.js'
import { mongoCurrencyRepository } from './mongoCurrencyRepository.js'
import { mongoDiceResourceRepository } from './mongoDiceResourceRepository.js'
import { mongoUserInventoryRepository } from './mongoUserInventoryRepository.js'

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
    diamonds: seed.diamonds ?? 0,
    diceCount: seed.diceCount ?? 6,
    inventory: seed.inventory ?? {},
    createdAt: now,
    updatedAt: now,
  }
}

function currencySeedFromHostState(state: HostStateDoc): Partial<CurrencyBalances> {
  return {
    coin: state.coins,
    diamond: state.diamonds,
  }
}

function currencyPatchFromHostPatch(patch: HostStatePatch): Partial<CurrencyBalances> {
  const balances: Partial<CurrencyBalances> = {}
  if (patch.coins !== undefined) balances.coin = patch.coins
  if (patch.diamonds !== undefined) balances.diamond = patch.diamonds
  return balances
}

function hasCurrencyPatch(patch: Partial<CurrencyBalances>): boolean {
  return patch.coin !== undefined || patch.diamond !== undefined
}

function withCurrencyMirror(state: HostStateDoc, balances: CurrencyBalances): HostStateDoc {
  return {
    ...state,
    coins: balances.coin,
    diamonds: balances.diamond,
  }
}

function withDiceMirror(state: HostStateDoc, diceCount: number): HostStateDoc {
  return {
    ...state,
    diceCount,
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
    const state = toHostStateDoc(doc)
    state.inventory = await mongoUserInventoryRepository.getInventoryMap(uid, state.inventory, session)
    const balances = await mongoCurrencyRepository.getBalances(uid, currencySeedFromHostState(state), session)
    const dice = await mongoDiceResourceRepository.getOrCreate(uid, { diceQuantity: state.diceCount }, session)
    return withDiceMirror(withCurrencyMirror(state, balances), dice.diceQuantity)
  },

  async patch(uid, patch, session) {
    await this.getOrCreate(uid, patch, session)
    const inventory = patch.inventory !== undefined
      ? await mongoUserInventoryRepository.replaceInventory(uid, patch.inventory, session)
      : undefined
    const currencyPatch = currencyPatchFromHostPatch(patch)
    const balances = hasCurrencyPatch(currencyPatch)
      ? await mongoCurrencyRepository.replaceBalances(uid, currencyPatch, {
        source: 'system',
        reason: 'host_state_patch',
      }, session)
      : undefined
    const dice = patch.diceCount !== undefined
      ? await mongoDiceResourceRepository.replaceDiceQuantity(uid, patch.diceCount, session)
      : undefined
    const currencyMirror = balances !== undefined ? { coins: balances.coin, diamonds: balances.diamond } : {}
    const diceMirror = dice !== undefined ? { diceCount: dice.diceQuantity } : {}
    const doc = await HostStateModel.findOneAndUpdate(
      { uid },
      {
        $set: {
          ...patch,
          ...currencyMirror,
          ...diceMirror,
          ...(inventory !== undefined ? { inventory } : {}),
          updatedAt: Date.now(),
        },
      },
      { new: true, lean: true, session },
    )
    if (!doc) throw new Error('host_state_not_found')
    const state = toHostStateDoc(doc)
    state.inventory = inventory ?? await mongoUserInventoryRepository.getInventoryMap(uid, state.inventory, session)
    const currentBalances = balances ?? await mongoCurrencyRepository.getBalances(uid, currencySeedFromHostState(state), session)
    const currentDice = dice ?? await mongoDiceResourceRepository.getOrCreate(uid, { diceQuantity: state.diceCount }, session)
    return withDiceMirror(withCurrencyMirror(state, currentBalances), currentDice.diceQuantity)
  },

  async mutateResource(uid, resource: HostResource, delta, session) {
    const currencyId = hostResourceToCurrencyId(resource)
    if (currencyId) {
      const balances = await mongoCurrencyRepository.mutateCurrency(uid, currencyId, delta, {
        source: 'game',
        reason: `host_resource_${resource}`,
      }, session)
      return this.patch(uid, {
        coins: balances.coin,
        diamonds: balances.diamond,
      }, session)
    }
    if (resource === 'diceCount') {
      const dice = await mongoDiceResourceRepository.mutateDice(uid, delta, session)
      return this.patch(uid, { diceCount: dice.diceQuantity }, session)
    }
    const current = await this.getOrCreate(uid, undefined, session)
    const next = current[resource] + delta
    if (next < 0) throw new Error('insufficient_host_resource')
    return this.patch(uid, { [resource]: next }, session)
  },

  async mutateInventory(uid, itemId, delta, session) {
    const inventory = await mongoUserInventoryRepository.mutateInventory(uid, itemId, delta, session)
    return this.patch(uid, {
      inventory,
    }, session)
  },
}






