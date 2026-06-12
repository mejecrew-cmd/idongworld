/**
 * 📁 codex/manifest.ts — 광역 모듈 codex (도감·일기 해금 통합)
 * ───────────────────────────────────────────────
 * 📌 역할: 도감 entry 해금·일기 해금·전체 해금(완전 등재)을 단일 모듈에서 관리.
 *           vnTrigger handlers (unlock_diary·unlock_codex_*) 의 정착 위치.
 *
 * 🔗 헌법: kind:'global' · storeSlice:'codex'
 *           일기·도감은 친밀도 임계 도달 시 트리거 → 본 모듈이 unlock 결정
 */
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'global',
  id: 'codex',
  name: 'Codex (도감·일기)',
  version: '0.1.0',
  description: '도감 entry·일기 해금·완전 등재. vnTrigger 정착 위치.',
  storeSlice: 'codex',
  exports: [
    'getUnlockedDiaries',
    'isDiaryUnlocked',
    'unlockDiary',
    'getCodexEntries',
    'isCodexUnlocked',
    'unlockCodexSlot',           // 캐릭터 placeholder 등재
    'fullyRegisterCodex',        // 본 등재 (첫 케어 후)
    'isFullyRegistered',
    'configure',
  ],
})
