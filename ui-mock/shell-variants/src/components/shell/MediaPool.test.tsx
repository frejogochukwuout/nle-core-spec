/* MediaPool — spec 18 §4.2 (v1.1) full contract: first-mount OPFS skeleton,
   pref persistence under the ONE localStorage key, 200 ms-debounced search +
   no-result state, 4-way sort × direction, grid/list view toggle, listbox
   multi-select semantics (click / ⌘-click / Shift-range + arrow-key, Space,
   Enter), the offline asset m-04 (§4.2 missing-asset state), the drag-ghost
   state machine, and the §4.9 context menu — ContextMenu.tsx has no hostless
   life, so its behavior (roles, roving arrows, disabled language, focus
   return, close-then-dispatch) is tested here through its MediaPool host.
   Real timers: the skeleton is a real 900 ms timer, like the shipped code. */

import { describe, expect, it, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MediaPool } from './MediaPool';
import { useUi } from '../../state/useUiStore';

const S = () => useUi.getState();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PREFS_KEY = 'nle-mock-pool-prefs';

/** render + wait out the 900 ms first-mount OPFS skeleton */
async function renderPool() {
  const utils = render(<MediaPool />);
  await act(async () => { await sleep(950); });
  return utils;
}

const cardByName = (name: string) => {
  const hit = screen.getAllByTestId('shell-mediapool-card').find((c) => c.textContent!.includes(name));
  if (!hit) throw new Error(`card ${name} not found`);
  return hit;
};

beforeEach(() => {
  window.localStorage.removeItem(PREFS_KEY); // extra safety for intra-file order
});

describe('MediaPool (spec 18 §4.2)', () => {
  /* ---- boot / skeleton / prefs ---- */

  it('first mount shows the OPFS skeleton, then the 8 fixture cards', async () => {
    render(<MediaPool />);
    expect(screen.getByTestId('shell-mediapool-state-loading')).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Media pool' })).toHaveAttribute('aria-busy', 'true');
    await act(async () => { await sleep(950); });
    expect(screen.queryByTestId('shell-mediapool-state-loading')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('shell-mediapool-card')).toHaveLength(8);
    expect(screen.getByRole('listbox', { name: 'Media pool' })).not.toHaveAttribute('aria-busy');
  });

  it('hydrates view/sort prefs from the ONE LS key while the store holds defaults', () => {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ mediaView: 'list', sortBy: 'duration', sortDir: 'desc' }));
    render(<MediaPool />);
    expect(S().mediaView).toBe('list');
    expect(S().sortBy).toBe('duration');
    expect(S().sortDir).toBe('desc');
    expect(screen.getByLabelText('List view')).toHaveAttribute('aria-pressed', 'true');
  });

  it('corrupt prefs JSON are ignored defensively (store defaults kept)', () => {
    window.localStorage.setItem(PREFS_KEY, '{not json');
    render(<MediaPool />);
    expect(S().mediaView).toBe('grid');
    expect(S().sortBy).toBe('name');
    expect(S().sortDir).toBe('asc');
  });

  /* ---- search ---- */

  it('search filters by name after the 200 ms debounce + live footer counts', async () => {
    await renderPool();
    fireEvent.change(screen.getByLabelText('Search media'), { target: { value: 'marina' } });
    await act(async () => { await sleep(240); });
    expect(S().search).toBe('marina'); // committed lowercased
    expect(screen.getAllByTestId('shell-mediapool-card')).toHaveLength(2);
    expect(screen.getByText(/2 clips · 1 selected · 3:10 total/)).toBeInTheDocument();
  });

  it('no-result state row; Clear search restores the full pool + store', async () => {
    await renderPool();
    fireEvent.change(screen.getByLabelText('Search media'), { target: { value: 'zzz-nothing' } });
    await act(async () => { await sleep(240); });
    expect(screen.getByTestId('shell-mediapool-state-noresult')).toBeInTheDocument();
    expect(screen.getByText(/No clips match "zzz-nothing"/)).toBeInTheDocument();
    // two clear affordances are live in this state: the header × (aria-label)
    // and the row's text button — click the row's one
    const clear = screen.getAllByRole('button', { name: 'Clear search' }).find((b) => b.textContent === 'Clear search')!;
    fireEvent.click(clear);
    expect(S().search).toBe('');
    expect(screen.getAllByTestId('shell-mediapool-card')).toHaveLength(8);
  });

  /* ---- sort + view ---- */

  it('sort select + direction button reorder the list and write the store', async () => {
    await renderPool();
    fireEvent.change(screen.getByLabelText('Sort media'), { target: { value: 'duration' } });
    expect(S().sortBy).toBe('duration');
    // asc: stills (duration null) sink → title_card first
    expect(screen.getAllByTestId('shell-mediapool-card')[0].textContent).toContain('title_card');
    fireEvent.click(screen.getByRole('button', { name: 'Sort ascending' }));
    expect(S().sortDir).toBe('desc');
    expect(screen.getByRole('button', { name: 'Sort descending' })).toBeInTheDocument();
    // desc: longest first — ocean_ambience (120 s)
    expect(screen.getAllByTestId('shell-mediapool-card')[0].textContent).toContain('ocean_ambience');
  });

  it('grid/list view toggle writes mediaView + aria-pressed', async () => {
    await renderPool();
    expect(screen.getByText('STILL')).toBeInTheDocument(); // grid duration badge on the still
    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    expect(S().mediaView).toBe('list');
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('STILL')).not.toBeInTheDocument(); // rows show '—' for stills
    fireEvent.click(screen.getByRole('button', { name: 'Grid view' }));
    expect(S().mediaView).toBe('grid');
    expect(screen.getByText('STILL')).toBeInTheDocument();
  });

  /* ---- selection semantics (§4.2 multi-select) ---- */

  it('click / ⌘-click / Shift-click selection semantics', async () => {
    await renderPool();
    fireEvent.click(cardByName('A012')); // flat name-asc order: m-01, m-03, m-02, m-07, m-06, m-05, m-08, m-04
    expect(S().mediaSelection).toEqual(['m-01']);
    expect(cardByName('A012')).toHaveAttribute('aria-selected', 'true');
    // Shift-click = range over the flat filtered order from the anchor
    fireEvent.click(cardByName('interview_marina.wav'), { shiftKey: true });
    expect(S().mediaSelection).toEqual(['m-01', 'm-03', 'm-02', 'm-07']); // items idx 0..3
    fireEvent.click(cardByName('sunset_timelapse'), { metaKey: true }); // ⌘-click = additive
    expect(S().mediaSelection).toHaveLength(5);
    // KNOWN QUIRK (report): the shift anchor is the last NON-SHIFT click (⌘-clicks
    // included), while the §4.2 header comment says "anchor = last single click".
    fireEvent.click(cardByName('ocean_ambience'), { shiftKey: true }); // anchor m-05 → idx 4..5
    expect(S().mediaSelection).toEqual(['m-06', 'm-05']);
  });

  it('listbox keyboard: arrows move activedescendant, Space toggles, Enter reveals', async () => {
    await renderPool();
    const region = screen.getByRole('listbox', { name: 'Media pool' });
    fireEvent.pointerDown(region); // roving focus: cards are not tab stops
    // boot mediaSelection ['m-02'] → active option m-02 (index 2 in name-asc order)
    expect(region).toHaveAttribute('aria-activedescendant', 'pool-opt-m-02');
    fireEvent.keyDown(region, { key: 'ArrowDown' });
    expect(region).toHaveAttribute('aria-activedescendant', 'pool-opt-m-07');
    fireEvent.keyDown(region, { key: ' ' });
    expect(S().mediaSelection).toEqual(['m-02', 'm-07']); // Space toggles the active option
    fireEvent.keyDown(region, { key: 'Enter' });
    expect(S().playhead).toBeCloseTo(8.6, 6); // reveal → el-7 (m-07) start 8.5 + 0.1
    expect(S().mediaSelection).toEqual(['m-07']);
  });

  it('double-click reveal seeks to the first clip using the asset', async () => {
    await renderPool();
    fireEvent.dblClick(cardByName('sunset_timelapse')); // m-05 backs el-4 at 24.0
    expect(S().mediaSelection).toEqual(['m-05']);
    expect(S().playhead).toBe(24.1);
  });

  /* ---- offline asset + footer ---- */

  it('offline asset m-04: warning badge + aria-live footer counts (§4.2)', async () => {
    await renderPool();
    expect(screen.getByText('Media offline')).toBeInTheDocument(); // grid-view badge
    // counted from the snapshot, never cached: 8 clips, boot selection m-02, 428.2 s total
    expect(screen.getByText(/8 clips · 1 selected · 7:08 total/)).toBeInTheDocument();
  });

  it('Import affordance explains the mock path as an info toast', async () => {
    await renderPool();
    fireEvent.click(screen.getByRole('button', { name: 'Import media' }));
    expect(S().toasts[0].kind).toBe('info');
    expect(S().toasts[0].title).toBe('Import media');
  });

  /* ---- drag ghost state machine (§4.2 v1.1) ---- */

  it('drag ghost: follows dragover while mediaDrag is live; dragend clears', async () => {
    await renderPool();
    const card = cardByName('A012');
    const dt = { setData: () => {}, setDragImage: () => {}, effectAllowed: '' };
    // jsdom has no DataTransfer — hand the React handler a minimal stub
    const start = new MouseEvent('dragstart', { bubbles: true, cancelable: true, clientX: 8, clientY: 9 });
    Object.defineProperty(start, 'dataTransfer', { value: dt });
    act(() => { card.dispatchEvent(start); });
    expect(S().mediaDrag).toEqual({ mediaId: 'm-01', overTrackId: null, allowed: false });
    const ghost = screen.getByTestId('pool-drag-ghost');
    expect(ghost).toBeInTheDocument();
    expect(ghost.style.left).toBe('22px'); // pointer + 14 px offset
    // ghost rides the dragover capture stream on window
    const over = new MouseEvent('dragover', { clientX: 100, clientY: 40 });
    act(() => { document.body.dispatchEvent(over); });
    expect(screen.getByTestId('pool-drag-ghost').style.left).toBe('114px');
    // dragend anywhere cancels the drag state (backstop to the card's own handler)
    act(() => { document.body.dispatchEvent(new MouseEvent('dragend', { bubbles: true })); });
    expect(S().mediaDrag).toBeNull();
    expect(screen.queryByTestId('pool-drag-ghost')).not.toBeInTheDocument();
  });

  /* ---- §4.9 context menu, tested through this host ---- */

  it('§4.9 right-click opens the media-pool menu, focus on the first enabled item', async () => {
    await renderPool();
    fireEvent.contextMenu(cardByName('A012'));
    const menu = screen.getByTestId('shell-menu-mediapool');
    expect(menu).toHaveAttribute('role', 'menu');
    expect(screen.getByTestId('shell-menu-mediapool-reveal')).toHaveFocus();
    // §9 disabled language: aria-disabled, not native disabled (tip still hovers)
    expect(screen.getByTestId('shell-menu-mediapool-moveto')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(screen.queryByTestId('shell-menu-mediapool')).not.toBeInTheDocument();
  });

  it('menu roving arrows skip disabled items; Tab dismisses (§4.9)', async () => {
    await renderPool();
    fireEvent.contextMenu(cardByName('A012'));
    const reveal = screen.getByTestId('shell-menu-mediapool-reveal');
    expect(reveal).toHaveFocus();
    fireEvent.keyDown(reveal, { key: 'ArrowDown' });
    expect(screen.getByTestId('shell-menu-mediapool-copy')).toHaveFocus();
    fireEvent.keyDown(screen.getByTestId('shell-menu-mediapool-copy'), { key: 'ArrowDown' });
    expect(screen.getByTestId('shell-menu-mediapool-remove')).toHaveFocus(); // moveto skipped
    fireEvent.keyDown(screen.getByTestId('shell-menu-mediapool-remove'), { key: 'Tab' });
    expect(screen.queryByTestId('shell-menu-mediapool')).not.toBeInTheDocument();
  });

  it('menu commands dispatch after close; the disabled row never dispatches', async () => {
    await renderPool();
    fireEvent.contextMenu(cardByName('A012'));
    fireEvent.click(screen.getByTestId('shell-menu-mediapool-copy'));
    // §4.9 order: close + focus back to opener FIRST, then run the command
    expect(screen.queryByTestId('shell-menu-mediapool')).not.toBeInTheDocument();
    expect(S().toasts[0].title).toContain('Copied "A012_C034_beach_wide.mp4"');
    fireEvent.contextMenu(cardByName('drone_launch'));
    fireEvent.click(screen.getByTestId('shell-menu-mediapool-moveto')); // aria-disabled
    expect(screen.getByTestId('shell-menu-mediapool')).toBeInTheDocument(); // stays open
    expect(S().toasts).toHaveLength(1); // nothing dispatched
    fireEvent.keyDown(screen.getByTestId('shell-menu-mediapool'), { key: 'Escape' });
  });

  it('§4.9 keyboard route: Shift+F10 opens the menu; Esc returns focus to the opener', async () => {
    await renderPool();
    const region = screen.getByRole('listbox', { name: 'Media pool' });
    act(() => { region.focus(); });
    fireEvent.keyDown(region, { key: 'F10', shiftKey: true });
    expect(screen.getByTestId('shell-menu-mediapool')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByTestId('shell-menu-mediapool-reveal'), { key: 'Escape' });
    expect(screen.queryByTestId('shell-menu-mediapool')).not.toBeInTheDocument();
    expect(region).toHaveFocus(); // §4.9: focus returns to the opener
  });

  it('Remove from pool: blocked while clips reference the asset, succeeds when unused', async () => {
    await renderPool();
    fireEvent.contextMenu(cardByName('A012')); // m-01 backs el-1
    fireEvent.click(screen.getByTestId('shell-menu-mediapool-remove'));
    expect(screen.queryByTestId('shell-menu-mediapool')).not.toBeInTheDocument();
    expect(S().toasts[0].kind).toBe('error');
    expect(S().toasts[0].title).toContain('In use by 1 clips');
    expect(screen.getAllByTestId('shell-mediapool-card')).toHaveLength(8); // not removed
    fireEvent.contextMenu(cardByName('title_card')); // m-08 is unused
    fireEvent.click(screen.getByTestId('shell-menu-mediapool-remove'));
    expect(S().toasts[1].kind).toBe('success');
    expect(screen.getAllByTestId('shell-mediapool-card')).toHaveLength(7); // pool-only removal
  });
});
