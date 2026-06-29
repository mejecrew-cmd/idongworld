# 105_dynamic_schema_migration_runbook_2026-06-29

## 목적

동적 데이터 schema를 `.cloud/103_dynamic_schema_change_policy_2026-06-29.md` 기준으로 운영 DB에 반영하기 위한 실행 절차다.

이 migration은 기존 `users`, `hostStates`, `lodgeStates`, `myAidongStates` 데이터를 삭제하지 않는다.  
새 split collection에 부족한 row를 채우는 방식이며, 기본 실행은 항상 dry-run이다.

## 대상 collection

기존 source:

- `users`
- `hostStates`
- `lodgeStates`
- `myAidongStates`

새 target:

- `providerAccounts`
- `userSettings`
- `userCurrencyBalances`
- `diceResources`
- `userInventoryItems`
- `sooksoStates`
- `roomSlots`
- `roomFurniturePlacements`
- `mydongList`
- `mydongPediaInventory`
- `userCosmeticInventory`
- `mydongCosmeticLoadouts`

## 실행 전 체크리스트

- 운영 DB 백업을 먼저 만든다.
- 백엔드가 같은 `MONGO_URI`를 보고 있는지 확인한다.
- `pnpm build`가 통과한 commit만 배포한다.
- migration 실행 전 관리자 페이지에서 대표 유저 1~2명의 현재 값과 진행 상태를 기록한다.
- 운영 중 실행할 경우, 쓰기 트래픽이 적은 시간에 실행한다.

## dry-run

```bash
pnpm migrate:dynamic-schema
```

또는 backend package에서 직접:

```bash
pnpm --filter backend migrate:dynamic-schema
```

출력의 `mode`가 `dry-run`인지 확인한다.

확인할 항목:

- `userCount`
- `metrics.*.plannedInsert`
- `metrics.*.plannedUpdate`
- `duplicateFailures`가 빈 배열인지
- target collection별 `collectionCounts`

## 로컬 Mongo dry-run

`.env.local`에 `MONGO_URI`가 없고 로컬 기본 DB를 볼 때만 사용한다.

```bash
pnpm migrate:dynamic-schema -- --local-mongo
```

## 실제 반영

dry-run 결과가 정상일 때만 실행한다.

```bash
pnpm migrate:dynamic-schema -- --commit
```

로컬 기본 Mongo에 실제 반영하려면:

```bash
pnpm migrate:dynamic-schema -- --local-mongo --commit
```

## 재실행 정책

이 script는 idempotent하게 작성되어 있다.

- 이미 존재하는 target row는 덮어쓰지 않는다.
- 부족한 row만 `setOnInsert`로 생성한다.
- `users.status`, `users.lastLoginAt`, `users.lastLoginProvider`처럼 누락된 필드만 보정한다.
- 같은 script를 다시 실행해도 unique key 중복 row가 생기면 안 된다.

재실행 후 확인:

```bash
pnpm migrate:dynamic-schema
```

`plannedInsert`가 0에 가까워야 한다. 새 유저가 생겼다면 해당 유저만큼 planned insert가 나올 수 있다.

## 검증 query

Mongo shell 또는 Compass에서 확인한다.

### provider 중복 확인

```js
db.providerAccounts.aggregate([
  { $group: { _id: { providerCode: "$providerCode", providerSubjectId: "$providerSubjectId" }, count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

### currency 중복 확인

```js
db.userCurrencyBalances.aggregate([
  { $group: { _id: { uid: "$uid", currencyId: "$currencyId" }, count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

### inventory 중복 확인

```js
db.userInventoryItems.aggregate([
  { $group: { _id: { uid: "$uid", itemId: "$itemId" }, count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

### 대표 유저 비교

```js
const uid = "확인할_UID"
db.users.findOne({ uid })
db.hostStates.findOne({ uid })
db.providerAccounts.find({ uid }).toArray()
db.userSettings.findOne({ uid })
db.userCurrencyBalances.find({ uid }).toArray()
db.diceResources.findOne({ uid })
db.userInventoryItems.find({ uid }).toArray()
db.sooksoStates.findOne({ uid })
db.mydongList.find({ uid }).toArray()
```

## 애플리케이션 검증

- 기존 계정 로그인 후 `/island` 진입
- F5 후 계정/숙소/재화/주사위 값 유지
- `/setting` 사운드 설정 저장 후 F5 유지
- 관리자 페이지에서 유저 검색
- 관리자 유저 상세의 `동적 스키마 요약` 확인
- 관리자 자원 지급 후 `userCurrencyBalances` 또는 `diceResources` 반영 확인

## rollback 원칙

rollback은 target collection 삭제를 기본값으로 삼지 않는다.

이유:

- migration 이후에도 사용자가 로그인하거나 자원을 획득하면 새 collection이 최신 권위 데이터가 된다.
- target collection을 삭제하면 migration 이후 발생한 운영 데이터가 사라질 수 있다.

따라서 rollback은 다음 순서로 처리한다.

1. 새 코드 배포 직후 문제가 발견되면 백엔드 프로세스를 정지한다.
2. 운영 DB 백업 시점과 장애 발생 시점을 기록한다.
3. 문제가 코드 참조부인지 데이터 생성부인지 구분한다.
4. 코드 문제라면 이전 정상 build로 되돌리고, 새 collection은 삭제하지 않는다.
5. 특정 유저 row가 잘못 생성된 경우에만 백업과 audit를 근거로 선별 수정한다.
6. 전체 삭제가 필요한 경우에도 먼저 `mongodump`로 장애 시점 백업을 만든 뒤 진행한다.

## 수동 전체 rollback이 필요한 예외 상황

다음 조건을 모두 만족할 때만 target collection 삭제를 고려한다.

- migration 직후 사용자 쓰기가 발생하지 않았다.
- 백업이 존재한다.
- 새 코드가 아직 운영 트래픽을 받지 않았다.
- 삭제 대상 collection 목록과 row count를 기록했다.

예외 삭제 대상:

- `providerAccounts`
- `userSettings`
- `userCurrencyBalances`
- `diceResources`
- `userInventoryItems`
- `sooksoStates`
- `roomSlots`
- `roomFurniturePlacements`
- `mydongList`
- `mydongPediaInventory`
- `userCosmeticInventory`
- `mydongCosmeticLoadouts`

## 주의

- 항해 세션 위치는 migration 대상이 아니다.
- 로그인 세션 collection은 만들지 않는다.
- admin DB 관리 메뉴는 정적 테이블 import/update 대상만 다룬다.
- 동적 유저 데이터는 API와 repository를 통해서만 수정한다.
