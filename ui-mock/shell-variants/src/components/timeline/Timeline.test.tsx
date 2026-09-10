/* Timeline component tests — lane rendering (spec 05 §12 / 18 §4.7), marquee +
   empty-lane deselect, playhead scrub (05 §14.3), +track affordance, lane
   heights incl. the audio-focus boost (design doc §3.2 / spec 16 §3.8), pool
   drag-to-lane (18 §4.2), transition marker (05 §12.3), wheel grammar
   (18 §5A). jsdom has no layout: assertions hit conditional rendering,
   store-driven inline styles, and store wiring — never hit-testing geometry. */

import { describe, expect, it, vi } from 'vitest';
import { act, createEvent, fireEvent, screen, within } from '@testing-library/react';
import { Timeline } from './Timeline';
import { renderShell, store, type UiPatch } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';
import { useShortcuts } from '../../hooks/useShortcuts';
import { zoomController } from '../../lib/zoomController';
import { sceneDuration } from '../../lib/mockData';
import { snapToFrame } from '../../lib/timecode';
import { isGestureActive } from '../../lib/timelinePlacement';
import { POOL_DRAG_TYPE } from '../shell/MediaPool';

const boot = (patch: UiPatch = {}) => renderShell(<Timeline />, { patch });
const laneOf = (clipId: string) => screen.getByTestId(`clip-${clipId}`).parentElement as HTMLElement;
const scrollEl = () => document.getElementById('timeline-scroll') as HTMLElement;
const scene1 = () => store().scenes.find((s) => s.id === 'sc-1')!;
const countEls = () => store().scenes.find((s) => s.id === 'sc-1')!.tracks.reduce((m, t) => m + t.elements.length, 0);

/* escape-ladder harness: mounts the shell's window keydown layer next to
 * the Timeline so the composed ladder (gesture-cancel → shell selection
 * clear) is testable at the surface level. */
function ShortcutsHarness() {
  useShortcuts(sceneDuration(scene1()));
  return null;
}

describe('Timeline', () => {
  it('renders one lane per track, the in-window clips, and the header column (spec 05 §12 lanes / 18 §4.7)', () => {
    boot({});
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    // R23-FIX (R3-P3#7): SceneTabs' aria-controls="shell-timeline" resolves —
    // the id exists on the mounted root (was dangling since R19; the compact
    // strip carries the same id — the two surfaces never coexist)
    expect(document.getElementById('shell-timeline')).toBe(screen.getByTestId('shell-timeline'));
    // readout-style header zone carries the big TC readout
    expect(screen.getByTestId('shell-timeline-tc')).toHaveTextContent('00:00:16:00');
    const headers = screen.getByTestId('shell-track-headers');
    for (const id of ['tr-overlay-1', 'tr-main', 'tr-audio-1', 'tr-audio-2', 'tr-caption']) {
      expect(within(headers).getByTestId(`shell-track-header-${id}`)).toBeInTheDocument();
    }
    /* R15 T9 clip virtualization: clips entirely outside [scrollLeft − 200,
       scrollLeft + viewportW + 200] are skipped. jsdom's viewport fallback is
       900 px → window [−200, 1100] at pps 46 — el-4 (24 s → starts at 1104 px)
       is the ONLY fixture clip culled at boot; a real ≥1500 px shell viewport
       keeps it (deliberate contract change, canonical virtualization law). */
    for (const id of ['el-1', 'el-2', 'el-3', 'el-5', 'el-6', 'el-7']) {
      expect(screen.getByTestId(`clip-${id}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('clip-el-4')).not.toBeInTheDocument();
  });

  it('dragging the playhead head scrubs the time and snaps to clip edges (spec 05 §14.3 + §9 snap)', () => {
    boot({});
    const head = document.querySelector('.cursor-col-resize') as HTMLElement;
    expect(head).not.toBeNull();
    fireEvent.pointerDown(head, { pointerId: 1, button: 0 });
    fireEvent.pointerMove(head, { pointerId: 1, buttons: 1, clientX: 460 }); // 460/46 = 10 s raw → snaps to cap-4's 9.875 edge (R19 caption edges are element snap sources)
    expect(store().playhead).toBe(9.875);
    // 790 px → 17.17 s, within the 10 px snap tolerance of the el-2/el-3 cut at 17 s
    fireEvent.pointerMove(head, { pointerId: 1, buttons: 1, clientX: 790 });
    expect(store().playhead).toBe(17);
  });

  it('a plain click on the empty lane clears the selection (spec 18 §4.7 empty-lane deselect)', () => {
    boot({}); // boot selection = ['el-2']
    fireEvent.pointerDown(laneOf('el-1'), { pointerId: 1, button: 0, clientX: 0, clientY: 120 });
    fireEvent.pointerUp(scrollEl(), { pointerId: 1 });
    expect(store().selection).toEqual([]);
  });

  it('a marquee drag rubber-band-selects the clips the rect intersects (spec 05 §9)', () => {
    boot({});
    // drag inside the V1 lane band (y 104..184 in content coords), 0 s → 8.26 s
    fireEvent.pointerDown(laneOf('el-1'), { pointerId: 1, button: 0, clientX: 0, clientY: 120 });
    fireEvent.pointerMove(scrollEl(), { pointerId: 1, buttons: 1, clientX: 380, clientY: 160 });
    expect(screen.getByTestId('timeline-marquee')).toBeInTheDocument();
    fireEvent.pointerUp(scrollEl(), { pointerId: 1 });
    expect(screen.queryByTestId('timeline-marquee')).not.toBeInTheDocument();
    expect(store().selection).toEqual(['el-1']); // el-2 starts at 8.5 — outside the rect
  });

  /* ---- R15 T2/T7 marquee activation + ratchet ---- */

  it('marquee 5px activation: ≤5px never renders the band and releases as a click-deselect; >5px activates (strict >)', () => {
    boot({}); // selection ['el-2']
    const lane = laneOf('el-1');
    fireEvent.pointerDown(lane, { pointerId: 1, button: 0, clientX: 100, clientY: 120 });
    fireEvent.pointerMove(scrollEl(), { pointerId: 1, buttons: 1, clientX: 105, clientY: 120 }); // Δx = 5 → still pending
    expect(screen.queryByTestId('timeline-marquee')).not.toBeInTheDocument();
    fireEvent.pointerUp(scrollEl(), { pointerId: 1 });
    expect(store().selection).toEqual([]); // under-threshold release = click → deselect (kept behavior)
    fireEvent.pointerDown(lane, { pointerId: 2, button: 0, clientX: 100, clientY: 120 });
    fireEvent.pointerMove(scrollEl(), { pointerId: 2, buttons: 1, clientX: 106, clientY: 120 }); // Δx = 6 → active
    expect(screen.getByTestId('timeline-marquee')).toBeInTheDocument();
    fireEvent.pointerUp(scrollEl(), { pointerId: 2 });
    // the 6px rect (x 100..106 ≈ 2.17..2.30 s) still intersects el-1 → replace
    expect(store().selection).toEqual(['el-1']);
  });

  it('additive marquee = live-merge RATCHET: shift-drag merges live and only ever GROWS (R15 T7)', () => {
    boot({ selection: ['el-2'] });
    const lane = laneOf('el-1');
    fireEvent.pointerDown(lane, { pointerId: 1, button: 0, clientX: 0, clientY: 120, shiftKey: true });
    // 780 px → 16.96 s: rect covers el-1 (0..8.26) + el-2 (8.5..17) on the main band
    fireEvent.pointerMove(scrollEl(), { pointerId: 1, buttons: 1, clientX: 780, clientY: 160, shiftKey: true });
    expect(screen.getByTestId('timeline-marquee')).toBeInTheDocument();
    // LIVE merge during the drag: initial selection ∪ intersected
    expect(store().selection).toEqual(['el-2', 'el-1']);
    // shrink the rect to x 0..7.9 s — el-2 leaves the rect but NEVER un-selects
    fireEvent.pointerMove(scrollEl(), { pointerId: 1, buttons: 1, clientX: 363, clientY: 160, shiftKey: true });
    expect(store().selection).toEqual(['el-2', 'el-1']); // ratchet: grow-only
    fireEvent.pointerUp(scrollEl(), { pointerId: 1 });
    expect(store().selection).toEqual(['el-2', 'el-1']); // release adds nothing (already live)
  });

  it('a buttons-mask-0 move cancels the marquee without deselecting (R15 T2 belt-and-braces)', () => {
    boot({}); // selection ['el-2']
    fireEvent.pointerDown(laneOf('el-1'), { pointerId: 1, button: 0, clientX: 0, clientY: 120 });
    fireEvent.pointerMove(scrollEl(), { pointerId: 1, buttons: 1, clientX: 380, clientY: 160 });
    expect(screen.getByTestId('timeline-marquee')).toBeInTheDocument();
    fireEvent.pointerMove(scrollEl(), { pointerId: 1, buttons: 0, clientX: 400, clientY: 160 }); // left button released
    expect(screen.queryByTestId('timeline-marquee')).not.toBeInTheDocument();
    fireEvent.pointerUp(scrollEl(), { pointerId: 1 });
    expect(store().selection).toEqual(['el-2']); // cancelled gesture ≠ click — no deselect
  });

  it('Escape mid-marquee cancels the gesture without changing the selection (spec 16 §3.3 escape)', () => {
    boot({});
    fireEvent.pointerDown(laneOf('el-1'), { pointerId: 1, button: 0, clientX: 0, clientY: 120 });
    fireEvent.pointerMove(scrollEl(), { pointerId: 1, buttons: 1, clientX: 380, clientY: 160 });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(screen.queryByTestId('timeline-marquee')).not.toBeInTheDocument();
    fireEvent.pointerUp(scrollEl(), { pointerId: 1 });
    expect(store().selection).toEqual(['el-2']); // untouched by the cancelled gesture
  });

  it('the + track affordance appends a real audio track below main (spec 05 §12.1)', () => {
    boot({});
    fireEvent.click(screen.getByRole('button', { name: 'Add audio track' }));
    const sc = scene1();
    expect(sc.tracks).toHaveLength(6);
    expect(sc.tracks[5]!.kind).toBe('audio');
    expect(sc.tracks[5]!.badge).toBe('A3'); // 2 existing audio lanes → next badge A3
    expect(screen.getByTestId(`shell-track-header-${sc.tracks[5]!.id}`)).toBeInTheDocument();
  });

  it('audio focus boosts audio lanes ×1.6 and compresses video/overlay (design doc §3.2, spec 16 §3.8)', () => {
    const first = boot({});
    // spec 05 §12.2 filmstrip defaults
    expect(laneOf('el-1').style.height).toBe('80px');
    expect(laneOf('el-5').style.height).toBe('60px');
    expect(laneOf('el-6').style.height).toBe('60px');
    first.unmount();
    boot({ audioLaneBoost: true });
    expect(laneOf('el-1').style.height).toBe('40px'); // main capped at 40
    expect(laneOf('el-5').style.height).toBe('28px'); // overlay capped at 28
    expect(laneOf('el-6').style.height).toBe('96px'); // audio 60 × 1.6
    // R23-FIX (review-sweep R5-P3#6): the caption lane is EXEMPT from the 28px
    // cap — its own law (gap C34) is 32px (24px parchment chips + insets);
    // capping it to 28 squashed the chips mid-audio-focus
    expect(laneOf('cap-1').style.height).toBe('32px');
  });

  it('the blocks clip-style variant swaps to the compact 40/34/28 lanes (spec 05 §12.2 blocks)', () => {
    window.localStorage.setItem('nle-shell-variants:v1', 'theme:resolve,density:pro,clip:blocks,accent:gold,header:readout');
    boot({});
    expect(laneOf('el-1').style.height).toBe('40px');
    expect(laneOf('el-5').style.height).toBe('28px');
    expect(laneOf('el-6').style.height).toBe('34px');
  });

  /* ---- R20-W5 (thread #58 / D1.5, gap C57): PER-TRACK lane heights ---- */

  it('setTrackHeight override → lane div AND header both reflow; view state (no history)', () => {
    boot({});
    act(() => { useUi.getState().setTrackHeight('tr-main', 120); });
    expect(laneOf('el-1').style.height).toBe('120px');
    expect(screen.getByTestId('shell-track-header-tr-main').style.height).toBe('120px');
    expect(store().past).toHaveLength(0); // view state — never inside a withHistory snapshot
    // the Clip prop + other lanes keep their auto heights (single-source laneHeight)
    expect(laneOf('el-5').style.height).toBe('60px');
    expect(laneOf('el-6').style.height).toBe('60px');
    // downstream consumers reflow too: the crossfade block's height (lane − 4px inset)
    expect(screen.getByTestId('transition-el-2').style.height).toBe('116px');
  });

  it('store clamp law: min 24 (caption floor 32 — the 24px chip + insets), max 240; null resets to auto', () => {
    boot({});
    act(() => { useUi.getState().setTrackHeight('tr-main', 500); });
    expect(store().trackHeightOverrides['tr-main']).toBe(240);
    act(() => { useUi.getState().setTrackHeight('tr-main', 5); });
    expect(store().trackHeightOverrides['tr-main']).toBe(24);
    act(() => { useUi.getState().setTrackHeight('tr-caption', 30); });
    expect(store().trackHeightOverrides['tr-caption']).toBe(32); // caption floor wins
    act(() => { useUi.getState().setTrackHeight('tr-main', null); });
    expect(store().trackHeightOverrides['tr-main']).toBeUndefined(); // key deleted
    expect(laneOf('el-1').style.height).toBe('80px'); // back to the kind auto height
  });

  it('composition: override REPLACES the pref-sized auto; the boost still transforms (yield rule)', () => {
    boot({ audioLaneBoost: true });
    // custom 60 audio lane shows 96 in focus (×1.6 — proportional participation)
    act(() => { useUi.getState().setTrackHeight('tr-audio-1', 60); });
    expect(laneOf('el-6').style.height).toBe('96px');
    // custom 120 main CAPS at 40 in focus — the documented yield rule
    act(() => { useUi.getState().setTrackHeight('tr-main', 120); });
    expect(laneOf('el-1').style.height).toBe('40px');
    // the pref only applies where NO override exists (overlay auto tall 84 → capped 28)
    act(() => { useUi.getState().setTrackHeightPref('tall'); });
    expect(laneOf('el-5').style.height).toBe('28px');
    expect(laneOf('el-6').style.height).toBe('96px'); // the override still REPLACES the pref
    expect(laneOf('el-1').style.height).toBe('40px');
  });

  it('undo/redo never touches trackHeightOverrides (view state, not a snapshot slice)', () => {
    boot({});
    act(() => { useUi.getState().setTrackHeight('tr-main', 120); });
    // a doc mutation (marker add) mints history; undo restores scenes but NOT the height
    act(() => { useUi.getState().addMarker(5); });
    expect(store().past).toHaveLength(1);
    act(() => { useUi.getState().undo(); });
    expect(laneOf('el-1').style.height).toBe('120px'); // the override survived the undo round-trip
  });

  it('renders the crossfade box straddling the el-2 → el-3 cut (spec 05 §12.3 transition indicator)', () => {
    boot({});
    expect(screen.getByTestId('transition-el-2')).toHaveAttribute('aria-label', 'Crossfade transition, 0.75 seconds');
    expect(screen.queryByTestId('transition-el-1')).not.toBeInTheDocument(); // only el-2 carries one
  });

  /* R23-FIX (review-sweep item 1, R3-P1#1): the box is CLICK-THROUGH outside
     fxMode — it used to eat edit-mode trim/marquee gestures that passed under
     its 40px-height z-7 rectangle (rendered on EVERY lane, inert but
     pointer-hungry). elementFromPoint-style hit assertions are jsdom-
     impossible, so the inline style is the law's observable. Registered loss:
     the edit-mode title tooltip on the box is click-through-unavailable — the
     seam zone's data-tip + the fx-mode box carry the info. */
  it('R23-FIX item 1: pointerEvents "none" outside fxMode, "auto" in fxMode — the box never eats edit gestures', () => {
    const editTree = boot({});
    expect(screen.getByTestId('transition-el-2').style.pointerEvents).toBe('none');
    editTree.unmount();
    boot({ tool: 'fx', fxMode: true, selection: [] });
    expect(screen.getByTestId('transition-el-2').style.pointerEvents).toBe('auto');
    // the locked guard: a transition seeded onto LOCKED tr-audio-2 stays inert
    // even in fxMode (pointerEvents none — the lane's own lock law)
    act(() => {
      useUi.setState({
        scenes: store().scenes.map((sc) => sc.id !== 'sc-1' ? sc : {
          ...sc,
          tracks: sc.tracks.map((t) => t.id !== 'tr-audio-2' ? t : {
            ...t,
            elements: t.elements.map((e) => e.id !== 'el-7' ? e : {
              ...e,
              transitionOut: { type: 'crossfade', presentation: 'Cross Dissolve', duration: 0.5, alignment: 0.5 },
            }),
          }),
        }),
      });
    });
    expect(screen.getByTestId('transition-el-7').style.pointerEvents).toBe('none'); // locked lane — never a gesture target
  });

  /* R23-FIX (review-sweep item 15, R3-P2#4): the boxes ride the clips'
     virtualization window (clipVisible) — an offscreen box used to escape
     virtualization and keep its z-7 pointer surface mounted over lanes the
     user scrolled to. High zoom + scroll are the two cull paths. */
  it('R23-FIX item 15: high zoom OR a far scroll culls the offscreen transition box (the clips\' own window law)', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    expect(screen.getByTestId('transition-el-2')).toBeInTheDocument(); // el-2 [391,782]px is in the boot window [−200,1100]
    // high zoom: the cut at 17 s moves to 17·5000 px — far outside the window
    act(() => { useUi.getState().setZoom(5000); });
    expect(screen.queryByTestId('transition-el-2')).not.toBeInTheDocument();
    act(() => { useUi.getState().setZoom(46); });
    expect(screen.getByTestId('transition-el-2')).toBeInTheDocument(); // back in
    // far scroll: window [scroll−200, scroll+1100] — scroll 1000 starts past el-2's 782px end
    act(() => { scrollEl().scrollLeft = 1000; });
    fireEvent.scroll(scrollEl());
    expect(screen.queryByTestId('transition-el-2')).not.toBeInTheDocument();
  });

  /* fixes th_mto31dyp — Resolve-style transition restyle. R24-W3 re-pin:
     the F3 split moved the paint law onto the VISUAL child — the WRAPPER
     keeps the box geometry (height + top-[2px]), the visual carries the
     border/gradient/rounded/glyph grammar byte-identical. */
  it('transition block restyle (F3 split): the WRAPPER keeps height + top-[2px]; the VISUAL child carries border/gradient/rounded/glyph (th_mto31dyp)', () => {
    boot({});
    const wrap = screen.getByTestId('transition-el-2');
    expect(wrap.style.height).toBe('76px'); // main lane 80 − 4 inset
    expect(wrap.className).toContain('top-[2px]'); // 2px inset top/bottom
    expect(wrap.className).not.toContain('overflow-hidden'); // F3: the wrapper is UN-clipped — handles hang outside
    const vis = screen.getByTestId('transition-visual-el-2');
    expect(vis.className).toContain('overflow-hidden'); // the paint child clips
    expect(vis.style.border).toBe('1px solid var(--transition-mark)');
    expect(vis.style.background).toContain('to bottom'); // VERTICAL gradient
    expect(vis.style.background).toContain('30%, transparent');
    expect(vis.style.background).toContain('70%, transparent');
    expect(vis.className).toContain('rounded-[2px]');
    // slim crossfade glyph: two overlapping triangles (not the old X)
    const paths = vis.querySelectorAll('svg path');
    expect(paths.length).toBe(2);
    for (const p of Array.from(paths)) expect(p.getAttribute('fill')).toBe('white');
  });

  /* fixes th_mto2zq0g — bounded scroll runway */
  it('bounded scroll runway: contentW ≤ dur·pps + 25% viewport — scrolling STOPS just past the content end (th_mto2zq0g)', () => {
    boot({});
    const vw = 900; // jsdom's ResizeObserver-less viewport fallback
    const content = document.getElementById('timeline-content')!;
    const w = parseFloat(content.style.width);
    const durPps = sceneDuration(scene1()) * store().pxPerSec; // 30 s × 46 = 1380
    expect(w).toBe(durPps + 0.15 * vw); // default zoom: canonical 15% padding (under the cap)
    // the LAW: scrollMax = scrollWidth − clientWidth = contentW − viewport ≤ 25% of the viewport
    expect(w).toBeLessThanOrEqual(durPps + 0.26 * vw);
    expect(w).toBeGreaterThan(durPps); // …and still renders a little past the content end
    expect(content.style.width).toBe(`${w}px`);
    // ruler ticks + lane backgrounds paint the FULL contentW
    const ruler = content.querySelector('[data-testid="ruler-marker-band"]')!.parentElement as HTMLElement;
    expect(ruler.style.width).toBe(`${w}px`);
    // THE CAP BITES when the canonical padding exceeds 25% (long-scene /
    // floored-min regime — simulated by a higher dynamic min): contentW is
    // pinned to dur·pps + 25%·vw exactly, where the old formula rendered
    // dur·pps + 32%·vw of trailing runway ("scrolling into nothing").
    act(() => { useUi.setState({ zoomMinPps: 21 }); });
    expect(parseFloat(content.style.width)).toBe(durPps + 0.25 * vw); // 1605 — capped
    expect(parseFloat(content.style.width)).toBeLessThan(durPps + 0.32 * vw); // the un-capped canonical value
  });

  /* R19 caption lane (gap C34) */
  it('the caption track renders a 32px dedicated-tint lane with parchment chips + a CC header carrying the caption count', () => {
    boot({});
    const lane = laneOf('cap-1');
    expect(lane.style.height).toBe('32px');
    expect(lane.style.background).toContain('color-mix(in srgb, #c1b59c 10%, var(--lane-overlay))');
    // 5 chips render in the lane with body text
    for (let i = 1; i <= 5; i++) expect(screen.getByTestId(`caption-chip-cap-${i}`)).toBeInTheDocument();
    expect(screen.getByTestId('caption-chip-cap-1')).toHaveTextContent('We always visit this beach');
    // header: CC badge + the clip count + lock/mute controls
    const header = screen.getByTestId('shell-track-header-tr-caption');
    expect(within(header).getByText('CC')).toBeInTheDocument();
    expect(within(header).getByTestId('track-clip-count-CC')).toHaveTextContent('5 captions');
    expect(within(header).getByTestId('shell-track-CC-btn-lock')).toBeInTheDocument();
    expect(within(header).getByTestId('shell-track-CC-btn-mute')).toBeInTheDocument();
  });

  it('every tall track header shows its clip count (reference “V2 · 7 clips”); clicking a chip selects the caption', () => {
    boot({ selection: [] });
    expect(screen.getByTestId('track-clip-count-V1')).toHaveTextContent('4 clips'); // tr-main: el-1..4
    expect(screen.getByTestId('track-clip-count-T1')).toHaveTextContent('1 clip');
    expect(screen.getByTestId('track-clip-count-A1')).toHaveTextContent('1 clip');
    fireEvent.click(screen.getByTestId('caption-chip-cap-3').closest('[data-clip-id]') as HTMLElement);
    expect(store().selection).toEqual(['cap-3']);
  });

  /* R20-W2: jsdom's drop Event fallback DROPS clientX/altKey init props (the
     documented TL dataTransfer-drops-clientX trap) — inject them with
     Object.defineProperty on a createEvent-built event, the one reliable
     channel. dropAt(el, x, {alt}) = the honest drop constructor. */
  const dropAt = (el: HTMLElement, clientX: number, opts?: { alt?: boolean }) => {
    const ev = createEvent.drop(el, { dataTransfer: { types: [POOL_DRAG_TYPE] } });
    Object.defineProperty(ev, 'clientX', { value: clientX });
    if (opts?.alt) Object.defineProperty(ev, 'altKey', { value: true });
    fireEvent(el, ev);
  };

  it('pool drag-to-lane highlights the lane and a drop commits the REAL plan/apply placement (spec 18 §4.2 / contract §7)', () => {
    boot({ mediaDrag: { mediaId: 'm-06', overTrackId: 'tr-audio-1', allowed: true } });
    expect(laneOf('el-6').className).toContain('pool-lane-ok');
    dropAt(laneOf('el-6'), 0); // jsdom rects are 0 → clientX 0 = time 0
    expect(store().mediaDrag).toBeNull();
    expect(store().toasts.at(-1)!.kind).toBe('success');
    expect(store().toasts.at(-1)!.title).toBe('Inserted ocean_ambience.wav');
    /* R20-W2: the old toast-only mock is gone — the drop runs the SAME
       plan/apply the SourceEditBar runs (mode 'insert', drop x = time 0,
       this lane the explicit target): a REAL clip lands on A1 (m-06 120 s
       → capped 30 s at t=0) and ripple-pushes el-6 [0,30) right by 30,
       ONE undo entry. */
    const a1 = scene1().tracks.find((t) => t.id === 'tr-audio-1')!;
    expect(a1.elements.find((e) => e.mediaId === 'm-06' && e.startTime === 0 && e.duration === 30 && e.id !== 'el-6')).toBeDefined();
    expect(a1.elements.find((e) => e.id === 'el-6')!.startTime).toBe(30);
    expect(store().past).toHaveLength(1);
  });

  it('Alt-drop = overwrite (contract §7): the covered span is REPLACED in place — destructive, not ripple-pushed', () => {
    boot({ mediaDrag: { mediaId: 'm-02', overTrackId: 'tr-main', allowed: true } });
    dropAt(laneOf('el-1'), 0, { alt: true });
    const main = scene1().tracks.find((t) => t.id === 'tr-main')!.elements;
    // m-02 95.2s → capped 30s OVERWRITE at t=0 covers [0,30): el-1 [0,8.5),
    // el-2 [8.5,17), el-3 [17,24), el-4 [24,30) are ALL fully covered →
    // removed (overwrite is destructive in place; the new clip replaces the
    // span — nothing is pushed right)
    for (const id of ['el-1', 'el-2', 'el-3', 'el-4']) {
      expect(main.find((e) => e.id === id)).toBeUndefined();
    }
    expect(main.find((e) => e.mediaId === 'm-02' && e.startTime === 0 && e.duration === 30)).toBeDefined();
    expect(main).toHaveLength(1);
    expect(store().toasts.at(-1)!.title).toBe('Overwrote interview_marina.mp4');
  });

  it('frozen-lane guard (thread #65): source-mode audio source freezes non-audio lanes — dimmed + aria-disabled + honest drop refusal', () => {
    boot({ viewerMode: 'source', sourceMediaId: 'm-06', mediaDrag: { mediaId: 'm-01', overTrackId: 'tr-main', allowed: true } });
    const mainLane = laneOf('el-1');
    expect(mainLane).toHaveAttribute('data-frozen', 'true');
    expect(mainLane).toHaveAttribute('aria-disabled', 'true');
    expect(mainLane.style.opacity).toBe('0.55'); // 1 × 0.55 frozen dim
    // the audio lane stays fully interactive
    expect(laneOf('el-6')).not.toHaveAttribute('data-frozen');
    // a drop on the frozen lane refuses honestly (pointer-events allowed)
    fireEvent.drop(mainLane, { dataTransfer: { types: [POOL_DRAG_TYPE] } });
    expect(store().toasts.at(-1)).toMatchObject({
      kind: 'error',
      title: 'Frozen lane',
      detail: expect.stringContaining('an audio source targets audio lanes'),
    });
    const main = scene1().tracks.find((t) => t.id === 'tr-main')!.elements;
    // doc untouched: still exactly the 4 fixture clips, no NEW m-01 element
    // (el-1 is the fixture m-01 clip — it must still be there)
    expect(main).toHaveLength(4);
    expect(main.filter((e) => e.mediaId === 'm-01')).toEqual([main.find((e) => e.id === 'el-1')]);
  });

  it('program mode NEVER dims lanes (the guard is source-mode-only)', () => {
    boot({ viewerMode: 'program', sourceMediaId: null, mediaDrag: { mediaId: 'm-06', overTrackId: 'tr-audio-1', allowed: true } });
    expect(laneOf('el-1')).not.toHaveAttribute('data-frozen');
    expect(laneOf('el-1')).not.toHaveAttribute('aria-disabled');
    // ...and a source-mode VIDEO source never freezes anything either
    act(() => { useUi.setState({ viewerMode: 'source', sourceMediaId: 'm-02' }); });
    expect(laneOf('el-1')).not.toHaveAttribute('data-frozen');
  });

  it('an incompatible pool drop (video media over an audio lane) rejects with an error toast (spec 06 §5.9)', () => {
    boot({ mediaDrag: { mediaId: 'm-01', overTrackId: 'tr-audio-1', allowed: false } });
    expect(laneOf('el-6').className).toContain('pool-lane-bad');
    fireEvent.drop(laneOf('el-6'), { dataTransfer: { types: [POOL_DRAG_TYPE] } });
    expect(store().toasts.at(-1)!.kind).toBe('error');
    expect(store().toasts.at(-1)!.title).toContain("Can't place");
  });

  it('a trackless scene shows the empty state row (spec 18 §4.2 state table)', () => {
    useUi.setState({ scenes: store().scenes.map((s) => (s.id === 'sc-1' ? { ...s, tracks: [] } : s)) });
    renderShell(<Timeline />);
    expect(screen.getByTestId('shell-timeline-state-empty')).toHaveTextContent('Drop clips here, or press Cmd+I');
  });

  it('switching the active scene re-renders the sc-2 lanes (spec 09 §6 multi-scene)', () => {
    boot({ activeSceneId: 'sc-2' });
    expect(screen.getByTestId('clip-s2-1')).toBeInTheDocument();
    expect(screen.queryByTestId('clip-el-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('shell-track-header-sc2-main')).toBeInTheDocument();
  });

  it('right-click on the empty lane surface opens the §4.9 timeline-empty menu', () => {
    boot({});
    fireEvent.contextMenu(laneOf('el-1'), { clientX: 30, clientY: 30 });
    const menu = screen.getByTestId('shell-menu-timeline-empty');
    // honest-mock: paste is disabled until the clipboard round (spec 15 §4.3.70)
    expect(within(menu).getByTestId('shell-menu-timeline-empty-paste')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByTestId('shell-menu-timeline-empty-add-marker'));
    expect(scene1().markers).toHaveLength(6); // 5 fixtures + the playhead marker
  });

  /* ---- R15 T2 context-menu ROUTING (single scroll-surface handler;
     clips no longer stopPropagation their right-clicks — canonical §5) ---- */

  it('routing: right-click on an UNSELECTED clip selects it first and opens the CLIP menu (not the empty-lane one)', () => {
    boot({ selection: [] });
    fireEvent.contextMenu(screen.getByTestId('clip-el-1'), { clientX: 30, clientY: 30 });
    expect(screen.getByTestId('shell-menu-clip')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-menu-timeline-empty')).not.toBeInTheDocument();
    expect(store().selection).toEqual(['el-1']); // canonical: select-if-unselected, no toggle
  });

  it('routing: right-click on a SELECTED clip keeps the whole selection (multi-select stays the command target)', () => {
    boot({}); // selection ['el-2']
    fireEvent.contextMenu(screen.getByTestId('clip-el-2'), { clientX: 10, clientY: 10 });
    expect(screen.getByTestId('shell-menu-clip')).toBeInTheDocument();
    expect(store().selection).toEqual(['el-2']); // no re-toggle, no collapse to single
  });

  it('the §4.9 clip menu via the routed right-click: Mix-this-track escalates into audio focus (design doc §3.1)', () => {
    boot({});
    fireEvent.contextMenu(screen.getByTestId('clip-el-2'), { clientX: 10, clientY: 10 });
    expect(screen.getByTestId('shell-menu-clip')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('shell-menu-clip-mix-track'));
    expect(store().page).toBe('audio');
    expect(store().stripFocus).toBe('tr-main'); // the video track the clip sits on
  });

  it('multi-delete of ≥ 5 clips confirms first; cancel keeps, confirm deletes (spec 18 §6.4, routed clip menu)', () => {
    boot({ selection: ['el-1', 'el-2', 'el-3', 'el-4', 'el-5'] });
    fireEvent.contextMenu(screen.getByTestId('clip-el-2'), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByTestId('shell-menu-clip-delete'));
    expect(screen.getByTestId('shell-confirm')).toBeInTheDocument();
    expect(screen.getByText('Delete 5 clips?')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('shell-confirm-cancel'));
    expect(countEls()).toBe(12); // nothing deleted (7 + 5 captions)
    fireEvent.contextMenu(screen.getByTestId('clip-el-2'), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByTestId('shell-menu-clip-delete'));
    fireEvent.click(screen.getByTestId('shell-confirm-confirm'));
    expect(countEls()).toBe(7); // el-6 + el-7 + 5 captions remain
  });

  it('R15 T2 escape ladder (composed): no gesture → Escape falls through to the shell listener and clears the selection', () => {
    renderShell(
      <>
        <Timeline />
        <ShortcutsHarness />
      </>,
    );
    expect(store().selection).toEqual(['el-2']); // boot selection
    scrollEl().focus(); // the timeline surface holds focus (§4.9 Shift+F10 host)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(store().selection).toEqual([]); // the shell ladder's selection rung
  });

  it('⌘+wheel zooms via the rAF-coalesced accumulator (capped ±30, exp(−Δ/300)) — R15 T1 canonical wheel grammar', async () => {
    boot({});
    fireEvent.wheel(scrollEl(), { ctrlKey: true, deltaY: -100 });
    // the accumulator applies ONE factor per animation frame — flush it
    await new Promise((r) => requestAnimationFrame(r));
    expect(store().pxPerSec).toBeGreaterThan(46);
    expect(store().pxPerSec).toBeCloseTo(46 * Math.exp(30 / 300), 5); // delta capped at −30
    fireEvent.wheel(scrollEl(), { ctrlKey: true, deltaY: 100 });
    await new Promise((r) => requestAnimationFrame(r));
    expect(store().pxPerSec).toBeCloseTo(46, 5); // exp-symmetric round-trip (float residue)
  });

  it('plain wheel with shift scrolls horizontally in ±40px clamped steps (R15 T1 manual-scroll law)', () => {
    boot({});
    const el = scrollEl();
    const before = el.scrollLeft;
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 400, right: 800, bottom: 400, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    fireEvent.wheel(el, { shiftKey: true, deltaY: 300 });
    expect(el.scrollLeft).toBe(before + 40); // clamped to HORIZONTAL_WHEEL_STEP_PX
  });
});

/* R13-D2 addition (R13-W1c gap #4): the lane dragover handler computes
   mediaDrag.allowed itself (POOL_DRAG_TYPE guard + isDroppable + locked).
   The earlier §4.2 tests boot mediaDrag via store patch, so an isDroppable
   regression would keep them green — these fire REAL drag events at the
   lanes and assert the computed {overTrackId, allowed} per pairing. */
describe('pool-drag overTrack/allowed computation (spec 18 §4.2)', () => {
  it('dragover computes per-lane compatibility: video ok on V1, rejected on A1 (type mismatch)', () => {
    boot({ mediaDrag: { mediaId: 'm-01', overTrackId: null, allowed: false } });
    fireEvent.dragOver(laneOf('el-1'), { dataTransfer: { types: [POOL_DRAG_TYPE] } });
    expect(store().mediaDrag).toEqual({ mediaId: 'm-01', overTrackId: 'tr-main', allowed: true });
    expect(laneOf('el-1').className).toContain('pool-lane-ok'); // highlight follows the computation
    fireEvent.dragOver(laneOf('el-6'), { dataTransfer: { types: [POOL_DRAG_TYPE] } });
    expect(store().mediaDrag).toEqual({ mediaId: 'm-01', overTrackId: 'tr-audio-1', allowed: false });
    expect(laneOf('el-6').className).toContain('pool-lane-bad');
  });

  it('audio media is allowed on A1 but rejected on the LOCKED A2 lane', () => {
    boot({ mediaDrag: { mediaId: 'm-06', overTrackId: null, allowed: false } });
    fireEvent.dragOver(laneOf('el-6'), { dataTransfer: { types: [POOL_DRAG_TYPE] } });
    expect(store().mediaDrag).toEqual({ mediaId: 'm-06', overTrackId: 'tr-audio-1', allowed: true });
    // type matches (audio → audio) but tr-audio-2 ships locked: true → not allowed
    fireEvent.dragOver(laneOf('el-7'), { dataTransfer: { types: [POOL_DRAG_TYPE] } });
    expect(store().mediaDrag).toEqual({ mediaId: 'm-06', overTrackId: 'tr-audio-2', allowed: false });
  });

  it('image media over the overlay/text lane is the third allowed pairing (isDroppable matrix)', () => {
    boot({ mediaDrag: { mediaId: 'm-08', overTrackId: null, allowed: false } });
    fireEvent.dragOver(laneOf('el-5'), { dataTransfer: { types: [POOL_DRAG_TYPE] } });
    expect(store().mediaDrag).toEqual({ mediaId: 'm-08', overTrackId: 'tr-overlay-1', allowed: true });
  });

  it('drag payloads without the pool type are ignored; dragleave clears the hovered lane', () => {
    boot({ mediaDrag: { mediaId: 'm-01', overTrackId: null, allowed: false } });
    // an external-file drag (no POOL_DRAG_TYPE) never drives the lane state
    fireEvent.dragOver(laneOf('el-1'), { dataTransfer: { types: ['Files'] } });
    expect(store().mediaDrag).toEqual({ mediaId: 'm-01', overTrackId: null, allowed: false });
    fireEvent.dragOver(laneOf('el-1'), { dataTransfer: { types: [POOL_DRAG_TYPE] } });
    expect(store().mediaDrag?.overTrackId).toBe('tr-main');
    // leaving the lane (to a non-child target) drops the hover state
    fireEvent.dragLeave(laneOf('el-1'), { dataTransfer: { types: [POOL_DRAG_TYPE] } });
    expect(store().mediaDrag).toEqual({ mediaId: 'm-01', overTrackId: null, allowed: false });
  });

  it('dropping on a dragover-COMPUTED allowed lane commits the real placement', () => {
    boot({ mediaDrag: { mediaId: 'm-06', overTrackId: null, allowed: false } });
    fireEvent.dragOver(laneOf('el-6'), { dataTransfer: { types: [POOL_DRAG_TYPE] } });
    expect(store().mediaDrag?.allowed).toBe(true); // computed by the real handler, not boot-patched
    fireEvent.drop(laneOf('el-6'), { dataTransfer: { types: [POOL_DRAG_TYPE] }, clientX: 0 });
    expect(store().mediaDrag).toBeNull();
    expect(store().toasts.at(-1)!.kind).toBe('success');
    expect(store().toasts.at(-1)!.title).toBe('Inserted ocean_ambience.wav');
    // R20-W2: real doc change (the old honest-mock covered a toast-only path)
    const a1 = scene1().tracks.find((t) => t.id === 'tr-audio-1')!;
    expect(a1.elements.some((e) => e.mediaId === 'm-06')).toBe(true);
  });
});

/* R14 wiring: the §4.9 Height pref lane math, the Import-media row (⌘I
   surface parity), and the two-way headers ⇄ lanes scroll sync (W0-21). */
describe('Timeline R14 wiring', () => {
  it('the §4.9 Height pref resizes every lane: compact 60% / tall 140%, min 24px', () => {
    boot({});
    expect(laneOf('el-1').style.height).toBe('80px'); // spec 05 §12.2 auto
    act(() => { store().setTrackHeightPref('compact'); });
    expect(laneOf('el-1').style.height).toBe('48px'); // 80 × 0.6
    expect(laneOf('el-5').style.height).toBe('36px'); // 60 × 0.6
    act(() => { store().setTrackHeightPref('tall'); });
    expect(laneOf('el-1').style.height).toBe('112px'); // 80 × 1.4
    expect(laneOf('el-6').style.height).toBe('84px');  // 60 × 1.4
    act(() => { store().setTrackHeightPref(null); });
    expect(laneOf('el-1').style.height).toBe('80px'); // auto again
  });

  it('the header-menu Height rows drive the same pref end-to-end (spec 18 §4.9)', () => {
    boot({});
    fireEvent.contextMenu(screen.getByTestId('shell-track-header-tr-main'), { clientX: 5, clientY: 5 });
    fireEvent.click(screen.getByTestId('shell-menu-track-height-tall'));
    expect(store().trackHeightPref).toBe('tall');
    expect(laneOf('el-1').style.height).toBe('112px');
  });

  it('the empty-lane Import media row mirrors the ⌘I toast exactly (surface parity)', () => {
    boot({});
    fireEvent.contextMenu(laneOf('el-1'), { clientX: 30, clientY: 30 });
    fireEvent.click(screen.getByTestId('shell-menu-timeline-empty-import-media'));
    const t = store().toasts.at(-1)!;
    expect(t.kind).toBe('info');
    expect(t.title).toBe('Import media');
    expect(t.detail).toBe('File picker is mock — drop files on the Media Pool'); // useShortcuts' exact text
  });

  it('scrolling the track headers drives the lanes scrollTop — and vice versa (two-way sync, W0-21)', () => {
    boot({});
    const headers = screen.getByTestId('shell-track-headers');
    const lanes = scrollEl();
    act(() => { headers.scrollTop = 40; });
    fireEvent.scroll(headers);
    expect(lanes.scrollTop).toBe(40); // headers → lanes (the NEW direction)
    act(() => { lanes.scrollTop = 80; });
    fireEvent.scroll(lanes);
    expect(headers.scrollTop).toBe(80); // lanes → headers (the original direction, intact)
  });
});

/* ---------- R15 T3: cross-track drag + placement ---------- */

/* Lane geometry (readout header, filmstrip): zoneH 44; overlay [44,104),
   main [104,184), A1 [184,244), A2 [244,304). jsdom's scroller rect is
   all-zero, so clientY maps straight to content Y. */
const laneY = { overlay: 70, main: 130, a1: 200, a2: 260, aboveAll: 20, belowAll: 400 };
const el2 = () => store().scenes.find((s) => s.id === 'sc-1')!.tracks.flatMap((t) => t.elements).find((e) => e.id === 'el-2')!;
const trackIds = () => scene1().tracks.map((t) => t.id);

describe('R15 T3: 2D cross-track drag (drop-target plumbing + resolution)', () => {
  it('video main→overlay: ghost + lane highlight preview, release commits the cross-track move', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    // grab at the left edge (391 = 8.5 s × 46); Δ(299, 60) → active + vertical
    // engagement into the overlay band — 299 px = exactly 6.5 s → 15.0 s
    // preview (frame-exact: 15 × 24)
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, clientY: laneY.main });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 690, clientY: laneY.overlay });
    const ghost = screen.getByTestId('drag-ghost-el-2');
    expect(ghost.getAttribute('data-track-id')).toBe('tr-overlay-1'); // video → overlay is compatible (06 §5.9)
    expect(ghost.style.left).toBe('690px'); // 15 s × 46 — the resolved (snapped) preview time
    expect(screen.getByTestId('drag-lane-highlight')).toBeInTheDocument(); // the hovered lane band tints
    expect(clip.style.opacity).toBe('0.45'); // the source clip fades at its original position
    expect(ghost.style.zIndex).toBe('10'); // canonical dragLine layer
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 690, clientY: laneY.overlay });
    expect(el2().trackId).toBe('tr-overlay-1');
    expect(el2().startTime).toBeCloseTo(15, 5);
    expect(scene1().tracks.find((t) => t.id === 'tr-main')!.elements.map((e) => e.id)).not.toContain('el-2');
    expect(screen.queryByTestId('drag-ghost-el-2')).not.toBeInTheDocument(); // preview cleared
    expect(store().past).toHaveLength(1); // ONE history entry
  });

  it('audio→audio: dragging the bed down onto (unlocked) A2 commits at the free spot', () => {
    boot({});
    act(() => { store().toggleTrackCmd('sc-1', 'tr-audio-2', 'locked'); }); // unlock the fixture lane
    const pastBase = store().past.length; // the unlock is undoable — drag history counts FROM here
    const clip = screen.getByTestId('clip-el-6');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 200, clientY: laneY.a1 });
    // down into A2's band at 0 s — [0,30) overlaps el-7 [8.5,17) → the
    // conflict-edged ghost shows (kept, red border), lane NOT highlighted
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 200, clientY: laneY.a2 });
    const conflict = screen.getByTestId('drag-ghost-el-6');
    expect(conflict.getAttribute('data-conflict')).toBe('overlap');
    expect(screen.queryByTestId('drag-lane-highlight')).not.toBeInTheDocument();
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 982, clientY: laneY.a2 }); // 17 s
    expect(screen.getByTestId('drag-ghost-el-6').getAttribute('data-track-id')).toBe('tr-audio-2');
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 982, clientY: laneY.a2 });
    expect(store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-audio-2')!.elements.map((e) => e.id)).toContain('el-6');
    expect(store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-audio-1')!.elements).toHaveLength(0);
    expect(store().past).toHaveLength(pastBase + 1); // ONE entry for the whole drag
  });

  it('incompatible hover (audio over main): ghost FREEZES at the last-valid target, lane not highlighted, release is a no-op + toast', () => {
    boot({});
    act(() => { store().toggleTrackCmd('sc-1', 'tr-audio-2', 'locked'); });
    const pastBase = store().past.length; // the unlock is undoable — baseline
    const clip = screen.getByTestId('clip-el-6');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 200, clientY: laneY.a1 });
    // first a VALID engaged target (A2 @ 17 s) — then hover main (audio can't live there)
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 982, clientY: laneY.a2 });
    expect(screen.getByTestId('drag-ghost-el-6')).toBeInTheDocument();
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 982, clientY: laneY.main });
    const frozen = screen.getByTestId('drag-ghost-el-6');
    expect(frozen.getAttribute('data-frozen')).toBe('true'); // snapped back to the last-valid target
    expect(frozen.getAttribute('data-track-id')).toBe('tr-audio-2');
    expect(screen.queryByTestId('drag-lane-highlight')).not.toBeInTheDocument(); // incompatible lane never highlights
    expect(scrollEl().style.cursor).toBe('not-allowed');
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 982, clientY: laneY.main });
    expect(store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-audio-1')!.elements.map((e) => e.id)).toEqual(['el-6']); // never left
    expect(store().past).toHaveLength(pastBase); // the rejected release adds NOTHING beyond the baseline
    expect(store().toasts.at(-1)!.title).toBe('Drop rejected');
    expect(store().toasts.at(-1)!.detail).toContain('spec 06 §5.9');
  });

  it('overlap preview: the ghost shows at the snapped time with the conflict edge; release = no-op + honest toast', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, clientY: laneY.main });
    // up into the overlay band at 9 s — [9, 17.5) overlaps el-5 [8.75, 12)
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 437, clientY: laneY.overlay });
    const ghost = screen.getByTestId('drag-ghost-el-2');
    expect(ghost.getAttribute('data-conflict')).toBe('overlap'); // red-edged ghost at the snapped time
    expect(ghost.style.border).toContain('var(--danger)');
    expect(screen.queryByTestId('drag-lane-highlight')).not.toBeInTheDocument();
    expect(scrollEl().style.cursor).toBe('not-allowed');
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 437, clientY: laneY.overlay });
    expect(el2().trackId).toBe('tr-main'); // never moved
    expect(el2().startTime).toBe(8.5);
    expect(store().past).toHaveLength(0);
    expect(store().toasts.at(-1)!.title).toBe('Drop rejected');
    expect(store().toasts.at(-1)!.detail).toBe('clips would overlap (spec-05 §8.3)');
  });

  it('new track ABOVE (pre-minted identity): insert line at index 0, release creates the track + moves the clip', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-1');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 100, clientY: laneY.main });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 100, clientY: laneY.aboveAll });
    const ghost = screen.getByTestId('drag-ghost-el-1');
    const mintedId = ghost.getAttribute('data-track-id')!;
    expect(mintedId).toMatch(/^t-new-/); // pre-minted at drag start — stable identity
    expect(screen.getByTestId('drag-insert-line')).toBeInTheDocument(); // 2px line at the new-track position
    expect(screen.queryByTestId('drag-lane-highlight')).not.toBeInTheDocument(); // new-track targets never band-highlight
    expect(ghost.style.top).toBe('46px'); // zoneH 44 + 2 — the would-be first lane
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 100, clientY: laneY.aboveAll });
    expect(trackIds()[0]).toBe(mintedId); // the created track carries the pre-minted id
    expect(scene1().tracks[0]!.kind).toBe('overlay'); // video → overlay-section track (main stays singleton)
    expect(scene1().tracks[0]!.elements.map((e) => e.id)).toEqual(['el-1']);
    expect(scene1().tracks).toHaveLength(6);
    expect(store().past).toHaveLength(1);
  });

  it('new track BELOW (audio): clamped/append below main, release appends the lane at the tail', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-6');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 200, clientY: laneY.a1 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 200, clientY: laneY.belowAll });
    const ghost = screen.getByTestId('drag-ghost-el-6');
    const mintedId = ghost.getAttribute('data-track-id')!;
    expect(mintedId).toMatch(/^t-new-/);
    expect(screen.getByTestId('drag-insert-line')).toBeInTheDocument();
    expect(ghost.style.top).toBe('338px'); // below the last lane (caption lane is 32px: 44+60+80+60+60+32 = 336 — R19)
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 200, clientY: laneY.belowAll });
    expect(trackIds().at(-1)).toBe(mintedId); // appended at the bottom
    expect(scene1().tracks.at(-1)!.kind).toBe('audio');
    expect(scene1().tracks.at(-1)!.elements.map((e) => e.id)).toEqual(['el-6']);
  });

  it('group drag with the linked A/V pair: members map outward (video→main, audio→A1), ONE history entry', () => {
    boot({ selection: ['el-2', 'el-7'] });
    act(() => { store().toggleTrackCmd('sc-1', 'tr-audio-2', 'locked'); }); // el-7's lane ships locked
    const pastBase = store().past.length; // the unlock is undoable — baseline
    const clip = screen.getByTestId('clip-el-2');
    // horizontal drag on the main band: existing-track path, members keep offsets
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, clientY: laneY.main });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 1771, clientY: laneY.main }); // 38.5 s
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 1771, clientY: laneY.main });
    expect(el2().startTime).toBeCloseTo(38.5, 5);
    const el7 = store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-audio-1')!.elements.find((e) => e.id === 'el-7')!;
    expect(el7).toBeDefined(); // walked DOWN from the anchor target to A1 (skipping main — incompatible)
    expect(el7.startTime).toBeCloseTo(38.5, 5); // kept its time offset from the anchor
    expect(store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-audio-2')!.elements).toHaveLength(0);
    expect(store().past).toHaveLength(pastBase + 1); // the whole group = ONE entry
  });

  it('mixed audio+video group on the new-track path → REJECTED: ghost snaps back to last-valid, no commit (spec-05 §8.3 n3)', () => {
    boot({ selection: ['el-2', 'el-7'] });
    act(() => { store().toggleTrackCmd('sc-1', 'tr-audio-2', 'locked'); });
    const pastBase = store().past.length; // the unlock is undoable — baseline
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, clientY: laneY.main });
    // a valid engaged target first — overlay @ 38.5: el-2 lands clear of el-5
    // [8.75,12) and el-7's outward walk to A1 clears el-6 [0,30). (A hover at
    // 15 s would fail: el-7 [15,23.5) overlaps el-6 on A1 — whole group.)
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 1771, clientY: laneY.overlay });
    expect(screen.getByTestId('drag-ghost-el-2')).toBeInTheDocument();
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 1771, clientY: laneY.aboveAll });
    const frozen = screen.getByTestId('drag-ghost-el-2');
    expect(frozen.getAttribute('data-frozen')).toBe('true'); // snapped back to the last-valid target
    expect(frozen.getAttribute('data-track-id')).toBe('tr-overlay-1');
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 1771, clientY: laneY.aboveAll });
    expect(el2().trackId).toBe('tr-main'); // no commit
    expect(store().past).toHaveLength(pastBase); // nothing beyond the baseline
    expect(scene1().tracks).toHaveLength(5); // no track created
    expect(store().toasts.at(-1)!.detail).toContain('spec-05 §8.3 note 3');
  });

  it('Alt+drag cross-track duplicate: copies land at the resolved target in ONE entry', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, clientY: laneY.main, altKey: true });
    // 690 (not 691): Δ 299 px = exactly 6.5 s → the copy lands at 15.0 s, frame-exact
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 690, clientY: laneY.overlay, altKey: true });
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 690, clientY: laneY.overlay, altKey: true });
    const copyId = store().selection[0]!;
    expect(copyId).toMatch(/^el-2-d/);
    expect(store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-overlay-1')!.elements.map((e) => e.id)).toContain(copyId);
    expect(store().scenes.find((s) => s.id === 'sc-1')!.tracks.flatMap((t) => t.elements).find((e) => e.id === copyId)!.startTime).toBeCloseTo(15, 5);
    expect(el2().startTime).toBe(8.5); // original never moves
    expect(store().past).toHaveLength(1);
  });

  it('z-order: playhead 100 sits above the drag ghost 10 and the marquee 35 (R15 T9 canonical §17)', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, clientY: laneY.main });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 690, clientY: laneY.overlay });
    expect(screen.getByTestId('drag-ghost-el-2').style.zIndex).toBe('10');
    const playhead = document.querySelector('#timeline-content > div.pointer-events-none.absolute') as HTMLElement;
    expect(playhead.style.zIndex).toBe('100');
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 690, clientY: laneY.overlay });
  });
});

describe('R15 T3/T9: clip virtualization (200px window, selected/dragging never skipped)', () => {
  const scrollTo = (x: number) => {
    const sc = scrollEl();
    act(() => { sc.scrollLeft = x; });
    fireEvent.scroll(sc);
  };

  it('far scroll culls off-screen clips; the in-window clip stays rendered', () => {
    boot({});
    act(() => { store().setZoom(2000); }); // pps 2000 — el-1 [0, 8.5) = [0, 17000] px
    scrollTo(20000); // window [19800, 20900] = [9.9, 10.45] s
    expect(screen.queryByTestId('clip-el-1')).not.toBeInTheDocument(); // off-screen left — culled
    expect(screen.queryByTestId('clip-el-3')).not.toBeInTheDocument(); // off-screen right — culled
    expect(screen.queryByTestId('clip-el-4')).not.toBeInTheDocument();
    expect(screen.getByTestId('clip-el-2')).toBeInTheDocument(); // [8.5, 17) intersects the window
  });

  it('SELECTED clips are never virtualized away (el-1 at origin stays)', () => {
    boot({ selection: ['el-1'] });
    act(() => { store().setZoom(2000); });
    scrollTo(50000); // way past the 60 000 px content end — nothing in the window
    expect(screen.getByTestId('clip-el-1')).toBeInTheDocument(); // selected → never skipped
    expect(screen.queryByTestId('clip-el-2')).not.toBeInTheDocument();
  });
});

describe('R15 T3: edge auto-scroll during active clip drags (rAF, 100px threshold, 15px/frame max)', () => {
  it('a pointer 5px from the right edge scrolls ~14.25px per frame (ramp 1 − dist/100)', async () => {
    boot({});
    const sc = scrollEl();
    sc.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 400, right: 800, bottom: 400, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    Object.defineProperty(sc, 'scrollWidth', { value: 5000, configurable: true });
    Object.defineProperty(sc, 'clientWidth', { value: 800, configurable: true });
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, clientY: laneY.main });
    // activate + park the pointer 5px from the right edge (x 795)
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 795, clientY: laneY.main });
    expect(sc.scrollLeft).toBe(0); // nothing before the first rAF tick
    await act(async () => { await new Promise((r) => requestAnimationFrame(r)); });
    expect(sc.scrollLeft).toBeCloseTo(15 * (1 - 5 / 100), 3); // 14.25 — one frame's step
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 795, clientY: laneY.main });
    const after = sc.scrollLeft;
    await act(async () => { await new Promise((r) => requestAnimationFrame(r)); });
    expect(sc.scrollLeft).toBe(after); // the rAF loop STOPPED with the drag
  });
});

/* ---------- R15 T5: snap upgrade (sources, closest-wins, indicator, shift) ---------- */

describe('R15 T5: snap sources + closest-wins', () => {
  it('head-drag CLOSEST-WINS: between two in-tolerance targets the NEARER one wins (old loop took first-in-order)', () => {
    boot({});
    const head = document.querySelector('.cursor-col-resize') as HTMLElement;
    // t = 8.5435: el-5's start 8.75 is FIRST in the target list (overlay lane
    // leads) and 0.207 away — in tol; el-1's end 8.5 is LATER but only 0.043
    // away. The old first-match loop snapped 8.75; the T5 closest-wins law
    // takes 8.5.
    fireEvent.pointerDown(head, { pointerId: 1, button: 0 });
    fireEvent.pointerMove(head, { pointerId: 1, buttons: 1, clientX: 393 });
    expect(store().playhead).toBe(8.5);
    fireEvent.pointerUp(head, { pointerId: 1 });
  });

  it('LOCKED tracks are not snap sources: el-7 (tr-audio-2) reshaped to a unique edge never attracts the scrub', () => {
    boot({});
    // give the LOCKED lane's clip a unique edge no unlocked element carries
    act(() => useUi.setState({
      scenes: store().scenes.map((s) =>
        s.id === 'sc-1'
          ? { ...s, tracks: s.tracks.map((t) =>
              t.id === 'tr-audio-2' ? { ...t, elements: t.elements.map((e) =>
                e.id === 'el-7' ? { ...e, startTime: 19.5, duration: 5 } : e) } : t) }
          : s,
      ),
    }));
    const head = document.querySelector('.cursor-col-resize') as HTMLElement;
    fireEvent.pointerDown(head, { pointerId: 1, button: 0 });
    // 902 px → 19.6087 s: |19.6087 − 19.5| = 0.109 — inside the 10 px tol, but
    // the locked track's edge is NOT a source → the playhead stays raw
    fireEvent.pointerMove(head, { pointerId: 1, buttons: 1, clientX: 902 });
    expect(store().playhead).toBeCloseTo(19.6087, 3);
    expect(store().playhead).not.toBe(19.5);
    fireEvent.pointerUp(head, { pointerId: 1 });
  });

  it('markers and in/out points are snap sources (shared list — head-drag gets them too)', () => {
    boot({});
    const head = document.querySelector('.cursor-col-resize') as HTMLElement;
    // t = 15.55: the mk-3 marker at 15.5 is 0.05 away — the only near target
    fireEvent.pointerDown(head, { pointerId: 1, button: 0 });
    fireEvent.pointerMove(head, { pointerId: 1, buttons: 1, clientX: 715.3 });
    expect(store().playhead).toBe(15.5); // marker snap
    fireEvent.pointerMove(head, { pointerId: 1, buttons: 1, clientX: 1312 }); // 28.52 → loop.end 28 (0.52 — no)
    fireEvent.pointerMove(head, { pointerId: 1, buttons: 1, clientX: 1293 }); // 28.109: in/out at 28 → 0.109 in tol
    expect(store().playhead).toBe(28);
    fireEvent.pointerUp(head, { pointerId: 1 });
  });

  it('SHIFT suppresses snapping during the scrub: the raw time lands un-snapped (canonical §5)', () => {
    boot({});
    const head = document.querySelector('.cursor-col-resize') as HTMLElement;
    fireEvent.pointerDown(head, { pointerId: 1, button: 0 });
    // 790 px → 17.174 s: 17 is 0.174 in tol — snapped without shift, raw with
    fireEvent.pointerMove(head, { pointerId: 1, buttons: 1, clientX: 790 });
    expect(store().playhead).toBe(17);
    fireEvent.pointerMove(head, { pointerId: 1, buttons: 1, clientX: 790, shiftKey: true });
    expect(store().playhead).toBeCloseTo(17.173913043478262, 4);
    fireEvent.pointerUp(head, { pointerId: 1 });
  });

  it('the dragged clip is not snapped to ITS OWN edges (group/self exclusion — an unselected mover stays free)', () => {
    boot({});
    // el-5 [8.75,12) on the overlay: nudge its start by +6 px (0.13 s) — its
    // own 8.75 edge is 0.13 away (in tol) but excluded → the move COMMITS to
    // the frame grid instead of snapping back onto its own edge (no-op).
    const clip = screen.getByTestId('clip-el-5');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 402, clientY: 70 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 408, clientY: 70 });
    fireEvent.pointerUp(clip, { pointerId: 1, clientY: 70 });
    const el5 = store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-overlay-1')!.elements.find((e) => e.id === 'el-5')!;
    expect(el5.startTime).toBeCloseTo(8.875, 5); // moved (self-edge snap would have pinned 8.75)
    expect(store().past).toHaveLength(1);
  });
});

describe('R15 T5: the snap indicator line (2px accent/40%, z 40, gesture-held only)', () => {
  it('renders at the snapped content px while a clip drag holds the snap, clears on release', () => {
    boot({});
    const clip = screen.getByTestId('clip-el-5');
    // el-5 → ~15.51 s: the mk-3 marker at 15.5 captures (closest, in tol);
    // clientY 70 keeps the drag in el-5's own overlay band (no cross-track)
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 402, clientY: 70 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 713, clientY: 70 });
    const line = screen.getByTestId('snap-indicator');
    expect(line.style.zIndex).toBe('40'); // below the playhead 100 (canonical §17)
    expect(line.style.width).toBe('2px');
    expect(line.style.opacity).toBe('0.4');
    expect(line.style.background).toContain('var(--accent)');
    expect(line.style.left).toBe('712px'); // 15.5 s × 46 − 1 (2px line, centered)
    fireEvent.pointerUp(clip, { pointerId: 1, clientY: 70 });
    expect(screen.queryByTestId('snap-indicator')).not.toBeInTheDocument(); // cleared
    const el5 = store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-overlay-1')!.elements.find((e) => e.id === 'el-5')!;
    expect(el5.startTime).toBe(15.5); // the drag committed ON the snap point
  });

  it('a trim gesture drives the indicator too (kind "trim" host events — and the marquee never does)', () => {
    boot({ selection: ['el-6'] });
    const handle = screen.getByTestId('clip-trim-r-el-6');
    // el-6's right edge → 23.85: el-4's start 24 is 0.15 away (in tol) and
    // INSIDE the trim bounds (no neighbor on A1, source 120 s) → held snap
    fireEvent.pointerDown(handle, { pointerId: 1, button: 0, clientX: 391 });
    fireEvent.pointerMove(handle, { pointerId: 1, buttons: 1, clientX: 108 }); // −6.152 s → 23.848
    expect(screen.getByTestId('snap-indicator').style.left).toBe('1103px'); // 24 × 46 − 1
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(screen.queryByTestId('snap-indicator')).not.toBeInTheDocument();
    expect(store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-audio-1')!.elements.find((e) => e.id === 'el-6')!.duration).toBe(24); // committed ON the snap
    // marquee gestures never produce the indicator (they never snap)
    fireEvent.pointerDown(laneOf('el-1'), { pointerId: 2, button: 0, clientX: 0, clientY: 120 });
    fireEvent.pointerMove(scrollEl(), { pointerId: 2, buttons: 1, clientX: 380, clientY: 160 });
    expect(screen.queryByTestId('snap-indicator')).not.toBeInTheDocument();
    fireEvent.pointerUp(scrollEl(), { pointerId: 2 });
  });

  it('snap OFF (N key) suppresses the indicator even when a gesture holds a would-be target', () => {
    boot({});
    act(() => { store().toggleSnap(); });
    const clip = screen.getByTestId('clip-el-5');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 402, clientY: 70 });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 713, clientY: 70 });
    expect(screen.queryByTestId('snap-indicator')).not.toBeInTheDocument();
    fireEvent.pointerUp(clip, { pointerId: 1, clientY: 70 });
    // frame grid only (15.5109 → 15.5) — the marker target was never consulted
    const el5 = store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-overlay-1')!.elements.find((e) => e.id === 'el-5')!;
    expect(el5.startTime).toBeCloseTo(snapToFrame(8.75 + 311 / 46), 5);
  });
});

/* ---------- R15-F1: mid-gesture discipline (FIX 3) + T8 scrub laws (FIX 4) ---------- */

describe('R15-F1 FIX 3: mid-drag unmount + destructive-key gesture gate', () => {
  it('⌫ mid-drag is GESTURE-SWALLOWED — the dragged clip never unmounts; ⌫ after the release works again', () => {
    renderShell(
      <>
        <Timeline />
        <ShortcutsHarness />
      </>,
    );
    const clip = screen.getByTestId('clip-el-2');
    // activate + engage a cross-track drag (overlay band @ 15 s)
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, clientY: laneY.main });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 690, clientY: laneY.overlay });
    expect(screen.getByTestId('drag-ghost-el-2')).toBeInTheDocument();
    // the OLD leak: ⌫ deleted the clip mid-drag → Clip unmounts → 'end'
    // never fires → session + rAF + indicator + ghosts leak. Now: swallowed.
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    });
    expect(screen.getByTestId('clip-el-2')).toBeInTheDocument(); // alive
    expect(countEls()).toBe(12); // nothing deleted
    expect(store().past).toHaveLength(0);
    expect(screen.getByTestId('drag-ghost-el-2')).toBeInTheDocument(); // the gesture itself is untouched
    // end the drag (release commits), then the same key fires normally
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 690, clientY: laneY.overlay });
    expect(store().past).toHaveLength(1); // the drag committed
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }));
    });
    expect(screen.queryByTestId('clip-el-2')).not.toBeInTheDocument(); // deleted — key restored
    expect(countEls()).toBe(11); // 12 − el-2 (R19 captions)
  });

  it('⌘Z mid-drag is likewise swallowed (the undo could unmount the dragged clip too)', () => {
    renderShell(
      <>
        <Timeline />
        <ShortcutsHarness />
      </>,
    );
    // a real mutation to undo, then a fresh drag on top of it
    act(() => { store().moveElement('el-5', 20); });
    const pastLen = store().past.length;
    const clip = screen.getByTestId('clip-el-5');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 920, clientY: laneY.overlay });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 960, clientY: laneY.overlay });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true, cancelable: true }));
    });
    expect(store().past).toHaveLength(pastLen); // not undone — swallowed
    expect(screen.getByTestId('clip-el-5')).toBeInTheDocument(); // still mounted mid-drag
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 960, clientY: laneY.overlay });
  });

  it('unmounting the dragged clip mid-gesture (a menu/store delete) FLUSHES the host session: previews drop and the auto-scroll rAF stops', async () => {
    boot({});
    const sc = scrollEl();
    sc.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 400, right: 800, bottom: 400, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    Object.defineProperty(sc, 'scrollWidth', { value: 5000, configurable: true });
    Object.defineProperty(sc, 'clientWidth', { value: 800, configurable: true });
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, clientY: laneY.main });
    // engage + park the pointer 5px from the right edge → auto-scroll runs
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 795, clientY: laneY.overlay });
    expect(screen.getByTestId('drag-ghost-el-2')).toBeInTheDocument();
    await act(async () => { await new Promise((r) => requestAnimationFrame(r)); });
    expect(sc.scrollLeft).toBeGreaterThan(0); // the rAF loop is scrolling
    // delete the dragged clip through a NON-keyboard surface (the menu route
    // fires the same store call): the Clip unmounts mid-gesture — 'end' can
    // never fire through the pointer path
    act(() => { store().deleteElements(['el-2'], false); });
    // the unmount flush cancelled the session: previews cleared…
    expect(screen.queryByTestId('drag-ghost-el-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('snap-indicator')).not.toBeInTheDocument();
    expect(isGestureActive()).toBe(false);
    // …and the auto-scroll rAF STOPPED (scrollLeft frozen — the leak was an
    // immortal loop)
    const frozen = sc.scrollLeft;
    await act(async () => { await new Promise((r) => requestAnimationFrame(r)); });
    expect(sc.scrollLeft).toBe(frozen);
  });

  it('a scene switch mid-drag drops the drag session + a live marquee + resets scrollLeft (stale by construction)', () => {
    boot({});
    const sc = scrollEl();
    act(() => { sc.scrollLeft = 600; fireEvent.scroll(sc); });
    expect(sc.scrollLeft).toBe(600);
    const clip = screen.getByTestId('clip-el-2');
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 391, clientY: laneY.main });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 690, clientY: laneY.overlay });
    expect(screen.getByTestId('drag-ghost-el-2')).toBeInTheDocument();
    // mid-gesture scene switch: every Clip unmounts — the session must drop
    act(() => { store().setActiveScene('sc-2'); });
    expect(screen.queryByTestId('drag-ghost-el-2')).not.toBeInTheDocument();
    expect(sc.scrollLeft).toBe(0); // stale scroll position reset
    expect(isGestureActive()).toBe(false);
    // a live marquee band also clears (P3 sweep — mid-marquee switch)
    fireEvent.pointerDown(laneOf('s2-1'), { pointerId: 3, button: 0, clientX: 0, clientY: 60 });
    fireEvent.pointerMove(scrollEl(), { pointerId: 3, buttons: 1, clientX: 300, clientY: 80 });
    expect(screen.getByTestId('timeline-marquee')).toBeInTheDocument();
    act(() => { store().setActiveScene('sc-1'); });
    expect(screen.queryByTestId('timeline-marquee')).not.toBeInTheDocument();
  });
});

describe('R15 T8 (R15-F1 FIX 4b): head-drag scrub domain', () => {
  it('head-drag is CLAMPED to the scene duration and FRAME-SNAPS with element snap off', () => {
    boot({});
    act(() => { store().toggleSnap(); }); // N — element snap off
    const head = document.querySelector('.cursor-col-resize') as HTMLElement;
    expect(head).not.toBeNull();
    fireEvent.pointerDown(head, { pointerId: 1, button: 0 });
    // 2000 px → 43.5 s — clamped to the 30 s scene duration (was unclamped)
    fireEvent.pointerMove(head, { pointerId: 1, buttons: 1, clientX: 2000 });
    expect(store().playhead).toBe(30);
    // 393.5 px → 8.5543 s — frame-snaps to 205/24 = 8.5417 (raw before)
    fireEvent.pointerMove(head, { pointerId: 1, buttons: 1, clientX: 393.5 });
    expect(store().playhead).toBeCloseTo(205 / 24, 5);
    fireEvent.pointerUp(head, { pointerId: 1 });
  });
});

describe('R15-F1 FIX 1 (end-to-end): the Alt+drag repro gesture through the REAL drag seam', () => {
  it('el-1 moved to the overlay, {el-1, el-5} selected, Alt+drag +4s → release rejects ATOMICALLY: no stranded copy, no history, honest toast', () => {
    boot({});
    // repro setup: move el-1 onto tr-overlay-1 (same lane as el-5) first
    act(() => { store().moveElements({ moves: [{ id: 'el-1', trackId: 'tr-overlay-1', startTime: 0 }] }); });
    act(() => { store().setSelection(['el-1', 'el-5']); });
    const clip = screen.getByTestId('clip-el-1');
    // grab el-1 (lane-left 0 → grab at 100) and Alt+drag +4 s (184 px) in its
    // own lane — the move-resolution (originals as movers) is VALID, but the
    // copies must clear the ORIGINALS: el-1-d [4,12.5) hits stationary el-1
    fireEvent.pointerDown(clip, { pointerId: 1, button: 0, clientX: 100, clientY: laneY.overlay, altKey: true });
    fireEvent.pointerMove(clip, { pointerId: 1, buttons: 1, clientX: 284, clientY: laneY.overlay, altKey: true });
    fireEvent.pointerUp(clip, { pointerId: 1, clientX: 284, clientY: laneY.overlay, altKey: true });
    const overlay = store().scenes.find((s) => s.id === 'sc-1')!.tracks.find((t) => t.id === 'tr-overlay-1')!;
    expect(overlay.elements.map((e) => e.id).sort()).toEqual(['el-1', 'el-5']); // NO copies — nothing stranded
    expect(store().past).toHaveLength(1); // only the setup move — the rejected duplicate added nothing
    expect(store().toasts.at(-1)!.title).toBe('Drop rejected');
    expect(store().toasts.at(-1)!.detail).toBe('clips would overlap (spec-05 §8.3)');
    // the originals are exactly where they were
    expect(overlay.elements.find((e) => e.id === 'el-1')!.startTime).toBe(0);
    expect(overlay.elements.find((e) => e.id === 'el-5')!.startTime).toBe(8.75);
  });
});

/* ---- R20-W6FIX (P2-1): the hover-placement preview's MINTED-track ghost ---- */

describe('R20-W6FIX P2-1: placeOnTop minted-track ghost renders at the INSERT line', () => {
  it('NO unlocked overlay (tr-overlay-1 locked) → the minted ghost sits at the planned insert line, overlay-shaped', () => {
    // lock the fixture's ONLY overlay → placeOnTop mints a new track above
    // main (splice at live index 1, the main lane's top edge)
    act(() => { useUi.getState().toggleTrackCmd('sc-1', 'tr-overlay-1', 'locked'); });
    boot({ playhead: 2, hoverInsertPreview: { mediaId: 'm-08', mode: 'placeOnTop' } });
    const ghost = screen.getByTestId('insert-preview-ghost');
    // the ghost targets the PREVIEW-MINTED track (never a live track id)
    expect(ghost.getAttribute('data-track-id')).toMatch(/^preview-t-overlay-/);
    expect(ghost).toHaveAttribute('data-start', '2');
    expect(ghost).toHaveAttribute('data-dur', '4');
    /* the INSERT LINE (readout header zone 44 + tr-overlay-1's filmstrip 60
       = 104): the new lane's post-apply top — the prefix above the splice.
       The ghost sits there (top 104 + 2 inset) with OVERLAY geometry
       (60 − 4 inset = 56 tall), NOT on the main lane's band (a main-lane
       ghost would carry main's 80px height — the one-lane-off failure the
       review pinned). */
    expect(ghost.style.top).toBe('106px');
    expect(ghost.style.height).toBe('56px');
    // the plan is armed for the source + mode under test
    expect(store().hoverInsertPreview).toEqual({ mediaId: 'm-08', mode: 'placeOnTop' });
  });

  it('R22 #83: the ARMED preview layer carries the fade+slide animation class (0.3s ease-in-out; reduced-motion honored in app.css)', () => {
    boot({ hoverInsertPreview: { mediaId: 'm-01', mode: 'insert' } });
    const layer = screen.getByTestId('insert-preview-layer');
    expect(layer.className).toContain('insert-preview-anim');
  });

  it('an unlocked overlay stays the placeOnTop target (no mint, no insert line)', () => {
    boot({ playhead: 2, hoverInsertPreview: { mediaId: 'm-08', mode: 'placeOnTop' } });
    const ghost = screen.getByTestId('insert-preview-ghost');
    expect(ghost).toHaveAttribute('data-track-id', 'tr-overlay-1');
    expect(ghost.style.top).toBe('46px'); // zone 44 + 2 — lane 1 (the overlay)
  });
});

/* ---------- R23-WE (DESIGN-R23 D-E2, #102): the preview-visibility law.
   The W3 preview span could land OFFSCREEN (ruling 20: the "no animated
   effects" report was the offscreen ghost — the auto-scroll is the fix for
   both clauses). Pinned here: (a) AUTO-SCROLL — scrollIntoView({inline:
   'nearest'}) on the ghost span, ONE rAF AFTER PAINT (never synchronous),
   re-arming as the plan re-mints; (b) ZOOM FLOOR — a ghost < 24px at the
   current pps bumps zoom ONCE per ARM through the bus (never a creep);
   (c) the MODE BADGE at the ghost's head (name per mode, chrome laws,
   absence when no preview — the display:none law); and the REFUSAL path
   scrolling to the PLAYHEAD instead so the refusal is legible in place. ---------- */

describe('R23-WE D-E2: the insert-preview visibility law (#102)', () => {
  const arm = (mediaId: string, mode: 'insert' | 'overwrite' | 'placeOnTop' | 'fitToFill') =>
    act(() => { useUi.getState().setHoverInsertPreview({ mediaId, mode }); });
  const disarm = () => act(() => { useUi.getState().setHoverInsertPreview(null); });
  const nextFrame = () => act(async () => { await new Promise((res) => requestAnimationFrame(res)); });

  it('(a) AUTO-SCROLL: an armed ok-preview scrollIntoView({inline:"nearest"})s the GHOST span — one rAF AFTER paint, never synchronously', async () => {
    const spy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
    try {
      boot({ playhead: 16, hoverInsertPreview: { mediaId: 'm-08', mode: 'insert' } });
      const ghost = screen.getByTestId('insert-preview-ghost');
      expect(spy).not.toHaveBeenCalled(); // rAF AFTER paint — never a sync scroll
      await nextFrame();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0]![0]).toEqual({ inline: 'nearest', block: 'nearest' });
      expect(spy.mock.contexts[0]).toBe(ghost); // the ghost span is the scroll target
    } finally {
      spy.mockRestore();
    }
  });

  it('(a) AUTO-SCROLL re-tracks: the plan re-mints (playhead move) → the ghost scrollIntoViews again — the preview never drifts offscreen', async () => {
    const spy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
    try {
      boot({ playhead: 16, hoverInsertPreview: { mediaId: 'm-08', mode: 'insert' } });
      await nextFrame();
      expect(spy).toHaveBeenCalledTimes(1);
      act(() => { useUi.getState().setPlayhead(17); }); // plan identity re-mints on the playhead atom
      await nextFrame();
      expect(spy).toHaveBeenCalledTimes(2);
    } finally {
      spy.mockRestore();
    }
  });

  it('no armed preview: no badge chrome (the display:none law — absence, never an opacity stub) and no scroll', async () => {
    const spy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
    try {
      boot({});
      expect(screen.queryByTestId('insert-preview-mode-badge')).toBeNull();
      await nextFrame();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('(c) MODE BADGE: the ghost\'s head carries the hovered mode\'s NAME (Insert) — chrome laws + head geometry', () => {
    boot({ playhead: 16, hoverInsertPreview: { mediaId: 'm-08', mode: 'insert' } });
    const badge = screen.getByTestId('insert-preview-mode-badge');
    expect(badge).toHaveTextContent('Insert'); // the hovered button's own label
    expect(badge).toHaveAttribute('aria-hidden', 'true'); // the a11y route is the bar's status line
    expect(badge.className).toContain('pointer-events-none');
    // head geometry: the ghost\'s left + 4, the lane\'s top + 4 (ghost 736/46 on the overlay lane)
    expect(badge.style.left).toBe('740px');
    expect(badge.style.top).toBe('48px');
  });

  it('(c) MODE BADGE: the name follows the MODE (Place on Top), never a hardcoded pair', () => {
    boot({ playhead: 2, hoverInsertPreview: { mediaId: 'm-08', mode: 'placeOnTop' } });
    expect(screen.getByTestId('insert-preview-mode-badge')).toHaveTextContent('Place on Top');
  });

  it('(b) ZOOM FLOOR: a ghost already ≥ 24px at the current pps never bumps zoom (no creep)', async () => {
    const spy = vi.spyOn(zoomController, 'setZoomLevel');
    try {
      boot({ playhead: 16, hoverInsertPreview: { mediaId: 'm-08', mode: 'insert' } }); // 4 s × 46 = 184 px
      await nextFrame();
      expect(spy).not.toHaveBeenCalled();
      expect(store().pxPerSec).toBe(46);
    } finally {
      spy.mockRestore();
    }
  });

  it('(b) ZOOM FLOOR: a ghost < 24px bumps zoom ONCE through the bus so it renders ≥ 24px', async () => {
    const spy = vi.spyOn(zoomController, 'setZoomLevel');
    try {
      // 4 s ghost at 5 pps = 20 px < 24 → target 24/4 = 6 pps (the dynamic
      // content-fit min raises the effective to 7.5 — either way ≥ 24 px)
      boot({ pxPerSec: 5, playhead: 16, hoverInsertPreview: { mediaId: 'm-08', mode: 'insert' } });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(6, { duration: 30 });
      await nextFrame();
      expect(store().pxPerSec).toBeGreaterThan(5); // the bump landed through the bus
      const ghost = screen.getByTestId('insert-preview-ghost');
      expect(parseFloat(ghost.style.width)).toBeGreaterThanOrEqual(24); // the LAW: renders ≥ 24 px
      expect(spy).toHaveBeenCalledTimes(1); // one bump, not a creep
    } finally {
      spy.mockRestore();
    }
  });

  it('(b) ZOOM FLOOR: ONE bump per ARM — a mid-arm pps drop does NOT re-bump (guard); a cleared + re-armed preview claims a fresh bump', async () => {
    const spy = vi.spyOn(zoomController, 'setZoomLevel');
    try {
      boot({ pxPerSec: 5, playhead: 16, hoverInsertPreview: { mediaId: 'm-08', mode: 'insert' } });
      expect(spy).toHaveBeenCalledTimes(1); // the arm\'s one bump
      // force the ghost back under the floor MID-ARM — the guard holds
      act(() => { useUi.setState({ pxPerSec: 5 }); });
      await nextFrame();
      expect(spy).toHaveBeenCalledTimes(1); // never continuous
      expect(store().pxPerSec).toBe(5);
      // clear + re-arm the SAME preview = a NEW arm → a fresh bump
      disarm();
      arm('m-08', 'insert');
      expect(spy).toHaveBeenCalledTimes(2);
    } finally {
      spy.mockRestore();
    }
  });

  it('the REFUSAL path (ok:false) scrolls to the PLAYHEAD instead — never a ghost scrollIntoView, no geometry, no badge', async () => {
    const spy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
    try {
      // fitToFill on the duration-less image source refuses; the playhead
      // (28 s = 1288 px) is offscreen in the mocked 800px viewport → the
      // playhead-follow-scroll centers it at 888 (house pattern from the
      // Ruler edge-scroll pin: mocked clientWidth/scrollWidth)
      boot({ playhead: 28, hoverInsertPreview: { mediaId: 'm-08', mode: 'fitToFill' } });
      const sc = scrollEl();
      Object.defineProperty(sc, 'clientWidth', { value: 800, configurable: true });
      Object.defineProperty(sc, 'scrollWidth', { value: 5000, configurable: true });
      await nextFrame();
      expect(sc.scrollLeft).toBe(888); // centered on the playhead — the refusal is legible in place
      expect(spy).not.toHaveBeenCalled(); // no ghost to scroll — ok:false paints nothing
      expect(screen.queryByTestId('insert-preview-layer')).toBeNull();
      expect(screen.queryByTestId('insert-preview-mode-badge')).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});

/* ---------- R23-WA (DESIGN-R23 D-A2): the FX engine — seam/head/tail zones
   + the interactive transition boxes. Rendered ONLY while fxMode (the store's
   single-source flag); zones are BUTTONS with honest labels; the transition
   box clones the fade-object grammar (slider role + frame-unit aria, ±1
   frame steps, ONE commit per gesture — Part IX rulings 3/21). ---------- */

describe('R23-WA: the FX engine gates (fxMode renders the zones; absence otherwise)', () => {
  it('fxMode OFF (default boot): NO seam zones, NO head/tail zones, the transition box stays the inert marker', () => {
    boot({});
    expect(screen.queryAllByTestId(/^fx-seam-/)).toHaveLength(0);
    expect(screen.queryAllByTestId(/^fx-head-/)).toHaveLength(0);
    expect(screen.queryAllByTestId(/^fx-tail-/)).toHaveLength(0);
    const box = screen.getByTestId('transition-el-2');
    expect(box).not.toHaveAttribute('role', 'slider');
    expect(box).not.toHaveAttribute('tabindex', '0');
    expect(screen.queryByTestId('transition-trim-r-el-2')).not.toBeInTheDocument();
  });

  it('fxMode ON (the FX tool): zones render on every unlocked lane — EMPTY butt-spliced seams + head/tail per track', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    // the tr-main seams: el-1|el-2 (8.5s) + el-3|el-4 rides el-4's
    // virtualization cull (900px jsdom viewport — the zones share the
    // clips' window law). R24-W3 re-pin: el-2|el-3 is OCCUPIED
    // (el-2.transitionOut) — its zone is ABSENT now (F3 root cause b: the
    // object owns its edge); the transition BOX answers that seam (the
    // click-select + the ⇄ drop door).
    expect(screen.getByTestId('fx-seam-el-1-el-2')).toBeInTheDocument();
    expect(screen.queryByTestId('fx-seam-el-2-el-3')).not.toBeInTheDocument();
    expect(screen.getByTestId('transition-el-2')).toBeInTheDocument(); // the box answers
    expect(screen.queryByTestId('fx-seam-el-3-el-4')).not.toBeInTheDocument();
    // D-A2.3's LETTER: head/tail = the TRACK's first/last element. The
    // tr-main first/last carry SEEDED demo fades (el-1 fadeIn 0.5 / el-4
    // fadeOut 1.0 — D-A3's fixture), so per R23-WA-REV P3 #5 their zones do
    // NOT render: the fade OBJECTS are the surfaces (selection + trim).
    // The zone law still has a live target: the OVERLAY's un-faded text clip
    // el-5 owns both its track edges.
    expect(screen.queryByTestId('fx-head-el-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('fade-object-el-1-in')).toBeInTheDocument();
    expect(screen.queryByTestId('fx-tail-el-4')).not.toBeInTheDocument();
    expect(screen.getByTestId('fx-head-el-5')).toBeInTheDocument();
    expect(screen.getByTestId('fx-tail-el-5')).toBeInTheDocument();
    // el-3 is mid-track — NEVER a head or tail zone
    expect(screen.queryByTestId('fx-head-el-3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('fx-tail-el-3')).not.toBeInTheDocument();
    // the audio lane's single clip owns BOTH edges — seeded audioFadeIn/Out
    // mean the objects answer, not zones (R23-WA-REV P3 #5)
    expect(screen.queryByTestId('fx-head-el-6')).not.toBeInTheDocument();
    expect(screen.queryByTestId('fx-tail-el-6')).not.toBeInTheDocument();
    expect(screen.getByTestId('fade-object-el-6-in')).toBeInTheDocument();
    expect(screen.getByTestId('fade-object-el-6-out')).toBeInTheDocument();
    // LOCKED lanes are inert (tr-audio-2) — the marquee/trim lock law
    expect(screen.queryByTestId('fx-head-el-7')).not.toBeInTheDocument();
  });

  it("the zones virtualize with the clips' window (scroll-follow) + el-4's fade object mounts on scroll", () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const scrollTo = (x: number) => {
      const sc = scrollEl();
      act(() => { sc.scrollLeft = x; });
      fireEvent.scroll(sc);
    };
    // scroll the window right so el-4 [24, 30) s = [1104, 1380) px enters:
    // window [scroll−200, scroll+1100] — el-4's fade-out OBJECT mounts with
    // it (its tail zone never exists — the seeded fadeOut owns the edge)
    scrollTo(900);
    expect(screen.getByTestId('fade-object-el-4-out')).toBeInTheDocument();
    // el-1 + el-5 are culled left — el-1's fade object and el-5's head/tail
    // zones virtualize away (the clips' own window law)
    expect(screen.queryByTestId('fade-object-el-1-in')).not.toBeInTheDocument();
    expect(screen.queryByTestId('fx-head-el-5')).not.toBeInTheDocument();
    expect(screen.queryByTestId('fx-tail-el-5')).not.toBeInTheDocument();
    // and the mid-track el-3 NEVER gains a head or tail zone (its in-edge is
    // not a track head; its out-edge not a track tail)
    expect(screen.queryByTestId('fx-head-el-3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('fx-tail-el-3')).not.toBeInTheDocument();
  });

  it('zones are honest BUTTONS (a11y): labelled, hover widens the seam 12→24px + shows the + affordance', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const seam = screen.getByTestId('fx-seam-el-1-el-2');
    expect(seam.tagName).toBe('BUTTON');
    expect(seam.getAttribute('aria-label')).toContain('Add Cross Dissolve');
    expect(seam.style.width).toBe('12px');
    fireEvent.mouseEnter(seam);
    expect(seam.style.width).toBe('24px');
    expect(seam.textContent).toBe('+'); // the affordance appears on hover
    fireEvent.mouseLeave(seam);
    expect(seam.style.width).toBe('12px');
  });
});

describe('R23-WA: seam-zone click law (apply-default / select-existing)', () => {
  it('a seam with NO transition: click applies the default crossfade AND selects the new object', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    fireEvent.click(screen.getByTestId('fx-seam-el-1-el-2'));
    const el1 = scene1().tracks.find((t) => t.id === 'tr-main')!.elements.find((e) => e.id === 'el-1')!;
    expect(el1.transitionOut).toEqual({
      type: 'crossfade', presentation: 'Cross Dissolve', duration: 0.5, alignment: 0.5,
    });
    expect(store().selectedFxObject).toEqual({ kind: 'transition', elementId: 'el-1' });
    // the box for the NEW transition renders interactive (fxMode)
    expect(screen.getByTestId('transition-el-1')).toHaveAttribute('role', 'slider');
  });

  it('a seam WITH a transition: the BOX\'s pointerdown SELECTS it — no doc write, no new history entry (R24-W3 re-point: the zone is gone, F3)', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const pastBefore = store().past.length;
    // the occupied seam renders NO zone — the transition box owns the edge
    expect(screen.queryByTestId('fx-seam-el-2-el-3')).not.toBeInTheDocument();
    const box = screen.getByTestId('transition-el-2');
    fireEvent.pointerDown(box, { button: 0, pointerId: 21 });
    expect(store().selectedFxObject).toEqual({ kind: 'transition', elementId: 'el-2' });
    expect(store().past.length).toBe(pastBefore);
  });

  it('a Transition browser row dropped on a seam applies that presentation', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const dt = {
      types: ['application/x-nle-effect'],
      getData: () => JSON.stringify({ name: 'Dip to Black', cat: 'Transition' }),
      dropEffect: 'copy',
    };
    const seam = screen.getByTestId('fx-seam-el-1-el-2');
    fireEvent.dragOver(seam, { dataTransfer: dt });
    fireEvent.drop(seam, { dataTransfer: dt });
    const el1 = scene1().tracks.find((t) => t.id === 'tr-main')!.elements.find((e) => e.id === 'el-1')!;
    expect(el1.transitionOut!.presentation).toBe('Dip to Black');
    expect(store().selectedFxObject).toEqual({ kind: 'transition', elementId: 'el-1' });
  });

  it('a non-Transition row dropped on a seam is refused with the honest toast (fade presets drop on clip bodies)', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const dt = {
      types: ['application/x-nle-effect'],
      getData: () => JSON.stringify({ name: 'Fade In 1s', cat: 'Fade' }),
      dropEffect: 'copy',
    };
    fireEvent.drop(screen.getByTestId('fx-seam-el-1-el-2'), { dataTransfer: dt });
    expect(store().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'Seam drops take transitions' });
  });
});

/* ---------- R24-W3 (DESIGN-R24 §3 W3 — A1/F3): the FX-row DnD round.
   ONE shared parser (Clip.tsx's applyFxRowToSeam / applyFxRowToClip) behind
   THREE doors — the Clip body, the empty SeamZone, the OCCUPIED-seam
   TransitionBox — plus the dragOver visual grammar (HTML5 drags never fire
   hover) and the F3 wrapper/visual split that makes short transitions
   trimmable. dataTransfer stubs follow the file's drop pattern. ---------- */

const fxRow = (name: string, cat: string) => ({
  types: ['application/x-nle-effect'],
  getData: () => JSON.stringify({ name, cat }),
  dropEffect: 'copy',
});
const elById = (id: string) => scene1().tracks.flatMap((t) => t.elements).find((e) => e.id === id)!;

describe('R24-W3 (A1-R4): drag-over visuals — the empty-seam zone + the occupied-seam ⇄ surface', () => {
  it('an fx-row dragOver arms the seam zone: the 24px drop zone (24 wide × 24 tall, centered), the 26% mark fill, 1px border, the + glyph; dragLeave disarms', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const seam = screen.getByTestId('fx-seam-el-1-el-2');
    expect(seam.style.width).toBe('12px'); // rest grammar unchanged
    expect(seam.style.height).toBe('80px'); // the full-lane hit strip
    fireEvent.dragOver(seam, { dataTransfer: fxRow('Dip to Black', 'Transition') });
    expect(seam.style.width).toBe('24px');
    expect(seam.style.height).toBe('24px'); // A1-R4: the drop zone renders 24px tall
    expect(seam.style.top).toBe('28px');    // vertically centered in the 80px main lane
    expect(seam.style.background).toContain('26%, transparent');
    expect(seam.style.border).toBe('1px solid var(--transition-mark)');
    expect(seam.textContent).toBe('+');     // the affordance HTML5 drags cannot hover into
    fireEvent.dragLeave(seam, { dataTransfer: fxRow('Dip to Black', 'Transition') });
    expect(seam.style.width).toBe('12px');
    expect(seam.style.height).toBe('80px');
    expect(seam.textContent).toBe('');
  });

  it('a POOL drag never arms the seam affordance (the MIME guard — the zone stays at rest; the lane\'s own pool grammar may answer below it)', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const seam = screen.getByTestId('fx-seam-el-1-el-2');
    fireEvent.dragOver(seam, { dataTransfer: { types: [POOL_DRAG_TYPE], dropEffect: '' } });
    expect(seam.style.width).toBe('12px'); // the zone never armed
    expect(seam.style.height).toBe('80px'); // no dragOver state
    expect(seam.textContent).toBe('');      // no '+' affordance
  });

  it('the box as the ⇄ drop surface: a compatible dragOver widens the 14px floor box to the 24px drop floor, drops the paint to the 26% fill, swaps the glyph to ⇄; dragLeave restores', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    // shrink el-2's transition to the 0.1s domain floor — the 4.6px box
    // renders the 14px minimum (the F3 repro geometry)
    act(() => { useUi.getState().setTransition('el-2', { duration: 0.1 }); });
    const box = screen.getByTestId('transition-el-2');
    expect(box.style.width).toBe('14px'); // the sub-0.3s floor box
    fireEvent.dragOver(box, { dataTransfer: fxRow('Wipe Left', 'Transition') });
    expect(box.style.width).toBe('24px'); // the 24px drop floor — a real target
    const vis = screen.getByTestId('transition-visual-el-2');
    expect(vis.style.background).toContain('26%, transparent'); // paint drops to the fill
    expect(box.textContent).toContain('⇄');                     // the replace affordance
    fireEvent.dragLeave(box, { dataTransfer: fxRow('Wipe Left', 'Transition') });
    expect(box.style.width).toBe('14px');
    expect(vis.style.background).toContain('to bottom');        // the 30→70% gradient back
    expect(box.textContent).not.toContain('⇄');
  });

  it('the clip body keeps its drag ring in fxMode (the fxMode twin of Clip.test\'s ring pin)', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const clip = screen.getByTestId('clip-el-1');
    fireEvent.dragOver(clip, { dataTransfer: fxRow('Vignette', 'Stylize') });
    expect(clip.className).toContain('ring-accent');
    fireEvent.dragLeave(clip, { dataTransfer: fxRow('Vignette', 'Stylize') });
    expect(clip.className).not.toContain('ring-accent');
  });
});

describe('R24-W3 (A1-R1): the occupied-seam box — the third door (replace-never-stack)', () => {
  it('a transition row dropped on the box REPLACES the presentation and RETAINS duration + alignment (the partial patch)', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    fireEvent.drop(screen.getByTestId('transition-el-2'), { dataTransfer: fxRow('Wipe Left', 'Transition') });
    const tr = elById('el-2').transitionOut!;
    expect(tr.presentation).toBe('Wipe Left');
    expect(tr.type).toBe('crossfade'); // the presentation/type swap ONLY
    expect(tr.duration).toBe(0.75);    // the user's tuning rides through
    expect(tr.alignment).toBe(0.5);
    expect(store().selectedFxObject).toEqual({ kind: 'transition', elementId: 'el-2' }); // the fx-domain select
    expect(store().past).toHaveLength(1); // ONE replace entry — never a stack
  });

  it('an IDENTICAL presentation short-circuits BEFORE setTransition: the Already toast + the fx-domain select, no doc write, no history (the W0 no-op twin\'s front door)', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const before = JSON.stringify(elById('el-2').transitionOut);
    fireEvent.drop(screen.getByTestId('transition-el-2'), { dataTransfer: fxRow('Cross Dissolve', 'Transition') });
    expect(store().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'Already Cross Dissolve' });
    expect(JSON.stringify(elById('el-2').transitionOut)).toBe(before); // untouched
    expect(store().past).toHaveLength(0);
    expect(store().selectedFxObject).toEqual({ kind: 'transition', elementId: 'el-2' }); // the select still lands
  });

  it('the seam refusal detail splits per row-kind: a fade row names the clip-body route; an effect row names the stack route', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    fireEvent.drop(screen.getByTestId('fx-seam-el-1-el-2'), { dataTransfer: fxRow('Fade In 1s', 'Fade') });
    expect(store().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'Seam drops take transitions' });
    expect(store().toasts.at(-1)!.detail).toContain('fade presets drop on a clip body');
    fireEvent.drop(screen.getByTestId('transition-el-2'), { dataTransfer: fxRow('Gaussian Blur', 'Blur') });
    expect(store().toasts.at(-1)).toMatchObject({ kind: 'info', title: 'Seam drops take transitions' });
    expect(store().toasts.at(-1)!.detail).toContain('effects stack on a clip body');
    expect(store().past).toHaveLength(0); // refusals never write
  });
});

describe('R24-W3 (A1-R3): routing at the integrated surface', () => {
  it('a transition row dropped on the CLIP BODY routes to the clip\'s OUTgoing seam (el-1\'s seam with el-2 mints on el-1)', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    fireEvent.drop(screen.getByTestId('clip-el-1'), { dataTransfer: fxRow('Dip to Black', 'Transition') });
    expect(elById('el-1').transitionOut).toMatchObject({ type: 'crossfade', presentation: 'Dip to Black' });
    expect(store().selectedFxObject).toEqual({ kind: 'transition', elementId: 'el-1' });
    expect(store().past).toHaveLength(1); // the mint — one entry
  });

  it('an fx-row drop on the EMPTY LANE is a pure no-op — no highlight, no toast, no commit (the lane\'s pool-only guard)', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const lane = laneOf('el-1');
    const toastsBefore = store().toasts.length;
    const ev = createEvent.dragOver(lane, { dataTransfer: fxRow('Gaussian Blur', 'Blur') });
    fireEvent(lane, ev);
    expect(ev.defaultPrevented).toBe(false); // never a drop target for fx rows
    expect(lane.className).not.toContain('pool-lane-ok'); // no highlight
    fireEvent.drop(lane, { dataTransfer: fxRow('Gaussian Blur', 'Blur') });
    expect(store().toasts).toHaveLength(toastsBefore); // silence is the law
    expect(elById('el-1').effects).toHaveLength(1); // the seeded instance only — no stack push
    expect(store().past).toHaveLength(0);
  });
});

describe('R24-W3 (F3): the wrapper/visual split — trim handles reachable on SHORT transitions', () => {
  it('hit geometry: the WRAPPER is un-clipped (height + top-[2px]); the VISUAL child is the overflow-hidden paint; the handles hang -3px/12px OUTSIDE as the visual\'s siblings, pointer-events INHERIT', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const wrap = screen.getByTestId('transition-el-2');
    expect(wrap.className).not.toContain('overflow-hidden'); // UN-clipped — nothing eats the handle zones
    expect(wrap.style.height).toBe('76px');
    expect(wrap.className).toContain('top-[2px]');
    expect(wrap.style.pointerEvents).toBe('auto'); // the fxMode gate lives on the wrapper
    const vis = screen.getByTestId('transition-visual-el-2');
    expect(vis.className).toContain('overflow-hidden'); // the paint child clips
    expect(vis.style.pointerEvents).toBe('inherit');    // the visual follows the wrapper's gate
    for (const side of ['l', 'r'] as const) {
      const handle = screen.getByTestId(`transition-trim-${side}-el-2`);
      expect(handle.parentElement).toBe(wrap); // the visual's SIBLINGS, the wrapper's children
      expect(handle.style.pointerEvents).toBe('inherit'); // the handles follow the gate too
      expect(side === 'l' ? handle.style.left : handle.style.right).toBe('-3px'); // 3px OUTSIDE the edge
      expect(handle.style.width).toBe('12px');
    }
  });

  it('a seam WITH a transitionOut renders NO SeamZone (the EdgeFadeZone law cloned, F3 root cause b): at the 0.1s floor the box + its handles stand alone', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    act(() => { useUi.getState().setTransition('el-2', { duration: 0.1 }); }); // the F3 repro: the 14px floor box
    expect(screen.queryByTestId('fx-seam-el-2-el-3')).not.toBeInTheDocument(); // NO z-8 strip over the box
    expect(screen.getByTestId('transition-el-2')).toBeInTheDocument();
    expect(screen.getByTestId('transition-trim-l-el-2')).toBeInTheDocument(); // reachable — nothing covers them
    expect(screen.getByTestId('transition-trim-r-el-2')).toBeInTheDocument();
  });
});

describe('R23-WA: head/tail zone click law (half-open fade zones, #104/#105)', () => {
  it('a head zone with NO fade: click applies a 0.5s fade and selects the new object', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    fireEvent.click(screen.getByTestId('fx-head-el-5')); // the text clip has no fades
    const el5 = scene1().tracks.find((t) => t.id === 'tr-overlay-1')!.elements[0]!;
    expect(el5.fadeIn).toBe(0.5);
    expect(store().selectedFxObject).toEqual({ kind: 'fade', elementId: 'el-5', side: 'in' });
  });

  it('R23-WA-REV P3 #5: an element WITH a fade renders NO zone — its fade OBJECT is the select surface (pointerdown selects, no doc write)', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const pastBefore = store().past.length;
    expect(screen.queryByTestId('fx-head-el-1')).not.toBeInTheDocument(); // the zone is gone
    const obj = screen.getByTestId('fade-object-el-1-in');
    fireEvent.pointerDown(obj, { button: 0, pointerId: 5 });
    expect(store().selectedFxObject).toEqual({ kind: 'fade', elementId: 'el-1', side: 'in' });
    expect(store().past.length).toBe(pastBefore);
  });

  it('the audio fade object selects its seeded fade on pointerdown (the audioFade domain)', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    fireEvent.pointerDown(screen.getByTestId('fade-object-el-6-out'), { button: 0, pointerId: 5 });
    expect(store().selectedFxObject).toEqual({ kind: 'fade', elementId: 'el-6', side: 'out' });
  });
});

describe('R23-WA: the transition box — interactive ONLY in fxMode (D-A2.4)', () => {
  it('the slider contract: role=slider, frame-unit aria-valuenow, focusable, click-selects into the FX domain', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const box = screen.getByTestId('transition-el-2');
    expect(box).toHaveAttribute('role', 'slider');
    expect(box).toHaveAttribute('tabindex', '0');
    expect(box).toHaveAttribute('aria-valuemin', '2'); // 0.1 s × 24 fps — the domain floor (R23-WA-REV P3 #8)
    expect(box).toHaveAttribute('aria-valuemax', '48'); // 2 s × 24 fps
    expect(box).toHaveAttribute('aria-valuenow', '18'); // 0.75 s = 18 frames
    expect(box).toHaveAttribute('aria-valuetext', '0.75s');
    fireEvent.pointerDown(box, { button: 0, pointerId: 7 });
    expect(store().selectedFxObject).toEqual({ kind: 'transition', elementId: 'el-2' });
  });

  it('keyboard trim: ±1 frame, ⇧ ×10, Home the 0.1s floor, End the 2s domain max (the fade-object grammar cloned)', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const box = screen.getByTestId('transition-el-2');
    const dur = () => scene1().tracks.find((t) => t.id === 'tr-main')!.elements.find((e) => e.id === 'el-2')!.transitionOut!.duration;
    fireEvent.keyDown(box, { key: 'ArrowRight' });
    expect(dur()).toBeCloseTo(19 / 24, 10); // +1 frame
    fireEvent.keyDown(box, { key: 'ArrowRight', shiftKey: true });
    expect(dur()).toBeCloseTo(29 / 24, 10); // +10 frames
    fireEvent.keyDown(box, { key: 'ArrowLeft' });
    expect(dur()).toBeCloseTo(28 / 24, 10);
    fireEvent.keyDown(box, { key: 'Home' });
    expect(dur()).toBe(0.1); // the domain FLOOR — matches the Inspector's Duration row min (R23-WA-REV P3 #8), never a ghost 0s box
    fireEvent.keyDown(box, { key: 'End' });
    expect(dur()).toBe(2); // the domain max
    // each keypress mints its own undo entry (bracket-nudge semantics)
    expect(store().past.length).toBe(5);
  });

  it('edge-drag trim: clamp-commit — LOCAL preview, ONE setTransition commit per gesture (ruling 21)', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const handle = screen.getByTestId('transition-trim-r-el-2');
    const pastBefore = store().past.length;
    // cut at 17s × 46pps = 782px content x; jsdom's scroll rect collapses to
    // identity (the fade-object drag tests' own geometry fallback).
    // ×2 mapping (R23-WA-REV P1): the cut-CENTERED box puts the right edge at
    // cut + dur·pps/2, so duration = 2 × (pointer − cut)/pps — the edge then
    // tracks the cursor 1:1.
    fireEvent.pointerDown(handle, { button: 0, pointerId: 9 });
    // 23px past the cut → raw = 2·23/46 = 1.0 s
    fireEvent.pointerMove(handle, { pointerId: 9, buttons: 1, clientX: 805 });
    expect(scene1().tracks.find((t) => t.id === 'tr-main')!.elements.find((e) => e.id === 'el-2')!.transitionOut!.duration).toBe(0.75); // NOT committed mid-drag
    // 92px past the cut → raw = 4 s → clamped by the drag's own 2s max
    fireEvent.pointerMove(handle, { pointerId: 9, buttons: 1, clientX: 874 });
    fireEvent.pointerUp(handle, { pointerId: 9 });
    expect(scene1().tracks.find((t) => t.id === 'tr-main')!.elements.find((e) => e.id === 'el-2')!.transitionOut!.duration).toBe(2);
    expect(store().past.length).toBe(pastBefore + 1); // ONE entry for the whole gesture
    expect(store().selectedFxObject).toEqual({ kind: 'transition', elementId: 'el-2' }); // the drag also selects
  });

  it('grab-continuity (R23-WA-REV P1): a grab AT the actual edge + a sub-frame move is a frame-snapped NO-OP — the box never collapses to half', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const handle = screen.getByTestId('transition-trim-r-el-2');
    // el-2's 0.75 s box: right edge = 782 + 0.75·46/2 = 799.25 px
    fireEvent.pointerDown(handle, { button: 0, pointerId: 11, clientX: 799.25 });
    // 0.4 px inward: raw = 2·(799.65−782)/46 = 0.767 s → frame-snaps to 18/24
    // = 0.75 — the pre-×2 code mapped this to ~0.38 s (the collapse bug)
    fireEvent.pointerMove(handle, { pointerId: 11, buttons: 1, clientX: 799.65 });
    fireEvent.pointerUp(handle, { pointerId: 11 });
    expect(scene1().tracks.find((t) => t.id === 'tr-main')!.elements.find((e) => e.id === 'el-2')!.transitionOut!.duration).toBe(0.75);
    expect(store().past.length).toBe(0); // the commit's no-op guard — no history entry
  });

  it('a press-release WITHOUT movement is a no-op (no commit, no history entry)', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    const handle = screen.getByTestId('transition-trim-l-el-2');
    const pastBefore = store().past.length;
    fireEvent.pointerDown(handle, { button: 0, pointerId: 9 });
    fireEvent.pointerUp(handle, { pointerId: 9 });
    expect(scene1().tracks.find((t) => t.id === 'tr-main')!.elements.find((e) => e.id === 'el-2')!.transitionOut!.duration).toBe(0.75);
    expect(store().past.length).toBe(pastBefore);
  });
});

describe('R23-WA: fxMode recedes the clip-edit surfaces (the context-menu router)', () => {
  it('R23-WA-REV P2 #2: blade + fxMode — clip clicks SELECT, never split (the recede law beats the tool)', () => {
    boot({ tool: 'blade', fxMode: true, selection: [] });
    const clip = screen.getByTestId('clip-el-1');
    expect(clip.style.cursor).toBe('pointer'); // the recede cursor, not the blade crosshair
    const pastBefore = store().past.length;
    fireEvent.click(clip, { clientX: 100 });
    expect(store().selection).toEqual(['el-1']); // selected — the FX inspector shows the effect stack
    expect(scene1().tracks.find((t) => t.id === 'tr-main')!.elements).toHaveLength(4); // NO split — the doc is untouched
    expect(store().past.length).toBe(pastBefore);
  });

  it('R23-WA-REV P3 #4: a transition box on a LOCKED lane stays inert (no slider role, no handles)', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    // lock tr-main AFTER boot (el-2's transition box lives there) — the
    // header's own command route (toggleTrackCmd, the §4.9 menu's law)
    act(() => { useUi.getState().toggleTrackCmd('sc-1', 'tr-main', 'locked'); });
    const box = screen.getByTestId('transition-el-2');
    expect(box).not.toHaveAttribute('role', 'slider');
    expect(box).not.toHaveAttribute('tabindex', '0');
    expect(screen.queryByTestId('transition-trim-r-el-2')).not.toBeInTheDocument();
  });

  it('right-click on a clip in fxMode NEVER opens the clip menu — the surface menu answers (D-A2.1)', () => {
    boot({ tool: 'fx', fxMode: true, selection: [] });
    fireEvent.contextMenu(screen.getByTestId('clip-el-1'), { clientX: 30, clientY: 30 });
    expect(screen.queryByTestId('shell-menu-clip')).not.toBeInTheDocument();
    // the empty-lane surface menu is the answer (its rows are lane-level commands)
    expect(screen.getByTestId('shell-menu-timeline-empty')).toBeInTheDocument();
  });
});
