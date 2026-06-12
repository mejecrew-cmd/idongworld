/**
 * 📁 my-aidong/manifest.ts — 광역 모듈 my-aidong
 * ───────────────────────────────────────────────
 * 📌 역할: 영입 캐릭터·친밀도·6 욕구·케어 로그·끊김(record) 단일 소유.
 *           친밀도/needs 는 전체 게임 흐름의 핵심 — 본 모듈만 변경 권한.
 *
 * 🔗 헌법: kind:'global' · storeSlice:'my-aidong'
 *           끊김 record (잘못된 케어로 인한 친밀도 -1) 데이터 표준 위치.
 */
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'global',
  id: 'my-aidong',
  name: 'My Aidong (마이아이동)',
  version: '0.1.0',
  description: '영입·친밀도·6 욕구·케어 로그·끊김 record. 광역 — 항상 active.',
  storeSlice: 'my-aidong',
  balance: 'balance.csv',
  items: 'items.csv',
  exports: [
    'getAidongs',                // 영입 목록
    'isRecruited',
    'recruit',                   // 영입
    'getAffinity',               // 친밀도 조회
    'addAffinity',               // 친밀도 변경
    'getNeeds',                  // 6 욕구 조회
    'tickSequenceDecay',         // 시퀀스 단위 -1
    'applyCareAction',           // 케어 액션 적용
    'getCareCooldownMs',         // balance.csv: care_cooldown_ms
    'getCareDailyCap',           // balance.csv: care_daily_cap
    'getNeedDecayPerSequence',   // balance.csv: need_decay_per_sequence
    'getAffinityLevelThreshold', // balance.csv: affinity_lvl_N_threshold
    'getBalance',                // 일반 조회
    'configure',                 // DI
  ],
})
