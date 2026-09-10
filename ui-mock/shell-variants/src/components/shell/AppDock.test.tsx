/* AppDock — spec 18 §4.8: brand / page dock / cheat-sheet + deferred
   affordances. Pins the FIVE page buttons' store wiring (R23-WA: FX joins
   between audio and deliver — DESIGN-R23 D-A1), the cheat-sheet entry, and
   the R14 no-op sweep: Project home + Settings are aria-disabled with
   explanatory tips (§9 disabled language) — no dead-silent controls. */

import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppDock } from './AppDock';
import { renderPlain, store } from '../../test/helpers';

/* R24-W1 (DESIGN-R24 §1.3 A3-R5; issue #61 "this icon is really bad"): the
   Edit page glyph is the CLAPPERBOARD (19px / strokeWidth 1.6 — the dock's
   house geometry), tip frozen at the ScissorsLineDashed-era wording; the
   #115 rationale (the reference page dock pairs Cut with the scissors; our
   Edit is the rough-cut workspace) rides AppDock.tsx. Built via
   concatenation so this pin file never matches its own needle. */
const SCISSORS_NEEDLE = ['Scissors', 'LineDashed'].join('');

/** every non-test source file under src/ recursively (the app surface only). */
function srcFiles(dir = 'src'): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) out.push(...srcFiles(p));
    else if (/\.(tsx|ts)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(p);
  }
  return out;
}

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

  it('R23-WA (D-A1): the FX page button sits between Audio and Deliver; its click couples fxMode on', () => {
    renderPlain(<AppDock />);
    const ids = Array.from(document.querySelectorAll('[data-testid^="shell-dock-page-"]'))
      .map((b) => b.getAttribute('data-testid')!.replace('shell-dock-page-', ''));
    expect(ids).toEqual(['edit', 'color', 'audio', 'fx', 'deliver']);
    fireEvent.click(screen.getByTestId('shell-dock-page-fx'));
    expect(store().page).toBe('fx');
    expect(store().fxMode).toBe(true);
    expect(screen.getByTestId('shell-dock-page-fx')).toHaveAttribute('aria-current', 'page');
  });

  /* R24-W1 (A3-R5/#61, #115 rationale): the Edit page glyph is the
     CLAPPERBOARD — 19px, strokeWidth 1.6 (the dock's house geometry), tip
     frozen at the exact wording the ScissorsLineDashed era carried. */
  it('R24-W1 (#61): the Edit page glyph is the Clapperboard at 19px/1.6 with the frozen tip', () => {
    renderPlain(<AppDock />);
    const edit = screen.getByTestId('shell-dock-page-edit');
    expect(edit.querySelector('svg')!.getAttribute('class')).toContain('lucide-clapperboard');
    expect(edit.querySelector('svg')!.getAttribute('width')).toBe('19'); // the dock glyph size
    expect(edit.querySelector('svg')!.getAttribute('stroke-width')).toBe('1.6'); // the dock glyph weight
    expect(edit).toHaveAttribute('data-tip', 'Edit — rough cut (⌘1)'); // frozen wording
    // the other pages keep their own glyphs (only Edit changed)
    expect(screen.getByTestId('shell-dock-page-color').querySelector('svg')!.getAttribute('class')).toContain('lucide-palette');
    expect(screen.getByTestId('shell-dock-page-audio').querySelector('svg')!.getAttribute('class')).toContain('lucide-audio-lines');
  });

  it('R24-W1 (#61): ZERO ScissorsLineDashed anywhere in src (the repo-wide grep pin — it can never creep back)', () => {
    // every non-test source file under src/, checked for the needle
    for (const f of srcFiles()) {
      expect(readFileSync(f, 'utf8'), `${f} still carries the retired glyph`).not.toContain(SCISSORS_NEEDLE);
    }
  });
});
