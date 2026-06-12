# 기획-코드 충돌 지도 2026-06-14

이 문서는 6/11 사이트맵과 현재 코드의 route/backend/module 상태를 대조하는 충돌 지도 문서다.

현재 문서는 `.cloud/77_next_work_2026-06-14_week1_b.md`의 3번 작업에서 중앙기획서 링크 보정을 위해 먼저 만든 placeholder다.

실제 내용은 77번 보드의 4번 `frontend route audit 표 작성`과 5번 `backend module 충돌 지도 작성`에서 채운다.

## Frontend Route Audit

frontend route audit 결과는 `.cloud/80_frontend_route_audit_2026-06-14.md`를 따른다.

핵심 충돌은 다음이다.

- `/island/area/*`가 최신 사이트맵의 정식 route지만 현재 구현은 `/island/garden`, `/island/oasis`, `/island/memory`, `/island/mine` 같은 의미 기반 route를 사용한다.
- `/island/area/02` 항구는 현재 `/island/harbor`로 구현되어 있다.
- `/island/area/13` 숙소는 현재 `/island/lodge`로 구현되어 있다.
- M21 마이룸 route는 대부분 없다.
- `/codex`는 구현되어 있지만 최신 위치는 `/island/lodge/myroom/codex`다.
- `/stage`, `/stage/debut/:id`는 없고 기존 구현은 `/debut/:id`다.
- M22의 `/voyage/island/:id/land`, `/voyage/island/:id/sub`는 없다.
- `/shop`, `/setting`은 메뉴와 사이트맵 또는 App route가 어긋난다.

## Backend Module Conflict Map

backend module 충돌 지도 결과는 `.cloud/81_backend_module_conflict_map_2026-06-14.md`를 따른다.

핵심 충돌은 다음이다.

- M03 마이섬 허브는 고정 AREA-01~15 슬롯 기획을 요구하지만 현재 `my-island`는 `dynamicAidongZones` 중심이다.
- M06 구역 편입은 영입과 편입을 분리해야 하지만 현재 `route-neighbor/encounter/accept`와 `my-island.dynamic-zones` 흐름이 섞여 있다.
- M07 케어는 Hunger/Clean/Mood/Energy 4파라미터 중심이어야 하지만 현재 `care` route와 `my-aidong.needs` 책임이 혼재한다.
- M09 도감은 Aidong별 25칸 도감 아이템 원장이 필요하지만 현재 `codexStates`와 `my-aidong.aidongCodexItems`의 책임이 나뉘어 있다.
- M21 마이룸은 전용 backend가 없으므로 초기에는 aggregation route로 시작하고, 전용 설정이 생길 때 `myRoomStates`를 추가한다.
- M22 아이동섬은 `destination-shell-island`로 대체할 수 없으므로 신규 `aidong-island` module과 `aidongIslandStates` 후보가 필요하다.

## 작성 예정 범위

- frontend route audit 표
- backend module 충돌 지도
- `dynamicAidongZones`와 고정 15구역 슬롯 충돌
- M21 마이룸과 기존 codex route 충돌
- M22 아이동섬과 `destination-shell-island` 충돌
- 6/15 M1 구현으로 넘길 결정 목록

## 변경 기록

- **2026-06-12**: 중앙기획서의 과거 `검수_일관성_연결_복원_260610.md` 링크를 대체하기 위한 충돌 지도 placeholder를 생성했다.
- **2026-06-12**: frontend route audit 문서 `.cloud/80_frontend_route_audit_2026-06-14.md`를 연결하고 핵심 route 충돌을 요약했다.
- **2026-06-12**: backend module 충돌 지도 문서 `.cloud/81_backend_module_conflict_map_2026-06-14.md`를 연결하고 M03~M09, M21, M22의 핵심 충돌을 요약했다.
