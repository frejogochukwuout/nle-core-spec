# ARCH-R23 — the plan separation + the verification ladder + the timeline-UI bridge

**Round:** R23 (the spec-track, following the user's R23 feedback on the R22 finality round).
**Status:** DRAFT v1 — pending the adversarial review round(s).
**Inputs (the user's R23 feedback, verbatim-tightened):** (1) "separate the implementation phase / plan from the spec (not mixed into it)"; (2) "do a full pass auditing each spec file against upstream core module repo… one sub-agent per file or even less (as they need to analyze a lot at repo level) so they have focus"; (3) crawl is NOT shell-mini — it is "the programmatic test each core module is doing… closer to the combined test that audio core has done before, or the full app wiring the current nle-app is trying to do — programmatically verify every part of the ui / app behavior across three modules, to verify correctness, before any human test is needed… crawl stage help[s] eliminate as much issue as possible before the walk phase wiring up the real app"; (4) the open question: "should the current timeline fill in closer to a ui stage, porting over all the opencut ui logic" as the bridge — the mockups are "completely detached from the actual oc-timeline, so porting these over directly is very difficult yet we don't have a gold sample that work[s] ui + timeline wise"; (5) "the implementation plan is very lacking… what are the workstreams? how much can parallel? … there's not even a single entry point to execute, let alone per track."

**Evidence base (gathered this round, all repos at their 2026-09-07-latest HEADs):**
- The fleet moved under the R22 pins: engine `f68ab8c`→`b8c6f88` (356→440 tests, incl. the RR1-A fade-clamp SPAN round), OT `05584d8`→`222532c` (459→486; S3 `setTracksMuted` + the F1 whole-codebase hardening + M45/M46), WDC `fe05d85`→`494f6ff` (740→759; the W2 + whole-CR rounds, drift-gate now fails-on-drift), nle-ui `dba8d52`→`85dcf57` (640→648; F3/F7 real gain + the kind-aware mute-all pin), app `e662759`→`70e99f0` (83→117; W3 JKL audio half + RR1-B). The mini sealed at 355 (R23 seal + fix rounds); the variants track is at 1425+ with the R23 VLM net (`vlm-capture/vlm-review/vlm-run`) landed.
- **OT already carries the full ported OpenCut-classic React UI tree** (`src/components/timeline/` — 20 files, ~4,025 LOC: TimelineView 1,221L, TimelineElementView 883L, Track/Ruler/Playhead/Toolbar/BookmarksRow/ContextMenu/DragLine/SnapIndicator/Tick/AudioWaveform/AudioVolumeLine + hooks; landed W4/W5 as M17-M21, verified by the in-page runner + real-mouse suites + pixel reads). **Zero `next/*` imports inside components/** — pure React; the Next.js coupling lives only in `src/app/` (the runner pages).
- **OT's `/view` page is already a miniature editor shell** (library panel + compositor preview + the timeline; deterministic fixtures; `window.__VIEW_TEST__` hooks for the Playwright real-mouse suite) — i.e., the repo ALREADY renders UI-over-core as its own deliverable surface.
- **The app's `timeline-port/` is a fork of that same tree**: `TimelineElementView` differs by 17 diff-lines, `TimelineTrack` by 4, `TimelineView` by 346 — and the diff is almost entirely `PORT-LOCAL` INJECTABLE PROPS (the R5/D25 selection bridge pair, the R5 zoom bridge, the R7 reverse selection bridge, the R3 `confirmDelete` gate, `@/lib/timeline` → `@vendor/timeline` import paths). Not deep surgery — parameterization.
- The app vendors OT's core as `vendor/nle-timeline` (UPSTREAM.lock discipline, `@vendor/timeline` alias) — the mechanism to vendor the components tree already exists.
- The engine vendors OT (`vendor/opencut-timeline`) core-only + WDC, and already runs CROSS-MODULE combined tests (`tests/vitest/engine/timeline-edit-ops.test.ts`, `video-sync`, `bridge-seams`, `planner`); WDC carries the integration family the user called "the combined test that audio core has done before" (`audio-integration`, `dsp-bounce-parity`, `dsp-effects-integration`, `nle-audio-core-derisk`, offline render + detection).
- The mini's seal artifacts (CORE-SEAMS 26 seams + LAW-NET-INVENTORY 128-unit/355-test census: 33 HOLDS / 322 authored) already classify every UI behavior by its core-side owner — the re-expression worklist IS a programmatic-verification worklist.

---

## Ruling D23 — the plan/spec separation (the plan becomes its own executable document)

**Decision:**
1. **`IMPLEMENTATION-PLAN.md` at the spec-repo root is THE plan** — unnumbered (not a spec), the execution runbook: per-track entry points, the workstream decomposition, the stage ladder, the parallelization map + critical path, the execution protocol, the estimates. It is the ONLY file that answers "what do I execute next, where, and how do I know it's done."
2. **Spec 14 retires to a redirect stub** (`14-implementation-phases.md` keeps its number for cross-ref resolution; its content migrates; the stub carries the redirect + the phase-lineage tombstone (P→A→C/W/R→the D24 ladder) so history stays resolvable).
3. **The content split (what is spec vs what is plan):** the spec set owns WHAT + acceptance (each spec's §0 FORWARD INVENTORY triad — BASE pinned / GAP with owner+acceptance / TEST PLAN — per the R22 posture law, D20); the plan owns HOW/WHEN/WHO/WHERE (workstreams, sequencing, parallelism, entry points, gates-as-schedule). Spec 14 §4's per-domain gap registers DISSOLVE — their rows must live in the owning domain spec's §0 GAP register (the per-file audit fleet's checklist explicitly verifies every §4 row survives in its owning spec; a row found only in spec 14 is a posture-law violation to fix).
4. **The fleet pin table stays spec-side** (00-master's repo table is the pin-world canon, D21); the plan CITES the pins, never re-declares them (one source of truth; the battery checks coherence).

**Rationale:** the user's directive is structural — mixed plan+spec is what made the R22 "final" set still not executable: phases inside a spec can't carry entry points (a spec states acceptance, not repos/branches/first-actions), and the spec numbering buried the plan at file 14 of 21. A root-level unnumbered doc is the natural entry surface.

**Consequences:** battery_r23 re-points the plan-gate checks from `specs[14]` to `IMPLEMENTATION-PLAN.md` (+ the stub checks); all cross-refs to "spec 14 §…" migrate to the plan or to the owning spec's §0; the sibling-track artifacts that cite C-phases (CORE-SEAMS, LAW-NET-INVENTORY, the mini's OT-SEAMS) get a mapping note, not a rewrite (see D24's mapping table).

---

## Ruling D24 — the verification ladder (crawl = programmatic verification; walk = the real app + humans; run = the full NLE)

**Decision: the ladder is re-defined around HOW WORK IS VERIFIED, not around UI scope.**

### The stages

**CRAWL — the programmatic-verification layer (no human eyes; the user's directive).** Its deliverable is NETS + the code they verify, organized as three net-layers + one exit gate:

| Layer | What it is | Where it lives today | The delta to close |
|---|---|---|---|
| **K1 — module nets** | each repo's own suite, at its own gates (the standing practice) | engine 440 / OT 486 / WDC 759 / nle-ui 648 / app 117 / mini 355 / variants 1425+ — ALL GREEN | extend coverage per each spec §0's GAP acceptance rows (the audit fleet re-baselines the rows; each row's owner- repo extends its net) |
| **K2 — combined nets (cross-module)** | programmatic verification ACROSS the three core modules: engine-in-the-middle (vendored OT ops × engine composition: `timeline-edit-ops`, `video-sync`, `bridge-seams`, `planner`), WDC's integration family (offline render + detection: `dsp-bounce-parity`, `nle-audio-core-derisk`, `audio-integration`), OT's in-page UI-over-core runner (pixel reads + real-mouse M17-M46 + WYSIWYG state) | engine/WDC/OT each carry the seeds | formalize the COMBINED corpus as a named suite family with a census + a register (spec 12/17 extend); close the missing pairs (e.g. OT-ops→engine-decode round-trips at the app's seam shapes) |
| **K3 — app-behavior nets** | the app wiring (the real shell + real modules, no mocks) driven headlessly: the mini's LAW-NET-INVENTORY re-expressed app-side (322 tests / 115 census units — the seal's exact arithmetic), the 59-emitted-static + 15-templated testid census as the DOM-structural gate, the offline audio pins (waveform/mute laws — the Node-venue law), the VLM visual net (the variants' R23-G `vlm-capture/vlm-review` ported to the app's storybook + OT's runner) | the app's 117 + the mini's 355 + the variants' VLM tooling exist; the re-expression is planned but was mis-sequenced as C1-C4 UI work | author the corpus app-side over REAL modules (CORE-SEAMS §3 is the transport map; S1-S26 the seams) |
| **K4 — the crawl exit gate** | the fully-automated e2e: import(virtual) → cut (drag/trim/split/ripple) → play (engine clock) → export, asserted programmatically, zero mock paths, zero human input | does not exist as one test | author it as the app's single named suite; it is the crawl's completion proof |

**Crawl's purpose (the user's law):** eliminate as many issues as possible BEFORE the walk — "ideally everything can continue to be tested programmatically." Every workstream's gate in the plan prefers a programmatic check; a human-required check must be explicitly registered as such (with the reason) in the plan's gate table.

**WALK — the real app wiring, humans enter.** The app at full mini fidelity and real-session capability, in stages:
- **w1 — grammar + human rounds:** the mini grammar (skin + chrome family + viewer frame) on the canonical tree (D25), the side-by-side vs the mini mock, then the HUMAN test rounds on the complex timeline operations the user named (the point where programmatic nets saturate); findings land as new programmatic pins wherever possible (the crawl discipline continues through the walk).
- **w2 — the media layer** (registry + probe + the full event staircase — a real edit session needs real assets; W-media's content).
- **w3 — the project layer** (ProjectJSON persistence + multi-scene + cross-scene undo — W-project's content).
- **Exit:** a human-tested real edit session (import real media → edit → save → reload → export) with the findings register closed or owner-tagged.

**RUN — the full NLE (DaVinci Resolve + web-DAW class, the shell-variants scale):**
- **r1 — op depth** (slip/slide/roll/rateStretch wave 1, retime/freezeFrame/rangeRemoval wave 2, error envelope, C7 rename at end + one-day migration sub-gate — W-ops' content).
- **r2 — audio depth** (mixer G-wiring full depth, SoundTouch offline pitch, sidechain/PDC/automation, N2b keyframed volume — W-audio's content; the ≤ −60 dBFS offline/realtime parity law).
- **r3 — color** (the W4 grade-math binding + parity; the S-engine instruments consumed).
- **r4 — real media decode** (N5 — **PENDING the user's D6 re-affirmation**, deprioritized).
- **r5 — interchange + polish** (FCPXML greenfield; keymap long tail; i18n/a11y residuals).
- **r6 — the non-blocking tail** (engine P2 remainder; cloud render unchartered unless the user re-scopes).

### The old→new mapping (the corpus re-tag table — every GAP row's phase tag re-bases on this)

| Old (R22 spec-14) | New home | Note |
|---|---|---|
| pre-C1 (LAW-NET-INVENTORY) | **landed** (the R23 seal) — now K3's acceptance list | status flip, no re-home |
| C0 (MiniShell chrome family) | **w1-prep / S-package** — authored with package-level programmatic gates (crawl discipline), consumed at w1 | package work can ride ∥ crawl |
| C1 (a: qc- restyle) | **w1** (the grammar is human-fidelity work) | the visual half moves to walk |
| C1 (b: testid census; d: fixture bridge; e: OT-SEAMS dispositions; f: keyboard surface) | **K3** (all programmatically gated) | the structural/behavioral halves stay crawl |
| C2 (viewer/transport + inspector/pool wiring) | **K3** (scrub/play/seek/subjects — behavior nets over the real engine) + **w1** (the viewer FRAME visuals) | split by verification class |
| C3 (audio crawl) | **K3** (offline-render + call-spy pins) | unchanged in substance |
| C4 (mini-parity gate) | **K4** (the automated e2e + the row-by-row corpus check) + the human side-by-side moves to **w1-entry** | split |
| W-ops / W-audio / W-color | **r1 / r2 / r3** | depth = run |
| W-media / W-project | **w2 / w3** | realness = walk |
| W-n5 | **r4** (user-gated) | unchanged |
| R-fcpxml / R-polish / R-engine-p2 / R-cloud | **r5 / r5 / r6 / r6** | unchanged |
| The six S-streams | unchanged as STREAMS; their worklists re-key to the new phases | the parallelization map survives, re-labeled |

**Estimates (re-based, honest):** the crawl's NEW content (K2 formalization + K3 corpus + K4) is smaller than the old 10-14wk C-ladder because the module nets largely exist and the app wiring is real: **≈ 6-10 wk solo / 4-7 two-dev**, of which the D25 bridge migration is the largest single item. The walk (grammar + human rounds + media + project): **≈ 10-15 wk solo / 7-10 two-dev**. The run (depth phases, mostly the old W-row sums): **≈ 20-28 wk solo / 13-17 two-dev**. (Supersedes the R22 walk/run arithmetic; the traceability table records the re-base.)

**Standing law:** the crawl/walk/run labels VERIFICATION DEPTH. Code lands continuously in every stream (the module repos do not wait for stage permission); a stage's exit gate is what sequences. This is what the user's correction fixes: the old ladder sequenced UI scope, not verification.

---

## Ruling D25 — the timeline-UI single-tree bridge (the gold sample lands in OT)

**Decision (the user's open question, answered YES — with the evidence above):**

1. **OT's `src/components/timeline/` is THE canonical timeline UI tree** (single-tree law). OT is hereby "filled in closer to a ui stage" — not by new porting (the OpenCut-classic UI logic is ALREADY ported there, M17-M21), but by promoting what exists: the repo's contract becomes *timeline core + the canonical React timeline UI + the in-page verification runner*.
2. **The app's `timeline-port/` fork RETIRES.** Its PORT-LOCAL divergences (the selection bridge pair, the zoom bridge, `confirmDelete`, the import-path shim) upstream into OT as OPTIONAL injectable props (generic, classic-agnostic — the fork's own diff proves they are parameterization, not surgery). The app then vendors OT's components through the existing `vendor/nle-timeline` + `@vendor/timeline` mechanism (UPSTREAM.lock re-pinned to carry `src/components/timeline` alongside `src/lib/timeline`), keeps `EngineMount`-style app adapters for the engine/audio seams, and deletes the fork file-by-file.
3. **The mini grammar lands as an OT-side THEME layer** (the qc- token/class surface) on the canonical tree — OT's default stays the classic grammar (the M-suites' canonical target); the `/view` runner gains a mini-theme mode. The theming mechanism already exists in OT (`components/timeline/theme.ts`). The mockup port problem the user named ("the ui mockup… completely detached from the actual oc-timeline, so porting these over directly is very difficult") dissolves: the skin ports ONTO the attached tree, where every interaction law it styles is already real and netted.
4. **The gold sample = OT's `/view` page at mini theme.** UI + timeline working together, in the core repo, programmatically verified (real-mouse + pixel reads + the VLM net pointed at it) — the reference both the app and the mock tracks converge on. The app's w1 side-by-side becomes app-vs-OT-runner (two renderings of ONE tree), not app-vs-mock.
5. **K3's law inventory re-points at the canonical tree:** the 115 GAP census units land where their owner lives — OT-suite extensions for OT-side laws (the LAW-NET Part A rows whose OT-SEAMS evidence is now verifiable against the REAL tree in-repo), app-side tests for app policy/engine seams. The mini mock itself stays alive until the app matches it (the port-then-swap law, unchanged).
6. **Protocol: this is S-ot/S-app JOINT work, filed not unilateral.** The OT-side changes (props upstreaming + theme) go through the OT repo's own gates + its sibling stream's queue discipline (the file-queue law); the app migration follows the pin-lockset law (module lands first, app pin-bumps within one business day). The engine's vendored OT subset stays CORE-ONLY (`src/lib/timeline`) — the components tree is not vendored there (dead weight; the engine tests the core seam, not the UI).

**Rationale:** the fork is the drift machine — every OT hardening (F1's P1s, S3's mute batch, track lock, M45/M46 pins) lands in OT and the app's copy silently misses it (the app fork's 346-line divergence is already one round behind at `70e99f0`). The user's bridge instinct is the fix: attach the UI to the core, and the grammar, the nets, and the gold sample all land in one place. The cost (the upstreaming + vendoring re-pin + the fork deletion) is bounded by the diff evidence (leaves near-verbatim; the container parameterizable); the payoff is permanent drift elimination + the missing gold sample + the crawl's K3 corpus landing on the tree that OT's own suites already verify.

**Risk register:** (a) OT-suite churn while upstreaming props — mitigate with additive-optional-props discipline (no classic default changes; the M-suites pin the defaults); (b) the app's engine-specific mounts — keep as app-side adapters over the canonical tree's injection points, exactly the PORT-LOCAL pattern inverted; (c) sibling coordination — the OT stream is active (S3 landed mid-round); file the bridge as a queued work order, merge-first always; (d) the variants VLM net is the sibling's surface — adopt, don't fork, the tooling.

---

## The execution consequences (what this round does next, in order)

1. **The plan doc is written** (`IMPLEMENTATION-PLAN.md`) against these rulings — the workstream decomposition, the per-track entry points, the ladder, the parallelization map, the gate table (every gate tagged programmatic | human-required-with-reason), the estimates, the execution protocol.
2. **Spec 14 retires to the stub** + the cross-ref sweep (the mapping table above) — battery_r23 replaces battery_r22's plan checks.
3. **The per-file audit fleet** (the user's directive 2): one sub-agent per spec file (19 domain files + 00-master + 17 — spec 14 excluded as retired), each auditing its file against the LATEST repos (the 2026-09-07 pins above), charged with: (a) every BASE claim re-verified against live code (pins/counts/features — the fleet moved under EVERY R22 pin); (b) every GAP row re-checked (landed? still-a-gap? new gaps the repo work created); (c) every spec-14 §4 row for the domain confirmed present in the §0 register (posture law); (d) phase tags re-based per the D24 mapping; (e) new upstream work reflected (OT S3/F1/M45-46, WDC W2/CR rounds, nle-ui F3/F7, app W3 JKL, engine RR1-A — none of it is in any spec §0 today). Findings + edits land per file; the battery re-baselines the pin world once, centrally.
4. **battery_r23** extends: the pin set (b8c6f88/222532c/494f6ff/85dcf57/70e99f0 + consumer pins), the plan-doc gates (entry points per track, gate-class tags, workstream completeness), the stub checks, and the per-file-audit residue sweep.

## Review trail (to be filled by the adversarial rounds)

- Round 1: [pending]
