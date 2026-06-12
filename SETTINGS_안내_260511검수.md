---
version: v0.1.0
last_updated: 2026-05-10
status: 활성
type: 설정 파일 가이드
reviewed_at: 2026-05-11

---

# 설정 파일 안내 (JSON·yaml·rc)

> JSON·YAML 등은 표준상 주석을 못 넣음.
> 본 문서가 각 설정 파일의 역할·연결을 대신 설명.

---

## 0. 파일 분류

```
v1_260509/
├─ package.json          (root)        ← 모노레포 root + 통합 dev 명령
├─ pnpm-workspace.yaml   (root)        ← workspace 패키지 위치 지정
├─ pnpm-lock.yaml        (root)        ← 의존성 정확한 버전 잠금 (자동 생성)
├─ .gitignore            (root)        ← git 제외 패턴
├─ .npmrc                (root)        ← pnpm 옵션
├─ .nvmrc                (root)        ← Node 버전 (20)
└─ packages/
   ├─ frontend/
   │  ├─ package.json     ← frontend 의존성
   │  └─ tsconfig.json    ← TypeScript strict + bundler 모드
   └─ backend/
      ├─ package.json     ← backend 의존성 + "type": "module"
      └─ tsconfig.json    ← Node 호환 ESM
```

---

## 1. Root 파일

### `package.json`
```json
{
  "name": "idongworld-monorepo",
  "scripts": {
    "dev": "concurrently ...",   ← FE+BE 동시 실행
    "dev:fe": "...",              ← Frontend만
    "dev:be": "...",              ← Backend만
    "build": "pnpm -r build",     ← 전체 빌드
    "typecheck": "pnpm -r ..."    ← 전체 타입 검사
  },
  "devDependencies": {
    "concurrently": "...",         ← 두 프로세스 동시 실행
    "typescript": "5.x"            ← 모노레포 공통 TS
  }
}
```

### `pnpm-workspace.yaml`
```yaml
packages:
  - 'packages/*'   ← 이 패턴에 매칭되는 폴더가 workspace
```

### `pnpm-lock.yaml` (자동)
- pnpm install 시 자동 생성
- 정확한 의존성 버전 잠금 (재현 가능 빌드)
- ❌ 직접 편집 X (커밋만)

### `.gitignore`
```
node_modules/   ← 의존성 폴더 (git 제외)
dist/            ← 빌드 산출물
.vite/           ← Vite 캐시
.turbo/          ← (사용 시) Turbo 캐시
*.log            ← 로그 파일
.env.local       ← 로컬 환경변수
```

### `.npmrc`
```
auto-install-peers=true   ← peerDependency 자동 설치
shamefully-hoist=false    ← 엄격한 의존성 격리
```

### `.nvmrc`
```
20   ← Node 20.x LTS 사용
```
→ `nvm use` 시 자동으로 Node 20 활성화.

---

## 2. Frontend 설정

### `packages/frontend/package.json`
주요 의존성:
- **react 18 / react-dom**
- **react-router-dom 6**: 라우팅
- **zustand**: 상태 관리 (lightweight Redux 대안)
- **@mui/material**: UI 컴포넌트
- **@emotion/react·styled**: MUI 스타일링
- **i18next + react-i18next + http-backend**: 다국어
- **dayjs**: 시간
- **howler**: 사운드 (Phase 1.5 활성)
- **vite 5**: 빌드 도구

스크립트:
- `dev`: `vite` (개발 서버)
- `build`: `tsc -b && vite build` (TS 검사 + 프로덕션 빌드)
- `preview`: `vite preview` (빌드 결과 로컬 미리보기)
- `typecheck`: `tsc -b --noEmit`

### `packages/frontend/tsconfig.json`
주요 옵션:
- `target: ES2022` — 최신 JS 출력
- `module: ESNext` + `moduleResolution: bundler` — Vite 호환
- `jsx: react-jsx` — React 17+ 자동 JSX
- `strict: true` — 모든 strict 옵션 ON
- `noUnusedLocals/Parameters: true` — 미사용 변수 에러
- `paths: { "@/*": ["src/*"] }` — `@/components/HUD` import 가능

---

## 3. Backend 설정

### `packages/backend/package.json`
- `"type": "module"` — Native ESM (`.js` 확장자 import 필수)
- 의존성: **express 4 / cors / dotenv**
- devDeps: **tsx** (TS 실시간 실행), **@types/***

스크립트:
- `dev`: `tsx watch src/index.ts` (TS 변경 시 자동 재시작)
- `build`: `tsc` (dist 생성)
- `start`: `node dist/index.js` (프로덕션)
- `typecheck`: `tsc --noEmit`

### `packages/backend/tsconfig.json`
- `target: ES2022` + `module: ESNext` + `moduleResolution: bundler`
- `outDir: dist`
- `strict: true`
- `esModuleInterop: true` — CommonJS 패키지 호환

---

## 4. 자주 쓰는 명령어 cheat sheet

```bash
# 의존성 설치 (root에서 실행 — 모든 workspace 함께)
pnpm install

# 새 패키지 추가
pnpm --filter frontend add zustand          # frontend에만
pnpm --filter backend add express-session   # backend에만
pnpm add -D -w typescript                   # root devDep

# 동시 실행
pnpm dev   # FE 5173 + BE 4000

# 개별 실행
pnpm dev:fe
pnpm dev:be

# 타입 검사 (전체)
pnpm typecheck

# 빌드 (전체)
pnpm build

# Node 버전 자동 활성화
nvm use   # .nvmrc 기반
```

---

## 5. Drive 동기화 제외 (필수)

Mac Google Drive 클라이언트에서 다음 폴더는 동기화 제외:
- `node_modules/` (모든 위치)
- `dist/`
- `.vite/`
- `.turbo/`
- `pnpm-lock.yaml` (선택)

**제외 안 하면**: Drive 클라이언트 OOM·CPU 100%·동기화 충돌.

**Mac Drive 제외 방법**:
- Finder → 폴더 우클릭 → "오프라인에서 사용 가능" 끄기
- 또는 `.driveignore` 파일 (지원 시점)

---

## 6. .env (✅ 2026-05-10 활성)

**`.env.example` 양 패키지 셋업 완료** (Firebase Auth Step 1-3 사전 완료·GA4). 실키 미입력 시 DUMMY fallback으로 동작.

```bash
# packages/frontend/.env.example (✅ 실재)
VITE_API_URL=http://localhost:4000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX   # PM_결정 Q1: GA4 채택

# packages/backend/.env.example (✅ 실재)
PORT=4000
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
SESSION_SECRET=...
# MONGO_URI 보류 (PM_결정 Q3 호스팅·DB 미결정)
```

**활성 흐름**:
- 실키 입력 없으면 DUMMY 가드 fallback (게스트 로그인·로컬 sync 동작)
- 실키 입력 시 자동 활성 (firebase·firebase-admin·middleware/auth)
- 5/12 화 잔여: Firebase 콘솔 프로젝트 생성·실키 입력 → Google 로그인 활성

---

## 7. 의존 문서

- [개발계획.md](개발계획_260511검수.md) — 코드 빌드 SoT
- [README.md](README_260511검수.md) — 빠른 시작 가이드
- [데이터연결_다이어그램.md](데이터연결_다이어그램_260511검수.md) — 데이터 흐름
- [재점검_260510.md](재점검_260510_260511검수.md) — 전체 재점검

---

## Changelog

- **v0.1.0 (2026-05-10)**: 초안. 11 설정 파일의 역할·연결·사용법 정리.
