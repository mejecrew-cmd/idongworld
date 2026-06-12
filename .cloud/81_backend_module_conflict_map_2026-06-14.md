# Backend Module 충돌 지도 2026-06-14

이 문서는 `.cloud/77_next_work_2026-06-14_week1_b.md`의 5번 작업 결과다.

목적은 6/11 사이트맵의 M03~M09, M21, M22와 현재 backend module route/model/repository 구조를 대조해서, M1 이후 구현 전에 반드시 정리해야 할 충돌과 결정 방향을 고정하는 것이다.

## 기준 문서와 코드

- backend 대응 준비: `.cloud/75_backend_module_mapping_prep_2026-06-12.md`
- 종합 충돌 지도: `.cloud/79_plan_code_conflict_map_2026-06-14.md`
- 사이트맵 SoT: `.cloud/개발기획서260605/사이트맵_260611_최종확정.md`
- module route mount: `packages/backend/src/modules/index.ts`
- model ownership spec: `packages/backend/src/modules/modelSpecs.ts`
- repository registry: `packages/backend/src/repositories/moduleRepositoryRegistry.ts`

## 현재 backend module 상태

현재 backend는 하나의 Express 서버 안에서 module별 action route와 dedicated repository를 mount한다.

| module | route | storage | 현재 성격 |
|---|---|---|---|
| `my-aidong` | `/api/modules/my-aidong` | `myAidongStates` | Aidong 영입, 친밀도, 욕구, 착용, Aidong별 도감 아이템, 업그레이드 |
| `my-island` | `/api/modules/my-island` | `myIslandStates` | 마이섬 해금, `dynamicAidongZones`, 구역 진행도 |
| `codex` | `/api/modules/codex` | `codexStates` | 기존 일기, 슬롯 해금, 완전 등록 |
| `lodge` | `/api/modules/lodge` | `lodgeStates` | 숙소 배치, 숙소 인벤토리, 방/가구 |
| `route-neighbor` | `/api/modules/route-neighbor` | `routeNeighborStates` | 항해 경로, 보드 위치, landing, encounter accept |
| `ship` | `/api/modules/ship` | `shipStates` | 배 종류, 선실/갑판/항구 배치, 선실 가구, 배 인벤토리 |
| `destination-shell-island` | `/api/modules/destination-shell-island` | `destinationIslandStates` | 조개빛 섬 고정맵 POC, hotspot, 미션 |
| `zone-*` | `/api/modules/zone-*` | `zoneStates` | 기존 마이섬 구역별 collect/clear/production |

## 모듈별 충돌 지도

| 사이트맵 모듈 | 현재 대응 | 충돌 | 결정 방향 | M1 이후 작업 |
|---|---|---|---|---|
| M03 마이섬 허브 | `my-island` | 현재 저장은 `unlockedZones`, `dynamicAidongZones`, `zoneProgress` 중심이다. 최신 기획은 AREA-01~15 고정 슬롯과 편입 상태를 요구한다. | `my-island`를 유지하되, 고정 15구역 슬롯 원장을 추가한다. `dynamicAidongZones`는 즉시 삭제하지 않고 migration/compat 입력으로 낮춘다. | `zoneSlots` 또는 `areaSlots` 저장 필드 결정, anchor 구역 잠금, slot incorporate/release API 추가 |
| M04 숙소 | `lodge`, `my-aidong`, `care` | 숙소는 방/마당/육성/연습/데뷔 준비 허브로 확장되어야 하나 현재는 배치와 가구 중심이다. 케어 상태는 `care` route와 `my-aidong.needs`에 흩어져 있다. | 숙소 화면 중심 action으로 정렬하되, Aidong 권위 상태는 `my-aidong`에 둔다. `lodge`는 공간, 방, 배치, 가구를 소유한다. | 4파라미터 케어 표면화, 숙소 route alias 정리, 연습/데뷔 준비 API 분리 |
| M05 항해 | `route-neighbor`, `ship` | 보드 위치와 배 상태는 있으나 항해 도중 M22 아이동섬 진입, landing, 복귀 흐름이 아직 여러 module에 흩어져 있다. | 항해 진행 권위는 `route-neighbor`, 탑승/선실/갑판/인벤토리 권위는 `ship`으로 유지한다. M22 섬 내부 진행은 별도 module로 분리한다. | 항해 board state와 M22 land/leave 연결, ship crew validation, 항해 중 접근 제한 검증 |
| M06 구역 편입 | `my-island.dynamic-zones`, `route-neighbor/encounter/accept` | 영입, 편입, 구역 생성이 한 흐름에 섞여 있다. 최신 기획은 영입과 마이섬 13개 편입 슬롯을 분리한다. | 영입은 `my-aidong`, 편입은 `my-island`가 소유한다. `route-neighbor/encounter/accept`는 영입 트리거까지만 낮추거나 compat action으로 둔다. | `POST /api/modules/my-island/slots/incorporate`, `POST /api/modules/my-island/slots/release` 후보 구현 |
| M07 케어 | `care`, `my-aidong.needs`, `lodge` | 최신 기획은 Hunger/Clean/Mood/Energy 4파라미터와 5대 케어를 요구한다. 기존 구조는 generic care sync와 needs가 혼재한다. | `my-aidong.needs`를 Aidong 상태 권위로 삼고, `care` route는 호환 또는 facade로 낮춘다. UI action은 숙소/선실 맥락에서 호출하되 저장은 `my-aidong`에 한다. | 4파라미터 schema 명확화, care action validation, 기존 care sync deprecation 문서화 |
| M08 성장·데뷔 | `my-aidong/upgrades`, frontend `/debut/:id` | 성장/연습/데뷔 회의실/대표 무대의 backend 원장이 없다. 업그레이드는 있으나 데뷔 결과와 stage 상태를 소유하지 않는다. | 신규 stage/debut backend route가 필요하다. `my-aidong/upgrades`는 성장 재료 또는 upgrade 요청 원장으로만 둔다. | `stage` 또는 `debut` module 후보 결정, debut result ledger와 photo card 연계 설계 |
| M09 도감 | `codex`, `my-aidong.aidongCodexItems` | `codexStates`는 일기/슬롯/완전 등록에 가깝고, Aidong별 25칸 도감 아이템 원장은 `my-aidong` 쪽에 더 가깝다. | Aidong별 25칸 도감 원장은 `my-aidong.aidongCodexItems`를 우선 권위로 둔다. `codex`는 마이룸에서 읽는 도감/일기 facade 또는 해금 기록으로 정리한다. | 25칸 schema 확정, M21 myroom codex aggregation API, 기존 `/api/modules/codex` 책임 축소 |
| M21 마이룸 | 전용 backend 없음 | 마이룸은 유저 정보, 마이 아이동, 도감, 콜렉션, 가계부 허브지만 독립 저장소가 아직 없다. | 초기에는 전용 collection을 만들지 않고 aggregation route부터 시작한다. 정렬, pin, 표시 옵션이 생기면 `myRoomStates`를 추가한다. | `GET /api/modules/myroom/summary`, `/aidongs`, `/codex`, `/collection`, `/ledger` 후보 구현 |
| M22 아이동섬 | `destination-shell-island`, `route-neighbor`, `my-aidong`, `my-island` | `destination-shell-island`는 조개빛 섬 POC이며 M22의 범용 아이동섬, 영입, 편입 원장을 대체하지 못한다. | 신규 module id는 `aidong-island` 후보를 우선한다. `destination-shell-island`는 compat/dev 또는 이벤트 섬 후보로 낮춘다. | `aidongIslandStates`, `/api/modules/aidong-island/land`, `/interact`, `/recruit`, `/leave` 후보 구현 |

## 핵심 결정

### M03과 M06

- `my-island`는 계속 마이섬 권위 module로 유지한다.
- `dynamicAidongZones`는 최신 기획의 최종 모델이 아니다.
- 신규 고정 슬롯 원장은 `my-island`에 둔다.
- 기존 `dynamicAidongZones`는 저장된 유저 데이터를 잃지 않기 위해 migration/compat 입력으로 둔다.
- 영입은 `my-aidong`, 편입은 `my-island`로 책임을 나눈다.

### M07

- Aidong의 케어 수치는 `my-aidong`이 소유한다.
- `care` route는 기존 frontend sync를 위한 호환 계층 또는 facade로 낮춘다.
- Hunger/Clean/Mood/Energy 4파라미터는 `my-aidong.needs` schema의 표면 모델로 명시한다.
- 숙소와 선실은 케어 action의 진입점일 수 있지만 케어 상태를 직접 소유하지 않는다.

### M09와 M21

- Aidong별 25칸 도감 아이템 원장은 `my-aidong.aidongCodexItems`가 우선 소유한다.
- `codexStates`는 기존 일기/해금/완전 등록의 호환 저장소로 유지한다.
- M21 마이룸은 첫 단계에서 전용 collection 없이 aggregation API로 시작한다.
- 마이룸 전용 사용자 설정이 생기면 그때 `myRoomStates`를 추가한다.

### M22

- M22는 신규 module로 분리한다.
- module id 후보는 `aidong-island`를 우선한다.
- `destination-shell-island`는 정식 M22 원장이 아니라 POC/compat/dev 또는 이벤트 섬 후보로 낮춘다.
- M22 user progress는 `aidongIslandStates` 후보 collection에 둔다.

## 6/15 이후 구현 우선순위

1. `my-island` 고정 15구역 슬롯 원장 설계와 model spec 갱신
2. `my-island` slot incorporate/release API 추가
3. `route-neighbor/encounter/accept`의 영입/편입 책임 분리
4. `my-aidong.needs` 4파라미터 표면 schema와 care facade 정리
5. `myroom` aggregation route skeleton 추가
6. `aidong-island` module skeleton과 `aidongIslandStates` 후보 model 추가
7. `destination-shell-island`를 POC/compat/event 후보로 문서와 manifest에서 낮추기

## 변경 기록

- **2026-06-12**: `.cloud/75_backend_module_mapping_prep_2026-06-12.md`의 원자료를 바탕으로 M03~M09, M21, M22 backend module 충돌 지도와 결정 방향을 작성했다.
