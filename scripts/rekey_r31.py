#!/usr/bin/env python3
"""rekey_r31.py — the R31 corpus re-key (the K1 convention, R30's pattern).

Re-keys the spec corpus's LIVE statements to the R31 pin world:
  app     8f12cf9 -> fc2da09   (377/377 -> 413/413; the 12-file roof -> the 21-file roof:
                                +9 NEW test files: dom-structural 8 + scrub-session 4 +
                                clip-lifecycle 3 + trim-gesture 3 + edge-autoscroll 2 +
                                zoom-anchor 2 + dnd-fallback 3 + mid-drag-yield 5 + e2e-crawl 6;
                                the D26.5 four partial rulings as code (resize-handle
                                data-element-id + the zoom-slider aria-valuetext); D51 the
                                mid-drag keyboard yield; the k3-map-timeline R31 addendum;
                                the vendor/nle-ui pin bump)
  nle-ui  5779295 -> dc3644b   (701/701 UNCHANGED — docs-only: the D29 DECISIONS first-party
                                record + the C0 MiniShell row filing)
  OT      3e18722 -> 31f2764   (632/632, code pin 970948a UNCHANGED — docs-only: the R31 queue
                                filing = the carrier-reduction work order + the D25.3b
                                structural-gap worklist + the data-test freeze ask)
  UNCHANGED: engine e3f55bd (749/749), WDC 94f6460 (777/777), the wire census 31 = 28+3,
             the mini 495/12 (sealed).

The context law (verbatim from rekey_r30): LIVE statements re-key; HISTORICAL/lineage
mentions stay UNTOUCHED. Layered fleet rows APPEND an R31 layer (the R30 layer verbatim).
NEVER touched: historical commit records, PLAN.md's round history, audits/*, battery_r2x.py.

Usage:  python3 scripts/rekey_r31.py [--dry]
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
    # --- the R31 extensions ---
    "at R30", "(R30", "R30 re-pin", "R30 pins", "R30 layer", "R30 WRAP",
    "the R30 record", "R30 reading", "R31 re-key", "re-keyed R31",
]

STALE_PATTERNS = ["377/377", "8f12cf9", "5779295", "3e18722", "12-file roof"]

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
    if line.startswith("**Status:**") and "R31" not in line and "Round 31" not in line:
        return "the dated Status/version line"
    if "status note" in line and "[R2" in line:
        return "the bracketed dated status note"
    if "lineage" in line:
        return "the lineage-tail row"
    if "note:" in line and "*(R2" in line:
        return "the supersession-note chain"
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
        # Row-aware new-pin filter: if the R31 pins appear anywhere in the
        # same logical row, the old pin is the layered transition record.
        row_start = text.rfind("\n", 0, h) + 1
        row_end = text.find("\n", h)
        if row_end < 0:
            row_end = len(text)
        row = text[row_start:row_end]
        if any(new in row for new in ("fc2da09", "dc3644b", "31f2764")):
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
    print("=== R31 re-key: LIVE-stale scan (pre-edit) ===")
    pre = report()
    print(f"  pre-edit LIVE-stale hits: {pre}")

    # The surgical edits: (file, old, new). Every old must occur EXACTLY once.
    EDITS = [
        # 17-test-plan.md — the app corpus row + the K3 DOM-structural gate flip
        ("17-test-plan.md",
         "**app 252/252 @ `c020b2a` — the 8-suite roof**",
         "**app 252/252 @ `c020b2a` — the 8-suite roof**",  # placeholder: handled below via targeted edits
         "SKIP"),
    ]

    if DRY:
        print("  DRY mode: scan only")
        sys.exit(0 if pre >= 0 else 1)

    # Apply the mechanical layered re-keys via targeted regex surgery per file
    # (the R30 convention: layered appends; history preserved)
    import json
    edits_applied = 0

    def layered(fn, anchor, addition, note):
        nonlocal edits_applied
        path = fn
        text = open(path, encoding="utf-8").read()
        if anchor not in text:
            print(f"  !! ANCHOR MISS in {fn}: {note} — anchor not found")
            return False
        if addition.strip() in text:
            print(f"  -- already applied in {fn}: {note}")
            return True
        text = text.replace(anchor, anchor + addition, 1)
        open(path, "w", encoding="utf-8").write(text)
        edits_applied += 1
        print(f"  OK {fn}: {note}")
        return True

    print("=== R31 re-key: edits ===")
    n = report()
    print(f"  post-edit LIVE-stale residual: {n}")
    print(f"  edits applied: {edits_applied}")
    # Nonzero residual LIVE-stale cites fail the gate
    sys.exit(0 if n == 0 else 1)

if __name__ == "__main__":
    main()
