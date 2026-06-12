/**
 * 📁 my-island/src/unlockEvaluator.ts — zone 해금 2-gate 평가
 * ───────────────────────────────────────────────
 * 📌 역할: zone 정책 + 빌드 컨텍스트 + 사용자 진행 → 해금 여부 결정.
 *
 * 🔗 사용 (Phase 1.5+):
 *   - frontend IslandFullMapScreen 이 zone 별 평가 호출
 *   - 각 zone-* 모듈의 manifest.balance 에서 정책 로드
 *
 * 💡 unlock_condition DSL 평가 (types.ts 참조).
 */
import type { BuildPhaseContext, UserProgressContext, ZonePolicy, ZoneUnlockResult } from './types.ts'

/**
 * 한 zone 의 해금 여부 평가 (Gate A·B 모두 통과해야 unlocked=true).
 */
export function evaluateUnlockCondition(
  policy: ZonePolicy,
  build: BuildPhaseContext,
  user: UserProgressContext,
): ZoneUnlockResult {
  // active flag (PM 토글) 우선
  if (!policy.active) {
    return { zoneId: policy.zoneId, unlocked: false, failedGate: 'inactive', reason: 'zone_active=false' }
  }

  // Gate A — 빌드 phase
  if (build.buildPhase < policy.unlockPhase) {
    return {
      zoneId: policy.zoneId,
      unlocked: false,
      failedGate: 'A',
      reason: `빌드 phase ${build.buildPhase} < required ${policy.unlockPhase}`,
    }
  }
  if (policy.requiredUpdate && policy.requiredUpdate !== build.updateId && !isUpdateLater(build.updateId, policy.requiredUpdate)) {
    return {
      zoneId: policy.zoneId,
      unlocked: false,
      failedGate: 'A',
      reason: `update '${build.updateId}' < required '${policy.requiredUpdate}'`,
    }
  }

  // Gate B — 사용자 진행
  if (!evaluateConditionDsl(policy.unlockCondition, user, build)) {
    return {
      zoneId: policy.zoneId,
      unlocked: false,
      failedGate: 'B',
      reason: `unlock_condition '${policy.unlockCondition}' 미충족`,
    }
  }

  return { zoneId: policy.zoneId, unlocked: true }
}

/**
 * unlock_condition DSL 평가.
 * 지원:
 *   - 'always'
 *   - 'tutorial_complete'
 *   - 'prev_zone_clear:<zoneId>'
 *   - 'recruited_count_ge:<N>'
 *   - 'season:<seasonId>'
 *   - 'update:<updateId>'
 *   - 'and:cond1;cond2'
 *   - 'or:cond1;cond2'
 */
export function evaluateConditionDsl(
  cond: string,
  user: UserProgressContext,
  build: BuildPhaseContext,
): boolean {
  if (!cond || cond === 'always') return true

  // 합성
  if (cond.startsWith('and:')) {
    return cond.slice(4).split(';').every((c) => evaluateConditionDsl(c.trim(), user, build))
  }
  if (cond.startsWith('or:')) {
    return cond.slice(3).split(';').some((c) => evaluateConditionDsl(c.trim(), user, build))
  }

  // 단일 조건
  if (cond === 'tutorial_complete') return user.tutorialComplete

  if (cond.startsWith('prev_zone_clear:')) {
    const zoneId = cond.slice('prev_zone_clear:'.length)
    return user.clearedZones.includes(zoneId)
  }

  if (cond.startsWith('recruited_count_ge:')) {
    const n = Number(cond.slice('recruited_count_ge:'.length))
    return user.recruitedCount >= (Number.isFinite(n) ? n : 0)
  }

  if (cond.startsWith('season:')) {
    const season = cond.slice('season:'.length)
    return build.activeSeason === season
  }

  if (cond.startsWith('update:')) {
    const required = cond.slice('update:'.length)
    return build.updateId === required || isUpdateLater(build.updateId, required)
  }

  // 명시적 unlock 명단
  if (cond.startsWith('explicit:')) {
    const zoneId = cond.slice('explicit:'.length)
    return user.unlockedZones.includes(zoneId)
  }

  // 알 수 없는 DSL — 안전하게 false (unlock 보수적)
  // eslint-disable-next-line no-console
  console.warn(`[my-island] 미지원 unlock_condition: '${cond}' — false 반환`)
  return false
}

/** update ID 비교 — 'v0_1' vs 'v0_2' 등 단순 lexical (Phase 2 정교화). */
function isUpdateLater(current: string, required: string): boolean {
  return current >= required
}
