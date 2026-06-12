# 다음 작업 메모 2026-06-19 M2~M3 예정

이 문서는 `.cloud/71_roadmap_2026-06_260612.md`의 M2, M3 구간을 미리 쪼갠 예정 보드다.

현재 실제 최신 실행 보드는 `.cloud/83_next_work_2026-06-15_m1.md`다. 이 문서는 M1이 완료된 뒤 이어서 사용할 다음 주 후반부 작업 후보이며, M1 결과에 따라 항목과 순서가 조정될 수 있다.

## 기준

- 상위 로드맵: `.cloud/71_roadmap_2026-06_260612.md`
- 직전 예정 실행 보드: `.cloud/83_next_work_2026-06-15_m1.md`
- frontend route audit: `.cloud/80_frontend_route_audit_2026-06-14.md`
- backend module 충돌 지도: `.cloud/81_backend_module_conflict_map_2026-06-14.md`
- 고정 15구역 슬롯 전환 결정: `.cloud/82_fixed_15_area_slot_decision_2026-06-14.md`

## 전제

이 보드는 아래 M1 완료 상태를 전제로 한다.

- 마이섬 AREA-01~15 static data가 최신 기준으로 정렬되어 있다.
- `myIslandStates.zoneSlots`가 존재한다.
- AREA-02 항구와 AREA-13 숙소가 anchor slot으로 잠겨 있다.
- `my-island/slots/incorporate`, `release` 또는 그에 준하는 API가 있다.
- `IslandFullMapScreen`에서 13개 fillable slot 상태를 볼 수 있다.

위 전제가 충족되지 않으면, 이 보드의 1번보다 M1 잔여 작업을 먼저 닫는다.

## 목표

6/19~6/24 구간의 목표는 항해에서 아이동섬을 만나고, 영입하고, 13슬롯에 편입한 뒤, 숙소와 마이룸으로 이어지는 최소 수직 루프를 만드는 것이다.

```text
항구/항해
→ 아이동섬 상륙
→ 아이동 영입
→ 13 편입 슬롯 선택
→ 숙소 케어
→ 마이룸 도감/콜렉션 확인
```

## 1. M1 결과 인계 확인

- [ ] `.cloud/83_next_work_2026-06-15_m1.md`의 완료/미완료 항목을 확인한다.
- [ ] `zoneSlots` 기본값, anchor 잠금, 중복 편입 방지가 동작하는지 확인한다.
- [ ] M1에서 남은 route alias나 placeholder 위험을 이 보드 상단에 옮긴다.
- [ ] M1에서 추가된 changelog와 규칙 문서 갱신 여부를 확인한다.

완료 기준:

- M2 작업자가 15구역 슬롯을 전제로 작업해도 되는지 판단할 수 있다.

## 2. 항해 encounter와 영입 책임 분리

- [ ] `route-neighbor/encounter/accept`가 편입까지 자동 처리하는지 확인한다.
- [ ] encounter accept는 영입 또는 영입 후보 확정까지만 담당하도록 낮춘다.
- [ ] 실제 Aidong 보유 상태 변경은 `my-aidong` module 책임으로 둔다.
- [ ] 슬롯 편입은 `my-island/slots/incorporate`로 분리한다.
- [ ] 기존 compat 흐름이 있다면 임시 유지하되, 신규 수직 루프에서는 사용하지 않는다.

완료 기준:

- 영입과 마이섬 편입이 backend API 책임상 분리된다.

## 3. M22 `aidong-island` module skeleton 작성

- [ ] 신규 module id를 `aidong-island`로 확정한다.
- [ ] backend route 후보를 만든다: `/api/modules/aidong-island/config`, `/land`, `/interact`, `/recruit`, `/leave`.
- [ ] 저장소가 필요하면 `aidongIslandStates` 후보 model을 만든다.
- [ ] 첫 단계에서는 POC용 static island 1개만 둔다.
- [ ] `destination-shell-island`는 삭제하지 않고 POC/compat/dev 또는 이벤트 섬 후보로 유지한다.

완료 기준:

- M22가 `destination-shell-island`에 종속되지 않은 별도 module 경계를 가진다.

## 4. M22 frontend route와 화면 shell 추가

- [ ] `/voyage/island/:id` route를 최신 사이트맵 기준으로 정리한다.
- [ ] `/voyage/island/:id/land` route 또는 landing action 화면을 추가한다.
- [ ] `/voyage/island/:id/sub` placeholder를 추가한다.
- [ ] `/voyage/island/:id/landing` 기존 route와 의미가 겹치면 alias/redirect 정책을 정한다.
- [ ] 첫 Aidong island 화면은 고정맵 POC shell로 만들고, 실제 콘텐츠는 placeholder로 둔다.

완료 기준:

- 항해 중 아이동섬 route로 진입하고, 상륙 화면을 볼 수 있다.

## 5. 영입 시나리오 1컷 placeholder

- [ ] POC용 Aidong 1명을 정한다.
- [ ] 아이동섬에서 만남, 대화, 영입 확인 placeholder를 구성한다.
- [ ] 영입 성공 시 `my-aidong` 보유 목록에 들어가게 한다.
- [ ] 영입 직후 바로 편입하지 않고, 편입 슬롯 선택으로 이어지게 한다.

완료 기준:

- 아이동섬에서 Aidong 1명을 영입하고 보유 목록에서 확인할 수 있다.

## 6. 편입 슬롯 선택 UI 연결

- [ ] 영입 성공 후 비어 있는 fillable slot 목록을 보여준다.
- [ ] AREA-02, AREA-13은 선택 목록에서 제외한다.
- [ ] 이미 occupant가 있는 slot은 선택 불가 또는 교체 후보로 표시한다.
- [ ] 선택 시 `my-island/slots/incorporate`를 호출한다.
- [ ] 편입 완료 후 마이섬으로 돌아가면 해당 slot에 Aidong이 표시된다.

완료 기준:

- 사용자가 영입한 Aidong을 13개 편입 슬롯 중 하나에 넣을 수 있다.

## 7. 숙소 메인 메뉴 재정렬

- [ ] 숙소 메인 메뉴를 방, 마당, 꾸미기, 연습실, 데뷔 회의실, 마이룸 기준으로 다시 묶는다.
- [ ] 마당에는 보유/대기 Aidong을 표시한다.
- [ ] 방은 적극 육성 슬롯으로 표시한다.
- [ ] 항해 중이거나 다른 위치에 있는 Aidong의 케어 가능 여부를 UI에서 구분한다.
- [ ] 기존 lodge 가구/배치 기능은 삭제하지 않고 새 메뉴 구조 안으로 흡수한다.

완료 기준:

- 숙소가 단순 배치 화면이 아니라 육성 허브처럼 보인다.

## 8. 4파라미터 케어 표면 모델 작성

- [ ] `Hunger`, `Clean`, `Mood`, `Energy`의 표시 이름과 범위를 정한다.
- [ ] `my-aidong.needs`와 기존 care route의 책임을 다시 확인한다.
- [ ] `깨우기`, `아침밥`, `점심밥`, `저녁밥`, `재우기` action shell을 만든다.
- [ ] 실제 밸런스 수치는 임시값으로 두되 추후 balance config 후보로 문서화한다.
- [ ] 케어 결과는 backend 권위로 갱신한다.

완료 기준:

- 숙소에서 Aidong 1명에 대해 최소 케어 action을 호출할 수 있다.

## 9. M21 마이룸 route와 aggregation shell

- [ ] frontend route 후보를 추가한다: `/island/lodge/myroom`, `/info`, `/aidong`, `/aidong/:id`, `/codex`, `/collection`, `/ledger`.
- [ ] backend aggregation route 후보를 추가한다: `/api/modules/myroom/summary`, `/aidongs`, `/codex`, `/collection`, `/ledger`.
- [ ] 전용 collection은 만들지 않고, 첫 단계에서는 `account`, `host`, `my-aidong`, `codex`, `lodge`를 읽어 조합한다.
- [ ] 마이룸 전용 정렬, pin, 표시 옵션이 생기면 `myRoomStates` 후보로 문서화한다.

완료 기준:

- 숙소에서 마이룸으로 들어가 유저 정보, Aidong, 도감, 콜렉션 placeholder를 볼 수 있다.

## 10. M2~M3 smoke 추가

- [ ] 항해 보드 진입 smoke를 유지한다.
- [ ] 아이동섬 route 진입 smoke를 추가한다.
- [ ] 영입 후 보유 목록 반영 smoke를 추가한다.
- [ ] 편입 후 `zoneSlots` 반영 smoke를 추가한다.
- [ ] 숙소 케어 action smoke를 추가한다.
- [ ] 마이룸 route smoke를 추가한다.

완료 기준:

- 항해에서 마이룸까지 이어지는 최소 루프가 자동 검증 후보로 잡힌다.

## 11. 문서와 changelog 정리

- [ ] `.cloud/81_backend_module_conflict_map_2026-06-14.md`에서 M22/M21 후보가 실제 구현과 맞는지 갱신한다.
- [ ] `.cloud/80_frontend_route_audit_2026-06-14.md`에서 M22/M21 route 상태를 갱신한다.
- [ ] `.cloud/71_roadmap_2026-06_260612.md`의 최신 실행 보드가 실제 진행 보드를 가리키는지 확인한다.
- [ ] 수정한 한글 문서 깨짐 문자를 검사한다.

완료 기준:

- M2~M3 구현 결과가 route audit, backend 충돌 지도, 로드맵에 반영된다.

## 검증

- [ ] backend test 또는 persistence test를 실행한다.
- [ ] frontend typecheck/build 또는 smoke를 실행한다.
- [ ] 수정한 한글 문서에서 깨짐 문자를 검사한다.

## 변경 기록

- **2026-06-12**: 다음 주 후반부 예정 보드로 M2 항해→아이동섬→영입→편입, M3 숙소·케어·마이룸의 작업 순서를 작성했다. 실제 최신 실행 보드는 M1 보드이며, 이 문서는 M1 완료 후 조정해서 사용한다.
