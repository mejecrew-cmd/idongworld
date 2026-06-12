/**
 * 📁 data/signatures.ts — 본진 5명 시그니처 아이템 SoT
 * ───────────────────────────────────────────────
 * 📌 역할: 데뷔 스테이지에서 발화하는 캐릭터별 시그니처 아이템 정의.
 *           e 시트 §6-3 (외형 명세서) 정합.
 *
 * 🔗 연결:
 *   - 기획 SoT: [캐릭터메이킹엔진]/e_아이동캐릭터/{종}/*.md §6-3
 *   - screens/DebutStageScene.tsx → 데뷔 5단계 시퀀스에서 사용
 *
 * 💡 초보자 안내:
 *   - 5명 모두 고유 시그니처 1개 (영구 식별 특징).
 *   - itemId: 게임 안 영구 ID (item_signature_persona{N}_*)
 *   - zone: 데뷔 무대 배경 (각 캐릭터의 영입 섬과 동일)
 *   - bonus: 데뷔 보정 점수 (피지컬 + 페르소나)
 *
 *   목록:
 *   - 황금멍: 🎤 황금 마이크 / sunny_meadow / +6
 *   - 춤냥: 🩰 실버 발레 슈즈 / moonlit_stage / +9
 *   - 양털곰: 🏋️ 작은 덤벨 / workshop_honey / +9
 *   - 단풍볼: 🎙️ 와인 마이크 / maple_grove_dawn / +11
 *   - 날카여우: 👠 댄스 슈즈 / red_dusk_stage / +10
 */
// ──────────────────────────────────────────────
// 데이터 연결 명시:
// 📊 SoT: [캐릭터메이킹엔진]/e_아이동캐릭터/{종}/*.md §6-3 (외형 명세서 시그니처)
// 📊 데뷔 보정: 기획/모듈/능력치파라메터.md §3 (피지컬 + 페르소나)
// 🖼️ UI: screens/DebutStageScene.tsx (5단계 시퀀스)
// 🚪 진입: screens/HubHeartScene.tsx (✨ {char} 데뷔 버튼)
// 📚 카탈로그: /dev/catalog 8번 signature 탭
// 🔮 Phase 2 확장: Lv5 해금 조건 + 시즌 시그니처 추가
// ──────────────────────────────────────────────
import type { AidongCharacterId } from '@/stores/userStore'

export interface Signature {
  id: string
  characterId: AidongCharacterId
  name: string
  emoji: string
  itemId: string
  zone: string  // 데뷔 스테이지 무대 zone
  bonus: number  // 데뷔 보정 (피지컬 + 페르소나)
}

export const SIGNATURES: Record<AidongCharacterId, Signature> = {
  황금멍: {
    id: 'sig_hwanggumeong', characterId: '황금멍',
    name: '황금 마이크', emoji: '🎤',
    itemId: 'item_signature_persona56_golden_mic',
    zone: 'sunny_meadow', bonus: 6,
  },
  춤냥: {
    id: 'sig_chumnyang', characterId: '춤냥',
    name: '실버 발레 슈즈', emoji: '🩰',
    itemId: 'item_signature_persona75_silver_shoes',
    zone: 'moonlit_stage', bonus: 9,
  },
  양털곰: {
    id: 'sig_yangteolgom', characterId: '양털곰',
    name: '작은 덤벨', emoji: '🏋️',
    itemId: 'item_signature_persona24_dumbbell',
    zone: 'workshop_honey', bonus: 9,
  },
  단풍볼: {
    id: 'sig_danpungbol', characterId: '단풍볼',
    name: '와인 마이크', emoji: '🎙️',
    itemId: 'item_signature_persona7_mic',
    zone: 'maple_grove_dawn', bonus: 11,
  },
  날카여우: {
    id: 'sig_nalkayeou', characterId: '날카여우',
    name: '댄스 슈즈', emoji: '👠',
    itemId: 'item_signature_persona19_dance_shoes',
    zone: 'red_dusk_stage', bonus: 10,
  },
}
