/* ConsoleTabs — R25-W3 (DESIGN-R25 §1 R11/R12 / §3 W3 / §6 A2; issues
 * th_mtzokuem "panel or under inspector?", th_mtzoi7vr "console multi-tab
 * next to timeline"). The console-row TAB STRIP pins:
 * - the strip renders the [Timeline | Nodes | Scopes] tabs, Timeline the
 *   default (the AppShell-level color-only mount is pinned in
 *   AppShell.test — the strip's own mount is the color page);
 * - clicking a tab writes consoleTab through the store seam;
 * - a tab flip is VIEW STATE — never a withHistory entry;
 * - the ScopesDock renders under the 'scopes' tab even at its legacy
 *   colorScopesState 'off' (the tab is the app's mount gate; the state
 *   stays the solo/story law — the OR-gate in ScopesDock);
 * - the ARIA tabs roving pattern (one tab stop, ←/→ wrap). */

import { describe, expect, it, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ConsoleTabs } from './ConsoleTabs';
import { ScopesDock } from './ScopesDock';
import { useUi } from '../../../state/useUiStore';

const S = () => useUi.getState();

const boot = (patch: Record<string, unknown> = {}) => {
  useUi.setState((s) => ({
    page: 'color',
    scenes: s.scenes,
    selection: ['el-2'],
    mockGrades: {},
    past: [],
    future: [],
    colorScopesState: 'off',
    consoleTab: 'timeline',
    ...patch,
  }));
  return render(<ConsoleTabs />);
};

beforeEach(() => {
  useUi.setState({ toasts: [] });
});

describe('ConsoleTabs — the console-row tab strip (R25-W3 / A2)', () => {
  it('renders the three tabs; Timeline is the default (always present)', () => {
    boot();
    expect(screen.getByTestId('shell-console-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('shell-console-tab-timeline')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('shell-console-tab-nodes')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('shell-console-tab-scopes')).toHaveAttribute('aria-selected', 'false');
    // the roving law: exactly the active tab is the tab stop
    expect(screen.getByTestId('shell-console-tab-timeline')).toHaveAttribute('tabindex', '0');
    expect(screen.getByTestId('shell-console-tab-nodes')).toHaveAttribute('tabindex', '-1');
  });

  it('clicking a tab commits consoleTab through the store seam', () => {
    boot();
    fireEvent.click(screen.getByTestId('shell-console-tab-scopes'));
    expect(S().consoleTab).toBe('scopes');
    expect(screen.getByTestId('shell-console-tab-scopes')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('shell-console-tab-timeline')).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(screen.getByTestId('shell-console-tab-nodes'));
    expect(S().consoleTab).toBe('nodes');
    fireEvent.click(screen.getByTestId('shell-console-tab-timeline'));
    expect(S().consoleTab).toBe('timeline');
  });

  it('a tab flip is VIEW STATE — no withHistory entry is ever minted', () => {
    boot();
    const before = S().past.length;
    fireEvent.click(screen.getByTestId('shell-console-tab-scopes'));
    fireEvent.click(screen.getByTestId('shell-console-tab-nodes'));
    fireEvent.click(screen.getByTestId('shell-console-tab-timeline'));
    expect(S().past.length).toBe(before); // the sourceRanges law: view-state, plain set
    expect(S().future.length).toBe(0);
  });

  it('arrow roving: ←/→ move the tab stop + selection with wrap', () => {
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
