# 배 적재량과 입항 사이클 재정의 2026-06-08

이 문서는 2026-06-05 기획 변경 회의 이후 배 적재량, 항해 화물, 통 인벤토리, 입항/비우기 사이클의 관계를 다시 정의한다.

기준 문서:

- `.cloud/기획변경회의에따른기획변경가이드.md`
- `.cloud/53_core_loop_2026-06-08.md`
- `.cloud/55_inventory_codex_item_redesign_2026-06-08.md`
- `.cloud/61_voyage_board_simplification_2026-06-08.md`

## 한 줄 정의

Phase 1에서 배 적재량은 **별도 영구 인벤토리라기보다 항해 중 획득한 공통 화물을 입항 전까지 묶어두는 압력 장치**다.

아이동별 도감 아이템은 배에 싣지 않고 해당 Aidong 귀속 인벤토리로 바로 들어간다.

## 핵심 원칙

- 통 인벤토리의 영구 소유권은 `hostStates.inventory`가 담당한다.
- 항해 중 입항 전 임시 화물은 `shipStates.shipInventory` 후보로 둔다.
- 배 적재량은 `shipTypeId`와 ship balance config에서 계산한다.
- 배 적재량이 차면 입항해 비우고 다시 항해하는 사이클을 만든다.
- 아이동별 도감 아이템은 `myAidongStates.aidongCodexItems`에 바로 지급한다.
- 아이동 만남은 `myAidongStates`와 `myIslandStates` 상태 전이로 처리한다.
- 세관은 Phase 1 필수 사용자 gate가 아니며, 입항/비우기는 ship 또는 host domain action으로 처리한다.

## 현재 용어 재정의

| 현재 용어 | 현재 의미 | 새 판정 | 새 의미 |
|---|---|---|---|
| `shipInventory` | 배 적재 자원 원장 | 유지/재정의 | 항해 중 입항 전 임시 화물 또는 적재량 압력 원장 |
| `cargo` | legacy/예약 필드 | 보류 | cargo run 상세 구조 후보. 현재 적재 수량 원장으로 쓰지 않음 |
| `cargoCapacity` | 배 적재량 | 유지/계산값 | `shipTypeId`와 `ship/balance.csv`에서 계산되는 capacity |
| `hostStates.inventory` | 전역 보관소 | 유지/승격 | 입항 후 영구 소유권 원장 |
| `aidongCodexItems` | 아직 후보 | 추가 후보 | 아이동별 25 도감 아이템 수량 원장 |

## 보상 저장 위치

항해 보상은 다음처럼 나눈다.

| 보상 유형 | 저장 위치 | 적재량 영향 | 예시 |
|---|---|---|---|
| 아이동 만남 | `myAidongStates`, `myIslandStates` | 없음 | 새 Aidong 영입, 가변 구역 추가 |
| 아이동 도감 아이템 | `myAidongStates.aidongCodexItems` | 없음 | 황금멍 도감 조각 |
| 항해 공통 화물 | `shipStates.shipInventory` | 있음 | 조개, 표류 상자, 항해 화물 |
| 일반 재료 | `hostStates.inventory` 또는 `shipStates.shipInventory` | 미결 | 나무, 천, 광석 |
| 재화 | `hostStates.coins/gems/diamonds` | 없음 | 코인, 보석 |

기본 후보:

- 항해 중 얻은 "화물감" 아이템은 `shipStates.shipInventory`에 쌓는다.
- 항해 중 얻은 즉시 귀속 아이템은 각 권위 저장소에 바로 넣는다.
- 입항하면 `shipStates.shipInventory`의 항해 공통 화물을 `hostStates.inventory`로 옮긴다.

## 입항/비우기 사이클

기본 흐름:

```txt
1. 항구에서 출항한다.
2. 항해 중 아이동, 재료, 도감 아이템, 화물을 발견한다.
3. Aidong 귀속 보상은 즉시 해당 Aidong 상태에 저장한다.
4. 공통 화물은 shipInventory에 임시 적재한다.
5. shipInventory 합계가 cargoCapacity에 가까워지면 UI가 입항을 권유한다.
6. cargoCapacity를 넘는 화물 획득은 거부하거나 일부만 적재한다.
7. 항구로 입항하면 비우기, 판매, 보관, 제작 후보 action 중 하나를 선택한다.
8. 기본 비우기는 shipInventory를 hostStates.inventory로 옮기고 shipInventory를 비운다.
9. 다시 출항한다.
```

## 항구 action 후보

초기에는 단순한 "비우기" action을 우선한다.

```text
POST /api/modules/ship/harbor/unload
```

후속 후보:

```text
POST /api/modules/ship/harbor/sell-cargo
POST /api/modules/ship/harbor/store-cargo
POST /api/modules/ship/harbor/craft-from-cargo
POST /api/modules/ship/harbor/discard-cargo
```

초기 구현 권장:

- `unload`: shipInventory 전체를 hostStates.inventory로 옮긴다.
- `sell-cargo`: Post 또는 밸런스 확정 후.
- `craft-from-cargo`: 제작 시스템 확정 후.
- `discard-cargo`: overflow/정리 UX가 필요해진 뒤.

## 배 업그레이드 후보

배 종류 또는 업그레이드는 다음에 영향을 줄 수 있다.

| 효과 | 설명 | 상태 후보 |
|---|---|---|
| 적재량 증가 | cargoCapacity 증가 | `shipTypeId`, `shipUpgradeState` 후보 |
| 선실 증가 | 적극 항해/선실 배치 Aidong 수 증가 | `cabinAssignments`, ship type config |
| 갑판 증가 | 임시 배치 또는 항해 중 대기 Aidong 수 증가 | `deckAssignments`, ship type config |
| 항해 효율 | 이동 비용, 이벤트 확률, 보상량에 영향 | route/ship balance 후보 |
| 입항 보너스 | unload 시 보관/판매/제작 보너스 | ship upgrade 후보 |

현재는 `shipTypeId`와 `ship/balance.csv`의 ship type config를 우선한다.

`shipUpgradeState` 전용 필드는 배 업그레이드 경제가 확정된 뒤 추가한다.

## capacity 계산 기준

capacity는 `shipStates`에 숫자로 중복 저장하지 않는다.

권장:

- 현재 선택 배: `shipStates.shipTypeId`
- 배 config: `packages/modules/ship/balance.csv`
- 계산값: `cargoCapacity`

적재량 계산:

```txt
usedCargo = sum(shipInventory item amounts)
remainingCargo = cargoCapacity - usedCargo
```

후속 확장:

- item별 weight를 둘 수 있다.
- cargo kind별 capacity를 나눌 수 있다.
- 선실/갑판/업그레이드 보너스를 capacity에 반영할 수 있다.

Phase 1 초기에는 item amount 합계 기준으로 단순하게 본다.

## 통 인벤토리와의 관계

새 기획의 "배 인벤토리와 내 인벤토리 구분 없음"은 영구 소유권을 여러 곳에 나누지 않는다는 뜻으로 해석한다.

따라서:

- 영구 보관은 `hostStates.inventory`다.
- 항해 중 적재 제한은 `shipStates.shipInventory`로 표현할 수 있다.
- 입항 후 비우기 action이 영구 보관소로 옮긴다.
- UI에서는 "배 가방"보다 "이번 항해 화물"처럼 표현하는 것이 낫다.

## 세관과의 관계

Phase 1:

- 입항/비우기는 세관 팝업이 아니라 ship domain action으로 처리한다.
- `customsLogs`, resource adapter, rule은 기술 자산으로 유지한다.
- 기존 ship -> host/lodge customs rule은 POC/검증용으로 보존한다.

Post/리팩토링:

- 외부 IP 콜라보, module-local economy, 거래/audit가 필요하면 ship unload를 customs 기반으로 다시 올릴 수 있다.

## 화면 기준

항구 화면에서 보여줄 것:

- 현재 선택 배.
- 적재량 `usedCargo / cargoCapacity`.
- 항해 중인지, 입항 가능한지.
- 이번 항해 화물 목록.
- 비우기 버튼.
- 배 변경/업그레이드 후보.
- 선실/갑판 배치 후보.

항해 화면에서 보여줄 것:

- 현재 적재량.
- 남은 적재량.
- 적재량 부족 경고.
- 입항 권유.

입항 후:

- `shipInventory`가 비워졌는지 보여준다.
- `hostStates.inventory`에 들어간 결과를 요약한다.
- 다시 출항할 수 있게 한다.

## 당장 하지 않을 것

- `shipInventory` 삭제.
- `cargo` 필드 강제 삭제.
- cargo item별 weight 복잡화.
- 판매/제작 경제 확정 전 sell/craft action 구현.
- 선실/갑판 효과를 capacity에 바로 반영.
- 세관 팝업을 입항 필수 UX로 다시 올리기.

## 후속 작업

1. `ship/harbor/unload` action 후보를 backend service 작업으로 쪼갠다.
2. `shipStates.shipInventory`를 "이번 항해 화물"로 UI 문구 변경한다.
3. `ship/balance.csv`의 ship type별 cargoCapacity, cabin count, deck count를 확인한다.
4. 항해 보상 타입을 `voyage-cargo`, `host-global`, `aidong-codex`로 분리한다.
5. live smoke에 출항, 화물 적재, 입항, 비우기, host inventory 반영을 추가한다.

## 변경 기록

- **2026-06-08**: 최초 작성. 배 적재량을 영구 인벤토리가 아니라 항해 중 임시 화물과 입항/비우기 압력 장치로 재정의했다.
