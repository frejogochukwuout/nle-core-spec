# IMPLEMENTATION-PLAN — the executable plan (separate from the spec set)

**What this is:** THE plan — the execution runbook for the NLE project. It is deliberately NOT a numbered spec: the spec set (`00`-`20`) owns WHAT and the acceptance criteria (each spec's §0 FORWARD INVENTORY — BASE pinned / GAP with owner+acceptance / TEST PLAN, the R22 posture law); THIS doc owns HOW/WHEN/WHO/WHERE — workstreams, sequencing, parallelism, entry points, gates, estimates, protocol.
**Ruling basis:** `audits/ARCH-R23-plan-and-bridge.md` (v2, adversarially reviewed — rulings D23 plan separation / D24 the verification ladder / D25 the timeline-UI single-tree bridge). Supersedes spec 14's plan content (that file is retired to a redirect stub; the P→A→C/W/R→K/W/R lineage lives in §7).
**Stage vocabulary (D24):** **CRAWL** = the programmatic-verification layer (no human eyes; K1 module nets → K2 combined nets → K3 app-behavior nets → K4 the automated e2e exit). **WALK** = the real app wiring with humans (w1 grammar+fidelity+human rounds, w2 media, w3 project). **RUN** = the full NLE at DaVinci/web-DAW depth (r1-r6). The stages label VERIFICATION DEPTH — code lands continuously in every stream; a stage's exit gate is what sequences.
**Crawl's purpose (the user's law):** eliminate as many issues as possible before the walk — "ideally everything can continue to be tested programmatically"; human-required gates are registered below WITH reasons.

---

## 0. HOW TO EXECUTE — the entry points (start here)

**If you are starting work:** identify your track in the table, open its repo, orient per its row's ORIENTATION cell (the fleet convention is the target repo's `.agents/HANDOFF.md` + `PLAN.md` — exceptions noted per row; WDC keeps its handoff/plan at the repo ROOT), read this doc's §3 track section, execute the FIRST ACTION, and let the GATES tell you when the step is done. **Environment prerequisite (all repo rows):** the app's private vendor submodules need `NLE_GH_PAT` + `npm run bootstrap` (README) before any gate runs; OT runs `bun install`. Every step ends with: gates green → commit → push → (if module repo) notify the app for the pin bump (the file-queue protocol: a titled block in the target repo's queue doc — for OT, append to `opencut-timeline/.agents/PLAN.md` per the cross-project queueing protocol: source session, item list, acceptance per item). **A step with no testable gate is not a step — write the gate first.**

**Taxonomy (one sentence):** a TRACK is a repo-owning stream (S-ot/S-app/S-engine/S-wdc/S-package/S-spec — the standing teams); a PHASE is a ladder rung (K1-K4 crawl / w1-w3 walk / r1-r6 run — the sequencing); a WORKSTREAM is a track's worklist slice through the phases (§3).

| Track | Repo (entry dir) | First action (the crawl window's work order) | Inputs (what you need before starting) | Gates (per step) | Done-state (this window) |
|---|---|---|---|---|---|
| **S-ot** | `/home/z/my-project/opencut-timeline` (orient: `.agents/`) | **The D25 bridge work order** — file it (a titled block appended to `opencut-timeline/.agents/PLAN.md`, the cross-project queueing protocol), then execute: (1) upstream the app fork's PORT-LOCAL props as OPTIONAL injectable props (`initialSelectedIds`/`onSelectionChange`/`selectionIds` (the echo-guarded selection bridge pair), `zoom`/`onZoomChange` (px/sec zoom bridge), `confirmDelete`, ElementView's `cancelRegistry`, the `timeline-scroll` anchor as a prop; upstream `EMPTY_CONTEXT_ITEMS` as the stability bug-fix) — additive-optional, classic defaults M-pinned; (2) the **testid-emission convention** (a `data-testid` prop family, default-off, zero classic-UI change); (3) the **view-config surface** (zoom-ladder config + ripple-toggle semantics exposure — the C1 OT-side halves); (4) K2's in-page runner: register the combined-suite family (the census + the report-json shape); then the **structural grammar half** (crawl-tail: the track-head column, the minimized strip, the compact/pill mode, the tools-row deltas — additive components, classic defaults M-pinned) and **the token half at w1-entry** (the mini theme mode on `globals.css` `:root` + `theme.ts` — D25.3a; the `/view` gold sample is contingent on both halves) | this doc + `audits/ARCH-R23-plan-and-bridge.md` (D25 mechanics + risk register) + the app fork's diff (the parameterization evidence) | `bun run test` (489→, the M-report json), `tsc --noEmit`, the real-mouse suites; the props land with new M-pins for every classic default | the app can vendor the FULL tree with zero port-local patches; the testid layer + view-config surface + the structural components exist additively; the mini theme mode exists at w1 |
| **S-app** | `/home/z/my-project/nle-test-app` (orient: `README.md` + the `worklog.md` tail — the app has NO `.agents/` yet; **its first crawl-window action includes creating `.agents/HANDOFF.md`** (the fleet convention), which becomes the pin-bump notification surface) | (1) **K3's store/policy halves may start NOW** (∥ the OT bridge — author them against the injection-point contracts): the useMini-family re-expression as app tests over the real vendored OT — **the re-expression target = the app's real surfaces** (the GluedShell store family + `engineService.ts` + `sceneBridge.ts` — CORE-SEAMS §2 is the field-by-field map; each LAW-NET family's tests land in the app's vitest beside the surface they pin); (2) **the vendor extension** once OT's props land: `vendor/nle-timeline` UPSTREAM.lock → TWO upstream paths (`src/lib/timeline` → the existing root + `src/components/timeline` → **`vendor/nle-timeline/components/`**, components' relative imports intact, their 32 `@/lib/timeline` sites resolving via the new alias, the app importing the components barrel at `vendor/nle-timeline/components/timeline/index.ts`; sync = the two `git diff upstream/… vendor/…` commands, both after stripping `testing/`), vite/tsconfig gain `@/lib/timeline` → `vendor/nle-timeline` (the `@/lib/daw`/`@/lib/nle` pattern — NO import rewrites), the tree typechecks under the app's lib target; (3) **the fork retirement** file-by-file with the post-swap checklist (one new app pin per surfaced fork-missed delta: lock-track menu, P2-6 Y-geometry, P2-8 memo-stability, P2-9 Escape cancels); (4) then **K3's DOM-structural halves** (the 59-static + 15-templated testid census + geometry laws) and **K4** (the e2e); (5) **K3's audio pins + the VLM net port** (the offline-render + call-spy pins authored against S-wdc's waveform seam contract; adopt `ui-mock/shell-variants/scripts/vlm-*` onto the app's `.storybook` + OT's runner) | the D25 ordering law (K3-DOM after swap+testid; K3-store/policy NOW) + `ui-mock/shell-mini/docs/LAW-NET-INVENTORY.md` (the acceptance lists) + `CORE-SEAMS.md` (the seam map) + `NLE_GH_PAT` + `npm run bootstrap` (the private submodules) | the app's vitest (117→), `tsc`, the boundary script, `vite build` | fork deleted; `.agents/HANDOFF.md` exists; the K3 corpus row-by-row green (322 authored + 33 projection pins); the audio pins + the VLM net live; **K4: the automated e2e green, zero mock paths** |
| **S-engine** | `/home/z/my-project/nle-engine` (orient: `.agents/`) | The live queue: (1) **the consumer re-pin wave** (the app's engine pin `4ef0147` is 14+ commits behind — the app re-pins to consume W2; **N2b is LANDED** (`37cdd28`, the S2 seam round) — removed from the queue); (2) the projector parity corpus (the N1 composition-frame family's formal S4 suite); (3) the color instruments (scopes/qualifier/power-window — spec 08 §0's S-engine row; the 4-6 wk estimate is the ARCH-R22 reviewed register); (4) **K2's engine-side pairs**: OT-ops→engine-decode round-trips at the app's seam shapes (extends `tests/vitest/engine/timeline-edit-ops`/`video-sync`) | the queue in the engine's `.agents/PLAN.md` + spec 01/03/04/08 §0s | the engine's vitest (440→), `tsc`, the vendoring sync-check | the consumer re-pin landed; the K2 engine-side pairs green; the instruments' enumerated milestones each green as queued |
| **S-wdc** | `/home/z/my-project/web-daw-core` (orient: the repo-ROOT `HANDOFF.md` + `PLAN.md` — NOT `.agents/`) | The live queue (**the SoundTouch offline pitch half of M2 is LANDED** — W2 @ `de09c93`: `lib/daw/soundtouch.ts` + `varispeed.ts`, consumers landed same round): (1) the 4 deferred upstream test ports + the mixer surface (spec 20 §0's M2 remainder — EQ/reverb/sends/inserts/sidechain/PDC); (2) sidechain/PDC/automation shapes; (3) **K3's audio pins coordination** — the waveform-data seam contract (the offline-render + call-spy pin shapes the app authors against — a hard prerequisite for K3's audio half) | the WDC root HANDOFF + spec 20 §0 | WDC's vitest (759→), `tsc`, the drift-gate (now fails-on-drift) | the deferred ports + mixer rows green; the waveform seam contract stated + pinned |
| **S-package** | `/home/z/my-project/nle-ui` (orient: `.agents/`) | (1) **C0 MiniShell** (the w1-prep chrome family: Topbar/Inspector frame/MediaPool frame/Splitter+R18j laws/Toast role=alert/Viewer frame + tokens/qc- CSS; slots-compatible; package-owned minimal placeholder; zero engine imports — the boundary script); (2) the OT S-round queue (patch.transitionOut widening, lock router route — filed in nle-ui's PLAN queue); (3) W-ops→r1 keymap surfaces later | `ui-mock/shell-mini/docs/RH-skin-extraction.md` + the mini's components + spec 18 §0 | the package's vitest (648→), `tsc`, the boundary script, the Storybook build | MiniShell renders in the package Storybook with the chrome laws green |
| **S-spec** | `/home/z/my-project/nle-core-spec` (this repo) | (1) **Step 0: write battery_r23's core FIRST** (re-point the plan/stub checks → `IMPLEMENTATION-PLAN.md` + the stub; keep the pin/count checks — the fleet's rounds gate on that core; the full battery_r23 extension is §6 step 4); (2) **the K2 combined-family census + spec 12/17 registration at K2 entry** (engine-in-the-middle: `timeline-edit-ops`/`video-sync`/`bridge-seams`/`planner`; WDC: `audio-integration`/`dsp-bounce-parity`/`dsp-effects-integration`/`nle-audio-core-derisk`; OT: the 359 in-page + 130 real-mouse runner — battery-checked thereafter); (3) the **per-file audit fleet** (§8 below — 20 agents, the user's directive); (4) the C-ledger rolling disposition (`.agents/SPEC-REVISION-CANDIDATES.md` §C) | this doc + ARCH-R23 | the battery (r23 core, then full) after every round; the sibling-race merge-first protocol | battery_r23 green; the K2 census registered; all 20 files audited against the latest pins |

**The single global entry point:** this table. When in doubt: S-app row → the K3 store/policy halves (the only work that is both immediately unblocked and on the critical path).

---

## 1. The fleet (cited, not re-declared)

The pin world lives in `00-master-spec.md`'s fleet table (D21 — HEAD pins AND consumer pins, both classes; the battery enforces coherence). Current reference set (2026-09-07; **the battery re-baselines the pin world once, centrally, after the fleet**): engine `b8c6f88` (440) / OT `222532c` (489) / WDC `494f6ff` (759) / nle-ui `85dcf57` (648) / app `70e99f0` (117) / mini 355 (sealed) / variants 1470. **This plan never re-declares pins — it cites them.**

## 2. The stage ladder (D24) — exit gates + gate classes

Every gate is tagged **[P]** (programmatic — the default; nets, pins, scrapes) or **[H:reason]** (human-required — the registered exception, only at walk for the classes the user named).

### CRAWL — the programmatic-verification layer

| Phase | Deliverable | Exit gate | Class |
|---|---|---|---|
| **K1 module nets** | each repo's own suite, extended per its spec §0 GAP acceptance rows | every repo's suite green at its own gates; every §0 GAP row's owner-repo carries the row's pin | [P] |
| **K2 combined nets** | the named cross-module family: engine-in-the-middle (OT-ops × engine composition), WDC's integration family, OT's in-page UI-over-core runner (pixel reads + real-mouse) — censused + registered in spec 12/17 | the family census green; the missing pairs closed (OT-ops→engine-decode round-trips at the app's seam shapes) | [P] |
| **K3 app-behavior nets** | the app wiring driven headlessly: the LAW-NET corpus re-expressed (322 authored + 33 projection pins; **incl. the composed ripple family — the GAP-W-ops rows, 4 units/16 tests, composed app-side over `timeline.trim`/`rippleDelete`; r1 graduates the OT interval-diff family**), the testid census DOM-structural gate, the offline audio pins, the VLM visual net (adopted from the variants' R23-G) on the app storybook + OT's runner | the corpus row-by-row green (LAW-NET-INVENTORY is the acceptance list); the census enumerated present; the audio pins green (Node-venue law; **hard prerequisite: S-wdc's waveform seam contract — the only K3 sub-half with an external prerequisite**) | [P] |
| **K4 the crawl exit** | the single automated e2e suite: import(virtual) → cut (drag/trim/split/ripple) → play (engine clock) → export | **green end-to-end, zero mock paths, zero human input** — the crawl's completion proof | [P] |

**Ordering law (hard edge):** the D25 bridge (OT props + testid layer) → the app vendor swap → K3's DOM-structural halves. K3's store/policy halves run ∥ the bridge against the injection-point contracts. The crawl's structural grammar work (D25's structural half: the track-head column, the minimized strip, the compact/pill mode, the tools-row deltas) lands IN the crawl window as OT additive components — **crawl = structure + behavior; w1 = tokens + fidelity** (the qc- token/theme half is walk).

### WALK — the real app wiring, humans enter

| Phase | Deliverable | Exit gate | Class |
|---|---|---|---|
| **w1 grammar + human rounds** | the token half of the grammar (the qc- theme on OT's CSS surface), the MiniShell chrome wiring (C0 consumed), the viewer-frame fidelity, the app-vs-OT-runner side-by-side, the annotakit review loop for the app | the side-by-side VLM pass; **the human test rounds on the complex timeline operations** (the class the user named as needing human testers — drag/trim feel, interaction latency, edit-session flow); every finding lands as a new programmatic pin wherever possible or is registered with owner | [P] + [H:interaction-feel — the user's named class] |
| **w2 media layer** | the MediaRecord registry + probe + lookup, the full event staircase (spec 15 §9.5), telemetry | media round-trip pins; every staircase row published + consumed + pinned; the full-scope demo on virtual media re-gates | [P] |
| **w3 project layer** | ProjectJSON persistence (spec 09), multi-scene + scene wire ops, cross-scene-undo + history budget | project round-trip vs per-scene OT toJSON; the scene suite green | [P] |

**Walk exit:** a real edit session — import real media → edit → save → reload → export — human-tested with the findings register closed or owner-tagged. **[H:real-session — the walk's purpose: the human-verifiable product moment; the complex-timeline-operations class extends here]**

### RUN — the full NLE (DaVinci Resolve + web-DAW class, the shell-variants scale)

| Phase | Deliverable | Exit gate | Class |
|---|---|---|---|
| **r1 op depth** (was W-ops) | slip/slide/roll/rateStretch (wave 1), retime/freezeFrame/rangeRemoval (wave 2), error-envelope refinement (spec 15 §6.3 first), **C7 rename at END** + the one-business-day app migration + keymap-sync sub-gate | S1 dispatch-complete + typed NOT_IMPLEMENTED honest; OT suite + carried tests green; spec 15 §13.15 rows flip ALIGNED | [P] |
| **r2 audio depth** (was W-audio) | mixer G-wiring full depth, sidechain/PDC/automation shapes (SoundTouch offline pitch + varispeed: **W2 LANDED @ `de09c93`** — consumed, not re-done; N2b keyframed volume: **LANDED @ `37cdd28`** — consumed) | offline parity ≤ −60 dBFS any channel + realtime behavioral pins; the null rig passes | [P] |
| **r3 color** (was W-color) | the grade-math binding + parity; the S-engine instruments consumed (scopes/qualifier/power-window) | grade-math parity pins (max delta ≤ 1 LSB-equivalent); scopes plot engine data + pinned | [P] |
| **r4 real media decode** (was W-n5) | N5: the media registry + real decode → VirtualMediaAsset | **PENDING the user's D6 re-affirmation (deprioritized)** | [P] |
| **r5 interchange + polish** (was R-fcpxml/R-polish) | FCPXML (greenfield; the parser+fixture-corpus choice is the phase-entry artifact), keymap long tail (C22 ledger), i18n, a11y residuals | validates vs the chosen reference parser on the corpus; spec 18 §11 audit; battery | [P] |
| **r6 the non-blocking tail** (was R-engine-p2/R-cloud) | CPU transition renderers, Shape/Lottie/Subtitle/Controller surfacing, other engine P2; cloud render UNCHARTERED unless the user re-scopes | per-item engine milestones green as queued; slips independently by design | [P] |

## 3. The workstreams (the tracks' worklists, keyed to spec §0s)

Each track's worklist rows cite the OWNING spec's §0 GAP register (the posture law — acceptance lives there, not here). Phase tags use the D24 vocabulary; the old→new mapping is §6.

**S-ot (opencut-timeline):** the D25 bridge (crawl) — props upstreaming, the testid convention, the view-config surface (spec 05 §0's C1-side rows) → the structural grammar half (crawl-tail: the components per ARCH-R23 D25.3b) → K2's runner registration → r1's op families + C7 (spec 06 §0, spec 15 §13.15) → the W-ops→r1 OT queue as it files.
**S-app (nle-test-app):** K3 store/policy halves (now) → the vendor extension + fork retirement (the D25 ordering law) → K3 DOM-structural + K4 → w1 (token wiring + side-by-side + human rounds) → w2 media (spec 15 §9.5 + spec 09's media half) → w3 project (spec 09) → r5 fcpxml.
**S-engine (nle-engine):** the live queue (N2b design, the projector parity corpus, the color instruments — spec 01/03/04/08 §0s) + K2's engine-side pairs → r2/r3/r6 consumption points as they land.
**S-wdc (web-daw-core):** M2 + sidechain/PDC/automation (spec 20 §0) + the K3 waveform seam contract → r2 depth.
**S-package (nle-ui):** C0 MiniShell (spec 18 §0) + the OT S-round queue ∥ crawl → w1 consumption → r1 keymap surfaces → r5 polish rows (C12/C11/C14/C15).
**S-spec (this repo):** the audit fleet (§8) + the battery + the C-ledger rolling disposition + the mock retirement triggers (post-K4/w1, the port-then-swap law — the law text in 00-master).

## 4. The parallelization map + critical path

**Runs in parallel RIGHT NOW (nothing blocks another):** S-ot's bridge work order ∥ S-app's K3 store/policy halves ∥ S-engine's queue (instruments + N2b + parity corpus) ∥ S-wdc's M2 ∥ S-package's C0 MiniShell + OT queue ∥ S-spec's audit fleet. Six streams, six repos, six gate sets — the module streams never touch each other's trees (cross-repo work is FILED as queues, never unilateral).

**The dependency graph (the hard edges):**
```
S-wdc: the waveform seam contract ─────────────┐ (a hard prerequisite)
                                               ↓
S-ot: props + testid layer ──────┐         K3's audio-pin half
   (crawl)                       │
S-app: K3 store/policy halves ──┐│        (∥ the bridge, against contracts)
                                 ├→ vendor swap + fork retirement → K3 DOM-structural → K4
S-ot: structural grammar half ──┘│           (crawl-tail)                (crawl exit)
S-package: C0 MiniShell ─────────┘────────────────────┐                      │
                                                      ↓                      ↓ (the suite extends)
                    K4 ──→ w1 (tokens + fidelity + human rounds) ──→ w2 ∥ w3 (w2's full-scope demo re-gate = K4's suite extended over the media registry) ──→ r1..r6
```
**Critical path:** the OT bridge → the app swap → K3(DOM) → K4 → w1 → (w2/w3 where staffed) → the r-phases. Solo: serial along the path, the ∥ streams ride whenever idle. Two-dev: one on S-ot/S-package (the bridge + chrome), one on S-app (K3/K4) — the crawl's 4-7 wk estimate assumes this split.
**∥-validity laws:** w2 media ∥ w3 project holds (different seams, both app-owned after w1's shell stabilizes); r1 ∥ r2 ∥ r3 hold at run (different repos); the color instruments (S-engine) run ∥ crawl but r3's gate only requires them at consumption time; K2 ∥ everything (it is verification, not construction — it tightens as the pairs land).

## 5. The execution protocol (standing practice)

1. **Push at every micro-milestone** (GIT IS THE DISK); `git fetch` before every push; **never force push** (merge-first on sibling races — they are documented and recurring).
2. **Pin-lockset law:** module lands first under ITS gates; the app pin-bumps within one business day; HEAD-follow opens bump PRs, never pushes main.
3. **The battery runs after every spec round** (battery_r23, the successor — see §8); recalibrate stale checks; exempt windows look BEFORE and AFTER each hit.
4. **Decisions go through adversarial review rounds** (fresh-context sub-agents) before implementation — the ARCH-R22/R23 trail is the pattern.
5. **A gap row with no acceptance is a spec bug; a facet with no coverage-matrix row is a spec bug** (the R22 laws, now in 00-master's standing-laws section).
6. **Port-then-swap, never swap-then-hope:** the mini mock stays alive until the app matches it (retirement triggers post-K4/w1).
7. **The drag-law freeze (D22)** and the count-discipline law (declared == actual at the pins) are standing — see 00-master.

## 6. This round's remaining steps (the S-spec track's work order)

0. **battery_r23's core FIRST** (the S-spec row's step 1 — the fleet's rounds gate on it).
1. Spec 14 → the redirect stub + the 00-master amendments: **[done @ `4878827`]** — the stub carries the §-redirect table; 00-master v8.0 carries D23-25 + §2A + the R23 re-pin. **REMAINING: the cross-ref sweep's corpus half** (17 files still cite "spec 14 §…" — the fleet's per-file agents re-base them).
2. (absorbed into 1)
3. The per-file audit fleet (§8) — 20 agents, one per file.
4. battery_r23 full extension: the pin set, the plan-doc gates (entry points per track, gate-class tags, workstream completeness), the stub checks, the audit residue sweep.
5. The PLAN/HANDOFF/SKILL wrap.

## 7. Lineage (the traceability appendix)

| Era | Plan | Fate |
|---|---|---|
| R9 | P0-P6 phases | retired to git history |
| R15 | A0-A7b assembly | superseded by R22 (content absorbed into the W-rows) |
| R22 | spec 14 v2.1: C0-C4 / W-* / R-* | superseded by THIS doc (D24's mapping table re-homes every row: C1(b,d,e,f)→K3, C1(a)→w1, C2→K3+w1, C3→K3, C4→K4+w1-entry, C0→w1-prep/S-package, W-ops/W-audio/W-color→r1/r2/r3, W-media/W-project→w2/w3, W-n5→r4 (user-gated), R-*→r5/r6; the orphans re-homed per ARCH-R23 review-1 F3) |
| R23 | THIS doc + ARCH-R23 | current |

## 8. The per-file audit fleet (the user's directive — 20 agents)

**The set:** 00-master + the 19 numbered specs (01-20 minus the retired 14). **One agent per file** — each audits its file against the LIVE upstream repos at the current pins, charged with: (a) every BASE claim re-verified (pins/counts/features — the fleet moved under every R22 pin); (b) every GAP row re-checked (landed? still-a-gap? new gaps); (c) every retired-spec-14 §4 row for the domain confirmed present in the §0 register (posture law — a row found nowhere is a violation to fix); (d) phase tags re-based per the D24 mapping; (e) the round's new upstream work reflected (OT S3/F1/M45-46, WDC W2/CR rounds, nle-ui F3/F7, app W3 JKL + RR1-B, engine RR1-A, the R23 seal artifacts). Agents edit ONLY their file, run NO git commands (the orchestrator commits per batch), and return a findings report. The battery re-baselines the pin world once, centrally, after the fleet.

**Estimates (the honest register, from ARCH-R23 v2 + the review round):** crawl ≈ **6-12 wk solo / 4-7 two-dev** (D25 bridge 2-4 [incl. OT's review cycle], K2 1-2, K3 2-4, K4 1-2); walk ≈ **10-15 wk solo / 7-10 two-dev** (row sums 7-11 + human rounds 2-4; C0's 1-1.5 rides ∥ crawl per the D24 mapping — off walk's critical path); run ≈ **20-28 wk solo / 13-17 two-dev WITH r4 (the user's D6 re-affirmation); 18-25.5 without**.
