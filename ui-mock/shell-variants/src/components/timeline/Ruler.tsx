/* Ruler — spec 05 §7/§14.3 + R15 T1 CapCut-tier ticks (canonical
   ruler-utils): adaptive label/tick intervals from frame-tier tables
   (labels ≥ 120 px, ticks ≥ 18 px, tick divides label evenly), labels
   MM:SS / H:MM:SS at second boundaries and `Xf` between, ticks virtualized
   to the visible window + buffer. Still: click-to-seek, in/out + loop
   shading with BRACKETS, markers (spec 16 §3.7 palette). 44px zone in
   readout mode (labels + tick strip), 22px slim.
   R19 markers v2 (th_mto2ytyo): the ruler is split into TWO bands — (top)
   the tick + timecode band, (bottom) a DEDICATED MARKER BAND (~10-14px,
   inset background + top hairline separator) where point pins (shields,
   10×13) and RANGE markers (translucent fill + 2px rails + shield end caps,
   timeline-marker-only.html §1.3/§1.4) live. Markers never visually enter
   lane territory. Pins are CLICKABLE (selectMarker — the inspector rail
   swaps to MarkerInspector) and keyboard-operable (Enter).
   R20-W5 (th_mtp5tlgu / timeline-cluster thread-3): the in/out brackets are
   FULL-BAND 12×(bandTop−3) handles anchored INSIDE the loop region, with
   real bracket glyphs derived from the handle height (never crops); the R19
   clamp+mirror is gone (anchoring inside makes it dead). */

import { useEffect, useRef, useState } from 'react';
import { useUi } from '../../state/useUiStore';
import { useHeaderStyle } from '../../state/variantHooks';
import { snapToFrame, tc } from '../../lib/timecode';
import { snapPxToDeviceGrid } from '../../lib/pixel';
import { createEdgeAutoScroll } from '../../lib/edgeScroll';
import { getRulerConfig, shouldShowLabel, formatRulerLabel, getRulerWindow, tickTimes } from '../../lib/rulerTiers';
import type { Marker, SceneJSON } from '../../lib/mockData';
import { ContextMenu, isMenuKey, useContextMenu, type MenuItem } from '../shell/ContextMenu';

/* shared marker-color map — Clip.tsx renders clip markers with the same
   8-token palette (single source, no cycle: Clip imports this module). */
export const MARKER_COLORS: Record<Marker['color'], string> = {
  red: 'var(--mk-red)', orange: 'var(--mk-orange)', yellow: 'var(--mk-yellow)', green: 'var(--mk-green)',
  blue: 'var(--mk-blue)', purple: 'var(--mk-purple)', pink: 'var(--mk-pink)', gray: 'var(--mk-gray)',
};

const MARKER_COLOR_ORDER: Marker['color'][] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];

/* shield pin path (spec 05-family): flat-bottom pennant, 10×13 viewBox —
   shared by the ruler point pins, the range end caps, and the clip markers
   (Clip.tsx renders the same path scaled to 8×10). */
const SHIELD_PATH = 'M0 0h10v7.2L5 12.2 0 7.2V0z';

/* fixes th_mto2ytyo — DEDICATED MARKER BAND geometry: bottom strip of the
   ruler zone, separated from the tick/label band by a hairline. Readout
   mode gets 14px (full 10×13 pins); slim mode 10px (pins scaled 8×10 — the
   same shield shape, no lane overflow). */
const markerBandHeight = (readout: boolean) => (readout ? 14 : 10);

/* §4.9 "Go to Marker ›" — REAL now (was honest-disabled): a custom menu row
   that expands an inline marker list (label + timecode); picking a row sets
   the playhead. The row owns its activation + menu.close() (custom-row
   contract); the toggle is aria-expanded so the submenu reads as such. */
function MarkerNavRow({ markers, onGo }: { markers: Marker[]; onGo: (t: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex w-full flex-col">
      <button
        type="button"
        role="menuitem"
        aria-expanded={open}
        data-testid="shell-menu-ruler-goto-marker"
        className="menu-item"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1 truncate text-left">Go to Marker</span>
        <span className="menu-sc mono" aria-hidden="true">{open ? '⌃' : '›'}</span>
      </button>
      {open && markers.map((m) => (
        <button
          key={m.id}
          type="button"
          role="menuitem"
          data-testid={`shell-menu-ruler-goto-${m.id}`}
          className="menu-item pl-6"
          onClick={() => onGo(m.time)}
        >
          <span className="min-w-0 flex-1 truncate text-left">{m.label}</span>
          <span className="menu-sc mono">{tc(m.time)}</span>
        </button>
      ))}
    </div>
  );
}

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
  /* R19 markers v2 band geometry (th_mto2ytyo) */
  const readout = headerStyle === 'readout';
  const bandH = markerBandHeight(readout);
  const bandTop = zoneH - bandH; // ticks/labels/brackets live above this line
  const pinW = readout ? 10 : 8;  // slim scales the same shield shape
  const pinH = readout ? 13 : 10;
  const setPlayhead = useUi((s) => s.setPlayhead);
  const loop = useUi((s) => s.loop);
  const loopEnabled = useUi((s) => s.loopEnabled);
  const addMarker = useUi((s) => s.addMarker);
  const clearInOut = useUi((s) => s.clearInOut);
  const setLoopEnabled = useUi((s) => s.setLoopEnabled);
  /* R19 marker v2: pin/range selection routes the inspector rail (the
     store's selectMarker clears the clip selection — one selection domain). */
  const selectMarker = useUi((s) => s.selectMarker);
  const selectedMarkerId = useUi((s) => s.selectedMarkerId);
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
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* inactive pointer id (R15-V2 P3 guard) */ }
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

  /* §4.9 ruler menu — marker at playhead, REAL Go-to-Marker submenu (R19:
     was an honest-disabled stub), in/out clearing, loop toggle, and the
     shared 8-color marker palette row (markerColorItems above). */
  const buildMenuItems = (): MenuItem[] => [
    { id: 'add-marker', label: 'Add marker at playhead', onSelect: () => addMarker(playhead) },
    scene.markers.length === 0
      ? { id: 'goto-marker', label: 'Go to Marker ›', disabled: true, tip: 'mock: this scene has no markers yet' }
      : {
          id: 'goto-marker',
          label: 'Go to Marker',
          custom: <MarkerNavRow markers={scene.markers} onGo={(t) => { menu.close(); setPlayhead(t); }} />,
        },
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

  /* R20-W5 (thread #57 / timeline-cluster thread-3): FULL-BAND bracket
     handles — 12px wide, spanning y 2 .. bandTop−1 (27px in readout, 9px in
     slim — bracketH-derived, ALWAYS clear of the marker band), anchored
     INSIDE the loop region (in at bandLeft, out at bandRight−12). Because the
     handles sit inside the region by construction, the R19 clamp+mirror
     (data-mirrored / scaleX(−1)) hacks are DELETED — only a defensive clamp
     into [0, contentW−12] survives. The glyphs are real brackets (⌐¬ caps)
     with every coordinate derived from the ACTUAL svg height, so nothing can
     ever crop (the old fan's third blade ran to y 16.92 inside a 15px svg). */
  const HANDLE_W = 12;
  const handleTop = 2;
  const handleH = Math.max(6, bandTop - 3); // readout: 44−14−3 = 27 · slim: 22−10−3 = 9
  const inHandleX = Math.max(0, Math.min(bandLeft, Math.max(0, contentW - HANDLE_W)));
  const outHandleX = Math.max(0, Math.min(bandLeft + bandW - HANDLE_W, Math.max(0, contentW - HANDLE_W)));

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
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* inactive pointer id (R15-V2 P3 guard) */ }
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
      {/* fixes th_mto2ytyo — DEDICATED MARKER BAND: inset background + top
          hairline separator, the full content width. Point pins + range
          markers render INSIDE it — markers never visually enter lane
          territory. Z-order (documented): band bg = z-auto (first child,
          paints below everything); ticks = un-z'd, later in DOM order so
          they paint over the band's tint; loop band = z-auto; pins/ranges
          z 6; brackets z 7 (the interactive edges win the hit test); the
          playhead lives on the TIMELINE's z 100 line, above the whole ruler. */}
      <div
        data-testid="ruler-marker-band"
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-hairline"
        style={{ height: bandH, background: 'color-mix(in srgb, var(--bg-inset) 70%, var(--bg-shell))' }}
      />

      {/* ticks — virtualized CapCut-tier window (major = on the label grid);
          anchored to the MARKER BAND's top hairline (R19 band split) */}
      {ticks.map((t) => {
        const major = isMajor(t);
        return (
          <div
            key={t}
            className="absolute w-px"
            style={{ left: snapPxToDeviceGrid(t * pxPerSec), bottom: bandH, height: major ? tickH : tickH * 0.55, background: 'var(--text-faint)', opacity: major ? 0.9 : 0.45 }}
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
      {/* in bracket — FULL-BAND handle anchored INSIDE the loop region (R14
          grammar: draggable + keyboard slider; R20-W5 thread-3: 12×27, real
          "[" glyph, bracketH-derived coordinates — no clamp, no mirror). The
          12px-wide strip may briefly pass under an 11px TC label; z 7 wins
          and loop edges usually sit between labels (contract's accepted
          trade for the bigger grab target). */}
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
        data-tip={`In ${tc(loop.start)}`}
        className="pointer-events-auto absolute z-[7] flex cursor-ew-resize items-center"
        style={{ left: inHandleX, top: handleTop, width: HANDLE_W, height: handleH }}
      >
        <svg className="pointer-events-none" width="8" height={handleH - 2} aria-hidden="true">
          {/* open "[" whose stem rides the region edge + 3 grip ticks at
              25/50/75% — ALL Y coords derive from this svg's own height */}
          <path
            d={`M7 1 L2 1 L2 ${handleH - 3} L7 ${handleH - 3} M4 ${(handleH - 2) * 0.25 + 1} L7 ${(handleH - 2) * 0.25 + 1} M4 ${(handleH - 2) * 0.5 + 1} L7 ${(handleH - 2) * 0.5 + 1} M4 ${(handleH - 2) * 0.75 + 1} L7 ${(handleH - 2) * 0.75 + 1}`}
            stroke="var(--accent-selection)"
            strokeWidth="1.6"
            fill="none"
          />
        </svg>
      </div>
      {/* out bracket — the mirrored "]" at the loop region's right edge,
          same full-band geometry (R20-W5 thread-3: clamp+mirror deleted) */}
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
        data-tip={`Out ${tc(loop.end)}`}
        className="pointer-events-auto absolute z-[7] flex cursor-ew-resize items-center"
        style={{ left: outHandleX, top: handleTop, width: HANDLE_W, height: handleH }}
      >
        <svg className="pointer-events-none" width="8" height={handleH - 2} aria-hidden="true" style={{ position: 'absolute', right: 0 }}>
          <path
            d={`M1 1 L6 1 L6 ${handleH - 3} L1 ${handleH - 3} M1 ${(handleH - 2) * 0.25 + 1} L4 ${(handleH - 2) * 0.25 + 1} M1 ${(handleH - 2) * 0.5 + 1} L4 ${(handleH - 2) * 0.5 + 1} M1 ${(handleH - 2) * 0.75 + 1} L4 ${(handleH - 2) * 0.75 + 1}`}
            stroke="var(--accent-selection)"
            strokeWidth="1.6"
            fill="none"
          />
        </svg>
      </div>

      {/* ---- R19 markers v2 (th_mto2ytyo): POINT pins — clickable shield
           buttons INSIDE the marker band (10×13 readout / 8×10 slim).
           pointerdown stopPropagation: pressing a pin must not scrub the
           playhead; click/Enter select the marker (inspector rail swap).
           Selected pin gets the accent ring (file-2 selected language). ---- */}
      {scene.markers.filter((m) => !m.duration || m.duration <= 0).map((m) => (
        <button
          key={m.id}
          type="button"
          data-tip={`${m.label} · ${tc(m.time)}`}
          data-tip-top
          data-testid={`ruler-marker-${m.id}`}
          aria-label={`Marker ${m.label}`}
          className="absolute z-[6] block cursor-pointer border-0 bg-transparent p-0"
          style={{
            left: snapPxToDeviceGrid(m.time * pxPerSec) - pinW / 2,
            top: bandTop + (bandH - pinH) / 2,
            width: pinW,
            height: pinH,
            outline: selectedMarkerId === m.id ? '1px solid var(--accent-selection)' : undefined,
            outlineOffset: 0,
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); selectMarker(m.id); }}
          onKeyDown={(e) => {
            /* a11y: explicit Enter/Space activation (button semantics — jsdom
               does not synthesize the click; the ruler root must not see it) */
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              selectMarker(m.id);
            }
          }}
        >
          <svg width={pinW} height={pinH} viewBox="0 0 10 13" aria-hidden="true" className="block">
            <path d={SHIELD_PATH} fill={MARKER_COLORS[m.color]} stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
          </svg>
        </button>
      ))}

      {/* ---- R19 markers v2: RANGE markers — a span band inside the marker
           band (timeline-marker-only.html §1.4): translucent fill (20%) +
           2px solid top/bottom rails + full-opacity shield end caps at both
           ends. Click selects the marker (same selectMarker routing).
           R19-TODO(orchestrator): range end-drag (the loop-bracket drag
           grammar cloned onto the caps) — v2 polish, deliberately NOT in this
           round; the band is click-select only. ---- */}
      {scene.markers.filter((m): m is Marker & { duration: number } => !!m.duration && m.duration > 0).map((m) => {
        const left = snapPxToDeviceGrid(m.time * pxPerSec);
        const w = Math.max(13, snapPxToDeviceGrid(m.duration * pxPerSec)); // min band width (was BRACKET_W)
        return (
          <button
            key={m.id}
            type="button"
            role="button"
            data-tip={`${m.label} · ${tc(m.time)}–${tc(m.time + m.duration!)}`}
            data-tip-top
            data-testid={`ruler-range-${m.id}`}
            aria-label={`Marker ${m.label} (range)`}
            className="absolute z-[6] cursor-pointer border-0 bg-transparent p-0"
            style={{
              left,
              top: bandTop + 1,
              width: w,
              height: bandH - 2,
              outline: selectedMarkerId === m.id ? '1px solid var(--accent-selection)' : undefined,
              outlineOffset: 0,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); selectMarker(m.id); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                selectMarker(m.id);
              }
            }}
          >
            <span className="absolute" aria-hidden="true" style={{ left: 2, right: 2, top: 2, bottom: 2, background: `color-mix(in srgb, ${MARKER_COLORS[m.color]} 20%, transparent)` }} />
            <span className="absolute" aria-hidden="true" style={{ left: 2, right: 2, top: 0, height: 2, background: MARKER_COLORS[m.color] }} />
            <span className="absolute" aria-hidden="true" style={{ left: 2, right: 2, bottom: 0, height: 2, background: MARKER_COLORS[m.color] }} />
            <svg className="absolute" width={pinW} height={pinH} viewBox="0 0 10 13" aria-hidden="true" style={{ left: -pinW / 2 + 2, top: (bandH - 2 - pinH) / 2 }}>
              <path d={SHIELD_PATH} fill={MARKER_COLORS[m.color]} stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
            </svg>
            <svg className="absolute" width={pinW} height={pinH} viewBox="0 0 10 13" aria-hidden="true" style={{ right: -pinW / 2 + 2, top: (bandH - 2 - pinH) / 2 }}>
              <path d={SHIELD_PATH} fill={MARKER_COLORS[m.color]} stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
            </svg>
          </button>
        );
      })}

      {/* hover TC readout (kept above the tick band, clear of the marker band) */}
      {hoverT !== null && (
        <span
          className="mono pointer-events-none absolute rounded-sm border border-strong bg-inset px-1 text-[11px] text-tmuted"
          style={{ left: Math.min(hoverT * pxPerSec + 8, contentW - 76), top: readout ? 16 : 1 }}
        >
          {tc(hoverT)}
        </span>
      )}

      {menu.state && <ContextMenu {...menu.state} onClose={menu.close} />}
    </div>
  );
}
