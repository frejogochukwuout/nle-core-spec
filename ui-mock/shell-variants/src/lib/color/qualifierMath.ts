/* qualifierMath.ts — the HSL secondary qualifier (keyer) math, ported from
   spec 08 §8 / §17.E-port (`secondaryQualifierFragment`, our linear-light
   port).

   The qualifier computes its mask on sRGB-ENCODED values (HSV is a
   display-space construct — spec 08 §8.2: "converts linear → sRGB before the
   HSV/luma computation"), with BT.709 luma on the encoded values (§17.E-port
   "CHANGED: BT.709 (was luminance601)" — note: color-layout §3.4 mentions
   BT.601 luma, but the ported engine shader is the seam we wire to, so 709
   wins; deviation documented). The secondary correction (exposure / temp /
   tint / saturation) applies to LINEAR rgb (§17.E-port "Grade applied in
   LINEAR space").

   Pure, DOM-free. R20-W4a (DESIGN-R20 D3; gap C54 real HSL keying). */

import type { RGB } from './colorSpace';
import { luma709, rgb2hsv, smoothstep } from './colorSpace';

/**
 * QualifierParams — spec 08 §8.1 `SecondaryQualifierParams`, UI-shaped
 * (booleans for the two flags). Hue fields are degrees (converted to 0..1
 * fractions exactly as the shader does: `fract(hueCenter/360)` etc.);
 * sat/luma fields are 0..1 on display-encoded values (lumaLow/lumaHigh are
 * sRGB-encoded thresholds — §17.E-port comment). Defaults = spec 08 §8.1
 * (`:1007-1143`): hueCenter 0°, hueWidth 35°, hueSoftness 20°, sat/luma
 * ranges full, softness 0.1, strength 1, corrections neutral.
 */
export interface QualifierParams {
  hueCenter: number;
  hueWidth: number;
  hueSoftness: number;
  satLow: number;
  satHigh: number;
  satSoftness: number;
  lumaLow: number;
  lumaHigh: number;
  lumaSoftness: number;
  /** `invertMask` — 1 − mask. */
  invert: boolean;
  /** `showMask` — render the matte as grayscale instead of the grade. */
  showMask: boolean;
  /** 0..1 mask strength multiplier. */
  strength: number;
  /** Secondary-node correction, applied in LINEAR space (§17.E-port). */
  exposure: number;
  saturation: number;
  temperature: number;
  tint: number;
}

export const DEFAULT_QUALIFIER: QualifierParams = {
  hueCenter: 0,
  hueWidth: 35,
  hueSoftness: 20,
  satLow: 0,
  satHigh: 1,
  satSoftness: 0.1,
  lumaLow: 0,
  lumaHigh: 1,
  lumaSoftness: 0.1,
  invert: false,
  showMask: false,
  strength: 1,
  exposure: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
};

/**
 * Circular hue distance with wraparound — spec 08 §17.E L1520-1523:
 * `diff = |hue − center|; min(diff, 1 − diff)`. Both inputs are 0..1 hue
 * fractions; result is the shortest way around the wheel (also 0..1).
 * E.g. 350° vs 10° → 20°/360.
 */
export function circularHueDistance(hue: number, center: number): number {
  const diff = Math.abs(hue - center);
  return Math.min(diff, 1 - diff);
}

/**
 * Soft range mask — spec 08 §17.E L1525-1532 (`centeredRangeMask`):
 * `smoothstep(low−soft, low, value) · (1 − smoothstep(high, high+soft, value))`
 * with low/high swapped into order and softness floored at 1e-4. 1 inside
 * [low, high], 0 beyond ±soft outside, smoothstep ramps on both edges.
 */
export function centeredRangeMask(value: number, lowValue: number, highValue: number, softness: number): number {
  const low = Math.min(lowValue, highValue);
  const high = Math.max(lowValue, highValue);
  const soft = Math.max(softness, 0.0001);
  const lowMask = smoothstep(low - soft, low, value);
  const highMask = 1 - smoothstep(high, high + soft, value);
  const m = lowMask * highMask;
  return m < 0 ? 0 : m > 1 ? 1 : m;
}

/**
 * The full qualifier matte for one pixel — spec 08 §17.E-port L1606-1621.
 * `encoded` is the pixel in sRGB-ENCODED 0..1 units (the caller encodes the
 * linear value first; in the mock pipeline this is "what the user sees").
 *
 *   hsv = rgb2hsv(encoded); luma = luma709(encoded)         (BT.709, port)
 *   hd  = circularHueDistance(hsv.h, fract(hueCenter/360))
 *   mask = 1 − smoothstep(hueWidth/360, hueWidth/360 + hueSoftness/360, hd)
 *   mask *= centeredRangeMask(hsv.s, satLow, satHigh, satSoftness)
 *   mask *= centeredRangeMask(luma,  lumaLow, lumaHigh, lumaSoftness)
 *   if invert: mask = 1 − mask;  mask = clamp(mask · strength, 0, 1)
 */
export function computeQualifierMask(encoded: RGB, p: QualifierParams): number {
  const hsv = rgb2hsv(encoded[0], encoded[1], encoded[2]);
  const luma = luma709(encoded[0], encoded[1], encoded[2]);
  const center = p.hueCenter / 360 - Math.floor(p.hueCenter / 360); // fract
  const hueDistance = circularHueDistance(hsv[0], center);
  const hueWidth = Math.min(Math.max(p.hueWidth / 360, 0), 0.5); // clamp 0..0.5
  const hueSoftness = Math.max(p.hueSoftness / 360, 0.0001);
  let mask = 1 - smoothstep(hueWidth, hueWidth + hueSoftness, hueDistance);
  mask *= centeredRangeMask(hsv[1], p.satLow, p.satHigh, p.satSoftness);
  mask *= centeredRangeMask(luma, p.lumaLow, p.lumaHigh, p.lumaSoftness);
  if (p.invert) mask = 1 - mask;
  mask *= p.strength;
  return mask < 0 ? 0 : mask > 1 ? 1 : mask;
}

/**
 * The secondary-node correction — spec 08 §17.E-port L1628-1639, applied in
 * LINEAR space: exposure `c *= 2^exposure`, the same temperature/tint
 * additive as the wheels (§4.2 L182-188), saturation `mix(luma709, c,
 * 1 + sat/100)`. No output clamp (the port removed it — HDR preserved).
 */
export function applyQualifierCorrection(px: RGB, p: QualifierParams): RGB {
  let r = px[0];
  let g = px[1];
  let b = px[2];
  const exposureScale = Math.pow(2, p.exposure);
  r *= exposureScale;
  g *= exposureScale;
  b *= exposureScale;
  const temp = p.temperature / 100;
  r += temp * 0.1;
  b -= temp * 0.1;
  const ti = p.tint / 100;
  g -= ti * 0.1;
  r += ti * 0.05;
  b += ti * 0.05;
  const sat = 1 + p.saturation / 100;
  const gray = luma709(r, g, b);
  r = gray + (r - gray) * sat;
  g = gray + (g - gray) * sat;
  b = gray + (b - gray) * sat;
  return [r, g, b];
}

/** Stride-sampled matte grid for the viewer overlay. */
export interface MatteGrid {
  /** Sample columns (x = min(col·stride, width−1)). */
  cols: number;
  /** Sample rows (y = min(row·stride, height−1)). */
  rows: number;
  /** Sampling stride in source pixels (same on both axes). */
  stride: number;
  /** Row-major `rows × cols` mask values in 0..1 (index = row·cols + col). */
  masks: Float32Array;
}

/**
 * `sampleMatte(pixels, params)` — stride-sampler that evaluates the qualifier
 * mask over a display-space RGBA buffer (8-bit code values, normalized to
 * 0..1 — the same encoded domain `computeQualifierMask` expects) and returns
 * a coarse grid of masks for the viewer's matte overlay. The grid is capped
 * at `maxSamples` samples (default 10_000, the scope/plot point budget).
 */
export function sampleMatte(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  p: QualifierParams,
  maxSamples = 10000,
): MatteGrid {
  const total = width * height;
  let stride = Math.max(1, Math.ceil(Math.sqrt(total / Math.max(1, maxSamples))));
  let cols = Math.max(1, Math.ceil(width / stride));
  let rows = Math.max(1, Math.ceil(height / stride));
  // keep the promised cap even for extreme aspect ratios
  while (cols * rows > maxSamples && (cols > 1 || rows > 1)) {
    stride += 1;
    cols = Math.max(1, Math.ceil(width / stride));
    rows = Math.max(1, Math.ceil(height / stride));
  }
  const masks = new Float32Array(cols * rows);
  const px: RGB = [0, 0, 0];
  for (let row = 0; row < rows; row++) {
    const y = Math.min(row * stride, height - 1);
    for (let col = 0; col < cols; col++) {
      const x = Math.min(col * stride, width - 1);
      const i = (y * width + x) * 4;
      px[0] = pixels[i] / 255;
      px[1] = pixels[i + 1] / 255;
      px[2] = pixels[i + 2] / 255;
      masks[row * cols + col] = computeQualifierMask(px, p);
    }
  }
  return { cols, rows, stride, masks };
}
