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
/* R23-FIX (review-sweep item 6, R2-F4): the SHARED dB map — re-pinned to
   the log law (the suite's old −4/−13 dB pins were the LINEAR map's
   (v·20)−20 and contradicted Inspector.test's log pins on the SAME
   ElementJSON.volume field; one map, both suites now agree). */
import { volToDb, dbToVol, VOL_DB_MIN, VOL_DB_MAX } from '../shell/Inspector';

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
    expect(screen.getByLabelText('Clip gain')).toHaveValue(20 * Math.log10(0.8)); // R23-FIX item 6: the SHARED log map — 0.8 → −1.94 dB
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
    expect(screen.getByLabelText('Clip gain')).toHaveValue(20 * Math.log10(0.8));   // el-7 volume 0.8 → −1.94 dB (log map)
    expect(screen.getByLabelText('Audio fade in')).toHaveValue(0);
    // switch the CLIP section to el-6 (volume 0.35 → −9.1 dB, fades 1.0 / 2.0)
    act(() => { useUi.setState({ selection: ['el-6'] }); });
    expect(screen.getByText('ocean_ambience')).toBeInTheDocument();
    expect(screen.getByLabelText('Clip gain')).toHaveValue(20 * Math.log10(0.35));  // remounted, not the stale −1.94
    expect(screen.getByLabelText('Audio fade in')).toHaveValue(1);
    expect(screen.getByLabelText('Audio fade out')).toHaveValue(2);
    // blur without editing: the uncontrolled field must NOT write el-7's −1.94
    // into el-6 (the original bug) — it re-commits el-6's own −9.1 dB
    fireEvent.blur(screen.getByLabelText('Clip gain'));
    expect(el('el-6').volume).toBeCloseTo(0.35, 6);
    expect(el('el-7').volume).toBe(0.8); // untouched
  });

  /* ---------- R23-WC D-C1 (#98): the uniform clip-row grammar ---------- */
  it('R23-WC D-C1 (#98): every CLIP param row = label + NumField + slider + readout — one anatomy for all three', () => {
    boot({ selection: ['el-6'], stripFocus: 'tr-audio-1' }); // volume 0.35 → −9.1 dB, fades 1.0 / 2.0
    for (const [label, readout] of [
      ['Gain dB', volToDb(0.35).toFixed(1) + ' dB'],
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
      // R24-W5a F2-P1: the range height utility SURVIVES the cascade now —
      // the app.css range reset lives in @layer base (the unlayered reset's
      // height:14px used to kill this h-[10px] row, source-pinned in
      // appLayers.test.ts)
      expect((kids[2] as HTMLElement).className).toContain('h-[10px]');
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
    expect(slider).toHaveAttribute('min', String(VOL_DB_MIN)); // R23-FIX item 6: the SHARED −24..+12 domain (was −48)
    expect(slider).toHaveAttribute('max', String(VOL_DB_MAX));
    fireEvent.change(slider, { target: { value: '-6' } });
    expect(screen.getByTestId('channel-clip-readout-Gain dB')).toHaveTextContent('-6.0 dB');
    fireEvent.pointerUp(slider);
    expect(el('el-6').volume).toBeCloseTo(dbToVol(-6), 6); // R23-FIX item 6: 10^(−6/20), the log map
    expect(screen.getByTestId('channel-clip-readout-Gain dB')).toHaveTextContent('-6.0 dB');
    // the fade-out twin commits the same way
    const out = screen.getByLabelText('Audio fade out slider (commit on release)');
    fireEvent.change(out, { target: { value: '4' } });
    fireEvent.pointerUp(out);
    expect(el('el-6').audioFadeOut).toBe(4);
  });

  /* R23-FIX (review-sweep item 6, R2-F4 — the cross-surface parity pin): the
     editor's gain row and the Inspector's Audio tab edit the SAME
     ElementJSON.volume through the SAME exported map — the two suites used
     to pin contradictory laws (linear here, log there). */
  it('R23-FIX item 6: the gain row rides the SHARED map — ChannelEditor and the Inspector agree on 0.8 → 20·log10(0.8) dB', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    expect(screen.getByLabelText('Clip gain')).toHaveValue(volToDb(0.8));
    // the write side inverts through the same dbToVol the Inspector uses
    expect(dbToVol(volToDb(0.35))).toBeCloseTo(0.35, 10);
  });

  it('R23-WC D-C1: the readout resyncs on an external write (NumField commit) — no stale display', () => {
    boot({ selection: ['el-6'], stripFocus: 'tr-audio-1' });
    const input = screen.getByLabelText('Audio fade out');
    fireEvent.change(input, { target: { value: '3.5' } });
    fireEvent.blur(input);
    expect(el('el-6').audioFadeOut).toBe(3.5);
    expect(screen.getByTestId('channel-clip-readout-Fade out')).toHaveTextContent('3.5 s');
    /* R24-W5a: the slider is CONTROLLED now (value={shown}) — the external
       write resyncs through the value prop (the old re-key-on-value remount
       is dead), so the DOM value follows without any remount. */
    expect(screen.getByLabelText('Audio fade out slider (commit on release)')).toHaveValue('3.5');
  });

  /* ---------- R24-W5a (DESIGN-R24 §2 F2-P2): the ClipParamRow focus law ---------- */
  it('R24-W5a F2: ArrowRight on a clip slider STEPS and KEEPS focus — no re-key remount drops it to body', () => {
    boot({ selection: ['el-6'], stripFocus: 'tr-audio-1' }); // fade in 1.0
    const slider = screen.getByLabelText('Audio fade in slider (commit on release)');
    slider.focus();
    expect(document.activeElement).toBe(slider);
    // one ArrowRight gesture: the native step lands as a change, the keyUp
    // commits (the browser sequence; jsdom fires both manually)
    fireEvent.change(slider, { target: { value: '1.5' } });
    fireEvent.keyUp(slider, { key: 'ArrowRight' });
    expect(el('el-6').audioFadeIn).toBe(1.5); // the value stepped + committed
    expect(screen.getByTestId('channel-clip-readout-Fade in')).toHaveTextContent('1.5 s');
    // the FOCUS survives the commit — the old key={`${keyId}-${label}-${value}`}
    // remounted the input and dropped activeElement to <body> (F2 live)
    expect(document.activeElement).toBe(slider);
    // a SECOND gesture on the SAME slider still keeps focus (no cumulative drift)
    fireEvent.change(slider, { target: { value: '2.5' } });
    fireEvent.keyUp(slider, { key: 'ArrowRight' });
    expect(el('el-6').audioFadeIn).toBe(2.5);
    expect(document.activeElement).toBe(slider);
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

  /* R24-W5c (DESIGN-R24 §2 F4-P3): the Aux-returns block covers BOTH aux
     buses — A2's return used to be reachable only via the dock strip. */
  it('R24-W5c F4: the Aux-returns block covers BOTH buses — A2 renders + commits (was dock-strip-only)', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    // both bus rows render, each with its own name + slider + readout
    expect(screen.getByText('Reverb')).toBeInTheDocument(); // a1
    expect(screen.getByText('Spare')).toBeInTheDocument(); // a2 — the NEW row
    const a1 = screen.getByLabelText('Aux 1 return gain') as HTMLInputElement;
    const a2 = screen.getByLabelText('Aux 2 return gain') as HTMLInputElement;
    expect(a1).toBeInTheDocument();
    expect(a2).toBeInTheDocument();
    expect(a2).toHaveAttribute('min', '-60'); // the same −60..+6 dB domain
    expect(a2).toHaveAttribute('max', '6');
    // both rows COMMIT through setAuxBus
    fireEvent.change(a2, { target: { value: '-6' } });
    expect(store().mixer.buses.a2.returnGain).toBe(-6);
    expect(store().mixer.buses.a1.returnGain).toBe(-6); // a1 untouched (fixture)
    fireEvent.change(a1, { target: { value: '3' } });
    expect(store().mixer.buses.a1.returnGain).toBe(3);
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

  /* R24-W5c (DESIGN-R24 §2 F4-P3): the De-esser Freq row is a LOG-domain
     control — the family's zoom-slider grammar (DOM range = a 0..100
     POSITION domain, value = 2000·(9000/2000)^(pos/100) Hz; keyboard and
     drag ride the one map). Mid-position is the GEOMETRIC mean
     √(2000·9000) ≈ 4.24 kHz — the old linear 2000..9000 track parked the
     arithmetic 5.5k mid-screen, useless for a de-esser. */
  it('R24-W5c F4: the De-esser Freq row is LOG-domain — mid-position ≈ the geometric mean, not the arithmetic', () => {
    boot({ selection: ['el-7'], stripFocus: 'tr-audio-2' });
    fireEvent.change(screen.getByLabelText('Insert slot 1'), { target: { value: 'De-esser' } });
    expect(screen.getByTestId('channel-insert-params-A2-De-esser')).toBeInTheDocument();
    const freq = screen.getByLabelText('De-esser Freq for A2') as HTMLInputElement;
    // the DOM range is the 0..100 POSITION domain; the param stays in Hz
    expect(freq).toHaveAttribute('min', '0');
    expect(freq).toHaveAttribute('max', '100');
    expect(freq).toHaveAttribute('step', '1');
    // boots at init 5.5 kHz → pos = log(5.5/2)/log(4.5)·100 ≈ 67.3 — the
    // default sits where the VALUE sits, not pinned mid-screen
    expect(Number(freq.value)).toBeGreaterThan(60);
    expect(Number(freq.value)).toBeLessThan(75);
    expect(screen.getByText('5.5 kHz')).toBeInTheDocument(); // the readout at init
    // MID-POSITION: 2000·4.5^0.5 = √(2000·9000) ≈ 4242.6 Hz → 4.2 kHz (the
    // geometric mean) — the old linear track read the ARITHMETIC midpoint
    // 5.5 kHz here (indistinguishable from the init — the useless row)
    fireEvent.change(freq, { target: { value: '50' } });
    expect(screen.getByText('4.2 kHz')).toBeInTheDocument();
    expect(screen.queryByText('5.5 kHz')).toBeNull();
    // the endpoints: pos 0/100 ⇔ the 2k/9k bounds (Home/End land exactly)
    fireEvent.change(freq, { target: { value: '0' } });
    expect(screen.getByText('2.0 kHz')).toBeInTheDocument();
    fireEvent.change(freq, { target: { value: '100' } });
    expect(screen.getByText('9.0 kHz')).toBeInTheDocument();
    // one keyboard STEP in the position domain = a constant ~1.5% RATIO in
    // Hz (4345.4 → 4.3 kHz) — keyboard + drag consistent through one map
    fireEvent.change(freq, { target: { value: '51' } });
    expect(screen.getByText('4.3 kHz')).toBeInTheDocument();
  });
});
