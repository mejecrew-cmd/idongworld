# 96. 2인 작업 분담 규칙

## 1. 문서 목적

이 문서는 현재 프로젝트를 2명이 동시에 작업할 때의 담당 범위와 충돌 방지 규칙을 정리한다.

앞으로 Codex 또는 개발자가 작업을 시작할 때는 이 문서를 먼저 확인하고, 본인 담당 범위를 벗어나는 파일은 직접 수정하지 않는 것을 원칙으로 한다.

## 2. 현재 역할 분담

### 개발자 A: 화면 목업 및 프론트 화면 담당

개발자 A는 화면을 사용자에게 보이는 형태로 구성하는 일을 담당한다.

주 담당 범위:

- `packages/frontend/src/screens/**/*.tsx`
- 화면 배치
- 화면 문구
- 버튼 위치
- 모달 구성
- 목업 수준의 화면 흐름
- 표면 UX
- 임시 표시 데이터
- 화면별 시각 구성

개발자 A는 화면을 “기획상 어떻게 보여야 하는가”에 맞추어 구현한다.

단, 개발자 A가 backend 권위 상태, DB schema, repository, service rule을 직접 바꾸면 안 된다. 화면 구현 중 필요한 데이터가 없으면 API 계약 요청으로 남긴다.

### 개발자 B: 자원 관리, DB, API 담당

개발자 B는 실제 게임 상태의 권위와 저장, API 계약을 담당한다.

주 담당 범위:

- `packages/backend/src/models/**`
- `packages/backend/src/repositories/**`
- `packages/backend/src/modules/**`
- `packages/backend/src/routes/**`
- `packages/backend/src/db/**`
- `packages/frontend/src/lib/api.ts`
- `packages/frontend/src/lib/*Sync*`
- `packages/frontend/src/lib/storeFacades.ts`
- 자원 이동 규칙
- DB document 분리
- MongoDB 연결 및 전환 준비
- backend service validation
- module별 API 노출
- Action API 응답 shape
- cross-tab sync 같은 상태 동기화 기반
- 개발/검증용 backend debug API

개발자 B는 화면 자체를 꾸미거나 목업을 크게 바꾸지 않는다. 화면 파일을 수정해야 할 때는 API 연동을 위한 최소 변경만 허용한다.

## 3. 화면 파일 수정 원칙

`packages/frontend/src/screens/**/*.tsx`는 개발자 A의 기본 작업 구역이다.

개발자 B 또는 Codex가 화면 파일을 수정할 수 있는 경우는 다음으로 제한한다.

- API 호출 이름이 바뀌어 컴파일이 깨졌을 때
- backend 응답 shape 변경으로 타입 연결이 필요한 때
- 화면이 잘못된 권위 상태를 직접 쓰고 있어 데이터 경계를 깨는 때
- session/localStorage/DB 권위 분리 원칙을 위반하는 버그가 있는 때
- 다른 방법이 없고 변경 범위가 매우 작은 때

이 경우에도 스타일, 레이아웃, 문구, 목업 흐름은 가급적 건드리지 않는다.

## 4. API 계약 우선 규칙

화면에서 필요한 데이터가 생기면 먼저 API 계약을 정의한다.

권장 순서:

1. 화면이 필요한 데이터 목록을 정리한다.
2. 해당 데이터의 권위 소유자를 정한다.
3. backend model 또는 repository에 저장할지 판단한다.
4. module service에서 validation과 business rule을 구현한다.
5. route를 통해 API를 노출한다.
6. `packages/frontend/src/lib/api.ts`에 typed client를 추가한다.
7. 화면 담당자가 API client를 호출해 목업 화면에 연결한다.

화면이 임시로 local state에 저장해도 되는 정보와 DB에 저장해야 하는 정보는 반드시 구분한다.

로그인 화면의 소셜 provider 버튼도 같은 원칙을 따른다.

- 화면 담당자는 provider 버튼 목록을 직접 확정하지 않는다.
- API 담당자는 `GET /api/auth/social/providers`와 `api.getSocialProviders()`를 제공한다.
- 화면 담당자는 `enabled` provider만 실제 로그인 가능 버튼으로 처리한다.
- `planned` provider는 준비 중 표시 또는 비활성 버튼으로 처리한다.
- provider token 검증, 계정 생성, 기존 계정 판정은 backend/API 담당 범위다.

회원가입 닉네임 검증도 같은 원칙을 따른다.

- 화면 담당자는 8자 제한, 금칙어, 중복 검사 정책을 화면 안에 재구현하지 않는다.
- API 담당자는 `POST /api/account/nickname/check`, `POST /api/account/signup/profile`, `api.checkNickname()`, `api.completeSignupProfile()`을 제공한다.
- 화면 담당자는 입력 UI와 오류 표시를 만들고, 실제 사용 가능 여부와 저장은 API 응답을 따른다.
- 닉네임 저장 후 다음 단계 판단은 `nextStep`을 기준으로 처리한다.

가입 시간대 설정도 같은 원칙을 따른다.

- 화면 담당자는 현재 감지 시간대 표시, 검색 UI, 선택 리스트를 만든다.
- API 담당자는 `POST /api/account/preferences/timezone`과 `api.saveAccountTimeZone()`을 제공한다.
- IANA timezone 최종 유효성 검증과 `timezoneCompleted` 저장은 backend/API 담당 범위다.
- 시간대 저장 후 다음 단계 판단은 `nextStep`을 기준으로 처리한다.

약관 동의도 같은 원칙을 따른다.

- 화면 담당자는 전체 동의/필수/선택 체크 UI와 약관 보기 UI를 만든다.
- API 담당자는 `GET /api/account/terms/current`, `POST /api/account/terms/agree`, `api.getCurrentTerms()`, `api.agreeTerms()`를 제공한다.
- 필수 약관 버전 검증, age-gate 검증, 선택 약관 `false` 저장은 backend/API 담당 범위다.
- 약관 저장 후 다음 단계 판단은 `nextStep`을 기준으로 처리한다.

## 5. 권위 상태 기준

현재 프로젝트의 권위 상태 기준은 다음과 같다.

- 계정 정보: account/user repository
- 전역 자원: hostStates
- Aidong 영입, 욕구, 착용: myAidongStates
- 마이섬 구역: myIslandStates
- 숙소 인벤토리, 방, 가구: lodgeStates
- 배 종류, 배 인벤토리, 선실/갑판 배치, 선실 가구: shipStates
- 항로 결과, landing clear 이력: routeNeighborStates
- 항해 중 현재 위치, 진행 중 여부: DB가 아니라 브라우저 session state
- 화면 모달 열림 여부, 선택 탭: frontend local state

특히 항해 중/항구 정박 중 여부는 DB가 알면 안 된다. 항해 세션은 탭/창별로 독립적이어야 한다.

## 6. 자원 및 인벤토리 규칙

자원과 아이템은 소유 모듈을 명확히 둔다.

- 전역 아이템과 Aidong 소지 아이템: host inventory
- 숙소 전용 아이템: lodge inventory
- 배 전용 적재물: ship inventory
- 특정 구역 전용 자원: 해당 zone module state
- 도착섬 전용 자원/아이템: destination 또는 aidong island module state

다른 모듈 상태를 직접 수정하지 않는다.

모듈 간 자원 이동이 필요하면 service/API에서 명시적으로 처리한다. customs UI는 강제하지 않지만, 자원 이동의 backend 권위와 audit 가능성은 유지한다.

## 7. DB 및 API 작업 규칙

DB/API 담당자는 다음을 지킨다.

- 새 영속 상태는 먼저 model/spec/default/repository를 맞춘다.
- Mongo와 memory repository가 같은 인터페이스로 동작해야 한다.
- module default는 `moduleDefaults.ts`와 실제 model schema가 맞아야 한다.
- API route는 uid를 request body가 아니라 auth middleware 결과에서 얻는다.
- service에서 validation을 수행하고 route는 payload parsing과 response에 집중한다.
- frontend가 쓸 API는 `api.ts`에 typed client를 추가한다.
- action response는 필요한 경우 `applyActionApiResponse`와 cross-tab sync 대상인지 검토한다.

## 8. 화면 담당자와 API 담당자의 전달 방식

화면 담당자가 필요한 것을 요청할 때는 다음 형식이 좋다.

```md
필요 화면: 항구 화면
필요 데이터: 현재 배 종류, 선실 수, 갑판 수, 배 인벤토리, 배치된 아이동 목록
필요 액션: 배 변경, 선실 배치, 갑판 배치, 배 인벤토리 조회
임시 목업 가능 여부: 가능
권위 저장 필요 여부: 필요
```

API 담당자가 완료 후 전달할 때는 다음 형식이 좋다.

```md
추가 API:
- GET /api/modules/ship/state
- POST /api/modules/ship/type/change
- POST /api/modules/ship/cabins/assign

frontend client:
- api.getModuleState(uid, 'ship')
- api.changeShipType(uid, shipTypeId)
- api.assignShipCabin(uid, slotId, characterId)

주의:
- 항해 중 여부는 DB 응답에 포함하지 않음
- 화면에서는 session state로 항해 중 상태 판단
```

## 9. 충돌 방지 규칙

두 사람이 같은 파일을 만질 가능성이 있으면 먼저 담당을 나눈다.

특히 다음 파일은 충돌 위험이 높다.

- `packages/frontend/src/screens/HarborScene.tsx`
- `packages/frontend/src/screens/NavigationBoardScene.tsx`
- `packages/frontend/src/screens/LodgeScene.tsx`
- `packages/frontend/src/screens/HubHeartScene.tsx`
- `packages/frontend/src/lib/api.ts`
- `packages/frontend/src/lib/storeFacades.ts`
- `packages/backend/src/modules/*/service.ts`
- `packages/backend/src/modules/*/routes.ts`

화면 파일은 개발자 A 우선, API/lib/backend 파일은 개발자 B 우선이다.

## 10. Codex 작업 규칙

Codex는 앞으로 다음 기준으로 작업한다.

- 사용자가 별도로 요청하지 않으면 개발자 B 범위의 작업을 우선 수행한다.
- screen tsx 파일은 가능한 한 직접 수정하지 않는다.
- screen tsx 수정이 필요하면 “API 연결을 위한 최소 수정”인지 먼저 판단한다.
- 화면 디자인, 목업, 버튼 배치, 문구 수정은 개발자 A 작업으로 남긴다.
- 문서 작업은 `.cloud`에 한글 UTF-8로 작성한다.
- 작업 후 typecheck 또는 관련 테스트를 실행한다.
- 한글 문서나 한글 UI 문구를 수정하면 깨짐 문자 검사를 수행한다.

## 11. 현재 우선순위

현재 2인 분업 기준의 우선순위는 다음과 같다.

1. 개발자 A는 화면 목업 완성도를 올린다.
2. 개발자 B는 화면이 안정적으로 호출할 backend/API 계약을 정리한다.
3. DB 권위와 session 권위를 섞지 않는다.
4. 자원/아이템 이동은 backend service가 책임진다.
5. 화면은 가능한 한 API 결과를 보여주는 쪽에 집중한다.

## 12. 변경 이력

- 2026-06-15: 2인 작업 분담 기준 수립. 화면 목업 담당과 자원/DB/API 담당의 경계를 명문화했다.
