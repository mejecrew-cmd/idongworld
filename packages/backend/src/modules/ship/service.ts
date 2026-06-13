/**
 * packages/backend/src/modules/ship/service.ts
 * ------------------------------------------------------------
 * 역할: 배 종류, 선실/갑판 배치, 항구 지원, 선실 꾸미기 같은 ship 영속 상태를 관리한다.
 * 연결: 항구/항해 화면의 ship action API가 이 service를 호출한다.
 * 주의: 항해 중/정박 중 여부는 frontend session state가 판단한다. ship backend는 route-neighbor DB를 읽어 전역 출항 lock을 걸지 않는다.
 */
import { getHostStateRepository } from '../../repositories/index.js'
import { assertAidongRecruited } from '../my-aidong/service.js'
import { asNumber, requireModuleRepo, ServiceError, type LooseState } from '../shared.js'
import { listDecorCatalogItems, requireDecorCatalogItem } from '../decorCatalog.js'
import {
  getDefaultShipTypeConfig,
  getShipTypeConfig,
  listShipTypeConfigs,
  requireShipTypeConfig,
} from './balance.js'

const MAX_HARBOR_ASSIGNS = 5
const SHIP_MODULE_ID = 'ship'
const CABIN_SLOT_PATTERN = /^cabin([1-9]\d*)$/
const DECK_SLOT_PATTERN = /^deck([1-9]\d*)$/

export {
  getDefaultShipTypeConfig,
  getShipTypeConfig,
  listShipTypeConfigs,
  requireShipTypeConfig,
}

type AssignmentField = 'cabinAssignments' | 'deckAssignments'
type ShipAssignmentContext = 'harbor' | 'voyage'

function getAssignmentRecord(state: LooseState, field: AssignmentField): Record<string, string> {
  const value = state[field]
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, string> = {}
  for (const [slotId, characterId] of Object.entries(value as Record<string, unknown>)) {
    if (typeof characterId === 'string' && characterId) result[slotId] = characterId
  }
  return result
}

function getHarborAssignedCharacters(state: LooseState): string[] {
  return Array.isArray(state.harborAssignedChars)
    ? (state.harborAssignedChars as string[]).filter((characterId) => typeof characterId === 'string' && characterId)
    : []
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : []
}

function getCabinsRecord(state: LooseState): Record<string, unknown> {
  const value = state.cabins
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function getNumberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, number> = {}
  for (const [itemId, rawAmount] of Object.entries(value as Record<string, unknown>)) {
    const amount = Number(rawAmount)
    if (Number.isFinite(amount) && amount > 0) result[itemId] = amount
  }
  return result
}

function getCabinFurnitureInventory(state: LooseState, cabins: Record<string, unknown>): Record<string, number> {
  const inventory = getNumberRecord(state.cabinFurniture)
  const legacyInventory = getNumberRecord(cabins.__furnitureInventory)
  return { ...legacyInventory, ...inventory }
}

function getCabinFurniture(cabins: Record<string, unknown>, slotId: string): string[] {
  const cabin = cabins[slotId]
  if (!cabin || typeof cabin !== 'object' || Array.isArray(cabin)) return []
  return asStringArray((cabin as Record<string, unknown>).furniture)
}

function requireCabinFurnitureItem(itemId: string) {
  try {
    return requireDecorCatalogItem(SHIP_MODULE_ID, itemId)
  } catch (error) {
    if (error instanceof Error && error.message === 'unsupported_decor_item') {
      throw new ServiceError('unsupported_cabin_furniture', 400)
    }
    throw error
  }
}

function getOwnedCabinFurnitureAmount(inventory: Record<string, number>, itemId: string): number {
  const item = requireCabinFurnitureItem(itemId)
  return (inventory[itemId] ?? 0) + item.defaultOwned
}

function countPlacedCabinFurniture(cabins: Record<string, unknown>, itemId: string, exceptSlotId?: string): number {
  return Object.keys(cabins).reduce((total, slotId) => (
    slotId === '__furnitureInventory' || slotId === exceptSlotId
      ? total
      : total + getCabinFurniture(cabins, slotId).filter((entry) => entry === itemId).length
  ), 0)
}

function getCurrentShipTypeId(state: LooseState): string {
  return typeof state.shipTypeId === 'string' && state.shipTypeId
    ? state.shipTypeId
    : getDefaultShipTypeConfig().shipTypeId
}


function parseSlotIndex(slotId: string, pattern: RegExp, errorCode: string): number {
  const match = pattern.exec(slotId)
  if (!match) throw new ServiceError(errorCode, 400)
  return Number(match[1])
}

function assertSlotCapacity(slotId: string, capacity: number, pattern: RegExp, errorCode: string): void {
  const index = parseSlotIndex(slotId, pattern, errorCode)
  if (index < 1 || index > capacity) throw new ServiceError('ship_slot_out_of_range', 409)
}

function isCharacterAssignedElsewhere(
  characterId: string,
  slotId: string,
  field: AssignmentField,
  cabinAssignments: Record<string, string>,
  deckAssignments: Record<string, string>,
): boolean {
  for (const [currentSlotId, currentCharacterId] of Object.entries(cabinAssignments)) {
    if (field === 'cabinAssignments' && currentSlotId === slotId) continue
    if (currentCharacterId === characterId) return true
  }
  for (const [currentSlotId, currentCharacterId] of Object.entries(deckAssignments)) {
    if (field === 'deckAssignments' && currentSlotId === slotId) continue
    if (currentCharacterId === characterId) return true
  }
  return false
}

function sortedAssignedCharacters(assignments: Record<string, string>, pattern: RegExp): string[] {
  return Object.entries(assignments)
    .map(([slotId, characterId]) => ({
      index: pattern.exec(slotId) ? Number(pattern.exec(slotId)![1]) : Number.MAX_SAFE_INTEGER,
      characterId,
    }))
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.characterId)
}

function uniqueInOrder(characterIds: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const characterId of characterIds) {
    if (seen.has(characterId)) continue
    seen.add(characterId)
    result.push(characterId)
  }
  return result
}

function nextDeckSlotId(deckAssignments: Record<string, string>): string {
  let index = 1
  while (deckAssignments[`deck${index}`]) index++
  return `deck${index}`
}

function removeCharacterFromAssignments(
  characterId: string,
  cabinAssignments: Record<string, string>,
  deckAssignments: Record<string, string>,
) {
  const nextCabinAssignments = { ...cabinAssignments }
  const nextDeckAssignments = { ...deckAssignments }

  for (const [slotId, currentCharacterId] of Object.entries(nextCabinAssignments)) {
    if (currentCharacterId === characterId) delete nextCabinAssignments[slotId]
  }
  for (const [slotId, currentCharacterId] of Object.entries(nextDeckAssignments)) {
    if (currentCharacterId === characterId) delete nextDeckAssignments[slotId]
  }

  return { nextCabinAssignments, nextDeckAssignments }
}

function reflowAssignmentsForShipType(
  cabinAssignments: Record<string, string>,
  deckAssignments: Record<string, string>,
  cabinSlots: number,
) {
  const ordered = uniqueInOrder([
    ...sortedAssignedCharacters(cabinAssignments, CABIN_SLOT_PATTERN),
    ...sortedAssignedCharacters(deckAssignments, DECK_SLOT_PATTERN),
  ])
  const nextCabinAssignments: Record<string, string> = {}
  const nextDeckAssignments: Record<string, string> = {}

  ordered.forEach((characterId, index) => {
    if (index < cabinSlots) {
      nextCabinAssignments[`cabin${index + 1}`] = characterId
      return
    }
    nextDeckAssignments[`deck${index - cabinSlots + 1}`] = characterId
  })

  return {
    cabinAssignments: nextCabinAssignments,
    deckAssignments: nextDeckAssignments,
  }
}

export function getShipConfig() {
  return {
    defaultShipType: getDefaultShipTypeConfig(),
    shipTypes: listShipTypeConfigs(),
    cabinFurnitureItems: listDecorCatalogItems(SHIP_MODULE_ID),
  }
}

export async function changeShipType(uid: string, shipTypeId: string) {
  const config = requireShipTypeConfig(shipTypeId)
  const repo = requireModuleRepo('ship')
  const state = await repo.getOrCreate(uid) as LooseState
  const cabinAssignments = getAssignmentRecord(state, 'cabinAssignments')
  const deckAssignments = getAssignmentRecord(state, 'deckAssignments')
  const reflowed = reflowAssignmentsForShipType(cabinAssignments, deckAssignments, config.cabinSlots)

  return await repo.patch(uid, {
    shipTypeId,
    cabinAssignments: reflowed.cabinAssignments,
    deckAssignments: reflowed.deckAssignments,
  })
}

async function assignShipSlot(
  uid: string,
  field: AssignmentField,
  slotId: string,
  characterId?: string,
  context: ShipAssignmentContext = 'harbor',
) {
  const repo = requireModuleRepo('ship')
  const state = await repo.getOrCreate(uid) as LooseState
  const shipType = requireShipTypeConfig(getCurrentShipTypeId(state))
  const pattern = field === 'cabinAssignments' ? CABIN_SLOT_PATTERN : DECK_SLOT_PATTERN
  const invalidSlotError = field === 'cabinAssignments' ? 'invalid_cabin_slot_id' : 'invalid_deck_slot_id'
  const capacity = field === 'cabinAssignments' ? shipType.cabinSlots : shipType.deckSlots

  assertSlotCapacity(slotId, capacity, pattern, invalidSlotError)

  const cabinAssignments = getAssignmentRecord(state, 'cabinAssignments')
  const deckAssignments = getAssignmentRecord(state, 'deckAssignments')
  const currentAssignments = field === 'cabinAssignments' ? cabinAssignments : deckAssignments
  const nextAssignments = { ...currentAssignments }

  if (!characterId) {
    if (context === 'voyage' && field === 'cabinAssignments' && cabinAssignments[slotId]) {
      const nextCabinAssignments = { ...cabinAssignments }
      const nextDeckAssignments = { ...deckAssignments }
      const deckSlotId = nextDeckSlotId(nextDeckAssignments)
      nextDeckAssignments[deckSlotId] = cabinAssignments[slotId]
      delete nextCabinAssignments[slotId]
      return await repo.patch(uid, {
        cabinAssignments: nextCabinAssignments,
        deckAssignments: nextDeckAssignments,
      })
    }
    if (context === 'voyage' && field === 'deckAssignments') {
      throw new ServiceError('cannot_remove_sailing_aidong', 409)
    }
    delete nextAssignments[slotId]
    return await repo.patch(uid, { [field]: nextAssignments })
  }

  await assertAidongRecruited(uid, characterId)
  const harborAssigned = getHarborAssignedCharacters(state)
  if (harborAssigned.includes(characterId)) {
    throw new ServiceError('aidong_already_assigned_to_harbor_support', 409)
  }
  if (
    context === 'voyage'
    && !Object.values(cabinAssignments).includes(characterId)
    && !Object.values(deckAssignments).includes(characterId)
  ) {
    throw new ServiceError('aidong_not_on_sailing_ship', 409)
  }
  if (context === 'voyage') {
    const { nextCabinAssignments, nextDeckAssignments } = removeCharacterFromAssignments(
      characterId,
      cabinAssignments,
      deckAssignments,
    )
    const currentSlotCharacter = field === 'cabinAssignments'
      ? cabinAssignments[slotId]
      : deckAssignments[slotId]

    if (currentSlotCharacter && currentSlotCharacter !== characterId && field === 'cabinAssignments') {
      nextDeckAssignments[nextDeckSlotId(nextDeckAssignments)] = currentSlotCharacter
    }

    if (field === 'cabinAssignments') {
      nextCabinAssignments[slotId] = characterId
    } else {
      nextDeckAssignments[slotId] = characterId
    }

    return await repo.patch(uid, {
      cabinAssignments: nextCabinAssignments,
      deckAssignments: nextDeckAssignments,
    })
  }
  if (isCharacterAssignedElsewhere(characterId, slotId, field, cabinAssignments, deckAssignments)) {
    throw new ServiceError('aidong_already_assigned_to_ship_slot', 409)
  }

  nextAssignments[slotId] = characterId
  return await repo.patch(uid, { [field]: nextAssignments })
}

export async function assignCabinSlot(
  uid: string,
  slotId: string,
  characterId?: string,
  context?: ShipAssignmentContext,
) {
  return await assignShipSlot(uid, 'cabinAssignments', slotId, characterId, context)
}

export async function assignDeckSlot(
  uid: string,
  slotId: string,
  characterId?: string,
  context?: ShipAssignmentContext,
) {
  return await assignShipSlot(uid, 'deckAssignments', slotId, characterId, context)
}

export async function toggleHarborAssign(uid: string, characterId: string) {
  const repo = requireModuleRepo('ship')
  const state = await repo.getOrCreate(uid) as LooseState
  const assigned = getHarborAssignedCharacters(state)
  const isAssigned = assigned.includes(characterId)

  if (!isAssigned) {
    await assertAidongRecruited(uid, characterId)
    const cabinAssignments = getAssignmentRecord(state, 'cabinAssignments')
    const deckAssignments = getAssignmentRecord(state, 'deckAssignments')
    if (
      Object.values(cabinAssignments).includes(characterId)
      || Object.values(deckAssignments).includes(characterId)
    ) {
      throw new ServiceError('aidong_already_assigned_to_ship_slot', 409)
    }
    if (assigned.length >= MAX_HARBOR_ASSIGNS) {
      throw new ServiceError('harbor_assign_limit', 409)
    }
  }

  const next = assigned.includes(characterId)
    ? assigned.filter((id) => id !== characterId)
    : [...assigned, characterId]

  return await repo.patch(uid, { harborAssignedChars: next })
}

export async function chargeHarborDice(uid: string, now: number) {
  if (!Number.isFinite(now) || now <= 0) {
    throw new ServiceError('invalid_timestamp')
  }

  const repo = requireModuleRepo('ship')
  const state = await repo.getOrCreate(uid) as LooseState
  const assigned = getHarborAssignedCharacters(state)
  const last = asNumber(state.harborLastChargedAt, now)
  if (now < last) {
    throw new ServiceError('invalid_charge_time')
  }

  const hours = Math.floor((now - last) / (1000 * 60 * 60))
  const charge = hours > 0 && assigned.length > 0 ? hours * assigned.length : 0

  const updated = charge > 0
    ? await repo.patch(uid, { harborLastChargedAt: now })
    : state
  const host = charge > 0
    ? await getHostStateRepository().mutateResource(uid, 'diceCount', charge)
    : await getHostStateRepository().getOrCreate(uid)

  return { charge, host, state: updated }
}

export async function purchaseCabinFurniture(uid: string, itemId: string) {
  const item = requireCabinFurnitureItem(itemId)
  if (item.cost <= 0) throw new ServiceError('cabin_furniture_is_default', 400)

  let host
  try {
    host = await getHostStateRepository().mutateResource(uid, 'coins', -item.cost)
  } catch (error) {
    if (error instanceof Error && error.message === 'insufficient_host_resource') {
      throw new ServiceError('insufficient_coins', 409)
    }
    throw error
  }

  const repo = requireModuleRepo('ship')
  const state = await repo.getOrCreate(uid) as LooseState
  const cabins = getCabinsRecord(state)
  const inventory = getCabinFurnitureInventory(state, cabins)
  const next = await repo.patch(uid, {
    cabinFurniture: {
      ...inventory,
      [itemId]: (inventory[itemId] ?? 0) + 1,
    },
  })

  return { state: next, host }
}

export async function toggleCabinFurniture(uid: string, slotId: string, itemId: string) {
  requireCabinFurnitureItem(itemId)
  const repo = requireModuleRepo('ship')
  const state = await repo.getOrCreate(uid) as LooseState
  const shipType = requireShipTypeConfig(getCurrentShipTypeId(state))
  assertSlotCapacity(slotId, shipType.cabinSlots, CABIN_SLOT_PATTERN, 'invalid_cabin_slot_id')

  const cabins = getCabinsRecord(state)
  const inventory = getCabinFurnitureInventory(state, cabins)
  const currentFurniture = getCabinFurniture(cabins, slotId)
  const alreadyPlaced = currentFurniture.includes(itemId)
  const nextFurniture = alreadyPlaced
    ? currentFurniture.filter((entry) => entry !== itemId)
    : [...currentFurniture, itemId]

  if (!alreadyPlaced) {
    const owned = getOwnedCabinFurnitureAmount(inventory, itemId)
    const placed = countPlacedCabinFurniture(cabins, itemId, slotId)
    if (placed >= owned) throw new ServiceError('cabin_furniture_not_owned_or_available', 409)
  }

  const currentCabin = cabins[slotId] && typeof cabins[slotId] === 'object' && !Array.isArray(cabins[slotId])
    ? cabins[slotId] as Record<string, unknown>
    : {}

  return await repo.patch(uid, {
    cabins: {
      ...cabins,
      [slotId]: {
        ...currentCabin,
        furniture: nextFurniture,
      },
    },
  })
}






