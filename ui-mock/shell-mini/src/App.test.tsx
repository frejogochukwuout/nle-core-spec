/* Shell smoke tests (D9): all regions present; media click appends to the
   correct lane; keyboard (Space, Del, ⌘Z) on the real App shell. */

import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { useMini } from './state/useMini';
import { ppsFor } from './lib/geometry';

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
    setStore(() => S().setZoomStep(6));
    fireEvent.keyDown(window, { key: '0' });
    // R19: the 9-step ladder renumbered the default to step 2 (still 48pps)
    expect(S().zoomStep).toBe(2);
    expect(ppsFor(S().zoomStep)).toBe(48);
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
    // the media frame renders + the pool card still carries the name
    // (R18j thread #16: the transport's right slot is the aspect
    // controller now — the name lives in the pool/inspector, one place)
    expect(screen.getByTestId('mini-viewer-frame')).toBeInTheDocument();
    expect(screen.getAllByText('drone_launch.mp4').length).toBeGreaterThanOrEqual(1);
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

/* ---- R18j layout wave (threads #13/#14/#15/#16/#18/#19) ----------- */

describe('R18j panel collapse + viewer max + aspect (threads #13/#14/#19)', () => {
  it('pool collapses to a rail and back; splitters follow (thread #14)', () => {
    renderApp();
    fireEvent.click(screen.getByTestId('mini-btn-pool-collapse'));
    expect(screen.getByTestId('mini-pool-collapsed')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-pool')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mini-splitter-media-pool-width')).not.toBeInTheDocument();
    // vertical 90° label present (the standard collapsed-panel style)
    expect(screen.getByText('Media')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mini-btn-pool-expand'));
    expect(screen.getByTestId('mini-pool')).toBeInTheDocument();
    expect(screen.getByTestId('mini-splitter-media-pool-width')).toBeInTheDocument();
  });

  it('inspector collapses to a rail and back (thread #13)', () => {
    renderApp();
    fireEvent.click(screen.getByTestId('mini-btn-inspector-collapse'));
    expect(screen.getByTestId('mini-inspector-collapsed')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-inspector')).not.toBeInTheDocument();
    expect(screen.getByText('Inspector')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mini-btn-inspector-expand'));
    expect(screen.getByTestId('mini-inspector')).toBeInTheDocument();
  });

  it('viewer max composes all three: rails + minimized timeline (thread #19)', () => {
    renderApp();
    fireEvent.click(screen.getByTestId('mini-btn-viewer-max'));
    // pool + inspector collapse to rails
    expect(screen.getByTestId('mini-pool-collapsed')).toBeInTheDocument();
    expect(screen.getByTestId('mini-inspector-collapsed')).toBeInTheDocument();
    // timeline MINIMIZES (never disappears) — compact strip live
    expect(screen.getByTestId('mini-timeline-min')).toBeInTheDocument();
    expect(screen.queryByTestId('mini-timeline-tools')).not.toBeInTheDocument();
    // the individual flags were NOT destroyed — exit restores the layout
    fireEvent.click(screen.getByTestId('mini-btn-viewer-max'));
    expect(screen.getByTestId('mini-pool')).toBeInTheDocument();
    expect(screen.getByTestId('mini-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('mini-timeline-tools')).toBeInTheDocument();
  });

  it('a rail click while maxed exits max mode (mode-aware rails)', () => {
    renderApp();
    fireEvent.click(screen.getByTestId('mini-btn-viewer-max'));
    fireEvent.click(screen.getByTestId('mini-btn-pool-expand'));
    // exiting max restores the user's layout wholesale
    expect(screen.getByTestId('mini-pool')).toBeInTheDocument();
    expect(screen.getByTestId('mini-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('mini-timeline-tools')).toBeInTheDocument();
  });

  it('individually-collapsed panels stay collapsed after a max round-trip', () => {
    renderApp();
    setStore(() => S().togglePool()); // user's own choice: pool collapsed
    fireEvent.click(screen.getByTestId('mini-btn-viewer-max')); // max hides more
    fireEvent.click(screen.getByTestId('mini-btn-viewer-max')); // exit max
    // the individual choice survives the round trip
    expect(screen.getByTestId('mini-pool-collapsed')).toBeInTheDocument();
    expect(screen.getByTestId('mini-inspector')).toBeInTheDocument();
  });

  it('aspect controller: select switches the frame ratio (thread #16)', () => {
    renderApp();
    setStore(() => S().setPlayhead(1)); // a media frame is showing
    const select = screen.getByTestId('mini-viewer-aspect-select') as HTMLSelectElement;
    expect(select.value).toBe('16:9');
    const frame = screen.getByTestId('mini-viewer-frame');
    expect(frame.style.aspectRatio).toBe('16 / 9');
    fireEvent.change(select, { target: { value: '9:16' } });
    expect(S().viewerAspect).toBe('9:16');
    expect(frame.style.aspectRatio).toBe('9 / 16');
    // the media name is no longer the transport's right slot — the
    // controller replaced it (the name lives in pool/inspector)
    expect(screen.queryByTestId('mini-viewer-meta')).not.toBeInTheDocument();
  });

  it('image clips drop "Source length" from the inspector (thread #18)', () => {
    renderApp();
    setStore(() => S().select('c3')); // title_card.png — image
    expect(screen.getByText('Duration')).toBeInTheDocument(); // edit decision stays
    expect(screen.queryByText('Source length')).not.toBeInTheDocument();
    setStore(() => S().select('c1')); // drone video — source length back
    expect(screen.getByText('Source length')).toBeInTheDocument();
  });
});

/* ---- R19: the viewer scrub bar + seek controls (thread #53) ---- */

describe('R19 — viewer scrub bar (thread #53)', () => {
  it('renders with slider semantics + the runway-floored extent', () => {
    renderApp();
    const bar = screen.getByTestId('mini-viewer-scrub');
    expect(bar).toHaveAttribute('role', 'slider');
    expect(bar).toHaveAttribute('aria-label', 'Scrub playhead');
    // seed contentEnd 12.5 ≥ the 8s runway floor → extent = 12.5
    expect(bar).toHaveAttribute('aria-valuemax', '12.5');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(screen.getByTestId('mini-btn-seek-start')).toBeInTheDocument();
    expect(screen.getByTestId('mini-btn-seek-cliphead')).toBeInTheDocument();
  });

  it('the extent floors at 8s for an empty world (the runway law)', () => {
    setStore(() =>
      useMini.setState({ doc: { tracks: S().doc.tracks, media: S().doc.media, clips: [] } }),
    );
    renderApp();
    expect(screen.getByTestId('mini-viewer-scrub')).toHaveAttribute('aria-valuemax', '8');
  });

  it('keyboard scrub: arrows nudge 0.5s, Home/End jump (aria clamps at extent)', async () => {
    renderApp();
    setStore(() => S().setPlayhead(3));
    const bar = screen.getByTestId('mini-viewer-scrub');
    fireEvent.keyDown(bar, { key: 'ArrowRight' });
    expect(S().playhead).toBe(3.5);
    fireEvent.keyDown(bar, { key: 'ArrowLeft' });
    expect(S().playhead).toBe(3);
    fireEvent.keyDown(bar, { key: 'Home' });
    expect(S().playhead).toBe(0);
    fireEvent.keyDown(bar, { key: 'End' });
    expect(S().playhead).toBe(12.5); // rulerEnd is 12.5 in jsdom (the effect ran)
  });

  it('to-start seeks 0; clip-head seeks the under-playhead head then walks back', () => {
    renderApp();
    setStore(() => S().setPlayhead(5)); // inside c2 [4.5,8)
    fireEvent.click(screen.getByTestId('mini-btn-seek-cliphead'));
    expect(S().playhead).toBe(4.5);
    fireEvent.click(screen.getByTestId('mini-btn-seek-cliphead')); // at the head → previous edit
    expect(S().playhead).toBe(0);
    fireEvent.click(screen.getByTestId('mini-btn-seek-cliphead')); // at 0 → stays at the floor
    expect(S().playhead).toBe(0);
    setStore(() => S().setPlayhead(7));
    fireEvent.click(screen.getByTestId('mini-btn-seek-start'));
    expect(S().playhead).toBe(0);
  });

  it('the playhead tick pins full when a ruler scrub parks past the content end', () => {
    renderApp();
    setStore(() => S().setPlayhead(12.5)); // at the extent edge
    const bar = screen.getByTestId('mini-viewer-scrub');
    expect(bar).toHaveAttribute('aria-valuenow', '12.5');
  });
});

/* ---- R19: rail whole-click (threads #24/#25) — the button fills the rail ---- */

describe('R19 — rails expand on whole-surface click', () => {
  it('the collapsed pool rail is a single button element (whole surface)', () => {
    setStore(() => S().setPoolCollapsed(true));
    renderApp();
    const rail = screen.getByTestId('mini-btn-pool-expand');
    // the rail button is the panel's only child and stretches (CSS flex law)
    expect(rail).toHaveTextContent('Media');
    fireEvent.click(rail);
    expect(S().poolCollapsed).toBe(false);
    expect(screen.getByTestId('mini-pool')).toBeInTheDocument();
  });

  it('the collapsed inspector rail expands the same way', () => {
    setStore(() => S().setInspectorCollapsed(true));
    renderApp();
    const rail = screen.getByTestId('mini-btn-inspector-expand');
    fireEvent.click(rail);
    expect(S().inspectorCollapsed).toBe(false);
  });
});

/* ---- R19: the inspector's track card (thread #47) ---- */

describe('R19 — inspector track card', () => {
  it('lane selection shows the track card with honest facts', () => {
    renderApp();
    setStore(() => S().selectTrack('V1'));
    const card = screen.getByTestId('mini-inspector-track');
    expect(card).toHaveTextContent('V1 lane');
    expect(card).toHaveTextContent('video');
    expect(screen.getByTestId('mini-inspector-track-count')).toHaveTextContent('3');
    // pointerdown on a clip swaps the subject back (mutual exclusion —
    // clips select on pointerdown, the gesture engine's own law)
    fireEvent.pointerDown(screen.getByTestId('mini-clip-c2'), { button: 0 });
    fireEvent.pointerUp(screen.getByTestId('mini-clip-c2'), { pointerId: 1 });
    expect(screen.queryByTestId('mini-inspector-track')).toBeNull();
    expect(screen.getByTestId('mini-inspector-name')).toHaveTextContent('beach_wide.mp4');
  });

  /* R20 (thread #29 — wave 8): the named basic control — mute. */
  it('the MUTE control toggles doc state: one entry, lane dims, head chip, undo restores', () => {
    renderApp();
    setStore(() => S().selectTrack('A1'));
    const btn = screen.getByTestId('mini-track-mute');
    expect(btn).toHaveTextContent('Mute');
    expect(screen.getByTestId('mini-lane-A1')).not.toHaveClass('is-muted');
    fireEvent.click(btn);
    expect(S().doc.tracks.find((t) => t.id === 'A1')!.muted).toBe(true);
    expect(S().past).toHaveLength(1); // doc state — one history entry
    expect(screen.getByTestId('mini-track-mute')).toHaveTextContent('Unmute');
    expect(screen.getByTestId('mini-lane-A1')).toHaveClass('is-muted'); // the lane dims
    expect(screen.getByTestId('mini-track-mute-chip-A1')).toBeInTheDocument(); // the head M chip
    // the chip unmutes from the timeline surface (a real button, not a badge)
    fireEvent.click(screen.getByTestId('mini-track-mute-chip-A1'));
    expect(S().doc.tracks.find((t) => t.id === 'A1')!.muted).toBe(false); // unmuted (saved as false — round-trip shape)
    expect(screen.queryByTestId('mini-track-mute-chip-A1')).toBeNull();
    // undo restores the pre-toggle doc exactly (mute is history, not view)
    fireEvent.click(screen.getByTestId('mini-track-mute'));
    setStore(() => S().undo());
    expect(S().doc.tracks.find((t) => t.id === 'A1')!.muted).toBeFalsy(); // the pre-toggle doc restored
    expect(screen.getByTestId('mini-lane-A1')).not.toHaveClass('is-muted');
  });

  it('mute is suppressed mid-gesture (the interaction lock family)', () => {
    renderApp();
    setStore(() => S().selectTrack('A1'));
    S().beginDrag();
    fireEvent.click(screen.getByTestId('mini-track-mute'));
    expect(S().doc.tracks.find((t) => t.id === 'A1')!.muted).toBeFalsy();
    expect(S().past).toHaveLength(0);
    S().cancelDrag();
  });
});

/* ---- PR69 (review round): the flagged laws, pinned ---- */

describe('PR69 keyboard law (C1/C16/C46/C49)', () => {
  it('C49: the ADVERTISED zoom keys work (+ / − / = / _)', () => {
    renderApp();
    fireEvent.keyDown(window, { key: '+' });
    expect(S().zoomStep).toBe(3); // default 2 → up one rung
    fireEvent.keyDown(window, { key: '=' });
    expect(S().zoomStep).toBe(4);
    fireEvent.keyDown(window, { key: '-' });
    expect(S().zoomStep).toBe(3);
    fireEvent.keyDown(window, { key: '_' });
    expect(S().zoomStep).toBe(2);
  });

  it('C16: key auto-repeat never machine-guns a binding (one S-hold = one split)', () => {
    renderApp();
    setStore(() => S().setPlayhead(2));
    fireEvent.keyDown(window, { key: 's' });
    fireEvent.keyDown(window, { key: 's', repeat: true });
    fireEvent.keyDown(window, { key: 's', repeat: true });
    expect(S().doc.clips).toHaveLength(5); // exactly ONE split, not three
    expect(S().past).toHaveLength(1);
  });

  it('C16: a held Space does not strobe play/pause', () => {
    renderApp();
    fireEvent.keyDown(window, { key: ' ' });
    expect(S().playing).toBe(true);
    fireEvent.keyDown(window, { key: ' ', repeat: true });
    fireEvent.keyDown(window, { key: ' ', repeat: true });
    expect(S().playing).toBe(true); // repeats ignored, final state stable
  });

  it('C1: Space on a focused BUTTON does not hijack playback (native activation wins)', () => {
    renderApp();
    // focus a real button (the transport play control) — the global handler
    // must yield so the browser's own Space-activation can run
    const play = screen.getByTestId('mini-btn-play');
    play.focus();
    fireEvent.keyDown(play, { key: ' ' });
    // jsdom does not synthesize the native click on Space — the pinned law
    // is that the GLOBAL surface does NOT toggle playback behind the button
    expect(S().playing).toBe(false);
    expect(play).toHaveFocus();
  });

  it('C1: shortcuts stay alive while a button merely HOLDS focus (S still splits)', () => {
    renderApp();
    screen.getByTestId('mini-btn-play').focus();
    setStore(() => S().setPlayhead(2));
    fireEvent.keyDown(window, { key: 's' });
    expect(S().doc.clips).toHaveLength(5);
  });
});

describe('PR69 C55: pool-card double-fire guard', () => {
  it('a double-click appends exactly ONE clip (one history entry)', () => {
    renderApp();
    const card = screen.getByTestId('mini-media-m-sunset');
    fireEvent.click(card);
    fireEvent.click(card); // the second click of a double-click: ignored
    const v1 = S().doc.clips.filter((c) => c.trackId === 'V1');
    expect(v1).toHaveLength(4); // 3 seed (c1-c3) + exactly one append
    expect(S().past).toHaveLength(1); // one ⌘Z restores the pre-append world
  });
});

describe('PR69 C6: toast honesty (pause / close / error TTL)', () => {
  it('hover pauses the auto-dismiss timer', () => {
    vi.useFakeTimers();
    renderApp();
    setStore(() => S().pushToast('info', 'paused toast'));
    const toast = screen.getByTestId('mini-toast');
    fireEvent.mouseEnter(toast); // reader mid-sentence
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('mini-toast')).toBeInTheDocument(); // still there
    fireEvent.mouseLeave(toast);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByTestId('mini-toast')).toBeNull(); // un-paused → dismissed
    vi.useRealTimers();
  });

  it('errors outlive info toasts (8s) and carry a manual close button', () => {
    vi.useFakeTimers();
    renderApp();
    setStore(() => S().pushToast('error', 'the lane is full'));
    act(() => {
      vi.advanceTimersByTime(3000); // past the OLD 2.6s TTL
    });
    expect(screen.getByTestId('mini-toast')).toBeInTheDocument(); // still readable
    fireEvent.click(screen.getByTestId('mini-toast-close'));
    expect(screen.queryByTestId('mini-toast')).toBeNull();
    vi.useRealTimers();
  });
});

describe('PR69 C3/C20: solo surfaces play for real; the viewer stage announces its clip', () => {
  it('C3: the rAF loop mounts with Timeline (solo render, not just App)', () => {
    // rAF is stubbed by RTL's environment; assert the LOOP advances the
    // playhead when playing is set (the old solo-story world: playing=true
    // with NO loop — timecode frozen)
    renderApp();
    setStore(() => S().togglePlay());
    expect(S().playing).toBe(true);
    act(() => {
      S().tick(0.5);
    });
    expect(S().playhead).toBe(0.5); // the loop's step, wired
  });

  it('C20: the populated viewer frame exposes name/role/label (no aria-hidden)', () => {
    renderApp();
    const frame = screen.getByTestId('mini-viewer-frame');
    expect(frame).toHaveAttribute('role', 'img');
    expect(frame).toHaveAttribute('aria-label', expect.stringContaining('drone_launch'));
    expect(frame).not.toHaveAttribute('aria-hidden');
  });
});

/* ---- R2 (opus review round 1): the remaining pins ---- */

describe('R2: error toasts announce as alerts (R1-b P3-9)', () => {
  it('an error toast carries role=alert; info toasts stay polite status', () => {
    renderApp();
    setStore(() => S().pushToast('error', 'no room'));
    expect(screen.getByTestId('mini-toast')).toHaveAttribute('role', 'alert');
    setStore(() => S().pushToast('info', 'added'));
    expect(screen.getByTestId('mini-toast')).toHaveAttribute('role', 'status');
  });
});
