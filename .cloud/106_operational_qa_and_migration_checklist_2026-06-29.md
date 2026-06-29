# 106_operational_qa_and_migration_checklist_2026-06-29

## 목적

정적 데이터 import 작업을 시작하기 전에, 2026-06-29 동적 DB schema migration이 운영에 적용 가능한 상태인지 확인하기 위한 실행 체크리스트다.

이 문서는 두 가지를 다룬다.

- 운영 적용 전 수동 QA: 로그인/가입/설정/숙소/인벤토리/항해/관리자 기본 플로우 확인
- 운영 DB migration: dry-run 확인 후 commit 실행

## 현재 자동 검증 결과

로컬 기준 자동 검증:

- `pnpm build`: 통과
- `pnpm --filter backend migrate:dynamic-schema`: 통과
  - mode: `dry-run`
  - userCount: 8
  - plannedInsert: 0
  - plannedUpdate: 0
  - duplicateFailures: 없음
- `pnpm test -- packages/backend/src/backendPersistence.test.ts`: 통과
  - 42 tests passed

주의:

- 위 결과는 로컬 개발 DB 기준이다.
- 운영 DB에서는 반드시 운영 서버에서 같은 순서로 다시 dry-run을 확인해야 한다.

## 실행 전 준비

운영에서 이 절차를 실행하기 전 아래 내용을 먼저 기록한다.

```text
실행 일시:
실행자:
배포 commit:
운영 서버:
운영 DB:
백업 파일/스냅샷 위치:
점검 대상 대표 uid:
비고:
```

필수 조건:

- 운영 DB 백업을 먼저 만든다.
- 운영 서버의 `.env.local` 또는 process env가 운영 `MONGO_URI`를 보고 있는지 확인한다.
- 운영 frontend가 운영 backend API를 보고 있는지 확인한다.
- `pnpm build`가 통과한 build만 배포한다.
- 운영 중 실행한다면 쓰기 트래픽이 적은 시간에 한다.

## 1. 운영 배포 전 자동 검증

운영 배포 후보 commit에서 실행한다.

```bash
pnpm build
```

통과 기준:

- backend `tsc` 통과
- frontend `tsc -b && vite build` 통과
- Vite chunk size warning은 실패로 보지 않는다.

핵심 backend persistence test:

```bash
pnpm test -- packages/backend/src/backendPersistence.test.ts
```

통과 기준:

- 모든 test가 통과한다.
- 실패가 sandbox/cache 권한 문제가 아니라 실제 assertion 실패라면 운영 migration을 진행하지 않는다.

## 2. 운영 DB migration dry-run

운영 서버에서 실행한다.

```bash
pnpm migrate:dynamic-schema
```

또는 backend package 기준:

```bash
pnpm --filter backend migrate:dynamic-schema
```

확인할 출력:

```text
mode: dry-run
userCount:
metrics.*.plannedInsert:
metrics.*.plannedUpdate:
collectionCounts:
duplicateFailures:
```

진행 가능 기준:

- `ok`가 `true`다.
- `mode`가 `dry-run`이다.
- `duplicateFailures`가 빈 배열이다.
- `plannedInsert`/`plannedUpdate` 수가 예상 범위다.
  - 이미 운영 DB에 migration이 한 번 반영된 경우 대부분 0에 가까워야 한다.
  - 신규 유저가 있으면 해당 유저 수만큼 plannedInsert가 나올 수 있다.

중단 기준:

- `duplicateFailures`가 하나라도 있다.
- `userCount`가 예상보다 극단적으로 작거나 크다.
- 운영 DB가 아닌 다른 DB를 보고 있는 정황이 있다.
- source collection row가 비어 있는데 실제 서비스 유저가 존재한다.

## 3. 운영 DB migration commit

dry-run 결과가 정상일 때만 실행한다.

```bash
pnpm migrate:dynamic-schema -- --commit
```

실행 직후 확인:

```bash
pnpm migrate:dynamic-schema
```

통과 기준:

- 두 번째 dry-run에서 `plannedInsert`와 `plannedUpdate`가 0에 가깝다.
- `duplicateFailures`가 빈 배열이다.
- `collectionCounts`가 commit 전 계획과 맞는다.

## 4. 운영 DB 중복 검증 query

Mongo shell 또는 Compass에서 실행한다.

provider 중복:

```js
db.providerAccounts.aggregate([
  { $group: { _id: { providerCode: "$providerCode", providerSubjectId: "$providerSubjectId" }, count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

currency 중복:

```js
db.userCurrencyBalances.aggregate([
  { $group: { _id: { uid: "$uid", currencyId: "$currencyId" }, count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

inventory 중복:

```js
db.userInventoryItems.aggregate([
  { $group: { _id: { uid: "$uid", itemId: "$itemId" }, count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

통과 기준:

- 세 query 모두 결과가 빈 배열이다.

## 5. 대표 유저 DB 비교

대표 uid를 하나 이상 골라서 확인한다.

```js
const uid = "확인할_UID"
db.users.findOne({ uid })
db.providerAccounts.find({ uid }).toArray()
db.userSettings.findOne({ uid })
db.userCurrencyBalances.find({ uid }).toArray()
db.diceResources.findOne({ uid })
db.userInventoryItems.find({ uid }).toArray()
db.sooksoStates.findOne({ uid })
db.roomSlots.find({ uid }).toArray()
db.roomFurniturePlacements.find({ uid }).toArray()
db.mydongList.find({ uid }).toArray()
db.mydongPediaInventory.find({ uid }).toArray()
db.userCosmeticInventory.find({ uid }).toArray()
db.mydongCosmeticLoadouts.find({ uid }).toArray()
```

확인 기준:

- `users`는 계정 기본 정보 중심으로 유지된다.
- 설정/약관/마케팅/푸시/사운드는 `userSettings`에 있다.
- coin/diamond는 `userCurrencyBalances`에 있다.
- 주사위는 `diceResources`에 있다.
- Aidong 소지 아이템은 `userInventoryItems`에 있다.
- 숙소 청소/숙소 이름은 `sooksoStates`에 있다.
- 숙소 방 배정은 `roomSlots`에 있다.
- 숙소 가구 배치는 `roomFurniturePlacements`에 있다.
- 보유 Aidong은 `mydongList`에 있다.
- 도감템 수량은 `mydongPediaInventory`에 있다.
- cosmetic 보유/장착 상태는 cosmetic split collection에 있다.

## 6. 운영 수동 QA

아래 QA는 운영 frontend와 운영 backend가 연결된 상태에서 진행한다.

### 6.1 로그인/가입

- `/` 진입 시 로그인 세션 확인 splash가 뜬다.
- 세션이 없으면 `/login`으로 간다.
- 기존 계정 로그인 후 title이 뜬다.
- 기존 계정 title에서 `입장하기`를 누르면 `/island`로 간다.
- 신규 계정은 가입 화면을 거친 뒤 opening/title/island 플로우가 정상 진행된다.
- 가입 코드가 틀리면 가입되지 않는다.
- 가입 취소 후 같은 ID/password로 로그인되지 않는다.

DB 확인:

- 가입 완료 전에는 `users` document가 생성되지 않아야 한다.
- 가입 완료 후에는 `users`, `userSettings`, 기본 resource split row가 생성된다.

### 6.2 설정

- `/setting`에서 BGM volume을 변경한다.
- `/setting`에서 SFX volume을 변경한다.
- F5 후 값이 유지된다.
- 로그아웃 후 재로그인해도 값이 유지된다.

DB 확인:

- `userSettings.soundSettings.bgmVolume`
- `userSettings.soundSettings.sfxVolume`

### 6.3 숙소

- `sooksoClean=false` 계정은 `/island`에서 숙소 외 구역이 잠겨 있다.
- `/island/lodge`에서 숙소 청소 UI가 뜬다.
- 청소 완료 후 숙소 이름을 저장하면 `/island`로 돌아간다.
- F5 후에도 항구와 숙소가 열린 상태가 유지된다.
- 숙소 이름은 닉네임 영역을 덮어쓰지 않고 숙소 화면에서만 표시된다.

DB 확인:

- `sooksoStates.sooksoClean`
- `sooksoStates.sooksoName`

### 6.4 인벤토리/재화/주사위

- 관리자 자원 지급 또는 게임 내 보상으로 coin/diamond가 변한다.
- F5 후 coin/diamond가 유지된다.
- 주사위 소모 후 다른 탭에서 새로고침하면 최신 주사위 수량이 반영된다.
- Aidong 소지 아이템 획득 시 `userInventoryItems`에 반영된다.

DB 확인:

- `userCurrencyBalances`
- `userCurrencyLedger`
- `diceResources`
- `userInventoryItems`

### 6.5 항해

- 항해 위치는 DB에 저장되지 않는다.
- 항해 중 F5 또는 창 닫기 후 새 진입 시 DB가 출항 중이라고 판단하지 않는다.
- 항구는 항상 정박 상태 화면으로 볼 수 있다.
- 주사위 소모 같은 자원 변화만 DB에 반영된다.
- 아이동이 있는 섬에서만 도착섬 진입 버튼이 뜬다.

DB 확인:

- 항해 칸 위치를 저장하는 document가 생기지 않는다.
- 주사위 변화만 `diceResources`에 반영된다.

### 6.6 관리자

- 관리자 로그인 후 `/admin` 접근이 가능하다.
- 일반 유저는 `/admin` 접근이 막힌다.
- uid/email/nickname/loginId 검색이 동작한다.
- 유저 상세에서 role이 표시된다.
- 일반 유저는 `유저`로 표시된다.
- role 변경은 viewer/operator/admin/owner 중 하나만 선택 가능하다.
- operator는 권한 부여를 할 수 없다.
- owner/admin은 권한 부여가 가능하다.
- 유저 자원 지급 시 split resource collection에 반영된다.
- DB 관리 메뉴는 비어 있거나 준비 상태로 보이며, 동적 유저 데이터를 정적 import 대상으로 다루지 않는다.

DB 확인:

- `adminUsers`
- `adminAuditLogs`
- `userCurrencyBalances`
- `diceResources`

## 7. 실패 시 중단 기준

아래 중 하나라도 발생하면 정적 데이터 import 작업으로 넘어가지 않는다.

- migration dry-run에서 duplicate failure가 발생한다.
- migration commit 후 재 dry-run에서 예상 밖 plannedInsert/plannedUpdate가 계속 나온다.
- 기존 계정의 기본 진행 상태가 사라진다.
- F5 후 `sooksoClean`, sound setting, currency, dice가 유지되지 않는다.
- 관리자 자원 지급이 split collection이 아닌 legacy field에만 반영된다.
- 항해 세션 위치가 DB에 저장된다.
- 신규 가입 취소 계정이 로그인 가능하다.

## 8. 완료 기록

```text
자동 검증 완료 여부:
운영 dry-run 완료 여부:
운영 commit 완료 여부:
commit 후 재 dry-run 결과:
대표 유저 DB 비교 결과:
수동 QA 완료 여부:
남은 이슈:
정적 데이터 import 작업 진행 가능 여부:
```
