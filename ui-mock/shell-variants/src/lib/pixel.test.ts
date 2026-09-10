/* pixel.test.ts — R15 T1 unit pins for the canonical view math. */

import { describe, it, expect } from 'vitest';
import {
  BASE_PPS, PPS_MIN, PPS_MAX, ZOOM_BUTTON_FACTOR, DEFAULT_PPS,
  ppsToZoom, zoomToPps, zoomMinPps, zoomToSlider, sliderToZoomPps,
  snapPxToDeviceGrid, contentPaddingRatio, dynamicContentWidth,
} from './pixel';

describe('zoom domain (canonical)', () => {
  it('pps = 50 × zoom, domain [5, 5000]', () => {
    expect(BASE_PPS).toBe(50);
    expect(PPS_MIN).toBe(5);
    expect(PPS_MAX).toBe(5000);
    expect(zoomToPps(ppsToZoom(46))).toBeCloseTo(46, 10);
    expect(zoomToPps(0.1)).toBe(5);
    expect(zoomToPps(100)).toBe(5000);
  });

  it('zoom step factor is the canonical 1.7 (spec-16 §3.8 R15-1 revision)', () => {
    expect(ZOOM_BUTTON_FACTOR).toBe(1.7);
    expect(DEFAULT_PPS).toBe(46); // boot default preserved
  });
});

describe('dynamic min (spec-05 §5.2 zoom-to-fit with 25% headroom)', () => {
  it('min pps = containerW × 0.25 / duration, clamped to the zoom domain', () => {
    // 1000px viewport, 32 s content → 7.8125 pps (content = 25% of width)
    expect(zoomMinPps(1000, 32)).toBeCloseTo(7.8125, 5);
    // tiny duration floors at 1 s → 250 pps (a quarter of the viewport)
    expect(zoomMinPps(1000, 0)).toBe(250);
    // enormous duration → clamps at the static 0.1 zoom floor
    expect(zoomMinPps(1000, 1e9)).toBe(PPS_MIN);
    // no container (jsdom pre-mount) → static floor
    expect(zoomMinPps(null, 30)).toBe(PPS_MIN);
  });
});

describe('exponential slider mapping against the dynamic min', () => {
  it('slider 0 ⇔ dynamic min; slider 1 ⇔ 100× zoom; round-trips', () => {
    const min = 7.8125;
    expect(zoomToSlider(min, min)).toBe(0);
    expect(zoomToSlider(5000, min)).toBe(1);
    for (const pps of [7.8125, 12, 46, 300, 2400, 5000]) {
      const slider = zoomToSlider(pps, min);
      expect(sliderToZoomPps(slider, min)).toBeCloseTo(pps, 6);
    }
  });

  it('the 0.15 anchor threshold sits at a deterministic pps for a given min', () => {
    // canonical law: below slider 0.15 there is NO scroll anchoring
    const min = 7.8125;
    const thresholdPps = sliderToZoomPps(0.15, min);
    expect(zoomToSlider(thresholdPps - 0.01, min)).toBeLessThan(0.15);
    expect(zoomToSlider(thresholdPps + 0.01, min)).toBeGreaterThanOrEqual(0.15);
    expect(thresholdPps).toBeGreaterThan(min);
    expect(thresholdPps).toBeLessThan(46); // default zoom 46 is IN the anchor regime
  });
});

describe('device-grid snapping', () => {
  it('dpr 1 (jsdom default) is a passthrough', () => {
    expect(snapPxToDeviceGrid(123.456)).toBe(123.456);
  });
});

describe('content padding + dynamic width', () => {
  it('padding ratio interpolates 0.75 → 0.15 as slider pct → 0.2', () => {
    expect(contentPaddingRatio(0)).toBeCloseTo(0.75, 5);
    expect(contentPaddingRatio(0.1)).toBeCloseTo(0.75 - 0.6 * 0.5, 5); // halfway
    expect(contentPaddingRatio(0.2)).toBeCloseTo(0.15, 5);
    expect(contentPaddingRatio(0.9)).toBeCloseTo(0.15, 5);
  });

  it('dynamic width = max(content + padding, viewport)', () => {
    const min = 7.8125;
    // 32 s @ 46 pps = 1472 px content; slider(46, 7.8) ≈ 0.51 → padding 0.15 × 800 = 120
    const w = dynamicContentWidth(32, 46, 800, min);
    expect(w).toBeCloseTo(1472 + 120, 0);
    // zoomed way out: content 32×8 = 256 px, padding 0.15×800 → 376… wait slider
    // (8/7.8) ≈ 0.006 → padding 0.746×800 ≈ 597 → 853
    const wOut = dynamicContentWidth(32, 8, 800, min);
    // slider(8, 7.8) ≈ 0.0037 → ratio 0.739 → padding 591
    expect(wOut).toBeCloseTo(256 + 0.739 * 800, 0);
    // content wider than viewport always wins
    expect(dynamicContentWidth(600, 46, 800, min)).toBe(600 * 46 + 0.15 * 800);
  });
});
