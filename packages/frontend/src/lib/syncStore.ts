/**
 * packages/frontend/src/lib/syncStore.ts
 * ------------------------------------------------------------
 * 역할: frontend userStore를 backend 저장 API와 동기화한다.
 * 연결: account, host, module 전용 API로 userStore slice를 나누어 저장한다.
 * 주의: 통합 state fallback은 제거됐으므로 신규 sync는 전용 API만 사용한다.
 */
import type { UserState } from '@/stores/userStore'
import { api } from './api'
import { userStoreRuntimeFacade } from './storeFacades'

const SYNC_DEBOUNCE_MS = 5000
let debounceTimer: number | undefined
let isSyncing = false

const SYNCED_KEYS = [
  'coins', 'diamonds', 'gems',
  'openingSeen', 'onboardingComplete', 'hostName',
  'recruitedAidongs', 'firstGachaCandidate', 'firstGachaAttempts',
  'affinities', 'needs',
  'unlockedZones', 'zoneSlots', 'dynamicAidongZones',
  'unlockedDiaries', 'unlockedCodexEntries', 'codexFullyRegistered', 'inventory',
  'diceCount',
  'harborAssignedChars', 'harborLastChargedAt',
  'equippedOutfit', 'equippedItems',
] as const

const HOST_KEYS = ['coins', 'diamonds', 'gems', 'hostName', 'inventory', 'diceCount'] as const
const MY_AIDONG_KEYS = [
  'recruitedAidongs',
  'firstGachaCandidate',
  'firstGachaAttempts',
  'affinities',
  'needs',
  'equippedOutfit',
  'equippedItems',
] as const
const MY_ISLAND_KEYS = ['unlockedZones', 'zoneSlots', 'dynamicAidongZones'] as const
const CODEX_KEYS = ['unlockedDiaries', 'unlockedCodexEntries', 'codexFullyRegistered'] as const
const ROUTE_NEIGHBOR_KEYS = [] as const
const SHIP_KEYS = ['harborAssignedChars', 'harborLastChargedAt'] as const
const ACCOUNT_KEYS = ['isGuest', 'nickname', 'openingSeen', 'onboardingComplete', 'hostName'] as const

function pickKeys(keys: readonly string[]) {
  const state = userStoreRuntimeFacade.getRecord()
  const patch: Record<string, unknown> = {}
  for (const key of keys) {
    patch[key] = state[key]
  }
  return patch
}

function pickChangedKeys(keys: readonly string[], state: unknown, prev: unknown) {
  const current = state as Record<string, unknown>
  const previous = prev as Record<string, unknown>
  const patch: Record<string, unknown> = {}
  for (const key of keys) {
    if (current[key] !== previous[key]) {
      patch[key] = current[key]
    }
  }
  return patch
}

async function flushSplitState(uid: string) {
  await Promise.all([
    api.patchAccountState(uid, pickKeys(ACCOUNT_KEYS)),
    api.patchHostState(uid, pickKeys(HOST_KEYS)),
    api.patchModuleState(uid, 'my-aidong', pickKeys(MY_AIDONG_KEYS)),
    api.patchModuleState(uid, 'my-island', pickKeys(MY_ISLAND_KEYS)),
    api.patchModuleState(uid, 'codex', pickKeys(CODEX_KEYS)),
    api.patchModuleState(uid, 'ship', pickKeys(SHIP_KEYS)),
  ])
}

async function flush() {
  const uid = userStoreRuntimeFacade.getState().firebaseUid
  if (!uid || isSyncing) return
  isSyncing = true
  try {
    await flushSplitState(uid)
  } catch (e) {
    console.warn('[sync] patch fail:', e)
  } finally {
    isSyncing = false
  }
}

function mergeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function normalizeHostState(state: Record<string, unknown>) {
  return {
    hostName: state.hostName,
    coins: state.coins,
    gems: state.gems,
    diamonds: state.diamonds,
    diceCount: state.diceCount,
    inventory: state.inventory,
  }
}

async function hydrateSplitState(uid: string) {
  const [
    account,
    host,
    myAidong,
    myIsland,
    codex,
    ship,
  ] = await Promise.all([
    api.getAccountState(uid),
    api.getHostState(uid),
    api.getModuleState(uid, 'my-aidong'),
    api.getModuleState(uid, 'my-island'),
    api.getModuleState(uid, 'codex'),
    api.getModuleState(uid, 'ship'),
  ])

  userStoreRuntimeFacade.setState({
    ...mergeRecord(account.state),
    ...normalizeHostState(mergeRecord(host.state)),
    ...mergeRecord(myAidong.state),
    ...mergeRecord(myIsland.state),
    ...mergeRecord(codex.state),
    ...mergeRecord(ship.state),
    firebaseUid: uid,
  } as Partial<UserState>)
}

export function startSync() {
  userStoreRuntimeFacade.subscribe((state, prev) => {
    if (!state.firebaseUid) return
    const changed = SYNCED_KEYS.some(
      (key) =>
        (state as unknown as Record<string, unknown>)[key] !==
        (prev as unknown as Record<string, unknown>)[key],
    )
    if (!changed) return
    if (debounceTimer) window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(flush, SYNC_DEBOUNCE_MS)
  })

  window.addEventListener('beforeunload', () => {
    if (debounceTimer) window.clearTimeout(debounceTimer)
    void flush()
  })
}

export async function bootstrapAuth() {
  const state = userStoreRuntimeFacade.getState()
  if (state.firebaseUid) {
    try {
      await hydrateSplitState(state.firebaseUid)
    } catch {
      try {
        const r = await api.authGuest()
        userStoreRuntimeFacade.setState({ firebaseUid: r.uid, isGuest: true, nickname: 'guest' })
      } catch {
        // local-only mode
      }
    }
  }
}

export function previewSplitSyncPatches(state: unknown, prev: unknown) {
  return {
    host: pickChangedKeys(HOST_KEYS, state, prev),
    myAidong: pickChangedKeys(MY_AIDONG_KEYS, state, prev),
    myIsland: pickChangedKeys(MY_ISLAND_KEYS, state, prev),
    codex: pickChangedKeys(CODEX_KEYS, state, prev),
    routeNeighbor: pickChangedKeys(ROUTE_NEIGHBOR_KEYS, state, prev),
    ship: pickChangedKeys(SHIP_KEYS, state, prev),
  }
}

export function isSplitStateSyncEnabled() {
  return true
}






