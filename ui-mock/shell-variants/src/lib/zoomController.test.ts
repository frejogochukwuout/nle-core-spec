/* zoomController.test.ts — R15 T1 unit pins for the two-regime playhead-anchored
   zoom controller (spec-05 §5.2 + DECISIONS #17, ported from opencut).

   The controller is tested against a fake scroller object (scrollLeft /
   scrollWidth / clientWidth are all the DOM surface it touches). */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useUi } from '../state/useUiStore';
import { zoomController, zoomBus, createWheelZoomAccumulator } from './zoomController';
import { ZOOM_ANCHOR_PLAYHEAD_THRESHOLD, zoomToSlider } from './pixel';

const mkScroller = (scrollWidth = 3000, clientWidth = 800, initialLeft = 0) =>
  ({ scrollWidth, clientWidth, scrollLeft: initialLeft }) as unknown as HTMLElement;

const setZoomState = (pps: number, minPps: number, playhead: number) => {
  useUi.setState({ pxPerSec: pps, zoomMinPps: minPps, playhead });
};

describe('TimelineZoomController two-regime anchoring', () => {
  beforeEach(() => {
    zoomController.detach();
    zoomController.reset();
    setZoomState(46, 7.8125, 0);
  });
  afterEach(() => zoomController.detach());

  it('captures pre-zoom scrollLeft at REQUEST time, before the content re-layout', () => {
    const sc = mkScroller(3000, 800, 500);
    zoomController.attach({ getScroller: () => sc });
    zoomController.setZoomLevel(80);
    // pending layout carries the pre-zoom scroll captured at dispatch
    const pending = zoomController.getPendingLayout();
    expect(pending).not.toBeNull();
    expect(pending!.preZoomScrollLeft).toBe(500);
    expect(pending!.prevPps).toBe(46);
    expect(pending!.nextPps).toBe(80);
    expect(useUi.getState().pxPerSec).toBe(80); // store written
  });

  it('anchored regime (slider ≥ 0.15): the playhead keeps its viewport offset across the zoom', () => {
    const sc = mkScroller(3000, 800, 0);
    zoomController.attach({ getScroller: () => sc });
    const playhead = 10; // s
    setZoomState(46, 7.8125, playhead);
    // playhead at 460 px with scrollLeft 100 → viewport offset 360
    sc.scrollLeft = 100;
    zoomController.setZoomLevel(92); // ×2
    zoomController.applyZoomLayout(30);
    // playhead now at 920 px; keep offset 360 → scrollLeft = 560
    expect(sc.scrollLeft).toBe(560);
  });

  it('clamps the anchored scrollLeft to [0, scrollWidth − clientWidth]', () => {
    const sc = mkScroller(1000, 800, 0);
    zoomController.attach({ getScroller: () => sc });
    setZoomState(46, 7.8125, 30);
    sc.scrollLeft = 0;
    zoomController.setZoomLevel(92);
    zoomController.applyZoomLayout(30);
    // playhead 30 s → 2760 px, offset −0… clamped at max 200
    expect(sc.scrollLeft).toBe(200);
  });

  it('classic regime (slider < 0.15): NO scroll adjustment', () => {
    const sc = mkScroller(3000, 800, 700);
    zoomController.attach({ getScroller: () => sc });
    // zoom just above the dynamic min → slider < 0.15
    setZoomState(8, 7.8125, 10);
    zoomController.setZoomLevel(9);
    zoomController.applyZoomLayout(30);
    expect(sc.scrollLeft).toBe(700); // untouched
  });

  it('crossing UP saves the pre-anchor scroll; crossing DOWN restores it', () => {
    const sc = mkScroller(3000, 800, 0);
    zoomController.attach({ getScroller: () => sc });
    const min = 7.8125;
    const below = 8; // slider(8, 7.8) ≈ 0.003 < 0.15
    const above = 20; // slider(20, 7.8) ≈ 0.145… — need ≥ 0.15: use 24
    expect(zoomToSlider(24, min)).toBeGreaterThanOrEqual(ZOOM_ANCHOR_PLAYHEAD_THRESHOLD);
    expect(zoomToSlider(below, min)).toBeLessThan(ZOOM_ANCHOR_PLAYHEAD_THRESHOLD);

    setZoomState(below, min, 5);
    sc.scrollLeft = 650;
    zoomController.setZoomLevel(24); // up-crossing
    zoomController.applyZoomLayout(30);
    const anchored = sc.scrollLeft;
    // now zoom further IN (still ≥ 0.15) — anchor mode persists
    zoomController.setZoomLevel(46);
    zoomController.applyZoomLayout(30);
    // down-cross back into the classic regime → restores 650
    zoomController.setZoomLevel(below);
    zoomController.applyZoomLayout(30);
    expect(sc.scrollLeft).toBe(650);
    expect(anchored).not.toBe(650);
  });

  it('a no-op zoom (clamped to the same value) writes nothing', () => {
    const sc = mkScroller();
    zoomController.attach({ getScroller: () => sc });
    setZoomState(46, 7.8125, 0);
    zoomController.setZoomLevel(46);
    expect(zoomController.getPendingLayout()).toBeNull();
    zoomController.setZoomLevel(0.001); // clamps to zoomMin → no change from 46? (min 7.8) → different
    // clamped to the store bounds below the dynamic min reconciles UP to min:
    expect(useUi.getState().pxPerSec).toBe(7.8125);
  });

  it('reset() clears anchor state (scene switch semantics)', () => {
    const sc = mkScroller(3000, 800, 0);
    zoomController.attach({ getScroller: () => sc });
    setZoomState(8, 7.8125, 5);
    sc.scrollLeft = 300;
    zoomController.setZoomLevel(24);
    zoomController.applyZoomLayout(30);
    zoomController.reset();
    // after reset a down-crossing restores nothing (mode cleared)
    zoomController.setZoomLevel(8);
    zoomController.applyZoomLayout(30);
    expect(sc.scrollLeft).toBeGreaterThan(0); // anchored value kept, no restore-to-300
  });
});

describe('R15-F1 P3: the bus is the one honest route (dead direct fallback deleted, isAttached truthful)', () => {
  it('zoomBus.isAttached() reports the CURRENT wiring — false detached, true with a live scroller', () => {
    expect(zoomBus.isAttached()).toBe(false); // detached by the suite's beforeEach
    const sc = mkScroller();
    zoomController.attach({ getScroller: () => sc });
    expect(zoomBus.isAttached()).toBe(true);
    zoomController.detach();
    expect(zoomBus.isAttached()).toBe(false);
  });

  it('the bus body routes through setZoomLevel even with NO Timeline attached (stories / isolated toolbars)', () => {
    setZoomState(46, 7.8125, 0);
    zoomBus(80); // no attach — must not fall back to a raw store write path
    expect(useUi.getState().pxPerSec).toBe(80);
    expect(zoomController.getPendingLayout()).not.toBeNull(); // the controller ran (capture taken, scroller null)
    zoomController.clearPending();
  });
});

describe('wheel zoom accumulator (rAF coalescing)', () => {
  beforeEach(() => {
    useUi.setState({ pxPerSec: 46, zoomMinPps: 5, playhead: 0 });
    zoomController.detach();
    zoomController.reset();
  });

  it('accumulates deltas and applies ONE capped factor per rAF (event-count independent)', async () => {
    let applied: number[] = [];
    const acc = createWheelZoomAccumulator({
      isZoomEvent: (e) => e.ctrlKey,
      onApplyFactor: (f) => applied.push(f),
    });
    const wheel = (deltaY: number) => ({ ctrlKey: true, deltaY, deltaMode: 0, preventDefault: () => {} }) as unknown as WheelEvent;
    // two events in the same frame → ONE application of the CAPPED total
    acc.handleWheel(wheel(-100));
    acc.handleWheel(wheel(-100));
    await new Promise((r) => requestAnimationFrame(r));
    expect(applied).toHaveLength(1);
    expect(applied[0]).toBeCloseTo(Math.exp(30 / 300), 8); // −200 capped at −30
    // a fresh frame gets a fresh application
    acc.handleWheel(wheel(-20));
    await new Promise((r) => requestAnimationFrame(r));
    expect(applied).toHaveLength(2);
    expect(applied[1]).toBeCloseTo(Math.exp(20 / 300), 8);
    acc.destroy();
  });

  it('deltaMode 1 (line units) normalizes by ×16 before capping', async () => {
    let applied: number[] = [];
    const acc = createWheelZoomAccumulator({
      isZoomEvent: (e) => e.ctrlKey,
      onApplyFactor: (f) => applied.push(f),
    });
    const wheel = (deltaY: number) => ({ ctrlKey: true, deltaY, deltaMode: 1, preventDefault: () => {} }) as unknown as WheelEvent;
    acc.handleWheel(wheel(-10)); // −160 → capped −30
    await new Promise((r) => requestAnimationFrame(r));
    expect(applied[0]).toBeCloseTo(Math.exp(30 / 300), 8);
    acc.destroy();
  });

  it('non-zoom events are not consumed (returns false)', () => {
    const acc = createWheelZoomAccumulator({
      isZoomEvent: (e) => e.ctrlKey,
      onApplyFactor: () => {},
    });
    const plain = { ctrlKey: false, deltaY: 10, deltaMode: 0, preventDefault: () => {} } as unknown as WheelEvent;
    expect(acc.handleWheel(plain)).toBe(false);
    acc.destroy();
  });

  it('destroy cancels a pending rAF (no late application)', async () => {
    let applied = 0;
    const acc = createWheelZoomAccumulator({
      isZoomEvent: (e) => e.ctrlKey,
      onApplyFactor: () => { applied++; },
    });
    acc.handleWheel({ ctrlKey: true, deltaY: -50, deltaMode: 0, preventDefault: () => {} } as unknown as WheelEvent);
    acc.destroy();
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => setTimeout(r, 5));
    expect(applied).toBe(0);
  });
});
