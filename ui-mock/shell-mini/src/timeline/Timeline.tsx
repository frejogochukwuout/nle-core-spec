/* Timeline — the RH quick-cut port (DESIGN D7/D10, extraction §3).
   Structure (mini deviation, audit M3): ONE shared horizontal scroll
   wrapper contains ruler + lanes + playhead overlay; the tools row is
   fixed above it. Clip/Playhead/Ruler live in this file as internal
   components (audit m12 consolidation).

   Coordinate law (review fix #1/#3): ALL time↔px math positions in px
   from the shared RENDER ORIGIN — the scroll content's left + 10px
   (ruler padding 0 10px; stage margin 2 + layout padding 8; playhead
   overlay inset 10). Ruler marks are px-positioned (left: t*pps), NOT
   % — % stretched with the min-width:100% content and desynced from
   clips. Pointer events invert through the same origin.

   Gesture law (review fix #4): one gesture at a time — startGesture
   bails while another drag is active and tracks its own pointerId;
   the store's interaction lock gates everything but Esc.

   Snap law (review fix #2): magnet targets = SAME-TRACK neighbor edges
   + playhead, NEVER the dragged clip's own edges. */

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Undo2, Redo2, Scissors, Trash2, Magnet, ZoomOut, ZoomIn } from 'lucide-react';
import { useMini } from '../state/useMini';
import {
  clipsOfTrack,
  contentEnd,
  labelStepFor,
  ppsFor,
  resolveSnap,
  timeToPx,
  pxToTime,
} from '../lib/geometry';
import { fmtRulerLabel, fmtTimecode } from '../lib/timecode';
import { filmstripFor } from '../lib/filmstrip';
import type { Clip, Media, Track } from '../lib/mockData';
import './timeline.css';

const DRAG_THRESHOLD_PX = 5;
/** shared render origin: content-left → ruler/lane/playhead t=0 (px) */
const RENDER_ORIGIN_PX = 10;

/* ---------- tools row (RH-verbatim look) ---------- */

function ToolsRow() {
  const zoomStep = useMini((s) => s.zoomStep);
  const snapOn = useMini((s) => s.snapOn);
  const canUndo = useMini((s) => s.past.length > 0);
  const canRedo = useMini((s) => s.future.length > 0);
  const selectedId = useMini((s) => s.selectedId);
  const undo = useMini((s) => s.undo);
  const redo = useMini((s) => s.redo);
  const splitAtPlayhead = useMini((s) => s.splitAtPlayhead);
  const deleteSelected = useMini((s) => s.deleteSelected);
  const toggleSnap = useMini((s) => s.toggleSnap);
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
          title="Snapping (grid + magnet)"
          onClick={() => toggleSnap()}
          data-testid="mini-btn-snap"
        >
          <Magnet />
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

/* ---------- clip ---------- */

interface ClipProps {
  clip: Clip;
  media: Media | undefined;
  pps: number;
  snapOn: boolean;
  selected: boolean;
  /** magnet targets for THIS clip: same-track neighbor edges + playhead
   *  (own edges excluded — review fix #2) */
  snapTargets: number[];
}

function ClipItem({ clip, media, pps, snapOn, selected, snapTargets }: ClipProps) {
  const select = useMini((s) => s.select);
  const beginDrag = useMini((s) => s.beginDrag);
  const endDrag = useMini((s) => s.endDrag);
  const cancelDrag = useMini((s) => s.cancelDrag);
  const previewMove = useMini((s) => s.previewMove);
  const previewTrim = useMini((s) => s.previewTrim);
  const trimClip = useMini((s) => s.trimClip);
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
      previewMove(clip.id, resolveSnap(raw, snapOn, pps, snapTargets));
    } else if (gs.kind === 'trim-start') {
      previewTrim(clip.id, 'start', resolveSnap(t, snapOn, pps, snapTargets));
    } else {
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
  const style: React.CSSProperties = {
    left: timeToPx(clip.start, pps),
    width: Math.max(timeToPx(clip.duration, pps), 1),
  };
  if (!isAudio) {
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
        <span className="qc-track-item__waveform" aria-hidden="true" />
      ) : (
        media && (
          <span
            className="qc-track-item__filmstrip"
            aria-hidden="true"
            style={{ backgroundImage: filmstripFor(media) }}
          />
        )
      )}
      <span className="qc-track-item__label">{media?.name ?? clip.id}</span>
      <button
        type="button"
        className="qc-track-item__trim qc-track-item__trim--start"
        aria-label={`Trim start of ${media?.name ?? clip.id}`}
        title="Drag to trim — ←/→ when focused"
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
        title="Drag to trim — ←/→ when focused"
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

/* ---------- lane ---------- */

function Lane({
  track,
  pps,
  snapOn,
  playhead,
}: {
  track: Track;
  pps: number;
  snapOn: boolean;
  playhead: number;
}) {
  const doc = useMini((s) => s.doc);
  const selectedId = useMini((s) => s.selectedId);
  const clips = clipsOfTrack(doc, track.id);

  return (
    <div
      className="qc-track-row__content"
      role="group"
      aria-label={track.kind === 'audio' ? 'Audio track A1' : 'Video track V1'}
      data-testid={`mini-lane-${track.id}`}
      data-track-kind={track.kind}
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
            snapTargets={targets}
          />
        );
      })}
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

export function Timeline() {
  const doc = useMini((s) => s.doc);
  const zoomStep = useMini((s) => s.zoomStep);
  const playhead = useMini((s) => s.playhead);
  const snapOn = useMini((s) => s.snapOn);
  const setPlayhead = useMini((s) => s.setPlayhead);
  const pps = ppsFor(zoomStep);
  const endTime = Math.max(contentEnd(doc.clips), 8); // min 8s ruler runway
  const width = timeToPx(endTime, pps);

  return (
    <div
      className="qc-timeline"
      data-testid="mini-timeline"
      style={{ ['--qc-minor-tick-step' as string]: `${pps}px` }} // 1s minor ticks in px (review fix #1)
    >
      <ToolsRow />
      <div className="qc-scroll" data-testid="mini-timeline-scroll">
        {/* ONE shared scroll content (audit M3): ruler + lanes + playhead
            move together; min-width 100% keeps surfaces full-viewport at
            low zoom. Everything inside positions in px from RENDER_ORIGIN. */}
        <div style={{ width, minWidth: '100%', position: 'relative' }} data-qc-scroll-content>
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
                  <Lane key={track.id} track={track} pps={pps} snapOn={snapOn} playhead={playhead} />
                ))}
              </div>
            </div>
          </div>
          <Playhead pps={pps} endTime={endTime} />
        </div>
      </div>
    </div>
  );
}
