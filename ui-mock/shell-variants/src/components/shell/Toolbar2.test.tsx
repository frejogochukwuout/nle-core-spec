/* Toolbar2 — spec 18 §4.1 shell toolbar: panel toggles (aria-pressed ↔
   store.panels wiring), center project identity, right-side inspector and
   fullscreen affordances. Store-wiring + a11y only — no layout assertions
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

  it('shows the project title and status from the mock document (§4.1 center)', () => {
    const { getByText, getByTitle } = renderPlain(<Toolbar2 />);
    expect(getByText('Beach Doc — Rough Cut')).toBeInTheDocument();
    expect(getByText('Edited')).toBeInTheDocument();
    expect(getByTitle('Beach Doc — Rough Cut')).toBeInTheDocument(); // truncate fallback
  });

  it('the fullscreen affordance is honest: click pushes the §8.5 deferral toast', () => {
    const { getByRole } = renderPlain(<Toolbar2 />);
    // v2 surface isn't built — the control answers instead of staying silent
    fireEvent.click(getByRole('button', { name: 'Toggle fullscreen viewer' }));
    const t = S().toasts.at(-1)!;
    expect(t.kind).toBe('info');
    expect(t.title).toBe('Fullscreen viewer');
    expect(t.detail).toBe('v2 surface (spec 18 §8.5) — not built in the mock');
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
    // one tab stop: the other three are removed from the tab order
    expect(btn('Effects')).toHaveAttribute('tabindex', '-1');
    expect(btn('Inspector')).toHaveAttribute('tabindex', '-1');
    expect(btn('Toggle fullscreen viewer')).toHaveAttribute('tabindex', '-1');
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
    focus('Media Pool');
    fireEvent.keyDown(btn('Media Pool'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(btn('Toggle fullscreen viewer'));
    fireEvent.keyDown(btn('Toggle fullscreen viewer'), { key: 'ArrowRight' });
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
    expect(document.activeElement).toBe(btn('Toggle fullscreen viewer'));
    fireEvent.keyDown(btn('Toggle fullscreen viewer'), { key: 'Home' });
    expect(document.activeElement).toBe(btn('Media Pool'));
    // Tab is NOT intercepted — it leaves the toolbar for the next stop
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'after' }));
  });
});
