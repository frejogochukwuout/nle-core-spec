#!/usr/bin/env python3
"""rekey_r35.py — the R35 corpus re-key (the K1 convention, R30-R34 pattern).

Re-keys the spec corpus's LIVE statements to the R35 pin world:
  engine  60232ea -> 2bae99a  (docs-only: the T-engine truth-up over the
                               P-F4 code anchor 60232ea [the code pin
                               STAYS 60232ea]; 789/789 UNCHANGED; the CI
                               GREEN on the aivs home @ the re-point 3e45aef)
  OT      ccff397 -> 8f287c7  (docs-only: the T-ot truth-up; the code pin
                               STAYS 8f96ab2; 714/714 @ 83 UNCHANGED)
  nle-ui  cb04919 -> 45d42fb  (747/747 -> 754/754 = +7: the C-1a edit-styles
                               batch — the mediaInsert(mediaIds, mode) seam
                               widening + the 4 MediaPool insert rows + the
                               5 shortcutMap rows + the live-seam story)
  app     cdc67d8 -> 2f38e8b (the R35 edit-styles wave: batch A the
                               insertion composites + batch B the trim
                               styles + batch C the affordances + the
                               re-pin [nle-ui -> 45d42fb]; 426/426 -> the
                               R35 count; the census 43 = 33+8+2 -> 45 =
                               33 zero-action + 8 carriers + 4 app-host)
  WDC     94f6460 -> dc0ca32  (docs-only: the T-wdc truth-up over the
                               S-series wrap; the code anchor ec8fd5c;
                               777/777 UNCHANGED; CI GREEN on the aivs home)

The context law (verbatim from rekey_r30..r34): LIVE statements re-key;
HISTORICAL/lineage mentions stay UNTOUCHED. Layered fleet rows APPEND an R35
layer (the R34 layer verbatim below it). NEVER touched: historical commit
records, PLAN.md's round history, audits/*, battery_r3x.py.

Usage:  python3 scripts/rekey_r35.py [--dry]
Exit 0 = zero LIVE residual.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

DRY = "--dry" in sys.argv

HISTORICAL_MARKERS = [
    "superseded", "supersession", "R15-era", "historical", "point-in-time",
    "retired", "was the", "old ", "history", "v2.1 history", "prior ledger",
    "R15 counts", "(Round 15", "R22 re-baseline", "retired to history",
    "R22 decision record", "lineage", "R23 pin", "R23 re-pin", "R22 pins",
    "was b8c6f88", "was 222532c", "the R23 census", "at R23", "(R23)",
    "re-pin", "re-based", "R23 review round", "stable since", "R24 pin",
    "commits over", "re-verified R24", "fleet re-pin", "R24 re-base",
    "R24 re-baseline", "the R24 pin", "at R24", "(R24)", "R25 pin",
    "the R25 pin", "at R25", "(R25)", "R25 re-pin", "R26 pin", "the R26 pin",
    "at R26", "(R26", "R27 re-pin", "D-ARCH-6", "at AR-2", "(AR-2",
    "the charter's", "superseded in-file",
    "at R27", "(R27", "R27 re-pin", "R27 fleet", "R27 re-anchor", "R28 re-anchor",
    "at R28", "(R28", "R28 pins", "R28 re-pin", "R28 WRAP", "the R28 record",
    "R28 record", "R28 reading", "at R29", "(R29", "R29 re-pin", "R29 pins",
    "R29 layer", "R29 re-anchor", "R29 re-key", "R29 landings", "LANDED R29",
    "LANDED @", "DISCHARGED R29", "the R29 canon", "R29 note", "R29 WRAP",
    "re-keyed R29", "re-keyed R30", "live-run R27", "the R24 record",
    "recorded baseline", "was `", "R30 re-key", "at R30",
    "(R30", "R30 re-pin", "R30 pins", "R30 layer", "R30 WRAP",
    "the R30 record", "R30 reading", "R31 re-key", "re-keyed R31",
    "at R31", "(R31", "R31 re-pin", "R31 pins", "R31 layer", "R31 WRAP",
    "the R31 record", "R31 reading", "R32 re-key", "re-keyed R32",
    "the R31 fleet", "R31 note", "R31 final",
    "at R32", "(R32", "R32 re-pin", "R32 pins", "R32 layer", "R32 WRAP",
    "the R32 record", "R32 reading", "R33 re-key", "re-keyed R33",
    "the R32 fleet", "R32 note", "R32 final", "R32-a", "the R32 re-pin",
    "R28-exec", "R33 lockstep",
    # --- the R34 extensions (the R33 layers now stay historical) ---
    "at R33", "(R33", "R33 re-pin", "R33 pins", "R33 layer", "R33 WRAP",
    "the R33 record", "R33 reading", "the R33 fleet", "R33 note", "R33 final",
    "R34 re-key", "re-keyed R34", "R34 layer", "R34 census record",
    "recorded R34", "LANDED R34", "R34-W", "the R34 fold", "R34 re-pin",
    "the R34 charter", "R34 app-layer addendum", "RATIFIED R34",
    # --- the R35 extensions (the R34 layers now stay historical) ---
    "at R34", "(R34", "R34 re-pin", "R34 pins", "R34 WRAP",
    "the R34 record", "R34 reading", "the R34 fleet", "R34 note", "R34 final",
    "R35 re-key", "re-keyed R35", "R35 layer", "recorded R35", "LANDED R35",
    "R35-W", "the R35 fold", "the R35 charter", "RATIFIED R35",
    "RESOLVED R35", "RULED R35", "R35 ruling", "R35 re-home", "the R35 re-pin",
]

STALE_PATTERNS = [
    # the R34-HEAD world, now live-stale where presented as current
    # (the docs-only tails: the HEAD moved, the code pins stay — the scanner
    #  flags HEAD-shaped claims; the layered rows carry the R35 layer)
    "ccff397", "cdc67d8", "747/747", "d28847c",
]

NEW_PINS = (
    "60232ea", "8f96ab2", "05d88d9", "94f6460",
    "789/789", "714/714", "83 entries",
    "2bae99a", "8f287c7", "dc0ca32", "45d42fb", "754/754",
    "3e45aef", "2f38e8b", "a39c68b",
)

SCAN_FILES = sorted(
    f for f in os.listdir(".")
    if f.endswith(".md") and os.path.isfile(f)
)


def _line_classified_historical(text, h):
    line_start = text.rfind("\n", 0, h) + 1
    line_end = text.find("\n", h)
    if line_end < 0:
        line_end = len(text)
    line = text[line_start:line_end]
    if line.startswith("**Status:**") and "R34" not in line and "Round 34" not in line:
        return "the dated Status/version line"
    if "status note" in line and "[R2" in line:
        return "the bracketed dated status note"
    if "lineage" in line:
        return "the lineage-tail row"
    if "note:" in line and "*(R2" in line:
        return "the parenthetical dated note"
    return None


def live_stale(text, stale):
    """Count occurrences of `stale` NOT in a historical context.
    Row-aware: fleet rows can exceed 3KB — the new-pin filter checks the
    WHOLE logical row (the R31 false-positive fix; the W6b laundering fix:
    every CURRENT pin incl. unchanged repos joins NEW_PINS)."""
    hits = [m.start() for m in re.finditer(re.escape(stale), text)]
    live = 0
    for h in hits:
        ctx = text[max(0, h - 260):h + 260]
        if any(k in ctx for k in HISTORICAL_MARKERS):
            continue
        row_start = text.rfind("\n", 0, h) + 1
        row_end = text.find("\n", h)
        if row_end < 0:
            row_end = len(text)
        row = text[row_start:row_end]
        if any(new in row for new in NEW_PINS):
            continue
        cls = _line_classified_historical(text, h)
        if cls:
            continue
        live += 1
    return live


def report(verbose=True):
    """Scan every corpus .md for LIVE-stale pin cites."""
    problems = 0
    for fn in SCAN_FILES:
        text = open(fn, encoding="utf-8").read()
        for stale in STALE_PATTERNS:
            n = live_stale(text, stale)
            if n:
                if verbose:
                    print(f"  LIVE-STALE {fn}: {stale} x{n}")
                problems += n
    return problems


def main():
    print("=== R35 re-key: LIVE-stale scan ===")
    pre = report()
    print(f"  LIVE-stale hits: {pre}")
    if DRY:
        print("  DRY mode: scan only")
        sys.exit(0)
    print("  (edits applied by session — targeted surgery; re-run to gate)")
    sys.exit(0 if pre == 0 else 1)


if __name__ == "__main__":
    main()
