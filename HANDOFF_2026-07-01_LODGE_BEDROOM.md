# Handoff: Lodge / Bedroom Work 2026-07-01

Read this before continuing lodge or bedroom work.

## Layout Rules

- Lodge hub size must not shrink again.
- Do not restore the hidden anchor/Area box on the lodge hub.
- Back button and adjacent text box must stay attached, inside the canvas, using the same form as journal/other screens.
- Header vertical position must stay aligned with the existing fixed layout. Do not let it escape outside the canvas.
- Lodge header should show lodge name and edit pen only. No level text, no Area-13 box.

## Lodge Flow

- Tutorial/lodge naming must open the lodge name UI from the full-screen click area after cleaning.
- Saving lodge name should return to `/island/lodge`, not the island hub.
- Lodge room buttons should open modules directly:
  - Aidong bedroom -> bedroom module
  - meeting / practice / rest -> ready state for now
  - yard -> yard module, Aidongs not placed in bedroom

## Bedroom Module

- Bedroom module is an overlay depth from lodge, not a lodge hub resize.
- Keep only two active bedroom slots for now.
- Debug-recruited Aidongs should not auto-place into bedroom slots.
- Empty slot opens owned Aidong list. Aidong locations come from data/default yard state.
- Item/decor lists are data-based, but temporary outfit test items are currently hardcoded until real item data arrives.

## Aidong Part Layout

- Source art path style is the source of truth:
  - `resources/aidong/public/99_Resources/00_Aidong/AIDONG-####_Head.png`
  - `resources/aidong/public/99_Resources/00_Aidong/AIDONG-####_Body.png`
  - `resources/aidong/public/99_Resources/01_Clothes/00_Top/*.png`
  - `resources/aidong/public/99_Resources/01_Clothes/01_Bottom/*.png`
- Current mapping:
  - `황금멍 -> AIDONG-0019`
  - `춤냥 -> AIDONG-0119`
- Head and body must overlap by exactly 47 visible source pixels at the neck.
- Use visible alpha bounds, not raw canvas bounds:
  - `bodyTop = headVisibleBottom - 47 - bodyVisibleTop`
- Do not use independent `object-fit: contain` scaling for head/body/clothes. All parts must share one source-coordinate stage.
- Default outfit is naked/no clothing.
- Real outfit state should be type-based. Removing one type should not strip other types.
- Outfit popup preview is special: show only the selected item on a naked Aidong, regardless of what the Aidong is actually wearing.

## Current Temporary Outfit Test State

- Temporary items are in `packages/frontend/src/screens/BedroomModule.tsx`.
- Temporary renderer IDs are in `packages/frontend/src/components/AidongSprite.tsx`.
- Temp items:
  - `temp-hoodie` -> top only
  - `temp-jeans` -> bottom only
  - `none` -> naked preview / clear test outfit
- These are local preview only and not persisted to backend.
- Remove these temp items when real item data is ready or when the user asks.

## Camera

- Bedroom camera button is mobile-only.
- It currently opens native mobile camera via hidden file input.
- Desktop should not perform capture.

## Verification Used

- Run `cmd /c pnpm --filter frontend typecheck` after edits.
- Dev server was running at `http://localhost:5175/` during this work; port may change on restart.
