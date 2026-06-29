/**
 * packages/backend/src/repositories/sooksoRepository.ts
 * ------------------------------------------------------------
 * 역할: 숙소 청소/이름, 방 슬롯, 방별 가구 배치를 normalized row 구조로 관리한다.
 * 연결: lodgeStates는 기존 API 호환 mirror로 유지하고 실제 숙소 권위 상태는 이 저장소를 사용한다.
 */
import type { ClientSession } from 'mongoose'

export interface SooksoStateDoc {
  uid: string
  sooksoName?: string
  sooksoClean: boolean
  createdAt: number
  updatedAt: number
}

export interface RoomSlotDoc {
  id: string
  uid: string
  roomId: string
  mydongUid?: string
  aidongId?: string
  state: 'empty' | 'assigned' | 'inactive' | string
  createdAt: number
  updatedAt: number
}

export interface RoomFurniturePlacementDoc {
  id: string
  uid: string
  roomId: string
  itemId: string
  placementIndex: number
  placedAt: number
  updatedAt: number
}

export interface SooksoRepository {
  getOrCreateSookso(uid: string, seed?: Partial<SooksoStateDoc>, session?: ClientSession): Promise<SooksoStateDoc>
  patchSookso(uid: string, patch: Partial<Pick<SooksoStateDoc, 'sooksoName' | 'sooksoClean'>>, session?: ClientSession): Promise<SooksoStateDoc>
  getAssignedAidongIds(uid: string, seed?: string[], session?: ClientSession): Promise<string[]>
  replaceAssignedAidongs(uid: string, aidongIds: string[], session?: ClientSession): Promise<string[]>
  getRoomFurnitureMap(uid: string, seed?: Record<string, unknown>, session?: ClientSession): Promise<Record<string, { furniture: string[] }>>
  setRoomFurniture(uid: string, roomId: string, furniture: string[], session?: ClientSession): Promise<Record<string, { furniture: string[] }>>
  replaceRoomFurnitureMap(uid: string, rooms: Record<string, { furniture: string[] }>, session?: ClientSession): Promise<Record<string, { furniture: string[] }>>
  delete(uid: string, session?: ClientSession): Promise<boolean>
}

export function roomSlotId(uid: string, roomId: string): string {
  return `${uid}:${roomId}`
}

export function roomFurniturePlacementId(uid: string, roomId: string, placementIndex: number): string {
  return `${uid}:${roomId}:${placementIndex}`
}

export function createSooksoState(uid: string, seed: Partial<SooksoStateDoc> = {}): SooksoStateDoc {
  const now = Date.now()
  return {
    uid,
    sooksoName: seed.sooksoName,
    sooksoClean: Boolean(seed.sooksoClean),
    createdAt: now,
    updatedAt: now,
  }
}

export function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : []
}

export function normalizeRooms(value: Record<string, unknown> = {}): Record<string, { furniture: string[] }> {
  const result: Record<string, { furniture: string[] }> = {}
  for (const [roomId, rawRoom] of Object.entries(value)) {
    const room = rawRoom && typeof rawRoom === 'object' && !Array.isArray(rawRoom)
      ? rawRoom as Record<string, unknown>
      : {}
    result[roomId] = {
      furniture: normalizeStringArray(room.furniture),
    }
  }
  return result
}

export function normalizeAssignedAidongs(aidongIds: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const aidongId of aidongIds) {
    if (!aidongId || seen.has(aidongId)) continue
    seen.add(aidongId)
    result.push(aidongId)
  }
  return result
}
