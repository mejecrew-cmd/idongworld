/**
 * packages/backend/src/routes/admin.ts
 * ------------------------------------------------------------
 * 역할: 관리자 전용 1차 API를 제공한다.
 * 연결: authMiddleware 이후 admin middleware로 보호되며, adminUsers 권한 문서를 기준으로 접근을 판단한다.
 * 주의: 응답에는 passwordHash/providerUid 같은 민감 인증 정보를 포함하지 않는다.
 */
import { Router } from 'express'
import type { HostStateDoc } from '../models/HostStateModel.js'
import type { AdminRole, AdminUserDoc } from '../models/AdminUserModel.js'
import type { UserDoc } from '../store/memoryStore.js'
import { adminMiddleware, getRequestAdminUser, requireAdminPermission, requireAdminRole } from '../middleware/admin.js'
import {
  getAdminRepository,
  getDedicatedModuleRepositories,
  getHostStateRepository,
  getUserRepository,
} from '../repositories/index.js'
import type { HostResource } from '../repositories/hostStateRepository.js'
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

export const adminRouter = Router()

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200
const HOST_RESOURCES: HostResource[] = ['coins', 'diamonds', 'diceCount']
const ADMIN_ROLES: AdminRole[] = ['owner', 'admin', 'operator', 'viewer']
const ROLE_PERMISSION_PRESETS: Record<AdminRole, string[]> = {
  viewer: [
    'users.read',
    'users.detail.read',
    'db.read',
  ],
  operator: [
    'users.read',
    'users.detail.read',
    'users.account.patch',
    'users.resources.grant',
    'users.reset',
    'db.read',
    'db.write',
  ],
  admin: [
    'users.read',
    'users.detail.read',
    'users.account.patch',
    'users.resources.grant',
    'users.reset',
    'db.read',
    'db.write',
    'adminUsers.write',
  ],
  owner: [
    'users.read',
    'users.detail.read',
    'users.account.patch',
    'users.resources.grant',
    'users.reset',
    'db.read',
    'db.write',
    'adminUsers.write',
  ],
}
const ZONE_MODULE_IDS = ['zone-garden', 'zone-oasis', 'zone-memory', 'zone-mine']
const DESTINATION_ISLAND_MODULE_IDS = ['destination-shell-island']
const ACCOUNT_PATCH_FIELDS = [
  'nickname',
  'hostName',
  'sooksoName',
  'openingSeen',
  'sooksoClean',
  'onboardingComplete',
  'soundSettings',
] as const

function readLimit(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)))
}

function normalizeSearchQuery(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function readUidParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function readResource(value: unknown): HostResource | undefined {
  return typeof value === 'string' && HOST_RESOURCES.includes(value as HostResource)
    ? value as HostResource
    : undefined
}

function readAdminRole(value: unknown): AdminRole | undefined {
  return typeof value === 'string' && ADMIN_ROLES.includes(value as AdminRole)
    ? value as AdminRole
    : undefined
}

function readDelta(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const delta = Math.trunc(value)
  return delta === 0 ? undefined : delta
}

function normalizeVolume(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalizeSoundSettings(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const source = value as Record<string, unknown>
  const bgmVolume = normalizeVolume(source.bgmVolume)
  const sfxVolume = normalizeVolume(source.sfxVolume)
  if (bgmVolume === undefined || sfxVolume === undefined) return undefined
  return { bgmVolume, sfxVolume }
}

function pickAdminAccountPatch(source: Record<string, unknown>) {
  const patch: Partial<UserDoc> = {}
  for (const field of ACCOUNT_PATCH_FIELDS) {
    if (!(field in source)) continue
    const value = source[field]
    if (field === 'soundSettings') {
      const soundSettings = normalizeSoundSettings(value)
      if (soundSettings !== undefined) patch.soundSettings = soundSettings
      continue
    }
    if (field === 'openingSeen' || field === 'sooksoClean' || field === 'onboardingComplete') {
      if (typeof value === 'boolean') patch[field] = value
      continue
    }
    if (field === 'nickname' || field === 'hostName' || field === 'sooksoName') {
      if (typeof value === 'string' || value === null) patch[field] = value ?? undefined
    }
  }
  return patch
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

async function writeAudit(req: Parameters<Parameters<typeof adminRouter.post>[1]>[0], action: string, targetUid: string, payloadSummary: Record<string, unknown>) {
  const adminUser = getRequestAdminUser(req)
  if (!adminUser) return
  await getAdminRepository().writeAdminAuditLog({
    adminUid: adminUser.uid,
    action,
    targetUid,
    payloadSummary,
    ip: req.ip,
  })
}

function toUserSummary(user: UserDoc) {
  return {
    uid: user.uid,
    isGuest: user.isGuest,
    authProvider: user.authProvider,
    nickname: user.nickname,
    email: user.email,
    signupProfileCompleted: user.signupProfileCompleted,
    timezoneCompleted: user.timezoneCompleted,
    termsCompleted: user.termsCompleted,
    sooksoClean: user.sooksoClean,
    openingSeen: user.openingSeen,
    onboardingComplete: user.onboardingComplete,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

function userMatchesSearch(user: UserDoc, query: string): boolean {
  if (!query) return false
  const fields = [
    user.uid,
    user.email,
    user.emailNormalized,
    user.nickname,
    user.nicknameNormalized,
    user.loginId,
    user.loginIdNormalized,
    user.displayName,
  ]
  return fields.some((field) => typeof field === 'string' && field.toLowerCase().includes(query))
}

function toUserDetail(user: UserDoc, adminUser?: AdminUserDoc) {
  return {
    ...toUserSummary(user),
    displayName: user.displayName,
    photoURL: user.photoURL,
    timeZone: user.timeZone,
    detectedTimeZone: user.detectedTimeZone,
    utcOffsetMinutes: user.utcOffsetMinutes,
    termsAgreements: user.termsAgreements,
    profileImageSource: user.profileImageSource,
    gameStartedAt: user.gameStartedAt,
    hostName: user.hostName,
    sooksoName: user.sooksoName,
    soundSettings: user.soundSettings,
    recruitedAidongs: user.recruitedAidongs,
    firstGachaAttempts: user.firstGachaAttempts,
    adminRole: adminUser?.enabled ? adminUser.role : undefined,
    adminEnabled: adminUser?.enabled === true,
  }
}

function toHostSummary(host: HostStateDoc) {
  return {
    uid: host.uid,
    hostName: host.hostName,
    coins: host.coins,
    diamonds: host.diamonds,
    diceCount: host.diceCount,
    inventory: host.inventory,
    createdAt: host.createdAt,
    updatedAt: host.updatedAt,
  }
}

function toAdminUserResponse(adminUser: AdminUserDoc) {
  return {
    uid: adminUser.uid,
    role: adminUser.role,
    permissions: adminUser.permissions,
    enabled: adminUser.enabled,
    createdAt: adminUser.createdAt,
    updatedAt: adminUser.updatedAt,
  }
}

function permissionsForRole(role: AdminRole): string[] {
  return [...ROLE_PERMISSION_PRESETS[role]]
}

adminRouter.get('/me', adminMiddleware, (req, res) => {
  const adminUser = getRequestAdminUser(req)
  if (!adminUser) {
    res.status(403).json({ isAdmin: false })
    return
  }

  res.json({
    isAdmin: true,
    adminUser: toAdminUserResponse(adminUser),
  })
})

adminRouter.get('/users', requireAdminRole('viewer'), async (req, res) => {
  const limit = readLimit(req.query.limit)
  const query = normalizeSearchQuery(req.query.q)
  if (!query) {
    res.json({
      users: [],
      limit,
      hasMore: false,
      query,
    })
    return
  }

  const users = await getUserRepository().listUsers()
  const matched = users.filter((user) => userMatchesSearch(user, query))
  const sorted = matched
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, limit)
    .map(toUserSummary)

  res.json({
    users: sorted,
    limit,
    hasMore: matched.length > limit,
    query,
  })
})

adminRouter.get('/users/:uid', requireAdminRole('viewer'), async (req, res) => {
  const uid = readUidParam(req.params.uid)
  if (!uid) {
    res.status(400).json({ error: 'uid_required' })
    return
  }

  const user = await getUserRepository().getUser(uid)
  if (!user) {
    res.status(404).json({ error: 'user_not_found' })
    return
  }

  const host = await getHostStateRepository().getOrCreate(uid, {
    hostName: user.hostName,
    coins: user.coins,
    diamonds: user.diamonds,
    diceCount: user.diceCount,
    inventory: user.inventory,
  })

  const adminUser = await getAdminRepository().getAdminUser(uid)

  res.json({
    user: toUserDetail(user, adminUser),
    host: toHostSummary(host),
  })
})

adminRouter.post('/users/:uid/resources/grant', requireAdminPermission('users.resources.grant'), async (req, res) => {
  const uid = readUidParam(req.params.uid)
  if (!uid) {
    res.status(400).json({ error: 'uid_required' })
    return
  }

  const resource = readResource(req.body?.resource)
  const delta = readDelta(req.body?.delta)
  if (!resource || delta === undefined) {
    res.status(400).json({ error: 'invalid_resource_grant' })
    return
  }

  const user = await getUserRepository().getUser(uid)
  if (!user) {
    res.status(404).json({ error: 'user_not_found' })
    return
  }

  try {
    const host = await getHostStateRepository().mutateResource(uid, resource, delta)
    await writeAudit(req, 'users.resources.grant', uid, { resource, delta })
    res.json({ ok: true, host: toHostSummary(host) })
  } catch (error) {
    if (error instanceof Error && error.message === 'insufficient_host_resource') {
      res.status(400).json({ error: 'insufficient_host_resource' })
      return
    }
    throw error
  }
})

adminRouter.post('/users/:uid/reset', requireAdminPermission('users.reset'), async (req, res) => {
  const uid = readUidParam(req.params.uid)
  if (!uid) {
    res.status(400).json({ error: 'uid_required' })
    return
  }

  const existing = await getUserRepository().getUser(uid)
  if (!existing) {
    res.status(404).json({ error: 'user_not_found' })
    return
  }

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

  const modules: Record<string, object> = {}
  const repositories = getDedicatedModuleRepositories()
  for (const [moduleId, repository] of Object.entries(repositories)) {
    const defaultState = defaultModuleState(uid, moduleId)
    if (!defaultState) continue
    modules[moduleId] = await repository.patch(uid, defaultState)
  }

  await writeAudit(req, 'users.reset', uid, { resetModules: Object.keys(modules).sort() })

  res.json({
    ok: true,
    account: account ? toUserDetail(account) : undefined,
    host: toHostSummary(host),
    modules,
  })
})

adminRouter.patch('/users/:uid/account', requireAdminPermission('users.account.patch'), async (req, res) => {
  const uid = readUidParam(req.params.uid)
  if (!uid) {
    res.status(400).json({ error: 'uid_required' })
    return
  }

  const patchSource = req.body?.patch
  if (!patchSource || typeof patchSource !== 'object' || Array.isArray(patchSource)) {
    res.status(400).json({ error: 'invalid_patch' })
    return
  }

  const patch = pickAdminAccountPatch(patchSource as Record<string, unknown>)
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'empty_patch' })
    return
  }

  const updated = await getUserRepository().updateUser(uid, patch)
  if (!updated) {
    res.status(404).json({ error: 'user_not_found' })
    return
  }

  await writeAudit(req, 'users.account.patch', uid, { fields: Object.keys(patch).sort() })

  res.json({
    ok: true,
    user: toUserDetail(updated),
  })
})

adminRouter.patch('/admin-users/:uid', requireAdminPermission('adminUsers.write'), async (req, res) => {
  const uid = readUidParam(req.params.uid)
  if (!uid) {
    res.status(400).json({ error: 'uid_required' })
    return
  }

  const targetUser = await getUserRepository().getUser(uid)
  if (!targetUser) {
    res.status(404).json({ error: 'user_not_found' })
    return
  }

  const disableAdmin = req.body?.role === null
  const role = readAdminRole(req.body?.role)
  if (!role && !disableAdmin) {
    res.status(400).json({ error: 'invalid_admin_role' })
    return
  }

  const previousAdminUser = await getAdminRepository().getAdminUser(uid)
  const nextRole = role ?? previousAdminUser?.role ?? 'viewer'
  const permissions = role ? permissionsForRole(role) : previousAdminUser?.permissions ?? permissionsForRole('viewer')

  const adminUser = await getAdminRepository().upsertAdminUser({
    uid,
    role: nextRole,
    permissions,
    enabled: role ? true : false,
  })

  await writeAudit(req, disableAdmin ? 'adminUsers.disable' : 'adminUsers.upsert', uid, {
    role: role ?? null,
    permissions: adminUser.permissions,
    enabled: adminUser.enabled,
  })

  res.json({
    ok: true,
    adminUser: toAdminUserResponse(adminUser),
  })
})
