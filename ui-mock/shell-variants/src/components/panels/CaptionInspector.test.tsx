/* CaptionInspector — R19 B5: the embedded captions panel (reference sidebar
   → rail). Editor round-trips (text / In / Out through setElementField),
   Add New via addCaption, Prev/Next in time order, and the computed-CPS list
   table (the reference's values were partly decorative — we render the law). */

import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { CaptionInspector } from './CaptionInspector';
import { useUi } from '../../state/useUiStore';
import type { UiPatch } from '../../test/helpers';

const S = () => useUi.getState();
const capTrack = () => S().scenes.find((sc) => sc.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-caption')!;
const cap = (id: string) => capTrack().elements.find((e) => e.id === id)!;

function boot(patch: UiPatch) {
  useUi.setState(patch);
  return render(<CaptionInspector />);
}

describe('CaptionInspector (R19 captions)', () => {
  it('editor renders the selected caption: textarea value, live char-count chip, In/Out TCs', () => {
    boot({ selection: ['cap-1'], selectedMarkerId: null });
    expect(screen.getByTestId('shell-caption-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('shell-caption-inspector-textarea')).toHaveValue('We always visit this beach');
    // exact char count — the reference's "25 Characters" was off-by-one (26)
    expect(screen.getByTestId('shell-caption-inspector-charcount')).toHaveTextContent('26 Characters');
    expect(screen.getByTestId('shell-caption-inspector-in')).toHaveValue('00:00:04:04'); // 100/24
    expect(screen.getByTestId('shell-caption-inspector-out')).toHaveValue('00:00:05:15'); // 135/24
  });

  it('text edit writes el.text through setElementField (live settle on blur)', () => {
    boot({ selection: ['cap-1'], selectedMarkerId: null });
    const ta = screen.getByTestId('shell-caption-inspector-textarea');
    fireEvent.change(ta, { target: { value: 'We always visit this lovely beach' } });
    fireEvent.blur(ta);
    expect(cap('cap-1').text).toBe('We always visit this lovely beach');
    // char-count chip is live (n chars — the reference's 25 was off-by-one)
    expect(screen.getByTestId('shell-caption-inspector-charcount')).toHaveTextContent('33 Characters');
  });

  it('the list table renders all 5 captions with COMPUTED CPS (cap-1: 26 chars / 35/24 s → 18)', () => {
    boot({ selection: ['cap-1'], selectedMarkerId: null });
    const rows = screen.getAllByTestId(/^shell-caption-inspector-row-cap-/);
    expect(rows).toHaveLength(5);
    expect(within(screen.getByTestId('shell-caption-inspector-row-cap-1')).getByText('We always visit this beach')).toBeInTheDocument();
    // computed law round(26 / 1.4583) = 18 — the reference's decorative 12/23
    // values are NOT copied (timeline-cluster §5.2)
    expect(screen.getByTestId('shell-caption-inspector-cps-cap-1')).toHaveTextContent('18');
    // numbering is 1-based in time order
    expect(within(screen.getByTestId('shell-caption-inspector-row-cap-5')).getByText('5')).toBeInTheDocument();
  });

  it('row click selects the caption (setSelection — clears the marker domain)', () => {
    boot({ selection: ['cap-1'], selectedMarkerId: 'mk-1' });
    fireEvent.click(screen.getByTestId('shell-caption-inspector-row-cap-4'));
    expect(S().selection).toEqual(['cap-4']);
    expect(S().selectedMarkerId).toBeNull(); // one selection domain at a time
    // active row carries the aria-current + inset accent ring
    const active = screen.getByTestId('shell-caption-inspector-row-cap-4');
    expect(active).toHaveAttribute('aria-current', 'true');
    expect(active.style.boxShadow).toContain('var(--accent-selection)');
  });

  it('Add New appends a caption after the current one (addCaption law)', () => {
    boot({ selection: ['cap-1'], selectedMarkerId: null });
    fireEvent.click(screen.getByTestId('shell-caption-inspector-add-new'));
    expect(capTrack().elements).toHaveLength(6);
    const fresh = capTrack().elements.find((e) => e.text === 'New caption');
    expect(fresh).toBeDefined();
    expect(fresh!.duration).toBe(1.5);
    // table grew too
    expect(screen.getAllByTestId(/^shell-caption-inspector-row-cap-/)).toHaveLength(6);
  });

  it('Prev/Next move the selection in TIME order and park the playhead on the caption', () => {
    const first = boot({ selection: ['cap-3'], selectedMarkerId: null });
    fireEvent.click(screen.getByTestId('shell-caption-inspector-next'));
    expect(S().selection).toEqual(['cap-4']);
    expect(S().playhead).toBeCloseTo(237 / 24, 6); // cap-4 startTime
    fireEvent.click(screen.getByTestId('shell-caption-inspector-prev'));
    expect(S().selection).toEqual(['cap-3']);
    // boundary: Prev on the first caption is a real disabled, not a silent no-op
    first.unmount();
    boot({ selection: ['cap-1'], selectedMarkerId: null });
    expect(screen.getByTestId('shell-caption-inspector-prev')).toBeDisabled();
    expect(screen.getByTestId('shell-caption-inspector-next')).toBeEnabled();
  });

  /* RE-PIN (R25-F3 I5): In/Out ride the REAL commands — In through
   * moveElement (the overlap law REJECTS a move onto a neighbor), Out
   * through trimElement's right edge (the neighbor-bound CLAMP: the caption
   * can never grow past the next caption's start). The old raw
   * setElementField writes let captions overlap silently. */
  it('I5: In edits route through moveElement — a LEGAL move lands frame-snapped; an OVERLAPPING move is rejected (no doc change)', () => {
    boot({ selection: ['cap-1'], selectedMarkerId: null });
    const inField = screen.getByTestId('shell-caption-inspector-in');
    // legal: cap-1 [4.17, 5.63] → 4.0 keeps it clear of cap-2 [5.63, 7.67]
    fireEvent.change(inField, { target: { value: '00:00:04:00' } });
    fireEvent.keyDown(inField, { key: 'Enter' });
    expect(cap('cap-1').startTime).toBe(4); // frame-snapped, landed
    // illegal: 8.0 overlaps cap-3 [8.04, 9.88] → the overlap law rejects, the caption stays
    fireEvent.change(inField, { target: { value: '00:00:08:00' } });
    fireEvent.keyDown(inField, { key: 'Enter' });
    expect(cap('cap-1').startTime).toBe(4); // unchanged — no silent overlap
    expect(S().past).toHaveLength(1);        // only the legal move minted history
  });

  it('I5: Out edits route through trimElement — the right edge CLAMPS at the next caption\'s start (the neighbor law)', () => {
    boot({ selection: ['cap-1'], selectedMarkerId: null });
    // cap-1 [4.17, 5.63]: growing past cap-2's 5.625 start is impossible
    const outField = screen.getByTestId('shell-caption-inspector-out');
    fireEvent.change(outField, { target: { value: '00:00:10:12' } }); // asks for 10.5 s — far past
    fireEvent.keyDown(outField, { key: 'Enter' });
    expect(cap('cap-1').duration).toBeCloseTo(135 / 24 - 100 / 24, 6); // end clamped AT cap-2's start
    expect(cap('cap-1').startTime).toBe(100 / 24);                     // untouched by the right-edge trim
    // shrinking is unbounded below the 1-frame floor: Out 5.0 → duration 0.833
    fireEvent.change(outField, { target: { value: '00:00:05:00' } });
    fireEvent.keyDown(outField, { key: 'Enter' });
    expect(cap('cap-1').duration).toBeCloseTo(5 - 100 / 24, 6);
  });

  it('Use Track Style: display state + honest toast (gap C34), never a silent toggle', () => {
    boot({ selection: ['cap-1'], selectedMarkerId: null });
    const cb = screen.getByTestId('shell-caption-inspector-use-track-style');
    expect(cb).toBeChecked();
    fireEvent.click(cb);
    expect(cb).not.toBeChecked(); // display state flips…
    expect(S().toasts.at(-1)).toMatchObject({
      kind: 'info',
      title: 'Track style',
      detail: 'caption styling follows the track (gap C34) — per-caption overrides are engine-spec, display-only in the mock',
    });
  });

  it('no caption selected → hint state, the list stays, rows still select', () => {
    boot({ selection: [], selectedMarkerId: null });
    expect(screen.getByTestId('shell-caption-inspector-state-noselect'))
      .toHaveTextContent('Select a caption row to edit it');
    expect(screen.getAllByTestId(/^shell-caption-inspector-row-cap-/)).toHaveLength(5);
    fireEvent.click(screen.getByTestId('shell-caption-inspector-row-cap-2'));
    expect(S().selection).toEqual(['cap-2']);
  });
});
