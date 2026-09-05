/* Viewer — dark stage (D3.6): shows the media card of the clip under the
   playhead (topmost video/image clip), plus a big timecode and a play
   overlay pill in RH's dark-translucent style (NOT green — audit m6). */

import { Play } from 'lucide-react';
import { useMini } from '../state/useMini';
import { fmtTimecode } from '../lib/timecode';
import { thumbGradientFor } from '../lib/filmstrip';

export function Viewer() {
  const playhead = useMini((s) => s.playhead);
  const playing = useMini((s) => s.playing);
  const doc = useMini((s) => s.doc);
  const togglePlay = useMini((s) => s.togglePlay);

  const under = doc.clips
    .filter((c) => {
      const media = doc.media.find((m) => m.id === c.mediaId);
      return media && media.kind !== 'audio' && playhead >= c.start && playhead < c.start + c.duration;
    })
    .sort((a, b) => b.start - a.start)[0];
  const media = under ? doc.media.find((m) => m.id === under.mediaId) : undefined;

  return (
    <section className="mini-panel mini-viewer" data-testid="mini-viewer" aria-label="Viewer">
      <div className="mini-panel__head">Viewer</div>
      <div className="mini-viewer__stage">
        {media ? (
          <>
            <div
              className="mini-viewer__frame"
              aria-hidden="true"
              style={{ background: thumbGradientFor(media) }}
            />
            <div className="mini-viewer__info">
              <span className="mini-viewer__name">{media.name}</span>
              <span className="mini-mono mini-viewer__tc">{fmtTimecode(playhead)}</span>
            </div>
          </>
        ) : (
          <div className="mini-viewer__empty" data-testid="mini-viewer-empty">
            <span className="mini-viewer__empty-title">No clip under the playhead</span>
            <span className="mini-viewer__empty-hint">
              Move the playhead over a video clip, or add media from the pool.
            </span>
          </div>
        )}
        {!playing && media && (
          <button
            type="button"
            className="mini-viewer__play"
            aria-label="Play"
            onClick={() => togglePlay()}
            data-testid="mini-viewer-play"
          >
            <Play size={18} />
          </button>
        )}
      </div>
    </section>
  );
}
