/* gradedImage.ts — the canvas-agnostic CPU grade pipeline + the spec-08 §12
   real-time strategy helpers (per-image cache key, rAF coalescing).

   Pipeline (color-layout §3.6, gap C52):
     sRGB decode LUT → scene-linear → gradeMath.applyGrade (spec 08 §4.2
     14-step order) → optional qualifier node (spec 08 §17.E-port: mask on the
     sRGB-ENCODED graded value, correction + mix in LINEAR) → sRGB encode LUT.
   The ONLY clamp is at the encode step (display transfer boundary).

   DOM contract: `ImageData` is the sole DOM type used (structural —
   {data,width,height}); everything works under a stubbed ImageData in jsdom.
   The decode/grade split mirrors spec 08 §12.1: cache the decoded linear
   buffer per source (`decodeToLinear`), re-run only the grade pass
   (`gradeLinearImage`) on param changes, coalesced per frame.

   Pure, worker-ready by design. R20-W4a; consumed by W4b/W4c. */

import { SRGB_DECODE_LUT, srgbEncodeLut, srgbEncodeUnit } from './colorSpace';
import type { RGB } from './colorSpace';
import { gradeInto, isIdentityGrade } from './gradeMath';
import type { GradeParams } from './gradeMath';
import { applyQualifierCorrection, computeQualifierMask } from './qualifierMath';
import type { QualifierParams } from './qualifierMath';

/* ------------------------------------------------------------------ *
 * Linear working image (spec 08 §12.1: "Cache the linear-light         *
 * working texture" — the CPU analogue)                               *
 * ------------------------------------------------------------------ */

/** Scene-linear working buffer: rgba floats (alpha passed through 0..1). */
export interface LinearImage {
  width: number;
  height: number;
  data: Float32Array;
}

/** Decode an 8-bit sRGB ImageData into a scene-linear working image. */
export function decodeToLinear(img: ImageData): LinearImage {
  const n = img.width * img.height;
  const out = new Float32Array(n * 4);
  const src = img.data;
  for (let i = 0; i < n; i++) {
    const s = i * 4;
    out[s] = SRGB_DECODE_LUT[src[s]]; // exact per code value (LUT contract)
    out[s + 1] = SRGB_DECODE_LUT[src[s + 1]];
    out[s + 2] = SRGB_DECODE_LUT[src[s + 2]];
    out[s + 3] = src[s + 3] / 255; // alpha passthrough
  }
  return { width: img.width, height: img.height, data: out };
}

/* ------------------------------------------------------------------ *
 * The grade pass                                                      *
 * ------------------------------------------------------------------ */

function makeImageData(data: Uint8ClampedArray<ArrayBuffer>, width: number, height: number): ImageData {
  // Browser (and any canvas-capable runtime) always has the constructor;
  // plain jsdom does not — fall back to a structural ImageData-shaped object
  // (the pipeline only reads/writes {data,width,height}).
  if (typeof ImageData === 'function') return new ImageData(data, width, height);
  return { data, width, height, colorSpace: 'srgb' } as unknown as ImageData;
}

/**
 * Grade pass over a linear working image → new 8-bit sRGB ImageData
 * (spec 08 §12.2: re-run ONLY this on param changes; the decode is cached
 * upstream). Qualifier composition (spec 08 §17.E-port):
 *   mask   = computeQualifierMask(srgbEncodeUnit(graded))   [display values]
 *   out    = showMask ? mask-grayscale : mix(graded, corrected, mask)
 * with the mix in LINEAR and the grayscale matte flowing through the normal
 * sRGB encode (the E-port returns `vec3f(mask)` and the display transfer
 * encodes it).
 */
export function gradeLinearImage(linear: LinearImage, params: GradeParams): ImageData {
  const { width, height, data } = linear;
  const n = width * height;
  const out = new Uint8ClampedArray(new ArrayBuffer(n * 4));
  const qual: QualifierParams | null = params.qualifier ?? null;
  const skipPrimary = isIdentityGrade(params) && !qual;
  const px: RGB = [0, 0, 0];
  const graded: RGB = [0, 0, 0];
  const corr: RGB = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const l = i * 4;
    let r: number;
    let g: number;
    let b: number;
    if (skipPrimary) {
      r = data[l];
      g = data[l + 1];
      b = data[l + 2];
    } else {
      px[0] = data[l];
      px[1] = data[l + 1];
      px[2] = data[l + 2];
      gradeInto(px, params, graded); // the 14-step order (spec 08 §4.2)
      r = graded[0];
      g = graded[1];
      b = graded[2];
    }
    if (qual) {
      // Mask on the sRGB-encoded graded pixel — HSV is display-space
      // (spec 08 §8.2/§17.E-port: linear → sRGB before HSV/luma).
      const enc: RGB = [srgbEncodeUnit(r), srgbEncodeUnit(g), srgbEncodeUnit(b)];
      const mask = computeQualifierMask(enc, qual);
      if (qual.showMask) {
        r = mask; // grayscale matte (encoded below like any linear value)
        g = mask;
        b = mask;
      } else {
        corr[0] = r;
        corr[1] = g;
        corr[2] = b;
        const corrected = applyQualifierCorrection(corr, qual);
        r = r + (corrected[0] - r) * mask; // mix in LINEAR (§17.E-port L1642)
        g = g + (corrected[1] - g) * mask;
        b = b + (corrected[2] - b) * mask;
      }
    }
    // Display clamp happens ONLY here, at the encode (color-layout §3.1).
    out[l] = srgbEncodeLut(r);
    out[l + 1] = srgbEncodeLut(g);
    out[l + 2] = srgbEncodeLut(b);
    out[l + 3] = Math.round(data[l + 3] * 255);
  }
  return makeImageData(out, width, height);
}

/**
 * `gradeImageData(imgData, params)` — the one-shot pixel pipeline (decode
 * LUT → linear loop → gradeMath → encode LUT). Pure: the input ImageData is
 * never mutated; a NEW ImageData is returned. Equivalent to
 * `gradeLinearImage(decodeToLinear(img), params)`.
 */
export function gradeImageData(img: ImageData, params: GradeParams): ImageData {
  return gradeLinearImage(decodeToLinear(img), params);
}

/* ------------------------------------------------------------------ *
 * Per-image cache key: elementId | params-hash | src-hash            *
 * (spec 08 §12.1/§12.2 cache strategy, the mock's CPU version)       *
 * ------------------------------------------------------------------ */

/** FNV-1a 32-bit over a string → 8 hex chars (deterministic, allocation-light). */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

/** Canonical field order — the hash is independent of object key order. */
const GRADE_HASH_KEYS = [
  'shHue', 'shAmount', 'midHue', 'midAmount', 'hlHue', 'hlAmount', 'offHue', 'offAmount',
  'temperature', 'tint', 'saturation', 'exposure', 'contrast', 'pivot',
  'lift', 'gamma', 'gain', 'offset', 'blackPoint', 'whitePoint',
  'midDetail', 'colorBoost', 'shadows', 'highlights', 'hue', 'lumMix',
] as const;

const QUALIFIER_HASH_KEYS = [
  'hueCenter', 'hueWidth', 'hueSoftness', 'satLow', 'satHigh', 'satSoftness',
  'lumaLow', 'lumaHigh', 'lumaSoftness', 'invert', 'showMask', 'strength',
  'exposure', 'saturation', 'temperature', 'tint',
] as const;

/**
 * Stable hash of a GradeParams (canonical field order → same values always
 * hash equal, regardless of how the object literal was written; any changed
 * value changes the hash).
 */
export function hashGradeParams(params: GradeParams): string {
  let s = '';
  for (const k of GRADE_HASH_KEYS) s += `${k}=${params[k]};`;
  const q = params.qualifier;
  if (q) {
    for (const k of QUALIFIER_HASH_KEYS) s += `q.${k}=${q[k]};`;
  } else {
    s += 'q=null;';
  }
  return fnv1a(s);
}

/**
 * Stable hash of an ImageData's pixels (dimensions + strided byte samples) —
 * the "src-hash" of the cache key: same image → same hash, any pixel change
 * (within the sampled stride) or size change → different hash.
 */
export function hashImageData(img: ImageData): string {
  const d = img.data;
  const stride = Math.max(4, Math.floor(d.length / 2048) & ~3); // RGBA-aligned
  let s = `${img.width}x${img.height}`;
  for (let i = 0; i < d.length; i += stride) s += `,${d[i]}`;
  return fnv1a(s);
}

/**
 * The per-image grade cache key: `elementId|params-hash|src-hash`
 * (DESIGN-R20 D3 / color-layout §3.6). Grade lookups by element id; the
 * params-hash invalidates on grade edits; the src-hash invalidates when the
 * underlying image changes.
 */
export function gradeCacheKey(elementId: string, srcHash: string, params: GradeParams): string {
  return `${elementId}|${hashGradeParams(params)}|${srcHash}`;
}

/** Bounded FIFO cache of graded ImageData outputs (spec 08 §12 pattern). */
export class GradedImageCache {
  private readonly entries = new Map<string, ImageData>();
  constructor(private readonly maxEntries = 8) {}

  get(key: string): ImageData | undefined {
    return this.entries.get(key);
  }
  has(key: string): boolean {
    return this.entries.has(key);
  }
  put(key: string, img: ImageData): void {
    if (this.entries.has(key)) return;
    while (this.entries.size >= this.maxEntries) {
      // Map preserves insertion order — evict the oldest (FIFO)
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
    this.entries.set(key, img);
  }
  delete(key: string): void {
    this.entries.delete(key);
  }
  clear(): void {
    this.entries.clear();
  }
  get size(): number {
    return this.entries.size;
  }
}

/* ------------------------------------------------------------------ *
 * rAF coalescing (spec 08 §12.1 #3: "Coalesce rapid slider events     *
 * into a single grade update per frame")                              *
 * ------------------------------------------------------------------ */

/** Injected frame scheduler — `(cb) => rafId`. Defaults to rAF, with a
 * 16ms setTimeout fallback for DOM-less runtimes. */
export type RafScheduler = (cb: () => void) => number | void;

const defaultRaf: RafScheduler = (cb) => {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(cb);
  }
  return setTimeout(cb, 16) as unknown as number;
};

interface CoalesceEntry {
  fn: () => void;
}
const pending = new Map<string, CoalesceEntry>();

/**
 * `scheduleCoalesced(key, fn)` — coalesce rapid same-key requests into ONE
 * invocation per frame: while a callback for `key` is already scheduled the
 * stored fn is REPLACED (latest wins) and no second frame is requested. The
 * entry is removed before firing, so a re-entrant schedule from inside fn
 * starts a fresh frame. Different keys schedule independently.
 */
export function scheduleCoalesced(key: string, fn: () => void, schedule: RafScheduler = defaultRaf): void {
  const existing = pending.get(key);
  if (existing) {
    existing.fn = fn; // latest wins — one frame, one call
    return;
  }
  pending.set(key, { fn });
  schedule(() => {
    // look the entry up at FIRE time so cancelCoalesced can still win the race
    const entry = pending.get(key);
    if (!entry) return;
    pending.delete(key);
    entry.fn();
  });
}

/** Drop a pending coalesced callback (fire nothing) — e.g. on unmount. */
export function cancelCoalesced(key: string): void {
  pending.delete(key);
}
