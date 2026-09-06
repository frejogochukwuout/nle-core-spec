/* colorSpace.ts — sRGB ⇄ scene-linear transfer functions + LUTs, BT.709/BT.601
   luma, HSV conversion, smoothstep, and the spec-08 zone masks.

   Pure math, no DOM, no framework. The engine seam this mirrors:
   - spec 08 (08-color-grading.md) §4.2 "Our ported colorWheelsFragment
     (linear-light)": BT.709 luma + the 0.18 linear mid-gray mask thresholds.
   - spec 04 §5.2/§6 "Working linear-light texture" / display transfer.
   - docs/r20/color-layout.md §3.1 (the mock's LUT contract: 256-entry decode
     LUT, 4096-entry encode LUT, ~12-bit linear internally, 8-bit out).

   R20-W4a. Consumed by gradeMath / qualifierMath / gradedImage / scopesMath. */

/** A pixel as a plain [r,g,b] tuple (linear-light unless documented otherwise). */
export type RGB = [number, number, number];
/** HSV triple: h is a 0..1 fraction of 360° (WGSL convention), s/v in 0..1. */
export type HSV = [number, number, number];

/* ------------------------------------------------------------------ *
 * sRGB transfer functions (color-layout §3.1, spec 04 §6.3 boundary) *
 * ------------------------------------------------------------------ */

/** sRGB EOTF⁻¹ (decode) of an 8-bit code value → scene-linear, continuous.
 * `L = n ≤ 0.04045 ? n/12.92 : ((n+0.055)/1.055)^2.4` with `n = code/255`. */
export function srgbDecode8(code: number): number {
  const n = code / 255;
  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

/** sRGB OETF (encode) of a linear value → n in [0,1] (clamped).
 * `n = L ≤ 0.0031308 ? 12.92·L : 1.055·L^(1/2.4) − 0.055`, clamp n to [0,1]
 * (color-layout §3.1: "Display clamp is applied ONLY at encode"). */
export function srgbEncodeUnit(linear: number): number {
  if (linear <= 0.0031308) {
    // covers L ≤ 0 (incl. negatives) without Math.pow NaN
    return clamp01(12.92 * linear);
  }
  return clamp01(1.055 * Math.pow(linear, 1 / 2.4) - 0.055);
}

/** sRGB encode of a linear value → 8-bit code (rounded, clamped to 0..255). */
export function srgbEncode8(linear: number): number {
  return Math.round(255 * srgbEncodeUnit(linear));
}

/** 256-entry sRGB decode LUT, `SrgbToLinear[c] = srgbDecode8(c)` (float32).
 * Exact for every 8-bit input (color-layout §3.1). */
export const SRGB_DECODE_LUT: Float32Array = (() => {
  const lut = new Float32Array(256);
  for (let c = 0; c < 256; c++) lut[c] = srgbDecode8(c);
  return lut;
})();

/** 4096-entry linear → sRGB 8-bit encode LUT. Index = `round(L·4095)` clamped
 * to [0,4095]; value = `round(255 · srgbEncodeUnit(index/4095))` clamped to
 * [0,255]. Quantization ≤ 1/4096 linear — below one 8-bit display step
 * (color-layout §3.1). */
export const SRGB_ENCODE_LUT: Uint8Array = (() => {
  const lut = new Uint8Array(4096);
  for (let i = 0; i < 4096; i++) lut[i] = srgbEncode8(i / 4095);
  return lut;
})();

/** Encode a linear value through the 4096-entry LUT (the pixel-loop path). */
export function srgbEncodeLut(linear: number): number {
  const idx = Math.round(linear * 4095);
  return SRGB_ENCODE_LUT[idx < 0 ? 0 : idx > 4095 ? 4095 : idx];
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/* ------------------------------------------------------- *
 * Luma coefficients (spec 08 §4.2 key change #1; §13.Q8)  *
 * ------------------------------------------------------- */

/** BT.709 luma of LINEAR-light rgb — `0.2126·R + 0.7152·G + 0.0722·B`
 * (spec 08 §4.2: "luminance() BT.709 (common.ts:62-64) instead of
 * luminance601()" — the wheels/grade path MUST use this in linear-light). */
export function luma709(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** BT.601 luma — `0.299·R + 0.587·G + 0.114·B` (scopes' legacy graticule
 * parity, color-layout §3.7; also the vectorscope Y). */
export function luma601(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/* ------------------------------- *
 * smoothstep (WGSL semantics)     *
 * ------------------------------- */

/** Standard `t²(3−2t)` smoothstep with clamp: 0 below `e0`, 1 above `e1`.
 * Degenerate `e0 === e1` acts as a hard step (avoids 0/0). */
export function smoothstep(e0: number, e1: number, x: number): number {
  const d = e1 - e0;
  let t = d === 0 ? (x >= e1 ? 1 : 0) : (x - e0) / d;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return t * t * (3 - 2 * t);
}

/* ------------------------------------------------------------ *
 * Zone masks — spec 08 §4.2 L173-175 (linear-light thresholds) *
 * ------------------------------------------------------------ */

export interface ZoneMasks {
  /** 1 at luma 0 → 0 at luma 0.18. */
  shadow: number;
  /** 1 − shadow − highlight (non-negative, sums to 1 with the others). */
  mid: number;
  /** 0 below luma 0.18 → 1 at luma 1.0. */
  highlight: number;
}

/**
 * The three wheel-zone masks from LINEAR BT.709 luma — spec 08 §4.2:
 * `shadow = 1 − smoothstep(0.0, 0.18, luma)` (0.18 = 18% mid-gray in linear,
 * key change #2), `highlight = smoothstep(0.18, 1.0, luma)` (key change #3),
 * `mid = 1 − shadow − highlight`. Masks always sum to 1.
 */
export function zoneMasks(luma: number): ZoneMasks {
  const shadow = 1 - smoothstep(0, 0.18, luma);
  const highlight = smoothstep(0.18, 1, luma);
  return { shadow, mid: 1 - shadow - highlight, highlight };
}

/* --------------------------------------------------------------- *
 * HSV conversion — FreeCut common.ts:7-14 semantics (spec 08      *
 * §13.Q8: rgb2hsv/hsv2rgb; hue is a 0..1 fraction of 360°).       *
 * --------------------------------------------------------------- */

/**
 * RGB → HSV. `h` 0..1 (fraction of 360°, red = 0), `s` = c/v, `v` = max(r,g,b).
 * Port of the WGSL `rgb2hsv` (sector via `v == r | g | b` branches, negative
 * hue wrapped by +1). Used by wheel tints (spec 08 §4.2 L161) and the hue
 * rotate (L215) / qualifier (§17.E) stages.
 */
export function rgb2hsv(r: number, g: number, b: number): HSV {
  const v = Math.max(r, g, b);
  const c = v - Math.min(r, g, b);
  let h = 0;
  if (c !== 0) {
    if (v === r) h = (g - b) / c;
    else if (v === g) h = 2 + (b - r) / c;
    else h = 4 + (r - g) / c;
    h /= 6;
    if (h < 0) h += 1;
  }
  const s = v === 0 ? 0 : c / v;
  return [h, s, v];
}

/**
 * HSV → RGB (inverse of `rgb2hsv`; the WGSL `hsv2rgb`). `h` wraps via fract
 * (h = 1.25 ≡ 0.25; negatives wrap too), so hue rotation never leaves 0..1.
 */
export function hsv2rgb(h: number, s: number, v: number): RGB {
  const hf = ((h % 1) + 1) % 1; // WGSL fract(h)
  let k = Math.floor(hf * 6);
  if (k > 5) k = 5;
  const f = hf * 6 - k;
  const p = v * (1 - s);
  const q = v * (1 - s * f);
  const t = v * (1 - s * (1 - f));
  switch (k) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
}
