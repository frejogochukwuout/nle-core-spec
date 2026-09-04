/* rulerTiers.ts — CapCut-style adaptive tick/label tiers (R15 T1, canonical
   ruler-utils.ts). Replaces the fixed-threshold density (labels 2/5/15 s,
   minor 1/5 s, frame ticks ≥ 110 pps) which breaks at the new 5–5000 pps
   range (5 pps: a 15 s label = 75 px < the 120 px floor; 5000 pps: a 2 s
   label = 10000 px gaps) and emits tick DOM linear in duration × zoom.

   Laws (canonical, @24 fps):
   - LABEL_FRAME_INTERVALS [2,3,5,10,15], TICK_FRAME_INTERVALS [1,2,3,5,10,15]
   - SECOND_MULTIPLIERS [1,2,3,5,10,15,30,60,120,300,600,900,1800,3600]
   - label spacing ≥ 120 px, tick spacing ≥ 18 px
   - the tick interval divides the label interval EVENLY (fallback = label)
   - labels: MM:SS at second boundaries (H:MM:SS at hours), `Xf` between
     (frames within the second, round(frac·fps))
   - virtualization: render only the ticks inside
     [scrollLeft − buffer, scrollLeft + viewportW + buffer],
     buffer = max(200, (scrollLeft + viewportW) × 0.15) */

export const FPS = 24;

export const LABEL_FRAME_INTERVALS = [2, 3, 5, 10, 15];
export const TICK_FRAME_INTERVALS = [1, 2, 3, 5, 10, 15];
export const SECOND_MULTIPLIERS = [1, 2, 3, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
export const MIN_LABEL_SPACING_PX = 120;
export const MIN_TICK_SPACING_PX = 18;
const EPS = 1e-4;

export interface RulerConfig {
  /** label interval in SECONDS */
  labelInterval: number;
  /** tick interval in SECONDS */
  tickInterval: number;
}

const pickInterval = (frameTable: number[], minSpacingPx: number, pps: number): number => {
  const pixelsPerFrame = pps / FPS;
  for (const fi of frameTable) {
    if (pixelsPerFrame * fi >= minSpacingPx) return fi / FPS;
  }
  for (const sm of SECOND_MULTIPLIERS) {
    if (pps * sm >= minSpacingPx) return sm;
  }
  return 60;
};

/** Canonical getRulerConfig: label + tick intervals, tick divides label. */
export const getRulerConfig = (pps: number): RulerConfig => {
  const labelInterval = pickInterval(LABEL_FRAME_INTERVALS, MIN_LABEL_SPACING_PX, pps);
  const initialTick = pickInterval(TICK_FRAME_INTERVALS, MIN_TICK_SPACING_PX, pps);
  const divides = (label: number, t: number) =>
    Math.abs(label % t) < EPS || Math.abs((label / t) % 1) < EPS || Math.abs(label / t - Math.round(label / t)) < EPS;
  let tickInterval = initialTick;
  if (!divides(labelInterval, initialTick)) {
    /* fix-up (canonical ensureTickDividesLabel, spacing-safe): the LARGEST
       candidate (frame intervals + second multipliers) that divides the label,
       is STRICTLY less than it, and satisfies the 18px tick-spacing floor.
       Fallback = the label interval itself (tick = label, all major). */
    const candidates = [...TICK_FRAME_INTERVALS.map((fi) => fi / FPS), ...SECOND_MULTIPLIERS];
    let best: number | null = null;
    for (const c of candidates) {
      if (c >= labelInterval - EPS) continue; // strictly less than the label
      if (!divides(labelInterval, c)) continue;
      if (c * pps < MIN_TICK_SPACING_PX - EPS) continue;
      if (best === null || c > best) best = c;
    }
    tickInterval = best ?? labelInterval;
  }
  return { labelInterval, tickInterval };
};

/** Label for a tick time: MM:SS on second boundaries, H:MM:SS at hours, `Xf` between. */
export const formatRulerLabel = (t: number): string => {
  const isSecondBoundary = Math.abs(t % 1) < EPS;
  if (isSecondBoundary) {
    const totalSec = Math.round(t);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }
  const frames = Math.round((t % 1) * FPS);
  return `${frames}f`;
};

/** A tick shows a label when it sits on the label interval grid (ε 1e-4). */
export const shouldShowLabel = (t: number, labelInterval: number): boolean => {
  const m = ((t % labelInterval) + labelInterval) % labelInterval;
  return Math.min(m, labelInterval - m) < EPS;
};

export interface RulerWindow {
  fromTick: number;
  toTick: number;
  buffer: number;
}

/**
 * Virtualization window (canonical TimelineRuler): tick index range to
 * render. `effectiveDuration = max(duration, dynamicWidth / pps)` — ticks
 * extend to fill the viewport at zoom-out (canonical law; without it the
 * ruler renders empty beyond content duration).
 */
export const getRulerWindow = (
  scrollLeft: number,
  viewportW: number,
  pps: number,
  tickInterval: number,
  duration: number,
  dynamicWidth: number,
): RulerWindow => {
  const effectiveDuration = Math.max(duration, dynamicWidth / pps);
  const tickCount = Math.floor(effectiveDuration / tickInterval) + 1;
  const buffer = Math.max(200, (scrollLeft + viewportW) * 0.15);
  const fromTick = Math.max(0, Math.floor((scrollLeft - buffer) / pps / tickInterval));
  const toTick = Math.min(tickCount - 1, Math.ceil((scrollLeft + viewportW + buffer) / pps / tickInterval));
  return { fromTick, toTick, buffer };
};

/** All tick times in the window (fromTick..toTick inclusive). */
export const tickTimes = (w: RulerWindow, tickInterval: number): number[] => {
  const out: number[] = [];
  for (let i = w.fromTick; i <= w.toTick; i++) out.push(i * tickInterval);
  return out;
};
