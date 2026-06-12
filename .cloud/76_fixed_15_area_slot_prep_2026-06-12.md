# 고정 15구역 슬롯 전환 사전 조사 2026-06-12

이 문서는 `.cloud/72_next_work_2026-06-12_week1_a.md`의 6번 작업 결과다.

목적은 현재 코드의 가변 Aidong 구역 구현과 최신 6/11 사이트맵의 고정 15구역 기획이 어디서 충돌하는지 확인하고, M1 작업에서 바로 들어갈 수 있도록 전환 지점을 표시하는 것이다.

## 기준

- 사이트맵 SoT: `.cloud/개발기획서260605/사이트맵_260611_최종확정.md`
- frontend static zone data: `packages/frontend/src/data/zones.ts`
- frontend full map screen: `packages/frontend/src/screens/IslandFullMapScreen.tsx`
- frontend store/facade: `packages/frontend/src/stores/userStore.ts`, `packages/frontend/src/lib/storeFacades.ts`
- frontend API client: `packages/frontend/src/lib/api.ts`
- backend model: `packages/backend/src/models/MyIslandStateModel.ts`
- backend service/route: `packages/backend/src/modules/my-island/service.ts`, `packages/backend/src/modules/my-island/routes.ts`

## 현재 `dynamicAidongZones` 사용처

### frontend

| 파일 | 역할 |
|---|---|
| `packages/frontend/src/stores/userStore.ts` | `DynamicAidongZone` 타입, `dynamicAidongZones` 상태, local upsert/update action 보유 |
| `packages/frontend/src/lib/storeFacades.ts` | `useDynamicAidongZones`, `useVisibleDynamicAidongZones`, `upsertDynamicAidongZone`, `updateDynamicAidongZoneLocal` 노출 |
| `packages/frontend/src/lib/api.ts` | `/api/modules/my-island/dynamic-zones/open`, `/dynamic-zones/update` 호출 함수 보유 |
| `packages/frontend/src/lib/syncStore.ts` | `MY_ISLAND_KEYS`에 `unlockedZones`, `dynamicAidongZones` 포함 |
| `packages/frontend/src/screens/IslandFullMapScreen.tsx` | `Aidong 전용 구역 관리` section에서 dynamic zone 목록 표시, 고정/숨김 처리 |

### backend

| 파일 | 역할 |
|---|---|
| `packages/backend/src/models/MyIslandStateModel.ts` | `dynamicAidongZones` Mongo field 정의 |
| `packages/backend/src/modules/modelSpecs.ts` | `my-island` ownedFields에 `dynamicAidongZones` 포함 |
| `packages/backend/src/repositories/moduleDefaults.ts` | my-island default state에 `dynamicAidongZones: {}` 포함 |
| `packages/backend/src/modules/my-island/service.ts` | `openDynamicAidongZone`, `updateDynamicAidongZone` 구현 |
| `packages/backend/src/modules/my-island/routes.ts` | `/dynamic-zones/open`, `/dynamic-zones/update` route 제공 |
| `packages/backend/src/modules/route-neighbor/service.ts` | 항해 encounter 수락 시 `openDynamicAidongZone` 호출 |

## 현재 `ZONES` static data 상태

`packages/frontend/src/data/zones.ts`에는 이미 15개 구역이 있지만, 최신 6/11 사이트맵과 번호·명칭·역할이 다르다.

현재 코드의 주요 차이:

| 현재 코드 | 최신 사이트맵 기준 |
|---|---|
| `num: 1`, `id: harbor`, 항구 | AREA-02 감정의 파도 항구 |
| `num: 2`, `id: lodge`, 숙소 부지 | AREA-13 꿈 조각 하우스 |
| `num: 3`, `id: garden`, 성장의 정원 | AREA-14 성장의 정원 |
| `num: 4`, `id: oasis`, 휴식의 오아시스 | AREA-06 휴식의 오아시스 |
| `num: 5`, `id: forest`, 기억의 숲 | AREA-03 기억의 숲 |
| `num: 6`, `id: cliff`, 도전의 절벽 | AREA-12 도전의 절벽 후보 |
| `num: 7`, `id: mountain`, 목표의 반짝 산 | AREA-09 목표의 반짝 산 |
| `num: 10`, `id: lighthouse`, 꿈꾸는 등대 | AREA-01 꿈꾸는 등대 |
| `num: 13`, `id: beach`, 감정의 파도 해변 | 최신 사이트맵에는 AREA-02 항구가 파도 정서를 가진다. |
| `num: 14`, `id: sand`, 시간의 모래 광장 | AREA-07 시간의 모래 광장 |
| `num: 15`, `id: lake`, 반성의 호수 | AREA-15 반성의 호수 |

판단:

- `ZONES`는 파일 이름과 화면 설명은 15구역 SoT처럼 되어 있지만, 최신 SoT가 아니다.
- M1에서는 `ZONES`를 6/11 사이트맵의 AREA-01~15 순서로 재작성하거나, 새 `AREA_SLOTS`를 만들고 기존 `ZONES`를 compat로 낮추는 결정을 해야 한다.

## 최신 AREA-01~15 기준

| areaNo | id 후보 | 이름 | 성격 | anchor 여부 |
|---|---|---|---|---|
| AREA-01 | `area-01-lighthouse` | 꿈꾸는 등대 | 온보딩 힌트·길잡이 | 편입 후보 |
| AREA-02 | `area-02-harbor` | 감정의 파도 항구 | 항구·항해 진입 | anchor 잠금 |
| AREA-03 | `area-03-memory-forest` | 기억의 숲 | 신경쇠약·일기 회독 | 편입 후보 |
| AREA-04 | `area-04-worry-cave` | 고민 해결 동굴 | 대화·우연 케어 | 편입 후보 |
| AREA-05 | `area-05-confidence-waterfall` | 자신감 폭포 | 광산·시그니처 발화 | 편입 후보 |
| AREA-06 | `area-06-oasis` | 휴식의 오아시스 | 방치형·재우기 | 편입 후보 |
| AREA-07 | `area-07-sand-square` | 시간의 모래 광장 | 일기 5조각 | 편입 후보 |
| AREA-08 | `area-08-reflection-trail` | 성찰의 등산로 | 산책·일기 통편 | 편입 후보 |
| AREA-09 | `area-09-goal-mountain` | 목표의 반짝 산 | 데뷔 무대 게이트 | 편입 후보 또는 기능 게이트 |
| AREA-10 | `area-10-friendship-bridge` | 우정의 다리 | 동행·소셜 후보 | 편입 후보 |
| AREA-11 | `area-11-creative-spring` | 창의의 샘 | 크래프팅·예술 능력치 | 편입 후보 |
| AREA-12 | `area-12-challenge-cliff` | 도전의 절벽 | 광산·새 항로 도전 | 편입 후보 |
| AREA-13 | `area-13-lodge` | 꿈 조각 하우스 | 숙소 SOOKSO | anchor 잠금 |
| AREA-14 | `area-14-growth-garden` | 성장의 정원 | 정원·재배 | 편입 후보 |
| AREA-15 | `area-15-regret-lake` | 반성의 호수 | 풀샷·도감 회독 | 편입 후보 |

## anchor 잠금 처리 후보

잠금 처리 후보 위치:

| 위치 | 처리 후보 |
|---|---|
| static area data | `kind: 'anchor'`, `fillable: false`, `lockedReason: 'harbor' | 'lodge'` 같은 필드 추가 |
| backend validation | `my-island` service에서 `AREA-02`, `AREA-13`에는 `occupantAidongId`를 넣지 못하게 검증 |
| frontend full map | anchor 구역은 편입 버튼 대신 항구/숙소 진입 버튼만 표시 |
| route audit | `/island/area/02`는 `/island/harbor`, `/island/area/13`은 `/island/lodge`로 alias 또는 redirect 후보 |

## `IslandFullMapScreen` 변경 지점

현재 `IslandFullMapScreen.tsx`에는 두 구조가 동시에 있다.

1. `ZONES.map(...)`으로 15구역 그리드를 표시한다.
2. 별도 아래 section인 `Aidong 전용 구역 관리`에서 `dynamicAidongZones`를 리스트로 표시한다.

최신 기획에서는 Aidong 전용 구역이 무한히 아래로 붙는 구조가 아니라, 15구역 중 anchor 2개를 제외한 13개 슬롯을 점유하는 구조다.

따라서 M1 변경 후보는 다음과 같다.

- `Aidong 전용 구역 관리` 별도 section을 제거하거나, `13 편입 슬롯 관리` 패널로 바꾼다.
- 각 AREA 카드 안에 `occupantAidongId`, `slotState`, `productionState`를 직접 표시한다.
- `dynamicAidongZones`의 `displayOrder`, `pinned`, `hidden` UX는 13 슬롯 구조에서는 축소하거나 제거한다.
- 기존 dynamic zone 목록은 migration/compat 정보로만 읽고, 신규 UI는 `zoneSlots` 또는 `areaSlots`를 기준으로 렌더링한다.

## backend 전환 후보

현재 `myIslandStates`:

```ts
{
  unlockedZones: string[]
  dynamicAidongZones: Record<string, DynamicAidongZone>
  zoneProgress: Record<string, unknown>
}
```

M1 후보 구조:

```ts
{
  unlockedZones: string[]
  zoneSlots: Record<string, {
    areaNo: string
    areaId: string
    kind: 'anchor' | 'fillable'
    occupantAidongId?: string
    state: 'locked' | 'empty' | 'filled' | 'active' | 'standby'
    source?: 'default' | 'incorporation' | 'migration'
    incorporatedAt?: number
  }>
  zoneProgress: Record<string, unknown>
  dynamicAidongZones?: Record<string, DynamicAidongZone>
}
```

전환 원칙:

- `dynamicAidongZones`는 바로 삭제하지 않는다.
- 신규 편입은 `zoneSlots` 또는 `areaSlots`에 기록한다.
- 기존 `dynamicAidongZones`는 migration source로만 읽는다.
- `unlockedZones`는 "구역 해금"만 담당하고, Aidong 편입 상태를 직접 표현하지 않는다.
- 같은 Aidong이 여러 fillable slot에 들어가지 못하게 backend service에서 검증한다.

## API 전환 후보

현재:

- `POST /api/modules/my-island/dynamic-zones/open`
- `POST /api/modules/my-island/dynamic-zones/update`

후보:

- `GET /api/modules/my-island/slots`
- `POST /api/modules/my-island/slots/incorporate`
- `POST /api/modules/my-island/slots/release`
- `POST /api/modules/my-island/slots/move`
- `POST /api/modules/my-island/slots/activate`

주의:

- 영입은 `my-aidong` 책임이다.
- 편입은 `my-island` 책임이다.
- `route-neighbor/encounter/accept`는 영입과 편입을 한 번에 처리하지 않도록 분리해야 한다.

## 1차 결론

- 고정 15구역 전환의 핵심 파일은 `packages/frontend/src/data/zones.ts`, `packages/frontend/src/screens/IslandFullMapScreen.tsx`, `packages/backend/src/modules/my-island/service.ts`, `packages/backend/src/models/MyIslandStateModel.ts`다.
- 현재 `ZONES`는 최신 6/11 사이트맵의 AREA-01~15와 다르므로 그대로 쓰면 안 된다.
- `dynamicAidongZones`는 기존 구현 자산이지만, 신규 모델에서는 13개 편입 슬롯의 migration/compat 입력으로 낮추는 것이 좋다.
- AREA-02 항구와 AREA-13 숙소는 anchor 잠금으로 처리해야 한다.
- `IslandFullMapScreen`의 아래쪽 `Aidong 전용 구역 관리` section은 13 슬롯 UI로 흡수하는 것이 맞다.

## 변경 기록

- **2026-06-12**: 현재 dynamic Aidong zone 사용처, 기존 ZONES static data, AREA-01~15 불일치, anchor 잠금 후보, IslandFullMapScreen 전환 지점을 정리했다.
