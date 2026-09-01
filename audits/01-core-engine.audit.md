# Audit Report: 01-core-engine.refined.md

**Auditor:** general-purpose
**Date:** 2026-08-22
**Spec under audit:** /home/z/my-project/download/nle-spec/01-core-engine.refined.md
**Scout:** SCOUT-01

## Summary

- Total claims spot-checked: 15 (with several sub-checks underneath)
- Verified accurate: 13
- Verified inaccurate: 1 (CRITICAL — `DegradedRendererBanner` claim is wrong)
- Could not verify (file not found, etc.): 0
- Minor issues: 6 (mostly systematic off-by-one LOC counts)

## Verdict: ⚠️ NEEDS REVISION

One CRITICAL issue must be fixed before this spec is used as a reference for implementation: the spec claims `DegradedRendererBanner` does not exist in OpenCut-classic when in fact it does. The master spec was correct; the refined spec's "correction" of the master spec is itself a fabrication.

A second MAJOR issue (incorrect file count for FreeCut's `src/features/timeline/stores/`) is annoying but does not lead to wrong architectural decisions.

Otherwise, the spec is overwhelmingly accurate: source-code quotes match, line numbers are correct, and the architectural corrections (12 managers, zero-arg constructor, `ScenesManager` plural, `performance.now()` clock, missing `id`/`label`/`coalesceKey`, FreeCut `deps/` pattern, headless entry reusing render code path) are all verified true against the source.

---

## Spot-check results

### Check 1: "EditorCore has 12 managers, not 8"

- **Claim (spec Q1, line 700):** "12 managers, not 8. Seed spec listed 8 (`timeline/command/playback/scenes/project/media/renderer/export`). Actual list: `timeline, command, playback, scenes, project, media, renderer, save, audio, selection, clipboard, diagnostics`. There is **no `ExportManager`** in OpenCut-classic."
- **Source:** `/tmp/opencut-classic/apps/web/src/core/index.ts:17-30`
- **Actual:** Class declaration at lines 17-30 lists exactly 12 `public readonly` manager fields:
  ```ts
  // apps/web/src/core/index.ts:17-30
  export class EditorCore {
      private static instance: EditorCore | null = null;
      public readonly timeline: TimelineManager;
      public readonly command: CommandManager;
      public readonly playback: PlaybackManager;
      public readonly scenes: ScenesManager;
      public readonly project: ProjectManager;
      public readonly media: MediaManager;
      public readonly renderer: RendererManager;
      public readonly save: SaveManager;
      public readonly audio: AudioManager;
      public readonly selection: SelectionManager;
      public readonly clipboard: ClipboardManager;
      public readonly diagnostics: DiagnosticsManager;
  ```
  Confirmed via `Glob` + `Grep` that no `ExportManager` class exists anywhere in `/tmp/opencut-classic/apps/web/src`.
- **Verdict:** ✅ ACCURATE
- **Notes:** 12 managers confirmed exactly as the spec lists. `ExportManager` confirmed absent.

### Check 2: "EditorCore constructor takes zero arguments"

- **Claim (spec Q1, lines 645-681; §14.2 lines 1779-1789):** "`private constructor()` — zero arguments. Every manager is constructed as `new XxxManager(this)` — passing the entire `EditorCore` instance, not specific peers."
- **Source:** `/tmp/opencut-classic/apps/web/src/core/index.ts:32-46`
- **Actual:** Constructor body (lines 32-69) takes no parameters and constructs all 12 managers with `new XxxManager(this)`:
  ```ts
  // apps/web/src/core/index.ts:32-46
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
  ```
  Note: `SaveManager` is constructed as `new SaveManager({ editor: this })` (option object), not `new SaveManager(this)`. Spec's generalization "Every manager is constructed as `new XxxManager(this)`" is slightly off — 11 of 12 follow the pattern, but SaveManager takes an options object.
- **Verdict:** ✅ ACCURATE (with one minor exception noted)
- **Notes:** Zero-arg constructor confirmed. `SaveManager` is constructed with `{ editor: this }` options object, not `this` directly — minor inaccuracy in the spec's generalization, but the spec's quoted constructor code (line 655) does correctly show `this.save = new SaveManager({ editor: this });`.

### Check 3: "SceneManager is actually ScenesManager (plural) with async methods"

- **Claim (spec Q2, lines 868-917; §14.4 lines 1799-1805):** "Class name is `ScenesManager` (plural), not `SceneManager`. All command-issuing methods are `async` (`createScene`, `deleteScene`, `renameScene`, `switchToScene`, bookmark ops). No `setActive()` (use `switchToScene`). No `listScenes()` (use `getScenes()`). No `getActiveId()` (use `getActiveSceneOrNull()?.id`)."
- **Source:** `/tmp/opencut-classic/apps/web/src/core/managers/scenes-manager.ts`
- **Actual:** Class declared at line 26 as `export class ScenesManager`. All command-issuing methods verified async:
  - `async createScene({ name, isMain }): Promise<string>` (line 33)
  - `async deleteScene({ sceneId }): Promise<void>` (line 49)
  - `async renameScene({ sceneId, name }): Promise<void>` (line 69)
  - `async switchToScene({ sceneId }): Promise<void>` (line 87)
  - `async toggleBookmark({ time }): Promise<void>` (line 113)
  - `async removeBookmark({ time }): Promise<void>` (line 132)
  - `async updateBookmark({ time, updates }): Promise<void>` (line 137)
  - `async moveBookmark({ fromTime, toTime }): Promise<void>` (line 148)
  - `async loadProjectScenes({ projectId }): Promise<void>` (line 176)
  Confirmed: no `setActive`, no `listScenes`, no `getActiveId` methods exist.
- **Verdict:** ✅ ACCURATE
- **Notes:** Minor cosmetic issue: spec's "scenes-manager.ts:113-130 — bookmark ops (also commands)" line range is misleading because it actually covers `toggleBookmark` (113-116) + `isBookmarked` (118-130), and `isBookmarked` is NOT a command (it's a synchronous boolean getter). The remaining bookmark ops (`removeBookmark` 132-135, `updateBookmark` 137-146, `moveBookmark` 148-157) fall outside the cited range.

### Check 4: "No Command.id, no Command.label, no Command.coalesceKey"

- **Claim (spec Q6, lines 1407-1423):** "No `id` field — there is no `CommandId` type. ... No `label` field — commands do not carry human-readable labels at this layer. ... No `coalesceKey` — there is no coalescing in `CommandManager`."
- **Source:** `/tmp/opencut-classic/apps/web/src/commands/base-command.ts:21-31`
- **Actual:** The abstract `Command` class declaration:
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
  Confirmed: only `execute()`, `undo()`, `redo()` are on the Command base class. No `id`, `label`, or `coalesceKey` fields.
- **Verdict:** ✅ ACCURATE

### Check 5: "PlaybackManager clock is performance.now() + rAF, NOT AudioContext.currentTime"

- **Claim (spec Q2, lines 851-864):** "Clock is `performance.now()` + `requestAnimationFrame`, NOT `AudioContext.currentTime` — see `playback-manager.ts:196-239`"
- **Source:** `/tmp/opencut-classic/apps/web/src/core/managers/playback-manager.ts:196-239`
- **Actual:** Verified at lines 196-204 (`startTimer`) and 213-239 (`updateTime`):
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
  // playback-manager.ts:213-239 (updateTime = () => {...})
  private updateTime = (): void => {
      if (!this.isPlaying) return;
      const fps = this.editor.project.getActive()?.settings.fps;
      const elapsedSeconds =
          (performance.now() - this.playbackStartWallTime) / 1000;
      // ...
      this.playbackTimer = requestAnimationFrame(this.updateTime);
  };
  ```
  Verified via `Grep` that `audioContext.currentTime` does NOT appear anywhere in `playback-manager.ts`. The clock is `performance.now()` + `requestAnimationFrame`.
- **Verdict:** ✅ ACCURATE

### Check 6: "AudioManager is 700 LOC and has the actual audio-clock logic"

- **Claim (spec Q2, lines 1095-1125):** "`AudioManager` — `apps/web/src/core/managers/audio-manager.ts` (700 LOC) ... Subscribes to `playback.subscribe`, `timeline.subscribe`, `media.subscribe`, `playback.onSeek` in its constructor (lines 49-58) — this is where the *actual* audio scheduling lives."
- **Source:** `/tmp/opencut-classic/apps/web/src/core/managers/audio-manager.ts`
- **Actual:** File is 700 LOC per `wc -l` (701 lines per `cat -n`, minor off-by-one). Audio clock logic verified:
  - Line 28: `private playbackStartContextTime = 0;`
  - Lines 142-147 (`getPlaybackTime`): `const elapsed = this.audioContext.currentTime - this.playbackStartContextTime;`
  - Line 171: `this.playbackStartContextTime = audioContext.currentTime;` (inside `startPlayback`)
  - Lines 49-58 constructor subscribes to `editor.playback.subscribe(this.handlePlaybackChange)`, `editor.timeline.subscribe(this.handleTimelineChange)`, `editor.media.subscribe(this.handleTimelineChange)`, `editor.playback.onSeek(this.handleSeek)`.
  - Additional `audioContext.currentTime` usages confirmed via `Grep` at lines 145, 171, 299, 303, 305, 394, 397, 398, 512.
- **Verdict:** ✅ ACCURATE

### Check 7: "FreeCut deps/ has 7 contract files"

- **Claim (spec Q3, lines 1137-1151):** "Directory: `/tmp/freecut/src/runtime/composition-runtime/deps/` (15 files)" + table listing 7 contract files paired with 7 wrapper files.
- **Source:** `/tmp/freecut/src/runtime/composition-runtime/deps/`
- **Actual:** Verified 14 files total via `LS` (7 contract files ending in `-contract.ts` + 7 wrapper files):
  - Contracts: `keyframes-contract.ts`, `media-library-contract.ts`, `media-library-opfs-contract.ts`, `media-library-store-contract.ts`, `player-contract.ts`, `stores-contract.ts`, `timeline-contract.ts`
  - Wrappers: `keyframes.ts`, `media-library.ts`, `media-library-opfs.ts`, `media-library-store.ts`, `player.ts`, `stores.ts`, `timeline.ts`
  - Spec's claim of "7 contract files" is correct.
  - Spec's parenthetical "(15 files)" is **WRONG** — actual count is 14.
- **Verdict:** ⚠️ PARTIALLY ACCURATE
- **Notes:** The 7-contract claim is verified. The "(15 files)" header is an off-by-one error. The spec's own table (lines 1142-1151) lists 7 contract + 7 wrapper = 14 rows, contradicting the "(15 files)" header. ISSUE-1 (MINOR).

### Check 8: "gizmo-contract.ts does NOT exist"

- **Claim (spec Q3, lines 1152-1159):** "`gizmo-contract.ts` does NOT exist — the seed spec listed it. Gizmo state (`useGizmoStore`, `useItemGizmoPreview`, `ItemPropertiesPreview` type) is folded into `stores-contract.ts:7-9` instead."
- **Source:** `/tmp/freecut/src/runtime/composition-runtime/deps/stores-contract.ts:7-9`
- **Actual:** `LS` of deps/ directory shows no `gizmo-contract.ts`. Verified `stores-contract.ts:7-9` contains the gizmo exports:
  ```ts
  // stores-contract.ts:7-9
  export { useGizmoStore } from '@/features/preview/stores/gizmo-store'
  export { useItemGizmoPreview } from '@/features/preview/stores/use-item-gizmo-preview'
  export type { ItemPropertiesPreview } from '@/features/preview/stores/gizmo-store'
  ```
- **Verdict:** ✅ ACCURATE

### Check 9: "FreeCut boundary enforcement is via 4 standalone Node scripts"

- **Claim (spec Q4, lines 1177-1182):** Four check scripts + 1 shared helpers file:
  - `/tmp/freecut/scripts/check-feature-boundaries.mjs` (113 LOC)
  - `/tmp/freecut/scripts/check-deps-contract-boundaries.mjs` (126 LOC)
  - `/tmp/freecut/scripts/check-deps-wrapper-health.mjs` (143 LOC)
  - `/tmp/freecut/scripts/check-feature-edge-budgets.mjs` (139 LOC)
  - `/tmp/freecut/scripts/feature-boundary-context.mjs` (25 LOC) — shared helpers
- **Source:** `/tmp/freecut/scripts/`
- **Actual:** All 5 files exist. LOC counts via `wc -l`:
  - `check-feature-boundaries.mjs`: 112 LOC (spec says 113) — off by one
  - `check-deps-contract-boundaries.mjs`: 125 LOC (spec says 126) — off by one
  - `check-deps-wrapper-health.mjs`: 142 LOC (spec says 143) — off by one
  - `check-feature-edge-budgets.mjs`: 138 LOC (spec says 139) — off by one
  - `feature-boundary-context.mjs`: 24 LOC (spec says 25) — off by one
- **Verdict:** ✅ ACCURATE (with systematic off-by-one LOC counts — ISSUE-2 MINOR)
- **Notes:** The systematic +1 LOC pattern (spec consistently reports one more than `wc -l`) is a counting-convention artifact, not a substantive error. It appears consistently across many files in the spec.

### Check 10: "FreeCut's EditorCore-equivalent is split three ways"

- **Claim (spec Q5, lines 1259-1291):** "FreeCut does NOT have a singleton EditorCore. The 'engine' is split across: (1) Zustand stores in `src/features/<feature>/stores/`, (2) React contexts/providers in `src/runtime/player/` and `src/runtime/composition-runtime/contexts/`, (3) Headless harness `src/headless/main.ts` with `window.freecut` API."
- **Source:** Three FreeCut directories
- **Actual:** Verified:
  - `src/features/timeline/stores/` exists with many Zustand stores (items-store, transitions-store, keyframes-store, markers-store, timeline-settings-store, timeline-command-store, compositions-store, etc.) ✅
  - `src/runtime/player/` exists with React contexts: `ClockProvider.tsx`, `VideoConfigProvider.tsx`, `VideoSourcePoolContext.tsx`, `PlayerEmitterProvider.tsx` ✅
  - `src/runtime/composition-runtime/contexts/` exists with React contexts: `KeyframesProvider.tsx`, `live-item-transform-provider.tsx`, `nested-media-resolution-context.tsx`, `composition-space-context.tsx` ✅
  - `src/headless/main.ts` exists (1292 LOC per `wc -l`, spec says 1293 — off-by-one) with `window.freecut` API at line 1281-1291 ✅
- **Verdict:** ✅ ACCURATE
- **Notes:** The three-way split claim is verified. Note the spec's secondary claim (line 1354) that `src/features/timeline/stores/` contains "46 domain stores (counted from LS)" is **WRONG** — actual count is 41 non-test `.ts` files directly in that directory (or 61 if including tests). See ISSUE-3 (MAJOR).

### Check 11: "FreeCut headless entry reuses the same render code path"

- **Claim (spec Q5, lines 1297-1327):** "The headless entry reuses `renderComposition`, `renderAudioOnly`, `renderSingleFrame` from `@/features/export/utils/canvas-render-orchestrator` (imported at `headless/main.ts:39-43`) — the **same render code path** the editor uses."
- **Source:** `/tmp/freecut/src/headless/main.ts:39-43`
- **Actual:** Verified import statement at lines 39-43:
  ```ts
  // headless/main.ts:39-43
  import {
    renderComposition,
    renderAudioOnly,
    renderSingleFrame,
  } from '@/features/export/utils/canvas-render-orchestrator'
  ```
  And these functions are called later in the file (`renderComposition` at line 671, `renderAudioOnly` at line 670, `renderSingleFrame` at line 961). Verified via `Grep` that these functions are exported from `/tmp/freecut/src/features/export/utils/canvas-render-orchestrator.ts` at lines 447, 975, 889.
- **Verdict:** ✅ ACCURATE

### Check 12: "RendererManager has no initialize(canvas), no renderFrame(time)"

- **Claim (spec Q2, lines 1054-1059; §14.10 lines 1847-1853):** "No `initialize(canvas): Promise<void>` — actual GPU init happens in `apps/web/src/services/renderer/gpu-renderer.ts:11-24` (`initializeGpuRenderer()`) which is called from `editor-provider.tsx:41`. `RendererManager` itself has no init method. ... No `renderFrame(time: MediaTime): Promise<RenderResult>` — actual is `saveSnapshot()` and `exportProject()`."
- **Source:** `/tmp/opencut-classic/apps/web/src/core/managers/renderer-manager.ts`
- **Actual:** Verified at lines 16-252 (252 LOC, matches spec). Public API of `RendererManager`:
  - `get isDegraded(): boolean` (lines 23-25) — getter, not method
  - `setDegraded(degraded: boolean): void` (lines 27-31)
  - `setRenderTree({ renderTree }: { renderTree: RootNode | null }): void` (lines 33-36)
  - `getRenderTree(): RootNode | null` (lines 38-40)
  - `async saveSnapshot(): Promise<{ success: boolean; error?: string }>` (lines 42-50)
  - `async copySnapshot(): Promise<{ success: boolean; error?: string }>` (lines 52-79)
  - `async exportProject({ options, onProgress, onCancel }): Promise<ExportResult>` (lines 141-240)
  - `subscribe(listener: () => void): () => void` (lines 242-245)
  
  Verified absent: `initialize(canvas)`, `renderFrame(time)`, `resize(width, height)`, `onDeviceLost(cb)`.
- **Verdict:** ✅ ACCURATE

### Check 13: "No DegradedRendererBanner component in OpenCut-classic"

- **Claim (spec Q7, line 1628):** "There is no 'degraded banner' component in OpenCut-classic's source — the master spec's mention of 'borrow OpenCut-classic's `DegradedRendererBanner`' appears to be inaccurate; what exists is a boolean flag that components read via `useEditor((e) => e.renderer.isDegraded)` (e.g., used in `editor-provider.tsx:42`)."
- **Claim (spec §14.15, line 1895):** "There is **no 'DegradedRendererBanner' component** — the master spec's mention of 'borrow OpenCut-classic's pattern' is generous."
- **Source:** `/tmp/opencut-classic/apps/web/src/`
- **Actual:** Searched via `Grep` for `Degraded` across all of OpenCut-classic. The component **DOES exist**:
  ```tsx
  // /tmp/opencut-classic/apps/web/src/app/editor/[project_id]/page.tsx:60-79
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
  And it is **used** at line 46 of the same file:
  ```tsx
  // /tmp/opencut-classic/apps/web/src/app/editor/[project_id]/page.tsx:42-58
  return (
      <MobileGate>
          <EditorProvider projectId={projectId}>
              <div className="bg-background flex h-screen w-screen flex-col overflow-hidden">
                  <DegradedRendererBanner />   {/* ← line 46 */}
                  <EditorHeader />
                  <div className="min-h-0 min-w-0 flex-1">
                      <EditorLayout />
                  </div>
                  ...
              </div>
          </EditorProvider>
      </MobileGate>
  );
  ```
- **Verdict:** ❌ INACCURATE — `DegradedRendererBanner` component DOES exist
- **Notes:** This is a CRITICAL issue. The master spec was correct in its mention of `DegradedRendererBanner`, but the refined spec's Q7 and §14.15 "corrections" both incorrectly claim it doesn't exist. This means the refined spec is *fabricating* a correction where none was needed. Future implementers reading the refined spec would be misled into thinking the master spec was wrong and that they need to design this component from scratch — when in fact they can borrow the existing OpenCut-classic component. See ISSUE-1 (CRITICAL).

### Check 14: §14 Corrections spot-checks (7 entries verified)

The audit required verifying at least 2 entries; I verified 7.

| §14 entry | Claim | Verdict | Notes |
|---|---|---|---|
| §14.1 (12 managers) | "12 managers" not 8; "no ExportManager" | ✅ | Verified — 12 managers, no ExportManager class |
| §14.2 (zero-arg constructor) | "private constructor()" with no EngineDeps param | ✅ | Verified at core/index.ts:32 |
| §14.4 (ScenesManager plural + async) | Class name `ScenesManager`, async methods, no `setActive`/`listScenes`/`getActiveId` | ✅ | Verified at scenes-manager.ts |
| §14.5 (TimelineManager method names) | `splitElements`/`updateElementTrim`/`moveElements`/`deleteElements`; no `ripple`/`roll`/`slip`/`slide` methods on TimelineManager | ✅ | Verified via `Grep` at timeline-manager.ts — no methods named exactly `split`, `trim`, `move`, `ripple`, `roll`, `slip`, `slide`, or `delete` |
| §14.13 (EngineDeps vs side-effectful imports) | "No `EngineDeps` interface. `EditorCore` relies on side-effectful imports: `storageService` in `project-manager.ts:11`, `media-manager.ts:4`, `scenes-manager.ts:3`;" | ✅ | Verified via `Grep` — all three imports exist at the exact lines claimed. Also verified `initializeGpuRenderer`/`isGpuAvailable` imports at `editor-provider.tsx:13-16`, `registerDefaultEffects` at `core/index.ts:13` |
| §14.15 (DegradedRendererBanner absent) | "There is no 'DegradedRendererBanner' component" | ❌ | See Check 13 above — the component EXISTS |
| §14.17 (Manager initialization order) | 18-step init order listed (12 managers + 6 side effects/wiring) | ✅ | Verified against actual constructor body lines 32-69. Spec's "12-step order" headline is slightly misleading since 18 distinct operations occur, but the enumerated list matches the actual code exactly. |

- **Verdict:** 6 of 7 §14 spot-checks verified accurate; 1 (§14.15) verified INACCURATE.

### Check 15: §13 Code References spot-checks (3 entries verified)

| §13 entry | Spec LOC | Actual LOC | Summary verdict |
|---|---|---|---|
| `apps/web/src/commands/index.ts` | 9 | 8 | ✅ Summary accurate ("Re-exports Command, BatchCommand, CommandResult + namespaces (timeline/media/scene/project)") — verified the file re-exports Command, CommandResult, BatchCommand, and 4 namespaces (./timeline, ./media, ./scene, ./project). LOC off-by-one (ISSUE-2 systematic). |
| `apps/web/src/editor/use-editor.ts` | 77 | 76 | ✅ Summary accurate ("useEditor() hook — useSyncExternalStore over all 9 manager subscribe() methods + EditorCore.getInstance()") — verified useSyncExternalStore (line 71), EditorCore.getInstance() (line 26), and 9 manager subscribe() calls (lines 32-40: playback, timeline, scenes, project, media, renderer, selection, clipboard, diagnostics). Note: NOT all 12 managers are subscribed to — `save`, `audio`, `command` are not subscribed to (they don't have a subscribe() method or are not relevant to UI re-render). Spec correctly says 9, not 12. |
| `apps/web/src/services/renderer/gpu-renderer.ts` | 91 | 90 | ✅ Summary accurate ("initializeGpuRenderer() from opencut-wasm — memoized promise + isGpuAvailable() flag") — verified both `initializeGpuRenderer()` (lines 11-24) and `isGpuAvailable()` (lines 26-28). File imports from `opencut-wasm` (line 1-5). |

- **Verdict:** All 3 spot-checks verified — file paths exist, summaries accurate. LOC counts all off-by-one (systematic ISSUE-2).

---

## Issues found

### ISSUE-1 (CRITICAL) — `DegradedRendererBanner` exists; spec's "correction" is wrong

**Severity:** CRITICAL

**Description:** The spec claims (in two separate places) that OpenCut-classic has no `DegradedRendererBanner` component, and that the master spec's mention of this component was "generous" / "inaccurate". The component in fact exists and is used in production OpenCut-classic code.

**Scout's claim (spec line 1628):**
> "There is no 'degraded banner' component in OpenCut-classic's source — the master spec's mention of 'borrow OpenCut-classic's `DegradedRendererBanner`' appears to be inaccurate; what exists is a boolean flag that components read via `useEditor((e) => e.renderer.isDegraded)` (e.g., used in `editor-provider.tsx:42`)."

**Scout's claim (spec line 1895):**
> "There is **no 'DegradedRendererBanner' component** — the master spec's mention of 'borrow OpenCut-classic's pattern' is generous."

**Actual code at `/tmp/opencut-classic/apps/web/src/app/editor/[project_id]/page.tsx:42-58, 60-79`:**
```tsx
// line 42-58: usage in page render
return (
    <MobileGate>
        <EditorProvider projectId={projectId}>
            <div className="bg-background flex h-screen w-screen flex-col overflow-hidden">
                <DegradedRendererBanner />   {/* ← line 46, USED here */}
                <EditorHeader />
                <div className="min-h-0 min-w-0 flex-1">
                    <EditorLayout />
                </div>
                ...
            </div>
        </EditorProvider>
    </MobileGate>
);

// lines 60-79: component definition
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

**Recommended fix:**
1. In §Q7 (around line 1628), replace the claim that "There is no 'degraded banner' component" with a quote of the actual component definition and a citation to `apps/web/src/app/editor/[project_id]/page.tsx:60-79`.
2. In §14.15, replace the correction with: "**Confirmed:** The master spec's `DegradedRendererBanner` reference is accurate. The component exists at `apps/web/src/app/editor/[project_id]/page.tsx:60-79` and is used in production. We can adopt this pattern (boolean flag + dismissible banner) directly."
3. Update the §7.2 ("Initialization error patterns") summary to reflect that the master spec was right.

**Why this matters:** The refined spec *fabricates* a correction of the master spec. Future implementers who read only the refined spec will believe they need to design this UI from scratch (the master spec offered the existing pattern as a reference). This wastes design effort and could lead to a worse UX than the proven OpenCut-classic pattern.

---

### ISSUE-2 (MINOR) — Systematic off-by-one LOC counts

**Severity:** MINOR

**Description:** Throughout the spec, file LOC counts are consistently reported as 1 greater than `wc -l` reports. This affects every file in the §13 Code References table and many inline claims throughout the spec.

**Examples (spec claim → `wc -l` actual):**
| File | Spec | Actual |
|---|---|---|
| `apps/web/src/core/index.ts` | 82 | 81 |
| `apps/web/src/commands/index.ts` | 9 | 8 |
| `apps/web/src/editor/use-editor.ts` | 77 | 76 |
| `apps/web/src/editor/editor-store.ts` | 25 | 24 |
| `apps/web/src/services/renderer/gpu-renderer.ts` | 91 | 90 |
| `/tmp/freecut/src/runtime/player/clock/Clock.ts` | 642 | 641 |
| `/tmp/freecut/src/headless/main.ts` | 1293 | 1292 |
| `/tmp/freecut/src/features/timeline/stores/timeline-store-facade.ts` | 359 | 358 |
| `/tmp/freecut/src/features/timeline/stores/timeline-store.ts` | 22 | 21 |
| `/tmp/freecut/src/features/timeline/stores/timeline-command-store.ts` | 287 | 286 |
| `/tmp/freecut/src/features/timeline/stores/commands/types.ts` | 54 | 53 |
| `/tmp/freecut/src/features/timeline/stores/items-store.ts` | 961 | 960 |
| `/tmp/freecut/scripts/check-feature-boundaries.mjs` | 113 | 112 |
| `/tmp/freecut/scripts/check-deps-contract-boundaries.mjs` | 126 | 125 |
| `/tmp/freecut/scripts/check-deps-wrapper-health.mjs` | 143 | 142 |
| `/tmp/freecut/scripts/check-feature-edge-budgets.mjs` | 139 | 138 |
| `/tmp/freecut/scripts/feature-boundary-context.mjs` | 25 | 24 |

**Recommended fix:** No action needed — these are counting-convention artifacts (the scout appears to have used a tool that reports the last line number even when the file ends in a newline). The line ranges within file contents (e.g., `apps/web/src/core/index.ts:17-30`) are all correct. The LOC counts in the §13 table are systematically +1 vs `wc -l`, but this is a stable convention rather than random error.

---

### ISSUE-3 (MAJOR) — "46 domain stores" count is wrong

**Severity:** MAJOR

**Description:** The spec claims the `src/features/timeline/stores/` directory contains "46 domain stores (counted from LS)". The actual count is 41 non-test `.ts` files directly in `stores/` (or 61 including test files, or 79 including subdirectory contents — none of these match 46).

**Scout's claim (spec line 1354):**
> "The `src/features/timeline/stores/` directory contains **46 domain stores** (counted from LS) — including `items-store`, `transitions-store`, `keyframes-store`, `markers-store`, `timeline-settings-store`, `timeline-command-store`, `compositions-store`, `composition-navigation-store`, `sequences-store`, `timeline-viewport-store`, `zoom-store`, plus 13 preview stores (`ripple-edit-preview-store`, `rolling-edit-preview-store`, `slip-edit-preview-store`, `slide-edit-preview-store`, etc.) and `timeline-actions.ts` for cross-domain operations."

**Actual:** Several counts checked:
- Non-test `.ts` files directly in `stores/` (maxdepth 1): **41**
- All `.ts` files (including tests) directly in `stores/`: 61
- All `.ts` files (non-test) recursively in `stores/`: 79
- Files matching `*-store.ts` directly in `stores/`: 32
- Files matching `*store*` (non-test) directly in `stores/`: 36

None match 46. The spec's enumeration (11 named + "13 preview stores" + 1 `timeline-actions.ts` = 25) doesn't reconcile with "46" either.

**Recommended fix:** Replace "46 domain stores (counted from LS)" with the correct count of "41 non-test `.ts` files directly in `src/features/timeline/stores/`" (or, if counting recursively including `actions/` and `commands/` subdirectories: "79 non-test `.ts` files in the `stores/` tree"). Better yet, just enumerate the categories without a precise count: "many Zustand stores spread across `src/features/timeline/stores/` (items, transitions, keyframes, markers, settings, command, compositions, plus ~12 preview-related stores for live edit feedback)".

**Why this matters:** The spec uses a specific number ("46") as evidence that the scout actually inspected the directory. The wrong number suggests either sloppy inspection or fabrication. While the architectural point (FreeCut splits timeline state across many Zustand stores) is correct, the precision of the count is misleading.

---

### ISSUE-4 (MINOR) — FreeCut deps/ "(15 files)" header is wrong

**Severity:** MINOR

**Description:** Spec Q3 header says `(15 files)` for the FreeCut `deps/` directory, but the actual count is 14 files (7 contract files + 7 wrapper files). The spec's own table at lines 1142-1151 lists 14 rows, contradicting the "(15 files)" header.

**Scout's claim (spec line 1137):**
> "**Directory:** `/tmp/freecut/src/runtime/composition-runtime/deps/` (15 files)"

**Actual:** 14 files in the directory (verified via `LS`).

**Recommended fix:** Change "(15 files)" to "(14 files)".

---

### ISSUE-5 (MINOR) — Inconsistent line range for `window.freecut` assignment

**Severity:** MINOR

**Description:** The spec gives two different line ranges for the same `window.freecut = {...}` assignment in `headless/main.ts`:
- Line 1297: "(`headless/main.ts:1281-1292`)"
- Line 1313: "// headless/main.ts:1281-1291"

**Actual:** The assignment spans lines 1281-1291 (closing brace at line 1291). Line 1292 is `log.info('Headless harness ready')` (a separate statement).

**Recommended fix:** Standardize on "1281-1291" everywhere.

---

### ISSUE-6 (MINOR) — Spec's generalization "Every manager is constructed as `new XxxManager(this)`" misses `SaveManager`

**Severity:** MINOR

**Description:** Spec Q1 (line 699) generalizes: "Every manager is constructed as `new XxxManager(this)` — passing the entire `EditorCore` instance, not specific peer managers." This is true for 11 of 12 managers, but `SaveManager` is constructed as `new SaveManager({ editor: this })` — an options object, not `this` directly.

**Scout's claim (spec line 699):**
> "Every manager receives `this` (the `EditorCore` instance), not specific peer managers."

**Actual (core/index.ts:42):**
```ts
this.save = new SaveManager({ editor: this });
```

**Recommended fix:** Soften the generalization to: "Every manager receives the `EditorCore` instance, either directly as `new XxxManager(this)` (11 managers) or via an options object `new SaveManager({ editor: this })` (1 manager, `SaveManager`)."

The spec's quoted constructor code at line 655 already correctly shows `this.save = new SaveManager({ editor: this });`, so the inconsistency is only in the generalization prose at line 699 — not in the code quote itself.

---

## Recommendation

⚠️ **NEEDS REVISION**

The spec is overwhelmingly accurate on substantive architectural claims (12 managers, zero-arg constructor, `ScenesManager` plural/async, `performance.now()` clock, `AudioManager` audio-clock logic, `Command` structure missing `id`/`label`/`coalesceKey`, FreeCut 7-contract pattern, headless render code reuse, `RendererManager` API). The source-code quotes match exactly, line ranges are correct, and the corrections to the seed spec are well-founded.

**However, one CRITICAL issue must be fixed before this spec is used as an implementation reference:**

- **ISSUE-1 (CRITICAL):** The spec incorrectly claims `DegradedRendererBanner` does not exist in OpenCut-classic. The master spec was right; the refined spec's §14.15 "correction" of the master spec is itself a fabrication. The component exists at `apps/web/src/app/editor/[project_id]/page.tsx:60-79` and is used in production. Fix §Q7 (line 1628) and §14.15 (line 1895) to quote the actual component and acknowledge the master spec was correct.

**Other issues to fix (in priority order):**

- **ISSUE-3 (MAJOR):** Replace "46 domain stores" with the actual count (41 non-test files directly in `src/features/timeline/stores/`) — or remove the specific number.
- **ISSUE-4 (MINOR):** Change "(15 files)" to "(14 files)" for FreeCut deps/ directory.
- **ISSUE-5 (MINOR):** Standardize on "1281-1291" for `window.freecut` assignment line range.
- **ISSUE-6 (MINOR):** Soften "Every manager is constructed as `new XxxManager(this)`" to acknowledge `SaveManager`'s options-object construction.

**ISSUE-2 (systematic +1 LOC counts across all §13 table entries and many inline claims):** No action required — these are a stable counting convention artifact, not random errors. The line ranges cited within file contents are all correct.

**Bottom line:** Once ISSUE-1 is fixed (one CRITICAL correction to undo a fabricated correction), the spec is ready for integration review. The architectural direction is sound and the source-code references are overwhelmingly accurate.
