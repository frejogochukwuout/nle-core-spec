/* Viewer — dark stage (D3.6): shows the media card of the clip under the
   playhead (topmost video/image clip). R18g (threads #24/#25): the
   transport (timecode + play control) now lives BELOW the video, centered
   — RH's grammar (grid [1fr auto 1fr]: tc left · play center · name
   right). R18j (thread #16): the right transport slot became the ASPECT
   RATIO controller (the media name lives in the Inspector — one place,
   and the reviewer asked for the controller "instead"); the stage
   letterboxes the frame to the chosen AR (container-query min() — the
   frame always fits AND always keeps its ratio). R18j (thread #19): the
   head's max button toggles the composed full-screen mode — pool +
   inspector collapse to rails, the timeline MINIMIZES (never hides), the
   viewer takes the freed space. R19 (thread #53 + the scrubbing item):
   the transport's left slot gains the seek controls (to-start + to the
   current clip's head — purpose-drawn glyphs), and a full-width SCRUB
   BAR joins as the transport's second row — the bar's CENTER sits
   directly under the centered play button (the reviewer's
   "centerly aligned" reading), drag/click scrubs the playhead, and the
   focusable slider surface carries ←/→/Home/End. */

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Maximize2, Minimize2 } from 'lucide-react';
import { useMini, VIEWER_ASPECTS, aspectEntry, boundClips } from '../state/useMini';
import { usePlayhead } from '../hooks/usePlayhead';
import { fmtTimecode } from '../lib/timecode';
import { thumbGradientFor } from '../lib/filmstrip';
import { contentEnd, RUNWAY_FLOOR_S } from '../lib/geometry';
import { ToStartIcon, ClipHeadIcon } from '../lib/icons';

export function Viewer() {
  /* PR69 C3: the playback loop mounts HERE too (singleton — Timeline
   * mounts it as well; the hook guarantees ONE rAF loop per document),
   * so the SOLO viewer-panel story plays for real instead of flipping
   * the icon over a frozen timecode. */
  usePlayhead();
  const playhead = useMini((s) => s.playhead);
  const playing = useMini((s) => s.playing);
  const doc = useMini((s) => s.doc);
  const togglePlay = useMini((s) => s.togglePlay);
  const setPlayhead = useMini((s) => s.setPlayhead);
  const seekToClipHead = useMini((s) => s.seekToClipHead);
  const viewerMax = useMini((s) => s.viewerMax);
  const toggleViewerMax = useMini((s) => s.toggleViewerMax);
  const viewerAspect = useMini((s) => s.viewerAspect);
  const setViewerAspect = useMini((s) => s.setViewerAspect);
  /* R18k (threads #21/#23): the viewer plays the BOUND world — a V2 clip
   * under the playhead never leaks into a V1-bound session (and video-only
   * mode never surfaces the full editor's audio-lane content). */
  const trackMode = useMini((s) => s.trackMode);
  const boundVideoTrack = useMini((s) => s.boundVideoTrack);
  const boundAudioTrack = useMini((s) => s.boundAudioTrack);
  const world = boundClips(doc, trackMode, boundVideoTrack, boundAudioTrack);

  const under = world
    .filter((c) => {
      const media = doc.media.find((m) => m.id === c.mediaId);
      return media && media.kind !== 'audio' && playhead >= c.start && playhead < c.start + c.duration;
    })
    .sort((a, b) => b.start - a.start)[0];
  const media = under ? doc.media.find((m) => m.id === under.mediaId) : undefined;
  const end = contentEnd(world);
  const ar = aspectEntry(viewerAspect);

  return (
    <section className="mini-panel mini-viewer" data-testid="mini-viewer" aria-label="Viewer">
      <div className="mini-panel__head mini-viewer__head">
        <span className="mini-viewer__head-label">Viewer</span>
        {/* R18j (thread #19): max/full-screen toggle — composes the panel
            collapses (left rail + right rail + minimized timeline); the
            minimized timeline STAYS operable, so scrubbing continues in
            the big view. Toggle-back restores the user's exact layout. */}
        <button
          type="button"
          className="mini-viewer__maxbtn"
          aria-label={viewerMax ? 'Restore normal layout' : 'Maximize viewer'}
          aria-pressed={viewerMax}
          title={
            viewerMax
              ? 'Restore the normal layout (panels and timeline return)'
              : 'Maximize the viewer — side panels collapse, timeline minimizes'
          }
          onClick={toggleViewerMax}
          data-testid="mini-btn-viewer-max"
        >
          {viewerMax ? <Minimize2 size={14} strokeWidth={1.75} /> : <Maximize2 size={14} strokeWidth={1.75} />}
        </button>
      </div>
      <div className="mini-viewer__stage">
        {media ? (
          <div
            className="mini-viewer__frame"
            /* PR69 C20: the populated stage announces itself — the frame
             * was aria-hidden with no text alternative, so a screen-reader
             * user got MORE information from the EMPTY state ("No clip
             * under the playhead") than from the populated one. The clip
             * under the playhead is the viewer's single most important
             * piece of state; role="img" + label mirrors the empty
             * state's honesty. (The gradient itself stays decorative —
             * the LABEL carries the content.) */
            role="img"
            aria-label={`${media.name} — under the playhead`}
            style={{
              background: thumbGradientFor(media),
              aspectRatio: ar.css,
              /* letterbox law: the frame is exactly as wide as the SHORTER
                 constraint allows — never cropped, never distorted. cqw/cqh
                 come from the stage (container-type: size). jsdom leaves
                 the declaration uncomputed; tests assert aspectRatio. */
              width: `min(100cqw, calc(100cqh * ${ar.ratio}))`,
            }}
            data-testid="mini-viewer-frame"
          />
        ) : (
          <div className="mini-viewer__empty" data-testid="mini-viewer-empty">
            <span className="mini-viewer__empty-title">No clip under the playhead</span>
            <span className="mini-viewer__empty-hint">
              Move the playhead over a video clip, or add media from the pool.
            </span>
          </div>
        )}
      </div>
      <div className="mini-viewer__transport" data-testid="mini-viewer-transport">
        {/* R19 (thread #53): the seek controls join the LEFT transport slot
            (before the timecode): to-start (⏮, Home) + to the current clip's
            head (|◀, walks back edit by edit). */}
        <div className="mini-viewer__seek">
          <button
            type="button"
            className="mini-viewer__seekbtn"
            aria-label="Back to the beginning"
            title="Back to the beginning (Home)"
            onClick={() => setPlayhead(0)}
            data-testid="mini-btn-seek-start"
          >
            <ToStartIcon />
          </button>
          <button
            type="button"
            className="mini-viewer__seekbtn"
            aria-label="Back to the head of the current clip"
            title="Back to the head of the current clip — repeated taps walk back edit by edit"
            onClick={seekToClipHead}
            data-testid="mini-btn-seek-cliphead"
          >
            <ClipHeadIcon />
          </button>
          <span className="mini-mono mini-viewer__tcgroup" data-testid="mini-tc">
            <span className="mini-viewer__tc-cur">{fmtTimecode(playhead)}</span>
            <span className="mini-viewer__tc-sep">{' / '}</span>
            <span className="mini-viewer__tc-total">{fmtTimecode(end)}</span>
          </span>
        </div>
        <button
          type="button"
          className="mini-viewer__playbtn"
          aria-label={playing ? 'Pause' : 'Play'}
          title={playing ? 'Pause (Space)' : 'Play (Space)'}
          onClick={() => togglePlay()}
          data-testid="mini-btn-play"
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        {/* R18j (thread #16): the aspect controller — a styled native
            <select> (keyboard + a11y for free). Replaces the media-name
            span; the name lives in the Inspector now. */}
        <label className="mini-viewer__aspect" data-testid="mini-viewer-aspect">
          <span className="mini-viewer__aspect-label">Aspect</span>
          <select
            className="mini-viewer__aspect-select"
            value={viewerAspect}
            onChange={(e) => setViewerAspect(e.target.value as typeof viewerAspect)}
            aria-label="Viewer aspect ratio"
            data-testid="mini-viewer-aspect-select"
          >
            {VIEWER_ASPECTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {/* R19: the scrub bar — full-width under the transport row; its CENTER
          sits directly below the centered play button. Extent law:
          max(contentEnd(bound world), RUNWAY_FLOOR_S) — the ruler's runway
          floor family, always ≤ rulerEnd, so the bar never fights the
          store's scrub clamp; the tick pins full when a ruler scrub parks
          past the content end. */}
      <ScrubBar extent={Math.max(end, RUNWAY_FLOOR_S)} />
    </section>
  );
}

/* ---------- R19 (thread #53): the scrub bar -------------------------
 * The viewer-side scrubbing surface: progress fill + playhead tick,
 * drag/click to seek, focusable role=slider (←/→ 0.5s, Home/End). The
 * bar's own pointer session does NOT engage the clip interaction lock
 * (same view-level law as the ruler scrub — setPlayhead's drag gate
 * keeps an in-flight clip gesture the only doc-touching gesture). */
function ScrubBar({ extent }: { extent: number }) {
  const playhead = useMini((s) => s.playhead);
  const setPlayhead = useMini((s) => s.setPlayhead);
  /* R1-b P2-2/R2: the pending window opens with the scrub (mutating keys
   * die; tick freezes — the scrub surfaces now share the clip gestures'
   * lock family). */
  const beginPendingGesture = useMini((s) => s.beginPendingGesture);
  const endPendingGesture = useMini((s) => s.endPendingGesture);
  const [dragging, setDragging] = useState(false);
  /* R2-a P3-b (round 3): unmount sweep — an unmount mid-scrub (host
   * remount / HMR / the viewer leaving the tree) never delivers a
   * pointerup; the shared pending window closes with the surface or
   * mutating keys stay dead until the next gesture completes. The
   * zustand action identity is stable, so mount-only deps are safe. */
  useEffect(() => () => endPendingGesture(), [endPendingGesture]);
  const barRef = useRef<HTMLDivElement>(null);
  const frac = extent > 0 ? Math.min(playhead / extent, 1) : 0;

  const timeAt = (clientX: number): number => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return playhead; // jsdom / unmeasured
    const f = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(1, f)) * extent;
  };

  return (
    <div
      ref={barRef}
      className={`mini-viewer__scrub${dragging ? ' is-dragging' : ''}`}
      role="slider"
      tabIndex={0}
      aria-label="Scrub playhead"
      aria-valuemin={0}
      aria-valuemax={Math.round(extent * 100) / 100}
      aria-valuenow={Math.round(Math.min(playhead, extent) * 100) / 100}
      aria-valuetext={`${fmtTimecode(playhead)} of ${fmtTimecode(extent)}`}
      title="Drag to scrub — click to seek (←/→ when focused, Home/End)"
      data-testid="mini-viewer-scrub"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* untrusted/synthetic pointers (tests) have no active capture
             target — the drag still works, capture is an enhancement */
        }
        beginPendingGesture();
        setDragging(true);
        setPlayhead(timeAt(e.clientX));
      }}
      onPointerMove={(e) => {
        if (dragging) setPlayhead(timeAt(e.clientX));
      }}
      onPointerUp={(e) => {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          /* jsdom-safe */
        }
        endPendingGesture();
        setDragging(false);
      }}
      /* R1-b P2-2: pointercancel runs the FULL release path — the bar had
       * no cancel handler at all, so a touch/pen scrub interrupted by a
       * browser gesture left `dragging` true and later HOVER moves kept
       * seeking with no button held. */
      onPointerCancel={(e) => {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          /* jsdom-safe */
        }
        endPendingGesture();
        setDragging(false);
      }}
      onKeyDown={(e) => {
        // keyboard scrub — stopPropagation keeps the window-level useKeys
        // surface quiet while the bar owns the keys (target handlers run
        // before the window bubble listener)
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          setPlayhead(useMini.getState().playhead + (e.key === 'ArrowLeft' ? -0.5 : 0.5));
        } else if (e.key === 'Home') {
          e.preventDefault();
          e.stopPropagation();
          setPlayhead(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          e.stopPropagation();
          setPlayhead(extent);
        }
      }}
    >
      <div className="mini-viewer__scrub-track" aria-hidden="true">
        <div className="mini-viewer__scrub-fill" style={{ width: `${frac * 100}%` }} />
      </div>
      <div
        className={`mini-viewer__scrub-head${dragging ? ' is-dragging' : ''}`}
        style={{ left: `${frac * 100}%` }}
        aria-hidden="true"
      />
    </div>
  );
}
