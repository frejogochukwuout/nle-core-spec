# 13 — Sub-Agent Scout Plan: Stream Breakdown, Prompts, Audit, Deliverables

> **Round-7 note:** the `/home/z/my-project/download/nle-spec/` paths below are the original working locations from the Round-1-6 sessions (historical record — the repo now lives at `/home/z/my-project/nle-core-spec/` and on GitHub). This document is the process record for Rounds 1-6; Round 7's process is documented in `README.md` and `audits/ROUND-7-AUDITS.md`.
**Status:** Plan for dispatching sub-agents to refine the spec with code references
**Spec file:** `13-subagent-scout-plan.md`

---

## 1. Purpose

This document defines how sub-agent scouts refine the seed specs (files `01` through `12`) into fully detailed implementation specs with concrete code references to FreeCut and OpenCut-classic. Each scout takes one stream, reads the actual source code, and produces a refined spec section with exact file paths, line numbers, and code snippets.

---

## 2. Stream Breakdown

Each stream has:
- **A seed spec file** (already written by the architect)
- **A primary teacher repo** (FreeCut or OpenCut-classic)
- **A scout prompt** (what the scout should investigate)
- **An audit pass** (a second sub-agent reviews the scout's output)
- **A final deliverable** (the refined spec section)

| # | Stream | Seed file | Primary teacher | Scout complexity |
|---|---|---|---|---|
| 1 | Core engine | `01-core-engine.md` | OpenCut-classic `EditorCore` + FreeCut `deps/` | High |
| 2 | Workers & threading | `02-workers-threading.md` | FreeCut `ManagedWorker*` + 21 workers | High |
| 3 | Playback engine | `03-playback-engine.md` | FreeCut `Clock.ts` + OpenCut-classic `PlaybackManager` | High |
| 4 | Renderer & color | `04-renderer-color.md` | FreeCut `gpu-*` + OpenCut-classic `compositor/` | High |
| 5 | Timeline | `05-timeline.md` | OpenCut-classic `timeline/` + FreeCut `features/timeline/` | Medium |
| 6 | NLE ops | `06-nle-ops.md` | FreeCut `stores/actions/edit/*` + OpenCut-classic `lib/ripple/` | High |
| 7 | Composition | `07-composition.md` | FreeCut `composition-runtime/` + OpenCut-classic `compositor/` | High |
| 8 | Color grading | `08-color-grading.md` | FreeCut `gpu-effects/effects/color.ts` | High |
| 9 | Project model | `09-project-model.md` | OpenCut-classic `project/types.ts` + `services/storage/` | Medium |
| 10 | FCPXML export | `10-fcpxml-export.md` | FCPXML 1.10 spec + our project model | Medium |
| 11 | Cloud render | `11-cloud-render.md` | FreeCut `headless/main.ts` + our design | Medium |
| 12 | Testing | `12-testing-strategy.md` | Playwright + Pixelmatch + our design | Low |

**Total: 12 streams.** Recommended parallelism: 3-4 scouts at a time (to keep the worklog manageable and avoid context loss between rounds).

---

## 3. Scout Workflow

### 3.1 Phase 1: Initial scout (draft)

Each scout:
1. Reads the seed spec file (its assigned stream)
2. Reads the master spec (`00-master-spec.md`) for context
3. Reads any dependent stream specs (e.g., the timeline scout reads `06-nle-ops.md` to understand what ops the timeline UI must support)
4. Clones the relevant reference repo(s) (FreeCut at `/tmp/freecut`, OpenCut-classic at `/tmp/opencut-classic`)
5. Reads the actual source code, matching against the open questions in the seed spec
6. Produces a refined spec section with:
   - Exact file paths
   - Line numbers (or line ranges)
   - Quoted code snippets where relevant
   - Verification of seed spec assumptions
   - Corrections to the seed spec where the actual code differs
7. Appends the refined spec to a new file: `01-core-engine.refined.md` (etc.)
8. Appends a worklog entry to `/home/z/my-project/worklog.md`

### 3.2 Phase 2: Audit pass (revision)

A second sub-agent (different from the scout) reviews the refined spec:
1. Reads the refined spec
2. Verifies the scout's claims by reading the actual source code
3. Checks for:
   - Misinterpreted code (e.g., scout said X but code does Y)
   - Missing detail (e.g., scout didn't document edge cases)
   - Outdated assumptions (e.g., seed spec assumed Z but actual code does W)
4. Produces an audit report: `01-core-engine.audit.md`
5. If audit finds issues, the original scout (or a third sub-agent) revises the refined spec
6. Final spec: `01-core-engine.final.md` (renamed from refined after audit passes)

### 3.3 Phase 3: Integration review

After all streams are refined and audited, the architect (this conversation) does a final integration review:
1. Read all 12 final specs
2. Check for cross-stream consistency (e.g., does the timeline spec match the NLE ops spec?)
3. Check that all master spec decisions are honored
4. Update `00-master-spec.md` if any decisions changed during scouting
5. Produce `00-master-spec.v2.md` if major changes are needed

---

## 4. Per-Stream Scout Prompts

Below are the prompts for each scout. Each prompt is designed to be **self-contained** — the scout doesn't need to read the whole conversation, just its prompt + the seed spec + the actual repos.

### 4.1 Stream 1: Core Engine

```
Task ID: SCOUT-01
Stream: Core engine architecture
Seed spec: /home/z/my-project/download/nle-spec/01-core-engine.md
Reference repos: 
  - /tmp/freecut (FreeCut, https://github.com/walterlow/freecut)
  - /tmp/opencut-classic (OpenCut-classic, https://github.com/opencut-app/opencut-classic)

Read first:
  - /home/z/my-project/download/nle-spec/00-master-spec.md (for context)
  - /home/z/my-project/download/nle-spec/01-core-engine.md (your seed spec)

Your job: refine the seed spec by reading the actual source code in both repos and documenting exact file paths, line numbers, and code snippets for every claim in the seed spec.

Specifically, answer every "Open Question for Sub-Agent Scout" in §7 of the seed spec. For each question:
1. Open the cited file(s) in the reference repo
2. Read the actual code
3. Quote the relevant lines (with line numbers)
4. Verify or correct the seed spec's claims
5. Document any subtleties the seed spec missed

Output: /home/z/my-project/download/nle-spec/01-core-engine.refined.md
  - Copy the seed spec
  - Fill in the "Open Questions" section with concrete answers
  - Add a new "Code References" section with all file paths and line numbers
  - Add a "Corrections to Seed Spec" section if any assumptions were wrong

Worklog: append to /home/z/my-project/worklog.md with template:
---
Task ID: SCOUT-01
Agent: general-purpose
Task: Refine 01-core-engine.md spec with code references

Work Log:
- Read seed spec and master spec
- Cloned FreeCut to /tmp/freecut
- Cloned OpenCut-classic to /tmp/opencut-classic
- Read OpenCut-classic EditorCore source at apps/web/src/editor/editor-store.ts and apps/web/src/core/index.ts
- ... (list every file read)

Stage Summary:
- Verified EditorCore manager list: [list]
- Verified initialization order: [list]
- Documented X contracts in deps/
- Corrected seed spec assumption about Y
- Produced 01-core-engine.refined.md

Key files to investigate (in order):
1. OpenCut-classic: apps/web/src/editor/editor-store.ts (or wherever EditorCore is defined)
2. OpenCut-classic: apps/web/src/core/index.ts (manager initialization)
3. OpenCut-classic: apps/web/src/core/managers/ (all manager files)
4. OpenCut-classic: apps/web/src/commands/ (command pattern)
5. FreeCut: src/runtime/composition-runtime/deps/ (all contract files)
6. FreeCut: scripts/check-feature-boundaries.mjs (lint rules)
7. FreeCut: src/runtime/ (engine equivalent)
8. FreeCut: src/features/timeline/stores/ (store structure)

For each file:
- Note the full path
- Note approximate line count
- Quote the public API surface (exported functions, classes, interfaces)
- Note any subtleties (lifecycle hooks, error handling, etc.)

After reading all files, update the seed spec's "Open Questions" section with concrete answers based on what you found.
```

### 4.2 Stream 2: Workers & Threading

```
Task ID: SCOUT-02
Stream: Workers & threading
Seed spec: /home/z/my-project/download/nle-spec/02-workers-threading.md

Read first:
  - /home/z/my-project/download/nle-spec/00-master-spec.md
  - /home/z/my-project/download/nle-spec/02-workers-threading.md
  - /home/z/my-project/download/nle-spec/01-core-engine.md (dependency)

Key files to investigate in FreeCut (/tmp/freecut):
1. src/shared/utils/managed-worker.ts
2. src/shared/utils/managed-worker-pool.ts
3. src/shared/utils/managed-worker-session.ts
4. src/runtime/composition-runtime/utils/audio-decode-worker.ts
5. src/runtime/composition-runtime/utils/audio-decode-cache.ts
6. src/features/timeline/services/waveform-worker.ts
7. src/features/timeline/services/waveform-cache.ts
8. src/features/timeline/workers/filmstrip-extraction-worker.ts
9. src/features/timeline/services/filmstrip-cache.ts
10. src/features/export/workers/export-render.worker.ts
11. src/features/export/utils/render-pipeline.ts
12. src/features/media-library/workers/opfs-worker.ts
13. src/features/media-library/services/opfs-service.ts
14. src/features/media-library/workers/media-processor.worker.ts
15. src/features/media-library/transcription/workers/whisper.worker.ts
16. src/features/preview/workers/decoder-prewarm-worker.ts
17. src/features/preview/utils/decoder-prewarm.ts
18. src/runtime/composition-runtime/worklets/soundtouch-preview-processor.worklet.ts
19. src/runtime/composition-runtime/utils/soundtouch-preview-worklet.ts
20. src/runtime/composition-runtime/components/soundtouch-worklet-audio.tsx
21. vite.config.ts (worker config, COOP/CEOP headers)

For each worker file:
- Document the input/output message types (full TypeScript types)
- Document the state cached across messages
- Document the lifecycle (creation, idle, termination)
- Document the error handling
- Quote the postMessage / Transferable patterns

For the ManagedWorker* abstraction:
- Quote the full implementation (it's only ~120 LOC across 3 files)
- Document the API surface
- Document the lifecycle hooks

For the AudioWorklet:
- Quote the registerProcessor implementation
- Document the process() method
- Document the port.onmessage command protocol
- Document buffer management

Output: /home/z/my-project/download/nle-spec/02-workers-threading.refined.md
Worklog: append to /home/z/my-project/worklog.md
```

### 4.3 Stream 3: Playback Engine

```
Task ID: SCOUT-03
Stream: Playback engine (clock, decode, sync, scrubbing, varispeed)
Seed spec: /home/z/my-project/download/nle-spec/03-playback-engine.md

Read first:
  - /home/z/my-project/download/nle-spec/00-master-spec.md
  - /home/z/my-project/download/nle-spec/03-playback-engine.md
  - /home/z/my-project/download/nle-spec/02-workers-threading.md (dependency)

Key files to investigate:

FreeCut (/tmp/freecut):
1. src/runtime/player/clock/Clock.ts (642 LOC — READ IN FULL, document every method)
2. src/runtime/player/Player.tsx
3. src/runtime/player/use-player.ts
4. src/runtime/player/event-emitter.ts
5. src/runtime/player/player-emitter.ts
6. src/runtime/player/video/VideoSourcePool.ts
7. src/runtime/composition-runtime/components/video-content.tsx (1300 LOC)
8. src/runtime/composition-runtime/utils/video-sync-plan.ts (find via imports in video-content.tsx)
9. src/runtime/composition-runtime/utils/preview-audio-graph.ts
10. src/runtime/composition-runtime/utils/reverse-shuttle-audio.ts
11. src/features/preview/utils/scrubbing-cache.ts
12. src/features/preview/utils/fast-scrub-prewarm.ts
13. src/features/preview/utils/fast-scrub-overlay-guard.ts
14. src/features/preview/utils/scrub-proxy-fallback.ts
15. src/features/preview/utils/scrub-throttle.ts
16. src/features/preview/utils/decoder-prewarm.ts
17. src/features/preview/utils/preview-scrubbing-cache-bridge.ts

OpenCut-classic (/tmp/opencut-classic):
18. apps/web/src/core/managers/playback-manager.ts (257 LOC)
19. apps/web/src/services/video-cache/service.ts (338 LOC)
20. apps/web/src/media/mediabunny.ts
21. rust/crates/time/src/ (all files — verify MediaTime, FrameRate, tick count)

For Clock.ts (the most important file):
- Quote the full implementation
- Document every method: _now(), _computeFrameAtTime, seekToFrame, setInPoint, setOutPoint, _catchUpToCurrentTime, etc.
- Document the AudioContext.currentTime trick (exact line numbers)
- Document the monotonic offset map for source switching
- Document rate change handling (positive, negative, zero)
- Document range playback

For the sync plans:
- Identify all 5 plans (paused-frame, initial-playing, drift-correction, premount, reverse-shuttle)
- For each: trigger condition, sync mechanism, edge cases
- Quote the dispatch logic

For mediabunny:
- Document the API surface used (Input, BlobSource, getPrimaryVideoTrack, canDecode, CanvasSink, VideoSampleSink)
- Verify whether VideoSampleSink exists and returns raw VideoFrames (we need this for 10-bit)
- Document how to configure pixelFormat: 'P010' for 10-bit decode

Output: /home/z/my-project/download/nle-spec/03-playback-engine.refined.md
Worklog: append to /home/z/my-project/worklog.md
```

### 4.4 Stream 4: Renderer & Color

```
Task ID: SCOUT-04
Stream: WebGPU renderer + 10-bit scene-linear color pipeline
Seed spec: /home/z/my-project/download/nle-spec/04-renderer-color.md

Read first:
  - /home/z/my-project/download/nle-spec/00-master-spec.md
  - /home/z/my-project/download/nle-spec/04-renderer-color.md
  - /home/z/my-project/download/nle-spec/07-composition.md (dependency — FrameDescriptor shape)

Key files to investigate:

FreeCut (/tmp/freecut):
1. src/infrastructure/gpu-compositor/compositor-pipeline.ts
2. src/infrastructure/gpu-compositor/gpu-texture-pool.ts
3. src/infrastructure/gpu-effects/effects-pipeline.ts
4. src/infrastructure/gpu-effects/common.ts (WGSL helpers)
5. src/infrastructure/gpu-transitions/transition-pipeline.ts
6. src/infrastructure/gpu-masks/ (all files)
7. src/infrastructure/gpu-scopes/ (histogram, waveform, vectorscope — all 3 files + scope-renderer)
8. src/infrastructure/gpu-text/ (glyph atlas, text pipeline)
9. src/infrastructure/gpu-shapes/ (shape rendering)
10. src/infrastructure/gpu-media/ (media render pipeline)
11. src/features/preview/utils/scrubbing-cache.ts (canvas config)

OpenCut-classic (/tmp/opencut-classic):
12. rust/crates/gpu/src/context.rs (GpuContext — main renderer)
13. rust/crates/gpu/src/lib.rs (constants — texture format)
14. rust/crates/gpu/src/shaders/ (all WGSL shaders: fullscreen, blit)
15. rust/crates/compositor/src/ (frame.rs, compositor.rs, layer.rs, texture_pool.rs)
16. rust/crates/compositor/src/shaders/ (layer.wgsl, blend.wgsl, mask.wgsl)
17. rust/crates/effects/src/ (pipeline.rs, shaders/gaussian_blur.wgsl)
18. rust/crates/masks/src/ (sdf.rs, shaders/jfa_*.wgsl)
19. apps/web/src/services/renderer/gpu-renderer.ts
20. apps/web/src/services/renderer/canvas-renderer.ts
21. apps/web/src/services/renderer/compositor/wasm-compositor.ts
22. apps/web/src/services/renderer/compositor/frame-descriptor.ts

For FreeCut's GPU infrastructure:
- Document every file in src/infrastructure/gpu-*/
- For each: purpose, texture formats used, color space awareness (likely none), bind group caching strategy
- Verify the texture formats used (we expect rgba8unorm — confirm)
- Verify there's NO color management (we expect none — confirm)

For OpenCut-classic's WGSL shaders:
- Quote each shader in full
- For blend.wgsl: verify the 17 blend modes + Porter-Duff math
- For layer.wgsl: verify the quad transform model
- For JFA shaders: verify the algorithm

For mediabunny P010:
- Verify the API for requesting pixelFormat: 'P010'
- Verify VideoFrame objects expose P010 data correctly
- Research how to upload P010 to WebGPU textures (copyExternalImageToTexture vs writeTexture)

Output: /home/z/my-project/download/nle-spec/04-renderer-color.refined.md
Worklog: append to /home/z/my-project/worklog.md
```

### 4.5 Stream 5: Timeline

```
Task ID: SCOUT-05
Stream: Timeline UI (DOM-based, virtualized)
Seed spec: /home/z/my-project/download/nle-spec/05-timeline.md

Read first:
  - /home/z/my-project/download/nle-spec/00-master-spec.md
  - /home/z/my-project/download/nle-spec/05-timeline.md
  - /home/z/my-project/download/nle-spec/06-nle-ops.md (dependency — ops the UI must support)

Key files to investigate:

OpenCut-classic (/tmp/opencut-classic) — primary teacher for DOM approach:
1. apps/web/src/timeline/components/index.tsx (954 LOC)
2. apps/web/src/timeline/components/timeline-track.tsx
3. apps/web/src/timeline/components/timeline-element.tsx
4. apps/web/src/timeline/components/timeline-ruler.tsx
5. apps/web/src/timeline/components/timeline-playhead.tsx
6. apps/web/src/timeline/components/timeline-toolbar.tsx
7. apps/web/src/timeline/components/snap-indicator.tsx
8. apps/web/src/timeline/components/drag-line.tsx
9. apps/web/src/timeline/components/audio-waveform.tsx
10. apps/web/src/timeline/controllers/ (all: drag-drop, resize, seek, playhead, zoom, keyframe-drag, element-interaction)
11. apps/web/src/timeline/placement/ (resolve, overlap, compatibility, insert-index)
12. apps/web/src/timeline/snapping/ (all files)
13. apps/web/src/timeline/types.ts
14. apps/web/src/timeline/hooks/use-timeline-drag.ts
15. apps/web/src/timeline/hooks/use-timeline-resize.ts

FreeCut (/tmp/freecut) — for per-element NLE op UI:
16. src/features/timeline/components/timeline.tsx (1100 LOC)
17. src/features/timeline/components/timeline-content.tsx (2253 LOC)
18. src/features/timeline/components/timeline-item/ (all ~50 files — list and summarize each)
19. src/features/timeline/components/timeline-ruler-viewport-canvas.tsx
20. src/features/timeline/components/clip-filmstrip/ (tiled-canvas, visible-filmstrip-canvas, etc.)
21. src/features/timeline/components/clip-waveform/ (visible-waveform-canvas, etc.)
22. src/features/timeline/hooks/ (use-timeline-drag, use-timeline-resize, use-rate-stretch, use-timeline-slip-slide)
23. src/features/timeline/utils/timeline-snap-utils.ts
24. src/features/timeline/utils/razor-snap.ts

For OpenCut-classic timeline:
- Document the controller pattern (separation of interaction logic from rendering)
- Document the placement algorithm (overlap resolution)
- Document the snap point computation
- Document the virtualization approach
- Document the keyboard shortcuts

For FreeCut timeline:
- Document what's different from OpenCut-classic
- Document the per-element UI components (trim handles, stretch handles, audio fade handles, etc.)
- Document the canvas-based ruler (we're considering DOM)

Output: /home/z/my-project/download/nle-spec/05-timeline.refined.md
Worklog: append to /home/z/my-project/worklog.md
```

### 4.6 Stream 6: NLE Operations

```
Task ID: SCOUT-06
Stream: NLE operations (pure functions over timeline state)
Seed spec: /home/z/my-project/download/nle-spec/06-nle-ops.md

Read first:
  - /home/z/my-project/download/nle-spec/00-master-spec.md
  - /home/z/my-project/download/nle-spec/06-nle-ops.md
  - /home/z/my-project/download/nle-spec/05-timeline.md (dependency — UI that triggers ops)

Key files to investigate:

FreeCut (/tmp/freecut) — primary teacher for ops:
1. src/features/timeline/stores/actions/edit/split-actions.ts
2. src/features/timeline/utils/split-bookkeeping.ts
3. src/features/timeline/stores/actions/edit/trim-actions.ts
4. src/features/timeline/utils/trim-utils.ts
5. src/features/timeline/utils/trim-edit-constraints.ts
6. src/features/timeline/components/timeline-item/trim-handles.tsx
7. src/features/timeline/stores/actions/edit/rate-stretch-actions.ts
8. src/features/timeline/hooks/use-rate-stretch.ts
9. src/features/timeline/stores/actions/sync-lock-ripple.ts
10. src/features/timeline/utils/track-sync-lock.ts
11. src/features/timeline/stores/rolling-edit-preview-store.ts
12. src/features/timeline/preview/components/rolling-edit-overlay.tsx
13. src/features/timeline/utils/rolling-edit-utils.ts
14. src/features/timeline/stores/slip-edit-preview-store.ts
15. src/features/timeline/preview/components/slip-edit-overlay.tsx
16. src/features/timeline/utils/slip-utils.ts
17. src/features/timeline/hooks/use-timeline-slip-slide.ts
18. src/features/timeline/stores/slide-edit-preview-store.ts
19. src/features/timeline/preview/components/slide-edit-overlay.tsx
20. src/features/timeline/utils/slide-utils.ts
21. src/features/timeline/stores/actions/edit/freeze-frame-actions.ts
22. src/features/timeline/stores/actions/edit/range-removal-actions.ts
23. src/features/timeline/utils/timeline-snap-utils.ts
24. src/features/timeline/utils/razor-snap.ts

OpenCut-classic (/tmp/opencut-classic) — for ripple diff pattern:
25. apps/web/src/lib/ripple/shift.ts
26. apps/web/src/lib/ripple/apply.ts
27. apps/web/src/lib/ripple/diff.ts
28. apps/web/src/timeline/placement/ (resolve, overlap, compatibility, insert-index)
29. apps/web/src/timeline/group-move/ (all files)
30. apps/web/src/timeline/group-resize/ (compute-resize.ts and others)
31. apps/web/src/retime/ (rate, resolve, split, audio-stretch, presets — all 5 files)
32. apps/web/src/commands/timeline/element/ (split, move, delete, duplicate, insert elements — all)
33. apps/web/src/commands/timeline/track/ (toggle-track-mute, toggle-track-visibility)

For each op:
- Quote the algorithm in full
- Document edge cases
- Document multi-select behavior
- Document constraints (when does it reject?)

For OpenCut-classic's ripple diff:
- Quote all 3 files in full
- Document the diff-based pattern (why it's better than FreeCut's inline ripple)

For OpenCut-classic's retime:
- Document the audio pitch preservation (SoundTouch integration)
- Document the retime presets

Output: /home/z/my-project/download/nle-spec/06-nle-ops.refined.md
Worklog: append to /home/z/my-project/worklog.md
```

### 4.7 Stream 7: Composition

```
Task ID: SCOUT-07
Stream: Composition runtime (builds FrameDescriptor from SceneState)
Seed spec: /home/z/my-project/download/nle-spec/07-composition.md

Read first:
  - /home/z/my-project/download/nle-spec/00-master-spec.md
  - /home/z/my-project/download/nle-spec/07-composition.md
  - /home/z/my-project/download/nle-spec/04-renderer-color.md (dependency — FrameDescriptor contract)
  - /home/z/my-project/download/nle-spec/06-nle-ops.md (dependency — element types)

Key files to investigate:

FreeCut (/tmp/freecut):
1. src/runtime/composition-runtime/ (full directory listing)
2. src/runtime/composition-runtime/components/main-composition.tsx (or equivalent entry)
3. src/runtime/composition-runtime/components/video-content.tsx
4. src/runtime/composition-runtime/components/audio-content.tsx (or pitch-corrected-audio.tsx)
5. src/runtime/composition-runtime/components/text-content.tsx
6. src/runtime/composition-runtime/components/shape-content.tsx
7. src/runtime/composition-runtime/components/image-content.tsx (if exists)
8. src/runtime/composition-runtime/deps/ (all contract files)
9. src/infrastructure/gpu-compositor/compositor-pipeline.ts (how FreeCut composites)
10. src/infrastructure/gpu-effects/effects-pipeline.ts (effect chain)
11. src/infrastructure/gpu-transitions/transition-pipeline.ts
12. src/infrastructure/gpu-masks/ (all files)

OpenCut-classic (/tmp/opencut-classic):
13. rust/crates/compositor/src/frame.rs (FrameDescriptor)
14. rust/crates/compositor/src/compositor.rs (main render loop)
15. rust/crates/compositor/src/layer.rs
16. apps/web/src/services/renderer/gpu-renderer.ts
17. apps/web/src/services/renderer/canvas-renderer.ts
18. apps/web/src/services/renderer/scene-builder.ts
19. apps/web/src/services/renderer/compositor/wasm-compositor.ts
20. apps/web/src/services/renderer/compositor/frame-descriptor.ts
21. apps/web/src/services/renderer/nodes/ (image-node, graphic-node, text-node, effect-node, etc.)

For FreeCut composition:
- Document the full directory structure
- For each component (video-content, audio-content, text-content, shape-content):
  - Quote key parts
  - Document the contract dependencies
- Document how FreeCut builds its equivalent of FrameDescriptor (or whether it renders directly)

For OpenCut-classic:
- Document the FrameDescriptor shape (frame.rs)
- Document the compositor render loop (compositor.rs)
- Document the TS-side frame descriptor building (frame-descriptor.ts, scene-builder.ts)
- Document the render node tree (nodes/)

Output: /home/z/my-project/download/nle-spec/07-composition.refined.md
Worklog: append to /home/z/my-project/worklog.md
```

### 4.8 Stream 8: Color Grading

```
Task ID: SCOUT-08
Stream: Color grading effects & UI
Seed spec: /home/z/my-project/download/nle-spec/08-color-grading.md

Read first:
  - /home/z/my-project/download/nle-spec/00-master-spec.md
  - /home/z/my-project/download/nle-spec/08-color-grading.md
  - /home/z/my-project/download/nle-spec/04-renderer-color.md (dependency — color pipeline)

Key files to investigate in FreeCut (/tmp/freecut):
1. src/infrastructure/gpu-effects/effects/color.ts (1500+ LOC — READ IN FULL)
   - Specifically the color_wheelsFragment shader around line 611
   - The secondaryQualifierFragment shader around line 942
   - The powerWindowFragment shader around line 1180
   - The vibranceFragment shader around line 1390
   - The curves baking logic around line 1460
2. src/infrastructure/gpu-effects/effects/lut.ts (LUT shader)
3. src/infrastructure/gpu-effects/lut/cube-lut.ts (.cube parser)
4. src/infrastructure/gpu-effects/effects/keying.ts (chroma key)
5. src/shared/utils/gpu-curves.ts (curve baking — full file)
6. src/infrastructure/gpu-scopes/histogram-scope.ts
7. src/infrastructure/gpu-scopes/waveform-scope.ts
8. src/infrastructure/gpu-scopes/vectorscope-scope.ts
9. src/infrastructure/gpu-scopes/scope-renderer.ts
10. src/infrastructure/gpu-effects/effects-pipeline.ts (effect registration, execution)
11. src/infrastructure/gpu-effects/common.ts (WGSL helpers)
12. src/features/effects/components/panels/gpu-color-wheels-panel.tsx
13. src/features/effects/components/panels/gpu-curves-panel.tsx
14. src/features/effects/components/panels/gpu-lut-panel.tsx
15. Any qualifier / power-window / vibrance panels

For each shader (color_wheels, qualifier, power_window, vibrance, curves, lut):
- Quote the FULL shader code (not just summary)
- Document every uniform
- Document every uniform's range and effect
- Verify the math operates on gamma-encoded values (we expect this — confirms need for our linear-light port)

For each scope:
- Quote the compute shader
- Document the source texture format (we expect rgba8unorm — verify)
- Document the 8-bit assumption (we expect u32(max(r * 255.0, 1.0)) — verify)
- Document how to port to rgba16float input

For the .cube LUT parser:
- Quote the full parser
- Verify the data is stored as rgba8 (we expect this — we change to rgba16float)

For the UI panels:
- Document the parameter binding
- Document the slider ranges
- Document the wheel/picker components

Output: /home/z/my-project/download/nle-spec/08-color-grading.refined.md
Worklog: append to /home/z/my-project/worklog.md
```

### 4.9 Stream 9: Project Model

```
Task ID: SCOUT-09
Stream: Project data model & persistence
Seed spec: /home/z/my-project/download/nle-spec/09-project-model.md

Read first:
  - /home/z/my-project/download/nle-spec/00-master-spec.md
  - /home/z/my-project/download/nle-spec/09-project-model.md

Key files to investigate:

OpenCut-classic (/tmp/opencut-classic):
1. apps/web/src/project/types.ts (full file — quote it)
2. apps/web/src/timeline/types.ts
3. apps/web/src/services/storage/ (all files — IndexedDB adapter, OPFS adapter, migrations)
4. apps/web/src/services/storage/migrations/ (list all 31 migration files, summarize what each does)
5. apps/web/src/core/managers/project-manager.ts
6. apps/web/src/core/managers/save-manager.ts
7. apps/web/src/components/providers/editor-provider.tsx

FreeCut (/tmp/freecut):
8. src/types/project.ts
9. src/types/timeline.ts
10. src/infrastructure/storage/workspace-fs/projects.ts
11. src/infrastructure/storage/workspace-fs/fs-primitives.ts
12. src/infrastructure/storage/handles-db.ts
13. src/shared/projects/migrations/ (list all, summarize)
14. src/features/project-bundle/bundle-export-service.ts
15. src/features/project-bundle/bundle-import-service.ts

Also:
16. Read the kimdogyeom bug reports (GitHub issues #870, #871, #873 in opencut-app/opencut) — document the specific bugs in OpenCut-classic's persistence layer

For OpenCut-classic project types:
- Quote the full project types
- Document the schema version evolution (31 migrations)
- Document the storage layer (IndexedDB + OPFS)
- Document the persistence bugs (#870, #871, #873) — these are the bugs we're avoiding

For FreeCut:
- Document the FS-Access API pattern (we don't adopt)
- Document the IndexedDB handle registry (we don't adopt)

For OPFS:
- Research the OPFS API (navigator.storage.getDirectory, etc.)
- Verify browser support (Chromium 86+, Firefox 111+, Safari 16.4+)
- Verify worker-context access works

Output: /home/z/my-project/download/nle-spec/09-project-model.refined.md
Worklog: append to /home/z/my-project/worklog.md
```

### 4.10 Stream 10: FCPXML Export

```
Task ID: SCOUT-10
Stream: FCPXML exporter
Seed spec: /home/z/my-project/download/nle-spec/10-fcpxml-export.md

Read first:
  - /home/z/my-project/download/nle-spec/00-master-spec.md
  - /home/z/my-project/download/nle-spec/10-fcpxml-export.md
  - /home/z/my-project/download/nle-spec/09-project-model.md (dependency — project schema)

This scout is different — primary source is the FCPXML 1.10 spec, not a reference repo.

Tasks:
1. Find Apple's FCPXML 1.10 specification:
   - https://developer.apple.com/documentation/finalcutproxreferencedocumentation
   - The XSD schema (search for FCPXML.xsd)
   - Example FCPXML files (export from FCP if possible, or find online)

2. Document the full element/attribute list:
   - <fcpxml> root
   - <resources> (formats, assets, effects)
   - <library> → <event> → <project> → <sequence>
   - <spine> (main video track)
   - Lanes (positive = overlay, negative = audio)
   - <asset-clip>, <sync-clip>, <title>, <caption>, <transition>, <ref-clip>
   - <marker>, <chapter-marker>
   - Color space attributes
   - Speed/retiming attributes
   - Text style resources

3. Verify our planned mappings (in seed spec §4) against the actual spec:
   - Does FCPXML 1.10 support the colorSpace values we listed?
   - Are the transition effect IDs we listed correct?
   - Does <asset-clip> support timeScale for retiming?
   - How are audio levels represented?

4. Find existing TypeScript FCPXML libraries:
   - Search npm for "fcpxml"
   - Search GitHub for "fcpxml typescript"
   - Evaluate if any are usable

5. Browser-side XSD validation:
   - Research xmllint WASM, libxmljs2 alternatives
   - Document a path to validating FCPXML in the browser

6. Research the LUT-in-FCPXML pattern:
   - How to embed a 3D LUT as an <effect> in FCPXML
   - Verify the structure

Output: /home/z/my-project/download/nle-spec/10-fcpxml-export.refined.md
Worklog: append to /home/z/my-project/worklog.md
```

### 4.11 Stream 11: Cloud Render

```
Task ID: SCOUT-11
Stream: Cloud render pipeline
Seed spec: /home/z/my-project/download/nle-spec/11-cloud-render.md

Read first:
  - /home/z/my-project/download/nle-spec/00-master-spec.md
  - /home/z/my-project/download/nle-spec/11-cloud-render.md
  - /home/z/my-project/download/nle-spec/01-core-engine.md (dependency — render entry point)
  - /home/z/my-project/download/nle-spec/04-renderer-color.md (dependency — readPixels)

Key files to investigate:

FreeCut (/tmp/freecut):
1. src/headless/main.ts (FreeCut's headless harness — full file)
2. Any related headless test files (search for "headless" or "playwright" in tests/)

Research tasks (web search + experimentation):
3. Chrome headless flags for real GPU WebGPU on Linux:
   - Verify --headless=new, --enable-features=Vulkan, --use-vulkan, --enable-webgpu
   - Find a working Dockerfile that has Chrome + Vulkan + WebGPU
   - Test on a real RunPod instance if possible

4. GPU readback performance:
   - Benchmark copyTextureToBuffer + mapAsync for 1080p, 4K, 8K
   - Find optimal parallelism level (frames in flight)
   - Research if there's a zero-copy path (there isn't, but verify)

5. mediabunny streaming source:
   - Does mediabunny support HTTP range requests for large media?
   - If not, document the workaround (download whole file first)

6. ffmpeg raw frame pipe:
   - Verify the exact CLI args for rgb24 and yuv422p10le pipe input
   - Test encoding to ProRes 4444, H.265, DNxHR
   - Verify audio muxing

7. RunPod GPU containers:
   - Verify RunPod supports GPU passthrough
   - Verify Chrome + Vulkan work in RunPod containers
   - Estimate cost per 4K render minute

8. OfflineAudioContext in headless Chrome:
   - Verify it works
   - Test rendering a simple beep
   - Verify AudioWorklet runs correctly in OfflineAudioContext

9. Playwright driving headless Chrome:
   - Verify page.exposeFunction works for our onFrame callback
   - Test piping large ArrayBuffers from page to Node.js

Output: /home/z/my-project/download/nle-spec/11-cloud-render.refined.md
Worklog: append to /home/z/my-project/worklog.md
```

### 4.12 Stream 12: Testing Strategy

```
Task ID: SCOUT-12
Stream: Test infrastructure & verification strategy
Seed spec: /home/z/my-project/download/nle-spec/12-testing-strategy.md

Read first:
  - /home/z/my-project/download/nle-spec/00-master-spec.md
  - /home/z/my-project/download/nle-spec/12-testing-strategy.md

This scout is mostly research (no reference repo to read). Tasks:

1. Verify the test stack:
   - Vitest (latest version, configuration)
   - Playwright (browser test runner, headless Chrome)
   - Pixelmatch (pixel diff library)
   - fast-check (property-based testing)
   - Zod (schema validation in tests)

2. Verify virtual framebuffer:
   - Xvfb on Linux CI
   - Software WebGPU via SwiftShader (--enable-unsafe-swiftshader)
   - Test that WebGPU initializes in this mode

3. Generate test assets:
   - ffmpeg commands for solid color videos (red, green, blue, white, black)
   - ffmpeg commands for gradient videos
   - ffmpeg commands for SMPTE color bars
   - ffmpeg commands for reference tones (440Hz, 1000Hz sine waves)
   - Test that these generate correctly

4. Verify pixel comparison approach:
   - Playwright screenshot (verify device pixel ratio is 1:1)
   - Pixelmatch threshold tuning (what's a good default? 0.1? 0.05?)
   - Cross-platform pixel consistency (Mac Metal vs Linux Vulkan vs Windows D3D12)

5. Verify audio comparison:
   - OfflineAudioContext rendering
   - Float32Array comparison (sample-by-sample with tolerance)
   - FFT comparison (for frequency-domain tests)

6. Design the WYSIWYG test:
   - Define exact test projects (list of project JSON files)
   - Define test frames (which frames to compare)
   - Define acceptable diff threshold (must be 0 for true WYSIWYG)

7. Design the test matrix:
   - Smoke tests (every PR, <2 min)
   - Full tests (merge to main, ~40 min)
   - Nightly tests (large/long-running)

8. CI configuration:
   - GitHub Actions workflow
   - Self-hosted GPU runner setup
   - Test artifact preservation on failure

9. Property-based test design:
   - Arbitrary generators for SceneState, ops, etc.
   - Invariant list (no overlaps, no negative durations, etc.)
   - Test runner config (how many cases per property?)

Output: /home/z/my-project/download/nle-spec/12-testing-strategy.refined.md
Worklog: append to /home/z/my-project/worklog.md
```

---

## 5. Parallelism Strategy

### 5.1 Recommended batching

**Round 1 (parallel, 4 scouts):**
- SCOUT-01 (core engine)
- SCOUT-02 (workers & threading)
- SCOUT-03 (playback engine)
- SCOUT-09 (project model)

These are foundational — other streams depend on them.

**Round 2 (parallel, 4 scouts):**
- SCOUT-04 (renderer & color) — depends on SCOUT-01 for engine contracts
- SCOUT-05 (timeline) — depends on SCOUT-06 for op inventory (but can read seed spec)
- SCOUT-06 (NLE ops) — independent
- SCOUT-07 (composition) — depends on SCOUT-04 (but can read seed spec)

**Round 3 (parallel, 4 scouts):**
- SCOUT-08 (color grading) — depends on SCOUT-04
- SCOUT-10 (FCPXML export) — depends on SCOUT-09
- SCOUT-11 (cloud render) — depends on SCOUT-01
- SCOUT-12 (testing) — independent

### 5.2 Audit pass

After each round, dispatch audit sub-agents (different from scouts) to review the refined specs:

- AUDIT-01: review SCOUT-01's output
- AUDIT-02: review SCOUT-02's output
- ... etc.

Each auditor:
1. Reads the refined spec
2. Reads the actual source code (spot-check 5-10 file claims)
3. Documents any discrepancies
4. Returns an audit report: `XX-stream.audit.md`

If audit finds significant issues, dispatch a revision scout to fix.

### 5.3 Integration review (final)

After all 12 streams are refined + audited, the architect (this conversation) does a final integration review:

1. Read all 12 refined specs
2. Check cross-stream consistency:
   - Does `01-core-engine.md`'s `EditorCore` API match what `05-timeline.md` calls?
   - Does `04-renderer-color.md`'s `FrameDescriptor` match what `07-composition.md` builds?
   - Does `02-workers-threading.md`'s `decode.worker.ts` interface match what `03-playback-engine.md` uses?
   - Does `06-nle-ops.md`'s command structure match what `01-core-engine.md`'s `CommandManager` expects?
3. Check that all master spec decisions are honored
4. Update `00-master-spec.md` if any decisions changed during scouting
5. Produce `00-master-spec.v2.md` if major changes are needed

---

## 6. Deliverables

After the full scout process, the final spec set is:

```
/home/z/my-project/download/nle-spec/
├── 00-master-spec.md (or 00-master-spec.v2.md if updated)
├── 01-core-engine.refined.md → renamed to 01-core-engine.md
├── 02-workers-threading.refined.md → renamed to 02-workers-threading.md
├── 03-playback-engine.refined.md → renamed to 03-playback-engine.md
├── 04-renderer-color.refined.md → renamed to 04-renderer-color.md
├── 05-timeline.refined.md → renamed to 05-timeline.md
├── 06-nle-ops.refined.md → renamed to 06-nle-ops.md
├── 07-composition.refined.md → renamed to 07-composition.md
├── 08-color-grading.refined.md → renamed to 08-color-grading.md
├── 09-project-model.refined.md → renamed to 09-project-model.md
├── 10-fcpxml-export.refined.md → renamed to 10-fcpxml-export.md
├── 11-cloud-render.refined.md → renamed to 11-cloud-render.md
├── 12-testing-strategy.refined.md → renamed to 12-testing-strategy.md
├── 14-implementation-phases.md (already written — see next file)
└── audits/ (audit reports, kept for reference)
    ├── 01-core-engine.audit.md
    ├── 02-workers-threading.audit.md
    └── ...
```

These are the **implementation specs** — a developer (human or AI) can read them and start building.

---

## 7. Worklog Protocol

All scouts and auditors append to `/home/z/my-project/worklog.md` using the template in the system prompt. Specifically:

```markdown
---
Task ID: SCOUT-XX
Agent: general-purpose
Task: Refine XX-stream.md spec with code references

Work Log:
- Read seed spec at /home/z/my-project/download/nle-spec/XX-stream.md
- Read master spec at /home/z/my-project/download/nle-spec/00-master-spec.md
- Cloned FreeCut to /tmp/freecut
- Cloned OpenCut-classic to /tmp/opencut-classic
- Read [list of files with paths]
- ...

Stage Summary:
- Verified [X] claims in the seed spec
- Corrected [Y] assumptions
- Added [Z] code references (file paths, line numbers, code snippets)
- Produced /home/z/my-project/download/nle-spec/XX-stream.refined.md
```

The architect can read the worklog to track progress across all scouts.

---

**End of `13-subagent-scout-plan.md`.** Next: `14-implementation-phases.md`.
