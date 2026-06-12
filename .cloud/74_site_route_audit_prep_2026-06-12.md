# 사이트맵 Route Audit 준비 2026-06-12

이 문서는 `.cloud/72_next_work_2026-06-12_week1_a.md`의 4번 작업 결과다.

목적은 `.cloud/개발기획서260605/사이트맵_260611_최종확정.md`의 화면 inventory와 현재 frontend route를 본격 대조하기 전에, 원자료와 분류 기준을 미리 고정하는 것이다.

## 기준 문서

- 사이트맵 SoT: `.cloud/개발기획서260605/사이트맵_260611_최종확정.md`
- 앱 수동 라우터: `packages/frontend/src/App.tsx`
- 모듈 라우터 합성기: `packages/frontend/src/lib/moduleRoutes.tsx`
- 모듈 manifest route: `packages/modules/*/manifest.ts`

## 사이트맵 route 원자료

사이트맵에서 확인한 route 후보는 다음과 같다.

### 앱유저, 플레이어, 오프닝

| ID | route | 상태 |
|---|---|---|
| SPLASH-00 | `/` | 확정 |
| LOGIN | `/login` | 확정 |
| SIGNUP | `/signup` | 확정 |
| TERMS | `/terms` | 확정 |
| APP-SET | `/settings` | 기획중 |
| USER-INFO | `/user` | 기획중 |
| ALERT-CENTER | `/alerts` | 미결 |
| SHOP | `/shop` | 미결 |
| ADWALL | `/adwall` | 보류 |
| TITLE | `/title` | 확정 |
| ATTEND | `/attendance` | 기획중 |
| ROULETTE | `/roulette` | 기획중 |
| SOCIAL | `/social` | 보류 |
| FANDOM | `/fandom` | 보류 |
| UGC | `/ugc` | 보류 |
| EVENT-MAIN | `/event` | 미결 |
| EVENT-SEASON | `/event/season` | 보류 |
| OP-01/02 | `/opening` | 기획중 |
| OP-03 | `/first-meeting` | 확정 |
| OP-04 | `/opening/part2` | 기획중 |
| LAND-01 | `/heart-island/first` | 기획중 |
| LAND-03 | `/island/full-map?tour` | 기획중 |
| LAND-04 | `/heart-island/naming` | 확정 |

### 마이섬, 숙소, 마이룸

| ID | route | 상태 |
|---|---|---|
| ISLAND-HUB | `/island` | 구현 |
| FULL-MAP | `/island/full-map` | 구현 |
| AREA-01 | `/island/area/01` | 미결 |
| AREA-02 | `/island/area/02` | 확정 |
| AREA-03 | `/island/area/03` | 기획중 |
| AREA-04 | `/island/area/04` | 미결 |
| AREA-05 | `/island/area/05` | 기획중 |
| AREA-06 | `/island/area/06` | 미결 |
| AREA-07 | `/island/area/07` | 미결 |
| AREA-08 | `/island/area/08` | 미결 |
| AREA-09 | `/island/area/09` | 확정 |
| AREA-10 | `/island/area/10` | 미결 |
| AREA-11 | `/island/area/11` | 미결 |
| AREA-12 | `/island/area/12` | 미결 |
| AREA-13 | `/island/area/13` | 확정 |
| AREA-14 | `/island/area/14` | 기획중 |
| AREA-15 | `/island/area/15` | 미결 |
| SOOKSO | `/island/lodge` | 구현 |
| SOOKSO-ROOM | `/island/lodge/room` | 기획중 |
| SOOKSO-YARD | `/island/lodge/yard` | 기획중 |
| SOOKSO-DECO | `/island/lodge/deco` | 기획중 |
| SOOKSO-TRAIN | `/island/lodge/train` | 기획중 |
| SOOKSO-DEBUT | `/island/lodge/debut` | 기획중 |
| MYROOM-HOME | `/island/lodge/myroom` | 기획중 |
| MYROOM-INFO | `/island/lodge/myroom/info` | 기획중 |
| MYROOM-AIDONG-LIST | `/island/lodge/myroom/aidong` | 기획중 |
| MYROOM-AIDONG-SHEET | `/island/lodge/myroom/aidong/:id` | 기획중 |
| MYROOM-AIDONG-EXT | `/island/lodge/myroom/aidong/:id/ext` | 기획중 |
| MYROOM-CODEX | `/island/lodge/myroom/codex` | 기획중 |
| MYROOM-COLLECT | `/island/lodge/myroom/collection` | 기획중 |
| PHOTOCARD-GEN | `/island/lodge/myroom/collection/photocard/new` | 기획중 |
| PHOTOCARD-GALLERY | `/island/lodge/myroom/collection/photocard` | 기획중 |
| MYROOM-LEDGER | `/island/lodge/myroom/ledger` | 기획중 |

### 무대, 백과, 항해, 액티비티

| ID | route | 상태 |
|---|---|---|
| STAGE-MAIN | `/stage` | 기획중 |
| DEBUT-SHOW | `/stage/debut/:id` | 기획중 |
| ENCY-AIDONG | `/encyclopedia/aidong/:id` | 기획중 |
| ENCY-ISLAND | `/encyclopedia/island` | 미결 |
| BOARD | `/voyage/board` | 확정 |
| ISLE | `/voyage/island/:id` | 확정 |
| RECRUIT | `/voyage/island/:id/landing` | 확정 |
| iDONGisland_000 | `/voyage/island/:id/land` | 기획중 |
| iDONGisland_000_기타 | `/voyage/island/:id/sub` | 기획중 |
| Activity_Main_01 | `/activity/main/01` | 기획중 |
| Activity_Main_02 | `/activity/main/02` | 기획중 |
| Activity_Main_03 | `/activity/main/03` | 기획중 |
| Activity_Main_04 | `/activity/main/04` | 기획중 |
| Activity_Main_05 | `/activity/main/05` | 기획중 |
| Activity_Sub_01 | `/activity/sub/01` | 미결 |
| Activity_Sub_02 | `/activity/sub/02` | 미결 |
| Activity_Sub_03 | `/activity/sub/03` | 미결 |
| Activity_Sub_04 | `/activity/sub/04` | 미결 |
| Activity_Sub_05 | `/activity/sub/05` | 미결 |

## 현재 구현 route 원자료

### `App.tsx` 수동 route

| route | 화면 |
|---|---|
| `/` | `EntryGuard` |
| `/login` | `LoginScreen` |
| `/title` | `TitleScreen` |
| `/opening` | `OpeningScreen` |
| `/opening/part2` | `OpeningPart2Screen` |
| `/first-meeting` | `FirstMeetingScreen` |
| `/heart-island/first` | `HeartIslandFirstScreen` |
| `/heart-island/cleaning` | `CleaningLoopScreen` |
| `/heart-island/naming` | `NamingToHeartScreen` |
| `/island` | `HubHeartScene` |
| `/island/full-map` | `IslandFullMapScreen` |
| `/island/harbor` | `HarborScene` |
| `/island/lodge` | `LodgeScene` |
| `/codex` | `CodexScreen` |
| `/voyage/board` | `NavigationBoardScene` |
| `/voyage/island/:id` | `IslandMapScene` |
| `/voyage/island/:id/landing` | `IslandLandingScene` |
| `/debut/:id` | `DebutStageScene` |
| `/dev/catalog` | `AssetCatalogScreen` |

### 모듈 자율 route

`packages/frontend/src/lib/moduleRoutes.tsx`에서 합성되는 route는 다음 모듈 manifest를 기준으로 한다.

| module | manifest route | 비고 |
|---|---|---|
| `zone-garden` | `/island/garden` | 사이트맵의 AREA-14와 의미상 대응 후보 |
| `zone-oasis` | `/island/oasis` | 사이트맵의 AREA-06과 의미상 대응 후보 |
| `zone-memory` | `/island/memory` | 사이트맵의 AREA-03과 의미상 대응 후보 |
| `zone-mine` | `/island/mine` | 사이트맵의 AREA-05 또는 AREA-12와 의미상 충돌 후보 |
| `route-neighbor` | `/voyage` | App.tsx의 `/voyage/board`와 route base 충돌 가능성 확인 필요 |
| `destination-shell-island` | `/voyage/island/shell` | M22 아이동섬과 별도 POC/compat 후보 |

## 분류 기준

6/14 route audit 표에서는 각 사이트맵 route를 다음 중 하나로 분류한다.

| 분류 | 의미 |
|---|---|
| `구현` | 사이트맵 route와 실제 frontend route가 거의 일치하고 화면도 존재한다. |
| `일부 구현` | 의미상 대응 화면은 있으나 route가 다르거나 기능 범위가 부족하다. |
| `placeholder 필요` | 사이트맵상 확정 또는 기획중인데 frontend route가 없다. 6월 POC에서 빈 화면이라도 필요하다. |
| `보류` | 사이트맵 상태가 보류이거나 6월 컷라인 밖이다. 메뉴 노출을 막거나 준비중으로 둔다. |
| `폐기 후보` | 과거 구현 route가 최신 사이트맵과 맞지 않고, compat/dev 외 사용처가 불분명하다. |

## 1차로 보이는 충돌 후보

- 사이트맵은 AREA route를 `/island/area/01`~`/island/area/15`로 정의하지만, 현재 구현은 `/island/garden`, `/island/oasis`, `/island/memory`, `/island/mine` 같은 의미 기반 route를 쓴다.
- 사이트맵의 항구 앵커는 `/island/area/02`지만 현재 구현은 `/island/harbor`다.
- 사이트맵의 숙소 앵커는 `/island/area/13`과 `/island/lodge`가 함께 의미를 가진다. 현재 구현은 `/island/lodge`만 있다.
- 사이트맵의 마이룸 M21 route는 대부분 아직 없다.
- 사이트맵의 대표 무대는 `/stage`, 데뷔 공연은 `/stage/debut/:id`지만 현재 구현은 `/debut/:id`다.
- 사이트맵의 M22 route 중 `/voyage/island/:id/land`, `/voyage/island/:id/sub`는 아직 없다.
- 기존 `destination-shell-island`의 `/voyage/island/shell`은 신규 M22와 분리해서 POC/compat 후보로 낮출 필요가 있다.
- BottomNav에는 `/shop`, `/setting`이 있으나 App route에는 대응 route가 없다. 사이트맵은 `/settings`를 사용한다.
- `/codex`는 현재 구현되어 있지만 사이트맵의 신규 위치는 `/island/lodge/myroom/codex`다.

## 다음 작업

1. 이 문서의 raw 목록을 기준으로 6/14에 route audit 표를 만든다.
2. 각 사이트맵 route에 `구현`, `일부 구현`, `placeholder 필요`, `보류`, `폐기 후보`를 붙인다.
3. route가 다른데 의미상 같은 화면은 바로 삭제하지 않고 alias, redirect, 흡수, 숨김 중 하나로 분류한다.
4. 확정 route 중 없는 화면은 placeholder route 생성 대상으로 넘긴다.

## 변경 기록

- **2026-06-12**: 6/11 사이트맵 route와 현재 frontend route, 모듈 route manifest를 대조하기 위한 raw 목록과 분류 기준을 작성했다.
