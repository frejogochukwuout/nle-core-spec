/* curveMath.ts — R20-W4b (DESIGN-R20 D3 / gap C55, the Curves tab).
   The master RGB curve's POINTS + spline evaluation. Pure, DOM-free.

   THE SEAM SPLIT (noted for W4c): W4a's gradeMath (spec 08 §4.2 WheelsParams)
   has NO curves field — spec 08 §5 keeps curves as a separate 256×1-per-channel
   LUT baked at edit time. This module owns:
     · the point model (CurveSet) stored in the mock's grade record
       (useUiStore.MockGrade = GradeParams & { curves?: CurveSet } — the store
       extends W4a's shape WITHOUT touching the read-only lib/color module);
     · the monotone piecewise-cubic interpolation (Fritsch–Carlson, no overshoot
       — the grading-curve law) used by the editor's preview path;
     · bakeCurveLut — the spec 08 §5.2 256-entry bake in DISPLAY code-value
       domain that W4c's viewer composes right after the §4.2 grade pass
       (color-layout §3.4 "applied in the pixel loop right after step 13").
   Only `master` exists today (the mission's "master RGB curve"); R/G/B channel
   curves extend CurveSet without touching this module's math.
*/

/** One control point — x/y both 0..1 (display code-value domain, spec 08 §5). */
export interface CurvePoint {
  x: number;
  y: number;
}

/** The curve set stored in a grade record. Points stay sorted by x. */
export interface CurveSet {
  master: CurvePoint[];
}

/** Neutral identity curve (spec 08 §5.2: identity when untouched). */
export const DEFAULT_CURVE: CurveSet = {
  master: [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ],
};

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** True when the set is the untouched identity (no record needed). */
export function isIdentityCurve(c: CurveSet | undefined): boolean {
  if (!c) return true;
  const m = c.master;
  if (m.length !== 2) return false;
  return Math.abs(m[0].x) < 1e-6 && Math.abs(m[0].y) < 1e-6 && Math.abs(m[1].x - 1) < 1e-6 && Math.abs(m[1].y - 1) < 1e-6;
}

/** Sort + clamp a point list into canonical form (x ascending, y clamped). */
export function normalizeCurvePoints(pts: CurvePoint[]): CurvePoint[] {
  return [...pts]
    .map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) }))
    .sort((a, b) => a.x - b.x);
}

/* ------------------------------------------------------------------ *
 * Monotone piecewise cubic (Fritsch–Carlson)                        *
 * ------------------------------------------------------------------ */

/**
 * Monotone cubic Hermite interpolation, evaluated at x. Endpoints clamp
 * (x below/above the span returns the first/last y). With the default
 * 2-point identity set this is exactly y = x (linear diagonal).
 *
 * Fritsch–Carlson: tangents m_i from secant slopes Δ_i, then each interval
 * where Δ changes sign OR |m| would overshoot gets its end tangents zeroed —
 * guaranteeing the interpolant never overshoots local data (the curve editor
 * law: no ringing between dragged points).
 */
export function evaluateCurve(pts: CurvePoint[], x: number): number {
  const p = normalizeCurvePoints(pts);
  if (p.length === 0) return clamp01(x);
  if (x <= p[0].x) return p[0].y;
  if (x >= p[p.length - 1].x) return p[p.length - 1].y;
  if (p.length === 1) return p[0].y;
  if (p.length === 2) {
    const t = (x - p[0].x) / (p[1].x - p[0].x || 1e-9);
    return p[0].y + t * (p[1].y - p[0].y); // 2 points: the chord (m = Δ both)
  }

  const n = p.length;
  const dx: number[] = [];
  const dy: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = p[i + 1].x - p[i].x;
    dy[i] = p[i + 1].y - p[i].y;
    slope[i] = dy[i] / (dx[i] > 1e-9 ? dx[i] : 1e-9);
  }
  const m: number[] = new Array(n).fill(0);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) {
      m[i] = 0; // local extremum → flat tangent (monotonicity-preserving)
    } else {
      m[i] = (slope[i - 1] + slope[i]) / 2;
    }
  }
  /* Fritsch–Carlson limiter: a tangent is safe iff |m| ≤ 3|Δ| on both sides. */
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const limit = 3 * Math.abs(slope[i]);
    if (Math.abs(m[i]) > limit) m[i] = (Math.sign(m[i]) || 1) * limit;
    if (Math.abs(m[i + 1]) > limit) m[i + 1] = (Math.sign(m[i + 1]) || 1) * limit;
  }

  let i = 0;
  while (i < n - 2 && x > p[i + 1].x) i++;
  const h = dx[i] > 1e-9 ? dx[i] : 1e-9;
  const t = (x - p[i].x) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * p[i].y + h10 * h * m[i] + h01 * p[i + 1].y + h11 * h * m[i + 1];
}

/**
 * SVG path (viewBox 0..100 square) for the editor preview — samples the
 * monotone spline at ~2px resolution and emits a polyline path.
 */
export function curvePathD(pts: CurvePoint[], samples = 100): string {
  const p = normalizeCurvePoints(pts);
  if (p.length === 0) return 'M 0 100 L 100 0';
  const STEP = 100 / samples;
  let d = '';
  for (let i = 0; i <= samples; i++) {
    const x = (i * STEP) / 100;
    const y = evaluateCurve(p, x);
    const px = (x * 100).toFixed(2);
    const py = ((1 - y) * 100).toFixed(2);
    d += `${i === 0 ? 'M' : 'L'} ${px} ${py} `;
  }
  return d.trim();
}

/**
 * Spec 08 §5.2 bake: the 256-entry per-channel LUT in DISPLAY code-value
 * domain — `lut[i] = spline(i/255) · 255`. W4c's viewer maps it back through
 * sRGB decode/encode exactly like color-layout §3.4 prescribes
 * (`lutL[i] = srgbDecode(spline(srgbEncode(i/255)))` — decode/encode cancel
 * here because the mock's control points live in display space already; the
 * viewer-side linear-domain remap stays W4c's composition step).
 */
export function bakeCurveLut(pts: CurvePoint[], n = 256): Float32Array {
  const lut = new Float32Array(n);
  for (let i = 0; i < n; i++) lut[i] = evaluateCurve(pts, i / (n - 1)) * 255;
  return lut;
}

/* ------------------------------------------------------------------ *
 * Editor operations (pure — the panel binds them to store writes)   *
 * ------------------------------------------------------------------ */

export const CURVE_ENDPOINT_LOCK = true; // endpoints move in Y only (grading law)

/** Move point i to (x,y); endpoints stay clamped to x=0 / x=1 (Y-only). */
export function moveCurvePoint(pts: CurvePoint[], i: number, x: number, y: number): CurvePoint[] {
  const p = pts.map((q) => ({ ...q }));
  if (i < 0 || i >= p.length) return p;
  if (i === 0) {
    p[0] = { x: 0, y: clamp01(y) };
  } else if (i === p.length - 1) {
    p[p.length - 1] = { x: 1, y: clamp01(y) };
  } else {
    /* interior: cannot cross neighbors (keeps x-order invariant) */
    const minX = p[i - 1].x + 0.02;
    const maxX = p[i + 1].x - 0.02;
    p[i] = { x: Math.min(maxX, Math.max(minX, clamp01(x))), y: clamp01(y) };
  }
  return p;
}

/** Insert a point at x (y = current spline value there); returns new list. */
export function insertCurvePoint(pts: CurvePoint[], x: number): { pts: CurvePoint[]; index: number } {
  const y = evaluateCurve(pts, x);
  const next = normalizeCurvePoints([...pts, { x, y }]);
  return { pts: next, index: next.findIndex((p) => Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6) };
}

/** Remove an interior point (endpoints are permanent); no-op on endpoints. */
export function removeCurvePoint(pts: CurvePoint[], i: number): CurvePoint[] {
  if (i <= 0 || i >= pts.length - 1) return pts;
  return pts.filter((_, k) => k !== i);
}

/** Nearest point index for a hit x (binary-search-free, lists are small). */
export function nearestCurvePoint(pts: CurvePoint[], x: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = Math.abs(pts[i].x - x);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
