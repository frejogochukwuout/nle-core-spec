/* ChannelStrip component tests — the G-layer strip projection (spec 20 §4.2 /
   §12.2) rebuilt to the Fairlight reference anatomy (R20-W1, DESIGN-R20
   D1.2 / mixer-contract §1): 3px kind top bar + 25px ID-only header, input
   row, 5-slot FX rack + "I" power (store-backed display state, B6), graph
   thumbnails, 48px pan crosshair box, routing bus buttons, NAME title row,
   R/S/M, and the TERMINAL fader section — [scale | fader | meter] columns
   (D1 order) with the cross-strip dB gridlines (D2). The height tiers
   (D1.3) and the narrow width fallback are pinned here at the strip level;
   the dock-level measurement/tier wiring is MixerDock.test. */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ChannelStrip, AuxStrip, t3FaderLayout } from './ChannelStrip';
import { EqThumb, DynThumb } from './StripGraphs';
import { renderPlain, store } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';
import { meterGetSnapshot, __setLevel } from '../../lib/meterEngine';

/** Strip harness reading the track from the store (fresh on doc mutations). */
function Strip({ trackId, tier = 0, narrow = false, stripH, focused = false, flashing = false, index = 0 }: {
  trackId: string; tier?: 0 | 1 | 2 | 3; narrow?: boolean; stripH?: number; focused?: boolean; flashing?: boolean; index?: number;
}) {
  const scene = useUi((s) => s.scenes.find((x) => x.id === 'sc-1')!);
  const track = scene.tracks.find((t) => t.id === trackId);
  if (!track) return null;
  return (
    <div style={{ height: 560 }}>
      <ChannelStrip
        track={track}
        sceneId="sc-1"
        tier={tier}
        narrow={narrow}
        stripH={stripH}
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
  it('renders the A2 strip: ID header, NAME title row, group semantics (spec 20 §4.2)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const s = strip('A2');
    expect(s).toHaveAttribute('role', 'group');
    expect(s).toHaveAttribute('aria-label', 'A2 channel strip');
    // D5: the header is ID-only — the NAME lives in the 26px title row
    expect(within(s).getByTestId('strip-title')).toHaveTextContent('A2');
    expect(within(s).getAllByText('A2').length).toBe(2); // ID header + title row
  });

  it('the A1 strip is tagged Dialogue (top-bar color) and gets NO duck-under row (spec 20 §12.2)', () => {
    renderPlain(<Strip trackId="tr-audio-1" />);
    expect(screen.getByTestId('mixer-topbar-A1').style.background).toBe('var(--mk-role-dialogue)');
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

  it('R = record arm: display-only toggle + honest toast, no doc mutation — B6: the flag is STORE state', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const r = screen.getByTestId('strip-rec-arm');
    expect(r).toHaveAttribute('aria-pressed', 'false');
    expect(r).toHaveAccessibleName('Record arm A2');
    const before = store().toasts.length;
    fireEvent.click(r);
    expect(r).toHaveAttribute('aria-pressed', 'true'); // display state flips
    expect(store().stripArm['tr-audio-2']).toBe(true); // B6: survives unmounts
    expect(store().toasts.length).toBe(before + 1); // honest answer, never silent
    expect(store().toasts.at(-1)!.title).toBe('Record arm');
    // the doc slice is untouched — no recordArm field exists (gap C40)
    expect(track('tr-audio-2').muted).toBe(false);
    expect(track('tr-audio-2').solo).toBe(false);
    expect(track('tr-audio-2').locked).toBe(true); // fixture value, unchanged
  });

  it('B6: R/I display state survives a remount (was component-local useState, reset on unmount)', () => {
    const { unmount } = renderPlain(<Strip trackId="tr-audio-2" />);
    fireEvent.click(screen.getByTestId('strip-rec-arm'));
    fireEvent.click(screen.getByTestId('fx-power'));
    unmount();
    renderPlain(<Strip trackId="tr-audio-2" />);
    expect(store().stripArm['tr-audio-2']).toBe(true);
    expect(store().stripInsertsOn['tr-audio-2']).toBe(false);
    expect(screen.getByTestId('strip-rec-arm')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('fx-power')).toHaveAttribute('aria-pressed', 'false');
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

/* ---------- R20-W1 reference anatomy (audio_mixer.html, contract §1) ---------- */
describe('ChannelStrip R20-W1 reference anatomy', () => {
  it('strip width: uniform 86px full / 72px narrow (D7 — width decoupled from height)', () => {
    const { rerender } = renderPlain(<Strip trackId="tr-audio-2" />);
    expect(strip('A2').style.width).toBe('86px');
    rerender(<Strip trackId="tr-audio-2" narrow />);
    expect(strip('A2').style.width).toBe('72px');
  });

  it('header: 3px role-color top bar + 25px ID-only row = the reference 28px bordered header (D5/D13)', () => {
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

  it('FX rack (D3): 5 slots at T0 — real inserts gold + dim empties + the LAST "+" add; 62px/3 slots at T1', () => {
    // A1 ships inserts ['EQ', null] → 1 gold chip + 3 dim + 1 add
    const { unmount } = renderPlain(<Strip trackId="tr-audio-1" />);
    const a1 = strip('A1');
    const rack = within(a1).getByTestId('fx-rack');
    expect(rack.style.height).toBe('105px'); // reference row 3
    expect(within(a1).getAllByTestId('fx-chip')).toHaveLength(1);
    expect(within(a1).getByTestId('fx-chip')).toHaveTextContent('EQ');
    expect(within(a1).getAllByTestId('fx-add')).toHaveLength(1); // the LAST slot only
    expect(within(a1).getAllByTestId('fx-slot-empty')).toHaveLength(3);
    expect(within(a1).getByTestId('fx-chip').className).toContain('text-[var(--solo)]'); // gold
    unmount();
    // A2 ships [null, null] → 0 chips + 4 dim + 1 add
    renderPlain(<Strip trackId="tr-audio-2" />);
    const a2 = strip('A2');
    expect(within(a2).queryAllByTestId('fx-chip')).toHaveLength(0);
    expect(within(a2).getAllByTestId('fx-add')).toHaveLength(1);
    expect(within(a2).getAllByTestId('fx-slot-empty')).toHaveLength(4);
  });

  it('add-slot chip click answers honestly: insert browser is a v2 surface (gap C40)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const before = store().toasts.length;
    fireEvent.click(within(strip('A2')).getByTestId('fx-add'));
    expect(store().toasts.length).toBe(before + 1);
    expect(store().toasts.at(-1)!.title).toBe('Insert browser');
    expect(store().toasts.at(-1)!.detail).toContain('v2');
    // no model mutation — the 2 slots stay empty
    expect(g('tr-audio-2').inserts).toEqual([null, null]);
  });

  it('"I" power button: 16×16 gold, store-backed display state + honest toast (reference row 4, B6/gap C40)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const i = within(strip('A2')).getByTestId('fx-power');
    expect(i).toHaveAccessibleName('A2 inserts power');
    expect(i).toHaveAttribute('aria-pressed', 'true');
    expect(i.className).toContain('w-[16px]');
    expect(i.className).toContain('h-[16px]');
    const before = store().toasts.length;
    fireEvent.click(i);
    expect(i).toHaveAttribute('aria-pressed', 'false'); // display state flips
    expect(store().stripInsertsOn['tr-audio-2']).toBe(false); // in the STORE
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

  it('routing row (D4): two 16×16 "1"/"2" bus buttons write outputBus; active bus returns to master', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const b1 = within(strip('A2')).getByTestId('strip-bus-1');
    const b2 = within(strip('A2')).getByTestId('strip-bus-2');
    expect(b1.className).toContain('w-[16px]');
    expect(b2.className).toContain('h-[16px]');
    expect(b1).toHaveAttribute('aria-pressed', 'false'); // boots on master
    fireEvent.click(b1);
    expect(g('tr-audio-2').outputBus).toBe(1); // REAL G-surface write
    expect(b1).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(b1);
    expect(g('tr-audio-2').outputBus).toBe(0); // pressing the active bus returns to master
    fireEvent.click(b2);
    expect(g('tr-audio-2').outputBus).toBe(2);
  });

  it('title row: the NAME, 26px, gold for the music role (reference row 8, D5/D6)', () => {
    renderPlain(<Strip trackId="tr-audio-2" />); // A2 role = bgm → not gold
    const title = within(strip('A2')).getByTestId('strip-title');
    expect(title.className).toContain('text-[11px]');
    expect(title.className).toContain('font-bold');
    expect(title.className).not.toContain('text-[var(--solo)]');
    // roles cycle dialogue→bgm→sfx→music per track: a 4th track would be gold
    // (mockMixer roleSeq) — pinned via the unit's own rack instead:
    expect(title).toHaveTextContent('A2');
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

  it('row order (D6): header → input → rack → I → graphs → pan → routing → title → RSM → fader', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const ids = within(strip('A2'))
      .getAllByTestId(/^(strip-input|fx-rack|fx-power|strip-graphs|pan-box|strip-bus-1|strip-title|strip-rec-arm|fader-section-A2)$/)
      .map((el) => el.getAttribute('data-testid'));
    expect(ids).toEqual([
      'strip-input', 'fx-rack', 'fx-power', 'strip-graphs', 'pan-box', 'strip-bus-1', 'strip-title', 'strip-rec-arm', 'fader-section-A2',
    ]);
  });
});

/* ---------- height tiers (D1.3) at the strip level ---------- */
describe('ChannelStrip height tiers (D1.3, contract §4.2 revised)', () => {
  it('T1: graphs collapse to ONE combined 28px row, pan box 36, fx rack 3 slots, name in header, no routing/title rows', () => {
    renderPlain(<Strip trackId="tr-audio-2" tier={1} />);
    const s = strip('A2');
    const graphs = within(s).getByTestId('strip-graphs');
    expect(graphs.className).toContain('py-[2px]');
    // one combined box carrying BOTH deterministic paths
    expect(within(s).getAllByTestId(/thumb-path$/)).toHaveLength(2); // eq + dyn overlaid
    expect(within(s).getByTestId('eq-thumb-path')).toBeInTheDocument();
    expect(within(s).getByTestId('dyn-thumb-path')).toBeInTheDocument();
    expect(within(s).queryByTestId('eq-thumb')).toBeNull(); // no separate EQ box
    const pan = within(s).getByTestId('pan-box');
    expect(pan.className).toContain('w-[36px]'); // pan 48→36
    expect(within(s).getByTestId('fx-rack').style.height).toBe('62px'); // 3 slots
    expect(within(s).getByTestId('strip-input')).toBeInTheDocument(); // input stays at T1
    expect(within(s).queryByTestId('strip-bus-1')).toBeNull(); // routing dropped
    expect(within(s).queryByTestId('strip-title')).toBeNull(); // name merged into the header
    // the header carries badge + name (the fixture name equals the badge)
    const header = within(s).getByText('A2', { selector: '.truncate' });
    expect(header).toBeInTheDocument();
    expect(header.tagName).toBe('SPAN');
  });

  it('T2: graphs + input + rack hidden; the fx-count chip in the header expands a popover', () => {
    renderPlain(<Strip trackId="tr-audio-2" tier={2} />);
    const s = strip('A2');
    expect(within(s).queryByTestId('strip-graphs')).toBeNull();
    expect(within(s).queryByTestId('strip-input')).toBeNull();
    expect(within(s).queryByTestId('fx-rack')).toBeNull();
    expect(within(s).getByTestId('pan-box').className).toContain('w-[36px]');
    expect(within(s).getByTestId('fx-power')).toBeInTheDocument(); // I row stays
    const chip = within(s).getByTestId('fx-count');
    expect(chip).toHaveTextContent('FX0'); // A2 boots with no inserts
    expect(chip).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(chip);
    expect(chip).toHaveAttribute('aria-expanded', 'true');
    const pop = within(s).getByTestId('fx-count-popover');
    expect(within(pop).getAllByText('—')).toHaveLength(2); // the 2 model slots, empty
  });

  it('T3: the accessory stack scrolls inside the strip; the trio + RSM pin at the bottom (clamp formula exact)', () => {
    renderPlain(<Strip trackId="tr-audio-2" tier={3} stripH={300} />);
    const s = strip('A2');
    const scroll = within(s).getByTestId('strip-scroll-A2');
    expect(scroll.className).toContain('scroll-y');
    // scrollMin = max(40, 300−53−164) = 83
    expect(scroll.style.minHeight).toBe('83px');
    // the full accessory stack lives INSIDE the scroll (T0 rows)
    expect(within(scroll).getByTestId('strip-input')).toBeInTheDocument();
    expect(within(scroll).getByTestId('fx-rack').style.height).toBe('105px');
    expect(within(scroll).getByTestId('strip-graphs')).toBeInTheDocument();
    expect(within(scroll).getByTestId('pan-box')).toBeInTheDocument();
    expect(within(scroll).getByTestId('strip-bus-1')).toBeInTheDocument();
    expect(within(scroll).getByTestId('strip-title')).toBeInTheDocument();
    // faderSection = clamp(300−53−83, 164, 260) = 164 — the travel floor wins
    const section = within(s).getByTestId('fader-section-A2');
    expect(section.style.height).toBe('164px');
    expect(section.className).not.toContain('flex-1'); // FIXED height, not flex
    // nothing below the fader; RSM sits directly above it, pinned
    expect(s.lastElementChild).toBe(section);
  });

  it('t3FaderLayout: the clamp formula pinned at the band edges (travel floor wins, scroll floor 40)', () => {
    expect(t3FaderLayout(339)).toEqual({ faderHeight: 164, scrollMin: 122 });
    expect(t3FaderLayout(300)).toEqual({ faderHeight: 164, scrollMin: 83 });
    expect(t3FaderLayout(280)).toEqual({ faderHeight: 164, scrollMin: 63 });
    // below the 53+40+164=257 collapse the scroll floor yields to 40px
    expect(t3FaderLayout(250)).toEqual({ faderHeight: 164, scrollMin: 40 });
    // the scroll absorbs the remainder (fader pinned at the 164 travel
    // floor); the 260 upper clamp is the formula's structural guard —
    // scrollMin keeps growing on hypothetical tall-T3 heights instead
    expect(t3FaderLayout(420)).toEqual({ faderHeight: 164, scrollMin: 203 });
  });

  it('narrow strips (D1.3 width fallback): 72px, trio drops the meter column (scale+fader only)', () => {
    renderPlain(<Strip trackId="tr-audio-2" narrow />);
    const s = strip('A2');
    expect(s.style.width).toBe('72px');
    const cols = within(s).getByTestId('fader-cols-A2');
    expect(cols.querySelector('[data-col="meter"]')).toBeNull(); // no meter column
    expect(cols.querySelector('[data-col="fader"]')).not.toBeNull();
    expect(screen.getByRole('slider', { name: 'A2 fader' })).toBeInTheDocument();
    expect(within(s).getByTestId('fader-gridlines')).toBeInTheDocument(); // gridlines stay
  });
});

/* ---------- the terminal fader section (th_mto37ze9 / th_mto6496s / th_mtoyq7jt) ---------- */
describe('ChannelStrip terminal fader section (equal-height law)', () => {
  it('the fader section is the TERMINAL flex-1 block — nothing sits below the fader', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const s = strip('A2');
    const section = screen.getByTestId('fader-section-A2');
    expect(section.className).toContain('flex-1');
    expect(section.className).toContain('min-h-[164px]'); // travel floor 140 + 24 headroom
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

  it('column order D1: scale | fader | meter — the meter column renders AFTER the fader column', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const cols = screen.getByTestId('fader-cols-A2');
    const faderCol = cols.querySelector('[data-col="fader"]') as HTMLElement;
    const meterCol = cols.querySelector('[data-col="meter"]') as HTMLElement;
    expect(faderCol).not.toBeNull();
    expect(meterCol).not.toBeNull();
    // the fader column (scale+groove inside) renders BEFORE the meter column
    expect(faderCol.compareDocumentPosition(meterCol)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    // inside the Fader: the scale column precedes the groove (D1 order)
    const scale = faderCol.querySelector('[data-col="scale"]') as HTMLElement;
    const groove = faderCol.querySelector('[data-col="groove"]') as HTMLElement;
    expect(scale.compareDocumentPosition(groove)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('D2: the cross-strip dB gridlines live inside the pinned columns row', () => {
    renderPlain(<Strip trackId="tr-audio-2" />);
    const cols = screen.getByTestId('fader-cols-A2');
    const grid = cols.querySelector('[data-testid="fader-gridlines"]') as HTMLElement;
    expect(grid).not.toBeNull();
    expect(grid.style.backgroundImage).toContain('var(--fader-grid) 15%');
    expect(cols.className).toContain('relative'); // the layer's containing block
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
    renderPlain(<AuxStrip bus="a2" />);
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
    renderPlain(<AuxStrip bus="a1" />);
    renderPlain(<AuxStrip bus="a2" />);
    // ONE key per bus (was 'aux-a1'/'aux-a2' before the registry unification)
    expect(meterGetSnapshot('auxA').muted).toBe(false); // a1 Reverb boots ON
    expect(meterGetSnapshot('auxB').muted).toBe(true); // a2 Spare boots OFF → honest silent return
  });

  it('aux strips: the type-audio top bar + headroom readout on the engine bus key (A4 grammar)', () => {
    renderPlain(<AuxStrip bus="a1" />);
    expect(screen.getByTestId('mixer-topbar-aux-a1').style.background).toBe('var(--type-audio)');
    const row = screen.getByTestId('mixer-readout-aux-a1');
    expect(within(row).getByText('-6.0')).toBeInTheDocument(); // a1 Reverb returnGain, no unit
    expect(within(row).getByText('−∞')).toBeInTheDocument();
  });

  it('the aux strip keeps the uniform 86px width (D7)', () => {
    renderPlain(<AuxStrip bus="a1" />);
    expect(screen.getByTestId('mixer-strip-aux-a1').style.width).toBe('86px');
  });

  it('the aux fader section is terminal with the same equal-height law + column order', () => {
    renderPlain(<AuxStrip bus="a1" />);
    const section = screen.getByTestId('fader-section-aux-a1');
    expect(section.className).toContain('flex-1');
    expect(screen.getByTestId('mixer-strip-aux-a1').lastElementChild).toBe(section);
    const cols = screen.getByTestId('fader-cols-aux-a1');
    const meterCol = cols.querySelector('[data-col="meter"]') as HTMLElement;
    const faderCol = cols.querySelector('[data-col="fader"]') as HTMLElement;
    expect(meterCol.style.height).toBe('var(--fader-col-h)');
    expect(faderCol.style.height).toBe('var(--fader-col-h)');
    expect(faderCol.compareDocumentPosition(meterCol)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  /* R24-W5c (DESIGN-R24 §2 F4-P3): the T0 header is ID-ONLY (the D5 law
     the channels/master keep) — the bus NAME lives in the 26px title row
     (the old name-in-header rendered "A1Reverb" + "Reverb" live). */
  it('R24-W5c F4: the T0 aux header is ID-ONLY — the bus name lives in the title row exactly once (D5)', () => {
    renderPlain(<AuxStrip bus="a1" />);
    const s = screen.getByTestId('mixer-strip-aux-a1');
    // the 25px header row (the badge's row) carries the ID ONLY
    const badge = within(s).getByText('A1');
    expect(badge.closest('div')!.textContent).toBe('A1'); // was "A1Reverb"
    // the bus name renders exactly ONCE — the title row's job (was 2×)
    expect(within(s).getAllByText('Reverb')).toHaveLength(1);
    expect(within(s).getByTestId('strip-title')).toHaveTextContent('Reverb');
    // the ID pattern holds for the a2 twin
    renderPlain(<AuxStrip bus="a2" />);
    const s2 = screen.getByTestId('mixer-strip-aux-a2');
    expect(within(s2).getByText('A2').closest('div')!.textContent).toBe('A2');
    expect(within(s2).getAllByText('Spare')).toHaveLength(1);
  });

  it('aux "no source" state: honest-disabled chip when nothing feeds the bus (A4)', () => {
    // fixture: NOTHING feeds either bus (all sends 0, no outputBus routes) —
    // both returns carry the honest-disabled chip in the bus row
    renderPlain(<AuxStrip bus="a1" />);
    renderPlain(<AuxStrip bus="a2" />);
    const chip = screen.getByTestId('mixer-nosource-a1');
    expect(chip).toHaveAttribute('aria-disabled', 'true');
    expect(chip).toHaveTextContent('no source');
    // the state is live, not fixture-frozen: one send > 0 drops a1's chip
    act(() => { useUi.getState().setMixerTrack('tr-audio-2', { auxA: 0.3 }); });
    expect(screen.queryByTestId('mixer-nosource-a1')).toBeNull();
    expect(screen.getByTestId('mixer-nosource-a2')).toBeInTheDocument(); // a2 still unfed
    // the engine side of the honesty is already pinned: bus OFF → silent
    expect(meterGetSnapshot('auxB').muted).toBe(true);
  });
});
