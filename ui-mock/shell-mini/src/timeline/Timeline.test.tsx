/* Timeline component tests (D9, audit M5): renders lanes/clips with the
   mini-* testid grammar, click-select, drag-move clamps via pointer sim,
   trim end-handle clamps, split button, Esc-cancel-drag, and mid-drag
   keyboard suppression (the interaction lock at the component level).
   jsdom layout note: getBoundingClientRect returns zeros → the content
   origin is x=0, so clientX maps DIRECTLY to time via pps (deterministic:
   default zoom 48pps). */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Timeline } from './Timeline';
import App from '../App';
import { useMini } from '../state/useMini';
import { poolDrag } from '../shell/MediaPool';
import { seedDoc, multiTrackDoc } from '../lib/mockData';

const S = () => useMini.getState();
const setStore = (fn: () => void) => act(fn); // direct mutations flush re-renders
const user = userEvent.setup();

const drag = (el: Element, fromX: number, toX: number) => {
  fireEvent.pointerDown(el, { button: 0, pointerId: 7, clientX: fromX, clientY: 10 });
  fireEvent.pointerMove(el, { pointerId: 7, clientX: fromX + 6, clientY: 10 }); // cross 5px threshold
  fireEvent.pointerMove(el, { pointerId: 7, clientX: toX, clientY: 10 });
  fireEvent.pointerUp(el, { pointerId: 7, clientX: toX, clientY: 10 });
};

describe('render', () => {
  it('renders both lanes with clips + the playhead + tools', () => {
    render(<Timeline />);
    expect(screen.getByTestId('mini-lane-V1')).toBeInTheDocument();
    expect(screen.getByTestId('mini-lane-A1')).toBeInTheDocument();
    expect(screen.getByTestId('mini-clip-c1')).toBeInTheDocument();
    expect(screen.getByTestId('mini-clip-c4')).toBeInTheDocument();
    expect(screen.getByTestId('mini-playhead')).toBeInTheDocument();
    expect(screen.getByTestId('mini-timeline-tools')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^mini-trim-start-/)).toHaveLength(4);
  });

  it('renders the ruler with whole-second labels', () => {
    render(<Timeline />);
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByText('00:02')).toBeInTheDocument();
  });
});

describe('selection', () => {
  it('pointerdown selects the clip', async () => {
    render(<Timeline />);
    await user.pointer([
      { keys: '[MouseLeft>]', target: screen.getByTestId('mini-clip-c2') },
      { keys: '[/MouseLeft]' },
    ]);
    expect(S().selectedId).toBe('c2');
    expect(screen.getByTestId('mini-clip-c2')).toHaveClass('is-selected');
  });
});

describe('drag-move (48pps default zoom)', () => {
  it('moves the clip with grab-offset anchoring (raw pointer time, snap-off)', async () => {
    render(<Timeline />);
    const c2 = screen.getByTestId('mini-clip-c2'); // start 4.5s → x=216
    drag(c2, 216 + 40, 216 + 40 + 48); // grab at 5.33s; move +1s
    // grabOffset = (256/48) - 4.5 = 0.833; pointer t = 304/48 = 6.333;
    // raw start = 6.333 - 0.833 = 5.5 (on-grid by COINCIDENCE — the
    // off-grid 5.125 tests below pin that NO beat-quantize runs; R1-b#11:
    // this test's old name claimed "grid quantize", a law retired in R18i)
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.5);
    expect(S().past).toHaveLength(1); // one entry per gesture
  });

  it('R21 (user P0 revert): dragging toward the next neighbor CLAMPS — c2 parks at c3’s edge, nothing else moves', () => {
    render(<Timeline />);
    const c2 = screen.getByTestId('mini-clip-c2');
    drag(c2, 216, 216 + 300); // raw start = 4.5 + 6.25 = 10.75
    // the R18k clamp law restored: c2 [10.75, 14.25) would hit c3 [9,12.5)
    // → clampMove parks the mover at nextStart - duration = 9 - 3.5 = 5.5;
    // no escape, no minted track, no rebind, neighbors frozen
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.5);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.trackId).toBe('V1');
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(9); // frozen
    expect(S().doc.clips.find((c) => c.id === 'c1')!.start).toBe(0);
    expect(S().doc.tracks.map((t) => t.id)).toEqual(['V1', 'A1']);
    expect(S().boundVideoTrack).toBe('V1'); // no window follow
    expect(S().past).toHaveLength(1);
  });

  it('sub-threshold wobble: no drag, no history', () => {
    render(<Timeline />);
    const c2 = screen.getByTestId('mini-clip-c2');
    // genuine sub-threshold wobble — never crosses the 5px activation line
    // (the old version used the drag() helper, which crosses on purpose;
    // it passed vacuously because snap-ON quantized the wobble away)
    fireEvent.pointerDown(c2, { button: 0, pointerId: 7, clientX: 216, clientY: 10 });
    fireEvent.pointerMove(c2, { pointerId: 7, clientX: 219, clientY: 10 });
    fireEvent.pointerMove(c2, { pointerId: 7, clientX: 214, clientY: 10 });
    fireEvent.pointerUp(c2, { pointerId: 7, clientX: 214, clientY: 10 });
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.5);
    expect(S().past).toHaveLength(0);
    expect(S().dragActive).toBe(false);
  });

  it('Esc cancels an active drag (restores the pre-drag doc)', () => {
    // App mount: the keyboard wiring (useKeys) lives in App, not Timeline
    render(<App />);
    const c2 = screen.getByTestId('mini-clip-c2');
    fireEvent.pointerDown(c2, { button: 0, pointerId: 7, clientX: 256, clientY: 10 });
    fireEvent.pointerMove(c2, { pointerId: 7, clientX: 300, clientY: 10 }); // activates
    expect(S().dragActive).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(S().dragActive).toBe(false);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.5);
    expect(S().past).toHaveLength(0);
    fireEvent.pointerUp(c2, { pointerId: 7, clientX: 300, clientY: 10 }); // cleanup
  });

  it('mid-drag keyboard suppression (interaction lock at component level)', () => {
    render(<App />);
    const c2 = screen.getByTestId('mini-clip-c2');
    fireEvent.pointerDown(c2, { button: 0, pointerId: 7, clientX: 256, clientY: 10 });
    fireEvent.pointerMove(c2, { pointerId: 7, clientX: 300, clientY: 10 });
    expect(S().dragActive).toBe(true);
    fireEvent.keyDown(window, { key: 's' }); // split suppressed mid-drag
    expect(S().doc.clips).toHaveLength(4);
    fireEvent.keyDown(window, { key: ' ' }); // play suppressed
    expect(S().playing).toBe(false);
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.pointerUp(c2, { pointerId: 7, clientX: 300, clientY: 10 });
  });
});

describe('trim via end handle', () => {
  it('end-trim clamps to the next neighbor', () => {
    render(<Timeline />);
    const handle = screen.getByTestId('mini-trim-end-c2'); // clip 4.5→8; next at 9
    drag(handle, 8 * 48, 20 * 48); // yank far right: clamps to min(9, 4.5+4.5(media)) = 8.5... media m-beach dur 4.5 → cap 9
    // end-trim bound: [start+0.5, min(nextStart=9, start+media=9)] → 9 → duration 4.5
    expect(S().doc.clips.find((c) => c.id === 'c2')!.duration).toBe(4.5);
  });

  it('start-trim clamps to prev neighbor', () => {
    render(<Timeline />);
    const handle = screen.getByTestId('mini-trim-start-c2'); // prev c1 ends 3.5
    drag(handle, 4.5 * 48, 0); // yank far left: clamps start to prevEnd=3.5
    const c2 = S().doc.clips.find((c) => c.id === 'c2')!;
    expect(c2.start).toBe(3.5);
    expect(c2.duration).toBe(4.5); // 8 - 3.5
  });
});

describe('R18h trim zones: shaded-edge grammar (threads #8/#9/#10)', () => {
  it('trim zones are keyboard-gated by selection (no affordance when unselected)', () => {
    render(<Timeline />);
    // default doc: nothing selected → zones are NOT tab stops
    expect(screen.getByTestId('mini-trim-end-c2').tabIndex).toBe(-1);
    expect(screen.getByTestId('mini-trim-start-c2').tabIndex).toBe(-1);
    // selecting the clip opens the zones to the tab order
    act(() => S().select('c2'));
    expect(screen.getByTestId('mini-trim-end-c2').tabIndex).toBe(0);
    expect(screen.getByTestId('mini-trim-start-c2').tabIndex).toBe(0);
  });

  it('keyboard trim still works from the end zone once selected', () => {
    render(<Timeline />);
    act(() => S().select('c2'));
    const handle = screen.getByTestId('mini-trim-end-c2'); // c2 4.5→8, dur 3.5
    fireEvent.keyDown(handle, { key: 'ArrowRight' }); // +0.5s
    expect(S().doc.clips.find((c) => c.id === 'c2')!.duration).toBe(4);
    fireEvent.keyDown(handle, { key: 'ArrowLeft' }); // back
    expect(S().doc.clips.find((c) => c.id === 'c2')!.duration).toBe(3.5);
  });

  it('pointer trim still works from the zone (no handle bar, same hit target)', () => {
    render(<Timeline />);
    const handle = screen.getByTestId('mini-trim-end-c2');
    drag(handle, 8 * 48, 20 * 48); // clamps to next neighbor at 9 → dur 4.5
    expect(S().doc.clips.find((c) => c.id === 'c2')!.duration).toBe(4.5);
  });
});

describe('R18h split glyph (thread #9: cut in the middle, family grammar)', () => {
  it('the split button carries the purpose-drawn clip-rect glyph, not lucide scissors', () => {
    render(<Timeline />);
    const svg = screen.getByTestId('mini-btn-split').querySelector('svg');
    expect(svg).not.toBeNull();
    // family grammar: a clip <rect> + a center playhead <path> (the cut)
    expect(svg!.querySelectorAll('rect').length).toBeGreaterThanOrEqual(1);
    expect(svg!.querySelectorAll('path').length).toBeGreaterThanOrEqual(1);
    // the trim siblings next to it carry the same grammar
    const head = screen.getByTestId('mini-btn-cuthead').querySelector('svg');
    const tail = screen.getByTestId('mini-btn-cuttail').querySelector('svg');
    expect(head!.querySelectorAll('rect').length).toBeGreaterThanOrEqual(3);
    expect(tail!.querySelectorAll('rect').length).toBeGreaterThanOrEqual(3);
  });
});

describe('tools row', () => {
  it('split button splits at the playhead (fallback targeting)', async () => {
    render(<Timeline />);
    S().setPlayhead(6.3);
    await user.click(screen.getByTestId('mini-btn-split'));
    expect(S().doc.clips).toHaveLength(5);
  });

  it('snap toggle flips the store flag + aria-pressed', async () => {
    render(<Timeline />);
    const btn = screen.getByTestId('mini-btn-snap');
    // snap is OFF by default now (R18e, feedback #10)
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    await user.click(btn);
    expect(S().snapOn).toBe(true);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('zoom slider drives zoomStep', async () => {
    render(<Timeline />);
    const slider = screen.getByTestId('mini-zoom-slider') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '3' } });
    expect(S().zoomStep).toBe(3);
  });

  it('delete button removes the selected clip', async () => {
    render(<Timeline />);
    await user.pointer([
      { keys: '[MouseLeft>]', target: screen.getByTestId('mini-clip-c1') },
      { keys: '[/MouseLeft]' },
    ]);
    await user.click(screen.getByTestId('mini-btn-delete'));
    expect(S().doc.clips.find((c) => c.id === 'c1')).toBeUndefined();
    expect(S().past).toHaveLength(1);
  });
});

describe('ruler scrub', () => {
  it('pointer down + drag on the ruler moves the playhead (unquantized)', () => {
    render(<Timeline />);
    const ruler = screen.getByTestId('mini-ruler');
    fireEvent.pointerDown(ruler, { button: 0, pointerId: 3, clientX: 244, clientY: 20 });
    expect(S().playhead).toBeCloseTo(244 / 48, 5); // 5.083…
    fireEvent.pointerMove(ruler, { buttons: 1, pointerId: 3, clientX: 100, clientY: 20 });
    expect(S().playhead).toBeCloseTo(100 / 48, 5);
  });
});

describe('playhead handle drag (review gap #5)', () => {
  it('dragging the playhead follows the pointer through the shared origin', () => {
    render(<Timeline />);
    const ph = screen.getByTestId('mini-playhead');
    fireEvent.pointerDown(ph, { button: 0, pointerId: 5, clientX: 46, clientY: 20 });
    fireEvent.pointerMove(ph, { pointerId: 5, clientX: 282, clientY: 20 });
    // R18k: origin = content.left(0) + 46 (the fixed head rail) → t = (282-46)/48 = 4.916…
    expect(S().playhead).toBeCloseTo((282 - 46) / 48, 5);
    fireEvent.pointerUp(ph, { pointerId: 5, clientX: 282, clientY: 20 });
  });

  it('keyboard scrub: arrow keys step the playhead by 0.5s', () => {
    render(<Timeline />);
    const ph = screen.getByTestId('mini-playhead');
    fireEvent.keyDown(ph, { key: 'ArrowRight' });
    expect(S().playhead).toBe(0.5);
    fireEvent.keyDown(ph, { key: 'ArrowLeft' });
    expect(S().playhead).toBe(0);
  });
});

describe('coordinate law (review fix #1: everything positions in px)', () => {
  it('ruler mark, clip left, and playhead share the px law for the same t', () => {
    render(<Timeline />);
    act(() => {
      S().setPlayhead(4); // 4s → 192px @ 48pps
    });
    const mark4 = document.querySelector('[data-mark-time="4"]') as HTMLElement;
    expect(mark4.style.left).toBe('192px');
    expect(screen.getByTestId('mini-playhead').style.left).toBe('192px');
    // c2 starts 4.5s → 216px
    expect(screen.getByTestId('mini-clip-c2').style.left).toBe('216px');
    // ruler tick at 4.5s? marks land on 2s steps at 48pps — use the 4s mark + 8s mark
    expect((document.querySelector('[data-mark-time="8"]') as HTMLElement).style.left).toBe('384px');
  });
});

describe('pointercancel (review gap #3)', () => {
  it('pointercancel mid-drag restores the doc + clears the lock', () => {
    render(<Timeline />);
    const c2 = screen.getByTestId('mini-clip-c2');
    fireEvent.pointerDown(c2, { button: 0, pointerId: 7, clientX: 256, clientY: 10 });
    fireEvent.pointerMove(c2, { pointerId: 7, clientX: 300, clientY: 10 });
    expect(S().dragActive).toBe(true);
    fireEvent.pointerCancel(c2, { pointerId: 7, clientX: 300, clientY: 10 });
    expect(S().dragActive).toBe(false);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.5);
    expect(S().past).toHaveLength(0);
  });
});

describe('snap-off commits raw positions (review gap #4)', () => {
  it('R18i: with snap ON and no magnet in range the drag also commits RAW (magnet-only snapping — the 0.5s beat grid left the snap path)', () => {
    render(<Timeline />);
    act(() => {
      S().toggleSnap(); // ON (default is off since R18e)
    });
    const c2 = screen.getByTestId('mini-clip-c2');
    drag(c2, 256, 286); // raw start 5.125, 2.6s from the c1 edge — no magnet
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.125); // smooth, NOT grid-stepped
  });

  it('with snap OFF (the default) the drag commits the raw (unquantized) start', () => {
    render(<Timeline />);
    const c2 = screen.getByTestId('mini-clip-c2');
    drag(c2, 256, 286);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.125);
  });
});

describe('single-gesture law (review fix #4: second pointer is inert mid-drag)', () => {
  it('a second pointerdown on another clip is ignored while a drag is active', () => {
    // App mount: the Esc leg needs the keyboard wiring (useKeys lives in App)
    render(<App />);
    const c2 = screen.getByTestId('mini-clip-c2');
    const c1 = screen.getByTestId('mini-clip-c1');
    // activate a real drag on c2 with pointer 7
    fireEvent.pointerDown(c2, { button: 0, pointerId: 7, clientX: 256, clientY: 10 });
    fireEvent.pointerMove(c2, { pointerId: 7, clientX: 300, clientY: 10 });
    expect(S().dragActive).toBe(true);
    // second pointer (id 9) lands on c1 and tries to move it
    fireEvent.pointerDown(c1, { button: 0, pointerId: 9, clientX: 100, clientY: 10 });
    fireEvent.pointerMove(c1, { pointerId: 9, clientX: 400, clientY: 10 });
    fireEvent.pointerUp(c1, { pointerId: 9, clientX: 400, clientY: 10 });
    expect(S().doc.clips.find((c) => c.id === 'c1')!.start).toBe(0); // untouched
    // the ORIGINAL gesture still owns the session and can cancel cleanly
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(S().dragActive).toBe(false);
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.5);
    fireEvent.pointerUp(c2, { pointerId: 7, clientX: 300, clientY: 10 });
  });
});

describe('zoom tiers', () => {
  it('renders at the densest zoom without breaking', () => {
    S().setZoomStep(4);
    const { unmount } = render(<Timeline />);
    expect(screen.getByTestId('mini-timeline')).toBeInTheDocument();
    unmount();
  });
});

/* ---- R18e: cut styles + ripple + toggles + DnD + waveform ---- */

describe('R18e cut styles (RH 裁剪开始/裁剪结束)', () => {
  it('cut head button discards the clip head at the playhead', () => {
    render(<Timeline />);
    act(() => {
      S().select('c2');
      S().setPlayhead(6);
    });
    fireEvent.click(screen.getByTestId('mini-btn-cuthead'));
    expect(S().doc.clips.find((c) => c.id === 'c2')!).toMatchObject({ start: 6, duration: 2 });
  });

  it('cut tail button discards the clip tail at the playhead', () => {
    render(<Timeline />);
    act(() => {
      S().select('c2');
      S().setPlayhead(5.5);
    });
    fireEvent.click(screen.getByTestId('mini-btn-cuttail'));
    expect(S().doc.clips.find((c) => c.id === 'c2')!).toMatchObject({ start: 4.5, duration: 1 });
  });
});

describe('R18e ripple toggle', () => {
  it('toolbar ripple button flips aria-pressed + delete closes the gap', () => {
    render(<Timeline />);
    const btn = screen.getByTestId('mini-btn-ripple');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(btn);
    expect(S().rippleOn).toBe(true);
    act(() => {
      S().select('c2');
    });
    fireEvent.click(screen.getByTestId('mini-btn-delete'));
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(5.5); // 9 - 3.5
  });
});

describe('R18e filmstrip toggle (feedback #15)', () => {
  it('filmstrip bodies by default; toggle renders color-block bodies', () => {
    render(<Timeline />);
    const c2 = screen.getByTestId('mini-clip-c2');
    expect(c2.querySelector('.qc-track-item__filmstrip')).toBeInTheDocument();
    expect(c2.querySelector('.qc-track-item__block')).toBeNull();
    fireEvent.click(screen.getByTestId('mini-btn-filmstrip'));
    expect(c2.querySelector('.qc-track-item__filmstrip')).toBeNull();
    expect(c2.querySelector('.qc-track-item__block')).toBeInTheDocument();
  });

  it('audio clips keep the waveform body in both modes', () => {
    render(<Timeline />);
    const c4 = screen.getByTestId('mini-clip-c4');
    expect(c4.querySelector('.qc-track-item__waveform')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mini-btn-filmstrip'));
    expect(c4.querySelector('.qc-track-item__waveform')).toBeInTheDocument();
  });
});

describe('R18e real waveform (feedback #12)', () => {
  it('audio clip body is an SVG with discrete envelope bars', () => {
    render(<Timeline />);
    const svg = screen.getByTestId('mini-clip-c4').querySelector('svg.qc-track-item__waveform') as SVGSVGElement;
    expect(svg).toBeInTheDocument();
    const bars = svg.querySelectorAll('rect');
    expect(bars.length).toBeGreaterThanOrEqual(8);
    // envelope: bar heights differ (the old placeholder was uniform)
    const heights = new Set(Array.from(bars).map((b) => b.getAttribute('height')));
    expect(heights.size).toBeGreaterThan(4);
  });
});

describe('R18e audio lane visibility (feedback #8)', () => {
  it('eye toggle hides the A1 lane but keeps its clips in the doc', () => {
    render(<Timeline />);
    expect(screen.getByTestId('mini-lane-A1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mini-btn-audiolane'));
    expect(screen.queryByTestId('mini-lane-A1')).toBeNull();
    expect(S().doc.clips.filter((c) => c.trackId === 'A1')).toHaveLength(1);
    expect(screen.getByTestId('mini-lane-V1')).toBeInTheDocument();
  });
});

describe('R18e pool→timeline DnD (feedback #13 / v0.2 deferral closed)', () => {
  /* jsdom/RTL note: fireEvent.dragOver(el, { dataTransfer, clientX }) delivers
     dataTransfer but silently DROPS mouse coords (TL builds a dataTransfer
     event without MouseEvent props → clientX undefined → t = NaN). Dispatch a
     REAL DragEvent (carries clientX) and inject the dataTransfer stub. */
  const dragEvent = (type: 'dragover' | 'drop', x: number, transfer: object) => {
    // jsdom has no DragEvent constructor — a MouseEvent with the drag TYPE
    // string is enough (React dispatches on type), with dataTransfer injected
    const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 40 });
    Object.defineProperty(ev, 'dataTransfer', { value: transfer });
    return ev;
  };
  const dt = (mediaId: string) => ({
    types: ['application/x-mini-media'],
    getData: (type: string) => (type === 'application/x-mini-media' ? mediaId : ''),
    dropEffect: '',
  });

  it('dragOver paints the drop outline; drop places the clip at the cursor', () => {
    render(<Timeline />);
    const lane = screen.getByTestId('mini-lane-V1');
    // poolDrag registry is the dragover-time media source (module singleton)
    poolDrag.current = 'm-lower';
    const transfer = dt('m-lower');
    // want = quantize((696-46)/48) = 13.5 (R18k origin: +36 head rail); c3 ends 12.5 → free → exact spot
    fireEvent(lane, dragEvent('dragover', 696, transfer));
    expect(screen.getByTestId('mini-drop-outline-V1')).toBeInTheDocument();
    fireEvent(lane, dragEvent('drop', 696, transfer));
    poolDrag.current = null;
    const added = S().doc.clips.find((c) => c.mediaId === 'm-lower')!;
    expect(added).toMatchObject({ trackId: 'V1', duration: 2.5, start: 13.5 });
    expect(S().toast?.text).toContain('Placed');
  });

  it('audio media over the V1 lane is refused (dropEffect none, no outline)', () => {
    render(<Timeline />);
    const lane = screen.getByTestId('mini-lane-V1');
    poolDrag.current = 'm-interview';
    const transfer = dt('m-interview');
    fireEvent(lane, dragEvent('dragover', 300, transfer));
    expect(transfer.dropEffect).toBe('none');
    expect(screen.queryByTestId('mini-drop-outline-V1')).toBeNull();
    poolDrag.current = null;
  });

  it('drop onto A1 with audio media places on A1', () => {
    render(<Timeline />);
    const lane = screen.getByTestId('mini-lane-A1');
    poolDrag.current = 'm-ambience';
    // c4 [1.5, 8.5]; want = quantize((600−46)/48) = 11.5 → A1 tail free
    fireEvent(lane, dragEvent('drop', 600, dt('m-ambience')));
    poolDrag.current = null;
    const added = S().doc.clips.find((c) => c.mediaId === 'm-ambience')!;
    expect(added).toMatchObject({ trackId: 'A1', duration: 6, start: 11.5 });
  });
});

/* ---- R18f: keyboard cut styles (review P1-4/P2-2 — useKeys now mounts in
   Timeline, so the solo stories get the advertised shortcuts) ---- */

describe('R18e keyboard: [ / ] cut styles', () => {
  it('[ cuts head at the playhead (window listener from Timeline mount)', () => {
    render(<Timeline />);
    act(() => {
      S().select('c2');
      S().setPlayhead(6);
    });
    fireEvent.keyDown(window, { key: '[' });
    expect(S().doc.clips.find((c) => c.id === 'c2')!).toMatchObject({ start: 6, duration: 2 });
  });

  it('] cuts tail at the playhead', () => {
    render(<Timeline />);
    act(() => {
      S().select('c2');
      S().setPlayhead(5.5);
    });
    fireEvent.keyDown(window, { key: ']' });
    expect(S().doc.clips.find((c) => c.id === 'c2')!).toMatchObject({ start: 4.5, duration: 1 });
  });

  it('S still splits (the shortcut survived the useKeys move)', () => {
    render(<Timeline />);
    act(() => {
      S().select('c2');
      S().setPlayhead(6);
    });
    fireEvent.keyDown(window, { key: 's' });
    expect(S().doc.clips).toHaveLength(5);
  });

  it('typing [ in an input field is inert (input-target guard)', () => {
    render(<Timeline />);
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: '[' });
    expect(S().past).toHaveLength(0);
    input.remove();
  });
});

/* ---- R18f: DnD fallback branch (review P2-2) ---- */

describe('R18f DnD fallback: dataTransfer-only drop (registry miss)', () => {
  it('drop with poolDrag.current null still places via getData', () => {
    render(<Timeline />);
    const lane = screen.getByTestId('mini-lane-V1');
    poolDrag.current = null; // registry miss — cross-window style drag
    const ev = new MouseEvent('drop', { bubbles: true, cancelable: true, clientX: 696, clientY: 40 }); // +36: R18k head-rail origin
    Object.defineProperty(ev, 'dataTransfer', {
      value: {
        types: ['application/x-mini-media'],
        getData: (type: string) => (type === 'application/x-mini-media' ? 'm-lower' : ''),
        dropEffect: '',
      },
    });
    fireEvent(lane, ev);
    const added = S().doc.clips.find((c) => c.mediaId === 'm-lower')!;
    expect(added).toMatchObject({ trackId: 'V1', start: 13.5 });
  });

  it('dragover with unknown source is optimistically copy (affordance = outcome)', () => {
    render(<Timeline />);
    const lane = screen.getByTestId('mini-lane-V1');
    poolDrag.current = null;
    const transfer = { types: ['application/x-mini-media'], getData: () => 'x', dropEffect: '' };
    const ev = new MouseEvent('dragover', { bubbles: true, cancelable: true, clientX: 696, clientY: 40 }); // +36: R18k head-rail origin
    Object.defineProperty(ev, 'dataTransfer', { value: transfer });
    fireEvent(lane, ev);
    expect(transfer.dropEffect).toBe('copy');
  });
});

/* ---- R18f: collapsed audio lane (review P2-3) ---- */

describe('R18f collapsed audio lane placeholder', () => {
  it('hidden A1 renders a restore bar with the clip count', () => {
    render(<Timeline />);
    fireEvent.click(screen.getByTestId('mini-btn-audiolane'));
    const bar = screen.getByTestId('mini-lane-A1-collapsed');
    expect(bar).toHaveAttribute('aria-label', expect.stringContaining('1 clip preserved'));
    fireEvent.click(bar);
    expect(screen.getByTestId('mini-lane-A1')).toBeInTheDocument();
  });
});

/* ---- R18f wave-2: waveform sizing regression (the invisible-SVG P1) ---- */

describe('R18f wave-2: waveform SVG sizing law', () => {
  it('the waveform SVG carries explicit 100%/100% sizing (no viewBox-ratio blowout)', () => {
    render(<Timeline />);
    const svg = screen.getByTestId('mini-clip-c4').querySelector('svg.qc-track-item__waveform') as SVGSVGElement;
    // absolute replaced elements with inset:0 alone resolve height:auto from
    // the viewBox ratio — the sizing law is pinned inline AND in CSS
    expect(svg.style.width).toBe('100%');
    expect(svg.style.height).toBe('100%');
    expect(svg.getAttribute('preserveAspectRatio')).toBe('none');
  });
});

/* ---- R18j (thread #13): the minimized timeline strip --------------
   The tools row hides, the VIDEO pills collapse into one compact strip
   (R18k thread #21: the audio sub-row is expanded-mode only), the slim
   ruler seeks, and the SAME gesture engine keeps dragging / trimming /
   arranging live. */

describe('R18j minimized timeline (thread #13)', () => {
  it('minimize hides the tools, renders the compact strip with the video pill row', () => {
    render(<Timeline />);
    fireEvent.click(screen.getByTestId('mini-btn-timeline-min'));
    expect(screen.getByTestId('mini-timeline-min')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-timeline-tools')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mini-lane-V1')).not.toBeInTheDocument(); // full lanes gone
    expect(screen.getByTestId('mini-min-lane-V1')).toBeInTheDocument(); // the video pill row lives
    // R18k (thread #21): the A1 sub-row is GONE in minimized mode — the
    // strip is the video navigation surface; audio editing happens
    // expanded (A1 can de-sync from V1, so its pills would mislead)
    expect(screen.queryByTestId('mini-min-lane-A1')).not.toBeInTheDocument();
    expect(screen.getByTestId('mini-clip-c1')).toBeInTheDocument(); // same clip testids
    expect(screen.getByTestId('mini-clip-c1')).toHaveClass('qc-track-item--pill');
    // the audio clip c4 lives on A1 — not rendered in the strip either
    expect(screen.queryByTestId('mini-clip-c4')).not.toBeInTheDocument();
    expect(screen.getByTestId('mini-playhead')).toBeInTheDocument(); // still scrubbable
    // pills render no filmstrip/waveform bodies — label-only
    expect(screen.getByTestId('mini-clip-c1').querySelector('.qc-track-item__filmstrip')).toBeNull();
  });

  it('the slim ruler still seeks (click sets the playhead)', () => {
    render(<Timeline />);
    fireEvent.click(screen.getByTestId('mini-btn-timeline-min'));
    fireEvent.pointerDown(screen.getByTestId('mini-ruler'), {
      button: 0,
      pointerId: 9,
      clientX: 96, // 48pps → 2.0s (content origin x=0 in jsdom)
    });
    expect(S().playhead).toBe(2);
  });

  it('dragging a pill still moves the clip — same engine, one history entry', () => {
    render(<Timeline />);
    fireEvent.click(screen.getByTestId('mini-btn-timeline-min'));
    const c2 = screen.getByTestId('mini-clip-c2'); // 4.5→8, grab offset honored
    drag(c2, 250, 300); // 5px threshold crossed → active drag → +50px ≈ +1.04s
    // R21 (user P0 revert): raw = 4.5 + 50/48 = 5.5417; span end 9.0417
    // would overlap c3@9 → the clamp parks the mover at 9 − 3.5 = 5.5
    expect(S().doc.clips.find((x) => x.id === 'c2')!.start).toBe(5.5);
    expect(S().doc.clips.find((x) => x.id === 'c2')!.trackId).toBe('V1');
    expect(S().doc.clips.find((x) => x.id === 'c3')!.start).toBe(9); // NEVER pushed
    expect(S().past).toHaveLength(1); // exactly one entry for the gesture
  });

  it('trim zones still work on pills (pointer trim from the edge)', () => {
    render(<Timeline />);
    fireEvent.click(screen.getByTestId('mini-btn-timeline-min'));
    // toX 202: (202−10)/48 = exactly 4.0s — the end handle drags the edge there
    drag(screen.getByTestId('mini-trim-end-c1'), 165, 202); // c1 0→3.5 → end to 4.0s
    expect(S().doc.clips.find((x) => x.id === 'c1')!.duration).toBe(4);
  });

  it('expand restores the full timeline (tools + lanes)', () => {
    render(<Timeline />);
    fireEvent.click(screen.getByTestId('mini-btn-timeline-min'));
    fireEvent.click(screen.getByTestId('mini-btn-timeline-expand'));
    expect(screen.getByTestId('mini-timeline-tools')).toBeInTheDocument();
    expect(screen.getByTestId('mini-lane-V1')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-timeline-min')).not.toBeInTheDocument();
    expect(S().timelineMinimized).toBe(false);
  });

  it('the compact ruler thins its labels (every-other)', () => {
    render(<Timeline />);
    fireEvent.click(screen.getByTestId('mini-btn-timeline-min'));
    // 48pps → normal step 2s labels; compact = every 4s
    const marks = screen.getAllByTestId(/^mini-clip-/); // sanity: strip rendered
    expect(marks.length).toBeGreaterThan(0);
    const labels = screen.getAllByText(/^00:\d{2}$/).map((el) => el.textContent);
    expect(labels).toContain('00:00');
    expect(labels).not.toContain('00:02'); // thinned out in compact mode
    expect(labels).toContain('00:04');
  });

  it('pool drags still land on the pill row (video→V; the strip is video-only since R18k)', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('mini-btn-timeline-min'));
    poolDrag.current = 'm-lower'; // image 2.5s → V1
    // jsdom/RTL trap (documented in the R18e suite above): fireEvent's
    // dataTransfer events DROP clientX — dispatch a real MouseEvent with
    // the type string and inject the dataTransfer stub
    const dtLower = {
      types: ['application/x-mini-media'],
      getData: (type: string) => (type === 'application/x-mini-media' ? 'm-lower' : ''),
    };
    const ev = (type: 'dragover' | 'drop', x: number) => {
      const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 12 });
      Object.defineProperty(e, 'dataTransfer', { value: dtLower });
      return e;
    };
    const lane = screen.getByTestId('mini-min-lane-V1');
    fireEvent(lane, ev('dragover', 660)); // (660−10)/48 ≈ 13.5s = past the tail
    fireEvent(lane, ev('drop', 660));
    poolDrag.current = null;
    const added = S().doc.clips.find((c) => c.mediaId === 'm-lower')!;
    expect(added).toBeDefined();
    expect(added.trackId).toBe('V1');
  });
});

/* ---- R18k: track binding + video-only mode (threads #21/#23/#3) --- */

describe('R18k track binding rendering', () => {
  beforeEach(() => {
    S().reset(); // this suite owns its world (multiTrackDoc etc.) — restore per test
  });

  it('seed project: no track selectors (single pair — plain labels are gone, nothing replaces them)', () => {
    render(<Timeline />);
    // the old plain V1/A1 badges are gone entirely (thread #3: dropdown or invisible)
    expect(screen.queryByTestId('mini-track-select-video')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mini-track-select-audio')).not.toBeInTheDocument();
  });

  it('multi-track project: lane heads are SELECTORS listing the candidates', () => {
    useMini.setState({ doc: multiTrackDoc() });
    render(<Timeline />);
    const videoSel = screen.getByTestId('mini-track-select-video').querySelector('select') as HTMLSelectElement;
    const audioSel = screen.getByTestId('mini-track-select-audio').querySelector('select') as HTMLSelectElement;
    expect(Array.from(videoSel.options).map((o) => o.value)).toEqual(['V1', 'V2']);
    expect(Array.from(audioSel.options).map((o) => o.value)).toEqual(['A1', 'A2']);
    expect(videoSel.value).toBe('V1');
    // lanes render the bound pair only — V2/A2 content is out of this window
    expect(screen.getByTestId('mini-lane-V1')).toBeInTheDocument();
    expect(screen.getByTestId('mini-lane-A1')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-lane-V2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mini-clip-c5')).not.toBeInTheDocument();
  });

  it('changing the video selector rebinds the lane (V2 clips arrive, V1 leave)', () => {
    useMini.setState({ doc: multiTrackDoc(), selectedId: 'c2' });
    render(<Timeline />);
    fireEvent.change(screen.getByTestId('mini-track-select-video').querySelector('select')!, {
      target: { value: 'V2' },
    });
    expect(S().boundVideoTrack).toBe('V2');
    expect(screen.getByTestId('mini-clip-c5')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-clip-c1')).not.toBeInTheDocument();
    expect(S().selectedId).toBeNull(); // c2 left the visible world — not a trap
  });

  it('locked binding: selectors are invisible (host-injected environment)', () => {
    useMini.setState({ doc: multiTrackDoc(), trackBindingLocked: true });
    render(<Timeline />);
    expect(screen.queryByTestId('mini-track-select-video')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mini-track-select-audio')).not.toBeInTheDocument();
  });

  it('video-only mode: ONE lane, no audio lane, no audio-lane eye toggle', () => {
    useMini.setState({ doc: multiTrackDoc(), trackMode: 'video' });
    render(<Timeline />);
    expect(screen.getByTestId('mini-lane-V1')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-lane-A1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mini-btn-audiolane')).not.toBeInTheDocument();
    expect(screen.getByTestId('mini-btn-filmstrip')).toBeInTheDocument(); // video toggles stay
    expect(screen.getByTestId('mini-clip-c1')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-clip-c4')).not.toBeInTheDocument(); // A1 clips out of the world
  });

  it('ruler extent follows the BOUND world (V2 ends at 12, not the doc max)', () => {
    useMini.setState({ doc: multiTrackDoc(), trackMode: 'video', boundVideoTrack: 'V2' });
    render(<Timeline />);
    // V2 clips: c5 1→6.5, c6 8→12 → contentEnd 12; seed V1+A1 world would end 12.5
    expect(S().rulerEnd).toBe(12);
  });

  it('minimized strip in video-only mode: the single video pill row (audio never appears)', () => {
    useMini.setState({ doc: multiTrackDoc(), trackMode: 'video' });
    render(<Timeline />);
    fireEvent.click(screen.getByTestId('mini-btn-timeline-min'));
    expect(screen.getByTestId('mini-min-lane-V1')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-min-lane-A1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mini-min-lane-V2')).not.toBeInTheDocument();
  });

  it('toolbar: the minimize toggle leads the row (thread #2)', () => {
    render(<Timeline />);
    const tools = screen.getByTestId('mini-timeline-tools');
    const groups = tools.querySelectorAll('.qc-toolbar__group');
    const firstGroupButtons = groups[0].querySelectorAll('button');
    expect(firstGroupButtons[0]).toHaveAttribute('data-testid', 'mini-btn-timeline-min');
  });
});

/* ---- R18k review fixes: head rail + heal + keyboard surface ------- */

describe('R18k review-fix hardening', () => {
  beforeEach(() => {
    S().reset();
  });

  it('the head rail renders one cell per lane — never a selector over a clip', () => {
    render(<Timeline />);
    // seed: V1 + A1 lanes → 2 head cells, both WITHOUT selectors (single pair)
    expect(screen.getByTestId('mini-track-head-V1')).toBeInTheDocument();
    expect(screen.getByTestId('mini-track-head-A1')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-track-select-video')).not.toBeInTheDocument();
    // the selector lives in the head cell, NOT inside the lane content
    act(() => {
      useMini.setState({ doc: multiTrackDoc() });
    });
    const sel = screen.getByTestId('mini-track-select-video');
    const lane = screen.getByTestId('mini-lane-V1');
    expect(lane.contains(sel)).toBe(false); // review P1-1: never over a clip
    expect(screen.getByTestId('mini-track-head-V1').contains(sel)).toBe(true);
  });

  it('stale binding heals on doc swap (no silent empty world — review P2-2)', () => {
    useMini.setState({ doc: multiTrackDoc(), boundVideoTrack: 'V2', boundAudioTrack: 'A2' });
    render(<Timeline />);
    // swap the doc under the binding (a story control / host injection)
    act(() => {
      useMini.setState({ doc: seedDoc() });
    });
    // the heal effect falls both bindings back to the seed doc's tracks
    expect(S().boundVideoTrack).toBe('V1');
    expect(S().boundAudioTrack).toBe('A1');
    expect(screen.getByTestId('mini-lane-V1')).toBeInTheDocument();
    expect(screen.getByTestId('mini-clip-c1')).toBeInTheDocument();
  });

  it('useKeys skips a focused SELECT (review P2-4): no split while the dropdown is open', () => {
    useMini.setState({ doc: multiTrackDoc(), selectedId: 'c1' });
    render(<Timeline />);
    const sel = screen.getByTestId('mini-track-select-video').querySelector('select')!;
    const clipsBefore = S().doc.clips.length;
    fireEvent.keyDown(sel, { key: 's' });
    expect(S().doc.clips).toHaveLength(clipsBefore); // the select owns its keys
    // same key on a neutral target still splits
    fireEvent.keyDown(document.body, { key: 's' });
    expect(S().doc.clips).toHaveLength(clipsBefore + 1);
  });
});

/* ---- R18k (panel thread #1): trim-mode edge shade ------------------- */

describe('R18k trim-mode edge shade (panel thread #1)', () => {
  beforeEach(() => {
    S().reset();
  });

  it('the trimming class engages with the trim gesture and leaves with it', () => {
    render(<Timeline />);
    const clip = screen.getByTestId('mini-clip-c1');
    const zone = screen.getByTestId('mini-trim-end-c1');
    expect(clip.className).not.toContain('is-trimming');
    // engage: pointerdown + cross the 5px threshold
    fireEvent.pointerDown(zone, { button: 0, pointerId: 9, clientX: 165, clientY: 10 });
    fireEvent.pointerMove(zone, { pointerId: 9, clientX: 171, clientY: 10 });
    expect(clip.className).toContain('is-trimming-end'); // the shade is ON mid-gesture
    expect(clip.className).toContain('is-dragging');
    // release: the shade leaves with the gesture
    fireEvent.pointerUp(zone, { pointerId: 9, clientX: 175, clientY: 10 });
    expect(clip.className).not.toContain('is-trimming-end');
    expect(clip.className).not.toContain('is-dragging');
  });

  it('a MOVE gesture never paints the trimming shade', () => {
    render(<Timeline />);
    const clip = screen.getByTestId('mini-clip-c2');
    drag(clip, 250, 300);
    expect(clip.className).not.toContain('is-trimming');
  });
});

/* ---- R19: drag insert affordances, ghost edges, track selection ---- */

describe('R22 — the plain commit law (R18k restored): the UP seals the last preview', () => {
  it('a fast flick commits the LAST PREVIEWED MOVE, not the up coordinates (commit-at-UP retired)', () => {
    render(<Timeline />);
    const c2 = screen.getByTestId('mini-clip-c2');
    // activate the gesture with a small move, then RELEASE at +96px with
    // NO intermediate move there — the R18k law commits the previewed
    // (last-move) state; the up position itself never re-applies
    fireEvent.pointerDown(c2, { button: 0, pointerId: 7, clientX: 216, clientY: 10 });
    fireEvent.pointerMove(c2, { pointerId: 7, clientX: 222, clientY: 10 });
    fireEvent.pointerUp(c2, { pointerId: 7, clientX: 216 + 96, clientY: 10 });
    // raw at the last move = 4.5 + (222−216)/48 = 4.625 — inside the clamp
    // span [3.5, 5.5]; committed as-is, one history entry
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBeCloseTo(4.625, 5);
    expect(S().past).toHaveLength(1);
  });
});

describe('R6 — the single-edge LIVE magnet, pinned at component level (the R22 flagship law)', () => {
  it('a snap-on drag within 12px of c1’s end snaps to it and paints the guide at the target', () => {
    render(<Timeline />);
    setStore(() => S().toggleSnap()); // snap ON
    const c2 = screen.getByTestId('mini-clip-c2');
    // grab c2 (start 4.5) at 216 — grabOffset ≈ −0.958s; park the pointer at
    // 169 → raw ≈ 3.52, i.e. 0.96px from the c1-end target 3.5
    fireEvent.pointerDown(c2, { button: 0, pointerId: 8, clientX: 216, clientY: 10 });
    fireEvent.pointerMove(c2, { pointerId: 8, clientX: 222, clientY: 10 }); // activate
    fireEvent.pointerMove(c2, { pointerId: 8, clientX: 169, clientY: 10 });
    // the LEFT edge magnetized to 3.5 exactly (guide at 46 + 3.5·48 = 214)
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(3.5);
    const guide = screen.getByTestId('mini-snap-guide');
    expect(guide.style.left).toBe('214px');
    // the guide leaves with the gesture
    fireEvent.pointerUp(c2, { pointerId: 8, clientX: 169, clientY: 10 });
    expect(screen.queryByTestId('mini-snap-guide')).toBeNull();
  });

  it('the playhead target is read LIVE mid-gesture (a moving playhead catches the magnet)', () => {
    render(<Timeline />);
    setStore(() => S().toggleSnap());
    const c2 = screen.getByTestId('mini-clip-c2');
    fireEvent.pointerDown(c2, { button: 0, pointerId: 9, clientX: 216, clientY: 10 });
    fireEvent.pointerMove(c2, { pointerId: 9, clientX: 222, clientY: 10 }); // activate
    // playback moves the playhead INTO the clamp span mid-gesture; a
    // frozen pre-drag field would still carry the old target (playhead 0)
    // and never magnetize (raw ≈ 4.22 stays raw)
    act(() => useMini.setState({ playhead: 4.2 }));
    fireEvent.pointerMove(c2, { pointerId: 9, clientX: 203, clientY: 10 }); // raw ≈ 4.229
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.2); // snapped to the LIVE playhead
    fireEvent.pointerUp(c2, { pointerId: 9, clientX: 203, clientY: 10 });
  });
});

describe('R21 (user P0 revert) — neighbors NEVER move mid-gesture (the law every round agreed on), the mover CLAMPS', () => {
  it('dragging c2 across c3: c3/c1 hold their snapshot positions; the mover clamps at the neighbor edge', () => {
    render(<Timeline />);
    const c2 = screen.getByTestId('mini-clip-c2');
    fireEvent.pointerDown(c2, { button: 0, pointerId: 7, clientX: 216, clientY: 10 });
    fireEvent.pointerMove(c2, { pointerId: 7, clientX: 222, clientY: 10 }); // activate
    // sweep right across c3's span — the R19 law teleported c3 here
    for (const x of [300, 400, 500, 516, 400, 300]) {
      fireEvent.pointerMove(c2, { pointerId: 7, clientX: x, clientY: 10 });
      expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(9); // FROZEN
      expect(S().doc.clips.find((c) => c.id === 'c1')!.start).toBe(0); // FROZEN
      // the mover itself clamps at c3's edge — never overlaps, never escapes
      expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.5);
    }
    // release mid-sweep: the clamped position commits; neighbors frozen
    fireEvent.pointerUp(c2, { pointerId: 7, clientX: 516, clientY: 10 });
    expect(S().doc.clips.find((c) => c.id === 'c2')!.trackId).toBe('V1');
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.5);
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(9);
  });

  it('R21 (user P0 revert): the locked window no longer refuses — the clamp law has no conflicts', () => {
    render(<Timeline />);
    act(() => {
      useMini.setState({ trackBindingLocked: true });
    });
    const c3 = screen.getByTestId('mini-clip-c3');
    fireEvent.pointerDown(c3, { button: 0, pointerId: 7, clientX: 432, clientY: 10 });
    fireEvent.pointerMove(c3, { pointerId: 7, clientX: 438, clientY: 10 }); // activate
    fireEvent.pointerMove(c3, { pointerId: 7, clientX: 150, clientY: 10 }); // onto c1
    // the mover clamps at c2's tail (8) — the preview IS the commit
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(8);
    expect(S().doc.clips.find((c) => c.id === 'c1')!.start).toBe(0);
    fireEvent.pointerUp(c3, { pointerId: 7, clientX: 150, clientY: 10 });
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(8);
    expect(S().past).toHaveLength(1); // plain commit — no refusal path exists
  });
});

describe('R20 — untrusted pointer capture never kills a gesture (live-caught bug)', () => {
  it('a THROWING setPointerCapture is swallowed; the drag still runs and commits', () => {
    render(<Timeline />);
    const c2 = screen.getByTestId('mini-clip-c2');
    const proto = HTMLElement.prototype as unknown as {
      setPointerCapture: (id: number) => void;
    };
    const original = proto.setPointerCapture;
    proto.setPointerCapture = () => {
      throw new DOMException('Invalid pointer id', 'NotFoundError');
    };
    try {
      expect(() => {
        fireEvent.pointerDown(c2, { button: 0, pointerId: 7, clientX: 216, clientY: 10 });
        fireEvent.pointerMove(c2, { pointerId: 7, clientX: 222, clientY: 10 });
      }).not.toThrow();
      expect(S().dragActive).toBe(true); // the session engaged despite the throw
      fireEvent.pointerUp(c2, { pointerId: 7, clientX: 216 + 48, clientY: 10 });
      // R18k law (R22): the UP seals the LAST PREVIEWED move (x=222 →
      // 4.5 + 6/48 = 4.625); the up coordinates never re-apply
      expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBeCloseTo(4.625, 5);
      expect(S().past).toHaveLength(1);
    } finally {
      proto.setPointerCapture = original;
    }
  });
});

describe('R19 — lane empty-area track selection (thread #26)', () => {
  it('pointerdown on the empty lane surface selects the track', () => {
    render(<Timeline />);
    const lane = screen.getByTestId('mini-lane-V1');
    fireEvent.pointerDown(lane, { button: 0, clientX: 400, clientY: 10 });
    expect(S().selectedTrackId).toBe('V1');
    expect(S().selectedId).toBeNull();
  });

  it('pointerdown on a CLIP does not select the track (bubbling stopped)', () => {
    render(<Timeline />);
    fireEvent.pointerDown(screen.getByTestId('mini-clip-c2'), { button: 0, clientX: 220, clientY: 10 });
    expect(S().selectedId).toBe('c2');
    expect(S().selectedTrackId).toBeNull();
    fireEvent.pointerUp(screen.getByTestId('mini-clip-c2'), { pointerId: 1, clientX: 220, clientY: 10 });
  });

  it('the track selection replaces a clip selection (one inspector subject)', () => {
    render(<Timeline />);
    S().select('c2');
    fireEvent.pointerDown(screen.getByTestId('mini-lane-V1'), { button: 0, clientX: 400, clientY: 10 });
    expect(S().selectedTrackId).toBe('V1');
    expect(S().selectedId).toBeNull();
  });
});

describe('R19 — track heads (thread #28: markers vs selectors vs hidden)', () => {
  it('single-pair project: V1/A1 marker badges render and select the track', () => {
    render(<Timeline />);
    const marker = screen.getByTestId('mini-track-marker-V1');
    expect(marker).toHaveTextContent('V1');
    expect(screen.getByTestId('mini-track-marker-A1')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-track-select-video')).toBeNull();
    fireEvent.click(marker);
    expect(S().selectedTrackId).toBe('V1');
  });

  it('multi-track project: selectors render, no marker badges', () => {
    useMini.setState({ doc: multiTrackDoc() });
    render(<Timeline />);
    expect(screen.getByTestId('mini-track-select-video')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-track-marker-V1')).toBeNull();
  });

  it('LOCKED (embedded): neither marker nor selector — the head is hidden', () => {
    useMini.setState({ doc: multiTrackDoc(), trackBindingLocked: true });
    render(<Timeline />);
    expect(screen.queryByTestId('mini-track-select-video')).toBeNull();
    expect(screen.queryByTestId('mini-track-marker-V1')).toBeNull();
  });

  it('single-pair + LOCKED (the embedded default): no marker either', () => {
    useMini.setState({ trackBindingLocked: true });
    render(<Timeline />);
    expect(screen.queryByTestId('mini-track-marker-V1')).toBeNull();
    expect(screen.queryByTestId('mini-track-marker-A1')).toBeNull();
  });
});

/* ---- PR69 (review round): the flagged laws, pinned ---- */

describe('PR69 C47: collapsed-audio-bar DnD routing (mutation-proven gap)', () => {
  const dragEvent = (type: 'dragover' | 'drop', x: number, transfer: object) => {
    const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 40 });
    Object.defineProperty(ev, 'dataTransfer', { value: transfer });
    return ev;
  };
  const dt = (mediaId: string) => ({
    types: ['application/x-mini-media'],
    getData: (type: string) => (type === 'application/x-mini-media' ? mediaId : ''),
    dropEffect: '',
  });

  it('dragOver + AUDIO drop restores the lane and places the clip', () => {
    render(<Timeline />);
    fireEvent.click(screen.getByTestId('mini-btn-audiolane')); // hide A1
    const bar = screen.getByTestId('mini-lane-A1-collapsed');
    poolDrag.current = 'm-ambience';
    const transfer = dt('m-ambience');
    fireEvent(bar, dragEvent('dragover', 600, transfer));
    expect(transfer.dropEffect).toBe('copy');
    fireEvent(bar, dragEvent('drop', 600, transfer));
    poolDrag.current = null;
    // the lane came back AND the clip landed on it (the old test only pinned
    // click-restore; deleting the whole onDrop body left the suite green)
    expect(screen.getByTestId('mini-lane-A1')).toBeInTheDocument();
    const added = S().doc.clips.find((c) => c.mediaId === 'm-ambience')!;
    expect(added).toMatchObject({ trackId: 'A1' });
    expect(added.start).toBeGreaterThan(0);
  });

  it('PR69 C54: wrong-kind (video) drop on the collapsed bar refuses WITH a toast — no silent dead zone', () => {
    render(<Timeline />);
    fireEvent.click(screen.getByTestId('mini-btn-audiolane')); // hide A1
    const bar = screen.getByTestId('mini-lane-A1-collapsed');
    poolDrag.current = 'm-drone';
    fireEvent(bar, dragEvent('drop', 600, dt('m-drone')));
    poolDrag.current = null;
    // the lane stays hidden (a refusal must not resurrect it)...
    expect(screen.getByTestId('mini-lane-A1-collapsed')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-lane-A1')).toBeNull();
    // ...but the feedback parity holds: insertMediaAt's kind-routing toast
    expect(S().toast?.text).toContain('video media belongs on V1');
    expect(S().doc.clips.filter((c) => c.trackId === 'A1')).toHaveLength(1); // nothing placed
    expect(S().past).toHaveLength(0); // no history for a refusal
  });
});

describe('PR69 C2/C46: the clip is a real button (Enter selects, Space is the transport)', () => {
  it('clips expose role=button + aria-pressed (WCAG 4.1.2)', () => {
    render(<Timeline />);
    const clip = screen.getByTestId('mini-clip-c2');
    expect(clip).toHaveAttribute('role', 'button');
    expect(clip).toHaveAttribute('aria-pressed', 'false');
    act(() => S().select('c2'));
    expect(screen.getByTestId('mini-clip-c2')).toHaveAttribute('aria-pressed', 'true');
  });

  it('Enter on the focused clip selects; SPACE falls through to the global transport (D3.8)', () => {
    render(<Timeline />);
    act(() => S().select(null));
    const clip = screen.getByTestId('mini-clip-c1');
    fireEvent.keyDown(clip, { key: 'Enter' });
    expect(S().selectedId).toBe('c1');
    // the old handler swallowed Space at the target layer — Play/Pause was
    // dead after any clip click (the most common editing state)
    fireEvent.keyDown(clip, { key: ' ' });
    expect(S().playing).toBe(true);
  });
});

describe('PR69 C9: a clip unmounting mid-gesture releases the lock', () => {
  it('unmount with an active drag clears dragActive and the surface heals on remount', () => {
    const view = render(<Timeline />);
    const clip = screen.getByTestId('mini-clip-c2');
    fireEvent.pointerDown(clip, { button: 0, pointerId: 12, clientX: 264, clientY: 10 });
    fireEvent.pointerMove(clip, { pointerId: 12, clientX: 300, clientY: 10 }); // 5px crossed → lock
    expect(S().dragActive).toBe(true);
    view.unmount(); // story switch / HMR / parent-driven unmount
    expect(S().dragActive).toBe(false);
    // the keyboard surface works again after the swap: a FRESH mount gets
    // its useKeys listener back and a real edit commits (no lock trap)
    render(<Timeline />);
    setStore(() => useMini.setState({ playhead: 2, selectedId: null }));
    fireEvent.keyDown(window, { key: 's' });
    expect(S().doc.clips).toHaveLength(5); // c1 split — the surface is live
  });
});

describe('PR69 C7b: the zoom slider announces units', () => {
  it('aria-valuetext carries the px/s scale', () => {
    render(<Timeline />);
    const slider = screen.getByTestId('mini-zoom-slider');
    expect(slider).toHaveAttribute('aria-valuetext', '48 pixels per second');
    setStore(() => S().setZoomStep(0));
    expect(screen.getByTestId('mini-zoom-slider')).toHaveAttribute('aria-valuetext', '24 pixels per second');
  });
});

describe('PR69 C7a: zoom anchors at the playhead', () => {
  it('a zoom step change keeps the playhead at its viewport offset (scrollLeft re-derives from the anchor)', () => {
    const io = interceptScrollLeft();
    try {
      render(<Timeline />);
      setStore(() => S().setPlayhead(6)); // 6s at the default 48pps
      // the user panned: scrollLeft 100 → the playhead sits 6*48 − 100 = 188px
      // into the viewport
      io.state.val = 100;
      setStore(() => S().setZoomStep(3)); // 48 → 72pps
      // anchorPx = 188 → scrollLeft' = 6*72 − 188 = 244: the playhead keeps
      // its exact viewport offset instead of walking off-screen (the old law
      // kept scrollLeft fixed and the content moved under the playhead)
      expect(io.sets).toContain(244);
      expect(io.state.val).toBe(244);
    } finally {
      io.restore();
    }
  });
});


/* ---- R2 (opus review round 1): the P2 fixes, pinned ---- */

describe('R2: pointercancel never leaves a scrub gesture stuck (R1-b P2-1/P2-2)', () => {
  it('playhead handle: cancel releases dragging — hover moves do NOT scrub', () => {
    render(<Timeline />);
    const ph = screen.getByTestId('mini-playhead');
    fireEvent.pointerDown(ph, { button: 0, pointerId: 9, clientX: 46, clientY: 20 });
    fireEvent.pointerMove(ph, { pointerId: 9, clientX: 282, clientY: 20 });
    expect(S().playhead).toBeCloseTo((282 - 46) / 48, 5);
    // a browser gesture interrupts the touch/pen scrub
    fireEvent.pointerCancel(ph, { pointerId: 9, clientX: 282, clientY: 20 });
    // hover moves with NO button held must be inert now (the old bug:
    // dragging stayed true and the playhead followed the hover)
    fireEvent.pointerMove(ph, { pointerId: 9, buttons: 0, clientX: 500, clientY: 20 });
    expect(S().playhead).toBeCloseTo((282 - 46) / 48, 5); // unchanged
  });

  it('viewer scrub bar: cancel releases dragging — hover moves do NOT seek', () => {
    render(<App />);
    const bar = screen.getByTestId('mini-viewer-scrub');
    fireEvent.pointerDown(bar, { button: 0, pointerId: 4, clientX: 100, clientY: 20 });
    fireEvent.pointerCancel(bar, { pointerId: 4, clientX: 100, clientY: 20 });
    fireEvent.pointerMove(bar, { pointerId: 4, buttons: 0, clientX: 400, clientY: 20 });
    expect(S().playhead).toBe(0); // jsdom rect 0 → the hover seek would move it if armed
  });
});

describe('R2: trim handles are keyboard-activatable (R1-a #4)', () => {
  it('Space on the focused trim handle steps the edge (was a dead key after the C1 yield)', () => {
    render(<Timeline />);
    setStore(() => S().select('c1')); // tabIndex only when selected
    const handle = screen.getByTestId('mini-trim-end-c1');
    // keyboard-activation clicks carry detail 0 (browsers) — RTL's
    // fireEvent.click defaults to detail 0 too
    fireEvent.click(handle);
    // c1 [0,3.5] media 4.5s: end +0.5 = 4.0 (within the media + neighbor bound)
    expect(S().doc.clips.find((c) => c.id === 'c1')!.duration).toBe(4);
    expect(S().past).toHaveLength(1);
  });
});

describe('R2: ruler extent re-publish (R1-b P2-4)', () => {
  it('a same-extent reset re-publishes the ruler extent — scrubs reach the painted surface', () => {
    render(<Timeline />);
    expect(S().rulerEnd).toBeCloseTo(12.5, 5); // published on mount
    setStore(() => S().reset()); // reset floors rulerEnd to 8; the doc is extent-identical
    expect(S().rulerEnd).toBeCloseTo(12.5, 5); // re-published (doc joined the deps; act flushed the effect)
    setStore(() => S().setPlayhead(10));
    expect(S().playhead).toBe(10); // the old bug: clamped at 8
  });
});

/* ---- R2-a round 3: the review-fix regressions pinned ----------------
   P2-2 (every resize re-anchored the scroll) + P3-a (the App ternary
   remounted the Timeline; the stash cleanup raced the ref re-attach).
   The P2-1 edge-stop and P3-b/P3-c pending-window nets retired with the
   R22 machinery sweep — their subjects no longer exist (README #39). */

/** jsdom clamps programmatic scrollLeft to 0 — intercept reads AND
 *  writes on the prototype so the stash + restore law is observable. */
const interceptScrollLeft = () => {
  const proto = [HTMLElement.prototype, Element.prototype].find((p) =>
    Object.getOwnPropertyDescriptor(p, 'scrollLeft'),
  )!;
  const desc = Object.getOwnPropertyDescriptor(proto, 'scrollLeft')!;
  const sets: number[] = [];
  const state = { val: 0 };
  Object.defineProperty(proto, 'scrollLeft', {
    configurable: true,
    get: () => state.val,
    set: (v: number) => {
      sets.push(Math.round(v * 100) / 100);
      state.val = v;
    },
  });
  return { sets, state, restore: () => Object.defineProperty(proto, 'scrollLeft', desc) };
};

describe('R2-a round 3 — scroll preservation (P2-2/P3-a)', () => {
  it('the minimize/expand roundtrip restores the leftmost visible time exactly (300 → 336 → 300)', () => {
    const io = interceptScrollLeft();
    try {
      render(<Timeline />);
      const full = screen.getByTestId('mini-timeline-scroll');
      // the user pans to scrollLeft 300 — the CONTINUOUS stash records
      // the origin-corrected time: (300 + RENDER_ORIGIN 46)/48
      io.state.val = 300;
      fireEvent.scroll(full);
      fireEvent.click(screen.getByTestId('mini-btn-timeline-min'));
      // min origin 10: the swap-restore lands (300+46) − 10 = 336
      expect(io.sets).toContain(336);
      // no min-mode scroll event re-seeds the stash (jsdom fires none on
      // assignment) — the expand restore returns to the exact origin time
      fireEvent.click(screen.getByTestId('mini-btn-timeline-expand'));
      expect(io.sets[io.sets.length - 1]).toBe(300);
      // the single-slot law: the mount-restore (stash 0 → 0) is the ONLY
      // extra write; a remount would have reset the stash and restored 0
      expect(io.sets).toEqual([0, 336, 300]);
    } finally {
      io.restore();
    }
  });

  it('a window resize never re-anchors the scroll (the R21c law snapped 500 → 0)', () => {
    const io = interceptScrollLeft();
    try {
      render(<Timeline />);
      const full = screen.getByTestId('mini-timeline-scroll') as HTMLElement;
      // R3-a F2: stub a REAL width — jsdom's clientWidth=0 hid the old
      // law's `if (w > 0)`-guarded re-anchor entirely (the exact blind
      // spot that let P2-2 ship: this net passed on the broken code)
      Object.defineProperty(full, 'clientWidth', { configurable: true, get: () => 800 });
      io.state.val = 500;
      fireEvent.scroll(full);
      const writes = io.sets.length;
      // jsdom has no ResizeObserver → the fallback listener path runs
      fireEvent(window, new Event('resize'));
      expect(io.sets.slice(writes)).toEqual([]); // measure only re-ports width
      expect(io.state.val).toBe(500); // the pan survives the resize
    } finally {
      io.restore();
    }
  });
});

describe('R2-a → R22 — surface swaps (the pending window is retired; keys stay live)', () => {
  it('a minimize flip mid-scrub leaves the keyboard surface live (the pending window is retired — R22)', () => {
    render(<Timeline />);
    fireEvent.pointerDown(screen.getByTestId('mini-ruler'), {
      button: 0,
      pointerId: 22,
      clientX: 120,
    });
    // the surface swap unmounts the scrubbing RulerScrub with no pointerup —
    // the R18k law has NO shared window to strand: the keys stay live through
    // the flip (the R22 sweep deleted the pending-gesture machinery)
    fireEvent.click(screen.getByTestId('mini-btn-timeline-min'));
    setStore(() => S().trimClip('c1', 'end', 3));
    expect(S().doc.clips.find((c) => c.id === 'c1')!.duration).toBe(3);
    expect(S().past).toHaveLength(1);
  });
});

/* ---- R6 (R5-a/R5-b review round): the R22 law family, discriminated ---- */

describe('R6 — the stateless ruler law (R18k)', () => {
  it('hover moves with NO button held never scrub (the buttons gate is the whole state machine)', () => {
    render(<Timeline />);
    const ruler = screen.getByTestId('mini-ruler');
    fireEvent.pointerDown(ruler, { button: 0, pointerId: 40, clientX: 100 });
    expect(S().playhead).toBeCloseTo(100 / 48, 5); // the down-seek
    // a hover (buttons: 0) after the release-ish drift must be inert — the
    // R18k ruler has no dragging state to strand
    fireEvent.pointerUp(ruler, { pointerId: 40, clientX: 100 });
    fireEvent.pointerMove(ruler, { pointerId: 40, buttons: 0, clientX: 500 });
    expect(S().playhead).toBeCloseTo(100 / 48, 5); // unchanged
  });
});

describe('R6 — the edge-park law: scrub surfaces NEVER glide (R22)', () => {
  it('a scrub pointer parked at the viewport edge requests NO frames and moves NO scroll', () => {
    const io = interceptScrollLeft();
    // manual rAF queue: any frame the scrub surfaces request would land here
    let queue: FrameRequestCallback[] = [];
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(((cb: FrameRequestCallback) => {
      queue.push(cb);
      return 1;
    }) as typeof window.requestAnimationFrame);
    try {
      render(<Timeline />);
      const scroll = screen.getByTestId('mini-timeline-scroll') as HTMLElement;
      Object.defineProperty(scroll, 'clientWidth', { configurable: true, get: () => 800 });
      scroll.getBoundingClientRect = () =>
        ({ left: 0, right: 800, width: 800, top: 0, bottom: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
      const ruler = screen.getByTestId('mini-ruler');
      // down + move parked 10px inside the right edge — the R21-era
      // useEdgeAutoScroll would spin a glide loop here; the R22 law has none
      fireEvent.pointerDown(ruler, { button: 0, pointerId: 41, clientX: 790 });
      fireEvent.pointerMove(ruler, { pointerId: 41, buttons: 1, clientX: 790 });
      act(() => {
        const q = queue;
        queue = [];
        q.forEach((cb) => cb(performance.now()));
      });
      expect(queue).toHaveLength(0); // no frame ever scheduled
      expect(io.state.val).toBe(0); // scrollLeft untouched — no glide
      fireEvent.pointerUp(ruler, { pointerId: 41, clientX: 790 });
    } finally {
      rafSpy.mockRestore();
      io.restore();
    }
  });
});

describe('R6 — the KEPT clip edge auto-scroll (R18i/R18k law, now netted)', () => {
  it('a clip drag parked at the viewport edge scrolls + re-applies the gesture each frame', () => {
    const io = interceptScrollLeft();
    let queue: FrameRequestCallback[] = [];
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(((cb: FrameRequestCallback) => {
      queue.push(cb);
      return 1;
    }) as typeof window.requestAnimationFrame);
    try {
      render(<Timeline />);
      const scroll = screen.getByTestId('mini-timeline-scroll') as HTMLElement;
      Object.defineProperty(scroll, 'clientWidth', { configurable: true, get: () => 800 });
      scroll.getBoundingClientRect = () =>
        ({ left: 0, right: 800, width: 800, top: 0, bottom: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
      const c2 = screen.getByTestId('mini-clip-c2');
      // activate the drag, then park the pointer 10px inside the right edge
      fireEvent.pointerDown(c2, { button: 0, pointerId: 42, clientX: 216, clientY: 10 });
      fireEvent.pointerMove(c2, { pointerId: 42, buttons: 1, clientX: 790, clientY: 10 });
      // ONE driven frame: SCROLL_SPEED_PX (12) applied + the gesture
      // re-applied against the scrolled content (raw way past the clamp
      // bound → the mover parks at c3's edge, 5.5)
      act(() => {
        const q = queue;
        queue = [];
        q.forEach((cb) => cb(performance.now()));
      });
      expect(io.state.val).toBe(12); // the loop scrolled
      expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.5); // + followed
      // the loop only lives while the gesture does: release stops it, and
      // the drained post-release frames schedule NOTHING further (a live
      // loop would have re-requested a frame inside its callback)
      fireEvent.pointerUp(c2, { pointerId: 42, clientX: 790, clientY: 10 });
      act(() => {
        const q = queue;
        queue = [];
        q.forEach((cb) => cb(performance.now()));
      });
      expect(io.state.val).toBe(12); // frozen after the release
      expect(queue).toHaveLength(0); // the loop did not reschedule
    } finally {
      rafSpy.mockRestore();
      io.restore();
    }
  });
});
