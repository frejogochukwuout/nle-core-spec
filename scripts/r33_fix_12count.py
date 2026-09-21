#!/usr/bin/env python3
"""r33_fix_12count.py — the two remaining live '12 commands' claims in
15-wire-protocol.md (the R24 annotation at :22 + the §13.15 row the OT
filing explicitly named for re-key)."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
p = "15-wire-protocol.md"
text = open(p, encoding="utf-8").read()

old1 = "`TRACK_LOCKED` live exact-match on **12 commands** (S2's 10 + the W11 keyframe-verb additions, R-A P3-9 — the R23 row understated OT at 10)"
new1 = "`TRACK_LOCKED` live exact-match on **13 commands** (the R33 OT-seal18 recount — insertBatch's arm gate + track.remove join the old 12; S2's 10 + the W11 keyframe-verb additions + the two late gates)"

old2 = "api.ts:2239-2246/:2337-2344, + upsert :2139; **still 12 commands total** — counted live; the R23 row understated OT at 10)"
new2 = "api.ts:2338/:2438/:2536, re-anchored R33; **13 commands total** — counted live @ `008e7f3` (the OT-seal18 recount: insertBatch :1417 + track.remove :2732 join the old 12; the R23 row understated OT at 10)"

c1, c2 = text.count(old1), text.count(old2)
print("anchors:", c1, c2)
if c1 != 1 or c2 != 1:
    sys.exit(1)
open(p, "w", encoding="utf-8").write(text.replace(old1, new1).replace(old2, new2))
print("both fixed; residual '12 commands' count:",
      open(p, encoding="utf-8").read().count("12 commands"))
