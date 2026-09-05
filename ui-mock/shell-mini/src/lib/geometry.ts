/* Timeline geometry + interaction laws (DESIGN D7 — the audit-fixed set).
   Pure functions, no DOM: every clamp here is directly unit-tested.
   Grid invariant: committed doc times are multiples of 0.5 (GRID). */

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

/** Quantize to the doc grid (round-half-up on exact halves, grid-clean input
 *  stays untouched; playhead is quantized ONLY by split, never by scrub). */
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

/** TRIM laws (audit M1): full bound set incl. media duration.
 *  start-trim: start' ∈ [prevEnd, end - MIN_DUR]
 *  end-trim:   end'   ∈ [start + MIN_DUR, min(nextStart, start + media.duration)] */
export function clampTrimStart(
  newStart: number,
  clip: Clip,
  prevEnd: number,
): { start: number; duration: number } {
  const end = clip.start + clip.duration;
  const lo = prevEnd;
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
 *  Targets: neighbor clip edges + playhead. Returns the snapped time plus
 *  the magnet target for the snap-guide indicator (null = no snap applied). */
export const SNAP_PX = 12;

export function snapTime(
  t: number,
  pps: number,
  targets: number[],
): { time: number; guide: number | null } {
  for (const target of targets) {
    if (Math.abs(target - t) * pps <= SNAP_PX) {
      return { time: target, guide: target };
    }
  }
  return { time: t, guide: null };
}

/** The ONE snap law (component-facing): magnet FIRST (exact target — a
 *  playhead magnet hit must NOT be re-quantized off the playhead), else
 *  grid quantize when snap is on, else raw. One place, fully tested. */
export function resolveSnap(t: number, snapOn: boolean, pps: number, targets: number[]): number {
  if (!snapOn) return t;
  const magnet = snapTime(t, pps, targets);
  if (magnet.guide !== null) return magnet.time;
  return quantize(t);
}

/** Playhead scrub clamp (D7): [0, contentEnd], unquantized. */
export function clampPlayhead(t: number, end: number): number {
  return Math.min(Math.max(t, 0), end);
}
