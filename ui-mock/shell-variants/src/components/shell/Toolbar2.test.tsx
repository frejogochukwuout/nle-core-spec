/* Toolbar2 — spec 18 §4.1 shell toolbar: panel toggles (aria-pressed ↔
   store.panels wiring), center project identity, right-side inspector
   affordance. R19: the fullscreen toggle was REMOVED (th_mtoyu8bl, gap C38)
   and the mac traffic-light dots are gone (th_mtoyslr9) — pinned here so
   they can't creep back.
   R22 (DESIGN-R22 D5, issues #73/#80/#86/#87): the toggle home is
   restructured — LEFT: the page-aware asset toggle (Media Pool / Sound
   Library); RIGHT: the console toggles (Scopes + Nodes on color) + Mixer +
   Inspector. The Effects and Project buttons are REMOVED (pinned below).
   Store-wiring + a11y only — no layout assertions (jsdom has no geometry). */

import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { Toolbar2 } from './Toolbar2';
import { renderPlain } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';

const S = () => useUi.getState();

describe('Toolbar2 (spec 18 §4.1)', () => {
  it('renders one labeled toolbar landmark with the §10 testid', () => {
    const { getByRole, getByTestId } = renderPlain(<Toolbar2 />);
    // §4.1: the shell toolbar is a role=toolbar region, named for a11y
    expect(getByRole('toolbar', { name: 'Shell toolbar' })).toBeInTheDocument();
    expect(getByTestId('shell-toolbar')).toBeInTheDocument();
  });

  it('panel buttons mirror the booted panels state via aria-pressed', () => {
    // store boot: mediaPool+inspector open (§4.1 defaults); mixer collapsed
    const { getByRole } = renderPlain(<Toolbar2 />);
    expect(getByRole('button', { name: 'Media Pool' })).toHaveAttribute('aria-pressed', 'true');
    expect(getByRole('button', { name: 'Mixer' })).toHaveAttribute('aria-pressed', 'false');
    expect(getByRole('button', { name: 'Inspector' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking Media Pool toggles panels.mediaPool in the store and re-renders', () => {
    const { getByRole } = renderPlain(<Toolbar2 />);
    fireEvent.click(getByRole('button', { name: 'Media Pool' }));
    expect(S().panels.mediaPool).toBe(false);
    expect(getByRole('button', { name: 'Media Pool' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(getByRole('button', { name: 'Media Pool' }));
    expect(S().panels.mediaPool).toBe(true);
    expect(getByRole('button', { name: 'Media Pool' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('Mixer and Inspector toggles are independent of each other (#73: the mixer lives here now)', () => {
    const { getByRole } = renderPlain(<Toolbar2 />);
    fireEvent.click(getByRole('button', { name: 'Mixer' }));
    fireEvent.click(getByRole('button', { name: 'Inspector' }));
    // §4.1: each toggle flips exactly its own bit (the mixer cycle is honest:
    // collapsed → meters, one stop per click)
    expect(S().mixerState).toBe('meters');
    expect(S().panels.inspector).toBe(false);
    expect(getByRole('button', { name: 'Mixer' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('reflects a pre-booted non-default panels state', () => {
    useUi.setState({ panels: { mediaPool: false, effects: true, inspector: true } });
    const { getByRole } = renderPlain(<Toolbar2 />);
    expect(getByRole('button', { name: 'Media Pool' })).toHaveAttribute('aria-pressed', 'false');
    expect(getByRole('button', { name: 'Inspector' })).toHaveAttribute('aria-pressed', 'true');
  });

  /* R22-D5 (#86/#87): the Effects and Project buttons are REMOVED — the
     console toggles own the slot; inspectorProjectMode stays store-only. */
  it('R22-D5: NO Effects and NO Project buttons (#86/#87)', () => {
    renderPlain(<Toolbar2 />);
    expect(screen.queryByTestId('shell-toolbar-btn-effects')).toBeNull();
    expect(screen.queryByTestId('shell-toolbar-btn-project')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Effects' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Project' })).toBeNull();
  });

  it('R22-D5 (#80): the left toggle follows the page asset domain (Sound Library on audio)', () => {
    useUi.setState({ page: 'audio' });
    const { getByRole, rerender } = renderPlain(<Toolbar2 />);
    expect(getByRole('button', { name: 'Sound Library' })).toBeInTheDocument();
    useUi.setState({ page: 'color' });
    rerender(<Toolbar2 />);
    expect(getByRole('button', { name: 'Media Pool' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sound Library' })).toBeNull();
    useUi.setState({ page: 'edit' });
  });

  /* R22-D3 (#73): the console toggles — Scopes off↔last-visual, Nodes, both
     color-page-only. */
  it('R22-D3: the color-page console toggles (Scopes/Nodes) live here; absent on edit', () => {
    useUi.setState({ page: 'color', colorScopesState: 'off' });
    const { getByTestId, getByRole, rerender } = renderPlain(<Toolbar2 />);
    const scopes = getByTestId('shell-toolbar-btn-scopes');
    expect(scopes).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(scopes);
    expect(S().colorScopesState).toBe('grid'); // restores the last visual mode
    expect(scopes).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(scopes);
    expect(S().colorScopesState).toBe('off');
    const nodes = getByTestId('shell-toolbar-btn-nodes');
    expect(nodes).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(nodes);
    expect(S().colorNodesDock).toBe(true);
    expect(getByRole('button', { name: 'Nodes' })).toHaveAttribute('aria-pressed', 'true');
    // the scopes row-mode is remembered as the last visual state (through
    // the setter — raw setState bypasses the lastVisual invariant)
    act(() => { useUi.getState().setColorScopesState('row'); });
    fireEvent.click(getByTestId('shell-toolbar-btn-scopes'));
    expect(S().colorScopesState).toBe('off');
    fireEvent.click(getByTestId('shell-toolbar-btn-scopes'));
    expect(S().colorScopesState).toBe('row');
    // on the EDIT page the color consoles are absent
    useUi.setState({ page: 'edit' });
    rerender(<Toolbar2 />);
    expect(screen.queryByTestId('shell-toolbar-btn-scopes')).toBeNull();
    expect(screen.queryByTestId('shell-toolbar-btn-nodes')).toBeNull();
    useUi.setState({ colorScopesState: 'off', colorNodesDock: false });
  });

  it('shows the project title and status from the mock document (§4.1 center)', () => {
    const { getByText, getByTitle } = renderPlain(<Toolbar2 />);
    expect(getByText('Beach Doc — Rough Cut')).toBeInTheDocument();
    expect(getByText('Edited')).toBeInTheDocument();
    expect(getByTitle('Beach Doc — Rough Cut')).toBeInTheDocument(); // truncate fallback
  });

  /* th_mtoyu8bl (gap C38): honest REMOVAL — no fullscreen-viewer control at
     all (the v2 surface isn't built; the old button only ever toasted a
     deferral). */
  it('has NO fullscreen-viewer toggle (th_mtoyu8bl removal, gap C38)', () => {
    renderPlain(<Toolbar2 />);
    expect(screen.queryByRole('button', { name: /fullscreen/i })).toBeNull();
    expect(screen.queryByTestId('shell-toolbar-btn-fullscreen')).toBeNull();
  });

  /* th_mtoyslr9: the mac traffic-light dots (3 aria-hidden colored circles)
     are removed entirely — no faux window chrome in a web-page mock. (The
     lucide svgs also carry aria-hidden, so the pin is the dot chrome itself:
     no rounded-full dot spans, none of the three hard-coded dot colors.) */
  it('has NO mac traffic-light dots (th_mtoyslr9 removal)', () => {
    const { container } = renderPlain(<Toolbar2 />);
    expect(container.querySelectorAll('.rounded-full')).toHaveLength(0);
    expect(container.querySelectorAll('[class*="bg-[#fd5f4d]"], [class*="bg-[#fdbb2e]"], [class*="bg-[#28c83f]"]')).toHaveLength(0);
  });
});

describe('Toolbar2 roving tabindex (spec 18 §11.1 P2, ARIA toolbar pattern)', () => {
  const btn = (name: string) => screen.getByRole('button', { name });

  it('Tab from outside lands on the FIRST button only — the rest are tabIndex −1', async () => {
    const user = userEvent.setup();
    useUi.setState({ page: 'edit' });
    renderPlain(
      <div>
        <button>before</button>
        <Toolbar2 />
      </div>,
    );
    await user.tab(); // "before"
    await user.tab(); // enters the toolbar — single tab stop
    expect(document.activeElement).toBe(btn('Media Pool'));
    // one tab stop: the other three are removed from the tab order
    expect(btn('Mixer')).toHaveAttribute('tabindex', '-1');
    expect(btn('Inspector')).toHaveAttribute('tabindex', '-1');
  });

  it('ArrowRight/ArrowLeft move focus between buttons in DOM order (wrapping)', () => {
    useUi.setState({ page: 'edit' });
    renderPlain(<Toolbar2 />);
    const focus = (name: string) => act(() => { btn(name).focus(); });
    focus('Media Pool');
    fireEvent.keyDown(btn('Media Pool'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('Mixer'));
    fireEvent.keyDown(btn('Mixer'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('Inspector'));
    // ← walks back
    fireEvent.keyDown(btn('Inspector'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(btn('Mixer'));
    // wrap: ← from the first lands on the LAST (Inspector), → from the last
    // on the first (R22: 3 buttons on edit — the consoles are color-only)
    focus('Media Pool');
    fireEvent.keyDown(btn('Media Pool'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(btn('Inspector'));
    fireEvent.keyDown(btn('Inspector'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('Media Pool'));
    // the tab stop follows the rover, not the boot index
    expect(btn('Media Pool')).toHaveAttribute('tabindex', '0');
  });

  it('Home/End jump to the first/last button; Tab is left natural (exits)', async () => {
    const user = userEvent.setup();
    useUi.setState({ page: 'edit' });
    renderPlain(
      <div>
        <Toolbar2 />
        <button>after</button>
      </div>,
    );
    act(() => { btn('Media Pool').focus(); });
    fireEvent.keyDown(btn('Media Pool'), { key: 'End' });
    expect(document.activeElement).toBe(btn('Inspector'));
    fireEvent.keyDown(btn('Inspector'), { key: 'Home' });
    expect(document.activeElement).toBe(btn('Media Pool'));
    // Tab is NOT intercepted — it leaves the toolbar for the next stop
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'after' }));
  });

  it('R22: on the color page the console toggles join the arrow cycle in DOM order', () => {
    useUi.setState({ page: 'color' });
    renderPlain(<Toolbar2 />);
    const focus = (name: string) => act(() => { btn(name).focus(); });
    focus('Media Pool');
    fireEvent.keyDown(btn('Media Pool'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('Scopes'));
    fireEvent.keyDown(btn('Scopes'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('Nodes'));
    fireEvent.keyDown(btn('Nodes'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('Mixer'));
    fireEvent.keyDown(btn('Mixer'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('Inspector'));
    // End from the first = the last (Inspector)
    focus('Media Pool');
    fireEvent.keyDown(btn('Media Pool'), { key: 'End' });
    expect(document.activeElement).toBe(btn('Inspector'));
    useUi.setState({ page: 'edit' });
  });
});
