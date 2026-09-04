/* Ruler — spec 05 §7/§14.3: DOM ticks + labels, click-to-seek, in/out +
   loop shading with BRACKETS (band stays visible when loop is off — dimmed,
   never erased), markers (spec 16 §3.7 palette), frame ticks at high zoom.
   44px zone in readout mode (labels + 22px tick strip), 22px slim. */

import { useRef, useState } from 'react';
import { useUi } from '../../state/useUiStore';
import { useHeaderStyle } from '../../state/variantHooks';
import { snapToFrame, tc, tcRuler } from '../../lib/timecode';
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

export function Ruler({ scene, duration, pxPerSec, playhead }: { scene: SceneJSON; duration: number; pxPerSec: number; playhead: number }) {
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
  const [hoverT, setHoverT] = useState<number | null>(null);

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

  const contentW = (duration + 4) * pxPerSec;

  // adaptive density (spec 05 tick/label spacing rules, simplified)
  const labelEvery = pxPerSec >= 120 ? 2 : pxPerSec >= 20 ? 5 : 15;
  const minorEvery = pxPerSec >= 20 ? 1 : 5;
  const frameTicks = pxPerSec >= 110; // sub-second reference for trim/blade work

  const seek = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    // frame-grid discipline (R13 review: raw pixel times landed off-grid)
    setPlayhead(Math.max(0, snapToFrame((clientX - box.left) / pxPerSec)));
  };

  const ticks: number[] = [];
  for (let t = 0; t <= duration + 2; t += minorEvery) ticks.push(t);
  const frameTickList: number[] = [];
  if (frameTicks) {
    const step = pxPerSec >= 200 ? 1 / 24 : 2 / 24; // every 1-2 frames
    for (let t = 0; t <= duration + 2; t += step) frameTickList.push(t);
  }
  const labels: number[] = [];
  for (let t = 0; t <= duration + 2; t += labelEvery) labels.push(t);

  const tickH = headerStyle === 'readout' ? 12 : 7;
  const isMajor = (t: number) => Math.abs(t % labelEvery) < 1e-6;

  const bandLeft = loop.start * pxPerSec;
  const bandW = Math.max(2, (loop.end - loop.start) * pxPerSec);

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
        seek(e.clientX);
      }}
      onPointerMove={(e) => {
        const box = ref.current?.getBoundingClientRect();
        if (box) setHoverT(Math.max(0, (e.clientX - box.left) / pxPerSec));
        if (seeking.current && e.buttons === 1) seek(e.clientX);
      }}
      onPointerUp={() => { seeking.current = false; }}
      onPointerCancel={() => { seeking.current = false; }}
      onLostPointerCapture={() => { seeking.current = false; }}
      onPointerLeave={() => setHoverT(null)}
    >
      {/* frame ticks (sub-second reference) */}
      {frameTickList.map((t, i) => (
        <div key={`f${i}`} className="absolute bottom-0 w-px" style={{ left: t * pxPerSec, height: 4, background: 'var(--text-faint)', opacity: 0.35 }} />
      ))}

      {/* minor + major ticks */}
      {ticks.map((t) => (
        <div
          key={t}
          className="absolute bottom-0 w-px"
          style={{ left: t * pxPerSec, height: isMajor(t) ? tickH : tickH * 0.55, background: 'var(--text-faint)', opacity: isMajor(t) ? 0.9 : 0.45 }}
        />
      ))}

      {/* labels */}
      {labels.map((t) => (
        <span
          key={t}
          className="mono absolute select-none text-[11px] text-tmuted"
          style={{ left: t * pxPerSec + 4, top: headerStyle === 'readout' ? 5 : 1 }}
        >
          {tcRuler(t, frameTicks)}
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
          style={{ left: m.time * pxPerSec - 5, top: headerStyle === 'readout' ? 22 : 5 }}
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
