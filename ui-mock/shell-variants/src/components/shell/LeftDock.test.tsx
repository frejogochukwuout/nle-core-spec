/* LeftDock — R19 th_mtoyt5fv ("use the same area as bin"): the left mediaW
   slot becomes ONE surface. Pinned here: the routing law (audio page →
   SoundLibrary; fx page → FxBrowser — R23-WA D-A5; color page → the STILLS
   GALLERY alone — R23-WB D-B4/#91, the Pool|Stills tab bar RETIRED with
   the pool tab; edit page → Media Pool ALONE — the Effects tab RETIRED
   with the FX view, #86/#82, R23-WA ruling 4), and the pool-toggle gating.
   R23-WD (DESIGN-R23 D-D1): the routing now reads the ONE table —
   leftDockContent(page) — so these pins ride the table: every non-deliver
   page mounts EXACTLY its table surface (single content = no tab bar),
   and deliver's null entry mounts NOTHING (DeliverPage owns the mainbody).
   The frozen effects drag contract + click fallback moved to
   components/fx/FxBrowser.test.tsx with the panel itself (re-homed, not
   dropped — the R20-W6 lesson); the color tab-pattern pins RETIRED with
   the tab bar (the retirement is the pin — #91's "only tab" law). */

import { describe, expect, it, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { LeftDock } from './LeftDock';
import { leftDockContent, type LeftDockSurface } from './leftDockContent';
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

  it('R23-WB (D-B4/#91): the COLOR page docks the STILLS GALLERY ALONE — no tab bar ("only tab in Media Bin")', () => {
    useUi.setState({ page: 'color', panels: { mediaPool: true, effects: true, inspector: true } });
    render(<LeftDock />);
    // the Pool|Stills tab bar is RETIRED — the dock is single-content
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByTestId('shell-leftdock-tab-pool')).toBeNull();
    expect(screen.queryByTestId('shell-leftdock-tab-stills')).toBeNull();
    // the Stills Gallery IS the content (not the media pool)
    expect(screen.getByTestId('shell-stills')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-mediapool')).toBeNull();
  });

  it('color page: the pool toggle gates the dock (the slot label follows — Stills)', () => {
    useUi.setState({ page: 'color', panels: { mediaPool: false, effects: true, inspector: true } });
    const { container } = render(<LeftDock />);
    expect(container.firstChild).toBeNull();
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

/* R23-WD (DESIGN-R23 D-D1): the table-driven routing — the dock mounts
   EXACTLY the surface leftDockContent names for the page (label = content,
   #106); deliver's null entry mounts nothing (ruling 16). */
describe('R23-WD (D-D1): the dock routing follows the leftDockContent table', () => {
  const SURFACE_TESTID: Record<LeftDockSurface, string> = {
    'media-pool': 'shell-mediapool',
    'stills': 'shell-stills',
    'sound-library': 'shell-soundlibrary',
    'fx-browser': 'shell-fxbrowser',
  };

  it('every non-deliver page mounts EXACTLY its table surface — single content, no tab bar anywhere', async () => {
    for (const p of ['edit', 'color', 'audio', 'fx'] as const) {
      const c = leftDockContent(p)!;
      useUi.setState({ page: p, panels: { mediaPool: true, effects: true, inspector: true } });
      const { unmount } = render(<LeftDock />);
      expect(screen.getByTestId(SURFACE_TESTID[c.surface])).toBeInTheDocument();
      expect(screen.queryByRole('tablist')).toBeNull(); // single content — #106's law
      if (p === 'edit') await settle(); // drain the pool's boot timers before unmount
      unmount();
    }
    useUi.setState({ page: 'edit' });
  });

  it('DELIVER: the table entry is null and the dock mounts NOTHING (DeliverPage owns the mainbody + its presets rail)', () => {
    useUi.setState({ page: 'deliver', panels: { mediaPool: true, effects: true, inspector: true } });
    const { container } = render(<LeftDock />);
    expect(leftDockContent('deliver')).toBeNull();
    expect(container.firstChild).toBeNull(); // not even the shell-leftdock wrapper
    useUi.setState({ page: 'edit' });
  });

  it('the pool-toggle gating follows the table too (edit/color gated; audio/fx own the whole slot)', () => {
    // gatedByPool pages: flag off → nothing
    for (const p of ['edit', 'color'] as const) {
      expect(leftDockContent(p)!.gatedByPool).toBe(true);
      useUi.setState({ page: p, panels: { mediaPool: false, effects: true, inspector: true } });
      const { container } = render(<LeftDock />);
      expect(container.firstChild).toBeNull();
    }
    // the un-gated pages render their surface even with the flag off
    // (standalone contract — the AppShell still gates the SLOT itself)
    for (const p of ['audio', 'fx'] as const) {
      expect(leftDockContent(p)!.gatedByPool).toBe(false);
      useUi.setState({ page: p, panels: { mediaPool: false, effects: true, inspector: true } });
      const { unmount, container } = render(<LeftDock />);
      expect(container.firstChild).not.toBeNull();
      unmount();
    }
    useUi.setState({ page: 'edit' });
  });
});
