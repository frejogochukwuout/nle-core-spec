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
import { useUi, pageTimelineViewFor } from '../../state/useUiStore';
import { useDeliverView } from '../../state/deliverViewStore';

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
  it('Edit → Color: the R23-WB composition — viewer dominant, inspector = color tabs, full timeline + Stills dock (issues #90–#97; RE-PINNED R25-W6-A: color owns a NOT-compact default now)', async () => {
    const user = userEvent.setup();
    renderAppShell();
    expect(screen.getByTestId('shell-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    await user.click(screen.getByTestId('shell-dock-page-color'));
    expect(store().page).toBe('color');
    /* RE-PIN (R25-W6-A / th_mtzp94ms — the per-page memory law SUPERSEDES the
       D-B3 auto heuristic): color boots the FULL Timeline (its own default —
       the W6-A pin "Color shows its own default (not compact)"); the strip
       is an explicit per-page choice (pinned in the W6 density law below) */
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline-compact')).not.toBeInTheDocument();
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

  it('the R25-W3 console row: the TAB STRIP [Timeline|Nodes|Scopes] — the Toolbar2 buttons activate their tab, the under-viewer pane is GONE (#th_mtzokuem/th_mtzoi7vr — supersedes R24-W2/#68)', async () => {
    const user = userEvent.setup();
    renderAppShell({ mixerState: 'full' });
    expect(screen.getByTestId('mixer-dock-full')).toBeInTheDocument(); // edit page: side by side
    await user.click(screen.getByTestId('shell-dock-page-color'));
    // D-B5/#92 (the #73 reversal): entering color COLLAPSES the mixer — the
    // dock does not render there, and its toggle is DOM-absent
    expect(store().mixerState).toBe('collapsed');
    expect(screen.queryByTestId('mixer-dock-full')).not.toBeInTheDocument();
    /* the console-row TAB STRIP renders on color (26px, the house tab
       grammar): [Timeline | Nodes | Scopes], Timeline the default — the
       console row is exactly the pre-W3 layout while it is active.
       RE-PIN (R25-W6-A): the Timeline tab carries the FULL Timeline on
       color's default (the strip is a per-page choice now) */
    const strip = screen.getByTestId('shell-console-tabs');
    expect(strip).toBeInTheDocument();
    expect(screen.getByTestId('shell-console-tab-timeline')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('shell-console-tab-nodes')).toBeInTheDocument();
    expect(screen.getByTestId('shell-console-tab-scopes')).toBeInTheDocument();
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    /* RE-PIN (R25-W3/A2 — the R24-W2 scopes law is DEAD): the old pin
       opened the ~160px pane UNDER THE VIEWER via colorScopesState; the
       under-viewer pane is DELETED (the R24-#68 placement superseded by
       the reviewer's "same space, a thin tab" ruling) — the Scopes button
       now ACTIVATES the console-row Scopes TAB. */
    await user.click(screen.getByTestId('shell-toolbar-btn-scopes'));
    expect(store().consoleTab).toBe('scopes');
    expect(screen.getByTestId('shell-toolbar-btn-scopes')).toHaveAttribute('aria-pressed', 'true');
    // the deletion pin: the under-viewer pane testid is GONE at every level
    expect(screen.queryByTestId('shell-color-scopes-pane')).not.toBeInTheDocument();
    // the ACTIVE tab's panel takes the row: the dock mounts, the timeline
    // hides (the reviewer's "it takes the same space" ruling)
    expect(screen.getByTestId('shell-color-scopes')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-scopes-console')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline')).toBeNull();
    expect(screen.getByTestId('shell-viewer')).toBeInTheDocument(); // region [2] is viewer-led, always
    expect(screen.getByTestId('shell-color-scopes-tab-waveform')).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByTestId('shell-color-scopes-tab-vectorscope'));
    expect(screen.getByTestId('shell-color-scope-vectorscope')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-color-scope-waveform')).toBeNull();
    // the tab flip is view-state: no undo history is ever minted
    const history = store().past.length;
    await user.click(screen.getByTestId('shell-console-tab-timeline'));
    expect(store().past.length).toBe(history);
    // back on the Timeline tab the console row is EXACTLY the pre-W3 layout
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-color-scopes')).toBeNull();
    // the nodes console: the toggle mounts the graph as the console row's
    // NODES TAB (A2-R1's "never the viewer swap" carries over) — the header
    // names the grade target, × returns to the Timeline tab; the VIEWER
    // never leaves region [2]
    await user.click(screen.getByTestId('shell-toolbar-btn-nodes'));
    const nv = screen.getByTestId('shell-color-nodeviewer');
    expect(nv).toBeInTheDocument();
    expect(nv).toHaveClass('min-w-[480px]');
    expect(nv).toHaveClass('flex-1');
    expect(screen.getByTestId('shell-color-nodegraph')).toBeInTheDocument();
    expect(screen.getByTestId('shell-color-nodeviewer-target')).toHaveTextContent('Marina interview');
    expect(screen.getByTestId('shell-viewer')).toBeInTheDocument(); // #67: the preview stays live while grading
    expect(screen.queryByTestId('shell-timeline')).toBeNull(); // the tab panel takes the row
    await user.click(screen.getByTestId('shell-color-nodeviewer-close'));
    expect(screen.queryByTestId('shell-color-nodeviewer')).toBeNull();
    expect(screen.getByTestId('shell-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument(); // × returned to the Timeline tab
    // leaving color restores the standard timeline + resets the console tab
    await user.click(screen.getByTestId('shell-dock-page-edit'));
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline-compact')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shell-color-nodeviewer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shell-color-scopes-pane')).not.toBeInTheDocument();
    expect(store().consoleTab).toBe('timeline'); // the setPage exit law
    /* RE-PIN (R25-W5): the strip now mounts on color AND deliver (the W5
       grammar — the deliver page's Export tab); THIS assertion lands on the
       EDIT page where the strip is still absent (a lone Timeline tab answers
       nothing — the no-strip law carries for every non-owning page). */
    expect(screen.queryByTestId('shell-console-tabs')).toBeNull(); // edit: no strip (color/deliver own it)
    // the color page's own strip law: no Export tab there (W5 changed the
    // LIST per page, not the color trio)
    expect(screen.queryByTestId('shell-console-tab-export')).toBeNull();
  });

  it('A2-R1 → R25-W3: the node console keeps an F6 stop — slot [6] as the console row\'s NODES TAB (the center region [2] stays VIEWER-led)', () => {
    /* RE-PIN (R25-W3/A2): the old boot patched colorNodesDock (the retired
       side-by-side slot gate); the graph mounts through the console TAB. */
    renderAppShell({ page: 'color', consoleTab: 'nodes' });
    expect(screen.getByTestId('shell-viewer')).toBeInTheDocument(); // the swap is dead — the viewer stays
    // three F6s walk toolbar → left dock → the CENTER region; the third stop
    // is region [2] hosting the VIEWER (the graph never takes it — D-B2 died)
    for (let i = 0; i < 3; i++) {
      fireEvent(window, new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true }));
    }
    expect(document.activeElement?.contains(screen.getByTestId('shell-viewer'))).toBe(true);
    expect(document.activeElement?.contains(screen.getByTestId('shell-color-nodeviewer'))).toBe(false);
    // three more walk inspector → timeline → dock; the 7th lands on the node
    // console's own slot [6] (single-writer, an off dock leaves no stop)
    for (let i = 0; i < 4; i++) {
      fireEvent(window, new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true }));
    }
    expect(document.activeElement?.contains(screen.getByTestId('shell-color-nodeviewer'))).toBe(true);
    // the Nodes tab hides the timeline (the tab panel takes the row — R25-W3;
    // RE-PIN R25-W6-A: the Timeline tab's content is the FULL Timeline on
    // color's default now — the hiding assertion follows it)
    expect(screen.queryByTestId('shell-timeline')).toBeNull();
    expect(screen.queryByTestId('shell-timeline-compact')).toBeNull();
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
    /* RE-PIN (R25-W6-A — th_mtzp94ms): deliver boots the FULL Timeline now
       (its own per-page default; the R23-WF D-F1 auto-strip + the 50%
       rebalance are superseded by the per-page memory law — the strip is an
       explicit remembered choice, pinned in the W6 density law below); the
       export range stays readable in the W5 Export console tab */
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline-compact')).not.toBeInTheDocument();
    expect(document.querySelector('.mainbody')).toHaveStyle({ height: '40%' });
    await user.click(screen.getByTestId('shell-dock-page-edit'));
    expect(store().page).toBe('edit');
    expect(screen.getByTestId('shell-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-deliver')).not.toBeInTheDocument();
  });
});

describe('R23-WB (D-B3, #94) → R24-W1 → R25-W6 (DESIGN-R25 §1 R3+R5 / §3 W6-A+W6-C): the per-page timeline density law', () => {
  const mainbody = () => document.querySelector('.mainbody') as HTMLElement;
  const mainbodyH = () => mainbody().style.height;
  /* R24-W1 (A3-R4): the standalone density button is RETIRED — density
     drives through the ViewOptionsPopover now. R25-W6-C: the binary
     checkbox became a FOUR-OPTION menuitemradio group (off / video /
     audio / all — the reviewer's hybrid scopes); the group KEEPS the menu
     open, so repeat flips never re-open. */
  const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
    if (!screen.queryByTestId('shell-menu-tl-view-options')) {
      await user.click(screen.getByTestId('shell-timeline-toolbar-btn-view-options'));
    }
    return screen.getByTestId('shell-menu-tl-view-options');
  };
  const scopeRadio = (id: 'off' | 'video' | 'audio' | 'all') =>
    screen.getByTestId(`shell-menu-tl-view-options-compact-${id}`);
  const setScope = async (user: ReturnType<typeof userEvent.setup>, id: 'off' | 'video' | 'audio' | 'all') => {
    await openMenu(user);
    await user.click(scopeRadio(id));
  };

  it('RE-PIN (W6-A): color boots the FULL Timeline at 40% — the D-B3 auto-strip default is superseded; the "All" radio is the explicit strip (+ the 55% law it carries)', async () => {
    const user = userEvent.setup();
    renderAppShell();
    await user.click(screen.getByTestId('shell-dock-page-color'));
    // the W6-A pin: Color's own default is NOT compact
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(mainbodyH()).toBe('40%');
    await openMenu(user);
    expect(scopeRadio('off')).toHaveAttribute('aria-checked', 'true');
    expect(scopeRadio('all')).toHaveAttribute('aria-checked', 'false');
    // the strip is one radio away: 'all' mounts it + the 55% tall-viewer default
    await user.click(scopeRadio('all'));
    expect(store().pageTimelineView.color.compact).toBe('all');
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument();
    expect(mainbodyH()).toBe('55%');
    // and back: 'off' restores the full tracks + the 40% lane-room default
    await user.click(scopeRadio('off'));
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(mainbodyH()).toBe('40%');
  });

  it('ruling 11 rides the strip either way: the user-dragged mainBodyH ALWAYS wins over the density default (the mainBodyUserSet law)', async () => {
    const user = userEvent.setup();
    renderAppShell({ page: 'color', mainBodyH: 500, mainBodyUserSet: true });
    expect(mainbodyH()).toBe('500px');
    await setScope(user, 'all');
    await setScope(user, 'off');
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(mainbodyH()).toBe('500px'); // no density flip may steal the user's height
  });

  it('compact is reachable on EDIT too (#94 — "allow to be used everywhere"): the All radio mounts the strip, edit keeps the 40% default', async () => {
    const user = userEvent.setup();
    renderAppShell();
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    await openMenu(user);
    // edit's own default is 'off' — the radio honestly reads it
    expect(scopeRadio('off')).toHaveAttribute('aria-checked', 'true');
    await user.click(scopeRadio('all'));
    expect(store().pageTimelineView.edit.compact).toBe('all');
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline')).not.toBeInTheDocument();
    // the edit-page mainbody default stays 40% either way (only color carries the 55% compact law)
    expect(mainbodyH()).toBe('40%');
  });

  it('RE-PIN (W6-A / th_mtzp94ms — the reviewer\'s exact ask): the compact choice is remembered PER PAGE — edit\'s "All" never leaks into color, and switching back RESTORES it', async () => {
    const user = userEvent.setup();
    renderAppShell();
    await setScope(user, 'all');
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument();
    // edit → color: color shows its OWN default (not compact — full tracks)
    await user.click(screen.getByTestId('shell-dock-page-color'));
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline-compact')).not.toBeInTheDocument();
    expect(store().pageTimelineView.color.compact).toBe('off'); // color's entry untouched
    // color → edit: the strip is RESTORED (the memory round-trip)
    await user.click(screen.getByTestId('shell-dock-page-edit'));
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument();
    expect(store().pageTimelineView.edit.compact).toBe('all');
  });

  it('W6-C (th_mtzors21): the AUDIO page defaults to compact-video — the full Timeline mounts (not the strip) and the radio honestly reads "Video"', async () => {
    const user = userEvent.setup();
    renderAppShell();
    await user.click(screen.getByTestId('shell-dock-page-audio'));
    expect(store().page).toBe('audio');
    expect(store().audioLaneBoost).toBe(true); // the dock tab enters focus
    // audio tracks NOT compacted → the FULL Timeline (the hybrid scope, not the strip)
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline-compact')).not.toBeInTheDocument();
    await openMenu(user);
    expect(scopeRadio('video')).toHaveAttribute('aria-checked', 'true');
  });
});

/* ---------- R23-WF (DESIGN-R23 D-F1, #107) → R24-W4 (A3-R7) → R25-W6
   (W6-A): the deliver composition ----------
   RE-PINNED (R25-W6-A / th_mtzp94ms): the D-F1 auto-strip default is
   SUPERSEDED by the per-page memory law — deliver boots the FULL Timeline
   now; the strip (+ its coexistence head stack: the 22px read-only ruler +
   the 32px RANGE BAND below it, 54px, #71's A3-R7 law) + the 50% mainbody
   rebalance are the page's REMEMBERED choice (the "All" radio). The band's
   own grammar is pinned in TimelineCompact.test. */
describe('R23-WF (DESIGN-R23 D-F1, #107) → R25-W6: the deliver composition', () => {
  const mainbody = () => document.querySelector('.mainbody') as HTMLElement;
  const mainbodyH = () => mainbody().style.height;
  const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
    if (!screen.queryByTestId('shell-menu-tl-view-options')) {
      await user.click(screen.getByTestId('shell-timeline-toolbar-btn-view-options'));
    }
    return screen.getByTestId('shell-menu-tl-view-options-compact-all');
  };

  it('RE-PIN (W6-A): deliver boots the FULL Timeline at 40%; the "All" radio brings the strip + the ruler+BAND coexistence head row + the 50% mainbody default', async () => {
    const user = userEvent.setup();
    renderAppShell({ page: 'deliver' });
    expect(screen.getByTestId('shell-deliver')).toBeInTheDocument();
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(mainbodyH()).toBe('40%');
    await user.click(await openMenu(user));
    expect(store().pageTimelineView.deliver.compact).toBe('all');
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument();
    expect(screen.getByTestId('shell-deliver-range-band')).toBeInTheDocument();
    // A3-R7 coexistence: the read-only ruler is UNCONDITIONAL (never replaced)
    expect(screen.getByTestId('shell-timeline-compact-ruler')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline')).not.toBeInTheDocument();
    expect(mainbodyH()).toBe('50%');
    // back to 'off': the band goes WITH the strip (ruling 11, deliver-shaped)
    await user.click(screen.getByTestId('shell-menu-tl-view-options-compact-off'));
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-deliver-range-band')).not.toBeInTheDocument();
    expect(mainbodyH()).toBe('40%');
  });

  it('the user-dragged mainBodyH ALWAYS wins on deliver too (the mainBodyUserSet law)', async () => {
    const user = userEvent.setup();
    renderAppShell({ page: 'deliver', mainBodyH: 500, mainBodyUserSet: true });
    expect(mainbodyH()).toBe('500px');
    await user.click(await openMenu(user));
    expect(mainbodyH()).toBe('500px'); // no density flip may steal the user's height
  });

  it('the band is deliver-only: compact forced ON on edit keeps the ruler (no band leaks to other pages)', () => {
    renderAppShell({ page: 'edit', pageTimelineView: pageTimelineViewFor('edit', { compact: 'all' }) });
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument();
    expect(screen.getByTestId('shell-timeline-compact-ruler')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-deliver-range-band')).not.toBeInTheDocument();
    expect(mainbodyH()).toBe('40%'); // edit never carries a page default
  });
});

/* ---------- R25-W5 (DESIGN-R25 §1 R18 / §3 W5; issue th_mtzp4arw "a
   separate panel the same place we do mixer console etc. … it is not
   inspection"): the deliver console row — the export summary's new home.
   The W3 tab grammar extends to deliver: the strip = [Timeline | Export];
   the ACTIVE tab's panel takes the row (the scopes/nodes precedent); the
   deliver inspector (right column) keeps INSPECTION-family content alone. */
describe('R25-W5 (th_mtzp4arw): the deliver console row — the Export tab', () => {
  it('the strip renders [Timeline | Export] on deliver; the console row is the timeline by default', () => {
    act(() => { useDeliverView.getState().resetDeliverView(); }); // pristine queue fixture
    renderAppShell({ page: 'deliver' });
    const strip = screen.getByTestId('shell-console-tabs');
    expect(strip).toBeInTheDocument();
    expect(screen.getByTestId('shell-console-tab-timeline')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('shell-console-tab-export')).toHaveAttribute('aria-selected', 'false');
    // the deliver pair carries NO color tabs (nodes/scopes are color-only)
    expect(screen.queryByTestId('shell-console-tab-nodes')).toBeNull();
    expect(screen.queryByTestId('shell-console-tab-scopes')).toBeNull();
    // RE-PIN (R25-W6-A): the default row = the FULL timeline (deliver's own
    // per-page default); the band rides the strip (the "All" radio — pinned
    // in the deliver composition describe above)
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-deliver-export-console')).toBeNull();
  });

  it('activating the Export tab SWAPS the console panel: the summary testids appear in the CONSOLE ROW, absent from the right column', async () => {
    const user = userEvent.setup();
    act(() => { useDeliverView.getState().resetDeliverView(); });
    renderAppShell({ page: 'deliver' });
    await user.click(screen.getByTestId('shell-console-tab-export'));
    expect(store().consoleTab).toBe('export');
    // the ACTIVE tab's panel takes the row: the export console mounts, the timeline hides
    expect(screen.getByTestId('shell-deliver-export-console')).toBeInTheDocument();
    expect(screen.getByTestId('shell-deliver-export-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-timeline')).toBeNull();
    expect(screen.queryByTestId('shell-timeline-compact')).toBeNull();
    expect(screen.queryByTestId('shell-deliver-range-band')).toBeNull();
    // the mainbody is untouched (the deliver page keeps its three regions)
    expect(screen.getByTestId('shell-deliver')).toBeInTheDocument();
    expect(screen.getByTestId('shell-deliver-preview')).toBeInTheDocument();
    /* th_mtzp4arw's ruling pinned at the DOM: the summary card is NOT in the
       right column anymore — the settings panel holds inspection-family
       content only (no summary heading, no range block). RE-PIN (R25-F3 D2):
       the scene name legitimately returns to the settings column via the
       metadata card's DERIVED title (project — scene, exportJsonFileName's
       pair) — the old "no scene name" exclusion died with the derivation;
       the summary-CONTENT exclusion (heading + range block) is the law. */
    const settings = screen.getByTestId('shell-deliver-settings');
    expect(settings.contains(screen.getByTestId('shell-deliver-export-summary'))).toBe(false);
    expect(settings.textContent).not.toContain('Export summary');
    expect(settings.contains(screen.getByTestId('shell-deliver-range'))).toBe(false);
    expect(settings.textContent).toContain('Render settings'); // the inspector half stays
    // the console panel DOES carry the moved content (verbatim rows + range)
    const panel = screen.getByTestId('shell-deliver-export-console');
    expect(panel.textContent).toContain('Export summary');
    expect(panel.textContent).toContain('Rough Cut v3');
    expect(panel.contains(screen.getByTestId('shell-deliver-range'))).toBe(true);
    // the read-only queue status strip (the W5 "what else makes sense")
    expect(screen.getByTestId('shell-deliver-export-queue-state')).toHaveTextContent('idle');
    // back on the Timeline tab the row is the timeline again (RE-PIN R25-W6-A:
    // the full timeline — deliver's own default)
    await user.click(screen.getByTestId('shell-console-tab-timeline'));
    expect(screen.queryByTestId('shell-deliver-export-console')).toBeNull();
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
  });

  it('the strip is DELIVER+COLOR only: edit/audio/fx render no strip (a lone Timeline tab answers nothing)', () => {
    for (const p of ['edit', 'audio', 'fx'] as const) {
      renderAppShell({ page: p, ...(p === 'fx' ? { fxMode: true } : {}) });
      expect(screen.queryByTestId('shell-console-tabs')).toBeNull();
      expect(screen.queryByTestId('shell-console-tab-export')).toBeNull();
      document.querySelectorAll('body > [data-appshell-host]').forEach((el) => el.remove());
    }
  });

  it('leaving deliver resets the console tab (the W5-widened setPage exit law)', async () => {
    const user = userEvent.setup();
    renderAppShell({ page: 'deliver', consoleTab: 'export' });
    expect(screen.getByTestId('shell-deliver-export-console')).toBeInTheDocument();
    await user.click(screen.getByTestId('shell-dock-page-color'));
    // deliver → color: the 'export' tab died with the page (color's own trio)
    expect(store().consoleTab).toBe('timeline');
    expect(screen.queryByTestId('shell-deliver-export-console')).toBeNull();
    expect(screen.getByTestId('shell-console-tab-timeline')).toHaveAttribute('aria-selected', 'true');
    // and the reverse route: color's 'scopes' carried into deliver resets too
    await user.click(screen.getByTestId('shell-console-tab-scopes'));
    expect(store().consoleTab).toBe('scopes');
    await user.click(screen.getByTestId('shell-dock-page-deliver'));
    expect(store().consoleTab).toBe('timeline'); // the color exit law, deliver-bound
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

  it("R25-W3 (A2, supersedes R24-W2): color + the SCOPES TAB — the console panel adds NO F6 stop (region [4] covers it); the Nodes tab takes slot [6]", () => {
    /* RE-PIN (R25-W3/A2 — the R24-W2 boot patched colorScopesState 'open',
       which mounted the under-viewer pane; that pane is DELETED — the
       scopes now ride the console row's SCOPES TAB). */
    renderAppShell({ page: 'color', consoleTab: 'scopes' });
    // 6 stops: toolbar, left dock (the Gallery on color), the viewer region
    // (viewer-led, alone — no pane below it anymore), the color inspector,
    // timeline block (its console row currently shows the SCOPES panel —
    // covered by region [4], never its own stop), app dock (the mixer is
    // collapsed on color, D-B5 — never a stop)
    pressF6(); activeRegionHolds('shell-toolbar');
    pressF6(); activeRegionHolds('shell-stills');
    pressF6(); activeRegionHolds('shell-viewer');
    expect(screen.queryByTestId('shell-color-scopes-pane')).toBeNull(); // the under-viewer pane is GONE
    expect(screen.getByTestId('shell-color-scopes')).toBeInTheDocument(); // the dock rides the console row
    pressF6(); activeRegionHolds('shell-color-inspector');
    pressF6(); activeRegionHolds('shell-color-scopes'); // region [4] — the deepest match is the scopes console
    pressF6(); activeRegionHolds('shell-dock');
    pressF6(); activeRegionHolds('shell-toolbar'); // wraps at SIX — no scopes stop ever
    // switching to the Nodes tab adds slot [6] (single-writer — the graph
    // takes the stop; the scopes never had one)
    act(() => { useUi.setState({ consoleTab: 'nodes' }); });
    pressF6(); activeRegionHolds('shell-stills');
    pressF6(); activeRegionHolds('shell-viewer');
    pressF6(); activeRegionHolds('shell-color-inspector');
    pressF6(); activeRegionHolds('shell-color-nodeviewer'); // region [4] again — the nodes tab
    pressF6(); activeRegionHolds('shell-dock');
    pressF6(); // stop 7 — the node graph console (slot [6])
    activeRegionHolds('shell-color-nodeviewer');
    expect(screen.queryByTestId('shell-timeline-compact')).toBeNull();
    pressF6(); activeRegionHolds('shell-toolbar'); // wraps
    // cleanup: the shared store leaves the tab at 'timeline' for later tests
    act(() => { useUi.setState({ consoleTab: 'timeline' }); });
  });

  /* R25-F4 (AA1 — the P1): every F6 region stop is a NAMED landmark. 7 of 8
     stops had no role="region"/aria-label — a reachable tabIndex stop that
     announces as nothing but "region". The honest name follows the slot's
     live content (the left-dock table's own label; the rail-priority chain
     for slot [3]). */
  it('R25-F4 (AA1): every F6 stop carries role="region" + a non-empty aria-label (the honest name per slot)', () => {
    renderAppShell({ mixerState: 'full' }); // the mixer joins as the 7th stop
    // walk the whole cycle — every focused stop is a NAMED region
    for (let i = 0; i < 7; i++) {
      pressF6();
      const stop = document.activeElement as HTMLElement;
      expect(stop, `F6 stop ${i + 1}`).toHaveAttribute('role', 'region');
      expect(stop.getAttribute('aria-label') ?? '', `F6 stop ${i + 1} label`).not.toBe('');
    }
    // the specific honest names (region wrapper = the nearest .shell-region
    // ancestor of each panel's root testid)
    const regionOf = (testid: string) => screen.getByTestId(testid).closest('.shell-region')!;
    expect(regionOf('shell-toolbar')).toHaveAttribute('aria-label', 'Toolbar');
    expect(regionOf('shell-mediapool')).toHaveAttribute('aria-label', 'Media Pool'); // the dock table's own label
    expect(regionOf('shell-viewer')).toHaveAttribute('aria-label', 'Viewer');
    expect(regionOf('shell-inspector')).toHaveAttribute('aria-label', 'Inspector');
    expect(regionOf('shell-timeline')).toHaveAttribute('aria-label', 'Timeline');
    expect(regionOf('mixer-dock-full')).toHaveAttribute('aria-label', 'Mixer console');
    expect(regionOf('shell-dock')).toHaveAttribute('aria-label', 'App dock');
    // slot [6] — the color nodes console (the 8th stop: had the label, never
    // the role; AA1 adds it)
    act(() => { useUi.setState({ page: 'color', consoleTab: 'nodes' }); });
    const node = screen.getByTestId('shell-color-nodeviewer');
    expect(node).toHaveAttribute('role', 'region');
    expect(node).toHaveAttribute('aria-label', 'Node graph console');
    // the status strip is a named region too (not an F6 stop — the same law)
    expect(screen.getByTestId('shell-status')).toHaveAttribute('role', 'region');
    expect(screen.getByTestId('shell-status')).toHaveAttribute('aria-label', 'Status strip');
    // cleanup: back to edit for the siblings below
    act(() => { useUi.setState({ page: 'edit', consoleTab: 'timeline' }); });
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

  it('R24-W5b (F1 P2): plain F6 does NOT escape the open cheat sheet — the region cycler never fires under the modal', () => {
    renderAppShellWithCheatSheet();
    // open the sheet through the real dock entry
    fireEvent.click(screen.getByRole('button', { name: 'Keyboard cheat sheet' }));
    const sheet = screen.getByTestId('shell-cheatsheet');
    expect(sheet).toHaveAttribute('aria-modal', 'true');
    // focus a NON-field element inside the sheet — the search input would be
    // masked by the AppShell F6 handler's text-field guard; the close button
    // is the honest probe for F1's escape (focus used to land on a
    // background shell region while the modal stayed open)
    const close = screen.getByLabelText('Close cheat sheet');
    close.focus();
    fireEvent.keyDown(close, { key: 'F6', bubbles: true, cancelable: true });
    // the sheet owns the keyboard while open: focus stays inside the dialog…
    expect(document.activeElement).toBe(close);
    expect(sheet).toContainElement(document.activeElement as HTMLElement);
    // …the sheet is still open (F6 consumed, not a close)…
    expect(store().cheatOpen).toBe(true);
    // …and Esc still closes through the capture listener (the existing law
    // survives the new all-keys shield)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(store().cheatOpen).toBe(false);
    expect(screen.queryByTestId('shell-cheatsheet')).not.toBeInTheDocument();
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

/* ---------- R24-W5d (F5-P2, DESIGN-R24 §3 W5d): the splitter keyboard is
   REACHABLE. role=separator + onKeyDown had NO tabIndex — live tab skipped
   the seams, a click left focus on <body> and Arrow* hit nothing while
   AppShell.test's direct keyDown dispatches kept jsdom green (the F1/F2
   live-vs-jsdom class). jsdom cannot pin the real TAB ORDER; it CAN pin the
   wiring: the tab stops exist, focus() lands on the seam, and the keydown
   routed at the FOCUSED element fires the store write. ---------- */
describe('R24-W5d: splitter tabIndex + focus wiring (the F5-P2 fix)', () => {
  it('every seam separator is a TAB STOP (tabIndex 0) — the §11 ladder can reach them', () => {
    renderAppShell();
    const seps = screen.getAllByRole('separator');
    expect(seps.length).toBeGreaterThanOrEqual(3); // pool / inspector / timeline H seams
    for (const sep of seps) expect(sep).toHaveAttribute('tabindex', '0');
  });

  it('the focused inspector seam answers ArrowRight routed AT FOCUS (not only a direct dispatch)', () => {
    renderAppShell();
    const sep = seamBefore('shell-inspector');
    sep.focus();
    expect(document.activeElement).toBe(sep); // jsdom CAN pin focus placement
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowRight' });
    expect(store().inspectorW).toBe(332); // 340 − 8 — the focused seam's handler ran
    // the focus-ring grammar: the seam line carries the house accent while
    // focused (the global :focus-visible outline + the group accent class)
    expect(sep.innerHTML).toContain('group-focus-visible:bg-accent');
  });
});

/* ---------- R24-W5d (F5-P3, the setMainBodyH twin law — R23-WB-REV fixed
   the H seam's reset flag, this V seam's didn't): the inspector dbl-click
   reset un-pins inspectorWUserSet so the page-aware default honestly
   resumes. ---------- */
describe('R24-W5d: the inspector seam dbl-click reset un-pins inspectorWUserSet', () => {
  it('a drag pins the flag; the dbl-click reset restores the default width AND clears the flag (edit: 340)', () => {
    renderAppShell();
    const sep = seamBefore('shell-inspector');
    fireEvent.pointerDown(sep, { pointerId: 1, button: 0, clientX: 600 });
    fireEvent.pointerMove(sep, { pointerId: 1, buttons: 1, clientX: 540 });
    expect(store().inspectorW).toBe(400);
    expect(store().inspectorWUserSet).toBe(true); // the drag pinned it
    fireEvent.doubleClick(sep);
    expect(store().inspectorW).toBe(340); // the edit structural default
    expect(store().inspectorWUserSet).toBe(false); // THE FIX: the flag no longer pins the width
  });

  it('on COLOR the reset restores the 420 page default (the flag cleared, not just the width)', () => {
    renderAppShell({ page: 'color' });
    act(() => { store().setInspectorW(500); }); // the real writer pins the flag
    expect(store().inspectorWUserSet).toBe(true);
    // the color rail is the ColorInspector (shell-color-inspector) — the seam
    // still precedes the same wrapper
    fireEvent.doubleClick(seamBefore('shell-color-inspector'));
    expect(store().inspectorWUserSet).toBe(false);
    expect(store().inspectorW).toBe(420); // the color page-aware default resumes
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

describe('R23-FIX R-a → R25-F1-C5: marker/caption rails hoist above the page rails (NON-COLOR pages only)', () => {
  /* RE-PINNED (R25-F1-C5, audit C5): the hoist used to fire on EVERY page —
     on color, selecting a caption/marker clip UNMOUNTED the ColorInspector
     (the grading surface) while the Gallery + the whole color console kept
     writing grades to that caption's record: a live writer with a deleted
     surface. The hoist is now GATED to non-color pages; on color the rail
     stays the ColorInspector (the selection domains still update — the
     timeline keeps the highlight and the inspector grades the selected
     clip). The fx-page and edit-page pins below keep the R-a law where it
     was honest. */
  it('R25-F1-C5: on the COLOR page a marker selection does NOT steal the rail — the ColorInspector stays', () => {
    renderAppShell({ page: 'color', selection: [], selectedMarkerId: 'mk-2' });
    expect(screen.getByTestId('shell-color-inspector')).toBeInTheDocument(); // the grading surface stays
    expect(screen.queryByTestId('shell-marker-inspector')).not.toBeInTheDocument();
    // the marker domain itself still holds (the timeline keeps the highlight)
    expect(store().selectedMarkerId).toBe('mk-2');
  });

  it('R25-F1-C5: on the COLOR page a caption clip selection does NOT steal the rail — the ColorInspector stays (the Gallery keeps a surface to write to)', () => {
    renderAppShell({ page: 'color', selection: ['cap-3'] });
    expect(screen.getByTestId('shell-color-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-caption-inspector')).not.toBeInTheDocument();
    // the caption selection domain is live — only the RAIL swap is color-gated
    expect(store().selection).toEqual(['cap-3']);
    // the ColorInspector even retargets to the caption clip (captions are
    // gradable targets — the rail's own grade target resolver)
    expect(screen.getByTestId('shell-color-inspector-chip')).toHaveTextContent('Sub 3');
  });

  it('R25-F1-C5 (the real click path): clicking a caption clip on color keeps shell-color-inspector mounted', async () => {
    const user = userEvent.setup();
    renderAppShell({ page: 'color', selection: [], colorGradeTarget: 'clip' });
    // the color page boots the full Timeline — the caption lane's clip is clickable
    await user.click(screen.getByTestId('clip-cap-3'));
    expect(store().selection).toEqual(['cap-3']); // the caption IS selected…
    expect(screen.getByTestId('shell-color-inspector')).toBeInTheDocument(); // …and the grading surface never unmounted
    expect(screen.queryByTestId('shell-caption-inspector')).not.toBeInTheDocument();
  });

  it('the marker rail is reachable on the FX page (an ACTIVE selection is newer intent than the page default)', () => {
    renderAppShell({ page: 'fx', fxMode: true, selection: [], selectedMarkerId: 'mk-2' });
    expect(screen.getByTestId('shell-marker-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-fxinspector')).not.toBeInTheDocument();
  });

  it('the caption rail hoists on the EDIT page (the R-a law where it was honest)', () => {
    renderAppShell({ page: 'edit', selection: ['cap-3'] });
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
  it("fx + a patched 'all' entry STILL resolves full tracks (the resolver wins over the page's entry on fx)", () => {
    renderAppShell({ page: 'fx', fxMode: true, pageTimelineView: pageTimelineViewFor('fx', { compact: 'all' }) });
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

/* ---------- W1 (DESIGN-R25 §3, R1+R2 — the insert/edit rescue): the full
   shell in SOURCE mode at a NARROW mock width. jsdom measures no layout, so
   the ladder is driven the MixerDock way — a recording ResizeObserver + a
   stubbed rect on the transport row and the edit bar; jsdom's silent default
   stub = un-measured = the FULL rendering (every other AppShell pin rides
   that law). PARTITION NOTE: this block is the wave contract's required
   full-shell pin — AppShell.test.tsx is the pin's home (the wave partition
   otherwise touches only Viewer/SourceEditBar/SourceRangeBar/useUiStore +
   their tests; documented in the commit message). ---------- */
describe('W1 (R1+R2): the full shell, source mode, narrow width — all 7 mode buttons + the transport stay visible', () => {
  /** Recording ResizeObserver — captures callbacks so the test fires them
   *  with stubbed rects (the MixerDock pattern; the default stub never fires). */
  function withRecordingRO(fn: (fire: () => void) => ReturnType<typeof renderAppShell>) {
    const cbs: ResizeObserverCallback[] = [];
    const Orig = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) { cbs.push(cb); }
      observe() { /* no-op */ }
      unobserve() { /* no-op */ }
      disconnect() { /* no-op */ }
    } as unknown as typeof ResizeObserver;
    try {
      const utils = fn(() => { act(() => { cbs.forEach((cb) => cb([], {} as ResizeObserver)); }); });
      return utils;
    } finally {
      globalThis.ResizeObserver = Orig;
    }
  }
  const fakeRect = (width: number) =>
    ({ top: 0, left: 0, right: width, bottom: 32, width, height: 32, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

  it('the reviewer\'s narrow-canvas band (row 620px / bar ~370px): the bar drops to icon-only, all 7 mode buttons + 5 transport + 3 trim buttons render, the readouts degrade — nothing hides a BUTTON', () => {
    let fire = () => { /* assigned below */ };
    const utils = withRecordingRO((f) => {
      fire = f;
      return renderAppShell({ viewerMode: 'source', sourceMediaId: 'm-02', selection: [] });
    });
    try {
      const row = screen.getByTestId('shell-viewer-transport');
      const bar = screen.getByTestId('shell-source-edit-bar');
      // the reviewer's band: the row measures 620px, the bar's share ~370px
      row.getBoundingClientRect = () => fakeRect(620);
      bar.getBoundingClientRect = () => fakeRect(370);
      act(() => fire());
      // the bar's OWN ladder: icon-only (the names live in aria-label)
      expect(bar).toHaveAttribute('data-labels', 'icons');
      // ALL SEVEN mode buttons render — the R1 defect (a 0px starved bar)
      // is dead: 7 buttons, each with its accessible name + the hit floor
      const modeBtns = bar.querySelectorAll('button');
      expect(modeBtns).toHaveLength(7);
      for (const b of modeBtns) {
        expect(b.getAttribute('aria-label')).toBeTruthy();
        expect(b.className).toContain('!h-[24px]');
      }
      // the W1-B transport: 5 buttons + the play button, all in the row
      expect(within(screen.getByTestId('shell-source-transport')).getAllByRole('button')).toHaveLength(5);
      expect(screen.getByTestId('shell-viewer-btn-play')).toBeInTheDocument();
      // the trim cluster keeps its 3 icons (degrades SECOND = it stays)
      expect(within(screen.getByTestId('shell-source-trim-controls')).getAllByRole('button')).toHaveLength(3);
      // the readouts degrade FIRST — the duration readout hides below its
      // floor (620 < 720). RE-PIN (R25-F2/E11): the DEAD data-tip is dropped
      // (display:none can't be hovered); the full text survives in the SCRUB
      // STRIP's aria-label (playhead + in/out + of-duration)
      const readout = screen.getByTestId('shell-viewer-source-duration');
      expect(readout).toHaveAttribute('hidden');
      expect(readout.getAttribute('data-tip')).toBeNull(); // E11: the dead fallback is gone
      expect(screen.getByTestId('shell-viewer-scrub')).toHaveAttribute(
        'aria-label',
        expect.stringContaining('of 00:01:35:05'), // the strip's label carries the duration
      );
      // the strip is the real scrub strip (playhead + handles + dim law)
      expect(screen.getByTestId('shell-source-playhead')).toHaveAttribute('role', 'slider');
      expect(screen.getByTestId('shell-source-range-in')).toBeInTheDocument();
    } finally {
      utils.unmount();
    }
  });
});
