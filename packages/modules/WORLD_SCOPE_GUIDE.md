# 모듈 위치 구분 가이드

이 문서는 세관, 항해, 숙소 이동 규칙에서 모듈이 어디에 속하는지 판단하기 위한 기준을 정리한다.

## 2026-06-08 기획 변경 반영

2026-06-05 기획 변경 회의 이후 `worldScope`는 삭제하지 않고 위치/화면 분류 메타데이터로 유지한다.

- `destination-island -> ship -> lodge` 세관 흐름은 2026-06-05 이전 POC 기준이며, Phase 1 사용자 핵심 루프에서는 보류한다.
- 항해에서 아이동을 만나면 별도 일회성 아이동 섬보다 메인 화면의 가변 아이동 구역 슬롯으로 흡수되는 방향을 우선 검토한다.
- 통 인벤토리와 아이동 귀속 도감 인벤토리 설계가 확정되기 전까지 worldScope를 근거로 신규 세관 UX를 강화하지 않는다.
- PixiJS/Rive destination island 구현은 향후 이벤트 섬 또는 탐험 POC로 보존한다.

## 기준 필드

각 모듈 manifest는 필요할 때 `worldScope`를 선언한다.

- `home-island`: 내 섬 안의 구역이다.
- `destination-island`: 배를 타고 도착하는 외부 섬의 구역이다.
- `voyage-route`: 주사위 항해 경로, 보드, 이동 진행 상태다.
- `ship`: 배 자체와 배 인벤토리, 선실, 갑판 상태다.
- `lodge`: 내 섬 숙소와 숙소 인벤토리 상태다.

## 현재 분류

- `zone-garden`: `home-island`
- `zone-oasis`: `home-island`
- `zone-memory`: `home-island`
- `zone-mine`: `home-island`
- `route-neighbor`: `voyage-route`
- `ship`: `ship`
- `lodge`: `lodge`

아직 `destination-island`로 분류된 실제 도착 섬 모듈은 없다. 이후 항해로 도착하는 섬 모듈을 추가할 때 이 값을 사용한다.

## 세관 목적지 판단

세관은 자원 이동 출발 모듈의 `worldScope`를 보고 기본 목적지를 판단한다.

- `home-island`에서 나온 module-local 자원은 기본적으로 숙소 또는 전역 보관소로 이동한다.
- `destination-island`에서 나온 module-local 자원은 기본적으로 배 인벤토리로 싣는다.
- `destination-island`에서 나온 아이템 중 전역 보관 대상은 세관을 통해 전역 보관소로 직접 이동할 수 있다.
- `ship`에서 `lodge`로 옮길 때도 세관을 통과한다.
- `voyage-route`는 보드 진행 상태이므로 도착 섬 인벤토리나 배 인벤토리 자체로 취급하지 않는다.

따라서 기존 `zone-garden -> route-neighbor deck-cargo` 규칙은 임시 호환 규칙으로만 본다. 정식 항해 루프에서는 `destination-island -> ship -> lodge` 흐름을 기본으로 만들되, 전역 보관 대상은 `destination-island -> host` 흐름도 허용한다.

## 구현 지침

- 새 모듈을 추가할 때 위치 의미가 있는 모듈은 manifest에 `worldScope`를 선언한다.
- 내 섬 지역은 `home-island`, 항해 도착지는 `destination-island`를 사용한다.
- 주사위 보드나 항로 진행 모듈은 `voyage-route`를 사용하고 자원 보관 주체로 오해하지 않는다.
- 세관 rule은 `fromModule`, `toModule`만 보지 말고 필요한 경우 manifest의 `worldScope`를 함께 확인한다.
- 전역 보관 대상 아이템은 출발 위치가 `home-island`인지 `destination-island`인지와 관계없이 세관을 통해 `hostStates.inventory`로 이동할 수 있다.
- module-specific item 목록은 해당 모듈의 `items.csv`에 유지한다.

## 변경 기록

- **2026-06-08**: 기획 변경 회의 이후 worldScope의 Phase 1 읽기 기준을 추가했다. destination island 세관 흐름은 POC/보류 후보로 낮추고, 위치 메타데이터로서의 worldScope는 유지한다.
- **2026-06-01**: `worldScope` 기준을 도입했다. 현재 내 섬 구역, 항해 경로, 배, 숙소 모듈의 위치 분류와 세관 목적지 판단 원칙을 정리했다.
- **2026-06-01**: `destination-island`에서 획득한 전역 보관 대상 아이템도 세관을 통해 `hostStates.inventory`로 직접 이동할 수 있도록 원칙을 보완했다.
## Destination Island 화면 연출 규칙

- `destination-island` 계열 모듈은 항해 도중 도착하는 독립 탐험 구역이다.
- 이 구역은 React 화면만으로 구성할 수도 있지만, 화려한 섬 탐험 연출이 필요한 경우 PixiJS를 부분 도입할 수 있다.
- PixiJS는 섬 배경, 전경/중경/후경 레이어, 오브젝트 hotspot, 파티클, 빛/안개/물결 효과, 상하좌우 지역 이동 transition을 담당한다.
- React/MUI는 HUD, 방향 버튼, 미션 설명, 인벤토리, 세관 팝업, 보상 확인, 닫기/확정 dialog를 담당한다.
- PixiJS scene은 module-local state를 직접 저장하지 않는다. 저장과 자원 이동은 module action API 또는 customs API를 통해 처리한다.
- hotspot id, item id, mission id는 manifest/items/customs/balance 데이터와 추적 가능해야 한다.
- destination island에서 얻은 전용 자원은 해당 island module inventory에 먼저 저장하고, 섬을 떠날 때 customs를 통해 배 또는 전역 보관소로 이동한다.

## Rive 적용 규칙

- `destination-island`에서 Aidong이 직접 걸어 다니지 않는다면 Spine 캐릭터 리깅은 기본 도입하지 않는다.
- 클릭형 고정맵 탐험에서는 Rive를 hotspot, 보상, 미션, Aidong 반응 애니메이션에 우선 사용한다.
- Rive는 짧고 반복 가능한 상태 기반 애니메이션에 적합하다.
- 예: 조사 가능 오브젝트 반짝임, 클릭 반응, 보상 아이콘 튀어나오기, 화면 구석 Aidong 감정 반응, 세관 버튼 강조.
- Rive state input은 scene container 또는 React overlay에서 제어한다.
- Rive asset id는 hotspot id, mission id, item id와 연결 가능해야 한다.
- Rive animation이 resource debit/credit을 직접 수행하지 않는다. 실제 상태 변경은 module action API 또는 customs API가 담당한다.

## 변경 기록

- **2026-06-05**: 항해 도착 섬의 화려한 연출을 위해 PixiJS를 destination island 탐험 화면에 부분 도입할 수 있다는 규칙을 추가했다.
- **2026-06-05**: 클릭형 destination island에서는 Spine보다 Rive를 hotspot/UI/Aidong 반응 애니메이션에 우선 적용한다는 규칙을 추가했다.
