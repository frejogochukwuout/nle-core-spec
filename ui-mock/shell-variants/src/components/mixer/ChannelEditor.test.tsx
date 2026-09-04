/* ChannelEditor component tests — the Audio-focus inspector swap (design doc
   §3.2): CLIP section (S-layer element fields) follows the selection, TRACK
   section (G-layer strip params) follows stripFocus, both write through the
   store commands, plus the duck-under row and aux-return read-out. */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { ChannelEditor } from './ChannelEditor';
import { renderPlain, store, type UiPatch } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';

const boot = (patch: UiPatch = {}) => {
  if (Object.keys(patch).length) useUi.setState(patch);
  return renderPlain(<ChannelEditor />);
};

const el = (id: string) => {
  for (const sc of store().scenes) for (const t of sc.tracks) {
    const hit = t.elements.find((e) => e.id === id);
    if (hit) return hit;
  }
  throw new Error(`element ${id} not found`);
};
const g = (id: string) => store().mixer.tracks[id]!;

describe('ChannelEditor', () => {
  it('CLIP section shows the selected audio element with its S-layer fields (design doc §3.2)', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2', page: 'audio' });
    expect(screen.getByText('interview_marina')).toBeInTheDocument();
    expect(screen.getByLabelText('Clip gain')).toHaveValue(-4); // (0.8 × 20) − 20
    expect(screen.getByLabelText('Audio fade in')).toHaveValue(0);
    expect(screen.getByLabelText('Audio fade out')).toHaveValue(0);
    expect(screen.getByTestId('channel-automation-placeholder')).toBeInTheDocument(); // M2 non-goal note
  });

  it('an empty selection shows the no-clip empty state (spec 18 §4.2 state table)', () => {
    boot({ selection: [], page: 'audio' });
    expect(screen.getByTestId('shell-channel-editor-state-noclip')).toHaveTextContent('Select an audio clip');
  });

  it('the CLIP section switches with the selection — a video clip is audio-bearing (17 §6.1 parity)', () => {
    boot({ selection: ['el-1'] });
    expect(screen.getByText('A012_C034_beach_wide')).toBeInTheDocument();
  });

  it('the TRACK section follows stripFocus and falls back to the first audio track', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    expect(screen.getByRole('slider', { name: 'A2 fader' })).toBeInTheDocument();
    expect(screen.getByText('BGM')).toBeInTheDocument(); // A2's role chip
    act(() => { useUi.setState({ stripFocus: null }); });
    expect(screen.getByRole('slider', { name: 'A1 fader' })).toBeInTheDocument(); // fallback
  });

  it('clip-gain commit writes the S-layer element volume (design doc: strip fader ≠ clip gain)', () => {
    // el-6 (tr-audio-1, UNLOCKED) — el-7 sits on the locked tr-audio-2 whose
    // inspector writes are inert by the R13 locked-track store guard
    boot({ selection: ['el-6'], stripFocus: 'tr-audio-1' });
    const input = screen.getByLabelText('Clip gain');
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);
    expect(el('el-6').volume).toBe(1);
    expect(g('tr-audio-1').fader).toBe(-3); // G layer untouched by the S edit
  });

  it('fade-in commit writes audioFadeIn on the element (17 §6.1 parity)', () => {
    boot({ selection: ['el-6'], stripFocus: 'tr-audio-1' });
    const input = screen.getByLabelText('Audio fade in');
    fireEvent.change(input, { target: { value: '2.5' } });
    fireEvent.blur(input);
    expect(el('el-6').audioFadeIn).toBe(2.5);
  });

  it('NumFields resync on selection change — no stale display, no stale write (R13 CodeRabbit fix)', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    expect(screen.getByLabelText('Clip gain')).toHaveValue(-4);   // el-7 volume 0.8 → −4 dB
    expect(screen.getByLabelText('Audio fade in')).toHaveValue(0);
    // switch the CLIP section to el-6 (volume 0.35 → −13 dB, fades 1.0 / 2.0)
    act(() => { useUi.setState({ selection: ['el-6'] }); });
    expect(screen.getByText('ocean_ambience')).toBeInTheDocument();
    expect(screen.getByLabelText('Clip gain')).toHaveValue(-13);  // remounted, not the stale −4
    expect(screen.getByLabelText('Audio fade in')).toHaveValue(1);
    expect(screen.getByLabelText('Audio fade out')).toHaveValue(2);
    // blur without editing: the uncontrolled field must NOT write el-7's −4
    // into el-6 (the original bug) — it re-commits el-6's own −13 dB
    fireEvent.blur(screen.getByLabelText('Clip gain'));
    expect(el('el-6').volume).toBeCloseTo(0.35, 6);
    expect(el('el-7').volume).toBe(0.8); // untouched
  });

  it('the G-layer fader/pan respond to the keyboard grammar (design doc §6)', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    fireEvent.keyDown(screen.getByRole('slider', { name: 'A2 fader' }), { key: 'ArrowUp' });
    expect(g('tr-audio-2').fader).toBe(-11);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'A2 pan' }), { key: 'ArrowRight' });
    expect(g('tr-audio-2').pan).toBe(5);
  });

  it('insert slots, output bus and aux send write through setMixerTrack (spec 20 §4.2)', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    fireEvent.change(screen.getByLabelText('Insert slot 1'), { target: { value: 'Comp' } });
    expect(g('tr-audio-2').inserts[0]).toBe('Comp');
    fireEvent.change(screen.getByLabelText('Insert slot 2'), { target: { value: 'Gate' } });
    expect(g('tr-audio-2').inserts[1]).toBe('Gate');
    fireEvent.change(screen.getByLabelText('Output bus'), { target: { value: '2' } });
    expect(g('tr-audio-2').outputBus).toBe(2);
    fireEvent.change(screen.getByLabelText('A2 aux 1 send'), { target: { value: '0.4' } });
    expect(g('tr-audio-2').auxA).toBeCloseTo(0.4, 5);
  });

  it('the A2 send twin writes auxB through setMixerTrack (R14 parity with the strip)', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    fireEvent.change(screen.getByLabelText('A2 aux 2 send'), { target: { value: '0.25' } });
    expect(g('tr-audio-2').auxB).toBeCloseTo(0.25, 5);
    expect(screen.getByText('25%')).toBeInTheDocument(); // the %-readout follows
  });

  it('the duck-under row edits the sidechain amount (spec 20 §12.2)', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    expect(screen.getByTestId('channel-ducking-A2')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Ducking amount'), { target: { value: '0.25' } });
    expect(store().mixer.ducking['tr-audio-2']!.amount).toBeCloseTo(0.25, 5);
    expect(screen.getByText(/release 400 ms/)).toBeInTheDocument();
  });

  it('the aux-return read-out writes setAuxBus (design doc §5 aux buses)', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    expect(screen.getByText('Reverb')).toBeInTheDocument(); // a1 bus name
    fireEvent.change(screen.getByLabelText('Aux 1 return gain'), { target: { value: '0' } });
    expect(store().mixer.buses.a1.returnGain).toBe(0);
  });
});
