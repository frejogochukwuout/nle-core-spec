#!/usr/bin/env python3
"""rekey_r32.py — the R32 corpus re-key (the K1 convention, R30/R31 pattern).

Re-keys the spec corpus's LIVE statements to the R32 pin world:
  app     f58147c -> ce7cfc3   (418/418 -> 426/426; the 21-file roof -> the 22-file roof:
                                +1 NEW test file: doc-committing-sessions.test.tsx (the
                                doc-committing session registry + the D52 shell-twin
                                family); +8 tests: the W1 K4 move-drag LEG 2b (+1) +
                                the session-registry 3 + the D52 describe 4; the K4 exit
                                verdict doc; the w1-entry deliverables: the human-rounds
                                protocol + the annotakit config + the side-by-side
                                fixtures + the VLM net (7/7, 0 REAL-BUG); the D25.3a
                                port absorption (theme.ts + TimelineAudioWaveform
                                carriers) + the census re-declaration 43 = 32+9+2)
  nle-ui  dc3644b -> 1e0c30b   (701/701 -> 743/743: the C0 MiniShell composition LANDED
                                [701 -> 737, 78 stories, the ConfirmProvider + MiniShell
                                exports] + the D52 twin [737 -> 743: the optional
                                TimelineRouter.isInteractionActive + the 9 doc-mutating
                                row guards + the 6-pin family])
  OT      31f2764 -> 39003d3   (632/632 -> 649/649: the D25.3a R32-a steps — theme.ts
                                mode maps + the TimelineAudioWaveform mode resolution +
                                the Tier-2 residual overrides + the M60 JS-paint pins
                                [632 classic + 17 M60]; the gold-sample capture scripts;
                                the code pin MOVED 970948a -> 39003d3)
  UNCHANGED: engine e3f55bd (749/749), WDC 94f6460 (777/777), the wire census 31 = 28+3,
             the mini 495/12 (sealed).

The context law (verbatim from rekey_r30/r31): LIVE statements re-key; HISTORICAL/lineage
mentions stay UNTOUCHED. Layered fleet rows APPEND an R32 layer (the R31 layer verbatim).
NEVER touched: historical commit records, PLAN.md's round history, audits/*, battery_r2x.py.

Usage:  python3 scripts/rekey_r32.py [--dry]
Exit 0 = all edits validated/applied + zero LIVE residual hits.
"""
import re
import sys
import os

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
    "recorded baseline", "was `", "was Ã¢", "R30 re-key", "at R30",
    # --- the R31 extensions (their layers now stay historical) ---
    "at R30", "(R30", "R30 re-pin", "R30 pins", "R30 layer", "R30 WRAP",
    "the R30 record", "R30 reading", "R31 re-key", "re-keyed R31",
    # --- the R32 extensions ---
    "at R31", "(R31", "R31 re-pin", "R31 pins", "R31 layer", "R31 WRAP",
    "the R31 record", "R31 reading", "R32 re-key", "re-keyed R32",
    "the R31 fleet", "R31 note", "R31 final",
]

STALE_PATTERNS = [
    "418/418", "f58147c", "dc3644b", "31f2764", "21-file", "21 test files",
    "632/632",  # the OT figure: LIVE cites re-key to 649/649 (632 classic + 17 M60)
]

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
    if line.startswith("**Status:**") and "R32" not in line and "Round 32" not in line:
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
    WHOLE logical row, not a 260-char window (the R31 false-positive fix)."""
    hits = [m.start() for m in re.finditer(re.escape(stale), text)]
    live = 0
    for h in hits:
        ctx = text[max(0, h - 260):h + 260]
        if "Ã¢" in text[max(0, h - 12):h + 18]:
            continue
        if any(k in ctx for k in HISTORICAL_MARKERS):
            continue
        # Row-aware new-pin filter: if the R32 pins appear anywhere in the
        # same logical row, the old pin is the layered transition record.
        row_start = text.rfind("\n", 0, h) + 1
        row_end = text.find("\n", h)
        if row_end < 0:
            row_end = len(text)
        row = text[row_start:row_end]
        if any(new in row for new in ("ce7cfc3", "1e0c30b", "39003d3")):
            continue
        cls = _line_classified_historical(text, h)
        if cls:
            continue
        live += 1
    return live

def report():
    """Scan every corpus .md for LIVE-stale pin cites."""
    problems = 0
    for fn in SCAN_FILES:
        text = open(fn, encoding="utf-8").read()
        for stale in STALE_PATTERNS:
            n = live_stale(text, stale)
            if n:
                print(f"  LIVE-STALE {fn}: {stale} x{n}")
                problems += n
    return problems

def main():
    print("=== R32 re-key: LIVE-stale scan (pre-edit) ===")
    pre = report()
    print(f"  pre-edit LIVE-stale hits: {pre}")

    if DRY:
        print("  DRY mode: scan only")
        sys.exit(0)

    print("=== R32 re-key: edits applied by session (targeted surgery) ===")
    n = report()
    print(f"  post-edit LIVE-stale residual: {n}")
    sys.exit(0 if n == 0 else 1)

if __name__ == "__main__":
    main()
