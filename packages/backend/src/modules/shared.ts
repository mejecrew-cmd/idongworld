/**
 * packages/backend/src/modules/shared.ts
 * ------------------------------------------------------------
 * 역할: backend module API를 mount하거나 공통 helper를 제공한다.
 * 연결: 단일 Express 서버 안에서 모듈별 route/service 경계를 유지한다.
 * 주의: 새 모듈 action은 공통 route에 섞기보다 modules/{moduleId} 아래로 둔다.
 */
import { getDedicatedModuleRepositories } from '../repositories/index.js'

export type LooseState = Record<string, unknown>

export class ServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(code)
  }
}

export function getModuleRepo(moduleId: string) {
  return getDedicatedModuleRepositories()[moduleId]
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function requireModuleRepo(moduleId: string) {
  const repo = getModuleRepo(moduleId)
  if (!repo) throw new ServiceError('module_repository_missing', 500)
  return repo
}






