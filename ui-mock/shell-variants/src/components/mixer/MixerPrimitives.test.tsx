/* Mixer primitives tests — Fader (controlled dB slider, keyboard grammar per
   design doc §6), PanKnob, and StripMeter (aria posture). Drag math is
   exercised by mocking getBoundingClientRect (jsdom reports 0×0) — the
   components use plain pointerdown/move/up, so direct dispatch works. */

import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Fader, PanKnob, StripMeter } from './MixerPrimitives';
import { sliderToDb } from '../../state/mockMixer';
import { useUi } from '../../state/useUiStore';

const fakeRect = (height: number, width = 14): DOMRect =>
  ({ top: 0, left: 0, right: width, bottom: height, width, height, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

describe('Fader', () => {
  it('is a labelled slider with dB range/value semantics (design doc §6)', () => {
    render(<Fader db={-6} onChange={() => {}} ariaLabel="Test fader" />);
    const f = screen.getByRole('slider', { name: 'Test fader' });
    expect(f).toHaveAttribute('aria-valuemin', '-60');
    expect(f).toHaveAttribute('aria-valuemax', '6');
    expect(f).toHaveAttribute('aria-valuenow', '-6');
    expect(f).toHaveAttribute('aria-valuetext', '-6.0 dB');
    expect(screen.getByText('-6.0 dB')).toBeInTheDocument(); // readout above the track
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

  it('pointer drag: jump-to-position then relative drag, clamped to the dB range', () => {
    const onChange = vi.fn();
    render(<Fader db={-6} onChange={onChange} ariaLabel="Test fader" height={96} />);
    const f = screen.getByRole('slider', { name: 'Test fader' });
    f.getBoundingClientRect = () => fakeRect(96);
    // jump-to-position: 24 px down a 96 px track → v = 0.75
    fireEvent.pointerDown(f, { pointerId: 1, button: 0, clientY: 24 });
    expect(onChange).toHaveBeenCalledWith(sliderToDb(0.75)); // −10.5
    // drag up to the top: dy = +24 → −10.5 + 24/96×66 = +6 (clamped)
    fireEvent.pointerMove(f, { pointerId: 1, buttons: 1, clientY: 0 });
    expect(onChange).toHaveBeenCalledWith(6);
    // shift = fine: drag back down 72 px at ×0.25 sensitivity
    fireEvent.pointerMove(f, { pointerId: 1, buttons: 1, clientY: 96, shiftKey: true });
    expect(onChange).toHaveBeenCalledWith(-22.875); // −10.5 − 12.375
  });

  it('the thumb position follows the controlled db value (dbToSlider taper)', () => {
    const { rerender } = render(<Fader db={0} onChange={() => {}} ariaLabel="Test fader" height={96} />);
    const f = screen.getByRole('slider', { name: 'Test fader' });
    const thumb = f.querySelector('span.rounded-\\[2px\\]') as HTMLElement | null;
    expect(thumb).not.toBeNull();
    // jsdom serializes percentages at 4 decimals: 60/66 → 90.9091%
    expect(thumb!.style.bottom).toContain('90.9091%');
    rerender(<Fader db={-60} onChange={() => {}} ariaLabel="Test fader" height={96} />);
    expect((f.querySelector('span.rounded-\\[2px\\]') as HTMLElement)!.style.bottom).toContain('0%');
  });
});

describe('PanKnob', () => {
  it('is a labelled slider with C/L/R value text (design doc §6)', () => {
    render(<PanKnob pan={0} onChange={() => {}} ariaLabel="Test pan" />);
    const p = screen.getByRole('slider', { name: 'Test pan' });
    expect(p).toHaveAttribute('aria-valuemin', '-100');
    expect(p).toHaveAttribute('aria-valuemax', '100');
    expect(p).toHaveAttribute('aria-valuetext', 'C');
    expect(screen.getByText('C')).toBeInTheDocument(); // knob label
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

  it('pointer drag pans horizontally and clamps to ±100', () => {
    const onChange = vi.fn();
    render(<PanKnob pan={0} onChange={onChange} ariaLabel="Test pan" />);
    const p = screen.getByRole('slider', { name: 'Test pan' });
    fireEvent.pointerDown(p, { pointerId: 1, button: 0, clientX: 100 });
    fireEvent.pointerMove(p, { pointerId: 1, buttons: 1, clientX: 150 });
    expect(onChange).toHaveBeenCalledWith(50);
    fireEvent.pointerMove(p, { pointerId: 1, buttons: 1, clientX: 500 });
    expect(onChange).toHaveBeenCalledWith(100); // clamped
    // shift = fine drag ×0.25
    fireEvent.pointerMove(p, { pointerId: 1, buttons: 1, clientX: 460, shiftKey: true });
    expect(onChange).toHaveBeenCalledWith(90); // 0 + 360 × 0.25
  });
});

describe('StripMeter', () => {
  it('is aria-hidden with the dB exposed via title — never an aria-live region (design doc §4)', () => {
    render(<StripMeter trackId="t1" db={-6} label="A1" height={40} width={4} />);
    const meter = screen.getByTitle(/A1: -6\.0 dB/);
    expect(meter).toHaveAttribute('aria-hidden', 'true');
    expect(meter.querySelectorAll('span')).toHaveLength(2); // stereo pair of bars
  });

  it('shows −∞ for a fully-cold fader', () => {
    render(<StripMeter trackId="t2" db={-60} label="M" height={40} width={4} />);
    expect(screen.getByTitle(/M: −∞/)).toBeInTheDocument();
  });

  it('idle transport: the rAF loop stops once the meter settles (R13 fix)', async () => {
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
});
