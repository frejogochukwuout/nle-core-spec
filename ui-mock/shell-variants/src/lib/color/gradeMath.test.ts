/* gradeMath.test.ts — R20-W4a. Pins the spec-08 §4.2 CPU port: identity,
   CDL-style spot values (lift on black, gain on white, gamma power), the
   14-step order effects, wheel semantics, wheelDelta symmetry, YRGB
   readouts, and the 28-f32 uniform packing. Where spec 08 §14 names a
   numeric invariant (contrast-pivot-preserves-pivot-point,
   exposure-plus-one-stop-no-clamp-above-one) it is pinned verbatim. */

import { describe, expect, it } from 'vitest';
import type { RGB } from './colorSpace';
import { luma709 } from './colorSpace';
import {
  DEFAULT_GRADE,
  WHEELS_PARAM_SLOTS,
  applyGrade,
  gradeInto,
  isIdentityGrade,
  packWheelsParams,
  wheelDelta,
  wheelTint,
  yrgbReadout,
} from './gradeMath';
import type { GradeParams } from './gradeMath';
import { DEFAULT_QUALIFIER } from './qualifierMath';

const g = (over: Partial<GradeParams>): GradeParams => ({ ...DEFAULT_GRADE, ...over });

describe('DEFAULT_GRADE (color-layout §3.2 defaults)', () => {
  it('pins the neutral values', () => {
    expect(DEFAULT_GRADE.contrast).toBe(1);
    expect(DEFAULT_GRADE.pivot).toBeCloseTo(0.435, 12);
    expect(DEFAULT_GRADE.gamma).toBe(1);
    expect(DEFAULT_GRADE.gain).toBe(1);
    expect(DEFAULT_GRADE.lift).toBe(0);
    expect(DEFAULT_GRADE.offset).toBe(0);
    expect(DEFAULT_GRADE.blackPoint).toBe(0);
    expect(DEFAULT_GRADE.whitePoint).toBe(1);
    expect(DEFAULT_GRADE.hue).toBe(50); // 50 = no-op (spec 08 §4.2 L214)
    expect(DEFAULT_GRADE.lumMix).toBe(100);
    expect(DEFAULT_GRADE.qualifier).toBeNull();
  });

  it('is recognized as the identity grade', () => {
    expect(isIdentityGrade(DEFAULT_GRADE)).toBe(true);
  });
});

describe('applyGrade — identity (spec 08 §4.2, all 14 steps neutral)', () => {
  const pixels: RGB[] = [
    [0, 0, 0], [1, 1, 1], [0.18, 0.18, 0.18], [1, 0, 0], [0, 1, 0], [0, 0, 1],
    [0.2, 0.4, 0.6], [0.9, 0.1, 0.55], [2.5, 0.01, 1.7], // HDR legal
  ];

  it('maps every pixel to itself (within 1e-9; no clamp — HDR survives)', () => {
    for (const px of pixels) {
      const out = applyGrade(px, DEFAULT_GRADE);
      expect(out[0]).toBeCloseTo(px[0], 9);
      expect(out[1]).toBeCloseTo(px[1], 9);
      expect(out[2]).toBeCloseTo(px[2], 9);
    }
  });

  it('gradeInto(out-aliasing px) matches applyGrade (pixel-loop contract)', () => {
    for (const px of pixels) {
      const alias: RGB = [px[0], px[1], px[2]];
      gradeInto(alias, DEFAULT_GRADE, alias);
      const pure = applyGrade(px, DEFAULT_GRADE);
      expect(alias).toEqual(pure);
    }
  });

  it('every single-field perturbation breaks identity', () => {
    const perturbs: Partial<GradeParams>[] = [
      { shAmount: 0.002 }, { midAmount: 0.002 }, { hlAmount: 0.002 }, { offAmount: 0.002 },
      { temperature: 1 }, { tint: 1 }, { saturation: 1 }, { exposure: 0.01 },
      { contrast: 1.01 }, { lift: 0.01 }, { gamma: 1.01 }, { gain: 1.01 }, { offset: 0.01 },
      { blackPoint: 0.01 }, { whitePoint: 0.99 }, { midDetail: 1 }, { colorBoost: 1 },
      { shadows: 1 }, { highlights: 1 }, { hue: 51 }, { lumMix: 99 },
      { qualifier: DEFAULT_QUALIFIER },
    ];
    for (const p of perturbs) expect(isIdentityGrade(g(p))).toBe(false);
  });
});

describe('applyGrade — step 5: exposure (linear stops, spec 08 §4.2 L190)', () => {
  it('+1 stop on white doubles: 1.0 → 2.0, NOT clamped to 1 (spec 08 §14 "exposure-plus-one-stop-no-clamp-above-one")', () => {
    const out = applyGrade([1, 1, 1], g({ exposure: 1 }));
    expect(out[0]).toBeCloseTo(2, 12);
    expect(out[1]).toBeCloseTo(2, 12);
    expect(out[2]).toBeCloseTo(2, 12);
  });

  it('+0.5 stop multiplies by 2^0.5', () => {
    const out = applyGrade([0.3, 0.3, 0.3], g({ exposure: 0.5 }));
    expect(out[0]).toBeCloseTo(0.3 * Math.sqrt(2), 12);
  });

  it('−1 stop on HDR 2.0 → 1.0', () => {
    const out = applyGrade([2, 2, 2], g({ exposure: -1 }));
    expect(out[0]).toBeCloseTo(1, 12);
  });
});

describe('applyGrade — step 8: the CDL-family levels (spec 08 §4.2 L198-199)', () => {
  it('lift=0.1 on a black pixel → linear 0.1 per channel ((0 + lift + offset)·gain)', () => {
    const out = applyGrade([0, 0, 0], g({ lift: 0.1 }));
    expect(out[0]).toBeCloseTo(0.1, 12);
    expect(out[1]).toBeCloseTo(0.1, 12);
    expect(out[2]).toBeCloseTo(0.1, 12);
  });

  it('combined scalars: f(0) = (lift + offset)·gain', () => {
    const out = applyGrade([0, 0, 0], g({ lift: 0.05, offset: 0.02, gain: 1.5 }));
    expect(out[0]).toBeCloseTo((0.05 + 0.02) * 1.5, 12);
  });

  it('gain scales highlights: f(1) = gain, HDR survives (no [0,1] clamp)', () => {
    const out = applyGrade([1, 1, 1], g({ gain: 1.5 }));
    expect(out[0]).toBeCloseTo(1.5, 12);
  });

  it('gamma=2 pivots mid: 0.25 → 0.5 (pow(c, 1/gamma))', () => {
    const out = applyGrade([0.25, 0.25, 0.25], g({ gamma: 2 }));
    expect(out[0]).toBeCloseTo(0.5, 12);
  });

  it('gamma=0.5: 0.25 → 0.0625', () => {
    const out = applyGrade([0.25, 0.25, 0.25], g({ gamma: 0.5 }));
    expect(out[0]).toBeCloseTo(0.0625, 12);
  });

  it('gamma floors at 0.05 (1/max(gamma,0.05)): gamma 0 → exponent 20', () => {
    const out = applyGrade([0.25, 0.25, 0.25], g({ gamma: 0 }));
    expect(out[0]).toBeCloseTo(Math.pow(0.25, 20), 12);
  });

  it('negative values clamp to 0 at the power domain guard (max(c,0))', () => {
    const out = applyGrade([-0.5, -0.5, -0.5], DEFAULT_GRADE);
    expect(out[0]).toBe(0);
  });
});

describe('applyGrade — step 6: contrast with pivot (spec 08 §4.2 L191)', () => {
  it('preserves the pivot point verbatim (spec 08 §14 "contrast-with-pivot-preserves-pivot-point": contrast 1.5, pivot 0.18)', () => {
    const out = applyGrade([0.18, 0.18, 0.18], g({ contrast: 1.5, pivot: 0.18 }));
    expect(out[0]).toBeCloseTo(0.18, 12);
  });

  it('pushes values above pivot further (0.5 → (0.5−0.18)·1.5+0.18 = 0.66)', () => {
    const out = applyGrade([0.5, 0.5, 0.5], g({ contrast: 1.5, pivot: 0.18 }));
    expect(out[0]).toBeCloseTo(0.66, 12);
  });

  it('values pushed below 0 by contrast are zeroed by the L199 pow guard (0.05 → 0)', () => {
    const out = applyGrade([0.05, 0.05, 0.05], g({ contrast: 1.5, pivot: 0.18 }));
    expect(out[0]).toBe(0);
  });
});

describe('applyGrade — step 4: temperature/tint (spec 08 §4.2 L182-188)', () => {
  it('temperature +100: r + 0.1, b − 0.1 (warm)', () => {
    const out = applyGrade([0.5, 0.5, 0.5], g({ temperature: 100 }));
    expect(out[0]).toBeCloseTo(0.6, 9);
    expect(out[1]).toBeCloseTo(0.5, 9);
    expect(out[2]).toBeCloseTo(0.4, 9);
  });

  it('temperature −100: r − 0.1, b + 0.1 (cool)', () => {
    const out = applyGrade([0.5, 0.5, 0.5], g({ temperature: -100 }));
    expect(out[0]).toBeCloseTo(0.4, 9);
    expect(out[2]).toBeCloseTo(0.6, 9);
  });

  it('tint +100: g − 0.1, r/b + 0.05 (magenta)', () => {
    const out = applyGrade([0.5, 0.5, 0.5], g({ tint: 100 }));
    expect(out[0]).toBeCloseTo(0.55, 9);
    expect(out[1]).toBeCloseTo(0.4, 9);
    expect(out[2]).toBeCloseTo(0.55, 9);
  });
});

describe('applyGrade — step 9: black/white point (spec 08 §4.2 L200-201)', () => {
  it('remaps through (c − black)/(white − black)', () => {
    const p = g({ blackPoint: 0.1, whitePoint: 0.9 });
    expect(applyGrade([0.5, 0.5, 0.5], p)[0]).toBeCloseTo(0.5, 12);
    expect(applyGrade([0.1, 0.1, 0.1], p)[0]).toBeCloseTo(0, 12);
    expect(applyGrade([0.9, 0.9, 0.9], p)[0]).toBeCloseTo(1, 12);
    expect(applyGrade([0.85, 0.85, 0.85], p)[0]).toBeCloseTo(0.9375, 12);
  });

  it('degenerate range floors at 0.001 (white − black = 0 → /0.001)', () => {
    const out = applyGrade([0.4, 0.4, 0.4], g({ blackPoint: 0.3, whitePoint: 0.3 }));
    expect(out[0]).toBeCloseTo((0.4 - 0.3) / 0.001, 9);
  });
});

describe('applyGrade — step 10: shadows/highlights × zone masks (spec 08 §4.2 L202-203)', () => {
  it('shadows +50 lifts black by 0.5 (shadowMask = 1 at luma 0)', () => {
    const out = applyGrade([0, 0, 0], g({ shadows: 50 }));
    expect(out[0]).toBeCloseTo(0.5, 12);
  });

  it('highlights −25 dims white by 0.25 (highlightMask = 1 at luma 1)', () => {
    const out = applyGrade([1, 1, 1], g({ highlights: -25 }));
    expect(out[0]).toBeCloseTo(0.75, 12);
  });

  it('zone masks gate the additions: shadows does not touch 0.18 or 1.0 luma', () => {
    const p = g({ shadows: 50 });
    expect(applyGrade([0.18, 0.18, 0.18], p)[0]).toBeCloseTo(0.18, 12);
    expect(applyGrade([1, 1, 1], p)[0]).toBeCloseTo(1, 12);
    const ph = g({ highlights: -25 });
    expect(applyGrade([0, 0, 0], ph)[0]).toBeCloseTo(0, 12);
  });

  it('masks derive from the ORIGINAL luma (pre-grade), like the shader', () => {
    // gain 4 moves 0.18 to 0.72 AFTER the masks were locked (step 1) — the
    // highlightMask stayed 0, so highlights −25 adds nothing: out = 0.18·4.
    const p = g({ gain: 4, highlights: -25 });
    expect(applyGrade([0.18, 0.18, 0.18], p)[0]).toBeCloseTo(0.72, 9);
  });
});

describe('applyGrade — step 7: midDetail, mid-masked (spec 08 §4.2 L192-197)', () => {
  it('chroma around luma scales by 1 + midDetail/100 inside the mid zone', () => {
    // construct a pixel with EXACT luma709 = 0.18 (full mid mask) and chroma
    const r = 0.2;
    const b = 0.16;
    const gr = (0.18 - 0.2126 * r - 0.0722 * b) / 0.7152;
    const out = applyGrade([r, gr, b], g({ midDetail: 100 }));
    const d = 0.18;
    expect(out[0]).toBeCloseTo(d + (r - d) * 2, 9);
    expect(out[1]).toBeCloseTo(d + (gr - d) * 2, 9);
    expect(out[2]).toBeCloseTo(d + (b - d) * 2, 9);
  });

  it('gray pixels are unaffected (c − luma = 0)', () => {
    const out = applyGrade([0.18, 0.18, 0.18], g({ midDetail: 100 }));
    expect(out[0]).toBeCloseTo(0.18, 12);
  });
});

describe('applyGrade — step 11: saturation (spec 08 §4.2 L205-207, BT.709 luma)', () => {
  it('−100 desaturates to BT.709 luma', () => {
    const px: RGB = [0.2, 0.4, 0.6];
    const out = applyGrade(px, g({ saturation: -100 }));
    const y = luma709(px[0], px[1], px[2]);
    expect(out[0]).toBeCloseTo(y, 12);
    expect(out[1]).toBeCloseTo(y, 12);
    expect(out[2]).toBeCloseTo(y, 12);
  });

  it('+50: mix(luma, c, 1.5)', () => {
    const px: RGB = [0.2, 0.4, 0.6];
    const out = applyGrade(px, g({ saturation: 50 }));
    const y = luma709(px[0], px[1], px[2]);
    expect(out[0]).toBeCloseTo(y + (px[0] - y) * 1.5, 12);
    expect(out[2]).toBeCloseTo(y + (px[2] - y) * 1.5, 12);
  });
});

describe('applyGrade — step 12: colorBoost (spec 08 §4.2 L208-213)', () => {
  it('boosts chroma weighted by (1 − clamp(|chroma|, 0, 1))', () => {
    const px: RGB = [0.2, 0.4, 0.6];
    const out = applyGrade(px, g({ colorBoost: 100 }));
    const y = luma709(px[0], px[1], px[2]);
    const cr = px[0] - y;
    const cg = px[1] - y;
    const cb = px[2] - y;
    const len = Math.sqrt(cr * cr + cg * cg + cb * cb);
    const w = 1 + 1 * (1 - len);
    expect(out[0]).toBeCloseTo(y + cr * w, 12);
    expect(out[1]).toBeCloseTo(y + cg * w, 12);
    expect(out[2]).toBeCloseTo(y + cb * w, 12);
  });

  it('gray pixels are untouched (zero chroma)', () => {
    const out = applyGrade([0.3, 0.3, 0.3], g({ colorBoost: 100 }));
    expect(out[0]).toBeCloseTo(0.3, 12);
  });
});

describe('applyGrade — step 13: hue rotate (spec 08 §4.2 L214-218)', () => {
  it('default 50 is a no-op', () => {
    const out = applyGrade([0.2, 0.4, 0.6], DEFAULT_GRADE);
    expect(out[1]).toBeCloseTo(0.4, 9);
  });

  it('hue=100 (+0.5 fract) rotates pure red to cyan', () => {
    const out = applyGrade([1, 0, 0], g({ hue: 100 }));
    expect(out[0]).toBeCloseTo(0, 12);
    expect(out[1]).toBeCloseTo(1, 12);
    expect(out[2]).toBeCloseTo(1, 12);
  });

  it('hue=0 (−0.5 fract) also lands red on the complement (fract(−0.5) = 0.5)', () => {
    const out = applyGrade([1, 0, 0], g({ hue: 0 }));
    expect(out[0]).toBeCloseTo(0, 12);
    expect(out[1]).toBeCloseTo(1, 12);
    expect(out[2]).toBeCloseTo(1, 12);
  });

  it('hue=100 on [0.2, 0.4, 0.6] → [0.6, 0.4, 0.2] (hand-derived HSV rotation)', () => {
    const out = applyGrade([0.2, 0.4, 0.6], g({ hue: 100 }));
    expect(out[0]).toBeCloseTo(0.6, 9);
    expect(out[1]).toBeCloseTo(0.4, 9);
    expect(out[2]).toBeCloseTo(0.2, 9);
  });
});

describe('applyGrade — step 14: lumMix (spec 08 §4.2 L219-220)', () => {
  it('lumMix 0 flattens to BT.709 luma', () => {
    const px: RGB = [0.2, 0.4, 0.6];
    const out = applyGrade(px, g({ lumMix: 0 }));
    const y = luma709(px[0], px[1], px[2]);
    expect(out[0]).toBeCloseTo(y, 12);
  });

  it('lumMix 50 halves the chroma', () => {
    const px: RGB = [0.2, 0.4, 0.6];
    const out = applyGrade(px, g({ lumMix: 50 }));
    const y = luma709(px[0], px[1], px[2]);
    expect(out[2]).toBeCloseTo(y + (px[2] - y) * 0.5, 12);
  });
});

describe('applyGrade — step 3: zone-masked wheel tints (spec 08 §4.2 L177-180)', () => {
  it('shadows wheel tints only the shadow zone (gray 0.09 → half-strength at the ramp midpoint)', () => {
    // shadowMask(0.09) = 0.5; red tint amount 0.5: mix(0.09, 0.09·lerp(1,0,0.5), 0.5)
    const out = applyGrade([0.09, 0.09, 0.09], g({ shHue: 0, shAmount: 0.5 }));
    expect(out[0]).toBeCloseTo(0.09, 12); // tint channel = 1 → unchanged
    expect(out[1]).toBeCloseTo(0.09 + (0.09 * 0.5 - 0.09) * 0.5, 12); // = 0.0675
    expect(out[2]).toBeCloseTo(0.0675, 12);
  });

  it('the tint is multiplicative — it does NOT lift black (unlike the lift scalar)', () => {
    const out = applyGrade([0, 0, 0], g({ shHue: 0, shAmount: 0.5 }));
    expect(out).toEqual([0, 0, 0]);
  });

  it('offset wheel applies at full mask (white → pure blue for hue 240, amount 1)', () => {
    const out = applyGrade([1, 1, 1], g({ offHue: 240, offAmount: 1 }));
    expect(out[0]).toBeCloseTo(0, 12);
    expect(out[1]).toBeCloseTo(0, 12);
    expect(out[2]).toBeCloseTo(1, 12);
  });
});

describe('wheelTint (spec 08 §4.2 L159-163)', () => {
  it('mix(c, c·mix(1,t,amount), mask) on a red tint at full mask', () => {
    // gray 0.4, hue 0 (t = (1,0,0)), amount 0.5 → [0.4, 0.2, 0.2]
    const out = wheelTint([0.4, 0.4, 0.4], 0, 0.5, 1);
    expect(out[0]).toBeCloseTo(0.4, 12);
    expect(out[1]).toBeCloseTo(0.2, 12);
    expect(out[2]).toBeCloseTo(0.2, 12);
  });

  it('mask 0.5 halves the effect', () => {
    const out = wheelTint([0.4, 0.4, 0.4], 0, 0.5, 0.5);
    expect(out[1]).toBeCloseTo(0.3, 12);
  });

  it('amount < 0.001 short-circuits to the input (shader guard)', () => {
    const out = wheelTint([0.4, 0.4, 0.4], 120, 0.0005, 1);
    expect(out).toEqual([0.4, 0.4, 0.4]);
  });

  it('is pure — the input tuple is not mutated', () => {
    const px: RGB = [0.4, 0.4, 0.4];
    wheelTint(px, 0, 0.5, 1);
    expect(px).toEqual([0.4, 0.4, 0.4]);
  });
});

describe('wheelDelta — luma-weighted additive delta (color-layout §3.5 law)', () => {
  it('hue 0, amount 1: (0.7874, −0.2126, −0.2126) — pushes R, Y-neutral', () => {
    const d = wheelDelta(0, 1);
    expect(d[0]).toBeCloseTo(0.7874, 12);
    expect(d[1]).toBeCloseTo(-0.2126, 12);
    expect(d[2]).toBeCloseTo(-0.2126, 12);
  });

  it('exact odd symmetry in amount: wheelDelta(h, −a) = −wheelDelta(h, a)', () => {
    for (const h of [0, 60, 137, 240, 300, 271.5]) {
      const plus = wheelDelta(h, 0.3);
      const minus = wheelDelta(h, -0.3);
      expect(minus[0]).toBeCloseTo(-plus[0], 15);
      expect(minus[1]).toBeCloseTo(-plus[1], 15);
      expect(minus[2]).toBeCloseTo(-plus[2], 15);
    }
  });

  it('is luma-compensated: luma709(delta) = 0 for every hue', () => {
    for (let h = 0; h < 360; h += 7) {
      const d = wheelDelta(h, 0.7);
      expect(Math.abs(luma709(d[0], d[1], d[2]))).toBeLessThan(1e-12);
    }
  });

  it('points along the hue direction: green push raises G, lowers R/B', () => {
    const d = wheelDelta(120, 1);
    expect(d[1]).toBeGreaterThan(0);
    expect(d[0]).toBeLessThan(0);
    expect(d[2]).toBeLessThan(0);
  });

  it('zero amount → zero delta', () => {
    const d = wheelDelta(200, 0);
    expect(d[0]).toBeCloseTo(0, 15);
    expect(d[1]).toBeCloseTo(0, 15);
    expect(d[2]).toBeCloseTo(0, 15);
  });
});

describe('yrgbReadout — derived YRGB rows (color-layout §3.5; spec 08 §16.A)', () => {
  it('offset wheel displays ×1023 Resolve-style code values', () => {
    const ro = yrgbReadout('offset', 0, 0.5, 0.1);
    expect(ro.y).toBeCloseTo(0.1 * 1023, 12);
    expect(ro.r).toBeCloseTo(1 * 0.5 * 1023, 12); // t = (1,0,0) for hue 0
    expect(ro.g).toBe(0);
    expect(ro.b).toBe(0);
  });

  it('lift/gamma/gain stay in linear units', () => {
    const lift = yrgbReadout('lift', 0, 0.5, -0.05);
    expect(lift.y).toBeCloseTo(-0.05, 12);
    expect(lift.r).toBeCloseTo(0.5, 12);
    const gamma = yrgbReadout('gamma', 120, 0.8, 2.5);
    expect(gamma.y).toBeCloseTo(2.5, 12);
    expect(gamma.g).toBeCloseTo(0.8, 12); // t ≈ (0,1,0) for hue 120
    expect(gamma.r).toBeCloseTo(0, 12);
  });
});

describe('packWheelsParams — the 28-f32 uniform (spec 08 §4.2 byte layout)', () => {
  it('packs every field at its spec-08 slot (7×4 f32 = 112 bytes)', () => {
    const p = g({
      shHue: 1, shAmount: 2, midHue: 3, midAmount: 4, hlHue: 5, hlAmount: 6,
      temperature: 7, tint: 8, saturation: 9, exposure: 10, contrast: 11, pivot: 12,
      lift: 13, gamma: 14, gain: 15, offset: 16, blackPoint: 17, whitePoint: 18,
      offHue: 19, offAmount: 20, midDetail: 21, colorBoost: 22, shadows: 23,
      highlights: 24, hue: 25, lumMix: 26,
    });
    const u = packWheelsParams(p);
    expect(u).toHaveLength(28);
    for (const [field, slot] of Object.entries(WHEELS_PARAM_SLOTS)) {
      expect(u[slot]).toBe(p[field as keyof GradeParams] as number);
    }
    expect(u[26]).toBe(0); // _pad1
    expect(u[27]).toBe(0); // _pad2
  });

  it('WHEELS_PARAM_SLOTS pins the spec-08 order verbatim', () => {
    expect(WHEELS_PARAM_SLOTS).toEqual({
      shHue: 0, shAmount: 1, midHue: 2, midAmount: 3, hlHue: 4, hlAmount: 5,
      temperature: 6, tint: 7, saturation: 8, exposure: 9, contrast: 10, pivot: 11,
      lift: 12, gamma: 13, gain: 14, offset: 15, blackPoint: 16, whitePoint: 17,
      offHue: 18, offAmount: 19, midDetail: 20, colorBoost: 21, shadows: 22,
      highlights: 23, hue: 24, lumMix: 25,
    });
  });

  it('DEFAULT_GRADE packs contrast@10 = 1, pivot@11 = 0.435, hue@24 = 50, lumMix@25 = 100', () => {
    const u = packWheelsParams(DEFAULT_GRADE);
    expect(u[10]).toBe(1);
    expect(u[11]).toBeCloseTo(0.435, 6); // float32 storage
    expect(u[13]).toBe(1);
    expect(u[17]).toBe(1);
    expect(u[24]).toBe(50);
    expect(u[25]).toBe(100);
  });
});
