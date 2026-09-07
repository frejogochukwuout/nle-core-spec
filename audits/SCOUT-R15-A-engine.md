# SCOUT-R15-A — nle-engine deep scout (HEAD `f526e67`, range 624a76b..f526e67 = 61 commits)

> **Agent**: R15-S1 (scout, read-only). **Date**: 2026-09-05 (sandbox clock 2026-09-04).
> **Method**: every claim below verified by opening files / running gates in the sandbox (vitest
> run, tsc, lint-layering, 2 probes, full browser milestone run). Commit messages and READMEs
> were used only as pointers, never as evidence.
> **Repo state**: clean at `f526e67`, submodules materialized at pins
> `vendor/opencut-timeline@3420b5f` / `vendor/web-daw-core@5243c49` for the runs.
> **Working-tree note**: `bun install --frozen-lockfile` (958 pkgs) + `git submodule update --init`
> were performed in this session to run the gates; no tracked file was modified.

---

## 1. Test + CI state (exact)

**Test venues (3):**

| Venue | Entry point | Count at HEAD | Verified this session |
|---|---|---|---|
| vitest (Node, jsdom) | `vitest.config.ts:21-22` (`include: ['tests/vitest/**/*.test.ts']`), `package.json` script `test:vitest` | **274** = 37 bridge + 237 engine | engine suites `npx vitest run tests/vitest/engine` → **237/237**; bridge suite → 36/37 at default 30s timeout, **37/37 with `--testTimeout=240000`** (H10 "renders per-track content…" times out purely on this 4GB sandbox — `vitest.config.ts:12-14` documents ~1.8 GB anon-rss per audio-render worker; CI's 16GB runner is the authoritative venue) |
| browser milestones (Playwright+WebGPU) | `scripts/run-nle-tests.mjs` against `src/app/page.tsx` (`MILESTONES` array, `src/app/page.tsx:129`) | **31 milestones / 265 rows** | fresh full run at HEAD: **265/265, 0 failures, real WebGPU** (`isSwiftShader: false`), ~8 min wall. Runner pins `EXPECTED_MILESTONE_COUNT = 31` and `MIN_TOTAL_TEST_ROWS = 260` (`scripts/run-nle-tests.mjs:41,51`) |
| engine probes (bun) | 9 scripts, run inside the CI vitest job | 9 probes | spot-verified `probe-p114-undo.ts` → **318 PASS / 0 FAIL**; `probe-fx4.ts` → ALL GREEN |

vitest per-file counts (rg `it(`/`test(`): api-surface 3, load-validation 32, persistence 13,
planner 52, render-abort 9, timeline-math 42, transform-resolver 40, undo-serialize 15,
video-sync 31 = 237; `tests/vitest/nle-bridge.test.ts` 37 (12 describe groups, C1/H8–H17/CR-A —
`tests/vitest/nle-bridge.test.ts:197-1393`). `tsc --noEmit` → exit 0 (local).

**CI** — a single workflow `.github/workflows/ci.yml` with 3 jobs:
- `typecheck` (`.github/workflows/ci.yml:31-58`): submodule materialization via repo variable
  `CI_VENDOR_URL_PREFIX` (PAT-authenticated URL rewrite, `ci.yml:39-53`) + `bunx tsc --noEmit`.
- `vitest` (`ci.yml:60-146`): `bun run test:vitest` + the 9 engine probes
  (`ci.yml:110-146`: p114-undo, p2s, fxa, crb, crc, fx2, fx4, rb-p1 output-gated, m30-fixture
  greps) + `node scripts/lint-layering.mjs` (`ci.yml:130`).
- `milestones` (`ci.yml:148-203`): Xvfb + SwiftShader Chromium + Next dev server on :3000 +
  `node scripts/run-nle-tests.mjs`, 90-min timeout, artifacts uploaded.

**Triggers**: push to main + workflow_dispatch, with `paths-ignore: ['*.md', '**/*.md', 'gaps/**']`
(`ci.yml:20-23`) — the last 2 HEAD commits (`ededd21`, `f526e67`) are docs-only and therefore
**never ran CI**. Documented green state: "CI: green through `508c838` (all 3 jobs, verified
2026-09-05); the rename run [`ab8d668`] is the one to confirm" (`.agents/HANDOFF.md:14-16`).
I could not poll the GitHub Actions API from this sandbox (no network to github.com), so
"green at HEAD" = *green through 508c838 + two docs-only commits after it*.

## 2. The vendored submodules

`.gitmodules` declares both: `vendor/web-daw-core` and `vendor/opencut-timeline`
(`.gitmodules`, 2 entries). Path aliases in `tsconfig.json` (`paths`):
`@/lib/daw/*` → `./vendor/web-daw-core/src/lib/daw/*`, `web-daw-core/test-harness`,
`opencut-timeline(+/*)` → `./vendor/opencut-timeline/src/lib/timeline(+…)`;
mirrored as vitest resolve aliases with an insertion-order warning
(`vitest.config.ts:25-52`). CI materializes both via the PAT URL prefix
(`ci.yml:39-53`, 77-87, 160-174).

**Every import site (rg over src/ tests/ scripts/):**

`opencut-timeline` — **NOT imported at runtime anywhere in src/**. Exactly:
- `src/lib/nle/bridge/scene-to-segments.ts:43` — `import type { SceneTracks, AudioElement,
  VideoElement } from 'opencut-timeline'` — **TYPE-ONLY**, explicitly designed: "uses TYPE-ONLY
  imports from the vendored opencut-timeline submodule — zero runtime dependency"
  (`scene-to-segments.ts:37-39`).
- `tests/vitest/nle-bridge.test.ts:45` — the **only RUNTIME import** (`mediaTime`,
  `TICKS_PER_SECOND`, `splitElementsOnTracks` + types) — the C1 compat pin
  (`nle-bridge.test.ts:194-260`).
- No script references OT (rg over scripts/ = 0 hits). Other src/ mentions are comments only
  (`bridge/mixer-track-model.ts:7,18`, `bridge/conversions.ts:42`).
- ⇒ the vendored OT is a **type/contract dependency + test fixture**, not shipped engine code.
  `tsconfig.json` `exclude` even lists `vendor` (typecheck covers it only via the alias).

`@/lib/daw` (web-daw-core) — **a real runtime dependency of src/** (7 import statements):
- `src/lib/nle/bridge/scene-mixer.ts:47-50` — `ChannelStrip`, `createOfflineEngine`,
  `createEffect` (runtime — the DSP graph).
- `src/lib/nle/bridge/realtime-engine.ts:29` — `buildMasterChain`, `allocAnalyserArrays`
  (runtime); `:28` type `EngineHandle`.
- `src/lib/nle/bridge/mixer-track-model.ts:37` — types only.
- `src/lib/nle/audio/realtime-bridge.ts:63` — type `EngineHandle` only.
- `tests/vitest/nle-bridge.test.ts:56,71,72` — runtime (`createOfflineEngine`,
  `web-daw-core/test-harness`, type `Track`).

**Pin staleness (measured against sibling clones):** OT pin `3420b5f` (W8-d, "379/379") is
**35 commits behind** OT HEAD `0412e41` (W9 round-2, 423/423) — `git log 3420b5f..0412e41 |
wc -l` = 35. WDC pin `5243c49` is **1 docs-only commit behind** WDC HEAD `374711c`.
(The R15-0 worklog's "53 commits stale" actually measured OT's own 4e39b67→0412e41 sync delta.)

## 3. The audio bridge (`src/lib/nle/bridge/`, 7 files, 2,078 LOC)

| File (LOC) | Responsibility | Key exports |
|---|---|---|
| `conversions.ts` (189) | The "one law, two consumers" pure converter: `TimelineData` → bridge segments + strip settings. Fades clamped to play span, crossfade handles → equal-power, folded volumeDb→level, masterBusDb→masterVolume, rate-aware pre-roll skip. Mirrors the Player's `_scheduleAudioSegment` law (`conversions.ts:17-41`). | `dbToLinear`, `preRollSkipSourceFrames`, `audioSceneToBridgeSegments`, `bridgeSceneSettings`, `BridgeSegmentConversion` |
| `fade-curve.ts` (174) | Freecut author-fade curve math (power curves through a user control point, curveX bias, 16-breakpoint piecewise-linear convention). Self-contained pure law module (`fade-curve.ts:1-29`). | `evaluateAudioFadeIn/OutCurve`, `clampAudioFadeCurve(X)`, `fadeCurveIsShaped`, `FADE_CURVE_RAMP_SEGMENTS` + bound consts |
| `mixer-track-model.ts` (191) | The **G-layer** of the S/G/E track model: `MixerTrackSettings` keyed by trackId (fader/pan/mute/solo/inserts/sends/outputBus/instrument), web-daw `Track` materializer, solo-coordination bit (`mixer-track-model.ts:1-35,109-191`). | `MixerTrackSettings`, `AuxBusSettings`, `MixerSceneSettings`, `defaultMixerTrackSettings`, `defaultAuxBusSettings`, `defaultMixerSceneSettings`, `toDawTrack`, `anySoloed` |
| `scene-mixer.ts` (380) | The conductor: materializes strips+buses on an engine (`materializeStrips`), schedules segments/notes, offline `renderOffline` on a caller ctx. Laws: H4 update-after-construct, one-engine-per-instance (CR-A #6 throw), idempotent materialization, canonical bus send/return wiring, solo coordination (`scene-mixer.ts:1-63`). | `SceneMixer`, `NoteEvent`, `OfflineRenderOptions`, `StripMap`, `MaterializedGraph`, `REALTIME_GRAPH_OFFLINE_REUSE_ERROR` |
| `scene-to-segments.ts` (369) | S-layer converter + merge law engine: split-merge (H1/H9 click-free continuity), transition windows (H1b equal-power), varispeed (H8), volume/buffer-variant boundaries. Contains the **only OT type import** and the opencut flattener (`scene-to-segments.ts:5-43,284-369`). | `StructuralAudioSource`, `NleAudioSegment`, `buildAudioSegments`, `OpencutFlattenOptions`, `opencutSceneToAudioSources` |
| `segment-strip-adapter.ts` (588) | The scheduler: per segment `AudioBufferSourceNode → envelope Gain → strip.input`; 8ms anti-zipper ramps, equal-power `setValueCurveAtTime` crossfades, H13 level folding, H16 realtime drift surface (sourceTime/seek/stop), H8 insert seam for worklets, H0 pan law (`segment-strip-adapter.ts:1-82`). | `SegmentStripAdapter`, `PAN_LAW_CENTER_MONO`, `DEFAULT_RAMP_SEC`, `AdapterContext`, `SegmentInsertNode`, `SegmentPlayOptions` |
| `realtime-engine.ts` (187) | `EngineHandle` on a LIVE AudioContext — the realtime twin of `@/lib/daw/offline-engine`, same shared `buildMasterChain` ("one chain across playback, bounce, offline render, and the NLE bridge's realtime path"), master clamp [0,1], aux 1..4 pre-created, real resume/suspend/close, deterministic reverb impulse (`realtime-engine.ts:1-29`). | `createRealtimeEngine`, `RealtimeEngineOptions` |

**The "one audio engine" claim — both consumers verified:**
- **Realtime (Player)**: `src/lib/nle/playback/player.ts:107` imports `RealtimeAudioBridge`;
  `player.ts:209` `audioMixer?: RealtimeAudioBridge`; `player.ts:3247`
  `this._audioMixer.scheduleClipWithFades(...)`; `player.ts:3092` `syncTimeline(data)`;
  `player.ts:3305/3335` drift-read/seek. `RealtimeAudioBridge` (522 LOC,
  `src/lib/nle/audio/realtime-bridge.ts:116`) is built on
  `SceneMixer.materializeStrips(createRealtimeEngine(ctx))` (`realtime-bridge.ts:60-64`)
  with strip sync reusing the export path's `bridgeSceneSettings` ("one law, two consumers",
  `realtime-bridge.ts:44-48`).
- **Export**: `src/lib/nle/export/orchestrator.ts:63-65` imports
  `planAudioMixdown/bridgeMixdownDurationSec/renderAudioMixdown`; the A/V mux `mixAudio` plans
  + renders through `SceneMixer.renderOffline` (`orchestrator.ts:586-620`); the audio-only path
  `renderAudioOnly` (`orchestrator.ts:729-800`) calls `renderAudioMixdown`
  (`orchestrator.ts:765`) which is `new SceneMixer(...).renderOffline(...)` +
  `softClipAudioMix` (`src/lib/nle/export/audio-mixdown.ts:296-313`). The headless render path
  dispatches both (`src/lib/nle/headless/api.ts:2530-2531`).
- The freecut `AudioMixer` **class is gone**: rg `class AudioMixer` in src/ = 0 hits;
  `src/lib/nle/audio/mixer.ts:1-13` documents the retirement — only the pure law library
  (EQ bake, reversal, fade math, Int16/SRC DSP) survives, consumed by both bridge and mixdown
  (`realtime-bridge.ts:65-70`).

## 4. The engine's own timeline (`src/lib/nle/timeline/`)

- **LOC**: `timeline.ts` 7,480 + `keyframe-store.ts` 817 + `sync-lock.ts` 639 = **8,936 LOC**.
- **What it is**: still the freecut-derived single-class Timeline — "Faithful port of freecut's
  split timeline stores into a single class" (`timeline/timeline.ts:1-10`), collapsing the 10
  freecut store files (items-store 961, items-store-indexes 590, transitions-store 256,
  timeline-command-store 287, snapshot 193, source-calculations 316, … — `timeline.ts:2-11`).
  Immutable `_commit` + rebuilt indexes + UndoStack; pure kernel extracted to
  `core/timeline-math` (`timeline.ts:63-70`).
- **Relationship to vendor/opencut-timeline**: **no code bridge**. The Timeline class imports
  nothing from OT; OT's `SceneTracks` is consumed only by the bridge's flattener
  (`bridge/scene-to-segments.ts:43,304+`) and only as types. Both worlds converge at the
  bridge's `StructuralAudioSource`/`NleAudioSegment` (S-layer seam,
  `scene-to-segments.ts:45-49`) — there is **no engine-timeline ↔ OT data converter**, no
  projector, no op-port. The D8 track-layer ruling describes the intended layering
  (`.agents/DECISIONS.md:307-360`).
- **What consumes engine timeline code**: the canonical headless adapter
  (`headless/timeline-adapter.ts:26` type-imports `Timeline`; implements all 19 wire ops),
  `headless/api.ts` `editProject` (serialize from the live timeline), the export orchestrator
  (`export/orchestrator.ts:56` imports `Timeline`; `buildTimelineData`), the Player
  (`playback/player.ts`), persistence (`persistence/index.ts`), the browser runner
  (`src/app/page.tsx:8` `Timeline`), and 7 vitest engine suites. The engine's `TimelineData`
  also feeds the audio bridge via `buildAudioScene` (`bridge/conversions.ts:45,104-105`).

## 5. The headless API (`src/lib/nle/headless/`, 3,217 LOC)

**Shape today = freecut's JSON-RPC + `$ref` interpreter, NOT spec 15's 78-type
discriminated `EngineCommand` union.** Evidence:
- `api.ts:1-36` — ports freecut headless main.ts/edit.ts/contract.mjs; "JSON-RPC-STYLE EDIT
  OPS … Each op may carry a `callerId` so a LATER op can reference a value from the PRIOR op's
  result with `{ $ref: 'callerId#/json/pointer' }` … $ref is allowed ONLY on ID-valued fields".
- `EditOp = Record<string, unknown> & { op: EditOperationName }` (`api.ts:406`).
- **19 op names** (`api.ts:378-396` + `EDIT_OPERATION_NAMES` `api.ts:2025-2044`): addText,
  addItem, updateItem, moveItem, removeItems, split, trimStart, trimEnd, addTransition,
  updateTransition, removeTransition, addTrack, addClip, addKeyframe, removeKeyframes,
  setTransformParent, addEffect, removeEffect, setTransform. Zod-strict per-op schemas
  (`opSchemas`, `api.ts:1627-1770` — "The 19 op schemas, one per EditOperationName").
- **8 API methods** on `NleHeadlessApi` (`api.ts:110-130`): `renderTimeline`, `renderProject`,
  `renderFrame`, `dumpLayout`, `editProject`, `normalizeProject`, `probeMedia`,
  `createProject` (+ `ready` sentinel).
- Canonical op semantics live in `headless/timeline-adapter.ts`
  (`createTimelineActionsAdapter`, 462 LOC — "ONE implementation … the engine-side source of
  truth for what each JSON-RPC edit op MEANS", `timeline-adapter.ts:1-15`), correctness-gated
  by `scripts/probe-fx4.ts` (verified green this session).
- Render is delegated via `RenderAdapter` (`api.ts:721-770`) to the export orchestrator;
  `renderAudioOnly`/`renderComposition` dispatched at `api.ts:2529-2531`.

## 6. Export capability (`src/lib/nle/export/`, 4 files, 1,709 LOC)

**Works end-to-end** (browser-verified this session: milestones m24/m26/m28/m29 in the 265/265
run, including real A/V MP4 decode verification):
- **Video**: WebCodecs + mediabunny, codecs `avc|hevc|vp8|vp9|av1`, containers
  `mp4|mov|webm|mkv` (`export/settings.ts:30-33`), codec↔container maps + default + fallback
  ladder `['avc','hevc','vp9','vp8','av1']` (`settings.ts:47-76`), capability probing with
  `CODEC_FALLBACK` warnings, quality→bitrate, even-dimension validation.
- **Audio**: offline mixdown through the bridge (`renderAudioMixdown` —
  `audio-mixdown.ts:296-313`), audio codecs `aac|opus|mp3|pcm-s16`, audio-only containers
  `mp3|wav|aac` (`settings.ts:36-42`), encode via mediabunny `AudioBufferSource` with a
  codec-candidate ladder (`orchestrator.ts:787-800`), 48 kHz export rate
  (`orchestrator.ts:477`). A/V mux mixes audio sized to the timeline duration
  (`orchestrator.ts:586-620`); ranged/in-out exports via `sliceAudioBuffer`
  (`audio-mixdown.ts:102-126` + `orchestrator.ts:767-786`).
- **NO FCPXML output — zero refs repo-wide** (rg `fcpxml|fcpx|final cut` over
  src/tests/scripts/gaps/.agents = 0 hits). Spec 10's FCPXML export is entirely unstarted.
- **No subtitle export**: `SubtitleSegmentItem` "not ported"
  (`text/text-layout-fit.ts:252`); it sits on the P2 backlog (`.agents/PLAN.md:84`).
- Explicitly NOT done (module header, `export/index.ts:10-15`): worker offload + OPFS
  streaming (Stage 3), smart-copy / packet remux (Stage 5) — sequenced in
  `gaps/audit/C-export-encode.md`.
- mediabunny@1.50.8 is the **only runtime dependency**, lazy-imported strictly inside export/
  (`export/index.ts:6-8`, D2 `.agents/DECISIONS.md:251`).

## 7. Self-declared gaps (what the repo says is NOT done)

- `gaps/audit/MASTER.md` §0 (execution log, lines 15-95): everything ✅ through the SEAL row;
  the only non-DONE rows: "6A–6C Real media M1 … ⬜ **DEPRIORITIZED** (user: programmatic
  assets are the e2e standard)" and "7 P2 backlog ⬜ TODO" (MASTER.md:93-95). "Open decisions:
  D4 (lottie), D5 (storage)" (MASTER.md:117-118). Header law: "where they conflict …
  **the audit files win**" (MASTER.md:14-15).
- `gaps/audit/REVIEW-TRACKER.md`: "ZERO P2s remain open" (`REVIEW-TRACKER.md:117`); the only
  remaining register is **P3 by choice**: "TEST-9..14, DOCS-8..12, UX-5..8, ARCH-12..14,
  CODE-6..8" (`REVIEW-TRACKER.md:72-75`, `.agents/PLAN.md:20-22`). The post-close audit
  re-verified the 4 gaps-doc Majors as stale readings (`REVIEW-TRACKER.md:84-108`).
- `.agents/PLAN.md` **P2 backlog** (lines 82-89): ShapeItem SDF (~613 LOC), LottieItem (D4,
  injectable adapter, default off), text motion + presets (~1,800 LOC), scopes
  (waveform/vectorscope), ControllerItem, SubtitleSegmentItem, **CPU transition renderers**
  (~1,450 LOC, export fallback), compute-shader pixel-sort, decoder prewarm pool, frame
  jitter monitor, filmstrip, VFR policy.
- `.agents/PLAN.md` **P3** (lines 91-97): Node-side HTTP headless driver, React component
  tree, RIFE interpolation, Anime4K upscale, scene detection/captioning/tagging, llm module,
  `.freecut.zip` bundle format.
- `.agents/PLAN.md` P1.9 real media "DEPRIORITIZED … Only if a programmatic blind spot
  appears" (PLAN.md:46).
- `.agents/HANDOFF.md` next-session scope (lines 64-81): (1) poll CI to green through HEAD,
  (2) ~~D7~~ done, (3) P3-register cherry-pick ("the A3(c) scene-assembly planning seam is the
  biggest architectural one", HANDOFF.md:72-75), (4) P2 feature backlog, (5) optional fresh
  CodeRabbit round via orphan-base PR.
- The wave1/wave2/wave3 gap files are **historical**: wave2/3 files contain zero open
  checkboxes (rg); wave1 files retain unchecked boxes (e.g. `gaps/wave1-player-gaps.md:441-459`)
  that were superseded by later waves (AudioMixer seek/drift → adapter H16; EQ stages → m23;
  SoundTouch → Wave 3F; adjustment layers → Wave 4C.2) — MASTER §0 + the post-close audit
  are the state of record.
- Item-type census: `Clip = VideoClip | AudioClip | ImageClip | AdjustmentItem |
  CompositionItem | TextItem` — **6 types** (`core/types.ts:1030`); missing vs freecut's 8:
  Shape, Lottie (also Controller/Subtitle classes, PLAN P2/P3).

## 8. The app surface (`src/app/`, `src/components/`, `src/hooks/`)

- `src/app/page.tsx` — **11,206 LOC single-page browser TEST RUNNER** (not an editor): 31
  milestone definitions inline (`page.tsx:129-`), every engine API imported from the barrel
  (`page.tsx:4-106`), U1-U4 runner UX (per-milestone ▶ `runOne` `page.tsx:453`, cooperative
  cancel `cancelRef` `page.tsx:300-307`, dismissible fatal banner `page.tsx:11076-11097`,
  live progress header `page.tsx:11044-11068`). Hand-rolled Tailwind markup, monospace dark
  theme; imports **zero** shadcn components.
- `src/app/api/route.ts` (61 LOC) — a GET status endpoint returning the milestone catalog as
  JSON. No other routes, no editor pages, no app router segments beyond `/` and `/api`.
- `src/app/layout.tsx` (53 LOC) — scaffold; metadata still says **"Z.ai Code Scaffold"**
  (`layout.tsx:18-27`) — the D7 rename touched only package.json/lockfiles
  (`.agents/DECISIONS.md` D7 close-out, ab8d668).
- `src/components/` — 46 shadcn/ui scaffold files (accordion…tooltip) — **unused by the NLE
  surface** (only `Toaster` mounted in layout.tsx:23).
- `src/hooks/` — `use-toast.ts`, `use-mobile.ts` (scaffold, unused by page.tsx).
- `examples/websocket/` — leftover scaffold chat demo (server.ts is a socket.io chat), not
  NLE-related. `prisma/`, `src/lib/db.ts` — scaffold, no NLE cloud code (rg: no
  z-ai/next-auth usage in src beyond scaffold db.ts).

## 9. API freeze state

- `tests/vitest/engine/api-surface.test.ts:20-23` — "the barrel exposes exactly the frozen
  export set (**453 names**)"; verified: `api-surface.frozen.ts` contains exactly 453 quoted
  entries; live barrel keys = frozen list (the vitest run above included this test, green).
  Freeze policy (D9, `.agents/DECISIONS.md:361-375`): additions need a same-commit list
  update; removals/renames need a DECISIONS entry. Regenerate:
  `bun scripts/gen-api-surface.mjs`.
- `scripts/lint-layering.mjs` — fences the **14 top-level layers** of `src/lib/nle`
  (root, audio, bridge, core, effects, export, gpu, headless, media, persistence, playback,
  text, timeline, transitions) at directory-edge granularity; run this session:
  "**OK — 52 cross-layer edges, all pinned by the snapshot**"
  (`gaps/audit/LAYER-SNAPSHOT.txt`, 52 `src -> target` lines). CI-wired at `ci.yml:130`.
  Notably `bridge` appears as its own fenced layer (edges: audio→bridge, bridge→audio/core,
  export→bridge).
- The public barrel `src/lib/nle/index.ts` re-exports core/media/gpu/effects/transitions/
  audio(+realtime-bridge)/timeline/persistence/export/headless — but **NOT `bridge/*` itself**
  (bridge is consumed via relative imports by audio/realtime-bridge and export/audio-mixdown;
  only `RealtimeAudioBridge` is public, `index.ts:46-48`).

## 10. Spec phase coverage estimate (engine repo only)

| Phase | Estimate | Evidence |
|---|---|---|
| **P0 engine core** | **~85%** | Timeline ops (split/trim/ripple/slip/slide/join/rate-stretch/close-gap/markers/sync-lock; undo-by-default 59 ops, probe 318 checks — `scripts/probe-p114-undo.ts`), persistence v2 (`NLE_SCHEMA_VERSION = 2`, `persistence/index.ts:78`; migrations+load-validation 32 vitest), headless API (§5), realtime Player + GPU compositor + masks + text glyph atlas, 44 GPU effects (§below), 27 transitions, virtual media registry. Missing: ShapeItem, LottieItem (D4 open), ControllerItem, SubtitleSegmentItem, real-media import (deprioritized), CPU transition renderers, scopes. |
| **P1 UI shell** | **0% in this repo** | page.tsx is a test runner (§8); "React component tree" is explicitly P3 (PLAN.md:93). The UI shell asset lives in opencut-timeline (W8 TimelineView / ui-mock), not here. |
| **P-A audio** | **~80%** | One audio engine end-to-end (§3): realtime + export on the same SceneMixer/ChannelStrip graph; 6-band EQ + cuts/shelves (bake law), author fade curves (H15), equal-power crossfades (H1b), varispeed + SoundTouch pitch worklet (Wave 3F, `audio/soundtouch-processor.worklet.ts`), drift/seek (H16), aux buses/sends, MIDI NoteEvent seam (H12), offline+realtime engines. Missing vs a full spec-20 target: instrument/SF2 depth (worklet no-ops on this engine, `realtime-engine.ts:108-110`), effect automation lanes, ducking UI law (app-level). |
| **P2 op-family** | **~40-50% capability / ~24% wire-conformance** | Engine-side op surface is broad (Timeline class: the 59 undo-wrapped ops + link/sync-lock/marker/sub-comp families; undo-serialize 15 vitest). But the **wire surface is 19 JSON-RPC ops** (§5) vs spec 15's **78-type EngineCommand union** — nominal 19/78; no command taxonomy, no discriminated union, no undo/redo wire commands, no selection commands on the wire. |
| **P3 transitions** | **~85%** | 27 builtin presentations, GPU WGSL, two-tier type/presentation model (`transitions/registry.ts:2245-2484` — BUILTIN_PRESENTATIONS count = 27; `core/types.ts:339-356`), handle enforcement + auto-repair, planner 52 vitest, reversed windows (R3-D2, m28), transition identity gates + fps-bridged sampling (m31, 31.1-31.9 green this run). Missing: CPU fallback renderers (PLAN P2). |
| **P4 color grading** | **~70%** | 16 color-category effects (brightness, contrast, saturation, hueShift, vibrance, temperature, tint, grayscale, invert, sepia, exposure, levels, curves, colorWheels, gradientMap, **lut3d** — `effects/pipeline.ts` + `effects/lut.ts:323` category 'color'), + chromaKey keying; LUT3D pipeline exists (Wave 3E). Missing: scopes (waveform/vectorscope — PLAN P2), secondaryQualifier + powerWindow (named in freecut's set but not implemented — only a comment, `effects/pipeline.ts:12`). |
| **P5 FCPXML** | **0%** | No FCPXML anywhere (§6). Export is encode-only (WebCodecs/mediabunny). |
| **P6 cloud** | **0%** | No cloud/AI/storage code in src/ (only scaffold db.ts/prisma/next-auth deps; "llm module" is P3, PLAN.md:95). Media origin types mention opfs as metadata only (`media/metadata.ts:33`). |

---

## Corrections to prior beliefs

Prior belief checklist (from the R15-0 round entry) — verdicts:

1. **"engine is 274/274 vitest"** — **TRUE on CI; locally conditional.** 237 engine + 37 bridge
   = 274 verified; but the bridge H10 render test times out at vitest's default 30s on this
   4GB sandbox (passes at 240s) — the CI 16GB venue is the real gate. Also: the two HEAD
   docs commits bypass CI entirely (`ci.yml:21-23` paths-ignore), so "CI green at f526e67"
   strictly means green through `508c838` (+2 md-only commits). I could not verify the final
   CI runs from this sandbox (no GitHub API access).
2. **"review ledger closed"** — **TRUE** (REVIEW-TRACKER.md:117 "ZERO P2s remain open"; only
   the by-choice P3 register remains).
3. **"one-audio-engine complete"** — **TRUE and code-verified**: AudioMixer class deleted
   (0 hits for `class AudioMixer`), realtime player and both export paths all instantiate the
   same SceneMixer/ChannelStrip/master-chain graph (§3 cites).
4. **"OT/WDC vendored"** — **TRUE with a material nuance**: WDC is a genuine runtime dependency
   (5 runtime import sites in src/); **the vendored OT is type-only in src/ (1 import) and
   runtime-imported only by the vitest bridge suite** — no shipped engine code path touches OT.
   And the staleness number in the R15-0 worklog is wrong: the pin is **35** commits behind OT
   HEAD (not 53 — that figure was OT's own 4e39b67→0412e41 sync delta).
5. **"JSON-RPC headless"** — **TRUE** (19 ops + `$ref` + 8 methods, §5). This directly
   contradicts any spec-15 assumption of a 78-type EngineCommand wire surface — the engine
   would need a new command layer (or an adapter) to conform.

Additional corrections / nuances found:

- **ci.yml's "the 4GB Z-container cannot finish [the browser suite]" (ci.yml:2-4) is not
  absolute**: this sandbox completed the full 31-milestone/265-row suite in ~8 minutes with
  real WebGPU (`isSwiftShader: false`). The earlier failures were memory-pressure-conditional,
  not a hard constraint — relevant when choosing local-vs-CI verification venues.
- **MASTER.md §0's "7 of 8 item types render" (MASTER.md:98-100) overstates**: the `Clip`
  union has **6** types (`core/types.ts:1030`); the same row names only 6. Shape/Lottie are
  absent (P2 backlog), Controller/Subtitle absent (P2/P3).
- **Engine size**: 51,968 LOC across 58 files in `src/lib/nle` (wc) — MASTER.md:38's
  "37,958 LOC, 29 files" is the deep-audit-era census, now stale.
- **Timeline LOC**: 8,936 (timeline 7,480 + keyframe-store 817 + sync-lock 639) vs R9's
  recorded 8,425 — grew with the seal round.
- **Identity residue**: layout.tsx metadata still advertises "Z.ai Code Scaffold"
  (`src/app/layout.tsx:18-27`); D7 renamed only package.json/lockfiles. Cosmetic, but it
  contradicts "repo identity fully migrated".
- **Milestone row count drift**: docs say "~280 browser rows" (PLAN.md:8, MASTER.md:96-97);
  the measured full run at HEAD is **265** rows (matches the runner's expectation math at
  FX-3 + later additions; the "~280" figure is unexplained — likely an estimate, not a count).

## What I could not verify

- GitHub Actions run status for `ab8d668`/`508c838` (no network to github.com from the
  sandbox) — relied on HANDOFF.md's recorded claim + local re-verification of every gate it
  lists (tsc 0, vitest 274 with the H10 timeout caveat, frozen-lockfile install clean).
- Whether any unpushed/uncommitted state exists on the GitLab backup remote mentioned in the
  R15-0 worklog (not part of this repo's origin).
- web-daw-core / opencut-timeline internal test counts at their pins (721/721, 379/379) —
  sibling-repo facts, out of scope here; only the pin distances were measured.
- The claimed "453-name" freeze and "52-edge" fence were verified; per-name semantic review of
  the frozen surface was not (spot-checked 20 flagship names in api-surface.test.ts:36-57).
