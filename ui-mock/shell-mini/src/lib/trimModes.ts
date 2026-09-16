/* R24-miniplus W3 (DESIGN-R24 D6): the trim-mode pure laws — Roll, Slip,
 * Slide (Ripple already lives in the store's R18e family). Ported from
 * the variants' trimLaws.ts and re-derived to the mini's world:
 * MIN = 0.5 (the grid law), no fps, no locked tracks, no linked
 * companions. The D2 source-extent law applies:
 * (extent − sourceStart)/rate bounds every window edge.
 *
 * All functions are PURE — the store previews compute from the
 * dragSnapshot (the R18k idempotence law: recompute-from-snapshot every
 * event, never accumulate drift) and seal at pointerup (ONE entry). */

import type { Clip, Doc, Media } from './mockData';

export const TRIM_EPS = 1e-9;

/** the same-track clip whose START touches c's END (the seam partner). */
export function touchingRight(doc: Doc, c: Clip): Clip | undefined {
  return doc.clips.find(
    (x) => x.trackId === c.trackId && Math.abs(x.start - (c.start + c.duration)) < TRIM_EPS && x.id !== c.id,
  );
}

/** the same-track clip whose END touches c's START. */
export function touchingLeft(doc: Doc, c: Clip): Clip | undefined {
  return doc.clips.find(
    (x) => x.trackId === c.trackId && Math.abs(x.start + x.duration - c.start) < TRIM_EPS && x.id !== c.id,
  );
}

/** the consumed source window of a clip (duration x rate). */
export const windowOf = (c: Clip): number => c.duration * (c.speed ?? 1);

/** ROLL bounds: the delta d applied to a touching junction
 *  (a.duration += d; b.start += d; b.duration -= d; b.sourceStart += d).
 *  lo: a shrinks to MIN / b's source head hits 0.
 *  hi: b shrinks to MIN / a's source tail hits its extent. */
export function rollDeltaBounds(doc: Doc, a: Clip): { lo: number; hi: number } | null {
  const b = touchingRight(doc, a);
  if (!b) return null; // a gap has no shared edit point — roll is inert
  const mediaA = doc.media.find((m) => m.id === a.mediaId);
  const mediaB = doc.media.find((m) => m.id === b.mediaId);
  let lo = 0.5 - a.duration; // a keeps >= MIN
  let hi = b.duration - 0.5; // b keeps >= MIN
  // a's source tail: (ss_a + (dur_a + d) * rate_a) <= extent_a
  if (mediaA && mediaA.kind !== 'image') {
    const rateA = a.speed ?? 1;
    const tailMax = (mediaA.duration - (a.sourceStart ?? 0)) / rateA;
    hi = Math.min(hi, tailMax - a.duration);
  }
  // b's source head: (ss_b + d) >= 0
  if (mediaB && mediaB.kind !== 'image') {
    lo = Math.max(lo, -(b.sourceStart ?? 0));
  }
  if (lo > hi) return null; // degenerate seam (no legal roll)
  return { lo, hi };
}

/** SLIP bounds: the legal sourceStart for a FIXED placement —
 *  [0, extent − window]. Images have no window to move (inert). */
export function slipTargetBounds(media: Media | undefined, c: Clip): { lo: number; hi: number } | null {
  if (!media || media.kind === 'image') return null;
  const hi = media.duration - windowOf(c);
  if (hi <= 0) return null; // the whole source is already shown
  return { lo: 0, hi };
}

/** SLIDE bounds: the legal start for the mover while the neighbors'
 *  FACING edges trim to make room. Each neighbor keeps >= MIN; a capped
 *  edge opens a GAP, never an overlap (deviation #10). */
export function slideStartBounds(doc: Doc, c: Clip): { lo: number; hi: number } | null {
  const same = doc.clips
    .filter((x) => x.trackId === c.trackId && x.id !== c.id)
    .sort((x, y) => x.start - y.start);
  const prev = same.filter((x) => x.start < c.start).at(-1);
  const next = same.filter((x) => x.start > c.start)[0];
  if (!prev && !next) return null; // alone on the track — slide IS move (inert)
  const lo = prev ? prev.start + 0.5 : 0;
  const hi = next ? next.start + next.duration - 0.5 - c.duration : Infinity;
  if (lo > hi) return null;
  return { lo, hi };
}

/** quantize a delta to the 0.5 grid (the D2 law: tool-drag deltas land
 *  on the grid; the pointer's raw time never commits directly). */
export function quantizeDelta(d: number): number {
  return Math.round(d / 0.5) * 0.5;
}
