/* TimelineToolbar component tests — tool radio cluster (spec 16 keys /
   18 §4.5), snap/link/lock-all toggles, marker + zoom clusters, the mixer
   dock state cycle (design doc v2.2 §4), and the master-audio cluster. */

import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { TimelineToolbar } from './TimelineToolbar';
import { renderPlain, store, type UiPatch } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';

const boot = (patch: UiPatch = {}) => {
  if (Object.keys(patch).length) useUi.setState(patch);
  return renderPlain(<TimelineToolbar />);
};
const scene1 = () => store().scenes.find((s) => s.id === 'sc-1')!;

describe('TimelineToolbar', () => {
  it('is a labelled toolbar with a 7-tool radio cluster (spec 18 §4.5 tool cluster)', () => {
    boot({});
    expect(screen.getByRole('toolbar', { name: 'Timeline toolbar' })).toBeInTheDocument();
    const group = screen.getByRole('radiogroup', { name: 'Edit tool' });
    expect(within(group).getAllByRole('radio')).toHaveLength(7);
    expect(screen.getByTestId('shell-timeline-toolbar-tool-select')).toHaveAttribute('aria-checked', 'true');
  });

  it('clicking a tool switches the store tool and the radio state (spec 16 B/V keys)', () => {
    boot({});
    fireEvent.click(screen.getByTestId('shell-timeline-toolbar-tool-blade'));
    expect(store().tool).toBe('blade');
    expect(screen.getByTestId('shell-timeline-toolbar-tool-blade')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('shell-timeline-toolbar-tool-select')).toHaveAttribute('aria-checked', 'false');
  });

  it('snap / link toggles flip the store and their aria-pressed state (spec 18 §4.5)', () => {
    boot({});
    const snap = screen.getByTestId('shell-timeline-toolbar-btn-snap');
    expect(snap).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(snap);
    expect(store().snap).toBe(false);
    expect(snap).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle A/V link' }));
    expect(store().link).toBe(false);
  });

  it('lock-all fans out to every track via one undoable batch (spec 18 §4.5 lock-all)', () => {
    boot({});
    fireEvent.click(screen.getByRole('button', { name: 'Lock all tracks' }));
    expect(store().lockAll).toBe(true);
    for (const t of scene1().tracks) expect(t.locked).toBe(true);
    expect(store().past).toHaveLength(1);
  });

  it('the marker button adds a marker at the playhead (spec 16 M key)', () => {
    boot({});
    fireEvent.click(screen.getByRole('button', { name: 'Add marker' }));
    expect(scene1().markers).toHaveLength(5);
    expect(scene1().markers.at(-1)!.time).toBe(16);
  });

  it('zoom buttons step and the slider maps log-scale to px/s (spec 18 §4.5 zoom cluster)', () => {
    boot({});
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(store().pxPerSec).toBeCloseTo(69, 0);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(store().pxPerSec).toBeCloseTo(46, 0);
    // input[type=range] → implicit role=slider; disambiguates from the zoom-search button
    fireEvent.change(screen.getByRole('slider', { name: 'Timeline zoom' }), { target: { value: '100' } });
    expect(store().pxPerSec).toBeCloseTo(240, 0); // slider top = MAX_PPS
  });

  it('the mixer button cycles Edit-page states collapsed → bridge → full → collapsed (design doc v2.2 §4)', () => {
    boot({});
    const btn = screen.getByTestId('btn-mixer-state');
    expect(btn).toHaveAttribute('aria-pressed', 'false'); // collapsed
    fireEvent.click(btn);
    expect(store().mixerState).toBe('bridge');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(btn);
    expect(store().mixerState).toBe('full');
    fireEvent.click(btn);
    expect(store().mixerState).toBe('collapsed');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('in the Audio page the mixer button toggles bridge ↔ full only (design doc v2.2 §4)', () => {
    boot({ page: 'audio', mixerState: 'bridge' });
    fireEvent.click(screen.getByTestId('btn-mixer-state'));
    expect(store().mixerState).toBe('full');
    fireEvent.click(screen.getByTestId('btn-mixer-state'));
    expect(store().mixerState).toBe('bridge');
  });

  it('master mute + volume drive the shared store values (spec 18 §4.5 master bus)', () => {
    boot({});
    const mute = screen.getByRole('button', { name: 'Mute master' });
    expect(mute).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(mute);
    expect(store().masterMuted).toBe(true);
    expect(mute).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('Master volume'), { target: { value: '50' } });
    expect(store().masterVolume).toBe(0.5);
  });

  it('the toolbar micro-meter is a silent (aria-hidden) StripMeter on master values (design doc §3.2)', () => {
    boot({});
    const meter = screen.getByTitle(/Master: /);
    expect(meter).toHaveAttribute('aria-hidden', 'true'); // never aria-live
    expect(meter.getAttribute('title')).toContain('Master: -8.5 dB'); // 0.78 × 66 − 60
  });
});
