# 모듈 Item Catalog 가이드

이 문서는 모듈별 specific resource와 item을 `items.csv`로 관리하는 규칙을 정리한다.

## 2026-06-08 기획 변경 반영

2026-06-05 기획 변경 회의 이후 item catalog는 다음 기준으로 재검토한다.

- `items.csv`와 `pnpm audit:module-items` 검증은 유지한다.
- 다만 customs를 전제로 한 module-local item 이동은 Phase 1 사용자 핵심 루프에서 보류한다.
- 통 인벤토리는 `hostStates.inventory` 중심으로 재설계한다.
- 아이동별 25 도감 아이템은 Aidong 귀속 inventory로 별도 설계한다.
- 기존 `ship-inventory`, `lodge-inventory`, `module-local` scope는 새 인벤토리 경계가 확정될 때까지 호환/보류 기준으로 본다.
- 통 인벤토리와 아이동 귀속 도감 인벤토리의 상세 설계는 `.cloud/55_inventory_codex_item_redesign_2026-06-08.md`를 따른다.
- 아이동별 도감 아이템과 업그레이드 레시피의 상세 설계는 `.cloud/60_codex_upgrade_economy_2026-06-08.md`를 따른다.
- 새 scope 후보는 `host-global`, `aidong-codex`, `aidong-equipment`, `voyage-cargo`, `module-local-legacy`다. 실제 audit 반영은 schema 확정 뒤 진행한다.

아이동별 도감 아이템과 업그레이드 경제 CSV 후보:

```text
packages/modules/my-aidong/codex-items.csv
packages/modules/my-aidong/upgrade-recipes.csv
```

## 기본 원칙

- 모듈이 소유하는 resource와 item은 해당 모듈 root의 `items.csv`에 정의한다.
- host/global resource는 module item catalog에 넣지 않는다.
- customs로 모듈 경계를 넘는 resource는 source module의 `items.csv`에 반드시 있어야 한다.
- target module이 `items.csv`를 가진다면 customs target resource도 target module의 `items.csv`에 있어야 한다.
- zone `balance.csv`의 `zone_collect_resources`는 같은 zone module의 `items.csv`에 있어야 한다.

## 표준 Column

```txt
itemId,name,kind,stackable,maxStack,scope,description,phase
```

- `itemId`: lowercase 영문/숫자와 `-`, `_`만 사용한다.
- `name`: 화면/기획 문서에서 읽을 표시명이다.
- `kind`: `resource`, `cargo`, `material`, `furniture`처럼 item 성격을 적는다.
- `stackable`: `true` 또는 `false`.
- `maxStack`: 1 이상의 정수.
- `scope`: 현재는 `module-local`, `ship-inventory`, `lodge-inventory`를 사용한다.
- `description`: 기획자와 개발자가 읽을 설명이다.
- `phase`: 적용 또는 후보 phase다.

## 검증

```bash
pnpm audit:module-items
```

검증 항목:

- 필수 column 존재 여부.
- `itemId`, `stackable`, `maxStack`, `scope` 형식.
- module 내부 중복 itemId.
- zone `balance.csv`의 `zone_collect_resources` 참조.
- `customs.csv`의 `fromResource` 참조.
- catalog가 있는 target module의 `toResource` 참조.

## 현재 Catalog 대상

- `zone-garden`
- `zone-oasis`
- `zone-memory`
- `zone-mine`
- `route-neighbor`
- `ship`
- `lodge`

## 변경 기록

- **2026-06-08**: 도감 아이템과 숙소 업그레이드 경제 설계 문서 `.cloud/60_codex_upgrade_economy_2026-06-08.md`를 연결하고, `my-aidong`의 `codex-items.csv`, `upgrade-recipes.csv` 후보를 기록했다.
- **2026-06-08**: 통 인벤토리와 아이동 귀속 도감 인벤토리 설계 문서 `.cloud/55_inventory_codex_item_redesign_2026-06-08.md`를 연결하고, 새 item scope 후보를 기록했다.
- **2026-06-08**: 기획 변경 회의 이후 item catalog 읽기 기준을 추가했다. catalog 검증은 유지하지만 customs 전제 이동은 Phase 1에서 보류하고, 통 인벤토리와 아이동별 도감 인벤토리 설계 이후 scope를 재정의한다.
- **2026-06-01**: `items.csv` 표준과 `pnpm audit:module-items` 검증 흐름을 추가했다.
