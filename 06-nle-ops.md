# 06 — NLE Operations: Cut / Split / Trim / Ripple / Roll / Slip / Slide / Move / Lock / Snap (REFINED)

**Stream:** NLE operation logic (pure functions over timeline state)
**Status:** Refined (SCOUT-06). Every claim tagged with file:line evidence. Round-8 amendments: §5.2A trim-shape layer mapping + NOOP code, §5.4 ripple modeling notes + OT as executable reference, §5.9 intra-batch overlap guard, §10.4 engine re-baseline @ 8ac91d9 (all citations re-verified, P0.6 fixed), §10.5 opencut-timeline op-coverage (Decision 11.3 division of labor).
**Primary teacher:** FreeCut `stores/actions/edit/*` (algorithm-level reference) + OpenCut-classic `ripple/` + `retime/` + `commands/` + `timeline/placement/` + `timeline/group-move/` + `timeline/group-resize/` (architecture-level reference)
**Spec file:** `06-nle-ops.md` (supersedes `06-nle-ops.md`)

---

## 0. What Changed vs. Seed Spec (TL;DR)

| Area | Seed spec assumed | Actual code (REFINED) | Source |
|---|---|---|---|
| Command interface | `Command { id, label, execute(state): SceneState, undo(state): SceneState, coalesceKey? }` | `abstract Command { execute(): CommandResult\|undefined; undo(): void; redo(): CommandResult\|undefined }` — no `id`, no `label`, no `coalesceKey`, no state arg | `apps/web/src/commands/base-command.ts:21-31` (SCOUT-01 finding) |
| Transaction grouping | `CommandManager.beginTransaction(label)` / `endTransaction()` | `BatchCommand(commands)` — wrap array, undo in reverse, redo forward | `apps/web/src/commands/batch-command.ts:3-39` |
| Coalescing | `coalesceKey: string` on Command | Manager-layer `previewElements({updates})` → `commitPreview()` → `command.push({command: new TracksSnapshotCommand({before, after})})` | `apps/web/src/core/managers/timeline-manager.ts:706-760`; `apps/web/src/commands/timeline/tracks-snapshot.ts:5-29` |
| Ripple | Separate `Ripple` op + `RippleCommand` | `CommandManager.isRippleEnabled: boolean` flag. When `true`, `execute()` captures `beforeTracks`, runs command, then `applyRippleIfEnabled({beforeTracks})` runs `computeRippleAdjustments` + `applyRippleAdjustments` | `apps/web/src/core/managers/commands.ts:14, 21-37, 127-153` |
| Command paths | `src/lib/ripple/{shift,apply,diff}.ts` (path claimed by seed) | Real path: `apps/web/src/ripple/{shift,apply,diff,index}.ts` — NOT `lib/ripple/` | `LS /tmp/opencut-classic/apps/web/src/ripple/` |
| Roll/slip/slide file paths | `src/features/timeline/preview/components/{rolling,slip,slide}-edit-overlay.tsx` | Real path: `src/features/preview/components/{rolling,slip,slide}-edit-overlay.tsx` — `features/preview`, NOT `features/timeline/preview` | `LS /tmp/freecut/src/features/preview/components/` |
| `rolling-edit-utils.ts` | "Sub-agent to read" | **Actual name:** `rolling-edit-overlay-utils.ts` (in `features/preview/components/`); there is no `rolling-edit-utils.ts` | `/tmp/freecut/src/features/preview/components/rolling-edit-overlay-utils.ts` |
| Split-bookkeeping location | `src/features/timeline/utils/split-bookkeeping.ts` | Real path: `src/features/timeline/stores/actions/split-bookkeeping.ts` (in `stores/actions/`, NOT `utils/`) | `/tmp/freecut/src/features/timeline/stores/actions/split-bookkeeping.ts` |
| Split algorithm location | "FreeCut `split-actions.ts`" contains the algorithm | `split-actions.ts` is the *action wrapper* (linked-edit expansion, transition-overlap guard, multi-split orchestration). The actual split algorithm is `itemsStore._splitItem(id, splitFrame)` in `stores/items-store.ts:485-629` | `/tmp/freecut/src/features/timeline/stores/items-store.ts:485-629` |
| Retime presets | `presets.ts` exposes preset rates | `presets.ts` is 12 LOC; exposes only `buildConstantRetime({rate, maintainPitch}): RetimeConfig` | `apps/web/src/retime/presets.ts:1-12` |
| Roll/slip/slide in OpenCut-classic | Seed spec assumed not implemented | Confirmed: OpenCut-classic has NO roll/slip/slide ops — only retime (rate-stretch) via `retime/` + `group-resize/compute-resize.ts`. **Must port all three from FreeCut.** | (no matching files in `/tmp/opencut-classic/apps/web/src/{retime,timeline,commands}/`) |

---

## 1. Purpose

Define the operations that modify the timeline: how each one transforms state, how they're composed into commands, and how they integrate with undo/redo. The seed spec's goal — "pure functions `op(state, params) → newState`" — is **the architecture we adopt for our op library**, but neither reference repo implements it that way:

- **FreeCut** uses a Zustand store mutation model: actions call imperative mutators (`_splitItem`, `_trimItemEnd`, `_moveItem`) and the undo system snapshots state before/after via `execute(command, action)` (`stores/timeline-command-store.ts:127-151`).
- **OpenCut-classic** uses a class-based `Command` model: each `Command.execute()` calls `EditorCore.getInstance()` to read state, mutates `SceneTracks`, and pushes to `editor.timeline.updateTracks()` (`commands/timeline/element/split-elements.ts:45-206`).

For our system we adopt the **pure-function op layer** (cleaner testability) backed by a **`BatchCommand` + `TracksSnapshotCommand` history layer** (matches SCOUT-01 finding).

---

## 2. Goals

1. **All ops are pure functions** at the algorithm layer: `op(state, params) → newState`. No mutation, no I/O, no `EditorCore.getInstance()`.
2. **All ops are commands** at the engine layer: wrapped in `TracksSnapshotCommand` (single-op) or `BatchCommand` (multi-op). Per SCOUT-01 finding (`01-core-engine.md:1368-1467`), there is **no `id`/`label`/`coalesceKey`** on the Command type.
3. **All ops preserve invariants.** No overlaps (unless intentional), no gaps (unless ripple off), no negative durations, no out-of-range seeks, no mutation of locked tracks.
4. **All ops compose.** Multi-select applies the op to all selected elements (OpenCut `compute-resize.ts:26-114` and `group-move/resolve-move.ts:34-61` show the pattern).
5. **All ops are testable in isolation.** Property-based tests verify invariants hold.

---

## 3. Operation Inventory

| Op | Description | FreeCut reference | OpenCut-classic reference |
|---|---|---|---|
| **Split** | Cut clip(s) at a time | `stores/actions/edit/split-actions.ts:13-245` + `stores/items-store.ts:485-629` (`_splitItem`) | `commands/timeline/element/split-elements.ts:19-214` |
| **Trim** | Change clip start/end | `stores/actions/edit/trim-actions.ts:33-279` (`trimItemStart`, `trimItemEnd`); `utils/trim-utils.ts:55-118` (`clampTrimAmount`); `utils/trim-edit-constraints.ts:126-213` | `timeline/group-resize/compute-resize.ts:26-114`; `commands/timeline/element/update-elements.ts:10-75` |
| **Move** | Reposition clip in time/track | `stores/actions/item-actions.ts` (ripple-style shifts); `hooks/use-timeline-drag.ts` | `commands/timeline/element/move-elements.ts:18-131`; `timeline/group-move/{build-group,resolve-move,snap,track-placement}.ts` |
| **Ripple** | Shift subsequent clips to close/open gap | `stores/actions/sync-lock-ripple.ts:389-469` (`propagateRemovedIntervalsToSyncLockedTracks`, `propagateInsertedGapToSyncLockedTracks`) | `ripple/{diff,apply,shift}.ts` — **WE ADOPT THIS** |
| **Roll** | Trim adjacent clips together | `stores/actions/edit/trim-actions.ts:471-565` (`rollingTrimItems`); `stores/rolling-edit-preview-store.ts:1-48`; `features/preview/components/rolling-edit-overlay.tsx:1-58` | ❌ NOT IMPLEMENTED — port from FreeCut |
| **Slip** | Shift source in/out within fixed timeline position | `stores/actions/edit/trim-actions.ts:576-639` (`slipItem`); `stores/slip-edit-preview-store.ts:1-33`; `features/preview/components/slip-edit-overlay.tsx:1-87`; `utils/slip-utils.ts:1-33` (`computeClampedSlipDelta`) | ❌ NOT IMPLEMENTED — port from FreeCut |
| **Slide** | Move clip + shift neighbors | `stores/actions/edit/trim-actions.ts:651-878` (`slideItem`); `stores/slide-edit-preview-store.ts:1-57`; `features/preview/components/slide-edit-overlay.tsx:1-128`; `utils/slide-utils.ts:1-42` (`computeSlideContinuitySourceDelta`) | ❌ NOT IMPLEMENTED — port from FreeCut |
| **Delete** | Remove clip(s) | `stores/items-store.ts` (`_removeItems`); `stores/actions/range-removal-actions.ts:60-176` (`applyRippleRemoval`) | `commands/timeline/element/delete-elements.ts:24-72` |
| **Insert** | Add new clip from media library | (combination via `_addItem` in `items-store.ts`) | `commands/timeline/element/insert-element.ts:32-297`; `timeline/placement/{resolve,overlap,compatibility,apply,insert-index,main-track,track-factory,types}.ts` |
| **Duplicate** | Copy clip | (combination) | `commands/timeline/element/duplicate-elements.ts:17-114` |
| **Rate Stretch** | Change clip speed by stretching duration | `stores/actions/edit/rate-stretch-actions.ts:11-229`; `hooks/use-rate-stretch.ts:262-772` | `retime/{rate,resolve,split,audio-stretch,presets}.ts`; `timeline/group-resize/compute-resize.ts:242-264` (`getSourceDeltaForClipDelta`) |
| **Retime** | Change clip speed with pitch preservation | (FreeCut has speed but no pitch preservation hook) | `retime/audio-stretch.ts:1-182` (SoundTouch via `PitchShifter`) |
| **Freeze Frame** | Insert still frame at position | `stores/actions/edit/freeze-frame-actions.ts:22-253` | ❌ NOT IMPLEMENTED — port from FreeCut |
| **Range Removal** | Remove time range across tracks | `stores/actions/edit/range-removal-actions.ts:60-354` | ❌ NOT IMPLEMENTED — port from FreeCut |
| **Mute / Solo** | Track-level audio state | `tracks[].muted` (FreeCut has solo too — type TimelineTrack in `types/timeline.ts`) | `commands/timeline/track/toggle-track-mute.ts:6-41` |
| **Lock** | Track-level lock state | `utils/track-sync-lock.ts:5-17` (`isTrackSyncLockEnabled`) | ❌ NOT IMPLEMENTED — port from FreeCut |
| **Toggle Visibility** | Track-level visibility | `tracks[].locked`, `tracks[].hidden` | `commands/timeline/track/toggle-track-visibility.ts:6-45` |
| **Snap** | During drag/trim/razor, snap to points | `utils/timeline-snap-utils.ts:1-184`; `utils/razor-snap.ts:1-90` | `timeline/snapping/{build,resolve,threshold,types,index}.ts`; `timeline/group-move/snap.ts:1-100` |

**Note:** OpenCut-classic doesn't implement roll/slip/slide/track-lock/freeze-frame/range-removal. We **must** port these from FreeCut (the user noted FreeCut is more feature-complete for ops).

> The op inventory above is reconciled method-by-method against nle-engine's `Timeline` class (102 public methods; ~20 of the op families already implemented) — see §10.4 and spec 19's op-coverage table.

---

## 4. State Model (MAJOR UPDATE per SCOUT-01 finding)

### 4.1 What the seed spec got wrong

The seed spec §4 sketched:

```ts
// SEED SPEC (WRONG):
interface Command {
  id: CommandId;
  label: string;
  execute(state: SceneState): SceneState;
  undo(state: SceneState): SceneState;
  coalesceKey?: string;
}
```

**Reality (per SCOUT-01, `01-core-engine.md:1368-1467`):** OpenCut-classic's `Command` is a class with **no `id`, no `label`, no `coalesceKey`, no state arg**. `execute()` is parameterless and pulls state by calling `EditorCore.getInstance()` inside the body.

### 4.2 Actual Command base class (`apps/web/src/commands/base-command.ts:21-31`)

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

**Critical departures from the seed spec's `Command` interface:**

1. **No `id` field** — no `CommandId` type exists. `CommandManager.history` stores `{command, previousSelection, selectionOverride}` (`commands.ts:7-11`).
2. **No `label` field** — labels are computed externally (FreeCut's `TimelineCommand {type, payload}` drives label generation via `commands/labels.ts`).
3. **`execute()` takes NO arguments** — commands fetch state via `EditorCore.getInstance()`.
4. **State is NOT immutable** — commands capture `savedState: SceneTracks | null` on first execute, then call `editor.timeline.updateTracks(newTracks)` which mutates the active scene in place. `undo()` swaps back (`split-elements.ts:208-213`).
5. **`redo()` default is `execute()`** — re-running execute() is idempotent only because `savedState` will be the post-undo state. `BatchCommand` overrides `redo()` to be safer.
6. **No `coalesceKey`** — coalescing is done at the manager layer via `previewElements({updates})` → `commitPreview()` pattern (see §4.4).

### 4.3 `BatchCommand` for transaction grouping (`apps/web/src/commands/batch-command.ts:1-39`)

```ts
import { Command, type CommandResult } from "./base-command";

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

**This is the actual transaction-grouping pattern** — NOT `beginTransaction(label)` / `endTransaction()` as the seed spec claimed. `TimelineManager.upsertKeyframes` (`timeline-manager.ts:481-521`), `removeKeyframes` (`timeline-manager.ts:523-590`), and `MediaManager.removeMediaAssets` (`media-manager.ts:57-85`) use `BatchCommand` directly for atomicity.

### 4.4 `TracksSnapshotCommand` for coalescing (`apps/web/src/commands/timeline/tracks-snapshot.ts:1-29`)

```ts
import { Command, type CommandResult } from "@/commands/base-command";
import type { SceneTracks } from "@/timeline";
import { EditorCore } from "@/core";

export class TracksSnapshotCommand extends Command {
        constructor({
                before,
                after,
        }: {
                before: SceneTracks;
                after: SceneTracks;
        }) {
                super();
                this.before = before;
                this.after = after;
        }

        private before: SceneTracks;
        private after: SceneTracks;

        execute(): CommandResult | undefined {
                EditorCore.getInstance().timeline.updateTracks(this.after);
                return undefined;
        }

        undo(): void {
                EditorCore.getInstance().timeline.updateTracks(this.before);
        }
}
```

**This is the actual coalescing mechanism.** During a drag, no commands are pushed. Instead, `TimelineManager.previewElements({updates})` overlays uncommitted patches on top of `committedTracks` (`timeline-manager.ts:706-742`). At drag end, `commitPreview()` rolls them into a single `TracksSnapshotCommand` via `command.push({command})` — a manager method that bypasses `execute()` (`commands.ts:39-45`):

```ts
// timeline-manager.ts:744-760 — commitPreview
commitPreview(): void {
        if (this.previewOverlay.size === 0) return;
        const committedTracks = this.editor.scenes.getActiveSceneOrNull()?.tracks;
        if (!committedTracks) {
                return;
        }
        const afterTracks =
                this.previewTracks ?? this.applyPreviewOverlay(committedTracks);
        const command = new TracksSnapshotCommand({
                before: committedTracks,
                after: afterTracks,
        });
        this.editor.command.push({ command });
        this.previewOverlay.clear();
        this.previewTracks = null;
        this.updateTracks(afterTracks);
}
```

### 4.5 CommandManager (`apps/web/src/core/managers/commands.ts:13-154`)

```ts
// commands.ts:7-11
interface CommandHistoryEntry {
        command: Command;
        previousSelection: EditorSelectionSnapshot;
        selectionOverride?: EditorSelectionSnapshot;
}

// commands.ts:13-45
export class CommandManager {
        public isRippleEnabled = false;                              // line 14
        private history: CommandHistoryEntry[] = [];                 // line 15
        private redoStack: CommandHistoryEntry[] = [];               // line 16
        private reactors: Array<() => void> = [];                     // line 17

        constructor(private editor: EditorCore) {}

        // commands.ts:21-37 — execute() with ripple hook
        execute({ command }: { command: Command }): Command {
                const beforeTracks = this.isRippleEnabled
                        ? (this.editor.scenes.getActiveSceneOrNull()?.tracks ?? null)
                        : null;
                const previousSelection = this.getSelectionSnapshot();
                const result = command.execute();
                this.applyRippleIfEnabled({ beforeTracks });
                const selectionOverride = this.applySelectionOverride(result);
                this.runReactors();
                this.history.push({ command, previousSelection, selectionOverride });
                this.redoStack = [];
                return command;
        }

        // commands.ts:39-45 — push() bypasses execute(); used by commitPreview()
        push({ command }: { command: Command }): void {
                this.history.push({
                        command,
                        previousSelection: this.getSelectionSnapshot(),
                });
                this.redoStack = [];
        }

        // ... undo() / redo() / canUndo() / canRedo() / clear() ...
        // commands.ts:127-153 — applyRippleIfEnabled uses @/ripple
        private applyRippleIfEnabled({ beforeTracks }: { beforeTracks: SceneTracks | null }): void {
                if (!this.isRippleEnabled || !beforeTracks) return;
                const afterTracks = this.editor.scenes.getActiveSceneOrNull()?.tracks;
                if (!afterTracks) return;
                const adjustments = computeRippleAdjustments({ beforeTracks, afterTracks });
                if (adjustments.length === 0) return;
                const tracksWithRipple = applyRippleAdjustments({ tracks: afterTracks, adjustments });
                this.editor.timeline.updateTracks(tracksWithRipple);
        }
}
```

### 4.6 OUR design (refined)

For our pure-function op layer, we adopt:

```ts
// All ops are pure functions
interface OpParams { /* op-specific */ }
interface OpResult { tracks: SceneTracks; selection?: ElementRef[] }
type Op<P extends OpParams> = (state: SceneState, params: P) => OpResult;

// Command layer wraps an op in a TracksSnapshotCommand
class OpCommand extends Command {
        constructor(private op: Op<OpParams>, private params: OpParams) { super(); }
        private savedState: SceneTracks | null = null;

        execute(): CommandResult | undefined {
                const editor = EditorCore.getInstance();
                this.savedState = editor.scenes.getActiveScene().tracks;
                const result = this.op(editor.scenes.getActiveScene(), this.params);
                editor.timeline.updateTracks(result.tracks);
                return result.selection ? createElementSelectionResult(result.selection) : undefined;
        }

        undo(): void {
                if (this.savedState) {
                        EditorCore.getInstance().timeline.updateTracks(this.savedState);
                }
        }
        // redo() inherits default = execute()
}
```

For drag-coalesced ops (move/trim/rate-stretch/slip/slide/roll), use the `previewElements({updates})` → `commitPreview()` pattern at the manager layer — **no per-frame command pushes**.

For multi-step atomic ops (paste = N inserts, ripple-delete = delete + shift), wrap N `OpCommand`s in a `BatchCommand`.

### 4.7 `SceneState` and `SceneTracks` shape

Adopted verbatim from OpenCut-classic (per SCOUT-09 refined spec `09-project-model.md:830-883`):

```ts
// From apps/web/src/timeline/types.ts:19-80 (quoted in 09-project-model.md:830-880)
export interface SceneTracks {
        overlay: OverlayTrack[];   // text | graphic | effect | (sub-)video tracks above main
        main: VideoTrack;          // single main video track (NOT an array)
        audio: AudioTrack[];
}

export interface TimelineElement {
        id: string;
        type: ElementType;          // 'video' | 'audio' | 'image' | 'text' | 'shape' | 'adjustment'
        startTime: MediaTime;
        duration: MediaTime;
        trimStart: MediaTime;       // source offset (analogous to FreeCut's sourceStart)
        trimEnd: MediaTime;         // remaining source after element end (NOT sourceEnd)
        retime?: RetimeConfig;      // { rate: number; maintainPitch?: boolean }
        // ... effects, masks, transitions, mediaId, name, etc.
}
```

**Note**: OpenCut-classic uses `trimStart + trimEnd` (NOT `sourceStart + sourceEnd` like FreeCut). The invariant `trimStart + duration*rate + trimEnd == sourceDuration` is preserved by **snap-once rounding** — see `group-resize/compute-resize.ts:81-103` and `split-elements.ts:94-114`.

---

## 5. Operations — Detailed Specs

### 5.1 Split

**Description:** Cut one or more clips into two pieces at a given time.

**FreeCut reference (algorithm):** `stores/items-store.ts:485-629` (`_splitItem`). The action wrapper `stores/actions/edit/split-actions.ts:13-65` (`splitItem`) handles linked-edit expansion, transition-overlap guard, and bookkeeping.

**FreeCut split algorithm (`items-store.ts:485-629`, quoted exactly):**

```ts
_splitItem: (id, splitFrame) => {
  const state = get()
  const item = state.items.find((i) => i.id === id)
  if (!item) return null
  const splitAt = roundFrame(splitFrame)

  const itemStart = roundFrame(item.from)
  const itemDuration = roundDuration(item.durationInFrames)
  const itemEnd = itemStart + itemDuration

  // Validate split point is within item
  if (splitAt <= itemStart || splitAt >= itemEnd) return null

  const leftDuration = splitAt - itemStart
  const rightDuration = itemEnd - splitAt
  const splitOriginId = item.originId ?? item.id

  // Create left item (keeps original ID for minimal disruption)
  const leftItem = {
    ...item,
    from: itemStart,
    originId: splitOriginId,
    durationInFrames: leftDuration,
  } as TimelineItem

  // Create right item with new ID
  const rightItem = {
    ...item,
    id: crypto.randomUUID(),
    originId: splitOriginId,
    from: splitAt,
    durationInFrames: rightDuration,
  } as TimelineItem

  // ... subtitle cues partitioning (525-556) ...
  // ... media sourceStart/sourceEnd for speed (559-619) ...
  // ... reversed-playback handling (572-601) ...

  set((state) => {
    const nextItems = state.items
      .map((i) => (i.id === id ? normalizeFrameFields(leftItem) : i))
      .concat(normalizeFrameFields(rightItem))
    return withItemIndexes(nextItems, state)
  })

  return { leftItem: normalizeFrameFields(leftItem), rightItem: normalizeFrameFields(rightItem) }
}
```

**FreeCut split bookkeeping (`stores/actions/split-bookkeeping.ts:14-60`):**

```ts
function remapTransitionsAfterSplit(splitResults: SplitResultEntry[]): void {
  if (splitResults.length === 0) return
  const splitRightByOriginalId = new Map(
    splitResults.map((entry) => [entry.originalId, entry.result.rightItem.id]),
  )
  const updatedTransitions = useTransitionsStore.getState().transitions.map((transition) => {
    const leftReplacementId = splitRightByOriginalId.get(transition.leftClipId)
    if (leftReplacementId) return { ...transition, leftClipId: leftReplacementId }
    if (splitRightByOriginalId.has(transition.rightClipId)) return transition
    return transition
  })
  useTransitionsStore.getState().setTransitions(updatedTransitions)
}

function relinkSplitSegments(splitResults: SplitResultEntry[]): void {
  const linkedSplitResults = splitResults.filter((entry) => !!entry.originalLinkedGroupId)
  if (linkedSplitResults.length === 0) return
  const itemsStore = useItemsStore.getState()
  const leftLinkedGroupId = linkedSplitResults.length > 1 ? crypto.randomUUID() : undefined
  const rightLinkedGroupId = linkedSplitResults.length > 1 ? crypto.randomUUID() : undefined
  for (const entry of linkedSplitResults) {
    itemsStore._updateItem(entry.result.leftItem.id, { linkedGroupId: leftLinkedGroupId })
    itemsStore._updateItem(entry.result.rightItem.id, { linkedGroupId: rightLinkedGroupId })
  }
}
```

**OpenCut-classic split (`commands/timeline/element/split-elements.ts:19-214`):**

```ts
export class SplitElementsCommand extends Command {
        private savedState: SceneTracks | null = null;
        private rightSideElements: { trackId: string; elementId: string }[] = [];
        private readonly elements: { trackId: string; elementId: string }[];
        private readonly splitTime: MediaTime;
        private readonly retainSide: "both" | "left" | "right";

        constructor({ elements, splitTime, retainSide = "both" }: {
                elements: { trackId: string; elementId: string }[];
                splitTime: MediaTime;
                retainSide?: "both" | "left" | "right";
        }) {
                super();
                this.elements = elements;
                this.splitTime = splitTime;
                this.retainSide = retainSide;
        }

        execute(): CommandResult | undefined {
                const editor = EditorCore.getInstance();
                this.savedState = editor.scenes.getActiveScene().tracks;
                this.rightSideElements = [];

                const splitTrack = <TTrack extends { id: string; elements: TimelineElement[] }>(
                        track: TTrack,
                ): TTrack => {
                        const elementsToSplit = this.elements.filter(
                                (target) => target.trackId === track.id,
                        );
                        if (elementsToSplit.length === 0) return track;

                        const elements = track.elements.flatMap((element) => {
                                const shouldSplit = elementsToSplit.some(
                                        (target) => target.elementId === element.id,
                                );
                                if (!shouldSplit) return [element];

                                const effectiveStart = element.startTime;
                                const effectiveEnd = element.startTime + element.duration;

                                // Skip if splitTime is at/beyond element bounds
                                if (this.splitTime <= effectiveStart || this.splitTime >= effectiveEnd) {
                                        return [element];
                                }

                                const relativeTime = subMediaTime({ a: this.splitTime, b: element.startTime });
                                const leftVisibleDuration = relativeTime;
                                const rightVisibleDuration = subMediaTime({ a: element.duration, b: relativeTime });
                                const retimeRef = isRetimableElement(element) ? element.retime : undefined;

                                // Snap-once: derive rightSourceSpan = totalSourceSpan - leftSourceSpan
                                // to keep invariant leftSourceSpan + rightSourceSpan == totalSourceSpan.
                                const leftSourceSpan = roundMediaTime({
                                        time: getSourceSpanAtClipTime({
                                                clipTime: leftVisibleDuration,
                                                retime: retimeRef,
                                        }),
                                });
                                const totalSourceSpan = roundMediaTime({
                                        time: getSourceSpanAtClipTime({
                                                clipTime: element.duration,
                                                retime: retimeRef,
                                        }),
                                });
                                const rightSourceSpan = subMediaTime({ a: totalSourceSpan, b: leftSourceSpan });
                                const { leftAnimations, rightAnimations } = splitAnimationsAtTime({
                                        animations: element.animations,
                                        splitTime: relativeTime,
                                        shouldIncludeSplitBoundary: true,
                                });

                                const leftTrimEnd = addMediaTime({ a: element.trimEnd, b: rightSourceSpan });
                                const rightTrimStart = addMediaTime({ a: element.trimStart, b: leftSourceSpan });

                                // ... retainSide branching (131-186): "left" keeps left only,
                                //     "right" generates newId for right, "both" splits and pushes new id
                        });

                        return { ...track, elements } as TTrack;
                };

                const updatedTracks: SceneTracks = {
                        overlay: this.savedState.overlay.map((track) => splitTrack(track)),
                        main: splitTrack(this.savedState.main),
                        audio: this.savedState.audio.map((track) => splitTrack(track)),
                };
                editor.timeline.updateTracks(updatedTracks);

                if (this.rightSideElements.length > 0) {
                        return createElementSelectionResult(this.rightSideElements);
                }
                return undefined;
        }

        undo(): void {
                if (this.savedState) {
                        EditorCore.getInstance().timeline.updateTracks(this.savedState);
                }
        }
}
```

**Edge cases handled:**
- Time exactly at element boundary: no split (`split-elements.ts:75-80`; `_splitItem:496`)
- Time before element start or after end: skip this element (same guard)
- Multiple elements on the same track at the same time (overlays): split all (`split-actions.ts:71-145` — `splitAllItemsAtFrame`)
- Reversed playback: source range is inverted (`items-store.ts:572-601`)
- Subtitle cue partitioning at split point (`items-store.ts:525-556`)
- Linked items split together with new `linkedGroupId` for left/right halves (`split-bookkeeping.ts:37-51`)
- Transitions pointing to original item get remapped to the right half (`split-bookkeeping.ts:14-35`)
- Split inside a transition zone is blocked (`split-actions.ts:27-31` — `isInTransitionOverlap` check, toast "Cannot split inside a transition zone")

**Multi-select behavior:**
- `splitAllItemsAtFrame(splitFrame)` splits all items crossing the frame across all tracks in one undo step (`split-actions.ts:71-145`). Each linked-group is split via `getUniqueLinkedItemAnchorIds`, so a clip + its linked audio companion split together.
- `splitItemAtFrames(id, splitFrames)` splits one item at multiple frames in one undo step (`split-actions.ts:153-245`). Splits from last to first so the original ID stays valid. Clears fadeIn/fadeOut on inner cuts so only outermost edges keep fades.

**Constraints (reject if):**
- Split time outside `[itemStart, itemEnd)` (silent no-op, `_splitItem:496`)
- Split inside a transition overlap zone (toast + return null, `split-actions.ts:27-31`)

**Command:**
- FreeCut: wraps the action in `execute('SPLIT_ITEM', () => { ... }, { id, splitFrame })` which snapshots before/after via `useTimelineCommandStore.getState().execute()` (`timeline-command-store.ts:127-151`).
- OpenCut-classic: `SplitElementsCommand extends Command` — single command, capture `savedState` on first execute, swap back in `undo()`.

### 5.2 Trim

**Description:** Change an element's start or end position. Two variants:
- **Left trim:** Change `startTime` and `trimStart` (and `duration` decreases)
- **Right trim:** Change `duration` (and `trimEnd` decreases)

**FreeCut references:**
- Action layer: `stores/actions/edit/trim-actions.ts:33-279` (`trimItemStart`, `trimItemEnd`, `applySynchronizedTrim`)
- Clamping utils: `utils/trim-utils.ts:55-118` (`clampTrimAmount`), `129-178` (`clampToAdjacentItems`), `183-202` (`clampToMinDuration`)
- Constraint preservation: `utils/trim-edit-constraints.ts:126-213` (`clampRollingTrimDeltaToPreserveEditState`, `clampRippleTrimDeltaToPreserveEditState`)
- UI handles: `components/timeline-item/trim-handles.tsx:1-267`

**FreeCut trim clamp algorithm (`trim-utils.ts:55-118`):**

```ts
export function clampTrimAmount(
  item: TimelineItem,
  handle: TrimHandle,
  trimAmount: number,
  timelineFps: number = 30,
): TrimClampResult {
  let clampedAmount = trimAmount
  let maxExtend: number | null = null

  if (isMediaItem(item)) {
    const { sourceStart, sourceEnd, sourceFps, speed } = getSourceProperties(item)
    const sourceDuration = getEffectiveSourceDuration(item)
    const effectiveSourceFps = sourceFps ?? timelineFps

    if (handle === 'start') {
      // Start handle: negative trimAmount = extending left
      if (trimAmount < 0) {
        maxExtend = item.isReversed === true && sourceDuration !== undefined
          ? getMaxStartExtension(sourceDuration - (sourceEnd ?? sourceDuration), speed, effectiveSourceFps, timelineFps)
          : getMaxStartExtension(sourceStart, speed, effectiveSourceFps, timelineFps)
        if (-trimAmount > maxExtend) clampedAmount = -maxExtend
      }
    } else {
      // End handle: positive trimAmount = extending right
      if (item.isReversed === true) {
        const maxDuration = item.durationInFrames +
          getMaxStartExtension(sourceStart, speed, effectiveSourceFps, timelineFps)
        maxExtend = maxDuration - item.durationInFrames
        if (item.durationInFrames + trimAmount > maxDuration) clampedAmount = maxDuration - item.durationInFrames
      } else if (sourceDuration !== undefined) {
        const maxDuration = calcMaxDuration(sourceDuration, sourceStart, speed, effectiveSourceFps, timelineFps)
        maxExtend = maxDuration - item.durationInFrames
        if (item.durationInFrames + trimAmount > maxDuration) clampedAmount = maxDuration - item.durationInFrames
      }
    }
  }

  // Clamp to minimum duration of 1 frame (applies to all items)
  clampedAmount = clampToMinDuration(item.durationInFrames, handle, clampedAmount)
  return { clampedAmount, maxExtend }
}
```

**FreeCut adjacent-clamp (`trim-utils.ts:129-178`):**

```ts
export function clampToAdjacentItems(
  item: TimelineItem,
  handle: TrimHandle,
  trimAmount: number,
  allItems: TimelineItem[],
  transitionLinkedIds?: Set<string>,
): number {
  const itemEnd = item.from + item.durationInFrames

  if (handle === 'end' && trimAmount > 0) {
    // Extending right — find nearest item that starts at or after our current end
    let nearestStart = Infinity
    for (const other of allItems) {
      if (other.id === item.id) continue
      if (other.trackId !== item.trackId) continue
      if (transitionLinkedIds?.has(other.id)) continue   // transition clips allowed to overlap
      if (other.from >= itemEnd) nearestStart = Math.min(nearestStart, other.from)
    }
    if (nearestStart !== Infinity) {
      const maxExtend = nearestStart - itemEnd
      if (trimAmount > maxExtend) return maxExtend
    }
  } else if (handle === 'start' && trimAmount < 0) {
    // Extending left — find nearest item that ends at or before our current start
    let nearestEnd = -Infinity
    for (const other of allItems) {
      if (other.id === item.id) continue
      if (other.trackId !== item.trackId) continue
      if (transitionLinkedIds?.has(other.id)) continue
      const otherEnd = other.from + other.durationInFrames
      if (otherEnd <= item.from) nearestEnd = Math.max(nearestEnd, otherEnd)
    }
    if (nearestEnd !== -Infinity) {
      const maxExtend = item.from - nearestEnd
      if (-trimAmount > maxExtend) return maxExtend > 0 ? -maxExtend : 0
    }
  }

  return trimAmount
}
```

**OpenCut-classic group-resize algorithm (`timeline/group-resize/compute-resize.ts:26-114`):**

```ts
export function computeGroupResize({
  members, side, deltaTime, fps,
}: ComputeGroupResizeArgs): GroupResizeResult {
  if (members.length === 0) {
    return { deltaTime: ZERO_MEDIA_TIME, updates: [] };
  }

  const minDuration = mediaTime({
    ticks: Math.round((TICKS_PER_SECOND * fps.denominator) / fps.numerator),
  });
  let minimumDeltaTime = getMinimumAllowedDeltaTime({ member: members[0], side, minDuration });
  let maximumDeltaTime = getMaximumAllowedDeltaTime({ member: members[0], side, minDuration });

  // Multi-select: take tightest bound across all members
  for (const member of members.slice(1)) {
    minimumDeltaTime = maxMediaTime({
      a: minimumDeltaTime,
      b: getMinimumAllowedDeltaTime({ member, side, minDuration }),
    });
    const memberMaximum = getMaximumAllowedDeltaTime({ member, side, minDuration });
    if (memberMaximum !== null) {
      maximumDeltaTime = maximumDeltaTime === null
        ? memberMaximum
        : minMediaTime({ a: maximumDeltaTime, b: memberMaximum });
    }
  }

  const clampedDeltaTime = maximumDeltaTime === null
    ? maxMediaTime({ a: minimumDeltaTime, b: deltaTime })
    : clampMediaTime({ time: deltaTime, min: minimumDeltaTime, max: maximumDeltaTime });

  // Snap-once: round the drag delta to a frame exactly once, then derive every
  // patch field from that single snapped value. Keeps invariant
  // trimStart + duration*rate + trimEnd == sourceDuration exact.
  const snappedDeltaTime = mediaTime({ ticks: roundFrameTicks({ ticks: clampedDeltaTime, fps }) });
  const finalDeltaTime = maximumDeltaTime === null
    ? maxMediaTime({ a: minimumDeltaTime, b: snappedDeltaTime })
    : clampMediaTime({ time: snappedDeltaTime, min: minimumDeltaTime, max: maximumDeltaTime });

  return {
    deltaTime: Object.is(finalDeltaTime, -0) ? ZERO_MEDIA_TIME : finalDeltaTime,
    updates: members.map((member) => buildResizeUpdate({ member, side, deltaTime: finalDeltaTime })),
  };
}
```

**Edge cases:**
- Cannot trim beyond source start (`trim-utils.ts:71-83`)
- Cannot trim beyond source end (`trim-utils.ts:97-110`)
- Cannot trim duration below 1 frame (`trim-utils.ts:183-202` — `clampToMinDuration`)
- Reversed playback has different source-extent math (`trim-utils.ts:72-83, 89-110`)
- Composition wrappers: cached `sourceDuration` may be stale — read live sub-comp duration (`trim-utils.ts:24-36` — `getEffectiveSourceDuration`)
- If trimming would cause overlap with previous clip: clamp (`clampToAdjacentItems:129-178`)
- Transition-linked clips allowed to overlap (excluded from clamp, `trim-utils.ts:144-145, 162-163`)

**Multi-select behavior:**
- `applySynchronizedTrim` (`trim-actions.ts:180-251`): iterates over `getSynchronizedLinkedItemsForEdit(...)` (linked companions on other tracks), clamps each with `clampTrimAmount` + `clampToAdjacentItems`, takes tightest delta (`keepTightestDelta:33-35`), then applies actual delta to each synced item with `skipAdjacentClamp: true` (since the tightest bound was already computed).
- OpenCut `computeGroupResize` (`compute-resize.ts:50-70`): walks `members.slice(1)`, takes `maxMediaTime` of minimums and `minMediaTime` of maximums to find the tightest common delta.

**Constraints (reject/clamp if):**
- Source bounds (start ≥ 0, end ≤ sourceDuration)
- Duration ≥ 1 frame
- Adjacent overlap (no extending into neighbor; transition-linked clips excepted)
- Keyframe preservation: binary-search for largest valid delta (`trim-edit-constraints.ts:18-34` — `clampDeltaToLastValidValue`)
- Transition compatibility: validator checks `canAddTransition` for every related transition (`trim-edit-constraints.ts:88-107`)

**Command:** FreeCut wraps in `execute('TRIM_ITEM_START' | 'TRIM_ITEM_END', ...)`. OpenCut wraps in `UpdateElementsCommand` (`commands/timeline/element/update-elements.ts:10-75`) for the patch application; the resize delta computation happens in `computeGroupResize` (pure function).

### 5.2A Trim shape per layer (Round 8 — the two legitimate forms)

Two trim shapes coexist in the ecosystem, and both are correct **at their own layer**. The spec pins which is canonical where, so implementers stop trying to force one shape on both layers:

| Layer | Shape | Where defined | Who implements it |
|---|---|---|---|
| **Wire protocol** (spec 15) | Single element: `{elementId, edge: 'start'\|'end', delta, ripple, syncLinked?, skipAdjacentClamp?}` | spec 15 §4.3.2 | The command dispatcher; the only shape tests may submit over the wire |
| **UI/controller path** (this spec, spec 05) | Multi-element group: `{elements: ElementRef[], side: 'left'\|'right', deltaTicks}` — the resize controller trims a whole selection as one gesture | spec 05 §8.4; opencut-timeline `ops/group-resize.ts` (`ResizeSide`, `buildResizeMembers`, `computeGroupResize`) | The interaction controller (drag → preview → commit) |

**The mapping:** the controller's group trim reduces to N wire `trim` commands inside ONE `CommandBatch` (spec 15 §7) — tightest-delta pre-clamped via `applySynchronizedTrim`'s keep-tightest discipline (above), so each member's individual clamp is consistent. The batch is atomic (all members commit or none) and produces ONE undo step (one undo step per user intent). The controller path may also coalesce via `previewElements` during the drag and emit the batch only at commit (§4.6).

**NOOP vs rejection (Round 8, absorbed from opencut-timeline):** a trim whose delta clamps to zero (valid input, no-op output) returns `ok: false` with the **`NOOP`** error code — NOT `TRIM_BEYOND_SOURCE`, NOT `ok: true` with a silent no-op. A test that cannot distinguish "rejected as invalid" from "clamped to nothing" is a test that will miss the fake-commit bug class (opencut-timeline's split-once returned the original object so withUndo saw no change — same family as nle-engine's retired fake `editProject`). Spec 15 §6.3 carries the code; spec 17 §2.5's error-path census requires at least one triggering test per code including `NOOP`.

### 5.3 Move

**Description:** Change an element's `startTime` and/or `trackId`.

**FreeCut reference:** `hooks/use-timeline-drag.ts`; move primitives in `stores/items-store.ts` (`_moveItem`, `_moveItems`). Action layer in `stores/actions/item-actions.ts`.

**OpenCut-classic references:**
- `commands/timeline/element/move-elements.ts:18-131` (`MoveElementCommand`)
- `timeline/group-move/{build-group,resolve-move,snap,track-placement,types,index}.ts`

**OpenCut move command (`move-elements.ts:36-123`):**

```ts
execute(): CommandResult | undefined {
  const editor = EditorCore.getInstance();
  this.savedState = editor.scenes.getActiveScene().tracks;

  // Phase 1: create any new tracks the move requested (e.g. drag off the edge)
  let tracksToUpdate = this.savedState;
  for (const createTrack of [...this.createTracks].sort(
    (firstTrack, secondTrack) => firstTrack.index - secondTrack.index,
  )) {
    tracksToUpdate = insertTrackAtDisplayIndex({
      tracks: tracksToUpdate,
      track: buildEmptyTrack({ id: createTrack.id, type: createTrack.type }),
      insertIndex: createTrack.index,
    });
  }

  // Phase 2: build moved element patches; validate each sourceTrack/targetTrack exists
  // and element is compatible with the target track type
  const movedElementsById = new Map<string, TimelineElement>();
  for (const move of this.moves) {
    const sourceTrack = findTrackInSceneTracks({ tracks: this.savedState, trackId: move.sourceTrackId });
    const sourceElement = sourceTrack?.elements.find((e) => e.id === move.elementId);
    if (!sourceTrack || !sourceElement) throw new Error("Source track or element not found");

    const targetTrack = findTrackInSceneTracks({ tracks: tracksToUpdate, trackId: move.targetTrackId });
    if (!targetTrack) throw new Error("Target track not found");

    const validation = validateElementTrackCompatibility({ element: sourceElement, track: targetTrack });
    if (!validation.isValid) throw new Error(validation.errorMessage);

    movedElementsById.set(move.elementId, { ...sourceElement, startTime: move.newStartTime });
  }

  // Phase 3: splice — remove moved element IDs from each track, append to target tracks
  const movedElementIds = new Set(this.moves.map((move) => move.elementId));
  const movedElementsByTargetTrackId = new Map<string, TimelineElement[]>();
  for (const move of this.moves) {
    const movedElement = movedElementsById.get(move.elementId);
    if (!movedElement) continue;
    const nextTargetElements = movedElementsByTargetTrackId.get(move.targetTrackId) ?? [];
    nextTargetElements.push(movedElement);
    movedElementsByTargetTrackId.set(move.targetTrackId, nextTargetElements);
  }

  const updatedTracks = mapSceneTracks({
    tracks: tracksToUpdate,
    update: (track) => ({
      ...track,
      elements: [
        ...track.elements.filter((element) => !movedElementIds.has(element.id)),
        ...(movedElementsByTargetTrackId.get(track.id) ?? []),
      ],
    }),
  });

  editor.timeline.updateTracks(updatedTracks);
  return createElementSelectionResult(
    this.moves.map(({ elementId, targetTrackId }) => ({ trackId: targetTrackId, elementId })),
  );
}
```

**OpenCut group-move algorithm (`timeline/group-move/resolve-move.ts:34-121`):**

The `resolveExistingTrackMove` function (`resolve-move.ts:63-121`) handles multi-element moves anchored to one element:

1. Resolve each member's target track ID by walking outward from the anchor's target track index, finding the nearest compatible track type (`resolveExistingTrackIdsByElementId:216-303`).
2. Clamp `anchorStartTime` to keep all members at `>= 0` time and to keep the main-track member from being moved to a time earlier than the earliest stationary main-track element (`clampAnchorStartTime:343-410`).
3. Build `PlannedElementMove[]` with `newStartTime = clampedAnchorStartTime + member.timeOffset`.
4. Verify moves don't cause overlaps on target tracks via `canApplyMovesToExistingTracks:412-474` — uses `canPlaceTimeSpansOnTrack` from `placement/overlap.ts:29-44`.

**Overlap resolution** (`timeline/placement/overlap.ts:8-44`):

```ts
function wouldElementOverlap({
  elements, startTime, endTime, excludeElementId,
}): boolean {
  return elements.some((element) => {
    if (excludeElementId && element.id === excludeElementId) return false;
    const elementEnd = element.startTime + element.duration;
    return startTime < elementEnd && endTime > element.startTime;
  });
}

export function canPlaceTimeSpansOnTrack({ track, timeSpans }): boolean {
  return timeSpans.every(({ startTime, duration, excludeElementId }) => {
    return !wouldElementOverlap({
      elements: track.elements,
      startTime,
      endTime: startTime + duration,
      excludeElementId,
    });
  });
}
```

**Edge cases:**
- Multi-track moves: anchor picks target track; other members walk outward to find compatible tracks (`resolveExistingTrackIdsByElementId:216-303`).
- New track creation: `PlannedTrackCreation[]` carries `{id, type, index}` for each new track.
- Cross-section moves blocked: audio + non-audio mix in same group is rejected (`resolve-move.ts:147-155`).
- Main track constraint: main-track member can't be moved before earliest stationary main-track element (`clampAnchorStartTime:372-407`).
- Overlap detection uses `canApplyMovesToExistingTracks` to reject the whole move if any conflict.

**Multi-select behavior:**
- `buildMoveGroup({anchorRef, selectedElements, tracks})` (`build-group.ts:7-91`) constructs a `MoveGroup` with anchor + members array. Each member stores `timeOffset` relative to anchor, so the whole group translates rigidly.
- `snapGroupEdges` (`group-move/snap.ts:14-100`) snaps any member's start or end to a snap point and adjusts the anchor accordingly.

### 5.4 Ripple

**Description:** Shift subsequent clips to close a gap (or open a gap). Used by ripple delete and ripple trim.

**OpenCut-classic's diff-based approach (WE ADOPT THIS):**

The pattern (from `apps/web/src/ripple/{diff,apply,shift,index}.ts`):

1. **`diff.ts`** — `computeRippleAdjustments({beforeTracks, afterTracks})`: computes `RippleAdjustment[]` by diffing the before/after tracks. For each track:
   - Build element span maps for before & after.
   - Find **vacated intervals** (where before-element ended further right than after-element ends, or where before-element disappeared entirely and wasn't moved to another track).
   - Find **joined intervals** (new after-elements that didn't exist before — these are exempt from ripple shifting).
   - Subtract joined intervals from vacated intervals → "freed intervals" (genuine gaps left behind).
   - For each freed interval, emit `{trackId, afterTime: interval.endTime, shiftAmount: interval.endTime - interval.startTime}`.
2. **`shift.ts`** — `rippleShiftElements({elements, afterTime, shiftAmount})`: pure map, shifts every element whose `startTime >= afterTime` leftward by `shiftAmount`.
3. **`apply.ts`** — `applyRippleAdjustments({tracks, adjustments})`: groups adjustments by track, sorts each track's adjustments by `afterTime` descending (so rightmost first — preserves `afterTime` indices as elements get shifted), and applies `rippleShiftElements` sequentially per track.

**Why this is better than FreeCut's inline ripple:**

FreeCut's `sync-lock-ripple.ts:389-469` propagates removed/inserted intervals imperatively — the action code itself decides what to shift and calls `_moveItems` directly. This:
- Couples ripple logic to the action (can't test ripple in isolation).
- Re-implements interval arithmetic in every ripple caller (rippleTrimItem in `trim-actions.ts:322-460`, rateStretchItem in `rate-stretch-actions.ts:66-202`, applyRippleRemoval in `range-removal-actions.ts:60-176`).

OpenCut's `computeRippleAdjustments` is **diff-based**: it doesn't need to know what the action did — it just compares before/after tracks and figures out the ripple adjustments automatically. This means:
- Any command (split, trim, move, delete, insert, rate-stretch) automatically gets ripple behavior when `CommandManager.isRippleEnabled === true`. No per-action ripple code.
- The diff function is pure & testable in isolation.
- The CommandManager hook (`commands.ts:21-37`) is the only integration point.

**CommandManager hook (`commands.ts:21-37, 70-91, 127-153`):**

```ts
// commands.ts:14 — ripple is a FLAG, not a separate command
public isRippleEnabled = false;

// commands.ts:21-37 — execute() captures beforeTracks if ripple is enabled
execute({ command }: { command: Command }): Command {
        const beforeTracks = this.isRippleEnabled
                ? (this.editor.scenes.getActiveSceneOrNull()?.tracks ?? null)
                : null;
        const previousSelection = this.getSelectionSnapshot();
        const result = command.execute();
        this.applyRippleIfEnabled({ beforeTracks });
        // ...
}

// commands.ts:127-153 — applyRippleIfEnabled calls @/ripple
private applyRippleIfEnabled({ beforeTracks }): void {
        if (!this.isRippleEnabled || !beforeTracks) return;
        const afterTracks = this.editor.scenes.getActiveSceneOrNull()?.tracks;
        if (!afterTracks) return;
        const adjustments = computeRippleAdjustments({ beforeTracks, afterTracks });
        if (adjustments.length === 0) return;
        const tracksWithRipple = applyRippleAdjustments({ tracks: afterTracks, adjustments });
        this.editor.timeline.updateTracks(tracksWithRipple);
}
```

The flag is set externally from `editor-provider.tsx:136-138`:

```ts
useEffect(() => {
        editor.command.isRippleEnabled = rippleEditingEnabled;
}, [editor, rippleEditingEnabled]);
```

**Full quoted source: see §12 below.**

**Round-8 notes (executable reference + modeling):**

1. **Executable reference:** opencut-timeline ports this exact diff algorithm (`ripple/index.ts:121 computeRippleAdjustments` / `:16 rippleShiftElements` / `:40 applyRippleAdjustments`, 395 LOC, tested in M6) — use it as the running version of §12's quoted OpenCut source.
2. **Ripple modeling stays compositional at the wire:** spec 15 §4.3.4 models ripple as the `RippleCommand` meta-wrapper / `delete` with `ripple: true` — NOT a distinct wire command type. Implementations MAY expose a `rippleDeleteElements` convenience on the manager surface (opencut-timeline's `TimelineCore.rippleDeleteElements` at `timeline-core.ts:620`, exercised via its `timeline.rippleDelete` headless alias in M14) — the convenience decomposes to `delete {ripple: true}` at the wire boundary and MUST NOT become a 79th union member. Both surfaces are tested in the reference; ours keeps one wire shape.

### 5.5 Roll

**Description:** Trim two adjacent clips together — extend one's end, retract the other's start, total timeline duration preserved.

**FreeCut references:**
- Action: `stores/actions/edit/trim-actions.ts:471-565` (`rollingTrimItems`)
- Preview store: `stores/rolling-edit-preview-store.ts:1-48`
- Overlay UI: `features/preview/components/rolling-edit-overlay.tsx:1-58`
- Overlay utils: `features/preview/components/rolling-edit-overlay-utils.ts:1-32`

**FreeCut roll algorithm (`trim-actions.ts:471-565`):**

```ts
export function rollingTrimItems(leftId: string, rightId: string, editPointDelta: number): void {
  if (editPointDelta === 0) return;

  execute('ROLLING_EDIT', () => {
    const itemsStore = useItemsStore.getState();
    const itemsBefore = itemsStore.items;
    // Expand to linked counterpart pair (e.g. video + audio companion)
    const counterpartPair = getSynchronizedLinkedCounterpartPairForEdit(
      itemsBefore, leftId, rightId, isLinkedSelectionEnabled(),
    );
    const rightBefore = itemsBefore.find((item) => item.id === rightId);
    const leftBefore = itemsBefore.find((item) => item.id === leftId);
    if (!leftBefore || !rightBefore) return;

    // Clamp delta to preserve transitions & keyframes (binary search)
    let clampedEditPointDelta = clampRollingTrimDeltaToPreserveEditState(
      leftBefore, 'end', editPointDelta, rightBefore, itemsBefore,
      transitions, keyframesByItemId, timelineFps, false,
    );
    if (counterpartPair) {
      clampedEditPointDelta = keepTightestDelta(clampedEditPointDelta,
        clampRollingTrimDeltaToPreserveEditState(
          counterpartPair.leftCounterpart, 'end', clampedEditPointDelta,
          counterpartPair.rightCounterpart, itemsBefore, transitions,
          keyframesByItemId, timelineFps, false,
        ),
      );
    }
    if (clampedEditPointDelta === 0) return;

    // ORDER MATTERS: shrink first, then extend.
    // _trimItemEnd/_trimItemStart have clampToAdjacentItems guards that
    // prevent extending into a neighbor. By shrinking the losing clip first,
    // we free up space for the gaining clip to extend into.
    if (clampedEditPointDelta > 0) {
      // Edit point moves right: right clip shrinks (frees space), then left clip extends
      itemsStore._trimItemStart(rightId, clampedEditPointDelta);
      itemsStore._trimItemEnd(leftId, clampedEditPointDelta);
    } else {
      // Edit point moves left: left clip shrinks (frees space), then right clip extends
      itemsStore._trimItemEnd(leftId, clampedEditPointDelta);
      itemsStore._trimItemStart(rightId, clampedEditPointDelta);
    }

    // Apply same delta to linked counterpart pair (video+audio companion)
    const rightAfter = useItemsStore.getState().itemById[rightId];
    const actualDelta = rightAfter ? rightAfter.from - rightBefore.from : 0;
    if (counterpartPair && actualDelta !== 0) {
      if (actualDelta > 0) {
        itemsStore._trimItemStart(counterpartPair.rightCounterpart.id, actualDelta, { skipAdjacentClamp: true });
        itemsStore._trimItemEnd(counterpartPair.leftCounterpart.id, actualDelta, { skipAdjacentClamp: true });
      } else {
        itemsStore._trimItemEnd(counterpartPair.leftCounterpart.id, actualDelta, { skipAdjacentClamp: true });
        itemsStore._trimItemStart(counterpartPair.rightCounterpart.id, actualDelta, { skipAdjacentClamp: true });
      }
    }

    applyTransitionRepairs(affectedIds);
    requestPostEditWarmForItems(affectedIds);
    useTimelineSettingsStore.getState().markDirty();
  }, { leftId, rightId, editPointDelta });
}
```

**Preview store (`rolling-edit-preview-store.ts:4-48`):**

```ts
interface RollingEditPreviewState {
  /** The item being directly trimmed (the one the user grabbed) */
  trimmedItemId: string | null;
  /** The adjacent neighbor being inversely adjusted */
  neighborItemId: string | null;
  /** Which handle on the trimmed item: 'start' or 'end' */
  handle: 'start' | 'end' | null;
  /** Delta in frames applied to the neighbor */
  neighborDelta: number;
  /** Whether the rolling edit is constrained (from either clip's source limit) */
  constrained: boolean;
}

export const useRollingEditPreviewStore = createEditPreviewStore<
  RollingEditPreviewState,
  Parameters<RollingEditPreviewActions['setPreview']>[0],
  Pick<RollingEditPreviewActions, 'setNeighborDelta'>
>({
  initialState: createInitialState,
  normalizePreview: (params) => withPreviewDefaults(params, { constrained: false }),
  createActions: (set) => ({
    setNeighborDelta: (neighborDelta, constrained) =>
      set({ neighborDelta, constrained: constrained ?? false }),
  }),
});
```

**Overlay UI (`rolling-edit-overlay.tsx:15-58`):**

```tsx
export function RollingEditOverlay({ fps }: RollingEditOverlayProps) {
  const trimmedItemId = useRollingEditPreviewStore((s) => s.trimmedItemId);
  const neighborItemId = useRollingEditPreviewStore((s) => s.neighborItemId);
  const handle = useRollingEditPreviewStore((s) => s.handle);
  const neighborDelta = useRollingEditPreviewStore((s) => s.neighborDelta);
  const items = useTimelineStore((s) => s.items);
  const itemsMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  if (!trimmedItemId || !neighborItemId || !handle) return null;

  const trimmedOperationItem = itemsMap.get(trimmedItemId);
  const neighborOperationItem = itemsMap.get(neighborItemId);
  if (!trimmedOperationItem || !neighborOperationItem) return null;

  const trimmedItem = resolveEditOverlayVisualItem(items, trimmedOperationItem);
  const neighborItem = resolveEditOverlayVisualItem(items, neighborOperationItem);

  const { leftItem, rightItem, outInfo, inInfo } = getRollingEditPanelFrames({
    trimmedItem, neighborItem, handle, neighborDelta, fps,
  });

  return (
    <EditTwoUpPanels
      leftPanel={{ item: leftItem, sourceTime: outInfo.sourceTime, sourceFrame: outInfo.sourceFrame, timecode: outInfo.timecode, label: 'OUT' }}
      rightPanel={{ item: rightItem, sourceTime: inInfo.sourceTime, sourceFrame: inInfo.sourceFrame, timecode: inInfo.timecode, label: 'IN' }}
    />
  );
}
```

**Panel frame calc (`rolling-edit-overlay-utils.ts:12-32`):**

```ts
export function getRollingEditPanelFrames({
  trimmedItem, neighborItem, handle, neighborDelta, fps,
}) {
  const leftItem = handle === 'end' ? trimmedItem : neighborItem;
  const rightItem = handle === 'end' ? neighborItem : trimmedItem;

  return {
    leftItem, rightItem,
    outInfo: getSourceFrameInfo(leftItem,
      Math.max(0, leftItem.durationInFrames + neighborDelta - 1), fps),
    inInfo: getSourceFrameInfo(rightItem, neighborDelta, fps),
  };
}
```

**Constraints:**
- Both elements must be adjacent (rightElement.startTime === leftElement.startTime + leftElement.duration). Not strictly checked — caller must guarantee.
- Cannot extend left element beyond its source end (clamped by `clampRollingTrimDeltaToPreserveEditState`)
- Cannot extend right element beyond its source start (same clamp)
- Cannot retract either to ≤0 duration (same clamp)
- Transition & keyframe preservation (binary search via `clampDeltaToLastValidValue`)

**Multi-select:** Single pair (leftId, rightId) + optional linked counterpart pair.

**Command:** FreeCut: `execute('ROLLING_EDIT', ...)`. OpenCut: ❌ NOT IMPLEMENTED — must be ported as a new op (use `BatchCommand` wrapping two `OpCommand`s for the two trims, or a single `TracksSnapshotCommand`).

### 5.6 Slip

**Description:** Shift the source in/out points within a fixed timeline position. Element's `startTime` and `duration` don't change; `sourceStart`/`sourceEnd` (FreeCut) or `trimStart`/`trimEnd` (OpenCut) change.

**FreeCut references:**
- Action: `stores/actions/edit/trim-actions.ts:576-639` (`slipItem`)
- Slip clamp util: `utils/slip-utils.ts:12-33` (`computeClampedSlipDelta`)
- Preview store: `stores/slip-edit-preview-store.ts:1-33`
- Overlay UI: `features/preview/components/slip-edit-overlay.tsx:1-87`
- Hook: `hooks/use-timeline-slip-slide.ts:1-1291`

**FreeCut slip algorithm (`trim-actions.ts:576-639`):**

```ts
export function slipItem(id: string, slipDelta: number): void {
  if (slipDelta === 0) return;

  execute('SLIP_EDIT', () => {
    const itemsStore = useItemsStore.getState();
    const items = itemsStore.items;
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (item.type !== 'video' && item.type !== 'audio' && item.type !== 'composition') return;
    const synchronizedItems = getSynchronizedLinkedItemsForEdit(
      items, id, isLinkedSelectionEnabled(),
    );

    const sourceStart = item.sourceStart ?? 0;
    const sourceEnd = item.sourceEnd;
    if (sourceEnd === undefined) return;

    let clamped = slipDelta;
    for (const synchronizedItem of synchronizedItems) {
      clamped = computeClampedSlipDelta(
        synchronizedItem.sourceStart ?? 0,
        synchronizedItem.sourceEnd,
        synchronizedItem.sourceDuration,
        clamped,
      );
      clamped = clampSlipDeltaToPreserveTransitions(
        synchronizedItem, clamped, items, transitions, timelineFps,
      );
    }

    if (clamped === 0) return;

    // Update sourceStart/sourceEnd on the slipped item — startTime & duration UNCHANGED
    itemsStore._updateItem(id, {
      sourceStart: sourceStart + clamped,
      sourceEnd: sourceEnd + clamped,
    });

    // Apply same delta to linked companions
    for (const synchronizedItem of synchronizedItems) {
      if (synchronizedItem.id === id || synchronizedItem.sourceEnd === undefined) continue;
      itemsStore._updateItem(synchronizedItem.id, {
        sourceStart: (synchronizedItem.sourceStart ?? 0) + clamped,
        sourceEnd: synchronizedItem.sourceEnd + clamped,
      });
    }

    applyTransitionRepairs(affectedIds);
    requestPostEditWarmForItems(affectedIds);
    useTimelineSettingsStore.getState().markDirty();
  }, { id, slipDelta });
}
```

**Slip clamp (`slip-utils.ts:12-33`):**

```ts
export function computeClampedSlipDelta(
  sourceStart: number,
  sourceEnd: number | undefined,
  sourceDuration: number | undefined,
  delta: number,
): number {
  if (sourceEnd === undefined) return 0;    // no-op if no explicit source bounds

  let clamped = delta;

  // Clamp: sourceStart + delta >= 0
  if (sourceStart + clamped < 0) {
    clamped = -sourceStart;
  }

  // Clamp: sourceEnd + delta <= sourceDuration
  if (sourceDuration !== undefined && sourceEnd + clamped > sourceDuration) {
    clamped = sourceDuration - sourceEnd;
  }

  return clamped;
}
```

**Preview store (`slip-edit-preview-store.ts:3-33`):**

```ts
interface SlipEditPreviewState {
  itemId: string | null;
  trackId: string | null;
  /** Delta in source frames (positive = shift source right, negative = shift source left) */
  slipDelta: number;
}
interface SlipEditPreviewActions {
  setPreview: (params: { itemId: string; trackId: string; slipDelta: number }) => void;
  setSlipDelta: (slipDelta: number) => void;
  clearPreview: () => void;
}
```

**Overlay UI (`slip-edit-overlay.tsx:23-87`):** 4-up overlay with two large center panels (new IN/OUT after slip) and two small corner thumbnails (current IN/OUT baseline before drag). Uses a "virtual item" with shifted source bounds so `getSourceFrameInfo` seeks to the correct slipped source time.

**Constraints:**
- `sourceStart + delta >= 0`
- `sourceEnd + delta <= sourceDuration` (if `sourceDuration` defined; otherwise forward slip is unconstrained)
- Only works on `video`/`audio`/`composition` items (`trim-actions.ts:586`)
- Requires explicit `sourceEnd` (returns no-op otherwise, `slip-utils.ts:18`)
- Transition compatibility preserved via `clampSlipDeltaToPreserveTransitions`

**Multi-select:** Slip applies to the anchor + all linked companions with the same clamped delta.

**Command:** FreeCut: `execute('SLIP_EDIT', ...)`. OpenCut: ❌ NOT IMPLEMENTED — port as new op.

### 5.7 Slide

**Description:** Move a clip + shift its neighbors to make room. The clip's source content doesn't change (well, it can shift for split-chain continuity — see `computeSlideContinuitySourceDelta`), but its timeline position does, and adjacent clips trim to accommodate.

**FreeCut references:**
- Action: `stores/actions/edit/trim-actions.ts:651-878` (`slideItem`)
- Slide continuity: `utils/slide-utils.ts:16-42` (`computeSlideContinuitySourceDelta`)
- Preview store: `stores/slide-edit-preview-store.ts:1-57`
- Overlay UI: `features/preview/components/slide-edit-overlay.tsx:1-128`
- Hook: `hooks/use-timeline-slip-slide.ts:1-1291`
- Keyframe constraint: `utils/slide-keyframe-constraints.ts` (`clampSlideDeltaToPreserveKeyframes`)

**FreeCut slide algorithm (`trim-actions.ts:651-878`, summarized):**

1. Resolve `item`, `leftNeighbor`, `rightNeighbor` (+ optional linked counterpart + its neighbors).
2. Clamp slide delta via `clampSlideParticipantDelta` (`trim-actions.ts:76-124`) — combines source bounds, adjacent overlap, and any other items on the track. Apply to anchor + counterpart, take tightest.
3. Clamp to preserve transitions: `clampSlideDeltaToPreserveTransitions` (twice, once per participant).
4. Clamp to preserve keyframes: `clampSlideDeltaToPreserveKeyframes` (once, across both participants).
5. Compute continuity source delta: `computeSlideContinuitySourceDelta` — if `leftNeighbor + slidItem + rightNeighbor` form a split-contiguous chain (all joinable pairs) AND slidItem is media with explicit sourceEnd, the slid clip's source window shifts by the equivalent source-space delta so playback stays continuous across the slide.
6. **Order: shrink first, then extend** (same as rolling edit):
   - `slideDelta > 0`: right neighbor shrinks start, left neighbor extends end.
   - `slideDelta < 0`: left neighbor shrinks end, right neighbor extends start.
7. Move the slid clip: `_moveItem(id, item.from + clampedSlideDelta)`.
8. If continuity source delta != 0 and item is media: update `sourceStart`/`sourceEnd` on the slid clip.
9. Apply same neighbor trims + move to linked counterpart.

**Slide continuity source delta (`slide-utils.ts:16-42`):**

```ts
export function computeSlideContinuitySourceDelta(
  slidItem: TimelineItem,
  leftNeighbor: TimelineItem | null,
  rightNeighbor: TimelineItem | null,
  slideDelta: number,
  timelineFps: number,
): number {
  if (slideDelta === 0) return 0;
  if (!leftNeighbor || !rightNeighbor) return 0;
  if (!canJoinItems(leftNeighbor, slidItem) || !canJoinItems(slidItem, rightNeighbor)) return 0;
  if (!isMediaItem(slidItem)) return 0;
  if (slidItem.sourceEnd === undefined) return 0;

  const speed = slidItem.speed ?? 1;
  const sourceFps = slidItem.sourceFps ?? timelineFps;
  const sourceStart = slidItem.sourceStart ?? 0;
  const sourceEnd = slidItem.sourceEnd;
  const sourceDelta = timelineToSourceFrames(slideDelta, speed, timelineFps, sourceFps);
  const clamped = computeClampedSlipDelta(sourceStart, sourceEnd, slidItem.sourceDuration, sourceDelta);
  return clamped;
}
```

**Preview store (`slide-edit-preview-store.ts:4-44`):**

```ts
interface SlideEditPreviewState {
  itemId: string | null;
  trackId: string | null;
  leftNeighborId: string | null;
  rightNeighborId: string | null;
  /** Delta in timeline frames (positive = slide right, negative = slide left) */
  slideDelta: number;
  /** Max leftward slide delta (negative), combining all track constraints */
  minDelta: number;
  /** Max rightward slide delta (positive), combining all track constraints */
  maxDelta: number;
}
```

**Overlay UI (`slide-edit-overlay.tsx:23-128`):** 4-up overlay:
- **Center-left (OUT):** left neighbor's new last frame (`leftNeighbor.durationInFrames + slideDelta - 1`).
- **Center-right (IN):** right neighbor's new first frame (local frame = `slideDelta`).
- **Top-left corner:** left neighbor's current OUT baseline.
- **Top-right corner:** right neighbor's current IN baseline.
- If no neighbor on a side: shows "GAP" placeholder.

**Constraints:**
- Slid clip can't extend past neighbor on either side (clamped).
- Source bounds on neighbors respected (`clampTrimAmount` for each neighbor).
- Transitions on neighbors preserved (`clampSlideDeltaToPreserveTransitions`).
- Keyframes on slid clip + neighbors preserved (`clampSlideDeltaToPreserveKeyframes`).

**Multi-select:** Slide operates on one slid clip + optional linked counterpart (treated as parallel slide group with its own neighbors).

**Command:** FreeCut: `execute('SLIDE_EDIT', ...)`. OpenCut: ❌ NOT IMPLEMENTED — port as new op (could be a `BatchCommand` wrapping 2 trims + 1 move + optional source-update patch).

### 5.8 Delete

**Description:** Remove element(s) from the timeline.

**OpenCut delete (`commands/timeline/element/delete-elements.ts:24-72`):**

```ts
function removeTrackElements<TTrack extends TimelineTrack>({
  track, elements,
}): TTrack {
  const nextElements = track.elements.filter(
    (element) => !elements.some(
      (target) => target.trackId === track.id && target.elementId === element.id,
    ),
  );
  return { ...track, elements: nextElements } as TTrack;
}

export class DeleteElementsCommand extends Command {
  private savedState: SceneTracks | null = null;
  private readonly elements: { trackId: string; elementId: string }[];

  constructor({ elements }: { elements: { trackId: string; elementId: string }[] }) {
    super();
    this.elements = elements;
  }

  execute(): CommandResult | undefined {
    const editor = EditorCore.getInstance();
    this.savedState = editor.scenes.getActiveScene().tracks;

    const updatedTracks: SceneTracks = {
      overlay: this.savedState.overlay.map((track) =>
        removeTrackElements({ track, elements: this.elements })),
      main: removeTrackElements({ track: this.savedState.main, elements: this.elements }),
      audio: this.savedState.audio.map((track) =>
        removeTrackElements({ track, elements: this.elements })),
    };

    editor.timeline.updateTracks(updatedTracks);

    // Clear selection (deleted elements are no longer selectable)
    return {
      selection: {
        selectedElements: [],
        selectedKeyframes: [],
        keyframeSelectionAnchor: null,
        selectedMaskPoints: null,
      },
    };
  }

  undo(): void {
    if (this.savedState) {
      EditorCore.getInstance().timeline.updateTracks(this.savedState);
    }
  }
}
```

**Ripple delete:** Set `CommandManager.isRippleEnabled = true`, then `execute({command: new DeleteElementsCommand({elements})})`. The `applyRippleIfEnabled` hook in `CommandManager.execute()` will call `computeRippleAdjustments({beforeTracks, afterTracks})` which detects the vacated intervals and shifts everything to the right of the leftmost removed element leftward. **No separate RippleDeleteCommand needed.**

**FreeCut ripple delete** (`range-removal-actions.ts:60-176`, `applyRippleRemoval`): computes shift per remaining item = sum of deleted-item durations ending at/before that item; applies shifts via `_moveItems`; cascades to sync-locked tracks via `propagateRemovedIntervalsToSyncLockedTracks`.

**Edge cases:**
- Multi-select: pass `[{trackId, elementId}, ...]` to `DeleteElementsCommand`.
- Track-level cleanup: `CommandManager.registerReactor` prunes empty tracks after every command (per `01-core-engine.md:1541`).
- Cascade removal: if removed elements were transition endpoints, transitions/keyframes for those elements must also be removed (FreeCut does this in `range-removal-actions.ts:157-159`).

### 5.9 Insert

**Description:** Add a new element to the timeline from the media library.

**Round-8 constraint (absorbed from opencut-timeline DECISIONS #10):** an insert `CommandBatch` (spec 15 §7) must pass an **intra-batch overlap guard** — the batch's own inserts are validated against each OTHER, not just against pre-batch state. Without it, a batch inserting two elements at overlapping times on the same track can pass per-command validation and still produce an invalid final state (atomicity checks the pre-image and post-image; the guard checks the intermediate trajectory). The reference repo hit this in review round 3; our spec 15 §7.1A now states it as batch semantics.

**OpenCut insert (`commands/timeline/element/insert-element.ts:32-297`, key body):**

```ts
export class InsertElementCommand extends Command {
  private elementId: string;
  private savedState: SceneTracks | null = null;
  private targetTrackId: string | null = null;

  constructor({ element, placement }: InsertElementParams) {
    super();
    this.elementId = generateUUID();
    this.element = element;
    this.placement = placement;
  }

  execute(): CommandResult | undefined {
    const editor = EditorCore.getInstance();
    this.savedState = editor.scenes.getActiveScene().tracks;

    if (!this.validateElementBasics({ element: this.element })) return;

    // Special-case first-visual-element: sets canvas size from asset dimensions
    const isFirstElement = (this.savedState.main.elements.length + ...) === 0;
    const newElement = this.buildElement({ element: this.element });
    const updateResult = this.applyPlacementResult({ tracks: this.savedState, element: newElement });
    if (!updateResult) return;

    const { updatedTracks, targetTrackId } = updateResult;
    this.targetTrackId = targetTrackId;

    // If first visual element, also update project canvasSize + fps from asset metadata
    if (isFirstElement && isVisualMedia) {
      const asset = mediaAssets.find((item) => item.id === newElement.mediaId);
      if (asset?.width && asset?.height) {
        editor.project.updateSettings({
          settings: { canvasSize: { width: asset.width, height: asset.height }, ... },
          pushHistory: false,
        });
      }
      if (asset?.type === "video" && asset?.fps) {
        editor.project.updateSettings({ settings: { fps: floatToFrameRate(asset.fps) }, pushHistory: false });
      }
    }

    editor.timeline.updateTracks(updatedTracks);
    return createElementSelectionResult([{ trackId: targetTrackId, elementId: this.elementId }]);
  }
}
```

**Placement strategies (`placement/types.ts:14-25`):**

```ts
export type PlacementStrategy =
  | { type: "explicit"; trackId: string }
  | { type: "firstAvailable" }
  | { type: "preferIndex"; trackIndex: number; hoverDirection: "above" | "below"; verticalDragDirection?: "up" | "down" | null; createNewTrackOnly?: boolean; }
  | { type: "aboveSource"; sourceTrackIndex: number }
  | { type: "alwaysNew"; position: "highest" | "default" };
```

**Placement resolution (`placement/resolve.ts:134-278`):**
1. If `explicit`: find track by ID; if track type doesn't match element type → reject.
2. If `firstAvailable`: find first track of correct type where `canPlaceTimeSpansOnTrack` returns true; if none, create new track at highest position.
3. If `preferIndex`: try preferred index; if incompatible or overlap, create new track above/below.
4. If `aboveSource`: try track above the source track index; fallback to firstAvailable; fallback to new track.
5. If `alwaysNew`: create new track at highest/default position.

**Edge cases:**
- Element compatibility: video elements only on video tracks, audio only on audio tracks, etc. (`placement/compatibility.ts:3-29` — `ELEMENT_TRACK_MAP`).
- Main-track constraint: main track can't start before its earliest existing element (`placement/main-track.ts:27-55` — `enforceMainTrackStart`).
- First-element canvas/fps auto-set (`insert-element.ts:83-111`).

**Ripple insert:** Set `isRippleEnabled = true`; the diff-based ripple will detect the new element as a "joined interval" (exempt from shift) and shift everything to its right by `element.duration` to make room.

### 5.10 Duplicate

**Description:** Copy clip to a new track (preserving original time position).

**OpenCut duplicate (`commands/timeline/element/duplicate-elements.ts:17-114`):**

For each source track containing selected elements:
1. Filter elements by selection.
2. Build duplicates with new IDs and cloned animations (`cloneAnimations({animations, shouldRegenerateKeyframeIds: true})`).
3. Resolve placement: `strategy: { type: "alwaysNew", position: "highest" }` — always creates a new track above all existing tracks of the same type.
4. Apply placement via `applyPlacement`.
5. Track duplicated `{trackId, elementId}` pairs for selection restore.

### 5.11 Rate Stretch

**Description:** Change an element's playback speed by stretching its duration (keeping source content).

**FreeCut references:**
- Action: `stores/actions/edit/rate-stretch-actions.ts:11-229` (`rateStretchItem`, `rateStretchItemWithoutHistory`, `resetSpeedWithRipple`)
- Hook: `hooks/use-rate-stretch.ts:1-772`
- Speed math: `utils/source-calculations.ts` (`calculateSpeed`, `clampSpeed`, `getExactTimelineDurationForSource`)

**FreeCut rate-stretch algorithm (`rate-stretch-actions.ts:11-214`):**

1. Capture old boundaries (`oldFrom`, `oldDuration`, `oldEnd`).
2. Call `itemsStore._rateStretchItem(id, newFrom, newDuration, newSpeed)` (the actual mutation).
3. Apply same stretch to all synchronized linked items.
4. **Scale keyframes proportionally** to match new duration (`_scaleKeyframesForItem`).
5. Ripple phase: compute `endDelta = newEnd - oldEnd` and `fromDelta = actualFrom - anchorBefore.from`.
   - If `endDelta !== 0`: shift downstream items on each touched track (and their linked companions, and transition-connected neighbors) by `endDelta`.
   - If `fromDelta !== 0`: shift upstream items by `fromDelta`.
6. Repair transitions for all affected IDs.

**OpenCut-classic retime (`retime/rate.ts:1-25`):**

```ts
export const DEFAULT_RETIME_RATE = 1;
export const MIN_RETIME_RATE = 0.01;
export const MAX_RETIME_RATE = 5;

export function clampRetimeRate({ rate }: { rate: number }): number {
  if (!Number.isFinite(rate) || rate <= 0) return DEFAULT_RETIME_RATE;
  return Math.min(Math.max(rate, MIN_RETIME_RATE), MAX_RETIME_RATE);
}

export function canMaintainPitch({ rate }: { rate: number }): boolean {
  return Number.isFinite(rate) && rate > 0;
}

export function shouldMaintainPitch({
  rate, maintainPitch,
}: { rate: number; maintainPitch?: boolean }): boolean {
  return maintainPitch === true && canMaintainPitch({ rate });
}
```

**Retime resolve (`retime/resolve.ts:8-48`):**

```ts
export function getSourceTimeAtClipTime({ clipTime, retime }): number {
  return clipTime * getSafeRate({ rate: retime?.rate ?? 1 });
}

export function getClipTimeAtSourceTime({ sourceTime, retime }): number {
  return sourceTime / getSafeRate({ rate: retime?.rate ?? 1 });
}

export function getEffectiveRateAt({ retime }): number {
  return getSafeRate({ rate: retime?.rate ?? 1 });
}

export function getTimelineDurationForSourceSpan({ sourceSpan, retime }): number {
  if (sourceSpan <= 0) return 0;
  return sourceSpan / getSafeRate({ rate: retime?.rate ?? 1 });
}
```

**Retime split (`retime/split.ts:14-24`):**

```ts
export function splitRetimeAtClipTime({
  retime,
}: {
  retime?: RetimeConfig;
  splitClipTime: number;
}): {
  left: RetimeConfig | undefined;
  right: RetimeConfig | undefined;
} {
  // Currently returns same retime for both sides — variable retime not yet implemented.
  return { left: retime, right: retime };
}

export function adjustRetimeForTrimChange({
  retime,
}: {
  retime?: RetimeConfig;
  clipTrimTime: number;
  side: "start" | "end";
}): RetimeConfig | undefined {
  return retime;
}
```

**OpenCut-classic presets (`retime/presets.ts:1-12`):**

```ts
import type { RetimeConfig } from "@/timeline";
import { clampRetimeRate } from "@/retime/rate";

export function buildConstantRetime({
  rate,
  maintainPitch = false,
}: {
  rate: number;
  maintainPitch?: boolean;
}): RetimeConfig {
  return { rate: clampRetimeRate({ rate }), maintainPitch };
}
```

⚠️ **Note:** Despite the seed spec's reference to "retime presets", `presets.ts` is only 12 LOC and exposes a single `buildConstantRetime` factory. There are no preset speed tables (e.g. 0.5x/1x/2x/4x). We will need to add our own preset table.

### 5.12 Retime (Speed Change with Pitch Preservation)

**Description:** Change an element's playback speed, preserving audio pitch via SoundTouch.

**OpenCut-classic retime audio-stretch (`retime/audio-stretch.ts:1-182`, full algorithm):**

```ts
import { PitchShifter } from "soundtouchjs";
import { clampRetimeRate, shouldMaintainPitch } from "@/retime/rate";
import type { RetimeConfig } from "@/timeline";
import { getSourceTimeAtClipTime } from "./resolve";

const RATE_EPSILON = 1e-6;

function sampleLinear({ channelData, position }): number {
  if (position <= 0) return channelData[0] ?? 0;
  const lower = Math.floor(position);
  const upper = Math.min(channelData.length - 1, lower + 1);
  if (lower >= channelData.length) return 0;
  const fraction = position - lower;
  return channelData[lower] * (1 - fraction) + channelData[upper] * fraction;
}

// Path A: linear resample, no pitch preservation (tempo changes pitch too)
function buildResampledBuffer({
  audioContext, sourceBuffer, trimStart, clipDuration, targetSampleRate, retime,
}): AudioBuffer {
  const outputLength = Math.max(1, Math.ceil(clipDuration * targetSampleRate));
  const numChannels = Math.max(1, Math.min(2, sourceBuffer.numberOfChannels));
  const outputBuffer = audioContext.createBuffer(numChannels, outputLength, targetSampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const sourceData = sourceBuffer.getChannelData(Math.min(channel, sourceBuffer.numberOfChannels - 1));
    const outputData = outputBuffer.getChannelData(channel);

    for (let i = 0; i < outputLength; i++) {
      const clipTime = i / targetSampleRate;
      const sourceTime = trimStart + getSourceTimeAtClipTime({ clipTime, retime });
      outputData[i] = sampleLinear({
        channelData: sourceData,
        position: sourceTime * sourceBuffer.sampleRate,
      });
    }
  }
  return outputBuffer;
}

// Path B: pitch preservation via SoundTouch PitchShifter
async function buildPitchPreservedBuffer({
  sourceBuffer, trimStart, clipDuration, rate, targetSampleRate,
}): Promise<AudioBuffer> {
  const nativeSampleRate = sourceBuffer.sampleRate;
  const sourceDuration = clipDuration * rate;
  const startSample = Math.max(0, Math.floor(trimStart * nativeSampleRate));
  const numSourceSamples = Math.max(1, Math.ceil(sourceDuration * nativeSampleRate));
  const available = Math.max(0, sourceBuffer.length - startSample);
  const actualSamples = Math.max(1, Math.min(numSourceSamples, available));
  const numChannels = Math.max(1, Math.min(2, sourceBuffer.numberOfChannels));

  // Resample to targetSampleRate first — soundtouchjs reads raw channel data
  // and does not respect the source buffer's native sample rate.
  const resampledLength = Math.max(1, Math.ceil(sourceDuration * targetSampleRate));
  const resampleCtx = new OfflineAudioContext(numChannels, resampledLength, targetSampleRate);
  const nativeBuffer = resampleCtx.createBuffer(numChannels, actualSamples, nativeSampleRate);
  for (let ch = 0; ch < numChannels; ch++) {
    const src = sourceBuffer.getChannelData(Math.min(ch, sourceBuffer.numberOfChannels - 1));
    nativeBuffer.copyToChannel(src.subarray(startSample, startSample + actualSamples), ch);
  }

  const resampleSourceNode = resampleCtx.createBufferSource();
  resampleSourceNode.buffer = nativeBuffer;
  resampleSourceNode.connect(resampleCtx.destination);
  resampleSourceNode.start(0);
  const resampledBuffer = await resampleCtx.startRendering();

  // SoundTouch PitchShifter: tempo=rate (faster playback), pitch=1 (unchanged pitch)
  const outputSamples = Math.max(1, Math.ceil(clipDuration * targetSampleRate));
  const stretchCtx = new OfflineAudioContext(numChannels, outputSamples, targetSampleRate);
  const shifter = new PitchShifter(stretchCtx, resampledBuffer, 4096);
  shifter.tempo = rate;
  shifter.pitch = 1;
  shifter.connect(stretchCtx.destination);
  return stretchCtx.startRendering();
}

export async function renderRetimedBuffer({
  audioContext, sourceBuffer, trimStart, clipDuration, retime, maintainPitch = false,
}): Promise<AudioBuffer> {
  const targetSampleRate = audioContext.sampleRate;
  const rate = clampRetimeRate({ rate: retime?.rate ?? 1 });
  const usePitchPreservation =
    shouldMaintainPitch({ rate, maintainPitch }) && Math.abs(rate - 1) > RATE_EPSILON;

  if (usePitchPreservation) {
    return buildPitchPreservedBuffer({
      sourceBuffer, trimStart, clipDuration, rate, targetSampleRate,
    });
  }
  return buildResampledBuffer({
    audioContext, sourceBuffer, trimStart, clipDuration, targetSampleRate, retime,
  });
}
```

**Key design points:**
- Two paths: linear resample (fast, pitch shifts with tempo) vs. SoundTouch PitchShifter (preserves pitch).
- Path B does **two-pass offline rendering**: (1) resample native → targetSampleRate via `OfflineAudioContext.startRendering()`, (2) stretch via SoundTouch `PitchShifter` with `tempo=rate`, `pitch=1`.
- `RATE_EPSILON = 1e-6` skips pitch preservation for rates very close to 1.0 (no-op).
- Pitch preservation requires `rate > 0` (reverse not supported, `canMaintainPitch`).

**Algorithm:**
```
newDuration = sourceDuration / Math.abs(speed)
element.duration = newDuration
element.retime = { rate: speed, maintainPitch }
// For audio: renderRetimedBuffer() pre-renders to AudioBuffer at load time
// For video: decode frames in appropriate order (reverse = decode backward)
```

### 5.13 Freeze Frame

**Description:** Insert a still frame at a position, extending the element.

**FreeCut reference (`stores/actions/edit/freeze-frame-actions.ts:22-253`):**

**Algorithm (async, with mediabunny frame extraction):**
1. Validate: item is video, playhead inside item bounds, not in transition overlap.
2. Calculate source frame at playhead: `sourceFrame = sourceStart + timelineToSourceFrames(timelineOffset, speed, fps, sourceFps)`.
3. Get media file blob; use `mediabunny` `Input` + `BlobSource` + `CanvasSink` to extract the frame at `timestampSeconds = sourceFrame / mediaFps`.
4. Convert canvas → PNG blob → File.
5. Persist via `mediaLibraryService.importGeneratedImage(file, currentProjectId, { width, height, tags: ['freeze-frame'], codec: 'png' })` — handles OPFS write, thumbnail generation, metadata persist, project association, and rollback if any step fails.
6. Acquire blob URL via `blobUrlManager.acquire(frameMediaId, frameBlob)`.
7. Atomic timeline mutation in `execute('INSERT_FREEZE_FRAME', ...)`:
   - Split the video at playhead via `_splitItem`.
   - Remap transitions pointing to the original item to point to the right half.
   - Build `ImageItem` with `freezeDurationFrames = Math.round(fps * 2)` (2 seconds default).
   - Add via `_addItem`.
   - Shift the right half forward by `freezeDurationFrames`.
   - Shift all other items on the same track that come after the playhead by `freezeDurationFrames`.
   - Repair transitions; select freeze frame.
8. On failure: rollback the persisted media via `mediaLibraryService.deleteMediaFromProject(currentProjectId, frameMediaId)` + `blobUrlManager.release(frameMediaId)`.
9. On success: prepend media metadata to UI store.

**Edge cases:**
- Playhead at item boundary: rejected (`playheadFrame <= itemStart || playheadFrame >= itemEnd`).
- Inside transition overlap: blocked (`isInTransitionOverlap`).
- Media not found: rejected.
- Frame extraction failure: rejected + logged.
- Project context missing: rejected.

### 5.14 Range Removal

**Description:** Remove a time range across all tracks (or selected tracks). Useful for cutting out a section across multiple tracks simultaneously, including silence/filler-word/transcript-range removal.

**FreeCut references:**
- `stores/actions/edit/range-removal-actions.ts:60-354` — `applyRippleRemoval`, `removeSilenceFromItems`, `removeFillerWordsFromItems`, `removeTranscriptRangesFromItems`.

**FreeCut range-removal algorithm (`range-removal-actions.ts:60-176`, `applyRippleRemoval`):**

```ts
function applyRippleRemoval(ids: string[]): { removedIds: string[]; affectedIds: string[] } {
  const items = useItemsStore.getState().items;
  const linkedSelectionEnabled = isLinkedSelectionEnabled();
  const expandedIds = expandIdsWithLinkedItems(items, ids, linkedSelectionEnabled);
  if (expandedIds.length === 0) return { removedIds: [], affectedIds: [] };

  const idsToDelete = new Set(expandedIds);
  const remainingItems = items.filter((item) => !idsToDelete.has(item.id));

  // For each remaining item, compute shift = sum of deleted-item durations ending at/before this item
  // (on the same track only).
  const baseShiftByItemId = new Map<string, number>();
  const editedTrackIds = new Set(
    items.filter((item) => idsToDelete.has(item.id)).map((item) => item.trackId),
  );
  const removedIntervals = items
    .filter((item) => idsToDelete.has(item.id))
    .map((item) => ({ start: item.from, end: item.from + item.durationInFrames }));

  for (const item of remainingItems) {
    const shiftAmount = items
      .filter((candidate) => idsToDelete.has(candidate.id))
      .filter(
        (deletedItem) =>
          deletedItem.trackId === item.trackId &&
          deletedItem.from + deletedItem.durationInFrames <= item.from,
      )
      .reduce((sum, deletedItem) => sum + deletedItem.durationInFrames, 0);
    if (shiftAmount > 0) baseShiftByItemId.set(item.id, shiftAmount);
  }

  // Expand shift to linked companions (unless they're on sync-locked tracks —
  // those are handled separately by propagateRemovedIntervalsToSyncLockedTracks).
  const shiftByItemId = new Map<string, number>();
  for (const [itemId, shiftAmount] of baseShiftByItemId) {
    if (shiftAmount <= 0) continue;
    const relatedIds = expandIdsWithLinkedItems(remainingItems, [itemId], linkedSelectionEnabled);
    for (const relatedId of relatedIds) {
      const relatedItem = itemById.get(relatedId);
      if (!relatedItem) continue;
      const handledBySyncLock =
        !editedTrackIds.has(relatedItem.trackId) &&
        isTrackSyncLockEnabled(trackById.get(relatedItem.trackId));
      if (handledBySyncLock) continue;   // sync-locked tracks get their own ripple via propagateRemovedIntervalsToSyncLockedTracks
      shiftByItemId.set(relatedId, Math.max(shiftByItemId.get(relatedId) ?? 0, shiftAmount));
    }
  }

  // Detect collisions: if a shifted item would land on top of another remaining item,
  // remove the covered item too (cascade).
  const updates = remainingItems.flatMap((item) => {
    const shiftAmount = shiftByItemId.get(item.id) ?? 0;
    return shiftAmount > 0 ? [{ id: item.id, from: item.from - shiftAmount }] : [];
  });
  // ... collision detection + cascade removal ...

  store._removeItems(allRemoveIds);
  if (filteredUpdates.length > 0) store._moveItems(filteredUpdates);

  // Sync-lock propagation: ripple the removed intervals to sync-locked tracks
  const syncLockResult = propagateRemovedIntervalsToSyncLockedTracks({
    editedTrackIds,
    intervals: removedIntervals,
  });
  // ... cascade transition + keyframe cleanup ...
}
```

**Algorithm (multi-step):**
1. Expand to linked items.
2. Compute per-item shift (sum of deleted durations ending at/before this item on same track).
3. Expand shift to linked companions on other tracks (unless sync-locked).
4. Detect collisions: if a shifted item would overlap another remaining item, mark the covered item for removal too (cascade).
5. Apply removals + shifts.
6. Propagate removed intervals to sync-locked tracks via `propagateRemovedIntervalsToSyncLockedTracks` (see §6).
7. Cascade transition + keyframe cleanup.

**Multi-track behavior:**
- Each track computes its own shift independently.
- Sync-locked tracks get interval-based ripple via `propagateRemovedIntervalsToSyncLockedTracks` (`sync-lock-ripple.ts:389-427`): for each sync-locked track, remove items fully inside the interval, split items straddling the interval boundaries, then shift everything right of the interval leftward by `intervalLength`.

### 5.15 Mute / Solo / Lock / Visibility

**OpenCut references:**
- `commands/timeline/track/toggle-track-mute.ts:6-41`
- `commands/timeline/track/toggle-track-visibility.ts:6-45`

**Mute (`toggle-track-mute.ts:13-33`):**

```ts
execute(): CommandResult | undefined {
  const editor = EditorCore.getInstance();
  this.savedState = editor.scenes.getActiveScene().tracks;

  const targetTrack = findTrackInSceneTracks({ tracks: this.savedState, trackId: this.trackId });
  if (!targetTrack) return;

  const updatedTracks = updateTrackInSceneTracks({
    tracks: this.savedState,
    trackId: this.trackId,
    update: (track) =>
      canTrackHaveAudio(track) ? { ...track, muted: !track.muted } : track,
  });

  editor.timeline.updateTracks(updatedTracks);
}
```

**Visibility (`toggle-track-visibility.ts:13-36`):** Identical pattern, but toggles `hidden` and uses `canTrackBeHidden(track)` guard.

**Solo semantics:** When any track is solo'd, only solo'd tracks play. Multiple tracks can be solo'd simultaneously. (OpenCut-classic does NOT implement solo — we must add it.)

**Lock semantics:** FreeCut uses `tracks[].locked` + `tracks[].syncLock !== false`. `isTrackSyncLockEnabled` returns `true` if `!track.locked && track.syncLock !== false` (`track-sync-lock.ts:5-11`). Locked tracks cannot be modified by any op — ops that would modify a locked track must skip the locked track (if multi-track op) or reject (if single-track op).

### 5.16 Snap

**FreeCut references:**
- `utils/timeline-snap-utils.ts:1-184` — `getFilteredItemSnapEdges`, `generateGridSnapPoints`, `findNearestSnapTarget`, `calculateAdaptiveSnapThreshold`
- `utils/razor-snap.ts:1-90` — `getRazorSplitPosition` (split tool snap)

**OpenCut-classic references:**
- `timeline/snapping/{build,resolve,threshold,types,index}.ts`
- `timeline/group-move/snap.ts:1-100` — `snapGroupEdges` for multi-select moves
- `timeline/element-snap-source.ts`, `timeline/playhead-snap-source.ts`, `timeline/animation-snap-points.ts`

**FreeCut snap algorithm (`timeline-snap-utils.ts:134-155`):**

```ts
export function findNearestSnapTarget(
  targetFrame: number,
  snapTargets: SnapTarget[],
  thresholdFrames: number,
): SnapTarget | null {
  if (snapTargets.length === 0) return null;
  let nearestTarget: SnapTarget | null = null;
  let minDistance = thresholdFrames;
  for (const target of snapTargets) {
    const distance = Math.abs(targetFrame - target.frame);
    if (distance < minDistance) {
      nearestTarget = target;
      minDistance = distance;
    }
  }
  return nearestTarget;
}
```

**FreeCut item edge builder (`timeline-snap-utils.ts:29-87`):**

```ts
export function getFilteredItemSnapEdges(
  items: TimelineItem[],
  transitions: Transition[],
  visibleTrackIds: Set<string>,
  excludeItemIds?: string[],
  options: { includeTransitionMidpoints?: boolean } = {},
): ItemSnapEdge[] {
  const edges: ItemSnapEdge[] = [];
  const excludedIds = excludeItemIds ? new Set(excludeItemIds) : null;

  // Suppress: left clip end + right clip start of transitions (they overlap)
  // Add: transition midpoint as snap target
  const suppressEnd = new Set<string>();
  const suppressStart = new Set<string>();
  for (const t of transitions) {
    suppressEnd.add(t.leftClipId);
    suppressStart.add(t.rightClipId);

    if (includeTransitionMidpoints && /* ... visibility + exclusion checks ... */) {
      const midpoint = rightClip.from + Math.ceil(t.durationInFrames / 2);
      edges.push({ frame: midpoint, type: 'item-start', itemId: t.rightClipId });
    }
  }

  for (const item of items) {
    if (!visibleTrackIds.has(item.trackId)) continue;
    if (excludedIds?.has(item.id)) continue;
    if (!suppressStart.has(item.id)) {
      edges.push({ frame: item.from, type: 'item-start', itemId: item.id });
    }
    if (!suppressEnd.has(item.id)) {
      edges.push({ frame: item.from + item.durationInFrames, type: 'item-end', itemId: item.id });
    }
  }

  return edges;
}
```

**FreeCut adaptive threshold (`timeline-snap-utils.ts:168-184`):**

```ts
export function calculateAdaptiveSnapThreshold(
  zoomLevel: number,
  baseThresholdPixels: number,
  pixelsPerSecond: number,
  fps: number,
): number {
  // Higher zoom = tighter snap threshold (more precise)
  // Lower zoom = looser snap threshold (easier to snap)
  const thresholdPixels = baseThresholdPixels / Math.sqrt(zoomLevel);
  const secondsPerPixel = 1 / pixelsPerSecond;
  const thresholdSeconds = thresholdPixels * secondsPerPixel;
  const thresholdFrames = Math.ceil(thresholdSeconds * fps);
  return Math.max(1, thresholdFrames);
}
```

**FreeCut razor snap (`razor-snap.ts:36-90`):**

```ts
export const RAZOR_PLAYHEAD_SNAP_THRESHOLD_PX = 10;
export const RAZOR_SNAP_THRESHOLD_PX = 12;

export function getRazorSplitPosition({
  cursorX, currentFrame, isPlaying, frameToPixels, pixelsToFrame,
  shiftHeld = false, snapTargets,
}): RazorSplitPositionResult {
  // Shift-held: snap to nearest of all snap targets within RAZOR_SNAP_THRESHOLD_PX
  if (shiftHeld && snapTargets && snapTargets.length > 0) {
    let nearestTarget: RazorSnapTarget | null = null;
    let nearestDistancePx = RAZOR_SNAP_THRESHOLD_PX;
    for (const target of snapTargets) {
      const targetX = frameToPixels(target.frame);
      const distancePx = Math.abs(cursorX - targetX);
      if (distancePx < nearestDistancePx) {
        nearestDistancePx = distancePx;
        nearestTarget = target;
      }
    }
    if (nearestTarget) {
      return { splitFrame: nearestTarget.frame, snappedX: frameToPixels(nearestTarget.frame),
               snappedToPlayhead: nearestTarget.type === 'playhead', snappedTarget: nearestTarget };
    }
  }

  // Default: only snap to playhead within RAZOR_PLAYHEAD_SNAP_THRESHOLD_PX (10px)
  const roundedPlayheadFrame = Math.round(currentFrame);
  const playheadX = frameToPixels(roundedPlayheadFrame);
  const shouldSnapToPlayhead =
    !isPlaying && Math.abs(cursorX - playheadX) <= RAZOR_PLAYHEAD_SNAP_THRESHOLD_PX;

  if (shouldSnapToPlayhead) {
    return { splitFrame: roundedPlayheadFrame, snappedX: playheadX, snappedToPlayhead: true };
  }

  // Free position: round to nearest frame
  const splitFrame = Math.round(pixelsToFrame(cursorX));
  return { splitFrame, snappedX: frameToPixels(splitFrame), snappedToPlayhead: false };
}
```

**OpenCut multi-select snap (`timeline/group-move/snap.ts:14-100`):**

`snapGroupEdges` snaps **any member's start OR end** to a snap point and adjusts the anchor accordingly. It builds snap points from three sources:
- `getElementEdgeSnapPoints({tracks, excludeElementIds})` — every other element's start/end.
- `getPlayheadSnapPoints({playheadTime})`.
- `getAnimationKeyframeSnapPointsForTimeline({tracks, excludeElementIds})`.

For each member, it tries both the start (`memberStartTime = anchorStartTime + member.timeOffset`) and end (`memberStartTime + member.duration`), finds the closest snap point within `maxSnapDistance`, and adjusts `snappedAnchorStartTime = snappedTime - member.timeOffset` accordingly.

---

## 6. Sync-Lock (Multi-Track Sync)

When one track is edited (e.g., ripple delete), should other tracks ripple too? In professional NLEs, this is "sync-lock" — tracks that are sync-locked ripple together.

**FreeCut sync-lock:**
- `utils/track-sync-lock.ts:5-17` — `isTrackSyncLockEnabled(track)` returns `true` if `!track.locked && track.syncLock !== false`.
- `stores/actions/sync-lock-ripple.ts:389-469` — `propagateRemovedIntervalsToSyncLockedTracks({editedTrackIds, intervals})` and `propagateInsertedGapToSyncLockedTracks({editedTrackIds, cutFrame, amount})`.

**FreeCut sync-lock ripple algorithm (`sync-lock-ripple.ts:298-469`):**

For each candidate sync-locked track (NOT in `editedTrackIds`):

**Removed intervals (`sync-lock-ripple.ts:298-362, 389-427`):**
1. Normalize & merge intervals.
2. For each interval, for each overlapping item on the sync-locked track:
   - If item fully inside interval: remove.
   - If item straddles interval: split at interval start AND end, remove the middle piece.
   - If item starts before interval: split at interval start, remove right half.
   - If item ends after interval: split at interval end, remove left half.
3. Shift all items with `from >= currentInterval.end` leftward by `intervalLength`.
4. Accumulate `removedFrames` so subsequent intervals in the same call are rebased.

**Inserted gap (`sync-lock-ripple.ts:429-469`):**
1. For each sync-locked track:
   - Find items straddling the cut frame.
   - Split them at the cut frame.
   - Shift all items with `from >= cutFrame` rightward by `amount`.

**Sync-lock candidate discovery (`sync-lock-ripple.ts:55-79`):**

```ts
function getCandidateTrackIdsFromState(items, tracks, editedTrackIds): string[] {
  const trackIds = new Set<string>();
  for (const track of tracks) {
    if (!editedTrackIds.has(track.id) && isTrackSyncLockEnabled(track)) {
      trackIds.add(track.id);
    }
  }
  for (const item of items) {
    if (editedTrackIds.has(item.trackId)) continue;
    if (trackIds.has(item.trackId)) continue;
    const track = tracks.find((candidate) => candidate.id === item.trackId);
    if (isTrackSyncLockEnabled(track)) {
      trackIds.add(item.trackId);
    }
  }
  return [...trackIds];
}
```

**OpenCut-classic sync-lock:** ❌ NOT IMPLEMENTED — port from FreeCut. The `ripple/` module is per-track (no sync-lock concept); we'd extend `computeRippleAdjustments` to optionally propagate across sync-locked tracks.

---

## 7. Command Composition

Many user actions compose multiple ops:

| User action | Ops | Composition pattern |
|---|---|---|
| Razor click | `split(time, trackIds)` | Single `SplitElementsCommand` (handles multi-element internally) |
| Drag clip | `move(elementIds, delta, targetTrackId?)` | `previewElements({updates})` → `commitPreview()` (single `TracksSnapshotCommand`) |
| Trim clip right edge | `trim(elementId, 'end', delta)` | `previewElements({updates})` → `commitPreview()` OR single `OpCommand` |
| Ripple delete | `delete(elementIds)` with `isRippleEnabled = true` | Single `DeleteElementsCommand`; `CommandManager.applyRippleIfEnabled` does the ripple |
| Paste | `insert(mediaId, trackId, time)` × N | `BatchCommand([InsertElementCommand, ...])` |
| Cut | `copy(elementIds)` + `delete(elementIds)` | `delete(elementIds)` only (clipboard is separate) |
| Ripple trim | `trim(elementId, edge, delta)` with `isRippleEnabled = true` | Single `OpCommand`; `CommandManager.applyRippleIfEnabled` does the ripple |
| Roll | trim left end + trim right start | `BatchCommand([trimLeft, trimRight])` OR single `TracksSnapshotCommand` |
| Slide | move slid clip + trim left neighbor + trim right neighbor | `BatchCommand([trimLeft, trimRight, move])` OR single `TracksSnapshotCommand` |
| Freeze frame | split + insert image + shift right half + shift downstream | `BatchCommand([split, insert, moveRight, moveDownstream, ...])` |
| Range removal | N splits + delete middle + shift remaining | `BatchCommand([splits..., delete, shift, ...])` |
| Reset speed with ripple | N rate-stretches + downstream shift | `BatchCommand([rateStretches..., moves...])` |

Each user action is wrapped in a single `Command` (via `BatchCommand` for multi-step, or `TracksSnapshotCommand` for drag-coalesced) so undo undoes the whole action.

---

## 8. Invariant Tests

Property-based tests verify invariants hold after random op sequences:

```ts
import { test, expect } from 'vitest';
import fc from 'fast-check';

test('no overlapping elements after any op', () => {
  fc.assert(fc.property(
    arbitrarySceneState(),
    arbitraryOp(),
    (state, op) => {
      const newState = op.execute(state);
      for (const track of newState.scene.tracks) {
        for (let i = 0; i < track.elements.length - 1; i++) {
          const a = getElement(track.elements[i]);
          const b = getElement(track.elements[i + 1]);
          expect(mediaTimeAdd(a.startTime, a.duration)).toBeLessThanOrEqual(b.startTime);
        }
      }
    }
  ));
});

test('no negative durations', () => { /* ... */ });
test('source bounds respected', () => { /* ... */ });
test('locked tracks not modified', () => { /* ... */ });
test('undo restores exact state', () => { /* ... */ });
test('snap-once preserves trimStart + duration*rate + trimEnd == sourceDuration', () => {
  // Per compute-resize.ts:81-103 comment
});
```

---

## 9. Open Questions — ANSWERED

### Q1. FreeCut `stores/actions/edit/split-actions.ts` — full split algorithm

**Answered in §5.1 above.** Key findings:
- `split-actions.ts` is the action wrapper, NOT the algorithm. Algorithm is in `stores/items-store.ts:485-629` (`_splitItem`).
- The split keeps the original ID on the **left** half (minimal disruption) and generates a new UUID for the right half.
- Source bounds for media items are computed via `calculateSplitSourceBoundaries(sourceStart, leftDuration, rightDuration, speed, timelineFps, effectiveSourceFps)` from `utils/source-calculations.ts`.
- Reversed playback: source range is inverted (`items-store.ts:572-601`).
- Subtitle cues are partitioned at the split point (`items-store.ts:525-556`).
- Bookkeeping: transitions are remapped to point to the right half (`split-bookkeeping.ts:14-35`); linked groups are split into new left/right `linkedGroupId` pairs (`split-bookkeeping.ts:37-51`).

### Q2. FreeCut trim-actions + trim-utils + trim-edit-constraints

**Answered in §5.2 above.** Key findings:
- Trim clamping composes three layers: source bounds (`clampTrimAmount:55-118`), adjacent overlap (`clampToAdjacentItems:129-178`), and min duration (`clampToMinDuration:183-202`).
- `applySynchronizedTrim` (`trim-actions.ts:180-251`) applies the **tightest** delta across all linked companions, then runs each with `skipAdjacentClamp: true` (the clamp was already computed centrally).
- `clampRippleTrimDeltaToPreserveEditState` and `clampRollingTrimDeltaToPreserveEditState` (`trim-edit-constraints.ts:126-213`) use **binary search** (`clampDeltaToLastValidValue:18-34`) to find the largest delta that doesn't break transitions or evict keyframes.
- Reversed playback has different source-extent math (`trim-utils.ts:72-83, 89-110`).
- Composition wrappers read live sub-comp duration (`trim-utils.ts:24-36` — `getEffectiveSourceDuration`).

### Q3. FreeCut move-actions

**Answered in §5.3 above.** ❌ NOT FOUND — there is no `stores/actions/edit/move-actions.ts` in FreeCut. Move logic lives in:
- `hooks/use-timeline-drag.ts` (drag gesture handling)
- `stores/items-store.ts` (`_moveItem`, `_moveItems` primitives)
- `stores/actions/item-actions.ts` (high-level move action)
- `stores/actions/item-placement.ts` (placement logic for new items)

For multi-select move architecture, **OpenCut-classic's `group-move/` is the canonical reference** (`build-group.ts:7-91`, `resolve-move.ts:34-497`, `snap.ts:14-100`).

### Q4. FreeCut sync-lock-ripple + track-sync-lock

**Answered in §6 above.** Key findings:
- `track-sync-lock.ts` is only 17 LOC: `isTrackSyncLockEnabled(track)` returns `!track.locked && track.syncLock !== false`.
- `sync-lock-ripple.ts` (469 LOC) has TWO entry points: `propagateRemovedIntervalsToSyncLockedTracks` (delete-style ripple) and `propagateInsertedGapToSyncLockedTracks` (insert-style ripple).
- Both work by splitting items that straddle the interval boundaries, removing fully-contained items, then shifting the rest.
- Sync-locked tracks are discovered via `getCandidateTrackIdsFromState` which excludes tracks in `editedTrackIds`.

### Q5. FreeCut rolling-edit

**Answered in §5.5 above.** Key findings:
- The actual file path is `features/preview/components/rolling-edit-overlay.tsx` (NOT `features/timeline/preview/components/rolling-edit-overlay.tsx` as the seed spec claimed).
- There is no `rolling-edit-utils.ts` — it's `rolling-edit-overlay-utils.ts` (32 LOC).
- The roll algorithm's key insight: **shrink first, then extend**. By shrinking the losing clip first, we free up space for the gaining clip to extend into (the `_trimItemEnd`/`_trimItemStart` primitives have `clampToAdjacentItems` guards that prevent extending into a neighbor).
- The roll preview store carries `neighborDelta` (not `editPointDelta`) because the delta is symmetric but applied to the neighbor.
- The overlay is a 2-up `EditTwoUpPanels` showing OUT (left clip's new last frame) and IN (right clip's new first frame).

### Q6. FreeCut slip-edit

**Answered in §5.6 above.** Key findings:
- `slip-utils.ts` is 33 LOC; just `computeClampedSlipDelta` which clamps `sourceStart + delta >= 0` and `sourceEnd + delta <= sourceDuration`.
- Slip returns no-op if `sourceEnd` is undefined (no explicit source bounds — `slip-utils.ts:18`).
- The overlay is a 4-up `EditFourUpPanels`: center-left = new IN, center-right = new OUT, top-left = baseline IN, top-right = baseline OUT. Uses a "virtual item" with shifted source bounds so `getSourceFrameInfo` seeks correctly.
- Slip propagates to linked companions with the same clamped delta.

### Q7. FreeCut slide-edit

**Answered in §5.7 above.** Key findings:
- `slide-utils.ts` is 42 LOC; only `computeSlideContinuitySourceDelta` (NOT the slide algorithm itself). The algorithm is in `trim-actions.ts:651-878` (`slideItem`).
- `computeSlideContinuitySourceDelta` returns 0 unless ALL of: left+right neighbors exist, all three form a split-contiguous chain (joinable pairs), slid item is media with explicit sourceEnd.
- The slide preview store carries `minDelta` and `maxDelta` (combined track constraints) so the UI can show a constrained cursor at the limits.
- The overlay is a 4-up: center-left = left neighbor's new OUT, center-right = right neighbor's new IN. If no neighbor on a side, shows "GAP" placeholder.
- Slide also has keyframe preservation via `clampSlideDeltaToPreserveKeyframes` (in `utils/slide-keyframe-constraints.ts`, not quoted in detail here).

### Q8. FreeCut rate-stretch-actions + use-rate-stretch

**Answered in §5.11 above.** Key findings:
- `rate-stretch-actions.ts` has 3 exports: `rateStretchItemWithoutHistory` (the algorithm), `rateStretchItem` (wraps in `execute('RATE_STRETCH_ITEM', ...)`), `resetSpeedWithRipple` (multi-item reset to 1x with downstream ripple).
- Speed range: 0.1x to 16x (defined in `utils/source-calculations.ts:17-18` as `MIN_SPEED`, `MAX_SPEED`; imported into `hooks/use-rate-stretch.ts`; OpenCut has different bounds: 0.01 to 5, `retime/rate.ts:2-3`).
- Looping media (GIFs): duration is independent of source; only speed changes. Min duration at MAX_SPEED, max duration = 10 minutes (`use-rate-stretch.ts:32` — `LOOPING_MEDIA_MAX_DURATION`).
- `resolveDurationAndSpeed` (`use-rate-stretch.ts:207-246`) does iterative normalization to keep `trimStart + duration*rate + trimEnd == sourceDuration` exact after rounding (5 iterations max).
- Rate stretch scales keyframes proportionally to match new duration (`rate-stretch-actions.ts:54-64`).

### Q9. FreeCut freeze-frame + range-removal

**Answered in §5.13 and §5.14 above.** Key findings:
- Freeze frame uses `mediabunny` (`Input` + `BlobSource` + `CanvasSink`) to extract the still frame at native resolution, then persists as a PNG via `mediaLibraryService.importGeneratedImage`.
- Default freeze duration is 2 seconds (`freeze-frame-actions.ts:151` — `Math.round(fps * 2)`).
- Range removal has three variants: `removeSilenceFromItems`, `removeFillerWordsFromItems`, `removeTranscriptRangesFromItems` — all funnel into `removeTimelineRangesFromItems` (`range-removal-actions.ts:205-354`).
- Silence coverage threshold = 0.75 (`range-removal-actions.ts:42` — `SILENCE_COVERAGE_REMOVAL_THRESHOLD`): a post-split segment is removed only if ≥75% of its source-time span is covered by detected silence.

### Q10. FreeCut snap-utils + razor-snap

**Answered in §5.16 above.** Key findings:
- Three snap point sources: item edges (with transition midpoint), grid (1s/5s/10s depending on zoom), playhead.
- Transition inner edges are suppressed (left clip's end and right clip's start when they overlap in a transition); the transition midpoint is added instead.
- Adaptive threshold: `thresholdPixels = baseThresholdPixels / sqrt(zoomLevel)` — higher zoom = tighter snap.
- Razor snap has two modes: default (snap to playhead within 10px) and shift-held (snap to nearest of all snap targets within 12px).

### Q11. OpenCut-classic `apps/web/src/lib/ripple/` — full quote

**❌ NOT FOUND at that path.** Real path: `apps/web/src/ripple/{diff,apply,shift,index}.ts`. Full quote in §12 below.

### Q12. OpenCut-classic `apps/web/src/timeline/placement/`

**Answered in §5.3 and §5.9 above.** Files read:
- `placement/resolve.ts` (278 LOC) — `resolveTrackPlacement` with 5 strategies.
- `placement/overlap.ts` (44 LOC) — `canPlaceTimeSpansOnTrack`, `wouldElementOverlap`.
- `placement/compatibility.ts` (51 LOC) — `ELEMENT_TRACK_MAP`, `canElementGoOnTrack`, `validateElementTrackCompatibility`.
- `placement/insert-index.ts` (88 LOC) — `getDefaultInsertIndexForTrack`, `getHighestInsertIndexForTrack`, `resolvePreferredNewTrackPlacement`.
- `placement/apply.ts` (158 LOC) — `applyPlacement` (existing track vs. new track splicing).
- `placement/types.ts` (40 LOC) — `PlacementStrategy`, `PlacementResult`, `PlacementTimeSpan`, `PlacementSubject`.
- `placement/index.ts` (12 LOC) — re-exports.
- `placement/main-track.ts` (55 LOC) — `enforceMainTrackStart`, `getEarliestMainTrackElement`, `MAIN_TRACK_NAME = "Main Track"`.
- `placement/track-factory.ts` (123 LOC) — `buildEmptyTrack({id, type})`.

### Q13. OpenCut-classic `group-move/` and `group-resize/`

**Answered in §5.3 (move) and §5.2 (resize) above.** Files read:
- `group-move/{build-group,resolve-move,snap,track-placement,types,index}.ts` — multi-select move with anchor + member pattern, snap-on-any-edge, cross-section move rejection, new-track creation.
- `group-resize/{compute-resize,types,index}.ts` — snap-once rounding invariant, multi-member tightest bound, source-duration ceiling, neighbor-bound ceiling, retimed source-delta computation.

### Q14. OpenCut-classic `apps/web/src/retime/`

**Answered in §5.11 and §5.12 above.** Files read:
- `retime/rate.ts` (25 LOC) — `clampRetimeRate`, `canMaintainPitch`, `shouldMaintainPitch`. Rate bounds: 0.01 to 5.
- `retime/resolve.ts` (48 LOC) — `getSourceTimeAtClipTime`, `getClipTimeAtSourceTime`, `getEffectiveRateAt`, `getTimelineDurationForSourceSpan`.
- `retime/split.ts` (34 LOC) — `splitRetimeAtClipTime`, `adjustRetimeForTrimChange` (both currently no-ops returning the same retime — variable retime not yet implemented).
- `retime/audio-stretch.ts` (182 LOC) — `renderRetimedBuffer` with two paths: linear resample (pitch shifts) vs. SoundTouch `PitchShifter` (pitch preserved). OfflineAudioContext two-pass for pitch preservation.
- `retime/presets.ts` (12 LOC) — only `buildConstantRetime({rate, maintainPitch})`. **No preset speed tables.**
- `retime/index.ts` (5 LOC) — re-exports.

### Q15. OpenCut-classic `apps/web/src/commands/timeline/element/`

**Answered in §4 and §5 above.** Files read:
- `commands/timeline/element/split-elements.ts` (214 LOC) — `SplitElementsCommand` with `retainSide: "both" | "left" | "right"`, snap-once source span.
- `commands/timeline/element/move-elements.ts` (183 LOC) — `MoveElementCommand` with `moves: PlannedElementMove[]` + `createTracks: PlannedTrackCreation[]`.
- `commands/timeline/element/delete-elements.ts` (72 LOC) — `DeleteElementsCommand` with filter-and-clear selection.
- `commands/timeline/element/insert-element.ts` (297 LOC) — `InsertElementCommand` with placement strategies + first-element canvas/fps auto-set.
- `commands/timeline/element/duplicate-elements.ts` (135 LOC) — `DuplicateElementsCommand` with `alwaysNew` placement + cloned animations.
- `commands/timeline/element/update-elements.ts` (75 LOC) — `UpdateElementsCommand` with `applyElementUpdate` pipeline (used by trim/patch operations).
- `commands/timeline/track/toggle-track-mute.ts` (41 LOC) — `ToggleTrackMuteCommand`.
- `commands/timeline/track/toggle-track-visibility.ts` (45 LOC) — `ToggleTrackVisibilityCommand`.

**Command pattern summary:** All commands extend `Command` (no `id`/`label`/`coalesceKey`). Each captures `savedState: SceneTracks | null` on first `execute()`, mutates via `editor.timeline.updateTracks(newTracks)`, swaps back in `undo()`. `redo()` defaults to `execute()`. For drag coalescing, use `previewElements` → `commitPreview` → `TracksSnapshotCommand` at the manager layer.

---

## 10. Code References (SCOUT-06)

### OpenCut-classic — `/tmp/opencut-classic/`

| File (relative to repo root) | LOC | Summary |
|---|---|---|
| `apps/web/src/ripple/shift.ts` | 17 | `rippleShiftElements({elements, afterTime, shiftAmount})` — pure map, shifts elements with `startTime >= afterTime` |
| `apps/web/src/ripple/apply.ts` | 77 | `applyRippleAdjustments({tracks, adjustments})` — groups by track, sorts by `afterTime` desc, applies shifts |
| `apps/web/src/ripple/diff.ts` | 279 | `computeRippleAdjustments({beforeTracks, afterTracks})` — interval-arithmetic diff (vacated/joined/freed) |
| `apps/web/src/ripple/index.ts` | 4 | Re-exports |
| `apps/web/src/retime/rate.ts` | 25 | Rate clamping (0.01–5.0), `canMaintainPitch`, `shouldMaintainPitch` |
| `apps/web/src/retime/resolve.ts` | 48 | Source↔clip time conversion: `getSourceTimeAtClipTime`, `getClipTimeAtSourceTime`, `getTimelineDurationForSourceSpan` |
| `apps/web/src/retime/split.ts` | 34 | `splitRetimeAtClipTime` (currently no-op), `adjustRetimeForTrimChange` (currently no-op) |
| `apps/web/src/retime/audio-stretch.ts` | 182 | `renderRetimedBuffer` — linear resample vs. SoundTouch `PitchShifter` (tempo=rate, pitch=1) |
| `apps/web/src/retime/presets.ts` | 12 | `buildConstantRetime({rate, maintainPitch})` — only preset factory |
| `apps/web/src/retime/index.ts` | 5 | Re-exports |
| `apps/web/src/commands/base-command.ts` | 31 | `abstract class Command` — `execute()` parameterless, `undo()` throws, `redo()=execute()` |
| `apps/web/src/commands/batch-command.ts` | 39 | `BatchCommand extends Command` — wraps array, undo reverse, redo forward |
| `apps/web/src/commands/timeline/tracks-snapshot.ts` | 29 | `TracksSnapshotCommand` — coalescing primitive (`before`/`after` swap) |
| `apps/web/src/core/managers/commands.ts` | 154 | `CommandManager` — `execute`/`push`/`undo`/`redo`/`applyRippleIfEnabled`/reactor pattern |
| `apps/web/src/commands/timeline/element/split-elements.ts` | 214 | `SplitElementsCommand` — `retainSide`, snap-once source span |
| `apps/web/src/commands/timeline/element/move-elements.ts` | 183 | `MoveElementCommand` — `PlannedElementMove[]` + `PlannedTrackCreation[]` |
| `apps/web/src/commands/timeline/element/delete-elements.ts` | 72 | `DeleteElementsCommand` — filter + clear selection |
| `apps/web/src/commands/timeline/element/insert-element.ts` | 297 | `InsertElementCommand` — placement + first-element canvas/fps auto-set |
| `apps/web/src/commands/timeline/element/duplicate-elements.ts` | 135 | `DuplicateElementsCommand` — `alwaysNew` placement + cloned animations |
| `apps/web/src/commands/timeline/element/update-elements.ts` | 75 | `UpdateElementsCommand` — patch pipeline (used by trim/property edits) |
| `apps/web/src/commands/timeline/track/toggle-track-mute.ts` | 41 | `ToggleTrackMuteCommand` |
| `apps/web/src/commands/timeline/track/toggle-track-visibility.ts` | 45 | `ToggleTrackVisibilityCommand` |
| `apps/web/src/timeline/placement/resolve.ts` | 278 | `resolveTrackPlacement` — 5 strategies (explicit, firstAvailable, preferIndex, aboveSource, alwaysNew) |
| `apps/web/src/timeline/placement/overlap.ts` | 44 | `canPlaceTimeSpansOnTrack`, `wouldElementOverlap` |
| `apps/web/src/timeline/placement/compatibility.ts` | 51 | `ELEMENT_TRACK_MAP`, `canElementGoOnTrack`, `validateElementTrackCompatibility` |
| `apps/web/src/timeline/placement/insert-index.ts` | 88 | `getDefaultInsertIndexForTrack`, `getHighestInsertIndexForTrack`, `resolvePreferredNewTrackPlacement` |
| `apps/web/src/timeline/placement/apply.ts` | 158 | `applyPlacement` — existing-track splice vs. new-track insertion |
| `apps/web/src/timeline/placement/types.ts` | 40 | `PlacementStrategy`, `PlacementResult`, `PlacementTimeSpan`, `PlacementSubject` |
| `apps/web/src/timeline/placement/index.ts` | 12 | Re-exports |
| `apps/web/src/timeline/placement/main-track.ts` | 55 | `enforceMainTrackStart`, `getEarliestMainTrackElement`, `MAIN_TRACK_NAME` |
| `apps/web/src/timeline/placement/track-factory.ts` | 123 | `buildEmptyTrack({id, type})` |
| `apps/web/src/timeline/group-move/build-group.ts` | 91 | `buildMoveGroup({anchorRef, selectedElements, tracks})` |
| `apps/web/src/timeline/group-move/resolve-move.ts` | 497 | `resolveGroupMove` — existing-track + new-track paths, `clampAnchorStartTime`, `canApplyMovesToExistingTracks` |
| `apps/web/src/timeline/group-move/snap.ts` | 100 | `snapGroupEdges` — multi-member start/end snap |
| `apps/web/src/timeline/group-move/track-placement.ts` | 83 | `getDisplayTracks`, `getTrackPlacementById`, `getTrackPlacementByDisplayIndex` |
| `apps/web/src/timeline/group-move/types.ts` | 37 | `GroupMember`, `MoveGroup`, `PlannedElementMove`, `PlannedTrackCreation`, `GroupMoveResult` |
| `apps/web/src/timeline/group-move/index.ts` | 12 | Re-exports |
| `apps/web/src/timeline/group-resize/compute-resize.ts` | 319 | `computeGroupResize` — snap-once invariant, tightest bound, retimed source delta |
| `apps/web/src/timeline/group-resize/types.ts` | 37 | `GroupResizeMember`, `GroupResizeUpdate`, `GroupResizeResult`, `ResizeSide` |
| `apps/web/src/timeline/group-resize/index.ts` | 9 | Re-exports |
| `apps/web/src/core/managers/timeline-manager.ts` (lines 702-760) | (excerpt) | `previewElements`/`commitPreview`/`discardPreview`/`getPreviewTracks` — coalescing API |

### FreeCut — `/tmp/freecut/`

| File (relative to repo root) | LOC | Summary |
|---|---|---|
| `src/features/timeline/stores/actions/edit/split-actions.ts` | 245 | `splitItem`, `splitAllItemsAtFrame`, `splitItemAtFrames` — action wrappers with linked-edit expansion |
| `src/features/timeline/stores/actions/split-bookkeeping.ts` | 60 | `applySplitBookkeeping` — transition remap + linked-segment relink |
| `src/features/timeline/stores/items-store.ts` (lines 485-629) | (excerpt) | `_splitItem(id, splitFrame)` — the actual split algorithm |
| `src/features/timeline/stores/actions/edit/trim-actions.ts` | 878 | `trimItemStart/End`, `rippleTrimItem`, `rollingTrimItems`, `slipItem`, `slideItem` — all edit ops |
| `src/features/timeline/utils/trim-utils.ts` | 274 | `clampTrimAmount`, `clampToAdjacentItems`, `clampToMinDuration`, `calculateTrimSourceUpdate` |
| `src/features/timeline/utils/trim-edit-constraints.ts` | 213 | `clampRollingTrimDeltaToPreserveEditState`, `clampRippleTrimDeltaToPreserveEditState` (binary search) |
| `src/features/timeline/components/timeline-item/trim-handles.tsx` | 267 | `TrimHandles` React component — edge halos for trim/ripple/roll/slip/slide/stretch |
| `src/features/timeline/stores/actions/edit/rate-stretch-actions.ts` | 393 | `rateStretchItem`, `rateStretchItemWithoutHistory`, `resetSpeedWithRipple` |
| `src/features/timeline/hooks/use-rate-stretch.ts` | 772 | `useRateStretch` hook + `getDurationLimits`, `getClampedSpeed`, `resolveDurationAndSpeed` (snap-once) |
| `src/features/timeline/stores/actions/sync-lock-ripple.ts` | 469 | `propagateRemovedIntervalsToSyncLockedTracks`, `propagateInsertedGapToSyncLockedTracks`, interval arithmetic |
| `src/features/timeline/utils/track-sync-lock.ts` | 17 | `isTrackSyncLockEnabled`, `isTrackSyncLockActive` |
| `src/features/timeline/stores/rolling-edit-preview-store.ts` | 48 | `useRollingEditPreviewStore` — preview state for roll edits |
| `src/features/preview/components/rolling-edit-overlay.tsx` | 58 | `RollingEditOverlay` — 2-up panel UI for roll edits |
| `src/features/preview/components/rolling-edit-overlay-utils.ts` | 32 | `getRollingEditPanelFrames` — left/right panel frame calc |
| `src/features/timeline/stores/slip-edit-preview-store.ts` | 33 | `useSlipEditPreviewStore` — preview state for slip edits |
| `src/features/preview/components/slip-edit-overlay.tsx` | 87 | `SlipEditOverlay` — 4-up panel UI for slip edits |
| `src/features/timeline/utils/slip-utils.ts` | 33 | `computeClampedSlipDelta` — source-bound clamp for slip |
| `src/features/timeline/hooks/use-timeline-slip-slide.ts` | 1291 | `useTimelineSlipSlide` hook — slip+slide gesture handling |
| `src/features/timeline/stores/slide-edit-preview-store.ts` | 57 | `useSlideEditPreviewStore` — preview state with min/max delta for slide |
| `src/features/preview/components/slide-edit-overlay.tsx` | 128 | `SlideEditOverlay` — 4-up panel UI for slide edits |
| `src/features/timeline/utils/slide-utils.ts` | 42 | `computeSlideContinuitySourceDelta` — split-chain continuity |
| `src/features/timeline/stores/actions/edit/freeze-frame-actions.ts` | 253 | `insertFreezeFrame` — async, mediabunny frame extraction + atomic insert |
| `src/features/timeline/stores/actions/edit/range-removal-actions.ts` | 354 | `applyRippleRemoval`, `removeSilenceFromItems`, `removeFillerWordsFromItems`, `removeTranscriptRangesFromItems` |
| `src/features/timeline/utils/timeline-snap-utils.ts` | 184 | `getFilteredItemSnapEdges`, `generateGridSnapPoints`, `findNearestSnapTarget`, `calculateAdaptiveSnapThreshold` |
| `src/features/timeline/utils/razor-snap.ts` | 90 | `getRazorSplitPosition` — razor tool snap (playhead + shift-snap) |
| `src/features/timeline/stores/commands/types.ts` | 53 | `TimelineSnapshot`, `TimelineCommand` (`{type, payload}`), `CommandEntry` |
| `src/features/timeline/stores/timeline-command-store.ts` | 286 | `useTimelineCommandStore` — snapshot-based undo/redo with per-context stacks |

### 10.4. nle-engine op-coverage (reference, NOT canon — Round-8 re-baseline @ `8ac91d9`)

> nle-engine (github.com/bearachprema/nle-engine) implements ~20 of this spec's op families as public methods on its `Timeline` class (timeline/timeline.ts, now 6,794 LOC, 102 public methods) with **144 passing tests (reported)** after Waves 4A-4D-A — the strongest ALIGNED subsystem in the reference repo. The deltas are architectural (class-based mutating manager vs this spec's pure-op + command layer; flat N-track array vs `SceneTracks`; 19-op JSON-RPC wire surface vs spec 15's 78-type union) plus three absent families (track-state toggles, snap, splitAndRemove). Where engine code conflicts, **the spec wins**; see `19-code-references.md`. Per Decision 11.3, the engine is the **executable home of the FreeCut-side op families** (roll/slip/slide/rateStretch/retime/insert-edit-3-point/sync-lock) that opencut-timeline (§10.5) lacks.

| Spec 06 op (§) | nle-engine timeline.ts:line | verified signature | status |
|---|---|---|---|
| §5.1 Split | :2461 | `splitClip(` | ALIGNED |
| §5.1 Split-all | :2648 | `splitAllItemsAtFrame(frame: number, options: { linked?: boolean } = {}): number {` | ALIGNED |
| §5.2 Trim head | :2709 | `trimHead(` | ALIGNED |
| §5.2 Trim tail | :2786 | `trimTail(` | ALIGNED |
| §5.2/§5.4 Ripple trim | :2867 | `rippleTrimItem(` | ALIGNED |
| §5.5 Roll | :2998 | `rollingTrimItems(` | ALIGNED |
| §5.11 Rate stretch | :3153 / :5835 | `rateStretchItem(` / `rateStretchWithRipple(` | ALIGNED |
| §5.4 Ripple delete | :3547 / :3573 | `rippleDelete(clipId: string): void {` / `rippleDeleteItems(` | ALIGNED |
| §5.8 Delete | :3715 | `removeItems(clipIds: string[], options: { linked?: boolean } = {}): void {` | ALIGNED |
| §5.10 Duplicate | :3761 | `duplicateItems(` | ALIGNED |
| §5.3 Move | :3868 / :3947 | `moveClip(` / `moveItems(` | ALIGNED |
| §5.6 Slip | :4045 | `slip(clipId: string, deltaFrames: number, options: { linked?: boolean } = {}): void {` | ALIGNED |
| §5.7 Slide | :4133 | `slideItem(` | ALIGNED |
| §5.9 Insert / Overwrite | :4574 / :4705 | `performInsertEdit(` / `performOverwriteEdit(` | ALIGNED |
| §5.14 Range removal family | :6289 / :6424 / :6453 / :6469 | `removeRangesFromClip(` / `removeSilenceFromItems(` / `removeFillerWordsFromItems(` / `removeTranscriptRangesFromItems(` | ALIGNED |
| §5.13 Freeze frame | :6520 | `freezeFrameAtPosition(` | ALIGNED |
| Join (spec 16 composite) | :6664 | `joinItems(clipIds: string[]): string \| null {` | ALIGNED |
| Close gap | :5679 / :5775 | `closeGapAtPosition(` / `closeAllGapsOnTrack(` | ALIGNED |
| §6 Sync-lock | timeline.ts:3484 + sync-lock.ts:500 | `applySyncLockRipplePatch(` + `propagateRemovedIntervalsToSyncLockedTracks(` | ALIGNED |
| Undo/redo/snapshot | :5582 / :5627 | `undo(): boolean {` / `snapshot(label: string = 'snapshot'): TimelineSnapshot {` | ALIGNED (P0.6 keyframe-blind equality FIXED @ :1772 `snapshotsEqual` — now keyframe/composition/backgroundColor-aware, verified by m20 20.7/20.8) |
| §5.15 Mute/Solo/Lock/Visibility | (absent) | fields only, no public mutators | ENGINE-GAP |
| §5.16 Snap + razor snap | (absent) | no snap code in src/lib/nle | SPEC-ONLY (opencut-timeline §10.5 owns the reference) |
| §4.6 pure-Op + command wrap | timeline.ts:2084 (and 20+ sites) | `_commit({...this._data, …})` | CORRECTIVE (class-based mutating manager; spec's layer wins) |
| §4.7 SceneTracks model | core/types.ts (Clip union @ :995) | flat `TimelineData`; `TrackKind = 'video' \| 'audio'` | CORRECTIVE (flat N-track; spec's main-singleton wins — the Decision-11 seam adapter owns the bridge) |

§7 note (Round 7, updated Round 8): the snapshot stored by a drag-coalesced `TracksSnapshotCommand` must cover the full field set incl. keyframes — the engine's `snapshotsEqual` ignored them (keyframe-only edits stopped being undoable; engine P0.6). **Fixed in Wave 4A** (timeline.ts:1772-1803, now compares keyframes + compositions + backgroundColor via JSON-deep; m20 20.7 regression-tested). The counter-example stays in spec 19 §6 as documentation. Residual field-gap: `busAudioEq` exists in FreeCut's 17-field equality but not in the engine model — our spec 06 §7 / spec 15 §14.1 full-field bar covers it by construction.

### 10.5. opencut-timeline op-coverage (reference, NOT canon — landed Round 8 @ `d3b2163`)

> opencut-timeline (github.com/bearachprema/opencut-timeline, `src/lib/timeline/`, 136/136 tests) implements the OpenCut-side op families — the other half of Decision 11.3's division. Where it conflicts with this spec, **the spec wins** (known deltas: prefixed headless command names — C7 rename; 5-kind TrackType taxonomy; group-shape trim — correctly so, per §5.2A).

| Spec 06 op (§) | OT file:line | Verified export | Status | Note |
|---|---|---|---|---|
| §5.1 Split | `ops/split.ts:28/:39` | `SplitElementsParams` (retainSide) / `splitElementsOnTracks` | ALIGNED | Snap-once source spans; M8 |
| §5.2 Trim (UI/group shape) | `ops/group-resize.ts:41/:54/:147` | `ResizeSide` / `buildResizeMembers` / `computeGroupResize` | ALIGNED | The §5.2A controller-side shape; snap-once, neighbor/source bounds, min 1 frame; M7 |
| §5.3 Move (group) | `ops/group-move.ts:63/:69/:163/:258` | `PlannedTrackCreation` / `PlannedElementMove` / `buildMoveGroup` / `resolveGroupMove` | ALIGNED | `PlannedElementMove` = spec 15 §4.3.3 field-for-field (scout R8-A VC5); mixed A/V groups rejected |
| §5.4 Ripple (diff algorithm) | `ripple/index.ts:16/:40/:121` | `rippleShiftElements` / `applyRippleAdjustments` / `computeRippleAdjustments` | ALIGNED | The adopted OpenCut diff (§12); M6 |
| §5.9 Insert (placement) | `placement/index.ts:43-54/:381` | 5 `PlacementStrategy`s / `resolveTrackPlacement` | ALIGNED | Reject-not-shift + zero-anchor (spec 05 §14.5A); M5 |
| §5.10 Duplicate | `ops/timeline-core.ts:652` | `duplicateElements(` | ALIGNED | OpenCut new-track semantics; M14 |
| §5.11 Retime math | `ops/retime.ts:12-13/:15` | `MIN/MAX_RETIME_RATE` 0.01/5, `clampRetimeRate` | ALIGNED (math only) | Pure maps; no command surface — wire side is spec-15/`rateStretch` (engine reference) |
| §5.12 Retime pitch | — | (absent) | OT-GAP | Audio half lives in spec 03 / nle-engine |
| §5.5 Roll / §5.6 Slip / §5.7 Slide | — | (absent — OpenCut never had them) | OT-GAP | **nle-engine is the executable reference** (§10.4 :2998/:4045/:4133) — Decision 11.3 |
| §5.11 Rate-stretch command | — | (absent) | OT-GAP | nle-engine :3153 |
| §5.13 Freeze frame | — | (absent) | OT-GAP | nle-engine :6520 |
| §5.14 Range removal | — | (absent) | OT-GAP | Spec-only; nle-engine family :6289-6469 |
| §6 Sync-lock | — | (absent) | OT-GAP | nle-engine sync-lock.ts (636 LOC) is the only implementation |
| §5.4 Ripple delete convenience | `ops/timeline-core.ts:620` | `rippleDeleteElements(` | ALIGNED | Decomposes to `delete {ripple: true}` per §5.4 note 2; M14 |
| §4.4-4.6 preview/commit | `ops/timeline-core.ts:795/:814` | `previewElements(` / `commitElements(` | ALIGNED | The §4.6 coalescing pattern, executable |
| Undo (snapshot + transactions) | `ops/timeline-core.ts:102-207` | `UndoStack` w/ `beginTransaction`, suspended eviction, 100-cap | ALIGNED+ | Transaction discipline absorbed into spec 15 §7.1A (Round 8) |
| Core class | `ops/timeline-core.ts:209-907` | `TimelineCore` (986 LOC) | ALIGNED | Manager-method names match spec 15 §4.2 1:1 |

**Division of labor (Decision 11.3, summary):** OT owns split/trim-group/move-group/ripple-diff/insert-placement/duplicate + interaction controllers; nle-engine owns roll/slip/slide/rateStretch/retime-command/freezeFrame/range-removal/sync-lock. Both wrap in the spec 15 command layer (OT via C7 rename; engine via C2 adapter).

---

## 11. Corrections to Seed Spec

### 11.1 Command interface — WRONG in seed

**Seed §4:**
```ts
interface Command {
  id: CommandId;
  label: string;
  execute(state: SceneState): SceneState;
  undo(state: SceneState): SceneState;
  coalesceKey?: string;
}
```

**Actual (`apps/web/src/commands/base-command.ts:21-31`):**
```ts
export abstract class Command {
  abstract execute(): CommandResult | undefined;
  undo(): void { throw new Error("Undo not implemented for this command"); }
  redo(): CommandResult | undefined { return this.execute(); }
}
```

**Correction:** Drop `id`, `label`, `coalesceKey`. Drop `state` arg from `execute`/`undo` — commands fetch state via `EditorCore.getInstance()`. Add `redo()` with default = `execute()`.

### 11.2 CommandManager API — WRONG in seed

**Seed §4 implied:** `beginTransaction(label)` / `endTransaction(): CommandId` for transactions, `coalesceKey` for merging.

**Actual (`apps/web/src/core/managers/commands.ts`):**
- No `beginTransaction`/`endTransaction`. Use `BatchCommand(commands: Command[])`.
- No `coalesceKey`. Use `previewElements({updates})` → `commitPreview()` → `command.push({command: new TracksSnapshotCommand({before, after})})`.
- `push({command})` bypasses `execute()` — used only by `commitPreview()`.

### 11.3 Ripple is a flag, not a command — WRONG in seed

**Seed §5.4 implied:** `RippleCommand` + `ripple(params): CommandId` on TimelineManager.

**Actual (`apps/web/src/core/managers/commands.ts:14, 21-37, 127-153`):**
- `public isRippleEnabled = false` on `CommandManager`.
- When `true`, `execute()` captures `beforeTracks`, runs command, then `applyRippleIfEnabled({beforeTracks})` calls `computeRippleAdjustments` from `@/ripple`.
- No separate `RippleCommand`. Any command gets ripple for free.

### 11.4 File paths — multiple wrong in seed

| Seed spec claimed | Actual path |
|---|---|
| `src/lib/ripple/{shift,apply,diff}.ts` | `apps/web/src/ripple/{shift,apply,diff,index}.ts` |
| `src/features/timeline/preview/components/rolling-edit-overlay.tsx` | `src/features/preview/components/rolling-edit-overlay.tsx` |
| `src/features/timeline/utils/rolling-edit-utils.ts` | `src/features/preview/components/rolling-edit-overlay-utils.ts` (32 LOC, different filename) |
| `src/features/timeline/preview/components/slip-edit-overlay.tsx` | `src/features/preview/components/slip-edit-overlay.tsx` |
| `src/features/timeline/preview/components/slide-edit-overlay.tsx` | `src/features/preview/components/slide-edit-overlay.tsx` |
| `src/features/timeline/utils/split-bookkeeping.ts` | `src/features/timeline/stores/actions/split-bookkeeping.ts` |
| FreeCut `stores/actions/edit/move-actions.ts` | ❌ NOT FOUND — move logic in `hooks/use-timeline-drag.ts` + `stores/actions/item-actions.ts` + `stores/actions/item-placement.ts` |

### 11.5 Split algorithm location — INCOMPLETE in seed

**Seed §5.1:** "FreeCut reference: `src/features/timeline/stores/actions/edit/split-actions.ts` and `src/features/timeline/utils/split-bookkeeping.ts`. Sub-agent to read both."

**Actual:** `split-actions.ts` is the **action wrapper** (linked-edit expansion, transition-overlap guard, multi-split orchestration). The actual split algorithm is `itemsStore._splitItem(id, splitFrame)` in `stores/items-store.ts:485-629`. `split-bookkeeping.ts` is in `stores/actions/`, NOT `utils/`, and handles transition remap + linked-segment relink (not the split itself).

### 11.6 Retime presets — OVERSTATED in seed

**Seed §5.11 implied:** `presets.ts` exposes preset rates.

**Actual (`apps/web/src/retime/presets.ts:1-12`):** Only `buildConstantRetime({rate, maintainPitch})` — a single factory function. No preset speed tables. We must add our own.

### 11.7 Rate bounds — DIFFERENT between FreeCut and OpenCut

- FreeCut: `MIN_SPEED=0.1`, `MAX_SPEED=16` (defined in `utils/source-calculations.ts:17-18`; imported into `hooks/use-rate-stretch.ts`). Note: line 32 of `use-rate-stretch.ts` is `LOOPING_MEDIA_MAX_DURATION` (10 min), NOT the speed bounds.
- OpenCut-classic: `MIN_RETIME_RATE=0.01`, `MAX_RETIME_RATE=5` (`retime/rate.ts:2-3`).

**Decision:** Adopt OpenCut's bounds (0.01–5.0) for the retime module. FreeCut's wider bounds (0.1–16) are for rate-stretch only. This recommendation holds *a fortiori*: FreeCut's actual upper bound (16x) is even wider than the seed spec implied, so OpenCut's narrower, more conservative range remains the safer default for our retime API — wider bounds risk runaway time-stretch artifacts and audio pitch corruption at extremes.

### 11.8 OpenCut-classic does NOT implement roll/slip/slide/track-lock/freeze-frame/range-removal

**Seed §3 implied** some of these might be in OpenCut-classic. **Confirmed:** none of them are. All must be ported from FreeCut.

### 11.9 FreeCut uses snapshot-based commands, not class-based

**Seed §4 implied** class-based commands everywhere. **Reality:**
- **OpenCut-classic** uses class-based `Command` (with `execute()`/`undo()`/`redo()` methods).
- **FreeCut** uses snapshot-based commands: `TimelineCommand = {type: string, payload?: Record<string, unknown>}` (`stores/commands/types.ts:40-43`), and the `execute(command, action)` function (`timeline-command-store.ts:127-151`) captures beforeSnapshot, runs action, captures afterSnapshot, pushes to undoStack if changed.

**Decision for our system:** Adopt **OpenCut-classic's class-based pattern** (cleaner type safety, matches SCOUT-01 finding). Our ops are pure functions, wrapped in `OpCommand extends Command`.

---

## 12. OpenCut-classic Ripple Diff — Full Quote

All three files quoted in full below. **Real path:** `/tmp/opencut-classic/apps/web/src/ripple/{diff,apply,shift,index}.ts` (NOT `lib/ripple/` as the seed spec claimed).

### 12.1 `apps/web/src/ripple/shift.ts` (17 LOC)

```ts
import type { TimelineElement } from "@/timeline/types";

export function rippleShiftElements<TElement extends TimelineElement>({
        elements,
        afterTime,
        shiftAmount,
}: {
        elements: TElement[];
        afterTime: number;
        shiftAmount: number;
}): TElement[] {
        return elements.map((element) =>
                element.startTime >= afterTime
                        ? ({ ...element, startTime: element.startTime - shiftAmount } as TElement)
                        : element,
        );
}
```

**Summary:** Pure map. For each element, if `startTime >= afterTime`, shift leftward by `shiftAmount`. Otherwise leave untouched. Returns new array (immutable).

### 12.2 `apps/web/src/ripple/apply.ts` (77 LOC)

```ts
import type { SceneTracks, TimelineTrack } from "@/timeline/types";
import { rippleShiftElements } from "./shift";

export interface RippleAdjustment {
        trackId: string;
        afterTime: number;
        shiftAmount: number;
}

export function applyRippleAdjustments({
        tracks,
        adjustments,
}: {
        tracks: SceneTracks;
        adjustments: RippleAdjustment[];
}): SceneTracks {
        if (adjustments.length === 0) {
                return tracks;
        }

        const adjustmentsByTrack = new Map<string, RippleAdjustment[]>();
        for (const adjustment of adjustments) {
                const trackAdjustments = adjustmentsByTrack.get(adjustment.trackId) ?? [];
                trackAdjustments.push(adjustment);
                adjustmentsByTrack.set(adjustment.trackId, trackAdjustments);
        }

        return {
                overlay: tracks.overlay.map((track) =>
                        applyTrackRippleAdjustments({
                                track,
                                adjustments: adjustmentsByTrack.get(track.id) ?? [],
                        }),
                ),
                main: applyTrackRippleAdjustments({
                        track: tracks.main,
                        adjustments: adjustmentsByTrack.get(tracks.main.id) ?? [],
                }),
                audio: tracks.audio.map((track) =>
                        applyTrackRippleAdjustments({
                                track,
                                adjustments: adjustmentsByTrack.get(track.id) ?? [],
                        }),
                ),
        };
}

function applyTrackRippleAdjustments<
        TElement extends TimelineTrack["elements"][number],
        TTrack extends TimelineTrack & { elements: TElement[] },
>({
        track,
        adjustments,
}: {
        track: TTrack;
        adjustments: RippleAdjustment[];
}): TTrack {
        if (adjustments.length === 0) {
                return track;
        }

        // Sort by afterTime DESCENDING so rightmost adjustments apply first.
        // This preserves afterTime indices as elements get shifted leftward —
        // if we sorted ascending, an earlier adjustment would shift elements
        // into a later adjustment's range, corrupting the comparison.
        const sortedAdjustments = [...adjustments].sort(
                (firstAdjustment, secondAdjustment) =>
                        secondAdjustment.afterTime - firstAdjustment.afterTime,
        );

        let elements: TElement[] = track.elements;
        for (const adjustment of sortedAdjustments) {
                elements = rippleShiftElements({
                        elements,
                        afterTime: adjustment.afterTime,
                        shiftAmount: adjustment.shiftAmount,
                });
        }

        return { ...track, elements };
}
```

**Summary:** Groups adjustments by track, applies each track's adjustments in `afterTime` descending order (rightmost first — preserves index validity). Returns new `SceneTracks` (immutable).

### 12.3 `apps/web/src/ripple/diff.ts` (279 LOC)

```ts
import type { SceneTracks, TimelineElement, TimelineTrack } from "@/timeline/types";
import type { RippleAdjustment } from "./apply";

interface Interval {
        startTime: number;
        endTime: number;
}

interface ElementSpan extends Interval {
        id: string;
}

export function computeRippleAdjustments({
        beforeTracks,
        afterTracks,
}: {
        beforeTracks: SceneTracks;
        afterTracks: SceneTracks;
}): RippleAdjustment[] {
        const beforeTrackList = [
                ...beforeTracks.overlay,
                beforeTracks.main,
                ...beforeTracks.audio,
        ];
        const afterTrackList = [
                ...afterTracks.overlay,
                afterTracks.main,
                ...afterTracks.audio,
        ];
        const afterTracksById = new Map(afterTrackList.map((track) => [track.id, track]));
        const allAfterElementIds = new Set(
                afterTrackList.flatMap((track) => track.elements.map((element) => element.id)),
        );

        return beforeTrackList.flatMap((beforeTrack): RippleAdjustment[] =>
                computeTrackRippleAdjustments({
                        trackId: beforeTrack.id,
                        beforeElements: beforeTrack.elements,
                        afterElements: afterTracksById.get(beforeTrack.id)?.elements ?? [],
                        allAfterElementIds,
                }),
        );
}

function computeTrackRippleAdjustments({
        trackId,
        beforeElements,
        afterElements,
        allAfterElementIds,
}: {
        trackId: string;
        beforeElements: TimelineElement[];
        afterElements: TimelineElement[];
        allAfterElementIds: Set<string>;
}): RippleAdjustment[] {
        const beforeElementsById = buildElementSpanMap({ elements: beforeElements });
        const afterElementsById = buildElementSpanMap({ elements: afterElements });
        const { vacatedIntervals, joinedIntervals } = collectTrackIntervals({
                beforeElementsById,
                afterElementsById,
                allAfterElementIds,
        });
        const freedIntervals = subtractIntervalSets({
                sourceIntervals: vacatedIntervals,
                overlappingIntervals: joinedIntervals,
        });

        return buildAdjustments({ trackId, intervals: freedIntervals });
}

function buildElementSpanMap({
        elements,
}: {
        elements: TimelineElement[];
}): Map<string, ElementSpan> {
        return new Map(
                elements.map((element) => [
                        element.id,
                        {
                                id: element.id,
                                startTime: element.startTime,
                                endTime: element.startTime + element.duration,
                        },
                ]),
        );
}

function collectTrackIntervals({
        beforeElementsById,
        afterElementsById,
        allAfterElementIds,
}: {
        beforeElementsById: Map<string, ElementSpan>;
        afterElementsById: Map<string, ElementSpan>;
        allAfterElementIds: Set<string>;
}): {
        vacatedIntervals: Interval[];
        joinedIntervals: Interval[];
} {
        const vacatedIntervals: Interval[] = [];
        const joinedIntervals: Interval[] = [];

        for (const beforeElement of beforeElementsById.values()) {
                const afterElement = afterElementsById.get(beforeElement.id);
                if (!afterElement) {
                        // Element was deleted or moved to another track.
                        // Only count as vacated if it didn't move to another track
                        // (inter-track moves are NOT ripple-triggering).
                        const wasMovedToAnotherTrack = allAfterElementIds.has(beforeElement.id);
                        if (!wasMovedToAnotherTrack) {
                                pushInterval({
                                        intervals: vacatedIntervals,
                                        startTime: beforeElement.startTime,
                                        endTime: beforeElement.endTime,
                                });
                        }
                        continue;
                }

                // Element still exists on this track. If it shrank, the right-trimmed
                // portion is vacated.
                if (beforeElement.endTime > afterElement.endTime) {
                        pushInterval({
                                intervals: vacatedIntervals,
                                startTime: afterElement.endTime,
                                endTime: beforeElement.endTime,
                        });
                }
        }

        for (const afterElement of afterElementsById.values()) {
                // New element (inserted or moved in from another track).
                // Its span is "joined" — exempt from ripple shifting.
                if (beforeElementsById.has(afterElement.id)) {
                        continue;
                }

                pushInterval({
                        intervals: joinedIntervals,
                        startTime: afterElement.startTime,
                        endTime: afterElement.endTime,
                });
        }

        return {
                vacatedIntervals: normalizeIntervals({ intervals: vacatedIntervals }),
                joinedIntervals: normalizeIntervals({ intervals: joinedIntervals }),
        };
}

function buildAdjustments({
        trackId,
        intervals,
}: {
        trackId: string;
        intervals: Interval[];
}): RippleAdjustment[] {
        return intervals.flatMap((interval): RippleAdjustment[] => {
                const shiftAmount = interval.endTime - interval.startTime;
                if (shiftAmount <= 0) {
                        return [];
                }

                return [
                        {
                                trackId,
                                afterTime: interval.endTime,
                                shiftAmount,
                        },
                ];
        });
}

function subtractIntervalSets({
        sourceIntervals,
        overlappingIntervals,
}: {
        sourceIntervals: Interval[];
        overlappingIntervals: Interval[];
}): Interval[] {
        const normalizedSourceIntervals = normalizeIntervals({
                intervals: sourceIntervals,
        });
        const normalizedOverlappingIntervals = normalizeIntervals({
                intervals: overlappingIntervals,
        });

        return normalizedSourceIntervals.flatMap((sourceInterval) =>
                subtractSingleInterval({
                        sourceInterval,
                        overlappingIntervals: normalizedOverlappingIntervals,
                }),
        );
}

function normalizeIntervals({
        intervals,
}: {
        intervals: Interval[];
}): Interval[] {
        const validIntervals: Interval[] = [];
        for (const interval of intervals) {
                pushInterval({
                        intervals: validIntervals,
                        startTime: interval.startTime,
                        endTime: interval.endTime,
                });
        }

        const sortedIntervals = validIntervals.sort(
                (leftInterval, rightInterval) =>
                        leftInterval.startTime - rightInterval.startTime,
        );

        if (sortedIntervals.length === 0) {
                return [];
        }

        const mergedIntervals: Interval[] = [{ ...sortedIntervals[0] }];
        for (const interval of sortedIntervals.slice(1)) {
                const previousInterval = mergedIntervals[mergedIntervals.length - 1];
                if (interval.startTime <= previousInterval.endTime) {
                        previousInterval.endTime = Math.max(
                                previousInterval.endTime,
                                interval.endTime,
                        );
                        continue;
                }

                mergedIntervals.push({ ...interval });
        }

        return mergedIntervals;
}

function subtractSingleInterval({
        sourceInterval,
        overlappingIntervals,
}: {
        sourceInterval: Interval;
        overlappingIntervals: Interval[];
}): Interval[] {
        let remainingIntervals: Interval[] = [{ ...sourceInterval }];

        for (const overlappingInterval of overlappingIntervals) {
                remainingIntervals = remainingIntervals.flatMap((remainingInterval) => {
                if (
                        overlappingInterval.endTime <= remainingInterval.startTime ||
                        overlappingInterval.startTime >= remainingInterval.endTime
                ) {
                        return [remainingInterval];
                }

                const nextIntervals: Interval[] = [];
                pushInterval({
                        intervals: nextIntervals,
                        startTime: remainingInterval.startTime,
                        endTime: overlappingInterval.startTime,
                });
                pushInterval({
                        intervals: nextIntervals,
                        startTime: overlappingInterval.endTime,
                        endTime: remainingInterval.endTime,
                });
                return nextIntervals;
                });

                if (remainingIntervals.length === 0) {
                        return [];
                }
        }

        return remainingIntervals;
}

function pushInterval({
        intervals,
        startTime,
        endTime,
}: { intervals: Interval[]; startTime: number; endTime: number }): void {
        if (endTime <= startTime) {
                return;
        }

        intervals.push({ startTime, endTime });
}
```

**Summary:**
1. `computeRippleAdjustments({beforeTracks, afterTracks})`: iterates each before-track, calls `computeTrackRippleAdjustments`.
2. `computeTrackRippleAdjustments`: builds span maps, calls `collectTrackIntervals`, subtracts joined from vacated, builds adjustments.
3. `collectTrackIntervals`: walks before-elements — if element gone from this track AND not on another track → vacated interval; if element shrank (right-trim) → vacated interval. Walks after-elements — if new → joined interval.
4. `subtractIntervalSets`: normalizes both sets, then for each vacated interval, subtracts each joined interval (possibly splitting the vacated interval into 0/1/2 pieces).
5. `buildAdjustments`: for each freed interval, emit `{trackId, afterTime: interval.endTime, shiftAmount: interval.endTime - interval.startTime}`.
6. `normalizeIntervals`: sort by start, merge overlapping.
7. `pushInterval`: no-op if `endTime <= startTime`.

**Why this is better than FreeCut's inline ripple:**
- **Diff-based**: doesn't need to know what the action did — just compares before/after.
- **Pure function**: testable in isolation; no `useItemsStore.getState()` calls.
- **Universal**: any command (split, trim, move, delete, insert, rate-stretch) automatically gets ripple behavior when `CommandManager.isRippleEnabled === true`.
- **Single integration point**: `CommandManager.applyRippleIfEnabled({beforeTracks})` is the only call site.
- **Interval arithmetic is reusable**: `subtractIntervalSets`, `normalizeIntervals`, `pushInterval` are generic helpers.

---

## 13. Per-Op Algorithm Summary

| Op | File | Line range | Key constraints | Multi-select? | Command type | Ripple? |
|---|---|---|---|---|---|---|
| **Split** | `freecut/.../stores/items-store.ts` | 485-629 | splitFrame ∈ (itemStart, itemEnd); not in transition overlap | Yes (linked + multi-frame) | FreeCut snapshot; OpenCut `SplitElementsCommand` | Yes (flag) |
| **Split-bookkeeping** | `freecut/.../stores/actions/split-bookkeeping.ts` | 14-60 | transition remap, linked-segment relink | (internal) | (internal) | n/a |
| **Trim Start** | `freecut/.../actions/edit/trim-actions.ts` | 253-265 | sourceStart≥0, duration≥1, no overlap | Yes (synced linked) | FreeCut snapshot; OpenCut `UpdateElementsCommand` | Yes (flag) |
| **Trim End** | `freecut/.../actions/edit/trim-actions.ts` | 267-279 | sourceEnd≤sourceDuration, duration≥1, no overlap | Yes (synced linked) | Same | Yes (flag) |
| **Ripple Trim** | `freecut/.../actions/edit/trim-actions.ts` | 322-460 | trim + shift downstream + sync-lock propagate | Yes (synced linked) | FreeCut `'RIPPLE_EDIT'` snapshot | Built-in |
| **Roll** | `freecut/.../actions/edit/trim-actions.ts` | 471-565 | shrink-then-extend; both clips source-bounded | Pair + linked counterpart pair | FreeCut `'ROLLING_EDIT'` snapshot | n/a (preserves total duration) |
| **Slip** | `freecut/.../actions/edit/trim-actions.ts` | 576-639 | sourceStart+δ≥0, sourceEnd+δ≤sourceDuration | Yes (synced linked) | FreeCut `'SLIP_EDIT'` snapshot | n/a (timeline unchanged) |
| **Slide** | `freecut/.../actions/edit/trim-actions.ts` | 651-878 | neighbors source-bounded; no overlap; keyframes preserved | Anchor + linked counterpart + neighbors | FreeCut `'SLIDE_EDIT'` snapshot | n/a (preserves total duration) |
| **Move** | `opencut-classic/.../commands/timeline/element/move-elements.ts` | 18-131 | type-compat track; no overlap on target; main-track constraint | Yes (group-move) | `MoveElementCommand` | Yes (flag) |
| **Delete** | `opencut-classic/.../commands/timeline/element/delete-elements.ts` | 24-72 | (none — pure filter) | Yes (multi-element) | `DeleteElementsCommand` | Yes (flag) |
| **Insert** | `opencut-classic/.../commands/timeline/element/insert-element.ts` | 32-297 | element-type basics validated; placement resolved | Single element | `InsertElementCommand` | Yes (flag) |
| **Duplicate** | `opencut-classic/.../commands/timeline/element/duplicate-elements.ts` | 17-114 | cloned animations regenerate keyframe IDs | Yes (per-track) | `DuplicateElementsCommand` | n/a (new track) |
| **Rate Stretch** | `freecut/.../actions/edit/rate-stretch-actions.ts` | 11-229 | 0.1x ≤ speed ≤ 16x (FreeCut, `source-calculations.ts:17-18`); 0.01x ≤ rate ≤ 5x (OpenCut); snap-once | Yes (synced linked) | FreeCut `'RATE_STRETCH_ITEM'` snapshot | Built-in (downstream shift) |
| **Retime (audio pitch preserved)** | `opencut-classic/.../retime/audio-stretch.ts` | 70-182 | rate>0 for pitch preservation; SoundTouch PitchShifter | Single element | (called by AudioManager, not a Command) | n/a |
| **Freeze Frame** | `freecut/.../actions/edit/freeze-frame-actions.ts` | 22-253 | playhead ∈ (itemStart, itemEnd); not in transition overlap; mediabunny frame extraction | Single video item | FreeCut `'INSERT_FREEZE_FRAME'` snapshot | Built-in (shifts right half + downstream) |
| **Range Removal** | `freecut/.../actions/edit/range-removal-actions.ts` | 60-354 | silence coverage ≥ 0.75; multi-track shift | Yes (anchor IDs across tracks) | FreeCut `'REMOVE_SILENCE' \| 'REMOVE_FILLER_WORDS' \| 'REMOVE_TRANSCRIPT_SELECTION'` snapshot | Built-in + sync-lock propagate |
| **Toggle Mute** | `opencut-classic/.../commands/timeline/track/toggle-track-mute.ts` | 6-41 | `canTrackHaveAudio(track)` | Single track | `ToggleTrackMuteCommand` | n/a |
| **Toggle Visibility** | `opencut-classic/.../commands/timeline/track/toggle-track-visibility.ts` | 6-45 | `canTrackBeHidden(track)` | Single track | `ToggleTrackVisibilityCommand` | n/a |
| **Ripple (diff)** | `opencut-classic/.../ripple/diff.ts` | 13-43 | pure before/after diff | Per-track | (called by `CommandManager.applyRippleIfEnabled`) | n/a (this IS ripple) |
| **Ripple (apply)** | `opencut-classic/.../ripple/apply.ts` | 10-46 | sort by afterTime desc | Per-track | (same) | n/a |
| **Ripple (shift)** | `opencut-classic/.../ripple/shift.ts` | 3-17 | startTime ≥ afterTime | Per-element | (same) | n/a |
| **Sync-lock propagate (removed)** | `freecut/.../actions/sync-lock-ripple.ts` | 389-427 | sync-lock enabled; not edited track | Per sync-locked track | (called inside ripple actions) | n/a |
| **Sync-lock propagate (inserted)** | `freecut/.../actions/sync-lock-ripple.ts` | 429-469 | sync-lock enabled; not edited track | Per sync-locked track | (called inside ripple actions) | n/a |
| **Snap** | `freecut/.../utils/timeline-snap-utils.ts` | 1-184 | adaptive threshold; transition inner edges suppressed | Yes (group-move snap) | (utility, not a Command) | n/a |
| **Razor Snap** | `freecut/.../utils/razor-snap.ts` | 1-90 | playhead snap within 10px; shift-snap within 12px | n/a | (utility) | n/a |

### Invariant preservation summary

| Invariant | Enforced by |
|---|---|
| No overlapping elements (except transition overlaps) | `placement/overlap.ts:wouldElementOverlap`; `trim-utils.ts:clampToAdjacentItems`; `group-move/resolve-move.ts:canApplyMovesToExistingTracks` |
| No negative durations | `trim-utils.ts:clampToMinDuration`; `retime/rate.ts:clampRetimeRate` (rate > 0) |
| No element starts before time 0 | `group-move/resolve-move.ts:clampAnchorStartTime`; `placement/main-track.ts:enforceMainTrackStart` |
| Source bounds respected | `trim-utils.ts:clampTrimAmount`; `slip-utils.ts:computeClampedSlipDelta`; `group-resize/compute-resize.ts:getMinimumAllowedDeltaTime/getMaximumAllowedDeltaTime` |
| Locked tracks untouched | `track-sync-lock.ts:isTrackSyncLockEnabled` (sync-lock skips locked); ops should reject if target track is locked |
| `trimStart + duration*rate + trimEnd == sourceDuration` (snap-once) | `group-resize/compute-resize.ts:81-103`; `split-elements.ts:94-114` |
| Linked companions move together | `freecut/.../utils/linked-items.ts:getSynchronizedLinkedItemsForEdit`; `opencut-classic/.../timeline/group-move/build-group.ts:buildMoveGroup` |
| Transitions preserved across edits | `freecut/.../actions/edit/trim-actions.ts:applyTransitionRepairs`; `freecut/.../utils/trim-edit-constraints.ts:createPreviewValidator` |
| Keyframes preserved across edits | `freecut/.../utils/trim-edit-constraints.ts:collectPreservedKeyframes`; `freecut/.../utils/slide-keyframe-constraints.ts:clampSlideDeltaToPreserveKeyframes`; `freecut/.../rate-stretch-actions.ts:_scaleKeyframesForItem` |
| Main track is singleton (not array) | `SceneTracks.main: VideoTrack` (type-enforced) |

---

## Testing

> See `17-test-plan.md` for the overall methodology, test matrix, and
> per-module template. Matrix rows: "Split op", "Trim op", "Ripple
> delete/insert", "Roll/Slip/Slide", "Move", "Delete/Insert/Duplicate",
> "Rate stretch", "Retime", "Freeze frame", "Range removal", "Mute/Solo/Lock",
> "Snap". Aligns with the worked example in `17-test-plan.md` §4.2.
>
> **Tier 1 is the PRIMARY testing path for NLE ops.** Every op is a pure
> function over `SceneTracks` (§4) dispatched via
> `engine.command.apply(EngineCommand)` (spec 15 §4). No browser, no canvas,
> no audio device required — Tier 1 runs on every push (CI tier "fast").
> Tier 2 (render sanity) and Tier 3 (keyboard WYSIWYG) run nightly and on
> PRs touching their respective surfaces. The §8 "Invariant Tests" stub
> above is the code-level summary; **this section is the canonical test
> plan** — when §8 and this section disagree, this section wins.

### Tier 1: Pure engine tests

[Filename: `tests/unit/06-nle-ops/*.test.ts`]

**Per-op contract (5 tests × 14 ops = 70 tests):** for EACH op in
{split, trim, move, ripple, roll, slip, slide, delete, insert, duplicate,
rate-stretch, retime, freeze-frame, range-removal}:

- `<op>-applied-to-known-state` — applies `<op>` to a seeded `SceneState`
  loaded from `simple-cut.json` and asserts the resulting `SceneTracks`
  matches an expected snapshot (deep-equal)
- `<op>-rejects-invalid-params` — applies `<op>` with deliberately invalid
  params and asserts `CommandResult.ok === false` with the correct error
  `code` (e.g. `SOURCE_BOUNDS_VIOLATION`, `OVERLAP_DETECTED`,
  `LOCKED_TRACK`, `INVALID_RATE`, `SPLIT_INSIDE_TRANSITION`)
- `<op>-multi-select-updates-all-elements` — applies `<op>` to N selected
  elements (N ≥ 2) and asserts all N are updated; no unselected element is
  touched (deep-equal on the untouched slice)
- `<op>-undo-restores-pre-state` — after `<op>`, `commandManager.undo()`
  produces `SceneState` deep-equal to the pre-op snapshot (involution)
- `<op>-redo-reapplies-post-state` — after `undo()`, `redo()` returns to
  the post-op `SceneState` byte-identically

**Split (algorithm-specific):**

- `split-at-frame-150` — split a 300-frame clip at frame 150; left half
  keeps the original element ID with `duration=150`; right half has a new
  UUID with `duration=150`; `(left.duration + right.duration) == 300`
- `split-preserves-total-duration` — for any split point T ∈ (itemStart,
  itemEnd), `left.duration + right.duration == original.duration`
- `split-respects-source-bounds` — both halves satisfy `sourceStart ≥ 0`
  and `sourceStart + sourceDuration ≤ source.duration` (per §5.1
  `calculateSplitSourceBoundaries`)
- `split-multi-track-all-tracks` — `trackIds: null` splits all tracks at
  the given time; element count increases by N (one per track that has an
  element straddling the split point)
- `split-inside-transition-overlap-rejected` — split time inside a
  transition overlap zone → `SPLIT_INSIDE_TRANSITION` error code
  (FreeCut `split-actions.ts:27-31`)
- `split-at-element-boundary-is-noop` — splitting at `itemStart` or
  `itemEnd` is a silent no-op for that element (state unchanged)
- `split-bookkeeping-remaps-transition` — transition that pointed at the
  original element now points at the right half (`split-bookkeeping.ts:14-35`)

**Trim (algorithm-specific):**

- `trim-start-edge-by-10-frames` — `updateElementTrim({ edge: 'start',
  delta: +10f })`; asserts `startTime +10f`, `sourceStart +10f`,
  `duration -10f`, `trimEnd` unchanged
- `trim-end-edge-by-10-frames` — `updateElementTrim({ edge: 'end',
  delta: +10f })`; asserts `duration +10f`, `sourceDuration +10f` (i.e.
  `trimEnd -10f`); `startTime`/`sourceStart` unchanged
- `trim-beyond-source-start-rejected` — `edge: 'start',
  delta: -(sourceStart+1)` → `SOURCE_BOUNDS_VIOLATION` (would push
  `sourceStart < 0`)
- `trim-beyond-source-end-rejected` — `edge: 'end',
  delta: +(remainingSource+1)` → `SOURCE_BOUNDS_VIOLATION` (would push
  `sourceStart + sourceDuration > source.duration`)
- `trim-causes-overlap-rejected-or-rippled` — `edge: 'end', delta: +overlap`
  with adjacent clip present → either `OVERLAP_DETECTED` rejected (when
  `ripple: false`) or applied as ripple trim (when `ripple: true`); test
  verifies both branches
- `trim-bounded-by-min-duration` — trim cannot push `duration < 1 frame`
  (`clampToMinDuration`, `trim-utils.ts:183-202`)
- `trim-snap-once-preserves-invariant` — after any trim,
  `trimStart + duration*rate + trimEnd == sourceDuration` (per
  `compute-resize.ts:81-103`)

**Move (algorithm-specific):**

- `move-5-clips-10s-later` — `moveElements({ moves: [...5 elements with
  +10s delta] })`; all 5 `startTime +10s`; no field other than `startTime`
  changes
- `move-to-different-track-type-compat-checked` — moving an audio element
  to a video track → `TRACK_TYPE_MISMATCH` rejected; moving to a different
  audio track → succeeds (per `placement/compatibility.ts`)
- `move-overlap-on-target-rejected` — moving onto an occupied slot on the
  target track → `OVERLAP_DETECTED` rejected (unless overwrite placement)
- `move-main-track-constraint` — main-track element cannot be moved before
  the earliest stationary main-track element
  (`placement/main-track.ts:enforceMainTrackStart`)

**Ripple (algorithm-specific):**

- `ripple-delete-shifts-downstream-left` — delete a clip with
  `ripple: true`; every downstream clip on the same track shifts
  `startTime` by `-deletedDuration`
- `ripple-insert-makes-room` — insert a clip with `ripple: true`; every
  downstream clip shifts `startTime` by `+insertedDuration`
- `ripple-diff-computation` — verifies `ripple/diff.ts:13-43` produces
  correct `vacated`, `joined`, `freed` intervals for a known
  before/after pair (e.g. 3-clip track with middle clip deleted →
  vacated interval = `[middle.startTime, middle.endTime]`, joined = the
  resulting post-deletion adjacency, freed = `[downstream.startTime -
  middle.endTime, +∞)` after shift)
- `ripple-zero-duration-delete-is-noop` — deleting a zero-duration
  element produces no ripple (no downstream shift)
- `ripple-apply-sorts-desc` — `ripple/apply.ts` sorts elements by
  `afterTime` desc before shifting; test verifies ordering matters with a
  counterexample state where in-place shifting would corrupt order

**Roll (algorithm-specific):**

- `roll-preserves-total-duration` — rolling two adjacent clips:
  `(left.duration + right.duration)` is invariant across the op
- `roll-shrink-then-extend` — verifies the FreeCut "shrink first, then
  extend" rule (§5.5) prevents transient overlap violations during the
  BatchCommand's two-step application
- `roll-source-bounded-both-clips` — both clips must remain within their
  source bounds after the roll; reject with `SOURCE_BOUNDS_VIOLATION`
  otherwise

**Slip (algorithm-specific):**

- `slip-shifts-source-only` — `sourceStart`/`sourceEnd` shift by δ;
  `startTime`/`duration` unchanged
- `slip-beyond-source-start-rejected` — `slip delta: -(sourceStart+1)` →
  rejected (`slip-utils.ts:computeClampedSlipDelta`)
- `slip-beyond-source-end-rejected` — `slip delta: +(remainingSource+1)` →
  rejected (equivalently `sourceEnd + delta > sourceDuration`)
- `slip-no-explicit-source-bounds-is-noop` — element without explicit
  source bounds → no-op (`slip-utils.ts:18`)

**Slide (algorithm-specific):**

- `slide-moves-element-and-trims-neighbors` — element `startTime` shifts
  by δ; left neighbor trims end by `+δ`; right neighbor trims start by
  `-δ`; slid element's `sourceStart`/`duration` unchanged
- `slide-no-chain-is-noop` — when left+right neighbors don't form a
  split-contiguous chain with the slid element → no-op
  (`slide-utils.ts:16-42`)
- `slide-preserves-keyframes` — keyframes on the slid element are not
  evicted from source (`slide-keyframe-constraints.ts`)

**Delete / Insert / Duplicate (algorithm-specific):**

- `delete-no-ripple-leaves-gap` — `deleteElements({ ripple: false })`;
  downstream clips unchanged; gap remains
- `delete-ripple-closes-gap` — `deleteElements({ ripple: true })`;
  downstream clips shift left by `deletedDuration`
- `delete-multi-element-atomic` — deleting N elements in one command is
  one undo step (BatchCommand under the hood)
- `insert-overwrite-vs-ripple` — `placement: 'overwrite'` vs
  `'ripple'` produces different post-states for the same insert
- `insert-resolves-placement` — `placement/resolve.ts` picks the correct
  slot per `main-track` vs overlay vs audio track type
- `duplicate-regenerates-keyframe-ids` — cloned animations get fresh
  keyframe IDs; originals are not aliased
- `duplicate-on-same-track-ripple` — duplicates placed after originals
  with downstream shift when `ripple: true`

**Rate Stretch / Retime / Freeze Frame / Range Removal (algorithm-specific):**

- `rate-stretch-2x-halves-duration` — `targetRate: 2`; `duration /= 2`;
  `speed = 2`; `sourceStart` unchanged; `sourceDuration` unchanged
- `rate-stretch-clamps-to-allowed-range` — rate outside `[0.1x, 16x]`
  (FreeCut `source-calculations.ts:17-18`) → `INVALID_RATE` rejected
- `rate-stretch-snap-once` — verifies snap-once rounding
  (`compute-resize.ts:81-103`)
- `retime-2x-halves-duration` — `targetRate: 2`; `duration /= 2`;
  `speed = 2`; `sourceDuration` unchanged
- `retime-0p5x-doubles-duration` — `targetRate: 0.5`; `duration *= 2`;
  `speed = 0.5`
- `retime-audio-pitch-preserved-fft` — render audio PCM at 2× retimed
  clip; FFT shows the dominant frequency matches the original (within
  ±1% tolerance), confirming pitch preservation (SoundTouch `PitchShifter`
  in `retime/audio-stretch.ts:70-182`)
- `retime-zero-rate-rejected` — `targetRate: 0` → `INVALID_RATE`
- `retime-negative-rate-rejected` — `targetRate: -1` → rejected (use the
  reverse-playback op instead)
- `freeze-frame-creates-static-element` — at time T inside a video
  element, a new `'freeze'` element is inserted with `sourceStart =
  T - element.startTime` and `duration = freezeDuration` (default 2s,
  §5.13)
- `freeze-frame-extends-element` — when freeze is appended to the source
  element (no ripple), the element's effective duration increases
- `freeze-frame-ripple-shifts-downstream` — when `ripple: true`,
  downstream clips shift right by `freezeDuration`
- `freeze-frame-at-transition-overlap-rejected` — T inside a transition
  overlap zone → rejected
- `freeze-frame-at-playhead-outside-element-rejected` — T outside any
  element → rejected
- `range-removal-shifts-subsequent-left` — remove `[10s, 20s]` across all
  tracks; every element with `startTime ≥ 20s` shifts `startTime -= 10s`
- `range-removal-splits-straddling-elements` — elements straddling a
  range boundary are split; the portion inside the range is discarded
- `range-removal-sync-lock-propagates` — sync-locked tracks get the same
  shift (per §6)
- `range-removal-silence-coverage-threshold` — when `removeSilence: true`,
  ranges below 0.75 silence coverage are skipped
  (`range-removal-actions.ts:60-354`)

**Constraint tests:**

- `locked-track-rejects-all-ops` — for each op in the inventory, applying
  to a locked track returns `LOCKED_TRACK` (or equivalent `CommandError.code`)
- `sync-lock-ripple-propagates` — ripple on track A propagates to every
  sync-locked track B (per `track-sync-lock.ts:isTrackSyncLockEnabled`);
  sync-locked tracks receive the same `vacated`/`joined`/`freed` shift
- `sync-lock-skip-locked` — locked tracks are excluded from sync-lock
  propagation (verified by deep-equal on the locked track's elements)
- `mute-toggle-no-state-change` — `toggleTrackMute({trackId})` only flips
  `track.muted`; no `SceneTracks` element is modified; playback mix is
  affected (Tier 2 verifies the mix)
- `solo-toggle-mutes-others` — `soloTrack({trackId})` mutes all other
  audio tracks (i.e. flips `muted: true` on every other audio track that
  has audio capability)
- `snap-within-threshold-snaps` — trim within adaptive snap threshold
  (`timeline-snap-utils.ts`) snaps to nearest snap point; assert resulting
  `startTime` equals the snap point exactly
- `snap-zero-threshold-no-snap` — when `snapEnabled: false` (toggle off),
  no snapping occurs; `startTime` equals the raw delta

**Coalescing / transaction:**

- `preview-then-commit-is-atomic` — `previewElements({ updates })` called
  N times then `commitPreview()` produces a single `TracksSnapshotCommand`
  on the undo stack (§4.4 / `timeline-manager.ts:706-760`)
- `batch-command-coalesces-multiple-trims` — multiple trims in a
  `BatchCommand` are a single undo step
- `keyboard-nudge-not-coalesced-by-default` — discrete `,` / `.` presses
  are separate undo steps (spec 16 §3.6 coalescing note)
- `keyboard-nudge-coalesced-with-option-held` — `Option+,` repeats within
  400 ms merge into one undo step (per spec 16 §3.6 coalescing rule)

### Tier 2: Render tests

[Filename: `tests/integration/06-nle-ops/*.render.test.ts`]

NLE ops do not change per-frame pixels (they restructure the timeline,
not the per-frame output). Tier 2 tests for spec 06 are limited to
structural-op sanity checks + one multi-track blend verification + audio
pitch preservation:

- `split-then-render-first-half` — after split at frame N, render frame
  `N/2`; pixels match the unsplit reference for that frame (tolerance 0%)
- `split-then-render-second-half` — after split at frame N, render frame
  `N + N/2`; pixels match the unsplit reference (tolerance 0%)
- `trim-then-render-trimmed-region` — trim removes source frames 0–30;
  rendering frame 0 of the trimmed element produces the same pixels as
  frame 30 of the untrimmed source (tolerance 0%)
- `move-then-render-multi-track-blend` — main track has
  `10s-red-1080p.mp4`; overlay track has `10s-green-1080p.mp4` at 50%
  opacity; move the green overlay 1s later; render a frame inside the
  overlap region; center pixel ≈ `(187, 187, 0)` — i.e. linear blend
  `0.5 * (1, 0, 0) + 0.5 * (0, 1, 0) = (0.5, 0.5, 0)` → sRGB-encoded
  `(187, 187, 0)` (tolerance ±2 levels per channel)
- `rate-stretch-then-render` — rate stretch a clip 2×; rendered frame at
  the half-duration mark shows the original source frame at the
  half-source-time mark (tolerance 0%)
- `retime-then-render-audio-pitch` — render audio for a 2× retimed clip
  using `10s-440hz-sine.wav` source; take FFT; dominant bin within ±1% of
  440 Hz (verifies SoundTouch `PitchShifter` pitch preservation at the
  render path, not just the unit path)
- `freeze-frame-then-render` — render a frame inside the freeze region;
  pixels match the source frame at the freeze position (tolerance 0%)
- `range-removal-then-render` — render a frame just after the removed
  range; pixels match the pre-removal reference shifted by the removed
  duration

[These are sanity checks — they verify that the renderer correctly
re-resolves the `FrameDescriptor` after a structural op. The op's
correctness is verified at Tier 1; the broader renderer correctness is
verified by spec 04.]

### Tier 3: UI tests

[Filename: `tests/integration/06-nle-ops/*.ui.test.ts`]

Every keyboard shortcut for an NLE op (per `16-keyboard-shortcuts.md`
§3.4–§3.7) must have a UI test that:

1. Presses the shortcut via `page.keyboard.press()`
2. Reads back `SceneState` via
   `page.evaluate(() => window.__engine.state.getSceneState())`
3. Compares to the `SceneState` produced by a direct
   `engine.command.apply(EngineCommand)` call (state WYSIWYG, see
   `17-test-plan.md` §6.1)

Shortcuts are bound per spec 16 and dispatched from the UI shell (spec 18: the timeline toolbar tool buttons mirror the tool-mode enum; keyboard focus lives in the shell's timeline area) — the state-read global is the spec 17 harness contract (`window.__engine`).

- `keyboard-split-cmd-b` — `Cmd+B` issues `{ type: 'split', params: {
  time: <currentTime>, trackIds: null } }`; resulting state matches direct
  API call
- `keyboard-split-all-cmd-shift-b` — `Cmd+Shift+B` issues split with
  `trackIds: <all tracks>`
- `keyboard-split-and-remove-left-q` — `Q` issues `splitAndRemove({ side:
  'left', ripple: true })`
- `keyboard-split-and-remove-right-w` — `W` issues `splitAndRemove({ side:
  'right', ripple: true })`
- `keyboard-delete` — `Delete` issues `deleteElements({ ripple: false })`
- `keyboard-ripple-delete-backspace` — `Backspace` issues
  `deleteElements({ ripple: true })`
- `keyboard-ripple-delete-shift-delete` — `Shift+Delete` is the alt
  binding for ripple-delete (same `EngineCommand` as `Backspace`); verify
  via state
- `keyboard-trim-left-bracket` — `[` issues `updateElementTrim({ edge:
  'start', targetTime: <currentTime>, ripple: false })`
- `keyboard-trim-right-bracket` — `]` issues `updateElementTrim({ edge:
  'end', targetTime: <currentTime>, ripple: false })`
- `keyboard-ripple-trim-option-bracket` — `Option+[` / `Option+]` issue
  the same trim commands with `ripple: true`
- `keyboard-nudge-comma-period` — `,` / `.` (select tool active) nudge
  ±1 frame via `moveElements`; resulting state matches direct API call
- `keyboard-nudge-shift-comma-period` — `Shift+,` / `Shift+.` nudge
  ±10 frames
- `keyboard-slip-comma-period` — `,` / `.` (slip tool active) slip
  ±1 frame via `{ type: 'slip' }`; verifies the §6 disambiguation rule
  (same key, different op by tool-mode)
- `keyboard-ripple-toggle-r` — `R` flips `engine.command.isRippleEnabled`;
  subsequent `Delete` behaves as ripple-delete (state WYSIWYG with the
  flag flipped)
- `keyboard-snap-toggle-n` — `N` flips `uiStore.timeline.snapEnabled`;
  subsequent trims snap (or don't) accordingly
- `mouse-trim-handle-drag` — `page.mouse.move()` on
  `[data-testid="trim-handle-right"]` issues `previewElements` →
  `commitPreview`; the resulting state matches a direct API call (§4.4)
- `mouse-marquee-select` — marquee drag selects all elements intersecting
  the rectangle; selection state matches direct
  `engine.selection.setElements(ids)` call
- `mouse-razor-click-split` — `B` activates razor tool; click on a clip
  issues `{ type: 'split', params: { time: <clickTime>, trackIds:
  [<clickedTrack>] } }`; state WYSIWYG with direct API call
- `state-wysiwyg-every-shortcut` — for every shortcut in the §3.4–§3.7
  tables, `page.keyboard.press(shortcut)` produces `SceneState`
  deep-equal to `engine.command.apply(<canonical EngineCommand for
  shortcut>)` — this is the architectural invariant from Decision 6 of
  `00-master-spec.md`

### Property-based tests

[Filename: `tests/unit/06-nle-ops/*.property.test.ts`]

All property tests run `fc.assert(..., { numRuns: 1000 })` over
`arbitrarySceneState()` + `arbitraryOp()` generators defined in
`tests/helpers/arbitraries/nle-ops.ts`. The §8 stub above is superseded
by this canonical list — when §8 and this list disagree, this list wins.

- `split-preserves-total-duration` — `fc.assert(fc.property(
  arbitrarySceneState(), arbitrarySplitTime(), (s, t) => {
    const after = applySplit(s, t);
    const total = sumDurations(after, t.targetElementId);
    expect(total).toBe(durationBefore(s, t.targetElementId));
  }), { numRuns: 1000 })`
- `no-overlapping-elements-after-any-op` — for arbitrary state +
  arbitrary op (split, trim, move, ripple, roll, slip, slide, delete,
  insert, duplicate, rate-stretch, retime, freeze-frame, range-removal),
  no two adjacent elements on the same track overlap (transition-overlap
  pairs excepted)
- `no-negative-durations-after-any-op` — for arbitrary op, every element
  ends up with `duration > 0` (≥ 1 frame minimum)
- `source-bounds-respected-after-any-op` — for arbitrary op, every
  element satisfies `sourceStart ≥ 0` AND
  `sourceStart + sourceDuration ≤ source.duration`
- `locked-tracks-not-modified-by-any-op` — for arbitrary op, every locked
  track's elements are byte-identical before and after (deep-equal)
- `undo-restores-exact-state` — for arbitrary op, `undo()` restores the
  pre-op `SceneState` byte-identically (involution: applying then undoing
  returns to the original state for any op)
- `snap-once-invariant` — for arbitrary trim, after the trim
  `trimStart + duration * rate + trimEnd == sourceDuration` (per
  `compute-resize.ts:81-103`)
- `multi-select-op-consistency` — for arbitrary op applied to N elements,
  exactly those N elements (plus cascade-required companions: linked
  items, sync-locked neighbors) are modified; unselected elements are
  untouched (deep-equal on the untouched slice)

### Test assets

Project fixtures (under `tests/fixtures/projects/`):

- `simple-cut.json` — 3 clips on the main track (3 × 10s, contiguous);
  used by split / trim / move / delete / ripple / roll / slip / slide
  tests
- `multi-track.json` — 5 tracks (1 main + 2 video overlays + 2 audio),
  10 clips total; used by multi-select, sync-lock, and range-removal tests
- `all-ops.json` — project with every op type represented (one element
  per op family; registered in spec 17 §5.3); used by the property-based "no-overlap / source-bounds
  / locked-tracks" suites as a real-world seed state
- `10-track-100-clip.json` — stress fixture for property tests with large
  state

Media fixtures (under `tests/fixtures/videos/`, names per
`17-test-plan.md` §5.1):

- `10s-red-1080p.mp4` — solid red, 10s, 30 fps, H.264, `yuv420p` —
  blend tests (red channel)
- `10s-green-1080p.mp4` — solid green, 10s, 30 fps, H.264, `yuv420p` —
  blend tests (green channel)
- `10s-blue-1080p.mp4` — solid blue, 10s, 30 fps, H.264, `yuv420p` —
  blend tests (blue channel)
- `10s-white-1080p.mp4`, `10s-black-1080p.mp4`, `10s-gray-50-1080p.mp4`
  — exposure / EOTF tests (carried over from spec 17 §5.1)

Audio fixtures (under `tests/fixtures/audio/`, per `17-test-plan.md`
§5.2):

- `10s-440hz-sine.wav` — 440 Hz sine, 10s, 48 kHz, mono — pitch
  preservation test for retime

Reference PNGs (under `tests/fixtures/references/`, regenerated per
`17-test-plan.md` §10):

- `simple-cut-frame-{0,75,150,225,300}.png` — pre-op references for
  split-then-render tests
- `multi-track-blend-frame-75.png` — pre-move reference; post-move
  pixel-diff at tolerance ±2 levels
- `trim-then-render-trimmed-region-frame-0.png` — frame 0 of trimmed
  element matches source frame 30
- `freeze-frame-source-position.png` — reference for freeze-frame
  render test

### Test commands

```bash
# Run Tier 1 tests for spec 06
npm test -- --filter "06-nle-ops"

# Run Tier 2 (render) tests for spec 06
npm run test:render -- --filter "06-nle-ops"

# Run Tier 3 (UI) tests for spec 06
npm run test:ui -- --filter "06-nle-ops"

# Run property tests for spec 06
npm run test:property -- --filter "06-nle-ops"

# Run all tiers for spec 06
npm run test:all -- --filter "06-nle-ops"

# Regenerate reference PNGs for spec 06 fixtures (see spec 17 §10)
npm run regen-references -- --filter "06-nle-ops"
```

---

**End of `06-nle-ops.md`.** Next: `07-composition.md`.
