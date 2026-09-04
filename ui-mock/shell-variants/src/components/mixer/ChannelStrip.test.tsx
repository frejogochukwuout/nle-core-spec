/* ChannelStrip component tests — the G-layer strip projection (spec 20 §4.2 /
   §12.2): role chips, M/S/L single-source commands, fader/pan wiring, insert
   slots, aux send + output bus, the duck-under row, compact mode, and
   focus/flash affordances. */

import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { ChannelStrip } from './ChannelStrip';
import { renderPlain, store } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';

/** Strip harness reading the track from the store (fresh on doc mutations). */
function Strip({ trackId, compact = false, focused = false, flashing = false }: {
  trackId: string; compact?: boolean; focused?: boolean; flashing?: boolean;
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
    expect(within(s).getAllByText('A2').length).toBe(2); // badge + name header
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
