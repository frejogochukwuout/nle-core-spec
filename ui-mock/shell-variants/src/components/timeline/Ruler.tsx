/* Ruler — spec 05 §7/§14.3 + R15 T1 CapCut-tier ticks (canonical
   ruler-utils): adaptive label/tick intervals from frame-tier tables
   (labels ≥ 120 px, ticks ≥ 18 px, tick divides label evenly), labels
   MM:SS / H:MM:SS at second boundaries and `Xf` between, ticks virtualized
   to the visible window + buffer. Still: click-to-seek, in/out + loop
   shading with BRACKETS, markers (spec 16 §3.7 palette). 44px zone in
   readout mode (labels + tick strip), 22px slim. */

import { useEffect, useRef, useState } from 'react';
import { useUi } from '../../state/useUiStore';
import { useHeaderStyle } from '../../state/variantHooks';
import { snapToFrame, tc } from '../../lib/timecode';
import { snapPxToDeviceGrid } from '../../lib/pixel';
import { createEdgeAutoScroll } from '../../lib/edgeScroll';
import { getRulerConfig, shouldShowLabel, formatRulerLabel, getRulerWindow, tickTimes } from '../../lib/rulerTiers';
import type { Marker, SceneJSON } from '../../lib/mockData';
import { ContextMenu, isMenuKey, useContextMenu, type MenuItem } from '../shell/ContextMenu';

const MARKER_COLORS: Record<Marker['color'], string> = {
  red: 'var(--mk-red)', orange: 'var(--mk-orange)', yellow: 'var(--mk-yellow)', green: 'var(--mk-green)',
  blue: 'var(--mk-blue)', purple: 'var(--mk-purple)', pink: 'var(--mk-pink)', gray: 'var(--mk-gray)',
};

const MARKER_COLOR_ORDER: Marker['color'][] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];

/* §4.9 marker-color palette — ONE shared builder (R14 no-op sweep: the
   TimelineToolbar marker-color button rendered this same dot row as a dead
   color-dot + chevron). Returns the 8-dot row (spec 16 §3.7 FCP cycle order)
   as a custom menu item: the ContextMenu wraps it in a role="group" row;
   dots are role="menuitem" buttons — Enter/click fires onPick(color),
   Left/Right cycles the dots. The HOST owns menu.close() + the addMarker
   commit (this builder is presentation-only, so it stays host-agnostic). */
export function markerColorItems(
  onPick: (color: Marker['color']) => void,
  dotTestidPrefix = 'shell-menu-ruler-color',
): MenuItem[] {
  const dotRow = (
    <div
      className="flex w-full items-center justify-between"
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        e.stopPropagation();
        const dots = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('.menu-dot'));
        if (dots.length === 0) return;
        const idx = dots.findIndex((d) => d === document.activeElement);
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        dots[(idx + dir + dots.length) % dots.length]?.focus();
      }}
    >
      {MARKER_COLOR_ORDER.map((c) => (
        <button
          key={c}
          type="button"
          role="menuitem"
          className="menu-dot"
          style={{ background: MARKER_COLORS[c] }}
          aria-label={`Add ${c} marker at playhead`}
          data-testid={`${dotTestidPrefix}-${c}`}
          onClick={() => onPick(c)}
        />
      ))}
    </div>
  );
  return [{ id: 'marker-color', label: 'Marker color', sep: true, custom: dotRow }];
}

export function Ruler({ scene, duration, pxPerSec, playhead, contentW, view }: { scene: SceneJSON; duration: number; pxPerSec: number; playhead: number; contentW: number; view: { scrollLeft: number; viewportW: number } }) {
  const headerStyle = useHeaderStyle();
  const zoneH = headerStyle === 'readout' ? 44 : 22;
  const setPlayhead = useUi((s) => s.setPlayhead);
  const loop = useUi((s) => s.loop);
  const loopEnabled = useUi((s) => s.loopEnabled);
  const addMarker = useUi((s) => s.addMarker);
  const clearInOut = useUi((s) => s.clearInOut);
  const setLoopEnabled = useUi((s) => s.setLoopEnabled);
  const menu = useContextMenu(); // §4.9 ruler menu
  const ref = useRef<HTMLDivElement>(null);
  /* gesture-origin gate: only the ruler's OWN press may seek — a drag that
     started on the track headers / toolbar must not scrub the playhead when
     it crosses the ruler (R13 review: `buttons === 1` alone made any
     left-drag an accidental seek with no undo trail). */
  const seeking = useRef(false);
  /* R15 T8 (R15-F1 FIX 4c): element-snap is OFF on the first scrub move (no
     jarring jump off the pointerdown seek) and ON from the second move —
     nearest element edge on UNLOCKED tracks within the 10px tolerance when
     snapping is on. Frame-snap always. */
  const scrubMoves = useRef(0);
  /* R15 T8 (R15-F1 FIX 4d): seek click gate — a release within 5px AND
     500ms of the down re-seeks at the RELEASE point (canonical final
     no-snap scrub at the click position). Pointerdown keeps its immediate
     seek (mock behavior, unchanged). */
  const downX = useRef(0);
  const downT = useRef(0);
  const [hoverT, setHoverT] = useState<number | null>(null);
  const snap = useUi((s) => s.snap);

  /* R15 T8 (R15-F1 FIX 4e): scrub EDGE AUTO-SCROLL — the same shared
     lib/edgeScroll law the clip drags run (100px threshold, 15px/frame max,
     ramp 1 − dist/threshold). The scroller is the Timeline's #timeline-scroll
     (the ruler lives inside its scroll content; standalone mounts find none
     and the loop parks). Writing scrollLeft programmatically fires no scroll
     EVENT — dispatch one so the Timeline's reactive scrollLeft (ruler tick
     virtualization + clip culling) follows the frame. */
  const scrubPointerX = useRef(0);
  const edgeScrollRef = useRef<ReturnType<typeof createEdgeAutoScroll> | null>(null);
  const getEdgeScroll = () => {
    if (!edgeScrollRef.current) {
      edgeScrollRef.current = createEdgeAutoScroll({
        getScroller: () => (ref.current?.closest('#timeline-scroll') as HTMLElement | null) ?? null,
        getPointerX: () => scrubPointerX.current,
        isActive: () => seeking.current,
        onScroll: () => {
          const sc = ref.current?.closest('#timeline-scroll') as HTMLElement | null;
          sc?.dispatchEvent(new Event('scroll'));
        },
      });
    }
    return edgeScrollRef.current;
  };
  useEffect(() => () => { edgeScrollRef.current?.stop(); }, []); // unmount safety — never leak the rAF

  /* ---------- in/out brackets: draggable loop edges (R14 no-op sweep —
     the bracket art LOOKED draggable but was pointer-events-none). Drag =
     pointer-captured edge move (x → time, frame-snapped); keyboard = the
     ruler's own slider grammar (spec 18 §11.3) — ←/→ ±1 frame (⇧ ×10),
     Home/End jump. applyBracket keeps the ordering law (R14, same as
     markIn/markOut): start <= end ALWAYS — moving an edge past the other
     drags the far edge along instead of inverting the window (an inverted
     loop pegs the playback tick; the R13 hang). */
  const bracketDrag = useRef<'in' | 'out' | null>(null);
  const applyBracket = (side: 'in' | 'out', t: number) => {
    const v = Math.max(0, snapToFrame(t));
    useUi.setState((s) =>
      side === 'in'
        ? { loop: { ...s.loop, start: v, end: Math.max(s.loop.end, v) } }
        : { loop: { ...s.loop, end: v, start: Math.min(s.loop.start, v) } },
    );
  };
  const bracketHandlers = (side: 'in' | 'out') => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation(); // the ruler's own press must NOT seek the playhead
      (e.currentTarget as HTMLElement).focus();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      bracketDrag.current = side;
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (bracketDrag.current !== side || e.buttons !== 1) return;
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      applyBracket(side, (e.clientX - box.left) / pxPerSec);
    },
    onPointerUp: () => { bracketDrag.current = null; },
    onPointerCancel: () => { bracketDrag.current = null; },
    onLostPointerCapture: () => { bracketDrag.current = null; },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation(); // the ruler root nudges the playhead on arrows
        const frames = (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 10 : 1);
        applyBracket(side, (side === 'in' ? loop.start : loop.end) + frames / 24);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        e.stopPropagation();
        applyBracket(side, e.key === 'Home' ? 0 : duration);
      }
    },
  });

  /* §4.9 ruler menu — marker at playhead, in/out clearing, loop toggle, and
     the shared 8-color marker palette row (markerColorItems above). */
  const buildMenuItems = (): MenuItem[] => [
    { id: 'add-marker', label: 'Add marker at playhead', onSelect: () => addMarker(playhead) },
    { id: 'goto-marker', label: 'Go to Marker ›', disabled: true, tip: 'mock: marker navigation list not built' },
    { id: 'clear-markers', label: 'Clear Markers in View', disabled: true, tip: 'mock: view-range tracking not built (⇧M deletes at playhead)' },
    { id: 'mark-in', label: 'Mark In', shortcut: 'I', onSelect: () => useUi.getState().markIn() },
    { id: 'mark-out', label: 'Mark Out', shortcut: 'O', onSelect: () => useUi.getState().markOut() },
    { id: 'clear-inout', label: 'Clear in/out', onSelect: () => clearInOut() },
    { id: 'loop', label: 'Loop playback', checked: loopEnabled, onSelect: () => setLoopEnabled(!loopEnabled) },
    ...markerColorItems((c) => { menu.close(); addMarker(playhead, c); }),
  ];

  /* R15 T1 — CapCut tiers (lib/rulerTiers, canonical ruler-utils): adaptive
     intervals from the frame/second tier tables; DOM ticks virtualized to the
     visible window (tick count no longer linear in duration × zoom).
     contentW comes from the Timeline's single-source pixel math (dedup — the
     ruler previously recomputed (dur+4)·pps on its own). */
  const { labelInterval, tickInterval } = getRulerConfig(pxPerSec);
  const win = getRulerWindow(view.scrollLeft, view.viewportW, pxPerSec, tickInterval, duration, contentW);
  const ticks = tickTimes(win, tickInterval);

  const seek = (clientX: number, allowElementSnap: boolean) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    // frame-grid discipline (R13 review: raw pixel times landed off-grid);
    // R15 T8: the seek domain is [0, scene duration] (setPlayhead clamps too)
    let t = Math.max(0, (clientX - box.left) / pxPerSec);
    if (allowElementSnap && snap) {
      // nearest edge within the 10px screen-space tolerance, closest-wins
      const tol = 10 / pxPerSec;
      let best = snapToFrame(t);
      let bestD = tol;
      for (const tr of scene.tracks) {
        if (tr.locked) continue; // locked lanes are not snap sources (T5 law)
        for (const e of tr.elements) {
          for (const edge of [e.startTime, e.startTime + e.duration]) {
            const d = Math.abs(edge - t);
            if (d < bestD) { best = edge; bestD = d; }
          }
        }
      }
      t = best;
    } else {
      t = snapToFrame(t);
    }
    setPlayhead(Math.min(t, duration));
  };

  const tickH = headerStyle === 'readout' ? 12 : 7;
  const isMajor = (t: number) => shouldShowLabel(t, labelInterval);

  const bandLeft = snapPxToDeviceGrid(loop.start * pxPerSec);
  const bandW = Math.max(2, snapPxToDeviceGrid((loop.end - loop.start) * pxPerSec));

  return (
    <div
      ref={ref}
      role="slider"
      aria-label="Timeline ruler"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration * 24)}
      aria-valuenow={Math.round(playhead * 24)}
      aria-valuetext={tc(playhead)}
      className="sticky top-0 z-30 shrink-0 cursor-pointer border-b border-hairline bg-shell"
      style={{ height: zoneH, width: contentW }}
      tabIndex={0} /* in tab order: the §11.3 slider is keyboard-operable, and
        Shift+F10 (§4.9 marker palette) must be reachable without a pointer
        (R14: was -1, focusable only via pointerdown) */
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation(); // keep the timeline-empty menu out of it
        menu.open(e.clientX, e.clientY, buildMenuItems(), 'ruler');
      }}
      onKeyDown={(e) => {
        if (isMenuKey(e)) {
          e.preventDefault();
          e.stopPropagation();
          menu.openForElement(ref.current, buildMenuItems(), 'ruler');
          return;
        }
        // slider contract (spec 18 §11.3): the ruler is keyboard-operable —
        // ←/→ nudge ±1 frame (⇧ ×10), Home/End jump (R13 review: role=slider
        // was keyboard-dead)
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          useUi.getState().nudgePlayhead((e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 10 : 1));
        } else if (e.key === 'Home' || e.key === 'End') {
          e.preventDefault();
          useUi.getState().setPlayhead(e.key === 'Home' ? 0 : duration);
        }
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return; // right-button down must not seek — the menu follows
        (e.currentTarget as HTMLElement).focus(); // roving focus for Shift+F10
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        seeking.current = true;
        scrubMoves.current = 0;
        downX.current = e.clientX;
        downT.current = performance.now();
        scrubPointerX.current = e.clientX;
        seek(e.clientX, false);
        getEdgeScroll().start(); // R15 T8 scrub edge auto-scroll (parks without a scroller)
      }}
      onPointerMove={(e) => {
        const box = ref.current?.getBoundingClientRect();
        if (box) setHoverT(Math.max(0, (e.clientX - box.left) / pxPerSec));
        if (seeking.current && e.buttons === 1) {
          scrubMoves.current += 1;
          scrubPointerX.current = e.clientX;
          seek(e.clientX, scrubMoves.current > 1); // first move: frame-snap only (T8 — no jarring jump)
        }
      }}
      onPointerUp={(e) => {
        if (seeking.current) {
          // R15 T8 (R15-F1 FIX 4d): click finalize — release within 5px +
          // 500ms of the down → final no-snap scrub at the RELEASE point
          if (Math.abs(e.clientX - downX.current) <= 5 && performance.now() - downT.current <= 500) {
            seek(e.clientX, false);
          }
        }
        seeking.current = false;
        scrubMoves.current = 0;
        edgeScrollRef.current?.stop();
      }}
      onPointerCancel={() => { seeking.current = false; scrubMoves.current = 0; edgeScrollRef.current?.stop(); }}
      onLostPointerCapture={() => { seeking.current = false; scrubMoves.current = 0; edgeScrollRef.current?.stop(); }}
      onPointerLeave={() => setHoverT(null)}
    >
      {/* ticks — virtualized CapCut-tier window (major = on the label grid) */}
      {ticks.map((t) => {
        const major = isMajor(t);
        return (
          <div
            key={t}
            className="absolute bottom-0 w-px"
            style={{ left: snapPxToDeviceGrid(t * pxPerSec), height: major ? tickH : tickH * 0.55, background: 'var(--text-faint)', opacity: major ? 0.9 : 0.45 }}
            data-testid={major ? 'ruler-tick-major' : 'ruler-tick-minor'}
          />
        );
      })}

      {/* labels — canonical format: MM:SS at second boundaries (H:MM:SS at
          hours), `Xf` (frames within the second) between */}
      {ticks.filter((t) => shouldShowLabel(t, labelInterval)).map((t) => (
        <span
          key={`l${t}`}
          className="mono absolute select-none text-[11px] text-tmuted"
          style={{ left: snapPxToDeviceGrid(t * pxPerSec) + 4, top: headerStyle === 'readout' ? 5 : 1 }}
          data-testid="ruler-label"
        >
          {formatRulerLabel(t)}
        </span>
      ))}

      {/* in/out + loop range — bracketed band, dimmed (not erased) when loop is off */}
      <div
        className="absolute bottom-0 top-0"
        style={{ left: bandLeft, width: bandW, background: 'var(--accent-selection)', opacity: loopEnabled ? 0.24 : 0.13 }}
      />
      {/* in bracket — interactive loop edge (R14: draggable + keyboard) */}
      <div
        {...bracketHandlers('in')}
        role="slider"
        aria-label="Loop in point"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration * 24)}
        aria-valuenow={Math.round(loop.start * 24)}
        aria-valuetext={tc(loop.start)}
        tabIndex={0}
        data-testid="shell-ruler-bracket-in"
        className="pointer-events-auto absolute z-[7] flex cursor-ew-resize items-center"
        style={{ left: bandLeft - 2, top: headerStyle === 'readout' ? 16 : 3, width: 13, height: zoneH - (headerStyle === 'readout' ? 18 : 5) }}
      >
        <svg className="pointer-events-none" width="9" height={zoneH - (headerStyle === 'readout' ? 18 : 5)} aria-hidden="true">
          <path d={`M7 0 L1 ${zoneH / 4} M7 0 L1 0 M7 0 L1 ${zoneH / 2.6}`} stroke="var(--accent-selection)" strokeWidth="1.6" fill="none" />
        </svg>
      </div>
      {/* out bracket — interactive loop edge (R14: draggable + keyboard) */}
      <div
        {...bracketHandlers('out')}
        role="slider"
        aria-label="Loop out point"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration * 24)}
        aria-valuenow={Math.round(loop.end * 24)}
        aria-valuetext={tc(loop.end)}
        tabIndex={0}
        data-testid="shell-ruler-bracket-out"
        className="pointer-events-auto absolute z-[7] flex cursor-ew-resize items-center"
        style={{ left: bandLeft + bandW - 7, top: headerStyle === 'readout' ? 16 : 3, width: 13, height: zoneH - (headerStyle === 'readout' ? 18 : 5) }}
      >
        <svg className="pointer-events-none" width="9" height={zoneH - (headerStyle === 'readout' ? 18 : 5)} aria-hidden="true">
          <path d={`M2 0 L8 ${zoneH / 4} M2 0 L8 0 M2 0 L8 ${zoneH / 2.6}`} stroke="var(--accent-selection)" strokeWidth="1.6" fill="none" />
        </svg>
      </div>

      {/* markers — larger pins, always-visible labels at readout zoom */}
      {scene.markers.map((m) => (
        <div
          key={m.id}
          data-tip={`${m.label} · ${tc(m.time)}`}
          data-tip-top
          className="absolute z-[6]"
          style={{ left: snapPxToDeviceGrid(m.time * pxPerSec) - 5, top: headerStyle === 'readout' ? 22 : 5 }}
          aria-label={`Marker ${m.label}`}
        >
          <svg width="10" height="13" viewBox="0 0 10 13" aria-hidden="true">
            <path d="M0 0h10v7.2L5 12.2 0 7.2V0z" fill={MARKER_COLORS[m.color]} stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
          </svg>
        </div>
      ))}

      {/* hover TC readout */}
      {hoverT !== null && (
        <span
          className="mono pointer-events-none absolute rounded-sm border border-strong bg-inset px-1 text-[11px] text-tmuted"
          style={{ left: Math.min(hoverT * pxPerSec + 8, contentW - 76), top: headerStyle === 'readout' ? 24 : 4 }}
        >
          {tc(hoverT)}
        </span>
      )}

      {menu.state && <ContextMenu {...menu.state} onClose={menu.close} />}
    </div>
  );
}
