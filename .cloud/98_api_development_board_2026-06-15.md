# 98. API 개발 보드 2026-06-15

## 1. 문서 목적

이 문서는 기존 날짜별 `next_work`를 폐기한 뒤, API/DB 담당자가 바로 이어갈 작업 기준을 정리한다.

이 문서는 화면 목업 작업자가 아니라 자원 관리, DB 연결, backend API, frontend API client 담당자를 위한 작업 보드다.

## 2. 기준 문서

API 개발 시 아래 문서를 우선한다.

- `.cloud/01_project_history_current_2026-06-13.md`
- `.cloud/96_two_person_work_rules_2026-06-15.md`
- `.cloud/97_api_document_boundary_2026-06-15.md`
- `.cloud/30_backend_db_rules.md`
- `.cloud/35_backend_db_runbook.md`
- `.cloud/95_rule_maintenance.md`

화면 파일 작업은 별도 개발자 담당이다. API 개발 중 화면 파일 수정은 API 연결을 위한 최소 변경으로 제한한다.

## 3. API 개발 기본 원칙

- 새 상태는 먼저 document 소유자를 정한다.
- DB에 저장할 값과 frontend session/local state로 둘 값을 구분한다.
- route는 payload parsing과 HTTP response에 집중한다.
- business rule과 validation은 service에 둔다.
- memory repository와 Mongo repository가 같은 계약으로 동작해야 한다.
- frontend에서는 `packages/frontend/src/lib/api.ts` client를 통해 호출한다.
- action 결과가 다른 탭에도 반영되어야 하면 `actionApiSync` 대상인지 검토한다.
- `packages/frontend/src/screens/**/*.tsx`는 기본적으로 건드리지 않는다.

## 4. 바로 시작할 API 개발 후보

### 4.1 API 문서와 실제 route 차이 검증

목표:

- `.cloud/97_api_document_boundary_2026-06-15.md`와 실제 backend route/client 차이를 검사한다.

작업:

- [x] backend route mount 목록을 다시 추출한다.
- [x] `packages/frontend/src/lib/api.ts` client 목록과 비교한다.
- [x] client가 없는 backend API를 표시한다.
- [x] backend API가 없는 client를 표시한다.
- [x] screen 파일 직접 fetch 사용 여부를 검사한다.

감사 결과:

- backend route mount와 module route 목록을 추출했다.
- `packages/frontend/src/lib/api.ts` client 목록을 추출했다.
- `packages/frontend/src/screens`와 `packages/frontend/src/components`에서 직접 `fetch(` 사용 여부를 확인했다.
- 직접 fetch는 `/scenarios/diary_*.json` 정적 파일 로딩 2곳뿐이며, `/api` 직접 호출은 발견되지 않았다.

현재 client가 없는 backend API 후보:

- `GET /api/auth/me`
- `POST /api/gacha/first`
- `POST /api/gacha/confirm`
- `POST /api/care/sync`
- `GET /api/care/state/:char`
- `POST /api/assets/resolve`
- `GET /api/assets/signed-url`
- `GET /api/modules/_model-specs`
- `GET /api/modules/:moduleId/model-spec`
- `GET /api/modules/aidong-island/config`
- `POST /api/modules/aidong-island/leave`
- `GET /api/modules/destination-shell-island/config`
- `POST /api/modules/destination-shell-island/move`
- `POST /api/modules/destination-shell-island/hotspots/interact`
- `POST /api/modules/destination-shell-island/missions/clear`
- `POST /api/modules/{zone}/production/assign`
- `POST /api/modules/{zone}/production/unassign`
- `POST /api/modules/{zone}/production/claim`
- `GET /api/modules/my-aidong/codex-items/progress`
- `POST /api/modules/my-aidong/codex-items/grant`
- `POST /api/modules/my-aidong/upgrades/request`

분류:

- legacy/compat 후보: gacha, care.
- 개발도구/문서화 후보: auth me, model specs, assets.
- 실제 API client 추가 우선 후보: destination-shell-island, zone production, my-aidong codex/upgrade, aidong-island config/leave.

완료 기준:

- 화면 담당자가 쓸 수 있는 API client 누락 목록이 정리된다.

### 4.2 API 응답 shape 표준화

목표:

- action API 응답의 `ok`, `state`, `host`, `account`, module별 부가 payload를 일관되게 정리한다.

작업:

- [ ] `ActionResponse` 공통 shape를 현재 route별 응답과 비교한다.
- [ ] `host`, `state`, `aidongState`, `islandState`, `moduleStates`처럼 혼재된 필드를 분류한다.
- [ ] cross-tab sync 대상 필드와 탭별 session 필드를 분리한다.
- [ ] 필요한 경우 타입 alias를 추가한다.

완료 기준:

- frontend API client와 action sync가 예측 가능한 응답 shape를 가진다.

### 4.3 개발 전용 reset API 보강

목표:

- 디버그 전체 리셋이 DB document를 확실히 기본값으로 되돌리는지 검증한다.

작업:

- [ ] `POST /api/debug/reset` backend test를 추가한다.
- [ ] `shipStates`, `lodgeStates`, `hostStates`, `myAidongStates` 초기화 assertion을 둔다.
- [ ] production 차단 조건을 검증한다.
- [ ] frontend DebugPanel은 API 호출만 하고 화면 세부 구현은 건드리지 않는다.

완료 기준:

- 전체 리셋이 배/숙소/선실/인벤토리/가구 배치를 모두 초기화한다는 테스트가 생긴다.

### 4.4 Ship/Lodge inventory API 명확화

목표:

- 화면 담당자가 배 인벤토리, 숙소 인벤토리, 선실/방 가구를 표시하고 조작할 수 있게 API 경계를 명확히 한다.

작업:

- [ ] ship state 조회에서 화면에 필요한 field 목록을 정리한다.
- [ ] lodge state 조회에서 화면에 필요한 field 목록을 정리한다.
- [ ] 구매/배치/해제/할당 API의 request/response 타입을 보강한다.
- [ ] 전역 inventory와 module inventory 간 이동이 필요한 경우 별도 service/API 후보를 정한다.

완료 기준:

- 화면 담당자가 임의 state patch 없이 전용 API만으로 ship/lodge 상태를 표시하고 갱신할 수 있다.

### 4.5 My Aidong 성장 API skeleton 정리

목표:

- Aidong 소지 아이템, 도감템, 연습, 업그레이드 API 경계를 화면 구현 전에 정리한다.

작업:

- [ ] `myAidongStates.aidongCodexItems` 현재 API를 확인한다.
- [ ] `aidongUpgradeState` request/response를 문서화한다.
- [ ] `hostStates.inventory`와 `myAidongStates.equippedItems` 경계를 재확인한다.
- [ ] 연습/practice 상태가 필요하면 document 위치를 확정한다.

완료 기준:

- 성장 UI가 붙기 전에 backend 저장 경계와 API 후보가 정리된다.

### 4.6 Stage/Debut backend skeleton 후보

목표:

- 화면 목업과 별개로 stage/debut 결과를 저장할 backend 경계를 잡는다.

작업:

- [ ] stage/debut를 별도 module로 둘지 `my-aidong` 하위 action으로 둘지 결정한다.
- [ ] 결과 ledger document 후보를 정한다.
- [ ] 보상 지급 API와 결과 조회 API 후보를 정한다.
- [ ] 포토카드 저장과 연결되는 지점을 표시한다.

완료 기준:

- stage/debut 화면이 완성되기 전에 backend skeleton을 붙일 수 있다.

### 4.7 Photocard storage MVP 후보

목표:

- 포토카드 생성/보관/조회 API의 최소 경계를 잡는다.

작업:

- [ ] 포토카드 소유 document를 정한다.
- [ ] asset URL은 local placeholder로 시작할지 signed URL 후보를 둘지 결정한다.
- [ ] create/list/detail/delete 또는 archive API 후보를 정한다.
- [ ] myroom collection API와 연결 방식을 정한다.

완료 기준:

- 포토카드 UI가 임시 배열이 아니라 backend 조회로 전환될 준비가 된다.

## 5. 우선 시작 순서

권장 시작 순서는 다음이다.

1. API 문서와 실제 route/client 차이 검증. 완료.
2. client 누락 API 중 실제 화면/API 개발 우선순위 확정.
3. debug reset API test 추가.
4. ship/lodge inventory API 계약 보강.
5. my-aidong 성장 API skeleton 정리.
6. stage/debut와 photocard storage 후보 설계.

## 6. 변경 기록

- 2026-06-15: 기존 날짜별 `next_work`를 삭제하기 전 API 개발 전용 기준 보드로 작성했다. 화면 작업은 별도 개발자에게 맡기고, 이 문서는 DB/API 담당 범위만 다룬다.
- 2026-06-15: 4.1 API 문서와 실제 route/client 차이 검증을 완료했다. `/api` 직접 fetch는 발견되지 않았고, client 누락 backend API 후보를 정리했다.