/**
 * 📁 account/manifest.ts — 광역 모듈 account
 * ───────────────────────────────────────────────
 * 📌 역할: 인증 (게스트·Firebase) · 세션 · 닉네임 · uid 관리.
 *           로그인 흐름의 단일 소스 (다른 모듈은 actions 통해서만 인증 상태 조회).
 *
 * 🔗 헌법: kind:'global' · storeSlice:'account' · api:'/api/auth' (Phase 2)
 */
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'global',
  id: 'account',
  name: 'Account (계정)',
  version: '0.1.0',
  description: '인증·세션·닉네임. 게스트 → Firebase Auth (Phase 1.5+).',
  storeSlice: 'account',
  exports: [
    'getAccount',     // 현재 계정 스냅샷
    'isLoggedIn',
    'isGuest',
    'loginGuest',     // 게스트 로그인
    'logout',         // 로그아웃 (전체 상태 초기화)
    'setNickname',
    'configure',      // DI 훅
  ],
  api: '/api/auth',
})
