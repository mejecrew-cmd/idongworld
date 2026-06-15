# 100. Next Work 2026-06-15 Firebase 소셜 로그인 실제 연동

## 1. 문서 목적

이 문서는 현재 테스트용으로 열어 둔 소셜 로그인 버튼을 실제 Firebase/Auth 연동으로 전환하기 위한 작업 순서를 정리한다.

현재 로그인 화면은 모든 provider 버튼을 누를 수 있다.

다만 실제 provider 인증이 끝난 상태는 아니다.

따라서 다음 작업의 목표는 다음과 같다.

- 테스트 provider 진입과 실제 provider 진입을 명확히 구분한다.
- Firebase Auth로 바로 붙일 수 있는 provider를 먼저 실제 연동한다.
- Firebase Auth 기본 provider로 바로 붙이기 어려운 provider는 direct OAuth 또는 Firebase custom token 방식으로 분리한다.
- backend는 provider token 검증과 account document 생성을 권위 있게 처리한다.
- 화면 담당자는 버튼 UI만 다루고, 인증 성공 이후에는 정해진 API client만 호출한다.

## 2. 현재 상태

현재 구현:

- 로그인 화면에 provider 버튼 전체 노출.
  - Google
  - Apple
  - X
  - Kakao
  - Naver
  - LINE
  - Facebook
- 모든 provider 버튼은 테스트 가능하도록 열려 있다.
- 실제 Firebase 설정이 켜져 있고 지원 provider이면 Firebase popup을 시도한다.
- 실제 provider 구현이 없는 경우에는 provider별 dev uid를 만들어 `/api/auth/session`으로 테스트 로그인한다.
- backend에는 다음 API가 있다.
  - `GET /api/auth/social/providers`
  - `POST /api/auth/guest`
  - `POST /api/auth/session`
  - `POST /api/auth/social/entry`
  - `GET /api/account/bootstrap`
  - 가입 프로필, 시간대, 약관 API

현재 한계:

- `POST /api/auth/social/entry`는 Firebase id token 검증 skeleton이 있지만, frontend 로그인 화면은 아직 이 API를 실제 소셜 로그인 기본 경로로 사용하지 않는다.
- frontend는 아직 Google/X 외 provider SDK popup 구현이 없다.
- backend provider config의 `planned/enabled` 상태가 실제 env readiness와 연결되어 있지 않다.
- Firebase decoded token의 provider 정보와 요청 provider가 일치하는지 검증하는 정책이 아직 상세하지 않다.
- Kakao/Naver/LINE은 Firebase 기본 provider가 아니므로 direct OAuth 또는 custom token 전략이 필요하다.
- 테스트 provider uid가 실제 운영 로그인과 섞이지 않도록 guard가 더 필요하다.

## 3. 실제 연동 provider 분류

### 3.1 Firebase Auth 기본 연동 후보

아래 provider는 Firebase Auth client provider로 먼저 실제 연동한다.

- Google
- Apple
- Facebook
- X

주의:

- Firebase SDK에서는 X가 역사적으로 Twitter provider 계열로 노출될 수 있다.
- frontend/backend 계약명은 `x`로 유지한다.
- legacy 문자열 `twitter`는 backend helper에서만 호환 처리한다.

### 3.2 별도 OAuth 또는 Firebase custom token 후보

아래 provider는 Firebase 기본 provider로 바로 붙이지 않는다.

- Kakao
- Naver
- LINE

선택지:

1. Direct OAuth:
   - backend가 provider authorization code를 받아 token 교환.
   - provider profile API로 identity 확인.
   - backend가 `users` document 생성/조회.
   - Firebase client session과는 별도 세션 전략이 필요하다.

2. Firebase custom token:
   - backend가 Kakao/Naver/LINE OAuth를 검증.
   - backend가 Firebase Admin으로 custom token 발급.
   - frontend가 custom token으로 Firebase Auth 로그인.
   - 이후 backend API는 Firebase id token으로 동일하게 인증 가능하다.

권장:

- 1차 실제 연동은 Google, Apple, Facebook, X만 Firebase Auth로 진행한다.
- Kakao/Naver/LINE은 custom token 전략을 기본 후보로 문서화하고, 실제 provider console 정보가 생긴 뒤 구현한다.

## 4. 구현 원칙

### 4.1 로그인 화면 진입 원칙

- 로그인 화면 provider 버튼은 계속 모두 노출한다.
- `enabled` provider는 실제 로그인으로 진행한다.
- `devOnly` provider는 개발 환경에서만 테스트 로그인으로 진행한다.
- `planned` provider는 클릭 가능 테스트 모드로 둘 수 있지만, production에서는 비활성 또는 준비중 처리한다.
- 화면 파일은 provider별 OAuth 세부 정책을 직접 들고 있지 않는다.

### 4.2 Backend 권위 원칙

- 최종 계정 생성/조회는 backend가 한다.
- frontend에서 얻은 provider profile만 믿고 계정을 만들지 않는다.
- 실제 소셜 로그인은 `POST /api/auth/social/entry`를 우선 사용한다.
- `POST /api/auth/session`은 compat/test fallback 성격으로 낮춘다.
- provider token 검증은 `packages/backend/src/auth/socialProviderAdapters.ts`를 통과해야 한다.

### 4.3 UID 원칙

- Firebase Auth가 있는 provider는 Firebase uid를 backend `uid`로 사용한다.
- `users.authProvider`는 사용자가 진입한 provider를 저장한다.
- `users.providerUid`는 provider identity를 저장한다.
- 1차 Firebase 연동에서는 providerUid를 Firebase uid로 둘 수 있다.
- 추후 provider별 원본 subject가 필요하면 `socialIdentities` collection 또는 `users.socialLinks[]`로 확장한다.

주의:

- 같은 Firebase uid가 다른 provider 버튼으로 들어오는 경우 중복 user가 생기면 안 된다.
- provider별 계정 연결/충돌 처리는 로그인 이후 account social link API 범위로 분리한다.

## 5. 작업 순서

## 5.1 Firebase Console 설정값 정리

- [ ] Firebase project를 확정한다.
- [ ] frontend env 이름을 확정한다.
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_SOCIAL_LOGIN_ENABLED`
- [ ] backend Firebase Admin env 이름을 확정한다.
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
- [ ] 로컬 `.env` 예시 문서를 만든다.
- [ ] 실제 secret 값은 `.cloud`나 repo 문서에 적지 않는다.

완료 기준:

- 개발자가 어떤 Firebase 값을 어디에 넣어야 하는지 헷갈리지 않는다.
- repo에는 secret이 남지 않는다.

## 5.2 Firebase provider console 활성화

- [ ] Firebase Authentication에서 Google provider를 활성화한다.
- [ ] Firebase Authentication에서 Apple provider 활성화 가능 조건을 정리한다.
- [ ] Firebase Authentication에서 Facebook provider 활성화 가능 조건을 정리한다.
- [ ] Firebase Authentication에서 X/Twitter provider 활성화 가능 조건을 정리한다.
- [ ] 각 provider별 callback/redirect URI를 문서화한다.
- [ ] provider console에 등록할 local/dev/prod domain을 분리한다.

완료 기준:

- Firebase console에서 실제 provider 로그인 버튼을 누를 수 있는 상태가 된다.

## 5.3 Frontend Firebase provider 구현 확장

대상 파일:

- `packages/frontend/src/lib/firebase.ts`

작업:

- [ ] `SocialAuthProvider`를 실제 Firebase popup 가능 provider 중심으로 정리한다.
  - `google`
  - `apple`
  - `facebook`
  - `x`
- [ ] Apple provider 구현을 추가한다.
- [ ] Facebook provider 구현을 추가한다.
- [ ] X provider 구현을 `TwitterAuthProvider` 기반으로 정리한다.
- [ ] provider 계약명 `x`와 Firebase SDK provider 구현명을 매핑한다.
- [ ] provider popup 실패 error를 화면에서 구분할 수 있도록 normalize helper를 만든다.

완료 기준:

- Firebase 설정이 켜져 있으면 Google, Apple, Facebook, X 버튼이 실제 popup을 시도한다.
- Firebase 설정이 없으면 dev/test fallback으로 내려간다.

## 5.4 Frontend 로그인 flow를 social entry 중심으로 전환

대상 파일:

- `packages/frontend/src/screens/LoginScreen.tsx`
- `packages/frontend/src/lib/api.ts`

작업:

- [ ] 실제 Firebase popup 성공 후 `user.getIdToken()`을 가져온다.
- [ ] `api.authSocialEntry()`를 호출한다.
- [ ] 요청 payload는 다음을 사용한다.

```ts
{
  provider: 'google' | 'apple' | 'facebook' | 'x'
  idTokenProvider: 'firebase'
  firebaseIdToken: string
  email?: string | null
  displayName?: string | null
  photoURL?: string | null
}
```

- [ ] `api.authSession()` 직접 호출은 dev fallback 또는 compat 경로로 내린다.
- [ ] 응답의 `nextStep`에 따라 이동한다.
  - `signup`
  - `timezone`
  - `terms`
  - `title`
- [ ] 로그인 화면의 provider 버튼 상태는 가능하면 `api.getSocialProviders()` 응답 기반으로 바꾼다.

완료 기준:

- 실제 Firebase provider 로그인은 `/api/auth/social/entry`를 통한다.
- 화면은 provider별 신규/기존 판단을 직접 하지 않는다.

## 5.5 Backend Firebase token 검증 강화

대상 파일:

- `packages/backend/src/auth/socialProviderAdapters.ts`
- `packages/backend/src/auth/socialProviders.ts`
- `packages/backend/src/routes/auth.ts`

작업:

- [ ] Firebase decoded token에서 provider 정보를 읽는 방식을 확정한다.
- [ ] 요청 provider와 decoded sign-in provider가 맞는지 검증한다.
- [ ] provider 매핑을 만든다.

예시:

```ts
google -> google.com
apple -> apple.com
facebook -> facebook.com
x -> twitter.com
```

- [ ] mismatch이면 `invalid_provider_token`으로 실패한다.
- [ ] decoded token에 email/displayName/photoURL이 없으면 request 보조값을 사용할 수 있는지 정책을 정한다.
- [ ] Firebase uid가 비어 있으면 `provider_identity_missing`으로 실패한다.

완료 기준:

- Google token으로 Kakao provider를 요청하는 식의 mismatch가 backend에서 차단된다.
- social entry route가 provider별 if/switch로 비대해지지 않는다.

## 5.6 Provider status를 env readiness와 연결

대상 파일:

- `packages/backend/src/auth/socialProviders.ts`

작업:

- [ ] provider config의 static status와 runtime status를 분리한다.
- [ ] Firebase Admin env가 준비되어 있으면 Firebase 기반 provider를 `enabled`로 노출할 수 있게 한다.
- [ ] frontend env readiness는 backend가 직접 알 수 없으므로 문서상 분리한다.
- [ ] `devOnly` status를 사용할 경우 production에서는 내려가지 않도록 guard를 둔다.
- [ ] Kakao/Naver/LINE은 실제 adapter 전까지 `planned` 또는 `devOnly`로 둔다.

완료 기준:

- 환경 설정 없이 production에서 가짜 enabled provider가 노출되지 않는다.
- 개발 환경에서는 테스트 편의 상태를 명확히 볼 수 있다.

## 5.7 Dev/test 로그인 fallback 정리

대상 파일:

- `packages/frontend/src/screens/LoginScreen.tsx`
- `packages/backend/src/routes/auth.ts`

작업:

- [ ] dev provider uid fallback은 `import.meta.env.DEV`에서만 동작하게 한다.
- [ ] production에서 fallback이 실행되면 에러 처리한다.
- [ ] fallback uid prefix를 명확히 한다.
  - `dev-{provider}-{uuid}`
- [ ] `localStorage`에 저장된 dev uid 삭제 방법을 디버그 패널 또는 문서에 남긴다.
- [ ] 테스트 계정과 실제 계정이 섞이지 않도록 backend에도 dev uid guard 후보를 둔다.

완료 기준:

- 테스트 버튼은 개발 중에는 편하지만 운영 빌드에는 남지 않는다.

## 5.8 Kakao/Naver/LINE 연동 전략 문서화

작업:

- [ ] 세 provider는 Firebase 기본 popup이 아니므로 별도 전략 문서를 둔다.
- [ ] direct OAuth 방식과 Firebase custom token 방식의 장단점을 비교한다.
- [ ] 권장안을 custom token 중심으로 잡는다.
- [ ] 필요한 backend endpoint 후보를 정리한다.

후보 API:

```txt
GET  /api/auth/oauth/:provider/start
GET  /api/auth/oauth/:provider/callback
POST /api/auth/oauth/:provider/exchange
```

또는 custom token 후보:

```txt
POST /api/auth/social/:provider/token
```

완료 기준:

- Kakao/Naver/LINE은 지금 당장 억지 구현하지 않고, 추후 실제 provider 정보가 왔을 때 바로 작업할 수 있다.

## 5.9 테스트 추가

Backend test:

- [ ] Firebase token valid case.
- [ ] Firebase token provider mismatch case.
- [ ] Firebase token missing uid case.
- [ ] 기존 계정 재로그인 case.
- [ ] 신규 계정 생성 후 `nextStep: signup` case.
- [ ] provider disabled/planned case.

Frontend test 또는 typecheck:

- [ ] provider 목록 렌더링 typecheck.
- [ ] dev fallback이 DEV에서만 가능한지 확인.
- [ ] `authSocialEntry()` 호출 payload typecheck.

완료 기준:

- Firebase social entry가 깨지면 test에서 잡힌다.

## 5.10 문서 갱신

대상:

- `.cloud/97_api_document_boundary_2026-06-15.md`
- `.cloud/96_two_person_work_rules_2026-06-15.md`
- `.cloud/02_module_creator_guide_2026-06-13.md`는 auth 관련 내용이 직접 필요할 때만 갱신한다.

작업:

- [ ] 실제 Firebase provider와 dev/test provider 경계를 문서화한다.
- [ ] social entry가 권장 API임을 명시한다.
- [ ] `authSession`은 compat/test fallback임을 명시한다.
- [ ] provider별 console/env 준비 항목을 문서화한다.
- [ ] 한글 깨짐 검사를 수행한다.

완료 기준:

- 새 개발자가 “어떤 버튼은 왜 테스트이고, 어떤 버튼은 왜 실제 로그인인지” 바로 이해할 수 있다.

## 6. 우선순위

1. Firebase env와 console 설정 문서화.
2. Google 실제 로그인부터 social entry로 전환.
3. X, Facebook, Apple 순서로 Firebase popup provider 추가.
4. backend provider mismatch 검증 강화.
5. dev fallback을 DEV 한정으로 제한.
6. Kakao/Naver/LINE custom token 전략 문서화.

## 7. 변경 기록

- 2026-06-15: 테스트 provider 전체 오픈 이후, 실제 Firebase 소셜 로그인 전환을 위한 next work 작성.
