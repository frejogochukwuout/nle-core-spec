#!/usr/bin/env python3
"""r33_apply_w4.py — R33 W4: the OT seal18 wire-reality fold (spec 15 + one 06 row).

The OT filing's re-key items, each premise verified LIVE against
/home/z/my-project/opencut-timeline @ 008e7f3:
  1. TRACK_LOCKED is 13 commands, not 12 — insertBatch's gate (:1415-1421)
     was missed; the full set enumerated from api.ts.
  2. F1B-2 is FOUR verbs — timeline.trim joined the wire-side overlap
     validation (validateWireTrim :1707-1723; "trim was the lone reshape
     verb with NO overlap check" — now closed).
  3. F1B-5 NOW REAL — the key-PRESENCE discrimination cleared on
     {clear:false}; FIXED @ d9582d5 (value-check + the M61 discrimination
     pin); the spec's claim becomes true at this pin — record the
     discriminator.
  4. HA-2-11 — upsertKeyframe.value narrowed to number (api.ts:153-155
     "value was always INVALID_PARAMS; the old union overpromised"); spec
     15 §4.3.64's mirror narrows the same way.
  5. HA-2-7 member-guard generalization — null/malformed list members on
     ALL ref-list commands classify INVALID_PARAMS (was INTERNAL_ERROR;
     api.ts:1125/:1506); F1B-4's "16/16" cites the class split.
  6. The bookmark/marker EDIT residual — updateBookmarkInArray
     (bookmarks/utils.ts, exported index.ts:175) has NO wire verb; the r1
     A2/C7 fold's input — register the seam note.

Usage: python3 scripts/r33_apply_w4.py [--dry]
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
DRY = "--dry" in sys.argv

EDITS = []


def E(row, fname, anchor, repl):
    EDITS.append((row, fname, anchor, repl))


# 1. the lock count — site 1 (the keyframe-verb law sentence)
E("W4-1a", "15-wire-protocol.md",
  "`removeKeyframes`/`retimeKeyframes`/`upsertKeyframe` lock-pre-check "
  "whole-batch, api.ts:2338/:2438/:2536 — still 12 commands total, counted "
  "live at `008e7f3`",
  "`removeKeyframes`/`retimeKeyframes`/`upsertKeyframe` lock-pre-check "
  "whole-batch, api.ts:2338/:2438/:2536 — **13 commands total, counted live "
  "at `008e7f3` (the R33 OT-seal18 recount: `timeline.insertBatch`'s gate at "
  "api.ts:1415-1421 was missed by the old 12-count — the full set: insert "
  ":1319, insertBatch :1417, move :1653, trim :1703, split :1767, delete "
  ":1824, rippleDelete :1846, duplicate :1868, updateElements :2082, "
  "upsertKeyframe :2338, retimeKeyframes :2438, removeKeyframes :2536, "
  "track.remove :2732)**")

# 1b. the lock count — site 2 (the M45/W11 sentence)
E("W4-1b", "15-wire-protocol.md",
  "the lock pre-checks now on **12 commands** emitting `TRACK_LOCKED` — the "
  "W11 keyframe additions (below)",
  "the lock pre-checks now on **13 commands** emitting `TRACK_LOCKED` — the "
  "W11 keyframe additions + `insertBatch`'s arm gate + `track.remove`'s "
  "self-removal refusal (the R33 OT-seal18 recount)")

# 2. F1B-2 four verbs
E("W4-2", "15-wire-protocol.md",
  "F1B-2 update-patch no-overlap → `CONFLICT` (insert, move, AND update now "
  "enforced on the wire)",
  "F1B-2 update-patch no-overlap → `CONFLICT` (**insert, move, update, AND "
  "trim enforced on the wire — four verbs, the R33 OT-seal18 correction: "
  "`timeline.trim` joined the wire-side overlap validation, "
  "`validateWireTrim` api.ts:1707-1723 — \"trim was the lone reshape verb "
  "with NO overlap check\" is closed**)")

# 3+5. F1B-5 now-real + F1B-4 class split (the same sentence)
E("W4-3", "15-wire-protocol.md",
  "F1B-4 malformed/null/array params → `INVALID_PARAMS` — 16/16 commands had "
  "been reporting `INTERNAL_ERROR`",
  "F1B-4 malformed/null/array params → `INVALID_PARAMS` — 16/16 commands had "
  "been reporting `INTERNAL_ERROR` (**the HA-2-7 generalization, seal18 L1: "
  "the member-SHAPE guard now runs FIRST on ALL ref-list commands — null/"
  "malformed list members classify INVALID_PARAMS, never INTERNAL_ERROR; "
  "api.ts:1125/:1506, the M16/HB4-6 pins re-based**)")

# 4. HA-2-11 the value narrowing
E("W4-4", "15-wire-protocol.md",
  "  value: number | number[] | string | boolean;",
  "  value: number; // R33 (OT seal18 HA-2-11): narrowed from the old\n"
  "  // number|number[]|string|boolean union — the runtime truth\n"
  "  // (api.ts:153-155: non-number values were always INVALID_PARAMS;\n"
  "  // the union overpromised)")

# 6. the bookmark/marker EDIT residual — the §13.15 table's keyframe-verb
#    row's neighbor slot (append after the SetLoopCommand row's line)
E("W4-6", "15-wire-protocol.md",
  "| §4.3.29 SetLoopCommand | `timeline.setLoopRegion` (:2135, re-anchored "
  "R33, engine seal-round register P3-40)",
  "| **The bookmark/marker EDIT residual (R33, the OT seal18 filing — the r1 "
  "A2/C7 fold's input)** | OT's `updateBookmarkInArray` (`bookmarks/utils."
  "ts:108`, exported `index.ts:175`) EXISTS but NO wire verb consumes it "
  "(only the testing milestones read it, `testing/milestones-bookmarks."
  "ts:153`) — the `updateMarker` family's OT-side seam is the r1 A2/C7 "
  "fold's registered input (verified live @ `008e7f3`) |\n"
  "| §4.3.29 SetLoopCommand | `timeline.setLoopRegion` (:2135, re-anchored "
  "R33, engine seal-round register P3-40)")

# 1c+2b. the 06 §10.4 F1B row — stale keyframe cites + the 13-count
E("W4-7", "06-nle-ops.md",
  "the W11 lockPreCheck extends TRACK_LOCKED to the singular keyframe verbs "
  "(api.ts:340/:849/:904)",
  "the W11 lockPreCheck extends TRACK_LOCKED to the keyframe verbs "
  "(api.ts:2338/:2438/:2536, re-anchored R33) — **13 commands total emit "
  "TRACK_LOCKED at `008e7f3` (the OT-seal18 recount: insertBatch :1417 + "
  "track.remove :2732 join the old 12)**")


def main():
    ok = fail = 0
    for row, fname, anchor, repl in EDITS:
        text = open(fname, encoding="utf-8").read()
        c = text.count(anchor)
        if c != 1:
            print("FAIL  %s  %s  anchor count %d" % (row, fname, c))
            fail += 1
            continue
        if not DRY:
            open(fname, "w", encoding="utf-8").write(text.replace(anchor, repl))
        print("PASS  %s  %s" % (row, fname))
        ok += 1
    print("---\nW4: %d pass / %d fail%s" % (ok, fail, " (DRY)" if DRY else ""))
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()
