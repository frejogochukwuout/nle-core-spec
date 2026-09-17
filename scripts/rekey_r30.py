#!/usr/bin/env python3
"""rekey_r30.py — the R30 corpus re-key (Task R30-E4-k1, the K1 convention).

Re-keys the spec corpus's LIVE statements to the R30 pin world:
  app     876f2b8 -> 8f12cf9   (256/256 -> 377/377; the 8-suite roof -> the 12-file roof:
                                GluedShell 124 + wire-coverage 26 + audioService 42 + deliverService 20 +
                                keybindings-repeat 4 + waveformPeaks 9 + history-laws 15 + persistenceService 20 +
                                engineService 31 + sceneBridge 41 + timeline-geometry 38 + engineSeam 7 = 377;
                                +4 NEW test files: engineService/timeline-geometry/history-laws/keybindings-repeat;
                                the C16 auto-repeat guard in use-keybindings.ts; the K3 corpus + the four maps
                                docs/k3-map-*.md)
  nle-ui  6754979 -> 5779295   (691/691 -> 701/701: 83af958 the C16 package twin + the 4 package-gap pins;
                                5779295 the K3 FIX-2 — the 3-verb dead-history-entry class
                                (setEffectParam/toggleEffect/removeEffect unknown-fx miss-guards) + 4 pins)
  UNCHANGED: engine e3f55bd (749/749), OT 3e18722 (632/632, code pin 970948a), WDC 94f6460 (777/777),
             the wire census 31 = 28+3, the mini 495/12 (sealed).

The context law (battery_r29's live_stale, copied verbatim below + the R29/R30 round-marker
extensions): LIVE statements re-key; HISTORICAL/lineage mentions (superseded/re-pinned/lineage/
was/the R29 record/R29 WRAP/at R29/(R29)/re-based/history/prior ledger/-> transitions) stay
UNTOUCHED. Layered fleet rows APPEND an R30 layer (the R29 layer verbatim). NEVER touched:
historical commit records, PLAN.md's round history, audits/*, ARCH-R28 §5, battery_r2x.py.

Usage:  python3 scripts/rekey_r30.py [--dry]    (default: apply; --dry: validate only)
Exit 0 = all edits validated/applied + zero LIVE residual hits.
"""
import re
import sys
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

DRY = "--dry" in sys.argv

# ---------------------------------------------------------------------------
# The context law — battery_r29.live_stale's marker list, copied verbatim
# (scripts/battery_r29.py:57-78, Ruling B / xcut-census §2), plus the
# R29/R30 round-marker extensions this round needs (the same way r29's own
# list carried the R23-R27 markers its rounds added).
# ---------------------------------------------------------------------------
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
    # --- the R28/R29/R30 extensions (re-key round trails + layered rows) ---
    "at R27", "(R27", "R27 re-pin", "R27 fleet", "R27 re-anchor", "R28 re-anchor",
    "at R28", "(R28", "R28 pins", "R28 re-pin", "R28 WRAP", "the R28 record",
    "R28 record", "R28 reading", "at R29", "(R29", "R29 re-pin", "R29 pins",
    "R29 layer", "R29 re-anchor", "R29 re-key", "R29 landings", "LANDED R29",
    "LANDED @", "DISCHARGED R29", "the R29 canon", "R29 note", "R29 WRAP",
    "re-keyed R29", "re-keyed R30", "live-run R27", "the R24 record",
    "recorded baseline", "was `", "was \u00e2", "R30 re-key", "at R30",
]

STALE_PATTERNS = ["256/256", "8-suite", "8 suites", "691/691", "6754979",
                  "= 252", "876f2b8", "252/252"]

SCAN_FILES = sorted(
    f for f in os.listdir(".")
    if f.endswith(".md") and os.path.isfile(f)
)

def _line_classified_historical(text, h):
    """The R30 line-structural extensions (documented, each following a corpus
    convention the R28/R29 K1 rounds themselves used when they left these rows
    untouched \u2014 the live canon is \u00a70's fleet rows per D21):
      - the dated Status/version lines (pre-R30 rounds' status records);
      - the bracketed dated status notes (e.g. 16's '[R23 status note:]');
      - the lineage-tail rows (13's R23/R22 lineage snapshots);
      - the D21 supersession-note chain ('*(R2x note: ... )*');
      - the dated battery-posture records ('the R24 battery's posture checks').
    """
    line_start = text.rfind("\n", 0, h) + 1
    line_end = text.find("\n", h)
    if line_end < 0:
        line_end = len(text)
    line = text[line_start:line_end]
    if line.startswith("**Status:**") and "R30" not in line and "Round 30" not in line:
        return "the dated Status/version line"
    if "status note" in line and "[R2" in line:
        return "the bracketed dated status note"
    if "lineage" in line:
        return "the lineage-tail row"
    if "note:" in line and "*(R2" in line:
        return "the supersession-note chain"
    if "the R24 battery" in line:
        return "the dated battery-posture record"
    return None

def live_stale(text, stale):
    """Count occurrences of `stale` NOT in a historical/supersession context
    (battery_r29.live_stale, verbatim logic + the round-marker extensions)."""
    hits = [m.start() for m in re.finditer(re.escape(stale), text)]
    live = 0
    for h in hits:
        ctx = text[max(0, h - 260):h + 260]
        if "\u2192" in text[h - 12:h + 18]:  # the sha/count sits in an old->new transition record
            continue
        if any(k in ctx for k in HISTORICAL_MARKERS):
            continue
        live += 1
    return live

# ---------------------------------------------------------------------------
# The R30 wording blocks
# ---------------------------------------------------------------------------
ROOF12 = ("GluedShell 124 + wire-coverage 26 + audioService 42 + deliverService 20 + "
          "keybindings-repeat 4 + waveformPeaks 9 + history-laws 15 + persistenceService 20 + "
          "engineService 31 + sceneBridge 41 + timeline-geometry 38 + engineSeam 7")
ROOF12_SLASH = ROOF12.replace(" + ", " / ")
ROOF12_NAMES = ("GluedShell, wire-coverage, audioService, deliverService, keybindings-repeat, "
                "waveformPeaks, history-laws, persistenceService, engineService, sceneBridge, "
                "timeline-geometry, engineSeam")
K3_GLOSS = ("+4 NEW test files: engineService/timeline-geometry/history-laws/keybindings-repeat; "
            "the C16 auto-repeat guard in use-keybindings.ts; the K3 corpus + the four maps "
            "docs/k3-map-*.md")
NLEUI_GLOSS = ("`83af958` the C16 package twin + the 4 package-gap pins; `5779295` the K3 FIX-2 — "
               "the 3-verb dead-history-entry class (setEffectParam/toggleEffect/removeEffect "
               "unknown-fx miss-guards) + 4 pins")

# ---------------------------------------------------------------------------
# The surgical edits: (file, old, new, note). Every old string must occur
# EXACTLY once (asserted). Validation happens for ALL edits BEFORE any write.
# ---------------------------------------------------------------------------
EDITS = [
# =========================== 00-master-spec.md ==============================
("00-master-spec.md",
 "(the freshness re-pin LANDED, the one-behind filing CLOSED)) + **nle-test-app**",
 "(the freshness re-pin LANDED, the one-behind filing CLOSED)) @ `5779295` (R30 — the K3 corpus "
 "round: **701/701** live-run + boundary PASS — " + NLEUI_GLOSS + "; consumed @ `5779295` — the "
 "app CURRENT at the package HEAD) + **nle-test-app**",
 "LAYER-APPEND 00 fleet nle-ui R30 (5779295, 701/701)"),

("00-master-spec.md",
 "**the R17/ARCH-R28 engine-vendor divergence RESOLVED: re-converged at `e3f55bd` = engine HEAD**, "
 "the one-step-behind record closed); the in-repo `ui-mock/shell-variants`",
 "**the R17/ARCH-R28 engine-vendor divergence RESOLVED: re-converged at `e3f55bd` = engine HEAD**, "
 "the one-step-behind record closed) @ `8f12cf9` (R30 — **the K3 corpus round**: the suite "
 "**256\u2192377** — the **12-file roof**: " + ROOF12 + " (" + K3_GLOSS + "); consumes engine @ "
 "`e3f55bd` + nle-ui @ `5779295` + WDC @ `ec8fd5c` + the OT components-tree mirror @ `55c81c0` — "
 "the vendor set unchanged but nle-ui); the in-repo `ui-mock/shell-variants`",
 "LAYER-APPEND 00 fleet app R30 (8f12cf9, 377/377, the 12-file roof)"),

("00-master-spec.md",
 "+ nle-ui `6754979` + WDC `ec8fd5c` (unmoved); the wire census 31 = 28 routed + 3 exceptions "
 "UNCHANGED; the in-repo mocks: variants WRAPPED at the register-declared 1,939/68 (the declared "
 "pair 1,950 runner-count / 126 stories recorded), mini 495/12 (the register pin, "
 "sibling-maintained) — the pin-CLASS law stands unchanged.)*",
 "+ nle-ui `6754979` + WDC `ec8fd5c` (unmoved); the wire census 31 = 28 routed + 3 exceptions "
 "UNCHANGED; the in-repo mocks: variants WRAPPED at the register-declared 1,939/68 (the declared "
 "pair 1,950 runner-count / 126 stories recorded), mini 495/12 (the register pin, "
 "sibling-maintained) — the pin-CLASS law stands unchanged.)* *(R30 note: the R29 canon values "
 "above are superseded — the live canon is \u00a70's fleet rows re-pinned at R30: engine `e3f55bd` "
 "749 UNCHANGED / OT HEAD `3e18722` (code pin `970948a`) 632 UNCHANGED / WDC `94f6460` 777 "
 "UNCHANGED / nle-ui `5779295` (CODE — the C16 twin `83af958` + the K3 FIX-2 `5779295` over "
 "`6754979`) 701 / app `8f12cf9` 377 (the K3 corpus round: the 12-file roof + the C16 "
 "auto-repeat guard + the four maps docs/k3-map-*.md); consumer pins re-read live at R30: "
 "engine\u2192OT `55c81c0` + WDC `83b8850` (unmoved); app\u2192engine `e3f55bd` + the OT mirror "
 "`55c81c0` (unmoved) + nle-ui `5779295` + WDC `ec8fd5c` (unmoved); the wire census 31 = 28 "
 "routed + 3 exceptions UNCHANGED; the in-repo mocks: variants WRAPPED at the register-declared "
 "1,939/68 (the declared pair 1,950 runner-count / 126 stories recorded), mini 495/12 (the "
 "register pin, sibling-maintained) — the pin-CLASS law stands unchanged.)*",
 "LAYER-APPEND 00 D21 record R30 note (the pin-class canon chain)"),

# =========================== 19-code-references.md ==========================
("19-code-references.md",
 "**Status:** v3.5 (Round 29 — the parallel-fleet re-base: ALL assets re-pinned to the R29 pins — nle-engine",
 "**Status:** v3.6 (Round 30 — the K3 corpus round: the app + nle-ui pins move, the rest UNMOVED — nle-engine",
 "19 status header v3.5->v3.6 (R30 round label)"),

("19-code-references.md",
 "`nle-ui` `6754979` **691/691** (AW1-2 the Gain ceiling [\u221260,+20] + AW1-4 the D-ARCH-6 pool "
 "seam + ENG-1, atop R9-b preservePitch + F4-6/F4-7 + FW-D `setElementFieldAll`); `nle-test-app` "
 "`876f2b8` **256/256** (8 suites; the port census 42 = 36 zero-action + 5 carriers + host @ "
 "`55c81c0` — the D-ARCH-6 consumer duty LANDED: the OT re-pin `6e2b91a`\u2192`55c81c0` + the "
 "gesture-seam switch + the pool insertBatch through nle-ui's shell seam, the wire-coverage gate "
 "GREEN; AR-2 + M2 Wave 1 + R9-b landed)",
 "`nle-ui` `5779295` **701/701** (" + NLEUI_GLOSS + "; atop the R29 AW1-2 the Gain ceiling "
 "[\u221260,+20] + AW1-4 the D-ARCH-6 pool seam + ENG-1); `nle-test-app` `8f12cf9` **377/377** "
 "(12 files — the roof: " + ROOF12 + "; " + K3_GLOSS + "; the port census 42 = 36 zero-action + 5 "
 "carriers + host @ `55c81c0` UNCHANGED; AR-2 + M2 Wave 1 + R9-b + the R29 D-ARCH-6 consumer "
 "duty landed)",
 "19 status nle-ui + app rows re-keyed (5779295/701; 8f12cf9/377/12 files)"),

("19-code-references.md",
 "the round's landings: the D-ARCH-6 s17 consumer duty (the app @ `876f2b8` — the OT mirror "
 "re-pin + the gesture-seam switch + the wire-coverage gate green), nle-ui's AW1-2+AW1-4+ENG-1 "
 "code round, the OT seal18 docs wrap, WDC's ENG-2 docs wrap, the engine's chore-only vendor re-pin.",
 "the round's landings: the app's K3 corpus round (the 12-file roof 256\u2192377 + the C16 "
 "auto-repeat guard + the four maps docs/k3-map-*.md), nle-ui's C16-twin + K3-FIX-2 code round "
 "(691\u2192701).",
 "19 status round's-landings re-keyed to the R30 landings"),

("19-code-references.md",
 "**BASE (accepted, re-pinned 2026-09-14 @ R27; the consumer pins re-keyed 2026-09-16 @ R29):**",
 "**BASE (accepted, re-pinned 2026-09-14 @ R27; the consumer pins re-keyed 2026-09-16 @ R29, the "
 "nle-ui vendor re-keyed @ R30):**",
 "19 BASE header gains the R30 re-key label"),

("19-code-references.md",
 "+ nle-ui `6754979` (the AW1-2 absorb LANDED) + WDC `ec8fd5c`.",
 "+ nle-ui `5779295` (the R30 re-key — the C16 twin `83af958` + the K3 FIX-2 `5779295`; was "
 "`6754979` the AW1-2 absorb) + WDC `ec8fd5c`.",
 "19 BASE consumer-pin set: nle-ui re-keyed to 5779295"),

("19-code-references.md",
 "the app's 8-suite roof (256/256) is the assembly acceptance",
 "the app's 12-file roof (377/377 — R30 re-key) is the assembly acceptance",
 "19 D26 row: the roof statement re-keyed"),

("19-code-references.md",
 "**691/691 tests, tsc 0, boundary OK @ `6754979` — RUN LIVE at the R29 re-pin** (37 test files, "
 "live-counted; 690 @ `32abd58` at R28, 674 @ `fc4cc35` at R24, 648 @ `85dcf57` at R23)",
 "**701/701 tests, tsc 0, boundary OK @ `5779295` — RUN LIVE at the R30 re-pin** (37 test files, "
 "live-counted; 691 @ `6754979` at R29, 690 @ `32abd58` at R28, 674 @ `fc4cc35` at R24, 648 @ "
 "`85dcf57` at R23). **The R30 landings @ `5779295`: `83af958` the C16 package twin (the "
 "auto-repeat guard) + the 4 package-gap pins; the K3 FIX-2 `5779295` — the 3-verb "
 "dead-history-entry class (setEffectParam/toggleEffect/removeEffect unknown-fx miss-guards) + 4 "
 "pins**",
 "19 nle-ui module card: 701/701 @ 5779295 + the R30 landings sentence"),

("19-code-references.md",
 "Consumed by the app @ `6754979` (the AW1-2 absorb LANDED R29 — the vendor re-converged at the "
 "package HEAD; was `83ff8a8`, app PLAN:143-146)",
 "Consumed by the app @ `5779295` (the R30 re-key — the app CURRENT at the package HEAD; was "
 "`6754979` at R29 — the AW1-2 absorb LANDED, the vendor re-converged at the package HEAD; before "
 "that `83ff8a8`, app PLAN:143-146)",
 "19 nle-ui module card: consumed-by re-keyed to 5779295"),

("19-code-references.md",
 "**256/256, tsc 0 @ `876f2b8`** (8 suites: GluedShell, audioService, sceneBridge, "
 "deliverService, persistenceService, wire-coverage, engineSeam, waveformPeaks — the roof; 252 @ "
 "`85cff80` at R28, 174 @ `c885ece` at R24, 117 @ `70e99f0` at R23)",
 "**377/377, tsc 0 @ `8f12cf9`** (12 files: " + ROOF12_NAMES + " — the roof (" + ROOF12 + "; the "
 "+4 NEW test files engineService/timeline-geometry/history-laws/keybindings-repeat — the R30 K3 "
 "corpus round); 256 @ `876f2b8` at R29, 252 @ `85cff80` at R28, 174 @ `c885ece` at R24, 117 @ "
 "`70e99f0` at R23)",
 "19 app module card: 377/377 @ 8f12cf9 + the 12-file inventory + the R29 trail"),

("19-code-references.md",
 "**The vendoring record (the consumer pins, re-keyed R29):**",
 "**The vendoring record (the consumer pins, re-keyed R29; nle-ui re-keyed R30):**",
 "19 app module card: vendoring-record label gains R30"),

("19-code-references.md",
 "+ `vendor/nle-ui` @ `6754979` (file: link, the closed exports map; the AW1-2 absorb LANDED)",
 "+ `vendor/nle-ui` @ `5779295` (file: link, the closed exports map; the R30 re-key — was "
 "`6754979` the AW1-2 absorb)",
 "19 app module card: vendor/nle-ui consumer pin re-keyed"),

("19-code-references.md",
 "**nle-ui** @`6754979`: **691/691** — R9-b preservePitch + F4-6/F4-7 + FW-D `setElementFieldAll` "
 "+ AW1-2 the Gain ceiling [\u221260,+20] + **the R29 code round: AW1-4 the D-ARCH-6 pool seam + "
 "ENG-1 (the ChannelEditor `max={4}` residual CLOSED)**; consumed by the app @ `6754979` (the "
 "AW1-2 absorb LANDED — the vendor re-converged at HEAD, was `83ff8a8`); the C0 MiniShell still "
 "NOT STARTED.",
 "**nle-ui** @`5779295`: **701/701** — R9-b preservePitch + F4-6/F4-7 + FW-D `setElementFieldAll` "
 "+ AW1-2 the Gain ceiling [\u221260,+20] + the R29 code round: AW1-4 the D-ARCH-6 pool seam + "
 "ENG-1 (the ChannelEditor `max={4}` residual CLOSED) + **the R30 code round: `83af958` the C16 "
 "package twin + the 4 package-gap pins; `5779295` the K3 FIX-2 — the 3-verb dead-history-entry "
 "class (setEffectParam/toggleEffect/removeEffect unknown-fx miss-guards) + 4 pins**; consumed by "
 "the app @ `5779295` (the R30 re-key; was `6754979` at R29 — the AW1-2 absorb LANDED, the vendor "
 "re-converged at HEAD, before that `83ff8a8`); the C0 MiniShell still NOT STARTED.",
 "19 fleet-re-baseline nle-ui card re-keyed (5779295, 701/701, the R30 code round)"),

("19-code-references.md",
 "**nle-test-app** @`876f2b8` (THE APP): **256/256** (8 suites — the roof) — AR-2 (the "
 "live-registry consumption law, `wire-coverage.test.tsx:29`) + M2 Wave 1 + R9-b + **the R29 "
 "D-ARCH-6 s17 consumer duty** landed; the census 42 = 36 zero-action + 5 carriers + host @ "
 "`55c81c0` (unchanged); the D-ARCH-6 re-pin queue DISCHARGED (the OT re-pin + the gesture-seam "
 "switch landed — the wire-coverage gate GREEN).",
 "**nle-test-app** @`8f12cf9` (THE APP): **377/377** (12 files — the roof: " + ROOF12 + ") — AR-2 "
 "(the live-registry consumption law, `wire-coverage.test.tsx:29`) + M2 Wave 1 + R9-b + **the R29 "
 "D-ARCH-6 s17 consumer duty** landed + **the R30 K3 corpus round** (" + K3_GLOSS + "); the "
 "census 42 = 36 zero-action + 5 carriers + host @ `55c81c0` (unchanged); the D-ARCH-6 re-pin "
 "queue DISCHARGED (the OT re-pin + the gesture-seam switch landed — the wire-coverage gate GREEN).",
 "19 fleet-re-baseline app card re-keyed (8f12cf9, 377/377, the R30 K3 corpus round)"),

# =========================== 12-testing-strategy.md =========================
("12-testing-strategy.md",
 "- The fleet's suites at the **R29 pins** (the K1 module nets — ALL GREEN; 00-master's fleet "
 "table is the pin canon, D21; the battery re-baselines the pin world once, centrally — "
 "**battery_r28 re-baselines after the fleet**; consumer pins re-read live — the row's R28 label "
 "re-keyed R29):",
 "- The fleet's suites at the **R30 pins** (the K1 module nets — ALL GREEN; 00-master's fleet "
 "table is the pin canon, D21; the battery re-baselines the pin world once, centrally — "
 "**battery_r28 re-baselines after the fleet**; consumer pins re-read live — the row's R29 label "
 "re-keyed R30: the engine/OT/WDC pins UNMOVED, the app + nle-ui pins moved):",
 "12 \u00a70 fleet row label R29->R30"),

("12-testing-strategy.md",
 "**nle-ui** 691 @ `6754979` — 37 test files (R9-b preservePitch, F4 identity guards, FW-D "
 "`setElementFieldAll`, AW1-2 the Gain ceiling + AW1-4 the D-ARCH-6 pool seam + ENG-1; the app "
 "vendored @ `6754979` — the AW1-2 absorb LANDED, the vendor re-converged at HEAD)",
 "**nle-ui** 701 @ `5779295` — 37 test files (R9-b preservePitch, F4 identity guards, FW-D "
 "`setElementFieldAll`, AW1-2 the Gain ceiling + AW1-4 the D-ARCH-6 pool seam + ENG-1; "
 + NLEUI_GLOSS + "; the app vendored @ `5779295` — the R30 re-key, the vendor CURRENT at the "
 "package HEAD)",
 "12 \u00a70 nle-ui row re-keyed (5779295, 701)"),

("12-testing-strategy.md",
 "**nle-test-app** 256/256 @ `876f2b8` — **8 suites: GluedShell 104 / audioService 42 / "
 "sceneBridge 41 / deliverService 20 / persistenceService 20 / wire-coverage 13 / engineSeam 7 / "
 "waveformPeaks 9** (the R8 D29 real-wiring + the R9/D30 W-A/W-F waves + the RA/RC rounds + the "
 "R29 D-ARCH-6 s17 consumer duty; census 42 = 36 zero-action + 5 carriers + host @ `55c81c0`, "
 "register-equality CI-enforced)",
 "**nle-test-app** 377/377 @ `8f12cf9` — **12 files: " + ROOF12_SLASH + "** (the R8 D29 "
 "real-wiring + the R9/D30 W-A/W-F waves + the RA/RC rounds + the R29 D-ARCH-6 s17 consumer duty "
 "+ the R30 K3 corpus round — " + K3_GLOSS + "; census 42 = 36 zero-action + 5 carriers + host @ "
 "`55c81c0`, register-equality CI-enforced)",
 "12 \u00a70 app row re-keyed (8f12cf9, 377/377, the 12-file inventory)"),

("12-testing-strategy.md",
 "checks THIS row's figures against 00-master's fleet table (749/632/777/691/256; variants "
 "1,939/68 + the declared pair 1,950/126; mini 495/12)",
 "checks THIS row's figures against 00-master's fleet table (749/632/777/701/377; variants "
 "1,939/68 + the declared pair 1,950/126; mini 495/12)",
 "12 \u00a0 suite-census coherence figures re-keyed"),

("12-testing-strategy.md",
 "battery posture: **the R29 suite pins above stay green** (the K1 regression role — **the "
 "battery re-baselines the pin world once, centrally after the fleet** (battery_r28 re-based the "
 "R28 world @ `965308c`; the R29 pins ride the next fork): engine `e3f55bd`/749 (code anchor "
 "`74bef08`), OT `3e18722`/`970948a`/632, WDC `94f6460`/777, nle-ui `6754979`/691, app "
 "`876f2b8`/256 + the consumer pins",
 "battery posture: **the R30 suite pins above stay green** (the K1 regression role — **the "
 "battery re-baselines the pin world once, centrally after the fleet** (battery_r28 re-based the "
 "R28 world @ `965308c`; the R29 pins ride the next fork, re-keyed R30): engine `e3f55bd`/749 "
 "(code anchor `74bef08`), OT `3e18722`/`970948a`/632, WDC `94f6460`/777, nle-ui `5779295`/701, "
 "app `8f12cf9`/377 + the consumer pins",
 "12 ACCEPTANCE battery-posture pin list re-keyed"),

("12-testing-strategy.md",
 "(12 \u00a70/17 \u00a70A's BASE rows equal the R29 pin set 749/632/777/691/256; variants "
 "1,939/68 with the declared pair 1,950/126 recorded; mini 495/12",
 "(12 \u00a70/17 \u00a70A's BASE rows equal the R30 pin set 749/632/777/701/377; variants "
 "1,939/68 with the declared pair 1,950/126 recorded; mini 495/12",
 "12 ACCEPTANCE suite-census coherence class figures re-keyed"),

# =========================== 17-test-plan.md ================================
("17-test-plan.md",
 "**BASE (accepted, pinned 2026-09-08 — the R24 re-pin, re-keyed R27, re-keyed R29; 00-master's "
 "fleet table is the pin canon, D21):**",
 "**BASE (accepted, pinned 2026-09-08 — the R24 re-pin, re-keyed R27, re-keyed R29, re-keyed "
 "R30; 00-master's fleet table is the pin canon, D21):**",
 "17 \u00a70A BASE header gains the R30 re-key label"),

("17-test-plan.md",
 "ALL GREEN at the R29 pins: **engine 749/749 @ `e3f55bd`**",
 "ALL GREEN at the R30 pins (the engine/OT/WDC pins UNMOVED from R29): **engine 749/749 @ "
 "`e3f55bd`**",
 "17 \u00a70A posture label R29->R30"),

("17-test-plan.md",
 "**nle-ui 691 @ `6754979`** (F3/F7 real-gain + the kind-aware mute-all pin + the D29 seam waves "
 "— the saveState lifecycle, the DeliverPage `exportRequest`, the per-scene grade sidecar; AW1-2 "
 "the Gain ceiling + AW1-4 the D-ARCH-6 pool seam + ENG-1; boundary-script-gated)",
 "**nle-ui 701 @ `5779295`** (F3/F7 real-gain + the kind-aware mute-all pin + the D29 seam waves "
 "— the saveState lifecycle, the DeliverPage `exportRequest`, the per-scene grade sidecar; AW1-2 "
 "the Gain ceiling + AW1-4 the D-ARCH-6 pool seam + ENG-1; " + NLEUI_GLOSS + "; "
 "boundary-script-gated)",
 "17 \u00a70A nle-ui row re-keyed (5779295, 701)"),

("17-test-plan.md",
 "**app 256/256 @ `876f2b8`** (the **8-suite roof**: GluedShell 104 + audioService 42 + "
 "sceneBridge 41 + deliverService 20 + persistenceService 20 + **wire-coverage 13** + engineSeam "
 "7 + **waveformPeaks 9**; the R8 D29 real-wiring wave — autosave/persistence, sidechain ducking, "
 "deliver export, effects/color preview — plus RR1-B and the W3 JKL audio half standing; the "
 "R9/R25-R27 waves: W-C/W-D/W-E landed, the AR-2 gesture pin + the LIVE-registry consumption law "
 "in the wire-coverage suite)",
 "**app 377/377 @ `8f12cf9`** (the **12-file roof**: " + ROOF12 + "; the R8 D29 real-wiring wave "
 "— autosave/persistence, sidechain ducking, deliver export, effects/color preview — plus RR1-B "
 "and the W3 JKL audio half standing; the R9/R25-R27 waves: W-C/W-D/W-E landed, the AR-2 gesture "
 "pin + the LIVE-registry consumption law in the wire-coverage suite; the R30 K3 corpus round — "
 "the +4 NEW test files engineService/timeline-geometry/history-laws/keybindings-repeat + the C16 "
 "auto-repeat guard in use-keybindings.ts + the four maps docs/k3-map-*.md)",
 "17 \u00a70A app row re-keyed (8f12cf9, 377/377, the 12-file roof)"),

("17-test-plan.md",
 "nle-ui @ `6754979` — the AW1-2 absorb LANDED; WDC @ `ec8fd5c` (unchanged); the engine's OT "
 "submodule @ `55c81c0`); all CI-green).",
 "nle-ui @ `5779295` — the R30 re-key (the C16 twin `83af958` + the K3 FIX-2 `5779295`); WDC @ "
 "`ec8fd5c` (unchanged); the engine's OT submodule @ `55c81c0`); all CI-green).",
 "17 \u00a70A consumer-pin set: nle-ui re-keyed"),

("17-test-plan.md",
 "ALL GREEN at the R29 pins — OT's milestone register grew to **72 entries** (M44-M58 + the "
 "M49T/H/R/G + M51R/M55R/M57R/M58R real-mouse families + the M49C coverage gate), the engine net "
 "440\u2192458\u2192748\u2192**749**, nle-ui 648\u2192674\u2192690\u2192**691**, the app roof "
 "117\u2192174\u2192252\u2192**256 (8 suites)**.",
 "ALL GREEN at the R30 pins — OT's milestone register grew to **72 entries** (M44-M58 + the "
 "M49T/H/R/G + M51R/M55R/M57R/M58R real-mouse families + the M49C coverage gate), the engine net "
 "440\u2192458\u2192748\u2192**749**, nle-ui 648\u2192674\u2192690\u2192691\u2192**701**, the app "
 "roof 117\u2192174\u2192252\u2192256\u2192**377 (12 files)**.",
 "17 K1 row: the growth chains extended to the R30 live values"),

("17-test-plan.md",
 "**the app repo (nle-test-app) is the roof: 256/256 seam/wired-whole tests — the 8-suite "
 "inventory (R29 re-key, @ `876f2b8`): GluedShell 104 + audioService 42 + sceneBridge 41 + "
 "deliverService 20 + persistenceService 20 + wire-coverage 13 + engineSeam 7 + waveformPeaks 9 "
 "— the census register 42 = 36 zero-action + 5 carriers + 1 host; + the crawl's K3 law-net "
 "corpus**",
 "**the app repo (nle-test-app) is the roof: 377/377 seam/wired-whole tests — the 12-file "
 "inventory (R30 re-key, @ `8f12cf9`): " + ROOF12 + " — the census register 42 = 36 zero-action + "
 "5 carriers + 1 host; + the crawl's K3 law-net corpus (the K3 corpus round LANDED R30 @ "
 "`8f12cf9`)**",
 "17 \u00a717A roof re-keyed (377/377, the 12-file inventory)"),

# =========================== 18-ui-shell.md =================================
("18-ui-shell.md",
 "engine `e3f55bd` [749/749, chore-only over code anchor `74bef08`], WDC `94f6460` [777/777, "
 "docs-only over `ec8fd5c`]]):**",
 "engine `e3f55bd` [749/749, chore-only over code anchor `74bef08`], WDC `94f6460` [777/777, "
 "docs-only over `ec8fd5c`]; **re-pinned 2026-09-16 at the R30 fleet — nle-ui `5779295` "
 "[701/701; `83af958` the C16 package twin + the 4 package-gap pins; `5779295` the K3 FIX-2 — "
 "the 3-verb dead-history-entry class + 4 pins], app `8f12cf9` [377/377, 12 files], the "
 "OT/engine/WDC pins UNMOVED]):**",
 "LAYER-APPEND 18 BASE header R30 re-pin layer"),

("18-ui-shell.md",
 "consumer pin: the app's `vendor/nle-ui` @ `6754979` — the AW1-2 absorb LANDED, the vendor "
 "re-converged at the package HEAD; **691 tests** — 690/690 RUN LIVE at the R27 re-pin, 691 at "
 "the R29 re-pin, 37 test files, 74 stories",
 "consumer pin: the app's `vendor/nle-ui` @ `5779295` — the R30 re-key, the app CURRENT at the "
 "package HEAD; **701 tests** — 690/690 RUN LIVE at the R27 re-pin, 691 at the R29 re-pin, 701 "
 "at the R30 re-pin, 37 test files, 74 stories",
 "18 \u00a70 nle-ui consumer pin + live-run chain re-keyed"),

("18-ui-shell.md",
 "the app pins it via `vendor/nle-ui` @ `6754979` — the AW1-2 absorb LANDED; the package HEAD is "
 "`6754979`)",
 "the app pins it via `vendor/nle-ui` @ `5779295` — the R30 re-key (the C16 twin + the K3 "
 "FIX-2); the package HEAD is `5779295`)",
 "18 module table nle-ui row: pin + HEAD re-keyed"),

("18-ui-shell.md",
 "**691 tests** (37 test files, 691/691 run live at the R29 re-pin — 690/690 at R27; the R27 "
 "landings: R9-b `el.preservePitch` + FW-D `setElementFieldAll` + F4-6/F4-7 + AW1-2 the Inspector "
 "Gain ceiling [\u221260,+20]; the R29 landings: AW1-4 the mediaInsertAtPlayhead pool seam + ENG-1)",
 "**701 tests** (37 test files, 701/701 run live at the R30 re-pin — 691/691 at R29, 690/690 at "
 "R27; the R27 landings: R9-b `el.preservePitch` + FW-D `setElementFieldAll` + F4-6/F4-7 + AW1-2 "
 "the Inspector Gain ceiling [\u221260,+20]; the R29 landings: AW1-4 the mediaInsertAtPlayhead "
 "pool seam + ENG-1; the R30 landings: `83af958` the C16 package twin + the 4 package-gap pins; "
 "`5779295` the K3 FIX-2 — the 3-verb dead-history-entry class + 4 pins)",
 "18 module table nle-ui row: 701 tests + the R30 landings"),

# =========================== 16-keyboard-shortcuts.md =======================
("16-keyboard-shortcuts.md",
 "- nle-test-app @ `876f2b8` — **256/256** (the 8-suite roof: GluedShell 104 + audioService 42 + "
 "sceneBridge 41 + deliverService 20 + persistenceService 20 + wire-coverage 13 + engineSeam 7 + "
 "waveformPeaks 9), tsc 0 (was `c885ece` 174 at R24, `70e99f0` 117/117 at R23, `e662759` 83/83 "
 "at R22).",
 "- nle-test-app @ `8f12cf9` — **377/377** (the 12-file roof — R30 re-key: " + ROOF12 + "; the "
 "keybindings-repeat suite = the C16 auto-repeat guard in use-keybindings.ts), tsc 0 (was "
 "`876f2b8` 256/256 at R29, `c885ece` 174 at R24, `70e99f0` 117/117 at R23, `e662759` 83/83 at "
 "R22).",
 "16 \u00a70 app row re-keyed (8f12cf9, 377/377, the 12-file roof) + the R29 trail"),

("16-keyboard-shortcuts.md",
 "- nle-ui @ `6754979` — **691/691** (the R9-b preservePitch + F4 identity guards + FW-D "
 "`setElementFieldAll` + AW1-2 the Gain ceiling [\u221260,+20] + AW1-4 the D-ARCH-6 pool seam + "
 "ENG-1).",
 "- nle-ui @ `5779295` — **701/701** (the R9-b preservePitch + F4 identity guards + FW-D "
 "`setElementFieldAll` + AW1-2 the Gain ceiling [\u221260,+20] + AW1-4 the D-ARCH-6 pool seam + "
 "ENG-1; " + NLEUI_GLOSS + ").",
 "16 \u00a70 nle-ui row re-keyed (5779295, 701/701)"),

("16-keyboard-shortcuts.md",
 "BASE acceptance = the cited suites at the cited pins (**app 256 @ `876f2b8`; mini 495 "
 "in-flight (the R24-2 W6/W7 pending; the register re-keys at the WRAP) (R24-2 in flight); "
 "nle-ui 691 @ `6754979`**;",
 "BASE acceptance = the cited suites at the cited pins (**app 377 @ `8f12cf9` (the 12-file roof — "
 "R30 re-key); mini 495 in-flight (the R24-2 W6/W7 pending; the register re-keys at the WRAP) "
 "(R24-2 in flight); nle-ui 701 @ `5779295`**;",
 "16 ACCEPTANCE BASE pins re-keyed"),

("16-keyboard-shortcuts.md",
 "the app's key surface at `876f2b8` (256/256 — the S1 JKL pins, the S2 delete/undo round-trips; "
 "the M28R-law pins LANDED with D30 W-D)",
 "the app's key surface at `8f12cf9` (377/377 — the S1 JKL pins, the S2 delete/undo round-trips; "
 "the M28R-law pins LANDED with D30 W-D; the keybindings-repeat suite 4 — the C16 auto-repeat "
 "guard in use-keybindings.ts, R30)",
 "16 Phase-2-exit K3 evidence row re-keyed"),

# =========================== 15-wire-protocol.md ============================
("15-wire-protocol.md",
 "- nle-test-app @ **`c020b2a`** — **252/252** (8 suites, live-run R27), tsc 0.",
 "- nle-test-app @ **`8f12cf9`** — **377/377** (12 files, live-run R30 — the K3 corpus round; "
 "R30 re-key over the R29 `876f2b8` 256/256, itself over the R27 `c020b2a` 252/252), tsc 0.",
 "15 \u00a70 app leading pin re-keyed (the R29-missed site, stale-by-omission closed)"),

# =========================== 05-timeline.md =================================
("05-timeline.md",
 "- nle-test-app @ `876f2b8` — **256/256** (the 8-suite roof: GluedShell 104 + audioService 42 + "
 "sceneBridge 41 + deliverService 20 + persistenceService 20 + wire-coverage 9 + engineSeam 7 + "
 "waveformPeaks 9), tsc 0.",
 "- nle-test-app @ `8f12cf9` — **377/377** (the 12-file roof — R30 re-key: " + ROOF12 + "), tsc 0.",
 "05 \u00a70 app row re-keyed (8f12cf9, 377/377; the stale 9-count inventory replaced)"),

# =========================== 09-project-model.md ============================
("09-project-model.md",
 "- nle-test-app @ `876f2b8` — **256/256** (the R8 D29 real-wiring round + the R9/R25-R27 waves; "
 "the 8-suite roof: GluedShell 104 + audioService 42 + sceneBridge 41 + deliverService 20 + "
 "persistenceService 20 + wire-coverage 9 + engineSeam 7 + waveformPeaks 9), tsc 0, boundary green:",
 "- nle-test-app @ `8f12cf9` — **377/377** (the R8 D29 real-wiring round + the R9/R25-R27 waves + "
 "the R30 K3 corpus round; the 12-file roof: " + ROOF12 + "), tsc 0, boundary green:",
 "09 \u00a70 app row re-keyed (8f12cf9, 377/377, the 12-file roof)"),

("09-project-model.md",
 "(Consumer pins at this HEAD: nle-ui @ `6754979` (the AW1-2 absorb LANDED with the freshness "
 "re-pin),",
 "(Consumer pins at this HEAD: nle-ui @ `5779295` (the R30 re-key — the C16 twin `83af958` + the "
 "K3 FIX-2 `5779295`),",
 "09 \u00a70 consumer-pin set: nle-ui re-keyed"),

("09-project-model.md",
 "(nle-ui W2.3 `9b0a36c`, now @ `6754979`)",
 "(nle-ui W2.3 `9b0a36c`, now @ `5779295`)",
 "09 persistence row: the package pin re-keyed"),

# =========================== 20-audio-core.md ===============================
("20-audio-core.md",
 "re-pinned 2026-09-16 @ the R29 HEADs — WDC `94f6460` (docs-only over code anchor `ec8fd5c` — "
 "the ENG-2 S-series docs wrap), engine `e3f55bd` (chore-only re-pin; code anchor `74bef08` "
 "UNCHANGED), app `876f2b8`):**",
 "re-pinned 2026-09-16 @ the R29 HEADs — WDC `94f6460` (docs-only over code anchor `ec8fd5c` — "
 "the ENG-2 S-series docs wrap), engine `e3f55bd` (chore-only re-pin; code anchor `74bef08` "
 "UNCHANGED), app `876f2b8`; re-pinned 2026-09-16 @ the R30 HEADs — WDC/engine/OT pins UNMOVED, "
 "app `8f12cf9` (the K3 corpus round, 377/377 — the 12-file roof) + nle-ui `5779295` "
 "(701/701)):**",
 "LAYER-APPEND 20 BASE header R30 re-pin layer"),

("20-audio-core.md",
 "- The app's WDC audio host @ nle-test-app `876f2b8` — **256/256**, tsc 0 (the R29 re-pin: "
 "vendors WDC `ec8fd5c` (unchanged)",
 "- The app's WDC audio host @ nle-test-app `8f12cf9` — **377/377**, tsc 0 (the R30 re-key — the "
 "K3 corpus round; the R29 re-pin: vendors WDC `ec8fd5c` (unchanged)",
 "20 \u00a70 app WDC-host row re-keyed (8f12cf9, 377/377)"),

("20-audio-core.md",
 "8 suites — GluedShell, audioService, sceneBridge, deliverService, persistenceService, "
 "wire-coverage, engineSeam, waveformPeaks; the R24 record was `c885ece` 174/174)",
 "12 files — " + ROOF12_NAMES + "; the R24 record was `c885ece` 174/174)",
 "20 \u00a70 app suite list re-keyed to the 12 files"),

# =========================== 01-core-engine.md ==============================
("01-core-engine.md",
 "- nle-test-app @ **`876f2b8`** — **256/256** (8-suite roof: GluedShell 104 + audioService 42 + "
 "sceneBridge 41 + deliverService 20 + persistenceService 20 + wire-coverage 13 + engineSeam 7 + "
 "waveformPeaks 9; census 42 = 36 zero-action + 5 carriers + 1 host @ OT mirror `55c81c0`; AR-2 "
 "wire-coverage gate GREEN against the live 31/28+3 registry; maintainPitch threaded at "
 "engineService.ts:510-513 + sceneBridge.ts:262/:447), tsc 0 —",
 "- nle-test-app @ **`8f12cf9`** — **377/377** (12-file roof — R30 re-key: " + ROOF12 + "; census "
 "42 = 36 zero-action + 5 carriers + 1 host @ OT mirror `55c81c0`; AR-2 wire-coverage gate GREEN "
 "against the live 31/28+3 registry; maintainPitch threaded at engineService.ts:510-513 + "
 "sceneBridge.ts:262/:447), tsc 0 —",
 "01 \u00a70 app row re-keyed (8f12cf9, 377/377, the 12-file roof)"),

("01-core-engine.md",
 "Consumes engine @ `e3f55bd` (the R29 re-pin — re-converged), nle-ui @ `6754979` (the AW1-2 "
 "absorb landed with the freshness re-pin), OT lock-copy @ `55c81c0`",
 "Consumes engine @ `e3f55bd` (the R29 re-pin — re-converged), nle-ui @ `5779295` (the R30 "
 "re-key — the C16 twin + the K3 FIX-2), OT lock-copy @ `55c81c0`",
 "01 \u00a70 consumer-pin set: nle-ui re-keyed"),

("01-core-engine.md",
 "`el.preservePitch` is ElementJSON law (absent\u2261true; nle-ui `6754979`)",
 "`el.preservePitch` is ElementJSON law (absent\u2261true; nle-ui `5779295`)",
 "01 preservePitch law-home pin citation re-keyed"),

# =========================== 02-workers-threading.md ========================
("02-workers-threading.md",
 "- nle-test-app @ `876f2b8` — 256/256, tsc 0 — the audio-thread-side consumption proof, now "
 "four-fold:",
 "- nle-test-app @ `8f12cf9` — 377/377, tsc 0 — the audio-thread-side consumption proof, now "
 "four-fold:",
 "02 \u00a70 app row re-keyed (8f12cf9, 377/377)"),

# =========================== 03-playback-engine.md =========================
("03-playback-engine.md",
 "- nle-test-app @ `876f2b8` — **256/256 vitest** (GluedShell 104 + audioService 42 + "
 "sceneBridge 41 + deliverService 20 + persistenceService 20 + wire-coverage 9 + engineSeam 7 + "
 "waveformPeaks 9; the R8 D29 real-wiring round + the R9/R25-R27 waves took "
 "117\u2192174\u2192206\u2192252), tsc 0",
 "- nle-test-app @ `8f12cf9` — **377/377 vitest** (" + ROOF12 + "; the R8 D29 real-wiring round "
 "+ the R9/R25-R27 waves + the R30 K3 corpus round took "
 "117\u2192174\u2192206\u2192252\u2192256\u2192377), tsc 0",
 "03 \u00a70 app row re-keyed (8f12cf9, 377/377; the growth chain extended)"),

("03-playback-engine.md",
 "the app also pins nle-ui @ `6754979` (the AW1-2 absorb LANDED with the freshness re-pin; was "
 "`83ff8a8`) + WDC @ `ec8fd5c`;",
 "the app also pins nle-ui @ `5779295` (the R30 re-key — the C16 twin `83af958` + the K3 FIX-2 "
 "`5779295`; was `6754979` the AW1-2 absorb, before that `83ff8a8`) + WDC @ `ec8fd5c`;",
 "03 consumer-pin note: nle-ui re-keyed"),

# =========================== 06-nle-ops.md ==================================
("06-nle-ops.md",
 "R29 re-anchor: engine `e3f55bd` (chore-only re-pin — the engine's own code UNMOVED at code "
 "anchor `74bef08`; timeline.ts at 8,997) / OT code pin `970948a` (HEAD `3e18722`, seal18 W1+W2 "
 "reviews/docs-only) / app `876f2b8`***):**",
 "R29 re-anchor: engine `e3f55bd` (chore-only re-pin — the engine's own code UNMOVED at code "
 "anchor `74bef08`; timeline.ts at 8,997) / OT code pin `970948a` (HEAD `3e18722`, seal18 W1+W2 "
 "reviews/docs-only) / app `876f2b8`; R30 re-anchor: the engine/OT/WDC pins UNMOVED, app "
 "`8f12cf9`***):**",
 "LAYER-APPEND 06 ten-mode matrix R30 re-anchor layer"),

# =========================== IMPLEMENTATION-PLAN.md =========================
("IMPLEMENTATION-PLAN.md",
 "Current reference set (2026-09-16, the R29 pins;",
 "Current reference set (2026-09-16, the R30 pins — the R29 engine/OT/WDC pins UNMOVED;",
 "PLAN pin-world label R29->R30"),

("IMPLEMENTATION-PLAN.md",
 "nle-ui `6754979` (**691** — CODE: AW1-2 the Gain ceiling + AW1-4 the mediaInsertAtPlayhead "
 "shell seam + ENG-1) / app `876f2b8` (**256**, the 8-suite roof; census 42 = 36 zero-action (6 "
 "byte + 30 mechanical) + 5 carriers + 1 host @ OT mirror `55c81c0`)",
 "nle-ui `5779295` (**701** — CODE: `83af958` the C16 package twin + the 4 package-gap pins; "
 "`5779295` the K3 FIX-2 — the 3-verb dead-history-entry class "
 "(setEffectParam/toggleEffect/removeEffect unknown-fx miss-guards) + 4 pins; atop the R29 AW1-2 "
 "the Gain ceiling + AW1-4 the mediaInsertAtPlayhead shell seam + ENG-1) / app `8f12cf9` "
 "(**377**, the 12-file roof — " + ROOF12 + "; census 42 = 36 zero-action (6 byte + 30 "
 "mechanical) + 5 carriers + 1 host @ OT mirror `55c81c0`)",
 "PLAN pin-world nle-ui + app re-keyed (5779295/701; 8f12cf9/377/12-file roof)"),

("IMPLEMENTATION-PLAN.md",
 "app\u2192engine `e3f55bd` + OT mirror `55c81c0` + nle-ui `6754979` (AW1-2 absorbed) + WDC "
 "`ec8fd5c`.",
 "app\u2192engine `e3f55bd` + OT mirror `55c81c0` + nle-ui `5779295` (the R30 re-key — the C16 "
 "twin + the K3 FIX-2) + WDC `ec8fd5c`.",
 "PLAN pin-world consumer pins: nle-ui re-keyed"),

("IMPLEMENTATION-PLAN.md",
 "(the R29 state, live-verified: engine 749/749 @ `e3f55bd` (code anchor `74bef08` — the R29 "
 "re-pin chore-only), OT 632/632 @ `3e18722` incl. the M49C gate 28 routed + 3 exceptions, WDC "
 "777/777 @ `94f6460` (docs-only over `ec8fd5c`), nle-ui 691 @ `6754979`, app 256/256 @ "
 "`876f2b8` — live-run;",
 "(the R30 state, live-verified: engine 749/749 @ `e3f55bd` (code anchor `74bef08` — the R29 "
 "re-pin chore-only), OT 632/632 @ `3e18722` incl. the M49C gate 28 routed + 3 exceptions, WDC "
 "777/777 @ `94f6460` (docs-only over `ec8fd5c`), nle-ui 701 @ `5779295`, app 377/377 @ "
 "`8f12cf9` — live-run;",
 "PLAN K1 module-nets gate row re-keyed"),

("IMPLEMENTATION-PLAN.md",
 "| the app's vitest (**256\u2192**), `tsc`, `npm run boundary`, `vite build`, the census script "
 "(CI-enforced), the wire-coverage gate |",
 "| the app's vitest (**377** — the R30 K3 corpus round @ `8f12cf9`), `tsc`, `npm run boundary`, "
 "`vite build`, the census script (CI-enforced), the wire-coverage gate |",
 "PLAN S-app gate column: the vitest figure re-keyed"),

("IMPLEMENTATION-PLAN.md",
 "**(2) K3's store/policy halves \u2225 (the LAW-NET corpus re-expression — unstarted):**",
 "**(2) K3's store/policy halves \u2225 (the LAW-NET corpus re-expression — unstarted at R29; "
 "the R30 K3 corpus round LANDED @ `8f12cf9`: the +4 NEW test files "
 "engineService/timeline-geometry/history-laws/keybindings-repeat + the C16 auto-repeat guard in "
 "use-keybindings.ts + the four maps docs/k3-map-*.md):**",
 "PLAN S-app step (2): the R30 K3 corpus landing noted (was 'unstarted')"),

("IMPLEMENTATION-PLAN.md",
 "**The single global entry point:** this table. When in doubt: S-app row \u2192 step (2) (the "
 "K3 corpus — the crawl's bulk; step (1)'s D-ARCH-6 re-pin + seam switch — the gate-breaking "
 "duty — is LANDED @ `876f2b8`, and everything else in the crawl rides \u2225 behind the corpus).",
 "**The single global entry point:** this table. When in doubt: S-app row \u2192 step (2) (the "
 "K3 corpus — the crawl's bulk; the R30 K3 corpus round LANDED @ `8f12cf9` — the +4 NEW test "
 "files + the C16 auto-repeat guard + the four maps docs/k3-map-*.md; step (1)'s D-ARCH-6 re-pin "
 "+ seam switch — the gate-breaking duty — is LANDED @ `876f2b8`, and everything else in the "
 "crawl rides \u2225 behind the corpus).",
 "PLAN global entry point: the R30 K3 corpus landing noted"),

("IMPLEMENTATION-PLAN.md",
 "+ the app hygiene ticks \u2192 the K3 corpus (store/policy \u2225 mode rows \u2225 shell-path "
 "pins) + the mapping row",
 "+ the app hygiene ticks \u2192 the K3 corpus (store/policy \u2225 mode rows \u2225 shell-path "
 "pins — the R30 K3 corpus round LANDED @ `8f12cf9`: the +4 NEW test files + the C16 "
 "auto-repeat guard + the four maps docs/k3-map-*.md) + the mapping row",
 "PLAN S-app execution ladder: the R30 K3 corpus landing noted"),

("IMPLEMENTATION-PLAN.md",
 "S-app's K3 corpus (the D-ARCH-6 re-pin + seam switch LANDED @ `876f2b8`) \u2225",
 "S-app's K3 corpus (the D-ARCH-6 re-pin + seam switch LANDED @ `876f2b8`; the R30 K3 corpus "
 "round LANDED @ `8f12cf9`) \u2225",
 "PLAN parallel-streams row: the R30 K3 corpus landing noted"),

# ---------------------------------------------------------------------------
# The edits for the R29-missed live sites (rule 7 — stale-by-omission)
# ---------------------------------------------------------------------------
("02-workers-threading.md",
 "The landed audio-thread surfaces carry their own in-suite pins today: engine "
 "W2a\u2013W2k + W1 + H16 + N2b (748), WDC W2/W2l/W2o/W2p/W2q/W2r + W1k (777), app W2 wiring + W3 "
 "JKL (252).",
 "The landed audio-thread surfaces carry their own in-suite pins today: engine "
 "W2a\u2013W2k + W1 + H16 + N2b (749), WDC W2/W2l/W2o/W2p/W2q/W2r + W1k (777), app W2 wiring + W3 "
 "JKL (377 \u2014 the R30 re-key).",
 "02 the 'in-suite pins today' sentence re-keyed (749/777/377 \u2014 an R29-missed live site)"),

("10-fcpxml-export.md",
 "- The app @ `c020b2a` (252/252) HAS the deliver CTA wired to a REAL export",
 "- The app @ `8f12cf9` (377/377 \u2014 the R30 re-key; the R27 reading `c020b2a` 252/252) HAS the "
 "deliver CTA wired to a REAL export",
 "10 \u00a70 app deliver-CTA row re-keyed (an R29-missed live site)"),

# =========================== TESTABILITY-SIGNOFF.md =========================
("TESTABILITY-SIGNOFF.md",
 "/ mini 495/12 (sibling-maintained). **The stale-number riders re-keyed a second time:**",
 "/ mini 495/12 (sibling-maintained). **Re-keyed R30 (the K3 corpus round): nle-ui 701 @ "
 "`5779295` (`83af958` the C16 package twin + the 4 package-gap pins; `5779295` the K3 FIX-2 — "
 "the 3-verb dead-history-entry class (setEffectParam/toggleEffect/removeEffect unknown-fx "
 "miss-guards) + 4 pins) / app 377 @ `8f12cf9` (the 12-file roof: " + ROOF12 + "; the C16 "
 "auto-repeat guard in use-keybindings.ts; the four maps docs/k3-map-*.md) — the engine/OT/WDC "
 "pins and the wire census 31 = 28 routed + 3 exceptions UNMOVED.** **The stale-number riders "
 "re-keyed a second time:**",
 "LAYER-APPEND TESTABILITY-SIGNOFF R28 re-rider: the R30 re-key sentence"),

# =========================== FINAL-SIGNOFF.md ===============================
("FINAL-SIGNOFF.md",
 "the K1 net at the R28 pins, **re-keyed R29 (the same-day parallel execution fleet move)**: "
 "engine 749 / OT 632 / WDC 777 / nle-ui **691** / app **256** (the register + 12 \u00a70 carry "
 "the canon; battery_r28 re-baselines)",
 "the K1 net at the R28 pins, **re-keyed R29 (the same-day parallel execution fleet move)**: "
 "engine 749 / OT 632 / WDC 777 / nle-ui **691** / app **256** — **re-keyed R30 (the K3 corpus "
 "round): nle-ui 701 / app 377** (the register + 12 \u00a70 carry the canon; battery_r28 "
 "re-baselines)",
 "FINAL-SIGNOFF K1 net figures re-keyed R30"),
]

# ---------------------------------------------------------------------------
# Validate -> apply
# ---------------------------------------------------------------------------
def main():
    texts = {}
    failures = []
    applied = {}   # file -> count
    layers = []    # the layer-append notes
    for (fn, old, new, note) in EDITS:
        if fn not in texts:
            with open(fn, encoding="utf-8") as f:
                texts[fn] = f.read()
        t = texts[fn]
        n = t.count(old)
        if n == 1:
            continue
        if n == 0 and t.count(new) == 1:
            print(f"  [skip: already applied] {fn}: {note}")
            continue
        failures.append(f"{fn}: expected exactly 1 occurrence, found {n}: {note}\n      old={old[:120]!r}...")

    if failures:
        print("VALIDATION FAILURES (nothing written):")
        for f in failures:
            print("  FAIL " + f)
        sys.exit(1)

    if not DRY:
        for (fn, old, new, note) in EDITS:
            with open(fn, encoding="utf-8") as f:
                t = f.read()
            if t.count(old) == 1:
                t = t.replace(old, new, 1)
                with open(fn, "w", encoding="utf-8") as f:
                    f.write(t)
                texts[fn] = t
                applied[fn] = applied.get(fn, 0) + 1
                if note.startswith("LAYER-APPEND"):
                    layers.append(f"{fn}: {note}")

    # --- the per-file tally ---
    print()
    print("=" * 78)
    print("R30 RE-KEY — per-file replacement tally")
    print("=" * 78)
    total = 0
    for fn in sorted(applied):
        print(f"  {fn:32s} {applied[fn]:3d} replacement(s)")
        total += applied[fn]
    print(f"  {'TOTAL':32s} {total:3d}")
    if DRY:
        print("  (dry run — all edits validated, nothing written)")

    # --- the layer-append list ---
    print()
    print("=" * 78)
    print("LAYER APPENDS (the R29 layer verbatim, a NEW R30 layer appended)")
    print("=" * 78)
    for l in layers:
        print("  + " + l)

    # --- the residual verification (the context law) ---
    print()
    print("=" * 78)
    print("RESIDUAL SCAN — every remaining stale-pattern hit, classified")
    print("=" * 78)
    live_total = 0
    hist_total = 0
    for fn in SCAN_FILES:
        with open(fn, encoding="utf-8") as f:
            t = f.read()
        for pat in STALE_PATTERNS:
            for m in re.finditer(re.escape(pat), t):
                h = m.start()
                # skip the known false positive: "18-suite" (WDC's integration family)
                if pat == "8-suite" and t[max(0, h-1):h] == "1":
                    continue
                ctx = t[max(0, h-260):h+260]
                arrow = "\u2192" in t[h-12:h+18]
                marker = next((k for k in HISTORICAL_MARKERS if k in ctx), None)
                line_rule = _line_classified_historical(t, h)
                line_no = t.count("\n", 0, h) + 1
                if arrow or marker or line_rule:
                    hist_total += 1
                    why = ('\u2192' if arrow else (repr(marker) if marker else line_rule))
                    print(f"  HIST  {fn}:{line_no} [{pat}] via {why}")
                else:
                    live_total += 1
                    print(f"  LIVE  {fn}:{line_no} [{pat}]  <<< NEEDS REVIEW")
                    print("        ..." + t[max(0, h-150):h+150].replace("\n", " ") + "...")
    print()
    print(f"residual: {hist_total} HISTORICAL (left untouched, per the context law), "
          f"{live_total} LIVE (must be 0)")
    if live_total:
        print("RESIDUAL LIVE HITS REMAIN — fix before handoff")
        sys.exit(1)
    print()
    print("R30 RE-KEY COMPLETE — every LIVE statement moved to the R30 pin world; every "
          "historical record preserved.")
    sys.exit(0)

if __name__ == "__main__":
    main()
