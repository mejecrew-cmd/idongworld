/**
 * 📁 route-neighbor/src/landing.ts — 칸 도착 처리
 * ───────────────────────────────────────────────
 * 📌 역할: 슬롯 도착 시 자원 적립·시나리오 진입 결정.
 *           host actions 위임 (자원) + 시나리오 ID 반환 (화면이 vn-runner 호출).
 *
 * 🔗 사용 (Phase 2 정착): NavigationBoardScene 의 onLand 핸들러가 본 함수 호출.
 */
import * as host from '@idongworld/host'
import type { BoardSlot, LandingResult } from './types.ts'

/**
 * 칸 도착 처리.
 * 자원 칸은 host inventory 적립·보물은 코인/보석 적립.
 * 캐릭터 칸은 시나리오 ID 반환 (화면이 navigate).
 * 폭풍은 dice 차감.
 */
export function processLanding(slot: BoardSlot): LandingResult {
  const result: LandingResult = { type: slot.type, rewards: [] }

  switch (slot.type) {
    case 'resource': {
      const resource = slot.meta?.resource as string | undefined
      const amount = Number(slot.meta?.amount ?? 0)
      if (!resource || amount <= 0) break
      // host MaterialId 카탈로그 외 자원(acorn 등)은 향후 host 확장. 1주차는 통과 처리.
      if (resource === 'flower') {
        host.addMaterial('flower', amount)
      }
      // acorn 은 host MaterialId 미정의 — 모듈 로컬 store (Phase 2)
      result.rewards = [{ resource, amount }]
      break
    }
    case 'treasure': {
      const resource = slot.meta?.resource as string | undefined
      const amount = Number(slot.meta?.amount ?? 0)
      if (!resource || amount <= 0) break
      if (resource === 'coins') host.rewardCoins(amount)
      else if (resource === 'gems') host.rewardGems(amount)
      result.rewards = [{ resource, amount }]
      break
    }
    case 'storm': {
      const penalty = Number(slot.meta?.dicePenalty ?? 1)
      // dice 차감 — host.rewardDice 의 음수 호출 (mutateDice 가 부족 시 false)
      host.rewardDice(-penalty)
      result.rewards = [{ resource: 'diceCount', amount: -penalty }]
      break
    }
    case 'character': {
      // 캐릭터 칸 — 화면이 /voyage/island/{characterId}/landing 으로 navigate
      const charId = slot.meta?.characterId as string | undefined
      if (charId) {
        result.scenarioId = `recruit_${charId}` // gacha.getScenarioId 매핑은 화면이 처리
      }
      break
    }
    case 'cutscene': {
      const callSiteId = slot.meta?.callSiteId as string | undefined
      if (callSiteId) result.callSiteId = callSiteId
      break
    }
    case 'start':
    case 'empty':
    default:
      break
  }

  return result
}
