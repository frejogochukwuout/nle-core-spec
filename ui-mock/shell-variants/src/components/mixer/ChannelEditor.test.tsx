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
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    const input = screen.getByLabelText('Clip gain');
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);
    expect(el('el-7').volume).toBe(1);
    expect(g('tr-audio-2').fader).toBe(-12); // G layer untouched by the S edit
  });

  it('fade-in commit writes audioFadeIn on the element (17 §6.1 parity)', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    const input = screen.getByLabelText('Audio fade in');
    fireEvent.change(input, { target: { value: '2.5' } });
    fireEvent.blur(input);
    expect(el('el-7').audioFadeIn).toBe(2.5);
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
