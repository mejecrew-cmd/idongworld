/**
 * packages/backend/src/repositories/hostStateRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import type { ClientSession } from 'mongoose'
import type { HostStateDoc } from '../models/HostStateModel.js'

export type HostResource = 'coins' | 'gems' | 'diamonds' | 'diceCount'

export interface HostStatePatch {
  hostName?: string
  coins?: number
  gems?: number
  diamonds?: number
  diceCount?: number
  inventory?: Record<string, number>
}

export interface HostStateRepository {
  getOrCreate(uid: string, seed?: HostStatePatch, session?: ClientSession): Promise<HostStateDoc>
  patch(uid: string, patch: HostStatePatch, session?: ClientSession): Promise<HostStateDoc>
  mutateResource(uid: string, resource: HostResource, delta: number, session?: ClientSession): Promise<HostStateDoc>
  mutateInventory(uid: string, itemId: string, delta: number, session?: ClientSession): Promise<HostStateDoc>
}






