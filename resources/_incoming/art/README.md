# Art Delivery Folder

Artists can put new Aidong PNG files here on the `art` branch.

Use one folder per character:

```text
resources/_incoming/art/
  황금멍/
    board_icon.png
    body.png
    face_normal.png
  춤냥/
    board_icon.png
    body.png
    face_happy.png
```

Accepted Aidong file names:

| File | Meaning | Size |
| --- | --- | --- |
| `board_icon.png` | public board icon | 256x256 |
| `body.png` | full body image | 1024x1024 |
| `face_normal.png` | normal face | 1024x1024 |
| `face_happy.png` | happy face | 1024x1024 |
| `face_surprised.png` | surprised face | 1024x1024 |
| `face_worried.png` | worried face | 1024x1024 |
| `face_sleepy.png` | sleepy face | 1024x1024 |

This folder is only an upload/drop-off area. The game uses files after they are
ingested into `resources/aidong/public/` and `resources/aidong/protected/`.
