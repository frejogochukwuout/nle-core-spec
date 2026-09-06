/* Timeline — the RH quick-cut port (DESIGN D7/D10, extraction §3).
   Structure (mini deviation, audit M3): ONE shared horizontal scroll
   wrapper contains ruler + lanes + playhead overlay; the tools row is
   fixed above it.

   Coordinate law (review fix #1/#3): ALL time↔px math positions in px
   from the shared RENDER ORIGIN — the scroll content's left + 10px.
   Ruler marks are px-positioned (left: t*pps), NOT %.

   Gesture law (review fix #4): one gesture at a time — startGesture
   bails while another drag is active and tracks its own pointerId;
   the store's interaction lock gates everything but Esc.

   Snap law (review fix #2): magnet targets = SAME-TRACK neighbor edges
   + playhead, NEVER the dragged clip's own edges. R18e: an engaged
   magnet paints the snap guide (2px, tracks-wide). R18i (thread #12):
   the toggle is the MAGNET ONLY — the pro-NLE convention (Premiere /
   Resolve / FCP / Avid snap to edit points + playhead, never a time
   grid); the 0.5s beat-quantize left the snap path, so a snap-on drag
   is smooth except where it magnet-jumps to an edit point. R19: BOTH
   edges of the moving clip magnet (OT snapGroupEdges parity — nearest
   wins, ties → left) and the magnet field is FROZEN at gesture start
   (targets from the pre-drag snapshot: a gesture never magnetizes to
   positions it created).

   R21 (user P0 revert, 2026-09-06): the drag law is the R18k clamp law
   RESTORED — the mover clamps between its same-track neighbors
   (neighbors never move mid-gesture), the preview is the committed
   state, the UP seals one plain history entry. The R19 insert-push and
   R20 escape/verdict rounds are RETIRED by the user's directive.
   R19 (thread #51): trim gestures draw the GHOST edge — the
   dotted extent of how much further the edge can reach (outward only).

   R18e additions: RH cut styles (cut head / cut tail at playhead —
   feedback #7), ripple toggle (#16), filmstrip↔color-block toggle
   (#15), audio-lane visibility (#8), real waveform envelopes (#12),
   pool→timeline DnD drop zones (#13 polish wave / v0.2 deferral closed),
   playhead Enter no-op (#11). */

import { useRef, useState, useEffect, useLayoutEffect, memo, type CSSProperties, type PointerEvent as ReactPointerEvent, type DragEvent as ReactDragEvent, useMemo } from 'react';
import {
  Undo2,
  Redo2,
  Trash2,
  Magnet,
  ZoomOut,
  ZoomIn,
  FoldHorizontal,
  Film,
  Eye,
  EyeOff,
  PanelBottomClose,
  PanelBottomOpen,
} from 'lucide-react';
/* R18g (thread #23): purpose-drawn trim glyphs — the lucide
   ArrowLeftToLine/ArrowRightToLine pair read as jump-to-start/end.
   R18h (thread #9): SplitIcon joins the family — Scissors read as a
   different metaphor; the split glyph cuts the clip in the middle. */
import { TrimStartIcon, TrimEndIcon, SplitIcon } from '../lib/icons';
import { useMini, visibleTracks, boundClips } from '../state/useMini';
import { useKeys } from '../hooks/useKeys';
import { usePlayhead } from '../hooks/usePlayhead';
import {
  clipsOfTrack,
  contentEnd,
  insertionAt,
  labelStepFor,
  magnetTarget,
  magnetMove,
  ppsFor,
  PPS_STEPS,
  timeToPx,
  pxToTime,
  trimGhostBound,
} from '../lib/geometry';
import { fmtRulerLabel, fmtTimecode } from '../lib/timecode';
import { filmstripFor } from '../lib/filmstrip';
import { waveformFor } from '../lib/waveform';
import { POOL_DRAG_TYPE, isDroppable, poolDrag } from '../shell/MediaPool';
import type { Clip, Media, Track } from '../lib/mockData';
import './timeline.css';

const DRAG_THRESHOLD_PX = 5;
/** R18k (review P1-1): the FIXED track-head column — the NLE-standard
 *  home for the lane heads (selectors/labels). Clips at t=0 start after
 *  it, so the head NEVER overlays a clip's drag/trim hit zones (the old
 *  in-lane badge sat on the same pixels as a clip's head, fine while it
 *  was pointer-events:none, wrong the moment it became a select).
 *  Sticky: heads stay pinned at the scrollport's left edge while the
 *  lanes scroll under them. */
const TRACK_HEAD_W = 44;
/** shared render origin: content-left → ruler/lane/playhead t=0 (px).
 *  R18k: stage margin 2 + head column 44 — every t↔px consumer (ruler
 *  padding, playhead overlay left, lane/drop/gesture origin) flows
 *  through THIS constant, so the whole law moves as one. */
const RENDER_ORIGIN_PX = 2 + TRACK_HEAD_W;
/** R18k: the compact strip's own origin — no head rail there (the 30px
 *  expand button sits OUTSIDE the scroll as a flex sibling), so pills /
 *  marks / playhead keep the classic 10px. Keeping the strip at 10 (vs
 *  46) means toggling minimize moves t=0 by just 6px, not 36. */
const MIN_ORIGIN_PX = 10;

/* ---------- tools row (RH-verbatim look, R18e additions) ---------- */

/* exported for the solo Toolbar story (R18k storybook restructure —
   the micro-level review surface) */
export function ToolsRow() {
  const zoomStep = useMini((s) => s.zoomStep);
  const snapOn = useMini((s) => s.snapOn);
  const rippleOn = useMini((s) => s.rippleOn);
  const filmstripOn = useMini((s) => s.filmstripOn);
  const audioLaneVisible = useMini((s) => s.audioLaneVisible);
  /* R18k (thread #23): video-only mode has no audio lane — the eye toggle
   * would control state nothing renders, so it leaves the toolbar. */
  const trackMode = useMini((s) => s.trackMode);
  const canUndo = useMini((s) => s.past.length > 0);
  const canRedo = useMini((s) => s.future.length > 0);
  const selectedId = useMini((s) => s.selectedId);
  const undo = useMini((s) => s.undo);
  const redo = useMini((s) => s.redo);
  const splitAtPlayhead = useMini((s) => s.splitAtPlayhead);
  const deleteSelected = useMini((s) => s.deleteSelected);
  const cutHead = useMini((s) => s.cutHeadAtPlayhead);
  const cutTail = useMini((s) => s.cutTailAtPlayhead);
  const toggleSnap = useMini((s) => s.toggleSnap);
  const toggleRipple = useMini((s) => s.toggleRipple);
  const toggleFilmstrip = useMini((s) => s.toggleFilmstrip);
  const toggleAudioLane = useMini((s) => s.toggleAudioLane);
  const setZoomStep = useMini((s) => s.setZoomStep);
  const toggleTimelineMin = useMini((s) => s.toggleTimelineMin);

  return (
    <div className="qc-timeline__tools" data-testid="mini-timeline-tools">
      {/* R18k (thread #2): the minimize toggle leads the row — a MODE
          switch, not an edit action. First position = the button keeps
          its slot while the toolbar persists across the two modes (the
          reviewer's "stays while toggling" reading), and the mode
          switches group at the row's head instead of the tail. */}
      <div className="qc-toolbar__group">
        <button
          type="button"
          className="qc-toolbar__icon"
          aria-label="Minimize timeline"
          title="Minimize the timeline — compact strip, editing stays live"
          onClick={() => toggleTimelineMin()}
          data-testid="mini-btn-timeline-min"
        >
          <PanelBottomClose />
        </button>
      </div>
      <div className="qc-toolbar__group">
        <button
          type="button"
          className="qc-toolbar__icon"
          aria-label="Undo"
          title="Undo (⌘Z)"
          disabled={!canUndo}
          onClick={() => undo()}
          data-testid="mini-btn-undo"
        >
          <Undo2 />
        </button>
        <button
          type="button"
          className="qc-toolbar__icon"
          aria-label="Redo"
          title="Redo (⌘⇧Z)"
          disabled={!canRedo}
          onClick={() => redo()}
          data-testid="mini-btn-redo"
        >
          <Redo2 />
        </button>
      </div>
      <div className="qc-toolbar__group">
        <button
          type="button"
          className="qc-toolbar__icon"
          aria-label="Split at playhead"
          title="Split at playhead (S)"
          onClick={() => splitAtPlayhead()}
          data-testid="mini-btn-split"
        >
          <SplitIcon />
        </button>
        <button
          type="button"
          className="qc-toolbar__icon"
          aria-label="Cut head at playhead"
          title="Cut head at playhead ([) — 裁剪开始, discards the clip's part before the playhead"
          onClick={() => cutHead()}
          data-testid="mini-btn-cuthead"
        >
          <TrimStartIcon />
        </button>
        <button
          type="button"
          className="qc-toolbar__icon"
          aria-label="Cut tail at playhead"
          title="Cut tail at playhead (]) — 裁剪结束, discards the clip's part after the playhead"
          onClick={() => cutTail()}
          data-testid="mini-btn-cuttail"
        >
          <TrimEndIcon />
        </button>
        <button
          type="button"
          className="qc-toolbar__icon"
          aria-label="Delete selected clip"
          title="Delete (Del)"
          disabled={!selectedId}
          onClick={() => deleteSelected()}
          data-testid="mini-btn-delete"
        >
          <Trash2 />
        </button>
        <button
          type="button"
          className={`qc-toolbar__icon${snapOn ? ' is-active' : ''}`}
          aria-label={snapOn ? 'Snapping on' : 'Snapping off'}
          aria-pressed={snapOn}
          title="Snapping — magnet to clip edges + playhead (NLE standard) — off by default"
          onClick={() => toggleSnap()}
          data-testid="mini-btn-snap"
        >
          <Magnet />
        </button>
        <button
          type="button"
          className={`qc-toolbar__icon${rippleOn ? ' is-active' : ''}`}
          aria-label={rippleOn ? 'Ripple edit on' : 'Ripple edit off'}
          aria-pressed={rippleOn}
          title="Ripple edit — deletes/trims close the gap (downstream clips follow)"
          onClick={() => toggleRipple()}
          data-testid="mini-btn-ripple"
        >
          <FoldHorizontal />
        </button>
      </div>
      <div className="qc-toolbar__group">
        <button
          type="button"
          className={`qc-toolbar__icon${filmstripOn ? ' is-active' : ''}`}
          aria-label={filmstripOn ? 'Filmstrip clip bodies' : 'Color-block clip bodies'}
          aria-pressed={filmstripOn}
          title="Clip bodies: filmstrip ↔ color blocks"
          onClick={() => toggleFilmstrip()}
          data-testid="mini-btn-filmstrip"
        >
          <Film />
        </button>
        {trackMode === 'paired' && (
          <button
            type="button"
            className={`qc-toolbar__icon${audioLaneVisible ? ' is-active' : ''}`}
            aria-label={audioLaneVisible ? 'Audio lane visible' : 'Audio lane hidden'}
            aria-pressed={audioLaneVisible}
            title="Show / hide the audio lane (A1)"
            onClick={() => toggleAudioLane()}
            data-testid="mini-btn-audiolane"
          >
            {audioLaneVisible ? <Eye /> : <EyeOff />}
          </button>
        )}
      </div>
      <div className="qc-toolbar__group qc-toolbar__group--right" data-testid="mini-timeline-zoom">
        <button
          type="button"
          className="qc-toolbar__mini-icon"
          aria-label="Zoom out"
          title="Zoom out (−)"
          disabled={zoomStep === 0}
          onClick={() => setZoomStep(zoomStep - 1)}
          data-testid="mini-btn-zoomout"
        >
          <ZoomOut />
        </button>
        <input
          className="qc-toolbar__slider"
          type="range"
          min={0}
          max={PPS_STEPS.length - 1}
          step={1}
          aria-label="Timeline zoom"
          /* PR69 C7b: announce units — the raw step number ("2") is
           * meaningless non-visually; the px/s scale is the zoom's
           * actual semantics. */
          aria-valuetext={`${PPS_STEPS[zoomStep]} pixels per second`}
          value={zoomStep}
          onChange={(e) => setZoomStep(Number(e.target.value))}
          style={{ ['--qc-slider-pct' as string]: `${(zoomStep / (PPS_STEPS.length - 1)) * 100}%` }}
          data-testid="mini-zoom-slider"
        />
        <button
          type="button"
          className="qc-toolbar__mini-icon"
          aria-label="Zoom in"
          title="Zoom in (+)"
          disabled={zoomStep === PPS_STEPS.length - 1}
          onClick={() => setZoomStep(zoomStep + 1)}
          data-testid="mini-btn-zoomin"
        >
          <ZoomIn />
        </button>
      </div>
    </div>
  );
}

/* ---------- ruler (px-positioned marks — review fix #1) ---------- */

/** R18j (thread #13): `compact` — the minimized strip's slim ruler: every
 *  OTHER label (×2 step), ticks/tick-band suppressed via CSS
 *  (.qc-ruler--min), 16px tall. Same px coordinate law. */
function RulerMarks({ pps, endTime, compact }: { pps: number; endTime: number; compact?: boolean }) {
  const marks: React.ReactNode[] = [];
  const step = labelStepFor(pps) * (compact ? 2 : 1);
  const last = Math.floor((endTime + 1e-9) / step) * step;
  for (let t = 0; t <= endTime + 1e-9; t += step) {
    const isLast = t === last;
    marks.push(
      <div
        key={t}
        className={`qc-ruler__mark${t === 0 ? ' is-first' : ''}${isLast ? ' is-last' : ''}`}
        style={{ left: timeToPx(t, pps) }}
        data-mark-time={t}
      >
        <span className="qc-ruler__label">{fmtRulerLabel(t)}</span>
        <span className="qc-ruler__tick" />
      </div>,
    );
  }
  return <>{marks}</>;
}

/* ---------- waveform body (R18e: real envelope, feedback #12) ---------- */

function WaveformBody({ media, widthPx }: { media: Media; widthPx: number }) {
  const bars = Math.max(8, Math.min(Math.round(widthPx / 5), 160));
  // R18f (review P3): memoized — Lane re-renders on every playhead tick and
  // zoom step; the envelope is deterministic per (media, bars)
  const values = useMemo(() => waveformFor(media, bars), [media, bars]);
  // viewBox: N units wide × 100 tall; each bar 0.7 wide, centered vertically.
  // R18f wave-2 P1 regression guard: the SVG is sized explicitly on BOTH the
  // CSS class and inline — an absolutely-positioned replaced element with
  // inset:0 alone lets height:auto resolve from the viewBox ratio
  // (336x100 → 501px in a 36px lane → every bar clipped invisible).
  return (
    <svg
      className="qc-track-item__waveform"
      viewBox={`0 0 ${bars} 100`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      style={{ width: '100%', height: '100%' }}
    >
      {values.map((v, i) => {
        const h = v * 84;
        return <rect key={i} x={i + 0.15} y={50 - h / 2} width={0.7} height={h} rx={0.35} fill="currentColor" />;
      })}
    </svg>
  );
}

/* ---------- clip ---------- */

interface ClipProps {
  clip: Clip;
  media: Media | undefined;
  pps: number;
  snapOn: boolean;
  selected: boolean;
  filmstripOn: boolean;
  /** magnet targets for THIS clip: same-track neighbor edges + playhead
   *  (own edges excluded — review fix #2) */
  snapTargets: number[];
  /** R18e: report the engaged magnet target (or null) for the snap guide */
  onSnapGuide: (t: number | null) => void;
  /** R18j (thread #13): pill rendering for the minimized strip — no
   *  filmstrip/waveform/block body, label-only, fully-rounded ends. The
   *  gesture engine (move + trim zones + auto-scroll) is IDENTICAL, so
   *  dragging / trimming / arranging stay live while minimized. */
  compact?: boolean;
  /** R18k: this clip's px origin within the scroll content — the lane
   *  (46, after the fixed head rail) vs the compact strip (10, no rail).
   *  The gesture math is origin-relative; the default matches full lanes. */
  originPx?: number;
  /** R19 (thread #51): the clip reports its outward trim (the ghost-edge
   *  signal) — the LANE paints the ghost (the clip body clips overflow,
   *  and the ghost extends beyond the clip's own box). */
  onTrimGhost?: (ghost: { id: string; edge: 'start' | 'end' } | null) => void;
}

/* exported for the solo Clip story (R18k storybook restructure — the
   clip-anatomy review surface at natural size, no panel chrome).
   PR69 C56: memoized — the playhead tick no longer re-renders the whole
   clip tree (Lane passes a per-track memoized target map; the playhead
   magnet target is read live inside the gesture, where it is frozen).
   PR69 C2: role="button" + aria-pressed — the clip finally exposes
   name/role/value (WCAG 4.1.2); Enter activates (select), Space routes
   to the global transport law (C46 — registered deviation). */
export const ClipItem = memo(function ClipItem({ clip, media, pps, snapOn, selected, filmstripOn, snapTargets, onSnapGuide, compact, originPx = RENDER_ORIGIN_PX, onTrimGhost }: ClipProps) {
  const select = useMini((s) => s.select);
  const beginDrag = useMini((s) => s.beginDrag);
  const endDrag = useMini((s) => s.endDrag);
  const cancelDrag = useMini((s) => s.cancelDrag);
  const previewMove = useMini((s) => s.previewMove);
  const previewTrim = useMini((s) => s.previewTrim);
  const trimClip = useMini((s) => s.trimClip);
  const rippleOn = useMini((s) => s.rippleOn); // R18f: handle hints change under ripple
  const [dragging, setDragging] = useState(false);

  /* gesture session (component-held; the store holds the doc snapshot).
   *  R18i adds contentEl + lastX: the edge auto-scroll loop re-applies the
   *  gesture against the LIVE content rect while the timeline scrolls.
   *  R19 adds snapStart/snapEnd: the RESTING edges at pointerdown — the
   *  ghost's outward test compares the request against them (a trim that
   *  moves the edge away from the resting position is outward). */
  const g = useRef<{
    kind: 'move' | 'trim-start' | 'trim-end' | null;
    pointerId: number | null; // this gesture owns exactly one pointer (fix #4)
    startX: number;
    grabOffset: number; // pointerTime − clip.start at pointerdown
    active: boolean;
    id: string;
    contentEl: HTMLElement | null; // the shared scroll content (origin law)
    lastX: number; // latest pointer clientX (auto-scroll reads it each frame)
    snapStart: number; // resting clip.start at pointerdown (R19 ghost law)
    snapEnd: number; // resting clip end at pointerdown (R19 ghost law)
  }>({ kind: null, pointerId: null, startX: 0, grabOffset: 0, active: false, id: '', contentEl: null, lastX: 0, snapStart: 0, snapEnd: 0 });
  const autoScrollRaf = useRef<number | null>(null);
  /** R18k (panel thread #1): WHICH edge is being trimmed while the
   *  gesture runs — drives the trim-mode edge shade (the standing filmstrip
   *  shade is gone; it returns ONLY as this affordance). */
  const [trimmingEdge, setTrimmingEdge] = useState<'start' | 'end' | null>(null);

  /* PR69 C9: unmount mid-gesture (story switch, HMR, parent-driven
   * unmount) must release the interaction lock + pending window —
   * otherwise every mutating key stays dead except Esc, with no visible
   * cause. The 5px pre-activation case only needs the pending flag
   * dropped (no lock was taken yet). */
  useEffect(
    () => () => {
      const gs = g.current;
      if (!gs.kind) return;
      stopAutoScroll();
      if (gs.active) cancelDrag();
      useMini.getState().endPendingGesture();
      g.current = { kind: null, pointerId: null, startX: 0, grabOffset: 0, active: false, id: '', contentEl: null, lastX: 0, snapStart: 0, snapEnd: 0 };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs + stable store actions only
    [],
  );

  const timeAt = (clientX: number, el: HTMLElement): number => {
    const content = el.closest('[data-qc-scroll-content]') as HTMLElement | null;
    const origin = (content ? content.getBoundingClientRect().left : 0) + originPx;
    return pxToTime(clientX - origin, pps);
  };

  const startGesture = (
    e: ReactPointerEvent<HTMLElement>,
    kind: 'move' | 'trim-start' | 'trim-end',
  ) => {
    if (e.button !== 0) return;
    if (useMini.getState().dragActive) return; // one gesture at a time (fix #4)
    select(clip.id); // select-on-pointerdown (before the lock can engage)
    /* PR69 C53: the pending window opens at POINTERDOWN — the mutating
     * keyboard surface dies here, not 5px later (⌘Z under a held
     * pointer was live-proven). Cleared at finish/unmount. */
    useMini.getState().beginPendingGesture();
    // R19: the clip owns this pointerdown — the lane's empty-area track
    // select (thread #26) must not fire through the bubbling phase
    e.stopPropagation();
    g.current = {
      kind,
      pointerId: e.pointerId,
      startX: e.clientX,
      grabOffset: timeAt(e.clientX, e.currentTarget as HTMLElement) - clip.start,
      active: false,
      id: clip.id,
      contentEl: (e.currentTarget as HTMLElement).closest(
        '[data-qc-scroll-content]',
      ) as HTMLElement | null,
      lastX: e.clientX,
      snapStart: clip.start,
      snapEnd: clip.start + clip.duration,
    };
    /* R20 (live-caught robustness bug): untrusted pointers (jsdom,
     * synthetic dispatch, CDP races) throw NotFoundError from
     * setPointerCapture — the release side was always guarded, the
     * capture side was not, and the throw killed the event dispatch
     * mid-gesture (live page errors on record). Capture is an
     * enhancement (outside-element tracking); the gesture itself runs
     * from the React handlers either way (registered micro-delta: OT
     * uses document listeners instead of capture). */
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* untrusted pointer — the gesture proceeds without capture */
    }
  };

  /** apply the gesture at a pointer position (shared by pointermove and
   *  the auto-scroll loop — the loop's clientX is the STATIONARY pointer,
   *  but the content rect moves under it as the timeline scrolls) */
  const applyGesture = (clientX: number) => {
    const gs = g.current;
    if (!gs.kind || gs.id !== clip.id || !gs.active) return;
    const content = gs.contentEl;
    const origin = (content ? content.getBoundingClientRect().left : 0) + originPx;
    const t = pxToTime(clientX - origin, pps);
    /* PR69 C56: the playhead magnet target is read LIVE (getState, no
     * subscription) and prepended to the frozen neighbor edges — since
     * C19 the tick loop freezes while dragActive, so the field is exactly
     * as static as it was when Lane threaded the prop down, without the
     * per-tick re-render of the whole clip tree. */
    const targets = [useMini.getState().playhead, ...snapTargets];
    if (gs.kind === 'move') {
      const raw = t - gs.grabOffset;
      /* R19: BOTH edges magnet (OT snapGroupEdges parity — the left edge
       * AND the right edge of the moving clip are candidates; nearest
       * wins, ties → left). The guide paints at the engaged edge's
       * target. The mover CLAMPS between its neighbors (R21 revert) —
       * overlap is impossible, so a snap target beyond the clamp bound
       * lands on the clamp, not past it. */
      const m = snapOn ? magnetMove(raw, pps, clip.duration, targets) : null;
      onSnapGuide(m ? m.guide : null);
      previewMove(clip.id, m ? m.start : raw);
    } else if (gs.kind === 'trim-start') {
      const magnet = snapOn ? magnetTarget(t, pps, targets) : null;
      onSnapGuide(magnet);
      previewTrim(clip.id, 'start', magnet !== null ? magnet : t);
      /* R19 (thread #51): the ghost signal fires only on an OUTWARD
       *  request (left of the resting start) — the lane paints the dotted
       *  extent; inward trims and no-room bounds never ghost. */
      onTrimGhost?.(t < gs.snapStart - 1e-9 ? { id: clip.id, edge: 'start' } : null);
    } else {
      const magnet = snapOn ? magnetTarget(t, pps, targets) : null;
      onSnapGuide(magnet);
      previewTrim(clip.id, 'end', magnet !== null ? magnet : t);
      onTrimGhost?.(t > gs.snapEnd + 1e-9 ? { id: clip.id, edge: 'end' } : null);
    }
  };

  const stopAutoScroll = () => {
    if (autoScrollRaf.current !== null) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = null;
    }
  };

  /** R18i (thread #12, "dragging over the last shown"): pointer parked at
   *  the scroll viewport edge → scroll + re-apply each frame, so the clip
   *  keeps moving (visible) instead of dragging blind off-viewport. Skips
   *  when measurement is impossible (jsdom: clientWidth/rect width = 0). */
  const maybeAutoScroll = () => {
    const gs = g.current;
    if (!gs.kind || !gs.active || !gs.contentEl || autoScrollRaf.current !== null) return;
    const scrollEl = gs.contentEl.closest('.qc-scroll') as HTMLElement | null;
    if (!scrollEl || scrollEl.clientWidth <= 0) return;
    const vr = scrollEl.getBoundingClientRect();
    if (vr.width <= 0) return; // jsdom guard
    const inZone = (x: number) =>
      x > vr.right - EDGE_PX ? 1 : x < vr.left + EDGE_PX ? -1 : 0;
    if (inZone(gs.lastX) === 0) return;
    let stalls = 0; // frames with no scroll progress — bounded termination
    const step = () => {
      const cur = g.current;
      if (!cur.kind || !cur.active || !cur.contentEl) {
        autoScrollRaf.current = null;
        return;
      }
      const sc = cur.contentEl.closest('.qc-scroll') as HTMLElement | null;
      if (!sc) {
        autoScrollRaf.current = null;
        return;
      }
      const before = sc.scrollLeft;
      const dir = inZone(cur.lastX);
      if (dir !== 0) sc.scrollLeft = before + dir * SCROLL_SPEED_PX;
      applyGesture(cur.lastX); // content moved under the stationary pointer
      // applyGesture may GROW the content (free drag right) → next frame has
      // new scroll room even at the current limit; only a sustained stall
      // (clamped clip, no growth) terminates the loop
      stalls = sc.scrollLeft !== before ? 0 : stalls + 1;
      if (inZone(cur.lastX) !== 0 && stalls < 12) {
        autoScrollRaf.current = requestAnimationFrame(step);
      } else {
        autoScrollRaf.current = null;
      }
    };
    autoScrollRaf.current = requestAnimationFrame(step);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const gs = g.current;
    if (!gs.kind || gs.id !== clip.id) return;
    if (gs.pointerId !== null && e.pointerId !== gs.pointerId) return; // foreign pointer
    gs.lastX = e.clientX;
    if (!gs.active) {
      if (Math.abs(e.clientX - gs.startX) < DRAG_THRESHOLD_PX) return; // 5px threshold
      gs.active = true;
      setDragging(true);
      if (gs.kind !== 'move') setTrimmingEdge(gs.kind === 'trim-start' ? 'start' : 'end'); // R18k
      beginDrag(); // interaction lock engages exactly when the gesture does
    }
    applyGesture(e.clientX);
    maybeAutoScroll(); // R18i: edge-parked pointer keeps the drag visible
  };

  const finishGesture = (e: ReactPointerEvent<HTMLElement>, canceled: boolean) => {
    const gs = g.current;
    if (!gs.kind || gs.id !== clip.id) return;
    if (gs.pointerId !== null && e.pointerId !== gs.pointerId) return; // foreign pointer
    stopAutoScroll(); // R18i: the loop never outlives its gesture
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released (jsdom-safe) */
    }
    /* R19: the clears run AFTER the commit-at-up application — the
     * applyGesture call below re-reports the guide/ghost signals (it is
     * the same shared gesture applier), so clearing first would be undone
     * immediately. */
    if (gs.active) {
      if (canceled) cancelDrag(); // Esc / pointercancel
      else {
        /* R19 (review P2-11): commit at the UP position — a fast flick
         * would otherwise land the LAST pointermove spot, not the drop
         * spot (OT resolves at the up coordinates). */
        applyGesture(e.clientX);
        endDrag(); // ONE history entry per committed gesture
      }
    }
    onSnapGuide(null); // guide clears with the gesture (R18e)
    onTrimGhost?.(null); // the ghost leaves with the gesture (R19)
    setDragging(false);
    setTrimmingEdge(null); // R18k: the trim-mode shade leaves with the gesture
    useMini.getState().endPendingGesture(); // PR69 C53: the window closes with the gesture
    g.current = { kind: null, pointerId: null, startX: 0, grabOffset: 0, active: false, id: '', contentEl: null, lastX: 0, snapStart: 0, snapEnd: 0 };
  };

  /** keyboard trim on the handles (review fix #7: no inert controls) */
  const keyTrim = (edge: 'start' | 'end', dir: -1 | 1) => {
    const c = useMini.getState().doc.clips.find((x) => x.id === clip.id);
    if (!c) return;
    if (edge === 'start') trimClip(clip.id, 'start', c.start + dir * 0.5);
    else trimClip(clip.id, 'end', c.start + c.duration + dir * 0.5);
  };

  const isAudio = media?.kind === 'audio';
  const style: CSSProperties = {
    left: timeToPx(clip.start, pps),
    width: Math.max(timeToPx(clip.duration, pps), 1),
  };
  if (compact) {
    // R18j (thread #13): the pill body — the media's hue tint (CSS consumes
    // --qc-block-hue), audio pills get their own tint via the kind class
    (style as Record<string, string | number>)['--qc-block-hue'] = media?.hue ?? 210;
  } else if (!isAudio && filmstripOn) {
    // RH clip body: per-clip grey gradient (extraction §3)
    style.background = 'linear-gradient(135deg, rgba(120,120,120,0.95), rgba(72,72,72,0.92))';
  }

  return (
    <div
      className={`qc-track-item${compact ? ' qc-track-item--pill' : ''}${selected ? ' is-selected' : ''}${dragging ? ' is-dragging' : ''}${trimmingEdge ? ` is-trimming-${trimmingEdge}` : ''}`}
      style={style}
      data-testid={`mini-clip-${clip.id}`}
      data-clip-id={clip.id}
      role="button"
      aria-pressed={selected}
      aria-label={`Clip ${media?.name ?? clip.id}`}
      tabIndex={0}
      onKeyDown={(e) => {
        /* PR69 C46: Enter activates (select) — ARIA button parity. SPACE
         * deliberately falls through to the window-level transport law
         * (D3.8): the old Space-branch swallowed it at the target layer,
         * so Play/Pause went dead after any clip click (the most common
         * editing state). Registered as a deviation in README (#37). */
        if (e.key === 'Enter') {
          e.preventDefault();
          select(clip.id);
        }
      }}
      onPointerDown={(e) => startGesture(e, 'move')}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finishGesture(e, false)}
      onPointerCancel={(e) => finishGesture(e, true)}
    >
      {compact ? null : isAudio ? (
        media && <WaveformBody media={media} widthPx={timeToPx(clip.duration, pps)} />
      ) : filmstripOn ? (
        media && (
          <span
            className="qc-track-item__filmstrip"
            aria-hidden="true"
            style={{ backgroundImage: filmstripFor(media) }}
          />
        )
      ) : (
        // R18e (feedback #15): filmstrip OFF → media-kind color blocks
        <span
          className={`qc-track-item__block${isAudio ? ' qc-track-item__block--audio' : ''}`}
          aria-hidden="true"
          style={{ ['--qc-block-hue' as string]: media?.hue ?? 210 }}
        />
      )}
      <span className="qc-track-item__label">{media?.name ?? clip.id}</span>
      {/* R18i (thread #10 repost): trim affordance = a 2px accent line AT
          the edge, ONLY on hover/press/focus (CSS) — the R18h dark-scrim
          shade is gone (it fought the filmstrip). The zone stays a real
          <button> for pointer + keyboard (←/→) semantics; tabIndex only
          when selected so the tab order stays honest. */}
      <button
        type="button"
        className="qc-track-item__trim qc-track-item__trim--start"
        aria-label={`Trim start of ${media?.name ?? clip.id}`}
        title={
          rippleOn
            ? 'Ripple trim start — the head closes; later clips follow left (←/→ when focused)'
            : 'Drag the edge to trim — ←/→ when focused'
        }
        tabIndex={selected ? 0 : -1}
        data-testid={`mini-trim-start-${clip.id}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          startGesture(e, 'trim-start');
        }}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finishGesture(e, false)}
        onPointerCancel={(e) => finishGesture(e, true)}
        /* R1-a#4: keyboard activation — Space/Enter on the focused handle
         * fire a synthetic click with detail 0 (pointer clicks carry
         * detail >= 1 and are already handled by the gesture engine, so
         * they're ignored here). Before this, the C1 Space yield made
         * the focused handle a dead key. */
        onClick={(e) => {
          if (e.detail === 0) keyTrim('start', 1);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            keyTrim('start', -1);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            keyTrim('start', 1);
          }
        }}
      />
      <button
        type="button"
        className="qc-track-item__trim qc-track-item__trim--end"
        aria-label={`Trim end of ${media?.name ?? clip.id}`}
        title={
          rippleOn
            ? 'Ripple trim end — later clips follow the edge (←/→ when focused)'
            : 'Drag the edge to trim — ←/→ when focused'
        }
        tabIndex={selected ? 0 : -1}
        data-testid={`mini-trim-end-${clip.id}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          startGesture(e, 'trim-end');
        }}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finishGesture(e, false)}
        onPointerCancel={(e) => finishGesture(e, true)}
        /* R1-a#4: keyboard activation — see the start handle. */
        onClick={(e) => {
          if (e.detail === 0) keyTrim('end', 1);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            keyTrim('end', -1);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            keyTrim('end', 1);
          }
        }}
      />
    </div>
  );
});

/* ---------- R18k (thread #3): the track-head column ----------------
 * The lane heads live in the FIXED head column (never over a clip —
 * review P1-1; the column must stay row-aligned with its lane: 36px,
 * or 22px when the audio lane is collapsed). R19 (thread #28) revised
 * the head law: a SELECTOR dropdown when the project offers a real
 * choice (2+ tracks of this kind, unlocked); a V1/A1 MARKER badge on
 * single-pair projects (click = select the track for inspection);
 * NOTHING when the host pinned the pair (trackBindingLocked — an
 * injected environment has no numbered track name to show). The cell
 * itself always renders — row alignment with the lane. */

function TrackHead({ track, collapsed }: { track: Track; collapsed: boolean }) {
  const doc = useMini((s) => s.doc);
  const locked = useMini((s) => s.trackBindingLocked);
  const boundVideo = useMini((s) => s.boundVideoTrack);
  const boundAudio = useMini((s) => s.boundAudioTrack);
  const setBoundVideo = useMini((s) => s.setBoundVideoTrack);
  const setBoundAudio = useMini((s) => s.setBoundAudioTrack);
  const selectTrack = useMini((s) => s.selectTrack);
  const selectedTrackId = useMini((s) => s.selectedTrackId);
  /* R20 (thread #29): the M chip — the muted STATE badge (orthogonal to
   * the identity law below: the selector/marker carry WHO the lane is,
   * the chip carries what the edit says; even a locked (host-bound) lane
   * shows its mute state honestly). A real button — click unmutes. */
  const toggleTrackMute = useMini((s) => s.toggleTrackMute);
  const candidates = doc.tracks.filter((t) => t.kind === track.kind);
  const showSelect = !locked && !collapsed && candidates.length >= 2;
  /* R19 (thread #28) — the head law, revised: multi-track + unlocked →
   * SELECTOR (the rebind affordance); single-pair + unlocked → the lane
   * MARKER (V1/A1 — the reviewer's "why no trackhead marker?"); LOCKED
   * (embedded/bound) → nothing at all ("if this is considered binded
   * then just hide the trackhead"). The marker is a real button — it
   * selects the track for inspection (thread #26). This supersedes the
   * R18k "invisible when single-pair" reading. */
  const showMarker = !locked && !collapsed && candidates.length < 2;
  const bound = track.kind === 'video' ? boundVideo : boundAudio;
  const onChange = track.kind === 'video' ? setBoundVideo : setBoundAudio;
  return (
    <div
      className={`qc-track-head${collapsed ? ' qc-track-head--collapsed' : ''}`}
      data-testid={`mini-track-head-${track.id}`}
    >
      {showSelect && (
        <div className="qc-track-select" data-testid={`mini-track-select-${track.kind}`}>
          <select
            value={bound}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${track.kind === 'video' ? 'Video' : 'Audio'} track binding`}
            title={`Which project ${track.kind} track this lane edits — the mini binds one pair; embedded hosts may pin it`}
          >
            {candidates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {showMarker && (
        <button
          type="button"
          className={`qc-track-marker${selectedTrackId === track.id ? ' is-selected' : ''}`}
          onClick={() => selectTrack(track.id)}
          aria-pressed={selectedTrackId === track.id}
          aria-label={`Select ${track.label} lane`}
          title={`Select the ${track.label} lane — inspect its properties`}
          data-testid={`mini-track-marker-${track.id}`}
        >
          {track.label}
        </button>
      )}
      {track.muted && !collapsed && (
        <button
          type="button"
          className="qc-track-mute-chip"
          onClick={() => toggleTrackMute(track.id)}
          aria-label={`Unmute ${track.label} lane`}
          title={`${track.label} is muted — saved with the project; click to unmute`}
          data-testid={`mini-track-mute-chip-${track.id}`}
        >
          M
        </button>
      )}
    </div>
  );
}

/* ---------- lane (R18e: + pool DnD drop zone + visibility) ---------- */

interface DropPreview {
  startPx: number;
  widthPx: number;
}

/** PR69 C13: ONE pool→lane DnD engine. Lane and MinLane carried ~70
 *  line-identical twins (dragover ghost placement, dragLeave containment
 *  guard, drop→insertMediaAt) differing only in originPx — a shared hook
 *  keeps the two surfaces from drifting (the R18k origin split 46-vs-10
 *  is exactly the kind of constant that silently diverges). Returns the
 *  ghost-preview state + the three handlers, spread straight onto the
 *  lane surface. */
function useLaneDnd({ track, pps, originPx }: { track: Track; pps: number; originPx: number }) {
  const doc = useMini((s) => s.doc);
  const insertMediaAt = useMini((s) => s.insertMediaAt);
  const [drop, setDrop] = useState<DropPreview | null>(null);
  /* R1-a#1/R1-b P3-6: MEMOIZED — clipsOfTrack allocates a fresh array per
   * render, and this array is the upstream dep of the per-clip target
   * map: an unstable identity defeated every memo(ClipItem) (measured:
   * a selection change re-rendered 3/3 clips). [doc, track.id] are the
   * real inputs — the doc identity only changes on real mutations. */
  const clips = useMemo(() => clipsOfTrack(doc, track.id), [doc, track.id]);

  /** pool drag hover: candidate placement ghost (R18e) */
  const onDragOver = (e: ReactDragEvent<HTMLElement>) => {
    if (!e.dataTransfer.types.includes(POOL_DRAG_TYPE)) return;
    e.preventDefault();
    const mediaId = poolDrag.current;
    const media = mediaId ? doc.media.find((m) => m.id === mediaId) : undefined;
    // R18f (review P2-3): unknown source (cross-window drag, registry miss) →
    // optimistic 'copy': the drop still validates via dataTransfer.getData,
    // so the affordance must not promise 'none' and then succeed.
    const compatible = media ? isDroppable(track.kind, media.kind) : true;
    e.dataTransfer.dropEffect = compatible ? 'copy' : 'none';
    if (!media || !compatible) {
      setDrop((prev) => (prev === null ? prev : null));
      return;
    }
    const content = e.currentTarget.closest('[data-qc-scroll-content]') as HTMLElement | null;
    const origin = (content ? content.getBoundingClientRect().left : 0) + originPx;
    const t = pxToTime(e.clientX - origin, pps);
    const place = insertionAt(clips, media.duration, t);
    if (!place) {
      setDrop((prev) => (prev === null ? prev : null));
      return;
    }
    // R18f (review P2-3): dragover fires continuously — compare-then-set so
    // an unchanged placement does not re-render the lane on every event
    const next = {
      startPx: timeToPx(place.start, pps),
      widthPx: timeToPx(media.duration, pps),
    };
    setDrop((prev) =>
      prev && prev.startPx === next.startPx && prev.widthPx === next.widthPx ? prev : next,
    );
  };

  const onDragLeave = (e: ReactDragEvent<HTMLElement>) => {
    if (!e.dataTransfer.types.includes(POOL_DRAG_TYPE)) return;
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDrop(null);
  };

  const onDrop = (e: ReactDragEvent<HTMLElement>) => {
    if (!e.dataTransfer.types.includes(POOL_DRAG_TYPE)) return;
    e.preventDefault();
    const mediaId = e.dataTransfer.getData(POOL_DRAG_TYPE) || poolDrag.current;
    const media = mediaId ? doc.media.find((m) => m.id === mediaId) : undefined;
    setDrop(null);
    if (!media) return;
    const content = e.currentTarget.closest('[data-qc-scroll-content]') as HTMLElement | null;
    const origin = (content ? content.getBoundingClientRect().left : 0) + originPx;
    const t = pxToTime(e.clientX - origin, pps);
    insertMediaAt(media.id, track.id, t);
  };

  return { drop, onDragOver, onDragLeave, onDrop, clips };
}

/** PR69 C56: stable empty target array for clips with no neighbors. */
const EMPTY_TARGETS: number[] = [];

/* PR69 C56: per-clip magnet targets (neighbor edges, self excluded),
 * memoized per track so the array identities — and therefore every
 * memoized ClipItem below — stay stable across unrelated re-renders.
 * The playhead target joins INSIDE the gesture (applyGesture, read live
 * and frozen by the tick lock). */
function useTargetsById(magnetClips: Clip[]): Map<string, number[]> {
  return useMemo(() => {
    const m = new Map<string, number[]>();
    for (const c of magnetClips) {
      const arr: number[] = [];
      for (const o of magnetClips) {
        if (o.id === c.id) continue;
        arr.push(o.start, o.start + o.duration);
      }
      m.set(c.id, arr);
    }
    return m;
  }, [magnetClips]);
}

function Lane({
  track,
  pps,
  snapOn,
  filmstripOn,
  onSnapGuide,
}: {
  track: Track;
  pps: number;
  snapOn: boolean;
  filmstripOn: boolean;
  onSnapGuide: (t: number | null) => void;
}) {
  const doc = useMini((s) => s.doc);
  const selectedId = useMini((s) => s.selectedId);
  const audioLaneVisible = useMini((s) => s.audioLaneVisible);
  const toggleAudioLane = useMini((s) => s.toggleAudioLane);
  /* R19: the magnet field is FROZEN at gesture start — while a gesture
   * runs, targets come from the PRE-DRAG SNAPSHOT (a gesture never
   * magnetizes to positions it created; also fixes the latent ripple-trim
   * ratchet where pushed followers fed their own new edges back as
   * magnets). R21 (user P0 revert): with the clamp law restored nothing
   * moves except the mover — the frozen snapshot IS the live doc. */
  const dragActive = useMini((s) => s.dragActive);
  const dragSnapshot = useMini((s) => s.dragSnapshot);
  const rippleOn = useMini((s) => s.rippleOn);
  const selectTrack = useMini((s) => s.selectTrack);
  /* the collapsed-audio-bar branch validates + places directly (PR69 C54) */
  const insertMediaAt = useMini((s) => s.insertMediaAt);
  /* PR69 C13: the shared DnD engine (was ~70 duplicated lines twin'd
   * with MinLane) + PR69 C56: no playhead prop — the tick loop must not
   * re-render the lane at all. */
  const { drop, onDragOver, onDragLeave, onDrop, clips } = useLaneDnd({
    track,
    pps,
    originPx: RENDER_ORIGIN_PX,
  });
  /* R1-a#1: memoized — the snapshot-derived array feeds useTargetsById's
   * useMemo; a fresh allocation per render defeated the memo (and with it
   * every memo(ClipItem)). Identity flips only on real doc/snapshot changes. */
  const magnetClips = useMemo(
    () => (dragActive && dragSnapshot ? clipsOfTrack(dragSnapshot, track.id) : clips),
    [dragActive, dragSnapshot, clips, track.id],
  );
  const targetsById = useTargetsById(magnetClips);
  /* R19 (thread #51): the trim-ghost signal — which clip is trimming
   * which edge OUTWARD. The ghost rect is derived (bound ↔ live edge) so
   * it shrinks as the trim extends; the lane paints it OUTSIDE the clip
   * (the clip body clips its own overflow). */
  const [trimGhost, setTrimGhost] = useState<{ id: string; edge: 'start' | 'end' } | null>(null);

  if (track.kind === 'audio' && !audioLaneVisible) {
    // R18f (review P2-3): a collapsed placeholder instead of vanishing —
    // the lane's clips stay in the doc; the bar says so and restores on
    // click. R18f wave-2: it is ALSO a drop target — an audio drop onto the
    // collapsed bar restores the lane and places the clip (no silent
    // no-drop dead zone).
    const hiddenCount = clips.length;
    return (
      <button
        type="button"
        className="qc-track-row--collapsed"
        onClick={toggleAudioLane}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(POOL_DRAG_TYPE)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          if (!e.dataTransfer.types.includes(POOL_DRAG_TYPE)) return;
          e.preventDefault();
          const mediaId = e.dataTransfer.getData(POOL_DRAG_TYPE) || poolDrag.current;
          if (!mediaId) return;
          const media = doc.media.find((m) => m.id === mediaId);
          if (!media) return;
          const content = e.currentTarget.closest('[data-qc-scroll-content]') as HTMLElement | null;
          const origin = (content ? content.getBoundingClientRect().left : 0) + RENDER_ORIGIN_PX;
          const t = pxToTime(e.clientX - origin, pps);
          if (media.kind !== 'audio') {
            /* PR69 C54: wrong-kind drops get the SAME honest refusal the
             * visible lanes give — insertMediaAt re-validates kind routing
             * and toasts ('video media belongs on V1.'). The lane itself
             * stays hidden: a refusal must not resurrect it. */
            insertMediaAt(media.id, track.id, t);
            return;
          }
          toggleAudioLane(); // restore the lane, then place
          insertMediaAt(media.id, track.id, t);
        }}
        data-testid={`mini-lane-${track.id}-collapsed`}
        title={`Audio lane hidden — click to show (${track.label})`}
        aria-label={`Audio lane hidden, ${hiddenCount} clip${hiddenCount === 1 ? '' : 's'} preserved — click to show`}
      >
        {track.label} · {hiddenCount} hidden
        <Eye size={14} strokeWidth={1.5} aria-hidden="true" />
      </button>
    );
  }

  const dropping = drop !== null;

  /* R19 (thread #51): the ghost rect — from the LIVE edge to the bound
   * (media/neighbor extent the drag clamps to). Under ripple ON the
   * start edge is suppressed (frozen-left law) and the end bound ignores
   * the neighbor (followers push) — trimGhostBound encodes both. */
  let ghostRect: { left: number; width: number } | null = null;
  if (trimGhost) {
    const c = clips.find((x) => x.id === trimGhost.id);
    if (c) {
      const m = doc.media.find((x) => x.id === c.mediaId);
      const bound = trimGhostBound(doc, c, trimGhost.edge, rippleOn, m);
      if (bound !== null) {
        const liveEdge = trimGhost.edge === 'start' ? c.start : c.start + c.duration;
        ghostRect =
          trimGhost.edge === 'start'
            ? { left: timeToPx(bound, pps), width: timeToPx(liveEdge - bound, pps) }
            : { left: timeToPx(liveEdge, pps), width: timeToPx(bound - liveEdge, pps) };
      }
    }
  }

  return (
    <div
      className={`qc-track-row__content${dropping ? ' is-drop-target' : ''}${track.muted ? ' is-muted' : ''}`}
      role="group"
      aria-label={`${track.kind === 'audio' ? 'Audio' : 'Video'} track ${track.label}`}
      data-testid={`mini-lane-${track.id}`}
      data-track-kind={track.kind}
      onPointerDown={(e) => {
        /* R19 (thread #26): a click on the lane's EMPTY surface selects
         * the track (the inspector shows its card) — the same call the
         * head badge makes, without opening any selector. A clip's own
         * pointerdown stops propagation, so this only fires on empty
         * area (or the clip's body — which never bubbles here). */
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest('.qc-track-item')) return;
        selectTrack(track.id);
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {clips.map((c) => (
        /* PR69 C56: stable per-clip target arrays (memoized above); the
         * playhead target joins inside the gesture, read live. */
        <ClipItem
          key={c.id}
          clip={c}
          media={doc.media.find((m) => m.id === c.mediaId)}
          pps={pps}
          snapOn={snapOn}
          selected={selectedId === c.id}
          filmstripOn={filmstripOn}
          snapTargets={targetsById.get(c.id) ?? EMPTY_TARGETS}
          onSnapGuide={onSnapGuide}
          onTrimGhost={setTrimGhost}
        />
      ))}
      {ghostRect && (
        <div
          className="qc-trim-ghost"
          aria-hidden="true"
          style={{ left: ghostRect.left, width: Math.max(ghostRect.width, 2) }}
          data-testid={trimGhost ? `mini-trim-ghost-${trimGhost.id}` : undefined}
        />
      )}
      {drop && (
        <div
          className="qc-drop-outline"
          aria-hidden="true"
          style={{ left: drop.startPx, width: drop.widthPx }}
          data-testid={`mini-drop-outline-${track.id}`}
        />
      )}
    </div>
  );
}

/* ---------- R18j (thread #13): minimized sub-row --------------------
 * One thin pill row per track inside the single compact strip. V and A
 * keep separate sub-rows (never stacked on each other) so overlapped
 * time ranges stay individually clickable — the reviewer's "collapse
 * the two tracks V/A into a single timeline, each clip more like pills".
 * Pool drags still land: the row validates kind routing and inserts at
 * the pointer's time (same insertionAt law as the full lanes). */

function MinLane({
  track,
  pps,
  snapOn,
  onSnapGuide,
}: {
  track: Track;
  pps: number;
  snapOn: boolean;
  onSnapGuide: (t: number | null) => void;
}) {
  const doc = useMini((s) => s.doc);
  const selectedId = useMini((s) => s.selectedId);
  /* R19: the same frozen-magnet law as the full lanes — the strip runs
   * the identical gesture engine (the clamp law; no per-surface drift).
   * PR69 C13: the shared DnD engine (originPx is the ONLY difference
   * from the full lanes — 10, no head rail). */
  const dragActive = useMini((s) => s.dragActive);
  const dragSnapshot = useMini((s) => s.dragSnapshot);
  const { drop, onDragOver, onDragLeave, onDrop, clips } = useLaneDnd({
    track,
    pps,
    originPx: MIN_ORIGIN_PX,
  });
  /* R1-a#1: memoized — the snapshot-derived array feeds useTargetsById's
   * useMemo; a fresh allocation per render defeated the memo (and with it
   * every memo(ClipItem)). Identity flips only on real doc/snapshot changes. */
  const magnetClips = useMemo(
    () => (dragActive && dragSnapshot ? clipsOfTrack(dragSnapshot, track.id) : clips),
    [dragActive, dragSnapshot, clips, track.id],
  );
  const targetsById = useTargetsById(magnetClips);

  return (
    <div
      className={`qc-min-lane${drop ? ' is-drop-target' : ''}${track.kind === 'audio' ? ' qc-min-lane--audio' : ''}${track.muted ? ' is-muted' : ''}`}
      role="group"
      aria-label={`${track.kind === 'audio' ? 'Audio' : 'Video'} pills ${track.label}`}
      data-testid={`mini-min-lane-${track.id}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {clips.map((c) => (
        // PR69 C56: stable per-clip target arrays (memoized above)
        <ClipItem
          key={c.id}
          clip={c}
          media={doc.media.find((m) => m.id === c.mediaId)}
          pps={pps}
          snapOn={snapOn}
          selected={selectedId === c.id}
          filmstripOn={false}
          snapTargets={targetsById.get(c.id) ?? EMPTY_TARGETS}
          onSnapGuide={onSnapGuide}
          compact
          originPx={MIN_ORIGIN_PX}
        />
      ))}
      {drop && (
        <div
          className="qc-drop-outline qc-drop-outline--min"
          aria-hidden="true"
          style={{ left: drop.startPx, width: drop.widthPx }}
          data-testid={`mini-drop-outline-${track.id}`}
        />
      )}
    </div>
  );
}

/* ---------- playhead ---------- */

function Playhead({
  pps,
  endTime,
  originPx = RENDER_ORIGIN_PX,
}: {
  pps: number;
  endTime: number;
  /** R18k: where t=0 sits in the scroll content — 46 after the head rail
   *  (full timeline) vs 10 in the compact strip. The scrub math and the
   *  CSS overlay left MUST agree (see .qc-playhead-overlay rules). */
  originPx?: number;
}) {
  const playhead = useMini((s) => s.playhead);
  const setPlayhead = useMini((s) => s.setPlayhead);
  /* R1-b P2-1/R2: scrub surfaces open the PENDING window too — mutating
   * keys die mid-scrub (an ⌘Z under an open pointer gesture is the exact
   * relayout-mid-gesture trap), and tick freezes so playback and the
   * user's hand stop fighting over the playhead (R1-b P3-8). */
  const beginPendingGesture = useMini((s) => s.beginPendingGesture);
  const endPendingGesture = useMini((s) => s.endPendingGesture);
  const [dragging, setDragging] = useState(false);
  /* R2-a P3-b (round 3): unmount sweep — the min/full branches render
   * DIFFERENT Playhead instances, so a mode flip mid-handle-scrub unmounts
   * the scrubbing one with no pointerup ever coming. The window closes
   * with the surface (edge.stop is the hook's own unmount law). */
  useEffect(() => () => endPendingGesture(), [endPendingGesture]);
  const x = timeToPx(playhead, pps);
  const atStart = playhead < 0.5;
  const atEnd = playhead > endTime - 0.5;
  /* PR69 C8: the playhead-handle drag gets the same edge auto-scroll the
   * clip gestures have had since R18i — a handle dragged to the viewport
   * edge keeps scrolling + following instead of going blind. */
  const edge = useEdgeAutoScroll();
  const contentRef = useRef<HTMLElement | null>(null);

  const applyScrub = (clientX: number) => {
    const content = contentRef.current;
    const origin = (content ? content.getBoundingClientRect().left : 0) + originPx;
    setPlayhead(pxToTime(clientX - origin, pps));
  };

  return (
    <div className="qc-playhead-overlay">
      <button
        type="button"
        className={`qc-ruler__playhead${dragging ? ' is-dragging' : ''}${atStart ? ' is-at-start' : ''}${atEnd ? ' is-at-end' : ''}`}
        data-time-label={fmtTimecode(playhead)}
        aria-label={`Playhead at ${fmtTimecode(playhead)} — drag or use arrow keys`}
        title="Drag to scrub — ←/→ when focused"
        style={{ left: x }}
        data-testid="mini-playhead"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          // R20: capture guarded for untrusted pointers (Viewer parity)
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
            /* untrusted pointer — scrub proceeds without capture */
          }
          contentRef.current = e.currentTarget.closest(
            '[data-qc-scroll-content]',
          ) as HTMLElement | null;
          edge.setSession(applyScrub, contentRef.current);
          edge.note(e.clientX);
          beginPendingGesture();
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (dragging) {
            edge.note(e.clientX);
            applyScrub(e.clientX);
            edge.maybeStart();
          }
        }}
        onPointerUp={(e) => {
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          } catch {
            /* jsdom-safe */
          }
          edge.stop();
          endPendingGesture();
          setDragging(false);
        }}
        /* R1-a#2/R1-b P2-1: pointercancel runs the FULL release path — the
         * old handler only stopped the auto-scroll, leaving `dragging`
         * true so later HOVER moves kept scrubbing with no button held
         * (touch/pen scrubs interrupted by a browser gesture hit this). */
        onPointerCancel={(e) => {
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          } catch {
            /* jsdom-safe */
          }
          edge.stop();
          endPendingGesture();
          setDragging(false);
        }}
        onKeyDown={(e) => {
          // keyboard scrub (review fix #7: focusable must be operable)
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const dir = e.key === 'ArrowLeft' ? -0.5 : 0.5;
            setPlayhead(useMini.getState().playhead + dir);
          } else if (e.key === 'Enter') {
            // R18e (feedback #11): Enter has no action on the playhead —
            // swallow it so nothing paints a "selection bounding box"
            e.preventDefault();
          }
        }}
      >
        <span className="qc-ruler__playhead-line" aria-hidden="true" />
        <span className="qc-ruler__playhead-handle" />
      </button>
    </div>
  );
}

/* ---------- the panel ---------- */

/** R18i (thread #12): edge auto-scroll constants — when a clip gesture's
 *  pointer parks within EDGE_PX of the scroll viewport edge, the timeline
 *  scrolls (and the gesture keeps re-applying against the scrolled
 *  content) so dragging past the last shown timestamp stays VISIBLE
 *  instead of dragging blind off-viewport. */
const EDGE_PX = 48;
const SCROLL_SPEED_PX = 12; // per frame ≈ 720px/s at 60fps

/** PR69 C8: the R18i edge auto-scroll law, shared by the SCRUB surfaces
 *  (ruler + playhead handle) — the same loop ClipItem's maybeAutoScroll
 *  runs for clip gestures. The session is set at pointerdown; `note`
 *  tracks the pointer; `maybeStart` spins the rAF loop only while the
 *  pointer parks within EDGE_PX of the scroll viewport (jsdom-safe: a
 *  zero-width scroll element never starts); the stall bound (12 frames
 *  without scroll progress) terminates at the content edge. */
function useEdgeAutoScroll() {
  const rafRef = useRef<number | null>(null);
  const lastXRef = useRef(0);
  const activeRef = useRef(false);
  const applyRef = useRef<(clientX: number) => void>(() => {});
  const contentRef = useRef<HTMLElement | null>(null);

  const setSession = (apply: (clientX: number) => void, contentEl: HTMLElement | null) => {
    applyRef.current = apply;
    contentRef.current = contentEl;
  };
  const note = (clientX: number) => {
    lastXRef.current = clientX;
  };
  const stop = () => {
    activeRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };
  const maybeStart = () => {
    const scroll = contentRef.current?.closest('.qc-scroll') as HTMLElement | null;
    if (!scroll || scroll.clientWidth <= 0 || rafRef.current !== null) return;
    const vr = scroll.getBoundingClientRect();
    if (vr.width <= 0) return; // jsdom / unmeasured
    const dir =
      lastXRef.current > vr.right - EDGE_PX ? 1 : lastXRef.current < vr.left + EDGE_PX ? -1 : 0;
    if (dir === 0) return;
    activeRef.current = true;
    let stalls = 0;
    const step = () => {
      const sc = contentRef.current?.closest('.qc-scroll') as HTMLElement | null;
      if (!sc || !activeRef.current) {
        rafRef.current = null;
        return;
      }
      const rect = sc.getBoundingClientRect();
      const d =
        lastXRef.current > rect.right - EDGE_PX ? 1 : lastXRef.current < rect.left + EDGE_PX ? -1 : 0;
      const before = sc.scrollLeft;
      if (d !== 0) sc.scrollLeft = before + d * SCROLL_SPEED_PX;
      applyRef.current(lastXRef.current); // content moved under the stationary pointer
      stalls = sc.scrollLeft !== before ? 0 : stalls + 1;
      if (d !== 0 && stalls < 12) rafRef.current = requestAnimationFrame(step);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(step);
  };
  useEffect(() => stop, []); // the loop never outlives its surface
  return { setSession, note, maybeStart, stop };
}

/* PR69 C13+C8: ONE ruler scrub surface — the full ruler and the compact
 * strip's ruler were line-identical twins; now one component carries the
 * pointer-scrub law (unquantized, lock-gated) + the edge auto-scroll. */
function RulerScrub({
  pps,
  endTime,
  compact,
  setPlayhead,
}: {
  pps: number;
  endTime: number;
  compact?: boolean;
  setPlayhead: (t: number) => void;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const edge = useEdgeAutoScroll();
  /* R1-b P2-1/R2: the pending window opens with the scrub (mutating keys
   * die; tick freezes — see Playhead) and closes on ANY exit path. */
  const beginPendingGesture = useMini((s) => s.beginPendingGesture);
  const endPendingGesture = useMini((s) => s.endPendingGesture);
  const apply = (clientX: number) => {
    const rect = elRef.current?.getBoundingClientRect();
    setPlayhead(pxToTime(clientX - (rect ? rect.left : 0), pps));
  };
  /* R2-a P2-1 (round 3): the release path stops the EDGE LOOP too — the
   * R21c wiring changed up/cancel to endPendingGesture only, deleting the
   * edge.stop the playhead handle kept: releasing with the pointer parked
   * in the 48px edge zone left the rAF loop gliding the timeline and
   * re-seeking the playhead long after the up (the user's release
   * position destroyed). */
  const releaseScrub = () => {
    edge.stop();
    endPendingGesture();
  };
  /* R2-a P3-b (round 3): unmount sweep (ClipItem C9 parity) — a surface
   * swap mid-scrub (minimize flip, host remount, HMR) never delivers a
   * pointerup/cancel; the shared pending window must close with the
   * surface or mutating keys stay dead + the tick frozen until the next
   * gesture completes. edge.stop is the hook's own unmount law. The
   * zustand action identity is stable, so the mount-only deps are safe. */
  useEffect(() => () => endPendingGesture(), [endPendingGesture]);
  return (
    <div
      ref={elRef}
      className={`qc-ruler__content${compact ? ' qc-ruler__content--min' : ''}`}
      data-testid="mini-ruler"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        if (useMini.getState().dragActive) return; // lock (fix #4)
        // R20: capture guarded for untrusted pointers
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* untrusted pointer — scrub proceeds without capture */
        }
        edge.setSession(
          apply,
          e.currentTarget.closest('[data-qc-scroll-content]') as HTMLElement | null,
        );
        edge.note(e.clientX);
        beginPendingGesture();
        apply(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1 && !useMini.getState().dragActive) {
          edge.note(e.clientX);
          apply(e.clientX);
          edge.maybeStart();
        }
      }}
      onPointerUp={releaseScrub}
      onPointerCancel={releaseScrub}
    >
      <RulerMarks pps={pps} endTime={endTime} compact={compact} />
    </div>
  );
}

export function Timeline({ style }: { style?: CSSProperties }) {
  const doc = useMini((s) => s.doc);
  const zoomStep = useMini((s) => s.zoomStep);
  /* PR69 C56: Timeline NO LONGER subscribes to the playhead — the rAF
   * tick re-rendered the ENTIRE clip tree (Lanes → every ClipItem, each
   * with a freshly-built snapTargets array) ~60x/s during playback;
   * only the Playhead overlay + pill actually need the tick, and both
   * subscribe directly. */
  const snapOn = useMini((s) => s.snapOn);
  const filmstripOn = useMini((s) => s.filmstripOn);
  const setPlayhead = useMini((s) => s.setPlayhead);
  const setRulerEnd = useMini((s) => s.setRulerEnd);
  /* R18k (threads #21/#23/#3): the mini renders the BOUND tracks — the
   * pair in paired mode, the single video lane in video-only mode. Clips
   * on unbound project tracks exist in the doc but are not this window's
   * world (the ruler extent and viewer follow the same bound set). */
  const trackMode = useMini((s) => s.trackMode);
  const boundVideoTrack = useMini((s) => s.boundVideoTrack);
  const boundAudioTrack = useMini((s) => s.boundAudioTrack);
  const audioLaneVisible = useMini((s) => s.audioLaneVisible);
  const setBoundVideoTrack = useMini((s) => s.setBoundVideoTrack);
  const setBoundAudioTrack = useMini((s) => s.setBoundAudioTrack);
  /* R18k (review P2-2, stale binding heal): a story control (or a host)
   *  can swap the doc under a binding that points at a track the new doc
   *  doesn't have — visibleTracks would return [] and the timeline would
   *  render a silent empty world. View-level self-repair: fall the
   *  binding back to the doc's first track of that kind. In-app this is
   *  unreachable (tracks are immutable; reset() re-aligns) — it exists so
   *  the review surface never bricks itself. */
  useEffect(() => {
    if (!doc.tracks.some((t) => t.id === boundVideoTrack && t.kind === 'video')) {
      const first = doc.tracks.find((t) => t.kind === 'video');
      if (first) setBoundVideoTrack(first.id);
    }
    if (!doc.tracks.some((t) => t.id === boundAudioTrack && t.kind === 'audio')) {
      const first = doc.tracks.find((t) => t.kind === 'audio');
      if (first) setBoundAudioTrack(first.id);
    }
  }, [doc, boundVideoTrack, boundAudioTrack, setBoundVideoTrack, setBoundAudioTrack]);
  const lanes = visibleTracks(doc, trackMode, boundVideoTrack, boundAudioTrack);
  /* R18j (thread #13): the minimized strip — effective when the flag is
   *  set OR the viewer is maxed (thread #19: the timeline MINIMIZES for
   *  max view, it never disappears). Expanded restores the splitter-sized
   *  height; tlH lives in App and survives. */
  const timelineMinimized = useMini((s) => s.timelineMinimized || s.viewerMax);
  const viewerMax = useMini((s) => s.viewerMax);
  const setTimelineMinimized = useMini((s) => s.setTimelineMinimized);
  const toggleViewerMax = useMini((s) => s.toggleViewerMax);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  /** R18i (thread #12, ruler): measured scroll viewport width — the ruler
   *  populates timestamps across the WHOLE visible surface ("consistently
   *  show all the time"), not just to the content end. The old surface
   *  left ~57% of the ruler bare (ticks, no labels) and pinned the
   *  playhead at contentEnd — Premiere/Resolve/FCP all show + allow
   *  scrubbing the full visible ruler. jsdom measures 0 → the floor is
   *  the pre-R18i behavior (content + min 8s). */
  const [viewportW, setViewportW] = useState(0);
  // R18f (review P1-4): the keyboard surface lives HERE, not in App — the
  // solo Timeline stories get the advertised shortcuts (S/[/]/Del/⌘Z…);
  // App renders Timeline, so the hook still mounts exactly once.
  useKeys();
  /* PR69 C3: the rAF playback loop mounts here (was App-only — every
   * solo story's Play button flipped the icon while the timecode stood
   * frozen, live-proven). The hook is a mount-safe SINGLETON (Viewer
   * mounts it too), so the full app still runs exactly ONE loop while
   * every solo surface plays for real. */
  usePlayhead();
  /** R18e: the engaged magnet target while a gesture runs (snap guide) */
  const [snapGuide, setSnapGuide] = useState<number | null>(null);
  const pps = ppsFor(zoomStep);
  const step = labelStepFor(pps);
  /* PR69 C24: the extent's origin is MODE-AWARE — the minimized strip's
   * t=0 sits at MIN_ORIGIN_PX (10, no head rail), so the compact ruler's
   * extent (and setRulerEnd's scrub clamp) was 36px/pps short of the
   * painted surface (live-measured 1274 vs 1310 scrollWidth). The
   * ResizeObserver effect already re-measures on the mode switch. */
  const extentOriginPx = timelineMinimized ? MIN_ORIGIN_PX : RENDER_ORIGIN_PX;
  // one label of runway past the viewport so the rightmost visible label
  // is never cut by the scroll edge
  const viewportTime = viewportW > 0 ? (viewportW - extentOriginPx) / pps + step : 0;
  // R18k: ruler extent follows the BOUND clips — clips on unbound project
  // tracks are not this window's content
  const endTime = Math.max(contentEnd(boundClips(doc, trackMode, boundVideoTrack, boundAudioTrack)), 8, viewportTime);
  const width = timeToPx(endTime, pps);

  /* R1-b P3-10 → R2-a P2-2/P3-a (round 3): preserve the LEFTMOST VISIBLE
   * TIME across the minimize/expand element swap. The stash is
   * CONTINUOUS — onScroll records the origin-corrected time on every
   * scroll (user pan, zoom anchor, edge auto-scroll), so there is no
   * cleanup-timing race (the old cleanup read scrollRef.current AFTER
   * React had re-attached it to the incoming element, recording 0); the
   * restore runs ONCE per element swap in the effect body — never inside
   * measure(), which fires on every resize/observer tick (the R21c wiring
   * re-anchored the scroll on every resize, snapping it to the stale
   * stash). Origin-adjusted with THIS render's pps/origin; jsdom measures
   * 0 → a harmless no-op there. Requires the App-side single-slot law
   * (the component instance must survive the flip for the stash to). */
  const scrollTimeRef = useRef(0);
  const noteScroll = () => {
    const el = scrollRef.current;
    if (el) scrollTimeRef.current = pxToTime(el.scrollLeft + extentOriginPx, pps);
  };

  /* viewport measurement (ResizeObserver when available, resize listener
   *  as the jsdom/old-browser fallback). R18j: deps include the minimized
   *  flag — the mode switch swaps the .qc-scroll element, so the observer
   *  must re-attach to the live one. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    /* the one-shot re-anchor — ONLY on the element swap (effect re-run).
     * A resize / splitter drag / observer tick must NOT re-anchor (the
     * R2-a P2-2 regression: one resize snapped scrollLeft 500 → 0). */
    el.scrollLeft = Math.max(0, timeToPx(scrollTimeRef.current, pps) - extentOriginPx);
    const measure = () => {
      const w = el.clientWidth;
      setViewportW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // pps/extentOriginPx are read at swap time by design; scrollTimeRef is a ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineMinimized]);

  /* R18i: publish the ruler extent — setPlayhead clamps to it, so the
   *  playhead scrubs the full visible ruler surface (the reported bug:
   *  dragging over the last shown timestamp pinned at contentEnd).
   *  R1-b P2-4: `doc` joins the deps — reset() rewrites rulerEnd to the
   *  floor, and a same-extent doc swap would otherwise leave the stale
   *  floor clamping scrubs 4.5s short of the painted surface
   *  (setRulerEnd's churn guard keeps this a no-op for equal values). */
  useEffect(() => {
    setRulerEnd(endTime);
  }, [endTime, doc, setRulerEnd]);

  /* PR69 C7a: zoom is ANCHORED AT THE PLAYHEAD — the old law kept
   * scrollLeft fixed, so zooming in at high pps walked the playhead and
   * content off-viewport (every reference NLE anchors zoom at the
   * playhead or viewport center). useLayoutEffect beats paint; the
   * playhead is read via getState (no subscription — C56). Initial
   * mount is a no-op (prev === next). */
  const prevZoomStep = useRef(zoomStep);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const prev = prevZoomStep.current;
    prevZoomStep.current = zoomStep;
    if (!el || prev === zoomStep) return;
    const t = useMini.getState().playhead;
    const anchorPx = t * ppsFor(prev) - el.scrollLeft; // playhead offset in the viewport BEFORE
    el.scrollLeft = Math.max(0, t * ppsFor(zoomStep) - anchorPx);
  }, [zoomStep]);

  /* ---- R18j (thread #13): the minimized strip ----------------------
   * Toolbar hidden, ruler slimmed (every-other label), V/A pills in one
   * compact strip, playhead fully scrubbable, clips draggable/trimmable
   * (ClipItem compact reuses the whole gesture engine), pool drags land
   * on the sub-rows. The expand rail is mode-aware like the panel rails:
   * under viewerMax it EXITS max mode; otherwise it un-minimizes. */
  if (timelineMinimized) {
    return (
      <div
        className="qc-timeline is-minimized"
        data-testid="mini-timeline-min"
        style={{ ...style, ['--qc-minor-tick-step' as string]: `${pps}px` }}
      >
        <div className="qc-min">
          <button
            type="button"
            className="qc-min__expand"
            onClick={() => (viewerMax ? toggleViewerMax() : setTimelineMinimized(false))}
            aria-label="Expand timeline"
            title="Expand the timeline — full toolbar and lanes return"
            data-testid="mini-btn-timeline-expand"
          >
            <PanelBottomOpen size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <div
            className="qc-scroll"
            data-testid="mini-timeline-scroll"
            ref={scrollRef}
            /* R2-a P3-a (round 3): the CONTINUOUS stash — every scroll
                (user pan, zoom anchor, edge auto-scroll) records the
                origin-corrected leftmost-visible time; the element-swap
                restore reads it. */
            onScroll={noteScroll}
          >
            <div
              style={{
                width,
                minWidth: '100%',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
              data-qc-scroll-content
            >
              <div className="qc-ruler qc-ruler--min">
                <div className="qc-ruler__inner">
                  {/* PR69 C13/C8: the shared scrub surface (was a twin of
                      the full ruler block, now with edge auto-scroll) */}
                  <RulerScrub pps={pps} endTime={endTime} compact setPlayhead={setPlayhead} />
                </div>
              </div>
              {lanes
                .filter((track) => track.kind === 'video')
                /* R18k (thread #21): the minimized strip is the VIDEO
                 * navigation surface — audio sub-rows are hidden by design
                 * (the reviewer's preference). A1 can de-sync from V1 in
                 * the doc, but that editing happens EXPANDED; minimized
                 * = slim + the video pills get the whole strip height
                 * (bigger targets, thread #21's "more selectable"). */
                .map((track) => (
                  <MinLane
                    key={track.id}
                    track={track}
                    pps={pps}
                    snapOn={snapOn}
                    onSnapGuide={setSnapGuide}
                  />
                ))}
              <Playhead pps={pps} endTime={endTime} originPx={MIN_ORIGIN_PX} />
              {snapGuide !== null && (
                <div
                  className="qc-snap-guide"
                  aria-hidden="true"
                  style={{ left: MIN_ORIGIN_PX + timeToPx(snapGuide, pps) }}
                  data-testid="mini-snap-guide"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="qc-timeline"
      data-testid="mini-timeline"
      style={{ ...style, ['--qc-minor-tick-step' as string]: `${pps}px` }} // 1s minor ticks in px (review fix #1)
    >
      <ToolsRow />
      <div className="qc-timeline__scroll-wrap">
        <div className="qc-scroll" data-testid="mini-timeline-scroll" ref={scrollRef} onScroll={noteScroll}>
          {/* ONE shared scroll content (audit M3): ruler + lanes + playhead
              move together; min-width 100% keeps surfaces full-viewport at
              low zoom. Everything inside positions in px from RENDER_ORIGIN.
              R18f (review P1-1): flex column + height 100% so the stage
              stretches and lanes flex-fill when the row splitter grows the
              panel. */}
          <div
            style={{
              width,
              minWidth: '100%',
              position: 'relative',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
            data-qc-scroll-content
          >
            <div className="qc-ruler">
              <div className="qc-ruler__inner">
                {/* PR69 C13/C8: the shared scrub surface (one law, edge
                    auto-scroll included — was duplicated line-for-line in
                    the minimized branch) */}
                <RulerScrub pps={pps} endTime={endTime} setPlayhead={setPlayhead} />
              </div>
            </div>
            <div className="qc-stage">
              <div className="qc-track-layout">
                {/* R18k (review P1-1): the fixed head column — the lane
                    heads live HERE (sticky, never over a clip), row-
                    aligned with their lanes (36px, 22px when the audio
                    lane is collapsed). */}
                <div className="qc-track-heads" role="group" aria-label="Track heads">
                  {lanes.map((track) => (
                    <TrackHead
                      key={track.id}
                      track={track}
                      collapsed={track.kind === 'audio' && !audioLaneVisible}
                    />
                  ))}
                </div>
                <div className="qc-tracks">
                  {lanes.map((track) => (
                    <Lane
                      key={track.id}
                      track={track}
                      pps={pps}
                      snapOn={snapOn}
                      filmstripOn={filmstripOn}
                      onSnapGuide={setSnapGuide}
                    />
                  ))}
                </div>
              </div>
            </div>
            <Playhead pps={pps} endTime={endTime} />
            {snapGuide !== null && (
              <div
                className="qc-snap-guide"
                aria-hidden="true"
                // R18f (review P2-1): + RENDER_ORIGIN_PX — the guide shares the
                // px coordinate law with clips/playhead (content-left + 10)
                style={{ left: RENDER_ORIGIN_PX + timeToPx(snapGuide, pps) }}
                data-testid="mini-snap-guide"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
