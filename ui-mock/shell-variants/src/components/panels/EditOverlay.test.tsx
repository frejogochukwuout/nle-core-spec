/* EditOverlay — R19 B5: the 7 Resolve edit-function buttons. No source
   selection → the honest Resolve-semantics toast; with media → real
   insertMediaAt doc changes; replace/fitToFill degrade inside the store op;
   roving-tabindex toolbar law. */

import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EditOverlay } from './EditOverlay';
import { useUi } from '../../state/useUiStore';
import type { UiPatch } from '../../test/helpers';

const S = () => useUi.getState();
const overlayTrack = () => S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-overlay-1')!;

function boot(patch: UiPatch) {
  useUi.setState(patch);
  return render(<EditOverlay />);
}

const LABELS = ['Insert', 'Overwrite', 'Replace', 'Fit to Fill', 'Place on Top', 'Append at End', 'Ripple Overwrite'];

describe('EditOverlay (R19 edit workflow)', () => {
  it('renders the 7 reference buttons with exact function names, as a vertical toolbar', () => {
    boot({ mediaSelection: ['m-02'] });
    const strip = screen.getByTestId('shell-edit-overlay');
    expect(strip).toHaveAttribute('role', 'toolbar');
    expect(strip).toHaveAttribute('aria-orientation', 'vertical');
    expect(strip).toHaveAttribute('aria-label', 'Edit functions');
    for (const label of LABELS) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    // divider after Fit to Fill (in-place edits | structural)
    expect(screen.getByRole('separator')).toBeInTheDocument();
    // testid slugs
    for (const id of ['insert', 'overwrite', 'replace', 'fit-to-fill', 'place-on-top', 'append-at-end', 'ripple-overwrite']) {
      expect(screen.getByTestId(`shell-edit-overlay-${id}`)).toBeInTheDocument();
    }
  });

  it('NO media selected → honest toast, nothing dispatched (never a silent no-op)', () => {
    boot({ mediaSelection: [] });
    const before = overlayTrack().elements.length;
    fireEvent.click(screen.getByTestId('shell-edit-overlay-insert'));
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Edit functions',
      detail: 'select a media asset in the pool first (the edit functions act on the source selection — Resolve semantics)',
    });
    expect(overlayTrack().elements.length).toBe(before); // doc untouched
  });

  it('with a media selection, Insert performs the REAL placement (doc change + success toast)', () => {
    boot({ mediaSelection: ['m-08'], selection: [], playhead: 16 });
    // m-08 = title_card.png (image) → overlay track, duration-less → 4s clip
    fireEvent.click(screen.getByTestId('shell-edit-overlay-insert'));
    const els = overlayTrack().elements;
    expect(els).toHaveLength(2); // el-5 + the placed clip
    expect(els.map((e) => e.name)).toContain('title_card.png');
    const placed = els.find((e) => e.name === 'title_card.png')!;
    expect(placed.startTime).toBe(16); // at the playhead, frame-snapped
    expect(placed.duration).toBe(4);
    expect(S().toasts.at(-1)).toMatchObject({ kind: 'success', title: 'Inserted title_card.png' });
    // undoable as one step — ⌘Z removes the placed clip
    S().undo();
    expect(overlayTrack().elements).toHaveLength(1);
  });

  it('replace degrades to its honest store toast when no clip is selected', () => {
    boot({ mediaSelection: ['m-08'], selection: [] });
    fireEvent.click(screen.getByTestId('shell-edit-overlay-replace'));
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Replace',
      detail: expect.stringContaining('select a clip on a compatible track first'),
    });
  });

  it('fitToFill degrades to its honest store toast for a duration-less source', () => {
    boot({ mediaSelection: ['m-08'], selection: [] }); // m-08 duration: null
    fireEvent.click(screen.getByTestId('shell-edit-overlay-fit-to-fill'));
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Fit to Fill',
      detail: expect.stringContaining('set an In/Out range (I / O) with duration'),
    });
  });

  it('roving tabindex: ONE tab stop; ↑/↓ move focus (wrapping), Home/End jump', () => {
    boot({ mediaSelection: ['m-02'] });
    const buttons = LABELS.map((l) => screen.getByRole('button', { name: l }));
    buttons[0].focus();
    expect(buttons.filter((b) => b.tabIndex === 0)).toHaveLength(1); // one tab stop
    fireEvent.keyDown(screen.getByTestId('shell-edit-overlay'), { key: 'ArrowDown' });
    expect(buttons[1]).toHaveFocus(); // Insert → Overwrite
    fireEvent.keyDown(screen.getByTestId('shell-edit-overlay'), { key: 'End' });
    expect(buttons[6]).toHaveFocus(); // → Ripple Overwrite
    fireEvent.keyDown(screen.getByTestId('shell-edit-overlay'), { key: 'ArrowDown' });
    expect(buttons[0]).toHaveFocus(); // wraps to Insert
    fireEvent.keyDown(screen.getByTestId('shell-edit-overlay'), { key: 'Home' });
    expect(buttons[0]).toHaveFocus();
  });
});
