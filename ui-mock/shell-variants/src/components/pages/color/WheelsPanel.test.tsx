/* WheelsPanel — R24-W5a (DESIGN-R24 §2 F2-P2 ×2): the Temp/Tint REAL-slider
 * pin + the MicroSlider default-reset threading pin.
 *
 * - F2 "affordance lie": the Temp/Tint top-control rows rendered a
 *   DECORATIVE 2px gradient bar (aria-hidden div — no role, no keyboard, no
 *   pointer) beside the typed field. They are REAL bar-sliders now, the
 *   master-row grammar (variant="bar" + the gradient as trackStyle, the same
 *   MicroSlider keyboard/drag/commit law), and the keyboard route commits to
 *   the SAME store path the typing route uses (setGrade → mockGrades).
 * - F2 "midpoint reset": the luma thumbwheels thread the spec 08 default
 *   (DEFAULT_GRADE) so double-click resets (Gamma luma → 1.0, NOT the
 *   0.25–4 midpoint 2.125). */

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

describe('R24-W5a F2: WheelsPanel luma thumbwheels — dbl-click resets to the spec 08 default', () => {
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
