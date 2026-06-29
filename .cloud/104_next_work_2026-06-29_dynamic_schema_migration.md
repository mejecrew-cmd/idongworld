# 104_next_work_2026-06-29_dynamic_schema_migration

## 목적

`.cloud/103_dynamic_schema_change_policy_2026-06-29.md`에 따라 동적 데이터 DB schema를 xlsx 기준 구조로 전환한다.

이번 작업의 핵심은 단순히 collection/model만 추가하는 것이 아니다.  
새 DB 문서를 실제 기준으로 삼도록 **이미 구현된 repository, service, API, frontend store, 화면 호출부, 테스트까지 함께 바꿔야 한다.**

## 공통 작업 원칙

- 필드명은 전부 `camelCase`로 통일한다.
- 기존 유저 데이터를 바로 삭제하지 않는다.
- 새 collection을 먼저 만들고 기존 collection에서 migration한다.
- 전환 중에는 필요하면 mirror write를 둔다.
- API 응답은 가능한 한 프론트가 쓰기 쉬운 aggregate snapshot으로 유지한다.
- 동적 데이터는 admin 정적 테이블 import로 수정하지 않는다.
- 항해 중 현재 위치/칸 정보는 DB에 저장하지 않는다.
- 로그인 세션 collection은 만들지 않는다.
- 각 단계는 `pnpm build`와 관련 테스트 통과 후 완료 처리한다.

## 1. 계정 users 확장과 providerAccounts 도입

상태: completed

완료 메모:

- `users`에 `status`, `locale`, `lastLoginAt`, `lastLoginProvider`, `aidongTimeBase` 필드 기준을 추가했다.
- `providerAccounts` Mongo model을 추가했다.
- memory/mongo `UserRepository`에 provider account 조회, 목록 조회, 로그인 기록 갱신 계약을 추가했다.
- password/social 로그인 시 provider account row를 생성/갱신하도록 연결했다.
- social entry는 기존처럼 `providerUid === uid`만 가정하지 않고, 먼저 provider account로 기존 계정을 찾는다.
- password login은 로그인 성공 시 `lastLoginAt`, `lastLoginProvider`를 갱신한다.
- 기존 API 응답 형태는 유지했다.
- 검증:
  - `pnpm --filter backend build`
  - `pnpm test -- packages/backend/src/authSocialEntry.test.ts packages/backend/src/backendPersistence.test.ts`

### 목표

`users`는 현재 구현을 최대한 유지하되, 계정 운영 필드를 추가하고 인증 provider를 별도 collection으로 분리한다.

### DB 변경

- `users`에 필드 추가:
  - `status`
  - `locale`
  - `lastLoginAt`
  - `lastLoginProvider`
  - `aidongTimeBase`
- `providerAccounts` collection/model 추가:
  - `id`
  - `uid`
  - `providerCode`
  - `providerSubjectId`
  - `email`
  - `emailNormalized`
  - `emailVerified`
  - `displayName`
  - `photoUrl`
  - `linkedAt`
  - `lastLoginAt`
  - `status`
  - `createdAt`
  - `updatedAt`

### repository/service 변경

- `UserRepository` 또는 계정 repository에서 provider 직접 조회하던 부분을 `providerAccounts` 기준으로 변경한다.
- password 로그인:
  - `providerCode: 'password'`
  - `providerSubjectId: loginIdNormalized`
- Firebase/social 로그인:
  - `providerCode: 'google' | 'twitter' | ...`
  - `providerSubjectId: firebase uid 또는 provider subject`
- 로그인 성공 시:
  - `users.lastLoginAt` 업데이트
  - `users.lastLoginProvider` 업데이트
  - `providerAccounts.lastLoginAt` 업데이트

### API 변경

- 기존 로그인 API 응답 유지:
  - 신규/기존 계정 판정이 깨지면 안 됨
  - title/opening/island 분기 유지
- 계정 연결 API는 아직 만들지 않더라도 provider 구조가 확장 가능해야 함.

### 프론트 영향

- 로그인 화면/password login/Firebase login 호출부가 기존 응답 구조를 계속 처리할 수 있어야 함.
- 기존 계정 로그인 시 title/opening 분기 정책이 흔들리지 않아야 함.

### migration

- 기존 `users.authProvider/providerUid/loginId/passwordHash/email`에서 provider row 생성.
- 여러 번 실행해도 중복 생성되지 않게 unique key를 둔다.

### 검증

- password 신규 가입 → provider row 생성
- password 기존 로그인 → provider row 재사용
- social 기존 로그인 → duplicate key 없이 정상 로그인
- `lastLoginAt`, `lastLoginProvider` 갱신 확인
- `pnpm build`

## 2. userSettings collection 도입과 설정 참조부 전환

상태: completed

완료 메모:

- `userSettings` Mongo model을 추가했다.
- memory/mongo `UserSettingsRepository`를 추가하고 repository selector에 연결했다.
- `userSettings` 기본값은 기존 `users.termsAgreements`, `users.soundSettings`, timezone 계열에서 생성된다.
- 회원가입 완료 시 약관/마케팅/푸시/시간대 값을 `userSettings`에 mirror 저장한다.
- `/api/account/state` 조회/수정은 `userSettings`를 생성/조회하고, `soundSettings`는 `userSettings.bgmVolume/sfxVolume` 기준으로 응답한다.
- `/setting` 기존 lazy 저장 흐름은 그대로 동작하면서 DB의 `userSettings`에도 반영된다.
- 관리자 유저 상세/계정 패치도 `userSettings`를 함께 조회/갱신한다.
- 기존 `users.soundSettings`, `users.termsAgreements`는 호환용 mirror로 유지했다.
- 검증:
  - `pnpm --filter backend build`
  - `pnpm test -- packages/backend/src/authSocialEntry.test.ts packages/backend/src/backendPersistence.test.ts`
  - `pnpm build`

### 목표

약관/마케팅/푸시/사운드/시간대 설정을 `userSettings`로 분리한다.  
기존 `users.termsAgreements`, `users.soundSettings`는 호환용으로 유지하되, 새 기준은 `userSettings`가 된다.

### DB 변경

- `userSettings` collection/model 추가:
  - `uid`
  - `locale`
  - `timeZone`
  - `utcOffsetMinutes`
  - `termsAccepted`
  - `termsVersion`
  - `termsAcceptedAt`
  - `privacyAccepted`
  - `privacyVersion`
  - `privacyAcceptedAt`
  - `marketingAccepted`
  - `pushNotificationAccepted`
  - `bgmVolume`
  - `sfxVolume`
  - `vibrationEnabled`
  - `reduceMotionEnabled`
  - `textSizeLevel`
  - `colorAssistMode`
  - `batterySaveEnabled`
  - `updatedAt`

### repository/service 변경

- 계정 생성 완료 시 `userSettings` 기본값 생성.
- 회원가입 완료 API가 약관/선택 동의/시간대 정보를 `userSettings`에 저장.
- `/setting` 사운드 저장 API가 `userSettings.bgmVolume/sfxVolume`를 기준으로 업데이트.
- 로그인 bootstrap/account progress 응답에서 `userSettings`를 포함.

### 프론트 영향

- 로그인 후 zustand/local state가 `userSettings` 기준으로 사운드 값을 세팅.
- `/setting` 슬라이더는 UI 즉시 반영, DB 저장은 lazy/debounce 방식 유지.
- 약관/마케팅/푸시 체크 값은 가입 완료 시 `userSettings`로 전달.

### migration

- `users.termsAgreements` → `userSettings`
- `users.soundSettings` → `userSettings`
- `users.timeZone`, `users.utcOffsetMinutes` → `userSettings`

### 검증

- 기존 계정 로그인 시 설정 값이 기본값으로 보정됨
- 회원가입 완료 시 `userSettings` 생성
- `/setting`에서 bgm/sfx 변경 후 F5해도 값 유지
- `pnpm build`

## 3. userInventoryItems 도입과 inventory 참조부 전환

상태: completed

완료 메모:

- `userInventoryItems` Mongo model을 추가했다.
- memory/mongo `UserInventoryRepository`를 추가하고 repository selector에 연결했다.
- `HostStateRepository`는 기존 외부 계약을 유지하되, inventory 권위 저장소로 `userInventoryItems`를 사용한다.
- `hostStates.inventory`는 호환 mirror로 유지한다.
- `/api/host/state`, `/api/host/inventory/mutate`, customs host adapter, zone reward, Aidong item 착용 검증 등 기존 호출부가 새 row 저장소를 통과한다.
- 기존 프론트/모듈 API 응답은 `inventory: Record<itemId, quantity>` 형태를 유지한다.
- 유저 삭제 시 `userInventoryItems`도 함께 삭제된다.
- 검증:
  - `pnpm --filter backend build`
  - `pnpm test -- packages/backend/src/backendPersistence.test.ts`
  - `pnpm build`

### 목표

현재 `hostStates.inventory` map 구조를 xlsx의 normalized row 구조인 `userInventoryItems`로 이전한다.

### DB 변경

- `userInventoryItems` collection/model 추가:
  - `id`
  - `uid`
  - `itemId`
  - `quantity`
  - `acquiredAt`
  - `updatedAt`
- unique key:
  - `uid + itemId`

### repository/service 변경

- 전역 인벤토리 조회 API가 `userInventoryItems`를 읽도록 변경.
- 아이템 지급/차감 API가 `userInventoryItems`를 기준으로 upsert.
- 모듈 action reward 지급부가 새 inventory repository를 사용.
- 기존 `hostStates.inventory`를 직접 수정하는 코드 검색 후 전부 교체.

### 프론트 영향

- inventory snapshot shape가 바뀌더라도 프론트 store가 기존 UI에 필요한 map 형태로 받을 수 있게 adapter 제공.
- 관리자 유저 상세의 인벤토리 조회/지급 기능도 새 API 기준으로 변경.

### migration

- 기존 `hostStates.inventory`의 모든 entry를 `userInventoryItems`로 복사.
- 전환 기간에는 필요 시 `hostStates.inventory` mirror write.

### 검증

- 아이템 지급/차감 정상 동작
- 모듈 보상 지급 정상 동작
- F5 후 인벤토리 유지
- admin 지급 API 정상 동작
- `pnpm build`

## 4. currencyBalances / currencyLedger 도입과 재화 참조부 전환

상태: completed

완료 메모:

- `userCurrencyBalances` Mongo model을 추가했다.
- `userCurrencyLedger` Mongo model을 추가했다.
- memory/mongo `CurrencyRepository`를 추가하고 repository selector에 연결했다.
- `HostStateRepository`는 기존 API 응답 호환을 위해 `coins`, `diamonds` mirror를 유지하되, 실제 재화 권위 저장소로 `currencyBalances`를 사용한다.
- `mutateResource(uid, 'coins' | 'diamonds', delta)` 호출은 `currencyLedger`에 변경 이력을 남기도록 전환했다.
- `hostStates.coins`, `hostStates.diamonds`는 기존 프론트/API 호환용 projection으로만 유지한다.
- 관리자 자원 지급, 모듈 보상, customs resource adapter 등 기존 `HostStateRepository` 경유 호출부가 새 currency 저장소를 통과한다.
- 유저 삭제 시 `userCurrencyBalances`, `userCurrencyLedger`도 함께 삭제된다.
- `gems` 잔여 참조를 제거하고 `diamond/diamonds` 기준으로 통일했다.
- 검증:
  - `pnpm --filter backend build`
  - `pnpm test -- packages/backend/src/backendPersistence.test.ts`
  - `pnpm build`

### 목표

`coins`, `diamonds` 같은 고정 필드 재화를 xlsx 기준의 currency 구조로 이전한다.

### DB 변경

- `userCurrencyBalances` collection/model 추가:
  - `id`
  - `uid`
  - `currencyId`
  - `balance`
  - `updatedAt`
- `userCurrencyLedger` collection/model 추가:
  - `id`
  - `uid`
  - `currencyId`
  - `delta`
  - `balanceAfter`
  - `reason`
  - `source`
  - `requestId`
  - `createdAt`
  - `createdBy`

### repository/service 변경

- `coins` 참조 코드를 `currencyId: 'coin'`으로 전환.
- `diamonds` 참조 코드를 `currencyId: 'diamond'`으로 전환.
- `gems` 잔여 참조가 있으면 제거하고 diamond로 통일.
- 자원 지급/차감 API는 ledger를 남긴다.
- 관리자 자원 지급 API도 currency repository를 사용한다.

### 프론트 영향

- 기존 UI가 `coins`, `diamonds`를 기대한다면 API 응답에서 compatibility projection 제공.
- 장기적으로는 프론트 store도 `currencies: Record<currencyId, balance>` 형태로 전환.

### migration

- `hostStates.coins` → `userCurrencyBalances.coin`
- `hostStates.diamonds` → `userCurrencyBalances.diamond`
- ledger에는 `source: 'migration'` 기록.

### 검증

- 로그인 후 보유 코인/다이아 표시 정상
- 관리자 자원 지급 후 즉시 반영
- 기존 모듈 보상 지급 정상
- `gems` 검색 결과 없음
- `pnpm build`

## 5. diceResources 도입과 주사위 참조부 전환

상태: completed

완료 메모:

- `diceResources` Mongo model을 추가했다.
- memory/mongo `DiceResourceRepository`를 추가하고 repository selector에 연결했다.
- `HostStateRepository`는 기존 API 응답 호환을 위해 `diceCount` mirror를 유지하되, 실제 주사위 권위 저장소로 `diceResources.diceQuantity`를 사용한다.
- `/api/host/state`, `/api/host/resources/mutate`, route-neighbor roll, ship harbor charge 등 기존 `diceCount` 경유 호출부가 새 dice repository를 통과한다.
- 항해 roll 후 다시 host state를 조회해도 최신 주사위 수량이 유지되도록 persistence test를 보강했다.
- 항해 세션 위치/현재 칸은 기존 정책대로 DB에 저장하지 않는다.
- 유저 삭제 시 `diceResources`도 함께 삭제된다.
- 검증:
  - `pnpm --filter backend build`
  - `pnpm test -- packages/backend/src/backendPersistence.test.ts`
  - `pnpm build`

### 목표

`hostStates.diceCount`를 `diceResources`로 이전하고, 여러 탭에서 주사위 소모가 즉시 최신 DB 기준으로 보이게 한다.

### DB 변경

- `diceResources` collection/model 추가:
  - `uid`
  - `diceQuantity`
  - `maxDiceQuantity`
  - `chargeIntervalMinutes`
  - `nextChargeAt`
  - `lastChargedAt`
  - `dailyRollCount`
  - `dailyRollDate`
  - `lastServerRollId`
  - `updatedAt`

### repository/service 변경

- 주사위 조회/차감/충전 service를 분리.
- 항해 주사위 굴림 API는 반드시 `diceResources` 기준으로 차감.
- 차감 결과 응답에 최신 `diceResource` snapshot 포함.
- 기존 `hostStates.diceCount` 직접 참조 제거.

### 프론트 영향

- 항해 보드/상단 자원 표시가 굴림 후 최신 주사위 수량으로 갱신.
- 다른 탭에서 돌아왔을 때 resource refresh 가능해야 함.

### migration

- `hostStates.diceCount` → `diceResources.diceQuantity`
- 기본값:
  - `maxDiceQuantity`
  - `chargeIntervalMinutes`
  - `dailyRollCount`

### 검증

- 여러 탭에서 주사위 차감 후 새로고침/재조회 시 동일한 수량 표시
- 주사위 부족 시 서버에서 차단
- 항해 위치는 여전히 DB에 저장하지 않음
- `pnpm build`

## 6. mydongList 도입과 Aidong 참조부 전환

상태: completed

완료 메모:

- `mydongList` Mongo model을 추가했다.
- memory/mongo `MydongRepository`를 추가하고 repository selector에 연결했다.
- `mydongUid`와 `aidongId`를 분리했다.
  - `aidongId`: 원형 Aidong 캐릭터 ID
  - `mydongUid`: 유저가 보유한 개별 Aidong ID
- 현재 중복 보유 UI/기획은 아직 없으므로 기존 호환을 위해 deterministic `mydongUid = uid:aidongId`를 사용한다.
- `my-aidong` service의 보유 여부 검증은 `mydongList`를 권위로 사용한다.
- 기존 `myAidongStates.recruitedAidongs`는 프론트/API 호환 mirror로 유지한다.
- 기존 legacy `recruitedAidongs`만 있는 계정은 my-aidong service 접근 시 `mydongList`로 자동 seed된다.
- `POST /api/modules/my-aidong/recruit` 응답에 `mydongs`를 함께 내려준다.
- `GET /api/modules/my-aidong/owned`를 추가해 `mydongUid`, `aidongId` 포함 보유 Aidong 목록을 조회할 수 있게 했다.
- 유저 삭제 시 `mydongList`도 함께 삭제된다.
- 검증:
  - `pnpm --filter backend build`
  - `pnpm test -- packages/backend/src/backendPersistence.test.ts`
  - `pnpm build`

### 목표

`aidongId`와 `mydongUid`를 분리한다.  
보유 Aidong, 숙소 배정, 코덱스, 코스메틱 등은 앞으로 `mydongUid`를 기준으로 참조한다.

### DB 변경

- `mydongList` collection/model 추가:
  - `mydongUid`
  - `uid`
  - `aidongId`
  - `nickname`
  - `acquiredAt`
  - `acquisitionSource`
  - `favoriteLevel`
  - `status`
  - `createdAt`
  - `updatedAt`

### repository/service 변경

- `myAidongStates.recruitedAidongs` 직접 참조부를 `mydongList` 조회로 교체.
- 영입 API는 `aidongId`를 받아 `mydongUid`를 생성한다.
- Aidong 조회 API는 `mydongUid`, `aidongId`, display data를 함께 내려준다.
- 기존 `characterId` 기준 로직은 adapter로 보정.

### 프론트 영향

- 화면에서 Aidong 선택/배치/케어할 때 내부 key를 `mydongUid`로 사용.
- 표시용 이름/원형 데이터는 `aidongId`로 static master에서 조회.
- 목업 화면 담당자와 충돌하지 않도록 `screens/*.tsx` 표면 UI 대수정은 피하고, store/API adapter 중심으로 처리.

### migration

- 기존 `recruitedAidongs` 배열의 각 `aidongId`로 `mydongList` row 생성.
- 초반에는 `mydongUid`를 deterministic하게 만들어 중복 migration 방지.

### 검증

- 기존 보유 Aidong이 로그인 후 사라지지 않음
- 숙소/항구/배치에서 Aidong 목록 정상 표시
- 같은 `aidongId`를 가진 복수 개체를 표현할 수 있는 구조 확인
- `pnpm build`

## 7. sooksoStates / roomSlots / roomFurniturePlacements 도입

상태: completed

완료 메모:

- `sooksoStates` Mongo model을 추가했다.
- `roomSlots` Mongo model을 추가했다.
- `roomFurniturePlacements` Mongo model을 추가했다.
- memory/mongo `SooksoRepository`를 추가하고 repository selector에 연결했다.
- `/api/account/state` 조회/수정은 `sooksoStates.sooksoClean`, `sooksoStates.sooksoName`을 기준으로 응답한다.
- 기존 `users.sooksoClean`, `users.sooksoName`은 호환용 seed/mirror로 유지했다.
- `lodge` 모듈의 Aidong 숙소 배정은 `roomSlots`를 권위 저장소로 사용한다.
- `lodge` 모듈의 방 가구 배치는 `roomFurniturePlacements`를 권위 저장소로 사용한다.
- 기존 `lodgeStates.assignedAidongs`, `lodgeStates.rooms`는 프론트/API 호환용 mirror로 유지했다.
- 관리자 유저 상세/계정 수정/전체 리셋이 `sooksoStates`, `roomSlots`, `roomFurniturePlacements`를 함께 처리하도록 연결했다.
- 유저 삭제 시 `sooksoStates`, `roomSlots`, `roomFurniturePlacements`도 함께 삭제된다.
- 검증:
  - `pnpm --filter backend build`
  - `pnpm test -- packages/backend/src/backendPersistence.test.ts`
  - `pnpm build`

### 목표

숙소 상태를 xlsx의 normalized 구조로 이전한다.

### DB 변경

- `sooksoStates` collection/model 추가
- `roomSlots` collection/model 추가
- `roomFurniturePlacements` collection/model 추가

### repository/service 변경

- `/island/lodge`가 `sooksoStates.sooksoClean`을 기준으로 상태를 판단.
- 숙소 이름은 `sooksoStates.sooksoName` 기준으로 읽고 저장.
- 방/가구 조회는 `roomSlots`, `roomFurniturePlacements` 기준으로 변경.
- 기존 `users.sooksoClean/sooksoName`, `lodgeStates.rooms/furniture`는 호환용으로만 사용.

### 프론트 영향

- `/island` 잠금 상태는 F5 후에도 DB에서 최신 `sooksoClean`을 받아 유지.
- `/island/lodge` 청소 전/후 화면 분기 유지.
- 닉네임과 숙소 이름 표시가 섞이지 않아야 함.

### migration

- `users.sooksoName/sooksoClean` → `sooksoStates`
- `lodgeStates.rooms` → `roomSlots`
- `lodgeStates.furniture` → `roomFurniturePlacements`

### 검증

- 숙소 청소 완료 후 F5해도 항구/숙소 열림 유지
- 숙소 이름이 닉네임 영역에 표시되지 않음
- 빈 방/선실 꾸미기 정책과 충돌 없음
- `pnpm build`

## 8. mydongPediaInventory 도입과 Codex 참조부 전환

상태: completed

완료 메모:

- `mydongPediaInventory` Mongo model을 추가했다.
- memory/mongo `MydongPediaInventoryRepository`를 추가하고 repository selector에 연결했다.
- 도감/코덱스 보유 수량 권위 저장소를 `mydongUid + pediaItemId` row 구조로 전환했다.
- 기존 `characterId` 기반 API 요청은 현재 유저가 보유한 활성 `mydongUid`로 변환해서 처리한다.
- 기존 `myAidongStates.aidongCodexItems`는 프론트/API 호환용 mirror로 유지했다.
- legacy `aidongCodexItems` map만 있는 계정은 도감 조회/지급 시 `mydongPediaInventory`로 자동 seed된다.
- `grantAidongCodexItem`, `getAidongCodexProgress`, zone 생산 보상 지급, myroom summary/collection 집계가 새 저장소를 통과한다.
- 관리자/디버그 전체 리셋과 유저 삭제 시 `mydongPediaInventory`도 함께 삭제된다.
- 검증:
  - `pnpm --filter backend build`
  - `pnpm test -- packages/backend/src/backendPersistence.test.ts`
  - `pnpm build`

### 목표

도감/코덱스 아이템 보유를 `mydongUid + pediaItemId` 기준 row 구조로 바꾼다.

### DB 변경

- `mydongPediaInventory` collection/model 추가:
  - `id`
  - `uid`
  - `mydongUid`
  - `aidongId`
  - `pediaItemId`
  - `slotNo`
  - `quantity`
  - `maxQuantity`
  - `firstAcquiredAt`
  - `lastAcquiredAt`
  - `source`
  - `updatedAt`

### repository/service 변경

- 도감템 지급/조회 로직을 새 collection 기준으로 변경.
- 기존 `myAidongStates.aidongCodexItems` 직접 참조 제거.
- `mydongList`와 join/compose하여 화면이 필요한 데이터 제공.

### 프론트 영향

- Codex/도감 화면이 `mydongUid` 기준으로 조회 가능해야 함.
- 기존 aidongId 기준 화면에는 adapter 제공.

### migration

- 기존 `aidongCodexItems` map을 순회해 `mydongPediaInventory` row 생성.

### 검증

- 기존 도감 수량 유지
- 도감템 획득 후 수량 증가
- 같은 aidongId의 복수 mydong이 생겨도 분리 가능
- `pnpm build`

## 9. 코스메틱 동적 schema 도입과 장착 참조부 전환

상태: completed

완료 메모:

- `userCosmeticInventory` Mongo model을 추가했다.
- `mydongCosmeticLoadouts` Mongo model을 추가했다.
- `mydongPersonaPartStates` Mongo model을 추가했다.
- memory/mongo `MydongCosmeticRepository`를 추가하고 repository selector에 연결했다.
- Aidong 코스메틱 보유 수량 권위 저장소를 `userCosmeticInventory`로 분리했다.
- Aidong 의상/착용 아이템 권위 저장소를 `mydongUid` 기준 `mydongCosmeticLoadouts`로 분리했다.
- 페르소나 파츠 상태 확장을 위해 `mydongPersonaPartStates` 저장소를 준비했다.
- 기존 `/api/modules/my-aidong/outfit`, `/api/modules/my-aidong/items/equip-toggle` API shape는 유지했다.
- 기존 `myAidongStates.equippedOutfit/equippedItems`는 프론트/API 호환용 mirror로 유지했다.
- 기존 host inventory 기반 Aidong 착용 아이템은 `userCosmeticInventory`로 자동 mirror/seed된다.
- myroom summary는 새 loadout 저장소를 기준으로 `equippedOutfit/equippedItems`를 집계한다.
- 관리자/디버그 전체 리셋과 유저 삭제 시 코스메틱 관련 row도 함께 삭제된다.
- 검증:
  - `pnpm --filter backend build`
  - `pnpm test -- packages/backend/src/backendPersistence.test.ts`
  - `pnpm build`

### 목표

코스메틱 보유/장착/페르소나 파츠 상태를 xlsx 기준으로 분리한다.

### DB 변경

- `userCosmeticInventory` collection/model 추가
- `mydongCosmeticLoadouts` collection/model 추가
- `mydongPersonaPartStates` collection/model 추가

### repository/service 변경

- 기존 `myAidongStates.equippedOutfit/equippedItems` 참조부를 새 loadout 기준으로 변경.
- 코스메틱 보유 여부는 `userCosmeticInventory`로 판단.
- 착용 가능 여부는 정적 master/rule과 함께 검증.

### 프론트 영향

- 아직 목업 수준 화면이면 API adapter까지만 준비.
- 실제 착용/미리보기 화면이 붙을 때 `mydongUid` 기준으로 호출하도록 문서화.

### migration

- 기존 장착 map을 `mydongCosmeticLoadouts`로 변환.
- 기존 인벤토리의 코스메틱성 아이템을 `userCosmeticInventory`로 복사.

### 검증

- 기존 장착 상태가 사라지지 않음
- 착용/해제 API가 새 구조로 동작
- `pnpm build`

## 10. API 응답 aggregate와 frontend store 정리

상태: completed

완료 메모:

- `/api/account/bootstrap` aggregate API를 추가했다.
- bootstrap 응답은 기존 Zustand에 바로 merge 가능한 `state` projection과 새 동적 schema 원본을 담은 `snapshot`을 함께 내려준다.
- `snapshot`에는 다음을 포함한다.
  - `account`
  - `host`
  - `userSettings`
  - `currencies`
  - `diceResource`
  - `inventory`
  - `sookso`
  - `mydongs`
  - `myAidong`
  - `myIsland`
  - `codex`
  - `ship`
  - `pediaInventory`
  - `cosmeticInventory`
  - `cosmeticLoadouts`
  - `personaPartStates`
- bootstrap `state` projection은 기존 화면 호환을 위해 `coins`, `diamonds`, `diceCount`, `inventory`, `recruitedAidongs`, `aidongCodexItems`, `equippedOutfit`, `equippedItems`, `sooksoClean`, `sooksoName` 등을 기존 store shape로 조립한다.
- `hydrateSplitState`는 이제 `/api/account/bootstrap`을 우선 사용하고, 실패하면 기존 split API 조회로 fallback한다.
- 기존 `/api/account/state`는 account/settings/sookso 단일 조회 API로 유지했다.
- backend persistence test에 bootstrap aggregate smoke를 추가했다.
- 검증:
  - `pnpm --filter backend build`
  - `pnpm test -- packages/backend/src/backendPersistence.test.ts`
  - `pnpm build`

### 목표

DB가 여러 collection으로 분리되더라도 프론트가 매 화면마다 조각조각 직접 알 필요 없게 bootstrap/snapshot API를 정리한다.

### 작업

- 로그인 후 account/bootstrap 응답에 포함할 snapshot 재정의:
  - `user`
  - `userSettings`
  - `currencies`
  - `diceResource`
  - `inventory`
  - `sookso`
  - `mydongs`
- zustand store 초기화 로직 변경.
- 기존 `hostState` 중심 참조부를 새 snapshot 기준으로 교체.
- F5 시 `/island`, `/island/lodge`, `/setting`, `/admin`이 필요한 데이터를 다시 fetch하도록 정리.

### 검증

- `/island`에서 F5해도 title/login으로 튕기지 않음
- `/island/lodge`에서 F5해도 sooksoClean 상태 유지
- `/setting`에서 F5해도 사운드 설정 유지
- 로그인 직후 기존 유저와 신규 유저 분기 유지
- `pnpm build`

## 11. 관리자 페이지 영향 정리

상태: completed

완료 메모:

- `/api/admin/users/:uid` 상세 응답에 `splitSummary`를 추가했다.
- `splitSummary`에는 다음 동적 schema 요약을 포함한다.
  - provider 연결 목록
  - `userSettings` 요약
  - `currencyBalances` 기준 coin/diamond
  - `diceResources` 기준 주사위 상태
  - `userInventoryItems` 기준 전역 인벤토리 row/총량/sample
  - `sooksoStates`, 방 배정, 가구 배치 count
  - `mydongs` 보유/active count
  - `mydongPediaInventory` row/총량/Aidong count
  - 코스메틱 보유/장착/persona part state count
- 관리자 화면의 유저 상세 영역에 동적 스키마 요약을 노출했다.
- DB 관리 메뉴 문구를 정적 테이블 import/update 전용 경계로 수정했다.
- 자원 지급 API는 기존처럼 `HostStateRepository.mutateResource`를 쓰지만, 내부적으로 새 currency/dice 저장소를 통과한다.
- 관리자 권한 관리 UI/API는 기존 role preset 방식과 충돌 없이 유지했다.
- 검증:
  - `pnpm --filter backend build`
  - `pnpm test -- packages/backend/src/backendPersistence.test.ts`
  - `pnpm build`

### 목표

admin 페이지는 동적 데이터를 직접 테이블 import하지 않지만, 새 schema를 조회/운영할 수 있어야 한다.

### 작업

- 유저 검색 결과에 새 schema 요약 표시:
  - provider 연결 목록
  - settings 요약
  - currency balances
  - dice resource
  - inventory count
  - mydong count
- 자원 지급 API를 새 currency/inventory 구조로 변경.
- 권한 관리 API와 충돌 없는지 확인.
- DB 관리 메뉴는 정적 master/rule import 대상만 유지.

### 검증

- admin 유저 검색 정상
- admin 자원 지급 정상
- admin 권한 변경 정상
- 동적 table upload 기능을 만들지 않았는지 확인
- `pnpm build`

## 12. migration script와 rollback 문서 작성

상태: completed

완료 메모:

- `packages/backend/scripts/migrate-dynamic-schema.mjs`를 추가했다.
- root/package script를 추가했다.
  - `pnpm migrate:dynamic-schema`
  - `pnpm migrate:dynamic-schema -- --commit`
  - `pnpm migrate:dynamic-schema -- --local-mongo`
- backend package script를 추가했다.
  - `pnpm --filter backend migrate:dynamic-schema`
- migration은 기본 dry-run이며 `--commit`을 붙여야 실제 DB에 반영한다.
- source collection:
  - `users`
  - `hostStates`
  - `lodgeStates`
  - `myAidongStates`
- target collection:
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
- migration은 기존 source document를 삭제하지 않고, target row가 없을 때만 `setOnInsert`로 채운다.
- `users.status`, `users.lastLoginAt`, `users.lastLoginProvider`는 누락된 경우만 보정한다.
- duplicate 검증 aggregation을 script 결과에 포함했다.
- rollback/runbook 문서 `.cloud/105_dynamic_schema_migration_runbook_2026-06-29.md`를 추가했다.
- 로컬 Mongo 검증:
  - 최초 dry-run: planned insert/update 확인, duplicate 없음
  - `--commit`: 8 users 기준 신규 split row 생성 확인
  - 재실행 dry-run: planned insert/update 0, skipped 처리 확인
- 검증:
  - `node --check packages/backend/scripts/migrate-dynamic-schema.mjs`
  - `pnpm --filter backend build`
  - `pnpm --filter backend migrate:dynamic-schema`
  - `pnpm --filter backend migrate:dynamic-schema -- --commit`
  - `pnpm --filter backend migrate:dynamic-schema`
  - `pnpm test -- packages/backend/src/backendPersistence.test.ts`
  - `pnpm build`

### 목표

운영 DB에 적용 가능한 idempotent migration과 rollback/검증 문서를 만든다.

### 작업

- dry-run 가능한 migration script 작성.
- collection별 migration count 출력.
- 중복 실행 시 중복 row가 생기지 않게 unique key 사용.
- migration 전후 검증 query 작성.
- rollback은 삭제가 아니라 새 collection 비활성/기존 collection read fallback 중심으로 설계.

### 검증

- 로컬 Mongo에서 dry-run
- 로컬 Mongo에서 실제 migration
- 재실행해도 count 중복 없음
- `pnpm build`

## 13. 문서 업데이트

상태: completed

완료 메모:

- `.cloud/01_project_history_current_2026-06-13.md`를 현재 구현 기준으로 현행화했다.
  - 2026-06-29 동적 DB schema 전환 기준을 추가했다.
  - `providerAccounts`, `userSettings`, `userCurrencyBalances`, `diceResources`, `userInventoryItems`, `mydongList`, `mydongPediaInventory`, cosmetic/lodge split collection의 권위를 명시했다.
  - `users`, `hostStates`, `myAidongStates`, `lodgeStates`의 일부 필드는 compat/projection/mirror 성격임을 정리했다.
- `.cloud/02_module_creator_guide_2026-06-13.md`를 모듈 제작자 기준으로 갱신했다.
  - 보상 저장 위치를 새 authority collection 기준으로 바꿨다.
  - `aidongId`와 `mydongUid` 차이, 도감템/장착/재화/주사위/인벤토리 저장 위치를 쉽게 구분해 적었다.
  - 모듈 제작자가 legacy field를 직접 원장처럼 쓰지 않도록 주의 사항을 추가했다.
- `.cloud/30_backend_db_rules.md`를 backend DB 규칙 문서로 갱신했다.
  - 2026-06-29 동적 schema 전환 원칙을 추가했다.
  - 인증 provider, 설정, 재화, 주사위, 인벤토리, 숙소, Aidong, cosmetic 관련 collection 책임을 정리했다.
- `.cloud/35_backend_db_runbook.md`를 운영/개발 runbook 기준으로 갱신했다.
  - migration script 실행법과 `.cloud/105_dynamic_schema_migration_runbook_2026-06-29.md` 참조를 추가했다.
  - 수동 QA 기준을 새 collection 기준으로 바꿨다.
- `.cloud/97_api_document_boundary_2026-06-15.md`를 API/document boundary 기준으로 갱신했다.
  - auth/account/bootstrap/host/aidong/ship/lodge/route/zone/customs/debug/voyage API가 어떤 DB document를 읽고 쓰는지 새 schema 기준으로 정리했다.
  - 기존 API response compatibility와 내부 authority collection의 경계를 명확히 했다.
- `.cloud/85_developer_onboarding_2026-06-12.md`를 신규 개발자 온보딩 기준으로 갱신했다.
  - 현재 동적 유저 데이터 split 구조를 먼저 확인하도록 안내했다.
  - 새 feature를 만들 때 선택해야 할 authority collection 기준을 추가했다.
- 검증:
  - 수정 문서에서 replacement character 검색 결과 없음.
  - legacy 표현 검색 결과는 projection/mirror/compat 설명으로 남겨야 하는 참조만 확인됨.
  - `pnpm build` 통과.

### 목표

새 schema 기준을 개발자와 모듈 제작자가 헷갈리지 않게 문서화한다.

### 수정 대상

- `.cloud/01_project_history_current_2026-06-13.md`
- `.cloud/02_module_creator_guide_2026-06-13.md`
- `.cloud/30_backend_db_rules.md`
- `.cloud/35_backend_db_runbook.md`
- `.cloud/97_api_document_boundary_2026-06-15.md`
- 필요 시 `.cloud/85_developer_onboarding_2026-06-12.md`

### 문서에 반드시 남길 내용

- 동적 데이터는 admin 정적 import 대상이 아님
- `mydongUid`와 `aidongId` 차이
- currency/dice/inventory는 더 이상 `hostStates`만 보지 않음
- 항해 세션 위치는 DB에 저장하지 않음
- 설정은 `userSettings` 기준
- provider는 `providerAccounts` 기준

## 완료 기준

전체 완료는 다음 조건을 모두 만족해야 한다.

- `pnpm build` 통과
- 주요 backend test 통과
- 기존 로그인/가입/설정/숙소/인벤토리/항해 기본 플로우 수동 확인
- 기존 유저 데이터가 migration 후 보존됨
- 신규 유저 생성 시 새 collection들이 기본값으로 생성됨
- 기존 코드에서 deprecated field 직접 참조가 남아 있으면 주석 또는 adapter로 통제됨
- 관련 문서 최신화 완료

## 다음 시작 작업

동적 schema migration 작업 보드는 완료 상태다.

정적 데이터 import 작업 전에 먼저 처리할 운영 적용 전 확인 절차:

- `.cloud/106_operational_qa_and_migration_checklist_2026-06-29.md`를 추가했다.
- 로컬 자동 검증:
  - `pnpm build` 통과
  - `pnpm --filter backend migrate:dynamic-schema` dry-run 통과
  - `pnpm test -- packages/backend/src/backendPersistence.test.ts` 통과, 42 tests passed
- 운영에서는 위 체크리스트에 따라 다음 순서로 진행한다.
  - 운영 DB 백업
  - 운영 서버 `pnpm migrate:dynamic-schema` dry-run
  - duplicate/planned count 확인
  - `pnpm migrate:dynamic-schema -- --commit`
  - commit 후 재 dry-run
  - 대표 유저 DB 비교
  - 로그인/가입/설정/숙소/인벤토리/항해/관리자 수동 QA

다음 작업 후보:

- 운영 서버에서 `.cloud/106_operational_qa_and_migration_checklist_2026-06-29.md` 기준 수동 QA와 운영 DB migration을 실제 수행.
- xlsx 기반 정적 데이터 admin import 설계와 구현.
