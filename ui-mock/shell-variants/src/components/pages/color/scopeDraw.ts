/* scopeDraw.ts — R20-W4c (gap C53; color-layout §3.7 "scopes — real plots
   from the transformed image" + spec 08 §11.3 graticule). The DRAWING half
   of the scopes: pure canvas-2D painters fed by W4a's scopesMath reductions
   (waveformColumns / parade / vectorscopePoints / histogram) and
   qualifierMath.sampleMatte (the viewer's matte overlay). No DOM, no React —
   the component (ScopesDock / GradedViewerCanvas) owns the elements,
   the a11y labels and the 10fps throttle (spec 08 §11.4).

   Drawing contract (§3.7): column-histogram traces with density alpha
   `clamp(log2(1+n)/log2(1+max), 0.06, 1)` and 'lighter' composition; the
   vectorscope draws the 64×64 density grid (W4a's alpha-blend seam) in the
   same 'lighter' mode over the spec-08 §11.3 graticule (6 target boxes at
   103°/61°/−13°/−77°/−119°/167° on the 75% ring, circles 100/75/25%,
   crosshair, 123° skin-tone line). Y-axis labels use the 10-bit 0–1023
   convention over 8-bit data (×4.01 — documented, color-layout §3.7).

   R24-W5c (DESIGN-R24 §2 F4-P3 ×2): the PARADE now normalizes its three
   panels on ParadeData.sharedMax (the honest cross-channel compare —
   scopesMath computes it, the painter uses it: the same cell count draws
   the same density alpha in every panel) and draws ONE shared graticule
   axis across the full width (one 10-bit label set — the reference's
   graticule grammar, not three duplicated per-panel sets). */

import {
  densityAlpha,
  VECTORSCOPE_CIRCLES,
  VECTORSCOPE_TARGETS,
  SKIN_TONE_LINE,
  sampleMatte,
  type WaveformData,
  type ParadeData,
  type HistogramData,
  type VectorPointData,
  type QualifierParams,
} from '../../../lib/color';

/** Phosphor trace color (density-alpha'd 'lighter' accumulation). */
const TRACE = '125,255,160';
const GRATICULE = 'rgba(140,150,164,0.5)';
const GRAY_LABEL = 'rgba(160,168,178,0.75)';

/** The four scope panel kinds (the dock's TABS, D-B1). */
export type ScopeKind = 'waveform' | 'parade' | 'vectorscope' | 'histogram';

/* ------------------------------------------------------------------ *
 * Waveform / Parade — column histograms with density alpha           *
 * ------------------------------------------------------------------ */

const LABEL_10BIT = [0, 256, 512, 768, 1023];

/** y of an 8-bit level (0 = bottom) — shared by the graticule and the
    traces so the labels sit on the levels they measure. */
const yOfLevel = (h: number, level: number) => h - 1 - (level / 255) * (h - 2);

/** The 5-level graticule + its ONE 10-bit label set (color-layout §3.7:
    8-bit data maps ×4.01). R24-W5c (F4-P3): the PARADE calls this ONCE
    across the full panel width — one SHARED axis (the reference's
    graticule grammar), never a label set per channel panel; the labels
    gate on the scope being wide enough (w ≥ 200). */
function drawGraticule(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  x0: number,
  width: number,
): void {
  ctx.fillStyle = GRAY_LABEL;
  ctx.font = '9px ui-monospace, monospace';
  for (let i = 0; i < LABEL_10BIT.length; i++) {
    const y = yOfLevel(h, i * 64);
    ctx.fillStyle = 'rgba(140,150,164,0.28)';
    ctx.fillRect(x0, y, width, 1);
    if (w >= 200) {
      ctx.fillStyle = GRAY_LABEL;
      ctx.fillText(String(LABEL_10BIT[i]), x0 + 2, Math.max(8, y - 2));
    }
  }
}

/** Column-histogram traces with density alpha, normalized against
    `scaleMax` — the single panel passes its own max; the parade passes
    the SHARED max (R24-W5c F4-P3: honest cross-channel compare). */
function drawColumnHistogram(
  ctx: CanvasRenderingContext2D,
  h: number,
  data: WaveformData,
  color: string,
  x0: number,
  panelW: number,
  scaleMax: number,
): void {
  const { cols, counts } = data;
  const colW = Math.max(1, panelW / cols);
  const yOf = (level: number) => yOfLevel(h, level);
  const rowH = Math.max(1, h * 0.009); // §3.7 fillRect(x, y, 1, 1.5) at 160px native
  ctx.globalCompositeOperation = 'lighter';
  const BUCKETS = 16;
  for (let col = 0; col < cols; col++) {
    const x = x0 + col * colW;
    // run-length per quantized alpha bucket — one fillRect per level RUN
    let runLevel = -1;
    let runBucket = -1;
    const flush = (endLevel: number) => {
      if (runLevel >= 0) {
        const alpha = Math.round((runBucket / BUCKETS) * 100) / 100;
        ctx.fillStyle = `rgba(${color},${alpha})`;
        ctx.fillRect(x, yOf(runLevel), colW, yOf(endLevel) - yOf(runLevel) + rowH);
      }
    };
    const base = col * 256;
    for (let level = 0; level < 256; level++) {
      const n = counts[base + level];
      if (n <= 0) { flush(level - 1); runLevel = -1; continue; }
      const bucket = Math.round(densityAlpha(n, scaleMax) * BUCKETS);
      if (runLevel < 0) { runLevel = level; runBucket = bucket; }
      else if (bucket !== runBucket) { flush(level - 1); runLevel = level; runBucket = bucket; }
    }
    flush(255);
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** Luma waveform (BT.601, legacy graticule parity — scopesMath 'y' channel). */
export function drawWaveformScope(ctx: CanvasRenderingContext2D, w: number, h: number, data: WaveformData): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  drawGraticule(ctx, w, h, 0, w);
  drawColumnHistogram(ctx, h, data, TRACE, 0, w, data.max);
}

/** RGB Parade — three side-by-side panels on the shared max (mode 5).
 *  R24-W5c (F4-P3 ×2): ONE graticule/label axis across the full width
 *  (the panels' gridline segments were contiguous — identical pixels, one
 *  shared axis now) and every panel's density normalized on
 *  `data.sharedMax` (the scale scopesMath computes — the same count draws
 *  the same alpha in R/G/B, honest cross-channel compare). */
export function drawParadeScope(ctx: CanvasRenderingContext2D, w: number, h: number, data: ParadeData): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  drawGraticule(ctx, w, h, 0, w);
  const panelW = w / 3;
  const panels: [WaveformData, string][] = [
    [data.r, '255,107,107'],
    [data.g, '95,224,138'],
    [data.b, '90,169,255'],
  ];
  panels.forEach(([wd, color], i) => {
    drawColumnHistogram(ctx, h, wd, color, i * panelW, panelW, data.sharedMax);
  });
}

/* ------------------------------------------------------------------ *
 * Vectorscope — BT.601 density grid + spec 08 §11.3 graticule        *
 * ------------------------------------------------------------------ */

export function drawVectorscopeScope(ctx: CanvasRenderingContext2D, w: number, h: number, data: VectorPointData): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - 6;

  /* graticule (source-over — drawn UNDER the traces) */
  ctx.strokeStyle = GRATICULE;
  ctx.lineWidth = 1;
  for (const c of VECTORSCOPE_CIRCLES) {
    ctx.beginPath();
    ctx.arc(cx, cy, c * r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();
  // 6 target boxes on the 75% ring (spec 08 §11.3 angles; +V is UP)
  ctx.font = '9px ui-monospace, monospace';
  for (const t of VECTORSCOPE_TARGETS) {
    const x = cx + t.u * r;
    const y = cy - t.v * r;
    ctx.strokeStyle = GRAY_LABEL;
    ctx.strokeRect(x - 3.5, y - 3.5, 7, 7);
    ctx.fillStyle = GRAY_LABEL;
    ctx.fillText(t.label, x + 5, y + 3);
  }
  // 123° skin-tone line (spec 08 §11.3)
  ctx.strokeStyle = 'rgba(255,171,140,0.6)';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + SKIN_TONE_LINE.u * r * 0.92, cy - SKIN_TONE_LINE.v * r * 0.92);
  ctx.stroke();
  ctx.strokeStyle = GRATICULE;

  /* traces — the 64×64 density grid, density alpha, 'lighter' glow */
  const { density } = data;
  const size = density.size;
  const cell = (2 / size) * r;
  ctx.globalCompositeOperation = 'lighter';
  for (let gy = 0; gy < size; gy++) {
    for (let gx = 0; gx < size; gx++) {
      const n = density.counts[gy * size + gx];
      if (n <= 0) continue;
      const px = cx + (-1 + (gx + 0.5) * (2 / size)) * r;
      const py = cy - (1 - (gy + 0.5) * (2 / size)) * r;
      const alpha = Math.round(densityAlpha(n, density.max) * 100) / 100;
      ctx.fillStyle = `rgba(${TRACE},${alpha})`;
      ctx.fillRect(px - cell / 2, py - cell / 2, cell, cell);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

/* ------------------------------------------------------------------ *
 * Histogram — 256 bins × 3 channels, three stacked tracks           *
 * ------------------------------------------------------------------ */

export function drawHistogramScope(ctx: CanvasRenderingContext2D, w: number, h: number, data: HistogramData): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const tracks: ['r' | 'g' | 'b', string][] = [
    ['r', '255,107,107'],
    ['g', '95,224,138'],
    ['b', '90,169,255'],
  ];
  const colW = Math.max(1, w / 256);
  tracks.forEach(([ch, color], i) => {
    const bins = data[ch];
    const trackTop = (i * h) / 3 + 2;
    const trackH = h / 3 - 4;
    const bottom = trackTop + trackH;
    // base line (the track's zero axis)
    ctx.fillStyle = 'rgba(140,150,164,0.25)';
    ctx.fillRect(0, bottom, w, 1);
    for (let bin = 0; bin < 256; bin++) {
      const n = bins[bin];
      if (n <= 0) continue;
      const barH = Math.max(1, (n / Math.max(1, data.max)) * trackH);
      const top = bottom - barH;
      // fill + stroke line (the §3.7 fills+strokes contract): body at 0.55,
      // a 1px top line at 0.95 per bin
      ctx.fillStyle = `rgba(${color},0.55)`;
      ctx.fillRect(bin * colW, top, colW, barH);
      ctx.fillStyle = `rgba(${color},0.95)`;
      ctx.fillRect(bin * colW, top, colW, 1);
    }
  });
}

/* ------------------------------------------------------------------ *
 * The qualifier matte overlay (C54) — green-tinted selected pixels   *
 * ------------------------------------------------------------------ */

/** Matte overlay green (the classic keyer tint). */
export const MATTE_GREEN = '46,230,90';

/**
 * `drawQualifierMatte(ctx, img, p)` — overlay the qualifier's mask on the
 * CURRENT graded display buffer (what the user sees — Resolve behavior,
 * color-layout §3.4): W4a's `sampleMatte` stride-samples the mask and this
 * paints each grid cell green at alpha = mask. Called AFTER the graded
 * putImageData while qualifierPreviewOn (view-state); the record's own
 * showMask flag keeps driving the pipeline-level grayscale matte.
 */
export function drawQualifierMatte(ctx: CanvasRenderingContext2D, img: ImageData, p: QualifierParams): void {
  const grid = sampleMatte(img.data, img.width, img.height, p);
  const { cols, rows, stride, masks } = grid;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const m = masks[row * cols + col];
      if (m < 0.02) continue; // sub-2% selected — invisible tint, skip
      const x = Math.min(col * stride, img.width - 1);
      const y = Math.min(row * stride, img.height - 1);
      ctx.fillStyle = `rgba(${MATTE_GREEN},${Math.round(m * 100) / 100})`;
      ctx.fillRect(x, y, stride, stride);
    }
  }
}
