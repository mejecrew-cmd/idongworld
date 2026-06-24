# Resource Pipeline

Source assets live under `resources/`. Runtime-ready files are generated into
`packages/frontend/public/assets/` by `tools/resources/stageResources.mjs`.

Recommended artist flow:

1. Checkout `art`.
2. Put delivered PNG files under `resources/_incoming/art/`.
3. Run `pnpm resources:check resources/_incoming/art`.
4. Run `pnpm resources:ingest resources/_incoming/art`.
5. Commit the changed `resources/**` files and push.

Flat staging layout:

```text
<staging>/황금멍/board_icon.png
<staging>/황금멍/body.png
<staging>/황금멍/face_normal.png
```

Structured staging layout:

```text
<staging>/public/황금멍/board_icon.png
<staging>/protected/황금멍/body.png
```

Current Aidong PNG rules:

| File | Visibility | Size |
| --- | --- | --- |
| `board_icon.png` | public | 256x256 |
| `body.png` | protected | 1024x1024 |
| `face_*.png` | protected | 1024x1024 |
| `signature.png` | protected | 1024x1024 |
| `debut_bg.png` | protected | unchecked |

`packages/frontend/public/assets/` is generated output. Do not edit it by hand.
