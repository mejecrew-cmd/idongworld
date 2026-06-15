# Backend DB Runbook

이 문서는 backend 작업자가 MongoDB, repository, module API, customs, auth를 다룰 때 바로 확인해야 하는 실행 매뉴얼이다.

원칙 문서는 `.cloud/30_backend_db_rules.md`를 우선으로 본다. 상태 API 제거처럼 일시적인 migration 계획은 별도 계획 문서에 둔다.

## 1. 기본 방향

- backend 서버는 하나의 Express 서버로 유지한다.
- 모듈 독립성은 서버 분리가 아니라 route, service, repository, model spec 분리로 유지한다.
- 각 모듈은 자기 document와 자기 API만 직접 수정한다.
- host/global 자원은 host API나 customs를 통해 수정한다.
- 모듈 간 자원 이동은 반드시 customs와 resource adapter를 통과한다.
- 개발 초기에는 local MongoDB를 사용한다.
- Atlas는 현재 사용하지 않는다. 추후 사용할 수도 있는 선택지로만 보류하고, 결정 전까지는 local MongoDB 기준으로 개발과 검증을 진행한다.
- Atlas 사용을 확정한 경우에도 repository/service 코드를 바꾸지 않고 `MONGO_URI`와 transaction 설정만 바꾸는 것을 목표로 한다.

## 2. 환경 변수

local backend `.env.local` 예시:

```txt
PORT=4000
MONGO_URI=mongodb://admin:<PASSWORD>@127.0.0.1:27017/idongworld?authSource=admin
MONGO_CONNECT_REQUIRED=false
MONGO_SERVER_SELECTION_TIMEOUT_MS=5000
MONGO_TRANSACTIONS_ENABLED=false
```

production 또는 staging 권장값:

```txt
NODE_ENV=production
MONGO_CONNECT_REQUIRED=true
AUTH_FIREBASE_REQUIRED=true
AUTH_LEGACY_UID_FALLBACK_ENABLED=false
CUSTOMS_AD_HOC_APPLY_ENABLED=false
```

주의:

- 실제 비밀번호는 `.env.local` 또는 secret manager에만 둔다.
- `.cloud`, `.env.example`, 테스트 코드에는 실제 비밀번호를 적지 않는다.
- local standalone MongoDB는 보통 multi-document transaction을 지원하지 않으므로 `MONGO_TRANSACTIONS_ENABLED=false`로 둔다.
- Atlas 또는 replica set에서 transaction 검증이 끝난 뒤에만 `MONGO_TRANSACTIONS_ENABLED=true`로 올린다.

## 3. MongoDB 접속

기본 local port는 `27017`이다.

Compass 접속 URI 형식:

```txt
mongodb://admin:<PASSWORD>@127.0.0.1:27017/idongworld?authSource=admin
```

Atlas 사용 확정 시 URI 형식:

```txt
mongodb+srv://<USER>:<PASSWORD>@<CLUSTER_HOST>/idongworld?retryWrites=true&w=majority
```

현재 Atlas 상태:

- Atlas는 현재 사용하지 않는다.
- 추후 사용할 수도 있는 선택지로만 보류한다.
- 실제 Atlas URI, database user, network access가 준비되기 전에는 Atlas readiness를 실행하지 않는다.
- local 개발과 backend split 검증은 local MongoDB 기준으로 계속 진행한다.
- Atlas 관련 secret은 문서에 남기지 않는다.

Atlas 사용 검토를 시작하는 조건:

- Atlas Network Access에 현재 접속 IP를 허용한다.
- Database user가 `idongworld` DB에 read/write 권한을 가진다.
- 사용이 확정되면 `MONGO_URI`만 Atlas URI로 교체한다.
- staging/production 성격 환경에서는 `MONGO_CONNECT_REQUIRED=true`를 사용한다.
- Atlas 전용 확인은 `pnpm check:mongo:atlas`로 수행한다.
- transaction을 사용할 경우 `pnpm check:mongo:atlas`에서 `transactionsSupported=true`를 확인한다.
- backend `/health`에서 `mongo.connected=true`를 확인한다.

보류 중에는 하지 않을 것:

- placeholder Atlas URI로 readiness를 실행하지 않는다.
- 실제 credential을 `.cloud`, `.env.example`, 테스트 코드에 적지 않는다.
- Atlas 사용 전제의 repository/service 변경을 먼저 하지 않는다.
- local standalone MongoDB에서 transaction enabled 상태를 운영 기준처럼 간주하지 않는다.

## 4. 현재 Collection

현재 backend가 사용하는 주요 collection은 다음과 같다.

```txt
users
hostStates
myAidongStates
myIslandStates
codexStates
routeNeighborStates
shipStates
zoneStates
moduleStates
customsLogs
```

역할:

- `users`: 계정, guest, auth 연결용 user document.
- `hostStates`: host 이름, 광역 재화, 주사위, inventory.
- `myAidongStates`: Aidong 영입, 호감도, needs, 케어 로그, 착용 상태.
- `myIslandStates`: island unlock, zone progress.
- `codexStates`: diary, codex entry, full registration.
- `routeNeighborStates`: 항해 route catalog, landing/encounter 결과 호환 기록, route-neighbor local resource. 현재 route/current cell/출항 여부는 저장하지 않는다.
- `shipStates`: 배 종류, 선실, 갑판, 꾸미기, 선박 inventory 호환 필드. 출항/정박 여부는 저장하지 않는다.
- `zoneStates`: `zone-garden`, `zone-oasis`, `zone-memory`, `zone-mine` local state.
- `moduleStates`: 아직 dedicated model이 없는 module의 fallback state.
- `customsLogs`: customs 처리 결과, 실패 사유, idempotency 기록.

## 5. Backend 구조

주요 위치:

```txt
packages/backend/src/index.ts
packages/backend/src/db
packages/backend/src/models
packages/backend/src/repositories
packages/backend/src/modules
packages/backend/src/resources
packages/backend/src/customs
packages/backend/src/middleware
```

역할:

- `index.ts`: Express app 구성, health, 공통 route mount.
- `db`: Mongo connection, transaction helper.
- `models`: Mongo document schema와 type.
- `repositories`: memory/Mongo 저장소 구현.
- `modules`: module route와 service.
- `resources`: host/module resource adapter.
- `customs`: customs rule load, apply, audit.
- `middleware`: auth와 request uid 추출.

route 작성 원칙:

- request parsing과 HTTP response mapping은 `routes.ts`에 둔다.
- domain rule과 상태 변경은 `service.ts`에 둔다.
- DB 접근은 repository를 통한다.
- 다른 모듈 document를 직접 수정하지 않는다.
- 다른 모듈로 자원을 이동해야 하면 customs를 호출한다.

Aidong item 저장 원칙:

- Aidong 소지/착용 아이템의 소유권은 `hostStates.inventory`에 둔다.
- Aidong 착용 상태는 `myAidongStates.equippedItems`에 둔다.
- `equippedOutfit`은 Phase 1 화면 외형 프리셋으로 유지하고, 실제 소유 아이템 착용 계약으로 쓰지 않는다.
- 착용 가능 item catalog는 `packages/modules/my-aidong/items.csv`에 둔다.
- module-local inventory에서 Aidong item을 얻으면 customs를 통해 `hostStates.inventory`로 이동한 뒤 착용한다.
- 착용 API는 host inventory의 가용 수량을 확인하고, 수량보다 많은 Aidong에게 중복 착용시키지 않는다.

## 6. 주요 API

공통:

```txt
GET  /health
POST /api/auth/guest
GET  /api/auth/me
GET  /api/account/state
PATCH /api/account/state
```

host:

```txt
GET   /api/host/state
PATCH /api/host/state
POST  /api/host/resources/mutate
POST  /api/host/inventory/mutate
```

module state:

```txt
GET   /api/modules/{moduleId}/state
PUT   /api/modules/{moduleId}/state
PATCH /api/modules/{moduleId}/state
GET   /api/modules/_model-specs
GET   /api/modules/{moduleId}/model-spec
```

module action:

```txt
POST /api/modules/my-aidong/recruit
POST /api/modules/my-aidong/affinity
POST /api/modules/my-aidong/outfit
POST /api/modules/my-aidong/items/equip-toggle
POST /api/modules/my-island/unlock-zone
POST /api/modules/my-island/tutorial/complete
POST /api/modules/codex/unlock-diary
POST /api/modules/codex/unlock-slot
POST /api/modules/codex/fully-register
POST /api/modules/route-neighbor/start
POST /api/modules/route-neighbor/roll
GET  /api/modules/route-neighbor/landing/current
POST /api/modules/route-neighbor/landing/clear
POST /api/modules/route-neighbor/end
POST /api/modules/ship/harbor/assign-toggle
POST /api/modules/ship/harbor/charge
POST /api/modules/{zoneId}/collect
POST /api/modules/{zoneId}/clear
```

route-neighbor 현재 계약:

- `POST /api/modules/route-neighbor/start`
  - 입력: `uid`, `routeId`.
  - 응답: 세션 시작에 필요한 `routeId`, 초기 `boardPosition`, 현재 route-neighbor state.
  - DB 저장: 현재 route/current cell을 저장하지 않는다.
- `POST /api/modules/route-neighbor/roll`
  - 입력: `uid`, `steps`, `routeId`, `boardPosition`.
  - 응답: 확정된 `steps`, session 기준 `boardPosition`, landing 후보, host dice 변경 결과.
  - DB 저장: 주사위 소모와 필요한 영속 결과만 저장한다. 현재 칸은 저장하지 않는다.
- `GET /api/modules/route-neighbor/landing/current`
  - 호환 endpoint다. 현재 세션 landing 후보를 DB에서 복구하는 용도로 쓰지 않는다.
- `POST /api/modules/route-neighbor/landing/clear`
  - 입력: `uid`, `landingId`, `routeId`, `boardPosition`.
  - 응답: 보상 확정 결과, route-neighbor/local resource 호환 기록, 관련 module state.
  - DB 저장: `landings.cleared` 같은 결과 이력은 저장할 수 있지만 `landings.last` 같은 세션 후보는 저장하지 않는다.
- `POST /api/modules/route-neighbor/end`
  - no-op/compat endpoint다. DB 출항 상태를 지우는 API로 쓰지 않는다.

zone action 작성 기준:

- `collect`와 `clear`는 `packages/backend/src/modules/zone/service.ts`의 zone action rule을 통과해야 한다.
- backend는 `packages/backend/src/modules/zone/balance.ts`를 통해 `packages/modules/zone-*/balance.csv`를 읽는다.
- backend service 코드가 zone action의 최종 권위다.
- `balance.csv`에 두는 값은 보상 숫자, zone별 `collect.resource` allowlist, zone별 `clear.clearId` allowlist다.
- backend service 코드에 계속 남길 것은 unlock 조건, result payload validation, 지급 가능 여부 검증, idempotency 처리다.
- `collect.resource`는 zone별 허용 목록에 있어야 한다.
- `collect.amount`는 양의 정수여야 한다.
- `clear.clearId`는 zone별 허용 목록에 있어야 한다.
- 현재 `clearId`는 중복 방지 id가 아니라 activity type이다.
- 중복 지급 방지가 필요하면 `clearId`와 별도의 `idempotencyKey`를 보낸다.
- backend는 처리한 `idempotencyKey`를 progress에 기록하고, replay 요청에는 reward를 다시 지급하지 않는다.
- host reward 지급은 frontend 직접 지급으로 늘리지 말고 backend `clear` action에서 처리한다.
- `clear` 응답은 zone state와 host state를 함께 반환할 수 있다.
- frontend bootstrap은 `clear` 응답의 `host`만 `actionApiSync`로 병합한다.
- dynamic reward가 필요하면 `result` payload를 받고 service에서 값 범위를 검증한 뒤 계산한다.
- 동적 보상은 result를 고려한다. 예: memory는 `moves`, mine은 `oreFound` 같은 값을 service가 검증한 뒤 계산한다.
- zone action은 backend에서 `active`와 `unlockCondition`을 먼저 검사한다.
- 명시적 해금은 `my-island.unlockedZones`에 module id 또는 짧은 zone id가 있을 때 통과시킨다.
- 잠긴 zone의 collect/clear는 403 `zone_locked`로 실패해야 한다.

zone `balance.csv` 유지 기준:

- 숫자 reward, resource allowlist, clearId allowlist는 data/config 값으로 본다.
- unlock condition과 validation을 CSV만으로 표현하려고 하지 않는다.
- CSV parser나 컬럼을 바꾸면 schema validation과 backend persistence test를 함께 추가한다.
- CSV 값이 잘못됐을 때 서버가 조용히 뜨지 않도록 startup/check 단계에서 실패시키는 쪽을 우선한다.

customs:

```txt
GET  /api/customs/rules
GET  /api/customs/logs
POST /api/customs/apply
```

## 7. Module 저장소/API 추가 절차

1. 소유권을 정한다.
   - 계정/session 성격은 account.
   - 광역 재화와 inventory는 host.
   - 모듈 내부 진행 상태는 해당 module.
   - 모듈 간 자원 이동은 customs.

2. 저장소를 고른다.
   - 단순 임시 상태는 `moduleStates` fallback을 쓸 수 있다.
   - 검증, index, transaction, query-heavy 데이터가 필요하면 dedicated collection을 만든다.

3. model spec을 추가한다.
   - `packages/backend/src/modules/modelSpecs.ts`에 module storage 명세를 추가한다.
   - dedicated collection이면 collection name, owned fields를 명확히 적는다.

4. repository를 연결한다.
   - Mongo repository와 memory repository를 모두 확인한다.
   - `moduleRepositoryRegistry`에 module id를 등록한다.
   - `pnpm --filter backend check:model-specs`로 spec과 repository 등록이 맞는지 확인한다.

5. API를 만든다.
   - 단순 상태 sync는 `GET/PUT/PATCH /api/modules/{moduleId}/state`를 사용한다.
   - rule-heavy 기능은 `POST /api/modules/{moduleId}/{action}`으로 만든다.
   - route는 얇게, service는 명확하게, repository 호출은 한 방향으로 둔다.

6. 자원 이동이 있으면 customs에 연결한다.
   - module `customs.csv`에 rule을 추가한다.
   - source/target resource ref를 검증 가능한 형태로 작성한다.
   - module resource field가 특수하면 `moduleResourceRegistry.ts`에 binding을 추가한다.
   - idempotency key와 audit log를 확인한다.

7. frontend와 연결한다.
   - frontend는 module action API 또는 module state API를 호출한다.
   - action 응답은 `actionApiSync.ts` 또는 module facade를 통해 Zustand에 merge한다.
   - 신규 runtime code에서 통합 state API 호출을 추가하지 않는다.

8. 검증한다.
   - `pnpm --filter backend check:model-specs`
   - `pnpm --filter backend typecheck`
   - `pnpm test packages/backend/src/backendPersistence.test.ts`
   - 필요 시 `pnpm smoke:backend:persistence`

repository 동작 테스트 기준:

- dedicated repository를 추가하면 `backendPersistence.test.ts`의 공통 repository 동작 테스트 대상에 포함한다.
- `getOrCreate(uid, seed)`는 새 문서 생성 시 seed를 반영해야 한다.
- 이미 문서가 있으면 `getOrCreate(uid, secondSeed)`가 기존 문서를 덮어쓰면 안 된다.
- `patch(uid, patch)`는 기존 필드를 유지하면서 patch 필드를 반영해야 한다.
- patch 이후 `getOrCreate(uid)`가 patch된 결과를 돌려줘야 한다.
- `createdAt`, `updatedAt` 기본 timestamp가 있어야 한다.

## 8. Customs 작업 규칙

customs는 모듈 간 자원 이동의 권위 계층이다.

현재 운용 상태:

- 현재 customs rule set은 완성 밸런스가 아니라 POC/검증/초기 플레이 루프 확인용 임시 체제다.
- `packages/backend/src/customs/rules.ts`의 활성 module 목록은 지금 backend에서 실제로 loader가 읽는 범위다.
- 현재 활성 rule을 줄이거나 삭제하는 작업은 zone, route, ship의 실제 자원 루프가 확정된 뒤에 한다.
- 지금 단계에서는 rule 정리보다 idempotency, audit log, adapter 경계, smoke 재현성을 우선한다.
- 새 rule을 추가할 때는 테스트/POC용인지 운영 후보인지 description 또는 관련 문서에 남긴다.

규칙:

- registered rule 기반 apply를 기본 경로로 사용한다.
- production에서는 ad-hoc apply를 기본 차단한다.
- `customs.csv`에는 `debitAmount`, `creditAmount`를 명시한다.
- source module은 해당 `customs.csv`를 소유한 module id와 일치해야 한다.
- host resource ref에는 `moduleId`를 넣지 않는다.
- module resource ref에는 `moduleId`가 반드시 있어야 한다.
- module id로 `host`, `global` 같은 예약어를 쓰지 않는다.
- transaction이 꺼진 local 환경에서는 target credit 실패 시 source debit을 보상 rollback한다.
- rollback 실패는 별도 audit error로 남긴다.

customs 관련 주요 파일:

```txt
packages/backend/src/customs/rules.ts
packages/backend/src/routes/customs.ts
packages/backend/src/resources/resourceAdapter.ts
packages/backend/src/resources/moduleResourceAdapter.ts
packages/backend/src/resources/moduleResourceRegistry.ts
```

customs 테스트 기준:

- 성공 케이스는 source debit과 target credit이 adapter 경계 안에서 반영되는지 확인한다.
- source debit 불가 케이스는 409 `insufficient_resource`와 failure log를 확인한다.
- transaction이 꺼진 credit 실패 케이스는 source debit 보상 rollback을 확인한다.
- idempotency replay 케이스는 같은 key로 중복 log가 생성되지 않는지 확인한다.
- 새 resource adapter를 추가하면 성공/실패/replay 중 영향을 받는 케이스를 갱신한다.
- ship/lodge 이동은 `ship/customs.csv`와 `lodge/customs.csv`의 registered rule로 확인한다.
- 실제 외부 도착 섬 모듈이 생기면 해당 source module의 `customs.csv`에 `destination-island -> ship` 또는 `destination-island -> host` rule을 추가한다.

rule 정리를 보류하는 기준:

- route-neighbor와 ship 사이의 cargo/resource 교환이 아직 확정되지 않았다.
- zone clear reward와 customs 변환이 같은 자원을 동시에 다루는지 아직 확정되지 않았다.
- PM/밸런스 문서에서 최종 ratio가 확정되지 않았다.
- smoke 또는 backendPersistence test가 현재 rule에 의존한다.

위 조건 중 하나라도 해당하면 rule 삭제 대신 `description`과 문서로 임시 상태를 표시한다.

## 9. Auth 작업 규칙

backend route는 uid를 직접 header/query/body에서 파싱하지 않는다. 공통 auth middleware를 통한다.

social login session 동기화:

- `/api/auth/session`을 사용한다.
- `/api/auth/session`은 Firebase/legacy middleware가 확인한 uid를 기준으로 `users` document를 upsert한다.
- 허용 provider는 `google`, `twitter`, `firebase`다.
- provider profile metadata는 `users.authProvider`, `users.email`, `users.displayName`, `users.photoURL`에 저장한다.
- auth session 생성은 module-local 상태를 만들거나 수정하지 않는다.

production 목표 상태:

```txt
auth.firebaseAuthRequired=true
auth.firebaseAdminEnabled=true
auth.legacyUidFallbackEnabled=false
```

검증:

```bash
pnpm --filter backend check:auth-production
pnpm --filter backend check:auth-firebase-token
```

설명:

- `check:auth-production`은 Firebase Admin env가 없는 production backend가 조용히 fallback으로 뜨지 않는지 확인한다.
- `check:auth-firebase-token`은 `AUTH_TEST_ID_TOKEN`이 있을 때 Bearer token 경로를 확인한다.
- `AUTH_TEST_ID_TOKEN`이 없으면 이 검증은 skipped로 끝난다.

## 10. Codex Action 작업 규칙

Codex action은 diary, codex slot, full registration 상태를 관리한다.

규칙:

- route는 request parsing과 service error mapping만 담당한다.
- diary/entry id의 존재 여부는 service에서 검증한다.
- diary id는 소유 Aidong과 매핑되어야 한다.
- diary unlock과 slot unlock은 해당 Aidong이 영입된 뒤에만 허용한다.
- full registration은 해당 Aidong이 영입되어 있고 codex slot이 먼저 unlock된 뒤에만 허용한다.
- 중복 unlock/register 요청은 실패시키지 않고 기존 state를 반환한다.
- 존재하지 않는 id는 400 계열 error로 반환한다.
- 잠금 조건 미충족은 409 계열 error로 반환한다.

관련 파일:

```txt
packages/backend/src/modules/codex/service.ts
packages/backend/src/modules/codex/routes.ts
packages/frontend/src/lib/codexBootstrap.ts
packages/modules/codex/src/actions.ts
```

## 11. Route/Ship 항해 세션 경계

2026-06-13 기준으로 항해 진행 상태의 권위는 DB가 아니라 브라우저 탭/창별 세션이다.

이전 POC에서는 `routeNeighborStates.currentRoute`, `routeNeighborStates.boardPosition`, `shipStates`의 항구/선박 상태를 현재 항해 진행처럼 다루는 임시 계약이 있었다. 이제 그 방향으로 새 코드를 늘리지 않는다.

DB에 저장하지 않는 것:

- 현재 배가 출항 중인지 항구에 정박 중인지.
- 현재 항해 route id.
- 현재 보드 칸 또는 `boardPosition`.
- 현재 탭에서만 유효한 landing 후보.
- 항해 창을 닫으면 사라져도 되는 encounter 선택 상태.

DB에 저장하는 것:

- 주사위 소모와 지급.
- host inventory/resource 증감.
- Aidong 영입.
- 마이섬 slot 편입.
- 도감템, 성장 재료, 보상 ledger처럼 계정에 남아야 하는 결과.
- 필요한 경우 customs/audit log.

`route-neighbor` 책임:

- 항해 route catalog, board rule, landing/encounter generator를 제공한다.
- `roll` 또는 landing 관련 API가 결과 후보를 반환할 수는 있다.
- 반환된 현재 위치와 landing 후보는 호출한 frontend 세션의 진행 정보로 취급한다.
- 보상 확정 action은 주사위 소모, reward 지급, 영입 같은 영속 결과만 DB에 반영한다.
- 새 코드에서 `currentRoute`와 `boardPosition`을 user-level 영속 진행 상태로 쓰지 않는다.

`shipStates` 책임:

- `shipTypeId`, 선실/갑판 구성, 선실 꾸미기, 선박 inventory 호환 필드 같은 영속/호환 정보를 가진다.
- `shipStates`는 현재 배가 나가 있는지 여부를 저장하지 않는다.
- 항구 화면은 항상 배가 정박한 것으로 표시한다.
- 같은 계정이 여러 항해 창을 열어도 `shipStates`가 세션 간 mutex 역할을 하면 안 된다.

frontend/session 책임:

- 항해 시작 시 해당 탭/창에 새 항해 세션을 만든다.
- 현재 route, 현재 칸, 세션 내 landing 후보를 session state에 둔다.
- 항해 창을 닫으면 세션 상태는 사라지고 게임적으로 자동 마이섬 복귀로 본다.
- 항해 중인 탭이 있어도 다른 탭의 항구 화면은 정박 상태를 보여준다.
- 같은 탭에서 항구로 돌아와 항해 시작을 다시 누르면 처음부터 새 세션을 시작한다.

현재 회귀 테스트 기준:

- backend persistence test는 영속 결과가 올바른 collection에 기록되는지 확인한다.
- 항해 세션 자체가 DB에 남는지 확인하는 테스트를 추가하지 않는다.
- smoke가 `currentRoute`/`boardPosition` 영속 저장을 기대한다면 smoke 기준을 수정한다.
- 신규 smoke는 “항구가 DB 출항 flag를 보지 않는다”, “주사위 소모와 보상 지급은 DB에 남는다”를 분리해서 확인한다.
## 12. Health 확인

backend가 정상적으로 뜨면 `/health`에서 최소한 아래 값을 확인한다.

```txt
mongo.connected
migration.legacyStateApiRemoved
migration.repositories.backend
migration.repositories.dedicatedModuleIds
auth.nodeEnv
auth.firebaseAdminEnabled
auth.firebaseAuthRequired
auth.legacyUidFallbackEnabled
```

확인 기준:

- Mongo 검증 중이면 `mongo.connected=true`.
- 상태 API 제거 완료 상태는 `migration.legacyStateApiRemoved=true`로 확인한다.
- Mongo repository 검증 중이면 `migration.repositories.backend=mongo`.
- dedicated module id 목록에는 현재 dedicated storage를 가진 모듈들이 포함되어야 한다.
- production에서는 Firebase Admin과 Firebase Auth required 상태가 true여야 한다.

## 13. 자주 쓰는 명령

Mongo 연결 확인:

```bash
pnpm check:mongo
```

Atlas 사용 확정 뒤 전환 확인:

```bash
pnpm check:mongo:atlas
```

현재 상태:

- Atlas는 현재 사용하지 않으므로 이 명령은 보류 상태다.
- 실제 Atlas URI와 credential이 준비된 뒤에만 실행한다.
- 실행 시 `MONGO_URI`는 `mongodb+srv://` 형식이어야 하고 `MONGO_CONNECT_REQUIRED=true`여야 한다.

backend model spec 확인:

```bash
pnpm --filter backend check:model-specs
```

backend typecheck:

```bash
pnpm --filter backend typecheck
```

backend persistence test:

```bash
pnpm test packages/backend/src/backendPersistence.test.ts
```

workspace 정적 검증:

```bash
pnpm typecheck
```

local Mongo 기반 backend 실행:

```bash
pnpm dev:mongo:local
pnpm dev:be
```

persistence smoke:

```bash
pnpm smoke:backend:persistence
```

module action smoke:

```bash
pnpm check:module-actions-smoke
```

local live smoke 전체 묶음:

```bash
pnpm check:live-smoke:local
```

실행 순서:

```text
1. pnpm dev:mongo:local
2. local Mongo TCP ready 대기
3. pnpm dev:be:local-mongo
4. backend /health ready 대기
5. pnpm dev:fe
6. frontend ready 대기
7. pnpm check:module-actions-smoke
8. pnpm check:e2e:smoke
9. pnpm check:state-route-runtime
10. child process cleanup
```

확인 기준:

- `/health`에서 `mongo.connected=true`를 확인한다.
- `/health`에서 `migration.legacyStateApiRemoved=true`를 확인한다.
- `/health`에서 `migration.repositories.backend=mongo`를 확인한다.
- backend module action smoke가 6월 POC 수직 루프를 통과한다.
- Playwright route smoke가 core route, AREA-01~15, legacy redirect, 세관 UI 비강제 상태를 통과한다.
- state-route runtime check가 `/api/state` 복귀와 legacy state route 재등장을 막는다.

주의:

- 이 명령은 local MongoDB, backend, frontend를 실제로 띄운다.
- 기본 Mongo URI는 `mongodb://127.0.0.1:27017/idongworld`이다.
- local standalone MongoDB 기준이므로 transaction은 기본 `false`다.
- 실행 중 실패하면 출력된 하위 명령 이름을 기준으로 backend smoke, Playwright smoke, runtime check 중 어느 층이 깨졌는지 먼저 나눈다.

실행 전제:

- 다른 터미널에서 `pnpm dev:be:local-mongo`로 backend server를 먼저 실행한다.
- local MongoDB가 켜져 있어야 한다.
- 기본 접속 대상은 `http://localhost:4000`이다.
- 다른 backend 주소를 확인하려면 `BACKEND_URL` 환경 변수를 지정한다.

확인 대상:

- `my-aidong`: recruit, affinity, outfit, Aidong item equip toggle.
- `my-island`: unlock-zone, tutorial complete.
- `codex`: unlock-slot, unlock-diary, fully-register.
- `lodge`: config, Aidong assign, customs로 전역 보관소 이동.
- `route-neighbor`: start, roll, landing current, landing clear, end.
- `ship`: config, type change, cabin/deck assign, harbor assign, harbor charge, customs로 숙소/전역 보관소 이동.
- `zone-garden`: collect, clear.
- action 결과가 각 module dedicated state와 host state에 반영되는지 확인한다.

2026-06-01 기준 `check:module-actions-smoke` 최소 포함 범위:

- ship type 변경과 작은 배 변경 시 cabin capacity 초과 Aidong의 deck overflow 배치.
- ship cabin/deck assign 중복 방지.
- lodge Aidong assign toggle.
- route-neighbor roll, landing current, landing clear.
- my-aidong Aidong item equip toggle.
- ship inventory에서 lodge inventory로 이동하는 customs rule.
- ship inventory에서 host inventory로 이동하는 customs rule.
- lodge inventory에서 host inventory로 이동하는 Aidong item customs rule.

최소 플레이 플로우 smoke:

```bash
pnpm check:state-route-static
pnpm check:module-actions-smoke
pnpm check:state-route-runtime:local
```

frontend runtime까지 최소 확인이 필요한 경우:

```bash
pnpm dev:mongo:local
pnpm dev:be
pnpm dev:fe
pnpm check:frontend:state-route-runtime
```

수동 QA 체크리스트:

- guest login 또는 Firebase login 이후 uid가 잡히는지 확인한다.
- onboarding 완료 후 account state와 host name이 유지되는지 확인한다.
- first gacha 또는 Aidong recruit 이후 `myAidongStates`에 영입 상태가 반영되는지 확인한다.
- zone clear 이후 zone document와 host reward가 backend 응답 기준으로 반영되는지 확인한다.
- codex unlock/register가 codex document에 반영되는지 확인한다.
- route-neighbor roll/clear가 주사위 소모와 보상 지급 같은 영속 결과만 DB에 반영하는지 확인한다. 현재 route/current cell/출항 여부 저장을 기대하지 않는다.
- 화면 흐름 중 `/api/state` 호출이나 직접 legacy state sync가 다시 나타나지 않는지 확인한다.

현재 기준:

- 이 체크리스트는 전체 QA가 아니라 최소 smoke다.
- 2026-05-29 실행 결과는 `.cloud/01_project_history_current_2026-06-13.md`에 기록했다.
- 현재 자동 runtime gate는 통과했지만, 실제 클릭 기반 E2E 자동화는 아직 도입하지 않는다.
- 실패하면 관련 action API, repository, frontend facade/sync 경계부터 확인한다.
- Playwright 같은 본격 E2E 자동화는 화면 플로우가 더 안정된 뒤에 추가한다.

## 14. 작업 전 체크리스트

- 변경하려는 상태의 소유 module을 확인했다.
- 다른 module document를 직접 수정하지 않는다.
- 자원 이동이면 customs rule과 resource adapter를 먼저 확인했다.
- route에 domain logic을 넣지 않고 service로 분리했다.
- repository registry와 model spec이 일치한다.
- local Mongo와 memory fallback 모두 깨지지 않는다.
- production auth fallback이 열리지 않는다.
- 실제 secret을 문서나 코드에 남기지 않는다.

## 변경 기록

- **2026-05-29**: 최소 플레이 플로우 smoke 기준을 추가했다. `check:state-route-static`, `check:module-actions-smoke`, 필요 시 frontend runtime check와 수동 QA 체크리스트로 E2E 전 단계의 최소 검증을 수행한다.
- **2026-06-01**: Ship/Lodge customs rule 1차 구현 상태를 반영했다. `ship/customs.csv`, `lodge/customs.csv` registered rule과 module action smoke의 ship -> lodge, ship -> host, lodge -> host 검증을 추가했다.
- **2026-06-01**: Route landing mission flow 1차 구현 상태를 반영했다. `roll` landing 후보, current/clear API, 임시 deck-cargo reward 적립, module action smoke 검증 기준을 추가했다.
- **2026-06-01**: Aidong item 전역 보관/착용 계약을 반영했다. `hostStates.inventory` 소유권, `myAidongStates.equippedItems` 착용 상태, `/api/modules/my-aidong/items/equip-toggle` API, `my-aidong/items.csv` catalog 기준을 추가했다.
- **2026-06-01**: 2026-05-29-2 작업 보드의 smoke 기준을 완료 상태로 반영했다. ship type/slot, lodge assign, route landing, Aidong item, ship/lodge/customs transfer는 `check:module-actions-smoke`의 최소 검증 범위이며, live smoke는 backend server와 local MongoDB 실행 후 수행한다.
- **2026-06-01**: local MongoDB와 backend server를 실행한 상태에서 `pnpm check:module-actions-smoke`를 통과했다. Mongo repository 연결, legacy state API 제거 상태, ship/lodge/route/customs/Aidong item/zone-garden action 흐름이 live smoke에서 확인됐다.
- **2026-05-29**: Atlas를 future option으로 보류했다. 현재는 Atlas를 사용하지 않고 local MongoDB 기준 개발을 유지하며, 실제 사용 결정과 credential 준비 전에는 readiness 실행을 요구하지 않는다.
- **2026-05-29**: Zone reward/action rule config화 기준을 현행화했다. 보상 숫자와 zone별 allowlist는 `balance.csv`에서 읽고, unlock/validation/idempotency는 backend service 코드에 유지한다.
- **2026-05-29**: Route/Ship 임시 QA 기준을 보강했다. 이후 2026-06-13 기준으로 현재 항해 진행 상태는 DB 영속 기준에서 제외한다.
- **2026-05-29**: 실제 화면 기준 수동 QA 1차 결과를 기록했다. `pnpm check:state-route-runtime:local`로 local Mongo/backend/frontend runtime gate를 통과했고, 남은 클릭 QA 항목은 `.cloud/01_project_history_current_2026-06-13.md`에 분리했다.
- **2026-05-29**: Google/Twitter social login skeleton 기준을 추가했다. `/api/auth/session`은 provider metadata를 user document에 저장하고, module-local 상태는 건드리지 않는다.
- **2026-05-29**: Route/Ship 항해 상태 경계를 임시 계약으로 명시했다. 2026-06-13 이후에는 이 기준을 항해 세션 권위 분리 규칙으로 대체한다.
- **2026-05-29**: Customs rule 운용 상태를 임시 체제로 명시했다. 실제 플레이 루프 확정 전까지는 rule 삭제보다 POC/검증용 rule의 추적 가능성, adapter 경계, smoke 재현성을 우선한다.
- **2026-05-29**: module action smoke 실행 절차를 추가했다. `pnpm check:module-actions-smoke`는 backend server와 local Mongo가 떠 있는 상태에서 my-aidong, my-island, codex, route-neighbor, ship, zone-garden action 흐름을 확인한다. 실제 실행에서 route-neighbor end의 optional field 제거 문제를 발견해 repository patch의 undefined 처리 기준도 함께 고정했다.
- **2026-05-29**: customs 테스트 기준을 추가했다. 성공, insufficient failure, rollback, idempotency replay 케이스를 분리해 기록했다.
- **2026-05-29**: dedicated repository 동작 테스트 기준을 추가했다. getOrCreate/patch 공통 계약을 runbook에 기록했다.
- **2026-05-29**: Atlas 전환 전용 확인 명령과 절차를 추가했다. local check와 Atlas check를 분리했다.
- **2026-05-29**: Codex Action 작업 규칙을 추가했다. diary/slot/full registration 검증 기준과 관련 파일을 정리했다.
- **2026-05-29**: Zone unlock condition backend 검증 기준을 추가했다. active/unlockCondition, explicit unlock, zone_locked 실패 기준을 정리했다.
- **2026-05-29**: Zone clear idempotency 처리 기준을 추가했다. replay 요청에서는 progress와 reward를 재반영하지 않는다고 명시했다.
- **2026-05-29**: Zone host reward backend 이관 기준을 추가했다. `clear` 응답의 host state 병합과 dynamic reward result 검증 방식을 정리했다.
- **2026-05-29**: Zone action API 작성 기준을 추가했다. `collect`/`clear` validation, clearId 의미, reward authority 이동 원칙을 정리했다.
- **2026-05-29**: state route 제거 runtime gate `pnpm check:state-route-runtime:local` 통과를 확인했다.
- **2026-05-29**: runbook을 백엔드 작업자용 한글 매뉴얼로 재정리했다. 오래된 migration 설명과 누적 작업 로그를 제거하고, MongoDB, module storage/API, customs, auth, 검증 명령 중심으로 정리했다.
- **2026-05-29**: 상태 API 제거 상세 계획은 `.cloud/01_project_history_current_2026-06-13.md`로 분리했다.
- **2026-06-13**: M5 live smoke 실행 기준을 추가했다. `pnpm check:live-smoke:local`이 local Mongo, backend, frontend를 띄우고 module action smoke, Playwright route smoke, state-route runtime check를 순서대로 실행하는 기준 명령임을 기록했다.
- **2026-06-13**: 항해 세션 경계를 현행화했다. 출항/정박 여부, 현재 route, 현재 칸은 DB가 아니라 브라우저 탭/창별 세션 상태이며, DB에는 주사위 소모와 보상 같은 영속 결과만 남긴다.
- **2026-06-13**: route-neighbor 현재 API 계약을 runbook에 추가했다. start/roll/current/clear/end가 어떤 값을 응답하고 어떤 값을 DB에 저장하지 않는지 작업자용 기준으로 명시했다.