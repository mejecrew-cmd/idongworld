# Backend And DB Rules

이 문서는 backend와 DB 작업 시 지켜야 하는 현재 규칙이다. 실행 절차는 `.cloud/35_backend_db_runbook.md`를 함께 본다.

## 0. 2026-06-08 기획 변경 반영

2026-06-05 기획 변경 회의 이후 backend/DB 규칙은 다음 전제를 갖는다.

- 하나의 Express 서버와 module별 route/service/repository/model 경계는 유지한다.
- local MongoDB 기준 개발과 전용 collection 구조는 유지한다.
- customs는 idempotency, audit log, resource adapter를 갖춘 기술 자산으로 보존한다.
- 다만 Phase 1 사용자 핵심 루프에서는 세관을 필수 UX gate로 강제하지 않는다.
- 세관의 세부 de-scope 정책은 `.cloud/01_project_history_current_2026-06-13.md`를 따른다.
- 통 인벤토리, 아이동별 25 도감 아이템 인벤토리, 숙소 중심 육성 허브 설계가 확정되기 전까지 신규 schema migration은 보수적으로 진행한다.
- 이전 `destination-island -> ship -> lodge` 세관 루프는 POC/보류 후보로 분류한다.
- backend/API 영향도와 신규 API 후보는 `.cloud/01_project_history_current_2026-06-13.md`를 따른다.
- 항해 중/정박 중 여부와 현재 칸 같은 runtime 항해 상태는 DB에 저장하지 않는다.
- 검증과 테스트 재정렬 기준은 `.cloud/01_project_history_current_2026-06-13.md`를 따른다.

## 1. 기본 방향

- backend 서버는 하나의 Express 서버로 유지한다.
- 모듈 독립성은 서버 분리가 아니라 route, service, repository, model spec 분리로 유지한다.
- 각 모듈은 자기 document와 자기 API만 직접 수정한다.
- 다른 모듈 document를 직접 수정하지 않는다.
- host/global 자원은 host API가 소유한다.
- Phase 1 신규 gameplay 보상은 domain action API가 권위 저장소에 직접 반영한다.
- 실제 source/target module document 간 debit/credit이 필요한 경우에만 customs와 resource adapter를 통과한다.

## 1.5. M5 검증 완료 기준 2026-06-13

M5 이후 backend 작업은 아래 상태를 깨지 않는 것을 기본 전제로 둔다.

- `pnpm check:live-smoke:local`은 local Mongo, backend, frontend를 모두 띄우는 broad regression smoke다.
- 이 명령은 backend module action smoke, Playwright route smoke, state-route runtime check를 순서대로 실행한다.
- M5 기준 live smoke는 실제로 1회 이상 통과했다.
- backend module action smoke는 guest/account, my-island, ship prerequisite, route-neighbor, aidong-island, my-aidong, lodge, zone-garden production, myroom aggregation, route cleanup 흐름을 확인한다.
- Playwright route smoke는 core route, AREA-01~15, legacy redirect, 세관 UI 비강제, 포토카드 placeholder, full-map zone dialog, 항해 guard를 확인한다.
- `backendPersistence.test.ts`는 M5 기준으로 15구역 slot 방어, M21 도감/콜렉션 분리, M22 상륙/영입/편입 책임 분리를 포함한다.
- stage/debut 결과 저장소와 정식 포토카드 저장소는 아직 backend 권위 module이 아니며 7월 backlog 후보로 둔다.

## 2. State Route 제거 상태

- 통합 state route는 제거됐다.
- backend에는 통합 state route, compatibility service, state route feature gate를 다시 만들지 않는다.
- frontend에는 통합 state client를 다시 만들지 않는다.
- 신규 runtime code는 account, host, module, customs, explicit action API 중 하나를 사용한다.
- backend health는 `migration.legacyStateApiRemoved=true`, `migration.repositories.backend`, `migration.repositories.dedicatedModuleIds`를 노출한다.
- route 제거 확인 smoke는 `pnpm smoke:backend:state-route-removed`로 수행한다.
- local Mongo 기반 backend 검증은 `pnpm dev:mongo:local`, `pnpm dev:be:local-mongo`, `pnpm check:backend:migration:local-mongo` 흐름을 사용한다.
- `pnpm audit:legacy-state`는 통합 state route 참조가 runtime source에 다시 생기지 않는지 확인하는 guard로 유지한다.

## 3. MongoDB

- 개발 초기와 local 검증은 local MongoDB를 우선 사용한다.
- Atlas는 현재 사용하지 않는다. 추후 사용할 수도 있는 선택지로만 보류하고, 결정 전까지는 local MongoDB를 기준으로 개발과 검증을 진행한다.
- Atlas 사용을 확정한 경우에도 repository/service 코드를 바꾸지 않고 `MONGO_URI`와 transaction 설정만 바꾸는 것을 목표로 한다.
- local standalone MongoDB는 보통 multi-document transaction을 지원하지 않으므로 `MONGO_TRANSACTIONS_ENABLED=false`로 둔다.
- Atlas 또는 replica set에서 transaction 지원이 확인된 뒤에만 `MONGO_TRANSACTIONS_ENABLED=true`를 사용한다.
- production 성격 환경에서는 `MONGO_CONNECT_REQUIRED=true`를 사용해 Mongo 연결 실패를 서버 시작 실패로 처리한다.
- Atlas 사용 결정과 실제 credential 준비 전에는 `pnpm check:mongo:atlas`를 필수 검증으로 요구하지 않는다.
- Atlas를 실제로 사용하기로 결정한 뒤, 전환 전에는 `pnpm check:mongo:atlas`를 통과시킨다.
- Atlas 검증은 `mongodb+srv://` URI와 `MONGO_CONNECT_REQUIRED=true`를 기준으로 한다.
- Atlas URI, 계정, 비밀번호는 문서에 적지 않고 secret manager 또는 local env에만 둔다.

## 4. Collection 소유권

- `users`: 계정, guest, auth 연결용 user document.
- `hostStates`: host 이름, 광역 재화, 주사위, inventory.
- `myAidongStates`: Aidong 영입, 호감도, needs, 케어 로그, 착용 상태, 아이동별 도감 아이템/업그레이드/연습 상태 후보.
- `myIslandStates`: island unlock, zone progress.
- `codexStates`: diary, codex entry, full registration. 아이템 수량 원장으로 쓰지 않는다.
- `routeNeighborStates`: 항해 route catalog, landing/encounter 결과 호환 기록, route-neighbor local resource. 현재 route/current cell/출항 여부는 저장하지 않는다.
- `shipStates`: 배 종류, 선실, 갑판, 꾸미기, 선박 inventory 호환 필드. 출항/정박 여부는 저장하지 않는다.
- `zoneStates`: `zone-garden`, `zone-oasis`, `zone-memory`, `zone-mine` local state.
- `moduleStates`: 아직 dedicated model이 없는 module의 fallback state.
- `customsLogs`: customs 처리 결과, 실패 사유, idempotency 기록.


## 4.1 항해 세션 상태 저장 금지

항해의 현재 진행 상태는 DB 권위가 아니다.

DB에 저장하면 안 되는 값:

- 현재 배가 출항 중인지, 항구에 정박 중인지.
- 현재 항해 route id.
- 현재 보드 칸 또는 `boardPosition`.
- 현재 탭에서만 유효한 landing 후보.
- 항해 창을 닫으면 사라져도 되는 임시 encounter 선택 상태.

DB에 저장해야 하는 값:

- 주사위 소모와 지급.
- host inventory/resource 증감.
- Aidong 영입과 마이섬 편입.
- 도감템, 성장 재료, 보상 ledger처럼 계정에 남아야 하는 결과.
- 필요한 경우 customs/audit log.

같은 계정이 여러 항해 창을 열 수 있으므로 항해 session은 탭/창별로 독립적이어야 한다. 서버가 `isVoyaging` 같은 user-level flag를 갖는 순간 이 요구를 깨뜨린다.

항구 API와 항구 화면은 항상 “배가 항구에 정박해 있다”는 전제로 동작한다. 항구에서 항해 시작을 누르면 해당 브라우저 세션의 항해가 처음부터 시작된다.

현재 구현 기준:

- `routeNeighborStates` schema/default/spec에는 `currentRoute`, `boardPosition`을 두지 않는다.
- `route-neighbor/start`는 route id와 초기 board position을 응답할 수 있지만 DB에 저장하지 않는다.
- `route-neighbor/roll`은 frontend session이 넘긴 `routeId`, `boardPosition`을 검증하고 주사위 소모와 landing 후보만 처리한다.
- `route-neighbor/landing/clear`는 session payload 또는 landing id를 근거로 보상 확정 결과만 DB에 기록한다.
- `route-neighbor/end`는 DB 출항 상태를 지우는 API가 아니라 no-op/compat 응답이다.
- `ship` service는 `route-neighbor.currentRoute`를 읽어 배 변경, 선실/갑판 배치, 항구 지원 배치를 막지 않는다.
- frontend sync는 `currentRoute`, `boardPosition`을 hydrate/flush하지 않는다.
## 5. Module API 규칙

- 단순 상태 sync는 `GET/PUT/PATCH /api/modules/{moduleId}/state`를 사용한다.
- domain rule이 있는 동작은 `POST /api/modules/{moduleId}/{action}` 형태의 action API를 만든다.
- route는 request parsing과 HTTP response mapping만 담당한다.
- service는 domain rule, validation, 상태 전이를 담당한다.
- repository는 storage 접근을 담당한다.
- 새로운 dedicated module storage를 추가하면 `modelSpecs.ts`와 `moduleRepositoryRegistry`를 함께 갱신한다.
- module storage ownership을 바꾸면 `pnpm check:backend:model-specs`를 통과시킨다.

## 6. Zone Action API 규칙

- zone action API의 권위 판단은 backend service가 담당한다.
- frontend minigame은 결과 이벤트를 전달하고, resource 지급 가능 여부와 진행도 변경은 backend가 검증한다.
- zone action rule 중 보상 숫자와 zone별 resource/clearId allowlist는 `packages/modules/zone-*/balance.csv`에서 읽는다.
- backend loader는 `packages/backend/src/modules/zone/balance.ts`에 둔다.
- unlock 조건, result payload validation, 지급 가능 여부 검증은 backend service 코드에 유지한다.
- `collect`는 zone별 허용 resource만 받을 수 있다.
- `collect.amount`는 양의 정수로 제한한다.
- `clear`는 zone별 허용 `clearId`만 받을 수 있다.
- 현재 `clearId`는 중복 방지 id가 아니라 activity type이다.
- 중복 지급 방지가 필요한 action은 `clearId`와 별도의 `idempotencyKey`를 사용한다.
- 처리한 zone clear key는 module progress에 기록하고, replay 요청은 progress와 reward를 다시 반영하지 않는다.
- host/global reward를 지급해야 하는 zone action은 frontend 직접 지급이 아니라 backend action에서 처리한다.
- zone `clear` action은 필요하면 결과 payload를 받아 backend에서 reward를 계산하고 `{ state, host, rewards }`를 반환한다.
- frontend는 zone minigame 결과 이벤트만 보내고, host state는 backend action 응답을 병합해 반영한다.
- clear 조건, unlock 조건, reward 조건은 route가 아니라 service에서 검증한다.
- zone action은 `active`와 `unlockCondition`을 backend에서 검사한다.
- 명시적 이벤트/BM 해금은 `my-island.unlockedZones`를 통해 통과시킨다.
- 잠긴 zone의 collect/clear는 403 `zone_locked`로 거부한다.

## 7. Customs 규칙

- customs는 cross-module resource movement의 유일한 backend 경로다.
- Phase 1 기본값은 customs backend 유지, 사용자 필수 gate 비활성화다.
- 현재 customs rule set은 완성 밸런스가 아니라 POC/검증/초기 플레이 루프 확인용 임시 체제다.
- 실제 zone, route, ship 자원 루프가 확정되기 전까지 rule 삭제나 대규모 정리는 하지 않는다.
- `customs.csv`에는 `debitAmount`, `creditAmount`를 명시한다.
- host resource ref에는 `moduleId`를 넣지 않는다.
- module resource ref에는 `moduleId`를 반드시 넣는다.
- module resource field가 특수하면 `moduleResourceRegistry.ts`에 binding을 추가한다.
- production에서는 ad-hoc customs apply를 기본 차단한다.
- registered rule은 테스트와 초기 gameplay smoke를 위해 유지하되, 새 rule에는 POC/운영 후보 여부를 description이나 문서에 남긴다.
- transaction이 꺼진 local 환경에서는 target credit 실패 시 source debit을 보상 rollback한다.
- customs 결과는 `customsLogs`에 audit log로 남긴다.
- 신규 gameplay 보상이 단일 권위 저장소로 들어가는 경우에는 customs보다 domain action API를 우선한다.
- 사용자에게 세관 UI를 노출해야 하는 작업은 `.cloud/01_project_history_current_2026-06-13.md`의 재개 조건과 feature flag 기준을 먼저 확인한다.

## 8. Codex Action API 규칙

- Codex action의 입력 id 검증은 backend service에서 수행한다.
- diary unlock은 등록된 diary id만 허용한다.
- diary unlock은 해당 diary의 Aidong이 영입된 뒤에만 허용한다.
- codex slot unlock은 등록된 Aidong entry id만 허용한다.
- codex slot unlock은 해당 Aidong이 영입된 뒤에만 허용한다.
- full registration은 등록된 Aidong entry id만 허용한다.
- full registration은 해당 Aidong이 영입되어 있고 slot이 먼저 unlock된 뒤에만 허용한다.
- 이미 unlock/register된 항목은 중복 배열을 만들지 않고 기존 state를 반환한다.
- 존재하지 않는 id는 400, 잠금 조건 미충족은 409로 처리한다.
- 아이동별 25개 도감 아이템 수량은 `codexStates`가 아니라 `myAidongStates.aidongCodexItems` 후보 필드가 소유한다.
- 아이동 업그레이드 상태는 `myAidongStates.aidongUpgradeState` 후보 필드가 소유한다.
- 숙소 연습 상태는 `myAidongStates.practiceState` 후보 필드가 소유한다.
- 도감 아이템 지급, 소비, 업그레이드 성공 판정은 `my-aidong` domain service 또는 전용 upgrade service 후보에서 검증한다.
- 일반 재료 비용이 필요한 업그레이드는 `hostStates.inventory` 차감과 같은 트랜잭션 단위로 처리한다.
- 도감 아이템과 업그레이드 경제의 상세 기준은 `.cloud/01_project_history_current_2026-06-13.md`를 따른다.

## 9. Auth 규칙

- backend route는 uid를 직접 header/query/body에서 파싱하지 않는다.
- route는 공통 auth middleware와 `getRequestUid()`를 사용한다.
- social login session 동기화는 `/api/auth/session`을 사용한다.
- `/api/auth/session`은 middleware가 확인한 uid를 기준으로 user document를 upsert한다.
- Google/Twitter provider metadata는 `users.authProvider`, `users.email`, `users.displayName`, `users.photoURL`에 저장한다.
- auth session 생성은 module-local document를 직접 만들거나 수정하지 않는다.
- production에서는 Firebase Bearer token 검증을 기본 경로로 둔다.
- production에서는 legacy uid fallback을 기본 차단한다.
- Firebase Admin env가 없는 production backend는 기본적으로 시작 실패해야 한다.

## 10. 검증 명령

backend model spec 확인:

```bash
pnpm check:backend:model-specs
```

backend typecheck:

```bash
pnpm --filter backend typecheck
```

backend persistence test:

```bash
pnpm test packages/backend/src/backendPersistence.test.ts
```

state route 제거 smoke:

```bash
pnpm smoke:backend:state-route-removed
```

server-free static gate:

```bash
pnpm check:state-route-static
```

local runtime gate:

```bash
pnpm check:state-route-runtime:local
```

local broad regression smoke:

```bash
pnpm check:live-smoke:local
```

- 이 명령은 local Mongo, backend, frontend를 함께 띄우는 넓은 회귀검사로 본다.
- Phase 1 core loop 정의 자체로 보지는 않지만, M5 동결 기준에서는 6월 POC 수직 루프가 깨지지 않았는지 보는 최상위 smoke로 사용한다.
- customs, ship/lodge transfer, destination island POC 실패는 해당 기능 작업 중이거나 feature flag로 노출 중일 때만 blocker로 본다.
- 새 검증 분류 기준은 `.cloud/01_project_history_current_2026-06-13.md`를 따른다.

Atlas 사용 확정 뒤 전환 확인:

```bash
pnpm check:mongo:atlas
```

## 변경 기록

- **2026-06-08**: 세관 UI/UX 제거 결정에 맞춰 customs 사용 기준을 수정했다. Phase 1 신규 gameplay 보상은 domain action API가 직접 권위 저장소에 반영하고, customs는 실제 cross-module debit/credit이 필요한 경우에만 사용한다.
- **2026-06-08**: 검증과 테스트 재정렬 문서 `.cloud/01_project_history_current_2026-06-13.md`를 연결했다. `check:live-smoke:local`은 broad regression으로 유지하되, customs/destination POC 실패를 Phase 1 core blocker로 자동 해석하지 않는다.
- **2026-06-08**: Backend/API 영향도 조사 문서 `.cloud/01_project_history_current_2026-06-13.md`를 연결했다. 신규 schema migration은 새 API/model 영향도 분류를 확인한 뒤 보수적으로 진행한다.
- **2026-06-08**: 도감 아이템과 숙소 업그레이드 경제 기준을 추가했다. `codexStates`는 표시/등록 상태로 유지하고, 아이동별 도감 아이템 수량과 업그레이드/연습 상태는 `myAidongStates` 후보 필드가 소유하도록 정리했다.
- **2026-06-08**: Customs De-scope 정책 문서를 연결했다. backend customs/API/log/adapter/rule은 유지하되, 신규 gameplay의 단일 저장소 보상은 domain action API를 우선하도록 명시했다.
- **2026-06-08**: 기획 변경 회의 이후 Phase 1 기준을 추가했다. customs와 module resource adapter는 기술 자산으로 유지하지만, 사용자 핵심 루프의 필수 세관 gate는 보류한다.
- **2026-05-29**: Atlas 상태를 future option으로 정리했다. 현재는 Atlas를 사용하지 않고 local MongoDB 기준으로 개발하며, 실제 사용 결정과 credential 준비 전에는 `pnpm check:mongo:atlas`를 요구하지 않는다.
- **2026-05-29**: Zone reward/action rule config화 기준을 현행화했다. 숫자 보상과 zone별 allowlist는 `balance.csv`에서 읽고, unlock/validation/idempotency는 backend service 코드에 유지한다.
- **2026-05-29**: Customs rule 운용 기준을 임시 체제로 명시했다. 실제 플레이 루프 확정 전까지 rule 삭제/대규모 정리보다 추적 가능성과 테스트 안정성을 우선한다.
- **2026-05-29**: Atlas 전환 검증 규칙을 추가했다. `pnpm check:mongo:atlas`와 `mongodb+srv://`/connect required 기준을 명시했다.
- **2026-05-29**: Codex action API 규칙을 추가했다. diary/slot/full registration의 id 검증과 잠금 조건을 backend service 책임으로 명시했다.
- **2026-05-29**: Zone unlock condition 검증 규칙을 추가했다. 잠긴 zone의 collect/clear는 backend에서 거부한다.
- **2026-05-29**: Zone clear idempotency 규칙을 추가했다. `clearId`와 `idempotencyKey`의 역할을 분리했다.
- **2026-05-29**: Zone host reward 지급 원칙을 갱신했다. frontend 직접 지급 금지와 backend `clear` action 응답 병합 방식을 명시했다.
- **2026-05-29**: Zone action API 규칙을 추가했다. zone별 resource/clearId allowlist, backend authority, idempotency key 분리 원칙을 명시했다.
- **2026-05-29**: state route 제거 완료 상태에 맞춰 문서를 전면 정리했다. backend state route와 compatibility service 설명을 제거했다.
- **2026-05-29**: MongoDB, module API, customs, auth, 검증 명령 중심의 현재 규칙만 남겼다.
- **2026-05-29**: Google/Twitter social login session 규칙을 추가했다. `/api/auth/session`은 user document만 upsert하고 module-local 상태는 건드리지 않는다.
- **2026-06-13**: M5 검증 완료 기준을 추가했다. `pnpm check:live-smoke:local` 통과 상태, backend module smoke 범위, Playwright route smoke 범위, M21/M22/15구역 persistence test 고정 상태를 backend 규칙에 반영했다.


- **2026-06-13**: 항해 세션 상태 저장 금지 규칙을 추가했다. 출항/정박 여부, 현재 route, 현재 칸은 브라우저 세션 상태이며 DB에는 영속 결과만 기록한다.
- **2026-06-13**: 항해 세션 권위 구현 완료 기준을 추가했다. route-neighbor schema/default/spec, start/roll/clear/end 계약, ship lock 제거, frontend sync 제외 기준을 backend 규칙에 반영했다.
