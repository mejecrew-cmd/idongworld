/**
 * packages/backend/src/modules/codex/service.ts
 * ------------------------------------------------------------
 * 역할: codex 모듈의 diary/codex 등록 action과 상태 전이를 담당한다.
 * 연결: frontend의 도감·일기 해금 흐름을 backend 권위 API로 옮긴다.
 * 주의: codex document만 직접 수정하고, Aidong 영입 여부 같은 잠금 조건은 my-aidong document를 읽어 검증한다.
 */
import { requireModuleRepo, ServiceError, type LooseState } from '../shared.js'

const AIDONG_IDS = ['황금멍', '춤냥', '양털곰', '단풍볼', '날카여우'] as const

const DIARY_TO_AIDONG: Record<string, string> = {
  hwanggumeong_day1: '황금멍',
  chumnyang_day1: '춤냥',
  yangteolgom_day1: '양털곰',
  danpungbol_day1: '단풍볼',
  nalkayeou_day1: '날카여우',
}

const AIDONG_ID_SET = new Set<string>(AIDONG_IDS)

function getStringList(state: LooseState, key: string): string[] {
  const value = state[key]
  return Array.isArray(value) ? value as string[] : []
}

function addUnique(items: string[], id: string): string[] {
  return items.includes(id) ? items : [...items, id]
}

function assertValidEntryId(entryId: string): void {
  if (!AIDONG_ID_SET.has(entryId)) {
    throw new ServiceError('unknown_codex_entry', 400)
  }
}

function getDiaryOwner(diaryId: string): string {
  const owner = DIARY_TO_AIDONG[diaryId]
  if (!owner) throw new ServiceError('unknown_diary_id', 400)
  return owner
}

async function getRecruitedAidongs(uid: string): Promise<string[]> {
  const state = await requireModuleRepo('my-aidong').getOrCreate(uid) as LooseState
  return getStringList(state, 'recruitedAidongs')
}

async function assertAidongRecruited(uid: string, characterId: string): Promise<void> {
  const recruitedAidongs = await getRecruitedAidongs(uid)
  if (!recruitedAidongs.includes(characterId)) {
    throw new ServiceError('aidong_not_recruited', 409)
  }
}

export async function unlockDiary(uid: string, diaryId: string) {
  const owner = getDiaryOwner(diaryId)
  await assertAidongRecruited(uid, owner)

  const repo = requireModuleRepo('codex')
  const state = await repo.getOrCreate(uid) as LooseState
  const unlockedDiaries = getStringList(state, 'unlockedDiaries')

  if (unlockedDiaries.includes(diaryId)) {
    return state
  }

  return await repo.patch(uid, {
    unlockedDiaries: addUnique(unlockedDiaries, diaryId),
  })
}

export async function unlockCodexSlot(uid: string, entryId: string) {
  assertValidEntryId(entryId)
  await assertAidongRecruited(uid, entryId)

  const repo = requireModuleRepo('codex')
  const state = await repo.getOrCreate(uid) as LooseState
  const unlockedCodexEntries = getStringList(state, 'unlockedCodexEntries')

  if (unlockedCodexEntries.includes(entryId)) {
    return state
  }

  return await repo.patch(uid, {
    unlockedCodexEntries: addUnique(unlockedCodexEntries, entryId),
  })
}

export async function fullyRegisterCodex(uid: string, entryId: string) {
  assertValidEntryId(entryId)
  await assertAidongRecruited(uid, entryId)

  const repo = requireModuleRepo('codex')
  const state = await repo.getOrCreate(uid) as LooseState
  const unlockedCodexEntries = getStringList(state, 'unlockedCodexEntries')
  const codexFullyRegistered = getStringList(state, 'codexFullyRegistered')

  if (!unlockedCodexEntries.includes(entryId)) {
    throw new ServiceError('codex_slot_locked', 409)
  }

  if (codexFullyRegistered.includes(entryId) && unlockedCodexEntries.includes(entryId)) {
    return state
  }

  return await repo.patch(uid, {
    codexFullyRegistered: addUnique(codexFullyRegistered, entryId),
  })
}
