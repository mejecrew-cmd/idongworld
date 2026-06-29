/**
 * packages/backend/src/repositories/mongoSooksoRepository.ts
 * ------------------------------------------------------------
 * 역할: MongoDB 기반 sookso repository 구현이다.
 */
import type { ClientSession } from 'mongoose'
import { RoomFurniturePlacementModel } from '../models/RoomFurniturePlacementModel.js'
import { RoomSlotModel } from '../models/RoomSlotModel.js'
import { SooksoStateModel } from '../models/SooksoStateModel.js'
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

function toSooksoStateDoc(doc: unknown): SooksoStateDoc {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  return plain as unknown as SooksoStateDoc
}

function toRoomSlotDoc(doc: unknown): RoomSlotDoc {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  return plain as unknown as RoomSlotDoc
}

function toPlacementDoc(doc: unknown): RoomFurniturePlacementDoc {
  const plain = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>
  delete plain._id
  return plain as unknown as RoomFurniturePlacementDoc
}

function placementsToRooms(docs: RoomFurniturePlacementDoc[]): Record<string, { furniture: string[] }> {
  const result: Record<string, { furniture: string[] }> = {}
  for (const doc of docs.sort((a, b) => a.roomId.localeCompare(b.roomId) || a.placementIndex - b.placementIndex)) {
    result[doc.roomId] ??= { furniture: [] }
    result[doc.roomId].furniture.push(doc.itemId)
  }
  return result
}

async function seedRoomFurniture(uid: string, seed?: Record<string, unknown>, session?: ClientSession) {
  const existingCount = await RoomFurniturePlacementModel.countDocuments({ uid }).session(session ?? null)
  if (existingCount > 0 || !seed) return
  await mongoSooksoRepository.replaceRoomFurnitureMap(uid, normalizeRooms(seed), session)
}

export const mongoSooksoRepository: SooksoRepository = {
  async getOrCreateSookso(uid, seed, session) {
    const doc = await SooksoStateModel.findOneAndUpdate(
      { uid },
      { $setOnInsert: createSooksoState(uid, seed) },
      { new: true, upsert: true, lean: true, session },
    )
    return toSooksoStateDoc(doc)
  },

  async patchSookso(uid, patch, session) {
    const now = Date.now()
    const doc = await SooksoStateModel.findOneAndUpdate(
      { uid },
      {
        $set: {
          ...patch,
          ...(patch.sooksoClean !== undefined ? { sooksoClean: Boolean(patch.sooksoClean) } : {}),
          updatedAt: now,
        },
        $setOnInsert: {
          uid,
          createdAt: now,
        },
      },
      { new: true, upsert: true, lean: true, session },
    )
    return toSooksoStateDoc(doc)
  },

  async getAssignedAidongIds(uid, seed, session) {
    const docs = await RoomSlotModel.find({ uid, state: 'assigned' }).session(session ?? null).lean()
    const assigned = docs.map(toRoomSlotDoc)
      .filter((slot) => Boolean(slot.aidongId))
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((slot) => slot.aidongId!)
    if (assigned.length || !seed?.length) return assigned
    return this.replaceAssignedAidongs(uid, seed, session)
  },

  async replaceAssignedAidongs(uid, aidongIds, session) {
    const normalized = normalizeAssignedAidongs(aidongIds)
    await RoomSlotModel.deleteMany({ uid }).session(session ?? null)
    const now = Date.now()
    if (normalized.length) {
      await RoomSlotModel.insertMany(
        normalized.map((aidongId) => ({
          id: roomSlotId(uid, aidongId),
          uid,
          roomId: aidongId,
          aidongId,
          mydongUid: `${uid}:${aidongId}`,
          state: 'assigned',
          createdAt: now,
          updatedAt: now,
        })),
        { session },
      )
    }
    return normalized
  },

  async getRoomFurnitureMap(uid, seed, session) {
    await seedRoomFurniture(uid, seed, session)
    const docs = await RoomFurniturePlacementModel.find({ uid }).session(session ?? null).lean()
    return placementsToRooms(docs.map(toPlacementDoc))
  },

  async setRoomFurniture(uid, roomId, furniture, session) {
    const current = await this.getRoomFurnitureMap(uid, undefined, session)
    return this.replaceRoomFurnitureMap(uid, {
      ...current,
      [roomId]: { furniture },
    }, session)
  },

  async replaceRoomFurnitureMap(uid, rooms, session) {
    await RoomFurniturePlacementModel.deleteMany({ uid }).session(session ?? null)
    const now = Date.now()
    const docs: RoomFurniturePlacementDoc[] = []
    for (const [roomId, room] of Object.entries(rooms)) {
      room.furniture.forEach((itemId, placementIndex) => {
        docs.push({
          id: roomFurniturePlacementId(uid, roomId, placementIndex),
          uid,
          roomId,
          itemId,
          placementIndex,
          placedAt: now,
          updatedAt: now,
        })
      })
    }
    if (docs.length) await RoomFurniturePlacementModel.insertMany(docs, { session })
    return this.getRoomFurnitureMap(uid, undefined, session)
  },

  async delete(uid, session) {
    const [sooksoResult, slotResult, placementResult] = await Promise.all([
      SooksoStateModel.deleteOne({ uid }).session(session ?? null),
      RoomSlotModel.deleteMany({ uid }).session(session ?? null),
      RoomFurniturePlacementModel.deleteMany({ uid }).session(session ?? null),
    ])
    return Boolean(sooksoResult.deletedCount || slotResult.deletedCount || placementResult.deletedCount)
  },
}
