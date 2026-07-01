# Aidong Part Layout Rule

This rule applies to every layered Aidong render in the lodge room and outfit screens.

- Head source size: 1160 x 980
- Body source size: 820 x 600
- Top source size: 740 x 358
- Bottom source size: 520 x 310
- Head and body overlap: 47 source pixels
- Body top position is based on the visible alpha bounds:
  `headVisibleBottom - 47 - bodyVisibleTop`
- Top clothing aligns to the body top.
- Bottom clothing aligns to the body bottom.
- Default outfit is naked/no clothing. Render top or bottom only when data equips it.
- Render all parts in one shared source-coordinate stage. Do not use independent
  `contain` scaling per image, because it changes the visible overlap.

Do not tune the neck/body overlap per character. Add new Aidong assets using the
same `AIDONG-####_Head.png` and `AIDONG-####_Body.png` coordinate rule.
When a new `AIDONG-####` asset is added, record its visible head bottom and body
top bounds so the 47px visible overlap remains exact.
