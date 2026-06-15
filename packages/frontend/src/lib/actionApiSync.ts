/**
 * packages/frontend/src/lib/actionApiSync.ts
 * ------------------------------------------------------------
 * 역할: backend action API 응답을 frontend Zustand shape에 병합한다.
 * 연결: 기존 UI가 읽는 userStore 필드명은 유지하면서 저장 권위만 backend API로 옮긴다.
 * 주의: 응답 merge는 해당 host/module slice로 제한하고 다른 module state를 임의로 조립하지 않는다.
 */
import type { UserState } from '@/stores/userStore'
import { accountStoreFacade, hostStoreFacade, userStoreRuntimeFacade } from './storeFacades'

function mergeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

const RUNTIME_ONLY_KEYS = new Set(['currentRoute', 'boardPosition'])

function stripRuntimeOnlyKeys(state: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(state)) {
    if (RUNTIME_ONLY_KEYS.has(key)) continue
    patch[key] = value
  }
  return patch
}

export function applyHostActionState(host: unknown): void {
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
}

export function applyAccountActionState(account: unknown): void {
  const state = mergeRecord(account)
  if (!Object.keys(state).length) return
  accountStoreFacade.mergeAccountState({
    isGuest: state.isGuest as UserState['isGuest'],
    nickname: state.nickname as UserState['nickname'],
    openingSeen: state.openingSeen as UserState['openingSeen'],
    onboardingComplete: state.onboardingComplete as UserState['onboardingComplete'],
    hostName: state.hostName as UserState['hostName'],
  })
}

export function applyModuleActionState(state: unknown): void {
  const patch = stripRuntimeOnlyKeys(mergeRecord(state))
  if (!Object.keys(patch).length) return
  userStoreRuntimeFacade.setState(patch as Partial<UserState>)
}

export function applyActionApiResponse(response: {
  account?: unknown
  state?: unknown
  host?: unknown
}): void {
  applyAccountActionState(response.account)
  applyHostActionState(response.host)
  applyModuleActionState(response.state)
}
