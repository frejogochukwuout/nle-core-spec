#!/usr/bin/env python3
"""Build rekey_r35.py from rekey_r34.py (the wrap scanner fork)."""
import re

SRC = "scripts/rekey_r34.py"
DST = "scripts/rekey_r35.py"
txt = open(SRC, encoding="utf-8").read()

# ---- 1. the header docstring swap (the ENTIRE original docstring -> the new one) ----
m = re.search(r'^#!.*?\n("""rekey_r34\.py.*?^Exit 0 = zero LIVE residual\.\n""")', txt, re.S | re.M)
assert m, "original docstring not found"
R35_DOCSTRING = '''"""rekey_r35.py — the R35 corpus re-key (the K1 convention, R30-R34 pattern).

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
  app     cdc67d8 -> {APP_PIN} (the R35 edit-styles wave: batch A the
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
"""'''
txt = txt[:m.start(1)] + R35_DOCSTRING + txt[m.end(1):]

# ---- 2. the HISTORICAL_MARKERS extensions (the R34 layers go historical; the R35 markers join) ----
txt = txt.replace(
    '''    "R34 re-key", "re-keyed R34", "R34 layer", "R34 census record",
    "recorded R34", "LANDED R34", "R34-W", "the R34 fold", "R34 re-pin",
    "the R34 charter", "R34 app-layer addendum", "RATIFIED R34",
]''',
    '''    "R34 re-key", "re-keyed R34", "R34 layer", "R34 census record",
    "recorded R34", "LANDED R34", "R34-W", "the R34 fold", "R34 re-pin",
    "the R34 charter", "R34 app-layer addendum", "RATIFIED R34",
    # --- the R35 extensions (the R34 layers now stay historical) ---
    "at R34", "(R34", "R34 re-pin", "R34 pins", "R34 WRAP",
    "the R34 record", "R34 reading", "the R34 fleet", "R34 note", "R34 final",
    "R35 re-key", "re-keyed R35", "R35 layer", "recorded R35", "LANDED R35",
    "R35-W", "the R35 fold", "the R35 charter", "RATIFIED R35",
    "RESOLVED R35", "RULED R35", "R35 ruling", "R35 re-home", "the R35 re-pin",
]''', 1)

# ---- 3. the STALE_PATTERNS (the R34-HEAD pins that moved; the code pins 60232ea/8f96ab2/94f6460/05d88d9 STAY current) ----
txt = txt.replace(
    '''STALE_PATTERNS = [
    # the R33 pin world, now live-stale where presented as current
    "2a0ecf4", "008e7f3", "7664603", "785/785", "675/675", "743/743",
    "574d8d3", "1e0c30b", "28aa387", "77 milestone entries", "77 entries",
    "344123a", "ce7cfc3", "694/694",
]''',
    '''STALE_PATTERNS = [
    # the R34-HEAD world, now live-stale where presented as current
    # (the docs-only tails: the HEAD moved, the code pins stay — the scanner
    #  flags HEAD-shaped claims; the layered rows carry the R35 layer)
    "ccff397", "cdc67d8", "747/747", "d28847c",
]''', 1)

# ---- 4. the NEW_PINS (the R35 current world; the unchanged code pins stay) ----
txt = txt.replace(
    '''NEW_PINS = (
    "60232ea", "8f96ab2", "d28847c", "05d88d9", "cb04919", "94f6460",
    "789/789", "714/714", "83 entries", "747/747",
)''',
    '''NEW_PINS = (
    "60232ea", "8f96ab2", "05d88d9", "94f6460",
    "789/789", "714/714", "83 entries",
    "2bae99a", "8f287c7", "dc0ca32", "45d42fb", "754/754",
    "3e45aef", "{APP_PIN}",
)''', 1)

# ---- 5. the banner text ----
txt = txt.replace('print("=== R34 re-key: LIVE-stale scan ===")', 'print("=== R35 re-key: LIVE-stale scan ===")', 1)

open(DST, "w", encoding="utf-8").write(txt)
import ast
ast.parse(txt.replace("{APP_PIN}", "XXXXXXX"))
print(f"built {DST}; syntax OK (the APP_PIN placeholder awaits the wrap)")
