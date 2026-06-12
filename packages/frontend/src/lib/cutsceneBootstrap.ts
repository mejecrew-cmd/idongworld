/**
 * 📁 lib/cutsceneBootstrap.ts — cutscene-runner DI + 시범 등록
 * ───────────────────────────────────────────────
 * 📌 역할: cutscene-runner 에 isWatched/markWatched 훅 (localStorage 백업) 주입
 *           + 시범 callSiteId 매핑 등록.
 *
 * 🔗 연결: main.tsx → bootstrapCutsceneRunner() 1회
 *
 * 💡 등록 시범:
 *   - 'demo:after-recruit' → settle_X 시나리오 (실 사용은 FirstMeetingScreen 의 stage 'settle' 단계)
 *   - 'island-first-visit' → 환영 컷 (시나리오 미작성 — Phase 2)
 *   현재는 패턴 확립 + 추후 화면 wiring 시 활용.
 */
import { configure, register } from '@idongworld/cutscene-runner'

const WATCHED_KEY = 'idongworld-cutscenes-watched'

function readWatched(): Set<string> {
  try {
    const raw = localStorage.getItem(WATCHED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function writeWatched(set: Set<string>): void {
  try {
    localStorage.setItem(WATCHED_KEY, JSON.stringify(Array.from(set)))
  } catch {
    // 사용자 환경 예외는 무시 (로컬 사파리 private 모드 등)
  }
}

export function bootstrapCutsceneRunner(): void {
  configure({
    isWatched: (key) => readWatched().has(key),
    markWatched: (key) => {
      const set = readWatched()
      set.add(key)
      writeWatched(set)
    },
    // shouldFire 미지정 — 추가 게이트 없음 (모달 활성 등은 Phase 2 추가)
  })

  // ─── 시범 callSiteId 등록 (실 화면 wiring 은 Phase 2) ───

  // demo: 영입 종료 후 정착 컷 자동 발화 (현재 FirstMeetingScreen 의 stage 'settle' 와 동등)
  // 캐릭터별 분기는 priority + condition 으로 향후 분기 가능
  register({
    callSiteId: 'demo:after-recruit:황금멍',
    scenarioId: 'settle_hwanggumeong',
    description: '시범 — 황금멍 영입 후 정착 컷 (실 사용은 FirstMeetingScreen 자체 stage)',
    priority: 0,
    oncePerUser: false,
  })
}
