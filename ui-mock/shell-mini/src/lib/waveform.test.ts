/* Waveform envelope tests (R18e — feedback #12): determinism, bounds,
   and audio-SHAPE (the variance a real waveform has — the old uniform
   bar pattern had zero, which is what read as fake). */

import { describe, expect, it } from 'vitest';
import { envelopeAt, waveformFor } from './waveform';
import { SEED_MEDIA } from './mockData';

const audio = SEED_MEDIA.find((m) => m.id === 'm-interview')!;

describe('waveformFor (bars)', () => {
  it('returns the requested bar count (clamped 1..256)', () => {
    expect(waveformFor(audio, 40)).toHaveLength(40);
    expect(waveformFor(audio, 1)).toHaveLength(1);
    expect(waveformFor(audio, 999)).toHaveLength(256);
  });

  it('every bar is in (0, 1]', () => {
    for (const v of waveformFor(audio, 96)) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('deterministic: same media + count → identical bars', () => {
    expect(waveformFor(audio, 64)).toEqual(waveformFor(audio, 64));
  });

  it('different media → different envelopes (per-asset character)', () => {
    const other = SEED_MEDIA.find((m) => m.id === 'm-ambience')!;
    expect(waveformFor(audio, 64)).not.toEqual(waveformFor(other, 64));
  });
});

describe('envelopeAt (shape laws)', () => {
  it('attack/decay ramps: the first/last samples are quieter than the body peak', () => {
    const bars = waveformFor(audio, 96);
    const bodyPeak = Math.max(...bars.slice(8, -8));
    expect(bars[0]).toBeLessThan(bodyPeak);
    expect(bars[bars.length - 1]).toBeLessThan(bodyPeak);
  });

  it('variance is real (a uniform placeholder would have ~zero spread)', () => {
    const bars = waveformFor(audio, 96);
    const mean = bars.reduce((a, b) => a + b, 0) / bars.length;
    const spread = bars.reduce((a, b) => a + (b - mean) ** 2, 0) / bars.length;
    expect(spread).toBeGreaterThan(0.004); // std > ~0.063
  });

  it('resolution-independent: u-space sampling, not bar-index hashing', () => {
    // sampling at the same u through different bar counts agrees at shared points
    expect(envelopeAt(audio, 0.25)).toBeCloseTo(waveformFor(audio, 5)[1], 5);
  });
});
