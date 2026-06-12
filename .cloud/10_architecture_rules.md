# 아키텍처 규칙

## Backend Module Architecture Update 2026-05-24

- 서버를 물리적으로 나눌 명확한 배포 이유가 생기기 전까지 backend는 단일 Express 서버를 유지한다.
- 모듈 독립성은 `packages/backend/src/modules`, `packages/backend/src/repositories` 안의 route/service/repository/model 경계로 확보한다.
- auth middleware, Mongo connection, transaction helper, repository initialization, health/migration status 같은 공통 인프라는 backend shell이 가진다.
- module route는 자기 module state만 소유한다. 다른 module document를 직접 수정하지 않는다.
- module 간 resource 이동은 customs와 resource adapter를 통과한다.
- `/api/state`는 제거됐다. backend와 frontend 신규 작업은 account, host, module, customs, 명시적 action API를 사용한다.
- `/health`는 Mongo와 migration 상태를 계속 노출해서, 코드를 열지 않아도 backend 분리 진행 상태를 확인할 수 있어야 한다.

이 문서는 전체 아키텍처 작업 규칙이다. 코드 변경 전 실제 구현을 먼저 확인하고, 문서상 계획과 현재 코드가 다를 때는 현재 동작을 기준으로 작업한다.

## 기본 원칙

- 모노레포 구조를 유지한다.
- `packages/core`는 모든 모듈이 공유하는 최소 런타임 기반이다.
- `packages/modules/*`는 모듈의 manifest, 타입, actions, config, routes, i18n, balance/customs 데이터를 담는다.
- `packages/frontend`는 실제 화면, 앱 라우팅, Zustand store, bootstrap 연결을 담당한다.
- `packages/backend`는 API, 인증 미들웨어, persistence, 서버 검증을 담당한다.
- `shared-data`와 `resources`는 코드 모듈이 아니라 데이터/자산 풀이다.

## Core 책임

`packages/core`에 넣어도 되는 것:

- manifest 타입 정의.
- module registry 등록/조회/검증.
- event bus.
- route collection helper.
- i18n namespace helper.
- asset URL/path helper.
- CSV loading 같은 공통 유틸.

`packages/core`에 넣으면 안 되는 것:

- 특정 콘텐츠의 게임 규칙.
- 특정 화면 UI.
- 특정 DB 모델.
- 특정 유저의 상태 변경 로직.
- host/account/my-aidong 같은 광역 모듈의 실제 비즈니스 액션.

## Manifest와 Registry

- 모든 코드 모듈은 `manifest.ts`를 가져야 한다.
- manifest는 `defineManifest()`로 선언한다.
- manifest `id`는 kebab-case를 사용한다.
- `kind`는 `global`, `system`, `content`, `asset`, `shared` 중 하나다.
- 현재 실제 등록 대상은 주로 `global`, `system`, `content` 모듈이다.
- `asset`, `shared` manifest 타입은 준비되어 있지만, 현재 자산/공용 데이터는 주로 디렉터리 구조로 관리된다.
- `registry.validate()`는 다음 충돌을 빠르게 잡는다.
  - content 모듈의 `requires`가 등록된 system 모듈인지.
  - content 모듈 route 중복.
  - global 모듈 `storeSlice` 중복.
  - content 모듈 `i18nNamespace` 중복.

## 모듈 등록 흐름

- 프론트엔드 시작 시 `moduleRegistry.ts`가 모든 manifest를 import한다.
- `ALL_MANIFESTS` 배열에 넣은 뒤 `registerAll()`과 `validate()`를 호출한다.
- 신규 모듈을 추가할 때는 manifest 파일 작성 후 `moduleRegistry.ts`에 import와 배열 등록을 추가한다.
- 등록되지 않은 모듈은 dev tool, route collector, i18n helper, registry 조회에서 보이지 않는다.

## 라우팅 구조

- 현재 `moduleRoutes.tsx`는 모듈 route를 모으는 역할을 한다.
- 일부 화면 라우팅은 아직 `App.tsx`에 수동으로 남아 있을 수 있다.
- 앞으로는 전역 라우터가 `/island/garden/*`, `/voyage/neighbor/*` 같은 prefix를 보고 해당 모듈 route로 위임하는 구조를 지향한다.
- 콘텐츠 모듈은 자기 route base 하위에서만 라우팅한다.
- 모듈 route가 전역 화면 구조, HUD, BottomNav 정책을 임의로 깨지 않도록 한다.

## 이벤트와 의존성

- 모듈 간 직접 import는 최소화한다.
- 시스템 모듈은 다른 모듈이 사용하는 엔진/서비스 표면을 export한다.
- 콘텐츠 모듈은 필요한 시스템 모듈을 manifest `requires`에 명시한다.
- 광역 상태 변경은 가능하면 해당 광역 모듈 actions/config를 통해 수행한다.
- 느슨한 연동에는 core event bus를 사용한다.

## 문서와 코드의 우선순위

- 구현 작업은 현재 코드가 1순위다.
- 기존 검수 문서는 기획 의도와 이력 파악용 SoT로 사용한다.
- 문서에 계획이 있어도 코드가 아직 없으면 “미구현”으로 취급한다.
- 작업 중 발견한 불일치는 규칙 문서나 별도 작업 메모에 남긴다.

## 변경 기록

- **2026-05-29**: 상단 backend module architecture 기준을 한글로 정리하고, `/api/state`를 호환 계층이 아니라 제거 완료 상태로 정정했다.
