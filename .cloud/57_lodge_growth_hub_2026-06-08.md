# 숙소 중심 육성 허브 재설계 2026-06-08

이 문서는 2026-06-05 기획 변경 이후 숙소를 Phase 1의 핵심 육성 허브로 재정의한다.

기준 문서:

- `.cloud/기획변경회의에따른기획변경가이드.md`
- `.cloud/53_core_loop_2026-06-08.md`
- `.cloud/54_aidong_encounter_dynamic_zone_2026-06-08.md`
- `.cloud/55_inventory_codex_item_redesign_2026-06-08.md`
- `.cloud/56_customs_descope_2026-06-08.md`

## 한 줄 정의

숙소는 Phase 1에서 **방=적극 육성 슬롯, 마당=보유/대기 Aidong 표시, 숙소 화면=케어·연습·꾸미기·업그레이드·목록 관리 허브** 역할을 맡는다.

항구와 세관보다 먼저 고도화해야 하는 핵심 화면이다.

## 현재 구현 재해석

| 현재 구현 | 현재 의미 | 새 판정 | 처리 |
|---|---|---|---|
| `lodgeStates.assignedAidongs` | 숙소 배치 Aidong 목록 | 유지/승격 | 적극 육성 슬롯의 1차 구현으로 본다. |
| `max_assigned_aidongs=5` | 숙소 동시 배치 상한 | 유지/확장 | 방 수 제한의 임시 구현으로 둔다. |
| `lodgeStates.rooms` | 방별 가구 배치 상태 | 유지/확장 | Aidong 방과 빈 방 꾸미기 상태를 담당한다. |
| `lodgeStates.furniture` | 숙소 가구 구매 수량 | 유지 | 통 인벤토리와 별개인 꾸미기 보유 원장으로 둔다. |
| `lodgeStates.lodgeInventory` | 숙소 인벤토리 | 축소/호환 | Phase 1 통 인벤토리 전환 후 역할을 낮춘다. |
| `toggleLodgeAidongAssign` | 숙소 배치 toggle | 유지/확장 | 방 배정, 마당 표시, 활동 제한 판단으로 확장 후보. |
| `purchaseLodgeFurniture` | 숙소 가구 구매 | 유지 | 숙소 꾸미기 경제의 현재 구현으로 유지. |
| `toggleLodgeRoomFurniture` | 방 가구 배치 toggle | 유지 | 빈 방 꾸미기도 허용하는 방향으로 유지. |

## 숙소의 세 영역

### 1. 방

방은 적극 육성 가능한 Aidong 슬롯이다.

역할:

- 케어, 밥주기, 연습, 업그레이드 같은 직접 육성 action의 기본 위치.
- Aidong별 방 꾸미기와 반응 연출의 중심.
- 방 수는 동시에 적극 육성 가능한 Aidong 수를 제한한다.

현재 대응:

- `lodgeStates.assignedAidongs`가 방에 들어온 Aidong 목록 역할을 한다.
- `packages/modules/lodge/balance.csv`의 `max_assigned_aidongs`가 임시 방 수 제한이다.
- `lodgeStates.rooms[roomId].furniture`가 방 꾸미기 상태를 가진다.

후속 후보:

```ts
interface LodgeRoomState {
  aidongId?: string
  furniture?: string[]
  themeId?: string
  lastCareAt?: number
  lastPracticeAt?: number
}
```

### 2. 마당

마당은 보유했지만 방에 들어가지 않은 Aidong, 구역 배치 후보, 대기 Aidong을 보여주는 표현 영역이다.

역할:

- 전체 보유 Aidong을 한눈에 보여준다.
- 방이 부족해서 적극 육성 중이 아닌 Aidong을 표시한다.
- 구역 배치, 항해 대기, 이별하기, 방 들여보내기 같은 관리 action의 출발점이다.

현재 대응:

- 전용 필드는 아직 없다.
- `myAidongStates.recruitedAidongs`에서 `lodgeStates.assignedAidongs`, 항해 중 crew, 구역 배치 Aidong을 제외해 계산할 수 있다.

후속 후보:

```ts
interface LodgeStateDoc {
  yardLayout?: Record<string, { x?: number; y?: number; pose?: string }>
}
```

마당 배치는 미관/표시 상태이므로 Phase 1 초반에는 계산형 selector로 시작해도 된다.

### 3. 전체 컨트롤 허브

숙소 화면은 Aidong 관리의 시작점이다.

필수 진입:

- 케어.
- 밥주기.
- 연습.
- 꾸미기.
- 아이템 착용.
- 도감 아이템/업그레이드.
- 방 배정.
- 구역 배치 후보 확인.
- 항해 중/구역 배치 중 상태 확인.

숙소가 모든 기능을 직접 구현할 필요는 없다. 숙소는 각 domain 화면이나 action으로 들어가는 허브가 된다.

## Aidong 활동 상태와 허용 범위

Aidong은 동시에 여러 장소에 중복 배치될 수 없다.

| 상태 | 방 꾸미기 | 케어/밥주기 | 연습 | 아이템 착용 | 구역 배치 | 비고 |
|---|---|---|---|---|---|---|
| 방에 있음 | 가능 | 가능 | 가능 | 가능 | 가능 후보 | 적극 육성 상태 |
| 마당 대기 | 가능 후보 | 제한 또는 불가 후보 | 제한 또는 불가 후보 | 가능 | 가능 | 방 수 제한의 의미를 살리려면 육성 action은 제한한다. |
| 항해 중 | 가능 | 불가 | 불가 | 제한 후보 | 불가 | 방 자체는 꾸밀 수 있지만 직접 케어는 하지 않는다. |
| 구역 배치 중 | 가능 | 제한 후보 | 제한 후보 | 가능 후보 | 이미 배치됨 | 생산 중인 상태. 케어 가능 여부는 밸런스 미결. |
| 선실 배치 중 | 가능 후보 | 선실 화면에서 가능 후보 | 선실 화면에서 가능 후보 | 가능 후보 | 불가 | 선실이 숙소와 같은 육성 공간인지 후속 결정 필요. |
| 이별/비활성 | 읽기 전용 후보 | 불가 | 불가 | 불가 | 불가 | 도감/기록 보존 정책 필요. |

현재 구현은 항해 중인 Aidong의 숙소 배치를 `aidong_is_sailing`으로 막는다. 이 기준은 유지한다.

## 방 수 제한

1차 기준:

- 방 수는 적극 육성 가능한 Aidong 수를 제한한다.
- 현재 `max_assigned_aidongs=5`를 임시 방 수로 본다.
- 신규 사용자는 적은 방 수로 시작하고, 숙소 업그레이드나 진행도에 따라 확장하는 후보를 둔다.

후속 상태 후보:

```ts
interface LodgeStateDoc {
  roomCapacity?: number
  unlockedRoomIds?: string[]
}
```

당장 schema를 급히 바꾸지는 않는다. 구현 전까지는 `balance.csv`의 `max_assigned_aidongs`와 `assignedAidongs.length`를 사용한다.

## 케어와 연습

현재 케어 권위는 `my-aidong` 쪽에 있다.

유지:

- 욕구, 호감도, care log는 `myAidongStates`가 소유한다.
- 케어 action validation은 `my-aidong` service가 맡는다.

숙소의 역할:

- 어떤 Aidong이 케어 가능한 상태인지 계산한다.
- 방에 있는 Aidong을 우선 케어 대상으로 보여준다.
- 마당/항해/구역 배치 중인 Aidong의 action 가능 여부를 표시한다.

연습은 아직 명확한 backend 소유권이 없다.

후보:

- `myAidongStates.practiceState`: Aidong별 연습 레벨, 마지막 연습 시각, 연습 로그.
- `lodgeStates.practiceStations`: 숙소 안 연습 시설 배치/해금 상태.
- `codexStates`와 연결: 연습 결과가 도감/업그레이드 해금에 영향을 줄 수 있음.

## 꾸미기

숙소 꾸미기는 Phase 1에서 유지/확장한다.

규칙:

- 숙소 꾸미기 catalog는 `packages/modules/lodge/decor.csv`가 권위다.
- 구매 수량은 `lodgeStates.furniture`에 둔다.
- 방별 배치 상태는 `lodgeStates.rooms`에 둔다.
- 빈 방도 꾸밀 수 있어야 한다.
- Aidong이 항해 중이거나 구역 배치 중이어도 방 자체 꾸미기는 가능하다.
- 꾸미기 구매 비용은 host resource를 차감한다.

`lodgeInventory`는 꾸미기 구매 원장이 아니다. 기존 호환 인벤토리로만 둔다.

## 업그레이드와 도감 아이템

숙소는 아이동 업그레이드 진입점이다.

상태 소유 후보:

- 아이동별 도감 아이템 수량: `myAidongStates.aidongCodexItems`.
- 아이동별 업그레이드 상태: `myAidongStates.aidongUpgradeState`.
- 도감 표시/해금 진척: `codexStates`.

숙소 UI는 다음을 보여준다.

- Aidong별 업그레이드 가능 여부.
- 필요한 도감 아이템.
- 부족한 재료.
- 업그레이드 결과 후보.

실제 업그레이드 action은 `my-aidong` 또는 전용 upgrade service 후보로 둔다.

도감 아이템과 업그레이드 경제의 상세 기준은 `.cloud/60_codex_upgrade_economy_2026-06-08.md`를 따른다.

## 화면 구조 후보

숙소 메인:

```txt
상단: 숙소 이름, 방 수, 보유 Aidong 수, 현재 집중 육성 수
중앙: 방 카드 목록
하단/보조: 마당 Aidong 목록
우측 또는 팝업: 선택 Aidong 상세
```

방 카드:

- 방 이름 또는 Aidong 이름.
- Aidong 상태.
- 케어/밥/연습/꾸미기/업그레이드 버튼.
- 빈 방이면 꾸미기와 배정 버튼.

마당:

- 방에 없는 Aidong 목록.
- 방 들여보내기.
- 구역 배치 후보.
- 항해 중/생산 중/대기 중 badge.

## Backend/API 후보

현재 유지:

```txt
GET  /api/modules/lodge/config
POST /api/modules/lodge/aidongs/assign-toggle
POST /api/modules/lodge/furniture/purchase
POST /api/modules/lodge/rooms/furniture/toggle
```

후속 후보:

```txt
GET  /api/modules/lodge/hub
POST /api/modules/lodge/rooms/assign
POST /api/modules/lodge/rooms/unassign
POST /api/modules/lodge/rooms/furniture/set
POST /api/modules/lodge/practice/start
POST /api/modules/lodge/practice/complete
```

`GET /hub`는 여러 collection을 직접 합치는 큰 API가 될 수 있으므로 신중하게 본다. 처음에는 frontend facade가 `lodge`, `my-aidong`, `ship`, `route-neighbor`, `zone` 상태를 읽어 hub selector를 구성해도 된다.

## 당장 하지 않을 것

- `lodgeInventory` 삭제.
- `lodgeStates.rooms` 구조 강제 migration.
- 숙소가 `myAidongStates`를 직접 소유하도록 경계 뒤집기.
- 세관을 숙소 핵심 버튼으로 다시 올리기.
- 방 수 제한 없이 모든 Aidong에게 케어/연습을 허용하는 UX.
- 선실과 숙소를 완전히 같은 육성 공간으로 확정하기.

## 구현 순서 후보

1. 숙소 frontend selector에서 Aidong을 `방`, `마당`, `항해 중`, `구역 배치 중`으로 분류한다.
2. 숙소 화면의 primary action을 케어, 연습, 꾸미기, 업그레이드로 재배치한다.
3. 빈 방 꾸미기를 명시적으로 허용하는 UI를 만든다.
4. 방에 없는 Aidong은 케어/연습 버튼을 disabled 처리하거나 제한 설명을 붙인다.
5. `lodge/balance.csv`의 `max_assigned_aidongs`를 방 수 제한의 임시 권위로 유지한다.
6. `my-aidong`에 연습/업그레이드 action이 생기면 숙소에서 진입점을 연결한다.
7. smoke는 숙소 진입, 방 배치, 가구 구매/배치, 케어 진입, 항해 중 Aidong 배치 차단을 확인한다.

## 미결 질문

- 초기 방 수를 몇 개로 둘 것인가.
- 방에 없는 마당 Aidong도 케어/연습을 일부 허용할 것인가.
- 구역 배치 중인 Aidong을 숙소에서 케어하면 생산 효율에 어떤 영향을 줄 것인가.
- 선실은 숙소와 같은 케어 공간인가, 항해 중 임시 케어 공간인가.
- 연습 결과는 능력치, 미니게임, 생산 효율, 도감 업그레이드 중 어디에 연결할 것인가.

## 변경 기록

- **2026-06-08**: 도감 아이템과 숙소 업그레이드 경제 설계 문서 `.cloud/60_codex_upgrade_economy_2026-06-08.md`를 연결했다.
- **2026-06-08**: 최초 작성. 숙소를 방=적극 육성 슬롯, 마당=보유/대기 Aidong 표시, 숙소 화면=케어·연습·꾸미기·업그레이드·목록 관리 허브로 재정의했다.
