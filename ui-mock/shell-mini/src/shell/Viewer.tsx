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
   viewer takes the freed space. */

import { Play, Pause, Maximize2, Minimize2 } from 'lucide-react';
import { useMini, VIEWER_ASPECTS, aspectEntry, boundClips } from '../state/useMini';
import { fmtTimecode } from '../lib/timecode';
import { thumbGradientFor } from '../lib/filmstrip';
import { contentEnd } from '../lib/geometry';

export function Viewer() {
  const playhead = useMini((s) => s.playhead);
  const playing = useMini((s) => s.playing);
  const doc = useMini((s) => s.doc);
  const togglePlay = useMini((s) => s.togglePlay);
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
            aria-hidden="true"
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
        <span className="mini-mono mini-viewer__tcgroup" data-testid="mini-tc">
          <span className="mini-viewer__tc-cur">{fmtTimecode(playhead)}</span>
          <span className="mini-viewer__tc-sep">{' / '}</span>
          <span className="mini-viewer__tc-total">{fmtTimecode(end)}</span>
        </span>
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
    </section>
  );
}
