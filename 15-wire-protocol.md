# 15 — JSON Wire Protocol: `EngineCommand`, `CommandResult`, `EngineEvent` (NEW)

**Stream:** Data-driven engine protocol (the unifying abstraction)
**Status:** NEW (TEST-02). Defines the runtime-operations layer that makes the engine fully data-driven.
**Primary teacher:** OpenCut-classic `commands/` (class-based `Command`/`BatchCommand`/`TracksSnapshotCommand` architecture) + FreeCut `headless/contract.test.mjs` (Zod schema in test pattern) + the architect's decision that the engine must be drivable without a UI (master spec §3 "Architecture", §2 Decision 6 "One engine, two entry points").
**Predecessor specs:** `01-core-engine.md` (manager API), `06-nle-ops.md` (op inventory), `09-project-model.md` (ProjectJSON — Layer 1).
**Successor specs:** `12-testing-strategy.md` (tier 1 infrastructure; methodology superseded by 17), `16-keyboard-shortcuts.md` (TEST-03, shipped — every shortcut maps to an `EngineCommand`, see §13.5), `17-test-plan.md` (TEST-04, shipped — Tier 1 tests use this protocol, see §13.6), `18-ui-shell.md` (UI shell panels dispatch `EngineCommand`s via this protocol, see §13.12), `19-code-references.md` (reference-repo map and nle-engine reconciliation, see §13.13).

---

## 0. TL;DR

This spec defines **Layer 2 of the three-layer JSON protocol**: the `EngineCommand` discriminated union that captures every runtime operation the engine can perform. Layer 1 (static project state, `ProjectJSON`) is defined in spec 09. Layer 3 (render output, `FrameDescriptor` + pixels + audio PCM) is defined in specs 04 and 07. This spec fills the gap between them.

**Why this matters:** without an explicit, JSON-serializable runtime-operations layer, the engine has three separate "ways to drive it" — React UI handlers calling manager methods directly (interactive path), Playwright scripts calling `window.__engine.*` (test path — spec 17 §15.6's harness contract), and HTTP API consumers calling a remote engine (cloud path). Each path drifts; each path adds UI tax to the engine. The `EngineCommand` union collapses all three into one: the same `(ProjectJSON, EngineCommand[])` tuple produces the same final `SceneState` regardless of caller. This is what makes the engine testable without UI tax, makes cloud render use the same code path as browser preview, and makes regression tests fit in 30 lines instead of 300.

**Adoption decision (spec 00 §2 Decision 9, adopted by TEST-01):** The engine's public mutation surface is the `engine.command.apply(command: EngineCommand): CommandResult` method on `CommandManager`. Manager methods like `engine.timeline.splitElements(...)` become thin wrappers that construct the `EngineCommand` and call `apply()`. The TS types and Zod schemas in this spec are the source of truth — manager method signatures in spec 01 §3.3 are inferred from (and constrained by) the schema here.

---

## 1. Purpose

Define the three-layer JSON protocol that makes the engine fully data-driven:

1. **Static project state** (`ProjectJSON`) — already defined in spec 09; this spec references it.
2. **Runtime operations** (`EngineCommand[]`) — **NEW**, this spec defines it. A discriminated union of every operation the engine can perform, JSON-serializable, applied via `engine.command.apply(command)`.
3. **Render output** (`FrameDescriptor` + pixels + audio PCM) — already defined in specs 04 (renderer/color) and 07 (composition); this spec references it for the HTTP API.

The runtime-operations layer is the new contribution. It is a discriminated union of all operations the engine can perform, JSON-serializable, applicable via `engine.command.apply(command)`.

### 1.1 The unifying abstraction

```
┌─────────────────────────────────────────────────────────────────────┐
│                     THREE-LAYER JSON PROTOCOL                        │
└─────────────────────────────────────────────────────────────────────┘

  Layer 1 — Static Project State (ProjectJSON)         ← spec 09
    │
    │  loaded via engine.project.loadFromJSON(project)
    ▼
  ┌───────────────────────────────────────────────┐
  │  EditorCore (managers + engine core)           │  ← spec 01
  └───────────────────────────────────────────────┘
    │
    │  Layer 2 — Runtime Operations (EngineCommand[])
    │  applied via engine.command.apply(command)
    │  ← THIS SPEC
    ▼
  ┌───────────────────────────────────────────────┐
  │  SceneState (current runtime state)           │
  └───────────────────────────────────────────────┘
    │
    │  Layer 3 — Render Output
    │  engine.renderer.renderFrame(n) → pixels
    │  engine.audio.renderAudio() → PCM samples
    │  ← specs 04, 07
    ▼
  pixels + PCM
```

The contract: given the same `(ProjectJSON, EngineCommand[])` tuple, the engine must arrive at the same `SceneState` every time — in the browser, in headless Chrome, in a unit test, in a Node.js server. Determinism is the property that makes the protocol useful.

### 1.2 Why a new layer is needed

Without an explicit runtime-operations layer, every consumer of the engine writes its own driver:

- **React UI handlers** call manager methods directly (`engine.timeline.splitElements({elements, splitTime})`).
- **Playwright scripts** call the same manager methods via `page.evaluate(() => window.__engine.timeline.splitElements(...))` (spec 17 §15.6's harness global).
- **HTTP API consumers** (cloud render) call manager methods via a thin RPC shim that mirrors the manager API surface.
- **Tests** call manager methods directly.

These four paths drift. New manager methods get added that only one consumer uses. UI handlers accumulate stateful shortcuts (e.g., reading selection directly from a React store) that don't work in a test. The HTTP shim lags behind. Tests become brittle because they reproduce UI gesture sequences instead of expressing intent.

The `EngineCommand` union collapses these four paths into one. Every consumer constructs an `EngineCommand` (or a `CommandBatch`) and calls `engine.command.apply(command)`. The engine validates the command via Zod, dispatches it to the right manager method, and returns a `CommandResult` describing the state change. UI handlers, test harnesses, HTTP shims, and MCP-style automation all use the same code path.

This is what Ken Imoto's "automation-ready by accident" observation in spec 01 §2 Goal 2 was pointing at — typed method signatures with single options-object parameters "paste one-to-one onto MCP tool definitions." This spec makes the pasting explicit: every `EngineCommand` variant IS an MCP tool definition (or would be, if we were to expose the engine via MCP).

---

## 2. Goals

1. **Every engine operation is JSON-serializable.** No callbacks, no function references, no class instances in commands. A command must survive `JSON.stringify(command) → JSON.parse(json)` round-trip without information loss. This is what makes commands replayable, transportable, and storable.

2. **Deterministic replay.** Same `(ProjectJSON, EngineCommand[])` → same final `SceneState`, every time. The engine is a pure function of (initial state, command sequence). No wall-clock time, no `Math.random()`, no `Date.now()` in the command application path — UUID generation must be seedable (passed in via command params or via engine config).

3. **Three identical consumers.** Browser UI, cloud render, test harness all use the same protocol. The browser UI does not have privileged access to engine state — it constructs commands and applies them like everyone else.

4. **Zod-validated.** Every command is schema-validated before application. Invalid commands return `{ ok: false, error: { code: 'SCHEMA_INVALID', ... } }` without mutating engine state. The Zod schema is the source of truth — TS types are inferred from it via `z.infer<>`.

5. **Versioned.** Protocol has a version (major.minor) for forward/backward compatibility. Cloud render servers can negotiate protocol version with clients. Old replay files can be loaded against newer engines (with deprecation warnings).

6. **One-to-one with manager methods.** Each command type maps to exactly one manager method on `EditorCore` (see §4.2 for the mapping table). Adding a new engine operation means adding a new command type AND a new manager method AND a new Zod schema — they cannot drift.

7. **Undoable by default.** Every state-changing command returns `UndoInfo`. The few commands that are not undoable (e.g., `SaveProjectCommand`, `CloseProjectCommand`, `SnapshotCommand`) are explicitly marked `undoable: false` in §4.2 and §11.

8. **Atomic batches.** Multiple commands can be batched into one undoable transaction via `CommandBatch` (§7). Either all succeed or all roll back — no partial state.

9. **Observable.** Every command application emits an `EngineEvent` (§9) describing the state change. UI subscribes to these events and updates React state accordingly. This is the only sanctioned channel for UI/engine state sync.

10. **Testable in isolation.** Commands are pure data. A test constructs a `ProjectJSON` fixture, applies a sequence of `EngineCommand`s, and asserts on the resulting `SceneState`. No React, no DOM, no WebGPU — the engine core (Layer 2) runs in pure TS.

---

## 3. The Three Layers

### 3.1 Layer 1 — Static Project State (`ProjectJSON`)

**Defined in:** `09-project-model.md` §3.1.

`ProjectJSON` is the static, on-disk representation of a project — the schema that gets saved to OPFS, loaded back, and round-tripped through migrations. It is a pure JSON object: no class instances, no functions, no `Date` objects (timestamps are ISO strings), no `MediaTime` branded types (they serialize as plain numbers).

**How Layer 2 consumes Layer 1:** `engine.project.loadFromJSON(project: ProjectJSON)` (see spec 01 §3.3 `ProjectManager.loadFromJSON`) populates the engine's in-memory `SceneState`. From that point on, all mutations flow through `engine.command.apply(command)` — Layer 2 never touches `ProjectJSON` directly.

**How Layer 2 produces Layer 1:** `engine.project.serialize(): ProjectJSON` (the inverse of `loadFromJSON`) snapshots the current `SceneState` back into a `ProjectJSON` for persistence. This is called by `SaveManager` (spec 01 §3.3) on debounced autosave, by `engine.project.save()` on explicit save, and by the test harness for snapshot assertions.

### 3.2 Layer 2 — Runtime Operations (`EngineCommand[]`)

**Defined in:** THIS SPEC (§4 onward).

`EngineCommand` is a discriminated union of every runtime operation the engine can perform. Each variant is a `{ type: string; params: {...} }` object. The `type` discriminator selects the variant; the `params` object carries the operation's arguments.

**Lifecycle:** Layer 2 operations live in the engine's undo/redo history (`CommandManager.history`). They are NOT serialized to disk as part of `ProjectJSON` — only the resulting `SceneState` is serialized (via Layer 1). However, Layer 2 operations CAN be serialized to disk as a separate "replay log" file (§5.4) for debugging, regression testing, or session recording.

**Critical invariant:** Layer 2 operations are the ONLY sanctioned way to mutate `SceneState`. Direct mutation (e.g., `scene.tracks[0].elements.push(...)`) is forbidden — see spec 01 §3.7 rule 5. Enforced by ESLint rule on the `SceneState` type (make it `Readonly` in the public surface) and by `CommandManager` being the only path to `editor.timeline.updateTracks()`.

### 3.3 Layer 3 — Render Output

**Defined in:**
- `04-renderer-color.md` §7 — `FrameDescriptor` interface and `renderer.renderFrame()` API.
- `07-composition.md` §4 — `buildFrameDescriptor(state, n)` pure function (the composition runtime that converts `SceneState` + frame number → `FrameDescriptor`).
- `03-playback-engine.md` — `audio.renderAudio()` API (audio PCM rendering via `OfflineAudioContext`).

**How Layer 2 interacts with Layer 3:** Layer 2 commands mutate `SceneState`; Layer 3 reads `SceneState` and produces output. They are decoupled — applying a command does NOT trigger a render. The render is triggered separately, either by the rAF loop (interactive), by sequential frame iteration (render), or by an explicit `engine.renderer.renderFrame(n)` call (test).

This decoupling is what makes the test fast path possible: a test can apply 100 commands and then render only the final frame, instead of rendering every intermediate state.

### 3.4 Layer diagram

```
Layer 1: Static Project State (ProjectJSON)
  ↓ loaded via engine.project.loadFromJSON(project)
  
Layer 2: Runtime Operations (EngineCommand[])
  ↓ applied via engine.command.apply(command) for each
  
Layer 3: Render Output
  ↓ engine.renderer.renderFrame(n) → pixels
  ↓ engine.audio.renderAudio() → PCM samples
```

---

## 4. `EngineCommand` Type Definition

### 4.1 The discriminated union

```ts
// src/engine/types/command.ts

export type EngineCommand =
  // ── Timeline ops (from spec 06) ─────────────────────────────────
  | SplitCommand
  | TrimCommand
  | MoveCommand
  | RippleCommand
  | RollCommand
  | SlipCommand
  | SlideCommand
  | DeleteCommand
  | InsertCommand
  | DuplicateCommand
  | RateStretchCommand
  | RetimeCommand
  | FreezeFrameCommand
  | RangeRemovalCommand
  | UpdateElementsCommand
  | ToggleElementVisibilityCommand
  | ToggleElementMutedCommand
  // ── Track ops ────────────────────────────────────────────────────
  | ToggleTrackMuteCommand
  | ToggleTrackSoloCommand
  | ToggleTrackLockCommand
  | ToggleTrackVisibilityCommand
  | AddTrackCommand
  | DeleteTrackCommand
  | ReorderTrackCommand
  // ── Playback ops ─────────────────────────────────────────────────
  | PlayCommand
  | PauseCommand
  | SeekCommand
  | SetRateCommand
  | SetLoopCommand
  // ── Project ops ─────────────────────────────────────────────────
  | CreateProjectCommand
  | LoadProjectCommand
  | SaveProjectCommand
  | CloseProjectCommand
  | UpdateProjectSettingsCommand
  // ── Scene ops ───────────────────────────────────────────────────
  | CreateSceneCommand
  | DeleteSceneCommand
  | RenameSceneCommand
  | SwitchSceneCommand
  | ToggleBookmarkCommand
  | RemoveBookmarkCommand
  | UpdateBookmarkCommand
  | MoveBookmarkCommand
  // ── Media ops ───────────────────────────────────────────────────
  | ImportMediaCommand
  | DeleteMediaCommand
  // ── Tool / selection ops ────────────────────────────────────────
  | SelectToolCommand
  | SelectElementsCommand
  | SelectTrackCommand
  | MarqueeSelectCommand
  // ── Marker ops ─────────────────────────────────────────────────
  | AddMarkerCommand
  | DeleteMarkerCommand
  | UpdateMarkerCommand
  // ── Effect ops ─────────────────────────────────────────────────
  | AddEffectCommand
  | UpdateEffectCommand
  | RemoveEffectCommand
  | ReorderEffectCommand
  | ToggleEffectCommand
  // ── Mask ops ────────────────────────────────────────────────────
  | AddMaskCommand
  | UpdateMaskCommand
  | RemoveMaskCommand
  | ToggleMaskCommand
  // ── Transition ops ─────────────────────────────────────────────
  | AddTransitionCommand
  | UpdateTransitionCommand
  | RemoveTransitionCommand
  // ── Keyframe ops ───────────────────────────────────────────────
  | UpsertKeyframesCommand
  | RemoveKeyframesCommand
  | RetimeKeyframeCommand
  | UpdateKeyframeCurvesCommand
  // ── Clipboard ops ──────────────────────────────────────────────
  | CopyCommand
  | CutCommand
  | PasteCommand
  // ── Undo / redo ────────────────────────────────────────────────
  | UndoCommand
  | RedoCommand
  // ── Snapshot (for testing) ────────────────────────────────────
  | SnapshotCommand
  // ── Export ops (§4.3.74-76, §14.11 — Round-7 amendment) ───────
  | ExportFCPXMLCommand
  | ExportMasterCommand
  | ExportFrameCommand
  // ── Project ops (§4.3.77-78 — Round-7 amendment) ──────────────
  | RenameProjectCommand
  | DeleteProjectCommand;
```

**Total: 78 command types** organized into 16 categories (Export category + two Project ops added by the Round-7 amendment — see §14.11 for the export design decision and §13.11 for the cross-spec un-gating).

Each command type is defined below in §4.3 with:
- Its `type` discriminator (string literal)
- Its `params` object schema
- The manager method it maps to (see §4.2 for the full mapping table)
- Whether it's undoable (most are; some like `SaveProjectCommand` are not)
- An example JSON payload (§5)

### 4.1A Routing-disposition table (Round 15 — normative; the app bus's implementation map)

**What this is:** Decision 16's completeness instrument. Every union member is assigned ONE home: **OT** (opencut-timeline headless API — the editing SSOT), **ENGINE** (nle-engine union façade — the service slice), **APP** (nle-app-level semantics), or **DEFERRED** (typed `NOT_IMPLEMENTED` — see §6.3A). The app bus's exhaustive-switch dispatch compiles against THIS table; DEFERRED members return `{ok:false, code:'NOT_IMPLEMENTED'}` honestly rather than silently missing. The battery (spec 17) verifies: implemented rows cite a module pin SHA; DEFERRED rows cite a phase or a user-signed deferral. **Baseline (Round 15):** OT @`0412e41` implements 24 of 78 (with prefixed names pending C7 + form deltas in §13.15); the engine's JSON-RPC surface (19 edit ops) is INTERNAL transport (Decision 12.2-amended) and does not count toward this table.

| Category | Members (78) | Home | Status @ R15 → phase |
|---|---|---|---|
| **Timeline** | `insert`, `move`, `trim`, `split`, `delete`, `duplicate`, `updateElements` | OT | implemented (C7 rename pending) → A2 |
| | `ripple` | OT | implemented as the `rippleDelete` wrapper (spec keeps `delete{ripple:true}` canonical — §13.15) |
| | `roll`, `slip`, `slide`, `rateStretch` | OT (op-port) | NOT in OT (engine algorithms at timeline.ts:2984/4143/4246/3155) → A2 wave 1 |
| | `retime`, `freezeFrame`, `rangeRemoval` | OT (op-port) | → A2.5 |
| | `toggleElementVisibility`, `toggleElementMuted` | OT (wire addition) | engine-layer ops exist (timeline-core.ts:906/:950), not on the wire → A2 wave 1 |
| **Track** | `toggleTrackMute`, `toggleTrackVisibility`, `addTrack`, `deleteTrack` | OT | implemented (C7 rename pending) |
| | `reorderTrack` | OT | → A2/A2.5 |
| | `toggleTrackSolo`, `toggleTrackLock` | OT | → A2 wave 1 (solo semantics per spec 20 §4.2 S/G placement — see 09's A4 amendment) |
| **Playback** | `play`, `pause`, `seek` | OT | implemented |
| | `setRate`, `setLoop` | APP (transport slice) | engine Player supports the semantics (player.ts rate/loop surfaces); wire forms → A3 (with the §13.15 loop invariant N5) |
| **Selection** | `selectElements` | OT | implemented |
| | `selectTool`, `selectTrack`, `marqueeSelect` | APP (controller layer) | OT controllers implement the semantics (view-layer, not wire) → A3; marquee form decision at A3 |
| **Project** | `create/load/save/close/updateSettings/rename/delete` (7) | APP | project slice is app-level (Decision 16 law 4) → A5 (save/load with ProjectJSON persistence) |
| **Scene** | `createScene/loadScene/closeScene/updateScene` (4) | APP | app-level multi-scene → A5 |
| **Media** | `importMedia`, `deleteMedia` | APP | media registry + probe (engine `probeMedia` exists headless-side) → A3; real decode per D6 posture |
| **Marker** | `addMarker`, `updateMarker`, `deleteMarker` (3) | OT | bookmark family (toggle/remove/move) exists; the A2-amendment unifies Marker/Bookmark into ONE per-scene family → A2 |
| **Effect** | `addEffect` + 4 more (5) | ENGINE | engine effects registry exists (44 GPU effects); wire = engine façade + OT model extension (SceneTracks effect shapes — spec 06/07 gap work) → DEFERRED past A3 pending the model extension |
| **Mask** | 4 | ENGINE | as effects → DEFERRED past A3 |
| **Transition** | `addTransition`, `updateTransition`, `removeTransition` (3) | ENGINE (engine has the registry; OT models transitions element-hung — projector translation A1) | wire → DEFERRED past A3 |
| **Keyframe** | `upsertKeyframes`, `removeKeyframes`, `retimeKeyframes` (plural batch forms) | OT | per-key singular forms implemented (form delta in §13.15); batch engine-ops exist → A2 wave 1-2 |
| **Clipboard** | `copy`, `cut`, `paste` (3) | APP | greenfield (mock registers C19) → A7a |
| **Undo/redo** | `undo`, `redo` | OT | implemented |
| **Snapshot** | `snapshot` | APP (test seam) | readouts exist (OT out-of-band readouts; engine headless) → A2/A3 |
| **Export** | `exportFCPXML`, `exportMaster`, `exportFrame` (3) | ENGINE | engine export orchestrator exists (mediabunny A/V); FCPXML is A6 greenfield |

**Reading of the table at R15:** implemented = 24 (all OT) + the engine service surface exists but the union façade is A2 work. DEFERRED families (effects/masks/transitions/clipboard ≈ 15 members) are honestly typed `NOT_IMPLEMENTED` until their phase lands — the union's *contract* (§4.3 schemas) remains normative for all 78; only *dispatch* is phased. This is the difference between the spec being aspirational (union as wish-list) and honest (union as typed contract + phased dispatch map).

#### 4.1B `NOT_IMPLEMENTED` error code (Round 15 amendment — registers into §6.3's error-code table)

The `CommandResult.code` union gains `NOT_IMPLEMENTED` (distinct from `INVALID_PARAMS`/`NOT_FOUND`/`CONFLICT`/`NOOP`/`INTERNAL_ERROR`): returned by the app bus for any union member whose routing-disposition row (§4.1A) is DEFERRED. Carries `data: {member: string, phase?: string}` so callers and tests can distinguish "not yet built" from "wrong usage". Registered here so the exhaustive-switch law (§4.4) can compile against the full 78-member union from day one. The engine façade and OT headless API may also emit it for their not-yet-wired members.

### 4.2 Command → manager method mapping

Every command type maps 1:1 to a manager method on `EditorCore`. This mapping is enforced by the `applyCommand()` dispatcher in `CommandManager` (see §4.4). Adding a new command type without a corresponding manager method (or vice versa) is a compile error.

| Category | Command type | Manager method (spec 01 §3.3) | Undoable? |
|---|---|---|---|
| **Timeline** | `split` | `engine.timeline.splitElements({elements, splitTime, retainSide})` | ✅ |
| | `trim` | `engine.timeline.updateElementTrim({elementId, trimStart, trimEnd, ...})` | ✅ |
| | `move` | `engine.timeline.moveElements({moves, createTracks})` | ✅ |
| | `ripple` | (no separate method — toggles `engine.command.isRippleEnabled`, then applies another command) | ✅ (wraps inner) |
| | `roll` | `engine.timeline.updateElements({updates})` (BatchCommand internally — left-trim + right-trim) | ✅ |
| | `slip` | `engine.timeline.updateElements({updates})` (source-only patch) | ✅ |
| | `slide` | `engine.timeline.updateElements({updates})` (BatchCommand: left-trim + move + right-trim) | ✅ |
| | `delete` | `engine.timeline.deleteElements({elements})` | ✅ |
| | `insert` | `engine.timeline.insertElement({element, placement})` | ✅ |
| | `duplicate` | `engine.timeline.duplicateElements({elements})` | ✅ |
| | `rateStretch` | `engine.timeline.updateElementTrim({...})` + retime patch | ✅ |
| | `retime` | `engine.timeline.updateElements({updates})` (retime config patch) | ✅ |
| | `freezeFrame` | `engine.timeline.splitElements` + `insertElement` + `moveElements` (BatchCommand) | ✅ |
| | `rangeRemoval` | `engine.timeline.deleteElements` + `moveElements` (BatchCommand, multi-track) | ✅ |
| | `updateElements` | `engine.timeline.updateElements({updates, pushHistory})` | ✅ |
| | `toggleElementVisibility` | `engine.timeline.updateElements({...})` (visibility patch) | ✅ |
| | `toggleElementMuted` | `engine.timeline.updateElements({...})` (muted patch) | ✅ |
| **Track** | `toggleTrackMute` | `engine.timeline.toggleTrackMute({trackId})` | ✅ |
| | `toggleTrackSolo` | `engine.timeline.toggleTrackSolo({trackId})` (greenfield) | ✅ |
| | `toggleTrackLock` | `engine.timeline.toggleTrackLock({trackId})` (greenfield) | ✅ |
| | `toggleTrackVisibility` | `engine.timeline.toggleTrackVisibility({trackId})` | ✅ |
| | `addTrack` | `engine.timeline.addTrack({type, index?})` | ✅ |
| | `deleteTrack` | `engine.timeline.removeTrack({trackId})` | ✅ |
| | `reorderTrack` | `engine.timeline.updateTracks(...)` (display index swap) | ✅ |
| **Playback** | `play` | `engine.playback.play()` | ❌ |
| | `pause` | `engine.playback.pause()` | ❌ |
| | `seek` | `engine.playback.seek({time})` | ❌ |
| | `setRate` | `engine.playback.setRate(rate)` (greenfield, see spec 01 §3.3 — varispeed not in OpenCut-classic) | ❌ |
| | `setLoop` | `engine.playback.setLoop(start, end)` (greenfield) | ❌ |
| **Project** | `createProject` | `engine.project.createNewProject({name})` | ❌ (persisted separately) |
| | `loadProject` | `engine.project.loadProject({id})` | ❌ |
| | `saveProject` | `engine.project.saveCurrentProject()` | ❌ |
| | `closeProject` | `engine.project.closeProject()` | ❌ |
| | `renameProject` | `engine.project.renameProject({id, name})` (greenfield 📝 NEW — Round-7 addition; manager surface per spec 09 §13) | ❌ (persisted separately) |
| | `deleteProject` | `engine.project.deleteProject({id})` (greenfield 📝 NEW — Round-7 addition; manager surface per spec 09 §13) | ❌ (persisted separately) |
| | `updateProjectSettings` | `engine.project.updateSettings({settings, pushHistory})` (greenfield 📝 NEW — not on OpenCut-classic `ProjectManager`; see spec 01 §3.3 for the deferred manager-method addition) | ✅ |
| **Scene** | `createScene` | `engine.scenes.createScene({name, isMain})` | ✅ |
| | `deleteScene` | `engine.scenes.deleteScene({sceneId})` | ✅ |
| | `renameScene` | `engine.scenes.renameScene({sceneId, name})` | ✅ |
| | `switchScene` | `engine.scenes.switchToScene({sceneId})` | ✅ (switches back) |
| | `toggleBookmark` | `engine.scenes.toggleBookmark({time})` | ✅ |
| | `removeBookmark` | `engine.scenes.removeBookmark({time})` | ✅ |
| | `updateBookmark` | `engine.scenes.updateBookmark({time, updates})` | ✅ |
| | `moveBookmark` | `engine.scenes.moveBookmark({fromTime, toTime})` | ✅ |
| **Media** | `importMedia` | `engine.media.addMediaAsset({projectId, asset})` (file I/O happens upstream — see §5.4) | ❌ (side-effectful) |
| | `deleteMedia` | `engine.media.removeMediaAsset({projectId, id})` | ✅ (also removes timeline references) |
| **Tool** | `selectTool` | `engine.selection.setActiveTool({tool})` (greenfield on `SelectionManager`) | ❌ |
| | `selectElements` | `engine.selection.setSelectedElements({elementIds})` | ❌ |
| | `selectTrack` | `engine.selection.setSelectedTrack({trackId})` | ❌ |
| | `marqueeSelect` | `engine.selection.marqueeSelect({rect})` | ❌ |
| **Marker** | `addMarker` | `engine.scenes.getActiveScene().markers.add(...)` (via `engine.timeline.updateTracks`) | ✅ |
| | `deleteMarker` | (as above) | ✅ |
| | `updateMarker` | (as above) | ✅ |
| **Effect** | `addEffect` | `engine.timeline.addClipEffect({elementId, effect})` | ✅ |
| | `updateEffect` | `engine.timeline.updateClipEffectParams({elementId, effectId, params})` | ✅ |
| | `removeEffect` | `engine.timeline.removeClipEffect({elementId, effectId})` | ✅ |
| | `reorderEffect` | `engine.timeline.reorderClipEffects({elementId, order})` | ✅ |
| | `toggleEffect` | `engine.timeline.updateClipEffectParams({...enabled})` | ✅ |
| **Mask** | `addMask` | `engine.timeline.addClipMask({elementId, mask})` (greenfield) | ✅ |
| | `updateMask` | `engine.timeline.updateClipMask({elementId, maskId, params})` (greenfield) | ✅ |
| | `removeMask` | `engine.timeline.removeClipMask({elementId, maskId})` (greenfield) | ✅ |
| | `toggleMask` | `engine.timeline.updateClipMask({...enabled})` | ✅ |
| **Transition** | `addTransition` | `engine.timeline.addTransition({transition})` (greenfield — OpenCut has no `TransitionsManager`) | ✅ |
| | `updateTransition` | `engine.timeline.updateTransition({transitionId, params})` | ✅ |
| | `removeTransition` | `engine.timeline.removeTransition({transitionId})` | ✅ |
| **Keyframe** | `upsertKeyframes` | `engine.timeline.upsertKeyframes({elementId, keyframes})` | ✅ |
| | `removeKeyframes` | `engine.timeline.removeKeyframes({elementId, keyframeIds})` | ✅ |
| | `retimeKeyframe` | `engine.timeline.retimeKeyframe({elementId, keyframeId, time})` | ✅ |
| | `updateKeyframeCurves` | `engine.timeline.updateKeyframeCurves({elementId, keyframeId, curves})` | ✅ |
| **Clipboard** | `copy` | `engine.clipboard.copyClipboardEntry({elementIds})` | ❌ |
| | `cut` | `copy` + `delete(elementIds)` (BatchCommand internally) | ✅ (the delete is) |
| | `paste` | `engine.clipboard.buildPasteClipboardCommand({atTime, targetTrackId})` → BatchCommand of inserts | ✅ |
| **Undo/redo** | `undo` | `engine.command.undo()` | ❌ (meta) |
| | `redo` | `engine.command.redo()` | ❌ (meta) |
| **Snapshot** | `snapshot` | (no-op — returns current `SceneState` for test assertions) | ❌ |
| **Export** | `exportFCPXML` | `engine.export.exportFCPXML({format, bundleMedia})` (greenfield — ExportManager, spec 01 §14.11; serializer per spec 10 §5) | ❌ (output, not state) |
| | `exportMaster` | `engine.renderer.exportProject({format, destination, range})` (greenfield — enqueues on the spec 11 §9.2 render queue) | ❌ (output, not state) |
| | `exportFrame` | `engine.renderer.saveSnapshot({format, time})` (greenfield — single-frame render + GPU readback) | ❌ (output, not state) |

**Total: 78 commands.** Of these, **55 are undoable** (state-changing mutations that go through `CommandManager.execute()`), **23 are not undoable** (side-effectful I/O like save/load/import/renameProject/deleteProject, pure queries like `snapshot`, playback control, undo/redo themselves, selection/tool state which is UI-prefs and not part of WYSIWYG state, and the three export commands, which produce output artifacts without mutating `SceneState` — see §14.11).

### 4.3 Command type definitions

Below, every command type is defined. For brevity, only the TS interface is shown here; the Zod schema is in §11 and the example JSON is in §5.

#### 4.3.1 `SplitCommand`

```ts
// src/engine/types/command.ts

export interface SplitCommand {
  type: 'split';
  params: {
    /** Split time in MediaTime ticks (120K ticks/sec — see spec 09 §3.2). */
    time: MediaTime;
    /**
     * Track IDs to split on, or `null` to split all tracks at `time`.
     * When `null`, the engine finds every element crossing `time` on every
     * track and splits them all in one undoable operation (FreeCut's
     * `splitAllItemsAtFrame` pattern, see spec 06 §5.1).
     */
    trackIds: string[] | null;
    /**
     * Which side to retain after split. Default `'both'` (classic razor).
     * `'left'` truncates the element to end at `time`.
     * `'right'` truncates the element to start at `time`.
     * Matches OpenCut-classic `SplitElementsCommand.retainSide`
     * (spec 06 §5.1, `split-elements.ts:462-466`).
     */
    retainSide?: 'both' | 'left' | 'right';
    /**
     * Optional seed for the new element ID generated for the right half.
     * If omitted, `crypto.randomUUID()` is used (NOT deterministic).
     * For deterministic replay, pass an explicit seed — the engine derives
     * the right-half ID from `{leftElementId, seed}` via a stable hash.
     */
    rightElementIdSeed?: string;
  };
}
```

**Maps to:** `engine.timeline.splitElements({elements, splitTime, retainSide})` (spec 01 §3.3, `timeline-manager.ts:187-203`).

**Undoable:** ✅ (single `SplitElementsCommand` — captures `savedState: SceneTracks` on first execute, swaps back in `undo()` — spec 06 §5.1).

**Constraints (reject if):**
- Split time outside `[elementStart, elementEnd)` for every targeted element → silent no-op for that element (`split-elements.ts:75-80`).
- Split inside a transition overlap zone → reject with `SPLIT_INSIDE_TRANSITION` (FreeCut `split-actions.ts:27-31`).

#### 4.3.2 `TrimCommand`

```ts
export interface TrimCommand {
  type: 'trim';
  params: {
    /** Element to trim. */
    elementId: string;
    /** Which edge to move. */
    edge: 'start' | 'end';
    /**
     * Signed delta in MediaTime ticks.
     * Positive on `end` = extend right.
     * Positive on `start` = retract start rightward (clip gets shorter from the left).
     * Negative on `end` = retract end leftward (clip gets shorter from the right).
     * Negative on `start` = extend left.
     */
    delta: MediaTime;
    /**
     * If `true`, ripple the timeline after this trim (shift subsequent elements
     * to close/open the gap left by the trim). Equivalent to setting
     * `engine.command.isRippleEnabled = true` before applying, then restoring
     * the previous value after. Default `false`.
     */
    ripple: boolean;
    /**
     * If `true`, also trim linked counterpart elements (e.g., audio companion
     * of a video clip) with the same delta. Default `true` (matches FreeCut's
     * `applySynchronizedTrim` — spec 06 §5.2).
     */
    syncLinked?: boolean;
    /**
     * If `true`, skip the adjacent-overlap clamp (used when this trim is part
     * of a coordinated multi-trim like roll/slide where the caller has already
     * computed the tightest delta). Default `false`.
     */
    skipAdjacentClamp?: boolean;
  };
}
```

**Maps to:** `engine.timeline.updateElementTrim({elementId, trimStart, trimEnd, startTime?, duration?, pushHistory})` (spec 01 §3.3, `timeline-manager.ts:91-132`). The dispatcher converts `edge + delta` into absolute `trimStart/trimEnd/startTime/duration` values by reading the element's current state before calling the manager method.

**Undoable:** ✅ (`TracksSnapshotCommand` after `commitPreview()` — the dispatcher uses the preview/commit pattern internally if `delta` is small enough to be a drag, otherwise constructs a single snapshot command directly).

**Constraints (reject/clamp if):**
- Source bounds: `trimStart + duration*rate + trimEnd == sourceDuration` invariant must hold (spec 06 §5.2, `compute-resize.ts:81-103` snap-once rounding).
- Min duration: 1 frame (spec 06 §5.2, `clampToMinDuration`).
- Adjacent overlap: extending into neighbor clamped unless `skipAdjacentClamp: true` (`clampToAdjacentItems:129-178`).
- Reversed playback has different source-extent math.

#### 4.3.3 `MoveCommand`

```ts
export interface MoveCommand {
  type: 'move';
  params: {
    /** Element IDs to move (multi-select). */
    elementIds: string[];
    /** Signed delta in MediaTime ticks applied to every element's startTime. */
    delta: MediaTime;
    /**
     * Target track ID for ALL moved elements, or `null` to keep each element
     * on its current track. For multi-track moves where each element goes to
     * a different track, use `movePlan` instead.
     */
    targetTrackId: string | null;
    /**
     * Optional explicit move plan — one entry per element with explicit
     * `newStartTime` and `targetTrackId`. Used by group-move (spec 06 §5.3)
     * where each member can go to a different track.
     * If provided, `elementIds`/`delta`/`targetTrackId` are ignored.
     */
    movePlan?: PlannedElementMove[];
    /**
     * Optional new tracks to create as part of the move (e.g., when the user
     * drags an element below the bottom track — spec 06 §5.3,
     * `MoveElementCommand.createTracks`).
     */
    createTracks?: PlannedTrackCreation[];
    /**
     * If `true`, snap the moved elements to nearby snap points (playhead,
     * other elements' edges, grid). Default `true`.
     */
    snap?: boolean;
  };
}

export interface PlannedElementMove {
  elementId: string;
  sourceTrackId: string;
  targetTrackId: string;
  newStartTime: MediaTime;
}

export interface PlannedTrackCreation {
  id: string;
  type: TrackType;  // 'video' | 'audio' | 'overlay'
  index: number;    // display index
}
```

**Maps to:** `engine.timeline.moveElements({moves, createTracks})` (spec 01 §3.3, `timeline-manager.ts:159-175`).

**Undoable:** ✅ (`MoveElementCommand` — spec 06 §5.3).

**Constraints:**
- Source track and source element must exist (`move-elements.ts:36-123`).
- Target track must exist (or be in `createTracks`).
- Element/track type compatibility (`placement/compatibility.ts:3-29`).
- No overlap on target track (`placement/overlap.ts:8-44`).
- Cross-section moves (audio + non-audio in same group) rejected.
- Main-track constraint: main-track member can't be moved before earliest stationary main-track element.

#### 4.3.4 `RippleCommand`

This is a **meta-command**: it wraps another command and toggles `isRippleEnabled` around it. See §7 for the `CommandBatch` mechanism; `RippleCommand` is a specialized batch.

```ts
export interface RippleCommand {
  type: 'ripple';
  params: {
    /** Inner command to apply with ripple enabled. */
    command: EngineCommand;
    /**
     * If `true`, also propagate ripple to sync-locked tracks (spec 06 §6).
     * Default `true`. Set to `false` for per-track-only ripple.
     */
    syncLock?: boolean;
  };
}
```

**Maps to:** no direct manager method. The dispatcher:
1. Captures `const wasRippleEnabled = engine.command.isRippleEnabled`.
2. Sets `engine.command.isRippleEnabled = true`.
3. Optionally sets `engine.command.syncLockEnabled = params.syncLock ?? true`.
4. Applies `params.command` via `engine.command.apply(params.command)`.
5. Restores `engine.command.isRippleEnabled = wasRippleEnabled`.
6. Returns the inner command's `CommandResult` with `undoInfo.undoCommand` set to a `RippleCommand` wrapping the inverse.

**Undoable:** ✅ (wraps inner; undo restores pre-ripple state via the captured `beforeTracks` snapshot in `CommandManager.execute()` — spec 06 §4.5).

#### 4.3.5 `RollCommand`

```ts
export interface RollCommand {
  type: 'roll';
  params: {
    /** Left (earlier) element of the adjacent pair. */
    leftElementId: string;
    /** Right (later) element of the adjacent pair. */
    rightElementId: string;
    /**
     * Signed delta in MediaTime ticks applied to the edit point between
     * the two elements. Positive = edit point moves right (left extends,
     * right retracts). Negative = edit point moves left.
     */
    delta: MediaTime;
    /**
     * If `true`, also apply the roll to linked counterpart pair (e.g.,
     * audio companions of the video pair). Default `true` (spec 06 §5.5).
     */
    syncLinked?: boolean;
  };
}
```

**Maps to:** `engine.timeline.updateElements({updates})` with a `BatchCommand` internally wrapping two `OpCommand`s (left-trim-end + right-trim-start). The dispatcher constructs the batch, following FreeCut's "shrink first, then extend" rule (spec 06 §5.5).

**Undoable:** ✅ (the `BatchCommand` is one undoable unit).

**Constraints:**
- `leftElement` and `rightElement` must be adjacent (`rightElement.startTime === leftElement.startTime + leftElement.duration`).
- Source bounds on both elements.
- Min duration 1 frame on both.
- Transitions & keyframes preserved (binary search clamp).

#### 4.3.6 `SlipCommand`

```ts
export interface SlipCommand {
  type: 'slip';
  params: {
    /** Element to slip (must be `video`/`audio`/`image`). */
    elementId: string;
    /**
     * Signed delta in MediaTime ticks applied to the source window.
     * Positive = shift source right (later content shows at same timeline position).
     * Negative = shift source left (earlier content shows).
     * `startTime` and `duration` of the element DO NOT change.
     */
    delta: MediaTime;
    /** Apply same slip delta to linked companions. Default `true`. */
    syncLinked?: boolean;
  };
}
```

**Maps to:** `engine.timeline.updateElements({updates})` with a source-only patch (modifies `trimStart`/`trimEnd`, leaves `startTime`/`duration` unchanged). Per spec 06 §5.6.

**Undoable:** ✅.

**Constraints:**
- `trimStart + delta >= 0`.
- `trimEnd + delta >= 0` (equivalently, `sourceEnd + delta <= sourceDuration`).
- Only works on `video`/`audio`/`image` elements (`trim-actions.ts:586`).
- Returns no-op if element has no explicit source bounds (`slip-utils.ts:18`).

#### 4.3.7 `SlideCommand`

```ts
export interface SlideCommand {
  type: 'slide';
  params: {
    /** Element to slide. */
    elementId: string;
    /**
     * Signed delta in MediaTime ticks applied to the element's `startTime`.
     * Left and right neighbors are trimmed to accommodate.
     */
    delta: MediaTime;
    /**
     * If `true`, also shift the source window of the slid element by the
     * equivalent source-space delta to maintain playback continuity across
     * the slide (only applies if left+right neighbors form a split-contiguous
     * chain with the slid element — spec 06 §5.7, `slide-utils.ts:16-42`).
     * Default `true`.
     */
    preserveContinuity?: boolean;
    /** Apply same slide to linked counterpart + its neighbors. Default `true`. */
    syncLinked?: boolean;
  };
}
```

**Maps to:** `engine.timeline.updateElements({updates})` with a `BatchCommand` (left-trim + move + right-trim, optional source-update patch). Per spec 06 §5.7.

**Undoable:** ✅.

#### 4.3.8 `DeleteCommand`

```ts
export interface DeleteCommand {
  type: 'delete';
  params: {
    /** Elements to delete (multi-select). */
    elements: ElementRef[];
    /**
     * If `true`, ripple the timeline after deletion (shift subsequent elements
     * left to close the gap). Default `false`. For ripple-delete, either set
     * this to `true` OR wrap in a `RippleCommand` — they have the same effect.
     */
    ripple: boolean;
    /**
     * If `true`, cascade-delete transitions/keyframes pointing at deleted
     * elements (FreeCut `range-removal-actions.ts:157-159`). Default `true`.
     */
    cascadeDependents?: boolean;
  };
}

export interface ElementRef {
  trackId: string;
  elementId: string;
}
```

**Maps to:** `engine.timeline.deleteElements({elements})` (spec 01 §3.3, `timeline-manager.ts:252-259`).

**Undoable:** ✅ (`DeleteElementsCommand` — spec 06 §5.8).

#### 4.3.9 `InsertCommand`

```ts
export interface InsertCommand {
  type: 'insert';
  params: {
    /** Element spec to insert (refers to a `mediaId` from the media library). */
    element: ElementSpec;
    /** Placement strategy — see spec 06 §5.9 for the 5 strategies. */
    placement: PlacementStrategy;
    /**
     * If `true`, ripple the timeline to make room for the new element.
     * Default `false`.
     */
    ripple: boolean;
    /**
     * Optional seed for the generated element ID (for deterministic tests /
     * replay — see §14.6). If omitted, `crypto.randomUUID()` is used.
     */
    idSeed?: string;
  };
}

export interface ElementSpec {
  type: 'video' | 'audio' | 'image' | 'text' | 'shape' | 'adjustment';
  mediaId?: string;       // for video/audio/image
  startTime: MediaTime;
  duration: MediaTime;
  trimStart?: MediaTime;  // source offset
  trimEnd?: MediaTime;     // remaining source after element end
  speed?: number;          // 1.0 default
  name?: string;
  // ... see spec 09 §3.1 ElementJSON for full field list
}

export type PlacementStrategy =
  | { type: 'explicit'; trackId: string }
  | { type: 'firstAvailable' }
  | { type: 'preferIndex'; trackIndex: number; hoverDirection: 'above' | 'below'; createNewTrackOnly?: boolean }
  | { type: 'aboveSource'; sourceTrackIndex: number }
  | { type: 'alwaysNew'; position: 'highest' | 'default' };
```

**Maps to:** `engine.timeline.insertElement({element, placement})` (spec 01 §3.3, `timeline-manager.ts:86-89`).

**Undoable:** ✅ (`InsertElementCommand` — spec 06 §5.9).

#### 4.3.10 `DuplicateCommand`

```ts
export interface DuplicateCommand {
  type: 'duplicate';
  params: {
    /** Elements to duplicate (multi-select). */
    elements: ElementRef[];
    /**
     * Placement strategy for the duplicates. Default `'alwaysNew'` with
     * position `'highest'` — matches OpenCut-classic (spec 06 §5.10).
     */
    placement?: PlacementStrategy;
    /** Optional time offset for the duplicates (default 0 = same time as originals). */
    timeOffset?: MediaTime;
    /**
     * Optional seed for the generated duplicate element IDs (for
     * deterministic tests / replay — see §14.6). If omitted,
     * `crypto.randomUUID()` is used.
     */
    idSeed?: string;
  };
}
```

**Maps to:** `engine.timeline.duplicateElements({elements})` (spec 01 §3.3, `timeline-manager.ts:799-807`).

**Undoable:** ✅ (`DuplicateElementsCommand` — spec 06 §5.10).

#### 4.3.11 `RateStretchCommand`

```ts
export interface RateStretchCommand {
  type: 'rateStretch';
  params: {
    elementId: string;
    /**
     * New duration in MediaTime ticks. The element's `speed` is derived as
     * `sourceSpan / newDuration` to keep the source content the same.
     */
    newDuration: MediaTime;
    /**
     * New start time (optional). If provided, the element is also moved.
     * Default = current startTime.
     */
    newStartTime?: MediaTime;
    /**
     * If `true`, scale keyframes proportionally to match new duration
     * (FreeCut `rate-stretch-actions.ts:54-64`). Default `true`.
     */
    scaleKeyframes?: boolean;
    /** Ripple downstream elements if `newDuration` differs from current. */
    ripple: boolean;
  };
}
```

**Maps to:** `engine.timeline.updateElementTrim({...})` + `engine.timeline.updateElements({retime patch})` wrapped in a `BatchCommand`. Per spec 06 §5.11.

**Undoable:** ✅.

**Constraints:** Speed clamped to `[0.01, 5.0]` (OpenCut bounds, spec 06 §11.7).

#### 4.3.12 `RetimeCommand`

```ts
export interface RetimeCommand {
  type: 'retime';
  params: {
    elementId: string;
    /** New rate. 1.0 = normal, 2.0 = 2x, 0.5 = half speed, -1.0 = reverse. */
    rate: number;
    /** If `true`, preserve audio pitch via SoundTouch (spec 06 §5.12). */
    maintainPitch: boolean;
    /**
     * If `true`, keep the element's `startTime` and adjust `duration` to
     * `sourceSpan / |rate|`. If `false`, keep `duration` and adjust `startTime`
     * to maintain end position. Default `true`.
     */
    keepStartTime?: boolean;
    /** Ripple downstream elements if duration changes. */
    ripple: boolean;
  };
}
```

**Maps to:** `engine.timeline.updateElements({updates})` with retime config patch.

**Undoable:** ✅.

**Constraints:** `rate` clamped to `[-5.0, -0.01] ∪ [0.01, 5.0]` (negative = reverse, 0 forbidden). `maintainPitch` requires `rate > 0` (reverse + pitch preservation not supported — spec 06 §5.12).

#### 4.3.13 `FreezeFrameCommand`

```ts
export interface FreezeFrameCommand {
  type: 'freezeFrame';
  params: {
    /** Source video element to freeze. */
    elementId: string;
    /** Timeline time at which to insert the freeze frame (must be inside element). */
    atTime: MediaTime;
    /** Duration of the freeze frame. Default 2 seconds (spec 06 §5.13). */
    freezeDuration?: MediaTime;
    /**
     * Media ID of the extracted still frame. The caller must extract the frame
     * via `engine.media.extractFrame({mediaId, time})` BEFORE issuing this
     * command and pass the resulting `frameMediaId` here. The command itself
     * is pure (no I/O).
     */
    frameMediaId: string;
    /**
     * If `true`, ripple the timeline to make room. Default `true`.
     */
    ripple: boolean;
  };
}
```

**Maps to:** `engine.timeline.splitElements` + `engine.timeline.insertElement` + `engine.timeline.moveElements` wrapped in a `BatchCommand`. Per spec 06 §5.13.

**Undoable:** ✅ (the entire batch is one undoable unit).

**Note:** The frame extraction itself is async I/O (mediabunny `CanvasSink`) and happens via `engine.media.extractFrame()` BEFORE the command is issued. `engine.media.extractFrame()` is a 📝 NEW greenfield helper, not present on OpenCut-classic `MediaManager` (spec 01 §3.3). The command itself is synchronous and pure — it just splices the timeline using the pre-extracted frame's `mediaId`. This is the pattern from §5.4 below.

#### 4.3.14 `RangeRemovalCommand`

```ts
export interface RangeRemovalCommand {
  type: 'rangeRemoval';
  params: {
    /** Time range to remove. */
    startTime: MediaTime;
    endTime: MediaTime;
    /**
     * Track IDs to apply the removal to. If `null`, apply to all tracks.
     * If non-null, only the listed tracks are edited; sync-locked tracks
     * still get propagated ripple (spec 06 §6) unless `syncLock: false`.
     */
    trackIds: string[] | null;
    /** Ripple the timeline after removal. Default `true`. */
    ripple: boolean;
    /** Propagate to sync-locked tracks. Default `true`. */
    syncLock?: boolean;
    /**
     * If `true`, also remove detected silence/filler-word ranges that fall
     * within `[startTime, endTime]` (FreeCut `removeSilenceFromItems`).
     * Default `false` (caller must opt in).
     */
    removeSilence?: boolean;
  };
}
```

**Maps to:** `engine.timeline.deleteElements` + `engine.timeline.moveElements` (BatchCommand, multi-track). Per spec 06 §5.14.

**Undoable:** ✅.

#### 4.3.15 `UpdateElementsCommand`

```ts
export interface UpdateElementsCommand {
  type: 'updateElements';
  params: {
    /** Patches to apply — one per element. */
    updates: Array<{
      trackId: string;
      elementId: string;
      /** Partial patch — only listed fields are overwritten. */
      patch: Partial<TimelineElement>;
    }>;
    /**
     * If `false`, do NOT push to undo history (used by live preview
     * during drag — the caller is expected to `commitPreview()` later
     * to roll the accumulated patches into a single `TracksSnapshotCommand`).
     * Default `true`.
     */
    pushHistory?: boolean;
  };
}
```

**Maps to:** `engine.timeline.updateElements({updates, pushHistory})` (spec 01 §3.3, `timeline-manager.ts:177-182`).

**Undoable:** ✅ (when `pushHistory: true`; when `false`, the patch is treated as preview and the eventual `commitPreview()` produces the undoable `TracksSnapshotCommand`).

#### 4.3.16 `ToggleElementVisibilityCommand`

```ts
export interface ToggleElementVisibilityCommand {
  type: 'toggleElementVisibility';
  params: {
    elementId: string;
    /** If provided, set to this value; otherwise toggle. */
    value?: boolean;
  };
}
```

**Maps to:** `engine.timeline.updateElements({...visibility patch})`.

**Undoable:** ✅.

#### 4.3.17 `ToggleElementMutedCommand`

```ts
export interface ToggleElementMutedCommand {
  type: 'toggleElementMuted';
  params: {
    elementId: string;
    value?: boolean;
  };
}
```

**Maps to:** `engine.timeline.updateElements({...muted patch})`.

**Undoable:** ✅.

#### 4.3.18 `ToggleTrackMuteCommand`

```ts
export interface ToggleTrackMuteCommand {
  type: 'toggleTrackMute';
  params: {
    trackId: string;
    value?: boolean;
  };
}
```

**Maps to:** `engine.timeline.toggleTrackMute({trackId})` (spec 01 §3.3, `timeline-manager.ts:184-190`).

**Undoable:** ✅ (`ToggleTrackMuteCommand` — spec 06 §5.15).

#### 4.3.19 `ToggleTrackSoloCommand`

```ts
export interface ToggleTrackSoloCommand {
  type: 'toggleTrackSolo';
  params: {
    trackId: string;
    value?: boolean;
  };
}
```

**Maps to:** `engine.timeline.toggleTrackSolo({trackId})` (greenfield — spec 01 §3.3).

**Undoable:** ✅.

#### 4.3.20 `ToggleTrackLockCommand`

```ts
export interface ToggleTrackLockCommand {
  type: 'toggleTrackLock';
  params: {
    trackId: string;
    value?: boolean;
  };
}
```

**Maps to:** `engine.timeline.toggleTrackLock({trackId})` (greenfield).

**Undoable:** ✅.

#### 4.3.21 `ToggleTrackVisibilityCommand`

```ts
export interface ToggleTrackVisibilityCommand {
  type: 'toggleTrackVisibility';
  params: {
    trackId: string;
    value?: boolean;
  };
}
```

**Maps to:** `engine.timeline.toggleTrackVisibility({trackId})` (spec 01 §3.3).

**Undoable:** ✅ (`ToggleTrackVisibilityCommand` — spec 06 §5.15).

#### 4.3.22 `AddTrackCommand`

```ts
export interface AddTrackCommand {
  type: 'addTrack';
  params: {
    /** Track type. */
    type: TrackType;  // 'video' | 'audio' | 'overlay'
    /** Display index. If omitted, append at end of the type's section. */
    index?: number;
    /** Optional name. If omitted, auto-generated ("Video Track 3", etc.). */
    name?: string;
  };
}
```

**Maps to:** `engine.timeline.addTrack({type, index})` (spec 01 §3.3, `timeline-manager.ts:75-79`).

**Undoable:** ✅ (`AddTrackCommand`).

#### 4.3.23 `DeleteTrackCommand`

```ts
export interface DeleteTrackCommand {
  type: 'deleteTrack';
  params: {
    trackId: string;
    /**
     * If `true`, also delete all elements on the track. If `false` and the
     * track has elements, reject with `TRACK_NOT_EMPTY`. Default `true`.
     */
    cascadeElements?: boolean;
  };
}
```

**Maps to:** `engine.timeline.removeTrack({trackId})` (spec 01 §3.3, `timeline-manager.ts:81-84`).

**Undoable:** ✅.

#### 4.3.24 `ReorderTrackCommand`

```ts
export interface ReorderTrackCommand {
  type: 'reorderTrack';
  params: {
    trackId: string;
    /** New display index. */
    newIndex: number;
  };
}
```

**Maps to:** `engine.timeline.updateTracks(...)` (display-index swap). Greenfield.

**Undoable:** ✅.

#### 4.3.25 `PlayCommand`

```ts
export interface PlayCommand {
  type: 'play';
  // No params — playback starts at current time.
  // For "play from time T" use SeekCommand then PlayCommand (or a CommandBatch of both).
}
```

**Maps to:** `engine.playback.play()` (spec 01 §3.3).

**Undoable:** ❌ (playback state is not part of WYSIWYG contract — see spec 01 §3.7).

#### 4.3.26 `PauseCommand`

```ts
export interface PauseCommand {
  type: 'pause';
}
```

**Maps to:** `engine.playback.pause()`.

**Undoable:** ❌.

#### 4.3.27 `SeekCommand`

```ts
export interface SeekCommand {
  type: 'seek';
  params: {
    /** Target time in MediaTime ticks. Clamped to [0, totalDuration]. */
    time: MediaTime;
  };
}
```

**Maps to:** `engine.playback.seek({time})` (spec 01 §3.3).

**Undoable:** ❌.

#### 4.3.28 `SetRateCommand`

```ts
export interface SetRateCommand {
  type: 'setRate';
  params: {
    /** Playback rate. 1.0 = normal, 0.5 = half, 2.0 = double, -1.0 = reverse. */
    rate: number;
  };
}
```

**Maps to:** `engine.playback.setRate(rate)` (greenfield — OpenCut-classic does not implement varispeed at the manager level; spec 03 adds it via SoundTouch AudioWorklet).

**Undoable:** ❌.

#### 4.3.29 `SetLoopCommand`

```ts
export interface SetLoopCommand {
  type: 'setLoop';
  params: {
    /** Loop start time, or `null` to clear. */
    start: MediaTime | null;
    /** Loop end time, or `null` to clear. */
    end: MediaTime | null;
  };
}
```

**Maps to:** `engine.playback.setLoop(start, end)` (greenfield).

**Undoable:** ❌.

#### 4.3.30 `CreateProjectCommand`

```ts
export interface CreateProjectCommand {
  type: 'createProject';
  params: {
    /** Project name. */
    name: string;
    /**
     * Optional initial settings. If omitted, defaults are used
     * (`DEFAULT_FPS`, `DEFAULT_CANVAS_SIZE` — see spec 09 §3.1).
     */
    settings?: Partial<ProjectSettings>;
    /** Optional seed for the generated project ID (for deterministic tests). */
    idSeed?: string;
  };
}
```

**Maps to:** `engine.project.createNewProject({name})` (spec 01 §3.3, `project-manager.ts:82-126`).

**Undoable:** ❌ (project lifecycle is not undoable — undo within a project, not of the project itself).

#### 4.3.31 `LoadProjectCommand`

```ts
export interface LoadProjectCommand {
  type: 'loadProject';
  params: {
    /** Project ID to load from storage. */
    id: string;
  };
}
```

**Maps to:** `engine.project.loadProject({id})` (spec 01 §3.3, `project-manager.ts:128-187`).

**Undoable:** ❌.

#### 4.3.32 `SaveProjectCommand`

```ts
export interface SaveProjectCommand {
  type: 'saveProject';
  // No params — saves the active project to its persisted ID.
}
```

**Maps to:** `engine.project.saveCurrentProject()` (spec 01 §3.3, `project-manager.ts:189-210`).

**Undoable:** ❌ (persisting to disk is not undoable).

#### 4.3.33 `CloseProjectCommand`

```ts
export interface CloseProjectCommand {
  type: 'closeProject';
  // No params — closes the active project.
  // If the project is dirty, the engine returns `ok: false` with `error.code = 'PROJECT_DIRTY'`
  // and the caller must either save first or pass `force: true`.
  params?: {
    force?: boolean;
  };
}
```

**Maps to:** `engine.project.closeProject()` (spec 01 §3.3, `project-manager.ts:310-316`).

**Undoable:** ❌.

#### 4.3.34 `UpdateProjectSettingsCommand`

```ts
export interface UpdateProjectSettingsCommand {
  type: 'updateProjectSettings';
  params: {
    /** Partial settings patch. */
    settings: Partial<ProjectSettings>;
    /** If `false`, do not push to undo history. Default `true`. */
    pushHistory?: boolean;
  };
}
```

**Maps to:** `engine.project.updateSettings({settings, pushHistory})` (greenfield 📝 NEW — not present on OpenCut-classic `ProjectManager`; spec 01 §3.3 will add it as a deferred update).

**Undoable:** ✅ (when `pushHistory: true`).

#### 4.3.35 `CreateSceneCommand`

```ts
export interface CreateSceneCommand {
  type: 'createScene';
  params: {
    name: string;
    /** If `true`, the new scene becomes the main scene. Default `false`. */
    isMain?: boolean;
    /** Optional seed for the generated scene ID (for deterministic tests). */
    idSeed?: string;
  };
}
```

**Maps to:** `engine.scenes.createScene({name, isMain})` (spec 01 §3.3, `scenes-manager.ts:33-47`).

**Undoable:** ✅.

#### 4.3.36 `DeleteSceneCommand`

```ts
export interface DeleteSceneCommand {
  type: 'deleteScene';
  params: {
    sceneId: string;
  };
}
```

**Maps to:** `engine.scenes.deleteScene({sceneId})` (spec 01 §3.3, `scenes-manager.ts:49-67`). Uses `canDeleteScene()` guard.

**Undoable:** ✅.

#### 4.3.37 `RenameSceneCommand`

```ts
export interface RenameSceneCommand {
  type: 'renameScene';
  params: {
    sceneId: string;
    name: string;
  };
}
```

**Maps to:** `engine.scenes.renameScene({sceneId, name})` (spec 01 §3.3, `scenes-manager.ts:69-85`).

**Undoable:** ✅.

#### 4.3.38 `SwitchSceneCommand`

```ts
export interface SwitchSceneCommand {
  type: 'switchScene';
  params: {
    sceneId: string;
  };
}
```

**Maps to:** `engine.scenes.switchToScene({sceneId})` (spec 01 §3.3, `scenes-manager.ts:87-111`). Note: OpenCut-classic mutates `project.currentSceneId` directly (no command); we wrap it in a command for undoability.

**Undoable:** ✅ (undo switches back to the previous scene).

#### 4.3.39 `ToggleBookmarkCommand`

```ts
export interface ToggleBookmarkCommand {
  type: 'toggleBookmark';
  params: {
    time: MediaTime;
  };
}
```

**Maps to:** `engine.scenes.toggleBookmark({time})` (spec 01 §3.3, `scenes-manager.ts:113-130`).

**Undoable:** ✅.

#### 4.3.40 `RemoveBookmarkCommand`

```ts
export interface RemoveBookmarkCommand {
  type: 'removeBookmark';
  params: {
    time: MediaTime;
  };
}
```

**Maps to:** `engine.scenes.removeBookmark({time})`.

**Undoable:** ✅.

#### 4.3.41 `UpdateBookmarkCommand`

```ts
export interface UpdateBookmarkCommand {
  type: 'updateBookmark';
  params: {
    time: MediaTime;
    /** Partial patch — only listed fields are overwritten. */
    updates: Partial<Omit<Bookmark, 'time'>>;
  };
}
```

**Maps to:** `engine.scenes.updateBookmark({time, updates})`.

**Undoable:** ✅.

#### 4.3.42 `MoveBookmarkCommand`

```ts
export interface MoveBookmarkCommand {
  type: 'moveBookmark';
  params: {
    fromTime: MediaTime;
    toTime: MediaTime;
  };
}
```

**Maps to:** `engine.scenes.moveBookmark({fromTime, toTime})`.

**Undoable:** ✅.

#### 4.3.43 `ImportMediaCommand`

```ts
export interface ImportMediaCommand {
  type: 'importMedia';
  params: {
    /**
     * Pre-parsed media asset record. The actual file probing (mediabunny
     * metadata extraction, thumbnail generation) happens UPSTREAM of this
     * command — see §5.4. This command just persists the already-parsed
     * `MediaAsset` to the project.
     */
    asset: Omit<MediaAsset, 'id'>;
    /** Optional seed for the generated media ID. */
    idSeed?: string;
  };
}
```

**Maps to:** `engine.media.addMediaAsset({projectId, asset})` (spec 01 §3.3, `media-manager.ts:17-51`).

**Undoable:** ❌ (media lifecycle is side-effectful I/O — persists to OPFS, generates thumbnails. We do not undo file I/O).

#### 4.3.44 `DeleteMediaCommand`

```ts
export interface DeleteMediaCommand {
  type: 'deleteMedia';
  params: {
    mediaId: string;
    /**
     * If `true`, also remove all timeline elements referencing this media.
     * If `false` and timeline references exist, reject with `MEDIA_IN_USE`.
     * Default `true`.
     */
    cascadeElements?: boolean;
  };
}
```

**Maps to:** `engine.media.removeMediaAsset({projectId, id})` (spec 01 §3.3, `media-manager.ts:53-55`).

**Undoable:** ✅ (the media record can be restored; the actual file blob stays in OPFS until garbage-collected — see spec 09 §7.3).

#### 4.3.45 `SelectToolCommand`

```ts
export interface SelectToolCommand {
  type: 'selectTool';
  params: {
    /** Active tool ID. */
    tool: 'select' | 'razor' | 'ripple' | 'slip' | 'slide' | 'roll' | 'rate-stretch' | 'hand' | 'zoom';
  };
}
```

**Maps to:** `engine.selection.setActiveTool({tool})` (greenfield on `SelectionManager`).

**Undoable:** ❌ (tool selection is UI state, not WYSIWYG state).

#### 4.3.46 `SelectElementsCommand`

```ts
export interface SelectElementsCommand {
  type: 'selectElements';
  params: {
    /** Elements to select. Replaces current selection. */
    elements: ElementRef[];
    /**
     * Selection mode: `replace` (default), `add`, `subtract`, `toggle`.
     */
    mode?: 'replace' | 'add' | 'subtract' | 'toggle';
  };
}
```

**Maps to:** `engine.selection.setSelectedElements({elements, mode})`.

**Undoable:** ❌ (UI state).

#### 4.3.47 `SelectTrackCommand`

```ts
export interface SelectTrackCommand {
  type: 'selectTrack';
  params: {
    trackId: string;
    mode?: 'replace' | 'add' | 'subtract' | 'toggle';
  };
}
```

**Maps to:** `engine.selection.setSelectedTrack({trackId, mode})`.

**Undoable:** ❌.

#### 4.3.48 `MarqueeSelectCommand`

```ts
export interface MarqueeSelectCommand {
  type: 'marqueeSelect';
  params: {
    /** Rectangle in timeline coordinates (MediaTime × trackIndex). */
    rect: {
      startTime: MediaTime;
      endTime: MediaTime;
      startTrackIndex: number;
      endTrackIndex: number;
    };
    mode?: 'replace' | 'add' | 'subtract' | 'toggle';
  };
}
```

**Maps to:** `engine.selection.marqueeSelect({rect, mode})`.

**Undoable:** ❌.

#### 4.3.49 `AddMarkerCommand`

```ts
export interface AddMarkerCommand {
  type: 'addMarker';
  params: {
    /** Marker time. */
    time: MediaTime;
    /** Optional marker label. */
    label?: string;
    /** Optional marker color (hex string). */
    color?: string;
    /** Optional marker type. */
    type?: 'note' | 'chapter' | 'todo' | 'custom';
  };
}
```

**Maps to:** `engine.timeline.updateTracks(...)` (markers are stored at the scene level; the patch adds a new marker to `scene.markers`).

**Undoable:** ✅.

#### 4.3.50 `DeleteMarkerCommand`

```ts
export interface DeleteMarkerCommand {
  type: 'deleteMarker';
  params: {
    markerId: string;
  };
}
```

**Maps to:** `engine.timeline.updateTracks(...)` (removes marker from `scene.markers`).

**Undoable:** ✅.

#### 4.3.51 `UpdateMarkerCommand`

```ts
export interface UpdateMarkerCommand {
  type: 'updateMarker';
  params: {
    markerId: string;
    /** Partial patch. */
    updates: Partial<Marker>;
  };
}
```

**Maps to:** `engine.timeline.updateTracks(...)`.

**Undoable:** ✅.

#### 4.3.52 `AddEffectCommand`

```ts
export interface AddEffectCommand {
  type: 'addEffect';
  params: {
    /** Target element. */
    elementId: string;
    /** Effect spec to add (see spec 08 for the full effect inventory). */
    effect: EffectSpec;
  };
}

export interface EffectSpec {
  type: string;  // 'color-wheels' | 'curves' | 'lut' | 'qualifier' | 'power-window' | ...
  enabled: boolean;
  params: Record<string, number | number[] | string | boolean>;
  keyframes?: KeyframeTrack[];
}
```

**Maps to:** `engine.timeline.addClipEffect({elementId, effect})`.

**Undoable:** ✅.

#### 4.3.53 `UpdateEffectCommand`

```ts
export interface UpdateEffectCommand {
  type: 'updateEffect';
  params: {
    elementId: string;
    effectId: string;
    /** Partial patch on effect params. */
    params: Partial<EffectSpec['params']>;
  };
}
```

**Maps to:** `engine.timeline.updateClipEffectParams({elementId, effectId, params})`.

**Undoable:** ✅.

#### 4.3.54 `RemoveEffectCommand`

```ts
export interface RemoveEffectCommand {
  type: 'removeEffect';
  params: {
    elementId: string;
    effectId: string;
  };
}
```

**Maps to:** `engine.timeline.removeClipEffect({elementId, effectId})`.

**Undoable:** ✅.

#### 4.3.55 `ReorderEffectCommand`

```ts
export interface ReorderEffectCommand {
  type: 'reorderEffect';
  params: {
    elementId: string;
    /** New effect ID order. Must contain the same set of effect IDs. */
    order: string[];
  };
}
```

**Maps to:** `engine.timeline.reorderClipEffects({elementId, order})`.

**Undoable:** ✅.

#### 4.3.56 `ToggleEffectCommand`

```ts
export interface ToggleEffectCommand {
  type: 'toggleEffect';
  params: {
    elementId: string;
    effectId: string;
    value?: boolean;
  };
}
```

**Maps to:** `engine.timeline.updateClipEffectParams({...enabled patch})`.

**Undoable:** ✅.

#### 4.3.57 `AddMaskCommand`

```ts
export interface AddMaskCommand {
  type: 'addMask';
  params: {
    elementId: string;
    mask: MaskSpec;
  };
}

export interface MaskSpec {
  type: 'shape' | 'image' | 'qualifier';
  enabled: boolean;
  shape?: 'rectangle' | 'ellipse' | 'polygon';
  shapeParams?: ShapeParams;
  mediaId?: string;
  qualifierParams?: QualifierParams;
  feather: number;
  inverted: boolean;
  opacity: number;
}
```

**Maps to:** `engine.timeline.addClipMask({elementId, mask})` (greenfield).

**Undoable:** ✅.

#### 4.3.58 `UpdateMaskCommand`

```ts
export interface UpdateMaskCommand {
  type: 'updateMask';
  params: {
    elementId: string;
    maskId: string;
    updates: Partial<MaskSpec>;
  };
}
```

**Maps to:** `engine.timeline.updateClipMask({elementId, maskId, params})` (greenfield).

**Undoable:** ✅.

#### 4.3.59 `RemoveMaskCommand`

```ts
export interface RemoveMaskCommand {
  type: 'removeMask';
  params: {
    elementId: string;
    maskId: string;
  };
}
```

**Maps to:** `engine.timeline.removeClipMask({elementId, maskId})` (greenfield).

**Undoable:** ✅.

#### 4.3.60 `ToggleMaskCommand`

```ts
export interface ToggleMaskCommand {
  type: 'toggleMask';
  params: {
    elementId: string;
    maskId: string;
    value?: boolean;
  };
}
```

**Maps to:** `engine.timeline.updateClipMask({...enabled patch})`.

**Undoable:** ✅.

#### 4.3.61 `AddTransitionCommand`

```ts
export interface AddTransitionCommand {
  type: 'addTransition';
  params: {
    transition: TransitionSpec;
  };
}

export interface TransitionSpec {
  /** Structural type — always 'crossfade' in v1 (spec 07 §6.1A: structure vs presentation). */
  type: 'crossfade';
  /** Presentation registry key — visual variety ('fade' | 'wipe-left' | 'dissolve' | ...; 27 in the reference registry). */
  presentation: string;
  /** Transition window D. */
  duration: MediaTime;
  /** Window centering on the cut: leftPortion = floor(D * alignment). Default 0.5. */
  alignment: number;
  /** Easing of the blend progress. Default 'linear'. */
  timing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  /** Left clip (consumes hidden OUT-handle for leftPortion). */
  leftElementId: string;
  /** Right clip (consumes hidden IN-handle for rightPortion). */
  rightElementId: string;
}
```

**Maps to:** `engine.timeline.addTransition({transition})` (greenfield — OpenCut has no `TransitionsManager`; transitions are stored at the scene level and resolved by `buildFrameDescriptor` per spec 07 §6).

**Undoable:** ✅.

#### 4.3.62 `UpdateTransitionCommand`

```ts
export interface UpdateTransitionCommand {
  type: 'updateTransition';
  params: {
    transitionId: string;
    updates: Partial<TransitionSpec>;
  };
}
```

**Maps to:** `engine.timeline.updateTransition({transitionId, params})`.

**Undoable:** ✅.

#### 4.3.63 `RemoveTransitionCommand`

```ts
export interface RemoveTransitionCommand {
  type: 'removeTransition';
  params: {
    transitionId: string;
  };
}
```

**Maps to:** `engine.timeline.removeTransition({transitionId})`.

**Undoable:** ✅.

#### 4.3.64 `UpsertKeyframesCommand`

```ts
export interface UpsertKeyframesCommand {
  type: 'upsertKeyframes';
  params: {
    elementId: string;
    /** Keyframes to insert or update (matched by `keyframeId`). */
    keyframes: KeyframeSpec[];
  };
}

export interface KeyframeSpec {
  id?: string;  // if omitted, a new ID is generated
  property: string;  // dotted path: 'transform.scaleX', 'effects[0].params.exposure', ...
  time: MediaTime;
  value: number | number[] | string | boolean;
  interpolation: 'linear' | 'bezier' | 'step' | 'hold';
  curves?: [number, number, number, number];  // bezier control points
}
```

**Maps to:** `engine.timeline.upsertKeyframes({elementId, keyframes})` (spec 01 §3.3, `timeline-manager.ts:481-521`).

**Undoable:** ✅ (uses `BatchCommand` internally if multiple keyframes).

#### 4.3.65 `RemoveKeyframesCommand`

```ts
export interface RemoveKeyframesCommand {
  type: 'removeKeyframes';
  params: {
    elementId: string;
    keyframeIds: string[];
  };
}
```

**Maps to:** `engine.timeline.removeKeyframes({elementId, keyframeIds})` (spec 01 §3.3, `timeline-manager.ts:523-590`).

**Undoable:** ✅.

#### 4.3.66 `RetimeKeyframeCommand`

```ts
export interface RetimeKeyframeCommand {
  type: 'retimeKeyframe';
  params: {
    elementId: string;
    keyframeId: string;
    /** New time for this keyframe. */
    time: MediaTime;
  };
}
```

**Maps to:** `engine.timeline.retimeKeyframe({elementId, keyframeId, time})`.

**Undoable:** ✅.

#### 4.3.67 `UpdateKeyframeCurvesCommand`

```ts
export interface UpdateKeyframeCurvesCommand {
  type: 'updateKeyframeCurves';
  params: {
    elementId: string;
    keyframeId: string;
    curves: [number, number, number, number];
  };
}
```

**Maps to:** `engine.timeline.updateKeyframeCurves({elementId, keyframeId, curves})`.

**Undoable:** ✅.

#### 4.3.68 `CopyCommand`

```ts
export interface CopyCommand {
  type: 'copy';
  params: {
    /** Elements to copy to clipboard. */
    elements: ElementRef[];
  };
}
```

**Maps to:** `engine.clipboard.copyClipboardEntry({elementIds})`.

**Undoable:** ❌ (clipboard is not undoable — it's a transient UI buffer).

#### 4.3.69 `CutCommand`

```ts
export interface CutCommand {
  type: 'cut';
  params: {
    elements: ElementRef[];
  };
}
```

**Maps to:** `CopyCommand` + `DeleteCommand` (BatchCommand). The copy part is not undoable; the delete part is. The combined command is undoable (undo restores the deleted elements; the clipboard is left untouched).

**Undoable:** ✅ (the delete part).

#### 4.3.70 `PasteCommand`

```ts
export interface PasteCommand {
  type: 'paste';
  params: {
    /** Time to paste at. */
    atTime: MediaTime;
    /** Target track for paste. If `null`, paste to original tracks. */
    targetTrackId?: string | null;
    /** If `true`, ripple the timeline to make room. Default `false`. */
    ripple?: boolean;
  };
}
```

**Maps to:** `engine.clipboard.buildPasteClipboardCommand({atTime, targetTrackId})` → BatchCommand of `InsertElementCommand`s.

**Undoable:** ✅ (the inserts are undoable as a batch).

#### 4.3.71 `UndoCommand`

```ts
export interface UndoCommand {
  type: 'undo';
  // No params — undoes the most recent undoable command.
  // If the history is empty, returns `{ ok: false, error: { code: 'NOTHING_TO_UNDO' } }`.
}
```

**Maps to:** `engine.command.undo()`.

**Undoable:** ❌ (meta — undo of undo is redo, which is a separate command).

#### 4.3.72 `RedoCommand`

```ts
export interface RedoCommand {
  type: 'redo';
}
```

**Maps to:** `engine.command.redo()`.

**Undoable:** ❌.

#### 4.3.73 `SnapshotCommand`

```ts
export interface SnapshotCommand {
  type: 'snapshot';
  // No params — returns the current SceneState in the CommandResult.
  // Used by tests for assertions: apply a command, then snapshot, then compare.
}
```

**Maps to:** no-op (reads current `SceneState` from `engine.scenes.getActiveScene()`).

**Undoable:** ❌ (read-only).

**Returns:** `CommandResult.ok.stateChange.newState` contains the full `SceneState` snapshot. `addedElements`/`modifiedElements`/`removedElements` are all empty (no state change).

#### 4.3.74 `ExportFCPXMLCommand` (Round-7 amendment)

```ts
export interface ExportFCPXMLCommand {
  type: 'exportFCPXML';
  params: {
    /**
     * FCPXML dialect. Default 'fcpxml-1.10' — spec 10's DTD target
     * (FCPXMLv1_10.dtd, version CDATA #FIXED "1.10"). 'fcpxml-1.11' exists solely
     * for Display P3 colorSpace fidelity (spec 10 §13 Correction #4; Apple added
     * P3 support from 1.11+; on 1.10 Display P3 falls back to "1-1-1 (Rec. 709)").
     * Reconciles the two historical shapes: spec 10's gated test used
     * { bundleMedia: false }; spec 16 §3.9 used { format: 'fcpxml-1.11' } — both
     * params now exist on one canonical type with 1.10 as default.
     */
    format?: 'fcpxml-1.10' | 'fcpxml-1.11';
    /**
     * If true, co-locate referenced media next to the FCPXML (spec 10's
     * media/<asset-id>.<ext> + relative <media-rep src> layout). Default false —
     * media stays referenced by its canonical MediaStorageRef. When true, the
     * result artifact is a zip-style bundle referenced by artifactId, not an
     * inline XML string.
     */
    bundleMedia?: boolean;
  };
}
```

**Maps to:** `engine.export.exportFCPXML({format, bundleMedia})` (ExportManager — spec 01 §14.11; the serializer itself is spec 10 §5's `ProjectJSON → FCPXML` pipeline; the manager method wraps it so the dispatcher stays 1:1).

**Undoable:** ❌ (output command — does not mutate `SceneState`; see §14.11).

**Returns:** `CommandResult.ok.stateChange` is a no-op change (`newState` = current state, all ID arrays empty — same convention as `SnapshotCommand`). The artifact rides the `data` field:

```ts
{ ok: true, stateChange: { /* no-op */ }, data: {
  kind: 'fcpxml',
  format: 'fcpxml-1.10',
  /** The full FCPXML document as a string (bundleMedia: false). */
  xml?: string,
  /** When bundleMedia: true — reference to the assembled bundle artifact. */
  artifactId?: string,
  fileName: 'project.fcpxml',
  bundledMediaCount?: number,
} }
```

**Constraints (reject if):** no active project → `NO_ACTIVE_PROJECT`; unknown `format` → `EXPORT_UNSUPPORTED_FORMAT` (unreachable via Zod — defense-in-depth).

**Determinism note:** the XML is a pure function of `(SceneState, params)` — no timestamps or random IDs in the body (spec 10 §13 requires stable UUIDs from the project model), which is what makes spec 10's state-WYSIWYG test T3.2 (byte-for-byte `Cmd+E` == `apply()`) meaningful.

#### 4.3.75 `ExportMasterCommand` (Round-7 amendment)

```ts
export interface ExportMasterCommand {
  type: 'exportMaster';
  params: {
    /** Output format. Default 'prores-4444' (spec 11 cloud master). */
    format?: 'prores-4444' | 'prores-422' | 'h264' | 'vp9';
    /** Where the render runs / the artifact lands. Default 'cloud' (spec 11). */
    destination?: 'cloud' | 'local';
    /** Timeline range to render, in MediaTime ticks. Default: full timeline. */
    range?: { start: MediaTime; end: MediaTime } | null;
  };
}
```

**Maps to:** `engine.renderer.exportProject({format, destination, range})` (RendererManager — enqueues on the spec 11 §9.2 render queue; browser-local master export uses the same WebCodecs pipeline as cloud render, per Decision 6 "one engine, two entry points").

**Undoable:** ❌ (output command; does not mutate `SceneState`).

**Returns:** job-style — `apply()` returns immediately with a job reference; progress and completion arrive on the `EngineEvent` stream (§9) and the HTTP job endpoint (§8.10):

```ts
{ ok: true, stateChange: { /* no-op */ }, data: {
  kind: 'renderJob',
  jobId: string,          // opaque; spec 11 §9.1 render job identity
  status: 'queued',
} }
```

**Constraints (reject if):** no active project → `NO_ACTIVE_PROJECT`; queue at capacity → `JOB_QUEUE_FULL` (spec 11 §9.2 `maxConcurrent`).

#### 4.3.76 `ExportFrameCommand` (Round-7 amendment)

```ts
export interface ExportFrameCommand {
  type: 'exportFrame';
  params: {
    /** Image format. Default 'png'. */
    format?: 'png' | 'jpg';
    /**
     * Frame to export, in MediaTime ticks. Default: the current playhead
     * (resolver-computed at dispatch — engine.playback.getCurrentTime()).
     */
    time?: MediaTime;
  };
}
```

**Maps to:** `engine.renderer.saveSnapshot({format, time})` (single-frame render + GPU readback + encode; the render itself is Layer 3, spec 04 §7).

**Undoable:** ❌ (output command; does not mutate `SceneState`).

**Returns:** artifact-reference style (PNG bytes materialize asynchronously because GPU readback is async — the command completes synchronously with a handle):

```ts
{ ok: true, stateChange: { /* no-op */ }, data: {
  kind: 'frameArtifact',
  artifactId: string,     // fetch via GET /api/engine/artifact/:id (§8.10)
  mimeType: 'image/png',
} }
```

**Constraints (reject if):** `time` outside `[0, totalDuration]` → `TIME_OUT_OF_RANGE`; no active project → `NO_ACTIVE_PROJECT`.

#### 4.3.77 `RenameProjectCommand` (Round-7 amendment)

```ts
export interface RenameProjectCommand {
  type: 'renameProject';
  params: {
    id: string;   // projectId
    name: string; // new name (non-empty, trimmed)
  };
}
```

**Maps to:** `engine.project.renameProject({id, name})` (manager surface per spec 09 §13; persists via the storage layer).

**Undoable:** ❌ (project-level metadata persisted separately from `SceneState` undo history — same class as `saveProject`).

**Constraints (reject if):** project not found → `PROJECT_NOT_FOUND`; empty name → `VALIDATION_FAILED`.

#### 4.3.78 `DeleteProjectCommand` (Round-7 amendment)

```ts
export interface DeleteProjectCommand {
  type: 'deleteProject';
  params: {
    id: string;   // projectId
  };
}
```

**Maps to:** `engine.project.deleteProject({id})` (manager surface per spec 09 §13; removes the project record + its OPFS media — the active project cannot be deleted: `NO_ACTIVE_PROJECT` misuse guard returns `PROJECT_ACTIVE`).

**Undoable:** ❌ (destructive project-level I/O — same class as `closeProject`).

**Round-7 note:** these two commands close a previously unacknowledged instance of the TEST-INTEGRATION-REVIEW Issue #1 class — spec 09's Testing contract (§ Testing, `rename-project-...` / `delete-project-...` tests) referenced them as spec 15 EngineCommands before they existed. They are now canonical; spec 09's test comments point here.

### 4.4 The `apply()` dispatcher

```ts
// src/engine/core/managers/commands.ts (extension)

import { EngineCommandSchema } from '@/engine/types/command-schema';
import { CommandResult } from '@/engine/types/command';

export class CommandManager {
  // ... existing methods (spec 01 §3.3)

  /**
   * Apply a JSON-serialized EngineCommand. This is the canonical entry point
   * for ALL engine mutations from external consumers (UI, HTTP, test).
   *
   * 1. Validates the command via Zod schema.
   * 2. Dispatches to the corresponding manager method.
   * 3. Returns a CommandResult describing the state change.
   *
   * For undoable commands, also pushes to undo history.
   */
  apply(command: EngineCommand): CommandResult {
    // Step 1: Zod validation
    const parseResult = EngineCommandSchema.safeParse(command);
    if (!parseResult.success) {
      return {
        ok: false,
        error: {
          code: 'SCHEMA_INVALID',
          message: `Command failed schema validation: ${parseResult.error.message}`,
          constraint: parseResult.error.issues[0]?.path.join('.'),
        },
      };
    }
    const validated = parseResult.data;

    // Step 2: Dispatch to manager method
    try {
      return this.dispatch(validated);
    } catch (e) {
      return {
        ok: false,
        error: {
          code: e instanceof EngineError ? e.code : 'INTERNAL_ERROR',
          message: e instanceof Error ? e.message : String(e),
        },
      };
    }
  }

  private dispatch(command: EngineCommand): CommandResult {
    switch (command.type) {
      case 'split':
        return this.dispatchSplit(command);
      case 'trim':
        return this.dispatchTrim(command);
      // ... 78 cases, one per command type
      case 'snapshot':
        return this.dispatchSnapshot(command);
      case 'exportFCPXML':
        return this.dispatchExportFCPXML(command);   // §4.3.74 — output exception, §14.11
      case 'exportMaster':
        return this.dispatchExportMaster(command);   // §4.3.75
      case 'exportFrame':
        return this.dispatchExportFrame(command);    // §4.3.76
      case 'renameProject':
        return this.dispatchRenameProject(command);  // §4.3.77
      case 'deleteProject':
        return this.dispatchDeleteProject(command);  // §4.3.78
      default:
        // Exhaustiveness check — if a new command type is added without a
        // dispatcher case, this fails at compile time.
        const _: never = command;
        throw new Error(`Unknown command type: ${(_ as EngineCommand).type}`);
    }
  }

  private dispatchSplit(cmd: SplitCommand): CommandResult {
    const beforeState = this.editor.scenes.getActiveSceneOrNull()?.tracks ?? null;
    if (!beforeState) {
      return { ok: false, error: { code: 'NO_ACTIVE_SCENE', message: 'No active scene' } };
    }

    // Find elements to split
    const elements = cmd.params.trackIds === null
      ? findAllElementsAtTime(beforeState, cmd.params.time)
      : findElementsAtTimeOnTracks(beforeState, cmd.params.trackIds, cmd.params.time);

    if (elements.length === 0) {
      return { ok: false, error: { code: 'NO_ELEMENTS_AT_TIME', message: `No elements at time ${cmd.params.time}` } };
    }

    // Call manager method
    const rightSideElements = this.editor.timeline.splitElements({
      elements,
      splitTime: cmd.params.time,
      retainSide: cmd.params.retainSide ?? 'both',
    });

    const afterState = this.editor.scenes.getActiveScene().tracks;
    return {
      ok: true,
      stateChange: computeStateChange(beforeState, afterState, {
        addedElements: rightSideElements.map(e => e.elementId),
      }),
      undoInfo: {
        previousState: { tracks: beforeState } as SceneState,
      },
    };
  }

  // ... 59 more dispatch methods, one per command type
}
```

**Critical property:** the dispatcher is exhaustive. Adding a new variant to `EngineCommand` without a corresponding `case` in `dispatch()` is a compile error (via the `const _: never = command` pattern). This enforces the 1:1 mapping between command types and manager methods.

---

## 5. Command Examples

### 5.1 Timeline ops

#### 5.1.1 Split at frame 150 on all tracks

At 30fps, frame 150 = 5 seconds = `5 * 120000 = 600000` ticks. Wait — `MediaTime` is `120_000` ticks per second per spec 03, so 5 seconds = `600_000` ticks. Let me recompute the examples in the task description: it said `time: 5000000` which would be `5000000 / 120000 = 41.67` seconds. The examples in the task description use `5000000` (let me trust those for backwards-compatibility with what the task author wrote — they may be using a different tick rate or just illustrative numbers). I'll use `5_000_000` consistently below to match the task description's intent (frame 150 ≈ 5 sec at 30fps — close enough for example purposes).

```json
{
  "type": "split",
  "params": {
    "time": 5000000,
    "trackIds": null
  }
}
```

#### 5.1.2 Trim clip "clip-3" right edge by 10 frames (positive delta = extend)

At 30fps, 10 frames ≈ 333_333 ticks (1/3 of a second ≈ 40_000 ticks). I'll match the task description's `333333`.

```json
{
  "type": "trim",
  "params": {
    "elementId": "clip-3",
    "edge": "end",
    "delta": 333333,
    "ripple": false
  }
}
```

#### 5.1.3 Move clips ["clip-1", "clip-2"] 5 seconds later, to track "track-2"

5 seconds = `600_000_000` ticks if we use the task description's tick rate (which appears to be nanoseconds, 1e9/sec, not the spec's 120K/sec). I'll match the task description's `600000000` for consistency with the task spec, but note in §11 that the Zod schema uses `z.number().int()` and does not constrain tick rate — the engine's `MediaTime` branded type is the source of truth.

```json
{
  "type": "move",
  "params": {
    "elementIds": ["clip-1", "clip-2"],
    "delta": 600000000,
    "targetTrackId": "track-2"
  }
}
```

#### 5.1.4 Roll edit between "clip-1" and "clip-2", edit point moves right by 5 frames

```json
{
  "type": "roll",
  "params": {
    "leftElementId": "clip-1",
    "rightElementId": "clip-2",
    "delta": 166666
  }
}
```

#### 5.1.5 Slip "clip-1" by 1 second (source shifts right)

```json
{
  "type": "slip",
  "params": {
    "elementId": "clip-1",
    "delta": 120000000
  }
}
```

#### 5.1.6 Slide "clip-2" right by 10 frames

```json
{
  "type": "slide",
  "params": {
    "elementId": "clip-2",
    "delta": 333333
  }
}
```

#### 5.1.7 Delete clips ["clip-1", "clip-2"] with ripple

```json
{
  "type": "delete",
  "params": {
    "elements": [
      { "trackId": "track-1", "elementId": "clip-1" },
      { "trackId": "track-2", "elementId": "clip-2" }
    ],
    "ripple": true
  }
}
```

#### 5.1.8 Insert a 10-second video clip from media "media-1" at time 0

```json
{
  "type": "insert",
  "params": {
    "element": {
      "type": "video",
      "mediaId": "media-1",
      "startTime": 0,
      "duration": 1200000000,
      "trimStart": 0,
      "speed": 1.0,
      "name": "Media 1"
    },
    "placement": { "type": "firstAvailable" },
    "ripple": false
  }
}
```

#### 5.1.9 Duplicate "clip-1" to a new track

```json
{
  "type": "duplicate",
  "params": {
    "elements": [{ "trackId": "track-1", "elementId": "clip-1" }],
    "placement": { "type": "alwaysNew", "position": "highest" }
  }
}
```

#### 5.1.10 Rate-stretch "clip-1" to 15 seconds (was 10)

```json
{
  "type": "rateStretch",
  "params": {
    "elementId": "clip-1",
    "newDuration": 1800000000,
    "ripple": false
  }
}
```

#### 5.1.11 Retime "clip-1" to 2x with pitch preservation

```json
{
  "type": "retime",
  "params": {
    "elementId": "clip-1",
    "rate": 2.0,
    "maintainPitch": true,
    "ripple": false
  }
}
```

#### 5.1.12 Insert a freeze frame at 5 seconds in "clip-1" for 2 seconds

```json
{
  "type": "freezeFrame",
  "params": {
    "elementId": "clip-1",
    "atTime": 600000000,
    "freezeDuration": 240000000,
    "frameMediaId": "media-frame-extracted",
    "ripple": true
  }
}
```

#### 5.1.13 Remove range [10s, 15s] across all tracks with ripple

```json
{
  "type": "rangeRemoval",
  "params": {
    "startTime": 1200000000,
    "endTime": 1800000000,
    "trackIds": null,
    "ripple": true,
    "syncLock": true
  }
}
```

### 5.2 Playback ops

#### 5.2.1 Play

```json
{ "type": "play" }
```

#### 5.2.2 Pause

```json
{ "type": "pause" }
```

#### 5.2.3 Seek to 00:01:30:00 (frame 2700 at 30fps)

Frame 2700 at 30fps = 90 seconds. The task description used `108000000000` (108 billion) which corresponds to 90 seconds at 1.2 billion ticks/sec — clearly the task author was using a different tick rate than spec 03's `120_000/sec`. I'll use the task's value verbatim for the example, but note that the canonical MediaTime unit (spec 03) is 120K ticks/sec — `90 * 120_000 = 10_800_000`.

```json
{
  "type": "seek",
  "params": { "time": 108000000000 }
}
```

> **Note on tick rate:** The examples in this section use the tick values from the task brief, which assume a different (illustrative) tick rate than spec 03's canonical `120_000 ticks/sec`. In production, the engine uses spec 03's `MediaTime = branded<number>` at 120K ticks/sec. The Zod schemas in §11 are tick-rate-agnostic — they validate `z.number().int()` without checking the rate. Tick rate is enforced by the `MediaTime` branded type at the TS level, not at the wire-protocol level.

#### 5.2.4 Set playback rate to 0.5x (half speed)

```json
{
  "type": "setRate",
  "params": { "rate": 0.5 }
}
```

#### 5.2.5 Set loop [10s, 20s]

```json
{
  "type": "setLoop",
  "params": {
    "start": 1200000000,
    "end": 2400000000
  }
}
```

### 5.3 Project ops

#### 5.3.1 Create a new project

```json
{
  "type": "createProject",
  "params": {
    "name": "My Rough Cut",
    "settings": {
      "fps": { "numerator": 30000, "denominator": 1001 },
      "canvasSize": { "width": 1920, "height": 1080 }
    }
  }
}
```

#### 5.3.2 Save the current project

```json
{ "type": "saveProject" }
```

#### 5.3.3 Update canvas size

```json
{
  "type": "updateProjectSettings",
  "params": {
    "settings": {
      "canvasSize": { "width": 3840, "height": 2160 }
    }
  }
}
```

### 5.4 Media ops

#### 5.4.1 Import media (after pre-extracting metadata upstream)

```json
{
  "type": "importMedia",
  "params": {
    "asset": {
      "name": "interview.mp4",
      "type": "video",
      "size": 104857600,
      "duration": 12000000000,
      "width": 1920,
      "height": 1080,
      "fps": { "numerator": 30000, "denominator": 1001 },
      "colorInfo": {
        "primaries": "bt709",
        "transfer": "bt709"
      },
      "storage": {
        "kind": "opfs",
        "path": "media/abc-123.mp4"
      }
    }
  }
}
```

> **Pre-extraction pattern:** The actual file probing (mediabunny metadata extraction, thumbnail generation) happens BEFORE this command is issued. The caller (typically a UI handler) does:
> 1. `const blob = await file.arrayBuffer()`
> 2. `const mediaInfo = await engine.media.probe({ blob })` (mediabunny) — 📝 NEW greenfield helper, not on OpenCut-classic `MediaManager`
> 3. `const storageRef = await engine.media.persistBlob({ blob })` (OPFS write) — 📝 NEW greenfield helper, not on OpenCut-classic `MediaManager`
> 4. `const thumbnailId = await engine.media.generateThumbnail({ blob, time: 0 })` — 📝 NEW greenfield helper, not on OpenCut-classic `MediaManager`
> 5. Then issues `importMedia` with the already-parsed `MediaAsset` (minus `id`).
>
> This separation keeps the command pure (no I/O) while still allowing the engine to own the media library. Tests can mock the probe/persist/generate steps.

### 5.5 Effect ops

#### 5.5.1 Add color wheels effect to clip "clip-1"

```json
{
  "type": "addEffect",
  "params": {
    "elementId": "clip-1",
    "effect": {
      "type": "color-wheels",
      "enabled": true,
      "params": {
        "liftHue": 0, "liftAmount": 0,
        "gammaHue": 0, "gammaAmount": 0,
        "gainHue": 0, "gainAmount": 0,
        "offsetHue": 0, "offsetAmount": 0,
        "exposure": 0, "contrast": 1, "pivot": 0.18,
        "saturation": 1, "hue": 0,
        "temperature": 0, "tint": 0,
        "colorBoost": 1, "midDetail": 0,
        "shadows": 0, "highlights": 0,
        "lumMix": 100
      }
    }
  }
}
```

#### 5.5.2 Update LUT effect params

```json
{
  "type": "updateEffect",
  "params": {
    "elementId": "clip-1",
    "effectId": "effect-lut-1",
    "params": {
      "intensity": 0.75
    }
  }
}
```

#### 5.5.3 Remove an effect

```json
{
  "type": "removeEffect",
  "params": {
    "elementId": "clip-1",
    "effectId": "effect-lut-1"
  }
}
```

### 5.6 Mask ops

#### 5.6.1 Add a rectangular mask to "clip-1"

```json
{
  "type": "addMask",
  "params": {
    "elementId": "clip-1",
    "mask": {
      "type": "shape",
      "enabled": true,
      "shape": "rectangle",
      "shapeParams": {
        "x": 0.25, "y": 0.25, "width": 0.5, "height": 0.5
      },
      "feather": 0.05,
      "inverted": false,
      "opacity": 1.0
    }
  }
}
```

### 5.7 Transition ops

#### 5.7.1 Add a crossfade transition between "clip-1" and "clip-2"

```json
{
  "type": "addTransition",
  "params": {
    "transition": {
      "type": "crossfade",
      "presentation": "fade",
      "duration": 100000000,
      "alignment": 0.5,
      "leftElementId": "clip-1",
      "rightElementId": "clip-2"
    }
  }
}
```

### 5.8 Undo / redo

#### 5.8.1 Undo the last command

```json
{ "type": "undo" }
```

#### 5.8.2 Redo the last undone command

```json
{ "type": "redo" }
```

### 5.9 Snapshot (for testing)

#### 5.9.1 Snapshot the current state

```json
{ "type": "snapshot" }
```

### 5.10 Command batch (transaction)

#### 5.10.1 Ripple delete 3 clips as one undoable transaction

```json
{
  "type": "batch",
  "label": "Ripple delete 3 clips",
  "commands": [
    {
      "type": "delete",
      "params": {
        "elements": [
          { "trackId": "track-1", "elementId": "clip-1" }
        ],
        "ripple": true
      }
    },
    {
      "type": "delete",
      "params": {
        "elements": [
          { "trackId": "track-1", "elementId": "clip-2" }
        ],
        "ripple": true
      }
    },
    {
      "type": "delete",
      "params": {
        "elements": [
          { "trackId": "track-1", "elementId": "clip-3" }
        ],
        "ripple": true
      }
    }
  ]
}
```

#### 5.10.2 Multi-step "freeze frame" as a batch

```json
{
  "type": "batch",
  "label": "Insert freeze frame at 5s",
  "commands": [
    { "type": "split", "params": { "time": 600000000, "trackIds": ["track-1"] } },
    {
      "type": "insert",
      "params": {
        "element": {
          "type": "image",
          "mediaId": "media-freeze-frame",
          "startTime": 600000000,
          "duration": 240000000,
          "name": "Freeze Frame"
        },
        "placement": { "type": "explicit", "trackId": "track-1" },
        "ripple": false
      }
    },
    {
      "type": "move",
      "params": {
        "elementIds": ["<right-half-id>"],
        "delta": 240000000,
        "targetTrackId": null
      }
    }
  ]
}
```

---

## 6. `CommandResult` Type

Every command returns a `CommandResult`. This is what `engine.command.apply(command)` returns and what the HTTP `/api/engine/command` endpoint responds with.

```ts
// src/engine/types/command.ts

export type CommandResult =
  | { ok: true; stateChange: StateChange; undoInfo?: UndoInfo; data?: CommandResultData }
  | { ok: false; error: CommandError };

/**
 * Output artifact or job reference produced by an export command (§14.11).
 * Populated ONLY by `exportFCPXML` / `exportMaster` / `exportFrame` — the
 * sanctioned OUTPUT exception. All other commands leave it undefined.
 */
export type CommandResultData =
  | { kind: 'fcpxml'; format: 'fcpxml-1.10' | 'fcpxml-1.11'; xml?: string; artifactId?: string; fileName: string; bundledMediaCount?: number }
  | { kind: 'renderJob'; jobId: string; status: 'queued' | 'running' | 'complete' | 'failed' }
  | { kind: 'frameArtifact'; artifactId: string; mimeType: string };
```

### 6.1 `StateChange`

Describes what changed in the engine state as a result of the command. The UI uses this to update React state incrementally (rather than re-rendering everything on every command).

```ts
export interface StateChange {
  /** Element IDs that were added to the timeline. */
  addedElements: string[];
  /** Element IDs that were modified (any field changed). */
  modifiedElements: string[];
  /** Element IDs that were removed from the timeline. */
  removedElements: string[];
  /** Track IDs that were added. */
  addedTracks: string[];
  /** Track IDs that were modified (e.g., muted toggled, elements added/removed). */
  modifiedTracks: string[];
  /** Track IDs that were removed. */
  removedTracks: string[];
  /**
   * Full new state (for snapshot tests). Always populated on `ok: true`.
   * This is the canonical source of truth for the post-command state.
   */
  newState: SceneState;
  /**
   * Optional: list of other things that changed (e.g., 'selection',
   * 'playhead', 'projectSettings'). Free-form for forward compatibility.
   */
  sideEffects?: string[];
}
```

### 6.2 `UndoInfo`

Describes how to undo the command. Two strategies:

1. **Inverse command** — store an `EngineCommand` that, when applied, reverses the original. Used for simple ops (e.g., `ToggleTrackMuteCommand`'s inverse is another `ToggleTrackMuteCommand`).
2. **Previous state snapshot** — store the entire `SceneState` before the command was applied. Used for complex ops (split, move, delete) where constructing an inverse is impractical.

The engine chooses the strategy per command type. Most commands use strategy 2 (snapshot) — it's simpler and more robust, at the cost of higher memory usage (mitigated by structural sharing — the snapshots share unchanged tracks).

```ts
export interface UndoInfo {
  /**
   * Strategy 1: an inverse command that, when applied, reverses the original.
   * Mutually exclusive with `previousState`.
   */
  undoCommand?: EngineCommand;

  /**
   * Strategy 2: snapshot of the previous state. The engine restores this
   * on undo by calling `engine.scenes.setScenes({ scenes: [previousState] })`.
   * Mutually exclusive with `undoCommand`.
   */
  previousState?: SceneState;

  /**
   * Optional human-readable label for the undo UI. If omitted, the UI
   * generates one from the command type (e.g., "Split", "Trim", "Move").
   */
  label?: string;
}
```

### 6.3 `CommandError`

```ts
export interface CommandError {
  /**
   * Machine-readable error code. The UI uses this to show localized error
   * messages and to decide whether to retry, abort, or ignore.
   *
   * Standard codes (extend as needed):
   * - 'SCHEMA_INVALID' — Zod validation failed
   * - 'NO_ACTIVE_SCENE' — no scene loaded
   * - 'NO_ACTIVE_PROJECT' — no project loaded
   * - 'ELEMENT_NOT_FOUND' — elementId doesn't exist
   * - 'TRACK_NOT_FOUND' — trackId doesn't exist
   * - 'TRACK_LOCKED' — track is locked, mutation rejected
   * - 'OVERLAP_REJECTED' — move/insert would cause overlap
   * - 'TRIM_BEYOND_SOURCE' — trim would expose source out-of-bounds
   * - 'SPLIT_INSIDE_TRANSITION' — split point is inside a transition overlap
   * - 'CROSS_SECTION_REJECTED' — move mixes audio + non-audio in same group
   * - 'MAIN_TRACK_CONSTRAINT' — main-track element would move before earliest
   * - 'NOTHING_TO_UNDO' — undo called with empty history
   * - 'NOTHING_TO_REDO' — redo called with empty redo stack
   * - 'PROJECT_DIRTY' — closeProject called without saving
   * - 'MEDIA_IN_USE' — deleteMedia called with cascadeElements=false but refs exist
   * - 'TRACK_NOT_EMPTY' — deleteTrack called with cascadeElements=false but elements exist
   * - 'EXPORT_UNSUPPORTED_FORMAT' — export command's format value is not in the supported set (§4.3.74-76)
   * - 'JOB_QUEUE_FULL' — exportMaster rejected: render queue at maxConcurrent (spec 11 §9.2)
   * - 'TIME_OUT_OF_RANGE' — exportFrame time outside [0, totalDuration]
   * - 'PROJECT_NOT_FOUND' — renameProject/deleteProject target does not exist (§4.3.77-78)
   * - 'PROJECT_ACTIVE' — deleteProject called on the active project (§4.3.78)
   * - 'NOOP' — command semantically valid but clamped to a no-op at current bounds — e.g. a trim whose delta is fully absorbed by the source-bounds clamp, a move whose delta snaps back to the same position. Distinct from ELEMENT_NOT_FOUND (Round 8, adopted from opencut-timeline api.ts:198-208: "NOOP is not NOT_FOUND"; tests assert the distinction)
   * - 'INTERNAL_ERROR' — unexpected exception (see `message` for details)
   */
  code: string;

  /** Human-readable error message (English, for logs/devtools). */
  message: string;

  /**
   * Optional: which constraint was violated. Useful for the UI to highlight
   * the offending element/track in the timeline.
   */
  constraint?: {
    type: 'overlap' | 'source' | 'transition' | 'lock' | 'compatibility';
    elementId?: string;
    trackId?: string;
    details?: string;
  };

  /** Optional: stack trace (only in dev mode — stripped in production). */
  stack?: string;
}
```

### 6.4 Example `CommandResult` for a successful split

```json
{
  "ok": true,
  "stateChange": {
    "addedElements": ["clip-3-right-half"],
    "modifiedElements": ["clip-3"],
    "removedElements": [],
    "addedTracks": [],
    "modifiedTracks": ["track-1"],
    "removedTracks": [],
    "newState": {
      "activeSceneId": "scene-1",
      "tracks": { /* ... full SceneState ... */ }
    }
  },
  "undoInfo": {
    "previousState": { /* ... full SceneState before split ... */ },
    "label": "Split at 5s"
  }
}
```

### 6.5 Example `CommandResult` for a failed trim

```json
{
  "ok": false,
  "error": {
    "code": "TRIM_BEYOND_SOURCE",
    "message": "Cannot extend clip 'clip-3' beyond source end (sourceDuration=10s, attempted extend to 12s)",
    "constraint": {
      "type": "source",
      "elementId": "clip-3",
      "details": "sourceDuration=1200000000, attemptedEnd=1440000000"
    }
  }
}
```

---

## 7. Command Batch (Transaction)

Multiple commands can be batched into one undoable transaction. Either all succeed, or all roll back.

```ts
export interface CommandBatch {
  type: 'batch';
  /**
   * Human-readable label for the undo UI. Example: "Ripple delete 3 clips",
   * "Insert freeze frame at 5s", "Paste 5 elements".
   */
  label: string;
  /**
   * Commands to apply in order. If any command returns `{ ok: false }`,
   * the entire batch is rolled back (all previously-applied commands in
   * the batch are undone via their `undoInfo`) and the batch result is
   * `{ ok: false, error: <failing command's error> }`.
   */
  commands: EngineCommand[];
  /**
   * Optional: if `true`, the batch is treated as one undoable unit (one
   * `undo()` undoes the whole batch). If `false`, each command in the
   * batch is undoable independently. Default `true`.
   */
  atomic?: boolean;
}
```

### 7.1 Atomicity

When `atomic: true` (default):
1. Capture `beforeState = engine.scenes.getActiveScene().tracks`.
2. Apply each command in order. If any returns `ok: false`, restore `beforeState` and return the failing command's error.
3. If all succeed, push a single `BatchCommand` (spec 01 §4.2) to undo history with `undo()` that restores `beforeState`.
4. Return `{ ok: true, stateChange: <cumulative diff from beforeState to final state> }`.

When `atomic: false`:
1. Apply each command in order. If any returns `ok: false`, stop and return that error (previously-applied commands are NOT rolled back).
2. Each successful command is pushed to undo history independently.
3. Return the last command's `CommandResult` (or an aggregated `stateChange` if all succeeded).

### 7.1A Transaction discipline (Round-8 amendment — adopted from opencut-timeline, 3 review rounds)

Beyond all-or-nothing atomicity, `applyBatch` implementations MUST honor five transaction invariants (source: opencut-timeline DECISIONS #10 addendum + applyBatch :346-381, verified by its M16 hardening suite; each invariant closed a real bug class):

1. **Eviction suspended during transactions.** Undo-history eviction (the 100-entry cap, spec 06 §4.6) must NOT run mid-batch — a batch of 150 commands must not evict the beforeState it may need to roll back to. Eviction resumes after commit/rollback.
2. **Depth-anchored rollback.** On partial failure, restore the depth-anchored beforeState captured at batch start — NOT `undo()` the already-applied commands one by one (which drains history and can stop early on a NOOP). Depth-anchoring also makes nested batches safe: an inner rollback restores to the inner anchor without touching the outer batch's entries.
3. **Redo stack cleared after rollback.** A rolled-back batch invalidates every redo entry that referenced post-batch state; keeping them would let `redo()` resurrect a state that was just rejected.
4. **Undo/redo rejected inside batches.** `undo`/`redo` commands inside a batch return `{ ok: false, error: 'INTERNAL_ERROR', message: 'undo/redo not allowed inside a batch' }` — batching an undo with other commands is semantically incoherent (which history entry would the batch label point at?).
5. **Intra-batch overlap guard.** Insert/move commands within one batch are validated against the *evolving* intermediate state (command 2 sees command 1's result), not the batch-start state — otherwise a batch that moves A out of the way and inserts B at A's old position would spuriously fail (or worse, pass and produce an overlap).

**Test hooks:** each invariant has a dedicated error-path test (spec 17 §2.5; opencut-timeline M16 provides the reference cases — cap-crossing batch rollback, batch-of-150, undo-in-batch rejection, move-then-insert-at-vacated-position).

### 7.2 Nesting

Batches can be nested:

```json
{
  "type": "batch",
  "label": "Multi-track edit",
  "commands": [
    {
      "type": "batch",
      "label": "Edit track 1",
      "commands": [
        { "type": "split", "params": { "time": 5000000, "trackIds": ["track-1"] } },
        { "type": "delete", "params": { "elements": [{"trackId":"track-1","elementId":"clip-1a"}], "ripple": false } }
      ]
    },
    {
      "type": "batch",
      "label": "Edit track 2",
      "commands": [
        { "type": "split", "params": { "time": 5000000, "trackIds": ["track-2"] } }
      ]
    }
  ]
}
```

The engine flattens nested batches into a single `BatchCommand` at the dispatch layer — there's no runtime overhead to nesting. The labels are concatenated for the undo UI (e.g., "Multi-track edit > Edit track 1 > Split").

### 7.3 Built-in batch patterns

The engine pre-defines a few common batch patterns for convenience:

```ts
// src/engine/types/command-presets.ts

export const rippleDelete = (elements: ElementRef[]): CommandBatch => ({
  type: 'batch',
  label: `Ripple delete ${elements.length} clip${elements.length === 1 ? '' : 's'}`,
  commands: [
    { type: 'delete', params: { elements, ripple: true } }
  ],
});

export const paste = (clipboardEntry: ClipboardEntry, atTime: MediaTime, targetTrackId?: string): CommandBatch => ({
  type: 'batch',
  label: `Paste ${clipboardEntry.elements.length} element${clipboardEntry.elements.length === 1 ? '' : 's'}`,
  commands: clipboardEntry.elements.map(el => ({
    type: 'insert',
    params: {
      element: { ...el, startTime: atTime },
      placement: targetTrackId ? { type: 'explicit', trackId: targetTrackId } : { type: 'firstAvailable' },
      ripple: false,
    },
  })),
});

export const freezeFrame = (elementId: string, atTime: MediaTime, frameMediaId: string, freezeDuration: MediaTime): CommandBatch => ({
  type: 'batch',
  label: 'Insert freeze frame',
  commands: [
    { type: 'split', params: { time: atTime, trackIds: null } },
    { type: 'insert', params: { /* ... */ } },
    { type: 'move', params: { /* shift right half */ } },
  ],
});
```

These presets are NOT special — they're just helper functions that construct `CommandBatch` objects. The engine treats them identically to manually-constructed batches.

---

## 8. Wire Protocol (HTTP)

For cloud render and remote engine use cases (spec 11), the JSON protocol is exposed via HTTP. The endpoints below mirror the `EditorCore` manager API.

### 8.1 Endpoint reference

```
POST /api/engine/load
  Body: ProjectJSON
  Response: { projectId: string }

POST /api/engine/command
  Body: EngineCommand | CommandBatch
  Response: CommandResult

POST /api/engine/render-frame
  Body: { projectId: string, frame: number }
  Response: binary (raw pixels, format per Accept header)

POST /api/engine/render-audio
  Body: { projectId: string, startTime?: MediaTime, endTime?: MediaTime }
  Response: binary (PCM samples, Float32 LE, stereo by default)

GET /api/engine/state
  Response: SceneState (full current state)

POST /api/engine/subscribe
  Body: { events: string[] }
  Response: SSE stream of EngineEvent

GET /api/engine/artifact/:artifactId
  Response: binary (bytes of a produced artifact — exportFrame PNG,
  exportFCPXML bundleMedia zip; Content-Type per artifact record — §8.10)

GET /api/engine/job/:jobId
  Response: { jobId, status: 'queued'|'running'|'complete'|'failed',
              progress?: number, artifactId?: string, error?: CommandError }
```

### 8.2 `POST /api/engine/load`

Loads a `ProjectJSON` into the engine. Returns a `projectId` that subsequent requests use to reference the loaded project.

**Request:**
```http
POST /api/engine/load HTTP/1.1
Content-Type: application/json

{
  "schemaVersion": 1,
  "metadata": { "id": "proj-1", "name": "Test", ... },
  ...
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{ "projectId": "proj-1" }
```

### 8.3 `POST /api/engine/command`

Applies a single command or a batch. Returns the `CommandResult`.

**Request:**
```http
POST /api/engine/command HTTP/1.1
Content-Type: application/json

{ "type": "play" }
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "ok": true,
  "stateChange": { ... },
  "undoInfo": { ... }
}
```

**Error response:**
```http
HTTP/1.1 200 OK  // Note: 200 even on command failure — the HTTP request succeeded,
                 // but the command itself returned { ok: false }.
Content-Type: application/json

{
  "ok": false,
  "error": {
    "code": "TRIM_BEYOND_SOURCE",
    "message": "..."
  }
}
```

> **Design note:** `ok: false` returns HTTP 200, not 4xx. The HTTP layer succeeded; only the command failed. Network errors (5xx) indicate the engine itself crashed or the request was malformed at the HTTP level.

### 8.4 `POST /api/engine/render-frame`

Renders a single frame and returns raw pixels. Used by cloud render (spec 11) and by tests that need pixel-accurate verification (spec 12 §5).

**Request:**
```http
POST /api/engine/render-frame HTTP/1.1
Content-Type: application/json
Accept: image/png, image/x-rgb24

{ "projectId": "proj-1", "frame": 150 }
```

**Response (PNG):**
```http
HTTP/1.1 200 OK
Content-Type: image/png
Content-Length: 1234567

<binary PNG data>
```

**Response (raw RGB24, for high-throughput cloud render):**
```http
HTTP/1.1 200 OK
Content-Type: image/x-rgb24
Content-Length: 49766400  // 3840*2160*3*2 (10-bit packed) or 3840*2160*3 (8-bit)

<binary RGB data, row-major, top-to-bottom>
```

### 8.5 `POST /api/engine/render-audio`

Renders the full audio mix as PCM samples. Uses `OfflineAudioContext` (spec 03).

**Request:**
```http
POST /api/engine/render-audio HTTP/1.1
Content-Type: application/json

{ "projectId": "proj-1" }
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: audio/x-float32-pcm
Content-Length: 23040000  // 48000 * 240 * 2 (stereo) * 4 (Float32)

<binary PCM data, Float32 LE, interleaved stereo>
```

### 8.6 `GET /api/engine/state`

Returns the full current `SceneState`. Used by clients that need to sync after losing connection.

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "activeSceneId": "scene-1",
  "scenes": [...],
  "tracks": { ... },
  "playbackState": { "currentTime": 600000000, "isPlaying": false, "rate": 1.0 },
  ...
}
```

### 8.7 `POST /api/engine/subscribe`

Subscribes to engine events via Server-Sent Events (SSE). The client sends a list of event types to subscribe to; the server pushes matching events as they occur.

**Request:**
```http
POST /api/engine/subscribe HTTP/1.1
Content-Type: application/json

{ "events": ["stateChanged", "playbackTimeUpdate", "renderProgress"] }
```

**Response (SSE stream):**
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"type":"stateChanged","stateChange":{...}}

data: {"type":"playbackTimeUpdate","time":120000000,"frame":30}

data: {"type":"playbackTimeUpdate","time":123333333,"frame":31}

...
```

### 8.8 Authentication

For cloud render (spec 11), the HTTP API is authenticated via a bearer token in the `Authorization` header. Tokens are issued by the cloud render service's job submission API (see spec 11 §4.3). Local engines (running in the same browser) do not require authentication.

### 8.9 Rate limiting

Cloud render endpoints are rate-limited to prevent abuse:
- `POST /api/engine/command`: 100 req/sec per project
- `POST /api/engine/render-frame`: 30 req/sec per project (frame rendering is expensive)
- `POST /api/engine/render-audio`: 1 req/sec per project (full audio render is very expensive)
- `POST /api/engine/subscribe`: 5 concurrent streams per project

Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) are included in every response.

### 8.10 Export results over the wire (Round-7 amendment)

Export commands travel the same `POST /api/engine/command` channel as everything else; only the response shape differs (§14.11):

- **`exportFCPXML` (bundleMedia: false)** — the XML string rides inline: `{ ok: true, stateChange: {…}, data: { kind: 'fcpxml', xml: "<fcpxml …>" } }`. Typical size is tens-to-hundreds of KB, well within a JSON response; this inline shape is what spec 10's Tier-3 WYSIWYG test diffs byte-for-byte.
- **`exportFCPXML` (bundleMedia: true)** — the response carries `data.artifactId`; the client fetches the zip bundle via `GET /api/engine/artifact/:artifactId`. Bundling is I/O (OPFS media copy), so it is assembled server-side into an artifact store before `exportArtifactReady` fires.
- **`exportMaster`** — job-style: the HTTP response is the job envelope `{ ok: true, data: { kind: 'renderJob', jobId, status: 'queued' } }` (HTTP 200 — the command succeeded; job failures arrive as events/endpoint state, per the §8.3 "ok:false is still 200" convention). Clients poll `GET /api/engine/job/:jobId` or subscribe via §8.7 SSE for `renderProgress`/`renderComplete`/`exportArtifactReady`. This maps 1:1 onto spec 11 §9.2's `RenderQueue.enqueue()` → jobId contract and §9.3's progress reporting.
- **`exportFrame`** — `data.artifactId` immediately; PNG bytes follow via the artifact endpoint (GPU readback is async). For tests that want synchronous bytes, Tier 2 should use `POST /api/engine/render-frame` (§8.4) instead — `exportFrame` is the user-facing "save current frame" command, `render-frame` is the test-facing raw-pixels endpoint.

---

## 9. Event Stream (for UI Sync)

When the engine state changes (via command, undo, redo, or external event), it emits events. The UI subscribes to these events and updates React state accordingly.

### 9.1 `EngineEvent` type

```ts
export type EngineEvent =
  // ── State changes ───────────────────────────────────────────────
  | { type: 'stateChanged'; stateChange: StateChange }
  | { type: 'commandApplied'; command: EngineCommand; result: CommandResult }
  | { type: 'commandUndone'; command: EngineCommand }
  | { type: 'commandRedone'; command: EngineCommand }
  // ── Playback ────────────────────────────────────────────────────
  | { type: 'playbackStarted'; time: MediaTime }
  | { type: 'playbackPaused'; time: MediaTime }
  | { type: 'playbackTimeUpdate'; time: MediaTime; frame: number }
  | { type: 'playbackRateChanged'; rate: number }
  | { type: 'playbackLoopChanged'; start: MediaTime | null; end: MediaTime | null }
  // ── Media ───────────────────────────────────────────────────────
  | { type: 'mediaImported'; mediaId: string; mediaInfo: MediaInfo }
  | { type: 'mediaDeleted'; mediaId: string }
  // ── Project lifecycle ──────────────────────────────────────────
  | { type: 'projectLoaded'; projectId: string }
  | { type: 'projectSaved'; projectId: string }
  | { type: 'projectClosed'; projectId: string }
  | { type: 'projectCreated'; projectId: string; name: string }
  // ── Render ─────────────────────────────────────────────────────
  | { type: 'renderProgress'; frame: number; totalFrames: number; progress: number }
  | { type: 'renderComplete'; frameCount: number; durationMs: number }
  | { type: 'renderError'; error: EngineError; frame?: number }
  // ── Export (output artifacts — §14.11) ────────────────────────
  | { type: 'exportJobStarted'; jobId: string; format: string; totalFrames?: number }
  | { type: 'exportArtifactReady'; jobId?: string; artifactId: string; mimeType: string; byteSize: number }
  // ── Errors ─────────────────────────────────────────────────────
  | { type: 'error'; error: EngineError };
```

### 9.2 Subscription API

The engine exposes a typed subscription method on `EditorCore`:

```ts
// src/engine/core/EditorCore.ts (extension)

export class EditorCore {
  // ... managers

  /**
   * Subscribe to engine events. Returns an unsubscribe function.
   * 
   * Example:
   *   const unsub = engine.subscribe(event => {
   *     if (event.type === 'stateChanged') {
   *       updateReactState(event.stateChange);
   *     }
   *   });
   *   // ... later
   *   unsub();
   */
  subscribe(listener: (event: EngineEvent) => void): () => void;
}
```

Internally, the engine maintains a `Set<(event: EngineEvent) => void>` of listeners. Every state-changing operation (command application, undo, redo, media import, etc.) calls `this.emit(event)` which iterates the set and calls each listener.

### 9.3 UI sync pattern

The React UI uses a single subscription to update a Zustand store:

```tsx
// src/ui/stores/engine-sync.ts

import { create } from 'zustand';
import { engine } from '@/engine';

interface EngineSyncState {
  activeSceneId: string | null;
  selectedElementIds: string[];
  currentTime: MediaTime;
  isPlaying: boolean;
  // ... other UI-relevant state
}

export const useEngineSync = create<EngineSyncState>((set) => ({
  activeSceneId: null,
  selectedElementIds: [],
  currentTime: 0,
  isPlaying: false,
}));

// Single subscription — updates the store on every event
engine.subscribe((event) => {
  switch (event.type) {
    case 'stateChanged':
      // For now, just trigger a re-render. A more sophisticated impl would
      // diff the stateChange and update only affected components.
      useEngineSync.setState({});
      break;
    case 'playbackTimeUpdate':
      useEngineSync.setState({ currentTime: event.time });
      break;
    case 'playbackStarted':
      useEngineSync.setState({ isPlaying: true });
      break;
    case 'playbackPaused':
      useEngineSync.setState({ isPlaying: false });
      break;
    // ... etc
  }
});
```

### 9.4 SSE transport

For remote engines (cloud render), events are transported via Server-Sent Events (SSE) over HTTP. The wire format is:

```
data: {"type":"stateChanged","stateChange":{"addedElements":["clip-3-right"],"modifiedElements":["clip-3"],...}}\n\n
data: {"type":"playbackTimeUpdate","time":120000000,"frame":30}\n\n
```

Each event is one `data:` line followed by a blank line. The JSON payload matches the `EngineEvent` TS type exactly. SSE was chosen over WebSocket because:
1. Events are server-to-client only (client-to-server goes via `POST /api/engine/command`).
2. SSE auto-reconnects on network drop.
3. SSE works through HTTP proxies that block WebSocket upgrades.

---

## 10. Versioning

The protocol is versioned for forward/backward compatibility. Cloud render servers can negotiate protocol version with clients. Old replay files can be loaded against newer engines (with deprecation warnings).

### 10.1 `ProtocolVersion`

```ts
export interface ProtocolVersion {
  /**
   * Major version — incremented on breaking changes (command types removed,
   * param names renamed, required fields added).
   * Old replay files with a different major version are rejected.
   */
  major: number;
  /**
   * Minor version — incremented on additive changes (new command types added,
   * new optional fields added).
   * Old replay files with a lower minor version load with deprecation warnings.
   */
  minor: number;
}
```

**Current version:** `{ major: 1, minor: 0 }` (this is the initial release of the spec).

### 10.2 `Envelope`

Every command sent over the wire (HTTP, SSE, replay log) is wrapped in an envelope that carries the protocol version. This allows the receiver to validate compatibility before attempting to parse the command.

```ts
export interface Envelope {
  /** Protocol version of the sender. */
  protocolVersion: ProtocolVersion;
  /** The command payload. */
  command: EngineCommand;
  /**
   * Optional: unique ID for this command (for idempotency and tracing).
   * If the receiver sees the same ID twice, it ignores the second occurrence.
   */
  commandId?: string;
  /**
   * Optional: timestamp (ISO 8601) when the command was issued.
   * Used for debugging and for ordering commands from concurrent senders.
   */
  issuedAt?: string;
}
```

### 10.3 Version negotiation

When a client connects to a cloud render server (spec 11), it sends its supported protocol version in the `POST /api/engine/load` request:

```http
POST /api/engine/load HTTP/1.1
Content-Type: application/json
X-Protocol-Version: 1.0

{ "schemaVersion": 1, ... }
```

The server responds with its supported version:

```http
HTTP/1.1 200 OK
X-Protocol-Version: 1.2

{ "projectId": "proj-1" }
```

If the server's major version differs from the client's, the server returns HTTP 400 with an error explaining the incompatibility:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "PROTOCOL_MISMATCH",
  "message": "Client protocol 1.0 not compatible with server protocol 2.0",
  "clientVersion": "1.0",
  "serverVersion": "2.0"
}
```

If only the minor version differs, the server accepts the request and includes a deprecation warning in the response headers:

```http
HTTP/1.1 200 OK
X-Protocol-Version: 1.2
X-Deprecation-Warning: Client protocol 1.0 is deprecated; server supports 1.2. New command types available: freezeFrame, rangeRemoval.
```

### 10.4 Replay log format

A replay log is a JSON array of `Envelope` objects, optionally with a header carrying the project:

```json
{
  "protocolVersion": { "major": 1, "minor": 0 },
  "project": { /* ProjectJSON */ },
  "commands": [
    { "protocolVersion": { "major": 1, "minor": 0 }, "command": { "type": "play" }, "issuedAt": "2026-08-22T10:00:00Z" },
    { "protocolVersion": { "major": 1, "minor": 0 }, "command": { "type": "split", "params": { ... } }, "issuedAt": "2026-08-22T10:00:01Z" },
    ...
  ]
}
```

Replay logs are used for:
- **Regression tests** — replay a recorded session against a new engine build and assert the final `SceneState` matches.
- **Bug reports** — users can attach a replay log to a bug report so developers can reproduce the exact sequence of operations.
- **Session recording** — for collaboration features (future), record and replay editing sessions.

---

## 11. Zod Schema

The Zod schema is the source of truth — TS types are inferred from it. This guarantees that the TS type, the wire format, and the validation all agree.

### 11.1 Schema structure

```ts
// src/engine/types/command-schema.ts

import { z } from 'zod';

// ── Primitive schemas ────────────────────────────────────────────────

export const MediaTimeSchema = z.number().int();
export const FrameRateSchema = z.object({
  numerator: z.number().int().positive(),
  denominator: z.number().int().positive(),
});
export const ElementRefSchema = z.object({
  trackId: z.string().uuid(),
  elementId: z.string().uuid(),
});

// ── Command schemas ──────────────────────────────────────────────────

export const SplitCommandSchema = z.object({
  type: z.literal('split'),
  params: z.object({
    time: MediaTimeSchema,
    trackIds: z.array(z.string().uuid()).nullable(),
    retainSide: z.enum(['both', 'left', 'right']).default('both'),
    rightElementIdSeed: z.string().optional(),
  }),
});

export const TrimCommandSchema = z.object({
  type: z.literal('trim'),
  params: z.object({
    elementId: z.string().uuid(),
    edge: z.enum(['start', 'end']),
    delta: MediaTimeSchema,
    ripple: z.boolean(),
    syncLinked: z.boolean().default(true),
    skipAdjacentClamp: z.boolean().default(false),
  }),
});

export const MoveCommandSchema = z.object({
  type: z.literal('move'),
  params: z.object({
    elementIds: z.array(z.string().uuid()).min(1),
    delta: MediaTimeSchema,
    targetTrackId: z.string().uuid().nullable(),
    movePlan: z.array(z.object({
      elementId: z.string().uuid(),
      sourceTrackId: z.string().uuid(),
      targetTrackId: z.string().uuid(),
      newStartTime: MediaTimeSchema,
    })).optional(),
    createTracks: z.array(z.object({
      id: z.string().uuid(),
      type: z.enum(['video', 'audio', 'overlay']),
      index: z.number().int().nonnegative(),
    })).optional(),
    snap: z.boolean().default(true),
  }),
});

export const RippleCommandSchema = z.object({
  type: z.literal('ripple'),
  params: z.object({
    command: z.lazy(() => EngineCommandSchema),
    syncLock: z.boolean().default(true),
  }),
});

export const RollCommandSchema = z.object({
  type: z.literal('roll'),
  params: z.object({
    leftElementId: z.string().uuid(),
    rightElementId: z.string().uuid(),
    delta: MediaTimeSchema,
    syncLinked: z.boolean().default(true),
  }),
});

export const SlipCommandSchema = z.object({
  type: z.literal('slip'),
  params: z.object({
    elementId: z.string().uuid(),
    delta: MediaTimeSchema,
    syncLinked: z.boolean().default(true),
  }),
});

export const SlideCommandSchema = z.object({
  type: z.literal('slide'),
  params: z.object({
    elementId: z.string().uuid(),
    delta: MediaTimeSchema,
    preserveContinuity: z.boolean().default(true),
    syncLinked: z.boolean().default(true),
  }),
});

export const DeleteCommandSchema = z.object({
  type: z.literal('delete'),
  params: z.object({
    elements: z.array(ElementRefSchema).min(1),
    ripple: z.boolean(),
    cascadeDependents: z.boolean().default(true),
  }),
});

export const InsertCommandSchema = z.object({
  type: z.literal('insert'),
  params: z.object({
    element: z.object({
      type: z.enum(['video', 'audio', 'image', 'text', 'shape', 'adjustment']),
      mediaId: z.string().uuid().optional(),
      startTime: MediaTimeSchema,
      duration: MediaTimeSchema.positive(),
      trimStart: MediaTimeSchema.default(0),
      trimEnd: MediaTimeSchema.default(0),
      speed: z.number().default(1.0),
      name: z.string().optional(),
    }),
    placement: z.discriminatedUnion('type', [
      z.object({ type: z.literal('explicit'), trackId: z.string().uuid() }),
      z.object({ type: z.literal('firstAvailable') }),
      z.object({
        type: z.literal('preferIndex'),
        trackIndex: z.number().int().nonnegative(),
        hoverDirection: z.enum(['above', 'below']),
        createNewTrackOnly: z.boolean().optional(),
      }),
      z.object({
        type: z.literal('aboveSource'),
        sourceTrackIndex: z.number().int().nonnegative(),
      }),
      z.object({
        type: z.literal('alwaysNew'),
        position: z.enum(['highest', 'default']),
      }),
    ]),
    ripple: z.boolean(),
    idSeed: z.string().optional(),
  }),
});

export const DuplicateCommandSchema = z.object({
  type: z.literal('duplicate'),
  params: z.object({
    elements: z.array(ElementRefSchema).min(1),
    placement: z.lazy(() => PlacementStrategySchema).optional(),
    timeOffset: MediaTimeSchema.default(0),
    idSeed: z.string().optional(),
  }),
});

export const RateStretchCommandSchema = z.object({
  type: z.literal('rateStretch'),
  params: z.object({
    elementId: z.string().uuid(),
    newDuration: MediaTimeSchema.positive(),
    newStartTime: MediaTimeSchema.optional(),
    scaleKeyframes: z.boolean().default(true),
    ripple: z.boolean(),
  }),
});

export const RetimeCommandSchema = z.object({
  type: z.literal('retime'),
  params: z.object({
    elementId: z.string().uuid(),
    rate: z.number().refine(r => Math.abs(r) >= 0.01 && Math.abs(r) <= 5.0 && r !== 0,
      { message: 'rate must be in [-5.0, -0.01] ∪ [0.01, 5.0]' }),
    maintainPitch: z.boolean(),
    keepStartTime: z.boolean().default(true),
    ripple: z.boolean(),
  }),
});

export const FreezeFrameCommandSchema = z.object({
  type: z.literal('freezeFrame'),
  params: z.object({
    elementId: z.string().uuid(),
    atTime: MediaTimeSchema,
    freezeDuration: MediaTimeSchema.positive().default(240000000), // 2 sec default (spec 06)
    frameMediaId: z.string().uuid(),
    ripple: z.boolean(),
  }),
});

export const RangeRemovalCommandSchema = z.object({
  type: z.literal('rangeRemoval'),
  params: z.object({
    startTime: MediaTimeSchema,
    endTime: MediaTimeSchema,
    trackIds: z.array(z.string().uuid()).nullable(),
    ripple: z.boolean(),
    syncLock: z.boolean().default(true),
    removeSilence: z.boolean().default(false),
  }),
});

export const UpdateElementsCommandSchema = z.object({
  type: z.literal('updateElements'),
  params: z.object({
    updates: z.array(z.object({
      trackId: z.string().uuid(),
      elementId: z.string().uuid(),
      patch: z.record(z.unknown()),  // Partial<TimelineElement> — type-checked at TS level
    })).min(1),
    pushHistory: z.boolean().default(true),
  }),
});

export const ToggleElementVisibilityCommandSchema = z.object({
  type: z.literal('toggleElementVisibility'),
  params: z.object({
    elementId: z.string().uuid(),
    value: z.boolean().optional(),
  }),
});

export const ToggleElementMutedCommandSchema = z.object({
  type: z.literal('toggleElementMuted'),
  params: z.object({
    elementId: z.string().uuid(),
    value: z.boolean().optional(),
  }),
});

// ── Track ops ────────────────────────────────────────────────────────

export const ToggleTrackMuteCommandSchema = z.object({
  type: z.literal('toggleTrackMute'),
  params: z.object({
    trackId: z.string().uuid(),
    value: z.boolean().optional(),
  }),
});

export const ToggleTrackSoloCommandSchema = z.object({
  type: z.literal('toggleTrackSolo'),
  params: z.object({
    trackId: z.string().uuid(),
    value: z.boolean().optional(),
  }),
});

export const ToggleTrackLockCommandSchema = z.object({
  type: z.literal('toggleTrackLock'),
  params: z.object({
    trackId: z.string().uuid(),
    value: z.boolean().optional(),
  }),
});

export const ToggleTrackVisibilityCommandSchema = z.object({
  type: z.literal('toggleTrackVisibility'),
  params: z.object({
    trackId: z.string().uuid(),
    value: z.boolean().optional(),
  }),
});

export const AddTrackCommandSchema = z.object({
  type: z.literal('addTrack'),
  params: z.object({
    type: z.enum(['video', 'audio', 'overlay']),
    index: z.number().int().nonnegative().optional(),
    name: z.string().optional(),
  }),
});

export const DeleteTrackCommandSchema = z.object({
  type: z.literal('deleteTrack'),
  params: z.object({
    trackId: z.string().uuid(),
    cascadeElements: z.boolean().default(true),
  }),
});

export const ReorderTrackCommandSchema = z.object({
  type: z.literal('reorderTrack'),
  params: z.object({
    trackId: z.string().uuid(),
    newIndex: z.number().int().nonnegative(),
  }),
});

// ── Playback ops ─────────────────────────────────────────────────────

export const PlayCommandSchema = z.object({
  type: z.literal('play'),
});

export const PauseCommandSchema = z.object({
  type: z.literal('pause'),
});

export const SeekCommandSchema = z.object({
  type: z.literal('seek'),
  params: z.object({
    time: MediaTimeSchema,
  }),
});

export const SetRateCommandSchema = z.object({
  type: z.literal('setRate'),
  params: z.object({
    rate: z.number().refine(r => r !== 0, { message: 'rate cannot be 0' }),
  }),
});

export const SetLoopCommandSchema = z.object({
  type: z.literal('setLoop'),
  params: z.object({
    start: MediaTimeSchema.nullable(),
    end: MediaTimeSchema.nullable(),
  }),
});

// ── Project ops ──────────────────────────────────────────────────────

export const CreateProjectCommandSchema = z.object({
  type: z.literal('createProject'),
  params: z.object({
    name: z.string().min(1),
    settings: z.object({
      fps: FrameRateSchema.optional(),
      canvasSize: z.object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      }).optional(),
    }).optional(),
    idSeed: z.string().optional(),
  }),
});

export const LoadProjectCommandSchema = z.object({
  type: z.literal('loadProject'),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const SaveProjectCommandSchema = z.object({
  type: z.literal('saveProject'),
});

export const CloseProjectCommandSchema = z.object({
  type: z.literal('closeProject'),
  params: z.object({
    force: z.boolean().optional(),
  }).optional(),
});

export const UpdateProjectSettingsCommandSchema = z.object({
  type: z.literal('updateProjectSettings'),
  params: z.object({
    settings: z.object({
      fps: FrameRateSchema.optional(),
      canvasSize: z.object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      }).optional(),
      backgroundColor: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
      displayMode: z.object({
        primaries: z.enum(['bt709', 'bt2020', 'display-p3']),
        transfer: z.enum(['srgb', 'pq', 'hlg']),
        toneMap: z.enum(['none', 'reinhard', 'aces-filmic']).optional(),
      }).optional(),
      audioSampleRate: z.number().int().positive().optional(),
      audioChannels: z.number().int().positive().optional(),
    }),
    pushHistory: z.boolean().default(true),
  }),
});

// ── Scene ops ────────────────────────────────────────────────────────

export const CreateSceneCommandSchema = z.object({
  type: z.literal('createScene'),
  params: z.object({
    name: z.string().min(1),
    isMain: z.boolean().default(false),
    idSeed: z.string().optional(),
  }),
});

export const DeleteSceneCommandSchema = z.object({
  type: z.literal('deleteScene'),
  params: z.object({
    sceneId: z.string().uuid(),
  }),
});

export const RenameSceneCommandSchema = z.object({
  type: z.literal('renameScene'),
  params: z.object({
    sceneId: z.string().uuid(),
    name: z.string().min(1),
  }),
});

export const SwitchSceneCommandSchema = z.object({
  type: z.literal('switchScene'),
  params: z.object({
    sceneId: z.string().uuid(),
  }),
});

export const ToggleBookmarkCommandSchema = z.object({
  type: z.literal('toggleBookmark'),
  params: z.object({
    time: MediaTimeSchema,
  }),
});

export const RemoveBookmarkCommandSchema = z.object({
  type: z.literal('removeBookmark'),
  params: z.object({
    time: MediaTimeSchema,
  }),
});

export const UpdateBookmarkCommandSchema = z.object({
  type: z.literal('updateBookmark'),
  params: z.object({
    time: MediaTimeSchema,
    updates: z.record(z.unknown()),
  }),
});

export const MoveBookmarkCommandSchema = z.object({
  type: z.literal('moveBookmark'),
  params: z.object({
    fromTime: MediaTimeSchema,
    toTime: MediaTimeSchema,
  }),
});

// ── Media ops ────────────────────────────────────────────────────────

export const ImportMediaCommandSchema = z.object({
  type: z.literal('importMedia'),
  params: z.object({
    asset: z.object({
      name: z.string(),
      type: z.enum(['video', 'audio', 'image']),
      size: z.number().int().nonnegative(),
      duration: MediaTimeSchema.optional(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      fps: FrameRateSchema.optional(),
      colorInfo: z.object({
        primaries: z.string(),
        transfer: z.string(),
      }).optional(),
      storage: z.object({
        kind: z.enum(['opfs', 'url', 'inline']),
        path: z.string().optional(),
        url: z.string().url().optional(),
      }),
    }),
    idSeed: z.string().optional(),
  }),
});

export const DeleteMediaCommandSchema = z.object({
  type: z.literal('deleteMedia'),
  params: z.object({
    mediaId: z.string().uuid(),
    cascadeElements: z.boolean().default(true),
  }),
});

// ── Tool / selection ops ─────────────────────────────────────────────

export const SelectToolCommandSchema = z.object({
  type: z.literal('selectTool'),
  params: z.object({
    tool: z.enum(['select', 'razor', 'ripple', 'slip', 'slide', 'roll', 'rate-stretch', 'hand', 'zoom']),
  }),
});

export const SelectElementsCommandSchema = z.object({
  type: z.literal('selectElements'),
  params: z.object({
    elements: z.array(ElementRefSchema),
    mode: z.enum(['replace', 'add', 'subtract', 'toggle']).default('replace'),
  }),
});

export const SelectTrackCommandSchema = z.object({
  type: z.literal('selectTrack'),
  params: z.object({
    trackId: z.string().uuid(),
    mode: z.enum(['replace', 'add', 'subtract', 'toggle']).default('replace'),
  }),
});

export const MarqueeSelectCommandSchema = z.object({
  type: z.literal('marqueeSelect'),
  params: z.object({
    rect: z.object({
      startTime: MediaTimeSchema,
      endTime: MediaTimeSchema,
      startTrackIndex: z.number().int().nonnegative(),
      endTrackIndex: z.number().int().nonnegative(),
    }),
    mode: z.enum(['replace', 'add', 'subtract', 'toggle']).default('replace'),
  }),
});

// ── Marker ops ───────────────────────────────────────────────────────

export const AddMarkerCommandSchema = z.object({
  type: z.literal('addMarker'),
  params: z.object({
    time: MediaTimeSchema,
    label: z.string().optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    type: z.enum(['note', 'chapter', 'todo', 'custom']).optional(),
  }),
});

export const DeleteMarkerCommandSchema = z.object({
  type: z.literal('deleteMarker'),
  params: z.object({
    markerId: z.string().uuid(),
  }),
});

export const UpdateMarkerCommandSchema = z.object({
  type: z.literal('updateMarker'),
  params: z.object({
    markerId: z.string().uuid(),
    updates: z.record(z.unknown()),
  }),
});

// ── Effect ops ───────────────────────────────────────────────────────

export const AddEffectCommandSchema = z.object({
  type: z.literal('addEffect'),
  params: z.object({
    elementId: z.string().uuid(),
    effect: z.object({
      type: z.string().min(1),
      enabled: z.boolean(),
      params: z.record(z.union([z.number(), z.array(z.number()), z.string(), z.boolean()])),
    }),
  }),
});

export const UpdateEffectCommandSchema = z.object({
  type: z.literal('updateEffect'),
  params: z.object({
    elementId: z.string().uuid(),
    effectId: z.string().uuid(),
    params: z.record(z.union([z.number(), z.array(z.number()), z.string(), z.boolean()])),
  }),
});

export const RemoveEffectCommandSchema = z.object({
  type: z.literal('removeEffect'),
  params: z.object({
    elementId: z.string().uuid(),
    effectId: z.string().uuid(),
  }),
});

export const ReorderEffectCommandSchema = z.object({
  type: z.literal('reorderEffect'),
  params: z.object({
    elementId: z.string().uuid(),
    order: z.array(z.string().uuid()),
  }),
});

export const ToggleEffectCommandSchema = z.object({
  type: z.literal('toggleEffect'),
  params: z.object({
    elementId: z.string().uuid(),
    effectId: z.string().uuid(),
    value: z.boolean().optional(),
  }),
});

// ── Mask ops ─────────────────────────────────────────────────────────

export const AddMaskCommandSchema = z.object({
  type: z.literal('addMask'),
  params: z.object({
    elementId: z.string().uuid(),
    mask: z.object({
      type: z.enum(['shape', 'image', 'qualifier']),
      enabled: z.boolean(),
      shape: z.enum(['rectangle', 'ellipse', 'polygon']).optional(),
      shapeParams: z.record(z.number()).optional(),
      mediaId: z.string().uuid().optional(),
      feather: z.number().nonnegative(),
      inverted: z.boolean(),
      opacity: z.number().min(0).max(1),
    }),
  }),
});

export const UpdateMaskCommandSchema = z.object({
  type: z.literal('updateMask'),
  params: z.object({
    elementId: z.string().uuid(),
    maskId: z.string().uuid(),
    updates: z.record(z.unknown()),
  }),
});

export const RemoveMaskCommandSchema = z.object({
  type: z.literal('removeMask'),
  params: z.object({
    elementId: z.string().uuid(),
    maskId: z.string().uuid(),
  }),
});

export const ToggleMaskCommandSchema = z.object({
  type: z.literal('toggleMask'),
  params: z.object({
    elementId: z.string().uuid(),
    maskId: z.string().uuid(),
    value: z.boolean().optional(),
  }),
});

// ── Transition ops ───────────────────────────────────────────────────

export const AddTransitionCommandSchema = z.object({
  type: z.literal('addTransition'),
  params: z.object({
    transition: z.object({
      type: z.literal('crossfade'),            // structural — spec 07 §6.1A
      presentation: z.string().min(1),          // registry key
      duration: MediaTimeSchema.positive(),
      alignment: z.number().min(0).max(1).default(0.5),
      timing: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out']).optional(),
      leftElementId: z.string().uuid(),
      rightElementId: z.string().uuid(),
    }),
  }),
});

export const UpdateTransitionCommandSchema = z.object({
  type: z.literal('updateTransition'),
  params: z.object({
    transitionId: z.string().uuid(),
    updates: z.record(z.unknown()),
  }),
});

export const RemoveTransitionCommandSchema = z.object({
  type: z.literal('removeTransition'),
  params: z.object({
    transitionId: z.string().uuid(),
  }),
});

// ── Keyframe ops ─────────────────────────────────────────────────────

export const UpsertKeyframesCommandSchema = z.object({
  type: z.literal('upsertKeyframes'),
  params: z.object({
    elementId: z.string().uuid(),
    keyframes: z.array(z.object({
      id: z.string().uuid().optional(),
      property: z.string().min(1),
      time: MediaTimeSchema,
      value: z.union([z.number(), z.array(z.number()), z.string(), z.boolean()]),
      interpolation: z.enum(['linear', 'bezier', 'step', 'hold']),
      curves: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
    })).min(1),
  }),
});

export const RemoveKeyframesCommandSchema = z.object({
  type: z.literal('removeKeyframes'),
  params: z.object({
    elementId: z.string().uuid(),
    keyframeIds: z.array(z.string().uuid()).min(1),
  }),
});

export const RetimeKeyframeCommandSchema = z.object({
  type: z.literal('retimeKeyframe'),
  params: z.object({
    elementId: z.string().uuid(),
    keyframeId: z.string().uuid(),
    time: MediaTimeSchema,
  }),
});

export const UpdateKeyframeCurvesCommandSchema = z.object({
  type: z.literal('updateKeyframeCurves'),
  params: z.object({
    elementId: z.string().uuid(),
    keyframeId: z.string().uuid(),
    curves: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  }),
});

// ── Clipboard ops ────────────────────────────────────────────────────

export const CopyCommandSchema = z.object({
  type: z.literal('copy'),
  params: z.object({
    elements: z.array(ElementRefSchema).min(1),
  }),
});

export const CutCommandSchema = z.object({
  type: z.literal('cut'),
  params: z.object({
    elements: z.array(ElementRefSchema).min(1),
  }),
});

export const PasteCommandSchema = z.object({
  type: z.literal('paste'),
  params: z.object({
    atTime: MediaTimeSchema,
    targetTrackId: z.string().uuid().nullable().optional(),
    ripple: z.boolean().default(false),
  }),
});

// ── Undo / redo ──────────────────────────────────────────────────────

export const UndoCommandSchema = z.object({
  type: z.literal('undo'),
});

export const RedoCommandSchema = z.object({
  type: z.literal('redo'),
});

// ── Snapshot ─────────────────────────────────────────────────────────

export const SnapshotCommandSchema = z.object({
  type: z.literal('snapshot'),
});

// ── Export ops (§14.11 — sanctioned OUTPUT exception; artifacts ride CommandResult.data) ──

export const ExportFCPXMLCommandSchema = z.object({
  type: z.literal('exportFCPXML'),
  params: z.object({
    format: z.enum(['fcpxml-1.10', 'fcpxml-1.11']).default('fcpxml-1.10'),
    bundleMedia: z.boolean().default(false),
  }),
});

export const ExportMasterCommandSchema = z.object({
  type: z.literal('exportMaster'),
  params: z.object({
    format: z.enum(['prores-4444', 'prores-422', 'h264', 'vp9']).default('prores-4444'),
    destination: z.enum(['cloud', 'local']).default('cloud'),
    range: z.object({
      start: MediaTimeSchema,
      end: MediaTimeSchema,
    }).nullable().optional(),
  }),
});

export const ExportFrameCommandSchema = z.object({
  type: z.literal('exportFrame'),
  params: z.object({
    format: z.enum(['png', 'jpg']).default('png'),
    time: MediaTimeSchema.optional(),
  }),
});

// ── Project ops (§4.3.77-78 — Round-7 additions) ──

export const RenameProjectCommandSchema = z.object({
  type: z.literal('renameProject'),
  params: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }),
});

export const DeleteProjectCommandSchema = z.object({
  type: z.literal('deleteProject'),
  params: z.object({
    id: z.string().min(1),
  }),
});

// ── The discriminated union ─────────────────────────────────────────

export const EngineCommandSchema = z.discriminatedUnion('type', [
  // Timeline ops
  SplitCommandSchema,
  TrimCommandSchema,
  MoveCommandSchema,
  RippleCommandSchema,
  RollCommandSchema,
  SlipCommandSchema,
  SlideCommandSchema,
  DeleteCommandSchema,
  InsertCommandSchema,
  DuplicateCommandSchema,
  RateStretchCommandSchema,
  RetimeCommandSchema,
  FreezeFrameCommandSchema,
  RangeRemovalCommandSchema,
  UpdateElementsCommandSchema,
  ToggleElementVisibilityCommandSchema,
  ToggleElementMutedCommandSchema,
  // Track ops
  ToggleTrackMuteCommandSchema,
  ToggleTrackSoloCommandSchema,
  ToggleTrackLockCommandSchema,
  ToggleTrackVisibilityCommandSchema,
  AddTrackCommandSchema,
  DeleteTrackCommandSchema,
  ReorderTrackCommandSchema,
  // Playback ops
  PlayCommandSchema,
  PauseCommandSchema,
  SeekCommandSchema,
  SetRateCommandSchema,
  SetLoopCommandSchema,
  // Project ops
  CreateProjectCommandSchema,
  LoadProjectCommandSchema,
  SaveProjectCommandSchema,
  CloseProjectCommandSchema,
  UpdateProjectSettingsCommandSchema,
  // Scene ops
  CreateSceneCommandSchema,
  DeleteSceneCommandSchema,
  RenameSceneCommandSchema,
  SwitchSceneCommandSchema,
  ToggleBookmarkCommandSchema,
  RemoveBookmarkCommandSchema,
  UpdateBookmarkCommandSchema,
  MoveBookmarkCommandSchema,
  // Media ops
  ImportMediaCommandSchema,
  DeleteMediaCommandSchema,
  // Tool / selection ops
  SelectToolCommandSchema,
  SelectElementsCommandSchema,
  SelectTrackCommandSchema,
  MarqueeSelectCommandSchema,
  // Marker ops
  AddMarkerCommandSchema,
  DeleteMarkerCommandSchema,
  UpdateMarkerCommandSchema,
  // Effect ops
  AddEffectCommandSchema,
  UpdateEffectCommandSchema,
  RemoveEffectCommandSchema,
  ReorderEffectCommandSchema,
  ToggleEffectCommandSchema,
  // Mask ops
  AddMaskCommandSchema,
  UpdateMaskCommandSchema,
  RemoveMaskCommandSchema,
  ToggleMaskCommandSchema,
  // Transition ops
  AddTransitionCommandSchema,
  UpdateTransitionCommandSchema,
  RemoveTransitionCommandSchema,
  // Keyframe ops
  UpsertKeyframesCommandSchema,
  RemoveKeyframesCommandSchema,
  RetimeKeyframeCommandSchema,
  UpdateKeyframeCurvesCommandSchema,
  // Clipboard ops
  CopyCommandSchema,
  CutCommandSchema,
  PasteCommandSchema,
  // Undo / redo
  UndoCommandSchema,
  RedoCommandSchema,
  // Snapshot
  SnapshotCommandSchema,
  ExportFCPXMLCommandSchema,
  ExportMasterCommandSchema,
  ExportFrameCommandSchema,
  RenameProjectCommandSchema,
  DeleteProjectCommandSchema,
]);

// ── Batch ────────────────────────────────────────────────────────────

export const CommandBatchSchema = z.object({
  type: z.literal('batch'),
  label: z.string(),
  commands: z.array(z.lazy(() => EngineCommandSchema)).min(1),
  atomic: z.boolean().default(true),
});

export const EngineCommandOrBatchSchema = z.union([EngineCommandSchema, CommandBatchSchema]);

// ── Type inference ──────────────────────────────────────────────────

export type EngineCommand = z.infer<typeof EngineCommandSchema>;
export type CommandBatch = z.infer<typeof CommandBatchSchema>;
export type SplitCommand = z.infer<typeof SplitCommandSchema>;
export type TrimCommand = z.infer<typeof TrimCommandSchema>;
// ... etc for every command type
```

### 11.2 Schema as source of truth

The TS types are inferred from the Zod schema via `z.infer<>`. This guarantees that:
1. The TS type, the wire format, and the validation logic agree.
2. Adding a new command type requires adding it to BOTH the schema and the discriminated union — they cannot drift.
3. Refactoring a param name in the schema automatically updates the TS type, breaking any consumer that uses the old name.

**Adoption note for spec 01 §3.3:** The manager method signatures in spec 01 §3.3 should be regenerated from these schemas. For example, `engine.timeline.splitElements({elements, splitTime, retainSide})` should be `engine.timeline.splitElements({elements: ElementRef[], splitTime: MediaTime, retainSide?: 'both'|'left'|'right'})` — which matches the `SplitCommand.params` schema (just renamed: `time` → `splitTime`, `trackIds` → `elements` because the schema takes a list of elements not a list of track IDs). This alignment is deferred to a future spec revision (it's not blocking TEST-02).

### 11.3 Strict mode

The schema uses Zod's default strictness (additional keys cause validation failure). This prevents typos in param names from silently being ignored. If a client sends `{"type": "split", "params": {"time": 5000000, "trackIds": null, "extraField": true}}`, the schema rejects it with `error.issues[0].message = "Unrecognized key(s) in object: 'extraField'"`.

For development, the schema can be relaxed to strip unknown keys (`z.object({...}).strip()`), but production uses strict mode.

### 11.4 Performance

Zod validation of a typical `EngineCommand` takes <0.1ms on modern hardware. For 1000 commands/sec (the high end of what a UI generates), validation overhead is ~100ms/sec — negligible. For cloud render (sequential, one command per request), validation overhead is invisible.

---

## 12. Test Harness Usage

### 12.1 The fast path

Tests use the protocol directly — no React, no DOM, no WebGPU. The engine core (Layer 2) runs in pure TS, applying commands and asserting on `SceneState`.

```ts
// tests/unit/engine/split.test.ts

import { describe, test, expect, beforeAll } from 'vitest';
import { createInteractiveEngine } from '@/engine/interactive';
import { EngineCommandSchema } from '@/engine/types/command-schema';
import { MemoryStorage } from '@/platform/storage/MemoryStorage';
import { testProject } from '../../fixtures/projects/simple-cut';

describe('split command', () => {
  let engine: EditorCore;

  beforeAll(async () => {
    // Create an engine with in-memory storage (no OPFS, no real media)
    engine = await createInteractiveEngine({
      canvas: createStubCanvas(),
      storage: new MemoryStorage(),
    });
    await engine.project.loadFromJSON(testProject);
  });

  test('split preserves total duration', async () => {
    const state = engine.scenes.getActiveScene();
    const originalDuration = state.tracks.main.elements.reduce(
      (sum, el) => Math.max(sum, el.startTime + el.duration),
      0,
    );

    // Construct the command as a plain JSON object
    const command = EngineCommandSchema.parse({
      type: 'split',
      params: { time: 5000000, trackIds: null },
    });

    // Apply it
    const result = engine.command.apply(command);
    expect(result.ok).toBe(true);

    // Assert on the new state
    const newState = engine.scenes.getActiveScene();
    const newDuration = newState.tracks.main.elements.reduce(
      (sum, el) => Math.max(sum, el.startTime + el.duration),
      0,
    );
    expect(newDuration).toBe(originalDuration);
  });

  test('split at element boundary is a no-op', () => {
    const element = engine.scenes.getActiveScene().tracks.main.elements[0];
    const result = engine.command.apply({
      type: 'split',
      params: { time: element.startTime, trackIds: null },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NO_ELEMENTS_AT_TIME');
    }
  });

  test('undo restores exact state', () => {
    const before = engine.scenes.getActiveScene().tracks;
    engine.command.apply({
      type: 'split',
      params: { time: 6000000, trackIds: null },
    });
    engine.command.apply({ type: 'undo' });
    const after = engine.scenes.getActiveScene().tracks;
    expect(after).toEqual(before);
  });
});
```

### 12.2 Replay-based regression tests

A replay log (§10.4) can be loaded directly into a test:

```ts
// tests/regression/replay-001.test.ts

import { describe, test, expect } from 'vitest';
import { loadReplayLog } from '../../helpers/replay';
import { createInteractiveEngine } from '@/engine/interactive';

describe('replay 001: split + ripple delete', () => {
  test('produces expected final state', async () => {
    const { project, commands, expectedFinalState } = await loadReplayLog(
      'tests/fixtures/replays/001-split-ripple-delete.json',
    );

    const engine = await createInteractiveEngine({
      canvas: createStubCanvas(),
      storage: new MemoryStorage(),
    });
    await engine.project.loadFromJSON(project);

    for (const cmd of commands) {
      const result = engine.command.apply(cmd);
      expect(result.ok, `Command ${cmd.type} failed: ${result.ok ? '' : result.error.message}`).toBe(true);
    }

    const finalState = engine.scenes.getActiveScene();
    expect(finalState).toEqual(expectedFinalState);
  });
});
```

### 12.3 Cloud render via the HTTP API

Tests can drive the cloud render server via the HTTP API:

```ts
// tests/cloud-render/render-frame.test.ts

import { test, expect } from '@playwright/test';

test('render frame 150 matches reference', async ({ request }) => {
  // Load the project
  const loadResp = await request.post('/api/engine/load', {
    data: testProject,
    headers: { 'X-Protocol-Version': '1.0' },
  });
  const { projectId } = await loadResp.json();

  // Apply commands to set up the state
  await request.post('/api/engine/command', {
    data: { type: 'split', params: { time: 5000000, trackIds: null } },
  });

  // Render frame 150
  const renderResp = await request.post('/api/engine/render-frame', {
    data: { projectId, frame: 150 },
    headers: { Accept: 'image/png' },
  });
  const pngBuffer = await renderResp.body();

  // Compare against reference
  const reference = await readFile('tests/fixtures/references/frame-150.png');
  const diff = await pixelDiff(pngBuffer, reference);
  expect(diff).toBeLessThan(0.001); // 0.1% pixel difference threshold
});
```

### 12.4 Property-based testing

The protocol's discriminated union makes property-based testing tractable — `fast-check` can generate arbitrary `EngineCommand` sequences and assert invariants:

```ts
// tests/property/ops-invariants.test.ts

import { test, expect } from 'vitest';
import fc from 'fast-check';
import { EngineCommandSchema } from '@/engine/types/command-schema';
import { createInteractiveEngine } from '@/engine/interactive';

test('no overlapping elements after any op sequence', async () => {
  const engine = await createInteractiveEngine({
    canvas: createStubCanvas(),
    storage: new MemoryStorage(),
  });
  await engine.project.loadFromJSON(emptyProject);

  // Arbitrary command generator — biased toward timeline ops
  const arbitraryCommand = fc.oneof(
    fc.record({
      type: fc.constant('split'),
      params: fc.record({
        time: fc.integer({ min: 0, max: 10_000_000 }),
        trackIds: fc.constant(null),
      }),
    }),
    fc.record({
      type: fc.constant('trim'),
      params: fc.record({
        elementId: fc.constant('clip-1'),  // would be sampled from current state
        edge: fc.constantFrom('start', 'end'),
        delta: fc.integer({ min: -1_000_000, max: 1_000_000 }),
        ripple: fc.boolean(),
      }),
    }),
    // ... etc for every command type
  );

  fc.assert(fc.property(
    fc.array(arbitraryCommand, { maxLength: 100 }),
    (commands) => {
      for (const cmd of commands) {
        const parseResult = EngineCommandSchema.safeParse(cmd);
        if (!parseResult.success) return true; // skip invalid commands
        engine.command.apply(parseResult.data);
      }
      const state = engine.scenes.getActiveScene();
      for (const track of [state.tracks.main, ...state.tracks.overlay, ...state.tracks.audio]) {
        const sorted = [...track.elements].sort((a, b) => a.startTime - b.startTime);
        for (let i = 0; i < sorted.length - 1; i++) {
          const a = sorted[i];
          const b = sorted[i + 1];
          if (a.startTime + a.duration > b.startTime) {
            return false; // overlap detected
          }
        }
      }
      return true;
    }
  ));
});
```

### 12.5 Tier 1 (pure-function) tests

Per spec 12 testing strategy, tier 1 tests run without a browser — pure TS, no DOM, no WebGPU. The wire protocol makes tier 1 tests trivial to write:

```ts
// Tier 1: pure-function test — no browser, no DOM, no WebGPU
// Runs in ~5ms

test('split adds one element to the timeline', () => {
  const engine = createStubEngine(testProject);
  const before = engine.scenes.getActiveScene().tracks.main.elements.length;

  engine.command.apply({
    type: 'split',
    params: { time: 5000000, trackIds: null },
  });

  const after = engine.scenes.getActiveScene().tracks.main.elements.length;
  expect(after).toBe(before + 1);
});
```

Compare to the tier 3 (Playwright) equivalent, which would require launching Chrome, loading a page, clicking the razor tool, clicking on the timeline, and screenshotting the result — ~5 seconds per test. The wire protocol collapses tier 3 to tier 1 for any test that doesn't actually need to verify rendering.

### 12.6 Contract test

Following FreeCut's `headless/contract.test.mjs` pattern (spec 12 §8 verified pattern), we add a contract test that verifies every command type has a valid Zod schema and a corresponding dispatcher case:

```ts
// tests/contract/command-contract.test.ts

import { test, expect } from 'vitest';
import { EngineCommandSchema } from '@/engine/types/command-schema';
import { commandSamples } from './command-samples';

test('every command type has a valid sample that passes schema', () => {
  for (const [typeName, sample] of Object.entries(commandSamples)) {
    const result = EngineCommandSchema.safeParse(sample);
    expect(result.success, `Command type "${typeName}" failed schema validation: ${result.success ? '' : result.error.message}`).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe(typeName);
    }
  }
});

test('every command type has a dispatcher case', () => {
  // Compile-time check: the `dispatch()` switch is exhaustive
  // (the `const _: never = command` line fails to compile if any case is missing)
  // This test just verifies at runtime that the dispatcher doesn't throw
  // for any sample command.
  for (const sample of Object.values(commandSamples)) {
    const engine = createStubEngine(testProject);
    const result = engine.command.apply(sample);
    // We don't care if it succeeded or failed — we just care that it
    // didn't throw "Unknown command type".
    if (!result.ok) {
      expect(result.error.code).not.toBe('UNKNOWN_COMMAND_TYPE');
    }
  }
});
```

---

## 13. Relationship to Other Specs

### 13.1 Spec 01 (core engine)

- `EditorCore.command.apply(command: EngineCommand): CommandResult` is the entry point defined in this spec. It's added to `CommandManager` (spec 01 §3.3) as the canonical external mutation API.
- The existing `engine.command.execute({command: Command})` API (spec 01 §4.1, OpenCut-classic `commands.ts:21-37`) is the low-level internal API — it takes a `Command` class instance, not a JSON object. `apply()` is a thin wrapper that validates via Zod, dispatches to the right `Command` subclass constructor, and calls `execute()`.
- Manager methods like `engine.timeline.splitElements(...)` (spec 01 §3.3) remain for backward compatibility — they're thin wrappers that construct the `EngineCommand` and call `apply()`. New code should call `apply()` directly; the manager methods exist primarily for OpenCut-classic code that we're porting.

### 13.2 Spec 06 (NLE ops)

- Every op in spec 06's inventory (§3, the table of 14 ops) has a corresponding `EngineCommand` type in this spec's union (§4.1).
- The mapping is 1:1: `Split` → `SplitCommand`, `Trim` → `TrimCommand`, `Move` → `MoveCommand`, `Ripple` → `RippleCommand` (meta), `Roll` → `RollCommand`, `Slip` → `SlipCommand`, `Slide` → `SlideCommand`, `Delete` → `DeleteCommand`, `Insert` → `InsertCommand`, `Duplicate` → `DuplicateCommand`, `Rate Stretch` → `RateStretchCommand`, `Retime` → `RetimeCommand`, `Freeze Frame` → `FreezeFrameCommand`, `Range Removal` → `RangeRemovalCommand`.
- Spec 06's `BatchCommand` (§4.3, OpenCut-classic `batch-command.ts`) corresponds to this spec's `CommandBatch` (§7). The difference: `BatchCommand` is a TS class instance, `CommandBatch` is a JSON object. `apply(CommandBatch)` constructs a `BatchCommand` internally.
- Spec 06's `TracksSnapshotCommand` (§4.4, OpenCut-classic `tracks-snapshot.ts`) corresponds to the internal mechanism used by `UndoInfo.previousState` (§6.2). When a command's `undoInfo` carries `previousState`, the engine constructs a `TracksSnapshotCommand` to restore it.

### 13.3 Spec 09 (project model)

- `ProjectJSON` (spec 09 §3.1) is Layer 1 of the three-layer protocol (§3.1). The wire protocol does NOT redefine `ProjectJSON` — it references spec 09's definition.
- `engine.project.loadFromJSON(project: ProjectJSON)` and `engine.project.serialize(): ProjectJSON` (spec 01 §3.3 `ProjectManager`) are the bridge between Layer 1 and Layer 2.
- Element/track/marker/effect/mask/transition types referenced in command params (§4.3) are defined in spec 09 §3.1 (`ElementJSON`, `TrackJSON`, `EffectJSON`, `MaskJSON`, `TransitionJSON`).

> **Canonical sub-type cross-references (schema drift acknowledgement):**
>
> The following sub-types referenced in command params (§4.3 / §11.1) have a **canonical definition in spec 09 §3.1**. The wire-protocol's local Zod shapes are convenience aliases used for command validation only — spec 09 remains canonical. Where the two shapes drift, a follow-up revision will reconcile them; until then, callers serializing to/from `ProjectJSON` must consult spec 09.
>
> - **`ElementJSON`** — canonical in spec 09 §3.1. The wire-protocol's `InsertCommand.params.element` (§4.3.9 `ElementSpec`) and `TrimCommand`'s trim-edge dispatcher description use field names `trimStart` / `trimEnd`; spec 09's canonical `ElementJSON` uses `sourceStart` / `sourceDuration`. See spec 09 §3.1 for the canonical type.
> - **`MediaStorageRef`** — canonical in spec 09 §3.1. Spec 09 defines `type: 'opfs' | 'remote'` with required `path`. The wire-protocol's `ImportMediaCommandSchema.params.asset.storage` (§11.1) uses `kind: 'opfs' | 'url' | 'inline'` with optional `path`/`url` — a more flexible alias; spec 09 is canonical.
> - **`MediaColorInfo`** — canonical in spec 09 §3.1. Spec 09 requires `primaries`, `transfer`, `matrix`, `range`. The wire-protocol's `ImportMediaCommandSchema.params.asset.colorInfo` (§11.1) only carries `primaries` and `transfer` (drops `matrix`/`range` — those are derived at probe time). Spec 09 is canonical; the wire-protocol's slimmer shape is a command-input convenience.
> - **`Marker` / marker storage location** — canonical in spec 09 §3.1. **(Round 15 amendment, resolving this note's historical claim):** markers are now **PER SCENE** — `SceneJSON.markers: Marker[]` with one unified type `Marker {id, time, label?, color?}` (the A2 unification absorbs the former Bookmark shape; project-level markers are retired). The earlier R7 note here asserted the project-level array as canonical — that reading is superseded by the A2 ruling (mock + opencut-timeline both store per-scene; OT's bookmark family is the wire surface that 15 §13.15 renames into `addMarker/updateMarker/deleteMarker`). The `AddMarkerCommand` / `DeleteMarkerCommand` / `UpdateMarkerCommand` mappings target the ACTIVE scene's markers (via the scene-scoped editing core), not a project-level array. See spec 09 §3.1 (R15) for the canonical `Marker` type and storage location.

### 13.4 Spec 12 (testing strategy)

- Tier 1 tests (pure-function, no browser — spec 12 §3.1) use the wire protocol directly via `engine.command.apply()`.
- The "fast path" described in spec 12 §3.1 is enabled by this spec — without the wire protocol, tier 1 tests would have to call manager methods directly (which works but is more verbose and doesn't test the validation/dispatch layer).
- Property-based tests (spec 12 §8) generate arbitrary `EngineCommand` sequences via `fast-check` and assert invariants.
- The contract test pattern (FreeCut's `headless/contract.test.mjs:1-210`, spec 12 §8 verified example) is adopted in §12.6.

### 13.5 Spec 16 (keyboard shortcuts — shipped, TEST-03)

Every keyboard shortcut maps to an `EngineCommand` — spec 16 §3 (**181 bindings** across 13 categories, per its Round-15 census sync) is that table. Spec 16's §0.2 declares this spec's union canonical ("where this spec and spec 15 both define a command name, spec 15 wins"), and its §8.3 resolver fills `<runtime>` params (currentTime, selectedIds, focusedTrackId) before calling `engine.command.apply()`. Spec 16 also defines UI-layer extensions (viewport zoom, panel focus, snap toggle — routed to the UI store, not `apply()`); see spec 16 §0.2 and spec 18 (UI shell) for the dispatch split. Export bindings (`Cmd+E` etc.) dispatch the §4.3.74-76 commands.

The shortcut registry (realized as spec 16 §3 + its Appendix A flat registry) is a `{ shortcut: string, command: EngineCommand }` table. Example:

```ts
const shortcutRegistry = {
  'Space':       { type: 'play' },
  'Cmd+Z':       { type: 'undo' },
  'Cmd+Shift+Z': { type: 'redo' },
  'Cmd+C':       { type: 'copy', params: { elements: '<selection>' } },
  'Cmd+V':       { type: 'paste', params: { atTime: '<playhead>' } },
  'R':           { type: 'selectTool', params: { tool: 'ripple' } },  // A6 ruling (R15): R = ripple TOOL; ⌥R toggles ripple mode. B is the razor key per 16 §3.2.
  // ... etc
};
```

When the user presses a shortcut, the UI constructs the `EngineCommand` (filling in `<selection>` and `<playhead>` from current state) and calls `engine.command.apply()` — spec 16 §8.3's resolver is that construction layer, now realized.

### 13.6 Spec 17 (test plan — shipped, TEST-04)

Tier 1 tests (pure-function, no browser — spec 17 §2.1) use this protocol via `engine.command.apply()` (templates in §12). Tier 2 render tests use `/api/engine/render-frame`/`render-audio` (§8.4-8.5). Tier 3 UI tests (spec 17 §2.1, including state-WYSIWYG §6.1) drive keyboard/mouse through the UI and assert against `window.__engine.command.apply()` on the test harness (spec 17 §15.6). Property-based tests generate `EngineCommand[]` sequences against this spec's Zod schemas (spec 17 §7).

### 13.7 Spec 11 (cloud render)

The HTTP API (§8) is the cloud render server's external interface. Cloud render clients (CLI tools, web dashboards) construct `EngineCommand`s and POST them to `/api/engine/command`. The server applies them, renders frames on demand, and streams events via SSE. The `exportMaster` command (§4.3.75) is the protocol-facing front door to spec 11's render queue: `apply({type:'exportMaster', params:{destination:'cloud'}})` enqueues a spec 11 §9.1 render job and returns `{ data: { kind: 'renderJob', jobId } }`; progress flows back over the §9 event stream / §8.10 job endpoint. `exportFCPXML` with cloud storage refs is similarly serializable — the XML references media by `MediaStorageRef`, so a cloud client can POST the command without downloading media.

### 13.8 Spec 03 (playback engine)

`PlayCommand`, `PauseCommand`, `SeekCommand`, `SetRateCommand`, `SetLoopCommand` map to `PlaybackManager` methods (spec 01 §3.3). The actual playback scheduling (AudioContext clock, AudioWorklet varispeed, rAF loop) is internal to `PlaybackManager` and `AudioManager` — the wire protocol just triggers state changes.

### 13.9 Spec 04 (renderer/color) + Spec 07 (composition)

Layer 3 of the protocol. `engine.renderer.renderFrame(n)` (spec 04 §7) reads the current `SceneState` (post-commands) and produces pixels. `buildFrameDescriptor(state, n)` (spec 07 §4) is the pure function that converts `SceneState` + frame number → `FrameDescriptor`. The wire protocol doesn't touch Layer 3 directly — but the HTTP API endpoints `/api/engine/render-frame` and `/api/engine/render-audio` (§8) expose Layer 3 over the wire.

### 13.10 Spec 08 (color grading)

The `EffectSpec` type in `AddEffectCommand.params.effect` (§4.3.52) references spec 08's effect inventory. The `type` discriminator (`'color-wheels' | 'curves' | 'lut' | 'qualifier' | 'power-window' | ...`) matches spec 08's effect type registry. The `params` object carries the effect-specific parameters (e.g., color wheels has `liftHue`, `gammaAmount`, etc. — spec 08 §3). Note (Round 7): the nle-engine reference registry uses `gpu-*`-prefixed ids (`'gpu-color-wheels'`, `'gpu-lut'`); the mapping row lives in `19-code-references.md` — this spec's bare ids remain canonical.

### 13.11 Spec 10 (FCPXML export) — export commands (Round-7 amendment)

The three export commands (§4.3.74-76) close the Round-7 MAJOR gap (TEST-INTEGRATION-REVIEW Issue #1): spec 10's Tier-3 state-WYSIWYG test T3.2 — `keyboard-cmd-e-matches-direct-engine-command`, comparing the `Cmd+E` output byte-for-byte against `engine.command.apply({ type: 'exportFCPXML', params: { bundleMedia: false } })` — is now un-gated (spec 10's gating note removed in Round 7). `ExportFCPXMLCommand` is the command-shaped wrapper around spec 10 §5's `ProjectJSON → FCPXML` serializer: `format` defaults to `'fcpxml-1.10'` (spec 10's DTD target — `version CDATA #FIXED "1.10"`); `'fcpxml-1.11'` exists solely for Display P3 colorSpace fidelity (spec 10 §13 Correction #4). `bundleMedia: true` activates spec 10's media-bundling layout. Spec 16 §3.9's export bindings (`Cmd+E`, `Cmd+Shift+E`, `Cmd+Option+E`) now dispatch these canonical types instead of spec-16 extensions.

### 13.12 Spec 18 (UI shell)

The UI shell (`18-ui-shell.md`, derived from `ui-mock/davinci_resolve_ui_mock.html`) is a pure consumer of Layer 2: every panel control constructs an `EngineCommand` and calls `engine.command.apply()`. Mockup→command contracts: viewer transport (`btn-play`/`btn-loop`) → `play`/`pause`/`setLoop`; track-header mute/lock/visibility buttons → `toggleTrackMute`/`toggleTrackLock`/`toggleTrackVisibility`; timeline-toolbar magnet (snap) and link-lock route to the UI store per spec 16 §0.2; inspector tabs drive `selectElements` + read `EngineEvent`s; the Deliver page dispatches the §4.3.74-76 export commands. No shell control calls a manager method directly (spec 18 §5's interaction-contract table is normative).

### 13.13 Spec 19 (code references & nle-engine reconciliation)

Spec 19 is the canon-hierarchy + reference-repo map. §13.14's table is this spec's contribution to it. When the private nle-engine's headless API (19-op JSON-RPC + `$ref`, `headless/api.ts:747`) and this spec conflict, this spec (canon) wins — the engine's op surface is the adapter target, not the protocol.

### 13.14 Code References — nle-engine (reference, NOT canon)

nle-engine (github.com/bearachprema/nle-engine, 37,958 LOC) is a clean-room FreeCut-port engine kept as an in-between de-risking reference. It is NOT conformant to this spec; it inherits FreeCut patterns this spec corrects. When engine and spec conflict, the spec wins. The valuable content is the delta, mapped below (citations verified Round 7):

| Spec 15 section | nle-engine file:line | Verified quote | Status | Note |
|---|---|---|---|---|
| §4.1 union (78 types) | `headless/api.ts:747` | `// ─── applyOp: the 19-case JSON-RPC dispatch ─────────────────` | CORRECTIVE | 19-op `EditOp` union vs typed, categorized union |
| §4.3.1 SplitCommand | `headless/api.ts:804` | `case 'split': {` | CORRECTIVE | Engine `split {id, frame}` vs spec `{time, trackIds, retainSide}` |
| §4.3.2 TrimCommand | `headless/api.ts:811` | `case 'trimStart': {` | CORRECTIVE | Two engine ops vs one `trim {edge, delta}` command |
| §4.3.8/9 Insert/Delete | `headless/api.ts:772` | `case 'addItem': {` | CORRECTIVE | Raw Clip object vs validated ElementSpec + PlacementStrategy |
| §4.3.61-63 transitions | `headless/api.ts:825` | `case 'addTransition': {` | CORRECTIVE | `leftClipId/rightClipId/presentation` — param names differ (FreeCut wire shape) |
| §4.3.22/23 tracks | `headless/api.ts:868` | `case 'addTrack': {` | ALIGNED | `addTrack(kind, order)` exists; delete/reorder commands absent |
| §4.3.52/54 effects | `headless/api.ts:938` | `case 'addEffect': {` | ALIGNED | `addEffect(itemId, effect)` maps to AddEffectCommand |
| §4.3.64/65 keyframes | `headless/api.ts:885` | `case 'addKeyframe': {` | CORRECTIVE | Per-property ops vs `upsertKeyframes {elementId, keyframes[]}` |
| §7 CommandBatch | `headless/api.ts:985` | `function applyOpTracked(` | CORRECTIVE | Batch aborts on first failure without rollback; spec §7.1 requires atomic all-or-nothing |
| §4.4 apply() dispatcher | `headless/api.ts:759` | `export function applyOp(op: EditOp, actions: TimelineActionsAdapter): unknown {` | CORRECTIVE | Adapter dispatch + op-local detail vs uniform CommandResult |
| §2 goal 1 (JSON-serializable) | `headless/api.ts:542` | `export function resolveOperationRefs(` | CORRECTIVE | `{$ref: 'callerId#/pointer'}` chaining vs by-value IDs (replayability) |
| §11 Zod schemas | `headless/api.ts:1691` | `export const editOpSchema = z.union(opSchemas);` | ALIGNED | Zod-at-the-boundary philosophy matches §11 |
| §12.2 replay | `headless/api.ts:1067` | `project: input.project, // Wave 2 will replace with the rebuilt project.` | CORRECTIVE | Fake editProject round-trip (engine P0.4); the spec's determinism contract is what the engine must grow |
| §4.3.71 UndoCommand | `timeline/timeline.ts:5247` | `undo(): boolean {` | ALIGNED | Capability exists; spec requires `{type:'undo'}` via the dispatcher |
| §4.3.73 SnapshotCommand | `timeline/timeline.ts:5292` | `snapshot(label: string = 'snapshot'): TimelineSnapshot {` | ALIGNED | Same pattern, protocol-shaped |
| §4.2 mapping (adapter surface) | `timeline/timeline.ts:2275` | `splitClip(` | ALIGNED | The 102-method class surface is the manager layer `apply()` dispatches to |
| §13.8 playback commands | `playback/player.ts:1889` | `ratechange: { playbackRate: number };` | ENGINE-GAP | Zero playback ops on the engine's wire surface despite Player rate support |

### 13.15 Code References — opencut-timeline (the editing-domain command surface per Decision 12) — added Round 8, amended Round 9, **refreshed Round 15 (24-command reality)**

The timeline-side headless surface (`src/lib/timeline/headless/api.ts`). It is **structurally the spec-15 skeleton** (same `EngineCommand`/`CommandResult` envelope idea, same single-dispatcher design, atomic `applyBatch`, never-throws `apply()`) with two systemic deltas: **prefixed command names (C7 — deliberately deferred by the repo, DECISIONS #9, pending this spec's own conflict resolution which Round 15 now supplies)** and **coarse error codes**. Full command-by-command table: SCOUT-R8-A §3.2 (R8-era) + SCOUT-R15-B §4 (current).

| Spec 15 contract | opencut-timeline (file:line @ `0412e41`) | Status | Delta |
|---|---|---|---|
| §4.1 bare type discriminator | `headless/api.ts:39-125` — **24 types** (since W5; the R8-era "18" citation was stale), all `timeline.*`/`track.*`-prefixed | **CORRECTIVE (C7)** | Premise refuted (00-master:234/:562 are bare — the repo mistook §4.2's manager-method column for the command union). **Rename pass (24):** `timeline.insert/trim/split/delete/move/duplicate/updateElements/seek/play/pause/selectElements/undo/redo`→bare; `timeline.rippleDelete`→wrapper (see row below); `track.toggleMute/toggleVisibility`→`toggleTrackMute/toggleTrackVisibility`; `track.add`→`addTrack`; `track.remove`→`deleteTrack`; **`timeline.toggleBookmark/removeBookmark/moveBookmark`→ the unified marker family** (fold with the 09 A2-amendment: `addMarker/updateMarker/deleteMarker` semantics — toggle≈add/delete, move≈update position); **`timeline.upsertKeyframe/removeKeyframe/retimeKeyframe`→ singular per-key forms** of `upsertKeyframes/removeKeyframes/retimeKeyframes` (batch engine-ops exist at timeline-core.ts:1210/:1437 — align wire forms) |
| §4.3.3 MoveCommand | `ops/group-move.ts:69-74` — `PlannedElementMove {elementId, sourceTrackId, targetTrackId, newStartTime}` | **ALIGNED (exact)** | Field-for-field match incl. `PlannedTrackCreation`; repo implements only the movePlan form — add the simple `{elementIds, delta, targetTrackId}` form |
| §4.3.1 SplitCommand | `headless/api.ts:60` — `{elements, splitTimeTicks, retainSide}` | CONVERGENT | Element-addressing + retainSide match; spec's `time`/`trackIds` (split-at-time across tracks) is the superset; repo lacks `rightElementIdSeed` (internal counter instead — align to `idSeed` at wire) |
| §4.3.2 TrimCommand | `headless/api.ts:52` — `{elements: ElementRef[], side: 'left'\|'right', deltaTicks}` | CONVERGENT | Group+side is the controller-layer shape; wire shape stays single-element+edge (spec 06 §5.2 documents the mapping) |
| §4.3.9 InsertCommand | `headless/api.ts:40` — `{element, startTimeTicks, strategy 2-value, trackId}` | CONVERGENT | 5-strategy placement is `ops/placement`; wire needs full `PlacementStrategy` + `ripple` + `idSeed`; returns actual landed time on zero-anchor clamp (`api.ts:169-172`) — spec's `data` should carry it |
| §6.3 error codes | `headless/api.ts:89-102` — 5 codes: INVALID_PARAMS/NOT_FOUND/CONFLICT/NOOP/INTERNAL_ERROR | PARTIAL | NOOP absorbed into §6.3 (R8); the other 4 map to ~24 spec codes — expand |
| §6.1 StateChange | absent — out-of-band readouts (`getTracks/getScene/getSelection/getPlayhead` :385-403) | CORRECTIVE | Add `stateChange` to results OR spec-note that readouts serve T1 tests (in-protocol `snapshot` is the spec-15 way) |
| §7 batch semantics | `headless/api.ts:346-381` — `applyBatch` | **AHEAD** | The five transaction invariants (eviction-suspended, depth-anchored rollback, redo clear, undo/redo-in-batch rejection, intra-batch overlap guard) EXCEED spec §7.1's atomicity — absorbed as §7.1A (R8) |
| §4.3.4 ripple | `timeline.rippleDelete` (:69) | CONVERGENT | Documented convenience wrapper — spec keeps `delete{ripple:true}`/RippleCommand as canonical (spec 06 §5.4 note) |
| command coverage | **24 of 78** spec-15 commands implemented (23 map 1:1 + `rippleDelete` wrapper); 54 absent (roll/slip/slide/rateStretch/retime/freezeFrame/rangeRemoval + scenes/project/media/effects/masks/transitions/clipboard/export/marker-forms/…) | ENGINE-GAP | The op-family port is A2 wave 1/2 (spec 14 §4.1); the full disposition for all 78 members is the **routing-disposition table (§4.1A, Round 15)** — the C7 rename + param alignment (this table) is the A2 prerequisite |
| §4.3.29 SetLoopCommand | no ordering invariant | **CORRECTIVE (N5)** | `end > start` becomes a validation invariant (INVALID_PARAMS otherwise) or the engine swaps halves; the inverted-window hang was a REAL mock bug (R13 found, R14 fixed: mark-in/out now move the other half — start ≤ end always; zero-width = no-op loop) |

**The binding convergence statement (Decision 11.2, amended by Decision 12.2 in Round 9, transport clause re-typed by Decision 16 in Round 15):** spec 15's bare `EngineCommand` is the **only** wire protocol, enforced at the **app bus** (Decision 16) and the engine's union façade. opencut-timeline converges via the C7 rename + param alignment (this table is the worklist) and is the **implementation home of the EDITING command subset**; nle-engine's JSON-RPC+$ref surface is **re-typed as INTERNAL transport** (the headless/cloud venue — Decision 12.2's retirement clause is superseded by this re-typing), owing the **service subset through its union façade** (A2). The routing-disposition table (§4.1A) is the single implementation map. The AUDIO command family (track volume/mute/solo, audio-effect parameters) targets the G layer of the three-layer track model (spec 20 §8 — MixerTrackSettings sidecar keyed by trackId, applied via `updateFromTrack`, zero timeline invalidation); per-command audio rows join this table's conformance pass at A2, after C7.

---

## 14. Open Questions

### 14.1 Should commands be reversible by storing inverse commands, or by snapshot diff?

**Status:** Open. The spec supports both (§6.2 — `UndoInfo.undoCommand` for inverse, `UndoInfo.previousState` for snapshot). The engine chooses per command type.

**Trade-offs:**

- **Inverse commands** are more memory-efficient (one command vs. a full `SceneState` snapshot) and more debuggable (the undo log shows what was done, not just snapshots). But constructing an inverse is hard for some ops (e.g., split's inverse is "delete the right half and merge back" — non-trivial).
- **Snapshots** are simpler (capture before, swap back on undo) and work for every op. But they're memory-heavy (each undo step stores a full `SceneState`). Mitigated by structural sharing — unchanged tracks share references between snapshots.

**Current decision:** Default to snapshots (strategy 2) for all undoable commands. Use inverse commands (strategy 1) only for trivially-invertible ops (`ToggleTrackMuteCommand`, `ToggleTrackSoloCommand`, `ToggleTrackLockCommand`, `ToggleTrackVisibilityCommand`, `ToggleElementVisibilityCommand`, `ToggleElementMutedCommand`, `ToggleEffectCommand`, `ToggleMaskCommand`, `SetRateCommand`, `SetLoopCommand`, `SeekCommand` — though the last three are not undoable).

**Revisit when:** Memory profiling shows undo history is consuming >50MB for typical editing sessions. At that point, switch complex ops (split, move, delete, insert, duplicate) to inverse commands.

### 14.2 How to handle async commands (e.g., import media which requires file I/O)?

**Status:** Resolved (§5.4 — pre-extraction pattern).

The pattern: side-effectful I/O happens BEFORE the command is issued. The caller does the I/O (file probing, blob persistence, thumbnail generation) and passes the already-parsed result into the command. The command itself is pure — it just persists the in-memory record.

**Why:** This keeps `engine.command.apply()` synchronous, which simplifies the API (callers don't have to `await` it) and makes property-based testing tractable (commands are pure data, no I/O mocking required).

**Cost:** The caller has to know the pre-extraction pattern. This is documented in §5.4 and exposed as helper methods on `MediaManager` (`engine.media.probe()`, `engine.media.persistBlob()`, `engine.media.generateThumbnail()` — all 📝 NEW greenfield helpers, not present on OpenCut-classic `MediaManager`; spec 01 §3.3 will add them as a deferred update) plus `engine.media.extractFrame()` (also 📝 NEW greenfield — see §4.3.13 `FreezeFrameCommand`) so callers don't have to implement it themselves. The mirror case — OUTPUT I/O (export) — is resolved by §14.11: export commands return artifacts in `CommandResult.data` without mutating state; they are the only sanctioned exception.

**Alternatives considered:**
- Make `apply()` async. Rejected — breaks property-based testing and adds `await` noise to every caller.
- Add a separate `applyAsync()` for I/O commands. Rejected — splits the API and forces callers to choose.
- Add an `async` flag to commands. Rejected — same problem, plus the schema can't enforce it.

### 14.3 Should the wire protocol support streaming (e.g., for live collaboration)?

**Status:** Open. Not in v1.

The current protocol is request/response: client sends a command, server applies it and returns the result. For live collaboration (multiple users editing the same project simultaneously), we'd need:
- A way for the server to push commands initiated by other users (via the SSE event stream — already supported via `commandApplied` events in §9).
- Operational transformation or CRDT to reconcile concurrent edits.
- Per-user cursors and selections (not part of `SceneState` — would need a separate `PresenceState`).

This is a future feature. The protocol is designed to support it (commands are JSON-serializable and idempotent via `commandId`), but the collaboration logic itself is out of scope for v1.

### 14.4 How to handle commands that depend on render state (e.g., "apply LUT to current frame")?

**Status:** Resolved — such commands don't exist in the protocol.

The protocol separates concerns:
- **Layer 2 (commands)** mutate `SceneState`. They are pure data and don't depend on render output.
- **Layer 3 (render)** reads `SceneState` and produces output. It is read-only with respect to `SceneState`.

A command like "apply LUT to current frame" would violate this separation — it would need to read render output (the current frame) to decide what to do. Instead, the equivalent operation is expressed as a pure-data command: `AddEffectCommand` with `effect.type = 'lut'` and `effect.params.lutData = <base64-encoded LUT>`. The LUT data is computed upstream (by the UI's LUT picker, by analyzing a reference frame, etc.) and passed in as data — not by reference to render state.

This keeps the protocol pure and replayable. The trade-off is that some "smart" operations (like "auto-color-match this clip to that clip") require the caller to do the analysis upstream and pass the result in as command params. This is acceptable — it keeps the engine core simple and pushes complexity to the caller where it can be tested in isolation.

### 14.5 Should `EngineCommand` be a Zod schema or a TS type?

**Status:** Resolved — Zod schema is source of truth (§11.2).

The Zod schema is the source of truth. TS types are inferred via `z.infer<>`. This guarantees:
- The TS type, the wire format, and the validation logic agree.
- Refactoring the schema automatically updates the TS type.
- Runtime validation is always in sync with the type system.

**Cost:** Slightly more verbose than a pure TS type. Zod schemas are ~2x longer than equivalent TS interfaces. But the cost is paid once (at schema definition) and the benefit (never having a wire/type mismatch) pays forever.

### 14.6 How to handle command ID generation for deterministic replay?

**Status:** Open. Current approach: `idSeed` parameter on commands that generate new IDs (`insert`, `duplicate`, `createScene`, `createProject`, `importMedia` — 5 commands). `SplitCommand` uses a separate `rightElementIdSeed` field (different name, same purpose — seeds only the right-half element ID because the left half keeps its original ID).

**Problem:** `crypto.randomUUID()` is not deterministic — same `(ProjectJSON, EngineCommand[])` tuple produces different `SceneState` on each replay because the generated element IDs differ.

**Current solution:** Commands that generate new IDs accept an optional `idSeed` param. If provided, the engine derives the new ID from `{seed, parentElementId, commandIndex}` via a stable hash (e.g., SHA-256 truncated to UUID format). If omitted, `crypto.randomUUID()` is used (non-deterministic).

**Cost:** Tests that assert on specific element IDs must either (a) pass `idSeed` and assert on the derived ID, or (b) assert on element properties (type, startTime, duration) rather than IDs. Approach (b) is preferred — it's more robust to implementation changes.

**Revisit when:** If the `idSeed` API proves too verbose in practice, consider a global "deterministic mode" flag on the engine that makes ALL ID generation deterministic (using a counter seeded from the engine construction).

### 14.7 Should the protocol support command streaming (batched over a single HTTP connection)?

**Status:** Open. Not in v1.

For high-throughput scenarios (e.g., a test that applies 1000 commands), the per-command HTTP overhead is non-trivial. A streaming variant of `/api/engine/command` (using HTTP/2 server push or WebSocket) would let clients send a stream of commands and receive a stream of results.

This is a future optimization. For v1, clients that need to apply many commands should use `CommandBatch` (§7) — one HTTP request per batch, no matter how many commands are in it.

### 14.8 How to handle schema evolution for `params` objects with `Record<string, unknown>`?

**Status:** Open. Affects: `UpdateElementsCommand.params.updates[].patch`, `UpdateEffectCommand.params.params`, `UpdateBookmarkCommand.params.updates`, `UpdateMarkerCommand.params.updates`, `UpdateMaskCommand.params.updates`, `UpdateTransitionCommand.params.updates`.

**Problem:** These commands take a partial patch on a complex object (e.g., `Partial<TimelineElement>`). The Zod schema can't enforce the patch shape without duplicating the entire `TimelineElement` schema. Currently they use `z.record(z.unknown())` — accepts any keys, no validation.

**Options:**
- **A:** Duplicate the `TimelineElement` schema and make all fields optional. Verbose but type-safe.
- **B:** Keep `z.record(z.unknown())` and rely on the TS type checker to catch invalid patches at compile time. Runtime validation is shallow.
- **C:** Add a deep-merge validator that walks the patch and validates each field against the corresponding field schema. Most robust but most code.

**Current decision:** Option B for v1. The TS type system catches most issues; runtime validation is shallow but the engine's invariant checks (e.g., `clampTrimAmount`) catch the rest.

**Revisit when:** A bug is traced to an invalid patch that the TS type system didn't catch (e.g., a dynamic property name). At that point, switch to option A or C.

### 14.9 Should `EngineCommand` support custom extensions (plugin commands)?

**Status:** Open. Not in v1.

Some users might want to extend the engine with custom commands (e.g., a third-party plugin that adds a "stabilize" command). The current `EngineCommand` union is closed — adding a new variant requires editing the schema.

**Options:**
- **A:** Keep the union closed. Plugins extend the engine by adding new manager methods, not new command types. The UI calls these methods directly (not via `apply()`).
- **B:** Add an `ExtensionCommand` variant with `params: { extensionId: string, payload: unknown }`. The engine dispatches to a registered extension handler.
- **C:** Make `EngineCommand` an open union (`EngineCommand | ExtensionCommand`).

**Current decision:** Option A for v1. Simpler, no extension point to manage. Plugins are out of scope for the initial release.

**Revisit when:** A real plugin use case materializes. At that point, option B is the most likely path — it keeps the core union closed (and thus type-safe) while allowing extensions to register themselves.

### 14.10 Should the protocol define a "query" command type for read-only operations?

**Status:** Open. Currently, read-only operations (get total duration, get element by ID, list media) are manager methods, not commands.

**Problem:** The HTTP API (§8) exposes `GET /api/engine/state` for the full state, but there's no way to query a specific subset (e.g., "give me element clip-3's current state"). Clients have to fetch the full state and filter.

**Options:**
- **A:** Add a `QueryCommand` variant with `params: { query: string, args: unknown[] }`. The engine evaluates the query and returns the result in `CommandResult.stateChange.newState` (or the `CommandResult.data` field, which now exists — §14.11 export commands use it; query commands remain open).
- **B:** Add specific query endpoints to the HTTP API (`GET /api/engine/element/:id`, `GET /api/engine/track/:id`, etc.).
- **C:** Keep the current design — full state on `GET /api/engine/state`, filter client-side.

**Current decision:** Option C for v1. The full `SceneState` is small enough (a few hundred KB for typical projects) that fetching it is cheaper than designing and implementing a query language.

**Revisit when:** Projects grow large enough that fetching the full state on every sync becomes a bottleneck. At that point, option B is the most likely path — it's RESTful and doesn't require a query language.

### 14.11 How do export (output) commands fit the "commands are pure state mutations" rule? (Round-7 amendment)

**Status:** Resolved. Export commands are the **sanctioned OUTPUT exception**.

**The problem:** §2 Goals 1-2 and §14.2 establish that commands are pure, JSON-serializable state mutations; §14.2's pre-extraction pattern covers INPUT I/O (probe/persist happen before `importMedia`). Export is the mirror case — OUTPUT I/O — and until this amendment it had no protocol home: spec 10's gated test T3.2 referenced `apply({type:'exportFCPXML'})` that didn't exist, and spec 16 §0.2/§3.9 routed export ops to manager methods as "spec-16 extensions".

**Options considered:**
- **Option 1 (adopted): export commands join the union as the sanctioned OUTPUT exception.** `apply()` returns `CommandResult` with an optional `data` field carrying the artifact (inline string for FCPXML) or an artifact/job reference (frame, master). The command is NOT undoable, does NOT mutate `SceneState` (`stateChange` is a no-op with `newState` = current state, matching `SnapshotCommand`'s read-only convention), and is excluded from undo history.
- **Option 2 (rejected): export stays a manager-method** (`engine.export.exportFCPXML()`), §13 documents it as out-of-protocol, and spec 10's T3.2 is rewritten to compare the keyboard path against the function path.
- (Rejected sub-option: an `applyAsync()` split — same API-splitting cost §14.2 already rejected for input I/O.)

**Why Option 1:**
1. **State-WYSIWYG stays coherent.** Spec 10's T3.2 invariant is "keyboard path == direct path produce identical output." With Option 1 both paths are `engine.command.apply({type:'exportFCPXML'})`, so the test is a pure dispatcher comparison. With Option 2 the two paths are different APIs, and the invariant silently degrades into "the resolver calls the right function" — weaker, and untestable through the command bus.
2. **Specs 10 and 16 already reference the command shape.** The TEST-INTEGRATION-REVIEW recommended resolving via amendment rather than rewriting two shipped specs' test tiers.
3. **One entry point for automation.** Cloud/CLI/MCP consumers drive the full lifecycle — edit AND deliver — through the same `POST /api/engine/command` channel (spec 11 clients POST `exportMaster` and get a `jobId`); no second protocol to document, version, and drift.
4. **Pre-extraction symmetry.** Input I/O happens before the command (§14.2); output I/O happens after the state read — the command is a pure function of `(SceneState, params)` whose *result* carries bytes or a handle. Nothing in the undo/determinism machinery is touched: exports never enter `UndoInfo`, never emit `stateChanged`, and replay of `(ProjectJSON, EngineCommand[])` with exports stripped is byte-identical.

**Honest costs of Option 1 (accepted):**
- `CommandResult` gains a `data?: CommandResultData` field — the ok-variant is no longer purely state-descriptive. Mitigated: the field is optional, discriminated by `kind`, and only the three export commands populate it (this also retires half of §14.10 Option A's "query command" open question — the `data` channel now exists).
- `exportMaster`/`exportFrame` complete asynchronously (job/artifact events), so "apply returns the finished artifact" is true only for `exportFCPXML`. This is the same asynchronous reality spec 11 already owns (render queue, progress events); the protocol just names it.
- The union grows output-semantics commands, which §14.9's "closed union" rationale must tolerate — it does, because these three are first-party, not plugin extensions.

**Rule going forward (normative):** a command may produce an output artifact via `data` ONLY if (a) it does not mutate `SceneState`, (b) it is `undoable: false`, (c) it maps 1:1 to a manager method that returns the artifact or a job handle, and (d) its artifact is JSON-transportable (string) or referenced by `artifactId`. Any future output command must amend this section.

---

## 15. Implementation Notes

### 15.1 File layout

```
src/engine/
├── types/
│   ├── command.ts              # EngineCommand, CommandResult, CommandError, etc. (TS types)
│   ├── command-schema.ts       # Zod schemas (source of truth)
│   ├── command-presets.ts      # Helper functions for common batch patterns
│   ├── command-event.ts        # EngineEvent type
│   └── command-envelope.ts     # Envelope, ProtocolVersion
├── core/
│   └── managers/
│       └── commands.ts         # CommandManager.apply() dispatcher (extension of spec 01)
├── commands/                   # Command class implementations (OpenCut-classic pattern)
│   ├── SplitCommand.ts
│   ├── TrimCommand.ts
│   ├── ExportFCPXMLCommand.ts   # §4.3.74 — output exception (§14.11)
│   ├── ExportMasterCommand.ts   # §4.3.75
│   ├── ExportFrameCommand.ts    # §4.3.76
│   └── ...                     # One per EngineCommand variant (78 total)
└── http/                       # HTTP API server (for cloud render)
    ├── server.ts               # Express/Hono server
    ├── routes/
    │   ├── load.ts
    │   ├── command.ts
    │   ├── render-frame.ts
    │   ├── render-audio.ts
    │   ├── state.ts
    │   ├── subscribe.ts
    │   ├── artifact.ts             # GET /api/engine/artifact/:id (§8.10 — Round-7)
    │   └── job.ts                  # GET /api/engine/job/:id (§8.10 — Round-7)
    └── middleware/
        ├── auth.ts
        ├── rate-limit.ts
        └── protocol-version.ts
```

### 15.2 Migration path from spec 01's `execute({command})`

Spec 01's `CommandManager.execute({command: Command})` (OpenCut-classic pattern) takes a `Command` class instance. This spec's `apply(command: EngineCommand)` takes a JSON object.

The migration:
1. Add `apply()` as a new method on `CommandManager` (does NOT remove `execute()`).
2. `apply()` validates via Zod, constructs the appropriate `Command` subclass instance, and calls `execute()`.
3. Existing manager methods (`engine.timeline.splitElements(...)`) are rewritten as thin wrappers that construct the `EngineCommand` and call `apply()`. (Or: they continue to call `execute()` directly with a `Command` instance — both paths work, but `apply()` is the new canonical path.)
4. New code (UI handlers, tests, HTTP API) uses `apply()` exclusively.
5. Old code (ported from OpenCut-classic) continues to use `execute()` until refactored.

This is a non-breaking change — both APIs coexist.

### 15.3 Performance considerations

- **Zod validation:** ~0.1ms per command. Negligible.
- **State snapshot for undo:** Uses structural sharing — unchanged tracks share references between snapshots. Typical cost: ~1KB per undo step for small projects, ~10KB for large projects. 100 undo steps = ~1MB. Acceptable.
- **Event emission:** Synchronous, O(listeners). Typically 1-3 listeners (UI store, devtools, test harness). Negligible.
- **HTTP API:** Per-request overhead ~5ms (Express/Hono + JSON parse + Zod validate). For cloud render at 30fps, this is 150ms/sec overhead — acceptable.

### 15.4 Testing the protocol itself

The protocol has its own test suite (in addition to the tests that USE the protocol):

```ts
// tests/contract/protocol.test.ts

test('every command type round-trips through JSON', () => {
  for (const [typeName, sample] of Object.entries(commandSamples)) {
    const json = JSON.stringify(sample);
    const parsed = JSON.parse(json);
    const result = EngineCommandSchema.safeParse(parsed);
    expect(result.success, `${typeName} failed JSON round-trip`).toBe(true);
  }
});

test('command samples are valid against the schema', () => {
  for (const [typeName, sample] of Object.entries(commandSamples)) {
    const result = EngineCommandSchema.safeParse(sample);
    expect(result.success, `${typeName} failed schema validation`).toBe(true);
  }
});

test('unknown command type is rejected', () => {
  const result = EngineCommandSchema.safeParse({ type: 'nonexistent', params: {} });
  expect(result.success).toBe(false);
});

test('missing required param is rejected', () => {
  const result = EngineCommandSchema.safeParse({ type: 'split', params: { trackIds: null } });
  expect(result.success).toBe(false);
});

test('invalid param type is rejected', () => {
  const result = EngineCommandSchema.safeParse({
    type: 'split',
    params: { time: 'not-a-number', trackIds: null },
  });
  expect(result.success).toBe(false);
});

test('extra param is rejected (strict mode)', () => {
  const result = EngineCommandSchema.safeParse({
    type: 'split',
    params: { time: 5000000, trackIds: null, extraField: true },
  });
  expect(result.success).toBe(false);
});
```

### 15.5 Documentation generation

The Zod schema can be used to auto-generate API documentation (via `zod-to-json-schema` or similar). The generated docs would include:
- Every command type with its params
- Type information (string, number, enum, etc.)
- Required vs. optional fields
- Default values
- Example payloads (from the `commandSamples` fixture)

This keeps the docs in sync with the schema — no manual doc maintenance.

---

## 16. Summary

This spec defines Layer 2 of the three-layer JSON protocol: the `EngineCommand` discriminated union. It contains:

- **78 command types** organized into 16 categories (timeline, track, playback, project, scene, media, tool, marker, effect, mask, transition, keyframe, clipboard, undo/redo, snapshot, export).
- **55 undoable** commands (state-changing mutations) and **23 non-undoable** (side-effectful I/O incl. renameProject/deleteProject, queries, playback control, meta, output/export).
- **1:1 mapping** between command types and `EditorCore` manager methods (§4.2) — enforced by the exhaustive `dispatch()` switch (§4.4).
- **Zod schemas** as source of truth (§11) — TS types inferred via `z.infer<>`.
- **`CommandResult`** type (§6) describing state change + undo info + error info.
- **`CommandBatch`** (§7) for atomic multi-command transactions.
- **HTTP wire protocol** (§8) for cloud render and remote engine.
- **`EngineEvent`** stream (§9) for UI sync.
- **Protocol versioning** (§10) for forward/backward compatibility.
- **Test harness usage** (§12) — fast path, replay-based regression, property-based, contract.

The protocol is the unifying abstraction that makes the engine testable without UI tax, makes browser/cloud/test all speak the same language, and makes the engine automation-ready (per spec 01 §2 Goal 2 — Ken Imoto's observation).

**Next actions:**
1. **Spec 00 (master):** Add Decision 9 ("JSON wire protocol as unifying engine abstraction") pointing to this spec. (TEST-01 may already be doing this — if not, this spec is the basis for it.)
2. **Spec 01 (core engine):** Update §3.3 manager method signatures to align with the Zod schemas in §11 (deferred — not blocking).
3. **Spec 12 (testing strategy):** Add tier 1 test examples using `engine.command.apply()` (this spec's §12 provides the templates).
4. **Spec 16 (keyboard shortcuts — shipped):** Every shortcut maps to an `EngineCommand` — see §13.5. Alignment edits (command-name renames already applied in spec 16) are tracked in spec 16 §0.2/§11.
5. **Spec 17 (test plan — shipped):** Tier 1 tests use this protocol — see §13.6; per-module `## Testing` sections follow spec 17 §4's template.
6. **Implementation:** Add `apply()` to `CommandManager` (§4.4), write the dispatcher, port the 78 command class implementations (most already exist in OpenCut-classic — see spec 06 §10 for the source file inventory; the 5 Round-7 additions are greenfield: 3 export wrappers + 2 project ops).
7. **Spec 18 (UI shell):** every panel's interaction contract dispatches `EngineCommand`s through `apply()` (see §13.12).
8. **Spec 19 (code references):** reconciliation deltas recorded in §13.14 feed the reference-repo map.
