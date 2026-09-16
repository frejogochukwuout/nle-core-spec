/* RangeBand — R23-WF (DESIGN-R23 D-F1, issue #107) → R24-W4 (DESIGN-R24
   A3-R7, issue #71): the deliver page's 32px interactive in/out range band.
   R24-W4 COEXISTENCE: the band mounts BELOW the 22px read-only ruler in
   TimelineCompact's head stack (54px total) — the ruler is UNCONDITIONAL on
   every page now ("under export view timeline is compacted but there's no
   ruler and no range clamp which is like the BIGGEST if not the only thing
   we need here": the ruler answered the "no ruler" half, this band the "no
   range clamp" half; the R23-WF ruler-replacement is dead).
   THE RANGE IS THE LOOP SEAM: the export range = s.loop's in/out (spec 16
   §3.4, th_mto37ba3 — the deliver inspector's range block and its In→Out
   select read the same fields), so this band, the full Ruler's brackets,
   and markIn/markOut are THREE writers of ONE seam; every readout follows
   every writer. The honest triple-source risk is registered at store
   level (the markIn comment + the R14 ordering-law sweep pin in
   useUiStore.test); the band's own clone is pinned in TimelineCompact.test.

   Drag grammar (Part IX ruling 21 — the drag-law freeze): LOCAL preview
   state during the gesture (NO store writes mid-drag), ONE commit on the
   release (a no-op release writes nothing), pointercancel /
   lostpointercapture DISCARD, each keyboard step = one commit; no
   preview/escape machinery.

   F3 P3-2 (R24-W4 item 5 — the HONEST PREVIEW CLAMP): the mouse drag
   preview clamps against the OPPOSITE LIVE edge — dragging IN past the
   live out PINS the preview at out; dragging OUT past the live in pins it
   at in — and the RELEASE COMMITS EXACTLY THE PREVIEWED VALUE. The R23
   defect (the preview crossed the far edge — readout "00:00:29:19 →
   00:00:28:00" with swapped handles — then the release dragged the far
   edge along) is dead: what the readout shows on the last move is what the
   release writes. The KEYBOARD path keeps the R14 ordering law VERBATIM
   (the far edge drags along — never inverted; an inverted loop pegs the
   playback tick, the R13 hang). Both writers clamp to [0, duration] — an
   export range cannot exceed the timeline.

   Band grammar (A3-R7, state-independent): solid accent-tint fill (30%
   into the strip's base color) + 1px top/bottom edges (65% accent); a
   ~40% dark mask OUTSIDE in→out (two strips, left of in + right of out);
   12px full-height bracket handles with 3 grip ticks + cursor-ew-resize +
   hover-brighten (60%-accent rest stroke → full accent + an 18% tint
   wash); a live TC readout in the fill; keyboard sliders (±1 frame /
   Shift ×10 / Home-End). The R23 loop-dim wash law (the fill dims to 0.13
   while loop playback is off) is DELIBERATELY DEAD here: the export range
   is a range, not a playback affordance — it reads identically at every
   playback state (documented state-independent grammar). */

import { useRef, useState } from 'react';
import { useUi } from '../../state/useUiStore';
import { snapToFrame, tc } from '../../lib/timecode';
import { snapPxToDeviceGrid } from '../../lib/pixel';

/* D-F1 geometry: 32px band ("normal height" head row), 12px bracket hit
   zones (the R20-W5 width), 30px badge corner (the compact strip's own
   head column — the band never widens the strip's chrome). */
const BAND_H = 32;
const HANDLE_W = 12;
const BADGE_W = 30;

/* A3-R7's exact accent recipe:
   - fill: 30% accent INTO the strip's base color (the time area's own
     var(--bg-shell)) — a solid tint, not the R23 opacity wash;
   - edges: 65% accent, 1px, top + bottom of the fill;
   - mask: ~40% dark over everything OUTSIDE in→out;
   - handles: 60%-accent rest stroke → full accent on hover + an 18% tint
     wash on the hit box (hover-brighten). */
const FILL_BG = 'color-mix(in srgb, var(--accent-selection) 30%, var(--bg-shell))';
const FILL_EDGE = 'color-mix(in srgb, var(--accent-selection) 65%, transparent)';
const MASK_BG = 'rgba(0, 0, 0, 0.4)';
const STROKE_REST = 'color-mix(in srgb, var(--accent-selection) 60%, transparent)';
const STROKE_HOT = 'var(--accent-selection)';
const HOVER_WASH = 'color-mix(in srgb, var(--accent-selection) 18%, transparent)';

export function RangeBand({ duration, pps }: { duration: number; pps: number }) {
  const loop = useUi((s) => s.loop);
  /* the x→time domain is the TIME AREA (right of the sticky badge corner);
     jsdom's zero rects resolve clientX against left 0, same pinnability as
     the Ruler's bracket drags */
  const ref = useRef<HTMLDivElement>(null);
  /* ruling 21: LOCAL preview state — the store sees ONE write per gesture */
  const [bandDrag, setBandDrag] = useState<{ side: 'in' | 'out'; t: number } | null>(null);
  /* hover-brighten: the hovered handle's glyph goes full accent + an 18%
     tint wash on the hit box (60%-accent rest stroke otherwise) */
  const [hoverSide, setHoverSide] = useState<'in' | 'out' | null>(null);
  const inLive = bandDrag?.side === 'in' ? bandDrag.t : loop.start;
  const outLive = bandDrag?.side === 'out' ? bandDrag.t : loop.end;

  /* the KEYBOARD commit — the R14 ordering law VERBATIM (Ruler's
     applyBracket / markIn / markOut: start <= end ALWAYS; writing an edge
     past the other DRAGS the far edge along, never inverts the window). */
  const commitKeyboard = (side: 'in' | 'out', t: number) => {
    const v = Math.max(0, Math.min(snapToFrame(t), duration));
    useUi.setState((s) =>
      side === 'in'
        ? { loop: { ...s.loop, start: v, end: Math.max(s.loop.end, v) } }
        : { loop: { ...s.loop, end: v, start: Math.min(s.loop.start, v) } },
    );
  };

  /* the MOUSE release commit (F3 P3-2): commits EXACTLY THE PREVIEWED VALUE.
     The preview already clamped against the opposite LIVE edge (and the
     [0, duration] domain), so the window can never invert and the committed
     readout is the one the user saw on the last move — no drag-along, no
     crossed handles. (The keyboard path above keeps the drag-along law.) */
  const commitPreview = (side: 'in' | 'out', t: number) => {
    const v = Math.max(0, Math.min(snapToFrame(t), duration));
    useUi.setState((s) => (side === 'in' ? { loop: { ...s.loop, start: v } } : { loop: { ...s.loop, end: v } }));
  };

  const bandHandlers = (side: 'in' | 'out') => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation(); // the strip's own surfaces must not see the press
      (e.currentTarget as HTMLElement).focus();
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* inactive pointer id (R15-V2 P3 guard) */ }
      setBandDrag({ side, t: side === 'in' ? loop.start : loop.end });
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (bandDrag?.side !== side || e.buttons !== 1) return;
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      /* frame-grid discipline (R13) + the [0, duration] domain clamp, THEN
         the F3 P3-2 honest clamp against the OPPOSITE LIVE edge (the store
         value — only one edge ever previews at a time): the preview PINS
         there instead of crossing it, so the readout never inverts mid-drag */
      const raw = Math.max(0, Math.min(snapToFrame((e.clientX - box.left) / pps), duration));
      const t = side === 'in' ? Math.min(raw, loop.end) : Math.max(raw, loop.start);
      setBandDrag({ side, t });
    },
    onPointerUp: () => {
      if (bandDrag?.side !== side) return;
      const t = bandDrag.t;
      setBandDrag(null);
      const cur = side === 'in' ? loop.start : loop.end;
      if (t === cur) return; // no-op release (plain click) — no store write
      commitPreview(side, t); // ONE commit per gesture (ruling 21)
    },
    onPointerCancel: () => { if (bandDrag?.side === side) setBandDrag(null); },
    onLostPointerCapture: () => { if (bandDrag?.side === side) setBandDrag(null); },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        const frames = (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 10 : 1);
        commitKeyboard(side, (side === 'in' ? loop.start : loop.end) + frames / 24);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        e.stopPropagation();
        commitKeyboard(side, e.key === 'Home' ? 0 : duration);
      }
    },
  });

  const fillLeft = snapPxToDeviceGrid(inLive * pps);
  const fillW = Math.max(2, snapPxToDeviceGrid((outLive - inLive) * pps));
  /* R20-W5 anchors: handles sit INSIDE the region (in at the left edge, out
     at the right edge − 12), defensively clamped into the time area */
  const maxHandleX = Math.max(0, duration * pps - HANDLE_W);
  const inX = Math.max(0, Math.min(fillLeft, maxHandleX));
  const outX = Math.max(0, Math.min(fillLeft + fillW - HANDLE_W, maxHandleX));

  return (
    <div
      data-testid="shell-deliver-range-band"
      role="group"
      aria-label="Export range (in/out) band"
      className="sticky left-0 flex"
      style={{ height: BAND_H }}
    >
      {/* head corner — the strip's 30px badge column stays sticky over the
          horizontal scroll; "I/O" names the row (the handles carry the real
          slider semantics below) */}
      <div className="sticky left-0 z-[2] shrink-0 border-r border-hairline bg-panel" style={{ width: BADGE_W, height: BAND_H }}>
        <div className="flex h-full w-full items-center justify-center">
          <span aria-hidden className="mono text-[9px] font-semibold leading-none text-tmuted">I/O</span>
        </div>
      </div>
      {/* the time area — the mask, fill + full-height bracket handles live here */}
      <div ref={ref} className="relative flex-1" style={{ height: BAND_H, background: 'var(--bg-shell)' }}>
        {/* the ~40% dark mask OUTSIDE in→out — two strips (left of in +
            right of out); the band grammar's "not selected" shading */}
        <div
          data-testid="shell-deliver-range-band-mask-l"
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 top-0"
          style={{ left: 0, width: fillLeft, background: MASK_BG }}
        />
        <div
          data-testid="shell-deliver-range-band-mask-r"
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 top-0"
          style={{ left: fillLeft + fillW, right: 0, background: MASK_BG }}
        />
        {/* the range fill — the A3-R7 state-independent grammar: a SOLID
            accent tint (30% into the strip base) with 1px 65%-accent
            top/bottom edges. The R23 loop-dim opacity wash is dead here
            (the band is a range, not a playback affordance) */}
        <div
          data-testid="shell-deliver-range-band-fill"
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 top-0"
          style={{ left: fillLeft, width: fillW, background: FILL_BG, borderTop: `1px solid ${FILL_EDGE}`, borderBottom: `1px solid ${FILL_EDGE}` }}
        />
        {/* the live in→out TC readout — follows the LOCAL preview during a
            drag (the store only sees the release commit); with the F3 P3-2
            clamp the readout never crosses itself mid-gesture */}
        <div
          data-testid="shell-deliver-range-band-tcs"
          className="pointer-events-none absolute bottom-0 top-0 flex items-center justify-center overflow-hidden"
          style={{ left: fillLeft, width: fillW }}
        >
          <span className="mono whitespace-nowrap text-[9px] text-tmuted">{tc(inLive)} → {tc(outLive)}</span>
        </div>
        {/* in bracket — full-height 12px handle anchored INSIDE the region
            (R20-W5 grammar; R23-WE D-E1 thin glyph: 1px stroke, 60% accent —
            the handle box is the unchanged hit target; A3-R7
            hover-brighten: full accent + the 18% tint wash) */}
        <div
          {...bandHandlers('in')}
          onPointerEnter={() => setHoverSide('in')}
          onPointerLeave={() => setHoverSide((h) => (h === 'in' ? null : h))}
          role="slider"
          aria-label="Export range in point"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration * 24)}
          aria-valuenow={Math.round(inLive * 24)}
          aria-valuetext={tc(inLive)}
          tabIndex={0}
          data-testid="shell-deliver-range-band-in"
          data-tip={`In ${tc(inLive)}`}
          className="pointer-events-auto absolute z-[7] flex cursor-ew-resize items-center"
          style={{ left: inX, top: 0, width: HANDLE_W, height: BAND_H, background: hoverSide === 'in' ? HOVER_WASH : undefined }}
        >
          <svg className="pointer-events-none" width="8" height={BAND_H - 2} aria-hidden="true">
            {/* open "[" whose stem rides the region edge + 3 grip ticks at
                25/50/75% — all y coords derive from this svg's own height */}
            <path
              d={`M7 1 L2 1 L2 ${BAND_H - 3} L7 ${BAND_H - 3} M4 ${(BAND_H - 2) * 0.25 + 1} L7 ${(BAND_H - 2) * 0.25 + 1} M4 ${(BAND_H - 2) * 0.5 + 1} L7 ${(BAND_H - 2) * 0.5 + 1} M4 ${(BAND_H - 2) * 0.75 + 1} L7 ${(BAND_H - 2) * 0.75 + 1}`}
              stroke={hoverSide === 'in' ? STROKE_HOT : STROKE_REST}
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>
        {/* out bracket — the mirrored "]" at the region's right edge, same
            full-band geometry + thin-glyph + hover-brighten laws */}
        <div
          {...bandHandlers('out')}
          onPointerEnter={() => setHoverSide('out')}
          onPointerLeave={() => setHoverSide((h) => (h === 'out' ? null : h))}
          role="slider"
          aria-label="Export range out point"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration * 24)}
          aria-valuenow={Math.round(outLive * 24)}
          aria-valuetext={tc(outLive)}
          tabIndex={0}
          data-testid="shell-deliver-range-band-out"
          data-tip={`Out ${tc(outLive)}`}
          className="pointer-events-auto absolute z-[7] flex cursor-ew-resize items-center"
          style={{ left: outX, top: 0, width: HANDLE_W, height: BAND_H, background: hoverSide === 'out' ? HOVER_WASH : undefined }}
        >
          <svg className="pointer-events-none" width="8" height={BAND_H - 2} aria-hidden="true" style={{ position: 'absolute', right: 0 }}>
            <path
              d={`M1 1 L6 1 L6 ${BAND_H - 3} L1 ${BAND_H - 3} M1 ${(BAND_H - 2) * 0.25 + 1} L4 ${(BAND_H - 2) * 0.25 + 1} M1 ${(BAND_H - 2) * 0.5 + 1} L4 ${(BAND_H - 2) * 0.5 + 1} M1 ${(BAND_H - 2) * 0.75 + 1} L4 ${(BAND_H - 2) * 0.75 + 1}`}
              stroke={hoverSide === 'out' ? STROKE_HOT : STROKE_REST}
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
