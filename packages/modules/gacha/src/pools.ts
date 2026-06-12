/**
 * 📁 gacha/src/pools.ts — 가챠 풀 정의
 * ───────────────────────────────────────────────
 * 📌 역할: Phase 1 첫 만남 가챠 풀. shared-data/aidong-master/characters.json 마스터에서
 *           gachaPool === 'first-meeting' 엔트리를 추출 — 마스터 변경 시 코드 변경 0.
 *           (PM_결정 Q4·1주차 일정 목 5/14 정합 작업·5/11 사전 완료)
 *
 * 🔗 연결:
 *   - types.ts (GachaPool·GachaEntry)
 *   - pick.ts (이 풀에서 pick)
 *   - shared-data/aidong-master/characters.json (마스터 — PM 편집)
 *   - 사용 측: FirstMeetingScreen·IslandLandingScene (getScenarioId 로 매핑 조회)
 *
 * 💡 1주차 정책:
 *   - weight 미지정 → 기본 1 (균등 1/N)
 *   - Phase 2 본 가챠는 별도 풀 추가 (예: SEASON_1_POOL with 5성 weight 1, 4성 weight 10)
 */
import type { GachaPool } from './types.ts'
import charactersJson from '../../../../shared-data/aidong-master/characters.json'

interface MasterCharacter {
  id: string
  scenarioId: string
  gachaPool: string
}
interface MasterFile {
  characters: MasterCharacter[]
}
const master = charactersJson as MasterFile

/**
 * 첫 만남 가챠 풀 — 마스터에서 gachaPool === 'first-meeting' 엔트리 자동 추출.
 * 캐릭터 한글 ID ↔ 시나리오 영문 ID 의 단일 진실 소스이기도 함.
 */
export const FIRST_GACHA_POOL: GachaPool = {
  id: 'first-meeting',
  name: '첫 만남',
  entries: master.characters
    .filter((c) => c.gachaPool === 'first-meeting')
    .map((c) => ({ characterId: c.id, scenarioId: c.scenarioId })),
}

/** 본진 5명 캐릭터 ID 배열 (첫 가챠 풀 추출 — 다른 곳에서도 활용). */
export const MAIN_AIDONG_IDS: string[] = FIRST_GACHA_POOL.entries.map((e) => e.characterId)

/**
 * 캐릭터 ID → 시나리오 영문 ID 조회.
 * 풀 외 캐릭터면 undefined.
 */
export function getScenarioId(characterId: string): string | undefined {
  return FIRST_GACHA_POOL.entries.find((e) => e.characterId === characterId)?.scenarioId
}
