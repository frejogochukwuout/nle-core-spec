/* MixerDock component tests — the open/close + mode machine (R24-W1: the
   3-state cycle is dead — toggleMixerOpen is binary with lastVisual memory;
   the meters master-column's PanelRight → 'full', the full dock header's
   PanelLeft → 'meters', both MODE actions with no aria-pressed):
   state-driven rendering, the meters-dock columns (thread #61), shared
   master values, strip focus + escalation flash, the MIXER_TIER constants
   + the R25-W4-E DENSITY LADDER wiring (mocked offsetHeight fed through a
   recording ResizeObserver — jsdom's default stub never fires; the wrapper
   `mixer-dock` is the ONE measurement site), the data-density attribute,
   the true-floor MetersDock fallback (R24-W1/#60 re-based: full ≥340 →
   lean [280,340) hides optional blocks → core [200,280) meters+fader only
   → mini <200, the LAST resort), the R25-W4-A strip-element toggle group,
   the narrow width trigger, and the D-C3 master/bus bank's meters-only
   collapse (glyph re-pinned R25-W4-C: Gauge → BarChart3). */

import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import * as MixerDockModule from './MixerDock';
import { MixerDock, MIXER_TIER, mixerDensityFor, mixerTierFor } from './MixerDock';
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

  /* R24-W1 (A3-R3): mixerStateLabel is DELETED with the cycle — the
     module-exports pin guards the deletion (it can never silently return). */
  it('R24-W1 deletion pin: mixerStateLabel is gone from the module (the cycle wording died with cycleMixerState)', () => {
    const mod = MixerDockModule as unknown as Record<string, unknown>;
    expect(mod.mixerStateLabel).toBeUndefined();
    expect(mod.stateName).toBeUndefined();
  });

  it('R24-W1: the open dock wraps in the `mixer-dock` container (the measurement surface for the silent floor)', () => {
    boot({ mixerState: 'full' });
    const wrapper = screen.getByTestId('mixer-dock');
    expect(wrapper).toContainElement(screen.getByTestId('mixer-dock-full'));
    expect(wrapper.className).toContain('h-full');
    // the meters state rides the SAME wrapper
    act(() => { useUi.setState({ mixerState: 'meters' }); });
    expect(screen.getByTestId('mixer-dock')).toContainElement(screen.getByTestId('mixer-dock-meters'));
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

  it('B4 → R24-W1: the meters expand control is a MODE action — "Expand to full strips", no aria-pressed (an action can\'t lie)', () => {
    boot({ mixerState: 'meters' });
    const btn = screen.getByRole('button', { name: 'Expand to full strips' });
    expect(btn).not.toHaveAttribute('aria-pressed'); // R24-W1: mode actions never claim a pressed state
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

  it('B4 → R24-W1: the full dock header collapse control is a MODE action — "Collapse to meter columns" → meters, never closed', () => {
    boot({ mixerState: 'full' });
    const btn = screen.getByRole('button', { name: 'Collapse to meter columns' });
    expect(btn).not.toHaveAttribute('aria-pressed'); // R24-W1: mode actions never claim a pressed state
    expect(btn.querySelector('svg')!.getAttribute('class')).toContain('lucide-panel-left'); // PanelLeft glyph (B4)
    fireEvent.click(btn);
    expect(store().mixerState).toBe('meters'); // the dock STAYS OPEN — closing is toggleMixerOpen's job
  });

  it('R24-W1: the two mode controls round-trip meters ↔ full (the old page-aware cycle branch, now mode actions on any page)', () => {
    boot({ mixerState: 'full' });
    fireEvent.click(screen.getByRole('button', { name: 'Collapse to meter columns' }));
    expect(store().mixerState).toBe('meters');
    fireEvent.click(screen.getByRole('button', { name: 'Expand to full strips' }));
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

  it('a track added after boot is seeded into the mixer sidecar IMMEDIATELY (the R25-F1/A2 law — the unseeded strip + "No audio tracks" lie is dead)', () => {
    boot({ mixerState: 'full' });
    act(() => { useUi.getState().addTrack('audio'); });
    const added = store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.badge === 'A3')!;
    // R25-F1 (A2): addTrack seeds the sidecar at WRITE time (createScene's twin)
    // — the strip is real the moment the doc track exists; the old
    // "sidecar lags the doc until the next audio-focus entry" workaround
    // (the documented useUiStore.ts seed-on-entry) is superseded.
    expect(store().mixer.tracks[added.id]).toBeDefined();
    expect(store().mixer.tracks[added.id]).toMatchObject({ fader: -6, pan: 0, outputBus: 0 });
    expect(screen.getByTestId('mixer-strip-A3')).toBeInTheDocument();
    act(() => { useUi.getState().enterAudioFocus('shortcut'); }); // idempotent re-seed: no clobber
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

  /* RE-PINNED (R25-F1-A3): th_mto63f99 originally pinned the aux/master bank
     OUTSIDE the channel scroll region (pinned to the dock's right edge as
     shrink-0 siblings). That made the bank INVISIBLE to the B1 budget — the
     maxWidth cap only ever bound the scroll region (the sole shrinkable
     child), so below ~750px row width the pinned aux-A2 + master strips
     painted past the dock's cap and the shell clipped them: unreachable
     (audit A3). The bank now rides INSIDE the scroll region as scrolling
     content at its natural end — the same horizontal scrollbar that covers
     overflowed channels covers the bank; the master bus stays reachable at
     every width. */
  it('the bank rides INSIDE the channel scroll region: [header | scroll [A1 A2 aux-a1 aux-a2 master]] — the master is scrolling content, never a clipped pinned sibling (R25-F1-A3, re-pins th_mto63f99)', () => {
    boot({ mixerState: 'full' });
    const dock = screen.getByTestId('mixer-dock-full');
    // [header | ONE scroll region carrying channels + the whole bank]
    expect(dock.children).toHaveLength(2);
    const scroll = dock.lastElementChild as HTMLElement;
    expect(scroll).toHaveAttribute('data-testid', 'channel-scroll');
    expect(scroll.className).toContain('overflow-x-auto'); // the bank's overflow is OWNED here
    expect(within(scroll).getByTestId('mixer-strip-A1')).toBeInTheDocument();
    expect(within(scroll).getByTestId('mixer-strip-A2')).toBeInTheDocument();
    // the bank is scrolling content at the region's natural end
    const master = within(scroll).getByTestId('mixer-strip-master');
    expect(master.closest('[data-testid="channel-scroll"]')).toBe(scroll); // structural: the offsetParent chain (jsdom: containment) reaches the scroller
    expect(scroll.lastElementChild).toBe(master);
    expect(within(scroll).getByTestId('mixer-strip-aux-a1')).toBeInTheDocument();
    expect(within(scroll).getByTestId('mixer-strip-aux-a2')).toBeInTheDocument();
    // the collapsed meters-only bank rides the SAME scroll region (D-C3)
    fireEvent.click(screen.getByTestId('mixer-masterbus-toggle'));
    expect(screen.getByTestId('mixer-bank-col-master').closest('[data-testid="channel-scroll"]')).toBe(scroll);
  });

  it('R25-F1-A3: below the ~750px budget the bank stays REACHABLE — the scroll region covers it and scrollLeft reaches the master (the pinned-bank clip is dead)', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'full' });
      const dock = screen.getByTestId('mixer-dock-full');
      // mock the B1 row at 500px wide → budget = min(0.6×500, 452) = 300
      // (the old geometry: 22 header + 172 floor + 3×86 bank = 452 > 300 → the
      // pinned bank painted past the cap and was clipped by the shell)
      const row = dock.parentElement?.parentElement?.parentElement as HTMLElement;
      row.getBoundingClientRect = () => ({ width: 500, height: 400, top: 0, left: 0, right: 500, bottom: 400, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
      Object.defineProperty(dock, 'offsetHeight', { configurable: true, value: 600 });
      fire();
      expect(dock.style.maxWidth).toBe('300px'); // the B1 budget still binds the dock
      const scroll = dock.lastElementChild as HTMLElement;
      // the bank is INSIDE the capped, scrollable region — reachable, not clipped
      const master = within(scroll).getByTestId('mixer-strip-master');
      expect(master.closest('[data-testid="channel-scroll"]')).toBe(scroll);
      expect(scroll.className).toContain('min-w-[172px]'); // the 2-strip floor survives
      // horizontal scroll reaches it: the scroller accepts a scroll offset
      // (jsdom keeps the scroll range uncomputed — the reachability pin is
      // that the offset is settable and retained on the OWNING scroller)
      scroll.scrollLeft = 260;
      expect(scroll.scrollLeft).toBe(260);
    });
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

/* ---------- R20-W1 D1.3 → R25-W4-E: the density ladder + the narrow trigger ---------- */
describe('MixerDock height ladder (D1.3 → R25-W4-E)', () => {
  /* RE-PINNED (R25-W4-E, th_mtzozdvo): the constants stay the four R24
     boundaries but now carry the DENSITY bands (MIN = full→lean, FLOOR =
     lean→core) + MIXER_CORE_FLOOR 200 (core→mini — the TRUE floor, where
     even meters+fader cannot fit: 3px bar + 25px header + the 164px fader
     travel floor ≈ 192). The tier walker is T0/T1/T2 ONLY now — the old T3
     band [280,339) belongs to the 'lean' density (element hiding, never
     the per-channel scroll — that tier is deletion-pinned). */
  it('MIXER_TIER pins the boundaries; mixerDensityFor walks the ladder; mixerTierFor is T0/T1/T2 only', () => {
    expect(MIXER_TIER).toEqual({ FULL: 560, LEAN: 420, MIN: 340, FLOOR: 280 });
    expect(MixerDockModule.MIXER_CORE_FLOOR).toBe(200);
    expect(mixerDensityFor(600)).toBe('full');
    expect(mixerDensityFor(340)).toBe('full');
    expect(mixerDensityFor(339)).toBe('lean');
    expect(mixerDensityFor(280)).toBe('lean');
    expect(mixerDensityFor(279)).toBe('core');
    expect(mixerDensityFor(200)).toBe('core');
    expect(mixerDensityFor(199)).toBe('mini'); // the true floor — the mini style's LAST resort
    // the tier pair (inside 'full' only): T3 is DEAD
    expect(mixerTierFor(560)).toBe(0);
    expect(mixerTierFor(559)).toBe(1);
    expect(mixerTierFor(420)).toBe(1);
    expect(mixerTierFor(419)).toBe(2);
    expect(mixerTierFor(340)).toBe(2);
    expect(mixerTierFor(280)).toBe(2); // below MIN the density's own row set wins — the strips ignore the tier
    // deletion pins: the T3 walker branch + the per-strip scroll surface
    expect(mixerTierFor(339)).not.toBe(3);
    expect(mixerTierFor(0)).not.toBe(3);
  });

  it('the dock body carries data-density, flipped by the MEASURED height (the wrapper is the one measurement site — RE-PINNED from the mixer-dock-full measurement)', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'full' });
      const wrapper = screen.getByTestId('mixer-dock');
      expect(wrapper).toHaveAttribute('data-density', 'full'); // un-measured (jsdom) default
      for (const [h, d] of [[600, 'full'], [300, 'lean'], [250, 'core'], [150, 'mini']] as const) {
        Object.defineProperty(wrapper, 'offsetHeight', { configurable: true, value: h });
        fire();
        expect(wrapper).toHaveAttribute('data-density', d);
      }
    });
  });

  it('the dock shares ONE measured tier with every strip (T0 ≥560: full reference anatomy)', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'full' });
      // RE-PINNED (R25-W4-E): the WRAPPER (mixer-dock) is the one measurement
      // surface now (density + tier both derive from it; the FullDock's own
      // height measurement died with the consolidation)
      const wrapper = screen.getByTestId('mixer-dock');
      Object.defineProperty(wrapper, 'offsetHeight', { configurable: true, value: 600 });
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
      // RE-PINNED (R25-W4-E): the wrapper measurement (was mixer-dock-full)
      Object.defineProperty(screen.getByTestId('mixer-dock'), 'offsetHeight', { configurable: true, value: 460 });
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
      Object.defineProperty(screen.getByTestId('mixer-dock'), 'offsetHeight', { configurable: true, value: 380 });
      fire();
      const s = screen.getByTestId('mixer-strip-A2');
      expect(within(s).queryByTestId('strip-graphs')).toBeNull();
      expect(within(s).queryByTestId('strip-input')).toBeNull();
      expect(within(s).queryByTestId('fx-rack')).toBeNull();
      expect(within(s).getByTestId('fx-count')).toBeInTheDocument();
      expect(within(s).getByTestId('pan-box').className).toContain('w-[36px]');
    });
  });

  /* RE-PINNED (R25-W4-E): the old T3 pin (the accessory stack scrolls INSIDE
     each strip at 280-339) — the scroll tier is DEAD; the ladder's 'lean'
     level owns the band now (element HIDING, the reviewer's ruling). */
  it('lean density (280-339): the FX grid is absent in EVERY strip WITHOUT any user toggle (the ladder, not the toggles)', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'full' });
      Object.defineProperty(screen.getByTestId('mixer-dock'), 'offsetHeight', { configurable: true, value: 300 });
      fire();
      expect(store().mixerElementVisibility).toEqual({ fx: true, pan: true, input: true, graphs: true }); // untouched atom
      for (const tid of ['mixer-strip-A1', 'mixer-strip-A2', 'mixer-strip-aux-a1', 'mixer-strip-aux-a2', 'mixer-strip-master']) {
        const s = screen.getByTestId(tid);
        expect(within(s).queryByTestId('fx-rack')).toBeNull();
        expect(within(s).queryByTestId('pan-box')).toBeNull();
        expect(within(s).queryByTestId('strip-graphs')).toBeNull();
        expect(within(s).queryByTestId('strip-input')).toBeNull();
      }
      // strips keep fader+meters+RSM (the channels) — the ladder's keep-list
      expect(within(screen.getByTestId('mixer-strip-A2')).getByTestId('strip-rec-arm')).toBeInTheDocument();
      expect(within(screen.getByTestId('mixer-strip-A2')).getByTestId('fader-section-A2')).toBeInTheDocument();
      // the old per-strip scroll surface is gone
      expect(screen.queryByTestId('strip-scroll-A2')).toBeNull();
    });
  });

  it('core density (200-279): meters+fader only — the FULL dock still renders (not the mini fallback)', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'full' });
      Object.defineProperty(screen.getByTestId('mixer-dock'), 'offsetHeight', { configurable: true, value: 250 });
      fire();
      expect(screen.getByTestId('mixer-dock-full')).toBeInTheDocument();
      expect(store().mixerState).toBe('full'); // never a store write
      const s = screen.getByTestId('mixer-strip-A2');
      expect(within(s).queryByTestId('strip-rec-arm')).toBeNull(); // RSM gone — meters+fader only
      expect(within(s).getByTestId('fader-section-A2')).toBeInTheDocument();
    });
  });

  /* RE-PINNED (R25-W4-E, th_mtzozdvo): the #60 floor law — the mini meters
     style is the LAST RESORT, reached only below MIXER_CORE_FLOOR 200 (was:
     below FLOOR 280 the container jumped STRAIGHT to MetersDock — the
     reviewer's complaint; the lean/core levels now cover 200-339). */
  it('R24-W1 (#60) → R25-W4-E: below the TRUE floor (200) the container SILENTLY pure-renders MetersDock — store untouched, no toast, strips return when the height grows', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'full' });
      expect(screen.getByTestId('mixer-dock-full')).toBeInTheDocument();
      const wrapper = screen.getByTestId('mixer-dock');
      Object.defineProperty(wrapper, 'offsetHeight', { configurable: true, value: 150 });
      fire();
      expect(store().mixerState).toBe('full'); // #60: NO store write — the state is untouched
      expect(store().toasts).toHaveLength(0); // no floor toast, ever (the flag + toast are DELETED)
      expect(screen.queryByTestId('mixer-dock-full')).toBeNull(); // the full dock does not render
      expect(screen.getByTestId('mixer-dock-meters')).toBeInTheDocument(); // pure render fallback
      expect(wrapper).toHaveAttribute('data-density', 'mini');
      // strips RETURN when the height grows back — still with no state change
      Object.defineProperty(wrapper, 'offsetHeight', { configurable: true, value: 600 });
      fire();
      expect(store().mixerState).toBe('full');
      expect(screen.getByTestId('mixer-dock-full')).toBeInTheDocument();
      expect(screen.queryByTestId('mixer-dock-meters')).toBeNull();
    });
  });

  it('R24-W1 (#60): the meters state itself is unaffected by the floor (it IS the fallback surface)', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'meters' });
      Object.defineProperty(screen.getByTestId('mixer-dock'), 'offsetHeight', { configurable: true, value: 120 });
      fire();
      expect(store().mixerState).toBe('meters');
      expect(screen.getByTestId('mixer-dock-meters')).toBeInTheDocument();
    });
  });

  it('narrow trigger (D1.3): dock width budget < N×86 → 72px strips, scale+fader only (meters via the meters state)', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'full' });
      const dock = screen.getByTestId('mixer-dock-full');
      // THREE ancestors up = the timeline row (the B1 definite-width
      // ancestor — R24-W1: the mixer-dock wrapper added one node)
      const row = dock.parentElement?.parentElement?.parentElement as HTMLElement;
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
      // THREE ancestors up = the timeline row (R24-W1: the wrapper added one node)
      const row = dock.parentElement?.parentElement?.parentElement as HTMLElement;
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
    /* RE-PINNED (R25-W4-C, th_mtzoxrhb "wrong icon" — the reviewer's line
       pointed at this button): the Gauge speedometer read as an instrument,
       not a meters-only collapse; BarChart3 = the collapsed bank's own shape
       (thin vertical meter columns). lucide-react v1.39 aliases BarChart3 to
       chart-column — the svg class is lucide-chart-column. Still distinct
       from the PanelLeft/PanelRight mode-action pair (the B4 law). */
    expect(btn.querySelector('svg')!.getAttribute('class')).toContain('lucide-chart-column');
    expect(btn.querySelector('svg')!.getAttribute('class')).not.toContain('lucide-gauge');
    // it lives in the dock header (the B4 state-controls rail), a sibling of
    // the dock-level cycle control — not a per-strip control
    expect(btn.parentElement).toBe(screen.getByRole('button', { name: 'Collapse to meter columns' }).parentElement);
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

  it('independence from the dock open/mode state: the collapse survives full → closed → meters → full (stripArm law)', () => {
    boot({ mixerState: 'full' });
    fireEvent.click(screen.getByTestId('mixer-masterbus-toggle'));
    // toggle the DOCK closed and back through the modes — the bank's own
    // state survives (it never rides the open/close or mode writes; only
    // the channels' tiers were the cycle's business)
    act(() => { useUi.getState().toggleMixerOpen(); }); // full → closed (the binary toggle)
    expect(screen.queryByTestId('mixer-dock-full')).toBeNull();
    act(() => { useUi.getState().toggleMixerOpen(); }); // closed → full (the lastVisual memory)
    act(() => { useUi.getState().setMixerState('meters'); }); // the header's mode action
    act(() => { useUi.getState().setMixerState('full'); });
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

/* ---------- R25-W4-A (DESIGN-R25 §1 R13; thread th_mtzou0op — "mini toggle
   buttons to toggle visibility of console elements, esp. the FX / pan grid
   etc. and also that [I] thing at the top"): the dock header's strip
   element-visibility toggle group. View-state only (mixerElementVisibility
   — the masterBusCollapsed precedent); the strip-level block-flip law is
   ALSO pinned in ChannelStrip.test (aux/master mirrors + composition). ---------- */
describe('R25-W4-A: the dock header strip-element toggle group (th_mtzou0op)', () => {
  it('renders the four mini toggles in the dock-header column (the strips\' shared header) with the house grammar + honest pressed state', () => {
    boot({ mixerState: 'full' });
    const group = screen.getByRole('group', { name: 'Strip elements' });
    expect(group).toBeInTheDocument();
    for (const [key, label] of [
      ['fx', 'FX sends grid'],
      ['pan', 'Pan control'],
      ['input', 'Input row'],
      ['graphs', 'EQ/dynamics graphs'],
    ] as const) {
      const btn = screen.getByTestId(`mixer-element-${key}`);
      expect(group).toContainElement(btn);
      expect(btn.className).toContain('icon-btn');
      expect(btn.className).toContain('icon-btn-sm');
      expect(btn.className).toContain('toggled'); // boots visible
      expect(btn).toHaveAttribute('aria-pressed', 'true');
      expect(btn.getAttribute('aria-label')).toBe(`${label} visibility`);
      expect(btn.getAttribute('data-tip')).toContain(label); // the element name in the tip
      // the glyph law: house lucide icons, one distinct glyph per element
      expect(btn.querySelector('svg')!.getAttribute('class')).toMatch(/lucide-(sparkles|move-horizontal|plug|activity)/);
    }
  });

  it('each toggle flips its block\'s DOM presence across the strips (fx: every rack; input: the channel input row)', () => {
    boot({ mixerState: 'full' });
    // fx: the racks in the channel + aux + master strips
    fireEvent.click(screen.getByTestId('mixer-element-fx'));
    expect(store().mixerElementVisibility.fx).toBe(false);
    for (const tid of ['mixer-strip-A1', 'mixer-strip-A2', 'mixer-strip-aux-a1', 'mixer-strip-master']) {
      expect(within(screen.getByTestId(tid)).queryByTestId('fx-rack')).toBeNull();
    }
    expect(screen.getByTestId('mixer-element-fx')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByTestId('mixer-element-fx'));
    for (const tid of ['mixer-strip-A1', 'mixer-strip-A2', 'mixer-strip-aux-a1', 'mixer-strip-master']) {
      expect(within(screen.getByTestId(tid)).getByTestId('fx-rack')).toBeInTheDocument();
    }
    // input: "that [I] thing at the top" — the channel input row (gap C40)
    fireEvent.click(screen.getByTestId('mixer-element-input'));
    expect(within(screen.getByTestId('mixer-strip-A1')).queryByTestId('strip-input')).toBeNull();
    fireEvent.click(screen.getByTestId('mixer-element-input'));
    expect(within(screen.getByTestId('mixer-strip-A1')).getByTestId('strip-input')).toBeInTheDocument();
    // pan: the pan box
    fireEvent.click(screen.getByTestId('mixer-element-pan'));
    expect(within(screen.getByTestId('mixer-strip-A1')).queryByTestId('pan-box')).toBeNull();
    fireEvent.click(screen.getByTestId('mixer-element-pan'));
    // graphs: the thumbnails
    fireEvent.click(screen.getByTestId('mixer-element-graphs'));
    expect(within(screen.getByTestId('mixer-strip-A1')).queryByTestId('strip-graphs')).toBeNull();
    fireEvent.click(screen.getByTestId('mixer-element-graphs'));
  });

  it('view-state law: toggling mints NO withHistory entry (the count unchanged) and never writes the G-slice', () => {
    boot({ mixerState: 'full' });
    const pastBefore = store().past.length;
    const mixerBefore = store().mixer;
    fireEvent.click(screen.getByTestId('mixer-element-pan'));
    fireEvent.click(screen.getByTestId('mixer-element-graphs'));
    expect(store().past).toHaveLength(pastBefore); // no history mint — the withHistory count unchanged
    expect(store().mixer).toBe(mixerBefore); // the G-slice reference is untouched (visibility is never data)
    // restore
    fireEvent.click(screen.getByTestId('mixer-element-pan'));
    fireEvent.click(screen.getByTestId('mixer-element-graphs'));
  });

  it('the meters state carries no element toggles (the whole dock is meter columns — nothing to toggle)', () => {
    boot({ mixerState: 'meters' });
    expect(screen.queryByTestId('mixer-element-fx')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Strip elements' })).toBeNull();
  });

  /* R25-F2 (A8): the element-toggle tips are composed with the DENSITY
   * ladder — the flag is the preference, the ladder is what's on screen.
   * The old "shown (view state)" tip at lean density lied (the ladder hides
   * the element while the flag is on). */
  it('R25-F2 (A8): at LEAN density the tips say "hidden by the density ladder" while the pressed flag stays the honest preference', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'full' });
      const wrapper = screen.getByTestId('mixer-dock');
      Object.defineProperty(wrapper, 'offsetHeight', { configurable: true, value: 300 }); // lean [280,340)
      fire();
      expect(wrapper).toHaveAttribute('data-density', 'lean');
      const fx = screen.getByTestId('mixer-element-fx');
      expect(fx).toHaveAttribute('aria-pressed', 'true'); // the preference is untouched
      expect(fx.getAttribute('data-tip')).toContain('FX sends grid — hidden by the density ladder');
      // the ladder ALSO hid the blocks themselves (the W4-E law, unchanged)
      expect(within(screen.getByTestId('mixer-strip-A1')).queryByTestId('fx-rack')).toBeNull();
      // at FULL density the classic honest "shown" tip survives
      Object.defineProperty(wrapper, 'offsetHeight', { configurable: true, value: 600 });
      fire();
      expect(screen.getByTestId('mixer-element-fx').getAttribute('data-tip')).toContain('shown');
    });
  });

  /* R26-W-F1 (F5, GB's R1 tip-honesty residue): at T2 density the tier's
   * native anatomy SWAPS the FX rack for the fx-count chip — the fx toggle's
   * tip must state what the tier actually does, never the blanket "shown"
   * (the flag governs T0/T1 racks only). The input/graphs wording at the
   * same tier is unchanged (tierHides). */
  it('R26-W-F1 (F5): at T2 density the fx tip states the tier swap (the fx-count chip) — never the blanket "shown"', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'full' });
      const wrapper = screen.getByTestId('mixer-dock');
      Object.defineProperty(wrapper, 'offsetHeight', { configurable: true, value: 380 }); // T2 [340,420) at full density
      fire();
      expect(wrapper).toHaveAttribute('data-density', 'full');
      const fx = screen.getByTestId('mixer-element-fx');
      expect(fx).toHaveAttribute('aria-pressed', 'true'); // the preference is untouched
      expect(fx.getAttribute('data-tip')).toContain('FX sends grid — shown as the fx-count chip (T2 density swaps the FX rack for the chip)');
      expect(fx.getAttribute('data-tip')).not.toMatch(/FX sends grid — shown$/); // the blanket "shown" is dead at T2
      // the tier's real anatomy: the rack is gone, the chip answers
      expect(within(screen.getByTestId('mixer-strip-A1')).queryByTestId('fx-rack')).toBeNull();
      expect(within(screen.getByTestId('mixer-strip-A1')).getByTestId('fx-count')).toBeInTheDocument();
      // the input toggle at the SAME tier keeps the tierHides compose (unchanged law)
      const input = screen.getByTestId('mixer-element-input');
      expect(input.getAttribute('data-tip')).toContain('Input row — hidden by the density ladder (dock at full / T2 density');
    });
  });
});

/* ---------- R25-F2 (A5/A6): the meters dock's alignment + the honest floor ---------- */
describe('R25-F2: meters-state alignment + the expand floor (A5/A6)', () => {
  it('R25-F2 (A5): the pinned master column carries the SAME p-1 padding as the track-columns scroll region (the 4px misalignment is dead)', () => {
    boot({ mixerState: 'meters' });
    const scroll = screen.getByTestId('meters-scroll');
    const master = screen.getByTestId('meter-col-master');
    // class-level pin (jsdom applies no Tailwind geometry): both p-1
    expect(scroll.className).toContain('p-1');
    expect(scroll.className).not.toContain('py-1');
    expect(master.className).toContain('p-1');
    expect(master.className).not.toContain('py-1');
  });

  it('R25-F2 (A6): below the 200px core floor the expand control is HONESTLY disabled — aria-disabled, the height-floor reason in the tip, NO store write', () => {
    withRecordingRO((fire) => {
      boot({ mixerState: 'meters' });
      const wrapper = screen.getByTestId('mixer-dock');
      Object.defineProperty(wrapper, 'offsetHeight', { configurable: true, value: 150 }); // mini < 200
      fire();
      expect(wrapper).toHaveAttribute('data-density', 'mini');
      const btn = screen.getByRole('button', { name: /Expand to full strips/ });
      expect(btn).toHaveAttribute('aria-disabled', 'true');
      expect(btn.getAttribute('data-tip')).toContain('below the 200px core floor');
      expect(btn.getAttribute('aria-label')).toContain('disabled');
      // the honest-control law: clicking can mint NOTHING (no onClick)
      fireEvent.click(btn);
      expect(store().mixerState).toBe('meters'); // untouched — the silent no-op is dead
      expect(store().toasts).toHaveLength(0);
      // growing the height re-arms the control (the ladder is reversible)
      Object.defineProperty(wrapper, 'offsetHeight', { configurable: true, value: 600 });
      fire();
      const live = screen.getByRole('button', { name: 'Expand to full strips' });
      expect(live).not.toHaveAttribute('aria-disabled');
      fireEvent.click(live);
      expect(store().mixerState).toBe('full');
    });
  });
});
