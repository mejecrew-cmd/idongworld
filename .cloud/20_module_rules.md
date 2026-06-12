# Module Rules

## Current SoT Reading Order 2026-06-12

신규 모듈 작업은 6/8 이전 next_work가 아니라 6/11 사이트맵과 6/12 로드맵을 우선한다.

읽기 순서는 다음과 같다.

1. `.cloud/개발기획서260605/사이트맵_260611_최종확정.md`
2. `.cloud/개발기획서260605/_직접작성본/00_아이동월드_중앙기획서.md`
3. `.cloud/개발기획서260605/_직접작성본/02_처리목록_총목록.md`
4. `.cloud/개발기획서260605/모듈상세_M03_마이섬허브_260608.md`부터 M09, M21, M22까지의 모듈 상세 문서
5. `.cloud/71_roadmap_2026-06_260612.md`
6. `.cloud/72_next_work_2026-06-12_week1_a.md`

중앙기획서가 가리키는 누락 문서와 링크 보정 후보는 `.cloud/73_sot_missing_docs_audit_2026-06-12.md`를 따른다.

## Phase 1 Planning Change Notice 2026-06-08

2026-06-05 기획 변경 회의 이후 모듈 규칙은 다음처럼 읽는다.

- 모듈 package, manifest, backend route/service/repository 경계는 유지한다.
- 세관(customs)은 기술 infra와 미래 확장 후보로 보존하지만, Phase 1 사용자 핵심 루프에 강제하지 않는다.
- "모듈 간 자원 이동은 customs"라는 기존 문구는 production급 cross-module debit/credit에 대한 기술 원칙으로 유지하되, 새 Phase 1 기획의 통 인벤토리·아이동 귀속 인벤토리 설계가 확정되기 전까지 신규 UX에 강제하지 않는다.
- destination-island, ship/lodge inventory 분리, worldScope 기반 세관 목적지 판단은 POC/보류 후보로 분류한다.
- 새 구현 순서는 `.cloud/51_next_work_2026-06-08.md`, 충돌 분류는 `.cloud/52_plan_change_conflict_map_2026-06-08.md`를 따른다.

## Backend Ownership Rules 2026-05-24

- A module that needs backend state should have an explicit model/spec entry and repository ownership.
- Use dedicated repositories for module state that is expected to grow or needs validation/indexes: `my-aidong`, `my-island`, `codex`, `route-neighbor`, `ship`, and zone modules already follow this path.
- Modules without dedicated storage may use the common `moduleStates` fallback, but that should be treated as a temporary or lightweight storage path.
- Module action APIs should live under `packages/backend/src/modules/{module-id}` with route parsing separated from service logic.
- Module actions may call host/customs adapters, but they must not directly edit another module's document.
- Resource conversion, debit/credit, idempotency, and audit logs belong to customs.
- New module backend work must update `packages/backend/src/modules/modelSpecs.ts`, repository registry, and model spec checks when storage ownership changes.

## Dedicated Storage And API Rules 2026-05-24

- 신규 모듈이 user별 runtime state를 가진다면 먼저 저장 ownership을 정한다.
- 단순하고 임시적인 local state는 `moduleStates` fallback을 쓸 수 있지만, 장기 기능은 전용 repository/model/spec로 시작하는 것을 우선한다.
- 전용 저장소를 쓰는 모듈은 `packages/backend/src/modules/modelSpecs.ts`에 model spec을 추가하고 `packages/backend/src/repositories/moduleRepositoryRegistry.ts`에 repository ownership을 등록한다.
- 모듈 API는 `/api/modules/{moduleId}` 아래에 둔다. 예: `/api/modules/zone-garden/state`, `/api/modules/zone-garden/collect`.
- 모듈 action API는 자기 document만 수정한다. 다른 모듈 document, host resource, inventory를 직접 patch하지 않는다.
- host 자원 변경은 host API/resource adapter를 통하고, 모듈 간 자원 이동은 customs를 통한다.
- action API가 domain rule을 가진다면 generic state patch 대신 `routes.ts` + `service.ts` 조합으로 구현한다.
- route는 request parsing과 HTTP response mapping을 담당하고, validation과 state transition은 service에 둔다.
- frontend module code는 가능한 한 자기 module facade/action API를 호출하고, legacy `/api/state`나 userStore 전체 patch에 의존하지 않는다.
- 신규 모듈 개발 완료 조건에는 model spec, repository 등록, API route, frontend facade/action 연결, legacy state audit 통과를 포함한다.
- 모듈 개발자가 바로 참고할 작업 지침은 `packages/modules/BACKEND_GUIDE.md`에 둔다.

이 문서는 모듈을 추가하거나 수정할 때의 규칙이다.

## 모듈 분류

### Global Module

광역 모듈은 항상 활성인 사용자/월드 단위 상태의 논리적 소유자다.

현재 광역 모듈:

- `host`
- `account`
- `my-aidong`
- `my-island`
- `codex`
- `ship`

규칙:

- manifest `kind`는 `global`이다.
- `storeSlice`는 필수다.
- `storeSlice`는 현재 실제 Zustand slice가 아니라 논리적 소유권 메타데이터다.
- 광역 모듈은 다른 모듈이 직접 수정하면 안 되는 전역 상태의 public action/facade를 제공해야 한다.
- 광역 모듈별 Zustand store는 아직 물리 분리하지 않는다. 현재는 app bootstrap과 `storeFacades.ts`가 단일 `useUserStore`와 모듈 action을 연결한다.

### System Module

시스템 모듈은 재사용 가능한 엔진 또는 규칙 처리기다.

현재 시스템 모듈:

- `vn-runner`
- `gacha`
- `cutscene-runner`
- `customs`

규칙:

- manifest `kind`는 `system`이다.
- `exports`에 외부에서 사용할 API 표면을 명시한다.
- 시스템 모듈은 특정 콘텐츠 데이터에 종속되지 않아야 한다.
- 시스템 모듈은 DI/config hook을 통해 앱 런타임과 연결한다.

### Content Module

콘텐츠 모듈은 특정 구역, 항로, 이벤트, 미니게임 등 구체적 콘텐츠 단위다.

현재 콘텐츠 모듈:

- `zone-garden`
- `zone-oasis`
- `zone-memory`
- `zone-mine`
- `route-neighbor`
- `lodge`

규칙:

- manifest `kind`는 `content`다.
- 사용하는 시스템 모듈은 `requires`에 명시한다.
- route가 있으면 manifest `route`에 base path를 명시한다.
- i18n namespace는 모듈 ID를 기본값으로 하되, 필요하면 `i18nNamespace`에 명시한다.
- 콘텐츠 모듈의 로컬 자원은 기본적으로 해당 모듈 내부에서 닫혀 있어야 한다.
- 다른 모듈이나 host 자원으로 반출입하려면 customs를 사용한다.

## 위치 구분 규칙

- 항해, 세관, 숙소 이동 판단이 필요한 모듈은 manifest에 `worldScope`를 선언한다.
- `home-island`는 내 섬 안의 구역이다.
- `destination-island`는 배를 타고 도착하는 외부 섬의 구역이다.
- `voyage-route`는 주사위 항해 경로와 보드 진행 상태다.
- `ship`은 배 자체와 배 인벤토리, 선실, 갑판 상태다.
- `lodge`는 내 섬 숙소와 숙소 인벤토리 상태다.
- 현재 `zone-garden`, `zone-oasis`, `zone-memory`, `zone-mine`은 `home-island`다.
- 현재 `route-neighbor`는 다른 섬이 아니라 항해 경로이므로 `voyage-route`다.
- 정식 항해 보상 루프는 `destination-island -> ship -> lodge` 세관 흐름을 기본으로 따른다.
- 전역 보관 대상 아이템은 `home-island`와 `destination-island` 양쪽에서 세관을 통해 `hostStates.inventory`로 직접 이동할 수 있다.
- 자세한 기준은 `packages/modules/WORLD_SCOPE_GUIDE.md`를 따른다.

## Manifest 작성 규칙

- `id`, `kind`, `name`, `version`은 필수로 본다.
- `id`는 변경 비용이 크므로 신중히 정한다.
- `version`은 semver 형식을 따른다.
- `description`은 dev tool에서 읽을 수 있도록 간단히 유지한다.
- 위치 의미가 있는 모듈은 `worldScope`를 선언한다.
- `balance`, `customs`는 모듈 루트 기준 상대 경로를 사용한다.
- 신규 manifest 추가 후 `packages/frontend/src/lib/moduleRegistry.ts`에 등록한다.
- 등록 후 `pnpm typecheck`로 검증한다.

## Store Slice 규칙

- `storeSlice`는 “이 모듈이 소유하는 논리적 상태 영역”을 의미한다.
- 현재 `storeSlice` 표시는 dev tool의 모듈 분리현황에서 manifest metadata로만 렌더링된다.
- `storeSlice: 'host'`가 있다고 해서 실제 Zustand store가 `host` slice로 물리 분리되어 있다는 뜻은 아니다.
- frontend store는 당장 물리 분리하지 않고 `packages/frontend/src/lib/storeFacades.ts`의 module facade를 통해 접근한다.
- 신규 module 연결 코드는 `useUserStore` 내부 필드에 직접 기대지 않고 facade/action/config hook 표면에 의존한다.
- 앞으로 store를 분리할 때도 외부 모듈은 내부 slice 구조에 의존하지 않고 actions/facade를 통해 접근해야 한다.

## Bootstrap 규칙

- 프론트엔드 runtime 연결은 `packages/frontend/src/lib/*Bootstrap.ts`에서 한다.
- 모듈 내부 코드는 가능하면 `useUserStore`를 직접 import하지 않는다.
- 신규 runtime code는 module package에서 app-level `useUserStore`를 직접 import하지 않는다. 직접 store 접근은 `storeFacades.ts`와 app bootstrap 경계에 둔다.
- app frontend bootstrap에서 user 상태가 필요하면 `storeFacades.ts`의 module facade를 먼저 사용한다.
- bootstrap은 `main.tsx`에서 앱 시작 시 한 번 호출되는 구조를 유지한다.

## Customs 규칙

- 모듈 경계를 넘는 자원 이동은 customs를 통과해야 한다.
- 콘텐츠 모듈은 자기 로컬 자원을 직접 host inventory/coins/gems에 반영하지 않는다.
- customs rule은 모듈별 `customs.csv` 또는 명시된 manifest 경로에 둔다.
- 세관 통과 전의 로컬 자원은 원칙적으로 UserDoc의 전역 자원으로 반영하지 않는다.
- 전역 보관 대상 아이템을 module-local inventory에서 `hostStates.inventory`로 옮길 때도 반드시 customs를 통과한다.
- Atlas 또는 replica set에서 transaction 지원이 확인되면 customs debit/credit은 transaction으로 처리한다. local standalone MongoDB에서는 보상 rollback과 audit log를 함께 확인한다.

## Aidong Item 규칙

- Aidong 소지/착용 아이템의 소유권은 `hostStates.inventory`가 가진다.
- Aidong 착용 상태는 `myAidongStates.equippedItems`가 가진다.
- `myAidongStates.equippedOutfit`은 Phase 1 화면 외형 프리셋으로 유지한다.
- 착용 가능 Aidong item 목록은 `packages/modules/my-aidong/items.csv`에 둔다.
- Aidong item catalog scope는 `aidong-global`을 사용한다.
- module-local inventory에서 Aidong item을 얻으면 customs를 통해 `hostStates.inventory`로 이동한 뒤 착용한다.
- 착용 API는 host inventory의 가용 수량을 검증해야 한다.
- 신규 모듈은 Aidong 착용 상태를 자기 module-local state에 저장하지 않는다.

## i18n 규칙

- 모듈별 i18n namespace를 유지한다.
- 현재는 `ko`, `en` 중심으로 파일이 존재한다.
- 문구는 모듈 내부 i18n 폴더에 둔다.
- 공통 문구라도 무분별하게 전역화하지 않는다. 반복이 의미 있게 커질 때만 공통화한다.

## 모듈 추가 체크리스트

- `packages/modules/{module-id}/package.json`
- `packages/modules/{module-id}/manifest.ts`
- `src/index.ts`
- 필요한 경우 `src/config.ts`, `src/actions.ts`, `src/types.ts`
- 필요한 경우 `src/routes.tsx`
- 필요한 경우 `balance.csv`, `customs.csv`
- `i18n/ko.json`, `i18n/en.json`
- `tsconfig.json`
- `packages/frontend/src/lib/moduleRegistry.ts` 등록
- 필요 시 bootstrap 추가
- 필요 시 frontend route 연결
- `pnpm typecheck`

## 변경 기록

- **2026-06-12**: 신규 모듈 작업의 최신 SoT 읽기 순서를 6/11 사이트맵, 중앙기획서, 처리목록, 모듈상세, 6월 로드맵, 72번 실행 보드 순서로 고정했다.
- **2026-06-08**: 2026-06-05 기획 변경 회의 이후 Phase 1 기준을 추가했다. 모듈 경계는 유지하되 세관 강제 UX와 완전 모듈화는 보류하고, 통 인벤토리·숙소 중심 루프 설계 이후 재판단한다.
- **2026-05-29**: state route 제거와 frontend facade 이관 완료 상태에 맞춰 모듈 규칙 문구를 정리했다. 신규 runtime code는 module package에서 `useUserStore`를 직접 import하지 않는다.
- **2026-05-29**: frontend store 물리 분리를 보류하고 module facade를 우선 사용하는 규칙을 추가했다. 신규 module 연결 코드는 `storeFacades.ts` 또는 module action/config hook에 의존해야 한다.
- **2026-05-24**: 모듈 개발 시 전용 저장소/model spec/repository ownership과 `/api/modules/{moduleId}` action API 사용 지침을 추가하고 `packages/modules/BACKEND_GUIDE.md`를 연결했다.
- **2026-06-01**: 항해/세관 목적지 판단을 위해 manifest `worldScope` 규칙을 추가했다. 내 섬 구역, 항해 경로, 배, 숙소, 향후 외부 도착 섬을 구분한다.
- **2026-06-01**: `destination-island`에서 획득한 전역 보관 대상 아이템도 customs를 통해 `hostStates.inventory`로 직접 이동할 수 있다는 규칙을 추가했다.
- **2026-06-01**: Aidong item 전역 보관 규칙을 추가했다. 소유권은 `hostStates.inventory`, 착용 상태는 `myAidongStates.equippedItems`, catalog는 `my-aidong/items.csv`가 담당한다.
- **2026-06-01**: 신규 모듈 기능은 최소 smoke 범위에 포함되는 것을 완료 기준으로 삼는다. ship type/slot, lodge assign, route landing, Aidong item, ship/lodge/customs transfer는 backend server와 local MongoDB를 띄운 뒤 `pnpm check:module-actions-smoke`로 확인한다.
## PixiJS 사용 가능 모듈 범위

- 모듈 개발 시 PixiJS는 기본 선택지가 아니다.
- PixiJS는 `destination-island`처럼 화면 자체가 탐험 scene이고, 화려한 연출이 기능 경험에 직접 기여하는 모듈에서만 부분적으로 사용한다.
- 일반 관리 화면, 숙소/항구의 정보 패널, 세관, 인벤토리, 설정, 개발 도구 화면은 React/MUI 중심으로 유지한다.
- PixiJS scene은 module route 내부의 하위 component로 둔다. module manifest, backend API, customs rule, item catalog와의 연결은 React container가 담당한다.
- PixiJS에서 발생한 click/hover/mission trigger는 typed event로 React container에 전달하고, container가 backend action API를 호출한다.
- PixiJS asset은 module item/hotspot/scene data와 분리하지 말고 추적 가능한 id 체계를 유지한다.

## Rive 사용 가능 모듈 범위

- 모듈 캐릭터 반응, UI 반응, hotspot 반응, 보상 연출은 Rive를 우선 검토한다.
- Spine과 Live2D는 고품질 리깅에는 좋지만 작업량이 크므로 기본 모듈 규칙으로 강제하지 않는다.
- Aidong이 destination island 안에서 직접 이동하지 않는 현재 기획에서는 Spine 도입을 보류한다.
- Rive는 module-local state나 backend document를 직접 수정하지 않는다.
- Rive state machine input은 React component가 제어하고, 상태 변경은 module action API 또는 customs API를 통해 처리한다.
- 모듈별 Rive asset은 `items.csv`, `balance.csv`, `customs.csv`, hotspot 정의와 id를 맞춰 추적 가능하게 둔다.

## 변경 기록

- **2026-06-05**: 모듈 개발 시 PixiJS를 destination island 등 화려한 탐험 scene에만 부분 도입하도록 범위를 명시했다.
- **2026-06-05**: 모듈 캐릭터/UI/hotspot 반응 애니메이션은 Rive를 우선 검토하고, Spine/Live2D는 추후 필요 시 도입하도록 규칙을 추가했다.
