/* gradeMath.ts — the CPU port of spec 08 §4.2's ported `colorWheelsFragment`
   (scene-linear), plus the wheel readout derivations.

   THE ENGINE SEAM. The field names and the 14-step order below are verbatim
   from spec 08 (08-color-grading.md) §4.2 / §17.A-port so the mock preview is
   1:1 with the engine uniform. All ops act on scene-linear [r,g,b]; values
   above 1.0 are legal (HDR) and are NOT clamped here — the display clamp
   happens only at sRGB encode (spec 08 §4.2 key change #4; color-layout §3.1).

   Step order (spec 08 §17.A-port, line refs):
     1-2  zone masks from BT.709 luma, thresholds 0.0 / 0.18 / 1.0  (L172-175)
     3    wheel tints: shadows → midtones → highlights → offset     (L177-180)
     4    temperature/tint additive                                  (L182-188)
     5    exposure `c *= 2^exposure`                                 (L190)
     6    contrast with pivot                                        (L191)
     7    midDetail, mid-masked                                      (L192-197)
     8    levels: `(c + lift + offset) · gain` then
          `pow(max(c,0), 1/max(gamma,0.05))`                         (L198-199)
     9    black/white point                                          (L200-201)
     10   shadows/highlights additive × mask                         (L202-203)
     11   saturation `mix(luma, c, 1 + sat/100)`                     (L205-207)
     12   colorBoost — low-chroma-weighted                           (L208-213)
     13   hue rotate ±50 → 0..1 fract                                (L214-218)
     14   lumMix `mix(luma', c, lumMix/100)`                         (L219-220)
     —    NO output clamp (L222 removed) — HDR preserved

   Pure, DOM-free. R20-W4a (DESIGN-R20 D3; gap C52 CPU preview pipeline). */

import type { RGB } from './colorSpace';
import { hsv2rgb, luma709, rgb2hsv, smoothstep } from './colorSpace';
import type { QualifierParams } from './qualifierMath';

/**
 * GradeParams — spec 08 §4.2 `WheelsParams` (the 28-f32 uniform, 26 meaningful
 * fields; names verbatim) + the mock extras from color-layout §3.2:
 * `qualifier` is the optional secondary HSL-keyer node (spec 08 §8) composed
 * by gradedImage.ts. Units follow the shader: wheels hue 0..360° / amount
 * 0..1; temperature/tint/saturation/midDetail/colorBoost/shadows/highlights
 * −100..100; hue 0..100 with 50 = no-op; lumMix 0..100; exposure stops;
 * contrast multiplier; pivot / lift / gamma / gain / offset / points linear.
 */
export interface GradeParams {
  /** Shadows (lift) wheel — hue in degrees, amount 0..1. */
  shHue: number;
  shAmount: number;
  /** Midtones (gamma) wheel. */
  midHue: number;
  midAmount: number;
  /** Highlights (gain) wheel. */
  hlHue: number;
  hlAmount: number;
  /** Offset wheel — full-mask (1.0) tint. */
  offHue: number;
  offAmount: number;
  /** −100..100 (temp: warm+/cool−; tint: magenta+/green−). */
  temperature: number;
  tint: number;
  /** −100..100 (sat multiplier = 1 + saturation/100). */
  saturation: number;
  /** Exposure in linear stops (c *= 2^exposure). */
  exposure: number;
  /** Contrast multiplier; `pivot` is the fixed point. */
  contrast: number;
  pivot: number;
  /** Scalar levels — `(c + lift + offset) · gain`, `pow(c, 1/gamma)`. */
  lift: number;
  gamma: number;
  gain: number;
  offset: number;
  /** Levels remap `(c − blackPoint) / (whitePoint − blackPoint)`. */
  blackPoint: number;
  whitePoint: number;
  /** Mid-detail (−100..100), mid-zone masked. */
  midDetail: number;
  /** Color boost (−100..100) — low-chroma weighted. */
  colorBoost: number;
  /** Zone-limited additive corrections, −100..100. */
  shadows: number;
  highlights: number;
  /** Hue rotate: 0..100, 50 = no-op (±50 maps to ∓0.5 hue fract). */
  hue: number;
  /** Lum mix: 0..100, 100 = full RGB (no luma flattening). */
  lumMix: number;
  /** Optional secondary qualifier node (spec 08 §8; applied by gradedImage). */
  qualifier?: QualifierParams | null;
}

/** Neutral grade (color-layout §3.2 defaults; pivot 0.435 per ref §1.3). */
export const DEFAULT_GRADE: GradeParams = {
  shHue: 0,
  shAmount: 0,
  midHue: 0,
  midAmount: 0,
  hlHue: 0,
  hlAmount: 0,
  offHue: 0,
  offAmount: 0,
  temperature: 0,
  tint: 0,
  saturation: 0,
  exposure: 0,
  contrast: 1,
  pivot: 0.435,
  lift: 0,
  gamma: 1,
  gain: 1,
  offset: 0,
  blackPoint: 0,
  whitePoint: 1,
  midDetail: 0,
  colorBoost: 0,
  shadows: 0,
  highlights: 0,
  hue: 50,
  lumMix: 100,
  qualifier: null,
};

/* ------------------------------------------------------------------ *
 * Wheels                                                             *
 * ------------------------------------------------------------------ */

/**
 * One wheel tint application — spec 08 §4.2 L159-163 verbatim:
 * `mix(color, color · mix(1, tintColor, amount), mask)` with
 * `tintColor = hsv2rgb(hue/360, 1.0, 1.0)` (chroma 1). Returns a NEW tuple.
 * `amount < 0.001` or `mask` 0 short-circuits to the input.
 */
export function wheelTint(px: RGB, hue: number, amount: number, mask: number): RGB {
  if (amount < 0.001) return [px[0], px[1], px[2]];
  const t = hsv2rgb(hue / 360, 1, 1);
  const out: RGB = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const multiplied = px[i] * (1 + (t[i] - 1) * amount); // c · lerp(1, t, amount)
    out[i] = px[i] + (multiplied - px[i]) * mask; // lerp(c, c·m, mask)
  }
  return out;
}

/** Scalar (allocation-free) channel version of `wheelTint` for pixel loops. */
function wheelTintChannel(c: number, tintChannel: number, amount: number, mask: number): number {
  const multiplied = c * (1 + (tintChannel - 1) * amount);
  return c + (multiplied - c) * mask;
}

/**
 * `wheelDelta(hue, amount)` — the additive RGB delta a wheel tint contributes
 * to a fully-masked pixel, luma-weighted.
 *
 * Derivation: spec 08 §4.2's tint is multiplicative (`c·lerp(1,t,amount)`),
 * so its additive effect on an achromatic pixel of luminance Y is
 * `Y·(t−1)·amount` — i.e. the delta is luma-WEIGHTED (scales with Y). Taking
 * the unit-gray reference (Y = 1) gives the raw delta `(t − 1)·amount`; the
 * wheel then compensates its own BT.709 luminance so the push is luma-NEUTRAL
 * — the "moving the color should not change the luminance of the chosen
 * color" law (filmic-worlds, quoted in color-layout §3.5; Resolve's
 * trackballs are luma-compensated, the ring is Y):
 *   `delta = (t−1)·amount − luma709((t−1)·amount)`  →  luma709(delta) = 0
 *
 * Exact odd symmetry in amount: `wheelDelta(h, −a) = −wheelDelta(h, a)`.
 * NOTE: the pixel path (applyGrade) uses the spec's multiplicative `wheelTint`
 * — this function serves derived readouts / puck UX, not the engine math.
 */
export function wheelDelta(hue: number, amount: number): RGB {
  const t = hsv2rgb(hue / 360, 1, 1); // spec 08 §4.2 L161 tint color
  const dr = (t[0] - 1) * amount; // (t − 1) · amount, per channel
  const dg = (t[1] - 1) * amount;
  const db = (t[2] - 1) * amount;
  const y = luma709(dr, dg, db); // its own BT.709 luminance
  return [dr - y, dg - y, db - y]; // luma709(delta) = 0 (weights sum to 1)
}

/* ------------------------------------------------------------------ *
 * Derived YRGB readouts (color-layout §3.5; spec 08 §16.A)           *
 * ------------------------------------------------------------------ */

/** The four wheels, in shader/zone order. */
export type WheelId = 'lift' | 'gamma' | 'gain' | 'offset';

export interface YrgbReadout {
  /** Y cell = the wheel's scalar in its display unit. */
  y: number;
  /** R/G/B cells = the tint vector's per-channel contribution `t_c·amount`
   * in the same unit (color-layout §3.5). Read-only derived values — the
   * engine seam has no per-channel numeric editing (spec 08 §16.A). */
  r: number;
  g: number;
  b: number;
}

/**
 * Derived YRGB row for one wheel. Offset is displayed in ×1023 Resolve-style
 * 10-bit code values (color-layout §3.5 "Offset displays ×1023 code values");
 * lift/gamma/gain stay in their linear units (−0.2..0.2 / 0.25..4 / 0.25..4).
 */
export function yrgbReadout(wheel: WheelId, tintHue: number, tintAmount: number, scalar: number): YrgbReadout {
  const scale = wheel === 'offset' ? 1023 : 1;
  const t = hsv2rgb(tintHue / 360, 1, 1); // spec 08 §4.2 L161 tint color
  return {
    y: scalar * scale,
    r: t[0] * tintAmount * scale,
    g: t[1] * tintAmount * scale,
    b: t[2] * tintAmount * scale,
  };
}

/* ------------------------------------------------------------------ *
 * Uniform packing (spec 08 §4.2 byte layout — 7×4 f32 = 112 bytes)   *
 * ------------------------------------------------------------------ */

/**
 * Pack a GradeParams into the exact 28-f32 WheelsParams uniform order
 * (spec 08 §4.2: "Uniform layout is UNCHANGED from FreeCut … byte 0-15
 * shHue…, byte 96-111 hue, lumMix, _pad1, _pad2"). The qualifier is NOT part
 * of the uniform (separate secondary-node params, spec 08 §8.1).
 */
export function packWheelsParams(p: GradeParams): Float32Array {
  const u = new Float32Array(28);
  u[0] = p.shHue;
  u[1] = p.shAmount;
  u[2] = p.midHue;
  u[3] = p.midAmount;
  u[4] = p.hlHue;
  u[5] = p.hlAmount;
  u[6] = p.temperature;
  u[7] = p.tint;
  u[8] = p.saturation;
  u[9] = p.exposure;
  u[10] = p.contrast;
  u[11] = p.pivot;
  u[12] = p.lift;
  u[13] = p.gamma;
  u[14] = p.gain;
  u[15] = p.offset;
  u[16] = p.blackPoint;
  u[17] = p.whitePoint;
  u[18] = p.offHue;
  u[19] = p.offAmount;
  u[20] = p.midDetail;
  u[21] = p.colorBoost;
  u[22] = p.shadows;
  u[23] = p.highlights;
  u[24] = p.hue;
  u[25] = p.lumMix;
  u[26] = 0; // _pad1
  u[27] = 0; // _pad2
  return u;
}

/** Which WheelsParams slot (0..27) each GradeParams field packs into. */
export const WHEELS_PARAM_SLOTS: Readonly<Record<string, number>> = {
  shHue: 0, shAmount: 1, midHue: 2, midAmount: 3, hlHue: 4, hlAmount: 5,
  temperature: 6, tint: 7, saturation: 8, exposure: 9, contrast: 10, pivot: 11,
  lift: 12, gamma: 13, gain: 14, offset: 15, blackPoint: 16, whitePoint: 17,
  offHue: 18, offAmount: 19, midDetail: 20, colorBoost: 21, shadows: 22,
  highlights: 23, hue: 24, lumMix: 25,
};

/* ------------------------------------------------------------------ *
 * The 14-step grade (spec 08 §4.2 / §17.A-port)                      *
 * ------------------------------------------------------------------ */

const FRACT_EPS = 0.001; // shader-side early-out thresholds (L159/192/209/214)

/** True when every stage is a no-op (skip the pixel pass — spec 08 §12.1). */
export function isIdentityGrade(p: GradeParams): boolean {
  const e = 1e-6;
  return (
    Math.abs(p.shAmount) < e && Math.abs(p.midAmount) < e &&
    Math.abs(p.hlAmount) < e && Math.abs(p.offAmount) < e &&
    Math.abs(p.temperature) < e && Math.abs(p.tint) < e &&
    Math.abs(p.saturation) < e && Math.abs(p.exposure) < e &&
    Math.abs(p.contrast - 1) < e &&
    Math.abs(p.lift) < e && Math.abs(p.gamma - 1) < e &&
    Math.abs(p.gain - 1) < e && Math.abs(p.offset) < e &&
    Math.abs(p.blackPoint) < e && Math.abs(p.whitePoint - 1) < e &&
    Math.abs(p.midDetail) < e && Math.abs(p.colorBoost) < e &&
    Math.abs(p.shadows) < e && Math.abs(p.highlights) < e &&
    Math.abs(p.hue - 50) < e && Math.abs(p.lumMix - 100) < e &&
    !p.qualifier
  );
}

/**
 * `applyGrade(px, params)` — the full 14-step wheels grade on one
 * scene-linear pixel (spec 08 §4.2, implemented verbatim; see the module
 * header for the ordered step list). Pure: returns a new tuple. There is NO
 * [0,1] output clamp (spec 08 §4.2 key change #4 — HDR values > 1 survive;
 * the gamma stage's own `max(c,0)` is L199's domain guard, not a range
 * clamp; the display clamp happens at sRGB encode in gradedImage).
 * For the pixel loop use `gradeInto` (same math, caller-owned buffer).
 */
export function applyGrade(px: RGB, params: GradeParams): RGB {
  return gradeInto(px, params, [px[0], px[1], px[2]]);
}

/**
 * In-place variant of `applyGrade` — writes the graded pixel into `out`
 * (which may alias `px`) and returns it. Identical math and order.
 */
export function gradeInto(px: RGB, p: GradeParams, out: RGB): RGB {
  let r = px[0];
  let g = px[1];
  let b = px[2];

  // Steps 1-2 (L172-175): zone masks from the ORIGINAL BT.709 luma.
  // shadow = 1 − smoothstep(0, 0.18, luma); highlight = smoothstep(0.18, 1, luma);
  // mid = 1 − shadow − highlight. (0.18 = linear mid-gray, key changes #2/#3.)
  const y0 = luma709(r, g, b);
  const shadowMask = 1 - smoothstep(0, 0.18, y0);
  const highlightMask = smoothstep(0.18, 1, y0);
  const midtoneMask = 1 - shadowMask - highlightMask;

  // Step 3 (L177-180): wheel tints, shadows → midtones → highlights → offset.
  // offset is applied at full mask (1.0). Tint color = hsv2rgb(hue/360, 1, 1).
  if (p.shAmount >= FRACT_EPS) {
    const t = hsv2rgb(p.shHue / 360, 1, 1);
    r = wheelTintChannel(r, t[0], p.shAmount, shadowMask);
    g = wheelTintChannel(g, t[1], p.shAmount, shadowMask);
    b = wheelTintChannel(b, t[2], p.shAmount, shadowMask);
  }
  if (p.midAmount >= FRACT_EPS) {
    const t = hsv2rgb(p.midHue / 360, 1, 1);
    r = wheelTintChannel(r, t[0], p.midAmount, midtoneMask);
    g = wheelTintChannel(g, t[1], p.midAmount, midtoneMask);
    b = wheelTintChannel(b, t[2], p.midAmount, midtoneMask);
  }
  if (p.hlAmount >= FRACT_EPS) {
    const t = hsv2rgb(p.hlHue / 360, 1, 1);
    r = wheelTintChannel(r, t[0], p.hlAmount, highlightMask);
    g = wheelTintChannel(g, t[1], p.hlAmount, highlightMask);
    b = wheelTintChannel(b, t[2], p.hlAmount, highlightMask);
  }
  if (p.offAmount >= FRACT_EPS) {
    const t = hsv2rgb(p.offHue / 360, 1, 1);
    r = wheelTintChannel(r, t[0], p.offAmount, 1);
    g = wheelTintChannel(g, t[1], p.offAmount, 1);
    b = wheelTintChannel(b, t[2], p.offAmount, 1);
  }

  // Step 4 (L182-188): temperature/tint additive.
  const temp = p.temperature / 100;
  r += temp * 0.1;
  b -= temp * 0.1;
  const ti = p.tint / 100;
  g -= ti * 0.1;
  r += ti * 0.05;
  b += ti * 0.05;

  // Step 5 (L190): linear exposure — c *= 2^exposure (stops).
  const exposureScale = Math.pow(2, p.exposure);
  r *= exposureScale;
  g *= exposureScale;
  b *= exposureScale;

  // Step 6 (L191): contrast with pivot — (c − pivot)·contrast + pivot.
  const pv = p.pivot;
  r = (r - pv) * p.contrast + pv;
  g = (g - pv) * p.contrast + pv;
  b = (b - pv) * p.contrast + pv;

  // Step 7 (L192-197): mid detail — chroma gain around luma, mid-masked.
  if (Math.abs(p.midDetail) > FRACT_EPS) {
    const d = luma709(r, g, b);
    const f = 1 + p.midDetail / 100;
    const ar = d + (r - d) * f;
    const ag = d + (g - d) * f;
    const ab = d + (b - d) * f;
    r = r + (ar - r) * midtoneMask; // mix(c, adjusted, midtoneMask)
    g = g + (ag - g) * midtoneMask;
    b = b + (ab - b) * midtoneMask;
  }

  // Step 8 (L198-199): the CDL-family levels — (c + lift + offset) · gain,
  // then pow(max(c,0), 1/max(gamma,0.05)). lift+offset combine additively,
  // gain multiplies, gamma is a power (color-layout §3.3 step 7 note).
  const liftOffset = p.lift + p.offset;
  r = (r + liftOffset) * p.gain;
  g = (g + liftOffset) * p.gain;
  b = (b + liftOffset) * p.gain;
  const invGamma = 1 / Math.max(p.gamma, 0.05);
  r = Math.pow(Math.max(r, 0), invGamma);
  g = Math.pow(Math.max(g, 0), invGamma);
  b = Math.pow(Math.max(b, 0), invGamma);

  // Step 9 (L200-201): black/white point levels remap.
  const range = Math.max(p.whitePoint - p.blackPoint, 0.001);
  r = (r - p.blackPoint) / range;
  g = (g - p.blackPoint) / range;
  b = (b - p.blackPoint) / range;

  // Step 10 (L202-203): zone-limited additive shadows/highlights.
  const shadowAdd = (p.shadows / 100) * shadowMask;
  const highlightAdd = (p.highlights / 100) * highlightMask;
  r += shadowAdd + highlightAdd;
  g += shadowAdd + highlightAdd;
  b += shadowAdd + highlightAdd;

  // Step 11 (L205-207): saturation — mix(luma, c, 1 + sat/100) (BT.709 luma).
  const sat = 1 + p.saturation / 100;
  const gray = luma709(r, g, b);
  r = gray + (r - gray) * sat;
  g = gray + (g - gray) * sat;
  b = gray + (b - gray) * sat;

  // Step 12 (L208-213): color boost — low-chroma-weighted saturation boost.
  const boost = p.colorBoost / 100;
  if (Math.abs(boost) > FRACT_EPS) {
    const bg = luma709(r, g, b);
    const cr = r - bg;
    const cg = g - bg;
    const cb = b - bg;
    const chromaLen = Math.sqrt(cr * cr + cg * cg + cb * cb); // length(chroma)
    const clamped = chromaLen < 0 ? 0 : chromaLen > 1 ? 1 : chromaLen;
    const w = 1 + boost * (1 - clamped);
    r = bg + cr * w;
    g = bg + cg * w;
    b = bg + cb * w;
  }

  // Step 13 (L214-218): hue rotate — fract(h + (hue−50)/100) in HSV.
  // (RGB→HSV on the current linear values, exactly as the §17.A-port shader.)
  if (Math.abs(p.hue - 50) > FRACT_EPS) {
    const hsv = rgb2hsv(r, g, b);
    const h = (((hsv[0] + (p.hue - 50) / 100) % 1) + 1) % 1; // WGSL fract
    const rgb = hsv2rgb(h, hsv[1], hsv[2]);
    r = rgb[0];
    g = rgb[1];
    b = rgb[2];
  }

  // Step 14 (L219-220): lum mix — mix(postLuma, c, clamp(lumMix/100, 0, 1)).
  const pl = luma709(r, g, b);
  const lm = p.lumMix / 100;
  const lmc = lm < 0 ? 0 : lm > 1 ? 1 : lm;
  r = pl + (r - pl) * lmc;
  g = pl + (g - pl) * lmc;
  b = pl + (b - pl) * lmc;

  // L222: the FreeCut output clamp was REMOVED in the port — HDR values
  // survive; the display clamp happens only at sRGB encode (gradedImage).

  out[0] = r;
  out[1] = g;
  out[2] = b;
  return out;
}

/* LOG sub-mode: NOT implemented. Spec 08 defines no log-space variant of the
 * wheels (grep-verified: no "log" wheels anywhere in 08-color-grading.md —
 * the 14 steps are linear-light only). The color-layout §3.4.6 LOG proposal
 * (log2-gamma stage around the 0.18 pivot) is mock-only design, NOT an
 * engine seam, so this module intentionally skips it; W4b may relabel the
 * wheel headers for the LOG toggle but must register the math divergence
 * if it ever ships §3.4.6's log contrast. */
