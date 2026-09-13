/* SourceRangeBar — R22 W4 (DESIGN-R22; issues #84/#85: "should allow
   selecting / trim the range of source, under SOURCE preview player view" +
   "here can be the place to add play control as well as trim edit
   controls, very much similar to the trim operations we can do in NLE
   track but apply to source for the timline insertion operation").

   W1-B (DESIGN-R25 §3 / §6 A1, R2 "no play control"): the bar merges into
   a REAL SCRUB STRIP — the dual in/out handles + the range band over the
   full source duration, PLUS the source PLAYHEAD marker (position =
   sourcePlayhead/duration) draggable with the handles' own pointer
   grammar (pointerdown on the track seeks + drags; capture guarded), and
   the OUT-OF-RANGE DIMMING — A1's grammar: the spans outside [in,out]
   carry a ~50% dark overlay ON THE STRIP (never on the poster image; the
   image is never dimmed). Playhead law (the documented ruling, store
   level): with a range set the playhead's domain IS [in,out] — scrub,
   Home/End and playback clamp to the trimmed span (what you preview is
   the span every insert commits; Resolve scrubs the whole source, the
   mock previews the range). Playback itself advances in the store
   (tickSourcePlayback — the Viewer's rAF loop drives it).

   A1 stills: a still = a normal 5s clip in Resolve — the STILL branch
   keeps the honest NO-TRIM law (no handles: a still has no real source
   range; inserts stay the fixed-length still) but gains the transport
   strip (scrub + play over the 5s pseudo-duration, SOURCE_STILL_PSEUDO_DUR).

   R24-W5b (gesture laws, preserved): the handles carry the B7
   pointer-release discipline (pointerup + pointercancel +
   lostpointercapture clear the drag state; capture set/release guarded —
   the Fader/Knob/PanBox law) and B8 aria-orientation="horizontal"; drag
   positioning is ABSOLUTE (time at the pointer). The PLAYHEAD drag rides
   the same B7 discipline on the track container (a handle's own drag
   never leaks into a track scrub — the drag state carries the identity).

   The trimmed range rides the insert planner (ctx.sourceRange) so every
   edit function places the TRIMMED source. The range is view-state, not
   doc — ONE clamped write per gesture step, no history entries. */

import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useUi, sourcePlayheadOf, sourceDomainOf, SOURCE_STILL_PSEUDO_DUR } from '../../state/useUiStore';
import { mediaById } from '../../lib/mockData';
import { tc } from '../../lib/timecode';

const FRAME = 1 / 24;

interface DragState {
  which: 'in' | 'out' | 'playhead';
}

export function SourceRangeBar({ mediaId }: { mediaId: string }) {
  const range = useUi((s) => s.sourceRanges[mediaId]);
  const ph = useUi((s) => sourcePlayheadOf(s, mediaId));
  const setIn = useUi((s) => s.setSourceRangeIn);
  const setOut = useUi((s) => s.setSourceRangeOut);
  const seek = useUi((s) => s.seekSource);
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const m = mediaById(mediaId);
  const realDur = m?.duration ?? null;
  /* A1: stills ride the 5s pseudo-duration — the strip is the transport's
     surface even for a jpg (the honest moving playhead over the still). */
  const still = realDur == null || realDur <= 0;
  const dur = still ? SOURCE_STILL_PSEUDO_DUR : realDur;

  const inT = range?.in ?? 0;
  const outT = range?.out ?? dur;
  const pct = (t: number) => `${(t / dur) * 100}%`;

  const timeAt = (clientX: number) => {
    const el = barRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(dur, ((clientX - r.left - 8) / Math.max(1, r.width - 16)) * dur));
  };

  /* ---- the PLAYHEAD scrub (track pointerdown seeks + drags; the handles'
     own pointerdown stops propagation so a handle grab never starts a
     scrub) ---- */
  const onTrackDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      /* R24-W5b's guarded capture law — best-effort, the drag works
         without it (jsdom's inactive pointer ids). */
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch { /* inactive pointer id — drag still works, capture best-effort */ }
    dragRef.current = { which: 'playhead' };
    seek(mediaId, timeAt(e.clientX));
  };
  const onTrackMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    /* only OUR scrub — a handle drag bubbling through the container is
       ignored (the drag state carries the identity). */
    if (dragRef.current?.which !== 'playhead' || e.buttons !== 1) return;
    seek(mediaId, timeAt(e.clientX));
  };
  /* the B7 release discipline for the scrub: a stray pointerup/cancel/
     lostpointercapture ends the drag so no stale move seeks. */
  const onTrackUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.which !== 'playhead') return; // a handle owns its release
    dragRef.current = null;
    try {
      const el = e.currentTarget;
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    } catch { /* capture already released */ }
  };

  /* ---- the trim handles (R22 W4 / R24-W5b grammar, unchanged) ---- */
  const onHandleDown = (which: 'in' | 'out') => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // a handle grab never starts a track scrub
    try {
      /* R24-W5b: guarded like Fader/Knob/PanBox — an inactive pointer id
         (the F4 finding's throw class) must not kill the drag; capture is
         best-effort, the move grammar works without it. */
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch { /* inactive pointer id — drag still works, capture best-effort */ }
    dragRef.current = { which };
  };
  const onHandleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const st = dragRef.current;
    if (!st || st.which === 'playhead' || e.buttons !== 1) return;
    /* ABSOLUTE positioning — the handle follows the pointer's time on the
       bar (timeAt), never a delta off a grab anchor (the old dead `*0`
       line was the residue of that idea, removed R24-W5b). */
    const abs = timeAt(e.clientX);
    if (st.which === 'in') setIn(mediaId, abs);
    else setOut(mediaId, abs);
  };
  /* R24-W5b (F1-P3, the B7 law — Fader/Knob/PanBox discipline): a stray
     pointerup/pointercancel/lostpointercapture must clear the drag state,
     or the NEXT pointermove could inherit a live drag that ended. The
     capture release is guarded (browsers/jsdom disagree on double
     release). */
  const releaseDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try {
      const el = e.currentTarget;
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    } catch { /* capture already released */ }
  };
  const clearDrag = () => { dragRef.current = null; };

  /* keyboard slider law (the scrub row's grammar): ←/→ ±1 frame (⇧ ×10),
     Home/End to the domain ends — R24-W5b: on EITHER handle (each slider
     jumps its own edge to the end; the store clamp keeps in < out). */
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
      else setOut(mediaId, 0);
    } else if (e.key === 'End') {
      e.preventDefault();
      if (which === 'in') setIn(mediaId, dur);
      else setOut(mediaId, dur);
    }
  };

  /* the playhead marker's keyboard law (the program scrub row's grammar):
     ←/→ nudge ±1 frame (⇧ ×10), Home/End to the DOMAIN ends — the store's
     seekSource clamps into [in,out] when a range is set (the documented
     domain ruling), so Home with a range previews from range.in. */
  const playheadKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = (e.shiftKey ? 10 : 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      useUi.getState().nudgeSource(mediaId, e.key === 'ArrowRight' ? step : -step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      seek(mediaId, 0); // the domain clamp lands on range.in when trimmed
    } else if (e.key === 'End') {
      e.preventDefault();
      seek(mediaId, dur);
    }
  };

  const ariaLabel = still
    ? `Source scrub — playhead ${tc(ph)} · still image (${dur} s preview transport — no trim range for stills)`
    : `Source scrub — playhead ${tc(ph)}${range ? ` · in ${tc(inT)} · out ${tc(outT)}` : ''} · of ${tc(dur)}`;

  return (
    <div
      ref={barRef}
      className="relative flex shrink-0 cursor-default items-center border-t border-hairline px-2"
      style={{ height: 16, minHeight: 16 }}
      data-testid="shell-viewer-scrub"
      aria-label={ariaLabel}
      /* W1-B: the track itself is the scrub surface — pointerdown seeks +
          drags the playhead (the handles stopPropagation above keep their
          own gesture). */
      onPointerDown={onTrackDown}
      onPointerMove={onTrackMove}
      onPointerUp={onTrackUp}
      onPointerCancel={onTrackUp}
    >
      <div className="relative h-full w-full">
        {/* the full-duration track */}
        <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-sm bg-[var(--border-soft)]" />
        {/* the TRIMMED range band — the accent; untrimmed = full length at
            low opacity (the loop-band grammar). Stills: no band (no range). */}
        {!still && (
          <div
            className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded-sm"
            style={{ left: pct(inT), width: `calc(${pct(outT)} - ${pct(inT)})`, background: 'var(--accent-selection)', opacity: range ? 0.9 : 0.3 }}
          />
        )}
        {/* W1-B (A1's grammar): OUT-OF-RANGE DIMMING, ON THE STRIP ONLY —
            the spans outside [in,out] carry a ~50% dark overlay (never the
            poster image). No range → the whole strip is the preview, no
            dim. pointer-events-none so the scrub above stays live. */}
        {range && !still && (
          <div data-testid="shell-source-dim" aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div data-testid="shell-source-dim-left" className="absolute inset-y-0 left-0 bg-black/50" style={{ width: pct(inT) }} />
            <div data-testid="shell-source-dim-right" className="absolute inset-y-0 right-0 bg-black/50" style={{ width: `calc(100% - ${pct(outT)})` }} />
          </div>
        )}
        {/* W1-B: the source PLAYHEAD marker — the same 8px pad law as the
            handles; no pointer handlers of its own (a pointerdown on the
            marker bubbles to the track's scrub). Keyboard: the slider
            grammar above. */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Source playhead"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={Math.round(dur * 24)}
          aria-valuenow={Math.round(ph * 24)}
          aria-valuetext={tc(ph)}
          data-testid="shell-source-playhead"
          className="absolute top-1/2 z-[3] h-[12px] w-[2px] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--playhead)]"
          style={{ left: `calc(${pct(ph)} + 8px)`, background: 'var(--playhead)' }}
          onKeyDown={playheadKey}
        />
        {/* IN handle — stills carry none (a still has no real source range) */}
        {!still && (
          <div
            role="slider"
            tabIndex={0}
            aria-label="Source in point"
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={Math.round(dur * 24)}
            aria-valuenow={Math.round(inT * 24)}
            aria-valuetext={tc(inT)}
            data-testid="shell-source-range-in"
            className="absolute top-1/2 z-[2] h-[12px] w-[8px] -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-[2px] border border-strong bg-raised shadow-sm transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-selection)]"
            style={{ left: `calc(${pct(inT)} + 8px)` }}
            onPointerDown={onHandleDown('in')}
            onPointerMove={onHandleMove}
            onPointerUp={releaseDrag}
            onPointerCancel={releaseDrag}
            onLostPointerCapture={clearDrag}
            onKeyDown={handleKey('in')}
          />
        )}
        {/* OUT handle */}
        {!still && (
          <div
            role="slider"
            tabIndex={0}
            aria-label="Source out point"
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={Math.round(dur * 24)}
            aria-valuenow={Math.round(outT * 24)}
            aria-valuetext={tc(outT)}
            data-testid="shell-source-range-out"
            className="absolute top-1/2 z-[2] h-[12px] w-[8px] -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-[2px] border border-strong bg-raised shadow-sm transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-selection)]"
            style={{ left: `calc(${pct(outT)} + 8px)` }}
            onPointerDown={onHandleDown('out')}
            onPointerMove={onHandleMove}
            onPointerUp={releaseDrag}
            onPointerCancel={releaseDrag}
            onLostPointerCapture={clearDrag}
            onKeyDown={handleKey('out')}
          />
        )}
      </div>
    </div>
  );
}
