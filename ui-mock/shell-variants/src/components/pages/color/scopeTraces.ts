/* scopeTraces — R19-B4 deterministic scope rendering (color-cluster.md §4).
   Port of the color_grading_scopes.html canvas draw functions, with the
   random draws replaced by DETERMINISTIC seeded trace buffers: each scope
   hashes its name FNV-1a style into a seed, runs a mulberry32 PRNG, and
   materializes its strokes/curves ONCE at module load in normalized (0..1)
   coordinates — so redraws (resize, re-mount, story switches) are pixel-
   identical and screenshots are stable. Drawing maps normalized coords to
   the live canvas size (DPR-scaled ctx).
   Colors read the R19-B4 --scope-* tokens at draw time (with reference
   fallbacks), so the graticules/labels stay token-driven.
   Pure display data: no engine, no interactivity (role="img" upstream).
   R19-TODO(orchestrator): hover crosshair readouts land with the render
   round — do not fake them. */

/* ---------- seeded randomness (FNV-1a → mulberry32) ---------- */

/** FNV-1a 32-bit hash of a string → seed. */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 PRNG — deterministic 0..1 floats from an integer seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- tokens (with reference fallbacks) ---------- */

function cssVar(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

const scopeColors = () => ({
  text: cssVar('--scope-text', '#c29d38'),
  grid: cssVar('--scope-grid', '#3a2e12'),
  gridDim: cssVar('--scope-grid-dim', '#261f0d'),
});

const SCOPE_FONT = '10px Inter, system-ui, sans-serif';
const RGB_TRACE = ['#ff3333', '#33ff33', '#4444ff'];

/* ---------- trace buffers (normalized, built once per module) ---------- */

/** one density stroke: x/y/h normalized to the graph box, alpha 0..1 */
interface DensityStroke {
  x: number;
  y: number;
  h: number;
  a: number;
}

const N_DENSITY = 200;
const STROKES_PER_PT = 60;

function paradeShape(nx: number, ch: 0 | 1 | 2): number {
  if (ch === 0) {
    return Math.sin(nx * Math.PI) * 0.4 + (nx > 0.7 && nx < 0.9 ? Math.sin((nx - 0.7) * 5 * Math.PI) ** 2 * 0.5 : 0);
  }
  if (ch === 1) {
    return Math.sin(nx * Math.PI) ** 1.5 * 0.7;
  }
  return Math.sin(nx * Math.PI) ** 2 * 0.6 + (nx > 0.5 && nx < 0.8 ? 0.3 : 0) + (nx > 0.85 ? 0.2 : 0);
}

function buildParade(): DensityStroke[][] {
  const rand = mulberry32(fnv1a('scope-parade'));
  return ([0, 1, 2] as const).map((ch) => {
    const out: DensityStroke[] = [];
    for (let i = 0; i < N_DENSITY; i++) {
      const nx = i / (N_DENSITY - 1);
      const base = paradeShape(nx, ch);
      for (let k = 0; k < STROKES_PER_PT; k++) {
        const v = Math.min(1, Math.max(0.02, base + (rand() - 0.5) * 0.2));
        out.push({ x: nx + (rand() - 0.5) * 0.004, y: 1 - v, h: 0.03 + rand() * 0.1, a: 0.02 + rand() * 0.13 });
      }
    }
    return out;
  });
}

function waveformShape(nx: number, ch: 0 | 1 | 2): number {
  if (ch === 0) return Math.sin(nx * Math.PI * 1.5) ** 2 * 0.5 + 0.1;
  if (ch === 1) return Math.sin((nx + 0.2) * Math.PI) ** 2 * 0.6 + 0.1;
  return Math.sin((nx - 0.1) * Math.PI) ** 2 * 0.7;
}

function buildWaveform(): { density: DensityStroke[][]; spike: { x: number; y: number; h: number; k: 0 | 1 | 2 }[] } {
  const rand = mulberry32(fnv1a('scope-waveform'));
  const density = ([0, 1, 2] as const).map((ch) => {
    const out: DensityStroke[] = [];
    for (let i = 0; i < 240; i++) {
      const nx = i / 239;
      const base = waveformShape(nx, ch);
      for (let k = 0; k < 40; k++) {
        const v = Math.min(1, Math.max(0.02, base + (rand() - 0.5) * 0.18));
        out.push({ x: nx + (rand() - 0.5) * 0.004, y: 1 - v, h: 0.03 + rand() * 0.09, a: 0.02 + rand() * 0.13 });
      }
    }
    return out;
  });
  /* right-side bright clip/specular spike at x≈0.85 (ref §4.5) */
  const spike: { x: number; y: number; h: number; k: 0 | 1 | 2 }[] = [];
  for (let i = 0; i < 300; i++) {
    const bright = rand() < 0.2;
    spike.push({
      x: 0.85 + (rand() - 0.5) * 0.05,
      y: rand(),
      h: bright ? 0.05 : 0.2,
      k: bright ? 2 : rand() < 0.5 ? 0 : 1,
    });
  }
  return { density, spike };
}

/** skin-tone-line trace: 150 quadratic curves off center toward top-left
    (px offsets at the reference's r≈90, scaled at draw time) */
interface VectorCurve {
  cx: number;
  cy: number;
  ex: number;
  ey: number;
  lw: number;
}

function buildVector(): VectorCurve[] {
  const rand = mulberry32(fnv1a('scope-vectorscope'));
  const out: VectorCurve[] = [];
  for (let i = 0; i < 150; i++) {
    out.push({
      cx: -30 + (rand() - 0.5) * 40,
      cy: -30 + (rand() - 0.5) * 40,
      ex: -70 + (rand() - 0.5) * 30,
      ey: -60 + (rand() - 0.5) * 30,
      lw: 1 + rand() * 2,
    });
  }
  return out;
}

/** histogram: 3 channel curves, 256 samples, 0..0.9 of track height */
function buildHistogram(): number[][] {
  const rand = mulberry32(fnv1a('scope-histogram'));
  const N = 256;
  const shape = (nx: number, ch: 0 | 1 | 2): number => {
    let v = 0;
    if (ch === 0) {
      v = nx < 0.15 ? 0.9 : Math.max(0, 0.9 * (1 - (nx - 0.15) / 0.45));
    } else if (ch === 1) {
      v = nx < 0.3 ? 0.7 : Math.max(0, 0.7 * (1 - (nx - 0.3) / 0.4));
    } else {
      v = nx < 0.15 ? 0.6 : nx < 0.5 ? 0.4 : Math.max(0, 0.4 * (1 - (nx - 0.5) / 0.3));
      v += 0.25 * Math.exp(-(((nx - 0.5) / 0.08) ** 2));
    }
    return Math.max(0, Math.min(0.9, v * 0.9 + (rand() - 0.5) * 0.05));
  };
  return ([0, 1, 2] as const).map((ch) => Array.from({ length: N }, (_, i) => shape(i / (N - 1), ch)));
}

const PARADE = buildParade();
const WAVEFORM = buildWaveform();
const VECTOR = buildVector();
const HISTOGRAM = buildHistogram();

/* ---------- draw functions (live-size mapping) ---------- */

const MARGIN_PW = { top: 20, right: 10, bottom: 20, left: 40 }; // parade + waveform

/** shared Y axis for parade/waveform: gold labels 1023..0, dotted graticules,
    31 bottom ticks (ref §4.4) */
function drawYAxis(ctx: CanvasRenderingContext2D, w: number, h: number, m: typeof MARGIN_PW): void {
  const { text, grid } = scopeColors();
  const gw = w - m.left - m.right;
  const gh = h - m.top - m.bottom;
  const labels = [1023, 896, 768, 640, 512, 384, 256, 128, 0];
  ctx.font = SCOPE_FONT;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 1;
  labels.forEach((lab, i) => {
    const y = m.top + (i / (labels.length - 1)) * gh;
    ctx.fillStyle = text;
    ctx.fillText(String(lab), m.left - 8, y);
    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = grid;
    ctx.beginPath();
    ctx.moveTo(m.left, y);
    ctx.lineTo(m.left + gw, y);
    ctx.stroke();
    ctx.restore();
  });
  ctx.strokeStyle = grid;
  for (let i = 0; i <= 30; i++) {
    const x = m.left + (i / 30) * gw;
    ctx.beginPath();
    ctx.moveTo(x, m.top + gh);
    ctx.lineTo(x, m.top + gh + 4);
    ctx.stroke();
  }
}

/** Parade — 3 RGB side-by-side column traces, composite 'lighter' (ref §4.4) */
export function drawParade(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const m = MARGIN_PW;
  const gw = w - m.left - m.right;
  const gh = h - m.top - m.bottom;
  drawYAxis(ctx, w, h, m);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const colW = gw / 3;
  PARADE.forEach((strokes, ch) => {
    ctx.fillStyle = RGB_TRACE[ch];
    const colX = m.left + ch * colW;
    for (const s of strokes) {
      ctx.globalAlpha = s.a;
      ctx.fillRect(colX + s.x * colW, m.top + s.y * gh, 1.5, Math.max(2, s.h * gh));
    }
  });
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Waveform — RGB density across the full width + right-side bright spike */
export function drawWaveform(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const m = MARGIN_PW;
  const gw = w - m.left - m.right;
  const gh = h - m.top - m.bottom;
  drawYAxis(ctx, w, h, m);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  WAVEFORM.density.forEach((strokes, ch) => {
    ctx.fillStyle = RGB_TRACE[ch];
    for (const s of strokes) {
      ctx.globalAlpha = s.a;
      ctx.fillRect(m.left + s.x * gw, m.top + s.y * gh, 1.5, Math.max(2, s.h * gh));
    }
  });
  for (const sp of WAVEFORM.spike) {
    if (sp.k === 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.globalAlpha = 1;
      ctx.fillRect(m.left + sp.x * gw, m.top + sp.y * gh, 2, Math.max(3, sp.h * gh));
    } else {
      ctx.fillStyle = sp.k === 0 ? 'rgba(200,200,255,0.2)' : 'rgba(255,100,100,0.1)';
      ctx.globalAlpha = 1;
      ctx.fillRect(m.left + sp.x * gw, m.top + sp.y * gh, 1, Math.max(3, sp.h * gh));
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** Vectorscope — circle + 10° ticks (90° gold) + 6 bracket targets at the
    reference angles + skin-tone-line trace + bright center dot (ref §4.6) */
export function drawVectorscope(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const { text, grid, gridDim } = scopeColors();
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(cx, cy) * 0.8;
  const scale = r / 90; // buffer offsets were baked at reference r≈90

  ctx.lineWidth = 1;
  ctx.strokeStyle = grid;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = gridDim;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
  ctx.stroke();
  /* full-length crosshairs */
  ctx.strokeStyle = grid;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();

  /* ticks every 10°: major (90°) gold + longer, medium (30°), minor */
  for (let d = 0; d < 360; d += 10) {
    const rad = (d * Math.PI) / 180;
    const major = d % 90 === 0;
    const medium = d % 30 === 0;
    const inner = major ? r - 15 : medium ? r - 10 : r - 5;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    ctx.strokeStyle = major ? text : grid;
    ctx.beginPath();
    ctx.moveTo(cx + cos * inner, cy + sin * inner);
    ctx.lineTo(cx + cos * r, cy + sin * r);
    ctx.stroke();
  }

  /* 6 bracket targets: R M B C G Y at −105°, −45°, 15°, 75°, 135°, 195° */
  const targets: { a: number; l: string }[] = [
    { a: -105, l: 'R' },
    { a: -45, l: 'M' },
    { a: 15, l: 'B' },
    { a: 75, l: 'C' },
    { a: 135, l: 'G' },
    { a: 195, l: 'Y' },
  ];
  ctx.font = SCOPE_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of targets) {
    const rad = (t.a * Math.PI) / 180;
    const dist = 0.7 * r;
    const px = cx + Math.cos(rad) * dist;
    const py = cy + Math.sin(rad) * dist;
    /* 4 corner brackets, size 6, line 3 */
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    const B = 6;
    const L = 3;
    const corners: [number, number, number, number][] = [
      [px - B, py - B, 1, 1],
      [px + B, py - B, -1, 1],
      [px - B, py + B, 1, -1],
      [px + B, py + B, -1, -1],
    ];
    for (const [x, y, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * L);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * L, y);
      ctx.stroke();
    }
    /* label — grid color (NOT gold — ref preserves the distinction) */
    ctx.fillStyle = grid;
    ctx.fillText(t.l, cx + Math.cos(rad) * (dist - 18), cy + Math.sin(rad) * (dist - 18));
  }

  /* skin-tone-line trace: screen-composited quadratic curves, gradient stroke */
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const c of VECTOR) {
    const ex = c.ex * scale * 1.6;
    const ey = c.ey * scale * 1.6;
    const cxs = c.cx * scale * 1.6;
    const cys = c.cy * scale * 1.6;
    const g = ctx.createLinearGradient(cx, cy, cx + ex, cy + ey);
    g.addColorStop(0, 'rgba(255,255,255,0.4)');
    g.addColorStop(0.3, 'rgba(255,180,120,0.15)');
    g.addColorStop(1, 'rgba(200,100,50,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = c.lw;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + cxs, cy + cys, cx + ex, cy + ey);
    ctx.stroke();
  }
  ctx.restore();

  /* bright center dot */
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();
}

/** Histogram — 3 stacked RGB tracks, 0..1023 labels on TOP (ref §4.7) */
export function drawHistogram(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const { text, grid } = scopeColors();
  const m = { top: 20, right: 20, bottom: 10, left: 20 };
  const gw = w - m.left - m.right;
  const gh = h - m.top - m.bottom;

  ctx.font = SCOPE_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const x = m.left + (i / 10) * gw;
    const label = i === 10 ? 1023 : i * 102;
    ctx.fillStyle = text;
    ctx.fillText(String(label), x, m.top - 5);
    ctx.strokeStyle = text;
    ctx.beginPath();
    ctx.moveTo(x, m.top - 18);
    ctx.lineTo(x, m.top - 15);
    ctx.stroke();
    ctx.strokeStyle = grid;
    ctx.beginPath();
    ctx.moveTo(x, m.top);
    ctx.lineTo(x, m.top + gh);
    ctx.stroke();
  }

  const fills = ['rgba(120,30,30,0.7)', 'rgba(30,120,30,0.7)', 'rgba(30,70,140,0.7)'];
  const strokes = ['#ff4444', '#44ff44', '#4488ff'];
  const trackH = gh / 3;
  HISTOGRAM.forEach((curve, t) => {
    const yBase = m.top + (t + 1) * trackH;
    const N = curve.length;
    ctx.beginPath();
    ctx.moveTo(m.left, yBase);
    for (let i = 0; i < N; i++) {
      const x = m.left + (i / (N - 1)) * gw;
      ctx.lineTo(x, yBase - curve[i] * trackH);
    }
    ctx.lineTo(m.left + gw, yBase);
    ctx.closePath();
    ctx.fillStyle = fills[t];
    ctx.fill();
    ctx.strokeStyle = strokes[t];
    ctx.lineWidth = 1.5;
    ctx.stroke();
    /* track bottom separator */
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(m.left, yBase);
    ctx.lineTo(m.left + gw, yBase);
    ctx.stroke();
  });
}
