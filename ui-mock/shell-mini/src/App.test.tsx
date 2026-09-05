/* Shell smoke tests (D9): all regions present; media click appends to the
   correct lane; keyboard (Space, Del, ⌘Z) on the real App shell. */

import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { useMini } from './state/useMini';

const S = () => useMini.getState();

/** direct store mutations must run inside act() to flush re-renders */
const setStore = (fn: () => void) => act(fn);

function renderApp() {
  return render(<App />);
}

describe('shell regions', () => {
  it('renders topbar, pool, viewer, inspector, timeline, toast-root', () => {
    renderApp();
    expect(screen.getByTestId('mini-topbar')).toBeInTheDocument();
    expect(screen.getByTestId('mini-pool')).toBeInTheDocument();
    expect(screen.getByTestId('mini-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('mini-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('mini-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('mini-root')).toBeInTheDocument();
  });

  it('media cards list all seed assets with testids', () => {
    renderApp();
    expect(screen.getByTestId('mini-media-m-drone')).toBeInTheDocument();
    expect(screen.getByTestId('mini-media-m-beach')).toBeInTheDocument();
    expect(screen.getByTestId('mini-media-m-title')).toBeInTheDocument();
    expect(screen.getByTestId('mini-media-m-interview')).toBeInTheDocument();
  });

  /* R18g port of the reviewer's sibling feedback #28/#30: kind badge is an
   * ICON chip (standard NLE way), not a text pill */
  it('media kind badges render icon glyphs, not text', () => {
    renderApp();
    const kinds = screen.getAllByTitle(/^(video|image|audio)$/);
    expect(kinds.length).toBe(8); // all seed assets
    for (const badge of kinds) {
      expect(badge.querySelector('svg')).not.toBeNull();
      expect(badge.textContent).toBe(''); // icon-only, the word lives on title/aria
    }
  });
});

describe('media → timeline', () => {
  it('clicking video media appends to V1 at the track end', () => {
    renderApp();
    fireEvent.click(screen.getByTestId('mini-media-m-drone'));
    const v1 = S().doc.clips.filter((c) => c.trackId === 'V1');
    expect(v1).toHaveLength(4);
    expect(v1[3]).toMatchObject({ start: 12.5, mediaId: 'm-drone', duration: 4.5 });
  });

  it('clicking audio media appends to A1 at the track end', () => {
    renderApp();
    fireEvent.click(screen.getByTestId('mini-media-m-interview'));
    const a1 = S().doc.clips.filter((c) => c.trackId === 'A1');
    expect(a1).toHaveLength(2);
    expect(a1[1]).toMatchObject({ start: 8.5, mediaId: 'm-interview' });
  });

  it('append pushes exactly one history entry + toasts', () => {
    renderApp();
    fireEvent.click(screen.getByTestId('mini-media-m-title'));
    expect(S().past).toHaveLength(1);
    expect(S().toast?.text).toContain('title_card.png');
  });
});

describe('keyboard on the real shell', () => {
  it('Space toggles play (rAF stubbed)', () => {
    vi.useFakeTimers();
    renderApp();
    fireEvent.keyDown(window, { key: ' ' });
    expect(S().playing).toBe(true);
    fireEvent.keyDown(window, { key: ' ' });
    expect(S().playing).toBe(false);
    vi.useRealTimers();
  });

  it('Del removes the selected clip; ⌘Z restores it', () => {
    renderApp();
    setStore(() => S().select('c2'));
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(S().doc.clips.find((c) => c.id === 'c2')).toBeUndefined();
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    expect(S().doc.clips.find((c) => c.id === 'c2')).toBeDefined();
  });

  it('Esc with no drag deselects', () => {
    renderApp();
    setStore(() => S().select('c1'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(S().selectedId).toBeNull();
  });

  it('S splits at the playhead', () => {
    renderApp();
    setStore(() => S().setPlayhead(2));
    fireEvent.keyDown(window, { key: 's' });
    expect(S().doc.clips).toHaveLength(5);
  });

  it('0 resets zoom to the default step (48pps)', () => {
    renderApp();
    setStore(() => S().setZoomStep(4));
    fireEvent.keyDown(window, { key: '0' });
    expect(S().zoomStep).toBe(1);
  });

  it('⌘⇧Z redoes on the real shell', () => {
    renderApp();
    setStore(() => S().select('c2'));
    setStore(() => S().moveClip('c2', 5));
    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(4.5);
    fireEvent.keyDown(window, { key: 'Z', metaKey: true, shiftKey: true });
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5);
  });

  it('typing in an input is not captured (slider unaffected by S)', () => {
    renderApp();
    const slider = screen.getByTestId('mini-zoom-slider');
    fireEvent.keyDown(slider, { key: 's' });
    expect(S().doc.clips).toHaveLength(4);
  });
});

describe('inspector', () => {
  it('shows facts for the selection and nudges', () => {
    renderApp();
    setStore(() => S().select('c2'));
    expect(screen.getByTestId('mini-inspector-name')).toHaveTextContent('beach_wide.mp4');
    expect(screen.getByTestId('mini-inspector-start')).toHaveTextContent('00:04.5');
    fireEvent.click(screen.getByTestId('mini-btn-nudge-right'));
    expect(S().doc.clips.find((c) => c.id === 'c2')!.start).toBe(5);
    expect(S().past).toHaveLength(1);
  });

  it('nudge respects neighbor clamp (disabled at the boundary)', () => {
    renderApp();
    setStore(() => S().select('c1')); // 0→3.5, prevEnd 0 → left nudge disabled
    expect(screen.getByTestId('mini-btn-nudge-left')).toBeDisabled();
    expect(screen.getByTestId('mini-btn-nudge-right')).toBeEnabled();
  });

  it('empty state without selection', () => {
    renderApp();
    expect(screen.getByTestId('mini-inspector-empty')).toBeInTheDocument();
  });
});

describe('topbar', () => {
  it('timecode shows playhead / contentEnd (R18g: lives in the viewer transport now)', () => {
    renderApp();
    const tc = screen.getByTestId('mini-tc');
    expect(tc).toHaveTextContent('00:00.0 / 00:12.5');
    // the transport row is inside the VIEWER, below the video (thread #24/#25)
    expect(tc.closest('[data-testid="mini-viewer"]')).not.toBeNull();
    expect(tc.closest('[data-testid="mini-viewer-transport"]')).not.toBeNull();
    setStore(() => S().setPlayhead(3.25));
    expect(screen.getByTestId('mini-tc')).toHaveTextContent('00:03.2 / 00:12.5');
  });

  it('the play control moved from the topbar into the viewer transport (thread #25)', () => {
    renderApp();
    const play = screen.getByTestId('mini-btn-play');
    expect(play.closest('[data-testid="mini-viewer-transport"]')).not.toBeNull();
    const topbar = screen.getByTestId('mini-topbar');
    expect(topbar.querySelector('[data-testid="mini-btn-play"]')).toBeNull();
  });

  it('Export CTA is honest (toast, no navigation)', () => {
    renderApp();
    fireEvent.click(screen.getByTestId('mini-btn-export'));
    expect(S().toast?.text).toContain('Export isn’t wired');
  });
});

describe('viewer', () => {
  it('shows the clip under the playhead', () => {
    renderApp();
    setStore(() => S().setPlayhead(1)); // inside c1 (drone)
    // pool card + the transport meta on the right of the transport row
    expect(screen.getAllByText('drone_launch.mp4').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('mini-viewer-meta')).toHaveTextContent('drone_launch.mp4');
  });

  it('empty state past the last video clip', () => {
    renderApp();
    setStore(() => S().setPlayhead(12.5)); // at end — no clip [start, start+dur) contains it
    expect(screen.getByTestId('mini-viewer-empty')).toBeInTheDocument();
  });
});

describe('toast region', () => {
  it('renders and auto-dismisses', () => {
    vi.useFakeTimers();
    renderApp();
    setStore(() => S().pushToast('info', 'test toast'));
    expect(screen.getByTestId('mini-toast')).toHaveTextContent('test toast');
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByTestId('mini-toast')).toBeNull();
    vi.useRealTimers();
  });
});

/* ---- R18e: splitters (feedback #13 — panels can resize) ---- */

describe('splitters', () => {
  it('three separators render with aria + testids', () => {
    renderApp();
    const pool = screen.getByTestId('mini-splitter-media-pool-width');
    const insp = screen.getByTestId('mini-splitter-inspector-width');
    const tl = screen.getByTestId('mini-splitter-timeline');
    expect(pool).toHaveAttribute('role', 'separator');
    expect(insp).toHaveAttribute('role', 'separator');
    expect(tl).toHaveAttribute('aria-orientation', 'horizontal');
    expect(screen.getByRole('separator', { name: 'Media pool width' })).toHaveAttribute(
      'aria-valuenow',
      '260',
    );
  });

  it('keyboard: ArrowLeft shrinks the pool, ArrowRight grows it, shift is bigger', () => {
    renderApp();
    const pool = screen.getByTestId('mini-splitter-media-pool-width');
    fireEvent.keyDown(pool, { key: 'ArrowLeft' });
    expect(screen.getByRole('separator', { name: 'Media pool width' })).toHaveAttribute('aria-valuenow', '252');
    fireEvent.keyDown(pool, { key: 'ArrowRight', shiftKey: true });
    expect(screen.getByRole('separator', { name: 'Media pool width' })).toHaveAttribute('aria-valuenow', '284');
  });

  /* R18g (thread #20 — BUG): the inspector sits RIGHT of its handle, so
     dragging the boundary right must SHRINK it. Old code grew it. */
  it('inspector splitter: drag RIGHT shrinks, drag LEFT grows (boundary semantics)', () => {
    renderApp();
    const insp = screen.getByTestId('mini-splitter-inspector-width');
    fireEvent.pointerDown(insp, { button: 0, pointerId: 7, clientX: 700 });
    fireEvent.pointerMove(insp, { pointerId: 7, clientX: 740 }); // boundary right 40px → inspector -40
    expect(insp).toHaveAttribute('aria-valuenow', '200');
    fireEvent.pointerMove(insp, { pointerId: 7, clientX: 680 }); // boundary left of start → inspector +20
    expect(insp).toHaveAttribute('aria-valuenow', '260');
    fireEvent.pointerUp(insp, { pointerId: 7, clientX: 680 });
  });

  it('inspector splitter: ArrowRight shrinks (pushes boundary right), ArrowLeft grows', () => {
    renderApp();
    const insp = screen.getByTestId('mini-splitter-inspector-width');
    fireEvent.keyDown(insp, { key: 'ArrowRight' });
    expect(insp).toHaveAttribute('aria-valuenow', '232');
    fireEvent.keyDown(insp, { key: 'ArrowLeft', shiftKey: true });
    expect(insp).toHaveAttribute('aria-valuenow', '264');
  });

  it('pool splitter keeps the normal direction (drag right grows the pool)', () => {
    renderApp();
    const pool = screen.getByTestId('mini-splitter-media-pool-width');
    fireEvent.pointerDown(pool, { button: 0, pointerId: 9, clientX: 300 });
    fireEvent.pointerMove(pool, { pointerId: 9, clientX: 350 });
    expect(pool).toHaveAttribute('aria-valuenow', '310');
    fireEvent.pointerUp(pool, { pointerId: 9, clientX: 350 });
  });

  it('keyboard + drag on the timeline splitter change its height value', () => {
    renderApp();
    const tl = screen.getByTestId('mini-splitter-timeline');
    fireEvent.keyDown(tl, { key: 'ArrowUp' });
    expect(tl).toHaveAttribute('aria-valuenow', '198');
    fireEvent.pointerDown(tl, { button: 0, pointerId: 3, clientY: 500 });
    fireEvent.pointerMove(tl, { pointerId: 3, clientY: 460 }); // drag up 40px → +40
    expect(tl).toHaveAttribute('aria-valuenow', '238');
    fireEvent.pointerUp(tl, { pointerId: 3, clientY: 460 });
  });

  it('double-click resets to the default width', () => {
    renderApp();
    const pool = screen.getByTestId('mini-splitter-media-pool-width');
    fireEvent.keyDown(pool, { key: 'ArrowLeft' });
    fireEvent.keyDown(pool, { key: 'ArrowLeft' });
    fireEvent.dblClick(pool);
    expect(screen.getByRole('separator', { name: 'Media pool width' })).toHaveAttribute('aria-valuenow', '260');
  });

  it('clamps at the rails (min 180 / max 420 for the pool)', () => {
    renderApp();
    const pool = screen.getByTestId('mini-splitter-media-pool-width');
    for (let i = 0; i < 20; i += 1) fireEvent.keyDown(pool, { key: 'ArrowLeft', shiftKey: true });
    expect(screen.getByRole('separator', { name: 'Media pool width' })).toHaveAttribute('aria-valuenow', '180');
    for (let i = 0; i < 40; i += 1) fireEvent.keyDown(pool, { key: 'ArrowRight', shiftKey: true });
    expect(screen.getByRole('separator', { name: 'Media pool width' })).toHaveAttribute('aria-valuenow', '420');
  });
});
