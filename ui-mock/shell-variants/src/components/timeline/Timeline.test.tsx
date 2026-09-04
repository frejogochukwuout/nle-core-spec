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
  it('renders one lane per track, all 7 clips, and the header column (spec 05 §12 lanes / 18 §4.7)', () => {
    boot({});
    expect(screen.getByTestId('shell-timeline')).toBeInTheDocument();
    // readout-style header zone carries the big TC readout
    expect(screen.getByTestId('shell-timeline-tc')).toHaveTextContent('00:00:16:00');
    const headers = screen.getByTestId('shell-track-headers');
    for (const id of ['tr-overlay-1', 'tr-main', 'tr-audio-1', 'tr-audio-2']) {
      expect(within(headers).getByTestId(`shell-track-header-${id}`)).toBeInTheDocument();
    }
    for (const id of ['el-1', 'el-2', 'el-3', 'el-4', 'el-5', 'el-6', 'el-7']) {
      expect(screen.getByTestId(`clip-${id}`)).toBeInTheDocument();
    }
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
