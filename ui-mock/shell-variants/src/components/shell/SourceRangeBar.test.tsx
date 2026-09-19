/* SourceRangeBar — R22 W4 (issues #84/#85) + W1-B (DESIGN-R25 §3/§6 A1,
   R2 "no play control, I/O crop not functional"): the strip is now a REAL
   SCRUB STRIP. Pins:
   - the dual in/out handles render as role=slider with the range band;
   - the source PLAYHEAD marker renders at the right pct (role=slider);
   - the OUT-OF-RANGE DIMMING (A1: on the STRIP, never the poster) — the
     left/right spans cover [0,in] and [out,dur] with the right widths;
   - scrubbing (pointerdown + move on the track) seeks through the store
     seam, clamped into the [in,out] domain when a range is set (the
     documented ruling);
   - stills (A1: a still = a normal 5s clip in Resolve) get the transport
     strip over the 5s pseudo-duration but NO trim handles (a still has no
     real source range — the insert stays the fixed-length still);
   - dragging a handle clamps (in < out always — the honest guard);
   - the store setters round-trip per mediaId (each source keeps its trim);
   - the trimmed range RIDES the insert planner: a planned insert places
     dur = out−in and sourceStart = in (the W4 seam). */

import { describe, expect, it, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SourceRangeBar } from './SourceRangeBar';
import { useUi } from '../../state/useUiStore';
import { planInsertMedia, type InsertIdFactory } from '../../lib/insertPlan';
import { snapToFrame, tc } from '../../lib/timecode';

const MID = 'm-01'; // 62.4s duration in the fixture (fps 24)
const setStore = (patch: Record<string, unknown>) => useUi.setState((s) => ({ ...patch } as object));

beforeEach(() => {
  useUi.setState({
    viewerMode: 'source',
    sourceMediaId: MID,
    sourceRanges: {},
    sourcePlayhead: {},
    sourcePlaying: false,
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

  /* RE-PIN (W1-B, A1 supersedes the R22 static-band law): a still = a
     normal 5s clip in Resolve — the strip gains the transport (playhead
     marker, scrubbable, role=slider over the 5s pseudo-duration) but keeps
     the honest NO-TRIM half of the old law: no in/out handles (a still has
     no real source range; the insert stays the fixed-length still). */
  it("RE-PIN W1-B: a still rides the 5s pseudo transport strip (playhead slider, NO trim handles — the honest no-trim half of the old static-band law)", () => {
    render(<SourceRangeBar mediaId="m-08" />);
    // the A1 transport: the playhead marker over the 5s pseudo-duration
    const ph = screen.getByTestId('shell-source-playhead');
    expect(ph).toHaveAttribute('role', 'slider');
    expect(ph).toHaveAttribute('aria-valuemax', '120'); // 5 s × 24 fps
    expect(ph).toHaveAttribute('aria-valuenow', '0');
    expect(ph).toHaveAttribute('aria-valuetext', '00:00:00:00');
    // the honest no-trim half survives: no handles, no range band, no dim
    expect(screen.queryByTestId('shell-source-range-in')).toBeNull();
    expect(screen.queryByTestId('shell-source-range-out')).toBeNull();
    expect(screen.queryByTestId('shell-source-dim')).toBeNull();
    expect(screen.getByTestId('shell-viewer-scrub')).toHaveAttribute('aria-label', expect.stringContaining('still image'));
  });

  /* ---- W1-B (DESIGN-R25 §3/§6 A1): the real scrub strip ---- */
  describe('W1-B (A1): the scrub strip', () => {
    const fakeBar = () =>
      ({ top: 0, left: 0, right: 300, bottom: 16, width: 300, height: 16, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

    it('the playhead marker renders at the right pct — left = calc(pct + 8px), the handle pad law', () => {
      act(() => { useUi.setState({ sourcePlayhead: { [MID]: 31.2 } }); }); // 50% of 62.4
      render(<SourceRangeBar mediaId={MID} />);
      const ph = screen.getByTestId('shell-source-playhead');
      expect(ph).toHaveAttribute('role', 'slider');
      expect(ph).toHaveAttribute('aria-valuenow', '749'); // 31.2 s × 24 = 748.8 → 749
      expect(ph.style.left).toBe('calc(50% + 8px)');
      expect(ph.style.background).toContain('var(--playhead)');
    });

    it('the OUT-OF-RANGE DIMMING (A1: on the STRIP, never the poster): left span [0,in], right span [out,dur]; no range → no dim', () => {
      render(<SourceRangeBar mediaId={MID} />);
      // untrimmed: the whole strip is the preview — no dim spans at all
      expect(screen.queryByTestId('shell-source-dim')).toBeNull();
      // a range 12.48–49.92s = 20%–80% of 62.4s
      act(() => { useUi.getState().setSourceRangeIn(MID, 12.48); });
      act(() => { useUi.getState().setSourceRangeOut(MID, 49.92); });
      expect(screen.getByTestId('shell-source-dim-left').style.width).toBe('20%');
      // jsdom's CSSOM normalizes calc(100% − 80%) → calc(20%): the right
      // dim span covers [out,100%] (a 20%-wide span anchored right-0)
      expect(screen.getByTestId('shell-source-dim-right').style.width).toBe('calc(20%)');
      // pointer-events-none: the scrub stays live over the dimmed spans
      expect(screen.getByTestId('shell-source-dim').className).toContain('pointer-events-none');
    });

    it('scrubbing the track seeks through the store seam (pointerdown + move, the handle pad law math)', () => {
      render(<SourceRangeBar mediaId={MID} />);
      screen.getByTestId('shell-viewer-scrub').getBoundingClientRect = fakeBar;
      const track = screen.getByTestId('shell-viewer-scrub');
      fireEvent.pointerDown(track, { pointerId: 9, button: 0, clientX: 158 });
      // (158−8)/(300−16) of 62.4 s, FRAME-SNAPPED (the seek's house law —
      // the same timeAt math the handles use, on the frame grid)
      expect(useUi.getState().sourcePlayhead[MID]).toBeCloseTo(snapToFrame(((158 - 8) / (300 - 16)) * 62.4), 5);
      fireEvent.pointerMove(track, { pointerId: 9, buttons: 1, clientX: 100 });
      expect(useUi.getState().sourcePlayhead[MID]).toBeCloseTo(snapToFrame(((100 - 8) / (300 - 16)) * 62.4), 5);
      // release: a stray move (buttons held elsewhere) writes nothing (B7)
      fireEvent.pointerUp(track, { pointerId: 9, buttons: 0, clientX: 0 });
      const after = useUi.getState().sourcePlayhead[MID];
      fireEvent.pointerMove(track, { pointerId: 9, buttons: 1, clientX: 250 });
      expect(useUi.getState().sourcePlayhead[MID]).toBe(after);
    });

    it('the domain ruling: with a range set, a scrub CLAMPS into [in,out] — the previewed span is the span an insert commits', () => {
      render(<SourceRangeBar mediaId={MID} />);
      screen.getByTestId('shell-viewer-scrub').getBoundingClientRect = fakeBar;
      act(() => { useUi.getState().setSourceRangeIn(MID, 20); });
      act(() => { useUi.getState().setSourceRangeOut(MID, 40); });
      const track = screen.getByTestId('shell-viewer-scrub');
      // scrub far left (t≈0) → clamps UP to range.in = 20
      fireEvent.pointerDown(track, { pointerId: 1, button: 0, clientX: 0 });
      expect(useUi.getState().sourcePlayhead[MID]).toBe(20);
      // scrub far right (t≈62.4) → clamps DOWN to range.out = 40
      fireEvent.pointerMove(track, { pointerId: 1, buttons: 1, clientX: 300 });
      expect(useUi.getState().sourcePlayhead[MID]).toBe(40);
    });

    it('a handle drag never leaks into a track scrub (the drag state carries the identity)', () => {
      render(<SourceRangeBar mediaId={MID} />);
      screen.getByTestId('shell-viewer-scrub').getBoundingClientRect = fakeBar;
      const inH = screen.getByTestId('shell-source-range-in');
      // grabbing the handle then moving over the track: the range moves,
      // the playhead does NOT (the handle's pointerdown stops propagation)
      fireEvent.pointerDown(inH, { pointerId: 2, button: 0, clientX: 50 });
      fireEvent.pointerMove(inH, { pointerId: 2, buttons: 1, clientX: 150 });
      expect(useUi.getState().sourceRanges[MID]!.in).toBeCloseTo(((150 - 8) / (300 - 16)) * 62.4, 5);
      expect(useUi.getState().sourcePlayhead[MID]).toBeUndefined(); // no scrub leaked
    });

    it('playhead keyboard: ←/→ nudge ±1 frame (⇧ ×10); Home/End land on the domain ends (range.in/out when trimmed)', () => {
      render(<SourceRangeBar mediaId={MID} />);
      const ph = screen.getByTestId('shell-source-playhead');
      ph.focus();
      fireEvent.keyDown(ph, { key: 'ArrowRight' });
      expect(useUi.getState().sourcePlayhead[MID]).toBeCloseTo(1 / 24, 5);
      fireEvent.keyDown(ph, { key: 'ArrowRight', shiftKey: true });
      expect(useUi.getState().sourcePlayhead[MID]).toBeCloseTo(11 / 24, 5);
      // with a range, Home/End land on the DOMAIN ends (the store's clamp)
      act(() => { useUi.getState().setSourceRangeIn(MID, 10); });
      act(() => { useUi.getState().setSourceRangeOut(MID, 50); });
      fireEvent.keyDown(ph, { key: 'Home' });
      expect(useUi.getState().sourcePlayhead[MID]).toBe(10); // range.in
      fireEvent.keyDown(ph, { key: 'End' });
      expect(useUi.getState().sourcePlayhead[MID]).toBe(50); // range.out
    });

    /* R25-F2 (E3): the playhead slider's aria domain IS the live [in,out]
     * domain — the documented playhead-domain ruling. The old 0..dur
     * min/max told assistive tech a domain the playhead can't occupy once
     * a range is set. */
    it('R25-F2 (E3): the playhead slider\'s aria-valuemin/max derive from the LIVE domain ([in,out] when trimmed; 0..dur untrimmed)', () => {
      render(<SourceRangeBar mediaId={MID} />);
      const ph = screen.getByTestId('shell-source-playhead');
      // untrimmed: the whole source is the domain
      expect(ph).toHaveAttribute('aria-valuemin', '0');
      expect(ph).toHaveAttribute('aria-valuemax', '1498'); // 62.4 s × 24
      act(() => { useUi.getState().setSourceRangeIn(MID, 10); });
      act(() => { useUi.getState().setSourceRangeOut(MID, 50); });
      // trimmed: the slider SPEAKS the domain the playhead occupies
      expect(ph).toHaveAttribute('aria-valuemin', '240'); // 10 s × 24
      expect(ph).toHaveAttribute('aria-valuemax', '1200'); // 50 s × 24
      // the in/out handles keep the FULL 0..dur domain (they trim it)
      expect(screen.getByTestId('shell-source-range-in')).toHaveAttribute('aria-valuemin', '0');
      expect(screen.getByTestId('shell-source-range-out')).toHaveAttribute('aria-valuemax', '1498');
    });

    /* R25-F2 (E5): the floating hover-TC tooltip — the program strip's
     * SMPTE grammar, with the TC clamped to the live domain: hovering the
     * dimmed out-of-range spans reads range.in/range.out (exactly what a
     * click there would seek — the store's clamp law). */
    it('R25-F2 (E5): the hover TC floats over the strip, CLAMPED to the domain — the dimmed spans read range.in/out', () => {
      render(<SourceRangeBar mediaId={MID} />);
      const track = screen.getByTestId('shell-viewer-scrub');
      track.getBoundingClientRect = fakeBar;
      act(() => { useUi.getState().setSourceRangeIn(MID, 20); });
      act(() => { useUi.getState().setSourceRangeOut(MID, 40); });
      // mid-strip (x=158 → t≈33): inside the range — the raw TC shows
      fireEvent.pointerMove(track, { pointerId: 4, clientX: 158, buttons: 0 });
      const tip = screen.getByTestId('shell-source-hover-tc');
      const tMid = snapToFrame(((158 - 8) / (300 - 16)) * 62.4);
      expect(tip).toHaveTextContent(tc(Math.max(20, Math.min(40, tMid))));
      // far-left over the dimmed span (t≈0): CLAMPED UP to range.in
      fireEvent.pointerMove(track, { pointerId: 4, clientX: 0, buttons: 0 });
      expect(screen.getByTestId('shell-source-hover-tc')).toHaveTextContent(tc(20));
      // far-right (t≈62.4): CLAMPED DOWN to range.out
      fireEvent.pointerMove(track, { pointerId: 4, clientX: 300, buttons: 0 });
      expect(screen.getByTestId('shell-source-hover-tc')).toHaveTextContent(tc(40));
      // pointer leave dismisses it (the program strip's grammar)
      fireEvent.pointerLeave(track);
      expect(screen.queryByTestId('shell-source-hover-tc')).toBeNull();
    });
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
