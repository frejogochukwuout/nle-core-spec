# OT-SEAMS — shell-mini ↔ opencut-timeline seam map

**What this is:** the explicit tracking of every timeline operation the mock
implements against the reference editing-domain engine (`bearachprema/
opencut-timeline`, the "OT" of nle-core-spec 19-code-references Decision 12).
The mini is a MOCK — but its timeline LOGIC is not improvised: every op maps
to an OT surface, and every divergence is registered here with its reason
and the downstream swap path. The goal: when the mock graduates to the real
library, the ops rename, they don't redesign.

**Reference state studied (R19):** `src/lib/timeline/headless/api.ts` (the
24-command wire surface, `{ok, code}` contract), `types/index.ts`
(SceneTracks, element fields), `ops/group-move.ts` (resolveGroupMove,
PlannedElementMove), `placement/index.ts` (wouldElementOverlap /
canPlaceTimeSpansOnTrack / enforceMainTrackStart), `controllers/`
(element-interition free-drag + frame snap + drop-target, drag-drop external
media path), `ops/group-move.ts snapGroupEdges` (both-edge magnet).

---

## 1. The op map

| # | mini surface (code) | OT seam (code) | Semantics parity | Delta (registered) |
|---|---|---|---|---|
| 1 | **Drag preview** — `previewMove` + `ClipItem` gesture (`useMini.ts`, `Timeline.tsx`) | `element-interaction-controller.ts` drag session (free follow, threshold, capture, up-resolve) | free drag from the pre-drag snapshot, idempotent per event; commit at the UP position (R19 review P2-11) | OT frame-snaps pointer times (fps); the mini commits the raw pointer time (its mock media has no fps — grid law in `geometry.ts` header) |
| 2 | **Move magnet** — `magnetMove` (`geometry.ts`) | `group-move.ts snapGroupEdges` + `snapping/index.ts` | BOTH edges of the moving element are candidates; nearest wins; ties → left; targets = neighbor edges + playhead (never self) | OT adds keyframe + bookmark magnets (the mini has neither); the mini's magnet field is FROZEN at gesture start (snapshot) — OT recomputes but its followers don't move mid-gesture; ours do (insert preview), so freezing is required to avoid self-magnetization |
| 3 | **Move conflict law** — `insertPlacement` (`geometry.ts`) for the GESTURE | `resolveGroupMove` → `canApplyMovesToExistingTracks` (overlap ⇒ null ⇒ NO commit) + new-track fallback at mouseup | conflict detection identical (interval overlap, exclude self, same-track only) | **The registered core divergence:** OT's escape is a NEW TRACK above/below (multi-track canvas); the mini's window is ONE bound pair (the embedding model — new tracks are the host's world, reached via the selector). The mini's escape is INSERT-PUSH (Premiere insert-edit geometry: first conflicting sibling + tail shift right, floor law, ≤0.25s adjustment on one follower, tail spacing preserved). No split-at-insert (whole-clip relocation — Premiere splits the host). When the shell grows a multi-track canvas, insert-push stays as the magnet alternative and the new-track escape takes over per OT. |
| 4 | **Programmatic move** — `moveClip` (`useMini.ts`) | `timeline.move` wire command (overlap ⇒ `{ok:false, code:'CONFLICT'}`) | REJECT on conflict, toast (the mini's error rendering); negative newStart rejected (`requireNonNegativeTicks` parity); dragActive guard BEFORE the toast (no mid-gesture spam) | single move (no `moves[]` batch, no `createTracks[]`); single selection vs `ElementRef[]`; seconds vs ticks |
| 5 | **Insert (pool DnD)** — `insertionAt` + `insertMediaAt` | `timeline.insert` {element, startTimeTicks, strategy: firstAvailable \| explicit} | place a NEW clip on a track | OT `firstAvailable` = requested span free? take it : next TRACK/new track — **no same-track gap hunt**; the mini hunts same-track gaps (exact → next fitting gap → tail) — a mock affordance, registered. The mini's "explicit" = the exact spot only when free (the drop outline). |
| 6 | **Trim** — `previewTrim`/`trimClip` + `clampTrimStart/End` | `timeline.trim` {elements, side: left\|right, deltaTicks} | edge semantics; media (source) bound on BOTH edges; ripple mode ignores the neighbor (followers push) | OT element carries `trimStart/trimEnd/sourceDuration`; the mini's clip is a full window over source from in-point 0 (`media.duration` is the extent). Conversion at swap: `project(clip) → {trimStart: 0, trimEnd: sourceDuration − duration}`. Ghost edges (thread #51) read the same bound. |
| 7 | **Split** — `splitAtPlayhead` + `splitPoint` | `timeline.split` {elements, splitTimeTicks, retainSide} | quantized, windowed, both halves ≥ MIN_DUR | single clip (selection), retainSide = both always |
| 8 | **Delete** — `deleteSelected` | `timeline.delete` / `timeline.rippleDelete` | the ripple toggle selects which command the button means | shape delta: one toggle + one button vs two commands — fine for a mock; a host maps the toggle to the command choice |
| 9 | **Ripple** — `rippleShiftAfter` + the ripple preview/commit laws | OT ripple family (`timeline.rippleDelete`; the W-series interval-diff ops) | follower shift from the edit point, delta-quantized, floor guard | the mini's uniform-shift + floor laws are the R18e/R18f distilled set, tested |
| 10 | **Seek/scrub** — `setPlayhead` + ruler drag + viewer scrub bar (R19) | `timeline.seek` + `seek-controller` + `playhead-controller` | pointer scrub unquantized; clamped to the measured ruler extent | the viewer bar's extent = `max(contentEnd(bound world), 8)` (runway floor family; ≤ rulerEnd always); Home/End + arrows on the focusable slider |
| 11 | **Selection** — `select` / `selectTrack` | `timeline.selectElements` (ElementRef[]) | ONE inspector subject at a time (clip XOR track) | single-subject vs multi-ref; track selection is a mini surface (the inspector card, thread #26) — OT has no inspector concept |
| 12 | **Undo/redo** — snapshot past/future | `timeline.undo` / `timeline.redo` | snapshot family parity (spec 15 §6.2 strategy 2); one entry per gesture/commit | — |
| 13 | **Track model** — `Doc.tracks` + binding (`visibleTracks`) | SceneTracks {overlay[], main singleton, audio[]} | the mini renders the BOUND pair (a window onto the project) | **The embedding seam:** OT's canvas is the whole project; the mini's window binds one video + one audio track (`trackMode`, `boundVideoTrack/boundAudioTrack`, `trackBindingLocked` — host-injected). Cross-track moves in OT map to REBINDING in the mini (the selector). Track creation/removal is out of the window (host owns). |
| 14 | **Track heads** — markers / selector / hidden | OT's track headers | — | mini law: multi-track+unlocked → selector; single-pair+unlocked → V1/A1 marker; LOCKED → hidden (thread #28) |

## 2. The drop-law matrix (one lane, two sources)

| Source | Conflict resolution |
|---|---|
| **Pool drag** (new media) | gap-fit: exact spot → next fitting same-track gap → lane tail (never fails; toast reports where) |
| **Clip drag** (rearrange) | insert-push: land at the pointer, push the conflicting tail (floor law) |
| **Programmatic move** | reject (CONFLICT) + toast |

Registered: the two drag paths intentionally differ — a NEW asset should not
rearrange the timeline (conservative placement), while REARRANGING is the
clip drag's whole job (the user's one-lane-street complaint, R19 item 3).

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
   a projection of the bound window.
4. **Time base.** The mini's seconds+0.5 grid converts at the boundary
   (×120000 ticks; the grid becomes the fps quantizer's rounding step —
   the frame-snap law turns on when real media carries fps).

## 4. Registered deviations (README cross-ref)

The living deviation register is the mini README (§deviations #15-#21 +
R19 entries); this file carries the SEAM reasoning. The load-bearing R19
deviations: insert-push conflict law (§1.3), same-track gap hunt on pool
drops (§1.5), implicit in-point-0 element model (§1.6), single-subject
selection (§1.11), the bound-window track model (§1.13).
