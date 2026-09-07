# R19 design — drag overhaul, scrubbing, OT seam alignment, wave-7 feedback

**Scope:** user items (1) opencut-timeline seam tracking, (2) UI-spec full update, (3)
timeline drag deep pass, (4) scrubbing enabled; plus annotakit wave 7 (threads
#45–#53, mirror issues on melodietexoss/shell-mini-review).

**Reference surface studied:** `bearachprema/opencut-timeline` @ current HEAD —
`headless/api.ts` (24 prefixed commands, `{ok, code}` error contract),
`types/index.ts` (SceneTracks {overlay[], main singleton, audio[]}; element
{startTime, duration, trimStart, trimEnd, sourceDuration}), `ops/group-move.ts`
(PlannedElementMove {sourceTrackId, targetTrackId, elementId, newStartTime};
overlap-REJECTING resolveGroupMove), `placement/index.ts`
(canPlaceTimeSpansOnTrack / wouldElementOverlap / enforceMainTrackStart /
resolveTrackPlacement with adjustedStartTime gap-fit), controllers
(element-interaction = free drag + frame snap + drop-target; mouseup falls back
to NEW-TRACK creation when an existing-track move is invalid;
drag-drop = external media drops), snapping/index.ts (magnet).

---

## D1 — Move gesture overhaul (the "one-lane street" fix; user item 3)

**Root cause today:** `previewMove` hard-clamps to `[prevEnd, nextStart − dur]`
(geometry.clampMove) — the clip physically cannot pass a neighbor, and
`moveClip` inherits the same clamp. Improvised mock logic; not an OT seam.

**OT law (the seam):** drag is FREE (element follows pointer, frame-snapped +
magnet); the drop resolves via placement: gap-fit on the hovered track
(`adjustedStartTime`), else NEW TRACK above/below (the vertical escape), else
rejected. The wire command `timeline.move` is overlap-REJECTING with a
`CONFLICT` result.

**Mini law (adapted, documented):** the mini's window is a single visible
pair (boundVideo + boundAudio; no track creation inside the window — that is
the embedding story, rebinds go through the selector). The single-pair window
has no vertical escape, and reject-by-default would keep reordering impossible
(packed lanes) — the exact complaint. So the mini's conflict resolution is
**INSERT-PUSH** (the ripple-family uniform tail shift the mini already owns):
dropping where a sibling conflicts lands the clip and shifts the tail right.

1. **Free preview** — `previewMove(id, R)` computes from the pre-drag
   SNAPSHOT every event (idempotent, same discipline as ripple preview):
   - `R = max(0, magnetResolvedPointerTime)`.
   - If `[R, R+dur)` overlaps NO same-track sibling (excluding self) →
     plain move: `clip.start = R` (snapshot-based, never accumulates).
   - Else → insert resolution: `first = earliest-starting conflicting
     sibling`; `delta = (R + dur) − first.start (> 0)`; followers = siblings
     with `start ≥ first.start` (excl. self) shift by `quantize(delta)`
     with floor `R + dur` (nobody before the inserted clip's new end);
     the dragged clip lands at `R`. Uniform shift preserves tail spacing
     (Premiere insert-edit geometry; reuses `rippleShiftAfter`'s law).
2. **Commit** — unchanged pattern: previews mutate the live doc; `endDrag`
   writes ONE history entry iff docChanged. Esc/pointercancel restores the
   snapshot (existing). Auto-scroll, magnet guide, pointer-capture,
   one-gesture-one-pointer: all retained.
3. **`moveClip` (programmatic seam op)** — REWRITTEN to OT's wire law:
   validate the span against same-track siblings (excluding self); overlap ⇒
   NO doc change + honest toast ("No room at 2.4s — clip needs 3.5s") — the
   `{ok:false, code:'CONFLICT'}` contract in mini form. `nudge` routes
   through it (nudge into a neighbor = refuse + toast, no silent clamp).
4. **Affordances** — dragged clip keeps `is-dragging`; siblings currently
   being pushed get `is-pushed` (soft tint) so the insert preview is legible.
   Minimized pills run the same engine — insert law applies there too.
5. **Ripple interplay** — insert-push is the DROP-CONFLICT law (not governed
   by the ripple toggle); the ripple toggle keeps governing delete/trim
   follower compaction. Registered in the seam doc + README.

**Out of scope (window model):** cross-track vertical moves and
new-track-escape — the mini's binding model makes the track selector the
rebind affordance; OT's cross-track move maps to rebinding. Registered.

## D2 — Trim ghost edges (thread #51)

Pure derived geometry, no model change: the mini's clip = full window over
its source from in-point 0 (media.duration is the source extent).

- `trimGhost(doc, clip, edge, rippleOn)` in geometry.ts:
  - end: bound = `rippleOn ? start + media.duration
    : min(nextStart, start + media.duration)`; room = bound − end.
  - start: bound = `max(prevEnd, end − media.duration)`; room = start − bound.
  - null when room ≤ 0 (at max / no room).
- ClipItem renders the ghost ONLY while `trimmingEdge === edge` AND the
  request is OUTWARD (past the current edge) — the reviewer's refinement
  (not when trimming inward, not when already maxed). Dotted border, no
  fill, from the live edge to the bound; `data-trim-ghost` for tests.

## D3 — Scrubbing enabled (user item 4 + thread #53)

The timeline ruler already scrubs (R18i). The missing surface is the viewer
transport: **new full-width scrub bar** as a second transport row.

- Row 1 becomes `[⏮][◀|][tc | play | aspect]`: two purpose-drawn seek
  glyphs join the left cluster — ToStartIcon (bar + double triangle, seek 0)
  and ClipHeadIcon (bar + single triangle, seek the head of the
  under-playhead clip; in a gap → the most recent clip with start < playhead;
  none → 0). Same grammar family as TrimStart/TrimEnd/Split.
- Row 2: full-width scrub bar (progress fill + playhead tick) — its CENTER
  sits directly under the centered play button (the reviewer's
  "centerly aligned"). Extent = contentEnd of the BOUND world (matches the
  tc-total). Pointer drag with capture scrubs via setPlayhead; click seeks.
- A11y: the bar is a focusable `role="slider"` (aria-valuenow/min/max,
  aria-label "Scrub playhead"); ArrowLeft/Right nudge 0.5s (with
  stopPropagation so the timeline-level useKeys stays quiet);
  Home/End jump to 0 / world end; `Home` also joins the global useKeys map
  (seek to beginning).
- Store: `seekToClipHead()` helper on the bound world; everything else
  reuses setPlayhead.

## D4 — Track selection + TrackInspector (thread #47)

- Store: `selectedTrackId: string | null`, `selectTrack(id)` (clears clip
  selection — one inspector subject at a time), clip `select` clears track
  selection; `_validateSelection` heals track selection when the track
  leaves the visible world (same survive-iff-visible law).
- Lane empty-area pointerdown → selectTrack(track.id); track-head badge
  (non-dropdown surface) click → selectTrack. The selector dropdown keeps
  its own surface (stopPropagation).
- Inspector: TrackInspector card — track name, kind, clip count, total
  content duration, bound role ("video lane" / "audio lane"), and honest
  hints (e.g. audio lane visibility toggle pointer). Fallback order:
  clip → track → structured empty state (existing).

## D5 — Track heads (threads #49/#50)

- Single-pair + UNLOCKED (the default story): V1/A1 marker badges
  (non-interactive labels; click = selectTrack). Locked (embedded): NO
  chip — the rail keeps its space (RENDER_ORIGIN law stays 46; the rail
  reads as quiet margin). Multi-track unlocked: selector dropdowns
  (unchanged).
- Corner law (#50): head chips are rounded on the OUTER (left) side, FLAT
  on the side touching the track content — `border-radius: 6px 0 0 6px`
  on all head chips (badges + selects).

## D6 — Rails whole-click (threads #45/#46)

The collapsed pool + inspector 30px rails become single `<button>` elements
(whole surface clickable; aria-label/title; keyboard works for free).
Mode-aware law kept: under viewer-max the rail click exits max; otherwise
it expands. Same law both rails, one grammar.

## D7 — Minimize toggle stability (thread #48)

The minimize/restore button occupies the SAME slot geometry in both modes:
first interactive element at the panel's left edge, same size + left inset
in the expanded tools row and in the minimized strip row. The toggle then
reads as "the button stays put while the mode flips around it".

## D8 — Zoom ladder (thread #52)

`PPS_STEPS`: 5 → 9 steps `[24, 36, 48, 72, 96, 144, 192, 288, 384]` — the
five anchors preserved, one new rung between each pair (×1.5 ladder);
`DEFAULT_ZOOM_STEP` = 2 (still 48pps). Zoom buttons/keyboard adapt
automatically; labelStepFor unchanged.

## D9 — OT seam tracking (user item 1) — `docs/OT-SEAMS.md`

First-class seam map artifact in shell-mini: every timeline op ↔ OT
command/type, semantics delta, downstream swap path. Headlines:

| mini op | OT seam | delta |
|---|---|---|
| previewMove (free+insert) | element-interaction-controller drag + resolveGroupMove | insert-push replaces OT's new-track escape (single-pair window); reject law preserved in moveClip |
| moveClip | timeline.move | overlap-reject + toast = `{ok:false, code:'CONFLICT'}`; single selection vs ElementRef[]; seconds+0.5 grid vs ticks+fps |
| insertMove (new, gesture-only) | — (ripple family) | mini-native insert-edit; OT has no insert-move command — registered |
| insertMediaAt / insertionAt | timeline.insert (strategy firstAvailable/explicit) | preferred-time → next fitting gap → tail = firstAvailable family; explicit = exact spot only when free |
| trimClip (clampTrim*) | timeline.trim {side, deltaTicks} | media-bounded both edges; trimStart/trimEnd implicit-0 model vs OT fields — conversion noted |
| splitAtPlayhead | timeline.split {splitTimeTicks, retainSide} | single clip; both-sides retain |
| deleteSelected | timeline.delete / timeline.rippleDelete (toggle→two commands) | shape delta registered |
| setPlayhead/scrub | timeline.seek + seek/playhead controllers | unquantized scrub (grid exception documented) |
| undo/redo | timeline.undo/redo | snapshot family parity |
| select/selectTrack | timeline.selectElements | single-subject (clip XOR track) vs multi ElementRef[] |
| track binding (window) | — (OT has no window concept) | the embedding seam: host injects bound pair + lock |

Deviations register updated (README): insert-push conflict law, 9-step zoom,
ghost edges, track markers law, scrub bar.

## D10 — UI spec update (user item 2) — 18-ui-shell.md

New spec section: **shell-mini as the first shippable MVP** — the minimal
but complete NLE app (every essential editing op live) that lands BEFORE
shell-full and is designed to EMBED (track-binding window + host-injected
lock + topbar as the downstream customization point). Full feature
inventory from waves R18e→R19 (transport grammar, trim-as-edge, ripple
family, DnD, magnet snap, track binding + video-only mode, minimize/max
composition, rails, scrub bar, insert-move, track inspector), the RH skin
lineage + deviations register pointer, and the OT seam map pointer +
mockup→library evolution path. Written in spec voice; deviations stay in
the mock README (the register); the spec carries the contract.

## Review round 2 — amendments (adversarial subagent, adopted)

1. **(P1) Insert math gets its own helper, NOT `rippleShiftAfter`** — that
   helper's `shift === 0 → identity` early-return skips the floor and commits
   an overlap on every sub-grid delta (the FIRST delta of any drag that just
   crosses a neighbor). New pure `insertPlacement(clips, trackId, excludeId,
   R, dur)`: follower' = `max(R + dur, start + quantize(delta))` — floor
   applied ALWAYS (no early return); provably at most one follower floored
   (consecutive starts ≥ 0.5s apart, |delta − q| ≤ 0.25). R itself stays
   exact (magnet-exactness + pointer-commit laws); wording: "uniform except
   the first conflicting sibling is floored onto the inserted clip's tail".
2. **(P1) Magnet field is FROZEN at gesture start** — snapTargets come from
   `dragSnapshot` while `dragActive` (law: a gesture never magnetizes to
   positions it created — also fixes the latent ripple-trim ratchet).
3. **(P1) Both-edge magnet, nearest wins, ties → left edge** (OT
   `snapGroupEdges` parity): new `magnetMove(raw, pps, dur, targets)` —
   left edge (start=τ) and right edge (start=τ−dur) candidates; `magnetTarget`
   becomes nearest-within-12px (was first-in-array-order).
4. **(P1) Zoom hardcode sweep** — `clampZoom`, slider `max` + `--qc-slider-pct`
   denominator, zoom-in `disabled`, and the `'0'` key all derive from
   `PPS_STEPS.length − 1` / `DEFAULT_ZOOM_STEP`.
5. **(P2) `selectedTrackId` healing lives in the three binding/mode setters**
   (they already compute visibleIds), in `reset()`, and `_validateSelection`
   extends to track-in-visible-world (undo/redo doc swaps).
6. **(P2) Commit at the UP position** — `finishGesture` applies the gesture
   at the up clientX before `endDrag()` (fast-flick commits the drop spot,
   not the last pointermove).
7. **(P2) moveClip contract** — negative newStart → reject + toast (OT wire
   law); dragActive guard stays BEFORE the conflict toast (no mid-drag
   spam); `nudge` parking test flips to refuse+toast (intended — lost
   fill-the-gap affordance registered); `clampMove` is DELETED (dead law) +
   its tests.
8. **(P2) Ripple-ON start-edge ghost suppressed** (frozen-left law — the
   start handle grows content rightward; a leftward ghost would lie).
   Outward detection via a `lastRequest` field on the gesture ref.
9. **(P2) Scrub-bar extent law** = `max(contentEnd(bound world), 8)` (the
   ruler's runway floor family; ≤ rulerEnd always, so no cross-surface
   clamp fight); tick + `aria-valuenow` clamped to extent; bar scrub inert
   during an active clip gesture (setPlayhead drag gate).
10. **(P2) Seam-map corrections** — OT's `adjustedStartTime` comes from
    `enforceMainTrackStart` (main-track zero-anchor) only, never gap-fit;
    OT `firstAvailable` has NO same-track gap hunt (requested span else
    other/new track) — the mini's `insertionAt` gap hunt is a registered
    mock affordance; previewMove row cites `snapGroupEdges`.
11. **(P3) `pushedIds` on the store** (recomputed in previewMove, cleared at
    drag end) drives `is-pushed`. No-split-at-insert documented as the
    Premiere deviation (whole-clip relocation). Drop-law matrix registered
    (pool drop = gap-fit/append; clip drop = insert-push). Thread #53
    verbatim + disambiguation recorded (full-width scrub row under the
    transport — the literal reading). `selectTrack` is drag-gated; collapsed
    A1 stays head-selectable. geometry.ts header grid-invariant wording
    fixed. ClipHead steps back edit-by-edit when the playhead sits at a
    clip head (ε boundary → previous clip). Scrub-row glyphs get
    min-width/no-wrap guards.

## Implementation order

1. geometry.ts (overlap/insert/ghost helpers + zoom ladder)
2. useMini.ts (selectedTrackId, previewMove rewrite, moveClip reject law,
   seekToClipHead, useKeys Home)
3. Timeline.tsx (ghost edges, push preview, lane/head selectTrack, head
   badges+corners, tools/min-strip button alignment)
4. Viewer.tsx + shell.css (scrub bar + seek controls)
5. MediaPool/Inspector (rail buttons, TrackInspector)
6. tests across all of the above (~35 new)
7. docs: OT-SEAMS.md, README features/deviations, 18-ui-shell.md
8. live verify via :3000 + VLM; resolve threads; commit + push + /home/sync
