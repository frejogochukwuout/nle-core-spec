/* Ruler component tests — slider a11y + click/drag seek (spec 05 §14.3),
   adaptive tick/label density, marker pins (spec 16 §3.7), and the §4.9 ruler
   menu incl. the 8-color marker palette. */

import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Ruler } from './Ruler';
import { renderShell, store } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';

function RulerHarness({ pxPerSec = 46, playhead = 16, duration = 30 }: { pxPerSec?: number; playhead?: number; duration?: number }) {
  const scene = useUi.getState().scenes.find((s) => s.id === 'sc-1')!;
  return <Ruler scene={scene} duration={duration} pxPerSec={pxPerSec} playhead={playhead} />;
}

const boot = (props: { pxPerSec?: number; playhead?: number; duration?: number } = {}) => renderShell(<RulerHarness {...props} />);
const ruler = () => screen.getByRole('slider', { name: 'Timeline ruler' });
const scene1 = () => store().scenes.find((s) => s.id === 'sc-1')!;

describe('Ruler', () => {
  it('exposes slider semantics with frame-accurate values and seeks on pointer-down (spec 05 §14.3)', () => {
    boot({});
    const r = ruler();
    expect(r).toHaveAttribute('aria-valuemin', '0');
    expect(r).toHaveAttribute('aria-valuemax', '720'); // 30 s × 24 fps
    expect(r).toHaveAttribute('aria-valuenow', '384'); // 16 s × 24
    expect(r).toHaveAttribute('aria-valuetext', '00:00:16:00');
    fireEvent.pointerDown(r, { pointerId: 1, button: 0, clientX: 200 });
    // R13: seeks snap to the frame grid — 200/46 = 4.3478 s = frame 104.35 → 104 (4.3333 s)
    expect(store().playhead).toBeCloseTo(104 / 24, 5);
  });

  it('scrubbing with the button held keeps seeking (drag-to-seek)', () => {
    boot({});
    fireEvent.pointerDown(ruler(), { pointerId: 1, button: 0, clientX: 0 });
    fireEvent.pointerMove(ruler(), { pointerId: 1, buttons: 1, clientX: 230 });
    expect(store().playhead).toBeCloseTo(5, 5);
  });

  it('renders the 4 fixture markers with label + TC tooltips (spec 16 §3.7 markers)', () => {
    boot({});
    const hook = screen.getByLabelText('Marker Hook');
    expect(hook).toHaveAttribute('data-tip', 'Hook · 00:00:00:00');
    expect(screen.getByLabelText('Marker Interview')).toHaveAttribute('data-tip', 'Interview · 00:00:08:12');
    expect(screen.getByLabelText('Marker Pull quote')).toHaveAttribute('data-tip', 'Pull quote · 00:00:15:12');
    expect(screen.getByLabelText('Marker Sunset')).toHaveAttribute('data-tip', 'Sunset · 00:00:24:00');
    expect(screen.queryByLabelText('Marker Best take')).toBeNull(); // sc-2 marker stays in sc-2
  });

  it('label density adapts: frames appear in ruler labels only at high zoom (spec 05 tick rules)', () => {
    const coarse = boot({});
    expect(screen.getByText('00:05')).toBeInTheDocument();
    expect(screen.queryByText('00:02:00')).toBeNull();
    coarse.unmount();
    boot({ pxPerSec: 120 });
    expect(screen.getByText('00:02:00')).toBeInTheDocument(); // tcRuler with frames at ≥110 px/s
    expect(screen.getByText('00:00:00')).toBeInTheDocument();
  });

  it('the §4.9 ruler menu: add-marker inserts at the playhead; loop is a checkbox (spec 18 §4.9)', () => {
    boot({ playhead: 16 });
    fireEvent.contextMenu(ruler(), { clientX: 30, clientY: 30 });
    const menu = screen.getByTestId('shell-menu-ruler');
    const loop = screen.getByTestId('shell-menu-ruler-loop');
    expect(loop).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(screen.getByTestId('shell-menu-ruler-add-marker'));
    expect(scene1().markers).toHaveLength(5);
    expect(scene1().markers.at(-1)!.time).toBe(16);
  });

  it('the marker-color palette row adds a marker with the picked color at the playhead (spec 16 §3.7)', () => {
    boot({ playhead: 16 });
    fireEvent.contextMenu(ruler(), { clientX: 30, clientY: 30 });
    // 8 palette dots in FCP cycle order
    for (const c of ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray']) {
      expect(screen.getByTestId(`shell-menu-ruler-color-${c}`)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByTestId('shell-menu-ruler-color-red'));
    const added = scene1().markers.at(-1)!;
    expect(added.time).toBe(16);
    expect(added.color).toBe('red');
    expect(screen.queryByTestId('shell-menu-ruler')).not.toBeInTheDocument(); // menu closed
  });

  it('keyboard: arrows rove into the custom color row and Enter picks a color (R13 CodeRabbit fix)', async () => {
    const user = userEvent.setup();
    boot({ playhead: 16 });
    fireEvent.contextMenu(ruler(), { clientX: 30, clientY: 30 });
    // initial focus = first enabled item (add-marker); ArrowDown walks the
    // enabled command items (goto-marker/clear-markers disabled → skipped)
    // and keeps going INTO the custom palette row's dots — custom rows are
    // part of the roving order now, not pointer-only
    await user.keyboard('{ArrowDown>5}'); // add-marker → mark-in → mark-out → clear-inout → loop → red dot
    expect(screen.getByTestId('shell-menu-ruler-color-red')).toHaveFocus();
    // roving continues across the dots (DOM order) and wraps
    await user.keyboard('{ArrowDown}');
    expect(screen.getByTestId('shell-menu-ruler-color-orange')).toHaveFocus();
    // Enter activates the focused dot (button semantics) → colored marker
    await user.keyboard('{Enter}');
    const added = scene1().markers.at(-1)!;
    expect(added.color).toBe('orange');
    expect(added.time).toBe(16);
    expect(screen.queryByTestId('shell-menu-ruler')).not.toBeInTheDocument(); // closed after select
  });
});

/* R14: the in/out brackets are real draggable loop edges — slider semantics,
   pointer-captured drag (x → frame-snapped time), arrow nudging, and the
   ordering law (start <= end ALWAYS; crossing drags the far edge along). */
describe('Ruler in/out brackets (R14 draggable edges)', () => {
  const inB = () => screen.getByTestId('shell-ruler-bracket-in');
  const outB = () => screen.getByTestId('shell-ruler-bracket-out');

  it('both brackets expose slider semantics bound to the loop window (§11.3)', () => {
    boot({}); // fixture loop: start 2 s, end 28 s
    const i = inB(), o = outB();
    expect(i).toHaveAttribute('role', 'slider');
    expect(i).toHaveAttribute('aria-label', 'Loop in point');
    expect(i).toHaveAttribute('aria-valuemin', '0');
    expect(i).toHaveAttribute('aria-valuemax', '720'); // 30 s × 24
    expect(i).toHaveAttribute('aria-valuenow', '48');  // 2 s × 24
    expect(i).toHaveAttribute('aria-valuetext', '00:00:02:00');
    expect(o).toHaveAttribute('aria-label', 'Loop out point');
    expect(o).toHaveAttribute('aria-valuenow', '672'); // 28 s × 24
    expect(i.className).toContain('cursor-ew-resize'); // looks draggable, IS draggable
  });

  it('dragging the in bracket moves loop.start WITHOUT scrubbing the playhead', () => {
    boot({});
    fireEvent.pointerDown(inB(), { pointerId: 2, button: 0 });
    fireEvent.pointerMove(inB(), { pointerId: 2, buttons: 1, clientX: 300 }); // 300/46 s
    expect(store().loop.start).toBeCloseTo(157 / 24, 5); // frame-snapped (R13 grid law)
    expect(store().loop.end).toBe(28);
    expect(store().playhead).toBe(16); // the ruler's own press must not seek
    fireEvent.pointerUp(inB(), { pointerId: 2 });
  });

  it('dragging the in bracket past the out point drags out along (ordering law, R14)', () => {
    boot({});
    fireEvent.pointerDown(inB(), { pointerId: 2, button: 0 });
    fireEvent.pointerMove(inB(), { pointerId: 2, buttons: 1, clientX: 1380 }); // 30 s > 28 s
    expect(store().loop.start).toBe(30);
    expect(store().loop.end).toBe(30); // never inverted — the tick cannot hang
    fireEvent.pointerUp(inB(), { pointerId: 2 });
  });

  it('arrow keys nudge the in bracket ±1 frame (⇧ ×10) and never nudge the playhead', () => {
    boot({});
    fireEvent.keyDown(inB(), { key: 'ArrowLeft' });
    expect(store().loop.start).toBeCloseTo(2 - 1 / 24, 5);
    expect(store().playhead).toBe(16); // stopPropagation beats the ruler root's nudge
    fireEvent.keyDown(inB(), { key: 'ArrowRight', shiftKey: true });
    expect(store().loop.start).toBeCloseTo(2 - 1 / 24 + 10 / 24, 5);
  });

  it('the out bracket moves loop.end; dragging it below start pulls start along (ordering law)', () => {
    boot({});
    fireEvent.keyDown(outB(), { key: 'ArrowLeft' });
    expect(store().loop.end).toBeCloseTo(28 - 1 / 24, 5);
    fireEvent.pointerDown(outB(), { pointerId: 3, button: 0 });
    fireEvent.pointerMove(outB(), { pointerId: 3, buttons: 1, clientX: 46 }); // 1 s < start
    expect(store().loop.end).toBe(1);
    expect(store().loop.start).toBe(1); // pulled along — same markOut formula
    fireEvent.pointerUp(outB(), { pointerId: 3 });
  });
});
