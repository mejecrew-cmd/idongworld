# 내 구역 관리 기반 작업 메모 2026-06-08

이 문서는 항해 중 만난 Aidong의 전용 구역을 메인 화면에 추가하기 위한 선행 작업 결과를 기록한다.

아직 Aidong별 실제 등장 풀, 생산 수치, 미니게임 skin, 보상 item, 이별하기 정책은 확정되지 않았다. 따라서 이번 작업은 실제 콘텐츠를 확정하지 않고, 나중에 기획 데이터가 들어왔을 때 바로 연결할 수 있는 저장 구조와 화면 껍데기만 만든다.

## 구현한 범위

- `myIslandStates.dynamicAidongZones`를 추가했다.
- 가변 Aidong 구역의 최소 필드는 `zoneId`, `characterId`, `status`, `displayOrder`, `pinned`, `openedAt`, `source`로 둔다.
- `my-island` backend service에 가변 구역 열기와 업데이트 action을 추가했다.
- `my-island` backend route에 `POST /api/modules/my-island/dynamic-zones/open`, `POST /api/modules/my-island/dynamic-zones/update`를 추가했다.
- frontend `userStore`와 sync 대상에 `dynamicAidongZones`를 추가했다.
- frontend `api`와 `myIslandStoreFacade`에 dynamic zone 조회, 표시 목록, local update, backend update 연결부를 추가했다.
- 마이섬 풀맵 화면에 `Aidong 전용 구역 관리` placeholder section을 추가했다.
- 구역 카드에서는 `고정`, `숨김`, `다시 표시`를 조작할 수 있다.

## 저장 구조

`myIslandStates.dynamicAidongZones`는 `zoneId`를 key로 갖는 map이다.

```ts
{
  [zoneId]: {
    zoneId: string
    characterId: string
    status: 'active' | 'hidden' | 'farewelled'
    displayOrder: number
    pinned: boolean
    openedAt: number
    source: 'voyage-encounter' | 'manual' | 'migration'
  }
}
```

## 상태 의미

- `active`: 메인 구역 목록에 표시할 수 있는 열린 Aidong 구역.
- `hidden`: 사용자가 숨긴 구역. 데이터는 유지하지만 기본 목록에서는 제외할 수 있다.
- `farewelled`: 이별하기 후보 상태. 실제 삭제, 생산 중단, 숙소/도감 처리 정책은 기획 확정 뒤 결정한다.
- `pinned`: 메인 화면에서 우선 표시할 즐겨찾기 성격의 flag.
- `displayOrder`: 같은 pinned 상태 안에서 정렬할 순서.
- `source`: 이 구역이 항해 만남, 수동 지급, migration 중 어디에서 왔는지 남기는 출처.

## Backend 계약

### 구역 열기

`POST /api/modules/my-island/dynamic-zones/open`

요청 후보:

```json
{
  "uid": "user-id",
  "zoneId": "aidong-golden-mung-zone",
  "characterId": "golden-mung",
  "displayOrder": 1,
  "pinned": false,
  "source": "voyage-encounter"
}
```

특징:

- 같은 `zoneId`로 다시 호출해도 중복 생성하지 않는다.
- 기존 구역이 있으면 `openedAt`과 `status`는 유지한다.
- `source`가 잘못 들어오면 기본값 `voyage-encounter`를 쓴다.

### 구역 업데이트

`POST /api/modules/my-island/dynamic-zones/update`

요청 후보:

```json
{
  "uid": "user-id",
  "zoneId": "aidong-golden-mung-zone",
  "status": "hidden",
  "displayOrder": 3,
  "pinned": true
}
```

특징:

- 없는 `zoneId`는 `dynamic_zone_not_found`로 실패한다.
- `status`는 `active`, `hidden`, `farewelled`만 허용한다.
- 생산량, 미니게임 skin, 보상 item은 여기서 다루지 않는다.

## Frontend 표시 기준

마이섬 풀맵은 기존 15구역 grid를 유지하고, 그 아래에 Aidong 전용 구역 관리 section을 둔다.

정렬 후보:

1. `pinned=true`인 구역을 먼저 표시한다.
2. 같은 pinned 상태에서는 `displayOrder` 오름차순으로 표시한다.
3. `status=hidden`은 기본 목록에서 제외할 수 있지만, 관리 패널에서는 다시 표시할 수 있어야 한다.
4. `status=farewelled`는 실제 삭제 정책이 나오기 전까지 관리 목록 또는 dev 목록에서만 보이게 한다.

현재 화면은 기획 확정 전 기반임을 명시하고, 실제 보상이나 생산 기능처럼 보이지 않게 placeholder 문구를 둔다.

## Aidong 위치 중복 방지 후보

Aidong은 동시에 여러 활동 위치에 배치되면 안 된다. 단, 방 꾸미기처럼 위치 점유와 무관하게 허용되는 기능은 별도 판정해야 한다.

후보 위치:

- 숙소 방 배정.
- 숙소 마당 대기.
- 항해 중 선실.
- 항해 중 갑판.
- 항구 지원 배치.
- 구역 생산 배치.
- 가변 Aidong 구역의 대표 Aidong.
- 비활성 또는 이별 상태.

공통 selector 후보:

```ts
type AidongLocationKind =
  | 'lodge-room'
  | 'lodge-yard'
  | 'ship-cabin'
  | 'ship-deck'
  | 'harbor-support'
  | 'zone-production'
  | 'dynamic-zone'
  | 'inactive'

interface AidongLocationSummary {
  characterId: string
  kind: AidongLocationKind
  ownerModuleId: string
  ownerId?: string
  lockedForCare: boolean
  lockedForPlacement: boolean
  canDecorateRoom: boolean
}
```

검증 원칙:

- backend action이 최종 권위다.
- frontend selector는 사용자에게 선택지를 줄이기 위한 편의 도구다.
- 중복 배치 실패는 frontend가 아니라 backend service가 막아야 한다.
- `care`, `practice`, `decorate`, `assign`, `voyage`는 각각 다른 lock 조건을 가질 수 있다.

## Smoke 후보

- 같은 `zoneId`로 두 번 open해도 구역이 하나만 유지된다.
- `dynamic-zones/update`로 `pinned`를 바꾸면 frontend 정렬이 바뀐다.
- `status=hidden`으로 바꾸면 기본 표시 목록에서 제외된다.
- 잘못된 `status`는 backend에서 거부된다.
- 없는 `zoneId` 업데이트는 `dynamic_zone_not_found`로 실패한다.
- 고정 15구역과 가변 Aidong 구역이 같은 화면에서 충돌 없이 표시된다.

## 남은 결정

- 고정 15구역과 가변 Aidong 구역을 최종 UI에서 어떻게 공존시킬지.
- Aidong별 전용 구역의 이름, 설명, 이미지, production type.
- 이별하기가 실제 삭제인지 숨김인지, 도감/숙소/생산 상태를 어떻게 처리하는지.
- Aidong 위치 중복 방지 selector를 frontend 편의 기능으로 둘지, backend에서 별도 location service로 승격할지.
- 항해 만남 수락 API가 `route-neighbor`에 남을지, `my-island`와 조합된 orchestration action으로 갈지.

## 변경 기록

- **2026-06-08**: `myIslandStates.dynamicAidongZones` 저장 구조, backend open/update action, frontend sync/facade/api, 마이섬 풀맵 관리 placeholder를 추가했다. Aidong 위치 중복 방지는 실제 구현 전 후보 계약과 smoke 항목으로 문서화했다.
