/**
 * packages/frontend/src/lib/actionApiSync.ts
 * ------------------------------------------------------------
 * 역할: backend action API 응답을 frontend Zustand shape에 병합한다.
 * 연결: 기존 UI가 읽는 userStore 필드명은 유지하면서 저장 권위만 backend API로 옮긴다.
 * 주의: 응답 merge는 해당 host/module slice로 제한하고 다른 module state를 임의로 조립하지 않는다.
 */
import type { UserState } from '@/stores/userStore'
import { accountStoreFacade, hostStoreFacade, userStoreRuntimeFacade } from './storeFacades'

type ActionSyncResponse = {
  account?: unknown
  state?: unknown
  host?: unknown
}

type ApplyOptions = {
  broadcast?: boolean
}

type CrossTabMessage = {
  sourceId: string
  sentAt: number
  response: ActionSyncResponse
}

const CHANNEL_NAME = 'idongworld-action-api-sync'
const STORAGE_EVENT_KEY = 'idongworld-action-api-sync-event'
const tabSourceId = globalThis.crypto?.randomUUID?.() ?? `tab-${Date.now()}-${Math.random()}`
let channel: BroadcastChannel | undefined
let crossTabStarted = false

function mergeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

const RUNTIME_ONLY_KEYS = new Set(['currentRoute', 'boardPosition', 'activeSession'])

function stripRuntimeOnlyKeys(state: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(state)) {
    if (RUNTIME_ONLY_KEYS.has(key)) continue
    patch[key] = value
  }
  return patch
}

function sanitizeResponse(response: ActionSyncResponse): ActionSyncResponse {
  return {
    account: stripRuntimeOnlyKeys(mergeRecord(response.account)),
    host: stripRuntimeOnlyKeys(mergeRecord(response.host)),
    state: stripRuntimeOnlyKeys(mergeRecord(response.state)),
  }
}

function hasPayload(response: ActionSyncResponse): boolean {
  return Object.values(response).some((value) => Object.keys(mergeRecord(value)).length > 0)
}

function postCrossTabResponse(response: ActionSyncResponse): void {
  if (typeof window === 'undefined') return
  const sanitized = sanitizeResponse(response)
  if (!hasPayload(sanitized)) return

  const message: CrossTabMessage = {
    sourceId: tabSourceId,
    sentAt: Date.now(),
    response: sanitized,
  }

  channel?.postMessage(message)

  try {
    window.localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify(message))
    window.localStorage.removeItem(STORAGE_EVENT_KEY)
  } catch {
    // storage event fallback is best-effort only
  }
}

function applyCrossTabMessage(message: unknown): void {
  const parsed = mergeRecord(message) as Partial<CrossTabMessage>
  if (parsed.sourceId === tabSourceId) return
  applyActionApiResponse(parsed.response ?? {}, { broadcast: false })
}

export function startActionApiCrossTabSync(): void {
  if (crossTabStarted || typeof window === 'undefined') return
  crossTabStarted = true

  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.addEventListener('message', (event) => applyCrossTabMessage(event.data))
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_EVENT_KEY || !event.newValue) return
    try {
      applyCrossTabMessage(JSON.parse(event.newValue))
    } catch {
      // ignore malformed cross-tab sync event
    }
  })
}

export function applyHostActionState(host: unknown, options: ApplyOptions = {}): void {
  const state = mergeRecord(host)
  if (!Object.keys(state).length) return
  hostStoreFacade.mergeHostState({
    hostName: state.hostName as UserState['hostName'],
    coins: state.coins as UserState['coins'],
    gems: state.gems as UserState['gems'],
    diamonds: state.diamonds as UserState['diamonds'],
    diceCount: state.diceCount as UserState['diceCount'],
    inventory: state.inventory as UserState['inventory'],
  })
  if (options.broadcast !== false) postCrossTabResponse({ host: state })
}

export function applyAccountActionState(account: unknown, options: ApplyOptions = {}): void {
  const state = mergeRecord(account)
  if (!Object.keys(state).length) return
  accountStoreFacade.mergeAccountState({
    isGuest: state.isGuest as UserState['isGuest'],
    nickname: state.nickname as UserState['nickname'],
    gameStartedAt: state.gameStartedAt as UserState['gameStartedAt'],
    openingSeen: state.openingSeen as UserState['openingSeen'],
    onboardingComplete: state.onboardingComplete as UserState['onboardingComplete'],
    hostName: state.hostName as UserState['hostName'],
  })
  if (options.broadcast !== false) postCrossTabResponse({ account: state })
}

export function applyModuleActionState(state: unknown, options: ApplyOptions = {}): void {
  const patch = stripRuntimeOnlyKeys(mergeRecord(state))
  if (!Object.keys(patch).length) return
  userStoreRuntimeFacade.setState(patch as Partial<UserState>)
  if (options.broadcast !== false) postCrossTabResponse({ state: patch })
}

export function applyActionApiResponse(
  response: ActionSyncResponse,
  options: ApplyOptions = {},
): void {
  applyAccountActionState(response.account, { broadcast: false })
  applyHostActionState(response.host, { broadcast: false })
  applyModuleActionState(response.state, { broadcast: false })
  if (options.broadcast !== false) postCrossTabResponse(response)
}
