/* curveMath.ts — R20-W4b (DESIGN-R20 D3 / gap C55, the Curves tab) →
   R24-W2 (DESIGN-R24 §1.2 A2-R4, issue #69 — the YRGB rebuild).
   The curve POINTS + per-channel spline evaluation. Pure, DOM-free.

   THE YRGB MODEL (A2-R4): four independent channels — Y (luma) + R/G/B —
   "the default 'custom' curves let you adjust red, green, blue and
   luminance curves independently" (BMD). The Y curve applies to ALL THREE
   rgb channels composed with each channel's own curve (y∘r / y∘g / y∘b —
   gradedFrame.bakeLinearCurveLuts owns the composition order); R/G/B
   curves shape their own channel alone.

   THE STORAGE SEAM (the R24-W2 reconstruction's one recorded conflict —
   see the worklog): the contract's CurveSet = { y, r, g, b } cannot be
   stored under those keys because useUiStore is FROZEN this wave and its
   three copy sites (cloneGrades / mergeGrade / addColorStill) round-trip
   `curves` as `{ master: points.map(p => ({ ...p })) }` — a four-key set
   would not compile (strict null checks on `.master`) and any data
   outside `master` is DESTROYED by the merge/clone. The closest faithful
   alternative: `master` stays the storage key and carries the points of
   ALL FOUR channels, each point tagged with its channel (`ch`; untagged =
   'y' — every legacy master-curve record, story fixture and seed stays a
   valid Y curve). The point-level spread copies in the store keep the
   tags, so per-channel curves round-trip setGrade / undo / redo / still
   capture verbatim. The four-channel VIEW over that storage is
   CurveChannels + splitChannels/joinChannels (below).

   THE SEAM SPLIT (noted for W4c): W4a's gradeMath (spec 08 §4.2
   WheelsParams) has NO curves field — spec 08 §5 keeps curves as a
   separate 256×1-per-channel LUT baked at edit time. This module owns:
     · the point model (CurveSet) stored in the mock's grade record
       (useUiStore.MockGrade = GradeParams & { curves?: CurveSet });
     · the monotone piecewise-cubic interpolation (Fritsch–Carlson, no
       overshoot — the grading-curve law) used by the editor's preview
       path;
     · bakeCurveLut — the spec 08 §5.2 256-entry bake in DISPLAY
       code-value domain (gradedFrame.bakeLinearCurveLuts is the LINEAR
       twin the viewer composes right after the §4.2 pass).
   */

/** The four curve channels (A2-R4): Y = luma, R/G/B = per-channel. */
export type CurveChannel = 'y' | 'r' | 'g' | 'b';

export const CURVE_CHANNELS: readonly CurveChannel[] = ['y', 'r', 'g', 'b'];

/** One control point — x/y both 0..1 (display code-value domain, spec 08
 *  §5). `ch` tags the owning channel when the set carries per-channel
 *  curves; UNDEFINED = 'y' (the legacy master-curve shape — every
 *  pre-YRGB record, story fixture and store round-trip is a Y curve). */
export interface CurvePoint {
  x: number;
  y: number;
  ch?: CurveChannel;
}

/** One channel's control points (sorted by x). */
export type Curve = CurvePoint[];

/** The curve set stored in a grade record. STORAGE LAW: `master` carries
 *  the tagged points of ALL FOUR channels (the store's frozen copy sites
 *  round-trip exactly this key — see the header). Absent/empty = every
 *  channel identity. */
export interface CurveSet {
  master: Curve;
}

/** Neutral identity curve (spec 08 §5.2: identity when untouched) — the
 *  Y channel's two endpoints; R/G/B absent (absent = identity). */
export const DEFAULT_CURVE: CurveSet = {
  master: [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ],
};

/** The identity pair for ONE channel (a fresh copy every call — callers
 *  may treat it as their working buffer). */
export function identityChannel(): Curve {
  return [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ];
}

/** The four-channel working view over a CurveSet (A2-R4's {y,r,g,b}). */
export interface CurveChannels {
  y: Curve;
  r: Curve;
  g: Curve;
  b: Curve;
}

/** Split the storage into the four channels (LEGACY untagged points = the
 *  y channel; absent channels = empty lists). Order is canonical: y, r,
 *  g, b, each sorted by x; the channel tag rides along on the split
 *  points (r/g/b keep theirs; y points stay untagged). */
export function splitChannels(set: CurveSet | undefined): CurveChannels {
  const out: CurveChannels = { y: [], r: [], g: [], b: [] };
  for (const p of set?.master ?? []) {
    const chOf = p.ch ?? 'y';
    (out[chOf] as CurvePoint[]).push({ x: clamp01(p.x), y: clamp01(p.y), ...(chOf === 'y' ? {} : { ch: chOf }) });
  }
  for (const ch of CURVE_CHANNELS) (out[ch] as CurvePoint[]).sort((a, b) => a.x - b.x);
  return out;
}

/** Join the four channels back into the storage set (canonical order:
 *  y, r, g, b, each sorted by x — equal content always serializes
 *  identically so the store's JSON no-op guard stays faithful). */
export function joinChannels(ch: CurveChannels): CurveSet {
  const master: CurvePoint[] = [];
  for (const c of CURVE_CHANNELS) {
    const pts = (ch[c] as CurvePoint[]).map((p) => ({ x: clamp01(p.x), y: clamp01(p.y), ...(c === 'y' ? {} : { ch: c }) }));
    pts.sort((a, b) => a.x - b.x);
    master.push(...pts);
  }
  return { master };
}

/** The stored points of ONE channel, or the identity pair when the
 *  channel is absent (the editor always shows two endpoints). */
export function channelCurve(set: CurveSet | undefined, ch: CurveChannel): Curve {
  const pts = splitChannels(set)[ch];
  return pts.length > 0 ? pts : identityChannel();
}

/** Rebuild the storage with ONE channel replaced (absent/empty pts =
 *  that channel identity — removed from storage). The incoming points are
 *  CANONICALIZED to the channel: r/g/b points get (re)tagged, y points
 *  are stored untagged — so the editor can hand the UNTAGGED identity pair
 *  of an absent channel without the tags silently dropping its points. */
export function withChannelCurve(set: CurveSet | undefined, ch: CurveChannel, pts: Curve): CurveSet {
  const channels = splitChannels(set);
  channels[ch] = pts.map((p) => ({ x: clamp01(p.x), y: clamp01(p.y), ...(ch === 'y' ? {} : { ch }) }));
  return joinChannels(channels);
}

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** True when ONE channel's list is the untouched identity (absent or the
 *  2-point diagonal — a bent 2-point curve or a 3-point list is NOT). */
export function isIdentityChannel(pts: Curve | undefined): boolean {
  if (!pts || pts.length === 0) return true;
  if (pts.length !== 2) return false;
  const [a, b] = pts;
  return Math.abs(a.x) < 1e-6 && Math.abs(a.y) < 1e-6 && Math.abs(b.x - 1) < 1e-6 && Math.abs(b.y - 1) < 1e-6;
}

/** True when the whole set is the untouched identity (no record needed). */
export function isIdentityCurve(c: CurveSet | undefined): boolean {
  if (!c || c.master.length === 0) return true;
  const ch = splitChannels(c);
  return CURVE_CHANNELS.every((k) => isIdentityChannel(ch[k]));
}

/** Sort + clamp a point list into canonical form (x ascending, y clamped). */
export function normalizeCurvePoints(pts: CurvePoint[]): CurvePoint[] {
  return [...pts]
    .map((p) => ({ x: clamp01(p.x), y: clamp01(p.y), ...(p.ch ? { ch: p.ch } : {}) }))
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
 * domain — `lut[i] = spline(i/255) · 255`. gradedFrame.bakeLinearCurveLuts
 * is the LINEAR-domain twin the viewer composes after the §4.2 pass.
 */
export function bakeCurveLut(pts: CurvePoint[], n = 256): Float32Array {
  const lut = new Float32Array(n);
  for (let i = 0; i < n; i++) lut[i] = evaluateCurve(pts, i / (n - 1)) * 255;
  return lut;
}

/* ------------------------------------------------------------------ *
 * Editor operations (pure — the panel binds them to store writes)   *
 * ------------------------------------------------------------------ */

export const CURVE_ENDPOINT_LOCK = true; // endpoints move in Y only (grading law, per channel)

/** Move point i to (x,y); endpoints stay clamped to x=0 / x=1 (Y-only). */
export function moveCurvePoint(pts: CurvePoint[], i: number, x: number, y: number): CurvePoint[] {
  const p = pts.map((q) => ({ ...q }));
  if (i < 0 || i >= p.length) return p;
  if (i === 0) {
    p[0] = { x: 0, y: clamp01(y), ...(p[0].ch ? { ch: p[0].ch } : {}) };
  } else if (i === p.length - 1) {
    p[p.length - 1] = { x: 1, y: clamp01(y), ...(p[p.length - 1].ch ? { ch: p[p.length - 1].ch } : {}) };
  } else {
    /* interior: cannot cross neighbors (keeps x-order invariant) */
    const minX = p[i - 1].x + 0.02;
    const maxX = p[i + 1].x - 0.02;
    p[i] = { x: Math.min(maxX, Math.max(minX, clamp01(x))), y: clamp01(y), ...(p[i].ch ? { ch: p[i].ch } : {}) };
  }
  return p;
}

/** Insert a point at x (y = current spline value there); returns new list.
 *  The caller owns the channel tag — insertCurvePointOnChannel (below) is
 *  the tagged convenience. */
export function insertCurvePoint(pts: CurvePoint[], x: number): { pts: CurvePoint[]; index: number } {
  const y = evaluateCurve(pts, x);
  const next = normalizeCurvePoints([...pts, { x, y }]);
  return { pts: next, index: next.findIndex((p) => Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6) };
}

/** Tagged insert: a point minted on channel `ch` (y = the channel's own
 *  spline value at x). Untagged channels ('y') stay untagged in storage. */
export function insertCurvePointOnChannel(pts: CurvePoint[], ch: CurveChannel, x: number): { pts: CurvePoint[]; index: number } {
  const { pts: next, index } = insertCurvePoint(pts, x);
  if (index >= 0 && ch !== 'y') {
    const copy = next.map((p) => ({ ...p }));
    copy[index] = { ...copy[index], ch };
    return { pts: copy, index };
  }
  return { pts: next, index };
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
