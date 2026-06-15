# 다음 작업 메모 2026-06-13 항해 세션 권위 구현

이 문서는 2026-06-13에 확정한 항해 세션 권위 변경을 실제 코드에 반영하기 위한 실행 보드다.

기준 문서:

```text
.cloud/01_project_history_current_2026-06-13.md
.cloud/02_module_creator_guide_2026-06-13.md
.cloud/20_module_rules.md
.cloud/30_backend_db_rules.md
.cloud/35_backend_db_runbook.md
.cloud/40_frontend_rules.md
.cloud/85_developer_onboarding_2026-06-12.md
packages/modules/BACKEND_GUIDE.md
```

## 핵심 결정

항해 진행 상태는 DB 권위가 아니다.

DB에 저장하지 않는 값:

- 배가 현재 출항 중인지 정박 중인지.
- 현재 route id.
- 현재 보드 칸.
- 세션 내 landing 후보.
- 탭을 닫으면 사라져도 되는 encounter 선택 상태.

브라우저 탭/창별 session state에 둘 값:

- 현재 항해 세션 id.
- 현재 route id.
- 현재 칸.
- 현재 주사위 이동 결과.
- 세션 내 landing 후보.
- 세션 내 임시 UI 선택값.

DB에 저장하는 값:

- 주사위 소모와 지급.
- host inventory/resource 증감.
- Aidong 영입.
- 마이섬 slot 편입.
- 도감템, 성장 재료, 보상 ledger.
- 필요한 경우 customs/audit log.

## 완료 목표

항구와 항해가 다음처럼 동작해야 한다.

- 항구 화면은 항상 배가 정박한 상태로 보인다.
- 항구에서 “배가 출항 중입니다” 같은 DB 기반 문구가 나오지 않는다.
- 항구에서 항해 시작을 누르면 그 탭의 새 항해 세션이 시작된다.
- 같은 계정으로 여러 탭에서 항해를 시작해도 서로 독립적으로 진행된다.
- 항해 탭을 닫으면 해당 탭의 항해 상태는 사라진다.
- 주사위 소모와 보상 지급은 backend action API를 통해 DB에 남는다.
- `currentRoute`, `boardPosition`, `isVoyaging`, `departed` 같은 값이 user/module DB 권위 상태로 남지 않는다.

## 1. 현재 코드 audit

- [x] `currentRoute`, `boardPosition`, `isVoyaging`, `departed`, `isDocked` 참조를 검색한다.
- [x] `route-neighbor` backend state/model/service/repository에서 현재 항해 진행을 저장하는 코드를 찾는다.
- [x] `ship` backend state/model/service/repository에서 출항/정박 상태처럼 쓰이는 코드를 찾는다.
- [x] frontend `userStore`, `syncStore`, `storeFacades`, `api`, 항구/항해 화면에서 항해 진행 상태를 persisted store로 쓰는 지점을 찾는다.
- [x] Playwright smoke나 backend smoke가 `currentRoute`, `boardPosition` 영속 저장을 기대하는지 확인한다.

감사 결과:

| 영역 | 파일 | 발견 내용 | 다음 처리 |
|---|---|---|---|
| backend model | `packages/backend/src/models/RouteNeighborStateModel.ts` | `currentRoute`, `boardPosition`이 route-neighbor Mongo schema에 영속 필드로 존재한다. | 5번에서 제거 또는 legacy/compat 필드로 격리한다. |
| backend default/spec | `packages/backend/src/repositories/moduleDefaults.ts`, `packages/backend/src/modules/modelSpecs.ts` | route-neighbor default와 model spec이 `currentRoute`, `boardPosition` 소유를 전제로 한다. | 5번에서 default/spec을 route catalog/landing/result 호환 중심으로 바꾼다. |
| backend route service | `packages/backend/src/modules/route-neighbor/service.ts` | `startRoute`가 `currentRoute`, `boardPosition`을 저장하고, `rollRoute`가 DB의 `boardPosition`을 이동시키며, `endRoute`가 초기화한다. | 5번 핵심 수정 대상. start/roll/end를 세션 결과 반환과 영속 결과 기록으로 재계약한다. |
| backend landing | `packages/backend/src/modules/route-neighbor/service.ts`, `landing.ts` | `getCurrentLanding`과 `clearCurrentLanding`이 DB `landings.last`를 세션 내 landing 후보처럼 사용한다. | 5번에서 session payload 기반 clear 또는 compat API로 분리한다. |
| backend ship lock | `packages/backend/src/modules/ship/service.ts` | `assertShipNotSailing`, `assertShipAssignmentContext`가 route-neighbor DB `currentRoute`를 보고 ship action을 막는다. | 6번에서 전역 출항 lock 제거. ship은 배 구성/꾸미기/인벤토리만 담당한다. |
| backend lodge lock | `packages/backend/src/modules/lodge/service.ts` | route-neighbor DB `currentRoute`를 보고 항해 중 Aidong 판단을 만든다. | 6번 또는 7번에서 세션 UI 판단으로 이동한다. DB 전역 출항 flag로 숙소 배치를 막지 않는다. |
| legacy user document | `packages/backend/src/models/UserModel.ts`, `memoryStore.ts`, user repositories | 통합 user 상태에 `currentRoute`, `boardPosition`, `harborAssignedChars` 계열 field가 남아 있다. | `/api/state`는 제거됐으므로 7번에서 신규 runtime sync 대상에서 제외하고 legacy 잔재로만 본다. |
| frontend persisted store | `packages/frontend/src/stores/userStore.ts` | `currentRoute`, `boardPosition`, `startVoyage`, `movePosition`, `endVoyage`가 persisted Zustand에 있다. | 2번/7번에서 별도 session store로 이동한다. |
| frontend sync | `packages/frontend/src/lib/syncStore.ts` | `SYNCED_KEYS`와 `ROUTE_NEIGHBOR_KEYS`가 `currentRoute`, `boardPosition`을 backend module state로 flush/hydrate한다. | 7번 핵심 수정 대상. persisted sync에서 제거한다. |
| frontend facade | `packages/frontend/src/lib/storeFacades.ts` | `routeNeighborStoreFacade`가 `userStore.currentRoute/boardPosition`을 노출한다. | 2번에서 session facade로 대체하거나 compat 이름으로 격리한다. |
| harbor UI | `packages/frontend/src/screens/HarborScene.tsx` | 항구가 `api.getModuleState('route-neighbor')`를 읽고 `현재 배가 항해 중입니다` alert, 출항/배치/배 변경 lock을 건다. | 3번 핵심 수정 대상. 항구는 항상 정박 화면을 보여야 한다. |
| voyage board UI | `packages/frontend/src/screens/NavigationBoardScene.tsx` | 보드 진입 시 DB route state를 검증하고, `getCurrentRouteLanding`으로 DB landing 후보를 복구한다. | 4번 핵심 수정 대상. 세션 state 없으면 항구로 보내고, 위치/landing은 세션에서만 관리한다. |
| bottom nav | `packages/frontend/src/components/BottomNav.tsx` | 하단 항해 버튼이 DB `route-neighbor.currentRoute`를 확인해 보드 또는 항구로 보낸다. | 4번에서 session 기준으로 변경한다. 세션 없으면 항구. |
| tests/smoke | `packages/backend/src/backendPersistence.test.ts`, `packages/backend/scripts/smoke-*.mjs`, `tests/e2e/app-smoke.spec.ts` | start/roll/end가 `currentRoute`, `boardPosition`을 영속 저장/초기화한다고 기대한다. | 8번 핵심 수정 대상. 영속 결과와 세션 비영속을 분리한다. |

판정:

- 1번 audit은 완료했다.
- 실제 수정은 2번부터 진행한다.
- 가장 먼저 만들 것은 frontend session state 경계다. 이 경계가 생겨야 항구/보드/store/sync/backend 계약을 안전하게 옮길 수 있다.

완료 기준:

- 제거/수정/호환 유지 대상을 표로 정리했다.

## 2. frontend 항해 세션 저장소 만들기

- [x] persisted Zustand `userStore` 바깥에 항해 세션 전용 저장 경계를 만든다.
- [x] 후보 이름은 `voyageSessionStore`, `useVoyageSession`, `voyageSession.ts` 중 기존 패턴에 맞춰 정한다.
- [x] 기본은 탭/창별 독립성을 보장하는 in-memory state 또는 `sessionStorage`를 사용한다.
- [x] localStorage 기반 `idongworld-user` persist에는 항해 세션 상태를 넣지 않는다.
- [x] 항해 세션 초기값은 “항해 없음”이다.
- [x] 항구에서 항해 시작을 누르면 새 session id, route id, current cell 0, landing 후보 없음으로 초기화한다.
- [x] 같은 탭에서 항구로 돌아와 다시 시작하면 기존 세션을 버리고 새로 시작한다.

처리 결과:

- `packages/frontend/src/lib/voyageSessionStore.ts`를 추가했다.
- `useVoyageSessionStore`는 Zustand store이지만 `idongworld-user` localStorage가 아니라 `idongworld-voyage-session` sessionStorage를 사용한다.
- `activeSession`에는 `sessionId`, `routeId`, `boardPosition`, `lastRoll`, `landing`, `startedAt`, `updatedAt`만 둔다.
- `startSession(routeId)`는 새 탭/창 세션을 current cell 0으로 시작한다.
- `applyRollResult`, `movePosition`, `setLanding`, `clearLanding`, `endSession` action을 제공한다.
- `storeFacades.ts`에서 `voyageSessionFacade`, `useVoyageSessionStore`, 관련 타입을 재수출했다.
- 아직 기존 화면은 이 store를 사용하지 않는다. 3번과 4번에서 항구/보드 화면을 이 facade로 교체한다.

검증:

```bash
pnpm --filter frontend typecheck
```

결과: 통과.

완료 기준:

- 항해 진행 상태가 `userStore` persist에 저장되지 않는 별도 저장 경계를 만들었다.
- 탭별 session state를 읽고 쓰는 frontend API가 생겼다.

## 3. 항구 화면 정박 기준으로 수정

- [x] 항구 화면에서 DB 값을 근거로 “출항 중” 상태를 표시하는 로직을 제거한다.
- [x] 항구 화면은 항상 배가 정박한 상태로 렌더링한다.
- [x] 항구의 항해 시작 버튼은 현재 탭의 항해 세션을 새로 만든다.
- [x] 출항 중 lock, 재출항 방지, 전역 배 mutex 성격의 UI 조건을 제거하거나 compat 주석으로 격리한다.
- [x] ship state의 배 종류, 선실, 갑판, 꾸미기 정보는 계속 표시한다.

처리 결과:

- `packages/frontend/src/screens/HarborScene.tsx`에서 `route-neighbor` module state 조회를 제거했다.
- 항구 화면에서 `currentRoute`, `boardPosition` 기반의 “현재 배가 항해 중입니다” 표시와 관련 lock 조건을 제거했다.
- 항구는 항상 정박 중인 배 관리 화면으로 렌더링한다.
- 배 변경, 선실/갑판 배치, 항구 지원 배치는 더 이상 DB 항해 상태 때문에 막히지 않는다.
- 출항 버튼은 `api.startRouteNeighbor`를 호출하지 않고 `voyageSessionFacade.startSession(route.id)`로 현재 탭/창의 session state를 만든 뒤 `/voyage/board?route=...`로 이동한다.
- 선실 꾸미기, 배 인벤토리, 배 종류 변경 등 ship 영속 상태 UI는 유지했다.

검증:

```bash
pnpm --filter frontend typecheck
rg -n "hasActiveVoyage|routeState|routeNeighborStoreFacade|ROUTE_ALIASES|toRouteStateView|startRouteNeighbor|현재 배가 항해 중|출항 중" packages/frontend/src/screens/HarborScene.tsx
Select-String -Path packages/frontend/src/screens/HarborScene.tsx -Pattern ([char]0xFFFD)
```

결과:

- frontend typecheck 통과.
- HarborScene 제거 대상 문자열 없음.
- 한글 깨짐 문자 없음.

완료 기준:

- 다른 탭에서 항해 중이어도 항구는 정박 화면으로 보인다.
- 항구에서 새 항해를 시작할 수 있다.

## 4. 항해 보드 화면을 session state 기준으로 수정

- [x] 항해 보드는 frontend 항해 세션이 있을 때만 현재 route/current cell을 표시한다.
- [x] URL 직접 진입 등으로 세션이 없으면 항구 또는 마이섬으로 안내한다.
- [x] roll 결과는 session state의 current cell과 landing 후보를 갱신한다.
- [x] 마이섬 복귀/항구 복귀 버튼은 session state만 비운다.
- [x] 복귀 action이 DB의 출항/정박 flag를 수정하지 않게 한다.

처리 결과:

- `packages/frontend/src/screens/NavigationBoardScene.tsx`가 `routeNeighborStoreFacade` 대신 `voyageSessionFacade`를 사용하게 바꿨다.
- 보드 진입 시 `route-neighbor` DB state를 조회해 현재 항해를 검증하던 흐름을 제거했다.
- 현재 route와 현재 칸은 `activeSession.routeId`, `activeSession.boardPosition`만 사용한다.
- URL 직접 진입 또는 세션이 없는 상태에서는 항구로 되돌린다.
- 주사위 이동 애니메이션은 `voyageSessionFacade.movePosition()`으로 session state만 갱신한다.
- backend roll API는 호환 플래그가 켜진 경우에만 호출하고, 응답의 landing 후보는 session state에 저장한다.
- 마이섬 복귀/항구 복귀는 `api.endRouteNeighbor()`를 호출하지 않고 `voyageSessionFacade.endSession()`만 수행한다.
- landing 완료/이동/일반 보상 처리 후 `voyageSessionFacade.clearLanding()`으로 세션 내 landing 후보를 비운다.
- `packages/frontend/src/components/BottomNav.tsx`의 항해 버튼도 DB 조회 없이 현재 탭의 session state가 있으면 보드로, 없으면 항구로 이동하게 바꿨다.

검증:

```bash
pnpm --filter frontend typecheck
rg -n "routeNeighborStoreFacade|api\.getModuleState\(uid, 'route-neighbor'\)|api\.endRouteNeighbor|api\.getCurrentRouteLanding|routeGuardChecking|항해 상태를 확인" packages/frontend/src/screens/NavigationBoardScene.tsx packages/frontend/src/components/BottomNav.tsx
Select-String -Path packages/frontend/src/screens/NavigationBoardScene.tsx,packages/frontend/src/components/BottomNav.tsx -Pattern ([char]0xFFFD),([char]0x0007),([char]0x000B)
```

결과:

- frontend typecheck 통과.
- 보드/하단 내비에서 제거 대상 DB 항해 상태 의존 문자열 없음.
- 한글 깨짐 문자와 제어문자 없음.

완료 기준:

- 항해 보드의 위치 정보는 DB reload로 복원되지 않는다.
- 탭을 새로 열면 별도 항해 세션으로 시작한다.

## 5. route-neighbor backend API 계약 정리

- [x] `start`가 DB에 `currentRoute`/`boardPosition`을 저장하지 않게 한다.
- [x] `roll`은 필요한 경우 주사위 소모를 DB에 반영하고, 이동 결과/landing 후보를 response로 반환한다.
- [x] `roll`이 현재 칸을 DB에 저장하지 않게 한다.
- [x] `landing/current`가 DB 저장 후보에 의존한다면 session 기반 호출로 대체하거나 compat API로 격리한다.
- [x] `landing/clear`는 세션에서 전달받은 landing payload 또는 idempotency key를 검증하고, 영속 보상만 DB에 기록한다.
- [x] `end`가 DB current route를 지우는 흐름이라면 신규 core에서는 사용하지 않거나 no-op/compat로 정리한다.

처리 결과:

- `packages/backend/src/modules/route-neighbor/service.ts`에서 `currentRoute`, `boardPosition`, `landings.last`를 현재 항해 진행 상태로 저장하던 흐름을 제거했다.
- `startRoute(uid, routeId)`는 route id 유효성, 승선 crew 조건만 확인하고 `{ routeId, boardPosition: 0, state }`를 반환한다. DB에는 시작 상태를 기록하지 않는다.
- `rollRoute(uid, steps, { routeId, boardPosition })`는 frontend session이 넘긴 route와 도착 칸을 검증한 뒤, host `diceCount` 차감과 landing 후보 응답만 처리한다. route-neighbor document에는 현재 칸을 저장하지 않는다.
- `getCurrentLanding(uid)`는 legacy endpoint 호환용으로 남기되, 현재 session landing 후보를 DB에서 복구하지 않고 `undefined`를 반환한다.
- `clearCurrentLanding(uid, landingId, { routeId, boardPosition })`는 DB의 `landings.last`가 아니라 `landingId` 또는 session payload로 landing 후보를 재구성한 뒤 보상을 지급한다.
- `landings.cleared`는 이미 지급한 landing의 audit/idempotency 성격으로 유지한다. 이것은 현재 위치가 아니라 영속 결과 이력이다.
- `endRoute(uid)`는 DB current route를 지우지 않고 현재 route-neighbor state를 반환하는 no-op 호환 endpoint로 바꿨다.
- `packages/backend/src/models/RouteNeighborStateModel.ts`, `packages/backend/src/repositories/moduleDefaults.ts`, `packages/backend/src/modules/modelSpecs.ts`에서 route-neighbor 영속 필드 소유 목록의 `currentRoute`, `boardPosition`을 제거했다.
- `packages/backend/src/modules/route-neighbor/routes.ts`는 `roll`과 `landing/clear`에서 `routeId`, `boardPosition` payload를 service로 전달한다.
- `packages/frontend/src/lib/api.ts`와 `packages/frontend/src/screens/NavigationBoardScene.tsx`도 새 payload를 보내도록 맞췄다.
- `packages/backend/src/backendPersistence.test.ts`, `packages/backend/scripts/smoke-module-actions.mjs`, `packages/backend/scripts/smoke-persistence.mjs`의 이전 영속 기대값을 새 계약에 맞춰 갱신했다.

검증:

```bash
pnpm --filter backend typecheck
pnpm --filter frontend typecheck
pnpm --filter backend check:model-specs
node --check packages/backend/scripts/smoke-module-actions.mjs
node --check packages/backend/scripts/smoke-persistence.mjs
rg -n "currentRoute|boardPosition" packages/backend/src/models/RouteNeighborStateModel.ts packages/backend/src/repositories/moduleDefaults.ts packages/backend/src/modules/modelSpecs.ts
Select-String -Path packages/backend/src/modules/route-neighbor/service.ts,packages/backend/src/modules/route-neighbor/routes.ts,packages/backend/src/models/RouteNeighborStateModel.ts,packages/backend/src/repositories/moduleDefaults.ts,packages/backend/src/modules/modelSpecs.ts,packages/frontend/src/lib/api.ts,packages/frontend/src/screens/NavigationBoardScene.tsx,packages/backend/scripts/smoke-module-actions.mjs,packages/backend/scripts/smoke-persistence.mjs -Pattern ([char]0xFFFD),([char]0x0007),([char]0x000B)
```

결과:

- backend typecheck 통과.
- frontend typecheck 통과.
- backend model spec 검사 통과.
- smoke script 문법 검사 통과.
- route-neighbor schema/default/spec에 `currentRoute`, `boardPosition` 없음.
- 한글 깨짐 문자와 제어문자 없음.

완료 기준:

- route-neighbor DB document에 현재 항해 진행 상태가 영속 저장되지 않는다.
- 주사위 소모와 보상 지급은 기존처럼 DB에 남는다.
## 6. ship backend 계약 정리

- [x] `shipStates`에서 출항/정박 여부처럼 해석되는 필드가 있는지 확인한다.
- [x] ship action이 항해 세션 lock이나 전역 출항 mutex로 동작하지 않게 한다.
- [x] ship은 배 종류, 선실, 갑판, 꾸미기, inventory 호환 필드만 담당하게 유지한다.
- [x] 항해 중 여부를 이유로 ship/lodge 배치를 전역 차단하는 backend rule이 있으면 제거하거나 compat로 격리한다.

처리 결과:

- `packages/backend/src/modules/ship/service.ts`에서 `route-neighbor.currentRoute`를 읽던 전역 출항 lock을 제거했다.
- 제거한 함수는 `assertShipNotSailing`, `assertShipAssignmentContext`다.
- `changeShipType`은 더 이상 DB 항해 상태 때문에 막히지 않는다.
- `assignCabinSlot`, `assignDeckSlot`은 더 이상 DB 항해 상태 때문에 막히지 않는다.
- `context: 'voyage'` 요청에서 “선실 비우기 -> 갑판 이동”, “갑판 하선 금지”, “현재 배에 탄 아이동만 항해 중 배 메뉴에서 재배치 가능” 같은 요청별 ship 배치 규칙은 유지했다. 이것은 DB의 출항/정박 상태 판단이 아니라 호출자가 선택한 action context의 규칙이다.
- `ship` backend의 책임은 배 종류, 항구 지원, 선실/갑판 배치, 선실 꾸미기, 배 인벤토리 호환 필드 관리로 한정했다.
- `packages/backend/src/backendPersistence.test.ts`에 route start 이후에도 `changeShipType`이 동작하는 회귀 방지 assertion을 추가했다.
- `packages/backend/scripts/smoke-module-actions.mjs`의 단계 문구를 “voyage guard”가 아니라 “route start prerequisite”로 정리했다.

검증:

```bash
pnpm --filter backend typecheck
node --check packages/backend/scripts/smoke-module-actions.mjs
rg -n "assertShipNotSailing|assertShipAssignmentContext|ship_is_sailing|currentRoute|route-neighbor" packages/backend/src/modules/ship
Select-String -Path packages/backend/src/modules/ship/service.ts,packages/backend/src/backendPersistence.test.ts,packages/backend/scripts/smoke-module-actions.mjs -Pattern ([char]0xFFFD),([char]0x0007),([char]0x000B)
```

결과:

- backend typecheck 통과.
- smoke script 문법 검사 통과.
- `ship` module 코드에는 route-neighbor DB 기반 lock 참조가 남아 있지 않다. 남은 `route-neighbor` 문자열은 “읽지 않는다”는 상단 주석뿐이다.
- 한글 깨짐 문자와 제어문자 없음.

완료 기준:

- ship DB state는 배 구성과 영속 보유 상태만 표현한다.
- 현재 항해 중인지 여부를 ship DB state로 판단하지 않는다.

## 7. frontend sync와 persisted field 정리

- [x] `SYNCED_KEYS` 또는 hydrate/flush 대상에 `currentRoute`, `boardPosition`이 포함되어 있으면 제거하거나 legacy/compat로 분리한다.
- [x] `userStore` 타입에서 voyage runtime field가 계속 필요하면 “legacy/compat only” 주석을 달거나 session store로 이동한다.
- [x] action API 응답 병합에서 현재 항해 위치를 persisted store에 병합하지 않는다.
- [x] session state와 DB state 이름이 섞이지 않도록 type 이름을 정리한다.

처리 결과:

- `packages/frontend/src/lib/syncStore.ts`에서 `SYNCED_KEYS`의 `currentRoute`, `boardPosition`을 제거했다.
- `syncStore`의 flush/hydrate 대상에서 `route-neighbor` module state를 제외했다. 이제 frontend auth bootstrap은 route-neighbor DB state를 `userStore`에 병합하지 않는다.
- `previewSplitSyncPatches()`의 `routeNeighbor`는 빈 patch만 반환한다. 현재 항해 진행 상태는 sync 대상이 아니라 session store 대상이다.
- `packages/frontend/src/lib/actionApiSync.ts`에 `RUNTIME_ONLY_KEYS` 방어막을 추가했다. backend action 응답에 legacy `currentRoute`, `boardPosition`이 섞여 와도 `userStore`에 병합하지 않는다.
- `packages/frontend/src/stores/userStore.ts`의 `currentRoute`, `boardPosition`, `startVoyage`, `movePosition`, `endVoyage`는 legacy localStorage 항해 구현으로 주석 처리했다. 신규 화면은 `voyageSessionStore`를 사용해야 한다.
- `packages/frontend/src/lib/storeFacades.ts`의 `routeNeighborStoreFacade`도 legacy facade로 명시했다. 신규 항해 화면은 `voyageSessionFacade`를 사용한다.
- `packages/frontend/src/screens/LodgeScene.tsx`에서 `route-neighbor.currentRoute` 조회를 제거했다. 숙소는 DB의 현재 항해 상태를 근거로 Aidong을 “항해 중” 처리하지 않고, 항구 지원 배치 상태만 ship state에서 읽는다.

검증:

```bash
pnpm --filter frontend typecheck
rg -n "api\.getModuleState\(uid, 'route-neighbor'\)|currentRoute|boardPosition|hasActiveVoyage|routeState" packages/frontend/src/lib/syncStore.ts packages/frontend/src/lib/actionApiSync.ts packages/frontend/src/screens/LodgeScene.tsx packages/frontend/src/stores/userStore.ts packages/frontend/src/lib/storeFacades.ts
Select-String -Path packages/frontend/src/lib/syncStore.ts,packages/frontend/src/lib/actionApiSync.ts,packages/frontend/src/stores/userStore.ts,packages/frontend/src/lib/storeFacades.ts,packages/frontend/src/screens/LodgeScene.tsx -Pattern ([char]0xFFFD),([char]0x0007),([char]0x000B)
```

결과:

- frontend typecheck 통과.
- `syncStore`, `actionApiSync`, `LodgeScene`에는 route-neighbor DB 현재 항해 상태 조회가 남아 있지 않다.
- `userStore`와 `routeNeighborStoreFacade`의 `currentRoute`, `boardPosition` 참조는 legacy/compat 주석이 붙은 잔여 field로만 남아 있다.
- 한글 깨짐 문자와 제어문자 없음.

완료 기준:

- persisted Zustand에 현재 항해 진행 상태가 신규 sync 대상으로 남지 않는다.
- frontend hydrate 후 항해 세션이 자동 복구되지 않는다.

## 8. 테스트와 smoke 갱신

- [x] backend persistence test에서 `currentRoute`/`boardPosition` 영속 저장 기대를 제거한다.
- [x] route-neighbor 테스트는 주사위 소모와 보상 지급 같은 영속 결과만 확인한다.
- [x] frontend 또는 Playwright smoke에 항구 화면이 항상 정박 상태로 보이는지 확인하는 케이스를 추가한다.
- [x] 가능하면 sessionStorage/localStorage 검사로 항해 세션이 `idongworld-user` persist에 들어가지 않는지 확인한다.
- [x] core smoke와 compat smoke 분리 작업의 선행 조건으로 이 변경을 문서화한다.

처리 결과:

- `packages/backend/src/backendPersistence.test.ts`는 이미 5번 작업에서 새 계약에 맞춰져 있음을 확인했다.
  - `startRoute`는 `routeId`, 초기 `boardPosition`을 응답으로만 반환하고, state에는 `currentRoute`, `boardPosition`을 저장하지 않는다고 검증한다.
  - `rollRoute`는 session payload의 `routeId`, `boardPosition`을 받아 주사위 소모와 landing 후보 응답만 확인한다.
  - `landing/clear`는 `landings.last`가 아니라 `landings.cleared` 같은 영속 결과만 확인한다.
  - `endRoute`는 current route/board position을 DB에서 지우는 action이 아니라 no-op compat 응답임을 확인한다.
- `packages/backend/scripts/smoke-module-actions.mjs`, `packages/backend/scripts/smoke-persistence.mjs`, `packages/backend/scripts/smoke-state-route-removed.mjs`의 문법 검사를 통과했다.
- `tests/e2e/app-smoke.spec.ts`에 항구 화면이 항상 정박 화면인지 확인하는 smoke를 추가했다.
  - `/island/harbor`에서 `현재 배가 항해 중입니다`, `출항 중` 문구가 나오지 않는지 확인한다.
- `tests/e2e/app-smoke.spec.ts`에 storage 분리 검증을 추가했다.
  - `localStorage`의 `idongworld-user`에 legacy `currentRoute`, `boardPosition`을 넣어도 `/voyage/board?route=neighbor` 직접 진입은 항구로 돌아간다.
  - `sessionStorage`의 `idongworld-voyage-session`에 현재 항해 세션을 넣으면 보드로 진입한다.
  - 이때 `idongworld-user`에는 `activeSession`이나 해당 session id가 들어가지 않는다.
- Playwright 전체 smoke 실행은 별도 frontend/backend dev server가 필요하므로 이번 단계에서는 `pnpm check:e2e:smoke --list`로 spec 수집과 파싱만 확인했다. 실제 브라우저 구동 smoke는 서버를 띄운 뒤 실행한다.

검증:

```bash
pnpm --filter frontend typecheck
pnpm --filter backend typecheck
pnpm --filter backend check:model-specs
pnpm test packages/backend/src/backendPersistence.test.ts
pnpm check:e2e:smoke --list
node --check packages/backend/scripts/smoke-module-actions.mjs
node --check packages/backend/scripts/smoke-persistence.mjs
node --check packages/backend/scripts/smoke-state-route-removed.mjs
Select-String -Path tests/e2e/app-smoke.spec.ts -Pattern ([char]0xFFFD),([char]0x0007),([char]0x000B)
```

결과:

- frontend typecheck 통과.
- backend typecheck 통과.
- backend model spec 검사 통과.
- `backendPersistence.test.ts` 39개 테스트 통과.
- Playwright smoke spec 수집 통과.
- backend smoke script 문법 검사 통과.
- e2e spec 한글 깨짐 문자와 제어문자 없음.

완료 기준:

- 항해 현재 상태 비영속 원칙이 테스트로 깨지지 않게 된다.

## 9. 문서와 changelog 현행화

- [x] 구현 결과를 `.cloud/01_project_history_current_2026-06-13.md`에 반영한다.
- [x] `.cloud/30_backend_db_rules.md`, `.cloud/35_backend_db_runbook.md`, `.cloud/40_frontend_rules.md`의 구현 완료 상태를 갱신한다.
- [x] `packages/modules/BACKEND_GUIDE.md`에 실제 변경된 API 계약을 반영한다.
- [x] `.cloud/89_next_work_2026-07-01.md`의 core/compat smoke 분리 항목과 연결한다.
- [x] 한글 깨짐 문자와 BEL 제어문자를 검사한다.

처리 결과:

- `.cloud/01_project_history_current_2026-06-13.md`에 항해 세션 권위 구현 완료 상태를 추가했다.
- `.cloud/30_backend_db_rules.md`에 route-neighbor schema/default/spec, start/roll/clear/end 계약, ship lock 제거, frontend sync 제외 기준을 추가했다.
- `.cloud/35_backend_db_runbook.md`에 route-neighbor 현재 API 계약을 작업자용으로 정리했다.
- `.cloud/40_frontend_rules.md`에 `voyageSessionStore`, `voyageSessionFacade`, `syncStore` 제외 대상, `actionApiSync` 방어막, Playwright storage smoke 기준을 추가했다.
- `packages/modules/BACKEND_GUIDE.md`에 모듈 제작자가 따라야 할 route-neighbor API 계약을 추가했다.
- `.cloud/89_next_work_2026-07-01.md`의 깨진 코드블록을 복구하고, M6 core/compat smoke 분리의 선행 전제로 항해 세션 권위 구현 완료 상태를 연결했다.

검증:

```bash
Select-String -Path .cloud/01_project_history_current_2026-06-13.md,.cloud/30_backend_db_rules.md,.cloud/35_backend_db_runbook.md,.cloud/40_frontend_rules.md,packages/modules/BACKEND_GUIDE.md,.cloud/89_next_work_2026-07-01.md -Pattern ([char]0xFFFD),([char]0x0007),([char]0x000B)
```

결과:

- 갱신한 문서에서 한글 깨짐 문자와 BEL/VT 제어문자 없음.

완료 기준:

- 다음 작업자가 문서만 보고도 항해 세션 상태를 DB에 다시 넣지 않는다.

## 권장 진행 순서

한 번에 대규모로 바꾸지 말고 아래 순서로 진행한다.

1. audit로 현재 저장 지점을 찾는다.
2. frontend session store를 만든다.
3. 항구 화면을 항상 정박 기준으로 고친다.
4. 항해 보드를 session 기준으로 고친다.
5. route-neighbor backend에서 현재 위치 영속 저장을 제거한다.
6. ship backend의 전역 출항 lock 성격을 제거한다.
7. sync/persist 대상에서 현재 항해 상태를 뺀다.
8. 테스트와 smoke를 맞춘다.
9. 문서를 구현 완료 상태로 갱신한다.

## 변경 기록

- **2026-06-13**: 항해 세션 권위 변경 구현을 위한 next work를 작성했다. 현재 항해 진행 상태는 브라우저 탭/창별 session state로 옮기고, DB에는 주사위 소모와 보상 같은 영속 결과만 남기는 것을 목표로 한다.
- **2026-06-13**: 1번 코드 audit을 완료했다. 현재 항해 진행 상태가 backend route-neighbor model/service, ship/lodge lock, frontend persisted userStore/sync/facade, 항구/항해 화면, smoke/test에 남아 있음을 확인하고 수정 대상을 표로 정리했다.
- **2026-06-13**: 2번 frontend 항해 세션 저장소를 구현했다. `voyageSessionStore.ts`는 탭/창별 `sessionStorage`에만 항해 진행 상태를 저장하고, `storeFacades.ts`에서 `voyageSessionFacade`로 재수출한다. `pnpm --filter frontend typecheck` 통과.
- **2026-06-13**: 3번 항구 화면 정박 기준 수정을 완료했다. `HarborScene`은 더 이상 `route-neighbor` DB 상태를 조회하지 않고, 출항 버튼은 탭/창별 `voyageSessionFacade.startSession()`으로 항해 세션을 시작한다. `pnpm --filter frontend typecheck` 통과.
- **2026-06-13**: 4번 항해 보드 session state 전환을 완료했다. `NavigationBoardScene`과 `BottomNav`는 더 이상 `route-neighbor` DB 현재 항해 상태를 조회하지 않고, 탭/창별 `voyageSessionFacade`만으로 route, 현재 칸, landing 후보, 복귀를 처리한다. `pnpm --filter frontend typecheck` 통과.
- **2026-06-13**: 5번 route-neighbor backend API 계약 정리를 완료했다. `start`/`end`는 현재 항해 상태를 DB에 쓰지 않고, `roll`/`landing/clear`는 frontend session payload의 `routeId`와 `boardPosition`을 받아 영속 결과만 처리한다. route-neighbor schema/default/spec에서 `currentRoute`, `boardPosition`을 제거했고 typecheck/model spec/script 문법 검사를 통과했다.
- **2026-06-13**: 6번 ship backend 계약 정리를 완료했다. `ship` service에서 `route-neighbor.currentRoute`를 읽던 전역 출항 lock을 제거했고, ship backend는 배 종류/선실/갑판/꾸미기/인벤토리 같은 영속 배 상태만 관리하게 했다. `pnpm --filter backend typecheck`와 smoke script 문법 검사를 통과했다.
- **2026-06-13**: 7번 frontend sync와 persisted field 정리를 완료했다. `syncStore` hydrate/flush에서 route-neighbor 현재 항해 상태를 제거했고, action API 응답 병합에서도 `currentRoute`, `boardPosition`을 차단했다. `LodgeScene`은 더 이상 DB route state로 항해 중 Aidong을 판단하지 않는다. `pnpm --filter frontend typecheck` 통과.
- **2026-06-13**: 8번 테스트와 smoke 갱신을 완료했다. Playwright smoke에 항구 정박 화면 검증과 `sessionStorage`/`localStorage` 분리 검증을 추가했고, backend persistence test와 smoke script 문법 검사를 통과했다.
- **2026-06-13**: 9번 문서와 changelog 현행화를 완료했다. 히스토리, backend/db 규칙, runbook, frontend 규칙, 모듈 backend guide, 7월 next_work에 항해 세션 권위 구현 완료 상태와 검증 기준을 반영했다.
