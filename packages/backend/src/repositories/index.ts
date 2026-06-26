/**
 * packages/backend/src/repositories/index.ts
 * ------------------------------------------------------------
 * 역할: Mongo 연결 상태에 따라 memory repository와 Mongo repository를 선택한다.
 * 연결: route/service는 이 파일을 통해 저장소 구현을 간접 사용한다.
 * 주의: 새 repository를 추가하면 health/migration status와 no-legacy 검증에 노출되는지 확인한다.
 */
import { getMongoStatus } from '../db/mongo.js'
import { memoryUserRepository } from './memoryUserRepository.js'
import { memoryModuleStateRepository } from './memoryModuleStateRepository.js'
import { memoryHostStateRepository } from './memoryHostStateRepository.js'
import { mongoUserRepository } from './mongoUserRepository.js'
import { mongoModuleStateRepository } from './mongoModuleStateRepository.js'
import { mongoHostStateRepository } from './mongoHostStateRepository.js'
import { createDedicatedModuleRepositories, type ModuleRepositoryMap } from './moduleRepositoryRegistry.js'
import { memoryCustomsLogRepository } from './memoryCustomsLogRepository.js'
import { mongoCustomsLogRepository } from './mongoCustomsLogRepository.js'
import { memoryAdminRepository } from './memoryAdminRepository.js'
import { mongoAdminRepository } from './mongoAdminRepository.js'
import type { AdminRepository } from './adminRepository.js'
import type { CustomsLogRepository } from './customsLogRepository.js'
import type { HostStateRepository } from './hostStateRepository.js'
import type { ModuleStateRepository } from './moduleStateRepository.js'
import type { UserRepository } from './userRepository.js'

let userRepository: UserRepository = memoryUserRepository
let moduleStateRepository: ModuleStateRepository = memoryModuleStateRepository
let hostStateRepository: HostStateRepository = memoryHostStateRepository
let dedicatedModuleRepositories: ModuleRepositoryMap = createDedicatedModuleRepositories('memory')
let customsLogRepository: CustomsLogRepository = memoryCustomsLogRepository
let adminRepository: AdminRepository = memoryAdminRepository
let repositoryBackend: 'memory' | 'mongo' = 'memory'

export function initializeRepositories(): void {
  const mongo = getMongoStatus()
  if (mongo.connected) {
    repositoryBackend = 'mongo'
    userRepository = mongoUserRepository
    moduleStateRepository = mongoModuleStateRepository
    hostStateRepository = mongoHostStateRepository
    dedicatedModuleRepositories = createDedicatedModuleRepositories('mongo')
    customsLogRepository = mongoCustomsLogRepository
    adminRepository = mongoAdminRepository
    console.info('[repositories] using mongo repositories')
    return
  }

  userRepository = memoryUserRepository
  repositoryBackend = 'memory'
  moduleStateRepository = memoryModuleStateRepository
  hostStateRepository = memoryHostStateRepository
  dedicatedModuleRepositories = createDedicatedModuleRepositories('memory')
  customsLogRepository = memoryCustomsLogRepository
  adminRepository = memoryAdminRepository
  console.info('[repositories] using memory repositories')
}

export function getUserRepository(): UserRepository {
  return userRepository
}

export function getModuleStateRepository(): ModuleStateRepository {
  return moduleStateRepository
}

export function getHostStateRepository(): HostStateRepository {
  return hostStateRepository
}

export function getDedicatedModuleRepositories(): ModuleRepositoryMap {
  return dedicatedModuleRepositories
}

export function getCustomsLogRepository(): CustomsLogRepository {
  return customsLogRepository
}

export function getAdminRepository(): AdminRepository {
  return adminRepository
}

export function getRepositoryStatus() {
  return {
    backend: repositoryBackend,
    dedicatedModuleIds: Object.keys(dedicatedModuleRepositories).sort(),
  }
}






