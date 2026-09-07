# 14 — Implementation Phases [RETIRED — the plan moved out of the spec set]

**Status:** RETIRED at R23 (the user's directive: "separate the implementation phase / plan from the spec (not mixed into it)"). **THE plan is now `IMPLEMENTATION-PLAN.md` at the repo root** — the execution runbook (per-track entry points, the workstream decomposition, the D24 verification ladder, the parallelization map + critical path, the gate table, the estimates, the execution protocol). The decision record: `audits/ARCH-R23-plan-and-bridge.md` (v2, adversarially reviewed — rulings D23/D24/D25).

**This file is a redirect tombstone.** The spec set owns WHAT + acceptance (each spec's §0 FORWARD INVENTORY); the plan owns HOW/WHEN/WHO/WHERE. Nothing new lands here.

## §-redirect table (every "spec 14 §N" citation resolves here)

| Old section (the R22 v2.1 content) | Where it lives now |
|---|---|
| §1 (purpose — the assembly order) | `IMPLEMENTATION-PLAN.md` §0/§2 (the ladder + the ordering law) |
| §2 (the BASE — the accepted pinned fleet) | **00-master's fleet table** (the pin-world canon, Decision 21 — the pin classes live there) |
| §3.1 (the CRAWL: pre-C1 + C0-C4) | The plan §2 CRAWL (K1-K4) + **the D24 mapping** (ARCH-R23): C1(b,d,e,f)+C1(c)+C2-behavior+C3+C4-corpus → K3; C4's e2e → K4; C1(a)+C2-frame+C4-side-by-side → w1; C0 → w1-prep/S-package; the pre-C1 inventory LANDED (the R23 seal) as K3's acceptance list |
| §3.2 (the WALK: W-ops/media/n5/audio/project/color) | The plan §2 WALK/RUN: W-media→w2, W-project→w3 (realness = walk); W-ops→r1, W-audio→r2, W-color→r3, W-n5→r4 (depth = run; n5 user-gated) |
| §3.3 (the RUN: R-fcpxml/polish/engine-p2/cloud) | The plan §2 r5/r6 |
| §3.4 (the parallelization map) | The plan §4 (the streams re-keyed + the hard dependency edges) |
| §4.1-§4.6 (the per-domain gap registers) | **The owning domain specs' §0 GAP registers** (the posture law — a row found only here was a violation; the R23 audit fleet verified every row re-homed) |
| §4.6's mock-retirement triggers + the port-then-swap law | **00-master's standing-laws section** (the law text) + the plan §3/§5 (the triggers: post-K4/w1) |
| §5 (the P→A→C/W/R traceability) | The plan §7 (the lineage appendix, extended with the R23 mapping) |
| §6 (the standing laws) | **00-master's standing-laws section** (the laws) + the plan §5 (the execution protocol) |

## The phase-lineage tombstone

| Era | The plan | Fate |
|---|---|---|
| R9 | P0-P6 | retired (git history) |
| R15 | A0-A7b | superseded by R22 (absorbed into the W-rows) |
| R22 | THIS file's v2.1 (C0-C4 / W-* / R-*) | superseded by `IMPLEMENTATION-PLAN.md` (R23) — every row re-homed via the D24 mapping table (`audits/ARCH-R23-plan-and-bridge.md`) |
| R23 | `IMPLEMENTATION-PLAN.md` + ARCH-R23 | **current** |

## What survives verbatim (history, kept resolvable)

The R22 v2.1 content — the C0-C4 phase tables, the W/R rows, the six-stream map, the estimates (crawl 10-14 / walk 16.5-23 / run 6-9) — is retired to git history (this file at `7ba030a`, the R22 lineage). The drag-law freeze (D22) and the port-then-swap law were NEVER this file's to own — they live in 00-master's decisions + standing laws, unchanged.
