#!/usr/bin/env python3
"""rekey_r33.py — the R33 corpus re-key (the K1 convention, R30-R32 pattern).

Re-keys the spec corpus's LIVE statements to the R33 pin world:
  engine  e3f55bd -> 2a0ecf4   (749/749 -> 785/785 = 749 + 33 property sites
                                + 3 P-F2 pins; 25 -> 29 vitest test files;
                                the code anchor 74bef08 -> 28aa387 [the P-F2
                                corollary]; timeline.ts 8,997 -> 9,051 LOC;
                                the W0-W4 waves: CI hygiene + THE PROPERTY
                                TIER [tests/vitest/property/ 4 files, 2 real
                                bugs caught P-F1/P-F2] + the coverage job +
                                perf.yml the fleet's first scheduled workflow;
                                vendors OT 55c81c0 -> 17a19f8 + WDC
                                83b8850 -> 94f6460)
  OT      39003d3 -> 008e7f3   (649/649 -> 675/675 = 632 classic [incl. the
                                3-test M58R family] + 17 M60 + 11 M61 +
                                11 M63 + 4 M62; 77 report entries; the code
                                pin 970948a -> 344123a; the seal18 waves:
                                the D42 linkage model + D43 edit-domains +
                                D44 ERROR_CODES + F1B-5/HA-2-7/HA-2-11 + the
                                M62 functionality-census gate; the registry
                                cites api.ts:243-275 -> :268-300 +
                                :328-335 -> :353-360)
  app     ce7cfc3 -> 7664603   (426/426 UNCHANGED, the 22-file roof
                                UNCHANGED; the lockstep re-pin: vendor
                                engine -> 574d8d3 + BOTH OT mirrors ->
                                17a19f8; the census register re-declared
                                43 = 32 zero-action (6 byte + 26 mechanical)
                                + 9 carriers + 2 hosts @ the 17a19f8 re-pin)
  nle-ui  1e0c30b  UNCHANGED (743/743) · WDC 94f6460 UNCHANGED (777/777)

The context law (verbatim from rekey_r30/31/32): LIVE statements re-key;
HISTORICAL/lineage mentions stay UNTOUCHED. Layered fleet rows APPEND an R33
layer (the R32 layer verbatim below it). NEVER touched: historical commit
records, PLAN.md's round history, audits/*, battery_r2x.py.

Usage:  python3 scripts/rekey_r33.py [--dry]
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
    "at R30", "(R30", "R30 re-pin", "R30 pins", "R30 layer", "R30 WRAP",
    "the R30 record", "R30 reading", "R31 re-key", "re-keyed R31",
    "at R31", "(R31", "R31 re-pin", "R31 pins", "R31 layer", "R31 WRAP",
    "the R31 record", "R31 reading", "R32 re-key", "re-keyed R32",
    "the R31 fleet", "R31 note", "R31 final",
    # --- the R33 extensions (the R32 layers now stay historical) ---
    "at R32", "(R32", "R32 re-pin", "R32 pins", "R32 layer", "R32 WRAP",
    "the R32 record", "R32 reading", "R33 re-key", "re-keyed R33",
    "the R32 fleet", "R32 note", "R32 final", "R32-a", "the R32 re-pin",
]

STALE_PATTERNS = [
    "e3f55bd", "749/749", "39003d3", "649/649", "632/632", "ce7cfc3",
    "3e18722", "970948a", "876f2b8", "256/256", "f9ac806", "55c81c0",
    "83b8850", "api.ts:243-275", "api.ts:328-335", "8,997",
    "25 vitest test files", "25 test files",
    "@ the 39003d3 re-pin",
]

NEW_PINS = ("2a0ecf4", "008e7f3", "7664603", "17a19f8", "344123a", "574d8d3")

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
    if line.startswith("**Status:**") and "R33" not in line and "Round 33" not in line:
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
    WHOLE logical row (the R31 false-positive fix)."""
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
    print("=== R33 re-key: LIVE-stale scan ===")
    pre = report()
    print(f"  LIVE-stale hits: {pre}")
    if DRY:
        print("  DRY mode: scan only")
        sys.exit(0)
    print("  (edits applied by session — targeted surgery; re-run to gate)")
    sys.exit(0 if pre == 0 else 1)


if __name__ == "__main__":
    main()
