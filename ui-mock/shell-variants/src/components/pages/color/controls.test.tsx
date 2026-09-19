/* controls — R24-W5a (DESIGN-R24 §2 F2-P2): the MicroSlider contract pins.
   The F2 finding: double-click wrote the range MIDPOINT, not the param's
   documented default (Gamma luma 1 → 2.125 live — a fabricated value). The
   fix threads the default through a resetTo prop (the NumberField §5A
   grammar): dbl-click writes it; without one the gesture is an honest no-op.
   These pins hold the component-level law; WheelsPanel.test.tsx holds the
   panel-level threading (the grade rows + the spec 08 defaults).

   R24-W5c (DESIGN-R24 §2 F4-P3): the guarded-capture pin — the setup.ts
   stub no-ops setPointerCapture, so the inactive-pointer-id throw is
   simulated by stubbing it to THROW; the guarded handler must survive
   (the Fader/Knob/PanBox law). */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MicroSlider } from './controls';

const mount = (props: Partial<Parameters<typeof MicroSlider>[0]> = {}) =>
  render(
    <MicroSlider
      ariaLabel="Test slider"
      value={1}
      min={0.25}
      max={4}
      step={0.01}
      onChange={() => { /* default stub */ }}
      {...props}
    />,
  );

describe('MicroSlider — the double-click reset law (R24-W5a F2-P2)', () => {
  it('dbl-click writes the threaded DEFAULT (resetTo), never the range midpoint', () => {
    const onChange = vi.fn();
    // the live F2 case: Gamma luma at 1, range 0.25–4 (midpoint 2.125)
    mount({ ariaLabel: 'Gamma luma', value: 1, resetTo: 1, onChange });
    fireEvent.doubleClick(screen.getByRole('slider', { name: 'Gamma luma' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(1); // the spec 08 default…
    expect(onChange).not.toHaveBeenCalledWith(2.125); // …NOT the midpoint (F2 live)
  });

  it('dbl-click resets from a NON-default position too — one write, the default value', () => {
    const onChange = vi.fn();
    mount({ ariaLabel: 'Temp', value: 42.5, min: -100, max: 100, step: 0.5, resetTo: 0, onChange });
    fireEvent.doubleClick(screen.getByRole('slider', { name: 'Temp' }));
    expect(onChange).toHaveBeenCalledWith(0); // NOT 0 = the -100..100 midpoint
    expect(onChange).not.toHaveBeenCalledWith(0.0000001);
  });

  it('no resetTo threaded → dbl-click is an honest NO-OP (the NumberField §5A grammar)', () => {
    const onChange = vi.fn();
    mount({ onChange });
    fireEvent.doubleClick(screen.getByRole('slider', { name: 'Test slider' }));
    expect(onChange).not.toHaveBeenCalled(); // nothing honest to write
  });
});

describe('MicroSlider — the guarded pointer capture (R24-W5c F4-P3)', () => {
  it('a synthetic pointerdown with a bogus pointer id NEVER throws — the capture is best-effort, the gesture survives', () => {
    /* jsdom's setPointerCapture is a setup.ts no-op; REAL browsers throw
       NotFoundError for an inactive/synthetic pointer id (test automation,
       synthetic events). Stub the throw and fire the exact event: the old
       unguarded call propagated the exception out of the handler. */
    const real = Element.prototype.setPointerCapture;
    Element.prototype.setPointerCapture = () => {
      throw new DOMException('Invalid pointer id', 'NotFoundError');
    };
    try {
      const onChange = vi.fn();
      mount({ value: 1, onChange });
      const s = screen.getByRole('slider', { name: 'Test slider' });
      s.getBoundingClientRect = () =>
        ({ left: 0, width: 100, right: 100, top: 0, height: 14, bottom: 14, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
      // the bogus pointer id: capture throws, the handler survives, the
      // drag buffer engaged (the move + up still complete the gesture)
      expect(() => fireEvent.pointerDown(s, { pointerId: 9999, clientX: 40 })).not.toThrow();
      fireEvent.pointerMove(s, { buttons: 1, pointerId: 9999, clientX: 40 });
      expect(onChange).not.toHaveBeenCalled(); // nothing committed mid-gesture
      fireEvent.pointerUp(s, { pointerId: 9999 });
      expect(onChange).toHaveBeenCalledTimes(1); // the gesture COMMITTED
      expect(onChange).toHaveBeenCalledWith(1.75); // 40% of 0.25..4
    } finally {
      Element.prototype.setPointerCapture = real;
    }
  });
});

describe('MicroSlider — the slider aria + keyboard grammar (held for W5a)', () => {
  it('role=slider with the min/max/now/orientation contract', () => {
    mount({ value: 2, valueText: '2.000' });
    const s = screen.getByRole('slider', { name: 'Test slider' });
    expect(s).toHaveAttribute('aria-valuemin', '0.25');
    expect(s).toHaveAttribute('aria-valuemax', '4');
    expect(s).toHaveAttribute('aria-valuenow', '2');
    expect(s).toHaveAttribute('aria-valuetext', '2.000');
    expect(s).toHaveAttribute('aria-orientation', 'horizontal');
    expect(s).toHaveAttribute('tabindex', '0');
  });

  it('arrows step (shift ×5); Home/End clamp — discrete commits, one onChange each', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // store-driven: the component reads the value PROP (the parent feeds each
    // commit back), so the stub's fixed value 1 is the base for every key
    mount({ value: 1, onChange });
    const s = screen.getByRole('slider', { name: 'Test slider' });
    s.focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(1.01);
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(onChange).toHaveBeenLastCalledWith(1.05); // ×5 from the same base
    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith(0.25);
    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith(4);
    expect(onChange).toHaveBeenCalledTimes(4); // one write per key — no fan-out
  });
});
