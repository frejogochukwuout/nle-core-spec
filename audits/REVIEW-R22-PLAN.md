# REVIEW-R22-PLAN — Adversarial Review Round 2 (Plan/Executability)

**Reviewed:** the spec-14 rewrite (crawl/walk/run plan v1) + ARCH-R22 v2, 2026-09-07.
**Reviewer:** sub-agent (opus-class, fresh context), charter: attack the phase gates' testability, the parallelization's hidden dependencies, the battery's blind spots; verify against the repos (incl. the mini's test inventory + the app's timeline-port tree).
**Verdict: GO-WITH-AMENDMENTS** (13 required amendments).

## The gate audit (essence)
- C0 testable (minor: the chrome inventory unenumerated — fixed by enumerating the mini's chrome set).
- C1 **VAGUE/CIRCULAR**: "every mini timeline law either holds or is registered" gated on a law list that did not exist anywhere and was scheduled ∥ C4; the testid layer unpriced (the app has 7 testids; the mini ~60); the VLM pass not battery-automatable (accepted as the review-loop standard); OT-SEAMS row 14 un-owned.
- C2 semi (placeholder where a list was needed — the mini's 13 viewer testids are enumerable now).
- C3 testable (post amendment 3: offline-render + call-spy pins — the Node venue has no audio device).
- C4 **VAGUE at the core**: the checklist did not exist; the ~150-200 arithmetic unverifiable (235 raw view/chrome tests minus the OT-covered subset); C4 silently absorbed every surface no phase delivered.
- W-ops testable; W-media blocked on the D6 ambiguity (N5 split out); W-audio "audible-parity" not CI-testable (threshold stated); W-project testable; **W-color BROKEN** (its gate needed engine code that does not exist anywhere — the instruments were double-assigned to a phase that "slips independently"); R-fcpxml/R-polish semi; R-engine-p2 vague (milestones unenumerated).

## The dependency audit (essence)
- S-ot ∥ S-app through the crawl: CONFIRMED (OT's side is real and separable — the app already mirrors OT state via `core.subscribe`; row-6's "OT view additive" option was a phantom — OT's view/ is utils-only, the React lives app-side).
- W-ops ∥ W-media: PARTIAL — C7 forces a one-business-day app migration mid-W-media → sequenced to W-ops END with the migration as an explicit sub-gate.
- W-color vs engine P2: BROKEN as written → the instruments moved to S-engine (4-6 wk, enumerated milestones), W-color re-scoped to the binding + parity.
- C1 3-5 wk OPTIMISTIC (the restyle is ~2,400 LOC of app-owned view + ~1,100-line qc- CSS + ~60 testids + window/binding + bridge + gap rows) → 4-6 wk.
- C4 2-3 wk understated (author ~200 law tests with a 4-file baseline, wire export, run annotakit, fix every violation) → 3-5 wk.

## The coverage audit (the 7 silently-absent crawl surfaces — all landed as deliverables)
Mini Inspector wiring (213 LOC); Mini MediaPool + import flow (277 LOC — the "import(virtual)" surface); Mini Topbar + export CTA UI; undo/redo exposure (the app's keybindings had REMOVED the undo keys — ownership unassigned); keyboard parity (the mini's `[`/`]`/±/0 keys); toast/splitter/panel-collapse chrome behavior (R18j laws); the annotakit row had no acceptance (violating the plan's own law).

## The 13 required amendments (all folded into spec 14 v2/v2.1 + ARCH v3)
(1) law-net inventory PRE-C1/pre-C4; (2) testid mapping a C1 deliverable; (3) C2 viewer testids enumerated; (4) the 7 absent surfaces landed; (5) W-color re-scoped + instruments → S-engine, R-engine-p2 re-typed non-blocking; (6) walk total corrected 16.5-23 wk solo; (7) W-audio threshold ≤ −60 dBFS; (8) W-n5 split with own gate; (9) row 14 dispositioned; (10) row 6 pre-decided app-port-config; (11) C7 at W-ops end + migration sub-gate; (12) the pre-C1 spec-18 §16.2 fix + battery_r22 landing sequenced; (13) R-phase gates enumerated.

## The posture verdict (the reviewer's honest close)
"Mostly passes" — §2's BASE table the right compression, §3/§4 forward-shaped; §5 is the one-time supersede record (kept). The residual: the plan's own Ruling D ("a gap row with no acceptance is a spec bug") was violated by the plan itself (the annotakit row, the law-net inventory, three gates leaning on not-yet-existing artifacts) — all fixed by the amendments.

## Mid-round sibling directive absorbed (post-review)
The user's FULL drag-machinery retirement (shell-mini track, commit `7286212`: the verbatim R18k law is the whole law; both-edge magnet, ghosts, commit-at-UP, pending windows, tick freeze, scrub edge auto-scroll RETIRED; mini 358→333) — folded into spec 14 v2.1 + ARCH v3 + every drag-law citation.
