/* WheelsPanel — R24-W5a (DESIGN-R24 §2 F2-P2 ×2) pins + the R25-W3 puck
 * grammar pins (DESIGN-R25 §1 R6 / §3 W3 / §6 A3; issue th_mtzolu4o "these
 * controls are not working correctly — research how those work in Resolve
 * first").
 *
 * - F2 "affordance lie": the Temp/Tint top-control rows render REAL
 *   bar-sliders (the decorative aria-hidden bar is dead) committing to the
 *   SAME store path the typing route uses.
 * - F2 "midpoint reset": the luma dials thread the spec 08 default
 *   (DEFAULT_GRADE) so double-click resets (Gamma luma → 1.0, NOT the
 *   0.25–4 midpoint 2.125).
 * - R25-W3 (A3 — the RESEARCH VERDICT, binding): the disc drag is
 *   RELATIVE/ACCUMULATING (trackball-style: grab anywhere, v += Δpointer,
 *   rim-clamped, persisted between gestures through the store's
 *   hue/amount), Shift = the absolute jump, Ctrl/Cmd routes the drag to
 *   the master scalar (the horizontal ridged dial's own law), dbl-click
 *   disc = color-only reset, the corner button = color+master reset, and
 *   the YRGB readouts update LIVE mid-gesture. The R24-W5c F4
 *   absolute-model pin is re-pinned below (the old-law comment marks it). */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WheelsPanel } from './WheelsPanel';
import { useUi } from '../../../state/useUiStore';
import { DEFAULT_GRADE } from '../../../lib/color';
import type { UiPatch } from '../../../test/helpers';

const S = () => useUi.getState();

/** boot the panel on the el-2 clip target (the ColorInspector.test grammar) */
function boot(patch: UiPatch = {}) {
  useUi.setState((s) => ({
    page: 'color',
    scenes: s.scenes,
    selection: ['el-2'],
    mockGrades: {},
    past: [],
    future: [],
    colorGradeTarget: 'clip',
    ...(patch as UiPatch),
  }));
  return render(<WheelsPanel />);
}

/** the 150px wheel box at (0,0) — center (75,75); the puck math is real. */
const stubWheelBox = (key: 'lift' | 'gamma' | 'gain' | 'offset') => {
  const wheel = screen.getByTestId(`shell-color-wheel-${key}`);
  wheel.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 150, height: 150, right: 150, bottom: 150, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  return wheel;
};

describe('R24-W5a F2: WheelsPanel top controls — Temp/Tint are REAL sliders', () => {
  it('every top-control row renders a role=slider (the decorative aria-hidden bar is dead)', () => {
    boot();
    // the two rows the F2 audit flagged (decorative gradient bars before)
    for (const label of ['Temp', 'Tint']) {
      expect(screen.getByRole('slider', { name: label })).toBeInTheDocument();
    }
    // the whole TOP_CTRL family — no row is a typing-only lie anymore
    for (const label of ['Contrast', 'Pivot', 'Mid/Detail']) {
      expect(screen.getByRole('slider', { name: label })).toBeInTheDocument();
    }
    // no bare decorative track remains: every bar-slider owns its gradient
    // through the trackStyle (the master-row grammar)
    const temp = screen.getByRole('slider', { name: 'Temp' });
    const track = temp.querySelector('div[aria-hidden]');
    expect(track).not.toBeNull();
    expect((track as HTMLElement).style.background).toContain('linear-gradient');
  });

  it('keyboard steps commit to the SAME store path the typing route uses (setGrade → mockGrades)', async () => {
    const user = userEvent.setup();
    boot();
    const temp = screen.getByRole('slider', { name: 'Temp' });
    temp.focus();
    await user.keyboard('{ArrowRight}'); // step 0.5 from the 0 default
    expect(S().mockGrades['el-2'].temperature).toBe(0.5);
    expect(temp).toHaveAttribute('aria-valuenow', '0.5');
    await user.keyboard('{ArrowLeft}');
    expect(S().mockGrades['el-2'].temperature).toBe(0);
    // the TYPING route (NumCell) rides the same seam — both land in the
    // target's mockGrades record through setGrade
    const typed = screen.getByLabelText('Tint value');
    fireEvent.change(typed, { target: { value: '12.5' } });
    fireEvent.blur(typed);
    expect(S().mockGrades['el-2'].tint).toBe(12.5);
  });

  it('the slider drag commits ONE setGrade on pointer-up (the D3 gesture law)', () => {
    boot();
    const temp = screen.getByRole('slider', { name: 'Temp' });
    // jsdom geometry is flat — stub the hit box so the gesture math is real
    // (a 100px track: clientX 60 → 60% → temp 20)
    temp.getBoundingClientRect = () => ({ left: 0, width: 100, right: 100, top: 0, height: 14, bottom: 14, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    fireEvent.pointerDown(temp, { clientX: 60 });
    fireEvent.pointerMove(temp, { buttons: 1, clientX: 60 });
    expect(S().mockGrades['el-2']).toBeUndefined(); // nothing committed mid-gesture
    fireEvent.pointerUp(temp);
    expect(S().mockGrades['el-2'].temperature).toBe(20); // 60% of −100..100
    expect(S().past.length).toBe(1); // exactly ONE undoable write per drag
  });
});

describe('R25-W3 (A3): the disc drag — RELATIVE/ACCUMULATING, live, rim-clamped', () => {
  it('pointerdown NEVER jumps the puck; +10px right from center → v.x = +10; a SECOND gesture ACCUMULATES from there', () => {
    boot();
    const wheel = stubWheelBox('lift');
    const puck = screen.getByTestId('shell-color-wheel-lift-puck');
    // gesture 1: grab at the center, move +10px right
    fireEvent.pointerDown(wheel, { pointerId: 1, clientX: 75, clientY: 75 });
    expect(puck.style.transform).toBe('translate(0px, 0px)'); // grab-and-accumulate — NO jump on down
    fireEvent.pointerMove(wheel, { buttons: 1, pointerId: 1, clientX: 85, clientY: 75 });
    expect(puck.style.transform).toBe('translate(10px, 0px)'); // v = Δpointer, 1:1 px in disc space
    expect(S().mockGrades['el-2']).toBeUndefined(); // nothing committed mid-gesture (the D3 law)
    expect(S().past.length).toBe(0);
    fireEvent.pointerUp(wheel, { pointerId: 1 });
    // amount = |v|/62 (the disc radius); hue 240 — straight right on the
    // vectorscope ring is 30° past the upper-left red toward blue
    expect(S().mockGrades['el-2'].shAmount).toBeCloseTo(10 / 62, 3);
    expect(S().mockGrades['el-2'].shHue).toBe(240);
    expect(S().past.length).toBe(1); // ONE undoable write per gesture
    // gesture 2: a FRESH down+move — the puck PERSISTS between gestures
    // (it re-derives from the store's hue/amount, then accumulates)
    fireEvent.pointerDown(wheel, { pointerId: 2, clientX: 85, clientY: 75 });
    fireEvent.pointerMove(wheel, { buttons: 1, pointerId: 2, clientX: 95, clientY: 75 });
    expect(puck.style.transform).toBe('translate(20px, 0px)'); // 10 + 10, NOT from zero
    fireEvent.pointerUp(wheel, { pointerId: 2 });
    expect(S().mockGrades['el-2'].shAmount).toBeCloseTo(20 / 62, 3);
    expect(S().past.length).toBe(2);
  });

  it('the YRGB readouts update LIVE during the drag (before pointer-up)', () => {
    boot();
    const wheel = stubWheelBox('lift');
    expect(screen.getByLabelText('Lift B')).toHaveTextContent('0.00'); // neutral at rest
    fireEvent.pointerDown(wheel, { pointerId: 1, clientX: 75, clientY: 75 });
    fireEvent.pointerMove(wheel, { buttons: 1, pointerId: 1, clientX: 105, clientY: 75 }); // +30px right → blue
    // hue 240 (pure blue): B cell = t_b · amount = 30/62 ≈ 0.48 — LIVE,
    // before any commit (the store is still untouched)
    expect(screen.getByLabelText('Lift B')).toHaveTextContent('0.48');
    expect(screen.getByLabelText('Lift R')).toHaveTextContent('0.00');
    expect(S().mockGrades['el-2']).toBeUndefined();
    fireEvent.pointerUp(wheel, { pointerId: 1 });
    expect(screen.getByLabelText('Lift B')).toHaveTextContent('0.48'); // the committed readout agrees
  });

  it('the rim clamp — |v| never exceeds the 62px disc radius (amount saturates at 1)', () => {
    boot();
    const wheel = stubWheelBox('lift');
    const puck = screen.getByTestId('shell-color-wheel-lift-puck');
    fireEvent.pointerDown(wheel, { pointerId: 1, clientX: 75, clientY: 75 });
    fireEvent.pointerMove(wheel, { buttons: 1, pointerId: 1, clientX: 175, clientY: 75 }); // +100px right
    expect(puck.style.transform).toBe('translate(62px, 0px)'); // clamped at the rim
    fireEvent.pointerUp(wheel, { pointerId: 1 });
    expect(S().mockGrades['el-2'].shAmount).toBe(1);
  });

  it('the ≤3% dead zone — a 1px jitter commits the documented neutral (no history entry)', () => {
    boot();
    const wheel = stubWheelBox('lift');
    fireEvent.pointerDown(wheel, { pointerId: 1, clientX: 75, clientY: 75 });
    fireEvent.pointerMove(wheel, { buttons: 1, pointerId: 1, clientX: 76, clientY: 75 }); // 1px < 3% of 62
    fireEvent.pointerUp(wheel, { pointerId: 1 });
    // amount 0 (inside the dead zone) → the neutral defaults → a TRUE no-op
    // patch: no record, no history (the gradeEqual guard)
    expect(S().mockGrades['el-2']).toBeUndefined();
    expect(S().past.length).toBe(0);
  });

  it('Shift+drag = the ABSOLUTE jump (v = pointer − center, rim-clamped)', () => {
    boot();
    const wheel = stubWheelBox('lift');
    const puck = screen.getByTestId('shell-color-wheel-lift-puck');
    // seed a nonzero v first (the plain relative gesture)
    fireEvent.pointerDown(wheel, { pointerId: 1, clientX: 75, clientY: 75 });
    fireEvent.pointerMove(wheel, { buttons: 1, pointerId: 1, clientX: 85, clientY: 75 });
    fireEvent.pointerUp(wheel, { pointerId: 1 });
    expect(S().mockGrades['el-2'].shAmount).toBeCloseTo(10 / 62, 3);
    // the Shift gesture JUMPS to the pointer position (105,75 → 30px right)
    fireEvent.pointerDown(wheel, { pointerId: 2, shiftKey: true, clientX: 105, clientY: 75 });
    expect(puck.style.transform).toBe('translate(30px, 0px)'); // the jump on DOWN
    fireEvent.pointerMove(wheel, { buttons: 1, pointerId: 2, shiftKey: true, clientX: 110, clientY: 75 });
    expect(puck.style.transform).toBe('translate(35px, 0px)'); // further moves stay absolute
    fireEvent.pointerUp(wheel, { pointerId: 2 });
    expect(S().mockGrades['el-2'].shAmount).toBeCloseTo(35 / 62, 3);
    expect(S().past.length).toBe(2);
  });

  it('Ctrl+drag INSIDE the disc routes to the MASTER scalar (the dial px→value map) — the puck never moves', () => {
    boot();
    const wheel = stubWheelBox('lift');
    const puck = screen.getByTestId('shell-color-wheel-lift-puck');
    fireEvent.pointerDown(wheel, { pointerId: 1, clientX: 75, clientY: 75 });
    fireEvent.pointerMove(wheel, { buttons: 1, pointerId: 1, ctrlKey: true, clientX: 85, clientY: 75 });
    expect(puck.style.transform).toBe('translate(0px, 0px)'); // the color vector is untouched
    expect(S().mockGrades['el-2']).toBeUndefined(); // live, not committed
    fireEvent.pointerUp(wheel, { pointerId: 1 });
    // lift spans −0.2..0.2 over the 200px master map → +10px = +0.02
    expect(S().mockGrades['el-2'].lift).toBeCloseTo(0.02, 5);
    expect(S().mockGrades['el-2'].shAmount).toBe(0); // the color fields stayed neutral
    expect(S().past.length).toBe(1); // ONE undoable write (the master patch)
  });

  it('dbl-click the DISC = COLOR-ONLY reset (v → 0; the master untouched)', () => {
    boot();
    act(() => { S().setGrade('el-2', { shHue: 205, shAmount: 0.137, lift: 0.05 }); });
    expect(screen.getByTestId('shell-color-wheel-lift-puck').style.transform).not.toBe('translate(0px, 0px)');
    fireEvent.doubleClick(screen.getByTestId('shell-color-wheel-lift'));
    expect(S().mockGrades['el-2'].shHue).toBe(DEFAULT_GRADE.shHue); // 0 — neutral
    expect(S().mockGrades['el-2'].shAmount).toBe(DEFAULT_GRADE.shAmount); // 0 — v → 0
    expect(S().mockGrades['el-2'].lift).toBe(0.05); // the MASTER is untouched (the corner button owns it)
    expect(screen.getByTestId('shell-color-wheel-lift-puck').style.transform).toBe('translate(0px, 0px)');
  });

  it('the per-wheel CORNER button resets color AND master (the reference §1.4 crosshair row)', () => {
    boot();
    act(() => { S().setGrade('el-2', { shHue: 205, shAmount: 0.137, lift: 0.05 }); });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Lift' }));
    expect(S().mockGrades['el-2'].shHue).toBe(DEFAULT_GRADE.shHue);
    expect(S().mockGrades['el-2'].shAmount).toBe(DEFAULT_GRADE.shAmount);
    expect(S().mockGrades['el-2'].lift).toBe(DEFAULT_GRADE.lift); // 0 — master too
  });
});

describe('R25-W3 (A3): the master luma DIAL — horizontal, relative, one commit', () => {
  it('the dial renders as the wheel luma slider (the a11y contract carries over) with the spec bounds', () => {
    boot();
    const dial = screen.getByRole('slider', { name: 'Lift luma' });
    expect(dial).toHaveAttribute('aria-valuemin', '-0.2');
    expect(dial).toHaveAttribute('aria-valuemax', '0.2');
    expect(dial).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('shell-color-wheel-lift-luma-dial')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Gamma luma' })).toHaveAttribute('aria-valuenow', '1');
  });

  it('a relative drag commits the master ONE setGrade on pointer-up (+20px → +0.375 on gamma)', () => {
    boot();
    const dial = screen.getByRole('slider', { name: 'Gamma luma' });
    // gamma spans 0.25..4 → 3.75 over the 200px master map → 20px = 0.375
    fireEvent.pointerDown(dial, { pointerId: 1, clientX: 100 });
    fireEvent.pointerMove(dial, { buttons: 1, pointerId: 1, clientX: 120 });
    expect(screen.getByRole('slider', { name: 'Gamma luma' })).toHaveAttribute('aria-valuenow', '1.375'); // LIVE value
    expect(S().mockGrades['el-2']).toBeUndefined(); // nothing committed mid-gesture
    fireEvent.pointerUp(dial, { pointerId: 1 });
    expect(S().mockGrades['el-2'].gamma).toBeCloseTo(1.375, 5);
    expect(S().past.length).toBe(1);
    // left = darker: a leftward drag lowers the scalar
    fireEvent.pointerDown(dial, { pointerId: 2, clientX: 120 });
    fireEvent.pointerMove(dial, { buttons: 1, pointerId: 2, clientX: 100 });
    fireEvent.pointerUp(dial, { pointerId: 2 });
    expect(S().mockGrades['el-2'].gamma).toBeCloseTo(1, 5); // 1.375 − 0.375
  });
});

describe('R24-W5c F4: the wheel puck pointer capture is GUARDED (Fader/Knob law)', () => {
  it('a bogus pointer id at pointerdown never throws — the RELATIVE gesture survives and commits ONE setGrade', () => {
    boot();
    const wheel = stubWheelBox('lift');
    /* setup.ts stubs setPointerCapture as a no-op; REAL browsers throw
       NotFoundError for a synthetic/inactive pointer id — stub the throw and
       fire the exact event. The old unguarded call (the F4 finding) died
       BEFORE the puck math ran; the guard keeps capture best-effort. */
    const real = Element.prototype.setPointerCapture;
    Element.prototype.setPointerCapture = () => {
      throw new DOMException('Invalid pointer id', 'NotFoundError');
    };
    try {
      expect(() => fireEvent.pointerDown(wheel, { pointerId: 9999, clientX: 75, clientY: 75 })).not.toThrow();
      fireEvent.pointerMove(wheel, { buttons: 1, pointerId: 9999, clientX: 85, clientY: 75 });
      expect(S().mockGrades['el-2']).toBeUndefined(); // nothing committed mid-gesture
      fireEvent.pointerUp(wheel, { pointerId: 9999 });
    } finally {
      Element.prototype.setPointerCapture = real;
    }
    /* RE-PIN (R25-W3 / DESIGN-R25 §6 A3 — the absolute model is DEAD): the
       old pin asserted the pre-W3 law — a pointerdown AT (100,75) JUMPED the
       puck to θ=90/mag=1/3 and committed shAmount 0.333 + shHue 270 on
       release. The trackball verdict replaced it: pointerdown never moves
       the puck; only the Δ (+10px right of the center) does, committing
       amount 10/62 at the vectorscope-rotated hue 240. */
    expect(S().mockGrades['el-2'].shAmount).toBeCloseTo(10 / 62, 3);
    expect(S().mockGrades['el-2'].shHue).toBe(240);
    expect(S().past.length).toBe(1);
  });
});

describe('R24-W5a F2: WheelsPanel luma dials — dbl-click resets to the spec 08 default', () => {
  it('Gamma luma: double-click from a NON-default grade writes DEFAULT_GRADE.gamma (1), never the midpoint (2.125)', () => {
    boot();
    // move gamma off-default through the store seam first
    act(() => { S().setGrade('el-2', { gamma: 1.5 }); });
    expect(S().mockGrades['el-2'].gamma).toBe(1.5);
    const gammaLuma = screen.getByRole('slider', { name: 'Gamma luma' });
    fireEvent.doubleClick(gammaLuma);
    expect(S().mockGrades['el-2'].gamma).toBe(DEFAULT_GRADE.gamma); // 1 — the spec 08 default
    expect(S().mockGrades['el-2'].gamma).not.toBe(2.125); // the F2 live midpoint write
  });

  it('the master rows thread the same default law (e.g. Lum Mix → 100, Hue → 50)', () => {
    boot();
    act(() => { S().setGrade('el-2', { lumMix: 40, hue: 20 }); });
    fireEvent.doubleClick(screen.getByRole('slider', { name: 'Lum Mix' }));
    fireEvent.doubleClick(screen.getByRole('slider', { name: 'Hue' }));
    expect(S().mockGrades['el-2'].lumMix).toBe(DEFAULT_GRADE.lumMix); // 100
    expect(S().mockGrades['el-2'].hue).toBe(DEFAULT_GRADE.hue); // 50
  });
});
