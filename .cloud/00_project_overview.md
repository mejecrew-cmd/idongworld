# Project Overview

## Current SoT Reading Order 2026-06-12

2026-06-12 이후 신규 작업은 아래 순서로 기획 문서를 읽는다.

1. `.cloud/개발기획서260605/사이트맵_260611_최종확정.md`
2. `.cloud/개발기획서260605/_직접작성본/00_아이동월드_중앙기획서.md`
3. `.cloud/개발기획서260605/_직접작성본/02_처리목록_총목록.md`
4. `.cloud/개발기획서260605/모듈상세_M03_마이섬허브_260608.md`부터 M09, M21, M22까지의 모듈 상세 문서
5. `.cloud/71_roadmap_2026-06_260612.md`
6. `.cloud/72_next_work_2026-06-12_week1_a.md`
7. 과거 next_work와 6/8 이전 작업 문서

현재 최신 실행 보드는 `.cloud/72_next_work_2026-06-12_week1_a.md`다. 과거 next_work는 구현 이력으로만 읽고, 신규 구현 기준으로 삼지 않는다.

중앙기획서가 참조하는 일부 SoT 문서는 아직 누락되어 있다. 누락 현황은 `.cloud/73_sot_missing_docs_audit_2026-06-12.md`를 따른다.

## Planning Change Notice 2026-06-08

2026-06-05 기획 변경 회의 이후 Phase 1 개발 방향은 세관과 완전 모듈화를 사용자 핵심 루프에 강제하지 않는 쪽으로 이동했다.

- backend route/service/repository/model 경계와 Mongo collection 분리는 기술 자산으로 유지한다.
- customs, destination island, ship/lodge inventory 분리 구현은 삭제하지 않고 보류/내부 infra/향후 이벤트 섬 후보로 보존한다.
- Phase 1 플레이 루프는 숙소 중심 육성, 통 인벤토리, 아이동별 도감 아이템, 가변 메인 구역, 배치 자동 생산을 우선한다.
- Phase 1 core loop의 상세 화면/상태 기준은 `.cloud/53_core_loop_2026-06-08.md`를 따른다.
- 자세한 충돌 분류와 후속 순서는 `.cloud/52_plan_change_conflict_map_2026-06-08.md`와 `.cloud/51_next_work_2026-06-08.md`를 따른다.

## Current Backend Status 2026-05-29

- `/api/state` backend route는 제거됐다.
- frontend는 account, host, module 전용 API로 hydrate/flush한다.
- backend health는 `migration.legacyStateApiRemoved=true`를 보고한다.
- local Mongo 기반 backend 실행은 `pnpm dev:mongo:local`, `pnpm dev:be:local-mongo` 흐름을 사용한다.
- backend migration smoke는 `pnpm check:backend:migration:local-mongo` 또는 `pnpm smoke:backend:state-route-removed`로 확인한다.
- Atlas는 현재 사용하지 않는다. 추후 사용할 수도 있는 선택지로만 보류하며, 결정 전까지 local MongoDB 기준으로 개발한다.

## Backend Split Status Update 2026-05-24

- 백엔드는 여전히 하나의 Express 서버지만, 저장소 소유권은 repository/document 경계로 분리되어 있다.
- MongoDB 연결은 `packages/backend/src/db/mongo.ts`에서 공통으로 관리한다.
- repository 선택은 `packages/backend/src/repositories/index.ts`에서 관리한다. Mongo 연결 시 Mongo repository를 사용하고, 연결되지 않으면 memory repository로 fallback한다.
- 현재 전용 Mongo collection은 `users`, `hostStates`, `myAidongStates`, `myIslandStates`, `codexStates`, `routeNeighborStates`, `shipStates`, `zoneStates`, `moduleStates`, `customsLogs`를 포함한다.
- 공통 모듈 상태 API는 `GET/PUT/PATCH /api/modules/{moduleId}/state`로 제공된다.
- 전용 모듈 상태 repository는 `my-aidong`, `my-island`, `codex`, `route-neighbor`, `ship`, zone 모듈에 등록되어 있다.
- 백엔드 모듈 action route는 account, host, customs, my-aidong, route-neighbor, ship 책임을 중심으로 `packages/backend/src/modules/*` 아래에 존재한다.
- 2026-05-29 기준 state route 제거 이후 `pnpm check:state-route-static`을 통과했다.
- 개발 DB는 로컬 MongoDB 우선이다. Atlas는 사용 결정과 credential 준비 뒤에만 readiness를 실행한다.

이 문서는 아이동월드 `v1_260509` 프로젝트의 작업 전제다. Codex나 다른 바이브 코딩 도구가 작업할 때 프로젝트의 정체성, 현재 구현 상태, 앞으로의 방향을 혼동하지 않도록 한다.

## 프로젝트 정체성

- 프로젝트 이름은 `idongworld-monorepo`다.
- 목표는 아이동 캐릭터, 마이섬, 항해, 세관, 가챠, VN/컷신, 도감, 자원 순환을 묶은 모듈형 월드 POC다.
- 기존 `VVNS` 프로젝트에서 일부 패턴과 코드가 직이식되었고, 그 위에 모듈 분리 구조를 확장한 형태다.
- Phase 1/1.5 성격의 POC이므로, 일부 문서상 설계 의도와 현재 코드 구현 수준이 다를 수 있다. 작업 시에는 현재 코드의 실제 동작을 먼저 확인한다.

## 현재 모노레포 구성

- `packages/core`: manifest 타입, module registry, event bus, route helper, i18n loader, asset helper, CSV loader 등 공통 런타임 기반.
- `packages/frontend`: Vite + React + TypeScript 프론트엔드. Zustand `useUserStore`와 bootstrap 코드가 모듈들을 연결한다.
- `packages/backend`: Express + TypeScript 백엔드. 하나의 서버 안에서 auth/common route와 모듈별 route/service/repository/model 경계를 관리한다.
- `packages/modules`: global/system/content 모듈들이 위치한다.
- `shared-data`: 아이동 마스터, 컷신 카탈로그, 종족, 스케줄 같은 공용 데이터.
- `resources`: 공개/보호 자산 풀의 디렉터리 골격.
- `tools`: i18n, audit, 문서 정리용 스크립트.

## 현재 등록된 코드 모듈

광역 모듈:

- `host`: 전역 자원, 재화, 인벤토리, 주사위 등 host 자원 소유권.
- `account`: 인증, 계정, 세션, 닉네임 등의 계정 영역.
- `my-aidong`: 영입 아이동, 친밀도, 욕구, 케어 기록.
- `my-island`: 마이섬/구역 잠금 해제와 진행.
- `codex`: 도감, 일기, 등록 상태.

시스템 모듈:

- `vn-runner`: JSON 기반 VN 시나리오 실행 엔진.
- `gacha`: 가챠 풀, 확률 선택, 첫 만남 시나리오 연결.
- `cutscene-runner`: 컷신 call site registry와 VN runner 프레이밍.
- `customs`: 모듈 경계의 자원 변환/반출입 규칙 엔진.

콘텐츠 모듈:

- `zone-garden`
- `zone-oasis`
- `zone-memory`
- `zone-mine`
- `route-neighbor`

## 현재 구현 상태 요약

- 모듈 등록은 프론트엔드 `moduleRegistry.ts`에서 manifest를 import하고 `@idongworld/core` registry에 등록하는 방식이다.
- 프론트엔드 모듈 분리는 패키지, manifest, DI, bootstrap 중심으로 유지된다. Zustand store는 아직 모듈별 물리 store로 완전히 쪼개지지 않았다.
- 백엔드는 서버를 나누지 않고, 하나의 Express 서버 안에서 모듈별 route/service/repository/model 경계를 분리한다.
- MongoDB 연결, repository 선택, 전용 module state repository, 공통 `moduleStates` fallback, `customsLogs` audit log가 구현되어 있다.
- `/api/state`는 제거됐다. 신규 개발은 account, host, module, customs, explicit action API를 사용한다.
- 세관(customs)은 rule loading, idempotency, audit log, resource adapter, rollback 보강을 갖는다. 실제 플레이 루프 확정 전까지 rule set은 POC/검증용 임시 체제로 유지한다.

## 현재 검증 기준

- 정적 기본 검증: `pnpm check:state-route-static`
- backend module action smoke: `pnpm check:module-actions-smoke`
- frontend runtime 확인이 필요할 때: `pnpm check:frontend:state-route-runtime`
- Atlas readiness는 Atlas 사용 결정과 실제 `mongodb+srv://` credential 준비 뒤에만 실행한다.

## 개발 방향

- 코어는 모듈을 등록/검증/연결하는 얇은 기반으로 유지한다.
- 신규 기능은 가능한 한 모듈 단위로 추가한다.
- 전역 상태에 바로 붙이는 대신, 모듈의 config/actions/facade를 통해 연결한다.
- 모듈 간 자원 이동은 세관(customs)을 통과시킨다.
- 백엔드는 서버를 무조건 나누기보다, 하나의 서버 안에서 모듈별 route/service/model/repository를 분리하는 방향을 우선한다.
- 신규 DB 작업은 기존 repository 경계를 확장하고, 필요 시 전용 collection과 `moduleRepositoryRegistry`/`modelSpecs`를 함께 갱신한다.

## 변경 기록

- **2026-06-12**: 최신 기획 읽기 순서를 6/11 사이트맵, 중앙기획서, 처리목록, 모듈상세, 6월 로드맵, 최신 실행 보드 순서로 고정했다. 누락 SoT 감사 문서 `.cloud/73_sot_missing_docs_audit_2026-06-12.md`를 연결했다.
- **2026-06-08**: 기획 변경 회의 이후 Phase 1 방향 전환 공지를 추가했다. 세관/완전 모듈화 UX는 보류하고, backend 분리와 catalog 검증은 기술 자산으로 유지한다.
- **2026-06-08**: Phase 1 core loop 기준 문서 `.cloud/53_core_loop_2026-06-08.md`를 연결했다.
- **2026-05-29**: `/api/state` compatibility 표현을 제거 완료 상태로 정리했다. Atlas는 보류 상태이며 local MongoDB 우선 개발 기준을 명시했다.
