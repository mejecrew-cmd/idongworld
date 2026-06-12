# 다음 작업 메모 2026-06-14 주간 B

이 문서는 `.cloud/71_roadmap_2026-06_260612.md`의 첫 마일스톤 `M0. SoT 정합과 충돌 지도` 후반부 실행 보드다.

전반부 보드는 `.cloud/72_next_work_2026-06-12_week1_a.md`이며, 72번에서 만든 준비 문서 4개를 바탕으로 이번 보드에서 실제 표, 결정, 링크 보정을 닫는다.

## 기준

- 상위 로드맵: `.cloud/71_roadmap_2026-06_260612.md`
- 전반부 실행 보드: `.cloud/72_next_work_2026-06-12_week1_a.md`
- SoT 누락 감사: `.cloud/73_sot_missing_docs_audit_2026-06-12.md`
- route audit 준비: `.cloud/74_site_route_audit_prep_2026-06-12.md`
- backend 대응 준비: `.cloud/75_backend_module_mapping_prep_2026-06-12.md`
- 고정 15구역 전환 준비: `.cloud/76_fixed_15_area_slot_prep_2026-06-12.md`
- 사이트맵 SoT: `.cloud/개발기획서260605/사이트맵_260611_최종확정.md`
- 중앙기획서: `.cloud/개발기획서260605/_직접작성본/00_아이동월드_중앙기획서.md`

## 이번 보드의 목표

이번 보드는 6월 로드맵의 M0를 닫는 작업이다.

목표는 다음 네 가지다.

- 누락 SoT 문서를 방치하지 않도록 복구 또는 대체 방침을 정한다.
- 6/11 사이트맵과 현재 frontend route의 충돌 지도를 만든다.
- M03~M09, M21, M22와 현재 backend module의 충돌 지도를 만든다.
- M1의 15구역 슬롯 전환 작업에 들어갈 수 있도록 결정 문서를 남긴다.

## 1. 전반부 산출물 인계 확인

- [x] `.cloud/73_sot_missing_docs_audit_2026-06-12.md`를 읽고 누락 SoT 목록을 확인한다.
- [x] `.cloud/74_site_route_audit_prep_2026-06-12.md`를 읽고 route raw 목록을 확인한다.
- [x] `.cloud/75_backend_module_mapping_prep_2026-06-12.md`를 읽고 backend module 대응 후보를 확인한다.
- [x] `.cloud/76_fixed_15_area_slot_prep_2026-06-12.md`를 읽고 고정 15구역 전환 후보를 확인한다.
- [x] 72번 보드에서 미완료로 넘긴 항목이 있는지 확인한다.

처리 결과:

- 73번은 누락 SoT와 링크 보정 후보를 담는다. 핵심은 `09_미결정사항_결정로그.md`, `00_개발기획서_요약.md`, `POC_v3_구현범위_재정의_260609.md`, `검수_일관성_연결_복원_260610.md`의 복구 또는 대체 결정이다.
- 74번은 사이트맵 route raw 목록과 현재 frontend route 목록을 담는다. 핵심은 4번에서 실제 audit 표로 옮기는 것이다.
- 75번은 backend route/model/repository 원자료와 M03~M09, M21, M22 대응 후보를 담는다. 핵심은 5번에서 충돌 지도 문서로 굳히는 것이다.
- 76번은 `dynamicAidongZones`, 기존 `ZONES`, AREA-01~15 불일치, anchor 잠금 후보를 담는다. 핵심은 6번에서 15구역 슬롯 전환 결정을 내리는 것이다.
- 72번 보드에는 미완료 체크 항목이 없다. 후반부로 넘어온 것은 미완료 작업이 아니라 73~76번 준비 문서를 실제 결정/표 문서로 확정하는 작업이다.

완료 기준:

- 6/14 작업자가 72번 산출물의 위치와 역할을 바로 이해한다.

## 2. 누락 SoT 문서 복구 또는 대체 결정

- [x] `09_미결정사항_결정로그.md`를 새로 만들지, 다른 문서로 대체할지 결정한다.
- [x] `00_개발기획서_요약.md`를 새로 만들지 결정한다.
- [x] `POC_v3_구현범위_재정의_260609.md`를 6월 로드맵으로 대체할지 결정한다.
- [x] `검수_일관성_연결_복원_260610.md`를 새 충돌 지도 문서로 대체할지 결정한다.
- [x] `01_구조골격_통합정리.md`, `결정필요_권장안_260609.md` 링크를 유지할지 제거할지 결정한다.

처리 결과:

- 결정 문서: `.cloud/78_sot_recovery_decision_2026-06-12.md`
- `09_미결정사항_결정로그.md`와 `00_개발기획서_요약.md`는 새로 만든다.
- `POC_v3_구현범위_재정의_260609.md`는 새로 만들지 않고 `.cloud/71_roadmap_2026-06_260612.md`로 대체한다.
- `검수_일관성_연결_복원_260610.md`는 과거 이름으로 복구하지 않고 6/14 충돌 지도 문서로 대체한다.
- `01_구조골격_통합정리.md`는 제거 또는 요약 문서 흡수 대상으로 둔다.
- `결정필요_권장안_260609.md`는 별도 파일로 만들지 않고 09 결정로그로 흡수한다.

완료 기준:

- 중앙기획서가 없는 문서를 최상위 기준처럼 가리키는 상태를 방치하지 않는다.

## 3. 중앙기획서 링크 보정

- [x] `기획변경회의에따른기획변경가이드.md` 상대 링크를 실제 위치에 맞게 보정한다.
- [x] 복구하지 않기로 한 누락 문서는 중앙기획서에서 대체 문서로 링크를 바꾼다.
- [x] 복구하기로 한 누락 문서는 최소 placeholder라도 만든 뒤 중앙기획서 링크를 유지한다.
- [x] 링크 보정 뒤 한글 깨짐과 상대 경로 읽기 가능 여부를 확인한다.

처리 결과:

- `.cloud/개발기획서260605/09_미결정사항_결정로그.md` placeholder를 생성했다.
- `.cloud/개발기획서260605/00_개발기획서_요약.md` placeholder를 생성했다.
- `.cloud/79_plan_code_conflict_map_2026-06-14.md` placeholder를 생성했다.
- 중앙기획서의 POC v3 링크는 `.cloud/71_roadmap_2026-06_260612.md`로 대체했다.
- 중앙기획서의 6/10 검수 링크는 `.cloud/79_plan_code_conflict_map_2026-06-14.md`로 대체했다.
- 중앙기획서의 `기획변경회의에따른기획변경가이드.md` 링크는 실제 위치에 맞게 보정했다.
- `01_구조골격_통합정리.md` 링크는 제거하고 00 요약으로 흡수했다.
- `결정필요_권장안_260609.md` 링크는 별도 문서 대신 09 결정로그 흡수로 정리했다.

완료 기준:

- 중앙기획서의 주요 링크가 실제 파일로 연결된다.

## 4. frontend route audit 표 작성

- [x] `.cloud/74_site_route_audit_prep_2026-06-12.md`의 raw 목록을 audit 표로 옮긴다.
- [x] 각 사이트맵 route에 `구현`, `일부 구현`, `placeholder 필요`, `보류`, `폐기 후보`를 붙인다.
- [x] route가 다른데 의미상 같은 화면은 `alias`, `redirect`, `흡수`, `숨김` 중 하나로 분류한다.
- [x] `/island/area/*`와 기존 `/island/garden`류 route의 대응 방침을 정한다.
- [x] `/codex`와 `/island/lodge/myroom/codex`의 이관 방침을 정한다.
- [x] `/stage`와 기존 `/debut/:id`의 대응 방침을 정한다.
- [x] `/shop`, `/setting`처럼 메뉴에는 있으나 route가 없는 항목을 placeholder 후보로 표시한다.

처리 결과:

- route audit 문서: `.cloud/80_frontend_route_audit_2026-06-14.md`
- 충돌 지도 문서 `.cloud/79_plan_code_conflict_map_2026-06-14.md`에 frontend route audit 요약을 연결했다.
- `/island/area/*`를 최신 정식 route로 보고 기존 `/island/garden`류 route는 alias/redirect/compat 후보로 낮추는 방침을 잡았다.
- `/codex`는 M21의 `/island/lodge/myroom/codex`로 이관하고, 기존 route는 redirect 또는 숨김 후보로 둔다.
- `/stage`, `/stage/debut/:id`를 정식 route로 두고 `/debut/:id`는 legacy redirect 후보로 둔다.
- `/settings`를 정식 route로 두고 BottomNav의 `/setting`은 수정 또는 redirect 후보로 둔다.
- `/shop`은 placeholder route를 만들거나 메뉴 숨김 후보로 표시했다.

완료 기준:

- 사이트맵 route별 다음 행동이 `구현 유지`, `placeholder 생성`, `이관`, `보류`, `폐기 후보` 중 하나로 보인다.

## 5. backend module 충돌 지도 작성

- [x] `.cloud/75_backend_module_mapping_prep_2026-06-12.md`의 대응표를 충돌 지도 문서로 옮긴다.
- [x] M03 `my-island`와 `dynamicAidongZones` 충돌을 정리한다.
- [x] M06 영입/편입 분리와 `route-neighbor/encounter/accept` 충돌을 정리한다.
- [x] M07 4파라미터 케어와 기존 `care`/`needs` 구조 충돌을 정리한다.
- [x] M09 도감 25칸 원장과 기존 `codex`/`my-aidong.aidongCodexItems`의 책임을 정리한다.
- [x] M21은 aggregation route 우선인지 전용 model 우선인지 결정한다.
- [x] M22는 신규 module route/model로 갈지 확정 후보를 남긴다.
- [x] `destination-shell-island`는 compat/dev 또는 이벤트 섬 후보로 낮추는 방침을 문서화한다.

처리 결과:

- backend module 충돌 지도 문서: `.cloud/81_backend_module_conflict_map_2026-06-14.md`
- 종합 충돌 지도 `.cloud/79_plan_code_conflict_map_2026-06-14.md`에 backend module 충돌 지도 요약과 링크를 추가했다.
- M03/M06은 `my-island`를 유지하되 `dynamicAidongZones`를 최종 모델이 아니라 migration/compat 입력으로 낮추고, 고정 15구역 슬롯 원장을 새로 두는 방향으로 정리했다.
- M06은 영입은 `my-aidong`, 편입은 `my-island`로 책임을 나누는 방향으로 정리했다.
- M07은 Aidong 케어 수치 권위를 `my-aidong.needs`에 두고 `care` route는 호환 또는 facade로 낮추는 방향으로 정리했다.
- M09는 Aidong별 25칸 도감 아이템 원장을 `my-aidong.aidongCodexItems` 쪽에 두고, `codexStates`는 기존 일기/해금/완전 등록 호환 저장소로 유지하는 방향으로 정리했다.
- M21은 전용 model보다 aggregation route를 우선하고, 정렬/pin/표시 옵션 같은 쓰기 상태가 생길 때 `myRoomStates`를 추가하는 방향으로 정리했다.
- M22는 신규 `aidong-island` module과 `aidongIslandStates` 후보를 우선하고, `destination-shell-island`는 POC/compat/dev 또는 이벤트 섬 후보로 낮추는 방향으로 정리했다.

완료 기준:

- M1~M2 구현 전에 backend에서 무엇을 고쳐야 하는지 보인다.

## 6. 고정 15구역 슬롯 전환 결정 문서 작성

- [x] `packages/frontend/src/data/zones.ts`를 직접 교체할지, 새 `areaSlots` data를 만들지 결정한다.
- [x] AREA-01~15 static definition의 필드 후보를 확정한다.
- [x] AREA-02 항구, AREA-13 숙소 anchor 잠금 정책을 확정한다.
- [x] `dynamicAidongZones`를 즉시 제거하지 않고 migration/compat로 낮출지 결정한다.
- [x] 신규 저장 필드를 `zoneSlots`로 할지 `areaSlots`로 할지 결정한다.
- [x] `IslandFullMapScreen`의 `Aidong 전용 구역 관리` section 처리 방침을 확정한다.

처리 결과:

- 고정 15구역 슬롯 전환 결정 문서: `.cloud/82_fixed_15_area_slot_decision_2026-06-14.md`
- `packages/frontend/src/data/zones.ts`는 새 파일을 만들기보다 최신 AREA-01~15 SoT로 직접 교체하는 방향으로 결정했다.
- `Zone` 타입에는 `areaNo`, `kind`, `legacyRoute`, `lockedReason`를 추가하는 방향으로 정했다.
- backend 신규 저장 필드는 `zoneSlots`로 결정했다. key는 `AREA-01` 같은 `areaNo`를 우선하고, 내부에 `areaId`, `kind`, `occupantAidongId`, `state`, `source`, `incorporatedAt`를 둔다.
- AREA-02 항구와 AREA-13 숙소는 anchor slot으로 잠그고 Aidong 편입 대상에서 제외하기로 했다.
- `dynamicAidongZones`는 즉시 삭제하지 않고 migration/compat 입력으로 낮춘다.
- `IslandFullMapScreen`의 기존 `Aidong 전용 구역 관리` section은 별도 dynamic list가 아니라 13개 fillable slot 관리 UI로 흡수하는 방향으로 결정했다.

완료 기준:

- M1에서 바로 15구역 슬롯 model과 화면 작업을 시작할 수 있다.

## 7. 규칙 문서 갱신

- [ ] `.cloud/20_module_rules.md`에 M21/M22 신규 모듈 경계와 15구역 슬롯 기준을 추가한다.
- [ ] `.cloud/30_backend_db_rules.md`에 `my-island` slot model과 M22 신규 storage 후보를 추가한다.
- [ ] `.cloud/40_frontend_rules.md`에 사이트맵 route audit과 placeholder/alias/redirect 규칙을 추가한다.
- [ ] 필요한 경우 `packages/modules/BACKEND_GUIDE.md`에 M21/M22 backend 작성 기준을 추가한다.

완료 기준:

- 6/15 이후 구현자가 최신 충돌 지도와 규칙을 함께 볼 수 있다.

## 8. M1 시작 보드 작성

- [x] 6/15~6/18용 next_work를 만든다.
- [x] 핵심을 `15구역 static data`, `myIslandStates slot model`, `IslandFullMapScreen 전환`, `slot incorporate/release API`로 잡는다.
- [x] M0에서 아직 못 닫은 문서 작업이 있으면 M1 보드 상단에 위험 항목으로 남긴다.

처리 결과:

- M1 시작 보드: `.cloud/83_next_work_2026-06-15_m1.md`
- M1 작업 순서는 `AREA-01~15 static data 전환`, `zoneSlots model/default/spec 추가`, `slot service/API 구현`, `frontend API/store 연결`, `IslandFullMapScreen 전환`, `route alias 점검`, `테스트와 smoke 보강`, `문서 정리`로 나눴다.
- 7번 `규칙 문서 갱신`이 아직 미완료이므로 M1 보드 상단의 `M0 잔여 위험`에 명시했다.

완료 기준:

- M0가 문서 정합 단계로 닫히고, M1 구현 단계로 자연스럽게 넘어간다.

## 검증

- [ ] 수정한 한글 문서에서 깨짐 문자를 검사한다.
- [ ] 주요 상대 링크가 실제 파일로 열리는지 확인한다.
- [ ] 신규 결정 문서가 최신 SoT 읽기 순서와 충돌하지 않는지 확인한다.

## 변경 기록

- **2026-06-12**: 72번 전반부 보드의 산출물 73~76번 문서를 바탕으로 6/14 후반부 실행 보드 초안을 작성했다. 핵심은 누락 SoT 복구/대체 결정, route audit 표, backend 충돌 지도, 고정 15구역 슬롯 전환 결정이다.
- **2026-06-12**: 1번 전반부 산출물 인계 확인을 완료했다. 73~76번 문서의 역할을 요약하고, 72번 보드에는 미완료 체크 항목이 없음을 확인했다.
- **2026-06-12**: 2번 누락 SoT 문서 복구 또는 대체 결정을 완료했다. `.cloud/78_sot_recovery_decision_2026-06-12.md`에 09 결정로그와 00 요약은 신규 작성, POC v3는 6월 로드맵 대체, 6/10 검수는 6/14 충돌 지도 대체로 확정했다.
- **2026-06-12**: 3번 중앙기획서 링크 보정을 완료했다. 09 결정로그, 00 요약, 79 충돌 지도 placeholder를 생성하고 중앙기획서의 POC v3, 6/10 검수, 기획변경가이드, 구조골격, 결정필요 링크를 최신 방침에 맞게 정리했다.
- **2026-06-12**: 4번 frontend route audit 표 작성을 완료했다. `.cloud/80_frontend_route_audit_2026-06-14.md`에 사이트맵 route별 구현 상태와 다음 행동을 정리하고, 79번 충돌 지도에 핵심 route 충돌을 연결했다.
- **2026-06-12**: 5번 backend module 충돌 지도 작성을 완료했다. `.cloud/81_backend_module_conflict_map_2026-06-14.md`에 M03~M09, M21, M22와 현재 backend module의 충돌, 결정 방향, M1 이후 구현 우선순위를 정리하고 79번 충돌 지도에 연결했다.
- **2026-06-12**: 6번 고정 15구역 슬롯 전환 결정을 완료했다. `.cloud/82_fixed_15_area_slot_decision_2026-06-14.md`에 `zones.ts` 직접 교체, `zoneSlots` 저장 필드, AREA-02/13 anchor 잠금, `dynamicAidongZones` compat 유지, `IslandFullMapScreen` 13 slot UI 흡수 방침을 정리했다.
- **2026-06-12**: 8번 M1 시작 보드 작성을 완료했다. `.cloud/83_next_work_2026-06-15_m1.md`에 6/15~6/18 마이섬 15구역 슬롯 전환 구현 순서를 만들고, 7번 규칙 문서 갱신 미완료를 M0 잔여 위험으로 남겼다.
- **2026-06-12**: M1 구현 보드 83번의 9번 문서 정리에서 확인했다. 7번 규칙 문서 갱신은 아직 완료하지 않고, M1 구현 결과를 바탕으로 M2/M5 전 별도 문서 debt로 유지한다.
