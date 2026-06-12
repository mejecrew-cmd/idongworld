# 기획 입력 템플릿 2026-06-08

이 문서는 2026-06-08 기획 변경 이후 실제 기획 내용을 개발 가능한 단위로 받기 위한 입력 템플릿이다.

목표는 회의나 구두 설명을 바로 구현하지 않고, 먼저 아래 항목을 채운 뒤 backend schema, frontend screen, catalog CSV, smoke test로 나누어 반영하는 것이다.

## 0. 작성 원칙

- 기획자는 확정/보류/미결을 구분해서 적는다.
- 수치가 임시라면 `임시`라고 표시한다.
- 이름, item id, character id, zone id는 가능하면 영문 kebab-case로 함께 적는다.
- 개발자는 이 문서를 보고 schema, API, CSV, UI 작업으로 분해한다.
- 세관 강제 UX는 기본 기획 항목으로 넣지 않는다. 실제 cross-module debit/credit이 필요한 경우에만 별도 기술 검토로 둔다.
- 모듈화, backend route/service/repository/model 경계는 유지한다.

## 1. 기획 단위 기본 정보

| 항목 | 내용 |
|---|---|
| 기획명 |  |
| 작성일 |  |
| 작성자 |  |
| 관련 Aidong |  |
| 관련 모듈 |  |
| 상태 | 확정 / 임시 / 보류 / 미결 |
| 목표 플레이 감정 |  |
| 1차 구현 범위 |  |
| 제외 범위 |  |

## 2. Core Loop 연결

이 기획이 어느 core loop 단계에 속하는지 체크한다.

- [ ] 항해에서 발견한다.
- [ ] Aidong을 만난다.
- [ ] 숙소에 합류한다.
- [ ] 메인 화면에 가변 구역이 추가된다.
- [ ] 숙소에서 케어/연습/꾸미기를 한다.
- [ ] 구역에 Aidong을 배치해 자동 생산한다.
- [ ] 도감 아이템을 얻는다.
- [ ] 도감 아이템을 소비해 업그레이드한다.
- [ ] 배 적재량이 차서 입항/비우기를 한다.
- [ ] 기타:

## 3. Aidong 만남 기획

항해 중 Aidong encounter가 필요한 경우 작성한다.

| 항목 | 내용 |
|---|---|
| characterId |  |
| 표시 이름 |  |
| 등장 조건 |  |
| 등장 확률 |  |
| 초기 등장 풀 포함 여부 | 예 / 아니오 |
| 중복 등장 가능 여부 | 예 / 아니오 |
| 만남 장소/route |  |
| 첫 만남 스토리 1컷 요약 |  |
| 수락 버튼 문구 |  |
| 거절/보류 가능 여부 |  |
| 수락 시 숙소 합류 여부 | 예 / 아니오 |
| 수락 시 메인 구역 추가 여부 | 예 / 아니오 |

필요한 상태 전이:

```txt
route encounter 발생
  -> my-aidong 영입
  -> lodge 합류 또는 마당 표시
  -> my-island 가변 구역 추가
  -> route landing 처리 완료
```

미결:

- 

## 4. 메인 가변 구역 기획

Aidong을 만나면 메인 화면에 붙는 구역을 정의한다.

| 항목 | 내용 |
|---|---|
| zoneId |  |
| 연결 characterId |  |
| 구역 이름 |  |
| 구역 한 줄 설명 |  |
| 화면 아이콘/대표 이미지 |  |
| 기본 해금 조건 |  |
| 이별하기 시 처리 | 숨김 / 제거 / 생산 중지 / 미결 |
| 구역 최대 표시 수 |  |
| 정렬 기준 | 영입순 / 즐겨찾기 / 타입별 / 미결 |

구역에서 가능한 행동:

- [ ] 방문
- [ ] 미니게임
- [ ] Aidong 배치
- [ ] 자동 생산 회수
- [ ] 꾸미기
- [ ] 도감 아이템 확인
- [ ] 기타:

## 5. 숙소 육성 기획

숙소에서 가능한 액션과 제한을 정의한다.

| 항목 | 내용 |
|---|---|
| 방 수 기본값 |  |
| 방 수 확장 조건 |  |
| 마당 표시 방식 |  |
| 적극 육성 가능 Aidong 수 |  |
| 항해 중 Aidong 처리 |  |
| 구역 배치 중 Aidong 처리 |  |
| 항구 지원 중 Aidong 처리 |  |

케어 액션:

| actionId | 표시 이름 | 비용 | 효과 | 쿨다운 | 비고 |
|---|---|---:|---|---|---|
|  |  |  |  |  |  |

연습 액션:

| practiceId | 표시 이름 | 비용 | 요구 조건 | 보상/효과 | 비고 |
|---|---|---:|---|---|---|
|  |  |  |  |  |  |

꾸미기:

| decorId | 표시 이름 | 비용 | 배치 위치 | 기본 보유 | 비고 |
|---|---|---:|---|---:|---|
|  |  |  |  |  |  |

## 6. 아이동별 도감 아이템 25종

Aidong 귀속 도감 아이템을 정의한다.

| itemId | 표시 이름 | 등급 | 획득처 | 기본 획득량 | 업그레이드 사용처 | 설명 |
|---|---|---|---|---:|---|---|
|  |  | common |  |  |  |  |
|  |  | common |  |  |  |  |
|  |  | common |  |  |  |  |

작성 규칙:

- 총 25종을 목표로 한다.
- 같은 Aidong의 도감 아이템은 해당 Aidong 귀속 원장에 저장한다.
- 일반 통 인벤토리 아이템과 섞지 않는다.
- 획득처가 미정이면 `미정`으로 적되, 임시 보상 지급 여부를 표시한다.

## 7. 업그레이드 경제

도감 아이템과 일반 재료를 소비하는 업그레이드를 정의한다.

| upgradeId | 표시 이름 | 단계 | 요구 연습 | 요구 도감 아이템 | 요구 일반 재료 | 효과 | 반복 가능 |
|---|---|---:|---|---|---|---|---|
| dance-machine-1 | 댄스머신 1단계 | 1 |  |  |  |  | 아니오 |
| rap-machine-1 | 랩머신 1단계 | 1 |  |  |  |  | 아니오 |

효과 분류:

- [ ] 생산 효율 증가
- [ ] 미니게임 보상 증가
- [ ] 케어 효율 증가
- [ ] 외형 변화
- [ ] 스토리/도감 해금
- [ ] 기타:

소비 정책:

- 도감 아이템을 소비해도 도감 등록 기록은 유지한다: 예 / 아니오 / 미결
- 실패 확률이 있다: 예 / 아니오 / 미결
- 중복 업그레이드가 가능하다: 예 / 아니오 / 미결

## 8. 구역 배치 자동 생산

Aidong을 구역에 배치해 시간당 생산하는 규칙을 정의한다.

| 항목 | 내용 |
|---|---|
| productionZoneId |  |
| 배치 가능한 Aidong 조건 |  |
| 기본 슬롯 수 |  |
| 확장 슬롯 조건 |  |
| 회수 방식 | 자동 / 수동 버튼 / 미결 |
| 생산 저장 위치 | hostStates.inventory / zone pending / 미결 |

생산 테이블:

| aidong 조건 | resourceId | 시간당 생산량 | 최대 누적 | 효율 표시 | 비고 |
|---|---|---:|---:|---|---|
| 기본 |  |  |  | 보통 |  |
| 속성 일치 |  |  |  | 효율 |  |
| 속성 불일치 |  |  |  | 비효율 |  |

검증 규칙:

- [ ] 영입된 Aidong만 배치 가능.
- [ ] 항해 중 Aidong은 배치 불가.
- [ ] 같은 Aidong은 여러 구역에 중복 배치 불가.
- [ ] 잠긴 구역에는 배치 불가.
- [ ] 생산 회수는 중복 지급 방지 필요.

## 9. 항해/보드 규칙

항해 방식이 필요한 경우 작성한다.

| 항목 | 내용 |
|---|---|
| 이동 방식 | 주사위 / 8~9칸 축소 / 지정 이동 / 하이브리드 / 미결 |
| 기본 칸 수 |  |
| 하루 이동 제한 |  |
| 입항 조건 |  |
| 적재량 제한 사용 여부 | 예 / 아니오 / 미결 |
| Aidong 만남 칸/이벤트 |  |
| 재료 획득 칸/이벤트 |  |

보상 처리:

- [ ] 일반 재료는 `hostStates.inventory`로 지급.
- [ ] 항해 공통 화물은 배 화물칸에 임시 적재.
- [ ] Aidong 도감 아이템은 해당 Aidong 귀속 원장으로 지급.
- [ ] 기타:

## 10. 인벤토리와 저장 위치

획득/소비되는 모든 재화를 저장 위치별로 나눈다.

| id | 표시 이름 | 종류 | 저장 위치 | 획득처 | 소비처 | 비고 |
|---|---|---|---|---|---|---|
|  |  | 일반 재료 | hostStates.inventory |  |  |  |
|  |  | Aidong 도감 아이템 | myAidongStates.aidongCodexItems |  |  |  |
|  |  | 항해 화물 | shipStates.shipInventory |  |  |  |

저장 위치 후보:

- `hostStates.inventory`: 통 인벤토리, 일반 재료, 착용 아이템 소유권.
- `myAidongStates.aidongCodexItems`: Aidong별 25 도감 아이템.
- `myAidongStates.aidongUpgradeState`: Aidong별 업그레이드 상태.
- `myAidongStates.practiceState`: 숙소 연습 상태.
- `myIslandStates.dynamicAidongZones`: 메인 가변 구역.
- `zoneStates.progress.production`: 구역 배치 자동 생산.
- `shipStates.shipInventory`: 항해 중 임시 화물.

## 11. Frontend 화면 요구

필요한 화면과 UI 요소를 적는다.

| 화면 | 필요한 변화 | 우선순위 | 비고 |
|---|---|---|---|
| 숙소 |  | P0 / P1 / P2 |  |
| 마이섬 메인 |  | P0 / P1 / P2 |  |
| 항해 보드 |  | P0 / P1 / P2 |  |
| 구역 화면 |  | P0 / P1 / P2 |  |
| 도감/업그레이드 |  | P0 / P1 / P2 |  |
| 항구 |  | P0 / P1 / P2 |  |

UI 원칙:

- 세관 버튼/팝업은 기본 core flow에 노출하지 않는다.
- 넓은 웹 화면을 활용한다.
- 숙소는 케어/연습/꾸미기/업그레이드의 중심 허브다.
- 메인 화면은 가변 구역이 늘어나도 찾기 쉬워야 한다.
- 항해는 첫 사용자가 이해할 수 있을 정도로 단순해야 한다.

## 12. Backend/API 요구

필요한 API 후보를 적는다.

| method | path | 역할 | 권위 service | 저장소 | 비고 |
|---|---|---|---|---|---|
| POST | `/api/modules/route-neighbor/encounter/accept` | Aidong 만남 수락 | route-neighbor 또는 encounter service | myAidongStates, myIslandStates | 후보 |
| POST | `/api/modules/{zoneId}/production/assign` | 구역 배치 | zone service | zoneStates | 후보 |
| POST | `/api/modules/{zoneId}/production/claim` | 생산 회수 | zone service | zoneStates, hostStates | 후보 |
| POST | `/api/modules/my-aidong/upgrade` | Aidong 업그레이드 | my-aidong service | myAidongStates, hostStates | 후보 |

검증할 backend rule:

- [ ] uid는 auth middleware 기준으로 받는다.
- [ ] frontend 직접 보상 지급 금지.
- [ ] domain service가 조건과 비용을 검증한다.
- [ ] 중복 지급/중복 소비 방지.
- [ ] 다른 module document 직접 수정 금지.
- [ ] 필요한 경우에만 customs/resource adapter 사용.

## 13. CSV/Catalog 요구

기획이 데이터 파일로 내려가야 하는 경우 작성한다.

| 파일 후보 | 용도 | 필요한 컬럼 |
|---|---|---|
| `packages/modules/my-aidong/codex-items.csv` | Aidong별 25 도감 아이템 | characterId, itemId, label, rarity, source, description |
| `packages/modules/my-aidong/upgrade-recipes.csv` | 업그레이드 레시피 | characterId, upgradeId, level, requiredItems, requiredHostItems, effect |
| `packages/modules/my-aidong/minigame-skins.csv` | Aidong별 미니게임 스킨 | characterId, engineId, skinId, entryItemId, rewardItemId |
| `packages/modules/zone-*/balance.csv` | 구역 생산/보상 수치 | resourceId, baseRate, maxPending, allowedAidongTags |
| `packages/modules/lodge/decor.csv` | 숙소 꾸미기 | itemId, label, cost, defaultOwned, placement |

## 14. Smoke/QA 기준

이 기획이 들어간 뒤 최소 검증할 항목을 적는다.

- [ ] 로그인 후 core route 진입이 깨지지 않는다.
- [ ] legacy `/api/state` 호출이 없다.
- [ ] 세관 UI가 기본 flow에 노출되지 않는다.
- [ ] 보상이 중복 지급되지 않는다.
- [ ] 소비가 중복 차감되지 않는다.
- [ ] 같은 Aidong이 중복 배치되지 않는다.
- [ ] 멀티탭에서 stale state가 최신 상태를 덮어쓰지 않는다.
- [ ] frontend typecheck 통과.
- [ ] backend typecheck 통과.
- [ ] 필요한 module action smoke 추가.

## 15. 미결정 사항

| ID | 질문 | 우선순위 | 결정 필요일 | 담당 |
|---|---|---|---|---|
| Q1 |  | P0 |  |  |
| Q2 |  | P1 |  |  |
| Q3 |  | P2 |  |  |

## 16. 개발 분해 결과

기획 입력 후 개발자가 채운다.

### Backend

- [ ] model/schema:
- [ ] repository:
- [ ] service:
- [ ] route:
- [ ] test/smoke:

### Frontend

- [ ] screen:
- [ ] component:
- [ ] store facade:
- [ ] API client:
- [ ] E2E/smoke:

### Data

- [ ] CSV:
- [ ] manifest:
- [ ] i18n:
- [ ] asset catalog:

## 변경 기록

- **2026-06-08**: 기획 변경 이후 실제 기획 입력을 개발 가능한 schema, API, catalog, screen, smoke 단위로 받기 위한 템플릿을 추가했다.
