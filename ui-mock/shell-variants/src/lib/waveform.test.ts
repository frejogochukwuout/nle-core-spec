/* waveform.ts — deterministic seeded generator. The contract: same
   (id, bars, amplitude) triple always yields the same bars (no flakiness
   between renders / test runs), values stay in 0..1, and the cache returns
   the SAME array reference on repeat calls (Timeline relies on referential
   stability to avoid re-normalizing on every render). */

import { describe, expect, it } from 'vitest';
import { getWaveform } from './waveform';

describe('getWaveform', () => {
  it('is deterministic per id (same input, same output)', () => {
    const a = getWaveform('el-6', 64);
    const b = getWaveform('el-6', 64);
    expect(a).toEqual(b);
    // and differs between ids
    const c = getWaveform('el-7', 64);
    expect(c).not.toEqual(a);
  });

  it('returns exactly `bars` entries', () => {
    expect(getWaveform('x', 10)).toHaveLength(10);
    expect(getWaveform('x', 200)).toHaveLength(200);
    expect(getWaveform('x', 0)).toHaveLength(0);
  });

  it('keeps min/max within 0..1', () => {
    for (const bar of getWaveform('clamp-check', 500, { amplitude: 5 })) {
      expect(bar.min).toBeGreaterThanOrEqual(0);
      expect(bar.min).toBeLessThanOrEqual(1);
      expect(bar.max).toBeGreaterThanOrEqual(0);
      expect(bar.max).toBeLessThanOrEqual(1);
    }
  });

  it('amplitude scales the output', () => {
    const quiet = getWaveform('amp-check', 128, { amplitude: 0.1 });
    const loud = getWaveform('amp-check', 128, { amplitude: 1 });
    // scaled-down peaks should be lower on average (not strictly per-bar due to jitter)
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(avg(quiet.map((b) => b.max))).toBeLessThan(avg(loud.map((b) => b.max)));
  });

  it('caches by the full key (id:bars:amp) and returns a stable reference', () => {
    const first = getWaveform('cache-check', 32);
    const second = getWaveform('cache-check', 32);
    expect(second).toBe(first); // same reference — cache hit
    const otherAmp = getWaveform('cache-check', 32, { amplitude: 0.5 });
    expect(otherAmp).not.toBe(first);
    const otherBars = getWaveform('cache-check', 33);
    expect(otherBars).not.toBe(first);
    expect(otherBars).toHaveLength(33);
  });

  it('produces speech-ish bars: peaks vary but stay positive', () => {
    const bars = getWaveform('el-6', 100);
    expect(bars.some((b) => b.max > 0.15)).toBe(true);  // visible energy
    expect(bars.every((b) => b.min >= 0)).toBe(true);
  });
});

describe('R19 B3: attack/decay ramps (opt-in `ramp` — fixes th_mto2xtgc pattern)', () => {
  it('ramp:0 (the default) is bit-identical to the no-opts call', () => {
    const a = getWaveform('ramp-zero', 120);
    const b = getWaveform('ramp-zero', 120, { ramp: 0 });
    expect(b).toEqual(a);
  });

  it('shapes a QUIET head + tail; the body bars are untouched', () => {
    const plain = getWaveform('ramp-shape', 200);
    const ramped = getWaveform('ramp-shape', 200, { ramp: 0.25 }); // 50 head / 50 tail
    // head/tail strictly quieter than their no-ramp twins (same rand sequence
    // per index — the ramp only scales the generated peak)
    expect(ramped[0]!.max).toBeLessThan(plain[0]!.max);
    expect(ramped[199]!.max).toBeLessThan(plain[199]!.max);
    // body (shape = 1) is EXACTLY the no-ramp values
    for (let i = 60; i < 140; i++) {
      expect(ramped[i]!.max).toBe(plain[i]!.max);
      expect(ramped[i]!.min).toBe(plain[i]!.min);
    }
    // the ramp rises: an early head bar is quieter than a late head bar
    expect(ramped[5]!.max).toBeLessThan(ramped[45]!.max);
    // never a hard zero (apex kept inside the window)
    expect(ramped[0]!.max).toBeGreaterThan(0);
    // still 0..1
    for (const bar of ramped) expect(bar.max).toBeLessThanOrEqual(1);
  });

  it('ramp stays deterministic + cached under its own key', () => {
    const a = getWaveform('ramp-cache', 64, { ramp: 0.1 });
    const b = getWaveform('ramp-cache', 64, { ramp: 0.1 });
    expect(b).toBe(a); // same reference — cache hit
    const other = getWaveform('ramp-cache', 64, { ramp: 0.2 });
    expect(other).not.toBe(a);
    expect(other).not.toEqual(a);
  });
});

