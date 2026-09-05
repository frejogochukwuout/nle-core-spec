/* AppDock — spec 18 §4.8: brand / page dock / cheat-sheet + deferred
   affordances. Pins the four page buttons' store wiring, the cheat-sheet
   entry, and the R14 no-op sweep: Project home + Settings are aria-disabled
   with explanatory tips (§9 disabled language) — no dead-silent controls. */

import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { AppDock } from './AppDock';
import { renderPlain, store } from '../../test/helpers';

describe('AppDock (spec 18 §4.8)', () => {
  it('page buttons write setPage; the active page carries aria-current', () => {
    renderPlain(<AppDock />);
    expect(screen.getByTestId('shell-dock-page-edit')).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByTestId('shell-dock-page-color'));
    expect(store().page).toBe('color');
    expect(screen.getByTestId('shell-dock-page-color')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('shell-dock-page-edit')).not.toHaveAttribute('aria-current');
  });

  it('the cheat-sheet button opens the shared cheat modal state', () => {
    renderPlain(<AppDock />);
    fireEvent.click(screen.getByRole('button', { name: 'Keyboard cheat sheet' }));
    expect(store().cheatOpen).toBe(true);
  });

  it('Project home + Settings are aria-disabled with honest tips (R14 no-op fix)', () => {
    renderPlain(<AppDock />);
    // neither has a target surface in the mock — §9 language, reason in the tip
    const home = screen.getByRole('button', { name: 'Project home' });
    expect(home).toHaveAttribute('aria-disabled', 'true');
    expect(home).toHaveAttribute('data-tip', 'mock: project home is the media pool round (spec 18 §4.7)');
    const settings = screen.getByRole('button', { name: 'Settings' });
    expect(settings).toHaveAttribute('aria-disabled', 'true');
    expect(settings).toHaveAttribute('data-tip', 'Settings (deferred §8.12)');
    // disabled controls must not fire anything
    fireEvent.click(home);
    fireEvent.click(settings);
    expect(store().toasts).toHaveLength(0);
    expect(store().page).toBe('edit');
  });
});
