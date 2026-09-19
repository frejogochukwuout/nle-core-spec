/* gradedImage.test.ts — R20-W4a. Pins the canvas-agnostic pixel pipeline
   (decode LUT → linear → gradeMath → encode LUT, color-layout §3.6), the
   spec-08 §12 cache-key/coalescer strategy, and the qualifier composition.
   ImageData is stubbed structurally (jsdom has no ImageData constructor). */

import { describe, expect, it } from 'vitest';
import type { GradeParams } from './gradeMath';
import { DEFAULT_GRADE } from './gradeMath';
import type { QualifierParams } from './qualifierMath';
import { DEFAULT_QUALIFIER } from './qualifierMath';
import {
  GradedImageCache,
  cancelCoalesced,
  decodeToLinear,
  gradeCacheKey,
  gradeImageData,
  gradeLinearImage,
  hashGradeParams,
  hashImageData,
  scheduleCoalesced,
} from './gradedImage';
import { SRGB_DECODE_LUT, srgbEncode8 } from './colorSpace';

/* Structural ImageData stub — the pipeline only touches {data,width,height}
 * (the lib falls back to the same shape when the constructor is missing). */
const makeImageData = (w: number, h: number, fill: (i: number) => [number, number, number, number]): ImageData => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const [r, g, b, a] = fill(i);
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  }
  return { data, width: w, height: h, colorSpace: 'srgb' } as unknown as ImageData;
};

const grade = (over: Partial<GradeParams>): GradeParams => ({ ...DEFAULT_GRADE, ...over });
const qual = (over: Partial<QualifierParams>): QualifierParams => ({ ...DEFAULT_QUALIFIER, ...over });

describe('gradeImageData — the one-shot pipeline', () => {
  it('identity grade round-trips every 8-bit code within 1 LSB', () => {
    // 16×16 image whose R channel carries every code value 0..255 once
    const img = makeImageData(16, 16, (i) => [i, (i * 7) % 256, (i * 13) % 256, 255]);
    const out = gradeImageData(img, DEFAULT_GRADE);
    for (let i = 0; i < 256; i++) {
      expect(Math.abs(out.data[i * 4] - i)).toBeLessThanOrEqual(1);
      expect(Math.abs(out.data[i * 4 + 1] - ((i * 7) % 256))).toBeLessThanOrEqual(1);
      expect(Math.abs(out.data[i * 4 + 2] - ((i * 13) % 256))).toBeLessThanOrEqual(1);
    }
  });

  it('alpha passes through untouched', () => {
    const img = makeImageData(4, 1, (i) => [10 * i, 20 * i, 30 * i, 128]);
    const out = gradeImageData(img, DEFAULT_GRADE);
    for (let i = 0; i < 4; i++) expect(out.data[i * 4 + 3]).toBe(128);
  });

  it('is pure — the input ImageData is never mutated', () => {
    const img = makeImageData(2, 2, (i) => [i * 40, 255 - i * 40, 77, 255]);
    const before = Uint8ClampedArray.from(img.data);
    gradeImageData(img, grade({ lift: 0.3, saturation: -100 }));
    expect(Array.from(img.data)).toEqual(Array.from(before));
  });

  it('CDL spot: lift 0.1 on black → the sRGB code of linear 0.1 (89)', () => {
    const img = makeImageData(2, 2, () => [0, 0, 0, 255]);
    const out = gradeImageData(img, grade({ lift: 0.1 }));
    const expected = Math.round(255 * (1.055 * Math.pow(0.1, 1 / 2.4) - 0.055));
    for (let i = 0; i < 4; i++) {
      expect(Math.abs(out.data[i * 4] - expected)).toBeLessThanOrEqual(1); // 89 ± quantization
      expect(Math.abs(out.data[i * 4 + 1] - expected)).toBeLessThanOrEqual(1);
      expect(Math.abs(out.data[i * 4 + 2] - expected)).toBeLessThanOrEqual(1);
    }
  });

  it('HDR clamps only at the display encode (white +1 stop → 255)', () => {
    const img = makeImageData(1, 1, () => [255, 255, 255, 255]);
    const out = gradeImageData(img, grade({ exposure: 1 })); // linear 2.0 → encode clamp
    expect(out.data[0]).toBe(255);
  });
});

describe('decodeToLinear + gradeLinearImage (spec 08 §12.1 split)', () => {
  it('decode matches the 256-entry LUT exactly (decode cache contract)', () => {
    const img = makeImageData(16, 1, (i) => [i * 16, 255 - i * 16, i * 5, 255]);
    const lin = decodeToLinear(img);
    expect(lin.width).toBe(16);
    expect(lin.height).toBe(1);
    for (let i = 0; i < 16; i++) {
      expect(lin.data[i * 4]).toBe(SRGB_DECODE_LUT[(i * 16) % 256]);
      expect(lin.data[i * 4 + 1]).toBe(SRGB_DECODE_LUT[(255 - i * 16) % 256]);
    }
  });

  it('gradeLinearImage(decodeToLinear(x)) === gradeImageData(x) byte-for-byte', () => {
    const img = makeImageData(6, 3, (i) => [(i * 31) % 256, (i * 57) % 256, (i * 11) % 256, 255]);
    const p = grade({ lift: 0.05, gain: 1.2, saturation: -40, exposure: 0.5 });
    const direct = gradeImageData(img, p);
    const split = gradeLinearImage(decodeToLinear(img), p);
    expect(Array.from(split.data)).toEqual(Array.from(direct.data));
    expect(split.width).toBe(direct.width);
    expect(split.height).toBe(direct.height);
  });

  it('returns a fresh output every call (no shared buffers)', () => {
    const img = makeImageData(2, 1, () => [128, 64, 32, 255]);
    const a = gradeImageData(img, DEFAULT_GRADE);
    const b = gradeImageData(img, DEFAULT_GRADE);
    expect(a).not.toBe(b);
    expect(a.data).not.toBe(b.data);
  });
});

describe('qualifier composition inside the pipeline (spec 08 §17.E-port)', () => {
  // 4×1: red | blue split
  const img = makeImageData(4, 1, (i) => (i < 2 ? [255, 0, 0, 255] : [0, 0, 255, 255]));

  it('mask=1 pixels take the secondary correction; mask=0 pixels are untouched', () => {
    const out = gradeImageData(img, grade({ qualifier: qual({ hueCenter: 0, exposure: -1 }) }));
    // red: linear 1 → ×0.5 → encode ≈ 188 (computed from the transfer formula)
    const expectedRed = srgbEncode8(0.5);
    expect(Math.abs(out.data[0] - expectedRed)).toBeLessThanOrEqual(1);
    expect(out.data[1]).toBe(0); // g/b linear 0 stays 0
    // blue pixel fully outside the red key → unchanged
    expect(out.data[8]).toBe(0);
    expect(out.data[10]).toBe(255);
  });

  it('showMask renders the matte as sRGB-encoded grayscale (white vs black)', () => {
    const out = gradeImageData(img, grade({ qualifier: qual({ hueCenter: 0, showMask: true }) }));
    expect(out.data[0]).toBe(255); // mask 1 → gray 255
    expect(out.data[1]).toBe(255);
    expect(out.data[8]).toBe(0); // mask 0 → gray 0
    expect(out.data[10]).toBe(0);
  });

  it('invert flips which half is graded', () => {
    const out = gradeImageData(img, grade({ qualifier: qual({ hueCenter: 0, invert: true, exposure: -1 }) }));
    expect(out.data[0]).toBe(255); // red now untouched (mask 0)
    expect(Math.abs(out.data[10] - srgbEncode8(0.5))).toBeLessThanOrEqual(1); // blue corrected
  });
});

describe('hashGradeParams — stable params-hash (cache key component)', () => {
  it('same values → same hash, independent of object key order', () => {
    const a = grade({ lift: 0.2, hue: 70 });
    const b = Object.fromEntries(Object.entries(a).reverse()) as unknown as GradeParams;
    expect(hashGradeParams(a)).toBe(hashGradeParams(b));
  });

  it('any changed field changes the hash', () => {
    const base = grade({ lift: 0.2 });
    expect(hashGradeParams(grade({ lift: 0.21 }))).not.toBe(hashGradeParams(base));
    expect(hashGradeParams(grade({ hue: 51 }))).not.toBe(hashGradeParams(base));
    expect(hashGradeParams(grade({ shAmount: 0.01 }))).not.toBe(hashGradeParams(base));
  });

  it('qualifier presence and fields are part of the hash', () => {
    const noQual = grade({});
    const withQual = grade({ qualifier: qual({}) });
    expect(hashGradeParams(withQual)).not.toBe(hashGradeParams(noQual));
    expect(hashGradeParams(grade({ qualifier: qual({ hueCenter: 90 }) }))).not.toBe(hashGradeParams(withQual));
    // null vs undefined qualifier hash identically (both "no qualifier")
    expect(hashGradeParams(grade({ qualifier: null }))).toBe(hashGradeParams(noQual));
  });
});

describe('hashImageData — stable src-hash (cache key component)', () => {
  it('same pixels → same hash; any byte change → different', () => {
    const img = makeImageData(4, 2, (i) => [i * 3, i * 5, i * 7, 255]);
    expect(hashImageData(img)).toBe(hashImageData(img));
    const mutated = makeImageData(4, 2, (i) => [i * 3, i * 5, i * 7, 255]);
    mutated.data[3 * 4] = 42;
    expect(hashImageData(mutated)).not.toBe(hashImageData(img));
  });

  it('dimensions are part of the hash (same bytes, different size → different)', () => {
    const a = makeImageData(2, 2, (i) => [i, i, i, 255]);
    const b = makeImageData(1, 4, (i) => [i, i, i, 255]);
    expect(hashImageData(a)).not.toBe(hashImageData(b));
  });
});

describe('gradeCacheKey — elementId|params-hash|src-hash', () => {
  it('format and stability', () => {
    const img = makeImageData(2, 2, (i) => [i, i, i, 255]);
    const p = grade({ lift: 0.1 });
    const k1 = gradeCacheKey('el-7', hashImageData(img), p);
    const k2 = gradeCacheKey('el-7', hashImageData(img), p);
    expect(k1).toBe(k2);
    const parts = k1.split('|');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('el-7');
    expect(parts[1]).toBe(hashGradeParams(p));
    expect(parts[2]).toBe(hashImageData(img));
  });

  it('each component invalidates the key', () => {
    const img = makeImageData(2, 2, (i) => [i, i, i, 255]);
    const p = grade({ lift: 0.1 });
    const base = gradeCacheKey('el-7', hashImageData(img), p);
    expect(gradeCacheKey('el-8', hashImageData(img), p)).not.toBe(base);
    expect(gradeCacheKey('el-7', hashImageData(img), grade({ lift: 0.11 }))).not.toBe(base);
    const img2 = makeImageData(2, 2, (i) => [i + 1, i, i, 255]);
    expect(gradeCacheKey('el-7', hashImageData(img2), p)).not.toBe(base);
  });
});

describe('GradedImageCache — bounded FIFO (spec 08 §12 pattern)', () => {
  const img = (): ImageData => makeImageData(1, 1, () => [1, 2, 3, 255]);

  it('stores and retrieves by key', () => {
    const cache = new GradedImageCache(4);
    const a = img();
    cache.put('k', a);
    expect(cache.has('k')).toBe(true);
    expect(cache.get('k')).toBe(a);
    expect(cache.size).toBe(1);
  });

  it('evicts the oldest entry past the cap (FIFO)', () => {
    const cache = new GradedImageCache(2);
    cache.put('a', img());
    cache.put('b', img());
    cache.put('c', img());
    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(true);
    expect(cache.has('c')).toBe(true);
    expect(cache.size).toBe(2);
  });

  it('re-putting an existing key does not evict or duplicate', () => {
    const cache = new GradedImageCache(2);
    cache.put('a', img());
    cache.put('b', img());
    const same = cache.get('a')!;
    cache.put('a', same);
    expect(cache.size).toBe(2);
    expect(cache.get('a')).toBe(same);
  });

  it('delete/clear', () => {
    const cache = new GradedImageCache(4);
    cache.put('a', img());
    cache.delete('a');
    expect(cache.has('a')).toBe(false);
    cache.put('b', img());
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

describe('scheduleCoalesced — one grade update per frame (spec 08 §12.1 #3)', () => {
  const deferredScheduler = () => {
    const cbs: Array<() => void> = [];
    const schedule = (cb: () => void) => {
      cbs.push(cb);
      return cbs.length;
    };
    // run only the callbacks present at call time — re-entrant schedules stay pending
    const flush = () => {
      const batch = cbs.splice(0, cbs.length);
      for (const cb of batch) cb();
    };
    return { schedule, flush, pending: () => cbs.length };
  };

  it('coalesces rapid same-key requests into a single fire (latest wins)', () => {
    const { schedule, flush, pending } = deferredScheduler();
    let calls = 0;
    let tag = '';
    for (const t of ['a', 'b', 'c', 'd', 'e']) {
      scheduleCoalesced('coalesce-key', () => {
        calls += 1;
        tag = t;
      }, schedule);
    }
    expect(pending()).toBe(1); // one frame request for five rapid events
    flush();
    expect(calls).toBe(1);
    expect(tag).toBe('e'); // the latest callback replaced the earlier ones
  });

  it('a re-entrant schedule after the frame fires starts a NEW frame', () => {
    const { schedule, flush, pending } = deferredScheduler();
    let calls = 0;
    scheduleCoalesced('reentrant', () => {
      calls += 1;
      scheduleCoalesced('reentrant', () => {
        calls += 1;
      }, schedule);
    }, schedule);
    expect(pending()).toBe(1);
    flush();
    expect(calls).toBe(1);
    expect(pending()).toBe(1); // the inner schedule queued a new frame
    flush();
    expect(calls).toBe(2);
  });

  it('different keys schedule independently', () => {
    const { schedule, flush, pending } = deferredScheduler();
    let a = 0;
    let b = 0;
    scheduleCoalesced('key-a', () => { a += 1; }, schedule);
    scheduleCoalesced('key-b', () => { b += 1; }, schedule);
    expect(pending()).toBe(2);
    flush();
    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  it('cancelCoalesced drops a pending callback without firing it', () => {
    const { schedule, flush } = deferredScheduler();
    let calls = 0;
    scheduleCoalesced('cancel-key', () => { calls += 1; }, schedule);
    cancelCoalesced('cancel-key');
    flush();
    expect(calls).toBe(0);
  });
});
