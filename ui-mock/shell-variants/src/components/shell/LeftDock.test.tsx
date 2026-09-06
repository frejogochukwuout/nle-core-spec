/* LeftDock — R19 th_mtoyt5fv ("use the same area as bin"): the left mediaW
   slot becomes ONE tabbed surface. Pinned here: the routing law (audio page
   → SoundLibrary; both panels on → tab bar; single-on → that panel alone;
   both off → nothing), the ARIA tabs pattern (roving tabindex, aria-selected,
   ←/→ switching), and the frozen effects drag contract copied from
   AppShell's panel (application/x-nle-effect JSON payload). */

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

describe('LeftDock (R19 th_mtoyt5fv — one tabbed surface in the bin slot)', () => {
  it('both panels on: tab bar with Media Pool | Effects, pool tab active by default', async () => {
    useUi.setState({ panels: { mediaPool: true, effects: true, inspector: true } });
    render(<LeftDock />);
    const dock = screen.getByTestId('shell-leftdock');
    expect(within(dock).getByRole('tablist', { name: 'Left dock' })).toBeInTheDocument();
    const poolTab = screen.getByTestId('shell-leftdock-tab-pool');
    const fxTab = screen.getByTestId('shell-leftdock-tab-effects');
    expect(poolTab).toHaveAttribute('aria-selected', 'true');
    expect(fxTab).toHaveAttribute('aria-selected', 'false');
    // the pool is mounted in the SAME slot (not a second strip beside it)
    expect(screen.getByTestId('shell-mediapool')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-effects')).toBeNull();
    await settle(); // drain the pool's boot timers
  });

  it('clicking the Effects tab swaps the surface; switching back restores the pool', async () => {
    useUi.setState({ panels: { mediaPool: true, effects: true, inspector: true } });
    render(<LeftDock />);
    fireEvent.click(screen.getByTestId('shell-leftdock-tab-effects'));
    expect(screen.getByTestId('shell-leftdock-tab-effects')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('shell-effects')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-mediapool')).toBeNull();
    fireEvent.click(screen.getByTestId('shell-leftdock-tab-pool'));
    expect(screen.getByTestId('shell-mediapool')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-effects')).toBeNull();
    await settle();
  });

  it('ARIA tabs: one tab stop, arrow keys switch, aria-selected follows', () => {
    useUi.setState({ panels: { mediaPool: true, effects: true, inspector: true } });
    render(<LeftDock />);
    const poolTab = screen.getByTestId('shell-leftdock-tab-pool');
    const fxTab = screen.getByTestId('shell-leftdock-tab-effects');
    expect(poolTab).toHaveAttribute('tabindex', '0');
    expect(fxTab).toHaveAttribute('tabindex', '-1');
    // → from the pool tab lands focus on the effects tab AND activates it
    fireEvent.keyDown(screen.getByRole('tablist', { name: 'Left dock' }), { key: 'ArrowRight' });
    expect(screen.getByTestId('shell-leftdock-tab-effects')).toHaveFocus();
    expect(screen.getByTestId('shell-leftdock-tab-effects')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('shell-effects')).toBeInTheDocument();
    // ← wraps back to the pool
    fireEvent.keyDown(screen.getByRole('tablist', { name: 'Left dock' }), { key: 'ArrowLeft' });
    expect(screen.getByTestId('shell-leftdock-tab-pool')).toHaveFocus();
    expect(screen.getByTestId('shell-leftdock-tab-pool')).toHaveAttribute('aria-selected', 'true');
  });

  it('single-on (pool only): NO tab bar — the pool renders alone (today\'s behavior)', async () => {
    useUi.setState({ panels: { mediaPool: true, effects: false, inspector: true } });
    render(<LeftDock />);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByTestId('shell-mediapool')).toBeInTheDocument();
    await settle();
  });

  it('single-on (effects only): the effects panel renders alone, no tab bar', () => {
    useUi.setState({ panels: { mediaPool: false, effects: true, inspector: true } });
    render(<LeftDock />);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByTestId('shell-effects')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-mediapool')).toBeNull();
  });

  it('audio page: the slot is the SoundLibrary (Fairlight-style left dock)', () => {
    useUi.setState({ page: 'audio', panels: { mediaPool: true, effects: true, inspector: true } });
    render(<LeftDock />);
    expect(screen.getByTestId('shell-soundlibrary')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByTestId('shell-mediapool')).toBeNull();
    expect(screen.queryByTestId('shell-effects')).toBeNull();
  });

  it('both panels off: the dock renders nothing', () => {
    useUi.setState({ panels: { mediaPool: false, effects: false, inspector: true } });
    const { container } = render(<LeftDock />);
    expect(container.firstChild).toBeNull();
  });

  it('copied effects panel keeps the frozen drag contract: dragStart writes the x-nle-effect payload', () => {
    useUi.setState({ panels: { mediaPool: false, effects: true, inspector: true } });
    render(<LeftDock />);
    const row = screen.getByTestId('shell-effects-row-gaussian-blur');
    const payload: string[] = [];
    const ev = new MouseEvent('dragstart', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'dataTransfer', {
      value: { setData: (t: string, v: string) => payload.push(t, v), effectAllowed: '', dropEffect: '' },
    });
    act(() => { row.dispatchEvent(ev); });
    // FIXED CONTRACT (spec 15 §5.4): the Clip drop target consumes this
    // exact MIME type + JSON shape — byte-identical to the AppShell original
    expect(payload).toContain('application/x-nle-effect');
    expect(JSON.parse(payload[1])).toEqual({ name: 'Gaussian Blur', cat: 'Blur' });
  });

  it('copied effects panel keeps the honest click fallback (R14 dual route)', () => {
    useUi.setState({ panels: { mediaPool: false, effects: true, inspector: true } });
    render(<LeftDock />);
    fireEvent.click(screen.getByTestId('shell-effects-row-vignette'));
    expect(S().toasts[0]).toMatchObject({ kind: 'info', title: 'Add Vignette' });
  });
});
