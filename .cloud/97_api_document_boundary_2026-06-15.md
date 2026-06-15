# 97. API 및 DB Document 경계 문서

## 1. 문서 목적

이 문서는 현재 backend에서 노출 중인 API를 DB document 소유권 기준으로 분류한다.

목표는 다음과 같다.

- 화면 담당자가 어떤 API를 호출해야 하는지 빠르게 찾는다.
- backend 담당자가 어떤 API가 어떤 document를 수정하는지 명확히 안다.
- 공통 API와 모듈 전용 API를 섞지 않는다.
- DB 권위 상태와 frontend session/local state를 구분한다.
- 새 API를 만들 때 어느 namespace에 넣어야 하는지 판단한다.

## 2. 기본 원칙

### 2.1 API namespace 원칙

현재 backend는 단일 Express 서버를 사용하지만 API 경계는 모듈별로 나눈다.

큰 분류는 다음과 같다.

- `/health`: 서버 상태 확인
- `/api/auth/*`: 로그인/세션 관련
- `/api/account/*`: 계정 진행 상태
- `/api/host/*`: 전역 자원과 전역 인벤토리
- `/api/modules/{moduleId}/*`: 모듈 전용 상태와 action
- `/api/customs/*`: 모듈 간 자원 이동 규칙과 로그
- `/api/assets/*`: asset resolve/signed URL 후보
- `/api/debug/*`: 개발 전용 도구

### 2.2 UID 원칙

`/api/*`는 `authMiddleware`를 지난다.

route/service는 uid를 request body에서 신뢰하지 않는다.

사용 원칙:

- frontend는 `Authorization: Bearer {firebaseIdToken}` 또는 개발 fallback `X-Uid`를 보낼 수 있다.
- backend는 `getRequestUid(req)`로 uid를 읽는다.
- body 안의 `uid`는 권위 값으로 쓰지 않는다.

### 2.3 DB document 소유권 원칙

각 API는 자신이 소유한 document만 직접 수정한다.

예외적으로 모듈 간 자원 이동은 customs 또는 명시적인 orchestration service가 담당한다.

예시:

- `ship` API는 `shipStates`를 수정한다.
- `lodge` API는 `lodgeStates`를 수정한다.
- `my-aidong` API는 `myAidongStates`를 수정한다.
- `host` API는 `hostStates`를 수정한다.
- `ship` API가 `lodgeStates`를 직접 수정하면 안 된다.

## 3. DB Document 색인

| Document/Collection | 소유 영역 | 주요 필드 | 대표 API |
| --- | --- | --- | --- |
| `users` | account/auth compat | `isGuest`, `authProvider`, `providerUid`, `emailNormalized`, `nickname`, `nicknameNormalized`, `signupProfileCompleted`, `timezoneCompleted`, `termsCompleted`, `termsAgreements`, `openingSeen`, `onboardingComplete`, `hostName` | `/api/auth/*`, `/api/account/*` |
| `hostStates` | 전역 자원 | `coins`, `gems`, `diamonds`, `diceCount`, `inventory` | `/api/host/*` |
| `myAidongStates` | Aidong 상태 | `recruitedAidongs`, `needs`, `affinities`, `equippedOutfit`, `equippedItems`, `aidongCodexItems`, `aidongUpgradeState` | `/api/modules/my-aidong/*` |
| `myIslandStates` | 마이섬 구역 | `unlockedZones`, `zoneSlots`, `dynamicAidongZones`, `zoneProgress` | `/api/modules/my-island/*` |
| `codexStates` | 도감 | `unlockedDiaries`, `unlockedCodexEntries`, `codexFullyRegistered` | `/api/modules/codex/*` |
| `lodgeStates` | 숙소 | `lodgeInventory`, `assignedAidongs`, `rooms`, `furniture` | `/api/modules/lodge/*` |
| `shipStates` | 배/항구/선실 | `shipTypeId`, `harborAssignedChars`, `harborLastChargedAt`, `shipInventory`, `cabinAssignments`, `deckAssignments`, `cabinFurniture`, `cargo`, `cabins` | `/api/modules/ship/*` |
| `routeNeighborStates` | 이웃섬 항로 영속 결과 | `localResources`, `landings`, `progress` | `/api/modules/route-neighbor/*` |
| `aidongIslandStates` | Aidong 섬 탐험 | `currentIslandId`, `currentNodeId`, `visitedIslandIds`, `visitedNodeIds`, `metAidongIds`, `recruitedAidongIds`, `recruitmentCandidates`, `interactionLog` | `/api/modules/aidong-island/*` |
| `destinationIslandStates` | 도착섬 탐험 | `currentNodeId`, `visitedNodeIds`, `clearedMissionIds`, `localResources`, `localInventory`, `hotspotStates` | `/api/modules/destination-shell-island/*` |
| `zoneStates` | 마이섬 구역별 자원/진행 | `moduleId`, `localResources`, `clearedCount`, `progress` | `/api/modules/zone-garden/*` 등 |
| `moduleStates` | generic fallback | `uid`, `moduleId`, `state` | `/api/modules/{moduleId}/state` |
| `customsLogs` | 자원 이동 로그 | `ruleId`, `uid`, `debit`, `credit`, `createdAt` | `/api/customs/logs` |

## 4. 공통 API

### 4.1 서버 상태

#### `GET /health`

역할:

- 서버 기동 상태 확인
- Mongo 연결 상태 확인
- auth runtime 상태 확인
- repository backend가 memory인지 mongo인지 확인
- dedicated module id 목록 확인

DB document:

- 수정 없음

frontend client:

- `api.health()`

### 4.2 모델 명세 조회

#### `GET /api/modules/_model-specs`

역할:

- 모든 모듈의 storage 방식과 collection 이름, owned field 목록 조회

DB document:

- 수정 없음

#### `GET /api/modules/:moduleId/model-spec`

역할:

- 특정 모듈의 model spec 조회

DB document:

- 수정 없음

## 5. Auth / Account API

### 5.1 Auth API

#### `GET /api/auth/social/providers`

역할:

- 로그인 화면에 노출할 소셜 provider 목록과 사용 가능 상태 조회
- provider별 `enabled`, `planned`, `devOnly`, `disabled` 상태 전달
- 화면 담당자가 버튼 목록과 준비 중 상태를 하드코딩하지 않도록 함

수정 document:

- 없음

frontend client:

- `api.getSocialProviders()`

backend 경계:

- provider 목록과 상태는 `packages/backend/src/auth/socialProviders.ts`가 소유한다.
- 실제 provider token 검증은 `packages/backend/src/auth/socialProviderAdapters.ts`를 통해서만 수행한다.
- route가 provider별 검증 분기문을 직접 늘리면 안 된다.

#### `POST /api/auth/guest`

역할:

- guest user 생성
- 해당 uid의 `hostStates` 기본값도 생성

수정 document:

- `users`
- `hostStates`

frontend client:

- `api.authGuest()`

응답 경계:

- `uid`, `user`
- `account`: 공통 `AccountProgress`
- `nextStep`: `login | signup | timezone | terms | title`

#### `POST /api/auth/session`

역할:

- Firebase/social login session을 backend user로 생성 또는 갱신
- provider는 신규 계약 기준 `google`, `apple`, `x`, `kakao`, `naver`, `line`, `facebook`, `firebase` 후보
- 기존 `twitter` 문자열은 backend helper에서 `x`로 normalize하는 호환 경로만 둔다.

수정 document:

- `users`
- 필요 시 `hostStates`

frontend client:

- `api.authSession(uid, request)`

응답 경계:

- `uid`, `user`
- `account`: 공통 `AccountProgress`
- `nextStep`: `login | signup | timezone | terms | title`

#### `POST /api/auth/social/entry`

역할:

- 소셜 provider token 검증 후 backend 계정 진입점을 판정
- 기존 계정이면 `isNew: false`와 공통 `nextStep` 반환
- 신규 계정이면 최소 user shell을 만들고 `isNew: true`, `nextStep: signup` 반환

수정 document:

- `users`
- 필요 시 `hostStates`

frontend client:

- `api.authSocialEntry(request)`

backend 경계:

- provider 검증은 `socialProviderAdapters.ts`를 통과해야 한다.
- `{ authProvider, providerUid }`로 기존 계정을 조회한다.
- provider email은 보조 정보이며 email만으로 자동 병합하지 않는다.
- 로그인 이후 다른 소셜 아이디 연결/병합/충돌 처리는 이 API 범위가 아니다.

응답 경계:

- `ok`, `uid`, `user`, `isNew`
- `account`: 공통 `AccountProgress`
- `nextStep`: `login | signup | timezone | terms | title`

오류:

- `invalid_provider`
- `provider_not_enabled`
- `invalid_provider_token`
- `provider_identity_missing`

#### `GET /api/auth/me`

역할:

- 현재 uid의 user/account 정보 조회

수정 document:

- 없음

### 5.2 Account API

#### `GET /api/account/bootstrap`

역할:

- 로그인 직후 또는 앱 재진입 시 다음 화면 판단에 필요한 account 진행 상태를 한 번에 조회
- 화면은 `nextStep`을 기준으로 `signup`, `timezone`, `terms`, `title` 중 어디로 갈지 판단

읽는 document:

- `users`

frontend client:

- `api.getAccountBootstrap(uid)`

응답 경계:

- `ok`, `uid`
- `user`: 화면 표시용 최소 user 요약
- `provider`: auth provider 요약
- `account`: 공통 `AccountProgress`
- `nextStep`: `login | signup | timezone | terms | title`

주의:

- 화면 플로우 판단은 `GET /api/account/state`보다 이 API를 우선 사용한다.
- 전역 자원, 모듈 상태, 인벤토리 요약은 이 API에 섞지 않는다.

#### `POST /api/account/nickname/check`

역할:

- 회원가입 닉네임의 사용 가능 여부를 검사한다.
- 닉네임 공백 정리, 8자 제한, 허용 문자, 금칙어, 중복 여부를 같은 정책으로 확인한다.

읽는 document:

- `users`

frontend client:

- `api.checkNickname(nickname, uid?)`

응답 경계:

- `ok`: 닉네임 사용 가능 여부와 같은 값
- `available`: 닉네임 사용 가능 여부
- `normalizedNickname`: backend가 저장할 표시용 닉네임
- `reasons`: `empty`, `too_long`, `invalid_format`, `forbidden_word`, `duplicate`

주의:

- 이 API는 검사 전용이다.
- 실제 가입 프로필 저장은 `POST /api/account/signup/profile`에서 다시 검증한다.
- `uid`가 있으면 현재 계정이 이미 가진 닉네임은 중복으로 보지 않을 수 있다.

#### `POST /api/account/signup/profile`

역할:

- 신규 소셜 계정의 회원가입 프로필을 저장한다.
- 현재는 닉네임만 저장한다.
- 프로필 이미지는 직접 선택하지 않고, 최초로 만나는 Aidong 얼굴을 쓰기 위한 `profileImageSource: first-aidong` 후보 값을 저장한다.

수정 document:

- `users.nickname`
- `users.nicknameNormalized`
- `users.signupProfileCompleted`
- `users.profileImageSource`

frontend client:

- `api.completeSignupProfile(uid, nickname)`

응답 경계:

- `ok`, `uid`, `user`
- `account`: 공통 `AccountProgress`
- `nextStep`: 정상 저장 후 보통 `timezone`

주의:

- 저장 전에 `nickname/check`와 같은 정책으로 다시 검증한다.
- 중복/금칙어/길이 오류는 400과 `reasons`로 반환한다.
- 가입 플로우의 권위 저장 API이므로 화면은 `PATCH /api/account/state`로 닉네임을 저장하지 않는다.

#### `POST /api/account/preferences/timezone`

역할:

- 가입 플로우 또는 계정 환경 설정에서 케어/알림 기준 timezone을 저장한다.
- backend는 IANA timezone 형식인지 최종 검증한다.
- 시간대 저장이 끝나면 `timezoneCompleted: true`로 반영하고 다음 단계는 보통 `terms`가 된다.

수정 document:

- `users.timeZone`
- `users.detectedTimeZone`
- `users.utcOffsetMinutes`
- `users.timezoneCompleted`

frontend client:

- `api.saveAccountTimeZone(uid, request)`

요청 경계:

```ts
{
  timeZone: string
  detectedTimeZone?: string
  utcOffsetMinutes?: number
}
```

응답 경계:

- `ok`, `uid`
- `timeZone`, `detectedTimeZone`, `utcOffsetMinutes`
- `account`: 공통 `AccountProgress`
- `nextStep`: `login | signup | timezone | terms | title`

오류:

- `empty`
- `invalid_timezone`
- `invalid_detected_timezone`
- `invalid_utc_offset`

주의:

- timezone 목록 UI와 검색은 frontend가 담당한다.
- backend는 저장 직전에 `Intl.DateTimeFormat` 기반으로 IANA timezone 유효성을 검증한다.
- `utcOffsetMinutes`는 browser가 계산해 전달하는 보조 표시값이며, 권위 timezone은 `timeZone`이다.

#### `GET /api/account/terms/current`

역할:

- 현재 적용 중인 약관 버전과 필수/선택 항목을 조회한다.
- 화면 담당자는 이 응답으로 약관 체크박스와 전문 링크/버전 표시를 구성한다.

수정 document:

- 없음

frontend client:

- `api.getCurrentTerms()`

응답 경계:

```ts
{
  ok: true
  terms: {
    serviceTermsVersion: string
    privacyPolicyVersion: string
    marketingTermsVersion: string
    ageGateVersion: string
    required: Array<'service' | 'privacy' | 'age'>
    optional: Array<'marketing'>
  }
}
```

주의:

- 현재 약관 버전은 `packages/backend/src/account/termsPolicy.ts` static config가 소유한다.
- 나중에 운영 약관 버전 관리가 필요해지면 terms config collection으로 승격할 수 있다.

#### `POST /api/account/terms/agree`

역할:

- 필수 약관 동의와 선택 약관 동의 여부를 저장한다.
- 서비스 이용 약관, 개인정보 처리방침, age-gate가 현재 버전과 맞아야 한다.
- 선택 마케팅 약관은 동의하지 않아도 되지만 `marketingAccepted: false`로 명시 저장한다.

수정 document:

- `users.termsAgreements`
- `users.termsCompleted`

frontend client:

- `api.agreeTerms(uid, request)`

요청 경계:

```ts
{
  serviceTermsVersion: string
  privacyPolicyVersion: string
  marketingTermsVersion?: string
  marketingAccepted: boolean
  ageConfirmed?: boolean
  ageGateVersion?: string
}
```

응답 경계:

- `ok`, `uid`
- `termsAgreements`
- `account`: 공통 `AccountProgress`
- `nextStep`: 정상 저장 후 보통 `title`

오류:

- `invalid_payload`
- `service_terms_required`
- `privacy_policy_required`
- `service_terms_version_mismatch`
- `privacy_policy_version_mismatch`
- `marketing_terms_version_mismatch`
- `marketing_accepted_required_boolean`
- `age_confirmed_required`

주의:

- `marketingAccepted`는 선택 약관이지만 API payload에서는 boolean 필수다.
- 체크하지 않은 경우도 `false`로 보내야 하고, backend도 `false`로 저장한다.
- 약관 저장 후 화면 이동은 response의 `nextStep`을 기준으로 한다.

#### `GET /api/account/state`

역할:

- account 성격의 상태 조회
- 기존 account state 호환 조회
- 신규 화면 플로우 판단은 `GET /api/account/bootstrap`을 우선 사용

읽는 document:

- `users`

frontend client:

- `api.getAccountState(uid)`

응답 경계:

- `state`: account state 호환 payload
- `account`: 공통 `AccountProgress`
- `nextStep`: `login | signup | timezone | terms | title`

#### `PATCH /api/account/state`

역할:

- account 성격의 상태만 patch
- 허용 필드: `isGuest`, `nickname`, `openingSeen`, `onboardingComplete`, `hostName`

수정 document:

- `users`
- `hostName` 등 일부 필드는 repository compat에 의해 `hostStates`에도 반영될 수 있음

frontend client:

- `api.patchAccountState(uid, patch)`

응답 경계:

- `state`: account state 호환 payload
- `account`: 공통 `AccountProgress`
- `nextStep`: `login | signup | timezone | terms | title`

주의:

- 전역 자원, Aidong 상태, 숙소/배 상태를 이 API로 수정하지 않는다.

## 6. Host / 전역 자원 API

Host API는 `hostStates`를 소유한다.

### `GET /api/host/state`

역할:

- 전역 자원 조회

읽는 document:

- `hostStates`

frontend client:

- `api.getHostState(uid)`

### `PATCH /api/host/state`

역할:

- host state patch
- 개발/compat 용도이며 신규 gameplay action은 가능하면 전용 action API를 사용한다.

수정 document:

- `hostStates`

frontend client:

- `api.patchHostState(uid, patch)`

### `POST /api/host/resources/mutate`

역할:

- 전역 숫자 자원 증감
- 대상: `coins`, `gems`, `diamonds`, `diceCount`

수정 document:

- `hostStates`

frontend client:

- `api.mutateHostResource(uid, resource, delta)`

주의:

- 음수 결과가 되면 409 계열 에러가 날 수 있다.

### `POST /api/host/inventory/mutate`

역할:

- 전역 inventory 아이템 수량 증감
- Aidong 소지 아이템도 전역 inventory에 보관한다.

수정 document:

- `hostStates.inventory`

frontend client:

- `api.mutateHostInventory(uid, itemId, delta)`

## 7. Generic Module State API

Generic state API는 `/api/modules/:moduleId/state` 형태다.

### `GET /api/modules/:moduleId/state`

역할:

- 모듈 state 조회
- dedicated repository가 있으면 해당 전용 collection을 읽는다.
- dedicated repository가 없으면 `moduleStates` fallback을 읽는다.

읽는 document:

- moduleId에 따른 전용 collection 또는 `moduleStates`

frontend client:

- `api.getModuleState(uid, moduleId)`

### `PUT /api/modules/:moduleId/state`

역할:

- 모듈 state를 통째로 반영하는 generic API
- dedicated repository의 경우 현재 구현상 patch 방식으로 반영된다.

수정 document:

- moduleId에 따른 전용 collection 또는 `moduleStates`

frontend client:

- `api.putModuleState(uid, moduleId, state)`

주의:

- rule-heavy action에는 권장하지 않는다.
- 가능하면 모듈 전용 action API를 사용한다.

### `PATCH /api/modules/:moduleId/state`

역할:

- 모듈 state 일부 patch

수정 document:

- moduleId에 따른 전용 collection 또는 `moduleStates`

frontend client:

- `api.patchModuleState(uid, moduleId, patch)`

주의:

- 화면에서 임의로 nested state를 patch하는 것은 지양한다.
- service validation이 필요한 동작은 전용 action API를 만든다.

## 8. Aidong 관련 API

Aidong 관련 API는 대부분 `myAidongStates`를 소유한다.

### 8.1 My Aidong API

Base path:

- `/api/modules/my-aidong`

Document:

- `myAidongStates`

#### `POST /recruit`

역할:

- Aidong 영입
- needs, affinity 등 기본 상태 생성

frontend client:

- `api.recruitAidong(uid, characterId)`

#### `POST /affinity`

역할:

- Aidong 친밀도 증감

frontend client:

- `api.addAidongAffinity(uid, characterId, delta)`

#### `POST /care`

역할:

- Aidong 케어 액션 수행
- cooldown, cap, cost 등을 service에서 검증

수정 document:

- `myAidongStates`
- 필요 시 `hostStates` 자원

frontend client:

- `api.applyAidongCare(uid, characterId, actionId)`

#### `POST /outfit`

역할:

- Aidong outfit 변경

frontend client:

- `api.setAidongOutfit(uid, characterId, outfitId)`

#### `POST /items/equip-toggle`

역할:

- Aidong 장착 아이템 토글

읽는 document:

- `hostStates.inventory`

수정 document:

- `myAidongStates.equippedItems`

frontend client:

- `api.toggleAidongEquippedItem(uid, characterId, itemId)`

주의:

- 아이템 보유 수량은 `hostStates.inventory`가 권위다.
- 착용 상태는 `myAidongStates.equippedItems`가 권위다.

#### `GET /codex-items/progress`

역할:

- Aidong별 도감 아이템 진행도 조회

읽는 document:

- `myAidongStates`

#### `POST /codex-items/grant`

역할:

- Aidong 도감 아이템 지급

수정 document:

- `myAidongStates.aidongCodexItems`

#### `POST /upgrades/request`

역할:

- Aidong 업그레이드 요청

수정 document:

- `myAidongStates.aidongUpgradeState`
- 필요 시 `hostStates`

### 8.2 Aidong Island API

Base path:

- `/api/modules/aidong-island`

Document:

- `aidongIslandStates`

#### `GET /config`

역할:

- Aidong island config 조회

#### `POST /land`

역할:

- 특정 Aidong 섬에 상륙

frontend client:

- `api.landAidongIsland(uid, islandId)`

#### `POST /move`

역할:

- 섬 내부 고정맵에서 상하좌우 이동

frontend client:

- `api.moveAidongIsland(uid, direction)`

#### `POST /interact`

역할:

- hotspot 상호작용

frontend client:

- `api.interactAidongIsland(uid, hotspotId)`

#### `POST /recruit`

역할:

- Aidong island에서 만난 Aidong 영입

수정 document:

- `aidongIslandStates`
- `myAidongStates`
- 필요 시 `myIslandStates`

frontend client:

- `api.recruitFromAidongIsland(uid, characterId)`

#### `POST /leave`

역할:

- Aidong island 탐험 이탈

## 9. My Island API

Base path:

- `/api/modules/my-island`

Document:

- `myIslandStates`

### `POST /unlock-zone`

역할:

- 고정 구역 해금

frontend client:

- `api.unlockMyIslandZone(uid, zoneId)`

### `POST /tutorial/complete`

역할:

- 마이섬 튜토리얼 완료 처리

frontend client:

- `api.completeMyIslandTutorial(uid)`

### `GET /slots`

역할:

- AREA-01~15 슬롯 현황 조회

frontend client:

- `api.listMyIslandZoneSlots(uid)`

### `POST /slots/incorporate`

역할:

- Aidong 섬을 마이섬 구역 슬롯에 편입

frontend client:

- `api.incorporateMyIslandSlot(uid, areaNo, characterId)`

### `POST /slots/release`

역할:

- 편입된 슬롯 해제

frontend client:

- `api.releaseMyIslandSlot(uid, areaNo)`

### `POST /slots/move`

역할:

- 구역 슬롯 이동

frontend client:

- `api.moveMyIslandSlot(uid, fromAreaNo, toAreaNo)`

### `POST /dynamic-zones/open`

역할:

- 항해 만남 등으로 Aidong 전용 구역 후보를 열기

frontend client:

- `api.openDynamicAidongZone(uid, request)`

### `POST /dynamic-zones/update`

역할:

- Aidong 전용 구역 상태 변경

frontend client:

- `api.updateDynamicAidongZone(uid, request)`

## 10. Ship / Harbor API

Base path:

- `/api/modules/ship`

Document:

- `shipStates`

### `GET /config`

역할:

- 배 종류, 기본 배, 선실 가구 catalog 조회

frontend client:

- `api.getShipConfig()`

### `POST /type/change`

역할:

- 현재 배 종류 변경
- 작은 배로 변경 시 capacity를 넘는 선실 배치는 service에서 갑판으로 reflow한다.

수정 document:

- `shipStates.shipTypeId`
- `shipStates.cabinAssignments`
- `shipStates.deckAssignments`

frontend client:

- `api.changeShipType(uid, shipTypeId)`

### `POST /cabins/assign`

역할:

- 선실 배치 변경

수정 document:

- `shipStates.cabinAssignments`
- `shipStates.deckAssignments`

frontend client:

- `api.assignShipCabin(uid, slotId, characterId, context)`

### `POST /deck/assign`

역할:

- 갑판 배치 변경

수정 document:

- `shipStates.deckAssignments`
- `shipStates.cabinAssignments`

frontend client:

- `api.assignShipDeck(uid, slotId, characterId, context)`

### `POST /harbor/assign-toggle`

역할:

- 항구 지원 배치 토글

수정 document:

- `shipStates.harborAssignedChars`

frontend client:

- `api.toggleHarborAssign(uid, characterId)`

### `POST /harbor/charge`

역할:

- 항구 지원 배치에 따른 주사위 충전

수정 document:

- `shipStates.harborLastChargedAt`
- `hostStates.diceCount`

frontend client:

- `api.chargeHarborDice(uid, now?)`

### `POST /cabins/furniture/purchase`

역할:

- 선실 가구 구매

수정 document:

- `shipStates.cabinFurniture`
- `hostStates.coins`

frontend client:

- `api.purchaseCabinFurniture(uid, itemId)`

### `POST /cabins/furniture/toggle`

역할:

- 선실 가구 배치/해제

수정 document:

- `shipStates.cabins`

frontend client:

- `api.toggleCabinFurniture(uid, slotId, itemId)`

주의:

- 항해 중/정박 중 여부는 DB가 소유하지 않는다.
- 항해 중 현재 위치와 진행 여부는 frontend session state가 소유한다.

## 11. Lodge API

Base path:

- `/api/modules/lodge`

Document:

- `lodgeStates`

### `GET /config`

역할:

- 숙소 배치 제한과 가구 catalog 조회

frontend client:

- `api.getLodgeConfig()`

### `POST /aidongs/assign-toggle`

역할:

- 숙소 배치 Aidong 토글

수정 document:

- `lodgeStates.assignedAidongs`

frontend client:

- `api.toggleLodgeAidongAssign(uid, characterId)`

### `POST /furniture/purchase`

역할:

- 숙소 가구 구매

수정 document:

- `lodgeStates.furniture`
- `hostStates.coins`

frontend client:

- `api.purchaseLodgeFurniture(uid, itemId)`

### `POST /rooms/furniture/toggle`

역할:

- 숙소 방 가구 배치/해제

수정 document:

- `lodgeStates.rooms`

frontend client:

- `api.toggleLodgeRoomFurniture(uid, roomId, itemId)`

## 12. Route Neighbor / 항해 보드 API

Base path:

- `/api/modules/route-neighbor`

Document:

- `routeNeighborStates`

### `POST /start`

역할:

- 항해 시작 가능 여부 검증
- 배에 crew가 있는지 확인
- session 시작 payload 반환

읽는 document:

- `shipStates`
- `routeNeighborStates`

수정 document:

- 원칙상 현재 항해 위치는 수정하지 않음

frontend client:

- `api.startRouteNeighbor(uid, routeId)`

주의:

- 항해 중 여부와 현재 보드 위치는 DB가 아니라 browser session state가 소유한다.

### `POST /roll`

역할:

- 주사위 소비
- 현재 session의 routeId/boardPosition 기준으로 landing 후보 계산

수정 document:

- `hostStates.diceCount`
- 필요 시 `routeNeighborStates`

frontend client:

- `api.rollRouteNeighbor(uid, steps, { routeId, boardPosition })`

### `POST /end`

역할:

- legacy compat endpoint
- 현재 항해 세션 종료는 frontend session state에서 처리한다.

frontend client:

- `api.endRouteNeighbor(uid)`

### `GET /landing/current`

역할:

- legacy compat endpoint
- 현재 landing은 session context 기준으로 다루는 방향이다.

frontend client:

- `api.getCurrentRouteLanding(uid)`

### `POST /landing/clear`

역할:

- landing 결과 보상 정산
- routeId/boardPosition/landingId context 기준으로 처리

수정 document:

- `routeNeighborStates.landings`
- reward에 따라 `hostStates` 또는 target module state

frontend client:

- `api.clearRouteLanding(uid, landingId, context)`

### `POST /encounter/accept`

역할:

- 항해 중 만난 Aidong을 수락
- Aidong 상태와 마이섬 구역 후보를 반영

수정 document:

- `routeNeighborStates.progress`
- `myAidongStates`
- `myIslandStates`

frontend client:

- `api.acceptRouteAidongEncounter(uid, request)`

## 13. Destination Island API

Base path:

- `/api/modules/destination-shell-island`

Document:

- `destinationIslandStates`

### `GET /config`

역할:

- 도착섬 고정맵 config 조회

### `POST /move`

역할:

- 도착섬 고정맵에서 상하좌우 이동

수정 document:

- `destinationIslandStates.currentNodeId`
- `destinationIslandStates.visitedNodeIds`

### `POST /hotspots/interact`

역할:

- 도착섬 hotspot 상호작용

수정 document:

- `destinationIslandStates.hotspotStates`
- 필요 시 `localResources`, `localInventory`

### `POST /missions/clear`

역할:

- 도착섬 미션 완료

수정 document:

- `destinationIslandStates.clearedMissionIds`
- `destinationIslandStates.localResources`
- `destinationIslandStates.localInventory`

## 14. Zone API

Base paths:

- `/api/modules/zone-garden`
- `/api/modules/zone-oasis`
- `/api/modules/zone-memory`
- `/api/modules/zone-mine`

Document:

- `zoneStates` with `moduleId`

### `POST /collect`

역할:

- zone 전용 자원 수집

수정 document:

- `zoneStates.localResources`

frontend client:

- `api.collectZoneResource(uid, moduleId, resource, amount)`

### `POST /clear`

역할:

- zone 미션/미니게임 클리어 처리

수정 document:

- `zoneStates.clearedCount`
- `zoneStates.progress`
- reward에 따라 `localResources` 또는 `hostStates`

frontend client:

- `api.clearZone(uid, moduleId, clearId, result, idempotencyKey)`

### `POST /production/assign`

역할:

- zone 생산 슬롯에 Aidong 배치

수정 document:

- `zoneStates.progress`

### `POST /production/unassign`

역할:

- zone 생산 슬롯 배치 해제

수정 document:

- `zoneStates.progress`

### `POST /production/claim`

역할:

- zone 생산 보상 수령

수정 document:

- `zoneStates.localResources`
- `zoneStates.progress`

## 15. Codex API

Base path:

- `/api/modules/codex`

Document:

- `codexStates`

### `POST /unlock-diary`

역할:

- diary 해금

frontend client:

- `api.unlockCodexDiary(uid, diaryId)`

### `POST /unlock-slot`

역할:

- codex entry slot 해금

frontend client:

- `api.unlockCodexSlot(uid, entryId)`

### `POST /fully-register`

역할:

- codex entry 완전 등록

frontend client:

- `api.fullyRegisterCodex(uid, entryId)`

## 16. My Room Aggregation API

Base path:

- `/api/modules/myroom`

역할:

- 여러 document를 읽어 숙소/마이룸 화면에 필요한 summary를 제공한다.
- 직접적인 소유 document는 없다.

읽는 document:

- `users`
- `hostStates`
- `myAidongStates`
- `codexStates`
- `lodgeStates`

Endpoints:

- `GET /summary`
- `GET /aidongs`
- `GET /codex`
- `GET /collection`
- `GET /ledger`

frontend client:

- `api.getMyRoomSummary(uid)`
- `api.getMyRoomSection(uid, section)`

주의:

- aggregation API는 화면 편의를 위한 read API다.
- 상태 변경은 각 소유 모듈 API를 사용한다.

## 17. Customs API

Base path:

- `/api/customs`

Document:

- source/target module state
- `customsLogs`

### `GET /rules`

역할:

- 현재 등록된 customs rule 목록 조회

frontend client:

- `api.listCustomsRules()`

### `GET /logs`

역할:

- 현재 uid의 customs 적용 로그 조회

frontend client:

- `api.listCustomsLogs(uid, limit)`

### `POST /apply`

역할:

- 모듈 간 자원 이동 적용
- rule 기반 또는 ad-hoc request 기반 이동

수정 document:

- source module state 또는 `hostStates`
- target module state 또는 `hostStates`
- `customsLogs`

frontend client:

- `api.applyCustoms(uid, request)`

주의:

- customs UI는 현재 기획상 강제하지 않는다.
- 그러나 backend 자원 이동 권위와 audit 가능성은 유지한다.
- 각 모듈이 다른 모듈 document를 직접 수정하지 않도록 customs/service 경계를 유지한다.

## 18. Gacha / Care Legacy API

### Gacha

Base path:

- `/api/gacha`

Endpoints:

- `POST /first`
- `POST /confirm`

역할:

- 첫 가챠 후보 생성/확정 compat API

관련 document:

- `myAidongStates`
- 필요 시 `users` compat

### Care

Base path:

- `/api/care`

Endpoints:

- `POST /sync`
- `GET /state/:char`

역할:

- 구 care state compat API

주의:

- 신규 Aidong care는 `/api/modules/my-aidong/care`를 우선 사용한다.

## 19. Asset API

Base path:

- `/api/assets`

Endpoints:

- `POST /resolve`
- `GET /signed-url`

역할:

- asset 경로 resolve
- signed URL 형태의 응답 후보 제공

DB document:

- 수정 없음

주의:

- CDN signed URL 사용 여부는 최종 인프라 결정 전까지 확정하지 않는다.
- 현재는 asset 접근 경계 후보로 둔다.

## 20. Debug API

Base path:

- `/api/debug`

### `POST /reset`

역할:

- 개발 환경에서 현재 uid의 진행 상태 전체 초기화
- production에서는 비활성화

수정 document:

- `users`
- `hostStates`
- `myAidongStates`
- `myIslandStates`
- `codexStates`
- `lodgeStates`
- `shipStates`
- `routeNeighborStates`
- `aidongIslandStates`
- `destinationIslandStates`
- `zoneStates`

frontend client:

- `api.debugReset(uid)`

주의:

- 화면의 debug 전체 리셋 버튼에서만 사용한다.
- 항해 session state는 frontend에서 별도로 제거한다.

## 21. Frontend Client 위치

현재 frontend API client는 다음 파일에 모여 있다.

- `packages/frontend/src/lib/api.ts`

화면 담당자는 가능하면 이 client만 호출한다.

직접 `fetch('/api/...')`를 화면 파일에 쓰지 않는다.

새 API를 추가할 때 순서:

1. backend route/service 구현
2. typecheck
3. `api.ts`에 typed client 추가
4. 화면 담당자에게 client 함수명과 request/response shape 전달

## 22. 항해 Session State 경계

항해 중 다음 값은 DB에 저장하지 않는다.

- 현재 항해 중인지 여부
- 현재 route id
- 현재 보드 위치
- 현재 탭의 landing 후보
- 현재 항해 session id

이 값들은 frontend session state가 소유한다.

현재 위치:

- `packages/frontend/src/lib/voyageSessionStore.ts`

DB에 저장되는 항해 관련 값은 다음에 한정한다.

- 주사위 소비 결과: `hostStates.diceCount`
- landing clear 이력: `routeNeighborStates.landings`
- 영입/만남 수락 결과: `myAidongStates`, `myIslandStates`, `routeNeighborStates.progress`
- 항해 중 얻은 실제 보상: 해당 모듈 또는 host document

## 23. 새 API를 만들 때 체크리스트

새 API가 필요하면 다음을 먼저 확인한다.

- 어떤 document가 권위인가?
- 해당 document의 소유 moduleId는 무엇인가?
- 기존 API로 충분한가?
- generic state patch가 아니라 service validation이 필요한가?
- frontend session/local state로 충분한 값인가?
- cross-tab sync 대상인가?
- Mongo와 memory repository 양쪽에서 같은 동작을 하는가?
- `api.ts`에 client를 추가했는가?
- 문서와 modelSpecs가 맞는가?

## 24. 변경 이력

- 2026-06-15: 현재 backend route와 frontend API client 기준으로 API/document 경계 문서 작성.
- 2026-06-15: 닉네임 검사와 가입 프로필 저장 API를 추가했다. `users.nicknameNormalized`, `users.signupProfileCompleted`, `users.profileImageSource` 경계와 frontend client 이름을 명시했다.
- 2026-06-15: 시간대 저장 API를 추가했다. `users.timeZone`, `users.detectedTimeZone`, `users.utcOffsetMinutes`, `users.timezoneCompleted` 경계와 frontend `saveAccountTimeZone()` client 이름을 명시했다.
- 2026-06-15: 현재 약관 조회와 약관 동의 저장 API를 추가했다. `users.termsAgreements`, `users.termsCompleted` 경계와 frontend `getCurrentTerms()`/`agreeTerms()` client 이름을 명시했다.
