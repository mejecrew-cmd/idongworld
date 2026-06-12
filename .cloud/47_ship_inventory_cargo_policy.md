# Ship Inventory/Cargo 정책

작성일: 2026-06-05

이 문서는 항해/배 모듈의 적재 상태를 어떤 document와 필드에 저장할지 정리한다.

## 확정 기준

- 배는 여러 척을 동시에 보유하지 않고, 현재 사용하는 `shipTypeId`만 가진다.
- 배 종류별 선실 수, 갑판 수, 적재 한도는 `packages/modules/ship/balance.csv`에서 정의한다.
- `cargoCapacity`는 `shipStates`에 저장하지 않는다.
- backend는 현재 `shipTypeId`로 ship type config를 읽고 `cargoCapacity`를 계산한다.
- 배에 실린 자원의 권위 원장은 `shipStates.shipInventory`다.
- destination island에서 배로 싣는 자원은 customs를 통해 `shipInventory`로 들어간다.
- 배에서 숙소 또는 전역 보관소로 내리는 자원도 customs를 통해 `shipInventory`에서 빠진다.

## 필드 책임

`shipInventory`

- 배 적재 자원의 권위 필드다.
- `ship` resource adapter의 대표 resource field다.
- customs source/target으로 사용한다.
- 현재는 cargo/material kind를 모두 합산해 적재량으로 본다.

`cargoCapacity`

- 저장 필드가 아니라 계산값이다.
- `packages/modules/ship/balance.csv`의 현재 `shipTypeId` 행에서 읽는다.
- customs가 `shipInventory`에 credit할 때 초과 적재를 막는 기준이다.

`cargo`

- legacy/예약 필드다.
- 현재 적재 수량 원장으로 사용하지 않는다.
- 추후 cargo run 상세 구조가 필요하면 재사용 여부를 다시 결정한다.

`cabinAssignments`, `deckAssignments`

- Aidong 선실/갑판 배치를 저장한다.
- 현재는 적재량 보너스를 주지 않는다.
- 선실/갑판 효과가 `cargoCapacity`에 영향을 줄지는 기획 확정 뒤 결정한다.

## Customs 정책

- `destination-shell-island` 같은 도착 섬 모듈은 자기 `localResources`를 소유한다.
- 도착 섬 자원을 배로 옮기려면 해당 모듈의 `customs.csv`에서 `toModule=ship` rule을 정의한다.
- `ship/customs.csv`는 배 인벤토리에서 숙소 또는 전역 보관소로 내보내는 rule을 가진다.
- `shipInventory` credit 시 현재 적재량 합계가 `cargoCapacity`를 넘으면 backend에서 실패시킨다.
- 실패한 customs transfer는 debit rollback을 수행해야 한다.

## 현재 보류

- `shipInventory` 안에서 cargo와 material을 다른 capacity bucket으로 나눌지 여부.
- 선실/갑판 배치 효과가 cargo capacity에 보너스를 주는지 여부.
- legacy `cargo` 필드를 삭제할지, 상세 cargo run 구조로 재사용할지 여부.

## 변경 기록

- **2026-06-05**: 최초 작성. `shipInventory`를 배 적재 원장으로 확정하고, `cargoCapacity`를 ship balance 기반 계산값으로 정리했다.
