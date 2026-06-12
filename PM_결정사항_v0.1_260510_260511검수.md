---
version: v1.0.0
last_updated: 2026-05-10
status: PM 답변 일부 락 — Q1·Q2 결정 / Q3·Q4·Q5 보류
type: PM 결정 필요 통합 SoT
reviewed_at: 2026-05-11

---

# 🎯 PM 결정사항 v1.0

## 🔒 PM 답변 (2026-05-10)

### 락 (코드 반영 완료)
- **Q1**: ✅ Firebase Auth + **GA4 태그** 추가 채택
- **Q2**: ✅ POC (6월말) 까지 게스트 무한 입장. Google·Twitter 소셜 로그인 버튼 **있되 작동 X (placeholder)**

### 보류 (다음주 결정)
- **Q3**: 호스팅·DB·CDN — 네이버 클라우드 가능성. 웹브라우저 SPA 호환 구조 유지.
- **Q4**: 디자이너 발주 일정·단위 — 다음주
- **Q5**: 작가 의뢰 트라이얼 — 다음주

### 코드 반영 (Q1·Q2)
- ✅ `lib/analytics.ts` — GA4 gtag.js 통합 (env 활성 시)
- ✅ `.env.example` — `VITE_GA4_MEASUREMENT_ID` 추가
- ✅ `lib/usePageTracking.ts` — SPA page view 자동 추적
- ✅ `App.tsx` — usePageTracking 마운트
- ✅ `main.tsx` — bootstrapAnalytics 부팅
- ✅ `LoginScreen.tsx` — 게스트 + Google/Twitter placeholder + trackEvent('login')

---

# 🎯 PM 결정사항 v0.1 (원본)

> 모듈 분리 14건 + 데이터 파이프라인 사전 완료 후 발생한 **결정 필요 항목 통합**.
> 각 항목에 권장안·근거·영향·시급도 명시. PM 답변 시 v1.0 락 + 관련 문서 갱신.

---

## 0. 30초 요약

```
🔴 P0 (1주차 발사 5/11~17 안에 답 필요): 5건
🟡 P1 (Phase 1.5 5/18~31): 5건
🟢 P2 (Phase 2 6/1+): 3건

총 13건 — 답변 시간: 30분 미만 권장
```

---

## 1. 🔴 P0 — 1주차 안에 답 필요 (5건)

### Q1. Auth 옵션 (옵션 A·B·C)
**문서**: [Auth_정책_초안_v0.1_260510.md](Auth_정책_초안_v0.1_260510_260511검수.md) §6
- **권장**: 옵션 A (Firebase Auth + 게스트 + Google)
- **근거**: 50K MAU 까지 무료·구현 1시간·계정 연결 표준
- **영향**: 5/12~14 backend Auth 작업 진행 가능
- **시급도**: 🔴 5/12 화요일 작업 시작 직전

### Q2. 1주차 게스트 only vs Google 동시 활성
- **권장**: **게스트만** (5/14 마감) → Google 5/15·16 추가
- **근거**: 1주차 베타 5~10명 — 익명만으로 충분. Google OAuth 콘솔 셋업 + 도메인 검증 시간 절약
- **영향**: 1주차 발사 일정 안정화
- **시급도**: 🔴 Q1 답변과 함께

### Q3. 호스팅·DB·CDN 결정
- **권장**:
  - 호스팅: **Vercel** (Next 외 SPA 무료·Cloudflare DNS 자동)
  - DB: **MongoDB local-first, 이후 Atlas 전환** (로컬 개발 안정화 후 `MONGO_URI` 교체)
  - CDN: **Cloudflare** (자산 protected stream Phase 1.5+)
- **근거**: 무료 tier·셋업 30분·커뮤니티 풍부
- **영향**: 5/11 월요일 인프라 셋업 가능
- **시급도**: 🔴 5/11 월요일

### Q4. R08 디자이너 1차 발주 (본진 5명 PNG)
- **현황**: R08 발주서 v0.1 작성됨
- **결정 필요**:
  - 발주 일정 (목 5/14 vs 금 5/15)
  - 발주 단위 (5명 일괄 vs 황금멍 1명 우선 → 검수 → 4명)
  - 디자이너 인력 (외주 1인 vs 2~3인 분담)
- **권장**: 5/14 목 발주 + 황금멍 1명 우선 (5/16 도착·1주차 검증) + 4명 5/24 도착 (Week 2)
- **시급도**: 🔴 5/13~14

### Q5. 작가 의뢰 트라이얼 — 일기 day3·4·5 (황금멍)
- **현황**: 작가 SoT (지침서·작성테이블·빈 템플릿) 갖춰짐. day1·2·3 PM 데모 작성됨.
- **결정 필요**:
  - 작가 인력 (외주 1인 vs Twin only)
  - 트라이얼 분량 (day4·5 2편 vs day4~10 7편)
  - 일정 (5/15 의뢰 → 5/17 회신)
- **권장**: 외주 1인 + day4·5 2편 트라이얼 → voice·게이트 검증 후 day6+ 확장
- **시급도**: 🔴 5/14~15

---

## 2. 🟡 P1 — Phase 1.5 (5/18~31) 결정 (5건)

### Q6. zone unlock_condition DSL 실 매핑
**문서**: [my-island/balance.csv](packages/modules/my-island/balance.csv) + [zone-*/balance.csv](packages/modules/zone-garden/balance.csv)
- **현재 더미**: garden=always / oasis=prev_zone_clear:garden / memory=tutorial_complete / mine=recruited_count_ge:3
- **결정 필요**: PM 정의 — 실 게임 진행 페이스에 맞는 unlock_condition
  - 5/24 MVP 빌드: 어떤 zone 까지 노출?
  - 6/23 POC: 4 zone 모두 노출?
  - 시즌 zone (15구역 중 잔여 11): 어떤 시즌 트리거?
- **권장**: 1주차 발사 후 PM·디자이너·QA 합의 (5/20 회의)
- **시급도**: 🟡 Phase 1.5 시작 전

### Q7. host MaterialId 카탈로그 확장
**문서**: [host/types.ts](packages/modules/host/src/types.ts)
- **현재**: 7종 (basic_food·rest_token·memory_piece·ore·basic_water·basic_wood·flower)
- **신규 자원** (route-neighbor·zone-oasis 추가): acorn·deck-cargo·rest_token·energy_orb·...
- **결정 필요**:
  - 모듈 로컬 자원을 host inventory 에 통합 vs 모듈별 store 분리?
- **권장**: **모듈별 store 분리** — 모듈 자원은 모듈 안에서. host 는 글로벌 재화만 (coins·gems·diamonds·dice·기본 자재 7종)
- **시급도**: 🟡 zone 미니게임 풀 활성 전

### Q8. 일기 100편 작가 인력 분담
**문서**: [툴 리스트 §2.1.4](툴%20리스트_v1_260510_260511검수.md)
- **목표**: 5명 × 20일 = 100편 (~7/31)
- **결정 필요**:
  - 작가 1인 100편 vs 2~3인 분담?
  - Twin 자동 비율 (PM 검토 필수 5분 vs 30분)?
  - 페이스 (주 10편 vs 주 20편)?
- **권장**: 작가 2인 (각 50편) + Twin 80% + PM voice 검수 5분/편 → 주 20편 페이스
- **시급도**: 🟡 5/24 MVP 마감 (5명 × day1~5 = 25편) 직후 결정

### Q9. cutscene-runner 시범 wiring 본격 활성
**문서**: [cutsceneBootstrap.ts](packages/frontend/src/lib/cutsceneBootstrap.ts)
- **현재**: 시범 callSiteId 1개만 (`demo:after-recruit:황금멍`) — 실 화면 wiring 없음
- **결정 필요**:
  - FirstMeetingScreen stage 'settle' 을 callSiteId 'after-recruit' 로 wiring?
  - island-first-visit 환영 컷 작가 의뢰 시점?
  - 시즌 컷신 호출 지점 표준?
- **권장**: Phase 1.5 (5/22+) cutscene 콘텐츠 추가 시 wiring
- **시급도**: 🟡 시즌 콘텐츠 도입 시점

### Q10. balance.csv 코드 로딩 활성
- **현재 (2026-05-11 갱신)**: ✅ **Vite `?raw` + `createBalance()` helper 부분 구현** — host·my-aidong·gacha·my-island balance.ts에서 런타임 로드 활성. 통합 빌드 도구(`tools/balance/buildJson.ts`)는 Phase 1.5+.
- **결정 필요 (잔여)**:
  - 통합 JSON 변환 도구 도입 시점 (Phase 1.5 vs Phase 2)?
  - QA 가 PM 외 직접 편집 가능?
- **권장**: 현 런타임 로드 유지 → Phase 1.5 통합 JSON 변환 + TS 타입 자동 생성 도구 추가
- **시급도**: 🟡 Phase 1.5 모듈 설정 통합 시

---

## 3. 🟢 P2 — Phase 2 (6/1+) 결정 (3건)

### Q11. shared-data 자동 동기화 도구
- **현재**: characters.csv ↔ json 수동 mirror (PM 양쪽 편집)
- **결정 필요**: `tools/shared-data/sync.ts` 자동 빌드 도구 도입?
- **권장**: Phase 2 (모듈 ≥20 시점) 도입
- **시급도**: 🟢

### Q12. 자산 protected 노출 보호 활성
**문서**: [resources/README.md](resources/README_260511검수.md)
- **현재**: 모든 자산 public (1주차 단순화)
- **결정 필요**: backend `/api/resources/protected/` stream + Firebase Auth 검증 활성 시점
- **권장**: Phase 2 — 디자이너 발주 자산 도착 + Firebase Auth 활성 후
- **시급도**: 🟢

### Q13. Phase 2 비주얼 정책 (Rive 도입)
**문서**: [모듈/캐릭터비주얼시스템.md](기획/모듈/캐릭터비주얼시스템.md)
- **현재**: Phase 1 PNG 5표정 — 정책 락
- **결정 필요**: Phase 2 Rive 도입 시점·디자이너 학습·예산
- **권장**: 6/23 POC 출시 후 평가 — 베타 피드백 기반
- **시급도**: 🟢

---

## 4. 답변 형식 (예시)

PM 이 본 문서에 답변하실 때 권장 형식:

```markdown
## PM 답변 (2026-05-13)

Q1: 옵션 A
Q2: 게스트만 (Google 5/15+)
Q3: Vercel + Atlas + Cloudflare
Q4: 5/14 목 발주 / 황금멍 1명 우선 / 외주 1인
Q5: 외주 1인 / day4·5 2편
Q6: PM·디자이너 5/20 회의
Q7: 모듈별 store 분리
Q8: 작가 2인 / Twin 80% / 주 20편
Q9: 5/22+ wiring
Q10: 빌드 시점 JSON 변환
Q11: Phase 2
Q12: Phase 2
Q13: 6/23 후 평가
```

→ 답변 받으면 본 문서 v1.0 락 + 관련 SoT 문서 일괄 갱신.

---

## 5. 의존 문서

- [Auth_정책_초안_v0.1_260510.md](Auth_정책_초안_v0.1_260510_260511검수.md) — Q1·Q2 상세
- [모듈분리작업계획_v1_260510.md](모듈분리작업계획_v1_260510_260511검수.md) — 모듈 헌법 v1.9
- [툴 리스트_v1_260510.md](툴%20리스트_v1_260510_260511검수.md) — Q5·Q8 작가 정책
- [데이터수신_사양_v1_260510.md](데이터수신_사양_v1_260510_260511검수.md) — Q4 디자이너 자산 수신
- [중간작업검수절차.md](중간작업검수절차_260511검수.md) — 검수 게이트 SoT
- [1주차_일정차트.md v0.5](../../기획/주간일정차트/1주차_일정차트_260511검수.md) — 1주차 실 일정

---

## Backend/DB Decision Update 2026-05-29

- Q3 DB 방향은 MongoDB로 확정하되, 개발은 로컬 MongoDB 우선으로 진행한다. Atlas 사용 여부는 아직 미정이며, 실제 전환은 credential과 배포 환경 결정 뒤에 진행한다.
- Q7 모듈 자원 방향은 모듈 소유 저장소와 host 소유 전역 자원으로 나눈다. 모듈 간 자원 이동은 반드시 세관(customs)을 통과한다.
- 백엔드는 당분간 하나의 서버를 유지한다. 대신 route, service, repository, model은 도메인과 모듈 소유권 기준으로 분리한다.
- 모듈 API는 모듈 지역 상태를 소유해야 한다. 기존 전체 user state 동기화 경로(`/api/state`)는 제거됐으며, 신규 모듈 동작은 account, host, module, customs, 명시적 action API에 추가한다.

## 변경 기록

- **v1.0.2 (2026-05-29)**: `/api/state` 제거 완료와 Atlas 보류 상태를 반영했다. Q7 모듈 자원 분리는 모듈 전용 저장소/API와 customs 경계 기준으로 유지한다.
- **v1.0.1 (2026-05-24)**: 백엔드/DB 구현 방향을 반영했다. 로컬 MongoDB 우선, 이후 Atlas 전환, 모듈 소유 저장소/API, 세관을 통한 모듈 간 자원 이동 경계를 명시했다.

- **v0.1.0 (2026-05-10)**: 초안. P0 5건·P1 5건·P2 3건 = 13 결정 필요 사항 통합. 권장안·근거·영향·시급도 표시. PM 답변 형식 예시.
