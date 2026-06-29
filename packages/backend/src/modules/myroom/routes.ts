/**
 * packages/backend/src/modules/myroom/routes.ts
 * ------------------------------------------------------------
 * 역할: 마이룸 화면에서 필요한 유저/아이동/도감/콜렉션/장부 요약을 읽기 전용으로 조합한다.
 * 연결: account, host, my-aidong, codex, lodge module state를 aggregation해서 frontend shell에 제공한다.
 * 주의: M2~M3 단계에서는 myRoomStates 전용 collection을 만들지 않고, 표시 옵션이 생길 때 후보로 분리한다.
 */
import { Router } from 'express'
import { getRequestUid } from '../../middleware/auth.js'
import { getHostStateRepository, getUserRepository } from '../../repositories/index.js'
import { requireModuleRepo } from '../shared.js'
import { buildAidongCodexProgress, listAidongCodexCatalogItems } from '../my-aidong/codexCatalog.js'
import { getAidongCodexItemMap, getAidongCosmeticLoadoutMaps, listOwnedMydongs } from '../my-aidong/service.js'

export const myRoomRouter = Router()

type MyRoomSection = 'summary' | 'aidongs' | 'codex' | 'collection' | 'ledger'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

export async function buildMyRoomSummary(uid: string) {
  const [user, host, myAidong, codex, lodge, mydongs] = await Promise.all([
    getUserRepository().getUser(uid),
    getHostStateRepository().getOrCreate(uid),
    requireModuleRepo('my-aidong').getOrCreate(uid),
    requireModuleRepo('codex').getOrCreate(uid),
    requireModuleRepo('lodge').getOrCreate(uid),
    listOwnedMydongs(uid),
  ])

  const myAidongState = asRecord(myAidong)
  const codexState = asRecord(codex)
  const lodgeState = asRecord(lodge)
  const recruitedAidongs = mydongs.map((mydong) => mydong.aidongId)
  const aidongCodexItems = await getAidongCodexItemMap(uid, myAidongState)
  const cosmeticLoadouts = await getAidongCosmeticLoadoutMaps(uid, myAidongState)
  const aidongCodexProgress = Object.fromEntries(
    recruitedAidongs.map((characterId) => [
      characterId,
      buildAidongCodexProgress(characterId, aidongCodexItems[characterId] ?? {}),
    ]),
  )
  const aidongCodexCatalog = listAidongCodexCatalogItems()
  const ownedAidongCodexItems = aidongCodexCatalog
    .map((item) => ({
      ...item,
      quantity: aidongCodexItems[item.characterId]?.[item.itemId] ?? 0,
    }))
    .filter((item) => item.quantity > 0)

  return {
    account: {
      uid,
      nickname: user?.nickname,
      hostName: user?.hostName,
      isGuest: user?.isGuest ?? true,
      onboardingComplete: user?.onboardingComplete ?? false,
    },
    host: {
      coins: host.coins,
      diamonds: host.diamonds,
      diceCount: host.diceCount,
      inventory: host.inventory,
    },
    aidongs: {
      recruitedAidongs,
      affinities: asRecord(myAidongState.affinities),
      needs: asRecord(myAidongState.needs),
      equippedOutfit: cosmeticLoadouts.equippedOutfit,
      equippedItems: cosmeticLoadouts.equippedItems,
      aidongCodexItems,
      aidongUpgradeState: asRecord(myAidongState.aidongUpgradeState),
    },
    codex: {
      unlockedDiaries: Array.isArray(codexState.unlockedDiaries) ? codexState.unlockedDiaries : [],
      unlockedCodexEntries: Array.isArray(codexState.unlockedCodexEntries) ? codexState.unlockedCodexEntries : [],
      codexFullyRegistered: Array.isArray(codexState.codexFullyRegistered) ? codexState.codexFullyRegistered : [],
      aidongCodexCatalog,
      aidongCodexProgress,
      aidongCodexItems,
    },
    collection: {
      inventory: host.inventory,
      lodgeInventory: asRecord(lodgeState.lodgeInventory),
      lodgeFurniture: asRecord(lodgeState.furniture),
      lodgeRooms: asRecord(lodgeState.rooms),
      aidongCodexItems: ownedAidongCodexItems,
      photocardPlaceholders: [],
    },
    ledger: {
      source: 'aggregation-shell',
      generatedAt: Date.now(),
      note: 'Phase M2에서는 전용 장부 collection 없이 기존 state를 읽어 요약한다.',
    },
  }
}

function pickSection(summary: Awaited<ReturnType<typeof buildMyRoomSummary>>, section: MyRoomSection) {
  if (section === 'summary') return summary
  return { [section]: summary[section] }
}

async function handleSection(req: Parameters<Parameters<typeof myRoomRouter.get>[1]>[0], res: Parameters<Parameters<typeof myRoomRouter.get>[1]>[1], section: MyRoomSection) {
  const uid = getRequestUid(req)
  if (!uid) return res.status(401).json({ error: 'no_uid' })
  const summary = await buildMyRoomSummary(uid)
  res.json({ ok: true, ...pickSection(summary, section) })
}

myRoomRouter.get('/summary', async (req, res) => handleSection(req, res, 'summary'))
myRoomRouter.get('/aidongs', async (req, res) => handleSection(req, res, 'aidongs'))
myRoomRouter.get('/codex', async (req, res) => handleSection(req, res, 'codex'))
myRoomRouter.get('/collection', async (req, res) => handleSection(req, res, 'collection'))
myRoomRouter.get('/ledger', async (req, res) => handleSection(req, res, 'ledger'))
