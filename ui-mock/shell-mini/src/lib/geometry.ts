/* Timeline geometry + interaction laws (DESIGN D7 — the audit-fixed set).
   Pure functions, no DOM: every clamp here is directly unit-tested.
   Grid invariant: committed doc times are multiples of 0.5 (GRID), with
   the documented magnet exception (a magnet hit commits the target
   EXACTLY — playhead targets may be off-grid by design). */

import type { Clip, Doc, Media } from './mockData';

export const GRID = 0.5; // seconds — doc grid (binary-exact)
export const MIN_DUR = 0.5; // seconds — minimum clip duration
export const MAX_HISTORY = 50;

/** px-per-second ladder — 5 steps, RH quick-cut slider parity (D7).
 *  Default zoomStep = 1 (48pps): at 24pps a min-duration clip (12px) is
 *  smaller than its own 14px trim handles (registered constraint). */
export const PPS_STEPS = [24, 48, 96, 192, 384] as const;
export const DEFAULT_ZOOM_STEP = 1;

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

/** MOVE clamp (D7): newStart ∈ [prevEnd, nextStart - duration]. */
export function clampMove(newStart: number, duration: number, prevEnd: number, nextStart: number): number {
  const lo = prevEnd;
  const hi = nextStart - duration;
  if (hi < lo) return lo; // degenerate: no room — park at the neighbor end
  return Math.min(Math.max(newStart, lo), hi);
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

/** SNAP (D7): snap toggle governs grid quantization AND the 12px magnet.
 *  Magnet targets are the CALLER's responsibility (same-track neighbor
 *  edges + playhead — NEVER the dragged clip's own edges, review fix #2). */
export const SNAP_PX = 12;

/** The nearest magnet target within 12px, or null. */
export function magnetTarget(t: number, pps: number, targets: number[]): number | null {
  for (const target of targets) {
    if (Math.abs(target - t) * pps <= SNAP_PX) return target;
  }
  return null;
}

/** The ONE snap law (component-facing): magnet FIRST (exact target — a
 *  playhead magnet hit commits the playhead's exact time, the documented
 *  grid exception), else grid quantize when snap is on, else raw. */
export function resolveSnap(t: number, snapOn: boolean, pps: number, targets: number[]): number {
  if (!snapOn) return t;
  const magnet = magnetTarget(t, pps, targets);
  if (magnet !== null) return magnet;
  return quantize(t);
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
