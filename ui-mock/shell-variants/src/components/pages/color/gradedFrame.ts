/* gradedFrame.ts — R20-W4c (DESIGN-R20 D3; color-layout §3.6/§3.4; gaps
   C52/C53/C54 viewer-side). The CPU grade STACK pipeline that composes
   W4a's read-only lib/color primitives with W4b's store-side curve records:

     decodeToLinear (cached per mediaId, §12.1)
       → per pass: gradeInto (spec 08 §4.2 14 steps, verbatim from W4a)
                    + curve LUT right after the pass (spec 08 §5.2 / W4b's
                      bakeCurveLut — the composition seam W4a's
                      gradeLinearImage does not have; added HERE, not in the
                      read-only lib)
                    + qualifier node (spec 08 §17.E-port: mask on the
                      sRGB-encoded graded value, correction + mix in LINEAR)
       → sRGB encode LUT (display clamp ONLY here)

   TIMELINE-GRADE COMPOSITION LAW (color-layout §3.6 "grade stack per frame:
   [clipGrade] → [timelineGrade], each a full GradeParams application in
   sequence"): the timeline record is a POST-CLIP pass applied AFTER the
   clip's record on EVERY video element — sequential full-grade application,
   NOT a params merge. Spec 08 itself defines no timeline-grade concept (the
   key is mock-only, W4b's TIMELINE_GRADE_KEY); the sequential law is the
   documented mock model — README deviations + one-line gap note in-code.

   Pure, DOM-free except the structural ImageData shape (lib/color law).
   R20-W4c; consumed by GradedViewerCanvas (the DOM half). */

import {
  SRGB_DECODE_LUT,
  srgbEncodeLut,
  srgbEncodeUnit,
  luma709,
  rgb2hsv,
  gradeInto,
  isIdentityGrade,
  computeQualifierMask,
  applyQualifierCorrection,
  hashGradeParams,
  decodeToLinear,
  type LinearImage,
  type GradeParams,
  type QualifierParams,
} from '../../../lib/color';
import { evaluateCurve, isIdentityCurve, type CurvePoint, type CurveSet } from './curveMath';
import type { MockGrade } from '../../../state/useUiStore';

/* ------------------------------------------------------------------ *
 * Working resolution (color-layout §3.6: ≤960×540)                   *
 * ------------------------------------------------------------------ */

export const WORKING_MAX_WIDTH = 960;
export const WORKING_MAX_HEIGHT = 540;

/** `workingResolution(nw, nh)` — the ≤960×540 clamp, aspect-preserving,
 *  never upsampled (scale ≤ 1). The mock's stills are 1344×768 → 945×540. */
export function workingResolution(naturalWidth: number, naturalHeight: number): { width: number; height: number } {
  const scale = Math.min(1, WORKING_MAX_WIDTH / Math.max(1, naturalWidth), WORKING_MAX_HEIGHT / Math.max(1, naturalHeight));
  return { width: Math.max(1, Math.round(naturalWidth * scale)), height: Math.max(1, Math.round(naturalHeight * scale)) };
}

/* ------------------------------------------------------------------ *
 * Curve LUT composition (spec 08 §5.2 — the W4c seam W4b reserved)   *
 * ------------------------------------------------------------------ */

/**
 * `bakeLinearCurveLut(curves)` — the spec 08 §5.2 bake in LINEAR domain:
 * control points live in display code-value space (W4b's CurveSet), so the
 * 256-entry LUT maps an ENCODED code value in → LINEAR value out,
 * `lut[i] = srgbDecode(spline(i/255))` (color-layout §3.4). In the pixel
 * loop the caller indexes it with `srgbEncodeLut(linear)` — the display
 * round-trip is exactly the composition color-layout prescribes. Null when
 * the set is absent/identity (no LUT hop, byte-identical to W4a's pipeline).
 */
export function bakeLinearCurveLut(curves: CurveSet | undefined): Float32Array | null {
  if (isIdentityCurve(curves)) return null;
  const pts: CurvePoint[] = curves?.master ?? [];
  const lut = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const out = evaluateCurve(pts, i / 255); // display-domain spline (W4b's evaluator — reused, not duplicated)
    const code = Math.min(255, Math.max(0, Math.round(out * 255)));
    lut[i] = SRGB_DECODE_LUT[code];
  }
  return lut;
}

/* ------------------------------------------------------------------ *
 * The grade stack                                                    *
 * ------------------------------------------------------------------ */

/** One full GradeParams application + its optional curve LUT. */
export interface GradePass {
  params: GradeParams;
  /** 256-entry encoded-code → linear LUT (null = no curve hop). */
  curveLut: Float32Array | null;
}

/**
 * `buildGradeStack(clipGrade, timelineGrade)` — the sequential composition
 * law (color-layout §3.6): [clip → timeline], each a FULL pass. Identity
 * records with no curve are SKIPPED (spec 08 §12.1 no-op rule — an
 * untouched timeline costs nothing; an identity grade WITH a qualifier is
 * still a real pass). Source-preview mode builds the EMPTY stack (the raw
 * poster, ungraded — color-layout §3.6's one-line divergence: source =
 * un-graded asset; grades are keyed by element id, a pool asset has none).
 */
export function buildGradeStack(clipGrade: MockGrade | null, timelineGrade: MockGrade | null): GradePass[] {
  const passes: GradePass[] = [];
  const push = (g: MockGrade | null) => {
    if (!g) return;
    const curveLut = bakeLinearCurveLut(g.curves);
    if (!curveLut && isIdentityGrade(g)) return; // §12.1 no-op skip
    passes.push({ params: g, curveLut });
  };
  push(clipGrade);
  push(timelineGrade);
  return passes;
}

/* ------------------------------------------------------------------ *
 * The stack pixel loop                                               *
 * ------------------------------------------------------------------ */

function makeImageData(data: Uint8ClampedArray<ArrayBuffer>, width: number, height: number): ImageData {
  if (typeof ImageData === 'function') return new ImageData(data, width, height);
  return { data, width, height, colorSpace: 'srgb' } as unknown as ImageData; // jsdom structural fallback
}

/**
 * `gradeLinearFrame(linear, passes)` — the stack pipeline: per pixel, each
 * pass runs W4a's `gradeInto` (the spec 08 §4.2 order), then its curve LUT
 * (indexed by the encoded code of the CURRENT linear value), then its
 * qualifier node (§17.E-port semantics identical to gradeLinearImage: mask
 * on the sRGB-encoded graded pixel, showMask renders the matte grayscale,
 * the correction mixes in LINEAR). The display clamp happens ONLY at the
 * final encode. A single no-curve pass is byte-identical to W4a's
 * `gradeLinearImage` (pinned by test).
 */
export function gradeLinearFrame(linear: LinearImage, passes: GradePass[]): ImageData {
  const { width, height, data } = linear;
  const n = width * height;
  const out = new Uint8ClampedArray(new ArrayBuffer(n * 4));
  const px: [number, number, number] = [0, 0, 0];
  const work: [number, number, number] = [0, 0, 0];
  const enc: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const l = i * 4;
    let r = data[l];
    let g = data[l + 1];
    let b = data[l + 2];
    for (let p = 0; p < passes.length; p++) {
      const pass = passes[p];
      const params = pass.params;
      if (!isIdentityGrade(params)) {
        px[0] = r; px[1] = g; px[2] = b;
        gradeInto(px, params, work);
        r = work[0]; g = work[1]; b = work[2];
      }
      // curve LUT right after the §4.2 pass (color-layout §3.4) — indexed by
      // the encoded code value of the current linear value
      const lut = pass.curveLut;
      if (lut) {
        r = lut[srgbEncodeLut(r)];
        g = lut[srgbEncodeLut(g)];
        b = lut[srgbEncodeLut(b)];
      }
      const qual = params.qualifier;
      if (qual) {
        enc[0] = srgbEncodeUnit(r);
        enc[1] = srgbEncodeUnit(g);
        enc[2] = srgbEncodeUnit(b);
        const mask = computeQualifierMask(enc, qual);
        if (qual.showMask) {
          r = mask; // grayscale matte (encoded below like any linear value)
          g = mask;
          b = mask;
        } else {
          work[0] = r; work[1] = g; work[2] = b;
          const corrected = applyQualifierCorrection(work, qual);
          r = r + (corrected[0] - r) * mask; // mix in LINEAR (§17.E-port)
          g = g + (corrected[1] - g) * mask;
          b = b + (corrected[2] - b) * mask;
        }
      }
    }
    out[l] = srgbEncodeLut(r);
    out[l + 1] = srgbEncodeLut(g);
    out[l + 2] = srgbEncodeLut(b);
    out[l + 3] = Math.round(data[l + 3] * 255);
  }
  return makeImageData(out, width, height);
}

/** One-shot convenience: decode + stack grade (tests + small buffers). */
export function gradeImageDataStack(img: ImageData, passes: GradePass[]): ImageData {
  return gradeLinearFrame(decodeToLinear(img), passes);
}

/* ------------------------------------------------------------------ *
 * Cache keys (spec 08 §12 — decode per mediaId, graded output per    *
 * elementId|stack-hash|src-hash)                                     *
 * ------------------------------------------------------------------ */

/** FNV-1a over the baked curve LUT (rounded to 1/2¹²) — any control-point
 * change that moves ANY of the 256 entries changes the stack hash. */
function fnvCurveLut(lut: Float32Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < lut.length; i++) {
    h ^= Math.round(lut[i] * 4095) & 0xff;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

/**
 * Stable stack hash — W4a's `hashGradeParams` per pass (curves are NOT
 * GradeParams fields, so the baked curve joins the key via its full LUT).
 */
export function hashGradeStack(passes: GradePass[]): string {
  return passes
    .map((p) => `${hashGradeParams(p.params)}|${p.curveLut ? fnvCurveLut(p.curveLut) : 'nc'}`)
    .join('=>');
}

/* ------------------------------------------------------------------ *
 * The eyedropper (C54) — sample → qualifier seed                    *
 * ------------------------------------------------------------------ */

/**
 * `sampleAverage3x3(data, width, height, x, y)` — display-code-value 3×3
 * average around (x, y) (color-layout §3.4 "sample the 3×3 average"), edge
 * clamped. Returns [r, g, b] in 0..255 code values.
 */
export function sampleAverage3x3(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  const x0 = Math.max(0, Math.min(width - 1, Math.round(x)) - 1);
  const x1 = Math.min(width - 1, x0 + 2);
  const y0 = Math.max(0, Math.min(height - 1, Math.round(y)) - 1);
  const y1 = Math.min(height - 1, y0 + 2);
  for (let yy = y0; yy <= y1; yy++) {
    for (let xx = x0; xx <= x1; xx++) {
      const i = (yy * width + xx) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }
  return [r / count, g / count, b / count];
}

/**
 * `qualifierSeedFromSample(r, g, b)` — the eyedropper's Center seed from a
 * sampled pixel (display code values 0..255), color-layout §3.4:
 * hueCenter = h·360, sat ±0.08, luma ±0.06 (the qualifier's own domain:
 * HSV + BT.709 luma on the sRGB-ENCODED value, spec 08 §17.E-port). The
 * patch merges onto the record's qualifier (store deep-merge).
 */
export function qualifierSeedFromSample(r: number, g: number, b: number): Partial<QualifierParams> {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const hsv = rgb2hsv(nr, ng, nb);
  const luma = luma709(nr, ng, nb);
  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  return {
    hueCenter: hsv[0] * 360,
    satLow: clamp01(hsv[1] - 0.08),
    satHigh: clamp01(hsv[1] + 0.08),
    lumaLow: clamp01(luma - 0.06),
    lumaHigh: clamp01(luma + 0.06),
  };
}
