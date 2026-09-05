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
   magnet paints the snap guide (2px, tracks-wide).

   R18e additions: RH cut styles (cut head / cut tail at playhead —
   feedback #7), ripple toggle (#16), filmstrip↔color-block toggle
   (#15), audio-lane visibility (#8), real waveform envelopes (#12),
   pool→timeline DnD drop zones (#13 polish wave / v0.2 deferral closed),
   playhead Enter no-op (#11). */

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type DragEvent as ReactDragEvent, useMemo } from 'react';
import {
  Undo2,
  Redo2,
  Scissors,
  Trash2,
  Magnet,
  ZoomOut,
  ZoomIn,
  FoldHorizontal,
  Film,
  Eye,
  EyeOff,
} from 'lucide-react';
/* R18g (thread #23): purpose-drawn trim glyphs — the lucide
   ArrowLeftToLine/ArrowRightToLine pair read as jump-to-start/end */
import { TrimStartIcon, TrimEndIcon } from '../lib/icons';
import { useMini } from '../state/useMini';
import { useKeys } from '../hooks/useKeys';
import {
  clipsOfTrack,
  contentEnd,
  insertionAt,
  labelStepFor,
  magnetTarget,
  ppsFor,
  resolveSnap,
  timeToPx,
  pxToTime,
} from '../lib/geometry';
import { fmtRulerLabel, fmtTimecode } from '../lib/timecode';
import { filmstripFor } from '../lib/filmstrip';
import { waveformFor } from '../lib/waveform';
import { POOL_DRAG_TYPE, isDroppable, poolDrag } from '../shell/MediaPool';
import type { Clip, Media, Track } from '../lib/mockData';
import './timeline.css';

const DRAG_THRESHOLD_PX = 5;
/** shared render origin: content-left → ruler/lane/playhead t=0 (px) */
const RENDER_ORIGIN_PX = 10;

/* ---------- tools row (RH-verbatim look, R18e additions) ---------- */

function ToolsRow() {
  const zoomStep = useMini((s) => s.zoomStep);
  const snapOn = useMini((s) => s.snapOn);
  const rippleOn = useMini((s) => s.rippleOn);
  const filmstripOn = useMini((s) => s.filmstripOn);
  const audioLaneVisible = useMini((s) => s.audioLaneVisible);
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

  return (
    <div className="qc-timeline__tools" data-testid="mini-timeline-tools">
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
          <Scissors />
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
          title="Snapping (grid + magnet) — off by default"
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
          max={4}
          step={1}
          aria-label="Timeline zoom"
          value={zoomStep}
          onChange={(e) => setZoomStep(Number(e.target.value))}
          style={{ ['--qc-slider-pct' as string]: `${(zoomStep / 4) * 100}%` }}
          data-testid="mini-zoom-slider"
        />
        <button
          type="button"
          className="qc-toolbar__mini-icon"
          aria-label="Zoom in"
          title="Zoom in (+)"
          disabled={zoomStep === 4}
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

function RulerMarks({ pps, endTime }: { pps: number; endTime: number }) {
  const marks: React.ReactNode[] = [];
  const step = labelStepFor(pps);
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
}

function ClipItem({ clip, media, pps, snapOn, selected, filmstripOn, snapTargets, onSnapGuide }: ClipProps) {
  const select = useMini((s) => s.select);
  const beginDrag = useMini((s) => s.beginDrag);
  const endDrag = useMini((s) => s.endDrag);
  const cancelDrag = useMini((s) => s.cancelDrag);
  const previewMove = useMini((s) => s.previewMove);
  const previewTrim = useMini((s) => s.previewTrim);
  const trimClip = useMini((s) => s.trimClip);
  const rippleOn = useMini((s) => s.rippleOn); // R18f: handle hints change under ripple
  const [dragging, setDragging] = useState(false);

  /* gesture session (component-held; the store holds the doc snapshot) */
  const g = useRef<{
    kind: 'move' | 'trim-start' | 'trim-end' | null;
    pointerId: number | null; // this gesture owns exactly one pointer (fix #4)
    startX: number;
    grabOffset: number; // pointerTime − clip.start at pointerdown
    active: boolean;
    id: string;
  }>({ kind: null, pointerId: null, startX: 0, grabOffset: 0, active: false, id: '' });

  const timeAt = (clientX: number, el: HTMLElement): number => {
    const content = el.closest('[data-qc-scroll-content]') as HTMLElement | null;
    const origin = (content ? content.getBoundingClientRect().left : 0) + RENDER_ORIGIN_PX;
    return pxToTime(clientX - origin, pps);
  };

  const startGesture = (
    e: ReactPointerEvent<HTMLElement>,
    kind: 'move' | 'trim-start' | 'trim-end',
  ) => {
    if (e.button !== 0) return;
    if (useMini.getState().dragActive) return; // one gesture at a time (fix #4)
    select(clip.id); // select-on-pointerdown (before the lock can engage)
    g.current = {
      kind,
      pointerId: e.pointerId,
      startX: e.clientX,
      grabOffset: timeAt(e.clientX, e.currentTarget as HTMLElement) - clip.start,
      active: false,
      id: clip.id,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const gs = g.current;
    if (!gs.kind || gs.id !== clip.id) return;
    if (gs.pointerId !== null && e.pointerId !== gs.pointerId) return; // foreign pointer
    if (!gs.active) {
      if (Math.abs(e.clientX - gs.startX) < DRAG_THRESHOLD_PX) return; // 5px threshold
      gs.active = true;
      setDragging(true);
      beginDrag(); // interaction lock engages exactly when the gesture does
    }
    const t = timeAt(e.clientX, e.currentTarget as HTMLElement);
    if (gs.kind === 'move') {
      const raw = t - gs.grabOffset;
      // R18e: report the engaged magnet (guide paints at the TARGET)
      onSnapGuide(snapOn ? magnetTarget(raw, pps, snapTargets) : null);
      previewMove(clip.id, resolveSnap(raw, snapOn, pps, snapTargets));
    } else if (gs.kind === 'trim-start') {
      onSnapGuide(snapOn ? magnetTarget(t, pps, snapTargets) : null);
      previewTrim(clip.id, 'start', resolveSnap(t, snapOn, pps, snapTargets));
    } else {
      onSnapGuide(snapOn ? magnetTarget(t, pps, snapTargets) : null);
      previewTrim(clip.id, 'end', resolveSnap(t, snapOn, pps, snapTargets));
    }
  };

  const finishGesture = (e: ReactPointerEvent<HTMLElement>, canceled: boolean) => {
    const gs = g.current;
    if (!gs.kind || gs.id !== clip.id) return;
    if (gs.pointerId !== null && e.pointerId !== gs.pointerId) return; // foreign pointer
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released (jsdom-safe) */
    }
    onSnapGuide(null); // guide clears with the gesture (R18e)
    if (gs.active) {
      if (canceled) cancelDrag(); // Esc / pointercancel
      else endDrag(); // ONE history entry per committed gesture
    }
    setDragging(false);
    g.current = { kind: null, pointerId: null, startX: 0, grabOffset: 0, active: false, id: '' };
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
  if (!isAudio && filmstripOn) {
    // RH clip body: per-clip grey gradient (extraction §3)
    style.background = 'linear-gradient(135deg, rgba(120,120,120,0.95), rgba(72,72,72,0.92))';
  }

  return (
    <div
      className={`qc-track-item${selected ? ' is-selected' : ''}${dragging ? ' is-dragging' : ''}`}
      style={style}
      data-testid={`mini-clip-${clip.id}`}
      data-clip-id={clip.id}
      aria-label={`Clip ${media?.name ?? clip.id}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          // select from the keyboard; stopPropagation beats the window-level
          // Space=play listener (target handlers run before window bubble)
          e.preventDefault();
          e.stopPropagation();
          select(clip.id);
        }
      }}
      onPointerDown={(e) => startGesture(e, 'move')}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finishGesture(e, false)}
      onPointerCancel={(e) => finishGesture(e, true)}
    >
      {isAudio ? (
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
      <button
        type="button"
        className="qc-track-item__trim qc-track-item__trim--start"
        aria-label={`Trim start of ${media?.name ?? clip.id}`}
        title={
          rippleOn
            ? 'Ripple trim start — the head closes; later clips follow left (←/→ when focused)'
            : 'Drag to trim — ←/→ when focused'
        }
        data-testid={`mini-trim-start-${clip.id}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          startGesture(e, 'trim-start');
        }}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finishGesture(e, false)}
        onPointerCancel={(e) => finishGesture(e, true)}
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
            : 'Drag to trim — ←/→ when focused'
        }
        data-testid={`mini-trim-end-${clip.id}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          startGesture(e, 'trim-end');
        }}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finishGesture(e, false)}
        onPointerCancel={(e) => finishGesture(e, true)}
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
}

/* ---------- lane (R18e: + pool DnD drop zone + visibility) ---------- */

interface DropPreview {
  startPx: number;
  widthPx: number;
}

function Lane({
  track,
  pps,
  snapOn,
  playhead,
  filmstripOn,
  onSnapGuide,
}: {
  track: Track;
  pps: number;
  snapOn: boolean;
  playhead: number;
  filmstripOn: boolean;
  onSnapGuide: (t: number | null) => void;
}) {
  const doc = useMini((s) => s.doc);
  const selectedId = useMini((s) => s.selectedId);
  const audioLaneVisible = useMini((s) => s.audioLaneVisible);
  const insertMediaAt = useMini((s) => s.insertMediaAt);
  const toggleAudioLane = useMini((s) => s.toggleAudioLane);
  const clips = clipsOfTrack(doc, track.id);
  const [drop, setDrop] = useState<DropPreview | null>(null);

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
    const origin = (content ? content.getBoundingClientRect().left : 0) + RENDER_ORIGIN_PX;
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
    const origin = (content ? content.getBoundingClientRect().left : 0) + RENDER_ORIGIN_PX;
    const t = pxToTime(e.clientX - origin, pps);
    insertMediaAt(media.id, track.id, t);
  };

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
          if (!media || media.kind !== 'audio') return; // video on A1 stays a no-op
          toggleAudioLane(); // restore the lane, then place
          const content = e.currentTarget.closest('[data-qc-scroll-content]') as HTMLElement | null;
          const origin = (content ? content.getBoundingClientRect().left : 0) + RENDER_ORIGIN_PX;
          insertMediaAt(media.id, track.id, pxToTime(e.clientX - origin, pps));
        }}
        data-testid="mini-lane-A1-collapsed"
        title="Audio lane hidden — click to show (A1)"
        aria-label={`Audio lane hidden, ${hiddenCount} clip${hiddenCount === 1 ? '' : 's'} preserved — click to show`}
      >
        A1 · {hiddenCount} hidden
        <Eye size={14} strokeWidth={1.5} aria-hidden="true" />
      </button>
    );
  }

  const dropping = drop !== null;

  return (
    <div
      className={`qc-track-row__content${dropping ? ' is-drop-target' : ''}`}
      role="group"
      aria-label={track.kind === 'audio' ? 'Audio track A1' : 'Video track V1'}
      data-testid={`mini-lane-${track.id}`}
      data-track-kind={track.kind}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <span className="qc-track-row__badge">{track.label}</span>
      {clips.map((c) => {
        // magnet targets (fix #2): same-track neighbors (never self) + playhead
        const targets: number[] = [playhead];
        for (const other of clips) {
          if (other.id === c.id) continue;
          targets.push(other.start, other.start + other.duration);
        }
        return (
          <ClipItem
            key={c.id}
            clip={c}
            media={doc.media.find((m) => m.id === c.mediaId)}
            pps={pps}
            snapOn={snapOn}
            selected={selectedId === c.id}
            filmstripOn={filmstripOn}
            snapTargets={targets}
            onSnapGuide={onSnapGuide}
          />
        );
      })}
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

/* ---------- playhead ---------- */

function Playhead({ pps, endTime }: { pps: number; endTime: number }) {
  const playhead = useMini((s) => s.playhead);
  const setPlayhead = useMini((s) => s.setPlayhead);
  const [dragging, setDragging] = useState(false);
  const x = timeToPx(playhead, pps);
  const atStart = playhead < 0.5;
  const atEnd = playhead > endTime - 0.5;

  const scrubFrom = (e: ReactPointerEvent<HTMLElement>) => {
    const content = e.currentTarget.closest('[data-qc-scroll-content]') as HTMLElement | null;
    const origin = (content ? content.getBoundingClientRect().left : 0) + RENDER_ORIGIN_PX;
    setPlayhead(pxToTime(e.clientX - origin, pps));
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
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (dragging) scrubFrom(e);
        }}
        onPointerUp={(e) => {
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          } catch {
            /* jsdom-safe */
          }
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

export function Timeline({ style }: { style?: CSSProperties }) {
  const doc = useMini((s) => s.doc);
  const zoomStep = useMini((s) => s.zoomStep);
  const playhead = useMini((s) => s.playhead);
  const snapOn = useMini((s) => s.snapOn);
  const filmstripOn = useMini((s) => s.filmstripOn);
  const setPlayhead = useMini((s) => s.setPlayhead);
  // R18f (review P1-4): the keyboard surface lives HERE, not in App — the
  // solo Timeline stories get the advertised shortcuts (S/[/]/Del/⌘Z…);
  // App renders Timeline, so the hook still mounts exactly once.
  useKeys();
  /** R18e: the engaged magnet target while a gesture runs (snap guide) */
  const [snapGuide, setSnapGuide] = useState<number | null>(null);
  const pps = ppsFor(zoomStep);
  const endTime = Math.max(contentEnd(doc.clips), 8); // min 8s ruler runway
  const width = timeToPx(endTime, pps);

  return (
    <div
      className="qc-timeline"
      data-testid="mini-timeline"
      style={{ ...style, ['--qc-minor-tick-step' as string]: `${pps}px` }} // 1s minor ticks in px (review fix #1)
    >
      <ToolsRow />
      <div className="qc-timeline__scroll-wrap">
        <div className="qc-scroll" data-testid="mini-timeline-scroll">
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
                <div
                  className="qc-ruler__content"
                  data-testid="mini-ruler"
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    if (useMini.getState().dragActive) return; // lock (fix #4)
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setPlayhead(pxToTime(e.clientX - rect.left, pps));
                  }}
                  onPointerMove={(e) => {
                    if (e.buttons === 1 && !useMini.getState().dragActive) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setPlayhead(pxToTime(e.clientX - rect.left, pps));
                    }
                  }}
                >
                  <RulerMarks pps={pps} endTime={endTime} />
                </div>
              </div>
            </div>
            <div className="qc-stage">
              <div className="qc-track-layout">
                <div className="qc-tracks" style={{ width: '100%' }}>
                  {doc.tracks.map((track) => (
                    <Lane
                      key={track.id}
                      track={track}
                      pps={pps}
                      snapOn={snapOn}
                      playhead={playhead}
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
