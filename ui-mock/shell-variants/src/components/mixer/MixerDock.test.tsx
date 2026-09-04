/* MixerDock component tests — the 3-state machine (collapsed / bridge rail /
   full strip row, design doc v2.2 §4): state-driven rendering (jsdom's
   ResizeObserver stub never fires, so the compact path is a ChannelStrip
   concern tested there), shared master values, strip focus + escalation
   flash. */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { MixerDock } from './MixerDock';
import { renderShell, store, type UiPatch } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';

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
});
