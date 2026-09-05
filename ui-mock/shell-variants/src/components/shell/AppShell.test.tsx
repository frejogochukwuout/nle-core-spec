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

  it('app dock exposes exactly the four pages with Edit current (§4.8)', () => {
    renderAppShell();
    const dock = screen.getByTestId('shell-dock');
    for (const page of ['edit', 'color', 'audio', 'deliver']) {
      expect(screen.getByTestId(`shell-dock-page-${page}`)).toBeInTheDocument();
    }
    expect(within(dock).getByRole('button', { name: 'Edit' })).toHaveAttribute('aria-current', 'page');
    expect(within(dock).queryByRole('button', { name: 'Color' })).not.toHaveAttribute('aria-current');
  });

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
    expect(screen.queryByTestId('mixer-dock-bridge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mixer-dock-full')).not.toBeInTheDocument();
  });

  it('mixerState=full: the full dock renders SIDE BY SIDE with the timeline lanes (both in DOM)', () => {
    renderAppShell({ mixerState: 'full' });
    const timeline = screen.getByTestId('shell-timeline');
    const dock = screen.getByTestId('mixer-dock-full');
    expect(timeline).toBeInTheDocument();
    expect(dock).toBeInTheDocument();
    // same flex row: the dock lives inside the timeline block's parent, after it
    expect(timeline.parentElement).toContainElement(dock);
    expect(timeline.compareDocumentPosition(dock)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    // strips: one per audio track (A1, A2) + aux returns + master
    expect(screen.getByTestId('mixer-strip-A1')).toBeInTheDocument();
    expect(screen.getByTestId('mixer-strip-A2')).toBeInTheDocument();
    expect(screen.getByTestId('mixer-strip-aux-a1')).toBeInTheDocument();
    expect(screen.getByTestId('mixer-strip-aux-a2')).toBeInTheDocument();
    expect(screen.getByTestId('mixer-strip-master')).toBeInTheDocument();
  });

  it('mixerState=bridge: the 44px meter-bridge rail with per-track vertical meters', () => {
    renderAppShell({ mixerState: 'bridge' });
    expect(screen.getByTestId('mixer-dock-bridge')).toBeInTheDocument();
    expect(screen.queryByTestId('mixer-dock-full')).not.toBeInTheDocument();
    expect(screen.getByTestId('bridge-A1')).toBeInTheDocument();
    expect(screen.getByTestId('bridge-A2')).toBeInTheDocument();
    // lanes still present beside the rail
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
  });
});

describe('page switching via the AppDock (spec 18 §4.8)', () => {
  it('Edit → Color swaps the right rail: ColorPage in, Inspector out (same rail width)', async () => {
    const user = userEvent.setup();
    renderAppShell();
    expect(screen.getByTestId('shell-inspector')).toBeInTheDocument();
    await user.click(screen.getByTestId('shell-dock-page-color'));
    expect(store().page).toBe('color');
    expect(screen.getByTestId('shell-color')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-inspector')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Color' })).toHaveAttribute('aria-current', 'page');
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
    await user.click(screen.getByTestId('shell-dock-page-edit'));
    expect(store().page).toBe('edit');
    expect(screen.getByTestId('shell-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-deliver')).not.toBeInTheDocument();
  });
});

describe('inspector tab bar + toolbar panel toggles', () => {
  it('clicking an inspector tab commits inspectorTab in the store', async () => {
    const user = userEvent.setup();
    renderAppShell();
    const tabs = screen.getByRole('tablist', { name: 'Inspector tabs' });
    await user.click(within(tabs).getByTestId('shell-inspector-tab-effects'));
    expect(store().inspectorTab).toBe('effects');
    expect(within(tabs).getByTestId('shell-inspector-tab-effects')).toHaveAttribute('aria-selected', 'true');
    expect(within(tabs).getByTestId('shell-inspector-tab-video')).toHaveAttribute('aria-selected', 'false');
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

  it('toolbar Effects toggle mounts the Effects library region (§4.1 mock)', async () => {
    const user = userEvent.setup();
    renderAppShell();
    expect(screen.queryByTestId('shell-effects')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('shell-toolbar-btn-effects'));
    expect(store().panels.effects).toBe(true);
    const effects = screen.getByTestId('shell-effects');
    expect(within(effects).getByText('Gaussian Blur')).toBeInTheDocument();
    expect(within(effects).getByText('Cross Dissolve')).toBeInTheDocument();
  });

  it('effect rows are drag sources: dragStart writes the fixed x-nle-effect payload (R14 wiring)', async () => {
    const user = userEvent.setup();
    renderAppShell();
    await user.click(screen.getByTestId('shell-toolbar-btn-effects'));
    const row = screen.getByTestId('shell-effects-row-gaussian-blur');
    expect(row).toHaveAttribute('draggable', 'true');
    // jsdom has no DataTransfer — a recording stub pins the contract payload
    const dt = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(row, { dataTransfer: dt });
    expect(dt.setData).toHaveBeenCalledWith(
      'application/x-nle-effect',
      JSON.stringify({ name: 'Gaussian Blur', cat: 'Blur' }),
    );
    expect(dt.effectAllowed).toBe('copy');
    expect(dt.dropEffect).toBe('copy');
  });

  it('clicking an effect row answers with the drag-to-clip toast (pointer fallback, R14)', async () => {
    const user = userEvent.setup();
    renderAppShell();
    await user.click(screen.getByTestId('shell-toolbar-btn-effects'));
    await user.click(screen.getByTestId('shell-effects-row-vignette'));
    expect(store().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Add Vignette',
      detail: 'drag the row onto a timeline clip to apply (mock drag-to-clip, spec 15 §5.4); the Inspector Effects tab carries the param UI',
    });
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
