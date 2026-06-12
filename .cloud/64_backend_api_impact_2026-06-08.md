# Backend/API 영향도 조사 2026-06-08

이 문서는 2026-06-05 기획 변경 회의 이후 backend module route, service, model의 영향도를 정리한다.

기준 문서:

- `.cloud/기획변경회의에따른기획변경가이드.md`
- `.cloud/51_next_work_2026-06-08.md`
- `.cloud/53_core_loop_2026-06-08.md`
- `.cloud/55_inventory_codex_item_redesign_2026-06-08.md`
- `.cloud/56_customs_descope_2026-06-08.md`
- `.cloud/60_codex_upgrade_economy_2026-06-08.md`
- `.cloud/61_voyage_board_simplification_2026-06-08.md`
- `.cloud/62_ship_cargo_port_cycle_2026-06-08.md`

## 한 줄 정의

Backend는 서버와 module storage 분리 구조를 유지하되, Phase 1 API 우선순위는 **숙소 중심 육성, 아이동 만남, 가변 구역, 통 인벤토리, 구역 배치 생산, 입항/비우기**로 재정렬한다.

세관, destination island, 30칸 주사위 보드, ship/lodge 분리 인벤토리 흐름은 삭제가 아니라 보류/숨김/호환 대상으로 둔다.

## 현재 backend module route 목록

| module | 현재 route | Phase 1 판정 | 비고 |
|---|---|---|---|
| `codex` | `POST /unlock-diary` | 유지 | 표시/일지 해금 상태. 수량 원장 아님 |
| `codex` | `POST /unlock-slot` | 유지 | 도감 표시/등록 흐름 |
| `codex` | `POST /fully-register` | 유지/확장 후보 | 업그레이드 조건과 관계는 후속 결정 |
| `destination-island` | `GET /config` | 숨김/보존 | 이벤트 섬/PixiJS POC 후보 |
| `destination-island` | `POST /move` | 숨김/보존 | Phase 1 core loop 필수 아님 |
| `destination-island` | `POST /hotspots/interact` | 숨김/보존 | 연출 POC 후보 |
| `destination-island` | `POST /missions/clear` | 숨김/보존 | 세관 gate와 묶지 않음 |
| `lodge` | `GET /config` | 유지/승격 | 숙소 허브 핵심 |
| `lodge` | `POST /aidongs/assign-toggle` | 유지/확장 | 방/마당/육성 슬롯 기준으로 확장 |
| `lodge` | `POST /furniture/purchase` | 유지 | 꾸미기 구매 |
| `lodge` | `POST /rooms/furniture/toggle` | 유지 | 빈 방 꾸미기 허용 기준 유지 |
| `my-aidong` | `POST /recruit` | 유지/승격 | 항해 만남 수락 흐름 핵심 |
| `my-aidong` | `POST /affinity` | 유지 | 케어/육성 |
| `my-aidong` | `POST /outfit` | 유지 | 외형 프리셋 |
| `my-aidong` | `POST /items/equip-toggle` | 유지 | host inventory 기반 착용 |
| `my-island` | `POST /unlock-zone` | 유지/확장 | 가변 Aidong 구역 추가 후보 |
| `my-island` | `POST /tutorial/complete` | 유지 | onboarding/progress |
| `route-neighbor` | `POST /start` | 유지/축소 | 항해 시작. 보드 방식 미결 |
| `route-neighbor` | `POST /roll` | 보류/변경 후보 | 주사위 확정 전 고도화 금지 |
| `route-neighbor` | `POST /end` | 유지 | 항해 종료/복귀 |
| `route-neighbor` | `GET /landing/current` | 유지/재정의 | landing을 Aidong/material/codex/event 중심으로 재정의 |
| `route-neighbor` | `POST /landing/clear` | 유지/재정의 | 만남/보상 처리 후보 |
| `ship` | `GET /config` | 유지 | ship type/capacity/config |
| `ship` | `POST /type/change` | 유지/후속 | 배 업그레이드/종류 변경 후보 |
| `ship` | `POST /cabins/assign` | 보류/후속 | 선실/숙소 경계 재논의 후 |
| `ship` | `POST /deck/assign` | 보류/후속 | 항해 중 배치 정책 확정 후 |
| `ship` | `POST /harbor/assign-toggle` | 축소/후속 | 항구 지원 배치와 중복 배치 정책 재검토 |
| `ship` | `POST /harbor/charge` | 유지/후속 | 출항 준비/주사위 경제가 확정되면 조정 |
| `ship` | `POST /cabins/furniture/purchase` | 유지/후속 | 선실 꾸미기 후보 |
| `ship` | `POST /cabins/furniture/toggle` | 유지/후속 | 선실 꾸미기 후보 |
| `zone` | `POST /collect` | 유지/호환 | 미니게임/POC 호환 |
| `zone` | `POST /clear` | 유지/확장 | 미니게임 결과 검증과 보상 지급 |

## 신규/변경 API 후보

### my-aidong

아이동 만남, 도감 아이템, 연습, 업그레이드를 흡수한다.

후보:

```text
GET  /api/modules/my-aidong/:characterId/codex-items
POST /api/modules/my-aidong/:characterId/codex-items/reward
POST /api/modules/my-aidong/:characterId/codex-items/consume
POST /api/modules/my-aidong/:characterId/practice/complete
POST /api/modules/my-aidong/:characterId/upgrade
```

주의:

- reward/consume은 프론트 직접 호출보다 내부 service 호출 우선.
- upgrade는 연습 조건, 도감 아이템 수량, host 재료, 중복 소비를 검증.

### route-neighbor

항해 만남과 보상 처리 중심으로 재정의한다.

후보:

```text
POST /api/modules/route-neighbor/encounter/accept
POST /api/modules/route-neighbor/explore
POST /api/modules/route-neighbor/landing/resolve
```

주의:

- `roll`은 주사위 확정 전까지 현재 구현 호환용으로 둔다.
- `encounter/accept`는 `my-aidong` 영입, `my-island` 가변 구역 추가, 숙소 합류, landing clear를 멱등하게 묶는 후보다.

### my-island

가변 Aidong 구역을 명시해야 한다.

후보:

```text
POST /api/modules/my-island/dynamic-zones/add
POST /api/modules/my-island/dynamic-zones/hide
POST /api/modules/my-island/dynamic-zones/restore
```

주의:

- 기존 `unlock-zone`은 고정 구역/POC 호환으로 유지.
- dynamic zone schema가 확정되기 전까지 급한 migration은 하지 않는다.

### lodge

숙소 허브를 보강한다.

후보:

```text
GET  /api/modules/lodge/hub
POST /api/modules/lodge/rooms/assign
POST /api/modules/lodge/rooms/unassign
POST /api/modules/lodge/practice/complete
```

주의:

- 케어/욕구/호감도 권위는 `my-aidong` service에 유지한다.
- 숙소는 허브와 eligibility 계산을 담당한다.

### zone

자동 생산을 `collect/clear`와 분리한다.

후보:

```text
POST /api/modules/{zoneId}/production/assign
POST /api/modules/{zoneId}/production/unassign
POST /api/modules/{zoneId}/production/claim
```

주의:

- 생산 보상은 기본적으로 `hostStates.inventory`에 직접 지급.
- `localResources`는 legacy/호환 필드로 낮춘다.

### ship

입항/비우기 action을 추가한다.

후보:

```text
POST /api/modules/ship/harbor/unload
```

후속:

```text
POST /api/modules/ship/harbor/sell-cargo
POST /api/modules/ship/harbor/store-cargo
POST /api/modules/ship/harbor/craft-from-cargo
POST /api/modules/ship/harbor/discard-cargo
```

주의:

- `shipInventory`는 항해 중 임시 화물/적재량 압력 원장.
- unload는 `shipInventory`를 `hostStates.inventory`로 옮기고 비우는 action 후보.

## Model 영향도

### myAidongStates

추가 후보:

```text
aidongCodexItems
aidongUpgradeState
practiceState
```

영향:

- `MyAidongStateModel`
- `memoryModuleRepositories`
- `mongoModuleRepositories`
- `modelSpecs.ts`
- `moduleRepositoryRegistry`
- `my-aidong/service.ts`

### myIslandStates

추가 후보:

```text
dynamicAidongZones
```

영향:

- `MyIslandStateModel`
- `my-island/service.ts`
- route-neighbor encounter accept 흐름

### zoneStates

추가 후보:

```text
progress.production
```

영향:

- `ZoneStateModel`
- `zone/service.ts`
- production assign/claim action

### shipStates

의미 재정의:

```text
shipInventory = 항해 중 임시 화물/적재량 압력 원장
cargo = legacy/예약 필드
cargoCapacity = ship/balance.csv 계산값
```

추가 후보:

```text
shipUpgradeState
```

영향:

- `ShipStateModel`
- `ship/service.ts`
- ship resource adapter
- ship config/balance loader

### codexStates

유지:

```text
unlockedDiaries
unlockedCodexEntries
codexFullyRegistered
```

주의:

- 아이동별 도감 아이템 수량은 저장하지 않는다.
- upgrade 경제의 원장이 아니라 표시/등록/일지 상태로 유지한다.

## Customs와 smoke 영향도

Phase 1에서 세관 UI gate는 내린다.

유지:

- `/api/customs/rules`
- `/api/customs/apply`
- `/api/customs/logs`
- `customsLogs`
- resource adapter
- registered rule

변경:

- 새 core loop smoke는 세관 팝업 통과를 필수 조건으로 삼지 않는다.
- zone/route/ship/lodge 보상은 가능한 한 domain action API가 권위 저장소에 직접 반영한다.
- 기존 customs smoke는 backend 검증 또는 dev/검증 경로로 분리한다.

위험:

- 기존 smoke가 destination island -> ship -> lodge -> customs를 전제하면 새 core loop와 충돌한다.
- customs rule audit이 모든 module-local item 이동을 강제하면 Phase 1 설계와 충돌할 수 있다.

## 통 인벤토리 migration 영향

당장 대규모 migration은 하지 않는다.

원칙:

- `hostStates.inventory`는 통 인벤토리 권위로 승격.
- `shipInventory`, `lodgeInventory`, `localResources`는 삭제하지 않고 호환/보류 필드로 유지.
- 신규 보상은 가능하면 `hostStates.inventory`, `myAidongStates.aidongCodexItems`, `shipStates.shipInventory` 중 명확한 권위 저장소로 들어간다.
- 기존 필드는 읽기 호환, smoke 호환, POC 보존을 위해 유지한다.

마이그레이션이 필요한 시점:

- 기존 사용자 데이터를 새 UI에서 보여줘야 할 때.
- ship/lodge/local inventory를 실제로 비우거나 숨길 때.
- `aidongCodexItems`, `dynamicAidongZones`, `production` 필드를 모델에 추가할 때.
- `pnpm check:backend:model-specs`가 새 owned field와 맞아야 할 때.

## 우선순위

1. `my-aidong`: 도감 아이템, 연습, 업그레이드 상태 후보 추가.
2. `route-neighbor`: `aidong-encounter`와 material/codex reward 중심 landing 재정의.
3. `my-island`: 가변 Aidong 구역 상태 후보 추가.
4. `lodge`: 숙소 허브 action과 eligibility 계산.
5. `zone`: 자동 생산 `production/*` action 후보.
6. `ship`: `harbor/unload`와 shipInventory 의미 정리.
7. `codex`: 표시/등록 API 유지. 수량 원장으로 확장 금지.
8. `destination-island`: Phase 1 core loop에서는 숨김/보존.
9. `customs`: backend 기술 자산 유지. 사용자 gate 비활성.

## 당장 하지 않을 것

- 통합 `/api/state` 부활.
- `shipInventory`, `lodgeInventory`, `localResources` 강제 삭제.
- destination island route 제거.
- customs backend 제거.
- `codexStates`에 아이동별 도감 아이템 수량 저장.
- 30칸 주사위 보드 전용 API 고도화.
- 기술팀 판단 전 backend 물리 통합/분리 최종 결정.

## 후속 작업

1. `MyAidongStateModel` 필드 추가 작업을 별도 next item으로 만든다.
2. `route-neighbor` landing payload를 새 reward type 중심으로 설계한다.
3. `my-island` dynamic zone schema를 확정한다.
4. `ship/harbor/unload` action을 구현 후보로 쪼갠다.
5. `zone production` action 설계를 코드 작업 단위로 나눈다.
6. smoke를 새 core loop 기준으로 재정렬한다.

## 변경 기록

- **2026-06-08**: 최초 작성. 2026-06-08 기획 변경 기준으로 backend module route, 신규 API 후보, model 영향도, customs/smoke 영향도를 분류했다.
