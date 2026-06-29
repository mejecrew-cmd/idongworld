/**
 * packages/backend/src/routes/account.ts
 * ------------------------------------------------------------
 * 역할: account/session 관련 API를 처리한다.
 * 연결: auth/account 성격의 상태를 user/global gameplay state와 분리한다.
 * 주의: uid는 request payload가 아니라 auth middleware 결과를 기준으로 판단한다.
 */
import { Router } from 'express'
import { getRequestUid } from '../middleware/auth.js'
import {
  getCurrencyRepository,
  getDedicatedModuleRepositories,
  getDiceResourceRepository,
  getHostStateRepository,
  getMydongCosmeticRepository,
  getMydongPediaInventoryRepository,
  getMydongRepository,
  getSooksoRepository,
  getUserInventoryRepository,
  getUserRepository,
  getUserSettingsRepository,
} from '../repositories/index.js'
import { userSettingsPatchFromUserPatch } from '../repositories/userSettingsRepository.js'
import { getAidongCodexItemMap, getAidongCosmeticLoadoutMaps } from '../modules/my-aidong/service.js'

export const accountRouter = Router()

const ACCOUNT_FIELDS = [
  'isGuest',
  'nickname',
  'gameStartedAt',
  'openingSeen',
  'sooksoClean',
  'onboardingComplete',
  'hostName',
  'sooksoName',
  'soundSettings',
] as const

function normalizeTimestamp(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : undefined
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

function projectSoundSettings(settings: { bgmVolume: number; sfxVolume: number }) {
  return {
    bgmVolume: settings.bgmVolume,
    sfxVolume: settings.sfxVolume,
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

async function buildAccountState(uid: string) {
  const user = await getUserRepository().getUser(uid)
  if (!user) return undefined

  const [userSettings, sookso, host] = await Promise.all([
    getUserSettingsRepository().getOrCreate(uid, user),
    getSooksoRepository().getOrCreateSookso(uid, {
      sooksoClean: Boolean(user.sooksoClean),
      sooksoName: user.sooksoName,
    }),
    getHostStateRepository().getOrCreate(uid, {
      hostName: user.hostName,
      coins: user.coins,
      diamonds: user.diamonds,
      diceCount: user.diceCount,
      inventory: user.inventory,
    }),
  ])
  const soundSettings = projectSoundSettings(userSettings)

  return {
    uid: user.uid,
    isGuest: user.isGuest,
    nickname: user.nickname,
    gameStartedAt: user.gameStartedAt,
    openingSeen: user.openingSeen,
    sooksoClean: Boolean(sookso.sooksoClean),
    onboardingComplete: user.onboardingComplete,
    hostName: host.hostName ?? user.hostName,
    sooksoName: sookso.sooksoName,
    soundSettings,
    userSettings,
    sookso,
  }
}

async function buildAccountBootstrap(uid: string) {
  const account = await buildAccountState(uid)
  if (!account) return undefined

  const host = await getHostStateRepository().getOrCreate(uid)
  const moduleRepos = getDedicatedModuleRepositories()
  const [
    currencies,
    diceResource,
    inventory,
    mydongs,
    myAidong,
    myIsland,
    codex,
    ship,
    pediaInventory,
    cosmeticInventory,
    cosmeticLoadouts,
    personaPartStates,
  ] = await Promise.all([
    getCurrencyRepository().getBalances(uid, {
      coin: host.coins,
      diamond: host.diamonds,
    }),
    getDiceResourceRepository().getOrCreate(uid, {
      diceQuantity: host.diceCount,
    }),
    getUserInventoryRepository().getInventoryMap(uid, host.inventory),
    getMydongRepository().list(uid),
    moduleRepos['my-aidong'].getOrCreate(uid),
    moduleRepos['my-island'].getOrCreate(uid),
    moduleRepos.codex.getOrCreate(uid),
    moduleRepos.ship.getOrCreate(uid),
    getMydongPediaInventoryRepository().list(uid),
    getMydongCosmeticRepository().listInventory(uid),
    getMydongCosmeticRepository().listLoadouts(uid),
    getMydongCosmeticRepository().listPersonaPartStates(uid),
  ])

  const myAidongRecord = asRecord(myAidong)
  const aidongCodexItems = await getAidongCodexItemMap(uid, myAidongRecord)
  const cosmeticMaps = await getAidongCosmeticLoadoutMaps(uid, myAidongRecord)
  const myAidongState = {
    ...myAidongRecord,
    recruitedAidongs: mydongs.map((mydong) => mydong.aidongId),
    aidongCodexItems,
    equippedOutfit: cosmeticMaps.equippedOutfit,
    equippedItems: cosmeticMaps.equippedItems,
  }
  const hostState = {
    ...asRecord(host),
    coins: currencies.coin,
    diamonds: currencies.diamond,
    diceCount: diceResource.diceQuantity,
    inventory,
  }
  const state = {
    ...account,
    ...hostState,
    ...myAidongState,
    ...asRecord(myIsland),
    ...asRecord(codex),
    ...asRecord(ship),
  }

  return {
    state,
    snapshot: {
      account,
      host: hostState,
      userSettings: account.userSettings,
      currencies,
      diceResource,
      inventory,
      sookso: account.sookso,
      mydongs,
      myAidong: myAidongState,
      myIsland,
      codex,
      ship,
      pediaInventory,
      cosmeticInventory,
      cosmeticLoadouts,
      personaPartStates,
    },
  }
}

function pickAccountPatch(source: Record<string, unknown>) {
  const patch: Record<string, unknown> = {}
  for (const field of ACCOUNT_FIELDS) {
    if (field in source) patch[field] = source[field]
  }
  if ('gameStartedAt' in patch) {
    const gameStartedAt = normalizeTimestamp(patch.gameStartedAt)
    if (gameStartedAt === undefined) delete patch.gameStartedAt
    else patch.gameStartedAt = gameStartedAt
  }
  if ('soundSettings' in patch) {
    const soundSettings = normalizeSoundSettings(patch.soundSettings)
    if (soundSettings === undefined) delete patch.soundSettings
    else patch.soundSettings = soundSettings
  }
  return patch
}

accountRouter.get('/state', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const state = await buildAccountState(uid)
  if (!state) return res.status(404).json({ error: 'not_found' })

  res.json({
    state,
  })
})

accountRouter.get('/bootstrap', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const bootstrap = await buildAccountBootstrap(uid)
  if (!bootstrap) return res.status(404).json({ error: 'not_found' })

  res.json({
    ok: true,
    ...bootstrap,
  })
})

accountRouter.patch('/state', async (req, res) => {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })

  const patch = req.body?.patch
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return res.status(400).json({ error: 'invalid_patch' })
  }

  const accountPatch = pickAccountPatch(patch)
  const updated = await getUserRepository().updateUser(uid, accountPatch)
  if (!updated) return res.status(404).json({ error: 'not_found' })
  const sooksoPatch: { sooksoClean?: boolean; sooksoName?: string } = {}
  if ('sooksoClean' in accountPatch) sooksoPatch.sooksoClean = Boolean(accountPatch.sooksoClean)
  if ('sooksoName' in accountPatch) {
    sooksoPatch.sooksoName = typeof accountPatch.sooksoName === 'string'
      ? accountPatch.sooksoName
      : undefined
  }
  const sookso = Object.keys(sooksoPatch).length
    ? await getSooksoRepository().patchSookso(uid, sooksoPatch)
    : await getSooksoRepository().getOrCreateSookso(uid, {
      sooksoClean: Boolean(updated.sooksoClean),
      sooksoName: updated.sooksoName,
    })
  const settingsPatch = userSettingsPatchFromUserPatch(accountPatch)
  const userSettings = Object.keys(settingsPatch).length
    ? await getUserSettingsRepository().patch(uid, settingsPatch)
    : await getUserSettingsRepository().getOrCreate(uid, updated)
  const soundSettings = projectSoundSettings(userSettings)

  res.json({
    state: {
      uid: updated.uid,
      isGuest: updated.isGuest,
      nickname: updated.nickname,
      gameStartedAt: updated.gameStartedAt,
      openingSeen: updated.openingSeen,
      sooksoClean: Boolean(sookso.sooksoClean),
      onboardingComplete: updated.onboardingComplete,
      hostName: updated.hostName,
      sooksoName: sookso.sooksoName,
      soundSettings,
      userSettings,
      sookso,
    },
  })
})






