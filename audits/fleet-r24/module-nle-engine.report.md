# Module Card — nle-engine (R24-1b ground-truth audit)

**Auditor**: sub-agent R24-1b · **Date**: 2026-09-07 (R24 round) · **Mode**: read-only (no repo files mutated; one report file written)
**Repo**: `/home/z/my-project/nle-engine` · **Baseline**: R23 pin `b8c6f88` (440 tests) → **HEAD `5036387`** (main, synced, clean tree)

---

## 1. VERIFIED STATE

- **HEAD**: `5036387c7a9cdb969f5234754c3a012bfed58187` on `main` (`git rev-parse HEAD`); `git status --short` empty. Commit: "Fleet coherence (R9 W-A): vendor/opencut-timeline re-pin a4e971d → c15a629 … Submodule-ONLY delta (no engine source change). 458/458 green against the new pin."
- **Test count — NOT live-run; authority = commit evidence + exact static match.** Live run infeasible in this sandbox: `node_modules/` absent (npx vitest failed `ERR_MODULE_NOT_FOUND`) AND both submodules uninitialized (`git submodule status` prefixes `-`, i.e. not materialized; `vendor/opencut-timeline/src/lib/timeline/` does not exist on disk). Static census: sum of `^\s*(it|test)(` across all 13 vitest files = **458 exactly** (per-file: bridge-seams 113, nle-bridge 96, planner 52, timeline-math 42, transform-resolver 40, load-validation 32, video-sync 31, undo-serialize 15, persistence 13, realtime-midi 8, render-abort 9, timeline-edit-ops 4, api-surface 3). Chain of claims: `8a0b7fe` "+17 pins (bridge-seams, 440→457) … 457/457, tsc 0" → `4b2dfd1` (+1 pin) → `5036387` "458/458". Claimed 458/458 = **verified by static count**; the live-run venue is GHA CI (`.github/workflows/ci.yml` — typecheck + vitest jobs, private submodules materialized via `CI_VENDOR_URL_PREFIX` PAT).
- **Submodule pins** (gitlinks, `git ls-tree HEAD vendor/`):
  - `vendor/opencut-timeline` @ **`c15a6294cee9ac417c3d2aa3661c7120a2e69ba7`** (re-pinned a4e971d→c15a629 by `5036387`; the OT W11 complete-UI round — wire-dispatch engine widenings + W10F R2-R4 controller hardening).
  - `vendor/web-daw-core` @ **`494f6ff7fadd2f9f71461f3baf0f0f70972e4e71`** (re-pinned f446512→494f6ff by `5e5bbe4`, "A6: barrel consumption reality + hasMasterChain dropped — docs-only for consumers").
  - Neither working tree is materialized in this audit sandbox; pins verified at the gitlink level only (submodule contents unread here — OT claims cited from commit `5036387`).
- **package.json**: `nle-engine` v0.2.1; scripts `test:vitest: vitest run` (package.json). `mediabunny@1.50.8` is the sole engine runtime dep (lazy-imported behind `src/lib/nle/export/`).

## 2. THE LANDING LIST since b8c6f88 (9 commits: 7 + 2 merges)

**Fleet-coherence re-pins (2):**
- `5e5bbe4` — re-pin vendor/web-daw-core f446512→494f6ff (A6 barrel docs-only; docs-only for consumers, all deep-import).
- `5036387` — re-pin vendor/opencut-timeline a4e971d→c15a629 (OT W11 complete-UI round: HeadlessTimelineApi attach + recorder + WIRE_COMMAND_TYPES + applyBatch data.results + keyframe lockPreCheck; W10F R2-R4). Submodule-ONLY (git stat: `vendor/opencut-timeline | 2 +-`).

**App-stream feature + review rounds (2) — the engine's only source deltas:**
- `8a0b7fe` — **feat(W2.5 D29)**: effects sidecar joins the composition seam — honest CSS-filter preview subset. `CompositionElementParams.effects` + `buildElementFilterString()` (Gaussian Blur → blur(radius px), default 4, non-finite→4; Vignette/Glow/Film Grain/Motion Blur = honest skip; join with spaces; identity ''). Painter applies inside save/restore; Safari<18 graceful no-op. Scene GRADE stays consumer-side final pass BY DESIGN. +17 pins, 440→457. (stat: composition-frame.ts +67, bridge-seams.test.ts +184/−21.)
- `4b2dfd1` — **R8-REV #5 (P4)**: Gaussian Blur radius clamps at 0 (negative finite radius → invalid CSS → whole `ctx.filter` no-ops). +1 pin → **458**. (stat: composition-frame.ts +5, bridge-seams.test.ts +4.)

**Docs/wrap rounds (3) + merges (2):**
- `e8768e6` — seal-round worklog entry (A1/A2/A4 audio-law wave).
- `e0858fa` — docs(wrap): S3 seam-audit + RR1/RR2 rounds closed (RR2: 0 P0/P1/P2); PLAN ledger + S3/RR sections; HANDOFF rewritten (G1/G2 next); SKILL laws 71-77. (stat: HANDOFF/PLAN/SKILL/worklog only.)
- `2dbae80` — worklog: sub-agent round entries (S3-A/B/C + RR1-A/B + RR2 records).
- `4bebf43`, `0208027` — merges of origin/main (the parallel stream).

Note: the W2.5/R8-REV/R9 labels are the **app stream's round numbering** (D29/R8/R9); the engine's own `.agents/` docs were last rewritten at `e0858fa` and do NOT yet record the last three commits (grep: no W2.5/D29/R8-REV/R9-W-A mentions in `.agents/` or `worklog.md`) — meta-doc lag, not a code problem.

## 3. THE SEAM SURFACE NOW

### (a) The bridge family — `src/lib/nle/bridge/` (11 files, 4,334 LOC)
- `scene-to-segments.ts` — the flattener: `buildAudioSegments` (:369), `opencutSceneToAudioSources` (:561), `OpencutFlattenOptions` (:547, `maintainPitch` at :246/:305), `GainAutomationPoint` (:90), `NleAudioSegment` (:289), `StructuralAudioSource` (:221). Fades clamp per the RR1-A SPAN law; `el.retime?.maintainPitch → source.maintainPitch` (W2) at :611/:638.
- `composition-frame.ts` — the visual twin (N1): `CompositionElementParams` (:103 — opacity/speed/transitionOut/text/**effects** :119), `CompositionElementEffect` (:124), `CompositionDrawOp` (:141 — `filter` field :161), `buildElementFilterString` (:223, W2.5), `buildCompositionFrame` (:300, pure math), `paintCompositionFrame` (:409, thin Canvas2D). Type-only opencut imports (:100).
- `realtime-engine.ts` — `createRealtimeEngine` (:74), `RealtimeEngineHandle` (:49), `RealtimeEngineOptions` (:58); W1 real `onMeter`/`onBusMeter`.
- `segment-strip-adapter.ts` — `SegmentStripAdapter` (:480), `RETIME_CACHE_CAP_BYTES` 96 MB (:470), WSOLA domain guard [1/32,32].
- `scene-mixer.ts` — `SceneMixer` (:126), `NoteEvent` (:66), `MaterializedGraph` (:102), `REALTIME_GRAPH_OFFLINE_REUSE_ERROR` (:119).
- `conversions.ts` — `dbToLinear` (:56), `audioSceneToBridgeSegments` (:104), `bridgeSceneSettings` (:201).
- `av-link.ts` — `expandAVLinkIds` (:107), `expandAVLinkMoves` (:170) (N4).
- `transition-inputs.ts` — `transitionInputsFromScene` (:126), `applyTransitionInputs` (:210) (N3).
- `scored-notes.ts` — `ScoredNoteClip` (:63), `buildNoteEvents` (:136), `rebaseTempoMap` (:180) (D10 MIDI/BGM).
- `fade-curve.ts` — curve constants/laws; `mixer-track-model.ts` — `MixerTrackSettings`/`MixerSceneSettings`/`anySoloed`.

### (b) The headless API — `src/lib/nle/headless/api.ts` (2,758 LOC): does NOT attach the OT wire surface
- The engine's own `NleHeadlessApi` (interface :111-133) is the freecut port: `ready`, `renderTimeline`, `renderProject`, `renderFrame`, `dumpLayout`, `editProject` (JSON-RPC batch + $ref), `normalizeProject`, `probeMedia`, `createProject`. **Zero attach of the OT W11 widenings**: grep of `src/` + `tests/` for `WIRE_COMMAND_TYPES|HeadlessTimelineApi|applyBatch|lockPreCheck` = 0 hits (the only "recorder" hits are the audio test's `recorderCtx` in nle-bridge.test.ts:2673+).
- **What the c15a629 re-pin actually makes available**: the W11 wire-dispatch surface is importable from the VENDORED tree (`opencut-timeline` vitest alias → `vendor/opencut-timeline/src/lib/timeline/`, vitest.config.ts) — i.e. it is available AT THE ENGINE'S TEST SEAM and to any consumer that materializes this repo's submodules. The engine deliberately consumes the scene STRUCTURALLY only (type-only imports + one runtime fn; "engine src/ + tests/ have ZERO wire usage (grep-verified)", worklog S3-A entry). So consumers gain a wire-dispatch API surface (attach/recorder/command-type registry/batch results/lock precheck) one vendor hop away, with zero engine mediation — coherent with D8's S/G/E layering; the RR1-A-era S3 audit re-verified no bridge assumption breaks on wire rejections.

### (c) The export pipeline — `src/lib/nle/export/` (5 files, 1,785 LOC)
- `orchestrator.ts` (936 LOC) — `renderCompositionCore` (:187): renders via caller `renderFrame(frame)→RGBA` (Player's `renderFrameOffscreen`), ImageData→OffscreenCanvas→mediabunny `CanvasSource.add`; composition-vs-export resolution seam; codec ladder + CODEC_FALLBACK warnings. Consumes `planAudioMixdown`/`renderAudioMixdown`/`SceneMixer`/`softClipAudioMix` (audio-mixdown.ts, orchestrator :62-73) + `scoreClipEndSec` for the A/V ctx-sizing max rule (D-4, :71-73). AbortSignal threaded end-to-end (R-D rest).
- `settings.ts` (368) — codec/container validation + fallback selection; `contracts.ts` (92) — `NleExportSettings`/`NleRenderWarning`/`NleRenderProgress` (FX-4 home); `index.ts` (20) re-exports settings+orchestrator+audio-mixdown. mediabunny lazy-imported, the only runtime dep (export/index.ts header). Stage 3 (worker/OPFS) + Stage 5 (smart-copy) still sequenced in gaps/audit/C-export-encode.md.

### (d) Change requests filed by the app (the D30 R10 list) — engine-queue status
- **CSS-filter preview widening**: ✅ **LANDED** — `8a0b7fe` (W2.5 D29) + hardened `4b2dfd1` (R8-REV #5). 18 pins.
- **maintainPitch through the retime patch**: ✅ LANDED (pre-R23, W2): flattener threads `el.retime?.maintainPitch` (scene-to-segments.ts:611/:638) → adapter WSOLA path (WDC `retimeChannels` @ 494f6ff). Not re-filed since.
- **Transform sidecars in CompositionElementParams + painter**: ❌ **NOT landed, NOT filed as a PLAN row** — documented as the future extension only: "v1: no spatial transforms in the opencut model — future transform sidecars extend the dest" (composition-frame.ts:70-71) and "op.dest is v1-inert data kept for the future transform extension" (:93-94).
- **Scene grade promotion into composition/export**: ❌ **NOT landed — declined at the engine seam by design**: "The scene GRADE stays a consumer-side FINAL PASS by design (hue-rotate/saturate are non-linear under per-element alpha compositing — per-element grade filters ≠ composited grade; the app host composes first, filter-draws once)" (commit `8a0b7fe`). No PLAN row.
- The engine's PLAN queue sections (R7 N1-N5/W1; R1-R3; S3/RR) predate the app's D30 stream — **no D30/R10 section exists in `.agents/PLAN.md`**; the D29 item arrived as a commit, not a filed row.

### (e) The color instruments (spec 08's S-engine row)
- **Zero progress — still zero engine code** (grep `powerWindow|secondaryQualifier|vectorscope|scopes` in `src/` → only: the param-metadata comment at effects/pipeline.ts:12 listing `secondaryQualifier, powerWindow` among planned effect params; the wire-schema strings `gpu-power-window`/`gpu-secondary-qualifier` in headless/api.ts:1509/:1515 — the byte-identical FreeCut wire contract, NOT implementations). The engine's P2 backlog still lists "scopes (waveform/vectorscope)" (PLAN.md:88-92). 44-effect registry verified: 43 ids in effects/pipeline.ts + `gpu-lut` in effects/lut.ts:321.

## 4. THE QUEUE (the engine's own next-step list)

From `.agents/HANDOFF.md` "Suggested Next Steps (in order)" (:66-79) — still the live tracker (last rewritten `e0858fa`):
1. **G1 — the 4 deferred upstream test ports** (wdc HANDOFF #1): `engine.test.ts`, `engine-metronome-automation`, `engine-param-channel`, `dsp-aux-sends`, `wam-effect.test.ts` → nle-engine-side ports onto scene-mixer (W1/W2 vertical is the template).
2. **G2 — the async pre-retime queue** (wdc HANDOFF #3 / B-P2-1): adapter's sync WSOLA compute on the play edge is O(span); design round FIRST (design-w2 §4 sketch, 5 seam risks in S3-B).
3. **N5 — real media decode** (registry + decode → VirtualMediaAsset; P1.9 DEPRIORITIZED per D6 user directive — PLAN.md:48, "only if a programmatic blind spot appears").
4. P3 register cherry-pick + P2 feature backlog (PLAN.md:85-98: ShapeItem SDF, Lottie, text motion, scopes, CPU transition renderers, etc.).

## 5. CENSUS FACTS

- **vitest files**: 13 `.test.ts` (2 top-level: `nle-bridge.test.ts` [96 tests, 3,134 LOC], `nle-bridge-realtime-midi.test.ts` [8]; 11 under `tests/vitest/engine/`: bridge-seams 113, planner 52, timeline-math 42, transform-resolver 40, load-validation 32, video-sync 31, undo-serialize 15, persistence 13, render-abort 9, timeline-edit-ops 4, api-surface 3) + `api-surface.frozen.ts` (data, not tests). **Total = 458** (matches claim).
- **src/lib/nle**: 62 `.ts` files, **54,791 LOC** (`find`+`wc -l`). `bridge/` = 11 files / 4,334 LOC. `export/` = 5 files / 1,785 LOC. `headless/` = 2 files (api.ts 2,758 + timeline-adapter.ts).
- **API-surface freeze**: `tests/vitest/engine/api-surface.frozen.ts` — **455 names, FROZEN** (D9, opened 453 @ 2026-09-04; +2 additive: `clampAuthorFadeToSpan` :155, `foldVolumeKeyframesToAutomation` :224; last touched `c6dc8f5`). **Unmoved by the W2.5 round**: `buildElementFilterString` lives in `bridge/composition-frame.ts`, which is NOT re-exported through the barrel `src/lib/nle/index.ts` (export list :19-200 has no `bridge/` entries — only `audio/realtime-bridge`'s `RealtimeAudioBridge`); the bridge is app-level G-layer code (D8), deep-imported by consumers. Layer fence: `scripts/lint-layering.mjs` + `gaps/audit/LAYER-SNAPSHOT.txt` (52 pinned edges), both CI-wired.
- **CI**: `.github/workflows/ci.yml` — typecheck + vitest + milestones jobs, push-triggered, private submodules via PAT rewrite.

## 6. SPEC-FACING STALENESS (nle-core-spec §0 rows vs. live engine — top findings)

1. **Pin + count rows, all three files**: `01-core-engine.md:13`, `03-playback-engine.md:15`, `04-renderer-color.md:15` all pin "nle-engine @ `b8c6f88` — 440/440". **Contradicted**: HEAD `5036387`, 458/458 (+18: W2.5 +17, R8-REV #1). 
2. **Vendor-pin rows**: `01-core-engine.md:13` "Vendors OT @ `a4e971d`, WDC @ `f446512`"; `04-renderer-color.md:15` "vendors OT @ `a4e971d` + WDC @ `f446512`"; `03-playback-engine.md:15` "OT @ `a4e971d`" — **contradicted**: OT @ `c15a629` (5036387) and WDC @ `494f6ff` (5e5bbe4). (Spec 03's separate WDC row @ 494f6ff is correct.)
3. **Missed landing — the W2.5 effects sidecar**: `04-renderer-color.md:15` describes the N1 composition-frame family as `buildCompositionFrame` + `paintCompositionFrame` only; the now-landed `CompositionElementParams.effects` + `buildElementFilterString` (the CSS-filter preview subset, a renderer-adjacent feature) and the R8-REV radius clamp are absent from 04 §0 BASE (and from 01 §0's N1-family row at :13). Not contradicting, but the row undersells the surface.
4. **Consumer-lag note superseded**: `03-playback-engine.md:19` "the app's engine vendor pin (`4ef0147`) lags the engine HEAD (`b8c6f88`) — one commit" and `:28` "trails `b8c6f88` — one commit" — the delta is now 9 commits (`4ef0147`…`5036387`), and the app's own D30/R10 stream has moved past `70e99f0` (per the app-driven W2.5/R8/R9 labels on engine HEAD); the "one commit" figure is stale, the re-pin queue item presumably live/satisfied app-side (needs the app-side R24 audit to settle).
5. **Color-instruments GAP row — still ACCURATE (not stale)**: `04-renderer-color.md` GAP row 1 "zero engine code today (re-verified @ `b8c6f88` …)" and `01-core-engine.md:21` GAP "zero scopes code today — the effects pipeline's powerWindow/secondaryQualifier GPU-effect params are the seed" — re-verified TRUE at `5036387` (grep: only pipeline.ts:12 comment + headless/api.ts:1509/:1515 wire strings; PLAN P2 backlog still lists scopes). Only the pin reference inside the row (`b8c6f88`) is stale.
6. **Frozen-surface count row — still accurate**: `01-core-engine.md:13` "now **455** via two D9-legal additive names" — verified: 455 names in frozen.ts, unmoved since `c6dc8f5` (W2.5's `buildElementFilterString` is bridge-level, outside the barrel). No contradiction.

---

*Authority note: the OT @ c15a629 W11 surface claims (HeadlessTimelineApi attach + recorder + WIRE_COMMAND_TYPES + applyBatch data.results + keyframe lockPreCheck) are cited from commit `5036387`'s message — the submodule tree is not materialized in this sandbox and could not be read directly. Everything else is file/line-verified against the live tree at `5036387`.*
