# 다음 작업 메모 2026-06-12 주간 A

이 문서는 `.cloud/71_roadmap_2026-06_260612.md`의 첫 마일스톤 `M0. SoT 정합과 충돌 지도`를 절반으로 나눈 전반부 실행 보드다.

범위는 2026-06-12~2026-06-13에 처리할 전반부 작업이다. 기존 next_work 파일들은 삭제하지 않고 이력으로 보존한다.

후반부 실행 보드는 `.cloud/77_next_work_2026-06-14_week1_b.md`를 따른다.

## 기준

- 상위 로드맵: `.cloud/71_roadmap_2026-06_260612.md`
- 현행 작업 총목록: `.cloud/70_next_work_2026-06-12.md`
- 기획 SoT 후보: `.cloud/개발기획서260605/사이트맵_260611_최종확정.md`
- 중앙 라우터: `.cloud/개발기획서260605/_직접작성본/00_아이동월드_중앙기획서.md`
- 처리 목록: `.cloud/개발기획서260605/_직접작성본/02_처리목록_총목록.md`

## 이번 보드의 목표

이번 보드는 구현보다 먼저, **기준 문서와 현재 코드가 어디서 어긋나는지 확인하는 작업**에 집중한다.

6/13까지 끝내야 하는 것:

- 중앙기획서가 가리키는 누락 문서 확인.
- 기존 next_work들의 이력 처리.
- 최신 SoT 읽기 순서 확정.
- 사이트맵 route audit 준비.
- backend module 대응표 준비.
- 6/14에 이어서 작성할 충돌 지도 문서의 재료 확보.

## 1. 기존 next_work 이력 처리

- [x] `.cloud/36_next_work_2026-05-24.md` 상단 안내를 확인한다.
- [x] `.cloud/38_next_work_2026-05-29.md` 상단 안내를 추가한다.
- [x] `.cloud/41_next_work_2026-05-29_2.md` 상단 안내를 추가한다.
- [x] `.cloud/42_next_work_2026-06-01.md` 상단 안내를 추가한다.
- [x] `.cloud/43_next_work_2026-06-03.md` 상단 안내를 추가한다.
- [x] `.cloud/49_next_work_2026-06-05_2.md` 상단 안내를 갱신한다.
- [x] `.cloud/51_next_work_2026-06-08.md` 상단 안내를 최신 72번 기준으로 갱신한다.
- [x] `.cloud/70_next_work_2026-06-12.md` 상단에 로드맵 하위 총목록이며 최신 실행 보드는 72번이라는 안내를 추가한다.

처리 결과:

- 기존 next_work는 삭제하지 않고 이력 문서로 보존했다.
- 최신 실행 보드는 `.cloud/72_next_work_2026-06-12_week1_a.md`로 통일했다.
- `.cloud/71_roadmap_2026-06_260612.md`에도 최신 실행 보드 링크를 추가했다.

완료 기준:

- 기존 next_work를 열어도 최신 실행 보드가 무엇인지 바로 보인다.
- 삭제 없이 작업 이력이 보존된다.

## 2. SoT 누락 문서 확인

- [x] `.cloud/개발기획서260605` 아래에서 `09_미결정사항_결정로그.md` 존재 여부를 확인한다.
- [x] `.cloud/개발기획서260605` 아래에서 `00_개발기획서_요약.md` 존재 여부를 확인한다.
- [x] `.cloud/개발기획서260605` 아래에서 `POC_v3_구현범위_재정의_260609.md` 존재 여부를 확인한다.
- [x] `.cloud/개발기획서260605` 아래에서 `검수_일관성_연결_복원_260610.md` 존재 여부를 확인한다.
- [x] 중앙기획서가 가리키는 상대 링크 중 실제 없는 링크를 목록화한다.
- [x] 누락 문서를 새로 만들지, 대체 문서로 링크를 바꿀지 후보를 쓴다.

처리 결과:

- 감사 문서: `.cloud/73_sot_missing_docs_audit_2026-06-12.md`
- `09_미결정사항_결정로그.md`, `00_개발기획서_요약.md`, `POC_v3_구현범위_재정의_260609.md`, `검수_일관성_연결_복원_260610.md`는 현재 `.cloud/개발기획서260605` 아래에 없다.
- `01_구조골격_통합정리.md`, `결정필요_권장안_260609.md`도 중앙기획서 참조 기준으로는 실제 파일이 확인되지 않았다.
- `기획변경회의에따른기획변경가이드.md`는 `.cloud` 바로 아래에 존재하지만, 중앙기획서의 현재 상대 링크와 실제 위치가 맞지 않는다.
- 누락 문서는 즉시 생성하지 않고 복구 후보와 임시 대체 후보를 먼저 기록했다.

완료 기준:

- 중앙기획서가 없는 문서를 SoT처럼 가리키는 문제가 식별된다.

## 3. 최신 기획 읽기 순서 확정

- [x] `.cloud/70_next_work_2026-06-12.md`의 기준 문서 목록을 재검토한다.
- [x] `.cloud/71_roadmap_2026-06_260612.md`에 최신 next_work 72번 링크를 추가한다.
- [x] `.cloud/00_project_overview.md` 또는 `.cloud/20_module_rules.md`에 6/11 사이트맵과 6월 로드맵 링크를 추가할지 결정한다.
- [x] 최신 문서 우선순위를 `사이트맵 260611 → 중앙기획서 → 처리목록 → 모듈상세 → 과거 next_work`로 고정한다.

처리 결과:

- `.cloud/00_project_overview.md`에 `Current SoT Reading Order 2026-06-12`를 추가했다.
- `.cloud/20_module_rules.md`에 신규 모듈 작업용 최신 SoT 읽기 순서를 추가했다.
- 6/12 이후 읽기 순서는 `사이트맵 260611 → 중앙기획서 → 처리목록 → 모듈상세 → 6월 로드맵 → 최신 실행 보드 → 과거 next_work`로 고정했다.
- 과거 next_work는 신규 구현 기준이 아니라 작업 이력으로만 읽도록 명시했다.
- 누락 문서와 링크 보정 후보는 `.cloud/73_sot_missing_docs_audit_2026-06-12.md`를 기준으로 삼는다.

완료 기준:

- 새 작업자는 6/8 문서와 6/11 문서의 우선순위를 헷갈리지 않는다.

## 4. 사이트맵 route audit 준비

- [x] `사이트맵_260611_최종확정.md`의 route 목록을 추출한다.
- [x] frontend route registry 위치를 확인한다.
- [x] 현재 구현 route 목록을 추출한다.
- [x] route 상태 분류 기준을 정한다: `구현`, `일부 구현`, `placeholder 필요`, `보류`, `폐기 후보`.
- [x] 6/14 작업에서 route audit 표로 옮길 수 있게 raw 목록을 정리한다.

처리 결과:

- 준비 문서: `.cloud/74_site_route_audit_prep_2026-06-12.md`
- 사이트맵 route 원자료, `App.tsx` 수동 route, `moduleRoutes.tsx` 기반 모듈 route 목록을 분리해서 기록했다.
- route 상태 분류 기준을 `구현`, `일부 구현`, `placeholder 필요`, `보류`, `폐기 후보`로 고정했다.
- 1차 충돌 후보로 `/island/area/*`와 기존 `/island/garden`류 route, `/island/area/02`와 `/island/harbor`, `/stage`와 `/debut/:id`, `/codex`와 `/island/lodge/myroom/codex`, `/shop`/`/setting` 미구현 등을 기록했다.

완료 기준:

- 사이트맵과 실제 frontend route를 대조할 준비가 끝난다.

## 5. backend module 대응표 준비

- [x] 현재 backend module route 목록을 추출한다.
- [x] 현재 backend dedicated model 목록을 추출한다.
- [x] M03~M09, M21, M22와 현재 backend module을 1차 대응시킨다.
- [x] M21, M22에 전용 backend model/route가 필요한지 후보를 적는다.
- [x] 기존 `destination-shell-island`가 M22와 충돌하는 지점을 적는다.

처리 결과:

- 준비 문서: `.cloud/75_backend_module_mapping_prep_2026-06-12.md`
- 현재 backend module action route와 dedicated model/repository ownership을 정리했다.
- M03~M09, M21, M22를 현재 backend module에 1차 대응시켰다.
- M21은 초기에는 aggregation route 후보, M22는 신규 module route/model 후보로 분류했다.
- `destination-shell-island`는 M22 정식 아이동섬이 아니라 POC/compat 또는 이벤트 섬 후보로 낮추는 방향을 기록했다.

완료 기준:

- 6/14에 backend 충돌 지도 문서를 작성할 재료가 생긴다.

## 6. 고정 15구역 슬롯 전환 사전 조사

- [x] 현재 `dynamicAidongZones` 구현 파일 목록을 확인한다.
- [x] 현재 `ZONES` 또는 15구역 static data 위치를 확인한다.
- [x] `AREA-01~15`와 현재 zone id의 불일치를 기록한다.
- [x] `AREA-02`, `AREA-13` anchor 잠금 처리가 가능한 위치를 찾는다.
- [x] 기존 `IslandFullMapScreen`의 Aidong 전용 구역 관리 section을 어디서 바꿀지 표시한다.

처리 결과:

- 준비 문서: `.cloud/76_fixed_15_area_slot_prep_2026-06-12.md`
- `dynamicAidongZones` 사용처를 frontend store/facade/API/sync/full map과 backend model/service/route/repository 기준으로 정리했다.
- 현재 `packages/frontend/src/data/zones.ts`의 15구역이 최신 6/11 사이트맵의 AREA-01~15와 번호·명칭·역할이 다르다는 점을 기록했다.
- AREA-02 항구, AREA-13 숙소는 static data, backend validation, frontend full map, route alias/redirect에서 anchor 잠금 처리 후보로 잡았다.
- `IslandFullMapScreen`의 아래쪽 `Aidong 전용 구역 관리` section은 향후 `13 편입 슬롯 관리`로 흡수하거나 AREA 카드 내부 표시로 바꾸는 후보로 표시했다.

완료 기준:

- M1에서 바로 고정 15구역 슬롯 모델 작업에 들어갈 수 있다.

## 7. 6/14 후반부 작업 보드 초안 작성

- [x] 6/14용 `next_work` 후보 항목을 적는다.
- [x] 후반부 핵심을 `충돌 지도 작성`, `누락 문서 복구`, `route audit 표 작성`, `backend 대응표 작성`으로 잡는다.
- [x] 이번 보드에서 못 끝낸 항목은 후반부로 넘긴다.

처리 결과:

- 후반부 실행 보드: `.cloud/77_next_work_2026-06-14_week1_b.md`
- 후반부 핵심은 `누락 SoT 복구/대체 결정`, `중앙기획서 링크 보정`, `frontend route audit 표`, `backend module 충돌 지도`, `고정 15구역 슬롯 전환 결정`, `규칙 문서 갱신`, `M1 시작 보드 작성`으로 잡았다.
- 72번 보드의 미완료 구현 항목은 없고, 후반부에는 73~76번 준비 문서를 실제 결정/표 문서로 굳히는 작업을 넘겼다.

완료 기준:

- 이번 주 후반부 작업이 끊기지 않는다.

## 검증

- [x] 수정한 한글 문서에서 깨짐 문자를 검사한다.
- [x] 문서 링크가 상대 경로로 읽기 가능한지 확인한다.

## 변경 기록

- **2026-06-12**: 6월 로드맵의 첫 마일스톤 M0를 절반으로 나누어 6/12~6/13 실행 보드를 작성했다. 기존 next_work 파일들은 삭제하지 않고 이력으로 보존하며, 최신 실행 보드는 본 문서로 전환한다.
- **2026-06-12**: 2번 SoT 누락 문서 확인을 완료하고 `.cloud/73_sot_missing_docs_audit_2026-06-12.md`에 누락 문서, 링크 보정 후보, 임시 대체 후보를 정리했다.
- **2026-06-12**: 3번 최신 기획 읽기 순서를 완료했다. `.cloud/00_project_overview.md`와 `.cloud/20_module_rules.md`에 6/11 사이트맵, 중앙기획서, 처리목록, 모듈상세, 6월 로드맵, 72번 실행 보드 순서를 반영했다.
- **2026-06-12**: 4번 사이트맵 route audit 준비를 완료했다. `.cloud/74_site_route_audit_prep_2026-06-12.md`에 사이트맵 route, 현재 frontend route, 모듈 route, 분류 기준, 1차 충돌 후보를 정리했다.
- **2026-06-12**: 5번 backend module 대응표 준비를 완료했다. `.cloud/75_backend_module_mapping_prep_2026-06-12.md`에 backend route/model/repository 원자료와 M03~M09, M21, M22 대응 후보를 정리했다.
- **2026-06-12**: 6번 고정 15구역 슬롯 전환 사전 조사를 완료했다. `.cloud/76_fixed_15_area_slot_prep_2026-06-12.md`에 dynamicAidongZones 사용처, 현재 ZONES 불일치, AREA anchor 잠금 후보, full map 전환 지점을 정리했다.
- **2026-06-12**: 7번 후반부 작업 보드 초안을 완료했다. `.cloud/77_next_work_2026-06-14_week1_b.md`를 만들고, 72번 전반부 보드에서 만든 73~76번 산출물을 6/14 작업으로 이어지게 정리했다.
