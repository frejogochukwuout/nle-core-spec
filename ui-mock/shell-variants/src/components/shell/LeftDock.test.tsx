/* LeftDock — R19 th_mtoyt5fv ("use the same area as bin"): the left mediaW
   slot becomes ONE surface. Pinned here: the routing law (audio page →
   SoundLibrary; fx page → FxBrowser — R23-WA D-A5; color page → the
   Pool|Stills ARIA tabs; edit page → Media Pool ALONE — the Effects tab
   RETIRED with the FX view, #86/#82, R23-WA ruling 4), the ARIA tabs
   pattern on color (roving tabindex, aria-selected, ←/→ switching), and the
   pool-toggle gating. The frozen effects drag contract + click fallback
   moved to components/fx/FxBrowser.test.tsx with the panel itself
   (re-homed, not dropped — the R20-W6 lesson). */

import { describe, expect, it, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { LeftDock } from './LeftDock';
import { useUi } from '../../state/useUiStore';

const S = () => useUi.getState();
const PREFS_KEY = 'nle-mock-pool-prefs';

/** wait out the MediaPool's 900 ms first-mount OPFS skeleton when the pool
 *  is the mounted panel */
async function settle() {
  await act(async () => { await new Promise((r) => setTimeout(r, 950)); });
}

beforeEach(() => {
  window.localStorage.removeItem(PREFS_KEY);
});

describe('LeftDock (R19 th_mtoyt5fv — one surface in the bin slot)', () => {
  it('R23-WA ruling 4: the EDIT page renders the Media Pool ALONE — the Effects tab retired with the FX view (#86/#82)', async () => {
    useUi.setState({ page: 'edit', panels: { mediaPool: true, effects: true, inspector: true } });
    render(<LeftDock />);
    // NO tab bar even with the (now dead) panels.effects flag on
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByTestId('shell-leftdock-tab-pool')).toBeNull();
    expect(screen.queryByTestId('shell-leftdock-tab-effects')).toBeNull();
    expect(screen.getByTestId('shell-mediapool')).toBeInTheDocument();
    // the effects panel moved to the FX page's FxBrowser — nothing here
    expect(screen.queryByTestId('shell-fxbrowser')).toBeNull();
    expect(screen.queryByTestId('shell-effects')).toBeNull();
    await settle(); // drain the pool's boot timers
  });

  it('R23-WA (D-A5): the FX page docks the FxBrowser — its ONLY content, no tab bar (#106)', () => {
    useUi.setState({ page: 'fx', panels: { mediaPool: true, effects: true, inspector: true } });
    render(<LeftDock />);
    expect(screen.getByTestId('shell-fxbrowser')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByTestId('shell-mediapool')).toBeNull();
  });

  it('color page: tab bar with Media Pool | Stills, pool tab active by default', async () => {
    useUi.setState({ page: 'color', panels: { mediaPool: true, effects: true, inspector: true } });
    render(<LeftDock />);
    const dock = screen.getByTestId('shell-leftdock');
    expect(within(dock).getByRole('tablist', { name: 'Left dock' })).toBeInTheDocument();
    const poolTab = screen.getByTestId('shell-leftdock-tab-pool');
    const stillsTab = screen.getByTestId('shell-leftdock-tab-stills');
    expect(poolTab).toHaveAttribute('aria-selected', 'true');
    expect(stillsTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('shell-mediapool')).toBeInTheDocument();
    await settle();
  });

  it('clicking the Stills tab swaps the surface; switching back restores the pool', async () => {
    useUi.setState({ page: 'color', panels: { mediaPool: true, effects: true, inspector: true } });
    render(<LeftDock />);
    fireEvent.click(screen.getByTestId('shell-leftdock-tab-stills'));
    expect(screen.getByTestId('shell-leftdock-tab-stills')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('shell-stills')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-mediapool')).toBeNull();
    fireEvent.click(screen.getByTestId('shell-leftdock-tab-pool'));
    expect(screen.getByTestId('shell-mediapool')).toBeInTheDocument();
    await settle();
  });

  it('ARIA tabs: one tab stop, arrow keys switch, aria-selected follows', async () => {
    useUi.setState({ page: 'color', panels: { mediaPool: true, effects: true, inspector: true } });
    render(<LeftDock />);
    const poolTab = screen.getByTestId('shell-leftdock-tab-pool');
    const stillsTab = screen.getByTestId('shell-leftdock-tab-stills');
    expect(poolTab).toHaveAttribute('tabindex', '0');
    expect(stillsTab).toHaveAttribute('tabindex', '-1');
    // → from the pool tab lands focus on the stills tab AND activates it
    fireEvent.keyDown(screen.getByRole('tablist', { name: 'Left dock' }), { key: 'ArrowRight' });
    expect(screen.getByTestId('shell-leftdock-tab-stills')).toHaveFocus();
    expect(screen.getByTestId('shell-leftdock-tab-stills')).toHaveAttribute('aria-selected', 'true');
    // ← wraps back to the pool
    fireEvent.keyDown(screen.getByRole('tablist', { name: 'Left dock' }), { key: 'ArrowLeft' });
    expect(screen.getByTestId('shell-leftdock-tab-pool')).toHaveFocus();
    expect(screen.getByTestId('shell-leftdock-tab-pool')).toHaveAttribute('aria-selected', 'true');
    await settle();
  });

  it('pool toggle off: the dock renders nothing (edit page — the parent hides the slot)', () => {
    useUi.setState({ page: 'edit', panels: { mediaPool: false, effects: true, inspector: true } });
    const { container } = render(<LeftDock />);
    expect(container.firstChild).toBeNull();
  });

  it('audio page: the slot is the SoundLibrary (Fairlight-style left dock)', () => {
    useUi.setState({ page: 'audio', panels: { mediaPool: true, effects: true, inspector: true } });
    render(<LeftDock />);
    expect(screen.getByTestId('shell-soundlibrary')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByTestId('shell-mediapool')).toBeNull();
    expect(screen.queryByTestId('shell-fxbrowser')).toBeNull();
  });
});

describe('LeftDock edit-page routing (R23-WA — dead-flag honesty)', () => {
  it('panels.effects is dead view state on edit: pool off + effects "on" still renders NOTHING (the flag no longer mounts a surface)', () => {
    // the flag gated the old Effects tab; post-retirement the pool is the
    // only edit-page surface — nothing else can mount from that flag
    useUi.setState({ page: 'edit', panels: { mediaPool: false, effects: true, inspector: true } });
    const { container } = render(<LeftDock />);
    expect(container.firstChild).toBeNull();
    expect(S().panels.effects).toBe(true); // the flag itself is untouched — dead-but-harmless
  });
});
