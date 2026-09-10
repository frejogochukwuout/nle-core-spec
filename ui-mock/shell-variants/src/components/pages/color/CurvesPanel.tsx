/* CurvesPanel — R20-W4b (gap C55, spec 08 §5) → R24-W2 (DESIGN-R24 §1.2
   A2-R4, issue #69 — the YRGB REBUILD). The reference DOM has NO curves
   editor (grep-verified, A2) so the panel is rebuilt from Resolve
   research: "the default 'custom' curves let you adjust red, green, blue
   and luminance curves independently, while displaying a live histogram"
   (BMD; the histogram overlay arrived with Resolve 16, jayaretv).

   THE REBUILD (all A2-R4 rulings):
     - [Y|R|G|B] radiogroup with arrow roving — the channel being edited;
       every point/handle/commit below is scoped to it (curveMath's
       CurveChannels + the tagged storage seam, see curveMath's header);
     - a ~64-bin CHANNEL histogram BEHIND the grid, derived from the
       gradedFrameBus's CURRENT frame at the family's 10fps throttle
       (r/g/b reuse scopesMath.histogram's channel tracks; y is the
       BT.601 luma track — the scopes' own luma law);
     - 25% grid + a center crosshair; a SOLID 25%-white diagonal reference
       line (the old dashed diagonal dies);
     - 10px white handles with a 1.5px dark ring + an accent ring on
       hover/active;
     - SINGLE-CLICK inserts a point on the active channel; a click inside
       the 8% near-band of an existing handle SNAPS to that handle
       instead (focus, no insert, no commit);
     - Delete key OR right-click removes an interior point (endpoints
       immutable);
     - the readout row + footer are DELETED; square aspect, max-w-[360px];
     - the D3 gesture law (the house Fader/Knob pattern: pointer capture,
       a transient drag buffer, ONE undoable setGrade at pointer-up /
       lost-pointercapture — never per-move writes).

   STORE-DRIVEN: the points live in the grade record's `curves` extension
   (MockGrade.curves = CurveSet — the tagged four-channel storage the
   frozen store round-trips). NO local useState for the curve values.
   Commits go through the SAME rec.setGrade seam as every grading surface
   (the D3 law). Endpoints are permanent and move in Y only (per channel);
   interior points cannot cross neighbors. gradedFrame.bakeLinearCurveLuts
   composes the four 256-entry LUTs in the viewer (y∘r / y∘g / y∘b). */

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import { useGradeRecord } from './useGradeTarget';
import { useGradingToast } from './useHonestToast';
import { getGradedFrame, subscribeGradedFrame, type GradedFrame } from './gradedFrameBus';
import { histogram, luma601 } from '../../../lib/color';
import {
  channelCurve,
  curvePathD,
  insertCurvePointOnChannel,
  moveCurvePoint,
  nearestCurvePoint,
  removeCurvePoint,
  withChannelCurve,
  type CurveChannel,
  type CurvePoint,
} from './curveMath';

const GRID_STEPS = [0, 25, 50, 75, 100];

/* A2-R4: the ~64-bin histogram + the family's 10fps throttle (spec 08
   §11.4 — the ScopesDock cadence; a frame arriving inside the window is
   deferred latest-wins) */
const HISTOGRAM_BINS = 64;
const HISTOGRAM_THROTTLE_MS = 100;
/* the 8% near-band: a click inside it snaps to the nearest handle instead
   of inserting a point */
const NEAR_BAND = 0.08;

const CHANNELS: { id: CurveChannel; label: string; a11y: string }[] = [
  { id: 'y', label: 'Y', a11y: 'Luma curve' },
  { id: 'r', label: 'R', a11y: 'Red curve' },
  { id: 'g', label: 'G', a11y: 'Green curve' },
  { id: 'b', label: 'B', a11y: 'Blue curve' },
];

export interface ChannelHistogram {
  bins: number[];
  max: number;
}

/** The active channel's ~64-bin histogram from a graded display frame —
 *  r/g/b REUSE scopesMath.histogram's 256-bin channel tracks (downsampled
 *  ×4); y is the BT.601 luma track. Null when the frame has no mass. */
export function channelHistogramBins(img: ImageData, ch: CurveChannel): ChannelHistogram | null {
  const bins = new Array<number>(HISTOGRAM_BINS).fill(0);
  if (ch === 'y') {
    const { data } = img;
    for (let i = 0; i < data.length; i += 4) {
      const l = luma601(data[i], data[i + 1], data[i + 2]);
      bins[Math.min(HISTOGRAM_BINS - 1, Math.floor((l / 256) * HISTOGRAM_BINS))]++;
    }
  } else {
    const h = histogram(img);
    const src = ch === 'r' ? h.r : ch === 'g' ? h.g : h.b;
    for (let b = 0; b < HISTOGRAM_BINS; b++) {
      bins[b] = src[b * 4] + src[b * 4 + 1] + src[b * 4 + 2] + src[b * 4 + 3];
    }
  }
  const max = bins.reduce((m, v) => Math.max(m, v), 0);
  return max > 0 ? { bins, max } : null;
}

export function CurvesPanel() {
  const rec = useGradeRecord();
  const tell = useGradingToast();
  const boxRef = useRef<HTMLDivElement>(null);
  const handleRefs = useRef<(HTMLDivElement | null)[]>([]);

  /* A2-R4: the channel being edited — panel-local view state (the
     ScopesDock active-tab precedent; the channel never rides a grade
     record or the store). */
  const [ch, setCh] = useState<CurveChannel>('y');

  const [drag, setDrag] = useState<{ index: number; x: number; y: number } | null>(null);

  /* the ~64-bin channel histogram: the BUFFER half of the W4c seam — the
     current graded display frame from gradedFrameBus, recomputed at the
     10fps family throttle. A CHANNEL switch is a view change, not a frame
     arrival — it paints at once (the ScopesDock tab law). */
  const [frame, setFrame] = useState<GradedFrame | null>(() => getGradedFrame());
  useEffect(() => subscribeGradedFrame(setFrame), []);
  const [hist, setHist] = useState<ChannelHistogram | null>(null);
  const lastHistRef = useRef(Number.NEGATIVE_INFINITY);
  useEffect(() => {
    /* a channel switch resets the throttle clock — the newly selected
       histogram must not sit out someone else's window */
    lastHistRef.current = Number.NEGATIVE_INFINITY;
  }, [ch]);
  useEffect(() => {
    if (!frame) return;
    const calc = () => {
      lastHistRef.current = performance.now();
      setHist(channelHistogramBins(frame.imageData, ch));
    };
    const elapsed = performance.now() - lastHistRef.current;
    if (elapsed >= HISTOGRAM_THROTTLE_MS) {
      calc();
      return;
    }
    const t = window.setTimeout(calc, HISTOGRAM_THROTTLE_MS - elapsed);
    return () => window.clearTimeout(t);
  }, [frame, ch]);

  if (rec.targetId == null) {
    return (
      <div data-testid="shell-color-curves" className="flex h-full min-h-0 items-center justify-center bg-panel p-6 text-center">
        <p className="text-[12px] text-tmuted">
          No clip selected — click a clip in the lane strip (or switch the target to Timeline) to curve.
        </p>
      </div>
    );
  }

  const { grade, setGrade } = rec;
  const pts: CurvePoint[] = channelCurve(grade.curves, ch);
  const setChannel = (next: CurvePoint[]) => setGrade({ curves: withChannelCurve(grade.curves, ch, next) });

  /* transient drag → ONE commit at pointer-up / lost-pointercapture */
  const shownPts = drag ? moveCurvePoint(pts, drag.index, drag.x, drag.y) : pts;
  const applyDrag = (clientX: number, clientY: number) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || box.width < 10) return;
    const x = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    const y = Math.min(1, Math.max(0, 1 - (clientY - box.top) / box.height));
    setDrag({ index: drag!.index, x, y });
  };
  const commitDrag = () => {
    if (!drag) return;
    const next = moveCurvePoint(pts, drag.index, drag.x, drag.y);
    const d = drag;
    setDrag(null);
    if (next[d.index].x !== pts[d.index].x || next[d.index].y !== pts[d.index].y) setChannel(next);
  };

  /* A2-R4: SINGLE-CLICK insert on the active channel — but a click inside
     the 8% near-band of an existing handle SNAPS to that handle (focus,
     no insert, no commit) instead of stacking a point next to it. */
  const onBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || box.width < 10) return;
    const x = Math.min(0.98, Math.max(0.02, (e.clientX - box.left) / box.width));
    const near = nearestCurvePoint(pts, x);
    if (Math.abs(pts[near].x - x) <= NEAR_BAND) {
      handleRefs.current[near]?.focus();
      return;
    }
    const { pts: next } = insertCurvePointOnChannel(pts, ch, x);
    tell();
    setChannel(next);
  };

  const keyStep = (e: React.KeyboardEvent) => (e.shiftKey ? 0.05 : 0.01);

  /* the [Y|R|G|B] radiogroup — arrow roving (focus follows selection,
     wrapping — the house radio law) */
  const channelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectChannel = (id: CurveChannel) => setCh(id);
  const onChannelsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = CHANNELS.findIndex((c) => c.id === ch);
    const next = (idx + (e.key === 'ArrowRight' ? 1 : -1) + CHANNELS.length) % CHANNELS.length;
    selectChannel(CHANNELS[next].id);
    channelRefs.current[next]?.focus();
  };

  return (
    <div data-testid="shell-color-curves" className="flex flex-col">
      {/* header row: Curves + the [Y|R|G|B] radiogroup + reset (C55/A2-R4) */}
      <div className="flex h-[32px] shrink-0 items-center gap-2 border-b border-hairline bg-shell px-3">
        <span data-testid="shell-color-curves-title" className="text-[13px] font-bold tracking-wide text-tprimary">
          Curves
        </span>
        <div
          role="radiogroup"
          aria-label="Curve channel"
          data-testid="shell-color-curves-channels"
          className="ml-1 flex items-center gap-0.5"
          onKeyDown={onChannelsKeyDown}
        >
          {CHANNELS.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={ch === c.id}
              aria-label={c.a11y}
              tabIndex={ch === c.id ? 0 : -1}
              data-testid={`shell-color-curves-channel-${c.id}`}
              ref={(el) => { channelRefs.current[i] = el; }}
              onClick={() => selectChannel(c.id)}
              className={`flex h-[20px] min-w-[22px] items-center justify-center rounded-[var(--radius)] border px-1 text-[10px] font-semibold transition-colors ${
                ch === c.id
                  ? 'border-[var(--accent-selection)] bg-[color-mix(in_srgb,var(--accent-selection)_18%,transparent)] text-tprimary'
                  : 'border-transparent text-tmuted hover:text-tprimary'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Reset curve"
          data-tip="Reset the active channel's curve"
          className="icon-btn ml-auto"
          onClick={() => setGrade({ curves: withChannelCurve(grade.curves, ch, []) })}
        >
          <RotateCcw size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="scroll-y flex min-h-0 flex-1 flex-col bg-panel p-4">
        {/* the editor square — histogram + SVG grid under HTML point
            handles. Single-click the background to add a point on the
            active channel (the 8% near-band snaps to the nearest handle);
            drag / arrow-key the handles; Delete or right-click removes
            interior points. */}
        <div
          ref={boxRef}
          data-testid="shell-color-curve-editor"
          className="relative mx-auto w-full max-w-[360px] touch-none"
          style={{ aspectRatio: '1 / 1' }}
          onClick={onBackgroundClick}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
            <rect x="0" y="0" width="100" height="100" fill="#141416" />
            {/* A2-R4: the ~64-bin channel histogram BEHIND the grid (from
                the graded-frame bus at the 10fps throttle; the channel
                selection picks which histogram) */}
            {hist && (
              <g data-testid="shell-color-curve-histogram">
                {hist.bins.map((v, i) =>
                  v > 0 ? (
                    <rect
                      key={i}
                      x={(i * 100) / HISTOGRAM_BINS}
                      y={100 - (v / hist.max) * 100}
                      width={100 / HISTOGRAM_BINS}
                      height={(v / hist.max) * 100}
                      fill="rgba(255,255,255,0.16)"
                    />
                  ) : null,
                )}
              </g>
            )}
            {/* the 25% grid */}
            {GRID_STEPS.map((g) => (
              <g key={g}>
                <line x1={g} y1="0" x2={g} y2="100" stroke="#26262a" strokeWidth="0.4" />
                <line x1="0" y1={g} x2="100" y2={g} stroke="#26262a" strokeWidth="0.4" />
              </g>
            ))}
            {/* the center crosshair */}
            <line x1="50" y1="0" x2="50" y2="100" stroke="#33333a" strokeWidth="0.5" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#33333a" strokeWidth="0.5" />
            {/* A2-R4: the SOLID 25%-white diagonal reference (the dashed
                diagonal died with the rebuild) */}
            <line x1="0" y1="100" x2="100" y2="0" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
            {/* the monotone spline preview of the ACTIVE channel (follows
                the transient drag) */}
            <path d={curvePathD(shownPts)} fill="none" stroke="var(--wheel-ring-arc)" strokeWidth="1.2" />
          </svg>

          {/* point handles — HTML over SVG for real pointer capture + focus.
              10px white discs, 1.5px dark ring, accent ring on hover/active. */}
          {shownPts.map((p, i) => {
            const isEndpoint = i === 0 || i === shownPts.length - 1;
            return (
              <div
                key={i}
                ref={(el) => { handleRefs.current[i] = el; }}
                data-testid={`shell-color-curve-point-${i}`}
                role="slider"
                tabIndex={0}
                aria-label={`Curve point ${i + 1} — ${CHANNELS.find((c) => c.id === ch)!.a11y}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(p.y * 100)}
                aria-valuetext={`${(p.x * 100).toFixed(0)}, ${(p.y * 100).toFixed(0)}`}
                title={isEndpoint ? 'Endpoint — Y only' : 'Drag or arrow-key; Delete or right-click removes'}
                className="absolute z-10 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-[1.5px] border-[#111] bg-white shadow-md transition-shadow hover:ring-2 hover:ring-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:cursor-grabbing active:ring-2 active:ring-[var(--accent)]"
                style={{ left: `${p.x * 100}%`, top: `${(1 - p.y) * 100}%` }}
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => {
                  /* A2-R4: right-click removes an interior point (endpoints
                     are immutable — the contextmenu is still suppressed so
                     the surface never shows the browser menu) */
                  e.preventDefault();
                  if (!isEndpoint) {
                    tell();
                    setChannel(removeCurvePoint(pts, i));
                  }
                }}
                onPointerDown={(e: ReactPointerEvent<HTMLDivElement>) => {
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  tell();
                  setDrag({ index: i, x: p.x, y: p.y });
                }}
                onPointerMove={(e) => {
                  if (e.buttons !== 1 || !drag || drag.index !== i) return;
                  applyDrag(e.clientX, e.clientY);
                }}
                onPointerUp={commitDrag}
                onPointerCancel={() => setDrag(null)}
                /* R20-W6FIX (P3) → R24-W2 (A2-R4, kept verbatim):
                   LOST-POINTER-CAPTURE COMMITS — the same law as every
                   color-page slider (controls.tsx MicroSlider, WheelsPanel
                   puck, QualifierPanel handles): capture loss is the
                   terminal gesture event, so the transient buffer lands as
                   ONE undoable commit (the D3 law), never a silent revert. */
                onLostPointerCapture={commitDrag}
                onKeyDown={(e) => {
                  const s = keyStep(e);
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    tell();
                    setChannel(moveCurvePoint(pts, i, p.x, p.y + s));
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    tell();
                    setChannel(moveCurvePoint(pts, i, p.x, p.y - s));
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    tell();
                    setChannel(moveCurvePoint(pts, i, p.x + s, p.y));
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    tell();
                    setChannel(moveCurvePoint(pts, i, p.x - s, p.y));
                  } else if (e.key === 'Home') {
                    e.preventDefault();
                    tell();
                    setChannel(moveCurvePoint(pts, i, p.x, 0));
                  } else if (e.key === 'End') {
                    e.preventDefault();
                    tell();
                    setChannel(moveCurvePoint(pts, i, p.x, 1));
                  } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isEndpoint) {
                    e.preventDefault();
                    tell();
                    setChannel(removeCurvePoint(pts, i));
                  }
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
