# Frontend 화면 영향도 조사 2026-06-08

이 문서는 2026-06-05 기획 변경 회의 이후 주요 frontend 화면의 유지, 변경, 숨김, 보류 대상을 정리한다.

기준 문서:

- `.cloud/기획변경회의에따른기획변경가이드.md`
- `.cloud/51_next_work_2026-06-08.md`
- `.cloud/53_core_loop_2026-06-08.md`
- `.cloud/56_customs_descope_2026-06-08.md`
- `.cloud/57_lodge_growth_hub_2026-06-08.md`
- `.cloud/61_voyage_board_simplification_2026-06-08.md`
- `.cloud/62_ship_cargo_port_cycle_2026-06-08.md`
- `.cloud/63_web_ui_ux_direction_2026-06-08.md`

## 한 줄 정의

Frontend는 기존 화면을 삭제하기보다 **숙소 중심 허브, 메인 가변 구역, 항해 만남/수집, 통 인벤토리, 구역 배치 생산** 순서로 우선순위를 재배치한다.

세관 중심 UI, destination island 강제 루프, 30칸 주사위 보드 확정 UI는 Phase 1 필수 화면에서 내린다.

## 현재 주요 화면

| 화면 | 파일 | 현재 역할 | Phase 1 판정 |
|---|---|---|---|
| 항구 | `packages/frontend/src/screens/HarborScene.tsx` | 배, 항로, 선실/갑판, 항구 지원 배치, 출항 | 유지/재정렬 |
| 항해 보드 | `packages/frontend/src/screens/NavigationBoardScene.tsx` | 6x5 주사위 보드, landing, 항해 중 배 메뉴 | 유지/축소/재정의 |
| 숙소 | `packages/frontend/src/screens/LodgeScene.tsx` | 숙소 배치, 방 꾸미기, 가구 구매, lodge inventory/customs | 승격/재구성 |
| 전체 지도 | `packages/frontend/src/screens/IslandFullMapScreen.tsx` | 15구역 풀맵, zone 진입 | 유지/가변 구역 후보 반영 |
| destination island | `packages/modules/destination-shell-island/src/DestinationIslandScreen.tsx` | Pixi/Rive 섬 탐험, mission, local resource | 숨김/보존 |
| route-neighbor module route | `packages/modules/route-neighbor/src/ZoneScreen.tsx` | `/voyage/neighbor` placeholder | 보류/정리 |
| BottomNav | `packages/frontend/src/components/BottomNav.tsx` | 하단 5탭, 항해 버튼 | 유지/흐름 재정렬 |
| App routes | `packages/frontend/src/App.tsx` | shell route 구성 | 유지/route 우선순위 조정 |

## 화면별 영향도

### HarborScene

현재 충돌:

- 항구 화면이 배/선실/갑판/항구 지원 배치를 모두 들고 있어 역할이 무겁다.
- 항구 지원 배치와 선실/갑판 배치가 중복 배치 문제를 만든다.
- 세관과 ship/lodge inventory 흐름이 남아 있으면 새 통 인벤토리 방향과 충돌한다.
- 항해 보드가 미결인데 30칸 주사위 보드 출항을 확정처럼 보여줄 수 있다.

유지:

- 출항 시작.
- 현재 배와 적재량 표시.
- 입항/비우기 진입.
- 배 변경/업그레이드 후보.

변경:

- `shipInventory`는 "배 인벤토리"보다 "이번 항해 화물"로 표현한다.
- 출항 전에는 배 관련 메뉴를 보여주되, 항해 중에는 항구에서 재출항과 배 변경을 막는다.
- 항구 지원 배치는 Phase 1에서 축소하거나 숙소/구역 배치와 중복되지 않게 재검토한다.
- 세관 버튼은 핵심 버튼으로 올리지 않는다.

우선순위:

1. 적재량/입항/비우기 중심으로 항구 역할 축소.
2. 항구 지원 배치와 선실/갑판 배치의 중복 정책 정리.
3. 보드 방식 결정 전까지 출항 UI는 확정 표현을 피한다.

### NavigationBoardScene

현재 충돌:

- 6x5, 30칸 주사위 보드를 전제로 한 화면이다.
- `/voyage/island/{characterId}/landing`으로 이동하는 character landing은 새 기획에서 "아이동 섬"이 아니라 "아이동 만남"으로 재정의해야 한다.
- 항해 중 배 메뉴와 선실/갑판 재배치 UI가 숙소/항구 정책과 충돌할 수 있다.
- destination island 또는 세관 흐름과 다시 강하게 묶이면 Phase 1 방향과 충돌한다.

유지:

- 항해 상태 표시.
- 발견 결과 표시.
- 항구 복귀.
- landing current/clear 흐름의 호환.

변경:

- 30칸 전용 보드 고도화는 멈춘다.
- board mode를 `dice30`, `dice9`, `direct`, `hybrid`로 바꿀 수 있는 구조를 의식한다.
- landing 결과는 `aidong-encounter`, `material-gain`, `codex-item-gain`, `event` 중심으로 재정의한다.
- 아이동 만남은 `/voyage/encounter/:characterId` 또는 전용 modal 후보로 바꾼다.

우선순위:

1. 현재 보드 안정성 유지.
2. 30칸 전용 UI 추가 금지.
3. landing UI를 아이동 만남/보상 결과 중심으로 분리.

### LodgeScene

현재 충돌:

- Phase 1 핵심 허브인데 아직 숙소 인벤토리, 세관, 방 꾸미기 중심으로 무게가 있다.
- `lodgeInventory`와 `CustomsTransferDialog`가 통 인벤토리 방향과 충돌한다.
- 마당, 적극 육성 슬롯, 연습, 업그레이드, 아이동별 도감 아이템 표시가 아직 1차 허브로 충분히 드러나지 않는다.

유지:

- 숙소 배치.
- 방 꾸미기.
- 가구 구매.
- 케어 진입.
- 항해 중/항구 배치 중 Aidong 제한 표시.

변경:

- 숙소를 2~3 column 허브로 재구성한다.
- 방, 마당, 선택 Aidong 상세, 케어/연습/꾸미기/업그레이드 진입을 우선한다.
- `lodgeInventory` UI는 호환/보류 section으로 낮춘다.
- 숙소 세관 진입은 기본 UX에서 숨기고 dev/검증 또는 feature flag 뒤에 둔다.
- 아이동별 도감 아이템과 upgrade 가능 여부를 숙소에서 보여줄 준비를 한다.

우선순위:

1. 숙소 허브 정보 구조 재배치.
2. 마당/방/상태 badge selector 정리.
3. 연습/업그레이드 진입점 추가 후보.
4. 세관/숙소 인벤토리 UI 축소.

### IslandFullMapScreen

현재 충돌:

- 15구역 고정 풀맵을 전제로 한다.
- 새 기획은 5 기본 구역 + 아이동별 가변 구역 또는 고정 15구역과 가변 구역 공존이 P0 미결이다.
- zone minigame 4종 고정 모델도 Aidong별 skin engine 모델로 재분류됐다.

유지:

- 전체 구역 진입 허브.
- 기본 구역 표시.
- 잠금/해금 상태 표시.

변경:

- 고정 15구역을 확정 전제로 더 고도화하지 않는다.
- 가변 Aidong 구역 section을 별도로 둘 수 있게 구조를 분리한다.
- grid + category tab 조합을 1차 후보로 둔다.
- 지도형 배치는 장기 후보로 둔다.

우선순위:

1. 기본 구역과 Aidong 가변 구역을 구분하는 UI 후보 작성.
2. 고정 15구역 문구를 확정 표현에서 미결 표현으로 낮춘다.
3. 생산 구역과 미니게임 구역의 구분을 명확히 한다.

### DestinationIslandScreen

현재 충돌:

- PixiJS/Rive destination island POC는 새 Phase 1 core loop의 필수 화면이 아니다.
- local resource와 customs gate를 전제로 하면 새 통 인벤토리/세관 de-scope 방향과 충돌한다.
- `/voyage/island/shell` module route는 유지되지만 기본 동선에서 빠져야 한다.

보존:

- PixiJS scene.
- Rive reaction layer.
- hotspot/mission interaction.
- 이벤트 섬 또는 Post 후보.

변경:

- 기본 항해 흐름에서 자동 진입하지 않는다.
- dev/POC 또는 이벤트 섬 route로 보존한다.
- 세관 gate 없이 닫기/복귀할 수 있는 mode를 둔다.
- asset/연출 실험장은 유지하되 core loop smoke 필수 조건에서 제외한다.

우선순위:

1. 기본 route 노출 축소.
2. POC/이벤트 섬 label 명시.
3. smoke 필수 경로에서 분리.

### BottomNav와 App route

현재 충돌:

- 하단 `항해` 버튼이 `/voyage/board`로 직행한다.
- 항해 보드 방식과 active voyage 정책이 미결이면 직행 UX가 혼란을 만든다.
- 웹 UI 방향에서는 하단 메뉴만으로 모든 navigation을 해결하지 않아도 된다.

유지:

- 주요 허브 접근성.
- smoke 안정성을 위한 route.

변경:

- 항해 버튼은 board 직행보다 항구 또는 항해 허브로 보내는 후보를 검토한다.
- active voyage가 있으면 항해 화면으로, 없으면 항구로 보내는 현재 정책은 유지 후보지만, 문구와 상태 표시를 명확히 한다.
- 웹 desktop에서는 side nav 또는 top nav 후보를 검토한다.

우선순위:

1. 항해 버튼의 목적지를 새 core loop 기준으로 재검토.
2. `숙소`, `마이섬`, `항구`, `항해`, `도감`의 menu hierarchy 정리.
3. desktop navigation 후보를 문서화.

## 세관 중심 UI 처리

기본 숨김/보류 대상:

- 숙소의 `lodgeCustomsOpen` 기본 진입.
- 배 인벤토리에서 세관을 핵심 action으로 보여주는 UI.
- destination island 이탈 전 세관 강제 gate.
- MiniGame 닫기 전 customs gate.

유지 대상:

- `CustomsTransferDialog` component.
- dev/검증 경로.
- feature flag 기반 재활성화.

feature flag 후보:

```text
VITE_CUSTOMS_UI_ENABLED
VITE_CUSTOMS_EXIT_GATE_ENABLED
VITE_DESTINATION_ISLAND_CUSTOMS_GATE_ENABLED
```

## 화면 작업 순서

1. `LodgeScene`: 숙소 허브 재배치.
2. `IslandFullMapScreen`: 기본 구역과 가변 Aidong 구역 section 분리 후보.
3. `NavigationBoardScene`: 30칸 보드 고도화 중지, landing 결과 UI 재정의.
4. `HarborScene`: 입항/비우기와 적재량 중심으로 역할 정리.
5. `BottomNav`: 항해 버튼과 웹 navigation 흐름 조정.
6. `DestinationIslandScreen`: POC/이벤트 섬으로 label과 route 노출 축소.
7. `CustomsTransferDialog`: 기본 core loop에서 숨김, dev/검증 유지.

## 당장 하지 않을 것

- `DestinationIslandScreen` 삭제.
- `CustomsTransferDialog` 삭제.
- 30칸 보드 확정 전용 화면 고도화.
- 고정 15구역 확정 전용 지도 고도화.
- 하단 메뉴를 완전히 제거.
- PixiJS/Rive POC 폐기.

## 후속 작업

1. `LodgeScene` wireframe과 selector 정리 작업을 만든다.
2. `IslandFullMapScreen`에서 가변 Aidong 구역 section 후보를 코드 작업으로 쪼갠다.
3. `NavigationBoardScene`의 landing type별 UI 분기를 설계한다.
4. `HarborScene`의 unload/shipInventory 표시 문구를 정리한다.
5. `BottomNav`의 항해 이동 정책을 smoke 기준과 함께 재정의한다.
6. destination island route를 dev/POC label로 낮추는 작업을 검토한다.

## 변경 기록

- **2026-06-08**: 최초 작성. 주요 frontend 화면의 새 기획 충돌, 유지/변경/숨김 판정, 화면 작업 순서를 정리했다.
