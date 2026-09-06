/* qualifierMath.test.ts — R20-W4a. Pins the spec-08 §8/§17.E-port qualifier:
   circular hue distance with wraparound (350°→10° = 20°), the soft range
   mask, mask = hue·sat·lum with invert/strength, the linear-space secondary
   correction, and the sampleMatte stride sampler. */

import { describe, expect, it } from 'vitest';
import type { RGB } from './colorSpace';
import { hsv2rgb, luma709 } from './colorSpace';
import {
  DEFAULT_QUALIFIER,
  applyQualifierCorrection,
  centeredRangeMask,
  circularHueDistance,
  computeQualifierMask,
  sampleMatte,
} from './qualifierMath';
import type { QualifierParams } from './qualifierMath';

const q = (over: Partial<QualifierParams>): QualifierParams => ({ ...DEFAULT_QUALIFIER, ...over });

describe('DEFAULT_QUALIFIER (spec 08 §8.1 param defaults)', () => {
  it('pins the spec defaults', () => {
    expect(DEFAULT_QUALIFIER.hueCenter).toBe(0);
    expect(DEFAULT_QUALIFIER.hueWidth).toBe(35);
    expect(DEFAULT_QUALIFIER.hueSoftness).toBe(20);
    expect(DEFAULT_QUALIFIER.satLow).toBe(0);
    expect(DEFAULT_QUALIFIER.satHigh).toBe(1);
    expect(DEFAULT_QUALIFIER.satSoftness).toBeCloseTo(0.1, 12);
    expect(DEFAULT_QUALIFIER.lumaLow).toBe(0);
    expect(DEFAULT_QUALIFIER.lumaHigh).toBe(1);
    expect(DEFAULT_QUALIFIER.lumaSoftness).toBeCloseTo(0.1, 12);
    expect(DEFAULT_QUALIFIER.strength).toBe(1);
    expect(DEFAULT_QUALIFIER.invert).toBe(false);
    expect(DEFAULT_QUALIFIER.showMask).toBe(false);
    expect(DEFAULT_QUALIFIER.exposure).toBe(0);
  });
});

describe('circularHueDistance (spec 08 §17.E L1520-1523 — min(diff, 1−diff))', () => {
  it('wraparound: 350° vs 10° → 20° (the classic keyer case)', () => {
    expect(circularHueDistance(350 / 360, 10 / 360)).toBeCloseTo(20 / 360, 12);
  });

  it('is symmetric', () => {
    expect(circularHueDistance(10 / 360, 350 / 360)).toBeCloseTo(20 / 360, 12);
    expect(circularHueDistance(0.9, 0.1)).toBeCloseTo(circularHueDistance(0.1, 0.9), 12);
  });

  it('halfway around is the max distance 0.5; 90° away reads 0.25', () => {
    expect(circularHueDistance(0, 0.5)).toBeCloseTo(0.5, 12);
    expect(circularHueDistance(0, 0.25)).toBeCloseTo(0.25, 12);
  });

  it('identical hues are distance 0', () => {
    expect(circularHueDistance(0.37, 0.37)).toBe(0);
  });
});

describe('centeredRangeMask (spec 08 §17.E L1525-1532)', () => {
  it('is 1 inside [low, high]', () => {
    expect(centeredRangeMask(0.5, 0.3, 0.7, 0.1)).toBe(1);
    expect(centeredRangeMask(0.3, 0.3, 0.7, 0.1)).toBe(1);
    expect(centeredRangeMask(0.7, 0.3, 0.7, 0.1)).toBe(1);
  });

  it('is 0 beyond ±soft outside the window', () => {
    expect(centeredRangeMask(0.19, 0.3, 0.7, 0.1)).toBe(0);
    expect(centeredRangeMask(0.81, 0.3, 0.7, 0.1)).toBe(0);
  });

  it('ramps with smoothstep at BOTH edges (0.25 in the low ramp → 0.5)', () => {
    expect(centeredRangeMask(0.25, 0.3, 0.7, 0.1)).toBeCloseTo(0.5, 12);
  });

  it('low/high given out of order are swapped into order', () => {
    expect(centeredRangeMask(0.5, 0.7, 0.3, 0.1)).toBe(1);
  });

  it('softness floors at 0.0001 (no divide-by-zero ramp)', () => {
    expect(centeredRangeMask(0.5, 0.3, 0.7, 0)).toBe(1);
    // value at the midpoint of the 0.0001-wide low ramp reads 0.5
    expect(centeredRangeMask(0.29995, 0.3, 0.7, 0)).toBeCloseTo(0.5, 6);
  });
});

describe('computeQualifierMask (spec 08 §17.E-port L1606-1621)', () => {
  it('pure red matches a red key at defaults (hue 0, full sat, luma in range)', () => {
    expect(computeQualifierMask([1, 0, 0], q({ hueCenter: 0 }))).toBeCloseTo(1, 12);
  });

  it('hue 45° off-center sits mid-falloff: hd = 45°, window 35°+20° → 0.5', () => {
    // smoothstep(35°, 55°, 45°) = 0.5 → mask = 1 − 0.5
    expect(computeQualifierMask([1, 0, 0], q({ hueCenter: 45 }))).toBeCloseTo(0.5, 12);
  });

  it('opposite hue (180° off) is fully rejected', () => {
    expect(computeQualifierMask([1, 0, 0], q({ hueCenter: 180 }))).toBe(0);
  });

  it('wraparound keying: a 350° pixel matches center 10° (hd = 20° < 35° width)', () => {
    const px = hsv2rgb(350 / 360, 1, 1); // ≈ (1, 0, 1/6)
    expect(computeQualifierMask(px, q({ hueCenter: 10 }))).toBeCloseTo(1, 12);
    expect(computeQualifierMask(px, q({ hueCenter: 180 }))).toBe(0);
  });

  it('sat window gates the mask (s = 1 rejected by satHigh 0.5)', () => {
    expect(computeQualifierMask([1, 0, 0], q({ hueCenter: 0, satHigh: 0.5 }))).toBe(0);
  });

  it('luma window gates the mask on the sRGB-encoded BT.709 luma (red luma 0.2126)', () => {
    expect(computeQualifierMask([1, 0, 0], q({ hueCenter: 0, lumaHigh: 0.1 }))).toBe(0);
    expect(computeQualifierMask([1, 0, 0], q({ hueCenter: 0, lumaHigh: 0.3 }))).toBeCloseTo(1, 12);
  });

  it('combined mask is the PRODUCT hue·sat·lum (any failing factor zeroes it)', () => {
    const hueOkLumaFail = q({ hueCenter: 0, lumaHigh: 0.1, satLow: 0.5 });
    expect(computeQualifierMask([1, 0, 0], hueOkLumaFail)).toBe(0);
  });

  it('invert returns 1 − mask', () => {
    expect(computeQualifierMask([1, 0, 0], q({ hueCenter: 0, invert: true }))).toBe(0);
    expect(computeQualifierMask([1, 0, 0], q({ hueCenter: 180, invert: true }))).toBeCloseTo(1, 12);
  });

  it('strength scales and clamps to [0, 1]', () => {
    expect(computeQualifierMask([1, 0, 0], q({ hueCenter: 0, strength: 0.25 }))).toBeCloseTo(0.25, 12);
    expect(computeQualifierMask([1, 0, 0], q({ hueCenter: 45, strength: 0.5 }))).toBeCloseTo(0.25, 12);
    expect(computeQualifierMask([1, 0, 0], q({ hueCenter: 0, strength: 2 }))).toBe(1);
  });
});

describe('applyQualifierCorrection (spec 08 §17.E-port L1628-1639, LINEAR space)', () => {
  it('exposure is linear stops: ×2 per +1', () => {
    const out = applyQualifierCorrection([0.2, 0.4, 0.6], q({ exposure: 1 }));
    expect(out[0]).toBeCloseTo(0.4, 12);
    expect(out[2]).toBeCloseTo(1.2, 12);
  });

  it('no output clamp — HDR survives (exposure 2 on white → 4)', () => {
    const out = applyQualifierCorrection([1, 1, 1], q({ exposure: 2 }));
    expect(out[0]).toBeCloseTo(4, 12);
  });

  it('temperature +100: r +0.1 / b −0.1 (same law as the wheels, §4.2 L182-188)', () => {
    const out = applyQualifierCorrection([0.5, 0.5, 0.5], q({ temperature: 100 }));
    expect(out[0]).toBeCloseTo(0.6, 12);
    expect(out[1]).toBeCloseTo(0.5, 12);
    expect(out[2]).toBeCloseTo(0.4, 12);
  });

  it('tint +100: g −0.1, r/b +0.05', () => {
    const out = applyQualifierCorrection([0.5, 0.5, 0.5], q({ tint: 100 }));
    expect(out[0]).toBeCloseTo(0.55, 12);
    expect(out[1]).toBeCloseTo(0.4, 12);
    expect(out[2]).toBeCloseTo(0.55, 12);
  });

  it('saturation −100 flattens to BT.709 luma', () => {
    const px: RGB = [0.2, 0.4, 0.6];
    const out = applyQualifierCorrection(px, q({ saturation: -100 }));
    const y = luma709(px[0], px[1], px[2]);
    expect(out[0]).toBeCloseTo(y, 12);
    expect(out[1]).toBeCloseTo(y, 12);
    expect(out[2]).toBeCloseTo(y, 12);
  });
});

describe('sampleMatte — stride sampler for the viewer overlay', () => {
  const W = 8;
  const H = 8;
  const pixels = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (x < W / 2) {
        pixels[i] = 255; // pure red left half
      } else {
        pixels[i + 2] = 255; // pure blue right half
      }
      pixels[i + 3] = 255;
    }
  }

  it('samples a full-resolution grid when maxSamples allows (stride 1)', () => {
    const grid = sampleMatte(pixels, W, H, q({ hueCenter: 0 }), 64);
    expect(grid.stride).toBe(1);
    expect(grid.cols).toBe(8);
    expect(grid.rows).toBe(8);
    expect(grid.masks).toHaveLength(64);
    expect(grid.masks[0]).toBeCloseTo(1, 12); // red corner (x = 0)
    expect(grid.masks[3]).toBeCloseTo(1, 12); // x = 3 → still red
    expect(grid.masks[4]).toBe(0); // x = 4 → blue
    expect(grid.masks[63]).toBe(0); // blue corner
  });

  it('strides to respect the sample cap (8×8 @ 16 → stride 2, 4×4 grid)', () => {
    const grid = sampleMatte(pixels, W, H, q({ hueCenter: 0 }), 16);
    expect(grid.stride).toBe(2);
    expect(grid.cols).toBe(4);
    expect(grid.rows).toBe(4);
    expect(grid.cols * grid.rows).toBeLessThanOrEqual(16);
    expect(grid.masks[0]).toBeCloseTo(1, 12); // x = 0 red
    expect(grid.masks[1]).toBeCloseTo(1, 12); // x = 2 red
    expect(grid.masks[2]).toBe(0); // x = 4 blue
    expect(grid.masks[3]).toBe(0); // x = 6 blue
  });

  it('mask values follow the qualifier params (inverting flips the matte)', () => {
    const grid = sampleMatte(pixels, W, H, q({ hueCenter: 0, invert: true }), 64);
    expect(grid.masks[0]).toBe(0); // red now OUTSIDE the matte
    expect(grid.masks[63]).toBeCloseTo(1, 12); // blue inside (invert)
  });

  it('extreme aspect ratios still respect the cap', () => {
    const tall = new Uint8ClampedArray(8 * 400 * 4).fill(0);
    const grid = sampleMatte(tall, 8, 400, q({}), 50);
    expect(grid.cols * grid.rows).toBeLessThanOrEqual(50);
  });
});
