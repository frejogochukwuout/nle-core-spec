/* Toolbar2 — spec 18 §4.1 shell toolbar: panel toggles (aria-pressed ↔
   store.panels wiring), center project identity, right-side inspector
   affordance. R19: the fullscreen toggle was REMOVED (th_mtoyu8bl, gap C38)
   and the mac traffic-light dots are gone (th_mtoyslr9) — pinned here so
   they can't creep back. Store-wiring + a11y only — no layout assertions
   (jsdom has no geometry). */

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
    // store boot: mediaPool+inspector open, effects closed (§4.1 defaults)
    const { getByRole } = renderPlain(<Toolbar2 />);
    expect(getByRole('button', { name: 'Media Pool' })).toHaveAttribute('aria-pressed', 'true');
    expect(getByRole('button', { name: 'Effects' })).toHaveAttribute('aria-pressed', 'false');
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

  it('Effects and Inspector toggles are independent of each other', () => {
    const { getByRole } = renderPlain(<Toolbar2 />);
    fireEvent.click(getByRole('button', { name: 'Effects' }));
    fireEvent.click(getByRole('button', { name: 'Inspector' }));
    // §4.1: each toggle flips exactly its own panel bit
    expect(S().panels).toEqual({ mediaPool: true, effects: true, inspector: false });
  });

  it('reflects a pre-booted non-default panels state', () => {
    useUi.setState({ panels: { mediaPool: false, effects: true, inspector: true } });
    const { getByRole } = renderPlain(<Toolbar2 />);
    expect(getByRole('button', { name: 'Media Pool' })).toHaveAttribute('aria-pressed', 'false');
    expect(getByRole('button', { name: 'Effects' })).toHaveAttribute('aria-pressed', 'true');
    expect(getByRole('button', { name: 'Inspector' })).toHaveAttribute('aria-pressed', 'true');
  });

  /* R20-W3 (D4.4): the Project sheet toggle — right cluster, flips
     inspectorProjectMode (the inspector rail renders the read-only sheet). */
  it('the Project button toggles inspectorProjectMode via aria-pressed (R20-W3 D4.4)', () => {
    const { getByTestId } = renderPlain(<Toolbar2 />);
    const btn = getByTestId('shell-toolbar-btn-project');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(S().inspectorProjectMode).toBe(false);
    fireEvent.click(btn);
    expect(S().inspectorProjectMode).toBe(true);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(btn);
    expect(S().inspectorProjectMode).toBe(false);
  });

  it('shows the project title and status from the mock document (§4.1 center)', () => {
    const { getByText, getByTitle } = renderPlain(<Toolbar2 />);
    expect(getByText('Beach Doc — Rough Cut')).toBeInTheDocument();
    expect(getByText('Edited')).toBeInTheDocument();
    expect(getByTitle('Beach Doc — Rough Cut')).toBeInTheDocument(); // truncate fallback
  });

  /* th_mtoyu8bl (gap C38): honest REMOVAL — no fullscreen-viewer control at
     all (the v2 surface isn't built; the old button only ever toasted a
     deferral). The toolbar's last button is now the Inspector toggle. */
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
    renderPlain(
      <div>
        <button>before</button>
        <Toolbar2 />
      </div>,
    );
    await user.tab(); // "before"
    await user.tab(); // enters the toolbar — single tab stop
    expect(document.activeElement).toBe(btn('Media Pool'));
    // one tab stop: the other two are removed from the tab order
    expect(btn('Effects')).toHaveAttribute('tabindex', '-1');
    expect(btn('Inspector')).toHaveAttribute('tabindex', '-1');
  });

  it('ArrowRight/ArrowLeft move focus between buttons in DOM order (wrapping)', () => {
    renderPlain(<Toolbar2 />);
    const focus = (name: string) => act(() => { btn(name).focus(); });
    focus('Media Pool');
    fireEvent.keyDown(btn('Media Pool'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('Effects'));
    fireEvent.keyDown(btn('Effects'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('Inspector'));
    // ← walks back
    fireEvent.keyDown(btn('Inspector'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(btn('Effects'));
    // wrap: ← from the first lands on the LAST, → from the last on the first
    // (R20-W3: the last stop is now the Project sheet toggle — 4 buttons)
    focus('Media Pool');
    fireEvent.keyDown(btn('Media Pool'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(btn('Project'));
    fireEvent.keyDown(btn('Project'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn('Media Pool'));
    // the tab stop follows the rover, not the boot index
    expect(btn('Media Pool')).toHaveAttribute('tabindex', '0');
  });

  it('Home/End jump to the first/last button; Tab is left natural (exits)', async () => {
    const user = userEvent.setup();
    renderPlain(
      <div>
        <Toolbar2 />
        <button>after</button>
      </div>,
    );
    act(() => { btn('Media Pool').focus(); });
    fireEvent.keyDown(btn('Media Pool'), { key: 'End' });
    expect(document.activeElement).toBe(btn('Project'));
    fireEvent.keyDown(btn('Project'), { key: 'Home' });
    expect(document.activeElement).toBe(btn('Media Pool'));
    // Tab is NOT intercepted — it leaves the toolbar for the next stop
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'after' }));
  });
});
