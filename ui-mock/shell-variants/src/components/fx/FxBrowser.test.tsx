/* FxBrowser — R23-WA (DESIGN-R23 D-A5): the FX page's left dock. The
   LeftDock EffectsPanel extracted VERBATIM + extended (cat 'Fade', all 27
   transition presentations). Pinned here (re-homed from LeftDock.test +
   AppShell.test — the panel's former homes; the R20-W6 re-home-not-drop
   law):
   - the FROZEN drag-to-clip payload contract (application/x-nle-effect,
     JSON {name, cat}, keys unchanged — spec 15 §5.4);
   - the honest click fallback toast (the R14 dual route);
   - the section registry shape: 5 effect rows, ALL 27 registry
     presentations (ruling 6: 'Fade In/Out' the PRESENTATIONS are transition
     rows — never the clip fadeIn/fadeOut fields), 6 Fade presets at
     0.5/1/2 s. */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FxBrowser } from './FxBrowser';
import { renderShell, store, type UiPatch } from '../../test/helpers';
import { TRANSITION_PRESENTATIONS } from '../../lib/mockData';

const boot = () => renderShell(<FxBrowser />);
const bootSel = (patch: UiPatch) => renderShell(<FxBrowser />, { patch });
const el = (id: string) => {
  for (const sc of store().scenes) for (const t of sc.tracks) {
    const hit = t.elements.find((e) => e.id === id);
    if (hit) return hit;
  }
  throw new Error(`element ${id} not found`);
};

describe('FxBrowser (R23-WA D-A5 — the FX page\'s asset dock)', () => {
  it('renders the three sections: Effects / Video Transitions / Fades', () => {
    boot();
    expect(screen.getByTestId('shell-fxbrowser')).toBeInTheDocument();
    for (const label of ['Effects', 'Video Transitions', 'Fades']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('the registry: 5 effect rows, ALL 27 transition presentations, 6 fade presets (ruling 6)', () => {
    boot();
    // the shipped effect rows, payload cats unchanged
    for (const name of ['Gaussian Blur', 'Motion Blur', 'Vignette', 'Glow', 'Chromatic Aberration']) {
      expect(screen.getByTestId(`shell-fxbrowser-row-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)).toBeInTheDocument();
    }
    // every registry presentation is a row — 'Fade In'/'Fade Out' are
    // PRESENTATIONS (transition rows), not the clip fadeIn/fadeOut fields
    for (const p of TRANSITION_PRESENTATIONS) {
      const slug = p.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      expect(screen.getByTestId(`shell-fxbrowser-row-${slug}`)).toBeInTheDocument();
    }
    // 27 transition rows + 6 fade presets at 0.5/1/2 s per side
    expect(within(screen.getByTestId('shell-fxbrowser')).getAllByRole('button').length)
      .toBe(5 + TRANSITION_PRESENTATIONS.length + 6);
    for (const name of ['Fade In 0.5s', 'Fade In 1s', 'Fade In 2s', 'Fade Out 0.5s', 'Fade Out 1s', 'Fade Out 2s']) {
      expect(screen.getByRole('button', { name: `Fade preset ${name}` })).toBeInTheDocument();
    }
  });

  /* re-homed from AppShell.test ('effect rows are drag sources') +
     LeftDock.test ('copied effects panel keeps the frozen drag contract') —
     the contract is byte-identical, the home moved with the panel. */
  it('rows are drag sources: dragStart writes the FIXED x-nle-effect payload {name, cat} (re-homed, spec 15 §5.4)', () => {
    boot();
    const row = screen.getByTestId('shell-fxbrowser-row-gaussian-blur');
    expect(row).toHaveAttribute('draggable', 'true');
    const dt = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(row, { dataTransfer: dt });
    expect(dt.setData).toHaveBeenCalledWith(
      'application/x-nle-effect',
      JSON.stringify({ name: 'Gaussian Blur', cat: 'Blur' }),
    );
    expect(dt.effectAllowed).toBe('copy');
    expect(dt.dropEffect).toBe('copy');
  });

  it('fade preset rows carry cat "Fade"; transition rows carry cat "Transition" (the extended vocabulary)', () => {
    boot();
    const fadeRow = screen.getByTestId('shell-fxbrowser-row-fade-in-1s');
    const dt = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(fadeRow, { dataTransfer: dt });
    expect(dt.setData).toHaveBeenCalledWith(
      'application/x-nle-effect',
      JSON.stringify({ name: 'Fade In 1s', cat: 'Fade' }),
    );
    const trRow = screen.getByTestId('shell-fxbrowser-row-cross-dissolve');
    const dt2 = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(trRow, { dataTransfer: dt2 });
    expect(dt2.setData).toHaveBeenCalledWith(
      'application/x-nle-effect',
      JSON.stringify({ name: 'Cross Dissolve', cat: 'Transition' }),
    );
  });

  /* re-homed from AppShell.test ('clicking an effect row answers with the
     drag-to-clip toast') — the fallback toast names the FX inspector now. */
  it('click = the honest fallback toast (re-homed, R14 dual route)', () => {
    boot();
    fireEvent.click(screen.getByTestId('shell-fxbrowser-row-vignette'));
    expect(store().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Add Vignette',
      detail: expect.stringContaining('drag the row onto a timeline clip'),
    });
    // the fade presets ride the same law
    fireEvent.click(screen.getByTestId('shell-fxbrowser-row-fade-out-2s'));
    expect(store().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'Add Fade Out 2s' });
  });
});

/* ---------- R24-W3 (DESIGN-R24 §3 W3 — A1-R7): the DOUBLE-CLICK apply
   route. The rows carry onDoubleClick → the SAME shared parser the three
   drop doors route (Clip.tsx's applyFxRowToClip — imported, never forked);
   zero/multi selection keeps the honest count-naming refusal. The frozen
   MIME constant moved to Clip.tsx ownership — this file's local copy is
   deleted (source-level pin, the shortcutMap/appLayers/TimelineToolbar
   deletion-pin precedent). ---------- */

describe('R24-W3 (A1-R7): double-click apply — the same shared parser, no fork', () => {
  it('the MIME constant is IMPORTED from Clip.tsx (its owner) — the local copy is deleted', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/components/fx/FxBrowser.tsx'), 'utf8');
    expect(src).not.toContain(['const ', 'EFFECT_DRAG_TYPE'].join('')); // the local copy is gone
    expect(src).toContain(["'", '../timeline/Clip'].join(''));          // the parser's home is the import source
  });

  it('dbl-click a transition row on the SINGLE selected clip → the clip\'s OUTgoing seam (the shared parser mint + fx-domain select)', () => {
    bootSel({ selection: ['el-3'], tool: 'fx', fxMode: true });
    fireEvent.doubleClick(screen.getByTestId('shell-fxbrowser-row-dip-to-black'));
    expect(el('el-3').transitionOut).toMatchObject({ type: 'crossfade', presentation: 'Dip to Black' });
    expect(store().selectedFxObject).toEqual({ kind: 'transition', elementId: 'el-3' });
  });

  it('the ×2 stack pin lands identically through dbl-click (el-1\'s seeded Gaussian Blur → ×2)', () => {
    bootSel({ selection: ['el-1'], tool: 'fx', fxMode: true });
    fireEvent.doubleClick(screen.getByTestId('shell-fxbrowser-row-gaussian-blur'));
    const fx = el('el-1').effects!;
    expect(fx).toHaveLength(2); // the seeded instance + the pushed one
    expect(fx.every((f) => f.name === 'Gaussian Blur')).toBe(true);
    expect(store().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'Gaussian Blur × 2' });
    expect(store().past).toHaveLength(1); // one addEffectToElement — same as the drop door
  });

  it('zero selection: the honest Select one clip toast names the count (0) — nothing applies', () => {
    bootSel({ selection: [], tool: 'fx', fxMode: true });
    fireEvent.doubleClick(screen.getByTestId('shell-fxbrowser-row-vignette'));
    expect(store().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'Select one clip' });
    expect(store().toasts.at(-1)!.detail).toContain('no clip is selected');
    expect(el('el-1').effects).toHaveLength(1); // the seeded instance only
  });

  it('multi selection: the honest Select one clip toast names the count (2)', () => {
    bootSel({ selection: ['el-1', 'el-2'], tool: 'fx', fxMode: true });
    fireEvent.doubleClick(screen.getByTestId('shell-fxbrowser-row-vignette'));
    expect(store().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'Select one clip' });
    expect(store().toasts.at(-1)!.detail).toContain('2 clips');
  });

  it('the adjacency guard rides the parser here too: a transition row on the LAST clip (no butt-spliced follower) refuses honestly', () => {
    bootSel({ selection: ['el-4'], tool: 'fx', fxMode: true });
    fireEvent.doubleClick(screen.getByTestId('shell-fxbrowser-row-dip-to-black'));
    expect(store().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'Transitions need a cut' });
    expect(store().toasts.at(-1)!.detail).toContain('no clip after this one');
    expect(el('el-4').transitionOut).toBeUndefined();
  });

  it('the click fallback toast names BOTH routes (the drag phrase verbatim + the double-click route)', () => {
    boot();
    fireEvent.click(screen.getByTestId('shell-fxbrowser-row-vignette'));
    const t = store().toasts.at(-1)!;
    expect(t.detail).toContain('drag the row onto a timeline clip'); // verbatim, R14
    expect(t.detail).toContain('double-click');                       // the A1-R7 route
  });
});
