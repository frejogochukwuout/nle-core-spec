# HANDOFF — Next Session Scope (nle-core-spec)

**Written:** 2026-09-16, end of the R28 seal round. **Read this FIRST.**

## What R28 finished (the one-paragraph state)

**The spec + architecture + implementation plan are SEALED.** Every design decision that was still open at the start of the round is now RULED (D42-D50 + R15-R21), each one independently researched (10 research packs), adversarially reviewed (9 reviewers across W3/T4 — ZERO rejections), and folded into the corpus (the W4 + T3 amendment waves, 20+ files). The register's OPEN design table is at **0 rows** — machine-checked. The implementation plan is **multi-track** (the eight repo streams + the first-class test track + the P3 lane), estimate-free, gate-defined, with the meta-lane statement landed (this repo stays the spec/architecture/test-law lane through execution — the user affirmed it). The testability directive is fulfilled: **the design law and the test law moved in the same round** — spec-17 v1.6 carries the test matrix/facets/protocol rows for every D42-D50 area, spec-12 carries the invariants and the WDC/parity laws, the plan carries the carve ("a stream row whose gates column cites no test law is a spec bug"), and **battery_r28 is 166/166 ALL GREEN** with the thirteen R28 check classes. The certification: *implementation-ready in architecture AND in verification law.*

## The next session = EXECUTION (there is nothing left to decide)

**The critical path, in plain language:**

1. **HEAD BLOCK — the app's vendor re-pin (S-app step 1, the gate-breaking duty).** The app (`nle-test-app` @ `85cff80`) still vendors opencut-timeline at `6e2b91a`, which is one session behind OT's code pin `970948a`. The work: re-pin the vendor to the s17 tip (`55c81c0` mirror), re-run the census (the count re-keys), and flip the app's gesture-dispatch seam to the wire path (the "gesture-seam switch" = the app's drag/trim/move handlers dispatch wire verbs instead of direct ops calls). Acceptance: the app's suites green post-re-pin + the census register re-keyed + the M49C gate's verbs routed. Full detail: the plan's §0 S-app row, step (1), citing the D-ARCH-6 filings @ `c020b2a` PLAN `:104-147`.
2. **K3's corpus** (the app-behavior nets — the bulk of the crawl): the routed-verb completeness machine-check extension + the page-key tests (D50's impl half) + the D48/D49 bridge pins.
3. **K4 the crawl exit** (the single e2e: import → cut → play → export).
4. **w1-w3** (the real-app walk tiers), then **the r-phases** — r1's head is **Stage 0**: the D42 linkage field + the D43 `edit-domains.ts` + the D44 error envelope, all landed in ONE additive OT change, **acceptance per 17 §13A.8 (the r1-port acceptance protocol)** — the consolidated recipe with the pins, order slots, and battery checks. The four absent families (replace/append/fit-to-fill/ripple-overwrite) enter at Stages 2-4 per D46; the RE-3 transition-remap probe fires at Stage-4 entry (test-first, two exits, cannot silently fail).

**Every "user gate" from earlier rounds is now a ruled default with a registered reversal** — if you want to flip one later (e.g. defer r4's real-media decode), it's a one-line plan amendment, never a blocker. Nothing needs the user's answer before work can proceed.

## The immediate maintenance (small, P3 — ride the first execution session)

- The per-spec `## Testing` section mirrors + 17 §14.2's mapping repair (registered rows; the battery is green without them).
- 00-master's version label (v12.0 stands; the v13.0 bump rides the next natural edit — the R28 round re-keyed the fleet rows, not the label).
- 15 §13.5's "181 bindings" is the known-stale citation (16's Appendix A carries 182 — the W6-style sweep rides the next 15 edit).
- battery_r28's two REGISTERED-SKIP windows close at the OT Stage-0 landing (the D43-A3 leaf-edge LIVE check + the D42 drift fence) — re-scope them when the modules land.

## The round's artifacts (context restore map)

- **`audits/ARCH-R28-seal-round.md`** — the round's decision venue: §4 the D42-D50 rulings + §4.1 the ratification record (the three meta-lane rulings) + §5-§6 the outcome/fleet record.
- **`audits/fleet-r28/`** (30 files): 4 W0 scouts · 10 W1 research packs · 6 W3 adversarial reviews · 3 T1 test-practice scouts (the pattern library) · 1 T1 coverage audit · 3 T2 test-law designs (~530 pins) · 3 T4 testability reviews.
- **`scripts/battery_r28.py`** — 166 checks, the thirteen R28 classes; run `python3 scripts/battery_r28.py` after any spec edit.
- The corpus state: 17 v1.6, 12 R28-status, 18 v1.8, 19 v3.4, the register (0 open rows), the plan (the test-track carve + S-spec(6)), both SIGNOFF re-riders.
- The pin world: engine `074a2f6` (code anchor `74bef08`, 749/749 — NOT docs-only) · OT `55c81c0`/`970948a` (632/632) · WDC `83b8850` (docs-only over `ec8fd5c`, 777/777) · nle-ui `32abd58` (690/690) · app `85cff80` (252/252; vendors engine `74bef08` + nle-ui `83ff8a8` + WDC `ec8fd5c` + OT mirror `6e2b91a` — the engine-vendor divergence from HEAD is BY DESIGN) · variants 1,939/68 (declared pair 1,950/126) · mini 495/12.

## Process reminders (the standing laws)

- Fetch-before-push (sibling races land mid-round; never force push). Commit→push after every wave; /home/sync bundle + the GitLab mirror at milestones.
- The dispatch-saturation pattern: agents killed at the deadline have USUALLY finished their work — check the tree before re-dispatching (6 of 42 R28 dispatches died post-completion; all recovered).
- Battery-check calibration: verify every target text with grep BEFORE encoding a check; sibling edits in the same commit drift anchors (+14 lines this round).
- The sub-agent brief: point at `.agents/SKILL.md` + the worklog tail; give disjoint file sets for parallel amendment agents.

## VARIANTS/MINI TRACKS (background)

Variants R25: COMPLETE (1,939/68; 126 stories; 19/19 threads). Mini R24-2: WRAPPED @ 495/12 (the mini-plus foundation). Both streams' registers live in REFERENCE-REGISTER.md (the WRAP-gated re-key law). The mocks' own next steps are their streams' business — the spec side only coordinates at WRAP.
