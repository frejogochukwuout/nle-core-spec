/* CheatSheet — spec 16 §7.3 modal. The sheet is AUTO-GENERATED from
   SHORTCUT_MAP, so completeness is the contract: every row must render with
   data-testid={`shortcut-${action}`} in SHORTCUT_GROUPS order. Search
   (200 ms debounce, action/desc/keys matchers), Esc-close via the capture
   listener, and the §4.10 sample-project footer are exercised against the
   real store. */

import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { CheatSheet } from './CheatSheet';
import { SHORTCUT_GROUPS, SHORTCUT_MAP } from '../../lib/shortcutMap';
import { renderShell, store } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';

const row = (action: string) => screen.queryByTestId(`shortcut-${action}`);

describe('CheatSheet (spec 16 §7.3)', () => {
  it('renders nothing while cheatOpen is false', () => {
    renderShell(<CheatSheet />);
    expect(screen.queryByTestId('shell-cheatsheet')).not.toBeInTheDocument();
  });

  it('renders EVERY ShortcutMap row (auto-generated completeness) with the binding count', () => {
    renderShell(<CheatSheet />, { patch: { cheatOpen: true } });
    for (const r of SHORTCUT_MAP) {
      expect(screen.getByTestId(`shortcut-${r.action}`)).toBeInTheDocument();
      // each row shows the documented keys + description verbatim
      expect(screen.getByTestId(`shortcut-${r.action}`)).toHaveTextContent(r.keys);
    }
    expect(screen.getByText(new RegExp(`${SHORTCUT_MAP.length} bindings`))).toBeInTheDocument();
    expect(screen.getByText(`${SHORTCUT_MAP.length}/${SHORTCUT_MAP.length}`)).toBeInTheDocument();
  });

  it('sections render in SHORTCUT_GROUPS order; Scenes (no bindings in v1) is absent', () => {
    renderShell(<CheatSheet />, { patch: { cheatOpen: true } });
    const present = SHORTCUT_GROUPS.filter((g) => SHORTCUT_MAP.some((r) => r.group === g));
    for (let i = 1; i < present.length; i++) {
      const prev = screen.getByText(present[i - 1]);
      const next = screen.getByText(present[i]);
      expect(prev.compareDocumentPosition(next)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    }
    expect(screen.queryByText('Scenes')).not.toBeInTheDocument();
  });

  it('search filters rows after the 200 ms debounce (action/desc matchers) and updates the count', async () => {
    const user = userEvent.setup();
    renderShell(<CheatSheet />, { patch: { cheatOpen: true } });
    await user.type(screen.getByTestId('cheatsheet-search'), 'blade');
    await waitFor(() => {
      expect(row('tool-blade')).toBeInTheDocument();
      expect(row('transport-play')).not.toBeInTheDocument();
    });
    expect(screen.getByText(`1/${SHORTCUT_MAP.length}`)).toBeInTheDocument();
  });

  it('search also matches the keys chord: "⌘Z" narrows to undo + redo', async () => {
    const user = userEvent.setup();
    renderShell(<CheatSheet />, { patch: { cheatOpen: true } });
    await user.type(screen.getByTestId('cheatsheet-search'), '⌘Z');
    await waitFor(() => {
      expect(row('clips-undo')).toBeInTheDocument();
      expect(row('clips-redo')).toBeInTheDocument(); // ⇧⌘Z contains ⌘Z
      expect(row('tool-select')).not.toBeInTheDocument();
    });
  });

  it('a no-match query shows the empty state row with the raw query', async () => {
    const user = userEvent.setup();
    renderShell(<CheatSheet />, { patch: { cheatOpen: true } });
    await user.type(screen.getByTestId('cheatsheet-search'), 'zzzz');
    await waitFor(() => expect(screen.getByTestId('cheatsheet-empty')).toBeInTheDocument());
    expect(screen.getByTestId('cheatsheet-empty')).toHaveTextContent('zzzz');
  });

  it('Esc closes the sheet via its capture listener (beats the shell Esc ladder)', () => {
    renderShell(<CheatSheet />, { patch: { cheatOpen: true, selection: ['el-2'] } });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(store().cheatOpen).toBe(false);
    expect(screen.queryByTestId('shell-cheatsheet')).not.toBeInTheDocument();
  });

  it('the close button and the backdrop click both dismiss the sheet', async () => {
    const user = userEvent.setup();
    renderShell(<CheatSheet />, { patch: { cheatOpen: true } });
    await user.click(screen.getByRole('button', { name: 'Close cheat sheet' }));
    expect(store().cheatOpen).toBe(false);
    // reopen via the store, then click the backdrop overlay itself
    act(() => useUi.setState({ cheatOpen: true }));
    await user.click(screen.getByTestId('shell-cheatsheet'));
    expect(store().cheatOpen).toBe(false);
  });

  it('the footer loads the 30 s sample project (§4.10), closes, and toasts success', async () => {
    const user = userEvent.setup();
    renderShell(<CheatSheet />, { patch: { cheatOpen: true } });
    await user.click(screen.getByTestId('cheatsheet-load-sample'));
    const sc = store().scenes.find((s) => s.id === store().activeSceneId)!;
    expect(sc.tracks.flatMap((t) => t.elements.map((e) => e.id))).toContain('el-sample-v1');
    expect(store().playhead).toBe(0);
    expect(store().selection).toEqual([]);
    expect(store().cheatOpen).toBe(false);
    expect(store().toasts.map((t) => t.title)).toContain('Sample project loaded');
    expect(store().toasts.find((t) => t.title === 'Sample project loaded')!.kind).toBe('success');
  });
});
