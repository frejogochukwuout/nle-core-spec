/* Viewer — spec 18 §4.3: program monitor source follows the playhead (text
   overlay compositing, empty-frame state), viewer-toolbar prefs are store
   state (Eye overlays, safe-area guides), overlays hide while a non-select
   tool is armed (§4.3/§9), zoom select, transport cluster wiring, mark
   in/out, loop toggle and the marker color palette. No geometry assertions.
   R19: source preview mode (th_mto3504c — entered via the pool selection law
   tested in MediaPool.test), the caption overlay (caption elements under
   the playhead) and the EditOverlay dock mount (B5 fills the stub). */

import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Viewer } from './Viewer';
import { useUi } from '../../state/useUiStore';
import { snapToFrame } from '../../lib/timecode';

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

  it('composites the text overlay at the playhead; AT the scene tail the monitor HOLDS the last clip (R25-F1-E1 re-pin)', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<Viewer duration={DUR} />);
      act(() => { S().setPlayhead(10); }); // el-5 (8.75–12) sits over el-2
      expect(screen.getByText('MARINA — FISHERWOMAN')).toBeInTheDocument();
      act(() => { S().setPlayhead(30); }); // el-4's exclusive end — the exact scene tail
      /* RE-PINNED (R25-F1-E1): the at-time probe is half-open, so t === duration
         used to match NOTHING and a POPULATED timeline rendered the import CTA
         ("No media — import or drop a file") on its own end frame — the
         go-to-end transport button parked the monitor on a lie. At the exact
         tail the monitor now HOLDS the last main element (el-4
         sunset_timelapse, 24+6=30): Resolve holds the last frame. The cut to
         it still mints the honest §4.2 600 ms decode window first; the poster
         never gives way to the CTA. */
      expect(screen.getByTestId('shell-viewer-state-loading')).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(600); });
      expect(container.querySelector('img')).toHaveAttribute('alt', 'Program monitor: sunset_timelapse');
      expect(screen.queryByText('No media — import or drop a file')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('R25-F1-E1: playhead AT the duration → the LAST clip\'s poster holds (no import CTA on a populated timeline); a mid-timeline gap stays honestly empty', () => {
    // pre-set the playhead BEFORE render — the boot resolve skips the decode
    // theater (the same boot-skip contract as the first-frame test above)
    act(() => { S().setPlayhead(30); });
    const first = render(<Viewer duration={DUR} />);
    expect(first.container.querySelector('img')).toHaveAttribute('alt', 'Program monitor: sunset_timelapse');
    expect(screen.queryByText('No media — import or drop a file')).not.toBeInTheDocument();
    first.unmount();
    // the strict half-open law survives BELOW the tail: a time no element
    // covers is still the honest empty frame (the tail edge is the ONLY
    // closure — a mid-timeline gap must not inherit a neighbor). sc-2 has a
    // real gap (s2-1 ends 6.25, s2-2 starts 6.5) with its own tail at 19.5.
    act(() => { useUi.setState({ activeSceneId: 'sc-2' }); });
    act(() => { S().setPlayhead(6.3); }); // inside the 6.25→6.5 gap
    const second = render(<Viewer duration={19.5} />);
    expect(second.container.querySelector('img')).not.toBeInTheDocument();
    expect(screen.getByText('No media — import or drop a file')).toBeInTheDocument();
    second.unmount();
    // sc-2's own tail (19.5 = s2-3 14.5+5) holds its last clip too
    act(() => { S().setPlayhead(19.5); });
    const third = render(<Viewer duration={19.5} />);
    expect(third.container.querySelector('img')).toHaveAttribute('alt', 'Program monitor: interview_marina (take 7)');
    third.unmount();
  });

  it('zoom ladder: honest fit-anchored labels with matching magnifications', () => {
    const { container } = render(<Viewer duration={DUR} />);
    const img = container.querySelector('img')!;
    expect((img.parentElement as HTMLElement).style.width).toBe('100%'); // Fit = 1× fit
    const select = screen.getByLabelText('Viewer zoom') as HTMLSelectElement;
    // labels match the ACTUAL multipliers of the fit width (R13 fix: the old
    // 50%/100%/200% were container percentages, not magnifications)
    // R20: 1.25× added to the ladder (thread th_mtp93qp5 / GH #66)
    expect(select.options).toHaveLength(5);
    for (const label of ['Fit', '1.25×', '1.5×', '2×', '4×']) {
      expect(within(select).getByRole('option', { name: label })).toBeInTheDocument();
    }
    fireEvent.change(select, { target: { value: '1.25×' } });
    expect((img.parentElement as HTMLElement).style.width).toBe('125%');
    fireEvent.change(select, { target: { value: '2×' } });
    expect((img.parentElement as HTMLElement).style.width).toBe('200%');
    fireEvent.change(select, { target: { value: '4×' } });
    expect((img.parentElement as HTMLElement).style.width).toBe('400%');
  });

  /* R25-F2 (E10): the SOURCE-mode toolbar carries the zoom select too — the
     same state + the same zoomStyle frame wrapper (the poster is letterboxed
     object-contain, so the magnification ladder is meaningful there). */
  it('R25-F2 (E10): source mode carries its OWN zoom select on the same ladder + frame wrapper', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-02' });
    const { container } = render(<Viewer duration={DUR} />);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('alt', 'Source preview: interview_marina.mp4');
    expect((img.parentElement as HTMLElement).style.width).toBe('100%'); // Fit
    const select = screen.getByLabelText('Source viewer zoom') as HTMLSelectElement;
    expect(select.options).toHaveLength(5);
    expect(within(select).getByRole('option', { name: '2×' })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: '2×' } });
    expect((img.parentElement as HTMLElement).style.width).toBe('200%'); // the SAME zoomStyle
  });

  /* R25-F2 (E4): the scrub boundary ticks span ALL main tracks — the old
     `.find` grabbed only the FIRST (the at-time probe walks every one). */
  it('R25-F2 (E4): the scrub boundary ticks cover elements on EVERY main track (not just the first)', () => {
    const scenes = S().scenes.map((sc) => sc.id === 'sc-1' ? {
      ...sc,
      tracks: [...sc.tracks, {
        id: 'tr-main-2', kind: 'main' as const, name: 'V2', badge: 'V2',
        muted: false, solo: false, locked: false, visible: true,
        elements: [{
          id: 'el-v2-1', type: 'video' as const, trackId: 'tr-main-2', name: 'Stacked cut',
          startTime: 20, duration: 3, mediaId: 'm-02',
        }],
      }],
    } : sc);
    useUi.setState({ scenes });
    render(<Viewer duration={DUR} />);
    const ticks = screen.getByTestId('shell-viewer-scrub').querySelectorAll('[data-testid="shell-viewer-scrub-tick"]');
    // 4 elements on tr-main + the stacked V2 element's start
    expect(ticks).toHaveLength(5);
  });

  /* R25-F2 (C6 — the F4-P3 guarded-capture law, the Viewer twin): a
     synthetic/inactive pointer id throws NotFoundError in real browsers
     (the live repro the audit caught); the capture is best-effort so the
     scrub's seek still runs. */
  it('R25-F2 (C6): a bogus pointer id on the program scrub row never throws — the seek survives the capture throw', () => {
    render(<Viewer duration={DUR} />);
    const scrub = screen.getByTestId('shell-viewer-scrub');
    scrub.getBoundingClientRect = () => ({ width: 300, height: 12, left: 0, right: 300, top: 0, bottom: 12, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    const real = Element.prototype.setPointerCapture;
    Element.prototype.setPointerCapture = () => {
      throw new DOMException('Invalid pointer id', 'NotFoundError');
    };
    try {
      expect(() => fireEvent.pointerDown(scrub, { pointerId: 9999, button: 0, clientX: 150 })).not.toThrow();
    } finally {
      Element.prototype.setPointerCapture = real;
    }
    // the seek still ran through the store seam
    expect(S().playhead).toBeCloseTo(snapToFrame((150 / 300) * DUR), 5);
  });

  /* R25-F2 (E9): the marker-color chevron's hit zone is 24px wide — the old
     16px pebble sat under the house ≥24px-wide floor. Class-level pin
     (jsdom applies no Tailwind geometry). */
  it('R25-F2 (E9): the marker-color chevron widens to the 24px hit floor (was 16px)', () => {
    render(<Viewer duration={DUR} />);
    const chevron = screen.getByRole('button', { name: 'Marker color' });
    expect(chevron.className).toContain('!w-[24px]');
    expect(chevron.className).not.toContain('!w-[16px]');
    // the palette still opens through it (the R13 keyboard path is intact)
    fireEvent.click(chevron);
    expect(screen.getByRole('menu', { name: 'Marker color' })).toBeInTheDocument();
  });

  it('Eye toggle hides the in-canvas overlays (store pref, §4.3 viewer-toolbar)', () => {
    render(<Viewer duration={DUR} />);
    expect(screen.getByText(/Marina interview · 00:00:03:00/)).toBeInTheDocument(); // source chip
    // R24-W5b (F1 P3): the Eye now hides ALL FOUR in-canvas overlay groups —
    // the text overlay + the safe guides join the name/res chips (the old
    // half-law left them painting under an "off" Eye — a lying button)
    act(() => { S().setPlayhead(10); }); // el-5 (text overlay) under the playhead
    act(() => { useUi.getState().toggleViewerSafeGuides(); });
    expect(screen.getByText('MARINA — FISHERWOMAN')).toBeInTheDocument();
    expect(screen.getByTestId('shell-viewer-safe-guides')).toBeInTheDocument();
    const eye = screen.getByRole('button', { name: 'Toggle in-canvas overlays' });
    expect(eye).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(eye);
    expect(S().viewerOverlays).toBe(false);
    expect(eye).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/Marina interview · 00:00:03:00/)).not.toBeInTheDocument();
    expect(screen.queryByText('MARINA — FISHERWOMAN')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shell-viewer-safe-guides')).not.toBeInTheDocument();
  });

  it('a non-select tool hides ALL FOUR overlay groups even while the Eye pref is on (§4.3/§9)', () => {
    /* R24-W5b (F1 P3) re-pin: this test used to document the HALF-law (the
       name chip hid on tool-armed, the text overlay + safe guides kept
       painting). hideOverlays now covers every in-canvas group: name chip,
       res chips, text overlay, safe guides. */
    useUi.setState({ tool: 'blade', viewerSafeGuides: true });
    render(<Viewer duration={DUR} />);
    expect(screen.getByRole('button', { name: 'Toggle in-canvas overlays' })).toHaveAttribute('aria-pressed', 'true');
    act(() => { S().setPlayhead(10); }); // el-2 + the el-5 text overlay
    // group 1+2: the name + res chips
    expect(screen.queryByText(/Marina interview · 00:00:03:00/)).not.toBeInTheDocument();
    expect(screen.queryByText('24p')).not.toBeInTheDocument();
    // group 3: the text overlay
    expect(screen.queryByText('MARINA — FISHERWOMAN')).not.toBeInTheDocument();
    // group 4: the safe guides (viewerSafeGuides is ON — the tool law wins)
    expect(screen.queryByTestId('shell-viewer-safe-guides')).not.toBeInTheDocument();
    // disarm → all four groups return (the Eye pref never dropped)
    act(() => { useUi.setState({ tool: 'select' }); });
    expect(screen.getByText(/Marina interview · 00:00:03:00/)).toBeInTheDocument();
    expect(screen.getByText('24p')).toBeInTheDocument();
    expect(screen.getByText('MARINA — FISHERWOMAN')).toBeInTheDocument();
    expect(screen.getByTestId('shell-viewer-safe-guides')).toBeInTheDocument();
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
    expect(S().scenes[0].markers).toHaveLength(6); // 5 fixtures + 1 (cycled palette color)
    expect(S().scenes[0].markers.at(-1)!.color).toBe('purple'); // 5 existing → colors[5]
    fireEvent.contextMenu(flag); // §4.3: right-click reveals the compact palette
    expect(flag).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: 'Marker color' });
    fireEvent.click(within(menu).getByRole('menuitemradio', { name: 'Marker color red' }));
    expect(S().scenes[0].markers).toHaveLength(7);
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
    // radio state is honest: with the 5 fixture markers, a plain flag click
    // would add colors[5 % 8] = purple — that dot is the checked one
    const menu = screen.getByRole('menu', { name: 'Marker color' });
    expect(within(menu).getByRole('menuitemradio', { name: 'Marker color purple' }))
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

  it('§4.2 loading row: a mediaId change shows the first-frame skeleton for ~600 ms, then the image (fake timers)', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<Viewer duration={DUR} />);
      // boot resolve (16 s → el-2/m-02) renders immediately — no boot theater
      expect(container.querySelector('img')).toHaveAttribute('alt', 'Program monitor: Marina interview');
      expect(screen.queryByTestId('shell-viewer-state-loading')).toBeNull();
      // cut: 0 s → el-1/m-01 — the mediaId CHANGE starts the decode window
      act(() => { S().setPlayhead(0); });
      const skel = screen.getByTestId('shell-viewer-state-loading');
      expect(skel).toHaveTextContent('Loading first frame…');
      expect(skel.className).toContain('animate-pulse'); // subtle pulse
      expect(container.querySelector('img')).toBeNull(); // image renders after
      act(() => { vi.advanceTimersByTime(599); });
      expect(screen.getByTestId('shell-viewer-state-loading')).toBeInTheDocument(); // not yet
      act(() => { vi.advanceTimersByTime(1); });
      expect(screen.queryByTestId('shell-viewer-state-loading')).toBeNull(); // done
      expect(container.querySelector('img')).toHaveAttribute('alt', 'Program monitor: A012_C034_beach_wide');
    } finally {
      vi.useRealTimers();
    }
  });

  it('§4.2 error row: img onError swaps to the decode-failure row + one error toast; Retry re-keys and re-attempts', () => {
    const { container } = render(<Viewer duration={DUR} />);
    const img1 = container.querySelector('img')!;
    fireEvent.error(img1);
    const errRow = screen.getByTestId('shell-viewer-state-error');
    expect(errRow).toHaveTextContent('Media failed to decode — check the pool');
    expect(errRow).toHaveAttribute('role', 'alert');
    expect(S().toasts).toHaveLength(1); // exactly one toast per failure
    expect(S().toasts[0]).toMatchObject({
      kind: 'error',
      title: 'Media failed to decode',
      detail: 'program frame failed to decode — check the media pool (spec 18 §4.2)',
    });
    expect(container.querySelector('img')).toBeNull(); // img swapped out for the row
    // Retry clears the state and re-keys the img (a NEW node re-attempts)
    fireEvent.click(screen.getByRole('button', { name: 'Retry decoding the program frame' }));
    expect(screen.queryByTestId('shell-viewer-state-error')).toBeNull();
    const img2 = container.querySelector('img')!;
    expect(img2).not.toBe(img1); // re-keyed remount
    // the retry can fail again — the row returns and a fresh toast fires
    fireEvent.error(img2);
    expect(screen.getByTestId('shell-viewer-state-error')).toBeInTheDocument();
    expect(S().toasts).toHaveLength(2);
  });

  it('§4.2 offline/empty fallback rows are untouched by the new state rows (RE-PINNED R25-F1-E1: the empty probe moved to a real gap)', () => {
    /* RE-PINNED (R25-F1-E1): this used to probe t=30 for the empty row — but
       that time IS the scene tail now (the monitor holds el-4 there). The
       honest empty-frame probe is sc-2's real mid-timeline gap (6.25→6.5):
       no element covers it, and no loading/error theater rides it. */
    act(() => { useUi.setState({ activeSceneId: 'sc-2' }); });
    act(() => { S().setPlayhead(6.3); });
    const { container } = render(<Viewer duration={19.5} />);
    expect(screen.getByText('No media — import or drop a file')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-viewer-state-loading')).toBeNull();
    expect(screen.queryByTestId('shell-viewer-state-error')).toBeNull();
    // offline media: the §4.2 offline row (m-04 fixture via a patched element)
    act(() => { useUi.setState({ activeSceneId: 'sc-1' }); });
    act(() => {
      const scenes = S().scenes.map((sc) => sc.id === 'sc-1' ? {
        ...sc,
        tracks: sc.tracks.map((t) => t.id === 'tr-main' ? {
          ...t,
          elements: t.elements.map((e) => e.id === 'el-1' ? { ...e, mediaId: 'm-04' } : e),
        } : t),
      } : sc);
      useUi.setState({ scenes });
    });
    act(() => { S().setPlayhead(0); });
    expect(screen.getByText('Media offline')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});

/* ---- R19: SOURCE PREVIEW MODE (th_mto3504c, spec 18 §4.3 v1.1) ----------
   Entered via the MediaPool selection law (exactly 1 selected card) or the
   clip-menu "Open in viewer" — these tests boot the store state directly
   and pin the chrome swap + the honest static transport. */
describe('Viewer source preview mode (R19 th_mto3504c)', () => {
  /* RE-PIN (W1-B, DESIGN-R25 §6 A1 supersedes the R19 no-fake-playback
     law): a STILL is a normal 5s clip in Resolve with the FULL transport —
     the honest mock is a moving playhead + running TC over the poster (the
     old "no transport buttons — no fake playback of a jpg" pin dies with
     the research verdict). Mark-in/out STAY program-mode (markIn/markOut
     write the program loop; the source-range I/O handles + trim buttons
     own the source domain). */
  it('source chrome: exit control + asset name + SOURCE chip; letterboxed poster + spec caption; the FULL transport (A1); duration TC readout', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-02' });
    const { container } = render(<Viewer duration={DUR} />);
    expect(screen.getByTestId('shell-viewer-source-chip')).toHaveTextContent('SOURCE');
    expect(screen.getByTitle('interview_marina.mp4')).toBeInTheDocument();
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('alt', 'Source preview: interview_marina.mp4');
    expect(img.className).toContain('object-contain'); // letterboxed poster, not cover
    expect(screen.getByTestId('shell-viewer-source-caption')).toHaveTextContent('Source preview — spec 18 §4.3 v1.1');
    // the media's OWN specs (m-02 is 1080p24 — honest, not the project chip)
    expect(screen.getByText('1920×1080')).toBeInTheDocument();
    expect(screen.getByText('24 fps')).toBeInTheDocument();
    // W1-B: the strip is a real scrub strip — the source PLAYHEAD is a
    // role=slider (the old "static, no slider" pin re-pinned to A1)
    expect(screen.getByTestId('shell-source-playhead')).toHaveAttribute('role', 'slider');
    // W1-B: the 5 transport buttons + the live TC render in source mode
    expect(within(screen.getByTestId('shell-source-transport')).getAllByRole('button')).toHaveLength(5);
    expect(screen.getByTestId('shell-viewer-btn-play')).toBeInTheDocument();
    // W1-B: the LEFT cluster shows the CURRENT source TC (mono 11px)
    expect(screen.getByTestId('shell-viewer-source-tc')).toHaveTextContent('00:00:00:00');
    // transport row carries the source duration TC (m-02 = 95.2 s)
    expect(screen.getByTestId('shell-viewer-source-duration')).toHaveTextContent('Source duration 00:01:35:05');
    // mark-in/mark-out stay program-mode (the program loop's writers)
    expect(screen.queryByRole('button', { name: 'Mark in' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mark out' })).toBeNull();
  });

  it('the exit control (X / "Back to program") returns the monitor to program mode', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-02' });
    const { container } = render(<Viewer duration={DUR} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back to program' }));
    expect(S().viewerMode).toBe('program');
    expect(S().sourceMediaId).toBeNull();
    // program monitor is back: playhead 16 → el-2 drives the frame
    expect(container.querySelector('img')).toHaveAttribute('alt', 'Program monitor: Marina interview');
    expect(screen.getByTestId('shell-viewer-tc')).toBeInTheDocument(); // program TC chip
  });

  it('audio source: the deterministic waveform replaces the poster (pool grammar)', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-06' });
    const { container } = render(<Viewer duration={DUR} />);
    expect(screen.getByTitle('ocean_ambience.wav')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull(); // no poster to letterbox
    expect(container.querySelectorAll('svg rect').length).toBeGreaterThan(0); // waveform bars
    expect(screen.getByTestId('shell-viewer-source-duration')).toHaveTextContent('Source duration 00:02:00:00'); // 120 s
  });

  it('offline source: the honest offline row, never a broken img', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-04' });
    const { container } = render(<Viewer duration={DUR} />);
    expect(screen.getByText('Media offline')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('still image source: duration readout is the honest still', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-08' });
    render(<Viewer duration={DUR} />);
    expect(screen.getByTestId('shell-viewer-source-duration')).toHaveTextContent('Source duration — still image');
  });

  /* R23-FIX (review-sweep item 7, R2-F5): the source-range readout SUBSCRIBES
     to sourceRanges — the old useUi.getState() mid-render read kept the stale
     string until an unrelated re-render happened. The keyboard trim's store
     writer (setSourceRangeIn — the same seam the SourceRangeBar's Arrow-key
     grammar commits through) updates the readout with NO other trigger. */
  it('R23-FIX item 7: a trim commit updates the range readout reactively (no unrelated re-render needed)', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-02' });
    render(<Viewer duration={DUR} />);
    // no range yet: the honest full-duration readout
    expect(screen.getByTestId('shell-viewer-source-duration')).toHaveTextContent('Source duration 00:01:35:05');
    // the keyboard trim's writer commits a range (m-02 = 95.2 s)
    act(() => { useUi.getState().setSourceRangeIn('m-02', 10); });
    const readout = screen.getByTestId('shell-viewer-source-duration');
    expect(readout).toHaveTextContent('Range 00:00:10:00'); // the IN edge follows the commit
    expect(readout).not.toHaveTextContent('Source duration'); // the stale branch is gone
    // and the OUT writer moves the tail the same way (one seam, every writer)
    act(() => { useUi.getState().setSourceRangeOut('m-02', 60); });
    expect(screen.getByTestId('shell-viewer-source-duration')).toHaveTextContent('00:00:10:00–00:01:00:00 · 00:00:50:00 of 00:01:35:05');
  });

  it('missing source id (defensive): honest missing row, never a broken img', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: null });
    const { container } = render(<Viewer duration={DUR} />);
    expect(screen.getByText('No source media — select a pool card')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  /* ---- R24-W5b (DESIGN-R24 §2 F1-P2): the trim buttons' honest-control law
         — no more enabled no-ops with a "set the range start" tip. */
  it('R24-W5b: NO range → trim-in/out/clear render aria-disabled with reason tips; clicks mint NOTHING (the full-range mint is dead)', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-02' });
    render(<Viewer duration={DUR} />);
    const inB = screen.getByTestId('shell-source-trim-in');
    const outB = screen.getByTestId('shell-source-trim-out');
    const clr = screen.getByTestId('shell-source-trim-clear');
    expect(inB).toHaveAttribute('aria-disabled', 'true');
    expect(outB).toHaveAttribute('aria-disabled', 'true');
    expect(clr).toHaveAttribute('aria-disabled', 'true');
    expect(inB.getAttribute('data-tip')).toContain('set a range first');
    expect(outB.getAttribute('data-tip')).toContain('set a range first');
    expect(clr.getAttribute('data-tip')).toContain('no range is set');
    // the F1 bug: the old buttons minted a semantically-identical full range
    // on click (readout byte-identical semantics). Now nothing dispatches.
    fireEvent.click(inB);
    fireEvent.click(outB);
    fireEvent.click(clr);
    expect(S().sourceRanges['m-02']).toBeUndefined();
    expect(screen.getByTestId('shell-viewer-source-duration')).toHaveTextContent('Source duration 00:01:35:05');
  });

  it('R24-W5b: WITH a range the commits are VISIBLE (the readout moves) — reset-to-head / extend-to-tail, honest-disabled at the ends', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-02' });
    render(<Viewer duration={DUR} />);
    act(() => { useUi.getState().setSourceRangeIn('m-02', 10); });
    act(() => { useUi.getState().setSourceRangeOut('m-02', 60); });
    const inB = screen.getByTestId('shell-source-trim-in');
    const outB = screen.getByTestId('shell-source-trim-out');
    expect(inB).not.toHaveAttribute('aria-disabled');
    expect(outB).not.toHaveAttribute('aria-disabled');
    // trim-in: the range start resets to the source head — the readout moves
    fireEvent.click(inB);
    expect(S().sourceRanges['m-02']!.in).toBe(0);
    expect(screen.getByTestId('shell-viewer-source-duration')).toHaveTextContent('Range 00:00:00:00–00:01:00:00');
    // at the head now → honest-disabled with the reason (a commit that would
    // move nothing renders disabled)
    expect(inB).toHaveAttribute('aria-disabled', 'true');
    expect(inB.getAttribute('data-tip')).toContain('already starts at the source head');
    fireEvent.click(inB); // the disabled click still mints nothing
    expect(S().sourceRanges['m-02']!.in).toBe(0);
    // trim-out: the end extends to the source tail — the readout moves again
    fireEvent.click(outB);
    expect(S().sourceRanges['m-02']!.out).toBeCloseTo(95.2, 5);
    expect(screen.getByTestId('shell-viewer-source-duration')).toHaveTextContent('Range 00:00:00:00–00:01:35:05');
    expect(outB).toHaveAttribute('aria-disabled', 'true');
    expect(outB.getAttribute('data-tip')).toContain('already runs to the source tail');
    // clear: back to the honest no-range state — all three disabled again
    fireEvent.click(screen.getByTestId('shell-source-trim-clear'));
    expect(S().sourceRanges['m-02']).toBeUndefined();
    expect(screen.getByTestId('shell-viewer-source-duration')).toHaveTextContent('Source duration');
    expect(screen.getByTestId('shell-source-trim-in')).toHaveAttribute('aria-disabled', 'true');
  });
});

/* ---- W1-B (DESIGN-R25 §3 / §6 A1, R2): the SOURCE transport + the poster
   feedback + W1-A (R1) the priority-row ladder. The rAF loop is NEVER
   driven here — playback advances through the store's tickSourcePlayback
   seam (the documented test contract); the responsive ladder is driven by
   a recording ResizeObserver + stubbed rects (the MixerDock pattern). ---- */
const fakeRect = (width: number) =>
  ({ top: 0, left: 0, right: width, bottom: 32, width, height: 32, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

/** Recording ResizeObserver — captures callbacks so the test can fire them
 *  with a stubbed rect (jsdom's default stub never fires). */
function withRecordingRO<T>(fn: (fire: () => void) => T): T {
  const cbs: ResizeObserverCallback[] = [];
  const Orig = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    constructor(cb: ResizeObserverCallback) { cbs.push(cb); }
    observe() { /* no-op */ }
    unobserve() { /* no-op */ }
    disconnect() { /* no-op */ }
  } as unknown as typeof ResizeObserver;
  try {
    return fn(() => { act(() => { cbs.forEach((cb) => cb([], {} as ResizeObserver)); }); });
  } finally {
    globalThis.ResizeObserver = Orig;
  }
}

describe('W1-B (A1): the source transport + poster feedback', () => {
  it('the 5 transport buttons render; play toggles the STORE flag; the buttons seek (go-to-start sets 0, go-to-end the duration, steps ±1 frame)', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-03' }); // 18.6 s
    render(<Viewer duration={DUR} />);
    expect(within(screen.getByTestId('shell-source-transport')).getAllByRole('button')).toHaveLength(5);
    // the live LEFT TC follows the source playhead (tc(sourcePlayhead))
    act(() => { useUi.getState().seekSource('m-03', 5); });
    expect(screen.getByTestId('shell-viewer-source-tc')).toHaveTextContent('00:00:05:00');
    fireEvent.click(screen.getByTestId('shell-source-btn-goto-start'));
    expect(useUi.getState().sourcePlayhead['m-03']).toBe(0);
    // go-to-end clamps to the source duration (18.6 s)
    fireEvent.click(screen.getByTestId('shell-source-btn-goto-end'));
    expect(useUi.getState().sourcePlayhead['m-03']).toBeCloseTo(18.6, 5);
    // step ±1 frame (the program transport's grammar; the house frame grid
    // — 18.6 s is off-grid, so the snapped values are the honest law)
    fireEvent.click(screen.getByTestId('shell-source-btn-step-back'));
    const snappedBack = snapToFrame(18.6 - 1 / 24);
    expect(useUi.getState().sourcePlayhead['m-03']).toBeCloseTo(snappedBack, 5);
    fireEvent.click(screen.getByTestId('shell-source-btn-step-fwd'));
    expect(useUi.getState().sourcePlayhead['m-03']).toBeCloseTo(snapToFrame(snappedBack + 1 / 24), 5);
    // play toggles the SOURCE flag only — the program playhead/flag untouched
    fireEvent.click(screen.getByTestId('shell-viewer-btn-play'));
    expect(useUi.getState().sourcePlaying).toBe(true);
    expect(useUi.getState().playing).toBe(false);
    expect(useUi.getState().playhead).toBe(16);
    fireEvent.click(screen.getByTestId('shell-viewer-btn-play'));
    expect(useUi.getState().sourcePlaying).toBe(false);
  });

  it('play-then-out STOPS (the loop law) — driven through the STORE seam, never rAF', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-03' });
    render(<Viewer duration={DUR} />);
    act(() => { useUi.getState().setSourceRangeIn('m-03', 2); });
    act(() => { useUi.getState().setSourceRangeOut('m-03', 4); });
    act(() => { useUi.getState().seekSource('m-03', 3); });
    act(() => { useUi.getState().playSource(); });
    // advance via tickSourcePlayback — the rAF loop's own seam
    act(() => { useUi.getState().tickSourcePlayback(0.5); });
    expect(useUi.getState().sourcePlayhead['m-03']).toBeCloseTo(3.5, 5);
    // 3.5 + 1.0 ≥ out (4) → the flag drops, the playhead parks ON the out point
    act(() => { useUi.getState().tickSourcePlayback(1.0); });
    expect(useUi.getState().sourcePlaying).toBe(false);
    expect(useUi.getState().sourcePlayhead['m-03']).toBe(4);
  });

  it("Fix C (A1: never dim the image): the poster progress line's style tracks the playhead", () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-03' });
    render(<Viewer duration={DUR} />);
    const line = screen.getByTestId('shell-viewer-source-progress');
    expect(line.style.width).toBe('0%'); // playhead 0 of 18.6
    expect(line.style.background).toContain('var(--playhead)');
    act(() => { useUi.getState().seekSource('m-03', 9.3); });
    // the line tracks the FRAME-SNAPPED playhead (the seek's house law)
    expect(parseFloat(screen.getByTestId('shell-viewer-source-progress').style.width))
      .toBeCloseTo((snapToFrame(9.3) / 18.6) * 100, 5);
  });

  it('stills ride the A1 5s pseudo transport (a still = a normal 5s clip; play "plays" the frozen frame)', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-08' }); // title_card.png, duration null
    render(<Viewer duration={DUR} />);
    fireEvent.click(screen.getByTestId('shell-source-btn-goto-end'));
    expect(useUi.getState().sourcePlayhead['m-08']).toBe(5); // the pseudo-duration domain
    expect(screen.getByTestId('shell-viewer-source-progress').style.width).toBe('100%');
    // the duration READOUT stays honest (the still law, unchanged)
    expect(screen.getByTestId('shell-viewer-source-duration')).toHaveTextContent('Source duration — still image');
  });

  it('exiting source preview PAUSES the source transport (no ghost rAF survives the monitor it belongs to)', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-03' });
    render(<Viewer duration={DUR} />);
    act(() => { useUi.getState().playSource(-1); }); // J: reverse shuttle
    expect(useUi.getState().sourcePlayRate).toBe(-1);
    fireEvent.click(screen.getByRole('button', { name: 'Back to program' }));
    expect(useUi.getState().viewerMode).toBe('program');
    expect(useUi.getState().sourcePlaying).toBe(false);
    /* R25-F2 (E7): the exit ALSO resets the shuttle rate — a carried −1×
       made the NEXT session's first Space run backwards (toward range.in)
       and look dead. One owner, one reset. */
    expect(useUi.getState().sourcePlayRate).toBe(1);
  });
});

describe('W1-A (R1): the source transport row priority ladder', () => {
  it('the readouts degrade FIRST (duration readout, then the live TC); the 15 buttons NEVER hide; un-measured = full', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-02' });
    let fire = () => { /* assigned below */ };
    withRecordingRO((f) => { fire = f; render(<Viewer duration={DUR} />); });
    const row = screen.getByTestId('shell-viewer-transport');
    const readout = screen.getByTestId('shell-viewer-source-duration');
    const tc = screen.getByTestId('shell-viewer-source-tc');
    // un-measured (jsdom's silent RO): everything renders — deterministic
    expect(readout).not.toHaveAttribute('hidden');
    expect(tc).not.toHaveAttribute('hidden');
    // the buttons never hide, at every rung of the ladder
    const buttonsNeverHide = () => {
      expect(within(screen.getByTestId('shell-source-transport')).getAllByRole('button')).toHaveLength(5);
      expect(within(screen.getByTestId('shell-source-edit-bar')).getAllByRole('button')).toHaveLength(7);
      expect(within(screen.getByTestId('shell-source-trim-controls')).getAllByRole('button')).toHaveLength(3);
    };
    // rung 1 — wide row (800px): everything visible
    row.getBoundingClientRect = () => fakeRect(800);
    act(() => fire());
    expect(readout).not.toHaveAttribute('hidden');
    expect(tc).not.toHaveAttribute('hidden');
    buttonsNeverHide();
    // rung 2 — 700px: the duration readout hides. RE-PIN (R25-F2/E11): the
    // DEAD data-tip is dropped (display:none can't be hovered) — the honest
    // surviving channel is the SCRUB STRIP's aria-label (playhead + in/out +
    // of-duration); the TC stays
    row.getBoundingClientRect = () => fakeRect(700);
    act(() => fire());
    expect(readout).toHaveAttribute('hidden');
    expect(readout.getAttribute('data-tip')).toBeNull(); // E11: the dead fallback is gone
    expect(screen.getByTestId('shell-viewer-scrub')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('of 00:01:35:05'), // m-02's duration rides the strip's label
    );
    expect(tc).not.toHaveAttribute('hidden');
    buttonsNeverHide();
    // rung 3 — 400px: the TC hides too; the buttons STILL never hide
    row.getBoundingClientRect = () => fakeRect(400);
    act(() => fire());
    expect(readout).toHaveAttribute('hidden');
    expect(tc).toHaveAttribute('hidden');
    buttonsNeverHide();
  });

  it('the edit-bar wrapper owns the flex basis (the starvation fix): flex-1 + 190px basis inside the FIXED 32px row', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-02' });
    render(<Viewer duration={DUR} />);
    const row = screen.getByTestId('shell-viewer-transport');
    expect(row.style.height).toBe('32px'); // the FIXED row (F1's transportRect)
    // the wrapper: flex-1 (grow with the row) + a 190px BASIS — the 7-icon
    // floor the shrink-0 siblings can never starve below again (R1's root
    // cause: two shrink-0 siblings starved the old flex-1 wrapper to 0px)
    const wrapper = screen.getByTestId('shell-source-edit-bar').parentElement!;
    expect(wrapper.className).toContain('flex-1');
    expect(wrapper.className).toContain('min-w-0');
    expect(wrapper.style.flexBasis).toBe('190px');
    // the trim cluster keeps its icons at every width (degrades SECOND =
    // it stays); the readout may shrink+truncate instead of starving
    expect(screen.getByTestId('shell-source-trim-controls').className).toContain('shrink-0');
    expect(screen.getByTestId('shell-viewer-source-duration').className).toContain('truncate');
  });
});

/* ---- R19: caption overlay (caption-track elements under the playhead) --- */
describe('Viewer caption overlay (R19)', () => {
  it('renders the caption chip for the element covering the playhead (program + edit page)', () => {
    render(<Viewer duration={DUR} />);
    act(() => { S().setPlayhead(5); }); // cap-1 [100/24, 135/24) = [4.17, 5.63)
    const overlay = screen.getByTestId('shell-viewer-caption');
    expect(overlay).toHaveTextContent('We always visit this beach');
  });

  it('playhead outside every caption: no overlay (boot playhead 16 is past the last one)', () => {
    render(<Viewer duration={DUR} />);
    expect(screen.queryByTestId('shell-viewer-caption')).toBeNull(); // last caption ends at 13 s
  });

  it('a second overlapping caption renders UNDER in the second-language yellow (FR line)', () => {
    // add a sibling FR caption track whose element overlaps cap-1's window
    const scenes = S().scenes.map((sc) => sc.id === 'sc-1' ? {
      ...sc,
      tracks: [...sc.tracks, {
        id: 'tr-caption-fr', kind: 'caption' as const, name: 'Sub 2', badge: 'CC', language: 'fr',
        muted: false, solo: false, locked: false, visible: true,
        elements: [{ id: 'cap-fr-1', type: 'text' as const, trackId: 'tr-caption-fr', name: 'Sub FR 1', startTime: 4.5, duration: 1.0, text: 'Nous venons tout le temps à la plage.' }],
      }],
    } : sc);
    useUi.setState({ scenes });
    render(<Viewer duration={DUR} />);
    act(() => { S().setPlayhead(5); });
    const chips = screen.getByTestId('shell-viewer-caption').querySelectorAll('span');
    expect(chips).toHaveLength(2);
    expect(chips[0]).toHaveTextContent('We always visit this beach'); // primary = white
    expect(chips[1]).toHaveTextContent('Nous venons tout le temps à la plage.');
    expect(chips[1]).toHaveStyle({ color: '#facc15' }); // the FR second-language line
    expect(chips[0]).not.toHaveStyle({ color: '#facc15' });
  });

  it('source mode replaces the caption overlay (the raw asset is showing, not the program)', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-02' });
    render(<Viewer duration={DUR} />);
    act(() => { S().setPlayhead(5); });
    expect(screen.queryByTestId('shell-viewer-caption')).toBeNull();
  });
});

/* ---- R20-W2 (D2 / issues #63+#64): the EditOverlay dock is GONE; the 7
   edit functions live in the SOURCE transport row (SourceEditBar). The
   program monitor is a clean full-frame output in every mode/page. ---- */
describe('Viewer edit-function placement (R20-W2)', () => {
  it('program + edit page: NO dock — the program monitor is a clean full-frame output (issue #63)', () => {
    render(<Viewer duration={DUR} />);
    expect(screen.queryByTestId('shell-viewer-edit-overlay-dock')).toBeNull();
  });

  it('source mode and non-edit pages mount NO dock either — the surface is retired everywhere', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-02' });
    const { rerender } = render(<Viewer duration={DUR} />);
    expect(screen.queryByTestId('shell-viewer-edit-overlay-dock')).toBeNull();
    useUi.setState({ viewerMode: 'program' });
    useUi.setState({ page: 'color' });
    rerender(<Viewer duration={DUR} />);
    expect(screen.queryByTestId('shell-viewer-edit-overlay-dock')).toBeNull();
  });

  it('source mode: the SourceEditBar mounts in the transport row next to the duration TC (issue #64)', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-02' });
    render(<Viewer duration={DUR} />);
    const transport = screen.getByTestId('shell-viewer-transport');
    expect(within(transport).getByTestId('shell-source-edit-bar')).toBeInTheDocument();
    expect(within(transport).getByTestId('shell-viewer-source-duration')).toBeInTheDocument();
    // the bar carries the 7 one-shot mode buttons (reference function names)
    for (const label of ['Insert', 'Overwrite', 'Replace', 'Append at End', 'Ripple Overwrite', 'Place on Top', 'Fit to Fill']) {
      expect(within(transport).getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('R24-W5b (F1 P1): the SourceEditBar is ONE ROW inside the FIXED 32px transport row (no wrap, h-scroll escape)', () => {
    useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-02' });
    render(<Viewer duration={DUR} />);
    const transport = screen.getByTestId('shell-viewer-transport');
    expect(transport.style.height).toBe('32px'); // the FIXED row (F1's transportRect)
    const bar = within(transport).getByTestId('shell-source-edit-bar');
    /* jsdom measures no layout — the CLASS grammar is the pin: h-8 is one
       32px row (== the row's own height, a second row cannot fit), NO
       flex-wrap (F1 measured the bar 46px tall over the 32px row, the 7th
       button occluded by the HSplitter z-10), overflow-x-auto is the
       narrow-width escape (buttons scroll — reachable, never occluded). */
    expect(bar.className).toContain('h-8');
    expect(bar.className).not.toContain('flex-wrap');
    expect(bar.className).toContain('overflow-x-auto');
    // all 7 buttons are flex children of the one row — reachable, and each
    // carries the 24px house hit floor
    const btns = within(bar).getAllByRole('button');
    expect(btns).toHaveLength(7);
    for (const b of btns) expect(b.className).toContain('!h-[24px]');
  });

  it('program mode: NO edit buttons in the transport row (play/mark cluster owns it)', () => {
    render(<Viewer duration={DUR} />);
    expect(screen.queryByTestId('shell-source-edit-bar')).toBeNull();
    expect(screen.getByRole('button', { name: 'Play or pause' })).toBeInTheDocument();
  });
});
