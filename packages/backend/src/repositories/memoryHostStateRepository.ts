/**
 * packages/backend/src/repositories/memoryHostStateRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import type { HostStateDoc } from '../models/HostStateModel.js'
import type { HostResource, HostStatePatch, HostStateRepository } from './hostStateRepository.js'
import { hostResourceToCurrencyId, type CurrencyBalances } from './currencyRepository.js'
import { memoryCurrencyRepository } from './memoryCurrencyRepository.js'
import { memoryDiceResourceRepository } from './memoryDiceResourceRepository.js'
import { memoryUserInventoryRepository } from './memoryUserInventoryRepository.js'

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

export const memoryHostStateRepository: HostStateRepository = {
  async getOrCreate(uid, seed, _session) {
    const current = hostStates.get(uid)
    if (current) {
      const inventory = await memoryUserInventoryRepository.getInventoryMap(uid, current.inventory)
      const balances = await memoryCurrencyRepository.getBalances(uid, currencySeedFromHostState(current))
      const dice = await memoryDiceResourceRepository.getOrCreate(uid, { diceQuantity: current.diceCount })
      return withDiceMirror(withCurrencyMirror({ ...current, inventory }, balances), dice.diceQuantity)
    }
    const created = createHostState(uid, seed)
    created.inventory = await memoryUserInventoryRepository.getInventoryMap(uid, created.inventory)
    const balances = await memoryCurrencyRepository.getBalances(uid, currencySeedFromHostState(created))
    const dice = await memoryDiceResourceRepository.getOrCreate(uid, { diceQuantity: created.diceCount })
    const mirrored = withDiceMirror(withCurrencyMirror(created, balances), dice.diceQuantity)
    hostStates.set(uid, mirrored)
    return mirrored
  },

  async patch(uid, patch, _session) {
    const current = await this.getOrCreate(uid)
    const inventory = patch.inventory !== undefined
      ? await memoryUserInventoryRepository.replaceInventory(uid, patch.inventory)
      : await memoryUserInventoryRepository.getInventoryMap(uid, current.inventory)
    const currencyPatch = currencyPatchFromHostPatch(patch)
    const balances = hasCurrencyPatch(currencyPatch)
      ? await memoryCurrencyRepository.replaceBalances(uid, currencyPatch, {
        source: 'system',
        reason: 'host_state_patch',
      })
      : await memoryCurrencyRepository.getBalances(uid, currencySeedFromHostState(current))
    const dice = patch.diceCount !== undefined
      ? await memoryDiceResourceRepository.replaceDiceQuantity(uid, patch.diceCount)
      : await memoryDiceResourceRepository.getOrCreate(uid, { diceQuantity: current.diceCount })
    const updated = withDiceMirror(withCurrencyMirror(applyPatch(current, { ...patch, inventory }), balances), dice.diceQuantity)
    hostStates.set(uid, updated)
    return updated
  },

  async mutateResource(uid, resource: HostResource, delta, session) {
    const currencyId = hostResourceToCurrencyId(resource)
    if (currencyId) {
      const balances = await memoryCurrencyRepository.mutateCurrency(uid, currencyId, delta, {
        source: 'game',
        reason: `host_resource_${resource}`,
      })
      return this.patch(uid, {
        coins: balances.coin,
        diamonds: balances.diamond,
      }, session)
    }
    if (resource === 'diceCount') {
      const dice = await memoryDiceResourceRepository.mutateDice(uid, delta)
      return this.patch(uid, { diceCount: dice.diceQuantity }, session)
    }
    const current = await this.getOrCreate(uid)
    const next = current[resource] + delta
    if (next < 0) throw new Error('insufficient_host_resource')
    return this.patch(uid, { [resource]: next }, session)
  },

  async mutateInventory(uid, itemId, delta, session) {
    await this.getOrCreate(uid)
    const inventory = await memoryUserInventoryRepository.mutateInventory(uid, itemId, delta)
    return this.patch(uid, {
      inventory,
    }, session)
  },
}






