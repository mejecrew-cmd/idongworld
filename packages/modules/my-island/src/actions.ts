/**
 * 📁 my-island/src/actions.ts — 마이섬 표준 API
 */
import { getHooks } from './config.ts'
import { evaluateUnlockCondition } from './unlockEvaluator.ts'
import type { BuildPhaseContext, UserProgressContext, ZonePolicy, ZoneUnlockResult } from './types.ts'

const DEFAULT_BUILD: BuildPhaseContext = { buildPhase: 1, updateId: 'update_v0_1' }
const DEFAULT_USER: UserProgressContext = {
  tutorialComplete: false,
  recruitedCount: 0,
  clearedZones: [],
  unlockedZones: [],
}

export function isZoneUnlocked(policy: ZonePolicy): boolean {
  return evaluateZone(policy).unlocked
}

export function evaluateZone(policy: ZonePolicy): ZoneUnlockResult {
  const build = getHooks().getBuildContext?.() ?? DEFAULT_BUILD
  const user = getHooks().getUserProgress?.() ?? DEFAULT_USER
  return evaluateUnlockCondition(policy, build, user)
}

export function getUnlockedZones(): string[] {
  return getHooks().getUserProgress?.().unlockedZones ?? []
}

export function unlockZone(zoneId: string): void {
  getHooks().doUnlockZone?.(zoneId)
}

export function isTutorialComplete(): boolean {
  return getHooks().getUserProgress?.().tutorialComplete ?? false
}

export function completeTutorial(): void {
  getHooks().doCompleteTutorial?.()
}

export function getZoneClearCount(): number {
  return getHooks().getUserProgress?.().clearedZones.length ?? 0
}

export function incrementZoneClear(zoneId: string): void {
  getHooks().doMarkZoneClear?.(zoneId)
}
