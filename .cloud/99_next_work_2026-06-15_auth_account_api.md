# 99. Next Work 2026-06-15 로그인/회원가입 API

## 1. 문서 목적

이 문서는 로그인, 회원가입, 시간대 설정, 약관 동의 플로우를 구현하기 위해 가장 먼저 만들어야 할 API를 선정하고 작업 순서를 정리한다.

이번 문서는 화면 구현이 아니라 backend/API 담당 범위만 다룬다.

화면 담당자는 이 문서의 API 계약이 생긴 뒤 `packages/frontend/src/lib/api.ts` client를 호출해 화면을 연결한다.

## 2. 기획 요약

### 로그인

- 진입은 가입이 아니라 방문 진입이다.
- 게스트로 즉시 입장할 수 있어야 한다.
- 소셜 로그인 provider 후보는 Google, Apple, X, Kakao, Naver, LINE, Facebook이다.
- 기존 계정이면 TITLE로 간다.
- 신규 계정이면 SIGNUP으로 간다.
- 로그인 진입에서는 소셜 인증 결과가 기존 계정인지 신규 계정인지만 판정한다.
- 이미 로그인한 계정을 다른 소셜 아이디에 연결하는 바인딩/연동 충돌 처리는 로그인 이후 계정 설정 API 범위로 분리한다.
- 게스트에서 소셜 계정 바인딩 시점은 P0 미결이며, 현재는 오프닝 종료 후 제안 후보로 둔다.

### 회원가입

- 소셜 인증 완료 후 신규 계정만 진입한다.
- 이메일/비밀번호 직접 가입은 아직 미정이므로 소셜 전용으로 본다.
- 프로필 아바타 선택은 하지 않는다.
- 닉네임만 입력한다.
- 최초로 만나는 Aidong 얼굴이 나중에 프로필 사진이 된다.
- 닉네임은 8자 제한, 중복 검사, 금칙어 검사가 필요하다.
- 성공하면 시간대 설정으로 간다.

### 시간대 설정

- 케어, 알림, 일일 제한 기준이 되는 user timezone을 가입 플로우에서 저장한다.
- 현재 감지 시간대를 기본 후보로 보여준다.
- 사용자는 검색/선택으로 IANA timezone을 저장한다.
- 시간대 설정 후 약관 단계로 간다.

### 약관 동의

- 필수 약관: 서비스 이용, 개인정보.
- 선택 약관: 마케팅.
- age-gate는 P0 미결이지만 자리와 저장 필드는 필요하다.
- 동의 이력은 버전 포함으로 저장해야 한다.
- 선택 약관은 동의한 경우뿐 아니라 동의하지 않은 경우도 `false`로 저장한다.
- 선택 약관의 동의/미동의 상태는 나중에 마케팅 수신 설정, 철회 이력, 약관 버전 변경 판단에 사용한다.
- 필수 동의 완료 후 TITLE로 간다.

## 3. 현재 구현 상태

현재 존재하는 API:

- `GET /api/auth/social/providers`
- `POST /api/auth/guest`
- `POST /api/auth/session`
- `GET /api/auth/me`
- `GET /api/account/state`
- `PATCH /api/account/state`

현재 한계:

- 소셜 provider 목록 API는 생겼지만, 실제 소셜 로그인 진입 API는 아직 기존 `/api/auth/session` skeleton 중심이다.
- `POST /api/auth/social/entry`와 provider adapter 검증은 아직 없다.
- 신규/기존/가입 중/약관 필요/시간대 필요 같은 다음 단계 판정이 없다.
- 닉네임 중복 검사 API가 없다.
- 금칙어 검사 경계가 없다.
- timezone 저장 필드가 없다.
- terms agreement 저장 필드가 없다.
- 로그인 이후 소셜 계정 추가 연결 API는 아직 없다.
- guest에서 social bind를 어떻게 다룰지 endpoint가 없다.

## 4. 꼭 필요한 API 목록

아래 API가 로그인/가입 플로우의 최소 세트다.

### 4.1 Auth Entry API

#### `GET /api/auth/social/providers`

상태:

- 신규 필요.

역할:

- 로그인 화면에 노출할 소셜 provider 목록과 사용 가능 상태를 반환한다.
- 실제 인증 가능한 provider와 준비 중 provider를 구분한다.
- 화면 담당자가 provider 버튼 상태를 하드코딩하지 않도록 한다.

응답 후보:

```ts
{
  ok: true
  providers: Array<{
    provider: SocialProvider
    label: string
    status: 'enabled' | 'planned' | 'devOnly' | 'disabled'
    authMode: 'firebase' | 'direct-oauth' | 'mock'
  }>
}
```

주의:

- 첫 구현에서는 `firebase` 기반 provider만 `enabled`로 둔다.
- 직접 OAuth provider는 adapter가 생기기 전까지 `planned` 또는 `disabled`로 둔다.

#### `POST /api/auth/guest`

상태:

- 이미 존재한다.
- 응답 shape 보강 필요.

역할:

- 게스트 세션 발급.
- 즉시 TITLE 또는 초기 진입 화면으로 보낼 수 있는 account bootstrap payload를 반환한다.

수정 document:

- `users`
- `hostStates`

응답 후보:

```ts
{
  uid: string
  user: AccountUser
  account: AccountProgress
  nextStep: 'title'
}
```

#### `POST /api/auth/social/entry`

상태:

- 신규 필요.

역할:

- 소셜 인증 완료 후 backend 계정 진입점을 판정한다.
- 기존 계정이면 `nextStep: 'title'`.
- 신규 계정이면 최소 user shell을 만들고 `nextStep: 'signup'`.
- 로그인 이후 계정 바인딩/연동 충돌은 이 API에서 다루지 않는다.

provider 후보:

- `google`
- `apple`
- `x`
- `kakao`
- `naver`
- `line`
- `facebook`
- `firebase`

수정 document:

- `users`
- 필요 시 `hostStates`

요청 후보:

```ts
{
  provider: SocialProvider
  providerUid?: string
  email?: string
  displayName?: string
  photoURL?: string
  idTokenProvider?: 'firebase'
}
```

응답 후보:

```ts
{
  ok: true
  uid: string
  isNew: boolean
  nextStep: 'title' | 'signup' | 'timezone' | 'terms'
  account: AccountProgress
}
```

주의:

- 실제 provider 검증은 Firebase token 기반으로 시작한다.
- Apple, Kakao, Naver, LINE, Facebook은 초기에는 provider enum과 API 계약만 열어두고, 실제 OAuth 교환은 추후 provider adapter로 분리한다.

### 4.2 Account Bootstrap API

#### `GET /api/account/bootstrap`

상태:

- 신규 필요.

역할:

- 로그인 후 화면이 다음으로 어디로 가야 하는지 판단할 수 있는 account 진행 상태를 한 번에 반환한다.

읽는 document:

- `users`
- 필요 시 `hostStates`

응답 후보:

```ts
{
  ok: true
  account: {
    uid: string
    isGuest: boolean
    nickname?: string
    profileImageSource?: 'first-aidong' | 'default'
    timeZone?: string
    terms: TermsAgreementState
    signupCompleted: boolean
    timezoneCompleted: boolean
    termsCompleted: boolean
    onboardingComplete: boolean
    openingSeen: boolean
  }
  nextStep: 'login' | 'signup' | 'timezone' | 'terms' | 'title'
}
```

주의:

- 기존 `GET /api/account/state`는 유지하되, 화면 플로우 판정은 bootstrap API를 우선 사용한다.

### 4.3 Nickname API

#### `POST /api/account/nickname/check`

상태:

- 신규 필요.

역할:

- 닉네임 8자 제한, 공백/특수문자 정책, 금칙어, 중복 여부를 검사한다.

읽는 document:

- `users`

요청 후보:

```ts
{
  nickname: string
}
```

응답 후보:

```ts
{
  ok: boolean
  available: boolean
  normalizedNickname: string
  reasons?: Array<'empty' | 'too_long' | 'invalid_format' | 'forbidden_word' | 'duplicate'>
}
```

#### `POST /api/account/signup/profile`

상태:

- 신규 필요.

역할:

- 신규 소셜 계정의 회원가입 프로필 정보를 저장한다.
- 현재는 닉네임만 저장한다.
- 아바타 선택은 하지 않는다.

수정 document:

- `users.nickname`
- `users.signupProfileCompleted` 후보 필드

요청 후보:

```ts
{
  nickname: string
}
```

응답 후보:

```ts
{
  ok: true
  account: AccountProgress
  nextStep: 'timezone'
}
```

### 4.4 Timezone API

#### `POST /api/account/preferences/timezone`

상태:

- 신규 필요.

역할:

- IANA timezone을 계정 환경 설정으로 저장한다.
- 예: `Asia/Seoul`, `America/Los_Angeles`.

수정 document:

- `users.timeZone`
- `users.timezoneCompleted` 후보 필드

요청 후보:

```ts
{
  timeZone: string
  detectedTimeZone?: string
  utcOffsetMinutes?: number
}
```

응답 후보:

```ts
{
  ok: true
  account: AccountProgress
  nextStep: 'terms'
}
```

주의:

- timezone 목록 자체는 frontend 또는 shared static data로 둘 수 있다.
- backend는 IANA timezone 유효성만 검증한다.

### 4.5 Terms API

#### `GET /api/account/terms/current`

상태:

- 신규 필요.

역할:

- 현재 적용 중인 약관 버전과 필수/선택 항목을 반환한다.

DB document:

- 초기에는 코드/static config.
- 나중에 terms config collection 후보.

응답 후보:

```ts
{
  ok: true
  terms: {
    serviceTermsVersion: string
    privacyPolicyVersion: string
    marketingTermsVersion?: string
    ageGateVersion?: string
    required: ['service', 'privacy']
    optional: ['marketing']
  }
}
```

#### `POST /api/account/terms/agree`

상태:

- 신규 필요.

역할:

- 필수 약관 동의와 선택 약관 동의 여부를 저장한다.
- 선택 약관은 체크하지 않았더라도 `false`로 명시 저장한다.
- 버전과 timestamp를 함께 저장한다.

수정 document:

- `users.termsAgreements`
- `users.termsCompleted` 후보 필드

요청 후보:

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

응답 후보:

```ts
{
  ok: true
  account: AccountProgress
  nextStep: 'title'
}
```

주의:

- 필수 약관이 없거나 버전이 현재값과 다르면 400.
- 선택 약관은 필수 통과 조건이 아니지만, 현재 선택 약관 버전과 동의 여부를 함께 저장한다.
- `marketingAccepted`가 생략되면 backend는 `false`로 보정하거나 400으로 실패시킨다. 첫 구현에서는 API 계약을 명확히 하기 위해 `boolean` 필수값으로 받는 쪽을 우선한다.
- age-gate 상세 정책은 보류지만 저장 자리와 검증 hook은 둔다.

## 5. 꼭 필요하지만 이번 첫 구현에서 보류할 API

아래는 기획상 필요하지만, 첫 구현에서는 skeleton 또는 문서화만 한다.

### 5.1 로그인 이후 소셜 계정 연결 API

후보:

- `POST /api/account/social-links/link`
- `GET /api/account/social-links`
- `DELETE /api/account/social-links/:provider`

보류 이유:

- 로그인 화면의 소셜 진입과 다른 범위다.
- 이미 로그인한 계정에 다른 소셜 아이디를 연결할 때만 필요하다.
- 연결하려는 소셜 아이디에 이미 진행 데이터가 있으면 차단해야 하며, 이 충돌 처리는 account settings/연동 관리 API에서 다룬다.
- 게스트에서 계정 바인딩 시점도 P0 미결이다.
- 오프닝 종료 후 제안이라는 후보만 있다.
- 데이터 충돌/병합/삭제 정책이 먼저 확정되어야 한다.

### 5.2 Account Data Conflict / Social Link Summary API

후보:

- `GET /api/account/data-summary`

보류 이유:

- 로그인 시작 화면의 소셜 진입과 다른 범위다.
- 이미 로그인한 계정을 다른 소셜 아이디에 연결할 때 필요한 보조 API다.
- 연결 대상 소셜 아이디에 이미 진행 데이터가 있는지 설명하기 위한 요약 API로 둔다.
- 실제 삭제/병합/차단 정책이 확정된 뒤 account social link API와 함께 구현한다.

### 5.3 Production Data Delete API

후보:

- `POST /api/account/delete/prepare`
- `POST /api/account/delete/confirm`

보류 이유:

- 계정 삭제와 게임 데이터 삭제의 법적/보안 범위가 필요하다.
- 재인증, 보관 기간, 복구 불가 안내, audit log 정책이 필요하다.

### 5.4 Direct Email/Password Signup API

보류 이유:

- 원문 미정.
- 현재는 소셜 전용으로 유추한다.

## 6. User Document 확장 후보

로그인/가입 API를 위해 `users` document에 다음 필드가 필요하다.

```ts
interface AccountSignupFields {
  signupProfileCompleted?: boolean
  timeZone?: string
  detectedTimeZone?: string
  utcOffsetMinutes?: number
  timezoneCompleted?: boolean
  termsCompleted?: boolean
  termsAgreements?: {
    serviceTermsVersion: string
    privacyPolicyVersion: string
    marketingTermsVersion?: string
    marketingAccepted: boolean
    ageConfirmed?: boolean
    ageGateVersion?: string
    agreedAt: number
  }
  profileImageSource?: 'first-aidong' | 'default'
}
```

주의:

- 실제 프로필 이미지는 최초 Aidong 확정 이후 `my-aidong` 또는 profile aggregation에서 계산해도 된다.
- `profileImageSource`는 지금 당장 이미지 URL을 저장하지 않는다.

## 7. 작업 순서

이번 작업은 화면 구현이 아니라 backend/API 기반을 먼저 세우는 순서로 진행한다.

핵심 원칙:

- 화면은 provider 버튼을 보여줄 수 있지만, 어떤 provider가 실제 사용 가능한지는 backend config가 알려준다.
- 소셜 인증 UI/OAuth redirect 자체는 frontend 또는 Firebase/Auth SDK가 담당한다.
- backend는 provider token 또는 provider 식별 정보를 검증하고, 그 결과로 user document를 만들거나 찾아준다.
- 로그인 화면의 social entry는 계정 연결/병합/삭제를 처리하지 않는다.
- 계정 진행 단계는 모든 auth/account route가 같은 helper로 계산한다.

## 7.1 Social provider 제공 정책 확정

이 단계의 목표는 실제 로그인 화면이 backend에서 provider 목록을 받아 버튼을 그릴 수 있는 상태까지 만드는 것이다.

### 7.1.1 SocialProvider 타입과 상태 타입 분리

- [x] 현재 `packages/backend/src/routes/auth.ts` 안에 있는 `SocialProvider = 'google' | 'twitter' | 'firebase'`를 route 내부 타입으로 두지 않는다.
- [x] `packages/backend/src/auth/socialProviders.ts`를 새로 만든다.
- [x] `SocialProvider` 후보를 다음으로 확정한다.
  - `google`
  - `apple`
  - `x`
  - `kakao`
  - `naver`
  - `line`
  - `facebook`
  - `firebase`
- [x] 기존 `twitter` 명칭은 신규 계약에서는 쓰지 않고 `x`로 정리한다.
  - 단, 기존 테스트/데이터 호환이 필요하면 별도 migration 후보로 문서화한다.
- [x] provider 상태 타입을 만든다.

```ts
type SocialProviderStatus = 'enabled' | 'planned' | 'devOnly' | 'disabled'
type SocialProviderAuthMode = 'firebase' | 'direct-oauth' | 'mock'
```

완료 기준:

- backend에서 provider 타입을 한 파일에서 import할 수 있다.
- route마다 provider union을 따로 선언하지 않는다.

### 7.1.2 Provider config 상수 작성

- [x] 같은 파일에 provider config 배열을 만든다.

```ts
interface SocialProviderConfig {
  provider: SocialProvider
  label: string
  status: SocialProviderStatus
  authMode: SocialProviderAuthMode
  displayOrder: number
  envKeys: string[]
  note?: string
}
```

- [x] 첫 구현 상태를 다음처럼 둔다.
  - `firebase`: `enabled`, `firebase`.
  - `google`: `enabled` 또는 `planned`.
    - Firebase Auth로 Google 로그인을 처리할 수 있으면 `enabled`.
    - 아직 frontend Firebase 연결이 없다면 `planned`.
  - `apple`: `planned`, `firebase`.
  - `x`: `planned`, `direct-oauth`.
  - `kakao`: `planned`, `direct-oauth`.
  - `naver`: `planned`, `direct-oauth`.
  - `line`: `planned`, `direct-oauth`.
  - `facebook`: `planned`, `firebase` 또는 `direct-oauth`.
- [x] env key는 실제 사용하지 않아도 이름을 예약한다.
  - Firebase: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
  - Kakao: `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`.
  - Naver: `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`.
  - LINE: `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`.
  - X: `X_CLIENT_ID`, `X_CLIENT_SECRET`.
  - Apple: `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`.
  - Facebook: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`.

완료 기준:

- provider 목록을 route에서 직접 배열로 만들지 않는다.
- status만 바꾸면 화면 노출 상태가 바뀌는 구조가 된다.

### 7.1.3 Provider config sanitizing 함수 작성

- [x] `getPublicSocialProviders()` 함수를 만든다.
- [x] 이 함수는 frontend에 내려도 되는 필드만 반환한다.
- [x] private env key 값, secret 값, 내부 note는 내려주지 않는다.
- [x] 반환 필드는 최소 다음으로 제한한다.

```ts
interface PublicSocialProvider {
  provider: SocialProvider
  label: string
  status: SocialProviderStatus
  authMode: SocialProviderAuthMode
  displayOrder: number
}
```

완료 기준:

- API 응답에 secret, env value, server-only note가 섞이지 않는다.

### 7.1.4 Provider 읽기/검증 helper 작성

- [x] `readSocialProvider(value: unknown): SocialProvider | undefined`를 만든다.
- [x] `isSocialProviderEnabled(provider: SocialProvider)`를 만든다.
- [x] `getSocialProviderConfig(provider)`를 만든다.
- [x] 기존 `readProvider`는 새 helper를 사용하도록 교체한다.

완료 기준:

- `auth.ts`가 provider 문자열 검증을 직접 들고 있지 않는다.
- 이후 `/api/auth/social/entry`가 같은 helper를 사용한다.

### 7.1.5 `GET /api/auth/social/providers` route 구현

- [x] `packages/backend/src/routes/auth.ts`에 `GET /api/auth/social/providers`를 추가한다.
- [x] 응답은 `getPublicSocialProviders()` 결과를 `displayOrder` 순서로 반환한다.

응답 예:

```ts
{
  ok: true,
  providers: [
    {
      provider: 'google',
      label: 'Google',
      status: 'planned',
      authMode: 'firebase',
      displayOrder: 10
    }
  ]
}
```

- [x] provider config가 비어 있으면 500이 아니라 빈 목록과 `ok: true`로 내려줄지 결정한다.
  - 권장: 비어 있으면 설정 오류에 가깝기 때문에 test에서 잡고, 운영 route는 `ok: true`와 빈 목록을 허용하지 않는다.

완료 기준:

- backend 서버 실행 후 `GET /api/auth/social/providers`가 JSON을 반환한다.
- 로그인 화면 담당자는 이 API만 보고 provider 버튼 상태를 판단할 수 있다.

### 7.1.6 Frontend API client 추가

- [x] `packages/frontend/src/lib/api.ts`에 `getSocialProviders()`를 추가한다.
- [x] frontend용 타입을 추가한다.
  - `SocialProvider`
  - `SocialProviderStatus`
  - `SocialProviderAuthMode`
  - `PublicSocialProvider`
- [x] 화면 TSX는 직접 건드리지 않는다.
- [x] 화면 담당자에게 `getSocialProviders()`를 쓰면 된다고 넘긴다.

완료 기준:

- frontend typecheck에서 `getSocialProviders()`를 import할 수 있다.
- 화면 담당자가 fetch URL을 직접 작성하지 않아도 된다.

### 7.1.7 테스트 추가

- [x] backend test에 provider config 테스트를 추가한다.
  - 모든 provider id가 중복되지 않는다.
  - `displayOrder`가 숫자다.
  - status가 허용값 중 하나다.
  - public response에 `envKeys` 값이나 secret 값이 나오지 않는다.
- [x] route 테스트를 추가한다.
  - `GET /api/auth/social/providers`가 200을 반환한다.
  - provider 목록에 최소 `firebase`, `google`, `kakao`, `naver`, `line`, `apple`, `x`, `facebook`이 포함된다.
- [x] frontend typecheck를 통과시킨다.

완료 기준:

- provider config 변경 실수는 테스트에서 잡힌다.
- public API가 실제로 호출 가능한 상태가 된다.

### 7.1.8 문서 반영

- [x] `.cloud/97_api_document_boundary_2026-06-15.md`에 `GET /api/auth/social/providers`를 추가한다.
- [x] `.cloud/96_two_person_work_rules_2026-06-15.md`에 화면 담당자는 provider 목록을 API에서 받는다고 명시한다.
- [x] 이 문서의 7.1 체크리스트를 완료 처리한다.
- [x] 한글 깨짐 검사를 수행한다.

완료 기준:

- provider 목록, 지원 상태, backend 검증 방식, env 경계가 문서와 코드 상수로 동일하게 존재한다.
- 화면은 하드코딩 목록이 아니라 backend provider config를 우선 사용할 수 있다.
- `GET /api/auth/social/providers`와 `getSocialProviders()` client가 실제로 동작한다.

## 7.2 Account model/default 확장

- [x] `UserDoc` type에 primary social identity 필드를 추가한다.
  - `authProvider`
  - `providerUid`
  - `email`
  - `emailNormalized`
  - `displayName`
  - `photoURL`
- [x] `UserDoc` type에 signup/timezone/terms 필드를 추가한다.
- [x] `UserModel` schema에 동일 필드를 추가한다.
- [x] provider login 조회용 index를 추가한다.
  - `{ authProvider, providerUid }`
  - 필요 시 `{ emailNormalized }`
- [x] memory/mongo user repository의 guest/auth 기본값을 맞춘다.
- [x] account state response에 필요한 필드를 포함한다.

완료 기준:

- 기존 guest/social login이 깨지지 않고 새 필드가 기본값으로 생긴다.
- 같은 provider uid로 중복 user가 생성되지 않는다.

## 7.3 Account progress helper 작성

- [x] `AccountProgress` 타입을 만든다.
- [x] user document를 보고 `nextStep`을 계산하는 helper를 만든다.
- [x] `signup`, `timezone`, `terms`, `title` 순서를 반영한다.
- [x] guest는 즉시 `title`로 보낼지 현재 정책으로 고정한다.
- [x] provider entry, signup, timezone, terms, bootstrap route가 모두 같은 helper를 사용하게 한다.

완료 기준:

- route마다 nextStep 계산을 중복 구현하지 않는다.

## 7.4 Social provider adapter skeleton 작성

- [x] provider 검증 결과 타입을 만든다.

```ts
interface VerifiedSocialIdentity {
  provider: SocialProvider
  providerUid: string
  email?: string
  emailVerified?: boolean
  displayName?: string
  photoURL?: string
}
```

- [x] provider adapter interface를 만든다.

```ts
interface SocialProviderAdapter {
  provider: SocialProvider
  verify(input: SocialEntryInput): Promise<VerifiedSocialIdentity>
}
```

- [x] Firebase adapter를 1차 구현 대상으로 둔다.
  - `idTokenProvider: 'firebase'`
  - `idToken` 또는 `firebaseIdToken`을 받아 검증한다.
  - 검증 결과에서 실제 provider, uid, email, displayName, photoURL을 추출한다.
- [x] 아직 직접 검증하지 않는 provider는 `planned` 상태로 두고 entry 호출 시 `provider_not_enabled`를 반환한다.
- [x] test/dev 환경용 mock adapter를 둘지 결정한다.
  - 둔다면 production에서는 절대 활성화되지 않도록 env guard를 둔다.

완료 기준:

- `/api/auth/social/entry`는 provider별 분기문을 직접 들고 있지 않고 adapter를 통해 검증한다.
- 실제 OAuth provider가 늘어나도 route 계약을 바꾸지 않고 adapter만 추가할 수 있다.

## 7.5 Auth social providers API 구현

- 7.1 작업에서 완료했다.

- [x] `GET /api/auth/social/providers`를 구현한다.
- [x] provider별 label, status, auth mode를 반환한다.

응답 예:

```ts
{
  ok: true
  providers: [
    {
      provider: 'google',
      label: 'Google',
      status: 'enabled',
      authMode: 'firebase'
    },
    {
      provider: 'kakao',
      label: 'Kakao',
      status: 'planned',
      authMode: 'direct-oauth'
    }
  ]
}
```

- [x] `api.ts` client를 추가한다.

완료 기준:

- 화면은 provider 버튼 6종 이상을 하드코딩으로만 판단하지 않고, backend가 내려주는 상태에 맞춰 사용할 수 있다.

## 7.6 Auth social entry API 구현

- [x] provider enum을 확장한다.
- [x] `POST /api/auth/social/entry`를 추가한다.
- [x] provider adapter 검증을 통과한 identity만 user 조회/생성에 사용한다.
- [x] `{ authProvider, providerUid }`로 기존 계정을 조회한다.
- [x] 기존 계정이면 `isNew: false`, `nextStep`을 반환한다.
- [x] 신규 계정이면 최소 user shell을 만들고 `isNew: true`, `nextStep: 'signup'`을 반환한다.
- [x] provider email은 보조 정보로 저장하되, email만으로 기존 계정을 자동 병합하지 않는다.
- [x] 로그인 이후 계정 바인딩 충돌 처리는 이 API에서 제외한다.
- [x] `provider_not_enabled`, `invalid_provider_token`, `provider_identity_missing` 오류를 구분한다.
- [x] `api.ts` client를 추가한다.

완료 기준:

- 소셜 인증 후 backend가 신규/기존/다음 단계를 판정한다.
- 이미 로그인한 계정에 다른 소셜 아이디를 연결하는 기능은 실행되지 않는다.

## 7.7 Account bootstrap API 구현

- [x] `GET /api/account/bootstrap`을 구현한다.
- [x] account progress와 `nextStep`을 반환한다.
- [x] provider/account 요약 정보를 반환한다.
- [x] `api.ts` client를 추가한다.

완료 기준:

- 프론트 화면은 여러 API를 조합하지 않고 bootstrap 하나로 다음 화면을 판단할 수 있다.

## 7.8 Nickname API 구현

- [x] 금칙어 seed 목록을 만든다.
- [x] nickname normalize 규칙을 만든다.
- [x] `POST /api/account/nickname/check`를 구현한다.
- [x] `POST /api/account/signup/profile`을 구현한다.
- [x] `api.ts` client를 추가한다.

완료 기준:

- 닉네임 중복/금칙어/길이 검증 후 가입 프로필 저장이 가능하다.

## 7.9 Timezone API 구현

- [x] IANA timezone validation 방식을 정한다.
- [x] `POST /api/account/preferences/timezone`을 구현한다.
- [x] `api.ts` client를 추가한다.

완료 기준:

- 계정에 케어/알림 기준 timezone을 저장할 수 있다.

## 7.10 Terms API 구현

- [x] 현재 약관 버전 static config를 만든다.
- [x] `GET /api/account/terms/current`를 구현한다.
- [x] `POST /api/account/terms/agree`를 구현한다.
- [x] 필수 약관 누락 시 실패하도록 검증한다.
- [x] 선택 약관은 동의/미동의 여부를 모두 DB에 저장한다.
- [x] `api.ts` client를 추가한다.

완료 기준:

- 필수 약관 동의 이력과 버전을 저장하고 nextStep이 title로 넘어간다.
- 선택 약관은 체크하지 않은 경우에도 `marketingAccepted: false`로 저장된다.

## 7.11 Frontend API client 연결

- [x] `packages/frontend/src/lib/api.ts`에 account/auth client를 추가한다.
- [x] 화면 담당자가 바로 쓸 수 있도록 함수 이름을 고정한다.
  - `getSocialProviders`
  - `authGuest`
  - `authSocialEntry`
  - `getAccountBootstrap`
  - `checkNickname`
  - `completeSignupProfile`
  - `saveAccountTimeZone`
  - `getCurrentTerms`
  - `agreeTerms`
- [x] screen tsx는 직접 수정하지 않고 client 계약만 제공한다.

완료 기준:

- 화면 담당자는 fetch path를 직접 조립하지 않고 `api.ts` 함수만 호출하면 된다.

## 7.12 테스트와 문서 갱신

- [x] backend persistence/auth test를 추가한다.
- [x] provider config test를 추가한다.
- [x] social entry 신규/기존/provider disabled/invalid token test를 분리한다.
- [x] terms optional false 저장 test를 추가한다.
- [x] frontend `api.ts` typecheck를 통과시킨다.
- [x] `.cloud/97_api_document_boundary_2026-06-15.md`에 새 API를 반영한다.
- [x] `.cloud/96_two_person_work_rules_2026-06-15.md`에 화면 담당자와 API 담당자의 auth 경계를 필요 시 보강한다.
- [x] 한글 깨짐 검사를 수행한다.

완료 기준:

- API 계약과 문서가 같은 상태가 된다.

## 8. 이번 작업에서 화면 담당자에게 넘길 정보

화면 담당자에게 필요한 것은 다음이다.

- 로그인 화면은 먼저 `getSocialProviders`로 provider 목록과 상태를 받는다.
- 로그인 화면은 `enabled` provider만 실제 로그인 가능 버튼으로 취급한다.
- `planned` provider는 준비 중 표시 또는 disabled 버튼으로 처리한다.
- 로그인 화면은 게스트 진입 시 `authGuest`, 소셜 인증 완료 후 `authSocialEntry`를 호출하면 된다.
- 회원가입 화면은 `checkNickname`, `completeSignupProfile`을 호출하면 된다.
- 시간대 화면은 `saveAccountTimeZone`을 호출하면 된다.
- 약관 화면은 `getCurrentTerms`, `agreeTerms`를 호출하면 된다.
- 앱 재진입 또는 로그인 직후에는 `getAccountBootstrap`으로 다음 화면을 판단한다.
- 화면 담당자는 provider token 검증 방식이나 계정 생성 분기를 직접 구현하지 않는다.

## 9. 변경 기록

- 2026-06-15: 로그인/회원가입/시간대/약관 기획을 API 관점으로 분해하고, 첫 구현에 꼭 필요한 API 목록과 작업 순서를 정리했다.
- 2026-06-15: `/api/auth/social/entry`에서 소셜 계정 바인딩 충돌 처리를 제외했다. 해당 문제는 로그인 이후 account social link API 범위로 보류했다.
- 2026-06-15: `GET /api/account/data-summary`를 첫 로그인/가입 필수 API에서 제외하고, 로그인 이후 소셜 계정 연결 충돌 보조 API 후보로 이동했다.
- 2026-06-15: 선택 약관도 동의/미동의 상태를 DB에 명시 저장하도록 Terms API 계약과 완료 기준을 보강했다.
- 2026-06-15: 소셜 provider 제공, provider adapter, social entry, 가입 단계 API 순서로 구현 순서를 재작성했다.
- 2026-06-15: 7.1 Social provider 제공 정책을 구현했다. `GET /api/auth/social/providers`, backend provider config/helper, frontend `getSocialProviders()` client, provider config/route 테스트를 추가했다.
- 2026-06-15: 7.2 Account model/default 확장을 구현했다. `providerUid`, `emailNormalized`, signup/timezone/terms 기본 필드, provider identity index, account state 응답 확장, provider uid 중복 방지 테스트를 추가했다.
- 2026-06-15: 7.3 Account progress helper를 구현했다. `AccountProgress`, `nextStep` 계산 helper, auth/account 응답의 `account + nextStep`, guest/title 및 signup/timezone/terms 순서 테스트를 추가했다.
- 2026-06-15: 7.4 Social provider adapter skeleton을 구현했다. `VerifiedSocialIdentity`, `SocialProviderAdapter`, Firebase adapter, provider verification error, planned provider 차단 테스트를 추가했다.
- 2026-06-15: 7.6 Auth social entry API를 구현했다. `POST /api/auth/social/entry`, adapter 검증 기반 user 조회/생성, `isNew + nextStep` 응답, provider error code 분리, frontend `authSocialEntry()` client를 추가했다.
- 2026-06-15: 7.7 Account bootstrap API를 구현했다. `GET /api/account/bootstrap`, provider/account 요약 응답, frontend `getAccountBootstrap()` client, bootstrap route 테스트를 추가했다.
- 2026-06-15: 7.8 Nickname API를 구현했다. 닉네임 정규화/금칙어/길이/중복 검사, `POST /api/account/nickname/check`, `POST /api/account/signup/profile`, `nicknameNormalized` 저장/응답, frontend `checkNickname()`/`completeSignupProfile()` client, route 회귀 테스트를 추가했다.
- 2026-06-15: 7.9 Timezone API를 구현했다. IANA timezone 검증 정책, `POST /api/account/preferences/timezone`, `timeZone/detectedTimeZone/utcOffsetMinutes/timezoneCompleted` 저장, frontend `saveAccountTimeZone()` client, timezone route 회귀 테스트를 추가했다.
- 2026-06-15: 7.10 Terms API를 구현했다. 현재 약관 static config, `GET /api/account/terms/current`, `POST /api/account/terms/agree`, 필수 약관/version/age-gate 검증, 선택 마케팅 약관 `false` 저장, frontend `getCurrentTerms()`/`agreeTerms()` client, 약관 route 회귀 테스트를 추가했다.
- 2026-06-15: 7.11/7.12를 마무리했다. account/auth frontend client 목록을 확정하고, screen TSX를 건드리지 않는 경계를 유지했다. Firebase token 검증을 mock한 `authSocialEntry.test.ts`를 추가해 social entry 신규/기존 성공 분기를 보강했으며, provider disabled/invalid token, terms optional false 저장, typecheck, API 문서, 2인 작업 규칙, 한글 깨짐 검사를 확인했다.
- 2026-06-15: 로그인 화면에서 provider 버튼 전체를 테스트 가능 상태로 열었다. 실제 Firebase/Auth 전환 작업은 `.cloud/100_next_work_2026-06-15_firebase_social_auth.md`로 분리했다.
