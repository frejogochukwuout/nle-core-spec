# 14 — Implementation Phases: The Crawl-Walk-Run Assembly Plan (evolve-in-place)

**Stream:** Phased implementation plan
**Status:** **Round-22 REWRITE (the finality round).** The R15 A0-A7b plan is superseded by this crawl/walk/run plan, re-baselined onto the LIVE fleet (the app layer EXISTS: `nle-ui` package + `nle-test-app` consumer — ARCH-R22 Ruling A; the R15 plan's "fifth repo to be created" is reality under a different name). The R15 A-series' still-valid content is absorbed into the W-phases with traceability in §5. The full decision record: `audits/ARCH-R22-finality.md` (v2, adversarially reviewed). **Posture (Ruling D, standing law):** this file is FORWARD-looking — what exists is the pinned, accepted BASE (§2); what remains is the GAP work (§3, the main body). Every phase carries an exit gate that is testable (acceptance), and every gap row carries its acceptance + test plan.
**Spec file:** `14-implementation-phases.md`
**Supersedes:** the R15 A0-A7b table + the R9 P0-P6 phases (both retired to git history; P→A→C/W/R traceability in §5).

---

## 1. Purpose

Define the implementation order from TODAY (seven live repos — three sealed module cores, one engine-free UI package, one assembly app, one spec home, one mock/review surface — all gates green) to the final NLE app: first the **crawl** (the shell-mini UI fully working on a subset of the core modules), then the **walk** (the desktop-class shell at full module depth), then the **run** (the long tail that completes the product). The plan's unit of assembly is the app repo (`nle-test-app`, promoted to THE APP — "nle-app", ARCH-R22 Ruling A2); the units of evolution are the existing module repos. Every phase ends with: module PRs merged + pin-lockset bump + app suites green + battery green + push.

## 2. The BASE — the accepted, pinned fleet (reference, not work)

| Repo | Role | HEAD pin (2026-09-07) | Consumer pin | Gates |
|---|---|---|---|---|
| `nle-engine` | runtime core: decode/compose/playback/export, bridge seams | `f68ab8c` | — (it is the pin source) | 356/356, tsc 0 |
| `opencut-timeline` (OT) | editing core: doc model, ops, controllers, timeline view | `05584d8` | vendored `src/lib/timeline` mirror @ `ea10c42` (app) | 459/459 incl. 130 real-mouse, tsc 0 |
| `web-daw-core` (WDC) | pure audio core (one-audio-engine) | `fe05d85` | `5570321` (engine + app) | 740/740, tsc 0 |
| `nle-ui` | the chrome/UI PACKAGE, engine-free (shell-variants grammar; MiniShell to come) | `dba8d52` | `752991d` (app's `vendor/nle-ui`) | 640+ tests, boundary script |
| `nle-test-app` (**THE APP**) | the assembly: AppShell + EngineMount (OT) + ProgramCanvas (engine) + WDC audio host | `e662759` | — (it is the integrator) | 83/83, tsc 0 |
| `nle-core-spec` | the canon (this repo) + the two mock/review surfaces | `31d659d`→R22 | — | battery_r22 |
| `ui-mock/shell-mini` + `shell-variants` | design references + law registers + live review surfaces (annotakit) | (same repo) | — | 358 + 1334 tests |

**Landed seams (accepted, no rework):** engine N1 (composition-frame → `ProgramCanvas`, the program monitor is REAL), N2 (volume/mute flatten), N3 (transitionOut → real audio crossfades), N4 (av-link dispatch); OT S-round (transport policy, track lock, transitionOut, bookmarks — consumer migrated); WDC W1 (canonical meter taps, upstream push landed); the app's advancePlayhead ticker / JKL / loop mirror (OT Wave B). The posture law (ARCH-R22 Ruling D) governs everything below: BASE rows are cited, not re-explained; the specs' §0 sections carry the per-spec forward inventory.

## 3. The GAP — the execution phases (the main body)

### 3.1 CRAWL — the shell-mini UI, FULLY working, on a subset of the core modules

**Target:** an app build that renders the shell-mini UI grammar and behaves by the mini's law set, with EVERY surface real — playback through the engine, timeline ops through OT, audio through WDC/engine. No mock stores, no improvised op logic, no static thumbnails. The feature SUBSET is the mini's (crawl before walk); the module authenticity is TOTAL.

| Phase | Repo | Deliverable | Exit gate (testable acceptance) | Est. (wk) |
|---|---|---|---|---|
| **C0 grammar extraction** | nle-ui | `MiniShell`: the shell-mini chrome (RH tokens, qc- CSS anatomy; source = `ui-mock/shell-mini/docs/RH-skin-extraction.md` + the mini's components) as a SECOND engine-free chrome family — slot-compatible (`timelineRegion`/`programMonitor`/`mediaDragSource`) with the existing `AppShell` | package tests green; MiniShell renders in package Storybook with a package-owned MINIMAL qc- placeholder region (visual only — NO mini-store port, NO op logic); zero engine imports (boundary script); the mini grammar is product chrome (spec 18 §16.1 embedding vehicle), not crawl scaffolding | 1 |
| **C1 timeline crawl** | app + OT | (a) OT `TimelineView` (via the existing `EngineMount` port) styled to the qc- grammar through the token seam; (b) the mini's **window/binding embedding** as the app-level law (host-injected track pair + lock — OT-SEAMS row 13: track filtering, rebind selector, lock law); (c) the **seed-fixture bridge** (mini `multiTrackDoc` ⇄ OT SceneTracks via the sceneBridge family); (d) the OT-SEAMS gap rows dispositioned (below) | every mini timeline law either HOLDS on OT or is a REGISTERED gap with an owner; side-by-side at the same seed doc passes: (a) DOM-structural — testids + geometry classes present; (b) VLM visual pass on the token grammar (the mini's own review-round standard) | 3-5 |
| **C2 viewer/transport** | app | `ProgramCanvas` in the mini's viewer frame; the mini's scrub-bar/seek/walk-back laws bound to engine playhead ownership (event-staircase playhead rows) | scrub/play/seek real (no mock clock; the app's landed ticker/JKL/loop mirror carries); the viewer honors spec-18 §4.3 state rows (loading/decode-fail+retry/offline) + the mini's implemented viewer states as testids (enumerated in the C2 acceptance list at execution) | 1 |
| **C3 audio crawl** | app | WDC meter taps + engine audio in the mini's waveform/mute laws (N2 flattened; W1 taps landed) | waveforms + mutes verified by offline-render + call-spy pins (the Node venue has no audio device — WDC's own law); the mini's mute law = engine law, one owner | 1-1.5 |
| **C4 mini-parity gate** | app + spec | THE gate: the mini's law net re-expressed as APP-side tests (**the app implements, the spec owns the inventory** — the checklist/facet rows); export wiring (engine-side today, absent in app src); battery; demo | **DEMO at mini scope: import(virtual) → cut (drag/trim/split/ripple) → play → export; zero mock paths; side-by-side final vs the mini mock; the law-net checklist checked row-by-row.** Law-net arithmetic: mini 358 tests ≈ op-semantics subset (covered by OT's 459) + ~150-200 view/chrome/window/policy laws OT does not cover (drag clamp as app policy, ghosts, gap-fit, window/binding, pending-gesture, zoom ladder, keyboard, a11y) — WRITTEN app-side, not carried | 2-3 |

**Crawl total: ≈ 8-11 wk solo / 6-8 wk two-dev.** The drag law is the user-P0'd R18k clamp (OT-SEAMS row 3; the tombstoned escape rows re-open only by USER request).

**C1's OT-SEAMS row dispositions (each row: owner + mechanism):**
- Rows 1/2/4 (drag/magnet/programmatic move): OT's controller discipline + app policy (the clamp law rides the app's drop policy over OT's session).
- Row 5 (pool insert gap-fit — the mini hunts same-track gaps, OT `firstAvailable` doesn't): **app computes gap-fit over the OT snapshot it already holds** (no OT change; host affordance).
- Row 6 (trim ghost edges — view-layer affordance): OT view additive OR app port config (decided at C1 design; either way pinned by tests).
- Row 13 (window/binding): app embedding law; OT stays whole-project.
- Rows 10/12 (scrub/undo): OT-native. Row 11 (selection single-subject vs multi-ref): pre-registered gap-with-owner (app-level selection projection).

### 3.2 WALK — the desktop-class shell at full module depth (the full NLE: DaVinci Resolve + web-DAW class)

The `AppShell` (in nle-ui) grows module depth. Content re-baselined from the R15 A-series (§5 traceability); vehicle = the live repos.

| Phase | Repo | Deliverable | Exit gate | Est. (wk) |
|---|---|---|---|---|
| **W-ops** (was A2/A2.5) | OT (+ engine, tests carried) | op-family ports: slip/slide/roll/rateStretch (wave 1), retime/freezeFrame/rangeRemoval (wave 2) — engine algorithms → OT with carried tests; C7 rename (24 prefixed wire names → bare spec-15 union); error-envelope refinement (spec 15 §6.3 first) | S1 dispatch-complete + typed NOT_IMPLEMENTED honest; OT suite + carried tests green; pin bumps; spec 15 §13.15 rows flip to ALIGNED | 5-7 |
| **W-media** (was A3 remainder) | app | the media layer (MediaRecord registry + probe + lookup), the FULL event staircase (spec 15 §9.5 register), telemetry; **real media decode (engine N5) as the later slice, PENDING the user's re-affirmation of D6** (hash-color virtual media is the honest pre-N5 stand-in) | media round-trip pins; every staircase row published + consumed + pinned; the demo re-gate at FULL scope: import → cut → play → export | 3-4 |
| **W-audio** (was A4 + M2) | app + WDC + engine | mixer G-wiring full depth (inserts/sends/aux real), SoundTouch offline pitch (WDC M2), sidechain, PDC coordination, automation shapes (spec 20 §12); N2b keyframed volume (engine queue) | audible-parity offline pins + realtime behavioral pins; the A4-v2 null rig (realtime-vs-offline e2e) green | 4-6 |
| **W-project** (was A5) | app | ProjectJSON persistence (spec 09), multi-scene app slice + scene wire ops, cross-scene-undo law + history budget | project round-trip vs per-scene OT toJSON; scene suite green | 1.5-2 |
| **W-color** | app + engine | the color page REAL through the engine: the variants' W4 grade math (spec-08-exact in the mock) binds the engine pipeline; scopes + secondary qualifier + power window from the engine P2 backlog | parity pins (mock math vs engine output on the same fixtures); scopes plot engine data; A7b engine milestones green | 3-4 |

**Walk total: ≈ 14-18 wk solo / 9-11 wk two-dev after the crawl** (the A-series 22-27 wk is superseded: A0 ≈ exists; A1 projector ≈ superseded by the N1 composition-frame family — its formal parity corpus rides S-engine; A3 chrome ≈ half-done in the package). Crawl→walk is additive for ENGINE SEAMS (every crawl seam is a walk seam); mini-family chrome does NOT amortize into AppShell depth — the walk estimate assumes zero crawl-chrome carry-over.

### 3.3 RUN — the long tail that completes the product

| Phase | Repo | Deliverable | Exit gate | Est. (wk) |
|---|---|---|---|---|
| **R-fcpxml** (was A6) | app | spec-10 module (greenfield; parser+fixture corpus) | validates vs reference parser; deliver e2e | 2-3 |
| **R-polish** (was A7a) | app | keymap long tail (C22 ledger), i18n posture, a11y residuals | spec 18 §11 audit; battery | 1-1.5 |
| **R-engine-p2** (was A7b) | engine | remaining P2: CPU transition renderers (export fallback), ShapeItem/Lottie/Subtitle backlog surfacing | engine milestones green; app pin bumps | 2+ (slips independently) |
| **R-cloud** | — | cloud render (spec 11) — **unchartered: non-goal until the user re-scopes it** | — | — |

**Run total: ≈ 6-9 wk solo** (FCPXML-dominated; parallelizable).

### 3.4 The parallelization map (what runs concurrently)

**Streams (each with its own gates + repos; the app is the integrator):**

| Stream | Repo(s) | Now → next | Runs parallel to |
|---|---|---|---|
| S-engine | nle-engine | N2b keyframed volume (design round queued); the projector parity corpus (the N1 family's formal S4 suite); P2 backlog | everything (module-gated) |
| S-ot | opencut-timeline | the crawl's C1 gap rows (trim ghosts, zoom ladder config, ripple toggle semantics); W-ops family ports; C7 rename when the walk opens the wire | engine/WDC/app chrome |
| S-wdc | web-daw-core | M2 SoundTouch offline port (queued); sidechain/PDC/automation shapes | everything |
| S-package | nle-ui | C0 MiniShell; the OT S-round queue (patch.transitionOut widening, lock router route — filed `dba8d52`); W-ops keymap surfaces | OT (file-queue protocol) |
| S-app | nle-test-app | C1-C4 (the crawl build, INCLUDING the mini law-net re-expression); W-media/W-project after C4 | package (pin bumps) |
| S-spec | nle-core-spec | R22 finality (this round); then the law-net INVENTORY (the corpus definition) + review-loop housekeeping | everything |

**Safety laws (normative, all already practiced):** pin-lockset bumps within one business day (integration owner; HEAD-follow opens bump PRs, never pushes main); `git fetch` before EVERY push (the sibling-session races are documented — merge-first, never force push); module repos never break the app unnoticed (nightly HEAD-follow + S5 lockset assertion); cross-repo work is FILED as queues (the `dba8d52` pattern), never done unilaterally in the consumer; the battery runs after every spec round; every stream keeps PLAN/HANDOFF/SKILL current at wrap.

**Critical path:** C0 → C1 → C2 ∥ C3 → C4 → W-ops ∥ W-media (the full-scope demo re-gate) → W-audio ∥ W-project ∥ W-color (where two-dev) → run. Solo: serial. Two-dev: S-ot rides parallel to S-package/S-app through the crawl (6-8 wk track) and cuts the walk by ~4 wk.

## 4. The per-domain gap register (normative worklist — re-baselined to the 2026-09-07 pins; every row's acceptance lives in its owning spec's §0)

### 4.1 Editing domain (opencut-timeline @ `05584d8`; app port mirror @ `ea10c42`)
| Gap | Where it lands | Phase |
|---|---|---|
| Op-family variants: slip / slide / roll / rateStretch (engine `timeline.ts` algorithms) | OT engine layer, tests carried | W-ops |
| Op-family wave 2: retime / freezeFrame / rangeRemoval | OT engine layer | W-ops |
| C7 rename: 24 prefixed wire names → bare spec-15 union | OT (M29 + 13 real-mouse scripts as net) | W-ops |
| Error-code coarseness (5 vs spec ~24) | spec-15 §6.3 amendment first, OT follows | W-ops |
| Trim ghost edges (mini law — view affordance) | OT view additive OR app port config | C1 (decided at C1 design) |
| Zoom ladder config / ripple toggle semantics exposure (mini laws) | OT view config surface | C1 |
| Selection: single-subject projection over multi-ref | app layer | C1 (pre-registered) |
| `onViewStateChange` on TimelineViewProps (hook-level only today) | OT additive prop | W-ops/C1 |
| Imperative playhead mirror seam | OT additive surface | landed-family (verify at C2) |
| toggleElementMuted/Visibility on the wire (exist at timeline-core) | OT wire additions | W-ops |

### 4.2 Runtime domain (nle-engine @ `f68ab8c`)
| Gap | Where it lands | Phase |
|---|---|---|
| The projector parity corpus (the N1 composition-frame family's formal S4 suite — SceneTracks→ingestion translator + parity corpus) | `src/lib/nle/` (additive; the bridge family is the seed) | S-engine (∥ crawl) |
| Union façade (the 78-union service slice; JSON-RPC re-typed INTERNAL transport per D12.2-amended) | engine, additive | W-ops |
| N2b keyframed volume (per-segment gain automation + mixdown parity) | engine bridge | W-audio |
| N5 real media decode (registry + decode → VirtualMediaAsset) | engine | W-media (PENDING user re-affirmation of D6) |
| Scopes (waveform/vectorscope) + secondary qualifier + power window | engine P2 | W-color / R-engine-p2 |
| CPU transition renderers (export fallback) | engine P2 | R-engine-p2 |
| ShapeItem / LottieItem / SubtitleSegmentItem / ControllerItem surfacing | engine P2 backlog | R-engine-p2 |

### 4.3 Audio domain (web-daw-core @ `fe05d85`, consumed @ `5570321`; engine bridge)
| Gap | Where it lands | Phase |
|---|---|---|
| SoundTouch offline pitch | WDC M2 | W-audio |
| Sidechain helper; PDC coordination; automation shapes | WDC M2 scope | W-audio |
| Mixer G-surface full wiring (inserts/sends/aux real — the strips are real, depth pending) | app + engine | W-audio |
| The realtime-vs-offline e2e null rig | app rig | W-audio (the A4-v2 gate) |
| Worklet asset serving (3 files, `/worklets/` root-base-only law) | app public/ copy | C3 (verify) |

### 4.4 Shell domain (nle-ui @ `dba8d52`, consumed @ `752991d`)
| Gap | Where it lands | Phase |
|---|---|---|
| **MiniShell** (the shell-mini grammar as the second chrome family) | nle-ui | C0 |
| The OT S-round queue (patch.transitionOut widening; lock router route) | nle-ui | ∥ crawl |
| Keymap long tail (~54 of ~178 rows; C22 ledger) | nle-ui → app | R-polish |
| i18n (C12), tooltip dismiss (C11), type-scale deltas (C14), strip badges (C15) | package → app | R-polish |
| W-ops keymap surfaces (new op families) | nle-ui | W-ops |

### 4.5 App-assembly domain (nle-test-app @ `e662759` — THE APP)
| Gap | Where it lands | Phase |
|---|---|---|
| The crawl build (mini mode: MiniShell + qc-styled EngineMount + mini viewer/laws) | app | C1-C4 |
| The mini law-net re-expression (~150-200 app-side tests) + export wiring | app | C4 |
| The seed-fixture bridge (mini doc ⇄ OT doc) | app | C1 |
| Media layer (registry + probe + lookup) + full event staircase + telemetry | app | W-media |
| ProjectJSON persistence + multi-scene + scene wire ops | app | W-project |
| FCPXML (spec 10) | app | R-fcpxml |
| Annotakit review loop for the app (a config change — the strongest reusable mock asset) | app | C4 |

### 4.6 Mock/review surfaces (this repo)
| Gap | Where it lands | Phase |
|---|---|---|
| The mini law-net INVENTORY (the corpus definition the app's tests must satisfy) | spec | ∥ C4 |
| Mini/variants retirement (when the app reaches their fidelity — the port-then-swap law) | spec | post-C4 / post-walk |
| The C-ledger (SPEC-REVISION-CANDIDATES §C) disposition as the app lands each surface | spec | rolling |

## 5. P→A→C/W/R traceability (what happened to the earlier plans)

| R15 phase | Fate under this plan |
|---|---|
| week −1 pre-flight | **≈ absorbed by reality:** the TS/HMR spikes, alias strategy, dual selectors, CI — all proven by the live package+app repos (nle-ui CI, app's 83-test suite, the file: consumer protocol). Remaining pre-flight items (FCPXML parser choice; S4 venue calibration) re-open at their phase entry. |
| A0 scaffold | **DONE in effect** — the app repo + submodules + CI + boundary script exist (as `nle-ui` + `nle-test-app`). No work. |
| A1 projector | **Superseded** by the N1 composition-frame seam family (engine `src/lib/nle/bridge/`); the formal parity corpus (its S4 suite) is the surviving item → S-engine, ∥ crawl. |
| A2/A2.5 bus + renames + op ports | **W-ops** (content unchanged: C7 rename, op families with carried tests, dispatch-completeness; the vehicle is OT's now-S-round-shaped wire surface). |
| A3 shell + DEMO | **SPLIT:** the mini-scope demo is **C4** (crawl); the full-scope demo is **W-media**'s gate; the chrome port is ≈ half-done in the package (AppShell + slots + program monitor). |
| A4-v1/v2 audio | **W-audio** (+ C3 at mini scale). |
| A5 project + scenes | **W-project**. |
| A6 FCPXML | **R-fcpxml** (greenfield, unchanged). |
| A7a/A7b polish + engine P2 | **R-polish** / **R-engine-p2**. |

## 6. Standing laws (every phase)

- **Port-then-swap, never swap-then-hope** (the regression-continuity law, spec 17 / Decision 17) — the mini mock stays alive until the crawl app matches it.
- Every module-repo change lands under THAT repo's gates first; the app pin-bumps after.
- The battery (S5-successor, `battery_r22.py`) runs after every fix round; recalibrate stale checks; exempt windows look BEFORE and AFTER each hit.
- A facet with no coverage-matrix row is a spec bug (spec 17 §14.4 step 0); **a gap row with no acceptance is a spec bug (R22 Ruling D).**
- Domain cores converge toward the spec's contracts, never the reverse (Decisions 10-12, 15).
- Push at every micro milestone; `git fetch` before push; never force push.
