/* Clip component tests — selection state (05 §7.3), linked badge (05 §12.3),
   waveform vs filmstrip vs text bodies, offline + effect badges, blade-cut
   affordance, drag/trim/alt-duplicate commits + Esc cancel (18 §5 optimistic
   commit), locked lanes, and the §4.9 clip menu (mix-track escalation,
   §6.4 multi-delete confirmation). Drags are driven with raw pointer events
   dispatched at the clip itself (jsdom has no pointer-capture retargeting,
   which is exactly what these handlers fall back to). */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { Clip, EFFECT_DRAG_TYPE, CLIP_WAVEFORM_RAMP, textBarHeight, buttSplicedFollower } from './Clip';
import { renderShell, store, type UiPatch } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';
import { snapToFrame } from '../../lib/timecode';
import { mediaById } from '../../lib/mockData';
import { getWaveform } from '../../lib/waveform';
import { POOL_DRAG_TYPE } from '../shell/MediaPool';

/* snap targets mirroring the real Timeline set (clip edges + playhead) */
const SNAP = [0, 8.5, 17, 24, 30, 16];

/** Stands the active scene's lanes up like Timeline does — SUBSCRIBED to
 *  scenes so store writes (fade commits, splits) re-render with fresh el
 *  props, exactly like the real Timeline's flow. */
function Lanes({ overlayH = 60 }: { overlayH?: number }) {
  const scene = useUi((s) => s.scenes.find((x) => x.id === 'sc-1')!);
  return (
    <>
      {scene.tracks.map((t) => {
        const h = t.kind === 'main' ? 80 : t.id === 'tr-overlay-1' ? overlayH : 60;
        return (
          <div key={t.id} style={{ position: 'relative', height: h, width: 1400 }}>
            {t.elements.map((el) => (
              <Clip key={el.id} el={el} track={t} pxPerSec={46} laneHeight={h} snapTargets={SNAP} />
            ))}
          </div>
        );
      })}
    </>
  );
}

const boot = (patch: UiPatch = {}) => renderShell(<Lanes />, { patch });

const el = (id: string) => {
  for (const sc of store().scenes) for (const t of sc.tracks) {
    const hit = t.elements.find((e) => e.id === id);
    if (hit) return hit;
  }
  throw new Error(`element ${id} not found`);
};
const mainIds = () => store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-main')!.elements.map((e) => e.id);

describe('Clip', () => {
  it('selected clips get the accent outline; the clip is a labelled button (spec 05 §7.3)', () => {
    boot({ selection: ['el-2'] });
    const sel = screen.getByTestId('clip-el-2');
    expect(sel).toHaveAttribute('role', 'button');
    expect(sel).toHaveAttribute('aria-label', 'Marina interview, 00:00:08:12');
    expect(sel.style.outline).toContain('var(--accent-selection)');
    expect(screen.getByTestId('clip-el-1').style.outline).toBe('none');
  });

  it('the linked A/V badge only appears on clips with linkedTo (spec 05 §12.3)', () => {
    boot({});
    // el-2 ↔ el-7 are the only linked pair in the fixture
    expect(document.querySelectorAll('[aria-label="Linked audio and video"]').length).toBe(2);
    expect(screen.getByTestId('clip-el-2').querySelector('[title="Linked A/V"]')).not.toBeNull();
    expect(screen.getByTestId('clip-el-1').querySelector('[title="Linked A/V"]')).toBeNull();
  });

  it('audio clips render a waveform body + fade transition objects, not a filmstrip (spec 05 §7.1/§9, R20-W5 thread-5)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-6');
    expect(clip.querySelectorAll('svg rect').length).toBeGreaterThan(10); // waveform bars
    // el-6 has audioFadeIn 1 s / audioFadeOut 2 s → both transition objects (46 px/s)
    expect(clip.querySelectorAll('[data-testid^="fade-object-el-6"]').length).toBe(2);
    expect(clip.querySelector('div[style*="background-image"]')).toBeNull(); // no thumbnail strip
  });

  it('video clips render the filmstrip thumbnail; offline media gets the OFFLINE badge (spec 18 §4.2)', () => {
    // no fixture clip uses the offline asset m-04 — point el-4 at it
    useUi.setState({
      scenes: store().scenes.map((s) =>
        s.id === 'sc-1'
          ? { ...s, tracks: s.tracks.map((t) =>
              t.id === 'tr-main' ? { ...t, elements: t.elements.map((e) =>
                e.id === 'el-4' ? { ...e, mediaId: 'm-04' } : e) } : t) }
          : s,
      ),
    });
    boot({});
    const thumb = screen.getByTestId('clip-el-1').querySelector('div[style*="background-image"]') as HTMLElement | null;
    expect(thumb).not.toBeNull();
    expect(thumb!.style.backgroundImage).toContain('beach_wide.jpg');
    expect(screen.getByTestId('clip-el-4')).toHaveTextContent('OFFLINE');
    expect(screen.getByTestId('clip-el-1')).not.toHaveTextContent('OFFLINE');
  });

  it('text clips render the CENTERED THIN BAR (R20-W5 thread #56): clamp(20, lane·0.4, 28) = 24px at lane 60, label inside', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-5');
    const bar = screen.getByTestId('text-bar-el-5');
    expect(bar.style.height).toBe('24px'); // round(60 × 0.4)
    expect(bar.style.background).toBe('var(--clip-text)'); // caption-chip grammar skin
    expect(bar).toHaveTextContent('MARINA — FISHERWOMAN'); // the name lives INSIDE the bar
    expect(bar.querySelector('span')!.className).toContain('truncate'); // truncates, never wraps
    /* the CLIP BOX keeps the full-lane drag/select/trim/marquee surface (the
       contract's hit-test law — the bar is only the visual body): */
    expect(clip.className).toContain('top-[2px]');
    expect(clip.className).toContain('bottom-[2px]');
    expect(clip.querySelector('div > div > div')).not.toBeNull(); // centering wrapper inside the box
    // the bar re-clamps at the extremes via the exported formula (single source)
    expect(textBarHeight(34)).toBe(20);
    expect(textBarHeight(80)).toBe(28);
    expect(textBarHeight(10)).toBe(20);
  });

  it('the thin bar re-clamps with the LANE height (20px in a 34px lane) — per-track heights reflow it', () => {
    const first = boot({ selection: [] });
    first.unmount();
    // re-render with the overlay lane at 34px (blocks-like lane height)
    const { unmount } = renderShell(<Lanes overlayH={34} />);
    expect(screen.getByTestId('text-bar-el-5').style.height).toBe('20px'); // 34×0.4 = 13.6 → clamped to 20
    unmount();
  });

  it('blocks-variant text clips route through the SAME thin bar (blocks keeps full-height bodies for video/audio only)', () => {
    window.localStorage.setItem('nle-shell-variants:v1', 'theme:resolve,density:pro,clip:blocks,accent:gold,header:readout');
    boot({});
    expect(screen.getByTestId('text-bar-el-5').style.height).toBe('24px'); // not the full-height blocks body
    // the audio blocks body stays full-height (the isText routing is text-only)
    expect(screen.getByTestId('clip-el-6').querySelector('[style*="--clip-audio-a"]')).not.toBeNull();
    window.localStorage.removeItem('nle-shell-variants:v1');
  });

  it('the clip box keeps the full-lane SELECT surface around the thin bar (contract hit-test law)', () => {
    boot({ selection: [] });
    const clip = screen.getByTestId('clip-el-5');
    fireEvent.click(clip); // anywhere in the box — not just the bar — selects
    expect(store().selection).toEqual(['el-5']);
  });

  it('alt-drag ghost for a text clip renders the SAME-HEIGHT thin bar (preview matches the drop)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-5');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 402, altKey: true }); // 8.75 s × 46
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 510, altKey: true });
    const ghost = screen.getByTestId('clip-ghost-el-5');
    expect(ghost.style.background).toBe('transparent'); // the outer ghost no longer fills the lane
    const bar = ghost.querySelector('[style*="--clip-text"]') as HTMLElement;
    expect(bar.style.height).toBe('24px');
    expect(bar.style.background).toBe('var(--clip-text)');
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 510, altKey: true });
  });

  it('the F effect badge only appears when an effect is enabled (spec 18 §9 badges)', () => {
    const first = boot({});
    expect(screen.queryByText('F')).toBeNull(); // fx-1 ships disabled
    first.unmount();
    const scenes = store().scenes.map((s) =>
      s.id === 'sc-1'
        ? { ...s, tracks: s.tracks.map((t) =>
            t.id === 'tr-main' ? { ...t, elements: t.elements.map((e) =>
              e.id === 'el-1' ? { ...e, effects: [{ id: 'fx-1', name: 'Gaussian Blur', enabled: true }] } : e) } : t) }
        : s,
    );
    useUi.setState({ scenes });
    renderShell(<Lanes />);
    expect(screen.getByText('F')).toBeInTheDocument();
  });

  it('clicking selects; shift-click extends the selection additively (spec 16 selection)', () => {
    boot({ selection: [] });
    fireEvent.click(screen.getByTestId('clip-el-1'));
    expect(store().selection).toEqual(['el-1']);
    // el-2 is A/V-linked to el-7 (spec 05 §12.3: selecting one selects both) —
    // the pair joins the additive selection as a group
    fireEvent.click(screen.getByTestId('clip-el-2'), { shiftKey: true });
    expect(store().selection).toEqual(['el-1', 'el-2', 'el-7']);
  });

  it('blade tool: crosshair cursor + click splits at the click position (spec 16 B / 15 split)', () => {
    boot({ tool: 'blade' });
    const clip = screen.getByTestId('clip-el-1');
    expect(clip.style.cursor).toBe('crosshair');
    expect(screen.getByTestId('clip-el-2').style.cursor).toBe('crosshair');
    fireEvent.click(clip, { clientX: 100 }); // rect.left = 0 in jsdom → cut at 100/46 s
    expect(mainIds().some((id) => id.startsWith('el-1-b'))).toBe(true);
    expect(mainIds()).toHaveLength(5);
  });

  it('blade click at the clip edge is a no-op that leaves history clean (spec 18 §6.1 no-pollution)', () => {
    boot({ tool: 'blade' });
    fireEvent.click(screen.getByTestId('clip-el-1'), { clientX: 0 }); // cutTime = startTime
    expect(mainIds()).toHaveLength(4);
    expect(store().past).toHaveLength(0);
  });

  it('a move drag commits moveElement and pushes one undo entry (spec 18 §5 optimistic → commit)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    /* R15 T3: moves now REJECT half-open overlaps (spec-05 §8.3) — main has
       no free spot between the clips, so the drag lands past the tail
       (30 s content end): 8.5 s + 30 s = 38.5 s. */
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 }); // 8.5 s × 46
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 1771 }); // +1380 px → 38.5 s
    expect(screen.getByTestId('clip-drag-tc')).toBeInTheDocument(); // live TC bubble
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 1771 });
    expect(el('el-2').startTime).toBeCloseTo(38.5, 4);
    expect(store().past).toHaveLength(1);
  });

  it('an overlapping drop is REJECTED: no move, no history, honest toast (R15 T3 / spec-05 §8.3)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 489 }); // 8.5 → 10.625: overlaps el-3 [17,24)
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 489 });
    expect(el('el-2').startTime).toBe(8.5); // never moved
    expect(store().past).toHaveLength(0);
    expect(store().toasts.at(-1)!.title).toBe('Drop rejected');
    expect(store().toasts.at(-1)!.detail).toBe('clips would overlap (spec-05 §8.3)');
  });

  it('Alt+drag duplicates: ghost at the original, copy lands at the drop, original stays (spec 18 §5)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    // free-spot drop (38.5 s — see the overlap-rejection note above)
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, altKey: true });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 1771, altKey: true });
    expect(screen.getByTestId('clip-ghost-el-2')).toBeInTheDocument(); // faded ghost pinned at 8.5 s
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 1771 });
    const newId = store().selection[0]!;
    expect(newId).toMatch(/^el-2-d/);
    expect(el(newId).startTime).toBeCloseTo(38.5, 4);
    expect(el('el-2').startTime).toBe(8.5); // original never moves
    expect(mainIds()).toHaveLength(5);
    expect(store().past).toHaveLength(1); // ONE composite entry (duplicate + resolved move)
  });

  it('Escape mid-drag cancels: nothing commits, no history entry (spec 16 §3.3 escape)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 489 });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    fireEvent.pointerUp(clip, { pointerId: 1 });
    expect(el('el-2').startTime).toBe(8.5);
    expect(store().past).toHaveLength(0);
    expect(store().selection).toEqual(['el-2']); // boot selection survives
  });

  /* ---- R15 T2 gesture discipline (canonical §5: 5px threshold,
     drag-back-cancel, buttons-mask, lastGestureWasDrag) ---- */

  it('a sub-threshold press-drag-release is a plain click: no preview, no move, no history (R15 T2 5px threshold)', () => {
    boot({ selection: [] });
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, clientY: 100 });
    // Δ4px — under the strict >5px activation threshold
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 395, clientY: 100 });
    expect(screen.queryByTestId('clip-drag-tc')).not.toBeInTheDocument(); // no optimistic preview
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 395, clientY: 100 });
    expect(el('el-2').startTime).toBe(8.5);
    expect(store().past).toHaveLength(0);
    // under-threshold release = plain click — select semantics preserved
    fireEvent.click(clip);
    expect(store().selection).toEqual(['el-2', 'el-7']); // A/V pair joins (spec 05 §12.3)
  });

  it('crossing the threshold activates the drag: exactly 5px does NOT, 6px does — on either axis (strict >)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, clientY: 100 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 396, clientY: 100 }); // Δx = 5 → still pending
    expect(screen.queryByTestId('clip-drag-tc')).not.toBeInTheDocument();
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 397, clientY: 100 }); // Δx = 6 → active
    expect(screen.getByTestId('clip-drag-tc')).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    // Y axis counts on its own: a 6px vertical move activates too
    fireEvent.pointerDown(clip, { pointerId: 2, button: 0, clientX: 391, clientY: 100 });
    fireEvent.pointerMove(clip, { pointerId: 2, buttons: 1, clientX: 391, clientY: 106 }); // Δy = 6
    expect(screen.getByTestId('clip-drag-tc')).toBeInTheDocument();
    fireEvent.pointerUp(clip, { pointerId: 2, clientX: 391, clientY: 106 }); // Δ > 5 → not drag-back
    expect(el('el-2').startTime).toBe(8.5); // dt = 0 — no move committed
    expect(store().past).toHaveLength(0);
  });

  it('drag-back-cancel: a release back within 5px of the gesture origin is a CANCEL — no write, no history, click may select', () => {
    boot({ selection: [] });
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, clientY: 100 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 489, clientY: 100 }); // activate + preview
    expect(screen.getByTestId('clip-drag-tc')).toBeInTheDocument();
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 393, clientY: 102 }); // back within 5px (both axes)
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 393, clientY: 102 });
    expect(el('el-2').startTime).toBe(8.5); // never moved
    expect(store().past).toHaveLength(0); // canonical: no history entry
    // lastGestureWasDrag = false on the drag-back path — the follow-up click selects
    fireEvent.click(clip);
    expect(store().selection).toEqual(['el-2', 'el-7']);
  });

  it('buttons-mask: a mid-drag move with the left button released cancels the gesture (no commit)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 489 });
    expect(screen.getByTestId('clip-drag-tc')).toBeInTheDocument();
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 0, clientX: 500 }); // button dropped off-window
    expect(screen.queryByTestId('clip-drag-tc')).not.toBeInTheDocument(); // preview discarded
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 500 });
    expect(el('el-2').startTime).toBe(8.5);
    expect(store().past).toHaveLength(0);
  });

  it('pointercancel discards the gesture without committing (R15 T2)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 489 });
    fireEvent.pointerCancel(clip, { pointerId: 1 });
    expect(el('el-2').startTime).toBe(8.5);
    expect(store().past).toHaveLength(0);
    expect(screen.queryByTestId('clip-drag-tc')).not.toBeInTheDocument();
  });

  it('lastGestureWasDrag: the follow-up click after a committed drag is swallowed; the next click selects', () => {
    boot({ selection: [] });
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 1771 }); // 38.5 s free spot (R15 T3 overlap law)
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 1771 });
    expect(el('el-2').startTime).toBeCloseTo(38.5, 4);
    fireEvent.click(clip); // the browser-synthesized follow-up click — NOT a re-select
    expect(store().selection).toEqual([]);
    fireEvent.click(clip); // flag consumed — a genuine click selects again
    expect(store().selection).toEqual(['el-2', 'el-7']);
  });

  it('after an Esc-cancelled drag the trailing click may select (canonical cancel() clears the flag)', () => {
    boot({ selection: [] });
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 489 });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    fireEvent.pointerUp(clip, { pointerId: 1 });
    fireEvent.click(clip);
    expect(store().selection).toEqual(['el-2', 'el-7']);
  });

  it('the left trim handle commits the trimmed start/duration (spec 05 §14.2 + R15 T4 handles)', () => {
    boot({}); // selection ['el-2'] — canonical: selection gets handles
    const clip = screen.getByTestId('clip-el-2');
    const leftHandle = screen.getByTestId('clip-trim-l-el-2');
    // trim IN (+46 px = +1 s): newStart 9.5, duration 7.5, sourceStart advances
    fireEvent.pointerDown(leftHandle, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(leftHandle, { pointerId: 1, buttons: 1, clientX: 437 });
    fireEvent.pointerUp(leftHandle, { pointerId: 1 });
    expect(el('el-2').startTime).toBe(9.5);
    expect(el('el-2').duration).toBe(7.5);
    expect(el('el-2').sourceStart).toBeCloseTo(4.0, 5); // 3.0 + 1.0
  });

  /* R23-FIX (review-sweep item 13, R3-P2#2): both trim handles carry z-[4] —
     above the fade objects (z-[3]), level with the affordance below — so a
     selected clip's corner trim gesture wins the shared hit zone. The old
     DOM order + z-3 let a fade object eat the handle's pointer events; the
     comment at Clip.tsx ~:1252 falsely claimed the zones were disjoint.
     Style-level pin (jsdom has no hit-testing). */
  it('R23-FIX item 13: both trim handles carry z-[4] — above the fade objects, level with the affordance', () => {
    boot({}); // selection ['el-2'] — the seeded fadeIn makes the head-zone competition live
    expect(screen.getByTestId('clip-trim-l-el-2')).toHaveClass('z-[4]');
    expect(screen.getByTestId('clip-trim-r-el-2')).toHaveClass('z-[4]');
    // the fade object sits BELOW: its z-[3] loses the shared corner to the handle
    const fadeObj = screen.getByTestId('fade-object-el-2-in');
    expect(fadeObj).toHaveClass('z-[3]');
  });

  /* ---- R15 T4: trim laws at the gesture level ---- */

  it("R15 T4 NEIGHBOR BOUND: the left edge cannot extend past the previous clip's end — clamped, no write", () => {
    boot({});
    const leftHandle = screen.getByTestId('clip-trim-l-el-2');
    // drag LEFT by 91 px (8.5 → 6.54): el-1 ends at 8.5 → the edge clamps to 8.5,
    // delta 0 → NOOP (canonical §9 neighbor law; the R14 mock let it overlap)
    fireEvent.pointerDown(leftHandle, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(leftHandle, { pointerId: 1, buttons: 1, clientX: 300 });
    fireEvent.pointerUp(leftHandle, { pointerId: 1 });
    expect(el('el-2').startTime).toBe(8.5); // never crossed the neighbor
    expect(el('el-2').duration).toBe(8.5);
    expect(store().past).toHaveLength(0); // clamped to a no-op — no history
  });

  it('R15 T4 FRAME-SNAP-ONCE: an odd-px right-edge drag keeps start+duration on the frame grid (single owner)', () => {
    boot({ selection: ['el-6'] }); // el-6 [0,30) — the only clip on A1, source 120 s
    const rightHandle = screen.getByTestId('clip-trim-r-el-6');
    // +47 px = 1.0217 s → ONE snap of the edge: 745/24 frames (31.0417 s)
    fireEvent.pointerDown(rightHandle, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(rightHandle, { pointerId: 1, buttons: 1, clientX: 438 });
    fireEvent.pointerUp(rightHandle, { pointerId: 1 });
    const e = el('el-6');
    expect(e.startTime).toBe(0);
    expect(e.duration).toBeCloseTo(745 / 24, 6); // frame-clean
    expect((e.duration * 24) % 1).toBeCloseTo(0, 6); // the invariant: on-grid
    expect(store().past).toHaveLength(1);
  });

  it('R15 T4 SOURCE-EXTENT: the right edge cannot extend past the media tail (12.8 s source for el-4)', () => {
    boot({ selection: ['el-4'] });
    const rightHandle = screen.getByTestId('clip-trim-r-el-4');
    // request +20 s (far past m-05's 12.8 s tail) → clamped to the extent;
    // source-extent beats frame alignment (12.8 is OFF-grid, canonical §9)
    fireEvent.pointerDown(rightHandle, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(rightHandle, { pointerId: 1, buttons: 1, clientX: 1311 }); // +20 s
    fireEvent.pointerUp(rightHandle, { pointerId: 1 });
    expect(el('el-4').duration).toBeCloseTo(12.8, 5); // the media tail wins
    expect(store().past).toHaveLength(1);
  });

  it('R15 T4 handles: selected-only + select/roll/ripple/stretch tools; slip/slide/blade render none (canonical §17)', () => {
    boot({ selection: [] });
    expect(screen.queryByTestId('clip-trim-l-el-2')).not.toBeInTheDocument(); // unselected → no handles
    fireEvent.click(screen.getByTestId('clip-el-2'));
    expect(store().selection).toEqual(['el-2', 'el-7']);
    expect(screen.getByTestId('clip-trim-l-el-2')).toBeInTheDocument(); // selected → handles
    expect(screen.getByTestId('clip-trim-r-el-2').style.cursor).toBe('e-resize');
    expect(screen.getByTestId('clip-trim-l-el-2').style.cursor).toBe('w-resize');
    for (const tool of ['slip', 'slide', 'blade'] as const) {
      act(() => { useUi.setState({ tool }); });
      expect(screen.queryByTestId('clip-trim-l-el-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('clip-trim-r-el-2')).not.toBeInTheDocument();
    }
  });

  /* ---- R15 T4 tool gestures (spec-06 §10.5 OT-GAP) ---- */

  it('R15 T4 ROLL gesture (⌥-drag an edge in select): the junction moves — A grows, B shrinks, total preserved, ONE entry', () => {
    boot({});
    const leftHandle = screen.getByTestId('clip-trim-l-el-2');
    fireEvent.pointerDown(leftHandle, { pointerId: 1, button: 0, clientX: 391, altKey: true });
    fireEvent.pointerMove(leftHandle, { pointerId: 1, buttons: 1, clientX: 437, altKey: true }); // +1 s
    fireEvent.pointerUp(leftHandle, { pointerId: 1 });
    expect(el('el-1').duration).toBe(9.5); // A extended
    expect(el('el-1').startTime).toBe(0);
    expect(el('el-2').startTime).toBe(9.5); // B retracted at the head
    expect(el('el-2').duration).toBe(7.5);
    expect(el('el-2').sourceStart).toBeCloseTo(4.0, 5); // B shows later content
    expect(el('el-1').startTime + el('el-1').duration).toBe(el('el-2').startTime); // glued junction
    expect(store().past).toHaveLength(1); // ONE entry for the whole roll
  });

  it("R15 T4 ROLL bounded: B keeps a 1-frame minimum (the junction cannot pass B's tail) — roll tool route", () => {
    boot({ tool: 'roll' });
    const rightHandle = screen.getByTestId('clip-trim-r-el-2');
    // drag the el-2/el-3 junction RIGHT by 100 s → clamped to el-3's 1-frame min
    fireEvent.pointerDown(rightHandle, { pointerId: 1, button: 0, clientX: 782 });
    fireEvent.pointerMove(rightHandle, { pointerId: 1, buttons: 1, clientX: 5382 });
    fireEvent.pointerUp(rightHandle, { pointerId: 1 });
    expect(el('el-2').duration).toBeCloseTo(8.5 + 7 - 1 / 24, 5); // grew to leave el-3 one frame
    expect(el('el-3').duration).toBeCloseTo(1 / 24, 6);
    expect(el('el-3').startTime).toBeCloseTo(el('el-2').startTime + el('el-2').duration, 5);
    expect(store().past).toHaveLength(1);
  });

  it('R15 T4 ROLL inert without an adjacent neighbor (el-4 has no right neighbor): no gesture, no write', () => {
    boot({ tool: 'roll', selection: ['el-4'] });
    const rightHandle = screen.getByTestId('clip-trim-r-el-4');
    fireEvent.pointerDown(rightHandle, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(rightHandle, { pointerId: 1, buttons: 1, clientX: 489 });
    fireEvent.pointerUp(rightHandle, { pointerId: 1 });
    expect(el('el-4').duration).toBe(6); // a gap has no junction to roll
    expect(store().past).toHaveLength(0);
  });

  it('R15 T4 RIPPLE gesture (right edge): later same-track clips shift with the trimmed end; ONE entry', () => {
    boot({ tool: 'ripple' });
    const rightHandle = screen.getByTestId('clip-trim-r-el-2');
    fireEvent.pointerDown(rightHandle, { pointerId: 1, button: 0, clientX: 782 }); // 17 s
    fireEvent.pointerMove(rightHandle, { pointerId: 1, buttons: 1, clientX: 690 }); // −2 s → 15
    fireEvent.pointerUp(rightHandle, { pointerId: 1 });
    expect(el('el-2').duration).toBe(6.5);
    expect(el('el-3').startTime).toBe(15); // glued to the new end
    expect(el('el-4').startTime).toBe(22); // shifted by the same delta
    expect(el('el-6').startTime).toBe(0); // A1 bed is a different track — never follows
    expect(store().past).toHaveLength(1);
  });

  it('R15 T4 RIPPLE left edge: the head region is removed — clip KEEPS its start, downstream closes the gap', () => {
    boot({ tool: 'ripple' });
    const leftHandle = screen.getByTestId('clip-trim-l-el-2');
    fireEvent.pointerDown(leftHandle, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(leftHandle, { pointerId: 1, buttons: 1, clientX: 483 }); // +2 s head removed
    fireEvent.pointerUp(leftHandle, { pointerId: 1 });
    expect(el('el-2').startTime).toBe(8.5); // kept (trimToPlayhead ripple-l model)
    expect(el('el-2').duration).toBe(6.5);
    expect(el('el-2').sourceStart).toBeCloseTo(5.0, 5); // content advanced
    expect(el('el-3').startTime).toBe(15); // downstream closed the gap
    expect(el('el-4').startTime).toBe(22);
    expect(store().past).toHaveLength(1);
  });

  it('R15 T4 SLIP gesture: position FIXED, the content translates under the clip, sourceStart moves (bounded)', () => {
    boot({ tool: 'slip' });
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 437 }); // +1 s: content follows the pointer
    const content = screen.getByTestId('clip-content-el-2');
    expect(content.style.transform).toBe('translateX(46px)'); // the film slides under the FIXED box
    expect(screen.getByTestId('clip-el-2').style.left).toBe(`${8.5 * 46}px`); // position never moves
    fireEvent.pointerUp(clip, { pointerId: 1 });
    expect(el('el-2').startTime).toBe(8.5); // FIXED
    expect(el('el-2').duration).toBe(8.5); // FIXED
    expect(el('el-2').sourceStart).toBeCloseTo(2.0, 5); // earlier content (grab-the-film metaphor)
    expect(store().past).toHaveLength(1);
  });

  it('R15 T4 SLIP bounded: dragging far past the source head clamps to 0 (m-02 headroom = 3 s)', () => {
    boot({ tool: 'slip' });
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 2671 }); // +49.6 s requested
    fireEvent.pointerUp(clip, { pointerId: 1 });
    expect(el('el-2').sourceStart).toBe(0); // clamped to the source head
    expect(store().past).toHaveLength(1);
  });

  it('R15 T4 SLIDE gesture: the clip moves, neighbors make room — no overlap, ONE entry', () => {
    boot({ tool: 'slide' });
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 437 }); // → 9.5 s
    expect(clip.style.left).toBe('437px'); // the clip itself follows the pointer
    fireEvent.pointerUp(clip, { pointerId: 1 });
    expect(el('el-2').startTime).toBe(9.5);
    expect(el('el-1').duration).toBe(9.5); // left neighbor's right edge followed (made room)
    expect(el('el-3').startTime).toBe(18); // right neighbor's left edge trimmed to abut
    expect(el('el-3').duration).toBe(6);
    expect(el('el-3').sourceStart).toBeCloseTo(1.0, 5); // lost a second of head
    // no overlap anywhere on the lane
    const main = store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-main')!.elements;
    for (let i = 1; i < main.length; i++) {
      expect(main[i - 1]!.startTime + main[i - 1]!.duration).toBeLessThanOrEqual(main[i]!.startTime + 1e-9);
    }
    expect(store().past).toHaveLength(1);
  });

  it('R15 T4 STRETCH gesture: duration changes, speed compensates (span preserved), badge previews the rate', () => {
    boot({ tool: 'stretch', selection: ['el-6'] }); // el-6 [0,30), span 30, no neighbor
    const rightHandle = screen.getByTestId('clip-trim-r-el-6');
    fireEvent.pointerDown(rightHandle, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(rightHandle, { pointerId: 1, buttons: 1, clientX: 621 }); // +5 s → dur 35
    expect(screen.getByTestId('clip-stretch-badge')).toHaveTextContent('86%'); // 30/35 ≈ 0.857
    fireEvent.pointerUp(rightHandle, { pointerId: 1 });
    expect(el('el-6').duration).toBe(35);
    expect(el('el-6').speed).toBeCloseTo(30 / 35, 5); // speed = sourceSpan / duration
    expect(el('el-6').duration * (el('el-6').speed ?? 1)).toBeCloseTo(30, 5); // the span invariant
    expect(store().past).toHaveLength(1);
  });

  it('R15 T4 STRETCH rate clamp: the compensated speed never leaves [0.01, 5] (spec-06 §5.8)', () => {
    // el-5 (text clip, no neighbor, no source bound): span 3.25 → the 0.01
    // floor caps the duration at 325 s — a right-edge drag past it clamps.
    // (el-6's 3000 s clamp is pinned at the store level; a clip that wide
    // renders a 138 000 px waveform and is jsdom-slow by construction.)
    boot({ tool: 'stretch', selection: ['el-5'] });
    const rightHandle = screen.getByTestId('clip-trim-r-el-5');
    fireEvent.pointerDown(rightHandle, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(rightHandle, { pointerId: 1, buttons: 1, clientX: 15326 }); // +325.1 s requested
    fireEvent.pointerUp(rightHandle, { pointerId: 1 });
    expect(el('el-5').duration).toBeCloseTo(325, 3); // span / 0.01
    expect(el('el-5').speed).toBeCloseTo(0.01, 5); // the floor
  });

  it('R15 T5 SHIFT suppresses snapping: the same trim drag snaps without shift, stays on the raw grid with it', () => {
    // el-6's right edge → 23.85 s: the SNAP list carries 24 (el-4's start) within
    // the 10 px tolerance. Without shift the edge snaps to 24; WITH shift the
    // snap pass is skipped entirely and the edge lands on the pure frame grid.
    boot({ selection: ['el-6'] });
    const rightHandle = screen.getByTestId('clip-trim-r-el-6');
    fireEvent.pointerDown(rightHandle, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(rightHandle, { pointerId: 1, buttons: 1, clientX: 108 }); // −6.152 s → 23.848
    fireEvent.pointerUp(rightHandle, { pointerId: 1 });
    expect(el('el-6').duration).toBe(24); // snapped to the el-4 edge target
    // the SAME drag with shift held: no target consulted → raw frame grid
    fireEvent.pointerDown(rightHandle, { pointerId: 2, button: 0, clientX: 391 });
    fireEvent.pointerMove(rightHandle, { pointerId: 2, buttons: 1, clientX: 108, shiftKey: true });
    fireEvent.pointerUp(rightHandle, { pointerId: 2 });
    // (the gesture restarts from the POST-FIRST-TRIM duration 24 → −6.152 s
    // lands on the raw frame grid, NOT on the 24 target it just came from)
    expect(el('el-6').duration).toBeCloseTo(snapToFrame(24 - 6.152173913043478), 5); // 428/24, NOT 24
    expect(store().past).toHaveLength(2); // two committed trims
  });

  it('clips on a locked track are inert: no pointer events, stripes overlay, click does nothing (18 §4.5)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-7'); // tr-audio-2 ships locked
    expect(clip.style.pointerEvents).toBe('none');
    expect(clip.style.cursor).toBe('not-allowed');
    expect(clip.querySelector('.locked-stripes')).not.toBeNull();
    fireEvent.click(clip);
    expect(store().selection).toEqual(['el-2']); // unchanged
  });

  it('double-clicking an audio clip escalates into audio focus on its track (design doc §3.1 M3)', () => {
    boot({});
    fireEvent.doubleClick(screen.getByTestId('clip-el-6'));
    expect(store().page).toBe('audio');
    expect(store().mixerState).toBe('full');
    expect(store().audioLaneBoost).toBe(true);
    expect(store().stripFocus).toBe('tr-audio-1');
  });

  /* R15 T2: the POINTER right-click route moved to the Timeline scroll
     surface (single contextmenu router, canonical no-stopPropagation law) —
     see Timeline.test.tsx for the routed clip-menu tests. The clip keeps the
     §4.9 KEYBOARD route: */
  it('the §4.9 keyboard route (Shift+F10) opens the clip menu and its commands dispatch (R15 T2 restructure)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.keyDown(clip, { key: 'F10', shiftKey: true });
    expect(screen.getByTestId('shell-menu-clip')).toBeInTheDocument();
    expect(screen.getByTestId('shell-menu-clip-split')).toBeInTheDocument();
    expect(screen.getByTestId('shell-menu-clip-ripple-delete')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('shell-menu-clip-duplicate'));
    expect(mainIds()).toHaveLength(5); // duplicate committed via the keyboard-opened menu
  });
});

/* R14 wiring: ARIA button activation (Enter/Space) + the effects-rail drop
   target (application/x-nle-effect payloads — the AppShell effects rail's
   drag rows land as real store mutations, mirroring the lane pool-drop
   grammar). dataTransfer stubs follow the Timeline.test drop pattern. */
const fxPayload = (name: string, cat: string) => ({
  types: [EFFECT_DRAG_TYPE],
  getData: (t: string) => (t === EFFECT_DRAG_TYPE ? JSON.stringify({ name, cat }) : ''),
  dropEffect: '',
});

describe('Clip keyboard activation (ARIA button pattern, spec 18 §11)', () => {
  it('Enter and Space select; Shift+Enter extends additively (A/V pair joins)', () => {
    boot({ selection: [] });
    fireEvent.keyDown(screen.getByTestId('clip-el-1'), { key: 'Enter' });
    expect(store().selection).toEqual(['el-1']);
    fireEvent.keyDown(screen.getByTestId('clip-el-2'), { key: 'Enter', shiftKey: true });
    expect(store().selection).toEqual(['el-1', 'el-2', 'el-7']); // 05 §12.3 pair as a group
  });

  it('Space is prevented (no page scroll) and locked clips stay inert on Enter', () => {
    boot({ selection: [] });
    // fireEvent returns false when the handler called preventDefault
    expect(fireEvent.keyDown(screen.getByTestId('clip-el-1'), { key: ' ' })).toBe(false);
    expect(store().selection).toEqual(['el-1']);
    fireEvent.keyDown(screen.getByTestId('clip-el-7'), { key: 'Enter' }); // tr-audio-2 ships locked
    expect(store().selection).toEqual(['el-1']); // unchanged — same inert contract as clicks
  });
});

describe('Clip effects-rail drop target (R14 wiring)', () => {
  // the MIME contract is FIXED (AppShell EffectsPanel sets the same string) —
  // pin the literal so a silent rename on either side fails here first
  it('exports the fixed effects-rail drag MIME type', () => {
    expect(EFFECT_DRAG_TYPE).toBe('application/x-nle-effect');
  });

  it('an effect drag rings the clip; a Blur drop adds the effect with nominal defaults', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-3'); // no fixture effects on el-3
    fireEvent.dragOver(clip, { dataTransfer: fxPayload('Gaussian Blur', 'Blur') });
    expect(clip.className).toContain('ring-accent'); // subtle ring while hovering
    fireEvent.drop(clip, { dataTransfer: fxPayload('Gaussian Blur', 'Blur') });
    const fx = el('el-3').effects!;
    expect(fx).toHaveLength(1);
    expect(fx[0]!.name).toBe('Gaussian Blur');
    expect(fx[0]!.enabled).toBe(true);
    expect(fx[0]!.params).toEqual({ radius: 12 }); // Inspector's PARAM_DEFAULTS twin
    expect(clip.className).not.toContain('ring-accent'); // ring cleared on drop
    expect(store().past).toHaveLength(1); // one undoable addEffectToElement
  });

  it('a Transition drop sets transitionOut to the picked presentation on the crossfade type', () => {
    boot({});
    fireEvent.drop(screen.getByTestId('clip-el-3'), { dataTransfer: fxPayload('Dip to Black', 'Transition') });
    const tr = el('el-3').transitionOut!;
    expect(tr.type).toBe('crossfade'); // the mock's ONLY transition type — honest mapping
    expect(tr.presentation).toBe('Dip to Black');
  });

  it('unknown effect / transition names get honest toasts; nothing commits', () => {
    boot({});
    fireEvent.drop(screen.getByTestId('clip-el-3'), { dataTransfer: fxPayload('Nuke It', 'Stylize') });
    expect(store().toasts.at(-1)!.title).toBe('Unknown effect');
    expect(el('el-3').effects ?? []).toHaveLength(0);
    expect(store().past).toHaveLength(0);
    fireEvent.drop(screen.getByTestId('clip-el-3'), { dataTransfer: fxPayload('Melt', 'Transition') });
    expect(store().toasts.at(-1)!.title).toBe('Unknown transition');
    expect(el('el-3').transitionOut).toBeUndefined();
  });

  it('locked tracks refuse the drop (not-allowed, no commit); pool drags never ring', () => {
    boot({});
    const locked = screen.getByTestId('clip-el-7'); // tr-audio-2 ships locked
    const dt = fxPayload('Gaussian Blur', 'Blur');
    fireEvent.dragOver(locked, { dataTransfer: dt });
    expect(locked.className).not.toContain('ring-accent');
    expect(dt.dropEffect).toBe('none'); // not-allowed cursor grammar
    fireEvent.drop(locked, { dataTransfer: fxPayload('Gaussian Blur', 'Blur') });
    expect(el('el-7').effects ?? []).toHaveLength(0);
    expect(store().past).toHaveLength(0);
    // a media-pool drag is not an effect drag: no ring, no effect commit
    const el1 = screen.getByTestId('clip-el-1');
    fireEvent.dragOver(el1, { dataTransfer: { types: [POOL_DRAG_TYPE], dropEffect: '' } });
    expect(el1.className).not.toContain('ring-accent');
  });
});

/* ---------- R19: waveform v2, fade geometry, filmstrip cover, trim
   affordance, clip markers, caption chips, source preview ---------- */

describe('R19 waveform v2 (th_mto2xtgc + th_mto2y86w)', () => {
  /* the Lanes harness mounts sc-1 only */
  const audioClips = () => {
    const ids: { clip: HTMLElement; id: string; mediaId: string }[] = [];
    const sc = store().scenes.find((s) => s.id === 'sc-1')!;
    for (const t of sc.tracks) {
      if (t.kind !== 'audio') continue;
      for (const e of t.elements) {
        ids.push({ clip: screen.getByTestId(`clip-${e.id}`), id: e.id, mediaId: e.mediaId ?? e.id });
      }
    }
    return ids;
  };

  it('EVERY audio clip renders ≥1 bar with a POSITIVE width — the el-6 empty-svg regression (root cause: 100/bars − 0.4 < 0 past 250 bars)', () => {
    boot({});
    for (const { clip, id } of audioClips()) {
      const rects = clip.querySelectorAll('svg rect');
      expect(rects.length).toBeGreaterThanOrEqual(1); // ≥1 bar — th_mto2y86w
      for (const r of Array.from(rects)) {
        // the old bug: 345 bars at default zoom → width "-0.11%" → SVG renders nothing
        expect(parseFloat(r.getAttribute('width') ?? '0')).toBeGreaterThanOrEqual(1);
        expect(parseFloat(r.getAttribute('height') ?? '0')).toBeGreaterThanOrEqual(1); // min bar 1px
      }
      expect(id).toBeTruthy();
    }
  });

  it('symmetric envelope around the VISIBLE centerline: every bar centers on mid = (laneHeight−12)/2', () => {
    boot({});
    for (const { clip } of audioClips()) {
      const svg = clip.querySelector(`[data-testid^="clip-waveform-"]`) as SVGSVGElement;
      expect(svg).not.toBeNull();
      const center = svg.querySelector('line'); // the centerline (visible, first child)
      expect(center).not.toBeNull();
      const mid = parseFloat(center!.getAttribute('y1') ?? 'NaN');
      const h = parseFloat(svg.getAttribute('height') ?? 'NaN');
      expect(mid).toBeCloseTo(h / 2, 5);
      for (const r of Array.from(svg.querySelectorAll('rect'))) {
        const y = parseFloat(r.getAttribute('y') ?? 'NaN');
        const height = parseFloat(r.getAttribute('height') ?? 'NaN');
        expect(y + height / 2).toBeCloseTo(mid, 2); // bar center ≡ centerline — symmetric
      }
    }
  });

  it('deterministic per MEDIA (FNV-1a seed = mediaId): the first bar matches lib/waveform for m-06/m-07', () => {
    boot({});
    const el6 = screen.getByTestId('clip-el-6');
    const svg6 = el6.querySelector('[data-testid="clip-waveform-el-6"]') as SVGSVGElement;
    const h = parseFloat(svg6.getAttribute('height') ?? 'NaN'); // 60 − 12 = 48
    /* per-ELEMENT barCount (the Clip derives it from the clip's own pixel
       width — el-6 30 s → 345 bars, el-7 8.5 s → 97); the ramp shape is a
       function of barCount, so the expectation must match each clip's own
       count (the ramp exposed the old shared-345 shortcut for el-7). */
    const cases: { mediaId: string; clip: string; width: number }[] = [
      { mediaId: 'm-06', clip: 'clip-el-6', width: 30 * 46 },
      { mediaId: 'm-07', clip: 'clip-el-7', width: 8.5 * 46 },
    ];
    for (const { mediaId, clip, width } of cases) {
      const barCount = Math.max(1, Math.min(600, Math.floor(width / 4)));
      const bars = getWaveform(mediaId, barCount, { ramp: CLIP_WAVEFORM_RAMP });
      const b = bars[0]!;
      const half = Math.max(0.5, ((b.max + b.min) / 2) * (h / 2));
      const expected = { y: h / 2 - half, height: Math.max(1, half * 2) };
      const svg = screen.getByTestId(clip).querySelector(`[data-testid^="clip-waveform-"]`) as SVGSVGElement;
      const first = svg.querySelector('rect')!;
      expect(parseFloat(first.getAttribute('y') ?? 'NaN')).toBeCloseTo(expected.y, 3);
      expect(parseFloat(first.getAttribute('height') ?? 'NaN')).toBeCloseTo(expected.height, 3);
    }
    // heights vary across the envelope (not one flat block)
    const ys = Array.from(svg6.querySelectorAll('rect')).map((r) => r.getAttribute('height'));
    expect(new Set(ys).size).toBeGreaterThan(10);
  });

  it('attack/decay ramps (CLIP_WAVEFORM_RAMP): the head + tail bars are quieter than the body', () => {
    boot({});
    const svg = screen.getByTestId('clip-el-6').querySelector('[data-testid="clip-waveform-el-6"]') as SVGSVGElement;
    const rects = Array.from(svg.querySelectorAll('rect'));
    const hs = rects.map((r) => parseFloat(r.getAttribute('height') ?? '0'));
    const n = hs.length;
    const rampBars = Math.floor(n * CLIP_WAVEFORM_RAMP);
    const bodyMean = hs.slice(rampBars, n - rampBars).reduce((a, b) => a + b, 0) / (n - 2 * rampBars);
    const headMean = hs.slice(0, rampBars).reduce((a, b) => a + b, 0) / rampBars;
    const tailMean = hs.slice(n - rampBars).reduce((a, b) => a + b, 0) / rampBars;
    expect(headMean).toBeLessThan(bodyMean * 0.9); // quiet attack
    expect(tailMean).toBeLessThan(bodyMean * 0.9); // quiet decay
  });
});

/* R20-W5 (thread #62 / timeline-cluster thread-5): fades render as SELECTABLE,
   width-draggable TRANSITION OBJECTS (crossfade-block grammar, half-width at
   the clip head/tail). The fake curve-handle dots are REMOVED — they promised
   interaction they never had (the thread's core complaint). The envelope line
   + inaudible wedge geometry is unchanged (th_mto2ph3i) but now lives INSIDE
   the object node. */
describe('R20-W5 fade transition objects (thread #62 / timeline-cluster thread-5)', () => {
  it('slider semantics + width = model fields × pps; the fake handle dots are GONE (el-6: 1s in / 2s out at 46pps)', () => {
    boot({});
    const inObj = screen.getByTestId('fade-object-el-6-in');
    const outObj = screen.getByTestId('fade-object-el-6-out');
    expect(inObj).toHaveAttribute('role', 'slider');
    expect(inObj).toHaveAttribute('aria-label', 'Fade in duration, 1.00 seconds');
    expect(inObj).toHaveAttribute('aria-valuemin', '0');
    expect(inObj).toHaveAttribute('aria-valuemax', '720'); // 30 s × 24
    expect(inObj).toHaveAttribute('aria-valuenow', '24');  // 1 s × 24 — frame units, like the ruler sliders
    expect(inObj).toHaveAttribute('aria-valuetext', '1.00s');
    expect(outObj).toHaveAttribute('aria-label', 'Fade out duration, 2.00 seconds');
    expect(outObj).toHaveAttribute('aria-valuenow', '48'); // 2 s × 24
    expect(inObj.style.width).toBe('46px'); // audioFadeIn 1 s × 46 pps
    expect(outObj.style.width).toBe('92px'); // audioFadeOut 2 s × 46 pps
    // crossfade-block grammar: 1px border + gradient fill + 2px radius + ew-resize grab
    expect(inObj.style.border).toContain('var(--fade-line)');
    expect(inObj.style.background).toContain('linear-gradient');
    expect(inObj.className).toContain('cursor-ew-resize');
    expect(inObj.className).toContain('rounded-[2px]');
    // the FULL-AMPLITUDE bright strip: right edge on the in object, LEFT edge on the out (mirrored)
    const inStrip = inObj.querySelector('div[style*="--fade-line"]') as HTMLElement;
    expect(inStrip.className).toContain('right-0');
    const outStrip = outObj.querySelector('div[style*="--fade-line"]') as HTMLElement;
    expect(outStrip.className).toContain('left-0');
    // the fake handle dots are GONE (no circle anywhere in the clip)
    expect(screen.getByTestId('clip-el-6').querySelectorAll('circle').length).toBe(0);
  });

  it('the envelope line + inaudible wedge live INSIDE the object node — geometry unchanged (th_mto2ph3i)', () => {
    boot({});
    const bodyH = 60 - 4; // clip box inset 2px top/bottom of the 60px lane
    const inSvg = screen.getByTestId('fade-object-el-6-in').querySelector('svg')!;
    const inLine = inSvg.querySelector('line')!;
    // fade-in: rises (1, bodyH) → (45, 0) — zero at clip start, full at fade end
    expect(inLine.getAttribute('x1')).toBe('1');
    expect(inLine.getAttribute('y1')).toBe(`${bodyH}`);
    expect(inLine.getAttribute('x2')).toBe('45');
    expect(inLine.getAttribute('y2')).toBe('0');
    const inFill = inSvg.querySelector('polygon')!;
    expect(inFill.getAttribute('points')).toBe(`1,0 1,${bodyH} 45,0`);
    expect(inFill.getAttribute('fill')).toBe('rgba(0,0,0,0.25)');
    const outSvg = screen.getByTestId('fade-object-el-6-out').querySelector('svg')!;
    const outLine = outSvg.querySelector('line')!;
    // fade-out: falls (1, 0) → (90, bodyH) — full at the fade start, zero at the clip end
    expect(outLine.getAttribute('x1')).toBe('1');
    expect(outLine.getAttribute('y1')).toBe('0');
    expect(outLine.getAttribute('x2')).toBe('90');
    expect(outLine.getAttribute('y2')).toBe(`${bodyH}`);
    const outFill = outSvg.querySelector('polygon')!;
    expect(outFill.getAttribute('points')).toBe(`1,0 90,0 90,${bodyH}`);
    expect(outFill.getAttribute('fill')).toBe('rgba(0,0,0,0.25)');
  });

  it('dragging the IN object: press SELECTS the clip, live local preview (no mid-drag writes), ONE commit + ONE undo entry', () => {
    boot({ selection: [] });
    const inObj = screen.getByTestId('fade-object-el-6-in');
    fireEvent.pointerDown(inObj, { pointerId: 4, button: 0, clientX: 0 });
    expect(store().selection).toEqual(['el-6']); // select-on-press — the domain stays the CLIP
    fireEvent.pointerMove(inObj, { pointerId: 4, buttons: 1, clientX: 115 }); // 115/46 = 2.5 s
    // LIVE PREVIEW from local state — the store is untouched mid-drag (one-entry law)
    expect(el('el-6').audioFadeIn).toBe(1);
    expect(screen.getByTestId('fade-object-el-6-in').style.width).toBe('115px');
    expect(screen.getByTestId('fade-object-el-6-in')).toHaveAttribute('aria-valuetext', '2.50s'); // a11y follows the preview
    expect(store().past).toHaveLength(0);
    fireEvent.pointerUp(inObj, { pointerId: 4 });
    expect(el('el-6').audioFadeIn).toBe(2.5);
    expect(screen.getByTestId('fade-object-el-6-in').style.width).toBe('115px'); // committed width == preview
    expect(store().past).toHaveLength(1); // ONE entry per gesture — never per pointermove
  });

  it('dragging the OUT object resizes from the clip TAIL; clamped to [0, duration]; no-fade clips render no objects', () => {
    boot({ selection: [] });
    const outObj = screen.getByTestId('fade-object-el-6-out');
    fireEvent.pointerDown(outObj, { pointerId: 5, button: 0, clientX: 1380 }); // clip right edge (30 s × 46, jsdom rect.left 0)
    fireEvent.pointerMove(outObj, { pointerId: 5, buttons: 1, clientX: 1196 }); // 1380 − 1196 = 184 px → 4 s
    fireEvent.pointerUp(outObj, { pointerId: 5 });
    expect(el('el-6').audioFadeOut).toBe(4);
    // the clamp: dragging past the clip bounds clamps to [0, duration]
    fireEvent.pointerDown(outObj, { pointerId: 6, button: 0, clientX: 1380 });
    fireEvent.pointerMove(outObj, { pointerId: 6, buttons: 1, clientX: -100 }); // beyond the clip head
    fireEvent.pointerUp(outObj, { pointerId: 6 });
    expect(el('el-6').audioFadeOut).toBe(30); // clamped to el.duration, never negative
    // el-7 carries no fade fields → no objects (a 0-width fade renders nothing)
    expect(screen.queryByTestId('fade-object-el-7-in')).toBeNull();
    expect(screen.queryByTestId('fade-object-el-7-out')).toBeNull();
  });

  it('a plain click on the object selects the clip only — no value change, no history entry', () => {
    boot({ selection: [] });
    const inObj = screen.getByTestId('fade-object-el-6-in');
    fireEvent.pointerDown(inObj, { pointerId: 7, button: 0, clientX: 10 });
    fireEvent.pointerUp(inObj, { pointerId: 7 });
    expect(store().selection).toEqual(['el-6']);
    expect(el('el-6').audioFadeIn).toBe(1); // unchanged — no-op release commits nothing
    expect(store().past).toHaveLength(0);
  });

  it('keyboard: arrows nudge ±1 frame (⇧ ×10), Home 0 / End duration — one undoable step per keypress', () => {
    boot({});
    const inObj = screen.getByTestId('fade-object-el-6-in');
    fireEvent.keyDown(inObj, { key: 'ArrowRight' });
    expect(el('el-6').audioFadeIn).toBeCloseTo(1 + 1 / 24, 5);
    expect(store().past).toHaveLength(1);
    fireEvent.keyDown(inObj, { key: 'ArrowRight', shiftKey: true });
    expect(el('el-6').audioFadeIn).toBeCloseTo(1 + 11 / 24, 5);
    expect(store().past).toHaveLength(2);
    fireEvent.keyDown(inObj, { key: 'Home' });
    expect(el('el-6').audioFadeIn).toBe(0);
    expect(screen.queryByTestId('fade-object-el-6-in')).toBeNull(); // 0-width fade renders no object
    // End rides the OUT object (the in object just unmounted at zero)
    fireEvent.keyDown(screen.getByTestId('fade-object-el-6-out'), { key: 'End' });
    expect(el('el-6').audioFadeOut).toBe(30); // clamped to the clip duration
    expect(store().past).toHaveLength(4);
  });
});

describe('R19 filmstrip cover (th_mto334ar)', () => {
  it('filmstrip cells preserve the media aspect ratio (cover per cell — no 80px×100% stretch)', () => {
    boot({});
    const thumb = screen.getByTestId('clip-el-1').querySelector('div[style*="background-image"]') as HTMLElement;
    expect(thumb).not.toBeNull();
    const [w, h] = thumb.style.backgroundSize.split(' ');
    expect(h).toBe('100%'); // strip grammar: full strip height, repeat-x
    const m = mediaById('m-01')!;
    const stripH = Math.min(60, 80 - 18); // main lane 80px
    expect(parseFloat(w)).toBe(Math.round(stripH * ((m.width ?? 1920) / (m.height ?? 1080)))); // cell = stripH × aspect
    expect(thumb.style.backgroundRepeat).toBe('repeat-x');
    expect(thumb.style.backgroundSize).not.toBe('80px 100%'); // the old 4:3 stretch is gone
  });
});

describe('R19 selected-clip trim affordance (th_mto32fa6)', () => {
  it('selected + hovered renders the shaded accent edge zones; unselected or unhovered does not', () => {
    boot({ selection: [] }); // el-2 unselected at boot-patch
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.mouseEnter(clip); // unselected hover → cursor-only, no affordance
    expect(screen.queryByTestId('clip-trim-afford-el-2')).not.toBeInTheDocument();
    fireEvent.click(clip); // select (A/V pair joins — affordance is per-clip)
    expect(screen.getByTestId('clip-trim-afford-el-2')).toBeInTheDocument();
    expect(screen.queryByTestId('clip-trim-afford-el-7')).not.toBeInTheDocument(); // the linked twin is not hovered
    fireEvent.mouseLeave(clip);
    expect(screen.queryByTestId('clip-trim-afford-el-2')).not.toBeInTheDocument(); // hover-gated
    // selected-but-not-hovered → absent (re-hover to confirm the pair rule)
    fireEvent.mouseEnter(clip);
    expect(screen.getByTestId('clip-trim-afford-el-2')).toBeInTheDocument();
  });

  it('the affordance renders two 6px inset gradients from the selection accent at 55% → transparent', () => {
    boot({}); // boot selection ['el-2'] — pre-selected
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.mouseEnter(clip);
    const afford = screen.getByTestId('clip-trim-afford-el-2');
    expect(afford).toHaveAttribute('aria-hidden', 'true'); // never a hit target
    expect(afford.className).toContain('pointer-events-none');
    const zones = afford.querySelectorAll('div');
    expect(zones.length).toBe(2);
    for (const z of Array.from(zones)) {
      expect((z as HTMLElement).style.width).toBe('6px');
      expect((z as HTMLElement).style.background).toContain('color-mix(in srgb, var(--accent-selection) 55%, transparent)');
    }
  });
});

describe('R19 clip markers (gap C33 — pins + clip-menu ops)', () => {
  it('renders el.markers as shield pins inside the clip box (bottom-2px, left = offset·pps, colored, data-tip)', () => {
    boot({});
    const cm1 = screen.getByTestId('clip-marker-cm-1');
    expect(cm1).toHaveAttribute('data-tip', 'Look up · 00:00:10:12'); // el-2 start 8.5 + offset 2
    expect(cm1.style.left).toBe(`${2 * 46 - 4}px`); // centered on the offset
    expect(cm1.querySelector('svg')!.getAttribute('width')).toBe('8');
    expect(cm1.querySelector('path')!.getAttribute('fill')).toBe('var(--mk-green)');
    expect(screen.getByTestId('clip-marker-cm-2').querySelector('path')!.getAttribute('fill')).toBe('var(--mk-purple)');
    expect(screen.getByTestId('clip-marker-cm-3')).toBeInTheDocument(); // el-3's marker
    expect(screen.queryByTestId('clip-marker-cm-4')).toBeNull(); // no phantom pins
  });

  it('clicking a clip marker selects the CLIP (bubble — no separate selection domain)', () => {
    boot({ selection: [] });
    fireEvent.click(screen.getByTestId('clip-marker-cm-1'));
    expect(store().selection).toEqual(['el-2', 'el-7']); // the clip (A/V pair joins)
    expect(store().selectedMarkerId).toBeNull();
  });

  it('clip menu: "Add clip marker here" adds at the playhead (inside the clip), remove rows delete', () => {
    boot({ selection: ['el-2'] });
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.keyDown(clip, { key: 'F10', shiftKey: true });
    // playhead 16 is inside el-2 [8.5, 17) → offset 7.5
    fireEvent.click(screen.getByTestId('shell-menu-clip-add-clip-marker'));
    const markers = el('el-2').markers!;
    expect(markers).toHaveLength(3);
    expect(markers.at(-1)!.offset).toBe(7.5);
    expect(store().past).toHaveLength(1); // undoable
    // remove row per marker
    fireEvent.keyDown(clip, { key: 'F10', shiftKey: true });
    fireEvent.click(screen.getByTestId('shell-menu-clip-remove-clip-marker-cm-1'));
    expect(el('el-2').markers!.map((m) => m.id)).not.toContain('cm-1');
    expect(el('el-2').markers).toHaveLength(2);
    expect(store().past).toHaveLength(2);
  });

  it('clip menu add with the playhead OUTSIDE the clip falls back to the clip mid', () => {
    boot({ selection: ['el-3'], playhead: 0 }); // el-3 [17, 24) — playhead 0 outside
    fireEvent.keyDown(screen.getByTestId('clip-el-3'), { key: 'F10', shiftKey: true });
    fireEvent.click(screen.getByTestId('shell-menu-clip-add-clip-marker'));
    const markers = el('el-3').markers!;
    expect(markers).toHaveLength(2);
    expect(markers.at(-1)!.offset).toBe(3.5); // mid of the 7 s clip
  });
});

describe('R19 clip menu "Open in viewer" (th_mto3504c part — spec 18 §4.3 v1.1)', () => {
  it('an online media clip enters source-preview mode', () => {
    boot({});
    fireEvent.keyDown(screen.getByTestId('clip-el-2'), { key: 'F10', shiftKey: true });
    fireEvent.click(screen.getByTestId('shell-menu-clip-open-in-viewer'));
    expect(store().viewerMode).toBe('source');
    expect(store().sourceMediaId).toBe('m-02');
    expect(store().toasts.at(-1)).toBeUndefined(); // no toast — real work
  });

  it('a text clip (no mediaId) answers with the honest toast, mode stays program', () => {
    boot({});
    fireEvent.keyDown(screen.getByTestId('clip-el-5'), { key: 'F10', shiftKey: true });
    fireEvent.click(screen.getByTestId('shell-menu-clip-open-in-viewer'));
    expect(store().viewerMode).toBe('program');
    expect(store().toasts.at(-1)!.title).toBe('Open in viewer');
    expect(store().toasts.at(-1)!.detail).toContain('text clips have no source media');
  });

  it('an OFFLINE asset answers with the honest toast', () => {
    useUi.setState({
      scenes: store().scenes.map((s) =>
        s.id === 'sc-1'
          ? { ...s, tracks: s.tracks.map((t) =>
              t.id === 'tr-main' ? { ...t, elements: t.elements.map((e) =>
                e.id === 'el-4' ? { ...e, mediaId: 'm-04' } : e) } : t) }
          : s,
      ),
    });
    boot({ selection: ['el-4'] });
    fireEvent.keyDown(screen.getByTestId('clip-el-4'), { key: 'F10', shiftKey: true });
    fireEvent.click(screen.getByTestId('shell-menu-clip-open-in-viewer'));
    expect(store().viewerMode).toBe('program');
    expect(store().toasts.at(-1)!.detail).toContain('offline');
  });
});

describe('R19 caption chips (gap C34 — the tr-caption lane)', () => {
  it('caption elements render as parchment chips with the caption body text (not generic text clips)', () => {
    boot({});
    const chip = screen.getByTestId('caption-chip-cap-1');
    expect(chip).toHaveTextContent('We always visit this beach');
    expect(chip.style.background).toBe('rgb(193, 181, 156)'); // #c1b59c (CAPTION_PARCHMENT — jsdom normalizes hex) 
    expect(chip.className).toContain('rounded-[2px]');
    expect(chip.className).toContain('h-[24px]'); // 24px chip in the 32px lane
    expect(screen.getByTestId('caption-chip-cap-2')).toHaveTextContent('Nous venons tout le temps à la plage.');
    // the chip label falls back to name when text is missing
    expect(screen.queryByText('Sub 1')).toBeNull();
  });

  it('clicking a chip selects the caption element (→ CaptionInspector routing)', () => {
    boot({ selection: [] });
    fireEvent.click(screen.getByTestId('clip-cap-3'));
    expect(store().selection).toEqual(['cap-3']);
    // selected chip carries the standard accent ring (clip-box selection)
    expect(screen.getByTestId('clip-cap-3').style.outline).toContain('var(--accent-selection)');
  });
});

/* ---------- R23-WA (DESIGN-R23 D-A2/D-A3): the FX engine's clip face ----------
   The recede law (clips dim to 45%, trim/drag/context-menu OFF, clicks keep
   selecting) + the fade-object grammar's new FX-domain membership (the press
   writes selectedFxObject; the ring mirrors the match) + the video fade
   objects (effectiveFade: fadeIn/fadeOut for non-audio kinds) + the Fades
   browser-row drop parser (setFade, never addEffectToElement — R23-B note 21). */

describe('R23-WA: fxMode recede (D-A2.1 — the edit gestures are OFF, clicks still select)', () => {
  it('a SELECTED clip renders NO trim handles in fxMode; the body dims to 45%', () => {
    boot({ selection: ['el-2'], tool: 'fx', fxMode: true });
    expect(screen.queryByTestId('clip-trim-l-el-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('clip-trim-r-el-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('clip-trim-afford-el-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('clip-el-2').style.opacity).toBe('0.45');
    // the fade objects above stay full-strength (the engine's edit targets)
    expect(screen.getByTestId('fade-object-el-2-in').style.opacity).toBe('');
  });

  it('a plain click still selects the clip (the FX inspector then shows its effect stack)', () => {
    boot({ selection: [], tool: 'fx', fxMode: true });
    fireEvent.click(screen.getByTestId('clip-el-1'));
    expect(store().selection).toEqual(['el-1']);
    expect(store().selectedFxObject).toBeNull(); // a clip click alone writes NO FX object
  });

  it('the keyboard clip-menu route is OFF in fxMode (Shift+F10 never opens the edit menu)', () => {
    boot({ selection: ['el-2'], tool: 'fx', fxMode: true });
    fireEvent.keyDown(screen.getByTestId('clip-el-2'), { key: 'F10', shiftKey: true });
    expect(screen.queryByTestId('shell-menu-clip')).not.toBeInTheDocument();
  });

  it('regression law: OUT of fxMode the selected clip still mounts its trim handles', () => {
    boot({ selection: ['el-2'] }); // fxMode false — today's grammar unchanged
    expect(screen.getByTestId('clip-trim-l-el-2')).toBeInTheDocument();
    expect(screen.getByTestId('clip-trim-r-el-2')).toBeInTheDocument();
    expect(screen.getByTestId('clip-el-2').style.opacity).toBe('');
  });
});

describe('R23-WA: the fade objects — video fades + the FX-domain membership (D-A3)', () => {
  it('video clips render fade objects from fadeIn/fadeOut (the demo fades; el-1: 0.5s in / 0.75s out at 46pps)', () => {
    boot({});
    const inObj = screen.getByTestId('fade-object-el-1-in');
    const outObj = screen.getByTestId('fade-object-el-1-out');
    expect(inObj).toHaveAttribute('role', 'slider');
    expect(inObj.getAttribute('aria-valuenow')).toBe('12');  // 0.5 s × 24 — frame units
    expect(outObj.getAttribute('aria-valuenow')).toBe('18'); // 0.75 s × 24
    expect(inObj.style.width).toBe('23px'); // 0.5 × 46
    expect(outObj.style.width).toBe('34.5px'); // 0.75 × 46
    // every main-track video clip carries the demo pair
    for (const id of ['el-1', 'el-2', 'el-3']) {
      expect(screen.getByTestId(`fade-object-${id}-in`)).toBeInTheDocument();
      expect(screen.getByTestId(`fade-object-${id}-out`)).toBeInTheDocument();
    }
    // a clip with NO fades renders no objects (the text clip el-5)
    expect(screen.queryByTestId('fade-object-el-5-in')).toBeNull();
  });

  it('pressing a fade object selects the clip AND writes the FX domain (one gesture, the pair survives)', () => {
    boot({ selection: [], tool: 'fx', fxMode: true });
    fireEvent.pointerDown(screen.getByTestId('fade-object-el-1-in'), { button: 0, pointerId: 3 });
    expect(store().selection).toEqual(['el-1']);
    expect(store().selectedFxObject).toEqual({ kind: 'fade', elementId: 'el-1', side: 'in' });
    fireEvent.pointerUp(screen.getByTestId('fade-object-el-1-in'), { pointerId: 3 }); // no-op release — no commit
    expect(el('el-1').fadeIn).toBe(0.5);
    expect(store().past).toHaveLength(0);
  });

  it('the selection ring renders ONLY on the matching object (the FX-domain mirror)', () => {
    boot({ selection: ['el-1'], selectedFxObject: { kind: 'fade', elementId: 'el-1', side: 'in' } });
    expect(screen.getByTestId('fade-object-el-1-in').style.outline).toContain('var(--accent-selection)');
    expect(screen.getByTestId('fade-object-el-1-out').style.outline).toBe('');
  });

  it('the drag commit routes the store\'s setFade seam (store-owned clamp; audio stays the audioFade domain)', () => {
    boot({});
    const obj = screen.getByTestId('fade-object-el-6-in');
    fireEvent.pointerDown(obj, { button: 0, pointerId: 3 });
    fireEvent.pointerMove(obj, { pointerId: 3, buttons: 1, clientX: 115 });
    fireEvent.pointerUp(obj, { pointerId: 3 });
    expect(el('el-6').audioFadeIn).toBe(2.5); // audio element → audioFadeIn (fieldOfFade)
    expect(store().past).toHaveLength(1); // ONE commit for the whole gesture
  });
});

describe('R23-WA: the Fades browser-row drop parser (D-A5 — setFade, never addEffectToElement)', () => {
  it('a "Fade In 1s" row dropped on a clip writes fadeIn=1; a Fade Out row writes fadeOut', () => {
    boot({});
    fireEvent.drop(screen.getByTestId('clip-el-3'), { dataTransfer: fxPayload('Fade In 1s', 'Fade') });
    expect(el('el-3').fadeIn).toBe(1);
    expect(el('el-3').fadeOut).toBe(0.5); // the other side untouched
    expect(el('el-3').effects ?? []).toHaveLength(0); // never a stack entry
    fireEvent.drop(screen.getByTestId('clip-el-3'), { dataTransfer: fxPayload('Fade Out 2s', 'Fade') });
    expect(el('el-3').fadeOut).toBe(2);
    expect(store().past).toHaveLength(2); // one setFade per drop
  });

  it('a bare "Fade In" row (no duration suffix) defaults to 0.5s (the parser\'s preset floor)', () => {
    boot({});
    fireEvent.drop(screen.getByTestId('clip-el-5'), { dataTransfer: fxPayload('Fade In', 'Fade') });
    expect(el('el-5').fadeIn).toBe(0.5);
  });

  it('an unknown fade row is refused with the honest toast; nothing commits', () => {
    boot({});
    fireEvent.drop(screen.getByTestId('clip-el-3'), { dataTransfer: fxPayload('Fade Sideways', 'Fade') });
    expect(store().toasts.at(-1)!.title).toBe('Unknown fade preset');
    expect(el('el-3').fadeIn).toBe(0.5); // untouched
    expect(store().past).toHaveLength(0);
  });
});

/* ---------- R24-W3 (DESIGN-R24 §3 W3 — A1): the shared FX-row parser.
   The Clip body drop is DOOR 1 — the routing table lands here at the
   component surface: the butt-spliced-follower adjacency law, the honest
   refusal when a transition row has no cut behind it, and the effect STACK
   with the ×N toast (duplicates legal — the Resolve/Premiere OFX law). ---------- */

describe('R24-W3 (A1-R3): the parser\'s routing at the body door', () => {
  it('buttSplicedFollower: exact butt-splices resolve (el-1→el-2, el-2→el-3); gaps + lane-last clips do not (s2-1, el-4) — the seams builder\'s 1ms tolerance', () => {
    expect(buttSplicedFollower('el-1')?.id).toBe('el-2');
    expect(buttSplicedFollower('el-2')?.id).toBe('el-3');
    expect(buttSplicedFollower('el-4')).toBeNull(); // tr-main's LAST clip — no out seam
    expect(buttSplicedFollower('s2-1')).toBeNull(); // sc-2's 0.25 s gap — not a butt-splice
  });

  it('a transition row on a clip body with NO butt-spliced follower refuses honestly — no mint, no history (the adjacency guard)', () => {
    boot({});
    fireEvent.drop(screen.getByTestId('clip-el-4'), { dataTransfer: fxPayload('Dip to Black', 'Transition') });
    expect(store().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'Transitions need a cut' });
    expect(store().toasts.at(-1)!.detail).toContain('no clip after this one — transitions need a cut');
    expect(el('el-4').transitionOut).toBeUndefined(); // nothing minted — no cut, no transition
    expect(store().past).toHaveLength(0);
  });

  it('effect rows STACK: a duplicate Gaussian Blur on el-1 (seeded) reaches ×2 with the honest count toast', () => {
    boot({});
    fireEvent.drop(screen.getByTestId('clip-el-1'), { dataTransfer: fxPayload('Gaussian Blur', 'Blur') });
    const fx = el('el-1').effects!;
    expect(fx).toHaveLength(2); // the seeded instance + the pushed one — duplicates are legal
    expect(fx.every((f) => f.name === 'Gaussian Blur')).toBe(true);
    expect(store().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'Gaussian Blur × 2' });
    expect(store().past).toHaveLength(1); // one addEffectToElement entry
  });
});
