# Backend/API 껍데기 작업 메모 2026-06-08

이 문서는 기획 확정 전에도 먼저 세울 수 있는 backend action shell을 정리한다.

이번 작업은 실제 수치, 확률, 보상량, recipe를 확정하지 않는다. 대신 새 core loop가 들어올 자리를 module route/service/model 경계 안에 만들어 둔다.

## 구현한 API

### Aidong 만남 수락

`POST /api/modules/route-neighbor/encounter/accept`

요청:

```json
{
  "uid": "user-id",
  "characterId": "golden-mung",
  "encounterId": "encounter-golden-mung-001",
  "zoneId": "aidong-golden-mung-zone"
}
```

응답:

```json
{
  "ok": true,
  "state": {},
  "aidongState": {},
  "islandState": {}
}
```

동작:

- `my-aidong`의 `recruitAidong`을 호출해 Aidong을 영입한다.
- `my-island`의 `openDynamicAidongZone`을 호출해 Aidong 전용 가변 구역을 연다.
- `routeNeighborStates.progress.acceptedEncounters`에 수락 기록을 남긴다.
- 같은 `encounterId`로 재호출하면 중복 수락하지 않고 replay 응답을 돌려준다.

아직 하지 않는 것:

- encounter pool 추첨.
- 확률 계산.
- 스토리 컷 연결.
- 만남 조건 검증.
- 보상 지급.

### 구역 생산 배치

`POST /api/modules/{zone-id}/production/assign`

요청:

```json
{
  "uid": "user-id",
  "characterId": "golden-mung",
  "slotId": "slot1"
}
```

동작:

- zone module id와 zone unlock 여부를 검증한다.
- Aidong 영입 여부를 검증한다.
- `zoneStates.progress.production[slotId]`에 배치 상태를 기록한다.

아직 하지 않는 것:

- 전체 모듈을 넘나드는 Aidong 중복 배치 최종 검증.
- 시간당 생산량 계산.
- 효율, 케미, 속성 계산.
- 통 인벤토리 지급.

### 구역 생산 해제

`POST /api/modules/{zone-id}/production/unassign`

요청:

```json
{
  "uid": "user-id",
  "slotId": "slot1"
}
```

동작:

- `zoneStates.progress.production[slotId]`를 제거한다.

### 구역 생산 회수

`POST /api/modules/{zone-id}/production/claim`

요청:

```json
{
  "uid": "user-id",
  "slotId": "slot1",
  "idempotencyKey": "claim-001"
}
```

동작:

- 배치된 slot이 있는지 확인한다.
- `zoneStates.progress.lastProductionClaim`과 `productionClaims`에 회수 기록을 남긴다.
- 현재는 `rewards: []`를 반환한다.

아직 하지 않는 것:

- elapsed time 계산.
- production cap 계산.
- `hostStates.inventory` 지급.
- zone별 생산 item 결정.

### Aidong 도감 아이템 지급

`POST /api/modules/my-aidong/codex-items/grant`

요청:

```json
{
  "uid": "user-id",
  "characterId": "golden-mung",
  "itemId": "golden-mung-card-01",
  "amount": 1,
  "source": "minigame"
}
```

동작:

- Aidong 영입 여부를 검증한다.
- `myAidongStates.aidongCodexItems[characterId][itemId]`에 수량을 누적한다.
- `myAidongStates.aidongUpgradeState[characterId].lastCodexItemSource`에 출처를 남긴다.

아직 하지 않는 것:

- 25종 catalog 검증.
- 획득처 allowlist 검증.
- 일일 제한.
- 도감 등록 UI와의 직접 연결.

### Aidong 업그레이드 요청

`POST /api/modules/my-aidong/upgrades/request`

요청:

```json
{
  "uid": "user-id",
  "characterId": "golden-mung",
  "upgradeId": "dance-machine",
  "idempotencyKey": "upgrade-001"
}
```

동작:

- Aidong 영입 여부를 검증한다.
- `myAidongStates.aidongUpgradeState[characterId]`에 요청 기록을 남긴다.
- 같은 `idempotencyKey`로 재호출하면 중복 처리하지 않는다.

아직 하지 않는 것:

- recipe 검증.
- 도감 아이템 차감.
- 능력치/효율/외형 변경.
- 숙소 업그레이드 asset 연결.

## 추가한 상태 필드

### `routeNeighborStates.progress`

항해 만남 수락 기록 후보를 담는다.

주요 후보:

- `acceptedEncounters`
- `lastAcceptedEncounter`

### `myAidongStates.aidongCodexItems`

Aidong별 25 도감 아이템 수량 후보 원장이다.

### `myAidongStates.aidongUpgradeState`

Aidong별 업그레이드 요청, 마지막 획득 출처, 향후 upgrade level을 담을 후보 원장이다.

### `zoneStates.progress.production`

구역별 Aidong 생산 배치 상태 후보를 담는다.

## 검증 책임 분리

- route: uid와 필수 payload 타입만 확인한다.
- service: 영입 여부, 구역 해금, slot 존재, idempotency를 확인한다.
- repository: memory/Mongo 차이를 숨기고 document patch만 담당한다.
- balance/config: 실제 production rate, item reward, recipe, encounter 확률을 나중에 제공한다.
- customs: Phase 1 core action에는 끼우지 않는다.

## Smoke 반영

`packages/backend/scripts/smoke-module-actions.mjs`에 다음 경로를 추가했다.

- `my-aidong/codex-items/grant`
- `my-aidong/upgrades/request`
- `route-neighbor/encounter/accept`
- `zone-garden/production/assign`
- `zone-garden/production/claim`
- `zone-garden/production/unassign`

## 검증 결과

- `pnpm --filter backend typecheck` 통과.
- `pnpm check:backend:model-specs` 통과.
- `pnpm check:module-actions-smoke` 통과.

## 남은 결정

- encounter pool과 확률을 어느 module/config가 소유할지.
- Aidong 만남 수락 API가 `route-neighbor` orchestration으로 확정될지, 별도 `encounter` module로 분리될지.
- production 중복 배치 검증을 공통 location service로 승격할지.
- production reward를 `hostStates.inventory`에 즉시 지급할지, pending claim buffer를 둘지.
- Aidong 도감 아이템 25종 catalog와 upgrade recipe CSV 위치.
- upgrade 결과가 능력치, 생산 효율, 미니게임 보상, 외형 중 어디까지 영향을 줄지.

## 변경 기록

- **2026-06-08**: 기획 확정 전 backend action shell을 추가했다. encounter accept, zone production assign/unassign/claim, Aidong codex item grant, Aidong upgrade request를 route/service/model 경계 안에 세우고, 실제 수치와 보상은 placeholder로 보류했다.
