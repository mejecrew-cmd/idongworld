# Frontend Rules

이 문서는 frontend 작업자가 module UI, Zustand store, backend API sync를 다룰 때 지켜야 하는 규칙을 정리한다.

## 0. 2026-06-08 기획 변경 반영

2026-06-05 기획 변경 회의 이후 frontend 작업은 다음 기준을 우선한다.

- Phase 1 화면은 숙소 중심 육성 허브, 통 인벤토리, 아이동별 도감 아이템, 가변 메인 구역, 구역 배치 자동 생산을 우선한다.
- customs popup과 destination island 이탈 gate는 이전 POC 기준이며, 새 사용자 핵심 루프에서는 필수 gate로 더 강화하지 않는다.
- 항구/항해/도착 섬 UI는 삭제하지 않고, 새 항해 보드 결정과 통 인벤토리 설계 이후 숨김·축소·재사용 여부를 정한다.
- 기존 Playwright smoke의 세관 관련 항목은 새 core loop smoke로 재설계할 예정이다.
- Phase 1 화면 우선순위는 숙소 허브, 메인 가변 구역, 항해 만남/수집, 통 인벤토리, 구역 배치 생산, 항구 입항/비우기 순서로 본다.
- 상세 core loop와 화면별 역할은 `.cloud/53_core_loop_2026-06-08.md`를 따른다.
- 웹 UI/UX 방향은 `.cloud/63_web_ui_ux_direction_2026-06-08.md`를 따른다. 웹은 모바일 게임 축소판이 아니라 깊이 있는 생활 육성 UI로 설계한다.
- 주요 frontend 화면 영향도와 화면 작업 순서는 `.cloud/65_frontend_screen_impact_2026-06-08.md`를 따른다.
- 검증과 테스트 재정렬 기준은 `.cloud/66_validation_test_realignment_2026-06-08.md`를 따른다.
- 숙소 허브 화면의 방/마당/케어/연습/꾸미기/업그레이드 기준은 `.cloud/57_lodge_growth_hub_2026-06-08.md`를 따른다.
- 구역 배치 자동 생산 화면 기준은 `.cloud/58_zone_placement_production_2026-06-08.md`를 따른다.
- 아이동별 미니게임 스킨 화면 기준은 `.cloud/59_aidong_minigame_skin_model_2026-06-08.md`를 따른다.
- 세관 UI 노출 정책은 `.cloud/56_customs_descope_2026-06-08.md`를 따른다. 기본값은 customs backend 유지, 사용자 필수 gate 비활성화다.
- Phase 1 core route에서는 세관 버튼, 세관 팝업, 모듈 이탈 세관 gate를 기본 노출하지 않는다.
- 세관 UI는 `VITE_CUSTOMS_UI_ENABLED=true`, zone 이탈 gate는 `VITE_CUSTOMS_EXIT_GATE_ENABLED=true`, destination island 이탈 gate는 `VITE_DESTINATION_ISLAND_CUSTOMS_GATE_ENABLED=true`일 때만 compat/dev 경로로 노출한다.
- 충돌 분류는 `.cloud/52_plan_change_conflict_map_2026-06-08.md`, 새 작업 순서는 `.cloud/51_next_work_2026-06-08.md`를 따른다.

## 1. 현재 스택

- Vite
- React 18
- TypeScript
- React Router
- MUI
- Zustand
- i18next

## 2. 시작 흐름

- `main.tsx`에서 module registry를 등록하고 각 bootstrap을 실행한다.
- `moduleRegistry.ts`는 manifest 등록과 검증을 담당한다.
- `*Bootstrap.ts` 파일은 module config/action hook을 `useUserStore`, UI, event bus, backend API와 연결한다.
- frontend는 module package와 app shell 사이의 glue layer 역할을 한다.

## 3. Zustand 규칙

- 현재 주요 유저 상태는 `packages/frontend/src/stores/userStore.ts`에 있다.
- `persist({ name: 'idongworld-user' })`로 localStorage에 저장된다.
- frontend store는 당장 물리 분리하지 않는다. 단일 Zustand store를 유지하고 module facade를 먼저 사용한다.
- module별 접근 경계는 `packages/frontend/src/lib/storeFacades.ts`에 둔다.
- 신규 frontend runtime code는 `useUserStore` 직접 import보다 `accountStoreFacade`, `hostStoreFacade`, `myAidongStoreFacade` 같은 facade를 우선 사용한다.
- 기존 `useUserStore` 직접 import는 관련 화면이나 bootstrap을 수정할 때 점진적으로 facade로 이동한다.
- store 전체를 backend 통합 state로 밀어 넣지 않는다.
- `syncStore.ts`는 account, host, module 전용 API로 slice를 나누어 hydrate/flush한다.
- 신규 module code는 가능한 한 module facade, action hook, bootstrap 주입 함수를 사용한다.
- module package 내부에서 app-level `userStore`나 `lib/api.ts`를 직접 import하지 않는다.
- 직접 store 접근이 필요하면 app frontend bootstrap에서 module `configure()` hook으로 주입한다.

## 4. userStore 주요 범위

- auth: `firebaseUid`, `nickname`, `isGuest`.
- host resource: `coins`, `diamonds`, `gems`, `diceCount`, `inventory`.
- progress: `onboardingComplete`, `hostName`.
- aidong: `recruitedAidongs`, `firstGachaCandidate`, `firstGachaAttempts`, `affinities`, `needs`, `careLog`, `equippedOutfit`, `equippedItems`.
- island/codex: `unlockedZones`, `unlockedDiaries`, `unlockedCodexEntries`, `codexFullyRegistered`.
- voyage: `currentRoute`, `boardPosition`, `harborAssignedChars`, `harborLastChargedAt`.

## 5. Sync 규칙

- frontend sync는 항상 account, host, module 전용 API를 사용한다.
- `VITE_SPLIT_STATE_SYNC`는 더 이상 frontend sync 경로를 바꾸는 rollback flag로 사용하지 않는다.
- `lib/api.ts`에는 frontend용 통합 state client를 추가하지 않는다.
- `SYNCED_KEYS`에 field를 추가할 때는 해당 field의 backend 소유권도 함께 확인한다.
- account 성격의 field는 account API로 보낸다.
- host resource와 inventory는 host API로 보낸다.
- module-local state는 `/api/modules/{moduleId}/state`로 보낸다.
- rule-heavy 상태 변경은 module action API로 보낸다.

## 6. API Client 규칙

- frontend API 호출은 `packages/frontend/src/lib/api.ts`를 중심으로 관리한다.
- 신규 API는 가능하면 명시적인 method 이름으로 추가한다.
- host resource 변경은 host API를 사용한다.
- module-local 상태 변경은 module state API 또는 module action API를 사용한다.
- cross-module resource 이동은 customs API를 사용한다.
- Phase 1 사용자 핵심 루프에서는 customs popup을 필수 gate로 새로 강화하지 않는다.
- customs UI가 필요한 경우 `VITE_CUSTOMS_UI_ENABLED`, `VITE_CUSTOMS_EXIT_GATE_ENABLED`, `VITE_DESTINATION_ISLAND_CUSTOMS_GATE_ENABLED` 같은 명시적 flag 뒤에 둔다.
- frontend에서 다른 module state를 임의로 patch하지 않는다.
- action API 응답은 `actionApiSync.ts` 또는 module facade를 통해 Zustand에 merge한다.
- action API rollback이 필요할 때만 `VITE_MODULE_ACTION_API_SYNC=false`를 사용한다.
- Aidong item 착용은 `api.toggleAidongEquippedItem`을 사용하고, host inventory 검증 없이 `equippedItems`를 직접 patch하지 않는다.
- route landing 보상 처리는 `api.clearRouteLanding`을 우선 사용하고, frontend 직접 보상 지급은 fallback으로만 둔다.
- Google/Twitter 로그인은 `VITE_SOCIAL_LOGIN_ENABLED=true`일 때만 실제 Firebase popup을 연다.
- `VITE_SOCIAL_LOGIN_ENABLED` 기본값은 `false`이며, 이때 LoginScreen은 준비중 메시지를 보여준다.
- social login을 켜기 전에는 Firebase Console provider, redirect domain, backend Firebase Admin env를 먼저 준비한다.

## 7. Module 연결 규칙

- 광역 module은 bootstrap에서 `useUserStore`와 backend API를 연결한다.
- 시스템 module은 DI/config로 렌더러, confirm UI, trigger handler, persistence hook을 주입받는다.
- 콘텐츠 module은 직접 전역 상태를 수정하기보다 시스템/광역 module action을 호출한다.
- module 간 직접 import는 가능한 한 줄인다.
- route를 추가할 때는 manifest `route`와 React route path를 함께 확인한다.
- route prefix 충돌은 registry validation으로 잡히도록 manifest를 갱신한다.

## 8. Module Action 규칙

- `my-aidong` 영입, 호감도, 착용 변경은 `my-aidong` action API를 사용한다.
- Aidong 소유 item 착용은 `/api/modules/my-aidong/items/equip-toggle`을 사용한다.
- `my-island` zone unlock과 tutorial completion은 `my-island` action API를 사용한다.
- `codex` diary unlock, slot unlock, full registration은 `codex` action API를 사용한다.
- `route-neighbor` roll은 route start 이후에만 실행되도록 frontend에서도 호출 순서를 지킨다.
- `route-neighbor` resource/treasure landing 처리는 `/api/modules/route-neighbor/landing/clear`를 우선 사용한다.
- `ship` harbor assign과 charge는 ship action API를 사용한다.
- zone local resource 수집과 clear 진행은 `/api/modules/{zoneId}/collect`, `/api/modules/{zoneId}/clear`를 사용한다.
- zone action API는 zone-local state만 갱신한다. host 보상은 host API, module 간 자원 변환은 customs API를 사용한다.

## 9. UI 규칙

- 기존 MUI theme와 component pattern을 따른다.
- 웹에서는 넓은 화면과 여러 패널을 적극 활용한다.
- 모바일 화면도 대응하되, 모든 화면을 모바일 폭에 맞춰 억지로 단순화하지 않는다.
- 게임/툴 화면은 실제 플레이 가능한 화면을 우선한다.
- 불필요한 landing page나 설명 UI를 추가하지 않는다.
- 도구성 화면은 스캔하기 쉽고 조작하기 쉽게 구성한다.
- Phase 1 UI는 아기자기하지만 반복 관리가 편한 정보 밀도를 가진다.
- route 분리는 유지보수와 smoke 안정성을 위한 기준이며, 복잡한 내부 modal 상태까지 딥링크로 표현하는 것은 목표가 아니다.
- 멀티탭/멀티세션은 사용 가능하다고 보고, frontend는 action 후 backend 응답 병합과 stale state 가능성을 고려한다.
- 텍스트가 버튼, 카드, 패널 밖으로 넘치지 않게 한다.
- 숙소 화면은 Phase 1의 핵심 허브로 보고, 방 카드, 마당 목록, 선택 Aidong 상세, 케어/연습/꾸미기/업그레이드 진입을 우선 배치한다.
- 항해 중이거나 구역 배치 중인 Aidong은 숙소에서 상태 badge를 보여주고, 직접 케어/연습 가능 여부는 명확히 disabled 처리한다.
- 구역 생산 화면은 배치 슬롯, 배치 후보 Aidong, 시간당 예상 생산량, 누적 생산량, 회수 버튼, 효율 badge를 기본 요소로 둔다.
- 비효율 배치는 숨기지 말고 경고 badge나 색상으로 보여준다.
- 미니게임 화면은 공통 engine component와 Aidong별 skin layer를 분리한다.
- 미니게임 skin은 배경, 오브젝트, 문구, 보상 표시, 입장재 표시를 바꾸되 결과 payload 구조는 engine 기준을 유지한다.
- `MiniGameModal`을 확장할 때는 `engineId`, `skinId`, `characterId`를 받을 수 있는 구조를 우선 검토한다.

## 10. 검증 규칙

frontend 변경 후 기본 검증:

```bash
pnpm --filter frontend typecheck
```

backend sync나 API 호출 경로를 바꾼 경우:

```bash
pnpm audit:legacy-state
pnpm check:state-route-static
```

frontend runtime까지 확인해야 하는 경우:

```bash
pnpm dev:mongo:local
pnpm dev:be
pnpm dev:fe
pnpm check:frontend:state-route-runtime
```

local Mongo, backend, frontend를 한 번에 띄워 확인하려면 다음 명령을 우선 사용한다.

```bash
pnpm check:state-route-runtime:local
```

브라우저 기반 최소 화면 smoke가 필요하면 backend와 frontend를 띄운 뒤 다음 명령을 사용한다.

```bash
pnpm check:e2e:smoke
```

현재 Playwright smoke 기준:

- `/`에서 `/login`으로 이동하는지 확인한다.
- `게스트로 시작` 클릭 후 `/title`로 이동하는지 확인한다.
- `/island`, `/island/lodge`, `/island/harbor`, `/island/full-map`, `/voyage/board`, `/dev/catalog`가 브라우저에서 열리는지 확인한다.
- `/voyage/island/shell` 같은 destination island POC route는 Phase 1 core route가 아니라 compat/dev route smoke 후보로 본다.
- 2026-06-08 이후 Phase 1 smoke에서는 세관 팝업을 필수 통과 조건으로 삼지 않는다.
- 기존 세관 UI smoke는 backend customs 검증 또는 dev/검증 경로용 smoke로 분리한다.
- 항구/숙소에 세관 편의 버튼을 두지 않는다.
- 세관 UI를 다시 켤 때만 전용 자원/아이템을 가진 모듈 이탈 gate, 내 섬 구역 rule, destination-island 계열 갑판 적재 rule을 별도로 확인한다.
- 테스트 중 `/api/state` 호출이 발생하면 실패한다.
- 이 E2E는 최소 smoke이며, first gacha, lodge item 착용, route landing clear, customs UI 세부 조작은 별도 확장 대상으로 둔다.

customs UI 기준:

- 이 기준은 `VITE_CUSTOMS_UI_ENABLED=true` 또는 dev/검증 경로에서만 적용한다.
- 모듈 인벤토리 변환은 가운데 팝업으로 표시한다.
- 팝업 위쪽은 source module inventory를 보여준다.
- 팝업 아래쪽은 선택한 item에서 변환 가능한 customs rule을 보여준다.
- 사용자는 rule별 `변환` 또는 `모두 변환`을 실행할 수 있어야 한다.
- 실제 자원 이동은 항상 `/api/customs/apply`를 통해 수행한다.

Vite가 기본 포트가 아닌 포트를 쓰면 `FRONTEND_URL`을 지정한다.

```bash
FRONTEND_URL=http://localhost:5174 pnpm check:frontend:state-route-runtime
```

최소 플레이 플로우 확인:

- login/guest 이후 uid와 account state가 유지되는지 확인한다.
- onboarding 이후 host name과 초기 zone 접근이 깨지지 않는지 확인한다.
- first gacha 또는 Aidong recruit 이후 화면과 `my-aidong` action sync가 맞는지 확인한다.
- zone clear 이후 host reward가 frontend 직접 지급이 아니라 backend 응답 병합으로 반영되는지 확인한다.
- codex unlock/register, route-neighbor action, ship action 화면 흐름이 API split 이후에도 막히지 않는지 확인한다.
- 이 목록은 전체 QA가 아니라 frontend/backend 연결의 최소 smoke다.
- 2026-05-29 실행 결과는 `.cloud/39_screen_qa_2026-05-29.md`에 기록한다.

## 변경 기록

- **2026-06-08**: 세관 UI/UX 제거 구현 기준을 추가했다. Phase 1 core route에서는 세관 버튼과 팝업을 기본 노출하지 않고, 관련 UI는 feature flag 뒤의 compat/dev 경로로만 둔다.
- **2026-06-08**: 검증과 테스트 재정렬 문서 `.cloud/66_validation_test_realignment_2026-06-08.md`를 연결했다. `check:e2e:smoke`는 core route smoke와 compat/dev route smoke로 해석을 나누고, destination island POC route는 Phase 1 필수 route로 보지 않는다.
- **2026-06-08**: Frontend 화면 영향도 조사 문서 `.cloud/65_frontend_screen_impact_2026-06-08.md`를 연결했다. `LodgeScene`, `IslandFullMapScreen`, `NavigationBoardScene`, `HarborScene`, `BottomNav`, `DestinationIslandScreen` 순서로 화면 작업 우선순위를 확인한다.
- **2026-06-08**: 웹 UI/UX 방향 문서 `.cloud/63_web_ui_ux_direction_2026-06-08.md`를 연결했다. 모바일 게임 축소판이 아니라 넓은 화면과 패널을 활용하는 웹형 생활 육성 UI 기준을 추가했다.
- **2026-06-08**: 아이동별 미니게임 스킨 화면 기준을 연결했다. 미니게임은 공통 engine component와 Aidong별 skin layer를 분리하고, 결과 payload는 engine 기준을 유지한다.
- **2026-06-08**: 구역 배치 자동 생산 화면 기준을 연결했다. 생산 구역 UI는 배치 슬롯, 예상 생산량, 누적 생산량, 회수 버튼, 효율/비효율 표시를 우선한다.
- **2026-06-08**: 숙소 중심 육성 허브 기준을 연결했다. 숙소 화면은 방 카드, 마당, 선택 Aidong 상세, 케어·연습·꾸미기·업그레이드 진입을 우선하는 Phase 1 핵심 화면으로 본다.
- **2026-06-08**: Customs De-scope 기준을 추가했다. Phase 1 smoke와 frontend 기본 UX에서는 세관 팝업을 필수 gate로 삼지 않고, 세관 UI는 명시적 flag 또는 dev/검증 경로 뒤에 둔다.
- **2026-06-08**: 기획 변경 회의 이후 frontend Phase 1 기준을 추가했다. 세관 팝업과 destination island 이탈 gate는 POC/보류 후보로 낮추고, 숙소 중심 육성 허브와 통 인벤토리 흐름을 우선한다.
- **2026-06-08**: Phase 1 core loop와 화면 우선순위 기준으로 `.cloud/53_core_loop_2026-06-08.md`를 연결했다.
- **2026-05-29**: 최소 플레이 플로우 확인 항목을 추가했다. login, onboarding, gacha/recruit, zone clear, codex, route/ship 흐름은 전체 QA 전의 smoke 기준으로 본다.
- **2026-06-01**: Aidong item 착용과 route landing clear의 frontend 연결 기준을 추가했다. 숙소 화면은 `toggleAidongEquippedItem`, 항해 보드는 `clearRouteLanding` action API를 우선 사용한다.
- **2026-06-01**: Playwright 기반 최소 E2E smoke 기준을 추가했다. `pnpm check:e2e:smoke`는 guest login, 주요 route 진입, legacy `/api/state` 호출 부재를 브라우저에서 검증한다.
- **2026-06-01**: 세관 팝업 UI 기준을 출구 게이트 방식으로 수정했다. 항구/숙소 편의 버튼이 아니라, 전용 자원/아이템을 가진 모듈을 떠나기 직전에 열고 전용 인벤토리가 빌 때까지 `나가기`를 막는다.
- **2026-06-01**: 세관 팝업 rule 노출 기준을 보강했다. 내 섬 구역에서는 갑판 적재 rule을 숨기고, 배를 타고 도달한 구역에서만 배/갑판 관련 rule을 보여준다.
- **2026-06-01**: 배 인벤토리 맥락의 세관 진입 기준을 추가했다. 항구 메인 편의 버튼은 두지 않되, `shipInventory`에 보유 자원이 있을 때 배 인벤토리 팝업 안에서 세관으로 들어갈 수 있다.
- **2026-05-29**: 실제 화면 기준 QA의 runtime gate 기준을 보강했다. `pnpm check:state-route-runtime:local`을 우선 실행하고, 결과는 `.cloud/39_screen_qa_2026-05-29.md`에 기록한다.
- **2026-05-29**: Google/Twitter social login skeleton 기준을 추가했다. 기본 UI는 준비중으로 유지하고, `VITE_SOCIAL_LOGIN_ENABLED=true`와 Firebase provider 설정이 모두 준비된 뒤 실제 popup을 활성화한다.
- **2026-05-29**: Frontend store 물리 분리는 보류하고 `storeFacades.ts`를 module별 접근 경계로 사용하는 규칙을 추가했다.
- **2026-05-29**: frontend legacy fallback 제거 상태에 맞춰 문서를 전면 정리했다. `syncStore.ts`는 전용 API sync만 사용하고, `VITE_SPLIT_STATE_SYNC`는 rollback flag로 쓰지 않는다는 규칙을 명시했다.
- **2026-05-24**: zone, codex, my-island frontend가 module action API를 우선 사용하도록 migration 방향을 기록했다.
## PixiJS 부분 도입 규칙

- PixiJS는 프론트 전체를 대체하는 기본 UI 엔진으로 사용하지 않는다.
- PixiJS는 화려한 연출이 필요한 장면에 한해 부분적으로 사용한다.
- 우선 적용 후보는 항해 도중 도착하는 `destination-island` 탐험 화면, 미션 완료 연출, 보상 획득 연출, 오브젝트 조사 연출이다.
- React/MUI는 routing, HUD, 버튼, 팝업, 인벤토리, 세관, mission modal 같은 정보 UI를 계속 담당한다.
- PixiJS는 배경/전경 레이어, 파티클, 빛, 물결, 안개, hover/click effect, 상하좌우 지역 이동 transition 같은 scene effect를 담당한다.
- PixiJS scene state는 backend 저장 상태와 직접 결합하지 않는다. backend action API 호출은 React screen/container 계층에서 담당한다.
- PixiJS 내부 오브젝트 id는 module item catalog, hotspot id, mission id와 명확히 매핑해야 한다.
- 모바일 성능을 위해 particle 수, filter 수, blur 강도, texture 크기를 제한한다.
- 텍스트가 많은 설명, 접근성이 필요한 조작, 확정/취소 dialog는 PixiJS가 아니라 React overlay로 만든다.

## Rive 사용 규칙

- Rive는 캐릭터 리깅과 UI/오브젝트 반응 애니메이션의 1차 선택지로 사용한다.
- Spine과 Live2D는 작업량이 크므로 현재 단계에서는 기본 도입하지 않는다.
- 섬 탐험에서 Aidong이 직접 걸어 다니지 않는 한 Spine은 보류한다.
- 숙소, 선실, 케어, 보상, 세관, 버튼, hotspot 반응처럼 짧고 반복 가능한 애니메이션은 Rive를 우선 검토한다.
- Rive는 `idle`, `happy`, `sad`, `tap`, `care`, `reward`, `disabled`, `available` 같은 state machine 중심으로 설계한다.
- Rive 애니메이션은 backend state를 직접 변경하지 않는다. React component가 Rive state input을 조작하고 backend action API 호출을 담당한다.
- PixiJS scene 안에서 Rive asset을 직접 섞기 전에, React overlay 또는 Pixi texture 변환 방식 중 유지보수가 쉬운 쪽을 먼저 검토한다.
- Rive 파일은 module asset catalog와 연결 가능한 id를 가져야 한다.

## 변경 기록

- **2026-06-05**: PixiJS를 프론트 전체 엔진이 아니라 destination island와 미션/보상/조사 같은 화려한 연출이 필요한 장면에만 부분 도입하는 원칙을 추가했다.
- **2026-06-05**: Spine/Live2D 대신 Rive를 캐릭터 반응, UI, 오브젝트 애니메이션의 1차 선택지로 쓰는 규칙을 추가했다.
