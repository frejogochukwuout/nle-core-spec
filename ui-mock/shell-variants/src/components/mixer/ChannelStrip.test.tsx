/* ChannelStrip component tests — the G-layer strip projection (spec 20 §4.2 /
   §12.2): role chips, M/S/L single-source commands, fader/pan wiring, insert
   slots, aux send + output bus, the duck-under row, compact mode, and
   focus/flash affordances. */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { ChannelStrip, AuxStrip } from './ChannelStrip';
import { renderPlain, store } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';
import { meterGetSnapshot, __setLevel } from '../../lib/meterEngine';

/** Strip harness reading the track from the store (fresh on doc mutations). */
function Strip({ trackId, compact = false, focused = false, flashing = false, index = 0 }: {
  trackId: string; compact?: boolean; focused?: boolean; flashing?: boolean; index?: number;
}) {
  const scene = useUi((s) => s.scenes.find((x) => x.id === 'sc-1')!);
  const track = scene.tracks.find((t) => t.id === trackId);
  if (!track) return null;
  return (
    <div style={{ height: 460 }}>
      <ChannelStrip
        track={track}
        sceneId="sc-1"
        compact={compact}
        focused={focused}
        flashing={flashing}
        index={index}
        onStripClick={() => useUi.getState().setStripFocus(track.id)}
      />
    </div>
  );
}

const strip = (badge: string) => screen.getByTestId(`mixer-strip-${badge}`);
const track = (id: string) => {
  for (const t of store().scenes.find((s) => s.id === 'sc-1')!.tracks) {
    if (t.id === id) return t;
  }
  throw new Error(`track ${id} not found`);
};
const g = (id: string) => store().mixer.tracks[id]!;

describe('ChannelStrip', () => {
  it('renders the A2 strip: badge, name, role chip, group semantics (spec 20 §4.2)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const s = strip('A2');
    expect(s).toHaveAttribute('role', 'group');
    expect(s).toHaveAttribute('aria-label', 'A2 channel strip');
    expect(within(s).getByText('BGM')).toBeInTheDocument(); // mockMixer role tag
    expect(within(s).getAllByText('A2').length).toBe(3); // badge + name header + A2 send-row label (R14 twin)
  });

  it('the A1 strip is tagged Dialogue and gets NO duck-under row (spec 20 §12.2)', () => {
    renderPlain(<Strip trackId="tr-audio-1" />);
    expect(within(strip('A1')).getByText('Dialogue')).toBeInTheDocument();
    expect(screen.queryByTestId('mixer-ducking-A1')).toBeNull();
  });

  it('M/S/L route through toggleTrackCmd — the same undoable command as the headers (spec 18 §4.7)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    expect(screen.getByRole('button', { name: 'Lock A2' })).toHaveAttribute('aria-pressed', 'true'); // fixture locks A2
    fireEvent.click(screen.getByRole('button', { name: 'Mute A2' }));
    expect(track('tr-audio-2').muted).toBe(true);
    expect(screen.getByRole('button', { name: 'Mute A2' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Solo A2' }));
    expect(track('tr-audio-2').solo).toBe(true);
    expect(store().past).toHaveLength(2);
  });

  it('the dB fader is keyboard-operable and writes the G-slice fader (design doc §6)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const fader = screen.getByRole('slider', { name: 'A2 fader' });
    expect(fader).toHaveAttribute('aria-valuenow', '-12'); // mockMixer default for A2
    fireEvent.keyDown(fader, { key: 'ArrowUp' });
    expect(g('tr-audio-2').fader).toBe(-11);
    fireEvent.keyDown(fader, { key: 'PageDown' });
    expect(g('tr-audio-2').fader).toBe(-17); // prop read at −11 → −11 − 6
  });

  it('the pan knob keyboard grammar writes the G-slice pan (design doc §6)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const pan = screen.getByRole('slider', { name: 'A2 pan' });
    expect(pan).toHaveAttribute('aria-valuetext', 'C');
    fireEvent.keyDown(pan, { key: 'ArrowRight' });
    expect(g('tr-audio-2').pan).toBe(5);
    fireEvent.keyDown(pan, { key: 'ArrowLeft', shiftKey: true });
    expect(g('tr-audio-2').pan).toBe(4); // fine mode ±1
  });

  it('the pan knob is the DAW-floor 24px in the full dock, 22px squeezed (R15-A1)', () => {
    const { rerender } = renderPlain(<Strip trackId="tr-audio-2" />);
    const knob = screen.getByRole('slider', { name: 'A2 pan' });
    expect(knob.style.width).toBe('24px');
    expect(knob.style.height).toBe('24px');
    rerender(<Strip trackId="tr-audio-2" compact />);
    expect(screen.getByRole('slider', { name: 'A2 pan' }).style.width).toBe('22px');
  });

  it('insert slots, aux send and output bus write through setMixerTrack (spec 20 §4.2)', () => {
    renderPlain(<Strip trackId="tr-audio-1" />);
    expect(screen.getByLabelText('Insert slot 1')).toHaveValue('EQ'); // A1 ships EQ in slot 1
    fireEvent.change(screen.getByLabelText('Insert slot 1'), { target: { value: 'Comp' } });
    expect(g('tr-audio-1').inserts[0]).toBe('Comp');
    fireEvent.change(screen.getByLabelText('A1 aux 1 send'), { target: { value: '0.2' } });
    expect(g('tr-audio-1').auxA).toBeCloseTo(0.2, 5);
    fireEvent.change(screen.getByLabelText('A1 output bus'), { target: { value: '1' } });
    expect(g('tr-audio-1').outputBus).toBe(1);
  });

  it('the A2 send twin writes auxB through setMixerTrack (R14: was display-missing)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    // mockMixer boots auxB at 0 — the twin control reaches the model field
    fireEvent.change(screen.getByLabelText('A2 aux 2 send'), { target: { value: '0.35' } });
    expect(g('tr-audio-2').auxB).toBeCloseTo(0.35, 5);
    expect((screen.getByLabelText('A2 aux 2 send') as HTMLInputElement).value).toBe('0.35');
  });

  it('the pre/post tap point is a real toggle writing auxPreFader (spec 20 §4.2, R14)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const tap = screen.getByRole('button', { name: 'Aux send pre-fader' });
    expect(tap).toHaveAttribute('aria-pressed', 'false');
    expect(tap).toHaveTextContent('post'); // mockMixer boots post-fader
    fireEvent.click(tap);
    expect(g('tr-audio-2').auxPreFader).toBe(true);
    expect(tap).toHaveAttribute('aria-pressed', 'true');
    expect(tap).toHaveTextContent('pre');
  });

  it('the AuxStrip bus ON badge is a real toggle writing AuxBusSettings.on (R14)', () => {
    renderPlain(<AuxStrip bus="a2" compact={false} />);
    // fixture: a2 boots OFF (Spare), a1 boots ON (Reverb)
    const a2 = screen.getByRole('button', { name: 'Aux a2 bus on' });
    expect(a2).toHaveAttribute('aria-pressed', 'false');
    expect(a2).toHaveTextContent('OFF');
    fireEvent.click(a2);
    expect(store().mixer.buses.a2.on).toBe(true);
    expect(a2).toHaveAttribute('aria-pressed', 'true');
    expect(a2).toHaveTextContent('ON');
    fireEvent.click(a2);
    expect(store().mixer.buses.a2.on).toBe(false);
  });

  it('aux return meters use the unified engine keys (auxA/auxB) and honor bus ON/OFF (R15-A2)', () => {
    renderPlain(<AuxStrip bus="a1" compact={false} />);
    renderPlain(<AuxStrip bus="a2" compact={false} />);
    // ONE key per bus (was 'aux-a1'/'aux-a2' before the registry unification)
    expect(meterGetSnapshot('auxA').muted).toBe(false); // a1 Reverb boots ON
    expect(meterGetSnapshot('auxB').muted).toBe(true); // a2 Spare boots OFF → honest silent return
  });

  it('the BGM strip renders the duck-under row and its controls (spec 20 §12.2)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const duck = screen.getByTestId('mixer-ducking-A2');
    expect(within(duck).getByText(/atk 20ms/)).toBeInTheDocument();
    expect(within(duck).getByText(/rel 400ms/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('A2 ducking amount'), { target: { value: '0.25' } });
    expect(store().mixer.ducking['tr-audio-2']!.amount).toBeCloseTo(0.25, 5);
    fireEvent.change(screen.getByLabelText('A2 ducking source'), { target: { value: '' } }); // un-assign
    expect(store().mixer.ducking['tr-audio-2']!.source).toBeNull();
  });

  it('compact strips keep the fader but drop inserts/sends/bus/ducking (dock squeeze mode)', () => {
    renderPlain(<Strip trackId="tr-audio-2" compact />);
    expect(strip('A2').style.width).toBe('84px');
    expect(screen.getByRole('slider', { name: 'A2 fader' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Insert slot 1')).toBeNull();
    expect(screen.queryByLabelText('A2 output bus')).toBeNull();
    expect(screen.queryByTestId('mixer-ducking-A2')).toBeNull();
  });

  it('focused strips get the accent ring; flashing sets data-flash', () => {
    renderPlain(<Strip trackId="tr-audio-2" focused flashing />);
    expect(strip('A2').className).toContain('ring-1');
    expect(strip('A2')).toHaveAttribute('data-flash', 'on');
  });

  it('clicking the strip reports focus through onStripClick (MixerDock wiring)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    fireEvent.click(strip('A2'));
    expect(store().stripFocus).toBe('tr-audio-2');
  });
});

/* R15-A3/A4 — strip chrome: role base bar, scale column, readout row,
   20×18 letter buttons, row parity, aux no-source honesty. */
describe('ChannelStrip R15-A3/A4 chrome', () => {
  it('renders the h-1 role base bar in the strip role\'s --mk-role-* color (flush to the bottom edge)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />); // fixture role: BGM
    const bar = screen.getByTestId('mixer-basebar-A2');
    expect(bar.className).toContain('h-1');
    expect(bar.className).toContain('absolute');
    expect(bar.style.background).toBe('var(--mk-role-bgm)');
    expect(bar.getAttribute('aria-hidden')).toBe('true');
  });

  it('every role maps to its own base-bar token (A2 bgm / A1 dialogue)', () => {
    renderPlain(<Strip trackId="tr-audio-1" />);
    expect(screen.getByTestId('mixer-basebar-A1').style.background).toBe('var(--mk-role-dialogue)');
  });

  it('carries the fader\'s dB scale column at true taper positions (A3, channel strips only)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const scale = strip('A2').querySelector('[data-testid="fader-scale"]') as HTMLElement;
    expect(scale).not.toBeNull();
    expect(scale.getAttribute('aria-hidden')).toBe('true');
    expect(scale.textContent).toContain('−48');
    expect(scale.textContent).toContain('+6');
    expect(scale.textContent).toContain('−∞');
  });

  it('readout row: fader dB (mono) + live peak in meter-green, −∞ when silent (A3)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const row = screen.getByTestId('mixer-readout-A2');
    expect(row.className).toContain('mono'); // tabular-nums rides .mono
    expect(within(row).getByText('-12.0 dB')).toBeInTheDocument(); // G-slice fader (A2 boots −12)
    const peak = within(row).getByText('−∞');
    expect(peak.className).toContain('var(--meter-green)'); // token color, not a hex
    act(() => { __setLevel('tr-audio-2', -6); });
    expect(within(row).getByText('-6.0')).toBeInTheDocument(); // engine peak, signed 1dp
    expect(within(row).queryByText('−∞')).toBeNull();
  });

  it('M/S/L are normalized 20×18 letter buttons (A4) with the semantic on-state tokens kept', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    for (const name of ['Mute A2', 'Solo A2', 'Lock A2']) {
      const b = screen.getByRole('button', { name });
      expect(b.className).toContain('w-[20px]');
      expect(b.className).toContain('h-[18px]');
    }
    // routing unchanged — the same undoable command family
    fireEvent.click(screen.getByRole('button', { name: 'Mute A2' }));
    expect(track('tr-audio-2').muted).toBe(true);
  });

  it('section hairlines (--border-strong) rhythm the strip (A4)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    // 1px --border-strong dividers: under the header/role block, under the
    // readout row, above the lower stack — bg-strong = var(--border-strong)
    const hairlines = strip('A2').querySelectorAll('.bg-strong');
    expect(hairlines.length).toBeGreaterThanOrEqual(3);
  });

  it('odd strips get the raised parity background, even stay shell (A4 row banding)', () => {
    const { rerender } = renderPlain(<Strip trackId="tr-audio-2" index={1} />);
    expect(strip('A2').className).toContain('bg-raised');
    rerender(<Strip trackId="tr-audio-2" index={0} />);
    expect(strip('A2').className).toContain('bg-shell');
    expect(strip('A2').className).not.toContain('bg-raised');
  });

  it('aux strips: the type-audio base bar + readout row on the engine bus key (A4 grammar)', () => {
    renderPlain(<AuxStrip bus="a1" compact={false} />);
    expect(screen.getByTestId('mixer-basebar-aux-a1').style.background).toBe('var(--type-audio)');
    const row = screen.getByTestId('mixer-readout-aux-a1');
    expect(within(row).getByText('-6.0 dB')).toBeInTheDocument(); // a1 Reverb returnGain
    expect(within(row).getByText('−∞')).toBeInTheDocument();
  });

  it('aux "no source" state: honest-disabled chip when nothing feeds the bus (A4)', () => {
    // fixture: NOTHING feeds either bus (all sends 0, no outputBus routes) —
    // both returns carry the honest-disabled chip
    renderPlain(<AuxStrip bus="a1" compact={false} />);
    renderPlain(<AuxStrip bus="a2" compact={false} />);
    const chip = screen.getByTestId('mixer-nosource-a1');
    expect(chip).toHaveAttribute('aria-disabled', 'true');
    expect(chip).toHaveTextContent('no source');
    expect(chip.className).toContain('border-dashed');
    expect(screen.getByTestId('mixer-nosource-a2')).toBeInTheDocument();
    // the state is live, not fixture-frozen: one send > 0 drops a1's chip
    act(() => { useUi.getState().setMixerTrack('tr-audio-2', { auxA: 0.3 }); });
    expect(screen.queryByTestId('mixer-nosource-a1')).toBeNull();
    expect(screen.getByTestId('mixer-nosource-a2')).toBeInTheDocument(); // a2 still unfed
    // the engine side of the honesty is already pinned: bus OFF → silent
    expect(meterGetSnapshot('auxB').muted).toBe(true);
  });
});
