/* ChannelStrip component tests — the G-layer strip projection (spec 20 §4.2 /
   §12.2) rebuilt to the Fairlight reference anatomy (R19-B1): top bar,
   input row, FX chip rack + "I" power, graph thumbnails, role label,
   R/S/M (record-arm display-only), pan crosshair box, the TERMINAL
   fader section (equal-height columns + shared headroom), plus the
   reference strip width / compact mode and focus/flash affordances. */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ChannelStrip, AuxStrip } from './ChannelStrip';
import { EqThumb, DynThumb } from './StripGraphs';
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
  it('renders the A2 strip: badge, name, role label, group semantics (spec 20 §4.2)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const s = strip('A2');
    expect(s).toHaveAttribute('role', 'group');
    expect(s).toHaveAttribute('aria-label', 'A2 channel strip');
    expect(within(s).getByTestId('strip-role')).toHaveTextContent('BGM'); // mockMixer role tag
    expect(within(s).getAllByText('A2').length).toBe(2); // badge + name header
  });

  it('the A1 strip is tagged Dialogue and gets NO duck-under row (spec 20 §12.2)', () => {
    renderPlain(<Strip trackId="tr-audio-1" />);
    expect(within(strip('A1')).getByTestId('strip-role')).toHaveTextContent('Dialogue');
    expect(screen.queryByTestId('mixer-ducking-A1')).toBeNull(); // ducking editing lives in the ChannelEditor
  });

  it('S/M route through toggleTrackCmd — the same undoable command as the headers (spec 18 §4.7)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    fireEvent.click(screen.getByRole('button', { name: 'Mute A2' }));
    expect(track('tr-audio-2').muted).toBe(true);
    expect(screen.getByRole('button', { name: 'Mute A2' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Solo A2' }));
    expect(track('tr-audio-2').solo).toBe(true);
    expect(store().past).toHaveLength(2);
  });

  it('R = record arm: display-only toggle + honest toast, no doc mutation (gap C40)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const r = screen.getByTestId('strip-rec-arm');
    expect(r).toHaveAttribute('aria-pressed', 'false');
    expect(r).toHaveAccessibleName('Record arm A2');
    const before = store().toasts.length;
    fireEvent.click(r);
    expect(r).toHaveAttribute('aria-pressed', 'true'); // display state flips
    expect(store().toasts.length).toBe(before + 1); // honest answer, never silent
    expect(store().toasts.at(-1)!.title).toBe('Record arm');
    // the doc slice is untouched — no recordArm field exists (gap C40)
    expect(track('tr-audio-2').muted).toBe(false);
    expect(track('tr-audio-2').solo).toBe(false);
    expect(track('tr-audio-2').locked).toBe(true); // fixture value, unchanged
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

  it('the pan crosshair box keeps the knob keyboard grammar and writes the G-slice pan (design doc §6)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const pan = screen.getByRole('slider', { name: 'A2 pan' });
    expect(pan).toHaveAttribute('aria-valuetext', 'C');
    fireEvent.keyDown(pan, { key: 'ArrowRight' });
    expect(g('tr-audio-2').pan).toBe(5);
    fireEvent.keyDown(pan, { key: 'ArrowLeft', shiftKey: true });
    expect(g('tr-audio-2').pan).toBe(4); // fine mode ±1
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

/* ---------- R19-B1 reference anatomy (audio_mixer.html) ---------- */
describe('ChannelStrip R19-B1 reference anatomy', () => {
  it('strip width: 86px full / 72px compact (reference §2.3)', () => {
    const { rerender } = renderPlain(<Strip trackId="tr-audio-2" />);
    expect(strip('A2').style.width).toBe('86px');
    rerender(<Strip trackId="tr-audio-2" compact />);
    expect(strip('A2').style.width).toBe('72px');
  });

  it('renders the 3px role-color TOP bar (replaces the old h-1 bottom base bar)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />); // fixture role: BGM
    const bar = screen.getByTestId('mixer-topbar-A2');
    expect(bar.className).toContain('h-[3px]');
    expect(bar.style.background).toBe('var(--mk-role-bgm)');
    expect(bar.getAttribute('aria-hidden')).toBe('true');
    renderPlain(<Strip trackId="tr-audio-1" />);
    expect(screen.getByTestId('mixer-topbar-A1').style.background).toBe('var(--mk-role-dialogue)');
  });

  it('input row: "No Input", 22px, display state (reference row 2, gap C40)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const input = within(strip('A2')).getByTestId('strip-input');
    expect(input).toHaveTextContent('No Input');
    expect(input.className).toContain('h-[22px]');
    expect(input.getAttribute('title')).toContain('gap C40');
  });

  it('FX chip rack renders N real inserts as gold chips + (2−N) add-slot chips (reference row 3)', () => {
    // A1 ships inserts ['EQ', null] → 1 gold chip + 1 add chip
    const { unmount } = renderPlain(<Strip trackId="tr-audio-1" />);
    const a1 = strip('A1');
    expect(within(a1).getAllByTestId('fx-chip')).toHaveLength(1);
    expect(within(a1).getByTestId('fx-chip')).toHaveTextContent('EQ');
    expect(within(a1).getAllByTestId('fx-add')).toHaveLength(1);
    expect(within(a1).getByTestId('fx-chip').className).toContain('text-[var(--solo)]'); // gold
    unmount();
    // A2 ships [null, null] → 0 chips + 2 add chips
    renderPlain(<Strip trackId="tr-audio-2" />);
    const a2 = strip('A2');
    expect(within(a2).queryAllByTestId('fx-chip')).toHaveLength(0);
    expect(within(a2).getAllByTestId('fx-add')).toHaveLength(2);
  });

  it('add-slot chip click answers honestly: insert browser is a v2 surface (gap C40)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const before = store().toasts.length;
    fireEvent.click(within(strip('A2')).getAllByTestId('fx-add')[0]);
    expect(store().toasts.length).toBe(before + 1);
    expect(store().toasts.at(-1)!.title).toBe('Insert browser');
    expect(store().toasts.at(-1)!.detail).toContain('v2');
    // no model mutation — the 2 slots stay empty
    expect(g('tr-audio-2').inserts).toEqual([null, null]);
  });

  it('"I" power button: 16×16 gold display state + honest toast, no model mutation (reference row 4, gap C40)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const i = within(strip('A2')).getByTestId('fx-power');
    expect(i).toHaveAccessibleName('A2 inserts power');
    expect(i).toHaveAttribute('aria-pressed', 'true');
    expect(i.className).toContain('w-[16px]');
    const before = store().toasts.length;
    fireEvent.click(i);
    expect(i).toHaveAttribute('aria-pressed', 'false'); // display state flips
    expect(store().toasts.length).toBe(before + 1);
    expect(store().toasts.at(-1)!.title).toBe('Inserts power');
  });

  it('graph thumbnails: EQ + dynamics SVGs, deterministic per trackId (reference row 5)', () => {
    const { unmount } = renderPlain(<Strip trackId="tr-audio-2" />);
    const a2 = strip('A2');
    const eqA2 = within(a2).getByTestId('eq-thumb-path').getAttribute('d');
    const dynA2 = within(a2).getByTestId('dyn-thumb-path').getAttribute('d');
    expect(within(a2).getByTestId('eq-thumb').getAttribute('class')).toContain('h-[28px]');
    unmount();
    renderPlain(<Strip trackId="tr-audio-1" />);
    const a1 = strip('A1');
    // deterministic: same track → same curves; different track → different
    expect(within(a1).getByTestId('eq-thumb-path').getAttribute('d')).not.toBe(eqA2);
    expect(within(a1).getByTestId('dyn-thumb-path').getAttribute('d')).not.toBe(dynA2);
    const eqSolo = render(<EqThumb trackKey="tr-audio-2" />);
    expect(eqSolo.container.querySelector('[data-testid="eq-thumb-path"]')!.getAttribute('d')).toBe(eqA2);
    eqSolo.unmount();
    const dynSolo = render(<DynThumb trackKey="tr-audio-2" />);
    expect(dynSolo.container.querySelector('[data-testid="dyn-thumb-path"]')!.getAttribute('d')).toBe(dynA2);
  });

  it('pan box: 48×48 crosshair with the 4px dot at left = 50 + pan/2 % (reference row 6)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const box = within(strip('A2')).getByTestId('pan-box');
    expect(box.className).toContain('w-[48px]');
    expect(box.className).toContain('h-[48px]');
    const dot = box.querySelector('[data-testid="pan-dot"]') as HTMLElement;
    expect(dot.className).toContain('w-[4px]');
    expect(dot.style.left).toBe('50%'); // pan 0
  });

  it('compact strips keep the fader but drop graphs + input rows (dock squeeze mode)', () => {
    renderPlain(<Strip trackId="tr-audio-2" compact />);
    expect(strip('A2').style.width).toBe('72px');
    expect(screen.getByRole('slider', { name: 'A2 fader' })).toBeInTheDocument();
    expect(screen.queryByTestId('strip-graphs')).toBeNull();
    expect(screen.queryByTestId('strip-input')).toBeNull();
  });

  it('R/S/M are normalized 20×20 letter buttons (reference row 9) with semantic on-state tokens kept', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    for (const name of ['Record arm A2', 'Solo A2', 'Mute A2']) {
      const b = screen.getByRole('button', { name });
      expect(b.className).toContain('w-[20px]');
      expect(b.className).toContain('h-[20px]');
    }
    fireEvent.click(screen.getByRole('button', { name: 'Mute A2' }));
    expect(track('tr-audio-2').muted).toBe(true);
  });
});

/* ---------- the terminal fader section (th_mto37ze9 / th_mto6496s / th_mtoyq7jt) ---------- */
describe('ChannelStrip terminal fader section (equal-height law)', () => {
  it('the fader section is the TERMINAL flex-1 block — nothing sits below the fader', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const s = strip('A2');
    const section = screen.getByTestId('fader-section-A2');
    expect(section.className).toContain('flex-1');
    expect(section.className).toContain('min-h-[124px]');
    expect(s.lastElementChild).toBe(section); // flush to the strip bottom
  });

  it('shared 24px headroom readout: fader dB (mono, signed 1dp, NO unit) + live engine peak', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const row = screen.getByTestId('mixer-readout-A2');
    expect(row.className).toContain('h-[24px]');
    expect(row.className).toContain('mono'); // tabular-nums rides .mono
    expect(within(row).getByText('-12.0')).toBeInTheDocument(); // G-slice fader (A2 boots −12), no unit
    const peak = within(row).getByText('−∞');
    expect(peak.className).toContain('var(--meter-green)'); // token color, not a hex
    act(() => { __setLevel('tr-audio-2', -6); });
    expect(within(row).getByText('-6.0')).toBeInTheDocument(); // engine peak, signed 1dp
    expect(within(row).queryByText('−∞')).toBeNull();
  });

  it('equal-height law: meter + fader columns share one height var; scale + groove self-stretch (th_mtoyq7jt)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const cols = screen.getByTestId('fader-cols-A2');
    expect(cols.className).toContain('items-stretch');
    expect(cols.style.getPropertyValue('--fader-col-h')).toBe('100%');
    const meterCol = cols.querySelector('[data-col="meter"]') as HTMLElement;
    const faderCol = cols.querySelector('[data-col="fader"]') as HTMLElement;
    expect(meterCol.style.height).toBe('var(--fader-col-h)');
    expect(faderCol.style.height).toBe('var(--fader-col-h)');
    // inside the Fader: the scale column and the groove column stretch the
    // same row (one items-stretch parent)
    const scale = faderCol.querySelector('[data-col="scale"]') as HTMLElement;
    const groove = faderCol.querySelector('[data-col="groove"]') as HTMLElement;
    expect(scale.className).toContain('self-stretch');
    expect(groove.className).toContain('self-stretch');
  });

  it('the meter column is a FIXED 14px, never w-full (th_mto617w1)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const well = screen.getByTestId('fader-cols-A2').querySelector('.meter-well') as HTMLElement;
    expect(well.style.width).toBe('14px');
    expect(well.className).not.toContain('w-full');
  });

  it('carries the fader\'s dB scale column at the reference piecewise positions (channel strips only)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const scale = strip('A2').querySelector('[data-testid="fader-scale"]') as HTMLElement;
    expect(scale).not.toBeNull();
    expect(scale.getAttribute('aria-hidden')).toBe('true');
    expect(scale.textContent).toContain('−30');
    expect(scale.textContent).toContain('−50');
    expect(scale.textContent).toContain('0');
    // the old linear labels are gone
    expect(scale.textContent).not.toContain('+6');
    expect(scale.textContent).not.toContain('−∞');
  });

  it('section hairlines (--border-strong) rhythm the strip (A4)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
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
});

/* ---------- aux return strips ---------- */
describe('AuxStrip', () => {
  it('the bus ON badge is a real toggle writing AuxBusSettings.on (R14)', () => {
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

  it('aux strips: the type-audio top bar + headroom readout on the engine bus key (A4/R19-B1 grammar)', () => {
    renderPlain(<AuxStrip bus="a1" compact={false} />);
    expect(screen.getByTestId('mixer-topbar-aux-a1').style.background).toBe('var(--type-audio)');
    const row = screen.getByTestId('mixer-readout-aux-a1');
    expect(within(row).getByText('-6.0')).toBeInTheDocument(); // a1 Reverb returnGain, no unit
    expect(within(row).getByText('−∞')).toBeInTheDocument();
  });

  it('the aux fader section is terminal with the same equal-height law', () => {
    renderPlain(<AuxStrip bus="a1" compact={false} />);
    const section = screen.getByTestId('fader-section-aux-a1');
    expect(section.className).toContain('flex-1');
    expect(screen.getByTestId('mixer-strip-aux-a1').lastElementChild).toBe(section);
    const cols = screen.getByTestId('fader-cols-aux-a1');
    const meterCol = cols.querySelector('[data-col="meter"]') as HTMLElement;
    const faderCol = cols.querySelector('[data-col="fader"]') as HTMLElement;
    expect(meterCol.style.height).toBe('var(--fader-col-h)');
    expect(faderCol.style.height).toBe('var(--fader-col-h)');
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
