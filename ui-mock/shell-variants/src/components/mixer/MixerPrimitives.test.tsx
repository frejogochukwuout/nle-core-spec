/* Mixer primitives tests — Fader (controlled dB slider, keyboard grammar per
   design doc §6), PanKnob (R15-A1 DAW dial grammar: vertical drag
   ±range/200 per 100px, Shift ×0.2 fine, non-passive wheel,
   pointer-release-only detent, arc/indicator geometry, bubble), and
   StripMeter over the shared engine (R15-A2: dB-linear mapping, token
   palette, LED segments, peak line, mute/clip, engine lifecycle + reset).
   Drag math is exercised by mocking getBoundingClientRect where needed
   (jsdom reports 0×0); the knob drag grammar is clientY-relative so it needs
   no rect at all. */

import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Fader, PanKnob, StripMeter } from './MixerPrimitives';
import { sliderToDb } from '../../state/mockMixer';
import { useUi } from '../../state/useUiStore';
import { __reset, __setLevel, meterGetSnapshot } from '../../lib/meterEngine';

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

describe('StripMeter (R15-A2 — shared engine view)', () => {
  it('is aria-hidden with the dB exposed via title — never an aria-live region (design doc §4)', () => {
    render(<StripMeter trackId="t1" db={-6} label="A1" height={40} width={4} />);
    const meter = screen.getByTitle(/A1: -6\.0 dB/);
    expect(meter).toHaveAttribute('aria-hidden', 'true');
    expect(meter.querySelectorAll('[data-channel]')).toHaveLength(2); // stereo pair (l + r)
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

  it('maps display dB linearly: fill = clamp((db+60)/60); db ≥ 0 → full + clip', () => {
    render(<StripMeter trackId="t1" db={-6} label="A1" height={40} width={4} />);
    const meter = screen.getByTitle(/A1: -6\.0 dB/);
    const fill = (ch: string) => meter.querySelector(`[data-channel="${ch}"] > div`) as HTMLElement;
    expect(fill('l').style.clipPath).toBe('inset(100% 0 0 0)'); // silent → nothing revealed
    act(() => { __setLevel('t1', -12); });
    expect(fill('l').style.clipPath).toBe('inset(20% 0 0 0)'); // (−12+60)/60 = 0.8
    act(() => { __setLevel('t1', -60); });
    expect(fill('l').style.clipPath).toBe('inset(100% 0 0 0)'); // at the floor
    act(() => { __setLevel('t1', 0); });
    expect(fill('l').style.clipPath).toBe('inset(0% 0 0 0)'); // full
    expect(fill('r').style.clipPath).toBe('inset(0% 0 0 0)'); // stereo — both channels
    expect(meter).toHaveAttribute('data-state', 'clip');
    expect(fill('l').style.background).toContain('var(--meter-red)'); // clip = solid red
  });

  it('palette: token gradient stops agree with the dB zones (amber 70% = −18, red 90% = −6)', () => {
    render(<StripMeter trackId="t1" db={-6} label="A1" height={40} width={4} />);
    act(() => { __setLevel('t1', -6); });
    const meter = screen.getByTitle(/A1: -6\.0 dB/);
    const bg = (meter.querySelector('[data-channel="l"] > div') as HTMLElement).style.background;
    expect(bg).toContain('var(--meter-green) 0%');
    expect(bg).toContain('var(--meter-amber) 70%');
    expect(bg).toContain('var(--meter-red) 90%)');
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

  it('peak line: 1px white/90 at the dB-linear peak position, absent at −∞', () => {
    render(<StripMeter trackId="t1" db={-6} label="A1" height={40} width={4} />
    );
    const meter = screen.getByTitle(/A1: -6\.0 dB/);
    expect(meter.querySelector('[data-channel="l"] [data-testid="meter-peak"]')).toBeNull(); // silent — no peak to hold
    // independent L/R channels: L at −24, R at −6
    act(() => { __setLevel('t1', -24, 'l'); __setLevel('t1', -6, 'r'); });
    const lPeak = meter.querySelector('[data-channel="l"] [data-testid="meter-peak"]') as HTMLElement;
    const rPeak = meter.querySelector('[data-channel="r"] [data-testid="meter-peak"]') as HTMLElement;
    expect(lPeak.style.bottom).toBe('60%'); // (−24+60)/60
    expect(rPeak.style.bottom).toBe('90%'); // (−6+60)/60
    const lFill = meter.querySelector('[data-channel="l"] > div') as HTMLElement;
    expect(lFill.style.clipPath).toBe('inset(40% 0 0 0)'); // L fill 0.6 vs R 0.9 — stereo, not a copy
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
    expect(fill().style.clipPath).toBe('inset(20% 0 0 0)');
    act(() => { __reset(); });
    expect(fill().style.clipPath).toBe('inset(100% 0 0 0)'); // silent again
    expect(screen.getByTitle(/A1: -6\.0 dB · peak −∞/)).toBeInTheDocument();
  });
});
