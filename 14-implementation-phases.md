# 14 — Implementation Phases: The Crawl-Walk-Run Assembly Plan (evolve-in-place)

**Stream:** Phased implementation plan
**Status:** **Round-22 REWRITE (the finality round), v2 — adversarial review round 2 folded (13 amendments, GO-WITH-AMENDMENTS).** The R15 A0-A7b plan is superseded by this crawl/walk/run plan, re-baselined onto the LIVE fleet (the app layer EXISTS: `nle-ui` package + `nle-test-app` consumer — ARCH-R22 Ruling A; the R15 plan's "fifth repo to be created" is reality under a different name). The R15 A-series' still-valid content is absorbed into the W-phases with traceability in §5. The full decision record: `audits/ARCH-R22-finality.md` (v2, adversarially reviewed twice). **Posture (Ruling D, standing law):** this file is FORWARD-looking — what exists is the pinned, accepted BASE (§2); what remains is the GAP work (§3, the main body). Every phase carries a testable exit gate (acceptance), and every gap row carries its acceptance + test plan.
**Spec file:** `14-implementation-phases.md`
**Supersedes:** the R15 A0-A7b table + the R9 P0-P6 phases (both retired to git history; P→A→C/W/R traceability in §5).

---

## 1. Purpose

Define the implementation order from TODAY (seven live repos — three sealed module cores, one engine-free UI package, one assembly app, one spec home, one mock/review surface — all gates green) to the final NLE app: first the **crawl** (the shell-mini UI fully working on a subset of the core modules), then the **walk** (the desktop-class shell at full module depth), then the **run** (the long tail that completes the product). The plan's unit of assembly is the app repo (`nle-test-app`, promoted to THE APP — "nle-app", ARCH-R22 Ruling A2); the units of evolution are the existing module repos. Every phase ends with: module PRs merged + pin-lockset bump + app suites green + battery green + push.

## 2. The BASE — the accepted, pinned fleet (reference, not work)

| Repo | Role | HEAD pin (2026-09-07) | Consumer pin | Gates |
|---|---|---|---|---|
| `nle-engine` | runtime core: decode/compose/playback/export, bridge seams (N1 composition-frame → `ProgramCanvas`; N2 volume/mute flatten; N3 transition windows; N4 av-link; W1 meter-tap bridge) | `f68ab8c` | — (pin source) | 356/356, tsc 0 |
| `opencut-timeline` (OT) | editing core: doc model, ops, controllers; S-round (transport policy, track lock, transitionOut, bookmarks); the React view tree lives APP-side (`timeline-port/`); OT's `view/` is utils-only | `05584d8` | vendored `src/lib/timeline` mirror @ `ea10c42` (app) | 459/459 incl. 130 real-mouse, tsc 0 |
| `web-daw-core` (WDC) | pure audio core (one-audio-engine; W1 canonical meter taps, upstream push landed) | `fe05d85` | `5570321` (engine + app) | 740/740, tsc 0 |
| `nle-ui` | the chrome/UI PACKAGE, engine-free (shell-variants grammar `AppShell`; MiniShell to come) | `dba8d52` | `752991d` (app's `vendor/nle-ui`) | 640 tests, boundary script |
| `nle-test-app` (**THE APP**) | the assembly: AppShell + EngineMount (OT timeline port: `TimelineView` 1,323L + `ElementView` 878L + Track 184L app-owned) + ProgramCanvas (engine) + WDC audio host; ticker/JKL/loop mirror landed | `e662759` | — (integrator) | 83/83, tsc 0 |
| `nle-core-spec` | the canon (this repo) + the two mock/review surfaces (annotakit) | R22-lineage | — | battery |
| `ui-mock/shell-mini` + `shell-variants` | design references + law registers + live review surfaces; the mini carries the law net (**333 tests after the R22 user directive — the full drag-machinery retirement to the verbatim R18k law**) and ~60 `mini-*` testids | (same repo) | — | 333 + 1334 tests |

The posture law (ARCH-R22 Ruling D) governs everything below: BASE rows are cited, not re-explained; each spec's §0 section carries that spec's forward inventory.

## 3. The GAP — the execution phases (the main body)

### 3.1 CRAWL — the shell-mini UI, FULLY working, on a subset of the core modules

**Target:** an app build that renders the shell-mini UI grammar and behaves by the mini's law set, with EVERY surface real — playback through the engine, timeline ops through OT, audio through WDC/engine. No mock stores, no improvised op logic, no static thumbnails. The feature SUBSET is the mini's (crawl before walk); the module authenticity is TOTAL.

**Pre-C1 (the inventory, spec-side — REQUIRED BEFORE C1 entry):** the **mini law-net inventory** distilled from the mini's 333-test net (post the R22 user directive: the full drag-machinery retirement — the R18k clamp + single-edge live-field magnet + last-preview-seal is the WHOLE drag law; ghosts / commit-at-UP / pending-gesture window / tick freeze / scrub edge auto-scroll are RETIRED) into the two checklists C1/C4 consume: (a) the *timeline-law subset* (every law marked HOLDS-on-OT / GAP-with-owner) BEFORE C1; (b) the *full corpus* (adding the chrome/App/MediaPool/timecode/waveform laws + the ~60-testid census) BEFORE C4. Deliverable: `ui-mock/shell-mini/docs/LAW-NET-INVENTORY.md` (the C1/C4 acceptance lists). Also pre-C1: **spec 18 §16.2's stale R19 drag-law paragraph is corrected to the R22 law** (the R18k law verbatim — the R21 partial revert + the R22 full retirement) so C1's executor reads ONE law, not two contradictory ones.

| Phase | Repo | Deliverable | Exit gate (testable acceptance) | Est. (wk) |
|---|---|---|---|---|
| **C0 grammar extraction** | nle-ui | `MiniShell` — the mini's CHROME inventory ported as a second engine-free family: Topbar (export CTA + minimize-lead), Inspector frame (incl. the track-card second subject), MediaPool frame, Splitter (R18j collapse laws), Toast system (role=alert law), Viewer frame; tokens/qc- CSS (source: `RH-skin-extraction.md` + the mini's components); slot-compatible (`timelineRegion`/`programMonitor`/`mediaDragSource`) | package tests green incl. the ported chrome laws (toast role, splitter, collapse behaviors); MiniShell renders in package Storybook with a package-owned MINIMAL qc- placeholder region (visual only — NO mini-store port, NO op logic); zero engine imports (boundary script) | 1-1.5 |
| **C1 timeline crawl** | app + OT | (a) qc- restyle of the app-owned port tree (~2,400 LOC view + ~1,100-line qc- CSS translation of the mini's timeline.css); (b) the **testid mapping** (mini's ~60 `mini-*` testids → app emission; 7 exist today); (c) the mini's **window/binding embedding** (host-injected pair + lock: track filtering, rebind selector, lock law); (d) the **seed-fixture bridge** (mini `multiTrackDoc` ⇄ OT SceneTracks via the sceneBridge family); (e) the OT-SEAMS row dispositions (below); (f) the mini's **editing keyboard surface** (`[`/`]`/S/Del/±/0/Home + undo/redo exposure — MiniShell OWNS the editing keys incl. undo, closing the shell-vs-port ownership gap; the C53 pending-gesture sub-threshold branches were retired with the R22 sweep — the plain key surface is the law) | side-by-side at the same seed doc passes: (a) DOM-structural — the enumerated testid census present + geometry classes; (b) VLM visual pass on the token grammar; every row of the inventory's timeline-law subset is HOLDS-on-OT or GAP-with-owner (nothing un-owned) | 4-6 |
| **C2 viewer/transport + inspector/pool wiring** | app | `ProgramCanvas` in the mini's viewer frame; the scrub-bar/seek/walk-back laws bound to engine playhead ownership; the Inspector's real subjects (clip + track card, mutual exclusion, survive-iff-visible healing); the MediaPool's import flow (virtual media → pool → the C1 gap-fit drop law); the Topbar export CTA surface | scrub/play/seek real (no mock clock; landed ticker/JKL/loop mirror carries); the viewer honors spec-18 §4.3 state rows + the mini's 13 viewer testids (mini-viewer, -scrub, -transport, -empty, -frame, -aspect, -tc, -btn-play/seek-start/seek-cliphead, viewer-max — enumerated in LAW-NET-INVENTORY); inspector/pool laws from the inventory's corpus | 2-3 |
| **C3 audio crawl** | app | WDC meter taps + engine audio in the mini's waveform/mute laws (N2 flattened; W1 taps landed); worklet asset serving verified (3 files, `/worklets/` law) | waveforms + mutes verified by offline-render + call-spy pins (Node venue has no audio device — WDC's own law); the mini's mute law = engine law, one owner | 1-1.5 |
| **C4 mini-parity gate** | app + spec | THE gate: the law-net corpus re-expressed as APP-side tests (**the app implements; the spec's LAW-NET-INVENTORY is the acceptance list**); export wiring (engine-side today, absent in app src — the topbar CTA → engine export call); the annotakit review loop config for the app (the strongest reusable mock asset; acceptance: pins created on the crawl app land in the store + mirror); battery; demo | **DEMO at mini scope: import(virtual) → cut (drag/trim/split/ripple) → play → export; zero mock paths; side-by-side final vs the mini mock; the full corpus checked row-by-row.** Law-net arithmetic: the post-R22 view/chrome-side mini tests minus the OT-covered op-semantics subset = the app-side authoring count (the inventory states the exact number; bounded by ~130-180); every violation the laws expose is FIXED or registered | 3-5 |

**Crawl total: ≈ 10-14 wk solo / 7-9 wk two-dev.** The drag law is the R22-directive R18k law verbatim (OT-SEAMS rows 1/2/3 — the clamp + single-edge live-field magnet + last-preview seal; the tombstoned escape rows re-open only by USER request; the retired machinery — ghosts, commit-at-UP, pending windows, tick freeze, scrub edge auto-scroll — stays retired).

**C1's OT-SEAMS row dispositions (each row: owner + mechanism):**
- Rows 1/2/4 (drag preview / magnet / programmatic move): OT's controller discipline + app policy — the clamp law rides the app's drop policy over OT's session; the magnet is the mini's SINGLE-EDGE live-field law (R22: left edge only, targets = neighbor edges + the live playhead, nearest within 12px — a deliberate delta from OT's both-edges snapGroupEdges, registered).
- Row 5 (pool insert gap-fit — the mini hunts same-track gaps, OT `firstAvailable` doesn't): **app computes gap-fit over the OT snapshot it already holds** (no OT change; host affordance).
- Row 6 (trim bounds): the ghost-edge PAINT was retired with the R22 sweep — the BOUNDS law (media source-bound both edges) is the surviving seam; no view affordance to port.
- Rows 13/14 (window/binding; track-heads marker/selector/hidden laws): app embedding law; OT stays whole-project.
- Rows 10/12 (scrub/undo): OT-native. Row 11 (selection single-subject vs multi-ref): pre-registered gap-with-owner (app-level selection projection).

### 3.2 WALK — the desktop-class shell at full module depth (the full NLE: DaVinci Resolve + web-DAW class)

The `AppShell` (in nle-ui) grows module depth. Content re-baselined from the R15 A-series (§5 traceability); vehicle = the live repos.

| Phase | Repo | Deliverable | Exit gate | Est. (wk) |
|---|---|---|---|---|
| **W-ops** (was A2/A2.5) | OT (+ engine, tests carried) | op-family ports: slip/slide/roll/rateStretch (wave 1), retime/freezeFrame/rangeRemoval (wave 2) — engine algorithms → OT with carried tests; **C7 rename sequenced to W-ops END** (24 prefixed wire names → bare spec-15 union) with the app-migration + nle-ui keymap sync as an explicit sub-gate (one business day, pin-lockset law); error-envelope refinement (spec 15 §6.3 first) | S1 dispatch-complete + typed NOT_IMPLEMENTED honest; OT suite + carried tests green; **C7 sub-gate: app migrated + keymap synced within one business day**; pin bumps; spec 15 §13.15 rows flip to ALIGNED | 5-7 |
| **W-media** (was A3 remainder) | app | the media layer (MediaRecord registry + probe + lookup), the FULL event staircase (spec 15 §9.5 register), telemetry | media round-trip pins; every staircase row published + consumed + pinned; **the full-scope demo on VIRTUAL media: import → cut → play → export** | 3-4 |
| **W-n5 real media decode** (split out, own gate) | engine | N5: the media registry + real decode → VirtualMediaAsset (hash-color virtual media remains the pre-N5 stand-in). **Carried PENDING the user's re-affirmation of D6** (currently deprioritized) | decode round-trip pins on a real-file corpus; the demo re-run on REAL import | 2-3 (after re-affirmation) |
| **W-audio** (was A4 + M2) | app + WDC + engine | mixer G-wiring full depth (inserts/sends/aux real), SoundTouch offline pitch (WDC M2), sidechain, PDC coordination, automation shapes (spec 20 §12); N2b keyframed volume (engine queue) | **offline parity pins** (sample-parallel render vs realtime capture on the same corpus; max deviation ≤ −60 dBFS any channel) + realtime behavioral pins; the A4-v2 null rig (realtime-vs-offline e2e) passes the same threshold | 4-6 |
| **W-project** (was A5) | app | ProjectJSON persistence (spec 09), multi-scene app slice + scene wire ops, cross-scene-undo law + history budget | project round-trip vs per-scene OT toJSON; scene suite green | 1.5-2 |
| **W-color** (re-scoped, review-2 amendment 5) | app + engine | the color page REAL through the engine: the variants' W4 grade math (spec-08-exact in the mock) binds the engine pipeline — **W-color's own scope = the binding + parity**; the engine-side instruments (scopes/secondary-qualifier/power-window) are **S-engine deliverables consumed here** (see §3.4) | **grade-math parity pins: the mock's W4 math vs the engine's output on the same fixtures (max delta ≤ 1 LSB-equivalent); scopes plot ENGINE data (when S-engine's scopes land, consumed + pinned);** A7b engine milestones green | 2-3 (binding; + instrument consumption when S-engine lands) |

**Walk total: ≈ 16.5-23 wk solo (serial; row sums) / ≈ 11-13 wk two-dev after the crawl** (the A-series 22-27 wk is superseded: A0 ≈ exists; A1 projector ≈ superseded by the N1 composition-frame family — its formal parity corpus rides S-engine; A3 chrome ≈ half-done in the package). Crawl→walk is additive for ENGINE SEAMS (every crawl seam is a walk seam); mini-family chrome does NOT amortize into AppShell depth — the walk estimate assumes zero crawl-chrome carry-over.

### 3.3 RUN — the long tail that completes the product

| Phase | Repo | Deliverable | Exit gate | Est. (wk) |
|---|---|---|---|---|
| **R-fcpxml** (was A6) | app | spec-10 module (greenfield; **the parser+fixture-corpus choice is the phase-entry artifact** — decided at entry, recorded in this file before work starts) | validates vs the chosen reference parser on the corpus; deliver e2e | 2-3 |
| **R-polish** (was A7a) | app | keymap long tail (C22 ledger), i18n posture, a11y residuals | spec 18 §11 audit; battery | 1-1.5 |
| **R-engine-p2** (the non-blocking remainder — re-typed, review-2 amendment 5) | engine | **enumerated:** CPU transition renderers (export fallback); ShapeItem / LottieItem / SubtitleSegmentItem / ControllerItem surfacing; any engine P2 items NOT consumed by W-color | per-item engine milestones green (each item's milestone written when queued); app pin bumps; **slips independently by design — nothing in crawl/walk gates on it** | 2+ |
| **R-cloud** | — | cloud render (spec 11) — **unchartered: non-goal until the user re-scopes it** | — | — |

**Run total: ≈ 6-9 wk solo** (FCPXML-dominated; parallelizable).

### 3.4 The parallelization map (what runs concurrently)

**Streams (each with its own gates + repos; the app is the integrator):**

| Stream | Repo(s) | Now → next | Runs parallel to |
|---|---|---|---|
| S-engine | nle-engine | N2b keyframed volume (design round queued); the projector parity corpus (the N1 family's formal S4 suite); **the color instruments: scopes + secondary qualifier + power window (the W-color consumers — enumerated milestones, estimated 4-6 wk combined)**; then R-engine-p2 remainder | everything (module-gated) |
| S-ot | opencut-timeline | the crawl's C1 gap rows (zoom ladder config exposure, ripple toggle semantics — the OT-side halves); W-ops family ports; C7 rename at W-ops end | engine/WDC/app chrome |
| S-wdc | web-daw-core | M2 SoundTouch offline port (queued); sidechain/PDC/automation shapes | everything |
| S-package | nle-ui | C0 MiniShell; the OT S-round queue (patch.transitionOut widening, lock router route — filed `dba8d52`); W-ops keymap surfaces | OT (file-queue protocol) |
| S-app | nle-test-app | C1-C4 (the crawl build, INCLUDING the law-net re-expression); W-media/W-project after C4 | package (pin bumps) |
| S-spec | nle-core-spec | R22 finality (this round); **the LAW-NET-INVENTORY (pre-C1 subset + pre-C4 corpus — BEFORE the phases that consume it, review-2 amendment 1)**; review-loop housekeeping | everything |

**Safety laws (normative, all already practiced):** pin-lockset bumps within one business day (integration owner; HEAD-follow opens bump PRs, never pushes main); `git fetch` before EVERY push (the sibling-session races are documented — merge-first, never force push); module repos never break the app unnoticed (nightly HEAD-follow + lockset assertion); cross-repo work is FILED as queues (the `dba8d52` pattern), never done unilaterally in the consumer; the battery runs after every spec round; every stream keeps PLAN/HANDOFF/SKILL current at wrap.

**Critical path:** pre-C1 inventory → C0 → C1 → C2 ∥ C3 → C4 → W-ops ∥ W-media (the full-scope demo re-gate) → W-audio ∥ W-project ∥ W-color (where two-dev) → run. Solo: serial. Two-dev: S-ot + S-engine (instruments) ride parallel to S-package/S-app through the crawl (7-9 wk track) and cut the walk by ~4-5 wk. **∥ validity (review-2):** W-ops ∥ W-media holds ONLY with C7 at W-ops end + the one-day migration sub-gate; S-engine's color instruments run parallel but W-color's gate only requires them at INSTRUMENT-CONSUMPTION time (the binding parity closes first).

## 4. The per-domain gap register (normative worklist — re-baselined to the 2026-09-07 pins; every row's acceptance lives in its owning spec's §0)

### 4.1 Editing domain (opencut-timeline @ `05584d8`; app port mirror @ `ea10c42`)
| Gap | Where it lands | Phase |
|---|---|---|
| Op-family variants: slip / slide / roll / rateStretch (engine `timeline.ts` algorithms) | OT engine layer, tests carried | W-ops |
| Op-family wave 2: retime / freezeFrame / rangeRemoval | OT engine layer | W-ops |
| C7 rename: 24 prefixed wire names → bare spec-15 union (+ one-day app migration + keymap sync sub-gate) | OT | W-ops (at end) |
| Error-code coarseness (5 vs spec ~24) | spec-15 §6.3 amendment first, OT follows | W-ops |
| Zoom ladder config / ripple toggle semantics exposure (mini laws) | OT view-config surface (OT-side halves) | C1 |
| Selection: single-subject projection over multi-ref | app layer | C1 (pre-registered) |
| `onViewStateChange` on TimelineViewProps (hook-level only today) | OT additive prop | W-ops |
| toggleElementMuted/Visibility on the wire (exist at timeline-core) | OT wire additions | W-ops |

### 4.2 Runtime domain (nle-engine @ `f68ab8c`)
| Gap | Where it lands | Phase |
|---|---|---|
| The projector parity corpus (the N1 composition-frame family's formal S4 suite — SceneTracks→ingestion translator + parity corpus) | `src/lib/nle/` (additive; the bridge family is the seed) | S-engine (∥ crawl) |
| Union façade (the 78-union service slice; JSON-RPC re-typed INTERNAL transport per D12.2-amended) | engine, additive | W-ops |
| N2b keyframed volume (per-segment gain automation + mixdown parity) | engine bridge | W-audio |
| N5 real media decode (registry + decode → VirtualMediaAsset) | engine | W-n5 (PENDING user re-affirmation of D6) |
| **The color instruments: scopes (waveform/vectorscope), secondary qualifier, power window (zero engine code today — NOT a W-color deliverable; S-engine builds, W-color consumes)** | engine | S-engine → consumed at W-color |
| CPU transition renderers; ShapeItem/Lottie/Subtitle/Controller surfacing | engine P2 | R-engine-p2 (non-blocking remainder) |

### 4.3 Audio domain (web-daw-core @ `fe05d85`, consumed @ `5570321`; engine bridge)
| Gap | Where it lands | Phase |
|---|---|---|
| SoundTouch offline pitch | WDC M2 | W-audio |
| Sidechain helper; PDC coordination; automation shapes | WDC M2 scope | W-audio |
| Mixer G-surface full wiring (inserts/sends/aux real — the strips are real, depth pending) | app + engine | W-audio |
| The realtime-vs-offline e2e null rig (pass: max deviation ≤ −60 dBFS any channel) | app rig | W-audio |
| Worklet asset serving (3 files, `/worklets/` root-base-only law) | app public/ copy | C3 (verify) |

### 4.4 Shell domain (nle-ui @ `dba8d52`, consumed @ `752991d`)
| Gap | Where it lands | Phase |
|---|---|---|
| **MiniShell** (the mini's chrome inventory: Topbar/Inspector frame/MediaPool frame/Splitter+R18j laws/Toast/Viewer frame + tokens/qc- CSS) | nle-ui | C0 |
| The OT S-round queue (patch.transitionOut widening; lock router route) | nle-ui | ∥ crawl |
| Keymap long tail (~54 of ~178 rows; C22 ledger) | nle-ui → app | R-polish |
| i18n (C12), tooltip dismiss (C11), type-scale deltas (C14), strip badges (C15) | package → app | R-polish |
| W-ops keymap surfaces (new op families) | nle-ui | W-ops |

### 4.5 App-assembly domain (nle-test-app @ `e662759` — THE APP)
| Gap | Where it lands | Phase |
|---|---|---|
| The crawl build (mini mode: MiniShell + qc-styled port tree + mini viewer/laws) | app | C1-C4 |
| The testid mapping (mini ~60 `mini-*` → app; 7 exist) | app | C1 |
| The mini law-net re-expression (the inventory's corpus as app-side tests) + export wiring | app | C4 |
| The seed-fixture bridge (mini doc ⇄ OT doc) | app | C1 |
| The editing keyboard surface + undo/redo exposure (MiniShell owns the editing keys) | app | C1 |
| Media layer (registry + probe + lookup) + full event staircase + telemetry | app | W-media |
| ProjectJSON persistence + multi-scene + scene wire ops | app | W-project |
| FCPXML (spec 10) | app | R-fcpxml |
| Annotakit review loop for the app (config; pins land in store + mirror) | app | C4 |

### 4.6 Mock/review + spec surfaces (this repo)
| Gap | Where it lands | Phase |
|---|---|---|
| **LAW-NET-INVENTORY.md** (timeline-law subset before C1; full corpus + testid census before C4 — post-R22-retirement law set) | `ui-mock/shell-mini/docs/` | **pre-C1 / pre-C4 (BEFORE the consuming phases)** |
| Spec 18 §16.2 drag-law paragraph corrected to the R22 law (R18k verbatim — the full retirement) | spec 18 | pre-C1 |
| Mini/variants retirement (when the app reaches their fidelity — the port-then-swap law) | spec | post-C4 / post-walk |
| The C-ledger (SPEC-REVISION-CANDIDATES §C) disposition as the app lands each surface | spec | rolling |

## 5. P→A→C/W/R traceability (what happened to the earlier plans)

| R15 phase | Fate under this plan |
|---|---|
| week −1 pre-flight | **≈ absorbed by reality:** the TS/HMR spikes, alias strategy, dual selectors, CI — all proven by the live package+app repos. Remaining pre-flight items (FCPXML parser choice; S4 venue calibration) re-open at their phase entry. |
| A0 scaffold | **DONE in effect** — the app repo + submodules + CI + boundary script exist (as `nle-ui` + `nle-test-app`). No work. |
| A1 projector | **Superseded** by the N1 composition-frame seam family (engine `src/lib/nle/bridge/`); the formal parity corpus (its S4 suite) is the surviving item → S-engine, ∥ crawl. |
| A2/A2.5 bus + renames + op ports | **W-ops** (content unchanged: C7 rename at end + migration sub-gate, op families with carried tests, dispatch-completeness; the vehicle is OT's now-S-round-shaped wire surface). |
| A3 shell + DEMO | **SPLIT:** the mini-scope demo is **C4** (crawl); the full-scope demo is **W-media**'s gate; the chrome port is ≈ half-done in the package. |
| A4-v1/v2 audio | **W-audio** (+ C3 at mini scale). |
| A5 project + scenes | **W-project**. |
| A6 FCPXML | **R-fcpxml** (greenfield, unchanged). |
| A7a/A7b polish + engine P2 | **R-polish** / **R-engine-p2 (re-typed: the non-blocking remainder — the color instruments moved to S-engine)**. |

## 6. Standing laws (every phase)

- **Port-then-swap, never swap-then-hope** (the regression-continuity law, spec 17 / Decision 17) — the mini mock stays alive until the crawl app matches it.
- Every module-repo change lands under THAT repo's gates first; the app pin-bumps after.
- The battery (`battery_r22.py`, landed this round — the S5 successor) runs after every fix round; recalibrate stale checks; exempt windows look BEFORE and AFTER each hit.
- A facet with no coverage-matrix row is a spec bug (spec 17 §14.4 step 0); **a gap row with no acceptance is a spec bug (R22 Ruling D)**.
- Domain cores converge toward the spec's contracts, never the reverse (Decisions 10-12, 15).
- Push at every micro milestone; `git fetch` before push; never force push.
