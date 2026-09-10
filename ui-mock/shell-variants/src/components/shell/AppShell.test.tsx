/* AppShell — spec 18 §3 region-structure integration. Renders the real shell
   (renderShell provider stack) inside a 1280×800 host and asserts DOM
   STRUCTURE only — jsdom has no layout, so no pixel geometry. Pins: the §3
   region stack (toolbar / mainbody / timeline block / status strip / dock),
   the §4.8 page-dock right-rail swap, the side-by-side mixer dock (design
   doc v2.2 §4), panel toggles from the toolbar, and the inspector tab bar.
   Boot states are set directly through the store patch — ResizeObserver-
   dependent compact behavior is never simulated via resize. */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './AppShell';
import { CheatSheet } from './CheatSheet';
import { renderShell, store, type UiPatch } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';

/** 1280×800 host (§3.2 minimum) — jsdom ignores geometry, but the size keeps
 *  the DOM honest about the real mount contract. */
function renderAppShell(patch?: UiPatch) {
  const host = document.createElement('div');
  host.setAttribute('data-appshell-host', '');
  host.style.width = '1280px';
  host.style.height = '800px';
  document.body.appendChild(host);
  return renderShell(<AppShell />, { patch, container: host });
}

afterEach(() => {
  document.querySelectorAll('body > [data-appshell-host]').forEach((el) => el.remove());
});

/* ---------- R13-D2 additions (test-gap closure from the R13-W1c review):
   real splitter-seam drags (the R12 inspector +dx regression), the rAF
   playback loop, F6/⇧F6 region cycling, and the dock cheat-sheet entry. All
   drive the REAL handlers (pointer events at the separators, window F6
   keydowns, drag events at the lanes) instead of boot-patching results. ---------- */

/** App.tsx composition: AppShell with its sibling CheatSheet modal (App.tsx
 *  mounts them side by side — the dock button must open the real sheet). */
function renderAppShellWithCheatSheet(patch?: UiPatch) {
  const host = document.createElement('div');
  host.setAttribute('data-appshell-host', '');
  host.style.width = '1280px';
  host.style.height = '800px';
  document.body.appendChild(host);
  return renderShell(
    <>
      <AppShell />
      <CheatSheet />
    </>,
    { patch, container: host },
  );
}

describe('AppShell region structure (spec 18 §3)', () => {
  it('renders the full region stack: toolbar, media pool, viewer, inspector, timeline, status strip, dock', () => {
    renderAppShell();
    // §3 top-to-bottom: toolbar → mainbody (pool | viewer | inspector) →
    // timeline block → status strip → app dock
    expect(screen.getByTestId('shell-toolbar')).toHaveAttribute('role', 'toolbar');
    expect(screen.getByTestId('shell-mediapool')).toBeInTheDocument();
    expect(screen.getByTestId('shell-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('shell-viewer-btn-play')).toBeInTheDocument();
    expect(screen.getByTestId('shell-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('shell-status')).toBeInTheDocument();
    expect(screen.getByTestId('shell-dock')).toBeInTheDocument();
  });

  it('timeline block: 4 track-header lanes, the in-window fixture clips, TC readout, crossfade marker', () => {
    renderAppShell();
    for (const trackId of ['tr-overlay-1', 'tr-main', 'tr-audio-1', 'tr-audio-2']) {
      expect(screen.getByTestId(`shell-track-header-${trackId}`)).toBeInTheDocument();
    }
    /* R15 T9 clip virtualization: jsdom's viewport fallback is 900 px → the
       window [−200, 1100] at pps 46 culls el-4 (24 s → 1104 px) — the ONLY
       fixture clip outside it; a real ≥1500 px shell keeps all 7. Mirrors the
       Timeline-test law (canonical virtualization contract). */
    for (const elId of ['el-1', 'el-2', 'el-3', 'el-5', 'el-6', 'el-7']) {
      expect(screen.getByTestId(`clip-${elId}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('clip-el-4')).not.toBeInTheDocument(); // culled at 900 px viewport
    // playhead boots at 16s (§6.2 default) → TC readout + the el-2 crossfade
    expect(screen.getByTestId('shell-timeline-tc')).toHaveTextContent('00:00:16:00');
    expect(screen.getByTestId('transition-el-2')).toBeInTheDocument();
  });

  it('app dock exposes exactly the five pages with Edit current (§4.8 + R23-WA FX, D-A1)', () => {
    renderAppShell();
    const dock = screen.getByTestId('shell-dock');
    for (const page of ['edit', 'color', 'audio', 'fx', 'deliver']) {
      expect(screen.getByTestId(`shell-dock-page-${page}`)).toBeInTheDocument();
    }
    expect(within(dock).getByRole('button', { name: 'Edit' })).toHaveAttribute('aria-current', 'page');
    expect(within(dock).queryByRole('button', { name: 'Color' })).not.toHaveAttribute('aria-current');
  });

  /* R23-WA (DESIGN-R23 D-A1): the FX page composition — the effects browser
     moved from the retired Edit-page Effects tab (below) to the FX page's
     left dock; the right rail becomes the FX inspector; the timeline area is
     the FULL Timeline in fxMode (the page coupling, ruling 2 — pinned at the
     seam-zone presence, Timeline.test owns the engine grammar). */
  it('R23-WA: the FX page composes FxBrowser + FxInspector + the full Timeline in fxMode (D-A1)', () => {
    /* the patch boots view state directly (the StoreBoot law — the ACTIONS
       are the single writer; the coupling itself is pinned at store level in
       useUiStore.test 'fxMode — the single-source coupling') */
    renderAppShell({ page: 'fx', fxMode: true });
    expect(screen.getByTestId('shell-fxbrowser')).toBeInTheDocument();
    expect(screen.getByTestId('shell-fxinspector')).toBeInTheDocument();
    // the page coupling turned the engine on — seam zones render
    expect(screen.getAllByTestId(/^fx-seam-/).length).toBeGreaterThan(0);
    expect(store().fxMode).toBe(true);
    // the FX page's dock is the browser ALONE (no pool — D-A5's routing law)
    expect(screen.queryByTestId('shell-mediapool')).not.toBeInTheDocument();
    // ruling 1: mainbody default 40% (the Edit default — NEVER color's 55%:
    // the timeline row carries the FULL Timeline at normal lane heights)
    expect(document.querySelector('.mainbody')).toHaveStyle({ height: '40%' });
  });

  it('R23-WA: leaving the FX page resets fxMode + re-seats a stranded FX tool (ruling 2)', () => {
    renderAppShell({ page: 'fx', tool: 'fx', fxMode: true });
    expect(store().fxMode).toBe(true);
    fireEvent.click(screen.getByTestId('shell-dock-page-edit'));
    expect(store().page).toBe('edit');
    expect(store().fxMode).toBe(false);
    expect(store().tool).toBe('select'); // the radio never claims a dead fxMode
  });

  it('R23-WA ruling 4: the EDIT page dock is the Media Pool ALONE — the Effects tab retired with the FX view (#86/#82)', () => {
    renderAppShell();
    expect(screen.queryByTestId('shell-leftdock-tab-effects')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shell-effects')).not.toBeInTheDocument();
    expect(screen.getByTestId('shell-mediapool')).toBeInTheDocument();
    // the dead-but-harmless flag can no longer mount a surface
    act(() => { useUi.setState((s) => ({ panels: { ...s.panels, effects: true } })); });
    expect(screen.queryByTestId('shell-effects')).not.toBeInTheDocument();
  });

  /* R23-WA re-home (the R20-W6 law — deleted-surface tests move to the
     surface's new home, never drop): the effects panel's frozen drag
     contract + click fallback moved to components/fx/FxBrowser.test.tsx
     (the panel itself moved to the FX page's dock). The LeftDock.test pins
     the edit-page routing; this file keeps the shell-level composition. */

  it('splitters own the panel + timeline seams (§3.2: 12px hit targets, labeled)', () => {
    renderAppShell();
    const seps = screen.getAllByRole('separator');
    expect(seps.length).toBeGreaterThanOrEqual(3); // media | viewer-inspector | timeline
    expect(screen.getAllByRole('separator', { name: 'Resize panel' }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('separator', { name: 'Resize timeline' })).toBeInTheDocument();
  });

  it('skip-to-timeline link present; the §6.4 notification region mounts with its toast stack', () => {
    renderAppShell({ toasts: [{ id: 900, kind: 'info', title: 'Boot notice' }] });
    expect(screen.getByRole('link', { name: 'Skip to timeline' })).toHaveAttribute('href', '#timeline-scroll');
    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(within(region).getByTestId('shell-toast-0')).toHaveTextContent('Boot notice');
  });
});

describe('mixer dock (design doc v2.2 §4 — side by side with the lanes)', () => {
  it('Edit default: collapsed state renders NO mixer dock surface', () => {
    renderAppShell();
    expect(store().mixerState).toBe('collapsed');
    expect(screen.queryByTestId('mixer-dock-meters')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixer-dock-full')).not.toBeInTheDocument();
  });

  it('mixerState=full: the full dock renders SIDE BY SIDE with the timeline lanes (both in DOM)', () => {
    renderAppShell({ mixerState: 'full' });
    const timeline = screen.getByTestId('shell-timeline');
    const dock = screen.getByTestId('mixer-dock-full');
    expect(timeline).toBeInTheDocument();
    expect(dock).toBeInTheDocument();
    // same flex row: R23-WB (D-B3) wrapped the lanes in their own flex column
    // (the compact ↔ full swap lives inside it) — the CONSOLE ROW that carries
    // lanes + dock is two levels up from the timeline surface itself
    const consoleRow = timeline.parentElement!.parentElement!;
    expect(consoleRow).toContainElement(dock);
    expect(timeline.compareDocumentPosition(dock)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    // strips: one per audio track (A1, A2) + aux returns + master
    expect(screen.getByTestId('mixer-strip-A1')).toBeInTheDocument();
    expect(screen.getByTestId('mixer-strip-A2')).toBeInTheDocument();
    expect(screen.getByTestId('mixer-strip-aux-a1')).toBeInTheDocument();
    expect(screen.getByTestId('mixer-strip-aux-a2')).toBeInTheDocument();
    expect(screen.getByTestId('mixer-strip-master')).toBeInTheDocument();
  });

  it('mixerState=meters: the full-height meter-column dock beside the lanes (R20-W1 D1.4)', () => {
    renderAppShell({ mixerState: 'meters' });
    expect(screen.getByTestId('mixer-dock-meters')).toBeInTheDocument();
    expect(screen.queryByTestId('mixer-dock-full')).not.toBeInTheDocument();
    expect(screen.getByTestId('meter-col-A1')).toBeInTheDocument();
    expect(screen.getByTestId('meter-col-A2')).toBeInTheDocument();
    expect(screen.getByTestId('meter-col-master')).toBeInTheDocument(); // pinned right
    // lanes still present beside the columns
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
  });
});

describe('page switching via the AppDock (spec 18 §4.8)', () => {
  it('Edit → Color: the R23-WB composition — viewer dominant, inspector = color tabs, compact timeline + Stills dock (issues #90–#97)', async () => {
    const user = userEvent.setup();
    renderAppShell();
    expect(screen.getByTestId('shell-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    await user.click(screen.getByTestId('shell-dock-page-color'));
    expect(store().page).toBe('color');
    // timeline area = the compact strip under the D-B3 density law (auto → compact on color)
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline')).not.toBeInTheDocument();
    // rail = the ColorInspector (the ONE grading surface, tabs under this panel)
    expect(screen.getByTestId('shell-color-inspector')).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Color inspector tools' })).toBeInTheDocument();
    expect(screen.queryByTestId('shell-inspector')).not.toBeInTheDocument();
    // left dock = the STILLS GALLERY, no tab bar (#91 — the pool tab died there)
    expect(screen.getByTestId('shell-leftdock')).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Left dock' })).toBeNull();
    expect(screen.getByTestId('shell-stills')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-mediapool')).not.toBeInTheDocument();
    // the node graph NEVER docks here (#77) — it is the viewer-region surface (D-B2)
    expect(screen.queryByTestId('shell-color-nodegraph')).not.toBeInTheDocument();
    // the scopes console is OFF by default (nothing permanent in the console row, #77)
    expect(screen.queryByTestId('shell-color-scopes')).not.toBeInTheDocument();
    // the node-graph viewer surface is OFF by default (#93)
    expect(screen.queryByTestId('shell-color-nodeviewer')).not.toBeInTheDocument();
    // D-B5/#92: the Mixer toggle is DOM-absent on color (Edit+Audio only)
    expect(screen.queryByTestId('shell-toolbar-btn-mixer')).toBeNull();
    expect(screen.getByRole('button', { name: 'Color' })).toHaveAttribute('aria-current', 'page');
  });

  it('the R23-WB consoles: the ScopesDock joins the timeline-area console row as TABS; the Nodes toggle swaps the VIEWER (#90/#95/#93)', async () => {
    const user = userEvent.setup();
    renderAppShell({ mixerState: 'full' });
    expect(screen.getByTestId('mixer-dock-full')).toBeInTheDocument(); // edit page: side by side
    await user.click(screen.getByTestId('shell-dock-page-color'));
    // D-B5/#92 (the #73 reversal): entering color COLLAPSES the mixer — the
    // dock does not render there, and its toggle is DOM-absent
    expect(store().mixerState).toBe('collapsed');
    expect(screen.queryByTestId('mixer-dock-full')).not.toBeInTheDocument();
    // the scopes console: off → open via the toolbar toggle; the dock sits in
    // the TIMELINE-AREA CONSOLE ROW (beside the compact strip), TABS, one
    // scope at a time — never the squeezed under-viewer strip
    await user.click(screen.getByTestId('shell-toolbar-btn-scopes'));
    expect(screen.getByTestId('shell-color-scopes')).toBeInTheDocument();
    // the D-B1 geometry law: the console-row wrapper takes the row's flex
    // share (flex-1 + the 320px floor) and the dock fills it by
    // flex/min-h-0 — NEVER a % height (the R22 percentage-in-flex law)
    const scopes = screen.getByTestId('shell-color-scopes');
    const rowShare = scopes.parentElement!;
    expect(rowShare).toHaveClass('min-w-[320px]');
    expect(rowShare).toHaveClass('flex-1');
    expect(scopes).toHaveClass('h-full');
    expect(scopes).toHaveClass('min-h-0');
    expect(scopes.style.height).toBe('');
    expect(screen.getByTestId('shell-color-scopes-tab-waveform')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('shell-color-scope-waveform')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-color-scope-vectorscope')).toBeNull();
    await user.click(screen.getByTestId('shell-color-scopes-tab-vectorscope'));
    expect(screen.getByTestId('shell-color-scope-vectorscope')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-color-scope-waveform')).toBeNull();
    // the compact strip still owns the timeline lanes beside the dock
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument();
    // the nodes console: the toggle swaps the VIEWER REGION — the header
    // names the grade target, × restores the viewer (D-B2)
    await user.click(screen.getByTestId('shell-toolbar-btn-nodes'));
    expect(screen.getByTestId('shell-color-nodeviewer')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-nodegraph')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-nodeviewer-target')).toHaveTextContent('Marina interview');
    expect(screen.queryByTestId('shell-viewer')).toBeNull();
    await user.click(screen.getByTestId('shell-color-nodeviewer-close'));
    expect(screen.queryByTestId('shell-color-nodeviewer')).toBeNull();
    expect(screen.getByTestId('shell-viewer')).toBeInTheDocument();
    // leaving color restores the standard timeline + drops the consoles
    await user.click(screen.getByTestId('shell-dock-page-edit'));
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline-compact')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shell-color-nodeviewer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shell-color-scopes')).not.toBeInTheDocument();
  });

  it('D-B2: the nodes surface keeps its F6 stop [2] — the wrapper survives the swap (the surface swap stays inside it)', () => {
    renderAppShell({ page: 'color', colorNodesDock: true });
    expect(screen.queryByTestId('shell-viewer')).toBeNull();
    // three F6s walk toolbar → left dock → the CENTER region; the third stop
    // is still the mainbody center wrapper — now hosting the node surface
    // (the region did not multiply, vanish, or lose its place in the cycle)
    for (let i = 0; i < 3; i++) {
      fireEvent(window, new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true }));
    }
    expect(document.activeElement?.contains(screen.getByTestId('shell-color-nodeviewer'))).toBe(true);
    expect(document.activeElement?.contains(screen.getByTestId('shell-timeline-compact'))).toBe(false);
  });

  it('Audio dock button enters audio focus: page + full mixer + lane boost + SoundLibrary/ChannelEditor', async () => {
    const user = userEvent.setup();
    renderAppShell();
    await user.click(screen.getByTestId('shell-dock-page-audio'));
    expect(store().page).toBe('audio');
    expect(store().mixerState).toBe('full');
    expect(store().audioLaneBoost).toBe(true);
    // media-pool slot swaps to the SoundLibrary; right rail becomes the ChannelEditor
    expect(screen.getByTestId('shell-soundlibrary')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-mediapool')).not.toBeInTheDocument();
    expect(screen.getByTestId('shell-channel-editor')).toBeInTheDocument();
    expect(screen.getByTestId('mixer-dock-full')).toBeInTheDocument();
  });

  it('full dock cycle: edit → color → audio → deliver → edit restores the Inspector rail', async () => {
    const user = userEvent.setup();
    renderAppShell();
    await user.click(screen.getByTestId('shell-dock-page-color'));
    await user.click(screen.getByTestId('shell-dock-page-audio'));
    await user.click(screen.getByTestId('shell-dock-page-deliver'));
    expect(store().page).toBe('deliver');
    expect(screen.getByTestId('shell-deliver')).toBeInTheDocument();
    // leaving audio focus by any route resets the lane boost (design §3.3)
    expect(store().audioLaneBoost).toBe(false);
    // D-B3: 'auto' resolves compact on deliver — R23-WF (D-F1) fills the seam
    // in: the compact strip carries the RANGE BAND head row (ruler replaced)
    // and the mainbody takes deliver's 50% rebalance
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument();
    expect(screen.getByTestId('shell-deliver-range-band')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline-compact-ruler')).not.toBeInTheDocument();
    expect(document.querySelector('.mainbody')).toHaveStyle({ height: '50%' });
    expect(screen.queryByTestId('shell-timeline')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('shell-dock-page-edit'));
    expect(store().page).toBe('edit');
    expect(screen.getByTestId('shell-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-deliver')).not.toBeInTheDocument();
  });
});

describe('R23-WB (DESIGN-R23 D-B3, issue #94) → R24-W1: the timeline density law', () => {
  const mainbody = () => document.querySelector('.mainbody') as HTMLElement;
  const mainbodyH = () => mainbody().style.height;
  /* R24-W1 (A3-R4): the standalone density button is RETIRED — density
     drives through the ViewOptionsPopover's Compact-tracks
     menuitemcheckbox now. The checkbox KEEPS the menu open, so repeat
     flips never re-open. */
  const openCompactMenu = async (user: ReturnType<typeof userEvent.setup>) => {
    if (!screen.queryByTestId('shell-menu-tl-view-options')) {
      await user.click(screen.getByTestId('shell-timeline-toolbar-btn-view-options'));
    }
    return screen.getByTestId('shell-menu-tl-view-options-compact');
  };
  const flipCompact = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await openCompactMenu(user));
  };

  it('color auto: compact strip + the 55% mainbody default (the tall-viewer color composition)', async () => {
    const user = userEvent.setup();
    renderAppShell();
    await user.click(screen.getByTestId('shell-dock-page-color'));
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument();
    expect(mainbodyH()).toBe('55%');
    // the Compact-tracks checkbox is present on EVERY page and honestly checked
    expect(await openCompactMenu(user)).toHaveAttribute('aria-checked', 'true');
  });

  it('flipping color to FULL TRACKS drops the default mainbody to 40% (ruling 11 — the filmstrip needs lane room)', async () => {
    const user = userEvent.setup();
    renderAppShell();
    await user.click(screen.getByTestId('shell-dock-page-color'));
    await flipCompact(user);
    // the override lands in the store; the FULL Timeline replaces the strip
    expect(store().timelineCompact).toBe('off');
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline-compact')).not.toBeInTheDocument();
    expect(screen.getByTestId('shell-menu-tl-view-options-compact')).toHaveAttribute('aria-checked', 'false');
    expect(mainbodyH()).toBe('40%');
    // flipping back to compact restores the 55% default (the user never dragged)
    // — the checkbox keeps the menu open, no re-open needed
    await user.click(screen.getByTestId('shell-menu-tl-view-options-compact'));
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument();
    expect(mainbodyH()).toBe('55%');
  });

  it('the user-dragged mainBodyH ALWAYS wins over the density default (the mainBodyUserSet law)', async () => {
    const user = userEvent.setup();
    renderAppShell({ page: 'color', mainBodyH: 500, mainBodyUserSet: true });
    expect(mainbodyH()).toBe('500px');
    await flipCompact(user);
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(mainbodyH()).toBe('500px'); // no density flip may steal the user's height
  });

  it('compact is reachable on EDIT too (#94 — "allow to be used everywhere")', async () => {
    const user = userEvent.setup();
    renderAppShell();
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(await openCompactMenu(user)).toHaveAttribute('aria-checked', 'false');
    await flipCompact(user);
    expect(store().timelineCompact).toBe('on');
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline')).not.toBeInTheDocument();
    // the edit-page mainbody default stays 40% either way (only color carries the 55% compact law)
    expect(mainbodyH()).toBe('40%');
  });

  it("'on'/'off' are per-session overrides: the user's word survives a page flip (auto does not)", async () => {
    const user = userEvent.setup();
    renderAppShell({ page: 'color' });
    await user.click(screen.getByTestId('shell-dock-page-edit'));
    expect(store().timelineCompact).toBe('auto');
    // edit auto → full; now the user forces compact and flips BACK to color:
    await flipCompact(user);
    expect(store().timelineCompact).toBe('on');
    await user.click(screen.getByTestId('shell-dock-page-color'));
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument(); // the override holds
    expect(store().timelineCompact).toBe('on');
  });
});

/* ---------- R23-WF (DESIGN-R23 D-F1, #107): the deliver composition ----------
   The compact strip (auto → on, D-B3) carries the 32px RANGE BAND head row
   in place of its ruler, and the mainbody takes deliver's 50% rebalance
   (the same while-compact interaction law color's 55% rides, ruling 11's
   shape). The band's own grammar is pinned in TimelineCompact.test. */
describe('R23-WF (DESIGN-R23 D-F1, #107): the deliver composition', () => {
  const mainbody = () => document.querySelector('.mainbody') as HTMLElement;
  const mainbodyH = () => mainbody().style.height;

  it('deliver auto: compact strip + the RANGE BAND head row (ruler replaced) + the 50% mainbody default', () => {
    renderAppShell({ page: 'deliver' });
    expect(screen.getByTestId('shell-deliver')).toBeInTheDocument();
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument();
    expect(screen.getByTestId('shell-deliver-range-band')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline-compact-ruler')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline')).not.toBeInTheDocument();
    expect(mainbodyH()).toBe('50%');
  });

  it('flipping deliver to FULL TRACKS drops the default mainbody to 40% — the band goes WITH the strip (ruling 11, deliver-shaped)', async () => {
    const user = userEvent.setup();
    renderAppShell({ page: 'deliver' });
    // R24-W1: density flips ride the ViewOptionsPopover now (the checkbox
    // keeps the menu open, so the flip-back below needs no re-open)
    await user.click(screen.getByTestId('shell-timeline-toolbar-btn-view-options'));
    await user.click(screen.getByTestId('shell-menu-tl-view-options-compact'));
    expect(store().timelineCompact).toBe('off');
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    // the band is the compact strip's head row only — full tracks bring the
    // full Ruler + its brackets back (the loop seam keeps every writer)
    expect(screen.queryByTestId('shell-deliver-range-band')).not.toBeInTheDocument();
    expect(mainbodyH()).toBe('40%');
    // flipping back restores the band + the 50% default (the user never dragged)
    await user.click(screen.getByTestId('shell-menu-tl-view-options-compact'));
    expect(screen.getByTestId('shell-deliver-range-band')).toBeInTheDocument();
    expect(mainbodyH()).toBe('50%');
  });

  it('the user-dragged mainBodyH ALWAYS wins on deliver too (the mainBodyUserSet law)', async () => {
    const user = userEvent.setup();
    renderAppShell({ page: 'deliver', mainBodyH: 500, mainBodyUserSet: true });
    expect(mainbodyH()).toBe('500px');
    await user.click(screen.getByTestId('shell-timeline-toolbar-btn-view-options'));
    await user.click(screen.getByTestId('shell-menu-tl-view-options-compact'));
    expect(mainbodyH()).toBe('500px'); // no density flip may steal the user's height
  });

  it('the band is deliver-only: compact forced ON on edit keeps the ruler (no band leaks to other pages)', () => {
    renderAppShell({ page: 'edit', timelineCompact: 'on' });
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument();
    expect(screen.getByTestId('shell-timeline-compact-ruler')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-deliver-range-band')).not.toBeInTheDocument();
    expect(mainbodyH()).toBe('40%'); // edit never carries a page default
  });
});

describe('inspector rail routing + toolbar panel toggles (R20-W3 D4 domains)', () => {
  it('the tab strip is gone — the rail renders ONE scroll of type-driven sections (thread #53)', () => {
    renderAppShell();
    expect(screen.queryByRole('tablist', { name: 'Inspector tabs' })).not.toBeInTheDocument();
    expect(screen.getByTestId('shell-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-entity-chip')).toBeInTheDocument();
  });

  it('the track domain swaps the rail content to the TrackSheet (selected, via the header residue)', async () => {
    const user = userEvent.setup();
    renderAppShell({ selection: ['el-2'] });
    // the header's non-interactive residue — userEvent fires the full pointer
    // sequence (pointerdown → click) the residue route needs
    const header = screen.getByTestId('shell-track-header-tr-audio-1');
    await user.click(header);
    expect(store().selectedTrackId).toBe('tr-audio-1');
    // the rail (still the Inspector panel) renders the SELECTED track sheet
    const sheet = screen.getByTestId('shell-track-sheet');
    expect(sheet).toHaveAttribute('data-via', 'selected');
    expect(screen.getByTestId('shell-inspector-state-track')).toBeInTheDocument();
    // selecting a clip clears the domain and restores the clip sections
    await user.click(screen.getByTestId('clip-el-1'));
    expect(store().selectedTrackId).toBe(null);
    expect(screen.queryByTestId('shell-track-sheet')).not.toBeInTheDocument();
  });

  it('the effect domain renders the EffectEditor in the rail (accordion + breadcrumb chip)', async () => {
    const user = userEvent.setup();
    renderAppShell({ selection: ['el-1'] });
    // the effect row in the inspector's Effects section selects the effect
    await user.click(screen.getByTestId('shell-effect-row-fx-1'));
    expect(store().selectedEffectId).toBe('fx-1');
    expect(screen.getByTestId('shell-effect-editor-fx-1')).toBeInTheDocument();
    expect(screen.getByTestId('inspector-entity-chip')).toHaveAttribute('data-entity', 'effect');
    expect(screen.getByTestId('inspector-breadcrumb')).toBeInTheDocument();
  });

  it('R22-D5 (#87): the Project button is REMOVED from the toolbar; the ProjectSheet law stays (store-driven)', async () => {
    const user = userEvent.setup();
    renderAppShell();
    // the button is gone — the console toggles own the slot
    expect(screen.queryByTestId('shell-toolbar-btn-project')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shell-toolbar-btn-effects')).not.toBeInTheDocument();
    // the store law survives (dead-but-harmless field): project mode still
    // swaps the rail when set directly, and a selection still exits it
    act(() => { useUi.setState({ inspectorProjectMode: true }); });
    expect(screen.getByTestId('shell-inspector-project')).toBeInTheDocument();
    await user.click(screen.getByTestId('clip-el-1'));
    expect(store().inspectorProjectMode).toBe(false);
    expect(screen.queryByTestId('shell-inspector-project')).not.toBeInTheDocument();
    expect(screen.getByTestId('inspector-entity-chip')).toHaveAttribute('data-entity', 'clip');
  });

  it('toolbar Media Pool toggle hides the panel region + its splitter (§4.1)', async () => {
    const user = userEvent.setup();
    renderAppShell();
    const btn = screen.getByTestId('shell-toolbar-btn-mediapool');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    await user.click(btn);
    expect(store().panels.mediaPool).toBe(false);
    expect(screen.queryByTestId('shell-mediapool')).not.toBeInTheDocument();
    expect(screen.queryByRole('separator', { name: 'Resize panel' })).toBeInTheDocument(); // inspector seam stays
    expect(screen.getByTestId('shell-viewer')).toBeInTheDocument();
    await user.click(btn); // toggle back — one click must restore it
    expect(screen.getByTestId('shell-mediapool')).toBeInTheDocument();
  });

  it('toolbar Inspector toggle removes the right rail + its seam (viewer keeps the row)', async () => {
    const user = userEvent.setup();
    renderAppShell();
    await user.click(screen.getByTestId('shell-toolbar-btn-inspector'));
    expect(store().panels.inspector).toBe(false);
    expect(screen.queryByTestId('shell-inspector')).not.toBeInTheDocument();
    // only the media-pool seam survives — the inspector seam unmounts with the rail
    expect(screen.getAllByRole('separator', { name: 'Resize panel' })).toHaveLength(1);
    expect(screen.getByTestId('shell-viewer')).toBeInTheDocument();
  });
});

/** Both V-seams share the "Resize panel" label (registered deviation), so
 *  locate each by the panel its NEXT sibling wraps: the media seam precedes
 *  the viewer region, the inspector seam precedes the right rail. */
const seamBefore = (testid: string): HTMLElement => {
  const panel = screen.getByTestId(testid);
  const sep = screen.getAllByRole('separator', { name: 'Resize panel' }).find(
    (el) => (el.nextElementSibling as HTMLElement | null)?.contains(panel),
  );
  if (!sep) throw new Error(`no "Resize panel" seam precedes ${testid}`);
  return sep;
};

describe('splitter seams (R12 regression — spec 18 §3.2)', () => {

  it('inspector seam: dragging LEFT widens the right-docked rail (pins the R12 +dx runaway fix)', () => {
    renderAppShell();
    const sep = seamBefore('shell-inspector');
    // 340 → dragging the seam left (dx −60) must WIDEN the rail to 400
    fireEvent.pointerDown(sep, { pointerId: 1, button: 0, clientX: 600 });
    fireEvent.pointerMove(sep, { pointerId: 1, buttons: 1, clientX: 540 });
    expect(store().inspectorW).toBe(400);
    // the start ref resets each move, so drags are incremental: −20 more → 420
    fireEvent.pointerMove(sep, { pointerId: 1, buttons: 1, clientX: 520 });
    expect(store().inspectorW).toBe(420);
    // dragging RIGHT narrows it back (+40 → 380) — direction pinned both ways
    fireEvent.pointerMove(sep, { pointerId: 1, buttons: 1, clientX: 560 });
    expect(store().inspectorW).toBe(380);
  });

  it('media-pool seam: dragging RIGHT widens the left-docked pool (mediaW + dx)', () => {
    renderAppShell();
    const sep = seamBefore('shell-viewer');
    fireEvent.pointerDown(sep, { pointerId: 1, button: 0, clientX: 300 });
    fireEvent.pointerMove(sep, { pointerId: 1, buttons: 1, clientX: 340 }); // dx +40
    expect(store().mediaW).toBe(320); // 280 + 40
    fireEvent.pointerMove(sep, { pointerId: 1, buttons: 1, clientX: 320 }); // dx −20
    expect(store().mediaW).toBe(300);
  });

  it('timeline H-seam drag resizes mainBodyH; double-click resets each seam (§3.2)', () => {
    renderAppShell({ mainBodyH: 400, inspectorW: 420, mediaW: 360 });
    const hSep = screen.getByRole('separator', { name: 'Resize timeline' });
    fireEvent.pointerDown(hSep, { pointerId: 1, button: 0, clientY: 500 });
    fireEvent.pointerMove(hSep, { pointerId: 1, buttons: 1, clientY: 540 }); // dy +40
    expect(store().mainBodyH).toBe(440);
    // dbl-click resets — the V-seams return to the §3.2 structural defaults
    fireEvent.doubleClick(seamBefore('shell-inspector'));
    expect(store().inspectorW).toBe(340);
    fireEvent.doubleClick(seamBefore('shell-viewer'));
    expect(store().mediaW).toBe(280);
    // H-seam reset returns to 0 = the auto sentinel (40% of viewport, §3.2) —
    // R13 fix: setMainBodyH clamped 0 into [320,900] so the reset landed at
    // 320 and "auto" was unreachable; 0 is now preserved as the auto value.
    fireEvent.doubleClick(hSep);
    expect(store().mainBodyH).toBe(0);
  });
});

describe('playback loop (mock engine — spec 18 §3.2 playback)', () => {
  it('playing: true advances the playhead through the rAF loop', async () => {
    renderAppShell({ playing: true });
    // rAF stub = 16 ms setTimeout (setup.ts) → real-timer waitFor suffices
    // sibling parity: 3 s real-timer budget — the default 1 s flaked under a
    // full parallel-suite load (rAF stub = setTimeout, CPU-contended workers)
    await waitFor(() => expect(store().playhead).toBeGreaterThan(16), { timeout: 3000 });
    expect(store().playing).toBe(true); // mid-timeline — no auto-stop
    act(() => store().setPlaying(false)); // stop the loop before teardown
  });

  it('forward playback auto-stops and clamps the playhead to the scene duration', async () => {
    renderAppShell({ playing: true, playhead: 29.9 }); // sc-1 duration = 30 s
    await waitFor(() => {
      expect(store().playing).toBe(false);
      expect(store().playhead).toBe(30);
    }, { timeout: 3000 });
  });

  it('loopEnabled: crossing loop.end wraps back to loop.start and keeps playing', async () => {
    renderAppShell({ playing: true, playhead: 16.9, loopEnabled: true, loop: { start: 2, end: 17 } });
    // < 16.9 is only reachable AFTER the wrap (forward play starts at 16.9)
    await waitFor(() => {
      expect(store().playhead).toBeLessThan(16.9);
      expect(store().playhead).toBeGreaterThanOrEqual(2); // wrapped to loop.start
    }, { timeout: 3000 });
    expect(store().playing).toBe(true); // loop ≠ auto-stop
    act(() => store().setPlaying(false)); // stop the loop before teardown
  });

  it('reverse playback (JKL playRate −1) auto-stops at 0', async () => {
    renderAppShell({ playing: true, playRate: -1, playhead: 1 });
    await waitFor(() => {
      expect(store().playing).toBe(false);
      expect(store().playhead).toBe(0);
    }, { timeout: 5000 });
  });
});

describe('F6 region cycling (spec 18 §11.5)', () => {
  const pressF6 = (shift = false) =>
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true, shiftKey: shift }),
      );
    });
  const activeRegionHolds = (testid: string) =>
    expect(document.activeElement).toContainElement(screen.getByTestId(testid));

  it('collapsed mixer: F6 walks the 6 focus stops in order and wraps', () => {
    renderAppShell(); // mixerState collapsed → the mixer is not a stop
    pressF6(); activeRegionHolds('shell-toolbar'); // from body → first region
    pressF6(); activeRegionHolds('shell-mediapool');
    pressF6(); activeRegionHolds('shell-viewer');
    pressF6(); activeRegionHolds('shell-inspector');
    pressF6(); activeRegionHolds('shell-timeline');
    pressF6(); activeRegionHolds('shell-dock'); // last stop
    pressF6(); activeRegionHolds('shell-toolbar'); // wraps to the first
  });

  it('Shift+F6 cycles backwards and wraps at both ends', () => {
    renderAppShell();
    pressF6(); pressF6(); pressF6(); // → viewer (stop 3)
    activeRegionHolds('shell-viewer');
    pressF6(true); activeRegionHolds('shell-mediapool'); // reverse
    pressF6(true); activeRegionHolds('shell-toolbar'); // reverse from stop 1
    pressF6(true); activeRegionHolds('shell-dock'); // wraps to the last stop
  });

  it('mixerState full: the mixer dock joins the cycle as the 7th stop (§11.5 amendment)', () => {
    renderAppShell({ mixerState: 'full' });
    pressF6(); pressF6(); pressF6(); pressF6(); pressF6(); pressF6(); // → dock
    activeRegionHolds('shell-dock');
    pressF6(); // stop 7 — the visible mixer dock region
    activeRegionHolds('mixer-dock-full');
    expect(document.activeElement).not.toContainElement(screen.getByTestId('shell-timeline'));
    // R13 fix: the deepest-region match now resolves the NESTED mixer stop
    // (it sits inside the timeline-block region) — F6 from the mixer wraps
    // to the toolbar instead of oscillating dock ↔ mixer.
    pressF6(); activeRegionHolds('shell-toolbar');
  });

  it('R23-WB (D-B1): color + scopes open — the ScopesDock takes the [6] stop the NodeGraphDock vacated', () => {
    renderAppShell({ page: 'color', colorScopesState: 'open' });
    // 7 stops: toolbar, left dock (the Stills gallery on color), viewer,
    // the COLOR inspector (the color page's rail — D-B2 kept the stop [2]
    // wrapper through the viewer swap), timeline block, app dock, then the
    // scopes console (the mixer is collapsed on color, D-B5 — never a stop)
    pressF6(); activeRegionHolds('shell-toolbar');
    pressF6(); activeRegionHolds('shell-stills');
    pressF6(); activeRegionHolds('shell-viewer');
    pressF6(); activeRegionHolds('shell-color-inspector');
    pressF6(); activeRegionHolds('shell-timeline-compact');
    pressF6(); activeRegionHolds('shell-dock');
    pressF6(); // stop 7 — the scopes dock (inherited slot [6])
    activeRegionHolds('shell-color-scopes');
    expect(document.activeElement).not.toContainElement(screen.getByTestId('shell-timeline-compact'));
    pressF6(); activeRegionHolds('shell-toolbar'); // wraps
  });
});

describe('keyboard multi-delete confirm (spec 18 §6.4 — R13 parity with the clip-menu path)', () => {
  it('Delete with a >=5 selection opens the confirm dialog; confirm deletes, cancel keeps', async () => {
    renderAppShell({ selection: ['el-1', 'el-2', 'el-3', 'el-4', 'el-5', 'el-6'] });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Delete 6 clips?');
    // danger dialog → cancel-focused (R13 fix), nothing deleted yet
    expect(store().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-main')!.elements).toHaveLength(4);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    const main = store().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-main')!;
    expect(main.elements).toHaveLength(0); // el-1..el-4 deleted (unlocked)
    expect(store().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-overlay-1')!.elements).toHaveLength(0);
    expect(store().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-audio-1')!.elements).toHaveLength(0);
    expect(store().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-audio-2')!.elements).toHaveLength(1); // locked — el-7 survives
  });
});

describe('app dock cheat-sheet button (spec 16 §7.3 entry point)', () => {
  it('the dock Keyboard button opens the cheat-sheet modal (store flag + DOM)', async () => {
    const user = userEvent.setup();
    renderAppShellWithCheatSheet();
    expect(screen.queryByTestId('shell-cheatsheet')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keyboard cheat sheet' }));
    expect(store().cheatOpen).toBe(true);
    expect(screen.getByTestId('shell-cheatsheet')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Keyboard cheat sheet' })).toBeInTheDocument();
  });
});

describe('splitter keyboard resize (R14 — the keyStep implementation finally pinned)', () => {
  it('inspector seam: ArrowLeft widens the rail by 8px/step, ArrowRight narrows it; dbl-click reset stays', () => {
    renderAppShell();
    const sep = seamBefore('shell-inspector');
    expect(store().inspectorW).toBe(340);
    // keyboard grammar: ←/→ = ±8px per press (Shift ×4 = 32px) — spec 18 §3.2
    fireEvent.keyDown(sep, { key: 'ArrowLeft' });
    expect(store().inspectorW).toBe(348);
    fireEvent.keyDown(sep, { key: 'ArrowLeft', shiftKey: true });
    expect(store().inspectorW).toBe(380);
    fireEvent.keyDown(sep, { key: 'ArrowRight' });
    expect(store().inspectorW).toBe(372);
  });

  it('media-pool seam: ArrowRight widens the pool by 8px/step', () => {
    renderAppShell();
    const sep = seamBefore('shell-viewer');
    expect(store().mediaW).toBe(280);
    fireEvent.keyDown(sep, { key: 'ArrowRight' });
    expect(store().mediaW).toBe(288);
  });
});

describe('R19 rail routing: marker / caption selection swaps the inspector (AppShell seam)', () => {
  it('a selected marker swaps the rail for the embedded MarkerInspector; Done returns to the clip inspector', async () => {
    const user = userEvent.setup();
    renderAppShell({ selection: [], selectedMarkerId: 'mk-2' });
    expect(screen.getByTestId('shell-marker-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-inspector')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('shell-marker-inspector-done'));
    expect(store().selectedMarkerId).toBe(null);
    expect(screen.getByTestId('shell-inspector')).toBeInTheDocument();
  });

  it('a single caption-track selection swaps the rail for the CaptionInspector; clip selection returns', async () => {
    const user = userEvent.setup();
    renderAppShell({ selection: ['cap-3'] });
    expect(screen.getByTestId('shell-caption-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-inspector')).not.toBeInTheDocument();
    // selecting a VIDEO clip clears the caption rail via the store's selection-domain swap
    await user.click(screen.getByTestId('clip-el-1'));
    expect(screen.getByTestId('shell-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-caption-inspector')).not.toBeInTheDocument();
  });
});

/* ---------- R23-WC (DESIGN-R23 D-C2 + Part IX ruling 10, #99): the
   channel-selected rail law. A focused mixer strip (stripFocus) + NO clip
   selection routes the right rail to the ChannelEditor on ANY page; the
   priority is clip selection (the edit domain) > strip focus > page default,
   and every ACTIVE selection domain (marker / caption / FX object / track)
   outranks a carried focus. ---------- */
describe('R23-WC D-C2 (#99): the channel-selected rail law', () => {
  it('clicking a strip with no clip selected routes the EDIT rail to the ChannelEditor — no "clip not selected" complaint', async () => {
    const user = userEvent.setup();
    renderAppShell({ mixerState: 'full', selection: [] });
    // nothing live yet: the edit page's default rail (Inspector) shows
    expect(screen.getByTestId('shell-inspector')).toBeInTheDocument();
    await user.click(screen.getByTestId('mixer-strip-A2'));
    expect(store().stripFocus).toBe('tr-audio-2');
    expect(screen.getByTestId('shell-channel-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-inspector')).not.toBeInTheDocument();
    // the #99 death: the editor's CLIP section is HIDDEN (no empty hole), the
    // focused channel's TRACK section is the content
    expect(screen.queryByTestId('shell-channel-editor-state-noclip')).toBeNull();
    expect(screen.getByText('BGM')).toBeInTheDocument(); // A2's role chip
  });

  it('priority: a clip selection outranks the strip focus (the edit domain wins)', () => {
    renderAppShell({ mixerState: 'full', selection: ['el-6'], stripFocus: 'tr-audio-2' });
    expect(screen.getByTestId('shell-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-channel-editor')).not.toBeInTheDocument();
    // the clip deselects → the branch takes over (clip selection > focus)
    act(() => { useUi.setState({ selection: [] }); });
    expect(screen.getByTestId('shell-channel-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-inspector')).not.toBeInTheDocument();
  });

  it('R23-FIX R-a RE-PIN — the FX page rail WINS over a carried strip focus (page rails outrank a focus that page owns no toggle for)', () => {
    /* R-a (review-sweep): the chain is marker/caption → page rails →
       channelRailLive → Inspector, so a carried stripFocus no longer swaps
       the FX page's rail (the old ruling-10 test pinned the prior order —
       the page's own surface now answers; the #99 case still holds on the
       EDIT page, which has no page rail). */
    renderAppShell({ page: 'fx', fxMode: true, selection: [], stripFocus: 'tr-audio-1' });
    expect(screen.getByTestId('shell-fxinspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-channel-editor')).not.toBeInTheDocument();
    // the focus is still LIVE in the store — returning to EDIT routes it
    act(() => { useUi.setState({ page: 'edit' }); });
    expect(screen.getByTestId('shell-channel-editor')).toBeInTheDocument();
  });

  it('R23-FIX R-a RE-PIN — the COLOR page rail wins over a carried focus too; a clip selection keeps it (priority law)', () => {
    renderAppShell({ page: 'color', selection: [], stripFocus: 'tr-audio-1' });
    expect(screen.getByTestId('shell-color-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-channel-editor')).not.toBeInTheDocument();
    // clip selection keeps the page's own rail (unchanged law)
    act(() => { useUi.setState({ selection: ['el-1'] }); });
    expect(screen.getByTestId('shell-color-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-channel-editor')).not.toBeInTheDocument();
  });

  it('an ACTIVE marker selection outranks a carried strip focus (the R19 rail law preserved)', () => {
    renderAppShell({ selection: [], selectedMarkerId: 'mk-2', stripFocus: 'tr-audio-1' });
    expect(screen.getByTestId('shell-marker-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-channel-editor')).not.toBeInTheDocument();
  });

  it('a stale stripFocus id (no audio track in the active scene) never fires the branch', () => {
    renderAppShell({ selection: [], stripFocus: 'tr-audio-404' });
    expect(screen.getByTestId('shell-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-channel-editor')).not.toBeInTheDocument();
  });
});

/* ---------- R23-FIX (review-sweep): the R-a rail hoist + the R-c left-dock
   table mount + the R-b FX density + the scene-switch marker clear —
   the review round's new shell laws, pinned at the composition level ---------- */

describe('R23-FIX R-a: marker/caption rails hoist above the page rails', () => {
  it('the marker rail is reachable on the COLOR page (the old chain buried it under the page default)', () => {
    renderAppShell({ page: 'color', selection: [], selectedMarkerId: 'mk-2' });
    expect(screen.getByTestId('shell-marker-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-color-inspector')).not.toBeInTheDocument();
    // Done exits the domain → the page default returns
    fireEvent.click(screen.getByTestId('shell-marker-inspector-done'));
    expect(screen.getByTestId('shell-color-inspector')).toBeInTheDocument();
  });

  it('the marker rail is reachable on the FX page too (an ACTIVE selection is newer intent than the page default)', () => {
    renderAppShell({ page: 'fx', fxMode: true, selection: [], selectedMarkerId: 'mk-2' });
    expect(screen.getByTestId('shell-marker-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-fxinspector')).not.toBeInTheDocument();
  });

  it('the caption rail hoists on color: a single caption-track selection swaps the rail there', () => {
    renderAppShell({ page: 'color', selection: ['cap-3'] });
    expect(screen.getByTestId('shell-caption-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-color-inspector')).not.toBeInTheDocument();
  });

  it('the page default still owns the rail when no domain is live (the hoist changes nothing else)', () => {
    renderAppShell({ page: 'color', selection: [], selectedMarkerId: null });
    expect(screen.getByTestId('shell-color-inspector')).toBeInTheDocument();
    document.querySelectorAll('body > [data-appshell-host]').forEach((el) => el.remove());
    renderAppShell({ page: 'fx', fxMode: true, selection: [] });
    expect(screen.getByTestId('shell-fxinspector')).toBeInTheDocument();
  });
});

describe('R23-FIX R-c: the left-dock slot is table-driven (audio + fx own it)', () => {
  it('the AUDIO slot mounts the SoundLibrary with the pool flag OFF (gatedByPool: false)', () => {
    renderAppShell({ page: 'audio', panels: { mediaPool: false, effects: false, inspector: true } });
    expect(screen.getByTestId('shell-soundlibrary')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-mediapool')).not.toBeInTheDocument();
  });

  it('the FX slot mounts the FxBrowser with the pool flag OFF', () => {
    renderAppShell({ page: 'fx', fxMode: true, panels: { mediaPool: false, effects: false, inspector: true } });
    expect(screen.getByTestId('shell-fxbrowser')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-mediapool')).not.toBeInTheDocument();
  });

  it('the Toolbar2 left toggle is DOM-absent on audio + fx (the slot is unconditional — no toggle to lie)', () => {
    for (const p of ['audio', 'fx', 'deliver'] as const) {
      renderAppShell({ page: p, ...(p === 'fx' ? { fxMode: true } : {}) });
      expect(screen.queryByTestId('shell-toolbar-btn-mediapool')).toBeNull();
      document.querySelectorAll('body > [data-appshell-host]').forEach((el) => el.remove());
    }
    // edit keeps the gated toggle (pinned above; the pool flag gates there)
    renderAppShell({ page: 'edit', panels: { mediaPool: false, effects: false, inspector: true } });
    expect(screen.queryByTestId('shell-mediapool')).not.toBeInTheDocument(); // gated OFF
  });

  it('edit + color stay gated by the pool flag exactly as before', () => {
    for (const p of ['edit', 'color'] as const) {
      renderAppShell({ page: p, panels: { mediaPool: false, effects: false, inspector: true } });
      expect(screen.queryByTestId('shell-mediapool')).not.toBeInTheDocument();
      expect(screen.queryByTestId('shell-stills')).not.toBeInTheDocument();
      document.querySelectorAll('body > [data-appshell-host]').forEach((el) => el.remove());
      renderAppShell({ page: p, panels: { mediaPool: true, effects: false, inspector: true } });
      expect(p === 'edit'
        ? screen.getByTestId('shell-mediapool')
        : screen.getByTestId('shell-stills')).toBeInTheDocument();
      document.querySelectorAll('body > [data-appshell-host]').forEach((el) => el.remove());
    }
  });
});

describe('R23-FIX R-b: the FX page forces the full Timeline', () => {
  it("fx + the user's 'on' override STILL resolves full tracks (the resolver wins over the session word on fx)", () => {
    renderAppShell({ page: 'fx', fxMode: true, timelineCompact: 'on' });
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline-compact')).not.toBeInTheDocument();
    // and the density toggle is DOM-absent there (no control claims the override)
    expect(screen.queryByTestId('shell-timeline-toolbar-btn-density')).toBeNull();
  });
});

describe('R23-FIX item 2: the scene switch clears the marker domain — the rail is never blank', () => {
  it('selecting a marker, then switching scenes, returns the rail to the page default (no stale blank MarkerInspector)', async () => {
    const user = userEvent.setup();
    renderAppShell({ selection: [], selectedMarkerId: 'mk-2' });
    expect(screen.getByTestId('shell-marker-inspector')).toBeInTheDocument();
    await user.click(screen.getByTestId('shell-scene-tab-sc-2'));
    expect(store().activeSceneId).toBe('sc-2');
    expect(store().selectedMarkerId).toBe(null); // the 7th clear-site law
    expect(screen.queryByTestId('shell-marker-inspector')).not.toBeInTheDocument();
    expect(screen.getByTestId('shell-inspector')).toBeInTheDocument(); // honest default, never blank
  });
});

describe('R23-FIX R5-P3#5: the F6 guard', () => {
  it('F6 never steals focus from a text field (INPUT/SELECT/TEXTAREA/contentEditable)', () => {
    renderAppShell();
    const field = screen.getByLabelText('Search media'); // the pool's search input
    field.focus();
    // a real browser dispatches keydown on the FOCUSED element — it bubbles
    // to the window listener; the guard reads e.target (the field)
    fireEvent.keyDown(field, { key: 'F6', bubbles: true, cancelable: true });
    expect(document.activeElement).toBe(field);
  });

  it('F6 with a modifier passes through (no preventDefault on OS/browser chords)', () => {
    renderAppShell();
    const chord = new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true, metaKey: true });
    fireEvent(window, chord);
    expect(chord.defaultPrevented).toBe(false);
    // plain F6 still cycles (the normative rung)
    fireEvent(window, new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true }));
    expect(document.activeElement?.className).toContain('shell-region');
  });
});
