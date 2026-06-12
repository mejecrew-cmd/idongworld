# State Route Removal Record

이 문서는 과거 통합 state route 제거 작업의 완료 상태를 기록한다.

2026-05-29 기준으로 frontend fallback, backend route, backend compatibility service, backend state route 전용 실행 wrapper가 제거됐고 local runtime gate까지 통과했다.

## 완료 상태

- frontend `syncStore.ts`는 account, host, module 전용 API로만 hydrate/flush한다.
- frontend `lib/api.ts`에는 통합 state client가 없다.
- backend 통합 state route 파일을 삭제했다.
- backend state compatibility service를 삭제했다.
- backend `index.ts`에서 통합 state route mount를 제거했다.
- backend health는 `migration.legacyStateApiRemoved=true`를 보고한다.
- backend state route feature gate를 제거했다.
- backend script 이름은 `state-route-removed`와 `state-route-runtime` 기준으로 정리했다.
- `tools/audit/checkLegacyStateUsage.mjs`는 runtime source에서 통합 state route 참조가 다시 생기면 실패한다.

## 변경된 파일

- `packages/frontend/src/lib/syncStore.ts`
- `packages/frontend/src/lib/api.ts`
- `packages/frontend/scripts/check-state-route-runtime.mjs`
- `packages/backend/src/index.ts`
- `packages/backend/src/backendPersistence.test.ts`
- `packages/backend/scripts/smoke-state-route-removed.mjs`
- `packages/backend/scripts/dev-backend-local-mongo.mjs`
- `packages/backend/scripts/check-backend-migration.mjs`
- `packages/backend/package.json`
- `package.json`
- `tools/checks/checkStateRouteRuntimeLocal.mjs`
- `tools/audit/checkLegacyStateUsage.mjs`
- `.cloud/30_backend_db_rules.md`
- `.cloud/35_backend_db_runbook.md`
- `.cloud/40_frontend_rules.md`

## 현재 검증 기준

정적 검증:

```bash
pnpm audit:legacy-state
pnpm --filter backend typecheck
pnpm --filter frontend typecheck
pnpm test packages/backend/src/backendPersistence.test.ts
pnpm check:state-route-static
```

runtime 검증:

```bash
pnpm dev:mongo:local
pnpm dev:be:local-mongo
pnpm dev:fe
pnpm check:state-route-runtime
```

한 번에 local runtime을 띄워 확인할 때:

```bash
pnpm check:state-route-runtime:local
```

runtime smoke는 통합 state route가 `404 not_found`로 사라졌는지 확인한다.

## Final Verification 2026-05-29

아래 명령을 통과했다.

```bash
pnpm check:state-route-static
pnpm check:state-route-runtime:local
```

확인된 상태:

- local Mongo 연결 성공.
- backend repository backend는 `mongo`.
- `migration.legacyStateApiRemoved=true`.
- dedicated module repository 목록 정상.
- 통합 state route 요청은 404.
- frontend runtime check 정상.

## 변경 기록

- **2026-05-29**: `pnpm check:state-route-runtime:local`을 통과해 state route 제거 작업을 완료 상태로 닫았다.
- **2026-05-29**: 남아 있던 runtime gate 이름을 `state-route-runtime` 기준으로 정리했다.
- **2026-05-29**: backend script 이름에서 state route 전용 제거 smoke를 `state-route-removed` 기준으로 정리했다.
- **2026-05-29**: backend route, compatibility service, feature gate 제거 완료 상태를 반영했다.
