/* Timeline component tests (D9, audit M5): renders lanes/clips with the
   mini-* testid grammar, click-select, drag-move clamps via pointer sim,
   trim end-handle clamps, split button, Esc-cancel-drag, and mid-drag
   keyboard suppression (the interaction lock at the component level).
   jsdom layout note: getBoundingClientRect returns zeros → the content
   origin is x=0, so clientX maps DIRECTLY to time via pps (deterministic:
   default zoom 48pps). */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Timeline } from './Timeline';
import App from '../App';
import { useMini } from '../state/useMini';
import { poolDrag } from '../shell/MediaPool';

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

  it('clamps against the next neighbor', () => {
    render(<Timeline />);
    const c2 = screen.getByTestId('mini-clip-c2');
    drag(c2, 216, 216 + 300); // way right: clamps to nextStart - duration = 9 - 3.5 = 5.5
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5.5);
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
    fireEvent.pointerDown(ph, { button: 0, pointerId: 5, clientX: 10, clientY: 20 });
    fireEvent.pointerMove(ph, { pointerId: 5, clientX: 246, clientY: 20 });
    // origin = content.left(0) + 10 → t = (246-10)/48 = 4.916…
    expect(S().playhead).toBeCloseTo((246 - 10) / 48, 5);
    fireEvent.pointerUp(ph, { pointerId: 5, clientX: 246, clientY: 20 });
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
  it('with snap ON the same drag quantizes to the grid', () => {
    render(<Timeline />);
    act(() => {
      S().toggleSnap(); // ON (default is off since R18e)
    });
    const c2 = screen.getByTestId('mini-clip-c2');
    drag(c2, 256, 286); // raw start 5.125
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5); // quantized
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
    // want = quantize((660-10)/48) = 13.5; c3 ends 12.5 → free → exact spot
    fireEvent(lane, dragEvent('dragover', 660, transfer));
    expect(screen.getByTestId('mini-drop-outline-V1')).toBeInTheDocument();
    fireEvent(lane, dragEvent('drop', 660, transfer));
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
    const ev = new MouseEvent('drop', { bubbles: true, cancelable: true, clientX: 660, clientY: 40 });
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
    const ev = new MouseEvent('dragover', { bubbles: true, cancelable: true, clientX: 660, clientY: 40 });
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
