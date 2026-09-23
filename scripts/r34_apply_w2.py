#!/usr/bin/env python3
"""R34 W2 apply — the Testing-mirrors repair + the K2 census/registration flip + the adjacent
stale sites. Sources: the W1-a audit pack (17 §14.2 + spec 12's 11 edits + 5 adjacent sites,
all live-verified at the R33 pins) + the W1-b2 K2 draft (5 edits, anchors verified unique).
Anchors are exact substrings; every edit asserts exactly-once presence before replacing."""

import io, os, sys

REPO = os.path.dirname(os.path.abspath(__file__)) + "/.."

def load(f):
    with io.open(os.path.join(REPO, f), encoding="utf-8") as fh:
        return fh.read()

def save(f, t):
    with io.open(os.path.join(REPO, f), "w", encoding="utf-8", newline="") as fh:
        fh.write(t)

EDITS = []  # (file, label, old, new)

# ============ GROUP A — 17-test-plan.md ============
F17 = "17-test-plan.md"

# A1: §14.2 preamble marker
EDITS.append((F17, "A1 §14.2 preamble marker",
    "Process specs 13-17 (scout plan, phases, wire protocol, keyboard, test\nplan) carry their own test content inline (e.g. this spec's §18) and are\nexempt from the §4 template.",
    "Process specs 13-17 (scout plan, phases, wire protocol, keyboard, test\nplan) carry their own test content inline (e.g. this spec's §18) and are\nexempt from the §4 template. (R34, W1-a — the location column re-based to\nthe cc17fea corpus; every heading grep-verified.)"))

# A2-A13: the 12 module rows' location cells (04/07 are `## 17. Testing`; 08 `## 19. Testing`; 10 `## 16. Testing`)
for num, fname, old_head, old_ln, new_ln in [
    ("01", "01-core-engine.md", "`## Testing`", "≈2108", "≈2184"),
    ("02", "02-workers-threading.md", "`## Testing`", "≈2493", "≈2551"),
    ("03", "03-playback-engine.md", "`## Testing`", "≈2371", "≈2437"),
    ("04", "04-renderer-color.md", "`## 17. Testing`", "≈2084", "≈2132"),
    ("05", "05-timeline.md", "`## Testing`", "≈1428", "≈1627"),
    ("06", "06-nle-ops.md", "`## Testing`", "≈2908", "≈3198"),
    ("07", "07-composition.md", "`## 17. Testing`", "≈1655", "≈1760"),
    ("08", "08-color-grading.md", "`## 19. Testing`", "≈2056", "≈2135"),
    ("09", "09-project-model.md", "`## Testing`", "≈2465", "≈2622"),
    ("10", "10-fcpxml-export.md", "`## Testing`", "≈1863", "`## 16. Testing` (≈1981"),
    ("11", "11-cloud-render.md", "`## Testing`", "≈2385", "≈2444"),
    ("12", "12-testing-strategy.md", "`## Testing`", "≈2362", "≈2468"),
]:
    if num == "10":
        old_cell = "`%s` `## Testing` (≈1863)" % fname
        new_cell = "`%s` `## 16. Testing` (≈1981)" % fname
    else:
        # old_head arrives WITH its own backticks (e.g. "`## Testing`")
        old_cell = "`%s` %s (%s)" % (fname, old_head, old_ln)
        new_cell = "`%s` %s (%s)" % (fname, old_head, new_ln)
    EDITS.append((F17, "A-row %s" % num, old_cell, new_cell))

# A14: row 18 sharpen
EDITS.append((F17, "A14 row 18 sharpen",
    "| 18 | UI shell | UI shell panels (row above) | `18-ui-shell.md` §12 (Tier 3 shell suite) |",
    "| 18 | UI shell | UI shell panels (row above) | `18-ui-shell.md` §12 `## 12. Testing` (≈499) (Tier 3 shell suite) |"))

# A15: K2 Edit 3 — the :26 GAP register row marker flip
EDITS.append((F17, "A15 K2 marker flip",
    "registration state at R24: still PENDING — K2 entry hasn't happened, the instruments + counts below pre-register the gate)**",
    "registration state at R24: still PENDING — K2 entry hasn't happened, the instruments + counts below pre-register the gate; **R34 re-key (R34-W1-b): LANDED — the census record at this row's end; spec 12 §0's twin row the registration home + the §13A.7 re-tier row the register**)**"))

# A16: K2 Edit 4 — the census record appended at the row tail
EDITS.append((F17, "A16 K2 census record",
    "close the missing cross-module pairs (the OT-ops→engine-decode round-trips at the app's seam shapes — S-engine's worklist item) (acceptance: the family census green + registered in spec 12/17 §13A.7 + battery-checked thereafter);",
    "close the missing cross-module pairs (the OT-ops→engine-decode round-trips at the app's seam shapes — S-engine's worklist item) (acceptance: the family census green + registered in spec 12/17 §13A.7 + battery-checked thereafter); **R34 census record (R34-W1-b, the K2 landing at the live pins; the R24 nets above — 458/759/632 + the 72-entry register — stay verbatim, superseded): engine-in-the-middle @ `d8b97b4` (CI-only over the R33 seal `2a0ecf4`; 785/785, 29 vitest files, PINNED_TOTAL=785 + the 5-job CI venue) — `bridge-seams` 151 / `planner` 52 / `video-sync` 31 / `timeline-edit-ops` 13 (247 it( cites; the companion `nle-bridge` pair 99 + 8); WDC's integration family @ `94f6460` (777/777; 34 .test.ts = 19 src/test + 15 src/lib) — `audio-integration` 27 / `real-audio-e2e` 12 / `dsp-bounce-parity` 9 / `dsp-effects-integration` 8 / `nle-audio-core-derisk` 7 / `offline-parity-wiring` 2 (65 it( cites); OT's in-page UI-over-core runner @ `c4c04f1` (the report-json authority: **687/687 at 78 entries** — M1-M64 + the R re-runs + M49C + M62-gate; 675/675 @ `008e7f3` pre-M64), total-only; **M49C green 28/28 @ `344123a`** — 31 = 28 routed + 3 exceptions stands; the missing pairs — the OT-ops→engine-decode round-trips at the app's seam shapes — carried at the app venue (`wire-coverage` 26 + `engineSeam` 7 @ `28f3229`, docs-only over `7664603`; 426/426, the 22-file roof): honestly stated — no engine-resident round-trip suites claimed; engine-side authoring beyond the app-carried shapes stays a forward row (S-engine's worklist), NOT a K2 blocker; per-file figures are static it( cites, the runtime nets are the count-gate pins; registered in 12 §0 + HERE + the §13A.7 re-tier row re-keyed same round; battery-checked at the next fork.**"))

# A17: K2 Edit 5 — the §13A.7 re-tier row
EDITS.append((F17, "A17 K2 §13A.7 re-tier",
    "registration state R24: still PENDING — K2 entry hasn't happened (the census rows land at 458/759/536) | census green + registered + battery-checked; the missing-pair suites green |",
    "registration state R24: still PENDING — K2 entry hasn't happened (the census rows land at 458/759/536) — **R34 re-key (R34-W1-b): LANDED — the census rows at the live pins: engine-in-the-middle within engine 785/785 @ `d8b97b4` (bridge-seams 151 / planner 52 / video-sync 31 / timeline-edit-ops 13), the WDC family within 777/777 @ `94f6460` (65 it( cites across the 6 suites), OT's register 687/687 at 78 entries @ `c4c04f1` (M49C green 28/28 @ `344123a`)** | census green + registered + battery-checked; the missing-pair suites green — **R34: carried at the app's seam shapes (`wire-coverage` 26 + `engineSeam` 7 @ `28f3229`); no engine-resident round-trip suites claimed — forward row (S-engine's worklist), not a K2 blocker** |"))

# A18: K2 flag-1 — the :40 tier row touch-up
EDITS.append((F17, "A18 K2 tier-row touch-up",
    "The seeds exist at HEAD; the census + register land at K2 entry.",
    "The seeds exist at HEAD; the census + register land at K2 entry. (R34: LANDED — the census record at the GAP row above + spec 12 §0's twin.)"))

# A19: adjacent D2 — §13A.1 PERF-1..4 → PERF-1..3
EDITS.append((F17, "A19 PERF-1..3 twin",
    "the perf tier PERF-1..4 @ the engine's `perf.yml`, telemetry-mode first — the fleet's first scheduled workflow)",
    "the perf tier PERF-1..3 @ the engine's `perf.yml`, telemetry-mode first — the fleet's first scheduled workflow; re-keyed R34: the PERF family is 3 files/10 tests (PERF-1 timeline-ops 6 + PERF-2 audio-mixdown 2 + PERF-3 heap-leak 2 — the W1-c verification; the '1..4' was the off-by-one) + the workflow now PARSES (the perf.yml:79 unquoted-colon fix + the two §B.5 steps restored: the perf count-gate `--table perf` mode + the `test:property:explore` randomized-seed pass — engine `d8b97b4`)"))

# A20: adjacent D1 — §0A :22 the missing R33 app layer
EDITS.append((F17, "A20 §0A app R33 layer",
    "re-keyed R33 + 17 M60); engine/WDC pins UNCHANGED**).",
    "re-keyed R33 + 17 M60); engine/WDC pins UNCHANGED**). **R33 app-layer addendum (recorded R34 — the layer was missed in the R33 fold): app `7664603` 426/426 (the lockstep re-pin: vendor engine→`574d8d3` + both OT mirrors→`17a19f8`; the census register re-declared 43 = 32 zero-action + 9 carriers + 2 hosts; the 22-file roof unchanged) — the w1-entry deliverables of the R32 layer above are all AT `7664603`.**"))

# ============ GROUP B — 12-testing-strategy.md ============
F12 = "12-testing-strategy.md"

# B1: Edit 1 — the engine-submodule live claim (flat false at the pin)
EDITS.append((F12, "B1 engine submodule pins",
    "the engine's OT submodule @ **`55c81c0`** + WDC @ **`83b8850`** (UNMOVED through R33)",
    "the engine's OT submodule @ **`17a19f8`** + WDC @ **`94f6460`** (re-keyed R34 — was `55c81c0`/`83b8850`: the twin re-pin b77909b [OT→`39003d3` + WDC→`94f6460`, docs-only] + the s18 lockstep 574d8d3 [OT→`17a19f8`, the M58R fix]; gitlinks verified at `2a0ecf4`)"))

# B2: Edit 2 — the OT fleet chain missing R33 layer
EDITS.append((F12, "B2 OT R33 layer",
    "632 classic + 17 M60)",
    "632 classic + 17 M60) — **R33: OT @ `008e7f3` 675/675 — the seal18 close** (code pin `344123a`, src diff empty to HEAD [the wrap docs/artifacts + the m58 script past it]; 77 milestone entries = 632 classic + 17 M60 + 11 M61 + 11 M63 + 3 M62 + 1 M62-gate, the report json the count authority; the M58R flake fix — the engine's 09-15 OV-12 CI red root-caused + closed [the un-awaited wireReset race]; the census 31 = 28 routed + 3 exceptions UNCHANGED)"))

# B3: Edit 3 — the app fleet chain missing R33 layer
EDITS.append((F12, "B3 app R33 layer",
    "the census register re-declared 43 = 32 zero-action + 9 carriers + 2 hosts)",
    "the census register re-declared 43 = 32 zero-action + 9 carriers + 2 hosts) — **R33: `7664603` — 426/426 UNCHANGED, the 22-file roof unchanged** (the lockstep re-pin wave: the engine vendor `e3f55bd`→`574d8d3` + BOTH OT mirrors `39003d3`→`17a19f8`; the census register amended [pin re-key only, classes unchanged 43 = 32 zero-action + 9 carriers + 2 hosts])"))

# B4: Edit 4 — the OT lock-copy consumer read
EDITS.append((F12, "B4 OT lock-copy",
    "the app consumes the vendored lock-copy @ `55c81c0`",
    "the app consumes the vendored lock-copy @ `17a19f8` (re-keyed R34, was `55c81c0`; the app's lockstep wave `7664603` moved BOTH mirrors `39003d3`→`17a19f8`)"))

# B5: Edit 5 — the engine-OT-submodule tail
EDITS.append((F12, "B5 engine OT submodule tail",
    "the engine's OT submodule also `55c81c0`",
    "the engine's OT submodule also `17a19f8` (re-keyed R34, was `55c81c0`)"))

# B6: Edit 6 — the WDC consumer read
EDITS.append((F12, "B6 WDC consumers",
    "consumers: engine @ `83b8850` + app @ `ec8fd5c`",
    "consumers: engine @ `94f6460` (re-keyed R34, was `83b8850`) + app @ `ec8fd5c`"))

# B7: Edit 7 — the WDC row's engine-consumer tail
EDITS.append((F12, "B7 WDC engine-consumer tail",
    "the engine consumes @ `494f6ff` (docs-only behind HEAD)",
    "the engine consumes @ `94f6460` (docs-only, WDC's HEAD pin; re-keyed R34 — was `494f6ff`, three pins stale)"))

# B8: Edit 8 — the nle-ui consumer read
EDITS.append((F12, "B8 nle-ui consumer",
    "the app vendored @ `6754979` — the AW1-2 absorb LANDED, the vendor re",
    "the app vendored @ `1e0c30b` (re-keyed R34 — was `6754979`) — the AW1-2 absorb LANDED, the vendor re"))

# B9: Edit 9 — the code-anchor precision nit
EDITS.append((F12, "B9 code anchor precision",
    "the code anchor moves `74bef08`→`2a0ecf4` — the P-F1/P-F2 fixes",
    "the code anchor moves `74bef08`→`28aa387` — the P-F1/P-F2 fixes (`28aa387` the last src-touching commit, `2a0ecf4` the docs-only HEAD — re-keyed R34, was `→2a0ecf4`)"))

# B10: Edit 10 — the perf-tier off-by-one
EDITS.append((F12, "B10 PERF-1..3",
    "the perf tier PERF-1..4 @ the engine's `perf.yml`",
    "the perf tier PERF-1..3 @ the engine's `perf.yml` (+ the randomized-seed property pass, `FC_SEED=random` — the exploration venue)"))

# B11: Edit 11 — the battery-posture pin list R34 layer
EDITS.append((F12, "B11 battery-posture R34 layer",
    "OT `3e18722`/`970948a`/632, WDC `94f6460`/777, nle-ui `6754979`/691, app `876f2b8`/256",
    "OT `3e18722`/`970948a`/632, WDC `94f6460`/777, nle-ui `6754979`/691, app `876f2b8`/256 — **R34 re-key: OT `008e7f3`/`344123a`/675 (the seal18 close, 77 milestone entries) + nle-ui `1e0c30b`/743 + app `7664603`/426 (the lockstep re-pin wave; census 43 = 32+9+2 unchanged); WDC `94f6460`/777 unmoved**"))

# B12: K2 Edit 1 — spec 12's marker flip
EDITS.append((F12, "B12 K2 marker flip",
    "Registration state (R24): still PENDING — K2 entry hasn't happened; this row (and spec 17 §13A.7) is the registration home.",
    "Registration state (R24): still PENDING — K2 entry hasn't happened; this row (and spec 17 §13A.7) is the registration home. **R34 re-key (R34-W1-b): LANDED — the census + register recorded at this row's end; the register home is spec 17 §13A.7's re-tier row.**"))

# B13: K2 Edit 2 — spec 12's census record at the row tail
EDITS.append((F12, "B13 K2 census record",
    "the base protocol (the plan's r1 row) + these five = the executor's work-order gate content.**",
    "the base protocol (the plan's r1 row) + these five = the executor's work-order gate content.** **R34 census record (R34-W1-b — the K2 landing at the live pins; the R24/R27/R28 layers above stay verbatim as the pre-landing record): (1) engine-in-the-middle @ engine `d8b97b4` (CI-only over the R33 seal `2a0ecf4`; 785/785, 29 vitest files, the PINNED_TOTAL=785 count gate + the 5-job CI venue) — `bridge-seams` 151 + `planner` 52 + `video-sync` 31 + `timeline-edit-ops` 13 = 247 it( cites (the companion bridge-carrier pair: `nle-bridge` 99 + `nle-bridge-realtime-midi` 8); (2) WDC's integration family @ WDC `94f6460` (777/777; 34 .test.ts = 19 src/test + 15 src/lib) — `audio-integration` 27 + `real-audio-e2e` 12 + `dsp-bounce-parity` 9 + `dsp-effects-integration` 8 + `nle-audio-core-derisk` 7 + `offline-parity-wiring` 2 = 65 it( cites across the 6 named suites; (3) OT's in-page UI-over-core runner @ OT `c4c04f1` — the report-json authority `download/timeline-test-report.json`: **687/687 at 78 entries** (M1-M64 + the R re-runs + `M49C` + `M62-gate`; 675/675 @ `008e7f3` pre-M64 — the fps family), total-only per this row's law; **M49C green 28/28 @ code pin `344123a`** — the wire census **31 = 28 routed + 3 exceptions** stands (the `970948a` cite above superseded by the R33 re-key); (4) the missing cross-module pairs (the OT-ops→engine-decode round-trips at the app's seam shapes) — carried TODAY at the app-carried venue: `wire-coverage` 26 + `engineSeam` 7 @ app `28f3229` (docs-only over `7664603`; 426/426, the 22-file roof) — honestly stated: NO engine-resident round-trip suites are claimed by this census; engine-side authoring beyond the app-carried shapes stays a forward row (S-engine's worklist), NOT a K2 blocker. Per-file figures are static it( cites; the runtime nets are the declared count-gate pins. Acceptance state: family census green + registered HERE + spec 17 §13A.7 (this round) + battery-checked at the next battery fork.**"))

# ============ GROUP C — 01-core-engine.md ============
F01 = "01-core-engine.md"

# C1: the OT vendor chain re-key
EDITS.append((F01, "C1 OT vendor chain",
    "OT @ `55c81c0` (re-pinned c15a629→…→`6e2b91a`→`55c81c0`;",
    "OT @ `17a19f8` (re-pinned c15a629→…→`6e2b91a`→`55c81c0`→`39003d3`→`17a19f8` — re-keyed R34, the last two hops were missed: the R32 twin re-pin + the s18 lockstep; verified at engine `2a0ecf4`;"))

# C2: the WDC chain re-key
EDITS.append((F01, "C2 WDC vendor chain",
    "WDC @ `83b8850` (re-pinned 494f6ff→…→`ec8fd5c`→`83b8850` by the S-series wave `480a216` + the R29 re-pin)",
    "WDC @ `94f6460` (re-pinned 494f6ff→…→`ec8fd5c`→`83b8850`→`94f6460` by the S-series wave `480a216` + the R29/R32 re-pins — re-keyed R34, verified at engine `2a0ecf4`)"))

# C3: the W11 cites re-anchor
EDITS.append((F01, "C3 W11 cites",
    "243-275` + the tsc-lockstep asserts `:277-297` (the census re-declared 31 = 28 routed + 3 exceptions @ `970948a`).",
    "268-300` + the tsc-lockstep asserts `:353-360` (the census re-declared 31 = 28 routed + 3 exceptions @ `970948a`; re-anchored R34 — the WIRE_COMMAND_TYPES/WIRE_UI_EXCEPTION_VERBS cites at the live `17a19f8` pin, was `:243-275`/`:277-297`)."))

# ============ GROUP D — 18-ui-shell.md ============
F18 = "18-ui-shell.md"

# D1: the nle-ui row — the missed R32 layer
EDITS.append((F18, "D1 nle-ui R32 layer",
    "the §10 `shell-*` testid family emitting (70 sites / 62 names, live-counted) |",
    "the §10 `shell-*` testid family emitting (70 sites / 62 names, live-counted) — **R32 layer (recorded R34 — missed in the R32/R33 folds): `1e0c30b` 743/743 (41 test files, 78 stories — the C0 MiniShell composition 701→737 + the D52 isInteractionActive twin 737→743)** |"))

# D2: the :540 mini table row
EDITS.append((F18, "D2 mini table row",
    "355 vitest (sealed)",
    "495 vitest / 12 files (sealed — the register pin; re-keyed R34, was 355)"))

# D3: the :654 mini sentence
EDITS.append((F18, "D3 mini sentence",
    "the mini carries 355 vitest tests\n   (8 files — the R22 drag-machinery retirement's 333 + the review-loop\n   and seal-round nets;",
    "the mini carries 495 vitest tests\n   (12 files — the R24-2 seal census, the register pin [re-keyed R34, was\n   355/8]: the R22 retirement's 333 + the review-loop and seal-round nets +\n   the R24-2 trim-mode/preview/law-net waves;"))

def main():
    ok, miss, applied = 0, [], []
    files = {}
    for f, label, old, new in EDITS:
        if f not in files:
            files[f] = load(f)
        t = files[f]
        n = t.count(old)
        if n != 1:
            miss.append("%s [%s]: %d hits" % (label, f, n))
            continue
        files[f] = t.replace(old, new, 1)
        ok += 1
        applied.append(label)
    if miss:
        print("MISSED ANCHORS (%d):" % len(miss))
        for m in miss:
            print("  -", m)
    for f, t in files.items():
        save(f, t)
    print("applied %d/%d edits" % (ok, len(EDITS)))
    return 0 if not miss else 1

if __name__ == "__main__":
    sys.exit(main())
