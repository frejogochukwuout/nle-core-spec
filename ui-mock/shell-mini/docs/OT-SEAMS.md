# OT-SEAMS — shell-mini ↔ opencut-timeline seam map

**What this is:** the explicit tracking of every timeline operation the mock
implements against the reference editing-domain engine (`bearachprema/
opencut-timeline`, the "OT" of nle-core-spec 19-code-references Decision 12).
The mini is a MOCK — but its timeline LOGIC is not improvised: every op maps
to an OT surface, and every divergence is registered here with its reason
and the downstream swap path. The goal: when the mock graduates to the real
library, the ops rename, they don't redesign.

**Reference state studied (R19, re-read R20):** `src/lib/timeline/headless/api.ts`
(the 24-command wire surface, `{ok, code}` contract), `types/index.ts`
> **R21 (user P0 revert, 2026-09-06):** the drag rows below describe the
> R19/R20 drag rounds — **RETIRED by the user's directive** ("the last two
> rounds of drag changes made things worse"). The shipped drag law is the
> R18k neighbor clamp again (the mover clamps between same-track
> neighbors, the preview is the commit, plain history entries; no
> insert-push, no escape, no minted tracks). The rows are kept as the
> seam MAP for a future, USER-REQUESTED retry; the mini no longer
> implements them. The one surviving law: neighbors never move mid-gesture.

(SceneTracks, element fields), `ops/group-move.ts` (resolveGroupMove,
resolveExistingTrackMove, canApplyMovesToExistingTracks, resolveNewTrackMove,
snapGroupEdges), `placement/index.ts` (wouldElementOverlap /
canPlaceTimeSpansOnTrack / enforceMainTrackStart), `controllers/`
(element-interaction-controller: idle→pending→dragging session, the doc NEVER
mutated during a drag, threshold 5px, up-within-threshold = cancel,
groupMoveResult null → no commit; drop-target.ts). The R20 pass re-derived
the drag law from this source directly — the R19 "insert-push" improvisation
is gone (see §1.3).

---

## 1. The op map

| # | mini surface (code) | OT seam (code) | Semantics parity | Delta (registered) |
|---|---|---|---|---|
| 1 | **Drag preview** — `previewMove` + `ClipItem` gesture (`useMini.ts`, `Timeline.tsx`) | `element-interaction-controller.ts` drag session (idle → pending → dragging; the DOC is never mutated during the drag — the view renders the mover from the drag session state) | **R22 (user directive — the simple version):** the R18k clamp law is the WHOLE law — the preview mutates the live doc's mover only (neighbors never move under the clamp, so view ≡ doc); the UP seals the LAST PREVIEWED state; one plain history entry; no verdict affordance, no commit-at-UP, no pending windows | OT frame-snaps pointer times (fps); the mini commits the raw pointer time (its mock media has no fps — grid law in `geometry.ts` header). OT uses document listeners; the mini uses (guarded) pointer capture — registered micro-delta. OT's idle→pending→dragging session states map to the mini's 5px threshold + dragActive lock |
| 2 | **Move magnet** — `magnetTarget`/`resolveSnap` (`geometry.ts`) | `group-move.ts snapGroupEdges` + `snapping/index.ts` | **R22 (R18k law restored):** the moving clip's LEFT edge is the only magnet candidate (single-edge); targets = neighbor edges + the LIVE playhead (never self); nearest within 12px wins (the C17 fix survives as a pure-function law) | OT magnets BOTH element edges and recomputes targets live; the mini's single-edge live-field law is the R18k behavior the user explicitly restored (both-edges + frozen-field was retired 2026-09-07). OT adds keyframe + bookmark magnets (the mini has neither) |
| 3 | **Move conflict law** — clampMove (`geometry.ts`, R18k restored) | `resolveGroupMove` → overlap ⇒ null ⇒ no commit | **REVERTED (R21, user P0):** the R20 escape/verdict law was retired; the mover CLAMPS between neighbors (the R18k law) — conflict never reaches the commit | pointer drag clamps instead of resolving (the user's verdict: the escape UX was worse than the clamp) |
| 4 | **Programmatic move** — `moveClip` (`useMini.ts`) | `timeline.move` wire command (overlap ⇒ `{ok:false, code:'CONFLICT'}`) | REJECT on conflict, toast (the mini's error rendering); negative newStart rejected (`requireNonNegativeTicks` parity); dragActive guard BEFORE the toast (no mid-gesture spam) | single move (no `moves[]` batch, no `createTracks[]`); single selection vs `ElementRef[]`; seconds vs ticks |
| 5 | **Insert (pool DnD)** — `insertionAt` + `insertMediaAt` | `timeline.insert` {element, startTimeTicks, strategy: firstAvailable \| explicit} | place a NEW clip on a track | OT `firstAvailable` = requested span free? take it : next TRACK/new track — **no same-track gap hunt**; the mini hunts same-track gaps (exact → next fitting gap → tail) — a mock affordance, registered. The mini's "explicit" = the exact spot only when free (the drop outline). |
| 6 | **Trim** — `previewTrim`/`trimClip` + `clampTrimStart/End` | `timeline.trim` {elements, side: left\|right, deltaTicks} | edge semantics; media (source) bound on BOTH edges; ripple mode ignores the neighbor (followers push) | OT element carries `trimStart/trimEnd/sourceDuration`; the mini's clip is a full window over source from in-point 0 (`media.duration` is the extent). Conversion at swap: `project(clip) → {trimStart: 0, trimEnd: sourceDuration − duration}`. (The thread-#51 ghost-edge affordance was retired with the R22 sweep — the bounds stay the law, the paint is gone.) |
| 7 | **Split** — `splitAtPlayhead` + `splitPoint` | `timeline.split` {elements, splitTimeTicks, retainSide} | quantized, windowed, both halves ≥ MIN_DUR | single clip (selection), retainSide = both always |
| 8 | **Delete** — `deleteSelected` | `timeline.delete` / `timeline.rippleDelete` | the ripple toggle selects which command the button means | shape delta: one toggle + one button vs two commands — fine for a mock; a host maps the toggle to the command choice |
| 9 | **Ripple** — `rippleShiftAfter` + the ripple preview/commit laws | OT ripple family (`timeline.rippleDelete`; the W-series interval-diff ops) | follower shift from the edit point, delta-quantized, floor guard | the mini's uniform-shift + floor laws are the R18e/R18f distilled set, tested |
| 10 | **Seek/scrub** — `setPlayhead` + ruler drag + viewer scrub bar (R19) | `timeline.seek` + `seek-controller` + `playhead-controller` | pointer scrub unquantized; clamped to the measured ruler extent | the viewer bar's extent = `max(contentEnd(bound world), 8)` (runway floor family; ≤ rulerEnd always); Home/End + arrows on the focusable slider |
| 11 | **Selection** — `select` / `selectTrack` | `timeline.selectElements` (ElementRef[]) | ONE inspector subject at a time (clip XOR track) | single-subject vs multi-ref; track selection is a mini surface (the inspector card, thread #26) — OT has no inspector concept |
| 12 | **Undo/redo** — snapshot past/future (plain `Doc` entries; the R20 binding-aware entry was retired with the escape) | `timeline.undo` / `timeline.redo` | snapshot family parity (spec 15 §6.2 strategy 2); one entry per gesture/commit | plain doc snapshots (view-level binding healing covers story-control swaps; drags can no longer rebind) |
| 13 | **Track model** — `Doc.tracks` + binding (`visibleTracks`) | SceneTracks {overlay[], main singleton, audio[]} | the mini renders the BOUND pair (a window onto the project) | **The embedding seam:** OT's canvas is the whole project; the mini's window binds one video + one audio track (`trackMode`, `boundVideoTrack/boundAudioTrack`, `trackBindingLocked` — host-injected). Cross-track moves in OT map to REBINDING in the mini (the selector). Track creation/removal is out of the window (host owns). |
| 14 | **Track heads** — markers / selector / hidden | OT's track headers | — | mini law: multi-track+unlocked → selector; single-pair+unlocked → V1/A1 marker; LOCKED → hidden (thread #28) |

## 2. The drop-law matrix (one lane, two sources)

| Source | Conflict resolution |
|---|---|
| **Pool drag** (new media) | gap-fit: exact spot → next fitting same-track gap → lane tail (never fails; toast reports where) |
| **Clip drag** (rearrange) | **R18k clamp law (R21 user P0 revert):** the mover clamps between same-track neighbors; the preview is the commit; one plain history entry — no escape, no minting, no rebind |
| **Programmatic move** | reject (CONFLICT) + toast |

Registered: the two drag paths intentionally differ — a NEW asset should not
rearrange the timeline (conservative placement), while REARRANGING resolves
conflicts the way OT resolves them (the escape), not by pushing neighbors
(the R19 insert-push improvisation — retired after the user's live verdict
that the mid-gesture neighbor teleportation was "extremely buggy almost
comical").

## 3. The swap path (mockup → library)

1. **Store ops → commands.** Each `useMini` doc action in §1 maps 1:1 to a
   `TimelineCommand` (renames + param shapes only; the validation outcomes
   are already aligned — reject/conflict semantics, media-bounded trims,
   split windowing). The mock's `commit` history becomes the OT snapshot
   transaction batch.
2. **Gesture engine stays.** `ClipItem`'s session (threshold, capture,
   snapshot previews, auto-scroll, commit-at-up) is the VIEW layer OT's
   controllers occupy — the seams (what the gesture resolves to) are the
   commands above.
3. **The window model stays.** Track binding + lock is the mini's embedding
   contribution (host-injected); OT's SceneTracks arrives behind it via
   `setTracks()` (the render seam, spec 19 §2.4) — the mini's `doc` becomes
   a projection of the bound window. The R20 escape (mint + rebind) is
   ALREADY the shape of OT's `moveElements({moves, createTracks})` — the
   drop commit renames 1:1 to that command (the minted track becomes a
   `createTracks` entry).
4. **Time base.** The mini's seconds+0.5 grid converts at the boundary
   (×120000 ticks; the grid becomes the fps quantizer's rounding step —
   the frame-snap law turns on when real media carries fps).

## 4. Registered deviations (README cross-ref)

The living deviation register is the mini README; this file carries the SEAM
reasoning. The load-bearing deviations after R20: same-track gap hunt on
pool drops (§1.5), implicit in-point-0 element model (§1.6), single-subject
selection (§1.11), the bound-window track model (§1.13 — with the R20
windowed escape as its drag rendering). The R19 insert-push deviation is
RETIRED (removed from the register — it was a redesign masquerading as a
seam delta; the R20 law follows OT's actual escape semantics).
