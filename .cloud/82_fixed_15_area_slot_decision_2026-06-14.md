# 고정 15구역 슬롯 전환 결정 2026-06-14

이 문서는 `.cloud/77_next_work_2026-06-14_week1_b.md`의 6번 작업 결과다.

목적은 최신 6/11 사이트맵의 AREA-01~15 구조와 현재 코드의 `ZONES`, `dynamicAidongZones` 구조가 충돌하는 지점을 닫고, M1 구현에서 바로 적용할 전환 방침을 확정하는 것이다.

## 기준

- 사전 조사: `.cloud/76_fixed_15_area_slot_prep_2026-06-12.md`
- frontend static zone data: `packages/frontend/src/data/zones.ts`
- frontend full map: `packages/frontend/src/screens/IslandFullMapScreen.tsx`
- backend model: `packages/backend/src/models/MyIslandStateModel.ts`
- backend service: `packages/backend/src/modules/my-island/service.ts`
- backend model spec: `packages/backend/src/modules/modelSpecs.ts`
- 사이트맵 SoT: `.cloud/개발기획서260605/사이트맵_260611_최종확정.md`

## 결론 요약

- 최신 정식 마이섬 구조는 AREA-01~AREA-15 고정 슬롯이다.
- `packages/frontend/src/data/zones.ts`의 기존 `ZONES`는 최신 SoT와 번호, 이름, 역할이 다르므로 M1에서 최신 AREA-01~15 기준으로 교체한다.
- 새 별도 파일 `areaSlots.ts`를 만들기보다, 우선 `zones.ts`를 최신 static SoT로 승격한다.
- backend 저장 필드는 `zoneSlots`로 결정한다.
- `dynamicAidongZones`는 즉시 제거하지 않고 migration/compat 입력으로 낮춘다.
- AREA-02 항구와 AREA-13 숙소는 anchor slot으로 잠그고 Aidong 편입 대상에서 제외한다.
- `IslandFullMapScreen`의 기존 `Aidong 전용 구역 관리` section은 제거하거나 `13 편입 슬롯 관리`로 흡수한다.

## AREA-01~15 static definition

M1에서 `packages/frontend/src/data/zones.ts`의 `ZONES`는 아래 순서를 정식 기준으로 교체한다.

| areaNo | id | 이름 | kind | defaultUnlocked | route 후보 | 편입 가능 |
|---|---|---|---|---|---|---|
| AREA-01 | `lighthouse` | 꿈꾸는 등대 | `fillable` | true 후보 | `/island/area/01` | 가능 |
| AREA-02 | `harbor` | 감정의 파도 항구 | `anchor` | true | `/island/harbor` 또는 `/island/area/02` | 불가 |
| AREA-03 | `memory-forest` | 기억의 숲 | `fillable` | true 후보 | `/island/area/03` | 가능 |
| AREA-04 | `worry-cave` | 고민 해결 동굴 | `fillable` | false 후보 | `/island/area/04` | 가능 |
| AREA-05 | `confidence-waterfall` | 자신감 폭포 | `fillable` | false 후보 | `/island/area/05` | 가능 |
| AREA-06 | `oasis` | 휴식의 오아시스 | `fillable` | true 후보 | `/island/area/06` | 가능 |
| AREA-07 | `sand-square` | 시간의 모래 광장 | `fillable` | false 후보 | `/island/area/07` | 가능 |
| AREA-08 | `reflection-trail` | 성찰의 등산로 | `fillable` | false 후보 | `/island/area/08` | 가능 |
| AREA-09 | `goal-mountain` | 목표의 반짝 산 | `fillable` | false 후보 | `/island/area/09` | 가능 |
| AREA-10 | `friendship-bridge` | 우정의 다리 | `fillable` | false 후보 | `/island/area/10` | 가능 |
| AREA-11 | `creative-spring` | 창의의 샘 | `fillable` | false 후보 | `/island/area/11` | 가능 |
| AREA-12 | `challenge-cliff` | 도전의 절벽 | `fillable` | true 후보 | `/island/area/12` | 가능 |
| AREA-13 | `lodge` | 꿈 조각 하우스 | `anchor` | true | `/island/lodge` 또는 `/island/area/13` | 불가 |
| AREA-14 | `growth-garden` | 성장의 정원 | `fillable` | true 후보 | `/island/area/14` | 가능 |
| AREA-15 | `regret-lake` | 반성의 호수 | `fillable` | false 후보 | `/island/area/15` | 가능 |

`defaultUnlocked`는 현재 화면 접근성과 POC 범위를 위해 후보로 둔다. 실제 해금 정책은 M1 구현 시 route placeholder와 함께 조정한다.

## static data 필드 결정

`Zone` 타입은 M1에서 아래 방향으로 확장한다.

```ts
export type ZoneKind = 'anchor' | 'fillable'

export interface Zone {
  id: string
  areaNo: string
  num: number
  name: string
  kind: ZoneKind
  phase: ZonePhase
  emoji: string
  emotion: string
  activity: string
  defaultUnlocked?: boolean
  route?: string
  legacyRoute?: string
  lockedReason?: 'harbor' | 'lodge'
}
```

결정:

- `areaNo`를 추가해서 기획 문서의 AREA-01~15와 코드 id를 분리한다.
- `num`은 화면 정렬용 숫자로 유지한다.
- `kind`로 `anchor`와 `fillable`을 구분한다.
- `legacyRoute`는 `/island/garden`, `/island/oasis` 같은 기존 route 호환을 위한 임시 필드로 둔다.
- `lockedReason`은 anchor slot의 UI 안내와 backend validation 에러 사유에 사용한다.

## backend 저장 필드 결정

신규 저장 필드는 `zoneSlots`로 결정한다.

이유:

- 기존 코드와 문서가 `zone` 용어를 많이 사용한다.
- `myIslandStates.zoneProgress`와 함께 읽을 때 의미가 자연스럽다.
- `areaNo`는 slot 내부 속성으로 두면 기획 번호와 코드 저장명을 동시에 유지할 수 있다.

후보 구조:

```ts
export interface MyIslandZoneSlot {
  areaNo: string
  areaId: string
  kind: 'anchor' | 'fillable'
  occupantAidongId?: string
  state: 'locked' | 'empty' | 'filled' | 'active' | 'standby'
  source?: 'default' | 'incorporation' | 'migration'
  incorporatedAt?: number
  updatedAt?: number
}

export interface MyIslandStateDoc {
  uid: string
  unlockedZones: string[]
  zoneSlots: Record<string, MyIslandZoneSlot>
  dynamicAidongZones: Record<string, DynamicAidongZone>
  zoneProgress: Record<string, unknown>
  createdAt: number
  updatedAt: number
}
```

결정:

- `zoneSlots`의 key는 `AREA-01` 같은 `areaNo`를 우선한다.
- `areaId`는 `harbor`, `lodge`, `growth-garden` 같은 코드 식별자를 둔다.
- `unlockedZones`는 구역 해금 여부만 담당한다.
- Aidong 편입 여부는 `zoneSlots[areaNo].occupantAidongId`로만 표현한다.
- 같은 Aidong은 여러 fillable slot에 중복 편입될 수 없다.

## anchor 잠금 정책

AREA-02 항구와 AREA-13 숙소는 anchor로 잠근다.

정책:

- anchor slot은 `occupantAidongId`를 가질 수 없다.
- anchor slot은 편입, 해제, 이동 API의 대상이 될 수 없다.
- frontend에서는 편입 버튼 대신 기능 진입 버튼을 표시한다.
- AREA-02는 항구 진입, AREA-13은 숙소 진입을 담당한다.
- route는 사이트맵 정식 경로인 `/island/area/02`, `/island/area/13`을 받을 수 있게 하되, 기존 `/island/harbor`, `/island/lodge`와 alias 또는 redirect를 둔다.

## `dynamicAidongZones` 처리

`dynamicAidongZones`는 M1에서 바로 삭제하지 않는다.

결정:

- 신규 편입은 `zoneSlots`에만 기록한다.
- 기존 `dynamicAidongZones`는 migration/compat 입력으로만 읽는다.
- route-neighbor의 기존 `openDynamicAidongZone` 호출은 M1에서 신규 `slots/incorporate` 흐름으로 대체하거나 compat route로 낮춘다.
- 저장된 `dynamicAidongZones`는 유저 데이터 손실을 막기 위해 최소 1개 마일스톤 동안 유지한다.
- UI에서는 `dynamicAidongZones` 목록을 직접 노출하지 않는다.

## API 전환 결정

신규 API 후보는 아래 순서로 구현한다.

| API | 역할 |
|---|---|
| `GET /api/modules/my-island/slots` | 현재 15구역 slot 상태 조회 |
| `POST /api/modules/my-island/slots/incorporate` | 영입된 Aidong을 fillable slot에 편입 |
| `POST /api/modules/my-island/slots/release` | slot에서 Aidong 편입 해제 |
| `POST /api/modules/my-island/slots/move` | Aidong을 다른 fillable slot으로 이동 |

검증 규칙:

- `AREA-02`, `AREA-13`에는 편입할 수 없다.
- 존재하지 않는 `areaNo`에는 편입할 수 없다.
- 영입되지 않은 Aidong은 편입할 수 없다.
- 같은 Aidong은 두 slot에 동시에 들어갈 수 없다.
- `release`는 빈 slot 또는 anchor slot에는 실패한다.
- `move`는 출발 slot과 도착 slot 모두 fillable이어야 한다.

## frontend 전환 결정

`IslandFullMapScreen`은 M1에서 다음 방향으로 바꾼다.

- `ZONES`를 최신 AREA-01~15 순서로 표시한다.
- 각 카드에는 `areaNo`, 이름, 기능, anchor/fillable 상태, occupant Aidong을 표시한다.
- `Aidong 전용 구역 관리` section은 별도 dynamic list가 아니라 13개 fillable slot 관리 UI로 흡수한다.
- anchor 카드에는 항구/숙소 진입 버튼을 표시한다.
- fillable 카드에는 편입/해제/이동 또는 상세 진입 버튼을 표시한다.
- 기존 `/island/garden`, `/island/oasis`, `/island/memory`, `/island/mine` route는 M1에서 바로 삭제하지 않고 alias/redirect 후보로 둔다.

## M1 구현 체크리스트

- [x] `packages/frontend/src/data/zones.ts`를 AREA-01~15 최신 SoT로 교체한다.
- [x] `Zone` 타입에 `areaNo`, `kind`, `legacyRoute`, `lockedReason`를 추가한다.
- [x] `packages/backend/src/models/MyIslandStateModel.ts`에 `zoneSlots`를 추가한다.
- [x] `packages/backend/src/repositories/moduleDefaults.ts`에 15개 slot 기본값을 추가한다.
- [x] `packages/backend/src/modules/modelSpecs.ts`의 `my-island.ownedFields`에 `zoneSlots`를 추가한다.
- [x] `packages/backend/src/modules/my-island/service.ts`에 slot 조회/편입/해제/이동 service를 추가한다.
- [x] `packages/backend/src/modules/my-island/routes.ts`에 `/slots` route를 추가한다.
- [ ] `route-neighbor/encounter/accept`에서 편입까지 자동 처리하던 흐름을 분리한다.
- [x] `IslandFullMapScreen`의 dynamic zone section을 13 slot UI로 흡수한다.
- [x] `/island/area/02`, `/island/area/13` alias 또는 redirect 방침을 route 구현에 반영한다.

## 변경 기록

- **2026-06-12**: 15구역 전환 방침을 확정했다. `zones.ts`는 최신 AREA-01~15로 교체하고, backend 신규 저장 필드는 `zoneSlots`로 결정했다. `dynamicAidongZones`는 삭제하지 않고 migration/compat 입력으로 낮추며, AREA-02 항구와 AREA-13 숙소는 anchor 잠금으로 정리했다.
- **2026-06-12**: M1 1번 작업으로 `packages/frontend/src/data/zones.ts`의 AREA-01~15 static data와 `Zone` 타입 확장을 반영했다.
- **2026-06-12**: M1 2번 작업으로 backend `myIslandStates.zoneSlots` schema, AREA-01~15 기본값, model spec ownership을 반영했다.
- **2026-06-12**: M1 3번 작업으로 `my-island` slot 조회/편입/해제/이동 service와 anchor 잠금, 영입 여부, 중복 편입 검증을 반영했다.
- **2026-06-12**: M1 4번 작업으로 `my-island` `/slots`, `/slots/incorporate`, `/slots/release`, `/slots/move` route를 추가했다.
- **2026-06-12**: M1 5번 작업으로 frontend API client, userStore `zoneSlots`, store facade, sync key를 연결했다.
- **2026-06-12**: M1 6번 작업으로 `IslandFullMapScreen`의 dynamic zone section을 13개 fillable slot 관리 UI로 흡수했다.
- **2026-06-12**: M1 7번 작업으로 `/island/area/02`와 `/island/area/13`을 각각 항구와 숙소로 redirect하고, 구현된 AREA compat route와 미구현 AREA placeholder를 추가했다.
