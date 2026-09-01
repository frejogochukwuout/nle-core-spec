# Master Specification — Browser-Based NLE (Rough-Cut Editor with FCPXML Handoff)

**Status:** v1.0 (seed spec — to be refined by per-stream sub-agent scouts)
**Date:** 2026-08-22
**Owner:** Architect (this conversation)
**Consumers:** Implementation team, scout sub-agents, code reviewers

---

## 0. How to Read This Document

This master spec captures **every architectural decision** reached across the design conversation, with the reasoning behind each. It is the **seed** for a deeper spec set that sub-agents will develop against the actual source code of two reference repos:

- **FreeCut** (`github.com/walterlow/freecut`, MIT) — the primary *system-level* teacher (workers, threading, sync, audio-clock, lifecycle, grading toolset)
- **OpenCut-classic** (`github.com/opencut-app/opencut-classic`, archived MIT) — the primary *type-design* teacher (`MediaTime`, `FrameRate`, `SceneTracks`, `EditorCore`, `mediabunny`+WebCodecs decode path)

This is **not** a copy spec. We are rebuilding from scratch in pure TypeScript, using both repos as reference designs. Each downstream stream spec (files `01` through `12`) refines a single concern; the sub-agent scout plan (`13`) defines how those refinements are produced; the testing strategy (`12`) and implementation phases (`14`) define execution.

### Companion files in this directory

| File | Subject |
|---|---|
| `00-master-spec.md` | **This file** — executive summary, decisions, architecture, scope |
| `01-core-engine.md` | Engine architecture, `EditorCore` pattern, contract seams, two entry points |
| `02-workers-threading.md` | Worker pool, `ManagedWorker` abstraction, AudioWorklet, threading discipline |
| `03-playback-engine.md` | Clock, decode, sync plans, scrubbing, varispeed |
| `04-renderer-color.md` | WebGPU layer, 10-bit pipeline, scene-linear color management |
| `05-timeline.md` | Timeline UI, DOM rendering, virtualization, data model |
| `06-nle-ops.md` | Cut / split / trim / ripple / roll / slip / slide / move / lock / snap |
| `07-composition.md` | Composition runtime, layer model, blend modes, scene graph |
| `08-color-grading.md` | Wheels, curves, LUT, qualifier, power window, scopes |
| `09-project-model.md` | Project schema, persistence, migrations, your own storage |
| `10-fcpxml-export.md` | FCPXML format, element mappings, handoff contract |
| `11-cloud-render.md` | Headless Chrome, real GPU, ffmpeg at edges, WYSIWYG contract |
| `12-testing-strategy.md` | Virtual framebuffer, pixel verification, audio waveform checks |
| `13-subagent-scout-plan.md` | Stream breakdown, scout prompts, audit pass, deliverables |
| `14-implementation-phases.md` | Phased rollout: playback → multitrack → ops → grading → export |

---

## 1. Product Vision

### What we are building

A **browser-based non-linear editor (NLE) optimized for rough-cut work**, with a **first-class FCPXML export** for handoff to flagship NLEs (Final Cut Pro, DaVinci Resolve, Premiere Pro). The tool is intentionally **not** a finishing system: no HDR delivery, no ProRes master export from the browser, no broadcast audio routing, no SDI output. Those happen in the downstream NLE.

### Why this scope

The browser cannot meaningfully compete with FCP/DaVinci for finishing work. Browser constraints that cap finishing:
- WASM linear memory ≤4 GB (without `memory64`)
- WebCodecs codec coverage limited to H.264, VP9, AV1, HEVC (varies by platform) — no ProRes, DNxHR, BRAW, R3D, ARRIRAW decode
- No SDI output, no ASIO/CoreAudio professional audio routing
- WebGPU device loss catastrophic mid-export
- Single-tab memory ceiling enforced by the OS

These constraints are **acceptable for rough cut** because:
- Rough cut works at proxy quality (1080p, occasionally 4K), well within memory limits
- Rough cut output is metadata (FCPXML), not pixels — the heavy render happens in the downstream NLE
- Rough cut uses standard codecs (H.264, ProRes proxies) — WebCodecs covers these
- Rough cut editing doesn't require broadcast monitoring — a single canvas is sufficient

### What "done" looks like for v1

1. A user can import a folder of source clips (H.264, H.265, ProRes via mediabunny's WebCodecs path)
2. They can scrub, mark in/out, and arrange clips on a multi-track timeline
3. They can perform standard NLE operations: cut/split/trim/ripple/roll/slip/slide/move
4. They can preview a composited multi-track result with transitions, basic effects, color grading (wheels, curves, LUT, qualifier)
5. They can export an **FCPXML file** that opens cleanly in FCP/DaVinci/Premiere
6. Optionally: they can request a **cloud-rendered preview render** (ProRes 422 HQ MP4) that is **bit-identical** to what they previewed

### What "done" explicitly does NOT include

- ❌ Final master rendering in-browser (use FCPXML + flagship NLE)
- ❌ HDR delivery (PQ/HLG) — though HDR preview may be supported if WebGPU canvas allows
- ❌ ProRes 4444 XQ / DNxHR master encoding in-browser
- ❌ Native desktop app (rebuild deferred — see §6)
- ❌ Plugin system (deferred indefinitely)
- ❌ Multi-user collaboration (deferred indefinitely)
- ❌ AI features beyond transcription (transcription is optional in v1)

---

## 2. Architectural Decisions (Locked)

Each decision below was reached through the design conversation. The reasoning is preserved so it is not re-litigated.

### Decision 1: FreeCut as primary system-level teacher

**Decision:** Use FreeCut as the reference design for the engine architecture (workers, threading, sync, lifecycle, grading toolset). Rebuild from scratch — do not fork.

**Reasoning:**
- FreeCut has 21 Web Worker entry points + 1 AudioWorklet processor; OpenCut-classic has 1 worker (transcription only) + 0 AudioWorklets. **We adopt 10 of FreeCut's 21 workers** (not all 21 — see spec 02 `02-workers-threading.md` for the pruned inventory: decode, waveform, filmstrip, export, opfs, thumbnail, fingerprint, audio-meter, transcription, analysis). OpenCut-classic's transcription-only worker is replaced by FreeCut's more complete pattern.
- Threading is the unbounded hard problem; decode is bounded (one worker, mediabunny)
- FreeCut has solved real production concerns: `ManagedWorkerPool` with lazy creation + idle reuse, main-thread fallback for export, AudioWorklet for varispeed preview
- OpenCut-classic's export pipeline is a synchronous `for` loop on the main thread — UI freezes for the entire export. We cannot inherit this.

**Counter-evidence we are overriding:**
- FreeCut uses HTML5 `<video>` + `requestVideoFrameCallback` for preview decode (NOT WebCodecs). We override this to use mediabunny + WebCodecs (OpenCut-classic's approach) because:
  - WebCodecs is frame-accurate; `<video>` is not
  - WebCodecs gives codec extensibility (ProRes, etc. via custom decoders)
  - WebCodecs can run in a worker (`<video>` cannot)
- FreeCut's project model is hardwired to the File System Access API + IndexedDB handle registry. We override this with our own storage layer.

### Decision 2: OpenCut-classic as primary type-design teacher

**Decision:** Adopt OpenCut-classic's type designs as concepts in our rebuild.

**Specific adoptions:**
- `MediaTime` as integer ticks (120,000 ticks/sec — divides evenly by all standard frame rates including drop-frame)
- Rational `FrameRate` type (`{numerator, denominator}` — e.g., 23.976 = `24000/1001`, exact)
- `SceneTracks` type-enforced track ordering (`{overlay: OverlayTrack[]; main: VideoTrack; audio: AudioTrack[]}` — single `main` is a singleton, not an array)
- `EditorCore` singleton pattern with typed Manager methods (automation-ready by accident — see Ken Imoto's MCP integration post)
- Diff-based ripple editing (`src/lib/ripple/{shift,apply,diff}.ts` pattern)
- DOM-based timeline rendering (canvas only for filmstrip/waveform)

**Why these matter:** These are correctness and maintainability wins, not perf wins. Integer `MediaTime` eliminates float drift; rational `FrameRate` makes 29.97 exact; `SceneTracks` makes wrong states unrepresentable at compile time.

### Decision 3: Pure TypeScript — no Rust, no WASM toolchain

**Decision:** Write the entire engine in TypeScript. No Rust, no `wasm-pack`, no `wasm-bindgen` boundary, no `opencut-wasm` package.

**Reasoning:**
- WASM tax is too big for fast iteration: Rust toolchain, build pipeline, harder debugging, harder contribution
- `opencut-wasm` audit showed it provides **zero measurable perf benefit** for the rendering hot path — shader execution is identical, JS→GPU dispatch overhead is identical, GC determinism gain is modest
- WebGL2 fallback (the main argument for `opencut-wasm`) is irrelevant — we are WebGPU-only
- `opencut-wasm`'s hardcoded effect set ("gaussian-blur" only) is a non-starter for color grading
- For the places WASM would genuinely help (heavy CPU loops, audio DSP), Workers + AudioWorklet cover the off-main-thread need
- TypeScript is portable to Rust later if needed (see Decision 7)

**What we lose:** WebGL2 fallback (we are WebGPU-only anyway), GC determinism for the orchestration hot path (acceptable — see Decision 4).

### Decision 4: WebGPU-only, no WebGL2 fallback

**Decision:** Target WebGPU exclusively. Drop support for browsers without WebGPU (Firefox, Safari without WebGPU, Chrome <113).

**Reasoning:**
- WebGPU is the only browser API with first-class color management (`CanvasConfiguration.colorSpace`, 10-bit formats like `rgba10a2unorm`, 16-bit float framebuffers)
- WebGL2 has 8-bit default with extensions for 16-bit float — but no color management
- Canvas 2D is 8-bit sRGB-only — destroys color grading accuracy
- WebGPU's `rgba10a2unorm` and `rgba16float` formats are essential for 10-bit color grading
- Browser matrix: Chromium 113+ only (Chrome, Edge, Brave, Opera, Arc, etc.)

**Implication:** We ship a "use Chrome" banner. This is the same approach OpenCut-classic and FreeCut take.

### Decision 5: 10-bit color end-to-end, scene-linear working space

**Decision:** Pipeline must support 10-bit color (P010 decode → 10-bit GPU textures → 10-bit canvas) and operate in **scene-linear light** for all grading math.

**Reasoning:**
- 8-bit sRGB is what both reference repos do — but it's wrong for color grading
- FreeCut's Color Wheels shader (`gpu-effects/effects/color.ts:611`) applies `c *= pow(2.0, exposure)` directly on sRGB-encoded values — mathematically incorrect
- 10-bit eliminates banding in gradients after grading
- Scene-linear is the only correct working space for compositing (Porter-Duff blends, exposure multiplication, contrast pivots)
- WebGPU `rgba10a2unorm` + `display-p3` canvas color space makes this tractable

**What this requires** (see `04-renderer-color.md` for detail):
- mediabunny WebCodecs decoder (10-bit formats like `I420P10` are emitted by the browser's `VideoDecoder` based on source codec; we configure the decoder with `hardwareAcceleration: 'prefer-hardware'` and accept whatever 10-bit format the browser produces — mediabunny does NOT expose a `pixelFormat: 'P010'` option; the `VideoSinkDecoderOptions` only has `hardwareAcceleration` + `optimizeForLatency`)
- `r16uint` / `rg16uint` GPU textures for the YUV planes
- YUV→RGB shader with proper BT.709/BT.2020 matrix + transfer function inversion
- All grading math in linear-light (port FreeCut's shaders — same math, correct color space)
- `rgba16float` working textures for compositing
- Display transfer function on output (sRGB EOTF for SDR)
- Canvas configured with `format: 'rgba10a2unorm'` + `colorSpace: 'display-p3'`

### Decision 6: One engine, two entry points (browser + cloud render)

**Decision:** Build the engine as a single TypeScript bundle with two entry points:
- `createInteractiveEngine()` — for browser use (rAF-driven, real-time, canvas output, AudioContext + AudioWorklet)
- `createRenderEngine()` — for cloud/headless use (sequential frame-by-frame, OffscreenCanvas output, OfflineAudioContext)

Both share: project model, NLE ops, GPU shaders, color pipeline, composition runtime.

**Reasoning:**
- Avoids the two-renderer problem (browser preview ≠ cloud output)
- WYSIWYG is bit-identical by construction — same code, same shaders, same color pipeline
- The FreeCut `headless/main.ts` pattern proves this works — they drive the full editor headlessly via Playwright for testing

**Cloud render details** (see `11-cloud-render.md`):
- Headless Chrome on a real GPU box (RunPod A100 / RTX 4090 / Mac M2 Ultra)
- Headless Chrome + WebGPU = real GPU adapter (not software)
- ffmpeg at edges only: transcode on input (ProRes → mezzanine), encode on output (raw frames → ProRes/DNxHR/H.265)
- ffmpeg is **never** used for compositing, color, or transitions — only transcoding
- GPU readback is the bottleneck (not GPU rendering): plan for ~80 fps at 4K, ~20 fps at 8K
- 4 GB ceiling is fine for cloud render because we strip UI, audio worklet, scrubbing cache

### Decision 7: No native desktop, no Rust core, no cross-platform abstraction

**Decision:** Build browser-pure. If we ever need native, rebuild the engine in Rust at that point — not now.

**Reasoning:**
- The 4 GB ceiling is fine for rough cut (1-2 GB working set at 4K with proxies)
- FCPXML export makes the flagship NLE do the heavy pixel work — we don't need to render
- Cloud render covers the "I need a master file" case (ProRes via headless Chrome + ffmpeg)
- Writing Rust now to be "portable later" is premature optimization
- Browser engines keep improving — the gap is shrinking
- We don't yet know whether we'll actually need native

**Architectural discipline that preserves the native option** (without paying for it now):
1. Separate engine from UI — engine is a pure TS module that takes project state + commands, returns state + frame descriptors
2. Use `MediaTime` (i64 ticks) and rational `FrameRate` everywhere — these port trivially to Rust
3. Keep the GPU layer WGSL-only (no Rust+wgpu) — WGSL compiles under wgpu too
4. Define project model as JSON schema (not TS classes) — portable to `serde`
5. Wrap browser-only APIs (`OPFS`, `WebCodecs`, `WebGPU`) in interfaces (`Storage`, `Decoder`, `Renderer`) so a native implementation can drop in later

### Decision 8: Cloud render via headless Chrome + ffmpeg, not native rewrite

**Decision:** When cloud render is needed (phase 2), run the **exact same engine** in headless Chrome with a real GPU. Use ffmpeg only for input transcoding and output encoding.

**Reasoning:**
- Avoids maintaining two renderers
- Bit-identical WYSIWYG (same code, same shaders, same color pipeline)
- Headless Chrome on a GPU box uses the real GPU adapter — not software emulation
- Memory ceiling in headless mode is much lower than interactive (no UI, no audio worklet, no scrubbing cache) — 8K export fits
- ffmpeg fills the only real gap: codec coverage (ProRes/DNxHR encode, RAW decode)

**Why not native rewrite for cloud:**
- Two renderers means WYSIWYG drift
- Color management, blend modes, transitions — every visual detail must be reproduced identically
- Tiny precision differences accumulate into visible drift
- One engine in two contexts is dramatically simpler than two engines in sync forever

### Decision 9: Data-Driven Engine Architecture

**Decision:** The engine is a pure JSON-in, JSON-out state machine. Three layers are all JSON-serializable:
1. **Static project state** (`ProjectJSON`) — the saved project file (clips, tracks, elements, effects, etc.)
2. **Runtime operations** (`EngineCommand[]`) — a sequence of ops applied to engine state, each a JSON-serializable object like `{ type: 'timeline.split', params: { time, trackIds } }`
3. **Render output** (`FrameDescriptor` + pixels + audio PCM) — what the renderer produces

Three consumers use **identical JSON interfaces** against the same engine:
- **Browser UI** — translates user interactions (clicks, drags, keyboard) into `EngineCommand` objects, sends to engine, renders result
- **Cloud render** — accepts `ProjectJSON` + `EngineCommand[]` over HTTP, applies them, renders frames, pipes to ffmpeg
- **Test harness** — constructs `EngineCommand` objects directly (no UI), applies them, verifies state + pixels + audio

```
┌──────────────────────────────────────────────────────────┐
│ Engine (pure TS, no UI)                                  │
│                                                          │
│  Inputs (all JSON):                                      │
│   - Static:  ProjectJSON (the project file)              │
│   - Runtime: EngineCommand[] (sequence of operations)   │
│                                                          │
│  Outputs (all JSON or binary):                          │
│   - State:   SceneState (current timeline state)        │
│   - Rendered: FrameDescriptor + pixels + audio PCM       │
│                                                          │
│  Three identical consumers:                             │
│   - Browser UI (translates clicks/drags → EngineCommand)│
│   - Cloud render (takes JSON over wire, renders frames) │
│   - Test harness (constructs EngineCommand directly)    │
└──────────────────────────────────────────────────────────┘
```

**Why this matters:**
1. **Testability without UI tax** — browser automation (Playwright clicks/drags) is slow and flaky. Constructing `EngineCommand` directly is fast and deterministic.
2. **WYSIWYG for state, not just pixels** — for any command sequence, browser UI path and direct API path produce identical `SceneState`. This is itself a testable invariant.
3. **Unifies browser + cloud** — cloud render is just "hosted engine that takes JSON over wire". No separate API surface to design, version, or keep in sync.
4. **Future automation** — AI agents, scripting, MCP servers all speak the same `EngineCommand` protocol. No special adapter needed.

**Implication for UI design:** The UI is a thin layer that translates user interactions into `EngineCommand` objects. It holds NO engine state of its own — all state lives in the engine. The UI is essentially an `EngineCommand` generator + view renderer. This pattern also makes the UI trivially replaceable (a different UI shell, a CLI, an MCP host) without touching the engine.

**Implication for testing:** Tests bypass the UI entirely for state verification. They construct `EngineCommand` sequences, apply them via `engine.command.apply(command: EngineCommand): CommandResult`, and assert on the resulting `SceneState`. Pixel/audio verification uses the renderer's `renderFrame(n)` API directly. UI tests (Playwright) are reserved for testing the UI translation layer itself (does a click produce the right `EngineCommand`?) — see §13.

**Relationship to existing decisions:**
- Builds on Decision 6 (one engine, two entry points) — adds a third consumer (test harness) that uses the same JSON protocol
- Extends Decision 7's discipline item #1 ("Separate engine from UI") with a concrete wire protocol
- Extends Decision 8 (cloud render via headless Chrome) — cloud render accepts `ProjectJSON` + `EngineCommand[]` over HTTP rather than driving the engine through Playwright clicks

**New specs that elaborate this decision:**
- `15-wire-protocol.md` — full JSON schema for `ProjectJSON` + `EngineCommand[]` + `CommandResult`
- `16-keyboard-shortcuts.md` — every keyboard shortcut maps to a deterministic `EngineCommand`
- `17-test-plan.md` — three-tier test methodology built on this principle

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Browser NLE (interactive editing)                           │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Timeline │  │ Preview  ││  │ Library  │  │ Effects  │  │
│  │   UI     │  │   UI     ││  │   UI     │  │   UI     │  │
│  │ (React)  │  │ (React)  ││  │ (React)  │  │ (React)  │  │
│  └────┬─────┘  └────┬─────┘┘  └────┬─────┘  └────┬─────┘  │
│       │              │              │              │         │
│  ┌────▼──────────────▼──────────────▼──────────────▼─────┐ │
│  │              EditorCore (typed managers)              │ │
│  │  ├─ TimelineManager    ├─ PlaybackManager             │ │
│  │  ├─ CommandManager     ├─ MediaManager                │ │
│  │  ├─ RendererManager    ├─ SceneManager                │ │
│  │  └─ ProjectManager (your own storage impl)            │ │
│  └────┬──────────────────────────────────────────────┬───┘ │
│       │                                              │     │
│  ┌────▼───────────┐                       ┌─────────▼───┐ │
│  │  Engine Core    │                       │  Storage    │ │
│  │  (pure TS)      │                       │  (your own) │ │
│  │                  │                       └─────────────┘ │
│  │  • Project model │                                       │
│  │  • NLE ops       │                                       │
│  │  • Composition   │                                       │
│  │  • Color pipeline│                                       │
│  └────┬─────────────┘                                       │
│       │                                                     │
│  ┌────▼──────────────────────────────────────────────┐     │
│  │       Playback & Render Subsystem                 │     │
│  │                                                    │     │
│  │  ┌──────────────────┐  ┌──────────────────────┐   │     │
│  │  │  Workers (TS)    │  │  AudioWorklet        │   │     │
│  │  │  ├─ decode        │  │  (SoundTouch         │   │     │
│  │  │  ├─ waveform      │  │   varispeed)         │   │     │
│  │  │  ├─ filmstrip     │  └──────────────────────┘   │     │
│  │  │  ├─ export        │                              │     │
│  │  │  ├─ opfs          │  ┌──────────────────────┐   │     │
│  │  │  └─ ...           │  │  WebGPU Renderer     │   │     │
│  │  └──────────────────┘  │  (10-bit, linear)    │   │     │
│  │                        └──────────────────────┘   │     │
│  └────────────────────────────────────────────────────┘     │
│                                                             │
│  Output: FCPXML (KB) + optional 1080p preview render        │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ (user clicks "Export master")
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Cloud Render Server (phase 2, optional)                    │
│                                                             │
│  Headless Chrome (real GPU — RunPod A100 / 4090)            │
│    ├─ Same engine bundle (render entry point)               │
│    ├─ Same WGSL shaders                                     │
│    ├─ Same color pipeline (10-bit scene-linear)             │
│    ├─ OfflineAudioContext for audio mix                     │
│    └─ Frame-by-frame: render → pipe raw pixels to ffmpeg    │
│                                                             │
│  ffmpeg                                                      │
│    ├─ Transcodes raw frames → ProRes 4444 / DNxHR / H.265   │
│    ├─ Encodes raw PCM → AAC / PCM / etc.                    │
│    └─ Muxes audio + video → final container                 │
│                                                             │
│  Output: ProRes master (GB) uploaded to S3                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Technology Stack (Locked)

| Concern | Choice | Notes |
|---|---|---|
| Language | **TypeScript 5.x** | Strict mode, no `any` |
| Framework | **React 19** (UI shell only) | Engine is framework-agnostic |
| Bundler | **Vite** | `worker: { format: 'es' }` for worker support |
| State (UI) | **Zustand** | UI prefs only — engine state lives in `EditorCore` managers |
| State (engine) | **Custom managers** | OpenCut-classic pattern — typed methods, no direct store exposure |
| Undo/redo | **Zundo** (Zustand middleware) for UI; custom `CommandManager` for engine | See `01-core-engine.md` |
| Router | **TanStack Router** | Type-safe, file-based |
| Styling | **Tailwind CSS 4** | |
| UI components | **Radix UI + shadcn-style** | Same as both reference repos |
| Validation | **Zod** | For project schema, FCPXML schema |
| Engine wire protocol | **JSON (Zod-validated)** | `ProjectJSON` for static project state, `EngineCommand[]` for runtime ops, `CommandResult` for outputs — see `15-wire-protocol.md`. Drives the browser UI, cloud render, and test harness from one identical protocol (Decision 9). |
| Video decode | **mediabunny** (WebCodecs wrapper) — **MPL-2.0** license | 10-bit decode via the browser's `VideoDecoder` (formats like `I420P10`/`I422P10`/`I444P10` are emitted based on source codec; we configure the decoder with `hardwareAcceleration: 'prefer-hardware'` — mediabunny does NOT expose a `pixelFormat: 'P010'` option). **License note:** MPL-2.0 is weak file-level copyleft. Using mediabunny as-is (via npm) does **not** impose copyleft on our code; modifications to mediabunny source files must be redistributed under MPL-2.0 (file-level, not project-level — softer than GPL). See `03-playback-engine.refined.md` §13.C for full implications. |
| GPU | **WebGPU** (no WebGL2 fallback) | Chromium 113+ basic; Chromium 118+ for 10-bit canvas (`rgba10a2unorm`) — see §5 |
| Shaders | **WGSL** | Compiled by browser, no Rust |
| Audio DSP | **SoundTouch** (via AudioWorklet) | For varispeed preview |
| Audio mixing | **Web Audio API** (`AudioContext` + `OfflineAudioContext`) | |
| Persistence | **OPFS** (Origin Private File System) + your own schema | No FS-Access API, no IndexedDB handle registry |
| Cloud render | **Headless Chrome + ffmpeg** | See `11-cloud-render.md` |
| Test runner | **Vitest** + **Playwright** | See `12-testing-strategy.md` |
| Cross-origin isolation | **COOP/CEOP headers set** | Enables `SharedArrayBuffer` if needed later |

---

## 5. Browser Matrix

| Browser | Supported? | Reason |
|---|---|---|
| Chrome 113-117 (Chromium) | ⚠️ Degraded | WebGPU + WebCodecs + OPFS + AudioWorklet work, but **`rgba10a2unorm` canvas is unavailable** (added in Chromium 118, stable ~120+). Falls back to `rgba8unorm` canvas (8-bit output) — `DegradedRendererBanner` shown. 10-bit internal grading still works; only the final display is 8-bit. |
| Chrome 118+ (Chromium) | ✅ Yes | WebGPU + WebCodecs + OPFS + AudioWorklet + `rgba10a2unorm` canvas (full 10-bit end-to-end) |
| Edge 113+ | ⚠️/✅ Same | Same Chromium versioning as above |
| Brave / Opera / Arc | ⚠️/✅ Same | Same Chromium versioning as above |
| Firefox | ❌ No | No WebGPU in stable (as of 2026) |
| Safari (desktop) | ⚠️ Experimental | WebGPU shipped but limited 10-bit canvas support — best-effort only |
| Safari (iOS) | ❌ No | Memory ceiling too low (~300 MB) |
| Chrome (Android) | ⚠️ Best-effort | Works for small projects; no transcription |

**Version cutoffs:**
- **Chromium 113+** — basic WebGPU + WebCodecs + OPFS + AudioWorklet (degraded renderer).
- **Chromium 118+** — `rgba10a2unorm` canvas format (10-bit output). Stable in ~120+.

Ship a `DegradedRendererBanner` (borrow OpenCut-classic's pattern) for users on Chromium 113-117 ("Your Chrome doesn't yet support 10-bit canvas output — falling back to 8-bit display. Update to Chrome 120+ for full 10-bit."). For users on Chromium <113 or non-Chromium, ship the "use Chrome desktop" banner.

---

## 6. Constraint Acknowledgments

These are **accepted** constraints. We do not try to solve them:

1. **4 GB per-renderer-process ceiling** — fine for rough cut at 4K; cloud render covers 8K export
2. **No ProRes/DNxHR decode in-browser** — handled by cloud render's ffmpeg transcoding on import
3. **No ProRes/DNxHR encode in-browser** — handled by cloud render's ffmpeg encoding on export
4. **No SDI output** — out of scope; flagship NLE handles broadcast monitoring
5. **No ASIO/CoreAudio** — out of scope; flagship NLE handles professional audio routing
6. **No multi-user collaboration** — deferred indefinitely
7. **No native desktop app** — deferred; if needed later, rebuild engine in Rust (Decision 7)
8. **GPU device loss** — handled via try/catch + "renderer lost, please reload" UI (same as both reference repos)

---

## 7. The WYSIWYG Contract

This is the most important architectural invariant in the system:

> **For any given frame N, the pixels produced by `createInteractiveEngine().renderFrame(N)` MUST be bit-identical to the pixels produced by `createRenderEngine().renderFrame(N)` for the same project state.**

Implications:
- Same shaders, same uniforms, same texture formats, same color pipeline
- No "preview-quality" vs "render-quality" split — they are the same code path
- The only allowed difference: render engine may produce higher resolution / bit depth (it has more memory)
- Even there, the algorithm must be the same — just operating at higher precision

**Test:** A pixel-diff test (see `12-testing-strategy.md`) compares browser output to cloud output for a battery of test projects. Any diff > 0 pixels triggers a build failure.

This is why we do not use ffmpeg for compositing/color/transitions — it would break WYSIWYG.

### 7.1 State WYSIWYG (extends Decision 9)

The WYSIWYG contract extends beyond pixels to **engine state**: for any sequence of `EngineCommand[]` applied to a starting `ProjectJSON`, the resulting `SceneState` produced by the **browser UI path** (commands synthesized from user interactions) MUST be bit-identical to the resulting `SceneState` produced by the **direct API path** (commands constructed by tests or cloud callers).

In other words: there is one and only one way for a command to mutate engine state — `engine.command.apply(command)`. The UI is forbidden from touching engine internals directly; it must emit `EngineCommand` objects.

**Test:** For every keyboard shortcut and every click/drag flow that produces an `EngineCommand`, a test verifies that the UI-emitted command matches the expected JSON shape (structural equality), and that applying it produces the same `SceneState` as applying the directly-constructed command. Drift here is a build failure.

### 7.2 Audio WYSIWYG

For any project, the audio PCM produced by `AudioContext` (browser real-time path) MUST be bit-identical to the PCM produced by `OfflineAudioContext` (cloud render path) for the same frame range. Same DSP graph, same processing order, same sample rate.

---

## 8. Stream Map (Pointer to Companion Specs)

Each stream has its own spec file. The breakdown is designed so sub-agents can work in parallel with minimal coupling:

| # | Stream | Spec file | Primary teacher | Key decisions |
|---|---|---|---|---|
| 1 | Core engine | `01-core-engine.md` | OpenCut-classic `EditorCore` + FreeCut `deps/` contracts | Decision 1, 2, 6 |
| 2 | Workers & threading | `02-workers-threading.md` | FreeCut `ManagedWorker*` + worker files | Decision 1 |
| 3 | Playback engine | `03-playback-engine.md` | FreeCut `Clock.ts` + OpenCut-classic `PlaybackManager` | Decision 1, 2 |
| 4 | Renderer & color | `04-renderer-color.md` | FreeCut `gpu-*` infrastructure (ported to 10-bit linear) | Decision 4, 5 |
| 5 | Timeline | `05-timeline.md` | OpenCut-classic DOM approach + FreeCut NLE op UI | Decision 2 |
| 6 | NLE ops | `06-nle-ops.md` | FreeCut `stores/actions/edit/*` + OpenCut-classic `lib/ripple/` | Decision 1, 2 |
| 7 | Composition | `07-composition.md` | FreeCut `composition-runtime/` + OpenCut-classic `compositor/` | Decision 1, 2 |
| 8 | Color grading | `08-color-grading.md` | FreeCut `gpu-effects/effects/color.ts` (ported to linear) | Decision 5 |
| 9 | Project model | `09-project-model.md` | OpenCut-classic types + your own schema | Decision 2 |
| 10 | FCPXML export | `10-fcpxml-export.md` | FCPXML 1.10 spec + project model mapping | Decision 6 |
| 11 | Cloud render | `11-cloud-render.md` | FreeCut `headless/main.ts` + ffmpeg pattern | Decision 6, 8 |
| 12 | Testing | `12-testing-strategy.md` | Playwright + virtual framebuffer | All decisions |
| 13 | Wire protocol | `15-wire-protocol.md` | OpenCut-classic `EditorCore` method shapes + Zod schemas | Decision 9 |
| 14 | Keyboard shortcuts | `16-keyboard-shortcuts.md` | FreeCut + OpenCut-classic shortcut maps; every shortcut → `EngineCommand` | Decision 9 |
| 15 | Test plan | `17-test-plan.md` | Three-tier testing methodology (Tier 1 engine / Tier 2 render / Tier 3 UI) | Decision 9 |

---

## 9. Testability Strategy (Summary — see `12-testing-strategy.md` and §13)

Every stream must be testable programmatically. The strategy:

1. **Virtual framebuffer**: headless Chrome with software WebGL/WebGPU fallback for CI; real GPU only for local validation
2. **Pixel verification**: render test scenes to known frame numbers, screenshot via Playwright, compare to reference PNG with a pixel-diff threshold (typically 99.5% match)
3. **Audio waveform verification**: render via `OfflineAudioContext`, extract PCM samples, compare to reference waveform (FFT comparison or sample-by-sample with tolerance)
4. **Multi-track blend tests**: use source clips with **distinct solid colors per track** (e.g., track 1 = pure red, track 2 = pure green, track 3 = pure blue) so blend modes and opacity can be verified by sampling specific pixels
5. **WYSIWYG test**: render the same project in browser mode and cloud mode, pixel-diff the outputs — must be 100% identical
6. **Property-based tests**: for NLE ops, generate random timeline states, apply ops, verify invariants (e.g., no overlaps after ripple, total duration preserved after slip)

See `12-testing-strategy.md` for the full strategy including test asset design, CI integration, and the test matrix. **For the refined three-tier methodology (pure engine tests, render tests, UI tests) built on the data-driven engine principle (Decision 9), see §13 and `17-test-plan.md`.**

---

## 10. Implementation Phases (Summary — see `14-implementation-phases.md`)

| Phase | Goal | Exit Criteria |
|---|---|---|
| **P0: Playback spike** | Single clip, play/pause/seek, frame-accurate | User can load a video file and play it with no jank |
| **P1: Multi-track** | Multiple clips on a timeline, basic composition | User can arrange 5 clips on 3 tracks and preview |
| **P2: NLE ops** | Cut/split/trim/ripple/move/snap | User can perform a real rough cut |
| **P3: Composition & transitions** | Crossfades, blends, basic effects | User can add transitions between clips |
| **P4: Color grading** | Wheels, curves, LUT, qualifier, scopes | User can grade a clip with 10-bit precision |
| **P5: FCPXML export** | Round-trip to FCP/DaVinci | User can export and re-open in FCP |
| **P6: Cloud render** (optional) | Headless Chrome + ffmpeg pipeline | User can request a ProRes master render |

Each phase is independently shippable. P0-P5 are the v1 product. P6 is the v2 expansion.

---

## 11. Open Questions (For Sub-Agent Scouts to Resolve)

These are the questions sub-agent scouts should investigate against the actual source code:

1. **Exact file paths** in FreeCut for each component (workers, clock, sync plans, NLE ops, color effects, scopes, LUT, headless)
2. **Exact file paths** in OpenCut-classic for `EditorCore`, managers, `MediaTime` impl, `FrameRate` impl, `SceneTracks`, ripple diff system, DOM timeline components, FCPXML (if any)
3. **mediabunny API surface** — `VideoSinkDecoderOptions` exposes only `hardwareAcceleration` (`'no-preference' | 'prefer-hardware' | 'prefer-software'`) and `optimizeForLatency` (`boolean`) — there is NO `pixelFormat: 'P010'` option (verified by SCOUT-03 + SCOUT-04). 10-bit decode produces formats like `I420P10` / `I420P12` / `I422P10` / `I422P12` / `I444P10` / `I444P12` based on the source codec. How to get the raw `VideoFrame` (not `CanvasSink`), what the `VideoSampleSink` API looks like.
4. **FreeCut's `ManagedWorker` abstraction** — full implementation, lifecycle hooks, error handling, termination logic
5. **FreeCut's `Clock.ts` audio-clock trick** — exact mechanism, edge cases, drift correction
6. **FreeCut's RVFC sync plans** — the five distinct plans (paused, initial, drift, premount, reverse) and when each fires
7. **FreeCut's export-render worker** — full pipeline, main-thread fallback path, transferable handling
8. **FreeCut's GPU effects pipeline** — `EffectPipeline` class, bind group caching (or lack thereof), ping-pong texture management
9. **OpenCut-classic's `EditorCore` constructor** — manager initialization order, cross-references, singleton enforcement
10. **OpenCut-classic's ripple diff system** — `shift.ts`, `apply.ts`, `diff.ts` — full algorithm
11. **OpenCut-classic's DOM timeline** — component hierarchy, virtualization, scroll/zoom handling
12. **FCPXML 1.10 schema** — elements needed for clips, transitions, color metadata, multi-track
13. **Headless Chrome + WebGPU setup** — flags, GPU passthrough, container image, RunPod config
14. **ffmpeg raw frame piping** — exact CLI args for `rgb24` / `yuv422p10le` pipe input, encoder selection

Sub-agent scouts (see `13-subagent-scout-plan.md`) will resolve these and produce per-stream refined specs with code references.

---

## 12. Glossary

- **NLE** — Non-Linear Editor (Premiere, FCP, DaVinci, etc.)
- **Rough cut** — First assembly of clips; not the final cut
- **FCPXML** — Final Cut Pro XML. Uses **DTD (Document Type Definition)** for validation, **NOT XSD** (XML Schema Definition). The official `FCPXMLv1_10.dtd` is 785 LOC. DTD enforces element/attribute structure + enums for some attributes but treats most values as `CDATA` (untyped strings); Zod schema must layer on type/range/regex checks the DTD cannot express (see spec 10 §11 Correction #6).
- **RVFC** — `requestVideoFrameCallback`, browser API for per-frame video sync
- **OPFS** — Origin Private File System, browser storage for large files
- **AudioWorklet** — Browser API for running audio DSP on the audio render thread
- **`MediaTime`** — Integer tick count (120,000 ticks/sec) representing a moment in media time
- **`FrameRate`** — Rational `{numerator, denominator}` (e.g., 23.976 = `24000/1001`)
- **`SceneTracks`** — Type-enforced track structure: `{overlay: OverlayTrack[]; main: VideoTrack; audio: AudioTrack[]}`
- **WYSIWYG** — What You See Is What You Get; here, browser preview = cloud render output, bit-identical
- **Scene-linear** — Color working space where values represent linear light intensity (not gamma-encoded)
- **P010** — 10-bit YUV 4:2:0 planar pixel format (the conceptual standard for HDR / pro video decode). **Note:** mediabunny does NOT expose a `pixelFormat: 'P010'` option — the `VideoSinkDecoderOptions` only has `hardwareAcceleration` + `optimizeForLatency`. 10-bit decode produces `I420P10` or similar planar formats (`I420P10`/`I420P12`/`I422P10`/`I422P12`/`I444P10`/`I444P12`) based on the source codec. Values are **MSB-aligned in 16-bit cells** — extract the 10-bit value via `u16 >> 6`, **not** `u16 & 0x3FF` (which would read the LSB-aligned low 10 bits and give wrong values).
- **Porter-Duff** — Alpha compositing operators (source-over, source-in, etc.)
- **JFA** — Jump Flooding Algorithm; used for distance field / mask feathering
- **EOTF** — Electro-Optical Transfer Function (e.g., sRGB EOTF, PQ EOTF for HDR)
- **OETF** — Opto-Electronic Transfer Function (inverse of EOTF)
- **`ProjectJSON`** — The static, on-disk representation of a project (clips, tracks, elements, effects, scenes, settings). Loaded via `engine.project.loadFromJSON(project)`. Zod-validated. See `15-wire-protocol.md`.
- **`EngineCommand`** — A JSON-serializable operation applied to engine state at runtime: `{ type: string; params: Record<string, unknown> }` (e.g., `{ type: 'timeline.split', params: { time, trackIds } }`). Sequenced as `EngineCommand[]`. Applied via `engine.command.apply(command): CommandResult`. The wire protocol that unifies browser UI, cloud render, and test harness (Decision 9). See `15-wire-protocol.md`.
- **`CommandResult`** — The JSON-serializable return value of `engine.command.apply()` — describes what changed (affected track IDs, before/after snapshots for undo, error if rejected). Consumed by the UI to update views, by the cloud caller to verify, and by tests to assert.
- **`SceneState`** — The JSON-serializable snapshot of the engine's current timeline state (tracks, elements, locks, selections, active scene). Produced by `engine.scenes.getActiveScene().serialize()` or similar. Tests assert against this directly (Tier 1 — see §13).
- **UI translation layer** — The thin UI module that converts user interactions (mouse clicks, drags, keyboard shortcuts) into `EngineCommand` objects. Holds no engine state. Tested via Playwright (Tier 3 — see §13).

---

## 13. Testability Strategy (Refined)

This section expands the §9 summary into the full three-tier methodology that follows from Decision 9 (Data-Driven Engine Architecture). The unifying principle: **the engine is fully data-driven, so tests bypass the UI for state verification and bypass the GPU for pure-logic verification.** See `17-test-plan.md` for the per-module test plan.

### 13.1 Three testing tiers (in order of preference)

| Tier | What it tests | How | Speed | Flakiness | Coverage |
|---|---|---|---|---|---|
| **Tier 1 — Pure engine tests** | NLE ops, color math, time math, project model, command protocol | Vitest, no browser. Construct `EngineCommand[]`, apply via `engine.command.apply()`, assert on `SceneState`. | Fastest (ms per test) | Lowest — fully deterministic | NLE ops, ripple diffs, `MediaTime`/`FrameRate` math, project schema validation, undo/redo, locked-track enforcement |
| **Tier 2 — Render tests** | Renderer, color pipeline, composition, blend modes, transitions | Playwright + headless Chrome. Load project via `ProjectJSON`, render specific frames via `renderFrame(n)`, screenshot, pixel-diff against reference PNG. | Medium (sec per test) | Medium — GPU/driver-dependent | WGSL shaders, YUV→RGB matrix, scene-linear grading, Porter-Duff blends, JFA feathering |
| **Tier 3 — UI tests** | UI translation layer (click/drag → `EngineCommand`), keyboard shortcuts | Playwright with keyboard shortcut dispatch. Issue shortcut, capture emitted `EngineCommand`, compare to expected shape. Verify state changes match Tier 1 direct-API path. | Slowest (sec per test) | Highest — real DOM layout, focus, timing | Keyboard shortcut completeness, click-target hit testing, drag-threshold math, command coalescing |

**Default rule:** if a behavior can be tested in Tier 1, do not promote it to Tier 2 or Tier 3. If it must be in Tier 2, do not also wrap it in Tier 3 unless you are explicitly testing the UI translation layer.

### 13.2 Avoiding UI interaction tax

Browser-automation clicks and drags are slow and flaky (mouse-move timing, hit-test precision, focus races). Use, in order of preference:

1. **Direct `EngineCommand` API** (Tier 1) — for any state change. Skips the browser entirely.
2. **Keyboard shortcuts via Playwright** (Tier 3) — for actions that have shortcuts (see `16-keyboard-shortcuts.md`). One `page.keyboard.press(...)` call, no mouse geometry.
3. **Playwright clicks/drags** — **only** for testing the UI translation layer itself (does a click on clip N at offset (x,y) produce the right `EngineCommand`?). Never for testing underlying engine behavior.

### 13.3 Multi-track blend verification — distinct solid-color test assets

For Tier 2 render tests that verify composition, blend modes, and opacity, use **distinct solid-color source clips** so the expected output pixel is trivial to compute:

| Track | Solid color | RGB (8-bit) | Intended purpose |
|---|---|---|---|
| Track 1 (overlay) | Pure red | `(255, 0, 0)` | Topmost layer — used to test `source-over`, `source-in`, mask inversion |
| Track 2 (overlay) | Pure green | `(0, 255, 0)` | Mid layer — used to test opacity ramps, crossfades |
| Track 3 (main) | Pure blue | `(0, 0, 255)` | Base layer — used to test bottom-of-stack compositing |
| Track 4 (audio-synced video) | Pure white | `(255, 255, 255)` | Base video — used to test color grading (linear exposure, gamma) |

Sampling pixel (x,y) and asserting on its RGB value verifies blend math without golden-image fragility. Document the full test-asset palette (color + duration + frame rate + audio track) in `17-test-plan.md`.

### 13.4 Audio waveform verification — distinct frequency tones

For Tier 2 audio tests, use **distinct pure-tone audio assets** so mix, varispeed, and pitch preservation can be verified by FFT bin comparison:

| Track | Frequency | Duration | Intended purpose |
|---|---|---|---|
| Audio 1 | 440 Hz (A4) | 10 s | Reference tone — mix gain, solo/mute |
| Audio 2 | 1000 Hz | 10 s | Mid-band tone — FFT bin check, varispeed pitch shift |
| Audio 3 | 100 Hz | 10 s | Low-band tone — bass routing, EQ verification |

Tests render via `OfflineAudioContext`, extract PCM, run FFT, assert that the expected frequency bins dominate and cross-talk bins are below threshold (e.g., -60 dB). This is far more robust than sample-by-sample PCM diff (which is brittle to phase).

### 13.5 NLE op verification — property-based + algorithm-specific

For each NLE op (cut / split / trim / ripple / roll / slip / slide / move / lock / snap — see spec 06):

**Property-based tests (Tier 1):** Generate random valid `SceneState`s, apply the op via `EngineCommand`, assert invariants:
- No overlaps on any track after ripple/move/insert
- No negative durations after trim/slip/slide
- Source bounds respected (`sourceIn`/`sourceOut` stay within clip's source media duration)
- Locked tracks untouched (any op targeting a locked track is rejected with a typed error)
- Total timeline duration preserved under slip (slip moves within source, doesn't change timeline)
- Undo/redo round-trips return to identical `SceneState`

**Algorithm-specific tests (Tier 1):** For each op, hand-crafted cases that exercise the algorithm's edge cases — e.g., split exactly at frame boundary, ripple across multiple tracks with linked clips, roll past adjacent clip edge.

### 13.6 WYSIWYG verification — three testable invariants

The WYSIWYG contract (§7) decomposes into three independent, testable invariants:

1. **State WYSIWYG** — for any `EngineCommand[]` C applied to any `ProjectJSON` P: `applyViaUI(C, P).sceneState === applyViaDirectAPI(C, P).sceneState`. The UI path and the direct-API path produce identical engine state. Tested in Tier 3 by capturing the `EngineCommand` the UI emits for each interaction and feeding the same command through Tier 1's direct-API apply, then diffing the two `SceneState`s.
2. **Pixel WYSIWYG** — for any `ProjectJSON` P: `renderBrowser(P, frame N).pixels === renderCloud(P, frame N).pixels`. Browser preview pixels and cloud render pixels are bit-identical. Tested in Tier 2 with a battery of reference projects; 0-pixel-diff is a build failure.
3. **Audio WYSIWYG** — for any `ProjectJSON` P: `renderRealtimeAudio(P).pcm === renderOfflineAudio(P).pcm`. `AudioContext` (real-time) and `OfflineAudioContext` (cloud) produce bit-identical PCM. Tested as a cross-cutting test (see spec 17 §2.2) by rendering both paths, extracting PCM, and sample-by-sample comparison (with deterministic DSP graph ordering). Audio WYSIWYG spans both Tier 1 (`OfflineAudioContext`) and Tier 2 (`AudioContext`), so it is classified as cross-cutting rather than pinned to a single tier.

All three are CI-blocking. Drift in any one is a release blocker.

### 13.7 Test asset design — single source of truth

Test assets (the solid-color clips, the tone audio files, the reference PNGs, the reference PCM files) are committed to the repo under `tests/assets/` and versioned alongside the engine. They are **not** generated at test time — that would couple the test to the same code under test. The asset palette is documented in `17-test-plan.md` and referenced by Tier 2 / Tier 3 tests by stable hash.

---

**End of master spec.** Continue to companion files for per-stream detail.
