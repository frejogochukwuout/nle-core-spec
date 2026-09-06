/* SourceRangeBar — R22 W4 (DESIGN-R22; issues #84/#85: "should allow
   selecting / trim the range of source, under SOURCE preview player view" +
   "here can be the place to add play control as well as trim edit
   controls, very much similar to the trim operations we can do in NLE
   track but apply to source for the timline insertion operation").

   Replaces the static 12px source scrub band (th_mto3504c's "no fake
   scrubbing of a jpg" honesty is PRESERVED — this bar does not scrub, it
   TRIMS): the dual in/out handles + the range band over the full source
   duration. Drag = slider semantics (ONE clamped write per gesture step,
   committed live — the range is view-state, not doc, so no history
   entries). Keyboard: the handles are role=slider (←/→ ±1 frame, ⇧ ×10,
   Home/End). The trimmed range rides the insert planner (ctx.sourceRange)
   so every edit function places the TRIMMED source. */

import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useUi } from '../../state/useUiStore';
import { mediaById } from '../../lib/mockData';
import { tc } from '../../lib/timecode';

const FRAME = 1 / 24;

interface DragState {
  which: 'in' | 'out';
  startClientX: number;
  startX: number;
  duration: number;
}

export function SourceRangeBar({ mediaId }: { mediaId: string }) {
  const range = useUi((s) => s.sourceRanges[mediaId]);
  const setIn = useUi((s) => s.setSourceRangeIn);
  const setOut = useUi((s) => s.setSourceRangeOut);
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const m = mediaById(mediaId);
  const dur = m?.duration ?? null;
  /* a still image (no duration) keeps the honest static band — no range to
     trim (the old th_mto3504c law); the transport's trim controls refuse
     with the honest toast instead. */
  if (dur == null || dur <= 0) {
    return (
      <div
        className="relative flex shrink-0 items-center border-t border-hairline px-2"
        style={{ height: 14, minHeight: 14 }}
        data-testid="shell-viewer-scrub"
        aria-label="Source duration (static preview — no trim range for stills)"
      >
        <div className="relative h-full w-full">
          <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-sm bg-[var(--border-soft)]" />
        </div>
      </div>
    );
  }

  const inT = range?.in ?? 0;
  const outT = range?.out ?? dur;
  const pct = (t: number) => `${(t / dur) * 100}%`;

  const timeAt = (clientX: number) => {
    const el = barRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(dur, ((clientX - r.left - 8) / Math.max(1, r.width - 16)) * dur));
  };

  const onHandleDown = (which: 'in' | 'out') => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { which, startClientX: e.clientX, startX: which === 'in' ? inT : outT, duration: dur };
  };
  const onHandleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = dragRef.current;
    if (!st || e.buttons !== 1) return;
    const t = st.startX + (e.clientX - st.startClientX) * 0; // absolute positioning, not delta
    const abs = timeAt(e.clientX);
    void t;
    if (st.which === 'in') setIn(mediaId, abs);
    else setOut(mediaId, abs);
  };
  const onHandleUp = () => { dragRef.current = null; };

  /* keyboard slider law (the scrub row's grammar): ←/→ ±1 frame (⇧ ×10),
     Home/End to the track ends */
  const handleKey = (which: 'in' | 'out') => (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = FRAME * (e.shiftKey ? 10 : 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? step : -step;
      if (which === 'in') setIn(mediaId, inT + delta);
      else setOut(mediaId, outT + delta);
    } else if (e.key === 'Home') {
      e.preventDefault();
      if (which === 'in') setIn(mediaId, 0);
    } else if (e.key === 'End') {
      e.preventDefault();
      if (which === 'out') setOut(mediaId, dur);
    }
  };

  return (
    <div
      ref={barRef}
      className="relative flex shrink-0 cursor-default items-center border-t border-hairline px-2"
      style={{ height: 16, minHeight: 16 }}
      data-testid="shell-viewer-scrub"
      aria-label={`Source trim range — in ${tc(inT)} out ${tc(outT)} of ${tc(dur)}`}
    >
      <div className="relative h-full w-full">
        {/* the full-duration track */}
        <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-sm bg-[var(--border-soft)]" />
        {/* the TRIMMED range band — the accent; untrimmed = full length at
            low opacity (the loop-band grammar) */}
        <div
          className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded-sm"
          style={{ left: pct(inT), width: `calc(${pct(outT)} - ${pct(inT)})`, background: 'var(--accent-selection)', opacity: range ? 0.9 : 0.3 }}
        />
        {/* IN handle */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Source in point"
          aria-valuemin={0}
          aria-valuemax={Math.round(dur * 24)}
          aria-valuenow={Math.round(inT * 24)}
          aria-valuetext={tc(inT)}
          data-testid="shell-source-range-in"
          className="absolute top-1/2 z-[2] h-[12px] w-[8px] -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-[2px] border border-strong bg-raised shadow-sm transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-selection)]"
          style={{ left: `calc(${pct(inT)} + 8px)` }}
          onPointerDown={onHandleDown('in')}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onKeyDown={handleKey('in')}
        />
        {/* OUT handle */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Source out point"
          aria-valuemin={0}
          aria-valuemax={Math.round(dur * 24)}
          aria-valuenow={Math.round(outT * 24)}
          aria-valuetext={tc(outT)}
          data-testid="shell-source-range-out"
          className="absolute top-1/2 z-[2] h-[12px] w-[8px] -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-[2px] border border-strong bg-raised shadow-sm transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-selection)]"
          style={{ left: `calc(${pct(outT)} + 8px)` }}
          onPointerDown={onHandleDown('out')}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onKeyDown={handleKey('out')}
        />
      </div>
    </div>
  );
}
