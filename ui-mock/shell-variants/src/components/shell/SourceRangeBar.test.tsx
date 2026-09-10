/* SourceRangeBar — R22 W4 (issues #84/#85). Pins:
   - the dual in/out handles render as role=slider with the range band;
   - dragging a handle clamps (in < out always — the honest guard);
   - the store setters round-trip per mediaId (each source keeps its trim);
   - stills (no duration) keep the honest static band;
   - the trimmed range RIDES the insert planner: a planned insert places
     dur = out−in and sourceStart = in (the W4 seam). */

import { describe, expect, it, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SourceRangeBar } from './SourceRangeBar';
import { useUi } from '../../state/useUiStore';
import { planInsertMedia, type InsertIdFactory } from '../../lib/insertPlan';

const MID = 'm-01'; // 62.4s duration in the fixture (fps 24)
const setStore = (patch: Record<string, unknown>) => useUi.setState((s) => ({ ...patch } as object));

beforeEach(() => {
  useUi.setState({
    viewerMode: 'source',
    sourceMediaId: MID,
    sourceRanges: {},
    playhead: 4,
    loop: { start: 0, end: 0 },
    selection: [],
    toasts: [],
  });
});

describe('SourceRangeBar (R22 #84/#85)', () => {
  it('renders the dual in/out sliders over the full duration (untrimmed = full-length band)', () => {
    render(<SourceRangeBar mediaId={MID} />);
    const inH = screen.getByTestId('shell-source-range-in');
    expect(inH).toHaveAttribute('role', 'slider');
    expect(inH).toHaveAttribute('aria-valuetext', expect.any(String));
    expect(screen.getByTestId('shell-source-range-out')).toHaveAttribute('role', 'slider');
    // untrimmed: in at 0, out at the media duration (62.4s = 1497.6 → 1497 frames)
    expect(inH).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('shell-source-range-out')).toHaveAttribute('aria-valuenow', '1498');
  });

  it('a still image (no duration) keeps the honest static band — no sliders', () => {
    render(<SourceRangeBar mediaId="m-08" />);
    expect(screen.getByTestId('shell-viewer-scrub')).toHaveAttribute('aria-label', expect.stringContaining('static'));
    expect(screen.queryByTestId('shell-source-range-in')).toBeNull();
  });

  it('the store setters clamp: in can never pass out; out can never pass in', () => {
    render(<SourceRangeBar mediaId={MID} />);
    act(() => { useUi.getState().setSourceRangeIn(MID, 5); });
    expect(useUi.getState().sourceRanges[MID]).toEqual({ in: 5, out: 62.4 });
    // in past out → clamped to out − 1 frame
    act(() => { useUi.getState().setSourceRangeIn(MID, 100); });
    const r = useUi.getState().sourceRanges[MID]!;
    expect(r.in).toBeLessThan(r.out);
    expect(r.in).toBeGreaterThan(62);
    // out below in → clamped to in + 1 frame
    act(() => { useUi.getState().setSourceRangeOut(MID, 0); });
    const r2 = useUi.getState().sourceRanges[MID]!;
    expect(r2.out).toBeGreaterThan(r2.in);
    expect(r2.out).toBeLessThan(r2.in + 0.1);
  });

  it('keyboard: ←/→ step the handle ±1 frame (⇧ ×10); the range readout follows', () => {
    render(<SourceRangeBar mediaId={MID} />);
    const inH = screen.getByTestId('shell-source-range-in');
    inH.focus();
    fireEvent.keyDown(inH, { key: 'ArrowRight' });
    expect(useUi.getState().sourceRanges[MID]?.in).toBeCloseTo(1 / 24, 5);
    fireEvent.keyDown(inH, { key: 'ArrowRight', shiftKey: true });
    expect(useUi.getState().sourceRanges[MID]?.in).toBeCloseTo(11 / 24, 5);
  });

  it('clearing the range restores the full media (the transport × button law)', () => {
    render(<SourceRangeBar mediaId={MID} />);
    act(() => { useUi.getState().setSourceRangeIn(MID, 3); });
    act(() => { useUi.getState().clearSourceRange(MID); });
    expect(useUi.getState().sourceRanges[MID]).toBeUndefined();
  });
});

/* ---- R24-W5b (DESIGN-R24 §2 F1-P3): the gesture laws — B8
   aria-orientation, the B7 pointer-release discipline (Fader/Knob/PanBox),
   the ABSOLUTE drag positioning (the dead `*0; void t` line removed), and
   Home/End committing on EITHER handle. ---- */
describe('SourceRangeBar gesture laws (R24-W5b F1-P3)', () => {
  const fakeBar = () =>
    ({ top: 0, left: 0, right: 300, bottom: 16, width: 300, height: 16, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

  it('B8: both handles carry aria-orientation="horizontal"', () => {
    render(<SourceRangeBar mediaId={MID} />);
    expect(screen.getByTestId('shell-source-range-in')).toHaveAttribute('aria-orientation', 'horizontal');
    expect(screen.getByTestId('shell-source-range-out')).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('pointer drag commits the ABSOLUTE pointer time (the dead delta line is gone) through the store seam', () => {
    render(<SourceRangeBar mediaId={MID} />);
    // stub a real bar rect (jsdom geometry is flat): 300px wide, 8px pad law
    screen.getByTestId('shell-viewer-scrub').getBoundingClientRect = fakeBar;
    const inH = screen.getByTestId('shell-source-range-in');
    fireEvent.pointerDown(inH, { pointerId: 1, button: 0, clientX: 10 });
    fireEvent.pointerMove(inH, { pointerId: 1, buttons: 1, clientX: 150 });
    // the handle follows the pointer's OWN time: (150−8)/(300−16) of 62.4 s
    expect(useUi.getState().sourceRanges[MID]?.in).toBeCloseTo(((150 - 8) / (300 - 16)) * 62.4, 5);
  });

  it('B7: pointerup / pointercancel / lostpointercapture clear the drag anchor — no stale-move writes', () => {
    render(<SourceRangeBar mediaId={MID} />);
    screen.getByTestId('shell-viewer-scrub').getBoundingClientRect = fakeBar;
    const inH = screen.getByTestId('shell-source-range-in');
    fireEvent.pointerDown(inH, { pointerId: 1, button: 0, clientX: 10 });
    fireEvent.pointerMove(inH, { pointerId: 1, buttons: 1, clientX: 100 });
    const after = useUi.getState().sourceRanges[MID]!.in;
    // released drag: a stray pointermove (buttons held elsewhere) is ignored
    fireEvent.pointerUp(inH, { pointerId: 1, buttons: 0, clientX: 0 });
    fireEvent.pointerMove(inH, { pointerId: 1, buttons: 1, clientX: 250 });
    expect(useUi.getState().sourceRanges[MID]!.in).toBe(after);
    // same discipline on pointercancel (the B7 law Fader/Knob/PanBox carry)
    fireEvent.pointerDown(inH, { pointerId: 2, button: 0, clientX: 10 });
    fireEvent.pointerCancel(inH, { pointerId: 2, buttons: 1, clientX: 0 });
    fireEvent.pointerMove(inH, { pointerId: 2, buttons: 1, clientX: 250 });
    expect(useUi.getState().sourceRanges[MID]!.in).toBe(after);
    // …and on lostpointercapture
    fireEvent.pointerDown(inH, { pointerId: 3, button: 0, clientX: 10 });
    fireEvent(inH, new Event('lostpointercapture', { bubbles: true }));
    fireEvent.pointerMove(inH, { pointerId: 3, buttons: 1, clientX: 250 });
    expect(useUi.getState().sourceRanges[MID]!.in).toBe(after);
  });

  it('Home/End commit on EITHER handle (the old Home-on-out / End-on-in preventDefault no-ops are dead)', () => {
    render(<SourceRangeBar mediaId={MID} />);
    act(() => { useUi.getState().setSourceRangeIn(MID, 10); });
    act(() => { useUi.getState().setSourceRangeOut(MID, 50); });
    const outH = screen.getByTestId('shell-source-range-out');
    outH.focus();
    // Home on the OUT handle: the edge jumps to 0, clamped just above in
    fireEvent.keyDown(outH, { key: 'Home' });
    expect(useUi.getState().sourceRanges[MID]!.out).toBeCloseTo(10 + 1 / 24, 5);
    // End on the IN handle: the edge jumps to dur, clamped just below out
    act(() => { useUi.getState().setSourceRangeOut(MID, 50); });
    const inH = screen.getByTestId('shell-source-range-in');
    fireEvent.keyDown(inH, { key: 'End' });
    expect(useUi.getState().sourceRanges[MID]!.in).toBeCloseTo(50 - 1 / 24, 5);
    // the classic ends survive: Home on IN → 0; End on OUT → dur
    fireEvent.keyDown(inH, { key: 'Home' });
    expect(useUi.getState().sourceRanges[MID]!.in).toBe(0);
    fireEvent.keyDown(outH, { key: 'End' });
    expect(useUi.getState().sourceRanges[MID]!.out).toBeCloseTo(62.4, 5);
  });
});

describe('the W4 seam — the trimmed range rides the insert planner (#84/#85)', () => {
  let idCounter = 0;
  const idFactory: InsertIdFactory = (prefix: string) => `${prefix}test-${++idCounter}`;

  it('a planned insert with sourceRange places dur = out−in and sourceStart = in', () => {
    const s = useUi.getState();
    const plan = planInsertMedia(s.scenes, s.activeSceneId, MID, 'insert', {
      playhead: 4, loop: s.loop, selection: [],
      sourceRange: { start: 2, end: 5 },
    }, idFactory);
    expect(plan.ok).toBe(true);
    const g = plan.geometry.ghost!;
    expect(g.dur).toBeCloseTo(3, 5);
    /* the straddling clip's split half ALSO carries mediaId m-01 (with a
       re-offset sourceStart — the split law); the PLACED clip is the one
       with the placed duration. */
    const el = plan.patch.find((op) => op.op === 'insertElement' && 'element' in op && Math.abs(op.element.duration - 3) < 0.01);
    expect(el && 'element' in el && el.element.sourceStart).toBeCloseTo(2, 5);
    expect(el && 'element' in el && el.element.duration).toBeCloseTo(3, 5);
  });

  it('NO sourceRange = today\'s law (dur = min(m.duration, 30), sourceStart 0) — the backward-compat pin', () => {
    const s = useUi.getState();
    const plan = planInsertMedia(s.scenes, s.activeSceneId, MID, 'insert', {
      playhead: 4, loop: s.loop, selection: [],
    }, idFactory);
    expect(plan.ok).toBe(true);
    const g = plan.geometry.ghost!;
    expect(g.dur).toBeCloseTo(30, 5); // min(62.4, 30) — the 30s cap law
    /* the straddling clip's split half ALSO carries mediaId m-01 (with a
       re-offset sourceStart — the split law); the PLACED clip is the one
       with the placed duration. */
    const el = plan.patch.find((op) => op.op === 'insertElement' && 'element' in op && Math.abs(op.element.duration - 30) < 0.01);
    expect(el && 'element' in el && el.element.sourceStart).toBe(0);
  });

  it('fitToFill retimes the RANGE length (not the whole media)', () => {
    const s = useUi.getState();
    const plan = planInsertMedia(s.scenes, s.activeSceneId, MID, 'fitToFill', {
      playhead: 0, loop: { start: 0, end: 2 }, selection: [],
      sourceRange: { start: 4, end: 6 }, // 2s of source into a 2s range → 1.0×
    }, idFactory);
    expect(plan.ok).toBe(true);
    const g = plan.geometry.ghost!;
    expect(g.speed).toBeCloseTo(1.0, 3);
    /* the straddling clip's split half ALSO carries mediaId m-01 (with a
       re-offset sourceStart — the split law); the PLACED clip is the one
       with the placed duration. */
    const el = plan.patch.find((op) => op.op === 'insertElement' && 'element' in op && Math.abs(op.element.duration - 2) < 0.01);
    expect(el && 'element' in el && el.element.sourceStart).toBeCloseTo(4, 5);
  });
});
