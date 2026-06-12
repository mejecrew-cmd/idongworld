# Destination Island Guide

항해 도중 도착하는 섬 구역을 구현하기 위한 1차 기획 스펙이다. 이 문서는 `destination-island` 계열 모듈이 어떤 세계 범위, 데이터 구조, 화면 흐름, 자원 이동 규칙을 가져야 하는지 정의한다.

## 목적

- 항해 보드에서 도착한 섬을 독립 탐험 모듈로 다룬다.
- 섬 안에서는 고정맵 node를 이동하며 hotspot을 클릭해 조사, 수집, 미션을 진행한다.
- 섬 전용 자원은 섬 밖에서 직접 사용할 수 없다.
- 섬을 떠날 때 전용 자원은 customs를 통해 배 또는 전역 보관소로 이동한다.
- 화려한 장면 연출은 PixiJS를 부분 도입하고, 짧은 캐릭터/UI/오브젝트 반응은 Rive를 우선 사용한다.

## World Scope

destination island 모듈은 다음 성격을 가진다.

- `worldScope: destination-island`
- 항해 중에만 도착 가능한 외부 섬이다.
- 나의 섬 내부 구역이 아니다.
- local inventory와 local resource를 가진다.
- customs rule 노출 시 배로 옮기기와 전역 보관소 이동을 모두 허용할 수 있다.
- 섬 내부 상태는 해당 island module document에 저장한다.

## 첫 후보 모듈 명명 규칙

첫 구현 후보는 임시로 다음 명명 규칙을 따른다.

- moduleId: `destination-shell-island`
- route path 후보: `/voyage/island/shell`
- display name 후보: `조개빛 섬`
- worldScope: `destination-island`

실제 이름은 PM 결정 후 바꿀 수 있지만, backend/model/API skeleton은 `destination-*` 계열 규칙을 따른다.

## 탐험 구조

섬은 하나의 자유 이동 맵이 아니라, 여러 고정 node로 구성된다.

```txt
beach-west  -- beach-center -- beach-east
                  |
              grove-entrance
                  |
              old-shrine
```

각 node는 고정맵 한 장면이다.

- 배경 이미지가 있다.
- hotspot 목록이 있다.
- 상하좌우 exit가 있다.
- node별 미션 또는 수집 가능 상태가 있다.
- 방문 여부와 hotspot 처리 여부를 저장한다.

Aidong이 섬 안을 직접 걸어 다니지는 않는다. 사용자는 화면 속 hotspot을 마우스로 클릭하고, 상하좌우 이동 버튼으로 인접 node를 본다.

## Node 스펙

각 node는 최소 다음 필드를 가진다.

```ts
interface DestinationIslandNodeSpec {
  nodeId: string
  label: string
  backgroundAssetId: string
  layers?: SceneLayerSpec[]
  hotspots: HotspotSpec[]
  exits: Partial<Record<'north' | 'south' | 'east' | 'west', string>>
}
```

권장 필드:

- `nodeId`: node 고유 id.
- `label`: UI 표시명.
- `backgroundAssetId`: 배경 asset id.
- `layers`: PixiJS용 전경/중경/후경/효과 layer.
- `hotspots`: 클릭 가능한 상호작용 요소.
- `exits`: 상하좌우 인접 node id.

## Hotspot 스펙

hotspot은 조사, 수집, 미션, 장식 반응을 나타낸다.

```ts
interface HotspotSpec {
  hotspotId: string
  label: string
  kind: 'inspect' | 'collect' | 'mission' | 'decorative'
  x: number
  y: number
  width?: number
  height?: number
  requiredMissionId?: string
  rewardTableId?: string
  riveAssetId?: string
}
```

규칙:

- `hotspotId`는 backend state의 `hotspotStates`와 매칭된다.
- `kind=collect`는 backend action API를 통해 reward를 지급한다.
- `kind=mission`은 mission clear API를 통해 처리한다.
- `kind=decorative`는 backend 상태를 바꾸지 않고 Rive/Pixi 반응만 줄 수 있다.
- hotspot click은 PixiJS 내부에서 직접 API를 호출하지 않고 React container로 event를 올린다.

## Mission 스펙

mission은 섬 전용 clear 조건과 보상을 가진다.

```ts
interface IslandMissionSpec {
  missionId: string
  label: string
  requiredHotspotIds?: string[]
  requiredResources?: Record<string, number>
  rewards: RewardSpec[]
  resultSchemaId?: string
}
```

규칙:

- mission clear 여부는 backend state의 `clearedMissionIds`에 저장한다.
- reward 지급은 backend 권위로 처리한다.
- reward는 local resource, local inventory, host resource 중 하나로 갈 수 있지만, 기본은 island-local reward다.
- host/global로 바로 지급하는 reward는 기획상 명확한 이유가 있을 때만 허용한다.

## State 모델 후보

destination island module state는 다음 구조를 1차 후보로 둔다.

```ts
interface DestinationIslandState {
  uid: string
  currentNodeId: string
  visitedNodeIds: string[]
  clearedMissionIds: string[]
  localResources: Record<string, number>
  localInventory: Record<string, number>
  hotspotStates: Record<string, {
    interacted: boolean
    count?: number
    lastInteractedAt?: number
  }>
  createdAt: number
  updatedAt: number
}
```

기본값:

- `currentNodeId`: 첫 node id.
- `visitedNodeIds`: 첫 node id 포함.
- `clearedMissionIds`: 빈 배열.
- `localResources`: 빈 객체.
- `localInventory`: 빈 객체.
- `hotspotStates`: 빈 객체.

## Backend Action API 후보

최소 API:

- `GET /api/modules/{moduleId}/config`
- `POST /api/modules/{moduleId}/move`
- `POST /api/modules/{moduleId}/hotspots/interact`
- `POST /api/modules/{moduleId}/missions/clear`

`move` 요청:

```json
{
  "direction": "north"
}
```

규칙:

- 현재 node의 exit에 해당 direction이 있어야 한다.
- 이동 성공 시 `currentNodeId`와 `visitedNodeIds`를 갱신한다.
- 이동 자체는 resource reward를 지급하지 않는다.

`hotspots/interact` 요청:

```json
{
  "hotspotId": "shell-rock"
}
```

규칙:

- hotspot이 현재 node에 있어야 한다.
- 이미 1회성 처리된 hotspot이면 중복 reward를 지급하지 않는다.
- reward 지급과 hotspot state 변경은 backend service가 처리한다.

`missions/clear` 요청:

```json
{
  "missionId": "open-old-shrine",
  "result": {}
}
```

규칙:

- unlock 조건, result validation, reward 지급은 backend service가 처리한다.
- clear 후 `clearedMissionIds`에 저장한다.

## Customs 규칙

destination island에서 얻은 전용 자원은 섬 안에서는 local resource로 둔다.

섬을 떠날 때 가능한 이동:

- destination island local resource -> ship inventory/cargo.
- destination island local resource -> host/global inventory.
- destination island local item -> host/global inventory.

규칙:

- 섬 밖에서는 island local resource를 직접 사용할 수 없다.
- local resource가 남아 있으면 exit customs gate를 띄운다.
- 변환 가능한 rule이 없고 local resource가 남아 있으면 섬을 떠날 수 없다.
- 전역 보관소 이동은 destination island에서도 허용된다.

## Frontend 화면 구조

```txt
DestinationIslandScreen
  DestinationIslandSceneContainer
    PixiIslandScene
    ReactOverlay
      DirectionControls
      MissionPanel
      LocalInventorySummary
      LeaveButton
      CustomsTransferDialog
```

역할:

- `DestinationIslandScreen`: route, uid, moduleId, API 연결.
- `DestinationIslandSceneContainer`: backend state와 scene data를 결합.
- `PixiIslandScene`: 배경, layer, hotspot, particle, transition.
- `ReactOverlay`: 방향 버튼, 미션, 인벤토리, 세관, 닫기.

## PixiJS 사용 범위

PixiJS는 다음에만 사용한다.

- 배경/전경/중경/후경 layer.
- hotspot hover/click highlight.
- particle, light, fog, water, glow.
- 상하좌우 node transition.
- reward scene effect.

PixiJS는 다음을 하지 않는다.

- backend API 직접 호출.
- module state 직접 저장.
- 긴 텍스트 UI.
- confirm/cancel dialog.
- 세관 팝업.

## Rive 사용 범위

Rive는 다음에 우선 사용한다.

- hotspot 반짝임.
- 오브젝트 클릭 반응.
- 보상 아이콘 애니메이션.
- 화면 구석 Aidong 감정 반응.
- 미션/세관 버튼 강조.
- 숙소/선실 캐릭터 idle 또는 care reaction.

Spine/Live2D는 현재 단계에서 보류한다. Aidong이 destination island 안에서 직접 걸어 다니지 않으므로 Spine 리깅은 우선순위가 낮다.

## Destination Island Rive 연결 계약

`destination-shell-island`의 Rive layer는 실제 `.riv` 파일이 없어도 fallback UI로 동작해야 한다.

실제 Rive asset을 붙일 때는 다음 값을 유지한다.

- frontend 환경변수: `VITE_DESTINATION_ISLAND_RIVE_SRC`
- 기본 state machine 이름: `DestinationIslandReaction`
- trigger input 이름: `hotspot`, `reward`, `mission`, `error`

사용 예시:

```env
VITE_DESTINATION_ISLAND_RIVE_SRC=/assets/rive/destination-shell-island/reaction.riv
```

또는 signed URL provider가 준비된 뒤에는 backend가 발급한 public 접근 가능 URL을 같은 환경변수에 넣는다. 단, DB에는 URL을 저장하지 않고 `assetId`, `assetKey`, `version`, `visibility`만 저장한다.

React container는 backend action 결과를 보고 다음 reaction 값을 `DestinationIslandRiveLayer`에 넘긴다.

- `idle`: 기본 대기 상태.
- `hotspot`: 장식 hotspot 또는 보상 없는 조사 반응.
- `reward`: local resource 또는 local item을 얻었을 때.
- `mission`: mission clear가 성공했을 때.
- `error`: backend action 또는 customs 처리 실패 시.

Rive layer는 backend API를 직접 호출하지 않는다. `.riv` 파일 로드가 없거나 아직 제작되지 않은 경우에는 현재 fallback badge를 보여주고 화면 진행을 막지 않는다.

## Asset 접근 정책

- public asset은 일반 public path 또는 CDN public URL을 사용한다.
- protected/해금형 asset은 signed URL을 검토한다.
- DB에는 signed URL을 저장하지 않는다.
- DB에는 `assetId`, `assetKey`, `version`, `visibility`만 저장한다.
- signed URL은 backend가 uid 권한 확인 후 발급한다.
- local 개발에서는 signed URL 대신 repo public path fallback을 허용한다.

## 2번 작업으로 넘길 결정 사항

다음 단계인 데이터 모델 설계에서 결정해야 할 항목:

- 첫 destination island moduleId 확정.
- scene data를 CSV로 둘지 JSON/TS config로 둘지 결정.
- hotspot coordinate 기준을 px로 둘지 normalized coordinate로 둘지 결정.
- localResources와 localInventory를 모두 쓸지, 1차는 localResources만 쓸지 결정.
- ship inventory와 cargo 중 destination island 보상이 어느 쪽으로 이동할지 결정.
- PixiJS asset layer spec을 어느 파일에 둘지 결정.

## 변경 기록

- **2026-06-05**: destination island 1차 기획 스펙을 작성했다. 고정맵 node, hotspot, mission, backend action API, customs, PixiJS/Rive 역할, asset 접근 정책을 정의했다.
