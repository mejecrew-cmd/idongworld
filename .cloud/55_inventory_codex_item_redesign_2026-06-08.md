# 통 인벤토리와 아이동 귀속 도감 인벤토리 재설계 2026-06-08

이 문서는 2026-06-05 기획 변경 회의 이후 Phase 1 인벤토리와 도감 아이템 소유권을 다시 정의한다.

기준 문서:

- `.cloud/기획변경회의에따른기획변경가이드.md`
- `.cloud/53_core_loop_2026-06-08.md`
- `.cloud/54_aidong_encounter_dynamic_zone_2026-06-08.md`

## 한 줄 정의

Phase 1에서는 **통 인벤토리는 `hostStates.inventory`가 소유하고, 아이동별 25 도감 아이템은 해당 Aidong에 귀속된 별도 inventory로 둔다.** 배/숙소/모듈 로컬 인벤토리는 삭제하지 않고 호환/보류 필드로 낮춘다.

## 주요 결정

| 항목 | 결정 |
|---|---|
| 통 인벤토리 권위 | `hostStates.inventory` |
| Aidong 착용 아이템 소유권 | `hostStates.inventory` |
| Aidong 착용 상태 | `myAidongStates.equippedItems` |
| Aidong별 25 도감 아이템 소유권 | `myAidongStates.aidongCodexItems` 후보 |
| Codex의 역할 | 해금/등록/표시 진척. 소유 수량 원장은 아님 |
| 배 인벤토리 | Phase 1에서는 적재량 압력 장치 또는 호환 필드 |
| 숙소 인벤토리 | Phase 1에서는 호환/보류 필드 |
| 모듈 local resource | 자동 생산/미니게임 내부 임시 상태 후보. core loop에서는 통 인벤토리 지급 우선 |
| 세관 | Phase 1 사용자 필수 gate 아님. 내부 infra/Post 후보 |

## 현재 구현과의 대응

| 현재 필드 | 현재 의미 | 새 판정 | 후속 처리 |
|---|---|---|---|
| `hostStates.inventory` | 전역 보관소, Aidong 착용 아이템 소유권 | 유지/승격 | 통 인벤토리 권위로 사용 |
| `myAidongStates.equippedItems` | Aidong별 착용 아이템 참조 | 유지 | host inventory 수량 예약 방식 유지 |
| `codexStates.unlockedCodexEntries` | 도감 slot 해금 | 유지 | 표시/해금 진척으로 유지 |
| `codexStates.codexFullyRegistered` | 완전 등록 | 유지/확장 | 업그레이드 조건과 연결 후보 |
| `shipStates.shipInventory` | 배 적재 자원 원장 | 축소/호환 | 배 적재량/입항 압력 장치로 재정의 필요 |
| `lodgeStates.lodgeInventory` | 숙소 보관소 | 보류 | 통 인벤토리 전환 후 축소 후보 |
| `zoneStates.localResources` | zone-local resource | 재사용/축소 | 자동 생산 pending 또는 내부 생산량으로 재설계 후보 |
| `destinationIslandStates.localResources` | 도착 섬 전용 자원 | 보류 | 이벤트 섬 POC 후보 |
| `routeNeighborStates.localResources` | route 호환 resource | 보류 | 기존 smoke 호환 필드 |

## 통 인벤토리

### 권위 필드

```ts
interface HostStateDoc {
  inventory: Record<string, number>
}
```

규칙:

- 일반 재료, 제작 재료, 꾸미기 구매 재료, 미니게임 보상, 항해 공통 아이템은 기본적으로 `hostStates.inventory`에 쌓는다.
- 아이템 수량 증감은 host API 또는 domain action API가 처리한다.
- frontend가 직접 `useUserStore.inventory`만 바꿔 보상을 흉내내는 방식은 fallback으로만 둔다.
- `inventory`는 슬롯 고정 모델이 아니다. itemId 기반 수량 map이다.

### item kind 후보

```txt
material
crafting-material
voyage-common
aidong-equipment
decor-material
upgrade-material
currency-like
```

`coins`, `gems`, `diamonds` 같은 재화 필드는 당장은 별도 숫자 필드로 유지한다.

## 아이동별 25 도감 아이템

### 권장 소유권

`myAidongStates`에 다음 필드를 추가하는 후보를 둔다.

```ts
interface MyAidongStateDoc {
  aidongCodexItems?: Record<string, Record<string, number>>
  aidongUpgradeState?: Record<string, AidongUpgradeState>
}

interface AidongUpgradeState {
  level?: number
  unlockedMachines?: string[]
  consumedCodexItems?: Record<string, number>
}
```

예:

```json
{
  "aidongCodexItems": {
    "황금멍": {
      "hwanggumeong-bone-mic": 2,
      "hwanggumeong-golden-paw": 1
    }
  }
}
```

선정 이유:

- 아이동과 이별하면 해당 아이동의 25 도감 인벤토리와 생산 라인이 함께 빠진다는 기획과 맞다.
- `my-aidong`은 이미 영입, needs, care, 착용 상태를 소유한다.
- 도감 아이템은 전역 통 인벤토리보다 특정 Aidong의 성장 재료 성격이 강하다.
- 도감 아이템과 업그레이드 경제의 상세 기준은 `.cloud/60_codex_upgrade_economy_2026-06-08.md`를 따른다.

### Codex와의 역할 분리

`codexStates`는 다음 역할에 집중한다.

- 도감 entry 해금 여부.
- 일기/스토리 해금 여부.
- 완전 등록 여부.
- UI 표시와 수집 진척 요약.

`codexStates`는 25개 아이템의 실제 수량 원장으로 쓰지 않는다.

필요하면 `codexStates`는 `myAidongStates.aidongCodexItems`를 읽은 결과를 summary로 보여준다.

## 항해 보상 분기

항해 보상은 다음처럼 나눈다.

| 보상 유형 | 저장 위치 | 예시 |
|---|---|---|
| Aidong encounter | `myAidongStates`, `myIslandStates` | 새 Aidong 영입, 가변 구역 추가 |
| Aidong codex item | `myAidongStates.aidongCodexItems[characterId]` | 황금멍 도감 조각 |
| 일반 재료 | `hostStates.inventory` | 나무, 광석, 천 |
| 제작 재료 | `hostStates.inventory` | 마이크 부품, 장식 재료 |
| 공통 항해 화물 | `shipStates.shipInventory` 또는 `hostStates.inventory` | 조개, 항해 화물 |
| 재화 | `hostStates.coins/gems/diamonds` | 코인, 보석 |

공통 항해 화물은 미결이다.

- 회의 기준으로는 배 인벤토리/내 인벤토리 구분이 없다.
- 다만 배 적재량은 입항/비우기 사이클의 압력 장치로 유지된다.
- 따라서 `shipInventory`는 실제 소유권 원장보다 "항해 중 적재량 압력" 또는 "입항 전 임시 화물"로 재정의하는 후보가 있다.
- 배 적재량과 입항/비우기 사이클의 상세 기준은 `.cloud/62_ship_cargo_port_cycle_2026-06-08.md`를 따른다.

## item catalog scope 재정의 후보

기존 scope:

```txt
module-local
ship-inventory
lodge-inventory
aidong-global
```

새 후보:

```txt
host-global
aidong-codex
aidong-equipment
voyage-cargo
module-local-legacy
```

권장:

- `host-global`: 통 인벤토리 아이템.
- `aidong-codex`: 특정 Aidong에게 귀속되는 25 도감 아이템.
- `aidong-equipment`: host inventory에 보관하지만 Aidong이 착용할 수 있는 아이템.
- `voyage-cargo`: 배 적재량 압력에 걸리는 항해 화물.
- `module-local-legacy`: 기존 POC/호환용 local resource.

`pnpm audit:module-items`는 새 scope가 확정된 뒤 업데이트한다. 지금 당장은 기존 scope를 깨지 않는다.

## Customs와의 관계

상세 de-scope 정책은 `.cloud/56_customs_descope_2026-06-08.md`를 따른다.

Phase 1:

- 세관은 유저 필수 행동이 아니다.
- 아이템 획득은 가능한 한 domain action이 직접 권위 저장소에 반영한다.
- 예: 항해에서 아이동 도감 아이템 획득 -> `myAidongStates.aidongCodexItems` 직접 증가.
- 예: 구역 자동 생산 정산 -> `hostStates.inventory` 직접 증가.

보존:

- `customsLogs`, resource adapter, idempotency는 기술 자산으로 유지한다.
- 기존 smoke와 POC rule은 당장 삭제하지 않는다.
- 외부 IP 콜라보 또는 완전 모듈화가 필요해질 때 customs를 다시 사용자 루프로 올릴 수 있다.

## 기존 필드 처리 정책

### 유지

- `hostStates.inventory`
- `myAidongStates.equippedItems`
- `codexStates.unlockedDiaries`
- `codexStates.unlockedCodexEntries`
- `codexStates.codexFullyRegistered`

### 추가 후보

- `myAidongStates.aidongCodexItems`
- `myAidongStates.aidongUpgradeState`

### 호환/보류

- `shipStates.shipInventory`
- `lodgeStates.lodgeInventory`
- `zoneStates.localResources`
- `routeNeighborStates.localResources`
- `destinationIslandStates.localResources`
- `destinationIslandStates.localInventory`

### 당장 금지

- migration 없이 `shipInventory`, `lodgeInventory`, `localResources` 삭제.
- `codexStates`를 아이템 수량 원장으로 급히 확장.
- `hostStates.inventory`와 `myAidongStates.aidongCodexItems`에 같은 아이템을 중복 원장으로 저장.
- 세관을 없앤다는 이유로 backend action validation 없이 frontend에서 직접 보상 지급.

## 구현 순서 후보

1. item scope 정책을 문서로 확정한다.
2. `MyAidongStateModel`에 `aidongCodexItems`, `aidongUpgradeState` 후보 필드를 추가한다.
3. `moduleDefaults`와 `modelSpecs`에 새 필드를 반영한다.
4. my-aidong service에 `rewardAidongCodexItem`, `consumeAidongCodexItem` 후보 action을 추가한다.
5. route-neighbor encounter/material landing에서 보상 타입을 `aidongCodexItem`, `hostInventory`, `voyageCargo`로 구분한다.
6. frontend store/facade에 아이동별 도감 아이템 selector를 추가한다.
7. 기존 customs/destination/ship/lodge inventory smoke는 보존하되 새 core loop smoke를 별도로 만든다.

## 미결 질문

- 아이동별 25 도감 아이템 catalog를 `packages/modules/my-aidong/items.csv`에 둘지, 별도 `codex-items.csv`를 만들지.
- `aidongCodexItems`를 `myAidongStates`에 둘지, 장기적으로 `aidongCodexItemStates` 전용 collection으로 뺄지.
- 배 적재량이 `hostStates.inventory`와 어떻게 연결되는지.
- 통 인벤토리에서 항해 중 입항 전까지 잠긴 화물 상태가 필요한지.
- 업그레이드 소비 후 도감 등록 상태는 유지되는지, 소비와 등록을 분리할지.

## 변경 기록

- **2026-06-08**: 배 적재량과 입항/비우기 사이클 설계 문서 `.cloud/62_ship_cargo_port_cycle_2026-06-08.md`를 연결했다.
- **2026-06-08**: 도감 아이템과 숙소 업그레이드 경제 설계 문서 `.cloud/60_codex_upgrade_economy_2026-06-08.md`를 연결했다.
- **2026-06-08**: Customs De-scope 정책 문서를 연결했다. 통 인벤토리와 아이동 귀속 도감 인벤토리 전환에서 세관을 사용자 필수 행동으로 쓰지 않는 기준을 명확히 했다.
- **2026-06-08**: 최초 작성. 통 인벤토리는 `hostStates.inventory`, 아이동별 25 도감 아이템은 `myAidongStates.aidongCodexItems` 후보로 두고, 기존 ship/lodge/local inventory는 호환/보류 필드로 분류했다.
