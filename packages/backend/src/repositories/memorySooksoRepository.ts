/**
 * packages/backend/src/repositories/memorySooksoRepository.ts
 * ------------------------------------------------------------
 * 역할: 개발/테스트용 in-memory sookso repository 구현이다.
 */
import {
  createSooksoState,
  normalizeAssignedAidongs,
  normalizeRooms,
  roomFurniturePlacementId,
  roomSlotId,
  type RoomFurniturePlacementDoc,
  type RoomSlotDoc,
  type SooksoRepository,
  type SooksoStateDoc,
} from './sooksoRepository.js'

const sooksoStates = new Map<string, SooksoStateDoc>()
const roomSlots = new Map<string, RoomSlotDoc>()
const furniturePlacements = new Map<string, RoomFurniturePlacementDoc>()

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function placementDocsToRooms(uid: string): Record<string, { furniture: string[] }> {
  const result: Record<string, { furniture: string[] }> = {}
  const docs = Array.from(furniturePlacements.values())
    .filter((doc) => doc.uid === uid)
    .sort((a, b) => a.roomId.localeCompare(b.roomId) || a.placementIndex - b.placementIndex)
  for (const doc of docs) {
    result[doc.roomId] ??= { furniture: [] }
    result[doc.roomId].furniture.push(doc.itemId)
  }
  return result
}

async function seedRoomFurniture(uid: string, seed?: Record<string, unknown>) {
  const hasAny = Array.from(furniturePlacements.values()).some((doc) => doc.uid === uid)
  if (hasAny || !seed) return
  await memorySooksoRepository.replaceRoomFurnitureMap(uid, normalizeRooms(seed))
}

export const memorySooksoRepository: SooksoRepository = {
  async getOrCreateSookso(uid, seed) {
    const existing = sooksoStates.get(uid)
    if (existing) return clone(existing)
    const created = createSooksoState(uid, seed)
    sooksoStates.set(uid, created)
    return clone(created)
  },

  async patchSookso(uid, patch) {
    const current = await this.getOrCreateSookso(uid)
    const next = {
      ...current,
      ...patch,
      sooksoClean: patch.sooksoClean !== undefined ? Boolean(patch.sooksoClean) : current.sooksoClean,
      updatedAt: Date.now(),
    }
    sooksoStates.set(uid, next)
    return clone(next)
  },

  async getAssignedAidongIds(uid, seed) {
    const existing = Array.from(roomSlots.values())
      .filter((slot) => slot.uid === uid && slot.state === 'assigned' && slot.aidongId)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((slot) => slot.aidongId!)
    if (existing.length || !seed?.length) return existing
    return this.replaceAssignedAidongs(uid, seed)
  },

  async replaceAssignedAidongs(uid, aidongIds) {
    const normalized = normalizeAssignedAidongs(aidongIds)
    for (const [id, slot] of roomSlots.entries()) {
      if (slot.uid === uid) roomSlots.delete(id)
    }
    const now = Date.now()
    for (const aidongId of normalized) {
      const id = roomSlotId(uid, aidongId)
      roomSlots.set(id, {
        id,
        uid,
        roomId: aidongId,
        aidongId,
        mydongUid: `${uid}:${aidongId}`,
        state: 'assigned',
        createdAt: now,
        updatedAt: now,
      })
    }
    return normalized
  },

  async getRoomFurnitureMap(uid, seed) {
    await seedRoomFurniture(uid, seed)
    return clone(placementDocsToRooms(uid))
  },

  async setRoomFurniture(uid, roomId, furniture) {
    const current = await this.getRoomFurnitureMap(uid)
    return this.replaceRoomFurnitureMap(uid, {
      ...current,
      [roomId]: { furniture },
    })
  },

  async replaceRoomFurnitureMap(uid, rooms) {
    for (const [id, placement] of furniturePlacements.entries()) {
      if (placement.uid === uid) furniturePlacements.delete(id)
    }
    const now = Date.now()
    for (const [roomId, room] of Object.entries(rooms)) {
      room.furniture.forEach((itemId, placementIndex) => {
        const id = roomFurniturePlacementId(uid, roomId, placementIndex)
        furniturePlacements.set(id, {
          id,
          uid,
          roomId,
          itemId,
          placementIndex,
          placedAt: now,
          updatedAt: now,
        })
      })
    }
    return clone(placementDocsToRooms(uid))
  },

  async delete(uid) {
    const hadSookso = sooksoStates.delete(uid)
    let deleted = hadSookso
    for (const [id, slot] of roomSlots.entries()) {
      if (slot.uid !== uid) continue
      roomSlots.delete(id)
      deleted = true
    }
    for (const [id, placement] of furniturePlacements.entries()) {
      if (placement.uid !== uid) continue
      furniturePlacements.delete(id)
      deleted = true
    }
    return deleted
  },
}
