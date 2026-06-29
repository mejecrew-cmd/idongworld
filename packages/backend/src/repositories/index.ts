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
import { memoryUserSettingsRepository } from './memoryUserSettingsRepository.js'
import { mongoUserSettingsRepository } from './mongoUserSettingsRepository.js'
import { memoryUserInventoryRepository } from './memoryUserInventoryRepository.js'
import { mongoUserInventoryRepository } from './mongoUserInventoryRepository.js'
import { memoryCurrencyRepository } from './memoryCurrencyRepository.js'
import { mongoCurrencyRepository } from './mongoCurrencyRepository.js'
import { memoryDiceResourceRepository } from './memoryDiceResourceRepository.js'
import { mongoDiceResourceRepository } from './mongoDiceResourceRepository.js'
import { memoryMydongRepository } from './memoryMydongRepository.js'
import { mongoMydongRepository } from './mongoMydongRepository.js'
import { memorySooksoRepository } from './memorySooksoRepository.js'
import { mongoSooksoRepository } from './mongoSooksoRepository.js'
import { memoryMydongPediaInventoryRepository } from './memoryMydongPediaInventoryRepository.js'
import { mongoMydongPediaInventoryRepository } from './mongoMydongPediaInventoryRepository.js'
import { memoryMydongCosmeticRepository } from './memoryMydongCosmeticRepository.js'
import { mongoMydongCosmeticRepository } from './mongoMydongCosmeticRepository.js'
import { InMemoryStaticTableRepository, type StaticTableRepository } from '../staticTables/repository.js'
import { mongoStaticTableRepository } from '../staticTables/mongoRepository.js'
import type { AdminRepository } from './adminRepository.js'
import type { CurrencyRepository } from './currencyRepository.js'
import type { DiceResourceRepository } from './diceResourceRepository.js'
import type { MydongRepository } from './mydongRepository.js'
import type { MydongPediaInventoryRepository } from './mydongPediaInventoryRepository.js'
import type { MydongCosmeticRepository } from './mydongCosmeticRepository.js'
import type { SooksoRepository } from './sooksoRepository.js'
import type { CustomsLogRepository } from './customsLogRepository.js'
import type { HostStateRepository } from './hostStateRepository.js'
import type { ModuleStateRepository } from './moduleStateRepository.js'
import type { UserRepository } from './userRepository.js'
import type { UserSettingsRepository } from './userSettingsRepository.js'
import type { UserInventoryRepository } from './userInventoryRepository.js'

let userRepository: UserRepository = memoryUserRepository
let moduleStateRepository: ModuleStateRepository = memoryModuleStateRepository
let hostStateRepository: HostStateRepository = memoryHostStateRepository
let dedicatedModuleRepositories: ModuleRepositoryMap = createDedicatedModuleRepositories('memory')
let customsLogRepository: CustomsLogRepository = memoryCustomsLogRepository
let adminRepository: AdminRepository = memoryAdminRepository
let userSettingsRepository: UserSettingsRepository = memoryUserSettingsRepository
let userInventoryRepository: UserInventoryRepository = memoryUserInventoryRepository
let currencyRepository: CurrencyRepository = memoryCurrencyRepository
let diceResourceRepository: DiceResourceRepository = memoryDiceResourceRepository
let mydongRepository: MydongRepository = memoryMydongRepository
let sooksoRepository: SooksoRepository = memorySooksoRepository
let mydongPediaInventoryRepository: MydongPediaInventoryRepository = memoryMydongPediaInventoryRepository
let mydongCosmeticRepository: MydongCosmeticRepository = memoryMydongCosmeticRepository
let staticTableRepository: StaticTableRepository = new InMemoryStaticTableRepository()
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
    userSettingsRepository = mongoUserSettingsRepository
    userInventoryRepository = mongoUserInventoryRepository
    currencyRepository = mongoCurrencyRepository
    diceResourceRepository = mongoDiceResourceRepository
    mydongRepository = mongoMydongRepository
    sooksoRepository = mongoSooksoRepository
    mydongPediaInventoryRepository = mongoMydongPediaInventoryRepository
    mydongCosmeticRepository = mongoMydongCosmeticRepository
    staticTableRepository = mongoStaticTableRepository
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
  userSettingsRepository = memoryUserSettingsRepository
  userInventoryRepository = memoryUserInventoryRepository
  currencyRepository = memoryCurrencyRepository
  diceResourceRepository = memoryDiceResourceRepository
  mydongRepository = memoryMydongRepository
  sooksoRepository = memorySooksoRepository
  mydongPediaInventoryRepository = memoryMydongPediaInventoryRepository
  mydongCosmeticRepository = memoryMydongCosmeticRepository
  staticTableRepository = new InMemoryStaticTableRepository()
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

export function getUserSettingsRepository(): UserSettingsRepository {
  return userSettingsRepository
}

export function getUserInventoryRepository(): UserInventoryRepository {
  return userInventoryRepository
}

export function getCurrencyRepository(): CurrencyRepository {
  return currencyRepository
}

export function getDiceResourceRepository(): DiceResourceRepository {
  return diceResourceRepository
}

export function getMydongRepository(): MydongRepository {
  return mydongRepository
}

export function getSooksoRepository(): SooksoRepository {
  return sooksoRepository
}

export function getMydongPediaInventoryRepository(): MydongPediaInventoryRepository {
  return mydongPediaInventoryRepository
}

export function getMydongCosmeticRepository(): MydongCosmeticRepository {
  return mydongCosmeticRepository
}

export function getStaticTableRepository(): StaticTableRepository {
  return staticTableRepository
}

export function getRepositoryStatus() {
  return {
    backend: repositoryBackend,
    dedicatedModuleIds: Object.keys(dedicatedModuleRepositories).sort(),
  }
}






