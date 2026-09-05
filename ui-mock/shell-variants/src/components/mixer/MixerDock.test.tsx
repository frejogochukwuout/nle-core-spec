/* MixerDock component tests — the 3-state machine (collapsed / bridge rail /
   full strip row, design doc v2.2 §4): state-driven rendering (jsdom's
   ResizeObserver stub never fires, so the compact path is a ChannelStrip
   concern tested there), shared master values, strip focus + escalation
   flash. */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { MixerDock } from './MixerDock';
import { TimelineToolbar } from '../timeline/TimelineToolbar';
import { renderShell, store, type UiPatch } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';
import { __setLevel } from '../../lib/meterEngine';

const boot = (patch: UiPatch = {}) => renderShell(<MixerDock />, { patch });

describe('MixerDock', () => {
  it('collapsed renders nothing at all (design doc v2.2 §4)', () => {
    const { container } = boot({ mixerState: 'collapsed' });
    expect(container.querySelector('[data-testid^="mixer-dock"]')).toBeNull();
  });

  it('bridge renders the 44px meter-bridge rail: one meter per audio track + master cluster', () => {
    boot({ mixerState: 'bridge' });
    const rail = screen.getByTestId('mixer-dock-bridge');
    expect(rail).toHaveAttribute('role', 'group');
    expect(rail).toHaveAttribute('aria-label', 'Mixer meter bridge');
    expect(within(rail).getByTestId('bridge-A1')).toBeInTheDocument();
    expect(within(rail).getByTestId('bridge-A2')).toBeInTheDocument();
    expect(within(rail).getByTitle(/A1: -3\.0 dB/)).toBeInTheDocument(); // G-slice fader drives the meter
    expect(within(rail).getByText('MST')).toBeInTheDocument();
    // R15-A2: the rail's master meter rides the ONE 'master' engine key with
    // the toolbar/strip values (was the third 'master-bridge' key)
    expect(within(rail).getByTitle(/Master: -8\.5 dB/)).toBeInTheDocument();
  });

  it('bridge master + toolbar micro-meter share ONE master engine key (R15-A2 unification)', () => {
    renderShell(
      <>
        <MixerDock />
        <TimelineToolbar />
      </>,
      { patch: { mixerState: 'bridge' } },
    );
    const meters = screen.getAllByTitle(/Master: -8\.5 dB/);
    expect(meters).toHaveLength(2); // bridge cluster + toolbar micro — one key, two views
    act(() => { __setLevel('master', -12); });
    for (const m of meters) {
      const fill = m.querySelector('[data-channel="l"] > div') as HTMLElement;
      expect(fill.style.clipPath).toBe('inset(20% 0 0 0)'); // both read (−12+60)/60 = 0.8
    }
  });

  it('the bridge master mute shares the toolbar/strip store values (design doc §4.5 single source)', () => {
    boot({ mixerState: 'bridge' });
    const mute = screen.getByRole('button', { name: 'Master mute' });
    expect(mute).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mute);
    expect(store().masterMuted).toBe(true);
    expect(screen.getByRole('button', { name: 'Master mute' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('the bridge collapse button cycles to FULL in the Edit page (v2.2 3-state cycle)', () => {
    boot({ mixerState: 'bridge' });
    // KNOWN QUIRK (report): the aria-label says "Collapse mixer rail" but in the
    // Edit page the cycle rule sends bridge → full, not bridge → collapsed.
    // Pinned as-is; see MixerDock.tsx:79 + cycleMixerState (useUiStore.ts).
    fireEvent.click(screen.getByRole('button', { name: 'Collapse mixer rail' }));
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

  it('the full dock collapse button returns to collapsed', () => {
    boot({ mixerState: 'full' });
    fireEvent.click(screen.getByRole('button', { name: 'Collapse mixer dock' }));
    expect(store().mixerState).toBe('collapsed');
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

  it('master strip: accent-tinted fader cap + accent-gradient base bar + readout row (A4)', () => {
    boot({ mixerState: 'full' });
    const master = screen.getByTestId('mixer-strip-master');
    const thumb = master.querySelector('[data-testid="fader-thumb"]') as HTMLElement;
    expect(thumb.style.background).toContain('var(--fader-cap-accent-1)'); // accent pair, flat
    expect(thumb.style.background).toContain('var(--fader-cap-accent-2)');
    expect(thumb.style.background).not.toContain('var(--fader-thumb-1)'); // NOT the neutral pair
    const bar = screen.getByTestId('mixer-basebar-master');
    expect(bar.style.background).toContain('var(--fader-cap-accent-1)');
    expect(bar.style.background).toContain('var(--fader-cap-accent-2)');
    expect(bar.className).toContain('h-1');
    const row = screen.getByTestId('mixer-readout-master');
    expect(row.className).toContain('mono');
    expect(within(row).getByText('-8.5 dB')).toBeInTheDocument(); // 0.78 volume → −8.5 dB
  });

  it('master readout −∞ guard: volume 0 (or mute) reads −∞, not −60.0 (A3)', () => {
    boot({ mixerState: 'full', masterVolume: 0 });
    const row = screen.getByTestId('mixer-readout-master');
    // at the volume floor BOTH the fader dB and the peak read −∞ (the guard),
    // and the fake "-60.0 dB" never renders
    expect(within(row).getAllByText('−∞')).toHaveLength(2);
    expect(within(row).queryByText('-60.0 dB')).toBeNull();
  });

  it('master readout follows the live engine peak (one key with bridge/toolbar views)', () => {
    boot({ mixerState: 'full' });
    act(() => { __setLevel('master', -6); });
    expect(within(screen.getByTestId('mixer-readout-master')).getByText('-6.0')).toBeInTheDocument();
  });
});
