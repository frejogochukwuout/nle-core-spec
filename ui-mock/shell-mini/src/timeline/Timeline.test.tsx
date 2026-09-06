/* Timeline component tests (D9, audit M5): renders lanes/clips with the
   mini-* testid grammar, click-select, drag-move clamps via pointer sim,
   trim end-handle clamps, split button, Esc-cancel-drag, and mid-drag
   keyboard suppression (the interaction lock at the component level).
   jsdom layout note: getBoundingClientRect returns zeros → the content
   origin is x=0, so clientX maps DIRECTLY to time via pps (deterministic:
   default zoom 48pps). */

import { describe, expect, it, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Timeline } from './Timeline';
import App from '../App';
import { useMini } from '../state/useMini';
import { poolDrag } from '../shell/MediaPool';
import { seedDoc, multiTrackDoc } from '../lib/mockData';

const S = () => useMini.getState();
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
  it('moves the clip with grab-offset anchoring + grid quantize', async () => {
    render(<Timeline />);
    const c2 = screen.getByTestId('mini-clip-c2'); // start 4.5s → x=216
    drag(c2, 216 + 40, 216 + 40 + 48); // grab at 5.33s; move +1s
    // grabOffset = (256/48) - 4.5 = 0.833; pointer t = 304/48 = 6.333;
    // raw start = 6.333 - 0.833 = 5.5 → grid → 5.5
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.5);
    expect(S().past).toHaveLength(1); // one entry per gesture
  });

  it('R19: dragging over the next neighbor INSERTS — the tail pushes (one-lane street gone)', () => {
    render(<Timeline />);
    const c2 = screen.getByTestId('mini-clip-c2');
    drag(c2, 216, 216 + 300); // raw start = 4.5 + 6.25 = 10.75
    // span [10.75, 14.25) conflicts c3 [9,12.5) → c3 pushes right:
    // delta = 5.25 → quantized shift 5.5 → c3 = max(14.25, 9+5.5) = 14.5
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(10.75);
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(14.5);
    expect(S().doc.clips.find((c) => c.id === 'c1')!.start).toBe(0); // before the block — untouched
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
    // c4 [1.5, 8.5]; want = quantize((600-10)/48) = 12.5 → A1 tail free
    fireEvent(lane, dragEvent('drop', 600, dt('m-ambience')));
    poolDrag.current = null;
    const added = S().doc.clips.find((c) => c.mediaId === 'm-ambience')!;
    expect(added).toMatchObject({ trackId: 'A1', duration: 6 });
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
   The tools row hides, V/A collapse into pill sub-rows in one compact
   strip, the slim ruler seeks, and the SAME gesture engine keeps
   dragging / trimming / arranging live. */

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
    // R19: raw = 4.5 + 50/48 = 5.5417; span end 9.0417 overlaps c3@9 by
    // 0.0417 → insert: c3 floored onto 9.0417 (sub-grid delta, ALWAYS-floor)
    expect(S().doc.clips.find((x) => x.id === 'c2')!.start).toBeCloseTo(5.5417, 3);
    expect(S().doc.clips.find((x) => x.id === 'c3')!.start).toBeCloseTo(9.0417, 3);
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

  it('pool drags still land on the pill sub-rows (video→V, audio→A)', () => {
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

describe('R19 — commit at the UP position (review P2-11)', () => {
  it('a fast flick commits the UP spot, not the last pointermove', () => {
    render(<Timeline />);
    const c2 = screen.getByTestId('mini-clip-c2');
    // activate the gesture with a small move, then RELEASE at +96px with
    // NO intermediate move there — the old code would commit the small move
    fireEvent.pointerDown(c2, { button: 0, pointerId: 7, clientX: 216, clientY: 10 });
    fireEvent.pointerMove(c2, { pointerId: 7, clientX: 222, clientY: 10 });
    fireEvent.pointerUp(c2, { pointerId: 7, clientX: 216 + 96, clientY: 10 });
    // raw at the up position = 4.5 + (312−222)/48 = 6.375? No: grabOffset anchored at
    // 216 → raw = 4.5 + (312−216)/48 = 6.5 → span [6.5,10) conflicts c3@9 →
    // insert: c3 floored onto 10
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(6.5);
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(10);
  });
});

describe('R19 — is-pushed affordance (the insert preview made visible)', () => {
  it('followers being pushed carry is-pushed during the gesture; cleared after', () => {
    render(<Timeline />);
    const c2 = screen.getByTestId('mini-clip-c2');
    fireEvent.pointerDown(c2, { button: 0, pointerId: 7, clientX: 216, clientY: 10 });
    fireEvent.pointerMove(c2, { pointerId: 7, clientX: 222, clientY: 10 }); // activate
    fireEvent.pointerMove(c2, { pointerId: 7, clientX: 216 + 300, clientY: 10 }); // over c3
    expect(S().doc.clips.find((c) => c.id === 'c3')!.start).toBe(14.5); // live insert preview
    expect(screen.getByTestId('mini-clip-c3')).toHaveClass('is-pushed');
    expect(screen.getByTestId('mini-clip-c1')).not.toHaveClass('is-pushed'); // before the block
    fireEvent.pointerUp(c2, { pointerId: 7, clientX: 216 + 300, clientY: 10 });
    expect(screen.getByTestId('mini-clip-c3')).not.toHaveClass('is-pushed');
    expect(S().pushedIds).toEqual([]);
  });
});

describe('R19 — trim ghost edges (thread #51)', () => {
  const trim = (el: Element, fromX: number, toX: number) => {
    fireEvent.pointerDown(el, { button: 0, pointerId: 7, clientX: fromX, clientY: 10 });
    fireEvent.pointerMove(el, { pointerId: 7, clientX: fromX + 6, clientY: 10 }); // activate
    fireEvent.pointerMove(el, { pointerId: 7, clientX: toX, clientY: 10 });
  };

  it('OUTWARD end-trim paints the ghost; it leaves with the gesture', () => {
    render(<Timeline />);
    // c1 [0,3.5) media 4.5s — the end can reach 4.5 (min(neighbor 4.5, source 4.5))
    trim(screen.getByTestId('mini-trim-end-c1'), 162, 202); // t≈(202−46)/48 = 3.25 → outward? no: 3.25 < 3.5!
    // use a clearly outward target: x=250 → t = (250−46)/48 = 4.25 > 3.5
    fireEvent.pointerMove(screen.getByTestId('mini-trim-end-c1'), { pointerId: 7, clientX: 250, clientY: 10 });
    expect(screen.getByTestId('mini-trim-ghost-c1')).toBeInTheDocument();
    fireEvent.pointerUp(screen.getByTestId('mini-trim-end-c1'), { pointerId: 7, clientX: 250, clientY: 10 });
    expect(screen.queryByTestId('mini-trim-ghost-c1')).toBeNull();
  });

  it('INWARD end-trim never ghosts', () => {
    render(<Timeline />);
    trim(screen.getByTestId('mini-trim-end-c1'), 250, 180); // inward from 3.5 toward 2.8
    expect(screen.queryByTestId('mini-trim-ghost-c1')).toBeNull();
    fireEvent.pointerUp(screen.getByTestId('mini-trim-end-c1'), { pointerId: 7, clientX: 180, clientY: 10 });
  });

  it('at max (no room): no ghost even outward', () => {
    render(<Timeline />);
    // c1 is already at its media max? c1 [0,3.5) with media 4.5 has room. Use c3:
    // c3 [9,12.5) media m-title 3.5s → end bound = 9+3.5 = 12.5 = current end → no room
    trim(screen.getByTestId('mini-trim-end-c3'), 574, 620);
    expect(screen.queryByTestId('mini-trim-ghost-c3')).toBeNull();
    fireEvent.pointerUp(screen.getByTestId('mini-trim-end-c3'), { pointerId: 7, clientX: 620, clientY: 10 });
  });

  it('ripple ON suppresses the START-edge ghost (frozen-left law)', () => {
    render(<Timeline />);
    S().toggleRipple();
    // c2 [4.5,8): start handle pulled outward-left → under ripple the left edge freezes
    trim(screen.getByTestId('mini-trim-start-c2'), 250, 130); // t < 4.5 → outward request
    expect(screen.queryByTestId('mini-trim-ghost-c2')).toBeNull();
    fireEvent.pointerUp(screen.getByTestId('mini-trim-start-c2'), { pointerId: 7, clientX: 130, clientY: 10 });
    S().toggleRipple();
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
