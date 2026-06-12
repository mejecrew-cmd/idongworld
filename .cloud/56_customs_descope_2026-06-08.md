# Customs De-scope 정책 2026-06-08

이 문서는 2026-06-05 기획 변경 이후 세관(customs)을 Phase 1에서 어떻게 낮춰 다룰지 정리한다.

기준 문서:

- `.cloud/기획변경회의에따른기획변경가이드.md`
- `.cloud/52_plan_change_conflict_map_2026-06-08.md`
- `.cloud/53_core_loop_2026-06-08.md`
- `.cloud/55_inventory_codex_item_redesign_2026-06-08.md`

## 한 줄 결정

Phase 1 기본값은 **customs backend ON, customs user gate OFF**다.

세관은 삭제하지 않는다. 다만 신규 플레이어가 핵심 루프를 진행할 때 세관 팝업을 필수로 이해하거나 통과해야 하는 구조는 내린다.

## 왜 낮추는가

- 새 core loop는 숙소 중심 육성, 항해 발견, 아이동 만남, 통 인벤토리, 아이동별 도감 아이템, 구역 배치 자동 생산을 우선한다.
- 기존 세관 gate는 `destination-island -> ship -> lodge` POC에는 맞지만, Phase 1의 첫 플레이 흐름에는 설명 부담이 크다.
- 통 인벤토리와 아이동 귀속 도감 인벤토리 설계에서는 domain action이 권위 저장소에 직접 보상을 반영하는 쪽이 더 단순하다.
- 그래도 세관은 외부 IP 콜라보, 완전 모듈화, 거래/이관 감사 로그, cross-module transaction에 다시 필요할 수 있다.

## 유지할 것

다음은 기술 자산으로 보존한다.

| 항목 | 유지 이유 |
|---|---|
| backend `/api/customs/rules` | 등록된 rule 확인과 dev/debug 검증에 필요하다. |
| backend `/api/customs/apply` | future cross-module 이동과 smoke 검증 자산이다. |
| backend `/api/customs/logs` | audit log와 idempotency 확인에 필요하다. |
| `customsLogs` collection | 이동 결과, 실패 사유, idempotency 기록을 보존한다. |
| resource adapter | module 간 직접 document 수정을 막는 경계로 가치가 있다. |
| `customs.csv` loader | 외부 IP 콜라보나 모듈별 변환 rule 재개 시 재사용한다. |
| registered customs rule | POC/검증/호환 rule로 유지한다. |
| transaction fallback | local Mongo 환경에서 보상 rollback 경로를 보존한다. |

## 숨기거나 낮출 것

다음은 Phase 1 사용자 핵심 루프에서 필수 gate로 쓰지 않는다.

| 항목 | 처리 |
|---|---|
| `CustomsTransferDialog` | 삭제하지 않고 숨김, dev, 검증 경로 후보로 낮춘다. |
| MiniGame close customs gate | 전용 자원 보유 시 나가기를 막는 기본 UX는 끈다. |
| destination island 이탈 customs gate | 기본값에서는 이탈을 막지 않는다. 필요하면 feature flag 뒤에 둔다. |
| 항구/숙소 세관 편의 버튼 | Phase 1 기본 화면에서는 노출하지 않는다. |
| 세관을 이해해야만 진행되는 튜토리얼 | 만들지 않는다. |

## 기본 feature flag 후보

frontend 기본값:

```txt
VITE_CUSTOMS_UI_ENABLED=false
VITE_CUSTOMS_EXIT_GATE_ENABLED=false
VITE_DESTINATION_ISLAND_CUSTOMS_GATE_ENABLED=false
```

backend 기본값:

```txt
CUSTOMS_AD_HOC_APPLY_ENABLED=false
```

backend registered rule과 `/api/customs/apply`는 기본적으로 유지한다. 단, 사용자 core loop에서 자동으로 호출하거나 강제 진입시키지 않는다.

## 코드 처리 순서 후보

1. frontend에 customs UI 노출 flag를 추가한다. - 완료
2. `MiniGameModal`의 닫기 흐름에서 `VITE_CUSTOMS_EXIT_GATE_ENABLED=false`일 때는 세관 팝업 없이 닫히게 한다. - 완료
3. `DestinationIslandScreen`의 섬 이탈 흐름에서 `VITE_DESTINATION_ISLAND_CUSTOMS_GATE_ENABLED=false`일 때는 local resource가 남아도 나갈 수 있게 한다. - 완료
4. `CustomsTransferDialog`는 삭제하지 않고 dev/catalog/debug 경로나 수동 검증 경로로만 접근시키는 후보를 둔다. - 완료, `VITE_CUSTOMS_UI_ENABLED=true` 뒤로 격리
5. core loop smoke는 세관 팝업을 필수 통과 조건으로 삼지 않는다. - 완료, `.cloud/66_validation_test_realignment_2026-06-08.md` 참고
6. backend customs smoke와 resource adapter 검증은 별도 기술 검증으로 남긴다. - 유지

## 2026-06-08 구현 반영

- `App`의 전역 `CustomsConfirmModal`은 `VITE_CUSTOMS_UI_ENABLED=true`일 때만 렌더한다.
- `HarborScene`, `LodgeScene`, `NavigationBoardScene`의 세관 버튼과 `CustomsTransferDialog`는 `VITE_CUSTOMS_UI_ENABLED=true`일 때만 렌더한다.
- `MiniGameModal`의 모듈 이탈 세관 gate는 `VITE_CUSTOMS_EXIT_GATE_ENABLED=true`일 때만 작동한다.
- `DestinationIslandScreen`은 `VITE_DESTINATION_ISLAND_CUSTOMS_GATE_ENABLED=true`일 때만 customs rule을 읽고 섬 이탈 세관 dialog를 연다.
- 기본값에서는 사용자가 세관을 보지 않아도 항해, 숙소, zone minigame, destination island POC를 이동할 수 있다.
- backend customs API, `customsLogs`, resource adapter, `customs.csv` loader, module 경계는 유지한다.

## Phase 1 보상 처리 원칙

세관을 기본 UX에서 내린다고 해서 frontend가 임의로 다른 module state를 직접 수정하면 안 된다.

권장:

- 항해에서 일반 재료 획득 -> host action 또는 route action이 `hostStates.inventory`를 증가시킨다.
- 항해에서 Aidong 도감 아이템 획득 -> my-aidong action이 `myAidongStates.aidongCodexItems`를 증가시킨다.
- 구역 자동 생산 회수 -> zone/production action이 검증한 뒤 `hostStates.inventory`를 증가시킨다.
- Aidong 영입 -> encounter action이 `myAidongStates`와 `myIslandStates`를 함께 전이한다.

금지:

- 세관을 숨겼다는 이유로 frontend가 source/target module state를 직접 patch하는 것.
- `customsLogs`와 adapter를 삭제해 향후 audit 경로를 없애는 것.
- 신규 core loop에서 세관 팝업을 다시 필수 튜토리얼로 올리는 것.
- `customs.csv`를 대량 삭제해 기존 smoke와 POC 재현성을 깨는 것.

## 재개 조건

다음 중 하나가 확정되면 customs를 다시 사용자 루프 또는 운영 기능으로 올릴 수 있다.

- 외부 IP 콜라보에서 IP별 전용 아이템이 서로 다른 저장소를 가져야 한다.
- 연말 또는 2027년 리팩토링에서 모듈 독립성을 사용자 경제에도 노출하기로 한다.
- module-local economy가 실제 운영 밸런스로 확정된다.
- 거래, 교환, 환전, 판매, 이벤트 정산에 audit log와 idempotency가 필요해진다.
- Atlas 또는 replica set 기반 transaction 운영이 확정되어 debit/credit 원자성이 필요해진다.

## 작업자 판단 기준

- 새 기능이 단일 권위 저장소에 보상을 지급하면 customs가 아니라 domain action을 우선한다.
- 두 개 이상의 module document 사이에서 자원을 이동해야 하면 customs adapter를 검토한다.
- 사용자에게 세관 팝업을 보여줘야 하는 경우에는 먼저 `VITE_CUSTOMS_UI_ENABLED`와 기획 승인 여부를 확인한다.
- 기술 검증, dev route, audit 확인 목적이라면 customs backend를 계속 사용할 수 있다.

## 변경 기록

- **2026-06-08**: 세관 UI/UX 제거 작업을 반영했다. frontend core route의 세관 버튼, 전역 confirm modal, 미니게임 이탈 gate, destination island 이탈 gate를 feature flag 뒤로 격리하고, backend customs 기술 자산은 유지했다.
- **2026-06-08**: 최초 작성. 세관을 Phase 1 사용자 필수 gate에서 내리고, backend customs/API/log/adapter/rule은 기술 자산으로 유지하는 정책을 정의했다.
