/**
 * 📁 cutscene-runner/manifest.ts — 컷신 디스패처 시스템 모듈 manifest
 * ───────────────────────────────────────────────
 * 📌 역할: 호출 지점(callSiteId) ↔ 시나리오 매핑 + 조건부 발화 + vn-runner 위임.
 *           헌법 §3.2: 마이섬·하우스·항해·개인섬 컷신은 자기 데이터로 호출 지점에서.
 *           오프닝·튜토리얼은 하드코딩 강제 (예외).
 *
 * 🔗 연결: @idongworld/core · @idongworld/vn-runner (재생 위임)
 */
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'system',
  id: 'cutscene-runner',
  name: 'Cutscene Runner',
  version: '0.1.0',
  description: '호출 지점별 컷신 매핑·조건부 발화·vn-runner 위임. 오프닝/튜토리얼은 하드코딩 예외.',
  tech: 'react',
  exports: [
    'register',          // 한 호출 지점 등록
    'registerAll',       // 일괄 등록
    'findFor',           // callSiteId → registration 조회
    'CutscenePlayer',    // <CutscenePlayer callSiteId="..." onComplete={...} />
    'configure',         // DI: shouldFire 추가 조건 (옵션)
  ],
})
