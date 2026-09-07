# SCOUT-R15-C — web-daw-core (pure audio core) + the nle-engine bridge: the productized one-engine arc

Task ID: R15-S3 · Agent: scout (read-only) · Date: 2026-09-06
Scope: (a) web-daw-core @ HEAD `374711c` ("pure audio core, bridge relocated to consuming app"); (b) nle-engine @ `f526e67` — `vendor/web-daw-core` (@ `5243c49`), `src/lib/nle/bridge/` (7 files), the realtime + export audio paths, the parity gates, the retirement tombstones.
Feeds: the evolve-in-place vs greenfield decision (D15) and the final-app assembly architecture (D16/D17).

Verification method: ran the suites (`bun run test`, `tsc --noEmit`, `bun run test:vitest`), read the code (not READMEs), cross-checked git history for every claim. All file:line citations below were opened in this session.

---

## 1. WDC current state

**Repos/commits:** web-daw-core @ `374711c` (clean tree). Recent history: `5243c49` = the M1.6 relocation commit; `374711c` = docs-only wrap on top (HANDOFF rewrite + worklog). `.gitmodules` does not exist — zero submodules (git log `5243c49..374711c`: 1 commit, `HANDOFF.md` + `worklog.md` only).

**Tests — verified by running, not by trusting the README:**
- `bun run test` → **Test Files 30 passed (30), Tests 721 passed (721)**, exit 0. README.md:5 claims "721/721 tests green in Node (~70 s)"; actual wall clock on this box **149.38 s** (tests phase 53.65 s — the README's ~70 s and HANDOFF.md:53's "~47 s" are test-phase-ish numbers, not wall clock). Duration is machine-dependent; CI's 30-min timeout (ci.yml:36) is ample.
- `bunx tsc --noEmit` → **exit 0** (clean).
- Suite config: vitest.config.ts:11-17 — `environment: 'jsdom'`, `globals: true`, `include: src/**/*.test.ts(x)`, `setupFiles: ./src/test/setup.ts`, **`maxWorkers: 1, minWorkers: 1`** (audio-render workers hit ~1.8 GB anon-RSS — vitest.config.ts:14-16).
- GHA CI: exactly **one job** `gate` ("vitest + tsc") — ci.yml:28-45: push on `main` (+`workflow_dispatch`), md-only paths ignored, bun 1.3.14 + node 24, `bun install --frozen-lockfile` → `bun run typecheck` → `bun run test`. Header comments state what is NOT run: `bun run sync -- --check` (ci.yml:5-7 — upstream is private, local-checkout only) and no submodule steps anymore (ci.yml:9-13).

**Three file classes (extraction-manifest.json, counted):**
- `copy`: **75** src files (byte-identical upstream, never hand-edited).
- `copyRepoRoot`: **4** root assets (`scripts/rt-safety-gate.ts`, 3 built worklet bundles from `apps/web/public/worklets/`).
- `shims`: **11** (`lib/daw/scheduler.ts`, `default-samples.ts`, `piece/catalog-types.ts`, `sample-buffer-registry.ts`, + 6 instruments + `instruments/provider.ts`).
- `coreOwned`: **5** (`index.ts`, `test/index.ts`, `test/setup.ts`, `test/nle-audio-core-derisk.test.ts`, `test/instrument-provider.test.ts`).
- `rewrites`: 1 (repo-root path-depth for `rt-safety-gate` in `dsp-bounce-parity.test.ts`).
- Upstream: `https://github.com/bearachprema/web-daw`, srcRoot `apps/web/src`, defaultRef `main` (manifest `upstream` block); provenance `main@913d0d7` per README.md:6 + HANDOFF.md:18-19 (upstream unchanged since sync, ls-remote verified 2026-09-04).

**Runtime deps — zero, verified by grep:** the only non-relative/non-`@/` imports anywhere in `src/` are `vitest` (in `*.test.ts` files) and `node:fs`/`node:path` in `src/lib/daw/scripts/build-sample-catalog.ts:23-24` (a catalog build script, not runtime). package.json:26-32 devDependencies: `@types/node`, `jsdom`, `typescript`, `vitest`, `web-audio-api` — all dev. The claim holds.

**M-milestones (PLAN.md):**
- **M1 ✅ COMPLETE** (2026-09-02) — extraction, 75+4 files, 11 shims, harness ported, 721/721, zero runtime deps (PLAN.md:17-45).
- **M1.5 ✅ COMPLETE** (two sessions) — nle-engine wiring: submodule + aliases; bridge + H1-H14 pins; m26 export Stage 2; parity gate 26.11 (which caught a REAL double-applied-volume bug in the reference path); CI gate live @5456d45; H15 fade curves (746/746); realtime Player path CLOSED 2026-09-04 via H16 + host m30 (PLAN.md:47-101).
- **M1.6 ✅ COMPLETE** (2026-09-04) — bridge RELOCATED to nle-engine verbatim; opencut submodule + manifest entries removed; 752→721 (31 bridge tests moved, none lost); zero submodules (PLAN.md:103-127).
- **M2 (proposed)** — "mixer surface + multi-track, pure new capability, no migration left": live parametric EQ, reverb sends (aux), per-track inserts, solo/mute, external sidechain ducking, PDC; port the 4 deferred upstream tests (`engine.test.ts`, `engine-metronome-automation`, `engine-param-channel`, `dsp-aux-sends`, `wam-effect.test.ts`); waveform peaks from `audio-registry` feed opencut's `AudioElement` view; first WAM-hosted WASM effect; exercise `setInstrumentProvider` (PLAN.md:140-154). HANDOFF M2 session scope adds: **SoundTouch varispeed OFFLINE port** through the H8 insert seam (the offline mixdown skips pitch-preserving retime today), and worklet-bundle serving for hosts (HANDOFF.md:27-44).
- **M3 (proposed)** — convergence: tempo-map bridge (`model/tempo-map.ts`) for scoring; mixed-down stems re-enter as NLE tracks; double-click BGM track → full-DAW upgrade; advanced DSP as WAM/worklets on the `EffectNode` + `signalLatency()` contract so PDC keeps holding (PLAN.md:156-165).

---

## 2. The "pure core" boundary

**No timeline/NLE types leak into `src/lib/daw/**`** — verified by grep for `Timeline|SceneTrack|AudioElement|Scene\b|opencut` over the whole tree: the ONLY hit inside `lib/daw` is a doc comment mentioning upstream's `buildTimeline` reference-render (note-action-order.ts:14). Zero type imports, zero runtime references.

**Where the old nle bridge is referenced from — docs/comments only:**
- `src/index.ts:97-103` — a trailing comment block: "NLE bridge: RELOCATED to the consuming app (2026-09-04) … This repo is a PURE audio engine core: it must never know timeline/NLE types."
- `docs/track-model.md:1-8` — the contract doc, updated to name the bridge's new home (nle-engine `src/lib/nle/bridge/`, tests at `tests/vitest/nle-bridge.test.ts`).
- README.md:7/42-43, PLAN.md:105-127, HANDOFF.md:8-16, UPSTREAMING.md:95-101, worklog.md (M1.6 entry) — all prose.
- `src/test/nle-audio-core-derisk.test.ts` — comments only (test names/comments reference nle-engine Wave-5A laws; the FILE is coreOwned and uses no timeline types).

**The S/G/E contract as documented (docs/track-model.md — "the three-layer law"):**
- §1 (track-model.md:14-24): track is three coordinated layers meeting at one key — **S STRUCTURE** (opencut `SceneTracks`: placement/trim/split/ripple/snap; the closed editing union; knows nothing about sound), **G SIGNAL** (the bridge's `MixerTrackSettings`: fader/pan/mute/solo/insert chain/aux sends pre+post/output bus/instrument/MIDI channel — keyed by `trackId`), **E ENGINE** (web-daw `ChannelStrip`, verbatim upstream; strips self-apply mute/solo + send positions). **Seam law (track-model.md:42-50): S and G share ONLY the trackId string.** Consequences: opencut adopts DAW-grade mixing with zero type changes; the signal model evolves in WDC without timeline releases; nle-engine's own timeline drives the SAME G/E layers.
- §2 (track-model.md:52-67): the timeline's `TrackType` must NOT grow signal fields — option A (sidecar keyed by trackId) adopted, option B (`midi` section in SceneTracks) deferred to opencut W7, option C (`Track<T>` inline) rejected. Rule of thumb: **"structure holds WHEN/WHERE, signal holds HOW LOUD, routing answers WHERE TO."** Author fades are the boundary case that proves the seam (fades block split-merge — the ramps ARE the edit).
- §3 (track-model.md:69-88): the MIDI path — `MixerTrackSettings { kind: 'instrument'|'midi', … }` + the strip's instrument slot + `noteOn/noteOff` IS the pipeline (H12-proven); the whole bridge note surface is one interface, `NoteEvent`.
- §4 (track-model.md:90-116): bus/signal passing — `MixerSceneSettings { tracks, buses: AuxBusSettings[] (1..4, return gain + return chain), masterVolume }`; canonical send/return wiring severs the bus's default direct-to-master wire when the bus has an insert chain (wet-only returns; H11d). Deliberately NOT yet in the bridge (M2): sidechain ducking helper (`collectSidechainWires` exists in the engine), PDC coordination across strips (offline renders are latency-transparent today only because fixture chains report 0), automation curves (host supplies when materializing G).
- §5/§6: milestone impact table + test index (C1, H9-H12, H8, H0-H7/H1b — all now in the consuming repo except H0-H7).

**The engine's D8 ruling** (.agents/DECISIONS.md:307-340) is the decision record for this boundary: "BOTH, strictly layered — the layering IS the bridge"; "The core must never know a timeline type"; "enforced by construction since the core cannot even name a timeline type." Trade-off acknowledged: the bridge is single-consumer app code; a future second host re-vendors it with `docs/track-model.md` as the contract.

---

## 3. UPSTREAMING.md — the bidirectional story

**Direction 1 (LIVE), upstream → core:** `scripts/sync-from-upstream.mjs` + manifest + `UPSTREAM.lock.json`. 75 src files + 4 root assets copied VERBATIM (hash-verified); import validation; drift detection; `--check` no-write mode; the 721-test suite is the acceptance gate for every upstream drop (UPSTREAMING.md:9-32).

**How web-daw (the living DAW app) consumes it back — Phase B, READY (UPSTREAMING.md:34-69):** zero upstream code changes via the instrument provider seam:
```ts
setInstrumentProvider({ FmSynth, Sampler, SubtractiveSynth, SF2Sampler, HqSf2Sampler, default…Params })
```
before the first ChannelStrip is built. Mechanism pinned by `test/instrument-provider.test.ts`: the shim constructors DELEGATE to registered classes and `Symbol.hasInstance` answers, so verbatim `channel-strip.ts` drives the real app instruments. The app keeps its scheduler/midi/bake/store/UI. Suggested adoption slice: core as submodule under `packages/web-daw-core` + pnpm workspace, flip ONLY `effects.ts`/`channel-strip.ts`/`pdc.ts`/`offline-render.ts` imports (UPSTREAMING.md:63-69).

**The scheduler seam (Phase B/C):** `getScheduler()` is a loud shim — it throws with guidance: "the DAW transport scheduler is app-side machinery. NLE consumers schedule via ChannelStrip.scheduleAudioClip anchored to AudioContext time; web-daw itself keeps its real scheduler in the app layer" (scheduler.ts:44-50). offline-render imports only the types and never calls it. Phase C (specified, not started; deliberately sequenced after M1.5 proved the core — UPSTREAMING.md:71-91): upstream deletes its copies of the 33 closure files, `@/core/engine` imports from `web-daw-core`, and **the sync direction INVERTS** — this repo becomes source of truth and web-daw submodules it exactly like nle-engine does.

**How nle-engine consumes it:** git submodule `vendor/web-daw-core` + tsconfig deep alias `@/lib/daw/*` + the `web-daw-core/test-harness` package export (README.md:80-86; engine tsconfig.json:30-35).

**The fail-loudly law (new seam upstream):** sync-from-upstream.mjs:109-179 — every import in every copied file must resolve to (a) a resident file (copy∪shims∪coreOwned), (b) an external package, or (c) a non-literal dynamic import (WAM computed URLs). Anything else is a violation, and the validator DISTINGUISHES the two cases (mjs:165-176): if the import hits a file that EXISTS upstream at that path but is not in the core → *"'X' hits upstream Y which is NOT in the core (seam) — write a shim or extend the manifest"*; if it resolves nowhere → *"does not resolve anywhere (upstream break?)"*. Additional loud gates: audited rewrites must match EXACTLY once or they become violations (mjs:195-203); stale files in the tree that aren't in the manifest are violations (drift deletion, mjs:256-264); missing shim files are violations (mjs:267-268). On any violation: exit 1 with *"Nothing was left broken silently: fix by extending extraction-manifest.json (copy) or writing the shim, then re-run"* (mjs:277-282). Deliberate friction: upstream changes that ADD app-machinery imports into manifest files fail validation until a conscious shim/manifest decision — "seams must be conscious" (UPSTREAMING.md:28-32).

---

## 4. The bridge in nle-engine — `src/lib/nle/bridge/` (7 files)

Provenance: 6 files moved VERBATIM from WDC@8016aeb in commit `b837d60` (M1.6: scene-to-segments, fade-curve, segment-strip-adapter, mixer-track-model, scene-mixer, realtime-engine); the 7th — `conversions.ts` — is engine-born (commit `1fead49`, review-R1 fix A4: the pure conversion law extracted OUT of export/audio-mixdown.ts so playback stops importing the export subsystem).

| File | Responsibility | Key exports | WDC APIs called (import sites) |
|---|---|---|---|
| **scene-to-segments.ts** (370 L) | The S→G conversion law: timeline audio-bearing elements → MERGED play segments. Split-merge (same mediaId + time-adjacent + source-contiguous + no author fades at boundary + same rate + same folded volume ±0.0001 dB + same bufferKey → one phase-continuous buffer play, <1e-6); transition windows (overlap + both fades → equal-power pair, right member stays merge candidate, CR-A #3); varispeed survives as per-segment rate. Plus the opencut flattener (`opencutSceneToAudioSources`, TYPE-ONLY import of `SceneTracks`/`AudioElement`/`VideoElement`, 120 000 ticks/s). | `StructuralAudioSource` (:51), `NleAudioSegment` (:100), `buildAudioSegments()` (:165), `opencutSceneToAudioSources()` (:308) | `import type … from 'opencut-timeline'` (:43) — the only cross-repo import; ZERO `@/lib/daw/*` imports (pure). |
| **mixer-track-model.ts** (192 L) | The G-layer sidecar: per-track signal keyed by trackId — fader 0..1, pan −1..1, mute/solo, insert chain (`EffectInstance[]`), outputBus (0=master, 1..4=aux), auxSends + auxSendPreFader, instrument type/params + midiChannel; `kind: 'audio'\|'instrument'\|'midi'` mirrors web-daw's `Track.type` union (NOT the timeline's TrackType). Structurally a subset of web-daw's `Track` → `toDawTrack()` is a pure default-filler, lossless round-trip (C1). | `MixerTrackSettings` (:45), `AuxBusSettings` (:89), `MixerSceneSettings` (:101), `default*` factories (:109-149), `toDawTrack()` (:157), `anySoloed()` (:189) | `import type { EffectInstance, InstrumentType, Track } from '@/lib/daw/types'` (:37) — types only. |
| **segment-strip-adapter.ts** (589 L) | The segment scheduler — the Player's realtime surface: `AudioBufferSourceNode → per-segment Gain(envelope) → strip.input`, so segments inherit the strip's full insert chain/fader/pan/sends/PDC/sidechain. Envelope laws: 8 ms anti-zipper; equal-power sin/cos curves via `setValueCurveAtTime` (H1b); H15 author curves as 16-segment piecewise-linear ramps × level; H13 folded `level` scales every envelope target; H14 portable stop (never pass duration to start()); H16 drift-correction surface (`getSegmentSourceTime`/`seekSegment`); H8 `insertNode` seam (SoundTouch worklet between source and envelope, disposed with the segment); H17 natural-end gain disconnect + linear-fallback targets = `level` (not ×pan-law). | `SegmentStripAdapter` (:216), `playSegment` (:241), `stopSegment` (:435), `stopAll` (:472), `getSegmentSourceTime` (:507), `seekSegment` (:546), `getSegmentInsert` (:495), `nextSegmentKey` (:584), `PAN_LAW_CENTER_MONO` (:83), `DEFAULT_RAMP_SEC` (:86) | `import { evaluateAudioFadeInCurve, …, FADE_CURVE_RAMP_SEGMENTS } from './fade-curve'` (:75-80) only — takes strips + ctx as STRUCTURAL types (`AdapterContext`, :102), so it needs no `@/lib/daw` import at all. |
| **scene-mixer.ts** (381 L) | The conductor: materializes the 3-layer model into a RUNNING graph and drives BOTH consumption paths — `materializeStrips(engine)` (idempotent per trackId; prunes vanished tracks CR-A #4; rebuilds bus chains, disposing prior generation CR-A #5; solo coordination via `setSoloEffectively`), `renderOffline()` (fresh `createOfflineEngine` on caller's OfflineAudioContext, schedules segments+notes, macrotask flush for worklet ports, ONE ENGINE PER INSTANCE guard — `REALTIME_GRAPH_OFFLINE_REUSE_ERROR` :119). | `SceneMixer` (:126), `NoteEvent` (:66), `renderOffline()` (:327), `materializeStrips()` (:155), `scheduleSegments()` (:265), `scheduleNotes()` (:298), `requiredLength()` (:353), `disposeStrips()` (:365) | `ChannelStrip` from `@/lib/daw/channel-strip` (:47), `createOfflineEngine` from `@/lib/daw/offline-engine` (:48), `createEffect`/`EffectNode` from `@/lib/daw/effects` (:49), `EngineHandle` type (:50). |
| **realtime-engine.ts** (188 L) | `EngineHandle` on a LIVE AudioContext — the realtime twin of the offline handle: the SAME shared master chain (`buildMasterChain` — one chain across playback/bounce/offline/bridge-realtime), real resume/suspend/close, analyser-backed metering, aux buses 1..4 pre-created at gain 0 (no phantom buses), master clamp [0,1], compressor constructed-but-disconnected, worklet init a no-op (bridge worklets ride the ADAPTER's insert seam). | `createRealtimeEngine(ctx, opts)` (:47) | `import type { EngineHandle } from '@/lib/daw/engine-handle'` (:28), `buildMasterChain, allocAnalyserArrays` from `@/lib/daw/master-chain` (:29). |
| **fade-curve.ts** (175 L) | The author fade-curve law module — port of freecut's `audio-fade-curve.ts` (self-contained, no imports): curve −1..1 (slow/fast attack via power curves through an exactly-solved control point, exponent clamped [1,12]), curveX bias (default 0.52), consumed as **N=16 piecewise-linear breakpoints** — the same approximation the retired direct mix used, so bridge ⇄ offline-mix agree SAMPLE-LEVEL on fade windows. | `FADE_CURVE_RAMP_SEGMENTS = 16` (:47), `evaluateAudioFadeIn/OutCurve`, `clampAudioFadeCurve(X)`, `fadeCurveIsShaped`, bounds consts (:31-38) | none (pure law module). |
| **conversions.ts** (189 L) | The "one law, two consumers" layer: PURE `TimelineData` → bridge segments/settings (no context, no registry). Mirrors the Player's `_scheduleAudioSegment` exactly: segment span via `timelineToSourceFrames`; fades `max(authorFade, crossfadeHandle/fps)` CLAMPED to play duration (R-D P2); folded `volumeDb` → `level`; muted segments skipped; solo NOT folded (strip layer); `masterBusDb` → masterVolume. Pre-roll clamp family for below-zero starts (rate-aware, A4-F4). | `audioSceneToBridgeSegments()` (:104), `bridgeSceneSettings()` (:172), `dbToLinear` (:56), `preRollSkipSourceFrames` (:80), `BridgeSegmentConversion` (:92) | imports the ENGINE's own `../audio/audio-scene`, `../core/types`, `../core/timeline-math` + bridge's `mixer-track-model`/`scene-to-segments` types (:45-53) — WDC-free by design (the conversion is NLE-model→bridge, not WDC API). |

**Layer-fence note (D9 + review A11):** the old `@/lib/nle-bridge/*` compat alias is fully RETIRED — all consumers import `../bridge/*` relative paths; tsconfig/vitest alias entries removed (REVIEW-TRACKER.md:36).

---

## 5. One-audio-engine end-to-end (P1.15 / P1.16 / RT)

### (a) Realtime playback

- **Who calls it:** the Player. `src/lib/nle/playback/player.ts:107` imports `RealtimeAudioBridge`; constructor option `audioMixer?: RealtimeAudioBridge` (:209); the host constructs it (`new RealtimeAudioBridge()` at page.tsx:380 and :469) and passes it in.
- **What AudioContext:** `RealtimeAudioBridge` ctor creates its own `new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' })` (realtime-bridge.ts:132-143) and immediately builds `createRealtimeEngine(ctx, { initialGain: 1 })` → `buildMasterChain` (WDC `master-chain.ts`) + `masterMeter.connect(ctx.destination)` (realtime-engine.ts:53-57). The AudioContext stays the ground-truth clock (player.ts:566 `this._clock.attachAudioContext(this._audioMixer.ctx)`).
- **Graph:** `SceneMixer.materializeStrips(engine)` → per-track `ChannelStrip`s (keyed by timeline trackId) + aux buses; `syncTimeline(data)` recomputes the SAME scene settings the export path uses (`audioSceneToBridgeSegments` + `bridgeSceneSettings`: unity faders, solo at strip layer, tracks filtered to audible ones), cached by TimelineData reference (realtime-bridge.ts:172-179; called from player.ts:3092).
- **Scheduling:** player `_scheduleAudioSegment` → `scheduleClipWithFades` (realtime-bridge.ts:224-273): pre-baked (trimmed/EQ'd/reversed) buffer plays from its head, `level` = dB→linear fold, equal-power flag, H15 curves, varispeed; pitch builds a SoundTouch insert via `buildPitchInsert` (:478-522) riding the adapter's H8 `insertNode` seam, disposed with the segment. Called at player.ts:3247 with `startTime = ctx.currentTime + AUDIO_SCHEDULE_LOOKAHEAD_SECONDS` (:3245).
- **Drift correction (H16):** player `_driftCorrectAudioSegment` (player.ts:3296-3346) reads `getScheduledClipSourceTime(clipId)` (realtime-bridge.ts:282 → adapter.getSegmentSourceTime, segment-strip-adapter.ts:507: `(currentTime − atTime) × rate` clamped to the content span, BUFFER-RELATIVE — SKILL law 25), computes the target in the SAME frame of reference `(offsetNow − skipFrames)/sourceFps` (:3312-3319), consults `planPlayingVideoDriftCorrection` (freecut thresholds: behind >0.2 s after 80 ms debounce; ahead >0.5 s immediately), and hard-seeks via `seekScheduledClip` (:3335) → `adapter.seekSegment` (segment-strip-adapter.ts:546-581): stop + reschedule the SAME buffer at `currentTime + 50 ms`, **window-relative** target rebased onto the window's base buffer offset (CR-A #1), **no head fade on mid-buffer resume** (R3-3), fadeOut anchored to content end, then the stored skip advances so the next comparison stays frame-consistent (:3340-3342).
- **Varispeed:** per-segment `playbackRate` set BEFORE `start()` (segment-strip-adapter.ts:246-248); H14 law — the timeline trim is expressed as `stop(start + played)` and duration is NEVER passed to `start()` because its time-base differs across backends when `playbackRate ≠ 1` (probed in WDC `scripts/probe-duration-semantics.mjs`, pinned in the H14 suite) (:373-386). maintainPitch (pitch-preserving retime) is the M2 SoundTouch offline port; realtime pitch already rides the insert seam.
- **Fade curves (H15):** authored `fadeInCurve/curveX` ride the segment model end-to-end (conversions.ts:141-165 → scheduleSegments → playSegment), applied as 16-breakpoint piecewise-linear ramps × `level` mirroring the offline-mix envelope math exactly (segment-strip-adapter.ts:311-361); equal-power windows use `setValueCurveAtTime` sin/cos curves instead (:272-310) — crossfades never take author curves. **H17 hardening** (:300-309): the linear-fallback ramp targets are `level` straight — the old code multiplied by `PAN_LAW_CENTER_MONO`, silently ending every fallback crossfade ~−3 dB low (landed WDC 8016aeb); plus natural-end cleanup disconnects the envelope gain (:387-400).

### (b) Export — offline through the SAME bridge

Call chain (A/V-mux path):
1. `orchestrator.ts:632 renderComposition` → `mixAudio(composition)` (:598-629): builds TimelineData, sizes `new OfflineAudioContext(2, ceil(durationSec × 48000))` from the TIMELINE duration (the A/V-mux convention, :604-609);
2. `planAudioMixdown(data, registry, ctx, 0)` (audio-mixdown.ts:257-274) = `audioSceneToBridgeSegments` (bridge/conversions.ts:104) + `materializeBridgeBuffers` (audio-mixdown.ts:190-250: per-segment `renderVirtualAudioChunk` → deinterleave → reversal bake → `bakeAudioEqStages` — bespoke buffers keyed `bufferKey = segment.key`) + `bridgeSceneSettings`;
3. **Null-gate law (29.4):** `if (plan.buffers.size === 0) return { buffer: null, … }` (:615-617) — "the gate is MATERIALIZED BUFFERS, not scene segments" (a video clip without resolvable audio still yields a scene segment);
4. `new SceneMixer(plan.sceneSettings)` → `mixer.renderOffline({ ctx, segments, resolveBuffer: key => plan.buffers.get(key), workletFlushMs: 0 })` (:618-626);
5. `SceneMixer.renderOffline` (scene-mixer.ts:327-350): ONE-ENGINE guard → `createOfflineEngine(ctx, { initialGain: masterVolume })` (WDC `offline-engine.ts`) → `materializeStrips` → `scheduleSegments` + `scheduleNotes` → `ctx.startRendering()` → `disposeStrips()` → AudioBuffer;
6. Back in audio-mixdown.ts:296-314 (`renderAudioMixdown`, the shared entry): soft-clip law `softClipAudioMix` (tanh above 1.0, :90-100 — "the ONE export-sum law… MOVED here from audio-mix.ts at retirement") → orchestrator windows it with `sliceAudioBuffer` to [inPoint, outPoint) (A7-F2, :670-682) → `renderCompositionCore` muxes it via mediabunny.
Audio-only path: `orchestrator.ts:729 renderAudioOnly` → same plan/render with context sized from `bridgeMixdownDurationSec` (last-segment-end) (:755-765) → throws 'Timeline has no audible audio to export' on empty plan.

**What was RETIRED (tombstones, confirmed deleted):**
- **The direct mix** — `src/lib/nle/export/audio-mix.ts` (`mixTimelineAudioOffline` + `scheduleSegmentGain`, 334 lines) **DELETED at `abdf9ee`** (2026-09-02, "RETIRE the direct mix — one audio engine, end to end (P1.15 complete)"), AFTER its 26.11 bridge⇄direct null-test held on CI. Tombstones: audio-mixdown.ts:88 + :108 ("MOVED here from audio-mix.ts at retirement"), page.tsx:258 ("26.11 … was RETIRED with audio-mix.ts … the gate graduated … successor consistency pin is 29.1").
- **The AudioMixer class** — `src/lib/nle/audio/mixer.ts` deleted −1 243 lines at **`20fa266`** (2026-09-04, "RETIRE the AudioMixer class — one audio engine, realtime included"). `rg "class AudioMixer"` over engine `src/` → zero hits (only prose references). What survives in mixer.ts is the LAW LIBRARY (module-level: EQ bake, reversal, fade-curve family, Int16/float32 DSP, freecut constants) — shared by both consumers (commit message; realtime-bridge.ts:65-70 imports it). Note one stale-tense docstring: realtime-bridge.ts:13 "AudioMixer class can then be deleted" (it already has been).
- The 26.11 parity gate "retired WITH the direct mix on 2026-09-03 (nle-engine abdf9ee); its successor is the host's 29.1 one-engine consistency pin" (WDC PLAN.md:77-79).

---

## 6. The parity gates (realtime == offline, and what exactly each proves)

| Gate | What it proves | Where it lives | Venue |
|---|---|---|---|
| **H3** offline-vs-realtime null parity | ChannelStrip graph ≡ hand-built reference graph, `nullDepthDb ≥ 60 dB` (THRESHOLDS.indistinguishable) | WDC `src/test/nle-audio-core-derisk.test.ts:421-464`, thresholds in `src/test/audio-compare.ts:23-26` (AES convention: ≥60 dB indistinguishable, ≥40 acceptable) | WDC vitest (Node, real DSP via web-audio-api) → WDC CI `gate` job |
| **H15b** 16-segment ramp parity | bridge envelope ≡ offline-mix reference math, sample-level | engine `tests/vitest/nle-bridge.test.ts:890` | engine vitest (Node) → engine CI `vitest` job |
| **29.1** one-engine consistency | A/V-mux mixdown (timeline-duration ctx) ≡ audio-only mixdown (last-segment-end ctx): 4 windows, `maxDiff < 1e-6` (sample-level), durations 2.0 s ±0.01, video-only tail RMS < 1e-4 | engine `src/app/page.tsx:10007-10088` (m29) | browser milestone suite (Playwright + WebGPU/SwiftShader + Xvfb) → engine CI `milestones` job |
| **29.2** encode roundtrip | real A/V MP4's decoded audio ≈ the muxed bridge buffer (RMS band — AAC lossy+priming) | page.tsx:10091-10118 | browser suite |
| **29.4 / 29.5** | no-audio timeline → video-only file; pre-roll clamp ≥ 0 wall time | page.tsx:10223-10260, :10260+ | browser suite |
| **m30.x** realtime pins | 30.1 play-driven scheduling + buffer-relative source-time; 30.2 drift hard-seek re-anchor + SAME buffer instance (R3-3); 30.3 masterBusDb → engine master gain (−6 dB → 0.5012); 30.4 transport hygiene (paused ops zero live segments); 30.5 pitch through the insert seam, disposed on stop; 30.6 stopScheduledClip stops EVERY segment under the anchor (ghost cleanup) | page.tsx (m30 block, descriptions :276-278) | browser suite |
| **26.x** (m26, 10 tests) | conversion law, split-merge survives, folded volume ×0.5, EQ bake ×0.1, equal-power 1.000, solo/mute, REAL WAV decode-verified (26.8), AAC capability-gated (26.9), headless e2e (26.10) | page.tsx (:256) | browser suite |
| (historical) **26.11** bridge⇄direct-mix null gate | bridge ≡ freecut direct mix after ONE documented gain-structure normalization (mono-in-stereo pan law); caught a REAL double-applied-volume bug in the reference path | RETIRED with audio-mix.ts at `abdf9ee`; successor 29.1 | — |
| WDC bounce-parity suite | bounce includes the worklet compressor (readiness gate load-bearing), setParams drives the LIVE worklet port, addModule failure → passthrough fallback + latency 0 + ready resolves, rt-safety-gate targets the built bundles | WDC `src/test/dsp-bounce-parity.test.ts:155-395` | WDC vitest → WDC CI |

**Engine CI runs all three venues** (ci.yml: `typecheck` / `vitest (nle-bridge Node suite)` / `milestones` browser Playwright), each with private-submodule materialization via `CI_VENDOR_URL_PREFIX` + GLOBAL `url.insteadOf`. WDC CI runs the 721 suite + tsc only.

**Precision for the "realtime==offline parity" prior belief:** there is no single end-to-end null-test comparing a live realtime render to the offline render (a live render can't be deterministically captured in a browser test). The claim is the COMPOSITION: H3 (component-level offline≡realtime null ≥60 dB, Node) + 29.1 (both offline export paths sample-identical through the one engine) + m30 (realtime behavioral pins: drift/seek/masterGain/transport/pitch/hygiene). The m29 curve-parity gate is documented at relDiff 0.00004 % (WDC PLAN.md:93-95).

---

## 7. What the audio stack does NOT yet cover (honest gaps)

**Spec 20 §12 open questions (nle-core-spec/20-audio-core.md:166-171):**
1. **Automation curves over NLE timelines (M2)** — web-daw's automation rides `Track` params (WDC has `model/automation.ts` upstream code); the NLE host must supply curve shapes at G materialization; shape TBD (likely per-trackId param-curve array sharing spec 06's easing vocabulary). Today: author fade CURVES exist (H15) but no param automation beyond keyframe volume.
2. **Sidechain source selection (M2)** — `collectSidechainWires` exists in the engine (exported from WDC index.ts:17) but the scene-level ducking helper (BGM-under-dialogue) and its UX (spec 18's mixer panel section) are unwritten.
3. **MIDI editing scope (W7/M3)** — the note surface is the contract (H12 proves instrument notes through the same graph); the piano-roll editing spec does not exist and is NOT chartered.
4. `export/audio-mix.ts` end-state — **stale**: resolved by deletion at `abdf9ee` (spec 20 predates the retirement; see Corrections).

**Engine-side gaps (verified in code/docs):**
- **Pitch-preserving retime offline:** "realtime-only in M1.5 (the SoundTouch worklet has no offline port yet) — an explicit M2 item" (audio-mixdown.ts:30-31); WDC HANDOFF M2 item 1 is the offline port through the insert seam.
- **PDC coordination across strips:** "offline renders are latency-transparent today only because the fixture chains report 0" (track-model.md:113-114); `applyPdc` is the seam, pinned at component level (dsp-pdc.test.ts) but not exercised by the NLE paths.
- **The 4 deferred upstream tests** (engine/metronome-automation, engine-param-channel, dsp-aux-sends, wam-effect) un-ported (PLAN.md:142-146).
- **WAM hosting:** WDC exports it (index.ts:57-59); no WAM effect consumed by the NLE host yet.
- **Inserts/sends/reverb in the NLE UI/engine expression — the G-layer surface vs what the host feeds it:** the CAPABILITY is full (`MixerTrackSettings.effects`, `auxSends`, `outputBus`, `AuxBusSettings.effects` — mixer-track-model.ts:68-97) and the engine-side G surface exposed to a host is exactly `MixerSceneSettings` + `RealtimeAudioBridge`'s method surface. BUT nle-engine's own conversion feeds a MINIMAL G: `bridgeSceneSettings` sets only `name`, `kind: 'audio'`, `soloed` (unity faders; volume folded into segment level; EQ pre-baked into buffers; master from `masterBusDb`) — conversions.ts:172-189. No insert chains, no aux sends, no reverb are materialized from the NLE data model (`TimelineData` carries track volume/solo, clip EQ, masterBusDb — nothing more). The engine's offline mixdown passes empty insert chains and `workletFlushMs: 0` ("No worklet-backed insert effects in the mixdown path" — audio-mixdown.ts:305-307, orchestrator.ts:623-625). The UI intent lives in the ui-mock's `mockMixer.ts` (2 insert slots `['EQ', null]`, `auxA/auxB` send levels, `auxPreFader`, `DuckingSettings` by role — ui-mock/shell-variants/src/state/mockMixer.ts:9-63) — i.e., **the mixer surface is UI-mocked but not yet engine-wired**; the wire-protocol family for it is spec 20 §8 (spec 15 §13.15 audio rows, a seal-round deliverable).
- **Reverse-shuttle grain plan deferred** (gaps/wave3c-audio.md §3.3); wave3f SoundTouch scrub/adaptive landed (W3F milestone in the report).
- **Engine review ledger: ZERO P2s remain open** (gaps/audit/REVIEW-TRACKER.md:117) — no open audio findings.
- **Spec-side staleness:** spec 20 §6.2 still says "the bridge already IS core-owned code (`src/lib/nle/` in web-daw-core)" (:99) — pre-M1.6 text; §12.4 (audio-mix.ts end-state) superseded by the deletion. Both need the R15 re-baseline.

---

## 8. Vendor pin + sync mechanics

- **Pin:** `git submodule status` → `5243c494… vendor/web-daw-core (5243c49)` + `3420b5fa… vendor/opencut-timeline`. `.gitmodules`: both HTTPS, clean URLs.
- **Delta 5243c49..374711c:** exactly ONE commit `374711c` "docs: M1.6 wrap — HANDOFF rewritten for the pure core, worklog entry"; diffstat touches ONLY `HANDOFF.md` (+22/−… ) and `worklog.md`. **Confirmed docs-only** — the engine's pin is functionally at HEAD. (`5243c49` itself IS the M1.6 relocation commit, so the vendor contains the pure core minus the docs wrap.)
- **tsconfig path-alias (tsconfig.json:26-42):** `@/* → ./src/*`, with longest-prefix override `@/lib/daw/* → ./vendor/web-daw-core/src/lib/daw/*`, plus `web-daw-core/test-harness → ./vendor/web-daw-core/src/test/index.ts` and the two `opencut-timeline` entries. `vendor` is in `exclude` (:51-56) — but excluded files still type-check when reached via imports (exclude only filters the include-glob), so the vendored sources ARE checked through the bridge's imports.
- **vitest alias law (vitest.config.ts:27-48):** Vite aliases are INSERTION-ORDERED (unlike tsconfig longest-prefix): `@/lib/daw` BEFORE `@` (else every import breaks); `opencut-timeline/` subpath entry BEFORE the bare entry; `web-daw-core/test-harness` maps to the vendor test barrel. jsdom + serial workers, NO setupFiles (the bridge suite builds its own contexts).
- **`bun run sync -- --check` exists** (package.json:24 `sync → node scripts/sync-from-upstream.mjs`, with `--check` mode documented at README.md:69-76 + mjs:48). **Can it pass here? No — by design:** it requires an upstream checkout (`--source`/`UPSTREAM_DIR`/a token clone of the private repo); in this sandbox the clone fails (no token), exit 1 — expected. CI does NOT run it (ci.yml:5-7, "the upstream web-daw repo is private and only reachable from a local checkout; run it in a sandbox session before pushing"). Last verified state: "Upstream web-daw main is UNCHANGED since the 913d0d7 sync (verified ls-remote 2026-09-04) — nothing to re-sync" + "sync --check no drift" at M1.6 (HANDOFF.md:18-19, PLAN.md:123-124). Canonical invocation: `UPSTREAM_DIR=…/.upstream node scripts/sync-from-upstream.mjs --check` (HANDOFF.md:50-52).

---

## 9. Performance / robustness evidence (what the harness actually pins)

- **nullDepthDb gates (the core numeric law):** `THRESHOLDS = { indistinguishable: { nullDepthDb: 60, peakAbsDiff: 1.2e-7 }, acceptable: { 40, 1e-3 }, failing: { 40, 1e-2 } }` (audio-compare.ts:23-26); classification at :145-151. H3 asserts `≥ THRESHOLDS.indistinguishable.nullDepthDb` (derisk:462-464).
- **PDC / latency:** dsp-pdc.test.ts:137+ — impulse alignment: WITHOUT PDC track A (N-sample latency effect) lands at N, B at 0 (documents the misalignment); WITH `applyPdc` both land at N; zero-latency mix is bit-identical (no-op). `effectSignalLatency` exported (index.ts:35); `latency.ts`/`pdc.ts` exported wholesale.
- **Worklet loading in Node:** URL candidates `'/worklets/dsp-effects-worklet.js'` (browser) then `'public/worklets/dsp-effects-worklet.js'` (Node, cwd-relative — effects.ts:157-158); SKILL.md §3:68-71 — "vitest MUST run from the repo root"; without the bundles the worklet-backed effects degrade to passthrough (the degradation ladder, not a bug); AudioWorklet port messages need a macrotask flush (SKILL §3:79-82; scene-mixer renderOffline flushes by default, `workletFlushMs` = 50 ms); recorded IR (`rec:` presets) fail in Node by design (browser-only). Robustness pins: addModule failure → passthrough fallback + limiter latency 0 + ready resolves (dsp-bounce-parity P2-5, :242); per-ctx in-flight addModule episode dedup (effects.ts:185-186, :225); partial setParams never NaNs/disarms (P0-1 regressions); rt-safety-gate static analysis targets the BUILT bundles (:389-395).
- **Timeouts/workers:** per-test 30 s timeouts on the render suites (derisk:51 `RENDER_TIMEOUT_MS = 30_000`; nle-bridge.test.ts:81, same rationale) — born from CI reality (PLAN.md:82-85: H5 timed out at 5 462 ms on a shared 16 GB GH runner against vitest's 5 s default). `maxWorkers: 1` in both repos (1.8 GB RSS per audio worker).
- **Node-render cost, documented:** first offline render in a process pays a one-time ~13 s cold cost (graph-processor compilation, 3-strip scene); later renders ~1.5 s (nle-bridge.test.ts:77-80).
- **FFT perf pin:** "FFT is at least 100× faster than naive DFT for 0.2 s of audio" (fft-analyzer.test.ts, performance test — observed in this session's run).
- **Browser-suite evidence (snapshot download/nle-test-report.json, 2026-09-04T09:18Z):** 246/246 pass over 31 milestones; audio rows with measured numbers: 26.10 headless audio-only renderTimeline 67.6 ms end-to-end; 30.3 masterBusDb −6 dB → measured masterGain 0.5012 in 104.1 ms; 26.8 real WAV 281.3 KB dur 1.500; 29.1 reports maxDiff/tailRms in its message (page.tsx:10085). WDC suite: 721 tests, tests-phase 53.65 s serial (this box).
- **CI capacity notes:** WDC gate ran green on a 16 GB GH runner at 743/743 pre-relocation (PLAN.md:80-85); engine CI needs 3 jobs because the 4 GB Z-container cannot finish the browser suite (engine ci.yml:1-7).

---

## 10. Assembly fit — host obligations for a FINAL app vendoring WDC

What the engine provides is the reference list of what any host owes (engine README + D8 + the code):

1. **Vendor + alias mechanics:** git submodule (`vendor/web-daw-core`) + tsconfig longest-prefix alias `@/lib/daw/*` (or import via the package's own `exports` — `.` → `src/index.ts`, `./test-harness` → `src/test/index.ts`, TS-source package, bundlers handle it) + the vitest INSERTION-ORDER alias table if you run the Node suite. Private-repo CI needs the `CI_VENDOR_URL_PREFIX` + GLOBAL `url.insteadOf` materialization step (engine ci.yml is the working pattern).
2. **Own the transport/scheduler:** `getScheduler()` throws by design (scheduler.ts:44-50). The host schedules segments anchored to `AudioContext.currentTime` and owns drift correction — the adapter supplies the primitives (`getSegmentSourceTime`/`seekSegment`/`stopSegment`/`liveSegmentKeys`), the host supplies the thresholds/plan/debounce (player.ts:3296-3346 is the reference implementation).
3. **Create + own the AudioContext (realtime):** `new AudioContext({ sampleRate, latencyHint })` → `createRealtimeEngine(ctx, { initialGain })`; autoplay-policy resume is a host transport gesture (realtime-engine.ts:97-102); suspend/close forwarded. Master volume is CLAMPED [0,1] (the DAW descriptor law — realtime-engine.ts:124-129): hosts needing >0 dB master headroom must pre-gain stages upstream (realtime-bridge.ts:19-21 documents the delta).
4. **Create + own the OfflineAudioContext (export):** caller-sized (from `bridgeMixdownDurationSec` / `SceneMixer.requiredLength` — trailing silence harmless, truncation is not; audio-mixdown.ts:276-293) — native in browser, web-audio-api in Node (cast through `unknown` at the seam, scene-mixer.ts:80-83). Construct a FRESH `SceneMixer` per render (CR-A #6 guard throws otherwise).
5. **Buffer materialization/resolution:** the host decodes media and provides `resolveBuffer(key) → AudioBuffer` (the engine's recipe: virtual-audio chunk render → deinterleave → reversal bake → EQ-bake, per-segment bespoke `bufferKey`; missing buffers are skipped+reported).
6. **Fold conventions:** clip+track volume folds into the per-segment `level` (strips at unity fader); solo at the strip layer; `masterBusDb` → masterVolume at the boundary (conversions.ts:28-35); export sum soft-clip (tanh >1.0) is a HOST-side post-render law (audio-mixdown.ts:90-100).
7. **Worklet assets:** WDC's worklet-backed inserts need the built bundles served at `/worklets/*.js` in the browser — copy `public/worklets/*.js` into the host's public dir (HANDOFF.md:41-44, M2 item 4; effects.ts:157-158 candidates). Note the ENGINE's own SoundTouch worklet needs no asset (Blob-URL load — soundtouch-processor.worklet.ts:205-214), and the engine's current mixdown uses empty insert chains so it serves nothing today.
8. **Worklet port-message flush:** a macrotask flush before `startRendering` when worklet-backed effects ARE in the offline path (scene-mixer.ts:340-345; SKILL §3).
9. **Instruments (optional):** DAW-style instrument/MIDI tracks need `setInstrumentProvider(...)` registered before the first ChannelStrip (index.ts:89-95; UPSTREAMING.md:39-47); otherwise the mini-synth shim stand-ins play.
10. **Workers constraint:** OfflineAudioContext/AudioBuffer cannot be constructed in a dedicated Worker (freecut-documented law, mixer.ts:615-619) — the offline mixdown is main-thread (or headless-page) in the current architecture; worklets CAN run inside an OfflineAudioContext for cloud render (spec 02 §11 Q9/§284-286 — the freecut push-not-pull SoundTouch pattern).
11. **Structure layer (optional but the intended shape):** flatten your track model to `StructuralAudioSource[]` (or use `opencutSceneToAudioSources` if opencut-shaped) + `MixerSceneSettings` — `docs/track-model.md` is the contract; S and G share ONLY trackId.
12. **Test obligations:** import `web-daw-core/test-harness` (`createOfflineContext`, `mockAudioEngine`, `compareAudioRigorous`, `THRESHOLDS`…) for the same waveform gates in your repo (README.md:85; engine consumes it in nle-bridge.test.ts:71); run vitest from a cwd where `public/worklets` resolves; serial workers.

---

## Corrections to prior beliefs

| Prior belief | Verdict | Evidence |
|---|---|---|
| "pure core" | **CONFIRMED** — no timeline/NLE types anywhere in `src/lib/daw/**` (only one doc-comment mention, note-action-order.ts:14); bridge + opencut submodule + CI auth all gone; zero submodules. One nuance: the CORE-OWNED de-risk suite's comments are nle-flavored (coreOwned test file, harmless). | §2 above; PLAN.md:103-127; `rg` over src/lib/daw. |
| "721/721" | **CONFIRMED by running** (30 files / 721 tests, exit 0; tsc clean). Addendum: README's "~70 s" understates wall clock (149 s here; tests-phase 53.65 s); CI 30-min timeout is comfortable. | §1. |
| "one-engine end-to-end with realtime==offline parity gates" | **CONFIRMED with one precision:** both mixers are dead (AudioMixer @20fa266, direct mix @abdf9ee — tombstones verified); every audio path renders through the one bridge. But the parity evidence is COMPOSED, not a single end-to-end realtime-vs-offline null-test: H3 (component null ≥60 dB, Node) + 29.1 (offline-path ≡ offline-path, sample-level 1e-6) + m30 (realtime BEHAVIORAL pins, not null-tested against offline). Saying "realtime==offline parity gates" without that composition overstates the strongest single gate. | §5, §6. |
| "bridge app-level" | **CONFIRMED** — M1.6 relocated 6 files verbatim (b837d60, byte-identical verified), engine D8 rules the topology; the bridge is 7 files now (`conversions.ts` is engine-born, review-R1 fix A4). | §4; DECISIONS.md:307-340. |
| "zero runtime deps" | **CONFIRMED** for the shipped code — external imports in `src/` are only vitest (tests) + node:fs/path (a build script); all five deps are devDependencies. | §1. |

**Additional corrections/nuances found this session:**
1. **Spec 20 is stale on two points:** §6.2 (":99") still places the bridge inside web-daw-core `src/lib/nle/` (pre-M1.6 text, written R9); §12.4's "audio-mix.ts end-state" was resolved by deletion (abdf9ee). Both need the R15 re-baseline.
2. **Engine vitest observed 1 flaky failure on the FIRST run in this sandbox** (273/274) then three consecutive green 274/274 runs — non-reproducible here, most plausibly a cold-start flake (the suite's own header documents cold-render ~13 s vs 30 s per-test budget); worth a re-run before treating "274/274" as continuously green, but NOT a repo defect claim.
3. **realtime-bridge.ts:13 has a stale-tense docstring** ("AudioMixer class can then be deleted" — it already is).
4. The strongest current one-engine gate (29.1) compares the two OFFLINE recipes; the realtime surface is pinned behaviorally (m30) — if the final app wants a true realtime-vs-offline null gate, it must be built (e.g., capture the realtime chain output via a MediaStream/audio tap or render the same graph offline through the same engine handle — the CR-A #6 guard currently forbids one mixer serving both).
5. The NLE host does NOT yet feed the G-layer's riches: inserts/sends/buses/reverb are capability-present (mixer-track-model) but the engine's `bridgeSceneSettings` materializes unity faders + solo only, EQ is buffer-baked, and the mixdown passes empty insert chains — the "mixer surface" is the whole remaining M2, UI-mocked (mockMixer.ts) but engine-unwired.

---

## Appendix: fact sheet (for D15/D16 assembly math)

- WDC: 721 tests / 30 files / ~75 copy + 11 shims + 5 coreOwned + 4 root assets / 1 CI job / 0 submodules / 0 runtime deps / vendored size = src tree only.
- Engine bridge: 7 files (1 895 LOC: scene-to-segments 370, mixer-track-model 192, segment-strip-adapter 589, scene-mixer 381, realtime-engine 188, fade-curve 175, conversions 189).
- Engine audio modules consuming it: `audio/realtime-bridge.ts` (523 L), `playback/player.ts` (audio sections), `export/audio-mixdown.ts` (315 L), `export/orchestrator.ts` (mixAudio + renderAudioOnly), surviving law library `audio/mixer.ts`, `audio/soundtouch-processor.worklet.ts` (Blob-URL worklet).
- Gates: engine vitest 274 (37 bridge tests / 12 describes) + browser 31 milestones (~246-280 tests, 3 jobs CI); WDC 721 (1 job CI).
- Vendor pin delta: docs-only (1 commit, HANDOFF+worklog).
