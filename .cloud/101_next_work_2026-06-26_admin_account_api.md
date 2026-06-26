# 101_next_work_2026-06-26_admin_account_api

## 목적

관리자 계정과 관리자 페이지를 일반 유저 기능과 분리해서 만든다.
관리자는 기존 로그인 세션을 재사용하되, 권한 판정은 별도 `adminUsers` 문서와 `/api/admin/*` 전용 API에서 처리한다.

## 현재 결정

- 일반 유저 로그인과 관리자 로그인은 같은 인증 체계를 사용한다.
- 관리자 여부는 `users` 문서에 직접 섞지 않고 별도 `adminUsers` 컬렉션으로 관리한다.
- 관리자 API는 `/api/admin/*`로 분리한다.
- 모든 관리자 변경 작업은 `adminAuditLogs`에 기록한다.
- 프론트 화면은 먼저 `/admin` 더미 페이지를 만들고, 실제 권한 검사/데이터 연결은 단계적으로 붙인다.

## 1. 관리자 문서 모델 추가

- [x] `AdminUserModel` 추가
- [x] 컬렉션 이름은 `adminUsers`
- [x] 최소 필드
  - `uid: string`
  - `role: 'owner' | 'admin' | 'operator' | 'viewer'`
  - `permissions: string[]`
  - `enabled: boolean`
  - `createdAt: number`
  - `updatedAt: number`

## 2. 관리자 감사 로그 모델 추가

- [x] `AdminAuditLogModel` 추가
- [x] 컬렉션 이름은 `adminAuditLogs`
- [x] 최소 필드
  - `adminUid: string`
  - `action: string`
  - `targetUid?: string`
  - `payloadSummary?: Record<string, unknown>`
  - `ip?: string`
  - `createdAt: number`

## 3. 관리자 repository 작성

- [x] `adminRepository` 경계 작성
- [x] `getAdminUser(uid)`
- [x] `upsertAdminUser(...)`
- [x] `setAdminEnabled(uid, enabled)`
- [x] `writeAdminAuditLog(...)`
- [x] `listAdminAuditLogs(...)`

## 4. admin middleware 작성

- [x] 기존 `authMiddleware` 이후에 동작하도록 구성
- [x] `getRequestUid(req)`로 로그인 uid 확인
- [x] `adminUsers`에서 uid 조회
- [x] `enabled !== true`면 403
- [x] role/permission 검사 helper 작성
- [x] req에 `adminUser` context 주입

## 5. 초기 owner 생성 스크립트

- [x] `tools/admin/createOwner.mjs` 또는 backend script 추가
- [x] 입력값은 uid와 role
- [x] 서버 콘솔에서만 실행
- [x] 일반 클라이언트에서 owner를 만들 수 없게 유지

## 6. 관리자 API 1차

- [x] `GET /api/admin/me`
  - 현재 로그인 uid의 관리자 권한 반환
- [x] `GET /api/admin/users`
  - 유저 목록 조회
  - 페이지네이션은 1차에서는 limit 기반
- [x] `GET /api/admin/users/:uid`
  - 특정 유저 account/host 주요 상태 조회
- [x] 모든 응답은 민감정보를 최소화한다.

## 7. 관리자 API 2차

- [x] `POST /api/admin/users/:uid/resources/grant`
  - coins, diamonds, diceCount 지급/차감
- [x] `POST /api/admin/users/:uid/reset`
  - 테스트 계정 초기화
- [x] `PATCH /api/admin/users/:uid/account`
  - 운영상 필요한 account 필드만 수정
- [x] `PATCH /api/admin/admin-users/:uid`
  - owner/admin 전용 관리자 권한 부여/수정
  - 입력은 role, enabled만 받는다.
  - permissions는 서버의 role preset으로만 계산한다.
  - viewer: 유저 정보, DB 관리 정보 열람
  - operator: 유저 정보, DB 관리 정보 열람/수정, 권한 부여 불가
  - admin: owner와 동일한 권한
  - owner: 모든 정보 열람/수정 및 권한 부여
- [x] 모든 변경 API는 audit log를 남긴다.

## 8. 프론트 관리자 화면 연결

- [x] `/admin` 더미 페이지 추가
- [x] `/api/admin/me`로 관리자 여부 확인
- [x] 권한 없으면 접근 차단
- [x] 유저 조회 테이블 연결
- [x] 유저 상세 패널 연결
- [x] 지급/리셋 액션은 확인 모달을 거치게 구성
- [x] DB 관리 메뉴 자리 추가

## 9. 보안 규칙

- [x] production에서 legacy uid fallback으로 admin API 접근 불가 확인
- [x] CORS/Authorization 헤더 확인
- [x] admin API는 화면 숨김이 아니라 서버 권한 검사로 보호
- [x] admin role 변경/owner 생성은 audit log 필수

## 10. 검증

- [x] 일반 유저는 `/api/admin/me`에서 403 또는 `isAdmin: false`
- [x] owner 계정은 `/api/admin/me`에서 role 반환
- [x] disabled admin은 접근 불가
- [x] resources grant 후 hostStates 변경 확인
- [x] 모든 변경 작업이 `adminAuditLogs`에 남는지 확인

## Change Log

- 2026-06-26: 관리자 권한 부여 방식을 role preset 기반으로 변경. 화면/API에서 permissions 직접 입력을 제거하고, viewer/operator/admin/owner별 고정 permission을 서버가 부여하도록 정리. `/admin`에 DB 관리 빈 메뉴 자리 추가.
- 2026-06-26: 관리자 화면 보강. 유저 조회를 전체 목록이 아니라 검색 결과 화면으로 변경, `/api/admin/users?q=`에서 uid/email/nickname/loginId/displayName 검색 지원.
- 2026-06-26: 10번 진행. Express smoke 테스트로 `/api/admin/me`, disabled admin 차단, owner 통과, resources grant 후 hostStates 변경, `adminAuditLogs` 기록 조회를 검증. `pnpm build`와 `pnpm exec vitest run packages/backend/src/backendPersistence.test.ts` 통과.
- 2026-06-26: 10번 보강. `AdminRepository.listAdminAuditLogs` 추가, 관리자 grant API가 생성한 `users.resources.grant` 감사 로그를 smoke 테스트에서 직접 조회해 확인.
- 2026-06-26: 9번 진행. production legacy uid fallback 차단과 adminUsers 서버 권한 검사를 회귀 테스트로 고정, 콘솔 owner 생성도 `adminAuditLogs`에 `adminUsers.bootstrapOwner`로 기록하도록 보강.
- 2026-06-26: 8번 진행. 프론트 `/admin` 화면을 `/api/admin/me`, 유저 목록/상세/리소스 지급/리셋/account patch/admin 권한 부여 API에 연결하고 권한 없을 때 접근 차단.
- 2026-06-26: 7번 보강. `PATCH /api/admin/admin-users/:uid` 추가, owner 전용으로 일반 유저에게 관리자 role/permission/enabled 부여 가능하게 구성하고 감사 로그 기록.
- 2026-06-26: 7번 진행. 관리자 변경 API 3종 추가. 리소스 지급/차감, 유저 리셋, account patch를 permission별로 보호하고 성공 시 `adminAuditLogs`에 감사 로그 기록.
- 2026-06-26: 6번 진행. `/api/admin/me`, `/api/admin/users`, `/api/admin/users/:uid` 1차 관리자 읽기 API 추가, admin middleware로 보호하고 민감 인증 필드 제외.
- 2026-06-26: 5번 진행. `packages/backend/scripts/create-admin-owner.mjs` 추가, `admin:create-owner` 스크립트로 서버 콘솔에서만 adminUsers owner/upsert 가능하게 구성.
- 2026-06-26: 5번 정리. 콘솔 스크립트는 최초 owner 부트스트랩 전용으로 유지하기로 결정, 일반 관리자 권한 부여는 관리자 API/페이지에서 처리.
- 2026-06-26: 4번 진행. `packages/backend/src/middleware/admin.ts` 추가, adminUsers 기반 관리자 확인/role/permission helper/req.adminUser 주입 구조 작성.
- 2026-06-26: 3번 진행. `adminRepository` 인터페이스와 memory/mongo 구현 추가, repository index에서 Mongo 연결 상태에 따라 admin repository 선택.
- 2026-06-26: 2번 진행. `packages/backend/src/models/AdminAuditLogModel.ts` 추가, `adminAuditLogs` 컬렉션과 adminUid/action/targetUid/payloadSummary/ip/createdAt 필드 정의.
- 2026-06-26: 1번 진행. `packages/backend/src/models/AdminUserModel.ts` 추가, `adminUsers` 컬렉션과 role/permission/enabled 필드 정의.
- 2026-06-26: 관리자 계정/권한/API/감사 로그 작업 계획 작성. `/admin` 더미 페이지 추가 항목 포함.
