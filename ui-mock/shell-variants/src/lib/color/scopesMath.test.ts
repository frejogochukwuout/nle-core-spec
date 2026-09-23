/* scopesMath.test.ts — R20-W4a. Pins the real-data scope reductions
   (color-layout §3.7): waveform column histograms + column mapping, the RGB
   parade, channel histograms, the BT.601 vectorscope (U = 0.492·(B−Y),
   V = 0.877·(R−Y) — pure red lands at 103°, computed from the BT.601 math),
   the spec-08 §11.3 graticule targets/skin-tone line, the ≤10k point cap,
   and the density alpha curve. ImageData is stubbed structurally. */

import { describe, expect, it } from 'vitest';
import {
  SKIN_TONE_LINE,
  VECTORSCOPE_CIRCLES,
  VECTORSCOPE_GAIN,
  VECTORSCOPE_TARGETS,
  densityAlpha,
  histogram,
  parade,
  vectorscopePoints,
  waveformColumns,
} from './scopesMath';
import type { WaveformChannel } from './scopesMath';

const makeImageData = (w: number, h: number, fill: (i: number) => [number, number, number]): ImageData => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = fill(i);
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { data, width: w, height: h, colorSpace: 'srgb' } as unknown as ImageData;
};

describe('waveformColumns — column-histogram reduction', () => {
  const img = makeImageData(4, 2, () => [200, 100, 50]);

  it('bins every pixel into its column × level with exact counts (r channel)', () => {
    const wf = waveformColumns(img, 'r');
    expect(wf.cols).toBe(4);
    expect(wf.levels).toBe(256);
    expect(wf.counts).toHaveLength(4 * 256);
    expect(wf.max).toBe(2); // 2 rows per column
    for (let col = 0; col < 4; col++) {
      expect(wf.counts[col * 256 + 200]).toBe(2);
      // every other level in the column is empty
      for (let level = 0; level < 256; level++) {
        if (level !== 200) expect(wf.counts[col * 256 + level]).toBe(0);
      }
    }
  });

  it('luma waveform uses BT.601 (Y601 of (200,100,50) = 124.2 → level 124)', () => {
    const wf = waveformColumns(img, 'y');
    expect(wf.counts[0 * 256 + 124]).toBe(2);
    expect(wf.counts[1 * 256 + 124]).toBe(2);
  });

  it('maps source x to the right column bin (x=0 red, x=1 blue)', () => {
    const split = makeImageData(2, 1, (i) => (i === 0 ? [255, 0, 0] : [0, 0, 255]));
    const r = waveformColumns(split, 'r');
    expect(r.counts[0 * 256 + 255]).toBe(1);
    expect(r.counts[1 * 256 + 0]).toBe(1);
    const b = waveformColumns(split, 'b');
    expect(b.counts[0 * 256 + 0]).toBe(1);
    expect(b.counts[1 * 256 + 255]).toBe(1);
    const g = waveformColumns(split, 'g');
    expect(g.counts[0 * 256 + 0]).toBe(1);
    expect(g.counts[1 * 256 + 0]).toBe(1);
  });

  it('reduces columns under maxCols (4 px → 2 cols: x0,x1 → col 0)', () => {
    const img4 = makeImageData(4, 1, (i) => (i < 2 ? [255, 0, 0] : [0, 0, 255]));
    const wf = waveformColumns(img4, 'r', 2);
    expect(wf.cols).toBe(2);
    expect(wf.counts[0 * 256 + 255]).toBe(2);
    expect(wf.counts[1 * 256 + 0]).toBe(2);
  });

  it('never upsamples past the image width and floors at 1 column', () => {
    const img4 = makeImageData(4, 1, () => [9, 9, 9]);
    expect(waveformColumns(img4, 'r', 300).cols).toBe(4);
    expect(waveformColumns(img4, 'r', 1).cols).toBe(1);
  });

  it('runs every channel without NaNs (r/g/b/y smoke)', () => {
    for (const channel of ['r', 'g', 'b', 'y'] as WaveformChannel[]) {
      const wf = waveformColumns(img, channel);
      expect(wf.max).toBe(2);
      expect(Number.isFinite(wf.max)).toBe(true);
    }
  });
});

describe('parade — R|G|B panels with a shared max', () => {
  it('three panels of equal geometry, shared scale = max across channels', () => {
    const split = makeImageData(2, 1, (i) => (i === 0 ? [255, 0, 0] : [0, 0, 255]));
    const p = parade(split);
    expect(p.r.cols).toBe(2);
    expect(p.g.cols).toBe(2);
    expect(p.b.cols).toBe(2);
    expect(p.r.counts[0 * 256 + 255]).toBe(1);
    expect(p.b.counts[1 * 256 + 255]).toBe(1);
    expect(p.sharedMax).toBe(1);
  });

  it('sharedMax reflects the busiest panel cell (uniform 2-row image → 2)', () => {
    const img = makeImageData(4, 2, () => [200, 100, 50]);
    expect(parade(img).sharedMax).toBe(2);
  });
});

describe('histogram — 256 bins × 3 channels', () => {
  it('counts exact per-channel bin populations and the global max', () => {
    const split = makeImageData(2, 1, (i) => (i === 0 ? [255, 0, 0] : [0, 0, 255]));
    const h = histogram(split);
    expect(h.r[255]).toBe(1);
    expect(h.r[0]).toBe(1);
    expect(h.g[0]).toBe(2);
    expect(h.b[0]).toBe(1);
    expect(h.b[255]).toBe(1);
    expect(h.max).toBe(2); // g[0] = 2
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    for (let i = 0; i < 256; i++) {
      sumR += h.r[i];
      sumG += h.g[i];
      sumB += h.b[i];
    }
    expect(sumR).toBe(2);
    expect(sumG).toBe(2);
    expect(sumB).toBe(2);
  });
});

describe('vectorscopePoints — BT.601 U/V, ≤10k stride-sampled points', () => {
  it('pure red lands at 103° (expected computed from the BT.601 math)', () => {
    const img = makeImageData(4, 1, () => [255, 0, 0]);
    const { points, count } = vectorscopePoints(img, 4);
    expect(count).toBe(4);
    const y = 0.299; // BT.601 luma of pure red
    const u = 0.492 * (0 - y);
    const v = 0.877 * (1 - y);
    for (let i = 0; i < count; i++) {
      expect(points[i * 2]).toBeCloseTo(u * VECTORSCOPE_GAIN, 6); // points are float32
      expect(points[i * 2 + 1]).toBeCloseTo(v * VECTORSCOPE_GAIN, 6);
    }
    const angleDeg = (Math.atan2(v, u) * 180) / Math.PI;
    expect(angleDeg).toBeGreaterThan(102);
    expect(angleDeg).toBeLessThan(104); // ≈ 103.5° — spec 08 §11.3 target
  });

  it('all six 100% primaries land within 1° of the spec-08 §11.3 target angles', () => {
    const cases: Array<[[number, number, number], number]> = [
      [[255, 0, 0], 103], // R
      [[255, 0, 255], 61], // Mg
      [[0, 0, 255], -13], // B
      [[0, 255, 255], -77], // Cy
      [[0, 255, 0], -119], // G
      [[255, 255, 0], 167], // Yl
    ];
    for (const [[r, g, b], specAngle] of cases) {
      const img = makeImageData(1, 1, () => [r, g, b]);
      const { points, count } = vectorscopePoints(img, 1);
      expect(count).toBe(1);
      const rn = r / 255;
      const gn = g / 255;
      const bn = b / 255;
      const y = 0.299 * rn + 0.587 * gn + 0.114 * bn;
      const u = 0.492 * (bn - y);
      const v = 0.877 * (rn - y);
      // the plotted point IS the BT.601 chroma scaled by the display gain
      expect(points[0]).toBeCloseTo(u * VECTORSCOPE_GAIN, 6); // points are float32
      expect(points[1]).toBeCloseTo(v * VECTORSCOPE_GAIN, 6);
      const angleDeg = (Math.atan2(v, u) * 180) / Math.PI;
      expect(Math.abs(angleDeg - specAngle)).toBeLessThan(1);
    }
  });

  it('100% red sits just inside the outer ring (|U,V|·G < 1) — the G calibration', () => {
    const img = makeImageData(1, 1, () => [255, 0, 0]);
    const { points } = vectorscopePoints(img, 1);
    const r = Math.hypot(points[0], points[1]);
    expect(r).toBeGreaterThan(0.98);
    expect(r).toBeLessThan(1);
  });

  it('gray pixels have no chroma (points at the origin)', () => {
    const img = makeImageData(3, 3, () => [128, 128, 128]);
    const { points, count } = vectorscopePoints(img, 9);
    expect(count).toBe(9);
    for (let i = 0; i < count; i++) {
      expect(Math.abs(points[i * 2])).toBeLessThan(1e-6);
      expect(Math.abs(points[i * 2 + 1])).toBeLessThan(1e-6);
    }
  });

  it('respects the ≤10k point cap via stride sampling (100×100 @ 10 → 10 points)', () => {
    const img = makeImageData(100, 100, (i) => [(i * 7) % 256, (i * 13) % 256, (i * 29) % 256]);
    const { count } = vectorscopePoints(img, 10);
    expect(count).toBe(10);
    expect(count).toBeLessThanOrEqual(10);
  });

  it('density grid accumulates the sampled points (all-red → one hot cell)', () => {
    const img = makeImageData(4, 1, () => [255, 0, 0]);
    const { density, count } = vectorscopePoints(img, 4);
    expect(density.size).toBe(64);
    expect(density.max).toBe(count);
    let sum = 0;
    for (const c of density.counts) sum += c;
    expect(sum).toBe(count);
  });
});

describe('vectorscope graticule (spec 08 §11.3)', () => {
  it('six targets at the spec angles on the 75% ring, computed from BT.601', () => {
    expect(VECTORSCOPE_TARGETS.map((t) => t.label)).toEqual(['R', 'Mg', 'B', 'Cy', 'G', 'Yl']);
    const specAngles = [103, 61, -13, -77, -119, 167];
    const primaries: Array<[number, number, number]> = [
      [1, 0, 0], [1, 0, 1], [0, 0, 1], [0, 1, 1], [0, 1, 0], [1, 1, 0],
    ];
    VECTORSCOPE_TARGETS.forEach((t, i) => {
      expect(Math.abs(t.angleDeg - specAngles[i])).toBeLessThan(1);
      expect(t.radius).toBe(0.75);
      // on the 75% ring
      expect(Math.hypot(t.u, t.v)).toBeCloseTo(0.75, 9);
      // direction matches the BT.601 chroma of the primary
      const [r, g, b] = primaries[i];
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      const u = 0.492 * (b - y);
      const v = 0.877 * (r - y);
      expect(t.u).toBeCloseTo((u / Math.hypot(u, v)) * 0.75, 9);
      expect(t.v).toBeCloseTo((v / Math.hypot(u, v)) * 0.75, 9);
    });
  });

  it('circles at 100/75/25% and the 123° skin-tone line (unit direction)', () => {
    expect(VECTORSCOPE_CIRCLES).toEqual([1, 0.75, 0.25]);
    expect(SKIN_TONE_LINE.angleDeg).toBe(123);
    expect(Math.hypot(SKIN_TONE_LINE.u, SKIN_TONE_LINE.v)).toBeCloseTo(1, 12);
    expect(SKIN_TONE_LINE.u).toBeCloseTo(Math.cos((123 * Math.PI) / 180), 12);
    expect(SKIN_TONE_LINE.v).toBeCloseTo(Math.sin((123 * Math.PI) / 180), 12);
  });

  it('VECTORSCOPE_GAIN = 1/0.6336 (color-layout §3.7 calibration)', () => {
    expect(VECTORSCOPE_GAIN).toBeCloseTo(1 / 0.6336, 12);
  });
});

describe('densityAlpha — alpha-blended drawing curve (color-layout §3.7)', () => {
  it('empty cells get the 0.06 floor; the max cell is fully opaque', () => {
    expect(densityAlpha(0, 10)).toBeCloseTo(0.06, 12);
    expect(densityAlpha(10, 10)).toBe(1);
    expect(densityAlpha(0, 0)).toBeCloseTo(0.06, 12); // degenerate max
  });

  it('follows clamp(log2(1+n)/log2(1+max), 0.06, 1) and is monotonic', () => {
    expect(densityAlpha(5, 10)).toBeCloseTo(Math.log2(6) / Math.log2(11), 12);
    let prev = -1;
    for (let n = 0; n <= 10; n++) {
      const a = densityAlpha(n, 10);
      expect(a).toBeGreaterThanOrEqual(0.06);
      expect(a).toBeLessThanOrEqual(1);
      expect(a).toBeGreaterThanOrEqual(prev);
      prev = a;
    }
  });
});
