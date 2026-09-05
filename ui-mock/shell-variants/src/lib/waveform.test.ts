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
