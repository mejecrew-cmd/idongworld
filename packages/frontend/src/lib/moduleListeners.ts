/**
 * 📁 lib/moduleListeners.ts — 모듈 간 자동 연결 (bus listener 실 사용)
 * ───────────────────────────────────────────────
 * 📌 역할: 모듈 A의 이벤트를 듣고 모듈 B의 action 자동 호출.
 *           각 모듈은 자기 일만 → 화면 코드 없이 도메인 룰 정착.
 *
 * 🔗 연결:
 *   - @idongworld/core/bus (on)
 *   - 각 모듈 actions (codex·my-aidong 등)
 *   - main.tsx → bootstrapModuleListeners() 1회 (busBridge 직후)
 *
 * 💡 정착 규칙 (Phase 1.5+):
 *   - 'aidong:recruited' → codex.unlockCodexSlot          (영입 = 도감 placeholder)
 *   - 'aidong:care-applied' (첫 케어) → codex.fullyRegisterCodex (첫 케어 = 도감 본 등재)
 *
 * 💡 정책:
 *   - 본 파일은 frontend 측 wiring — 모듈 자체는 자기 도메인만.
 *   - 이벤트 연결 추가 시 본 파일에 listener 추가.
 *   - 무한 루프 방지: emit 한 모듈이 다시 자기 이벤트 listen 하지 않도록 주의.
 */
import { bus } from '@idongworld/core'
import * as codex from '@idongworld/codex'

/** 첫 케어 트래킹용 — 캐릭터별 1회만 codex.fullyRegisterCodex 호출. */
const _firstCareFired = new Set<string>()

/** 테스트·HMR 용 초기화. 운영 코드에서 호출 X. */
export function _resetForTest(): void {
  _firstCareFired.clear()
}

export function bootstrapModuleListeners(): void {
  // 영입 → 도감 placeholder 등재 (자동)
  bus.on('aidong:recruited', ({ characterId }) => {
    if (!codex.isCodexUnlocked(characterId)) {
      codex.unlockCodexSlot(characterId)
    }
  })

  // 첫 케어 → 도감 본 등재 (1회만)
  bus.on('aidong:care-applied', ({ characterId }) => {
    if (_firstCareFired.has(characterId)) return
    if (codex.isFullyRegistered(characterId)) {
      _firstCareFired.add(characterId)
      return
    }
    _firstCareFired.add(characterId)
    codex.fullyRegisterCodex(characterId)
  })
}
