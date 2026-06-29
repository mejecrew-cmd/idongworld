/**
 * packages/backend/src/routes/debug.ts
 * ------------------------------------------------------------
 * 역할: 개발 환경에서만 사용하는 계정 진행도 전체 리셋 API를 제공한다.
 * 연결: frontend DebugPanel의 "전체 리셋" 버튼이 이 route를 호출한다.
 * 주의: production에서는 사용할 수 없고, runtime/session 상태가 아니라 DB 영속 상태만 초기화한다.
 */
import { Router } from 'express'
import { getRequestUid } from '../middleware/auth.js'
import {
  getDedicatedModuleRepositories,
  getHostStateRepository,
  getMydongCosmeticRepository,
  getMydongPediaInventoryRepository,
  getUserRepository,
} from '../repositories/index.js'
import {
  createAidongIslandDefault,
  createCodexDefault,
  createDestinationIslandDefault,
  createLodgeDefault,
  createMyAidongDefault,
  createMyIslandDefault,
  createRouteNeighborDefault,
  createShipDefault,
  createZoneDefault,
} from '../repositories/moduleDefaults.js'

export const debugRouter = Router()

const ZONE_MODULE_IDS = ['zone-garden', 'zone-oasis', 'zone-memory', 'zone-mine']
const DESTINATION_ISLAND_MODULE_IDS = ['destination-shell-island']

function assertDebugResetAllowed() {
  if (process.env.NODE_ENV === 'production') {
    const error = new Error('debug_reset_disabled')
    error.name = 'DebugResetDisabled'
    throw error
  }
}

function defaultModuleState(uid: string, moduleId: string): object | undefined {
  if (moduleId === 'my-aidong') {
    return {
      ...createMyAidongDefault(uid),
      firstGachaCandidate: undefined,
    }
  }
  if (moduleId === 'my-island') return createMyIslandDefault(uid)
  if (moduleId === 'codex') return createCodexDefault(uid)
  if (moduleId === 'lodge') return createLodgeDefault(uid)
  if (moduleId === 'route-neighbor') return createRouteNeighborDefault(uid)
  if (moduleId === 'ship') {
    return {
      ...createShipDefault(uid),
      harborLastChargedAt: undefined,
    }
  }
  if (moduleId === 'aidong-island') {
    return {
      ...createAidongIslandDefault(uid),
      currentIslandId: undefined,
      currentNodeId: undefined,
    }
  }
  if (ZONE_MODULE_IDS.includes(moduleId)) return createZoneDefault(uid, moduleId)
  if (DESTINATION_ISLAND_MODULE_IDS.includes(moduleId)) return createDestinationIslandDefault(uid, moduleId)
  return undefined
}

debugRouter.post('/reset', async (req, res) => {
  try {
    assertDebugResetAllowed()
  } catch (error) {
    if (error instanceof Error && error.name === 'DebugResetDisabled') {
      return res.status(403).json({ error: 'debug_reset_disabled' })
    }
    throw error
  }

  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const account = await getUserRepository().updateUser(uid, {
    nickname: undefined,
    hostName: undefined,
    sooksoName: undefined,
    openingSeen: true,
    sooksoClean: false,
    onboardingComplete: false,
    recruitedAidongs: [],
    firstGachaCandidate: undefined,
    firstGachaAttempts: 0,
    affinities: {},
    needs: {},
    unlockedDiaries: [],
    unlockedCodexEntries: [],
    codexFullyRegistered: [],
    inventory: {},
    diceCount: 6,
    boardPosition: 0,
    harborAssignedChars: [],
  })

  const host = await getHostStateRepository().patch(uid, {
    hostName: undefined,
    coins: 100,
    diamonds: 0,
    diceCount: 6,
    inventory: {},
  })
  await getMydongPediaInventoryRepository().delete(uid)
  await getMydongCosmeticRepository().delete(uid)

  const modules: Record<string, object> = {}
  const repositories = getDedicatedModuleRepositories()
  for (const [moduleId, repository] of Object.entries(repositories)) {
    const defaultState = defaultModuleState(uid, moduleId)
    if (!defaultState) continue
    modules[moduleId] = await repository.patch(uid, defaultState)
  }

  res.json({
    ok: true,
    account,
    host,
    modules,
  })
})
