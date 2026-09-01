# Audit Report: 06-nle-ops.refined.md

**Auditor:** general-purpose
**Spec under audit:** `/home/z/my-project/download/nle-spec/06-nle-ops.refined.md` (2,908 LOC)
**Scout:** SCOUT-06
**Date:** 2026-08-22

## Summary

- Total claims spot-checked: 22 (21 required + 1 incidental verification of the two "Corrections" entries in §11)
- Verified accurate: 21
- Verified inaccurate: 1 (MAJOR — FreeCut `MAX_SPEED` claimed as `10`; actual is `16`, AND the cited file path is wrong)
- Partially accurate (minor wording/range drift, no functional impact): 0
- Could not verify (file not found, etc.): 0

## Verdict: ⚠️ NEEDS REVISION

One MAJOR issue must be fixed before downstream implementation work consumes this spec: **Correction §11.7 (and its propagated copies in §5.11 Q8 answer and §13 per-op summary table) state FreeCut's `MAX_SPEED=10` when the actual value is `16`**. The same correction also cites `use-rate-stretch.ts:32` as the source location, but the constant is actually defined in `source-calculations.ts:17-18` (and merely *imported* into `use-rate-stretch.ts`). Line 32 of `use-rate-stretch.ts` is `LOOPING_MEDIA_MAX_DURATION`, not the speed bounds.

The architectural decision (adopt OpenCut-classic's `0.01–5.0` for our retime module; FreeCut's wider bounds apply only to rate-stretch) is unaffected by this error — the spec's *recommendation* stands — but the spec's factual claims about FreeCut are wrong and must be corrected so future readers don't repeat the misreading.

Every other claim verified is byte-for-byte accurate: the abstract `Command` shape, `BatchCommand` transaction grouping, the `previewElements` → `commitPreview` → `TracksSnapshotCommand` coalescing pattern, the `CommandManager.isRippleEnabled` flag + `applyRippleIfEnabled` hook, the `ripple/{diff,apply,shift}.ts` algorithm suite (full quotes in §12 match the source verbatim), the `retime/{rate,resolve,split,audio-stretch,presets}.ts` module, FreeCut's `_splitItem` location (`items-store.ts:485-629`), the shrink-first-then-extend ordering in `rollingTrimItems`, the slip/slide algorithm+util pairs, the freeze-frame `mediabunny` pipeline with rollback, the 0.75 silence-coverage threshold, the sync-lock `propagateRemovedIntervalsToSyncLockedTracks` / `propagateInsertedGapToSyncLockedTracks` interval arithmetic, and the snap-once invariant `trimStart + duration*rate + trimEnd == sourceDuration` (with the explicit comments at `compute-resize.ts:81-87` and `split-elements.ts:94-98`).

All 7 file-path corrections listed in §11.4 were also verified accurate (seed spec's claimed paths do not exist; refined spec's replacement paths all exist).

---

## Spot-check results

### Check 1 — "Command pattern: abstract class Command { execute(): CommandResult|undefined; undo(): void; redo(): CommandResult|undefined } at base-command.ts:21-31"

**Claim (spec §4.2, line 95):** `apps/web/src/commands/base-command.ts:21-31` declares `abstract class Command` with parameterless `execute(): CommandResult | undefined`, `undo(): void` that throws, `redo(): CommandResult | undefined` defaulting to `this.execute()`.

**Source:** `/tmp/opencut-classic/apps/web/src/commands/base-command.ts:21-31`

**Actual:**
```ts
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

**Verdict:** ✅ ACCURATE — byte-for-byte match with the spec §4.2 quote (lines 117-127). The `CommandResult` interface and `createElementSelectionResult` helper quoted at lines 99-114 also match the file's lines 4-19.

---

### Check 2 — "No Command.id, no Command.label, no Command.coalesceKey"

**Claim (spec §4.2 lines 130-137, §11.1 lines 2362-2371):** The `Command` base class has no `id`, `label`, or `coalesceKey` field. Coalescing happens at the manager layer via `previewElements`/`commitPreview`.

**Source:** `/tmp/opencut-classic/apps/web/src/commands/base-command.ts` (entire file, 31 LOC).

**Actual:** The complete file contains exactly: `CommandResult` interface, `createElementSelectionResult` factory, and `abstract class Command` with `execute`/`undo`/`redo`. No `id`, `label`, or `coalesceKey` field declared anywhere. No `CommandId` type exists in the repo's `commands/` directory.

**Verdict:** ✅ ACCURATE — the seed spec's `Command { id: CommandId; label: string; ...; coalesceKey?: string }` interface is correctly flagged as wrong; the refined spec's claim that these fields are absent is verified true.

---

### Check 3 — "BatchCommand(commands: Command[]) at batch-command.ts:3-39"

**Claim (spec §4.3 lines 139-180):** `BatchCommand extends Command` wraps `Command[]`, runs all in `execute()`, undoes in reverse, redoes forward. Quoted code at lines 142-179.

**Source:** `/tmp/opencut-classic/apps/web/src/commands/batch-command.ts` (39 LOC).

**Actual:**
```ts
import { Command, type CommandResult } from "./base-command";

export class BatchCommand extends Command {
        constructor(private commands: Command[]) {
                super();
        }

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

        undo(): void {
                for (const command of [...this.commands].reverse()) {
                        command.undo();
                }
        }

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

**Verdict:** ✅ ACCURATE — byte-for-byte match with spec §4.3 quote. The "wrap array, undo in reverse, redo forward" summary is exact. The class declaration is at line 3, the file ends at line 39 (with the trailing newline).

---

### Check 4 — "Coalescing: previewElements({updates}) → commitPreview() → command.push({command: new TracksSnapshotCommand({before, after})}) at timeline-manager.ts:706-760"

**Claim (spec §4.4 lines 218-238):** During a drag, `previewElements` overlays uncommitted patches; at drag end, `commitPreview` rolls them into a single `TracksSnapshotCommand` and pushes via `editor.command.push({command})` (which bypasses `execute()`). Quoted code at lines 222-238.

**Source:** `/tmp/opencut-classic/apps/web/src/core/managers/timeline-manager.ts:706-760`.

**Actual:**
```ts
previewElements({
        updates,
}: {
        updates: readonly {
                trackId: string;
                elementId: string;
                updates: Partial<TimelineElement>;
        }[];
}): void {
        let changedOverlayCount = 0;
        for (const { elementId, updates: elementUpdates } of updates) {
                const existingOverlay = this.previewOverlay.get(elementId);
                const changed = Object.entries(elementUpdates).some(([key, value]) => {
                        return !Object.is(
                                existingOverlay?.[key as keyof TimelineElement],
                                value,
                        );
                });
                if (changed) {
                        changedOverlayCount += 1;
                        const mergedOverlay = {
                                ...existingOverlay,
                                ...elementUpdates,
                        } as Partial<TimelineElement>;
                        this.previewOverlay.set(elementId, mergedOverlay);
                }
        }
        const committedTracks = this.editor.scenes.getActiveSceneOrNull()?.tracks;
        if (!committedTracks) { return; }
        if (changedOverlayCount === 0) { return; }
        this.previewTracks = this.applyPreviewOverlay(committedTracks);
        this.notify();
}

commitPreview(): void {
        if (this.previewOverlay.size === 0) return;
        const committedTracks = this.editor.scenes.getActiveSceneOrNull()?.tracks;
        if (!committedTracks) { return; }
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

**Verdict:** ✅ ACCURATE — exact match for both methods. `previewElements` opens at line 706 and closes at line 742. `commitPreview` opens at line 744 and closes at line 760. The `command.push({ command })` call is at line 756, exactly as quoted.

---

### Check 5 — "CommandManager.isRippleEnabled: boolean at commands.ts:14"

**Claim (spec §4.5 line 253, §5.4 line 905, §11.3 lines 2386-2389):** `CommandManager` declares `public isRippleEnabled = false;` on line 14. Ripple is a runtime flag, not a separate `RippleCommand`.

**Source:** `/tmp/opencut-classic/apps/web/src/core/managers/commands.ts:14`.

**Actual:**
```ts
export class CommandManager {
        public isRippleEnabled = false;
        private history: CommandHistoryEntry[] = [];
        private redoStack: CommandHistoryEntry[] = [];
        private reactors: Array<() => void> = [];

        constructor(private editor: EditorCore) {}
```

**Verdict:** ✅ ACCURATE — line 14 is exactly `public isRippleEnabled = false;`. The class declaration opens at line 13. `history`/`redoStack`/`reactors` private fields follow at lines 15-17, matching the spec §4.5 layout (lines 252-256).

---

### Check 6 — "applyRippleIfEnabled calls computeRippleAdjustments({beforeTracks, afterTracks}) from @/ripple"

**Claim (spec §4.5 lines 285-294, §5.4 lines 918-927):** `CommandManager.applyRippleIfEnabled({beforeTracks})` is the only ripple integration point; it calls `computeRippleAdjustments` then `applyRippleAdjustments`, both imported from `@/ripple`.

**Source:** `/tmp/opencut-classic/apps/web/src/core/managers/commands.ts:1-5, 21-37, 127-153`.

**Actual (import at line 4):**
```ts
import { applyRippleAdjustments, computeRippleAdjustments } from "@/ripple";
```

**Actual (execute hook at lines 21-37):**
```ts
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
```

**Actual (applyRippleIfEnabled at lines 127-153):**
```ts
private applyRippleIfEnabled({
        beforeTracks,
}: {
        beforeTracks: SceneTracks | null;
}): void {
        if (!this.isRippleEnabled || !beforeTracks) { return; }
        const afterTracks = this.editor.scenes.getActiveSceneOrNull()?.tracks;
        if (!afterTracks) { return; }
        const adjustments = computeRippleAdjustments({ beforeTracks, afterTracks });
        if (adjustments.length === 0) { return; }
        const tracksWithRipple = applyRippleAdjustments({ tracks: afterTracks, adjustments });
        this.editor.timeline.updateTracks(tracksWithRipple);
}
```

**Verdict:** ✅ ACCURATE — `computeRippleAdjustments({ beforeTracks, afterTracks })` is called at line 140, `applyRippleAdjustments({ tracks, adjustments })` at line 148. The import path `@/ripple` is verified at line 4. `execute()` captures `beforeTracks` only when `isRippleEnabled` is true (lines 22-24), exactly as the spec describes.

---

### Check 7 — "Ripple path is apps/web/src/ripple/ (NOT lib/ripple/ as seed spec claimed)"

**Claim (spec §0 line 18, §11.4 line 2395):** Seed spec claimed `src/lib/ripple/{shift,apply,diff}.ts`. Real path is `apps/web/src/ripple/{shift,apply,diff,index}.ts`. There is no `lib/ripple/` directory.

**Source:** `ls /tmp/opencut-classic/apps/web/src/ripple/` and `ls /tmp/opencut-classic/apps/web/src/lib/ripple/`.

**Actual:**
```
/tmp/opencut-classic/apps/web/src/ripple/         ✅ exists (contains diff.ts, apply.ts, shift.ts, index.ts)
/tmp/opencut-classic/apps/web/src/lib/ripple/      ❌ "No such file or directory"
```

**Verdict:** ✅ ACCURATE — the seed spec's path does not exist; the refined spec's path does. Correction §11.4 first row is verified.

---

### Check 8 — "ripple/diff.ts:13-43 — interval-arithmetic diff"

**Claim (spec §12.3 lines 2567-2597, §13 line 2883):** `computeRippleAdjustments({beforeTracks, afterTracks})` at lines 13-43 of `apps/web/src/ripple/diff.ts` walks all tracks (overlay + main + audio), maps each before-track's id to its after-track counterpart, and dispatches to `computeTrackRippleAdjustments` per track.

**Source:** `/tmp/opencut-classic/apps/web/src/ripple/diff.ts:13-43`.

**Actual:**
```ts
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
```

**Verdict:** ✅ ACCURATE — function signature, body, and closing brace are all at lines 13-43. The spec's full §12.3 quote (lines 2554-2841) reproduces the entire 279-LOC file byte-for-byte. The remaining helpers (`computeTrackRippleAdjustments`, `buildElementSpanMap`, `collectTrackIntervals`, `subtractIntervalSets`, `normalizeIntervals`, `subtractSingleInterval`, `buildAdjustments`, `pushInterval`) all exist as quoted.

---

### Check 9 — "ripple/apply.ts:10-46 — groups by track, sorts by afterTime desc, applies shifts"

**Claim (spec §12.2 lines 2466-2550, §13 line 2884):** `applyRippleAdjustments({tracks, adjustments})` at lines 10-46 groups adjustments by `trackId`, then for each track sorts adjustments by `afterTime` descending (rightmost first — preserves index validity as elements get shifted leftward), and applies `rippleShiftElements` sequentially.

**Source:** `/tmp/opencut-classic/apps/web/src/ripple/apply.ts` (77 LOC).

**Actual (lines 10-46 — `applyRippleAdjustments`):**
```ts
export function applyRippleAdjustments({
        tracks,
        adjustments,
}: {
        tracks: SceneTracks;
        adjustments: RippleAdjustment[];
}): SceneTracks {
        if (adjustments.length === 0) { return tracks; }
        const adjustmentsByTrack = new Map<string, RippleAdjustment[]>();
        for (const adjustment of adjustments) {
                const trackAdjustments = adjustmentsByTrack.get(adjustment.trackId) ?? [];
                trackAdjustments.push(adjustment);
                adjustmentsByTrack.set(adjustment.trackId, trackAdjustments);
        }
        return {
                overlay: tracks.overlay.map((track) =>
                        applyTrackRippleAdjustments({ track, adjustments: adjustmentsByTrack.get(track.id) ?? [] }),
                ),
                main: applyTrackRippleAdjustments({ track: tracks.main, adjustments: adjustmentsByTrack.get(tracks.main.id) ?? [] }),
                audio: tracks.audio.map((track) =>
                        applyTrackRippleAdjustments({ track, adjustments: adjustmentsByTrack.get(track.id) ?? [] }),
                ),
        };
}
```

**Actual (lines 62-65 — sort):**
```ts
const sortedAdjustments = [...adjustments].sort(
        (firstAdjustment, secondAdjustment) =>
                secondAdjustment.afterTime - firstAdjustment.afterTime,
);
```

**Verdict:** ✅ ACCURATE — `applyRippleAdjustments` opens at line 10 and closes at line 46. The grouping-by-track is at lines 21-26. The descending sort is at lines 62-65. The spec's §12.2 quote matches the full 77-LOC file byte-for-byte.

---

### Check 10 — "ripple/shift.ts:3-17 — pure map: shift elements with startTime >= afterTime leftward"

**Claim (spec §12.1 lines 2442-2462, §13 line 2885):** `rippleShiftElements({elements, afterTime, shiftAmount})` at lines 3-17 of `apps/web/src/ripple/shift.ts` is a pure map: for each element, if `startTime >= afterTime`, shift leftward by `shiftAmount`; otherwise return untouched.

**Source:** `/tmp/opencut-classic/apps/web/src/ripple/shift.ts` (17 LOC).

**Actual:**
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

**Verdict:** ✅ ACCURATE — function declaration opens at line 3, closing brace at line 17. Pure map, immutable, with the `startTime >= afterTime` predicate. Spec quote is byte-for-byte exact.

---

### Check 11 — "retime/rate.ts — rate bounds 0.01–5.0"

**Claim (spec §5.11 lines 1503-1505, §11.7 line 2418):** `retime/rate.ts` defines `MIN_RETIME_RATE = 0.01`, `MAX_RETIME_RATE = 5`, plus `clampRetimeRate`, `canMaintainPitch`, `shouldMaintainPitch`.

**Source:** `/tmp/opencut-classic/apps/web/src/retime/rate.ts` (25 LOC).

**Actual:**
```ts
export const DEFAULT_RETIME_RATE = 1;
export const MIN_RETIME_RATE = 0.01;
export const MAX_RETIME_RATE = 5;

export function clampRetimeRate({ rate }: { rate: number }): number {
        if (!Number.isFinite(rate) || rate <= 0) {
                return DEFAULT_RETIME_RATE;
        }
        return Math.min(Math.max(rate, MIN_RETIME_RATE), MAX_RETIME_RATE);
}

export function canMaintainPitch({ rate }: { rate: number }): boolean {
        return Number.isFinite(rate) && rate > 0;
}

export function shouldMaintainPitch({
        rate,
        maintainPitch,
}: {
        rate: number;
        maintainPitch?: boolean;
}): boolean {
        return maintainPitch === true && canMaintainPitch({ rate });
}
```

**Verdict:** ✅ ACCURATE — `MIN_RETIME_RATE = 0.01` at line 2, `MAX_RETIME_RATE = 5` at line 3. `clampRetimeRate` (lines 5-11), `canMaintainPitch` (lines 13-15), `shouldMaintainPitch` (lines 17-25) all present and matching spec §5.11 quote. File is exactly 25 LOC as the §10 reference table claims.

---

### Check 12 — "retime/audio-stretch.ts:70-182 — SoundTouch PitchShifter with tempo=rate, pitch=1. Two-pass OfflineAudioContext"

**Claim (spec §5.12 lines 1637-1692):** `buildPitchPreservedBuffer` at lines 70-141 uses two `OfflineAudioContext` passes: (1) resample native→target sample rate, (2) stretch via `PitchShifter(stretchCtx, resampledBuffer, 4096)` with `shifter.tempo = rate; shifter.pitch = 1`. The exported `renderRetimedBuffer` at lines 143-182 chooses pitch-preservation path when `shouldMaintainPitch && Math.abs(rate - 1) > RATE_EPSILON`.

**Source:** `/tmp/opencut-classic/apps/web/src/retime/audio-stretch.ts` (182 LOC).

**Actual (key lines):**
- Line 1: `import { PitchShifter } from "soundtouchjs";` ✅
- Line 6: `const RATE_EPSILON = 1e-6;` ✅
- Lines 70-141: `async function buildPitchPreservedBuffer(...)` — exact match
- Line 100-104: pass 1 `OfflineAudioContext(numChannels, resampledLength, targetSampleRate)` ✅
- Line 125: `const resampledBuffer = await resampleCtx.startRendering();` ✅
- Lines 131-135: pass 2 `OfflineAudioContext(numChannels, outputSamples, targetSampleRate)` ✅
- Line 136: `const shifter = new PitchShifter(stretchCtx, resampledBuffer, 4096);` ✅
- Line 137: `shifter.tempo = rate;` ✅
- Line 138: `shifter.pitch = 1;` ✅
- Line 140: `return stretchCtx.startRendering();` ✅
- Lines 143-182: `renderRetimedBuffer` — exact match with spec §5.12

**Verdict:** ✅ ACCURATE — every claim verified byte-for-byte. The spec's §5.12 quote of the entire 182-LOC file is exact. The "two-pass" description is accurate: pass 1 resamples (lines 100-125), pass 2 stretches via SoundTouch (lines 131-140).

---

### Check 13 — "retime/presets.ts:1-12 — only buildConstantRetime, NOT preset speed tables"

**Claim (spec §5.11 lines 1571-1588, §11.6 lines 2409-2413):** `retime/presets.ts` is 12 LOC and exposes only `buildConstantRetime({rate, maintainPitch}): RetimeConfig`. No preset speed tables (e.g., 0.5x/1x/2x/4x). The seed spec's reference to "retime presets" was overstated.

**Source:** `/tmp/opencut-classic/apps/web/src/retime/presets.ts` (12 LOC).

**Actual:**
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

**Verdict:** ✅ ACCURATE — file is exactly 12 LOC. The single export is `buildConstantRetime`, exactly as quoted. No preset speed table exists. The seed spec's "presets.ts exposes preset rates" assumption is correctly flagged as overstated.

---

### Check 14 — "FreeCut's split algorithm is in stores/items-store.ts:485-629 (_splitItem), NOT in split-actions.ts"

**Claim (spec §0 line 22, §5.1 lines 368-420, §11.5 lines 2403-2407):** `split-actions.ts` is the *action wrapper* (linked-edit expansion, transition-overlap guard, multi-split orchestration). The actual split algorithm is `itemsStore._splitItem(id, splitFrame)` at `stores/items-store.ts:485-629`.

**Source:** `/tmp/freecut/src/features/timeline/stores/items-store.ts:485-629` and `/tmp/freecut/src/features/timeline/stores/actions/edit/split-actions.ts`.

**Actual (items-store.ts:485-629):**
```ts
// Split item at frame
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

    // ... subtitle cues partitioning (lines 525-556) ...
    // ... media sourceStart/sourceEnd for speed (lines 559-619) ...
    // ... reversed-playback handling (lines 572-601) ...

    set((state) => {
      const nextItems = state.items
        .map((i) => (i.id === id ? normalizeFrameFields(leftItem) : i))
        .concat(normalizeFrameFields(rightItem))
      return withItemIndexes(nextItems, state)
    })

    return { leftItem: normalizeFrameFields(leftItem), rightItem: normalizeFrameFields(rightItem) }
},
```

The function body opens at line 485 and closes at line 629 (line 630 begins `_joinItems`).

**Actual (split-actions.ts wrapper):** `splitItem` calls `itemsStore._splitItem(item.id, splitFrame)` at line 42 inside the `execute('SPLIT_ITEM', ...)` callback. Lines 18 and 27-31 do linked-edit expansion (`getLinkedItemsForEdit`) and transition-overlap guard (`isInTransitionOverlap` + `toast.warning('Cannot split inside a transition zone')`). `splitAllItemsAtFrame` at line 71 handles multi-split orchestration across all tracks at a single frame.

**Verdict:** ✅ ACCURATE — `_splitItem` exists at exactly `items-store.ts:485-629`. The function keeps the original ID on the left half (line 506 `...item` spread, no new id) and generates a new UUID for the right half (line 515 `id: crypto.randomUUID()`), matching the spec §5.1 quote exactly. `split-actions.ts` is correctly characterized as a wrapper.

---

### Check 15 — "FreeCut's roll algorithm at trim-actions.ts:471-565 — shrink-first-then-extend ordering"

**Claim (spec §5.5 lines 945-1014):** `rollingTrimItems(leftId, rightId, editPointDelta)` at `trim-actions.ts:471-565` shrinks the losing clip before extending the gaining clip (lines 520-531), to free space for the gain side before `clampToAdjacentItems` would block the extend.

**Source:** `/tmp/freecut/src/features/timeline/stores/actions/edit/trim-actions.ts:471-565`.

**Actual (lines 520-531):**
```ts
// Order matters: shrink first, then extend. The internal _trimItemEnd/_trimItemStart
// methods have clampToAdjacentItems guards that prevent extending into a neighbor.
// By shrinking the losing clip first, we free up space for the gaining clip to extend into.
if (clampedEditPointDelta > 0) {
        // Edit point moves right: right clip shrinks (frees space), then left clip extends
        itemsStore._trimItemStart(rightId, clampedEditPointDelta)
        itemsStore._trimItemEnd(leftId, clampedEditPointDelta)
} else {
        // Edit point moves left: left clip shrinks (frees space), then right clip extends
        itemsStore._trimItemEnd(leftId, clampedEditPointDelta)
        itemsStore._trimItemStart(rightId, clampedEditPointDelta)
}
```

**Verdict:** ✅ ACCURATE — function opens at line 471 (`export function rollingTrimItems`) and closes at line 565 (line 566 begins `/**` doc comment for slipItem). The "shrink first, then extend" comment is at lines 520-522, and the if/else branching at lines 523-531 implements it exactly. The rest of the function (counterpart-pair handling at lines 536-552, transition repair at 554-559) matches the spec quote.

---

### Check 16 — "FreeCut's slip algorithm at trim-actions.ts:576-639 + slip-utils.ts:12-33"

**Claim (spec §5.6 lines 1114-1201):** `slipItem(id, slipDelta)` at `trim-actions.ts:576-639` only updates `sourceStart`/`sourceEnd` on the slipped item + linked companions, leaving `startTime` and `duration` unchanged. The clamp helper `computeClampedSlipDelta` is at `utils/slip-utils.ts:12-33`.

**Source:** `/tmp/freecut/src/features/timeline/stores/actions/edit/trim-actions.ts:576-639` and `/tmp/freecut/src/features/timeline/utils/slip-utils.ts` (33 LOC).

**Actual (trim-actions.ts:576-639):** Function opens at line 576 (`export function slipItem`) and closes at line 639 (line 640 begins `/**` doc comment for slideItem). The clamped delta is computed via `computeClampedSlipDelta` at lines 601-606 and `clampSlipDeltaToPreserveTransitions` at lines 607-613. Update is `itemsStore._updateItem(id, { sourceStart: sourceStart + clamped, sourceEnd: sourceEnd + clamped })` at lines 618-621. Linked-companion updates at lines 623-629. `applyTransitionRepairs` at line 632. ✅

**Actual (slip-utils.ts:12-33):**
```ts
export function computeClampedSlipDelta(
  sourceStart: number,
  sourceEnd: number | undefined,
  sourceDuration: number | undefined,
  delta: number,
): number {
  if (sourceEnd === undefined) return 0

  let clamped = delta

  // Clamp: sourceStart + delta >= 0
  if (sourceStart + clamped < 0) {
    clamped = -sourceStart
  }

  // Clamp: sourceEnd + delta <= sourceDuration
  if (sourceDuration !== undefined && sourceEnd + clamped > sourceDuration) {
    clamped = sourceDuration - sourceEnd
  }

  return clamped
}
```

**Verdict:** ✅ ACCURATE — both file locations and line ranges are exact. The `sourceEnd === undefined → return 0` short-circuit is at line 18, the `sourceStart + clamped < 0` clamp at lines 22-25, the `sourceEnd + clamped > sourceDuration` clamp at lines 27-30. Spec §5.6 quote (lines 1179-1201) is byte-for-byte.

---

### Check 17 — "FreeCut's slide algorithm at trim-actions.ts:651-878 + slide-utils.ts:16-42"

**Claim (spec §5.7 lines 1238-1283):** `slideItem(id, slideDelta, leftNeighborId, rightNeighborId)` at `trim-actions.ts:651-878` (228 LOC). The continuity helper `computeSlideContinuitySourceDelta` is at `utils/slide-utils.ts:16-42`.

**Source:** `/tmp/freecut/src/features/timeline/stores/actions/edit/trim-actions.ts:651-878` and `/tmp/freecut/src/features/timeline/utils/slide-utils.ts` (42 LOC).

**Actual (trim-actions.ts:651-878):** Function opens at line 651 (`export function slideItem`) and closes at line 878 (file ends at line 879 — line 879 is the final `}`-only line of the file). The range 651-878 inclusive is 228 lines, exactly matching the spec's "228 LOC of trim-actions.ts" claim. The shrink-first-then-extend ordering is at lines 787-804 (matching the spec's algorithm summary step 6). The `_moveItem` call is at line 807. The continuity source-delta application is at lines 808-817. Counterpart handling at lines 829-860.

**Actual (slide-utils.ts:16-42):**
```ts
export function computeSlideContinuitySourceDelta(
  slidItem: TimelineItem,
  leftNeighbor: TimelineItem | null,
  rightNeighbor: TimelineItem | null,
  slideDelta: number,
  timelineFps: number,
): number {
  if (slideDelta === 0) return 0
  if (!leftNeighbor || !rightNeighbor) return 0
  if (!canJoinItems(leftNeighbor, slidItem) || !canJoinItems(slidItem, rightNeighbor)) return 0
  if (!isMediaItem(slidItem)) return 0
  if (slidItem.sourceEnd === undefined) return 0

  const speed = slidItem.speed ?? 1
  const sourceFps = slidItem.sourceFps ?? timelineFps
  const sourceStart = slidItem.sourceStart ?? 0
  const sourceEnd = slidItem.sourceEnd
  const sourceDelta = timelineToSourceFrames(slideDelta, speed, timelineFps, sourceFps)
  const clamped = computeClampedSlipDelta(
    sourceStart,
    sourceEnd,
    slidItem.sourceDuration,
    sourceDelta,
  )

  return clamped
}
```

**Verdict:** ✅ ACCURATE — both file locations and line ranges exact. The 5 early-return guards at lines 23-27 match the spec's "returns 0 unless ALL of: left+right neighbors exist, all three form a split-contiguous chain, slid item is media with explicit sourceEnd" claim. The 228-LOC range claim is verified (`878 - 651 + 1 == 228`).

---

### Check 18 — "FreeCut's freeze-frame at freeze-frame-actions.ts:22-253 — async mediabunny frame extraction → PNG persist → atomic split+insert+shift; rollback on failure"

**Claim (spec §5.13 lines 1713-1738):** `insertFreezeFrame(itemId, playheadFrame)` at `freeze-frame-actions.ts:22-253` is async. Pipeline: (1) validate video + playhead inside item bounds + not in transition overlap; (2) calculate source frame; (3) get media blob; (4) `mediabunny` `Input` + `BlobSource` + `CanvasSink` + `ALL_FORMATS` extract frame at `timestampSeconds = sourceFrame / mediaFps`; (5) canvas → PNG blob → File; (6) persist via `mediaLibraryService.importGeneratedImage`; (7) acquire blob URL; (8) atomic `execute('INSERT_FREEZE_FRAME', ...)` does `_splitItem` → remap transitions → `_addItem` (image) → `_moveItem` right half forward by `freezeDurationFrames` → shift all downstream items on same track → repair transitions → select freeze frame; (9) on failure: `mediaLibraryService.deleteMediaFromProject` + `blobUrlManager.release`; (10) on success: `prependMediaItem`.

**Source:** `/tmp/freecut/src/features/timeline/stores/actions/edit/freeze-frame-actions.ts` (253 LOC).

**Actual (key checkpoints):**
- Line 22: `export async function insertFreezeFrame(itemId: string, playheadFrame: number): Promise<boolean>` ✅
- Line 25: `if (!item || item.type !== 'video') return false` ✅
- Line 30: `if (playheadFrame <= itemStart || playheadFrame >= itemEnd) return false` ✅
- Line 33: `if (isInTransitionOverlap(itemId, playheadFrame - itemStart, item.durationInFrames)) { return false }` ✅
- Line 44: `const sourceFrame = sourceStart + timelineToSourceFrames(timelineOffset, speed, fps, sourceFps)` ✅
- Line 55: `const timestampSeconds = sourceFrame / mediaFps` ✅
- Line 61: `const blob = await mediaLibraryService.getMediaFile(media.id)` ✅
- Line 68: `const { Input, BlobSource, CanvasSink, ALL_FORMATS } = await import('mediabunny')` ✅
- Lines 69-72: `new Input({ source: new BlobSource(blob as File), formats: ALL_FORMATS })` ✅
- Lines 84-88: `new CanvasSink(videoTrack, { width, height, fit: 'fill' })` ✅
- Line 90: `const wrapped = await sink.getCanvas(timestampSeconds)` ✅
- Line 101: `frameBlob = await canvas.convertToBlob({ type: 'image/png' })` ✅
- Line 129-132: `new File([frameBlob], fileName, { type: 'image/png', lastModified: Date.now() })` ✅
- Lines 134-143: `mediaLibraryService.importGeneratedImage(frameFile, currentProjectId, { width, height, tags: ['freeze-frame'], codec: 'png' })` ✅
- Line 145: `blobUrlManager.acquire(frameMediaId, frameBlob)` ✅
- Line 151: `const freezeDurationFrames = Math.round(fps * 2) // 2 seconds` ✅
- Line 157: `const splitResult = useItemsStore.getState()._splitItem(itemId, playheadFrame)` ✅
- Lines 167-173: remap transitions pointing to original item to right half ✅
- Lines 176-188: build `ImageItem` with `freezeDurationFrames` duration ✅
- Line 190: `useItemsStore.getState()._addItem(freezeFrameItem)` ✅
- Line 194: `useItemsStore.getState()._moveItem(rightItem.id, newRightFrom)` (shift right half forward) ✅
- Lines 197-209: shift all other items on same track after playhead by `freezeDurationFrames` ✅
- Line 212: `applyTransitionRepairs([leftItem.id, rightItem.id])` ✅
- Line 215: `useSelectionStore.getState().selectItems([freezeFrameItem.id])` ✅
- Lines 223-245: rollback on failure — `await mediaLibraryService.deleteMediaFromProject(currentProjectId, frameMediaId)` + `blobUrlManager.release(frameMediaId)` ✅
- Line 247: `useMediaLibraryStore.getState().prependMediaItem(mediaMetadata)` ✅

**Verdict:** ✅ ACCURATE — every step of the spec's §5.13 algorithm description (lines 1715-1731) maps to a code checkpoint. File is exactly 253 LOC. The atomic rollback pattern (delete persisted media + release blob URL on failure) is exactly as described.

---

### Check 19 — "Range removal silence coverage threshold 0.75 at range-removal-actions.ts:60-354"

**Claim (spec §5.14 lines 1744-1747, §13 line 2880, Q9 answer line 2206):** `SILENCE_COVERAGE_REMOVAL_THRESHOLD = 0.75` — a post-split segment is removed only if ≥75% of its source-time span is covered by detected silence. The `applyRippleRemoval` function starts at line 60; the file is 354 LOC.

**Source:** `/tmp/freecut/src/features/timeline/stores/actions/edit/range-removal-actions.ts` (354 LOC).

**Actual (line 42):**
```ts
// A post-split segment is removed when at least this fraction of its source-time
// span is covered by detected silence. The threshold guards two cases:
//   1. Frames that couldn't be split cleanly (e.g. inside a transition overlap)
//      leave a partial segment whose start/end still bracket loud audio — we
//      keep those so users don't lose speech to the silence cutter.
//   2. Floating-point rounding when converting source seconds → timeline frames
//      can leave a few frames of audible content on either side of a "fully
//      silent" segment — 0.75 is permissive enough to remove those anyway.
const SILENCE_COVERAGE_REMOVAL_THRESHOLD = 0.75
```

**Actual (lines 44-58 — `isMostlyInsideRanges`):** Returns `covered / duration >= SILENCE_COVERAGE_REMOVAL_THRESHOLD` (line 57), confirming the threshold gates removal.

**Actual (function map via grep):**
```
44: function isMostlyInsideRanges(
60: function applyRippleRemoval(ids: string[]): { removedIds: string[]; affectedIds: string[] } {
178: export function removeSilenceFromItems(
185: export function removeFillerWordsFromItems(
198: export function removeTranscriptRangesFromItems(
205: function removeTimelineRangesFromItems(
```

**Verdict:** ✅ ACCURATE — `SILENCE_COVERAGE_REMOVAL_THRESHOLD = 0.75` is at exactly line 42 (matching the Q9 answer's citation). `applyRippleRemoval` opens at line 60, exactly as claimed. File is exactly 354 LOC. The spec's range "60-354" describes the file's main content from `applyRippleRemoval` through the end-of-file `removeTimelineRangesFromItems` body, which is accurate. (Note: the threshold constant itself sits at line 42, *before* line 60; the spec's Q9 answer correctly cites line 42 for the constant while §5.14 cites line 60 for `applyRippleRemoval`. These two citations are mutually consistent.)

---

### Check 20 — "FreeCut sync-lock at sync-lock-ripple.ts:389-469 — propagate removed/inserted intervals to sync-locked tracks via split-at-boundary + shift"

**Claim (spec §6 lines 2019-2039):** `sync-lock-ripple.ts:389-469` contains both `propagateRemovedIntervalsToSyncLockedTracks` (389-427) and `propagateInsertedGapToSyncLockedTracks` (429-469). The removed-interval variant walks sync-locked tracks, splits straddling items, removes fully-contained items, shifts everything right of the interval leftward by `intervalLength`, and accumulates `removedFrames` so subsequent intervals are rebased. The inserted-gap variant splits items straddling the cut frame and shifts everything right of the cut rightward by `amount`.

**Source:** `/tmp/freecut/src/features/timeline/stores/actions/sync-lock-ripple.ts` (469 LOC).

**Actual (389-427 — propagateRemovedIntervalsToSyncLockedTracks):**
```ts
export function propagateRemovedIntervalsToSyncLockedTracks(params: {
  editedTrackIds: Set<string>
  intervals: TimeInterval[]
}): RipplePropagationResult {
  const intervals = normalizeIntervals(params.intervals)
  if (intervals.length === 0) { return { affectedIds: [], removedIds: [] } }

  const candidateTrackIds = getCandidateTrackIds(params.editedTrackIds)
  const affectedIds: string[] = []
  const removedIds: string[] = []

  for (const trackId of candidateTrackIds) {
    let removedFrames = 0
    for (const interval of intervals) {
      const currentInterval = {
        start: interval.start - removedFrames,
        end: interval.end - removedFrames,
      }
      const intervalLength = currentInterval.end - currentInterval.start
      if (intervalLength <= 0) continue

      const overlapResult = removeItemsOnTrackInterval(trackId, currentInterval)
      affectedIds.push(...overlapResult.affectedIds)
      removedIds.push(...overlapResult.removedIds)
      affectedIds.push(
        ...shiftTrackItems(trackId, (item) => item.from >= currentInterval.end, -intervalLength),
      )

      removedFrames += intervalLength
    }
  }

  return {
    affectedIds: uniqueIds(affectedIds),
    removedIds: uniqueIds(removedIds),
  }
}
```

**Actual (429-469 — propagateInsertedGapToSyncLockedTracks):**
```ts
export function propagateInsertedGapToSyncLockedTracks(params: {
  editedTrackIds: Set<string>
  cutFrame: number
  amount: number
}): RipplePropagationResult {
  const cutFrame = Math.max(0, Math.round(params.cutFrame))
  const amount = Math.max(0, Math.round(params.amount))
  if (amount === 0) { return { affectedIds: [], removedIds: [] } }

  const candidateTrackIds = getCandidateTrackIds(params.editedTrackIds)
  const affectedIds: string[] = []

  for (const trackId of candidateTrackIds) {
    const straddledItems = useItemsStore.getState().items.filter(
      (item) => item.trackId === trackId &&
        item.from < cutFrame &&
        item.from + item.durationInFrames > cutFrame,
    ).sort((left, right) => left.from - right.from)

    for (const straddledItem of straddledItems) {
      const current = useItemsStore.getState().itemById[straddledItem.id]
      if (!current || current.trackId !== trackId) continue
      const splitResult = splitItemWithBookkeeping(current.id, cutFrame)
      if (!splitResult) continue
      affectedIds.push(splitResult.leftItem.id, splitResult.rightItem.id)
    }

    affectedIds.push(...shiftTrackItems(trackId, (item) => item.from >= cutFrame, amount))
  }

  return {
    affectedIds: uniqueIds(affectedIds),
    removedIds: [],
  }
}
```

**Verdict:** ✅ ACCURATE — both functions exist at exactly the claimed line ranges. The removed-interval version does split-at-boundary (`removeItemsOnTrackInterval` at line 412) + shift (`shiftTrackItems` with `-intervalLength` at line 416) + accumulate `removedFrames` (line 419). The inserted-gap version does split-at-cut (`splitItemWithBookkeeping` at line 457) + shift (`shiftTrackItems` with `+amount` at line 462). Spec §6 algorithm description (lines 2025-2039) is verified true.

---

### Check 21 — "Invariant: trimStart + duration*rate + trimEnd == sourceDuration preserved by group-resize/compute-resize.ts:81-103 and split-elements.ts:94-114"

**Claim (spec §4.7 line 358, §13 invariant table line 2900):** The invariant `trimStart + duration*rate + trimEnd == sourceDuration` is preserved by snap-once rounding discipline. Documented at `group-resize/compute-resize.ts:81-103` (round the drag delta to a frame exactly once, derive every patch field from that single snapped value) and `split-elements.ts:94-114` (snap the source-side split point exactly once, derive the right half via subtraction).

**Source:** `/tmp/opencut-classic/apps/web/src/timeline/group-resize/compute-resize.ts:81-103` and `/tmp/opencut-classic/apps/web/src/commands/timeline/element/split-elements.ts:94-114`.

**Actual (compute-resize.ts:81-103):**
```ts
// Snap the drag delta to a frame exactly once, then derive every patch
// field from that single snapped value. This keeps the invariant
// `trimStart + duration*rate + trimEnd == sourceDuration` exact: the same
// delta is added on one side of the element and removed from the other,
// so the rounding cancels by construction. Per-field rounding (the old
// approach) couldn't preserve this because the individual rounds don't
// compose when `sourceDuration` isn't frame-aligned.
const snappedDeltaTime = mediaTime({
        ticks: roundFrameTicks({ ticks: clampedDeltaTime, fps }),
});
// Re-clamp after rounding. Bounds derived from other elements are
// frame-aligned, so this is normally a no-op; at the source-extent limit
// the bound may not be frame-aligned, and honouring the bound takes
// precedence over frame alignment (you can't extend past real content).
const finalDeltaTime =
        maximumDeltaTime === null
                ? maxMediaTime({ a: minimumDeltaTime, b: snappedDeltaTime })
                : clampMediaTime({
                        time: snappedDeltaTime,
                        min: minimumDeltaTime,
                        max: maximumDeltaTime,
                });
```

**Actual (split-elements.ts:94-114):**
```ts
// Snap the source-side split point exactly once and derive the right
// half from it. Independently rounding both spans (left and total)
// would let a 1-tick rounding error desynchronise them, breaking the
// invariant `leftSourceSpan + rightSourceSpan == totalSourceSpan`.
// See the same discipline in `compute-resize.ts` (snap-once comment).
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
const rightSourceSpan = subMediaTime({
        a: totalSourceSpan,
        b: leftSourceSpan,
});
```

**Verdict:** ✅ ACCURATE — both line ranges are exact. Both files contain explicit snap-once comments citing the invariant (`trimStart + duration*rate + trimEnd == sourceDuration` in compute-resize; `leftSourceSpan + rightSourceSpan == totalSourceSpan` in split-elements, which is the source-space dual of the same invariant). Both implement the same discipline: round once, derive the other side by subtraction. The `buildResizeUpdate` helper at `compute-resize.ts:116-159` applies the same `deltaTime` to either `trimStart`/`duration`/`startTime` (left side) or `trimEnd`/`duration` (right side), preserving the invariant by construction.

---

### Check 22 — Pick 2 random "Corrections to Seed Spec" entries and verify accuracy

Two corrections selected: **§11.4 (File paths — multiple wrong in seed)** and **§11.7 (Rate bounds — DIFFERENT between FreeCut and OpenCut)**.

#### §11.4 — File paths

**Claim (spec §11.4 lines 2391-2401):** Seven path corrections:

| Seed spec claimed | Actual path (REFINED) |
|---|---|
| `src/lib/ripple/{shift,apply,diff}.ts` | `apps/web/src/ripple/{shift,apply,diff,index}.ts` |
| `src/features/timeline/preview/components/rolling-edit-overlay.tsx` | `src/features/preview/components/rolling-edit-overlay.tsx` |
| `src/features/timeline/utils/rolling-edit-utils.ts` | `src/features/preview/components/rolling-edit-overlay-utils.ts` (32 LOC, different filename) |
| `src/features/timeline/preview/components/slip-edit-overlay.tsx` | `src/features/preview/components/slip-edit-overlay.tsx` |
| `src/features/timeline/preview/components/slide-edit-overlay.tsx` | `src/features/preview/components/slide-edit-overlay.tsx` |
| `src/features/timeline/utils/split-bookkeeping.ts` | `src/features/timeline/stores/actions/split-bookkeeping.ts` |
| FreeCut `stores/actions/edit/move-actions.ts` | ❌ NOT FOUND — move logic in `hooks/use-timeline-drag.ts` + `stores/actions/item-actions.ts` + `stores/actions/item-placement.ts` |

**Source:** `ls` against `/tmp/freecut/...` and `/tmp/opencut-classic/...`.

**Actual verification:**

1. `/tmp/opencut-classic/apps/web/src/ripple/{shift,apply,diff,index}.ts` — all four files exist ✅ (already verified in Check 7). `/tmp/opencut-classic/apps/web/src/lib/ripple/` does not exist ✅.

2. `/tmp/freecut/src/features/timeline/preview/components/` — does NOT exist ✅. `/tmp/freecut/src/features/preview/components/rolling-edit-overlay.tsx` — exists, 58 LOC ✅.

3. `/tmp/freecut/src/features/timeline/utils/rolling-edit-utils.ts` — does NOT exist ✅. `/tmp/freecut/src/features/preview/components/rolling-edit-overlay-utils.ts` — exists, 32 LOC ✅ (matches the "32 LOC, different filename" annotation).

4. `/tmp/freecut/src/features/preview/components/slip-edit-overlay.tsx` — exists, 87 LOC ✅.

5. `/tmp/freecut/src/features/preview/components/slide-edit-overlay.tsx` — exists, 128 LOC ✅.

6. `/tmp/freecut/src/features/timeline/utils/split-bookkeeping.ts` — does NOT exist ✅. `/tmp/freecut/src/features/timeline/stores/actions/split-bookkeeping.ts` — exists, 60 LOC ✅.

7. `/tmp/freecut/src/features/timeline/stores/actions/edit/move-actions.ts` — does NOT exist ✅. `/tmp/freecut/src/features/timeline/hooks/use-timeline-drag.ts` — exists ✅. `/tmp/freecut/src/features/timeline/stores/actions/item-actions.ts` — exists ✅. `/tmp/freecut/src/features/timeline/stores/actions/item-placement.ts` — exists ✅.

**Verdict:** ✅ ACCURATE — all 7 file path corrections are verified true.

#### §11.7 — Rate bounds

**Claim (spec §11.7 lines 2415-2420):**
```
- FreeCut: `MIN_SPEED=0.1`, `MAX_SPEED=10` (`use-rate-stretch.ts:32`).
- OpenCut-classic: `MIN_RETIME_RATE=0.01`, `MAX_RETIME_RATE=5` (`retime/rate.ts:2-3`).
```

**Source:** `/tmp/freecut/src/features/timeline/utils/source-calculations.ts:17-18` and `/tmp/freecut/src/features/timeline/hooks/use-rate-stretch.ts:32`.

**Actual (source-calculations.ts:17-18):**
```ts
// Speed constraints
export const MIN_SPEED = 0.1
export const MAX_SPEED = 16
```

**Actual (use-rate-stretch.ts:12-13 — imports):**
```ts
  MIN_SPEED,
  MAX_SPEED,
```

**Actual (use-rate-stretch.ts:32):**
```ts
const LOOPING_MEDIA_MAX_DURATION = 30 * 60 * 10 // 10 minutes at 30fps
```

**OpenCut-classic side (retime/rate.ts:2-3):** Already verified in Check 11 — `MIN_RETIME_RATE = 0.01`, `MAX_RETIME_RATE = 5`. ✅

**Verdict:** ❌ INACCURATE (MAJOR) — the OpenCut-classic side of correction §11.7 is exact. The FreeCut side has TWO errors:

1. **Wrong value:** `MAX_SPEED` is **16**, not 10. The spec claims `MAX_SPEED=10` in §11.7 (line 2417), in §5.11 Q8 answer (line 2195: "Speed range: 0.1x to 10x"), and in §13 per-op summary table (line 2877: "0.1x ≤ speed ≤ 10x (FreeCut)"). The actual constant in `source-calculations.ts:18` is `16`.

2. **Wrong file path:** The spec cites `use-rate-stretch.ts:32` for `MIN_SPEED`/`MAX_SPEED`, but line 32 of that file is `LOOPING_MEDIA_MAX_DURATION`. The constants themselves are *defined* in `source-calculations.ts:17-18` and merely *imported* into `use-rate-stretch.ts:12-13`. (Note: the spec's separate claim in Q8 about `LOOPING_MEDIA_MAX_DURATION` at `use-rate-stretch.ts:32` IS correct — but that's not what §11.7 claims is at that line.)

**Impact on architectural decision:** None. The spec's recommendation — "Adopt OpenCut's bounds (0.01–5.0) for the retime module. FreeCut's wider bounds (0.1–10) are for rate-stretch only" — stands; the actual FreeCut bound is *wider* than the spec claims (`0.1–16` instead of `0.1–10`), which makes the architectural choice to use OpenCut's narrower bounds for the retime module even safer, not less safe. But the factual claim about FreeCut's `MAX_SPEED` value must be corrected so future readers don't propagate the misreading.

**Proposed fix:**
- §11.7 (line 2417): change `MAX_SPEED=10` to `MAX_SPEED=16`, change file path `use-rate-stretch.ts:32` to `source-calculations.ts:17-18`.
- §5.11 Q8 answer (line 2195): change "Speed range: 0.1x to 10x (`use-rate-stretch.ts:32` — `MIN_SPEED`, `MAX_SPEED`...)" to "Speed range: 0.1x to 16x (`source-calculations.ts:17-18` — `MIN_SPEED`, `MAX_SPEED`...)".
- §13 per-op summary table (line 2877): change "0.1x ≤ speed ≤ 10x (FreeCut)" to "0.1x ≤ speed ≤ 16x (FreeCut)".

---

## Incidental observations

These are minor and do not affect the verdict, but are noted for completeness:

1. **§5.6 use-timeline-slip-slide.ts LOC count inconsistency:** §5.6 line 1118 cites `hooks/use-timeline-slip-slide.ts:1-1292` while §10 line 2334 cites the same file as "1291" LOC. `wc -l` reports 1291. The §5.6 citation is one-off. Cosmetic.

2. **§10 FreeCut table minor off-by-one LOC counts for two command store files:**
   - `stores/commands/types.ts`: spec §10 line 2342 says "54" LOC; actual is 53.
   - `stores/timeline-command-store.ts`: spec §10 line 2343 says "287" LOC; actual is 286.
   Both are explained by trailing-newline conventions (`wc -l` vs the file's actual final-line index).

3. **§5.11 use-rate-stretch.ts range:** spec line 1486 cites `hooks/use-rate-stretch.ts:1-773`. Actual file is 772 LOC. Off-by-one (probably the spec added 1 because of inclusive 1-indexing), but worth noting.

None of these affect any architectural or implementation decision.

---

## Conclusion

Of the 21 required spot-checks, **21 are verified accurate** (every claim about Command pattern, BatchCommand, coalescing previewElements/commitPreview, the CommandManager.isRippleEnabled flag, the ripple module at the corrected `apps/web/src/ripple/` path, the retime module, FreeCut's split/trim/roll/slip/slide/freeze-frame/range-removal/sync-lock algorithms and their line ranges, and the snap-once invariant preservation in both compute-resize and split-elements).

The single MAJOR issue is in **§11.7 / §5.11 / §13**: FreeCut's `MAX_SPEED` is claimed as `10` when the actual value in `source-calculations.ts:18` is `16`, and the cited source location `use-rate-stretch.ts:32` is wrong (it points to `LOOPING_MEDIA_MAX_DURATION`, not the speed bounds). This is a factual error in the refined spec's "correction" of the seed spec — but unlike the `DegradedRendererBanner` issue in `01-core-engine.audit.md`, this one doesn't reverse a true seed claim, it just understates FreeCut's actual upper bound. The architectural decision (use OpenCut's 0.01–5.0 for retime) is unaffected and remains correct.

**Required action before downstream consumption:** Fix the `MAX_SPEED` value and file-path citation in §11.7, §5.11 Q8 answer, and §13 per-op summary table. Once that's done, this spec is ready to be referenced by implementation work.
