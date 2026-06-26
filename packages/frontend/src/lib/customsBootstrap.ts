/**
 * 📁 lib/customsBootstrap.ts — customs 세관 DI 부트스트랩 + 모듈별 룰 등록
 * ───────────────────────────────────────────────
 * 📌 역할: customs 모듈에 onDebit/onCredit/confirmUI 훅 주입 + 모듈 customs.csv 룰 일괄 등록.
 *           훅은 host actions·confirm() 다이얼로그 사용.
 *
 * 🔗 연결: main.tsx → bootstrapCustoms() 1회
 *
 * 💡 룰 등록:
 *   - Phase 1.5: 인라인 등록 (CSV 파일 raw import 활성 전 임시).
 *   - Phase 2: 모듈 매니페스트에서 자동 수집 + raw 로더로 CSV 직접 import.
 *
 * 💡 등록 모듈:
 *   - zone-garden  (acorn·flower → coins·diamonds·deck-cargo)
 *   - route-neighbor (deck-cargo → coins·diamonds)
 *   - zone-oasis·memory·mine (Phase 1.5 PM 검수 후 추가 — 더미 SCSV 보유)
 */
import { configure, registerRule } from '@idongworld/customs'
import * as host from '@idongworld/host'
import type { MaterialId } from '@idongworld/host'
import { confirmCustoms } from './customsModal'
import { api } from './api'
import { accountStoreFacade } from './storeFacades'

const MODULE_ACTION_API_SYNC = import.meta.env.VITE_MODULE_ACTION_API_SYNC === 'true'

/** route-neighbor 룰 (customs.csv 와 동일 — Phase 1.5 인라인). */
const ROUTE_NEIGHBOR_RULES = [
  {
    ruleId: 'deck-to-coins',
    fromModule: 'route-neighbor',
    fromResource: 'deck-cargo',
    toScope: 'global' as const,
    toResource: 'coins',
    ratio: 2,
    label: '갑판 → 코인',
    minAmount: 1,
    maxAmount: 500,
    description: '갑판 자원 1 = 코인 2 (귀항 환전)',
  },
  {
    ruleId: 'deck-to-diamonds',
    fromModule: 'route-neighbor',
    fromResource: 'deck-cargo',
    toScope: 'global' as const,
    toResource: 'diamonds',
    ratio: 5,
    label: '갑판 → 다이아',
    minAmount: 1,
    maxAmount: 200,
    description: '갑판 자원 5 = 다이아 1 (드물게)',
  },
]

/** zone-garden 룰 (customs.csv 와 동일 — Phase 1.5 인라인). */
const ZONE_GARDEN_RULES = [
  {
    ruleId: 'garden-acorn-to-coins',
    fromModule: 'zone-garden',
    fromResource: 'acorn',
    toScope: 'global' as const,
    toResource: 'coins',
    ratio: 5,
    label: '도토리 → 코인',
    minAmount: 5,
    maxAmount: 500,
    description: '5 도토리를 1 코인으로 환전',
  },
  {
    ruleId: 'garden-flower-to-diamonds',
    fromModule: 'zone-garden',
    fromResource: 'flower',
    toScope: 'global' as const,
    toResource: 'diamonds',
    ratio: 3,
    label: '꽃 → 다이아',
    minAmount: 3,
    maxAmount: 300,
    description: '3 꽃을 1 다이아로 환전',
  },
  {
    ruleId: 'garden-acorn-to-deck',
    fromModule: 'zone-garden',
    fromResource: 'acorn',
    toScope: 'module' as const,
    toModule: 'route-neighbor',
    toResource: 'deck-cargo',
    ratio: 10,
    label: '도토리 → 갑판 적재',
    minAmount: 10,
    maxAmount: 1000,
    description: '10 도토리를 1 갑판 자원으로 적재',
  },
]

/** 모듈 자원이 host inventory MaterialId 와 매칭되는지 매핑. */
const RESOURCE_TO_MATERIAL: Record<string, MaterialId> = {
  flower: 'flower',
  // acorn 등 신규 자재는 host MaterialId 확장 필요 (Phase 2)
}

export function bootstrapCustoms(): void {
  configure({
    onDebit: ({ resource, amount }) => {
      const matId = RESOURCE_TO_MATERIAL[resource]
      if (matId) {
        return host.consumeMaterial(matId, amount)
      }
      // 모듈 로컬 자원은 Phase 2 모듈별 store 도입 후 처리
      // 1주차 시점: warn + true (보유 검증 X — 데모용)
      // eslint-disable-next-line no-console
      console.warn(`[customs] onDebit: 모듈 로컬 자원 '${resource}' 검증 미구현 — 통과 처리`)
      return true
    },

    onCredit: ({ scope, resource, amount }) => {
      if (scope === 'global') {
        if (resource === 'coins') host.rewardCoins(amount)
        else if (resource === 'diamonds') host.rewardDiamonds(amount)
        else {
          // eslint-disable-next-line no-console
          console.warn(`[customs] onCredit: 미지정 글로벌 자원 '${resource}'`)
        }
      } else {
        // module scope — 향후 모듈별 store 직접 갱신
        // eslint-disable-next-line no-console
        console.info(`[customs] onCredit module: ${resource} +${amount} (모듈 store 미구현)`)
      }
    },

    // PM #5 (5/11) 정착: window.confirm → MUI Dialog (CustomsConfirmModal)
    confirmUI: async (sim) => confirmCustoms(sim),

    applyBackend: MODULE_ACTION_API_SYNC
      ? async (_decl, sim) => {
          const uid = accountStoreFacade.getFirebaseUid()
          if (!uid) return false
          try {
            await api.applyCustoms(uid, {
              ruleId: sim.rule.ruleId,
              multiplier: sim.toAmount,
              idempotencyKey: `${sim.rule.ruleId}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
            })
            return true
          } catch (error) {
            console.warn('[customs] backend apply failed', error)
            return false
          }
        }
      : undefined,

    onLog: (event, rule, detail) => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info(`[customs:${event}]`, rule.ruleId, detail ?? '')
      }
    },
  })

  // 모듈별 룰 일괄 등록
  for (const rule of [...ZONE_GARDEN_RULES, ...ROUTE_NEIGHBOR_RULES]) {
    registerRule(rule)
  }
}
