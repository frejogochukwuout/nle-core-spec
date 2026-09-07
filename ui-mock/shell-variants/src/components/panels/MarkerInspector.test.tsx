/* MarkerInspector — R19 B5: the embedded marker panel (reference dialog →
   rail). Round-trips through updateMarker (clamped in-store), the 8-dot
   color tablist, range-marker Duration, and Remove/Done selection clears. */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MarkerInspector } from './MarkerInspector';
import { useUi } from '../../state/useUiStore';
import { tc } from '../../lib/timecode';
import type { UiPatch } from '../../test/helpers';

const S = () => useUi.getState();
const mk = (id: string) => S().scenes.find((sc) => sc.id === 'sc-1')!.markers.find((m) => m.id === id)!;

function boot(patch: UiPatch) {
  useUi.setState(patch);
  return render(<MarkerInspector />);
}

describe('MarkerInspector (R19 marker v2)', () => {
  it('renders the dialog field set for the selected marker (mk-3: notes + keyword)', () => {
    boot({ selectedMarkerId: 'mk-3', selection: [] });
    expect(screen.getByTestId('shell-marker-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('shell-marker-inspector-tc')).toHaveTextContent(tc(15.5));
    expect(screen.getByLabelText('Marker name')).toHaveValue('Pull quote');
    expect(screen.getByLabelText('Marker notes')).toHaveValue('Producer note: this song was used in previous reel.');
    expect(screen.getByLabelText('Marker keyword')).toHaveValue('music');
    // the current color is aria-selected in the 8-dot tablist
    expect(screen.getByTestId('shell-marker-inspector-color-yellow')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('tab')).toHaveLength(8);
  });

  it('no marker selected → renders nothing (the rail swap routes it away)', () => {
    const { container } = boot({ selectedMarkerId: null, selection: [] });
    expect(container.firstChild).toBeNull();
  });

  it('name round-trip: typing commits through updateMarker (50ms settle law, blur settles)', () => {
    boot({ selectedMarkerId: 'mk-3', selection: [] });
    const name = screen.getByLabelText('Marker name');
    fireEvent.change(name, { target: { value: 'Music clearance' } });
    fireEvent.blur(name);
    expect(mk('mk-3').label).toBe('Music clearance');
  });

  it('notes + keyword round-trips write updateMarker', () => {
    boot({ selectedMarkerId: 'mk-3', selection: [] });
    const notes = screen.getByLabelText('Marker notes');
    fireEvent.change(notes, { target: { value: 'Cleared with legal.' } });
    fireEvent.blur(notes);
    expect(mk('mk-3').notes).toBe('Cleared with legal.');
    const keyword = screen.getByLabelText('Marker keyword');
    fireEvent.change(keyword, { target: { value: 'legal' } });
    fireEvent.blur(keyword);
    expect(mk('mk-3').keyword).toBe('legal');
  });

  it('Time TC field: parseTc input commits; out-of-scene values are CLAMPED by the store law', () => {
    boot({ selectedMarkerId: 'mk-3', selection: [] });
    const time = screen.getByLabelText('Marker time');
    expect(time).toHaveValue(tc(15.5)); // TC display (00:00:15:12)
    fireEvent.change(time, { target: { value: '00:00:20:00' } });
    fireEvent.keyDown(time, { key: 'Enter' });
    expect(mk('mk-3').time).toBe(20);
    expect(screen.getByTestId('shell-marker-inspector-tc')).toHaveTextContent(tc(20));
    // the store clamp: a patch beyond the scene duration lands on the boundary
    act(() => { S().updateMarker('mk-3', { time: 999 }); });
    expect(mk('mk-3').time).toBe(30); // sceneDuration(sc-1) = 30
    expect(screen.getByLabelText('Marker time')).toHaveValue(tc(30));
  });

  it('Duration renders ONLY for range markers (mk-5) and commits through the >=1-frame law', () => {
    const range = boot({ selectedMarkerId: 'mk-5', selection: [] });
    const dur = screen.getByTestId('shell-marker-inspector-duration');
    expect(dur).toHaveValue(tc(7));
    expect(screen.getByText(`Range marker — end ${tc(24)}`)).toBeInTheDocument();
    fireEvent.change(dur, { target: { value: '00:00:02:00' } });
    fireEvent.keyDown(dur, { key: 'Enter' });
    expect(mk('mk-5').duration).toBe(2);
    // point marker (mk-1): no Duration row at all (unmount first so the
    // store swap re-renders inside act, not as a stray update)
    range.unmount();
    boot({ selectedMarkerId: 'mk-1', selection: [] });
    expect(screen.queryByTestId('shell-marker-inspector-duration')).not.toBeInTheDocument();
  });

  it('color dots write updateMarker({color}) and move aria-selected', () => {
    boot({ selectedMarkerId: 'mk-3', selection: [] }); // yellow
    fireEvent.click(screen.getByTestId('shell-marker-inspector-color-blue'));
    expect(mk('mk-3').color).toBe('blue');
    expect(screen.getByTestId('shell-marker-inspector-color-blue')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('shell-marker-inspector-color-yellow')).toHaveAttribute('aria-selected', 'false');
  });

  it('Remove Marker deletes the marker AND clears the selection', () => {
    boot({ selectedMarkerId: 'mk-3', selection: [] });
    fireEvent.click(screen.getByTestId('shell-marker-inspector-remove'));
    expect(S().scenes.find((sc) => sc.id === 'sc-1')!.markers.map((m) => m.id)).not.toContain('mk-3');
    expect(S().selectedMarkerId).toBeNull();
    // undoable — one ⌘Z restores the marker
    act(() => { S().undo(); });
    expect(mk('mk-3').label).toBe('Pull quote');
  });

  it('Done clears the marker selection without deleting anything', () => {
    boot({ selectedMarkerId: 'mk-3', selection: [] });
    fireEvent.click(screen.getByTestId('shell-marker-inspector-done'));
    expect(S().selectedMarkerId).toBeNull();
    expect(mk('mk-3').label).toBe('Pull quote');
  });
});
