/* CurvesPanel — R20-W4b, the ColorConsole Curves tab (gap C55, spec 08 §5).
   Master RGB curve editor: a REAL monotone piecewise-cubic spline
   (curveMath.ts, Fritsch–Carlson — no overshoot between dragged points) on
   an SVG grid with the diagonal reference; control points are draggable
   HTML handles over the SVG.

   STORE-DRIVEN: the points live in the grade record's `curves` extension
   (MockGrade.curves = CurveSet — the store's structural extension of W4a's
   GradeParams, which has no curves field). NO local useState for the curve
   values — a transient gesture buffer commits ONE undoable setGrade on
   pointer-up (the D3 law). Keyboard (arrows/Delete) and double-click-insert
   are discrete commits.

   Endpoints are permanent and move in Y only (the grading law); interior
   points cannot cross neighbors. The W4c seam: bakeCurveLut produces the
   spec 08 §5.2 256-entry display-domain LUT the viewer composes after the
   §4.2 grade pass (see curveMath.ts's header for the split). */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import { useGradeRecord } from './useGradeTarget';
import { useGradingToast } from './useHonestToast';
import {
  DEFAULT_CURVE,
  curvePathD,
  evaluateCurve,
  insertCurvePoint,
  moveCurvePoint,
  nearestCurvePoint,
  removeCurvePoint,
  type CurvePoint,
} from './curveMath';

const GRID_STEPS = [0, 25, 50, 75, 100];

export function CurvesPanel() {
  const rec = useGradeRecord();
  const tell = useGradingToast();
  const boxRef = useRef<HTMLDivElement>(null);

  const [drag, setDrag] = useState<{ index: number; x: number; y: number } | null>(null);

  if (rec.targetId == null) {
    return (
      <div data-testid="shell-color-curves" className="flex h-full min-h-0 items-center justify-center bg-panel p-6 text-center">
        <p className="text-[12px] text-tmuted">
          No clip selected — click a clip in the lane strip (or switch the target to Timeline) to curve.
        </p>
      </div>
    );
  }

  const { grade, setGrade, resetGrade } = rec;
  const pts: CurvePoint[] = grade.curves?.master ?? DEFAULT_CURVE.master;
  const setPoints = (master: CurvePoint[]) => setGrade({ curves: { master } });

  /* transient drag → ONE commit at pointer-up */
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
    if (next[d.index].x !== pts[d.index].x || next[d.index].y !== pts[d.index].y) setPoints(next);
  };

  /* background double-click inserts a point (nearest-spline y) */
  const onBackgroundDbl = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || box.width < 10) return;
    const x = Math.min(0.98, Math.max(0.02, (e.clientX - box.left) / box.width));
    const { pts: next } = insertCurvePoint(pts, x);
    tell();
    setPoints(next);
  };

  const keyStep = (e: React.KeyboardEvent) => (e.shiftKey ? 0.05 : 0.01);

  return (
    <div data-testid="shell-color-curves" className="flex flex-col">
      {/* header row: Curves — Master RGB | reset (C55) */}
      <div className="flex h-[32px] shrink-0 items-center justify-between border-b border-hairline bg-shell px-3">
        <span data-testid="shell-color-curves-title" className="text-[13px] font-bold tracking-wide text-tprimary">
          Curves — Master RGB
        </span>
        <div className="flex items-center gap-2 text-tmuted">
          <button
            type="button"
            aria-label="Reset curve"
            data-tip="Reset"
            className="icon-btn"
            onClick={() => setGrade({ curves: { master: DEFAULT_CURVE.master.map((p) => ({ ...p })) } })}
          >
            <RotateCcw size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="scroll-y flex min-h-0 flex-1 flex-col gap-3 bg-panel p-4">
        {/* the editor square — SVG grid + path under HTML point handles.
            Double-click the background to add a point; drag/arrow-key the
            handles; Delete removes interior points. */}
        <div
          ref={boxRef}
          data-testid="shell-color-curve-editor"
          className="relative mx-auto w-full max-w-[520px]"
          style={{ aspectRatio: '1 / 1', minHeight: 240 }}
          onDoubleClick={onBackgroundDbl}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
            <rect x="0" y="0" width="100" height="100" fill="#141416" />
            {GRID_STEPS.map((g) => (
              <g key={g}>
                <line x1={g} y1="0" x2={g} y2="100" stroke="#26262a" strokeWidth="0.4" />
                <line x1="0" y1={g} x2="100" y2={g} stroke="#26262a" strokeWidth="0.4" />
              </g>
            ))}
            {/* the identity diagonal reference */}
            <line x1="0" y1="100" x2="100" y2="0" stroke="#3a3a40" strokeWidth="0.6" strokeDasharray="2 2" />
            {/* the monotone spline preview (follows the transient drag) */}
            <path d={curvePathD(shownPts)} fill="none" stroke="var(--wheel-ring-arc)" strokeWidth="1.2" />
          </svg>

          {/* point handles — HTML over SVG for real pointer capture + focus */}
          {shownPts.map((p, i) => {
            const isEndpoint = i === 0 || i === shownPts.length - 1;
            return (
              <div
                key={i}
                data-testid={`shell-color-curve-point-${i}`}
                role="slider"
                tabIndex={0}
                aria-label={`Curve point ${i + 1}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(p.y * 100)}
                aria-valuetext={`${(p.x * 100).toFixed(0)}, ${(p.y * 100).toFixed(0)}`}
                title={isEndpoint ? 'Endpoint — Y only' : 'Drag or arrow-key; Delete removes'}
                className="absolute z-10 h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border border-black bg-white shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                style={{ left: `${p.x * 100}%`, top: `${(1 - p.y) * 100}%` }}
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
                /* R20-W6FIX (P3): LOST-POINTER-CAPTURE COMMITS — the same law
                   as every color-page slider (controls.tsx MicroSlider,
                   WheelsPanel puck, QualifierPanel handles): capture loss is
                   the terminal gesture event, so the transient buffer lands
                   as ONE undoable commit (the D3 law), never a silent revert.
                   (Clip fade handles / ruler brackets intentionally DISCARD —
                   their gestures re-derive from doc state; the color family
                   is the majority law and this panel matches it.) */
                onLostPointerCapture={commitDrag}
                onKeyDown={(e) => {
                  const s = keyStep(e);
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    tell();
                    setPoints(moveCurvePoint(pts, i, p.x, p.y + s));
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    tell();
                    setPoints(moveCurvePoint(pts, i, p.x, p.y - s));
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    tell();
                    setPoints(moveCurvePoint(pts, i, p.x + s, p.y));
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    tell();
                    setPoints(moveCurvePoint(pts, i, p.x - s, p.y));
                  } else if (e.key === 'Home') {
                    e.preventDefault();
                    tell();
                    setPoints(moveCurvePoint(pts, i, p.x, 0));
                  } else if (e.key === 'End') {
                    e.preventDefault();
                    tell();
                    setPoints(moveCurvePoint(pts, i, p.x, 1));
                  } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isEndpoint) {
                    e.preventDefault();
                    tell();
                    setPoints(removeCurvePoint(pts, i));
                  }
                }}
              />
            );
          })}
        </div>

        {/* readouts: the spline's value at 25/50/75% input — derived */}
        <div className="flex items-center justify-center gap-4" data-testid="shell-color-curve-readout">
          {[0.25, 0.5, 0.75].map((x) => (
            <span key={x} className="mono text-[11px] text-tmuted">
              in {(x * 100).toFixed(0)} → out {(evaluateCurve(shownPts, x) * 100).toFixed(0)}
            </span>
          ))}
        </div>

        <p className="text-center text-[10px] leading-[1.4] text-tfaint">
          Monotone spline (no overshoot) · double-click to add a point · Delete removes interior points ·
          the 256-entry LUT bake (spec 08 §5.2) composes in the viewer with the render round (W4c seam: bakeCurveLut)
        </p>
      </div>
    </div>
  );
}

/** Re-exported for W4c: nearest-point lookup on the store's curve (dropper-
    style future use). */
export { nearestCurvePoint };
