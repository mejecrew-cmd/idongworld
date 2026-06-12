# Destination Island Data Model

`destination-island` 계열 모듈의 데이터 파일 구조와 1차 schema 후보를 정의한다. 이 문서는 `.cloud/44_destination_island_guide.md`의 기획 스펙을 실제 모듈 파일 단위로 쪼개는 2번 작업 산출물이다.

## 기본 파일 구조

첫 후보 모듈은 다음 구조를 따른다.

```txt
packages/modules/destination-shell-island/
  package.json
  manifest.ts
  items.csv
  balance.csv
  customs.csv
  scenes.csv
  hotspots.csv
  missions.csv
  src/
    index.ts
    routes.tsx
```

역할:

- `manifest.ts`: module id, worldScope, route, data file 참조.
- `items.csv`: 섬 전용 아이템 catalog.
- `balance.csv`: 보상 수량, 상호작용 비용, 미션 tuning 값.
- `customs.csv`: 섬 전용 자원을 배 또는 전역 보관소로 옮기는 규칙.
- `scenes.csv`: 고정맵 node 목록과 상하좌우 연결.
- `hotspots.csv`: node별 클릭 가능 hotspot.
- `missions.csv`: mission clear 조건과 reward table 연결.
- `src/routes.tsx`: frontend route component.

## Manifest 모델

destination island manifest는 다음 정보를 가져야 한다.

```ts
{
  id: 'destination-shell-island',
  name: '조개빛 섬',
  worldScope: 'destination-island',
  route: '/voyage/island/shell',
  items: 'items.csv',
  balance: 'balance.csv',
  customs: 'customs.csv',
  scenes: 'scenes.csv',
  hotspots: 'hotspots.csv',
  missions: 'missions.csv'
}
```

규칙:

- module id는 `destination-*` prefix를 권장한다.
- `worldScope`는 반드시 `destination-island`로 둔다.
- route는 voyage 영역 아래에 둔다.
- data file 참조는 manifest에 명시한다.

## items.csv

섬 전용 아이템을 정의한다.

권장 컬럼:

```csv
itemId,label,kind,rarity,visibility,assetId,description
```

컬럼 설명:

- `itemId`: 섬 내부 item id.
- `label`: 표시명.
- `kind`: `resource`, `material`, `quest`, `decor`, `aidong-item`.
- `rarity`: `common`, `uncommon`, `rare`, `epic`.
- `visibility`: `public`, `protected`.
- `assetId`: icon/Rive/scene asset 참조 id.
- `description`: 설명.

규칙:

- DB에는 asset URL을 저장하지 않고 `assetId`만 저장한다.
- protected asset은 signed URL 후보가 된다.
- customs 이동 가능 item은 customs.csv rule과 연결되어야 한다.

## balance.csv

상호작용과 보상 tuning 값을 정의한다.

권장 컬럼:

```csv
key,value,group,description
```

예:

```csv
hotspot.shell-rock.reward.shell-fragment,2,hotspot,조개 바위 조사 보상
mission.open-old-shrine.reward.pearl-dust,1,mission,낡은 사당 미션 보상
```

규칙:

- 숫자 보상과 tuning 값은 가능하면 balance.csv로 분리한다.
- unlock 조건과 result payload validation은 backend service에 둔다.
- balance key는 `hotspot.{hotspotId}.reward.{resourceId}` 또는 `mission.{missionId}.reward.{resourceId}` 패턴을 권장한다.

## customs.csv

섬을 떠날 때 local resource/item을 어디로 이동할 수 있는지 정의한다.

권장 컬럼은 기존 customs.csv와 호환되어야 한다.

필수 개념:

- source: `module:destination-shell-island`
- destination 후보:
  - `module:ship`
  - `host`
- destination-island에서는 배 적재와 전역 보관소 이동을 모두 허용할 수 있다.

규칙:

- local resource가 남아 있으면 leave gate에서 customs를 먼저 보여준다.
- 변환 가능한 rule이 없는 local resource가 남아 있으면 섬을 떠날 수 없다.
- 전역 보관소로 이동하는 item은 destination-island에서도 허용된다.

## scenes.csv

고정맵 node와 이동 연결을 정의한다.

권장 컬럼:

```csv
nodeId,label,backgroundAssetId,north,south,east,west,initial,description
```

컬럼 설명:

- `nodeId`: node 고유 id.
- `label`: 표시명.
- `backgroundAssetId`: PixiJS/React 배경 asset id.
- `north/south/east/west`: 인접 node id.
- `initial`: `true`면 시작 node.
- `description`: 기획 설명.

규칙:

- 이동은 현재 node의 exit에 등록된 node로만 가능하다.
- backend state의 `currentNodeId`는 scenes.csv에 존재해야 한다.
- `initial=true`는 하나만 허용한다.

## hotspots.csv

node별 클릭 가능 오브젝트를 정의한다.

권장 컬럼:

```csv
hotspotId,nodeId,label,kind,x,y,width,height,rewardTableId,missionId,riveAssetId,once,description
```

컬럼 설명:

- `hotspotId`: hotspot 고유 id.
- `nodeId`: 소속 node id.
- `kind`: `inspect`, `collect`, `mission`, `decorative`.
- `x/y`: 위치. 1차는 normalized coordinate `0~1`을 권장한다.
- `width/height`: 클릭 영역 크기. 1차는 normalized size `0~1`을 권장한다.
- `rewardTableId`: balance reward key group.
- `missionId`: 연동 mission id.
- `riveAssetId`: 반응 animation asset id.
- `once`: 1회성 여부.

규칙:

- hotspot은 반드시 scenes.csv의 node에 속해야 한다.
- hotspot click은 frontend에서 backend action API로 전달한다.
- reward 지급은 backend service가 처리한다.
- decorative hotspot은 backend reward 없이 Rive/Pixi 반응만 줄 수 있다.

## missions.csv

mission 정의와 clear 조건을 관리한다.

권장 컬럼:

```csv
missionId,label,requiredHotspotIds,requiredResources,rewardTableId,resultSchemaId,description
```

컬럼 설명:

- `missionId`: mission 고유 id.
- `requiredHotspotIds`: `|` 구분 hotspot id 목록.
- `requiredResources`: `resourceId:amount|resourceId:amount` 형식.
- `rewardTableId`: balance reward key group.
- `resultSchemaId`: backend validation schema id.
- `description`: 설명.

규칙:

- clear 여부는 backend state의 `clearedMissionIds`에 저장한다.
- result payload validation은 backend service에 둔다.
- reward amount는 balance.csv에서 읽는다.

## Backend State Schema

1차 state 후보:

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

저장 규칙:

- `currentNodeId`는 현재 위치다.
- `visitedNodeIds`는 방문 기록이다.
- `hotspotStates`는 1회성 보상 중복 방지에 사용한다.
- `localResources`는 섬 전용 자원 수량이다.
- `localInventory`는 섬 전용 아이템 수량이다.

## Frontend Scene Data 변환

frontend는 CSV를 그대로 쓰지 않고 다음 view model로 변환한다.

```ts
interface DestinationIslandSceneView {
  currentNode: SceneNodeView
  nodes: Record<string, SceneNodeView>
  hotspots: HotspotView[]
  availableExits: Array<'north' | 'south' | 'east' | 'west'>
}
```

규칙:

- React container가 backend state와 scene data를 결합한다.
- PixiJS scene은 `SceneNodeView`와 hotspot event handler만 받는다.
- Rive state input은 React container 또는 scene wrapper가 제어한다.

## Asset 정책

- `backgroundAssetId`, `riveAssetId`, item `assetId`는 직접 URL이 아니다.
- asset URL resolve는 별도 asset helper 또는 signed URL API를 통해 처리한다.
- public asset은 public path를 반환할 수 있다.
- protected asset은 backend 권한 확인 후 signed URL을 반환한다.

## 3번 작업으로 넘길 항목

backend skeleton에서 처리할 항목:

- `destination-shell-island` model spec 추가.
- 전용 state model/repository 추가.
- `config`, `move`, `hotspots/interact`, `missions/clear` API 추가.
- scenes/hotspots/missions/balance loader 후보 작성.
- customs resource adapter 연결 후보 검토.

## 변경 기록

- **2026-06-05**: destination island 데이터 모델 1차안을 작성했다. manifest, items, balance, customs, scenes, hotspots, missions, backend state schema, frontend view model, asset policy를 정의했다.
