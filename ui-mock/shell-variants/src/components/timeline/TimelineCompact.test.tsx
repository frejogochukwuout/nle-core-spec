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
   R23-WF (DESIGN-R23 D-F1, issue #107) → R24-W4 (A3-R7, #71 — the
   COEXISTENCE law): the 22px read-only ruler is UNCONDITIONAL in the head
   stack (rulerTiers ticks/TC + the read-only in/out bracket FLAGS at the
   loop edges) and the 32px RANGE BAND mounts BELOW it on the rangeBand
   mount (54px total). Pins: the coexistence stack; the bracket grammar's
   slider semantics; ruling 21's drag law (local preview, ONE commit per
   gesture, cancel discards, no-op release writes nothing, [0, duration]
   clamp); the A3-R7 band grammar (solid 30% accent-tint fill + 1px 65%
   edges, the ~40% dark mask outside in→out, hover-brighten handles, the
   STATE-INDEPENDENT fill — the R23 loop-dim wash dead); the F3 P3-2
   honest-preview clamp (the mouse preview pins at the opposite LIVE edge,
   the release commits exactly the preview; keyboard keeps the R14
   drag-along ordering law verbatim). */

import { describe, expect, it, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
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

/* D-F1 → A3-R7: the band mount — the deliver head-stack shape (ruler
 * UNCONDITIONAL + band below; the lanes beneath are the same frozen strip) */
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

  /* R23-FIX (review-sweep R3-P3#8): the clip click is PAGE-AWARE — 'grade'
     retargeting is the COLOR page's law; every other page gets honest
     selection-only with a 'select clip' label (the old copy claimed "set
     grade target" on pages that have no grade surface — a lying label). The
     AppShell passes 'select' on every non-color page. */
  it('R23-FIX R3-P3#8: clipClick="select" — plain selection, honest labels (no grade-surface copy)', () => {
    setStore({ page: 'edit', selection: [], colorGradeTarget: 'timeline' });
    render(<TimelineCompact clipClick="select" />);
    expect(screen.getByTestId('shell-timeline-compact')).toHaveAttribute('aria-label', 'Compact timeline (frozen — click a clip to select it)');
    const clip = screen.getByTestId('shell-timeline-compact-clip-el-1');
    expect(clip).toHaveAttribute('aria-label', 'A012_C034_beach_wide — select clip'); // honest copy, no grade-surface claim
    fireEvent.click(clip);
    expect(S().selection).toEqual(['el-1']);
    expect(S().colorGradeTarget).toBe('timeline'); // NEVER re-targeted off the color page
  });

  it('the playhead marker rides the strip at the store playhead (read-only) — UNDER the sticky badge chrome (F3 P3-3, R24-W5d)', () => {
    const { container } = mount({ playhead: 4 });
    // the marker is the w-px absolute with the accent background
    const marker = container.querySelector('[data-testid="shell-timeline-compact"] .pointer-events-none.absolute.w-px');
    expect(marker).toBeTruthy();
    // R24-W5d: z-[3] painted OVER the sticky badge column (z-[2]) — the badge
    // chrome wins now (z-[1], still above the lane clips)
    expect(marker?.className).toContain('z-[1]');
    expect(marker?.className).not.toContain('z-[3]');
    // the badge cells keep their higher chrome layer (the badge column + the
    // per-lane badge cells — the sticky surface the playhead must not cover)
    const badges = container.querySelectorAll('[data-testid^="shell-timeline-compact-track-"]');
    expect(badges.length).toBeGreaterThan(0);
    for (const b of badges) {
      const cell = (b as HTMLElement).closest('.sticky');
      expect(cell?.className).toContain('z-[2]');
    }
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

/* ---------- R23-WF (D-F1, #107) → R24-W4 (A3-R7, #71): the deliver band ----------
   Fixture: loop {2, 28}, sc-1 duration 30 s, 46 pps, playhead 16 (the same
   grid the Ruler bracket pins ride). The band's drag grammar is the
   ruling-21 clone (local preview + ONE commit); its preview clamp is the
   F3 P3-2 honest law; its paint is the A3-R7 state-independent grammar. */
describe('R23-WF (D-F1) → R24-W4 (A3-R7, #71) — the coexistence head stack: ruler + band', () => {
  const inH = () => screen.getByTestId('shell-deliver-range-band-in');
  const outH = () => screen.getByTestId('shell-deliver-range-band-out');

  it('A3-R7: the 22px ruler is UNCONDITIONAL + the 32px band mounts BELOW it — the 54px head stack', () => {
    mountBand();
    const band = screen.getByTestId('shell-deliver-range-band');
    const ruler = screen.getByTestId('shell-timeline-compact-ruler');
    expect(band).toBeInTheDocument();
    expect(band.style.height).toBe('32px');
    expect(ruler.style.height).toBe('22px');
    // the band is the ruler's NEXT sibling — BELOW it in the stack (54px total)
    expect(band.previousElementSibling).toBe(ruler);
    // the ruler's read-only in/out FLAGS ride the coexistence mount too
    expect(screen.getByTestId('shell-timeline-compact-flag-in')).toBeInTheDocument();
    expect(screen.getByTestId('shell-timeline-compact-flag-out')).toBeInTheDocument();
    // the lanes beneath are the SAME frozen strip (the coexistence is head-stack only)
    expect(screen.getByTestId('shell-timeline-compact-clip-el-1')).toBeInTheDocument();
  });

  it("A3-R7: the ruler's read-only in/out bracket FLAGS — thin glyphs at the loop edges, pointer-events-none (the loop seam in miniature)", () => {
    mount();
    const fin = screen.getByTestId('shell-timeline-compact-flag-in');
    const fout = screen.getByTestId('shell-timeline-compact-flag-out');
    // read-only by law: the flags never take a pointer (the band below on
    // deliver / the Ruler brackets elsewhere are the interactive writers).
    // SVG className is an SVGAnimatedString in jsdom — read the attribute.
    expect(fin.getAttribute('class')).toContain('pointer-events-none');
    expect(fout.getAttribute('class')).toContain('pointer-events-none');
    // geometry at the 46 pps fixture (loop {2, 28}): in at the edge, out
    // anchored INSIDE the loop span (the Ruler bracket glyph's anchor law)
    expect(fin.style.left).toBe('92px');    // 2 s × 46
    expect(fout.style.left).toBe('1280px'); // 28 s × 46 − 8
    // they MOVE with the loop seam (one seam, every readout follows) — the
    // store write is act-wrapped so the subscribed strip re-renders now
    act(() => { setStore({ loop: { start: 5, end: 20 } }); });
    expect(screen.getByTestId('shell-timeline-compact-flag-in').style.left).toBe('230px');
    expect(screen.getByTestId('shell-timeline-compact-flag-out').style.left).toBe('912px');
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
    // A3-R7: the fill is the SOLID accent tint — no opacity dim survives
    // (the R23 loop-dim wash is dead on the band; the next test pins the law)
    expect(fill.style.opacity).toBe('');
  });

  it('A3-R7: the fill grammar is STATE-INDEPENDENT — the R23 loop-dim wash is dead on the band', () => {
    const fillBg = () => screen.getByTestId('shell-deliver-range-band-fill').style.background;
    const first = mountBand();
    expect(fillBg()).toBe('color-mix(in srgb, var(--accent-selection) 30%, var(--bg-shell))');
    first.unmount();
    mountBand({ loopEnabled: true }); // loop playback ON — the band reads IDENTICALLY
    expect(fillBg()).toBe('color-mix(in srgb, var(--accent-selection) 30%, var(--bg-shell))');
    // the live TC readout rides the fill
    expect(screen.getByTestId('shell-deliver-range-band-tcs')).toHaveTextContent('00:00:02:00 → 00:00:28:00');
  });

  it('A3-R7: the ~40% dark mask OUTSIDE in→out — two strips (left of in + right of out)', () => {
    mountBand();
    const ml = screen.getByTestId('shell-deliver-range-band-mask-l');
    const mr = screen.getByTestId('shell-deliver-range-band-mask-r');
    expect(ml.style.background).toBe('rgba(0, 0, 0, 0.4)');
    expect(mr.style.background).toBe('rgba(0, 0, 0, 0.4)');
    // geometry at 46 pps, loop {2, 28}: [0, 92] + [1288, → the area's right edge]
    expect(ml.style.left).toBe('0px');
    expect(ml.style.width).toBe('92px');
    expect(mr.style.left).toBe('1288px');
    expect(mr.style.right).toBe('0px');
    // the mask never steals the band's hits
    expect(ml.className).toContain('pointer-events-none');
    expect(mr.className).toContain('pointer-events-none');
  });

  it('A3-R7: the fill carries the 1px 65%-accent top/bottom edges', () => {
    mountBand();
    const fill = screen.getByTestId('shell-deliver-range-band-fill');
    expect(fill.style.borderTop).toBe('1px solid color-mix(in srgb, var(--accent-selection) 65%, transparent)');
    expect(fill.style.borderBottom).toBe('1px solid color-mix(in srgb, var(--accent-selection) 65%, transparent)');
  });

  it('A3-R7 hover-brighten: 60%-accent rest stroke → full accent + the 18% tint wash (and back)', () => {
    mountBand();
    const handle = inH();
    const glyph = handle.querySelector('path')!;
    expect(glyph.getAttribute('stroke')).toBe('color-mix(in srgb, var(--accent-selection) 60%, transparent)');
    expect(handle.style.background).toBe(''); // no wash at rest
    fireEvent.pointerEnter(handle);
    expect(glyph.getAttribute('stroke')).toBe('var(--accent-selection)');
    expect(handle.style.background).toBe('color-mix(in srgb, var(--accent-selection) 18%, transparent)');
    fireEvent.pointerLeave(handle);
    expect(glyph.getAttribute('stroke')).toBe('color-mix(in srgb, var(--accent-selection) 60%, transparent)');
    expect(handle.style.background).toBe('');
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
    // the OUT handle: the domain cap (30 s) is the ONLY binding limit here
    // (the opposite-edge clamp is a floor on the out side — 30 > live in 2)
    fireEvent.pointerDown(outH(), { pointerId: 3, button: 0 });
    fireEvent.pointerMove(outH(), { pointerId: 3, buttons: 1, clientX: 9999 });
    expect(outH()).toHaveAttribute('aria-valuenow', '720'); // live preview clamped to 30 s
    fireEvent.pointerUp(outH(), { pointerId: 3 });
    expect(S().loop).toEqual({ start: 2, end: 30 }); // the domain cap; in edge untouched
  });

  /* F3 P3-2 (R24-W4 item 5): the R23 defect — the drag preview CROSSED the
   * far edge (readout "00:00:29:19 → 00:00:28:00", handles swapped) and the
   * release then dragged the far edge along. Both halves die here: the
   * preview PINS at the opposite LIVE edge, and the release commits exactly
   * what the readout showed. */
  it('F3 P3-2: dragging IN past the LIVE out PINS the preview at out — the release commits exactly the preview (no crossed readout, no drag-along)', () => {
    mountBand();
    fireEvent.pointerDown(inH(), { pointerId: 2, button: 0 });
    fireEvent.pointerMove(inH(), { pointerId: 2, buttons: 1, clientX: 1380 }); // 30 s > live out 28
    // the PREVIEW pins at the live out — the readout never crosses itself
    expect(inH()).toHaveAttribute('aria-valuenow', '672');
    expect(screen.getByTestId('shell-deliver-range-band-tcs')).toHaveTextContent('00:00:28:00 → 00:00:28:00');
    fireEvent.pointerUp(inH(), { pointerId: 2 });
    expect(S().loop).toEqual({ start: 28, end: 28 }); // EXACTLY the previewed value
  });

  it('F3 P3-2: dragging OUT past the LIVE in pins the preview at in — release commits exactly the preview', () => {
    mountBand();
    fireEvent.pointerDown(outH(), { pointerId: 3, button: 0 });
    fireEvent.pointerMove(outH(), { pointerId: 3, buttons: 1, clientX: 46 }); // 1 s < live in 2
    expect(outH()).toHaveAttribute('aria-valuenow', '48');
    expect(screen.getByTestId('shell-deliver-range-band-tcs')).toHaveTextContent('00:00:02:00 → 00:00:02:00');
    fireEvent.pointerUp(outH(), { pointerId: 3 });
    expect(S().loop).toEqual({ start: 2, end: 2 }); // pinned at the live in — never crossed
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

  /* F3 P3-2's twin law: the KEYBOARD path keeps the R14 ordering law
   * VERBATIM — the far edge drags along (the mouse path's honest clamp is a
   * pointer-only grammar; keyboard steps stay single-frame intents). */
  it('Home/End jump the edges; the keyboard ordering law holds from the band too (R14 drag-along, verbatim)', () => {
    mountBand();
    fireEvent.keyDown(outH(), { key: 'ArrowLeft' });
    expect(S().loop.end).toBeCloseTo(28 - 1 / 24, 5);
    fireEvent.keyDown(inH(), { key: 'End' }); // in → 30 s: out must be dragged along
    expect(S().loop).toEqual({ start: 30, end: 30 });
    fireEvent.keyDown(outH(), { key: 'Home' }); // out → 0 s: in pulled down with it
    expect(S().loop).toEqual({ start: 0, end: 0 });
  });
});
