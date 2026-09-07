/* gradedFrame.test.ts — R20-W4c (C52/C54 + the timeline-grade law). The
   pure stack pipeline: working-res clamp, curve-LUT composition, sequential
   [clip → timeline] law, equivalence with W4a's single-pass pipeline, the
   eyedropper seed math, the stack cache hash. DOM-free (structural
   ImageData, W4a's jsdom law). */

import { describe, expect, it } from 'vitest';
import {
  workingResolution,
  bakeLinearCurveLut,
  buildGradeStack,
  gradeLinearFrame,
  gradeImageDataStack,
  hashGradeStack,
  sampleAverage3x3,
  qualifierSeedFromSample,
} from './gradedFrame';
import { DEFAULT_GRADE, DEFAULT_QUALIFIER, decodeToLinear, gradeLinearImage, applyGrade, srgbEncodeLut, SRGB_DECODE_LUT } from '../../../lib/color';
import { DEFAULT_CURVE } from './curveMath';
import { makeTestImageData } from '../../../test/canvas2d';

const ramp = (w = 8, h = 4): ImageData =>
  makeTestImageData(w, h, (x, y) => [
    Math.round((x / Math.max(1, w - 1)) * 255),
    Math.round((y / Math.max(1, h - 1)) * 255),
    Math.round(((x + y) / (w + h)) * 255),
  ]);

const grade = (patch: Record<string, number>) => ({ ...DEFAULT_GRADE, ...patch }) as typeof DEFAULT_GRADE;

describe('workingResolution (color-layout §3.6 ≤960×540)', () => {
  it('clamps the mock stills 1344×768 → 945×540 (aspect-preserving, height-bound)', () => {
    expect(workingResolution(1344, 768)).toEqual({ width: 945, height: 540 });
  });
  it('1920×1080 → exactly 960×540', () => {
    expect(workingResolution(1920, 1080)).toEqual({ width: 960, height: 540 });
  });
  it('never upsamples and never returns 0 (tiny/odd inputs)', () => {
    expect(workingResolution(640, 360)).toEqual({ width: 640, height: 360 });
    expect(workingResolution(800, 600)).toEqual({ width: 720, height: 540 });
    expect(workingResolution(1, 1)).toEqual({ width: 1, height: 1 });
  });
});

describe('bakeLinearCurveLut (spec 08 §5.2 — the W4c compose seam)', () => {
  it('identity/absent curves bake to null (no LUT hop, byte-identical to W4a)', () => {
    expect(bakeLinearCurveLut(undefined)).toBeNull();
    expect(bakeLinearCurveLut(DEFAULT_CURVE)).toBeNull();
  });
  it('lut[i] = srgbDecode(spline(i/255)) — a mid point 0.5→0.25 lands code 128 near 64', () => {
    const lut = bakeLinearCurveLut({ master: [{ x: 0, y: 0 }, { x: 0.5, y: 0.25 }, { x: 1, y: 1 }] });
    expect(lut).not.toBeNull();
    // input code 128 (display 0.502) → spline ≈ 0.251 → code 64 → linear decode
    const out = lut![128];
    expect(out).toBeGreaterThan(SRGB_DECODE_LUT[60]);
    expect(out).toBeLessThan(SRGB_DECODE_LUT[69]);
  });
});

describe('buildGradeStack — the timeline-grade composition law (color-layout §3.6)', () => {
  it('identity records (no curve) are skipped — the untouched timeline costs nothing', () => {
    expect(buildGradeStack(null, null)).toHaveLength(0);
    expect(buildGradeStack(grade({}), grade({}))).toHaveLength(0);
  });
  it('sequential: [clip → timeline] — both records become FULL passes in order', () => {
    const clip = grade({ lift: 0.05 });
    const timeline = grade({ gain: 2 });
    const passes = buildGradeStack(clip, timeline);
    expect(passes).toHaveLength(2);
    expect(passes[0].params.lift).toBeCloseTo(0.05);
    expect(passes[1].params.gain).toBeCloseTo(2);
  });
  it('an element WITHOUT its own record gets the timeline pass alone (post-clip for all)', () => {
    const passes = buildGradeStack(grade({}), grade({ exposure: 1 }));
    expect(passes).toHaveLength(1);
    expect(passes[0].params.exposure).toBeCloseTo(1);
  });
  it('an identity grade WITH a qualifier is still a real pass (§8 secondary node)', () => {
    const passes = buildGradeStack({ ...grade({}), qualifier: { ...DEFAULT_QUALIFIER, hueCenter: 20 } }, null);
    expect(passes).toHaveLength(1);
  });
});

describe('gradeLinearFrame — the stack pixel loop', () => {
  it('single pass is BYTE-IDENTICAL to W4a gradeLinearImage (no seam drift)', () => {
    const img = ramp(16, 8);
    const params = grade({ exposure: 0.5, lift: 0.05, saturation: 20, shHue: 210, shAmount: 0.2 });
    const a = gradeLinearImage(decodeToLinear(img), params);
    const b = gradeLinearFrame(decodeToLinear(img), buildGradeStack(params, null));
    expect(b.width).toBe(a.width);
    expect(b.height).toBe(a.height);
    expect([...b.data]).toEqual([...a.data]);
  });

  it('single pass with a QUALIFIER is byte-identical too (§17.E-port semantics preserved)', () => {
    const img = makeTestImageData(8, 8, (x) => [x * 30, 255 - x * 30, 90]);
    const params = { ...grade({}), qualifier: { ...DEFAULT_QUALIFIER, hueCenter: 120, hueWidth: 60, showMask: false, exposure: -0.5 } };
    const a = gradeLinearImage(decodeToLinear(img), params);
    const b = gradeLinearFrame(decodeToLinear(img), buildGradeStack(params, null));
    expect([...b.data]).toEqual([...a.data]);
  });

  it('THE LAW: [clip → timeline] applies each pass in sequence — out = timeline(clip(px))', () => {
    const img = ramp(12, 6);
    const clip = grade({ lift: 0.05 });
    const timeline = grade({ gain: 2 });
    const out = gradeImageDataStack(img, buildGradeStack(clip, timeline));
    const linear = decodeToLinear(img);
    const n = img.width * img.height;
    for (let i = 0; i < n; i++) {
      const px: [number, number, number] = [linear.data[i * 4], linear.data[i * 4 + 1], linear.data[i * 4 + 2]];
      const expected = applyGrade(applyGrade(px, clip), timeline);
      expect(out.data[i * 4]).toBe(srgbEncodeLut(expected[0]));
      expect(out.data[i * 4 + 1]).toBe(srgbEncodeLut(expected[1]));
      expect(out.data[i * 4 + 2]).toBe(srgbEncodeLut(expected[2]));
    }
  });

  it('NOT a merge: clip gain 2 + timeline lift 0.05 ≠ one merged record (order matters)', () => {
    const img = makeTestImageData(4, 4, () => [200, 128, 64]);
    // sequential: (c·2) + 0.05 ; merged: (c + 0.05)·2 = 2c + 0.1
    const sequential = gradeImageDataStack(img, buildGradeStack(grade({ gain: 2 }), grade({ lift: 0.05 })));
    const merged = gradeImageDataStack(img, buildGradeStack(grade({ gain: 2, lift: 0.05 }), null));
    expect([...sequential.data]).not.toEqual([...merged.data]);
    // and the sequential value is exactly timeline(clip(px))
    const linear = decodeToLinear(img);
    const c0 = linear.data[0];
    expect(sequential.data[0]).toBe(srgbEncodeLut(c0 * 2 + 0.05));
  });

  it('curves compose right after the §4.2 pass: identity grade + mid-darkening curve', () => {
    const img = makeTestImageData(4, 2, () => [128, 128, 128]);
    const out = gradeImageDataStack(img, buildGradeStack({ ...grade({}), curves: { master: [{ x: 0, y: 0 }, { x: 0.5, y: 0.25 }, { x: 1, y: 1 }] } }, null));
    // code 128 → display 0.502 → spline ≈ 0.251 → re-encoded near code 64
    expect(out.data[0]).toBeGreaterThan(60);
    expect(out.data[0]).toBeLessThan(69);
  });

  it('empty stack = decode→encode passthrough (source preview: the raw poster)', () => {
    const img = ramp(8, 4);
    const out = gradeImageDataStack(img, []);
    // sRGB round-trip ≤ 1 LSB (W4a's LUT contract) — never a big change
    expect(Math.abs(out.data[0] - img.data[0])).toBeLessThanOrEqual(1);
    expect(Math.abs(out.data[4 * 7] - img.data[4 * 7])).toBeLessThanOrEqual(1);
  });
});

describe('hashGradeStack (the frame-cache key half)', () => {
  it('same stack → same hash; a curve-point move changes it (curves are not GradeParams fields)', () => {
    const mk = (y: number) => buildGradeStack({ ...grade({}), curves: { master: [{ x: 0, y: 0 }, { x: 0.5, y }, { x: 1, y: 1 }] } }, null);
    const a = hashGradeStack(mk(0.25));
    expect(hashGradeStack(mk(0.25))).toBe(a);
    expect(hashGradeStack(mk(0.3))).not.toBe(a);
  });
  it('param changes and pass-count changes change the hash', () => {
    const s1 = hashGradeStack(buildGradeStack(grade({ exposure: 1 }), null));
    expect(hashGradeStack(buildGradeStack(grade({ exposure: 1 }), null))).toBe(s1);
    expect(hashGradeStack(buildGradeStack(grade({ exposure: 2 }), null))).not.toBe(s1);
    expect(hashGradeStack(buildGradeStack(grade({ exposure: 1 }), grade({ gain: 2 })))).not.toBe(s1);
  });
});

describe('the eyedropper seed math (C54, color-layout §3.4)', () => {
  it('sampleAverage3x3 returns the pixel on a uniform image and edge-clamps at (0,0)', () => {
    const img = makeTestImageData(6, 6, () => [10, 20, 30]);
    const [r, g, b] = sampleAverage3x3(img.data, 6, 6, 3, 3);
    expect(r).toBeCloseTo(10);
    expect(g).toBeCloseTo(20);
    expect(b).toBeCloseTo(30);
    const [er, eg, eb] = sampleAverage3x3(img.data, 6, 6, 0, 0);
    expect(er).toBeCloseTo(10);
    expect(eg).toBeCloseTo(20);
    expect(eb).toBeCloseTo(30);
  });

  it('a red sample seeds hueCenter 0 / sat ±0.08 / luma709 ±0.06', () => {
    const seed = qualifierSeedFromSample(255, 0, 0);
    expect(seed.hueCenter).toBeCloseTo(0);
    expect(seed.satLow).toBeCloseTo(0.92);
    expect(seed.satHigh).toBeCloseTo(1);
    expect(seed.lumaLow).toBeCloseTo(0.2126 - 0.06, 3);
    expect(seed.lumaHigh).toBeCloseTo(0.2126 + 0.06, 3);
  });

  it('a green sample seeds hueCenter 120; a white sample seeds sat 0 with the +0.08 window', () => {
    const green = qualifierSeedFromSample(0, 255, 0);
    expect(green.hueCenter).toBeCloseTo(120, 0);
    const white = qualifierSeedFromSample(255, 255, 255);
    expect(white.satLow).toBeCloseTo(0);
    expect(white.satHigh).toBeCloseTo(0.08);
    expect(white.lumaLow).toBeCloseTo(1 - 0.06, 3);
    expect(white.lumaHigh).toBeCloseTo(1);
  });
});
