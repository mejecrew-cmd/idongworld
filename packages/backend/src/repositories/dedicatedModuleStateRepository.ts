/**
 * packages/backend/src/repositories/dedicatedModuleStateRepository.ts
 * ------------------------------------------------------------
 * 역할: 상태 저장소 접근을 캡슐화하는 repository 계층이다.
 * 연결: route/service가 memory와 Mongo 구현 차이를 알지 않도록 같은 인터페이스를 제공한다.
 * 주의: business rule은 service에 두고, repository는 읽기/쓰기와 기본 document 생성에 집중한다.
 */
import type { ClientSession } from 'mongoose'

export interface DedicatedModuleStateRepository<TState extends object> {
  getOrCreate(uid: string, seed?: Partial<TState>, session?: ClientSession): Promise<TState>
  patch(uid: string, patch: Partial<TState>, session?: ClientSession): Promise<TState>
}






