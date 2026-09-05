/* rulerTiers.test.ts — R15 T1 unit pins for the CapCut tier tables. */

import { describe, it, expect } from 'vitest';
import { getRulerConfig, formatRulerLabel, shouldShowLabel, getRulerWindow, tickTimes, FPS, MIN_LABEL_SPACING_PX, MIN_TICK_SPACING_PX } from './rulerTiers';

describe('getRulerConfig (canonical tier selection)', () => {
  it('46 pps → label 3 s, tick 1 s (divides the label, respects the 18 px floor)', () => {
    const { labelInterval, tickInterval } = getRulerConfig(46);
    expect(labelInterval).toBe(3);
    expect(tickInterval).toBe(1);
    expect(tickInterval * 46).toBeGreaterThanOrEqual(MIN_TICK_SPACING_PX);
  });

  it('120 pps → label 1 s, tick 1 s (frame tiers too dense for 18 px → fallback to label)', () => {
    const { labelInterval, tickInterval } = getRulerConfig(120);
    expect(labelInterval).toBe(1);
    expect(tickInterval).toBe(1);
  });

  it('240 pps → sub-second labels: 15 frames (0.625 s), ticks 5 frames', () => {
    const { labelInterval, tickInterval } = getRulerConfig(240);
    expect(labelInterval).toBeCloseTo(15 / FPS, 8);
    expect(tickInterval).toBeCloseTo(5 / FPS, 8);
  });

  it('5000 pps → frame-level: label 2 frames, tick 1 frame (every frame)', () => {
    const { labelInterval, tickInterval } = getRulerConfig(5000);
    expect(labelInterval).toBeCloseTo(2 / FPS, 8);
    expect(tickInterval).toBeCloseTo(1 / FPS, 8);
  });

  it('5 pps → 30 s labels, 5 s ticks (wide zoom-out)', () => {
    const { labelInterval, tickInterval } = getRulerConfig(5);
    expect(labelInterval).toBe(30);
    expect(tickInterval).toBe(5);
  });

  it('the tick interval always divides the label interval and keeps the spacing floors', () => {
    for (const pps of [5, 8, 15, 20, 46, 60, 90, 110, 120, 160, 200, 240, 480, 960, 2400, 5000]) {
      const { labelInterval, tickInterval } = getRulerConfig(pps);
      // divides (ε)
      expect(Math.abs((labelInterval / tickInterval) % 1)).toBeLessThan(1e-3);
      // spacing floors
      expect(tickInterval * pps).toBeGreaterThanOrEqual(MIN_TICK_SPACING_PX - 1e-6);
      expect(labelInterval * pps).toBeGreaterThanOrEqual(MIN_LABEL_SPACING_PX - 1e-6);
    }
  });
});

describe('formatRulerLabel (canonical label grammar)', () => {
  it('MM:SS at second boundaries, H:MM:SS at hours', () => {
    expect(formatRulerLabel(0)).toBe('00:00');
    expect(formatRulerLabel(3)).toBe('00:03');
    expect(formatRulerLabel(65)).toBe('01:05');
    expect(formatRulerLabel(3671)).toBe('1:01:11');
  });

  it('Xf between seconds (frames within the second, round(frac·fps))', () => {
    expect(formatRulerLabel(0.625)).toBe('15f');
    expect(formatRulerLabel(1.25)).toBe('6f');
    expect(formatRulerLabel(0.5)).toBe('12f');
  });
});

describe('shouldShowLabel (ε grid membership)', () => {
  it('is on-grid at exact multiples and off-grid in between', () => {
    expect(shouldShowLabel(3, 3)).toBe(true);
    expect(shouldShowLabel(6, 3)).toBe(true);
    expect(shouldShowLabel(4, 3)).toBe(false);
    expect(shouldShowLabel(5, 3)).toBe(false);
    expect(shouldShowLabel(0.625, 0.625)).toBe(true);
    expect(shouldShowLabel(1.25, 0.625)).toBe(true);
  });
});

describe('getRulerWindow (virtualization)', () => {
  it('scrollLeft 0 renders from tick 0; the buffer extends the tail', () => {
    const w = getRulerWindow(0, 400, 46, 1, 30, 34 * 46);
    expect(w.fromTick).toBe(0);
    // buffer = max(200, (scrollLeft + viewportW)·0.15) = max(200, 60) = 200
    expect(w.buffer).toBe(200);
    expect(w.toTick).toBe(Math.ceil((0 + 400 + 200) / 46 / 1));
  });

  it('a far scrollLeft culls the head of the tick list', () => {
    const w = getRulerWindow(6000, 400, 46, 1, 30, 34 * 46);
    // buffer = max(200, (6000+400)·0.15) = 960 → from = floor((6000−960)/46) = 109
    expect(w.fromTick).toBe(Math.max(0, Math.floor((6000 - 960) / 46)));
    expect(w.fromTick).toBeGreaterThan(100);
  });

  it('effectiveDuration extends the tick range to the dynamic width (ticks exist beyond content duration)', () => {
    // duration 30 s but content 34·46 px wide at 46 pps → effective 34 s → 35 ticks.
    // A window scrolled near the end reaches tick 34 (beyond the 31 the
    // duration alone would allow) — without effectiveDuration the ruler
    // renders empty beyond the content duration at zoom-out.
    const w = getRulerWindow(1500, 400, 46, 1, 30, 34 * 46);
    expect(w.toTick).toBeGreaterThanOrEqual(34 - 1);
    // and with duration-only width the same window stops at 30
    const wDur = getRulerWindow(1500, 400, 46, 1, 30, 30 * 46);
    expect(wDur.toTick).toBeLessThan(w.toTick);
  });

  it('tickTimes enumerates the window inclusive', () => {
    const ts = tickTimes({ fromTick: 2, toTick: 5, buffer: 0 }, 1);
    expect(ts).toEqual([2, 3, 4, 5]);
  });
});
