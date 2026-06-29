# 103_dynamic_schema_change_policy_2026-06-29

## 목적

`.cloud/102_xlsx_table_data_review_2026-06-29.md`에서 확인한 xlsx 동적 데이터 구조를 기준으로, 현재 DB schema를 어떤 방향으로 바꿀지 정책을 확정한다.

이 문서는 **관리자 페이지에서 정적 테이블을 업로드하는 정책**이 아니다.  
여기서 다루는 대상은 유저 계정, 인증 provider, 인벤토리, 재화, 주사위, 숙소, 아이동, 설정, 코스메틱처럼 런타임에 계속 바뀌는 **동적 데이터 schema 전환 정책**이다.

## 공통 원칙

### 1. 필드명은 전부 camelCase로 통일한다

xlsx 원본 컬럼은 `snake_case`가 많지만, 서버 코드와 DB 저장 구조는 `camelCase`로 통일한다.

예:

| xlsx 컬럼 | DB/API 필드 |
| --- | --- |
| `user_uid` | `uid` |
| `created_at` | `createdAt` |
| `last_login_at` | `lastLoginAt` |
| `provider_code` | `providerCode` |
| `provider_subject_id` | `providerSubjectId` |
| `mydong_uid` | `mydongUid` |
| `currency_id` | `currencyId` |
| `dice_quantity` | `diceQuantity` |
| `room_slot_no` | `roomSlotNo` |

### 2. 동적 데이터는 admin 정적 import로 수정하지 않는다

아래 데이터는 관리자 페이지의 CSV/XLSX 정적 import 대상이 아니다.

- 유저 계정
- provider 연동 상태
- 로그인 세션
- 유저 인벤토리
- 유저 재화 잔액
- 주사위 보유/충전 상태
- 숙소 상태
- 보유 아이동 상태
- 도감/코덱스 진행도
- 설정
- 코스메틱 보유/장착 상태

이 데이터들은 다음 방식으로만 바꾼다.

- 서버 API
- 관리자 전용 운영 API
- 명시적 migration script
- 모듈 action
- 검증 가능한 운영 도구

### 3. xlsx를 무조건 복사하지 않는다

xlsx는 기획 기준 데이터 구조다. 이미 현재 구현에서 확정된 정책이 있으면 현재 구현을 우선한다.

특히 다음은 현재 구현 정책을 유지한다.

- `uid` 필드명
- `createdAt`/`updatedAt`의 number timestamp 형식
- 로그인 세션을 DB에 저장하지 않는 구조
- 항해 중 현재 위치/칸 정보를 DB에 저장하지 않는 구조
- 약관/마케팅/푸시 동의의 현재 저장 의미

## A. users schema 정책

### 결론

`users`는 되도록 현재 구현을 유지한다.  
다만 xlsx에 있고 현재 없는 계정 운영 필드는 추가한다.

### 유지하는 것

| 항목 | 정책 |
| --- | --- |
| 유저 식별자 | `userUid`가 아니라 현재 구현의 `uid`를 계속 사용 |
| 생성/수정 시각 | `createdAt`, `updatedAt` 유지 |
| timestamp 타입 | `Date` 객체가 아니라 현재처럼 number timestamp 유지 |
| 계정 본체 collection | `users` 유지 |
| 숙소 청소 여부 | 당장은 `users.sooksoClean` 유지 |
| 숙소 이름 | 당장은 `users.sooksoName` 유지 |
| 오프닝/온보딩 플래그 | `openingSeen`, `onboardingComplete` 등 현재 구현 유지 |

### 새로 추가할 필드

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `status` | string | 계정 상태. 예: `active`, `suspended`, `withdrawn` |
| `locale` | string | 표시 언어/지역. 예: `ko-KR` |
| `lastLoginAt` | number | 마지막 로그인 시각 |
| `lastLoginProvider` | string | 마지막 로그인 provider. 예: `password`, `google`, `twitter` |
| `aidongTimeBase` | string | 아이동월드 내부 시간 기준. 기획 확정 전까지 timezone 계열과 분리 보관 |

### users에서 장기적으로 빼야 하는 것

약관/마케팅/푸시 동의는 현재 구조를 유지하되, 앞으로 설정 전용 schema로 옮길 수 있도록 준비한다.

후보:

- `termsAgreements`
- `marketingAccepted`
- `pushNotificationAccepted`
- 사운드 설정 일부

단, 기존 로그인/가입 API가 이미 이 필드들을 사용하므로 즉시 제거하지 않는다.  
먼저 `userSettings` 쪽에 복제 저장하고, API 읽기 기준을 바꾼 뒤 migration으로 정리한다.

## B. 인증 provider 구조 정책

### 결론

인증 구조는 xlsx 쪽을 따른다.  
즉, 한 유저가 여러 provider를 연결할 수 있도록 `providerAccounts` 구조를 도입한다.

### 현재 문제

현재는 `users` 문서에 다음 인증 정보가 섞여 있다.

- `authProvider`
- `providerUid`
- `loginId`
- `loginIdNormalized`
- `passwordHash`
- `email`
- `emailNormalized`

이 구조는 “한 유저가 Google, X, password를 동시에 연결”하는 상황을 표현하기 어렵다.

### 새 collection 후보: `providerAccounts`

```ts
interface ProviderAccountDoc {
  id: string
  uid: string
  providerCode: 'password' | 'google' | 'twitter' | 'apple' | 'kakao' | 'naver' | 'line'
  providerSubjectId: string
  email?: string
  emailNormalized?: string
  emailVerified?: boolean
  displayName?: string
  photoUrl?: string
  linkedAt: number
  lastLoginAt?: number
  status: 'active' | 'unlinked' | 'blocked'
  createdAt: number
  updatedAt: number
}
```

### unique key

- `providerCode + providerSubjectId`는 전역 unique
- `uid + providerCode + providerSubjectId`도 중복 불가
- password provider의 경우 `providerSubjectId`는 `loginIdNormalized` 또는 별도 stable id를 사용

### migration 방향

1. 기존 `users.authProvider/providerUid/loginId/passwordHash`를 읽어 provider row 생성
2. 로그인 시 `providerAccounts`를 먼저 조회
3. 기존 `users`의 인증 필드는 호환용으로만 남김
4. 충분히 안정화되면 `users`의 provider 직접 필드를 제거하거나 deprecated 처리

## C. 로그인 세션 구조 정책

### 결론

로그인 세션은 DB에서 관리하지 않는 현재 형식을 유지한다.

xlsx의 `auth_sessions` 같은 세션 테이블은 당장 도입하지 않는다.

### 이유

현재 로그인은 다음 구조를 사용한다.

- Firebase ID token
- password 로그인 token
- 프론트 local/session 상태
- 서버 token 검증

로그인 세션을 DB에 저장하면 세션 무효화, 만료, device 관리까지 같이 설계해야 한다.  
현재 범위에서는 너무 커진다.

### 정책

- `authSessions` collection은 만들지 않는다.
- 로그아웃은 클라이언트 token 제거 중심으로 처리한다.
- 서버 강제 로그아웃/세션 차단이 필요해지는 시점에 별도 보안 정책으로 다시 설계한다.

## D. 유저 인벤토리 정책

### 결론

유저 인벤토리는 xlsx의 normalized row 구조를 따른다.

현재 `hostStates.inventory: Record<string, number>` 구조는 장기적으로 `userInventoryItems`로 이전한다.

### 새 collection 후보: `userInventoryItems`

```ts
interface UserInventoryItemDoc {
  id: string
  uid: string
  itemId: string
  quantity: number
  acquiredAt?: number
  updatedAt: number
}
```

### unique key

- `uid + itemId`

### 전환 이유

normalized row 구조가 필요한 이유:

- 관리자 검색/수정이 쉬움
- 특정 아이템을 가진 유저 조회 가능
- 지급/회수 이력과 연결 쉬움
- 아이템 종류가 늘어나도 schema 변경이 필요 없음

### migration 방향

1. 기존 `hostStates.inventory`의 key/value를 `userInventoryItems` row로 복사
2. API 읽기 기준을 `userInventoryItems`로 변경
3. 한동안 `hostStates.inventory`에 mirror write
4. 안정화 후 `hostStates.inventory`는 deprecated 처리

## E. 재화 구조 정책

### 결론

재화는 xlsx 쪽 구조를 따른다.

현재 `hostStates.coins`, `hostStates.diamonds` 같은 고정 필드 구조는 장기적으로 `currencyBalances` 구조로 옮긴다.

### 정적 master

`currencyMaster`는 정적 데이터로 관리한다.

예:

```ts
interface CurrencyMasterDoc {
  currencyId: string
  displayName: string
  currencyType: 'soft' | 'premium' | 'event' | 'module'
  enabled: boolean
  createdAt: number
  updatedAt: number
}
```

### 유저 잔액 collection 후보: `userCurrencyBalances`

```ts
interface UserCurrencyBalanceDoc {
  id: string
  uid: string
  currencyId: string
  balance: number
  updatedAt: number
}
```

### 이력 collection 후보: `userCurrencyLedger`

```ts
interface UserCurrencyLedgerDoc {
  id: string
  uid: string
  currencyId: string
  delta: number
  balanceAfter: number
  reason: string
  source: 'game' | 'admin' | 'purchase' | 'migration' | 'system'
  requestId?: string
  createdAt: number
  createdBy?: string
}
```

### migration 방향

| 현재 필드 | 새 currencyId 후보 |
| --- | --- |
| `coins` | `coin` |
| `diamonds` | `diamond` |

`gems`는 이미 제거 방향이므로 새 구조에 만들지 않는다.  
기존 `gems` 참조는 모두 `diamonds` 또는 `diamond` currency로 흡수한다.

## F. 주사위 구조 정책

### 결론

주사위는 xlsx 쪽 구조를 따른다.

현재 `hostStates.diceCount`는 장기적으로 `diceResources`로 이전한다.

### 새 collection 후보: `diceResources`

```ts
interface DiceResourceDoc {
  uid: string
  diceQuantity: number
  maxDiceQuantity: number
  chargeIntervalMinutes: number
  nextChargeAt?: number
  lastChargedAt?: number
  dailyRollCount: number
  dailyRollDate?: string
  lastServerRollId?: string
  updatedAt: number
}
```

### 정책

- 주사위 수량 증감은 반드시 서버 API에서 처리한다.
- 차감/증가 결과는 DB에 기록한다.
- 여러 탭에서 굴려도 서버 DB 기준으로 최신 주사위 수량을 반환해야 한다.
- 클라이언트는 굴린 뒤 반드시 최신 resource snapshot을 다시 받는다.

### migration 방향

1. `hostStates.diceCount` 값을 `diceResources.diceQuantity`로 복사
2. 주사위 API 응답을 `diceResources` 기준으로 변경
3. `hostStates.diceCount`는 읽기 호환용으로만 유지
4. 안정화 후 deprecated

## G. 항해 세션 위치 정책

### 결론

항해 세션 위치를 DB에 저장하지 않는 현재 구현을 따른다.

xlsx의 `board_run.current_slot_no` 같은 필드는 항해 중 세션 상태로 사용하지 않는다.

### 유지할 정책

- 항해 중/항구 정박 중 여부는 DB가 모른다.
- 현재 칸, 현재 보드 위치, 현재 항해 진행 중 여부는 브라우저 세션에 둔다.
- 항해 창을 닫으면 세션 정보는 사라진다.
- 다른 탭은 독립 항해 세션을 시작할 수 있다.
- DB에는 주사위 차감, 보상 지급, 아이템 획득 같은 결과만 기록한다.

### xlsx `board_run` 처리

`boardRun`은 당장 DB collection으로 만들지 않는다.

단, 기획상 `boardRun`이 “항해 세션”이 아니라 “영구 보드 이벤트 진행도”로 재정의되면 별도 이름으로 다시 설계한다.

권장 이름:

- 항해 임시 상태: `voyageSessionState` 단, DB 저장 금지
- 영구 이벤트 보드: `eventBoardProgress`

## H. 숙소 구조 정책

### 결론

숙소는 xlsx 쪽 구조를 따른다.

현재 `lodgeStates.rooms/furniture` mixed object 구조는 장기적으로 normalized structure로 전환한다.

### 새 collection 후보

#### `sooksoStates`

```ts
interface SooksoStateDoc {
  uid: string
  sooksoName?: string
  sooksoClean: boolean
  houseId?: string
  houseLevel?: number
  activeRoomSlotNo?: number
  createdAt: number
  updatedAt: number
}
```

#### `roomSlots`

```ts
interface RoomSlotDoc {
  id: string
  uid: string
  roomSlotNo: number
  roomName?: string
  unlocked: boolean
  assignedMydongUid?: string
  createdAt: number
  updatedAt: number
}
```

#### `roomFurniturePlacements`

```ts
interface RoomFurniturePlacementDoc {
  id: string
  uid: string
  roomSlotNo: number
  placementSlotId: string
  furnitureItemId: string
  rotation?: number
  positionX?: number
  positionY?: number
  createdAt: number
  updatedAt: number
}
```

### migration 방향

1. `users.sooksoName`, `users.sooksoClean`을 `sooksoStates`로 복사
2. `lodgeStates.rooms`를 `roomSlots`로 해석 가능한 만큼 변환
3. `lodgeStates.furniture`를 `roomFurniturePlacements`로 변환
4. lodge UI/API 읽기 기준을 새 structure로 변경
5. 기존 `lodgeStates.rooms/furniture`는 deprecated

## I. 아이동 구조 정책

### 결론

아이동은 xlsx 쪽 구조를 따른다.

핵심은 `aidongId`와 `mydongUid`를 분리하는 것이다.

### 개념 구분

| 개념 | 설명 |
| --- | --- |
| `aidongId` | 정적 Aidong 원형 ID |
| `mydongUid` | 유저가 실제로 보유한 Aidong 개체 ID |

예를 들어 같은 `aidongId = AIDONG-0001`이라도, 유저가 가진 개체는 `mydongUid = MYDONG-abc123`처럼 별도 ID를 갖는다.

### 새 collection 후보: `mydongList`

```ts
interface MydongDoc {
  mydongUid: string
  uid: string
  aidongId: string
  nickname?: string
  acquiredAt: number
  acquisitionSource?: string
  favoriteLevel?: number
  status: 'active' | 'archived'
  createdAt: number
  updatedAt: number
}
```

### 전환 이유

현재 `myAidongStates.recruitedAidongs: string[]`는 `aidongId` 목록이다.  
이 구조로는 다음 기능을 안정적으로 표현하기 어렵다.

- 같은 Aidong 원형을 여러 개체로 보유
- 개체별 호감도
- 개체별 도감템
- 개체별 코스메틱 착용
- 개체별 방 배정
- 개체별 개인섬 진행도

### migration 방향

1. 기존 `recruitedAidongs`의 각 `aidongId`를 기준으로 `mydongUid` 생성
2. 호환 기간 동안 `mydongUid === aidongId`처럼 보이는 adapter 제공 가능
3. UI/API는 점진적으로 `mydongUid` 기준으로 변경
4. `myAidongStates.recruitedAidongs`는 deprecated

## J. Codex/도감 구조 정책

### 결론

아이동 구조를 `mydongUid` 기준으로 바꾸므로 Codex/도감도 xlsx 기준으로 바꾼다.

### 새 collection 후보: `mydongPediaInventory`

```ts
interface MydongPediaInventoryDoc {
  id: string
  uid: string
  mydongUid: string
  aidongId: string
  pediaItemId: string
  slotNo?: number
  quantity: number
  maxQuantity?: number
  firstAcquiredAt?: number
  lastAcquiredAt?: number
  source?: string
  updatedAt: number
}
```

### 현재 구조와의 관계

현재 `myAidongStates.aidongCodexItems`는 `aidongId -> itemId -> quantity` 형태에 가깝다.  
앞으로는 `mydongUid + pediaItemId` 기준으로 바꾼다.

### migration 방향

1. 기존 codex item map을 순회
2. 각 `aidongId`에 대응하는 `mydongUid`를 찾음
3. `mydongPediaInventory` row 생성
4. codex 조회 API를 새 collection 기준으로 변경

## K. 설정 구조 정책

### 결론

약관/마케팅/푸시 동의는 현재 의미를 유지한다.  
대신 xlsx처럼 설정 전용 table/collection을 새로 만들고 거기에 복제/확장 저장한다.

### 새 collection 후보: `userSettings`

```ts
interface UserSettingsDoc {
  uid: string
  locale?: string
  timeZone?: string
  utcOffsetMinutes?: number
  termsAccepted: boolean
  termsVersion?: string
  termsAcceptedAt?: number
  privacyAccepted: boolean
  privacyVersion?: string
  privacyAcceptedAt?: number
  marketingAccepted: boolean
  pushNotificationAccepted: boolean
  bgmVolume: number
  sfxVolume: number
  vibrationEnabled?: boolean
  reduceMotionEnabled?: boolean
  textSizeLevel?: 'small' | 'normal' | 'large'
  colorAssistMode?: string
  batterySaveEnabled?: boolean
  updatedAt: number
}
```

### 주의

마케팅/푸시 동의는 “법적 동의 이력” 성격과 “설정값” 성격이 섞여 있다.

따라서 다음처럼 나눈다.

- 법적 동의 이력: 변경 이력을 남겨야 하는 audit 성격
- 현재 설정값: `userSettings`에서 빠르게 읽는 현재값

초기에는 둘을 모두 저장하되, API 응답은 `userSettings`를 기준으로 정리한다.

### migration 방향

1. `users.termsAgreements`와 `users.soundSettings`에서 `userSettings` 생성
2. 로그인 시 `userSettings`를 같이 내려줌
3. 설정 화면 저장 API는 `userSettings`를 업데이트
4. 기존 `users.soundSettings`는 호환 mirror write 후 deprecated

## L. 코스메틱 구조 정책

### 결론

코스메틱은 xlsx 쪽 구조를 따른다.

정적 master/rule과 유저 보유/착용 상태를 분리한다.

### 정적 데이터

정적 import 대상:

- cosmetic item master
- cosmetic slot master
- fit rule
- render rule
- persona part slot master
- default persona part

### 동적 collection 후보

#### `userCosmeticInventory`

```ts
interface UserCosmeticInventoryDoc {
  id: string
  uid: string
  cosmeticItemId: string
  quantity: number
  acquiredAt?: number
  updatedAt: number
}
```

#### `mydongCosmeticLoadouts`

```ts
interface MydongCosmeticLoadoutDoc {
  id: string
  uid: string
  mydongUid: string
  slotId: string
  cosmeticItemId: string
  updatedAt: number
}
```

#### `mydongPersonaPartStates`

```ts
interface MydongPersonaPartStateDoc {
  id: string
  uid: string
  mydongUid: string
  partSlotId: string
  partValueId: string
  updatedAt: number
}
```

### migration 방향

현재 `myAidongStates.equippedOutfit/equippedItems`는 새 코스메틱 구조의 호환 source로만 사용한다.

1. 기존 장착 상태를 `mydongCosmeticLoadouts`로 변환
2. 기존 보유 아이템 중 코스메틱을 `userCosmeticInventory`로 복사
3. 착용/해제 API는 새 collection 기준으로 변경
4. 기존 equipped map은 deprecated

## 우선순위 제안

동적 schema 전환은 한 번에 모두 바꾸면 위험하다. 아래 순서가 안전하다.

### 1단계: 계정/인증 기반 정리

1. `users`에 `status`, `locale`, `lastLoginAt`, `lastLoginProvider`, `aidongTimeBase` 추가
2. `providerAccounts` collection 추가
3. password/google/twitter 로그인 시 provider row 생성/조회
4. 기존 `users` provider 필드는 호환 유지

### 2단계: 설정 분리

1. `userSettings` collection 추가
2. `termsAgreements`, `soundSettings`, timezone 계열을 `userSettings`로 복제
3. 로그인 bootstrap 응답에 `userSettings` 포함
4. 설정 화면 저장 API를 `userSettings` 기준으로 변경

### 3단계: 인벤토리/재화/주사위 분리

1. `userInventoryItems` 추가
2. `userCurrencyBalances`, `userCurrencyLedger` 추가
3. `diceResources` 추가
4. 기존 `hostStates` 값을 새 collection으로 migration
5. 자원 지급/차감 API를 새 구조 기준으로 변경

### 4단계: 아이동 개체화

1. `mydongList` 추가
2. 기존 `recruitedAidongs`를 `mydongUid`로 migration
3. Aidong 관련 API를 `mydongUid` 기준으로 변경
4. 방 배정, 코덱스, 코스메틱이 `mydongUid`를 참조하도록 변경

### 5단계: 숙소 구조 정규화

1. `sooksoStates` 추가
2. `roomSlots` 추가
3. `roomFurniturePlacements` 추가
4. 숙소 UI/API를 새 구조 기준으로 변경
5. 기존 `lodgeStates.rooms/furniture` deprecated

### 6단계: Codex/코스메틱 전환

1. `mydongPediaInventory` 추가
2. `userCosmeticInventory` 추가
3. `mydongCosmeticLoadouts` 추가
4. `mydongPersonaPartStates` 추가
5. 기존 `myAidongStates` 장착/도감 map deprecated

## migration 시 주의할 점

### 1. 기존 유저 데이터 보존

모든 migration은 다음 원칙을 지킨다.

- 기존 collection은 바로 삭제하지 않는다.
- 새 collection에 먼저 복사한다.
- API 읽기 기준을 바꾼다.
- 일정 기간 mirror write를 둔다.
- 검증 후 deprecated field를 제거한다.

### 2. idempotent migration

마이그레이션은 여러 번 실행해도 데이터가 중복 생성되지 않아야 한다.

예:

- `uid + itemId` unique
- `uid + currencyId` unique
- `providerCode + providerSubjectId` unique
- `uid + mydongUid` unique
- `uid + mydongUid + pediaItemId` unique

### 3. 관리자 페이지와 분리

관리자 페이지의 DB 관리 메뉴는 정적 master/rule import 중심으로 유지한다.

동적 schema 변경은 admin 화면에서 직접 table upload로 처리하지 않는다.  
필요하면 별도 “운영 API” 또는 “마이그레이션 실행 버튼”으로 만들되, 반드시 dry-run과 audit log를 둔다.

## 최종 요약

이번 정책의 핵심은 다음과 같다.

- 필드는 모두 `camelCase`로 통일한다.
- `users`는 현재 구현을 최대한 유지하되 부족한 계정 운영 필드를 추가한다.
- 인증 provider는 xlsx처럼 별도 `providerAccounts` 구조로 바꾼다.
- 로그인 세션은 DB에 저장하지 않는다.
- 인벤토리, 재화, 주사위, 숙소, 아이동, Codex, 코스메틱은 xlsx의 normalized 구조를 따른다.
- 항해 중 현재 위치는 DB에 저장하지 않는 현재 정책을 유지한다.
- 약관/마케팅/푸시/사운드 설정은 `userSettings`로 분리하되, 기존 의미와 호환성을 유지한다.
- 동적 데이터는 admin 정적 import 대상이 아니며, API/migration으로만 변경한다.
