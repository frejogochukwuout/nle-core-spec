# 18 — UI Shell: Application Layout, Panels & Interaction Contracts (DaVinci-derived, simplified)

**Stream:** UI shell / application chrome
**Status:** v1.7 (Round 25 — the ARCH-R25 amendment fleet (`audits/ARCH-R25-edit-mode-completeness.md`): §9 gains the 8 edit-mode grammar semantic tokens VERBATIM from the fleet's visual-grammar report (D33.1's theme half — mock-derived values, each row citing its mock element; the structural half lands as 05 §8A per the D25.3 tokens-here-geometry-there law); §5A gains the cursor-layering ruling (D33.1 — the 16 CSS rows stay the hover/hit law, the bracket glyphs render only inside active gestures, the slip-high/slide-low posture is the slip-vs-slide tell); §4.3 gains the source-mode chrome contract (D35.4 — the SourceEditBar's 7 one-shot modes + the SourceRangeBar's source in/out marks: surface state, feeding 06 §5.9's 3-point ops as caller-supplied params); §4.8 gains the deliver range-band contract (D35.4 — the R23 W-F surface: the loop-seam three-writer law + the band grammar); §0 re-pinned at the R25 fleet HEADs; the 3-vs-5-page divergence registered OPEN (D35.4 — a future design round's call, NOT this round's; §4.8's three-page ruling untouched). v1.6 (Round 24 — the per-file audit fleet's re-verify at the R24 pin world: the BASE re-pinned to the fleet's R24 HEADs (nle-ui `85dcf57`/648 → `fc4cc35`/**674** — the D29 seam waves promoted to BASE: W2.3 `saveState`, W2.4 `exportRequest`, W2.5 the grade sidecar, the R8-REV retryJob blob-URL revoke, the fourth AppShell slot; app `70e99f0`/117 → `c885ece`/**174** with the R8 real-wiring waves; OT `222532c`/489 → `ded43c4`/**536**, code pin `c15a629`); the §0 fork row re-based per ARCH-R24 D26 — the timeline port is now a census-governed CONVERGING MIRROR (the D25.2 mechanism retired); the OT S-round queue row flipped to BASE (P-widen + P-lock-route both landed in the package); the three-way DOM-structural mapping row landed (D26.5/D29.3 — OT `data-test=` 68 / nle-ui `shell-*` 70 / the D25.3b structural-gap worklist + the mini census mapping); the C0 MiniShell row re-pinned NOT-STARTED with the FILING-GAP note (no C0 row in nle-ui's own PLAN — D27) + the cross-repo queue-protocol rows (the DECISIONS ledger ends at D28; the D30 W-D package-edit queue filed app-side only); the C/W/R phase tags stripped to the D24 set — the dual-tag window closed at this fleet). v1.5 (Round 23 — the per-file audit fleet's re-verify against the live repos: the BASE re-pinned to the R23 HEADs (variants 1,334 → 1,521+ [1,542 at the W-F wrap]; nle-ui `dba8d52`/640 → `85dcf57`/648 with the F3/F7 real-gain laws + the kind-aware mute-all pin; app `e662759`/83 → `70e99f0`/117 with the W3 JKL seam); the GAP register re-keyed per ARCH-R23 D24/D25 (C0 → w1-prep/S-package; the grammar split's TOKEN half → w1, STRUCTURAL half → crawl-tail; C1(b-f)+C2-behavior → K3; C4 → K4 + w1-entry; R-polish → r5; W-color → r3; W-ops keymaps → r1; the mock retirement triggers → post-K4/w1); the retired spec-14 §4.4/§4.6 shell rows re-homed into §0 (the OT S-round queue; the W-ops keymap surfaces; the retirement triggers); §16.3 re-pointed at `IMPLEMENTATION-PLAN.md` (spec 14 retired to the stub, D23); the R23 seal artifacts (CORE-SEAMS 26 seams / LAW-NET-INVENTORY census) reflected in §0/§13/§16. v1.4 (Round 22 — the finality round: the §0 forward inventory + the R22 drag-law notice in §16.2 + the MVP-vehicle re-pointing in §16.3; v1.3 Round 19 amendment: §16 designates ui-mock/shell-mini the first shippable MVP — OT-seam-tracked ops, embedding contract, R18e→R19 iterated feature inventory folded per explicit user directive; v1.2 Round 15 amendment pass — A1/A5/B2/B4/N2/N3/N4/N5/N6/N7/N9/N10/N12-class resolutions + testid census + annotakit-for-app charter, per `.agents/SPEC-REVISION-CANDIDATES.md` + ARCH-R15 §4; v1.1 Round 8 — cloudcut UX-spec integration: per-panel state rows, context menus §4.9, pointer/cursor grammar §5A, error & notification UX §6.4, visual-language deepening §9, a11y floor §11, UX-scope code references §13; ours-wins policy applied to all 25 contradictions, SCOUT-R8-C §3)
**Date:** 2026-09-02 (v1.0 Round 7; v1.3 2026-09-06; v1.5 2026-09-07 — the R23 fleet re-verify; v1.6 2026-09-08 — the R24 fleet re-verify; v1.7 2026-09-09 — the R25 fleet amendment)
**Spec file:** `18-ui-shell.md`
**Consumers:** Implementation team (UI layer), spec 05 (timeline internals), spec 16 (keyboard bindings), spec 15 (command dispatch), spec 17 (Tier 3 UI tests)
**UX source material:** cloudcut-nle `ux-spec` branch v1.3.5 (28 files — the prior iteration's app-layer UX spec; integrated Round 8 per the ours-wins contradiction policy; the cloudcut-nle main branch is the UX/app-scope reference codebase, §13)

---

## 0. FORWARD INVENTORY (R22 posture — what needs to be done; the BASE is accepted, not re-explained)

**BASE (accepted, pinned 2026-09-07; re-verified + re-pinned 2026-09-08 at the R24 fleet; re-verified 2026-09-09 at the R25 fleet — nle-ui `3026099` [674/674 + mini 355/355; 6 shell/keymap/docs commits, the timeline gesture surface byte-identical to R24], app `64fb0ab` [206/206, the D30 program landed], OT `fdb771c` [src ≡ `c15a629`], engine `3989506` [one docs-only commit], WDC `85b81b0` — the pins per ARCH-R25 §1):**
- The full-shell DESIGN (§3-§15): region geometry, panel inventory, gesture→command contracts, state rows, a11y floor — the design of record, validated in `ui-mock/shell-variants` (1,521+ tests — 1,542 at the R23 W-F wrap: the W-A FX surface + the W-B color wave + the W-C/D/E polish waves + the W-F deliver view; real color math, W4 real pipelines; the **VLM visual net** `scripts/vlm-capture.mjs`/`vlm-review.mjs`/`vlm-run.sh` — the walk/run design reference) and PRODUCTIZED as the `nle-ui` package (`fc4cc35`; consumer pin re-read live: the app's `vendor/nle-ui` @ `fc4cc35`; **674 tests** — 674/674 RUN LIVE at the R24 module card, 37 files, 74 stories; engine-free, boundary-script-gated; **F3/F7 the real-gain laws** — the clip-gain slider (ChannelEditor) and the Inspector's Gain both write the true dB law over `el.volume` [display 20·log10, commit 10^(dB/20) clamped ≥ 0.001 — exactly §4.4's B2 display-side-dB law] + the kind-aware mute-all convergence pin; the §10 `shell-*` testid family emitting — 70 sites / 62 distinct names [55 static + 7 templated families] across 22 non-test component files, live-counted; **the four AppShell prop seams** — `timelineRegion`/`mediaDragSource`/`programMonitor`/`exportRequest` (each absent = the honest mock world verbatim); **the D29 seam waves (R8/D29 — W2.3/W2.4/W2.5 + R8-REV #1)**: **W2.3** — the store's `saveState` `'idle'|'dirty'|'saving'|'saved'` + `setSaveState` (view-state, plain set, NEVER a history entry; the `'idle'` default IS the mock-world discriminator — the package never writes non-idle) driving the ⌘S real-dirty gate (`dirty`/`saving` = unsaved; the idle-world fallback `past.length>0 || saveAttempt>0`), the beforeunload guard (arms on dirty/saving), and StatusStrip's dual-world machine (service world = the "Unsaved changes" chip + the real Saved stamp; idle keeps the 600ms theater + the simulateSaveFail drill verbatim); **W2.4** — the DeliverPage `exportRequest` engine-free contract (4 shape types — `DeliverSettings`/`NleRenderProgressLike`/`DeliverEffectiveSettings`/`DeliverExportResult` — + the request fn; 5 TYPE-ONLY barrel exports; present-world job rows queued→running[progress+stage]→done/cancelled[AbortError distinct]/failed + the warnings badge + Reveal[the blob URL] + Retry[the same settings in place]; absent = the honest mock world verbatim; fcpxml stays mock in BOTH worlds); **W2.5** — the per-scene color-grade sidecar `color: Record<sceneId, SceneGrade>` + `setGrade` (the neutral-seeded partial-merge law, a new record ref per write — view state, never in SceneJSON) + the ColorPage Contrast/Saturation sliders LIVE store-driven (Pivot + Qualifier-hue honest-LOCAL; brightness/hue contract-complete but slider-less v1; LUT/wheels stay mock); **R8-REV #1** — `retryJob` revokes the previous run's blob URL before clearing it (tens of MB per 1080p master per retry); + the OT S-round queue LANDED (P-widen — the router `patch` member carries `transitionOut` [+ `speed`, the D28/T-round widening]; P-lock-route — `toggleTrackCmd('locked')` routes via `toggleTrackLock`, the engine lock the SSOT; the package's own PLAN rows are landed-but-unticked filing debt).
- The mini DESIGN + law register (§16, `ui-mock/shell-mini` @ 355 tests — 333 at the R22 retirement, +10 review-loop nets, +12 R23 seal + fix-round nets; the R23 seal artifacts: `docs/CORE-SEAMS.md` [the 26-seam whole-surface audit — §E S22-S26 the chrome/view seams, the 5-class store partition, the C0-C4 transport map, the audited-absent register] + `docs/LAW-NET-INVENTORY.md` [128 census units / 355 tests — 33 HOLDS / 322 authored; Part B the chrome-side corpus: App 60 / MediaPool 19 / timecode 8 / waveform 7 / otProject 12; the testid census 60 static (59 app-emitted) + 15 templated] + the OT-SEAMS seam map + `RH-skin-extraction.md`; annotakit live review surface).
- The app assembly skeleton: `AppShell` + the **four prop seams** (`timelineRegion`/`mediaDragSource`/`programMonitor`/`exportRequest` — the W2.4 deliver seam wired to the app's `deliverService.exportRequest`) + ProgramCanvas (engine N1 — the effects filter-string preview + the per-scene grade final pass) + the OT-tree `EngineMount` wired in `nle-test-app` @ `c885ece` (**174 tests** — the R24 static census: GluedShell 70 + audioService 40 + sceneBridge 25 + persistence 17 + deliverService 15 + engineSeam 7; the GluedShell assembly; the W3 JKL transport seam — `setPlaybackRate` routed through the timelineRouter, ⇧J/⇧L yielding to the port's keymap; RR1-B; the R8 real-wiring waves — persistenceService [2s-debounce localStorage autosave keyed on state identity incl. the grade sidecar; boot hydrate; ⌘S/beforeunload], the W2.1 ducking DSP, the mediabunny deliver pipeline, the W2.5 effects/grade preview). The timeline port is a **CONVERGING MIRROR of OT's canonical `src/components/timeline/` tree (40 files) under the census discipline (D26 — amends D25.2's mechanism; the D25.1 canon + gold sample stand)**: 40 port files = 39 mirrors of OT's 40 component files (`use-wire-dispatch` pending D30's W-C) + the `EngineMount.tsx` host; **7 byte-exact + 25 mechanical-exact** (the `@/lib/timeline`↔`@vendor/timeline` specifier only) = **32 zero-action** + **7 documented carriers** (5 pending the D30 W-C/W-D adoptions + the 2 port-local keeps: TimelineContextMenu's functional `setPos`, use-playback-ticker); the `vendor/nle-timeline` lock-copy @ `c15a629` byte-exact minus `testing/` (live-verified); fork retirement = the D30-declared irreducible carrier set, tracked by the census — a carrier without a divergence rationale is a census violation. The honest-mock ledger (marked honest in both worlds, per the module cards): the ColorPage LUT select + 4 wheels (display-only); the fcpxml preset (toast, no row); Inspector Pan/Transform/preserve-pitch (mock-local); the ColorPage brightness/hue sliders (contract-complete, slider-less v1); the compact 8-effect mock library (click = honest toast); the StatusStrip idle theater + the hardcoded `OPFS · local` label; the fixture deliver rows j-0..j-3.
- **The R25 edit-mode surface law (v1.7 — register adoption per ARCH-R25 D35.4, doc-level, not new design):** §9's 8 grammar tokens (D33.1 — the theme half of the visual-grammar register; 05 §8A owns the structural half), §5A's cursor-layering ruling (D33.1), §4.3's source-mode chrome contract (the SourceEditBar + SourceRangeBar rows — D35.4), and §4.8's deliver range-band contract (the R23 W-F surface — D35.4). Reference implementations: the two mode mocks (the per-row reference figures — `ui-mock/trim_edit_modes.html` + `ui-mock/timeline_edit_modes (2).html`) and the variants' components (`SourceEditBar.tsx` 15 pins / `SourceRangeBar.tsx` 8 pins / `RangeBand.tsx` + the TimelineCompact pins — the reference per the fleet's shell-mocks deep-dive). The tokens' landing surface is OT's CSS-variable mechanism (D25.3a — `globals.css` `:root` + `theme.ts`) at r1.

**GAP (the work — owner + phase per the D24 verification ladder [crawl K1-K4 / walk w1-w3 / run r1-r6 — `IMPLEMENTATION-PLAN.md` §2; the old C/W/R dual-tag window CLOSED at the R24 fleet — D24 set only; acceptance in parentheses]):**
- **MiniShell** — the mini chrome family in nle-ui: Topbar/Inspector frame/MediaPool frame/Splitter+R18j laws/Toast role=alert/Viewer frame + tokens/qc- CSS, slots-compatible per CORE-SEAMS S22 (package-owned placeholder state, NO mini-store port, zero engine imports — the boundary script) (owner **S-package, w1-prep** — the plan's first action; rides ∥ crawl — package-level programmatic gates; acceptance: package tests incl. the ported chrome laws + the boundary script + MiniShell renders in the package Storybook). Verified NOT-STARTED @ `fc4cc35` (census: no MiniShell or chrome-family component exists in the package — only the full AppShell family) — **and a FILING GAP** (D27's finding): nle-ui's own `.agents/PLAN.md` carries NO C0/MiniShell row — the spec's expectation that the queue be "filed in nle-ui's PLAN queue" is unmet; the plan's first action includes the package-side filing.
- **The grammar's TOKEN half (D25.3a)** — the mini theme mode on OT's CSS-variable surface (`globals.css` `:root` + the `theme.ts` constants; mechanical theming over OT's existing semantic-class surface) (owner S-ot, **w1-entry** — the ordering law: crawl = structure + behavior, w1 = tokens + fidelity; acceptance: OT's `/view` runner renders the mini skin — THE gold sample, contingent on both grammar halves).
- **The grammar's STRUCTURAL half (D25.3b — instrument re-pointed per D26.5)** — the additive OT-side components: the track-head column, the minimized strip, the compact/pill mode, the tools-row deltas (filmstrip/audiolane/minimize/delete/nudge) (owner S-ot, **crawl-tail** — additive-optional, classic defaults M-pinned; acceptance: the components exist in OT's tree with zero classic-UI change). The R23 "testid-emission convention" clause is RETIRED as the instrument: OT's frozen DOM vocabulary is **`data-test=`** (68 sites / 14 files, live-counted at `c15a629`; ZERO `data-testid`), so the census gap is coverage-of-EXISTING-vocabulary, not a missing vocabulary — OT's queue item is "freeze `data-test` as a stability contract + close the census gaps" (D29.3).
- **K3's three-way DOM-structural mapping (D26.5/D29.3 — REQUIRED)** — timeline units → OT's `data-test=` (the frozen 68-site convention); chrome units → nle-ui's `shell-*` testid family (already emitting: 70 sites / 62 distinct names [55 static + 7 templated] across 22 non-test files, live-counted at `fc4cc35`); no-counterpart units (the track-head column, the minimized strip, the compact mode) → the D25.3b structural-gap worklist above. The mini's 59-static + 15-templated census gets the MAPPING ROW (mini-unit → target vocabulary + name → present/absent/structural-gap) (owner S-app; gates K3's DOM half together with D30's W-C — the ordering law per D26.5, NOT on a swap+testid layer; acceptance: the mapping row authored + the census-gap worklist filed in OT's queue + the `data-test` freeze ask).
- **The crawl app's chrome surfaces — the behavior half** — inspector/pool/topbar/toast/splitter/viewer+transport laws realized engine-wired (**K3**; the LAW-NET-INVENTORY corpus checked row-by-row — 322 authored + 33 projection pins; the DOM-structural gate = the three-way mapping row above + D30's W-C [the ordering law re-stated per D26.5]; the store/policy halves may author ∥ the bridge against the injection-point contracts; K3's routed-verb machine-check = the D30 W-F coverage-gate port — the accumulator ⊇ `WIRE_COMMAND_TYPES` − exceptions [24 routed + 6 at `c15a629`], the shell-path surface excepted with its compensating pin family, D29.1b). The qc- restyle is the TOKEN half above (w1); the viewer FRAME visuals → **w1**. Verified un-started at `c885ece` (zero LAW-NET/e2e hits in the app tree).
- **The mini-parity gate** — the automated e2e (import → cut → play → export, zero mock paths; drives the 24 routed verbs through the real UI, D29.1c) → **K4**; the human side-by-side + the annotakit review-loop config for the app → **w1-entry** (the side-by-side is **app-vs-OT-runner** — two renderings of ONE tree per D25.4, the VLM net pointed at both; not app-vs-mock). Verified un-started at `c885ece`.
- **The cross-repo queue-protocol debt (D27's filing gaps)** — nle-ui's DECISIONS ledger ends at **D28** (D29 lives only as the app-side design doc `nle-test-app/docs/design-r8-d29.md`; D30 never filed package-side, despite HANDOFF's "D22–D29" pointer); the app's D30 W-D package-edit queue — R6 the `r`-key yield-set, Z5 the Inspector video-tab A/V-link toggle, Z7 the StatusStrip truth rows + storage prop, the cheat-sheet dual-world truth rows, the Viewer scrub-row `data-transport` attr, the ColorPage Brightness/Hue sliders — is designed + queued **app-side only** (`design-r9-d30.md:183-186,246-250`), none landed, none filed package-side (owner S-package + S-app, rides the D30 W-D/W-G waves; acceptance: the rows filed in nle-ui's `.agents/PLAN.md` + a DECISIONS D30 entry). The OT S-round queue rows that lived here are **LANDED → BASE** (P-widen + P-lock-route, above).
- **The full-shell chrome gaps** — the keymap long tail (~54 of ~178 rows; C22 ledger), i18n (C12), tooltip dismiss (C11), type-scale deltas (C14), strip badges (C15) (**r5**; spec 17 facet rows; the app-side inventory re-based by the 9-A2 zero-no-op census — 177 controls / 16 no-op / 9 unexpected-dead).
- **The new op families' keymap surfaces in nle-ui** (**r1**; spec 16's keymap rows).
- **The color page's remaining realness** — the LUT/wheels GPU-fidelity path + the monitor↔export grade divergence (the per-scene grade sidecar + the LIVE Contrast/Saturation sliders driving the app's ProgramCanvas final pass LANDED R8/W2.5 — BASE above; the grade-decline is the law: the consumer-side final pass, the engine does not carry the grade — D29.5c; Z2's app-side export fix stands) (**r3**; grade-math parity pins; the variants' R23 W-B color wave is the design reference).
- **The a11y + NFR floor on the APP** (not the mocks): §11 audit + §12 perf budgets (**r5**; enforced by the battery).
- **The mock retirement triggers** — the mini + variants mocks stay alive until the app matches their fidelity (the census discipline per D26.4 — the law text lives in 00-master's standing-laws per D23.2) (**post-K4 / post-w1**).
- **The R25 chrome rows' implementation halves** — the source-mode chrome (§4.3) and the deliver range band (§4.8) are doc-level LAW as of v1.7; their canonical-tree implementations ride the r1 wave-1 op ports for the source-edit family (D33.5's sequencing law — the register precedes the ports, else the grammar forks a fifth time) and the r5 deliver polish for the band (owner S-ot — the D25.1 canonical tree; acceptance: OT's tree renders the grammar rows for the ported modes with computed-style/pixel pins, and the register rows flip LANDED). The **3-vs-5-page dock divergence stays a REGISTERED OPEN DECISION** (D35.4 — the divergence is documented, the resolution is a future design round, not this one; §4.8's three-page ruling is untouched; 16 §0's K3 row carries the ⌘3 key half).

**ACCEPTANCE & TEST PLAN:** spec 17 §13A facet matrix (Tier 3 UI rows) + §14.4 step 0; the mini's law net (LAW-NET-INVENTORY.md — K3's acceptance list: the pre-C1 timeline-law deliverable LANDED at the R23 seal [33 HOLDS-on-OT verified]; the pre-C4 corpus is the K3/K4 re-expression target); the battery's posture checks; the annotakit review loop on the app at w1-entry (the human rounds' review surface).

---

## 0A. TL;DR

This spec defines the application shell — the layout regions, panel inventory, and interaction contracts of the editor UI. It is derived from the DaVinci Resolve layout clone committed at `ui-mock/davinci_resolve_ui_mock.html`, **deliberately simplified** to match our much smaller scope: the menu bar is removed, the inspector is reduced from 6 tabs to 4, and the 7-page dock collapses to 3 pages (Edit / Color / Deliver). Every panel is a thin `EngineCommand` generator over the spec 15 wire protocol — no panel calls a manager method directly, and no panel holds engine state. The timeline area's internals (component hierarchy, virtualization, drag state machines) are owned by spec 05; this spec owns everything that *surrounds* them. **v1.1** integrates the cloudcut UX-spec's applicable material (per-panel state rows, the five context menus, the pointer/cursor grammar, error & notification UX, visual-language depth, the a11y floor, perf budgets) under the ours-wins contradiction policy — every rejection is registered, not silently dropped. **v1.3 (R19)** adds §16: shell-mini is designated the first shippable MVP — the minimal complete editing surface with OT-seam-tracked timeline logic and an embedding contract — landing before the full shell. **v1.5 (R23):** the timeline-UI grammar lands on OT's CANONICAL React tree in two halves (D25 — the token half at w1, the structural half in the crawl window); the app's timeline-port fork retires; the gold sample is OT's `/view` runner at mini theme; the phase vocabulary re-keys per the D24 verification ladder (crawl/walk/run — `IMPLEMENTATION-PLAN.md`). **v1.6 (R24):** ARCH-R24's D26/D27/D29 — the timeline port is a census-governed converging mirror (the D25.2 mechanism retired; the lock-copy byte-exact at `c15a629`); nle-ui's D29 contract seams (saveState, exportRequest, the per-scene grade sidecar) are BASE; K3's DOM gate is the three-way vocabulary map (OT `data-test=` / nle-ui `shell-*` / the structural-gap worklist); nle-ui + the app are role-locked KEEP (D27) with the C0 filing gap registered.

---

## 1. Purpose

The spec set was engine-first for six refinement rounds: 12 stream specs + a wire protocol + a keyboard map + a test plan, with the UI surface represented only by spec 05 (timeline) and the interaction stubs inside spec 16. That left the largest visible surface of the product — the application chrome — unspecified. Two panels could both be "spec-05 compliant" while producing wildly different apps. This spec closes that gap: it fixes the layout regions, the panel inventory, the per-panel contents and behaviors, the gesture→command contracts, the state-binding rules, and the testability hooks, so that the shell can be built once and every other UI-bearing spec (05, 08, 10, 11, 16) can plug into named homes instead of inventing them.

The shell is also the round-7 answer to an under-emphasized aspect of the project. The engine workstream (nle-engine) has proven the engine side is buildable; the shell spec makes the UI side equally concrete, and the mockup gives it a coherent visual identity that professionals will recognize on first contact — a rough-cut editor that *looks and feels* like a desktop NLE, running in a browser tab.

## 2. Derivation & Simplification Principles

### 2.1 The reference mockup

`ui-mock/davinci_resolve_ui_mock.html` (64 KB, 1,455 lines) is an exact-layout clone of DaVinci Resolve's Edit page, committed to this repo as the visual reference. Its structure:

```
#app                          (flex column, max-width 2048, ~1232px tall reference)
├── #menubar                  (30px — REMOVED in our shell, see §8)
├── #toolbar2                 (34px secondary toolbar: panel toggles + project title)
├── #mainbody                 (460px reference height, flex row)
│   ├── [MediaPoolPanel]      (ours: left, toggleable — mock exposes only the toggle button)
│   ├── #viewer-panel         (flex 1: viewer-toolbar, #video-frame, scrub-row, transport-row)
│   └── #inspector-panel      (420px fixed in mock; 340px in ours, simplified)
├── #timeline-toolbar         (34px: tools, snapping, link, lock, markers, zoom, master volume)
├── #timeline-tabs            (26px, JS-populated — maps to our scene tabs)
├── #timeline-area            (flex 1)
│   ├── #track-headers        (160px fixed: big TC readout + per-track headers)
│   └── #timeline-scroll → #timeline-content   (ruler + track lanes + playhead; spec 05)
├── #hscrollbar-row           (14px custom scrollbar — ours: native, deferred)
└── #app-dock                 (42px: brand + page dock + right cluster)
```

The mockup's JS (`buildRuler`, `buildV1Track`, `buildAudioHeaders`, `buildAudioLanes`, `buildTabs`, `wireRSM`, `wireToolbar`, `wireTools`, `wireMagnet`, `wireInspectorTabs`, `wireTransport`, `wireSliders`, `applyZoom`, `wirePageDock`, `wirePlayhead`, `wireHScrollSync`, `wireClock`) demonstrates the intended behaviors in miniature. It is a **visual/layout reference, not a code reference** — nothing in it is meant to be copied into the implementation.

### 2.2 Simplification principles

The mockup clones a professional finishing system; our product is a rough-cut editor with FCPXML handoff (master spec §1). Simplifications follow three rules:

1. **Remove chrome whose only job is discovery of features we don't have** (menu bar, Fusion/Fairlight pages, metadata/index/sound-library panels). Feature access moves to toolbar buttons, keyboard shortcuts (spec 16), and context menus.
2. **Reduce panels whose parameter surface exceeds our data model** (inspector: 6 tabs → 4; only model-backed parameters get controls — spec 09's project model is the ceiling).
3. **Keep everything that carries muscle memory** (transport cluster, tool cluster, track-header S/M/lock, snapping magnet, timeline tabs, dark pro theme). Professionals should be able to sit down and cut.

Every removal is recorded in §8 (Chrome Removal Ledger) with its rationale, so future rounds can revisit deliberately instead of re-deriving from the mockup.

## 3. Layout Architecture

### 3.1 Regions

The shell is a single fixed-docked layout with resizable splitters (no workspace customization, no panel tear-out, no saved layouts in v1):

```
┌──────────────────────────────────────────────────────────────────────┐
│ toolbar2 (34px): panel toggles · project title · viewer/inspector     │
├───────────────┬────────────────────────────────────┬─────────────────┤
│ MediaPool     │ Viewer (flex)                      │ Inspector       │
│ (280px,       │  viewer-toolbar (28px)             │ (340px,         │
│  toggleable)  │  video-frame (WebGPU canvas)       │  toggleable)    │
│               │  scrub-row (12px)                  │  4 tabs         │
│               │  transport-row (32px)              │                 │
├───────────────┴────────────────────────────────────┴─────────────────┤
│ timeline-toolbar (34px): tools · snap · link · lock · markers · zoom │
├──────────────────────────────────────────────────────────────────────┤
│ timeline-tabs (26px): scene tabs + "+"                                │
├──────────────┬───────────────────────────────────────────────────────┤
│ track-headers│ timeline-scroll → timeline-content (spec 05)           │
│ (160px)      │  ruler · track lanes · playhead                        │
├──────────────┴───────────────────────────────────────────────────────┤
│ hscroll / status strip (native scrollbars; 12px status strip)        │
├──────────────────────────────────────────────────────────────────────┤
│ app-dock (42px): brand · page dock (Edit/Color/Deliver) · right      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 Sizing rules

| Rule | Value | Notes |
|---|---|---|
| Minimum window | 1280 × 800 | Below this, show a "window too small" overlay rather than degrade |
| Reference window | 1920 × 1080 | Mockup reference proportions scale from its 2048 × 1232 |
| MediaPool default width | 280px (min 200px) | Toggleable; hidden state remembered in UI prefs only |
| Inspector default width | 340px (min 280px) | Mock uses 420px; we narrow it to fit 4 simplified tabs |
| Track-headers width | 160px fixed | Matches mock; spec 05 §10 note — OpenCut's 112px is the teacher value, 160px is shell-canonical |
| Main body default height | 40% of viewport (min 320px) | Horizontal splitter between main body and timeline area |
| Splitter hit target | 6px visual, 12px interactive | Pointer-friendly; double-click resets to default |

Splitters are the only layout-mutation surface: one horizontal (main body ↔ timeline area) and two vertical (media pool ↔ viewer, viewer ↔ inspector). Panel visibility toggles come from `toolbar2`; their state lives in the UI store (Zustand — spec 00 §4 stack row "State (UI)"), never in engine state.

### 3.3 The viewer canvas mount

The WebGPU canvas mounts inside `#video-frame`'s `.frame-inner` (letterboxed). Its CSS size drives the render descriptor's output dimensions (spec 04 §7.1 `initialize(canvas…)`); device pixel ratio is respected (canvas backing store = CSS size × DPR, clamped to 2× for 4K-safety). The viewer-toolbar's zoom select offers **Fit / 1.5× / 2× / 4×** — magnification multiples of the fit width (Round 15 amendment, C7, replacing the unanchored Fit/50%/100%/200% ladder: the old "percent" semantics had no pixel anchor — the R13 honesty fix documented that the prior mock's "100%" was in fact 2× fit, the exposure this ladder corrects). `Fit` letterbox-fills (1× fit); 1.5×/2×/4× multiply the fit width and overflow-scroll when larger than the frame; zoom changes re-letterbox without changing render resolution except when a multiple overflows the frame (which re-renders at the backing-store size — spec 04 §16.2 cache rules still apply).

## 4. Panel Inventory

Each panel entry below lists: contents, behaviors, engine bindings, and simplifications vs the mock. **Command names reference spec 15 §4's canonical `EngineCommand` union** (78 types after the Round-7 amendment); where a control is a spec-16 UI-layer extension (`(UI)` in spec 16 §12), it routes to the UI store instead of `apply()` — that split is normative and tested (spec 17 §6.1).

### 4.1 toolbar2 — secondary toolbar (`shell-toolbar`)

Left cluster: `Media Pool` toggle (`btn-mediapool`), `Effects` toggle (`btn-effects`) — both panel-visibility toggles routed to the UI store (the Effects panel's contents/contract are §4.11 — Round 15 amendment, N9). The mock's `Index` and `Sound Library` buttons are dropped (§8). Center: project title (read-only; double-click opens project metadata in the Deliver page's project section). Right cluster: `Inspector` toggle (`btn-inspector`, default on), fullscreen-viewer toggle (mock's first icon button). The mock's `Mixer` and `Metadata` buttons are dropped (§8).

### 4.2 MediaPoolPanel (`shell-mediapool`)

The only panel the mockup doesn't draw (it exposes just the toggle) — DaVinci's Edit page slides it over the viewer; we dock it left for stability (rough-cut workflows live in the pool). Contents:

- **Import affordance**: toolbar button + drag-and-drop target + `Cmd+I` (spec 16 §3.1). Import runs the spec 15 §5.4 pre-extraction sequence (`engine.media.probe()` → `persistBlob()` → `generateThumbnail()` → `importMedia` command) — the panel drives the helpers, then issues the pure command.
- **Clip grid/list**: one card per `MediaAsset` (spec 09 §7): thumbnail, name, duration (TC format, spec 03 §4), type badge (V/A), resolution, fps badge when ≠ project fps. List/grid toggle is a UI-store pref. **Sort modes** (v1.1): name / duration / import date / type — ascending + descending, sort state persisted with the view pref; footer shows live counts (`N clips · M:SS total`) — counted from the snapshot, never cached (the reference repo's static footer is our warning case).
- **Search**: text filter over name, 200 ms debounce, clear button; the empty-search result state is a distinct state row (below).
- **Selection & drag**: single-select (click), multi-select (shift/cmd-click). Drag a clip onto a track lane → `insertElement` with `PlacementStrategy` resolved by drop position (spec 06 §5.9 / spec 05 §8.9). **Drag feedback (v1.1)**: drag ghost = thumbnail + name; the cursor flips to `copy` over a valid lane and `not-allowed` over an incompatible lane (audio asset over video track — the placement compatibility table, spec 06 §5.9); the hovered target track highlights its lane background.
- **Double-click**: selects and scrolls the timeline to the first element using that asset (reveal); source-preview playback is deferred (§8.5). (One gesture, one meaning — R15/B4: reveal is the double-click's ONLY meaning; the source-preview triggers live in §4.3.)
- **Context menu**: Reveal in timeline, Rename (`renameMediaAsset` if spec 15 defines it; else asset metadata edit via `updateElements`-class command — final call at seal round), Remove (`removeMediaAsset`), Properties (opens inspector's read-only file info section).
- **Missing-asset error state (v1.1)**: assets whose backing file fails the OPFS existence check render a warning badge + red clip stripe downstream; the relink flow is v2 (no wire command exists — §8.14). Badge text: "Media offline".
- **Metadata display**: bounded to spec 09's `MediaRecord` fields (name, type, duration, resolution, fps, size, importedAt) — no bins, no smart bins (schema change, v2 rejection §8.14). (Round 15 amendment, N3: `importedAt` is ISO 8601 and is ADDED to 09 §3.1's `MediaRecord` by the parallel R15 09-side amendment — this field list anticipated it; `size` stays numeric bytes and the SHELL formats it into display strings ("1.8 GB") for cards and Properties — formatted sizes are never persisted; the import-date sort mode consumes `importedAt`.)
- **A11y**: `listbox`/`option` semantics with `aria-activedescendant` for the focused card; arrow-key navigation moves focus (not selection — Enter/Space selects); the count footer is a `aria-live="polite"` region announcing result-set changes from search/sort.

**State rows (v1.1 — every panel has them; happy-path content above applies only to the ready state):**

| Panel | Empty | Loading | Error / no-result |
|---|---|---|---|
| Media pool | CTA: "Import media" button + drag-drop target + `Cmd+I` hint + "open sample project" (see §4.10) | skeleton pulse rows (grid layout preserved, §9 motion tokens) | search: "No clips match ‘<query>’" + clear-search action; OPFS failure: retry toast + banner |
| Viewer | "No media — import or drop a file" + CTA (mirror of pool CTA; drag-drop target works over the canvas) | first-frame spinner (≤ 2 s, then degraded-renderer banner per spec 00 §5) | decode failure: toast + clip stripe; asset-missing: "Media offline" overlay |
| Timeline (empty scene) | "Drop clips here, or press `Cmd+I`" centered in the lane area | (n/a — snapshot-driven) | (n/a) |
| Inspector | "Nothing to inspect" (mock default) | (n/a) | — |
| Deliver (no clips) | "Timeline is empty — nothing to export" | job-progress rows | failed job row + Retry (§6.4) |

Every state row is testable: `data-testid="shell-<panel>-state-<state>"` (§10). The viewer's family is enumerated in full (Round 15 amendment — testid census): `shell-viewer-state-empty` / `shell-viewer-state-loading` / `shell-viewer-state-error` — `shell-viewer-state-empty` joins the census explicitly (the mock shipped loading/error rows but rendered the empty row without its testid; ARCH-R15 §2.6 registers the mock patch, and Tier-3 empty-state assertions target this id).

### 4.3 ViewerPanel (`shell-viewer`)

- **viewer-toolbar** (28px): zoom select (§3.3), current TC chip (`#viewer-tc-current`, mono font), project fps chip, safe-area toggle (UI pref; overlays are DOM, not GPU — spec 04 §16.5 note).
- **In-canvas overlays (v1.1, DOM over canvas)**: top-left = active clip name + its TC in/out; top-right = resolution + fps chips. Hidden while a tool-drag is active on the timeline (no motion while tracking, §9); toggleable via viewer-toolbar.
- **video-frame**: the WebGPU canvas (spec 04). Letterboxed; degraded-renderer banner (spec 00 §5) renders as a DOM strip under the canvas, not inside it.
- **scrub-row**: playhead scrubber. Input: pointer down + move (throttled to rAF) → `seek` commands (coalesced per spec 05 §8.2's preview-commit pattern); release commits final `seek`. **Richness (v1.1)**: the scrubber renders the in/out + loop range as a shaded band (from `setLoop` state — no dedicated in/out model, spec 16 §3.1 note), clip-boundary ticks (thin marks at element edges from the snapshot), click-to-seek anywhere in the row, and a hover TC tooltip. Distinct icons for jump-start vs step-back (a common reference-repo conflation). **Inverted-window handling (Round 15 amendment, N5):** an inverted window (start > end) renders the band EMPTY and playback ignores it (no loop, no hang) — the scrubber itself cannot create one (dragging a half past the other moves the far half, the mock's R14 inversion law), and if corrupt state ever produces one it is displayed-and-skipped, never fatal; cross-ref 15 §13.15's N5 row (the invariant lives there — §4.3.29 was never amended; end > start validated / halves swapped).
- **transport-row** (32px): center cluster = step-back, play/pause (`btn-play` → `play`/`pause`), step-fwd, jump-start, jump-end; right cluster = loop (`btn-loop` → `setLoop`), mark-in `I`, mark-out `O` (→ `setLoop` start/end halves — no dedicated in/out-point commands, spec 16 §3.1 note (citation corrected R15, N12 — the note lives in §3.1, not §3.4; 05 §11.2's dedicated in/out model is retired by that resolution); spec 03 §3.4 is the playback-side consumer), add-marker `M` (→ `addMarker` + color from a compact palette). Keyboard parity is total (spec 16 §3.4-3.7) — the buttons exist for discoverability, the shortcuts for speed; both must dispatch identical commands (state-WYSIWYG test, spec 17 §6.1).
- **Fallback source-preview (v1.1, deferred-dual-viewer stand-in)**: triggered from the CLIP MENU's **"Open in viewer"** item (§4.9) or the inspector source-card's play button — it plays the raw asset via a plain `<video>` element swapped over the canvas — media-asset playback, no timeline state involved. (Round 15 amendment, B4: double-click on a pool card is §4.2's reveal and NOTHING else — one gesture, one meaning; the v1.1 text's "double-clicking a media-pool asset … can play the raw asset" claimed the same gesture a second time and is withdrawn.) This is the cheap interim for §8.5's deferred dual viewer: it gives editors source-matching without modeling a second program monitor. Not a spec 15 command surface — a UI-layer affordance reading only `MediaRecord` metadata; exiting restores the program canvas on the next frame.
- **SourceEditBar — the source-mode edit bar (Round 25 amendment, D35.4/ARCH-R25 — the C46-anchored source-preview chrome contract landing; the reference implementation is `ui-mock/shell-variants`' `SourceEditBar.tsx` + its 15 test pins, per the fleet's shell-mocks deep-dive):** a `role="toolbar"` bar of **7 one-shot edit functions** (insert · overwrite · replace · append · ripple-overwrite · place-on-top · fit-to-fill) mounted in the source preview's transport row — the surface 16's source-mode chords drive (D34.4: the source-edit modes are source-mode OPERATIONS, not tools; the §4.5 tool radio does not grow them). Laws: **one-shot semantics** (no radiogroup, no `aria-pressed`, no persistent mode — the researched no-NLE-ships-a-persistent-mode ruling); **acts on the source preview's media (`sourceMediaId`), never the pool's selection** (the R19 wrong-asset law); **150 ms dwell preview** armed on hover AND focus (pointer/keyboard parity), disarmed on leave without clobbering a sibling's arm; **honest refusals** — an armed plan that cannot execute swaps exactly that button's tip to the refusal reason and announces via the shared `role="status"` description; no preview geometry ever paints on refusal; **roving tabindex** (one tab stop, ←/→ wrap, Home/End); **stay in source mode after commit** (repeated inserts are the point); **one MODE_LABELS source** (the preview badge never re-spells a mode name). Preview acceptances: **replace's ghost width == the target's width exactly** (the same-length-swap tell; ripple-overwrite's ghost keeps the source's own width — the different-length tell — `timeline_edit_modes (2).html` B7); **overwrite's displaced set is ∅** (the push-arrow token renders only when downstream clips move — insert + ripple-overwrite, never overwrite: 06 §5.9B's zero-downstream-movement law). Wire posture: documented composites (the variants' planner — preview == commit by construction); no OT-parity claim until the r1 op ports land (D30.2).
- **SourceRangeBar — the source in/out marks (Round 25 amendment, D35.4/ARCH-R25; reference: `ui-mock/shell-variants`' `SourceRangeBar.tsx` + its 8 test pins):** per-media in/out handles over the full source duration, mounted over the source preview. The marks are **surface state, NOT model state** — view-state in the UI store (`sourceRanges: Record<mediaId, {in, out}>`), never a history entry, never in SceneJSON (09's N12/N5 loop/in-out posture); drag = slider semantics with one clamped live write per step; keyboard ←/→ ±1 frame (⇧ ×10), Home/End; stills keep the honest static band (no duration → no range). The marks **feed the 3-point edit ops as caller-supplied params** — `sourceStart`/`sourceEnd` on 06 §5.9's engine family — so every edit function places the TRIMMED source; no source-range command joins the spec 15 union.

### 4.4 InspectorPanel (`shell-inspector`)

Mock has 6 tabs (video/audio/effects/transition/image/file); we ship **4**:

| Tab | Visible when | Contents (all model-backed, spec 09 ceiling) |
|---|---|---|
| **Video** | video/comp element selected | Transform: position X/Y, scale %, rotation°, opacity %, flip H/V (→ transform-resolver fields, spec 07 §5.4); Speed: rate % + preserve-pitch toggle (→ retime family, spec 06 §5.11) |
| **Audio** | audio-bearing element selected | Volume %, pan (−100..100), fade-in/fade-out seconds (→ spec 03 §9 / spec 09 §3.1 audio fields) |
| **Effects** | any element selected | Effect list (add/remove/reorder/toggle + param editors) → `addEffect`/`updateEffect`/`removeEffect`/`reorderEffect`/`toggleEffect` (spec 15 §4.3.52-56) |
| **Transition** | transition selected (or boundary focus) | Presentation picker (27 registry entries, spec 07 §6.3), duration, alignment (→ `updateTransition`, spec 15 §4.3.62) |

Inspector edits are **commit-on-release** (slider drag) / **commit-on-enter** (numeric field) with live preview via the same preview-commit coalescing as timeline drags (spec 06 §4.6). Multi-selection shows the common-parameter subset with "mixed" indicators. Nothing selected → "Nothing to inspect" (mock's default text). The mock's `image` and `file` tabs are dropped (§8.6-8.7). (Round 15 amendment, B2: the audio tab's field set is Volume % + pan −100..100 + fades — reading 09 §3.1's `volume` (linear 0..1, presented as %) and `pan` (−100..100, ADDED to ElementJSON by the parallel R15 09-side amendment, cross-ref); "Gain dB" is withdrawn — no dB field exists in 09 and dB conversion is display-side only. `preservePitch` joins the same 09 amendment; its editor stays on the Video tab's Speed row — a retime concern — while the field backs both.)

**Field contracts (v1.1):**

- **Timecode parsing**: every time-based numeric field (In/Out/duration/fade) accepts `HH:MM:SS:FF` timecode, `SS.s` seconds, and bare frame counts (suffixed `f`), parsed against project fps — one shared parser, never per-field. Invalid input: red 1px border + message under the field, focus retained, nothing dispatched.
- **Uniform commit semantics**: NumberFields live-preview on keystroke with a 50 ms debounce (same coalescing class as sliders — one `updateElements` per settle, not per keystroke); commit-on-enter and commit-on-blur both settle pending input. This closes the slider/field asymmetry the v1.0 text left open.
- **Reset per group**: each labeled parameter group (Transform, Speed, Fades) carries a reset affordance restoring spec 09 defaults — one `updateElements` with the default patch (a real command, undoable, not a local re-render).
- **Quick-seek buttons**: the source-asset card's In/Out rows carry `→ In` / `→ Out` / `→ Mid` buttons — pure `seek` commands, no state change.
- **Source-asset card** (top of Video/Audio tabs when a single element is selected): thumbnail, asset name, resolution, fps, duration — read-only `MediaRecord` projection (no EDL-JSON fallback view; missing metadata renders as `—`).
- **Tab visibility**: tabs whose "visible when" predicate is false are HIDDEN (not disabled) — the 4-tab topology is already the pruned set; hidden-not-disabled keeps focus order short (the visible-but-disabled pattern stays available for seal-round reconsideration via §8).

### 4.5 timeline-toolbar (`shell-timeline-toolbar`)

Tool cluster (radio group; honors spec 15 §4.3.45's tool enum — **nine tools** — exactly; Round 15 amendment, N2: the v1.1 text listed seven while claiming exact parity, and the mock likewise ships seven (C23)): Select (V), Razor/Blade (B), Roll (T), Ripple (R), Slip (Y), Slide (U), Rate-stretch, Hand (H), Zoom (Z) — spec 16 §3.2 bindings in parens where a key exists (rate-stretch is toolbar-only, no §3.2 key; v1.1's A/,',/S letters were the DaVinci mockup's — corrected to 16 §3.2's V/Y/U). Hand and zoom are keyboard-only (H/Z), toolbar-excluded per the removal ledger (§8.15). All dispatch `selectTool`; the mock's `dyntrim` is dropped (§8.9). Toggle cluster: Snapping magnet (`btn-magnet`, N — **UI-store**, spec 16 §0.2), Link A/V (`btn-linklock` — UI-store), Lock all tracks (`btn-track-lock` → per-track `toggleTrackLock` fan-out, undoable as a batch, spec 15 §7). Marker cluster: add-marker button + color presets. Zoom cluster: zoom-to-fit, zoom-to-selection, slider (UI-store viewport state, spec 05 §5). Master audio: mute + volume slider (→ master bus gain, spec 03 §9's audio graph). The mock's sync-bin/auto-sync buttons are dropped (§8.10).

**Toggle-cluster contracts (Round 15 amendments):**

- **N4 — Link A/V gate (`btn-linklock`):** link-OFF suspends BOTH linked-selection propagation (05 §12.3: selecting one of a linked pair selects only the clicked element) AND sync-lock move-following (06 §6: a linked partner no longer follows moves). The flag is VIEW-level (this UI-store toggle); the links themselves are DOC-level (`ElementJSON.linkedTo`, added to 09 §3.1 by the parallel R15 09-side amendment) — turning the toggle off never edits or deletes doc-level links, it only gates their behavioral consequences for this view.
- **N6 — Lock-all (`btn-track-lock`):** set-all semantics — a click sets EVERY track to the clicked target from any mixed state; the pressed state is DERIVED (`every(track.locked)`, so mixed states read un-pressed); the fan-out stays one undoable batch (spec 15 §7). After undo/redo the shell RE-DERIVES view flags (this pressed state and every other §6.2 view flag) from the restored snapshot — view state follows doc state through history restores (closes the R13 mock bug where undo left the flag stale).
- **Ripple mode is NOT a toolbar concern (A6, R15):** ripple the *tool* sits in the tool cluster above (`R`); ripple *mode* — the global editing pref — is a view-level flag bound to `Option+R` (spec 16 §3.2) and persisted as `TimelineViewState.rippleMode` (spec 09 §3.1); it gets no toolbar toggle unless a seal round adds one.

### 4.6 timeline-tabs (`shell-timeline-tabs`) — scene tabs

The mock's timeline tabs map to our **scenes** (spec 09 §6: multi-scene projects): one tab per scene (active = `getActiveScene`), `+` → `createScene`, close → `deleteScene` (confirm). Tab labels carry modified/dirty dot (project-save state, spec 09 §6 autosave). Playback and editing always target the active scene; `switchToScene` is the only cross-scene mutation.

### 4.7 timeline-area (`shell-timeline`) & track-headers (`shell-track-headers`)

The region's internals belong to spec 05 (component hierarchy §4, zoom/scroll §5, virtualization §6, clip rendering §7, interactions §8, track headers §10). The shell fixes: the 160px header column (big TC readout in `#track-headers` mirrors the viewer TC; per-track M/S/lock buttons on ALL track kinds, plus visibility (V) on NON-AUDIO kinds only → `toggleTrackMute`/`toggleTrackSolo`/`toggleTrackLock`/`toggleTrackVisibility` commands (Round 15 amendment, A5: M/S/L render on every track kind — solo on video/text/overlay = monitor-solo semantics, 18's shape wins over 05 §10's "no S on video"; V renders only where 05 §10 permits it, non-audio — correcting this spec's unqualified v1.1 list in BOTH directions; the mock ships exactly this shape); the mock's per-track waveform/clip-view toggle is a UI pref), and the scroll container's native scrollbars (the mock's custom 14px `#hscrollbar-row` is deferred, §8.11). The playhead line + head render per spec 05 §11.

### 4.8 app-dock (`shell-dock`)

Left: brand mark + app name. Center: page dock — **three pages, not seven**: `Edit` (default; the whole shell above), `Color` (grading workspace: spec 08's panels — wheels, curves, LUT, qualifier, power window, scopes — in a simplified single-column layout; enters a color-focus mode that swaps the inspector for the grading panel stack while the timeline stays live), `Deliver` (export: FCPXML via `exportFCPXML` command (spec 15 §4.3.74), optional cloud master via `exportMaster` (§4.3.75), render settings, progress list). Right cluster: keyboard cheat-sheet (spec 16 §7.3's modal, opened via `?`), settings (deferred, §8.12). Dropped pages: Media, Cut, Fusion, Fairlight (§8.2-8.4).

**Deliver range band (Round 25 amendment, D35.4/ARCH-R25 — the R23 W-F surface gains its rows here, where the Deliver page's rows live; reference: `ui-mock/shell-variants`' `RangeBand.tsx` + the TimelineCompact.test pins incl. the band's clone):** the Deliver page's export range is authored by the range band — a 32px interactive in/out band mounted in place of the compact ruler's head row, with full-height 12px bracket handles (thin-glyph law: the hit target ≠ the visual size), a TC readout, and a dim-not-erase fill over the excluded span. Laws: **the loop-seam ruling** — the export range ≡ the timeline's in/out marks ≡ the loop region: ONE seam, THREE writers (the band, the ruler's bracket handles, mark-in/mark-out), and every readout follows every writer (the deliver settings' range block reads the same fields; `exportMaster {range}` — §5's row — is the seam's consumer; 15 §4.3.29 `setLoop` the wire form); **the drag law (ruling 21)** — LOCAL preview state during the drag, ONE commit on release, a no-op release writes nothing, pointercancel discards; **the ordering law (R14)** — writing an edge past the other DRAGS the far edge along, never inverts (the same law as §4.3's scrub-row inversion guard); **the domain clamp** — the range is clamped to [0, timeline duration] (an export range cannot exceed the timeline).

### 4.9 Context Menus (v1.1 — enumeration; resolves §15.2 Q2)

Five context menus, each item command-backed (the §5 rule: no menu item without a spec 15 type or explicit `(UI)` tag). All open on right-click and on **Shift+F10** with focus in the surface (keyboard route is normative, §11). Menu chrome: DOM popup, 220px, 28px items, shortcut labels right-aligned, separators between groups, Escape/outside-click closes, focus returns to opener. `data-testid="shell-menu-<name>"` + items `shell-menu-<name>-<item>`.

**Clip menu** (right-click a selected element; multi-select = whole selection): Cut `⌘X` · Copy `⌘C` · Paste at playhead `⌘V` — `cut`/`copy`/`paste` (spec 15 §4.3.68-70) ⫽ Duplicate `⌘D` — `duplicate` ⫽ Split at playhead `⌘B` — `split` ⫽ Delete `⌫` — `delete` ⫽ Ripple delete `⇧⌫` — `delete {ripple:true}` (spec 16 §3.4 defaults: Delete leaves gap — flag this in the cheat sheet, reference C8; A1 resolved R15: 16 §3.4 now matches this row — `Delete`/`Backspace` plain-delete aliases, `⇧Delete` the only ripple chord) ⫽ ⫽ Remove Effects — batched `removeEffect` ⫽ Add Transition… — opens inspector Transition tab ⫽ Rename — inline edit → `updateElements {name}` ⫽ Reveal in Media Pool — (UI) navigation ⫽ Open in viewer — (UI) the v1 source-preview trigger (§4.3, R15/B4; double-click on a pool card stays §4.2's reveal).

**Track-header menu** (right-click a track): Add Track Above/Below — `addTrack {index}` ⫽ Delete Track — `deleteTrack` (with-clips confirmation, §6.4) ⫽ Rename Track — inline → `updateElements`-class (track name) ⫽ ⫽ Mute `M`-click · Solo · Lock — `toggleTrackMute/Solo/Lock` ⫽ Height: Compact/Normal/Tall — (UI) pref.

**Ruler menu** (right-click the ruler): Add Marker — `addMarker` ⫽ Go to Marker › (submenu, first 5 + More) — `seek` ⫽ Clear Markers in View — batched `deleteMarker` ⫽ ⫽ Mark In `I` / Mark Out `O` — `setLoop` halves ⫽ Clear In/Out — `setLoop {start:null, end:null}` (note the halves semantics — "clear out" clears `end`, not `start`; the reference-repo bug is the test case). (Round 15 amendment, N10: plain click/drag on the ruler SEEKs (05 §8.6 — the §5 gesture row) — markers are added via `M` (spec 16 §3.7), §4.5's marker button + color palette, and THIS menu; 05 §11.1's "Click on ruler to add marker" clause is retired by this resolution (R15 — the 05-side edit lands in the parallel pass). Right-click / Shift+F10 is the ruler's only menu route.)

**Media-pool menu** (clip card): Insert at Playhead `,`-equivalent button — `insertElement {strategy:'explicit'}` ⫽ Reveal in Timeline — (UI) navigation ⫽ Rename / Remove / Properties — as §4.2.

**Timeline-empty menu** (right-click empty lane area): Paste `⌘V` — `paste {atTime}` ⫽ Add Track — `addTrack` ⫽ Import Media — `⌘I` flow.

Cross-track-type drags already fail at placement (spec 06 §5.9) — the menus add no duplicate affordances for them.

### 4.10 Sample project (v1.1)

A built-in 30-second demo project (3 video clips + 1 text + 1 audio + one crossfade) ships as a `ProjectJSON` fixture (spec 09) + committed media manifests, loadable from the media-pool empty state and the cheat-sheet modal's footer. It doubles as the Tier-2/3 test fixture (spec 17 §5.3's committed-asset rule + §13A.6 — the same file the tests load, never a fork), and it is the onboarding path: "the empty state teaches" (source principle 7). No tour, no settings modal, no help menu (§8.12 stands).

### 4.11 EffectsPanel (`shell-effects`) (v1.2 — Round 15 amendment, N9)

The effects library rail — 220px, toggleable, docked in the main-body row between the media pool (and its splitter) and the viewer; §3.1's diagram shows the left stack collapsed (the rail rides between pool and viewer when toggled on). The §4.1 `btn-effects` toggle is the mouse route; the keyboard route is `Option+2` (spec 16 §3.8 — ⌘1–⌘4 stay page switches; the ⌥-form avoids that collision). Contents and contract:

- **Registry list**: one row per registry entry, grouped by category — video effects from spec 08 §3's effect-type inventory, transitions from spec 07 §6.3's 27-entry presentation registry (the mock ships an 8-row Blur/Stylize/Transition subset as the review-surface shape). Rows: `data-testid="shell-effects-row-<slug>"`; the panel root is `shell-effects` (§10).
- **Drag-to-clip contract (the real apply path)**: drag a row onto a timeline clip — effect rows issue `addEffect` on the dropped clip (spec 15 §4.3.52); transition rows issue `updateTransition` on the clip's boundary (spec 15 §4.3.62). The drag payload is a fixed MIME contract: type `application/x-nle-effect`, JSON body `{ name, cat }` (the mock's pinned shape). Drag feedback follows §4.2's lane grammar (`copy` cursor + ghost); incompatible drops reject per spec 06 §5.9. One drop = one undoable command — the drop IS the commit (no preview-commit).
- **Click fallback**: a row click is an honest `info` toast (§6.4, N7's class) pointing at the drag path + the inspector's Effects tab (where param editing lives) — keyboard-operable, never a silent no-op (the mock's R14 fix).
- **F6 region status (conditional)**: the rail joins §11.5's F6 cycle only while visible (between media pool and viewer); hidden = not a focus stop — conditional membership keeps the cycle stable for SR users.

## 5. Interaction Contracts (gesture → `EngineCommand`)

Every mutation the shell can perform is expressed here. This table is normative: Tier 3 tests (§12) assert exactly these mappings via `window.__engine.command.apply()` capture (spec 17 §6.1's state-WYSIWYG pattern).

| Gesture / control | Preview | Commit (spec 15 type) | Notes |
|---|---|---|---|
| Click clip / element | hover + selection ring | `selectElements { elements, mode: 'replace' }` | spec 05 §8.2 |
| Shift/Cmd-click | accumulate | `selectElements { mode: 'add' \| 'toggle' }` | |
| Marquee drag (empty lane) | rubber band | `marqueeSelect` | spec 05 §8.7 |
| Drag element body | live move (DOM transform) | `move` (coalesced, spec 06 §4.6) | spec 05 §8.3; snap guides per spec 05 §9 |
| Drag trim handle (L/R) | live resize | `trim { edge, delta }` | spec 05 §8.4; overlays per spec 06 §8 |
| Roll both handles / T-tool drag | dual overlay | `roll` | spec 06 §5.5 |
| Blade tool click on clip | cut line cursor | `split { time }` | spec 06 §5.1; spec 05 §8.5 |
| Drag from media pool → lane | ghost | `insertElement` | placement resolved by drop (spec 06 §5.9; spec 05 §8.8) |
| Alt-drag element | duplicate ghost | `duplicate` then `move` (batched, spec 15 §7) | |
| Inspector slider (transform/opacity/…) | live GPU re-render | `updateElements { updates }` (coalesced) | commit-on-release, §4.4 |
| Inspector effect param edit | live | `updateEffect` | |
| Inspector transition edit | live | `updateTransition` | |
| Transport play/pause | — | `play` / `pause` | |
| Scrub bar / viewer drag | seek preview | `seek` (throttled + final commit) | spec 05 §8.6 |
| Ruler click / drag | playhead preview | `seek` (throttled + final commit) | spec 05 §8.6; plain click/drag on the ruler SEEKs — no marker-on-click (Round 15 amendment, N10: markers via `M`, §4.5's button/palette, §4.9's ruler menu; 05 §11.1's click-to-add retired R15) |
| Step ±1 frame | — | `seek` ±1 frame | spec 16 §3.5 parity |
| Loop toggle | — | `setLoop { start, end }` | |
| Mark in / out (I / O) | region shading | `setLoop` start/end halves (spec 16 §3.1 note — citation corrected R15/N12; 05 §11.2's dedicated model retired by that resolution) | spec 03 §3.4 |
| Add marker (M) | pin | `addMarker` | color from palette |
| Track header M / S / lock / eye | immediate | `toggleTrackMute` / `toggleTrackSolo` / `toggleTrackLock` / `toggleTrackVisibility` | M/S/L all kinds, eye non-audio only (§4.7, R15/A5) |
| Tool buttons (V/B/T/R/Y/U/…) | cursor change | `selectTool` | spec 15 tool enum (nine tools — letters corrected to 16 §3.2's, R15/N2) |
| Scene tab select / + / close | — | `switchToScene` / `createScene` / `deleteScene` | §4.6 |
| Undo / redo (toolbar + Z / Y) | — | `undo` / `redo` | |
| Deliver: Export FCPXML | progress toast | `exportFCPXML { format, bundleMedia }` | artifact via `CommandResult.data` (spec 15 §14.11) |
| Deliver: Export master | job row | `exportMaster { format, destination, range }` | progress via `renderProgress` events |
| Deliver: Export frame | — | `exportFrame { format, time }` | |
| Snap magnet, link toggle, zoom, panel toggles, tab focus | local only | **(UI)** — UI store, spec 16 §0.2 | never `apply()` |

**Live-drag semantics (normative).** During drags the shell renders optimistic preview state locally (DOM transforms only — never mutates engine state), then commits one command (or one coalesced batch) on release. Escape during drag cancels the preview and issues nothing. This is spec 05 §8 / spec 06 §4.6's pattern, promoted to a shell-wide rule: **the engine never sees intermediate drag states.**

### 5A. Pointer & Cursor Grammar (v1.1)

**Wheel semantics** (per surface):

| Surface | Wheel | Shift+Wheel | Ctrl/Cmd+Wheel | Alt+Wheel |
|---|---|---|---|---|
| Timeline lanes | horizontal scroll | horizontal scroll (faster ×10) | **zoom toward cursor** (anchored at pointer time-position, spec 05 §5.2) | vertical track scroll |
| Ruler / scrub-row | horizontal scroll | zoom toward playhead | zoom toward playhead | — |
| Viewer canvas | — (fixed fit) | — | zoom select cycles (UI) | — |

Ctrl/Cmd+wheel zoom-to-cursor is normative (the #1 absent affordance in v1.0); `preventDefault` is mandatory so the browser page-zoom never fires. The zoom itself is a (UI) viewport operation — no engine command (spec 05 §5).

**Double-click resets**: sliders, knobs, and NumberFields reset to their spec 09 default on double-click — implemented as the same reset command as the inspector's per-group reset (undoable `updateElements`, never a local-only re-render).

**Shift+drag axis-constrain**: horizontal-only for clip drags (time axis), vertical-only for track-header height resize. Adopted (compatible with our grammar, unspecified in v1.0). **Rejected**: Ctrl+drag-duplicate and Alt+drag-slip (contradiction C11 — our Alt-drag-duplicate stands, slip stays tool/keydown-driven).

**Cursor vocabulary** (all 16 rows directly testable via computed style or `data-cursor`):

| Context | Cursor |
|---|---|
| Default / select tool active | `default` / `pointer` over interactive |
| Clip body (select tool) | `move` |
| Clip left/right edge (hit zone) | `ew-resize` |
| Trim handle hover | `ew-resize` |
| Roll tool on cut point | `ew-resize` (dual overlay indicates both) |
| Blade tool over clip | `crosshair` + cut-line preview |
| Hand tool drag | `grab` → `grabbing` |
| Marquee in progress | `crosshair` |
| Playhead drag | `col-resize` |
| Zoom tool | `zoom-in` (Alt: `zoom-out`) |
| Drag from media pool, over valid lane | `copy` + ghost |
| Drag from media pool, over incompatible lane | `not-allowed` |
| Move to wrong track type (rejected preview) | `not-allowed` |
| Locked clip interaction | `not-allowed` (clip is `pointer-events: none` — cursor set on the track lane under it) |
| Disabled control (all surfaces) | `not-allowed` + 40% opacity (§9) |
| Text field / inline rename | `text` |

Cross-track-type move prevention is the placement layer's job (spec 06 §5.9); the cursor is the presentation of that rejection, not a second enforcement.

**Cursor layering — the bracket-glyph ruling (Round 25 amendment, D33.1/ARCH-R25):** the 16-row CSS vocabulary above remains the hover/hit law (layer 1 — the §12 computed-style spot checks). The mode mocks' SVG bracket-glyph family (roll: brackets + outward arrowheads; ripple: dark rect + bracket + right arrow; slip: brackets + two arrows inside, diverging; slide: arrows outside the brackets, sitting LOW over the title bar — `ui-mock/trim_edit_modes.html` A7) is law as the SECOND layer, layered over the first: **a glyph renders ONLY inside an active gesture's drag preview** — an in-gesture state tell, never a hover cursor; the CSS cursor carries hit feedback while the glyph paints over the preview. The **slip-high / slide-low glyph posture** (slip's glyph at the clip body center vs slide's low over the title bar) is pinned as the slip-vs-slide affordance tell — the visual encoding of 05's pointer-position slip/slide detection (`use-timeline-slip-slide`'s initial-pointer-position law, 05:972). Tests: the layer-1 spot checks above + glyph-presence assertions inside an active drag and glyph-absence on hover.

## 6. State Binding & Sync

1. **The shell holds zero engine state.** All engine-derived data (tracks, elements, selections, playhead, scene list, media) comes from `SceneState` snapshots + the `EngineEvent` stream (spec 15 §9). Panels subscribe through a thin selector layer that computes view models (e.g., clip layout = `timeToPx` × snapshot, spec 05 §5.3).
2. **The UI store (Zustand) holds only view state**: panel visibility, tool (mirrored), snap on/off, link on/off, zoom/scroll, inspector tab, theme. This is exactly spec 16 §0.2's UI-layer-extension surface — the same store, the same setters, so shortcuts and shell buttons drive one state.
3. **Event → re-render mapping**: `stateChanged` → full snapshot refresh (rAF-batched); `timeupdate`/`playbackState` → transport + playhead only (no snapshot refetch); `renderProgress`/`exportArtifactReady` → Deliver page + toasts; `autosaveState` events (spec 09 §6.1's autosave lifecycle — dirty/flushing/flushed/failed) → the status-strip save chip (§6.3). `commandApplied` events keep multi-consumer sync (cloud mirroring) free.
4. **WYSIWYG obligations** (spec 17 §6.1, CI-blocking): every §5 row must produce a structurally-identical `EngineCommand` whether driven by mouse, keyboard, or programmatic test — the shell's buttons are shortcuts with icons.

### 6.3 Save-status chip (v1.1)

The 12px status strip (§3.1) is now owned: left segment = autosave state driven by spec 09 §6.1's events — `Saving…` (flush in progress) · `Saved 12s ago` (idle, timestamp) · `Save failed — retrying` (error state + click-to-retry = `saveProject`). This is a LOCAL-OPFS indicator only — the cloud-PUT autosave it was adapted from is rejected (contradiction C18); nothing about the chip implies network. Scene-tab dirty dots (§4.6) stay as the per-scene signal. Test: `shell-status-save` testid + event-paired assertions in spec 17 §13A.

### 6.4 Error & Notification UX (v1.1)

**Toast conventions**: success = 4 s auto-dismiss; warning = 6 s; error = persists until dismissed (max 3 stacked, oldest collapses to an icon row); **info = 4 s, `role="status"` (Round 15 amendment, N7 — the class this section's own rows already needed: "Nothing to undo" below, import/deliver notices; the mock's `info`/`persist` split is the proven shape)**. Toasts live in a fixed region `role="status"` (success/warning/info) / `role="alert"` (error); the notification region never steals focus. `data-testid="shell-toast-<n>"`.

**Error-class → presentation table** (typed over spec 15 §6.3's `CommandError.code`; presentation only — the engine never renders):

| Error class (representative codes) | Presentation |
|---|---|
| Command rejected — validation (`SCHEMA_INVALID`, `INVALID_PARAMS`-class) | toast (error) + offending field red-border if an inspector field sourced it; nothing else mutates |
| Command rejected — state conflict (`OVERLAP_REJECTED`, `MAIN_TRACK_CONSTRAINT`, `TRACK_NOT_EMPTY`, `LOCKED_*`) | invalid-op feedback: message naming the blocker ("Cannot move — blocked by locked clip") + `not-allowed` cursor on the source control; no toast spam (one per gesture, not per rejected preview) |
| Rejected no-op (`NOOP`) | silent UI-internal handling — the gesture simply produced no state change; no toast (surfacing it is noise) |
| Not-found (`ELEMENT_NOT_FOUND` — stale refs after external mutation) | auto-refresh snapshot + retry once + toast if still failing |
| Undo boundary (`NOTHING_TO_UNDO`/`NOTHING_TO_REDO`) | brief "Nothing to undo" `info` toast (4 s — the N7 kind, R15; not an error class visually) |
| Render/export job failure (spec 11 job states) | Deliver-page row turns failed-state + **Retry** button (re-issues the export command); toast (error) |
| Asset missing (`MEDIA_MISSING`-class) | pool badge + clip red stripe (§4.2) + toast once per asset |
| Storage failure (OPFS errors, spec 09 §11) | save-chip error state (§6.3) + toast (error, persist) with retry |

**Destructive-action confirmations** (modal, focus-trapped, `⌘.` cancels): `deleteScene` with clips (existing), `deleteTrack` with clips (new), multi-delete ≥ 5 elements ("Delete 12 clips?"), `removeMediaAsset` when elements still reference the asset (count them). Everything else commits directly — undo is the safety net.

**Global failure boundary**: one React error boundary around the shell tree rendering "Something went wrong — reload / copy diagnostics" (diagnostics = engine health snapshot + last commands, capped). This is the last-resort presentation; per-command errors never reach it (they are typed results, not exceptions — spec 15 §6).

**beforeunload**: registered only when autosave state is `dirty` ("unsaved changes" browser prompt); when the flush completes it deregisters. Pairs with spec 09 §6.3's unload-flush, which stays authoritative for data; the prompt is the UX layer.

## 7. Rendering Strategy per Panel

| Surface | Tech | Spec |
|---|---|---|
| Viewer video | WebGPU canvas (10-bit pipeline) | 04 §7, §5.3 |
| Timeline lanes, clips, ruler, playhead, headers | DOM/CSS (virtualized) | 05 §4-§7 |
| Filmstrip thumbnails / waveforms | worker-generated ImageBitmap/OffscreenCanvas assets | 02 §8.4 (filmstrip) / §8.3 (waveform) |
| Inspector / panels / dialogs / toasts | DOM (React 19 + Radix/shadcn-style components, spec 00 §4) | this spec |
| Color workspace scopes | worker-fed canvas panels (~10fps updates) | 08 §11, 02 audio/video meter worker notes |

The shell is a React 19 tree; the engine import is a pure TS module (spec 01 §6 boundary) — components import only the command constructor helpers + selector layer, never engine internals.

## 8. Chrome Removal Ledger (mock → ours, with rationale)

| # | DaVinci/mock feature | Decision | Rationale / replacement |
|---|---|---|---|
| 8.1 | Top menu bar (`#menubar`) | **Removed** (user directive) | All actions reachable via toolbar buttons + spec 16 shortcuts + context menus; removes ~30 menu items × i18n × a11y burden for features we don't have |
| 8.2 | Media / Cut pages | Removed | Media pool is an Edit-page panel (§4.2); Cut page's dual-timeline is a finishing workflow — rough cut happens in Edit |
| 8.3 | Fusion page | Removed | Compositing beyond our effect set is out of scope (master spec §1) |
| 8.4 | Fairlight page | Removed | Audio post (bus routing, mixer) is downstream-NLE territory; audio params live in inspector Audio tab |
| 8.5 | Dual viewers (source + program) | Deferred to v2 | Single program viewer; source preview requires media-asset playback the command layer doesn't model yet (noted as seal-round question §15.2) |
| 8.6 | Inspector `image` tab | Removed | Only model-backed params ship (§4.4); image-specific grading merges into Effects tab |
| 8.7 | Inspector `file` tab | Removed | File metadata shows in media pool cards + context-menu Properties (read-only) |
| 8.8 | Mixer / Metadata panels (toolbar2 right) | Removed | Out of scope (8.4); project metadata is a Deliver-page section |
| 8.9 | Dynamic trim tool (`dyntrim`) | Removed | Spec 15 tool enum has roll/ripple covering the rough-cut need; re-add only if asymmetry data demands it |
| 8.10 | Sync bin / auto-sync buttons | Removed | A/V sync is handled by link groups + sync-lock (spec 06 §6), not editor-side bin sync |
| 8.11 | Custom 14px h-scrollbar | Deferred | Native scrollbars first; custom scroller is polish, not contract |
| 8.12 | Workspace save/custom layouts | Removed | Fixed dock + splitters (§3.2); workspace persistence is a v2+ feature at the earliest |
| 8.13 | Audio meters panel | Deferred | Master mute/volume in timeline-toolbar now; meters need the meter worker tap (spec 02) — v2 |
| 8.14 | Bins / smart bins in media pool; relink flow; Ctrl+drag-duplicate; Alt+drag-slip; MP4/EDL/JSON/MP3 export formats; LUFS/EQ/dynamics; light theme; first-run tour | **Rejected (v1.1 register — from the UX source, ours-wins)** | Schema changes (bins), missing wire commands (relink/EDL/…), contradiction C11/C14/C15, scope rejections per 00 §1; each entry lives in SCOUT-R8-C §6's rejection register — future PRs cite it instead of re-litigating |
| 8.15 | Hand / zoom tools as toolbar buttons (§4.5) | **Toolbar-excluded (keyboard-only)** (R15/N2) | The §4.5 tool cluster carries the seven editing tools; Hand/Zoom remain spec 16 §3.2 keyboard bindings (H/Z) and honored spec 15 §4.3.45 enum members shell-wide — re-add as buttons only if pointer-space panning demands it |

## 9. Theming & Design Tokens

Dark pro theme, single theme in v1 (light theme is a non-goal). Tokens (CSS custom properties, Tailwind 4 theme layer):

| Token | Value (mock-derived) | Use |
|---|---|---|
| `--bg-app` | `#171719` | dock |
| `--bg-shell` | `#1c1c1e` | toolbar2, panels, timeline toolbar |
| `--bg-panel-raised` | `#202022` | track headers, raised sections |
| `--bg-timeline` | `#1a1a1c` | timeline lanes |
| `--border-hairline` | `#0a0a0a` | all 1px separators (mock's universal border) |
| `--accent-selection` | `#e8b34b` (mock playhead gold) | selection, active tab, playhead |
| `--accent-focus` | `#7b5cff` | keyboard focus ring, primary buttons (mock inspector gradient start) |
| `--text-primary` / `--text-muted` | `#e6e6e6` / `#9a9a9e` | |
| `--tc-mono` | 12px tabular mono (JetBrains Mono / system mono fallback) | ALL timecode chips, ruler labels, big TC readout |

**R25 — the edit-mode grammar tokens (Round 25 amendment, D33.1/ARCH-R25 — the theme half of the visual-grammar register; the structural half is 05 §8A's, per the tokens-here-geometry-there law below):** 8 semantic tokens, names + values VERBATIM from the fleet's visual-grammar report (implemented as-is, no fork); element ids A1-A8 cite `ui-mock/trim_edit_modes.html`'s grammar inventory, B1-B7 `ui-mock/timeline_edit_modes (2).html`'s:

| Token | Value (mock-derived) | Use |
|---|---|---|
| `--trim-edge-active` (+ gradient ramp) | `#55a814→#8ce22e→#a4ef3c` (A1) | A1's crisp trim-edge bands + the A2 glow's ramp |
| `--trim-glow-soft` | `rgba(124,216,38,.7)→rgba(166,242,74,.95)` (A2) | slip's soft blurred edge-glow variant |
| `--clip-dim-overlay` / `--clip-dim-border` / `--clip-dim-title` | `rgba(8,10,16,.42)` / `#4a5a6e` / `#4c5b6f` bg + `#9db0c0` text (A3) | the inactive-clip treatment (which clips dim per mode is 05 §8A's law) |
| `--clip-active-edit` | `#e2403c` (A4) | slip/slide's active-clip border |
| `--ghost-outline` | `#646464`, dashed (B1/B4) | the placement ghost + the fit-slot outline |
| `--badge-chip-bg` / `--badge-chip-border` / `--badge-chip-text` | `rgba(17,17,17,.62)` / `rgba(255,255,255,.28)` / white (B5) | the speed badge + mode badge chip |
| `--overlay-arrow` | `#ffffff` + drop-shadow (A8/B2/B3) | the trim/insert arrow family |
| `--source-active-border` | `#6ba4d8` (B6) | the active source clip (source preview) |

The green ramp family is the PINNED reference (D33.2 — over 05:949's FreeCut-era amber claim, a foreign-tree census whose files are in no checkout; amber is recorded there as the historical alternative, not law). `--badge-chip-text` on `--badge-chip-bg` meets §9's contrast floors (the one text-bearing pair). Landing surface: OT's CSS-variable token mechanism (D25.3a — `globals.css` `:root` + `theme.ts`) at r1 (D33.5's sequencing law: the register precedes the wave-1 op ports, else the grammar forks a fifth time).

Spacing on an 8px grid (4px half-steps inside dense bars); control heights: 24px icon buttons (26px in mock, tightened), 28px viewer toolbar, 34px main toolbars. All icons inline SVG 14-16px, 1.6-1.7 stroke (mock's icon language).

**v1.1 deepening (from the UX source, contrast-verified):**

- **Type scale (6 steps)**: 11px dense labels (min), 12px body/TC, 13px panel headers, 14px dialog body, 16px dialog titles, 20px empty-state headings. Line-height 1.4 body / 1.2 dense. The 11px floor is normative (a11y §11 item 12).
- **Contrast rules (WCAG 2.2 AA-verified, token pairs)**: `--text-primary` on `--bg-shell` ≥ 7:1; `--text-muted` on `--bg-panel` ≥ 4.5:1 (body floor); any `--tx-`-muted-quaternary token is **forbidden as body text** (decorative hints only — the source's rule, kept because it is the single most-violated dark-theme rule). Focus ring `--accent-focus` vs any bg ≥ 3:1. Selection gold on timeline bg ≥ 3:1 (non-text).
- **Icon conventions**: 14px in 24px buttons / 16px in 34px bars; 1.6 stroke; every icon decorative → `aria-hidden` + adjacent text or `aria-label` on the button (never icon-only without a label).
- **Motion tokens + anti-motion rules**: `--motion-fast` 100ms (fades), `--motion-base` 200ms (panels/menus), `--motion-slow` 400ms (page swaps). **No motion while tracking** (drag/scrub in progress = overlays freeze, no transitions); **playhead never animates** (position is per-frame state, not a tween); loading skeleton pulse at 1 Hz; `prefers-reduced-motion: reduce` zeroes all three tokens + kills the pulse globally (§11).
- **Tooltip latency**: 500 ms hover delay, 100 ms fade, 4 s auto-dismiss; suppressed entirely while any pointer button is down (tooltips during drag are noise). Delay/opacity via CSS only — no JS timers per element.
- **Disabled state language**: 40% opacity + `not-allowed` cursor + no focus stop. One rule for every control class.
- **State visualization** (hover/selected/dragging/error/disabled per control class): buttons — bg +1 step on hover; clips — 1px `--accent-selection` outline selected, 50% original-opacity ghost + separate drag ghost while dragging; lanes — bg +1 on drag-over; inputs — red 1px border on error (never just color — pair with message text).
- **Color strips (semantic, token-driven)**: track-type strip 2px on track headers (video/audio/overlay from one hue ramp); clip color-label strip 3px on the left edge (label palette from `updateElements`-backed field, rendering here); fade triangles + effect badges (F/T/S/♪) on clips per spec 05 §7.3's structure — tokens live here, geometry there.
- **Panel anatomy**: optional 28px footer row for counts/filters (media pool uses it, §4.2); header row = title + controls, never wraps.
- **i18n posture**: all UI strings extracted to a locale module from day 1 (English-only v1); format-only strings (TC, durations) go through spec 03 §4's formatter, never inline concatenation. The timecode-format picker is v2. RTL deferred — layout is `dir=ltr`-assumed; extraction is the cheap-now insurance.

## 10. `data-testid` Conventions (spec 17 Tier 3 contract)

- Panel roots: `shell-<panel>` → `shell-toolbar`, `shell-mediapool`, `shell-effects` (§4.11, R15/N9), `shell-viewer`, `shell-inspector`, `shell-timeline-toolbar`, `shell-timeline-tabs`, `shell-track-headers`, `shell-timeline`, `shell-dock`, `shell-color`, `shell-deliver`.
- Controls: `shell-<panel>-<control>` → `shell-viewer-btn-play`, `shell-viewer-scrub`, `shell-timeline-toolbar-btn-snap`, `shell-timeline-toolbar-tool-blade`, `shell-inspector-tab-video`, `shell-track-3-btn-mute`, `shell-scene-tab-2`, `shell-deliver-btn-export-fcpxml`.
- Elements inside the timeline follow **spec 05's** existing conventions (05 §8.x) — this spec adds only the shell frame around them.
- Panel state rows (v1.1): `shell-<panel>-state-<empty|loading|error|noresult>` (§4.2 table); context menus + items: `shell-menu-<name>[-<item>]` (§4.9); toasts: `shell-toast-<n>` (§6.4); save chip: `shell-status-save` (§6.3).
- Mock ids (`btn-play`, `btn-magnet`, …) are documented aliases in §4 for traceability; tests target `data-testid`, never raw ids.

## 11. Accessibility (v1.1 — the WCAG 2.2 AA floor)

1. **Keyboard completeness**: every §5 contract has a spec 16 binding or is reachable via Tab/Enter; the toolbar is a `toolbar` role with roving tabindex; tool radio group uses arrow-key navigation.
2. **Focus management**: panel toggles move focus into the revealed panel; dialog close restores focus to opener; timeline drag interactions are pointer-only by nature but every commit has a keyboard route (trim via numeric inspector fields, move via frame-step + nudge commands per spec 16).
3. **Roles**: `application` landmark on the shell; `tablist`/`tab` for inspector tabs and scene tabs; `slider` for scrub/zoom/volume (with `aria-valuetext` in TC format); `grid` semantics inside the timeline are spec 05 §11's concern.
4. **Announcements**: live regions per §6.4's toast roles; media-pool count footer (§4.2) is `aria-live="polite"`.
5. **F6 panel-focus cycling (+ Shift+F6 reverse)** — normative: F6 cycles focus among the major regions (toolbar → media pool → [effects rail, §4.11, while visible] → viewer → inspector → timeline → dock; the conditional effects stop is the R15/N9 amendment), 2px visible focus outline on the region container when it holds focus. This is the keyboard navigator for an `application` landmark that has no Tab-order of its own.
6. **tablist ↔ tabpanel pairing**: every `tab` sets `aria-controls` to its panel id; panels carry `role="tabpanel"` + `aria-labelledby` back-reference (inspector tabs, scene tabs).
7. **Grid/listbox arrow navigation + `aria-activedescendant`**: media pool (§4.2), marker submenus (§4.9); focus moves without selection; Enter/Space activates.
8. **Canvas accessibility**: the viewer canvas gets an `aria-label` updated at ≤ 1 Hz ("Playing — 00:00:12:04, Clip2") and a throttle-limited TC live region mirrors it for screen readers; the timeline's DOM surfaces (ruler as `role="slider"`) are spec 05 §11's.
9. **Global reduced motion**: `@media (prefers-reduced-motion: reduce)` zeroes all motion tokens + disables skeleton pulse + disables toast slides (§9); playback frame rate is NOT affected (content, not chrome).
10. **Visible focus rings**: 2px `--accent-focus` outline, 2px offset, on every interactive element including sliders, scrub handles, and menu items — never outline:none without replacement.
11. **Decorative SVGs**: `aria-hidden="true"` + `tabindex=-1`; icons never carry meaning alone (§9 icon conventions).
12. **Minimum label size**: 11px type floor (§9 type scale); anything smaller is a violation, not a style choice.
13. **Skip link**: first focusable element = "Skip to timeline" (bypasses toolbar clusters for keyboard users).
14. **Shift+F10 context menus**: every §4.9 menu opens from keyboard focus in the surface, not just right-click (menu items navigate by arrow keys, Escape closes and restores focus).
15. **Selection live region**: timeline selection changes announce count ("3 clips selected") at most once per settled gesture, `aria-live="polite"`.
16. **Screen-reader test pass**: a Tier-3 spot suite (spec 17 §13A) runs NVDA/VoiceOver smoke assertions (label presence, role correctness, live-region wiring) — automated axe-core + one manual pass per release.

Contrast floors are §9's table; the 4.5:1 body-text and 3:1 non-text minimums are the acceptance bars for the token set.

## 12. Testing (per spec 17 §4 template)

**Performance budget (v1.1 preamble — the budgets are 00-master §6A's; the test hooks are here):** first paint < 1 s and TTI < 3 s on an empty project are asserted by the Tier-3 shell-mount smoke (PerformanceObserver `paint` timings + `performance.now()` at first command dispatch); 60 fps with 50 clips during drag is a Tier-2 frame-time sample (spec 17 §13A.1); the perf-UX implementation list (React.memo on TrackHeader/clip cards, memoized derived selectors, 200 ms search debounce, code-split heavy modals, skeleton states) is advisory technique, not contract — the budgets are the contract.

**Tier 1 (Vitest, no browser)** — none shell-specific: the shell's logic (selector layer, command-constructor helpers, coalescing wrappers) is pure and testable headless; those tests live beside the components.

**Tier 2 (Playwright + headless Chrome)** — the shell's own rendering is DOM (asserted via Tier 3); the viewer canvas pixels are spec 04/07's Tier 2 scope. One addition: a shell-mount smoke test (all §4 panels render with an empty project; no console errors).

**Tier 3 (Playwright, keyboard-first)** — the core shell suite (~60 tests):
- **Contract completeness**: for each §5 row — drive the control (mouse or keyboard), capture the emitted `EngineCommand` from `window.__engine.command.apply`, assert structural equality with the spec 15 §11 Zod schema + expected params (state-WYSIWYG, spec 17 §6.1).
- **Keyboard parity**: for every transport/tool/header control with a spec 16 binding, button-click and shortcut must emit identical commands (§6.4).
- **Preview-commit discipline**: drag a clip, assert no `stateChanged` events during drag, exactly one commit command on release, cancel path emits nothing (§5).
- **Panel toggle routing**: snap/link/zoom toggles change UI store state and never emit commands (spec 16 §0.2 split).
- **Inspector tabs**: per-tab field edits emit the right `update*` command with coalescing (one command per slider release).
- **Deliver page**: `exportFCPXML` button emits the §4.3.74 command and the artifact lands in `CommandResult.data`.
- **A11y floor**: roving tabindex, tablist arrow keys, slider `aria-valuetext` spot checks, **F6 cycling, `aria-activedescendant` grid navigation, Shift+F10 menus, state-row presence per panel, save-chip event pairing (§6.3)** (the spec 17 §13A.2 a11y spot suite; axe-core pass in CI).
- **Context menus**: every §4.9 menu opens via both right-click and Shift+F10; every item emits its mapped command (or (UI) store mutation).
- **Cursor grammar**: the §5A cursor table asserts via computed style on synthetic hover (a spot-check row per class, not all 16 in CI).
- **Sample project (§4.10)**: loads via `loadProject` with the committed fixture; empty-state CTA + cheat-sheet footer both reach it — same fixture as spec 17 §13A.6, never forked.
Mouse-drag tests are reserved for the translation layer itself (hit-testing, thresholds) — everything else asserts through commands, per the UI-interaction-tax rules (spec 17 §2.5 / SKILL.md).

**Review loop — annotakit-for-app charter (Round 15 amendment, N-note):** the mock's n (annotakit) review loop — C/R pin-comment threads on the review surface, digest/export, optional GitHub-issue mirror — is chartered for the APP build (ARCH-R15 §4 impact map + §2.6 punch list; SCOUT-R15-D §8): a **config change** (review-surface wiring + `ANNOTAKIT_GH_TOKEN`), **NOT a port** — the app re-uses the same review infrastructure the 14 mock review rounds rehearsed (the mock is ported at A3 and retires as a repo after A7; the review loop outlives it). Tier-3 tests stay Playwright — the review loop is human-in-the-loop UX review infrastructure, not a test tier. **(R23/D24 re-tag: the app-side config lands at w1-entry — the human test rounds' review surface; the A3/A7 labels above are the R15-era phase lineage, resolved via `IMPLEMENTATION-PLAN.md` §7's lineage table.)**

```bash
# Run Tier 3 shell tests only
npx playwright test tests/ui/shell --project=chromium
# The full three-tier run per module (this module: Tier 3 + shared Tier 1 helpers)
npx playwright test tests/ui/shell && npx vitest run tests/unit/shell-selectors
```

## 13. Code References

| Reference | Path | What it provides |
|---|---|---|
| **UI mockup (visual/layout reference)** | `ui-mock/davinci_resolve_ui_mock.html` (this repo) | Region structure, reference dimensions, panel inventory, icon language, theme values, behavior demos (§2.1) — reference only, not copyable code |
| **cloudcut-nle (UX/app-scope reference — Round 8)** | `github.com/frejogochukwuout/cloudcut-nle` main branch, `src/components/nle/` + `src/hooks/` + `src/lib/` | The UX-surface reference set: `use-timeline-drag.ts` (281 LOC drag machine — the best single file), `nle-constants.ts` (snap constants), `shortcut-registry.ts` (525 LOC priority+condition architecture), `MediaPool.tsx` (grid/list/sort/a11y), `TrackHeader.tsx` (affordances minus recording), `Viewer.tsx` (chrome only), `InspectorPanel.tsx` (selective — field grids/quick-seek good, store-mutation bad), `ExportDialog.tsx` (modal+progress). **Avoid**: stores/bridge (`nle-store.tsx`), mixer/color mock panels, vendored `src/freecut/` — the anti-patterns our Decision 9/10 exist to correct |
| **cloudcut UX-spec (source material)** | `docs/ux-spec/` on branch `ux-spec` (v1.3.5, 28 files) | The v1.1 amendments' source (state rows, context menus, a11y floor, error UX, visual language, perf budgets — SCOUT-R8-C §2 matrix); integrated ours-wins, contradiction register C1-C25 recorded in the scout report |
| OpenCut-classic shell patterns | `apps/web/src/app/` + `components/ui/*` | Panel wiring conventions, shadcn-style primitives, DegradedRendererBanner placement (spec 00 §5) |
| OpenCut-classic timeline (in-shell region) | spec 05 §16 inventory | The timeline-area internals this shell frames |
| FreeCut per-element op UI | spec 05 §18 inventory | Trim/stretch/fade handle components consumed by §5's contracts |
| **nle-engine** | — | **No shell code exists** (engine has no React UI beyond its test harness page) — the shell is greenfield |
| **shell-mini (first MVP, R19)** | `ui-mock/shell-mini/` (this repo) | The §16 MVP: compact shell + timeline whose ops track the OT seam map (`docs/OT-SEAMS.md`); deviations register in its README; 355 vitest (sealed) + the R23 seal docs (`CORE-SEAMS.md` 26 seams; `LAW-NET-INVENTORY.md` the corpus census) + live annotakit review surface |
| **nle-ui (the productized package)** | `/home/z/my-project/nle-ui` (the private-source package; the app pins it via `vendor/nle-ui` @ `fc4cc35`) | The full-shell chrome family productized: `AppShell` + the four prop slots (`timelineRegion`/`mediaDragSource`/`programMonitor`/`exportRequest`), Toolbar2/MediaPool/Viewer/Inspector/AppDock/StatusStrip/ToastRegion/CheatSheet, the mixer family (ChannelEditor — the F3 real-gain slider), Color/Deliver pages; **674 tests** (37 suites, 674/674 run live at the R24 module card) + 74 Storybook stories, engine-free by law (the boundary script); the D29 seams (the saveState lifecycle, the DeliverPage `exportRequest` + the 5 type-only deliver shapes, the per-scene grade sidecar + `setGrade`, the retryJob blob-URL revoke); F3/F7 the real-gain laws + the kind-aware mute-all pin; the §10 `shell-*` testid family emitting (70 sites / 62 names, live-counted) |
| **opencut-timeline** | `src/components/timeline/` (40 files / ~8,600 LOC — **THE canonical React timeline UI tree, D25/D26**; hosts the W11 wire-dispatch layer — 24 routed + 6 exception verbs, `WIRE_COMMAND_TYPES` + the M49C coverage gate) + `src/lib/timeline/` (core) + `src/app/view/` (the `/view` miniature editor shell: library panel + compositor preview + the timeline; deterministic fixtures; `window.__VIEW_TEST__` hooks; 386 in-page + 150 real-mouse suites — **536/536** @ `ded43c4` [code pin `c15a629` — the last 3 commits docs/runner-artifacts only, src-diff empty]) | The timeline-area internals this shell frames (spec 05 §16.5) + the gold-sample host for the mini theme (D25.4 — `/view` at mini theme once both grammar halves land) + the DOM-vocabulary source of the timeline units (`data-test=`, 68 sites — D26.5) |

> Reconciliation policy: `19-code-references.md` (canon hierarchy; cloudcut-nle = UX/app-scope tier-3 reference like nle-engine is for the engine side).

## 14. Relationship to Other Specs

- **spec 00** — master decisions; this spec instantiates Decision 9's "UI is an `EngineCommand` generator + view renderer" (§6) and the React-19 UI-shell row of the stack.
- **spec 05** — owns everything inside the timeline area; this spec fixes the frame, the 160px header column, and the tool-enum parity.
- **spec 15** — the entire §5 table is a consumer of the 78-type union; the export commands (§4.3.74-76) surface on the Deliver page.
- **spec 16** — shortcuts and shell buttons are two views of one contract; §0.2's UI-extension split is normative here (§6.2).
- **spec 17** — §12's Tier 3 suite; `data-testid` conventions (§10).
- **spec 08** — the Color page hosts its panels (simplified single-column).
- **spec 10 / 11** — the Deliver page hosts FCPXML + cloud-master export UX.
- **spec 09** — the inspector's parameter surface is capped by the project model; `ProjectUIState` persistence (spec 09 §3.1) stores shell prefs (panel visibility, zoom) opaquely and never gates WYSIWYG.
- **spec 19** — canon hierarchy + reference-repo map for this stream (§13).

## 15. Open Questions (for the seal round)

1. **Source preview** (mockup dual-viewer): does v1 need media-asset playback before timeline insert (mark in/out on source)? The v1.1 fallback source-preview mode (§4.3) is the interim — a command-surfaced source monitor remains the v2 question (§8.5).
2. ~~**Context-menu depth**~~ **RESOLVED (v1.1)**: §4.9 enumerates all five menus, every item command-backed; remaining question is only the Rename-media command's final wire shape (spec 15 seal call).
3. **Color page layout**: single-column simplified stack vs Resolve's node-graph-lite; spec 08 §15's port targets decide the floor, this spec decides the arrangement.
4. **Custom h-scrollbar / audio meters / metadata panel**: all deferred (§8.11/8.13/8.8) — confirm the deferral list at seal.
5. **Touch/tablet**: out of scope for v1 (master spec §5 matrix); pointer events chosen so a later pass is possible without contract changes.

---

**End of `18-ui-shell.md`.** Next: `19-code-references.md`.

## 16. shell-mini — the first shippable MVP (R19 amendment)

**Status:** v1.3 amendment (Round 19, user directive). This section promotes
`ui-mock/shell-mini` from "a design mock" to **the first MVP of the NLE app**
— the minimal-but-complete editing surface that ships BEFORE the full shell
(§3-§15) and is designed from the start to EMBED into host workflows.

### 16.1 Positioning

The full shell (this spec's §3-§15) is the desktop-class target. shell-mini
is the same product's minimal cut: every ESSENTIAL NLE operation is live
(see 16.2), the chrome is a compact three-region layout (pool · viewer +
transport · timeline, plus inspector), and the whole surface tracks the
opencut-timeline seam map (`ui-mock/shell-mini/docs/OT-SEAMS.md`) so the
mock's timeline logic is a projection of the editing-domain engine, not an
improvisation. (The R23 seal widened the map to the WHOLE surface —
`docs/CORE-SEAMS.md`, 26 seams: timeline S1-S10, engine S11-S15, audio
S16-S17, project-asset S18-S21, chrome/view S22-S26 — plus the 5-class
store partition, the C0-C4 transport map, and the audited-absent register:
every seam states its transport landing.) When the real library lands, the
ops rename, they do not redesign (OT-SEAMS §3, the swap path).

shell-mini is additionally the EMBEDDING vehicle: the app is a **window
onto a project** (track binding: one bound video + one audio lane, or a
single video lane in video-only mode), with a host-injected binding lock —
an embedded environment pins the pair and the chrome reduces accordingly
(hidden track heads, no selector). The topbar is the documented downstream
customization point (exit/parent/export handshakes live in the host).

### 16.2 The MVP surface (iterated R18e → R22 through the live review loop)

> **R22 (user directive — the full drag-machinery retirement):** the drag law
> is the verbatim **R18k pointer law** and NOTHING else: the mover CLAMPS
> between same-track neighbors (the preview is the commit; one plain history
> entry); the magnet is **single-edge, live-field** (the moving clip's LEFT
> edge; targets = neighbor edges + the LIVE playhead; nearest within 12px
> wins); the UP seals the **last previewed** state. RETIRED (by explicit user
> order, 2026-09-07): both-edge magnet + frozen gesture field, trim ghost
> edges, commit-at-UP, pending-gesture windows, tick freeze, scrub-surface
> edge auto-scroll. The paragraphs below that describe the R19 law are kept
> as HISTORY — the operative law is this notice + `docs/OT-SEAMS.md` rows
> 1/2/3 (R22 state).

- **Timeline**: 9-step zoom ladder; ruler scrub + playhead drag; ripple edit
  (delete/trim follower laws, snapshot-idempotent previews); RH cut styles
  `[`/`]` at the playhead; split `S`; snap = edit-point magnet (pro-NLE
  convention; per the R22 notice: single-edge, live-field); trim-as-edge
  (14px zones, 2px accent affordance, trim-mode shade; per the R22 notice:
  the media bounds are the law, the ghost-edge paint is retired);
  filmstrip ↔
  color-block bodies; real waveforms; pool→timeline DnD (gap-fit law).
- **~~R19 drag law~~ (RETIRED — see the R22 notice above):** free drag with
  insert-push + commit-at-UP were both retired by user directive (R21
  partial revert + R22 full retirement); the operative law is the R18k clamp
  (neighbors frozen; one entry; programmatic moves follow the OT wire law —
  overlap ⇒ refuse + toast).
- **Track binding window** (16.1): marker badges / binding selectors /
  hidden-when-locked head law; empty-lane + head click select the track
  (the inspector's track card).
- **Viewer + transport**: RH grammar ([tc | play | aspect] under the
  stage); **the scrub bar row** (full-width, center-aligned with the play
  button; drag/click + keyboard slider semantics) and seek controls
  (to-start; to-current-clip-head with edit-point walk-back).
- **Layout states**: pool/inspector collapse to whole-surface 30px rails;
  timeline minimizes to a live pill strip; viewer-max composes all three
  with exact-layout restore.
- **Cross-cutting**: undo/redo (snapshot family), keyboard surface
  (S/[/]/Del/±/0/Home/Space/Esc with the form-control skip law), honest
  toasts at every refusal, WCAG-aware focus/aria on interactive surfaces.

### 16.3 Contract relationship

1. **Canon hierarchy unchanged**: where shell-mini and this spec disagree,
   this spec wins and the delta is REGISTERED — the live deviation
   register is `ui-mock/shell-mini/README.md` §"What's OUT" (39 entries
   through the R22 drag-law retirement; 27 at R19), the seam reasoning is
   `docs/OT-SEAMS.md` (timeline ops) + `docs/CORE-SEAMS.md` (the whole
   surface, R23). The mock does
   not amend this section silently; the R19 round folded the wave
   feedback into this section by explicit user directive.
2. **Interaction contracts (§5)**: the mini's ops are the §5 table's
   minimal subset, shaped to the OT command surface (OT-SEAMS §1); when
   the wire protocol's editing subset ships, the mini's store actions
   become command emitters.
3. **Testing (§12 / spec 17 Tier 3)**: the mini carries 355 vitest tests
   (8 files — the R22 drag-machinery retirement's 333 + the review-loop
   and seal-round nets; the law corpus census + the testid census live in
   `docs/LAW-NET-INVENTORY.md`; the `mini-*` `data-testid`
   grammar per §10) + the live annotakit pin-comment review surface; its
   gates (tsc, vitest, vite build, storybook build) run on every change.
4. **The full shell (§3-§15)** remains the design of record for the
   desktop-class app; the mini's compact chrome is a REGISTERED scope cut,
   not a competing design. Panel vocabulary (pool/inspector/viewer/
   timeline) is shared so the mini grows INTO the full shell rather than
   beside it.
5. **The MVP vehicle (R22 amendment — the finality round; phase tags
   re-keyed R23 per D24/D25):** the first
   FULLY-WORKING MVP is the **crawl app** (the crawl's K1-K4 ladder —
   `IMPLEMENTATION-PLAN.md` §2; spec 14 retired R23, its §3.1 C0-C4 tags
   resolve via the stub's §-redirect table): the
   shell-mini grammar rendered by `nle-ui`'s `MiniShell` + the app repo's
   engine-wired surfaces (the timeline is **OT's canonical React tree
   mirrored** per D25/D26 — the app's `timeline-port` is a census-governed
   converging mirror: 39 mirrors of OT's 40 component files + the
   EngineMount host; the D25.2 props-upstreaming retired as the mechanism,
   converted to the S-ot carrier-reduction work order; EngineMount stays
   as the app adapter over the canonical tree's injection points — the W11
   `wire` prop + save/load; engine
   composition via ProgramCanvas, WDC audio) — the mini MOCK is the design
   reference,
   law register (its test net re-expressed as the crawl app's acceptance
   corpus — K3's acceptance list), and live review surface until the
   crawl app reaches parity
   (the census discipline per D26.4; retirement decision **post-K4 / post-w1**). The
   mock itself
   does not ship. The grammar itself lands ON the canonical tree in two
   halves (§0 GAP rows; D25.3): tokens at w1, structure in the crawl
   window; **the gold sample is OT's `/view` runner at mini theme, and
   the w1 side-by-side is app-vs-OT-runner — two renderings of ONE tree**
   (D25.4).

