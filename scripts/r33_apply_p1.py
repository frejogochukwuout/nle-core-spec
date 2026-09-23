#!/usr/bin/env python3
"""r33_apply_p1.py — R33 W1: apply the 8 P1 rows of the engine seal-round
REVISION-NOTES register (audits/ENGINE-SEAL-R28-REVISION-NOTES.md) to the
spec corpus, premises re-verified LIVE against the current trees (engine
2a0ecf4 / app 7664603 / OT 008e7f3) and the R32-final corpus.

Row-by-row (premise status at the current corpus):
  P1-1  03:152 + 03:15 — "each pinned in-suite" FALSE for R1-B8/R2-5  LIVE
        (player.ts:793-804 holds the law; clock.ts zero scrub matches;
         the B7/B8 block header at timeline-edit-ops.test.ts:115 has no B8
         pin; the property tier added no scrub pins)
  P1-2  04:24 + 08:24 + 08:4 — Z2 clauses false / 04 flip un-executed   LIVE
        (deliverService.ts:308-338 grades the export; the "zero grade/
         color terms" clause is FALSE; 04:24 never got D45's ordered flip)
  P1-3  05 §8 — the AR-2 keyframe-gesture family has zero normative text LIVE
        (no §8.10 exists at 05:341-636)
  P1-4  07:13 + 07:1169 — Gaussian-Blur default "4" is a live FALSE law LIVE
        (GAUSSIAN_BLUR_DEFAULT_RADIUS = 10 at composition-frame.ts:210)
  P1-5  07:367 — sidecar/STARTING bits falsified + law block absent     LIVE
  P1-6  07:22 — "no e2e exists app-side yet" FALSE (K4 SEALED @ R32)    LIVE
  P1-7  07:21 — "law-net re-expression still unstarted" FALSE @ R31+    LIVE
  P1-8  17 §13A.1 + 12 §0 — NFR family ZERO carriers + ZERO GAP rows    LIVE*
        (*premise partially discharged post-register: the engine W4 perf
         tier LANDED perf.yml — the fleet's first scheduled workflow; the
         edit records the CURRENT truth: engine venue LANDED, app-side
         recipes + carriers still absent, the GAP row filed)

Every edit asserts its exact anchor text; any miss = hard fail with the
row id. Usage: python3 scripts/r33_apply_p1.py [--dry]
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
DRY = "--dry" in sys.argv

EDITS = []  # (row_id, file, anchor, replacement, count_expected)


def E(row, fname, anchor, repl, n=1):
    EDITS.append((row, fname, anchor, repl, n))


# ---------------------------------------------------------------- P1-1 --
E("P1-1a", "03-playback-engine.md",
  "grown past the verbatim port: the R1-B7 Clock.fps re-anchor while playing, "
  "the R1-B8/R2-5 scrub-implies-pause + statechange laws, the R2-4 fake-timer "
  "RAF test pin — each pinned in-suite",
  "grown past the verbatim port: the R1-B7 Clock.fps re-anchor while playing "
  "(pinned in-suite, the B7 pin) + the R2-4 fake-timer RAF test pin (pinned "
  "in-suite); **R33 re-attribution (engine seal-round register P1-1): the "
  "R1-B8/R2-5 scrub-implies-pause + statechange laws live in "
  "`playback/player.ts:793-804`, NOT clock.ts (zero scrub matches in "
  "clock.ts) — and they are NOT pinned in-suite** (the block header "
  "`timeline-edit-ops.test.ts:115` says B7/B8 while containing only the B7 "
  "pin; the missing pins REGISTERED — fake-timer vehicle: beginScrub-while-"
  "playing pauses the clock, bumps `_transportGeneration`, emits "
  "`statechange({isPlaying:false})` before `scrubchange`; name-collision "
  "beware: the browser suite's R2-5 is the timeline addKeyframe guards, a "
  "different law)")

E("P1-1b", "03-playback-engine.md",
  "`core/clock.ts` (the FreeCut Clock port, grown — R1-B7 the Clock.fps "
  "re-anchor while playing, R1-B8 scrub-implies-pause + the R2-5 scrub-pause "
  "statechange, the R2-4 fake-timer RAF test law)",
  "`core/clock.ts` (the FreeCut Clock port, grown — R1-B7 the Clock.fps "
  "re-anchor while playing + the R2-4 fake-timer RAF test law; **R33 "
  "re-attribution (register P1-1): the R1-B8/R2-5 scrub-pause family does "
  "NOT live here — clock.ts has zero scrub matches; it lives in "
  "`playback/player.ts:793-804`, unpinned in-suite**)")

# ---------------------------------------------------------------- P1-2 --
E("P1-2a", "04-renderer-color.md",
  "the app's Z2 grade→export fix (the monitor↔export grade divergence) "
  "stands as the CONSUMER-side open item in the app's D30 W-E queue — not "
  "re-filed engine-side. Twin row: spec 08 carries the grade-side twin of "
  "this decision.",
  "the app's Z2 grade→export fix **LANDED @ R25 (D30 W-E)** — "
  "`deliverService.ts:308-338`: the export grades via the same "
  "compose-then-filter final pass ProgramCanvas uses (`renderCtx.filter = "
  "gradeFilter` at `:332`); the monitor↔export divergence is CLOSED. **R33 "
  "amendments (engine seal-round register P1-2): (a) the history chain "
  "corrected** — the seam-side proposal was re-filed spec-side R25 into the "
  "engine's PLAN (`.agents/PLAN.md:156-162`), dispositioned DECLINED-BY-LAW "
  "(ARCH-R24 F1, `:186-189`), then RATIFIED as D29.5c's registered "
  "evolution by D45 (ARCH-R28 §4) — the engine-PLAN disposition re-file "
  "pending; **(b) the D45-ordered 04-side flip EXECUTED (was un-executed "
  "since R28): this row's decline is RATIFIED-AS-EVOLUTION, "
  "r3-consumable** — the compose-then-filter ORDER stays the math law; the "
  "venue moves consumer→seam at r3. Twin row: spec 08 carries the "
  "grade-side twin of this decision.")

E("P1-2b", "08-color-grading.md",
  "the app's **Z2 grade→export fix** (the monitor↔export grade divergence: "
  "the monitor grades, the export does not — zero `grade`/`color` terms in "
  "deliverService.ts, re-verified live) stands as the CONSUMER-side open "
  "item in the app's D30 W-E queue — not re-filed engine-side.",
  "the app's **Z2 grade→export fix LANDED @ R25 (D30 W-E)** — "
  "`deliverService.ts:308-338`: the export grades via the same "
  "compose-then-filter final pass (the Z2 cite `:299-338`, `renderCtx.filter "
  "= gradeFilter` at `:332`); the monitor↔export divergence is CLOSED. **R33 "
  "correction (engine seal-round register P1-2): this row's former \"zero "
  "`grade`/`color` terms in deliverService.ts, re-verified live\" clause was "
  "FALSE — it contradicted the row's own D45 amendment cites; deleted. The "
  "history chain corrected: the seam proposal was re-filed spec-side R25 "
  "into the engine's PLAN (`.agents/PLAN.md:156-162`), dispositioned "
  "DECLINED-BY-LAW (ARCH-R24 F1, `:186-189`), then RATIFIED as D29.5c's "
  "registered evolution by D45 (ARCH-R28 §4) — the engine-PLAN disposition "
  "re-file pending.")

E("P1-2c", "08-color-grading.md",
  "the app's Z2 grade→export fix lands through this seam.",
  "the app's Z2 grade→export fix (landed @ R25 app-side) migrates to the "
  "seam at r3.")

E("P1-2d", "08-color-grading.md",
  "+ the app's Z2 consumer fix); Refined spec",
  "+ the r3 seam migration — the {grade} param retires the app's wrapper "
  "pairs); Refined spec")

# ---------------------------------------------------------------- P1-3 --
SECTION_810 = """### 8.10 Keyframe authoring gestures (the AR-2 family — R33; engine seal-round register P1-3; the R27 P2-8 / xcut-amend 05-6 fold, never before applied)

The AR-2 keyframe-gesture family — normative law (the vendored OT tree is the reference implementation):

- **Double-click authoring on the volume line / the expanded lane** (the AR-2 seam, `use-keyframe-authoring.ts`): frame-snapped (the project fps lattice), duration-clamped (never past the element span), on-curve seed (the key's value seeds from the curve's value at that tick, not from 0), dB-clamped (the [−60,+20] authoring domain, D38.2's one-home), and **exact-tick = replace** (a second double-click at an existing key's tick replaces that key — never a duplicate).
- **The drag commits ONE `timeline.retimeKeyframes` dispatch** (one user gesture = one history entry — the W11-f gesture-commit law; `use-keyframe-drag.ts:105-123`, the dispatch at `:117`).
- **Delete commits `removeKeyframes` + the WYSIWYG bake**: deleting the last key of a channel bakes the currently-seen value into the base param (`use-timeline-actions.ts:406-431`, the removeKeyframes dispatch at `:407-413`; the bake law `ops/timeline-core.ts:1862-1877`) — an emptied channel never falls back to a stale default.
- **The channel model is named**: `ElementAnimations` = propertyPath → `ScalarChannel | DiscreteChannel` (`animations/types.ts:92-104` — `ScalarChannel` at `:92`, `DiscreteChannel` at `:100`).

"""

# ---------------------------------------------------------------- P1-4 --
E("P1-4a", "07-composition.md",
  "'Gaussian Blur' → `blur(radius px)`, default 4, non-finite→4, negative "
  "clamps ≥ 0 (R8-REV #5 — invalid CSS would no-op the WHOLE `ctx.filter`)",
  "'Gaussian Blur' → `blur(radius px)`, **default 10 — the GPU registry's "
  "declared default per the F2-5 cross-module coherence pin** "
  "(`GAUSSIAN_BLUR_DEFAULT_RADIUS` `composition-frame.ts:210`, consumed at "
  "`:270`; non-finite→10, negative clamps ≥ 0 per R8-REV #5 — invalid CSS "
  "would no-op the WHOLE `ctx.filter`; the pin reads the live declared "
  "default at `bridge-seams:985-1012`) — R33 correction (engine seal-round "
  "register P1-4): the spec's former \"default 4, non-finite→4\" was a live "
  "FALSE law")

E("P1-4b", "07-composition.md",
  "Gaussian Blur → `blur(radius px)` (default 4, non-finite→4, negative ≥ 0 "
  "per R8-REV #5 `4b2dfd1`)",
  "Gaussian Blur → `blur(radius px)` (**default 10 — the registry's declared "
  "default per the F2-5 pin, `GAUSSIAN_BLUR_DEFAULT_RADIUS` "
  "`composition-frame.ts:210`, the pin `bridge-seams:985-1012`; "
  "non-finite→10, negative ≥ 0 per R8-REV #5 `4b2dfd1`** — R33, register "
  "P1-4)")

# ---------------------------------------------------------------- P1-5 --
E("P1-5a", "07-composition.md",
  "the RIGHT member is derived by pairing (left = the last source starting "
  "at/before the cut, right = its immediate follower — the engine's "
  "`bridge/transition-inputs.ts` pairing law, CUT_PAIR_TOLERANCE_SEC "
  "defensive no-op on gapped boundaries)",
  "the RIGHT member is derived by pairing (**left = the last source whose "
  "END is at/before the cut** — the F1 audit fix, `transition-inputs.ts:235-"
  "246`: pairing by start shifted the pair one boundary right on any track "
  "with ≥3 elements, the canonical adjacent chain silently no-opped; right = "
  "its immediate follower in start order — the engine's "
  "`bridge/transition-inputs.ts` pairing law, CUT_PAIR_TOLERANCE_SEC "
  "defensive no-op on gapped boundaries)")

E("P1-5b", "07-composition.md",
  "The pair-form above is the composition runtime's RESOLVED form — both "
  "engine seams (N3 audio + N1 visual) derive it from the element-anchored "
  "sidecar.",
  "The pair-form above is the composition runtime's RESOLVED form — both "
  "engine seams (N3 audio + N1 visual) derive it from the **ENGINE FIELD** "
  "(audio: field only; visual: field BASE + sidecar OVERRIDE — "
  "`composition-frame.ts:334`: `transitionOut: params[el.id]?.transitionOut "
  "?? elementTransitionOut(el)`, the OV-05 one-input-source convergence; "
  "hosts that stopped supplying the legacy bag still get transitions). "
  "**The OV-05 one-input-source law (R33, engine seal-round register P1-5): "
  "BASE = the engine field `composition-frame.ts:334`; OVERRIDE = the "
  "consumer sidecar; hygiene = `transition-inputs.ts:117-135` "
  "(`transitionInputsFromScene` takes NO sidecar parameter — the sidecar "
  "never enters the structural path); pins `bridge-seams :869/:886/:901`.** "
  "The former text here (\"derive it from the element-anchored sidecar\") "
  "was falsified by OV-05 + F1 — corrected R33.")

# ---------------------------------------------------------------- P1-6 --
E("P1-6", "07-composition.md",
  "deliverService's W2.4 painter is the export leg's vehicle, no e2e exists "
  "app-side yet — grep-verified @ `c885ece`",
  "deliverService's W2.4 painter is the export leg's vehicle — **BEGUN @ "
  "R31, SEALED @ R32** (the K4 exit verdict LANDED: the e2e-crawl suite's "
  "12 legs @ the app pin — import → cut → drag → play → export → undo/redo "
  "→ JKL → bookmarks → loop-region → multipage + the move-drag LEG 2b, the "
  "cut clause 4-of-4; zero mock paths — ONE venue-law canvas.toBlob stub; "
  "zero human input; the interpretation ruling adversarially ratified; the "
  "verdict doc at the app repo's `docs/decision-k4-exit-verdict.md`; w2's "
  "full-scope demo extends the suite — the forward work)")

# ---------------------------------------------------------------- P1-7 --
E("P1-7", "07-composition.md",
  "the app's 174-test glue suite is the current approximation — the law-net "
  "re-expression is still unstarted, grep-verified @ `c885ece`",
  "the app's **22-file / 426-test corpus** is the current approximation — "
  "the K3 corpus round's four re-expression maps + the store/policy + "
  "geometry + DOM-structural tranches LANDED R30/R31, the session-registry "
  "+ D52 families R32 (the former \"174-test glue suite\" figure was four "
  "generations stale — R33, engine seal-round register P1-7); the remaining "
  "halves per 17 §13A.6's facet rows are the forward work")

# ---------------------------------------------------------------- P1-8 --
GAP_ROW = (
"- **The NFR/perf family's venue + carriers (THE new GAP row — R33, engine "
"seal-round register P1-8): 17 §13A.1's recipes have ZERO app-side carriers "
"and no app-side venue** (owner: nle-test-app + nle-engine; phase: the "
"§13A.1 recipes at their ladder rungs): no perf-envelope test exists "
"app-side (no FPS/scrub-latency/memory/render-time assertions — "
"ProgramCanvas telemetry `durationMs` only) and the app CI is push+PR "
"only; **the ENGINE nightly venue LANDED R33-recorded** (the perf tier "
"PERF-1..4 @ the engine's `perf.yml` — the fleet's FIRST scheduled "
"workflow, telemetry-mode first; the op-time/offline-mixdown/heap-leak "
"envelopes, NOT the app-side recipes; closes the testing design's audit "
"F-1 \"nightly venue that no repo defines\"); an app-side nightly job (or "
"the per-PR smoke subset) is the venue precondition — budgets are "
"pass/fail per §13A.1's own law, and until the venue exists the §13A.1 "
"facet rows dangle without an executable path (17 §0A rule 2's own "
"spirit).\n")

E("P1-8a", "12-testing-strategy.md",
  "- The offline-parity threshold pins + the null rig (owner: app+WDC+engine, **r2**)",
  GAP_ROW + "- The offline-parity threshold pins + the null rig (owner: app+WDC+engine, **r2**)")

E("P1-8b", "17-test-plan.md",
  "NFR tests run in the nightly job (§9.3) + the shell-mount smoke subset "
  "per-PR; budgets are pass/fail, not advisory.",
  "NFR tests run in the nightly job (§9.3) + the shell-mount smoke subset "
  "per-PR; budgets are pass/fail, not advisory. **R33 venue-status note "
  "(engine seal-round register P1-8): the nightly venue LANDED engine-side "
  "first** (the perf tier PERF-1..4 @ the engine's `perf.yml`, "
  "telemetry-mode first — the fleet's first scheduled workflow); **the "
  "app-side recipes' venue (a nightly job or the per-PR smoke subset) is "
  "NOT YET LANDED — the family's GAP row (spec 12 §0, R33) owns the venue "
  "+ carriers; the Tier/job column below is the TARGET model, not the "
  "current venue record.**")

# ---------------------------------------------------------------- P1-3 --
# inserted by line-position (new §8.10 before the §8A header at 05:601)
def apply_p1_3():
    p = "05-timeline.md"
    lines = open(p, encoding="utf-8").read().splitlines()
    hdr = None
    for i, l in enumerate(lines):
        if l.startswith("### 8A. Timeline Affordance Grammar"):
            hdr = i
            break
    assert hdr is not None, "P1-3: 05's §8A header not found"
    assert not any("### 8.10" in l for l in lines), "P1-3: §8.10 already present"
    new = lines[:hdr] + SECTION_810.splitlines() + [""] + lines[hdr:]
    open(p, "w", encoding="utf-8").write("\n".join(new) + "\n")
    print("PASS  P1-3  05-timeline.md  §8.10 inserted before §8A (line %d)" % (hdr + 1))


def main():
    ok, fail = 0, 0
    for row, fname, anchor, repl, n in EDITS:
        text = open(fname, encoding="utf-8").read()
        c = text.count(anchor)
        if c != n:
            print("FAIL  %s  %s  anchor count %d != %d" % (row, fname, c, n))
            fail += 1
            continue
        if not DRY:
            open(fname, "w", encoding="utf-8").write(text.replace(anchor, repl))
        print("PASS  %s  %s" % (row, fname))
        ok += 1
    if not DRY and not fail:
        apply_p1_3()
    print("---\nP1 edits: %d pass / %d fail%s" % (ok, fail, " (DRY)" if DRY else ""))
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()
