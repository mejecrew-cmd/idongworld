import { getCurrentIdToken } from './firebase'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
const PASSWORD_SESSION_TOKEN_KEY = 'idongworld-password-session-token'

interface FetchOpts extends RequestInit {
  uid?: string
}

export interface ResourceRef {
  scope: 'host' | 'module'
  moduleId?: string
  resource: string
}

export interface ModuleStateResponse<TState = Record<string, unknown>> {
  moduleId: string
  storage: 'dedicated' | 'moduleStates'
  state: TState
  createdAt?: number
  updatedAt?: number
}

export interface CustomsApplyRequest {
  ruleId?: string
  multiplier?: number
  idempotencyKey?: string
  from?: ResourceRef
  to?: ResourceRef
  amount?: number
  receiveAmount?: number
}

export interface CustomsApplyResponse {
  ok: boolean
  replayed?: boolean
  ruleId?: string
  transactional?: boolean
  multiplier?: number
  debit?: ResourceRef & { amount: number }
  credit?: ResourceRef & { amount: number }
  log?: unknown
}

export interface CustomsRule {
  ruleId: string
  from: ResourceRef
  to: ResourceRef
  debitAmount: number
  creditAmount: number
  minMultiplier?: number
  maxMultiplier?: number
  label?: string
  description?: string
  sourceModule?: string
  sourceFile?: string
}

export interface ActionResponse<TState = Record<string, unknown>> {
  ok: boolean
  account?: Record<string, unknown>
  state?: TState
  host?: Record<string, unknown>
  steps?: number
  charge?: number
}

export interface ShipTypeConfig {
  shipTypeId: string
  name: string
  cabinSlots: number
  deckSlots: number
  cargoCapacity: number
  diceBonus: number
  isDefault: boolean
  description: string
  phase: string
}

export interface DecorItemConfig {
  itemId: string
  label: string
  cost: number
  defaultOwned: number
}

export interface DynamicAidongZone {
  zoneId: string
  characterId: string
  status: 'active' | 'hidden' | 'farewelled'
  displayOrder: number
  pinned: boolean
  openedAt: number
  source: 'voyage-encounter' | 'manual' | 'migration'
}

export interface MyIslandZoneSlot {
  areaNo: string
  areaId: string
  kind: 'anchor' | 'fillable'
  occupantAidongId?: string
  state: 'locked' | 'empty' | 'filled' | 'active' | 'standby'
  source?: 'default' | 'incorporation' | 'migration'
  incorporatedAt?: number
  updatedAt?: number
}

export interface AidongIslandActionResponse<TState = Record<string, unknown>> extends ActionResponse<TState> {
  hotspot?: Record<string, unknown>
  candidate?: Record<string, unknown>
  aidongState?: Record<string, unknown>
  nextActions?: string[]
}

export interface AuthSessionRequest {
  provider: 'google' | 'twitter' | 'firebase'
  email?: string | null
  displayName?: string | null
  photoURL?: string | null
}

export interface AuthSessionResponse {
  uid: string
  isNew?: boolean
  user?: unknown
  pendingProfile?: AuthSessionRequest
}

export interface SignupCompletionRequest {
  nickname: string
  timeZone: string
  detectedTimeZone: string
  utcOffsetMinutes: number
  serviceTermsAccepted: boolean
  privacyPolicyAccepted: boolean
  marketingAccepted: boolean
  pushNotificationAccepted: boolean
}

export interface PasswordAuthResponse {
  uid: string
  token: string
  isNew?: boolean
  user: unknown
}

export interface PasswordSignupStartResponse {
  signupToken: string
  loginId: string
  isNew: true
}

function getPasswordSessionToken(): string | null {
  try {
    return window.localStorage.getItem(PASSWORD_SESSION_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setPasswordSessionToken(token: string): void {
  try {
    window.localStorage.setItem(PASSWORD_SESSION_TOKEN_KEY, token)
  } catch {
    // Login can still continue with in-memory state; persistence is best effort.
  }
}

export function clearPasswordSessionToken(): void {
  try {
    window.localStorage.removeItem(PASSWORD_SESSION_TOKEN_KEY)
  } catch {
    // Ignore storage errors.
  }
}

async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const idToken = await getCurrentIdToken()
  const passwordToken = idToken ? null : getPasswordSessionToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(idToken || passwordToken ? { Authorization: `Bearer ${idToken ?? passwordToken}` } : {}),
    ...(opts.uid ? { 'X-Uid': opts.uid } : {}),
    ...opts.headers,
  }
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

export const api = {
  health: () => apiFetch<{ status: string }>('/health'),

  debugReset: (uid: string) =>
    apiFetch<{ ok: boolean; account?: unknown; host?: unknown; modules?: Record<string, unknown> }>('/api/debug/reset', {
      method: 'POST',
      uid,
    }),

  authGuest: () =>
    apiFetch<{ uid: string; user: unknown }>('/api/auth/guest', {
      method: 'POST',
    }),

  authSession: (uid: string, request: AuthSessionRequest) =>
    apiFetch<AuthSessionResponse>('/api/auth/session', {
      method: 'POST',
      uid,
      body: JSON.stringify(request),
    }),

  authSocialCompleteSignup: (uid: string, request: AuthSessionRequest & SignupCompletionRequest) =>
    apiFetch<{ uid: string; isNew?: boolean; user: unknown }>('/api/auth/session/complete', {
      method: 'POST',
      uid,
      body: JSON.stringify(request),
    }),

  authPasswordSignup: (request: { loginId: string; password: string; passwordConfirm: string; signUpCode: string }) =>
    apiFetch<PasswordSignupStartResponse>('/api/auth/password/signup', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  authPasswordCompleteSignup: (request: { signupToken: string } & SignupCompletionRequest) =>
    apiFetch<PasswordAuthResponse>('/api/auth/password/signup/complete', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  authPasswordLogin: (request: { loginId: string; password: string }) =>
    apiFetch<PasswordAuthResponse>('/api/auth/password/login', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  deleteAccount: () =>
    apiFetch<{ ok: boolean }>('/api/auth/account', {
      method: 'DELETE',
    }),

  getAccountState: <TState = Record<string, unknown>>(uid: string) =>
    apiFetch<{ state: TState }>(`/api/account/state?uid=${encodeURIComponent(uid)}`, { uid }),

  patchAccountState: <TState = Record<string, unknown>>(
    uid: string,
    patch: Record<string, unknown>,
  ) =>
    apiFetch<{ state: TState }>('/api/account/state', {
      method: 'PATCH',
      uid,
      body: JSON.stringify({ patch }),
    }),

  getHostState: <TState = Record<string, unknown>>(uid: string) =>
    apiFetch<{ state: TState }>(`/api/host/state?uid=${encodeURIComponent(uid)}`, { uid }),

  patchHostState: <TState = Record<string, unknown>>(
    uid: string,
    patch: Record<string, unknown>,
  ) =>
    apiFetch<{ state: TState }>('/api/host/state', {
      method: 'PATCH',
      uid,
      body: JSON.stringify({ patch }),
    }),

  mutateHostResource: <TState = Record<string, unknown>>(
    uid: string,
    resource: 'coins' | 'diamonds' | 'diceCount',
    delta: number,
  ) =>
    apiFetch<ActionResponse<TState>>('/api/host/resources/mutate', {
      method: 'POST',
      uid,
      body: JSON.stringify({ resource, delta }),
    }),

  mutateHostInventory: <TState = Record<string, unknown>>(
    uid: string,
    itemId: string,
    delta: number,
  ) =>
    apiFetch<ActionResponse<TState>>('/api/host/inventory/mutate', {
      method: 'POST',
      uid,
      body: JSON.stringify({ itemId, delta }),
    }),

  getModuleState: <TState = Record<string, unknown>>(uid: string, moduleId: string) =>
    apiFetch<ModuleStateResponse<TState>>(
      `/api/modules/${encodeURIComponent(moduleId)}/state?uid=${encodeURIComponent(uid)}`,
      { uid },
    ),

  putModuleState: <TState = Record<string, unknown>>(
    uid: string,
    moduleId: string,
    state: Record<string, unknown>,
  ) =>
    apiFetch<ModuleStateResponse<TState>>(`/api/modules/${encodeURIComponent(moduleId)}/state`, {
      method: 'PUT',
      uid,
      body: JSON.stringify({ state }),
    }),

  patchModuleState: <TState = Record<string, unknown>>(
    uid: string,
    moduleId: string,
    patch: Record<string, unknown>,
  ) =>
    apiFetch<ModuleStateResponse<TState>>(`/api/modules/${encodeURIComponent(moduleId)}/state`, {
      method: 'PATCH',
      uid,
      body: JSON.stringify({ patch }),
    }),

  recruitAidong: <TState = Record<string, unknown>>(uid: string, characterId: string) =>
    apiFetch<ActionResponse<TState>>('/api/modules/my-aidong/recruit', {
      method: 'POST',
      uid,
      body: JSON.stringify({ characterId }),
    }),

  addAidongAffinity: <TState = Record<string, unknown>>(
    uid: string,
    characterId: string,
    delta: number,
  ) =>
    apiFetch<ActionResponse<TState>>('/api/modules/my-aidong/affinity', {
      method: 'POST',
      uid,
      body: JSON.stringify({ characterId, delta }),
    }),


  applyAidongCare: <TState = Record<string, unknown>>(
    uid: string,
    characterId: string,
    actionId: string,
  ) =>
    apiFetch<ActionResponse<TState> & { result?: Record<string, unknown> }>('/api/modules/my-aidong/care', {
      method: 'POST',
      uid,
      body: JSON.stringify({ characterId, actionId }),
    }),
  setAidongOutfit: <TState = Record<string, unknown>>(
    uid: string,
    characterId: string,
    outfitId: string,
  ) =>
    apiFetch<ActionResponse<TState>>('/api/modules/my-aidong/outfit', {
      method: 'POST',
      uid,
      body: JSON.stringify({ characterId, outfitId }),
    }),

  toggleAidongEquippedItem: <TState = Record<string, unknown>>(
    uid: string,
    characterId: string,
    itemId: string,
  ) =>
    apiFetch<ActionResponse<TState>>('/api/modules/my-aidong/items/equip-toggle', {
      method: 'POST',
      uid,
      body: JSON.stringify({ characterId, itemId }),
    }),

  unlockMyIslandZone: <TState = Record<string, unknown>>(uid: string, zoneId: string) =>
    apiFetch<ActionResponse<TState>>('/api/modules/my-island/unlock-zone', {
      method: 'POST',
      uid,
      body: JSON.stringify({ zoneId }),
    }),

  openDynamicAidongZone: <TState = Record<string, unknown>>(
    uid: string,
    request: {
      zoneId: string
      characterId: string
      displayOrder?: number
      pinned?: boolean
      source?: DynamicAidongZone['source']
    },
  ) =>
    apiFetch<ActionResponse<TState>>('/api/modules/my-island/dynamic-zones/open', {
      method: 'POST',
      uid,
      body: JSON.stringify(request),
    }),

  updateDynamicAidongZone: <TState = Record<string, unknown>>(
    uid: string,
    request: {
      zoneId: string
      status?: DynamicAidongZone['status']
      displayOrder?: number
      pinned?: boolean
    },
  ) =>
    apiFetch<ActionResponse<TState>>('/api/modules/my-island/dynamic-zones/update', {
      method: 'POST',
      uid,
      body: JSON.stringify(request),
    }),

  listMyIslandZoneSlots: <TState = Record<string, unknown>>(uid: string) =>
    apiFetch<ActionResponse<TState> & { zoneSlots?: Record<string, MyIslandZoneSlot> }>(
      '/api/modules/my-island/slots',
      { uid },
    ),

  incorporateMyIslandSlot: <TState = Record<string, unknown>>(
    uid: string,
    areaNo: string,
    characterId: string,
  ) =>
    apiFetch<ActionResponse<TState> & { zoneSlots?: Record<string, MyIslandZoneSlot> }>(
      '/api/modules/my-island/slots/incorporate',
      {
        method: 'POST',
        uid,
        body: JSON.stringify({ areaNo, characterId }),
      },
    ),

  releaseMyIslandSlot: <TState = Record<string, unknown>>(uid: string, areaNo: string) =>
    apiFetch<ActionResponse<TState> & { zoneSlots?: Record<string, MyIslandZoneSlot> }>(
      '/api/modules/my-island/slots/release',
      {
        method: 'POST',
        uid,
        body: JSON.stringify({ areaNo }),
      },
    ),

  moveMyIslandSlot: <TState = Record<string, unknown>>(
    uid: string,
    fromAreaNo: string,
    toAreaNo: string,
  ) =>
    apiFetch<ActionResponse<TState> & { zoneSlots?: Record<string, MyIslandZoneSlot> }>(
      '/api/modules/my-island/slots/move',
      {
        method: 'POST',
        uid,
        body: JSON.stringify({ fromAreaNo, toAreaNo }),
      },
    ),

  completeMyIslandTutorial: (uid: string) =>
    apiFetch<ActionResponse>('/api/modules/my-island/tutorial/complete', {
      method: 'POST',
      uid,
    }),

  unlockCodexDiary: <TState = Record<string, unknown>>(uid: string, diaryId: string) =>
    apiFetch<ActionResponse<TState>>('/api/modules/codex/unlock-diary', {
      method: 'POST',
      uid,
      body: JSON.stringify({ diaryId }),
    }),

  unlockCodexSlot: <TState = Record<string, unknown>>(uid: string, entryId: string) =>
    apiFetch<ActionResponse<TState>>('/api/modules/codex/unlock-slot', {
      method: 'POST',
      uid,
      body: JSON.stringify({ entryId }),
    }),

  fullyRegisterCodex: <TState = Record<string, unknown>>(uid: string, entryId: string) =>
    apiFetch<ActionResponse<TState>>('/api/modules/codex/fully-register', {
      method: 'POST',
      uid,
      body: JSON.stringify({ entryId }),
    }),

  collectZoneResource: <TState = Record<string, unknown>>(
    uid: string,
    moduleId: string,
    resource: string,
    amount: number,
  ) =>
    apiFetch<ActionResponse<TState>>(`/api/modules/${encodeURIComponent(moduleId)}/collect`, {
      method: 'POST',
      uid,
      body: JSON.stringify({ resource, amount }),
    }),

  clearZone: <TState = Record<string, unknown>>(
    uid: string,
    moduleId: string,
    clearId?: string,
    result?: Record<string, unknown>,
    idempotencyKey?: string,
  ) =>
    apiFetch<ActionResponse<TState>>(`/api/modules/${encodeURIComponent(moduleId)}/clear`, {
      method: 'POST',
      uid,
      body: JSON.stringify({ clearId, result, idempotencyKey }),
    }),

  startRouteNeighbor: <TState = Record<string, unknown>>(uid: string, routeId: string) =>
    apiFetch<ActionResponse<TState>>('/api/modules/route-neighbor/start', {
      method: 'POST',
      uid,
      body: JSON.stringify({ routeId }),
    }),

  rollRouteNeighbor: <TState = Record<string, unknown>>(
    uid: string,
    steps?: number,
    context?: { routeId?: string; boardPosition?: number },
  ) =>
    apiFetch<ActionResponse<TState>>('/api/modules/route-neighbor/roll', {
      method: 'POST',
      uid,
      body: JSON.stringify({ steps, ...context }),
    }),

  acceptRouteAidongEncounter: <TState = Record<string, unknown>>(
    uid: string,
    request: {
      characterId: string
      encounterId?: string
      zoneId?: string
    },
  ) =>
    apiFetch<ActionResponse<TState> & {
      encounter?: Record<string, unknown>
      aidongState?: Record<string, unknown>
      islandState?: Record<string, unknown>
      nextActions?: string[]
      replayed?: boolean
    }>('/api/modules/route-neighbor/encounter/accept', {
      method: 'POST',
      uid,
      body: JSON.stringify(request),
    }),  landAidongIsland: <TState = Record<string, unknown>>(uid: string, islandId: string) =>
    apiFetch<AidongIslandActionResponse<TState>>('/api/modules/aidong-island/land', {
      method: 'POST',
      uid,
      body: JSON.stringify({ islandId }),
    }),

  moveAidongIsland: <TState = Record<string, unknown>>(
    uid: string,
    direction: 'north' | 'south' | 'west' | 'east',
  ) =>
    apiFetch<AidongIslandActionResponse<TState>>('/api/modules/aidong-island/move', {
      method: 'POST',
      uid,
      body: JSON.stringify({ direction }),
    }),

  interactAidongIsland: <TState = Record<string, unknown>>(uid: string, hotspotId: string) =>
    apiFetch<AidongIslandActionResponse<TState>>('/api/modules/aidong-island/interact', {
      method: 'POST',
      uid,
      body: JSON.stringify({ hotspotId }),
    }),

  recruitFromAidongIsland: <TState = Record<string, unknown>>(uid: string, characterId: string) =>
    apiFetch<AidongIslandActionResponse<TState>>('/api/modules/aidong-island/recruit', {
      method: 'POST',
      uid,
      body: JSON.stringify({ characterId }),
    }),

  getCurrentRouteLanding: <TLanding = Record<string, unknown>>(uid: string) =>
    apiFetch<{ ok: boolean; landing?: TLanding }>('/api/modules/route-neighbor/landing/current', {
      uid,
    }),

  clearRouteLanding: <TState = Record<string, unknown>>(
    uid: string,
    landingId?: string,
    context?: { routeId?: string; boardPosition?: number },
  ) =>
    apiFetch<ActionResponse<TState> & {
      landing?: Record<string, unknown>
      rewards?: Array<Record<string, unknown>>
    }>('/api/modules/route-neighbor/landing/clear', {
      method: 'POST',
      uid,
      body: JSON.stringify({ landingId, ...context }),
    }),

  endRouteNeighbor: <TState = Record<string, unknown>>(uid: string) =>
    apiFetch<ActionResponse<TState>>('/api/modules/route-neighbor/end', {
      method: 'POST',
      uid,
    }),

  toggleHarborAssign: <TState = Record<string, unknown>>(uid: string, characterId: string) =>
    apiFetch<ActionResponse<TState>>('/api/modules/ship/harbor/assign-toggle', {
      method: 'POST',
      uid,
      body: JSON.stringify({ characterId }),
    }),

  chargeHarborDice: <TState = Record<string, unknown>>(uid: string, now?: number) =>
    apiFetch<ActionResponse<TState>>('/api/modules/ship/harbor/charge', {
      method: 'POST',
      uid,
      body: JSON.stringify({ now }),
    }),

  getShipConfig: () =>
    apiFetch<{
      ok: boolean
      defaultShipType: ShipTypeConfig
      shipTypes: ShipTypeConfig[]
      cabinFurnitureItems?: DecorItemConfig[]
    }>('/api/modules/ship/config'),

  changeShipType: <TState = Record<string, unknown>>(uid: string, shipTypeId: string) =>
    apiFetch<ActionResponse<TState>>('/api/modules/ship/type/change', {
      method: 'POST',
      uid,
      body: JSON.stringify({ shipTypeId }),
    }),

  assignShipCabin: <TState = Record<string, unknown>>(
    uid: string,
    slotId: string,
    characterId?: string,
    context?: 'harbor' | 'voyage',
  ) =>
    apiFetch<ActionResponse<TState>>('/api/modules/ship/cabins/assign', {
      method: 'POST',
      uid,
      body: JSON.stringify({ slotId, characterId, context }),
    }),

  assignShipDeck: <TState = Record<string, unknown>>(
    uid: string,
    slotId: string,
    characterId?: string,
    context?: 'harbor' | 'voyage',
  ) =>
    apiFetch<ActionResponse<TState>>('/api/modules/ship/deck/assign', {
      method: 'POST',
      uid,
      body: JSON.stringify({ slotId, characterId, context }),
    }),

  purchaseCabinFurniture: <TState = Record<string, unknown>>(uid: string, itemId: string) =>
    apiFetch<ActionResponse<TState>>('/api/modules/ship/cabins/furniture/purchase', {
      method: 'POST',
      uid,
      body: JSON.stringify({ itemId }),
    }),

  toggleCabinFurniture: <TState = Record<string, unknown>>(uid: string, slotId: string, itemId: string) =>
    apiFetch<ActionResponse<TState>>('/api/modules/ship/cabins/furniture/toggle', {
      method: 'POST',
      uid,
      body: JSON.stringify({ slotId, itemId }),
    }),


  getMyRoomSummary: <TState = Record<string, unknown>>(uid: string) =>
    apiFetch<{ ok: boolean } & TState>('/api/modules/myroom/summary', { uid }),

  getMyRoomSection: <TState = Record<string, unknown>>(
    uid: string,
    section: 'aidongs' | 'codex' | 'collection' | 'ledger',
  ) =>
    apiFetch<{ ok: boolean } & TState>(`/api/modules/myroom/${section}`, { uid }),
  getLodgeConfig: () =>
    apiFetch<{
      ok: boolean
      maxAssignedAidongs: number
      furnitureItems?: DecorItemConfig[]
    }>('/api/modules/lodge/config'),

  toggleLodgeAidongAssign: <TState = Record<string, unknown>>(uid: string, characterId: string) =>
    apiFetch<ActionResponse<TState>>('/api/modules/lodge/aidongs/assign-toggle', {
      method: 'POST',
      uid,
      body: JSON.stringify({ characterId }),
    }),

  purchaseLodgeFurniture: <TState = Record<string, unknown>>(uid: string, itemId: string) =>
    apiFetch<ActionResponse<TState>>('/api/modules/lodge/furniture/purchase', {
      method: 'POST',
      uid,
      body: JSON.stringify({ itemId }),
    }),

  toggleLodgeRoomFurniture: <TState = Record<string, unknown>>(uid: string, roomId: string, itemId: string) =>
    apiFetch<ActionResponse<TState>>('/api/modules/lodge/rooms/furniture/toggle', {
      method: 'POST',
      uid,
      body: JSON.stringify({ roomId, itemId }),
    }),

  listCustomsRules: () =>
    apiFetch<{ rules: CustomsRule[] }>('/api/customs/rules'),

  applyCustoms: (uid: string, request: CustomsApplyRequest) =>
    apiFetch<CustomsApplyResponse>('/api/customs/apply', {
      method: 'POST',
      uid,
      body: JSON.stringify(request),
    }),

  listCustomsLogs: (uid: string, limit = 50) =>
    apiFetch<{ logs: unknown[] }>(
      `/api/customs/logs?uid=${encodeURIComponent(uid)}&limit=${encodeURIComponent(String(limit))}`,
      { uid },
    ),
}
