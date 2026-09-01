# 06 — NLE Operations: Cut / Split / Trim / Ripple / Roll / Slip / Slide / Move / Lock / Snap

**Stream:** NLE operation logic (pure functions over timeline state)
**Status:** Seed spec (sub-agent scout will refine with code references)
**Primary teacher:** FreeCut `stores/actions/edit/*` (port to pure functions) + OpenCut-classic `lib/ripple/` (diff-based pattern)
**Spec file:** `06-nle-ops.md`

---

## 1. Purpose

Define the operations that modify the timeline: how each one transforms state, how they're composed into commands, and how they integrate with undo/redo. These are pure functions — they take a `SceneState` and return a new `SceneState`. UI integration is in `05-timeline.md`.

---

## 2. Goals

1. **All ops are pure functions.** `op(state, params) → newState`. No side effects, no mutation.
2. **All ops are commands.** Wrapped in `Command` for undo/redo.
3. **All ops preserve invariants.** No overlaps (unless intentional), no gaps (unless ripple off), no negative durations, no out-of-range seeks.
4. **All ops compose.** Multi-select applies the op to all selected elements.
5. **All ops are testable in isolation.** Property-based tests verify invariants hold.

---

## 3. Operation Inventory

| Op | Description | FreeCut reference | OpenCut-classic reference |
|---|---|---|---|
| **Split** | Cut a clip into two at a time | `stores/actions/edit/split-actions.ts` | `commands/timeline/element/split-elements.ts` |
| **Trim** | Change clip start/end (within source bounds) | `stores/actions/edit/trim-actions.ts` | `commands/timeline/element/resize-elements.ts`, `timeline/group-resize/` |
| **Move** | Reposition clip in time and/or to different track | `stores/actions/edit/move-actions.ts` (?) | `commands/timeline/element/move-elements.ts`, `timeline/group-move/` |
| **Ripple** | Shift subsequent clips to close gap (or open gap) | `stores/actions/sync-lock-ripple.ts` | `src/ripple/{shift,apply,diff}.ts` |
| **Roll** | Trim adjacent clips together (preserve total duration) | `stores/actions/rolling-edit-*.ts`, `preview/components/rolling-edit-overlay.tsx` | (not implemented) |
| **Slip** | Shift source in/out within fixed timeline position | `stores/actions/slip-*.ts`, `preview/components/slip-edit-overlay.tsx` | (not implemented) |
| **Slide** | Move clip + shift adjacent clips to fit | `stores/actions/slide-*.ts`, `preview/components/slide-edit-overlay.tsx` | (not implemented) |
| **Delete** | Remove clip | `stores/actions/edit/delete-actions.ts` (?) | `commands/timeline/element/delete-elements.ts` |
| **Ripple Delete** | Remove clip + close gap | (combination) | (combination) |
| **Insert** | Add new clip from media library | (combination) | `commands/timeline/element/insert-elements.ts` |
| **Duplicate** | Copy clip to right | (combination) | `commands/timeline/element/duplicate-elements.ts` |
| **Rate Stretch** | Change clip speed by stretching duration | `stores/actions/edit/rate-stretch-actions.ts`, `hooks/use-rate-stretch.ts` | `src/retime/` |
| **Retime** | Change clip speed (with pitch preservation for audio) | (combination) | `src/retime/{rate,resolve,split,audio-stretch,presets}.ts` |
| **Freeze Frame** | Insert a still frame at a position | `stores/actions/edit/freeze-frame-actions.ts` | (not implemented) |
| **Range Removal** | Remove a time range across all tracks | `stores/actions/edit/range-removal-actions.ts` | (not implemented) |
| **Mute / Solo** | Track-level audio state | `TimelineTrack.muted`/`solo` | `commands/timeline/track/toggle-track-mute.ts` |
| **Lock** | Track-level lock state | `TimelineTrack.locked`, `utils/track-sync-lock.ts` | (not implemented) |
| **Toggle Visibility** | Track-level visibility | `TimelineTrack.visible` | `commands/timeline/track/toggle-track-visibility.ts` |
| **Snap** | During drag/trim, snap to points | `utils/timeline-snap-utils.ts`, `utils/razor-snap.ts` | `timeline/snapping/` |

**Note:** OpenCut-classic doesn't implement roll/slip/slide/track-lock. We **must** port these from FreeCut (the user noted FreeCut is more feature-complete).

---

## 4. State Model

Operations work on `SceneState` — an immutable snapshot of the timeline:

```ts
interface SceneState {
  scene: TScene;
  // Invariants that must hold after any op:
  // - No two elements on the same track overlap (unless layering is enabled)
  // - No element has negative duration
  // - No element starts before time 0
  // - All element.sourceStart + element.sourceDuration <= source.duration
  // - Locked tracks are not modified
}
```

```ts
interface TimelineElement {
  id: string;
  type: 'video' | 'audio' | 'text' | 'image' | 'shape' | 'adjustment';
  trackId: string;
  
  // Timeline position
  startTime: MediaTime;     // absolute time on the timeline
  duration: MediaTime;      // duration on the timeline (after retiming)
  
  // Source position (what part of the source media to use)
  sourceStart: MediaTime;   // offset into the source media
  sourceDuration: MediaTime; // = source media duration used
  
  // Retime (speed multiplier)
  // sourceDuration / duration = speed (1.0 = normal, 2.0 = 2x speed, 0.5 = half speed)
  
  // Audio
  volume: number;           // 0.0 to 1.0
  muted: boolean;
  
  // Visual
  opacity: number;          // 0.0 to 1.0
  visible: boolean;
  
  // Effects & masks
  effects: Effect[];
  masks: Mask[];
  
  // Transitions
  transitionIn?: Transition;
  transitionOut?: Transition;
  
  // Source
  mediaId?: string;          // for video/audio/image
  
  // Name / metadata
  name: string;
  color?: string;            // user-customizable
}

interface Track {
  id: string;
  type: 'video' | 'audio' | 'overlay';
  name: string;
  
  elements: string[];        // element IDs in time order
  
  muted: boolean;
  solo: boolean;
  locked: boolean;
  visible: boolean;
  volume: number;
  
  // For audio tracks
  audioEq?: AudioEq;
}

interface TScene {
  id: string;
  name: string;
  isMain: boolean;
  
  tracks: SceneTracks;
  markers: Marker[];
  bookmarks: Bookmark[];
  settings: SceneSettings;
}

interface SceneTracks {
  overlay: OverlayTrack[];    // text, image, shape, adjustment
  main: VideoTrack;          // single main video track
  audio: AudioTrack[];
}
```

**Adopted from:** OpenCut-classic `apps/web/src/project/types.ts` and `apps/web/src/timeline/types.ts`. Sub-agent scout to verify and refine.

---

## 5. Operations — Detailed Specs

### 5.1 Split

**Description:** Cut one or more clips into two pieces at a given time.

**Params:**
```ts
interface SplitParams {
  time: MediaTime;          // split time (absolute, on timeline)
  trackIds?: string[];     // which tracks to split (default: all)
  elementIds?: string[];    // restrict to specific elements (default: all overlapping time)
}
```

**Algorithm:**
```
For each track in tracks:
  For each element on the track that contains `time` (element.startTime <= time < element.startTime + duration):
    Compute leftPart = { ...element, duration: time - element.startTime, sourceDuration: (time - element.startTime) * speed }
    Compute rightPart = { 
      ...element, 
      id: newId(), 
      startTime: time, 
      duration: element.startTime + element.duration - time,
      sourceStart: element.sourceStart + (time - element.startTime) * speed,
      sourceDuration: (element.startTime + element.duration - time) * speed,
    }
    Replace element with [leftPart, rightPart] in track.elements
```

**Edge cases:**
- Time exactly at element boundary: no split (clip unchanged)
- Time before element start or after end: skip this element
- Multiple elements on the same track at the same time (overlays): split all

**Command:**
```ts
class SplitCommand implements Command {
  id: CommandId;
  label: string;
  
  constructor(private params: SplitParams) {}
  
  execute(state: SceneState): SceneState {
    // Apply split algorithm, return new state
  }
  
  undo(state: SceneState): SceneState {
    // Re-merge split clips (we stored the original element IDs)
  }
}
```

**FreeCut reference:** `src/features/timeline/stores/actions/edit/split-actions.ts` and `src/features/timeline/utils/split-bookkeeping.ts`. Sub-agent to read both.

### 5.2 Trim

**Description:** Change an element's start or end position. Two variants:
- **Left trim:** Change `startTime` and `sourceStart` (and `duration` decreases)
- **Right trim:** Change `duration` (and `sourceDuration` decreases)

**Params:**
```ts
interface TrimParams {
  elementId: string;
  edge: 'start' | 'end';
  delta: MediaTime;          // positive = extend, negative = retract
  ripple?: boolean;          // if true, ripple adjacent clips
}
```

**Constraints:**
- Cannot trim beyond source start (`sourceStart + delta >= 0`)
- Cannot trim beyond source end (`sourceStart + sourceDuration + delta <= sourceDuration`)
- Cannot trim duration to ≤0
- If trimming left would cause overlap with previous clip, prevent (or ripple if `ripple: true`)

**Algorithm (left trim, no ripple):**
```
element = getElement(elementId)
newStartTime = element.startTime + delta
newSourceStart = element.sourceStart + delta
newDuration = element.duration - delta

if (newSourceStart < 0) reject
if (newDuration <= 0) reject

previousElement = getPreviousElement(element)
if (previousElement && previousElement.startTime + previousElement.duration > newStartTime) reject (overlap)

update element.startTime = newStartTime
update element.sourceStart = newSourceStart
update element.duration = newDuration
update element.sourceDuration = newDuration * speed
```

**Algorithm (left trim, with ripple):**
```
... (same as above, but if there would be overlap, ripple the previous element)
if (previousElement && previousElement.startTime + previousElement.duration > newStartTime) {
  rippleShift = newStartTime - (previousElement.startTime + previousElement.duration)
  shiftAllElementsBefore(previousElement, rippleShift)
}
```

**FreeCut reference:** `src/features/timeline/stores/actions/edit/trim-actions.ts`, `src/features/timeline/components/timeline-item/trim-handles.tsx`, `src/features/timeline/utils/trim-utils.ts`, `src/features/timeline/utils/trim-edit-constraints.ts`. Sub-agent to read all.

**OpenCut-classic reference:** `apps/web/src/timeline/group-resize/compute-resize.ts`, `apps/web/src/timeline/hooks/use-timeline-resize.ts`. Sub-agent to read both.

### 5.3 Move

**Description:** Change an element's `startTime` and/or `trackId`.

**Params:**
```ts
interface MoveParams {
  elementIds: string[];       // multi-select
  delta: MediaTime;            // time offset (can be negative)
  targetTrackId?: string;      // if changing track
}
```

**Algorithm:**
```
For each elementId in elementIds:
  element = getElement(elementId)
  newStartTime = element.startTime + delta
  if (newStartTime < 0) clamp or reject
  if (targetTrackId && targetTrackId !== element.trackId):
    validate target track type (can't move audio to video track)
    remove element from old track
    add element to new track
  update element.startTime = newStartTime

After all moves, resolve overlaps:
  For each modified track, check for overlaps.
  Option A: reject the move (if it would cause overlap)
  Option B: shift conflicting elements (ripple-style)
  Option C: allow overlap (if track supports layering — e.g., overlay tracks)
```

**Overlap resolution:** OpenCut-classic has a `placement/` directory with `resolve.ts`, `overlap.ts`, `compatibility.ts`, `insert-index.ts`. Sub-agent to read all and document the algorithm.

### 5.4 Ripple

**Description:** Shift subsequent clips to close a gap (or open a gap). Used by ripple delete and ripple trim.

**Params:**
```ts
interface RippleParams {
  elementIds: string[];       // elements being removed/shifted
  direction: 'left' | 'right';
  delta: MediaTime;            // how much to shift
}
```

**Algorithm:**
```
For each affected track:
  Find the earliest affected element (the leftmost of elementIds)
  For all elements to the right of it:
    shift by delta (negative = shift left, positive = shift right)
  Remove elements that now have negative startTime (or shift them to 0 if allowed)
```

**OpenCut-classic's diff-based approach:**

OpenCut-classic has `src/lib/ripple/{shift,apply,diff}.ts` — a composable, testable ripple system. Sub-agent to read all three files in full.

The pattern (from earlier audit):
- `diff.ts` — compute the diff (what to shift, by how much)
- `shift.ts` — apply the diff to state
- `apply.ts` — orchestration (combines diff + shift, independent of triggering command)

**We adopt OpenCut-classic's diff-based ripple** — it's composable, testable, and the right architectural pattern. FreeCut's ripple is inline in `sync-lock-ripple.ts` — harder to test in isolation.

### 5.5 Roll

**Description:** Trim two adjacent clips together — extend one's end, retract the other's start, total duration preserved.

**Params:**
```ts
interface RollParams {
  leftElementId: string;
  rightElementId: string;
  delta: MediaTime;            // positive = roll right (left gets longer), negative = roll left
}
```

**Constraints:**
- Both elements must be adjacent (rightElement.startTime === leftElement.startTime + leftElement.duration)
- Cannot extend left element beyond its source end
- Cannot extend right element beyond its source start (delta negative case)
- Cannot retract either to ≤0 duration

**Algorithm:**
```
leftElement = getElement(leftElementId)
rightElement = getElement(rightElementId)

newLeftDuration = leftElement.duration + delta
newRightDuration = rightElement.duration - delta
newRightSourceStart = rightElement.sourceStart + delta

// Validate constraints
if (newLeftDuration <= 0 || newRightDuration <= 0) reject
if (rightElement.sourceStart + delta < 0) reject
if (leftElement.sourceStart + leftElement.sourceDuration + delta > leftSourceDuration) reject

// Apply
leftElement.duration = newLeftDuration
leftElement.sourceDuration = newLeftDuration * speed
rightElement.startTime = rightElement.startTime + delta
rightElement.duration = newRightDuration
rightElement.sourceStart = newRightSourceStart
rightElement.sourceDuration = newRightDuration * speed
```

**FreeCut reference:** `src/features/timeline/stores/rolling-edit-preview-store.ts`, `src/features/timeline/preview/components/rolling-edit-overlay.tsx`, `src/features/timeline/utils/rolling-edit-utils.ts`. Sub-agent to read all three.

### 5.6 Slip

**Description:** Shift the source in/out points within a fixed timeline position. Element's `startTime` and `duration` don't change; `sourceStart` changes.

**Params:**
```ts
interface SlipParams {
  elementId: string;
  delta: MediaTime;            // positive = show later source content, negative = earlier
}
```

**Constraints:**
- `sourceStart + delta >= 0`
- `sourceStart + sourceDuration + delta <= sourceDuration` (the source's total duration)

**Algorithm:**
```
element = getElement(elementId)
newSourceStart = element.sourceStart + delta

if (newSourceStart < 0) reject
if (newSourceStart + element.sourceDuration > source.duration) reject

update element.sourceStart = newSourceStart
// startTime and duration unchanged
```

**Visual:** The clip on the timeline doesn't move — but the content shown shifts. Like fast-forwarding within a fixed window.

**FreeCut reference:** `src/features/timeline/stores/slip-edit-preview-store.ts`, `src/features/timeline/preview/components/slip-edit-overlay.tsx`, `src/features/timeline/utils/slip-utils.ts`, `src/features/timeline/hooks/use-timeline-slip-slide.ts`. Sub-agent to read all four.

### 5.7 Slide

**Description:** Move a clip + shift its neighbors to make room. The clip's source content doesn't change, but its timeline position does, and adjacent clips trim to accommodate.

**Params:**
```ts
interface SlideParams {
  elementId: string;
  delta: MediaTime;            // how far to slide
}
```

**Algorithm:**
```
element = getElement(elementId)
newStartTime = element.startTime + delta

// Find left and right neighbors
leftNeighbor = getPreviousElement(element)
rightNeighbor = getNextElement(element)

if (delta > 0):  // sliding right
  // Right neighbor's left trim: retract its start
  // Left neighbor's right trim: extend its end
  newLeftDuration = (element.startTime + delta) - leftNeighbor.startTime
  newRightDuration = (rightNeighbor.startTime + rightNeighbor.duration) - (element.startTime + delta + element.duration)
  newRightSourceStart = rightNeighbor.sourceStart + (delta)
  newRightStartTime = element.startTime + delta + element.duration
else:  // sliding left
  // symmetric
  ...

// Validate constraints
// Apply changes to element + neighbors
```

**FreeCut reference:** `src/features/timeline/stores/slide-edit-preview-store.ts`, `src/features/timeline/preview/components/slide-edit-overlay.tsx`, `src/features/timeline/utils/slide-utils.ts`. Sub-agent to read all three.

### 5.8 Delete

**Description:** Remove element(s) from the timeline.

**Params:**
```ts
interface DeleteParams {
  elementIds: string[];
  ripple?: boolean;            // if true, shift subsequent elements left to close gap
}
```

**Algorithm (no ripple):**
```
For each elementId:
  Remove from track.elements
  Remove from state.elements map
```

**Algorithm (ripple):**
```
For each affected track:
  Find removed elements
  Compute gap = sum of removed element durations
  Shift all elements to the right of the leftmost removed element left by gap
```

### 5.9 Insert

**Description:** Add a new element to the timeline from the media library.

**Params:**
```ts
interface InsertParams {
  mediaId: string;
  trackId: string;
  time: MediaTime;
  sourceStart?: MediaTime;     // default 0
  duration?: MediaTime;         // default = source.duration - sourceStart
}
```

**Algorithm:**
```
mediaInfo = mediaManager.getMediaInfo(mediaId)
element = createElement({
  id: newId(),
  type: mediaInfo.type === 'video' ? 'video' : 'audio',
  trackId,
  startTime: time,
  duration: duration ?? mediaInfo.duration,
  sourceStart: sourceStart ?? 0,
  sourceDuration: duration ?? mediaInfo.duration,
  mediaId,
  name: mediaInfo.name,
  ...
})
// Add to track, possibly rippling subsequent elements
```

### 5.10 Rate Stretch

**Description:** Change an element's playback speed by stretching its duration (keeping source content).

**Params:**
```ts
interface RateStretchParams {
  elementId: string;
  edge: 'start' | 'end';
  delta: MediaTime;
}
```

**Algorithm:**
```
element = getElement(elementId)

if (edge === 'end'):
  newDuration = element.duration + delta
  newSpeed = element.sourceDuration / newDuration
  // sourceStart unchanged, sourceDuration unchanged
  element.duration = newDuration
  element.speed = newSpeed
else (edge === 'start'):
  newStartTime = element.startTime + delta
  newDuration = element.duration - delta
  newSpeed = element.sourceDuration / newDuration
  newSourceStart = element.sourceStart  // unchanged
  // Validate: newDuration > 0
  element.startTime = newStartTime
  element.duration = newDuration
  element.speed = newSpeed
```

**FreeCut reference:** `src/features/timeline/stores/actions/edit/rate-stretch-actions.ts`, `src/features/timeline/hooks/use-rate-stretch.ts`. Sub-agent to read both.

**OpenCut-classic reference:** `apps/web/src/retime/` directory — `rate.ts`, `resolve.ts`, `split.ts`, `audio-stretch.ts`, `presets.ts`. Sub-agent to read all five.

### 5.11 Retime (Speed Change)

**Description:** Change an element's playback speed (with pitch preservation for audio).

**Params:**
```ts
interface RetimeParams {
  elementId: string;
  speed: number;               // 1.0 = normal, 2.0 = 2x, 0.5 = half, -1.0 = reverse
  preservePitch: boolean;       // for audio
}
```

**Algorithm:**
```
element = getElement(elementId)
newDuration = element.sourceDuration / Math.abs(speed)
// (reverse: same duration, but content plays backward)
element.duration = newDuration
element.speed = speed

// For audio: configure SoundTouch AudioWorklet with tempo=speed, pitch=1.0
// For video: decode frames in appropriate order (reverse = decode backward)
```

### 5.12 Freeze Frame

**Description:** Insert a still frame at a position, extending the element.

**Params:**
```ts
interface FreezeFrameParams {
  elementId: string;
  time: MediaTime;              // freeze at this frame
  duration: MediaTime;          // freeze for this long
}
```

**Algorithm:**
```
// Effectively: split the element at `time`, then insert a "freeze" element of `duration` between
// The freeze element has type='image', mediaId=generated-from-frame, sourceStart=time, sourceDuration=1/fps
```

**FreeCut reference:** `src/features/timeline/stores/actions/edit/freeze-frame-actions.ts`. Sub-agent to read.

### 5.13 Range Removal

**Description:** Remove a time range across all tracks (or selected tracks). Useful for cutting out a section across multiple tracks simultaneously.

**Params:**
```ts
interface RangeRemovalParams {
  start: MediaTime;
  end: MediaTime;
  trackIds?: string[];          // default: all
  ripple?: boolean;             // default: true (shift left)
}
```

**Algorithm:**
```
For each track:
  For each element overlapping [start, end]:
    if (element fully inside range): delete
    if (element partially inside range): trim to outside
  If ripple: shift all elements after end left by (end - start)
```

**FreeCut reference:** `src/features/timeline/stores/actions/edit/range-removal-actions.ts`. Sub-agent to read.

### 5.14 Mute / Solo / Lock / Visibility

Track-level state changes. Trivial — just toggle the boolean.

```ts
interface ToggleTrackMuteParams { trackId: string }
interface ToggleTrackSoloParams { trackId: string }
interface ToggleTrackLockParams { trackId: string }
interface ToggleTrackVisibilityParams { trackId: string }
```

**Solo semantics:** When any track is solo'd, only solo'd tracks play. Multiple tracks can be solo'd simultaneously.

**Lock semantics:** Locked tracks cannot be modified by any op. Ops that would modify a locked track must:
- Reject the op (return error)
- Or skip the locked track (if multi-track op)

### 5.15 Snap

Not an op itself — a modifier on other ops (drag, trim, razor). Snapping computes the nearest snap point within a threshold and adjusts the target time.

```ts
interface SnapContext {
  targetTime: MediaTime;
  snapPoints: SnapPoint[];
  threshold: MediaTime;        // snap within this distance
}

function snapToPoints(ctx: SnapContext): MediaTime {
  for (const point of ctx.snapPoints) {
    if (Math.abs(mediaTimeToSeconds({ time: mediaTimeSub(point.time, ctx.targetTime) })) < mediaTimeToSeconds({ time: ctx.threshold })) {
      return point.time;
    }
  }
  return ctx.targetTime;
}
```

**FreeCut reference:** `src/features/timeline/utils/timeline-snap-utils.ts`, `src/features/timeline/utils/razor-snap.ts`, `src/features/timeline/preview/components/snap-guides.tsx`. Sub-agent to read all three.

**OpenCut-classic reference:** `apps/web/src/timeline/snapping/` directory. Sub-agent to read all.

---

## 6. Sync-Lock (Multi-Track Sync)

When one track is edited (e.g., ripple delete), should other tracks ripple too? In professional NLEs, this is "sync-lock" — tracks that are sync-locked ripple together.

**Params:**
```ts
interface SyncLockConfig {
  trackIds: Set<string>;        // tracks that are sync-locked together
}
```

**Behavior:** When a ripple op affects a sync-locked track, the same ripple is applied to all sync-locked tracks (preserving their relative sync).

**FreeCut reference:** `src/features/timeline/utils/track-sync-lock.ts`, `src/features/timeline/stores/actions/sync-lock-ripple.ts`. Sub-agent to read both.

---

## 7. Command Composition

Many user actions compose multiple ops:

| User action | Ops |
|---|---|
| Razor click | `split(time, trackIds)` |
| Drag clip | `move(elementIds, delta, targetTrackId?)` |
| Trim clip right edge | `trim(elementId, 'end', delta)` |
| Ripple delete | `delete(elementIds, ripple=true)` |
| Paste | `insert(mediaId, trackId, time)` × N |
| Cut | `copy(elementIds)` + `delete(elementIds, ripple=true)` |
| Ripple trim | `trim(elementId, edge, delta, ripple=true)` |

Each user action is wrapped in a single `Command` (via `CommandManager.beginTransaction` / `endTransaction`) so undo undoes the whole action.

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

test('no negative durations', () => {
  fc.assert(fc.property(
    arbitrarySceneState(),
    arbitraryOp(),
    (state, op) => {
      const newState = op.execute(state);
      for (const element of allElements(newState)) {
        expect(element.duration).toBeGreaterThan(0);
      }
    }
  ));
});

test('source bounds respected', () => { /* ... */ });
test('locked tracks not modified', () => { /* ... */ });
test('undo restores exact state', () => { /* ... */ });
```

---

## 9. Open Questions for Sub-Agent Scout

1. **FreeCut `stores/actions/edit/split-actions.ts`.** Read in full. Document the split algorithm exactly, including edge cases.

2. **FreeCut `stores/actions/edit/trim-actions.ts` + `utils/trim-utils.ts` + `utils/trim-edit-constraints.ts`.** Read all three. Document the trim algorithm, constraints, and ripple behavior.

3. **FreeCut `stores/actions/edit/move-actions.ts`** (if exists). Document the move algorithm.

4. **FreeCut `stores/actions/sync-lock-ripple.ts` + `utils/track-sync-lock.ts`.** Read both. Document sync-lock behavior.

5. **FreeCut `stores/actions/rolling-edit-*.ts` + `preview/components/rolling-edit-overlay.tsx` + `utils/rolling-edit-utils.ts`.** Read all three. Document the roll edit.

6. **FreeCut `stores/actions/slip-*.ts` + `preview/components/slip-edit-overlay.tsx` + `utils/slip-utils.ts` + `hooks/use-timeline-slip-slide.ts`.** Read all four. Document slip edit.

7. **FreeCut `stores/actions/slide-*.ts` + `preview/components/slide-edit-overlay.tsx` + `utils/slide-utils.ts`.** Read all three. Document slide edit.

8. **FreeCut `stores/actions/edit/rate-stretch-actions.ts` + `hooks/use-rate-stretch.ts`.** Read both. Document rate stretch.

9. **FreeCut `stores/actions/edit/freeze-frame-actions.ts` + `stores/actions/edit/range-removal-actions.ts`.** Read both. Document freeze frame and range removal.

10. **FreeCut `utils/timeline-snap-utils.ts` + `utils/razor-snap.ts`.** Read both. Document snap point computation.

11. **OpenCut-classic `apps/web/src/lib/ripple/`.** Read `shift.ts`, `apply.ts`, `diff.ts` in full. Document the diff-based ripple algorithm. We adopt this pattern.

12. **OpenCut-classic `apps/web/src/timeline/placement/`.** Read `resolve.ts`, `overlap.ts`, `compatibility.ts`, `insert-index.ts`. Document the overlap resolution algorithm.

13. **OpenCut-classic `apps/web/src/timeline/group-move/` and `group-resize/`.** Read all files. Document multi-select move and resize.

14. **OpenCut-classic `apps/web/src/retime/`.** Read `rate.ts`, `resolve.ts`, `split.ts`, `audio-stretch.ts`, `presets.ts`. Document the retime system, especially the audio pitch preservation via SoundTouch.

15. **OpenCut-classic `apps/web/src/commands/timeline/element/`.** Read all command files. Document the command pattern, history management, coalescing.

---

## 10. Test Plan for This Stream

1. **Unit test per op:** each op has unit tests with property-based generators (random state, random params).
2. **Invariant tests:** after any op sequence, invariants hold (no overlaps, no negative durations, source bounds respected, locked tracks untouched).
3. **Undo/redo tests:** apply 50 random ops, undo all, assert state matches initial.
4. **Multi-select tests:** apply op to multi-selection, assert all elements updated correctly.
5. **Integration test:** simulate a rough cut workflow (import 5 clips, arrange, split, trim, ripple delete, transition, export) — assert no errors and final state is correct.
6. **Reference comparison:** render the same project before and after an op; verify only the expected frames changed.

---

**End of `06-nle-ops.md`.** Next: `07-composition.md`.
