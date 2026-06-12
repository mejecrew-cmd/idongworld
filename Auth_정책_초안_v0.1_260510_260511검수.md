---
version: v1.0.0
last_updated: 2026-05-11
status: Q1·Q2 PM 답변 락 (PM_결정사항 v1.0) + Phase 1.5-13 Step 1-3 사전 구현 완료
type: 정책 결정 문서 (Decision Record)
target_decision_date: 2026-05-14 (목)
purpose: 5/14 Backend Firebase Auth 결정 — 옵션·트레이드오프·권장안
reviewed_at: 2026-05-11

---

# 🔐 Backend Auth 정책 v1.0

> ✅ **PM 답변 락 (2026-05-11)**: Q1 옵션 A 채택·Q2 게스트 무한 + Google/Twitter placeholder (PM_결정사항 v1.0).
> ✅ **Phase 1.5-13 사전 구현 (2026-05-10)**: Step 1-3 골격 완료. 실 Firebase 키 입력과 외부 로그인 활성화는 운영 전 결정 사항.

---

## 0. 결론 권장 (한 줄)

> **권장**: Firebase Auth (게스트 + Google) + backend session 검증.
> **이유**: 1주차에 이미 sync 동작 중·게스트 fallback 있음·외부 서비스 부담 최소.

---

## 1. 현 상태 (2026-05-29 갱신)

| 영역 | 상태 |
|---|---|
| frontend account 모듈 | ✅ kind:'global' 분리 완료 (loginGuest·logout·setNickname) |
| backend `/api/auth` 라우트 | ✅ account/user repository + middleware/auth verifyIdToken (DUMMY fallback) |
| Firebase 의존성 | ✅ frontend `firebase` + backend `firebase-admin` 설치·`.env.example` 양 패키지 |
| sync (frontend↔backend) | ✅ `/api/state` 제거 완료. account·host·module·customs·action API 사용 |
| session 토큰 | ✅ Firebase ID Token (실 키 입력 시 활성)·개발 fallback |
| Google·Twitter 로그인 버튼 | 🟡 LoginScreen placeholder 유지 + `VITE_SOCIAL_LOGIN_ENABLED=true` 시 동작하는 skeleton 준비 |
| GA4 분석 (PM Q1) | ✅ `lib/analytics.ts` + `usePageTracking` + LoginScreen trackEvent |

→ **운영 전 결정**: 실 Firebase 콘솔 프로젝트 생성·API 키 발급·`.env.local` 입력은 아직 운영/외부 로그인 활성화 전 결정 사항이다. 현재 개발 기본 경로는 게스트와 로컬 fallback이다. Google/Twitter 로그인은 Firebase provider와 redirect domain 준비 후 `VITE_SOCIAL_LOGIN_ENABLED=true`로 활성화한다.

---

## 2. 옵션 비교

### 옵션 A — Firebase Auth (권장)
```
Frontend
  - firebase/app + firebase/auth (npm install)
  - signInAnonymously / signInWithPopup(GoogleAuthProvider)
  - getIdToken() → Authorization: Bearer 헤더로 backend 전송

Backend
  - firebase-admin (Node) — verifyIdToken
  - middleware: req.uid 주입
  - `/api/state` 전체 state PATCH는 사용하지 않음
  - account/session 정보는 /api/auth와 account API가 권위 경로
```

| 항목 | 평가 |
|---|---|
| 구현 난이도 | 🟢 낮음 — Firebase 가이드 1시간 |
| 비용 | 🟢 무료 (50K MAU 까지) |
| 게스트 지원 | 🟢 signInAnonymously 표준 |
| 5/14 마감 적합성 | 🟢 적합 |
| Phase 2 확장성 | 🟢 Apple·Kakao 추가 쉬움 |
| 종속성 | 🟡 Google 인프라 의존 |

### 옵션 B — JWT 자체 발급
```
Frontend
  - 게스트 ID 생성 → backend 로 send
  - backend 가 JWT 발급 → localStorage 저장

Backend
  - jsonwebtoken 라이브러리
  - 자체 secret (env)
  - 미들웨어 verify
```

| 항목 | 평가 |
|---|---|
| 구현 난이도 | 🟡 중간 — secret 관리·refresh 토큰 별도 |
| 비용 | 🟢 0 |
| 게스트 지원 | 🟢 자체 |
| 5/14 마감 적합성 | 🟡 적합하나 보안 검수 추가 |
| Phase 2 확장성 | 🔴 Google·Apple 등 추가 시 OAuth 별도 구현 |
| 종속성 | 🟢 외부 서비스 X |

### 옵션 C — NextAuth / Auth.js
```
Frontend·Backend 통합 인증 라이브러리
```

| 항목 | 평가 |
|---|---|
| 구현 난이도 | 🟡 중간 — Vite 통합 노력 (Next 가 아님) |
| 비용 | 🟢 0 |
| 5/14 마감 적합성 | 🔴 1주차 학습 비용 |

→ **A 권장 / B 차선 / C 비권장.**

---

## 3. 권장안 (옵션 A) 구현 단계

### Step 1 (5/12 화) — Firebase 셋업
- [ ] Firebase 프로젝트 생성 (콘솔)
- [ ] Auth 활성화: 익명·Google
- [x] `.env.example` 양 패키지 활성 (5/10) — 실 `.env.local`은 5/12에 콘솔 키 입력
- [ ] `frontend` `.env.local`:
  ```
  VITE_FIREBASE_API_KEY=...
  VITE_FIREBASE_AUTH_DOMAIN=...
  VITE_FIREBASE_PROJECT_ID=...
  ```
- [ ] `backend` `.env.local`:
  ```
  FIREBASE_PROJECT_ID=...
  FIREBASE_CLIENT_EMAIL=...
  FIREBASE_PRIVATE_KEY=...
  SESSION_SECRET=...
  ```

### Step 2 (5/13 수) — Frontend 통합
- [x] `pnpm --filter frontend add firebase` ✅ 5/10
- [x] `lib/firebase.ts` — initializeApp + getAuth ✅ 5/10
- [x] `lib/accountBootstrap.ts` 갱신 — Firebase Auth 백업 (Q2: 게스트만 활성·소셜 placeholder)
  ```ts
  // 게스트 → signInAnonymously
  // Google → signInWithPopup(GoogleAuthProvider)
  ```
- [x] `lib/api.ts` — Firebase 활성 시 `Authorization: Bearer ${idToken}` 헤더
- [x] `account` 모듈 manifest `api: '/api/auth'` 활성

### Step 3 (5/14 목) — Backend 통합
- [x] `pnpm --filter backend add firebase-admin` ✅ 5/10
- [x] `lib/firebaseAdmin.ts` — initializeApp + getAuth ✅ 5/10
- [x] `middleware/auth.ts` — verifyIdToken → req.uid (DUMMY fallback) ✅ 5/10
- [x] `/api/state` route 제거 및 정적 검증 ✅ 2026-05-29
- [x] `routes/auth.ts` — `/me` 엔드포인트 (현 사용자 정보) ✅ 2026-05-24

### Step 4 (5/14 목 EOD) — 검증
- [ ] 게스트 로그인 → uid 보존 → 새로고침 후 재로그인 동작
- [x] Google/Twitter 로그인 skeleton 준비 — 기본 UI는 준비중, flag 활성 시 Firebase popup + backend `/api/auth/session`
- [ ] Google 로그인 → 이메일 표시
- [ ] Twitter 로그인 → provider metadata 저장 확인
- [ ] Logout → state 초기화
- [x] `/api/state` 제거 상태에서 account/host/module/customs API 경로 검증 ✅ 2026-05-29
- [x] 모듈 분리 회귀와 action smoke 검증 ✅ 2026-05-29

### Step 5 (5/15+) — 후속 (Phase 1.5)
- [ ] Apple Sign In (iOS Safari)
- [ ] Kakao 로그인 (한국 사용자)
- [ ] Email/Password (닉네임 등록 흐름)
- [ ] Anonymous → Google 계정 연결 (link)

---

## 4. 보안 체크리스트

```
□ idToken 만료 처리 (1시간) — 자동 refresh 확인
□ session_secret 환경변수 (.env.local — 절대 커밋 X)
□ CORS — 프로덕션 도메인만 허용
□ rate limit (express-rate-limit) — Phase 1.5
□ logout 시 idToken revoke
□ 프로필 사진·이메일 노출 정책 (i18n 모달)
□ GDPR / 개인정보 — 한국 출시 우선이지만 표준 준수
```

---

## 5. 비용·확장성 시뮬

| 단계 | 사용자 | Firebase Auth 비용 | DB | CDN |
|---|---|---|---|---|
| 1주차 베타 | 5~10 | 무료 | local MongoDB | Cloudflare free |
| Phase 1 POC (6/23) | ~100 | 무료 | local MongoDB | Cloudflare free |
| Phase 2 출시 | ~10K | 무료 (50K MAU) | local MongoDB 또는 Atlas 선택 검토 | Cloudflare $0 |
| 성숙 | 100K | 무료 | Atlas 사용 시 비용 별도 산정 | Cloudflare Pro $20 |

→ **Auth 자체는 50K MAU 까지 무료**. 출시 1년 안 추가 비용 거의 없음.

---

## 6. PM 결정 사항

- [x] **결정 1**: ✅ **옵션 A** (Firebase Auth + GA4 태그) — PM_결정사항 v1.0 Q1
- [x] **결정 2**: ✅ **POC(6월말)까지 게스트 무한 + Google/Twitter 버튼 placeholder** — PM_결정사항 v1.0 Q2
- [ ] **결정 3**: Apple·Kakao Phase 1.5 시점 명시 (PM 보류 — Q3 호스팅 결정 후)
  - 권장: Phase 1.5-12 (5/22 이후)
- [ ] **결정 4**: 호스팅 — Vercel·Netlify·Cloudflare Pages 또는 네이버 클라우드 (PM_결정사항 Q3 보류)
- [x] **결정 5**: DB — MongoDB local-first, Atlas는 추후 사용 가능성 보류 ✅ 2026-05-29

---

## 7. 의존 문서

- [모듈분리작업계획_v1_260510.md](모듈분리작업계획_v1_260510_260511검수.md) — account 모듈 분리 완료
- [개발계획.md](개발계획_260511검수.md) — 인프라 SoT
- [SETTINGS_안내.md](SETTINGS_안내_260511검수.md) §6 — .env 안내
- [packages/modules/account/](packages/modules/account/) — 코드

---

## Backend/Auth Persistence Update 2026-05-29

- Auth 상태는 account/user repository 경계를 사용한다.
- 기존 전체 user state 동기화 경로(`/api/state`)는 제거됐다.
- 개발 기본 DB는 로컬 MongoDB다. Atlas는 현재 사용하지 않고, 추후 사용할 수도 있는 선택지로만 보류한다. 사용이 확정되면 `MONGO_URI`와 배포 secret 변경으로 처리한다.
- `/api/auth`와 account API는 계정/session 정보의 권위 경로로 유지한다.
- 신규 모듈 지역 상태는 auth document에 추가하지 않는다. 모듈 소유 repository와 API를 사용한다.

## 변경 기록

- **v1.0.3 (2026-05-29)**: Atlas를 확정 전환 대상이 아니라 추후 사용할 수도 있는 선택지로 정리했다. 현재 auth/backend DB 기준은 local MongoDB 우선이다.
- **v1.0.2 (2026-05-29)**: `/api/state` 제거 완료와 account/host/module/customs/action API 기준을 반영했다. `accountBootstrap`, `api.ts`, account manifest의 현재 구현 상태를 체크리스트에 반영했고, Atlas는 local-first 이후 별도 결정 사항으로 정리했다.
- **v1.0.1 (2026-05-24)**: account/user repository 소유권, 로컬 MongoDB 우선 정책, legacy state 호환 경계에 대한 backend/module DB 분리 메모를 추가했다.

- **v1.0.0 (2026-05-11)**: PM 결정 Q1·Q2 락 반영 (PM_결정사항 v1.0). §1 현 상태 갱신 (Firebase 설치·middleware·DUMMY fallback ✅·GA4 ✅). §3 Step 1-3 사전 완료 체크. §6 결정 1·2 ✅·3·4·5 보류.
- **v1.0.1 (2026-05-29)**: Google/Twitter 로그인 skeleton 준비 상태를 반영했다. 기본 UI는 준비중으로 유지하고, 실제 활성화는 Firebase provider 설정과 `VITE_SOCIAL_LOGIN_ENABLED=true` 이후로 둔다.
- **v0.1.0 (2026-05-10)**: 초안. 옵션 A·B·C 비교·구현 4단계·보안 체크·비용 시뮬·PM 결정 5건.
