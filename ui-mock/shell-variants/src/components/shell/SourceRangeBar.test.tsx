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

describe('the W4 seam — the trimmed range rides the insert planner (#84/#85)', () => {
  const idFactory: InsertIdFactory = (() => {
    let n = 0;
    return (prefix: string) => `${prefix}test-${++n}`;
  }) as InsertIdFactory;

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
