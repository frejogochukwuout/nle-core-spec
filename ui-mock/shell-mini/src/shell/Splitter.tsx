/* Splitter (R18d — feedback #13: "the panels can't resize even slightly").
   Layout-only drag handle: 6px hit area, 2px bar that lights on hover.
   Pointer-capture drag, keyboard arrows (±8px, shift = ±32px),
   double-click resets to the initial value. aria=separator with value
   semantics. Sizes live in the PARENT (App) — the splitter is dumb.

   R18g (thread #20 — BUG: "adjust direction is wrong here drags right
   for left"): `invert` flips the drag + arrow-key direction. Use it when
   the panel being sized sits to the RIGHT of the handle (inspector):
   dragging the boundary right must SHRINK that panel, and ArrowRight
   means "push the boundary right" (narrower), not "grow it". The pool
   splitter (panel on the left) and the row splitter keep the normal
   direction — the reviewer confirmed those feel correct. */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export interface SplitterProps {
  orientation: 'vertical' | 'horizontal'; // bar direction → cursor
  value: number;
  min: number;
  max: number;
  initial: number;
  onChange: (v: number) => void;
  label: string;
  /** R18g: panel sits right of the handle → dragging right shrinks it */
  invert?: boolean;
}

const STEP = 8;
const BIG_STEP = 32;

export function Splitter({ orientation, value, min, max, initial, onChange, label, invert = false }: SplitterProps) {
  const [active, setActive] = useState(false);
  /** drag session: pointerId + pointer position + size at start */
  const g = useRef<{ pointerId: number | null; startPos: number; startSize: number }>({
    pointerId: null,
    startPos: 0,
    startSize: 0,
  });

  const clamp = (v: number): number => Math.min(Math.max(v, min), max);
  const isRow = orientation === 'horizontal';

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    if (g.current.pointerId !== null) return; // one gesture at a time (R18f review P2-4)
    g.current = {
      pointerId: e.pointerId,
      startPos: isRow ? e.clientY : e.clientX,
      startSize: value,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActive(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const gs = g.current;
    if (gs.pointerId === null || e.pointerId !== gs.pointerId) return;
    const pos = isRow ? e.clientY : e.clientX;
    // vertical bar → horizontal sizing; horizontal bar → vertical sizing.
    // isRow negates because the timeline grows UPWARD when the boundary
    // moves up; invert (R18g) flips a right-side panel's growth axis.
    let delta = isRow ? -(pos - gs.startPos) : pos - gs.startPos;
    if (invert) delta = -delta;
    onChange(clamp(gs.startSize + delta));
  };

  const finish = (e: ReactPointerEvent<HTMLElement>) => {
    if (g.current.pointerId === null || e.pointerId !== g.current.pointerId) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* jsdom-safe */
    }
    g.current.pointerId = null;
    setActive(false);
  };

  const nudge = (dir: 1 | -1, e: React.KeyboardEvent<HTMLElement>) => {
    e.preventDefault();
    onChange(clamp(value + dir * (e.shiftKey ? BIG_STEP : STEP)));
  };

  return (
    <div
      role="separator"
      aria-orientation={orientation === 'vertical' ? 'vertical' : 'horizontal'}
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      className={`mini-splitter${isRow ? ' mini-splitter--row' : ''}${active ? ' is-active' : ''}`}
      data-testid={`mini-splitter-${isRow ? 'timeline' : label.toLowerCase().replace(/\s+/g, '-')}`}
      style={{ width: isRow ? 'auto' : 6, height: isRow ? 6 : 'auto' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onDoubleClick={() => onChange(clamp(initial))}
      onKeyDown={(e) => {
        if (isRow) {
          if (e.key === 'ArrowUp') nudge(1, e);
          else if (e.key === 'ArrowDown') nudge(-1, e);
        } else {
          // R18g invert: ArrowRight = push the boundary right → for a
          // right-side panel that SHRINKS it ("nudge toward right edge")
          if (e.key === 'ArrowLeft') nudge(invert ? 1 : -1, e);
          else if (e.key === 'ArrowRight') nudge(invert ? -1 : 1, e);
        }
      }}
    />
  );
}
