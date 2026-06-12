# 구역 배치 자동 생산 설계 2026-06-08

이 문서는 2026-06-05 기획 변경 이후 구역에 Aidong을 배치해 시간당 자원을 생산하는 Phase 1 모델을 정의한다.

기준 문서:

- `.cloud/53_core_loop_2026-06-08.md`
- `.cloud/54_aidong_encounter_dynamic_zone_2026-06-08.md`
- `.cloud/55_inventory_codex_item_redesign_2026-06-08.md`
- `.cloud/57_lodge_growth_hub_2026-06-08.md`

## 한 줄 정의

구역 배치 자동 생산은 **방에 들어가지 않은 Aidong을 메인 구역이나 아이동 전용 가변 구역에 배치하고, 시간이 지나면 backend가 생산량을 정산해 통 인벤토리로 지급하는 시스템**이다.

## 현재 구현 재해석

| 현재 구현 | 현재 의미 | 새 판정 | 처리 |
|---|---|---|---|
| `zoneStates.localResources` | zone-local resource | 축소/호환 | Phase 1에서는 pending 생산량 또는 legacy local resource 후보. |
| `zoneStates.clearedCount` | clear action 누적 횟수 | 유지/확장 | 미니게임/생산 회수 진척 지표로 재사용 후보. |
| `zoneStates.progress` | clearCounts, idempotency 등 임의 진행 상태 | 유지/확장 | `production` 하위 필드 후보를 둔다. |
| `/api/modules/{zoneId}/collect` | zone-local resource 증가 | 보류/호환 | 자동 생산에서는 직접 수집보다 생산 pending 증가/정산 후보. |
| `/api/modules/{zoneId}/clear` | 미니게임 완료와 host reward 지급 | 유지/재사용 | 수동 미니게임 완료 보상 경로로 유지. |
| `balance.csv` | 보상 숫자, allowlist, unlock 조건 | 유지/확장 | 생산 rate, slot 수, 효율 보정 후보를 추가할 수 있다. |

## 핵심 목표

- 방 수 제한으로 적극 육성하지 못하는 Aidong에게 의미 있는 배치처를 제공한다.
- Aidong 속성, 케미, 효율에 따라 시간당 생산량이 달라지는 기반을 만든다.
- 생산 보상은 가능한 한 `hostStates.inventory`로 직접 들어가게 한다.
- 기존 미니게임 `collect/clear` API를 깨지 않고 자동 생산 API를 추가한다.
- 비효율 배치를 UI에서 명확히 보여준다.

## 상태 소유권

1차 권장:

- 구역별 배치와 생산 상태는 `zoneStates.progress.production`에 둔다.
- 전체 메인 가변 구역 해금 여부는 `myIslandStates`가 가진다.
- Aidong의 영입/상태/속성은 `myAidongStates`가 가진다.
- 생산 보상 수량 원장은 `hostStates.inventory`가 가진다.

예시:

```ts
interface ZoneProductionState {
  assignedAidongs?: string[]
  startedAt?: number
  lastSettledAt?: number
  pendingRewards?: Record<string, number>
  efficiency?: Record<string, number>
}

interface ZoneStateDoc {
  progress: {
    production?: ZoneProductionState
  }
}
```

`zoneStates.localResources`에 생산 결과를 오래 쌓는 방식은 Phase 1 기본값으로 두지 않는다. 단, 기존 customs/POC 호환을 위해 필드는 삭제하지 않는다.

## API 후보

권장 action API:

```txt
GET  /api/modules/{zoneId}/production
POST /api/modules/{zoneId}/production/assign
POST /api/modules/{zoneId}/production/unassign
POST /api/modules/{zoneId}/production/settle
POST /api/modules/{zoneId}/production/claim
```

역할:

- `assign`: Aidong을 구역 생산 슬롯에 배치한다.
- `unassign`: Aidong을 구역에서 뺀다. 필요하면 먼저 `settle`을 수행한다.
- `settle`: 현재 시각 기준 pending 생산량을 계산해 `zoneStates.progress.production.pendingRewards`에 반영한다.
- `claim`: pending 생산량을 `hostStates.inventory`로 지급하고 pending을 비운다.

단순하게 시작하려면 `settle`과 `claim`을 하나로 합쳐도 된다.

```txt
POST /api/modules/{zoneId}/production/claim
```

이 API가 현재 시각 기준 생산량을 계산하고 바로 host inventory에 지급한다.

## 생산량 계산 후보

1차 공식:

```txt
생산량 = floor(기본 시간당 생산량 * 경과 시간 * Aidong 효율 * 구역 적합도 * 케미 보정)
```

초기에는 너무 복잡하게 가지 않는다.

Phase 1 최소값:

- 기본 시간당 생산량.
- Aidong 수.
- 구역 적합/비적합 여부.
- 마지막 정산 시각.

후속 확장:

- Aidong 성격/속성.
- Aidong끼리 케미.
- 케어 상태와 욕구.
- 숙소 연습/업그레이드 상태.
- 구역 레벨.
- 장식/시설 보너스.

## balance.csv 확장 후보

zone별 `balance.csv`에 다음 후보를 추가할 수 있다.

```csv
paramId,value,type,description,phase
production_resource_id,basic_food,string,자동 생산 기본 보상 itemId,Phase 1
production_base_per_hour,1,number,시간당 기본 생산량,Phase 1
production_slot_limit,2,number,해당 구역에 배치 가능한 Aidong 수,Phase 1
production_good_aidong_ids,황금멍;춤냥,string,적합 Aidong 후보,Phase 1
production_bad_aidong_ids,,string,비효율 Aidong 후보,Phase 1
production_max_pending_hours,12,number,오프라인 누적 최대 시간,Phase 1
```

주의:

- 숫자 보상과 allowlist는 CSV로 둘 수 있다.
- unlock, validation, 중복 배치 방지, 정산 idempotency는 backend service 코드에 둔다.

## 배치 검증

backend service가 반드시 확인한다.

- Aidong이 영입되어 있어야 한다.
- Aidong이 항해 중이면 배치할 수 없다.
- Aidong이 선실/갑판/항구 지원/다른 구역에 이미 배치되어 있으면 중복 배치할 수 없다.
- zone이 해금되어 있어야 한다.
- zone이 active여야 한다.
- slot limit을 넘길 수 없다.
- `claim`은 음수나 비정상 pending을 만들 수 없다.

중복 배치 판정은 처음에는 여러 module state를 읽는 selector/service로 구현할 수 있다. 장기적으로는 Aidong location index를 별도 원장으로 둘지 검토한다.

## UI 기준

구역 화면은 다음을 보여준다.

- 배치된 Aidong 목록.
- 빈 슬롯.
- 시간당 예상 생산량.
- 현재 누적 생산량.
- 마지막 정산 시각.
- 회수 버튼.
- 효율 badge.

비효율 배치 표시:

- 적합: `좋음`, `+효율`.
- 보통: `보통`.
- 비효율: `비효율`, 붉은 계열 badge 또는 경고 문구.

배치 후보 목록:

- 방에 있지 않은 Aidong.
- 마당 대기 Aidong.
- 항해 중이 아닌 Aidong.
- 다른 구역에 배치되지 않은 Aidong.

방에 있는 Aidong도 구역 배치 후보로 둘지는 미결이다. 방 수 제한의 의미를 살리려면 방에 있는 Aidong은 적극 육성 상태로 두고, 구역 배치 시 방에서 빠지는 편이 자연스럽다.

## 기존 collect/clear와의 관계

유지:

- `collect`는 기존 POC/minigame/local resource 호환 경로로 유지한다.
- `clear`는 미니게임 완료와 즉시 host reward 지급 경로로 유지한다.

추가:

- 자동 생산은 `production/*` action으로 분리한다.
- 생산 reward는 가능하면 `hostStates.inventory`에 직접 지급한다.
- `zoneStates.localResources`는 자동 생산의 기본 원장으로 쓰지 않는다.

이유:

- 미니게임 완료와 방치 생산은 다른 UX다.
- `clearId`는 activity type이라 시간 기반 정산 idempotency를 담기 어렵다.
- 생산은 lastSettledAt과 pendingRewards가 필요하다.

## 미니게임과 자동 생산의 공존

각 구역은 두 가지 활동을 가질 수 있다.

| 활동 | 의미 | API |
|---|---|---|
| 미니게임 | 사용자가 직접 플레이하고 즉시 보상 | `clear` |
| 자동 생산 | Aidong을 배치하고 시간이 지나면 보상 | `production/claim` |

아이동별 미니게임 스킨 모델이 확정되면, 같은 zone이 미니게임 engine이자 자동 생산 구역 역할을 함께 맡을 수 있다.

## smoke 후보

최소 smoke:

- 잠긴 zone에는 Aidong을 배치할 수 없다.
- 영입하지 않은 Aidong은 배치할 수 없다.
- 항해 중 Aidong은 배치할 수 없다.
- 같은 Aidong을 두 구역에 중복 배치할 수 없다.
- `production/claim`은 host inventory를 증가시킨다.
- `production/claim`을 짧은 시간에 반복해도 비정상 중복 지급이 일어나지 않는다.
- 기존 `collect/clear` smoke는 계속 통과한다.

## 당장 하지 않을 것

- `collect/clear` 삭제.
- `localResources` 삭제.
- 모든 구역의 생산 balance를 한 번에 확정.
- Aidong location index를 급히 별도 collection으로 분리.
- 케미/속성/욕구 보정까지 한 번에 구현.
- 세관을 자동 생산 회수에 끼워 넣기.

## 구현 순서 후보

1. zone production 상태 후보를 `ZoneStateModel`, defaults, modelSpecs에 추가한다.
2. zone service에 `assignProductionAidong`, `unassignProductionAidong`, `claimProductionRewards` 후보 action을 만든다.
3. 중복 배치 검증 helper를 만든다.
4. `balance.csv`에 최소 생산 rate와 slot limit을 추가한다.
5. frontend zone 화면 또는 메인 가변 구역 화면에 배치 슬롯과 회수 버튼을 추가한다.
6. 숙소 마당 selector와 zone 배치 후보 selector를 연결한다.
7. smoke를 추가한다.

## 미결 질문

- 방에 있는 Aidong도 구역에 배치할 수 있는가.
- 구역 배치 중인 Aidong의 케어/연습은 완전히 막을 것인가, 제한 허용할 것인가.
- 생산 보상은 일반 통 인벤토리 item인가, Aidong 도감 아이템인가, 둘 다인가.
- offline 누적 상한은 몇 시간인가.
- 배치 해제 시 pending 생산량을 자동 회수할 것인가.
- 구역별 slot limit은 모든 구역 동일인가, balance.csv별 값인가.

## 변경 기록

- **2026-06-08**: 최초 작성. zone `collect/clear`는 유지하고, 자동 생산은 `zoneStates.progress.production`과 `production/*` action 후보로 분리하는 설계를 정의했다.
