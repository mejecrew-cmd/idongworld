# Codex 작업 절차

이 문서는 Codex 또는 유사한 바이브 코딩 도구가 이 프로젝트에서 작업할 때 따르는 절차다.

## 기본 태도

- 먼저 읽고, 그다음 수정한다.
- 문서의 계획과 현재 코드가 다르면 현재 코드의 실제 동작을 우선한다.
- 사용자가 질문한 경우에는 코드 변경보다 분석과 설명을 우선한다.
- 사용자가 구현을 요청한 경우에는 가능한 범위에서 끝까지 구현하고 검증한다.
- 사용자의 기존 변경을 되돌리지 않는다.

## 작업 전 확인

아키텍처나 모듈 관련 작업 전에는 다음 문서를 우선 확인한다.

- `.cloud/00_project_overview.md`
- `.cloud/10_architecture_rules.md`
- `.cloud/20_module_rules.md`
- `.cloud/30_backend_db_rules.md`
- `.cloud/35_backend_db_runbook.md`
- `.cloud/40_frontend_rules.md`
- `.cloud/50_asset_data_rules.md`
- `.cloud/95_rule_maintenance.md`

주요 코드 위치:

- core: `packages/core/src`
- frontend store/facade: `packages/frontend/src/stores/userStore.ts`, `packages/frontend/src/lib/storeFacades.ts`
- frontend bootstrap: `packages/frontend/src/lib/*Bootstrap.ts`
- frontend module registry/routes: `packages/frontend/src/lib/moduleRegistry.ts`, `packages/frontend/src/lib/moduleRoutes.tsx`
- backend: `packages/backend/src`
- modules: `packages/modules`

## 검색 규칙

- 파일 검색은 `rg --files`를 우선 사용한다.
- 텍스트 검색은 `rg`를 우선 사용한다.
- 관련 파일은 가능하면 병렬로 읽는다.
- 인코딩이 깨진 문서는 다른 정상 문서와 대조해서 복구한다.

## 수정 규칙

- 작은 범위의 변경을 선호한다.
- 관련 없는 리팩터링을 섞지 않는다.
- manual edit는 patch 방식으로 한다.
- 새 추상화는 실제 중복이나 복잡도를 줄일 때만 추가한다.
- core에는 특정 콘텐츠 로직을 넣지 않는다.
- module 내부 구현을 바꾸면 manifest, route, i18n, balance/customs, bootstrap 연결을 함께 확인한다.

## 현재 프로젝트 주의사항

- `/api/state` backend route는 제거됐다. 새 runtime code는 account, host, module, customs, explicit action API를 사용한다.
- frontend store는 물리 분리하지 않고 단일 Zustand `userStore`를 유지한다.
- 신규 frontend runtime code는 `useUserStore` 직접 import보다 `storeFacades.ts`의 facade를 우선 사용한다.
- module package 내부는 app-level `userStore`나 `lib/api.ts`를 직접 import하지 않는다.
- backend는 하나의 Express 프로세스를 유지하되 storage/API 소유권은 repository, model, module route, service 경계로 분리한다.
- MongoDB는 local-first다. Atlas는 현재 사용하지 않고 추후 사용할 수도 있는 선택지로만 보류하며, 실제 credential 준비 전에는 Atlas readiness를 요구하지 않는다.
- 전용 영속화 범위는 `users`, `hostStates`, `myAidongStates`, `myIslandStates`, `codexStates`, `routeNeighborStates`, `shipStates`, `zoneStates`, `moduleStates`, `customsLogs`를 포함한다.
- customs rule set은 완성 밸런스가 아니라 POC/검증/초기 플레이 루프용 임시 체제다.
- route/ship 항해 상태는 임시 경계다. cargo, cabin 효과, route/ship customs rule은 기획 확정 뒤 구체화한다.
- zone reward/action rule은 backend service 코드가 권위다. 보상 숫자와 resource/clearId allowlist는 `balance.csv`에서 읽고, unlock/validation/idempotency는 service 코드에 유지한다.

## 설명 규칙

- 한글로 설명한다.
- 현재 구현 상태와 기획상 방향을 구분한다.
- 추측은 추측이라고 표시한다.
- 파일명을 구체적으로 짚는다.
- 사용자가 구조를 이해하려는 질문에는 흐름과 경계를 먼저 설명한다.

## 검증 규칙

가능한 경우 다음 순서로 확인한다.

- `pnpm check:state-route-static`
- `pnpm --filter backend check:model-specs`
- `pnpm --filter backend typecheck`
- `pnpm --filter frontend typecheck`
- `pnpm test packages/backend/src/backendPersistence.test.ts`
- `pnpm check:module-actions-smoke`

frontend runtime까지 필요하면:

```bash
pnpm dev:mongo:local
pnpm dev:be
pnpm dev:fe
pnpm check:frontend:state-route-runtime
```

테스트를 실행하지 못했으면 최종 응답에 이유를 명시한다.

## 문서 작성 언어 규칙

- `.cloud` runbook과 작업 규칙 문서는 기본적으로 한글로 작성한다.
- 코드 식별자, 환경 변수, 명령어, API path는 원문 그대로 쓴다.
- 외부 명세나 에러 메시지를 인용해야 하는 경우를 제외하고 새 runbook 섹션을 영어로 쓰지 않는다.
- 기존 문서에 영어로 남은 runbook 섹션을 수정할 때는 의미를 유지하면서 한글로 정리한다.
- 한글 문서를 수정한 뒤에는 깨짐 여부를 확인한다.

## 커밋/파일 안전 규칙

- 사용자가 요청하지 않은 `git reset`, `git checkout`, 대량 삭제를 하지 않는다.
- 기존 사용자 변경은 보존한다.
- 자동 생성 문서와 사람이 읽는 규칙 문서를 구분한다.
- `.cloud` 문서는 사람이 관리하는 작업 규정으로 취급한다.

## 변경 기록

- **2026-05-29**: 깨진 한글을 복구하고 현재 state route 제거, frontend facade, backend split, Atlas 보류, customs/route/zone 임시 기준에 맞춰 문서를 재작성했다.
- **2026-05-29**: `.cloud` runbook과 작업 규칙 문서는 한글로 작성한다는 규칙을 추가했다.
- **2026-05-24**: backend split, Mongo local-first, state route 제거, customs, 코드 주석 정리 기준을 최신 상태로 갱신했다.
