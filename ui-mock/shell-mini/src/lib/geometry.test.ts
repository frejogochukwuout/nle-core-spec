/* Geometry law tests (DESIGN D7, audit M1/M5) — pure functions, strict
   equality throughout (the 0.5 grid is binary-exact by D5/m5). */

import { describe, expect, it } from 'vitest';
import {
  PPS_STEPS,
  clampMove,
  clampPlayhead,
  clampTrimEnd,
  clampTrimStart,
  contentEnd,
  labelStepFor,
  neighborBounds,
  ppsFor,
  quantize,
  resolveSnap,
  splitPoint,
  timeToPx,
  pxToTime,
} from './geometry';
import { seedDoc, type Clip } from './mockData';

const clip = (over: Partial<Clip>): Clip => ({
  id: 'x',
  trackId: 'V1',
  mediaId: 'm-drone',
  start: 0,
  duration: 2,
  ...over,
});

describe('zoom ladder', () => {
  it('exposes 5 steps (RH slider parity)', () => {
    expect(PPS_STEPS).toHaveLength(5);
  });
  it('maps steps to pps, clamping out-of-range', () => {
    expect(ppsFor(0)).toBe(24);
    expect(ppsFor(1)).toBe(48);
    expect(ppsFor(4)).toBe(384);
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

describe('move clamp', () => {
  it('clamps between prevEnd and nextStart - duration', () => {
    expect(clampMove(3, 2, 4, 10)).toBe(4);
    expect(clampMove(9, 2, 4, 10)).toBe(8);
    expect(clampMove(5, 2, 4, 10)).toBe(5);
  });
  it('parks at neighbor end in the degenerate no-room case', () => {
    expect(clampMove(5, 4, 4, 5)).toBe(4);
  });
});

describe('trim clamps (audit M1)', () => {
  it('start-trim: bounded by prevEnd and end - MIN_DUR', () => {
    const c = clip({ start: 4, duration: 2 });
    expect(clampTrimStart(1, c, 2)).toEqual({ start: 2, duration: 4 });
    expect(clampTrimStart(7, c, 2)).toEqual({ start: 5.5, duration: 0.5 });
    expect(clampTrimStart(4.5, c, 2)).toEqual({ start: 4.5, duration: 1.5 });
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

describe('resolveSnap (magnet first, then grid)', () => {
  it('returns raw when snap is off', () => {
    expect(resolveSnap(2.3, false, 96, [2])).toBe(2.3);
  });
  it('magnet wins over grid (a playhead target is kept EXACT)', () => {
    expect(resolveSnap(2.03, true, 96, [2])).toBe(2); // 0.03s*96 ≈ 3px < 12px magnet
    expect(resolveSnap(2.03, true, 96, [2.07])).toBe(2.07); // magnet target kept exact (off-grid ok)
  });
  it('falls back to the grid when no magnet hit', () => {
    expect(resolveSnap(2.3, true, 96, [10])).toBe(2.5);
  });
  it('no magnet beyond 12px', () => {
    expect(resolveSnap(2.2, true, 96, [2])).toBe(2); // 0.2s*96 = 19px > 12px → grid: 2.2→2
  });
});

describe('playhead scrub clamp', () => {
  it('clamps to [0, end], unquantized', () => {
    expect(clampPlayhead(3.7, 10)).toBe(3.7);
    expect(clampPlayhead(-1, 10)).toBe(0);
    expect(clampPlayhead(11, 10)).toBe(10);
  });
});
