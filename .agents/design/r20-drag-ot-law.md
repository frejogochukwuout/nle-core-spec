# R20 — Drag law rewrite: the OT-faithful pass

**Trigger.** User verdict on the R19 drag: "your timeline drag logic is
extremely buggy almost comical — did you follow OT seams at all? it can't
be." Live reproduction confirms it (agent-browser, `timeline--panel-default`):

- Dragging c3 leftward over c2: **c2 teleports +297px right mid-gesture**;
  continuing over c1: c1 +313px; passing everything: both slide back.
  The whole lane dances around the dragged clip.
- Root cause: `previewMove` runs `insertPlacement` (the R19 "Premiere
  insert-edit" improvisation) **on every pointermove**, mutating the live
  doc — while OT never mutates the doc during a drag at all.

**The OT seam (re-read from source, `element-interaction-controller.ts` +
`ops/group-move.ts` + `controllers/drop-target.ts`):**

1. Session: idle → pending (mousedown) → dragging (5px threshold). Doc is
   NEVER mutated during the drag — the React layer renders the mover
   freely from the drag VIEW (`currentTime` + member offsets). Neighbors
   never move mid-gesture.
2. Every mousemove: frame-round the pointer time → `snapGroupEdges`
   (both-edge magnet, nearest wins) → `computeDropTarget` →
   `resolveGroupMove(existingTrack)` validated by
   `canApplyMovesToExistingTracks` (overlap ⇒ null) →
   **`?? newTracksFallback()`** — the escape is a NEW TRACK, not a push.
3. Mouseup: `groupMoveResult` null → NO commit (snap back); else
   `timeline.moveElements({moves, createTracks})` — ONE command.
   Up-within-click-threshold → treated as cancel.
4. There is **no insert-push anywhere in OT.** The R19 "deviation" was a
   redesign masquerading as a seam delta — exactly what the user called
   out.

**The mini's law after this round (windowed OT):**

## 1. Preview (gesture, every event)

- `previewMove` relocates ONLY the mover — computed from the pre-drag
  snapshot (idempotent per event, as now). `insertPlacement` is DELETED.
- Overlap is ALLOWED visually: the mover renders above its lane
  (is-dragging z-index) and, while its span overlaps a same-track
  sibling, paints the honest drop-validity affordance:
  - unlocked → amber dashed outline + `→ V2`-style chip: the drop will
    escape to a new track (OT's new-track fallback through the window).
  - locked → red outline + `no room · locked` chip: the drop will refuse.
- Store: `pushedIds`/`is-pushed` deleted; `dropEscape: null | { trackId:
  string } | 'locked'` takes its place (one field, derived per event).

## 2. Drop (pointerup — `endDrag`)

- **Free span** → commit as today (ONE history entry).
- **Conflict + unlocked** → the OT escape, windowed:
  1. mint a new track of the clip's kind (`V{max+1}` / `A{max+1}` by
     max numeric suffix, appended to that kind's section);
  2. move the clip onto it at the drop position (raw pointer time —
     registered delta: no fps to frame-round);
  3. REBIND the window to the new track (boundVideo/AudioTrack — the
     window follows the clip; OT's canvas stays, the mini's window moves);
  4. selection heals by the existing survive-iff-visible law (the mover
     is on the now-bound track → stays selected);
  5. one history entry (pre-drag doc, via the existing endDrag path);
  6. toast: `No room on V1 — moved to new track V2`.
- **Conflict + trackBindingLocked** → refuse: restore the snapshot doc
  (no history entry), toast `No room on V1 — track binding locked by
  host; drop refused` (the mini's rendering of OT's `{ok:false,
  code:'CONFLICT'}` when the host forbids track creation).
- Esc/pointercancel → cancelDrag (unchanged).
- Programmatic `moveClip` keeps the OT wire law (reject+toast) — already
  correct from R19.

## 3. Robustness fixes found during reproduction

- `startGesture`'s `setPointerCapture` is UNGUARDED — untrusted pointers
  (tests, synthetic dispatch, CDP races) throw NotFoundError and kill the
  event dispatch mid-gesture (live page errors captured). Guard both the
  Timeline capture and the Viewer scrub-bar capture (same class of bug,
  `Viewer.tsx` onPointerDown). OT uses document listeners instead of
  capture — registered micro-delta (capture kept for its outside-element
  tracking; now guarded).

## 4. Magnet

- Unchanged: frozen-field both-edge `magnetMove` (snapGroupEdges
  parity, already tested). A snapped butt-joint is conflict-free by
  construction, so snap and the drop law cannot fight.

## 5. Wave-8 threads (same round)

- `th_mtpf397v` (video-only playhead marker crops off): the
  hover/scrub time pill floats at `top:-31px` above the playhead button;
  in video-only mode there is no headroom above the ruler → clipped.
  Fix: in video-only (no headroom contexts) the pill renders INSIDE the
  ruler band (top edge of the ruler, never above it) — no crop, still
  readable. (User asked "removed"; the pill is the only time readout
  while scrubbing — keeping it but un-cropped is the honest fix; if the
  crop persists the fallback is removal. Verify live both ways.)
- `th_mtpf59ol` (text selection): `user-select: none` on the whole
  timeline panel root (.qc-timeline — ruler + tools + tracks + min
  strip), not just .qc-stage. Area-selection remains possible later
  (user-select does not gate pointer events).

## 6. Test plan (the comedy pinned forever)

1. **Neighbors never move mid-drag** (store + component): drag c3 over
   c2 — c1/c2 EXACTLY at snapshot positions after every preview event.
2. Free-drop commit; one history entry; undo restores.
3. Conflict drop unlocked: V2 minted + clip moved + window rebound +
   mover still selected + toast + one history entry; undo restores doc
   (binding heals via the existing stale-binding law).
4. Conflict drop locked: doc restored bit-for-bit, no history entry,
   refusal toast.
5. `mintTrack` id law (V1,V3 → mints V4 not V3; audio separate series).
6. dropEscape label derivation (V2/A2/locked).
7. setPointerCapture guard: throwing stub + pointerdown → no throw, the
   gesture still runs.
8. Existing magnet/trim/scrub suites stay green (trim previews keep the
   ripple follower law — that is the ripple seam, not the drag seam).

## 7. Docs

- OT-SEAMS.md §1 rows 1/3 + §2 matrix + §4: insert-push GONE, replaced
  by the faithful law + the windowed-escape reasoning; the mockup→library
  swap path simplifies (drag commit ≈ `moveElements({moves,
  createTracks})` 1:1).
- README deviations: the insert-push deviation entries removed; the
  remaining R19 entries renumbered.
- The R19 design doc stays (history); this doc supersedes its drag-law
  section.

## 8. Adversarial-review amendments (adopted in full)

Round 1 of the review (4 P1 + 7 P2) landed AFTER the first draft;
these are binding on the implementation:

1. **Atomic escape** (P1): the new-track drop commits via ONE direct
   `set()` inside `endDrag` — never a sequence of gated setters
   (`setBound*` are drag-gated and history-blind) and never `commit()`
   (interaction-locked mid-drag). Mint + move + rebind + history + toast
   in a single state transition.
2. **Binding-aware history entries** (P1): `past`/`future` become
   `HistoryEntry = {doc, boundVideoTrack, boundAudioTrack}` — undo/redo
   restore the binding pair too, so the escape's rebind is undoable
   exactly (not healed by the view-level stale-binding fallback).
3. **Drop position = preview-rendered position** (P1): `endDrag` commits
   the position the user SAW — the live preview start (magnet included),
   NOT a re-derivation from raw pointer time.
4. **Snap-induced conflicts flow through the drop law** (P1): a magnet
   hit that lands the span on a sibling is a normal conflict → escape /
   refuse. The magnet law does not special-case overlap.
5. **Prefer-existing-free-track before minting** (P2): at the drop
   (and in the chip label), try OTHER existing same-kind tracks of the
   doc that can host the span conflict-free (OT's
   `canApplyMovesToExistingTracks` windowed); mint only when none fits.
6. **Pill crop is structural** (P2): the playhead time pill moves INSIDE
   the ruler band in ALL modes (one law — no mode fork). Ruler = 34px;
   pill sits at overlay y 2–22.
7. **Guard all six capture sites** (P2): `setPointerCapture` in
   try/catch everywhere — Timeline gesture (458), playhead (1178),
   min-strip ruler (1362), full ruler (1445), Splitter (52); Viewer
   (214) already guarded.
8. **Up-within-threshold cancel** (P2): OT treats an up that never left
   the threshold (or returned to origin) as cancel — structurally
   satisfied: the session engages only after the 5px threshold, and a
   returned-to-origin drop commits `changed=false` → no history entry.
9. **dragMoverId session field** (P2): the store records which clip the
   gesture owns (set by previewMove) so `endDrag` can resolve the escape
   without diffing snapshot vs live doc.
