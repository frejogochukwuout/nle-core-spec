# 01 — Core Engine: `EditorCore`, Managers, Contracts, Two Entry Points

**Stream:** Core engine architecture
**Status:** Seed spec (sub-agent scout will refine with code references)
**Primary teacher:** OpenCut-classic `EditorCore` pattern + FreeCut `deps/` contracts
**Spec file:** `01-core-engine.md`

---

## 1. Purpose

Define the engine's public API surface, internal manager structure, contract seams, and the dual-entry-point pattern (interactive vs. render). This is the architectural backbone — every other stream depends on it.

---

## 2. Goals

1. **Framework-agnostic engine.** The engine is a pure TypeScript module. It does not import React, Zustand, or any UI library. The UI consumes the engine; the engine never imports the UI.

2. **Automation-ready by accident.** The engine's public API surface (typed manager methods) should "paste one-to-one onto MCP tool definitions" (per Ken Imoto's analysis of OpenCut-classic). This means: typed method signatures, single options-object parameters, no callbacks that aren't promises.

3. **Two entry points, one engine.** `createInteractiveEngine()` (browser, real-time, rAF) and `createRenderEngine()` (cloud, sequential, frame-by-frame) share the same core. They differ only in scheduling and output target.

4. **Native-portable later.** The engine should be portable to Rust if we ever need native (Decision 7). Use types that translate (`i64` ticks, rational `FrameRate`, JSON project schema). Avoid coupling to browser-only APIs in the engine core — wrap them in interfaces.

---

## 3. Architecture

### 3.1 Layered structure

```
┌─────────────────────────────────────────────────────────┐
│ UI Layer (React + Zustand UI prefs only)                │
│   - Timeline UI                                         │
│   - Preview UI                                          │
│   - Library UI                                          │
│   - Effects UI                                          │
└────────────┬────────────────────────────────────────────┘
             │ calls
┌────────────▼───────────────────────────────────────────┐
│ EditorCore (singleton, typed managers)                  │
│   - TimelineManager   - PlaybackManager                 │
│   - CommandManager    - MediaManager                    │
│   - RendererManager   - SceneManager                    │
│   - ProjectManager    - ExportManager                  │
└────────────┬────────────────────────────────────────────┘
             │ delegates to
┌────────────▼───────────────────────────────────────────┐
│ Engine Core (pure TS, no UI, no browser-only APIs)      │
│   - Project model (types only)                          │
│   - NLE ops (pure functions over timeline state)        │
│   - Composition runtime (renders scene graph)           │
│   - Color pipeline (transfer functions, matrices)        │
│   - Command history (undo/redo)                         │
└────────────┬────────────────────────────────────────────┘
             │ uses via interfaces
┌────────────▼───────────────────────────────────────────┐
│ Platform Adapters (browser-specific implementations)    │
│   - Storage interface → OPFS adapter                   │
│   - Decoder interface → WebCodecs adapter              │
│   - Renderer interface → WebGPU adapter                │
│   - Audio interface → Web Audio adapter                │
│   - Worker interface → Worker adapter                  │
└─────────────────────────────────────────────────────────┘
```

### 3.2 EditorCore structure (adapted from OpenCut-classic)

OpenCut-classic's `EditorCore` (at `apps/web/src/editor/editor-store.ts` and `apps/web/src/core/index.ts`) is a singleton that exposes typed managers:

```ts
// Sketch — sub-agent scout to verify against OpenCut-classic source
export class EditorCore {
  private static instance: EditorCore | null = null;
  
  public readonly timeline: TimelineManager;
  public readonly command: CommandManager;
  public readonly playback: PlaybackManager;
  public readonly scenes: SceneManager;
  public readonly project: ProjectManager;
  public readonly media: MediaManager;
  public readonly renderer: RendererManager;
  public readonly export: ExportManager;
  
  private constructor(deps: EngineDeps) {
    // Initialization order matters — see §3.4
    this.command = new CommandManager();
    this.scenes = new SceneManager(this.command);
    this.timeline = new TimelineManager(this.scenes, this.command);
    this.media = new MediaManager(deps.storage, deps.decoder);
    this.renderer = new RendererManager(deps.renderer);
    this.playback = new PlaybackManager(this.scenes, deps.audio, deps.clock);
    this.project = new ProjectManager(deps.storage, this.scenes);
    this.export = new ExportManager(this.scenes, this.renderer);
  }
  
  static getInstance(deps?: EngineDeps): EditorCore {
    if (!EditorCore.instance) {
      if (!deps) throw new Error("EditorCore requires deps on first init");
      EditorCore.instance = new EditorCore(deps);
    }
    return EditorCore.instance;
  }
  
  static reset() {
    EditorCore.instance = null;
  }
}
```

**Sub-agent scout task:** Open `apps/web/src/editor/editor-store.ts` and `apps/web/src/core/index.ts` in OpenCut-classic. Verify the manager list, initialization order, and singleton pattern. Note any cross-references between managers (e.g., `TimelineManager` holding a reference to `SceneManager`).

### 3.3 Manager responsibilities

Each manager exposes typed public methods. No manager directly mutates another manager's state — they go through `CommandManager` for state-changing ops, or through direct method calls for queries.

#### TimelineManager
```ts
interface TimelineManager {
  // Queries
  getElement(id: string): TimelineElement | null;
  getElementsAtTime(time: MediaTime, trackId?: string): TimelineElement[];
  getTrack(trackId: string): Track | null;
  getTotalDuration(): MediaTime;
  getFrameAtTime(time: MediaTime): number;
  
  // Commands (all go through CommandManager for undo/redo)
  split(params: { time: MediaTime, trackIds?: string[] }): CommandId;
  trim(params: { elementId: string, delta: MediaTime, edge: 'start' | 'end' }): CommandId;
  move(params: { elementIds: string[], delta: MediaTime, targetTrackId?: string }): CommandId;
  ripple(params: { elementIds: string[], direction: 'left' | 'right' }): CommandId;
  roll(params: { elementIds: string[], delta: MediaTime }): CommandId;
  slip(params: { elementIds: string[], delta: MediaTime }): CommandId;
  slide(params: { elementIds: string[], delta: MediaTime }): CommandId;
  delete(params: { elementIds: string[], ripple?: boolean }): CommandId;
  // ... see 06-nle-ops.md for full list
}
```

#### CommandManager
```ts
interface CommandManager {
  execute(command: Command): CommandId;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  getHistory(): readonly Command[];
  
  // For grouping multiple ops into one undoable action
  beginTransaction(label: string): void;
  endTransaction(): CommandId;
}
```

**Reference:** OpenCut-classic `apps/web/src/core/managers/commands.ts`. Sub-agent scout should verify the exact API.

#### PlaybackManager
```ts
interface PlaybackManager {
  play(): void;
  pause(): void;
  seek(time: MediaTime): void;
  getCurrentTime(): MediaTime;
  getCurrentFrame(): number;
  isPlaying(): boolean;
  setRate(rate: number): void;  // 1.0 = normal, 0.5 = half speed, -1.0 = reverse
  setLoop(start: MediaTime | null, end: MediaTime | null): void;
  
  // Event subscription (for UI sync)
  on(event: 'timeUpdate' | 'playbackStateChange', cb: () => void): () => void;
}
```

**Reference:** OpenCut-classic `apps/web/src/core/managers/playback-manager.ts` (257 LOC). Sub-agent scout to verify the `rAF` + `performance.now()` clock — we override with FreeCut's `AudioContext.currentTime` clock (see `03-playback-engine.md`).

#### SceneManager
```ts
interface SceneManager {
  getActive(): TScene;
  getActiveId(): string;
  setActive(id: string): void;
  createScene(name: string): string;
  deleteScene(id: string): void;
  listScenes(): readonly TScene[];
  
  // Direct state access (for renderer)
  getActiveState(): SceneState;  // frozen snapshot
  subscribe(cb: (state: SceneState) => void): () => void;
}
```

#### MediaManager
```ts
interface MediaManager {
  importFile(file: File): Promise<string>;  // returns mediaId
  getMediaInfo(mediaId: string): MediaInfo | null;
  getMediaSource(mediaId: string): MediaSource | null;  // for decode
  deleteMedia(mediaId: string): Promise<void>;
  listMedia(): readonly MediaInfo[];
}
```

#### ProjectManager
```ts
interface ProjectManager {
  createNew(params: { name: string, fps: FrameRate, canvasSize: { width: number, height: number } }): Promise<string>;
  load(id: string): Promise<void>;
  save(): Promise<void>;
  saveAs(name: string): Promise<string>;
  exportFCPXML(): Promise<string>;  // returns XML string
  close(): Promise<void>;
}
```

**Note:** We override OpenCut-classic's IndexedDB-backed `ProjectManager` with our own storage layer. See `09-project-model.md`.

#### RendererManager
```ts
interface RendererManager {
  initialize(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<void>;
  renderFrame(time: MediaTime): Promise<RenderResult>;
  resize(width: number, height: number): void;
  isDegraded(): boolean;  // WebGPU not available, fallback active
  onDeviceLost(cb: () => void): () => void;
}
```

#### ExportManager
```ts
interface ExportManager {
  exportFCPXML(): Promise<string>;
  // Phase 2 (cloud render):
  // requestCloudRender(params: { format: 'prores-4444' | 'prores-422-hq' | 'h265' | ... }): Promise<RenderJobHandle>;
}
```

### 3.4 Initialization order (verified against OpenCut-classic by sub-agent)

```
1. EditorCore constructor receives EngineDeps (storage, decoder, renderer, audio, clock)
2. CommandManager created (no deps)
3. SceneManager created (depends on CommandManager)
4. TimelineManager created (depends on SceneManager, CommandManager)
5. MediaManager created (depends on Storage, Decoder adapters)
6. RendererManager created (depends on Renderer adapter)
7. PlaybackManager created (depends on SceneManager, Audio adapter, Clock)
8. ProjectManager created (depends on Storage adapter, SceneManager)
9. ExportManager created (depends on SceneManager, RendererManager)
```

**Sub-agent scout task:** Open `apps/web/src/core/index.ts` in OpenCut-classic. Verify the constructor body. Note any subtleties (lazy initialization, error handling, async init).

### 3.5 Contract seams (adapted from FreeCut `deps/`)

FreeCut's `src/runtime/composition-runtime/deps/` directory contains contracts:
- `timeline-contract.ts`
- `media-library-contract.ts`
- `keyframes-contract.ts`
- `player-contract.ts`
- `stores-contract.ts`
- `gizmo-contract.ts`

The composition-runtime imports these contracts, not concrete stores. This is the architectural seam that allows the runtime to be tested in isolation and swapped with different store implementations.

We adopt this pattern but generalize it. Every platform adapter is defined as an interface:

```ts
// src/engine/contracts.ts

export interface Storage {
  loadProject(id: string): Promise<ProjectJSON | null>;
  saveProject(id: string, data: ProjectJSON): Promise<void>;
  listProjects(): Promise<ProjectMetadata[]>;
  deleteProject(id: string): Promise<void>;
  loadMedia(mediaId: string): Promise<Blob | null>;
  saveMedia(mediaId: string, blob: Blob): Promise<void>;
  deleteMedia(mediaId: string): Promise<void>;
}

export interface Decoder {
  initialize(): Promise<void>;
  decode(mediaId: string, time: MediaTime): Promise<DecodedFrame>;
  decodeRange(mediaId: string, start: MediaTime, end: MediaTime): AsyncIterable<DecodedFrame>;
  getMediaInfo(mediaId: string): MediaInfo | null;
  release(mediaId: string): void;
}

export interface Renderer {
  initialize(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<void>;
  renderFrame(frame: FrameDescriptor): Promise<void>;
  resize(width: number, height: number): void;
  isDegraded(): boolean;
  onDeviceLost(cb: () => void): () => void;
}

export interface Audio {
  // Real-time (browser)
  createContext(): AudioContext;
  createOfflineContext(channels: number, length: number, sampleRate: number): OfflineAudioContext;
  
  // Worklet registration
  registerVarispeedProcessor(context: AudioContext | OfflineAudioContext): Promise<void>;
}

export interface Clock {
  now(): MediaTime;  // current media time
  start(): void;
  stop(): void;
  seek(time: MediaTime): void;
  setRate(rate: number): void;
  onTick(cb: (time: MediaTime) => void): () => void;
}

export interface WorkerPool {
  createWorker<T>(spec: WorkerSpec<T>): WorkerHandle<T>;
  // ... see 02-workers-threading.md
}
```

**Sub-agent scout task:** Open FreeCut's `src/runtime/composition-runtime/deps/` directory. Verify the contract pattern. Note which contracts are mandatory vs. optional. Document the exact interface shape for each.

### 3.6 Two entry points

The engine is exposed via two factory functions. They share the same core; they differ in adapter wiring.

#### Interactive entry (browser)
```ts
// src/engine/interactive.ts

export async function createInteractiveEngine(opts: {
  canvas: HTMLCanvasElement;
  storage: Storage;  // OPFS-backed
}): Promise<EditorCore> {
  const decoder = new WebCodecsDecoder();  // mediabunny
  const renderer = new WebGPURenderer();   // 10-bit, scene-linear
  const audio = new WebAudioAdapter();
  const clock = new AudioClock(audio);  // AudioContext.currentTime-based — FreeCut's trick
  const workerPool = new ManagedWorkerPool();
  
  const engine = EditorCore.getInstance({
    storage: opts.storage,
    decoder,
    renderer,
    audio,
    clock,
    workerPool,
  });
  
  await renderer.initialize(opts.canvas);
  await decoder.initialize();
  await audio.registerVarispeedProcessor(audio.createContext());
  
  return engine;
}
```

#### Render entry (cloud / headless)
```ts
// src/engine/render.ts

export async function createRenderEngine(opts: {
  canvas: OffscreenCanvas;  // headless Chrome
  storage: Storage;          // file system (server)
  project: ProjectJSON;
  pixelFormat: 'rgb24' | 'yuv422p10le';
  onFrame: (frame: number, pixels: Uint8ClampedArray | Uint16Array) => void;
}): Promise<RenderEngine> {
  const decoder = new WebCodecsDecoder();
  const renderer = new WebGPURenderer();
  const audio = new WebAudioAdapter();
  const clock = new StaticClock();  // no real-time — steps on demand
  const workerPool = new ManagedWorkerPool();
  
  const engine = EditorCore.getInstance({
    storage: opts.storage,
    decoder,
    renderer,
    audio,
    clock,
    workerPool,
  });
  
  await renderer.initialize(opts.canvas);
  await decoder.initialize();
  
  await engine.project.loadFromJSON(opts.project);
  
  return {
    async renderFrame(n: number): Promise<void> {
      const time = mediaTimeFromFrame({ frame: n, rate: engine.scenes.getActive().settings.fps });
      const result = await engine.renderer.renderFrame(time);
      const pixels = await renderer.readPixels(result.texture, opts.pixelFormat);
      opts.onFrame(n, pixels);
    },
    async renderAudio(): Promise<Float32Array> {
      // Use OfflineAudioContext — see 03-playback-engine.md
      ...
    },
    dispose(): void {
      EditorCore.reset();
    }
  };
}
```

**Critical invariant:** Both entry points use the same `EditorCore`, same managers, same engine core, same shaders, same color pipeline. The only differences are:
- Clock: real-time (`AudioClock`) vs. static (`StaticClock`)
- Output target: visible `<canvas>` vs. `OffscreenCanvas` read-back
- Audio: real-time `AudioContext` vs. `OfflineAudioContext`

This is what guarantees WYSIWYG (see §7 of master spec).

### 3.7 Engine/UI separation rules

Enforced by lint (adapt FreeCut's `check-feature-boundaries.mjs` pattern):

1. **Engine never imports UI.** Files in `src/engine/` cannot import from `src/ui/`. Enforced by ESLint rule `no-restricted-imports`.

2. **UI imports engine via `EditorCore` only.** Files in `src/ui/` import `EditorCore` and call its typed methods. They do not import internal managers directly — they go through `EditorCore.timeline.split(...)` etc.

3. **Engine uses adapters, not browser APIs.** Files in `src/engine/` cannot import `WebCodecs`, `WebGPU`, `OPFS`, `AudioContext`, `Worker` directly. They use the `Decoder`, `Renderer`, `Storage`, `Audio`, `WorkerPool` interfaces. Browser-specific implementations live in `src/platform/`.

4. **No circular deps.** Managers can hold references to each other (e.g., `TimelineManager` holds `SceneManager`), but the references must be one-directional at construction time. Enforced by `madge` in CI.

5. **All state changes go through CommandManager.** Direct mutation of timeline state (e.g., `scene.tracks[0].elements.push(...)`) is forbidden — it would bypass undo/redo. Enforced by ESLint rule on the `SceneState` type (make it `Readonly` in the public surface).

---

## 4. Command Pattern & Undo/Redo

### 4.1 Command structure

Every state-changing operation is a `Command`:

```ts
interface Command {
  id: CommandId;
  label: string;  // for UI display, e.g., "Split at 00:01:23:14"
  execute(state: SceneState): SceneState;  // pure function
  undo(state: SceneState): SceneState;    // pure function (or store prev state)
  coalesceKey?: string;  // for merging consecutive similar commands (e.g., drags)
}
```

State is **immutable** — `execute` returns a new `SceneState`, not a mutation. This makes undo trivial (just swap to previous state) and enables time-travel debugging.

### 4.2 Transaction grouping

For multi-step operations (e.g., "ripple delete" which removes a clip and shifts subsequent clips), wrap in a transaction:

```ts
engine.command.beginTransaction("Ripple Delete");
engine.timeline.delete({ elementIds: ['clip-3'], ripple: true });
// ... may issue multiple sub-commands internally
const cmdId = engine.command.endTransaction();
// One undo undoes the whole ripple delete
```

### 4.3 Coalescing

For continuous operations (e.g., dragging a clip), consecutive commands with the same `coalesceKey` are merged:

```ts
// During a drag, every mousemove emits a move command
engine.timeline.move({ elementIds: ['clip-3'], delta: mediaTimeFromSeconds({ seconds: 0.001 }) });
// These coalesce into one undoable "Move clip-3" command
```

### 4.4 Reference

**Sub-agent scout task:** Open `apps/web/src/core/managers/commands.ts` in OpenCut-classic. Verify the command structure, history limit, coalescing logic. Also check FreeCut's `stores/timeline-command-store.ts` and `zundo` (Zustand middleware) usage for any patterns we should adopt.

---

## 5. EngineDeps & Lifecycle

### 5.1 EngineDeps

```ts
interface EngineDeps {
  storage: Storage;
  decoder: Decoder;
  renderer: Renderer;
  audio: Audio;
  clock: Clock;
  workerPool: WorkerPool;
}
```

Both `createInteractiveEngine` and `createRenderEngine` construct `EngineDeps` with appropriate adapter implementations.

### 5.2 Lifecycle

```
createInteractiveEngine(canvas, storage)
  ├─ Construct adapters (Decoder, Renderer, Audio, Clock, WorkerPool)
  ├─ EditorCore.getInstance(deps) — singleton init
  ├─ renderer.initialize(canvas) — boots WebGPU device
  ├─ decoder.initialize() — boots mediabunny
  ├─ audio.registerVarispeedProcessor() — loads SoundTouch AudioWorklet
  └─ return EditorCore

// Later:
engine.project.load(id) or engine.project.createNew(...)
engine.playback.play()
// ... editing happens
engine.project.save()
// ... user leaves
EditorCore.reset()  // for tests / hot reload
```

### 5.3 Error handling

- Adapter initialization failures (e.g., WebGPU not available) → degrade gracefully, show banner
- Decode errors (e.g., unsupported codec) → mark media as "failed", show in library
- Render errors (e.g., device lost) → show "renderer lost, please reload" UI
- Storage errors (e.g., quota exceeded) → show storage warning
- Command errors (e.g., invalid op) → log + revert state, never crash

---

## 6. Module Structure

```
src/
├── engine/                    # Pure TS engine (no UI, no browser-only APIs)
│   ├── core/
│   │   ├── EditorCore.ts
│   │   ├── managers/
│   │   │   ├── TimelineManager.ts
│   │   │   ├── CommandManager.ts
│   │   │   ├── PlaybackManager.ts
│   │   │   ├── SceneManager.ts
│   │   │   ├── MediaManager.ts
│   │   │   ├── ProjectManager.ts
│   │   │   ├── RendererManager.ts
│   │   │   └── ExportManager.ts
│   │   └── contracts.ts        # Storage, Decoder, Renderer, Audio, Clock, WorkerPool interfaces
│   ├── types/
│   │   ├── media-time.ts       # MediaTime (i64 ticks, branded type)
│   │   ├── frame-rate.ts       # Rational FrameRate
│   │   ├── scene.ts            # TScene, SceneTracks, Track, TimelineElement
│   │   ├── project.ts          # ProjectJSON, ProjectMetadata
│   │   ├── command.ts          # Command, CommandId
│   │   └── render.ts           # FrameDescriptor, EffectPass, BlendMode
│   ├── ops/                    # NLE ops (pure functions)
│   │   ├── split.ts
│   │   ├── trim.ts
│   │   ├── move.ts
│   │   ├── ripple/
│   │   │   ├── diff.ts
│   │   │   ├── shift.ts
│   │   │   └── apply.ts
│   │   ├── roll.ts
│   │   ├── slip.ts
│   │   ├── slide.ts
│   │   ├── delete.ts
│   │   └── snap.ts
│   ├── composition/            # Composition runtime (renders scene graph → frame descriptor)
│   │   ├── Composer.ts
│   │   ├── LayerResolver.ts
│   │   └── EffectResolver.ts
│   ├── color/                  # Color pipeline (transfer functions, matrices)
│   │   ├── color-space.ts      # BT.709, BT.2020, Display P3, etc.
│   │   ├── transfer.ts         # sRGB EOTF, PQ EOTF, HLG OETF
│   │   └── yuv.ts              # YUV<->RGB matrices
│   ├── commands/               # Command implementations
│   │   ├── SplitCommand.ts
│   │   ├── TrimCommand.ts
│   │   ├── MoveCommand.ts
│   │   └── ...
│   ├── interactive.ts          # createInteractiveEngine()
│   └── render.ts               # createRenderEngine()
├── platform/                   # Browser-specific adapter implementations
│   ├── storage/
│   │   ├── OPFSStorage.ts      # implements Storage
│   │   └── FSStorage.ts        # File System Access (optional)
│   ├── decoder/
│   │   └── WebCodecsDecoder.ts # implements Decoder (uses mediabunny)
│   ├── renderer/
│   │   └── WebGPURenderer.ts   # implements Renderer (10-bit, scene-linear)
│   ├── audio/
│   │   ├── WebAudioAdapter.ts  # implements Audio
│   │   └── worklets/
│   │       └── soundtouch-processor.worklet.ts
│   ├── clock/
│   │   ├── AudioClock.ts        # interactive: AudioContext.currentTime-based
│   │   └── StaticClock.ts      # render: steps on demand
│   └── workers/
│       ├── ManagedWorker.ts    # FreeCut pattern
│       ├── ManagedWorkerPool.ts
│       ├── ManagedWorkerSession.ts
│       └── workers/
│           ├── decode.worker.ts
│           ├── waveform.worker.ts
│           ├── filmstrip.worker.ts
│           ├── export-render.worker.ts
│           └── opfs.worker.ts
├── ui/                         # React UI (cannot be imported by engine/)
│   ├── components/
│   ├── routes/
│   └── stores/                 # Zustand UI prefs only
└── fcpxml/                     # FCPXML exporter
    ├── FCPXMLExporter.ts
    ├── schema.ts               # Zod schema for FCPXML 1.10
    └── mappings.ts             # ProjectJSON → FCPXML
```

---

## 7. Open Questions for Sub-Agent Scout

1. **OpenCut-classic `EditorCore` exact source.** Read `apps/web/src/core/index.ts` (or wherever `EditorCore` is defined). Verify manager list, constructor body, initialization order. Quote the actual code.

2. **OpenCut-classic manager method signatures.** Read each manager file in `apps/web/src/core/managers/`. Document the public API surface of each. We will adopt most of these verbatim.

3. **FreeCut `deps/` contracts.** Read `src/runtime/composition-runtime/deps/` directory in FreeCut. Document each contract file's full interface. Note which contracts are mandatory vs. optional.

4. **FreeCut `check-feature-boundaries.mjs`.** Read `scripts/check-feature-boundaries.mjs` (and related lint scripts). Document the rules. We will adopt similar enforcement.

5. **FreeCut's `EditorCore`-equivalent.** FreeCut doesn't have a singleton — it uses Zustand stores + contract patterns. Document how FreeCut structures its equivalent of an "engine" (likely the `runtime/` + `features/timeline/stores/` layer).

6. **OpenCut-classic command pattern.** Read `apps/web/src/core/managers/commands.ts` and a sample command (e.g., `apps/web/src/commands/timeline/element/split-elements.ts`). Document the command structure, history management, coalescing.

7. **Initialization error patterns.** How does OpenCut-classic handle initialization failure (e.g., WebGPU not available)? Document the degraded-mode flow.

---

## 8. Test Plan for This Stream

1. **Unit test:** Each manager method has unit tests with mock deps.
2. **Contract test:** Each platform adapter (OPFSStorage, WebCodecsDecoder, etc.) is tested against its interface contract.
3. **Integration test:** `createInteractiveEngine()` boots, loads a sample project, plays 1 second, asserts no errors.
4. **Render entry test:** `createRenderEngine()` boots, renders 10 frames of a sample project, asserts pixels match a reference.
5. **WYSIWYG test:** Same project rendered via both entries — pixel diff must be 0.
6. **Undo/redo test:** Apply 50 random commands, undo all, assert state matches initial.
7. **Boundary lint:** ESLint `no-restricted-imports` catches any engine → UI import.

---

**End of `01-core-engine.md`.** Next: `02-workers-threading.md`.
