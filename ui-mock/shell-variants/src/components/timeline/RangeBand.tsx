/* RangeBand — R23-WF (DESIGN-R23 D-F1, issue #107): the deliver page's 32px
   interactive in/out range band, the head row TimelineCompact mounts IN
   PLACE of its read-only 22px ruler on deliver ("use block (compact)
   timeline style … just the head range selection should be normal height
   as that's an important part to work with" — the lanes below stay
   16–24px frozen; only the head row grows).
   THE RANGE IS THE LOOP SEAM: the export range = s.loop's in/out (spec 16
   §3.4, th_mto37ba3 — the deliver inspector's range block and its In→Out
   select read the same fields), so this band, the full Ruler's brackets,
   and markIn/markOut are THREE writers of ONE seam; every readout follows
   every writer. The honest triple-source risk is registered at store
   level (the markIn comment + the R14 ordering-law sweep pin in
   useUiStore.test); the band's own clone is pinned in TimelineCompact.test.
   Drag grammar (Part IX ruling 21 — the drag-law freeze): cloned verbatim
   from the Ruler brackets / the fade-object clamp-commit law — LOCAL
   preview state during the gesture (NO store writes mid-drag), ONE commit
   on the release (a no-op release writes nothing), pointercancel /
   lostpointercapture DISCARD, each keyboard step = one commit; no
   preview/escape machinery. The ordering law (R14, carried by the commit
   formula — identical to markIn/markOut and Ruler's applyBracket):
   start <= end ALWAYS; writing an edge past the other DRAGS the far edge
   along, never inverts the window (an inverted loop pegs the playback
   tick, the R13 hang). The band's ONE addition over the Ruler clone: the
   domain clamps to [0, duration] — an export range cannot exceed the
   timeline.
   Visual grammar: R20-W5 full-band bracket handles (12px hit zones
   anchored INSIDE the region, full band height) with R23-WE D-E1 thin
   glyphs (1px stroke, 60% accent — hit target ≠ visual size, the art
   thins, the grab zone never does); the fill dims (not erases) when loop
   playback is off, same law as the Ruler's loop band. */

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

export function RangeBand({ duration, pps }: { duration: number; pps: number }) {
  const loop = useUi((s) => s.loop);
  const loopEnabled = useUi((s) => s.loopEnabled);
  /* the x→time domain is the TIME AREA (right of the sticky badge corner);
     jsdom's zero rects resolve clientX against left 0, same pinnability as
     the Ruler's bracket drags */
  const ref = useRef<HTMLDivElement>(null);
  /* ruling 21: LOCAL preview state — the store sees ONE write per gesture */
  const [bandDrag, setBandDrag] = useState<{ side: 'in' | 'out'; t: number } | null>(null);
  const inLive = bandDrag?.side === 'in' ? bandDrag.t : loop.start;
  const outLive = bandDrag?.side === 'out' ? bandDrag.t : loop.end;

  /* the ordering-law commit — the SAME max/min formula as Ruler's
     applyBracket and markIn/markOut (in drags out along, out drags in
     along, never inverted). NOT a verbatim clone of the Ruler's gesture:
     the Ruler writes the store LIVE on every pointermove; this band keeps
     ruling-21 LOCAL preview state and commits ONCE per gesture. Both
     writers clamp to [0, duration] (the band always did — an export range
     cannot exceed the timeline; the Ruler gained the same upper cap in
     R23-FIX R3-P3#9, so the three-writer seam finally agrees). */
  const commitBand = (side: 'in' | 'out', t: number) => {
    const v = Math.max(0, Math.min(snapToFrame(t), duration));
    useUi.setState((s) =>
      side === 'in'
        ? { loop: { ...s.loop, start: v, end: Math.max(s.loop.end, v) } }
        : { loop: { ...s.loop, end: v, start: Math.min(s.loop.start, v) } },
    );
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
      /* frame-grid discipline (R13) + the [0, duration] domain clamp */
      setBandDrag({ side, t: Math.max(0, Math.min(snapToFrame((e.clientX - box.left) / pps), duration)) });
    },
    onPointerUp: () => {
      if (bandDrag?.side !== side) return;
      const t = bandDrag.t;
      setBandDrag(null);
      const cur = side === 'in' ? loop.start : loop.end;
      if (t === cur) return; // no-op release (plain click) — no store write
      commitBand(side, t); // ONE commit per gesture (ruling 21)
    },
    onPointerCancel: () => { if (bandDrag?.side === side) setBandDrag(null); },
    onLostPointerCapture: () => { if (bandDrag?.side === side) setBandDrag(null); },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        const frames = (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 10 : 1);
        commitBand(side, (side === 'in' ? loop.start : loop.end) + frames / 24);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        e.stopPropagation();
        commitBand(side, e.key === 'Home' ? 0 : duration);
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
      {/* the time area — the fill + the full-height bracket handles live here */}
      <div ref={ref} className="relative flex-1" style={{ height: BAND_H, background: 'var(--bg-shell)' }}>
        {/* the range fill — the Ruler loop band's dim law (dimmed, not erased) */}
        <div
          data-testid="shell-deliver-range-band-fill"
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 top-0"
          style={{ left: fillLeft, width: fillW, background: 'var(--accent-selection)', opacity: loopEnabled ? 0.24 : 0.13 }}
        />
        {/* the live in→out TC readout — follows the LOCAL preview during a
            drag (the store only sees the release commit) */}
        <div
          data-testid="shell-deliver-range-band-tcs"
          className="pointer-events-none absolute bottom-0 top-0 flex items-center justify-center overflow-hidden"
          style={{ left: fillLeft, width: fillW }}
        >
          <span className="mono whitespace-nowrap text-[9px] text-tmuted">{tc(inLive)} → {tc(outLive)}</span>
        </div>
        {/* in bracket — full-height 12px handle anchored INSIDE the region
            (R20-W5 grammar; R23-WE D-E1 thin glyph: 1px stroke, 60% accent —
            the handle box is the unchanged hit target) */}
        <div
          {...bandHandlers('in')}
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
          style={{ left: inX, top: 0, width: HANDLE_W, height: BAND_H }}
        >
          <svg className="pointer-events-none" width="8" height={BAND_H - 2} aria-hidden="true">
            {/* open "[" whose stem rides the region edge + 3 grip ticks at
                25/50/75% — all y coords derive from this svg's own height */}
            <path
              d={`M7 1 L2 1 L2 ${BAND_H - 3} L7 ${BAND_H - 3} M4 ${(BAND_H - 2) * 0.25 + 1} L7 ${(BAND_H - 2) * 0.25 + 1} M4 ${(BAND_H - 2) * 0.5 + 1} L7 ${(BAND_H - 2) * 0.5 + 1} M4 ${(BAND_H - 2) * 0.75 + 1} L7 ${(BAND_H - 2) * 0.75 + 1}`}
              stroke="color-mix(in srgb, var(--accent-selection) 60%, transparent)"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>
        {/* out bracket — the mirrored "]" at the region's right edge, same
            full-band geometry + thin-glyph law */}
        <div
          {...bandHandlers('out')}
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
          style={{ left: outX, top: 0, width: HANDLE_W, height: BAND_H }}
        >
          <svg className="pointer-events-none" width="8" height={BAND_H - 2} aria-hidden="true" style={{ position: 'absolute', right: 0 }}>
            <path
              d={`M1 1 L6 1 L6 ${BAND_H - 3} L1 ${BAND_H - 3} M1 ${(BAND_H - 2) * 0.25 + 1} L4 ${(BAND_H - 2) * 0.25 + 1} M1 ${(BAND_H - 2) * 0.5 + 1} L4 ${(BAND_H - 2) * 0.5 + 1} M1 ${(BAND_H - 2) * 0.75 + 1} L4 ${(BAND_H - 2) * 0.75 + 1}`}
              stroke="color-mix(in srgb, var(--accent-selection) 60%, transparent)"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
