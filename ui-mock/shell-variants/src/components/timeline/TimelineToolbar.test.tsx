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

  it('zoom buttons step ×1.7 (canonical) and the slider maps exponentially vs the dynamic min (R15 T1)', () => {
    boot({});
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(store().pxPerSec).toBeCloseTo(78.2, 0); // 46 × 1.7 (ZOOM_BUTTON_FACTOR)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(store().pxPerSec).toBeCloseTo(46, 0);
    // input[type=range] → implicit role=slider; disambiguates from the zoom-search button
    fireEvent.change(screen.getByRole('slider', { name: 'Timeline zoom' }), { target: { value: '100' } });
    expect(store().pxPerSec).toBeCloseTo(5000, 0); // slider top = 100× zoom (canonical domain)
    fireEvent.change(screen.getByRole('slider', { name: 'Timeline zoom' }), { target: { value: '0' } });
    // slider bottom = the DYNAMIC min (zoom-to-fit with 25% headroom, spec-05 §5.2)
    expect(store().pxPerSec).toBeCloseTo(store().zoomMinPps, 1);
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

  it('the micro-meter rides the ONE master engine key and swaps 3px LEDs for 4 coarse chunks (R15-A2)', () => {
    boot({});
    const meter = screen.getByTitle(/Master: -8\.5 dB/);
    const l = meter.querySelector('[data-channel="l"]')!;
    expect(l.querySelector('.meter-segments')).toBeNull(); // no 3px LED lines at 14px
    expect(l.querySelector('.meter-segments-coarse')).not.toBeNull(); // 4 coarse chunks
    // same palette/engine as the strip meters: token gradient anchored to the well
    expect((l.querySelector('div') as HTMLElement).style.background).toContain('var(--meter-green)');
    expect((l.querySelector('div') as HTMLElement).style.background).toContain('var(--meter-amber) 70%');
  });
});

/* R14 no-op sweep wiring — view options, the marker-color dropdown (shared
   §4.9 palette), the zoom cluster (fit / selection / magnifier-focus), the
   DIM chip honesty contract, slider aria-valuetext, and the ⌘M tooltip. */
describe('TimelineToolbar R14 wiring', () => {
  it('view options explains itself with the honest-mock toast', () => {
    boot({});
    fireEvent.click(screen.getByTestId('shell-timeline-toolbar-btn-view-options'));
    const t = store().toasts.at(-1)!;
    expect(t.kind).toBe('info');
    expect(t.title).toBe('View options');
    expect(t.detail).toContain('debug overlay');
  });

  it('the marker-color button opens the shared §4.9 palette; a pick adds a colored marker at the playhead', () => {
    boot({});
    const btn = screen.getByTestId('shell-timeline-toolbar-btn-marker-color');
    expect(btn).toHaveAttribute('aria-haspopup', 'menu');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(btn);
    expect(screen.getByTestId('shell-menu-tb-marker-color')).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    // the SAME 8-dot row the ruler menu renders (markerColorItems builder)
    for (const c of ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray']) {
      expect(screen.getByTestId(`shell-menu-tb-marker-color-${c}`)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByTestId('shell-menu-tb-marker-color-purple'));
    const added = scene1().markers.at(-1)!;
    expect(added.color).toBe('purple');
    expect(added.time).toBe(16); // at the playhead
    expect(screen.queryByTestId('shell-menu-tb-marker-color')).not.toBeInTheDocument(); // closed
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('zoom-to-fit solves px/s from the measured viewport (900 fallback) + scene duration', () => {
    boot({});
    fireEvent.click(screen.getByTestId('shell-timeline-toolbar-btn-zoom-fit'));
    // sc-1 duration = 30 s → zoomFit(900, 30) = (900-24)/(30+2)
    expect(store().pxPerSec).toBeCloseTo((900 - 24) / 32, 5);
  });

  it('zoom-to-selection fits the selection span at ~80% of the viewport', () => {
    boot({}); // boot selection = ['el-2'] → span 8.5 s (8.5 → 17)
    fireEvent.click(screen.getByTestId('shell-timeline-toolbar-btn-zoom-selection'));
    expect(store().pxPerSec).toBeCloseTo((900 * 0.8) / 8.5, 5);
  });

  it('zoom-to-selection with no selection explains itself with an info toast, zoom untouched', () => {
    boot({ selection: [] });
    fireEvent.click(screen.getByTestId('shell-timeline-toolbar-btn-zoom-selection'));
    expect(store().pxPerSec).toBe(46);
    const t = store().toasts.at(-1)!;
    expect(t.kind).toBe('info');
    expect(t.title).toBe('Zoom to selection');
    expect(t.detail).toBe('No selection — select clips to zoom to their span');
  });

  it('the magnifier button focuses the zoom slider (distinct honest effect)', () => {
    boot({});
    const slider = screen.getByRole('slider', { name: 'Timeline zoom' });
    fireEvent.click(screen.getByRole('button', { name: 'Focus zoom slider' }));
    expect(slider).toHaveFocus();
  });

  it('the zoom + master sliders expose aria-valuetext (spec 18 §11.3 slider contract)', () => {
    boot({});
    expect(screen.getByRole('slider', { name: 'Timeline zoom' })).toHaveAttribute('aria-valuetext', '46 px/s');
    expect(screen.getByRole('slider', { name: 'Master volume' })).toHaveAttribute('aria-valuetext', '78%');
  });

  it('the DIM chip is aria-disabled with the M2 explanation tip (honesty contract)', () => {
    boot({});
    const dim = screen.getByText('DIM');
    expect(dim).toHaveAttribute('aria-disabled', 'true');
    expect(dim).toHaveAttribute('data-tip', 'Master dim is M2 (spec 20 §12) — display-only in the mock');
  });

  it('the ⌘M tooltip tells the focused-track truth (spec 16 §3.5)', () => {
    boot({});
    expect(screen.getByRole('button', { name: 'Mute master' })).toHaveAttribute(
      'data-tip',
      'Mute focused track (⌘M — master when nothing focused)',
    );
  });
});

describe('R14: tool radiogroup arrow-key navigation (spec 18 §11.1)', () => {
  it('ArrowRight moves the checked tool and roves focus; ArrowLeft wraps back', () => {
    renderPlain(<TimelineToolbar />);
    const first = screen.getByTestId('shell-timeline-toolbar-tool-select');
    first.focus();
    fireEvent.keyDown(first.parentElement!, { key: 'ArrowRight' });
    expect(useUi.getState().tool).toBe('blade'); // select → blade
    expect(document.activeElement).toBe(screen.getByTestId('shell-timeline-toolbar-tool-blade'));
    fireEvent.keyDown(document.activeElement!.parentElement!, { key: 'ArrowLeft' });
    expect(useUi.getState().tool).toBe('select');
    expect(document.activeElement).toBe(first);
  });
});
