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
    drag(c2, 216, 216 + 3); // never crosses 5px
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
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    await user.click(btn);
    expect(S().snapOn).toBe(false);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
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
    const c2 = screen.getByTestId('mini-clip-c2');
    drag(c2, 256, 286); // raw start 5.125
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5); // quantized
  });

  it('with snap OFF the drag commits the raw (unquantized) start', () => {
    render(<Timeline />);
    fireEvent.click(screen.getByTestId('mini-btn-snap')); // snap off
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
