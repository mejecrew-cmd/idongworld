# Lodge/Ship Decor Schema 정책

작성일: 2026-06-05

이 문서는 숙소와 배 선실 꾸미기 아이템의 catalog, 구매 수량, 배치 상태를 어디에 저장할지 정리한다.

## 확정 기준

- 꾸미기 아이템 catalog는 코드 상수가 아니라 각 모듈의 `decor.csv`에서 정의한다.
- 구매 비용, 기본 보유량, 배치 가능 위치는 `decor.csv`가 권위다.
- backend service는 `packages/backend/src/modules/decorCatalog.ts`를 통해 `decor.csv`를 읽는다.
- frontend는 구매/배치를 직접 계산하지 않고 backend action API 응답을 따른다.
- `decor.csv`를 추가하거나 수정하면 `pnpm audit:module-decor`를 통과해야 한다.
- item/customs catalog까지 함께 확인할 때는 `pnpm audit:module-catalogs`를 사용한다.

## 숙소 decor

Catalog:

- `packages/modules/lodge/decor.csv`

State:

- `lodgeStates.furniture`: 구매한 숙소 가구 수량.
- `lodgeStates.rooms`: 방별 배치 상태.

API:

- `POST /api/modules/lodge/furniture/purchase`
- `POST /api/modules/lodge/rooms/furniture/toggle`

주의:

- 기본 보유 가구는 `decor.csv.defaultOwned`로 계산한다.
- 구매 수량보다 많이 배치할 수 없다.
- 방 자체는 Aidong이 없어도 꾸밀 수 있다.

## 선실 decor

Catalog:

- `packages/modules/ship/decor.csv`

State:

- `shipStates.cabinFurniture`: 구매한 선실 가구 수량.
- `shipStates.cabins[slotId].furniture`: 선실별 배치 상태.

API:

- `POST /api/modules/ship/cabins/furniture/purchase`
- `POST /api/modules/ship/cabins/furniture/toggle`

주의:

- 기존 임시 `shipStates.cabins.__furnitureInventory`는 정식 구매 수량 필드로 사용하지 않는다.
- backend는 읽기 호환을 위해 legacy `__furnitureInventory` 값을 fallback으로 병합할 수 있다.
- 새 구매는 반드시 `shipStates.cabinFurniture`에 저장한다.
- 빈 선실도 꾸밀 수 있다.
- 선실 가구 효과는 현재 능력치나 cargo capacity에 영향을 주지 않는다.

## 보류

- decor item의 효과 수치.
- 선실/숙소 가구 배치 위치 좌표.
- 가구 회수/판매.
- legacy `cabins.__furnitureInventory` 완전 제거 migration.

## 변경 기록

- **2026-06-05**: 최초 작성. 숙소/선실 decor catalog를 `decor.csv`로 분리하고, 선실 구매 수량을 `shipStates.cabinFurniture`로 승격했다.
- **2026-06-05**: `pnpm audit:module-decor`와 `pnpm audit:module-catalogs` 검증 기준을 추가했다. manifest decor 선언, `decor.csv` 파일 존재, 필수 column, 비용/기본 보유량/배치 범위를 점검한다.
