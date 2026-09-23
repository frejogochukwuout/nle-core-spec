/* ConsoleTabs — R25-W3 (DESIGN-R25 §1 R11/R12 / §3 W3 / §6 A2; issues
 * th_mtzokuem "panel or under inspector?", th_mtzoi7vr "console multi-tab
 * next to timeline") → R25-W5 (DESIGN-R25 §1 R18 / §3 W5; issue
 * th_mtzp4arw "a separate panel the same place we do mixer console etc.
 * … not inspection"). The console-row TAB STRIP pins:
 * - the strip's per-page grammar: color = [Timeline | Nodes | Scopes]
 *   (W3, unchanged — the color-page tab law), deliver = [Timeline |
 *   Export] (W5 — the export summary's new console-row home); the
 *   AppShell-level page-aware mount is pinned in AppShell.test;
 * - clicking a tab writes consoleTab through the store seam;
 * - a tab flip is VIEW STATE — never a withHistory entry;
 * - the ARIA tabs roving pattern (one tab stop, ←/→ wrap) — on the
 *   deliver pair too;
 * - standalone honesty: a stranded FOREIGN tab id (a color id on deliver)
 *   degrades to 'timeline' so exactly one tab stays selected (unreachable
 *   from the UI — the setPage exit law — but the strip never lies);
 * - the ScopesDock renders under the 'scopes' tab even at its legacy
 *   colorScopesState 'off' (the tab is the app's mount gate; the state
 *   stays the solo/story law — the OR-gate in ScopesDock). */

import { describe, expect, it, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ConsoleTabs } from './ConsoleTabs';
import { ScopesDock } from './ScopesDock';
import { useUi } from '../../../state/useUiStore';

const S = () => useUi.getState();

const boot = (patch: Record<string, unknown> = {}, page: 'color' | 'deliver' = 'color') => {
  useUi.setState((s) => ({
    page,
    scenes: s.scenes,
    selection: ['el-2'],
    mockGrades: {},
    past: [],
    future: [],
    colorScopesState: 'off',
    consoleTab: 'timeline',
    ...patch,
  }));
  return render(<ConsoleTabs page={page} />);
};

beforeEach(() => {
  useUi.setState({ toasts: [] });
});

describe('ConsoleTabs — the console-row tab strip (R25-W3 / A2; R25-W5 widens to deliver)', () => {
  it('COLOR (W3, unchanged): renders the three tabs; Timeline is the default (always present)', () => {
    boot();
    expect(screen.getByTestId('shell-console-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('shell-console-tab-timeline')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('shell-console-tab-nodes')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('shell-console-tab-scopes')).toHaveAttribute('aria-selected', 'false');
    // the color page's tab law: exactly THREE tabs, no Export
    expect(screen.queryByTestId('shell-console-tab-export')).toBeNull();
    // the roving law: exactly the active tab is the tab stop
    expect(screen.getByTestId('shell-console-tab-timeline')).toHaveAttribute('tabindex', '0');
    expect(screen.getByTestId('shell-console-tab-nodes')).toHaveAttribute('tabindex', '-1');
  });

  it('DELIVER (R25-W5 / th_mtzp4arw): renders the [Timeline | Export] pair; Timeline the default', () => {
    boot({}, 'deliver');
    expect(screen.getByTestId('shell-console-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('shell-console-tab-timeline')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('shell-console-tab-export')).toHaveAttribute('aria-selected', 'false');
    // the deliver pair: NO nodes/scopes tabs there (color-only panels)
    expect(screen.queryByTestId('shell-console-tab-nodes')).toBeNull();
    expect(screen.queryByTestId('shell-console-tab-scopes')).toBeNull();
    expect(screen.getByTestId('shell-console-tab-timeline')).toHaveAttribute('tabindex', '0');
    expect(screen.getByTestId('shell-console-tab-export')).toHaveAttribute('tabindex', '-1');
  });

  it('clicking a tab commits consoleTab through the store seam (both pages)', () => {
    const colorStrip = boot();
    fireEvent.click(screen.getByTestId('shell-console-tab-scopes'));
    expect(S().consoleTab).toBe('scopes');
    expect(screen.getByTestId('shell-console-tab-scopes')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('shell-console-tab-timeline')).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(screen.getByTestId('shell-console-tab-nodes'));
    expect(S().consoleTab).toBe('nodes');
    fireEvent.click(screen.getByTestId('shell-console-tab-timeline'));
    expect(S().consoleTab).toBe('timeline');
    colorStrip.unmount();
    // W5: the deliver strip's Export tab writes the SAME atom
    const deliverStrip = boot({ consoleTab: 'timeline' }, 'deliver');
    fireEvent.click(screen.getByTestId('shell-console-tab-export'));
    expect(S().consoleTab).toBe('export');
    expect(screen.getByTestId('shell-console-tab-export')).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByTestId('shell-console-tab-timeline'));
    expect(S().consoleTab).toBe('timeline');
    deliverStrip.unmount();
  });

  it('a tab flip is VIEW STATE — no withHistory entry is ever minted (export included)', () => {
    boot({}, 'deliver');
    const before = S().past.length;
    fireEvent.click(screen.getByTestId('shell-console-tab-export'));
    fireEvent.click(screen.getByTestId('shell-console-tab-timeline'));
    expect(S().consoleTab).toBe('timeline');
    expect(S().past.length).toBe(before); // the sourceRanges law: view-state, plain set
    expect(S().future.length).toBe(0);
  });

  it('arrow roving: ←/→ move the tab stop + selection with wrap (the color trio)', () => {
    boot();
    const timeline = screen.getByTestId('shell-console-tab-timeline');
    timeline.focus();
    fireEvent.keyDown(screen.getByTestId('shell-console-tabs'), { key: 'ArrowRight' });
    expect(S().consoleTab).toBe('nodes');
    expect(document.activeElement).toBe(screen.getByTestId('shell-console-tab-nodes'));
    fireEvent.keyDown(screen.getByTestId('shell-console-tabs'), { key: 'ArrowRight' });
    expect(S().consoleTab).toBe('scopes');
    fireEvent.keyDown(screen.getByTestId('shell-console-tabs'), { key: 'ArrowRight' });
    expect(S().consoleTab).toBe('timeline'); // wraps
    expect(document.activeElement).toBe(screen.getByTestId('shell-console-tab-timeline'));
    fireEvent.keyDown(screen.getByTestId('shell-console-tabs'), { key: 'ArrowLeft' });
    expect(S().consoleTab).toBe('scopes'); // wraps backwards
  });

  it('W5: arrow roving on the DELIVER pair — ←/→ toggle between Timeline and Export with wrap', () => {
    boot({}, 'deliver');
    screen.getByTestId('shell-console-tab-timeline').focus();
    fireEvent.keyDown(screen.getByTestId('shell-console-tabs'), { key: 'ArrowRight' });
    expect(S().consoleTab).toBe('export');
    expect(document.activeElement).toBe(screen.getByTestId('shell-console-tab-export'));
    fireEvent.keyDown(screen.getByTestId('shell-console-tabs'), { key: 'ArrowRight' });
    expect(S().consoleTab).toBe('timeline'); // wraps on the pair
    fireEvent.keyDown(screen.getByTestId('shell-console-tabs'), { key: 'ArrowLeft' });
    expect(S().consoleTab).toBe('export'); // wraps backwards
  });

  it('standalone honesty: a stranded COLOR tab id on deliver degrades to Timeline (exactly one selected tab)', () => {
    // unreachable from the UI (the setPage exit law) — a direct patch could
    // still strand one; the strip never renders a nothing-selected lie
    boot({ consoleTab: 'nodes' }, 'deliver');
    expect(screen.getByTestId('shell-console-tab-timeline')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('shell-console-tab-export')).toHaveAttribute('aria-selected', 'false');
  });

  it('the Scopes tab is the dock\'s app mount gate: ScopesDock renders under it even at the legacy state \'off\'', () => {
    boot();
    const dock = render(<ScopesDock />);
    expect(screen.queryByTestId('shell-color-scopes')).toBeNull(); // 'off' + timeline tab = the solo law holds
    act(() => { useUi.setState({ consoleTab: 'scopes' }); });
    expect(screen.getByTestId('shell-color-scopes')).toBeInTheDocument(); // the tab mounts it
    act(() => { useUi.setState({ consoleTab: 'timeline' }); });
    expect(screen.queryByTestId('shell-color-scopes')).toBeNull();
    dock.unmount();
  });
});
