# Frontend Route Audit 2026-06-14

이 문서는 `.cloud/77_next_work_2026-06-14_week1_b.md`의 4번 작업 결과다.

목적은 `.cloud/개발기획서260605/사이트맵_260611_최종확정.md`의 route와 현재 frontend route를 대조해, 각 route의 다음 행동을 정하는 것이다.

## 기준

- 사이트맵 SoT: `.cloud/개발기획서260605/사이트맵_260611_최종확정.md`
- route raw 준비: `.cloud/74_site_route_audit_prep_2026-06-12.md`
- 앱 수동 route: `packages/frontend/src/App.tsx`
- 모듈 route 합성: `packages/frontend/src/lib/moduleRoutes.tsx`
- 하단 메뉴: `packages/frontend/src/components/BottomNav.tsx`

## 분류 기준

| 분류 | 의미 |
|---|---|
| `구현` | 사이트맵 route와 실제 route가 거의 일치하고 화면이 존재한다. |
| `일부 구현` | 대응 화면은 있으나 route가 다르거나 기능 범위가 부족하다. |
| `placeholder 필요` | 사이트맵상 확정 또는 6월 POC에 필요한 기획중 route인데 화면이 없다. |
| `보류` | 6월 컷라인 밖이거나 사이트맵 상태가 보류다. |
| `폐기 후보` | 최신 사이트맵과 어긋난 과거 route이며 compat/dev 외 사용처가 불명확하다. |

## 앱유저, 플레이어, 오프닝

| 사이트맵 ID | 사이트맵 route | 현재 구현 | 분류 | 다음 행동 |
|---|---|---|---|---|
| SPLASH-00 | `/` | `/` EntryGuard | 구현 | 유지 |
| LOGIN | `/login` | `/login` | 구현 | 유지 |
| SIGNUP | `/signup` | 없음 | placeholder 필요 | 회원가입 placeholder route 추가 |
| TERMS | `/terms` | 없음 | placeholder 필요 | 약관 placeholder route 추가 |
| APP-SET | `/settings` | 없음. BottomNav는 `/setting` 사용 | placeholder 필요 | route는 `/settings`로 통일, `/setting`은 redirect 또는 수정 |
| USER-INFO | `/user` | 없음 | placeholder 필요 | M19 placeholder 후보 |
| ALERT-CENTER | `/alerts` | 없음 | 보류 | M20 이후. 메뉴 노출 금지 |
| TITLE | `/title` | `/title` | 구현 | 유지 |
| OP-01/02 | `/opening` | `/opening` | 일부 구현 | 최초 계정 생성 시에만 진입하는 조건 유지 |
| OP-03 | `/first-meeting` | `/first-meeting` | 구현 | 유지 |
| OP-04 | `/opening/part2` | `/opening/part2` | 구현 | 유지 |
| LAND-01 | `/heart-island/first` | `/heart-island/first` | 구현 | 유지 |
| LAND-02 | 씬 | `/heart-island/cleaning` | 일부 구현 | 사이트맵에 route 없는 씬이므로 온보딩 내부 route로 유지 |
| LAND-03 | `/island/full-map?tour` | `/island/full-map` + query 처리 | 구현 | query 규칙 유지 |
| LAND-04 | `/heart-island/naming` | `/heart-island/naming` | 구현 | 유지 |

## 마이섬과 15구역

| 사이트맵 ID | 사이트맵 route | 현재 구현 | 분류 | 다음 행동 |
|---|---|---|---|---|
| ISLAND-HUB | `/island` | `/island` | 구현 | 유지 |
| FULL-MAP | `/island/full-map` | `/island/full-map` | 구현 | 유지 |
| AREA-01 | `/island/area/01` | `IslandAreaPlaceholderScene` | placeholder 구현 | 전용 화면 전까지 placeholder 유지 |
| AREA-02 | `/island/area/02` | `/island/harbor` redirect | 구현 | 화면은 HarborScene 유지 |
| AREA-03 | `/island/area/03` | `/island/memory` redirect | 일부 구현 | zone-memory compat 화면 유지 |
| AREA-04 | `/island/area/04` | `IslandAreaPlaceholderScene` | placeholder 구현 | 전용 화면 전까지 placeholder 유지 |
| AREA-05 | `/island/area/05` | `IslandAreaPlaceholderScene` | placeholder 구현 | 자신감 폭포 전용 화면 전까지 placeholder 유지 |
| AREA-06 | `/island/area/06` | `/island/oasis` redirect | 일부 구현 | zone-oasis compat 화면 유지 |
| AREA-07 | `/island/area/07` | `IslandAreaPlaceholderScene` | placeholder 구현 | 전용 화면 전까지 placeholder 유지 |
| AREA-08 | `/island/area/08` | `IslandAreaPlaceholderScene` | placeholder 구현 | 전용 화면 전까지 placeholder 유지 |
| AREA-09 | `/island/area/09` | `IslandAreaPlaceholderScene` | placeholder 구현 | 데뷔 무대 게이트 전까지 placeholder 유지 |
| AREA-10 | `/island/area/10` | `IslandAreaPlaceholderScene` | placeholder 구현 | 소셜 후보지만 15구역 주소는 placeholder로 받음 |
| AREA-11 | `/island/area/11` | `IslandAreaPlaceholderScene` | placeholder 구현 | 전용 화면 전까지 placeholder 유지 |
| AREA-12 | `/island/area/12` | `/island/mine` redirect | 일부 구현 | mine compat 화면은 AREA-12 도전의 절벽에 연결 |
| AREA-13 | `/island/area/13` | `/island/lodge` redirect | 구현 | 화면은 LodgeScene 유지 |
| AREA-14 | `/island/area/14` | `/island/garden` redirect | 일부 구현 | zone-garden compat 화면 유지 |
| AREA-15 | `/island/area/15` | `IslandAreaPlaceholderScene` | placeholder 구현 | 전용 화면 전까지 placeholder 유지 |

## 숙소와 마이룸

| 사이트맵 ID | 사이트맵 route | 현재 구현 | 분류 | 다음 행동 |
|---|---|---|---|---|
| SOOKSO | `/island/lodge` | `/island/lodge` | 구현 | 유지 |
| SOOKSO-ROOM | `/island/lodge/room` | 없음 | placeholder 필요 | M04 placeholder route 추가 |
| SOOKSO-YARD | `/island/lodge/yard` | 없음 | placeholder 필요 | M04 placeholder route 추가 |
| SOOKSO-DECO | `/island/lodge/deco` | 없음 | placeholder 필요 | M12 꾸미기와 문구 분리 |
| SOOKSO-TRAIN | `/island/lodge/train` | 없음 | placeholder 필요 | M08 연습실 placeholder |
| SOOKSO-DEBUT | `/island/lodge/debut` | 없음 | placeholder 필요 | 데뷔 회의실 placeholder |
| MYROOM-HOME | `/island/lodge/myroom` | 없음 | placeholder 필요 | M21 shell 우선 생성 |
| MYROOM-INFO | `/island/lodge/myroom/info` | 없음 | placeholder 필요 | M21 shell |
| MYROOM-AIDONG-LIST | `/island/lodge/myroom/aidong` | 없음 | placeholder 필요 | M21 shell |
| MYROOM-AIDONG-SHEET | `/island/lodge/myroom/aidong/:id` | 없음 | placeholder 필요 | M21 shell |
| MYROOM-AIDONG-EXT | `/island/lodge/myroom/aidong/:id/ext` | 없음 | placeholder 필요 | M21 shell 또는 보류 |
| MYROOM-CODEX | `/island/lodge/myroom/codex` | `/codex` | 일부 구현 | `/codex`는 redirect/legacy, 신규 위치로 이관 |
| MYROOM-COLLECT | `/island/lodge/myroom/collection` | 없음 | placeholder 필요 | M21/M09 shell |
| PHOTOCARD-GEN | `/island/lodge/myroom/collection/photocard/new` | 없음 | placeholder 필요 | M11 placeholder |
| PHOTOCARD-GALLERY | `/island/lodge/myroom/collection/photocard` | 없음 | placeholder 필요 | M11 placeholder |
| MYROOM-LEDGER | `/island/lodge/myroom/ledger` | 없음 | placeholder 필요 | M17 가계부 placeholder |

## 항해, 아이동섬, 무대, 백과

| 사이트맵 ID | 사이트맵 route | 현재 구현 | 분류 | 다음 행동 |
|---|---|---|---|---|
| BOARD | `/voyage/board` | `/voyage/board` | 구현 | 유지 |
| ISLE | `/voyage/island/:id` | `/voyage/island/:id` | 일부 구현 | M22 상륙 전 칸 도착점으로 역할 재정의 |
| RECRUIT | `/voyage/island/:id/landing` | `/voyage/island/:id/landing` | 일부 구현 | M06 영입/편입 분리 반영 필요 |
| iDONGisland_000 | `/voyage/island/:id/land` | 없음 | placeholder 필요 | M22 shell route 추가 |
| iDONGisland_000_기타 | `/voyage/island/:id/sub` | 없음 | placeholder 필요 | M22 shell route 추가 |
| destination-shell-island | `/voyage/island/shell` | 모듈 route 존재 | 폐기 후보 | 삭제 금지. compat/dev 또는 이벤트 섬으로 숨김 |
| STAGE-MAIN | `/stage` | 없음. 기존 `/debut/:id` | placeholder 필요 | `/stage` 대표 무대 placeholder 생성 |
| DEBUT-SHOW | `/stage/debut/:id` | `/debut/:id` | 일부 구현 | `/stage/debut/:id`로 이관, `/debut/:id`는 redirect 후보 |
| ENCY-AIDONG | `/encyclopedia/aidong/:id` | 없음 | placeholder 필요 | 읽기전용 정적 페이지 shell |
| ENCY-ISLAND | `/encyclopedia/island` | 없음 | 보류 | M22 이후 |

## 액티비티

| 사이트맵 ID | 사이트맵 route | 현재 구현 | 분류 | 다음 행동 |
|---|---|---|---|---|
| Activity_Main_01 | `/activity/main/01` | 없음 | placeholder 필요 | 케어 action shell과 연결 |
| Activity_Main_02 | `/activity/main/02` | 없음 | placeholder 필요 | 케어 action shell과 연결 |
| Activity_Main_03 | `/activity/main/03` | 없음 | placeholder 필요 | 케어 action shell과 연결 |
| Activity_Main_04 | `/activity/main/04` | 없음 | placeholder 필요 | 케어 action shell과 연결 |
| Activity_Main_05 | `/activity/main/05` | 없음 | placeholder 필요 | 재우기/꿈일기 placeholder |
| Activity_Sub_01~05 | `/activity/sub/01~05` | 없음 | 보류 | 6월 core loop 밖. 필요 시 placeholder만 |

## 상시 기능, BM, 소셜

| 사이트맵 ID | 사이트맵 route | 현재 구현 | 분류 | 다음 행동 |
|---|---|---|---|---|
| SHOP | `/shop` | 없음. BottomNav에 `/shop` 있음 | placeholder 필요 | route placeholder 추가 또는 메뉴 숨김 |
| ATTEND | `/attendance` | 없음 | placeholder 필요 | 데일리 shell 후보 |
| ROULETTE | `/roulette` | 없음 | placeholder 필요 | 데일리 shell 후보 |
| EVENT-MAIN | `/event` | 없음 | 보류 | 메뉴 노출 보류 |
| EVENT-SEASON | `/event/season` | 없음 | 보류 | Phase2 |
| ADWALL | `/adwall` | 없음 | 보류 | Phase 후속 |
| SOCIAL | `/social` | 없음 | 보류 | Phase 후속 |
| FANDOM | `/fandom` | 없음 | 보류 | Phase 후속 |
| UGC | `/ugc` | 없음 | 보류 | Phase 후속 |

## 결정된 route 방침

### `/island/area/*`와 기존 zone route

- AREA route를 6/11 사이트맵의 정식 route로 본다.
- 기존 `/island/garden`, `/island/oasis`, `/island/memory`, `/island/mine`은 즉시 삭제하지 않는다.
- M1에서 AREA route를 추가했고, 기존 zone route는 redirect/compat로 낮춘다.
- `zone-mine`은 현재 AREA-12 `도전의 절벽`에 연결하고, AREA-05 `자신감 폭포`는 placeholder로 둔다.

### `/codex`와 `/island/lodge/myroom/codex`

- 최신 위치는 `/island/lodge/myroom/codex`다.
- 기존 `/codex`는 하단 메뉴/legacy route로 남아 있으므로 바로 삭제하지 않는다.
- M21 shell 생성 후 `/codex`는 redirect 또는 숨김 후보로 둔다.

### `/stage`와 `/debut/:id`

- 최신 대표 무대 route는 `/stage`다.
- 데뷔 공연 route는 `/stage/debut/:id`다.
- 기존 `/debut/:id`는 redirect 또는 legacy compat 후보로 둔다.

### `/shop`, `/setting`

- BottomNav의 `/setting`은 사이트맵의 `/settings`와 불일치한다.
- `/settings`를 정식 route로 두고 `/setting`은 redirect하거나 BottomNav 경로를 수정한다.
- `/shop`은 BottomNav에 있지만 App route가 없으므로 placeholder route를 만들거나 메뉴를 숨긴다.

## 우선 구현 후보

6월 POC route 정합을 위해 우선순위가 높은 placeholder는 다음이다.

1. `/signup`, `/terms`, `/settings`
2. `/island/area/01`~`/island/area/15`
3. `/island/lodge/room`, `/yard`, `/train`, `/debut`
4. `/island/lodge/myroom` 하위 route
5. `/voyage/island/:id/land`, `/voyage/island/:id/sub`
6. `/stage`, `/stage/debut/:id`
7. `/activity/main/01`~`/activity/main/05`

## 변경 기록

- **2026-06-12**: 6/11 사이트맵 route와 현재 frontend route를 대조해 route별 분류와 다음 행동을 정리했다.
- **2026-06-12**: M1 7번 작업으로 `/island/area/01`~`/island/area/15`를 App route에 반영했다. AREA-02/13은 항구/숙소로 redirect하고, AREA-03/06/12/14는 기존 구현 화면으로 redirect하며, 나머지는 `IslandAreaPlaceholderScene`으로 받는다.
