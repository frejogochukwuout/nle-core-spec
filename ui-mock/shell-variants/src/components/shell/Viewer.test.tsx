/* Viewer — spec 18 §4.3: program monitor source follows the playhead (text
   overlay compositing, empty-frame state), viewer-toolbar prefs are store
   state (Eye overlays, safe-area guides), overlays hide while a non-select
   tool is armed (§4.3/§9), zoom select, transport cluster wiring, mark
   in/out, loop toggle and the marker color palette. No geometry assertions. */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Viewer } from './Viewer';
import { useUi } from '../../state/useUiStore';

const S = () => useUi.getState();
const DUR = 30; // sceneDuration(sc-1)

describe('Viewer (spec 18 §4.3)', () => {
  it('boot: TC chip, scrub-row slider a11y, program frame follows the playhead', () => {
    const { container } = render(<Viewer duration={DUR} />);
    expect(screen.getByTestId('shell-viewer-tc')).toHaveTextContent('00:00:16:00');
    const scrub = screen.getByTestId('shell-viewer-scrub');
    expect(scrub).toHaveAttribute('role', 'slider');
    expect(scrub).toHaveAttribute('aria-valuenow', '384'); // 16 s × 24 fps
    expect(scrub).toHaveAttribute('aria-valuemax', '720'); // 30 s × 24 fps
    expect(scrub).toHaveAttribute('aria-valuetext', '00:00:16:00');
    // playhead 16 → el-2 drives the monitor; the program surface's accessible
    // name lives in real alt text — one name, one channel (R13 fix: the old
    // alt="" + aria-label pair marked the img decorative and dropped the name)
    expect(container.querySelector('img')).toHaveAttribute('alt', 'Program monitor: Marina interview');
  });

  it('composites the text overlay at the playhead; past the last clip the frame is empty', () => {
    const { container } = render(<Viewer duration={DUR} />);
    act(() => { S().setPlayhead(10); }); // el-5 (8.75–12) sits over el-2
    expect(screen.getByText('MARINA — FISHERWOMAN')).toBeInTheDocument();
    act(() => { S().setPlayhead(30); }); // past el-4's exclusive end
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(screen.getByText('No media — import or drop a file')).toBeInTheDocument();
  });

  it('zoom ladder: honest fit-anchored labels with matching magnifications', () => {
    const { container } = render(<Viewer duration={DUR} />);
    const img = container.querySelector('img')!;
    expect((img.parentElement as HTMLElement).style.width).toBe('100%'); // Fit = 1× fit
    const select = screen.getByLabelText('Viewer zoom') as HTMLSelectElement;
    // labels match the ACTUAL multipliers of the fit width (R13 fix: the old
    // 50%/100%/200% were container percentages, not magnifications)
    expect(select.options).toHaveLength(4);
    for (const label of ['Fit', '1.5×', '2×', '4×']) {
      expect(within(select).getByRole('option', { name: label })).toBeInTheDocument();
    }
    fireEvent.change(select, { target: { value: '2×' } });
    expect((img.parentElement as HTMLElement).style.width).toBe('200%');
    fireEvent.change(select, { target: { value: '4×' } });
    expect((img.parentElement as HTMLElement).style.width).toBe('400%');
  });

  it('Eye toggle hides the in-canvas overlays (store pref, §4.3 viewer-toolbar)', () => {
    render(<Viewer duration={DUR} />);
    expect(screen.getByText(/Marina interview · 00:00:03:00/)).toBeInTheDocument(); // source chip
    const eye = screen.getByRole('button', { name: 'Toggle in-canvas overlays' });
    expect(eye).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(eye);
    expect(S().viewerOverlays).toBe(false);
    expect(eye).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/Marina interview · 00:00:03:00/)).not.toBeInTheDocument();
  });

  it('a non-select tool hides overlays even while the Eye pref is on (§4.3/§9)', () => {
    useUi.setState({ tool: 'blade' });
    render(<Viewer duration={DUR} />);
    expect(screen.getByRole('button', { name: 'Toggle in-canvas overlays' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText(/Marina interview · 00:00:03:00/)).not.toBeInTheDocument();
  });

  it('safe-area guides render the 90/80 frames only while toggled on', () => {
    render(<Viewer duration={DUR} />);
    expect(screen.queryByTestId('shell-viewer-safe-guides')).not.toBeInTheDocument();
    const btn = screen.getByRole('button', { name: 'Toggle safe area guides' });
    fireEvent.click(btn);
    expect(S().viewerSafeGuides).toBe(true);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('shell-viewer-safe-guides')).toBeInTheDocument();
    expect(screen.getByText('action safe 90%')).toBeInTheDocument();
    expect(screen.getByText('title safe 80%')).toBeInTheDocument();
  });

  it('transport cluster: play toggle, frame-step, Home/End jumps', () => {
    render(<Viewer duration={DUR} />);
    fireEvent.click(screen.getByTestId('shell-viewer-btn-play'));
    expect(S().playing).toBe(true);
    fireEvent.click(screen.getByTestId('shell-viewer-btn-play'));
    expect(S().playing).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Step forward one frame' }));
    expect(S().playhead).toBeCloseTo(16 + 1 / 24, 6);
    fireEvent.click(screen.getByRole('button', { name: 'Go to start' }));
    expect(S().playhead).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Go to end' }));
    expect(S().playhead).toBe(30);
  });

  it('mark in/out at the playhead + loop toggle (aria-pressed)', () => {
    render(<Viewer duration={DUR} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark in' }));
    expect(S().loop.start).toBe(16);
    fireEvent.click(screen.getByRole('button', { name: 'Mark out' }));
    expect(S().loop.end).toBe(16);
    const loop = screen.getByRole('button', { name: 'Toggle loop playback' });
    expect(loop).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(loop);
    expect(S().loopEnabled).toBe(true);
    expect(loop).toHaveAttribute('aria-pressed', 'true');
  });

  it('marker button adds at the playhead; right-click opens the color palette', () => {
    render(<Viewer duration={DUR} />);
    const flag = screen.getByRole('button', { name: 'Add marker' });
    fireEvent.click(flag);
    expect(S().scenes[0].markers).toHaveLength(5); // 4 fixtures + 1 (cycled palette color)
    expect(S().scenes[0].markers.at(-1)!.color).toBe('blue'); // 4 existing → colors[4]
    fireEvent.contextMenu(flag); // §4.3: right-click reveals the compact palette
    expect(flag).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: 'Marker color' });
    fireEvent.click(within(menu).getByRole('menuitemradio', { name: 'Marker color red' }));
    expect(S().scenes[0].markers).toHaveLength(6);
    expect(S().scenes[0].markers.at(-1)!.color).toBe('red');
    expect(flag).toHaveAttribute('aria-expanded', 'false');
  });

  it('the chevron button is the keyboard-open path and expands the palette (R13 fix)', () => {
    render(<Viewer duration={DUR} />);
    const chevron = screen.getByRole('button', { name: 'Marker color' });
    expect(chevron).toHaveAttribute('aria-haspopup', 'menu');
    expect(chevron).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(chevron);
    expect(chevron).toHaveAttribute('aria-expanded', 'true');
    // radio state is honest: with the 4 fixture markers, a plain flag click
    // would add colors[4 % 8] = blue — that dot is the checked one
    const menu = screen.getByRole('menu', { name: 'Marker color' });
    expect(within(menu).getByRole('menuitemradio', { name: 'Marker color blue' }))
      .toHaveAttribute('aria-checked', 'true');
    expect(within(menu).getByRole('menuitemradio', { name: 'Marker color red' }))
      .toHaveAttribute('aria-checked', 'false');
  });

  it('Esc dismisses the palette via the local capture listener; selection survives', () => {
    useUi.setState({ selection: ['el-2'] });
    render(<Viewer duration={DUR} />);
    fireEvent.click(screen.getByRole('button', { name: 'Marker color' }));
    expect(screen.getByRole('menu', { name: 'Marker color' })).toBeInTheDocument();
    // capture-phase Esc closes the popover and stops the global Esc ladder
    // (useShortcuts deselect) from also firing — CheatSheet pattern
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(screen.queryByRole('menu', { name: 'Marker color' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marker color' })).toHaveAttribute('aria-expanded', 'false');
    expect(S().selection).toEqual(['el-2']); // Esc consumed by the popover, not the ladder
  });

  it('pointer-down outside the palette dismisses it; inside the safe zone it stays', () => {
    render(<Viewer duration={DUR} />);
    fireEvent.click(screen.getByRole('button', { name: 'Marker color' }));
    // pointer-down on the trigger zone (chevron) keeps it open — toggle is a click
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Marker color' }));
    expect(screen.getByRole('menu', { name: 'Marker color' })).toBeInTheDocument();
    // pointer-down on a palette dot does not dismiss before the click lands
    fireEvent.pointerDown(screen.getByRole('menuitemradio', { name: 'Marker color green' }));
    expect(screen.getByRole('menu', { name: 'Marker color' })).toBeInTheDocument();
    // pointer-down anywhere else closes
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu', { name: 'Marker color' })).not.toBeInTheDocument();
  });

  it('NaN-safe: duration 0 (empty scene) renders 0% positions, never NaN%', () => {
    render(<Viewer duration={0} />);
    const scrub = screen.getByTestId('shell-viewer-scrub');
    // pct() guards the divide — playhead, loop band and boundary ticks all
    // paint 0% instead of NaN% when the scene duration is 0
    expect(screen.getByTestId('shell-viewer-scrub-playhead').style.left).toBe('0%');
    expect(scrub.querySelector('[style*="NaN"]')).toBeNull();
  });
});
