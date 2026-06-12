# 신규 개발자 온보딩 총정리 2026-06-12

이 문서는 새로 합류하는 개발자가 아이동월드 프로젝트의 현재 상태를 빠르게 이해하고, 바로 작업에 들어갈 수 있도록 만든 인수인계 문서다.

핵심은 단순하다.

```text
6월 목표는 전체 게임 완성이 아니다.
6월 목표는 기획과 코드가 같은 방향을 보게 만드는 POC 수직 루프를 닫는 것이다.
```

현재 프로젝트는 여러 번의 기획 변경과 구조 개편을 거쳤다. 그래서 오래된 next_work, 오래된 세관 UX, 오래된 dynamic zone 흐름을 그대로 믿으면 안 된다. 아래 읽는 순서와 규칙을 먼저 따른다.

## 1. 먼저 읽을 문서 순서

새 개발자는 아래 순서대로 읽으면 된다.

1. `.cloud/71_roadmap_2026-06_260612.md`
   - 6월 전체 목표와 마일스톤을 보는 문서다.
2. `.cloud/84_next_work_2026-06-19_m2_m3_preview.md`
   - 현재 최신 실행 보드다. 파일명에는 preview가 남아 있지만 현재 M2~M3 작업 보드로 승격되어 있다.
3. `.cloud/82_fixed_15_area_slot_decision_2026-06-14.md`
   - 마이섬 15구역과 13개 편입 슬롯 구조를 확정한 문서다.
4. `.cloud/80_frontend_route_audit_2026-06-14.md`
   - frontend route와 사이트맵 사이의 대응 상태를 보는 문서다.
5. `.cloud/81_backend_module_conflict_map_2026-06-14.md`
   - backend module과 기획 module 사이의 충돌 지점을 보는 문서다.
6. `.cloud/20_module_rules.md`
   - module 경계와 manifest, worldScope, PixiJS/Rive 사용 기준을 보는 문서다.
7. `.cloud/30_backend_db_rules.md`
   - backend, MongoDB, module API, customs, auth 규칙을 보는 문서다.
8. `.cloud/40_frontend_rules.md`
   - frontend, Zustand, API client, route, UI, smoke 규칙을 보는 문서다.
9. `packages/modules/BACKEND_GUIDE.md`
   - module 개발자가 backend 저장소와 API를 어떻게 설계해야 하는지 보는 실무 가이드다.
10. `.cloud/90_codex_workflow.md`
    - Codex 또는 자동화 도구가 작업할 때 지켜야 하는 절차다.

오래된 next_work 문서는 이력으로만 본다. 현재 작업 판단은 최신 로드맵과 최신 실행 보드를 우선한다.

## 2. 현재 6월 목표

6월 말까지 닫으려는 흐름은 아래 수직 루프다.

```text
로그인/타이틀
→ 오프닝 분기
→ 마이섬 15구역 허브
→ 숙소 케어
→ 항구/항해
→ 아이동섬 상륙
→ 아이동 영입
→ 13 편입 슬롯 선택
→ 구역 생산/도감템 placeholder
→ 마이룸 도감/콜렉션 확인
→ 데뷔 placeholder
```

여기서 중요한 점은 완성형 콘텐츠가 아니라 `끊기지 않는 최소 루프`다.

따라서 6월에는 다음을 욕심내지 않는다.

- 15개 구역 전체 콘텐츠 완성.
- 13개 슬롯 전체의 고유 미니게임 완성.
- 본진 12인 전체 데이터 완성.
- 결제, 광고, UGC, 소셜, 실시간 AI, SUNO 실제 연동.
- 고품질 PixiJS 지도 완성.

대신 다음을 반드시 닫는다.

- 마이섬 15구역 구조.
- 항구와 숙소 anchor 고정.
- 항해에서 아이동섬으로 가는 최소 route.
- 아이동 영입과 마이섬 편입의 책임 분리.
- 숙소 케어 최소 action.
- 마이룸 shell.
- 도감템 25칸 원장의 형태.
- 최소 smoke 검증.

## 3. 지금까지 완료된 큰 작업

### 3.1 문서와 기준 정리

완료된 내용:

- 6월 전체 로드맵을 `.cloud/71_roadmap_2026-06_260612.md`로 정리했다.
- 최신 실행 보드를 `.cloud/84_next_work_2026-06-19_m2_m3_preview.md`로 전환했다.
- frontend route audit, backend module conflict map, 15구역 slot decision 문서를 만들었다.
- 6/8 이후 기획 변경에 맞춰 module, backend, frontend 규칙 문서를 갱신했다.
- Phase 1에서는 세관 UI를 필수 gate로 강제하지 않는다는 기준을 문서화했다.

개발자가 기억할 것:

- 문서가 많기 때문에 최신 문서를 먼저 봐야 한다.
- 6/8 이전 next_work는 대부분 이력이다.
- 6/12 이후 문서는 6월 POC 루프 기준으로 읽는다.

### 3.2 backend 분리

완료된 내용:

- backend 서버는 하나의 Express 서버로 유지한다.
- 서버를 여러 개로 쪼개는 대신 module별 route, service, repository, model spec 경계를 나눴다.
- 통합 `/api/state` route는 제거됐다.
- frontend도 통합 state client를 새로 만들면 안 된다.
- local MongoDB 기준으로 개발한다.
- Atlas는 현재 사용하지 않는다. 나중에 사용할 수도 있는 선택지로만 보류한다.

현재 collection 소유권:

| collection | 역할 |
|---|---|
| `users` | 계정, guest, auth 연결 user document |
| `hostStates` | host 이름, 광역 재화, 주사위, 통 inventory |
| `myAidongStates` | 영입 Aidong, needs, 케어, 착용, 도감 아이템 후보 원장 |
| `myIslandStates` | 마이섬 해금, 15구역 slot, 구역 진행 |
| `codexStates` | 도감 표시, 일지, 등록 상태. 수량 원장은 아님 |
| `routeNeighborStates` | 항해 route, boardPosition, landing 후보 |
| `shipStates` | 배, 선실, 갑판, shipInventory, 항구/선박 상태 |
| `zoneStates` | zone-garden, zone-oasis, zone-memory, zone-mine local state |
| `moduleStates` | 아직 전용 collection이 없는 module의 fallback state |
| `customsLogs` | customs 처리 로그, 실패 사유, idempotency 기록 |

개발자가 기억할 것:

- 새 runtime 기능에서 `/api/state`를 되살리면 안 된다.
- module state는 `/api/modules/{moduleId}` 아래 API를 쓴다.
- domain rule이 있는 기능은 단순 state patch가 아니라 action API로 만든다.

### 3.3 frontend store 구조

완료된 내용:

- frontend는 단일 Zustand `userStore`를 유지한다.
- store를 물리적으로 module별로 나누지는 않았다.
- 대신 `packages/frontend/src/lib/storeFacades.ts`를 module 접근 경계로 사용한다.
- `syncStore.ts`는 account, host, module 전용 API로 나누어 hydrate/flush한다.

개발자가 기억할 것:

- module package 내부에서 app-level `useUserStore`를 직접 import하지 않는다.
- 신규 runtime code는 가능하면 facade, bootstrap, action hook을 통해 연결한다.
- action API 응답은 `actionApiSync.ts` 또는 facade를 통해 Zustand에 병합한다.

### 3.4 customs de-scope

완료된 내용:

- customs backend, resource adapter, audit log, rule file은 유지한다.
- 하지만 Phase 1 사용자 핵심 루프에서 세관 팝업이나 이탈 gate를 필수로 강제하지 않는다.
- 기존 ship/lodge/destination inventory와 customs rule은 삭제하지 않고 compat/dev 자산으로 둔다.

개발자가 기억할 것:

- 세관을 없앤 것이 아니다.
- 세관 UI 강제를 낮춘 것이다.
- 실제 source document에서 target document로 debit/credit이 필요한 cross-module 이동은 여전히 customs가 맞다.
- 단일 권위 저장소로 바로 지급하는 gameplay 보상은 domain action API가 처리한다.

### 3.5 마이섬 15구역 전환

완료된 내용:

- `packages/frontend/src/data/zones.ts`를 AREA-01~AREA-15 static definition 기준으로 전환했다.
- AREA-02 항구와 AREA-13 숙소는 anchor slot으로 잠갔다.
- 나머지 13개 구역은 Aidong 편입 가능한 fillable slot으로 본다.
- backend `myIslandStates.zoneSlots`를 추가했다.
- `my-island` slot 조회, 편입, 해제, 이동 service/API를 만들었다.
- frontend API, userStore, facade, sync key에 `zoneSlots`를 연결했다.
- `IslandFullMapScreen`을 15구역 카드와 13개 fillable slot 표시 구조로 전환했다.
- `/island/area/02`, `/island/area/13`은 항구와 숙소로 redirect한다.
- 구현된 AREA는 기존 route와 alias를 유지하고, 미구현 AREA는 placeholder 화면으로 받는다.
- backend persistence test에 zone slot 기본값, anchor 잠금, 중복 편입, move/release 검증을 추가했다.

아직 남은 것:

- 실제 영입 후 편입 슬롯 선택 UI는 아직 완성되지 않았다.
- `route-neighbor/encounter/accept`가 자동 편입하던 흐름은 M2에서 분리해야 한다.
- `dynamicAidongZones`는 migration/compat 입력으로 남겨둔다. 아직 바로 삭제하지 않는다.

### 3.6 항구, 항해, 배, 숙소 관련 현재 상태

이미 많은 POC 구현이 들어가 있다.

현재 기준:

- `route-neighbor`는 항해 보드 진행과 landing 후보를 소유한다.
- `ship`은 배 종류, 선실, 갑판, shipInventory, 항구/선박 상태를 소유한다.
- `lodge`는 숙소 배치, 방, 가구, 적극 육성 슬롯 후보 상태를 소유한다.
- ship/lodge inventory와 customs 연결은 POC/compat 성격이 강하다.
- 새 Phase 1 루프에서는 숙소 중심 육성, 통 inventory, 아이동별 도감 아이템을 우선한다.

개발자가 기억할 것:

- 기존 ship/lodge/destination 기능을 무작정 삭제하지 않는다.
- 새 기획과 충돌하는 부분은 숨김, 축소, compat 유지, 후속 재설계로 분류한다.
- 항해 보드는 아직 최종 UX가 아니다. 주사위, 칸 수, 지정 이동 여부는 계속 조정될 수 있다.

### 3.7 zone action과 balance.csv

완료된 내용:

- zone 계열 모듈은 `collect`, `clear` action API를 사용한다.
- 보상 숫자와 zone별 allowlist는 `packages/modules/zone-*/balance.csv`에서 읽는다.
- unlock, validation, idempotency, result payload 검증은 backend service 코드가 담당한다.

개발자가 기억할 것:

- frontend가 zone 보상을 직접 지급하면 안 된다.
- frontend는 결과 이벤트를 backend에 보내고, backend action 응답을 병합한다.
- `balance.csv`는 숫자와 allowlist 중심이다. 핵심 검증 로직은 service에 둔다.

### 3.8 PixiJS와 Rive 사용 기준

정리된 내용:

- PixiJS는 전체 frontend를 대체하는 기본 UI 엔진이 아니다.
- PixiJS는 화려한 scene 연출이 필요한 일부 화면에만 쓴다.
- 후보는 destination island, 아이동섬 탐험, 조사, 보상 획득, 지역 이동 transition 같은 장면이다.
- React/MUI는 route, HUD, 버튼, 팝업, inventory, 정보 UI를 계속 담당한다.
- Rive는 캐릭터 반응, UI 반응, hotspot 반응, 보상 연출의 1차 후보로 본다.
- Spine/Live2D는 작업량이 크므로 현재 기본 도입하지 않는다.

개발자가 기억할 것:

- PixiJS를 쓰더라도 backend action 호출은 React container가 담당한다.
- PixiJS scene state를 backend document와 직접 결합하지 않는다.
- 텍스트가 많거나 접근성이 필요한 UI는 React/MUI로 만든다.

## 4. 현재 최신 실행 보드

현재 최신 실행 보드는 다음 문서다.

```text
.cloud/84_next_work_2026-06-19_m2_m3_preview.md
```

파일명에는 preview가 남아 있지만, 현재는 M2~M3 실행 보드로 사용한다.

남은 작업은 아래 순서다.

### 4.1 다음 즉시 작업: 2번

작업명:

```text
항해 encounter와 영입 책임 분리
```

해야 할 일:

- `route-neighbor/encounter/accept`가 편입까지 자동 처리하는지 확인한다.
- encounter accept는 영입 또는 영입 후보 확정까지만 담당하도록 낮춘다.
- 실제 Aidong 보유 상태 변경은 `my-aidong` module 책임으로 둔다.
- 마이섬 slot 편입은 `my-island/slots/incorporate`로 분리한다.
- 기존 compat 흐름은 필요하면 유지하되 신규 수직 루프에서는 사용하지 않는다.

완료 기준:

```text
영입과 마이섬 편입이 backend API 책임상 분리된다.
```

### 4.2 그다음 작업들

현재 보드의 다음 작업:

1. `aidong-island` module skeleton 작성.
2. M22 frontend route와 화면 shell 추가.
3. 영입 시나리오 1컷 placeholder.
4. 편입 슬롯 선택 UI 연결.
5. 숙소 메인 메뉴 재정렬.
6. 4파라미터 케어 표면 모델 작성.
7. M21 마이룸 route와 aggregation shell.
8. M2~M3 smoke 추가.
9. 문서와 changelog 정리.

이 순서를 크게 바꾸지 않는 것이 좋다. 이유는 영입과 편입의 책임이 먼저 분리되어야 아이동섬, 숙소, 마이룸이 같은 데이터 흐름을 볼 수 있기 때문이다.

## 5. 현재 구조를 아주 쉽게 설명하면

### 5.1 backend는 하나다

서버는 하나다.

```text
Express backend 하나
```

하지만 내부는 module별로 나눈다.

```text
packages/backend/src/modules/my-aidong
packages/backend/src/modules/my-island
packages/backend/src/modules/route-neighbor
packages/backend/src/modules/ship
packages/backend/src/modules/zone
...
```

각 module은 자기 route, service, repository, model을 갖는다.

```text
route      HTTP 요청/응답 담당
service    규칙 검증과 상태 전이 담당
repository DB 접근 담당
model      MongoDB document 구조 담당
```

### 5.2 frontend store는 하나지만 접근은 나눠 쓴다

frontend에는 큰 Zustand store가 하나 있다.

```text
packages/frontend/src/stores/userStore.ts
```

하지만 신규 코드는 이 store를 아무 데서나 직접 만지지 않는다.

대신 facade를 통한다.

```text
packages/frontend/src/lib/storeFacades.ts
```

그리고 backend action 응답은 다음 경계에서 병합한다.

```text
packages/frontend/src/lib/actionApiSync.ts
```

### 5.3 module package와 backend module은 다르다

`packages/modules/{moduleId}`는 주로 frontend/runtime module package, manifest, balance/customs/decor/i18n 데이터를 둔다.

예:

```text
packages/modules/zone-garden/manifest.ts
packages/modules/zone-garden/balance.csv
packages/modules/zone-garden/src/routes.tsx
```

backend 구현은 `packages/backend/src/modules/{moduleId}` 아래에 둔다.

예:

```text
packages/backend/src/modules/my-island/routes.ts
packages/backend/src/modules/my-island/service.ts
```

둘을 헷갈리면 안 된다.

### 5.4 세관은 기술 경계다

예전에는 세관이 사용자 UX gate처럼 강하게 들어갔다.

현재 Phase 1에서는 다르다.

```text
세관 backend는 유지한다.
세관 UI 강제는 끈다.
```

즉, 세관은 다음 경우에 쓴다.

- 실제로 source module document에서 빼고 target module document에 넣어야 할 때.
- audit log와 idempotency가 필요한 cross-module 이동일 때.
- compat/dev 검증 경로일 때.

반대로 다음 경우에는 customs보다 domain action API를 우선한다.

- gameplay 보상이 `hostStates.inventory` 같은 단일 권위 저장소로 바로 들어가는 경우.
- 아이동별 도감 아이템이 `myAidongStates` 후보 원장으로 바로 들어가는 경우.

## 6. 절대 지켜야 하는 작업 규칙

### 6.1 `/api/state`를 되살리지 않는다

금지:

```text
GET /api/state
PATCH /api/state
frontend api.getState
frontend api.patchState
```

신규 runtime code는 아래 중 하나를 써야 한다.

- account API.
- host API.
- `/api/modules/{moduleId}` module API.
- 명시적인 action API.
- 실제 cross-module 이동이면 customs API.

### 6.2 module은 자기 document만 직접 수정한다

금지 예:

```text
route-neighbor service가 myIslandStates를 직접 수정
zone-garden service가 hostStates.inventory를 임의 patch
ship service가 lodgeStates를 직접 수정
```

권장:

```text
my-aidong 영입은 my-aidong service
my-island 편입은 my-island service
host inventory 변경은 host service 또는 명시 action
cross-module debit/credit은 customs
```

### 6.3 route, service, repository 책임을 섞지 않는다

route:

- request body parsing.
- uid 추출.
- HTTP status mapping.

service:

- domain validation.
- 상태 전이.
- idempotency.
- 다른 service 호출 여부 판단.

repository:

- MongoDB read/write.
- query/update 구현.

### 6.4 frontend module package에서 app store를 직접 import하지 않는다

금지:

```ts
import { useUserStore } from '../../../frontend/src/stores/userStore'
import { api } from '../../../frontend/src/lib/api'
```

권장:

- module package는 `configure()` hook을 제공한다.
- app bootstrap이 action handler와 facade를 주입한다.
- UI component는 주입받은 action만 호출한다.

### 6.5 한글 문서는 반드시 깨짐 검사를 한다

한글 문서를 수정하면 아래 검사를 한다.

```powershell
Select-String -Path .cloud/수정한문서.md -Pattern ([char]0xFFFD)
```

깨짐 문자가 나오면 바로 복구한다.

### 6.6 문서와 changelog를 남긴다

이 프로젝트는 문서가 작업 기준이다.

따라서 다음 경우에는 문서를 업데이트한다.

- module 경계가 바뀐 경우.
- route가 추가되거나 alias/redirect가 바뀐 경우.
- backend collection ownership이 바뀐 경우.
- smoke 기준이 바뀐 경우.
- Phase 1 기획과 충돌하는 기존 기능을 compat/dev로 낮춘 경우.

문서에는 가능한 한 `변경 기록`을 남긴다.

## 7. 새 기능을 추가하는 표준 절차

### 7.1 backend 기능 추가 절차

1. 이 기능의 소유 module을 정한다.
2. 저장 위치를 정한다.
   - 전용 collection인지.
   - `moduleStates` fallback인지.
   - 기존 `hostStates`, `myAidongStates`, `myIslandStates`에 들어갈지.
3. 전용 저장소가 필요하면 model을 만든다.
4. repository를 만든다.
5. `moduleRepositoryRegistry`에 등록한다.
6. `modelSpecs.ts`의 ownedFields를 갱신한다.
7. service에 domain rule을 구현한다.
8. route에 HTTP API를 연결한다.
9. frontend API client/facade를 연결한다.
10. backend persistence test 또는 module action smoke를 추가한다.
11. 관련 문서와 changelog를 갱신한다.

### 7.2 frontend 기능 추가 절차

1. route가 필요한지 먼저 확인한다.
2. manifest route와 React route가 충돌하지 않는지 본다.
3. backend API가 있으면 `lib/api.ts` 또는 전용 facade에 감싼다.
4. action 응답을 `actionApiSync.ts` 또는 store facade로 병합한다.
5. UI는 기존 MUI theme와 component pattern을 따른다.
6. module package 내부에서 app store를 직접 import하지 않는다.
7. typecheck를 실행한다.
8. 필요하면 Playwright smoke를 추가한다.
9. route audit 문서를 갱신한다.

### 7.3 module package 추가 절차

필수 후보:

```text
packages/modules/{module-id}/package.json
packages/modules/{module-id}/manifest.ts
packages/modules/{module-id}/src/index.ts
packages/modules/{module-id}/src/routes.tsx
packages/modules/{module-id}/i18n/ko.json
packages/modules/{module-id}/i18n/en.json
```

필요 시 추가:

```text
balance.csv
customs.csv
decor.csv
items.csv
src/config.ts
src/actions.ts
src/types.ts
```

frontend 등록:

```text
packages/frontend/src/lib/moduleRegistry.ts
packages/frontend/src/lib/moduleRoutes.tsx 또는 App.tsx route
```

backend 등록이 필요하면:

```text
packages/backend/src/modules/{moduleId}/routes.ts
packages/backend/src/modules/{moduleId}/service.ts
packages/backend/src/models/{Module}StateModel.ts
packages/backend/src/modules/modelSpecs.ts
packages/backend/src/repositories/moduleRepositoryRegistry.ts
```

## 8. 자주 헷갈리는 결정 사항

### 8.1 마이섬은 고정 15구역이다

현재 정식 구조:

```text
AREA-01~AREA-15
```

AREA-02는 항구다.
AREA-13은 숙소다.
둘은 anchor라서 Aidong 편입 대상이 아니다.

나머지 13개 구역이 fillable slot이다.

### 8.2 Aidong 영입과 마이섬 편입은 같은 일이 아니다

영입:

```text
my-aidong이 담당
```

마이섬 편입:

```text
my-island/slots/incorporate가 담당
```

항해 encounter는 영입 후보 또는 영입 이벤트를 만들 수 있지만, 마이섬 slot 편입까지 자동으로 처리하면 책임이 섞인다.

### 8.3 codexStates는 수량 원장이 아니다

`codexStates`는 도감 표시, 등록, 일지 진행 상태를 담당한다.

아이동별 25개 도감 아이템 수량은 후보상 다음 쪽이 맞다.

```text
myAidongStates.aidongCodexItems
```

### 8.4 hostStates.inventory는 통 inventory 후보다

일반 소유 아이템, Aidong 착용 아이템 소유권은 `hostStates.inventory`가 가진다.

착용 상태는 따로 둔다.

```text
myAidongStates.equippedItems
```

### 8.5 ship/lodge inventory는 당장 삭제하지 않는다

기존 구현이 있다.

하지만 새 Phase 1에서는 통 inventory와 숙소 중심 육성 루프가 우선이다.

따라서 ship/lodge inventory는 다음처럼 본다.

```text
삭제 대상이 아니라 compat/보류/재사용 후보
```

### 8.6 PixiJS는 일부 scene용이다

PixiJS를 도입한다고 전체 UI를 canvas로 바꾸지 않는다.

좋은 사용처:

- 아이동섬 탐험 배경.
- 오브젝트 조사 효과.
- 보상 획득 연출.
- 지역 이동 transition.

나쁜 사용처:

- 설정 화면.
- 인벤토리 표.
- 숙소 관리 패널.
- 텍스트가 많은 설명 UI.

## 9. 검증 명령

자주 쓰는 명령은 아래와 같다.

backend typecheck:

```bash
pnpm --filter backend typecheck
```

frontend typecheck:

```bash
pnpm --filter frontend typecheck
```

backend persistence test:

```bash
pnpm exec vitest run packages/backend/src/backendPersistence.test.ts
```

backend model spec 확인:

```bash
pnpm check:backend:model-specs
```

legacy state route 참조 검사:

```bash
pnpm audit:legacy-state
```

state route static gate:

```bash
pnpm check:state-route-static
```

frontend route/runtime smoke는 dev server가 필요하다.

```bash
pnpm dev:mongo:local
pnpm dev:be
pnpm dev:fe
pnpm check:frontend:state-route-runtime
```

브라우저 smoke:

```bash
pnpm check:e2e:smoke
```

주의:

- runtime smoke는 backend와 frontend가 떠 있지 않으면 실패할 수 있다.
- 실패 원인이 서버 미기동인지, 실제 기능 회귀인지 구분해서 기록한다.

## 10. 현재 알려진 debt

아직 남은 debt:

- `.cloud/84_next_work_2026-06-19_m2_m3_preview.md` 파일명에 preview가 남아 있다. 내용상 현재 실행 보드다.
- `route-neighbor/encounter/accept` 자동 편입 분리가 아직 남아 있다.
- 실제 편입 슬롯 선택 UI가 아직 완성되지 않았다.
- `aidong-island` module skeleton이 아직 없다.
- M22 아이동섬 route와 화면 shell이 아직 없다.
- M21 마이룸 route와 aggregation shell이 아직 없다.
- M07 4파라미터 케어 표면 모델이 아직 없다.
- `dynamicAidongZones` migration/삭제는 최소 1개 마일스톤 뒤로 미뤘다.
- 77번 보드의 규칙 문서 갱신 debt가 일부 남아 있다.
- runtime smoke는 서버 실행 상태에 따라 실패할 수 있으므로 검증 환경을 명확히 기록해야 한다.

## 11. 절대 하지 말아야 할 것

- `/api/state`를 다시 만들지 않는다.
- frontend에 통합 state client를 다시 만들지 않는다.
- module service가 다른 module document를 직접 수정하지 않는다.
- module package 내부에서 app-level `useUserStore`를 직접 import하지 않는다.
- Phase 1 core route에 customs popup을 다시 필수 gate로 넣지 않는다.
- Atlas 사용을 임의로 확정하지 않는다.
- Mongo credential을 문서에 적지 않는다.
- 오래된 next_work만 보고 현재 방향이라고 판단하지 않는다.
- 한글 runbook을 영어로 새로 쓰지 않는다.
- 한글 문서를 수정하고 깨짐 검사를 생략하지 않는다.
- ship/lodge/destination POC 구현을 기획 변경이라는 이유만으로 무작정 삭제하지 않는다.

## 12. 새 개발자가 바로 잡을 첫 작업

가장 먼저 잡을 작업은 최신 실행 보드의 2번이다.

```text
.cloud/84_next_work_2026-06-19_m2_m3_preview.md
2. 항해 encounter와 영입 책임 분리
```

작업 전 확인 파일 후보:

```text
packages/backend/src/modules/route-neighbor/routes.ts
packages/backend/src/modules/route-neighbor/service.ts
packages/backend/src/modules/my-aidong/routes.ts
packages/backend/src/modules/my-aidong/service.ts
packages/backend/src/modules/my-island/routes.ts
packages/backend/src/modules/my-island/service.ts
packages/frontend/src/lib/api.ts
packages/frontend/src/lib/storeFacades.ts
packages/frontend/src/screens/NavigationBoardScene.tsx
packages/frontend/src/screens/IslandFullMapScreen.tsx
```

완료 후 기대 상태:

```text
항해 encounter accept
→ Aidong 영입 또는 영입 후보 확정
→ 사용자에게 편입 가능한 13개 slot 표시
→ my-island/slots/incorporate 호출
→ 마이섬 15구역 화면에 occupant 반영
```

## 13. 작업할 때의 마음가짐

이 프로젝트는 아직 완성품이 아니라 방향을 맞춰가는 POC다.

그래서 중요한 것은 한 번에 거대한 완성형 기능을 만드는 것이 아니다.

중요한 것은 다음이다.

- 현재 기획과 코드의 책임 경계를 맞춘다.
- 작은 단위로 구현한다.
- 자동 검증을 남긴다.
- 문서와 changelog를 업데이트한다.
- 오래된 구현을 무조건 삭제하지 않고, compat/dev/후속 재설계로 분류한다.

새 개발자가 위 원칙만 지키면, 현재 구조 안에서 안정적으로 이어서 작업할 수 있다.

## 변경 기록

- **2026-06-12**: 신규 개발자 합류를 대비해 현재 완료 상태, 남은 작업, module/backend/frontend 작업 규칙, 검증 명령, 금지 사항을 한 문서로 정리했다.