# 14 — Implementation Phases: From Playback Spike to Full NLE

**Stream:** Phased implementation plan
**Status:** Plan for executing the spec (Round-7 update: engine-aware build strategy, §2.1)
**Spec file:** `14-implementation-phases.md`

---

## 1. Purpose

Define the implementation order. Each phase produces a shippable milestone. Phases build on each other but each is independently valuable — if we stop after any phase, we have something useful.

---

## 2. Phase Overview

### 2.1 Engine-aware build strategy (Round 7)

The phases below were written greenfield; the nle-engine reference changes the *cost* of several of them without changing their order or exit criteria. Per `19-code-references.md` §8's per-subsystem ROI table:

- **Graft from the engine** (adapt, don't adopt): NLE op algorithms (~20 families, spec 06's §10.4 maps them method-by-method), the transition planner/handles/27 presentations (spec 07 §6.1A now matches the engine's model by construction), the Clock + six sync plans (spec 03 §13E), the audio mixer/EQ/pitch worklet. All grafted code passes through the spec 15 command layer — the engine's class-API and JSON-RPC+$ref surface are the adapter target, never the architecture.
- **Rebuild fresh**: media pipeline (mediabunny+WebCodecs), persistence (OPFS per spec 09), FCPXML export (spec 10 — pure JSON→XML, no engine dependency), workers (spec 02), UI shell + timeline UI (specs 18/05), and the three-tier test harness (spec 17).
- **Correct, don't copy**: the 8-bit sRGB pipeline (re-texture per Decision 5), singleton texture returns (spec 04 §7.1's pool discipline), render-loop item-type skip (spec 07 §12.2).

The engine's own wave plan (its `gaps/audit/MASTER.md`, waves 4A→7) is converging on the same contracts from its side; the seal round re-baselines (spec 19 §9). The timeline-distill repo, when it lands, becomes the timeline-UI code reference for P1.

| Phase | Goal | Exit Criteria | Estimated Effort | Engine contribution |
|---|---|---|---|---|
| **P0: Playback spike** | Single clip, play/pause/seek, frame-accurate | User loads a video file, plays it smoothly | 1-2 weeks | Reference only (clock + sync plans graft; media path rebuilt fresh — engine is procedural-only) |
| **P1: Multi-track + UI shell** | Multiple clips on a timeline, basic composition, shell scaffold | User arranges 5 clips on 3 tracks, previews the composite | 2-3 weeks | Scene assembly + compositor structure graft (8-bit→10-bit corrective); shell is greenfield (spec 18) |
| **P2: NLE ops** | Cut/split/trim/ripple/move/snap | User performs a real rough cut | 3-4 weeks | **Biggest accelerator** — ~20 op families already implemented + tested in the engine; wrap in the command layer |
| **P3: Composition & transitions** | Crossfades, blends, basic effects | User adds transitions between clips | 2-3 weeks | 27 presentations + planner + handle math graft; effects pipeline math ports, pipeline discipline rebuilds |
| **P4: Color grading** | Wheels, curves, LUT, qualifier, scopes (10-bit) | User grades a clip with 10-bit precision | 3-4 weeks | Effect algorithms port; 8-bit→10-bit + linear-light is the corrective core |
| **P5: FCPXML export** | Round-trip to FCP/DaVinci | User exports and re-opens in FCP | 1-2 weeks | Zero engine surface — build fresh from spec 10; can start early (no GPU/media dependency) |
| **P6: Cloud render** (optional) | Headless Chrome + ffmpeg pipeline | User requests a ProRes master render | 2-3 weeks | Xvfb infra reference (engine Decision 12); pipeline itself fresh |

**Total estimate: 14-21 weeks (3.5-5 months)** for a single developer. With 2-3 developers, can compress to ~2-3 months.

Each phase is detailed below with:
- Goal
- Dependencies (prior phases)
- Deliverables
- Exit criteria (definition of done)
- Test plan

---

## 3. Phase 0: Playback Spike

### 3.1 Goal

A single video file plays in a canvas with frame-accurate seek. No timeline, no tracks, no editing — just playback. This proves the engine architecture works.

### 3.2 Dependencies

- Seed spec read
- FreeCut + OpenCut-classic repos cloned
- Vite + React + TypeScript project scaffolded

### 3.3 Deliverables

1. **Project scaffold:**
   - Vite + React 19 + TypeScript
   - Tailwind CSS 4
   - Zustand for UI state
   - Vitest + Playwright for tests
   - COOP/CEOP headers set in dev server

2. **Type system:**
   - `MediaTime` (branded `number`, 120,000 ticks/sec)
   - `FrameRate` (rational `{numerator, denominator}`)
   - All math helpers (from/to seconds, frames, add/sub/min/max/clamp)

3. **Platform adapters (minimal):**
   - `OPFSStorage` — basic OPFS read/write
   - `WebCodecsDecoder` — mediabunny-based, 10-bit P010 decode in a worker
   - `WebGPURenderer` — basic WebGPU initialization, 10-bit canvas, YUV→linear shader
   - `WebAudioAdapter` — basic AudioContext
   - `AudioClock` — FreeCut's audio-clock trick
   - `StaticClock` — for future cloud render

4. **Engine core (minimal):**
   - `EditorCore` singleton
   - `SceneManager` (single scene, single track)
   - `PlaybackManager` (play/pause/seek/rate)
   - `MediaManager` (import file)
   - `RendererManager` (single layer)

5. **UI (minimal — spec 18 shell scaffold):**
   - Single-page Edit shell: toolbar2 + viewer panel (canvas + transport) + timeline area (one track, ruler, playhead) — the P0 subset of spec 18's panel inventory, `data-testid`s included from day one
   - No inspector/media pool yet (P1)
   - Every control dispatches via `engine.command.apply()` (spec 18 §5 contracts — established here, never retrofitted)

6. **Tests:**
   - MediaTime / FrameRate unit tests
   - Decoder test (decode frame 0, 150, 299 of a test clip)
   - Playback test (play 2 seconds, assert ~60 frames rendered)
   - WYSIWYG test (browser render == render entry, single frame)

### 3.4 Exit Criteria

- User can load an H.264 MP4 file (1080p, 30fps)
- User can play it — playback is smooth (no jitter >5ms)
- User can seek to any frame — frame is displayed within 50ms
- User can play at 0.5x and 2x speed (audio pitch preserved)
- Playback is frame-accurate (frame N displays at exactly N/30s ±half frame)
- No AV drift over a 30-second playback
- 10-bit source (if available) displays correctly with no banding

### 3.5 Test Plan

```ts
// tests/integration/p0-playback.test.ts

test('load and play a video file', async () => {
  await page.goto('http://localhost:5173');
  await page.setInputFiles('#file-input', 'tests/fixtures/videos/10s-test-pattern-1080p.mp4');
  await page.click('#play-button');
  
  // Wait 2 seconds
  await page.waitForTimeout(2000);
  
  // Assert playback is happening
  const currentTime = await page.evaluate(() => window.engine.playback.getCurrentTime());
  expect(mediaTimeToSeconds({ time: currentTime })).toBeGreaterThan(1.5);
  expect(mediaTimeToSeconds({ time: currentTime })).toBeLessThan(2.5);
});

test('seek to specific frame', async () => {
  await page.evaluate(() => {
    window.engine.playback.seek(mediaTimeFromFrame({ frame: 150, rate: FRAME_RATES['30'] }));
  });
  
  // Wait for frame to render
  await page.waitForTimeout(100);
  
  // Screenshot and compare
  const screenshot = await page.screenshot();
  const result = await compareScreenshots(screenshot, 'tests/fixtures/references/frame-150.png');
  expect(result.matchPercent).toBeGreaterThan(99.5);
});

test('varispeed preserves pitch', async () => {
  await page.evaluate(() => {
    window.engine.playback.setRate(0.5);
    window.engine.playback.play();
  });
  
  await page.waitForTimeout(2000);
  
  // Assert: at 0.5x speed, 2 seconds of real time = 1 second of media time
  const currentTime = await page.evaluate(() => window.engine.playback.getCurrentTime());
  expect(mediaTimeToSeconds({ time: currentTime })).toBeCloseTo(1.0, 1);
});
```

---

## 4. Phase 1: Multi-Track

### 4.1 Goal

Multiple clips arranged on a multi-track timeline. Basic composition (overlay tracks composite over main track). No editing yet — just arrangement and preview.

### 4.2 Dependencies

- P0 complete

### 4.3 Deliverables

1. **SceneTracks type system:**
   - `SceneTracks = { overlay: OverlayTrack[]; main: VideoTrack; audio: AudioTrack[] }`
   - `Track`, `TimelineElement` types

2. **Timeline UI (minimal — spec 05 + shell regions from spec 18):**
   - Track headers (with mute/solo/lock buttons — spec 18 §4.7's 160px column)
   - Track bodies (DOM-based, with virtualization)
   - Clip rendering (color rectangles with name labels — no filmstrip yet)
   - Playhead (draggable)
   - Ruler (DOM-based, time markers)
   - Zoom (pixels per second slider)
   - MediaPool + Inspector panels mount (spec 18 §4.2/§4.4 — 4 inspector tabs, model-backed params only)

3. **Composition runtime:**
   - `buildFrameDescriptor(state, frame)` — basic version
   - Layer ordering (main → overlays → audio)
   - Active element resolution
   - Transform application (center + size + rotation + flip — quad-only)

4. **Renderer extensions:**
   - Multi-layer compositing (ping-pong textures)
   - Blend modes (at least normal, but ideally all 17 from OpenCut's blend.wgsl)
   - Opacity per layer

5. **Audio mixing:**
   - Multiple audio sources → master mix
   - Per-clip volume
   - Per-track mute/solo

6. **Workers (additions):**
   - `waveform.worker.ts` — for audio clips (display waveforms)
   - `filmstrip.worker.ts` — for video clips (display thumbnails)
   - `opfs.worker.ts` — for media storage

7. **Tests:**
   - Multi-track render test (3 tracks, 5 clips)
   - Blend mode tests (use solid-color test clips: red, green, blue)
   - Layer ordering test (overlay on top of main)
   - Audio mix test (two tones mixed)

### 4.4 Exit Criteria

- User can import multiple video/audio files
- User can arrange clips on 3 tracks (main + 1 overlay + 1 audio)
- User can preview the composite (overlay on top of main, audio mixed)
- Multi-track blend is mathematically correct (50/50 blend produces expected linear-light result)
- Scrubbing works on all tracks simultaneously
- Audio mix is correct (two tones at same volume → -6dB per channel)

### 4.5 Test Plan

```ts
test('multi-track composition', async () => {
  // Load project with red main, green overlay at 50% opacity
  await loadProject('tests/fixtures/projects/multi-track-blend.json');
  await engine.playback.seek(mediaTimeFromSeconds({ seconds: 0.5 }));
  
  const screenshot = await page.screenshot();
  const centerPixel = await samplePixel(screenshot, 960, 540);
  
  // Red linear = (1, 0, 0), green linear = (0, 1, 0)
  // 50% blend in linear = (0.5, 0.5, 0)
  // Encoded to sRGB: (187, 187, 0) approximately
  assertPixelColor(centerPixel, { r: 187, g: 187, b: 0 }, tolerance: 3);
});

test('audio mix', async () => {
  // Load project with two 440Hz tones, each at volume 1.0
  await loadProject('tests/fixtures/projects/two-tones-mix.json');
  const audioBuffer = await renderAudio(project);
  
  // Two tones at same volume should produce 2x amplitude (in linear)
  // = +6dB. Or -6dB if they're "mixed" with normalization.
  // Depends on our mix policy — document expected behavior.
  // ...
});
```

---

## 5. Phase 2: NLE Operations

### 5.1 Goal

User can perform a real rough cut: cut/split clips, trim them, ripple delete, move them around, snap to other clips.

### 5.2 Dependencies

- P1 complete

### 5.3 Deliverables

1. **Command system:**
   - `CommandManager` with undo/redo
   - Transaction grouping (for multi-step ops)
   - Coalescing (for continuous drag)

2. **NLE ops (pure functions):**
   - Split (razor)
   - Trim (start/end, with constraints)
   - Move (single + multi-select, with track change)
   - Ripple (shift subsequent clips)
   - Roll (trim adjacent together)
   - Slip (shift source in/out)
   - Slide (move + shift neighbors)
   - Delete (with optional ripple)
   - Insert (from media library)
   - Duplicate
   - Rate Stretch
   - Retime (with pitch preservation)
   - Range Removal (across tracks)

3. **Snap system:**
   - Snap point computation (other clips' edges, playhead, markers, frame boundaries)
   - Snap guides (visual feedback)

4. **Timeline UI extensions:**
   - Tool modes (select, razor, hand, zoom)
   - Trim handles (left/right on each clip)
   - Drag-to-move (with snap)
   - Multi-select (click + shift, marquee)
   - Drag-drop from media library
   - Keyboard shortcuts (space, J/K/L, I/O, A/S, R, B, V, H, Z, etc.)
   - Markers
   - In/out points

5. **Sync-lock:**
   - Track-level sync-lock toggle
   - When sync-locked tracks ripple together

6. **Tests:**
   - Unit test per op (with property-based testing)
   - Invariant tests (no overlaps, no negative durations, source bounds respected, locked tracks untouched)
   - Undo/redo tests
   - Multi-select tests

### 5.4 Exit Criteria

- User can split a clip into two at any frame
- User can trim a clip's start/end (with constraints preventing invalid trims)
- User can move clips (single and multi-select)
- User can ripple delete (close the gap)
- User can roll edit (trim adjacent together)
- User can slip (shift source in/out without changing timeline position)
- User can slide (move clip + shift neighbors)
- User can change clip speed (with audio pitch preservation)
- All ops have undo/redo
- Snap works (clips snap to other clips' edges, playhead, markers, frame boundaries)
- Multi-select works (marquee, shift-click)
- Keyboard shortcuts work
- No overlaps after any op (invariant holds)
- No negative durations (invariant holds)

### 5.5 Test Plan

Property-based tests for invariants:

```ts
test('split preserves total duration', () => {
  fc.assert(fc.property(
    arbitrarySceneState,
    arbitrarySplitParams,
    (state, params) => {
      const originalDuration = computeTotalDuration(state);
      const newState = split(state, params);
      expect(computeTotalDuration(newState)).toBe(originalDuration);
    }
  ), { numRuns: 1000 });
});

// ... similar tests for trim, move, ripple, roll, slip, slide
```

---

## 6. Phase 3: Composition & Transitions

### 6.1 Goal

User can add transitions between clips (crossfade, wipe, slide, iris), apply basic effects (blur), and the composition is correct.

### 6.2 Dependencies

- P2 complete

### 6.3 Deliverables

1. **Transition system:**
   - Crossfade (most common)
   - Wipe (left, right, up, down, with feather)
   - Slide (left, right, up, down)
   - Iris (open, close)
   - Glitch (optional, fun)

2. **Effect system (basic):**
   - Gaussian blur (separable, 61-tap)
   - Sharpen
   - (Color grading effects come in P4)

3. **Mask system:**
   - Shape masks (rectangle, ellipse, polygon)
   - JFA feathering (port OpenCut-classic's shaders, possibly as compute shaders)
   - Invert mask

4. **Composition extensions:**
   - Transition resolution (apply transition state to adjacent layers)
   - Effect pass resolution (build EffectPass[] from Effect[])
   - Mask descriptor building
   - Multiple masks per layer

5. **UI:**
   - Transition browser (select transition type)
   - Transition duration adjustment
   - Effect panel (basic effects)
   - Mask editor (shape picker, feather slider, invert toggle)

6. **Tests:**
   - Transition state test (crossfade at 0%, 50%, 100%)
   - Effect application test (blur with sigma=X produces expected output)
   - Mask test (rectangle mask covers expected region)
   - JFA feathering test (mask feather edge has correct SDF)

### 6.4 Exit Criteria

- User can add a crossfade between two clips (with adjustable duration)
- User can add a wipe/slide/iris transition
- Transitions render correctly (frame at 0% transition shows clip A, at 50% shows blend, at 100% shows clip B)
- User can apply blur to a clip
- User can add a rectangular/elliptical/polygon mask to a clip
- Mask feathering works (edge has smooth transition)
- Composition with 10+ layers + transitions + masks renders at ≥30fps at 1080p

### 6.5 Test Plan

```ts
test('crossfade transition', async () => {
  await loadProject('tests/fixtures/projects/crossfade.json');
  
  // At t=0 (start of transition), should show clip A
  await engine.playback.seek(mediaTimeFromSeconds({ seconds: 5.0 }));
  let pixel = await samplePixel(screenshot, 960, 540);
  assertPixelColor(pixel, { r: 255, g: 0, b: 0 });  // red
  
  // At t=0.5 (mid-transition), should show 50/50 blend
  await engine.playback.seek(mediaTimeFromSeconds({ seconds: 5.5 }));
  pixel = await samplePixel(screenshot, 960, 540);
  // 50/50 linear blend of red and green = (0.5, 0.5, 0)
  // Encoded: (187, 187, 0)
  assertPixelColor(pixel, { r: 187, g: 187, b: 0 });
  
  // At t=1.0 (end of transition), should show clip B
  await engine.playback.seek(mediaTimeFromSeconds({ seconds: 6.0 }));
  pixel = await samplePixel(screenshot, 960, 540);
  assertPixelColor(pixel, { r: 0, g: 255, b: 0 });  // green
});
```

---

## 7. Phase 4: Color Grading

### 7.1 Goal

User can color grade with Resolve-style wheels, curves, LUTs, qualifier, power windows. 10-bit precision throughout. Scopes work.

### 7.2 Dependencies

- P3 complete

### 7.3 Deliverables

1. **Color grading effects (ported to scene-linear):**
   - Color Wheels (4-wheel + lift/gamma/gain/offset + temp/tint/exposure/contrast/saturation/hue)
   - Curves (master + RGB, with cubic spline interpolation, 1024×1 16-bit LUT)
   - Levels (input/output black/white/gamma)
   - LUT (.cube parser, 3D LUT, 16-bit texture, linear↔sRGB conversion around lookup)
   - Secondary Qualifier (HSL keyer)
   - Power Window (rectangle, ellipse, polygon — with JFA feather)
   - Vibrance
   - Temperature, Tint, Hue Shift, Saturation, Exposure, Contrast, Brightness
   - Invert, Grayscale, Sepia
   - Chroma Key

2. **Scopes:**
   - Histogram (R/G/B/luma, 1024 bins for 10-bit)
   - Waveform (luma)
   - Vectorscope (Cb/Cr polar)
   - RGB Parade (3 waveforms side-by-side)

3. **UI:**
   - Color grading panel (Resolve-style layout)
   - Color wheel picker component (draggable pointer)
   - Curve editor (with draggable control points)
   - LUT file picker (.cube)
   - Qualifier panel (hue wheel, sat/lum grid)
   - Power window editor (shape picker, draggable shape)
   - Scope panels (live updating, ~10 fps)

4. **Real-time feedback:**
   - Slider changes update within 1 frame (~33ms)
   - Cache linear-light source texture (only re-run grade pass on slider change)

5. **Tests:**
   - Color wheels test (apply known lift/gamma/gain, verify pixel values)
   - LUT round-trip test (identity LUT preserves input)
   - LUT sRGB conversion test (verify linear → sRGB → LUT → sRGB → linear path)
   - Curve test (swap R and B channels)
   - Qualifier test (red region masked when hue center = 0°)
   - Power window test (only left half graded)
   - Scope accuracy test (histogram of gradient shows correct distribution)
   - 10-bit precision test (no banding after grade)
   - HDR preservation test (highlights above 1.0 preserved)

### 7.4 Exit Criteria

- User can apply color wheels (lift/gamma/gain/offset)
- User can apply curves (per-channel)
- User can load and apply a .cube LUT
- User can use a qualifier to select a color range
- User can use a power window to grade a region
- All grading operates in scene-linear (verified by pixel tests)
- 10-bit source shows no banding after grade
- Scopes update in real-time as user grades
- Scopes are accurate (histogram of known gradient shows correct distribution)

### 7.5 Test Plan

See `08-color-grading.md` §14 for detailed tests.

---

## 8. Phase 5: FCPXML Export

### 8.1 Goal

User can export an FCPXML file that opens cleanly in Final Cut Pro, DaVinci Resolve, and Premiere Pro. Round-trip fidelity is preserved.

### 8.2 Dependencies

- P4 complete

### 8.3 Deliverables

1. **FCPXML exporter:**
   - Schema-versioned (FCPXML 1.10)
   - Resource generation (formats, assets)
   - Sequence generation (spine, lanes)
   - Asset clip generation (with retiming, volume, opacity)
   - Transition generation (crossfade, wipe, slide)
   - Title generation (for text elements)
   - Marker generation
   - Color metadata (colorSpace attribute)

2. **FCPXML validation:**
   - XSD validation (browser-compatible validator)
   - Round-trip test (export → parse → compare)

3. **Media bundling:**
   - Export FCPXML alongside source media (copy media to export dir)
   - Use relative paths in FCPXML

4. **UI:**
   - Export dialog (choose format: FCPXML, optionally ProRes via cloud render)
   - Progress indicator
   - "Open in FCP" button (after export)

5. **Tests:**
   - XSD validation test (10 sample projects, all must pass)
   - Round-trip test (export → parse → compare)
   - Manual open tests in FCP, DaVinci, Premiere

### 8.4 Exit Criteria

- User can export FCPXML from any project
- FCPXML passes XSD validation
- FCPXML opens in FCP without errors
- FCPXML opens in DaVinci Resolve without errors
- FCPXML opens in Premiere Pro without errors
- Clips are in correct order with correct in/out points
- Transitions work in FCP
- Audio levels preserved
- Markers visible
- Multi-track structure preserved (overlay/main/audio)

### 8.5 Test Plan

Manual test matrix:

| Test | FCP | DaVinci | Premiere |
|---|---|---|---|
| Simple cut (3 clips) | ☐ | ☐ | ☐ |
| Multi-track (overlay + main + audio) | ☐ | ☐ | ☐ |
| With transitions (crossfade, wipe, slide) | ☐ | ☐ | ☐ |
| With retiming (2x, 0.5x) | ☐ | ☐ | ☐ |
| With markers | ☐ | ☐ | ☐ |
| With text elements | ☐ | ☐ | ☐ |
| HDR (PQ) media | ☐ | ☐ | ☐ |

---

## 9. Phase 6: Cloud Render (Optional)

### 9.1 Goal

User can request a cloud-rendered ProRes/DNxHR/H.265 master. The output is bit-identical to the browser preview.

### 9.2 Dependencies

- P5 complete

### 9.3 Deliverables

1. **Render engine entry point:**
   - `createRenderEngine()` — same engine, sequential frame-by-frame
   - OfflineAudioContext for audio
   - StaticClock (no real-time)

2. **Headless Chrome render pipeline:**
   - Server endpoint (`POST /api/render`)
   - Spawn headless Chrome with real GPU
   - Pipe project JSON to Chrome
   - Receive raw frames via postMessage
   - Pipe frames to ffmpeg subprocess
   - Upload output to S3

3. **ffmpeg integration:**
   - ProRes 4444 / 422 HQ / 422 encoding
   - DNxHR HQX encoding
   - H.264 / H.265 / VP9 / AV1 encoding
   - Audio muxing

4. **Render queue:**
   - Multiple parallel jobs (one per GPU)
   - Progress reporting (WebSocket or polling)
   - Error handling (GPU device loss, ffmpeg crash, Chrome crash)

5. **UI:**
   - "Export master" button (in addition to FCPXML)
   - Format picker (ProRes 4444, ProRes 422 HQ, H.265, etc.)
   - Render progress UI
   - Download link when complete

6. **Tests:**
   - WYSIWYG test (browser render == cloud render, 0% diff)
   - Single-frame render test
   - Multi-frame render test
   - ffmpeg encoding test
   - Audio render test
   - Audio + video mux test
   - Parallel jobs test
   - 8K render test (if hardware available)

### 9.4 Exit Criteria

- User can request a ProRes 422 HQ render of their project
- Render completes within 2x realtime (5-min project renders in <10 min)
- Output is bit-identical to browser preview (WYSIWYG)
- Output plays correctly in VLC, FCP, DaVinci
- Audio is correctly muxed
- 4K and 8K renders work
- Multiple users can render in parallel

### 9.5 Test Plan

See `11-cloud-render.md` §13 for detailed tests.

---

## 10. Post-Phase Work

After P6, the following are candidates for future work:

1. **Native desktop app** (Architecture D from earlier discussion — only if a real need emerges)
2. **Plugin system** (deferred indefinitely)
3. **Multi-user collaboration** (deferred indefinitely)
4. **AI features** beyond transcription:
   - Auto-cut detection
   - Scene analysis
   - Caption generation
   - Style transfer
5. **Mobile support** (limited — only for viewing, not editing)
6. **HDR display** (PQ/HLG canvas output)
7. **Multicam** editing
8. **Subtitles/captions** (FCPXML `<caption>` support)

---

## 11. Risk Mitigation

### 11.1 Technical risks

| Risk | Mitigation |
|---|---|
| WebGPU device loss mid-render | Catch + retry, show "renderer lost" UI |
| mediabunny doesn't support P010 | Fork mediabunny, add P010 support (or use raw WebCodecs) |
| Browser OOM on large projects | Lazy loading, proxy generation, "use smaller project" warning |
| Chrome headless GPU setup is finicky | Document exact Dockerfile, test on RunPod |
| ffmpeg raw frame pipe is slow | Pipeline readbacks (3 frames in flight) |
| FCPXML doesn't carry color grade | Include LUT as effect, document limitation |

### 11.2 Schedule risks

| Risk | Mitigation |
|---|---|
| P0 takes longer than 2 weeks | Cut varispeed from P0, add in P1 |
| P4 (color grading) is complex | Ship without qualifier/power window first, add later |
| P6 (cloud render) requires infra setup | Defer to v2 if needed |

### 11.3 Scope risks

| Risk | Mitigation |
|---|---|
| User wants native desktop | Architecture D — rebuild engine in Rust later (see master spec Decision 7) |
| User wants HDR delivery | Add HDR canvas output in P4 v2 |
| User wants ProRes decode in browser | Cloud render handles this (transcode on import) |

---

## 12. Definition of Done (Per Phase)

Each phase is "done" when:

1. **All deliverables are implemented** and merged to main
2. **All exit criteria are met** (verified by tests)
3. **Test suite passes** (smoke tests for the phase)
4. **Performance is acceptable** (no regressions vs prior phase)
5. **Documentation is updated** (refined spec matches implementation)
6. **Demo to stakeholder** (manual walkthrough of the new features)

---

## 13. Tracking Progress

Use the worklog (`/home/z/my-project/worklog.md`) and a project board to track:

- Phase status (not started / in progress / blocked / done)
- Deliverable status
- Test status
- Risks / blockers
- Decisions made (with reasoning)

---

**End of `14-implementation-phases.md`.** This concludes the spec set.

The full spec set:
- `00-master-spec.md` — executive summary, decisions, architecture
- `01-core-engine.md` through `12-testing-strategy.md` — per-stream specs
- `13-subagent-scout-plan.md` — how to refine these specs with code references (Rounds 1-6 process record)
- `14-implementation-phases.md` (this file) — how to execute
- `15-wire-protocol.md` / `16-keyboard-shortcuts.md` / `17-test-plan.md` — the testability layer
- `18-ui-shell.md` / `19-code-references.md` — the UI shell + code-reference architecture (Round 7)

Scout refinement is complete (Rounds 1-6 audited and signed off; Round 7 added the code-reference layer). Implementation begins with Phase 0 above; the nle-engine and timeline-distill repos are de-risking references per `19-code-references.md`, not blocking dependencies.
