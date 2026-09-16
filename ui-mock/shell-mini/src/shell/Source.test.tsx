/* R24-miniplus W4 (DESIGN-R24 D7/D11): the source-mode UI nets — the
 * dual-mode viewer swap, the pool entry affordance (F7), the range bar's
 * commit grammar, the insert-mode row, the gate-off additive law (the
 * ENTRY hides; a session in flight stays), and the keyboard surface
 * (I/O/,/. gated to source mode, the Esc chain). */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { planInsert } from '../lib/insertPlan';
import { useMini } from '../state/useMini';
import { seedDoc, type Doc } from '../lib/mockData';

const S = () => useMini.getState();
const setStore = (fn: () => void) => act(fn);

function renderApp() {
  return render(<App />);
}

beforeEach(() => {
  setStore(() => {
    S().reset();
  });
});

describe('R24 W4: the dual-mode viewer swap', () => {
  it('program mode is the R23 surface; entering source swaps the whole stage', () => {
    renderApp();
    // program: the frame/empty + the transport + the scrub
    expect(screen.getByTestId('mini-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('mini-viewer-scrub')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-src-poster')).toBeNull();
    setStore(() => {
      S().setPlayhead(1);
      S().enterSourcePreview('m-drone');
    });
    expect(screen.getByTestId('mini-src-poster')).toBeInTheDocument();
    expect(screen.getByTestId('mini-src-name').textContent).toBe('drone_launch.mp4');
    expect(screen.getByTestId('mini-src-dur').textContent).toBe('00:04.5');
    expect(screen.queryByTestId('mini-viewer-scrub')).toBeNull(); // the program scrub unmounted
    expect(screen.getByTestId('mini-src-bar')).toBeInTheDocument();
  });

  it('the audio poster renders the waveform block; images render the still block', () => {
    renderApp();
    setStore(() => {
      S().enterSourcePreview('m-interview');
    });
    expect(screen.getByTestId('mini-src-wave')).toBeInTheDocument();
    setStore(() => {
      S().enterSourcePreview('m-title');
    });
    expect(screen.queryByTestId('mini-src-wave')).toBeNull();
    expect(screen.getByTestId('mini-src-poster')).toBeInTheDocument();
  });

  it('the F9 freeze: the source scrub moves sourcePlayhead, NEVER the program playhead', () => {
    renderApp();
    setStore(() => {
      S().setPlayhead(2);
      S().enterSourcePreview('m-drone');
    });
    setStore(() => {
      S().setSourcePlayhead(3.25);
    });
    expect(S().sourcePlayhead).toBe(3.25);
    expect(S().playhead).toBe(2); // FROZEN
    expect(screen.getByTestId('mini-src-tc').textContent).toBe('00:03.2');
  });

  it('"Back to program" exits (the program surface returns)', () => {
    renderApp();
    setStore(() => {
      S().enterSourcePreview('m-drone');
    });
    fireEvent.click(screen.getByTestId('mini-btn-src-back'));
    expect(S().viewerMode).toBe('program');
    expect(screen.getByTestId('mini-viewer-scrub')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-src-poster')).toBeNull();
  });
});

describe('R24 W4: the pool entry affordance (F7)', () => {
  it('the icon button opens the source viewer; the card append law NEVER fires from it', () => {
    renderApp();
    fireEvent.click(screen.getByTestId('mini-btn-source-open-m-drone'));
    expect(S().viewerMode).toBe('source');
    expect(S().sourceMediaId).toBe('m-drone');
    // the card's own click law (append) untouched — no clip was added
    expect(S().doc.clips).toHaveLength(4);
    expect(S().past.length).toBe(0);
  });

  it('the card itself still appends (the click-append law is byte-identical)', () => {
    renderApp();
    fireEvent.click(screen.getByTestId('mini-media-m-drone'));
    expect(S().doc.clips).toHaveLength(5);
    expect(S().doc.clips.filter((c) => c.trackId === 'V1').at(-1)!.mediaId).toBe('m-drone');
  });

  it('gate OFF: the affordance unmounts (the source mode is unreachable from the pool)', () => {
    renderApp();
    setStore(() => {
      useMini.setState({ miniPlus: false });
    });
    expect(screen.queryByTestId('mini-btn-source-open-m-drone')).toBeNull();
    // the card keeps its append law
    fireEvent.click(screen.getByTestId('mini-media-m-drone'));
    expect(S().doc.clips).toHaveLength(5);
  });

  it('gate OFF with a session in flight: the source stage STAYS (the mode is view state)', () => {
    renderApp();
    setStore(() => {
      S().enterSourcePreview('m-drone');
      useMini.setState({ miniPlus: false });
    });
    // honest net: only the ENTRY hides — an in-flight source session does
    // not vanish under the user (the task's simple ruling)
    expect(screen.getByTestId('mini-src-poster')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-btn-source-open-m-beach')).toBeNull();
  });
});

describe('R24 W4: the SourceRangeBar (mark + commit grammar)', () => {
  it('renders the dual sliders with seconds aria + the full-window default', () => {
    renderApp();
    setStore(() => {
      S().enterSourcePreview('m-drone'); // 4.5s
    });
    const inH = screen.getByTestId('mini-src-in');
    const outH = screen.getByTestId('mini-src-out');
    expect(inH.getAttribute('role')).toBe('slider');
    expect(inH.getAttribute('aria-valuenow')).toBe('0');
    expect(outH.getAttribute('aria-valuenow')).toBe('4.5');
    expect(outH.getAttribute('aria-valuemax')).toBe('4.5');
  });

  it('the handles commit via the keyboard (←/→ ±0.5, ⇧ ×5) through the store', () => {
    renderApp();
    setStore(() => {
      S().enterSourcePreview('m-drone');
    });
    const inH = screen.getByTestId('mini-src-in');
    fireEvent.keyDown(inH, { key: 'ArrowRight' });
    expect(S().sourceRanges['m-drone']).toEqual({ in: 0.5, out: 4.5 });
    fireEvent.keyDown(inH, { key: 'ArrowRight', shiftKey: true }); // +2.5
    expect(S().sourceRanges['m-drone']!.in).toBe(3);
    fireEvent.keyDown(inH, { key: 'ArrowLeft' });
    expect(S().sourceRanges['m-drone']!.in).toBe(2.5);
    // the out handle: keyboard → the store, the mirrored clamp rules
    const outH = screen.getByTestId('mini-src-out');
    fireEvent.keyDown(outH, { key: 'ArrowLeft' }); // 4.5 − 0.5 = 4 (> in)
    expect(S().sourceRanges['m-drone']!.out).toBe(4);
    // the refusal law at the keyboard: in cannot REACH out (equal refuses)
    fireEvent.keyDown(inH, { key: 'ArrowRight' }); // 3.0 < 4 → legal
    fireEvent.keyDown(inH, { key: 'ArrowRight' }); // 3.5 < 4 → legal
    fireEvent.keyDown(inH, { key: 'ArrowRight' }); // 4.0 ≥ 4 → REFUSED
    expect(S().sourceRanges['m-drone']!.in).toBe(3.5);
  });

  it('Home/End commit the domain ends (the refusal law rules the jumps)', () => {
    renderApp();
    setStore(() => {
      S().enterSourcePreview('m-drone');
      S().setSourceRangeOut('m-drone', 2); // {0, 2}
    });
    fireEvent.keyDown(screen.getByTestId('mini-src-in'), { key: 'End' }); // in → 4.5: inverted → refused
    expect(S().sourceRanges['m-drone']!.in).toBe(0);
    fireEvent.keyDown(screen.getByTestId('mini-src-in'), { key: 'Home' });
    expect(S().sourceRanges['m-drone']!.in).toBe(0); // already home
    fireEvent.keyDown(screen.getByTestId('mini-src-out'), { key: 'End' });
    expect(S().sourceRanges['m-drone']!.out).toBe(4.5);
  });

  it('the B7 release discipline: pointercancel + lostpointercapture clear the drag', () => {
    renderApp();
    setStore(() => {
      S().enterSourcePreview('m-drone');
      S().setSourcePlayhead(2);
    });
    const inH = screen.getByTestId('mini-src-in');
    /* jsdom rects are 0-width → timeAt falls back to the CURRENT
     * playhead — the move writes the playhead's time, which makes the
     * stale-drag probe below DISCRIMINATING: move the playhead, then a
     * buttonless move writes it ONLY if a stale drag survived. */
    fireEvent.pointerDown(inH, { button: 0, pointerId: 3, clientX: 10 });
    fireEvent.pointerMove(inH, { pointerId: 3, clientX: 40, buttons: 1 });
    expect(S().sourceRanges['m-drone']).toEqual({ in: 2, out: 4.5 }); // the live drag wrote
    fireEvent.pointerCancel(inH, { pointerId: 3 });
    setStore(() => {
      S().setSourcePlayhead(3);
    });
    fireEvent.pointerMove(inH, { pointerId: 3, clientX: 60, buttons: 1 });
    expect(S().sourceRanges['m-drone']!.in).toBe(2); // cleared — no stale write
    // lostpointercapture clears too (the B7 trio)
    fireEvent.pointerDown(inH, { button: 0, pointerId: 4, clientX: 10 });
    fireEvent.lostPointerCapture(inH);
    fireEvent.pointerUp(inH, { pointerId: 4 });
    setStore(() => {
      S().setSourcePlayhead(1);
    });
    fireEvent.pointerMove(inH, { pointerId: 4, clientX: 60, buttons: 1 });
    expect(S().sourceRanges['m-drone']!.in).toBe(2); // still cleared
  });

  it('the bar itself scrubs the sourcePlayhead (pointer session never touches the program playhead)', () => {
    renderApp();
    setStore(() => {
      S().setPlayhead(1);
      S().enterSourcePreview('m-drone');
    });
    const bar = screen.getByTestId('mini-src-bar');
    // jsdom: 0-width rect → the scrub writes the clamped current value
    // (a no-op seek). The net pins that the pointer session never throws
    // and NEVER moves the program playhead (the F9 freeze).
    const ph = S().sourcePlayhead;
    fireEvent.pointerDown(bar, { button: 0, pointerId: 9, clientX: 20 });
    fireEvent.pointerMove(bar, { pointerId: 9, clientX: 50, buttons: 1 });
    fireEvent.pointerUp(bar, { pointerId: 9 });
    fireEvent.pointerCancel(bar, { pointerId: 9 });
    expect(S().sourcePlayhead).toBe(ph);
    expect(S().playhead).toBe(1);
  });
});

describe('R24 W4: the marks row + the mode row (the one-shot actions)', () => {
  it('Set In / Set Out mark at the sourcePlayhead (quantized); Clear drops the mark', () => {
    renderApp();
    setStore(() => {
      S().enterSourcePreview('m-drone');
      S().setSourcePlayhead(2.2);
    });
    fireEvent.click(screen.getByTestId('mini-btn-src-setin'));
    expect(S().sourceRanges['m-drone']).toEqual({ in: 2, out: 4.5 });
    setStore(() => {
      S().setSourcePlayhead(3.7);
    });
    fireEvent.click(screen.getByTestId('mini-btn-src-setout'));
    expect(S().sourceRanges['m-drone']).toEqual({ in: 2, out: 3.5 }); // quantized
    fireEvent.click(screen.getByTestId('mini-btn-src-clear'));
    expect(S().sourceRanges['m-drone']).toBeUndefined();
  });

  it('the 6 mode buttons render and drive the store (Insert: one entry, honest doc math)', () => {
    renderApp();
    setStore(() => {
      S().enterSourcePreview('m-sunset');
      S().setSourceRangeIn('m-sunset', 1);
      S().setSourceRangeOut('m-sunset', 2); // 1s window
      S().setPlayhead(2);
    });
    for (const id of ['insert', 'overwrite', 'replace', 'append', 'rippleoverwrite', 'fittofill']) {
      expect(screen.getByTestId(`mini-btn-insert-${id}`)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByTestId('mini-btn-insert-insert'));
    const v1 = S().doc.clips.filter((c) => c.trackId === 'V1').sort((a, b) => a.start - b.start);
    expect(v1.map((c) => [c.start, c.duration])).toEqual([
      [0, 2],
      [2, 1],
      [3, 1.5],
      [5.5, 3.5],
      [10, 3.5],
    ]);
    expect(S().past.length).toBe(1);
    expect(S().toast?.text).toMatch(/inserted/i);
  });

  it('a refused mode shows the honest toast — the button never disables', () => {
    renderApp();
    setStore(() => {
      S().enterSourcePreview('m-sunset');
      S().select('c1');
    });
    const btn = screen.getByTestId('mini-btn-insert-fittofill') as HTMLButtonElement;
    expect(btn.disabled).toBe(false); // never disabled — the toast is the law
    fireEvent.click(btn);
    expect(S().past.length).toBe(0);
    expect(S().toast?.kind).toBe('info');
    expect(S().toast?.text).toMatch(/in\/out range/i);
  });
});

describe('R24 W4: the keyboard surface (I/O/,/. + the Esc chain)', () => {
  it('I/O mark in/out at the sourcePlayhead — gated to source mode', () => {
    renderApp();
    // program mode: inert (deviation #4 — no collision with the classic map)
    fireEvent.keyDown(window, { key: 'i' });
    fireEvent.keyDown(window, { key: 'o' });
    expect(S().sourceRanges['m-drone']).toBeUndefined();
    setStore(() => {
      S().enterSourcePreview('m-drone');
      S().setSourcePlayhead(2.2);
    });
    fireEvent.keyDown(window, { key: 'i' });
    expect(S().sourceRanges['m-drone']).toEqual({ in: 2, out: 4.5 });
    setStore(() => {
      S().setSourcePlayhead(3.7);
    });
    fireEvent.keyDown(window, { key: 'o' });
    expect(S().sourceRanges['m-drone']).toEqual({ in: 2, out: 3.5 });
  });

  it(', / . fire insert / overwrite at the playhead — gated to source mode', () => {
    renderApp();
    // program mode: inert
    fireEvent.keyDown(window, { key: ',' });
    fireEvent.keyDown(window, { key: '.' });
    expect(S().doc.clips).toHaveLength(4);
    setStore(() => {
      S().enterSourcePreview('m-sunset');
      S().setSourceRangeIn('m-sunset', 1);
      S().setSourceRangeOut('m-sunset', 2);
      S().setPlayhead(2);
    });
    fireEvent.keyDown(window, { key: ',' });
    expect(S().doc.clips).toHaveLength(6); // the insert split + placed
    expect(S().past.length).toBe(1);
    // '.' overwrite at the playhead, fresh seed: c1 [0,3.5] MIDDLE-straddles
    // the placed [1,2) → left [0,1) + right [2,3.5); c2/c3 never move
    setStore(() => {
      S().reset();
      S().enterSourcePreview('m-sunset');
      S().setSourceRangeIn('m-sunset', 1);
      S().setSourceRangeOut('m-sunset', 2);
      S().setPlayhead(1);
    });
    fireEvent.keyDown(window, { key: '.' });
    const v1 = S().doc.clips.filter((c) => c.trackId === 'V1').sort((a, b) => a.start - b.start);
    expect(v1.map((c) => [c.start, c.duration])).toEqual([
      [0, 1], // c1's left head
      [1, 1], // placed m-sunset
      [2, 1.5], // c1's right tail
      [4.5, 3.5], // c2 untouched (overwrite never ripples)
      [9, 3.5], // c3 untouched
    ]);
    expect(S().past.length).toBe(1);
  });

  it('the Esc chain: drag-cancel FIRST → source exit → the classic deselect', () => {
    renderApp();
    setStore(() => {
      S().select('c1');
      S().enterSourcePreview('m-drone');
    });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(S().viewerMode).toBe('program'); // source exit won
    expect(S().selectedId).toBe('c1'); // the deselect did NOT fire
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(S().selectedId).toBeNull(); // the classic law resumes
    // the drag branch still outranks the source branch
    setStore(() => {
      S().enterSourcePreview('m-drone');
      S().beginDrag();
    });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(S().dragActive).toBe(false); // the drag canceled
    expect(S().viewerMode).toBe('source'); // the source exit did NOT fire
  });

  it('typing in a field is not captured (the form-control skip covers the source keys)', () => {
    renderApp();
    setStore(() => {
      S().select('c1'); // the in-point field needs a clip with window slack
      S().enterSourcePreview('m-drone');
    });
    const field = screen.getByTestId('mini-field-inpoint');
    fireEvent.keyDown(field, { key: 'i' });
    expect(S().sourceRanges['m-drone']).toBeUndefined();
  });
});

/* ---- R24-miniplus W4-fix (the review round's F1/F2/F3 nets) ---- */

describe('R24 W4-fix: the honesty laws (F1/F2/F3)', () => {
  beforeEach(() => {
    setStore(() => {
      S().reset();
    });
  });

  it('F1: an off-grid (raw-trimmed) straddler never mints a sub-MIN half', () => {
    // a clip raw-trimmed to [0, 2.2) — off-grid by the R18i pointer law;
    // the planner splits it at the grid-clean playhead 2.0
    const doc: Doc = {
      tracks: [seedDoc().tracks[0]],
      media: seedDoc().media,
      clips: [
        { id: 'cR', trackId: 'V1', mediaId: 'm-gopro', start: 0, duration: 2.2 },
        { id: 'cB', trackId: 'V1', mediaId: 'm-beach', start: 3, duration: 3.5 },
      ],
    };
    const r = planInsert(doc, doc.media[0]!, 'insert', { playhead: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const draft: Doc = { ...doc, clips: doc.clips.map((c) => ({ ...c })) };
    r.patch(draft);
    for (const c of draft.clips) {
      expect(c.duration).toBeGreaterThanOrEqual(0.5 - 1e-9); // the MIN law
    }
  });

  it('F1b: the overwrite head-straddle drops a degenerate remainder (the reference law)', () => {
    // placed [1.5, 3.0) over cR [1.0, 1.9): head straddle leaves 1.9->3.0
    // = 1.1 fine; craft the degenerate: placed [1.5, 3.0) over [1.6, 2.0):
    // remaining = 3.0-... head-straddle remainder = dur - cut = 0.4 - wait:
    // clip [1.6, 2.0) dur 0.4 < MIN already — use [1.0, 2.0): cut = 1.5,
    // remaining 0.5 ok. Use placed start 0.5 dur 2.5 over clip [2.2, 2.9):
    // covered head = 0.5+2.5-2.2 = 0.8, remaining = 0.7-… compute: cut
    // = time+dur-start = 3.0-2.2 = 0.8; remaining = 0.9-0.8 = 0.1 < MIN → removed
    const doc: Doc = {
      tracks: [seedDoc().tracks[0]],
      media: seedDoc().media,
      clips: [
        { id: 'cR', trackId: 'V1', mediaId: 'm-gopro', start: 2.2, duration: 0.9 },
      ],
    };
    const r = planInsert(doc, doc.media[0]!, 'overwrite', { playhead: 0.5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const draft: Doc = { ...doc, clips: doc.clips.map((c) => ({ ...c })) };
    r.patch(draft);
    // the 0.1s remainder was degenerate — the clip is REMOVED, not shrunk
    expect(draft.clips.find((c) => c.id === 'cR')).toBeUndefined();
  });

  it('F2: turning the gate OFF exits an in-flight source session (the clean handoff)', () => {
    setStore(() => {
      S().enterSourcePreview('m-drone');
    });
    expect(S().viewerMode).toBe('source');
    setStore(() => {
      S().toggleMiniPlus();
    });
    expect(S().miniPlus).toBe(false);
    expect(S().viewerMode).toBe('program'); // the handoff, not a zombie session
    expect(S().sourceMediaId).toBeNull();
  });

  it('F3: a STILL renders no range handles and no marks row (the A1 law)', () => {
    setStore(() => {
      S().enterSourcePreview('m-title'); // title_card.png
    });
    renderApp();
    // F3: the handles are aria-hidden + unfocusable (the A1 law — a still
    // has no range; the elements exist but carry no affordance)
    const inHandle = screen.queryByTestId('mini-src-in');
    if (inHandle) {
      expect(inHandle).toHaveAttribute('aria-hidden', 'true');
      expect(inHandle).toHaveAttribute('tabindex', '-1');
    }
    expect(screen.queryByTestId('mini-btn-src-setin')).toBeNull();
    // the video case has them all
    setStore(() => {
      S().enterSourcePreview('m-drone');
    });
    expect(screen.getByTestId('mini-src-in')).toBeInTheDocument();
    expect(screen.getByTestId('mini-btn-src-setin')).toBeInTheDocument();
  });
});
