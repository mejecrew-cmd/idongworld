# 아이동 만남과 가변 메인 구역 설계 2026-06-08

이 문서는 항해에서 아이동을 만났을 때 아이동을 영입하고, 숙소에 합류시키고, 메인 화면에 해당 아이동 전용 구역 슬롯을 추가하는 Phase 1 설계 초안이다.

기준 문서:

- `.cloud/기획변경회의에따른기획변경가이드.md`
- `.cloud/53_core_loop_2026-06-08.md`
- `.cloud/52_plan_change_conflict_map_2026-06-08.md`

## 한 줄 정의

항해 중 아이동을 만나면 별도 일회성 아이동 섬을 소비하는 대신, **만남 이벤트 → 짧은 오프닝 1컷 → 숙소 합류 → 메인 가변 구역 슬롯 추가**로 이어진다.

## 기존 구현 재사용 지점

| 역할 | 현재 구현 | 재사용 방식 |
|---|---|---|
| 아이동 영입 상태 | `myAidongStates.recruitedAidongs`, `/api/modules/my-aidong/recruit` | 그대로 사용 |
| 초기 needs/careLog 생성 | `my-aidong/service.ts` `recruitAidong()` | 그대로 사용 |
| 마이섬 구역 unlock | `myIslandStates.unlockedZones`, `/api/modules/my-island/unlock-zone` | 가변 구역 슬롯 unlock으로 확장 |
| 항해 landing | `routeNeighborStates.landings`, `route-neighbor/landing` | `character` landing을 `aidong-encounter`로 재정의 |
| 시나리오 재생 | `VNPlayer`, `recruit_{scenarioId}` | 짧은 오프닝 1컷 또는 recruit cutscene으로 재사용 |
| 기존 landing 화면 | `/voyage/island/:id/landing` `IslandLandingScene` | 이름/역할을 "섬 상륙"에서 "항해 만남"으로 전환 후보 |
| 가챠 풀 | `@idongworld/gacha`, `getScenarioId` | 초기 20~30 랜덤 풀로 확장 후보 |

## 새 상태 전이

```txt
route-neighbor.roll
  -> landing.type = aidong-encounter
  -> encounterId, characterId, scenarioId 생성

frontend encounter screen
  -> 짧은 오프닝 1컷 또는 recruit scenario 재생
  -> /api/modules/encounter/accept 또는 조합 action 호출

backend accept encounter
  -> my-aidong.recruitedAidongs에 characterId 추가
  -> my-aidong.needs/careLog 초기화
  -> my-island.dynamicZones에 character zone 추가
  -> lodge 합류 상태 갱신
  -> route-neighbor.landings.last.status = cleared

frontend
  -> 숙소 합류 toast 또는 1컷 완료 화면
  -> 메인 화면에서 새 아이동 구역 슬롯 노출
```

## 1차 데이터 모델 후보

### Route Encounter Landing

`routeNeighborStates.landings.last`에 다음 필드를 추가하는 후보를 둔다.

```ts
interface AidongEncounterLanding {
  landingId: string
  routeId: string
  boardPosition: number
  slotType: 'aidong-encounter'
  status: 'arrived' | 'accepted' | 'dismissed' | 'cleared'
  characterId: string
  scenarioId: string
  encounterId: string
  openedAt: number
}
```

기존 `slotType: 'character'`는 호환 alias로 유지할 수 있다.

### My Island Dynamic Zone

`myIslandStates`에 다음 필드 후보를 둔다.

```ts
interface DynamicAidongZone {
  zoneId: string
  characterId: string
  status: 'active' | 'hidden' | 'farewelled'
  openedAt: number
  minigameSkinId?: string
  productionProfileId?: string
}

interface MyIslandState {
  unlockedZones: string[]
  dynamicAidongZones?: Record<string, DynamicAidongZone>
}
```

권장 `zoneId`:

```txt
aidong-zone:{characterId}
```

한글 characterId를 그대로 쓸지, slug를 쓸지는 3번 구현 전 결정한다. URL에는 slug 사용을 우선 검토한다.

### Lodge 합류

숙소 합류는 별도 `lodgeStates.residents`를 만들기보다, 1차에서는 `myAidongStates.recruitedAidongs`를 숙소 보유 목록의 권위로 본다.

숙소 방 배정, 마당 표시, 적극 육성 슬롯 제한은 6번 숙소 중심 육성 허브 작업에서 세분화한다.

## API 후보

### 단기 후보: 기존 API 조합

프론트에서 다음 순서로 호출한다.

```txt
POST /api/modules/my-aidong/recruit
POST /api/modules/my-island/unlock-zone
POST /api/modules/route-neighbor/landing/clear
```

장점:

- 현재 구현을 거의 그대로 재사용한다.
- 빠르게 UI 흐름을 만들 수 있다.

단점:

- 중간 실패 시 일부 상태만 반영될 수 있다.
- "만남 수락"이라는 domain action이 흩어진다.

### 권장 후보: Encounter Accept API

새 action을 하나 둔다.

```txt
POST /api/modules/route-neighbor/encounter/accept
```

요청:

```json
{
  "landingId": "route-neighbor:10",
  "characterId": "황금멍"
}
```

응답:

```json
{
  "ok": true,
  "myAidong": {},
  "myIsland": {},
  "route": {},
  "dynamicZone": {
    "zoneId": "aidong-zone:hwanggumeong",
    "characterId": "황금멍"
  }
}
```

규칙:

- 현재 landing이 `aidong-encounter` 또는 호환 `character`여야 한다.
- landing의 `characterId`와 요청 characterId가 일치해야 한다.
- 이미 영입된 아이동이면 중복 영입하지 않고 기존 상태를 반환한다.
- dynamic zone도 중복 생성하지 않는다.
- scenario 완료 여부는 frontend가 보장하기보다 backend에 `acceptedAt`만 기록한다.
- Mongo transaction이 없는 local 환경에서는 실패 시 재호출해도 멱등적으로 같은 결과가 나와야 한다.

## 화면 흐름

### 항해 보드

- character/aidong encounter landing이 나오면 "아이동을 만났어요" 모달을 띄운다.
- 버튼 문구는 "만나러 가기" 또는 "이야기 보기"를 우선한다.
- "섬으로 들어가기" 표현은 피한다. 새 기획에서는 아이동 섬이 아니라 만남 이벤트다.

### 만남 화면

기존 `/voyage/island/:id/landing`는 다음 중 하나로 전환한다.

후보 A:

```txt
/voyage/encounter/:characterId
```

후보 B:

```txt
/voyage/aidong/:characterId/encounter
```

화면 구성:

1. 바다 또는 항해 배경.
2. 아이동 등장 1컷.
3. `recruit_{scenarioId}` 또는 짧은 encounter scenario 재생.
4. 완료 시 accept action 호출.
5. "숙소에 합류했어요", "메인에 새 구역이 열렸어요" 안내.
6. 기본 이동은 메인 또는 숙소로 보낸다.

### 메인 화면

- 기본 구역 아래 또는 옆에 아이동 전용 구역 슬롯을 표시한다.
- 슬롯은 아이동 이미지, 이름, 미니게임/생산 상태, 이별하기 후보 버튼을 가진다.
- 고정 15구역과 가변 구역의 공존 방식은 P0 미결이다.

### 숙소

- 영입된 아이동은 숙소 보유 목록에 바로 보인다.
- 방이 남아 있으면 방에 배치하거나 적극 육성 후보로 보여준다.
- 방이 없으면 마당/대기 목록에 표시한다.

## 이별하기 후보 규칙

이별하기는 바로 구현하지 않고 후보 규칙만 둔다.

- 이별하면 메인 가변 구역은 `hidden` 또는 `farewelled`가 된다.
- 해당 아이동의 25 도감 인벤토리와 생산 라인은 비활성화된다.
- 이미 소비한 업그레이드나 전역 보상 회수 여부는 미결이다.
- 이별은 실수 위험이 크므로 confirm, cooldown, 복구 가능 기간을 검토한다.

## 고정 15구역과 가변 구역 충돌

P0 미결이다.

후보:

1. 고정 5 기본 구역 + 아이동 가변 구역.
2. 고정 15구역은 정서/풍경/생산 테마로 유지하고, 아이동 슬롯은 별도 레이어로 둔다.
3. 고정 구역 일부가 아이동을 만나며 변형된다.
4. Phase 1에서는 고정 15구역을 줄이고 아이동 슬롯만 우선한다.

월요일 재논의 전까지 코드에서는 고정 15구역 삭제나 대규모 route 변경을 하지 않는다.

## 초기 랜덤 풀

- 초기에는 실제 제작 가능한 20~30마리를 전부 랜덤 등장 후보로 둔다.
- 현재 본진 5명과 `FIRST_GACHA_POOL`은 유지하되, route encounter pool로 확장할 catalog가 필요하다.
- 766마리 전체 인사이클로피디아는 로드맵으로 둔다.

## 구현 순서 후보

1. encounter/dynamic zone 문서와 타입 후보 확정.
2. `myIslandStates.dynamicAidongZones` model spec 후보 추가.
3. `route-neighbor` landing type에 `aidong-encounter` 추가.
4. backend `accept encounter` action 추가.
5. frontend route를 `/voyage/encounter/:characterId`로 추가.
6. 기존 `IslandLandingScene` 문구를 섬 상륙에서 만남 이벤트로 전환.
7. 메인 화면에 dynamic aidong zone 슬롯을 표시.
8. 숙소 화면에서 영입 직후 아이동이 목록에 보이는지 확인.
9. smoke에 "항해 만남 -> 영입 -> 구역 추가"를 추가.

## 보류

- 이별하기 실제 구현.
- 아이동별 25 도감 인벤토리 상세.
- 고정 15구역과 가변 구역의 최종 UI.
- 초기 20~30 랜덤 풀 catalog 확정.
- 친구 간 교환.

## 변경 기록

- **2026-06-08**: 최초 작성. 항해 아이동 만남을 별도 일회성 섬이 아니라 숙소 합류와 메인 가변 구역 슬롯 추가로 이어지는 상태 전이로 재정의했다.
