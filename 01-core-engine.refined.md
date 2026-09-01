# 01 — Core Engine: `EditorCore`, Managers, Contracts, Two Entry Points

**Stream:** Core engine architecture
**Status:** Refined by sub-agent scout (SCOUT-01) — open questions answered with source code references
**Primary teacher:** OpenCut-classic `EditorCore` pattern + FreeCut `deps/` contracts
**Seed spec:** `01-core-engine.md`
**Refined spec:** `01-core-engine.refined.md` (this file)

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
│   - RendererManager   - ScenesManager (plural)              │
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
// Sketch — corrected per SCOUT-01 findings (see §14.2 / §14.4 for verbatim source).
// NOTE: OpenCut-classic uses zero-arg `private constructor()` with every manager
// receiving the entire EditorCore back-reference (`new XxxManager(this)`). Our
// rebuild adopts the seed spec's DI shape but follows OpenCut-classic's class
// names and manager roster (12 managers, no `ExportManager` — see §14.1).
export class EditorCore {
  private static instance: EditorCore | null = null;

  public readonly timeline: TimelineManager;
  public readonly command: CommandManager;
  public readonly playback: PlaybackManager;
  public readonly scenes: ScenesManager;          // plural — OpenCut-classic class name
  public readonly project: ProjectManager;
  public readonly media: MediaManager;
  public readonly renderer: RendererManager;
  public readonly save: SaveManager;              // OpenCut-classic (debounced autosave)
  public readonly audio: AudioManager;            // OpenCut-classic (owns AudioClock)
  public readonly selection: SelectionManager;
  public readonly clipboard: ClipboardManager;
  public readonly diagnostics: DiagnosticsManager;

  private constructor(deps: EngineDeps) {
    // Initialization order — see §3.4 (and §14.17 for OpenCut-classic's actual 12-step order)
    this.command = new CommandManager(this);
    this.timeline = new TimelineManager(this);
    this.playback = new PlaybackManager(this);
    this.scenes = new ScenesManager(this);
    this.project = new ProjectManager(this);
    this.media = new MediaManager(this);
    this.renderer = new RendererManager(this);
    this.save = new SaveManager({ editor: this });
    this.audio = new AudioManager(this);
    this.selection = new SelectionManager(this);
    this.clipboard = new ClipboardManager(this);
    this.diagnostics = new DiagnosticsManager(this);
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

**Sub-agent scout task:** Open `apps/web/src/editor/editor-store.ts` and `apps/web/src/core/index.ts` in OpenCut-classic. Verify the manager list, initialization order, and singleton pattern. Note any cross-references between managers (e.g., `TimelineManager` holding a back-reference to `EditorCore`).

### 3.3 Manager responsibilities

Each manager exposes typed public methods. No manager directly mutates another manager's state — they go through `CommandManager` for state-changing ops, or through direct method calls for queries.

#### TimelineManager
```ts
// Sketch — corrected per SCOUT-01 (see §14.5 for verbatim source). The seed
// spec's `split/trim/move/ripple/roll/slip/slide/delete` names do NOT exist in
// OpenCut-classic — actual method names below. Ripple/roll/slip/slide are
// implemented as op modules (see 06-nle-ops.md) and dispatched via
// `updateElements` or `BatchCommand`, NOT as TimelineManager methods.
interface TimelineManager {
  // Queries
  getTrackById({ trackId }: { trackId: string }): TimelineTrack | null;
  getTotalDuration(): MediaTime;
  getLastFrameTime(): MediaTime;
  getElementsWithTracks({
    elements,
  }: {
    elements: { trackId: string; elementId: string }[];
  }): Array<{ track: TimelineTrack; element: TimelineElement }>;

  // Track ops
  addTrack({ type, index }: { type: TrackType; index?: number }): string;
  removeTrack({ trackId }: { trackId: string }): void;

  // Element ops (all go through CommandManager for undo/redo)
  insertElement({ element, placement }: InsertElementParams): void;
  updateElementTrim({
    elementId, trimStart, trimEnd, startTime?, duration?, pushHistory?,
  }: { ... }): void;
  moveElements({
    moves, createTracks?,
  }: {
    moves: PlannedElementMove[];
    createTracks?: PlannedTrackCreation[];
  }): void;
  splitElements({
    elements, splitTime, retainSide = "both",
  }: {
    elements: { trackId: string; elementId: string }[];
    splitTime: MediaTime;
    retainSide?: "both" | "left" | "right";
  }): { trackId: string; elementId: string }[];
  deleteElements({
    elements,
  }: { elements: { trackId: string; elementId: string }[] }): void;
  duplicateElements({
    elements,
  }: { elements: { trackId: string; elementId: string }[] }): { trackId: string; elementId: string }[];
  updateElements({
    updates, pushHistory = true,
  }: {
    updates: Array<{ trackId: string; elementId: string; patch: Partial<TimelineElement> }>;
    pushHistory?: boolean;
  }): void;

  // Track-level toggles (only `toggleTrackMute` and `toggleTrackVisibility`
  // exist in OpenCut-classic — `toggleTrackSolo` and `toggleTrackLock` are
  // greenfield additions for our rebuild, named to match the same convention.)
  toggleTrackMute({ trackId }: { trackId: string }): void;
  toggleTrackSolo({ trackId }: { trackId: string }): void;       // greenfield
  toggleTrackLock({ trackId }: { trackId: string }): void;       // greenfield
  toggleTrackVisibility({ trackId }: { trackId: string }): void;

  // Live preview / coalescing pattern (replaces seed spec's `coalesceKey` —
  // see §4.3 below and §14.6). Drag handlers call `previewElements()` on
  // every mousemove and `commitPreview()` once on mouseup.
  previewElements({ updates }: { updates: Array<{ trackId: string; elementId: string; patch: Partial<TimelineElement> }> }): void;
  commitPreview(): void;
  discardPreview(): void;

  // ... see 06-nle-ops.md for the full op inventory
}
```

#### CommandManager
```ts
// Sketch — corrected per SCOUT-01 (see §14.6). OpenCut-classic has NO
// `beginTransaction`/`endTransaction` — multi-command transactions are
// grouped by constructing a `BatchCommand(commands)` (see §4.2). There is
// also NO `getHistory()` exposed publicly. Coalescing is handled at the
// manager layer via `previewElements`/`commitPreview` (see §4.3), NOT in
// CommandManager.
interface CommandManager {
  execute({ command }: { command: Command }): Command;
  push({ command }: { command: Command }): void;   // used by commitPreview() to roll preview into a TracksSnapshotCommand
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  isRippleEnabled: boolean;   // ripple mode flag — modifies every execute() (see 06-nle-ops.md)
  subscribe(cb: () => void): () => void;
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

#### ScenesManager
```ts
// Sketch — corrected per SCOUT-01 (see §14.4). Class name is `ScenesManager`
// (plural). All command-issuing methods are `async` and take option objects
// (matching OpenCut-classic `scenes-manager.ts`). `setActive`, `getActiveId`,
// `getActiveState`, and `listScenes` do NOT exist — use `switchToScene`,
// `getActiveSceneOrNull()?.id`, and `getScenes()` instead. The "frozen
// snapshot" concept from the seed spec's `getActiveState()` is the consumer's
// responsibility (e.g., `buildFrameDescriptor(state, n)` snapshots what it
// needs from `getActiveScene().tracks`).
interface ScenesManager {
  getActiveScene(): TScene;                     // throws if no active scene
  getActiveSceneOrNull(): TScene | null;         // null-safe variant
  getScenes(): TScene[];                         // full scene list (no readonly; OpenCut returns a live array)

  // Scene lifecycle (all async — they issue commands through CommandManager)
  async createScene({ name, isMain = false }: { name: string; isMain: boolean }): Promise<string>;
  async deleteScene({ sceneId }: { sceneId: string }): Promise<void>;
  async renameScene({ sceneId, name }: { sceneId: string; name: string }): Promise<void>;
  async switchToScene({ sceneId }: { sceneId: string }): Promise<void>;

  // Bookmark ops (also async — go through CommandManager)
  async toggleBookmark({ time }: { time: MediaTime }): Promise<void>;
  async removeBookmark({ time }: { time: MediaTime }): Promise<void>;
  async updateBookmark({ time, updates }: { time: MediaTime; updates: Partial<Omit<Bookmark, "time">> }): Promise<void>;
  async moveBookmark({ fromTime, toTime }: { fromTime: MediaTime; toTime: MediaTime }): Promise<void>;
  isBookmarked({ time }: { time: MediaTime }): boolean;
  getBookmarkAtTime({ time }: { time: MediaTime }): Bookmark | null;

  // Bulk state access (used by load/save flows — not part of undo/redo)
  initializeScenes({ scenes, currentSceneId? }: { scenes: TScene[]; currentSceneId?: string }): void;
  setScenes({ scenes, activeSceneId? }: { scenes: TScene[]; activeSceneId?: string }): void;
  clearScenes(): void;
  updateSceneTracks({ tracks }: { tracks: SceneTracks }): void;

  // Subscription (for UI sync)
  subscribe(listener: () => void): () => void;
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
2. registerDefaultEffects() (side effect — registers known clip effects)
3. registerDefaultMasks() (side effect — registers known mask types)
4. CommandManager created (no deps)
5. TimelineManager created (holds back-reference to EditorCore)
6. PlaybackManager created (holds back-reference to EditorCore)
7. ScenesManager created (plural — holds back-reference to EditorCore)
8. ProjectManager created
9. MediaManager created
10. RendererManager created
11. SaveManager created (debounced autosave — wraps EditorCore)
12. AudioManager created (owns AudioClock)
13. SelectionManager created
14. ClipboardManager created
15. DiagnosticsManager created
16. registerTranscriptionDiagnostics({ diagnostics }) (side effect)
17. playback.bindTimelineScope() (post-construction wiring)
18. command.registerReactor(...) (empty-track pruning reactor)
19. save.start() (begin autosave loop)
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
      const time = mediaTimeFromFrame({ frame: n, rate: engine.scenes.getActiveScene().settings.fps });
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

2. **UI imports engine via `EditorCore` only.** Files in `src/ui/` import `EditorCore` and call its typed methods. They do not import internal managers directly — they go through `EditorCore.timeline.splitElements(...)` etc.

3. **Engine uses adapters, not browser APIs.** Files in `src/engine/` cannot import `WebCodecs`, `WebGPU`, `OPFS`, `AudioContext`, `Worker` directly. They use the `Decoder`, `Renderer`, `Storage`, `Audio`, `WorkerPool` interfaces. Browser-specific implementations live in `src/platform/`.

4. **No circular deps.** Managers can hold back-references to each other (e.g., `TimelineManager` holds a reference to `EditorCore`, which holds a reference to `ScenesManager`). OpenCut-classic uses bidirectional access via the root `EditorCore` instance — we adopt the same pattern. Enforced by `madge` in CI (and by FreeCut's standalone `check-feature-boundaries.mjs` scripts ported as pre-commit hooks — see §14.16).

5. **All state changes go through CommandManager.** Direct mutation of timeline state (e.g., `scene.tracks[0].elements.push(...)`) is forbidden — it would bypass undo/redo. Enforced by ESLint rule on the `SceneState` type (make it `Readonly` in the public surface).

---

## 4. Command Pattern & Undo/Redo

### 4.1 Command structure

Every state-changing operation is a `Command` — an abstract class with parameterless `execute()`/`undo()`/`redo()` (matching OpenCut-classic `apps/web/src/commands/base-command.ts`). There is **no `id`, no `label`, no `coalesceKey`** on the Command itself — coalescing is handled at the manager layer (see §4.3), and command identity is for `CommandHistoryEntry` to track, not the Command object:

```ts
// apps/web/src/commands/base-command.ts
export interface CommandResult {
  selection?: EditorSelectionPatch;   // optional selection side-effect
}

export abstract class Command {
  abstract execute(): CommandResult | undefined;
  undo(): void { throw new Error("Undo not implemented for this command"); }
  redo(): CommandResult | undefined { return this.execute(); }
}
```

Commands pull state from the singleton `EditorCore.getInstance()` themselves (or via the `editor` reference passed at construction) and mutate tracks through `editor.timeline.updateTracks()`. This is a deliberate tradeoff — slightly less testable in isolation, but a much simpler API surface (no `state` parameter threading).

### 4.2 Transaction grouping via `BatchCommand`

OpenCut-classic has **no `beginTransaction`/`endTransaction`** — multi-step operations (e.g., "ripple delete" which removes a clip and shifts subsequent clips) are grouped by constructing a single `BatchCommand` that wraps an array of sub-commands:

```ts
// apps/web/src/commands/batch-command.ts
import { Command, CommandResult } from "./base-command";

export class BatchCommand extends Command {
  constructor(private commands: Command[]) { super(); }

  execute(): CommandResult | undefined {
    let latestSelectionResult: CommandResult | undefined;
    for (const command of this.commands) {
      const result = command.execute();
      if (result?.selection !== undefined) latestSelectionResult = result;
    }
    return latestSelectionResult;
  }

  undo(): void {
    for (const command of [...this.commands].reverse()) command.undo();
  }

  redo(): CommandResult | undefined {
    let latestSelectionResult: CommandResult | undefined;
    for (const command of this.commands) {
      const result = command.redo();
      if (result?.selection !== undefined) latestSelectionResult = result;
    }
    return latestSelectionResult;
  }
}
```

Usage:

```ts
const batch = new BatchCommand([
  new DeleteElementsCommand({ elements: [{ trackId, elementId: 'clip-3' }] }),
  new MoveElementCommand({ moves: shiftSubsequentClips, createTracks: [] }),
]);
engine.command.execute({ command: batch });
// One `undo()` undoes the whole ripple delete
```

### 4.3 Coalescing via `previewElements` / `commitPreview`

For continuous operations (e.g., dragging a clip), OpenCut-classic does NOT merge consecutive commands by `coalesceKey` at the CommandManager layer (the seed spec's `coalesceKey` does not exist). Instead, drag handlers call `previewElements({updates})` on every mousemove to overlay uncommitted patches on the live tracks, and `commitPreview()` once on mouseup to roll the accumulated preview into a single `TracksSnapshotCommand` (via `editor.command.push({command})`):

```ts
// During a drag, every mousemove calls previewElements() (does NOT push undo history)
engine.timeline.previewElements({
  updates: [{ trackId, elementId: 'clip-3', patch: { startTime: newStartTime } }],
});

// On mouseup, commitPreview() rolls the accumulated preview into a single
// TracksSnapshotCommand and pushes it onto the undo stack.
engine.timeline.commitPreview();

// Or, if the drag was cancelled (e.g., Escape key):
engine.timeline.discardPreview();
```

The `TracksSnapshotCommand` (see `06-nle-ops.md`) is the canonical coalescing unit — a single Command whose `execute()` swaps tracks to the post-drag snapshot and whose `undo()` swaps back to the pre-drag snapshot. This pattern replaces the seed spec's `coalesceKey` field entirely.

### 4.4 Reference

**Sub-agent scout task:** Open `apps/web/src/core/managers/commands.ts` and `apps/web/src/commands/{base-command,batch-command}.ts` in OpenCut-classic. Verify the command structure, history limit, and `push()` pattern used by `commitPreview()`. Also check FreeCut's `stores/timeline-command-store.ts` and `zundo` (Zustand middleware) usage for any patterns we should adopt.

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
│   │   │   ├── ScenesManager.ts
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

## 7. Open Questions — ANSWERED by SCOUT-01

Each open question from the seed spec is answered below with file path, line numbers, and quoted code. Verification status: ✅ confirmed, ⚠️ partial / caveated, ❌ assumption incorrect.

---

### Q1. OpenCut-classic `EditorCore` exact source

**File:** `/tmp/opencut-classic/apps/web/src/core/index.ts` (81 LOC)
**Status:** ✅ CONFIRMED (singleton + `getInstance` + `reset` pattern) — but seed spec's manager list, constructor signature, and init order are **all INCORRECT** (see Q2 and §14).

Actual source, lines 17–81:

```ts
// apps/web/src/core/index.ts:17-81
export class EditorCore {
        private static instance: EditorCore | null = null;
        public readonly timeline: TimelineManager;
        public readonly command: CommandManager;
        public readonly playback: PlaybackManager;
        public readonly scenes: ScenesManager;          // ⚠️ NOTE: class name is "ScenesManager", NOT "SceneManager"
        public readonly project: ProjectManager;
        public readonly media: MediaManager;
        public readonly renderer: RendererManager;
        public readonly save: SaveManager;              // ❌ MISSING from seed spec
        public readonly audio: AudioManager;            // ❌ MISSING from seed spec
        public readonly selection: SelectionManager;    // ❌ MISSING from seed spec
        public readonly clipboard: ClipboardManager;   // ❌ MISSING from seed spec
        public readonly diagnostics: DiagnosticsManager;// ❌ MISSING from seed spec
        // ❌ NO ExportManager exists in OpenCut-classic — export logic lives in RendererManager.exportProject()

        private constructor() {
                registerDefaultEffects();
                registerDefaultMasks();
                this.command = new CommandManager(this);
                this.timeline = new TimelineManager(this);
                this.playback = new PlaybackManager(this);
                this.scenes = new ScenesManager(this);
                this.project = new ProjectManager(this);
                this.media = new MediaManager(this);
                this.renderer = new RendererManager(this);
                this.save = new SaveManager({ editor: this });
                this.audio = new AudioManager(this);
                this.selection = new SelectionManager(this);
                this.clipboard = new ClipboardManager(this);
                this.diagnostics = new DiagnosticsManager(this);
                registerTranscriptionDiagnostics({ diagnostics: this.diagnostics });
                this.playback.bindTimelineScope();
                this.command.registerReactor(() => {
                        const activeScene = this.scenes.getActiveSceneOrNull();
                        if (!activeScene) {
                                return;
                        }
                        const tracks = activeScene.tracks;
                        const prunedTracks = {
                                ...tracks,
                                overlay: tracks.overlay.filter((track) => track.elements.length > 0),
                                audio: tracks.audio.filter((track) => track.elements.length > 0),
                        };
                        if (
                                prunedTracks.overlay.length !== tracks.overlay.length ||
                                prunedTracks.audio.length !== tracks.audio.length
                        ) {
                                this.timeline.updateTracks(prunedTracks);
                        }
                });
                this.save.start();
        }

        static getInstance(): EditorCore {
                if (!EditorCore.instance) {
                        EditorCore.instance = new EditorCore();
                }
                return EditorCore.instance;
        }

        static reset(): void {
                EditorCore.instance = null;
        }
}
```

**Key findings the seed spec missed:**

1. **No `EngineDeps` parameter.** `EditorCore`'s constructor takes **zero arguments** — line 32 `private constructor() {}`. The seed spec's `private constructor(deps: EngineDeps)` is wrong. OpenCut-classic relies on side-effectful imports (`storageService`, `gpu-renderer`, etc.); there is no DI container.
2. **Every manager receives `this` (the `EditorCore` instance)**, not specific peer managers. So all inter-manager references are bidirectional through the singleton root, not one-directional at construction time. The seed spec's claim that "the references must be one-directional at construction time" is **not how OpenCut-classic does it**. The dominant pattern is `new XxxManager(this)` (11 of 12 managers — e.g., `TimelineManager` constructor at line 73 of `timeline-manager.ts`: `constructor(private editor: EditorCore) {}`). The single exception is **`SaveManager`**, which is constructed as `new SaveManager({ editor: this })` (`core/index.ts:42`) — an options-object pattern that allows default overrides like `debounceMs = 800` (`save-manager.ts:3-23`).
3. **12 managers, not 8.** Seed spec listed 8 (`timeline/command/playback/scenes/project/media/renderer/export`). Actual list: `timeline, command, playback, scenes, project, media, renderer, save, audio, selection, clipboard, diagnostics`. There is **no `ExportManager`** in OpenCut-classic — export functionality is inlined in `RendererManager.exportProject()` (`apps/web/src/core/managers/renderer-manager.ts:141-240`).
4. **Two side-effectful calls happen inside the constructor** (lines 33–34): `registerDefaultEffects()` and `registerDefaultMasks()`. These are effect/mask registry bootstrap calls, not manager construction.
5. **Post-construction wiring** happens at lines 47–67: `this.playback.bindTimelineScope()` plus a `command.registerReactor()` callback that prunes empty tracks. The seed spec did not model this reactor pattern at all.
6. **Auto-start of `SaveManager`** at line 68: `this.save.start()` begins the debounced autosave loop immediately, subscribing to `scenes.subscribe` and `timeline.subscribe` (see `apps/web/src/core/managers/save-manager.ts:27-38`).
7. **`getInstance()` takes no arguments** (line 71). The seed spec's `getInstance(deps?: EngineDeps)` signature is wrong — see `apps/web/src/editor/use-editor.ts:26`: `const editor = useMemo(() => EditorCore.getInstance(), []);`.

---

### Q2. OpenCut-classic manager method signatures

**Status:** ✅ Confirmed (but API differs significantly from seed spec sketch — see below and §14).

All managers live in `/tmp/opencut-classic/apps/web/src/core/managers/`. **Every manager holds a back-reference to `EditorCore`** (`constructor(private editor: EditorCore)`) — not to specific peer managers. This is the dominant coupling pattern.

#### `TimelineManager` — `apps/web/src/core/managers/timeline-manager.ts` (935 LOC)

Public API (lines 67–935). Selected method signatures (all take single options-object params — confirms seed spec's "automation-ready" hypothesis ✅):

```ts
// timeline-manager.ts:75-79 — returns trackId, executes AddTrackCommand
addTrack({ type, index }: { type: TrackType; index?: number }): string

// timeline-manager.ts:81-84
removeTrack({ trackId }: { trackId: string }): void

// timeline-manager.ts:86-89
insertElement({ element, placement }: InsertElementParams): void

// timeline-manager.ts:91-132 — supports pushHistory=false for live preview commits
updateElementTrim({
  elementId, trimStart, trimEnd, startTime, duration, pushHistory = true,
}: { ... }): void

// timeline-manager.ts:159-175 — note "moves" array, not single element
moveElements({
  moves, createTracks,
}: { moves: PlannedElementMove[]; createTracks?: PlannedTrackCreation[] }): void

// timeline-manager.ts:187-203 — split returns right-side elements for selection continuity
splitElements({
  elements, splitTime, retainSide = "both",
}: { ... }): { trackId: string; elementId: string }[]

// timeline-manager.ts:205-212
getTotalDuration(): MediaTime

// timeline-manager.ts:252-259
deleteElements({ elements }: { elements: { trackId: string; elementId: string }[] }): void

// timeline-manager.ts:799-807 — returns duplicated element refs
duplicateElements({ elements }: { ... }): { trackId: string; elementId: string }[]
```

⚠️ **Notable departures from seed spec's `TimelineManager` sketch:**
- Seed spec methods `split(params)`, `trim(params)`, `move(params)`, `ripple(params)`, `roll(params)`, `slip(params)`, `slide(params)` — **none of these names exist**. Actual methods are `splitElements`, `updateElementTrim`, `moveElements`, `deleteElements`. There is **no `ripple()` method on TimelineManager** — ripple is a `CommandManager.isRippleEnabled` flag (see `commands.ts:14`) that modifies every command execution (see Q6 below). Slip/slide/roll are implemented in `retime/` and `group-resize/` modules, not as `TimelineManager` methods.
- Seed spec omitted: `addTrack`, `removeTrack`, `insertElement`, `duplicateElements`, `toggleTrackMute`, `toggleTrackVisibility`, `toggleSourceAudioSeparation`, `addClipEffect`, `removeClipEffect`, `updateClipEffectParams`, `toggleClipEffect`, `reorderClipEffects`, `upsertKeyframes`, `removeKeyframes`, `retimeKeyframe`, `updateKeyframeCurves`, `upsertEffectParamKeyframe`, `removeEffectParamKeyframe`, `updateElements`, `toggleElementsVisibility`, `toggleElementsMuted`, `previewElements`, `commitPreview`, `discardPreview`, `getTrackById`, `getElementsWithTracks`, `getPreviewTracks`, `subscribe`, `updateTracks`.
- Preview/commit pattern (lines 702–760): `previewElements({updates})` overlays uncommitted patches; `commitPreview()` rolls them into a single `TracksSnapshotCommand` via `editor.command.push({command})`. **This `push()` method is not in seed spec's CommandManager** — see Q6.

#### `CommandManager` — `apps/web/src/core/managers/commands.ts` (154 LOC) — see also Q6

```ts
// commands.ts:13-19
export class CommandManager {
        public isRippleEnabled = false;
        private history: CommandHistoryEntry[] = [];
        private redoStack: CommandHistoryEntry[] = [];
        private reactors: Array<() => void> = [];
        constructor(private editor: EditorCore) {}
```

Public API (no `beginTransaction`/`endTransaction` — see Q6 for actual grouping):

```ts
// commands.ts:21-37 — main entry point
execute({ command }: { command: Command }): Command

// commands.ts:39-45 — bypasses execute()/undo()/redo() of command; used by commitPreview()
push({ command }: { command: Command }): void

// commands.ts:47-49 — post-command reactor pattern (e.g., empty-track pruning)
registerReactor(reactor: () => void): void

// commands.ts:51-68 — pops history, restores selection snapshot conditionally
undo(): void

// commands.ts:70-91 — re-runs command.redo() (default = execute()), re-applies ripple
redo(): void

// commands.ts:93-99
canUndo(): boolean
canRedo(): boolean

// commands.ts:101-104
clear(): void
```

⚠️ **Notable departures from seed spec's CommandManager sketch:**
- ❌ **No `beginTransaction(label: string)` / `endTransaction()` API**. The seed spec's transaction grouping pattern does not exist in OpenCut-classic. Instead, multi-step atomicity is achieved via `BatchCommand` (`apps/web/src/commands/batch-command.ts`), which wraps multiple `Command` instances — see Q6.
- ❌ **No `getHistory()` method** — there is no public accessor for the history array. Only `canUndo()` and `canRedo()` expose stack state.
- ❌ **No `coalesceKey`** — see Q6.

#### `PlaybackManager` — `apps/web/src/core/managers/playback-manager.ts` (257 LOC)

```ts
// playback-manager.ts:11-26 — uses performance.now(), NOT AudioContext.currentTime
export class PlaybackManager {
        private isPlaying = false;
        private currentTime: MediaTime = ZERO_MEDIA_TIME;
        private volume = 1;
        private muted = false;
        private previousVolume = 1;
        private isScrubbing = false;
        private listeners = new Set<() => void>();
        private updateListeners = new Set<(time: MediaTime) => void>();
        private seekListeners = new Set<(time: MediaTime) => void>();
        private playbackTimer: number | null = null;
        private playbackStartWallTime = 0;
        private playbackStartTime: MediaTime = ZERO_MEDIA_TIME;
        private timelineScopeBound = false;
        constructor(private editor: EditorCore) {}
```

Selected public methods (all single-arg-object — confirms automation-ready ✅):

```ts
// playback-manager.ts:42-55 — restarts at 0 if past end
play(): void
// playback-manager.ts:57-61
pause(): void
// playback-manager.ts:63-69
toggle(): void
// playback-manager.ts:71-79 — clamps to timeline duration; rebases if playing
seek({ time }: { time: MediaTime }): void
// playback-manager.ts:81-89
setVolume({ volume }: { volume: number }): void
// playback-manager.ts:91-104
mute(): void; unmute(): void; toggleMute(): void
// playback-manager.ts:114-128
getIsPlaying(): boolean; getCurrentTime(): MediaTime; getVolume(): number; isMuted(): boolean
// playback-manager.ts:130-137 — scrubbing suppresses audio re-seek
setScrubbing({ isScrubbing }: { isScrubbing: boolean }): void; getIsScrubbing(): boolean
// playback-manager.ts:139-152
subscribe(listener: () => void): () => void
onUpdate(listener: (time: MediaTime) => void): () => void
onSeek(listener: (time: MediaTime) => void): () => void
```

⚠️ **Notable departures from seed spec's PlaybackManager sketch:**
- ❌ **No `setRate(rate: number)` method** — varispeed is not supported by OpenCut-classic's PlaybackManager. The seed spec's "1.0 = normal, 0.5 = half speed, -1.0 = reverse" API does not exist. (We must build this ourselves — see `03-playback-engine.md`.)
- ❌ **No `setLoop(start, end)` method** — looping is not implemented at the manager level. The `actualLastFrame`/`actualFirstFrame` loop logic exists only in FreeCut's `Clock.ts:555-559`, not in OpenCut.
- ❌ **No `getCurrentFrame()` method** — only `getCurrentTime(): MediaTime`. Frame conversion happens via `lastFrameMediaTime({duration, fps})` (used at `timeline-manager.ts:214-219`).
- ❌ **Clock is `performance.now()` + `requestAnimationFrame`, NOT `AudioContext.currentTime`** — see `playback-manager.ts:196-239`:
  ```ts
  // playback-manager.ts:196-204
  private startTimer(): void {
          if (this.playbackTimer) {
                  cancelAnimationFrame(this.playbackTimer);
          }
          this.playbackStartWallTime = performance.now();
          this.playbackStartTime = this.currentTime;
          this.updateTime();
  }
  // playback-manager.ts:213-239 (updateTime = () => {...}) — uses performance.now() delta
  ```
  The seed spec acknowledged this: *"Sub-agent scout to verify the rAF + performance.now() clock — we override with FreeCut's AudioContext.currentTime clock."* ✅ Confirmed: must override. The override target is FreeCut's `Clock.ts` (see Q5).
- ⚠️ **Subscription model is split into three Sets**: `listeners` (state changes), `updateListeners` (per-frame time updates), `seekListeners` (explicit seeks). The seed spec only modeled a single `on(event, cb)` API — actual is `subscribe()`, `onUpdate()`, `onSeek()` (three distinct methods, not a single event emitter).
- ⚠️ **`bindTimelineScope()` is called from `EditorCore` constructor** (`core/index.ts:48`) — this subscribes PlaybackManager to both `timeline.subscribe` and `scenes.subscribe` and reconciles playhead clamp on every change. Seed spec missed this lifecycle hook entirely.

#### `ScenesManager` (note: NOT "SceneManager") — `apps/web/src/core/managers/scenes-manager.ts` (324 LOC)

```ts
// scenes-manager.ts:26-31
export class ScenesManager {
        private active: TScene | null = null;
        private list: TScene[] = [];
        private listeners = new Set<() => void>();
        constructor(private editor: EditorCore) {}
```

Public API:

```ts
// scenes-manager.ts:33-47 — async; uses CreateSceneCommand
async createScene({ name, isMain = false }: { name: string; isMain: boolean }): Promise<string>
// scenes-manager.ts:49-67 — async; uses canDeleteScene() guard + DeleteSceneCommand
async deleteScene({ sceneId }: { sceneId: string }): Promise<void>
// scenes-manager.ts:69-85
async renameScene({ sceneId, name }: { sceneId: string; name: string }): Promise<void>
// scenes-manager.ts:87-111 — does NOT use a command; mutates project.currentSceneId directly
async switchToScene({ sceneId }: { sceneId: string }): Promise<void>
// scenes-manager.ts:113-130 — bookmark ops (also commands)
async toggleBookmark({ time }: { time: MediaTime }): Promise<void>
async removeBookmark({ time }: { time: MediaTime }): Promise<void>
async updateBookmark({ time, updates }: { ... }): Promise<void>
async moveBookmark({ fromTime, toTime }: { ... }): Promise<void>
// scenes-manager.ts:176-196 — loads scenes from storageService.loadProject({id})
async loadProjectScenes({ projectId }: { projectId: string }): Promise<void>
// scenes-manager.ts:198-234 — called by ProjectManager; ensures main scene exists
initializeScenes({ scenes, currentSceneId }: { ... }): void
// scenes-manager.ts:236-240
clearScenes(): void
// scenes-manager.ts:242-255 — throws if no active scene (does NOT return null)
getActiveScene(): TScene
getActiveSceneOrNull(): TScene | null  // line 249
getScenes(): TScene[]                  // line 253
// scenes-manager.ts:257-283 — sets active; also pushes updated scenes back to project
setScenes({ scenes, activeSceneId }: { ... }): void
// scenes-manager.ts:285-288
subscribe(listener: () => void): () => void
// scenes-manager.ts:296-323 — called internally by TimelineManager.updateTracks()
updateSceneTracks({ tracks }: { tracks: SceneTracks }): void
```

⚠️ **Notable departures from seed spec's SceneManager sketch:**
- Class name is `ScenesManager` (plural), not `SceneManager` — every OpenCut-classic reference uses the plural form.
- All command-issuing methods are **`async`**, not sync. The seed spec's `setActive(id)`, `createScene(name)` signatures are wrong — actual signatures return `Promise<void>` / `Promise<string>` and take option objects.
- `getActiveId()` does not exist; use `this.active?.id` via `getActiveSceneOrNull()` and read `.id` on it.
- `subscribe()` returns a cleanup function — matches OpenCut pattern.

#### `MediaManager` — `apps/web/src/core/managers/media-manager.ts` (172 LOC)

```ts
// media-manager.ts:10-15
export class MediaManager {
        private assets: MediaAsset[] = [];
        private isLoading = false;
        private listeners = new Set<() => void>();
        constructor(private editor: EditorCore) {}
```

Public API:

```ts
// media-manager.ts:17-51 — adds asset to in-memory list, persists via storageService.saveMediaAsset
async addMediaAsset({ projectId, asset }: { projectId: string; asset: Omit<MediaAsset, "id"> }): Promise<MediaAsset | null>
// media-manager.ts:53-55
removeMediaAsset({ projectId, id }: { projectId: string; id: string }): void
// media-manager.ts:57-85 — uses BatchCommand if multiple ids
removeMediaAssets({ projectId, ids }: { projectId: string; ids: string[] }): void
// media-manager.ts:87-103
async loadProjectMedia({ projectId }: { projectId: string }): Promise<void>
// media-manager.ts:105-130 — revokes object URLs + clears waveform cache + storageService
async clearProjectMedia({ projectId }: { projectId: string }): Promise<void>
// media-manager.ts:132-147
clearAllAssets(): void
// media-manager.ts:149-155
getAssets(): MediaAsset[]
setAssets({ assets }: { assets: MediaAsset[] }): void
// media-manager.ts:158-160
isLoadingMedia(): boolean
// media-manager.ts:162-165
subscribe(listener: () => void): () => void
```

⚠️ **Notable departures from seed spec's MediaManager sketch:**
- ❌ **No `importFile(file: File): Promise<string>`** — actual is `addMediaAsset({projectId, asset})` and `asset` is `Omit<MediaAsset, "id">` (already-parsed metadata). The file-decoding (mediabunny probing) happens earlier in `media/processing.ts` upstream of `MediaManager` — `MediaManager` itself just persists already-parsed `MediaAsset` records. The seed spec's "`importFile(file): Promise<mediaId>`" is wrong.
- ❌ **No `getMediaInfo(mediaId)` / `getMediaSource(mediaId)` / `listMedia()`** — actual accessors are `getAssets(): MediaAsset[]` (returns whole array) and `setAssets({assets})` (bulk replace). There is no per-id accessor.
- ❌ **No `deleteMedia(mediaId): Promise<void>`** — actual is `removeMediaAsset({projectId, id}): void` (sync, takes projectId too, dispatches a `RemoveMediaAssetCommand`).

#### `ProjectManager` — `apps/web/src/core/managers/project-manager.ts` (707 LOC)

```ts
// project-manager.ts:40-61 — holds active project + savedProjects list + migration state + export state
export class ProjectManager {
        private active: TProject | null = null;
        private savedProjects: TProjectMetadata[] = [];
        private isLoading = true;
        private isInitialized = false;
        private invalidProjectIds = new Set<string>();
        private storageMigrationPromise: Promise<void> | null = null;
        private listeners = new Set<() => void>();
        private migrationState: MigrationState = { ... };
        private exportState: ExportState = { ... };
        private exportCancelRequested = false;
        constructor(private editor: EditorCore) {}
```

Public API (selected — there are more):

```ts
// project-manager.ts:82-126 — creates new project, default scene, saves to storage
async createNewProject({ name }: { name: string }): Promise<string>
// project-manager.ts:128-187 — loads from storageService.loadProject({id}), runs migrations, loads fonts
async loadProject({ id }: { id: string }): Promise<void>
// project-manager.ts:189-210
async saveCurrentProject(): Promise<void>
// project-manager.ts:212-234 — delegates to RendererManager.exportProject()
async export({ options }: { options: ExportOptions }): Promise<ExportResult>
// project-manager.ts:236-238
cancelExport(): void; clearExportState(): void; getExportState(): ExportState
// project-manager.ts:249-274 — loads metadata list
async loadAllProjects(): Promise<void>
// project-manager.ts:276-308
async deleteProjects({ ids }: { ids: string[] }): Promise<void>
// project-manager.ts:310-316
closeProject(): void
// project-manager.ts:318-356
async renameProject({ id, name }: { id: string; name: string }): Promise<void>
// project-manager.ts:504-XXX
ratchetFpsForImportedMedia({ importedAssets }: { importedAssets: MediaAsset[] }): void
// project-manager.ts:594-599 — throws if no active project
getActive(): TProject
getActiveOrNull(): TProject | null  // line 606
// project-manager.ts:628-638
getIsLoading(): boolean; getIsInitialized(): boolean; getMigrationState(): MigrationState
// project-manager.ts:640-643
setActiveProject({ project }: { project: TProject }): void
// project-manager.ts:645-648
subscribe(listener: () => void): () => void
```

⚠️ **Notable departures from seed spec's ProjectManager sketch:**
- ❌ **No `createNew(params: { name, fps, canvasSize })`** — actual is `createNewProject({ name })`. Fps/canvasSize are derived from `DEFAULT_FPS` and `DEFAULT_CANVAS_SIZE` constants inside the method (lines 94–104). The seed spec's parameter object is wrong.
- ❌ **No `saveAs(name: string): Promise<string>`** — actual is `renameProject({id, name})`. There is no separate "save as" flow.
- ❌ **No `exportFCPXML(): Promise<string>`** in ProjectManager — FCPXML export does not exist in OpenCut-classic at all. This is a greenfield addition for our spec.
- ❌ **No `load(id): Promise<void>`** — actual is `loadProject({ id })` (takes option object).
- ✅ Seed spec note about overriding OpenCut-classic's IndexedDB-backed ProjectManager with our own storage layer is correct — `project-manager.ts:11` `import { storageService } from "@/services/storage/service"` confirms OpenCut hardwires to its own storage service. We must NOT inherit this.

#### `RendererManager` — `apps/web/src/core/managers/renderer-manager.ts` (252 LOC)

```ts
// renderer-manager.ts:16-21
export class RendererManager {
        private renderTree: RootNode | null = null;
        private _isDegraded = false;
        private listeners = new Set<() => void>();
        constructor(private editor: EditorCore) {}
```

Public API:

```ts
// renderer-manager.ts:23-31 — isDegraded is a getter; setDegraded is called by editor-provider
get isDegraded(): boolean
setDegraded(degraded: boolean): void
// renderer-manager.ts:33-40 — render tree is set externally (not built here)
setRenderTree({ renderTree }: { renderTree: RootNode | null }): void
getRenderTree(): RootNode | null
// renderer-manager.ts:42-50 — async; downloads PNG via downloadBlob
async saveSnapshot(): Promise<{ success: boolean; error?: string }>
// renderer-manager.ts:52-79 — async; writes to navigator.clipboard if available
async copySnapshot(): Promise<{ success: boolean; error?: string }>
// renderer-manager.ts:141-240 — export pipeline: CanvasRenderer + SceneExporter
async exportProject({
  options, onProgress, onCancel,
}: {
  options: ExportOptions;
  onProgress?: ({ progress }: { progress: number }) => void;
  onCancel?: () => boolean;
}): Promise<ExportResult>
// renderer-manager.ts:242-245
subscribe(listener: () => void): () => void
```

⚠️ **Notable departures from seed spec's RendererManager sketch:**
- ❌ **No `initialize(canvas): Promise<void>`** — actual GPU init happens in `apps/web/src/services/renderer/gpu-renderer.ts:11-24` (`initializeGpuRenderer()`) which is called from `editor-provider.tsx:41` *before* the manager is touched. `RendererManager` itself has no init method. The seed spec's `initialize(canvas: HTMLCanvasElement | OffscreenCanvas)` API does not exist.
- ❌ **No `renderFrame(time: MediaTime): Promise<RenderResult>`** — actual is `saveSnapshot()` and `exportProject()`. Per-frame rendering happens inside `SceneExporter` (called from `exportProject`), not on `RendererManager` directly.
- ❌ **No `resize(width, height)`** — canvas resize is handled elsewhere.
- ✅ `isDegraded()` exists but as a property (`get isDegraded`), with `setDegraded(boolean)` setter.
- ❌ **No `onDeviceLost(cb)`** — there is no device-loss handler. WebGPU/WASM device loss is not handled at the RendererManager level (the seed spec's claim that "GPU device loss is handled via try/catch" is generous; OpenCut-classic relies on the global WASM panic flag at `editor-provider.tsx:68-72`).

#### `SaveManager` — `apps/web/src/core/managers/save-manager.ts` (112 LOC) — **MISSING from seed spec**

```ts
// save-manager.ts:7-23
export class SaveManager {
        private debounceMs: number;
        private isPaused = false;
        private isSaving = false;
        private hasPendingSave = false;
        private saveTimer: ReturnType<typeof setTimeout> | null = null;
        private unsubscribeHandlers: Array<() => void> = [];
        constructor({ editor, debounceMs = 800 }: { editor: EditorCore } & SaveManagerOptions) {}
        private editor: EditorCore;
```

Public API:

```ts
// save-manager.ts:27-38 — subscribes to scenes + timeline for markDirty
start(): void
// save-manager.ts:40-46
stop(): void
// save-manager.ts:48-57
pause(): void; resume(): void
// save-manager.ts:59-63 — force option bypasses pause
markDirty({ force = false }: { force?: boolean } = {}): void
// save-manager.ts:65-68
async flush(): Promise<void>
// save-manager.ts:70-72
getIsDirty(): boolean
```

This is the autosave coordinator. Seed spec missed it entirely.

#### `AudioManager` — `apps/web/src/core/managers/audio-manager.ts` (700 LOC) — **MISSING from seed spec**

```ts
// audio-manager.ts:24-47 — full audio playback scheduling + sink management
export class AudioManager {
        private audioContext: AudioContext | null = null;
        private masterGain: GainNode | null = null;
        private playbackStartTime = 0;
        private playbackStartContextTime = 0;
        private scheduleTimer: number | null = null;
        private lookaheadSeconds = 2;
        private scheduleIntervalMs = 500;
        private clips: AudioClipSource[] = [];
        private sinks = new Map<string, AudioBufferSink>();
        private inputs = new Map<string, Input>();
        private activeClipIds = new Set<string>();
        private clipIterators = new Map<...>();
        private queuedSources = new Set<AudioBufferSourceNode>();
        private preparedClipBuffers = new Map<string, Promise<AudioBuffer | null>>();
        private decodedBuffers = new Map<string, Promise<AudioBuffer | null>>();
        private playbackSessionId = 0;
        private lastIsPlaying = false;
        private lastVolume = 1;
        private playbackLatencyCompensationSeconds = 0;
        private unsubscribers: Array<() => void> = [];
        constructor(private editor: EditorCore) { ... }
```

Subscribes to `playback.subscribe`, `timeline.subscribe`, `media.subscribe`, `playback.onSeek` in its constructor (lines 49-58) — this is where the *actual* audio scheduling lives. FreeCut's `Clock.ts` audio-clock trick belongs here, not on `PlaybackManager`.

⚠️ **This is critically important**: the seed spec assumed `PlaybackManager` owns the audio clock. **It does not.** `PlaybackManager` only tracks media time via `performance.now()` + rAF. Audio scheduling (mediabunny sinks, AudioBufferSourceNode queueing, gain automation, retime/pitch) is delegated entirely to `AudioManager`. When porting FreeCut's audio-clock trick, it must live in our equivalent of `AudioManager`, not `PlaybackManager`.

#### `SelectionManager`, `ClipboardManager`, `DiagnosticsManager` — **MISSING from seed spec**

- `SelectionManager` (195 LOC) — tracks `selectedElements`, `selectedKeyframes`, `keyframeSelectionAnchor`, `selectedMaskPoints`. Snapshot/restore API is consumed by `CommandManager` for selection preservation across undo/redo (`commands.ts:106-119`).
- `ClipboardManager` (82 LOC) — wraps `@/clipboard` module's `copyClipboardEntry()` / `buildPasteClipboardCommand()`. Single `entry: ClipboardEntry | null` slot.
- `DiagnosticsManager` (38 LOC) — registry of runtime checks (`DiagnosticRegistration`) filtered by scope. Called by `registerTranscriptionDiagnostics()` in `EditorCore` constructor (`core/index.ts:47`).

---

### Q3. FreeCut `deps/` contracts

**Directory:** `/tmp/freecut/src/runtime/composition-runtime/deps/` (14 files)
**Status:** ✅ Confirmed — but seed spec's contract list is **partially incorrect** (see below).

Actual file inventory (each contract file is paired with a non-contract wrapper):

| Contract file | Wrapper file | Purpose |
|---|---|---|
| `timeline-contract.ts` (6 LOC) | `timeline.ts` (5 LOC) | Re-exports from `@/features/timeline/utils/source-calculations` + `useGifFrames` |
| `media-library-contract.ts` (6 LOC) | `media-library.ts` (4 LOC) | Re-exports `resolveProxyUrl` from `@/features/media-library/utils/media-resolver` |
| `media-library-store-contract.ts` (6 LOC) | `media-library-store.ts` (5 LOC) | Re-exports `useMediaLibraryStore` |
| `media-library-opfs-contract.ts` (5 LOC) | `media-library-opfs.ts` (5 LOC) | Re-exports `opfsService` |
| `keyframes-contract.ts` (18 LOC) | `keyframes.ts` (5 LOC) | Re-exports 8 named exports (resolveAnimatedTransform, hasKeyframeAnimation, applyMotionModifiers, applyMotionAnimationLayers, resolveAnimatedCrop, getPropertyKeyframes, interpolatePropertyValue, resolveAnimatedTextItem, resolveAnimatedShapeItem) + 1 type |
| `player-contract.ts` (22 LOC) | `player.ts` (5 LOC) | Re-exports AbsoluteFill, Sequence, SequenceContext, interpolate, useSequenceContext, VideoConfigProvider, useVideoConfig, useBridgedCurrentFrame, useBridgedIsPlaying, useClock, useClockFrameSelector, useClockPlaybackRate, useVideoSourcePool, isVideoPoolAbortError |
| `stores-contract.ts` (15 LOC) | `stores.ts` (5 LOC) | Re-exports 9 Zustand store hooks: useMediaLibraryStore, useGizmoStore, useItemGizmoPreview, useCornerPinStore, useMaskEditorStore, usePlaybackStore, useTimelineStore, useCompositionsStore, useDebugStore |

❌ **`gizmo-contract.ts` does NOT exist** — the seed spec listed it. Gizmo state (`useGizmoStore`, `useItemGizmoPreview`, `ItemPropertiesPreview` type) is folded into `stores-contract.ts:7-9` instead:

```ts
// stores-contract.ts:7-9
export { useGizmoStore } from '@/features/preview/stores/gizmo-store'
export { useItemGizmoPreview } from '@/features/preview/stores/use-item-gizmo-preview'
export type { ItemPropertiesPreview } from '@/features/preview/stores/gizmo-store'
```

The pattern is consistent: each `*-contract.ts` is the **only** file in the deps directory that may issue cross-feature imports (e.g., `@/features/...`). Each non-contract wrapper file is just `export * from './<name>-contract'` — a compatibility adapter for legacy import paths.

⚠️ **Mandatory vs optional**: All contracts are mandatory for the composition-runtime — the runtime is configured to import only via these adapters, enforced by `scripts/check-deps-contract-boundaries.mjs` (see Q4).

⚠️ **What the seed spec got right**: the *pattern* is exactly as described — composition-runtime imports contracts, not concrete stores. The seam enables isolation testing and store-swapping.

⚠️ **What the seed spec got wrong**:
1. Listed `gizmo-contract.ts` (does not exist — folded into `stores-contract.ts`).
2. Did not mention the wrapper-file pair pattern (`timeline.ts` re-exports `timeline-contract.ts`).
3. Did not mention that contracts are React hook re-exports, not abstract interfaces. The seed spec's sketch (`export interface Storage { loadProject(...); saveProject(...); }`) is *our invention*, not how FreeCut does it. FreeCut contracts re-export concrete Zustand hooks and named functions, not interface signatures.
4. FreeCut's contracts are feature-side (`src/runtime/composition-runtime/deps/`), not engine-side — they bind the composition-runtime *to* features. This is the opposite polarity from the seed spec's `EngineDeps` injection (engine owns the contracts, adapters plug in). See Q5.

---

### Q4. FreeCut `check-feature-boundaries.mjs`

**Files:**
- `/tmp/freecut/scripts/check-feature-boundaries.mjs` (112 LOC)
- `/tmp/freecut/scripts/check-deps-contract-boundaries.mjs` (125 LOC)
- `/tmp/freecut/scripts/check-deps-wrapper-health.mjs` (142 LOC)
- `/tmp/freecut/scripts/check-feature-edge-budgets.mjs` (138 LOC)
- `/tmp/freecut/scripts/feature-boundary-context.mjs` (24 LOC) — shared helpers

**Status:** ✅ Confirmed. The seed spec said "we will adopt similar enforcement" — these scripts are the template.

#### Rule 1: No direct cross-feature imports outside `deps/` (`check-feature-boundaries.mjs`)

```js
// check-feature-boundaries.mjs:14-23 — derive feature name and detect deps/ paths
function getFeatureNameFromFeatureFile(absolutePath) {
  const relative = relativeToRoot(absolutePath);
  const match = relative.match(/^src\/features\/([^/]+)\//);
  return match?.[1] ?? null;
}

function isFeatureDepsFile(absolutePath) {
  const relative = relativeToRoot(absolutePath);
  return /^src\/features\/[^/]+\/deps\//.test(relative);
}
```

The rule (`check-feature-boundaries.mjs:34-81`):
- For each source file in `src/features/<name>/`, if the file is **NOT** in a `deps/` subdirectory, then every import specifier (alias `@/features/<other>/...` or relative) must resolve to the same feature. Cross-feature imports cause a violation.
- Files inside `deps/` are exempted — they are the designated escape hatch.
- Fix suggestion printed at `check-feature-boundaries.mjs:101-103`: *"route cross-feature dependencies through src/features/<feature>/deps/* adapter modules."*

#### Rule 2: Within `deps/`, cross-feature imports only allowed in `*-contract.ts` (`check-deps-contract-boundaries.mjs`)

```js
// check-deps-contract-boundaries.mjs:16
const CONTRACT_FILE_REGEX = /-contract\.(ts|tsx)$/;
// check-deps-contract-boundaries.mjs:84-94 — non-contract files in deps/ that cross-import are violations
if (file.isContractFile) {
  contractFiles.push(file.relativePath);
} else {
  regularCrossImports.push({ file, depsDir, ownerFeature, targetFeature, specifier });
}
```

The rule:
- Files matching `*-contract.(ts|tsx)` may import from other features — they ARE the contract.
- All other files in `deps/` (the wrapper adapters) must only `export * from './<name>-contract'` — they cannot themselves import cross-feature.
- Fail message (`check-deps-contract-boundaries.mjs:114-116`): *"Fix: move cross-feature imports into *-contract.ts files and re-export from non-contract deps adapters."*

#### Rule 3: Wrapper files must be used (`check-deps-wrapper-health.mjs`)

Detects non-contract wrappers that have zero importers — flags them as unused (with `--fail-on-unused` flag to fail CI). The wrapper detection regex at `check-deps-wrapper-health.mjs:18`:

```js
const WRAPPER_EXPORT_REGEX = /^export\s+\*\s+from\s+["'](\.\/[^"']+-contract(?:\.[a-z]+)?)["'];?$/;
```

#### Rule 4: Edge count budgets (`check-feature-edge-budgets.mjs`)

Each cross-feature dependency edge has an explicit numeric budget. Excerpts from `check-feature-edge-budgets.mjs:11-31`:

```js
const EDGE_BUDGETS = [
  { edge: 'editor -> timeline', maxImports: 73, maxFiles: 11 },
  { edge: 'editor -> preview', maxImports: 16, maxFiles: 2 },
  { edge: 'editor -> media-library', maxImports: 13, maxFiles: 2 },
  { edge: 'preview -> timeline', maxImports: 2, maxFiles: 2 },
  { edge: 'preview -> player', maxImports: 2, maxFiles: 2 },
  { edge: 'timeline -> media-library', maxImports: 16, maxFiles: 7 },
  { edge: 'media-library -> timeline', maxImports: 21, maxFiles: 5 },
  { edge: 'composition-runtime -> player', maxImports: 8, maxFiles: 2 },
];
```

A budget increase requires explicit acknowledgement (comment block in source). This is the **ratchet** that prevents contract sprawl.

**What we should adopt** (per the seed spec's "we will adopt similar enforcement"):
1. ESLint `no-restricted-imports` rule — but FreeCut's enforcement is **a Node script in CI**, not ESLint. The scripts are invoked as standalone executables. We should consider porting this as a pre-commit hook + CI step, NOT relying on ESLint alone.
2. The contract/wrapper pairing pattern.
3. The edge-budget ratchet.

---

### Q5. FreeCut's `EditorCore`-equivalent

**Status:** ✅ Confirmed — FreeCut does NOT have a singleton EditorCore. The "engine" is split across:
1. **Zustand stores** (domain state, in `src/features/<feature>/stores/`)
2. **React contexts/providers** (lifecycle + injection, in `src/runtime/player/` and `src/runtime/composition-runtime/contexts/`)
3. **Headless harness** (non-React entry point, `src/headless/main.ts`, 1292 LOC)

#### Top-level structure of `src/runtime/`

```
src/runtime/
├── player/                       # the "interactive engine"
│   ├── Player.tsx                # React component wrapping <video> + clock
│   ├── clock/
│   │   ├── Clock.ts              # ← THE audio-clock trick lives here (641 LOC)
│   │   ├── ClockBridge.ts        # main-thread ↔ worker bridge
│   │   ├── ClockProvider.tsx     # React context provider
│   │   └── clock-hooks.ts        # useClock, useClockFrameSelector, useClockPlaybackRate
│   ├── composition/              # AbsoluteFill, Sequence, interpolate (Remotion-style API)
│   ├── video/
│   │   ├── VideoSourcePool.ts    # managed <video> element pool
│   │   └── VideoSourcePoolContext.tsx
│   ├── VideoConfigProvider.tsx
│   └── event-emitter.ts, player-emitter.ts
└── composition-runtime/          # the "render engine" — pure composition logic
    ├── deps/                     # ← contract seam (Q3)
    ├── worklets/                 # SoundTouch AudioWorklet processor
    ├── contexts/                 # KeyframesProvider, LiveItemTransformProvider, etc.
    ├── components/               # Item, VideoContent, PitchCorrectedAudio, ...
    ├── utils/                    # video-sync-plan, audio-scene, frame-scene, ...
    ├── compositions/main-composition.tsx
    └── hooks/
```

#### The two entry points

**Interactive (browser):** `src/main.tsx` → `src/app.tsx` (TanStack Router) → `src/routes/editor/$projectId.tsx` → mounts `<Player>` which provides `<ClockProvider>`, `<VideoConfigProvider>`, `<VideoSourcePoolContext>` etc. State lives in `src/features/timeline/stores/*` (domain stores) + `src/shared/state/*` (cross-cutting).

**Headless (render):** `src/headless/main.ts` (loaded by `headless.html` as a separate Vite entry). It does NOT mount React. Instead it exposes a `window.freecut` API (`headless/main.ts:1281-1291`):

```ts
// headless/main.ts:1193-1203
interface FreecutHeadlessApi {
  ready: true
  renderTimeline: typeof renderTimeline
  renderProject: typeof renderProject
  renderFrame: typeof renderFrame
  dumpLayout: typeof dumpLayout
  editProject: typeof editProject
  normalizeProject: typeof normalizeProjectForHeadless
  probeMedia: typeof probeMedia
  createProject: typeof createProjectForHeadless
}

// headless/main.ts:1281-1291
window.freecut = {
  ready: true,
  renderTimeline,
  renderProject,
  renderFrame,
  dumpLayout,
  editProject,
  normalizeProject: normalizeProjectForHeadless,
  probeMedia,
  createProject: createProjectForHeadless,
}
```

The headless entry reuses `renderComposition`, `renderAudioOnly`, `renderSingleFrame` from `@/features/export/utils/canvas-render-orchestrator` (imported at `headless/main.ts:39-43`) — the **same render code path** the editor uses. ✅ This is the WYSIWYG-by-construction pattern our seed spec describes.

#### How FreeCut structures timeline store architecture (vs OpenCut's EditorCore singleton)

OpenCut-classic uses a single `EditorCore` singleton with 12 typed manager properties. FreeCut splits timeline state across **multiple independent Zustand stores**, unified by a facade hook. From `/tmp/freecut/src/features/timeline/stores/timeline-store-facade.ts:1-29`:

```ts
// timeline-store-facade.ts:1-12 (header docstring)
/**
 * Timeline Store Facade
 *
 * Architecture:
 * - Domain stores hold the actual state (items, transitions, keyframes, markers, settings)
 * - Command store handles undo/redo via snapshots
 * - Timeline actions wrap cross-domain operations
 * - This facade combines them into a single unified API
 */

// timeline-store-facade.ts:17-23 (domain store imports)
import { useItemsStore } from './items-store'
import { useTransitionsStore } from './transitions-store'
import { useKeyframesStore } from './keyframes-store'
import { useMarkersStore } from './markers-store'
import { useTimelineSettingsStore } from './timeline-settings-store'
import { useTimelineCommandStore } from './timeline-command-store'
```

The `src/features/timeline/stores/` directory contains **41 domain stores** (counted from LS, non-test `.ts` files directly in the directory) — including `items-store`, `transitions-store`, `keyframes-store`, `markers-store`, `timeline-settings-store`, `timeline-command-store`, `compositions-store`, `composition-navigation-store`, `sequences-store`, `timeline-viewport-store`, `zoom-store`, plus 13 preview stores (`ripple-edit-preview-store`, `rolling-edit-preview-store`, `slip-edit-preview-store`, `slide-edit-preview-store`, etc.) and `timeline-actions.ts` for cross-domain operations. (An additional ~20 test files exist in the same directory and are not counted here.)

FreeCut's **command pattern** lives in `timeline-command-store.ts` (286 LOC) and `commands/types.ts` (53 LOC) — see Q6.

---

### Q6. OpenCut-classic command pattern

**Files:**
- `/tmp/opencut-classic/apps/web/src/commands/base-command.ts` (31 LOC)
- `/tmp/opencut-classic/apps/web/src/commands/batch-command.ts` (39 LOC)
- `/tmp/opencut-classic/apps/web/src/commands/timeline/element/split-elements.ts` (214 LOC) — sample command
- `/tmp/opencut-classic/apps/web/src/core/managers/commands.ts` (154 LOC) — CommandManager

**Status:** ✅ Confirmed — but seed spec's Command structure (immutable `execute(state): SceneState` + `coalesceKey`) is **wrong**.

#### Actual Command base class (`base-command.ts:21-31`)

```ts
// base-command.ts:21-31
export abstract class Command {
        abstract execute(): CommandResult | undefined;

        undo(): void {
                throw new Error("Undo not implemented for this command");
        }

        redo(): CommandResult | undefined {
                return this.execute();
        }
}
```

```ts
// base-command.ts:4-19 — result is a selection patch, NOT new state
export interface CommandResult {
        selection?: EditorSelectionPatch;
}

export function createElementSelectionResult(
        selectedElements: ElementRef[],
): CommandResult {
        return {
                selection: {
                        selectedElements,
                        selectedKeyframes: [],
                        keyframeSelectionAnchor: null,
                        selectedMaskPoints: null,
                },
        };
}
```

⚠️ **Critical departures from seed spec's `Command` interface:**

1. **No `id` field** — there is no `CommandId` type. Commands are not tracked by ID; the `CommandManager.history` array stores `{command, previousSelection, selectionOverride}` (`commands.ts:7-11`).
2. **No `label` field** — commands do not carry human-readable labels at this layer. Labels, if any, are computed externally. (Note: FreeCut's `TimelineCommand` DOES have a `type` + `payload` for label generation — see `commands/labels.ts`.)
3. **`execute()` takes NO arguments** — the seed spec's `execute(state: SceneState): SceneState` is wrong. Commands fetch their own state by calling `EditorCore.getInstance()` *inside* `execute()`. See `split-elements.ts:46`:
   ```ts
   execute(): CommandResult | undefined {
           const editor = EditorCore.getInstance();
           this.savedState = editor.scenes.getActiveScene().tracks;
           // ...mutates tracks...
           editor.timeline.updateTracks(updatedTracks);
           // ...
   }
   ```
4. **State is NOT immutable in the functional sense** — commands capture `savedState` (the prior `SceneTracks`) into a private field on `execute()`, then call `editor.timeline.updateTracks(newTracks)` which mutates the active scene in place. `undo()` swaps back via `editor.timeline.updateTracks(this.savedState)` (`split-elements.ts:208-213`).
5. **`redo()` default is `execute()`** — re-running execute() is idempotent only because commands typically mutate to the same end state (because the savedState captured during execute will be the post-undo state, not the original). Some commands override `redo()` to be safer; `BatchCommand` does (`batch-command.ts:27-38`).
6. ❌ **No `coalesceKey`** — there is no coalescing in `CommandManager`. Consecutive similar commands (e.g., drag frames) are NOT merged. Instead, OpenCut uses the `previewElements({updates})` → `commitPreview()` pattern on `TimelineManager` (lines 706-760): during a drag, no commands are pushed; a single `TracksSnapshotCommand` is pushed at drag end via `command.push({command})`. **This is the actual mechanism for coalescing** — it is done at the manager layer, not the command layer.

#### `BatchCommand` for transaction grouping (`batch-command.ts:1-39`)

```ts
// batch-command.ts:3-6
export class BatchCommand extends Command {
        constructor(private commands: Command[]) {
                super();
        }

        // batch-command.ts:8-19 — execute() runs all, returns last selection result
        execute(): CommandResult | undefined {
                let latestSelectionResult: CommandResult | undefined;
                for (const command of this.commands) {
                        const result = command.execute();
                        if (result?.selection !== undefined) {
                                latestSelectionResult = result;
                        }
                }
                return latestSelectionResult;
        }

        // batch-command.ts:21-25 — undo() in reverse order
        undo(): void {
                for (const command of [...this.commands].reverse()) {
                        command.undo();
                }
        }

        // batch-command.ts:27-38 — redo() runs all forward again
        redo(): CommandResult | undefined {
                let latestSelectionResult: CommandResult | undefined;
                for (const command of this.commands) {
                        const result = command.redo();
                        if (result?.selection !== undefined) {
                                latestSelectionResult = result;
                        }
                }
                return latestSelectionResult;
        }
}
```

⚠️ **This is the actual transaction-grouping pattern** — NOT `beginTransaction(label)` / `endTransaction()` as the seed spec claimed. `TimelineManager` uses `BatchCommand` directly when it needs atomicity (see e.g. `upsertKeyframes` at lines 481-521, `removeKeyframes` at lines 523-590, `MediaManager.removeMediaAssets` at lines 57-85).

#### `SplitElementsCommand` structure (`split-elements.ts:19-214`)

```ts
// split-elements.ts:19-39 — class declaration and fields
export class SplitElementsCommand extends Command {
        private savedState: SceneTracks | null = null;
        private rightSideElements: { trackId: string; elementId: string }[] = [];
        private readonly elements: { trackId: string; elementId: string }[];
        private readonly splitTime: MediaTime;
        private readonly retainSide: "both" | "left" | "right";

        constructor({
                elements,
                splitTime,
                retainSide = "both",
        }: {
                elements: { trackId: string; elementId: string }[];
                splitTime: MediaTime;
                retainSide?: "both" | "left" | "right";
        }) {
                super();
                this.elements = elements;
                this.splitTime = splitTime;
                this.retainSide = retainSide;
        }
```

Sample body of `execute()` showing how it accesses state via the singleton (lines 45-50):

```ts
// split-elements.ts:45-50
execute(): CommandResult | undefined {
        const editor = EditorCore.getInstance();
        this.savedState = editor.scenes.getActiveScene().tracks;
        this.rightSideElements = [];
```

And `undo()` (lines 208-213):

```ts
// split-elements.ts:208-213
undo(): void {
        if (this.savedState) {
                const editor = EditorCore.getInstance();
                editor.timeline.updateTracks(this.savedState);
        }
}
```

**Key design pattern:** each command captures `savedState` on first `execute()`, then swaps it back in `undo()`. There is no `redo()` override — the default `redo() = execute()` works because `savedState` will be the post-undo state. But note: a second `execute()` of the same command instance will **re-capture** `savedState` (overwriting the original), which means redo-after-undo only works if `savedState` was set during the most recent execute() call. This is fragile — `BatchCommand.redo()` explicitly calls `command.redo()` to avoid this pitfall.

#### History management (`commands.ts`)

- **No history limit.** `history: CommandHistoryEntry[]` (`commands.ts:15`) grows unbounded. Compare FreeCut's `timeline-command-store.ts:138-148` which caps at `useSettingsStore.getState().maxUndoHistory` (default value TBD).
- **Redo stack cleared on `execute()`** (`commands.ts:35`): `this.redoStack = [];`.
- **Selection snapshot preservation**: each `CommandHistoryEntry` stores `previousSelection` + optional `selectionOverride` (`commands.ts:7-11`). Undo only restores selection if the command had declared a selection override (lines 60-66):
  ```ts
  // commands.ts:51-68 — undo() with conditional selection restore
  undo(): void {
          if (this.history.length === 0) return;
          const entry = this.history.pop();
          entry?.command.undo();
          if (entry) {
                  if (entry.selectionOverride !== undefined) {
                          this.editor.selection.restoreSnapshot({
                                  snapshot: entry.previousSelection,
                          });
                  }
                  this.redoStack.push(entry);
          }
  }
  ```
- **Reactor pattern** (`commands.ts:47-49`, `121-125`): `registerReactor(fn)` registers a callback fired after every command execute/redo. Used by `EditorCore` constructor (line 49 of `core/index.ts`) to prune empty tracks after every command.

#### Ripple handling

Ripple is **not** a separate command — it is a flag on `CommandManager` (`commands.ts:14` `public isRippleEnabled = false`). When true, `execute()` (line 21-37) and `redo()` (line 70-91) capture `beforeTracks`, run the command, then call `applyRippleIfEnabled({beforeTracks})` which uses `computeRippleAdjustments` + `applyRippleAdjustments` from `@/ripple` (`commands.ts:127-153`). The flag is set externally from `editor-provider.tsx:137`:

```ts
// editor-provider.tsx:136-138
useEffect(() => {
        editor.command.isRippleEnabled = rippleEditingEnabled;
}, [editor, rippleEditingEnabled]);
```

---

### Q7. Initialization error patterns (degraded mode)

**Files:**
- `/tmp/opencut-classic/apps/web/src/components/providers/editor-provider.tsx` (154 LOC)
- `/tmp/opencut-classic/apps/web/src/services/renderer/gpu-renderer.ts` (90 LOC)
- `/tmp/opencut-classic/apps/web/src/editor/editor-store.ts` (24 LOC) — UI-side `isInitializing` flag

**Status:** ✅ Confirmed — degraded mode is a simple boolean flag, not a sophisticated fallback chain.

#### WebGPU/GPU init flow

The provider calls `initializeGpuRenderer()` before loading the project (`editor-provider.tsx:38-48`):

```tsx
// editor-provider.tsx:38-48
const loadProject = async () => {
        try {
                setIsLoading(true);
                await initializeGpuRenderer();
                editor.renderer.setDegraded(!isGpuAvailable());
                await editor.project.loadProject({ id: projectId });

                if (cancelled) return;

                setIsLoading(false);
                loadFontAtlas();
        } catch (err) {
                // ... error handling
        }
};
```

`initializeGpuRenderer()` (`gpu-renderer.ts:11-24`) is a memoized promise that flips a module-level `gpuAvailable` boolean:

```ts
// gpu-renderer.ts:8-28
let gpuAvailable = false;
let initPromise: Promise<void> | null = null;

export function initializeGpuRenderer(): Promise<void> {
        if (!initPromise) {
                initPromise = initializeGpu()
                        .then(() => {
                                gpuAvailable = true;
                        })
                        .catch((error: unknown) => {
                                gpuAvailable = false;
                                const message = error instanceof Error ? error.message : String(error);
                                console.warn(`GPU renderer unavailable: ${message}`);
                        });
        }
        return initPromise;
}

export function isGpuAvailable(): boolean {
        return gpuAvailable;
}
```

**Note:** `initializeGpu` comes from `opencut-wasm` (`gpu-renderer.ts:1-5`). Since our spec rejects opencut-wasm (master spec Decision 3), we must implement our own equivalent: `try { adapter = await navigator.gpu.requestAdapter(); device = await adapter.requestDevice(); } catch { isDegraded = true; }`.

#### Degraded flag propagation

`RendererManager.setDegraded(boolean)` (`renderer-manager.ts:27-31`) sets `_isDegraded` and notifies subscribers. The provider then continues to render — degraded mode in OpenCut-classic means **the WASM effect passes are skipped** (`gpu-renderer.ts:42-44`):

```ts
// gpu-renderer.ts:42-44 (inside applyEffect)
if (passes.length === 0 || !gpuAvailable) {
        return source;
}
```

There is no WebGL2 fallback. ✅ VERIFIED — `DegradedRendererBanner` exists at `apps/web/src/app/editor/[project_id]/page.tsx:60-79` and is rendered at line 46 of the same file. The master spec was correct in its mention of "borrow OpenCut-classic's `DegradedRendererBanner`" — no correction needed. The component reads the `isDegraded` flag via `useEditor((e) => e.renderer.isDegraded)` (the same boolean flag the rest of the editor reads, e.g., at `editor-provider.tsx:42`).

```tsx
// page.tsx:46 (rendered inside EditorProvider, before EditorHeader)
<DegradedRendererBanner />

// page.tsx:60-79
function DegradedRendererBanner() {
        const isDegraded = useEditor((e) => e.renderer.isDegraded);
        const [dismissed, setDismissed] = useState(false);
        if (!isDegraded || dismissed) return null;

        return (
                <div className="bg-accent border-b h-9 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <span>For the best experience, open OpenCut in Chrome.</span>
                        <Button
                                variant="text"
                                size="icon"
                                className="p-0 w-auto [&_svg]:size-3.5"
                                onClick={() => setDismissed(true)}
                                aria-label="Dismiss"
                        >
                                <HugeiconsIcon icon={Cancel01Icon} />
                        </Button>
                </div>
        );
}
```

#### WASM panic handling

If `opencut-wasm` panics during init, it sets `window.__wasmPanic` (read at `editor-provider.tsx:68-72`):

```tsx
// editor-provider.tsx:68-77
const wasmPanic = (window as Window & { __wasmPanic?: string }).__wasmPanic;
if (wasmPanic) {
        delete (window as Window & { __wasmPanic?: string }).__wasmPanic;
        setError(wasmPanic);
} else {
        setError(
                err instanceof Error ? err.message : "Failed to load project",
        );
}
```

#### "Project not found" fallback

If `editor.project.loadProject({id})` throws with "not found" in the message, the provider auto-creates a new "Untitled Project" and redirects (`editor-provider.tsx:52-66`):

```tsx
// editor-provider.tsx:52-66
const isNotFound =
        err instanceof Error &&
        (err.message.includes("not found") ||
                err.message.includes("does not exist"));

if (isNotFound) {
        try {
                const newProjectId = await editor.project.createNewProject({
                        name: "Untitled Project",
                });
                router.replace(`/editor/${newProjectId}`);
        } catch (_createErr) {
                setError("Failed to create project");
                setIsLoading(false);
        }
}
```

#### `beforeunload` dirty-state guard

`EditorRuntimeBindings` (lines 130-154) installs a `beforeunload` handler that prompts the user if `editor.save.getIsDirty()`:

```tsx
// editor-provider.tsx:140-149
useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
                if (!editor.save.getIsDirty()) return;
                event.preventDefault();
                (event as unknown as { returnValue: string }).returnValue = "";
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, [editor]);
```

---

## 8. Test Plan for This Stream

1. **Unit test:** Each manager method has unit tests with mock deps.
2. **Contract test:** Each platform adapter (OPFSStorage, WebCodecsDecoder, etc.) is tested against its interface contract.
3. **Integration test:** `createInteractiveEngine()` boots, loads a sample project, plays 1 second, asserts no errors.
4. **Render entry test:** `createRenderEngine()` boots, renders 10 frames of a sample project, asserts pixels match a reference.
5. **WYSIWYG test:** Same project rendered via both entries — pixel diff must be 0.
6. **Undo/redo test:** Apply 50 random commands, undo all, assert state matches initial.
7. **Boundary lint:** ESLint `no-restricted-imports` catches any engine → UI import. **Refined (SCOUT-01):** Adopt FreeCut's `scripts/check-feature-boundaries.mjs` + `scripts/check-deps-contract-boundaries.mjs` pattern as pre-commit + CI steps — see Q4 above. ESLint alone is insufficient; the contract/wrapper pairing and edge-budget ratchet need bespoke scripts.

---

## 13. Code References (SCOUT-01)

Every file actually read by the scout, with one-line summary. **Repos cloned to:** `/tmp/opencut-classic/` (OpenCut-classic) and `/tmp/freecut/` (FreeCut).

### OpenCut-classic — `/tmp/opencut-classic/`

| File (relative to repo root) | LOC | Summary |
|---|---|---|
| `AGENTS.md` | 23 | High-level architecture notes — `rust/` is single source of truth, `apps/web/` is Next.js UI shell |
| `apps/web/src/core/index.ts` | 81 | **`EditorCore` singleton class** — 12 managers, zero-arg constructor, `getInstance()`/`reset()` |
| `apps/web/src/core/managers/timeline-manager.ts` | 935 | TimelineManager — all element/track mutations, preview/commit, subscribe |
| `apps/web/src/core/managers/commands.ts` | 154 | CommandManager — execute/push/undo/redo, reactor pattern, ripple flag |
| `apps/web/src/core/managers/playback-manager.ts` | 257 | PlaybackManager — `performance.now()` + rAF clock (NOT AudioContext), three listener Sets |
| `apps/web/src/core/managers/scenes-manager.ts` | 324 | ScenesManager (note plural) — async create/delete/rename/switch, bookmarks, scenes persistence |
| `apps/web/src/core/managers/project-manager.ts` | 707 | ProjectManager — create/load/save/rename/delete, migrations, export delegation |
| `apps/web/src/core/managers/media-manager.ts` | 172 | MediaManager — asset list, no per-id accessor, addMediaAsset takes pre-parsed asset |
| `apps/web/src/core/managers/renderer-manager.ts` | 252 | RendererManager — snapshot/export only, no init/renderFrame/resize, isDegraded flag |
| `apps/web/src/core/managers/audio-manager.ts` | 700 | AudioManager — actual AudioContext/sink scheduling, mediabunny Input/AudioBufferSink, retime/pitch |
| `apps/web/src/core/managers/selection-manager.ts` | 195 | SelectionManager — elements/keyframes/mask-points, snapshot/restore for undo/redo |
| `apps/web/src/core/managers/clipboard-manager.ts` | 82 | ClipboardManager — wraps `@/clipboard` copyClipboardEntry/buildPasteClipboardCommand |
| `apps/web/src/core/managers/save-manager.ts` | 112 | SaveManager — debounced (800ms) autosave, subscribes to scenes + timeline, pause/resume |
| `apps/web/src/core/managers/diagnostics-manager.ts` | 38 | DiagnosticsManager — registry of `DiagnosticRegistration` filtered by scope |
| `apps/web/src/commands/base-command.ts` | 31 | `abstract class Command` — `execute(): CommandResult \| undefined`, `undo()` throws, `redo()=execute()` |
| `apps/web/src/commands/batch-command.ts` | 39 | `BatchCommand extends Command` — wraps array, undo runs in reverse, redo runs forward |
| `apps/web/src/commands/index.ts` | 8 | Re-exports Command, BatchCommand, CommandResult + namespaces (timeline/media/scene/project) |
| `apps/web/src/commands/timeline/element/split-elements.ts` | 214 | `SplitElementsCommand` — sample command, captures savedState, retains one or both sides |
| `apps/web/src/components/providers/editor-provider.tsx` | 154 | React provider — calls `initializeGpuRenderer()`, sets degraded flag, handles not-found + WASM panic |
| `apps/web/src/editor/editor-store.ts` | 24 | Zustand store for UI-side `isInitializing`/`isPanelsReady` flags — NOT the EditorCore |
| `apps/web/src/editor/use-editor.ts` | 76 | `useEditor()` hook — `useSyncExternalStore` over all 9 manager `subscribe()` methods + `EditorCore.getInstance()` |
| `apps/web/src/services/renderer/gpu-renderer.ts` | 90 | `initializeGpuRenderer()` from opencut-wasm — memoized promise + `isGpuAvailable()` flag |

### FreeCut — `/tmp/freecut/`

| File (relative to repo root) | LOC | Summary |
|---|---|---|
| `CLAUDE.md` | 19 | Repo conventions — exact-pinned deps, conventional commits, branch strategy |
| `src/runtime/player/clock/Clock.ts` | 641 | `Clock` class — audio-clock trick via `setAudioContext()`, in/out points, varispeed, visibility catchup |
| `src/runtime/composition-runtime/deps/timeline-contract.ts` | 6 | Re-exports from `@/features/timeline/utils/source-calculations` + `useGifFrames` |
| `src/runtime/composition-runtime/deps/timeline.ts` | 5 | Wrapper: `export * from './timeline-contract'` |
| `src/runtime/composition-runtime/deps/media-library-contract.ts` | 6 | Re-exports `resolveProxyUrl` |
| `src/runtime/composition-runtime/deps/media-library.ts` | 4 | Wrapper |
| `src/runtime/composition-runtime/deps/media-library-store-contract.ts` | 6 | Re-exports `useMediaLibraryStore` |
| `src/runtime/composition-runtime/deps/media-library-store.ts` | 5 | Wrapper |
| `src/runtime/composition-runtime/deps/media-library-opfs-contract.ts` | 5 | Re-exports `opfsService` |
| `src/runtime/composition-runtime/deps/media-library-opfs.ts` | 5 | Wrapper |
| `src/runtime/composition-runtime/deps/keyframes-contract.ts` | 18 | Re-exports 8 animated-transform/interpolation functions + 1 type |
| `src/runtime/composition-runtime/deps/keyframes.ts` | 5 | Wrapper |
| `src/runtime/composition-runtime/deps/player-contract.ts` | 22 | Re-exports Remotion-style composition API (AbsoluteFill, Sequence, interpolate) + clock hooks |
| `src/runtime/composition-runtime/deps/player.ts` | 5 | Wrapper |
| `src/runtime/composition-runtime/deps/stores-contract.ts` | 15 | Re-exports 9 Zustand store hooks (incl. gizmo, timeline, compositions, playback, mask-editor, debug) |
| `src/runtime/composition-runtime/deps/stores.ts` | 5 | Wrapper |
| `scripts/check-feature-boundaries.mjs` | 112 | Forbids direct cross-feature imports outside `deps/` subdirectories |
| `scripts/check-deps-contract-boundaries.mjs` | 125 | Forbids cross-feature imports in `deps/` outside `*-contract.(ts\|tsx)` files |
| `scripts/check-deps-wrapper-health.mjs` | 142 | Detects unused non-contract wrapper files (with `--fail-on-unused`) |
| `scripts/check-feature-edge-budgets.mjs` | 138 | Ratchets per-edge import/file budgets to prevent contract sprawl |
| `scripts/feature-boundary-context.mjs` | 24 | Shared helpers: ROOT_DIR, FEATURES_DIR, collectFeatureFiles, relativeToRoot |
| `src/features/timeline/stores/timeline-store-facade.ts` | 358 | Facade combining 6 domain stores + timeline-actions into single `useTimelineStore` hook |
| `src/features/timeline/stores/timeline-store.ts` | 21 | Re-export shim — `useTimelineStore` from facade |
| `src/features/timeline/stores/timeline-command-store.ts` | 286 | Zustand command store — `execute` captures snapshot, undo/redo swap snapshots, per-context history parking |
| `src/features/timeline/stores/commands/types.ts` | 53 | `TimelineSnapshot`, `TimelineCommand` (type+payload, NOT execute/undo), `CommandEntry` |
| `src/features/timeline/stores/items-store.ts` | 960 | Items + tracks Zustand store — source calculations, trim clamping, composition cycles |
| `src/headless/main.ts` | 1292 | Headless entry — `window.freecut = {renderTimeline, renderProject, renderFrame, editProject, ...}` |

---

## 14. Corrections to Seed Spec

Every place where the seed spec's assumption is wrong, missing, or misleading — with the correct information.

### 14.1 EditorCore manager list (§3.2)

**Seed spec claimed (lines 77–84):** 8 managers — `timeline, command, playback, scenes, project, media, renderer, export`.

**Actual (OpenCut-classic `apps/web/src/core/index.ts:19-30`):** **12 managers** — `timeline, command, playback, scenes, project, media, renderer, save, audio, selection, clipboard, diagnostics`. **There is no `ExportManager`.** Export logic lives in `RendererManager.exportProject()` (lines 141–240 of `renderer-manager.ts`).

**Correction:** Adopt the 12-manager list. Decide whether our rebuild keeps `SaveManager` (debounced autosave) or folds it into `ProjectManager`. Decide whether to add a dedicated `ExportManager` for FCPXML/cloud-render orchestration (the seed spec's Q6 implies yes — recommended).

### 14.2 EditorCore constructor signature (§3.2)

**Seed spec claimed (lines 86–96):** `private constructor(deps: EngineDeps)` with manager construction taking specific peer managers (e.g., `new TimelineManager(this.scenes, this.command)`).

**Actual (`apps/web/src/core/index.ts:32`):** `private constructor()` — zero arguments. Every manager is constructed as `new XxxManager(this)` — passing the entire `EditorCore` instance, not specific peers.

**Correction:** Either:
- **Option A (faithful to OpenCut):** Keep `EditorCore` zero-arg, pass `this` to every manager. Manager cross-references go through `this.editor.<peer>`.
- **Option B (cleaner DI, deviates from OpenCut):** Keep seed spec's `EngineDeps` injection but make `EditorCore` itself the deps container. Pass `this` to every manager. Drop the seed spec's claim that "references must be one-directional at construction time" — OpenCut-classic does NOT enforce this, and we should not either (bidirectional refs through the root are fine and simpler).

The seed spec's §3.7 rule 4 ("No circular deps. Managers can hold references to each other... but the references must be one-directional at construction time. Enforced by `madge` in CI.") is **not how OpenCut-classic does it**. Bidirectional access via the root `EditorCore` instance is the actual pattern.

### 14.3 `getInstance()` signature (§3.2)

**Seed spec claimed (lines 98–104):** `static getInstance(deps?: EngineDeps): EditorCore` — requires deps on first init.

**Actual (`apps/web/src/core/index.ts:71-76`):** `static getInstance(): EditorCore` — no args. Relies on side-effectful imports (`storageService`, `initializeGpuRenderer`, `registerDefaultEffects`, `registerDefaultMasks`, `registerTranscriptionDiagnostics`) which are NOT injected.

**Correction:** For our rebuild, we DO want DI (seed spec's instinct is correct for testability and headless render). But we must NOT pretend OpenCut-classic does this — it does not. Our `getInstance(deps)` will be a deliberate deviation. Document this deviation in the implementation.

### 14.4 SceneManager name and method signatures (§3.3)

**Seed spec claimed (lines 178–191):** Class name `SceneManager`; sync methods `setActive(id)`, `createScene(name)`, `deleteScene(id)`, `listScenes()`.

**Actual (`scenes-manager.ts`):** Class name is **`ScenesManager`** (plural). All command-issuing methods are **`async`** (`createScene`, `deleteScene`, `renameScene`, `switchToScene`, bookmark ops). Signatures take option objects: `createScene({name, isMain}): Promise<string>`, `switchToScene({sceneId}): Promise<void>`. No `setActive()` (use `switchToScene`). No `listScenes()` (use `getScenes(): TScene[]`). No `getActiveId()` (use `getActiveSceneOrNull()?.id`).

**Correction:** Rename to `ScenesManager`. Make command methods async. Drop `setActive`/`createScene(name)`/`deleteScene(id)`/`listScenes` from the API. Add `switchToScene`, `getActiveScene()`, `getActiveSceneOrNull()`, `getScenes()`.

### 14.5 TimelineManager method names (§3.3)

**Seed spec claimed (lines 119–138):** `split(params)`, `trim(params)`, `move(params)`, `ripple(params)`, `roll(params)`, `slip(params)`, `slide(params)`, `delete(params)`, `getElement(id)`, `getElementsAtTime(time, trackId?)`, `getTrack(trackId)`, `getTotalDuration()`, `getFrameAtTime(time)`.

**Actual:** Only `getTotalDuration()` matches. Real names: `splitElements({elements, splitTime, retainSide})`, `updateElementTrim({elementId, trimStart, trimEnd, ...})`, `moveElements({moves, createTracks})`, `deleteElements({elements})`. **No ripple/roll/slip/slide methods on TimelineManager** — those NLE ops are implemented as op modules (see `06-nle-ops.md`) and dispatched via `updateElements` or `BatchCommand`. `getElement(id)` → `getElementByRef({trackId, elementId})` (private). `getTrack(trackId)` → `getTrackById({trackId})`. `getFrameAtTime(time)` → does not exist; use `lastFrameMediaTime({duration, fps})` from `@/wasm`.

**Correction:** Adopt actual method names. Move `ripple/roll/slip/slide` into op modules (`src/engine/ops/`), not `TimelineManager`. Document the `previewElements` → `commitPreview` → `discardPreview` pattern that replaces the seed spec's `coalesceKey`.

### 14.6 CommandManager API (§3.3 + §4)

**Seed spec claimed (lines 142–155, 437–447):** `execute(command)`, `undo()`, `redo()`, `canUndo()`, `canRedo()`, `getHistory()`, `beginTransaction(label)`, `endTransaction()`, plus `Command` has `id`, `label`, `execute(state): state`, `undo(state): state`, `coalesceKey`.

**Actual (`commands.ts`):** No `getHistory()`. No `beginTransaction`/`endTransaction` — instead `BatchCommand` wraps an array. No `Command.id`. No `Command.label`. No `Command.coalesceKey`. `execute()` takes no state arg — commands call `EditorCore.getInstance()` themselves and mutate via `editor.timeline.updateTracks()`. Coalescing is done at the manager layer via `previewElements`/`commitPreview`, NOT in CommandManager.

**Correction:** Adopt `BatchCommand` for transaction grouping. Drop `getHistory()`. Drop `coalesceKey`. Implement coalescing via manager-layer preview/commit pattern. Make `Command.execute()` parameterless (it pulls state from the singleton). Document this tradeoff (less testable in isolation, simpler API).

### 14.7 PlaybackManager clock and API (§3.3 + §3.6)

**Seed spec claimed:** `setRate(rate)` for varispeed, `setLoop(start, end)`, `getCurrentFrame()`, `on(event, cb)` single-emitter API, and (acknowledged in §3.3 footnote) `rAF + performance.now()` clock to be overridden with FreeCut's `AudioContext.currentTime`.

**Actual (`playback-manager.ts`):** No `setRate`. No `setLoop`. No `getCurrentFrame`. Three separate subscription methods (`subscribe`, `onUpdate`, `onSeek`). Clock confirmed as `performance.now()` + `requestAnimationFrame`. Audio scheduling lives in `AudioManager` (which the seed spec missed entirely).

**Correction:** Add `setRate`, `setLoop`, `getCurrentFrame` to our rebuild (these are needed for our scope). Port FreeCut's `Clock.ts` (`setAudioContext`, `_now()` audio-clock trick at lines 491–507) into our `AudioManager`, not `PlaybackManager`. `PlaybackManager` should own only the rAF/UI-tick layer; `AudioManager` owns the audio-grounded clock. Add `AudioManager` to the manager list (was missing). Split subscription into three methods.

### 14.8 MediaManager API (§3.3)

**Seed spec claimed (lines 194–203):** `importFile(file): Promise<mediaId>`, `getMediaInfo(mediaId)`, `getMediaSource(mediaId)`, `deleteMedia(mediaId)`, `listMedia()`.

**Actual:** `addMediaAsset({projectId, asset}): Promise<MediaAsset | null>` — takes already-parsed `MediaAsset`, not a raw `File`. `removeMediaAsset({projectId, id}): void`. `getAssets(): MediaAsset[]` (whole array). `setAssets({assets})`. No per-id accessor. No `importFile` — file probing happens in `media/processing.ts` upstream.

**Correction:** Our `MediaManager` should expose `importFile(file): Promise<mediaId>` (we want the high-level API) but internally delegate probing to a separate `MediaProcessor` service (OpenCut-classic's `media/processing.ts` pattern). Keep `getAssets()` bulk accessor. Drop `getMediaInfo`/`getMediaSource` per-id lookups — components select from `getAssets()`.

### 14.9 ProjectManager API (§3.3)

**Seed spec claimed (lines 205–215):** `createNew({name, fps, canvasSize})`, `load(id)`, `save()`, `saveAs(name)`, `exportFCPXML()`, `close()`.

**Actual:** `createNewProject({name})` (fps/canvasSize from constants). `loadProject({id})`. `saveCurrentProject()`. `renameProject({id, name})` (no saveAs). `closeProject()`. `export({options})` — no FCPXML in OpenCut-classic at all. `subscribe()`.

**Correction:** Our rebuild keeps the seed spec's intent (FCPXML export, saveAs) but adopts OpenCut's actual method names where reasonable: `createNewProject`, `loadProject`, `saveCurrentProject`, `closeProject`. Add `exportFCPXML()` as greenfield (no OpenCut reference). Add `saveAs(name)` as greenfield (no OpenCut reference). Override storage layer with our own (OpenCut's `storageService` IndexedDB-hardwired pattern is what we're explicitly rejecting per Decision 1 of master spec).

### 14.10 RendererManager API (§3.3)

**Seed spec claimed (lines 219–228):** `initialize(canvas): Promise<void>`, `renderFrame(time): Promise<RenderResult>`, `resize(width, height)`, `isDegraded()`, `onDeviceLost(cb)`.

**Actual:** `setRenderTree({renderTree})` (set externally). `getRenderTree()`. `saveSnapshot()`. `copySnapshot()`. `exportProject({options, onProgress, onCancel})`. `get isDegraded`. `setDegraded(degraded)`. `subscribe()`. No `initialize`. No `renderFrame`. No `resize`. No `onDeviceLost`.

**Correction:** GPU initialization moves to a `gpu-renderer.ts` module (OpenCut-classic's pattern). `RendererManager` exposes `setRenderTree` + `exportProject` + snapshot helpers. We must add `renderFrame(time): Promise<RenderResult>` as greenfield (needed for both interactive rAF and cloud render). We must add `initialize(canvas)` as greenfield (engine-side ownership of canvas + device). `onDeviceLost(cb)` is greenfield (OpenCut has no equivalent).

### 14.11 ExportManager (§3.3)

**Seed spec claimed (lines 230–237):** `ExportManager` interface with `exportFCPXML()` and (Phase 2) `requestCloudRender(params)`.

**Actual (OpenCut-classic):** No `ExportManager` class exists. Export is inline in `RendererManager.exportProject()` (which is video/MP4 export, not FCPXML).

**Correction:** `ExportManager` is greenfield for our rebuild. Two distinct responsibilities: (a) FCPXML export (pure JSON→XML, no rendering), (b) cloud render request orchestration (Phase 2, delegates to headless render entry point). OpenCut-classic is no use as a reference for this manager — design from scratch.

### 14.12 FreeCut deps/ contracts (§3.5)

**Seed spec claimed (lines 257–263):** 6 contract files including `gizmo-contract.ts`.

**Actual:** 7 contract files; no `gizmo-contract.ts` (gizmo state lives in `stores-contract.ts`). Each contract file is paired with a non-contract wrapper file (e.g., `timeline.ts` re-exports `timeline-contract.ts`). Contracts are React hook re-exports, not interface signatures.

**Correction:** Drop `gizmo-contract.ts` from the seed spec's list. Add the wrapper-file pairing pattern. Note that FreeCut's contracts are feature-side (composition-runtime imports features) — opposite polarity from the seed spec's `EngineDeps` injection. Our rebuild should adopt the seed spec's polarity (engine owns contracts, adapters plug in) but borrow FreeCut's enforcement scripts.

### 14.13 EngineDeps vs side-effectful imports (§3.5 + §5.1)

**Seed spec claimed (lines 481–492):** `EngineDeps { storage, decoder, renderer, audio, clock, workerPool }` interface, both entry points construct `EngineDeps` with adapter implementations.

**Actual (OpenCut-classic):** No `EngineDeps` interface. `EditorCore` relies on side-effectful imports: `import { storageService } from "@/services/storage/service"` (in `project-manager.ts:11`, `media-manager.ts:4`, `scenes-manager.ts:3`); `import { initializeGpuRenderer, isGpuAvailable } from "@/services/renderer/gpu-renderer"` (in `editor-provider.tsx:13-16`); `import { registerDefaultEffects } from "@/effects"` (in `core/index.ts:13`). No DI container.

**Correction:** This is a deliberate deviation. The seed spec's `EngineDeps` is OUR invention (good for testability + headless render). Document this as a deviation. Implement `EngineDeps` injection in `createInteractiveEngine()` and `createRenderEngine()`. Pass `deps` to `EditorCore.getInstance(deps)` (which the seed spec sketches correctly). The actual OpenCut pattern of side-effectful imports is what we are explicitly rejecting.

### 14.14 Two entry points (§3.6)

**Seed spec claimed (lines 324–413):** `createInteractiveEngine(opts)` and `createRenderEngine(opts)` — both call `EditorCore.getInstance(deps)`.

**Actual (FreeCut):** Two entry points exist:
- Interactive: `src/main.tsx` → React Router → `<Player>` React component (no `createInteractiveEngine` factory)
- Headless: `src/headless/main.ts` (loaded by `headless.html` as separate Vite entry) → exposes `window.freecut` API with `renderTimeline`, `renderProject`, `renderFrame`, `editProject`, `normalizeProject`, `probeMedia`, `createProject`. Does NOT use `EditorCore` (FreeCut has no equivalent). Reuses `renderComposition`, `renderAudioOnly`, `renderSingleFrame` from `@/features/export/utils/canvas-render-orchestrator` — same code path as editor.

**Actual (OpenCut-classic):** Single entry point — no headless mode. No `createRenderEngine`. Export is `RendererManager.exportProject()` which uses a synchronous `for` loop (master spec Decision 1 calls this out).

**Correction:** Our `createInteractiveEngine()` and `createRenderEngine()` are greenfield designs. FreeCut's `headless/main.ts` is the WYSIWYG-by-construction reference (same render code path). OpenCut-classic is NOT a reference for two-entry-point pattern.

### 14.15 Initialization error patterns (§5.3 + §3.3 RendererManager)

**Seed spec claimed (§5.3 lines 514–520):** "Adapter initialization failures (e.g., WebGPU not available) → degrade gracefully, show banner", "Render errors (e.g., device lost) → show 'renderer lost, please reload' UI".

**Actual (OpenCut-classic `editor-provider.tsx:38-83` + `gpu-renderer.ts:11-28` + `apps/web/src/app/editor/[project_id]/page.tsx:60-79`):** `initializeGpuRenderer()` returns a memoized promise that flips `gpuAvailable = false` on rejection (with `console.warn`), then continues. `editor.renderer.setDegraded(!isGpuAvailable())` sets the flag. ✅ VERIFIED — `DegradedRendererBanner` exists at `apps/web/src/app/editor/[project_id]/page.tsx:60-79` and is rendered at line 46 of the same file. The master spec was correct — borrow OpenCut-classic's `DegradedRendererBanner` component directly. Components read `useEditor((e) => e.renderer.isDegraded)` and the banner component decides what (and whether) to render. There is **no `onDeviceLost` callback** — WASM panics are caught by a global `window.__wasmPanic` flag (lines 68-72 of editor-provider.tsx). Project-not-found errors auto-create a new "Untitled Project" (lines 52-66).

**Correction:** Keep the "DegradedRendererBanner" reference. Borrow the existing OpenCut-classic component at `page.tsx:60-79` (renders a dismissible "For the best experience, open OpenCut in Chrome" banner when `isDegraded` is true). Implement degraded mode as a boolean flag + UI-side conditional rendering, with the banner as the canonical pattern. Implement `onDeviceLost` as greenfield (OpenCut has no equivalent). Adopt OpenCut's "not found → auto-create untitled project" recovery flow as a fallback pattern.

### 14.16 Lint enforcement (§3.7)

**Seed spec claimed (lines 417–427):** "Enforced by lint (adapt FreeCut's `check-feature-boundaries.mjs` pattern)" + "ESLint rule `no-restricted-imports`" + "Enforced by `madge` in CI".

**Actual (FreeCut):** Boundary enforcement is via **standalone Node scripts** (`scripts/check-feature-boundaries.mjs`, `scripts/check-deps-contract-boundaries.mjs`, `scripts/check-deps-wrapper-health.mjs`, `scripts/check-feature-edge-budgets.mjs`) invoked from CI. ESLint `no-restricted-imports` is NOT the primary mechanism. `madge` is not mentioned in the FreeCut scripts directory. The contract/wrapper pairing + edge-budget ratchet are the actual enforcement.

**Correction:** Port FreeCut's standalone scripts as pre-commit hooks + CI steps. Do NOT rely on ESLint alone. Add edge-budget ratchets from day one (start at 0 and grow). Drop the `madge` reference unless we add it as a separate circular-dep check (FreeCut does not).

### 14.17 Manager initialization order (§3.4)

**Seed spec claimed (lines 241–251):** 9-step order: CommandManager → SceneManager → TimelineManager → MediaManager → RendererManager → PlaybackManager → ProjectManager → ExportManager.

**Actual (`apps/web/src/core/index.ts:32-69`):** 12-step order:
1. `registerDefaultEffects()` (side effect, not a manager)
2. `registerDefaultMasks()` (side effect, not a manager)
3. `CommandManager`
4. `TimelineManager`
5. `PlaybackManager`
6. `ScenesManager`
7. `ProjectManager`
8. `MediaManager`
9. `RendererManager`
10. `SaveManager`
11. `AudioManager`
12. `SelectionManager`
13. `ClipboardManager`
14. `DiagnosticsManager`
15. `registerTranscriptionDiagnostics({diagnostics})` (side effect)
16. `this.playback.bindTimelineScope()` (post-construction wiring)
17. `this.command.registerReactor(...)` (empty-track pruning)
18. `this.save.start()` (begin autosave loop)

**Correction:** Adopt actual order. Note that `TimelineManager` is constructed BEFORE `ScenesManager` — seed spec's claim that TimelineManager depends on SceneManager at construction is wrong (both just hold a back-reference to `this`, so order doesn't matter for construction, only for runtime access). Post-construction wiring (`bindTimelineScope`, `registerReactor`, `save.start`) is critical and seed spec missed it entirely.

---

## Testing

> See `17-test-plan.md` for the overall methodology, test matrix, and
> per-module template. Matrix row: "Undo/redo", "Project save/load",
> "Worker lifecycle" (per `17-test-plan.md` §14.2). This section lists the
> specific tests for the core engine module.

### Tier 1: Pure engine tests

[Filename: `tests/unit/01-core-engine/*.test.ts`]

- `editor-core-get-instance-is-singleton` — two consecutive `EditorCore.getInstance(deps)` calls return the same object reference; `getInstance()` ignores a second `deps` argument after first init (first-write-wins)
- `editor-core-reset-clears-instance` — after `EditorCore.reset()`, the next `getInstance(deps)` returns a fresh instance with empty `command.history`, re-initialized managers, and zero `EngineEvent` subscribers
- `all-12-managers-initialized-in-correct-order` — with mock spies on each manager constructor, the construction order is exactly: CommandManager → TimelineManager → PlaybackManager → ScenesManager → ProjectManager → MediaManager → RendererManager → SaveManager → AudioManager → SelectionManager → ClipboardManager → DiagnosticsManager (matches §3.4 / §14.17)
- `command-apply-dispatches-to-correct-manager-method` — for each of the 73 `EngineCommand` variants in spec 15 §4.1, `engine.command.apply(cmd)` invokes exactly the manager method mapped in spec 15 §4.2 (verified via spy), passing `params` through unchanged
- `batch-command-rolls-back-on-subcommand-failure` — `BatchCommand([a, b, c])` where `b` returns `CommandResult.ok === false` leaves `SceneState` byte-identical to pre-batch state; `a`'s mutations are reverted; `c` is never executed; undo stack is unchanged
- `tracks-snapshot-command-coalesces-preview-sequence` — `previewElements()` called 10 times then `commitPreview()` pushes exactly one `TracksSnapshotCommand` onto the undo stack (matches §4.3 preview/commit pattern; replaces seed spec's `coalesceKey`)
- `undo-then-redo-restores-state` — for any single command, `apply(cmd); command.undo(); command.redo()` produces `SceneState` deep-equal to the post-`apply` state (verifies `BatchCommand.redo()` forward-order override at `batch-command.ts:27-38`)
- `fifty-random-commands-then-all-undo-restores-initial-state` — apply 50 random (valid) `EngineCommand`s, then call `command.undo()` 50 times; assert the resulting `SceneState` is deep-equal to the initial snapshot
- `engine-command-zod-schema-rejects-invalid-inputs` — `apply()` rejects: (a) unknown `type` discriminator; (b) missing required `params`; (c) wrong param type (`splitTime: "foo"` instead of `MediaTime`); (d) extra unknown params; (e) `params` shape correct but enum value out of range (`retainSide: 'middle'`)
- `command-result-ok-false-for-constraint-violations` — `apply()` returns `CommandResult.ok === false` with a structured error code for: trim beyond source bounds, overlap-insertion rejected, locked-track modification attempted (`ToggleTrackLockCommand` set on target), split inside transition overlap zone, slip on element without explicit source bounds
- `engine-event-stream-emits-correct-event-per-command-type` — for each command variant applied, the `EngineEvent` stream (spec 15 §8) emits exactly one matching `commandApplied` event with the correct `{ command, result }` payload; no spurious events, no missing events
- `protocol-version-v1-command-rejected-by-v2-engine-and-vice-versa` — a wire envelope with `protocolVersion: { major: 1, minor: 0 }` sent to an engine built at `{ major: 2, minor: 0 }` is rejected by the envelope validator before dispatch; symmetric case (v2 envelope → v1 engine) also rejected

### Tier 2: Render tests

[Filename: `tests/integration/01-core-engine/*.render.test.ts`]

Core-engine Tier 2 tests are deliberately narrow: per-frame renderer correctness is verified in spec 04, and per-op output diff is verified in spec 06. Here we only verify the two-entry-point contract (Decision 6 of `00-master-spec.md`).

- `load-minimal-project-renders-frame-0-non-blank` — `engine.project.loadFromJSON('tests/fixtures/projects/minimal.json')` then `engine.renderer.renderFrame(0)` produces a canvas with ≥1% non-background pixels (sanity: the pipeline produces *something*)
- `interactive-vs-render-engine-produce-identical-state` — load the same project via `createInteractiveEngine()` and `createRenderEngine()`; apply the same `EngineCommand[]` sequence to both; assert both resulting `SceneState`s are deep-equal (state WYSIWYG)
- `renderframe-is-pure-in-state` — for the same `SceneState` S, `engine.renderer.renderFrame(n)` produces pixel-identical output across two engine instances with different `EngineDeps` (no hidden mutable state in the render path)

### Tier 3: UI tests

[Filename: `tests/integration/01-core-engine/*.ui.test.ts`]

These tests verify the UI translation layer (spec 16 → spec 15 `EngineCommand`). They use Playwright with `page.keyboard.press()` and assert the resulting `SceneState` matches the direct `engine.command.apply()` path (state WYSIWYG, see `17-test-plan.md` §6.1).

- `keyboard-cmd-z-invokes-undo` — `page.keyboard.press('Meta+z')` issues `{ type: 'undo' }` to `engine.command.apply()`; resulting state matches a direct `engine.command.undo()` call (state diff via spy)
- `keyboard-cmd-shift-z-invokes-redo` — `page.keyboard.press('Meta+Shift+z')` issues `{ type: 'redo' }` to `engine.command.apply()`; resulting state matches a direct `engine.command.redo()` call (note: spec 16 maps `Cmd+Shift+Z` to redo on macOS, `Ctrl+Y` on Windows — test both)
- `engine-events-propagate-to-zustand-store` — after `engine.command.apply({ type: 'split', params: { time: <currentTime>, trackIds: null } })`, the `EngineEvent` stream fires `commandApplied`; the Zustand store subscribed via `useEditor()` (spec 01 §10.4) updates; React re-renders the timeline component with the new track-element count
- `state-wysiwyg-keyboard-split-equals-direct-apply` — `page.keyboard.press('Meta+b')` (spec 16 §3, "Split at playhead — focused track") produces `SceneState` deep-equal to `engine.command.apply({ type: 'split', params: { time: <currentTime>, trackIds: null } })`

### Property-based tests

[Filename: `tests/unit/01-core-engine/*.property.test.ts`]

- `undo-is-involutive` — `fc.assert(fc.property(arbitraryCommand, arbitraryState, (cmd, state) => { const before = structuredClone(state); apply(cmd, state); applyUndo(cmd, state); expect(state).toEqual(before); }), { numRuns: 1000 })` — for any command and any state, applying then undoing returns to the original state byte-for-byte (matrix row: Undo/redo)
- `command-exhaustiveness-at-compile-time` — `switch(cmd.type)` over all 73 `EngineCommand` variants has no `default` case; the trailing `const _: never = cmd;` assertion makes adding a new variant without a dispatch arm a compile error (TypeScript exhaustiveness check) — verified by `tsc --noEmit` failing if any variant is unhandled
- `manager-initialization-is-acyclic` — `fc.assert(fc.property(arbitraryManagerSubset, (subset) => madge(subset).cycles().length === 0), { numRuns: 100 })` — for any subset of the 12 managers, no constructor references another manager that has not yet been assigned; enforced via `madge` in CI (per §3.7 lint enforcement)

### Test assets

- `tests/fixtures/projects/minimal.json` — 1 scene, 1 track, 1 clip; boot smoke test for both `createInteractiveEngine()` and `createRenderEngine()`
- `tests/fixtures/projects/all-element-types.json` — video, audio, text, image, shape, adjustment elements on separate tracks; used by the dispatch-exhaustiveness and `EngineEvent`-stream tests
- `tests/fixtures/mocks/mock-storage.ts` — `MockStorage` implementing `StorageAdapter` (in-memory `Map<projectId, ProjectJSON>`); never touches OPFS
- `tests/fixtures/mocks/mock-decoder.ts` — `MockDecoder` returning synthetic `VideoFrame`/`AudioData` (solid color + sine tone) without invoking WebCodecs
- `tests/fixtures/mocks/mock-renderer.ts` — `MockRenderer` recording every `renderFrame(n)` call with its `SceneState` argument; used by the state-WYSIWYG assertions
- `tests/fixtures/mocks/mock-audio.ts` — `MockAudio` (no-op `AudioContext` shim); avoids creating real audio hardware streams in unit tests
- `tests/fixtures/mocks/mock-clock.ts` — `MockClock` with deterministic `currentTime` stepping; guarantees no wall-clock dependency in the command-application path (spec 15 §9.2)
- `tests/fixtures/mocks/mock-worker-pool.ts` — `MockWorkerPool` running "worker" tasks synchronously in-process; lets Tier 1 tests run without spawning real `Worker`s

### Test commands

```bash
# Run Tier 1 tests for core engine
npm test -- --filter "01-core-engine"

# Run Tier 2 (render) tests for core engine
npm run test:render -- --filter "01-core-engine"

# Run Tier 3 (UI) tests for core engine
npm run test:ui -- --filter "01-core-engine"

# Run property tests for core engine
npm run test:property -- --filter "01-core-engine"

# Run all tiers for core engine
npm run test:all -- --filter "01-core-engine"

# Regenerate reference PNGs for core engine fixtures (minimal / all-element-types)
npm run regen-references -- --filter "01-core-engine"
```

---

**End of `01-core-engine.refined.md`.** Next: `02-workers-threading.md`.
