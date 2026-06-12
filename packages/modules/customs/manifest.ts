/**
 * 📁 customs/manifest.ts — 세관 (자원 변환) 시스템 모듈 manifest
 * ───────────────────────────────────────────────
 * 📌 역할: 모듈 내 로컬 자원 ↔ 글로벌·다른 모듈 자원 변환의 명시적 절차 엔진.
 *           모듈마다 customs.csv 자체를 가지고 본 엔진에 register.
 *           UI 확인 강제 (자동 변환 X) 가 헌법 §3.2.
 *
 * 🔗 연결: @idongworld/core
 */
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'system',
  id: 'customs',
  name: 'Customs (세관)',
  version: '0.1.0',
  description: '자원 변환 룰·신고·적용 엔진. 명시적 UI 확인 강제. 모듈별 customs.csv 등록.',
  tech: 'react',
  exports: [
    'registerRule',     // 한 변환 룰 등록
    'registerCsv',      // CSV 텍스트 → rule 다중 등록
    'getRule',          // ruleId 조회
    'simulate',         // 변환 결과 미리 (UI 확인 화면용)
    'apply',            // 실 변환 (debit·credit 콜백 호출)
    'configure',        // DI: onDebit·onCredit·confirmUI
    'listRules',        // 디버그
  ],
})
