/**
 * my-aidong/src/index.ts
 * ------------------------------------------------------------
 * 역할: @idongworld/my-aidong 모듈의 공개 API 표면을 모아 export한다.
 * 연결: 다른 모듈과 frontend bootstrap은 이 파일을 통해 actions/config/balance helper에 접근한다.
 * 주의: 내부 구현 파일을 직접 import하지 않도록, 외부에 필요한 항목은 여기에서 명시적으로 열어둔다.
 */
export type * from './types.ts'
export {
  getAidongs,
  isRecruited,
  recruit,
  getAffinity,
  addAffinity,
  getNeeds,
  tickSequenceDecay,
  applyCareAction,
} from './actions.ts'
export { configure, getHooks } from './config.ts'
export type { MyAidongHooks } from './config.ts'

export { balance, getBalance } from './balance.ts'

import { getBalance as _getBalance } from './balance.ts'

/** balance.csv 기반: 같은 종류 케어 액션의 cooldown(ms). */
export function getCareCooldownMs(): number {
  return _getBalance('care_cooldown_ms', 300_000)
}

/** balance.csv 기반: 하루에 같은 종류 케어를 적용할 수 있는 최대 횟수. */
export function getCareDailyCap(): number {
  return _getBalance('care_daily_cap', 3)
}

/** balance.csv 기반: 시퀀스 진입마다 감소하는 욕구량. */
export function getNeedDecayPerSequence(): number {
  return _getBalance('need_decay_per_sequence', 1)
}

/** balance.csv 기반: 친밀도 level N에 필요한 threshold score. */
export function getAffinityLevelThreshold(level: number): number {
  return _getBalance(`affinity_lvl_${level}_threshold`, 0)
}


