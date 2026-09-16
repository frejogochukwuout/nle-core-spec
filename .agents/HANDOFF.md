# HANDOFF — Next Session Scope (nle-core-spec)

**Written:** 2026-09-16, end of the R29 execution round. **Read this FIRST.**

## What R29 finished (the one-paragraph state)

**The execution began — the plan's HEAD BLOCK landed.** The S-app D-ARCH-6 consumer duty (the gate-breaking duty, plan §0 step 1) is COMPLETE on the disk of record: the app's both OT mirrors re-vendored to 55c81c0, the port's gesture seams switched to the batch wire verbs (origin "ui"), the pool multi-insert riding timeline.insertBatch through nle-ui's shell seam, the nle-ui re-pin to 6754979. The acceptance discriminator held — the wire-coverage gate went RED at the bare re-pin (the three new verbs uncovered against the LIVE 31/28+3 registry) and returned GREEN with the switches. The app is 256/256 with the M49R pair pinned BOTH halves. The whole fleet moved in the same window (a parallel session): the engine cascade @ e3f55bd, the WDC S-series docs wrap @ 94f6460 (that track's head item CLOSED), the OT seal18 W1-W2 @ 3e18722 (the census fleet + the s18 design v1 — the r1-port rows D-S18-1..4 filed), nle-ui @ 6754979 (691/691). The spec corpus was re-keyed to the R29 pin world (19 files, every LIVE statement moved, every historical record preserved) and **battery_r29 is 166/166 ALL GREEN**. The R17 engine-vendor divergence is RESOLVED (the app vendors the engine HEAD — re-converged at e3f55bd).

## The next session = THE CRAWL'S BULK (K3) → K4

**The critical path, in plain language (the plan §0 is the authority; fetch-first — the parallel session is ACTIVE):**

1. **K3's corpus — the LAW-NET re-expression (the crawl's bulk).** Over the REAL vendored OT (@ 55c81c0 in the app): the re-expression target = the app's real surfaces (the GluedShell store family + engineService.ts + sceneBridge.ts — `ui-mock/shell-mini/docs/CORE-SEAMS.md` §2 is the field-by-field map; `ui-mock/shell-mini/docs/LAW-NET-INVENTORY.md` the acceptance list — cite the inventory, never a stale split). Each family's tests land in the app's vitest beside the surface they pin. The routed-verb completeness half is DONE (the wire-coverage gate); the mode-matrix K3 rows (the slip pin etc.) + the page-key tests (D50's impl half) + the D48/D49 bridge pins remain.
2. **K4 — the crawl exit** (the single e2e: import → cut → play → export; needs K2+K3 gates both green — E8).
3. **The OT seal18 W3+ watch** (the L-wave landings: L1 S-family → L2 carrier → L3 contract/view-config → L4 structural/token → L5 P3 → L6 exhaustiveness) — their session's queue; the spec lane only re-pins at their milestones.
4. **w1-w3** (the real-app walk tiers), then **the r-phases — r1's head is Stage 0**: the D42 linkage field + the D43 `edit-domains.ts` + the D44 error envelope, ONE additive OT change, acceptance per **17 §13A.8** (the r1-port acceptance protocol). OT's seal18 W2 already filed the r1-port design rows (D-S18-1..4 — read `opencut-timeline/reviews/arch-design-s18.md` + `seal18-r-linkage.md` first).

## The immediate maintenance (small, P3)

- The per-spec `## Testing` section mirrors + 17 §14.2's mapping repair (registered rows; the battery is green without them).
- 00-master's version label (v12.0 stands; the v13.0 bump rides the next natural corpus edit).
- 15 §13.5's "181 bindings" known-stale cite (16's Appendix A carries 182).
- battery_r29's two REGISTERED-SKIP windows close at the OT Stage-0 landing (the D43-A3 leaf-edge LIVE check + the D42 drift fence).
- 12:14's "the engine consumes @ 494f6ff" stale cite (pre-existing R24-era; out of the R29 pin set — fold at the next 12 edit).

## The round's artifacts (context restore map)

- `scripts/battery_r29.py` — 166 checks, the R29 pin world; run `python3 scripts/battery_r29.py` after any spec edit.
- The corpus state: 19 files re-keyed @ 22ca935 (00/19 carry the R29 layers; 06/12/17/20 + the signoffs re-based; the engine-side + wire/shell/plan sets).
- The pin world: engine `e3f55bd` (code anchor `74bef08`, 749/749) · OT `3e18722` (code pin `970948a`, 632/632) · WDC `94f6460` (code anchor `ec8fd5c`, 777/777) · nle-ui `6754979` (691/691) · app `876f2b8` (256/256; vendors engine e3f55bd + nle-ui 6754979 + WDC ec8fd5c + OT mirror 55c81c0 — the engine-vendor divergence RESOLVED) · variants 1,939/68 (declared pair 1,950/126) · mini 495/12 at last WRAP (in-flight activity exists — the WRAP-gated law).
- The app-side record: `nle-test-app` @ 876f2b8 — the D-ARCH-6 landing (0686504, the sibling session) + the M49R homogeneous completion (876f2b8, this session); `docs/port-census.md` carries the 55c81c0 re-key note.

## Process reminders (the standing laws — R29's own lessons appended)

- **Fetch-before-push EVERYWHERE, every time** — the parallel session is active across ALL repos (this round: the app push rejected mid-session; the race had landed the same work 40 minutes earlier). Absorb the disk of record, complete the gaps, push the delta. NEVER force push.
- **The saturation protocol**: an agent killed at the deadline has USUALLY finished — check the tree + the worklog before re-dispatching (this round: 2 of 5 K1 agents "failed" with their work fully landed).
- **The submodule PAT law**: `git config url.insteadOf` does NOT reach `git submodule update --init` clones — embed the PAT in the local `.git/config` submodule URLs (never committed) instead.
- **The dispatch-granularity law**: split heavy file re-keys by FILE, not by topic — the two agents given 3+ huge files timed out; the single-file agents returned.
- Battery-check calibration: verify every target text with grep BEFORE encoding a check; sibling edits in the same commit drift anchors.
- The sub-agent brief: point at `.agents/SKILL.md` + the worklog tail; give disjoint file sets for parallel amendment agents.

## VARIANTS/MINI TRACKS (background)

Variants R25: COMPLETE (1,939/68; 126 stories). Mini R24-2: WRAPPED @ 495/12 (the mini-plus foundation); the mini stream has in-flight activity past the wrap (584 it-blocks/58 files static at R29) — its register row re-keys at ITS next wrap only. Both streams' registers live in REFERENCE-REGISTER.md (the WRAP-gated re-key law). The mocks' own next steps are their streams' business — the spec side only coordinates at WRAP.
