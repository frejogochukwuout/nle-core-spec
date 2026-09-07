/* ChannelEditor component tests — the Audio-focus inspector swap (design doc
   §3.2): CLIP section (S-layer element fields) follows the selection, TRACK
   section (G-layer strip params) follows stripFocus, both write through the
   store commands, plus the duck-under row and aux-return read-out.
   R19-B1: the TRACK section's fader block is the TERMINAL flex-1 element
   (th_mto37ze9) with the same equal-height [meter | fader+scale] law as the
   strips, and the aux pre/post tap point moved here from the strip. */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { ChannelEditor } from './ChannelEditor';
import { renderPlain, store, type UiPatch } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';
import { __setLevel } from '../../lib/meterEngine';

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

  /* R23-WC (D-C2, #99): the no-clip complaint DIED — the state is the honest
     onboarding line, and it only mounts when NEITHER a clip selection NOR a
     channel focus is live (the old "Select an audio clip to edit its level"
     pin restated). */
  it('an empty selection with NO strip focus shows the honest onboarding line (D-C2, #99)', () => {
    boot({ selection: [], page: 'audio' });
    expect(screen.getByTestId('shell-channel-editor-state-noclip')).toHaveTextContent('Select a clip or focus a channel');
  });

  it('R23-WC D-C2 (#99): a live strip focus kills the no-clip state — the CLIP section hides, no empty hole', () => {
    boot({ selection: [], stripFocus: 'tr-audio-2', page: 'audio' });
    expect(screen.queryByTestId('shell-channel-editor-state-noclip')).toBeNull();
    // the section is GONE (header included — D-C1's zero-param law), not an
    // empty shell; the focused channel's TRACK section IS the content
    expect(screen.queryByText('· structure layer')).toBeNull();
    expect(screen.getByText('BGM')).toBeInTheDocument(); // A2's role chip
    expect(screen.getByRole('slider', { name: 'A2 fader' })).toBeInTheDocument();
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

  /* ---------- R23-WC D-C1 (#98): the uniform clip-row grammar ---------- */
  it('R23-WC D-C1 (#98): every CLIP param row = label + NumField + slider + readout — one anatomy for all three', () => {
    boot({ selection: ['el-6'], stripFocus: 'tr-audio-1' }); // volume 0.35 → −13 dB, fades 1.0 / 2.0
    for (const [label, readout] of [
      ['Gain dB', '-13.0 dB'],
      ['Fade in', '1.0 s'],
      ['Fade out', '2.0 s'],
    ] as const) {
      const row = screen.getByTestId(`channel-clip-row-el-6-${label}`);
      // the grammar, in order: [label span][typed field][range][readout span]
      const kids = Array.from(row.children);
      expect(kids).toHaveLength(4);
      expect((kids[0] as HTMLElement).textContent).toBe(label);
      expect(kids[1]).toHaveAttribute('type', 'number');
      expect(kids[2]).toHaveAttribute('type', 'range');
      expect((kids[3] as HTMLElement).textContent).toBe(readout);
      expect(kids[3]).toHaveAttribute('data-testid', `channel-clip-readout-${label}`);
    }
    // the #98 strangeness is dead: no row carries an empty control slot
    expect(screen.getByLabelText('Clip gain slider (commit on release)')).toBeInTheDocument();
    expect(screen.getByLabelText('Audio fade in slider (commit on release)')).toBeInTheDocument();
    expect(screen.getByLabelText('Audio fade out slider (commit on release)')).toBeInTheDocument();
  });

  it('R23-WC D-C1: the readout follows the slider drag LIVE; the store commits once on release (§4.4)', () => {
    boot({ selection: ['el-6'], stripFocus: 'tr-audio-1' });
    const slider = screen.getByLabelText('Audio fade in slider (commit on release)');
    fireEvent.change(slider, { target: { value: '2.5' } });
    // mid-gesture: the readout moved, the doc slice has NOT been written
    expect(screen.getByTestId('channel-clip-readout-Fade in')).toHaveTextContent('2.5 s');
    expect(el('el-6').audioFadeIn).toBe(1);
    fireEvent.pointerUp(slider);
    expect(el('el-6').audioFadeIn).toBe(2.5); // ONE write per gesture
    expect(screen.getByTestId('channel-clip-readout-Fade in')).toHaveTextContent('2.5 s');
  });

  it('R23-WC D-C1: the gain slider writes the S-layer volume in dB (commit on release), the readout stays in dB', () => {
    boot({ selection: ['el-6'], stripFocus: 'tr-audio-1' });
    const slider = screen.getByLabelText('Clip gain slider (commit on release)');
    fireEvent.change(slider, { target: { value: '-6' } });
    expect(screen.getByTestId('channel-clip-readout-Gain dB')).toHaveTextContent('-6.0 dB');
    fireEvent.pointerUp(slider);
    expect(el('el-6').volume).toBeCloseTo(0.7, 6); // (−6 + 20) / 20
    expect(screen.getByTestId('channel-clip-readout-Gain dB')).toHaveTextContent('-6.0 dB');
    // the fade-out twin commits the same way
    const out = screen.getByLabelText('Audio fade out slider (commit on release)');
    fireEvent.change(out, { target: { value: '4' } });
    fireEvent.pointerUp(out);
    expect(el('el-6').audioFadeOut).toBe(4);
  });

  it('R23-WC D-C1: the readout resyncs on an external write (NumField commit) — no stale display', () => {
    boot({ selection: ['el-6'], stripFocus: 'tr-audio-1' });
    const input = screen.getByLabelText('Audio fade out');
    fireEvent.change(input, { target: { value: '3.5' } });
    fireEvent.blur(input);
    expect(el('el-6').audioFadeOut).toBe(3.5);
    expect(screen.getByTestId('channel-clip-readout-Fade out')).toHaveTextContent('3.5 s');
    expect((screen.getByLabelText('Audio fade out slider (commit on release)') as HTMLInputElement).defaultValue).toBe('3.5');
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

  it('the pre/post tap point is a real toggle writing auxPreFader (moved off the strip, R19-B1)', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    const tap = screen.getByRole('button', { name: 'Aux send pre-fader' });
    expect(tap).toHaveAttribute('aria-pressed', 'false');
    expect(tap).toHaveTextContent('post'); // mockMixer boots post-fader
    fireEvent.click(tap);
    expect(g('tr-audio-2').auxPreFader).toBe(true);
    expect(tap).toHaveAttribute('aria-pressed', 'true');
    expect(tap).toHaveTextContent('pre');
  });
});

/* ---------- R19-B1: the terminal fader block (th_mto37ze9 / th_mtoyq7jt) ---------- */
describe('ChannelEditor terminal fader block (R19-B1)', () => {
  it('the fader block is the terminal stretch element, flush to the panel bottom (th_mto37ze9)', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    const block = screen.getByTestId('channel-editor-fader');
    // the TRACK detail row is the flex-1 row; the fader block stretches its
    // full height (self-stretch) and is the row's LAST child — nothing sits
    // below the fader (was a fixed 84px fader with ~50% dead rail)
    expect(block.className).toContain('self-stretch');
    expect(block.className).toContain('min-h-[140px]');
    expect(block.parentElement!.className).toContain('flex-1');
    expect(block.parentElement!.lastElementChild).toBe(block);
  });

  it('shared 24px headroom readout: fader dB (signed 1dp, no unit) + live engine peak', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    const row = screen.getByTestId('channel-editor-readout');
    expect(row.className).toContain('h-[24px]');
    expect(row.className).toContain('mono');
    expect(within(row).getByText('-12.0')).toBeInTheDocument(); // A2 boots −12, no unit
    expect(within(row).getByText('−∞')).toBeInTheDocument(); // silent peak
    act(() => { __setLevel('tr-audio-2', -6); });
    expect(within(row).getByText('-6.0')).toBeInTheDocument();
  });

  it('equal-height law: the meter + fader columns share one height var; the meter is a fixed 14px', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    const block = screen.getByTestId('channel-editor-fader');
    const cols = block.querySelector('[data-col="meter"]')!.parentElement as HTMLElement;
    expect(cols.className).toContain('items-stretch');
    expect(cols.style.getPropertyValue('--fader-col-h')).toBe('100%');
    const meterCol = cols.querySelector('[data-col="meter"]') as HTMLElement;
    const faderCol = cols.querySelector('[data-col="fader"]') as HTMLElement;
    expect(meterCol.style.height).toBe('var(--fader-col-h)');
    expect(faderCol.style.height).toBe('var(--fader-col-h)');
    const well = meterCol.querySelector('.meter-well') as HTMLElement;
    expect(well.style.width).toBe('14px'); // th_mto617w1 — fixed, never w-full
    expect(faderCol.querySelector('[data-testid="fader-scale"]')).not.toBeNull(); // carries the scale column
  });

  /* R22 #81: the EQ/FX insert sections live HERE (the strips stay lean);
     the param rows are honest view-state mocks (gap C60). */
  it('R22 #81: the EQ/FX insert group renders the two slots; selecting EQ reveals the param rows', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    const group = screen.getByTestId('channel-inserts-A2');
    expect(group).toBeInTheDocument();
    const slot1 = screen.getByLabelText('Insert slot 1');
    expect(slot1).toBeInTheDocument();
    // no insert selected → no param rows
    expect(screen.queryByTestId('channel-insert-params-A2-EQ')).toBeNull();
    fireEvent.change(slot1, { target: { value: 'EQ' } });
    expect(useUi.getState().mixer.tracks['tr-audio-2'].inserts[0]).toBe('EQ');
    const params = screen.getByTestId('channel-insert-params-A2-EQ');
    expect(screen.getByLabelText('EQ Low for A2')).toBeInTheDocument();
    expect(screen.getByLabelText('EQ High for A2')).toBeInTheDocument();
    // a param drag changes the readout (view-state mock, never the G-slice)
    const low = screen.getByLabelText('EQ Low for A2') as HTMLInputElement;
    fireEvent.change(low, { target: { value: '4.5' } });
    expect((screen.getByLabelText('EQ Low for A2') as HTMLInputElement).value).toBe('4.5');
  });

  it('R22 #81: Comp params carry the dB/ratio/ms grammar (slot 2)', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    const slot2 = screen.getByLabelText('Insert slot 2');
    fireEvent.change(slot2, { target: { value: 'Comp' } });
    expect(useUi.getState().mixer.tracks['tr-audio-2'].inserts[1]).toBe('Comp');
    expect(screen.getByTestId('channel-insert-params-A2-Comp')).toBeInTheDocument();
    expect(screen.getByLabelText('Comp Thresh for A2')).toBeInTheDocument();
  });
});
