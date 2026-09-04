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
    expect(store().playhead).toBeCloseTo(200 / 46, 5);
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
