# 기획 변경 충돌 지도 2026-06-08

이 문서는 `.cloud/기획변경회의에따른기획변경가이드.md`를 기준으로 현재 문서와 구현이 새 방향과 충돌하는 지점을 분류한다.

## 판정 기준

- **유지**: 새 기획에서도 그대로 필요하다.
- **축소**: 기술 자산은 유지하지만 Phase 1 사용자 루프에서는 덜 드러낸다.
- **숨김**: 당장 삭제하지 않고 feature flag, dev 경로, 내부 검증 경로로 내린다.
- **재사용**: 기존 구현을 새 기획의 다른 역할로 돌린다.
- **보류**: 외부 IP 콜라보, 연말 리팩토링, 월요일 재논의 이후로 미룬다.
- **미결**: 기획 결정 없이는 코드 방향을 정하면 위험하다.

## 핵심 충돌 요약

| 영역 | 기존 구현/문서 기준 | 회의 이후 방향 | 판정 | 후속 작업 |
|---|---|---|---|---|
| 세관 강제 UX | module-local resource는 customs를 통해야 이동 가능 | Phase 1에서는 세관 강제 변환 폐기/보류 | 숨김/보류 | customs UI gate 제거 또는 feature flag화 |
| 모듈화 | 콘텐츠 모듈의 로컬 자원, customs, worldScope 중심 | 통 구조 우선, 카테고리/백엔드 분리는 유지 | 축소 | 문서에서 게임 UX 강제와 기술 경계를 분리 |
| 배/숙소 인벤토리 분리 | `shipInventory`, `lodgeInventory`, local inventory를 분리 | 배 인벤토리/내 인벤토리 구분 없음. 아이동 도감 아이템은 Aidong 귀속 | 미결/재설계 | 통 인벤토리와 Aidong 25 도감 인벤토리 설계 |
| Destination Island | 외부 섬에서 local resource 획득 후 이탈 세관 | 아이동 만남은 메인 구역 슬롯 추가로 전환 | 재사용/보류 | destination scene은 Post 후보 또는 이벤트 섬 후보로 보존 |
| Route Landing | resource landing이 destination shell island로 연결 | 항해에서 아이동 만남/재료 수집 중심 | 재사용 | landing 종류를 Aidong encounter/material 중심으로 재설계 |
| 항해 보드 | 주사위/보드 진행을 구현 기준으로 고도화 | 주사위 채택 여부 미결, 칸 축소/지정 이동 검토 | 미결 | 보드 밸런스 고도화 중단, 선택지 비교 |
| 숙소 | 숙소/선실 꾸미기와 인벤토리 표시가 최근 강화됨 | 숙소가 육성 핵심 허브, 방=육성 제한, 마당=보유 표시 | 유지/확장 | 숙소 중심 화면으로 재배치 |
| 선실/배 메뉴 | 선실 배치/꾸미기, 항해 중 배 메뉴 구현 | 배 업그레이드=적재/선실 확장, 항해 루프 유지 | 유지/축소 | 선실 효과는 보류, 배 적재 사이클 중심으로 정리 |
| Zone collect/clear | 구역별 collect/clear action과 local resource | 구역 배치 시 시간당 자동 생산 | 재사용 | zone action을 placement/production 모델 후보로 확장 |
| MiniGame | 4종 구역 미니게임 | 아이동별 지정게임 + 스킨 | 재사용 | zone minigame을 engine/skin 구조로 재분류 |
| Codex | 도감 slot unlock/full registration 중심 | 아이동별 25 도감 item이 업그레이드 연료 | 확장 | codex/item catalog 재설계 |
| Item Catalog | module-local, ship, lodge, aidong-global scope | 통 인벤토리 + Aidong 귀속 inventory | 미결/확장 | item scope 재정의 |
| Smoke | 세관/destination/ship-lodge 흐름 포함 | 새 core loop 기준 smoke 필요 | 재설계 | smoke를 숙소/항해/만남/구역추가/통 인벤토리 중심으로 변경 |

## 최근 구현물 처리 분류

| 구현물 | 현재 위치 | 새 기획 판정 | 처리 |
|---|---|---|---|
| backend module route/service/repository 분리 | `packages/backend/src/modules/*`, repositories | 유지 | 기술 경계로 유지 |
| Mongo collection 분리 | `hostStates`, `shipStates`, `lodge`, `zoneStates` 등 | 유지 | 문서에서 통 구조와 충돌하지 않게 설명 |
| customs engine/idempotency/audit log | `packages/backend/src/customs`, `customsLogs` | 축소/보류 | Phase 1 UX에서는 숨기고 내부 검증/미래 콜라보 후보 |
| `CustomsTransferDialog` | `packages/frontend/src/components` | 숨김 | 필수 gate 제거 후보. dev/검증 경로로 이동 가능 |
| destination shell island | `packages/modules/destination-shell-island` | 보류/재사용 | 이벤트 섬 또는 화려한 탐험 POC로 보존 |
| PixiJS destination scene | destination shell island 화면 | 재사용 | 향후 이벤트/탐험 화면 연출 자산 |
| Rive reaction layer | destination shell island 화면 | 재사용 | hotspot/보상/숙소 반응으로 확장 가능 |
| ship inventory/cargo capacity | ship backend/frontend | 재설계 | 배 적재량 압력 장치로 용어 재정리 |
| lodge inventory | lodge backend/frontend | 미결 | 통 인벤토리 전환 시 축소 후보 |
| lodge room decor | `LodgeScene`, lodge service | 유지/확장 | 숙소 중심 허브의 일부로 유지 |
| ship cabin decor | `HarborScene`, `NavigationBoardScene`, ship service | 유지/축소 | 선실 확장/꾸미기 후보로 유지, 효과는 보류 |
| zone collect/clear | zone backend/frontend | 재사용 | 자동 생산 API로 확장 후보 |
| module item/decor audit | tools/audit | 유지 | catalog 품질 검증으로 유지 |
| live smoke | `check:live-smoke:local` | 재설계 | 기존 smoke는 보존, 새 core loop smoke 추가 필요 |

## 문서 충돌 목록

| 문서 | 충돌 표현 | 조정 방향 |
|---|---|---|
| `.cloud/00_project_overview.md` | 목표에 세관/모듈형 월드가 핵심처럼 남아 있음 | Phase 1 방향 전환 메모 추가 |
| `.cloud/20_module_rules.md` | 모듈 간 자원 이동은 customs 필수 | 기술 경계 원칙과 Phase 1 UX 보류를 분리 |
| `.cloud/30_backend_db_rules.md` | customs가 cross-module resource movement의 유일 backend 경로 | Phase 1 gameplay에서는 강제하지 않는다고 명시 |
| `.cloud/40_frontend_rules.md` | 세관 팝업이 전용 자원 모듈 이탈 gate | 이 기준은 이전 보드 기준이며 새 기획에서는 보류라고 표시 |
| `packages/modules/WORLD_SCOPE_GUIDE.md` | destination-island -> ship -> lodge 세관 흐름 | destination island POC 기준으로 격하 |
| `packages/modules/ITEM_CATALOG_GUIDE.md` | customs 참조를 catalog 필수 흐름으로 설명 | catalog 검증은 유지, customs 필수성은 보류 |
| `packages/modules/BACKEND_GUIDE.md` | cross-module 이동은 customs 중심 | 내부 infra로 유지하되 core loop 강제 UX는 보류 |

## 코드 수정 전 주의

- 세관 관련 코드는 당장 삭제하지 않는다. smoke와 backend 검증이 다수 의존한다.
- 세관의 Phase 1 노출 정책은 `.cloud/56_customs_descope_2026-06-08.md`를 따른다. 기본값은 customs backend 유지, user gate 비활성화다.
- `destination-shell-island`도 삭제하지 않는다. PixiJS/Rive POC와 향후 이벤트 섬 후보로 가치가 있다.
- `shipInventory`, `lodgeInventory`는 새 통 인벤토리 설계 전까지 migration 없이 유지한다.
- 숙소 UI는 우선순위가 올라갔으므로 삭제/후퇴하지 않는다.
- 항해 보드는 메카닉 결정 전까지 밸런스 고도화를 멈추되, 진입/복귀/상태 저장 안정성은 유지한다.

## 변경 기록

- **2026-06-08**: Customs De-scope 정책 문서를 연결했다. 세관은 backend 기술 자산으로 유지하되 Phase 1 사용자 필수 gate에서는 내리는 기준을 명시했다.
- **2026-06-08**: 최초 작성. 2026-06-05 기획 변경 회의 가이드를 기준으로 기존 세관/모듈화/destination island/ship-lodge inventory 작업과 새 통 인벤토리·숙소 중심 루프의 충돌을 분류했다.
