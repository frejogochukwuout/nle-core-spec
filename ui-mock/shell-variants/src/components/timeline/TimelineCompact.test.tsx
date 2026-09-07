/* TimelineCompact — R22-D6 (DESIGN-R22; issue #75: "this as the most
   compact view for timeline is actually quite nice ... a timeline style
   that can be generalized"). Pins:
   - the frozen anatomy: 22px ruler + per-kind lanes (video 24 / caption 20 /
     audio 16 dimmed) + 30px badge column;
   - the V/A/T color coding (#75): the clip border/tint + the badge carry
     the reference tokens (--clip-video / --clip-audio-a / --clip-text);
   - click-to-target: a clip click sets selection + re-targets clip mode;
   - NO drag/trim handles ever (frozen by law — the surface has no
     interactive children beyond the clip buttons).
   R23-WF (DESIGN-R23 D-F1, issue #107): the deliver head-row swap — the
   rangeBand prop replaces the ruler with the 32px interactive in/out RANGE
   BAND. Pins: the swap + 32px geometry; the bracket grammar's slider
   semantics; ruling 21's drag law (local preview, ONE commit per gesture,
   cancel discards, no-op release writes nothing, [0, duration] clamp);
   the R14 ordering law from the band's own writer; the ±1-frame (⇧ ×10)
   keyboard law; the ruler keeps the head row on every other mount. */

import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TimelineCompact } from './TimelineCompact';
import { useUi } from '../../state/useUiStore';
import { type UiPatch } from '../../test/helpers';

type Patch = UiPatch;

const setStore = (patch?: Patch) => {
  useUi.setState((s) => ({
    page: 'color',
    scenes: s.scenes,
    selection: ['el-2'],
    colorGradeTarget: 'clip',
    ...(patch ?? {}),
  }));
};

const mount = (patch?: Patch) => {
  setStore(patch);
  return render(<TimelineCompact />);
};

/* D-F1: the band mount — the deliver head-row shape (the lanes beneath are
 * the same frozen strip; only the head row swaps) */
const mountBand = (patch?: Patch) => {
  setStore(patch);
  return render(<TimelineCompact rangeBand />);
};

const S = () => useUi.getState();

beforeEach(() => {
  useUi.setState({ toasts: [] });
});

describe('TimelineCompact — the frozen anatomy (C51 set, kept)', () => {
  it('renders the root, the ruler, and one lane per track with badges', () => {
    const { container } = mount();
    expect(screen.getByTestId('shell-timeline-compact')).toBeInTheDocument();
    expect(screen.getByTestId('shell-timeline-compact-ruler')).toBeInTheDocument();
    // the mock scene's tracks all get lanes (video, overlay, audio, caption)
    const lanes = container.querySelectorAll('[data-testid^="shell-timeline-compact-lane-"]');
    expect(lanes.length).toBeGreaterThanOrEqual(4);
    // badges: the track ids ride the 30px column (tr-main = V1)
    expect(container.querySelector('[data-testid="shell-timeline-compact-lane-tr-main"] [data-testid="shell-timeline-compact-clip-el-1"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="shell-timeline-compact-lane-tr-caption"]')).toBeTruthy();
  });

  it('audio lanes render dimmed; clips are buttons (click-to-target), never drag/trim handles', () => {
    const { container } = mount();
    const audioLane = container.querySelector('[data-testid^="shell-timeline-compact-lane-tr-audio"]');
    expect(audioLane?.className).toContain('opacity-55');
    // frozen law: the only interactive elements are the clip buttons
    const clip = screen.getByTestId('shell-timeline-compact-clip-el-2');
    expect(clip.tagName).toBe('BUTTON');
    expect(container.querySelectorAll('[data-testid*="trim"], [data-testid*="fade-object"], [data-testid*="resize"]')).toHaveLength(0);
  });
});

describe('TimelineCompact — the V/A/T color coding (#75)', () => {
  it('the clip border + tint carry the kind tokens (video/audio/text), not the old grey', () => {
    const { container } = mount();
    // the style ATTRIBUTES carry the tokens (jsdom does not resolve var() —
    // toHaveStyle would compute; the inline style is the contract)
    const clipEl = screen.getByTestId('shell-timeline-compact-clip-el-1'); // main-track clip, NOT selected
    expect(clipEl.style.borderColor).toBe('var(--clip-video)');
    expect(clipEl.style.background).toContain('var(--clip-video)');
    const audioClip = container.querySelector('[data-testid^="shell-timeline-compact-lane-tr-audio"] [data-testid^="shell-timeline-compact-clip-"]');
    expect((audioClip as HTMLElement).style.borderColor).toBe('var(--clip-audio-a)');
    const captionClip = container.querySelector('[data-testid="shell-timeline-compact-lane-tr-caption"] [data-testid^="shell-timeline-compact-clip-"]');
    expect((captionClip as HTMLElement).style.borderColor).toBe('var(--clip-text)');
  });

  it('the selected clip carries the accent border + tint (target highlight)', () => {
    mount({ selection: ['el-2'] });
    const clip = screen.getByTestId('shell-timeline-compact-clip-el-2');
    expect(clip).toHaveAttribute('aria-pressed', 'true');
    expect(clip.style.borderColor).toBe('var(--accent-selection)');
  });
});

describe('TimelineCompact — click-to-target (the color page law)', () => {
  it('clicking a clip sets selection[0] + re-targets clip mode', () => {
    mount({ selection: [], colorGradeTarget: 'timeline' });
    fireEvent.click(screen.getByTestId('shell-timeline-compact-clip-el-1'));
    expect(S().selection).toEqual(['el-1']);
    expect(S().colorGradeTarget).toBe('clip');
    expect(screen.getByTestId('shell-timeline-compact-clip-el-1')).toHaveAttribute('aria-pressed', 'true');
  });

  it('the playhead marker rides the strip at the store playhead (read-only)', () => {
    const { container } = mount({ playhead: 4 });
    // the marker is the w-px absolute with the accent background
    const marker = container.querySelector('[data-testid="shell-timeline-compact"] .pointer-events-none.absolute.w-px');
    expect(marker).toBeTruthy();
    expect(marker?.className).toContain('z-[3]');
  });
});

describe('R23-WB (D-B3/#96, ruling 19) — the trackhead badge becomes a REAL button', () => {
  it('clicking a badge selects the track (the selectedTrackId domain) + carries the track name as title', () => {
    mount({ selectedTrackId: null });
    const badge = screen.getByTestId('shell-timeline-compact-track-tr-main');
    expect(badge.tagName).toBe('BUTTON');
    expect(badge).toHaveAttribute('title', 'V1'); // tr-main's name
    expect(badge).toHaveAttribute('aria-label', 'Select track V1');
    expect(badge).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(badge);
    expect(S().selectedTrackId).toBe('tr-main');
    expect(badge).toHaveAttribute('aria-pressed', 'true'); // honest pressed state
  });

  it('the selectTrack domain law rides the badge: a clip selection clears when a track is taken over', () => {
    mount({ selection: ['el-2'] });
    fireEvent.click(screen.getByTestId('shell-timeline-compact-track-tr-audio-1'));
    expect(S().selectedTrackId).toBe('tr-audio-1');
    expect(S().selection).toEqual([]); // the 7-domain mutual-exclusivity law
  });

  it('every lane carries a badge button — audio (16px) and caption (20px) included (the honest 24px scope)', () => {
    const { container } = mount();
    const badges = container.querySelectorAll('[data-testid^="shell-timeline-compact-track-"]');
    expect(badges.length).toBeGreaterThanOrEqual(4);
    expect(screen.getByTestId('shell-timeline-compact-track-tr-caption')).toBeInTheDocument();
    expect(screen.getByTestId('shell-timeline-compact-track-tr-audio-1')).toBeInTheDocument();
    // no mute/solo stack fits these lanes — selection + name ONLY (registered)
    expect(container.querySelectorAll('[data-testid*="mute"], [data-testid*="solo"]')).toHaveLength(0);
  });
});

/* ---------- R23-WF (DESIGN-R23 D-F1, #107): the deliver range band ----------
   Fixture: loop {2, 28}, sc-1 duration 30 s, 46 pps, playhead 16 (the same
   grid the Ruler bracket pins ride). The band's grammar is the ruling-21
   clone of the Ruler brackets / fade-object clamp-commit law. */
describe('R23-WF (D-F1, #107) — the range band replaces the ruler head row', () => {
  const inH = () => screen.getByTestId('shell-deliver-range-band-in');
  const outH = () => screen.getByTestId('shell-deliver-range-band-out');

  it('the band mounts at 32px ("normal height") and the ruler row is DOM-ABSENT on the band mount', () => {
    mountBand();
    const band = screen.getByTestId('shell-deliver-range-band');
    expect(band).toBeInTheDocument();
    expect(band.style.height).toBe('32px');
    expect(screen.queryByTestId('shell-timeline-compact-ruler')).not.toBeInTheDocument();
    // the lanes beneath are the SAME frozen strip (the swap is head-row only)
    expect(screen.getByTestId('shell-timeline-compact-clip-el-1')).toBeInTheDocument();
  });

  it('the DEFAULT mount keeps its ruler — the band is the deliver ask only (no band leaks)', () => {
    mount();
    expect(screen.getByTestId('shell-timeline-compact-ruler')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-deliver-range-band')).not.toBeInTheDocument();
    // the strip's a11y label stays the FROZEN-surface one in ruler mode...
    expect(screen.getByTestId('shell-timeline-compact')).toHaveAttribute('aria-label', 'Compact timeline (frozen — click a clip to target it)');
  });

  it('the band mount re-labels the strip honestly: lanes frozen, the head row interactive', () => {
    mountBand();
    expect(screen.getByTestId('shell-timeline-compact')).toHaveAttribute('aria-label', 'Compact timeline (lanes frozen — the export range band above is interactive)');
  });

  it('both handles expose the bracket grammar slider semantics (§11.3, cloned from the Ruler brackets)', () => {
    mountBand();
    const i = inH(), o = outH();
    expect(i).toHaveAttribute('role', 'slider');
    expect(i).toHaveAttribute('aria-label', 'Export range in point');
    expect(i).toHaveAttribute('aria-valuemin', '0');
    expect(i).toHaveAttribute('aria-valuemax', '720'); // 30 s × 24 fps
    expect(i).toHaveAttribute('aria-valuenow', '48');  // 2 s × 24
    expect(i).toHaveAttribute('aria-valuetext', '00:00:02:00');
    expect(i).toHaveAttribute('tabindex', '0');
    expect(o).toHaveAttribute('aria-label', 'Export range out point');
    expect(o).toHaveAttribute('aria-valuenow', '672'); // 28 s × 24
    expect(o).toHaveAttribute('aria-valuetext', '00:00:28:00');
    expect(i.className).toContain('cursor-ew-resize'); // looks draggable, IS draggable
  });

  it('full-height 12px bracket handles anchored INSIDE the region + the fill spans the loop (46 pps fixture)', () => {
    mountBand();
    const i = inH(), o = outH();
    // hit target ≠ visual size: 12×32 full-band handles (R20-W5 width, D-F1 height)
    expect(i.style.width).toBe('12px');
    expect(i.style.height).toBe('32px');
    expect(i.style.top).toBe('0px');
    expect(i.style.left).toBe('92px');            // 2 s × 46 (in at the region's left edge)
    expect(o.style.left).toBe('1276px');          // (2 + 26) s × 46 − 12 (out anchored inside)
    const fill = screen.getByTestId('shell-deliver-range-band-fill');
    expect(fill.style.left).toBe('92px');
    expect(fill.style.width).toBe('1196px');      // 26 s × 46
    // the Ruler loop-band dim law: dimmed (not erased) while loop playback is off
    expect(fill.style.opacity).toBe('0.13');
  });

  it('the fill dims honest-to-state: loopEnabled on → 0.24; the live TC readout rides the fill', () => {
    mountBand({ loopEnabled: true });
    expect(screen.getByTestId('shell-deliver-range-band-fill').style.opacity).toBe('0.24');
    expect(screen.getByTestId('shell-deliver-range-band-tcs')).toHaveTextContent('00:00:02:00 → 00:00:28:00');
  });
});

describe('R23-WF (D-F1) — the band drag law (ruling 21: local preview, ONE commit per gesture)', () => {
  const inH = () => screen.getByTestId('shell-deliver-range-band-in');
  const outH = () => screen.getByTestId('shell-deliver-range-band-out');

  it('the drag is LOCAL preview — no store write mid-gesture; the release commits ONCE', () => {
    mountBand();
    fireEvent.pointerDown(inH(), { pointerId: 2, button: 0 });
    fireEvent.pointerMove(inH(), { pointerId: 2, buttons: 1, clientX: 300 }); // 300/46 s
    // the preview is live (the handle's slider value + the TC text follow it)…
    expect(inH()).toHaveAttribute('aria-valuenow', '157'); // 300/46 → frame 157 (the R13 grid law)
    expect(screen.getByTestId('shell-deliver-range-band-tcs')).toHaveTextContent('00:00:06:13 → 00:00:28:00');
    // …but the store is UNTOUCHED until the release (ruling 21's one-commit law)
    expect(S().loop).toEqual({ start: 2, end: 28 });
    fireEvent.pointerUp(inH(), { pointerId: 2 });
    expect(S().loop.start).toBeCloseTo(157 / 24, 5); // the ONE commit
    expect(S().loop.end).toBe(28);
    expect(S().playhead).toBe(16); // a band drag never scrubs the playhead
  });

  it('a plain click (down + up, no move) writes nothing — the no-op release law', () => {
    mountBand();
    fireEvent.pointerDown(inH(), { pointerId: 2, button: 0 });
    fireEvent.pointerUp(inH(), { pointerId: 2 });
    expect(S().loop).toEqual({ start: 2, end: 28 });
  });

  it('pointercancel DISCARDS the preview — and a stray later release cannot commit it', () => {
    mountBand();
    fireEvent.pointerDown(inH(), { pointerId: 2, button: 0 });
    fireEvent.pointerMove(inH(), { pointerId: 2, buttons: 1, clientX: 300 });
    fireEvent.pointerCancel(inH(), { pointerId: 2 });
    fireEvent.pointerUp(inH(), { pointerId: 2 }); // the drag state is gone — no commit
    expect(S().loop).toEqual({ start: 2, end: 28 });
  });

  it('the band domain clamps to [0, scene duration] — an export range cannot exceed the timeline', () => {
    mountBand();
    fireEvent.pointerDown(inH(), { pointerId: 2, button: 0 });
    fireEvent.pointerMove(inH(), { pointerId: 2, buttons: 1, clientX: 9999 });
    expect(inH()).toHaveAttribute('aria-valuenow', '720'); // live preview clamped to 30 s
    fireEvent.pointerUp(inH(), { pointerId: 2 });
    expect(S().loop).toEqual({ start: 30, end: 30 }); // ordering law: out dragged along
  });

  it('the ordering law from the band: dragging in past the out point drags out along — never inverted', () => {
    mountBand();
    fireEvent.pointerDown(inH(), { pointerId: 2, button: 0 });
    fireEvent.pointerMove(inH(), { pointerId: 2, buttons: 1, clientX: 1380 }); // 30 s > 28 s
    fireEvent.pointerUp(inH(), { pointerId: 2 });
    expect(S().loop.start).toBe(30);
    expect(S().loop.end).toBe(30); // never inverted — the playback tick cannot hang
  });

  it('dragging out below start pulls start along (the markOut formula, cloned verbatim)', () => {
    mountBand();
    fireEvent.pointerDown(outH(), { pointerId: 3, button: 0 });
    fireEvent.pointerMove(outH(), { pointerId: 3, buttons: 1, clientX: 46 }); // 1 s < 2 s
    fireEvent.pointerUp(outH(), { pointerId: 3 });
    expect(S().loop.end).toBe(1);
    expect(S().loop.start).toBe(1); // pulled along, never left behind
  });
});

describe('R23-WF (D-F1) — the band keyboard law (±1 frame, ⇧ ×10, Home/End)', () => {
  const inH = () => screen.getByTestId('shell-deliver-range-band-in');
  const outH = () => screen.getByTestId('shell-deliver-range-band-out');

  it('arrow keys nudge the in edge ±1 frame (⇧ ×10), one commit per keypress, playhead untouched', () => {
    mountBand();
    fireEvent.keyDown(inH(), { key: 'ArrowLeft' });
    expect(S().loop.start).toBeCloseTo(2 - 1 / 24, 5);
    expect(S().loop.end).toBe(28);
    expect(S().playhead).toBe(16);
    fireEvent.keyDown(inH(), { key: 'ArrowRight', shiftKey: true });
    expect(S().loop.start).toBeCloseTo(2 - 1 / 24 + 10 / 24, 5);
  });

  it('Home/End jump the edges; the keyboard ordering law holds from the band too', () => {
    mountBand();
    fireEvent.keyDown(outH(), { key: 'ArrowLeft' });
    expect(S().loop.end).toBeCloseTo(28 - 1 / 24, 5);
    fireEvent.keyDown(inH(), { key: 'End' }); // in → 30 s: out must be dragged along
    expect(S().loop).toEqual({ start: 30, end: 30 });
    fireEvent.keyDown(outH(), { key: 'Home' }); // out → 0 s: in pulled down with it
    expect(S().loop).toEqual({ start: 0, end: 0 });
  });
});
