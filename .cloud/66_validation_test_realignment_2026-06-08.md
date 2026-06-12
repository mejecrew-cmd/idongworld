# 검증과 테스트 재정렬 2026-06-08

이 문서는 2026-06-08 기획 변경 이후 smoke, audit, runtime check가 이전 세관 중심 POC 루프를 Phase 1 필수 UX처럼 강제하지 않도록 검증 기준을 다시 나눈다.

## 1. 목적

- 테스트는 새 core loop를 보호해야 한다.
- 테스트는 보류된 기능을 삭제하지 않되, 보류 기능 실패가 Phase 1 진행을 막지 않게 분리해야 한다.
- `customs`, destination island, 30칸 항해 보드, ship/lodge inventory 분리 구현은 기술 자산과 호환 검증 대상으로 유지한다.
- Phase 1 필수 smoke는 로그인, 숙소, 항해 진입, 아이동 만남, 메인 구역 추가, 통 인벤토리, legacy state 제거를 중심으로 재정렬한다.

## 2. 현재 검증 명령 분류

### 계속 core guard로 유지

```bash
pnpm typecheck
pnpm --filter backend typecheck
pnpm --filter frontend typecheck
pnpm audit:legacy-state
pnpm check:backend:model-specs
pnpm check:state-route-static
pnpm check:state-route-runtime:local
```

- typecheck는 코드 구조 회귀를 막는 기본 gate다.
- `audit:legacy-state`는 `/api/state` 통합 경로가 runtime source에 재등장하지 않게 막는다.
- `check:backend:model-specs`는 dedicated module model과 repository registry 정합성을 확인한다.
- state route static/runtime check는 backend 분리 이후에도 계속 core infra guard다.

### 넓은 local 회귀검사로 유지하되 의미를 재정의

```bash
pnpm check:live-smoke:local
```

현재 이 명령은 local Mongo, backend, frontend를 띄운 뒤 다음 검증을 묶어 실행한다.

```txt
pnpm check:module-actions-smoke
pnpm check:e2e:smoke
pnpm check:state-route-runtime
```

이 명령은 넓은 local regression smoke로 유지한다. 다만 Phase 1 UX 정의 자체로 보지 않는다. 세관, ship/lodge transfer, destination island POC가 포함되어 실패할 수 있는 경우에는 실패 원인이 core loop인지 compat/POC 영역인지 먼저 분류한다.

### core와 compat로 나눠야 하는 명령

```bash
pnpm check:e2e:smoke
pnpm check:module-actions-smoke
```

`check:e2e:smoke`는 이미 다음 좋은 기준을 포함한다.

- 로그인과 게스트 시작.
- 주요 route 진입.
- legacy `/api/state` 호출 부재.
- 항구/숙소에 세관 버튼이 기본 노출되지 않는지 확인.

다만 `/voyage/island/shell` 같은 destination island POC route는 Phase 1 core route가 아니라 compat/dev route 후보로 분리한다.

`check:module-actions-smoke`는 module action API와 repository 경계를 확인하는 데 유용하다. 다만 ship/lodge/customs/destination POC 동작까지 포함될 수 있으므로, 장기적으로 core action smoke와 compat action smoke를 나눈다.

### audit은 유지하되 customs 필수성은 완화

```bash
pnpm audit:module-items
pnpm audit:module-decor
pnpm audit:module-catalogs
```

- item catalog와 decor catalog 정합성은 계속 유지한다.
- Phase 1에서는 모든 module item이 customs rule을 가져야 한다고 해석하지 않는다.
- `customs.csv` 정합성 검증은 세관 기능을 켜는 dev/compat 경로에서 강하게 본다.
- 통 인벤토리와 아이동별 도감 아이템 catalog가 늘어나면 audit은 scope, id, 비용, 보상, 사용처 정합성을 우선 확인한다.

## 3. 새 Smoke 그룹

### Core route smoke

Phase 1에서 항상 통과해야 하는 최소 route 기준이다.

- `/`에서 로그인 흐름으로 진입한다.
- 게스트 시작 후 `/title` 또는 현재 확정된 post-login route로 이동한다.
- 이미 생성된 계정은 opening을 반복해서 보지 않는다.
- `/island`가 열린다.
- `/island/lodge`가 열린다.
- `/island/full-map`이 열린다.
- `/island/harbor`가 열린다.
- `/voyage/board?route=neighbor`는 현재 항해 상태에 맞게 열리거나 항구로 돌려보낸다.
- `/dev/catalog`는 dev route로 열리되, production core smoke에는 포함하지 않아도 된다.
- 테스트 중 `/api/state` 호출이 발생하면 실패한다.
- 세관 팝업이나 세관 버튼이 기본 core UX에 노출되지 않는다.

### Core gameplay smoke 후보

아직 일부 API와 화면이 후속 작업이므로 후보로 둔다.

- 항해에서 Aidong encounter 후보를 받는다.
- encounter 수락 시 `my-aidong` 영입, 숙소 합류, 메인 가변 구역 추가가 한 번에 반영된다.
- 숙소에서 Aidong 배정, 케어, 연습, 꾸미기, 업그레이드 진입이 막히지 않는다.
- zone production에서 Aidong 배치, 예상 생산량, 회수, 통 인벤토리 반영이 동작한다.
- zone clear 또는 minigame 결과는 frontend 직접 지급이 아니라 backend action 응답을 병합한다.
- 아이동별 도감 아이템 보상과 소비는 `myAidongStates` 후보 원장 기준으로 중복 지급/중복 소비를 막는다.
- 배 화물 비우기 action은 항해 공통 화물을 `hostStates.inventory`로 옮기고 `shipInventory`를 비운다.

### Compat/POC smoke

보존하지만 Phase 1 core gate로 보지 않는 검증이다.

- `/voyage/island/shell` destination island POC route.
- `DestinationIslandScreen` PixiJS/Rive 연출 POC.
- customs apply, idempotency, audit log.
- ship -> lodge, ship -> host, lodge -> host transfer.
- destination local resource와 ship cargo 적재.
- 30칸 주사위 보드의 정확한 위치/밸런스.
- module-local resource를 세관 없이 떠날 수 없게 막는 exit gate.

## 4. 추천 Script 분리안

아래 명령은 당장 모두 구현된 명령이 아니라, 다음 정리 작업에서 만들 후보 이름이다.

```bash
pnpm check:core-smoke:local
pnpm check:compat-smoke:local
pnpm check:e2e:smoke:core
pnpm check:e2e:smoke:compat
pnpm check:module-actions-smoke:core
pnpm check:module-actions-smoke:compat
```

권장 분리 기준:

- `core`는 Phase 1 플레이 루프가 돌아가는지 확인한다.
- `compat`는 기존 POC와 숨김 기능이 아직 망가지지 않았는지 확인한다.
- `local`은 Mongo, backend, frontend를 실제로 띄우는 통합 검증이다.
- core smoke가 실패하면 작업을 멈추고 고친다.
- compat smoke가 실패하면 해당 기능을 작업 중이거나 flag로 노출 중일 때만 blocker로 본다.

## 5. Feature Flag 기준

보류 기능은 명시적 flag 뒤에 둔다.

```txt
VITE_CUSTOMS_UI_ENABLED
VITE_CUSTOMS_EXIT_GATE_ENABLED
VITE_DESTINATION_ISLAND_CUSTOMS_GATE_ENABLED
VITE_VOYAGE_BOARD_MODE
VITE_DESTINATION_ISLAND_POC_ENABLED
```

- flag 기본값은 Phase 1 core loop에 유리하게 둔다.
- flag가 꺼진 기능은 core smoke 실패 원인이 되면 안 된다.
- flag가 켜진 기능은 compat smoke 또는 feature 전용 smoke에서 검증한다.

## 6. 멀티세션 QA 기준

웹은 멀티탭과 멀티세션 사용 가능성을 전제로 한다. 다음 항목은 core gameplay가 구현되는 즉시 QA 기준에 넣는다.

- 같은 보상을 두 탭에서 동시에 받아도 중복 지급되지 않는다.
- 같은 아이템을 두 탭에서 동시에 소비해도 음수 수량이 되지 않는다.
- 오래된 frontend state가 최신 backend state를 덮어쓰지 않는다.
- 같은 Aidong을 여러 구역, 선실, 갑판, 항구 지원에 중복 배치할 수 없다.
- 항해 중인 Aidong은 숙소 케어/연습/구역 배치 후보에서 권한에 맞게 제한된다.
- 생산 회수, 업그레이드 소비, 도감 아이템 소비는 idempotency 또는 backend validation으로 보호한다.

## 7. 실패 판정

| 실패 영역 | Phase 1 blocker 여부 | 처리 기준 |
| --- | --- | --- |
| typecheck | blocker | 즉시 수정한다. |
| legacy `/api/state` 재등장 | blocker | 즉시 수정한다. |
| model spec 불일치 | blocker | storage ownership을 먼저 고친다. |
| core route smoke 실패 | blocker | 화면/라우트/인증 흐름을 즉시 고친다. |
| core gameplay smoke 실패 | blocker | 해당 core 기능 구현 중이면 즉시 고친다. |
| customs POC 실패 | 조건부 | 세관 작업 중이거나 flag enabled일 때 blocker다. |
| destination island POC 실패 | 조건부 | POC/연출 작업 중이거나 flag enabled일 때 blocker다. |
| 30칸 보드 밸런스 실패 | 비blocker | 보드 방식 결정 전에는 문서화하고 보류한다. |

## 8. 즉시 조정 메모

- `check:live-smoke:local`은 계속 유용하지만, 이름 그대로 넓은 local smoke로 해석한다.
- `tests/e2e/app-smoke.spec.ts`의 세관 버튼 비노출 검증은 새 기획과 맞으므로 유지한다.
- `tests/e2e/app-smoke.spec.ts`의 `/voyage/island/shell` route 확인은 compat/dev route smoke로 옮기는 후보로 둔다.
- `check:module-actions-smoke`는 backend split 저장소와 action API를 확인하는 데 유용하므로 유지한다.
- `check:module-actions-smoke` 안의 customs/ship/lodge/destination 항목은 core와 compat로 나누는 후속 작업이 필요하다.
- `audit:module-items`와 `audit:module-decor`는 유지한다.
- 모든 item에 customs rule이 필요하다는 해석은 Phase 1에서 완화한다.

## 변경 기록

- **2026-06-08**: 기획 변경 후 검증 기준을 core smoke, compat/POC smoke, audit, multi-session QA로 재정렬했다. `check:live-smoke:local`은 broad regression으로 유지하되 Phase 1 UX 정의로 보지 않는다고 명시했다.
