/* pixel.ts — canonical timeline view math (R15 T1, ported from
   opencut-timeline `src/lib/timeline/view/` + `components/layout.ts`).

   The single source of truth for zoom/scale/geometry constants. Previously
   these lived (duplicated, divergent) in useUiStore (8–240), TimelineToolbar
   (its own copy + log map), useShortcuts (DEFAULT_PPS) and two contentW
   formulas (Timeline + Ruler). Everything now imports from here.

   Laws (canonical):
   - BASE_PPS = 50; pps = 50 × zoom; zoom ∈ [0.1, 100] → pps ∈ [5, 5000]
   - zoom step factor 1.7 (spec-16 §3.8 revision R15-1: 1.5 → 1.7 canonical)
   - dynamic min zoom = zoom-to-fit with headroom: content occupies 25% of
     the viewport at the slider bottom (spec-05 §5.2 normative)
   - zoom slider mapping is EXPONENTIAL against the DYNAMIC min
   - two-regime anchor threshold: slider percent 0.15 (spec-05 §5.2)
   - device-grid rounding: round(px·dpr)/dpr — sub-pixel alignment
   - content padding: 0.75 → 0.15 of the container width as slider pct → 0.2 */

export const BASE_PPS = 50;
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 100;
/** pps bounds derived from the zoom domain (5 .. 5000 px/s). */
export const PPS_MIN = BASE_PPS * ZOOM_MIN;
export const PPS_MAX = BASE_PPS * ZOOM_MAX;
/** Toolbar/keyboard zoom step factor (canonical TIMELINE_ZOOM_BUTTON_FACTOR). */
export const ZOOM_BUTTON_FACTOR = 1.7;
/** Store boot default (unchanged — fixture look preserved). */
export const DEFAULT_PPS = 46;

/** Playhead line width (canonical: 2px, center-aligned). */
export const PLAYHEAD_LINE_PX = 2;
/** Content padding ratios (canonical zoom-utils). */
export const PADDING_MAX_RATIO = 0.75;
export const PADDING_MIN_RATIO = 0.15;
export const PADDING_MIN_AT_ZOOM_PERCENT = 0.2;
/** Two-regime anchor threshold (slider percent, spec-05 §5.2 / DECISIONS #17). */
export const ZOOM_ANCHOR_PLAYHEAD_THRESHOLD = 0.15;
/** Plain-wheel horizontal step clamp (canonical TIMELINE_HORIZONTAL_WHEEL_STEP_PX). */
export const HORIZONTAL_WHEEL_STEP_PX = 40;
/** Wheel-zoom: normalized delta cap + exponential factor divisor. */
export const WHEEL_DELTA_CAP = 30;
export const WHEEL_FACTOR_DIVISOR = 300;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const ppsToZoom = (pps: number) => pps / BASE_PPS;
export const zoomToPps = (zoom: number) => zoom * BASE_PPS;

/**
 * Dynamic minimum zoom — zoom-to-fit with headroom: at the slider bottom the
 * content occupies 25% of the container width (canonical getTimelineZoomMin /
 * spec-05 §5.2 "dynamic, recomputed per content"; the 0.1 floor is the static
 * escape hatch). Returns PPS (the store's zoom scalar).
 */
export const zoomMinPps = (containerW: number | null, durationSec: number): number => {
  if (!containerW) return PPS_MIN;
  const safeDur = Math.max(durationSec, 1);
  const fit = (containerW * 0.25) / safeDur; // pps at which content = 25% of W
  return clamp(fit, PPS_MIN, PPS_MAX);
};

/**
 * Exponential slider mapping against the DYNAMIC min (canonical sliderToZoom /
 * zoomToSlider). slider ∈ [0,1]; slider 0 ⇔ dynamicMin; slider 1 ⇔ 100×zoom.
 * The R15-C1 critique: measuring the 0.15 anchor threshold against a
 * fixed-min mapping silently changes its meaning — so every consumer maps
 * through here with the SAME dynamic min.
 */
export const zoomToSlider = (pps: number, minPps: number): number => {
  const z = clamp(pps / BASE_PPS, ZOOM_MIN, ZOOM_MAX);
  const zMin = clamp(minPps / BASE_PPS, ZOOM_MIN, ZOOM_MAX);
  if (zMin >= ZOOM_MAX) return 1;
  return clamp(Math.log(z / zMin) / Math.log(ZOOM_MAX / zMin), 0, 1);
};

export const sliderToZoomPps = (slider: number, minPps: number): number => {
  const zMin = clamp(minPps / BASE_PPS, ZOOM_MIN, ZOOM_MAX);
  return clamp(zMin * Math.pow(ZOOM_MAX / zMin, clamp(slider, 0, 1)), ZOOM_MIN, ZOOM_MAX) * BASE_PPS;
};

/**
 * Device-grid snapping (canonical snapPixelToDeviceGrid): round to the
 * physical pixel grid so 1-frame clips / ticks land on crisp edges.
 * jsdom (dpr 1) is a no-op by construction.
 */
export const snapPxToDeviceGrid = (px: number): number => {
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
  if (dpr === 1) return px;
  return Math.round(px * dpr) / dpr;
};

/** Content padding ratio at a given slider percent (canonical 0.75 → 0.15). */
export const contentPaddingRatio = (sliderPct: number): number => {
  if (sliderPct >= PADDING_MIN_AT_ZOOM_PERCENT) return PADDING_MIN_RATIO;
  const t = sliderPct / PADDING_MIN_AT_ZOOM_PERCENT;
  return PADDING_MAX_RATIO + (PADDING_MIN_RATIO - PADDING_MAX_RATIO) * t;
};

/**
 * Dynamic content width (canonical dynamicTimelineWidth): content px + a
 * padding margin that shrinks as you zoom out (75% → 15% of the viewport),
 * floored at the viewport width so there is always scroll room.
 */
export const dynamicContentWidth = (
  durationSec: number,
  pps: number,
  viewportW: number,
  minPps: number,
): number => {
  const sliderPct = zoomToSlider(pps, minPps);
  const padding = contentPaddingRatio(sliderPct) * viewportW;
  return Math.max(durationSec * pps + padding, viewportW);
};
