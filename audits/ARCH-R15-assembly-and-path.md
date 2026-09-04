# ARCH-R15 — Implementation Path + Assembly Architecture + Execution Plan

**Round:** 15 (2026-09-05). **Status:** v2 — post peer-review (REVIEW-R15-ARCH: SOUND-WITH-AMENDMENTS; REVIEW-R15-EXEC: BUILDABLE-WITH-CHANGES; all amendments folded; re-review gate pending).
**Inputs:** SCOUT-R15-A/B/C/D (all four ran their gates in-sandbox: 274 vitest + 265 browser rows + 318 probes; 423/423; 721/721; 596/596) + the two peer reviews (≈20 claims re-verified against code by PR1; dev-loop/bundle/CI claims verified by PR2).
**Preceded by:** ARCH-R9 (Decisions 12/13/14). This document EXECUTES D12/D14 and adds the layer R9 deferred: **how the four codebases become ONE app.**

---

## 0. The question set (user, Round 15)

1. **Path:** evolve-in-place vs greenfield — honestly re-assessed now that the foundational repos are sealed (user position: >50%, likely ~70% complete; greenfield "seems problematic now").
2. **Assembly:** how to construct the final NLE app from individual tech-validation kits — where each repo has a tight wrap of its own tests; how do we get back to that coverage wired ACROSS modules (the submodule question).
3. **Execution:** the architectural design + the plan from here to final.

### 0.1 Evidence base (one screen)

| Repo | Sealed state (verified this round) | LOC (non-test) | Role in the final app |
|---|---|---|---|
| nle-engine | 274/274 vitest + 265/265 browser rows (31 milestones, real WebGPU, re-run) + 318 probe checks + 52-edge layer fence + 453-name API freeze; review ledger zero-open-P2 | ~52k | RUNTIME core: render/effects/transitions/text/persistence/export/player + the audio bridge (one-audio-engine end-to-end, realtime AND export through one SceneMixer graph) |
| opencut-timeline | 423/423 (303 in-page + 120 real-mouse, re-run), tsc 0; W9 terminal, zero open P1/P2 | ~20.2k | EDITING core + timeline UI: classic-parity TimelineView + controllers + `TimelineCore` (D12 SSOT) |
| web-daw-core | 721/721 (re-run), tsc 0, zero runtime deps, GHA gate | ~75 copied files + 11 shims | AUDIO core (E layer): strips/buses/DSP/offline+realtime, upstream-re-syncable |
| ui-mock/shell-variants | 596/596 (re-run), tsc 0; PR #1 down to 2 P3 comments; **no CI workflow** (local suite only) | ~8.9k impl | SHELL design + chrome: ≈55% of UI-layer risk de-risked; timeline region explicitly NOT the shipping code (D12); mock is **ported into the app, not vendored** |

**The 0% layers (identical work under either path):** the APP (projector, bus, events, media, project model, shell wiring), FCPXML, cloud, the wire-protocol unification, the audio G-surface wiring.

---

## 1. RULING 1 (Decision 15) — Implementation path: EVOLVE-IN-PLACE; the repos are the product

### 1.1 The honest completion matrix

| Domain | Completion | Missing |
|---|---|---|
| Editing core (OT) | ~75% of the editing contract | op-family variants (engine has them: rollingTrimItems timeline.ts:2984, slip :4143, slideItem :4246, rateStretchItem :3155, freezeFrameAtPosition :7163, closeGapAtPosition :6158, joinItems :7319); C7 prefixed names; error-code coarseness (5 vs spec ~24) |
| Runtime engine | ~80% (P0 85 / P-A 80 / P3 85 / P4 70) | ShapeItem/LottieItem/Subtitle; scopes + secondary qualifier; CPU transition fallback; real media (user-deprioritized D6) |
| Audio core | ~85% of M-scope | M2: G-surface wiring (engine `bridgeSceneSettings` = unity + solo only), SoundTouch offline, sidechain helper, automation shapes |
| UI shell | ~55% of UI-layer risk de-risked | engine wiring 0%; i18n; keymap long tail (~54/178 rows); timeline region ships from OT |
| **App assembly** | **0%** | everything |
| FCPXML (P5) / cloud (P6) | 0% / 0% | everything (greenfield by nature) |

**Weighted union: ~65-70% of the non-assembly, non-cloud product is done and verified** — the user's estimate is accurate.

### 1.2 The greenfield ledger

A spec-driven greenfield re-derives ~90k LOC + 31-milestone browser harness + 318 probes + 52 fences + 120 real-mouse pins + a null-test DSP harness with a living upstream relationship — before reaching parity with TODAY. The spec's R9 estimate (8-13 wk) already assumed code-first inheritance; true greenfield is that × a conservative 3-5 re-derivation factor, with worse defect characteristics ("plausible-looking unverified everything" vs "bounded gap in a verified core"). **The full steelman case FOR greenfield is recorded in REVIEW-R15-ARCH §4** (reconciliation machinery as pure overhead; module-boundary-only verification; five-repo process tax; the app+engine-only middle path). It loses on the evidence: the interaction layer is un-re-derivable (its step 5 — "vendor OT's interaction source" — is evolve-in-place with worse tooling), the 3-5× factor is conservative against the engine's own history, and **PR1 independently probed all four sealed cores for D15's stated reversal condition (a structural defect cheaper to rebuild than contain) and found none — only document-level assembly gaps.**

**Where the steelman half-wins (admitted into this ruling):** the process tax of five repos is real (5 CI configs, 5 review cadences, PAT machinery) — §2.1bis weighs the workspace alternative that shrinks it; and the reconciliation work (A1+A2) is genuinely pure overhead vs a same-repo design. This is the price of the review-paid, fence-protected assets; we pay it knowingly.

### 1.3 What evolve-in-place costs (stated honestly)

1. **Three structural models must become one** (engine `TimelineData` / OT `SceneTracks` / mock `SceneJSON`-discardable) — D12 ruled the convergence; the projector is unbuilt (§2.2). Largest single work item; required under either path.
2. **Three command surfaces + three event surfaces** must each become one (§2.3, §2.3bis).
3. **Terminal repos reopen by addition only**: OT gains op families + C7 (its own fences + carried tests + a re-convened W8-f/W9 peer round); the engine gains a projector + union façade (D9 additive-change rule; same-commit freeze-list updates); WDC gains nothing.
4. **Submodule pin management** — now a lockset discipline (§2.5).
5. **Spec-vs-code drift is a permanent discipline** — D14's CONTRACT+GAP+ACCEPTANCE is exactly this posture; the gap register is the spec's product from here on.

### 1.4 The verdict

**Decision 15: EVOLVE-IN-PLACE.** The four repos are the product's code. The spec set's implementation role = the gap register + acceptance gates driving in-place evolution. No greenfield rebuild of any domain. FCPXML (and cloud, if ever) are greenfield BY NATURE and are chartered as new modules. **Supersedes Decision 10's "de-risking references" framing (note added at landing: repos are re-typed from references to product). Confidence: high** — reversal condition independently probed and not found.

---

## 2. RULING 2 (Decision 16) — Assembly architecture: a fifth repo, four modules, one command bus DOWN, one event staircase UP, one projector

### 2.1 The topology: `nle-app` vendoring three pinned submodules (mock ported, not vendored)

```
nle-app (NEW — the assembly repo, the only greenfield surface)
├─ vendor/opencut-timeline   @ pinned SHA   (editing core + timeline UI)
├─ vendor/nle-engine         @ pinned SHA   (runtime core; its own nested OT/WDC
│                                            pins stay UN-MATERIALIZED here —
│                                            non-recursive submodule update)
├─ vendor/web-daw-core       @ pinned SHA   (audio core)
└─ src/
   ├─ shell/       chrome PORTED from ui-mock (Toolbar2/dock/status/toasts/dialogs/
   │               context-menu primitive + tokens + shell-* testids)
   ├─ state/       app Zustand: view-state slice ONLY (near-verbatim transfer +
   │               float-seconds→MediaTime conversion at the boundary) — doc reads
   │               are selectors over core.getScene() refreshed by core.subscribe()
   ├─ commands/    the EngineCommand bus (§2.3)
   ├─ events/      the EngineEvent up-staircase (§2.3bis)
   ├─ projector/   THIN call site — the projector itself lives in the ENGINE (§2.2)
   ├─ media/       import/registry/probe (MediaRecord per 09; MediaLookup → OT)
   ├─ persistence/ ProjectJSON ↔ per-scene OT toJSON/fromJSON + engine settings
   └─ pages/       Edit / Color / Deliver + /dev/view-fixture (§3.2)
```

**Dev-loop (the PR2-verified core bet):** OT's view layer imports only `react` + `@/lib/timeline` + relative paths (the single `next` import in OT src/ is type-only, in the fixture layout.tsx) — **TimelineView renders under plain Vite + React 19**. Engine `src/lib/nle` has zero react/next imports; WGSL is inline; the SoundTouch worklet is Blob-URL; mediabunny is lazy-imported (code-split). The app's build obligations: install zod+mediabunny (exact engine pin 1.50.8), alias two import names, copy WDC's 3 worklet files to `public/worklets/` (a correctness requirement in disguise — a missing worklet fails silently to unity-passthrough). **The concrete tsconfig + vite alias config is REVIEW-R15-EXEC §2.2 — adopted verbatim as the A0 artifact** (insertion-ordered regex aliases; `@/lib/daw`, `@/lib/timeline`, `@/components/timeline` reserved as vendored namespaces; app config adopts the engine's `noImplicitAny:false/allowJs` strictness — per-directory compilerOptions don't exist in one TS program; each module keeps its stricter gate in its own CI; one TS major decided by the week-(-1) spike; `resolve.dedupe` + never-install-inside-vendor rules). HMR across vendored source works (submodule dirs are inside project root) but is UNPROVEN — the A0 exit gate includes a live HMR round-trip on a vendored file.

**CSS law:** OT's `globals.css` imports FIRST, app/Tailwind SECOND (import-graph order); 3-5 screenshot-parity rows in S3 pin the timeline region against OT's own `/view` renders (token namespaces are disjoint — verified; the risk is preflight/cascade drift, not collisions). Ask OT for the additive `view.css`/`runner.css` split (~600 dead runner lines otherwise).

**Why a fifth repo, not graft-onto-engine:** the engine's 52 layer-fences forbid app→everything edges inside its repo; spec-00 §4 mandates Vite (engine's Next runner is internal harness); the M1.6/D8 precedent — integration code lives with the consumer. **What the app does NOT contain: DSP, timeline semantics (the projector is engine-home, §2.2), WGSL, codecs.**

### 2.1bis Alternatives weighed (the honest table)

| | Fifth repo + submodules (CHOSEN) | Workspace monorepo (apps/web + packages/{engine,timeline,audio}) | npm packages |
|---|---|---|---|
| Cross-repo change latency | pin-bump ritual (same-day rule; integration owner) | **atomic (same commit)** | version+publish cycle |
| Seals / review cadences | **preserved per-repo** | migrate all four CI configs + ledgers + histories | packaging work ×3 |
| HEAD-follow isolation (bad module commit can't break app until pinned) | **yes** | no (main tracks everything) | yes (semver) |
| Double-vendoring | lockset rule needed (§2.5) | **dissolved (one copy)** | dissolved |
| PAT submodule CI machinery | needed (engine ci.yml recipe, proven) | **not needed** | registry auth instead |
| Toolchain heterogeneity | **each repo keeps its own** | must unify (Next harness vs Vite app vs serial-vitest WDC) | must unify per package |
| Effort to adopt now | **~zero (engine pattern generalized)** | a migration project on sealed repos | packaging ×3 + versioning discipline |

**Ruling:** submodules at 1-2 devs — the seals' momentum, the proven engine CI recipe, and HEAD-follow isolation outweigh the monorepo's atomicity. **Escape hatches recorded:** (a) if pin-bump friction proves >1 day median or the team grows past ~4, re-weigh the monorepo (this table is the decision record); (b) npm packaging per module when a second consumer appears (WDC's `exports` field is already package-ready).

### 2.2 The projector — ENGINE-HOME (amended per PR1 CRITICAL-1)

**Home: `nle-engine/src/lib/nle/projector/`** — a fenced, additive engine module (D9's additive-change rule; same-commit freeze-list update), importing SceneTracks **TYPE-ONLY** exactly per the existing precedent (`bridge/scene-to-segments.ts:43` — zero runtime dep on OT). The app's `src/projector/` shrinks to a call site.

**Why engine-home (three reasons, per the review):** (1) the projector owns rate/timebase reconciliation, transition-window translation, keyframe normalization, composition mapping — that IS timeline semantics; app-home would create the third timeline-semantics home D12 eliminated; (2) the engine's post-convergence consumers re-point IN-REPO (headless adapter's 19 ops, `editProject` serialization, export orchestrator `buildTimelineData`, Player `syncTimeline` player.ts:3092, persistence `NLE_SCHEMA_VERSION 2`, the 265-row browser runner, 7 engine vitest suites — app-home would orphan ALL of them behind a cross-repo import); (3) the C8/C9 retire-at-gate precedent (AudioMixer) was in-repo code replaced by in-repo code gated in-repo — engine-home makes the analogy actually apply.

**Contract:** `projectScene(scene: SceneTracks, ctx) → engine ingestion` feeding render + the audio path (which already consumes SceneTracks-shaped structure via `opencutSceneToAudioSources`) + export. ONE-WAY by law (D12): **editing state** never flows engine→OT.

**Retirement, re-scoped honestly (the full consumer census):** the engine `Timeline` class (8.9k LOC) is the parity ORACLE while the projector matures; parity gates run in **engine CI** (its 8-min WebGPU milestone venue + vitest) on a shared fixture corpus. "Retirement" = every consumer re-points to projector-ingested structures + the wire re-points — at that point the class becomes the engine's **permanent internal test substrate** (its 265-row runner keeps driving it) unless a later engine-side decision deletes it. Deletion is an engine-internal call, not an app-round promise.

### 2.3 The command bus (spec 15 becomes real, by reconciliation)

**DOWN-staircase only.** Three surfaces become one union at the app layer:

1. **Editing commands** → OT headless API (`apply()` never-throws, `CommandResult{ok,code,data}` envelope — `api.ts:127-165`; already the spec-15 shape). C7 rename: 24 prefixed names → bare spec-15 types (bounded mechanical change; the M29 parade + 13 real-mouse scripts are the regression net; OT's own documented pending deviation, DECISIONS #9). **Spec-side precondition: refresh 15 §13.15 to the 24-command reality FIRST** (it still lists the 18-era worklist). Error envelope: the bus adopts OT's 5-code set now; the ~24-code refinement queues as a spec-15 §6.3 amendment (not an A2 blocker).
2. **Op-family commands** → **ported INTO OT's engine layer** (algorithms from the engine Timeline class, tests carried, W8-f/W9 panel re-convened for the wave — book it early). Wave 1: slip/slide/roll/rateStretch. Wave 2 (retime/freezeFrame/rangeRemoval): phase A2.5.
3. **Service commands** (render/export/project/scene/media) → engine. The engine gets a THIN union-typed façade (additive; D9). **Supersession made explicit (amended per PR1 M4): Decision 12.2/C2 amended — the engine's JSON-RPC+$ref surface is re-typed as INTERNAL transport (headless/cloud venue); the 78-union contract is enforced at the app bus and the engine façade; the "retire JSON-RPC" clause of D12.2 is superseded by this re-typing** (headless/cloud consumers speak the union façade long-term — spec 11 gets one answer).

**Routing-disposition table (NEW, per PR1 M2 — normative, lives in spec 15 §4.1A at landing):** one row per spec-15 union member, home ∈ {OT, engine, app, DEFERRED}. DEFERRED members (≈20+: effects/masks/transitions/clipboard ×15, markers ×3 project-level, tool/selection-controller trio, setRate/setLoop, solo/lock toggles, wave-2 ops until A2.5) dispatch to a typed `NOT_IMPLEMENTED` CommandResult code (registered as a spec-15 §6.3 amendment) — the exhaustive-switch check compiles AND is honest. The table is battery-checked (S5): implemented rows must cite a module pin SHA; DEFERRED rows must cite a phase or a user-signed deferral.

**Union versioning:** spec 15 §15.1's `ProtocolVersion` envelope rides the bus from day 1; the version constant lives in the app's commands module and is bumped only with union membership changes.

### 2.3bis The event staircase UP (NEW, per PR1 MAJOR-1 — the architecture's missing half)

**The law, re-scoped to the right layer:** *editing state* never flows engine→OT (D12). *Telemetry* flows one-way UP through a separate seam — exactly as engine D8's own data-contract clause already rules (waveform peaks, metering, transport/playhead state route upward as DATA, DECISIONS.md:335-338).

**`nle-app/src/events/`** normalizes the three event models into one stream shaped like spec-15 §9's `EngineEvent`:
- **Player emitter** (`framechange/timeupdate/statechange/ratechange/seeked/ended/error`, player.ts:587-608) → `playbackTimeUpdate`/playback-state events. **Playhead ownership ruling:** during playback the engine Clock is truth; time mirrors into the view via the **imperative playhead API** (NOT `core.seek` — that fires `subscribe` → full React re-render per frame); commit time into the OT core on pause/scrub.
- **Export progress** (`onProgress: NleRenderProgress`, orchestrator.ts:111) → `renderProgress`/`exportJob*`; feeds the mock-proven Deliver queue states.
- **Meters** (`masterAnalyser`/`masterMeter`, realtime-engine.ts:44-58) → a polled meter contract feeding the mixer strips (the one polling loop in the app).
- **OT `core.subscribe()`** (preview-layered readouts) → scene-state snapshot events for the app store's selectors.
- **Waveform peaks:** engine/virtual-media PCM → `computeWaveformPeaks` input shape via the app's MediaLookup (the D8 data contract made concrete).
- **Mapping discipline:** engine-name↔spec-name mapping is a C-register row (same discipline as C7); event-completeness + mapping are S1/S2 rows.

### 2.4 Multi-scene = app-level (OT stays single-scene, stays sealed)

App holds `scenes[]` + the 4 scene wire ops; ONE `TimelineCore` per scene (state-isolated by construction, `toJSON`/`fromJSON` per scene, timeline-core.ts:1769/1773); `TimelineView` mounts the active core; the projector projects active-or-all. **Sub-gates added (per PR1 m3):** (a) cross-scene undo ruling: per-core undo NEVER crosses a scene switch (registered UX law, mock-consistent); (b) history budget: inactive cores cap/evict history beyond a memory budget (A5 test); (c) markers: the project-level marker family is resolved by the A-series amendment (A2: per-scene `Marker` absorbs Bookmark — spec 09 amended), so no project-level marker surface remains unowned.

### 2.5 The pin-lockset protocol (amended per PR1 M3)

**Pins travel as a LOCKSET:** the app's OT/WDC pins must be ≥ the engine pin's SHAs and move only WITH the engine pin (the app compiles vendored engine code against app-level OT/WDC — the compile couples pins regardless of re-export choices). S5 asserts mechanically: parse the engine's `git submodule status` at the app's engine SHA and compare. The app never advances OT/WDC beyond the engine's validated combination without an explicit compat run. **HEAD-follow opens a bump PR** (write-scoped credential, distinct from the read PAT) — never pushes main. Daily integration-owner bump ritual (the one-day rule). The engine's nested vendored pins stay **un-materialized in the app** (non-recursive update); S1's type-identity check catches divergence.

### 2.7 The integration punch list (scout-verified gaps, now costed)

- OT `onViewStateChange` → plumbed as a new `TimelineViewProps` prop (additive OT PR, A3, ~0.5d).
- Test-attr unification: harness-side dual selector (`[data-test=] ∪ [data-testid=]` locator helper) — zero churn in two sealed repos (week-(-1) decision).
- OT real-mouse runner: app wrapper imports the 13 phase modules directly (re-implements the ~80-LOC aggregation; keeps artifacts OUT of the submodule tree); sets BOTH `TIMELINE_VIEW_URL` and `TIMELINE_TEST_VIEW_URL` (m17 vs the other 12 — verified inconsistency) or fixes m17 in OT (one line).
- `shell-viewer-state-empty` testid (mock patch, registers in the C-ledger).
- WDC host obligations 1-12 (SCOUT-C §10): the engine discharges all but worklet-asset serving (copied at A0), transport ownership (via engine Player), OfflineAudioContext-not-in-worker (respected). Root-base-only `/worklets/` path law registered (forecloses sub-path deploys without an upstream WDC change).
- Engine cosmetic folds (next engine commit): layout.tsx "Z.ai Code Scaffold" metadata; "~280 rows" → 265 doc drift.

---

## 3. RULING 3 (Decision 17) — Cross-module verification: four walls, one roof

### 3.1 The principle

Module repos keep their full gates UNDILUTED (engine 3-job CI; OT 423 incl. 120 real-mouse; WDC 721+tsc; mock 596+tsc, local — the mock has no CI and is not required to add one: it is ported at A3 and retires as a repo after A7). The app NEVER re-tests module internals; it tests ONLY the seams and the wired whole.

### 3.2 The app's five suites (the roof) — relabeled per PR2

| Suite | Tier (spec-17 naming) | What it pins | Size (corrected) |
|---|---|---|---|
| **S1 seam contracts** | Tier-1 (vitest) | Projector laws (per 00 D12.1 + 14 §2.1 + SCOUT-A §4): timebase round-trips, transition-window translation, keyframe normalization; one-wayness of EDITING state (telemetry excluded — §2.3bis); bus routing completeness (every union member → one home or typed NOT_IMPLEMENTED); event-completeness + mapping; S/G/E trackId-only invariant | ~100-140 |
| **S2 state WYSIWYG** | Tier-1 (vitest) | Every UI path (store action → bus) vs direct `apply()` → identical state; undo/redo via wire == via store; **event-suite rows (playhead mirror, progress, meters)**; scene-switch preservation | ~80-120 |
| **S3 wired shell** | Tier-3 (Playwright, real mouse) | (a) **View-component verification in app context:** OT's 120 real-mouse phases re-run against the app-owned `/dev/view-fixture` page replicating the `__VIEW_TEST__` contract (catches CSS cascade/preflight drift, alias breakage, React-version issues — NOT app-path integration); (b) **~200 mock view-state/chrome tests ported near-verbatim** (panel toggles, toasts, dialogs, geometry, keymap mirror); (c) **spec 18 §12 command-capture suite (~60)** — THE app-path integration surface (replaces the mock's doc-slice tests, which do not survive the store swap); (d) 3-5 screenshot-parity rows (timeline region vs OT /view) | ~380-440 total |
| **S4 render/audio parity** | Tier-2 (Xvfb+SwiftShader per engine law — measured at A0, not asserted) | Projector parity (vs engine-native Timeline oracle, pixel-exact on the corpus); audio: offline parity + realtime behavioral pins (A4-v1); the true realtime-vs-offline NULL gate is net-new rig work (A4-v2 — CR-A #6 blocks the cheap route); export smoke (m24/m26/m28/m29 patterns) | ~30-50 |
| **S5 spec-conformance battery** | mechanical | App-layer extension of `battery_r9.py`: routing-disposition table check; testid census; keymap ledger; **pin-lockset assertion**; gap-register freshness (every row cites a pin SHA) | ~35 checks |

**CI composition:** fast lane (push) = materialize 3 submodules (engine ci.yml:39-53 recipe, `persist-credentials:false` + `::add-mask::`) + tsc (~90k vendored LOC ≈ 1-2 min — measured at A0) + S1+S2+S5 (<5 min target, measured). PR + nightly = +S3. Nightly = +S4 (engine's Xvfb:99 + `--use-webgpu-adapter=swiftshader --enable-unsafe-swiftshader --use-vulkan=swiftshader` Chromium recipe, copied verbatim) + **HEAD-follow bump PR**. PAT runbook written before first rotation (read PAT spans 3 repos).

### 3.3 The regression-continuity law

Every behavior pinned in a module test that assembly REWIRES must appear in the app's suites BEFORE the rewire lands (port-then-swap, never swap-then-hope; OT's pin-proven-to-fail law applied to assembly).

### 3.4 The execution plan (PR2-corrected calendar — fresh-senior calibrated, author-calibrated numbers retired)

| Phase | Deliverable | Exit gate | Est. (wk) |
|---|---|---|---|
| **week −1 pre-flight** | The 12-item list (REVIEW-R15-EXEC §7): TS one-compiler spike + Vite HMR spike (both GATES), alias strategy, dual-selector, error envelope, state-boundary contract, C7 direction, PAT+CI dry-run, FCPXML parser choice, S4 venue calibration, SCOUT docs as onboarding, reviewer-panel booking | both spikes green | 0.5-1 |
| **A0 scaffold** | Repo + submodules + the §2.2 config + CI skeleton + worklet copy + CSS order + battery S5 v0 | tsc clean; **TimelineView renders in-app + HMR round-trip on a vendored file**; fast lane measured | 1 |
| **A1 projector v1** | ENGINE-repo module: SceneTracks→ingestion translator + parity corpus + S4 parity; Timeline = oracle | parity green (audio + stills) on corpus; S1 projector laws; engine CI green; app pin bump | 4-5 |
| **A2 bus + renames** | C7 (0.5-1); engine union façade + dispatch tests (~1); op-port wave 1 (3-4: 4 families × OT invariant system + carried tests + peer round); 15 §13.15 refresh + routing table (0.5) | S1 dispatch-complete + NOT_IMPLEMENTED honest; OT 423 + new op tests green | 5-6 |
| **A2.5 op wave 2** | retime/freezeFrame/rangeRemoval ports (+ OT model extensions if spec'd) | carried tests green; pin bump | 1.5-2 |
| **A3 shell assembly** | Chrome port + store swap (2-3); view mount + mediaLookup + onViewStateChange patch (0.5-1); player/export e2e wiring (1.5-2); `/dev/view-fixture` (0.5-1) | S2+S3(a-c) green; **demo: import(virtual)→cut→play→export mp4** | 5-6 |
| **A4-v1 audio surface** | M2 mixer G-wiring (mock mixer UI → engine `MixerTrackSettings` → strips); offline parity + behavioral realtime pins | mixer params audible + parity; S4 rows | 1-2 |
| **A4-v2 null gate** | The realtime-vs-offline e2e null rig (net-new) | null test green | ~1 (later, parallel) |
| **A5 project + scenes** | ProjectJSON persistence, multi-scene, scene wire ops, history-budget law | S2 scene suite; round-trip | 1.5-2 |
| **A6 FCPXML** | Spec-10 module (pure greenfield — zero engine refs; parser+fixture corpus chosen at week −1) | validates vs reference parser; deliver e2e | 2-3 |
| **A7a app polish** | Keymap long tail (C22), i18n posture, a11y residuals | spec 18 §11 audit; battery green | 1-1.5 |
| **A7b engine P2 surfacing** | Scopes (~1), secondary qualifier + power window (~1-1.5) — ENGINE-repo items under engine gates, app pin bumps, slips independently | milestones green | 2-2.5 |

**Totals (honest, per PR2 §5): A7-complete ≈ 22-27 wk solo / ≈ 13-16 wk two-dev. The A3 DEMO lands ≈ 11-13 wk solo / ≈ 7-8 wk two-dev.** Two-dev decay after A3 is real (A4→A6 chain is one front; second dev takes A7b/engine backlogs). A3's exit gate is serially gated on A1+A2 (only the chrome port parallelizes); the projector is single-context work (one head holding both data models). The 8-13 wk R9 estimate is superseded (it under-counted assembly + multi-scene + FCPXML + review latency).

**Milestone discipline:** every phase = module PRs merged + pin-lockset bump + app suites green + battery green + push. A3 is the program's demo-ability gate.

### 3.5 Risk register (top 6)

1. **Projector fidelity** → engine-home parity corpus + oracle + re-typed retirement (§2.2).
2. **Op-port semantic drift** (engine semantics × OT invariant system) → carried tests + re-convened W8-f/W9 panel (booked at week −1).
3. **Pin-lockset divergence** → S5 mechanical assertion + HEAD-follow bump PRs + compat runs.
4. **CSS/preflight drift over the vendored view** → import-order law + screenshot-parity rows + OT css split request.
5. **Fixture-contract drift** (the /dev/view-fixture must track OT's /view contract) → nightly HEAD-follow catches; fixture maintained, not assumed free.
6. **TS-major/strictness reconciliation** → week-(-1) spike gate; engine's settings adopted app-wide; module CI keeps strict gates.

---

## 4. Spec impact map (what lands in the canon THIS round)

| Doc | Change |
|---|---|
| 00-master | NEW Decisions 15 (evolve-in-place; D10 supersession note: repos re-typed from references to product), 16 (assembly: app repo, submodules+lockset, ENGINE-home projector, bus+events two-staircase law, multi-scene-app-level, D12.2/C2 JSON-RPC re-typing supersession), 17 (roof-test strategy); position statement → five-repo topology |
| 14-implementation | REWRITTEN as the assembly plan: posture table replaced by §3.4 (week−1 + A0-A7b); the gap register becomes the normative worklist (per-domain tables citing module pins) |
| 19-code-references | Re-baseline all four repos @ R15 SHAs + SCOUT corrections (engine 52k LOC; 265 rows; OT 24 commands; JSON-RPC restated; pin distances) |
| 15-wire-protocol | §4.1A routing-disposition table NEW (78 rows); §6.3 `NOT_IMPLEMENTED` code + error-code refinement note; §13.15 worklist refreshed to 24-command reality + C7 execution chartered; §9 event mapping (engine-name↔spec-name register); §15.1 versioning-at-bus note |
| 05-timeline | §16.5 amended (projector clauses: engine-home, retirement-as-substrate, parity corpus); op-port table (families → OT wave 1/2) |
| 17-test-plan | Roof-suite table (S1-S5, corrected labels/sizes) + CI composition + regression-continuity law + Tier naming |
| 09-project-model | Multi-scene = app-level ruling; N1 container ruling (inline elements); A2/A3/A4/B1/B2/N3 amendments (per SPEC-REVISION-CANDIDATES) |
| 20-audio | M2 re-scoped as app A4; stale §6.2/§12.4 rows corrected; G-surface wiring contract (mock mixer intent → engine MixerTrackSettings) |
| SPEC-REVISION-CANDIDATES | A/N/B processed into amendments (the seal push); C-ledger continues (now deviations vs the APP — the mock remains the UX review surface through A7) |
| 18-ui-shell | A-series + N-series amendments land (delete-chords A1, effects-panel N9, viewer ladder C7-class, §4.2/§4.3 gesture B4, testid census incl. shell-viewer-state-empty); annotakit chartered as the APP's review loop (a config change, not a port) |

## 5. Explicit non-goals

Real-media import (D6 until forced); cloud P6 (re-charter separately); the mock's post-A7 retirement question; npm packaging (escape hatch, §2.1bis); OT W8-f graph editor + engine P2/P3 backlog beyond A7b surfacing.
