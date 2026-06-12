# Backend Module 대응표 준비 2026-06-12

이 문서는 `.cloud/72_next_work_2026-06-12_week1_a.md`의 5번 작업 결과다.

목적은 현재 backend route/model/repository가 6/11 사이트맵의 M03~M09, M21, M22와 어떻게 대응되는지 확인하고, 6/14 이후 충돌 지도 작성에 필요한 원자료를 고정하는 것이다.

## 확인 기준

- backend entrypoint: `packages/backend/src/index.ts`
- backend module mount: `packages/backend/src/modules/index.ts`
- model spec: `packages/backend/src/modules/modelSpecs.ts`
- repository ownership: `packages/backend/src/repositories/moduleRepositoryRegistry.ts`
- Mongo model: `packages/backend/src/models/*Model.ts`
- 사이트맵 SoT: `.cloud/개발기획서260605/사이트맵_260611_최종확정.md`

## 현재 backend API mount 구조

`packages/backend/src/index.ts` 기준으로 현재 backend는 하나의 Express 서버 안에서 다음 API를 mount한다.

| mount | 담당 |
|---|---|
| `/api/auth` | 인증 |
| `/api/account` | 계정 상태 |
| `/api/gacha` | 첫 만남/가챠 호환 API |
| `/api/care` | 기존 care sync/state API |
| `/api/assets` | asset resolve/signed-url |
| `/api/modules` | backend module action router |
| `/api/modules` | generic module state/model spec router |
| `/api/host` | host resource/inventory |
| `/api/customs` | customs rule/log/apply |

## 현재 backend module action route

`packages/backend/src/modules/index.ts` 기준으로 mount된 module action route는 다음과 같다.

| module | mount | 주요 action |
|---|---|---|
| `codex` | `/api/modules/codex` | `/unlock-diary`, `/unlock-slot`, `/fully-register` |
| `lodge` | `/api/modules/lodge` | `/config`, `/aidongs/assign-toggle`, `/furniture/purchase`, `/rooms/furniture/toggle` |
| `my-aidong` | `/api/modules/my-aidong` | `/recruit`, `/affinity`, `/outfit`, `/items/equip-toggle`, `/codex-items/grant`, `/upgrades/request` |
| `my-island` | `/api/modules/my-island` | `/unlock-zone`, `/tutorial/complete`, `/dynamic-zones/open`, `/dynamic-zones/update` |
| `route-neighbor` | `/api/modules/route-neighbor` | `/start`, `/roll`, `/end`, `/landing/current`, `/landing/clear`, `/encounter/accept` |
| `ship` | `/api/modules/ship` | `/config`, `/type/change`, `/cabins/assign`, `/deck/assign`, `/harbor/assign-toggle`, `/harbor/charge`, `/cabins/furniture/purchase`, `/cabins/furniture/toggle` |
| `destination-shell-island` | `/api/modules/destination-shell-island` | `/config`, `/move`, `/hotspots/interact`, `/missions/clear` |
| `zone-garden` | `/api/modules/zone-garden` | `/collect`, `/clear`, `/production/assign`, `/production/unassign`, `/production/claim` |
| `zone-oasis` | `/api/modules/zone-oasis` | `/collect`, `/clear`, `/production/assign`, `/production/unassign`, `/production/claim` |
| `zone-memory` | `/api/modules/zone-memory` | `/collect`, `/clear`, `/production/assign`, `/production/unassign`, `/production/claim` |
| `zone-mine` | `/api/modules/zone-mine` | `/collect`, `/clear`, `/production/assign`, `/production/unassign`, `/production/claim` |

## 현재 dedicated model/repository ownership

`modelSpecs.ts`와 `moduleRepositoryRegistry.ts` 기준 dedicated storage는 다음과 같다.

| module | collection | 주요 owned fields |
|---|---|---|
| `my-aidong` | `myAidongStates` | `recruitedAidongs`, `affinities`, `needs`, `careLog`, `equippedOutfit`, `equippedItems`, `aidongCodexItems`, `aidongUpgradeState` |
| `my-island` | `myIslandStates` | `unlockedZones`, `dynamicAidongZones`, `zoneProgress` |
| `codex` | `codexStates` | `unlockedDiaries`, `unlockedCodexEntries`, `codexFullyRegistered` |
| `lodge` | `lodgeStates` | `lodgeInventory`, `assignedAidongs`, `rooms`, `furniture` |
| `route-neighbor` | `routeNeighborStates` | `currentRoute`, `boardPosition`, `localResources`, `landings`, `progress` |
| `ship` | `shipStates` | `shipTypeId`, `harborAssignedChars`, `shipInventory`, `cabinAssignments`, `deckAssignments`, `cabinFurniture`, `cargo`, `cabins` |
| `destination-shell-island` | `destinationIslandStates` | `currentNodeId`, `visitedNodeIds`, `clearedMissionIds`, `localResources`, `localInventory`, `hotspotStates` |
| `zone-garden` | `zoneStates` | `localResources`, `clearedCount`, `progress` |
| `zone-oasis` | `zoneStates` | `localResources`, `clearedCount`, `progress` |
| `zone-memory` | `zoneStates` | `localResources`, `clearedCount`, `progress` |
| `zone-mine` | `zoneStates` | `localResources`, `clearedCount`, `progress` |

## 사이트맵 모듈과 backend 대응표

| 사이트맵 모듈 | 기획 역할 | 현재 backend 대응 | 판단 |
|---|---|---|---|
| M03 마이섬 허브 | 15구역 허브, AREA-01~15, 편입 슬롯 기반 | `my-island` | 일부 구현. 현재는 `dynamicAidongZones` 중심이라 고정 15구역 슬롯 모델이 필요하다. |
| M04 숙소 | 방, 마당, 꾸미기, 연습, 데뷔 회의실, 보유 Aidong 관리 | `lodge`, `my-aidong`, 일부 `care` | 일부 구현. `lodgeStates`는 있으나 사이트맵의 방/마당/연습/데뷔 route와 4파라미터 케어는 아직 약하다. |
| M05 항해 | 항로 보드, 지정 이동/주사위 옵션, 아이동섬 진입 | `route-neighbor`, `ship` | 일부 구현. board position과 ship 상태는 있으나 M22 아이동섬 진입과 새 route 정책 정리가 필요하다. |
| M06 구역 편입 | 영입 후 13 슬롯 편입/해제 | `my-island.dynamic-zones`, `route-neighbor/encounter/accept` | 충돌 있음. 영입과 편입이 섞여 있어 `slots/incorporate`, `slots/release` 같은 별도 action 후보가 필요하다. |
| M07 케어 | Hunger/Clean/Mood/Energy, 5대 케어 | `care`, `my-aidong.needs`, `lodge` | 일부 구현. 기존 care route와 needs는 있으나 4파라미터 표면 모델과 숙소 중심 action 재정렬이 필요하다. |
| M08 성장·데뷔 | 연습, 데뷔 회의실, 대표 무대, 포토카드 연결 | `my-aidong/upgrades`, `/debut/:id` frontend, backend 전용 route 없음 | backend 신규 필요. stage/debut 결과 원장과 action route가 아직 없다. |
| M09 도감 | 아이동별 25칸 도감템, 콜렉션과 분리 | `codex`, `my-aidong.aidongCodexItems` | 일부 구현. 도감템 원장은 `my-aidong` 쪽에 후보가 있고 `codex`는 기존 일기/slot 등록에 가깝다. M21 위치 이동 필요. |
| M21 마이룸 | 정보 허브, 유저 정보, 마이 아이동, 도감, 콜렉션, 가계부 | 전용 backend 없음. `account`, `my-aidong`, `codex`, `host` 조합 후보 | 신규 route/model 검토 필요. 별도 저장이 필요할 수도 있으나 초기에는 aggregation/facade API로 충분할 가능성이 높다. |
| M22 아이동섬 | 항해 중 만나는 아이동섬, 상륙, 탐험, 영입, 편입 연결 | `destination-shell-island`, `route-neighbor`, `my-aidong`, `my-island` | 신규 module 필요. `destination-shell-island`는 POC/compat 성격이며 M22 정식 상태와 route를 대체하지 못한다. |

## M21, M22 저장소 판단 후보

### M21 마이룸

초기 판단:

- 전용 collection을 바로 만들기보다 aggregation route부터 시작하는 것이 낫다.
- M21은 `account`, `host`, `my-aidong`, `codex`, `lodge`의 읽기 조합 허브 성격이 강하다.
- 단, 마이룸 전용 설정, 정렬, pin, 표시 옵션이 생기면 `myRoomStates` 전용 collection 후보가 된다.

후보 API:

- `GET /api/modules/myroom/summary`
- `GET /api/modules/myroom/aidongs`
- `GET /api/modules/myroom/aidongs/:id`
- `GET /api/modules/myroom/codex`
- `GET /api/modules/myroom/collection`

### M22 아이동섬

초기 판단:

- 정식 모듈로 분리하는 것이 맞다.
- `destination-shell-island`는 조개빛 섬 POC로 유지하고, M22의 범용 아이동섬 진행 상태와 섞지 않는다.
- 아이동섬 static data와 user progress를 분리해야 한다.

후보 collection:

- `aidongIslandStates`

후보 owned fields:

- `visitedIslandIds`
- `currentIslandId`
- `islandProgress`
- `clearedQuestIds`
- `encounteredAidongIds`
- `recruitmentFlags`
- `landingHistory`

후보 API:

- `GET /api/modules/aidong-island/config`
- `POST /api/modules/aidong-island/land`
- `POST /api/modules/aidong-island/interact`
- `POST /api/modules/aidong-island/recruit`
- `POST /api/modules/aidong-island/leave`

## 기존 `destination-shell-island`와 M22 충돌 지점

- `destination-shell-island`는 `worldScope: destination-island`이고 route가 `/voyage/island/shell`이다.
- M22 사이트맵 route는 `/voyage/island/:id`, `/voyage/island/:id/land`, `/voyage/island/:id/sub`, `/voyage/island/:id/landing`이다.
- 현재 `destinationIslandStates`는 `currentNodeId`, `visitedNodeIds`, `hotspotStates`, `localResources`, `localInventory` 중심이라 고정맵 탐험 POC에는 맞지만, Aidong 영입/편입 수직 루프의 정식 원장으로는 부족하다.
- 따라서 `destination-shell-island`는 6월 POC에서 삭제하지 않고 compat/dev 또는 이벤트 섬 후보로 낮춘다.
- M22는 별도 module id를 정해야 한다. 후보는 `aidong-island` 또는 `my-aidong-island`다. 사이트맵의 의미상으로는 `aidong-island`가 더 명확하다.

## 6/14 충돌 지도 작성용 메모

- `my-island.dynamicAidongZones`는 M03/M06의 고정 15구역 슬롯 기획과 직접 충돌한다.
- `route-neighbor/encounter/accept`는 M06의 영입/편입 분리와 충돌한다.
- `codex` 전용 collection은 M09의 25칸 도감템 원장과 이름이 비슷하지만, 실제 동적 원장은 `my-aidong.aidongCodexItems`가 더 가깝다.
- `lodgeStates.assignedAidongs`는 M04 마당/방/육성 슬롯 재구성과 충돌 가능성이 있다.
- `shipStates`는 6월 core loop에서 필수 확장 대상은 아니지만 M05 항해 상태와 결합되어 있으므로 smoke에서는 유지해야 한다.
- M21은 읽기 aggregation API로 시작하고, 쓰기 상태가 생길 때 model을 추가하는 편이 안전하다.
- M22는 신규 module route/model을 만드는 편이 안전하다.

## 변경 기록

- **2026-06-12**: 현재 backend module route, dedicated model, repository ownership을 확인하고 M03~M09, M21, M22 대응 후보와 충돌 지점을 정리했다.
