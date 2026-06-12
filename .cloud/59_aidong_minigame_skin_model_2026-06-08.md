# 아이동별 미니게임 스킨 모델 2026-06-08

이 문서는 2026-06-05 기획 변경 이후 미니게임을 Aidong별 개별 구현이 아니라 **공통 엔진 + Aidong별 스킨** 구조로 재정의한다.

기준 문서:

- `.cloud/기획변경회의에따른기획변경가이드.md`
- `.cloud/53_core_loop_2026-06-08.md`
- `.cloud/54_aidong_encounter_dynamic_zone_2026-06-08.md`
- `.cloud/58_zone_placement_production_2026-06-08.md`

## 한 줄 정의

미니게임은 **소수의 공통 game engine을 만들고, Aidong마다 배경, 이미지, 대사, 보상, 입장재, 도감 아이템만 다르게 입히는 skin model**로 운영한다.

766마리 Aidong마다 별도 미니게임을 만들지 않는다.

## 현재 구현 재해석

| 현재 구현 | 현재 의미 | 새 판정 | 처리 |
|---|---|---|---|
| `zone-garden` | 정원 구역 + 재배 미니게임 | engine 후보 | `garden-grow` 계열 engine으로 재분류 후보. |
| `zone-oasis` | 오아시스 + 방치/휴식 미니게임 | engine 후보 | `idle-rest` 계열 engine으로 재분류 후보. |
| `zone-memory` | 기억의 숲 + 카드 매칭 | engine 후보 | `memory-match` engine으로 재분류 후보. |
| `zone-mine` | 광산 + 채굴 | engine 후보 | `mine-dig` engine으로 재분류 후보. |
| `MiniGameModal` | 4종 미니게임 진입 모달 | 유지/확장 | `gameId + skinId`를 받아 렌더링하는 shell 후보. |
| `zoneContentBootstrap` | 미니게임 결과를 zone action API로 연결 | 유지/확장 | engine 결과를 backend action에 연결하는 adapter로 유지. |
| zone `balance.csv` | 보상/allowlist | 유지/확장 | engine 기본값과 skin override 후보를 둔다. |

## 용어

| 용어 | 의미 |
|---|---|
| game engine | 재배, 방치, 카드 매칭, 채굴 같은 실제 플레이 규칙. |
| skin | 특정 Aidong에 붙는 배경, 리소스, 문구, 보상, 입장재, 도감 아이템 매핑. |
| engine package | 현재 `zone-garden`, `zone-memory` 같은 모듈 패키지를 재사용하거나 후속 분리한 엔진 단위. |
| skin catalog | Aidong별 어떤 engine과 어떤 asset/reward를 쓸지 적는 데이터. |
| entry material | 미니게임 1회 플레이에 필요한 Aidong별 입장재. |

## 권장 구조

```txt
minigame engine
  garden-grow
  idle-rest
  memory-match
  mine-dig

aidong minigame skin
  hwanggumeong-garden-grow
  chum-nyang-memory-match
  yangteolgom-mine-dig
```

engine은 규칙을 담당한다.

- 제한 시간.
- 클릭/매칭/채굴/수확 로직.
- 결과 payload 형식.
- 기본 난이도.
- backend validation에 필요한 result schema.

skin은 표현과 보상 매핑을 담당한다.

- Aidong id.
- engine id.
- 배경/오브젝트/카드 이미지.
- UI 문구.
- 획득 가능한 Aidong 도감 아이템.
- 입장재 item.
- 보상 multiplier.
- BGM/SFX 후보.

## skin catalog 후보

초기에는 CSV 또는 TS catalog 둘 다 가능하다. 밸런스 조정이 잦으면 CSV를 우선한다.

후보 파일:

```txt
packages/modules/my-aidong/minigame-skins.csv
```

후보 컬럼:

```csv
characterId,skinId,engineId,entryItemId,rewardItemId,rewardAmount,backgroundAssetId,objectAssetId,phase,description
황금멍,hwanggumeong-garden,garden-grow,golden-bone,hwanggumeong-golden-paw,1,garden-gold-bg,golden-seed,Phase 1,황금멍 정원 스킨
춤냥,chumnyang-memory,memory-match,silver-fish,chumnyang-silver-ribbon,1,memory-night-bg,silver-card,Phase 1,춤냥 카드 매칭 스킨
```

대안:

```txt
packages/modules/{aidong-pack}/minigame-skins.csv
packages/modules/minigame/skins.csv
```

현재는 초기 20~30마리 랜덤 풀을 먼저 다뤄야 하므로 `my-aidong` 또는 중앙 catalog 후보가 더 단순하다.

## backend 상태 소유권

권장:

- Aidong이 어떤 skin을 쓰는지는 catalog가 결정한다.
- 사용자가 해금한 Aidong별 game skin 상태는 `myAidongStates` 또는 `myIslandStates.dynamicAidongZones`에서 참조한다.
- 미니게임 완료 진척은 기존 `zoneStates.clearedCount/progress`를 호환 사용하거나, 장기적으로 `minigameStates` 전용 collection 후보를 둔다.
- 보상으로 얻는 Aidong 도감 아이템은 `myAidongStates.aidongCodexItems`에 지급한다.
- 일반 재료 보상은 `hostStates.inventory`에 지급한다.

후보:

```ts
interface AidongMinigameSkin {
  characterId: string
  skinId: string
  engineId: 'garden-grow' | 'idle-rest' | 'memory-match' | 'mine-dig'
  entryItemId?: string
  rewardItemId?: string
  rewardAmount?: number
  backgroundAssetId?: string
  objectAssetId?: string
}
```

## API 후보

engine 자체는 frontend component가 담당하지만 결과 검증과 보상 지급은 backend action이 담당한다.

후보:

```txt
GET  /api/modules/my-aidong/{characterId}/minigame
POST /api/modules/my-aidong/{characterId}/minigame/start
POST /api/modules/my-aidong/{characterId}/minigame/complete
```

대안:

```txt
POST /api/modules/minigame/{engineId}/complete
```

1차 권장:

- 초기에는 기존 zone `clear` API를 유지한다.
- Aidong별 skin 보상이 필요해지는 시점에 `my-aidong/minigame/complete` 또는 `minigame/complete` API를 만든다.

## result payload validation

engine별 backend validation은 유지한다.

| engineId | result payload 후보 | 검증 |
|---|---|---|
| `garden-grow` | `{ harvested: number }` | 정수, 허용 범위. |
| `idle-rest` | `{ durationMs: number }` | 최대 시간, cooldown. |
| `memory-match` | `{ moves: number, matchedPairs: number }` | 이동 수, pair 수. |
| `mine-dig` | `{ oreFound: number, pickaxeUsed: number }` | 최대 광석 수, 행동 수. |

frontend가 보상 수량을 결정하지 않는다. frontend는 result event만 보내고 backend가 catalog와 balance를 기준으로 보상한다.

## 입장재

입장재는 P1 미결이지만 모델은 남긴다.

후보:

- Aidong별 고유 입장재.
- game engine별 공통 입장재.
- 숙소 케어/연습으로 얻는 입장재.
- 항해에서 얻는 입장재.

권장:

- 입장재 소유권은 `hostStates.inventory` 또는 Aidong 귀속 inventory 중 하나로 확정해야 한다.
- Aidong별 도감 아이템과 입장재를 같은 원장에 섞지 않는다.
- 입장재 소비 검증은 backend `start` 또는 `complete` action이 담당한다.

## frontend 구조 후보

현재:

```tsx
<MiniGameModal game="garden" />
```

후보:

```tsx
<MiniGameModal engineId="memory-match" skinId="chumnyang-memory" characterId="춤냥" />
```

또는:

```tsx
<AidongMinigameEntry characterId="춤냥" />
```

`AidongMinigameEntry`가 catalog를 읽어 engine과 skin을 결정한다.

렌더링 책임:

- React/MUI: modal, HUD, 결과, 보상, 버튼, 접근성.
- engine component: 실제 미니게임 interaction.
- skin layer: 이미지, 문구, 색, 보상 item label.
- Rive/PixiJS: 필요한 경우 보상/탭/성공 연출에 부분 사용.

## zone 모듈 처리 방향

지금 당장 `zone-garden`, `zone-oasis`, `zone-memory`, `zone-mine`을 삭제하거나 이름을 바꾸지 않는다.

단기:

- 기존 package와 route를 유지한다.
- 4개 zone 미니게임을 engine 후보로 문서상 재분류한다.
- 신규 Aidong skin catalog가 생기면 기존 MiniGame component에 skin prop을 추가하는 방식부터 검토한다.

중기:

- `packages/modules/minigame-*` 또는 `packages/modules/game-engines`로 engine package를 분리할지 결정한다.
- `zone-*`는 home island 구역/생산 구역 역할로 남길 수 있다.
- engine은 여러 Aidong 구역에서 재사용한다.

## 보상 경계

| 보상 | 저장 위치 |
|---|---|
| 일반 재료 | `hostStates.inventory` |
| Aidong별 도감 아이템 | `myAidongStates.aidongCodexItems[characterId]` |
| 코인/보석/다이아 | `hostStates` resource |
| zone-local legacy resource | `zoneStates.localResources` |

Phase 1 core loop에서는 Aidong skin 보상이 `myAidongStates.aidongCodexItems`와 자연스럽게 연결되어야 한다.

## smoke 후보

- 같은 engine에 서로 다른 skin을 적용해도 결과 payload 형식이 유지된다.
- skin catalog에 없는 `skinId`는 거부한다.
- 영입하지 않은 Aidong의 skin 미니게임은 시작할 수 없다.
- 보상은 frontend 직접 지급이 아니라 backend action 응답으로 반영된다.
- 기존 zone `clear` smoke는 계속 통과한다.
- `memory-match` 같은 engine은 Aidong skin이 달라도 backend validation을 공유한다.

## 당장 하지 않을 것

- 766마리 전체 skin catalog 작성.
- 모든 zone package를 즉시 engine package로 이름 변경.
- Spine/Live2D 기반 고급 캐릭터 미니게임 제작.
- frontend에서 skin별 보상 수량 직접 계산.
- 입장재 경제 확정 전 대량 밸런스 작업.

## 구현 순서 후보

1. 초기 20~30마리 기준 Aidong별 `engineId` 후보를 catalog로 만든다.
2. `MiniGameModal` 또는 별도 entry component가 `engineId + skinId + characterId`를 받을 수 있게 설계한다.
3. 기존 4종 미니게임 component에 선택적 `skin` prop을 추가하는 후보를 검토한다.
4. backend 보상 지급 경로를 기존 `zone clear` 유지와 Aidong별 `minigame complete` 신설 중에서 결정한다.
5. Aidong 도감 아이템 보상은 `myAidongStates.aidongCodexItems`와 연결한다.
6. smoke를 추가한다.

## 미결 질문

- 초기 20~30마리 각각 어떤 engine을 배정할 것인가.
- 한 Aidong이 engine을 하나만 갖는가, 여러 개를 가질 수 있는가.
- 입장재는 공통 재료인가, Aidong별 고유 재료인가.
- skin catalog를 `my-aidong`에 둘지, 별도 `minigame` 모듈을 만들지.
- 기존 `zone-*` route를 언제까지 직접 미니게임 진입점으로 유지할 것인가.

## 변경 기록

- **2026-06-08**: 최초 작성. 4종 zone 미니게임을 engine 후보로 재분류하고, Aidong별 배경, 리소스, 문구, 보상, 입장재를 skin catalog로 분리하는 모델을 정의했다.
