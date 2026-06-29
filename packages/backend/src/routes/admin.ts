/**
 * packages/backend/src/routes/admin.ts
 * ------------------------------------------------------------
 * 역할: 관리자 전용 1차 API를 제공한다.
 * 연결: authMiddleware 이후 admin middleware로 보호되며, adminUsers 권한 문서를 기준으로 접근을 판단한다.
 * 주의: 응답에는 passwordHash/providerUid 같은 민감 인증 정보를 포함하지 않는다.
 */
import path from 'node:path'
import { Router } from 'express'
import type { HostStateDoc } from '../models/HostStateModel.js'
import type { AdminRole, AdminUserDoc } from '../models/AdminUserModel.js'
import type { UserDoc } from '../store/memoryStore.js'
import { adminMiddleware, getRequestAdminUser, requireAdminPermission, requireAdminRole } from '../middleware/admin.js'
import {
  getAdminRepository,
  getCurrencyRepository,
  getDedicatedModuleRepositories,
  getDiceResourceRepository,
  getHostStateRepository,
  getMydongRepository,
  getMydongCosmeticRepository,
  getMydongPediaInventoryRepository,
  getSooksoRepository,
  getStaticTableRepository,
  getUserInventoryRepository,
  getUserRepository,
  getUserSettingsRepository,
} from '../repositories/index.js'
import {
  isStaticTableImportable,
  listImportableStaticTableDefinitions,
  listStaticTableDefinitions,
} from '../staticTables/registry.js'
import {
  commitStaticTableImport,
  previewStaticTableImport,
  scanTableFiles,
  validateStaticTableFiles,
  type TableFile,
  type TableFileScanResult,
} from '../staticTables/service.js'
import type { HostResource } from '../repositories/hostStateRepository.js'
import { userSettingsPatchFromUserPatch, type UserSettingsDoc } from '../repositories/userSettingsRepository.js'
import type { SooksoStateDoc } from '../repositories/sooksoRepository.js'
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

function toUserDetail(
  user: UserDoc,
  adminUser?: AdminUserDoc,
  userSettings?: UserSettingsDoc,
  sookso?: SooksoStateDoc,
) {
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
    sooksoName: sookso?.sooksoName ?? user.sooksoName,
    sooksoClean: sookso?.sooksoClean ?? user.sooksoClean,
    soundSettings: userSettings
      ? { bgmVolume: userSettings.bgmVolume, sfxVolume: userSettings.sfxVolume }
      : user.soundSettings,
    userSettings,
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

function summarizeQuantityMap(map: Record<string, number>) {
  const entries = Object.entries(map)
    .filter(([, quantity]) => Number.isFinite(quantity) && quantity > 0)
    .sort(([left], [right]) => left.localeCompare(right))
  return {
    count: entries.length,
    totalQuantity: entries.reduce((sum, [, quantity]) => sum + quantity, 0),
    sample: entries.slice(0, 10).map(([itemId, quantity]) => ({ itemId, quantity })),
  }
}

function summarizePediaInventory(items: Array<{ quantity: number; aidongId: string }>) {
  const activeItems = items.filter((item) => item.quantity > 0)
  return {
    rowCount: activeItems.length,
    totalQuantity: activeItems.reduce((sum, item) => sum + item.quantity, 0),
    aidongCount: new Set(activeItems.map((item) => item.aidongId)).size,
  }
}

async function buildSplitSummary(user: UserDoc, host: HostStateDoc, userSettings: UserSettingsDoc, sookso: SooksoStateDoc) {
  const uid = user.uid
  const [
    providerAccounts,
    currencies,
    diceResource,
    inventory,
    mydongs,
    assignedAidongIds,
    roomFurnitureMap,
    pediaInventory,
    cosmeticInventory,
    cosmeticLoadouts,
    personaPartStates,
  ] = await Promise.all([
    getUserRepository().listProviderAccounts(uid),
    getCurrencyRepository().getBalances(uid, { coin: host.coins, diamond: host.diamonds }),
    getDiceResourceRepository().getOrCreate(uid, { diceQuantity: host.diceCount }),
    getUserInventoryRepository().getInventoryMap(uid, host.inventory),
    getMydongRepository().list(uid),
    getSooksoRepository().getAssignedAidongIds(uid, []),
    getSooksoRepository().getRoomFurnitureMap(uid, {}),
    getMydongPediaInventoryRepository().list(uid),
    getMydongCosmeticRepository().listInventory(uid),
    getMydongCosmeticRepository().listLoadouts(uid),
    getMydongCosmeticRepository().listPersonaPartStates(uid),
  ])

  const roomEntries = Object.entries(roomFurnitureMap)
  return {
    providerAccounts: providerAccounts.map((account) => ({
      providerCode: account.providerCode,
      providerSubjectId: account.providerSubjectId,
      email: account.email,
      emailVerified: account.emailVerified,
      displayName: account.displayName,
      linkedAt: account.linkedAt,
      lastLoginAt: account.lastLoginAt,
      status: account.status,
    })),
    userSettings: {
      locale: userSettings.locale,
      timeZone: userSettings.timeZone,
      marketingAccepted: userSettings.marketingAccepted,
      pushNotificationAccepted: userSettings.pushNotificationAccepted,
      bgmVolume: userSettings.bgmVolume,
      sfxVolume: userSettings.sfxVolume,
    },
    currencies,
    diceResource: {
      diceQuantity: diceResource.diceQuantity,
      maxDiceQuantity: diceResource.maxDiceQuantity,
      chargeIntervalMinutes: diceResource.chargeIntervalMinutes,
      nextChargeAt: diceResource.nextChargeAt,
      dailyRollCount: diceResource.dailyRollCount,
      dailyRollDate: diceResource.dailyRollDate,
    },
    inventory: summarizeQuantityMap(inventory),
    sookso: {
      sooksoClean: sookso.sooksoClean,
      sooksoName: sookso.sooksoName,
      assignedAidongCount: assignedAidongIds.length,
      assignedAidongIds,
      roomCount: roomEntries.length,
      furniturePlacementCount: roomEntries.reduce((sum, [, room]) => sum + room.furniture.length, 0),
    },
    mydongs: {
      count: mydongs.length,
      activeCount: mydongs.filter((mydong) => mydong.status === 'active').length,
      sample: mydongs.slice(0, 10).map((mydong) => ({
        mydongUid: mydong.mydongUid,
        aidongId: mydong.aidongId,
        nickname: mydong.nickname,
        acquisitionSource: mydong.acquisitionSource,
        status: mydong.status,
      })),
    },
    pediaInventory: summarizePediaInventory(pediaInventory),
    cosmetics: {
      inventoryRowCount: cosmeticInventory.filter((item) => item.quantity > 0).length,
      inventoryTotalQuantity: cosmeticInventory.reduce((sum, item) => sum + item.quantity, 0),
      loadoutCount: cosmeticLoadouts.length,
      personaPartStateCount: personaPartStates.length,
    },
  }
}

function permissionsForRole(role: AdminRole): string[] {
  return [...ROLE_PERMISSION_PRESETS[role]]
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readOptionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const values = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
  return values.length > 0 ? [...new Set(values)] : undefined
}

function resolveStaticTableSourceDir(): string {
  const configured = readOptionalString(process.env.STATIC_TABLE_SOURCE_DIR)
  if (configured) return path.resolve(configured)
  const cwd = process.cwd().replace(/\\/g, '/')
  if (cwd.endsWith('/packages/backend')) return path.resolve(process.cwd(), '../../resources/table')
  return path.resolve(process.cwd(), 'resources/table')
}

function summarizeStaticTableFile(file: TableFile) {
  return {
    fileName: file.fileName,
    tableCode: file.tableCode,
    sourceHash: file.sourceHash,
    rowCount: file.rowCount,
    importable: isStaticTableImportable(file.tableCode),
    importKind: file.parsed.tableDefinition?.importKind,
    targetCollection: file.parsed.tableDefinition?.targetCollection,
    bundleCollection: file.parsed.tableDefinition?.bundleCollection,
  }
}

function selectStaticTableFiles(scan: TableFileScanResult, tableCodes?: string[]): TableFile[] {
  const selectedCodes = tableCodes ? new Set(tableCodes) : undefined
  return scan.files.filter((file) => {
    if (selectedCodes) return selectedCodes.has(file.tableCode)
    return isStaticTableImportable(file.tableCode)
  })
}

async function scanAdminStaticTableFiles() {
  const sourceDir = resolveStaticTableSourceDir()
  return scanTableFiles(sourceDir)
}

function readStaticImportOptions(body: unknown) {
  const source = body && typeof body === 'object' && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {}
  return {
    version: readOptionalString(source.version),
    importBatchId: readOptionalString(source.importBatchId),
    tableCodes: readOptionalStringArray(source.tableCodes),
  }
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
  const userSettings = await getUserSettingsRepository().getOrCreate(uid, user)
  const sookso = await getSooksoRepository().getOrCreateSookso(uid, {
    sooksoClean: Boolean(user.sooksoClean),
    sooksoName: user.sooksoName,
  })

  res.json({
    user: toUserDetail(user, adminUser, userSettings, sookso),
    host: toHostSummary(host),
    splitSummary: await buildSplitSummary(user, host, userSettings, sookso),
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
  const sookso = await getSooksoRepository().patchSookso(uid, {
    sooksoClean: false,
    sooksoName: undefined,
  })
  await getSooksoRepository().replaceAssignedAidongs(uid, [])
  await getSooksoRepository().replaceRoomFurnitureMap(uid, {})
  await getMydongPediaInventoryRepository().delete(uid)
  await getMydongCosmeticRepository().delete(uid)

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
    account: account ? toUserDetail(account, undefined, undefined, sookso) : undefined,
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

  const settingsPatch = userSettingsPatchFromUserPatch(patch)
  const userSettings = Object.keys(settingsPatch).length
    ? await getUserSettingsRepository().patch(uid, settingsPatch)
    : await getUserSettingsRepository().getOrCreate(uid, updated)
  const sooksoPatch: { sooksoClean?: boolean; sooksoName?: string } = {}
  if (patch.sooksoClean !== undefined) sooksoPatch.sooksoClean = Boolean(patch.sooksoClean)
  if (patch.sooksoName !== undefined) sooksoPatch.sooksoName = patch.sooksoName
  const sookso = Object.keys(sooksoPatch).length
    ? await getSooksoRepository().patchSookso(uid, sooksoPatch)
    : await getSooksoRepository().getOrCreateSookso(uid, {
      sooksoClean: Boolean(updated.sooksoClean),
      sooksoName: updated.sooksoName,
    })

  await writeAudit(req, 'users.account.patch', uid, { fields: Object.keys(patch).sort() })

  res.json({
    ok: true,
    user: toUserDetail(updated, undefined, userSettings, sookso),
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

adminRouter.get('/static-tables/registry', requireAdminPermission('db.read'), (_req, res) => {
  res.json({
    definitions: listStaticTableDefinitions(),
    importableDefinitions: listImportableStaticTableDefinitions(),
  })
})

adminRouter.get('/static-tables/files', requireAdminPermission('db.read'), async (_req, res) => {
  try {
    const scan = await scanAdminStaticTableFiles()
    res.json({
      sourceDir: scan.sourceDir,
      files: scan.files.map(summarizeStaticTableFile),
      errors: scan.errors,
    })
  } catch (error) {
    res.status(404).json({
      error: 'static_table_source_dir_unavailable',
      message: error instanceof Error ? error.message : String(error),
    })
  }
})

adminRouter.post('/static-tables/validate', requireAdminPermission('db.write'), async (req, res) => {
  const options = readStaticImportOptions(req.body)
  try {
    const scan = await scanAdminStaticTableFiles()
    const files = selectStaticTableFiles(scan, options.tableCodes)
    if (files.length === 0) {
      res.status(400).json({ error: 'static_table_files_empty', sourceDir: scan.sourceDir, scanErrors: scan.errors })
      return
    }
    const validation = await validateStaticTableFiles(files)
    const now = Date.now()
    const importBatchId = options.importBatchId ?? `validated-${now}`
    const version = options.version ?? `validated-${now}`
    await getStaticTableRepository().upsertImportBatch({
      importBatchId,
      status: validation.ok ? 'validated' : 'failed',
      version,
      sourceDir: scan.sourceDir,
      sourceFiles: files.map((file) => ({
        fileName: file.fileName,
        tableCode: file.tableCode,
        sourceHash: file.sourceHash,
        rowCount: file.rowCount,
      })),
      actorUid: getRequestAdminUser(req)?.uid,
      validationSummary: validation,
      errorMessage: validation.ok ? undefined : 'static_import_validation_failed',
      createdAt: now,
      updatedAt: now,
      failedAt: validation.ok ? undefined : now,
    })
    res.status(validation.ok ? 200 : 422).json({
      ok: validation.ok,
      importBatchId,
      version,
      sourceDir: scan.sourceDir,
      files: files.map(summarizeStaticTableFile),
      scanErrors: scan.errors,
      validation,
    })
  } catch (error) {
    res.status(500).json({ error: 'static_table_validate_failed', message: error instanceof Error ? error.message : String(error) })
  }
})

adminRouter.post('/static-tables/dry-run', requireAdminPermission('db.write'), async (req, res) => {
  const options = readStaticImportOptions(req.body)
  try {
    const scan = await scanAdminStaticTableFiles()
    const files = selectStaticTableFiles(scan, options.tableCodes)
    if (files.length === 0) {
      res.status(400).json({ error: 'static_table_files_empty', sourceDir: scan.sourceDir, scanErrors: scan.errors })
      return
    }
    const preview = await previewStaticTableImport(files, {
      version: options.version,
      importBatchId: options.importBatchId,
    })
    const now = Date.now()
    await getStaticTableRepository().upsertImportBatch({
      importBatchId: preview.importBatchId,
      status: preview.ok ? 'dryRun' : 'failed',
      version: preview.version,
      sourceDir: scan.sourceDir,
      sourceFiles: preview.sourceFiles,
      actorUid: getRequestAdminUser(req)?.uid,
      validationSummary: preview.validation,
      dryRunSummary: {
        tableRowCount: preview.tableRowCount,
        runtimeRowCounts: preview.runtimeRowCounts,
        bundleCounts: preview.bundleCounts,
      },
      errorMessage: preview.ok ? undefined : 'static_import_validation_failed',
      createdAt: now,
      updatedAt: now,
      failedAt: preview.ok ? undefined : now,
    })
    res.status(preview.ok ? 200 : 422).json({
      ...preview,
      sourceDir: scan.sourceDir,
      scanErrors: scan.errors,
    })
  } catch (error) {
    res.status(500).json({ error: 'static_table_dry_run_failed', message: error instanceof Error ? error.message : String(error) })
  }
})

adminRouter.post('/static-tables/commit', requireAdminPermission('db.write'), async (req, res) => {
  const options = readStaticImportOptions(req.body)
  const adminUser = getRequestAdminUser(req)
  try {
    const scan = await scanAdminStaticTableFiles()
    const files = selectStaticTableFiles(scan, options.tableCodes)
    if (files.length === 0) {
      res.status(400).json({ error: 'static_table_files_empty', sourceDir: scan.sourceDir, scanErrors: scan.errors })
      return
    }
    const result = await commitStaticTableImport(files, adminUser?.uid ?? 'unknown-admin', {
      repository: getStaticTableRepository(),
      version: options.version,
      importBatchId: options.importBatchId,
    })
    await writeAudit(req, 'staticTables.commit', 'static-tables', {
      importBatchId: result.importBatchId,
      version: result.version,
      tableCount: result.sourceFiles.length,
      tableRowCount: result.tableRowCount,
      bundleCounts: result.bundleCounts,
    })
    res.json({
      ...result,
      sourceDir: scan.sourceDir,
      scanErrors: scan.errors,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'static_import_validation_failed') {
      const scan = await scanAdminStaticTableFiles()
      const files = selectStaticTableFiles(scan, options.tableCodes)
      const preview = await previewStaticTableImport(files, {
        version: options.version,
        importBatchId: options.importBatchId,
      })
      res.status(422).json({
        error: 'static_import_validation_failed',
        ...preview,
        sourceDir: scan.sourceDir,
        scanErrors: scan.errors,
      })
      return
    }
    res.status(500).json({ error: 'static_table_commit_failed', message: error instanceof Error ? error.message : String(error) })
  }
})

adminRouter.get('/static-tables/imports', requireAdminPermission('db.read'), async (_req, res) => {
  const imports = await getStaticTableRepository().listImportBatches()
  res.json({ imports })
})

adminRouter.get('/static-tables/imports/:importBatchId', requireAdminPermission('db.read'), async (req, res) => {
  const importBatchId = readOptionalString(req.params.importBatchId)
  if (!importBatchId) {
    res.status(400).json({ error: 'import_batch_id_required' })
    return
  }
  const batch = (await getStaticTableRepository().listImportBatches())
    .find((item) => item.importBatchId === importBatchId)
  if (!batch) {
    res.status(404).json({ error: 'static_import_not_found' })
    return
  }
  res.json({ import: batch })
})

adminRouter.post('/static-tables/imports/:importBatchId/activate', requireAdminRole('admin'), async (req, res) => {
  const importBatchId = readOptionalString(req.params.importBatchId)
  if (!importBatchId) {
    res.status(400).json({ error: 'import_batch_id_required' })
    return
  }
  const batch = (await getStaticTableRepository().listImportBatches())
    .find((item) => item.importBatchId === importBatchId)
  if (!batch) {
    res.status(404).json({ error: 'static_import_not_found' })
    return
  }
  if (batch.status !== 'committed' && batch.status !== 'activated') {
    res.status(409).json({ error: 'static_import_not_committed', status: batch.status })
    return
  }

  const now = Date.now()
  const activated = await getStaticTableRepository().upsertImportBatch({
    ...batch,
    status: 'activated',
    updatedAt: now,
    activatedAt: batch.activatedAt ?? now,
  })
  await writeAudit(req, 'staticTables.activate', 'static-tables', {
    importBatchId,
    version: activated.version,
  })
  res.json({ ok: true, import: activated })
})
