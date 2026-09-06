/* scopesMath.ts — real scope data reductions from the 8-bit display buffer
   (post-encode — display-referred signal, what real NLE scopes measure;
   color-layout §3.7, gap C53).

   - Waveform / RGB Parade: per-column 256-level histograms (column bins per
     color-layout §3.7; Luma waveform uses BT.601 luma for legacy graticule
     parity). Full-buffer statistics — the ≤10k-point cap applies to DRAWN
     points, not statistics.
   - Vectorscope: BT.601 `U = 0.492·(B−Y)`, `V = 0.877·(R−Y)` on the
     gamma-encoded input, stride-sampled to ≤10k points; graticule targets
     103°/61°/−13°/−77°/−119°/167° on the 75% ring + circles 100/75/25% +
     the 123° skin-tone line (spec 08 §11.3).
   - Histogram: 256 bins × 3 channels, normalized to the max bin.
   - Density alpha for alpha-blended drawing: clamp(log2(1+n)/log2(1+max),
     0.06, 1) (color-layout §3.7 "simpler implementable spec").

   Pure, DOM-free (ImageData read-only). R20-W4a; drawing is W4c's job. */

import { luma601 } from './colorSpace';

export type WaveformChannel = 'r' | 'g' | 'b' | 'y';

/** Column histogram reduction: `counts[col·256 + level]`, `max` = busiest cell. */
export interface WaveformData {
  cols: number;
  /** Always 256 (8-bit levels). */
  levels: number;
  counts: Uint32Array;
  max: number;
}

const LEVELS = 256;

/** Map one 8-bit channel value to its 256-level bin. */
function levelOfChannel(channel: WaveformChannel, r: number, g: number, b: number): number {
  if (channel === 'r') return r;
  if (channel === 'g') return g;
  if (channel === 'b') return b;
  // Luma waveform on BT.601 (color-layout §3.7: "scopes use BT.601 luma for
  // legacy graticule parity") — 0..255 domain, rounded to the nearest level.
  const y = luma601(r, g, b);
  return y < 0 ? 0 : y > 255 ? 255 : Math.round(y);
}

/**
 * `waveformColumns(imgData, channel|luma, maxCols)` — column-histogram
 * reduction of the display buffer. Source x maps to `floor(x·cols/W)` bins
 * (cols ≤ maxCols, ≤ 256, never upsampled past the image width). Channel
 * 'y' is the BT.601 luma waveform.
 */
export function waveformColumns(img: ImageData, channel: WaveformChannel, maxCols = 256): WaveformData {
  const { data, width, height } = img;
  const cols = Math.max(1, Math.min(maxCols, LEVELS, width));
  const counts = new Uint32Array(cols * LEVELS);
  let max = 0;
  for (let y = 0; y < height; y++) {
    const rowOff = y * width;
    for (let x = 0; x < width; x++) {
      const i = (rowOff + x) * 4;
      const level = levelOfChannel(channel, data[i], data[i + 1], data[i + 2]);
      const bin = Math.min((x * cols) / width | 0, cols - 1);
      const c = ++counts[bin * LEVELS + level];
      if (c > max) max = c;
    }
  }
  return { cols, levels: LEVELS, counts, max };
}

/** RGB Parade — three side-by-side channel waveforms (waveform mode 5). */
export interface ParadeData {
  r: WaveformData;
  g: WaveformData;
  b: WaveformData;
  /** Shared scale across the three panels (honest cross-channel compare). */
  sharedMax: number;
}

/** `parade(imgData)` — R|G|B waveform reductions with a shared max. */
export function parade(img: ImageData, maxCols = 256): ParadeData {
  const r = waveformColumns(img, 'r', maxCols);
  const g = waveformColumns(img, 'g', maxCols);
  const b = waveformColumns(img, 'b', maxCols);
  return { r, g, b, sharedMax: Math.max(r.max, g.max, b.max) };
}

/** Channel histograms: 256 bins each, full-buffer scan, `max` = busiest bin. */
export interface HistogramData {
  r: Uint32Array;
  g: Uint32Array;
  b: Uint32Array;
  max: number;
}

/** `histogram(imgData)` — 256-bin R/G/B histograms normalized to `max`. */
export function histogram(img: ImageData): HistogramData {
  const { data } = img;
  const r = new Uint32Array(LEVELS);
  const g = new Uint32Array(LEVELS);
  const b = new Uint32Array(LEVELS);
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    const cr = ++r[data[i]];
    if (cr > max) max = cr;
    const cg = ++g[data[i + 1]];
    if (cg > max) max = cg;
    const cb = ++b[data[i + 2]];
    if (cb > max) max = cb;
  }
  return { r, g, b, max };
}

/* ------------------------------------------------------------------ *
 * Vectorscope (BT.601; spec 08 §11.3 graticule)                      *
 * ------------------------------------------------------------------ */

/**
 * Display scale G — color-layout §3.7: `1/0.6336`, normalizing so the 100%
 * saturation targets sit just inside the outer ring (red |U,V| = 0.632 →
 * 0.997). Points are reported pre-multiplied by this gain.
 */
export const VECTORSCOPE_GAIN = 1 / 0.6336;

/** Graticule circles at 100% / 75% / 25% (spec 08 §11.3). */
export const VECTORSCOPE_CIRCLES: readonly number[] = [1, 0.75, 0.25];

/** Skin-tone line angle (spec 08 §11.3 — FreeCut `vectorscope-scope.ts:131`). */
export const SKIN_TONE_LINE_ANGLE_DEG = 123;

/** One graticule target box. */
export interface VectorscopeTarget {
  label: 'R' | 'Mg' | 'B' | 'Cy' | 'G' | 'Yl';
  /** Derived from the BT.601 math (matches spec 08 §11.3's rounded values). */
  angleDeg: number;
  /** Position on the 75% ring at `angleDeg` (normalized units). */
  u: number;
  v: number;
  radius: number;
}

const PRIMARIES_100: ReadonlyArray<['R' | 'Mg' | 'B' | 'Cy' | 'G' | 'Yl', number, number, number]> = [
  ['R', 1, 0, 0],
  ['Mg', 1, 0, 1],
  ['B', 0, 0, 1],
  ['Cy', 0, 1, 1],
  ['G', 0, 1, 0],
  ['Yl', 1, 1, 0],
];

/** BT.601 chroma of a 0..1 gamma-encoded rgb (color-layout §3.7). */
function bt601UV(r: number, g: number, b: number): [number, number] {
  const y = luma601(r, g, b);
  return [0.492 * (b - y), 0.877 * (r - y)];
}

/**
 * The six graticule targets — computed from the 100%-saturation primaries
 * through the BT.601 U/V math (angles land at 103.5°/60.7°/−12.9°/−76.5°/
 * −119.3°/167.1°, matching spec 08 §11.3's 103/61/−13/−77/−119/167), then
 * normalized onto the 75% ring.
 */
export const VECTORSCOPE_TARGETS: readonly VectorscopeTarget[] = PRIMARIES_100.map(([label, r, g, b]) => {
  const [u, v] = bt601UV(r, g, b);
  const len = Math.hypot(u, v);
  const angleDeg = (Math.atan2(v, u) * 180) / Math.PI;
  return { label, angleDeg, u: (u / len) * 0.75, v: (v / len) * 0.75, radius: 0.75 };
});

/** Skin-tone line (123°, spec 08 §11.3): unit direction from the origin. */
export const SKIN_TONE_LINE: { angleDeg: number; u: number; v: number } = {
  angleDeg: SKIN_TONE_LINE_ANGLE_DEG,
  u: Math.cos((SKIN_TONE_LINE_ANGLE_DEG * Math.PI) / 180),
  v: Math.sin((SKIN_TONE_LINE_ANGLE_DEG * Math.PI) / 180),
};

/** Vectorscope point cloud + density grid for alpha-blended drawing. */
export interface VectorPointData {
  /** `(u, v)` pairs pre-multiplied by VECTORSCOPE_GAIN, row-major. */
  points: Float32Array;
  count: number;
  /** 64×64 density grid over [−1, 1]² (row 0 = +V/top); alpha via densityAlpha. */
  density: { size: number; counts: Uint32Array; max: number };
}

const DENSITY_SIZE = 64;

/**
 * `vectorscopePoints(imgData)` — stride-sampled (≤ `maxPoints`, default
 * 10_000) BT.601 chroma points from the display buffer: per pixel,
 * `Y = 0.299R + 0.587G + 0.114B`, `U = 0.492·(B−Y)`, `V = 0.877·(R−Y)`
 * (0..1 units), reported as `(U·G, V·G)`. Also accumulates a 64×64 density
 * grid for alpha-blended drawing ('lighter' composite in W4c).
 */
export function vectorscopePoints(img: ImageData, maxPoints = 10000): VectorPointData {
  const { data, width, height } = img;
  const total = width * height;
  const stride = Math.max(1, Math.ceil(total / Math.max(1, maxPoints)));
  const count = Math.ceil(total / stride);
  const points = new Float32Array(count * 2);
  const counts = new Uint32Array(DENSITY_SIZE * DENSITY_SIZE);
  let maxCell = 0;
  let n = 0;
  for (let p = 0; p < total; p += stride) {
    const i = p * 4;
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const [u, v] = bt601UV(r, g, b);
    const x = u * VECTORSCOPE_GAIN;
    const y = v * VECTORSCOPE_GAIN;
    points[n * 2] = x;
    points[n * 2 + 1] = y;
    n += 1;
    const gx = Math.min(Math.max(Math.floor((x + 1) * 0.5 * DENSITY_SIZE), 0), DENSITY_SIZE - 1);
    const gy = Math.min(Math.max(Math.floor((1 - (y + 1) * 0.5) * DENSITY_SIZE), 0), DENSITY_SIZE - 1);
    const c = ++counts[gy * DENSITY_SIZE + gx];
    if (c > maxCell) maxCell = c;
  }
  return { points, count: n, density: { size: DENSITY_SIZE, counts, max: maxCell } };
}

/**
 * Density → alpha for alpha-blended scope drawing (color-layout §3.7):
 * `clamp(log2(1+n) / log2(1+max), 0.06, 1)` — the floor keeps faint traces
 * visible; n = max reads as fully opaque. Degenerate max ≤ 0 → the floor.
 */
export function densityAlpha(n: number, max: number): number {
  if (max <= 0) return 0.06;
  const a = Math.log2(1 + n) / Math.log2(1 + max);
  return a < 0.06 ? 0.06 : a > 1 ? 1 : a;
}
