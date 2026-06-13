# Asset And Data Rules

이 문서는 자산, CSV, shared-data, i18n 데이터 작업 규칙이다.

## 자산 분류

자산 풀은 `resources` 아래에 둔다.

주요 카테고리:

- `aidong`
- `cutscenes`
- `backgrounds`
- `audio`
- `ui`

각 카테고리는 가능하면 다음 구조를 따른다.

- `public`: 누구나 접근 가능한 자산.
- `protected`: 권한 검증 후 노출되어야 하는 자산.

현재 Phase 1/1.5에서는 보호 정책이 완전히 구현되어 있지 않을 수 있다. 코드 작업 시 현재 fetch 경로와 실제 서버 설정을 확인한다.

## Shared Data

`shared-data`는 특정 코드 모듈이 소유하지 않는 공용 데이터다.

현재 주요 데이터:

- `aidong-master`: 아이동 캐릭터 master data.
- `cutscene-catalog`: 시나리오/일기 카탈로그.
- `species`: 종족 master data.
- `schedule`: 스케줄/시간대 data.

규칙:

- shared-data는 여러 모듈이 읽을 수 있다.
- shared-data는 임의의 모듈이 쓰는 저장소가 아니다.
- PM/기획 기준이 필요한 값은 shared-data에 두고, 런타임 유저 상태는 store/DB에 둔다.
- CSV와 JSON이 함께 있을 때는 어느 쪽이 SoT인지 확인하고 작업한다.

## Balance CSV

- 모듈별 밸런스 값은 해당 모듈 루트의 `balance.csv`에 둔다.
- manifest에 `balance: 'balance.csv'`를 명시한다.
- 밸런스 파일은 코드 로직과 분리된 조정값이어야 한다.
- CSV 컬럼 변경 시 parser, 타입, 사용하는 action/test를 함께 확인한다.
- zone 계열은 보상 숫자와 resource/clearId allowlist를 `balance.csv`에 둔다.
- backend는 `packages/backend/src/modules/zone/balance.ts` loader를 통해 zone balance 값을 읽는다.
- 단, unlock 조건, result payload validation, reward 지급 가능 여부 같은 권위 검증은 backend service 코드에 둔다.
- `balance.csv` 컬럼을 추가하거나 의미를 바꾸면 CSV schema validation과 실패 시 startup/check 차단을 함께 갱신한다.

## Minigame Skin Catalog

- 아이동별 미니게임 스킨 catalog는 `.cloud/01_project_history_current_2026-06-13.md`를 따른다.
- 미니게임은 공통 engine과 Aidong별 skin data를 분리한다.
- skin catalog는 `characterId`, `skinId`, `engineId`, 입장재 item, 보상 item, asset id를 명확히 연결해야 한다.
- skin catalog의 보상 수량과 입장재 값은 밸런스 조정 대상이므로 CSV 후보로 둔다.
- result payload validation과 보상 지급 가능 여부는 catalog가 아니라 backend service 코드가 담당한다.

## Customs CSV

- 모듈별 세관 규칙은 해당 모듈 루트의 `customs.csv`에 둔다.
- manifest에 `customs: 'customs.csv'`를 명시한다.
- customs CSV는 로컬 자원에서 global/다른 모듈 자원으로 이동하는 명시적 경계다.
- 자원 이동 규칙은 코드에 하드코딩하기보다 customs rule로 선언한다.
- 현재 customs 구현이 모든 자원 타입을 실제 저장소에 반영하지 않을 수 있으므로, 새 자원 추가 시 debit/credit hook을 확인한다.

## i18n 데이터

- 모듈별 문구는 `packages/modules/{module}/i18n`에 둔다.
- 현재 `ko.json`, `en.json`, `index.ts` 패턴을 사용한다.
- namespace는 기본적으로 모듈 ID와 일치시킨다.
- `packages/frontend/src/i18n/index.ts`에서 실제 로딩 방식을 확인한다.

## Asset URL 규칙

- 자산은 직접 파일 import보다 URL helper 또는 정해진 public path를 우선한다.
- 문서상 목표는 `/assets/{moduleId}/{category}/{file}` 또는 보호 경로 분리다.
- 현재 backend는 `/assets`, `/scenarios` 정적 서빙을 한다.
- symlink/Drive 기반 경로는 환경 의존성이 강하므로 production 규칙으로 확정하지 않는다.

## 데이터 변경 체크리스트

- CSV/JSON 스키마 확인.
- 사용하는 parser 확인.
- manifest의 `balance`, `customs`, `assetCategory`, `i18nNamespace` 확인.
- dev tool의 Asset Catalog/Module panel에서 표시되는지 확인.
- `pnpm typecheck` 실행.
- 가능하면 관련 테스트 실행.

## 금지 사항

- 캐릭터/자산/시나리오 데이터를 임의로 코드에 중복 하드코딩하지 않는다.
- protected 자산을 production에서 public처럼 취급하지 않는다.
- 모듈 로컬 자원을 host inventory에 바로 섞지 않는다.
- shared-data를 유저별 저장소처럼 사용하지 않는다.

## 변경 기록

- **2026-06-08**: 아이동별 미니게임 스킨 catalog 기준을 추가했다. 미니게임은 공통 engine과 Aidong별 skin data를 분리하고, skin catalog는 engineId, asset id, 입장재, 보상 item을 명시해야 한다.
- **2026-05-29**: Zone action rule의 `balance.csv` 분리 기준을 현행화했다. 보상 숫자와 allowlist는 CSV에서 읽고, unlock/validation/backend authority는 코드에 유지한다.

## Asset Access Policy 현행 기준

- DB와 CSV에는 만료성 URL을 저장하지 않는다.
- 자산 참조는 `assetId`, `assetKey`, `category`, `visibility`, `version`을 기준으로 한다.
- `public` 자산은 core URL helper가 public URL로 즉시 해석할 수 있다.
- `protected` 자산은 URL을 직접 만들지 않고 backend signed URL resolve 대상으로 둔다.
- signed URL은 userStore, module state, DB에 장기 저장하지 않는다.
- 자세한 기준은 `.cloud/50_asset_data_rules.md`를 따른다.

## Asset Access 변경 기록

- **2026-06-05**: asset access policy를 확정했다. public asset은 즉시 URL로, protected asset은 signed URL resolve 대상으로 분리하고, core `asset-helper`에 asset ref resolve policy를 추가했다.
