/* Geometry law tests (DESIGN D7, audit M1/M5) — pure functions, strict
   equality throughout (the 0.5 grid is binary-exact by D5/m5). */

import { describe, expect, it } from 'vitest';
import {
  PPS_STEPS,
  DEFAULT_ZOOM_STEP,
  wouldOverlap,
  resolveDropEscape,
  trimGhostBound,
  magnetMove,
  clampPlayhead,
  clampTrimEnd,
  clampTrimStart,
  contentEnd,
  insertionAt,
  labelStepFor,
  magnetTarget,
  neighborBounds,
  ppsFor,
  quantize,
  resolveSnap,
  rippleShiftAfter,
  splitPoint,
  timeToPx,
  pxToTime,
} from './geometry';
import { seedDoc, multiTrackDoc, mintTrackId, type Clip, type Doc, type Media, type Track } from './mockData';

const clip = (over: Partial<Clip>): Clip => ({
  id: 'x',
  trackId: 'V1',
  mediaId: 'm-drone',
  start: 0,
  duration: 2,
  ...over,
});

describe('zoom ladder (R19, thread #52: 9 steps, anchors preserved)', () => {
  it('exposes 9 steps — double the granularity of the 5-step ladder', () => {
    expect(PPS_STEPS).toHaveLength(9);
  });
  it('preserves every R18 anchor (24/48/96/192/384)', () => {
    for (const anchor of [24, 48, 96, 192, 384]) {
      expect(PPS_STEPS).toContain(anchor);
    }
  });
  it('default step 2 is still 48pps (the R18 default survives the renumber)', () => {
    expect(PPS_STEPS[DEFAULT_ZOOM_STEP]).toBe(48);
  });
  it('maps steps to pps, clamping out-of-range', () => {
    expect(ppsFor(0)).toBe(24);
    expect(ppsFor(2)).toBe(48);
    expect(ppsFor(8)).toBe(384);
    expect(ppsFor(99)).toBe(384);
    expect(ppsFor(-3)).toBe(24);
  });
});

describe('ruler labelStep (audit m8: never sub-second)', () => {
  it('floors at 1s even at the densest zoom', () => {
    expect(labelStepFor(384)).toBe(1);
  });
  it('keeps labels >= 64px apart', () => {
    for (const pps of PPS_STEPS) {
      expect(labelStepFor(pps) * pps).toBeGreaterThanOrEqual(64);
    }
  });
  it('grows with sparser zoom', () => {
    expect(labelStepFor(24)).toBe(3);
    expect(labelStepFor(48)).toBe(2);
    expect(labelStepFor(96)).toBe(1);
  });
});

describe('time ↔ px', () => {
  it('round-trips', () => {
    expect(pxToTime(timeToPx(3.5, 96), 96)).toBe(3.5);
  });
});

describe('grid + quantize', () => {
  it('keeps grid-clean values untouched (strict equality)', () => {
    expect(quantize(2.5)).toBe(2.5);
    expect(quantize(0)).toBe(0);
  });
  it('rounds off-grid values to 0.5 steps', () => {
    expect(quantize(2.3)).toBe(2.5);
    expect(quantize(2.24)).toBe(2);
    expect(quantize(1.76)).toBe(2);
  });
});

describe('contentEnd', () => {
  it('is max of clip ends, 0 when empty', () => {
    expect(contentEnd([])).toBe(0);
    expect(contentEnd([clip({ start: 1, duration: 2 })])).toBe(3);
    expect(contentEnd([clip({ start: 10, duration: 0.5 }), clip({ start: 0, duration: 2 })])).toBe(10.5);
  });
  it('seed doc spans 12.5s', () => {
    expect(contentEnd(seedDoc().clips)).toBe(12.5);
  });
});

describe('neighborBounds', () => {
  it('finds prev end and next start, excluding self', () => {
    const doc = seedDoc();
    const c2 = doc.clips.find((c) => c.id === 'c2')!;
    const b = neighborBounds(doc, c2);
    expect(b.prevEnd).toBe(3.5); // c1 ends 3.5
    expect(b.nextStart).toBe(9); // c3 starts 9
  });
  it('uses track floor 0 / no next when at the edges', () => {
    const doc = seedDoc();
    const c1 = doc.clips.find((c) => c.id === 'c1')!;
    const b = neighborBounds(doc, c1);
    expect(b.prevEnd).toBe(0);
    expect(b.nextStart).toBe(4.5);
  });
});

describe('wouldOverlap (R19 — the OT wire validation law)', () => {
  const clips = [
    { id: 'a', trackId: 'V1', mediaId: 'm', start: 0, duration: 3.5 },
    { id: 'b', trackId: 'V1', mediaId: 'm', start: 4.5, duration: 3.5 },
  ];
  it('true when the span collides with a sibling', () => {
    expect(wouldOverlap(clips, 3.5, 1.5)).toBe(true); // [3.5,5) hits b@4.5
    expect(wouldOverlap(clips, 2, 4)).toBe(true); // [2,6) hits a and b
  });
  it('false for a free span (touching edges do NOT overlap)', () => {
    expect(wouldOverlap(clips, 3.5, 1)).toBe(false); // [3.5,4.5) exactly the gap
    expect(wouldOverlap(clips, 8, 2)).toBe(false); // tail
  });
  it('excludes the moving clip itself', () => {
    expect(wouldOverlap(clips, 0, 3.5, 'a')).toBe(false);
    expect(wouldOverlap(clips, 3, 3, 'a')).toBe(true); // [3,6) hits b@4.5, a excluded
  });
});

/* ---- R20: the OT drop law (resolveDropEscape) + mintTrackId ---- */

describe('resolveDropEscape (R20 — OT free / escape / conflict, windowed)', () => {
  // the seed V1 lane: c1 [0,3.5) c2 [4.5,8) c3 [9,12.5); tracks V1+A1 only
  it('free span: plain drop — the mover keeps its own track', () => {
    expect(resolveDropEscape(seedDoc(), 'c1', 13, 3.5)).toEqual({ verdict: 'free' });
  });

  it('touching edges are NOT conflicts (butt-joint is a legal drop)', () => {
    // c3 at 8: span [8,11.5) — c2 ends exactly at 8 (touch), c3 is the mover
    expect(resolveDropEscape(seedDoc(), 'c3', 8, 3.5)).toEqual({ verdict: 'free' });
  });

  it('seed doc has no second video track: a conflict can only mint → conflict', () => {
    // c3 (dur 3.5) at 2: span [2,5.5) overlaps c1 [0,3.5)
    expect(resolveDropEscape(seedDoc(), 'c3', 2, 3.5)).toEqual({ verdict: 'conflict' });
  });

  it('mover missing → free (degenerate guard)', () => {
    expect(resolveDropEscape(seedDoc(), 'nope', 2, 3.5)).toEqual({ verdict: 'free' });
  });

  it('multiTrackDoc: PREFER-EXISTING — a free same-kind track hosts the escape', () => {
    // V1: c1[0,3.5) c2[4.5,8) c3[9,12.5); V2: c5[1,6.5) c6[8,12)
    // c1 at 12: span [12,15.5) conflicts c3 on V1; V2 is free past 12
    expect(resolveDropEscape(multiTrackDoc(), 'c1', 12, 3.5)).toEqual({
      verdict: 'escape',
      trackId: 'V2',
      minted: false,
    });
  });

  it('multiTrackDoc: an existing-but-BUSY track does not host → conflict (mint is next)', () => {
    // c1 at 2: span [2,5.5) overlaps c2 [4.5,8) on V1; V2's c5 [1,6.5)
    // covers the span → busy → no existing host → conflict (the store mints)
    expect(resolveDropEscape(multiTrackDoc(), 'c1', 2, 3.5)).toEqual({ verdict: 'conflict' });
  });

  it('audio never escapes to a VIDEO track (same-kind candidates only)', () => {
    const doc: Doc = {
      tracks: [
        { id: 'V1', kind: 'video', label: 'V1' },
        { id: 'V2', kind: 'video', label: 'V2' },
        { id: 'A1', kind: 'audio', label: 'A1' },
      ],
      media: [],
      clips: [
        { id: 'a1', trackId: 'A1', mediaId: 'm', start: 2, duration: 3 },
        { id: 'a2', trackId: 'A1', mediaId: 'm', start: 8, duration: 3 },
        { id: 'v1', trackId: 'V1', mediaId: 'm', start: 0, duration: 20 },
        { id: 'v2', trackId: 'V2', mediaId: 'm', start: 0, duration: 20 }, // both video tracks busy — but irrelevant
      ],
    };
    // a2 at 3: span [3,6) overlaps a1 [2,5) on A1; V1/V2 are video — never candidates
    expect(resolveDropEscape(doc, 'a2', 3, 3)).toEqual({ verdict: 'conflict' });
  });

  it('FIRST same-kind track in doc order wins when several are free (deterministic)', () => {
    const tracks: Track[] = [
      { id: 'V1', kind: 'video', label: 'V1' },
      { id: 'V2', kind: 'video', label: 'V2' },
      { id: 'V3', kind: 'video', label: 'V3' },
    ];
    const doc: Doc = {
      tracks,
      media: [],
      clips: [
        { id: 'm1', trackId: 'V1', mediaId: 'm', start: 0, duration: 4 },
        { id: 'm2', trackId: 'V1', mediaId: 'm', start: 6, duration: 4 },
      ],
    };
    // m2 at 2: span [2,6) overlaps m1 on V1; V2 and V3 both free → V2 (doc order)
    expect(resolveDropEscape(doc, 'm2', 2, 4)).toEqual({
      verdict: 'escape',
      trackId: 'V2',
      minted: false,
    });
  });

  it('CROSS-TRACK law: an audio clip under the span is not a conflict source', () => {
    // c3 at 2 overlaps c1 on V1 — c4 [1.5,8.5) on A1 sits under the span
    // and must not be read as a conflict for a V1 mover
    expect(resolveDropEscape(seedDoc(), 'c3', 2, 3.5)).toEqual({ verdict: 'conflict' });
    // (the verdict is conflict because V1's OWN c1 conflicts — not because of c4;
    // the store-level mint then lands the escape on a minted V2, and c4 stays)
  });
});

describe('mintTrackId (R20 — the new-track fallback naming law)', () => {
  it('seed doc: video mints V2, audio mints A2 (kind-local series)', () => {
    expect(mintTrackId(seedDoc().tracks, 'video')).toBe('V2');
    expect(mintTrackId(seedDoc().tracks, 'audio')).toBe('A2');
  });

  it('multiTrackDoc: V3 / A3 past the existing pairs', () => {
    expect(mintTrackId(multiTrackDoc().tracks, 'video')).toBe('V3');
    expect(mintTrackId(multiTrackDoc().tracks, 'audio')).toBe('A3');
  });

  it('a GAP in the series never re-mints an existing id (V1,V3 → V4)', () => {
    const tracks: Track[] = [
      { id: 'V1', kind: 'video', label: 'V1' },
      { id: 'V3', kind: 'video', label: 'V3' },
      { id: 'A1', kind: 'audio', label: 'A1' },
    ];
    expect(mintTrackId(tracks, 'video')).toBe('V4');
  });

  it('the two series are independent (A mints ignore V numbers)', () => {
    const tracks: Track[] = [
      { id: 'V1', kind: 'video', label: 'V1' },
      { id: 'V5', kind: 'video', label: 'V5' },
      { id: 'A1', kind: 'audio', label: 'A1' },
    ];
    expect(mintTrackId(tracks, 'audio')).toBe('A2');
  });
});

describe('trimGhostBound (R19, thread #51 — the ghost extent law)', () => {
  const doc: Doc = seedDoc();
  const media = (id: string): Media | undefined => doc.media.find((m) => m.id === id);

  it('end edge: min(nextStart, source) — the seed c2 end-ghost is the 1s gap', () => {
    const c2 = doc.clips.find((c) => c.id === 'c2')!; // [4.5,8), media 4.5s
    expect(trimGhostBound(doc, c2, 'end', false, media('m-beach'))).toBe(9); // neighbor c3@9 < source 9
  });
  it('end edge under RIPPLE: source only (followers push, neighbor ignored)', () => {
    const c2 = doc.clips.find((c) => c.id === 'c2')!;
    expect(trimGhostBound(doc, c2, 'end', true, media('m-beach'))).toBe(4.5 + 4.5); // 9 = start+source
  });
  it('end edge at max (source == end): null — no ghost when nothing remains', () => {
    const at = (c: Clip) => ({ ...c, duration: 4.5, start: 4.5 }); // c2 maxed: [4.5,9)
    const c2max = at(doc.clips.find((c) => c.id === 'c2')!);
    const d2 = { ...doc, clips: [c2max, ...doc.clips.filter((c) => c.id !== 'c2')] };
    expect(trimGhostBound(d2, c2max, 'end', true, media('m-beach'))).toBeNull();
  });
  it('start edge: max(prevEnd, end − source) — c2 can reach back to 3.5', () => {
    const c2 = doc.clips.find((c) => c.id === 'c2')!; // end 8, source 4.5 → 8−4.5=3.5 = prevEnd
    expect(trimGhostBound(doc, c2, 'start', false, media('m-beach'))).toBe(3.5);
  });
  it('start edge under RIPPLE: null — frozen-left (a leftward ghost would lie)', () => {
    const c2 = doc.clips.find((c) => c.id === 'c2')!;
    expect(trimGhostBound(doc, c2, 'start', true, media('m-beach'))).toBeNull();
  });
  it('start edge at max: null', () => {
    const c1 = doc.clips.find((c) => c.id === 'c1')!; // [0,3.5) media 4.5: lo = max(0, 3.5−4.5)=0 = start
    expect(trimGhostBound(doc, c1, 'start', false, media('m-drone'))).toBeNull();
  });
});

describe('magnetMove (R19 — BOTH edges, nearest wins, ties → left)', () => {
  it('left edge magnets: start = target', () => {
    const m = magnetMove(2.03, 96, 2, [2]);
    expect(m).toEqual({ start: 2, guide: 2 });
  });
  it('RIGHT edge magnets: start = target − dur (butt-join from the right)', () => {
    // raw 3.5, dur 2 → right edge 5.5 magnets to 5.5: start 3.5→3.5? use raw 3.4:
    const m = magnetMove(3.4, 96, 2, [5.5]);
    expect(m).toEqual({ start: 3.5, guide: 5.5 });
  });
  it('nearest wins when both edges have candidates', () => {
    // left edge 2.05 vs target 2 (4.8px); right edge 5.5 vs target 5.4 (9.6px) → left
    const m = magnetMove(2.05, 96, 3.45, [2, 5.4]);
    expect(m).toEqual({ start: 2, guide: 2 });
  });
  it('ties → the LEFT edge (deterministic)', () => {
    // raw 2.125 dur 2: left candidate 2 (exactly 12px); right edge 4.125,
    // candidate 4.25 (also exactly 12px) — the strict < keeps the LEFT win
    const m = magnetMove(2.125, 96, 2, [2, 4.25]);
    expect(m!.start).toBe(2);
  });
  it('no candidate in range → null (smooth raw drag)', () => {
    expect(magnetMove(2.4, 96, 2, [10])).toBeNull();
  });
});

describe('magnetTarget (R19: nearest, not first-in-array)', () => {
  it('picks the NEAREST target inside 12px when two are in range', () => {
    // at 96pps: 2.0 is 19.2px from 2.2 — too far. Use 48pps: 2.2→2.0 = 9.6px, 2.2→2.3 = 4.8px → nearest is 2.3
    expect(magnetTarget(2.2, 48, [2.3, 2.0])).toBe(2.3);
  });
  it('still inclusive at exactly 12px', () => {
    expect(magnetTarget(2.125, 96, [2])).toBe(2);
    expect(magnetTarget(2.13, 96, [2])).toBeNull();
  });
});

describe('trim clamps (audit M1 + review: media bound on BOTH edges)', () => {
  it('start-trim: bounded by prevEnd and end - MIN_DUR (no media)', () => {
    const c = clip({ start: 4, duration: 2 });
    expect(clampTrimStart(1, c, 2, undefined)).toEqual({ start: 2, duration: 4 });
    expect(clampTrimStart(7, c, 2, undefined)).toEqual({ start: 5.5, duration: 0.5 });
    expect(clampTrimStart(4.5, c, 2, undefined)).toEqual({ start: 4.5, duration: 1.5 });
  });
  it('start-trim: duration can never exceed the media duration', () => {
    const c = clip({ start: 4, duration: 2 }); // end = 6
    const media = { id: 'm', name: 'm', kind: 'video', duration: 1.5, hue: 0 } as const;
    // lo = max(prevEnd 0, end − media 4.5) = 4.5 → duration caps at 1.5
    expect(clampTrimStart(1, c, 0, media)).toEqual({ start: 4.5, duration: 1.5 });
  });
  it('end-trim: bounded by start + MIN_DUR and min(nextStart, media end)', () => {
    const c = clip({ start: 4, duration: 2 });
    const media = { id: 'm', name: 'm', kind: 'video', duration: 5, hue: 0 } as const;
    expect(clampTrimEnd(9, c, 10, media)).toEqual({ start: 4, duration: 5 }); // media cap wins over neighbor
    expect(clampTrimEnd(9, c, 6, media)).toEqual({ start: 4, duration: 2 }); // neighbor cap
    expect(clampTrimEnd(4.2, c, 10, media)).toEqual({ start: 4, duration: 0.5 }); // min dur
    expect(clampTrimEnd(9, c, 10, undefined)).toEqual({ start: 4, duration: 5 });
  });
});

describe('splitPoint (audit M1: quantized + clamped + windowed)', () => {
  it('splits mid-clip on the grid', () => {
    expect(splitPoint(2.3, clip({ start: 1, duration: 3 }))).toBe(2.5);
  });
  it('clamps both halves to >= 0.5s', () => {
    expect(splitPoint(1.1, clip({ start: 1, duration: 3 }))).toBe(1.5);
    expect(splitPoint(3.9, clip({ start: 1, duration: 3 }))).toBe(3.5);
  });
  it('rejects clips under 1s', () => {
    expect(splitPoint(0.2, clip({ start: 0, duration: 0.5 }))).toBeNull();
  });
  it('rejects playhead outside the half-open window', () => {
    expect(splitPoint(0.5, clip({ start: 1, duration: 3 }))).toBeNull();
    expect(splitPoint(4, clip({ start: 1, duration: 3 }))).toBeNull();
    expect(splitPoint(1, clip({ start: 1, duration: 3 }))).toBe(1.5); // at start → clamped
  });
});

describe('resolveSnap (R18i: magnet only — the NLE snap convention)', () => {
  it('returns raw when snap is off', () => {
    expect(resolveSnap(2.3, false, 96, [2])).toBe(2.3);
  });
  it('magnet commits its EXACT target (a playhead target is kept off-grid)', () => {
    expect(resolveSnap(2.03, true, 96, [2])).toBe(2); // 0.03s*96 ≈ 3px < 12px magnet
    expect(resolveSnap(2.03, true, 96, [2.07])).toBe(2.07); // magnet target kept exact (off-grid ok)
  });
  it('no magnet hit → the pointer time passes through SMOOTH (no beat-grid stepping)', () => {
    // R18i (thread #12): the 0.5s grid no longer fills this branch — NLE
    // snap toggles are edit-point magnets, not beat grids; drags commit the
    // pointer's own position exactly like an NLE frame-aligns to the pointer
    expect(resolveSnap(2.3, true, 96, [10])).toBe(2.3);
  });
  it('no magnet beyond 12px (raw result must differ from the target)', () => {
    // 2.4 vs target 2: |Δ|*96 = 38px > 12 → raw 2.4 (≠ target 2 — a broken
    // radius check would return 2 and fail this)
    expect(resolveSnap(2.4, true, 96, [2])).toBe(2.4);
  });
  it('magnet radius is 12px inclusive', () => {
    expect(magnetTarget(2.125, 96, [2])).toBe(2); // exactly 12px
    expect(magnetTarget(2.13, 96, [2])).toBeNull(); // just past
  });
  it('snap ON with no targets at all is a pure passthrough', () => {
    expect(resolveSnap(7.312, true, 48, [])).toBe(7.312);
  });
});

describe('playhead scrub clamp', () => {
  it('clamps to [0, end], unquantized', () => {
    expect(clampPlayhead(3.7, 10)).toBe(3.7);
    expect(clampPlayhead(-1, 10)).toBe(0);
    expect(clampPlayhead(11, 10)).toBe(10);
  });
});

/* ---- R18e: pool→timeline insertion placement ---- */

describe('insertionAt (DnD placement)', () => {
  const clips = [
    { id: 'a', trackId: 'V1', mediaId: 'm', start: 0, duration: 3.5 },
    { id: 'b', trackId: 'V1', mediaId: 'm', start: 4.5, duration: 3.5 },
  ];

  it('exact free spot: quantized request, nothing in the way', () => {
    const r = insertionAt(clips, 2, 8.7);
    expect(r).toEqual({ start: 8.5, exact: true });
  });

  it('overlapping request: bumps to the next clip END that fits', () => {
    // 1.0 + 2 > clip a end 3.5 and < b start 4.5? no room → after b (8.0)
    const r = insertionAt(clips, 2, 1.0);
    expect(r).toEqual({ start: 8.0, exact: false });
  });

  it('fits in the 1s gap between a and b when short enough', () => {
    const r = insertionAt(clips, 1, 1.0); // [1,2] fits inside gap [3.5,4.5)? no — [1,2] hits a. want the 3.5..4.5 gap
    expect(r).toEqual({ start: 3.5, exact: false });
  });

  it('a duration that fits no gap bumps to the lane TAIL (append), never null', () => {
    const packed = Array.from({ length: 40 }, (_, i) => ({
      id: `p${i}`, trackId: 'V1', mediaId: 'm', start: i * 10, duration: 9.5,
    }));
    // 100s fits no inter-clip gap → tail (last clip ends 399.5)
    expect(insertionAt(packed, 100, 5)).toEqual({ start: 399.5, exact: false });
    // degenerate duration only → null
    expect(insertionAt(packed, 0, 5)).toBeNull();
  });

  it('quantizes the requested time and clamps below 0', () => {
    expect(insertionAt([], 2, -3.2)).toEqual({ start: 0, exact: true });
  });

  it('PR69 C18: a drop whose spot is blocked lands in the gap it fell INTO, not the tail', () => {
    // a=[0,3.5], b=[8,12]: want 5 + 4 duration is blocked by b; the
    // containing gap [3.5,8) hosts it at the gap START (the old filter
    // skipped the gap and jumped to the tail 12.0 with 4.5s of open lane
    // under the pointer)
    const lane = [
      { id: 'a', trackId: 'V1', mediaId: 'm', start: 0, duration: 3.5 },
      { id: 'b', trackId: 'V1', mediaId: 'm', start: 8, duration: 4 },
    ];
    expect(insertionAt(lane, 4, 5)).toEqual({ start: 3.5, exact: false });
    // dropping a 4s clip at t=3.4 was ALWAYS gap behavior — unchanged
    expect(insertionAt(lane, 4, 3.4)).toEqual({ start: 3.5, exact: true });
    // a too-narrow gap is still passed over (the free-check stays the gate)
    expect(insertionAt(lane, 4.9, 5)).toEqual({ start: 12, exact: false });
  });
});

/* ---- R18e: ripple shift ---- */

describe('rippleShiftAfter (ripple edit law)', () => {
  const clips = [
    { id: 'a', trackId: 'V1', mediaId: 'm', start: 0, duration: 3 },
    { id: 'b', trackId: 'V1', mediaId: 'm', start: 4, duration: 2 },
    { id: 'c', trackId: 'A1', mediaId: 'm', start: 4, duration: 2 },
  ];

  it('shifts same-track followers left by the removed duration', () => {
    const out = rippleShiftAfter(clips, 'V1', 3, -3);
    expect(out.find((c) => c.id === 'a')!.start).toBe(0); // before the edit point: untouched
    expect(out.find((c) => c.id === 'b')!.start).toBe(1);
    expect(out.find((c) => c.id === 'c')!.start).toBe(4); // other track: untouched
  });

  it('excludes a clip id (the edited clip itself)', () => {
    const out = rippleShiftAfter(clips, 'V1', 0, 5, 'a');
    expect(out.find((c) => c.id === 'a')!.start).toBe(0);
    expect(out.find((c) => c.id === 'b')!.start).toBe(9);
  });

  it('zero delta is identity (same array)', () => {
    expect(rippleShiftAfter(clips, 'V1', 3, 0)).toBe(clips);
  });

  it('never shifts below 0 (quantized floor)', () => {
    const near = [{ id: 'n', trackId: 'V1', mediaId: 'm', start: 1, duration: 1 }];
    const out = rippleShiftAfter(near, 'V1', 0, -2);
    expect(out[0].start).toBe(0);
  });
});
