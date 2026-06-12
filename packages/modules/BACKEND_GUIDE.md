# Modules Backend Guide

이 문서는 `packages/modules` 아래에서 모듈을 개발할 때 backend 저장소와 API를 어떻게 설계해야 하는지 정리한다.

현재 backend 서버는 하나의 Express 서버를 사용한다. 모듈 독립성은 서버 프로세스를 나누는 방식이 아니라, route, service, model, repository, resource adapter 경계를 나누는 방식으로 유지한다.

## 2026-06-08 기획 변경 반영

2026-06-05 기획 변경 회의 이후 이 문서는 다음처럼 읽는다.

- backend route/service/repository 경계는 유지한다.
- customs와 resource adapter는 기술 자산으로 유지하되, Phase 1 사용자 핵심 루프에 세관을 강제하지 않는다.
- 신규 gameplay는 숙소 중심 육성, 통 인벤토리, 아이동별 도감 인벤토리, 가변 메인 구역, 구역 배치 자동 생산을 우선한다.
- 기존 ship/lodge/destination inventory 분리 구현은 삭제하지 않고, 새 인벤토리 설계가 끝날 때까지 보류/호환 상태로 둔다.
- Phase 1 core loop와 상태 소유권 1차 메모는 `.cloud/53_core_loop_2026-06-08.md`를 따른다.
- 항해 아이동 만남과 메인 가변 구역 추가의 1차 계약은 `.cloud/54_aidong_encounter_dynamic_zone_2026-06-08.md`를 따른다.
- 통 인벤토리와 아이동별 25 도감 아이템 소유권은 `.cloud/55_inventory_codex_item_redesign_2026-06-08.md`를 따른다.
- 세관 de-scope 기준은 `.cloud/56_customs_descope_2026-06-08.md`를 따른다.
- 숙소 중심 육성 허브 기준은 `.cloud/57_lodge_growth_hub_2026-06-08.md`를 따른다.
- 구역 배치 자동 생산 기준은 `.cloud/58_zone_placement_production_2026-06-08.md`를 따른다.
- 아이동별 미니게임 스킨 기준은 `.cloud/59_aidong_minigame_skin_model_2026-06-08.md`를 따른다.
- 도감 아이템과 숙소 업그레이드 경제 기준은 `.cloud/60_codex_upgrade_economy_2026-06-08.md`를 따른다.
- 항해 보드 단순화 결정 기준은 `.cloud/61_voyage_board_simplification_2026-06-08.md`를 따른다.
- 배 적재량과 입항/비우기 사이클 기준은 `.cloud/62_ship_cargo_port_cycle_2026-06-08.md`를 따른다.
- backend/API 영향도와 신규 API 후보는 `.cloud/64_backend_api_impact_2026-06-08.md`를 따른다.
- 검증과 테스트 재정렬 기준은 `.cloud/66_validation_test_realignment_2026-06-08.md`를 따른다.
- 자세한 충돌 분류는 `.cloud/52_plan_change_conflict_map_2026-06-08.md`를 따른다.

## 기본 원칙

- 모듈은 자기 상태를 소유한다.
- 모듈은 다른 모듈 document를 직접 수정하지 않는다.
- 모듈 간 document 이동이 실제로 필요한 경우에는 customs를 통한다.
- host/global resource는 host API 또는 host resource adapter를 통한다.
- 신규 runtime 기능은 legacy `/api/state`에 의존하지 않는다.
- frontend module code는 module state API와 module action API를 우선 사용한다.
- Phase 1 core loop에서 신규 보상은 customs가 아니라 domain action API가 권위 저장소에 직접 반영한다.
- customs API는 compat/dev 검증, 외부 IP 콜라보, 실제 cross-module debit/credit이 필요한 경우에만 사용한다.

## 저장소 선택

모듈이 user별 runtime state를 가진다면 먼저 저장 ownership을 정한다.

권장 분류:

- account/session: account API와 account repository.
- host/global resource: host API와 host repository.
- Aidong 소지/착용 아이템의 소유권: `hostStates.inventory`.
- Aidong 소지/착용 아이템의 착용 상태: `myAidongStates.equippedItems`.
- module-local state: `/api/modules/{moduleId}` API와 module repository.
- cross-module resource movement: 기본 core loop에서는 domain action API를 우선하고, 실제 source/target document debit/credit이 필요한 경우 customs API와 resource adapter.

단순하고 임시적인 상태는 공통 `moduleStates` fallback을 사용할 수 있다.

```txt
moduleStates
  { uid, moduleId, state, updatedAt }
```

다음 조건 중 하나라도 있으면 전용 collection/repository를 우선한다.

- 상태 구조가 장기적으로 커질 가능성이 있다.
- module-specific validation이 필요하다.
- 조회 조건이나 index가 필요하다.
- transaction 또는 customs debit/credit에 자주 참여한다.
- frontend action이 단순 patch가 아니라 domain rule을 가진다.

전용 collection 예:

```txt
myAidongStates
myIslandStates
codexStates
routeNeighborStates
shipStates
zoneStates
```

## Backend 파일 위치

모듈 backend 코드는 `packages/backend/src` 아래에 둔다. `packages/modules`는 frontend/runtime module package와 manifest, balance/customs/i18n 데이터를 담는 위치다.

전용 저장소를 추가할 때 확인할 파일:

- `packages/backend/src/models/{Module}StateModel.ts`
- `packages/backend/src/repositories/*`
- `packages/backend/src/repositories/moduleRepositoryRegistry.ts`
- `packages/backend/src/modules/modelSpecs.ts`
- `packages/backend/src/modules/{moduleId}/routes.ts`
- `packages/backend/src/modules/{moduleId}/service.ts`

`packages/modules/{moduleId}` 쪽에서 함께 확인할 파일:

- `manifest.ts`
- `balance.csv`
- `customs.csv`
- `src/types.ts`
- `src/actions.ts`
- `src/config.ts`
- `src/routes.tsx`
- `i18n/ko.json`
- `i18n/en.json`

## API 설계

모듈 API는 `/api/modules/{moduleId}` 아래에 둔다.

단순 state sync:

```txt
GET   /api/modules/{moduleId}/state
PUT   /api/modules/{moduleId}/state
PATCH /api/modules/{moduleId}/state
```

domain rule이 있는 action:

```txt
POST /api/modules/{moduleId}/{action}
```

예:

```txt
POST /api/modules/my-aidong/recruit
POST /api/modules/my-aidong/affinity
POST /api/modules/my-aidong/outfit
POST /api/modules/my-aidong/items/equip-toggle

POST /api/modules/route-neighbor/start
POST /api/modules/route-neighbor/roll
POST /api/modules/route-neighbor/end

POST /api/modules/ship/harbor/assign-toggle
POST /api/modules/ship/harbor/charge
```

규칙:

- generic state API는 단순 저장/동기화에만 사용한다.
- action API는 service에서 전제 조건을 검증한다.
- route는 request parsing과 HTTP response mapping만 담당한다.
- service는 repository와 resource adapter를 호출한다.
- service는 다른 모듈 repository를 직접 수정하지 않는다.

## Aidong 전역 아이템 규칙

Aidong 소지/착용 아이템은 module-local inventory에 저장하지 않는다.

현재 기준:

- `hostStates.inventory`가 Aidong item의 소유권 원장이다.
- `myAidongStates.equippedItems`는 어떤 Aidong이 어떤 item을 착용 중인지 기록하는 참조 상태다.
- `myAidongStates.equippedOutfit`은 Phase 1 화면 색상/외형 프리셋으로 유지한다.
- 실제 소유 아이템 착용은 `equippedItems`와 `/api/modules/my-aidong/items/equip-toggle`을 사용한다.
- 착용 가능 item 목록은 `packages/modules/my-aidong/items.csv`에 둔다.
- catalog scope는 `aidong-global`을 사용한다.
- 착용 toggle은 host inventory 수량에서 다른 Aidong이 이미 착용 중인 수량을 뺀 가용 수량을 검증한다.
- 착용/해제는 host inventory 수량을 직접 차감하지 않는다. 소유 수량은 그대로 두고, `equippedItems`로 사용 중 수량을 예약한다.
- module-local inventory에서 Aidong item을 얻는 이전 POC 흐름은 Phase 1 core loop에서 보류한다.
- Phase 1에서는 Aidong 착용 아이템 보상은 domain action API가 `hostStates.inventory`에 직접 반영한 뒤 착용한다.

2026-06-08 이후 새 기획 기준:

- 일반 통 인벤토리는 `hostStates.inventory`를 권위로 둔다.
- Aidong 착용 아이템 소유권도 계속 `hostStates.inventory`가 가진다.
- Aidong별 25 도감 아이템은 착용 아이템과 다르게 해당 Aidong 귀속 inventory로 설계한다.
- 1차 후보 필드는 `myAidongStates.aidongCodexItems`와 `myAidongStates.aidongUpgradeState`다.
- `codexStates`는 도감 표시/해금/완전 등록 진척을 담당하고, 아이템 수량 원장으로 급히 확장하지 않는다.
- 기존 `shipInventory`, `lodgeInventory`, `localResources`는 새 통 인벤토리 설계가 구현되기 전까지 호환/보류 필드로 둔다.

아이동별 도감 아이템과 업그레이드 경제:

- 아이동별 25개 도감 아이템 수량은 `myAidongStates.aidongCodexItems` 후보 필드가 소유한다.
- 아이동별 업그레이드 상태는 `myAidongStates.aidongUpgradeState` 후보 필드가 소유한다.
- 숙소 연습 상태는 `myAidongStates.practiceState` 후보 필드가 소유한다.
- `codexStates`는 수량 원장이 아니라 도감 표시, 등록, 일지 진행 상태만 담당한다.
- `my-aidong` 모듈의 `codex-items.csv`, `upgrade-recipes.csv`를 catalog 후보로 둔다.
- 도감 아이템 지급, 소비, 업그레이드 판정은 backend service에서 검증한다.

상세 기준은 `.cloud/60_codex_upgrade_economy_2026-06-08.md`를 따른다.

금지:

- lodge, ship, zone 같은 module-local inventory에 Aidong 착용 상태를 저장하는 것.
- frontend가 host inventory 검증 없이 `equippedItems`를 직접 patch하는 것.
- 같은 item 수량보다 많은 Aidong에게 중복 착용시키는 것.

## Customs 연동

모듈 간 자원 이동은 `/api/customs/apply`를 통과한다.

2026-06-08 이후 Phase 1 기준에서는 세관을 사용자 필수 gate로 새로 강화하지 않는다. 세관 backend, log, adapter, rule은 기술 자산으로 유지하고, 사용자 core loop의 단일 저장소 보상은 domain action API가 직접 처리한다.

```txt
POST /api/customs/apply
```

customs 책임:

- source module debit.
- target module credit.
- host resource debit/credit.
- idempotency 처리.
- audit log 기록.
- Mongo transaction 또는 transaction fallback 처리.

현재 customs rule 운용 기준:

- 현재 rule set은 완성 밸런스가 아니라 POC/검증/초기 플레이 루프 확인용 임시 체제다.
- 실제 zone, route, ship 자원 루프가 확정되기 전까지 기존 rule을 함부로 삭제하지 않는다.
- `ship/customs.csv`는 배 인벤토리에서 숙소 또는 전역 보관소로 내보내는 rule을 가진다.
- `lodge/customs.csv`는 숙소 인벤토리에서 Aidong 소지/착용 후보 아이템을 전역 보관소로 내보내는 rule을 가진다.
- 실제 `destination-island` 모듈이 추가되면 해당 모듈의 `customs.csv`에 `toModule=ship` 또는 `toScope=global` rule을 둔다.
- 새 `customs.csv` rule을 추가할 때는 테스트/POC용인지 운영 후보인지 `description`에 남긴다.
- rule 삭제나 ratio 확정은 PM/밸런스 기준이 정해진 뒤 backend runbook과 함께 갱신한다.
- production 성격 환경에서는 ad-hoc apply를 기본 차단하고 registered rule만 사용한다.
- 세관 UI 노출이나 이탈 gate 재활성화는 `.cloud/56_customs_descope_2026-06-08.md`의 feature flag와 재개 조건을 먼저 확인한다.

모듈은 필요한 경우 resource adapter를 제공한다.

```ts
export interface ResourceAdapter {
  canDebit(uid: string, resource: string, amount: number): Promise<boolean>
  debit(uid: string, resource: string, amount: number): Promise<void>
  credit(uid: string, resource: string, amount: number): Promise<void>
}
```

금지:

- module A service가 module B document를 직접 수정하는 것.
- frontend가 source/target module state를 직접 patch해서 자원 이동을 흉내내는 것.
- `/api/modules/{moduleId}/state`를 cross-module 자원 이동 API처럼 사용하는 것.
- 세관을 숨겼다는 이유로 frontend나 module service가 다른 module document를 직접 수정하는 것.

## Frontend 연결

frontend에서 신규 모듈 기능을 붙일 때는 다음 순서를 따른다.

1. module action API 또는 module state API를 만든다.
2. `packages/frontend/src/lib/api.ts` 또는 별도 module facade에서 API 호출을 감싼다.
3. action 응답은 `packages/frontend/src/lib/actionApiSync.ts` 또는 module facade를 통해 Zustand에 merge한다.
4. `VITE_MODULE_ACTION_API_SYNC=true`에서 실제 action API 경로를 검증한다.
5. 신규 runtime code가 `/api/state`, `api.getState`, `api.patchState`를 직접 호출하지 않는지 확인한다.

전용 action route가 아직 없는 광역 모듈은 과도기적으로 다음 방식을 사용할 수 있다.

- local `userStore`를 먼저 갱신해 UI 반응성을 유지한다.
- 같은 action 안에서 module/account state API를 즉시 patch한다.
- 이 방식은 임시 연결이며, domain rule이 커지면 backend `routes.ts` + `service.ts` action API로 승격한다.
- 예: `myIslandBootstrap`은 이제 `unlock-zone`, `tutorial/complete` backend action API를 호출한다.
- 예: `codexBootstrap`은 이제 `unlock-diary`, `unlock-slot`, `fully-register` backend action API를 호출한다.
- 예: zone module은 `collect`, `clear` backend action API로 zone-local resource와 clear 진행을 저장한다.
- 예: `zone-garden`은 module UI에서 backend API를 직접 import하지 않고 `configure({ onHarvest })` hook을 통해 frontend bootstrap이 action API를 주입한다.
- 예: `zone-oasis`, `zone-memory`, `zone-mine`은 module UI에서 backend API를 직접 import하지 않고 `configure()` hook을 통해 `zoneContentBootstrap`이 `collect`/`clear` API 연결을 주입한다.

feature flag 기준:

```txt
VITE_MODULE_ACTION_API_SYNC=true
```

rollback:

```txt
VITE_MODULE_ACTION_API_SYNC=false
```

`VITE_SPLIT_STATE_SYNC`는 더 이상 sync 경로를 바꾸는 rollback flag로 사용하지 않는다. action API 직접 호출만 끄고, account/host/module split state sync는 유지한다.

## Route/Ship 항해 상태

항해 관련 기획은 아직 확정본이 아니므로, 모듈 개발 시 현재 상태 경계를 임시 계약으로 본다.

`route-neighbor`는 항해 보드 진행을 소유한다.

- `currentRoute`: 현재 항로 id.
- `boardPosition`: 보드 위치.
- `localResources`: route-neighbor 내부 지역 자원.
- `landings`: 칸 도착/이벤트 기록이다. `last`에는 최근 landing 후보와 처리 상태를 저장한다.

route landing 1차 기준:

- `roll` 응답은 `landing` 후보를 함께 반환한다.
- `landing.targetWorldScope`로 home island, destination island, voyage route 성격을 구분한다.
- `GET /api/modules/route-neighbor/landing/current`는 최근 landing 후보를 반환한다.
- `POST /api/modules/route-neighbor/landing/clear`는 현재 landing mission을 처리한다.
- resource landing의 권위 보상은 `destination-shell-island.localResources.shell-fragment`에 저장한다.
- 기존 smoke와 임시 세관 흐름 호환을 위해 `route-neighbor.localResources.deck-cargo`는 `compatibility: true` 보상으로 함께 유지한다.

2026-06-08 이후 새 기획 기준:

- character landing은 별도 일회성 아이동 섬이 아니라 `aidong-encounter`로 재정의한다.
- encounter를 수락하면 `my-aidong` 영입, `my-island` 가변 구역 추가, 숙소 합류, route landing clear가 하나의 domain 흐름으로 이어진다.
- 단기 구현은 기존 `my-aidong/recruit`, `my-island/unlock-zone`, `route-neighbor/landing/clear` 조합으로 가능하지만, 권장 구현은 `route-neighbor/encounter/accept` 같은 멱등 action API다.
- 자세한 설계는 `.cloud/54_aidong_encounter_dynamic_zone_2026-06-08.md`를 따른다.
- 주사위 채택 여부, board size, 지정 이동 여부는 P0 미결이다.
- 30칸 보드 전용 밸런스와 칸별 보상 테이블 고도화는 결정 전까지 하지 않는다.
- route service를 수정할 때는 board size, roll rule, landing generator를 config로 바꾸기 쉬운 구조를 우선한다.
- 항해 보드 단순화 결정 자료는 `.cloud/61_voyage_board_simplification_2026-06-08.md`를 따른다.

`ship`은 항구/선박 상태를 소유한다.

- `harborAssignedChars`: 항구/선박 배정 Aidong.
- `harborLastChargedAt`: 충전 기준 시각.
- `shipTypeId`: 현재 선택된 배 종류.
- `shipInventory`: 항해 중 입항 전 임시 화물 또는 적재량 압력 원장. 영구 소유권 원장은 `hostStates.inventory`를 우선한다.
- `cabinAssignments`: 선실 slot별 Aidong 배정.
- `deckAssignments`: 갑판 slot별 Aidong 배정.
- `cabinFurniture`: 구매한 선실 꾸미기 아이템 수량.
- `cargo`: legacy/예약 필드. 현재 적재 수량 원장으로 사용하지 않는다.
- `cabins`: 선실별 꾸미기 배치 상태와 legacy 호환 필드.
- `cargoCapacity`: `shipStates`에 저장하지 않고 `packages/modules/ship/balance.csv`의 현재 `shipTypeId` config에서 계산한다.
- ship resource adapter는 `shipInventory` credit 시 현재 적재량 합계가 `cargoCapacity`를 넘으면 `ship_cargo_capacity_exceeded`로 실패시킨다.
- 입항/비우기 action은 `shipInventory`의 항해 공통 화물을 `hostStates.inventory`로 옮기고 `shipInventory`를 비우는 것을 기본 후보로 둔다.
- 아이동별 도감 아이템은 배에 싣지 않고 `myAidongStates.aidongCodexItems`로 바로 지급한다.
- 배 적재량과 입항/비우기 사이클의 상세 기준은 `.cloud/62_ship_cargo_port_cycle_2026-06-08.md`를 따른다.

숙소/선실 꾸미기 기준:

- 숙소 꾸미기 catalog는 `packages/modules/lodge/decor.csv`에 둔다.
- 선실 꾸미기 catalog는 `packages/modules/ship/decor.csv`에 둔다.
- 구매 비용, 기본 보유량, 배치 가능 위치는 `decor.csv`가 권위다.
- `manifest.ts`에 `decor: 'decor.csv'`를 선언한 모듈은 `pnpm audit:module-decor`를 통과해야 한다.
- item/customs/decor catalog를 함께 확인할 때는 `pnpm audit:module-catalogs`를 사용한다.
- `lodgeStates.furniture`는 숙소 가구 구매 수량을 저장한다.
- `lodgeStates.rooms`는 방별 숙소 가구 배치를 저장한다.
- `shipStates.cabinFurniture`는 선실 가구 구매 수량을 저장한다.
- `shipStates.cabins[slotId].furniture`는 선실별 가구 배치를 저장한다.
- legacy `shipStates.cabins.__furnitureInventory`는 새 구매 경로에서 사용하지 않는다.

아직 확정하지 않는 것:

- 선실 효과와 slot 구조.
- 선실/갑판 effect가 `cargoCapacity`에 보너스를 주는지 여부.
- `shipInventory` 안에서 cargo/material kind별 capacity 계산을 다르게 적용할지 여부.
- `cargo` 예약 필드를 완전히 제거할지, cargo run 상세 구조로 재사용할지 여부.

새 항해 기능을 붙일 때는 먼저 위 경계 안에서 저장 위치를 정하고, 다른 document로 자원을 이동해야 할 때만 customs rule을 추가한다.

## Lodge 육성 허브 상태

2026-06-08 이후 숙소는 Phase 1 핵심 육성 허브다.

현재 기준:

- `lodgeStates.assignedAidongs`는 방에 들어온 Aidong 목록이자 적극 육성 슬롯의 1차 구현이다.
- `packages/modules/lodge/balance.csv`의 `max_assigned_aidongs`는 임시 방 수 제한이다.
- `lodgeStates.rooms`는 방별 꾸미기 배치 상태를 가진다.
- `lodgeStates.furniture`는 숙소 가구 구매 수량 원장이다.
- `lodgeStates.lodgeInventory`는 통 인벤토리 전환 전까지 호환/보류 필드다.
- 항해 중인 Aidong은 숙소 배치에서 제외한다.

후속 후보:

- `roomCapacity`, `unlockedRoomIds`로 방 수 제한을 명시화한다.
- 마당 표시 상태는 우선 `myAidongStates.recruitedAidongs`와 `lodgeStates.assignedAidongs` 차이로 계산한다.
- 케어 권위는 `my-aidong` service에 유지하고, 숙소는 케어 가능 상태와 진입점을 제공한다.
- 연습/업그레이드는 `myAidongStates` 또는 전용 service 후보로 설계한다.

상세 기준은 `.cloud/57_lodge_growth_hub_2026-06-08.md`를 따른다.

## Zone Balance와 Action Rule

zone 계열 모듈은 `balance.csv`를 통해 backend action service에 필요한 조정값 일부를 제공한다.

현재 기준:

- backend service 코드가 `collect`, `clear`, unlock, validation의 권위다.
- 보상 숫자와 zone별 resource/clearId allowlist는 `packages/modules/zone-*/balance.csv`에서 읽는다.
- backend loader는 `packages/backend/src/modules/zone/balance.ts`에 둔다.
- minigame 결과는 backend로 전달하고, service가 result payload를 검증한 뒤 보상을 계산한다.
- unlock 조건, result payload validation, 지급 가능 여부 검증, idempotency 처리는 코드에 유지한다.

새 zone balance 작업 시 주의:

- `balance.csv` 컬럼을 추가하면 parser, schema validation, backend test를 함께 추가한다.
- 잘못된 CSV 값은 runtime 중 조용히 무시하지 말고 startup/check 단계에서 실패시키는 쪽을 우선한다.
- frontend는 보상을 직접 지급하지 않고 backend `clear` 응답의 host state를 병합한다.

## Zone Placement와 자동 생산

2026-06-08 이후 구역 배치 자동 생산은 Phase 1 core loop의 핵심 후보다.

현재 기준:

- 기존 `collect`와 `clear`는 미니게임/POC/호환 action으로 유지한다.
- 자동 생산은 `production/*` action 후보로 분리한다.
- 생산 상태는 `zoneStates.progress.production` 하위에 두는 것을 1차 후보로 본다.
- `zoneStates.localResources`는 자동 생산의 기본 원장이 아니라 legacy/호환 필드로 둔다.
- 생산 보상은 기본적으로 `hostStates.inventory`에 직접 지급한다.

backend service 검증:

- Aidong이 영입되어 있어야 한다.
- Aidong이 항해 중이면 배치할 수 없다.
- 같은 Aidong을 여러 구역, 선실, 갑판, 항구 지원에 중복 배치하지 않는다.
- zone unlock과 active 상태를 확인한다.
- slot limit을 넘기지 않는다.
- 생산 정산은 `lastSettledAt`과 pending 값을 기준으로 중복 지급을 막는다.

상세 기준은 `.cloud/58_zone_placement_production_2026-06-08.md`를 따른다.

## Aidong Minigame Skin

2026-06-08 이후 미니게임은 공통 engine과 Aidong별 skin으로 나누어 본다.

현재 기준:

- `zone-garden`, `zone-oasis`, `zone-memory`, `zone-mine`은 당장 삭제하지 않는다.
- 위 4개 zone 미니게임은 각각 `garden-grow`, `idle-rest`, `memory-match`, `mine-dig` engine 후보로 재분류한다.
- skin catalog는 Aidong별 `engineId`, asset id, 입장재, 보상 item을 정의한다.
- frontend는 result event만 보내고, backend service가 engine별 result payload를 검증한다.
- 일반 보상은 `hostStates.inventory`, Aidong별 도감 아이템은 `myAidongStates.aidongCodexItems` 후보 원장으로 지급한다.

후속 후보:

- `packages/modules/my-aidong/minigame-skins.csv` 또는 별도 minigame catalog를 만든다.
- Aidong별 minigame complete action을 `my-aidong` 또는 별도 `minigame` service로 둘지 결정한다.
- 기존 zone `clear` API는 호환 유지하고, skin 보상이 필요할 때 전용 action을 추가한다.

상세 기준은 `.cloud/59_aidong_minigame_skin_model_2026-06-08.md`를 따른다.

## Codex Item과 Upgrade Economy

2026-06-08 이후 도감 아이템은 단순 수집물이 아니라 아이동 성장 재료다.

현재 기준:

- 도감 아이템 수량은 `myAidongStates.aidongCodexItems` 후보 원장에 둔다.
- 업그레이드 상태는 `myAidongStates.aidongUpgradeState` 후보 원장에 둔다.
- 숙소 연습 상태는 `myAidongStates.practiceState` 후보 원장에 둔다.
- `codexStates`는 도감 표시, 등록, 일지 진행만 담당한다.
- 일반 재료 비용은 `hostStates.inventory`에서 차감한다.

후속 후보:

- `packages/modules/my-aidong/codex-items.csv`를 추가한다.
- `packages/modules/my-aidong/upgrade-recipes.csv`를 추가한다.
- `my-aidong` service에 reward, consume, practice, upgrade action을 추가한다.
- upgrade action은 연습 조건, 도감 아이템 수량, host 재료 비용, 중복 소비를 모두 검증한다.

상세 기준은 `.cloud/60_codex_upgrade_economy_2026-06-08.md`를 따른다.

## 신규 모듈 Backend 체크리스트

- [ ] 모듈 state ownership을 정했다.
- [ ] 공통 `moduleStates` fallback과 전용 repository 중 하나를 선택했다.
- [ ] 전용 저장소가 필요하면 model, repository, registry를 추가했다.
- [ ] `packages/backend/src/modules/modelSpecs.ts`를 갱신했다.
- [ ] 필요한 API를 `/api/modules/{moduleId}` 아래에 추가했다.
- [ ] action API의 validation을 `service.ts`에 두었다.
- [ ] 신규 core loop 보상은 domain action API로 권위 저장소에 직접 반영했다.
- [ ] 실제 cross-module document debit/credit이 필요한 경우에만 customs로 연결했다.
- [ ] frontend API facade 또는 action sync를 연결했다.
- [ ] 신규 runtime code가 `/api/state`를 직접 호출하지 않는다.
- [ ] `pnpm check:backend:model-specs`를 통과했다.
- [ ] `pnpm audit:legacy-state`를 통과했다.
- [ ] 모듈 item/customs/decor catalog를 수정했다면 `pnpm audit:module-catalogs`를 통과했다.
- [ ] `pnpm check:state-route-static`를 통과했다.
- [ ] 필요 시 `pnpm check:state-route-runtime:local`를 통과했다.

## 관련 문서

- `.cloud/20_module_rules.md`
- `.cloud/30_backend_db_rules.md`
- `.cloud/35_backend_db_runbook.md`
- `.cloud/40_frontend_rules.md`
- `.cloud/66_validation_test_realignment_2026-06-08.md`

## 변경 기록

- **2026-06-08**: 세관 UI/UX 제거 결정에 맞춰 module backend 가이드의 customs 우선 표현을 완화했다. Phase 1 신규 보상은 domain action API를 우선하고, customs는 실제 cross-module debit/credit과 compat/dev 검증에만 사용한다.
- **2026-06-08**: 검증과 테스트 재정렬 문서를 연결했다. 모듈 개발 시 `check:module-actions-smoke`와 catalog audit은 유지하되, customs/destination POC 항목은 Phase 1 core blocker와 분리해서 해석한다.
- **2026-06-08**: Backend/API 영향도 조사 문서를 연결했다. Phase 1에서 유지할 route, 숨길 route, 변경할 route와 신규 API 후보는 `.cloud/64_backend_api_impact_2026-06-08.md`를 기준으로 확인한다.
- **2026-06-08**: 배 적재량과 입항/비우기 사이클 설계 문서를 연결했다. `shipInventory`는 항해 중 임시 화물/적재량 압력 원장으로, `hostStates.inventory`는 입항 후 영구 보관소로 정리했다.
- **2026-06-08**: 항해 보드 단순화 결정 자료를 연결했다. 주사위/칸 수/지정 이동 여부는 P0 미결로 유지하고, route service 수정 시 board size와 landing generator를 config화하기 쉬운 구조를 우선하도록 정리했다.
- **2026-06-08**: 도감 아이템과 숙소 업그레이드 경제 설계 문서를 연결했다. 아이동별 25개 도감 아이템 수량, 업그레이드 상태, 숙소 연습 상태는 `myAidongStates` 후보 경계에 두고 `codexStates`를 수량 원장으로 쓰지 않는 기준을 추가했다.
- **2026-06-08**: 아이동별 미니게임 스킨 모델 문서를 연결했다. 4종 zone 미니게임은 공통 engine 후보로 유지하고, Aidong별 skin catalog가 배경, 리소스, 보상, 입장재를 바꾸는 구조로 정리했다.
- **2026-06-08**: 구역 배치 자동 생산 설계 문서를 연결했다. `collect/clear`는 유지하고 자동 생산은 `zoneStates.progress.production`과 `production/*` action 후보로 분리하는 기준을 추가했다.
- **2026-06-08**: 숙소 중심 육성 허브 설계 문서를 연결했다. `lodgeStates.assignedAidongs`를 적극 육성 슬롯의 1차 구현으로 보고, `rooms`/`furniture`는 방 꾸미기, `lodgeInventory`는 호환/보류 필드로 분류했다.
- **2026-06-08**: Customs De-scope 정책 문서를 연결했다. 세관은 기술 자산으로 유지하되 Phase 1 사용자 gate로 강화하지 않고, 단일 저장소 보상은 domain action API를 우선하도록 정리했다.
- **2026-06-08**: 기획 변경 회의 이후 backend module 가이드의 읽기 기준을 추가했다. customs는 기술 자산으로 유지하지만 Phase 1 UX 강제는 보류하고, 통 인벤토리·숙소 중심 루프를 우선한다.
- **2026-06-08**: Phase 1 core loop와 상태 소유권 1차 메모 기준으로 `.cloud/53_core_loop_2026-06-08.md`를 연결했다.
- **2026-06-08**: 항해 아이동 만남과 메인 가변 구역 추가 설계 기준으로 `.cloud/54_aidong_encounter_dynamic_zone_2026-06-08.md`를 연결했다.
- **2026-06-08**: 통 인벤토리와 아이동 귀속 도감 인벤토리 설계 기준으로 `.cloud/55_inventory_codex_item_redesign_2026-06-08.md`를 연결했다.
- **2026-05-29**: `VITE_SPLIT_STATE_SYNC` 설명을 현재 frontend 규칙에 맞게 정리했다. split state sync는 유지하고 action API rollback은 `VITE_MODULE_ACTION_API_SYNC=false`만 사용한다.
- **2026-06-01**: Ship/Lodge customs 1차 구현 기준을 추가했다. `ship/customs.csv`는 ship -> lodge/host, `lodge/customs.csv`는 lodge -> host 이동을 담당하고, 외부 도착 섬 source rule은 해당 모듈 생성 시 추가한다.
- **2026-06-01**: Route landing 1차 backend 계약을 추가했다. `roll`은 landing 후보를 반환하고, current/clear API는 최근 landing과 임시 resource reward 적립을 담당한다.
- **2026-06-05**: Ship inventory/cargo 책임을 현행화했다. 배 적재 원장은 `shipInventory`, capacity 기준은 `ship/balance.csv`의 `cargoCapacity`, `cargo`는 legacy/예약 필드로 둔다. destination island reward는 `shell-fragment`로 이전했고 `deck-cargo`는 호환 보상으로 유지한다.
- **2026-06-05**: Lodge/Ship decor schema를 현행화했다. 숙소/선실 꾸미기 catalog는 각 모듈의 `decor.csv`가 담당하고, 선실 가구 구매 수량은 `shipStates.cabinFurniture`로 승격했다.
- **2026-06-05**: Module action smoke 범위를 확장했다. destination island action API, destination -> ship customs, ship/lodge decor 구매/배치, 조개 조각 item catalog 정합성을 smoke/audit 기준에 포함했다.
- **2026-06-05**: Decor catalog audit 기준을 추가했다. `manifest.ts`에 `decor`를 선언한 모듈은 `pnpm audit:module-decor`로 `decor.csv` 파일, 필수 column, 비용, 기본 보유량, 배치 범위를 검증한다.
- **2026-06-01**: Aidong 전역 아이템 규칙을 추가했다. 소유권은 `hostStates.inventory`, 착용 상태는 `myAidongStates.equippedItems`, 착용 가능 목록은 `my-aidong/items.csv`가 담당한다.
- **2026-06-01**: 신규 모듈 backend 기능의 최소 smoke 기준을 갱신했다. ship type/slot, lodge assign, route landing, Aidong item, ship/lodge/customs transfer는 `check:module-actions-smoke`에 포함되어야 하며, live smoke는 backend server와 local MongoDB 실행 상태에서 수행한다.
- **2026-05-29**: Zone balance/action rule 기준을 현행화했다. zone `balance.csv`는 보상 숫자와 resource/clearId allowlist의 출처이며, unlock과 validation은 backend service 코드에 유지한다.
- **2026-05-29**: Route/Ship 항해 상태의 임시 경계를 추가했다. route-neighbor는 보드 진행, ship은 항구/선박 상태를 소유하며 cargo, 선실 효과, route/ship customs rule은 기획 확정 뒤 구체화한다.
- **2026-05-29**: Customs rule을 임시 운용 체제로 다루는 기준을 추가했다. 모듈 개발자는 `customs.csv` rule의 POC/운영 후보 여부를 description에 남기고, 실제 루프 확정 전에는 기존 rule 삭제를 피한다.
- **2026-05-24**: `zone-oasis`, `zone-memory`, `zone-mine` minigame이 module package로 이전되고 `zoneContentBootstrap` DI hook으로 action API 연결을 주입하는 구조를 반영했다.
- **2026-05-24**: `zone-oasis`, `zone-memory`, `zone-mine`의 과도기 frontend `zoneActionSync` 연결 상태를 반영했다.
- **2026-05-24**: `zone-garden` frontend harvest sync가 module DI hook과 frontend bootstrap을 통해 연결된 상태를 반영했다.
- **2026-05-24**: zone 계열 모듈의 `collect`/`clear` backend action API 패턴을 추가했다.
- **2026-05-24**: `codex`의 diary unlock/codex slot/full registration이 backend action API로 승격된 상태를 반영했다.
- **2026-05-24**: `my-island`의 zone unlock/tutorial completion이 backend action API로 승격된 상태를 반영했다.
- **2026-05-24**: 전용 action route가 없는 광역 모듈의 과도기 frontend sync 패턴을 추가했다. `myIslandBootstrap`의 module/account state API 즉시 patch를 예시로 기록했다.
- **2026-05-24**: 모듈 개발 시 전용 backend 저장소와 API를 사용하는 지침 문서를 신설했다.
