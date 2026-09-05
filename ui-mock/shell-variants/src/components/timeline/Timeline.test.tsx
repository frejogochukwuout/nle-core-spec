/* Timeline component tests — lane rendering (spec 05 §12 / 18 §4.7), marquee +
   empty-lane deselect, playhead scrub (05 §14.3), +track affordance, lane
   heights incl. the audio-focus boost (design doc §3.2 / spec 16 §3.8), pool
   drag-to-lane (18 §4.2), transition marker (05 §12.3), wheel grammar
   (18 §5A). jsdom has no layout: assertions hit conditional rendering,
   store-driven inline styles, and store wiring — never hit-testing geometry. */

import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { Timeline } from './Timeline';
import { renderShell, store, type UiPatch } from '../../test/helpers';
import { useUi } from '../../state/useUiStore';
import { useShortcuts } from '../../hooks/useShortcuts';
import { sceneDuration } from '../../lib/mockData';
import { snapToFrame } from '../../lib/timecode';
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
    // readout-style header zone carries the big TC readout
    expect(screen.getByTestId('shell-timeline-tc')).toHaveTextContent('00:00:16:00');
    const headers = screen.getByTestId('shell-track-headers');
    for (const id of ['tr-overlay-1', 'tr-main', 'tr-audio-1', 'tr-audio-2']) {
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
    fireEvent.pointerMove(head, { pointerId: 1, buttons: 1, clientX: 460 }); // 460/46 = 10 s
    expect(store().playhead).toBe(10);
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
    expect(sc.tracks).toHaveLength(5);
    expect(sc.tracks[4]!.kind).toBe('audio');
    expect(sc.tracks[4]!.badge).toBe('A3'); // 2 existing audio lanes → next badge A3
    expect(screen.getByTestId(`shell-track-header-${sc.tracks[4]!.id}`)).toBeInTheDocument();
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
  });

  it('the blocks clip-style variant swaps to the compact 40/34/28 lanes (spec 05 §12.2 blocks)', () => {
    window.localStorage.setItem('nle-shell-variants:v1', 'theme:resolve,density:pro,clip:blocks,accent:gold,header:readout');
    boot({});
    expect(laneOf('el-1').style.height).toBe('40px');
    expect(laneOf('el-5').style.height).toBe('28px');
    expect(laneOf('el-6').style.height).toBe('34px');
  });

  it('renders the crossfade box straddling the el-2 → el-3 cut (spec 05 §12.3 transition indicator)', () => {
    boot({});
    expect(screen.getByTestId('transition-el-2')).toHaveAttribute('aria-label', 'Crossfade transition, 0.75 seconds');
    expect(screen.queryByTestId('transition-el-1')).not.toBeInTheDocument(); // only el-2 carries one
  });

  it('pool drag-to-lane highlights the lane and a drop commits the mock toast (spec 18 §4.2)', () => {
    boot({ mediaDrag: { mediaId: 'm-06', overTrackId: 'tr-audio-1', allowed: true } });
    expect(laneOf('el-6').className).toContain('pool-lane-ok');
    fireEvent.drop(laneOf('el-6'), { dataTransfer: { types: [POOL_DRAG_TYPE] } });
    expect(store().mediaDrag).toBeNull();
    expect(store().toasts.at(-1)!.kind).toBe('success');
    expect(store().toasts.at(-1)!.title).toBe('Placed ocean_ambience.wav on A1');
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
    expect(scene1().markers).toHaveLength(5); // 4 fixtures + the playhead marker
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
    expect(countEls()).toBe(7); // nothing deleted
    fireEvent.contextMenu(screen.getByTestId('clip-el-2'), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByTestId('shell-menu-clip-delete'));
    fireEvent.click(screen.getByTestId('shell-confirm-confirm'));
    expect(countEls()).toBe(2); // el-6 + el-7 remain
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

  it('dropping on a dragover-COMPUTED allowed lane commits the honest-mock toast', () => {
    boot({ mediaDrag: { mediaId: 'm-06', overTrackId: null, allowed: false } });
    fireEvent.dragOver(laneOf('el-6'), { dataTransfer: { types: [POOL_DRAG_TYPE] } });
    expect(store().mediaDrag?.allowed).toBe(true); // computed by the real handler, not boot-patched
    fireEvent.drop(laneOf('el-6'), { dataTransfer: { types: [POOL_DRAG_TYPE] } });
    expect(store().mediaDrag).toBeNull();
    expect(store().toasts.at(-1)!.kind).toBe('success');
    expect(store().toasts.at(-1)!.title).toBe('Placed ocean_ambience.wav on A1');
    // honest mock: the drop commits a toast only — insertElement lands with
    // the engine round (spec 15 §5.4), so no element is added to the doc
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
    expect(scene1().tracks).toHaveLength(5);
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
    expect(ghost.style.top).toBe('306px'); // below the last lane (A2 ends at 304)
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
    expect(scene1().tracks).toHaveLength(4); // no track created
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
