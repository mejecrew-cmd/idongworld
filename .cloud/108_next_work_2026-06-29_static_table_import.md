# 108_next_work_2026-06-29_static_table_import

## 목적

`resources/table` 아래에 제공되는 CSV 정적 테이블 파일을 기준으로, 관리자 페이지에서 정적 DB 데이터를 검증하고 MongoDB에 반영할 수 있는 기반을 만든다.

기준 문서:

- `.cloud/102_xlsx_table_data_review_2026-06-29.md`
- `.cloud/107_static_table_dependency_json_mapping_2026-06-29.md`

중요 원칙:

- 동적 유저 데이터는 이 작업 범위에서 제외한다.
- CSV 원본 컬럼은 `snake_case`여도 DB/API 저장 구조는 `camelCase`로 변환한다.
- 모든 원본 row는 import audit/diff/rollback을 위해 `staticTableRows`에 보관한다.
- 런타임에서 자주 읽는 구조는 도메인별 collection 또는 JSON bundle로 따로 만든다.
- commit 전에는 반드시 dry-run과 validation summary를 제공한다.

## CSV 입력 전제

정적 테이블 파일은 다음 경로에 놓인다.

```text
resources/table/*.csv
```

권장 파일명:

```text
{tableCode}__{tableName}.csv
```

예:

```text
G-CHR-01__aidong_master.csv
G-ITM-01__item_catalog.csv
X-ECO-00__currency_master.csv
M05-MAP-02__board_slot.csv
```

실제 제공 파일명은 현재 아래 형식도 함께 사용한다.

```text
{tableCode}_{tableName}.csv
```

예:

```text
G-CHR-01_aidong_master.csv
G-STR-01_M03-HUB-MAP_string_table.csv
X-DLG-AIDONG-0019_daily_dialogue.csv
```

따라서 importer는 `__` 형식과 `_` 형식을 모두 tableCode 파싱 대상으로 인정한다.
파일명에서 tableCode를 읽지 못하는 경우에는 CSV 내부의 `table_code` 컬럼 또는 별도 manifest가 필요하다.

## 1. 정적 table registry 작성

상태: completed

### 목표

CSV 파일을 어떤 규칙으로 읽고, 어떤 MongoDB document로 보낼지 선언하는 registry를 만든다.

### 작업

- backend에 정적 table registry 모듈 추가.
- registry 항목 구조 정의:

```ts
interface StaticTableDefinition {
  tableCode: string
  tableName: string
  category: 'aidong' | 'item' | 'economy' | 'island' | 'sookso' | 'board' | 'story' | 'dialogue' | 'aidongIsland' | 'cosmetic' | 'string'
  importKind: 'row' | 'bundle' | 'excluded'
  requiredColumns: string[]
  primaryKey: string[]
  dependencyKeys: Array<{
    column: string
    referencesTableCode: string
    referencesColumn: string
    optional?: boolean
  }>
  targetCollection: string
  bundleCollection?: string
  bundleBuilder?: string
}
```

- 1차 registry 대상:
  - `G-CHR-01`
  - `X-CHR-00`
  - `X-CHR-02`
  - `X-CHR-04`
  - `X-CHR-05`
  - `X-CHR-06`
  - `G-ITM-01`
  - `X-ITM-00`
  - `X-ITM-01`
  - `G-STR-01`
  - `M03-MAP-00`
  - `M04-MAP-02`
  - `M04-MAP-03`
  - `X-CFG-01`
  - `M05-MAP-02`
  - `X-ECO-00`
  - `X-ECO-01`
  - `X-DLG-00`
  - `X-DLG-AIDONG-*`
  - `M10-STY-01`
  - `M10-STY-02`
  - `M10-STY-04`
  - `M22-MAP-01`
  - `M22-MAP-02`
  - `M22-MAP-03`
  - `M22-SCR-01`
  - `M22-SCR-02`
  - `M22-SCR-03`
  - `M22-SCR-04`
- 동적 테이블은 registry에 `excluded`로 명시한다.
  - 실제 파일 목록에 아직 없는 `M12-*`, `M13-COS-*`, `X-DLG-01` 계열은 이번 registry 대상에서 제외한다.
  - `G-USR-01`
  - `M01-USR-01`
  - `G-CHR-02`
  - `M03-ECO-01`
  - `M04-MAP-00`
  - `M04-MAP-01`
  - `M05-ECO-01`
  - `M05-MAP-01`
  - `M10-USR-01`
  - `M10-USR-02`
  - `M13-PRS-02`
  - `M17-ECO-01`
  - `M19-USR-01`
  - `M21-USR-01`
  - `M22-USR-01`
  - `M22-USR-02`
  - `M23-ITM-01`

### 검증

- registry unit test 추가.
- 모든 registry의 `tableCode` 중복 없음.
- `excluded` 테이블은 commit 대상이 되지 않음.

### 완료 메모

- `packages/backend/src/staticTables/registry.ts` 추가.
- 실제 CSV 파일명 기준의 `{tableCode}_{tableName}.csv`와 기존 권장 `__` 형식을 모두 지원.
- `G-STR-01`처럼 여러 CSV 파일이 같은 tableCode를 공유하는 케이스 지원.
- `X-DLG-AIDONG-*` 패턴 tableCode 지원.
- 실제 파일 목록 기준으로 동적 테이블은 `excluded` 처리.
- registry validation/helper와 persistence 계약 테스트 추가.
- `pnpm --filter backend build` 통과.
- `pnpm test packages/backend/src/backendPersistence.test.ts` 통과.

## 2. CSV parser와 camelCase 변환기 작성

상태: completed

### 목표

`resources/table/*.csv`를 읽어서 tableCode별 row array로 변환한다.

### 작업

- CSV parser 추가.
  - 따옴표, 콤마 포함 문자열, 빈 값 처리.
  - UTF-8 BOM 제거.
  - CRLF/LF 모두 지원.
- 컬럼명 변환:
  - `snake_case` → `camelCase`
  - 이미 camelCase인 컬럼은 유지
  - 공백/특수문자 컬럼은 validation error
- 값 정규화:
  - 빈 문자열은 기본적으로 `undefined`
  - 숫자 컬럼은 registry 또는 추론 규칙으로 number 변환
  - boolean 후보는 `true/false`, `TRUE/FALSE`, `1/0`, `Y/N` 처리
- 파일명에서 tableCode 파싱.
- 파일 hash 계산.

### 검증

- sample CSV fixture로 parser test.
- 한글 컬럼/값 깨짐 없음.
- BOM 있는 CSV도 정상 처리.

### 완료 메모

- `packages/backend/src/staticTables/csv.ts` 추가.
- UTF-8 BOM 제거, CRLF/LF, 따옴표, escaped quote, 콤마 포함 문자열을 처리하는 CSV parser 작성.
- 컬럼명 변환:
  - `snake_case` -> `camelCase`
  - 기존 `camelCase` 유지
  - 공백/특수문자 컬럼은 `invalid_column_name` issue로 보고
  - camelCase 변환 후 중복 컬럼은 `duplicate_column_name` issue로 보고
- 값 정규화:
  - 빈 문자열은 `undefined`
  - `is*`, `enabled`, `required` 등 boolean 성격 컬럼은 `true/false`, `1/0`, `Y/N`, `yes/no` 변환
  - `slotNo`, `lineNo`, `rewardAmount`, `rowCount` 등 수량/순서/좌표 성격 컬럼은 number 변환
  - `aidongId`처럼 ID 성격의 숫자 문자열은 문자열로 보존
- `parseStaticTableCodeFromFileName` registry helper와 연결하여 파일명에서 tableCode 파싱.
- SHA-256 source hash 계산 추가.
- `packages/backend/src/staticTables/csv.test.ts` 추가.
- `pnpm --filter backend build` 통과.
- `pnpm test packages/backend/src/staticTables/csv.test.ts` 통과.

## 3. static import model 추가

상태: completed

### 목표

원본 row, import batch, runtime row/bundle을 MongoDB에 저장할 model을 만든다.

### 작업

공통 audit model:

- `StaticDataImportBatchModel`
- `StaticTableRowModel`

우선순위 높은 runtime row model:

- `StaticAidongMasterModel`
- `StaticItemCatalogModel`
- `StaticAidongPediaItemMasterModel`
- `StaticIslandZoneModel`
- `StaticCurrencyMasterModel`
- `StaticModuleCurrencyPolicyModel`

우선순위 높은 bundle model:

- `StaticBoardSetModel`
- `StaticSooksoRuleSetModel`
- `StaticStringPackModel`

추후 확장 bundle model:

- `StaticAidongIslandBundleModel`
- `StaticStoryBundleModel`
- `StaticDialoguePackModel`
- `StaticCosmeticRuleSetModel`

### index 원칙

- `staticTableRows`: `{ tableCode, version, rowKey }` unique
- domain row collection: table별 primary key unique
- bundle collection: bundle id + version unique
- active 조회용 `{ enabled, version }` index

### 검증

- backend build.
- model import 순환 없음.
- Mongo memory fallback에서도 테스트 가능하도록 repository interface 먼저 둔다.

### 완료 메모

- `packages/backend/src/models/StaticTableModels.ts` 추가.
- 공통 audit model 추가:
  - `StaticDataImportBatchModel`
  - `StaticTableRowModel`
- 우선순위 높은 runtime row model 추가:
  - `StaticAidongMasterModel`
  - `StaticItemCatalogModel`
  - `StaticAidongPediaItemMasterModel`
  - `StaticIslandZoneModel`
  - `StaticCurrencyMasterModel`
  - `StaticModuleCurrencyPolicyModel`
- 우선순위 높은 bundle model 추가:
  - `StaticBoardSetModel`
  - `StaticSooksoRuleSetModel`
  - `StaticStringPackModel`
- 추후 확장 bundle model 추가:
  - `StaticAidongIslandBundleModel`
  - `StaticStoryBundleModel`
  - `StaticDialoguePackModel`
  - `StaticCosmeticRuleSetModel`
- `staticTableRows`는 `{ tableCode, version, rowKey }` unique index.
- row collection은 각 primary key + version unique index.
- bundle collection은 `{ bundleId, version }` unique index.
- active 조회용 `{ enabled, version }` index 추가.
- `packages/backend/src/staticTables/repository.ts` 추가.
  - `StaticTableRepository` interface 작성.
  - `InMemoryStaticTableRepository` 작성.
- persistence 계약 테스트에 static import model/repository 테스트 추가.
- `pnpm --filter backend build` 통과.
- `pnpm test packages/backend/src/backendPersistence.test.ts` 통과.

## 4. validation engine 작성

상태: completed

### 목표

commit 전에 CSV row의 필수 컬럼, primary key 중복, dependency를 검증한다.

### 작업

- 필수 컬럼 검증.
- primary key 중복 검증.
- dependency/FK 검증.
- tableCode별 custom validation hook.
- validation summary shape 정의.

예:

```ts
interface StaticTableValidationSummary {
  ok: boolean
  tableCode: string
  rowCount: number
  errors: Array<{
    level: 'error' | 'warning'
    rowNo?: number
    column?: string
    code: string
    message: string
  }>
}
```

### 최소 dependency 검증

- `G-CHR-01.animalId` → `X-CHR-02.animalId`
- `G-CHR-01.iconId` → `X-CHR-04.iconId`
- `G-ITM-01.iconId` → `X-ITM-00.iconId`
- `X-ITM-01.aidongId` → `G-CHR-01.aidongId`
- `X-ITM-01.itemId` 또는 icon 참조 → item/icon master
- `X-ECO-01.currencyId` → `X-ECO-00.currencyId`
- `M05-MAP-02.boardSetId` → `X-CFG-01.boardSetId`
- `M04-MAP-03.houseId` → `M04-MAP-02.houseId`

### 검증

- 잘못된 FK fixture test.
- 중복 primary key fixture test.
- excluded table commit 시도 시 실패.

### 완료 메모

- `packages/backend/src/staticTables/validation.ts` 추가.
- validation result shape 정의:
  - `StaticTableValidationIssue`
  - `StaticTableValidationSummary`
  - `StaticTableValidationResult`
- `validateStaticTables()` 추가.
- CSV parser issue를 validation issue로 승격.
- unknown tableCode 검증.
- commit 모드에서 `excluded` 동적 테이블 차단.
- 필수 컬럼 누락 검증.
- 필수 값 누락 검증.
- primary key 컬럼 누락 검증.
- primary key 중복 검증.
- dependency/FK 검증.
  - 필수 dependency는 error.
  - optional dependency는 값이 있으면 warning으로 검증.
  - 같은 batch 안의 참조 테이블 row를 기준으로 검사.
- tableCode별 custom validation hook 자리 추가.
- `packages/backend/src/staticTables/validation.test.ts` 추가.
- `pnpm --filter backend build` 통과.
- `pnpm test packages/backend/src/staticTables/validation.test.ts` 통과.
- `pnpm test packages/backend/src/staticTables/csv.test.ts packages/backend/src/staticTables/validation.test.ts` 통과.

## 5. JSON bundle builder 작성

상태: completed

### 목표

강한 의존 그래프를 가진 테이블들을 런타임 조회하기 쉬운 JSON bundle로 만든다.

### 작업

1차 bundle:

- `staticBoardSets`
  - `X-CFG-01` + `M05-MAP-02`
- `staticSooksoRuleSets`
  - `M04-MAP-02` + `M04-MAP-03`
- `staticStringPacks`
  - `G-STR-01` namespace/locale 기준

2차 bundle:

- `staticAidongIslandBundles`
  - `M22-MAP-01` + `M22-MAP-02` + `M22-MAP-03` + `M22-SCR-01` + `M22-SCR-02` + `M22-SCR-03` + `M22-SCR-04`
- `staticStoryBundles`
  - `M10-STY-01` + `M10-STY-02` + `M10-STY-04`
- `staticDialoguePacks`
  - `X-DLG-00` + `X-DLG-AIDONG-*`
- `staticCosmeticRuleSets`
  - `X-CHR-05` + `X-CHR-06`

### 검증

- boardSet bundle에서 slotNo 정렬 확인.
- sooksoRuleSet에서 배치 슬롯과 가구 rule 연결 확인.
- stringPack에서 namespace/locale별 key 중복 확인.

### 완료 메모

- `packages/backend/src/staticTables/bundles.ts` 추가.
- `buildStaticTableBundles()` 추가.
- 지원 bundle:
  - `staticBoardSets`: `X-CFG-01` + `M05-MAP-02`
  - `staticSooksoRuleSets`: `M04-MAP-02` + `M04-MAP-03`
  - `staticStringPacks`: `G-STR-01` namespace/locale 기준
  - `staticStoryBundles`: `M10-STY-01` + `M10-STY-02` + `M10-STY-04`
  - `staticDialoguePacks`: `X-DLG-00` + `X-DLG-AIDONG-*`
  - `staticAidongIslandBundles`: `M22-MAP-01/02/03` + `M22-SCR-01/02/03/04`
  - `staticCosmeticRuleSets`: `X-CHR-05` + `X-CHR-06`
- row 전체를 bundle `data` 안에 보존하여 아직 확정되지 않은 컬럼도 손실 없이 전달.
- board slot은 `slotNo` 기준 정렬.
- story line은 `lineNo` 기준 정렬.
- string pack은 `namespace:locale` 단위로 묶고 `stringKey -> text/value` map 생성.
- dialogue pack은 global/aidongId + locale 단위로 묶음.
- Aidong 개인섬은 islandId 기준으로 page/hotspot/script/condition/effect/choice 묶음 생성.
- `packages/backend/src/staticTables/bundles.test.ts` 추가.
- `pnpm --filter backend build` 통과.
- `pnpm test packages/backend/src/staticTables/csv.test.ts packages/backend/src/staticTables/validation.test.ts packages/backend/src/staticTables/bundles.test.ts` 통과.

## 6. backend import service 작성

상태: completed

### 목표

CSV 파일 scan부터 validation, dry-run, commit까지 담당하는 service를 만든다.

### 작업

service API:

```ts
scanTableFiles(sourceDir: string): Promise<TableFileScanResult>
validateStaticTables(files: TableFile[]): Promise<StaticValidationResult>
previewStaticTableImport(files: TableFile[]): Promise<StaticImportPreview>
commitStaticTableImport(files: TableFile[], actorUid: string): Promise<StaticImportCommitResult>
```

commit 처리:

- import batch 생성
- `staticTableRows` upsert
- row collection upsert
- bundle rebuild
- 이전 active version 비활성화 또는 active pointer 변경
- audit log 생성

### 주의

- commit 중 실패하면 batch status를 `failed`로 남긴다.
- 가능한 범위에서는 Mongo transaction 사용.
- transaction을 못 쓰는 환경이면 idempotent upsert와 batch status로 복구 가능하게 한다.

### 검증

- dry-run은 DB를 수정하지 않음.
- commit 후 같은 파일 재commit 시 중복 row 없음.
- sourceHash가 같으면 no-op 또는 duplicate import warning.

### 완료 메모

- `packages/backend/src/staticTables/service.ts` 추가.
- service API 추가:
  - `scanTableFiles(sourceDir)`
  - `validateStaticTableFiles(files)`
  - `previewStaticTableImport(files, options)`
  - `commitStaticTableImport(files, actorUid, options)`
- `scanTableFiles`:
  - `*.csv`만 스캔.
  - 파일별 parse 성공/실패를 분리.
  - 한 파일 실패가 전체 scan을 중단하지 않음.
- `previewStaticTableImport`:
  - validation 실행.
  - table row count 계산.
  - runtime row collection별 count 계산.
  - bundle collection별 count 계산.
  - bundle preview 반환.
  - repository를 수정하지 않음.
- `commitStaticTableImport`:
  - validation 실패 시 `failed` import batch 기록 후 reject.
  - validation 성공 시 import batch, `staticTableRows`, runtime rows, runtime bundles를 repository에 upsert.
  - `actorUid`, `version`, `importBatchId`, `sourceHash`를 audit 정보로 보존.
- `packages/backend/src/staticTables/service.test.ts` 추가.
- `pnpm --filter backend build` 통과.
- `pnpm test packages/backend/src/staticTables/service.test.ts` 통과.
- `pnpm test packages/backend/src/staticTables/csv.test.ts packages/backend/src/staticTables/validation.test.ts packages/backend/src/staticTables/bundles.test.ts packages/backend/src/staticTables/service.test.ts` 통과.

## 7. admin DB 관리 API 추가

상태: completed

### 목표

관리자 페이지에서 정적 table import를 실행할 수 있는 API를 만든다.

### 후보 endpoint

- `GET /api/admin/static-tables/registry`
- `GET /api/admin/static-tables/files`
- `POST /api/admin/static-tables/validate`
- `POST /api/admin/static-tables/dry-run`
- `POST /api/admin/static-tables/commit`
- `GET /api/admin/static-tables/imports`
- `GET /api/admin/static-tables/imports/:importBatchId`
- `POST /api/admin/static-tables/imports/:importBatchId/activate`

### 권한

- viewer: registry/history 조회만 가능.
- operator: validate/dry-run/commit 가능.
- admin/owner: commit, activate/rollback 가능.

### 검증

- 권한별 접근 test.
- 동적 tableCode commit 시 400 또는 422.
- validation error가 있으면 commit 불가.

### 완료 내역

- Mongo 연결 시에도 정적 table import 결과가 DB에 남도록 `mongoStaticTableRepository`를 추가하고 repository selector에 연결했다.
- generic runtime row/bundle model fallback을 추가해 아직 전용 model이 없는 정적 collection도 저장 가능하게 했다.
- admin DB 관리 API를 추가했다.
  - `GET /api/admin/static-tables/registry`
  - `GET /api/admin/static-tables/files`
  - `POST /api/admin/static-tables/validate`
  - `POST /api/admin/static-tables/dry-run`
  - `POST /api/admin/static-tables/commit`
  - `GET /api/admin/static-tables/imports`
  - `GET /api/admin/static-tables/imports/:importBatchId`
  - `POST /api/admin/static-tables/imports/:importBatchId/activate`
- 기본 실행에서는 `resources/table`에서 importable 정적 CSV만 선택하고, `tableCodes`를 명시하면 해당 table만 대상으로 삼는다.
- 동적 tableCode를 명시 commit하면 validation 단계에서 422로 차단된다.
- 권한 경계:
  - viewer: registry/files/import history 조회 가능.
  - operator: validate/dry-run/commit 가능.
  - admin/owner: activate 가능.
- `packages/backend/src/adminStaticTables.test.ts`를 추가해 권한별 접근, 동적 tableCode 차단, commit 후 runtime row 저장, activate/history를 검증했다.
- 검증:
  - `pnpm --filter backend build` 통과.
  - `pnpm test packages/backend/src/adminStaticTables.test.ts` 통과.
  - `pnpm test packages/backend/src/backendPersistence.test.ts packages/backend/src/staticTables/csv.test.ts packages/backend/src/staticTables/validation.test.ts packages/backend/src/staticTables/bundles.test.ts packages/backend/src/staticTables/service.test.ts packages/backend/src/adminStaticTables.test.ts` 통과.

## 8. 관리자 페이지 DB 관리 화면 연결

상태: completed

### 목표

기존 admin 페이지의 비어 있는 DB 관리 메뉴에 정적 table import UI를 연결한다.

### 작업

- `DB 관리` 탭 또는 메뉴 추가/확장.
- `resources/table` 스캔 결과 표시.
- tableCode, 파일명, rowCount, validation status 표시.
- validation 실행 버튼.
- dry-run 실행 버튼.
- JSON bundle preview.
- commit 버튼.
- import history 표시.
- rollback/activate는 1차에서는 읽기만 하거나 owner/admin에게만 노출.

### 주의

- 화면 파일은 다른 작업자가 목업 담당이므로, 여기서는 API 연결 가능한 최소 UI만 만든다.
- 화면 표면 디자인을 크게 건드리지 않는다.

### 검증

- admin owner 계정으로 DB 관리 화면 접근.
- 일반 유저 접근 차단.
- validate/dry-run/commit 버튼이 API와 연결됨.

### 완료 내역

- `packages/frontend/src/lib/api.ts`에 admin static table API wrapper와 타입을 추가했다.
  - registry/files/validate/dry-run/commit/import history/detail/activate
- `packages/frontend/src/screens/AdminScreen.tsx`의 비어 있던 `DB 관리` 영역을 최소 UI로 연결했다.
  - registry/file/import history count 표시.
  - `resources/table` scan 결과 tableCode, 파일명, rowCount, importKind, target 표시.
  - importable 정적 table만 체크 가능.
  - validation/dry-run/commit 버튼 연결.
  - dry-run/commit preview JSON 표시.
  - import history 표시.
  - owner/admin에게 activate 버튼 노출.
- 권한 표시는 기존 admin role/permission 기준을 따른다.
  - viewer는 조회 중심.
  - operator 이상은 validate/dry-run/commit 가능.
  - owner/admin은 activate 가능.
- 화면 담당자 작업과 충돌을 줄이기 위해 새 화면을 만들지 않고 기존 `AdminScreen`의 DB 관리 카드만 확장했다.
- 검증:
  - `pnpm --filter frontend build` 통과.
  - `pnpm --filter backend build` 통과.

## 9. smoke용 우선 테이블 3종 적용

상태: completed

### 목표

전체 xlsx table을 한 번에 처리하기 전에 가장 작은 단위로 end-to-end smoke를 통과시킨다.

### 우선 대상

1. `X-ECO-00_currency_master.csv`
2. `G-ITM-01_item_catalog.csv`
3. `G-CHR-01_aidong_master.csv`

### 작업

- 각 CSV fixture 또는 실제 `resources/table` 파일 준비.
- registry 등록.
- validation.
- dry-run.
- commit.
- admin import history 확인.
- MongoDB document 확인.

### 검증

- `staticCurrencyMasters`에 `coin`, `diamond` 존재.
- `staticItemCatalogs` primary key 중복 없음.
- `staticAidongMasters` primary key 중복 없음.
- `staticTableRows`에 원본 row snapshot 존재.
- import batch log 존재.

### 완료 내역

- 현재 `resources/table`에는 실제 CSV가 아직 없으므로, 우선순위 3종을 임시 CSV fixture로 만들어 end-to-end smoke를 고정했다.
- `packages/backend/src/staticTables/prioritySmoke.test.ts` 추가.
- smoke 대상:
  - `X-ECO-00_currency_master.csv`
  - `G-ITM-01_item_catalog.csv`
  - `G-CHR-01_aidong_master.csv`
- 검증한 흐름:
  - CSV scan
  - validation
  - dry-run preview
  - commit
  - import batch log 생성
  - `staticTableRows` 원본 row snapshot 생성
  - runtime row collection upsert
- 확인한 runtime collection:
  - `staticCurrencyMasters`: `coin`, `diamond`
  - `staticItemCatalogs`: `basic_food`, `aidong_ribbon`
  - `staticAidongMasters`: `hwanggumeong`, `chumnyang`
- 검증:
  - `pnpm --filter backend build` 통과.
  - `pnpm test packages/backend/src/staticTables/prioritySmoke.test.ts` 통과.
  - `pnpm test packages/backend/src/staticTables/csv.test.ts packages/backend/src/staticTables/validation.test.ts packages/backend/src/staticTables/bundles.test.ts packages/backend/src/staticTables/service.test.ts packages/backend/src/staticTables/prioritySmoke.test.ts packages/backend/src/adminStaticTables.test.ts` 통과.

## 10. board/sookso JSON bundle smoke 적용

상태: completed

### 목표

JSON bundle builder가 실제로 필요한 케이스를 검증한다.

### 대상

- `X-CFG-01_board_set_master.csv`
- `M05-MAP-02_board_slot.csv`
- `M04-MAP-02_house_master.csv`
- `M04-MAP-03_room_placement_slot.csv`

### 검증

- `staticBoardSets`에 boardSet별 slots 배열 생성.
- 같은 boardSet 안에서 slotNo 중복 없음.
- reward reference validation 동작.
- `staticSooksoRuleSets`에 house/placement 묶음 생성.
- 잘못된 furniture slot rule이 있으면 validation error.

### 완료 내역

- `packages/backend/src/staticTables/bundleSmoke.test.ts` 추가.
- 임시 CSV fixture로 board/sookso bundle import smoke를 고정했다.
- smoke 대상:
  - `X-ECO-00_currency_master.csv`
  - `G-ITM-01_item_catalog.csv`
  - `X-CFG-01_board_set_master.csv`
  - `M05-MAP-02_board_slot.csv`
  - `M04-MAP-02_house_master.csv`
  - `M04-MAP-03_room_placement_slot.csv`
- 검증한 흐름:
  - CSV scan
  - validation
  - dry-run preview
  - commit
  - `staticBoardSets` runtime bundle 저장
  - `staticSooksoRuleSets` runtime bundle 저장
  - `staticTableRows` 원본 row snapshot 저장
- `staticBoardSets` 검증:
  - `boardSetId = neighbor`
  - `slots` 배열 생성
  - `slotNo` 기준 정렬
  - reward currency/item reference 포함
- `staticSooksoRuleSets` 검증:
  - `houseId = basic`
  - `placementSlots` 배열 생성
  - `slotNo` 기준 정렬
- 오류 smoke:
  - 같은 boardSet 안의 `slotNo` 중복은 `duplicate_primary_key` error.
  - 존재하지 않는 optional `rewardCurrencyId`는 `dependency_value_not_found` warning.
- 검증:
  - `pnpm --filter backend build` 통과.
  - `pnpm test packages/backend/src/staticTables/bundleSmoke.test.ts` 통과.
  - `pnpm test packages/backend/src/staticTables/csv.test.ts packages/backend/src/staticTables/validation.test.ts packages/backend/src/staticTables/bundles.test.ts packages/backend/src/staticTables/service.test.ts packages/backend/src/staticTables/prioritySmoke.test.ts packages/backend/src/staticTables/bundleSmoke.test.ts packages/backend/src/adminStaticTables.test.ts` 통과.

## 11. backend runtime read API 후보 추가

상태: completed

### 목표

게임 runtime이 정적 데이터를 읽을 수 있는 최소 조회 API를 만든다.

### 후보 endpoint

- `GET /api/static/aidongs`
- `GET /api/static/items`
- `GET /api/static/currencies`
- `GET /api/static/board-sets/:boardSetId`
- `GET /api/static/sookso-rule-set`

### 주의

- 관리자 import API와 runtime read API를 분리한다.
- runtime read API는 active version만 반환한다.
- user dynamic state와 섞지 않는다.

### 검증

- active version만 조회됨.
- disabled row/bundle은 반환되지 않음.

### 완료 내역

- `packages/backend/src/routes/staticData.ts` 추가.
- `/api/static` runtime read API를 backend에 mount했다.
- 추가 endpoint:
  - `GET /api/static/aidongs`
  - `GET /api/static/items`
  - `GET /api/static/currencies`
  - `GET /api/static/board-sets/:boardSetId`
  - `GET /api/static/sookso-rule-set`
  - `GET /api/static/sookso-rule-set?houseId=...`
- runtime read API는 관리자 import API와 분리했다.
- runtime read API는 가장 최근 `activated` import batch의 version만 조회한다.
- `activated` import batch가 없으면 `404 active_static_import_not_found`를 반환한다.
- disabled row/bundle은 응답에서 제외한다.
- `packages/backend/src/staticDataApi.test.ts` 추가.
- 테스트에서 확인한 내용:
  - committed 상태만 있는 경우 runtime read 불가.
  - activated version만 조회.
  - disabled row 제외.
  - aidongs/items/currencies row 조회.
  - boardSet/sooksoRuleSet bundle 조회.
  - activated batch가 여러 개면 `activatedAt`이 가장 최신인 version 우선.
- 검증:
  - `pnpm --filter backend build` 통과.
  - `pnpm test packages/backend/src/staticDataApi.test.ts` 통과.
  - `pnpm test packages/backend/src/staticDataApi.test.ts packages/backend/src/staticTables/csv.test.ts packages/backend/src/staticTables/validation.test.ts packages/backend/src/staticTables/bundles.test.ts packages/backend/src/staticTables/service.test.ts packages/backend/src/staticTables/prioritySmoke.test.ts packages/backend/src/staticTables/bundleSmoke.test.ts packages/backend/src/adminStaticTables.test.ts packages/backend/src/backendPersistence.test.ts` 통과.

## 12. 문서와 운영 절차 업데이트

상태: completed

### 목표

정적 table import 절차를 개발자/운영자가 그대로 따라할 수 있게 문서화한다.

### 수정 대상

- `.cloud/35_backend_db_runbook.md`
- `.cloud/97_api_document_boundary_2026-06-15.md`
- `.cloud/85_developer_onboarding_2026-06-12.md`
- 필요 시 `.cloud/02_module_creator_guide_2026-06-13.md`

### 반드시 남길 내용

- `resources/table/*.csv` 파일명 규칙.
- 정적 table과 동적 table 구분.
- import dry-run/commit 절차.
- rollback은 active version 전환 중심.
- 동적 유저 데이터는 table import 대상이 아님.

### 완료 메모

- `.cloud/35_backend_db_runbook.md` 업데이트:
  - 정적 import 관련 collection 목록 추가.
  - `resources/table/*.csv` 파일명 규칙, `STATIC_TABLE_SOURCE_DIR`, validation/dry-run/commit/activate 운영 절차 추가.
  - rollback은 이전 commit batch activate 중심으로 설명.
  - 동적 유저 데이터는 static table import 대상이 아니며 dynamic schema migration/API/repository 수정으로 처리한다고 명시.
  - `/api/static/*`와 `/api/admin/static-tables/*` 주요 endpoint 추가.
- `.cloud/97_api_document_boundary_2026-06-15.md` 업데이트:
  - runtime static data API boundary 추가.
  - admin static table import API boundary 추가.
  - static import가 소유하는 document/collection과 권한/책임 범위 명시.
- `.cloud/85_developer_onboarding_2026-06-12.md` 업데이트:
  - 정적 table import와 runtime static API 완료 상태 추가.
  - 신규 개발자가 동적 유저 데이터를 CSV import로 처리하지 않도록 금지 사항 추가.
- `.cloud/02_module_creator_guide_2026-06-13.md` 업데이트:
  - `resources/table` 정적 CSV와 `packages/modules/{moduleId}` module-local CSV의 차이 추가.
  - module 제작 완료 체크리스트에 정적/동적 CSV 구분 항목 추가.

## 완료 기준

- `resources/table` CSV 파일을 scan할 수 있다.
- registry가 tableCode별 필수 컬럼/PK/FK/target을 설명한다.
- 동적 tableCode는 import commit 대상에서 제외된다.
- dry-run은 DB를 수정하지 않는다.
- commit은 `staticTableRows`, domain row collection, JSON bundle, import batch log를 생성한다.
- 같은 파일을 다시 commit해도 중복 row가 생기지 않는다.
- 관리자 페이지 DB 관리 메뉴에서 registry/files/validate/dry-run/commit/import history를 확인할 수 있다.
- 최소 smoke 대상 `X-ECO-00`, `G-ITM-01`, `G-CHR-01`이 통과한다.
- board/sookso JSON bundle smoke가 통과한다.
- `pnpm build` 통과.
- backend persistence 또는 static import 전용 test 통과.

## 바로 시작할 작업

현재 108번 static table import 보드의 1~12번은 완료 상태다.

다음 후보:

- 실제 `resources/table` CSV 파일 투입 후 admin 화면에서 운영 dry-run/commit/activate 수동 QA.
- 정적 API를 실제 화면/서비스가 읽도록 적용하는 후속 next_work 작성.
- CSV 원본 변경 diff, batch 비교, rollback UI 고도화 여부 결정.
