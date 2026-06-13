# Project Overview

이 문서는 아이동월드 프로젝트의 현재 작업 전제를 짧게 정리한다.

상세 히스토리와 구현 방향은 아래 문서를 우선한다.

```text
.cloud/01_project_history_current_2026-06-13.md
```

최신 실행 보드는 아래 문서다.

```text
.cloud/89_next_work_2026-07-01.md
```

6월 작업은 M5에서 완료/동결되었다.

## 현재 상태

- 6월 POC 수직 루프는 검증, 문서, backlog 기준으로 동결 완료 상태다.
- 최신 작업은 7월 M6 단계다.
- 오래된 next_work, 임시 충돌 지도, 임시 설계 조각은 히스토리 문서에 흡수했다.
- 신규 개발과 Codex 작업은 이 문서, 히스토리 문서, 로드맵, 최신 실행 보드, 규칙 문서를 기준으로 한다.

## 핵심 루프

6월에 닫은 기준 루프는 아래다.

```text
로그인/타이틀
→ 오프닝 분기
→ 마이섬 15구역 허브
→ 숙소 케어
→ 항구/항해
→ 아이동섬 상륙
→ 아이동 영입
→ 13 편입 슬롯 선택
→ 구역 생산/도감템 획득
→ 마이룸 도감/콜렉션 확인
→ 데뷔 placeholder
```

## 현재 모노레포 구성

- `packages/core`: manifest 타입, module registry, event bus, route helper, i18n loader, asset helper, CSV loader 등 공통 런타임 기반.
- `packages/frontend`: Vite + React + TypeScript 프론트엔드. Zustand `useUserStore`, facade, bootstrap code가 module을 연결한다.
- `packages/backend`: Express + TypeScript 백엔드. 하나의 서버 안에서 module별 route/service/repository/model 경계를 관리한다.
- `packages/modules`: global/system/content module package와 manifest, balance/customs/decor/i18n 데이터가 위치한다.
- `shared-data`: 아이동 마스터, 컷신 카탈로그, 종족, 스케줄 같은 공용 데이터.
- `resources`: 공개/보호 자산 풀의 디렉터리 골격.
- `tools`: i18n, audit, smoke, 문서 정리용 스크립트.

## 현재 구현 방향

- backend 서버는 하나다. 서버를 module별로 물리 분리하지 않는다.
- module별 route, service, repository, model 경계를 코드 안에서 분리한다.
- `/api/state`는 제거됐고 되살리지 않는다.
- frontend Zustand store는 하나를 유지하지만, 신규 code는 facade와 action API를 우선한다.
- 마이섬은 고정 15구역이다. AREA-02 항구와 AREA-13 숙소는 anchor다.
- Aidong 영입과 마이섬 slot 편입은 분리한다.
- `codexStates`는 수량 원장이 아니다. Aidong별 도감템 수량은 `myAidongStates.aidongCodexItems` 쪽이 기준이다.
- customs backend는 유지하지만 Phase 1 core UX에서 필수 gate로 강제하지 않는다.
- 항해 중/정박 중 여부와 현재 칸은 DB가 아니라 브라우저 탭/창별 세션 상태다.
- PixiJS/Rive는 전체 UI 대체가 아니라 일부 scene/연출에만 부분 적용한다.

## 주요 문서

- 현재 히스토리: `.cloud/01_project_history_current_2026-06-13.md`
- 최신 실행 보드: `.cloud/89_next_work_2026-07-01.md`
- 6월 로드맵: `.cloud/71_roadmap_2026-06_260612.md`
- 개발자 온보딩: `.cloud/85_developer_onboarding_2026-06-12.md`
- architecture 규칙: `.cloud/10_architecture_rules.md`
- 모듈 제작자 가이드: `.cloud/02_module_creator_guide_2026-06-13.md`
- module 규칙: `.cloud/20_module_rules.md`
- backend/DB 규칙: `.cloud/30_backend_db_rules.md`
- backend runbook: `.cloud/35_backend_db_runbook.md`
- frontend 규칙: `.cloud/40_frontend_rules.md`
- asset/data 규칙: `.cloud/50_asset_data_rules.md`
- Codex workflow: `.cloud/90_codex_workflow.md`
- rule maintenance: `.cloud/95_rule_maintenance.md`

## 검증 기준

자주 사용하는 검증은 아래다.

```bash
pnpm --filter backend typecheck
pnpm --filter frontend typecheck
pnpm test -- packages/backend/src/backendPersistence.test.ts
pnpm check:live-smoke:local
```

M5 기준으로 backend/frontend typecheck, backend persistence test 39개, live smoke가 통과했다.

## 변경 기록

- **2026-06-13**: `.cloud` 문서 정리 이후 현재 기준 개요로 다시 작성했다. 오래된 next_work와 임시 설계 문서 링크를 제거하고 히스토리, 최신 실행 보드, 로드맵, 규칙 문서를 기준으로 세웠다.
- **2026-06-13**: 신규 모듈 제작자가 따라갈 수 있는 `.cloud/02_module_creator_guide_2026-06-13.md`를 주요 문서 목록에 추가했다.
- **2026-06-13**: 항해 세션 권위 기준을 추가했다. 항해 현재 상태는 DB에 저장하지 않고 탭/창별 세션에서만 관리한다.