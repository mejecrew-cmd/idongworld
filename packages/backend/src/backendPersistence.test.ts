/**
 * packages/backend/src/backendPersistence.test.ts
 * ------------------------------------------------------------
 * 역할: backend persistence split의 핵심 회귀 테스트다.
 * 연결: repository 선택, module model spec, module storage, customs resource 이동을 한 번에 검증한다.
 * 주의: 새 dedicated module storage나 customs adapter를 추가하면 이 테스트의 기대값도 함께 갱신한다.
 */
import { describe, expect, it } from 'vitest'
import {
  getDedicatedModuleRepositories,
  getUserRepository,
  getHostStateRepository,
  getCustomsLogRepository,
  initializeRepositories,
} from './repositories/index.js'
import { calculateCustomsAmounts, getCustomsRule, listCustomsRules } from './customs/rules.js'
import {
  getResourceAdapter,
  validateResourceRef,
  type ResourceAdapter,
  type ResourceRef,
} from './resources/index.js'
import { getModuleResourceBinding, listModuleResourceBindings } from './resources/moduleResourceRegistry.js'
import { executeCustomsTransfer, isAdHocCustomsApplyEnabled } from './routes/customs.js'
import { resolveBackendAssetRef } from './routes/assets.js'
import {
  authMiddleware,
  getAuthRuntimeStatus,
  isFirebaseAuthRequired,
  isLegacyAuthFallbackEnabled,
  type AuthedRequest,
} from './middleware/auth.js'
import { fullyRegisterCodex, unlockCodexSlot, unlockDiary } from './modules/codex/service.js'
import { purchaseLodgeFurniture, toggleLodgeAidongAssign, toggleLodgeRoomFurniture } from './modules/lodge/service.js'
import { addAidongAffinity, recruitAidong, toggleAidongEquippedItem } from './modules/my-aidong/service.js'
import { listModuleModelSpecs } from './modules/modelSpecs.js'
import {
  clearDestinationMission,
  interactDestinationHotspot,
  moveDestinationIsland,
} from './modules/destination-island/service.js'
import type { DestinationIslandStateDoc } from './models/DestinationIslandStateModel.js'
import {
  clearCurrentLanding,
  endRoute,
  getCurrentLanding,
  rollRoute,
  startRoute,
} from './modules/route-neighbor/service.js'
import {
  assignCabinSlot,
  assignDeckSlot,
  changeShipType,
  chargeHarborDice,
  getDefaultShipTypeConfig,
  getShipConfig,
  getShipTypeConfig,
  listShipTypeConfigs,
  purchaseCabinFurniture,
  requireShipTypeConfig,
  toggleCabinFurniture,
  toggleHarborAssign,
} from './modules/ship/service.js'
import { getZoneBalanceRule } from './modules/zone/balance.js'
import { clearZone, collectZoneResource } from './modules/zone/service.js'
import type { HostStateDoc } from './models/HostStateModel.js'
import type { LodgeStateDoc } from './models/LodgeStateModel.js'
import type { MyAidongStateDoc } from './models/MyAidongStateModel.js'
import type { MyIslandStateDoc } from './models/MyIslandStateModel.js'
import type { ZoneStateDoc } from './models/ZoneStateModel.js'

function testUid(label: string) {
  return `test-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const MODULE_REPOSITORY_OPERATION_CASES: Record<string, {
  seed: Record<string, unknown>
  secondSeed: Record<string, unknown>
  patch: Record<string, unknown>
  expectedCreated: Record<string, unknown>
  expectedPatched: Record<string, unknown>
}> = {
  'my-aidong': {
    seed: { recruitedAidongs: ['seed-aidong'] },
    secondSeed: { recruitedAidongs: ['ignored-aidong'] },
    patch: { affinities: { 'seed-aidong': { score: 7, level: 0 } } },
    expectedCreated: { recruitedAidongs: ['seed-aidong'] },
    expectedPatched: {
      recruitedAidongs: ['seed-aidong'],
      affinities: { 'seed-aidong': { score: 7, level: 0 } },
      equippedItems: {},
    },
  },
  'my-island': {
    seed: { unlockedZones: ['zone-garden'] },
    secondSeed: { unlockedZones: ['zone-mine'] },
    patch: { zoneProgress: { 'zone-garden': { cleared: 1 } } },
    expectedCreated: { unlockedZones: ['zone-garden'] },
    expectedPatched: {
      unlockedZones: ['zone-garden'],
      zoneProgress: { 'zone-garden': { cleared: 1 } },
    },
  },
  codex: {
    seed: { unlockedDiaries: ['hwanggumeong_day1'] },
    secondSeed: { unlockedDiaries: ['chumnyang_day1'] },
    patch: { unlockedCodexEntries: ['황금멍'] },
    expectedCreated: { unlockedDiaries: ['hwanggumeong_day1'] },
    expectedPatched: {
      unlockedDiaries: ['hwanggumeong_day1'],
      unlockedCodexEntries: ['황금멍'],
    },
  },
  lodge: {
    seed: { assignedAidongs: ['seed-aidong'] },
    secondSeed: { assignedAidongs: ['ignored-aidong'] },
    patch: { lodgeInventory: { blanket: 2 }, rooms: { 'main-room': { level: 1 } } },
    expectedCreated: { assignedAidongs: ['seed-aidong'] },
    expectedPatched: {
      assignedAidongs: ['seed-aidong'],
      lodgeInventory: { blanket: 2 },
      rooms: { 'main-room': { level: 1 } },
    },
  },
  'route-neighbor': {
    seed: { currentRoute: 'neighbor', boardPosition: 2 },
    secondSeed: { currentRoute: 'ignored', boardPosition: 9 },
    patch: { localResources: { 'deck-cargo': 3 } },
    expectedCreated: { currentRoute: 'neighbor', boardPosition: 2 },
    expectedPatched: {
      currentRoute: 'neighbor',
      boardPosition: 2,
      localResources: { 'deck-cargo': 3 },
    },
  },
  ship: {
    seed: { shipTypeId: 'sloop', harborAssignedChars: ['황금멍'] },
    secondSeed: { harborAssignedChars: ['춤냥'] },
    patch: {
      shipInventory: { sailcloth: 2 },
      cabinAssignments: { cabin1: '황금멍' },
      deckAssignments: { deck1: '춤냥' },
      cabinFurniture: { window: 1 },
      cargo: { acorn: 5 },
      cabins: { cabin1: '황금멍' },
    },
    expectedCreated: { shipTypeId: 'sloop', harborAssignedChars: ['황금멍'] },
    expectedPatched: {
      shipTypeId: 'sloop',
      harborAssignedChars: ['황금멍'],
      shipInventory: { sailcloth: 2 },
      cabinAssignments: { cabin1: '황금멍' },
      deckAssignments: { deck1: '춤냥' },
      cabinFurniture: { window: 1 },
      cargo: { acorn: 5 },
      cabins: { cabin1: '황금멍' },
    },
  },
  'destination-shell-island': {
    seed: {
      currentNodeId: 'beach-center',
      visitedNodeIds: ['beach-center'],
      localResources: { 'shell-fragment': 1 },
    },
    secondSeed: { currentNodeId: 'old-shrine' },
    patch: {
      currentNodeId: 'beach-west',
      visitedNodeIds: ['beach-center', 'beach-west'],
      hotspotStates: { 'shell-rock': { interacted: true, count: 1 } },
    },
    expectedCreated: {
      moduleId: 'destination-shell-island',
      currentNodeId: 'beach-center',
      visitedNodeIds: ['beach-center'],
      localResources: { 'shell-fragment': 1 },
    },
    expectedPatched: {
      moduleId: 'destination-shell-island',
      currentNodeId: 'beach-west',
      visitedNodeIds: ['beach-center', 'beach-west'],
      localResources: { 'shell-fragment': 1 },
      hotspotStates: { 'shell-rock': { interacted: true, count: 1 } },
    },
  },
  'zone-garden': {
    seed: { localResources: { acorn: 1 } },
    secondSeed: { localResources: { acorn: 99 } },
    patch: { clearedCount: 1, progress: { lastClearId: 'garden-harvest' } },
    expectedCreated: { moduleId: 'zone-garden', localResources: { acorn: 1 } },
    expectedPatched: {
      moduleId: 'zone-garden',
      localResources: { acorn: 1 },
      clearedCount: 1,
      progress: { lastClearId: 'garden-harvest' },
    },
  },
  'zone-oasis': {
    seed: { localResources: { rest_token: 1 } },
    secondSeed: { localResources: { rest_token: 99 } },
    patch: { clearedCount: 1, progress: { lastClearId: 'oasis-rest' } },
    expectedCreated: { moduleId: 'zone-oasis', localResources: { rest_token: 1 } },
    expectedPatched: {
      moduleId: 'zone-oasis',
      localResources: { rest_token: 1 },
      clearedCount: 1,
      progress: { lastClearId: 'oasis-rest' },
    },
  },
  'zone-memory': {
    seed: { localResources: { memory_piece: 1 } },
    secondSeed: { localResources: { memory_piece: 99 } },
    patch: { clearedCount: 1, progress: { lastClearId: 'memory-match' } },
    expectedCreated: { moduleId: 'zone-memory', localResources: { memory_piece: 1 } },
    expectedPatched: {
      moduleId: 'zone-memory',
      localResources: { memory_piece: 1 },
      clearedCount: 1,
      progress: { lastClearId: 'memory-match' },
    },
  },
  'zone-mine': {
    seed: { localResources: { ore: 1 } },
    secondSeed: { localResources: { ore: 99 } },
    patch: { clearedCount: 1, progress: { lastClearId: 'mine-dig' } },
    expectedCreated: { moduleId: 'zone-mine', localResources: { ore: 1 } },
    expectedPatched: {
      moduleId: 'zone-mine',
      localResources: { ore: 1 },
      clearedCount: 1,
      progress: { lastClearId: 'mine-dig' },
    },
  },
}

describe('backend persistence contracts', () => {
  it('loads active customs rules from module customs.csv files', () => {
    const rules = listCustomsRules()
    const ruleIds = rules.map((rule) => rule.ruleId).sort()

    expect(ruleIds).toEqual([
      'deck-to-coins',
      'deck-to-gems',
      'garden-acorn-to-coins',
      'garden-acorn-to-deck',
      'garden-flower-to-gems',
      'lodge-aidong-ribbon-to-host',
      'shell-fragment-to-coins',
      'shell-fragment-to-ship',
      'ship-acorn-to-lodge',
      'ship-deck-cargo-to-lodge',
      'ship-flower-to-lodge',
      'ship-memory-piece-to-lodge',
      'ship-ore-to-lodge',
      'ship-rest-token-to-lodge',
      'ship-sailcloth-to-host',
      'ship-shell-fragment-to-lodge',
    ])

    const gardenRule = getCustomsRule('garden-acorn-to-coins')
    const deckRule = getCustomsRule('deck-to-coins')
    const shipRule = getCustomsRule('ship-acorn-to-lodge')
    const lodgeRule = getCustomsRule('lodge-aidong-ribbon-to-host')
    const destinationRule = getCustomsRule('shell-fragment-to-ship')

    expect(gardenRule?.sourceFile).toBe('zone-garden/customs.csv')
    expect(deckRule?.sourceFile).toBe('route-neighbor/customs.csv')
    expect(shipRule?.sourceFile).toBe('ship/customs.csv')
    expect(lodgeRule?.sourceFile).toBe('lodge/customs.csv')
    expect(destinationRule?.sourceFile).toBe('destination-shell-island/customs.csv')
    expect(gardenRule && calculateCustomsAmounts(gardenRule, 2)).toEqual({
      debitAmount: 10,
      creditAmount: 2,
    })
    expect(deckRule && calculateCustomsAmounts(deckRule, 2)).toEqual({
      debitAmount: 2,
      creditAmount: 4,
    })
    expect(destinationRule && calculateCustomsAmounts(destinationRule, 2)).toEqual({
      debitAmount: 10,
      creditAmount: 2,
    })
  })

  it('keeps ad-hoc customs apply disabled by default in production', () => {
    const previousNodeEnv = process.env.NODE_ENV
    const previousAdHoc = process.env.CUSTOMS_AD_HOC_APPLY_ENABLED

    delete process.env.CUSTOMS_AD_HOC_APPLY_ENABLED
    process.env.NODE_ENV = 'development'
    expect(isAdHocCustomsApplyEnabled()).toBe(true)

    process.env.NODE_ENV = 'production'
    expect(isAdHocCustomsApplyEnabled()).toBe(false)

    process.env.CUSTOMS_AD_HOC_APPLY_ENABLED = 'true'
    expect(isAdHocCustomsApplyEnabled()).toBe(true)

    process.env.CUSTOMS_AD_HOC_APPLY_ENABLED = 'false'
    expect(isAdHocCustomsApplyEnabled()).toBe(false)

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = previousNodeEnv
    }
    if (previousAdHoc === undefined) {
      delete process.env.CUSTOMS_AD_HOC_APPLY_ENABLED
    } else {
      process.env.CUSTOMS_AD_HOC_APPLY_ENABLED = previousAdHoc
    }
  })

  it('resolves public assets immediately and keeps protected assets behind signed-url policy', () => {
    const previousNodeEnv = process.env.NODE_ENV
    const previousFallback = process.env.ASSET_PROTECTED_LOCAL_FALLBACK_ENABLED

    process.env.NODE_ENV = 'development'
    delete process.env.ASSET_PROTECTED_LOCAL_FALLBACK_ENABLED

    const publicAsset = resolveBackendAssetRef({
      assetId: 'shell-bg',
      category: 'backgrounds',
      assetKey: 'destination/shell/bg.png',
      visibility: 'public',
      version: 1,
    }, 'asset-user')
    expect(publicAsset).toMatchObject({
      assetId: 'shell-bg',
      requiresSignedUrl: false,
      signedUrlProvider: 'not-required',
      url: '/assets/backgrounds/destination/shell/bg.png?v=1',
    })

    const protectedAsset = resolveBackendAssetRef({
      assetId: 'shell-rive',
      category: 'rive',
      assetKey: 'destination/shell/reaction.riv',
      visibility: 'protected',
      version: 'v1',
    }, 'asset-user')
    expect(protectedAsset).toMatchObject({
      assetId: 'shell-rive',
      requiresSignedUrl: true,
      signedUrlProvider: 'local-fallback',
      url: '/assets/rive/protected/destination/shell/reaction.riv?v=v1',
    })
    expect(protectedAsset.expiresAt).toBeTypeOf('number')

    process.env.NODE_ENV = 'production'
    delete process.env.ASSET_PROTECTED_LOCAL_FALLBACK_ENABLED
    const productionProtectedAsset = resolveBackendAssetRef({
      assetId: 'shell-rive',
      category: 'rive',
      assetKey: 'destination/shell/reaction.riv',
      visibility: 'protected',
    }, 'asset-user')
    expect(productionProtectedAsset).toMatchObject({
      requiresSignedUrl: true,
      signedUrlProvider: 'pending-provider',
    })
    expect(productionProtectedAsset.url).toBeUndefined()

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = previousNodeEnv
    }
    if (previousFallback === undefined) {
      delete process.env.ASSET_PROTECTED_LOCAL_FALLBACK_ENABLED
    } else {
      process.env.ASSET_PROTECTED_LOCAL_FALLBACK_ENABLED = previousFallback
    }
  })

  it('keeps legacy uid auth fallback disabled by default in production', async () => {
    const previousNodeEnv = process.env.NODE_ENV
    const previousFallback = process.env.AUTH_LEGACY_UID_FALLBACK_ENABLED

    delete process.env.AUTH_LEGACY_UID_FALLBACK_ENABLED
    process.env.NODE_ENV = 'development'
    expect(isLegacyAuthFallbackEnabled()).toBe(true)

    process.env.NODE_ENV = 'production'
    expect(isLegacyAuthFallbackEnabled()).toBe(false)

    process.env.AUTH_LEGACY_UID_FALLBACK_ENABLED = 'true'
    expect(isLegacyAuthFallbackEnabled()).toBe(true)

    process.env.AUTH_LEGACY_UID_FALLBACK_ENABLED = 'false'
    expect(isLegacyAuthFallbackEnabled()).toBe(false)

    delete process.env.AUTH_LEGACY_UID_FALLBACK_ENABLED
    process.env.NODE_ENV = 'production'
    const productionReq = {
      headers: { 'x-uid': 'legacy-production-user' },
      query: {},
      body: {},
    } as unknown as AuthedRequest
    let productionNextCalled = false
    await authMiddleware(productionReq, {} as never, () => {
      productionNextCalled = true
    })
    expect(productionNextCalled).toBe(true)
    expect(productionReq.uid).toBeUndefined()

    process.env.NODE_ENV = 'development'
    const developmentReq = {
      headers: { 'x-uid': 'legacy-development-user' },
      query: {},
      body: {},
    } as unknown as AuthedRequest
    await authMiddleware(developmentReq, {} as never, () => {})
    expect(developmentReq.uid).toBe('legacy-development-user')
    expect(developmentReq.authSource).toBe('legacy')

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = previousNodeEnv
    }
    if (previousFallback === undefined) {
      delete process.env.AUTH_LEGACY_UID_FALLBACK_ENABLED
    } else {
      process.env.AUTH_LEGACY_UID_FALLBACK_ENABLED = previousFallback
    }
  })

  it('reports production Firebase auth as required unless explicitly disabled', () => {
    const previousNodeEnv = process.env.NODE_ENV
    const previousRequired = process.env.AUTH_FIREBASE_REQUIRED

    delete process.env.AUTH_FIREBASE_REQUIRED
    process.env.NODE_ENV = 'development'
    expect(isFirebaseAuthRequired()).toBe(false)

    process.env.NODE_ENV = 'production'
    expect(isFirebaseAuthRequired()).toBe(true)

    process.env.AUTH_FIREBASE_REQUIRED = 'false'
    expect(isFirebaseAuthRequired()).toBe(false)

    process.env.AUTH_FIREBASE_REQUIRED = 'true'
    expect(isFirebaseAuthRequired()).toBe(true)

    const status = getAuthRuntimeStatus()
    expect(status).toMatchObject({
      nodeEnv: 'production',
      firebaseAuthRequired: true,
      legacyUidFallbackEnabled: false,
    })
    expect(typeof status.firebaseAdminEnabled).toBe('boolean')

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = previousNodeEnv
    }
    if (previousRequired === undefined) {
      delete process.env.AUTH_FIREBASE_REQUIRED
    } else {
      process.env.AUTH_FIREBASE_REQUIRED = previousRequired
    }
  })

  it('upserts Google and Twitter auth users without touching module documents', async () => {
    initializeRepositories()

    const google = await getUserRepository().createOrUpdateAuthUser({
      uid: 'firebase-google-user',
      provider: 'google',
      email: 'google@example.com',
      displayName: 'Google User',
      photoURL: 'https://example.com/google.png',
    })
    expect(google).toMatchObject({
      uid: 'firebase-google-user',
      isGuest: false,
      authProvider: 'google',
      email: 'google@example.com',
      displayName: 'Google User',
      nickname: 'Google User',
    })

    const updated = await getUserRepository().createOrUpdateAuthUser({
      uid: 'firebase-google-user',
      provider: 'twitter',
      displayName: 'Twitter User',
    })
    expect(updated).toMatchObject({
      uid: 'firebase-google-user',
      isGuest: false,
      authProvider: 'twitter',
      displayName: 'Twitter User',
      nickname: 'Google User',
    })

    const aidongState = await getDedicatedModuleRepositories()['my-aidong'].getOrCreate('firebase-google-user')
    expect((aidongState as { recruitedAidongs?: string[] }).recruitedAidongs).toEqual([])
  })

  it('validates customs resource refs before adapters touch documents', () => {
    expect(validateResourceRef({ scope: 'host', resource: 'coins' })).toBeUndefined()
    expect(validateResourceRef({ scope: 'module', moduleId: 'zone-garden', resource: 'acorn' }))
      .toBeUndefined()
    expect(validateResourceRef({ scope: 'host', moduleId: 'host', resource: 'coins' }))
      .toBe('host_resource_must_not_have_moduleId')
    expect(validateResourceRef({ scope: 'module', moduleId: 'host', resource: 'coins' }))
      .toBe('reserved_moduleId_for_module_resource')
    expect(validateResourceRef({ scope: 'module', resource: 'acorn' }))
      .toBe('module_resource_requires_moduleId')
    expect(validateResourceRef({ scope: 'module', moduleId: 'zone-garden', resource: '' }))
      .toBe('invalid_resource')
  })

  it('declares module resource fields through an explicit registry', () => {
    expect(listModuleResourceBindings().map((binding) => binding.moduleId).sort()).toEqual([
      'destination-shell-island',
      'lodge',
      'route-neighbor',
      'ship',
      'zone-garden',
      'zone-memory',
      'zone-mine',
      'zone-oasis',
    ])
    expect(getModuleResourceBinding('destination-shell-island')).toMatchObject({
      resourceField: 'localResources',
      storage: 'dedicated',
    })
    expect(getModuleResourceBinding('zone-garden')).toMatchObject({
      resourceField: 'localResources',
      storage: 'dedicated',
    })
    expect(getModuleResourceBinding('ship')).toMatchObject({
      resourceField: 'shipInventory',
      storage: 'dedicated',
    })
    expect(getModuleResourceBinding('lodge')).toMatchObject({
      resourceField: 'lodgeInventory',
      storage: 'dedicated',
    })
    expect(getModuleResourceBinding('future-module')).toMatchObject({
      resourceField: 'resources',
      storage: 'moduleStates',
    })
  })

  it('loads ship type config from ship balance.csv', () => {
    const shipTypes = listShipTypeConfigs()
    const config = getShipConfig()
    expect(shipTypes.map((shipType) => shipType.shipTypeId)).toEqual(['dinghy', 'sloop', 'cutter'])
    expect(config.defaultShipType.shipTypeId).toBe('dinghy')
    expect(config.shipTypes).toHaveLength(3)

    expect(getDefaultShipTypeConfig()).toMatchObject({
      shipTypeId: 'dinghy',
      cabinSlots: 1,
      deckSlots: 1,
      cargoCapacity: 10,
      diceBonus: 0,
      isDefault: true,
    })
    expect(getShipTypeConfig('sloop')).toMatchObject({
      cabinSlots: 2,
      deckSlots: 2,
      cargoCapacity: 25,
      diceBonus: 1,
    })
    expect(() => requireShipTypeConfig('unknown-ship')).toThrow('invalid_ship_type')
  })

  it('registers dedicated repositories for module-local state', async () => {
    initializeRepositories()

    const uid = testUid('dedicated')
    const repositories = getDedicatedModuleRepositories()

    expect(Object.keys(repositories).sort()).toEqual([
      'codex',
      'destination-shell-island',
      'lodge',
      'my-aidong',
      'my-island',
      'route-neighbor',
      'ship',
      'zone-garden',
      'zone-memory',
      'zone-mine',
      'zone-oasis',
    ])

    const zone = await repositories['zone-garden'].patch(uid, {
      localResources: { acorn: 20 },
    } as Partial<ZoneStateDoc>) as ZoneStateDoc

    expect(zone.moduleId).toBe('zone-garden')
    expect(zone.localResources.acorn).toBe(20)
  })

  it('keeps module model specs aligned with dedicated repositories', () => {
    initializeRepositories()

    const repositories = getDedicatedModuleRepositories()
    const specs = listModuleModelSpecs()

    expect(specs.map((spec) => spec.moduleId).sort()).toEqual(Object.keys(repositories).sort())
    expect(specs.find((spec) => spec.moduleId === 'ship')).toMatchObject({
      storage: 'dedicated',
      collectionName: 'shipStates',
    })
    expect(specs.find((spec) => spec.moduleId === 'route-neighbor')?.ownedFields)
      .toContain('localResources')
    expect(specs.find((spec) => spec.moduleId === 'route-neighbor')?.ownedFields)
      .toContain('landings')
    expect(specs.find((spec) => spec.moduleId === 'ship')?.ownedFields)
      .toEqual([
        'shipTypeId',
        'harborAssignedChars',
        'harborLastChargedAt',
        'shipInventory',
        'cabinAssignments',
        'deckAssignments',
        'cabinFurniture',
        'cargo',
        'cabins',
      ])
    expect(specs.find((spec) => spec.moduleId === 'lodge')).toMatchObject({
      storage: 'dedicated',
      collectionName: 'lodgeStates',
      ownedFields: ['lodgeInventory', 'assignedAidongs', 'rooms', 'furniture'],
    })
    expect(specs.find((spec) => spec.moduleId === 'destination-shell-island')).toMatchObject({
      storage: 'dedicated',
      collectionName: 'destinationIslandStates',
      ownedFields: [
        'currentNodeId',
        'visitedNodeIds',
        'clearedMissionIds',
        'localResources',
        'localInventory',
        'hotspotStates',
      ],
    })
  })

  it('keeps dedicated module repositories consistent for getOrCreate and patch', async () => {
    initializeRepositories()

    const repositories = getDedicatedModuleRepositories()

    for (const [moduleId, testCase] of Object.entries(MODULE_REPOSITORY_OPERATION_CASES)) {
      const uid = testUid(`repo-${moduleId}`)
      const repo = repositories[moduleId]
      expect(repo, `${moduleId} repository should be registered`).toBeDefined()

      const created = await repo.getOrCreate(uid, testCase.seed)
      expect(created).toMatchObject({
        uid,
        ...testCase.expectedCreated,
      })
      expect(typeof (created as { createdAt?: unknown }).createdAt).toBe('number')
      expect(typeof (created as { updatedAt?: unknown }).updatedAt).toBe('number')

      const existing = await repo.getOrCreate(uid, testCase.secondSeed)
      expect(existing).toMatchObject({
        uid,
        ...testCase.expectedCreated,
      })

      const patched = await repo.patch(uid, testCase.patch)
      expect(patched).toMatchObject({
        uid,
        ...testCase.expectedPatched,
      })
      expect(typeof (patched as { updatedAt?: unknown }).updatedAt).toBe('number')

      const fetchedAgain = await repo.getOrCreate(uid)
      expect(fetchedAgain).toMatchObject({
        uid,
        ...testCase.expectedPatched,
      })
    }
  })

  it('stores host and module fields in dedicated documents', async () => {
    initializeRepositories()

    const user = await getUserRepository().createGuestUser()
    const uid = user.uid
    const hostPatch = {
      coins: 77,
      gems: 3,
    }
    const myAidongPatch = {
      recruitedAidongs: ['test-aidong'],
      affinities: { 'test-aidong': { score: 12, level: 1 } },
    }
    const myIslandPatch = {
      unlockedZones: ['zone-garden'],
    }

    const dedicated = getDedicatedModuleRepositories()
    await getHostStateRepository().patch(uid, hostPatch)
    const myAidong = await dedicated['my-aidong'].patch(uid, myAidongPatch) as MyAidongStateDoc
    const myIsland = await dedicated['my-island'].patch(uid, myIslandPatch) as MyIslandStateDoc
    const host = await getHostStateRepository().getOrCreate(uid) as HostStateDoc

    expect(host.coins).toBe(77)
    expect(host.gems).toBe(3)
    expect(myAidong.recruitedAidongs).toEqual(['test-aidong'])
    expect(myAidong.affinities['test-aidong']).toEqual({ score: 12, level: 1 })
    expect(myAidong.equippedItems).toEqual({})
    expect(myIsland.unlockedZones).toEqual(['zone-garden'])
  })

  it('applies customs debit and credit through resource adapters', async () => {
    initializeRepositories()

    const uid = testUid('customs')
    const repositories = getDedicatedModuleRepositories()
    await repositories['zone-garden'].patch(uid, {
      localResources: { acorn: 20 },
    } as Partial<ZoneStateDoc>)
    await getHostStateRepository().getOrCreate(uid, { coins: 0 })

    const rule = getCustomsRule('garden-acorn-to-coins')
    expect(rule).toBeDefined()
    if (!rule) throw new Error('missing test customs rule')

    const amounts = calculateCustomsAmounts(rule, 2)
    const sourceAdapter = getResourceAdapter(rule.from)
    const targetAdapter = getResourceAdapter(rule.to)

    expect(await sourceAdapter.canDebit(uid, rule.from, amounts.debitAmount)).toBe(true)
    await sourceAdapter.debit(uid, rule.from, amounts.debitAmount)
    await targetAdapter.credit(uid, rule.to, amounts.creditAmount)

    const zone = await repositories['zone-garden'].getOrCreate(uid) as ZoneStateDoc
    const host = await getHostStateRepository().getOrCreate(uid) as HostStateDoc

    expect(zone.localResources.acorn).toBe(10)
    expect(host.coins).toBe(2)
  })

  it('moves ship inventory into lodge inventory through customs adapters', async () => {
    initializeRepositories()

    const uid = testUid('customs-ship-lodge')
    const repositories = getDedicatedModuleRepositories()
    await repositories.ship.patch(uid, {
      shipInventory: { acorn: 3 },
    })
    await repositories.lodge.getOrCreate(uid)

    const rule = getCustomsRule('ship-acorn-to-lodge')
    expect(rule).toBeDefined()
    if (!rule) throw new Error('missing ship to lodge customs rule')

    const amounts = calculateCustomsAmounts(rule, 2)
    const result = await executeCustomsTransfer({
      uid,
      ruleId: rule.ruleId,
      from: rule.from,
      to: rule.to,
      amount: amounts.debitAmount,
      receiveAmount: amounts.creditAmount,
      multiplier: 2,
      transactional: false,
      sourceAdapter: getResourceAdapter(rule.from),
      targetAdapter: getResourceAdapter(rule.to),
    })

    const ship = await repositories.ship.getOrCreate(uid) as { shipInventory?: Record<string, number> }
    const lodge = await repositories.lodge.getOrCreate(uid) as LodgeStateDoc

    expect(result.statusCode).toBe(200)
    expect(ship.shipInventory?.acorn).toBe(1)
    expect(lodge.lodgeInventory.acorn).toBe(2)
  })

  it('moves destination island local resources into ship inventory through customs adapters', async () => {
    initializeRepositories()

    const uid = testUid('customs-destination-ship')
    const repositories = getDedicatedModuleRepositories()
    await repositories['destination-shell-island'].patch(uid, {
      localResources: { 'shell-fragment': 10 },
    } as Partial<DestinationIslandStateDoc>)
    await repositories.ship.getOrCreate(uid)

    const rule = getCustomsRule('shell-fragment-to-ship')
    expect(rule).toBeDefined()
    if (!rule) throw new Error('missing destination to ship customs rule')

    const amounts = calculateCustomsAmounts(rule, 1)
    const result = await executeCustomsTransfer({
      uid,
      ruleId: rule.ruleId,
      from: rule.from,
      to: rule.to,
      amount: amounts.debitAmount,
      receiveAmount: amounts.creditAmount,
      multiplier: 1,
      transactional: false,
      sourceAdapter: getResourceAdapter(rule.from),
      targetAdapter: getResourceAdapter(rule.to),
    })

    const island = await repositories['destination-shell-island'].getOrCreate(uid) as DestinationIslandStateDoc
    const ship = await repositories.ship.getOrCreate(uid) as { shipInventory?: Record<string, number> }

    expect(result.statusCode).toBe(200)
    expect(island.localResources['shell-fragment']).toBe(5)
    expect(ship.shipInventory?.['shell-fragment']).toBe(1)
  })

  it('prevents customs transfers that exceed ship cargo capacity', async () => {
    initializeRepositories()

    const uid = testUid('customs-ship-capacity')
    const repositories = getDedicatedModuleRepositories()
    await repositories['destination-shell-island'].patch(uid, {
      localResources: { 'shell-fragment': 5 },
    } as Partial<DestinationIslandStateDoc>)
    await repositories.ship.patch(uid, {
      shipTypeId: 'dinghy',
      shipInventory: { 'deck-cargo': 10 },
    })

    const rule = getCustomsRule('shell-fragment-to-ship')
    expect(rule).toBeDefined()
    if (!rule) throw new Error('missing destination to ship customs rule')

    const amounts = calculateCustomsAmounts(rule, 1)
    const result = await executeCustomsTransfer({
      uid,
      ruleId: rule.ruleId,
      from: rule.from,
      to: rule.to,
      amount: amounts.debitAmount,
      receiveAmount: amounts.creditAmount,
      multiplier: 1,
      transactional: false,
      sourceAdapter: getResourceAdapter(rule.from),
      targetAdapter: getResourceAdapter(rule.to),
    })

    const island = await repositories['destination-shell-island'].getOrCreate(uid) as DestinationIslandStateDoc
    const ship = await repositories.ship.getOrCreate(uid) as { shipInventory?: Record<string, number> }

    expect(result.statusCode).toBe(409)
    expect(result.body).toMatchObject({
      error: 'customs_apply_failed',
      rolledBack: true,
    })
    expect(island.localResources['shell-fragment']).toBe(5)
    expect(ship.shipInventory).toEqual({ 'deck-cargo': 10 })
  })

  it('moves Aidong item candidates from lodge inventory into host inventory through customs adapters', async () => {
    initializeRepositories()

    const uid = testUid('customs-lodge-host')
    const repositories = getDedicatedModuleRepositories()
    await repositories.lodge.patch(uid, {
      lodgeInventory: { 'aidong-ribbon': 1 },
    } as Partial<LodgeStateDoc>)
    await getHostStateRepository().getOrCreate(uid)

    const rule = getCustomsRule('lodge-aidong-ribbon-to-host')
    expect(rule).toBeDefined()
    if (!rule) throw new Error('missing lodge to host customs rule')

    const amounts = calculateCustomsAmounts(rule, 1)
    const result = await executeCustomsTransfer({
      uid,
      ruleId: rule.ruleId,
      from: rule.from,
      to: rule.to,
      amount: amounts.debitAmount,
      receiveAmount: amounts.creditAmount,
      multiplier: 1,
      transactional: false,
      sourceAdapter: getResourceAdapter(rule.from),
      targetAdapter: getResourceAdapter(rule.to),
    })

    const lodge = await repositories.lodge.getOrCreate(uid) as LodgeStateDoc
    const host = await getHostStateRepository().getOrCreate(uid) as HostStateDoc

    expect(result.statusCode).toBe(200)
    expect(lodge.lodgeInventory['aidong-ribbon']).toBe(0)
    expect(host.inventory['aidong-ribbon']).toBe(1)
  })

  it('reports insufficient resource for ship to lodge customs transfers', async () => {
    initializeRepositories()

    const uid = testUid('customs-ship-insufficient')
    const repositories = getDedicatedModuleRepositories()
    await repositories.ship.patch(uid, {
      shipInventory: { acorn: 0 },
    })
    await repositories.lodge.getOrCreate(uid)

    const rule = getCustomsRule('ship-acorn-to-lodge')
    expect(rule).toBeDefined()
    if (!rule) throw new Error('missing ship to lodge customs rule')

    const amounts = calculateCustomsAmounts(rule, 1)
    const result = await executeCustomsTransfer({
      uid,
      ruleId: rule.ruleId,
      from: rule.from,
      to: rule.to,
      amount: amounts.debitAmount,
      receiveAmount: amounts.creditAmount,
      multiplier: 1,
      transactional: false,
      sourceAdapter: getResourceAdapter(rule.from),
      targetAdapter: getResourceAdapter(rule.to),
    })

    const lodge = await repositories.lodge.getOrCreate(uid) as LodgeStateDoc

    expect(result.statusCode).toBe(409)
    expect(result.body).toMatchObject({ error: 'insufficient_resource' })
    expect(lodge.lodgeInventory.acorn).toBeUndefined()
  })

  it('reports customs failure when source cannot be debited', async () => {
    initializeRepositories()

    const uid = testUid('customs-insufficient')
    const from: ResourceRef = { scope: 'module', moduleId: 'zone-garden', resource: 'acorn' }
    const to: ResourceRef = { scope: 'host', resource: 'coins' }
    const sourceAdapter: ResourceAdapter = {
      async canDebit() {
        return false
      },
      async debit() {
        throw new Error('should_not_debit')
      },
      async credit() {},
    }
    const targetAdapter: ResourceAdapter = {
      async canDebit() {
        return true
      },
      async debit() {},
      async credit() {
        throw new Error('should_not_credit')
      },
    }

    const result = await executeCustomsTransfer({
      uid,
      ruleId: 'test-insufficient',
      from,
      to,
      amount: 5,
      receiveAmount: 1,
      transactional: false,
      sourceAdapter,
      targetAdapter,
    })

    expect(result.statusCode).toBe(409)
    expect(result.body).toMatchObject({
      error: 'insufficient_resource',
      log: {
        uid,
        ruleId: 'test-insufficient',
        status: 'failure',
        error: 'insufficient_resource',
      },
    })
  })

  it('rolls back customs source debit when non-transactional credit fails', async () => {
    initializeRepositories()

    const uid = testUid('customs-rollback')
    const from: ResourceRef = { scope: 'module', moduleId: 'zone-garden', resource: 'acorn' }
    const to: ResourceRef = { scope: 'host', resource: 'coins' }
    let sourceBalance = 10

    const sourceAdapter: ResourceAdapter = {
      async canDebit(_uid, _ref, amount) {
        return sourceBalance >= amount
      },
      async debit(_uid, _ref, amount) {
        sourceBalance -= amount
      },
      async credit(_uid, _ref, amount) {
        sourceBalance += amount
      },
    }
    const targetAdapter: ResourceAdapter = {
      async canDebit() {
        return true
      },
      async debit() {},
      async credit() {
        throw new Error('target_credit_failed')
      },
    }

    const result = await executeCustomsTransfer({
      uid,
      ruleId: 'test-rollback',
      from,
      to,
      amount: 5,
      receiveAmount: 1,
      transactional: false,
      sourceAdapter,
      targetAdapter,
    })

    expect(result.statusCode).toBe(409)
    expect(result.body).toMatchObject({
      error: 'customs_apply_failed',
      rolledBack: true,
    })
    expect(sourceBalance).toBe(10)
  })

  it('replays customs results by idempotency key without creating duplicate logs', async () => {
    initializeRepositories()

    const uid = testUid('customs-replay')
    const input = {
      uid,
      ruleId: 'test-replay',
      status: 'success' as const,
      idempotencyKey: 'customs-replay-key',
      from: { scope: 'module' as const, moduleId: 'ship', resource: 'acorn' },
      to: { scope: 'module' as const, moduleId: 'lodge', resource: 'acorn' },
      debitAmount: 5,
      creditAmount: 1,
    }

    const first = await getCustomsLogRepository().create(input)
    const second = await getCustomsLogRepository().create({
      ...input,
      debitAmount: 10,
      creditAmount: 2,
    })
    const found = await getCustomsLogRepository().findByIdempotencyKey(uid, 'customs-replay-key')
    const logs = await getCustomsLogRepository().listByUser(uid)

    expect(second).toEqual(first)
    expect(found).toEqual(first)
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      idempotencyKey: 'customs-replay-key',
      debitAmount: 5,
      creditAmount: 1,
      status: 'success',
    })
  })

  it('guards module action APIs against invalid local state transitions', async () => {
    initializeRepositories()

    const uid = testUid('actions')

    await expect(addAidongAffinity(uid, 'not-recruited', 1)).rejects.toMatchObject({
      code: 'aidong_not_recruited',
      status: 409,
    })
    await expect(toggleHarborAssign(uid, 'not-recruited')).rejects.toMatchObject({
      code: 'aidong_not_recruited',
      status: 409,
    })
    await expect(rollRoute(uid, 3)).rejects.toMatchObject({
      code: 'route_not_started',
      status: 409,
    })
    await expect(rollRoute(uid, 7)).rejects.toMatchObject({
      code: 'invalid_steps',
      status: 400,
    })

    await recruitAidong(uid, 'test-aidong')
    const aidong = await addAidongAffinity(uid, 'test-aidong', 12) as MyAidongStateDoc
    expect(aidong.affinities['test-aidong']).toEqual({ score: 12, level: 1 })

    await expect(toggleAidongEquippedItem(uid, 'test-aidong', 'unknown-item')).rejects.toMatchObject({
      code: 'unsupported_aidong_item',
      status: 400,
    })
    await expect(toggleAidongEquippedItem(uid, 'test-aidong', 'aidong-ribbon')).rejects.toMatchObject({
      code: 'aidong_item_not_owned_or_available',
      status: 409,
    })
    await getHostStateRepository().mutateInventory(uid, 'aidong-ribbon', 1)
    const equippedItem = await toggleAidongEquippedItem(uid, 'test-aidong', 'aidong-ribbon') as MyAidongStateDoc
    expect(equippedItem.equippedItems['test-aidong']).toEqual(['aidong-ribbon'])
    await recruitAidong(uid, 'second-aidong')
    await expect(toggleAidongEquippedItem(uid, 'second-aidong', 'aidong-ribbon')).rejects.toMatchObject({
      code: 'aidong_item_not_owned_or_available',
      status: 409,
    })
    const unequippedItem = await toggleAidongEquippedItem(uid, 'test-aidong', 'aidong-ribbon') as MyAidongStateDoc
    expect(unequippedItem.equippedItems['test-aidong']).toEqual([])

    const ship = await toggleHarborAssign(uid, 'test-aidong') as { harborAssignedChars?: string[] }
    expect(ship.harborAssignedChars).toContain('test-aidong')
    expect((ship as { shipTypeId?: string }).shipTypeId).toBe('dinghy')
    expect((ship as { cabinAssignments?: Record<string, string> }).cabinAssignments).toEqual({})
    expect((ship as { deckAssignments?: Record<string, string> }).deckAssignments).toEqual({})
    expect((ship as { cargo?: Record<string, number> }).cargo).toEqual({})

    const lodge = await toggleLodgeAidongAssign(uid, 'test-aidong') as LodgeStateDoc
    expect(lodge.assignedAidongs).toContain('test-aidong')
    expect(lodge.lodgeInventory).toEqual({})

    const purchasedLodgeFurniture = await purchaseLodgeFurniture(uid, 'plant') as { state: LodgeStateDoc }
    expect(purchasedLodgeFurniture.state.furniture.plant).toBe(1)
    const placedLodgeFurniture = await toggleLodgeRoomFurniture(uid, 'test-aidong', 'plant') as LodgeStateDoc
    expect((placedLodgeFurniture.rooms['test-aidong'] as { furniture?: string[] }).furniture)
      .toEqual(['plant'])
    await expect(toggleLodgeRoomFurniture(uid, 'second-aidong', 'plant')).rejects.toMatchObject({
      code: 'lodge_furniture_not_owned_or_available',
      status: 409,
    })

    const lodgeCleared = await toggleLodgeAidongAssign(uid, 'test-aidong') as LodgeStateDoc
    expect(lodgeCleared.assignedAidongs).not.toContain('test-aidong')

    await expect(toggleLodgeAidongAssign(uid, 'not-recruited')).rejects.toMatchObject({
      code: 'aidong_not_recruited',
      status: 409,
    })

    const shipAfterHarborClear = await toggleHarborAssign(uid, 'test-aidong') as { harborAssignedChars?: string[] }
    expect(shipAfterHarborClear.harborAssignedChars).not.toContain('test-aidong')

    const sloop = await changeShipType(uid, 'sloop') as { shipTypeId?: string }
    expect(sloop.shipTypeId).toBe('sloop')
    await expect(changeShipType(uid, 'unknown-ship')).rejects.toThrow('invalid_ship_type')

    const cabinAssigned = await assignCabinSlot(uid, 'cabin1', 'test-aidong') as {
      cabinAssignments?: Record<string, string>
    }
    expect(cabinAssigned.cabinAssignments).toEqual({ cabin1: 'test-aidong' })

    await expect(assignDeckSlot(uid, 'deck1', 'test-aidong')).rejects.toMatchObject({
      code: 'aidong_already_assigned_to_ship_slot',
      status: 409,
    })

    await recruitAidong(uid, 'cabin-aidong-2')
    const secondCabinAssigned = await assignCabinSlot(uid, 'cabin2', 'cabin-aidong-2') as {
      cabinAssignments?: Record<string, string>
    }
    expect(secondCabinAssigned.cabinAssignments).toEqual({
      cabin1: 'test-aidong',
      cabin2: 'cabin-aidong-2',
    })

    const purchasedCabinFurniture = await purchaseCabinFurniture(uid, 'window') as {
      state: { cabinFurniture?: Record<string, number> }
    }
    expect(purchasedCabinFurniture.state.cabinFurniture?.window).toBe(1)
    const placedCabinFurniture = await toggleCabinFurniture(uid, 'cabin1', 'window') as {
      cabins?: Record<string, unknown>
    }
    expect((placedCabinFurniture.cabins?.cabin1 as { furniture?: string[] }).furniture)
      .toEqual(['window'])
    await expect(toggleCabinFurniture(uid, 'cabin2', 'window')).rejects.toMatchObject({
      code: 'cabin_furniture_not_owned_or_available',
      status: 409,
    })

    await recruitAidong(uid, 'deck-aidong')
    const deckAssigned = await assignDeckSlot(uid, 'deck1', 'deck-aidong') as {
      deckAssignments?: Record<string, string>
    }
    expect(deckAssigned.deckAssignments).toEqual({ deck1: 'deck-aidong' })

    await recruitAidong(uid, 'deck-aidong-2')
    const secondDeckAssigned = await assignDeckSlot(uid, 'deck2', 'deck-aidong-2') as {
      deckAssignments?: Record<string, string>
    }
    expect(secondDeckAssigned.deckAssignments).toEqual({
      deck1: 'deck-aidong',
      deck2: 'deck-aidong-2',
    })

    await expect(assignCabinSlot(uid, 'cabin3', 'deck-aidong')).rejects.toMatchObject({
      code: 'ship_slot_out_of_range',
      status: 409,
    })

    const dinghy = await changeShipType(uid, 'dinghy') as {
      shipTypeId?: string
      cabinAssignments?: Record<string, string>
      deckAssignments?: Record<string, string>
    }
    expect(dinghy.shipTypeId).toBe('dinghy')
    expect(dinghy.cabinAssignments).toEqual({ cabin1: 'test-aidong' })
    expect(dinghy.deckAssignments).toEqual({
      deck1: 'cabin-aidong-2',
      deck2: 'deck-aidong',
      deck3: 'deck-aidong-2',
    })

    const cabinCleared = await assignCabinSlot(uid, 'cabin1') as {
      cabinAssignments?: Record<string, string>
    }
    expect(cabinCleared.cabinAssignments).toEqual({})

    await getHostStateRepository().getOrCreate(uid, { diceCount: 1 })
    await startRoute(uid, 'neighbor')
    const rolled = await rollRoute(uid, 6)
    expect(rolled.steps).toBe(6)
    expect((rolled.state as { boardPosition?: number }).boardPosition).toBe(6)
    expect(rolled.landing).toMatchObject({
      landingId: 'neighbor:6',
      targetWorldScope: 'destination-island',
      landingModuleId: 'destination-shell-island',
      action: 'destination-resource-mission',
      screenPath: '/voyage/island/shell',
    })
    expect((rolled.state as { landings?: { last?: unknown } }).landings?.last).toMatchObject({
      landingId: 'neighbor:6',
      status: 'arrived',
    })

    const currentLanding = await getCurrentLanding(uid)
    expect(currentLanding).toMatchObject({
      landingId: 'neighbor:6',
      slotType: 'resource',
    })

    const clearedLanding = await clearCurrentLanding(uid, 'neighbor:6')
    expect(clearedLanding.rewards).toEqual([
      {
        scope: 'module',
        moduleId: 'destination-shell-island',
        resource: 'shell-fragment',
        amount: 1,
      },
      { scope: 'module', moduleId: 'route-neighbor', resource: 'deck-cargo', amount: 1, compatibility: true },
    ])
    expect((clearedLanding.state as { localResources?: Record<string, number> }).localResources?.['deck-cargo'])
      .toBe(1)
    expect(((clearedLanding.moduleStates as Record<string, DestinationIslandStateDoc>)['destination-shell-island'])
      .localResources['shell-fragment'])
      .toBe(1)
    expect((clearedLanding.state as { landings?: { last?: { status?: string } } }).landings?.last?.status)
      .toBe('cleared')

    const ended = await endRoute(uid) as { currentRoute?: string | null; boardPosition?: number }
    expect(ended.currentRoute).toBeNull()
    expect(ended.boardPosition).toBe(0)

    const movedIsland = await moveDestinationIsland(uid, 'destination-shell-island', 'west') as DestinationIslandStateDoc
    expect(movedIsland.currentNodeId).toBe('beach-west')
    expect(movedIsland.visitedNodeIds).toContain('beach-west')

    const shellRock = await interactDestinationHotspot(uid, 'destination-shell-island', 'shell-rock')
    expect((shellRock.state as DestinationIslandStateDoc).localResources['shell-fragment']).toBe(2)

    await moveDestinationIsland(uid, 'destination-shell-island', 'east')
    await moveDestinationIsland(uid, 'destination-shell-island', 'east')
    const tidePool = await interactDestinationHotspot(uid, 'destination-shell-island', 'tide-pool')
    expect((tidePool.state as DestinationIslandStateDoc).localResources['shell-fragment']).toBe(3)

    await moveDestinationIsland(uid, 'destination-shell-island', 'north')
    const shrine = await clearDestinationMission(uid, 'destination-shell-island', 'open-old-shrine')
    expect((shrine.state as DestinationIslandStateDoc).localResources['shell-fragment']).toBe(1)
    expect((shrine.state as DestinationIslandStateDoc).localInventory['pearl-dust']).toBe(1)
    expect((shrine.state as DestinationIslandStateDoc).clearedMissionIds).toEqual(['open-old-shrine'])

    await recruitAidong(uid, 'harbor-charge-aidong')
    const harborChargeAidong = await toggleHarborAssign(uid, 'harbor-charge-aidong') as { harborAssignedChars?: string[] }
    expect(harborChargeAidong.harborAssignedChars).toContain('harbor-charge-aidong')

    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
    await getDedicatedModuleRepositories().ship.patch(uid, { harborLastChargedAt: twoHoursAgo })
    const charged = await chargeHarborDice(uid, Date.now())
    expect(charged.charge).toBeGreaterThanOrEqual(2)
    expect(charged.host.diceCount).toBeGreaterThanOrEqual(2)
    expect((charged.state as { harborLastChargedAt?: number }).harborLastChargedAt).toBeTypeOf('number')
  })

  it('guards zone action APIs with zone-local resource and clear rules', async () => {
    initializeRepositories()

    const uid = testUid('zone-actions')

    await expect(collectZoneResource(uid, 'zone-garden', 'ore', 1)).rejects.toMatchObject({
      code: 'unsupported_zone_resource',
      status: 400,
    })
    await expect(collectZoneResource(uid, 'zone-garden', 'acorn', 1.5)).rejects.toMatchObject({
      code: 'invalid_amount',
      status: 400,
    })
    await expect(clearZone(uid, 'zone-oasis')).rejects.toMatchObject({
      code: 'invalid_clear_id',
      status: 400,
    })
    await expect(clearZone(uid, 'zone-oasis', 'garden-harvest')).rejects.toMatchObject({
      code: 'unsupported_clear_id',
      status: 400,
    })
    await getDedicatedModuleRepositories()['my-island'].patch(uid, {
      unlockedZones: ['zone-memory'],
    } as Partial<MyIslandStateDoc>)
    await expect(clearZone(uid, 'zone-memory', 'memory-match')).rejects.toMatchObject({
      code: 'invalid_clear_result',
      status: 400,
    })
    await expect(clearZone(uid, 'zone-mine', 'mine-dig', { oreFound: 1 }, '')).rejects.toMatchObject({
      code: 'invalid_idempotency_key',
      status: 400,
    })

    await expect(collectZoneResource(uid, 'zone-mine', 'ore', 1)).rejects.toMatchObject({
      code: 'zone_locked',
      status: 403,
    })

    await getDedicatedModuleRepositories()['my-aidong'].patch(uid, {
      recruitedAidongs: ['aidong-a', 'aidong-b', 'aidong-c'],
    } as Partial<MyAidongStateDoc>)

    const collected = await collectZoneResource(uid, 'zone-mine', 'ore', 2) as ZoneStateDoc
    expect(collected.localResources.ore).toBe(2)

    const cleared = await clearZone(uid, 'zone-mine', 'mine-dig', { oreFound: 2 }, 'mine-run-1')
    expect(cleared.state.clearedCount).toBe(1)
    expect((cleared.state.progress as Record<string, unknown>).lastClearId).toBe('mine-dig')
    expect(((cleared.state.progress as Record<string, unknown>).clearCounts as Record<string, number>)['mine-dig']).toBe(1)
    expect(cleared.host.coins).toBe(120)
    expect(cleared.rewards).toEqual([{ kind: 'resource', id: 'coins', amount: 20 }])

    const replayed = await clearZone(uid, 'zone-mine', 'mine-dig', { oreFound: 2 }, 'mine-run-1')
    expect(replayed.replayed).toBe(true)
    expect(replayed.rewards).toEqual([])
    expect(replayed.state.clearedCount).toBe(1)
    expect(replayed.host.coins).toBe(120)
  })

  it('loads zone action allowlists and rewards from balance CSV', () => {
    const garden = getZoneBalanceRule('zone-garden')
    const oasis = getZoneBalanceRule('zone-oasis')
    const memory = getZoneBalanceRule('zone-memory')
    const mine = getZoneBalanceRule('zone-mine')

    expect(garden?.resources).toEqual(['acorn', 'flower'])
    expect(garden?.clearIds).toEqual(['garden-harvest'])
    expect(garden?.rewards.gardenCoins).toBe(15)

    expect(oasis?.resources).toEqual(['rest_token'])
    expect(oasis?.clearIds).toEqual(['oasis-rest'])
    expect(oasis?.rewards.oasisCoins).toBe(10)

    expect(memory?.clearIds).toEqual(['memory-match'])
    expect(memory?.rewards.memoryCoinsBase).toBe(60)
    expect(memory?.rewards.memoryCoinsMin).toBe(20)
    expect(memory?.rewards.memoryCoinsPerMovePenalty).toBe(3)

    expect(mine?.resources).toEqual(['ore'])
    expect(mine?.rewards.mineCoinsPerOreFound).toBe(10)
  })

  it('moves zone completion host rewards through backend clear actions', async () => {
    initializeRepositories()

    const user = await getUserRepository().createGuestUser()
    const uid = user.uid
    const garden = await clearZone(uid, 'zone-garden', 'garden-harvest')

    expect(garden.host.coins).toBe(115)
    expect(garden.host.inventory.basic_food).toBe(2)
    expect(garden.rewards).toEqual([
      { kind: 'inventory', id: 'basic_food', amount: 2 },
      { kind: 'resource', id: 'coins', amount: 15 },
    ])

    await getUserRepository().updateUser(uid, { onboardingComplete: true })
    const memory = await clearZone(uid, 'zone-memory', 'memory-match', { moves: 5 })
    expect(memory.host.coins).toBe(160)
    expect(memory.rewards).toEqual([{ kind: 'resource', id: 'coins', amount: 45 }])
  })

  it('checks zone unlock conditions before collect and clear actions', async () => {
    initializeRepositories()

    const user = await getUserRepository().createGuestUser()
    const uid = user.uid

    await expect(clearZone(uid, 'zone-oasis', 'oasis-rest')).rejects.toMatchObject({
      code: 'zone_locked',
      status: 403,
    })
    await expect(clearZone(uid, 'zone-memory', 'memory-match', { moves: 5 })).rejects.toMatchObject({
      code: 'zone_locked',
      status: 403,
    })
    await expect(clearZone(uid, 'zone-mine', 'mine-dig', { oreFound: 1 })).rejects.toMatchObject({
      code: 'zone_locked',
      status: 403,
    })

    await clearZone(uid, 'zone-garden', 'garden-harvest', undefined, 'garden-unlock-oasis')
    const oasis = await clearZone(uid, 'zone-oasis', 'oasis-rest', undefined, 'oasis-after-garden')
    expect(oasis.state.clearedCount).toBe(1)

    await getUserRepository().updateUser(uid, { onboardingComplete: true })
    const memory = await clearZone(uid, 'zone-memory', 'memory-match', { moves: 8 }, 'memory-after-tutorial')
    expect(memory.state.clearedCount).toBe(1)

    await getDedicatedModuleRepositories()['my-aidong'].patch(uid, {
      recruitedAidongs: ['aidong-a', 'aidong-b', 'aidong-c'],
    } as Partial<MyAidongStateDoc>)
    const mine = await clearZone(uid, 'zone-mine', 'mine-dig', { oreFound: 1 }, 'mine-after-recruit')
    expect(mine.state.clearedCount).toBe(1)
  })

  it('guards codex action APIs with valid ids and lock conditions', async () => {
    initializeRepositories()

    const uid = testUid('codex-actions')

    await expect(unlockCodexSlot(uid, '없는아이동')).rejects.toMatchObject({
      code: 'unknown_codex_entry',
      status: 400,
    })
    await expect(unlockDiary(uid, 'unknown_day1')).rejects.toMatchObject({
      code: 'unknown_diary_id',
      status: 400,
    })
    await expect(unlockCodexSlot(uid, '황금멍')).rejects.toMatchObject({
      code: 'aidong_not_recruited',
      status: 409,
    })
    await expect(unlockDiary(uid, 'hwanggumeong_day1')).rejects.toMatchObject({
      code: 'aidong_not_recruited',
      status: 409,
    })

    await recruitAidong(uid, '황금멍')

    await expect(fullyRegisterCodex(uid, '황금멍')).rejects.toMatchObject({
      code: 'codex_slot_locked',
      status: 409,
    })

    const slot = await unlockCodexSlot(uid, '황금멍') as { unlockedCodexEntries?: string[] }
    expect(slot.unlockedCodexEntries).toEqual(['황금멍'])

    const diary = await unlockDiary(uid, 'hwanggumeong_day1') as { unlockedDiaries?: string[] }
    expect(diary.unlockedDiaries).toEqual(['hwanggumeong_day1'])

    const full = await fullyRegisterCodex(uid, '황금멍') as {
      unlockedCodexEntries?: string[]
      codexFullyRegistered?: string[]
    }
    expect(full.unlockedCodexEntries).toEqual(['황금멍'])
    expect(full.codexFullyRegistered).toEqual(['황금멍'])

    const replayed = await fullyRegisterCodex(uid, '황금멍') as {
      codexFullyRegistered?: string[]
    }
    expect(replayed.codexFullyRegistered).toEqual(['황금멍'])
  })
})








