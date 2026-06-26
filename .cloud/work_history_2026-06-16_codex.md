# Work History - 2026-06-16 Codex

## Scope

항해/항구 UI에서 실제 이동 목적지와 표시 라벨이 어긋나던 문제, 하단 네비 항해 토글 활성 문제, 항구 지원 배치와 선실/갑판 배치 사이의 배타 규칙 UI 문제를 수정했다.

## Change Summary

- 항해 보드의 시작/도착 칸을 `마이섬`이 아니라 `항구`로 표시하도록 변경.
- 항해 복귀 버튼 문구를 `마이섬 복귀`에서 `항구 복귀`로 변경.
- route-neighbor landing candidate의 home 칸 메타를 항구 복귀 기준으로 변경.
  - `label: 항구`
  - `landingModuleId: ship`
  - `action: return-harbor`
  - `screenPath: /island/harbor`
- 하단 네비에서 `/island/harbor` 진입 시 `마이섬`이 아니라 `항해` 탭이 활성화되도록 변경.
- 항구 화면에서 항구 지원 배치와 선실/갑판 승선 배치가 동시에 선택되지 않도록 UI 방어를 추가.
  - 항구 지원 중인 아이동은 `배치할 아이동` 목록에서 선택 불가.
  - 이미 선실/갑판에 탄 아이동은 `승선 중`으로 표시하고 선택 불가.
  - 선택된 아이동이 항구 지원/승선 상태가 되면 자동 선택 해제.
  - 남은 선택값으로 잘못된 배치 요청이 나가지 않도록 배치 직전 방어 추가.
- 개발 카탈로그의 보드 슬롯 설명도 항구 기준으로 변경.

## Changed Files

- `packages/backend/src/modules/route-neighbor/landing.ts`
- `packages/frontend/src/components/BottomNav.tsx`
- `packages/frontend/src/data/board.ts`
- `packages/frontend/src/screens/HarborScene.tsx`
- `packages/frontend/src/screens/NavigationBoardScene.tsx`
- `packages/frontend/src/screens/dev/AssetCatalogScreen.tsx`

## Verification

- `pnpm.cmd --filter frontend typecheck` 통과.
- `pnpm.cmd --filter backend typecheck` 통과.

## Notes

- backend의 핵심 규칙은 원래부터 배타 배치가 맞았다. 아이동은 `항구 지원`과 `선실/갑판 승선`에 동시에 들어갈 수 없다.
- 이번 수정의 핵심은 backend 규칙에 맞춰 frontend 선택 상태와 탭 표시가 헷갈리지 않도록 맞춘 것이다.

## Follow-up Change - My Island Anchor Alignment

- Added zone lookup helpers in `packages/frontend/src/data/zones.ts` so screens can reuse the same My Island area metadata as the full map.
- Aligned anchor labels across My Island screens:
  - `AREA-02 · anchor 구역` for Harbor.
  - `AREA-13 · anchor 구역` for Lodge.
  - Hub action buttons now show the same area/anchor metadata used by the full map.
- Made Harbor, Lodge, and Hub hero sections more responsive:
  - Mobile uses a taller `4/3` hero ratio.
  - Desktop keeps the wider cinematic ratio.
  - Overlay badges use responsive spacing and wrap instead of fixed-only positioning.
- Replaced Hub character sizing based on `window.innerWidth` with responsive MUI breakpoint logic.
- Reused `getZoneKindLabel` in full map and placeholder area screens so anchor/fillable labels stay consistent.
- Verification: `pnpm.cmd --filter frontend typecheck` passed.

## Follow-up Change - Visible Anchor UI

- Made My Island Hub anchor UI more visible:
  - Replaced small hero chips with larger clickable anchor dock items.
  - `AREA-02` Harbor and `AREA-13` Lodge now show area number, name, anchor label, and phase inside the hero.
- Updated Voyage board UI to show the Harbor anchor context:
  - Center status panel now shows `AREA-02 출발 anchor`.
  - When the current slot is Harbor, the center panel shows `AREA-02`, `anchor 구역`, and phase metadata.
  - The perimeter Harbor tile now carries an `AREA-02` badge.
- Verification: `pnpm.cmd --filter frontend typecheck` passed.

## Follow-up Change - Replace Hub Canvas With Map UI

- Replaced the My Island Hub hero background canvas with a visible 15-zone map board.
- Anchor zones now appear directly inside the Hub board instead of as small overlays on the old background:
  - `AREA-02` Harbor is highlighted as an anchor tile.
  - `AREA-13` Lodge is highlighted as an anchor tile.
- Added a right-side Hub panel for anchor shortcuts and current Aidong status.
- Removed the old single background-image feeling from the Hub first viewport.
- Added a prominent `AREA-02` Harbor anchor launch header above the Voyage board.
- Verification: `pnpm.cmd --filter frontend typecheck` passed.

## Follow-up Change - Game Viewport Anchor/Crop

- Corrected the interpretation of "anchor" to mean game viewport anchoring, not zone metadata.
- My Island Hub now uses a fixed-width `1180px` stage centered in an overflow-hidden viewport.
  - When the window narrows, the stage no longer reflows to fill the screen.
  - The viewport crops the left and right sides from the center anchor.
- Voyage board now uses a fixed-width `860px` board stage centered in an overflow-hidden viewport.
  - The route board and Harbor launch header keep their board proportions.
  - Narrow windows crop the board instead of shrinking/rearranging it.
- Verification: `pnpm.cmd --filter frontend typecheck` passed.

## Follow-up Change - Top UI Stage Anchor

- Added `packages/frontend/src/theme/gameStage.ts` with shared `GAME_STAGE_WIDTH = 1180`.
- Updated the top HUD to use a fixed-width centered game stage instead of stretching with viewport `left/right`.
- Updated `ScreenHeader` to use the same fixed-width centered stage.
- Updated `BottomNav` to use the same fixed-width centered stage.
- This makes the status/header/button layer follow the same center-anchor crop behavior as the game board.
- Verification: `pnpm.cmd --filter frontend typecheck` passed.

## Follow-up Change - Consolidated Stage Layout

- Added shared `GameStage` component for fixed-width center-anchored stage/crop layout.
- Replaced ad hoc Hub stage positioning with `GameStage`.
- Replaced ad hoc Voyage header, Harbor launch panel, board, and ship menu positioning with `GameStage`.
- Added `VOYAGE_BOARD_STAGE_WIDTH = 860` next to the shared `GAME_STAGE_WIDTH = 1180`.
- The affected UI now uses one consistent stage anchoring pattern instead of multiple local implementations.
- Verification: `pnpm.cmd --filter frontend typecheck` passed.

## Follow-up Change - Restore Hub Interior

- Restored the My Island Hub interior content to the original full-shot composition:
  - Warm harbor background image.
  - Floating recruited Aidong characters.
  - Welcome badge, recruitment chips, Harbor, full map, Lodge, diary, debut, and debug actions.
- Kept the restored Hub content inside the shared fixed-width `GameStage`.
  - The Hub now preserves the center-anchor crop behavior without replacing the interior with the 15-zone map UI.
- Removed the temporary Hub map-board imports and zone shortcut layout.
- Verification: `pnpm.cmd --filter frontend typecheck` passed.

## Follow-up Change - Harbor Stage Anchor

- Applied the shared fixed-width `GameStage` to `/island/harbor`.
- The Harbor background image now keeps a fixed `16/7` game-stage composition and crops from the centered anchor instead of stretching to the viewport.
- The Harbor ship management, Aidong placement, support assignment, and departure menu are now inside the same centered stage width as the Hub and top UI.
- Verification: `pnpm.cmd --filter frontend typecheck` passed.

## Follow-up Change - Island Subscreen Stage Alignment

- Applied the shared fixed-width `GameStage` to `/island/lodge`.
  - The Lodge hero image now uses the same centered stage crop behavior as Hub and Harbor.
  - Lodge tabs, yard, rooms, decor, practice, debut, and myroom entry content now sit inside the same stage width.
- Applied `GameStage` to `/island/lodge/myroom/*` so the nested Lodge pages no longer use their own independent max-width container.
- Applied `GameStage` to `/island/area/:areaNo` placeholder pages so unimplemented area screens follow the same Island screen frame.
- Left `/island/full-map` unchanged because it is the current reference screen for the center-anchor behavior.
- Verification: `pnpm.cmd --filter frontend typecheck` passed.

## Follow-up Change - Responsive Island Frame

- Reinterpreted the Island frame target to match `/island/full-map` responsive behavior instead of fixed center-crop behavior.
- Updated shared `GameStage` from fixed pixel width/crop to responsive width with a max stage width.
- Updated `ScreenHeader`, `HUD`, and `BottomNav` to use responsive `calc(100% - margin)` widths with the same max stage width.
- Adjusted Hub character sizing for mobile.
- Adjusted Voyage board internals so the route board, center status panel, buttons, and board cells shrink cleanly on narrow screens.
- Replaced fixed 4/5-column item grids in Harbor, Lodge, and Voyage cabin decoration UI with `auto-fit` responsive grids.
- Verification: `pnpm.cmd --filter frontend typecheck` passed.

## Follow-up Change - Codex Stage Alignment

- Updated `/codex` to use the shared responsive `GameStage` frame instead of its own `maxWidth: 1024` container.
- The Codex header, tabs, character grid, material grid, trophy placeholder, and footer now align with the same responsive width as the Island screens.
- Verification: `pnpm.cmd --filter frontend typecheck` passed.

## Follow-up Change - Hub Nav Toggle Default

- Added a `마이섬 허브` action to the Hub main navigation buttons.
- Made `마이섬 허브` the selected/default button on `/island`.
- Changed `항구로 가기` to an outlined navigation button so only the current Hub action is highlighted.
- Verification: `pnpm.cmd --filter frontend typecheck` passed.

## Follow-up Change - Shop and Settings Placeholders

- Added `/shop` with a responsive placeholder screen for future shop sections.
- Added `/setting` with a responsive placeholder screen for future settings sections.
- Routed both pages through `MyIslandLayout` so HUD and bottom navigation remain visible.
- This prevents the Shop and Settings bottom-nav tabs from falling through to the wildcard route and returning to the entry/title flow.
- Verification: `pnpm.cmd --filter frontend typecheck` passed.

## Follow-up Change - Main 1920x1080 Frame Rule

- Recorded the screen-frame rule: login and onboarding/fullscreen entry screens stay full viewport, while main app shells use a 1920x1080 reference frame.
- Updated `MyIslandLayout` and `VoyageLayout` to render inside a centered 16:9 frame on desktop, capped at 1920x1080.
- Kept small/mobile viewports on the existing full-height behavior so the app does not collapse into a short 16:9 strip.
- Moved HUD and bottom navigation anchoring from viewport-fixed to frame-absolute so main UI controls stay attached to the centered frame.
- Verification: `pnpm.cmd --filter frontend typecheck` passed.

## Correction - Main Resource Crop Rule

- Corrected the previous interpretation: the main app canvas must remain full viewport and must not render inside a second centered window.
- Removed the centered 1920x1080 app frame wrapper from `MyIslandLayout` and `VoyageLayout`.
- Kept the main background resource layer on a centered 16:9 reference crop so only resources follow the 1920x1080 composition rule.
- Restored HUD and bottom navigation anchoring to viewport-fixed positioning.
- Verification: `pnpm.cmd --filter frontend typecheck` passed.
