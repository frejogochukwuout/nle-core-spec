/* trimLaws.ts — R15 T4 pure trim + tool-gesture laws (spec-06 §5.2 trim
   constraints, §5.5–§5.8 roll/slip/slide/rate-stretch OT-GAP semantics;
   canonical resize-controller bounds per seam-contract §9). ONE home for
   every clamp so the STORE (commit) and the Clip GESTURE (optimistic
   preview) always agree — the preview can never show a position the commit
   would reject.

   Laws:
   - MIN_DUR = 1 frame (1/24 s, spec-06 §5.2 — replaces the R14 0.25 s mock
     constant; no registration: alignment with the engine spec).
   - Neighbor bounds (canonical §9): right-edge trim cannot extend past the
     next clip's start; left-edge past the previous clip's end — NON-GROUP
     neighbors on the same track (a selection trimming together may shuffle
     within itself via the virtual-removal discipline).
   - Source-extent bounds: the element's source window [sourceStart,
     sourceStart + duration·rate) must stay inside [0, media duration]. The
     fixture's el.sourceDuration mirrors the CURRENT window length (it equals
     duration everywhere), NOT the asset extent — the media pool record is
     the true source bound; text/synthetic clips (no media) fall back to ∞.
   - Batch trim: the group's delta bounds are the INTERSECTION of all
     members' bounds (selection trims together; tightest wins).
   - Rate clamp [0.01, 5] (canonical retime/rate.ts, spec-06 §5.8).

   Pure + framework-free: imports only mockData types + the static media
   pool (reference data, never mutated). */

import { mediaById, type ElementJSON, type SceneJSON, type TrackJSON } from './mockData';

/** spec-06 §5.2: a clip can never shrink below one frame (24 fps mock). */
export const MIN_DUR = 1 / 24;
/** Retime rate clamp (canonical opencut `retime/rate.ts`; spec-06 §5.8). */
export const RATE_MIN = 0.01;
export const RATE_MAX = 5;

/** float-safe "same time" for adjacency / half-open span comparisons. */
const EPS = 1e-6;

export interface DeltaBounds {
  /** lowest legal delta (seconds); may exceed `hi` → empty range = no-op. */
  lo: number;
  hi: number;
}

export const rateOf = (el: ElementJSON): number => el.speed ?? 1;

/**
 * Source extent in seconds — the media record's duration from the pool;
 * ∞ for text/synthetic clips (no media). `el.sourceDuration` in the mock
 * fixture mirrors the current window length (=== duration on every carrier),
 * so the MEDIA record is the honest extent the trim law uses.
 */
export function sourceExtentOf(el: ElementJSON): number {
  return mediaById(el.mediaId)?.duration ?? Infinity;
}

/* ---------- neighbors (same track) ---------- */

/** the closest element strictly before `el` in time (max startTime < el's). */
export function neighborBefore(track: TrackJSON, el: ElementJSON): ElementJSON | null {
  let best: ElementJSON | null = null;
  for (const e of track.elements) {
    if (e === el) continue;
    if (e.startTime < el.startTime - EPS && (!best || e.startTime > best.startTime)) best = e;
  }
  return best;
}

/** the closest element strictly after `el` in time (min startTime > el's). */
export function neighborAfter(track: TrackJSON, el: ElementJSON): ElementJSON | null {
  let best: ElementJSON | null = null;
  for (const e of track.elements) {
    if (e === el) continue;
    if (e.startTime > el.startTime + EPS && (!best || e.startTime < best.startTime)) best = e;
  }
  return best;
}

/**
 * Roll needs a real junction: the neighbor must be EXACTLY adjacent
 * (touching cut point) — a gap has no shared edit point to roll.
 */
export function adjacentBefore(track: TrackJSON, el: ElementJSON): ElementJSON | null {
  const prev = neighborBefore(track, el);
  return prev && Math.abs(prev.startTime + prev.duration - el.startTime) < EPS ? prev : null;
}

export function adjacentAfter(track: TrackJSON, el: ElementJSON): ElementJSON | null {
  const next = neighborAfter(track, el);
  return next && Math.abs(next.startTime - (el.startTime + el.duration)) < EPS ? next : null;
}

/* ---------- plain trim (select tool / trimElement / batch) ---------- */

/**
 * Canonical §9 neighbor bounds + 1-frame min + start ≥ 0. `group` = the ids
 * trimming together (excluded from neighbor computation — a selection may
 * re-place onto its own vacated spans, canonical virtual removal).
 */
export function neighborDeltaBounds(
  track: TrackJSON,
  el: ElementJSON,
  edge: 'l' | 'r',
  group: Set<string>,
): DeltaBounds {
  const others = track.elements.filter((e) => e.id !== el.id && !group.has(e.id));
  if (edge === 'l') {
    // "left = max end ≤ start": the new start can't cross the previous clip's end
    let prevEnd = 0; // timeline floor
    for (const e of others) {
      const end = e.startTime + e.duration;
      if (end <= el.startTime + EPS) prevEnd = Math.max(prevEnd, end);
    }
    return { lo: prevEnd - el.startTime, hi: el.duration - MIN_DUR };
  }
  // "right = min start ≥ end": the new end can't cross the next clip's start
  let nextStart = Infinity;
  for (const e of others) {
    if (e.startTime >= el.startTime + el.duration - EPS) nextStart = Math.min(nextStart, e.startTime);
  }
  return { lo: MIN_DUR - el.duration, hi: nextStart - (el.startTime + el.duration) };
}

/**
 * Source-extent bounds: the window [sourceStart + d, sourceStart + d +
 * (duration − d)·rate) (left edge) / [sourceStart, sourceStart +
 * (duration + d)·rate) (right edge) must stay inside [0, extent].
 * ∞ when there is no bounded source (text / no media / no window).
 */
export function sourceDeltaBounds(el: ElementJSON, edge: 'l' | 'r'): DeltaBounds {
  const extent = sourceExtentOf(el);
  if (!isFinite(extent)) return { lo: -Infinity, hi: Infinity };
  const rate = rateOf(el);
  const ss = el.sourceStart ?? 0;
  if (edge === 'r') {
    // ss + (dur + d)·rate ≤ extent
    return { lo: -Infinity, hi: (extent - ss) / rate - el.duration };
  }
  // ss' = ss + d ≥ 0; consumed' = (ss + d) + (dur − d)·rate ≤ extent
  let lo = el.sourceStart !== undefined ? -ss : -Infinity;
  let hi = Infinity;
  const c = extent - ss - el.duration * rate;
  if (Math.abs(1 - rate) > EPS) {
    // d·(1 − rate) ≤ c — sign of (1−rate) decides the direction
    if (rate < 1) hi = c / (1 - rate);
    else lo = Math.max(lo, c / (1 - rate));
  }
  // rate ≈ 1: consumed is invariant under a left-edge trim — no bound
  return { lo, hi };
}

/** plain trim bounds = neighbor ∩ source ∩ (min/≥0). */
export function trimDeltaBounds(
  track: TrackJSON,
  el: ElementJSON,
  edge: 'l' | 'r',
  group: Set<string>,
): DeltaBounds {
  const nb = neighborDeltaBounds(track, el, edge, group);
  const sb = sourceDeltaBounds(el, edge);
  return { lo: Math.max(nb.lo, sb.lo), hi: Math.min(nb.hi, sb.hi) };
}

/**
 * Batch trim bounds: the INTERSECTION of every member's bounds (the whole
 * selection moves its edges by ONE common delta — tightest wins, canonical
   group-resize). Returns null when no member resolves (unknown ids / all
 * locked) — callers treat that as a no-op. `lo > hi` = empty intersection.
 */
export function batchTrimBounds(
  scene: SceneJSON,
  members: { id: string; edge: 'l' | 'r' }[],
): DeltaBounds | null {
  const group = new Set(members.map((m) => m.id));
  let lo = -Infinity;
  let hi = Infinity;
  let any = false;
  for (const m of members) {
    let hit: { el: ElementJSON; track: TrackJSON } | null = null;
    for (const t of scene.tracks) {
      const el = t.elements.find((e) => e.id === m.id);
      if (el) { hit = { el, track: t }; break; }
    }
    if (!hit || hit.track.locked) continue;
    const b = trimDeltaBounds(hit.track, hit.el, m.edge, group);
    lo = Math.max(lo, b.lo);
    hi = Math.min(hi, b.hi);
    any = true;
  }
  return any ? { lo, hi } : null;
}

/* ---------- roll (spec-06 §5.5: A's end + B's start move together) ---------- */

/**
 * Delta bounds for moving the junction between A (left clip) and B (right
 * clip): A grows/shrinks at its tail, B shrinks/grows at its head. Bounded
 * by both clips' 1-frame minimums + A's source tail + B's source head.
 */
export function rollDeltaBounds(a: ElementJSON, b: ElementJSON): DeltaBounds {
  let lo = MIN_DUR - a.duration; // A keeps ≥ 1 frame
  let hi = b.duration - MIN_DUR; // B keeps ≥ 1 frame
  const aExt = sourceExtentOf(a);
  if (isFinite(aExt)) {
    // A's window [ss, ss + (dur + d)·rate) stays inside the source
    hi = Math.min(hi, (aExt - (a.sourceStart ?? 0)) / rateOf(a) - a.duration);
  }
  if (b.sourceStart !== undefined) {
    // B's window head can't go before the source start: (ss + d) ≥ 0
    lo = Math.max(lo, -b.sourceStart);
    // R15-F1 P3: B's window TAIL when rate ≠ 1 — the roll moves B's head by
    // d while its duration moves by −d, so the consumed tail
    // (ss + d) + (dur − d)·rate is only invariant at rate 1. The classic
    // rate-1 case keeps no tail bound; otherwise (ss + d) + (dur − d)·rate ≤
    // ext bounds d, with the sign of (1 − rate) picking the side.
    const bExt = sourceExtentOf(b);
    const bRate = rateOf(b);
    if (isFinite(bExt) && Math.abs(1 - bRate) > EPS) {
      const dTail = (bExt - b.sourceStart - b.duration * bRate) / (1 - bRate);
      if (bRate < 1) hi = Math.min(hi, dTail); // divisor > 0 → upper bound
      else lo = Math.max(lo, dTail); // divisor < 0 → lower bound
    }
  }
  return { lo, hi };
}

/* ---------- ripple trim (later clips shift; §10 / ripple.ts interval math) ---------- */

/**
 * Ripple trim bounds. The moving edge is NOT bounded by LATER neighbors —
 * they shift with the delta (the ripple). The left edge extending LEFT is
 * still bounded by the previous clip (it never moves) + 0 + the source head.
 */
export function rippleDeltaBounds(track: TrackJSON, el: ElementJSON, edge: 'l' | 'r'): DeltaBounds {
  if (edge === 'r') {
    const ext = sourceExtentOf(el);
    const hi = isFinite(ext) && el.sourceStart !== undefined
      ? (ext - el.sourceStart) / rateOf(el) - el.duration
      : Infinity;
    return { lo: MIN_DUR - el.duration, hi };
  }
  // 'l': trimming the head in (d > 0) keeps the start (the head region is
  // removed, downstream closes the gap — trimToPlayhead's pinned ripple-l
  // model); extending out (d < 0) pulls the edge left, bounded below.
  let lo = -el.startTime; // start ≥ 0
  let prevEnd = 0;
  for (const e of track.elements) {
    if (e === el) continue;
    const end = e.startTime + e.duration;
    if (end <= el.startTime + EPS) prevEnd = Math.max(prevEnd, end);
  }
  lo = Math.max(lo, prevEnd - el.startTime);
  if (el.sourceStart !== undefined) lo = Math.max(lo, -el.sourceStart);
  return { lo, hi: el.duration - MIN_DUR };
}

/* ---------- slip (spec-06 §5.6: fixed position, window slides) ---------- */

/**
 * The legal sourceStart window for a slip: [0, extent − duration·rate]
 * (content slides under the clip; position + duration never change).
 * null when the element has no source window (slip is inert).
 */
export function slipTargetBounds(el: ElementJSON): DeltaBounds | null {
  if (el.sourceStart === undefined) return null;
  const ext = sourceExtentOf(el);
  if (!isFinite(ext)) return { lo: 0, hi: Infinity };
  return { lo: 0, hi: Math.max(0, ext - el.duration * rateOf(el)) };
}

/* ---------- slide (spec-06 §5.7: clip moves, neighbors make room) ---------- */

/**
 * The legal clip start for a slide: the left neighbor can trim its right
 * edge down to (but never below) its own 1-frame minimum; the right neighbor
 * likewise keeps ≥ 1 frame when its left edge trims in.
 */
export function slideStartBounds(track: TrackJSON, el: ElementJSON): DeltaBounds {
  const prev = neighborBefore(track, el);
  const next = neighborAfter(track, el);
  return {
    lo: prev ? prev.startTime + MIN_DUR : 0,
    hi: next ? next.startTime + next.duration - MIN_DUR - el.duration : Infinity,
  };
}

/* ---------- stretch / retime (spec-06 §5.8: speed = span / duration) ---------- */

/**
 * Stretch delta bounds: neighbor + 1-frame + ≥0 (as a plain trim) plus the
 * rate clamp translated into duration bounds — the compensated speed
 * (sourceSpan / newDuration) must stay inside [0.01, 5]. NO source-extent
 * bound: the rate does the compensating (the consumed window is preserved).
 */
export function stretchDeltaBounds(track: TrackJSON, el: ElementJSON, edge: 'l' | 'r'): DeltaBounds {
  const nb = neighborDeltaBounds(track, el, edge, new Set([el.id]));
  const span = el.duration * rateOf(el); // consumed source at the current rate
  const durLo = Math.max(MIN_DUR, span / RATE_MAX);
  const durHi = span / RATE_MIN;
  if (edge === 'r') {
    return { lo: Math.max(nb.lo, durLo - el.duration), hi: Math.min(nb.hi, durHi - el.duration) };
  }
  return { lo: Math.max(nb.lo, el.duration - durHi), hi: Math.min(nb.hi, el.duration - durLo) };
}
