# 규칙 관리 절차

이 문서는 `.cloud` 작업 규정에 새 규칙을 추가하거나 기존 규칙을 바꿀 때 따르는 절차다.

## 목적

- 규칙 문서가 현재 코드와 따로 노는 것을 막는다.
- 새 규칙이 어떤 코드, 문서, 테스트에 영향을 주는지 먼저 확인한다.
- 기획 의도, 현재 구현, 보류된 작업을 분리해서 기록한다.
- Codex나 다른 작업 도구가 규칙을 실제 작업으로 연결할 수 있게 한다.

## 규칙 추가 기준

새 규칙은 다음 조건 중 하나 이상에 해당할 때 추가한다.

- 같은 판단을 여러 번 반복한다.
- module, store, backend, DB, asset, i18n 같은 구조 판단 기준이 필요하다.
- 현재 코드와 기획 방향을 명시적으로 구분해야 한다.
- 여러 파일에 걸친 변경 방향을 정해야 한다.
- 신규 module, system, data pipeline이 추가된다.

단순한 일회성 작업 메모는 `.cloud` 규칙으로 만들지 않는다.

## 규칙 상태

- `proposed`: 아직 결정 전인 제안. 코드에 강제하지 않는다.
- `active`: 현재부터 지켜야 하는 규칙. 신규 작업은 반드시 따른다.
- `migration`: 방향은 결정됐지만 기존 코드가 모두 따르지는 않는 상태. 신규 코드는 따르고 기존 코드는 점진 수정한다.
- `deprecated`: 더 이상 권장하지 않는 규칙. 기존 흔적은 있을 수 있으나 새 코드에 쓰지 않는다.

## 문서 위치

- 프로젝트 전체 상태와 방향: `00_project_overview.md`
- core, registry, route, module loading, 전체 구조: `10_architecture_rules.md`
- manifest, module kind, storeSlice, customs, bootstrap: `20_module_rules.md`
- backend, API, MongoDB, repository: `30_backend_db_rules.md`
- backend 실행 매뉴얼: `35_backend_db_runbook.md`
- React, Zustand, route, frontend bootstrap, UI: `40_frontend_rules.md`
- CSV, shared-data, resources, asset, i18n: `50_asset_data_rules.md`
- Codex 작업 방식과 검증 설명 방식: `90_codex_workflow.md`
- 규칙 추가/변경 반영 절차: 이 문서

## 규칙 작성 형식

가능하면 다음 형식을 따른다.

```md
## 규칙 이름

상태: proposed | active | migration | deprecated
범위: core | frontend | backend | module | asset | data | workflow
관련 파일:

- `path/to/file.ts`
- `path/to/other.md`

### 배경

왜 이 규칙이 필요한지 설명한다.

### 규칙

- 지켜야 할 내용을 명령형으로 쓴다.
- 예외가 있으면 예외 조건을 명시한다.

### 코드 반영

- 이미 반영된 코드.
- 아직 반영해야 할 코드.
- migration이 필요한 파일.

### 검증

- 실행할 typecheck/test/script.
- 수동 확인이 필요한 화면 또는 API.
```

## 규칙 추가 절차

1. 관련 코드와 기존 문서를 먼저 확인한다.
2. 새 규칙이 기존 규칙과 충돌하는지 확인한다.
3. 규칙 상태를 정한다.
4. 영향을 받는 파일과 모듈을 적는다.
5. 현재 코드 상태와 목표 상태를 분리해서 적는다.
6. 코드 반영 체크리스트를 추가한다.
7. 필요한 검증 명령을 적는다.
8. 필요하면 `90_codex_workflow.md`에도 작업상 주의사항을 요약한다.
9. 관련 문서의 changelog에 한글로 로그를 남긴다.

## 규칙을 코드에 반영하는 절차

규칙을 추가했다고 코드가 자동으로 바뀌지는 않는다. 코드 반영은 별도 작업으로 처리한다.

1. 규칙 상태가 `active` 또는 `migration`인지 확인한다.
2. 관련 파일을 `rg`로 찾는다.
3. 현재 코드가 규칙을 만족하는지 확인한다.
4. 불일치는 다음 중 하나로 분류한다.
   - 즉시 수정 가능.
   - migration 필요.
   - 기획 결정 필요.
   - 현재 POC에서 허용된 예외.
5. 즉시 수정 가능한 항목만 작은 범위로 수정한다.
6. migration 항목은 별도 작업 문서나 next work에 남긴다.
7. 수정 후 typecheck/test/smoke를 실행한다.
8. 최종 응답 또는 작업 로그에 반영 완료, 미반영, 예외를 구분해서 남긴다.

## 문서 언어 규칙

- `.cloud` runbook과 작업 규칙 문서는 한글로 작성한다.
- 코드 식별자, 환경 변수, 명령어, API path는 원문 그대로 유지한다.
- 새 runbook 섹션은 특별한 이유가 없으면 영어로 작성하지 않는다.
- 영어로 남아 있는 기존 runbook 섹션을 수정할 때는 의미를 보존하면서 한글로 정리한다.
- 한글 문서를 수정할 때는 UTF-8이 깨지지 않도록 확인한다.

## 코드 반영 체크리스트

규칙을 추가하면 다음 파일군을 확인한다.

- core 규칙:
  - `packages/core/src/manifests.ts`
  - `packages/core/src/registry.ts`
  - `packages/core/src/router.ts`
  - `packages/core/src/bus.ts`

- module 규칙:
  - `packages/modules/*/manifest.ts`
  - `packages/modules/*/src/index.ts`
  - `packages/modules/*/src/config.ts`
  - `packages/modules/*/src/actions.ts`
  - `packages/modules/*/src/routes.tsx`
  - `packages/frontend/src/lib/moduleRegistry.ts`
  - `packages/frontend/src/lib/*Bootstrap.ts`

- frontend 규칙:
  - `packages/frontend/src/stores/userStore.ts`
  - `packages/frontend/src/lib/storeFacades.ts`
  - `packages/frontend/src/lib/syncStore.ts`
  - `packages/frontend/src/lib/actionApiSync.ts`
  - `packages/frontend/src/lib/api.ts`
  - `packages/frontend/src/App.tsx`
  - `packages/frontend/src/lib/moduleRoutes.tsx`

- backend/DB 규칙:
  - `packages/backend/src/index.ts`
  - `packages/backend/src/routes/*`
  - `packages/backend/src/modules/*`
  - `packages/backend/src/repositories/*`
  - `packages/backend/src/models/*`
  - `packages/backend/src/modules/modelSpecs.ts`

- asset/data 규칙:
  - `shared-data/*`
  - `resources/*`
  - `packages/modules/*/balance.csv`
  - `packages/modules/*/customs.csv`
  - `packages/modules/*/i18n/*`

## 예시: storeSlice 규칙 추가

규칙:

- `storeSlice`는 실제 Zustand slice가 아니라 manifest metadata다.
- module 내부는 `useUserStore` 직접 접근보다 actions/config/facade를 우선한다.

코드 반영:

- `packages/modules/*/manifest.ts`의 `storeSlice` 중복 여부 확인.
- `packages/core/src/registry.ts`의 storeSlice 중복 검증 확인.
- `packages/frontend/src/screens/dev/AssetCatalogScreen.tsx`가 metadata로 표시하는지 확인.
- `packages/frontend/src/lib/*Bootstrap.ts`가 app-level store 연결 경계에 해당하는지 확인.
- module package 내부 직접 store import가 있으면 facade/config hook으로 이동한다.

검증:

- `pnpm typecheck`
- dev tool의 모듈 분리현황 표시 확인.

## 예시: MongoDB 모듈 분리 규칙 추가

규칙:

- 하나의 backend 서버 안에서 module별 route/service/model/repository를 분리한다.
- 모든 module 상태를 거대한 UserDoc에 넣지 않는다.
- module 간 resource 이동은 customs와 resource adapter를 통과한다.

코드 반영:

- repository interface를 먼저 확인한다.
- UserDoc에 남길 account/auth 필드와 module document로 분리할 필드를 나눈다.
- 신규 module API는 `/api/state`가 아니라 `/api/modules/{moduleId}` 아래에 둔다.
- customs debit/credit은 service 계층에서 처리한다.

검증:

- `pnpm check:backend:model-specs`
- `pnpm test packages/backend/src/backendPersistence.test.ts`
- `pnpm check:module-actions-smoke`
- `pnpm check:state-route-static`

## 주의사항

- 기존 규칙을 삭제하기보다 먼저 `deprecated`로 표시한다.
- active 규칙을 바꾸면 영향을 받는 코드 범위를 함께 적는다.
- migration 규칙은 완료 조건을 적는다.
- 코드가 아직 못 따라간 규칙은 “현재 미구현” 또는 “보류”라고 명시한다.
- 규칙 문서만 고치고 실제 코드 반영이 필요한 경우, 반드시 다음 작업 또는 별도 계획 문서에 남긴다.

## Codex에게 요청할 때 권장 문장

규칙만 추가:

```txt
.cloud에 이 내용을 active 규칙으로 추가해줘. 아직 코드는 바꾸지 말고 영향 범위만 적어줘.
```

규칙과 코드 동시 반영:

```txt
.cloud 규칙을 추가하고, 현재 코드에서 즉시 반영 가능한 부분까지 수정해줘. migration이 필요한 부분은 별도 항목으로 남겨줘.
```

규칙 준수 점검:

```txt
.cloud 규칙 기준으로 현재 코드가 어긋나는 부분을 점검해줘. 수정은 아직 하지 말고 findings로만 정리해줘.
```

## 변경 기록

- **2026-05-29**: 깨진 한글을 복구하고 현재 backend split, state route 제거, module facade, Mongo repository 기준에 맞춰 문서를 재작성했다.
- **2026-05-29**: runbook과 작업 규칙 문서의 기본 작성 언어를 한글로 정했다.
- **2026-05-24**: backend rule maintenance scope에 구현된 repositories/models/modules/resources와 코드 주석 품질 기준을 포함했다.
