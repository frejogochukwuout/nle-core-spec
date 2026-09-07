/* index.test.ts — R20-W4a. Guards the barrel: the public surface W4b/W4c
   consume must re-export cleanly (no ambiguous star-export names). */

import { describe, expect, it } from 'vitest';
import * as color from './index';

describe('src/lib/color barrel (the W4a public surface)', () => {
  it('exports the colorSpace surface', () => {
    expect(color.SRGB_DECODE_LUT).toHaveLength(256);
    expect(color.SRGB_ENCODE_LUT).toHaveLength(4096);
    expect(typeof color.srgbDecode8).toBe('function');
    expect(typeof color.srgbEncode8).toBe('function');
    expect(typeof color.srgbEncodeLut).toBe('function');
    expect(typeof color.srgbEncodeUnit).toBe('function');
    expect(typeof color.luma709).toBe('function');
    expect(typeof color.luma601).toBe('function');
    expect(typeof color.smoothstep).toBe('function');
    expect(typeof color.rgb2hsv).toBe('function');
    expect(typeof color.hsv2rgb).toBe('function');
    expect(typeof color.zoneMasks).toBe('function');
  });

  it('exports the gradeMath surface', () => {
    expect(color.DEFAULT_GRADE).toBeDefined();
    expect(typeof color.applyGrade).toBe('function');
    expect(typeof color.gradeInto).toBe('function');
    expect(typeof color.wheelTint).toBe('function');
    expect(typeof color.wheelDelta).toBe('function');
    expect(typeof color.yrgbReadout).toBe('function');
    expect(typeof color.packWheelsParams).toBe('function');
    expect(typeof color.isIdentityGrade).toBe('function');
    expect(color.WHEELS_PARAM_SLOTS).toBeDefined();
  });

  it('exports the qualifierMath surface', () => {
    expect(color.DEFAULT_QUALIFIER).toBeDefined();
    expect(typeof color.computeQualifierMask).toBe('function');
    expect(typeof color.applyQualifierCorrection).toBe('function');
    expect(typeof color.circularHueDistance).toBe('function');
    expect(typeof color.centeredRangeMask).toBe('function');
    expect(typeof color.sampleMatte).toBe('function');
  });

  it('exports the gradedImage surface', () => {
    expect(typeof color.decodeToLinear).toBe('function');
    expect(typeof color.gradeLinearImage).toBe('function');
    expect(typeof color.gradeImageData).toBe('function');
    expect(typeof color.hashGradeParams).toBe('function');
    expect(typeof color.hashImageData).toBe('function');
    expect(typeof color.gradeCacheKey).toBe('function');
    expect(typeof color.scheduleCoalesced).toBe('function');
    expect(typeof color.cancelCoalesced).toBe('function');
    expect(typeof color.GradedImageCache).toBe('function');
  });

  it('exports the scopesMath surface', () => {
    expect(typeof color.waveformColumns).toBe('function');
    expect(typeof color.parade).toBe('function');
    expect(typeof color.vectorscopePoints).toBe('function');
    expect(typeof color.histogram).toBe('function');
    expect(typeof color.densityAlpha).toBe('function');
    expect(color.VECTORSCOPE_TARGETS).toHaveLength(6);
    expect(color.VECTORSCOPE_CIRCLES).toEqual([1, 0.75, 0.25]);
    expect(color.SKIN_TONE_LINE_ANGLE_DEG).toBe(123);
  });

  it('the barrel pipeline composes end-to-end (decode → grade → scope)', () => {
    const data = new Uint8ClampedArray(4);
    data[0] = 255; // one pure-red pixel
    const img = { data, width: 1, height: 1, colorSpace: 'srgb' } as unknown as ImageData;
    const graded = color.gradeImageData(img, { ...color.DEFAULT_GRADE, lift: 0.1 });
    expect(graded.width).toBe(1);
    const wf = color.waveformColumns(graded, 'r');
    expect(wf.max).toBe(1);
  });
});
