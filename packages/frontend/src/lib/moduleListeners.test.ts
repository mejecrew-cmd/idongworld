/**
 * 📁 frontend/src/lib/moduleListeners.test.ts — 모듈 간 자동 연결 테스트
 * ───────────────────────────────────────────────
 * 📌 검증: bus emit → codex action 자동 호출 (영입·첫 케어).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { bus } from '@idongworld/core'
import * as codex from '@idongworld/codex'
import { _resetForTest as resetBus } from '../../../core/src/bus.ts'
import { _resetForTest as resetCodex } from '../../../modules/codex/src/config.ts'
import { bootstrapModuleListeners, _resetForTest as resetListeners } from './moduleListeners.ts'

beforeEach(() => {
  resetBus()
  resetCodex()
  resetListeners()
})

describe('aidong:recruited → codex.unlockCodexSlot', () => {
  it('영입 emit → codex slot 자동 등재', () => {
    const doUnlockCodexSlot = vi.fn()
    const codexState: { entries: string[]; fully: string[] } = { entries: [], fully: [] }
    codex.configure({
      getCodexEntriesList: () => codexState.entries,
      getFullyRegisteredList: () => codexState.fully,
      doUnlockCodexSlot: (id) => { codexState.entries.push(id); doUnlockCodexSlot(id) },
      doFullyRegisterCodex: () => {},
      doUnlockDiary: () => {},
    })
    bootstrapModuleListeners()

    bus.emit('aidong:recruited', { characterId: '황금멍' })
    expect(doUnlockCodexSlot).toHaveBeenCalledWith('황금멍')
    expect(codexState.entries).toContain('황금멍')
  })

  it('이미 unlocked → 중복 호출 X', () => {
    const doUnlockCodexSlot = vi.fn()
    codex.configure({
      getCodexEntriesList: () => ['황금멍'],   // 이미 등재됨
      getFullyRegisteredList: () => [],
      doUnlockCodexSlot,
      doFullyRegisterCodex: () => {},
      doUnlockDiary: () => {},
    })
    bootstrapModuleListeners()

    bus.emit('aidong:recruited', { characterId: '황금멍' })
    expect(doUnlockCodexSlot).not.toHaveBeenCalled()
  })
})

describe('aidong:care-applied (첫 1회) → codex.fullyRegisterCodex', () => {
  it('첫 케어 1회 → 본 등재', () => {
    const doFullyRegisterCodex = vi.fn()
    codex.configure({
      getCodexEntriesList: () => [],
      getFullyRegisteredList: () => [],
      doUnlockCodexSlot: () => {},
      doFullyRegisterCodex,
      doUnlockDiary: () => {},
    })
    bootstrapModuleListeners()

    bus.emit('aidong:care-applied', { characterId: '황금멍', actionId: 'feed' })
    expect(doFullyRegisterCodex).toHaveBeenCalledWith('황금멍')
  })

  it('동일 캐릭터 두번째 케어 — 호출 X (1회만)', () => {
    const doFullyRegisterCodex = vi.fn()
    codex.configure({
      getCodexEntriesList: () => [],
      getFullyRegisteredList: () => [],
      doUnlockCodexSlot: () => {},
      doFullyRegisterCodex,
      doUnlockDiary: () => {},
    })
    bootstrapModuleListeners()

    bus.emit('aidong:care-applied', { characterId: '황금멍', actionId: 'feed' })
    bus.emit('aidong:care-applied', { characterId: '황금멍', actionId: 'play' })
    expect(doFullyRegisterCodex).toHaveBeenCalledTimes(1)
  })

  it('서로 다른 캐릭터 — 각각 1회', () => {
    const doFullyRegisterCodex = vi.fn()
    codex.configure({
      getCodexEntriesList: () => [],
      getFullyRegisteredList: () => [],
      doUnlockCodexSlot: () => {},
      doFullyRegisterCodex,
      doUnlockDiary: () => {},
    })
    bootstrapModuleListeners()

    bus.emit('aidong:care-applied', { characterId: '황금멍', actionId: 'feed' })
    bus.emit('aidong:care-applied', { characterId: '춤냥', actionId: 'feed' })
    expect(doFullyRegisterCodex).toHaveBeenCalledTimes(2)
    expect(doFullyRegisterCodex).toHaveBeenCalledWith('황금멍')
    expect(doFullyRegisterCodex).toHaveBeenCalledWith('춤냥')
  })

  it('이미 fullyRegistered — 호출 X (이후 emit 들도 무시)', () => {
    const doFullyRegisterCodex = vi.fn()
    codex.configure({
      getCodexEntriesList: () => [],
      getFullyRegisteredList: () => ['황금멍'],   // 이미 본 등재
      doUnlockCodexSlot: () => {},
      doFullyRegisterCodex,
      doUnlockDiary: () => {},
    })
    bootstrapModuleListeners()

    bus.emit('aidong:care-applied', { characterId: '황금멍', actionId: 'feed' })
    bus.emit('aidong:care-applied', { characterId: '황금멍', actionId: 'play' })
    expect(doFullyRegisterCodex).not.toHaveBeenCalled()
  })
})
