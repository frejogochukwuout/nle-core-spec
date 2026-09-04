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
import { POOL_DRAG_TYPE } from '../shell/MediaPool';

const boot = (patch: UiPatch = {}) => renderShell(<Timeline />, { patch });
const laneOf = (clipId: string) => screen.getByTestId(`clip-${clipId}`).parentElement as HTMLElement;
const scrollEl = () => document.getElementById('timeline-scroll') as HTMLElement;
const scene1 = () => store().scenes.find((s) => s.id === 'sc-1')!;

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

  it('⌘+wheel zooms the timeline through the native non-passive listener (spec 18 §5A wheel grammar)', () => {
    boot({});
    fireEvent.wheel(scrollEl(), { ctrlKey: true, deltaY: -100 });
    expect(store().pxPerSec).toBeGreaterThan(46);
    fireEvent.wheel(scrollEl(), { ctrlKey: true, deltaY: 100 });
    expect(store().pxPerSec).toBe(46); // exp-symmetric factors round-trip
  });
});
