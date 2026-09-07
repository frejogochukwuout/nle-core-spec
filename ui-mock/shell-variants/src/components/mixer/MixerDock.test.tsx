/* MixerDock component tests — the 3-state machine (collapsed / meters /
   full, R20-W1 DESIGN-R20 D1.4): state-driven rendering, the meters-dock
   columns (thread #61), shared master values, strip focus + escalation
   flash, the MIXER_TIER constants + tier wiring (mocked offsetHeight fed
   through a recording ResizeObserver — jsdom's default stub never fires),
   the <FLOOR auto-fallback, the narrow width trigger, and the B4
   state-naming collapse controls. */

import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { MixerDock, MIXER_TIER, mixerTierFor } from './MixerDock';
import { TimelineToolbar } from '../timeline/TimelineToolbar';
import { renderShell, store, type UiPatch } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';
import { __setLevel } from '../../lib/meterEngine';

const boot = (patch: UiPatch = {}) => renderShell(<MixerDock />, { patch });

/** Recording ResizeObserver — captures callbacks so tests can fire them with
 *  a mocked offsetHeight (the mission's "tier visibility via mocked
 *  offsetHeight" path; jsdom's default stub never fires). */
function withRecordingRO<T>(fn: (fire: () => void) => T): T {
  const cbs: ResizeObserverCallback[] = [];
  const Orig = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) { cbs.push(cb); }
    observe() { /* no-op */ }
    unobserve() { /* no-op */ }
    disconnect() { /* no-op */ }
  } as unknown as typeof ResizeObserver;
  try {
    return fn(() => { act(() => { cbs.forEach((cb) => cb([], {} as ResizeObserver)); }); });
  } finally {
    globalThis.ResizeObserver = Orig;
  }
}

describe('MixerDock', () => {
  it('collapsed renders nothing at all (design doc v2.2 §4)', () => {
    const { container } = boot({ mixerState: 'collapsed' });
    expect(container.querySelector('[data-testid^="mixer-dock"]')).toBeNull();
  });

  it('meters state: full-height thin meter COLUMNS side by side + the master column pinned right (D1.4, thread #61)', () => {
    boot({ mixerState: 'meters' });
    const dock = screen.getByTestId('mixer-dock-meters');
    expect(dock).toHaveAttribute('role', 'group');
    expect(dock).toHaveAttribute('aria-label', 'Mixer meters');
    // one 24px column per audio track — NEVER stacked (B2)
    const col1 = within(dock).getByTestId('meter-col-A1');
    const col2 = within(dock).getByTestId('meter-col-A2');
    expect(col1.className).toContain('w-[24px]');
    expect(within(dock).queryByTestId('meter-col-A3')).toBeNull();
    // side by side: col1 precedes col2 in the same scroll region
    expect(col1.compareDocumentPosition(col2)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(within(col1).getByTitle(/A1: -3\.0 dB/)).toBeInTheDocument(); // G-slice fader drives the meter
    // the columns region owns the horizontal overflow (beyond capacity)
    expect(within(dock).getByTestId('meters-scroll').className).toContain('overflow-x-auto');
    // master column pinned right, after the scroll region
    const master = within(dock).getByTestId('meter-col-master');
    expect(within(dock).getByTestId('meters-scroll').compareDocumentPosition(master)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(within(master).getByText('MST')).toBeInTheDocument();
    expect(within(master).getByTitle(/Master: -8\.5 dB/)).toBeInTheDocument();
  });

  it('meters columns carry the M/S micro dots mirroring the doc-slice state (display-only)', () => {
    boot({ mixerState: 'meters' });
    const dots = screen.getByTestId('meter-ms-A2');
    expect(dots.querySelectorAll('span')).toHaveLength(2);
    expect(dots.querySelector('span')!.className).not.toContain('mute-warn');
    act(() => { useUi.getState().toggleTrackCmd('sc-1', 'tr-audio-2', 'muted'); });
    expect(screen.getByTestId('meter-ms-A2').querySelector('span')!.className).toContain('mute-warn');
    // the solo dot lights with the solo token
    act(() => { useUi.getState().toggleTrackCmd('sc-1', 'tr-audio-2', 'solo'); });
    const dots2 = screen.getByTestId('meter-ms-A2');
    expect(dots2.children[0]!.className).toContain('mute-warn');
    expect(dots2.children[1]!.className).toContain('solo');
  });

  it('meters master + toolbar micro-meter share ONE master engine key (R15-A2 unification)', () => {
    renderShell(
      <>
        <MixerDock />
        <TimelineToolbar />
      </>,
      { patch: { mixerState: 'meters' } },
    );
    const meters = screen.getAllByTitle(/Master: -8\.5 dB/);
    expect(meters).toHaveLength(2); // meters master column + toolbar micro — one key, two views
    act(() => { __setLevel('master', -12); });
    for (const m of meters) {
      const fill = m.querySelector('[data-channel="l"] > div') as HTMLElement;
      // B9 taper fill: 1 − dbToPos(−12) = 52.8% revealed
      expect(fill.style.clipPath).toBe('inset(47.2% 0 0 0)');
    }
  });

  it('the meters master mute shares the toolbar/strip store values (design doc §4.5 single source)', () => {
    boot({ mixerState: 'meters' });
    const mute = screen.getByRole('button', { name: 'Master mute' });
    expect(mute).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mute);
    expect(store().masterMuted).toBe(true);
    expect(screen.getByRole('button', { name: 'Master mute' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('B4: the meters expand control names its state and cycles to FULL in the Edit page (v2.2 3-state cycle)', () => {
    boot({ mixerState: 'meters' });
    // D1.4/B4: from `meters` the cycle lands on FULL on both pages — the old
    // "Collapse mixer rail" quirk label is replaced by an honest state name
    const btn = screen.getByRole('button', { name: 'Mixer: meter columns (click for full strips)' });
    /* R20-W6FIX (P2-2): the dock IS open in the meters state — the pressed
       value is DERIVED (mixerState !== 'collapsed'), not the hard-coded
       false the review caught lying. */
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn.querySelector('svg')!.getAttribute('class')).toContain('lucide-panel-right'); // PanelRight glyph (B4)
    fireEvent.click(btn);
    expect(store().mixerState).toBe('full');
  });

  it('full renders the strip row: per-track strips + 2 aux returns + master (design doc v2.2 §4)', () => {
    boot({ mixerState: 'full' });
    const dock = screen.getByTestId('mixer-dock-full');
    expect(dock).toHaveAttribute('role', 'group');
    expect(dock).toHaveAttribute('aria-label', 'Audio mixer');
    for (const tid of ['mixer-strip-A1', 'mixer-strip-A2', 'mixer-strip-aux-a1', 'mixer-strip-aux-a2', 'mixer-strip-master']) {
      expect(within(dock).getByTestId(tid)).toBeInTheDocument();
    }
    expect(screen.getByText('MIXER · G-LAYER')).toBeInTheDocument(); // vertical dock label
  });

  it('B4: the full dock collapse control names its state (page-aware next stop) and closes on the Edit page', () => {
    boot({ mixerState: 'full' });
    const btn = screen.getByRole('button', { name: 'Mixer: full strips (click to close)' });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn.querySelector('svg')!.getAttribute('class')).toContain('lucide-panel-left'); // PanelLeft glyph (B4)
    fireEvent.click(btn);
    expect(store().mixerState).toBe('collapsed');
  });

  it('B4: in the Audio page the full dock control offers meters (page-aware cycle branch preserved)', () => {
    boot({ mixerState: 'full', page: 'audio' });
    fireEvent.click(screen.getByRole('button', { name: 'Mixer: full strips (click for meter columns)' }));
    expect(store().mixerState).toBe('meters');
    // and back: meters → full on the Audio page
    fireEvent.click(screen.getByRole('button', { name: 'Mixer: meter columns (click for full strips)' }));
    expect(store().mixerState).toBe('full');
  });

  it('clicking a strip sets the G-layer strip focus (design doc §4)', () => {
    boot({ mixerState: 'full' });
    fireEvent.click(screen.getByTestId('mixer-strip-A1'));
    expect(store().stripFocus).toBe('tr-audio-1');
    expect(screen.getByTestId('mixer-strip-A1').className).toContain('ring-1'); // focused ring
    expect(screen.getByTestId('mixer-strip-A2').className).not.toContain('ring-1');
  });

  it('stripFlash rings the focused strip (escalation gesture feedback)', () => {
    boot({ mixerState: 'full', stripFocus: 'tr-audio-2', stripFlash: Date.now() });
    expect(screen.getByTestId('mixer-strip-A2')).toHaveAttribute('data-flash', 'on');
    expect(screen.getByTestId('mixer-strip-A1')).not.toHaveAttribute('data-flash');
  });

  it('a track added after boot joins the G-slice on the next audio-focus entry (store contract)', () => {
    boot({ mixerState: 'full' });
    act(() => { useUi.getState().addTrack('audio'); }); // A3 — not yet in the mixer sidecar
    const added = store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.badge === 'A3')!;
    expect(store().mixer.tracks[added.id]).toBeUndefined(); // sidecar lags the doc until entry
    expect(screen.getByTestId('mixer-strip-A3')).toBeInTheDocument(); // dock lists doc tracks already
    act(() => { useUi.getState().enterAudioFocus('shortcut'); }); // ensures coverage for every audio id
    expect(store().mixer.tracks[added.id]).toBeDefined();
    expect(store().mixerState).toBe('full');
  });

  it('strip row: subtle alternating bg parity across the channel strips (A4)', () => {
    boot({ mixerState: 'full' });
    // A1 is row 0 (shell), A2 is row 1 (raised) — console-strip banding
    expect(screen.getByTestId('mixer-strip-A1').className).toContain('bg-shell');
    expect(screen.getByTestId('mixer-strip-A2').className).toContain('bg-raised');
    // the focused ring still wins over the parity background
    fireEvent.click(screen.getByTestId('mixer-strip-A1'));
    expect(screen.getByTestId('mixer-strip-A1').className).toContain('ring-1');
  });

  it('master strip: accent top bar + accent fader cap + headroom readout (A4/R19-B1)', () => {
    boot({ mixerState: 'full' });
    const master = screen.getByTestId('mixer-strip-master');
    const thumb = master.querySelector('[data-testid="fader-thumb"]') as HTMLElement;
    expect(thumb.style.background).toContain('var(--fader-cap-accent-1)'); // accent pair, flat
    expect(thumb.style.background).toContain('var(--fader-cap-accent-2)');
    expect(thumb.style.background).not.toContain('var(--fader-thumb-1)'); // NOT the neutral pair
    const bar = screen.getByTestId('mixer-topbar-master');
    expect(bar.style.background).toContain('var(--fader-cap-accent-1)');
    expect(bar.style.background).toContain('var(--fader-cap-accent-2)');
    expect(bar.className).toContain('h-[3px]'); // 3px TOP bar (R19-B1 replaces the h-1 bottom bar)
    const row = screen.getByTestId('mixer-readout-master');
    expect(row.className).toContain('mono');
    expect(within(row).getByText('-8.5')).toBeInTheDocument(); // 0.78 volume → −8.5 dB, no unit
  });

  it('master anatomy (reference M1): M-only RSM, no pan box, no I row (spacer), honest LUFS note, name in the title row (R20-W1)', () => {
    boot({ mixerState: 'full' });
    const master = screen.getByTestId('mixer-strip-master');
    expect(within(master).getByRole('button', { name: 'Master mute' })).toBeInTheDocument();
    expect(within(master).queryByRole('slider', { name: /pan/i })).toBeNull(); // no pan box (spacer)
    expect(within(master).queryByTestId('strip-input')).toBeNull(); // hidden spacer, not a visible row
    expect(within(master).queryByTestId('fx-power')).toBeNull(); // I row = spacer per reference M1
    expect(within(master).getAllByTestId('fx-add')).toHaveLength(1); // no master insert model → one honest add (last slot)
    expect(within(master).queryAllByTestId('fx-chip')).toHaveLength(0);
    expect(within(master).getByTestId('strip-graphs')).toBeInTheDocument(); // master keeps the thumbnails
    expect(within(master).getByText('LUFS — v2')).toBeInTheDocument(); // D12 honest v2 note (routing-spacer row)
    expect(within(master).getByTestId('strip-title')).toHaveTextContent('Master'); // D5: name in the title row
  });

  it('the dock\'s right edge carries the aux/master bank: channels scroll, aux+master pin outside (th_mto63f99)', () => {
    boot({ mixerState: 'full' });
    const dock = screen.getByTestId('mixer-dock-full');
    const children = Array.from(dock.children);
    // [header | channel scroll region | aux a1 | aux a2 | master]
    expect(children).toHaveLength(5);
    expect(dock.lastElementChild).toHaveAttribute('data-testid', 'mixer-strip-master');
    expect(children[3]).toHaveAttribute('data-testid', 'mixer-strip-aux-a2');
    const scroll = children[1] as HTMLElement;
    expect(scroll.className).toContain('overflow-x-auto'); // channels own the overflow
    expect(within(scroll).getByTestId('mixer-strip-A1')).toBeInTheDocument();
    expect(within(scroll).getByTestId('mixer-strip-A2')).toBeInTheDocument();
    expect(within(scroll).queryByTestId('mixer-strip-master')).toBeNull(); // master never scrolls away
  });

  it('master readout −∞ guard: volume 0 (or mute) reads −∞, not −60.0 (A3)', () => {
    boot({ mixerState: 'full', masterVolume: 0 });
    const row = screen.getByTestId('mixer-readout-master');
    // at the volume floor BOTH the fader dB and the peak read −∞ (the guard),
    // and the fake "-60.0" never renders
    expect(within(row).getAllByText('−∞')).toHaveLength(2);
    expect(within(row).queryByText('-60.0')).toBeNull();
  });

  it('master readout follows the live engine peak (one key with meters/toolbar views)', () => {
    boot({ mixerState: 'full' });
    act(() => { __setLevel('master', -6); });
    expect(within(screen.getByTestId('mixer-readout-master')).getByText('-6.0')).toBeInTheDocument();
  });
});

/* ---------- R20-W1 D1.3: height tiers + FLOOR fallback + narrow ---------- */
describe('MixerDock height tiers (D1.3)', () => {
  it('MIXER_TIER pins the four boundaries; mixerTierFor walks the bands', () => {
    expect(MIXER_TIER).toEqual({ FULL: 560, LEAN: 420, MIN: 340, FLOOR: 280 });
    expect(mixerTierFor(560)).toBe(0);
    expect(mixerTierFor(559)).toBe(1);
    expect(mixerTierFor(420)).toBe(1);
    expect(mixerTierFor(419)).toBe(2);
    expect(mixerTierFor(340)).toBe(2);
    expect(mixerTierFor(339)).toBe(3);
    expect(mixerTierFor(280)).toBe(3);
    expect(mixerTierFor(0)).toBe(3); // the <FLOOR fallback is the dock's job
  });

  it('the dock shares ONE measured tier with every strip (T0 ≥560: full reference anatomy)', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'full' });
      const dock = screen.getByTestId('mixer-dock-full');
      Object.defineProperty(dock, 'offsetHeight', { configurable: true, value: 600 });
      fire();
      const a1 = screen.getByTestId('mixer-strip-A1');
      const a2 = screen.getByTestId('mixer-strip-A2');
      const master = screen.getByTestId('mixer-strip-master');
      // T0 markers on every strip: input + 5-slot rack + routing row + title row
      for (const s of [a1, a2, master]) {
        expect(within(s).getByTestId('fx-rack').style.height).toBe('105px');
      }
      expect(within(a1).getByTestId('strip-input')).toBeInTheDocument();
      expect(within(a1).getByTestId('strip-bus-1')).toBeInTheDocument();
      expect(within(a2).getByTestId('strip-title')).toBeInTheDocument();
    });
  });

  it('T1 (420-559): graphs → ONE combined row, pan 36, rack 3 slots, name in the header — on every strip', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'full' });
      Object.defineProperty(screen.getByTestId('mixer-dock-full'), 'offsetHeight', { configurable: true, value: 460 });
      fire();
      for (const tid of ['mixer-strip-A1', 'mixer-strip-A2']) {
        const s = screen.getByTestId(tid);
        expect(within(s).getByTestId('fx-rack').style.height).toBe('62px');
        expect(within(s).getByTestId('strip-graphs')).toBeInTheDocument();
        expect(within(s).getByTestId('pan-box').className).toContain('w-[36px]');
        expect(within(s).queryByTestId('strip-bus-1')).toBeNull(); // routing row dropped
        expect(within(s).queryByTestId('strip-title')).toBeNull(); // name in the header
      }
      // the master strip follows the same tier (aligned fader tops)
      expect(within(screen.getByTestId('mixer-strip-master')).queryByTestId('strip-title')).toBeNull();
    });
  });

  it('T2 (340-419): graphs + input + rack hidden; the fx-count chip replaces the rack', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'full' });
      Object.defineProperty(screen.getByTestId('mixer-dock-full'), 'offsetHeight', { configurable: true, value: 380 });
      fire();
      const s = screen.getByTestId('mixer-strip-A2');
      expect(within(s).queryByTestId('strip-graphs')).toBeNull();
      expect(within(s).queryByTestId('strip-input')).toBeNull();
      expect(within(s).queryByTestId('fx-rack')).toBeNull();
      expect(within(s).getByTestId('fx-count')).toBeInTheDocument();
      expect(within(s).getByTestId('pan-box').className).toContain('w-[36px]');
    });
  });

  it('T3 (280-339): the accessory stack scrolls INSIDE each strip; the trio pins at the bottom (D1.3 gate tier)', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'full' });
      Object.defineProperty(screen.getByTestId('mixer-dock-full'), 'offsetHeight', { configurable: true, value: 300 });
      fire();
      const s = screen.getByTestId('mixer-strip-A2');
      const scroll = within(s).getByTestId('strip-scroll-A2');
      expect(scroll.style.minHeight).toBe('83px'); // max(40, 300−53−164)
      expect(within(scroll).getByTestId('strip-input')).toBeInTheDocument();
      expect(within(scroll).getByTestId('fx-rack')).toBeInTheDocument();
      // fader section FIXED at the 164 travel floor, terminal
      const section = within(s).getByTestId('fader-section-A2');
      expect(section.style.height).toBe('164px');
      expect(s.lastElementChild).toBe(section);
      // the master strip scrolls its spacer stack the same way
      expect(within(screen.getByTestId('mixer-strip-master')).getByTestId('strip-scroll-master')).toBeInTheDocument();
    });
  });

  it('below FLOOR (280): auto-fallback to the meters state + ONE honest toast per session (store flag)', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'full' });
      const toastsBefore = store().toasts.length;
      Object.defineProperty(screen.getByTestId('mixer-dock-full'), 'offsetHeight', { configurable: true, value: 250 });
      fire();
      expect(store().mixerState).toBe('meters'); // honest fallback, not a broken strip layout
      expect(store().toasts.length).toBe(toastsBefore + 1);
      expect(store().toasts.at(-1)!.title).toBe('Mixer floor');
      expect(store().toasts.at(-1)!.detail).toContain('280');
      expect(screen.getByTestId('mixer-dock-meters')).toBeInTheDocument();
      // ONE per session: a second below-floor event flips state with NO new toast
      act(() => { useUi.setState({ mixerState: 'full' }); });
      Object.defineProperty(screen.getByTestId('mixer-dock-full'), 'offsetHeight', { configurable: true, value: 240 });
      fire();
      expect(store().mixerState).toBe('meters');
      expect(store().toasts.length).toBe(toastsBefore + 1); // flag held
    });
  });

  it('narrow trigger (D1.3): dock width budget < N×86 → 72px strips, scale+fader only (meters via the meters state)', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'full' });
      const dock = screen.getByTestId('mixer-dock-full');
      // two ancestors up = the timeline row (the B1 definite-width ancestor)
      const row = dock.parentElement?.parentElement as HTMLElement;
      row.getBoundingClientRect = () => ({ width: 260, height: 300, top: 0, left: 0, right: 260, bottom: 300, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
      Object.defineProperty(dock, 'offsetHeight', { configurable: true, value: 600 });
      fire();
      // budget = min(0.6×260, 22+5×86) = 156 < 2×86 → narrow
      expect(screen.getByTestId('mixer-strip-A1').style.width).toBe('72px');
      expect(screen.getByTestId('mixer-strip-master').style.width).toBe('72px');
      // narrow drops the meter column (scale+fader only; metering = meters state)
      expect(screen.getByTestId('fader-cols-A2').querySelector('[data-col="meter"]')).toBeNull();
      expect(screen.getByTestId('fader-cols-A2').querySelector('[data-col="fader"]')).not.toBeNull();
    });
  });

  it('B1 stays fixed: the dock caps at the row budget and the channel region keeps the 2-strip floor (W0)', () => {
    withRecordingRO((fire) => {
      const { container } = boot({ mixerState: 'full' });
      const dock = screen.getByTestId('mixer-dock-full');
      const row = dock.parentElement?.parentElement as HTMLElement;
      row.getBoundingClientRect = () => ({ width: 900, height: 400, top: 0, left: 0, right: 900, bottom: 400, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
      fire();
      // budget = min(540, 452) = 452 → 86px strips, capped maxWidth
      expect(dock.style.maxWidth).toBe('452px');
      expect(screen.getByTestId('mixer-strip-A1').style.width).toBe('86px');
      const scroll = Array.from(dock.children)[1] as HTMLElement;
      expect(scroll.className).toContain('min-w-[172px]');
      expect(container).toBeDefined();
    });
  });
});

/* ---------- R23-WC (DESIGN-R23 D-C3; issue #70): the master/bus bank's
   meters-only collapse — its OWN toggle, independent of the channel strips
   and of the dock-level 3-state cycle (store view-state masterBusCollapsed,
   the stripArm survival law). ---------- */
describe('R23-WC D-C3 (#70): master/bus bank meters-only collapse', () => {
  it('the bank toggle carries the B4 law: state-naming label + honest pressed state + its own glyph', () => {
    boot({ mixerState: 'full' });
    const btn = screen.getByTestId('mixer-masterbus-toggle');
    expect(btn).toHaveAttribute('aria-pressed', 'false'); // boots FULL strips
    expect(btn.getAttribute('aria-label')).toBe('Master/buses: full strips (click for meters only)');
    expect(btn.querySelector('svg')!.getAttribute('class')).toContain('lucide-gauge'); // distinct from the cycle controls
    // it lives in the dock header (the B4 state-controls rail), a sibling of
    // the dock-level cycle control — not a per-strip control
    expect(btn.parentElement).toBe(screen.getByRole('button', { name: 'Mixer: full strips (click to close)' }).parentElement);
  });

  it('collapsing the bank swaps aux/master STRIPS for meters-only columns; the CHANNEL strips stay full (#70 independence)', () => {
    boot({ mixerState: 'full' });
    fireEvent.click(screen.getByTestId('mixer-masterbus-toggle'));
    expect(store().masterBusCollapsed).toBe(true);
    expect(screen.queryByTestId('mixer-strip-aux-a1')).toBeNull();
    expect(screen.queryByTestId('mixer-strip-aux-a2')).toBeNull();
    expect(screen.queryByTestId('mixer-strip-master')).toBeNull();
    // the columns: badge + full-height meter (MetersDock D1.4 grammar); the
    // master keeps its one real store command (M mute); meters share the ONE
    // engine keys — same values as the meters dock / toolbar views
    const masterCol = screen.getByTestId('mixer-bank-col-master');
    expect(within(masterCol).getByText('MST')).toBeInTheDocument();
    expect(within(masterCol).getByRole('button', { name: 'Master mute' })).toBeInTheDocument();
    expect(within(masterCol).getByTitle(/Master: -8\.5 dB/)).toBeInTheDocument();
    const a1 = screen.getByTestId('mixer-bank-col-a1');
    expect(within(a1).getByText('A1')).toBeInTheDocument();
    expect(within(a1).getByTitle(/Aux a1: -6\.0 dB/)).toBeInTheDocument();
    expect(screen.getByTestId('mixer-bank-col-a2')).toBeInTheDocument();
    // INDEPENDENCE: the channel strips keep their full anatomy (the collapse
    // never touches the channel tier/layout — that is #70's whole point)
    expect(screen.getByTestId('mixer-strip-A1')).toBeInTheDocument();
    expect(screen.getByTestId('mixer-strip-A2')).toBeInTheDocument();
    expect(within(screen.getByTestId('mixer-strip-A2')).getByTestId('strip-input')).toBeInTheDocument();
  });

  it('the collapsed bus columns mirror the store values (return gain + ON/OFF dot)', () => {
    boot({ mixerState: 'full' });
    fireEvent.click(screen.getByTestId('mixer-masterbus-toggle'));
    // mockMixer boots: a1 Reverb −6 dB ON, a2 Spare 0 dB OFF
    expect(screen.getByTitle('Aux a1 Reverb — return -6 dB')).toBeInTheDocument();
    expect(screen.getByTitle('Aux a2 Spare — return 0 dB · bus off')).toBeInTheDocument();
    act(() => { useUi.getState().setAuxBus('a1', { returnGain: -12, on: false }); });
    expect(screen.getByTitle('Aux a1 Reverb — return -12 dB · bus off')).toBeInTheDocument();
  });

  it('the bank toggle is a round-trip: expanding restores the full aux/master bank', () => {
    boot({ mixerState: 'full' });
    fireEvent.click(screen.getByTestId('mixer-masterbus-toggle'));
    fireEvent.click(screen.getByTestId('mixer-masterbus-toggle'));
    expect(store().masterBusCollapsed).toBe(false);
    expect(screen.getByTestId('mixer-strip-aux-a1')).toBeInTheDocument();
    expect(screen.getByTestId('mixer-strip-aux-a2')).toBeInTheDocument();
    expect(screen.getByTestId('mixer-strip-master')).toBeInTheDocument();
    expect(within(screen.getByTestId('mixer-strip-master')).getByTestId('mixer-readout-master')).toBeInTheDocument();
    expect(screen.queryByTestId('mixer-bank-col-master')).toBeNull();
  });

  it('independence from the dock 3-state cycle: the collapse survives full → collapsed → meters → full (stripArm law)', () => {
    boot({ mixerState: 'full' });
    fireEvent.click(screen.getByTestId('mixer-masterbus-toggle'));
    // cycle the DOCK away and back — the bank's own state survives (it never
    // rides the cycle; only the channels' tiers were the cycle's business)
    act(() => { useUi.getState().cycleMixerState(); }); // full → collapsed (edit page)
    expect(screen.queryByTestId('mixer-dock-full')).toBeNull();
    act(() => { useUi.getState().cycleMixerState(); }); // collapsed → meters
    act(() => { useUi.getState().cycleMixerState(); }); // meters → full
    expect(screen.getByTestId('mixer-dock-full')).toBeInTheDocument();
    expect(screen.queryByTestId('mixer-strip-master')).toBeNull(); // still meters-only
    expect(screen.getByTestId('mixer-bank-col-master')).toBeInTheDocument();
    expect(store().masterBusCollapsed).toBe(true);
  });

  it('the meters state carries no bank toggle (the whole dock is meters-only already)', () => {
    boot({ mixerState: 'meters' });
    expect(screen.queryByTestId('mixer-masterbus-toggle')).toBeNull();
  });
});
