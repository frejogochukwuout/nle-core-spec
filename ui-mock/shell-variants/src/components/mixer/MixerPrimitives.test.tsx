/* Mixer primitives tests — Fader (controlled dB slider, keyboard grammar per
   design doc §6), PanKnob (R15-A1 DAW dial grammar: vertical drag
   ±range/200 per 100px, Shift ×0.2 fine, non-passive wheel,
   pointer-release-only detent, arc/indicator geometry, bubble), and
   StripMeter over the shared engine (R15-A2: token palette, LED segments,
   peak line, mute/clip, engine lifecycle + reset).
   R19-B1: the fader's DISPLAY geometry moved to the reference taper —
   piecewise map unit tests (anchors, round-trip, clamps, monotonicity),
   6px groove / 22×36 thumb / 24px headroom / reference scale marks, and
   drag math routed through the map (px→pos→dB, model-clamped −60..+6).
   StripMeter: the fixed 14px column (th_mto617w1 — never w-full).
   PanBox: the reference pan crosshair box with knob semantics.
   R20-W1: B7 pointer-release discipline (up/cancel/lostpointercapture clear
   the drag anchor), B8 aria-orientation on both sliders, B9 the meter fill
   maps through the SAME taper as the fader (0dB@85% fill, zone stops
   re-anchored to 37.2/69.2), D2 the FaderGridlines gradient stops.
   Drag math is exercised by mocking getBoundingClientRect where needed
   (jsdom reports 0×0); the knob drag grammar is clientY-relative so it needs
   no rect at all. */

import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Fader, PanKnob, PanBox, StripMeter, FaderGridlines, dbToPos, posToDb, dbHeadroomLabel, FADER_TAPER } from './MixerPrimitives';
import { useUi } from '../../state/useUiStore';
import { __reset, __setLevel, meterGetSnapshot } from '../../lib/meterEngine';

const fakeRect = (height: number, width = 46): DOMRect =>
  ({ top: 0, left: 0, right: width, bottom: height, width, height, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

/* ---------- the piecewise display taper (R19-B1, th_mtoyq7jt) ---------- */
describe('piecewise display taper (dbToPos / posToDb)', () => {
  it('maps every reference anchor exactly (0dB@15%, −5@28 … −50@98%, +10 headroom, −60 floor)', () => {
    for (const t of FADER_TAPER) {
      expect(dbToPos(t.db)).toBe(t.pos);
      expect(posToDb(t.pos)).toBe(t.db);
    }
  });

  it('round-trips dB→pos→dB across the model range to float precision', () => {
    for (let db = -60; db <= 6; db += 0.7) {
      expect(posToDb(dbToPos(db))).toBeCloseTo(db, 10);
    }
    // and pos→dB→pos the other way
    for (let p = 0; p <= 1; p += 0.031) {
      expect(dbToPos(posToDb(p))).toBeCloseTo(p, 10);
    }
  });

  it('is strictly monotonic (louder = higher up the travel)', () => {
    let prev = -Infinity;
    for (let db = 6; db >= -60; db -= 1.3) {
      const pos = dbToPos(db);
      expect(pos).toBeGreaterThan(prev);
      prev = pos;
    }
  });

  it('clamps outside the taper (display-only guard; the MODEL stays −60..+6)', () => {
    expect(dbToPos(20)).toBe(0);
    expect(dbToPos(-70)).toBe(1);
    expect(posToDb(-0.5)).toBe(10);  // above the model max — view-layer only
    expect(posToDb(2)).toBe(-60);
    // +6 (model max) sits inside the +10 headroom at 6%
    expect(dbToPos(6)).toBeCloseTo(0.06, 10);
  });

  it('dbHeadroomLabel: signed 1dp, NO unit, −∞ at the floor (reference "+0.3" format)', () => {
    expect(dbHeadroomLabel(-6)).toBe('-6.0');
    expect(dbHeadroomLabel(0)).toBe('0.0');
    expect(dbHeadroomLabel(3.5)).toBe('+3.5');
    expect(dbHeadroomLabel(-60)).toBe('−∞');
    expect(dbHeadroomLabel(-100)).toBe('−∞');
  });
});

describe('Fader', () => {
  it('is a labelled slider with dB range/value semantics (design doc §6)', () => {
    render(<Fader db={-6} onChange={() => {}} ariaLabel="Test fader" />);
    const f = screen.getByRole('slider', { name: 'Test fader' });
    expect(f).toHaveAttribute('aria-valuemin', '-60');
    expect(f).toHaveAttribute('aria-valuemax', '6');
    expect(f).toHaveAttribute('aria-valuenow', '-6');
    expect(f).toHaveAttribute('aria-valuetext', '-6.0 dB');
    expect(f).toHaveAttribute('aria-orientation', 'vertical'); // R20-W1 B8
    expect(screen.getByText('-6.0')).toBeInTheDocument(); // headroom readout (no unit)
  });

  it('keyboard grammar: arrows ±1 dB, ⇧ fine ±0.2, Page ±6, Home −∞, End +6 (design doc §6)', () => {
    const onChange = vi.fn();
    render(<Fader db={-6} onChange={onChange} ariaLabel="Test fader" />);
    const f = screen.getByRole('slider', { name: 'Test fader' });
    fireEvent.keyDown(f, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenCalledWith(-5);
    fireEvent.keyDown(f, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenCalledWith(-7);
    fireEvent.keyDown(f, { key: 'ArrowUp', shiftKey: true });
    expect(onChange).toHaveBeenCalledWith(-5.8);
    fireEvent.keyDown(f, { key: 'PageUp' });
    expect(onChange).toHaveBeenCalledWith(0);
    fireEvent.keyDown(f, { key: 'PageDown' });
    expect(onChange).toHaveBeenCalledWith(-12);
    fireEvent.keyDown(f, { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith(-60);
    fireEvent.keyDown(f, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith(6);
    expect(onChange).toHaveBeenCalledTimes(7);
  });

  it('double-click resets to unity 0 dB (drag grammar SCOUT-R8-C)', () => {
    const onChange = vi.fn();
    render(<Fader db={-6} onChange={onChange} ariaLabel="Test fader" />);
    fireEvent.doubleClick(screen.getByRole('slider', { name: 'Test fader' }));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('pointer drag routes through the piecewise map: jump-to-pos, relative drag, ⇧ fine, model clamp', () => {
    const onChange = vi.fn();
    render(<Fader db={-6} onChange={onChange} ariaLabel="Test fader" height={96} />);
    const f = screen.getByRole('slider', { name: 'Test fader' });
    f.getBoundingClientRect = () => fakeRect(96);
    // jump-to-position: 24px down a 96px column → pos 0.25 → the segment
    // [0@15% .. −5@28%] → −3.846 dB (the OLD linear map said −10.5)
    fireEvent.pointerDown(f, { pointerId: 1, button: 0, clientY: 24 });
    expect(onChange).toHaveBeenLastCalledWith(posToDb(0.25));
    expect(onChange.mock.calls.at(-1)![0]).toBeCloseTo(-3.846, 2);
    // th_mtr0prj5 (#55): drag 24px UP → pos 0.25 → 0 → +6 dB (MODEL_MAX) —
    // the thumb FOLLOWS the pointer (the old sign ran it away; re-pinned)
    fireEvent.pointerMove(f, { pointerId: 1, buttons: 1, clientY: 0 });
    expect(onChange).toHaveBeenLastCalledWith(6);
    // shift = fine: 72px DOWN from the GRAB at ×0.25 → pos 0.25+0.1875 =
    // 0.4375 → segment [−10@42% .. −15@55%] → −10.673 dB
    fireEvent.pointerMove(f, { pointerId: 1, buttons: 1, clientY: 96, shiftKey: true });
    expect(onChange.mock.calls.at(-1)![0]).toBeCloseTo(-10.673, 2);
    // drag far beyond the BOTTOM → pos clamps to 1 → model floor −60
    fireEvent.pointerMove(f, { pointerId: 1, buttons: 1, clientY: 1064 });
    expect(onChange).toHaveBeenLastCalledWith(-60);
  });

  /* th_mtr0prj5 (#55) — the physical law the reviewer pinned: dragging UP
   * makes the fader LOUDER, dragging DOWN makes it QUIETER, and the thumb
   * tracks the cursor 1:1 (pos from the top). */
  it('#55: the thumb FOLLOWS the pointer — up = louder, down = quieter (the reversal is dead)', () => {
    const onChange = vi.fn();
    render(<Fader db={-6} onChange={onChange} ariaLabel="Follow fader" height={96} />);
    const f = screen.getByRole('slider', { name: 'Follow fader' });
    f.getBoundingClientRect = () => fakeRect(96);
    // grab at pos 0.25 (−3.846 dB), drag UP 24px → pos 0 → +6
    fireEvent.pointerDown(f, { pointerId: 1, button: 0, clientY: 24 });
    fireEvent.pointerMove(f, { pointerId: 1, buttons: 1, clientY: 0 });
    expect(onChange.mock.calls.at(-1)![0]).toBe(6); // UP = the model MAX
    // drag DOWN 96px from the same grab → pos 0.25 + 1 = 1.25 → clamped 1 → −60
    fireEvent.pointerMove(f, { pointerId: 1, buttons: 1, clientY: 120 });
    expect(onChange).toHaveBeenLastCalledWith(-60); // DOWN = the model floor
    fireEvent.pointerUp(f, { pointerId: 1 });
  });

  it('B7: pointerup / pointercancel / lostpointercapture clear the drag anchor — no stale startPos', () => {
    const onChange = vi.fn();
    render(<Fader db={-6} onChange={onChange} ariaLabel="Test fader" height={96} />);
    const f = screen.getByRole('slider', { name: 'Test fader' });
    f.getBoundingClientRect = () => fakeRect(96);
    fireEvent.pointerDown(f, { pointerId: 1, button: 0, clientY: 24 });
    expect(onChange).toHaveBeenCalledTimes(1);
    // released drag: a stray pointermove (buttons held elsewhere) is ignored
    fireEvent.pointerUp(f, { pointerId: 1, buttons: 0, clientY: 0 });
    fireEvent.pointerMove(f, { pointerId: 1, buttons: 1, clientY: 0 });
    expect(onChange).toHaveBeenCalledTimes(1);
    // same discipline on pointercancel + lostpointercapture
    fireEvent.pointerDown(f, { pointerId: 2, button: 0, clientY: 24 });
    fireEvent.pointerCancel(f, { pointerId: 2, buttons: 1, clientY: 0 });
    fireEvent.pointerMove(f, { pointerId: 2, buttons: 1, clientY: 0 });
    expect(onChange).toHaveBeenCalledTimes(2);
    fireEvent.pointerDown(f, { pointerId: 3, button: 0, clientY: 24 });
    fireEvent(f, new Event('lostpointercapture', { bubbles: true }));
    fireEvent.pointerMove(f, { pointerId: 3, buttons: 1, clientY: 0 });
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('the thumb position follows the controlled db value through the taper — pinned by the stable data-testid hook', () => {
    const { rerender } = render(<Fader db={0} onChange={() => {}} ariaLabel="Test fader" height={96} />);
    const f = screen.getByRole('slider', { name: 'Test fader' });
    const thumb = f.querySelector('[data-testid="fader-thumb"]') as HTMLElement | null;
    expect(thumb).not.toBeNull();
    // 0 dB sits at 15% from the TOP (the reference anchor); −60 at 100%
    expect(thumb!.style.top).toBe('15%');
    rerender(<Fader db={-60} onChange={() => {}} ariaLabel="Test fader" height={96} />);
    expect((f.querySelector('[data-testid="fader-thumb"]') as HTMLElement)!.style.top).toBe('100%');
  });
});

describe('Fader R19-B1 reference geometry (th_mtoyq7jt / th_mto617w1)', () => {
  it('groove is 6px inside a wide 46px hit column (reference §2.5)', () => {
    const { container } = render(<Fader db={-6} onChange={() => {}} ariaLabel="Test fader" />);
    const groove = container.querySelector('[data-testid="fader-groove"]') as HTMLElement;
    expect(groove.className).toContain('w-[6px]');
    const f = screen.getByRole('slider', { name: 'Test fader' });
    expect(f.className).toContain('w-[46px]'); // the whole column is the drag target
  });

  it('thumb: 22×36 gradient with grip lines; the accent prop swaps to the master pair (flat)', () => {
    const { container, rerender } = render(<Fader db={-6} onChange={() => {}} ariaLabel="Test fader" />);
    const thumb = () => container.querySelector('[data-testid="fader-thumb"]') as HTMLElement;
    expect(thumb().className).toContain('w-[22px]');
    expect(thumb().className).toContain('h-[36px]');
    expect(thumb().style.background).toContain('var(--fader-thumb-1)');
    expect(thumb().style.background).toContain('var(--fader-thumb-2)');
    expect(container.querySelector('[data-testid="fader-grip"]')).not.toBeNull();
    rerender(<Fader db={-6} onChange={() => {}} ariaLabel="Test fader" accent />);
    expect(thumb().style.background).toContain('var(--fader-cap-accent-1)');
    expect(thumb().style.background).toContain('var(--fader-cap-accent-2)');
  });

  it('track chrome: end caps at both travel stops + the 0 dB unity notch at the 15% anchor', () => {
    const { container } = render(<Fader db={-6} onChange={() => {}} ariaLabel="Test fader" />);
    expect(container.querySelector('[data-testid="fader-endcap-top"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="fader-endcap-bottom"]')).not.toBeNull();
    const notch = container.querySelector('[data-testid="fader-unity-notch"]') as HTMLElement;
    expect(notch.className).toContain('h-[1px]'); // 1px, 2px past both groove sides
    expect(notch.className).toContain('w-[10px]');
    expect(notch.style.top).toBe('15%'); // 0 dB anchor, from the top
  });

  it('dB scale column: opt-in, aria-hidden, 8px right-aligned labels at the reference piecewise positions', () => {
    const { container, rerender } = render(<Fader db={-6} onChange={() => {}} ariaLabel="Test fader" />);
    expect(container.querySelector('[data-testid="fader-scale"]')).toBeNull(); // plain faders stay lean
    rerender(<Fader db={-6} onChange={() => {}} ariaLabel="Test fader" scale />);
    const scale = container.querySelector('[data-testid="fader-scale"]') as HTMLElement;
    expect(scale.getAttribute('aria-hidden')).toBe('true');
    expect(scale.className).toContain('text-[8px]');
    expect(scale.className).toContain('text-right');
    expect(scale.className).toContain('w-[14px]'); // the 14px scale column (reference)
    const byText: Record<string, HTMLElement> = {};
    for (const el of Array.from(scale.querySelectorAll('span'))) byText[el.textContent!] = el as HTMLElement;
    // reference marks (§2.5): 0@15 · −5@28 · −10@42 · −15@55 · −20@68 · −30@80 · −40@90 · −50@98
    const expected: [string, number][] = [
      ['0', 15], ['−5', 28], ['−10', 42], ['−15', 55],
      ['−20', 68], ['−30', 80], ['−40', 90], ['−50', 98],
    ];
    for (const [label, top] of expected) {
      expect(byText[label]).toBeDefined();
      expect(parseFloat(byText[label].style.top)).toBeCloseTo(top, 6);
      expect(byText[label].style.transform).toBe('translateY(-50%)'); // centers on its position
    }
    // the old linear labels are gone
    expect(byText['+6']).toBeUndefined();
    expect(byText['−∞']).toBeUndefined();
    expect(byText['−48']).toBeUndefined();
  });

  it('headroom strip: 24px, signed 1dp no unit, opt-out for strips that share one with the meter', () => {
    const { container, rerender } = render(<Fader db={-12} onChange={() => {}} ariaLabel="Test fader" />);
    const head = () => container.querySelector('[data-testid="fader-headroom"]') as HTMLElement | null;
    expect(head()).not.toBeNull();
    expect(head()!.className).toContain('h-[24px]');
    expect(head()!.textContent).toBe('-12.0'); // no unit (th_mtoyq7jt)
    rerender(<Fader db={-12} onChange={() => {}} ariaLabel="Test fader" headroom={false} />);
    expect(head()).toBeNull(); // strips render the SHARED HeadroomReadout instead
  });
});

describe('PanKnob (R15-A1 — DAW dial grammar)', () => {
  it('is a labelled slider with C/L/R value text (design doc §6)', () => {
    render(<PanKnob pan={0} onChange={() => {}} ariaLabel="Test pan" />);
    const p = screen.getByRole('slider', { name: 'Test pan' });
    expect(p).toHaveAttribute('aria-valuemin', '-100');
    expect(p).toHaveAttribute('aria-valuemax', '100');
    expect(p).toHaveAttribute('aria-valuetext', 'C');
    expect(screen.getByText('C')).toBeInTheDocument(); // persistent knob label
  });

  it('keyboard: arrows ±5, ⇧ fine ±1, double-click centers (design doc §6)', () => {
    const onChange = vi.fn();
    render(<PanKnob pan={0} onChange={onChange} ariaLabel="Test pan" />);
    const p = screen.getByRole('slider', { name: 'Test pan' });
    fireEvent.keyDown(p, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(5);
    fireEvent.keyDown(p, { key: 'ArrowLeft', shiftKey: true });
    expect(onChange).toHaveBeenCalledWith(-1);
    fireEvent.doubleClick(p);
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('keyboard NEVER detents — ±1 from center stays off-center (C2: detent is pointer-release only)', () => {
    const onChange = vi.fn();
    render(<PanKnob pan={0} onChange={onChange} ariaLabel="Test pan" />);
    const p = screen.getByRole('slider', { name: 'Test pan' });
    fireEvent.keyDown(p, { key: 'ArrowRight', shiftKey: true });
    expect(onChange).toHaveBeenCalledWith(1); // 1 ≠ 0 — would snap under a keyboard detent
    fireEvent.keyDown(p, { key: 'ArrowLeft', shiftKey: true });
    expect(onChange).toHaveBeenCalledWith(-1); // −1 ≠ 0 — fine steps pass through center
  });

  it('vertical drag: Δv = −Δy·range/200 (100px = half the ±100 range), clamped, ⇧ ×0.2 fine', () => {
    const onChange = vi.fn();
    render(<PanKnob pan={0} onChange={onChange} ariaLabel="Test pan" />);
    const p = screen.getByRole('slider', { name: 'Test pan' });
    fireEvent.pointerDown(p, { pointerId: 1, button: 0, clientY: 100 });
    fireEvent.pointerMove(p, { pointerId: 1, buttons: 1, clientY: 0 }); // 100px up → +100
    expect(onChange).toHaveBeenCalledWith(100);
    fireEvent.pointerMove(p, { pointerId: 1, buttons: 1, clientY: -400 }); // beyond max → clamped
    expect(onChange).toHaveBeenCalledWith(100);
    // from the SAME grab (startValue 0): 150px down, shift fine ×0.2 → −30
    fireEvent.pointerMove(p, { pointerId: 1, buttons: 1, clientY: 250, shiftKey: true });
    expect(onChange).toHaveBeenCalledWith(-30);
  });

  it('drag deltas are relative to the GRABBED value — the knob never jumps to the pointer', () => {
    // stateful harness so the controlled value follows the drag like the real strips
    function Harness() {
      const [pan, setPan] = useState(-30);
      return <PanKnob pan={pan} onChange={setPan} ariaLabel="Test pan" />;
    }
    render(<Harness />);
    const p = screen.getByRole('slider', { name: 'Test pan' });
    // grab, drag up 100px → −30 + 100 = 70
    fireEvent.pointerDown(p, { pointerId: 1, button: 0, clientY: 300 });
    fireEvent.pointerMove(p, { pointerId: 1, buttons: 1, clientY: 200 });
    expect(p).toHaveAttribute('aria-valuenow', '70');
    fireEvent.pointerUp(p, { pointerId: 1 });
    // re-grab BELOW the dial center — 10px down → 70 − 10 = 60 (not a jump to min)
    fireEvent.pointerDown(p, { pointerId: 1, button: 0, clientY: 50 });
    fireEvent.pointerMove(p, { pointerId: 1, buttons: 1, clientY: 60 });
    expect(p).toHaveAttribute('aria-valuenow', '60');
  });

  it('detent: pointer-release snaps |v| ≤ 2 to center — outside the radius it does not', () => {
    const onChange = vi.fn();
    render(<PanKnob pan={0} onChange={onChange} ariaLabel="Test pan" />);
    const p = screen.getByRole('slider', { name: 'Test pan' });
    // 2px up → +2 → within the detent radius → release snaps to 0
    fireEvent.pointerDown(p, { pointerId: 1, button: 0, clientY: 100 });
    fireEvent.pointerMove(p, { pointerId: 1, buttons: 1, clientY: 98 });
    expect(onChange).toHaveBeenCalledWith(2);
    fireEvent.pointerUp(p, { pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(0);
    // 10px up → +10 → outside the radius → release keeps the value
    fireEvent.pointerDown(p, { pointerId: 1, button: 0, clientY: 100 });
    fireEvent.pointerMove(p, { pointerId: 1, buttons: 1, clientY: 90 });
    fireEvent.pointerUp(p, { pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(10);
  });

  it('pointercancel resets the drag — no further moves, no detent on a later release', () => {
    const onChange = vi.fn();
    render(<PanKnob pan={0} onChange={onChange} ariaLabel="Test pan" />);
    const p = screen.getByRole('slider', { name: 'Test pan' });
    fireEvent.pointerDown(p, { pointerId: 1, button: 0, clientY: 100 });
    fireEvent.pointerMove(p, { pointerId: 1, buttons: 1, clientY: 98 }); // +2 (detent range)
    fireEvent.pointerCancel(p, { pointerId: 1 });
    const calls = onChange.mock.calls.length;
    fireEvent.pointerMove(p, { pointerId: 1, buttons: 1, clientY: 0 }); // drag state gone → ignored
    expect(onChange.mock.calls.length).toBe(calls);
    fireEvent.pointerUp(p, { pointerId: 1 }); // no drag → no detent either
    expect(onChange.mock.calls.length).toBe(calls);
  });

  it('arc + indicator geometry: 270° law, dasharray against the 183.5 path, needle ABOVE center (C2 fix)', () => {
    const { container, rerender } = render(<PanKnob pan={-100} onChange={() => {}} ariaLabel="Test pan" />);
    const line = () => container.querySelector('[data-testid="knob-indicator"]')!;
    const active = () => container.querySelector('[data-testid="knob-active-arc"]')!;
    // indicator line sits ABOVE center: y 35→20 (the C2 antiphase fix)
    expect(line().getAttribute('x1')).toBe('50');
    expect(line().getAttribute('y1')).toBe('35');
    expect(line().getAttribute('y2')).toBe('20');
    expect(line().getAttribute('stroke-width')).toBe('7'); // ≈1.5px at 22px (C2 legibility)
    // full sweep −135..+135; dash = (θ+135)/270 · 183.5 against the MEASURED path
    expect(line().getAttribute('transform')).toBe('rotate(-135 50 50)');
    expect(active().getAttribute('stroke-dasharray')).toBe('0 183.5');
    rerender(<PanKnob pan={0} onChange={() => {}} ariaLabel="Test pan" />);
    expect(line().getAttribute('transform')).toBe('rotate(0 50 50)');
    expect(active().getAttribute('stroke-dasharray')).toBe('91.75 183.5');
    rerender(<PanKnob pan={100} onChange={() => {}} ariaLabel="Test pan" />);
    expect(line().getAttribute('transform')).toBe('rotate(135 50 50)');
    expect(active().getAttribute('stroke-dasharray')).toBe('183.5 183.5');
    // NO endpoint ticks (C2: sub-pixel at our sizes) — track arc + active arc
    // + indicator + center dot is the whole dial face
    expect(container.querySelector('svg')!.childElementCount).toBe(4);
  });

  it('wheel: non-passive native listener — step = range·0.02, ⇧ ×0.2, default prevented', () => {
    const onChange = vi.fn();
    const { container } = render(<PanKnob pan={0} onChange={onChange} ariaLabel="Test pan" />);
    const p = screen.getByRole('slider', { name: 'Test pan' });
    expect(container.querySelector('[data-testid="knob-track-arc"]')!.getAttribute('stroke')).toBe('var(--knob-track)');
    const up = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
    p.dispatchEvent(up);
    expect(onChange).toHaveBeenCalledWith(4); // 200 · 0.02
    expect(up.defaultPrevented).toBe(true); // the page must never scroll
    // shift fine from the CONTROLLED value (still 0 — the mock never applied it)
    const down = new WheelEvent('wheel', { deltaY: 100, shiftKey: true, bubbles: true, cancelable: true });
    p.dispatchEvent(down);
    expect(onChange).toHaveBeenCalledWith(-0.8); // 0 − 200·0.02·0.2
  });

  it('value bubble: hover + drag only, mono readout of the same format; persistent label always', () => {
    const { container } = render(<PanKnob pan={25} onChange={() => {}} ariaLabel="Test pan" />);
    const p = screen.getByRole('slider', { name: 'Test pan' });
    const bubble = () => container.querySelector('[data-testid="knob-bubble"]');
    expect(bubble()).toBeNull(); // hidden at rest
    expect(screen.getByText('R25')).toBeInTheDocument(); // persistent label stays
    fireEvent.pointerEnter(p);
    expect(bubble()).not.toBeNull();
    expect(bubble()!.textContent).toBe('R25');
    fireEvent.pointerLeave(p);
    expect(bubble()).toBeNull();
    fireEvent.pointerDown(p, { pointerId: 1, button: 0, clientY: 100 });
    expect(bubble()).not.toBeNull(); // drag keeps it up
    fireEvent.pointerUp(p, { pointerId: 1 });
    expect(bubble()).toBeNull();
  });
});

/* ---------- PanBox (R19-B1 — reference pan crosshair box) ---------- */
describe('PanBox (reference §2.4 row 6 — knob semantics in the box look)', () => {
  it('is a 48×48 labelled slider with C/L/R value text (knob semantics kept)', () => {
    render(<PanBox pan={0} onChange={() => {}} ariaLabel="Test pan" />);
    const b = screen.getByRole('slider', { name: 'Test pan' });
    expect(b.className).toContain('w-[48px]');
    expect(b.className).toContain('h-[48px]');
    expect(b).toHaveAttribute('aria-valuemin', '-100');
    expect(b).toHaveAttribute('aria-valuemax', '100');
    expect(b).toHaveAttribute('aria-valuetext', 'C');
    expect(b).toHaveAttribute('aria-orientation', 'horizontal'); // R20-W1 B8
    expect(screen.getByTitle(/Test pan: C/)).toBeInTheDocument(); // value via title (aria-hidden dot)
  });

  it('R20-W1 D1.3: the lean-tier 36px box (T1/T2 pan 48→36) keeps the same grammar', () => {
    render(<PanBox pan={0} onChange={() => {}} ariaLabel="Test pan" size={36} />);
    const b = screen.getByRole('slider', { name: 'Test pan' });
    expect(b.className).toContain('w-[36px]');
    expect(b.className).toContain('h-[36px]');
  });

  it('mono dot at left = 50 + pan/2 %, top 25% (reference geometry)', () => {
    const { container, rerender } = render(<PanBox pan={0} onChange={() => {}} ariaLabel="Test pan" />);
    const dot = () => container.querySelector('[data-testid="pan-dot"]') as HTMLElement;
    expect(dot().style.left).toBe('50%');
    rerender(<PanBox pan={50} onChange={() => {}} ariaLabel="Test pan" />);
    expect(dot().style.left).toBe('75%');
    rerender(<PanBox pan={-100} onChange={() => {}} ariaLabel="Test pan" />);
    expect(dot().style.left).toBe('0%');
  });

  it('keyboard: arrows ±5, ⇧ fine ±1, double-click centers (same grammar as the knob)', () => {
    const onChange = vi.fn();
    render(<PanBox pan={0} onChange={onChange} ariaLabel="Test pan" />);
    const b = screen.getByRole('slider', { name: 'Test pan' });
    fireEvent.keyDown(b, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(5);
    fireEvent.keyDown(b, { key: 'ArrowLeft', shiftKey: true });
    expect(onChange).toHaveBeenCalledWith(-1);
    fireEvent.doubleClick(b);
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('horizontal drag: jump-to-position then relative, clamped (48px = ±100)', () => {
    const onChange = vi.fn();
    render(<PanBox pan={0} onChange={onChange} ariaLabel="Test pan" />);
    const b = screen.getByRole('slider', { name: 'Test pan' });
    b.getBoundingClientRect = () => fakeRect(48, 48);
    // click at 12px of 48 → 25% → pan −50
    fireEvent.pointerDown(b, { pointerId: 1, button: 0, clientX: 12, clientY: 24 });
    expect(onChange).toHaveBeenLastCalledWith(-50);
    // drag 24px right from the grab → +100 → clamped at +50... −50 + (24/48·200) = +50
    fireEvent.pointerMove(b, { pointerId: 1, buttons: 1, clientX: 36, clientY: 24 });
    expect(onChange).toHaveBeenLastCalledWith(50);
    // far right → clamped to +100
    fireEvent.pointerMove(b, { pointerId: 1, buttons: 1, clientX: 999, clientY: 24 });
    expect(onChange).toHaveBeenLastCalledWith(100);
  });
});

describe('StripMeter (R15-A2 — shared engine view)', () => {
  it('is aria-hidden with the dB exposed via title — never an aria-live region (design doc §4)', () => {
    render(<StripMeter trackId="t1" db={-6} label="A1" height={40} width={4} />);
    const meter = screen.getByTitle(/A1: -6\.0 dB/);
    expect(meter).toHaveAttribute('aria-hidden', 'true');
    expect(meter.querySelectorAll('[data-channel]')).toHaveLength(2); // stereo pair (l + r)
  });

  it('the meter column is a FIXED 14px default — never w-full (th_mto617w1)', () => {
    const { container } = render(<StripMeter trackId="t1" db={-6} label="A1" />);
    const meter = screen.getByTitle(/A1: -6\.0 dB/);
    // default: 2×6.5px stereo bars + 1px gap = 14px total (reference §2.5)
    expect(meter.style.width).toBe('14px');
    const { rerender } = render(<StripMeter trackId="t2" db={-6} label="B1" fillHeight />);
    const rail = screen.getByTitle(/B1: -6\.0 dB/);
    // fillHeight fills the parent's HEIGHT only — the width stays fixed
    expect(rail.style.width).toBe('14px');
    expect(rail.className).toContain('h-full');
    expect(rail.className).not.toContain('w-full'); // the squeeze bug, dead
    rerender(<StripMeter trackId="t2" db={-6} label="B1" fillHeight width={17.5} />);
    expect(screen.getByTitle(/B1: -6\.0 dB/).style.width).toBe('36px'); // bridge rail passes its own
    expect(container).toBeDefined();
  });

  it('shows −∞ for a fully-cold fader', () => {
    render(<StripMeter trackId="t2" db={-60} label="M" height={40} width={4} />);
    expect(screen.getByTitle(/M: −∞/)).toBeInTheDocument();
  });

  it('title carries the live peak in dB (pinned contract: fader dB + live peak)', () => {
    render(<StripMeter trackId="t1" db={-6} label="A1" height={40} width={4} />);
    expect(screen.getByTitle(/A1: -6\.0 dB · peak −∞/)).toBeInTheDocument();
    act(() => { __setLevel('t1', -6); });
    expect(screen.getByTitle(/A1: -6\.0 dB · peak -6\.0 dB/)).toBeInTheDocument();
  });

  it('B9: meter fill maps through the fader taper — 0dB@85% fill, −60@0%, −12@52.8% (contract §4.4)', () => {
    render(<StripMeter trackId="t1" db={-6} label="A1" height={40} width={4} />);
    const meter = screen.getByTitle(/A1: -6\.0 dB/);
    const fill = (ch: string) => meter.querySelector(`[data-channel="${ch}"] > div`) as HTMLElement;
    expect(fill('l').style.clipPath).toBe('inset(100% 0 0 0)'); // silent → nothing revealed
    act(() => { __setLevel('t1', -12); });
    // 1 − dbToPos(−12) = 1 − 0.472 = 0.528 → 52.8% revealed (was 80% dB-linear)
    expect(fill('l').style.clipPath).toBe('inset(47.2% 0 0 0)');
    act(() => { __setLevel('t1', -60); });
    expect(fill('l').style.clipPath).toBe('inset(100% 0 0 0)'); // at the floor
    act(() => { __setLevel('t1', 0); });
    expect(fill('l').style.clipPath).toBe('inset(15% 0 0 0)'); // 0dB → 85% fill = the 15% gridline
    expect(fill('r').style.clipPath).toBe('inset(15% 0 0 0)'); // stereo — both channels
    expect(meter).toHaveAttribute('data-state', 'clip');
    expect(fill('l').style.background).toContain('var(--meter-red)'); // clip = solid red
  });

  it('B9: the fill agrees with dbToPos at the taper anchors (the strip’s instruments never disagree)', () => {
    render(<StripMeter trackId="t7" db={-6} label="K" height={40} width={4} />);
    const meter = screen.getByTitle(/K: -6\.0 dB/);
    const fill = (ch: string) => meter.querySelector(`[data-channel="${ch}"] > div`) as HTMLElement;
    for (const db of [0, -3, -6, -12, -18, -24, -30, -40, -50, -60]) {
      act(() => { __setLevel('t7', db); });
      const pct = Math.round((1 - dbToPos(db)) * 10000) / 100;
      expect(fill('l').style.clipPath).toBe(`inset(${100 - pct}% 0 0 0)`);
    }
  });

  it('palette: token gradient stops re-anchored to the taper (amber 37.2% = −18, red 69.2% = −6)', () => {
    render(<StripMeter trackId="t1" db={-6} label="A1" height={40} width={4} />);
    act(() => { __setLevel('t1', -6); });
    const meter = screen.getByTitle(/A1: -6\.0 dB/);
    const bg = (meter.querySelector('[data-channel="l"] > div') as HTMLElement).style.background;
    expect(bg).toContain('var(--meter-green) 0%');
    expect(bg).toContain('var(--meter-amber) 37.2%');
    expect(bg).toContain('var(--meter-red) 69.2%)');
  });

  it('LED segments: 3px overlay by default; the micro-meter swaps in 4 coarse chunks', () => {
    render(<StripMeter trackId="t1" db={-6} label="A1" height={40} width={4} />);
    const meter = screen.getByTitle(/A1: -6\.0 dB/);
    const l = meter.querySelector('[data-channel="l"]')!;
    expect(l.querySelector('.meter-segments')).not.toBeNull();
    expect(l.querySelector('.meter-segments-coarse')).toBeNull();
    render(<StripMeter trackId="t9" db={-6} label="micro" height={14} width={4} coarse />);
    const micro = screen.getByTitle(/micro: -6\.0 dB/);
    const ml = micro.querySelector('[data-channel="l"]')!;
    expect(ml.querySelector('.meter-segments')).toBeNull(); // no 3px LEDs at 14px
    expect(ml.querySelector('.meter-segments-coarse')).not.toBeNull();
  });

  it('peak line: 1px white/90 at the TAPER peak position, absent at −∞', () => {
    render(<StripMeter trackId="t1" db={-6} label="A1" height={40} width={4} />
    );
    const meter = screen.getByTitle(/A1: -6\.0 dB/);
    expect(meter.querySelector('[data-channel="l"] [data-testid="meter-peak"]')).toBeNull(); // silent — no peak to hold
    // independent L/R channels: L at −24, R at −6
    act(() => { __setLevel('t1', -24, 'l'); __setLevel('t1', -6, 'r'); });
    const lPeak = meter.querySelector('[data-channel="l"] [data-testid="meter-peak"]') as HTMLElement;
    const rPeak = meter.querySelector('[data-channel="r"] [data-testid="meter-peak"]') as HTMLElement;
    expect(lPeak.style.bottom).toBe('27.2%'); // 1 − dbToPos(−24)
    expect(rPeak.style.bottom).toBe('69.2%'); // 1 − dbToPos(−6)
    const lFill = meter.querySelector('[data-channel="l"] > div') as HTMLElement;
    expect(lFill.style.clipPath).toBe('inset(72.8% 0 0 0)'); // L fill 27.2% vs R 69.2% — stereo, not a copy
  });

  it('effectiveMuted = muted || (anySolo && !solo): level 0 + data-state=muted + opacity', () => {
    render(<StripMeter trackId="tr-audio-2" db={-12} label="A2" height={40} width={4} />);
    let meter = screen.getByTitle(/A2: -12\.0 dB/);
    expect(meter).not.toHaveAttribute('data-state', 'muted');
    act(() => { useUi.getState().toggleTrackCmd('sc-1', 'tr-audio-2', 'muted'); });
    meter = screen.getByTitle(/A2: -12\.0 dB/);
    expect(meter).toHaveAttribute('data-state', 'muted');
    expect(meter.className).toContain('opacity-20');
  });

  it('solo-in-place: soloing A1 effectively mutes A2 (engine reads the doc slice)', () => {
    render(<StripMeter trackId="tr-audio-2" db={-12} label="A2" height={40} width={4} />);
    expect(screen.getByTitle(/A2: -12\.0 dB/)).not.toHaveAttribute('data-state', 'muted');
    act(() => { useUi.getState().toggleTrackCmd('sc-1', 'tr-audio-1', 'solo'); });
    expect(screen.getByTitle(/A2: -12\.0 dB/)).toHaveAttribute('data-state', 'muted');
  });

  it('ducking reads mockMixer: the ducked BGM track stays under its reduced ceiling (v2.2 §5)', async () => {
    // A2 is the fixture BGM track: fader −12, ducking amount 0.6 → −7.2 dB →
    // signal ∈ [−49.2, −23.2] → level ∈ [~0.18, ~0.61] — hard bounds, random walk
    render(<StripMeter trackId="tr-audio-2" db={-12} label="A2" height={40} width={4} />);
    act(() => { useUi.setState({ playing: true }); });
    await act(async () => { await new Promise((r) => setTimeout(r, 140)); });
    const l = meterGetSnapshot('tr-audio-2').l;
    expect(l.level).toBeGreaterThan(0.15);
    expect(l.level).toBeLessThanOrEqual(0.62);
    act(() => { useUi.setState({ playing: false }); });
  });

  it('master aggregates the active tracks (min(1, Σ/√active) + master fader), mutes with masterMuted', async () => {
    render(<StripMeter trackId="master" db={-8.5} label="Master" height={40} width={4} />);
    act(() => { useUi.setState({ playing: true }); });
    await act(async () => { await new Promise((r) => setTimeout(r, 140)); });
    const snap = meterGetSnapshot('master');
    // A1 ∈ [−33,−7], A2 (ducked) ∈ [−49.2,−23.2] → agg level ∈ [~0.02, ~0.40]
    // → + master fader (−8.52) → display level ∈ [~0.28, ~0.73] — hard bounds
    expect(snap.l.level).toBeGreaterThan(0.2);
    expect(snap.l.level).toBeLessThanOrEqual(0.75);
    expect(snap.muted).toBe(false);
    act(() => { useUi.setState({ playing: false, masterMuted: true }); });
    expect(meterGetSnapshot('master').muted).toBe(true);
    expect(screen.getByTitle(/Master: -8\.5 dB/)).toHaveAttribute('data-state', 'muted');
  });

  it('idle transport: the rAF loop stops once the meter settles (R13 fix, preserved by the engine)', async () => {
    expect(useUi.getState().playing).toBe(false);
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
    render(<StripMeter trackId="t1" db={-6} label="A1" height={40} width={4} />);
    // idle + level 0: exactly ONE frame fires (the settle), then no more
    // scheduling — the old loop span at 60 fps forever
    await act(async () => { await new Promise((r) => setTimeout(r, 60)); });
    const settled = rafSpy.mock.calls.length;
    expect(settled).toBeGreaterThanOrEqual(1); // the single settle frame
    await act(async () => { await new Promise((r) => setTimeout(r, 60)); });
    expect(rafSpy.mock.calls.length).toBe(settled); // loop STOPPED while idle
    rafSpy.mockRestore();
  });

  it('re-arms on the playing edge, stops again once idle + settled (C2 stop rule)', async () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
    // db −56: program ∈ [−30,−4] → signal always ≤ −60 → the subscribed key is
    // settled even while playing, so the post-pause stop is frame-exact
    render(<StripMeter trackId="t1" db={-56} label="A1" height={40} width={4} />);
    await act(async () => { await new Promise((r) => setTimeout(r, 60)); });
    const idle = rafSpy.mock.calls.length;
    expect(idle).toBeGreaterThanOrEqual(1); // settled idle: single settle frame
    act(() => { useUi.setState({ playing: true }); });
    await act(async () => { await new Promise((r) => setTimeout(r, 90)); });
    expect(rafSpy.mock.calls.length).toBeGreaterThan(idle + 1); // re-armed, spinning
    act(() => { useUi.setState({ playing: false }); });
    await act(async () => { await new Promise((r) => setTimeout(r, 120)); });
    const paused = rafSpy.mock.calls.length;
    await act(async () => { await new Promise((r) => setTimeout(r, 120)); });
    expect(rafSpy.mock.calls.length).toBe(paused); // stopped: paused + all subscribed keys at floor
    rafSpy.mockRestore();
  });

  it('__reset clears module state — a still-mounted meter repaints silent (test containment)', () => {
    render(<StripMeter trackId="t1" db={-6} label="A1" height={40} width={4} />);
    const meter = screen.getByTitle(/A1: -6\.0 dB/);
    const fill = () => meter.querySelector('[data-channel="l"] > div') as HTMLElement;
    act(() => { __setLevel('t1', -12); });
    expect(fill().style.clipPath).toBe('inset(47.2% 0 0 0)'); // B9 taper fill
    act(() => { __reset(); });
    expect(fill().style.clipPath).toBe('inset(100% 0 0 0)'); // silent again
    expect(screen.getByTitle(/A1: -6\.0 dB · peak −∞/)).toBeInTheDocument();
  });
});

/* ---------- R20-W1 D2: the cross-strip dB gridlines ---------- */
describe('FaderGridlines (D2 — the reference ::before technique, tokenized)', () => {
  it('paints 1px token bands at the taper positions 15/28/42/55/68/80/90%', () => {
    const { container } = render(<FaderGridlines />);
    const g = container.querySelector('[data-testid="fader-gridlines"]') as HTMLElement;
    expect(g.getAttribute('aria-hidden')).toBe('true');
    expect(g.className).toContain('pointer-events-none');
    const bg = g.style.backgroundImage;
    expect(bg).toContain('var(--fader-grid) 15%');
    expect(bg).toContain('var(--fader-grid) 28%');
    expect(bg).toContain('var(--fader-grid) 42%');
    expect(bg).toContain('var(--fader-grid) 55%');
    expect(bg).toContain('var(--fader-grid) 68%');
    expect(bg).toContain('var(--fader-grid) 80%');
    expect(bg).toContain('var(--fader-grid) 90%');
    // 0.5% band edges (the reference's soft stops) + no −50 stop (collides
    // with the bottom endcap)
    expect(bg).toContain('transparent 14.5%');
    expect(bg).toContain('transparent 90.5%');
    expect(bg).not.toContain('98%');
  });
});
