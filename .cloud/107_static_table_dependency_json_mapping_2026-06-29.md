# 107_static_table_dependency_json_mapping_2026-06-29

## 목적

`.cloud/102_xlsx_table_data_review_2026-06-29.md`를 기준으로, xlsx의 정적 테이블들을 어떤 의존관계로 읽어야 하는지 정리한다.

또한 각 테이블을 MongoDB에 저장할 때 다음 중 무엇이 적합한지 분류한다.

- table row collection으로 저장
- 여러 테이블을 조합한 JSON document로 저장
- 정적 import 대상에서 제외

이 문서는 동적 유저 데이터 migration 문서가 아니다.  
여기서 다루는 것은 관리자 페이지 `DB 관리`에서 업로드/검증/반영할 수 있는 정적 마스터 데이터다.

## 전제

### 1. DB 저장 필드는 camelCase

xlsx 원본 컬럼은 `snake_case`가 많지만, MongoDB 저장 document는 현재 backend 기준에 맞춰 camelCase로 변환한다.

예:

| xlsx | DB |
| --- | --- |
| `aidong_id` | `aidongId` |
| `item_id` | `itemId` |
| `board_set_id` | `boardSetId` |
| `slot_no` | `slotNo` |
| `created_at` | `createdAt` |

### 2. 동적 유저 데이터는 제외

다음은 정적 table import 대상이 아니다.

- 유저 계정
- provider 연결 상태
- 로그인 세션
- 유저 인벤토리
- 유저 재화 잔액
- 주사위 상태
- 숙소 현재 상태
- 보유 Aidong
- 도감템 보유 수량
- 코스메틱 보유/장착 상태
- 항해 세션 위치

이 데이터들은 API, repository, migration script, admin 운영 API로만 수정한다.

### 3. 정적 데이터 저장은 두 계층을 둔다

정적 table import에는 두 계층이 필요하다.

#### import audit 계층

업로드 파일과 검증/반영 이력을 남긴다.

권장 collection:

- `staticDataImportBatches`
- `staticDataImportLogs`

예:

```ts
interface StaticDataImportBatchDoc {
  importBatchId: string
  tableCode: string
  tableName: string
  sourceFileName: string
  sourceHash: string
  rowCount: number
  mode: 'dryRun' | 'commit'
  status: 'validated' | 'committed' | 'failed'
  importedBy: string
  importedAt: number
  validationSummary: Record<string, unknown>
}
```

#### runtime 조회 계층

게임 서버가 실제로 참조할 최신 정적 데이터를 저장한다.

권장 방식:

- 단순 master: table별 collection
- 강한 의존 그래프: JSON bundle collection
- 텍스트/대사/스크립트: namespace 또는 pack 단위 JSON document

## 큰 의존관계 지도

정적 데이터는 아래 순서로 import/검증하는 것이 안전하다.

```text
1. 공통 기준
   string table
   currency master
   item icon master
   aidong icon master

2. Aidong 기준
   animal taxonomy
   aidong index
   aidong master
   persona part slot master
   persona part default

3. Item 기준
   item catalog
   aidong pedia item master

4. 마이섬/숙소/가구 기준
   island zones
   house master
   room placement slot
   furniture item master
   furniture slot rule

5. 항해 보드 기준
   board set master
   board slot

6. 경제 정책
   module currency policy

7. 스토리/대사/개인섬 콘텐츠
   daily dialogue
   personal story master
   personal story episode
   aidong personal island map/hotspot/script/condition/effect

8. 코스메틱 규칙
   cosmetic slot master
   cosmetic item master
   fit rule
   render rule
```

## JSON으로 처리하는 편이 나은 테이블

아래 테이블들은 단일 row collection으로만 두면 런타임에서 매번 join/lookup이 많아진다.  
관리자 업로드 원본은 table row로 검증하되, commit 시점에 별도 JSON bundle을 생성하는 편이 낫다.

| 그룹 | 관련 tableCode | JSON 처리 권장 이유 | 권장 runtime collection |
| --- | --- | --- | --- |
| 항해 보드 세트 | `X-CFG-01`, `M05-MAP-02` | 보드 세트 1개가 slot 여러 개를 소유한다. 런타임은 boardSetId로 한 번에 읽는 편이 좋다. | `staticBoardSets` |
| Aidong 개인섬 | `M22-MAP-*`, `M22-SCR-*` | 맵, 노드, 핫스팟, 스크립트, 조건, 효과가 하나의 콘텐츠 그래프다. | `staticAidongIslandBundles` |
| 스토리 에피소드 | `M10-STY-01`, `M10-STY-02` | master와 episode가 강하게 묶이고, 화면은 Aidong/episode 단위로 읽는다. | `staticStoryBundles` |
| 일상 대사 | `X-DLG-00`, `X-DLG-01` | 조건, 화자, 템플릿, locale이 묶인 대사 pack이 자연스럽다. | `staticDialoguePacks` |
| 코스메틱 렌더 규칙 | `M13-COS-*`, `X-CHR-05`, `X-CHR-06` | slot, item, fit, render, persona part가 같이 검증되어야 한다. | `staticCosmeticRuleSets` |
| 숙소 방/가구 규칙 | `M04-MAP-02`, `M04-MAP-03`, `M12-ITM-01`, `M12-ITM-02` | 집/방/배치 슬롯/가구 타입 제약이 한 번에 필요하다. | `staticSooksoRuleSets` |
| 문자열 리소스 | `G-STR-01` | key별 row 저장도 가능하지만, 런타임은 namespace/locale별 map 조회가 빠르다. | `staticStringPacks` |

## row collection으로 처리하는 편이 나은 테이블

아래 테이블들은 한 row가 독립적인 master 성격이 강하다.  
검색/필터/관리자 수정 이력 확인을 위해 table별 collection이 낫다.

| 그룹 | tableCode | 권장 runtime collection |
| --- | --- | --- |
| Aidong 원형 | `G-CHR-01` | `staticAidongMasters` |
| Aidong 인덱스 | `X-CHR-00` | `staticAidongIndexes` |
| 동물 분류 | `X-CHR-02` | `staticAidongAnimalTaxonomies` |
| Aidong 아이콘 | `X-CHR-04` | `staticAidongIconMasters` |
| 아이템 카탈로그 | `G-ITM-01` | `staticItemCatalogs` |
| 아이템 아이콘 | `X-ITM-00` | `staticItemIconMasters` |
| Aidong 도감템 정의 | `X-ITM-01` | `staticAidongPediaItemMasters` |
| 마이섬 구역 | `M03-MAP-00` | `staticIslandZones` |
| 재화 정의 | `X-ECO-00` | `staticCurrencyMasters` |
| 모듈 재화 정책 | `X-ECO-01` | `staticModuleCurrencyPolicies` |

## 정적 import 대상에서 제외할 테이블

아래는 xlsx에 들어 있어도 런타임 유저 상태이므로 관리자 정적 table upload로 반영하지 않는다.

| tableCode | 영문명 | 현재/권장 MongoDB document |
| --- | --- | --- |
| `G-USR-01` | `users` | `users` |
| `M01-USR-01` | `provider_accounts` | `providerAccounts` |
| `M01-USR-02` | `auth_sessions` | 현재 미사용. 로그인 세션은 DB에 저장하지 않음 |
| `M01-SYS-03` | `withdrawal` | 탈퇴/운영 API 후보 |
| `G-CHR-02` | `mydong_list` | `mydongList` |
| `G-ITM-02` | `user_inventory` | `userInventoryItems` |
| `M04-MAP-00` | `sookso_main` | `sooksoStates` |
| `M04-MAP-01` | `room_slots` | `roomSlots` |
| `M04-ITM-01` | `room_furniture` | `roomFurniturePlacements` |
| `M05-ECO-01` | `dice_resource` | `diceResources` |
| `M05-MAP-01` | `board_run` | DB 저장 금지. 항해 세션 위치는 frontend session state |
| `M17-ECO-01` 계열 | user currency balance/history | `userCurrencyBalances`, `userCurrencyLedger` |
| `M19-USR-01` | `user_settings` | `userSettings` |
| `M23-USR-01` | `mydong_view_state` | UI 상태. 필요 시 별도 API |
| `M23-ITM-01` | `mydong_pedia_inventory` | `mydongPediaInventory` |
| `M13-PRS-02` | `mydong_persona_part_state` | `mydongPersonaPartStates` |
| `M13-COS-03` | `user_cosmetic_inventory` | `userCosmeticInventory` |
| `M13-COS-04` | `mydong_cosmetic_loadout` | `mydongCosmeticLoadouts` |
| `M10-USR-01` | `user_daily_story_state` | 유저별 story 진행 collection 후보 |
| `M22-USR-*` | Aidong 개인섬 진행 상태 | 개인섬 진행 collection 후보 |

## 테이블 코드별 MongoDB 매핑

### 공통/광역

| tableCode | xlsx 영문명 | 성격 | 권장 MongoDB 연결 | 저장 방식 | 주요 의존 |
| --- | --- | --- | --- | --- | --- |
| `G-STR-01` | `string_table` | 정적 문자열 | `staticStringRows`, `staticStringPacks` | row + namespace JSON pack | 모든 UI/콘텐츠 |
| `X-ECO-00` | `currency_master` | 정적 재화 master | `staticCurrencyMasters` | row collection | `userCurrencyBalances`, `moduleCurrencyPolicy` |
| `X-ECO-01` | `module_currency_policy` | 정적 재화 정책 | `staticModuleCurrencyPolicies` | row collection | `currencyMaster`, moduleId |

### Aidong 기준

| tableCode | xlsx 영문명 | 성격 | 권장 MongoDB 연결 | 저장 방식 | 주요 의존 |
| --- | --- | --- | --- | --- | --- |
| `G-CHR-01` | `aidong_master` | Aidong 원형 master | `staticAidongMasters` | row collection | taxonomy, icon, string |
| `G-CHR-02` | `mydong_list` | 동적 보유 Aidong | `mydongList` | 정적 import 제외 | `staticAidongMasters` |
| `X-CHR-00` | `aidong_index` | Aidong 인덱스 | `staticAidongIndexes` | row collection | `aidongMaster` |
| `X-CHR-02` | `aidong_animal_taxonomy` | 동물 분류 | `staticAidongAnimalTaxonomies` | row collection | 없음 |
| `X-CHR-04` | `aidong_icon_master` | Aidong 이미지 리소스 | `staticAidongIconMasters` | row collection | asset key |
| `X-CHR-05` | `aidong_persona_part_slot_master` | persona slot master | `staticPersonaPartSlotMasters`, `staticCosmeticRuleSets` | row + JSON bundle | cosmetic/persona |
| `X-CHR-06` | `aidong_persona_part_default` | persona 기본값 | `staticPersonaPartDefaults`, `staticCosmeticRuleSets` | row + JSON bundle | aidong, persona slot |

### 아이템/도감

| tableCode | xlsx 영문명 | 성격 | 권장 MongoDB 연결 | 저장 방식 | 주요 의존 |
| --- | --- | --- | --- | --- | --- |
| `G-ITM-01` | `item_catalog` | 아이템 master | `staticItemCatalogs` | row collection | icon, string, module |
| `G-ITM-02` | `user_inventory` | 동적 유저 인벤토리 | `userInventoryItems` | 정적 import 제외 | item catalog |
| `X-ITM-00` | `item_icon_master` | 아이템 아이콘 | `staticItemIconMasters` | row collection | asset key |
| `X-ITM-01` | `aidong_pedia_item_master` | Aidong 도감템 슬롯/master | `staticAidongPediaItemMasters` | row collection | aidong, item/icon |
| `M23-ITM-01` | `mydong_pedia_inventory` | 동적 도감템 보유 | `mydongPediaInventory` | 정적 import 제외 | mydong, pedia item |

### 마이섬/숙소/가구

| tableCode | xlsx 영문명 | 성격 | 권장 MongoDB 연결 | 저장 방식 | 주요 의존 |
| --- | --- | --- | --- | --- | --- |
| `M03-MAP-00` | `island_zones` | 마이섬 구역 master | `staticIslandZones` | row collection | string, module |
| `M04-MAP-00` | `sookso_main` | 동적 숙소 상태 | `sooksoStates` | 정적 import 제외 | house master |
| `M04-MAP-01` | `room_slots` | 동적 유저 방 슬롯 | `roomSlots` | 정적 import 제외 | room placement slot |
| `M04-MAP-02` | `house_master` | 숙소 집 master | `staticHouseMasters`, `staticSooksoRuleSets` | row + JSON bundle | room placement slot |
| `M04-MAP-03` | `room_placement_slot` | 방 배치 슬롯 master | `staticRoomPlacementSlots`, `staticSooksoRuleSets` | row + JSON bundle | house master |
| `M04-ITM-01` | `room_furniture` | 동적 방 가구 배치 | `roomFurniturePlacements` | 정적 import 제외 | furniture item |
| `M12-ITM-01` | `furniture_item_master` | 가구 item master | `staticFurnitureItemMasters`, `staticSooksoRuleSets` | row + JSON bundle | item/icon/string |
| `M12-ITM-02` | `furniture_slot_rule` | 가구 배치 규칙 | `staticFurnitureSlotRules`, `staticSooksoRuleSets` | row + JSON bundle | furniture, placement slot |

### 항해/보드

| tableCode | xlsx 영문명 | 성격 | 권장 MongoDB 연결 | 저장 방식 | 주요 의존 |
| --- | --- | --- | --- | --- | --- |
| `X-CFG-01` | `board_set_master` | 보드 세트 master | `staticBoardSetMasters`, `staticBoardSets` | row + JSON bundle | board slot |
| `M05-MAP-02` | `board_slot` | 보드 칸 master | `staticBoardSlots`, `staticBoardSets` | row + JSON bundle | board set, reward refs |
| `M05-MAP-01` | `board_run` | 동적 보드 진행 | DB 저장 금지 또는 별도 event progress 후보 | 정적 import 제외 | dice/resource |
| `M05-ECO-01` | `dice_resource` | 동적 주사위 | `diceResources` | 정적 import 제외 | 없음 |

### 스토리/대사

| tableCode | xlsx 영문명 | 성격 | 권장 MongoDB 연결 | 저장 방식 | 주요 의존 |
| --- | --- | --- | --- | --- | --- |
| `X-DLG-00` | `phase1_daily_dialogue` | 일상 대사 | `staticDialogueRows`, `staticDialoguePacks` | row + JSON pack | aidong/string/condition |
| `X-DLG-01` | `aidong_daily_dialogue_template` | Aidong별 대사 template | `staticDialogueRows`, `staticDialoguePacks` | row + JSON pack | aidong, dialogue condition |
| `M10-STY-01` | personal story master | 개인 이야기 master | `staticStoryMasters`, `staticStoryBundles` | row + JSON bundle | aidong |
| `M10-STY-02` | personal story episode | 개인 이야기 episode | `staticStoryEpisodes`, `staticStoryBundles` | row + JSON bundle | story master |
| `M10-USR-01` | user daily story state | 동적 story 진행 | story progress collection 후보 | 정적 import 제외 | story episode |

### Aidong 개인섬

`M22` 계열은 row collection으로도 저장할 수 있지만, 런타임에서는 개인섬 하나를 그래프처럼 읽는 편이 자연스럽다.

| tableCode | xlsx 영문명 | 성격 | 권장 MongoDB 연결 | 저장 방식 | 주요 의존 |
| --- | --- | --- | --- | --- | --- |
| `M22-MAP-*` | Aidong 개인섬 map/node | 개인섬 정적 맵 | `staticAidongIslandRows`, `staticAidongIslandBundles` | row + JSON bundle | aidong |
| `M22-SCR-*` | 개인섬 script/condition/effect | 개인섬 상호작용 | `staticAidongIslandRows`, `staticAidongIslandBundles` | row + JSON bundle | map/node/hotspot |
| `M22-USR-*` | 개인섬 유저 진행 | 동적 개인섬 진행 | 개인섬 progress collection 후보 | 정적 import 제외 | aidong/mydong |

권장 bundle key:

```ts
{
  islandId: string
  aidongId?: string
  version: string
  nodes: Array<Record<string, unknown>>
  hotspots: Array<Record<string, unknown>>
  scripts: Array<Record<string, unknown>>
  conditions: Array<Record<string, unknown>>
  effects: Array<Record<string, unknown>>
}
```

### 코스메틱

| tableCode | xlsx 영문명 | 성격 | 권장 MongoDB 연결 | 저장 방식 | 주요 의존 |
| --- | --- | --- | --- | --- | --- |
| `M13-COS-*` master/rule 계열 | cosmetic slot/item/fit/render rule | 정적 코스메틱 master/rule | `staticCosmeticRows`, `staticCosmeticRuleSets` | row + JSON bundle | item, aidong, persona slot |
| `M13-PRS-02` | `mydong_persona_part_state` | 동적 persona 상태 | `mydongPersonaPartStates` | 정적 import 제외 | mydong/persona part |
| `M13-COS-03` | `user_cosmetic_inventory` | 동적 코스메틱 보유 | `userCosmeticInventory` | 정적 import 제외 | cosmetic item |
| `M13-COS-04` | `mydong_cosmetic_loadout` | 동적 코스메틱 착용 | `mydongCosmeticLoadouts` | 정적 import 제외 | mydong/cosmetic slot |

### 설정

| tableCode | xlsx 영문명 | 성격 | 권장 MongoDB 연결 | 저장 방식 | 주요 의존 |
| --- | --- | --- | --- | --- | --- |
| `M19-USR-01` | `user_settings` | 동적 유저 설정 | `userSettings` | 정적 import 제외 | users |

단, 설정 화면에 쓰는 선택지 master가 xlsx에 추가된다면 그것은 별도 정적 master로 분리할 수 있다.

## 권장 runtime collection 설계

### 1. 공통 row 저장소

정적 table을 빠르게 받기 위한 범용 row 저장소다.

```ts
interface StaticTableRowDoc {
  id: string
  tableCode: string
  rowKey: string
  version: string
  data: Record<string, unknown>
  sourceHash: string
  enabled: boolean
  importedAt: number
  importedBy: string
}
```

장점:

- 새 tableCode가 추가되어도 collection을 새로 만들 필요가 없다.
- 관리자 preview/diff가 쉽다.

단점:

- 런타임에서 타입 안전성이 약하다.
- 자주 읽는 master는 매번 `data`를 해석해야 한다.

### 2. 도메인별 정적 collection

자주 조회하거나 서버 logic이 직접 참조하는 master는 도메인별 collection을 둔다.

권장 1차 collection:

- `staticAidongMasters`
- `staticItemCatalogs`
- `staticAidongPediaItemMasters`
- `staticIslandZones`
- `staticCurrencyMasters`
- `staticModuleCurrencyPolicies`

장점:

- 서버 코드가 타입을 갖고 읽기 쉽다.
- unique index와 FK 검증이 명확하다.

단점:

- table이 늘 때마다 model/repository가 늘어난다.

### 3. JSON bundle collection

강한 의존 그래프를 가진 콘텐츠는 bundle로 둔다.

권장 bundle collection:

- `staticBoardSets`
- `staticSooksoRuleSets`
- `staticAidongIslandBundles`
- `staticStoryBundles`
- `staticDialoguePacks`
- `staticCosmeticRuleSets`
- `staticStringPacks`

예:

```ts
interface StaticBoardSetDoc {
  boardSetId: string
  version: string
  enabled: boolean
  slots: Array<{
    slotNo: number
    slotType: string
    label?: string
    reward?: Record<string, unknown>
    destinationIslandId?: string
    encounterRuleId?: string
  }>
  importedAt: number
  importedBy: string
}
```

장점:

- 런타임 조회가 단순하다.
- 한 화면/기능에 필요한 데이터를 한 번에 받을 수 있다.
- FK 검증 후 commit된 결과만 읽으면 된다.

단점:

- row 단위 수정 diff는 별도 import log를 봐야 한다.
- 부분 업데이트보다 전체 bundle 재생성이 자연스럽다.

## 의존관계 검증 규칙

정적 table import 시 최소한 아래 검증이 필요하다.

### Aidong

- `aidongMaster.aidongId`는 중복 불가.
- `aidongMaster.animalId`는 `aidongAnimalTaxonomy.animalId`에 있어야 한다.
- `aidongMaster.iconId` 또는 관련 icon key는 `aidongIconMaster`에 있어야 한다.
- `aidongPediaItemMaster.aidongId`는 `aidongMaster`에 있어야 한다.

### Item

- `itemCatalog.itemId`는 중복 불가.
- `itemCatalog.iconId`는 `itemIconMaster`에 있어야 한다.
- `aidongPediaItemMaster.pediaItemId` 또는 `itemId`는 item/icon master와 연결되어야 한다.

### Currency

- `currencyMaster.currencyId`는 중복 불가.
- `moduleCurrencyPolicy.currencyId`는 `currencyMaster`에 있어야 한다.
- 현재 코드 호환 기본값으로 `coin`, `diamond`는 반드시 있어야 한다.

### Sookso

- `roomPlacementSlot.houseId`는 `houseMaster.houseId`에 있어야 한다.
- `furnitureSlotRule.placementSlotId`는 `roomPlacementSlot.placementSlotId`에 있어야 한다.
- `furnitureSlotRule.furnitureItemId` 또는 category는 `furnitureItemMaster`와 맞아야 한다.

### Board

- `boardSlot.boardSetId`는 `boardSetMaster.boardSetId`에 있어야 한다.
- 같은 `boardSetId` 안에서 `slotNo`는 중복 불가.
- reward가 currency면 `currencyMaster`에 있어야 한다.
- reward가 item이면 `itemCatalog`에 있어야 한다.
- destination island 또는 Aidong encounter를 참조하면 해당 static island/encounter rule이 있어야 한다.

### Story/Dialogue

- story/dialogue의 `aidongId`는 `aidongMaster`에 있어야 한다.
- episode는 story master를 참조해야 한다.
- locale이 있다면 지원 locale 목록과 맞아야 한다.

### Cosmetic

- cosmetic item의 slot은 cosmetic slot master에 있어야 한다.
- fit/render rule의 aidong/persona slot 참조는 각각 master에 있어야 한다.
- persona default의 part slot은 persona part slot master에 있어야 한다.

## import 순서 제안

정적 import를 한 번에 받을 때도 내부 처리 순서는 아래를 따른다.

1. `G-STR-01`
2. `X-ECO-00`
3. `X-ITM-00`
4. `X-CHR-04`
5. `X-CHR-02`
6. `G-CHR-01`
7. `X-CHR-00`
8. `X-CHR-05`
9. `X-CHR-06`
10. `G-ITM-01`
11. `X-ITM-01`
12. `M03-MAP-00`
13. `M04-MAP-02`
14. `M04-MAP-03`
15. `M12-ITM-01`
16. `M12-ITM-02`
17. `X-CFG-01`
18. `M05-MAP-02`
19. `X-ECO-01`
20. `X-DLG-00`
21. `X-DLG-01`
22. `M10-STY-01`
23. `M10-STY-02`
24. `M22-MAP-*`
25. `M22-SCR-*`
26. `M13-COS-*`

## 관리자 페이지 기능 제안

### 1차 기능

- tableCode 선택
- CSV/XLSX 업로드
- 컬럼명 camelCase preview
- row validation
- dependency validation
- JSON bundle preview
- dry-run
- commit
- import batch log

### commit 결과

commit은 다음을 동시에 남긴다.

- 원본 row snapshot: `staticTableRows`
- 도메인별 collection 또는 bundle collection
- import batch log

### rollback 방식

정적 데이터 rollback은 이전 import batch의 version을 다시 active로 바꾸는 방식이 안전하다.

권장:

- 물리 삭제보다 `enabled`, `version`, `activeVersion` 사용
- 최신 active version을 바꾸는 방식
- batch별 sourceHash 보관

## 최종 권장안

1차 구현에서는 아래처럼 가는 것이 가장 안전하다.

### 저장소

- `staticDataImportBatches`
- `staticTableRows`
- `staticAidongMasters`
- `staticItemCatalogs`
- `staticAidongPediaItemMasters`
- `staticIslandZones`
- `staticCurrencyMasters`
- `staticModuleCurrencyPolicies`
- `staticBoardSets`
- `staticSooksoRuleSets`
- `staticAidongIslandBundles`
- `staticStoryBundles`
- `staticDialoguePacks`
- `staticCosmeticRuleSets`
- `staticStringPacks`

### 원칙

- 정적 master/rule만 admin table import 대상.
- 유저별 동적 데이터는 admin import 대상에서 제외.
- 단순 master는 row collection.
- 강한 의존 그래프는 JSON bundle.
- 모든 원본 row는 `staticTableRows`에 보관해 diff/rollback 근거로 사용.
- 실제 runtime API는 가능하면 bundle 또는 도메인별 collection을 읽는다.

## 다음 작업 후보

정적 데이터 구현을 시작한다면 순서는 다음이 좋다.

1. 정적 table registry 작성
   - tableCode
   - 필수 컬럼
   - primary key
   - dependency
   - 저장 target
   - JSON bundle builder 여부
2. backend model 추가
   - `StaticDataImportBatchModel`
   - `StaticTableRowModel`
   - 우선순위 높은 domain/static model
3. admin DB 관리 API 추가
   - upload validate
   - dry-run
   - commit
   - import history
4. 관리자 페이지 DB 관리 화면 연결
5. `G-CHR-01`, `G-ITM-01`, `X-ECO-00`부터 smoke 적용
