/* Toolbar2 — spec 18 §4.1 shell toolbar: panel toggles (aria-pressed ↔
   store.panels wiring), center project identity, right-side inspector and
   fullscreen affordances. Store-wiring + a11y only — no layout assertions
   (jsdom has no geometry). */

import { describe, expect, it } from 'vitest';
import { fireEvent } from '@testing-library/react';
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

  it('the fullscreen affordance is a labeled icon button (mock: no wiring)', () => {
    const { getByRole } = renderPlain(<Toolbar2 />);
    expect(getByRole('button', { name: 'Toggle fullscreen viewer' })).toBeInTheDocument();
  });
});
