/* AppShell — spec 18 §3 region-structure integration. Renders the real shell
   (renderShell provider stack) inside a 1280×800 host and asserts DOM
   STRUCTURE only — jsdom has no layout, so no pixel geometry. Pins: the §3
   region stack (toolbar / mainbody / timeline block / status strip / dock),
   the §4.8 page-dock right-rail swap, the side-by-side mixer dock (design
   doc v2.2 §4), panel toggles from the toolbar, and the inspector tab bar.
   Boot states are set directly through the store patch — ResizeObserver-
   dependent compact behavior is never simulated via resize. */

import { describe, expect, it, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './AppShell';
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

  it('timeline block: 4 track-header lanes, all 7 fixture clips, TC readout, crossfade marker', () => {
    renderAppShell();
    for (const trackId of ['tr-overlay-1', 'tr-main', 'tr-audio-1', 'tr-audio-2']) {
      expect(screen.getByTestId(`shell-track-header-${trackId}`)).toBeInTheDocument();
    }
    for (const elId of ['el-1', 'el-2', 'el-3', 'el-4', 'el-5', 'el-6', 'el-7']) {
      expect(screen.getByTestId(`clip-${elId}`)).toBeInTheDocument();
    }
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
