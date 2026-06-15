# 아이동월드 구현 히스토리와 현재 기준 2026-06-13

이 문서는 지금까지 `.cloud`에 쌓였던 작업 히스토리를 현재 구현 기준으로 다시 정리한 기준 문서다.

목적은 두 가지다.

1. 새 개발자가 오래된 문서에 끌려가지 않고 현재 구현 방향을 빠르게 이해하게 한다.
2. 이후 Codex를 돌릴 때도 6월 POC 동결 이후의 방향에서 벗어나지 않게 한다.

중요한 결론부터 말하면, 6월 작업은 끝났다. 6월의 목표는 전체 게임 완성이 아니라 **POC 수직 루프를 검증 가능한 상태로 동결하는 것**이었다. 이 목표는 M5에서 완료했다.

이제 프로젝트는 7월 M6 단계로 넘어간다.

## 1. 현재 가장 중요한 기준

현재 최신 실행 보드는 아래 문서다.

```text
.cloud/89_next_work_2026-07-01.md
```

6월 로드맵과 완료 판정은 아래 문서가 기준이다.

```text
.cloud/71_roadmap_2026-06_260612.md
```

새 개발자용 시작 문서는 아래 문서다.

```text
.cloud/85_developer_onboarding_2026-06-12.md
```

새 모듈을 만들거나 기존 모듈을 크게 확장할 때는 아래 제작자 가이드를 먼저 본다.

```text
.cloud/02_module_creator_guide_2026-06-13.md
```

이 문서는 히스토리 기준이다.

```text
.cloud/01_project_history_current_2026-06-13.md
```

오래된 `next_work`, 임시 충돌 지도, 임시 작업 계획 문서는 이 문서에 흡수했다. 앞으로는 오래된 파일 이름을 기준으로 작업하지 않는다.

## 2. 6월에 실제로 닫은 루프

6월에 닫은 루프는 아래다.

```text
로그인/타이틀
→ 오프닝 분기
→ 마이섬 15구역 허브
→ 숙소 케어
→ 항구/항해
→ 아이동섬 상륙
→ 아이동 영입
→ 13 편입 슬롯 선택
→ 구역 생산/도감템 획득
→ 마이룸 도감/콜렉션 확인
→ 데뷔 placeholder
```

이 루프는 완성형 콘텐츠가 아니다. 대신 다음을 증명한다.

- 사용자 계정과 기본 상태를 만들 수 있다.
- 마이섬이 고정 15구역 구조로 보인다.
- 항구와 숙소는 고정 anchor 구역으로 잠겨 있다.
- 항해에서 아이동섬으로 갈 수 있다.
- 아이동 영입과 마이섬 편입이 분리되어 있다.
- 숙소에서 케어 action을 호출할 수 있다.
- 마이룸에서 도감과 콜렉션을 볼 수 있다.
- 구역 생산으로 도감템 후보를 얻을 수 있다.
- 데뷔 화면은 placeholder로 이어진다.
- 이 흐름은 smoke와 persistence test로 확인된다.

## 3. 지금 구현 방향을 한 문장으로 설명하면

아이동월드는 `마이섬 15구역`, `숙소 성장`, `항해와 아이동섬`, `도감템/마이룸`, `데뷔 준비`를 module 단위로 나누고, 하나의 backend 서버 안에서 각 module이 자기 상태와 API를 소유하는 구조다.

즉, 서버를 여러 개로 나누는 프로젝트가 아니다.

```text
하나의 Express backend
→ module별 route/service/repository/model 분리
→ MongoDB collection 또는 dedicated state document 분리
→ frontend는 단일 Zustand store 유지
→ module 접근은 facade와 action API로 제한
```

## 4. 절대 되돌리면 안 되는 결정

### 4.1 `/api/state`는 되살리지 않는다

예전에는 frontend Zustand store 전체를 backend memory state와 동기화하는 방식이 있었다.

지금은 아니다.

금지:

```text
GET /api/state
PATCH /api/state
frontend 통합 state patch client
```

현재 방향:

```text
/api/account/*
/api/host/*
/api/modules/{moduleId}/*
명시적인 action API
필요 시 customs API
```

### 4.2 backend 서버는 하나지만 module 경계는 유지한다

서버를 module마다 물리적으로 나누지 않는다.

대신 아래 원칙을 지킨다.

- module은 자기 document를 직접 수정한다.
- 다른 module document를 직접 만지지 않는다.
- cross-module debit/credit이 필요하면 customs 또는 명시 domain action을 통한다.
- route는 HTTP 요청/응답만 담당한다.
- service는 검증과 상태 전이를 담당한다.
- repository는 DB 접근만 담당한다.

### 4.3 frontend store는 하나지만 직접 접근하지 않는다

frontend의 Zustand store는 하나다.

```text
packages/frontend/src/stores/userStore.ts
```

하지만 신규 module code가 app-level store를 직접 import하면 안 된다.

권장 경계:

```text
packages/frontend/src/lib/storeFacades.ts
packages/frontend/src/lib/actionApiSync.ts
packages/frontend/src/lib/api.ts
```

module package는 app store를 직접 모르면 좋다. app bootstrap이 필요한 action/facade를 주입한다.

### 4.4 세관은 삭제가 아니라 de-scope다

세관/customs는 없앤 것이 아니다.

현재 결정은 다음이다.

```text
customs backend, adapter, rule, log는 유지한다.
Phase 1 core UX에서 세관 팝업을 필수 gate로 강제하지 않는다.
```

따라서 게임 보상이 단일 권위 저장소로 바로 들어가면 domain action API를 우선한다. 하지만 실제 source document에서 빼서 target document에 넣어야 하는 cross-module 이동은 customs가 맞다.

## 5. backend 현재 구조

backend는 하나의 Express 서버다.

주요 저장소 책임은 다음과 같다.

| collection/state | 역할 |
|---|---|
| `users` | 계정, guest, auth 연결 user document |
| `hostStates` | host 이름, 광역 재화, 주사위, 통 inventory |
| `myAidongStates` | 영입 Aidong, needs, 케어, 착용, Aidong 도감템 후보 원장 |
| `myIslandStates` | 마이섬 해금, 15구역 `zoneSlots`, 구역 진행 |
| `codexStates` | 도감 표시, 등록, 일지 상태. 수량 원장이 아님 |
| `routeNeighborStates` | 항해 route catalog, landing/encounter 결과 호환 기록. 현재 항해 위치와 출항/정박 여부는 저장하지 않는다 |
| `shipStates` | 배 종류, 선실, 갑판, 꾸미기, 선박 inventory 호환 필드. 출항/정박 여부는 저장하지 않는다 |
| `zoneStates` | zone-garden, zone-oasis, zone-memory, zone-mine local state |
| `moduleStates` | 아직 dedicated collection이 없는 module fallback state |
| `customsLogs` | customs 처리 로그, 실패 사유, idempotency 기록 |

중요한 점은 `codexStates`가 수량 원장이 아니라는 것이다.

아이동별 25개 도감템 수량 후보는 아래에 둔다.

```text
myAidongStates.aidongCodexItems
```

일반 소유 아이템과 Aidong 착용 아이템의 소유권은 host inventory 쪽이 기본 후보다.

```text
hostStates.inventory
myAidongStates.equippedItems
```

## 6. frontend 현재 구조

frontend는 React와 Zustand 기반이다.

핵심은 단일 store를 유지하되 접근 경계를 나누는 것이다.

- `userStore.ts`: app 전체 상태의 local mirror.
- `syncStore.ts`: account, host, module API hydrate/flush 경계.
- `storeFacades.ts`: module별 상태 접근 facade.
- `actionApiSync.ts`: backend action 결과를 store에 병합하는 경계.
- `moduleRegistry.ts`, `moduleRoutes.tsx`: module route 등록과 lazy loading.

신규 기능은 가능하면 다음 흐름을 따른다.

```text
사용자 클릭
→ frontend action helper
→ backend module action API
→ backend service가 상태 전이
→ response payload
→ actionApiSync/facade가 Zustand에 병합
```

frontend가 보상을 직접 지급하거나 다른 module state를 임의로 patch하면 안 된다.

## 7. 마이섬 15구역 결정

현재 마이섬은 고정 15구역이다.

```text
AREA-01 ~ AREA-15
```

특수 anchor:

- `AREA-02`: 항구.
- `AREA-13`: 숙소.

이 두 구역은 Aidong 편입 대상이 아니다.

나머지 13개 구역이 Aidong을 편입할 수 있는 fillable slot이다.

핵심 저장소:

```text
myIslandStates.zoneSlots
```

기존 `dynamicAidongZones`는 바로 삭제하지 않는다. migration/compat 입력으로 남긴다. 단, 신규 core UI와 신규 runtime 판단은 `zoneSlots`를 우선한다.

## 8. 항해, 아이동섬, 영입, 편입

현재 책임 분리는 다음과 같다.

| 책임 | 담당 |
|---|---|
| 항해 route catalog, landing/encounter 규칙, 보상 확정 action | `route-neighbor` |
| 현재 항해 중인 route id, 현재 칸, 주사위 이동 결과, 세션 내 landing 후보 | 브라우저 탭/창별 session state |
| 주사위 소모, 영입, 보상 지급, inventory 증가 같은 영속 결과 | backend module action API와 MongoDB |
| 아이동섬 상륙, 이동, 상호작용, 영입 후보 | `aidong-island` |
| 실제 Aidong 보유 상태 | `my-aidong` |
| 마이섬 13개 slot 편입 | `my-island/slots/incorporate` |

### 8.1 항해 세션 권위 결정 2026-06-13

항해 중인지, 항구에 정박 중인지, 현재 몇 번째 칸에 있는지는 DB가 알면 안 된다.

이 정보는 브라우저 탭 또는 창별 세션 상태다. 한 사용자가 항해 창을 여러 개 열면 각 창은 서로 독립적인 항해 세션을 가진다.

원칙은 다음이다.

- DB에는 `isVoyaging`, `departed`, `currentRoute`, `boardPosition` 같은 현재 항해 세션 권위 값을 저장하지 않는다.
- 항해 창을 닫으면 그 창의 세션 항해 상태는 사라진다. 이 경우 게임적으로는 자동 마이섬 복귀로 본다.
- 항해 중인 탭이 있더라도 다른 탭이나 URL 직접 입력으로 항구에 들어가면 항구에는 배가 정박해 있어야 한다.
- 항구 화면에서 “배가 출항 중입니다” 같은 DB 기반 표시는 절대 띄우지 않는다.
- 항구에서 항해 시작 버튼을 누르면 해당 탭의 항해 세션을 처음부터 새로 만든다.
- 같은 계정의 다른 탭에서 항해를 시작해도 기존 탭의 항해 세션과 독립적으로 진행된다.
- 주사위 소모, 보상 획득, Aidong 영입, inventory 증감처럼 영속 결과가 생기는 순간만 backend action API를 통해 DB에 기록한다.
- `route-neighbor` API가 주사위 결과나 landing 후보를 반환할 수는 있지만, 그 결과는 호출한 프론트 세션이 들고 있는 진행 정보로 취급한다.

중요한 원칙:

```text
항해 encounter accept는 마이섬 slot 편입까지 자동 처리하지 않는다.
아이동 영입과 마이섬 편입은 다른 일이다.
```

즉, 사용자는 항해에서 아이동섬을 만나고, 상륙하고, 영입한 뒤, 별도로 마이섬 slot을 선택해 편입한다.

### 8.2 항해 세션 권위 구현 완료 상태

2026-06-13 구현으로 아래 상태가 실제 코드에 반영됐다.

- `packages/frontend/src/lib/voyageSessionStore.ts`가 탭/창별 항해 세션을 `sessionStorage`에 저장한다.
- `packages/frontend/src/screens/HarborScene.tsx`는 `route-neighbor` DB 상태를 읽어 출항 중 UI를 표시하지 않는다. 항구는 항상 정박 화면이다.
- `packages/frontend/src/screens/NavigationBoardScene.tsx`와 `BottomNav.tsx`는 현재 route와 현재 칸을 `voyageSessionFacade`에서 읽는다.
- `packages/frontend/src/lib/syncStore.ts`는 `currentRoute`, `boardPosition`, `route-neighbor` 현재 항해 상태를 hydrate/flush하지 않는다.
- `packages/frontend/src/lib/actionApiSync.ts`는 action 응답에 `currentRoute`, `boardPosition`이 섞여 와도 `userStore`에 병합하지 않는다.
- `packages/backend/src/modules/route-neighbor/service.ts`는 `start`/`roll`/`end`로 현재 항해 상태를 DB에 저장하지 않는다.
- `packages/backend/src/modules/ship/service.ts`는 `route-neighbor.currentRoute`를 보고 배 변경이나 배치를 막지 않는다.
- `LodgeScene`은 DB의 현재 항해 상태로 Aidong을 전역 “항해 중” 처리하지 않는다.

검증 기준도 함께 갱신됐다.

- backend persistence test는 route-neighbor가 현재 route/current cell을 영속 저장하지 않는지 확인한다.
- backend smoke script는 `roll`/`landing/clear`가 세션 payload를 받고 영속 결과만 남기는지 확인한다.
- Playwright smoke는 항구에 출항 중 문구가 나오지 않는지, 항해 세션이 `sessionStorage`에만 있고 `idongworld-user` localStorage에 들어가지 않는지 확인한다.

앞으로 항해 관련 코드를 수정할 때 가장 먼저 확인할 문서는 아래다.

```text
.cloud/91_next_work_2026-06-13_voyage_session_authority.md
```
## 9. 숙소와 마이룸

숙소는 단순 배치 화면이 아니라 성장 허브가 되는 방향이다.

현재 닫힌 최소 기능:

- 보유 Aidong 확인.
- 숙소 배치/방/마당 후보.
- 4파라미터 케어 표면 모델.
- care action shell.
- 마이룸 route.
- 마이룸 도감/콜렉션/ledger placeholder.

마이룸 책임:

- Aidong별 도감 진행 표시.
- 보유 도감템과 collection 표시.
- 포토카드 placeholder 표시.
- 나중에 gallery와 ledger로 확장.

## 10. 도감템과 생산

M4에서 Aidong별 25칸 도감템 원장 구조를 잡았다.

현재 방향:

- 도감템 수량은 `myAidongStates.aidongCodexItems` 후보 원장에 둔다.
- `codexStates`는 표시/등록/일지 성격이다.
- zone production reward는 테스트용 도감템을 지급할 수 있다.
- 마이룸 도감과 컬렉션은 같은 데이터를 서로 다른 방식으로 보여준다.

7월에는 실제 25개 아이템 데이터, upgrade recipe, practice/economy action을 붙이는 일이 남아 있다.

## 11. stage, debut, photocard

현재 `/stage`와 `/stage/debut/:id`는 placeholder다.

닫힌 것:

- route가 있다.
- 데뷔 placeholder까지 길이 이어진다.
- 포토카드 placeholder가 있다.

아직 없는 것:

- stage/debut backend module.
- debut result ledger.
- 실제 포토카드 생성/저장/갤러리.
- 데뷔 보상, 점수, 성공/실패 정책.

이 항목은 7월 필수 backlog다.

## 12. PixiJS와 Rive 방향

PixiJS는 전체 UI를 대체하는 기술이 아니다.

사용 후보:

- destination island 고정 맵.
- hotspot 조사.
- 상하좌우 이동 transition.
- 보상 획득 연출.
- 아이동섬 탐험 배경.

React/MUI가 계속 담당할 것:

- route shell.
- HUD.
- 버튼.
- inventory.
- 설정.
- 텍스트 많은 UI.

Rive는 캐릭터가 직접 돌아다니는 용도가 아니라, 클릭 반응, 기분 반응, 보상 반응, UI reaction에 우선 사용한다.

Spine/Live2D는 현재 기본 도입하지 않는다. 작업량이 크기 때문이다.

## 13. 검증 기준

M5에서 확인한 기준:

```bash
pnpm --filter backend typecheck
pnpm --filter frontend typecheck
pnpm test -- packages/backend/src/backendPersistence.test.ts
pnpm check:live-smoke:local
```

확인된 결과:

- backend typecheck 통과.
- frontend typecheck 통과.
- backend persistence test 39개 통과.
- `pnpm check:live-smoke:local` 통과.
- local Mongo, backend, frontend가 실제로 뜬 상태에서 backend module smoke, Playwright route smoke, state-route runtime check가 통과.

앞으로 smoke는 core와 compat으로 나눌 예정이다.

현재 다음 작업:

```text
.cloud/89_next_work_2026-07-01.md
2. core smoke와 compat smoke 분리 설계
```

## 14. 7월로 넘긴 일

7월 backlog는 크게 네 분류다.

### 필수

- core smoke와 compat smoke 분리.
- route placeholder 정리.
- stage/debut backend skeleton.
- photocard storage MVP.
- my-aidong codex item, practice, upgrade skeleton.
- 25개 도감템 최소 데이터팩.
- 숙소 practice/upgrade 진입점.
- 13개 fillable 구역 production MVP 확장.

### 확장

- 13구역 고유 미니게임.
- PixiJS destination island 연출.
- Rive Aidong 반응.
- route encounter 고도화.
- ship cargo/harbor unload economy.
- social login 실제 활성화.
- shop, 출석, 룰렛, 미션.
- myroom gallery 고도화.

### 보류

- 세관 UI 강제 gate 복귀.
- Atlas 전환.
- backend 서버 물리 분리.
- ship/lodge inventory 즉시 삭제.
- destination-shell-island 삭제.
- 항해 세션 상태를 DB에 저장하지 않는 전제에서 보드 크기, 이동 규칙, landing payload 확정.
- SUNO, realtime AI, UGC, fandom, 광고 연동.

### 기획 필요

- stage/debut 결과 모델.
- 포토카드 생성 정책과 CDN signed URL.
- 25개 도감템 실제 데이터.
- upgrade recipe와 economy.
- 13개 구역 역할.
- 항해 encounter payload와 세션 내 landing 후보 처리 방식.
- dynamic Aidong zone과 15구역 관계.
- shop/BM/currency.
- Pixi/Rive asset pipeline.

## 15. 오래된 문서들이 왜 삭제되었는가

`.cloud`에는 개발 과정에서 만든 날짜별 next_work, 임시 충돌 지도, 임시 설계 메모가 많았다.

그 문서들은 당시에는 필요했지만, 지금 기준으로는 다음 문제가 있다.

- 이미 완료된 작업이 미완료처럼 보인다.
- 6월 이전 세관 UX나 dynamic zone 방향이 현재 기준처럼 보일 수 있다.
- 신규 개발자가 최신 보드를 찾기 어렵다.
- Codex가 오래된 문서를 읽고 현재 구현 방향과 다른 제안을 할 수 있다.

그래서 오래된 히스토리성 문서는 이 문서에 요약하고 삭제한다.

보존하는 문서는 세 종류다.

1. 현재 구현 방향을 설명하는 히스토리 문서.
2. 신규 개발자 온보딩 문서.
3. 로드맵과 최신 실행 보드.
4. 실제 작업 규칙과 runbook 문서.

## 16. 앞으로 Codex가 지켜야 할 현재 기준

Codex는 다음 기준에서 벗어나면 안 된다.

- `/api/state`를 되살리지 않는다.
- backend는 하나의 서버로 유지하고 module 경계를 코드 안에서 나눈다.
- module service가 다른 module document를 직접 수정하지 않는다.
- frontend module code가 `userStore`를 직접 import하지 않는다.
- 마이섬은 고정 15구역이고, 항구/숙소는 anchor다.
- Aidong 영입과 마이섬 편입은 분리한다.
- `codexStates`에 아이템 수량을 넣지 않는다.
- 세관 backend는 유지하지만 Phase 1 UX에서 강제 gate로 되돌리지 않는다.
- ship/lodge/destination POC는 무작정 삭제하지 않고 compat/dev/보류로 분류한다.
- PixiJS/Rive는 일부 scene/연출에만 부분 적용한다.
- 항해 중/정박 중 여부와 현재 칸 같은 런타임 항해 상태를 DB에 저장하지 않는다.
- 한글 문서를 수정하면 깨짐 문자 검사를 한다.
- 현재 작업은 `.cloud/89_next_work_2026-07-01.md`에서 이어간다.

## 17. 변경 기록

- **2026-06-13**: `.cloud` 문서 정리를 위해 지금까지의 작업 히스토리를 현재 구현 기준으로 요약했다. 오래된 next_work, 임시 충돌 지도, 임시 설계 조각이 Codex와 신규 개발자를 혼란스럽게 하지 않도록 이 문서를 기준 히스토리로 세웠다.
- **2026-06-13**: 새 모듈 제작자가 따라갈 수 있는 `.cloud/02_module_creator_guide_2026-06-13.md`를 기준 문서로 추가했다.
- **2026-06-13**: 항해 세션 권위 결정을 추가했다. 출항/정박 여부, 현재 route, 현재 칸, 세션 내 landing 후보는 DB가 아니라 브라우저 탭/창별 세션 상태로 관리하고, DB에는 주사위 소모와 보상 지급 같은 영속 결과만 기록한다.
- **2026-06-13**: 항해 세션 권위 구현 완료 상태를 반영했다. frontend `voyageSessionStore`, 항구/항해 화면, route-neighbor backend 계약, ship lock 제거, sync/persist 제외, Playwright smoke 기준을 현재 구현 기준으로 기록했다.