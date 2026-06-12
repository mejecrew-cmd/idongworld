# Asset Access Policy 2026-06-05

이 문서는 public asset, protected asset, signed URL 후보 흐름을 구분하기 위한 현재 기준이다.

## 기본 원칙

- DB와 module state에는 만료성 URL을 저장하지 않는다.
- DB와 CSV에는 `assetId`, `assetKey`, `category`, `visibility`, `version`만 저장한다.
- `visibility: public` 자산은 public path 또는 CDN public URL로 바로 사용할 수 있다.
- `visibility: protected` 자산은 backend 권한 확인 후 signed URL 또는 protected stream URL을 받아 사용한다.
- signed URL은 userStore, module state, DB에 장기 저장하지 않는다.
- signed URL은 화면 렌더링 시점 또는 asset resolve 시점에만 짧게 캐시한다.

## Asset Ref

코드와 데이터에서 자산은 다음 형태로 참조한다.

```ts
{
  assetId: 'shell-bg',
  category: 'backgrounds',
  assetKey: 'destination/shell/bg.png',
  visibility: 'public',
  version: '2026-06-05'
}
```

필드 의미:

- `assetId`: 코드와 데이터에서 사용하는 안정적인 id.
- `category`: `backgrounds`, `aidong`, `audio`, `ui`, `rive` 같은 자산 분류.
- `assetKey`: 저장소 내부 key 또는 public path 기준 상대 경로.
- `visibility`: `public` 또는 `protected`.
- `version`: 캐시 무효화용 버전. URL 자체가 아니다.

## URL 해석

현재 core helper 기준:

- `resolveAssetRef(public)`은 public URL을 바로 반환한다.
- `resolveAssetRef(protected)`은 URL을 반환하지 않고 `requiresSignedUrl: true`를 반환한다.
- protected 자산의 실제 signed URL 발급 API는 다음 작업에서 만든다.

## Local 개발

- local 개발에서는 `/assets` 정적 서빙을 우선 사용한다.
- protected 자산도 개발 편의를 위해 public fallback을 둘 수 있지만, production 규칙으로 간주하지 않는다.
- fallback을 쓰더라도 DB에는 fallback URL을 저장하지 않는다.

## Destination Island 적용

- `scenes.csv`의 `backgroundAssetId`는 직접 URL이 아니다.
- `hotspots.csv`의 `riveAssetId`도 직접 URL이 아니다.
- PixiJS texture, Rive `.riv`, hotspot icon은 모두 asset ref 또는 asset id를 통해 추적한다.
- 도착 섬 화면은 public asset이면 바로 URL을 사용하고, protected asset이면 backend resolve API를 기다린다.

## Backend API 후보

다음 작업에서 아래 후보 중 하나를 skeleton으로 만든다.

- `POST /api/assets/resolve`
- `GET /api/assets/signed-url`

현재 구현된 skeleton:

- `POST /api/assets/resolve`
- `GET /api/assets/signed-url`

`POST /api/assets/resolve`가 기본 선호안이다. 여러 asset ref를 한 번에 받을 수 있고, public/protected를 같은 응답 구조로 처리하기 쉽기 때문이다.

## Backend Skeleton 현황

- public asset은 `/assets/{category}/{assetKey}` URL을 즉시 반환한다.
- protected asset은 local/development fallback에서 `/assets/{category}/protected/{assetKey}` URL을 반환한다.
- production 기본값에서는 protected asset을 `pending-provider`로 표시하고 URL을 반환하지 않는다.
- `ASSET_PROTECTED_LOCAL_FALLBACK_ENABLED=true|false`로 fallback 여부를 명시할 수 있다.
- `ASSET_PUBLIC_BASE_URL`로 public URL base를 바꿀 수 있다.
- 실제 S3/CloudFront signed URL provider는 아직 연결하지 않았다.

## 변경 기록

- **2026-06-05**: asset access policy 1차 기준을 작성했다. DB에는 URL을 저장하지 않고 asset ref만 저장하며, public은 즉시 URL, protected는 signed URL resolve 대상으로 분리한다.
- **2026-06-05**: backend skeleton 기준을 추가했다. `/api/assets/resolve`와 `/api/assets/signed-url`을 사용하며, protected asset은 local fallback 또는 provider 대기 상태로 응답한다.
