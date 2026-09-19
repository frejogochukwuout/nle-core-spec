/* SourceRangeBar — R24-miniplus W4 (DESIGN-R24 D7): the source viewer's
 * dual-handle mark bar, ported from the variants' grammar and re-derived
 * to the mini's world:
 * - dual `role="slider"` handles (IN / OUT), aria-valuenow in SECONDS,
 *   ABSOLUTE drag positioning (the handle follows the pointer's time on
 *   the bar — never a delta off a grab anchor);
 * - the B7 pointer-release discipline: pointerup + pointercancel +
 *   lostpointercapture ALL clear the drag state (a stale move must never
 *   inherit a live drag); capture is guarded (jsdom's inactive pointer
 *   ids throw — the drag works without it);
 * - keyboard ←/→ ±0.5 (⇧ ±2.5) + Home/End — each keystroke commits
 *   through the store setters (the in<out refusal law rules the jumps:
 *   an inverted/equal attempt keeps the previous edge);
 * - the bar itself is the SOURCE SCRUB (pointerdown on the track seeks +
 *   drags sourcePlayhead; a handle's own pointerdown stops propagation so
 *   a handle grab never starts a scrub — the drag state carries the
 *   identity). The PROGRAM playhead never moves here (the F9 freeze).
 * - the trimmed band is highlighted between the handles; the unmarked
 *   state = the full window (computed at read time, never stored).
 *
 * The range is VIEW state — one clamped store write per gesture step, no
 * history entries, drag-gated (the view-family law). */

import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useMini } from '../state/useMini';
import { fmtTimecode } from '../lib/timecode';
import type { Media } from '../lib/mockData';

type DragState = 'in' | 'out' | 'ph';

export function SourceRangeBar({ media, hideHandles = false }: { media: Media; hideHandles?: boolean }) {
  const range = useMini((s) => s.sourceRanges[media.id]);
  const ph = useMini((s) => s.sourcePlayhead);
  const setIn = useMini((s) => s.setSourceRangeIn);
  const setOut = useMini((s) => s.setSourceRangeOut);
  const setPh = useMini((s) => s.setSourcePlayhead);
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const dur = media.duration;
  const inT = range?.in ?? 0;
  const outT = range?.out ?? dur;
  const pct = (t: number) => `${dur > 0 ? (t / dur) * 100 : 0}%`;

  const timeAt = (clientX: number): number => {
    const el = barRef.current;
    if (!el) return ph;
    const r = el.getBoundingClientRect();
    if (r.width <= 0) return ph; // jsdom / unmeasured — the scrub is a no-op
    return Math.max(0, Math.min(dur, ((clientX - r.left) / r.width) * dur));
  };

  /* ---- the source scrub (the track's own surface) ---- */
  const onTrackDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* untrusted/synthetic pointers have no capture target — the scrub
         still works, capture is an enhancement (the ScrubBar law) */
    }
    dragRef.current = 'ph';
    setPh(timeAt(e.clientX));
  };
  const onTrackMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current !== 'ph' || e.buttons !== 1) return; // a handle owns its gesture
    setPh(timeAt(e.clientX));
  };
  const onTrackUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current !== 'ph') return; // a handle owns its release
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* jsdom-safe */
    }
  };

  /* ---- the trim handles (B7 discipline) ---- */
  const onHandleDown = (which: 'in' | 'out') => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation(); // a handle grab never starts a track scrub
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* best-effort capture (jsdom) */
    }
    dragRef.current = which;
  };
  const onHandleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = dragRef.current;
    if (!st || st === 'ph' || e.buttons !== 1) return;
    /* ABSOLUTE positioning — the handle follows the pointer's time; the
       store's clamp/refusal law keeps in<out at every step. */
    const abs = timeAt(e.clientX);
    if (st === 'in') setIn(media.id, abs);
    else setOut(media.id, abs);
  };
  const releaseDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try {
      const el = e.currentTarget;
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    } catch {
      /* capture already released */
    }
  };

  /* keyboard slider law: ←/→ ±0.5 (⇧ ×5 = 2.5), Home/End to the domain
     ends — every keystroke commits through the store setter (the refusal
     law rules the out-of-domain jumps honestly). */
  const handleKey = (which: 'in' | 'out') => (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 0.5 * (e.shiftKey ? 5 : 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation(); // the window-level useKeys surface stays quiet
      const delta = e.key === 'ArrowRight' ? step : -step;
      if (which === 'in') setIn(media.id, inT + delta);
      else setOut(media.id, outT + delta);
    } else if (e.key === 'Home') {
      e.preventDefault();
      e.stopPropagation();
      if (which === 'in') setIn(media.id, 0);
      else setOut(media.id, 0);
    } else if (e.key === 'End') {
      e.preventDefault();
      e.stopPropagation();
      if (which === 'in') setIn(media.id, dur);
      else setOut(media.id, dur);
    }
  };

  return (
    <div
      ref={barRef}
      className="mini-srcbar"
      role="group"
      aria-label={`Source range — in ${fmtTimecode(inT)}, out ${fmtTimecode(outT)}, of ${fmtTimecode(dur)}`}
      data-testid="mini-src-bar"
      title="Scrub the source — drag the handles to mark in/out (I / O)"
      onPointerDown={onTrackDown}
      onPointerMove={onTrackMove}
      onPointerUp={onTrackUp}
      onPointerCancel={onTrackUp}
    >
      <div className="mini-srcbar__inner">
        <div className="mini-srcbar__track" aria-hidden="true" />
        {/* the TRIMMED band — the accent; unmarked = the full window at
            low emphasis (nothing is decided yet) */}
        <div
          className={`mini-srcbar__band${range ? ' is-marked' : ''}`}
          aria-hidden="true"
          style={{ left: pct(inT), width: `calc(${pct(outT)} - ${pct(inT)})` }}
        />
        {/* the source playhead marker (F9 — this stage's own position;
            pointer-events:none so a pointerdown bubbles to the scrub) */}
        <div
          className="mini-srcbar__ph"
          aria-hidden="true"
          style={{ left: pct(ph) }}
          data-testid="mini-src-ph"
        />
        <div
          className="mini-srcbar__handle"
          role="slider"
          tabIndex={hideHandles ? -1 : 0}
          aria-hidden={hideHandles || undefined}
          aria-label="Source in point"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={Math.round(dur * 10) / 10}
          aria-valuenow={Math.round(inT * 10) / 10}
          aria-valuetext={fmtTimecode(inT)}
          data-testid="mini-src-in"
          onPointerDown={onHandleDown('in')}
          onPointerMove={onHandleMove}
          onPointerUp={releaseDrag}
          onPointerCancel={releaseDrag}
          onLostPointerCapture={() => {
            dragRef.current = null; // the B7 law — a stray release clears
          }}
          onKeyDown={handleKey('in')}
        />
        <div
          className="mini-srcbar__handle"
          role="slider"
          tabIndex={hideHandles ? -1 : 0}
          aria-hidden={hideHandles || undefined}
          aria-label="Source out point"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={Math.round(dur * 10) / 10}
          aria-valuenow={Math.round(outT * 10) / 10}
          aria-valuetext={fmtTimecode(outT)}
          data-testid="mini-src-out"
          onPointerDown={onHandleDown('out')}
          onPointerMove={onHandleMove}
          onPointerUp={releaseDrag}
          onPointerCancel={releaseDrag}
          onLostPointerCapture={() => {
            dragRef.current = null; // the B7 law — a stray release clears
          }}
          onKeyDown={handleKey('out')}
        />
      </div>
    </div>
  );
}
