/* Timeline geometry + interaction laws (DESIGN D7 — the audit-fixed set).
   Pure functions, no DOM: every clamp here is directly unit-tested.
   Grid law (R19 wording): PROGRAMMATIC edits (split / insert / ripple /
   nudge) commit multiples of 0.5 (GRID); POINTER gestures commit the
   pointer's own time — smooth when free (R18i), EXACT when a magnet hit
   lands (playhead targets may be off-grid by design). A committed doc
   never contains same-track overlaps — every placement law below
   preserves that invariant. */

import type { Clip, Doc, Media } from './mockData';

export const GRID = 0.5; // seconds — doc grid (binary-exact)
export const MIN_DUR = 0.5; // seconds — minimum clip duration
export const MAX_HISTORY = 50;

/** px-per-second ladder — 9 steps (R19, thread #52: "double the steps",
 *  short-duration work wants finer rungs). The five R18 anchors are
 *  preserved with one new rung between each pair (×1.5 ladder):
 *  24 36 48 72 96 144 192 288 384. Default zoomStep = 2 (48pps — the
 *  R18 default pps survives the renumber). At 24pps a min-duration clip
 *  (12px) is smaller than its own 14px trim zone (registered constraint). */
export const PPS_STEPS = [24, 36, 48, 72, 96, 144, 192, 288, 384] as const;
export const DEFAULT_ZOOM_STEP = 2;

/** The ruler/bar runway floor (seconds) — the scrub extent never renders
 *  narrower than this even for an empty world (family of the ruler's
 *  max(contentEnd, 8, viewport) law). */
export const RUNWAY_FLOOR_S = 8;

export function ppsFor(zoomStep: number): number {
  const i = Math.min(Math.max(Math.round(zoomStep), 0), PPS_STEPS.length - 1);
  return PPS_STEPS[i];
}

/** Ruler label step (seconds): >= 1s ALWAYS (audit m8), labels >= 64px apart. */
export function labelStepFor(pps: number): number {
  return Math.max(1, Math.ceil(64 / pps));
}

/** Quantize to the doc grid (grid-clean input stays untouched; the
 *  playhead is quantized ONLY by split, never by scrub). */
export function quantize(seconds: number): number {
  return Math.round(seconds / GRID) * GRID;
}

export const timeToPx = (t: number, pps: number): number => t * pps;
export const pxToTime = (px: number, pps: number): number => px / pps;

/** contentEnd = max(clip ends, 0) (D3.3). */
export function contentEnd(clips: Clip[]): number {
  return clips.reduce((end, c) => Math.max(end, c.start + c.duration), 0);
}

/** Clips of one track, time-sorted (immutable sort). */
export function clipsOfTrack(doc: Doc, trackId: string): Clip[] {
  return doc.clips.filter((c) => c.trackId === trackId).sort((a, b) => a.start - b.start);
}

/** Neighbor bounds for a clip on its track, EXCLUDING itself.
 *  prevEnd = end of the previous clip (0 if none); nextStart = start of the
 *  next clip (Infinity if none). */
export function neighborBounds(doc: Doc, clip: Clip): { prevEnd: number; nextStart: number } {
  const siblings = clipsOfTrack(doc, clip.trackId).filter((c) => c.id !== clip.id);
  let prevEnd = 0;
  let nextStart = Infinity;
  for (const c of siblings) {
    if (c.start + c.duration <= clip.start) prevEnd = Math.max(prevEnd, c.start + c.duration);
    if (c.start >= clip.start + clip.duration) nextStart = Math.min(nextStart, c.start);
  }
  return { prevEnd, nextStart };
}

/** MOVE validity (R19, OT seam — placement.wouldElementOverlap): would a
 *  span [start, start+dur) collide with any same-track clip (excluding
 *  one)? This replaces the old clampMove — the OT wire law REJECTS an
 *  overlapping timeline.move (CONFLICT) instead of clamping it, and the
 *  mini's programmatic moveClip now refuses the same way. */
export function wouldOverlap(
  clips: Clip[],
  start: number,
  dur: number,
  excludeId?: string,
): boolean {
  const end = start + dur;
  return clips.some(
    (c) =>
      c.id !== excludeId && start < c.start + c.duration - 1e-9 && end > c.start + 1e-9,
  );
}

/* R20 — the insert-push law that lived here (insertPlacement /
 * insertPushedIds) is DELETED. It was an improvisation masquerading as a
 * seam deviation: OT has NO insert-push anywhere. The real OT drop law
 * (element-interaction-controller → resolveGroupMove →
 * canApplyMovesToExistingTracks → ?? newTracksFallback) is now
 * resolveDropEscape below, and the store refuses/escapes at the UP —
 * never pushes neighbors, never mid-gesture. */

export type DropEscape =
  | { verdict: 'free' }
  | { verdict: 'escape'; trackId: string; minted: boolean }
  | { verdict: 'conflict' };

/** The OT drop law, windowed (R20). Where a MOVE gesture's span
 *  [start, start+dur) resolves at the UP:
 *
 *  - 'free' — the span is conflict-free on the mover's own track; the
 *    drop commits as a plain move (OT: resolveExistingTrackMove +
 *    canApplyMovesToExistingTracks pass).
 *  - 'escape' — the span conflicts on the mover's track, and OT's
 *    escape hatch applies THROUGH the window: an EXISTING same-kind
 *    track that can host the span conflict-free is preferred (doc track
 *    order — deterministic; OT's canApplyMovesToExistingTracks tried
 *    against the drop target); otherwise a MINTED track (OT's
 *    newTracksFallback — mintTrackId supplies the id).
 *  - 'conflict' — no existing track fits and minting is the only way
 *    out; the STORE upgrades this to 'refuse' when trackBindingLocked
 *    pins the window (the mini's rendering of OT's {ok:false,
 *    code:'CONFLICT'} when the host forbids track creation).
 *
 *  Pure: reads the (pre-drag) doc, never mutates. Cross-track law: only
 *  SAME-kind tracks are escape candidates (audio never escapes to a
 *  video lane); a clip on the mover's own track is the only conflict
 *  source (lanes are parallel worlds, never stacked). */
export function resolveDropEscape(
  doc: Pick<Doc, 'tracks' | 'clips'>,
  moverId: string,
  start: number,
  dur: number,
): DropEscape {
  const mover = doc.clips.find((c) => c.id === moverId);
  if (!mover) return { verdict: 'free' };
  const end = start + dur;
  const overlapsOn = (trackId: string) =>
    doc.clips.some(
      (c) =>
        c.id !== moverId &&
        c.trackId === trackId &&
        start < c.start + c.duration - 1e-9 &&
        end > c.start + 1e-9,
    );
  if (!overlapsOn(mover.trackId)) return { verdict: 'free' };
  const kind = doc.tracks.find((t) => t.id === mover.trackId)?.kind ?? 'video';
  for (const t of doc.tracks) {
    if (t.kind !== kind || t.id === mover.trackId) continue;
    if (!overlapsOn(t.id)) return { verdict: 'escape', trackId: t.id, minted: false };
  }
  return { verdict: 'conflict' };
}

/** TRIM ghost bounds (R19, thread #51): how much further the trimmed edge
 *  can extend (the source/neighbor bound the drag clamps to). Null when
 *  there is no room (already maxed) or — for the START edge under ripple —
 *  when the law freezes the left edge (ripple start-trim grows the clip
 *  rightward; a leftward ghost would lie). end bound: ripple ignores the
 *  neighbor (followers push) → source extent only; else min(neighbor,
 *  source). start bound: max(prevEnd, end − media.duration) — the
 *  implicit in-point-0 model (deviation from OT's trimStart field,
 *  registered in docs/OT-SEAMS.md). */
export function trimGhostBound(
  doc: Doc,
  clip: Clip,
  edge: 'start' | 'end',
  rippleOn: boolean,
  media: Media | undefined,
): number | null {
  const { prevEnd, nextStart } = neighborBounds(doc, clip);
  if (edge === 'end') {
    const bound = rippleOn
      ? clip.start + (media?.duration ?? Infinity)
      : Math.min(nextStart, clip.start + (media?.duration ?? Infinity));
    const room = bound - (clip.start + clip.duration);
    return room > 1e-9 ? bound : null;
  }
  if (rippleOn) return null; // frozen-left law — no honest leftward ghost
  const bound = Math.max(prevEnd, clip.start + clip.duration - (media?.duration ?? Infinity));
  const room = clip.start - bound;
  return room > 1e-9 ? bound : null;
}

/** TRIM laws (audit M1 + review fix: media bound on BOTH edges):
 *  start-trim: start' ∈ [max(prevEnd, end − media.duration), end − MIN_DUR]
 *  end-trim:   end'   ∈ [start + MIN_DUR, min(nextStart, start + media.duration)] */
export function clampTrimStart(
  newStart: number,
  clip: Clip,
  prevEnd: number,
  media: Media | undefined,
): { start: number; duration: number } {
  const end = clip.start + clip.duration;
  const lo = Math.max(prevEnd, media ? end - media.duration : -Infinity);
  const hi = end - MIN_DUR;
  const start = Math.min(Math.max(newStart, lo), hi);
  return { start, duration: end - start };
}

export function clampTrimEnd(
  newEnd: number,
  clip: Clip,
  nextStart: number,
  media: Media | undefined,
): { start: number; duration: number } {
  const lo = clip.start + MIN_DUR;
  const hi = Math.min(nextStart, clip.start + (media?.duration ?? Infinity));
  const end = Math.min(Math.max(newEnd, lo), hi);
  return { start: clip.start, duration: end - clip.start };
}

/** SPLIT (audit M1): p = clamp(quantize(playhead), start+0.5, end-0.5);
 *  returns null when invalid (duration < 1s or playhead ∉ [start, end)). */
export function splitPoint(playhead: number, clip: Clip): number | null {
  if (clip.duration < 1) return null;
  if (playhead < clip.start || playhead >= clip.start + clip.duration) return null;
  const lo = clip.start + MIN_DUR;
  const hi = clip.start + clip.duration - MIN_DUR;
  return Math.min(Math.max(quantize(playhead), lo), hi);
}

/** SNAP (R18i, thread #12 "two types of snapping"): the toggle governs
 *  the MAGNET ONLY — the pro-NLE convention. Research (Premiere Pro "Snap",
 *  Resolve snapping, FCP snapping, Avid Snap-to-Head/Tail): one toggle
 *  snaps to EDIT POINTS — clip edges, playhead (+ markers, which we lack).
 *  None of them snap to a time grid; positions are frame-aligned by the
 *  document model, not by the snap toggle. Our 0.5s GRID keeps that exact
 *  role: the quantum for PROGRAMMATIC edits (split / insert / ripple)
 *  stays grid-clean, but pointer drags commit the pointer's own position
 *  (smooth) or the magnet's exact target (jump) — never a beat-step.
 *  This removes the felt conflict: dragging near an edge magnet-jumps,
 *  elsewhere it moves smoothly. Magnet targets are the CALLER's
 *  responsibility (same-track neighbor edges + playhead — NEVER the
 *  dragged clip's own edges, review fix #2). */
export const SNAP_PX = 12;

/** The NEAREST magnet target within 12px, or null (R19: was first-in-
 *  array-order — at coarse zoom two targets can sit inside the window and
 *  array order decided arbitrarily; OT's snapGroupEdges picks nearest). */
export function magnetTarget(t: number, pps: number, targets: number[]): number | null {
  let best: number | null = null;
  let bestPx = SNAP_PX;
  for (const target of targets) {
    const px = Math.abs(target - t) * pps;
    if (px <= bestPx) {
      best = target;
      bestPx = px;
    }
  }
  return best;
}

/** MOVE magnet (R19, OT snapGroupEdges parity): BOTH edges of the moving
 *  clip are candidates — the LEFT edge magnets to a target (start = τ) and
 *  the RIGHT edge magnets to a target (start = τ − dur). Nearest pixel
 *  wins; ties → the LEFT edge (deterministic; a butt-joint either side of
 *  the same edit point can't flip-flop). Returns the snapped start + the
 *  guide position (the engaged edge's target), or null when nothing is in
 *  range (caller keeps the raw pointer time — smooth). */
export function magnetMove(
  raw: number,
  pps: number,
  dur: number,
  targets: number[],
): { start: number; guide: number } | null {
  let best: { start: number; guide: number; px: number } | null = null;
  for (const target of targets) {
    const leftPx = Math.abs(target - raw) * pps;
    if (leftPx <= SNAP_PX && (!best || leftPx < best.px)) {
      best = { start: target, guide: target, px: leftPx };
    }
    const rightEdge = raw + dur;
    const rightPx = Math.abs(target - rightEdge) * pps;
    if (rightPx <= SNAP_PX && (!best || rightPx < best.px)) {
      // strict <: a later right-edge candidate never displaces an
      // equal-distance left-edge win (ties → left edge)
      best = { start: target - dur, guide: target, px: rightPx };
    }
  }
  return best ? { start: best.start, guide: best.guide } : null;
}

/** The ONE snap law (component-facing): with snap ON the magnet commits
 *  its EXACT target (a playhead magnet hit may be off-grid by design —
 *  the documented grid exception); otherwise the pointer's own time
 *  passes through untouched. The 0.5s beat-quantize that used to fill
 *  the "no magnet" branch is GONE (R18i research — NLE snap toggles are
 *  edit-point magnets; beat stepping is a consumer-editor feature and
 *  it fought the magnet mid-gesture). */
export function resolveSnap(t: number, snapOn: boolean, pps: number, targets: number[]): number {
  if (!snapOn) return t;
  const magnet = magnetTarget(t, pps, targets);
  if (magnet !== null) return magnet;
  return t;
}

/** Playhead scrub clamp (D7): [0, contentEnd], unquantized. */
export function clampPlayhead(t: number, end: number): number {
  return Math.min(Math.max(t, 0), end);
}

/* ---- insertion placement (R18e: pool→timeline DnD) ------------ */

/** Where a NEW clip of `duration` lands when dropped at requested time t:
 *  the exact quantized spot when free, else the next INTER-CLIP gap that
 *  fits, else the lane tail (append). Null only for degenerate duration —
 *  a valid drop always lands somewhere (the toast reports where). Pure:
 *  takes the target track's clips (sorted internally). */
export function insertionAt(
  clips: Clip[],
  duration: number,
  t: number,
): { start: number; exact: boolean } | null {
  if (!(duration > 0)) return null;
  const sorted = [...clips].sort((a, b) => a.start - b.start);
  const want = Math.max(0, quantize(t));
  const tail = sorted.length
    ? sorted[sorted.length - 1].start + sorted[sorted.length - 1].duration
    : want;
  // candidate starts, in preference order: the requested spot, every
  // inter-clip gap start after it, then the lane tail
  const gapStarts: number[] = [];
  for (let i = 0; i + 1 < sorted.length; i += 1) {
    gapStarts.push(sorted[i].start + sorted[i].duration);
  }
  const candidates = [want, ...gapStarts.filter((s) => s > want), Math.max(want, tail)];
  for (const start of candidates) {
    const end = start + duration;
    const free = sorted.every((c) => c.start + c.duration <= start + 1e-9 || c.start >= end - 1e-9);
    if (free) return { start, exact: Math.abs(start - want) < 1e-9 };
  }
  return null; // unreachable for finite clips (the tail is always free)
}

/* ---- ripple edit laws (R18e — feedback #16; R18f quantize fix) --- */

/** Ripple-shift the siblings that follow a clip: everything starting at or
 *  after `fromTime` on the SAME track moves by `delta` (negative closes
 *  gaps). R18f (review P1-2): the DELTA is quantized (quantizing each
 *  result let an off-grid follower round BELOW the edited clip's new end
 *  and commit an overlap); `floor` clamps followers to the edited clip's
 *  new end (or the removed clip's start for deletes). The moved block
 *  keeps its internal spacing (uniform shift). Returns NEW clip objects
 *  for the shifted ids only — caller maps the rest. */
export function rippleShiftAfter(
  clips: Clip[],
  trackId: string,
  fromTime: number,
  delta: number,
  excludeId?: string,
  floor = 0,
): Clip[] {
  if (delta === 0) return clips;
  const shift = quantize(delta);
  if (shift === 0) return clips; // sub-grid delta rounds to zero — identity
  return clips.map((c) => {
    if (c.trackId !== trackId || c.id === excludeId) return c;
    if (c.start < fromTime - 1e-9) return c;
    const next = Math.max(floor, c.start + shift);
    return next === c.start ? c : { ...c, start: next };
  });
}
