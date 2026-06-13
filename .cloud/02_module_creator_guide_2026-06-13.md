# 모듈 제작자 가이드 2026-06-13

이 문서는 아이동월드에서 새 모듈을 만들거나 기존 모듈을 확장하는 사람이 처음부터 끝까지 따라 볼 수 있도록 만든 제작 설명서다.

대상 독자는 다음과 같다.

- 새 콘텐츠 모듈을 만드는 개발자.
- 기존 모듈에 backend state나 action API를 추가하는 개발자.
- module package, manifest, route, balance, items, customs, decor, i18n을 다루는 작업자.
- Codex에게 모듈 작업을 시킬 사람.

이 문서는 규칙 문서가 아니라 작업 순서 문서다. 세부 규칙은 아래 문서를 함께 본다.

```text
.cloud/01_project_history_current_2026-06-13.md
.cloud/20_module_rules.md
.cloud/30_backend_db_rules.md
.cloud/40_frontend_rules.md
packages/modules/BACKEND_GUIDE.md
```

## 0. 가장 먼저 알아야 할 현재 기준

아이동월드의 현재 기준은 다음이다.

- backend 서버는 하나다.
- module 독립성은 서버 분리가 아니라 route, service, repository, model spec 경계로 만든다.
- frontend Zustand store도 하나다.
- module은 app store를 직접 import하지 않고 facade, bootstrap, action API를 통해 연결한다.
- `/api/state`는 제거됐다. 다시 만들지 않는다.
- 마이섬은 고정 15구역이다.
- 항구 `AREA-02`와 숙소 `AREA-13`은 anchor다.
- 나머지 13개 구역은 Aidong을 편입할 수 있는 fillable slot이다.
- Aidong 영입은 `my-aidong`, 마이섬 편입은 `my-island`가 담당한다.
- `codexStates`는 수량 원장이 아니다.
- Aidong별 25개 도감템 수량은 `myAidongStates.aidongCodexItems` 쪽이 기준이다.
- customs backend는 유지하지만 Phase 1 core UX에서 필수 gate로 강제하지 않는다.
- PixiJS와 Rive는 일부 scene/연출에만 부분 적용한다.

이 기준과 다르게 가야 할 것 같으면, 먼저 문서를 갱신하거나 PM 결정을 받아야 한다.

## 1. 모듈을 만들기 전에 작성할 모듈 카드

코드를 만들기 전에 아래 내용을 한 번 적는다. 길게 쓸 필요는 없지만, 비워두면 나중에 거의 반드시 꼬인다.

```text
moduleId:
kind: global | system | content
worldScope: home-island | destination-island | voyage-route | ship | lodge | none
한 줄 설명:
사용자가 보는 화면 route:
backend state 필요 여부:
이 모듈이 소유하는 상태:
다른 모듈과 주고받는 자원:
보상 지급 위치:
필요한 CSV:
필요한 asset:
필요한 smoke/test:
```

예시:

```text
moduleId: zone-river
kind: content
worldScope: home-island
한 줄 설명: 마이섬 강가 구역. 낚시/휴식 생산을 담당한다.
사용자가 보는 화면 route: /island/area/05 또는 /island/river
backend state 필요 여부: 있음
이 모듈이 소유하는 상태: zoneStates 안의 localResources, progress.production
다른 모듈과 주고받는 자원: 직접 수정하지 않음. 필요 시 host 보상은 action API, cross-module 이동은 customs.
보상 지급 위치: 일반 재료는 hostStates.inventory, Aidong 도감템은 myAidongStates.aidongCodexItems
필요한 CSV: balance.csv, items.csv, i18n
필요한 asset: 배경 이미지, hotspot 이미지 후보
필요한 smoke/test: collect/clear 또는 production claim backend test, route smoke
```

## 2. 모듈 종류를 고른다

### 2.1 global module

항상 켜져 있는 사용자/월드 단위 상태의 주인이다.

예:

- `host`
- `account`
- `my-aidong`
- `my-island`
- `codex`
- `ship`

새 global module은 매우 신중하게 만든다. 대부분의 새 콘텐츠는 global이 아니다.

사용하는 경우:

- 여러 콘텐츠가 공통으로 사용하는 권위 상태를 소유한다.
- 다른 module이 직접 수정하면 안 되는 public action/facade가 필요하다.
- user 전체에 걸친 장기 상태를 가진다.

### 2.2 system module

엔진, 규칙 처리기, 공통 실행기다.

예:

- `vn-runner`
- `gacha`
- `cutscene-runner`
- `customs`

사용하는 경우:

- 특정 콘텐츠 하나가 아니라 여러 module에서 재사용한다.
- 데이터보다 실행 규칙, renderer, engine, adapter 성격이 강하다.

### 2.3 content module

특정 구역, 항로, 섬, 이벤트, 미니게임, 화면 단위 콘텐츠다.

예:

- `zone-garden`
- `zone-oasis`
- `zone-memory`
- `zone-mine`
- `route-neighbor`
- `lodge`
- `aidong-island`
- `destination-shell-island`

대부분의 신규 모듈은 content module이다.

## 3. worldScope를 고른다

`worldScope`는 모듈이 세계 안에서 어떤 위치 성격을 갖는지 나타낸다.

| worldScope | 의미 | 예시 |
|---|---|---|
| `home-island` | 내 섬 안의 구역 | zone-garden, zone-oasis |
| `destination-island` | 배를 타고 도착하는 외부 섬 | destination-shell-island 후보 |
| `voyage-route` | 항해 경로와 보드 | route-neighbor |
| `ship` | 배 자체, 선실, 갑판, 적재 | ship |
| `lodge` | 숙소, 방, 마당, 성장 허브 | lodge |
| 없음 | 위치 의미가 없거나 global/system | account, gacha 등 |

이 값은 UI, 세관, 항해, 보상 이동 판단에 영향을 준다. 대충 넣으면 안 된다.

## 4. 저장소 소유권을 정한다

모듈에 backend state가 있는지 먼저 판단한다.

### 4.1 backend state가 필요 없는 경우

예:

- 순수 UI wrapper.
- static data만 보여주는 화면.
- 다른 module action을 호출하기만 하는 얇은 화면.

이 경우 backend model을 만들 필요가 없다.

그래도 다음은 필요할 수 있다.

- module package.
- manifest.
- route.
- i18n.
- frontend bootstrap.

### 4.2 임시 state면 moduleStates fallback

가볍고 오래가지 않을 상태는 `moduleStates` fallback을 쓸 수 있다.

하지만 지금 프로젝트는 장기 기능이면 전용 repository를 우선한다.

fallback이 적합한 경우:

- 실험용 dev module.
- 단순 설정값.
- 장기 검색/검증/index가 필요 없는 작은 상태.

### 4.3 장기 기능이면 dedicated model/repository

다음 중 하나라도 있으면 dedicated repository가 낫다.

- 상태가 계속 커질 가능성이 있다.
- validation이 복잡하다.
- user별 진행 상태가 중요하다.
- action API가 많다.
- smoke/test로 책임을 고정해야 한다.
- 다른 module과 자원 이동에 참여한다.

필요한 위치:

```text
packages/backend/src/models/{Module}StateModel.ts
packages/backend/src/repositories/*
packages/backend/src/repositories/moduleRepositoryRegistry.ts
packages/backend/src/modules/modelSpecs.ts
packages/backend/src/modules/{moduleId}/routes.ts
packages/backend/src/modules/{moduleId}/service.ts
```

## 5. module package를 만든다

module package는 보통 아래 위치에 만든다.

```text
packages/modules/{module-id}
```

기본 파일:

```text
packages/modules/{module-id}/package.json
packages/modules/{module-id}/manifest.ts
packages/modules/{module-id}/tsconfig.json
packages/modules/{module-id}/src/index.ts
packages/modules/{module-id}/src/routes.tsx
packages/modules/{module-id}/src/config.ts
packages/modules/{module-id}/i18n/ko.json
packages/modules/{module-id}/i18n/en.json
packages/modules/{module-id}/i18n/index.ts
```

필요할 때 추가하는 파일:

```text
balance.csv      보상 숫자, allowlist, capacity, unlock 값
items.csv        모듈 item catalog
decor.csv        꾸미기 item catalog
customs.csv      cross-module debit/credit rule
src/actions.ts   frontend에 주입할 action 계약
src/types.ts     모듈 내부 타입
```

주의:

- `packages/modules`는 frontend/runtime module package와 manifest/data 위치다.
- backend service 코드는 `packages/backend/src/modules/{moduleId}`에 둔다.
- 둘을 섞지 않는다.

## 6. package.json을 작성한다

예시 형태:

```json
{
  "name": "@idongworld/zone-river",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./manifest": "./manifest.ts",
    "./routes": "./src/routes.tsx"
  }
}
```

주의:

- package name은 `@idongworld/{module-id}` 형식을 따른다.
- manifest import 경로가 frontend registry에서 쓰일 수 있어야 한다.
- routes를 제공한다면 `./routes` export를 둔다.

## 7. manifest.ts를 작성한다

manifest는 모듈의 신분증이다.

필수 후보:

```ts
import { defineManifest } from '@idongworld/core'

export default defineManifest({
  kind: 'content',
  id: 'zone-river',
  name: '강가',
  version: '0.1.0',
  description: '마이섬 강가 구역',
  tech: 'react',
  worldScope: 'home-island',
  route: '/island/river',
  i18nNamespace: 'zone-river',
  balance: 'balance.csv',
  items: 'items.csv',
})
```

작성 규칙:

- `id`는 한 번 정하면 바꾸기 어렵다.
- `kind`는 정확히 고른다.
- `worldScope`는 위치 의미가 있을 때 반드시 넣는다.
- `route`는 실제 React route와 충돌하지 않게 한다.
- `balance`, `items`, `decor`, `customs`는 모듈 루트 기준 상대 경로다.
- `requires`는 진짜 필요한 system module만 넣는다.

## 8. i18n을 만든다

모듈 문구는 가능하면 모듈 i18n에 둔다.

```text
i18n/ko.json
i18n/en.json
i18n/index.ts
```

규칙:

- 화면에 직접 박힌 한국어가 많아지지 않게 한다.
- 공통 문구라도 처음부터 무리하게 전역화하지 않는다.
- 반복이 커질 때만 공통 i18n으로 승격한다.

## 9. balance/items/decor/customs CSV를 정한다

### 9.1 balance.csv

사용처:

- 보상 숫자.
- unlock 기준.
- allowlist.
- capacity.
- production tick 값.

주의:

- CSV는 숫자와 설정값 중심이다.
- 검증 로직 자체는 backend service에 둔다.
- CSV 컬럼을 추가하면 parser, validation, test를 함께 고친다.

### 9.2 items.csv

사용처:

- 모듈 item catalog.
- 보상 item id.
- 표시 이름.
- rarity/source/scope.

주의:

- Aidong 착용 item의 소유권은 `hostStates.inventory`다.
- Aidong별 25개 도감템은 `myAidongStates.aidongCodexItems` 쪽이다.
- 모듈 local item인지, 전역 item인지, Aidong 귀속 item인지 먼저 구분한다.

### 9.3 decor.csv

사용처:

- 숙소/선실 꾸미기 item.
- 가격.
- 기본 보유량.
- 배치 가능 위치.

검증:

```bash
pnpm audit:module-decor
pnpm audit:module-catalogs
```

### 9.4 customs.csv

사용처:

- 실제 source document에서 빼고 target document에 넣는 이동.
- cross-module debit/credit.
- audit log가 필요한 자원 이동.

주의:

- Phase 1 core UX에서 세관 팝업을 필수 gate로 되살리지 않는다.
- 단일 권위 저장소로 바로 지급하는 보상은 domain action API를 우선한다.
- customs rule은 POC용인지 운영 후보인지 description에 남긴다.

## 10. frontend 화면을 만든다

기본 위치:

```text
packages/modules/{module-id}/src/routes.tsx
packages/modules/{module-id}/src/{ModuleScreen}.tsx
packages/modules/{module-id}/src/config.ts
packages/modules/{module-id}/src/actions.ts
```

화면 작성 규칙:

- module package 내부에서 app-level `useUserStore`를 직접 import하지 않는다.
- module package 내부에서 `packages/frontend/src/lib/api.ts`를 직접 import하지 않는다.
- 필요한 action은 `configure()`나 props로 주입받는다.
- 실제 API 호출은 frontend app layer의 bootstrap/facade가 담당한다.

권장 흐름:

```text
module UI
→ props 또는 configure로 받은 action 호출
→ frontend bootstrap action
→ api.ts 호출
→ backend action API
→ actionApiSync/storeFacade로 Zustand 병합
```

## 11. frontend registry와 route에 등록한다

manifest 등록:

```text
packages/frontend/src/lib/moduleRegistry.ts
```

해야 할 일:

- manifest import 추가.
- `ALL_MANIFESTS`에 추가.

route 등록:

```text
packages/frontend/src/lib/moduleRoutes.tsx
```

해야 할 일:

- routes import 추가.
- `ALL_MODULE_ROUTES`에 추가.

필요하면 App route도 확인한다.

```text
packages/frontend/src/App.tsx
```

주의:

- 기존 route와 path가 겹치면 안 된다.
- legacy redirect가 필요한 경우 frontend route audit 기준에 맞춘다.
- core route에 넣을지 compat/dev route로 둘지 먼저 판단한다.

## 12. frontend bootstrap을 만든다

module UI가 backend API를 직접 모르게 하려면 bootstrap이 필요하다.

위치 후보:

```text
packages/frontend/src/lib/{moduleId}Bootstrap.ts
```

bootstrap이 하는 일:

- module의 `configure()` 호출.
- store facade 연결.
- API client 연결.
- action 응답을 Zustand에 병합.
- app 시작 시 한 번 실행.

등록 위치:

```text
packages/frontend/src/main.tsx
```

주의:

- bootstrap은 앱 시작 시 한 번 실행된다.
- module package 내부가 app store를 몰라도 되도록 경계를 만든다.

## 13. backend API가 필요한지 판단한다

다음 중 하나라도 있으면 backend API를 만든다.

- user별 진행 상태가 있다.
- 보상 지급이 있다.
- unlock 조건이 있다.
- 중복 지급 방지가 필요하다.
- 다른 module 상태와 책임 경계가 중요하다.
- smoke/test로 상태 전이를 고정해야 한다.

단순 화면만 있으면 backend API를 만들지 않아도 된다.

## 14. backend module을 만든다

위치:

```text
packages/backend/src/modules/{module-id}/routes.ts
packages/backend/src/modules/{module-id}/service.ts
```

route 책임:

- request body parsing.
- uid 추출.
- HTTP status mapping.
- service 호출.

service 책임:

- domain validation.
- 상태 전이.
- idempotency.
- repository 호출.
- 필요한 경우 host/customs adapter 호출.

service가 하면 안 되는 일:

- 다른 module document를 직접 수정.
- frontend store 구조를 가정.
- generic patch로 domain rule 우회.

## 15. backend model/repository를 연결한다

전용 저장소가 필요하면 아래를 확인한다.

```text
packages/backend/src/models/{Module}StateModel.ts
packages/backend/src/repositories/moduleRepositoryRegistry.ts
packages/backend/src/modules/modelSpecs.ts
packages/backend/src/repositories/index.ts
```

`modelSpecs.ts`에는 반드시 owned field를 적는다.

예:

```ts
{
  moduleId: 'zone-river',
  storage: 'dedicated',
  collectionName: 'zoneStates',
  ownedFields: ['localResources', 'progress'],
}
```

주의:

- repository registry와 model spec이 안 맞으면 검증에서 걸려야 한다.
- model spec은 개발자와 Codex가 “이 필드는 누가 소유하는가”를 판단하는 표지판이다.

## 16. backend route를 mount한다

공통 mount는 backend entrypoint에서 다음 경로로 연결되어 있다.

```text
/api/modules
```

신규 backend module route는 보통 아래에서 모은다.

```text
packages/backend/src/modules/index.ts
```

모듈 route는 아래 형태를 따른다.

```text
/api/modules/{moduleId}/{action}
```

예:

```text
POST /api/modules/zone-river/collect
POST /api/modules/zone-river/clear
POST /api/modules/zone-river/production/claim
```

## 17. 보상 지급 위치를 정한다

보상은 먼저 “누가 소유하는가”를 정한다.

| 보상 종류 | 권장 소유 위치 |
|---|---|
| 일반 재료/소모품 | `hostStates.inventory` |
| coins/gems/dice 같은 전역 자원 | `hostStates` |
| Aidong 착용 item 소유권 | `hostStates.inventory` |
| Aidong 착용 상태 | `myAidongStates.equippedItems` |
| Aidong별 25개 도감템 수량 | `myAidongStates.aidongCodexItems` |
| zone 내부 임시 자원 | `zoneStates.localResources` 또는 module local state |
| ship 임시 화물 | `shipStates.shipInventory` |
| cross-module debit/credit | customs |

frontend가 직접 보상을 지급하면 안 된다.

## 18. customs가 필요한지 판단한다

customs가 필요한 경우:

- source module document에서 실제 수량을 차감한다.
- target module document에 실제 수량을 지급한다.
- 실패 시 rollback 또는 audit log가 필요하다.
- idempotency key가 중요하다.

customs가 필요 없는 경우:

- 게임 action 결과로 단일 권위 저장소에 바로 지급한다.
- 예: production claim이 `hostStates.inventory`에 일반 재료를 바로 지급.
- 예: Aidong minigame 결과가 `myAidongStates.aidongCodexItems`에 도감템을 바로 지급.

중요:

- 세관 UI를 강제하지 않는 것과 customs backend를 쓰지 않는 것은 다르다.
- 실제 cross-module 이동이면 customs backend는 여전히 맞다.

## 19. route smoke와 backend test를 정한다

작업 완료는 “화면이 보인다”만으로 끝나지 않는다.

최소 검증 후보:

```bash
pnpm --filter backend typecheck
pnpm --filter frontend typecheck
pnpm test -- packages/backend/src/backendPersistence.test.ts
pnpm check:backend:model-specs
pnpm audit:legacy-state
pnpm audit:module-catalogs
pnpm check:live-smoke:local
```

모듈 종류별 권장 검증:

| 작업 | 권장 검증 |
|---|---|
| manifest/package만 추가 | frontend typecheck, module registry 확인 |
| route 추가 | frontend typecheck, Playwright route smoke 후보 |
| backend model/repository 추가 | backend typecheck, model-spec check, persistence test |
| action API 추가 | backend persistence test 또는 module action smoke |
| CSV catalog 추가 | module catalog audit |
| customs rule 추가 | customs adapter test 또는 module action smoke |
| core loop에 들어가는 기능 | `pnpm check:live-smoke:local` |

## 20. 신규 모듈 제작 순서 요약

실제로는 아래 순서로 작업한다.

1. 히스토리 문서와 최신 실행 보드를 읽는다.
2. 모듈 카드를 작성한다.
3. module kind와 worldScope를 정한다.
4. backend state ownership을 정한다.
5. `packages/modules/{module-id}` package를 만든다.
6. `manifest.ts`를 작성한다.
7. i18n, balance, items, decor, customs CSV 필요 여부를 정한다.
8. frontend 화면과 routes를 만든다.
9. `moduleRegistry.ts`에 manifest를 등록한다.
10. `moduleRoutes.tsx` 또는 App route에 화면을 연결한다.
11. 필요하면 frontend bootstrap을 만든다.
12. backend API가 필요하면 routes/service를 만든다.
13. 전용 저장소가 필요하면 model/repository/modelSpecs를 연결한다.
14. 보상 지급 위치를 service에서 확정한다.
15. customs가 필요한 경우에만 customs rule/adapter를 연결한다.
16. action 응답을 frontend store facade/action sync로 병합한다.
17. typecheck와 관련 smoke/test를 돌린다.
18. 문서와 changelog를 남긴다.

## 21. 완료 체크리스트

새 모듈 또는 큰 모듈 확장은 아래를 확인하고 끝낸다.

- [ ] 모듈 카드가 있다.
- [ ] module kind가 정해졌다.
- [ ] worldScope가 필요하면 선언했다.
- [ ] package name과 manifest id가 일치한다.
- [ ] frontend registry에 manifest를 등록했다.
- [ ] route가 필요하면 route registry에 등록했다.
- [ ] i18n 문구가 있다.
- [ ] CSV를 추가했다면 parser/audit/test 영향을 확인했다.
- [ ] backend state ownership이 정해졌다.
- [ ] 전용 저장소를 만들었다면 modelSpecs와 repository registry를 갱신했다.
- [ ] action API가 domain rule을 service에서 검증한다.
- [ ] 다른 module document를 직접 수정하지 않는다.
- [ ] `/api/state`를 사용하지 않는다.
- [ ] frontend module package가 app store를 직접 import하지 않는다.
- [ ] 보상 지급 위치가 권위 저장소 기준으로 맞다.
- [ ] customs가 필요한 이동과 필요 없는 보상을 구분했다.
- [ ] backend/frontend typecheck를 통과했다.
- [ ] 필요한 persistence test 또는 smoke를 추가/실행했다.
- [ ] 변경 문서에 changelog를 남겼다.
- [ ] 한글 깨짐 문자와 BEL 제어문자를 검사했다.

## 22. 자주 하는 실수

### 실수 1. module package 안에서 userStore를 직접 import한다

하지 않는다. bootstrap/facade로 주입한다.

### 실수 2. frontend가 보상을 직접 지급한다

하지 않는다. backend action API가 지급하고 frontend는 응답을 병합한다.

### 실수 3. `codexStates`에 아이템 수량을 넣는다

하지 않는다. `codexStates`는 표시/등록/일지다. Aidong별 도감템 수량은 `myAidongStates.aidongCodexItems` 기준이다.

### 실수 4. 세관 UI를 다시 필수 gate로 만든다

하지 않는다. customs backend는 유지하지만 Phase 1 core UX에서는 강제하지 않는다.

### 실수 5. 오래된 next_work를 기준으로 작업한다

하지 않는다. 오래된 문서는 히스토리에 흡수됐다. 현재 기준은 히스토리, 최신 실행 보드, 로드맵, 규칙 문서다.

### 실수 6. module service가 다른 module repository를 직접 수정한다

하지 않는다. 필요하면 해당 module action API, host API, customs, 또는 명시 service 계약을 사용한다.

## 23. Codex에게 모듈 제작을 시킬 때 요청 예시

좋은 요청:

```text
.cloud/02_module_creator_guide_2026-06-13.md 기준으로 zone-river 모듈 카드를 먼저 만들고,
content module + home-island + route /island/river + backend production action이 필요한 구조로
1단계부터 구현해줘. 각 단계가 끝나면 문서와 changelog도 갱신해줘.
```

나쁜 요청:

```text
강가 모듈 만들어줘.
```

왜 나쁜가:

- kind가 없다.
- worldScope가 없다.
- backend state 필요 여부가 없다.
- 보상 지급 위치가 없다.
- smoke/test 기준이 없다.

## 24. 변경 기록

- **2026-06-13**: 모듈 제작자가 신규 모듈을 만들 때 따라갈 수 있도록 제작 순서, 파일 위치, backend/frontend 연결, 보상 소유권, customs 판단, 검증 기준, 완료 체크리스트를 한 문서로 정리했다.