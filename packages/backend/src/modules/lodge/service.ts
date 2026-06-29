/**
 * packages/backend/src/modules/lodge/service.ts
 * ------------------------------------------------------------
 * 역할: 숙소 모듈의 domain rule과 상태 전이를 담당한다.
 * 연결: /api/modules/lodge/* route가 이 service를 호출하고 lodgeStates 전용 문서를 갱신한다.
 * 주의: 숙소 인벤토리와 다른 모듈 사이의 이동은 여기서 직접 처리하지 않고 customs를 통한다.
 */
import { assertAidongRecruited } from '../my-aidong/service.js'
import { getHostStateRepository, getSooksoRepository } from '../../repositories/index.js'
import { requireModuleRepo, ServiceError, type LooseState } from '../shared.js'
import { listDecorCatalogItems, requireDecorCatalogItem } from '../decorCatalog.js'

const MAX_ASSIGNED_AIDONGS = 5
const LODGE_MODULE_ID = 'lodge'

function getAssignedAidongs(state: LooseState): string[] {
  return Array.isArray(state.assignedAidongs)
    ? state.assignedAidongs as string[]
    : []
}

function getShipCrew(state: LooseState): string[] {
  const result: string[] = []
  for (const field of ['cabinAssignments', 'deckAssignments'] as const) {
    const value = state[field]
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    for (const characterId of Object.values(value as Record<string, unknown>)) {
      if (typeof characterId === 'string' && characterId) result.push(characterId)
    }
  }
  return result
}

function getFurnitureRecord(state: LooseState): Record<string, number> {
  const value = state.furniture
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, number> = {}
  for (const [itemId, rawAmount] of Object.entries(value as Record<string, unknown>)) {
    const amount = Number(rawAmount)
    if (Number.isFinite(amount) && amount > 0) result[itemId] = amount
  }
  return result
}

function requireFurnitureItem(itemId: string) {
  try {
    return requireDecorCatalogItem(LODGE_MODULE_ID, itemId)
  } catch (error) {
    if (error instanceof Error && error.message === 'unsupported_decor_item') {
      throw new ServiceError('unsupported_lodge_furniture', 400)
    }
    throw error
  }
}

function getOwnedFurnitureAmount(furniture: Record<string, number>, itemId: string): number {
  const item = requireFurnitureItem(itemId)
  return (furniture[itemId] ?? 0) + item.defaultOwned
}

function countPlacedFurniture(rooms: Record<string, { furniture: string[] }>, itemId: string, exceptRoomId?: string): number {
  return Object.entries(rooms).reduce((total, [roomId, room]) => (
    roomId === exceptRoomId ? total : total + room.furniture.filter((entry) => entry === itemId).length
  ), 0)
}

async function assertAidongNotSailing(uid: string, characterId: string): Promise<void> {
  const routeState = await requireModuleRepo('route-neighbor').getOrCreate(uid) as LooseState
  if (typeof routeState.currentRoute !== 'string' || !routeState.currentRoute) return
  const shipState = await requireModuleRepo('ship').getOrCreate(uid) as LooseState
  if (getShipCrew(shipState).includes(characterId)) {
    throw new ServiceError('aidong_is_sailing', 409)
  }
}

export async function toggleLodgeAidongAssign(uid: string, characterId: string) {
  if (!characterId) throw new ServiceError('invalid_character_id', 400)

  const repo = requireModuleRepo('lodge')
  const state = await repo.getOrCreate(uid) as LooseState
  const assigned = await getSooksoRepository().getAssignedAidongIds(uid, getAssignedAidongs(state))

  if (assigned.includes(characterId)) {
    const nextAssigned = await getSooksoRepository().replaceAssignedAidongs(
      uid,
      assigned.filter((id) => id !== characterId),
    )
    return await repo.patch(uid, {
      assignedAidongs: nextAssigned,
    })
  }

  await assertAidongRecruited(uid, characterId)
  await assertAidongNotSailing(uid, characterId)
  if (assigned.length >= MAX_ASSIGNED_AIDONGS) {
    throw new ServiceError('lodge_assignment_full', 409)
  }

  const nextAssigned = await getSooksoRepository().replaceAssignedAidongs(uid, [...assigned, characterId])
  return await repo.patch(uid, { assignedAidongs: nextAssigned })
}

export function getLodgeConfig() {
  return {
    maxAssignedAidongs: MAX_ASSIGNED_AIDONGS,
    furnitureItems: listDecorCatalogItems(LODGE_MODULE_ID),
  }
}

export async function purchaseLodgeFurniture(uid: string, itemId: string) {
  const item = requireFurnitureItem(itemId)
  if (item.cost <= 0) throw new ServiceError('lodge_furniture_is_default', 400)

  let host
  try {
    host = await getHostStateRepository().mutateResource(uid, 'coins', -item.cost)
  } catch (error) {
    if (error instanceof Error && error.message === 'insufficient_host_resource') {
      throw new ServiceError('insufficient_coins', 409)
    }
    throw error
  }

  const repo = requireModuleRepo('lodge')
  const state = await repo.getOrCreate(uid) as LooseState
  const furniture = getFurnitureRecord(state)
  const next = await repo.patch(uid, {
    furniture: {
      ...furniture,
      [itemId]: (furniture[itemId] ?? 0) + 1,
    },
  })

  return { state: next, host }
}

export async function toggleLodgeRoomFurniture(uid: string, roomId: string, itemId: string) {
  if (!roomId) throw new ServiceError('invalid_room_id', 400)
  requireFurnitureItem(itemId)

  const repo = requireModuleRepo('lodge')
  const state = await repo.getOrCreate(uid) as LooseState
  const furniture = getFurnitureRecord(state)
  const rooms = await getSooksoRepository().getRoomFurnitureMap(uid, state.rooms as Record<string, unknown> | undefined)
  const currentRoom = rooms[roomId] ?? { furniture: [] }
  const alreadyPlaced = currentRoom.furniture.includes(itemId)
  const nextRoomFurniture = alreadyPlaced
    ? currentRoom.furniture.filter((entry) => entry !== itemId)
    : [...currentRoom.furniture, itemId]

  if (!alreadyPlaced) {
    const owned = getOwnedFurnitureAmount(furniture, itemId)
    const placed = countPlacedFurniture(rooms, itemId, roomId)
    if (placed >= owned) throw new ServiceError('lodge_furniture_not_owned_or_available', 409)
  }

  const nextRooms = await getSooksoRepository().setRoomFurniture(uid, roomId, nextRoomFurniture)
  return await repo.patch(uid, { rooms: nextRooms })
}
