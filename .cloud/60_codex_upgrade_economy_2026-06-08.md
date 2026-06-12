# 도감 아이템 / 업그레이드 경제 설계 2026-06-08

이 문서는 2026-06-05 기획 변경 회의 이후 아이동별 25개 도감 아이템과 숙소 업그레이드 경제를 정의한다.

기준 문서:

- `.cloud/기획변경회의에따른기획변경가이드.md`
- `.cloud/53_core_loop_2026-06-08.md`
- `.cloud/55_inventory_codex_item_redesign_2026-06-08.md`
- `.cloud/57_lodge_growth_hub_2026-06-08.md`
- `.cloud/59_aidong_minigame_skin_model_2026-06-08.md`

## 한 줄 정의

아이동별 25개 도감 아이템은 **수집 기록이면서 동시에 숙소 연습과 업그레이드에 쓰이는 아이동 귀속 성장 재료**다.

`codexStates`는 도감 표시와 등록 진행을 담당하고, 실제 도감 아이템 수량과 업그레이드 상태는 `myAidongStates`가 소유하는 방향으로 둔다.

## 핵심 원칙

- 아이동별 도감 아이템 수량은 `myAidongStates.aidongCodexItems` 후보 필드가 소유한다.
- 아이동별 업그레이드 상태는 `myAidongStates.aidongUpgradeState` 후보 필드가 소유한다.
- 숙소 연습 상태는 `myAidongStates.practiceState` 후보 필드가 소유한다.
- `codexStates`는 도감 표시, 해금, 등록, 일지 진행 상태만 담당한다.
- 일반 재료와 장착 아이템 소유권은 `hostStates.inventory`가 담당한다.
- 보상 지급, 소비, 업그레이드 성공 판정은 백엔드 service가 검증한다.
- 프론트엔드는 보유 수량, 요구 조건, 결과를 보여주고 요청만 보낸다.
- 766개 대형 도감은 장기 확장 후보이며 초기 구현 범위가 아니다.

## 현재 구조 해석

현재 `CodexStateModel`은 다음 상태를 가진다.

- `unlockedDiaries`
- `unlockedCodexEntries`
- `codexFullyRegistered`

따라서 `codexStates`는 수량 inventory가 아니라 도감 UI와 등록 진행을 표현하는 문서다.

현재 `MyAidongStateModel`은 다음 상태를 가진다.

- `recruitedAidongs`
- `affinities`
- `needs`
- `careLog`
- `equippedOutfit`
- `equippedItems`

하지만 아이동별 25개 도감 아이템 수량, 숙소 연습 상태, 업그레이드 상태는 아직 명시 필드로 분리되어 있지 않다.

## 추가 상태 후보

`myAidongStates`에 다음 필드를 추가하는 방향을 기본 후보로 둔다.

```ts
interface MyAidongStateDoc {
  aidongCodexItems?: Record<string, Record<string, number>>
  aidongUpgradeState?: Record<string, AidongUpgradeState>
  practiceState?: Record<string, AidongPracticeState>
}

interface AidongUpgradeState {
  level?: number
  machines?: Record<string, AidongMachineState>
  consumedCodexItems?: Record<string, number>
  unlockedEffects?: string[]
}

interface AidongMachineState {
  level: number
  unlockedAt?: number
  upgradedAt?: number
}

interface AidongPracticeState {
  practiceLevel?: number
  practiceExp?: number
  lastPracticeAt?: number
}
```

저장 예시는 다음과 같다.

```json
{
  "aidongCodexItems": {
    "golden-mung": {
      "golden-mung-card-01": 3,
      "golden-mung-card-02": 1
    }
  },
  "aidongUpgradeState": {
    "golden-mung": {
      "level": 2,
      "machines": {
        "dance-machine": {
          "level": 1
        }
      },
      "consumedCodexItems": {
        "golden-mung-card-01": 2
      },
      "unlockedEffects": [
        "production-efficiency:garden"
      ]
    }
  }
}
```

## CSV 후보

초기에는 `my-aidong` 모듈 아래에 CSV를 둔다.

```text
packages/modules/my-aidong/codex-items.csv
packages/modules/my-aidong/upgrade-recipes.csv
```

`codex-items.csv` 후보 컬럼:

```csv
characterId,itemId,name,slotNo,rarity,sourceType,sourceId,phase,description
```

`upgrade-recipes.csv` 후보 컬럼:

```csv
characterId,upgradeId,machineId,level,requiredPracticeLevel,requiredItems,coinCost,effects,phase,description
```

`requiredItems`는 초기에는 JSON 문자열 또는 `itemId:count|itemId:count` 형식 중 하나로 정한다.

최종 파서는 CSV 사용 규칙에 맞춰 명시 스키마를 둔다.

## 업그레이드 후보

업그레이드는 숙소에서 아이동을 성장시키는 장치나 기능으로 표현한다.

후보 장치:

- `dance-machine`
- `rap-machine`
- `vocal-booth`
- `styling-desk`

효과 후보:

- 생산 효율 증가
- 미니게임 보상 보정
- 케어 효율 증가
- 외형 연출 해금
- 스토리 또는 도감 항목 해금

수치 밸런스는 지금 코드에 박지 않고 CSV 후보로 관리한다.

다만 검증 로직, unlock 조건 판정, result payload validation은 백엔드 service 코드에 둔다.

## 기본 흐름

1. 항해, 미니게임, 생산, 이벤트에서 아이동 도감 아이템 보상 후보가 생성된다.
2. 백엔드는 보상 대상 아이동과 아이템이 유효한지 검증한다.
3. 보상은 `myAidongStates.aidongCodexItems[characterId][itemId]`에 적립된다.
4. 숙소에서 연습을 진행하면 `practiceState[characterId]`가 증가한다.
5. 업그레이드 요청 시 백엔드는 연습 조건, 아이템 수량, 전역 재료 비용을 검증한다.
6. 조건이 충족되면 도감 아이템과 전역 재료를 차감하고 `aidongUpgradeState`를 갱신한다.
7. 필요하면 `codexStates`에 표시용 등록, 일지, 해금 결과만 반영한다.

## API 후보

초기에는 `my-aidong` 모듈 API 아래에 둔다.

```text
GET  /api/modules/my-aidong/:characterId/codex-items
POST /api/modules/my-aidong/:characterId/codex-items/reward
POST /api/modules/my-aidong/:characterId/codex-items/consume
POST /api/modules/my-aidong/:characterId/practice/complete
POST /api/modules/my-aidong/:characterId/upgrade
```

운영 원칙:

- `reward`와 `consume`은 프론트 직접 호출보다 백엔드 내부 service 호출을 우선한다.
- 외부 API로 열 경우 관리자, 테스트, 이벤트 지급 등 제한된 경로에서만 사용한다.
- 업그레이드는 반드시 백엔드에서 idempotency와 중복 소비를 방어한다.
- 전역 재료가 필요하면 `hostStates.inventory` 차감과 같은 트랜잭션 단위로 처리한다.

## 도감 표시 상태와의 관계

도감 아이템을 소비해도 도감 표시 등록이 반드시 사라지지는 않는다.

따라서 다음 두 개념을 분리한다.

- 보유 수량: `myAidongStates.aidongCodexItems`
- 발견, 등록, 완전 등록 상태: `codexStates`

`codexFullyRegistered`는 수량 자체가 아니라 완전 등록 결과 상태다.

완전 등록 조건이 "25종 발견"인지, "25종 일정 수량 보유"인지, "특정 업그레이드 완료"인지는 후속 밸런스 설계에서 결정한다.

## 테스트 후보

최소 smoke와 단위 테스트 후보는 다음과 같다.

- 특정 아이동에게 도감 아이템을 지급하면 해당 아이동 수량만 증가한다.
- 수량이 부족한 아이템 소비 요청은 실패한다.
- 연습 조건이 부족하면 업그레이드가 실패한다.
- 아이템 조건이 부족하면 업그레이드가 실패한다.
- 업그레이드는 같은 요청으로 중복 소비되지 않는다.
- 업그레이드 성공 시 도감 아이템과 전역 재료가 함께 차감된다.
- `codexStates`를 수량 인벤토리처럼 쓰지 않는다.

## 금지 사항

- 아이동별 25개 도감 아이템 수량을 `codexStates`에 저장하지 않는다.
- 같은 수량을 `hostStates.inventory`와 `myAidongStates.aidongCodexItems`에 중복 저장하지 않는다.
- 프론트에서 업그레이드 보상이나 소비 결과를 계산하지 않는다.
- 초기 구현에서 766개 전체 도감을 한 번에 만들지 않는다.
- 도감 표시 상태와 경제 수량을 같은 필드로 합치지 않는다.

## 후속 작업

1. `MyAidongStateModel`에 `aidongCodexItems`, `aidongUpgradeState`, `practiceState` 후보 필드를 추가한다.
2. `my-aidong` 모듈에 `codex-items.csv`, `upgrade-recipes.csv` 초안을 추가한다.
3. `my-aidong` backend service에 reward, consume, upgrade 검증 함수를 추가한다.
4. 숙소 UI에서 연습, 업그레이드, 요구 아이템 표시를 연결한다.
5. 미니게임 스킨 보상과 도감 아이템 지급 경로를 연결한다.

## 변경 기록

- **2026-06-08**: 최초 작성. 기획 변경 회의 내용에 맞춰 아이동별 25개 도감 아이템, 숙소 연습, 업그레이드 경제의 저장 위치와 API 후보를 정의했다.
