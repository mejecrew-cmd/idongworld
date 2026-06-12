/**
 * 📁 vn-runner/manifest.ts — VN Runner 시스템 모듈 manifest
 * ───────────────────────────────────────────────
 * 📌 역할: 비주얼노벨 시나리오 재생 엔진의 신분증.
 *           registry.register(manifest) 후 콘텐츠 모듈이 requires: ['vn-runner'] 로 사용.
 *
 * 🔗 연결:
 *   - @idongworld/core/manifests (defineManifest)
 *   - 모듈분리작업계획_v1_260510.md §6.2 (시스템 모듈 표준)
 *   - 사용 콘텐츠 모듈 (Phase 1.5+): recruit-flow·diary·debut-stage 등
 */
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'system',
  id: 'vn-runner',
  name: 'VN Runner',
  version: '0.1.0',
  description: '비주얼노벨 시나리오 JSON 재생 엔진 — 컷 단위 텍스트·캐릭터·선택지·trigger 처리',
  tech: 'react',
  exports: [
    'VNPlayer',          // 시나리오 재생 React 컴포넌트
    'configure',         // DI 훅 등록 (renderCharacter·triggerHandlers 주입)
    'applyTemplate',     // {{변수}} 단일 치환
    'applyTemplateToScene', // scene 객체 재귀 치환
    'handleTriggers',    // trigger 처리 (configure 등록 핸들러 dispatch)
    'registerTriggerHandler', // 단일 trigger 등록 헬퍼
  ],
})
