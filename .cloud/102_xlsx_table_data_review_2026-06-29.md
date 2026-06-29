# 102_xlsx_table_data_review_2026-06-29

## 목적

`.cloud/[IDW]dc1-5. 아이동월드 테이블 데이터 정리문서 .xlsx`를 읽고, 관리자 페이지에서 테이블 파일을 업로드해 DB 정적 데이터를 갱신하는 작업의 기준을 정리한다.

이 문서는 다음을 구분한다.

- **정적 데이터**: 기획/운영자가 표로 관리하고 DB에 import해도 되는 기준 데이터
- **동적 데이터**: 유저 플레이, 로그인, 보유량, 진행도처럼 런타임에 계속 바뀌는 데이터
- **충돌 지점**: xlsx 명세의 동적 테이블이 현재 MongoDB schema/repository 구조와 맞지 않는 부분

## 읽은 파일

- `.cloud/[IDW]dc1-5. 아이동월드 테이블 데이터 정리문서 .xlsx`
- 시트 수: 22개
- 주요 시트:
  - `목차`
  - `통합 스키마`
  - `DBMG-광역`
  - `DBMM01 User`
  - `DBMM03섬지도`
  - `DBMM04숙소`
  - `DBMM05항해`
  - `DBMM10스토리`
  - `DBMM12`
  - `DBMM13 코스메틱`
  - `DBMM17이코노미`
  - `DBMM19 설정`
  - `DBMM21 My`
  - `DBMM22 아이동개인섬`
  - `DBMM23_MyDong`
  - `DBMX_`
  - `X-ITM-00`

## 현재 구현의 DB 큰 구조

현재 코드는 이미 “거대한 user document 하나”에서 꽤 많이 분리되어 있다.

| 현재 collection/model | 역할 |
| --- | --- |
| `users` | 로그인/가입/계정 프로필/약관/시간대/숙소 청소 여부 같은 account 성격 |
| `hostStates` | 유저 공통 재화와 전역 인벤토리: `coins`, `diamonds`, `diceCount`, `inventory` |
| `myAidongStates` | 보유 Aidong 목록, 호감도, needs, 장착 의상/아이템, Aidong 도감 수량 등 |
| `myIslandStates` | 마이섬 고정/동적 구역, Aidong 섬 편입 상태 |
| `lodgeStates` | 숙소 전용 인벤토리, 숙소 배치 Aidong, 방/가구 상태 |
| `shipStates` | 배 타입, 항구/선실/갑판 배치, 배 인벤토리, 선실 가구 |
| `routeNeighborStates` | 항해/보드 계열 로컬 자원, 도착 정보, 진행 정보 |
| `aidongIslandStates` | Aidong 개인섬 방문/노드/영입 후보 상태 |
| `destinationIslandStates` | 도착섬 노드, 미션, 전용 자원/아이템, hotspot 상태 |
| `zoneStates` | 모듈별 구역 전용 자원, 클리어 수, 진행 상태 |
| `codexStates` | 도감/다이어리 해금 상태 |
| `adminUsers`, `adminAuditLogs` | 관리자 권한과 감사 로그 |

주의할 점:

- 현재 Mongo field는 대체로 `camelCase`다. 예: `uid`, `createdAt`, `diceCount`
- xlsx 명세는 대체로 `snake_case`다. 예: `user_uid`, `created_at`, `dice_quantity`
- 따라서 테이블 import 시에는 반드시 **컬럼명 매핑 계층**이 필요하다.

## xlsx의 핵심 테이블 분류

### 1. 정적 데이터로 보는 것이 맞는 테이블

관리자 페이지에서 CSV 업로드 → 검증 → JSON preview → DB 반영 흐름으로 만들기 좋은 대상이다.

| 코드 | 영문명 | 성격 | 메모 |
| --- | --- | --- | --- |
| `G-CHR-01` | `aidong_master` | 정적 마스터 | Aidong 원형 671종. `aidong_id`가 부모 키 |
| `X-CHR-00` | `aidong_index` | 정적 기준/리소스 | Aidong 인덱스 |
| `X-CHR-02` | `aidong_animal_taxonomy` | 정적 기준 | 동물형 분류 |
| `X-CHR-04` | `aidong_icon_master` | 정적 리소스 | Aidong 대표/프로필/표정/전신 이미지 |
| `X-CHR-05` | `aidong_persona_part_slot_master` | 정적 기준 | 페르소나 파츠 슬롯 |
| `X-CHR-06` | `aidong_persona_part_default` | 정적 기준 | Aidong 기본 파츠값 |
| `G-ITM-01` | `item_catalog` | 정적 마스터 | 실제 게임 아이템 카탈로그 |
| `X-ITM-00` | `item_icon_master` | 정적 리소스 | 아이템 아이콘 풀, 2832행 |
| `X-ITM-01` | `aidong_pedia_item_master` | 정적 마스터 | Aidong별 도감템 슬롯 정의 |
| `G-STR-01` | `string_table` | 정적 마스터 | 모듈/페이지별 분리 운용 권장 |
| `M03-MAP-00` | `island_zones` | 정적 마스터 | 마이섬 15구역 정의 |
| `M04-MAP-02` | `house_master` | 정적 마스터 | 숙소 집 5종 기준 |
| `M04-MAP-03` | `room_placement_slot` | 정적 마스터 | 방 내부 고정 배치 슬롯 |
| `M12-ITM-01` | `furniture_item_master` | 정적 마스터 | 가구/벽지/바닥/조명/소품 정의 |
| `M12-ITM-02` | `furniture_slot_rule` | 정적 규칙 | 가구 배치 슬롯 규칙 |
| `M05-MAP-02` | `board_slot` | 정적 마스터 | 페이즈1 보드 칸별 보상 정의 |
| `X-CFG-01` | `board_set_master` | 정적 마스터 | 보드 세트/버전 헤더 |
| `X-ECO-00` | `currency_master` | 정적 마스터 | 금화/조개/무료 다이아/유료 다이아 등 |
| `X-ECO-01` | `module_currency_policy` | 정적 정책 | 모듈별 사용 재화 정책 |
| `X-DLG-00` | `phase1_daily_dialogue` | 정적 콘텐츠 | 페이즈1 평상시 대사 |
| `X-DLG-01` | `aidong_daily_dialogue_template` | 정적 콘텐츠 | Aidong별 대사 구조 |
| `M10-STY-01/02` | personal story master/episode | 정적 콘텐츠 | Aidong 개인 이야기 |
| `M22-MAP-*`, `M22-SCR-*` | Aidong 개인섬 맵/핫스팟/스크립트/조건/효과 | 정적 콘텐츠/규칙 | 런타임 상태와 분리해서 import 가능 |
| `M13-COS-*` 중 master/rule 계열 | cosmetic slot/item/fit/render rule | 정적 마스터/규칙 | 착용 상태는 동적 |

이 그룹은 관리자 페이지의 “DB 관리 > 정적 테이블 업로드” 1차 대상으로 적합하다.

권장 저장 방식:

- 원본 편집: Excel/Google Sheets 가능
- 서버 반영용: CSV
- DB 저장: table별 collection 또는 `staticDataSnapshots`/`staticDataTables` 같은 버전형 collection
- import 키: `tableCode`, `version`, `rows`, `sourceFile`, `importedAt`, `importedBy`

### 2. 동적 데이터로 보는 것이 맞는 테이블

아래는 유저별로 계속 바뀌므로 “정적 데이터 import” 대상이 아니다. 관리자 페이지에서 다루더라도 별도 API/권한/검증 로직이 필요하다.

| 코드 | 영문명 | 성격 |
| --- | --- | --- |
| `G-USR-01` | `users` | 유저 계정 본체 |
| `M01-USR-01` | `provider_accounts` | 소셜/패스워드 provider 연동 상태 |
| `M01-USR-02` | `auth_sessions` | 로그인 세션/자동 로그인 |
| `M01-SYS-03` | `withdrawal` | 탈퇴 요청/처리 상태 |
| `G-CHR-02` | `mydong_list` | 유저가 실제 보유한 Aidong 개체 |
| `G-ITM-02` | `user_inventory` | 유저별 일반 아이템 보유 수량 |
| `M04-MAP-00` | `sookso_main` | 유저 1명의 숙소 현재 상태 |
| `M04-MAP-01` | `room_slots` | 유저별 숙소 방 슬롯 1~15 상태 |
| `M04-ITM-01` | `room_furniture` | 유저별 방 가구 배치 상태 |
| `M05-ECO-01` | `dice_resource` | 유저별 주사위 자원 |
| `M05-MAP-01` | `board_run` | 유저별 보드 진행 상태 |
| `M17-ECO-01` 계열 | user currency balance/history 후보 | 유저별 재화 잔액/변동 이력 |
| `M19-USR-01` | `user_settings` | 푸시/사운드/접근성 설정 |
| `M23-USR-01` | `mydong_view_state` | 마이동 화면 UI 상태 |
| `M23-ITM-01` | `mydong_pedia_inventory` | 마이동별 도감템 보유 수량 |
| `M13-PRS-02` | `mydong_persona_part_state` | 마이동 외형 파츠 상태 |
| `M13-COS-03` | `user_cosmetic_inventory` | 유저 코스메틱 보유 |
| `M13-COS-04` | `mydong_cosmetic_loadout` | 마이동 코스메틱 착용 |
| `M10-USR-01` | `user_daily_story_state` | 오늘의 개인 이야기 진행 상태 |
| `M22-USR-*` 후보 | Aidong 개인섬 진행/스위치/방문 상태 | 유저별 개인섬 진행 |

## 동적 데이터와 현재 DB 구조의 충돌 분석

### A. `G-USR-01 users` vs 현재 `users`

xlsx 명세:

- `user_uid`
- `created_at`, `updated_at`
- `last_login_at`
- `last_login_provider`
- `status`
- `is_guest`
- `guest_local_save_id`
- `guest_bind_pending`
- `timezone`
- `aidong_time_base`
- `locale`
- `terms_agreed_version`, `terms_agreed_at`
- `privacy_agreed_version`, `privacy_agreed_at`

현재 구현:

- `uid`
- `createdAt`, `updatedAt`
- `isGuest`
- `authProvider`, `providerUid`
- `loginId`, `loginIdNormalized`, `passwordHash`
- `email`, `emailNormalized`, `emailVerified`
- `nickname`, `nicknameNormalized`
- `timeZone`, `detectedTimeZone`, `utcOffsetMinutes`
- `termsAgreements` object
- `sooksoName`, `sooksoClean`, `openingSeen`, `onboardingComplete`
- `soundSettings`
- legacy/호환성 성격의 `coins`, `diamonds`, `inventory`, `diceCount`

충돌/차이:

- `user_uid`와 `uid`가 다르다. import mapping 필요.
- `created_at`/`updated_at`은 현재 `createdAt`/`updatedAt` number timestamp로 저장한다.
- `status`가 현재 없다. 탈퇴/휴면까지 하려면 추가 필요.
- `last_login_at`, `last_login_provider`가 현재 명확히 저장되지 않는다.
- `locale`이 현재 없다.
- 약관은 xlsx가 version/time을 평면 필드로 두고, 현재는 `termsAgreements` 객체에 `serviceTermsVersion`, `privacyPolicyVersion`, `marketingAccepted`, `pushNotificationAccepted`, `agreedAt` 등으로 저장한다.
- xlsx의 `aidong_time_base`는 현재 없다.

판정:

- **부분 충돌**.
- 지금 구조를 유지하려면 xlsx의 users 필드는 바로 덮어쓰기 import하면 안 된다.
- `users`는 정적 import 대상이 아니라 계정 API/migration 대상이다.

### B. `M01-USR-01 provider_accounts` vs 현재 인증 구조

xlsx 명세:

- provider 계정별 row를 따로 둔다.
- 핵심 unique: `provider_code + provider_subject_id`
- provider별 email/displayName/token status/snapshot을 저장한다.

현재 구현:

- Firebase/social/password 인증 정보를 대부분 `users` 문서에 직접 저장한다.
- `authProvider`, `providerUid`, `loginId`, `passwordHash`, `email` 등이 `users`에 있다.
- 별도 `providerAccounts` collection이 없다.

충돌/차이:

- xlsx는 한 유저가 여러 provider를 연결할 수 있는 구조다.
- 현재는 사실상 user 1문서 안에 대표 provider 중심으로 저장한다.
- 추후 “로그인 이후 다른 소셜 ID 연결” 기능을 제대로 하려면 현재 구조가 부족하다.

판정:

- **강한 구조 충돌**.
- 단기적으로는 현재 구조 유지 가능.
- 장기적으로는 `providerAccounts` collection을 새로 만들고, `users.providerUid/authProvider`는 캐시 또는 migration 호환 필드로 내려야 한다.

### C. `M01-USR-02 auth_sessions` vs 현재 세션 구조

xlsx 명세:

- 세션 row를 DB에 저장한다.
- `session_token_hash`, `expires_at`, `status`, `revoked_at`, device/app info 등을 둔다.

현재 구현:

- Firebase ID token 또는 password session token을 사용한다.
- password token은 클라이언트 localStorage와 서버 검증 흐름에 기대며, 별도 세션 collection이 없다.
- 항해 세션은 DB가 아니라 브라우저 세션 단위로 운용하기로 결정했다.

충돌/차이:

- xlsx는 로그인 세션을 DB에서 관리하는 구조다.
- 현재는 Firebase/Admin token 검증과 password token 중심이며 DB 세션 테이블이 없다.

판정:

- **보안/인증 정책 결정 필요**.
- Firebase 세션 쿠키나 서버 세션을 정식 도입한다면 `authSessions` 도입 가능.
- 지금 바로 정적 import 대상은 절대 아니다.

### D. `G-ITM-02 user_inventory` vs 현재 `hostStates.inventory`

xlsx 명세:

- 유저별 아이템 보유를 row 단위로 저장한다.
- 예상 키: `user_inventory_uid`, `user_uid`, `item_id`, `quantity`

현재 구현:

- `hostStates.inventory: Record<string, number>`
- 예: `{ "basic_food": 2, "aidong-ribbon": 1 }`

충돌/차이:

- xlsx는 normalized row 구조.
- 현재는 한 유저의 전체 인벤토리를 object map으로 저장한다.
- 대량 검색/관리/통계는 xlsx 방식이 유리하고, 단순 조회/수정은 현재 방식이 쉽다.

판정:

- **구조 충돌**.
- 당장 import하지 말 것.
- 관리자 지급/차감 API는 현재 `hostStates.inventory`를 기준으로 유지.
- 장기적으로 `userInventoryItems` collection을 만들지 여부 결정 필요.

### E. `X-ECO-00 currency_master`, `M17-ECO` 계열 vs 현재 `hostStates`

xlsx 명세:

- 재화를 `currency_id`로 정의한다.
- 금화, 조개, 무료 다이아, 유료 다이아, 이벤트 재화 등을 분리할 수 있다.
- 모듈별 사용 재화 정책 `module_currency_policy`가 있다.

현재 구현:

- `hostStates.coins`
- `hostStates.diamonds`
- `hostStates.diceCount`
- `gems`는 제거하고 `diamonds`로 통일한 상태.

충돌/차이:

- xlsx는 재화 종류가 확장 가능한 dictionary 구조.
- 현재는 `coins`, `diamonds`, `diceCount` hard-coded numeric field 구조.
- 무료/유료 다이아 분리도 현재 없다.
- 조개 등 모듈 재화도 현재 `hostStates`에 없다.

판정:

- **중장기 충돌 가능성이 큼**.
- `currency_master`와 `module_currency_policy`는 정적 import 가능.
- 다만 유저 잔액은 현재 `hostStates`와 충돌하므로 별도 migration 설계가 필요하다.

### F. `M05-ECO-01 dice_resource` vs 현재 `hostStates.diceCount`

xlsx 명세:

- 주사위 자원 전용 테이블.
- `dice_quantity`, `max_dice_quantity`, `charge_interval_min`, `next_charge_at`, `last_charged_at`, `daily_roll_count`, `daily_roll_date`, `last_server_roll_id`

현재 구현:

- `hostStates.diceCount`
- `shipStates.harborLastChargedAt` 또는 일부 legacy `harborLastChargedAt`
- 주사위 차감/증가는 host resource mutation과 모듈 action에서 처리.

충돌/차이:

- 현재는 주사위가 단순 숫자다.
- xlsx는 주사위 충전, 일일 횟수, 중복 방지 id까지 별도 도메인으로 본다.

판정:

- **기능 확장 충돌**.
- 단기: `hostStates.diceCount` 유지 가능.
- 충전/일일제한/중복방지를 하려면 `diceResource` dedicated collection 또는 `hostStates.dice` nested object로 확장 필요.

### G. `M05-MAP-01 board_run` vs 현재 항해/보드 세션 정책

xlsx 명세:

- 유저별 보드 진행 상태를 DB에 저장한다.
- `current_slot_no`, `lap_count`, `total_roll_count`, `last_roll_value`, `last_arrived_slot_no`, `run_status`

현재 최근 결정:

- 항해 중/항구 정박 여부는 DB가 몰라야 한다.
- 현재 위치 칸 등 항해 중 정보는 DB가 아니라 브라우저 세션에 둔다.
- 주사위 소모/보상 같은 자원 증감만 DB에 기록한다.

충돌/차이:

- xlsx의 `board_run.current_slot_no`는 DB에 현재 칸을 저장한다.
- 현재 정책은 항해 세션 위치를 DB에 저장하지 않는 쪽이다.

판정:

- **정책 충돌**.
- 만약 `M05-MAP-01 board_run`이 “항해 중 임시 보드”라면 현재 정책과 충돌하므로 DB에 만들면 안 된다.
- 만약 `M05-MAP-01 board_run`이 “항해가 아닌 영구 페이즈1 보드 이벤트”라면 별도 기능으로 도입 가능하다.
- 이 부분은 기획상 “항해 보드”와 “페이즈1 보드 이벤트”를 분리해서 이름을 정해야 한다.

### H. `M04-MAP-00/01`, `M04-ITM-01` vs 현재 `lodgeStates`

xlsx 명세:

- `sookso_main`: 숙소 현재 집 타입, 레벨, 외관, 최근 진입
- `room_slots`: 유저별 1~15 방 슬롯 row
- `room_furniture`: 방 슬롯과 배치 위치에 놓인 가구 row

현재 구현:

- `users.sooksoName`, `users.sooksoClean`
- `lodgeStates.lodgeInventory`
- `lodgeStates.assignedAidongs`
- `lodgeStates.rooms: Record<string, unknown>`
- `lodgeStates.furniture: Record<string, unknown>`

충돌/차이:

- xlsx는 숙소를 여러 normalized table로 분리한다.
- 현재는 `lodgeStates` 한 문서에 mixed object로 묶어 저장한다.
- 방 1~15 슬롯 구조가 명시적으로 schema화되어 있지 않다.
- `sooksoName/sooksoClean`은 현재 account 쪽에 있고, xlsx `sookso_main`에는 이름/청소 여부가 명확히 들어 있지 않다.

판정:

- **구조 충돌**.
- 단기적으로는 `lodgeStates.rooms/furniture` 안에 xlsx 구조를 JSON으로 흡수할 수 있다.
- 장기적으로 방 슬롯/가구 배치를 admin에서 정밀 관리하려면 `lodgeRooms`, `lodgeFurniturePlacements` 같은 별도 collection으로 분리하는 편이 낫다.

### I. `G-CHR-02 mydong_list` vs 현재 `myAidongStates.recruitedAidongs`

xlsx 명세:

- Aidong 원형 ID와 별도로 `mydong_uid`라는 유저 보유 개체 ID가 있다.
- 같은 Aidong 원형이라도 유저가 가진 개체는 `mydong_uid`로 구분한다.
- 다른 테이블들이 `mydong_uid`를 참조한다.

현재 구현:

- `myAidongStates.recruitedAidongs: string[]`
- `AidongCharacterId`는 단순 string.
- 대체로 `characterId`/`aidong_id`를 그대로 보유 목록처럼 사용한다.
- `mydong_uid` 개념이 없다.

충돌/차이:

- xlsx는 “원형 Aidong”과 “내가 가진 Aidong 개체”를 분리한다.
- 현재는 둘이 섞여 있다.
- 도감템, 방 배정, 개인섬, 코스메틱, 호감도까지 `mydong_uid` 기준으로 확장하려면 현재 구조가 부족하다.

판정:

- **가장 큰 핵심 충돌**.
- 앞으로 Aidong을 여러 개체로 다루려면 `mydong_uid` 도입이 필요하다.
- 단기 임시: `mydong_uid === aidong_id`로 매핑하는 compatibility layer를 둘 수 있다.
- 장기 권장: `mydongList`/`mydongStates` collection 도입.

### J. `M23-ITM-01 mydong_pedia_inventory` vs 현재 `myAidongStates.aidongCodexItems`

xlsx 명세:

- `mydong_uid + pedia_item_id`별 수량 row
- `aidong_id`, `slot_no`, `quantity`, `max_quantity`, 획득 시각/출처를 저장

현재 구현:

- `myAidongStates.aidongCodexItems: Record<string, Record<string, number>>`
- 대략 `characterId -> itemId -> quantity` 형태.

충돌/차이:

- xlsx는 `mydong_uid`와 `pedia_item_id` 기반.
- 현재는 string map 기반이고, 획득 시각/출처/max quantity가 없다.

판정:

- **구조 충돌**.
- 단기: 현재 map 구조 유지 가능.
- 장기: 마이동 개체/도감템을 제대로 관리하려면 row collection 또는 nested structured object로 migration 필요.

### K. `M19-USR-01 user_settings` vs 현재 `users.soundSettings`

xlsx 명세:

- `push_enabled`, `push_care_enabled`, `push_event_enabled`, `marketing_push_enabled`
- `sound_enabled`, `bgm_volume`, `sfx_volume`
- `vibration_enabled`, `reduce_motion_enabled`, `text_size_level`, `color_assist_mode`, `battery_save_enabled`

현재 구현:

- `users.soundSettings: { bgmVolume, sfxVolume }`
- 약관/마케팅/푸시 동의는 `users.termsAgreements` 안에 있음.

충돌/차이:

- 현재는 사운드만 account 문서에 저장한다.
- xlsx는 설정 전용 테이블을 따로 둔다.
- marketing/push는 약관 동의와 user settings 양쪽에서 의미가 다르므로 분리 기준이 필요하다.

판정:

- **부분 충돌**.
- 당장 `bgm_volume/sfx_volume -> users.soundSettings.bgmVolume/sfxVolume`로 매핑 가능.
- 푸시/접근성/절전 모드를 추가하려면 `userSettings` collection 또는 `users.settings` nested object를 새로 설계해야 한다.

### L. `M13` 코스메틱 계열 vs 현재 장착 구조

xlsx 명세:

- `user_cosmetic_inventory`
- `mydong_cosmetic_loadout`
- `mydong_persona_part_state`

현재 구현:

- `myAidongStates.equippedOutfit`
- `myAidongStates.equippedItems`
- `myAidongStates.aidongUpgradeState`
- `hostStates.inventory`

충돌/차이:

- 현재는 단순 장착 map.
- xlsx는 코스메틱 보유/착용/핏 규칙/렌더 파츠를 분리한다.

판정:

- **미구현 영역에 가까움**.
- 정적 master/rule은 import 가능.
- 유저 보유/착용은 별도 API와 schema가 필요하다.

## 관리자 페이지 DB 업데이트 관점의 권장 분리

### 1차로 만들면 좋은 기능

`DB 관리` 메뉴 아래에 아래 흐름을 만든다.

1. 테이블 선택
2. CSV 업로드
3. 컬럼 검증
4. JSON 변환 미리보기
5. FK/중복/필수값 검증
6. dry-run 결과 표시
7. DB 반영
8. import log 기록

1차 대상은 정적 테이블만으로 제한한다.

추천 1차 대상:

- `G-CHR-01 aidong_master`
- `X-CHR-02 aidong_animal_taxonomy`
- `X-CHR-04 aidong_icon_master`
- `G-ITM-01 item_catalog`
- `X-ITM-00 item_icon_master`
- `X-ITM-01 aidong_pedia_item_master`
- `G-STR-01 string_table`
- `M03-MAP-00 island_zones`
- `M04-MAP-02 house_master`
- `M04-MAP-03 room_placement_slot`
- `M05-MAP-02 board_slot`
- `X-CFG-01 board_set_master`
- `X-ECO-00 currency_master`
- `X-ECO-01 module_currency_policy`

### 1차에서 제외해야 하는 기능

아래 테이블은 정적 import처럼 다루면 유저 데이터를 덮어쓸 위험이 있다.

- `users`
- `provider_accounts`
- `auth_sessions`
- `withdrawal`
- `mydong_list`
- `user_inventory`
- `dice_resource`
- `board_run`
- `sookso_main`
- `room_slots`
- `room_furniture`
- `user_settings`
- `mydong_view_state`
- `mydong_pedia_inventory`
- 모든 user cosmetic inventory/loadout/state 계열

이 그룹은 “DB 정적 데이터 업데이트”가 아니라 “운영 API/마이그레이션/API action”으로 다뤄야 한다.

## 테이블 → DB JSON 매핑 원칙

### 정적 데이터

정적 데이터는 다음 형태가 안전하다.

```ts
interface StaticDataImportBatch {
  tableCode: string
  tableName: string
  version: string
  sourceFileName: string
  sourceHash: string
  rows: Array<Record<string, unknown>>
  importedBy: string
  importedAt: number
}
```

각 row는 CSV 컬럼명을 camelCase로 변환해 저장한다.

예:

```csv
aidong_id,default_name,animal_id,default_icon_id
AIDONG-0001,루미돼지,ANM-0001,AICON-000001
```

DB JSON:

```json
{
  "aidongId": "AIDONG-0001",
  "defaultName": "루미돼지",
  "animalId": "ANM-0001",
  "defaultIconId": "AICON-000001"
}
```

### 동적 데이터

동적 데이터는 CSV import로 직접 upsert하지 않는다.

대신:

- 관리자 지급/차감 API
- 계정 수정 API
- 마이그레이션 스크립트
- 모듈별 action API
- 전용 운영 도구

를 통해서만 수정한다.

## 최종 판단

### 바로 진행 가능한 것

- 정적 테이블 import 시스템 설계
- CSV 업로드/검증/preview API
- `staticDataImports` 또는 `staticDataTables` collection 추가
- 정적 테이블별 mapping preset 정의
- 관리자 페이지 `DB 관리` 메뉴에 정적 데이터 업로드 화면 연결

### 먼저 결정해야 하는 것

1. 정적 데이터를 table별 collection으로 나눌지, 하나의 `staticDataTables` collection에 `tableCode`로 넣을지
2. CSV 컬럼명은 xlsx의 snake_case를 유지할지, import 시 camelCase로 변환할지
3. `mydong_uid`를 도입할지, 단기적으로 `aidong_id === mydong_uid` 호환을 둘지
4. 유저 인벤토리를 계속 `hostStates.inventory` map으로 둘지, `userInventoryItems` row collection으로 분리할지
5. 재화를 `coins/diamonds/diceCount` 고정 필드로 유지할지, `currencyBalances` 구조로 확장할지
6. `M05-MAP-01 board_run`이 DB에 남는 영구 보드 진행인지, 항해 세션 위치인지
7. 숙소 방/가구를 계속 `lodgeStates.rooms/furniture` mixed object로 둘지, `room_slots`/`room_furniture` collection으로 분리할지

## 요약

- xlsx는 정적 마스터와 유저 동적 상태가 한 문서 안에 같이 들어 있다.
- 관리자 페이지에서 테이블 파일로 DB를 업데이트하려면 **정적 데이터만 먼저 허용**해야 한다.
- 동적 데이터는 현재 DB schema와 충돌하는 곳이 많다.
- 특히 `mydong_uid`, `user_inventory`, `currency`, `dice_resource`, `board_run`, `room_slots`, `user_settings`는 현재 구현과 직접 충돌하거나 아직 구현되지 않은 구조다.
- 따라서 1차 작업은 “정적 테이블 import 기반”으로 만들고, 동적 테이블은 별도 next_work로 schema/API migration을 나눠야 한다.
