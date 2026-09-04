# 14 — Implementation Phases: The Assembly Plan (evolve-in-place)

**Stream:** Phased implementation plan
**Status:** Round-15 REWRITE. The R9 code-first posture (§2.1 "three-repo baseline, inherit-don't-rebuild") is superseded by **Decision 15/16** (evolve-in-place + the `nle-app` assembly architecture); the R9-era P0-P6 phase bodies are RETIRED to git history (their still-relevant acceptance criteria live in spec 17 §13A + the per-domain gap registers below + ARCH-R15). This file is now the normative EXECUTION PLAN: the week-(-1) pre-flight, the A0-A7b assembly phases, and the per-domain gap register. The full decision record (two peer reviews, both signed off): `audits/ARCH-R15-assembly-and-path.md`, `audits/REVIEW-R15-ARCH.md`, `audits/REVIEW-R15-EXEC.md`.
**Spec file:** `14-implementation-phases.md`
**Supersedes:** the R9 §2.1 posture table and the P0-P6 ordering. **Superseded-by nothing.** P→A traceability in §5.

---

## 1. Purpose

Define the implementation order from TODAY (four sealed repos, ~65-70% of the non-assembly product done and verified) to the final NLE app. The plan's unit of assembly is a NEW repo, `nle-app` (Decision 16); the units of evolution are the existing module repos. Every phase ends with: module PRs merged + pin-lockset bump + app suites green + battery green + push.

## 2. The posture (Decision 15, one paragraph)

**Evolve-in-place.** No domain is rebuilt. The engine, OT, and web-daw-core evolve under their own gates (fences, freezes, review loops — additions only); the app composes them as pinned submodules and owns the seams. The spec set is the gap register + acceptance harness driving that evolution. The greenfield surfaces are exactly two: the app's assembly layer and FCPXML export. Full reasoning + the greenfield ledger + the adversarial steelman: ARCH-R15 §1.

## 3. The execution plan (normative — ARCH-R15 §3.4 carries the full exit gates)

| Phase | Repo | Deliverable | Exit gate (essence) | Est. (wk) |
|---|---|---|---|---|
| **week −1 pre-flight** | — | 12-item list (REVIEW-R15-EXEC §7): TS one-compiler spike, Vite HMR spike (both GATES), alias strategy (EXEC §2.2 config adopted verbatim), dual test-selector, error-envelope decision, state-boundary contract, C7 direction, PAT+CI dry-run, FCPXML parser choice, S4 venue calibration, SCOUT docs as onboarding, reviewer-panel booking | both spikes green | 0.5-1 |
| **A0 scaffold** | app | repo + 3 submodules + tsconfig/vite alias config + CI skeleton + WDC worklet copy + CSS import order + battery S5 v0 | tsc clean; **TimelineView renders in-app + HMR round-trip on a vendored file**; fast lane measured | 1 |
| **A1 projector v1** | ENGINE | `src/lib/nle/projector/` (additive, fenced; SceneTracks TYPE-ONLY import): SceneTracks→ingestion translator + parity corpus + S4 parity suite; engine `Timeline` = oracle | parity green (audio + stills) on corpus; S1 projector laws; engine CI green; app pin bump | 4-5 |
| **A2 bus + renames** | OT + engine + spec | C7 rename (24 prefixed → bare, M29 net + 13 real-mouse scripts as regression); engine union façade + dispatch-completeness tests; op-port wave 1 (slip/slide/roll/rateStretch INTO OT with carried tests + re-convened W8-f/W9 panel); spec-15 §13.15 refresh + routing-disposition table | S1 dispatch-complete + typed NOT_IMPLEMENTED honest; OT 423 + new op tests green | 5-6 |
| **A2.5 op wave 2** | OT | retime / freezeFrame / rangeRemoval ports (+ OT model extensions if spec'd) | carried tests green; pin bump (rides ∥ to A3) | 1.5-2 |
| **A3 shell assembly** | app | chrome port + store swap (view-state slice only); TimelineView mount + mediaLookup + `onViewStateChange` OT patch + imperative playhead seam; player/export e2e wiring; `/dev/view-fixture` page | S2+S3(a-c) green; **DEMO: import(virtual) → cut → play → export mp4** | 5-6 |
| **A4-v1 audio surface** | app + engine | M2: mixer G-wiring (mock mixer intent → engine `MixerTrackSettings` sidecar → strips; aux/sends/inserts real; ducking law) | mixer params audible + offline parity + realtime behavioral pins | 1-2 |
| **A4-v2 null gate** | app | the realtime-vs-offline e2e null rig (net-new — CR-A #6 blocks the cheap route) | null test green | ~1 (later, ∥) |
| **A5 project + scenes** | app | ProjectJSON persistence (spec 09); multi-scene app slice + scene wire ops; cross-scene-undo law + history budget | S2 scene suite; project round-trip vs per-scene OT toJSON | 1.5-2 |
| **A6 FCPXML** | app | spec-10 module (pure greenfield; parser+fixture corpus chosen at week −1) | validates vs reference parser; deliver e2e | 2-3 |
| **A7a app polish** | app | keymap long tail (C22 ledger), i18n posture, a11y residuals | spec 18 §11 audit; battery green | 1-1.5 |
| **A7b engine P2 surfacing** | ENGINE | scopes (~1 wk), secondary qualifier + power window (~1-1.5) — engine-repo items under engine gates; slips independently | engine milestones green; app pin bumps | 2-2.5 |

**Totals (fresh-senior calibrated, per REVIEW-R15-EXEC §5): A7-complete ≈ 22-27 wk solo / ≈ 13-16 wk two-dev (A2.5 rides parallel to A3; full-serial high end ≈ 29-30). The A3 DEMO lands ≈ 11-13 wk solo / ≈ 7-8 wk two-dev** (derivation: week−1 + A0 + A1 + A2 serial-critical-chain; chrome-port work overlaps A1/A2; the demo exit is serially gated on A1+A2; the projector is single-context work). Two-dev speedup decays after A3 (A4→A6 is one front; the second dev takes A7b + engine backlogs). **The R9 estimate (8-13 wk) is superseded** — it under-counted assembly + multi-scene + FCPXML + review latency.

**The daily discipline:** pin-lockset bumps within one business day (integration owner; HEAD-follow opens bump PRs, never pushes main); `git fetch` before every push; module repos never break the app unnoticed (nightly HEAD-follow + S5 lockset assertion).

## 4. The per-domain gap register (normative worklist — every row cites a module pin at R15 baselines)

### 4.1 Editing domain (opencut-timeline @ `0412e41`)
| Gap | Where it lands | Phase |
|---|---|---|
| 24 prefixed wire names → bare spec-15 types (C7) | OT (mechanical; M29 + 13 scripts as net) | A2 |
| Op-family variants: slip / slide / roll / rateStretch | OT engine layer (algorithms + tests carried from engine `Timeline`: timeline.ts:4143/4246/2984/3155) | A2 wave 1 |
| Op-family wave 2: retime / freezeFrame / rangeRemoval | OT engine layer (engine :7163-family) | A2.5 |
| Error-code coarseness (5 vs spec ~24) | spec-15 §6.3 amendment first, OT follows | A2 (envelope now, refinement queued) |
| `onViewStateChange` not on TimelineViewProps (hook-level only, use-timeline-zoom.ts:70) | OT additive prop | A3 |
| Imperative playhead mirror seam (TimelinePlayhead renders from `core.getCurrentTime()` — freezes during engine playback without it) | OT additive surface | A3 |
| Engine-ops absent from the wire: toggleElementMuted/Visibility (exist at timeline-core.ts:906/:950) | OT wire additions | A2 wave 1 |
| `data-test` vs `shell-*` `data-testid` | harness-side dual selector (app); zero churn in sealed repos | week −1 decision |

### 4.2 Runtime domain (nle-engine @ `f526e67`)
| Gap | Where it lands | Phase |
|---|---|---|
| The projector (SceneTracks → render/audio/export ingestion; today ZERO cross-model path — the bridge consumes OT types only) | `src/lib/nle/projector/` (additive; D9 freeze-list update same-commit) | A1 |
| Union façade (service slice of the 78-union; JSON-RPC re-typed INTERNAL transport per D12.2-amended) | engine, additive | A2 |
| ShapeItem / LottieItem / SubtitleSegmentItem / ControllerItem | engine P2 backlog (surfacing decision) | post-A7 (backlog) |
| Scopes (waveform/vectorscope) + secondary qualifier + power window | engine P2 | A7b |
| CPU transition renderers (export fallback) | engine P2 | post-A7 (backlog) |
| Real media import | DEPRIORITIZED (user directive D6) — until a feature forces it | — |
| Cosmetic: layout.tsx "Z.ai Code Scaffold" metadata; "~280 rows" → 265 doc drift | engine next commit | A0-era fold |

### 4.3 Audio domain (web-daw-core @ `374711c`; engine bridge @ `f526e67`)
| Gap | Where it lands | Phase |
|---|---|---|
| Mixer G-surface wiring (engine `bridgeSceneSettings` = unity + solo only; inserts empty; the mock's mixer is UI-only intent) | app A4-v1 wiring engine `MixerTrackSettings` | A4-v1 |
| The realtime-vs-offline e2e null test (today's parity is a composition: H3 + H15b + 29.1 + m30 behavioral) | app rig | A4-v2 |
| SoundTouch offline pitch; sidechain helper; PDC coordination; automation shapes | WDC M2 scope (engine-side consumption) | A4+ (M2) |
| Worklet asset serving (3 files, `/worklets/` root-base-only law) | app public/ copy | A0 |

### 4.4 Shell domain (ui-mock @ `d42693e` — PORTED at A3, retires as a repo after A7)
| Gap | Where it lands | Phase |
|---|---|---|
| Engine wiring (0% — all store mutations, zero EngineCommand emission) | app bus + capture suite | A2/A3 |
| Keymap long tail (~54 of ~178 rows implemented; C22 ledger) | app | A7a |
| i18n (C12), tooltip dismiss (C11), type-scale deltas (C14), strip badges (C15) | app | A7a |
| `shell-viewer-state-empty` testid | mock patch (C-ledger) | A3 |
| The timeline region is NOT ported (OT is the shipping timeline UI per D12; the mock's Timeline/Clip/Ruler = design reference + law register) | — | — |

### 4.5 App assembly domain (the 0% layer)
| Gap | Phase |
|---|---|
| The app repo + submodule lockset + alias/CI machinery | A0 |
| The command bus (routing-disposition table, spec 15 §4.1A) + union versioning | A2 |
| The event staircase (EngineEvent normalization; playhead ownership; meters/peaks/progress) | A3 (with A2 event rows) |
| Media layer (MediaRecord registry + MediaLookup + probe) | A3 |
| ProjectJSON persistence + multi-scene + scene wire ops | A5 |
| FCPXML (spec 10) | A6 |
| Annotakit review loop for the app (a config change, not a port — the strongest reusable mock asset) | A3 |

## 5. P→A traceability (what happened to the R9 phases)

| R9 phase | Fate under the assembly plan |
|---|---|
| P0 playback/engine core | ≈ satisfied by the engine baseline (re-verified R15: 265/265) — remaining P0 items ride engine P2 backlog (§4.2) |
| P1 UI shell + projector | SPLIT: the projector is A1 (engine-home); the shell is A3 (chrome port + OT TimelineView — NOT a from-scratch build) |
| P-A audio wiring | A4-v1/v2 (M2 + the null gate) |
| P2 op-family port | A2 wave 1 + A2.5 wave 2 (unchanged charter: engine algorithms → OT, tests carried) |
| P3 transitions | ≈ satisfied (27 presentations, planner, identity gates); CPU fallback rides engine backlog |
| P4 color | ≈ 70% satisfied; scopes + secondary qualifier = A7b |
| P5 FCPXML | A6 (greenfield, unchanged) |
| P6 cloud | unchartered (non-goal until re-scoped) |

## 6. Standing laws (every phase)

- Port-then-swap, never swap-then-hope (the regression-continuity law, spec 17 / Decision 17).
- Every module-repo change lands under THAT repo's gates first; the app pin-bumps after.
- The battery (S5) runs after every fix round; recalibrate stale checks; exempt windows look BEFORE and AFTER each hit.
- A facet with no coverage-matrix row is a spec bug (spec 17 §14.4 step 0).
- Domain cores converge toward the spec's contracts, never the reverse (Decisions 10-12, 15).
- Push at every micro milestone; `git fetch` before push; never force push.
