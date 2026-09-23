/* colorSpace.test.ts — R20-W4a. Pins the transfer-function LUTs (color-layout
   §3.1 contract), BT.709/601 luma, the spec-08 §4.2 zone-mask boundaries, and
   the HSV helpers (FreeCut common.ts semantics, spec 08 §13.Q8). */

import { describe, expect, it } from 'vitest';
import {
  SRGB_DECODE_LUT,
  SRGB_ENCODE_LUT,
  hsv2rgb,
  luma601,
  luma709,
  rgb2hsv,
  smoothstep,
  srgbDecode8,
  srgbEncode8,
  srgbEncodeLut,
  srgbEncodeUnit,
  zoneMasks,
} from './colorSpace';

describe('sRGB decode LUT (256 entries, color-layout §3.1)', () => {
  it('has exactly 256 entries covering every code value', () => {
    expect(SRGB_DECODE_LUT).toHaveLength(256);
  });

  it('endpoints: code 0 → 0, code 255 → 1', () => {
    expect(SRGB_DECODE_LUT[0]).toBe(0);
    expect(SRGB_DECODE_LUT[255]).toBeCloseTo(1, 12);
  });

  it('linear branch below the 0.04045 knee (code 10 → (10/255)/12.92)', () => {
    // 10/255 = 0.0392 ≤ 0.04045 → linear segment (LUT is float32: 6 digits)
    expect(SRGB_DECODE_LUT[10]).toBeCloseTo((10 / 255) / 12.92, 6);
  });

  it('power branch above the knee (code 128 → ((n+0.055)/1.055)^2.4)', () => {
    const n = 128 / 255;
    expect(SRGB_DECODE_LUT[128]).toBeCloseTo(Math.pow((n + 0.055) / 1.055, 2.4), 6);
  });

  it('matches the continuous formula for every code value (float32 storage)', () => {
    for (let c = 0; c < 256; c++) {
      expect(SRGB_DECODE_LUT[c]).toBeCloseTo(srgbDecode8(c), 6);
    }
  });

  it('is monotonically non-decreasing', () => {
    for (let c = 1; c < 256; c++) {
      expect(SRGB_DECODE_LUT[c]).toBeGreaterThanOrEqual(SRGB_DECODE_LUT[c - 1]);
    }
  });
});

describe('sRGB encode LUT (4096 entries, color-layout §3.1)', () => {
  it('has exactly 4096 entries; 0 → 0 and 4095 → 255', () => {
    expect(SRGB_ENCODE_LUT).toHaveLength(4096);
    expect(SRGB_ENCODE_LUT[0]).toBe(0);
    expect(SRGB_ENCODE_LUT[4095]).toBe(255);
  });

  it('value = round(255 · encode(index/4095)) for every index', () => {
    for (let i = 0; i < 4096; i++) {
      expect(SRGB_ENCODE_LUT[i]).toBe(srgbEncode8(i / 4095));
    }
  });

  it('clamps the display range: encode of L ≥ 1 → 255, L ≤ 0 → 0', () => {
    expect(srgbEncodeUnit(2.5)).toBe(1);
    expect(srgbEncodeUnit(-0.4)).toBe(0);
    expect(srgbEncodeLut(99)).toBe(255);
    expect(srgbEncodeLut(-1)).toBe(0);
  });

  it('is monotonically non-decreasing', () => {
    for (let i = 1; i < 4096; i++) {
      expect(SRGB_ENCODE_LUT[i]).toBeGreaterThanOrEqual(SRGB_ENCODE_LUT[i - 1]);
    }
  });

  it('sRGB round-trip ≤ 1 LSB for every 8-bit code (decode → encode)', () => {
    let worst = 0;
    for (let c = 0; c < 256; c++) {
      const back = srgbEncode8(SRGB_DECODE_LUT[c]);
      const err = Math.abs(back - c);
      if (err > worst) worst = err;
      expect(err).toBeLessThanOrEqual(1);
    }
    expect(worst).toBeLessThanOrEqual(1);
  });

  it('LUT path agrees with the continuous encode within 1 LSB', () => {
    for (let i = 0; i < 512; i++) {
      const l = (i / 511) * 2 - 0.5; // include out-of-range values
      expect(Math.abs(srgbEncodeLut(l) - srgbEncode8(l))).toBeLessThanOrEqual(1);
    }
  });
});

describe('luma coefficients', () => {
  it('BT.709 (spec 08 §4.2 key change #1): weights 0.2126/0.7152/0.0722', () => {
    expect(luma709(1, 0, 0)).toBeCloseTo(0.2126, 12);
    expect(luma709(0, 1, 0)).toBeCloseTo(0.7152, 12);
    expect(luma709(0, 0, 1)).toBeCloseTo(0.0722, 12);
    expect(luma709(1, 1, 1)).toBeCloseTo(1, 12);
  });

  it('BT.709 keeps 18% gray gray (0.18 in → 0.18 out)', () => {
    expect(luma709(0.18, 0.18, 0.18)).toBeCloseTo(0.18, 12);
  });

  it('BT.601 (scopes/vectorscope): weights 0.299/0.587/0.114', () => {
    expect(luma601(1, 0, 0)).toBeCloseTo(0.299, 12);
    expect(luma601(0, 1, 0)).toBeCloseTo(0.587, 12);
    expect(luma601(0, 0, 1)).toBeCloseTo(0.114, 12);
    expect(luma601(1, 1, 1)).toBeCloseTo(1, 12);
  });
});

describe('smoothstep (standard t²(3−2t) clamp form)', () => {
  it('is 0 at/below e0 and 1 at/above e1', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, 1)).toBe(1);
    expect(smoothstep(0, 1, 2)).toBe(1);
  });

  it('is exactly 0.5 at the midpoint (t = 0.5 → 0.25·2)', () => {
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 12);
    expect(smoothstep(0.18, 1, (0.18 + 1) / 2)).toBeCloseTo(0.5, 12);
  });

  it('is monotonic across the ramp', () => {
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
      const v = smoothstep(0, 1, i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('zone masks (spec 08 §4.2 L173-175 — linear 0.0/0.18/1.0 thresholds)', () => {
  it('black luma 0 → full shadow, no mid/highlight', () => {
    expect(zoneMasks(0)).toEqual({ shadow: 1, mid: 0, highlight: 0 });
  });

  it('mid-gray 0.18 → full midtone only (shadow ramp ended, highlight not started)', () => {
    const m = zoneMasks(0.18);
    expect(m.shadow).toBe(0);
    expect(m.highlight).toBe(0);
    expect(m.mid).toBe(1);
  });

  it('luma 1.0 → full highlight, no shadow/mid', () => {
    expect(zoneMasks(1)).toEqual({ shadow: 0, mid: 0, highlight: 1 });
  });

  it('shadow-ramp midpoint 0.09 → shadow = mid = 0.5', () => {
    const m = zoneMasks(0.09);
    expect(m.shadow).toBeCloseTo(0.5, 12);
    expect(m.highlight).toBe(0);
    expect(m.mid).toBeCloseTo(0.5, 12);
  });

  it('masks sum to 1 and stay non-negative across the domain (incl. HDR > 1)', () => {
    for (let i = 0; i <= 40; i++) {
      const y = (i / 40) * 1.4; // 0 .. 1.4
      const m = zoneMasks(y);
      expect(m.shadow).toBeGreaterThanOrEqual(0);
      expect(m.mid).toBeGreaterThanOrEqual(0);
      expect(m.highlight).toBeGreaterThanOrEqual(0);
      expect(m.shadow + m.mid + m.highlight).toBeCloseTo(1, 12);
    }
  });

  it('shadow is decreasing, highlight increasing in luma', () => {
    let prevS = 1;
    let prevH = 0;
    for (let i = 1; i <= 30; i++) {
      const m = zoneMasks(i / 30);
      expect(m.shadow).toBeLessThanOrEqual(prevS + 1e-12);
      expect(m.highlight).toBeGreaterThanOrEqual(prevH - 1e-12);
      prevS = m.shadow;
      prevH = m.highlight;
    }
  });
});

describe('rgb2hsv / hsv2rgb (FreeCut common.ts:7-14 semantics, spec 08 §13.Q8)', () => {
  it('primaries: red h=0, green h=1/3, blue h=2/3, all s=v=1', () => {
    expect(rgb2hsv(1, 0, 0)).toEqual([0, 1, 1]);
    expect(rgb2hsv(0, 1, 0)[0]).toBeCloseTo(1 / 3, 12);
    expect(rgb2hsv(0, 0, 1)[0]).toBeCloseTo(2 / 3, 12);
  });

  it('secondaries: yellow 1/6, cyan 1/2, magenta 5/6 (magenta via the negative-wrap branch)', () => {
    expect(rgb2hsv(1, 1, 0)[0]).toBeCloseTo(1 / 6, 12);
    expect(rgb2hsv(0, 1, 1)[0]).toBeCloseTo(0.5, 12);
    expect(rgb2hsv(1, 0, 1)[0]).toBeCloseTo(5 / 6, 12);
  });

  it('gray has s=0 and h=0; black has v=0 and s=0 (no NaN)', () => {
    expect(rgb2hsv(0.5, 0.5, 0.5)).toEqual([0, 0, 0.5]);
    expect(rgb2hsv(0, 0, 0)).toEqual([0, 0, 0]);
  });

  it('full-sat complements are channel-wise complements: t(h+0.5) = 1 − t(h)', () => {
    for (const h of [0, 1 / 6, 0.13, 0.3, 0.62]) {
      const a = hsv2rgb(h, 1, 1);
      const b = hsv2rgb(h + 0.5, 1, 1);
      expect(b[0]).toBeCloseTo(1 - a[0], 12);
      expect(b[1]).toBeCloseTo(1 - a[1], 12);
      expect(b[2]).toBeCloseTo(1 - a[2], 12);
    }
  });

  it('round-trips rgb → hsv → rgb for assorted colors', () => {
    const pxs = [
      [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.2, 0.4, 0.6], [0.9, 0.1, 0.55],
      [0.18, 0.18, 0.18], [0.02, 0.5, 0.02], [0.7, 0.7, 0.1],
    ];
    for (const [r, g, b] of pxs) {
      const [h, s, v] = rgb2hsv(r, g, b);
      const back = hsv2rgb(h, s, v);
      expect(back[0]).toBeCloseTo(r, 9);
      expect(back[1]).toBeCloseTo(g, 9);
      expect(back[2]).toBeCloseTo(b, 9);
    }
  });

  it('hsv2rgb wraps hue by fract: h=1.25 ≡ 0.25, h=−0.25 ≡ 0.75', () => {
    expect(hsv2rgb(1.25, 0.5, 0.8)).toEqual(hsv2rgb(0.25, 0.5, 0.8));
    expect(hsv2rgb(-0.25, 0.5, 0.8)).toEqual(hsv2rgb(0.75, 0.5, 0.8));
    expect(hsv2rgb(1, 1, 1)).toEqual(hsv2rgb(0, 1, 1));
  });

  it('chroma-1 tint of the wheel (hsv2rgb(h,1,1)) is what wheelTint multiplies in', () => {
    // spec 08 §4.2 L161: tintColor = hsv2rgb(hue/360, 1.0, 1.0) — e.g. 240° ≈ pure blue
    const blue = hsv2rgb(240 / 360, 1, 1);
    expect(blue[0]).toBeCloseTo(0, 9); // sector boundary: float64 2/3·6 = 3.999…
    expect(blue[1]).toBeCloseTo(0, 9);
    expect(blue[2]).toBeCloseTo(1, 9);
    const yellow = hsv2rgb(60 / 360, 1, 1);
    expect(yellow[0]).toBeCloseTo(1, 9);
    expect(yellow[1]).toBeCloseTo(1, 9);
    expect(yellow[2]).toBeCloseTo(0, 9);
  });
});
