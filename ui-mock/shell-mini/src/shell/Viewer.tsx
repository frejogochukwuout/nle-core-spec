/* Viewer — dark stage (D3.6): shows the media card of the clip under the
   playhead (topmost video/image clip). R18g (threads #24/#25): the
   transport (timecode + play control) now lives BELOW the video, centered
   — RH's grammar (grid [1fr auto 1fr]: tc left · play center · name
   right). The old in-stage info overlay (name + big tc) and the topbar
   transport are both gone; the topbar keeps brand + Export. */

import { Play, Pause } from 'lucide-react';
import { useMini } from '../state/useMini';
import { fmtTimecode } from '../lib/timecode';
import { thumbGradientFor } from '../lib/filmstrip';
import { contentEnd } from '../lib/geometry';

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
  const end = contentEnd(doc.clips);

  return (
    <section className="mini-panel mini-viewer" data-testid="mini-viewer" aria-label="Viewer">
      <div className="mini-panel__head">Viewer</div>
      <div className="mini-viewer__stage">
        {media ? (
          <div
            className="mini-viewer__frame"
            aria-hidden="true"
            style={{ background: thumbGradientFor(media) }}
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
        <span className="mini-viewer__transportmeta" data-testid="mini-viewer-meta">
          {media ? media.name : ''}
        </span>
      </div>
    </section>
  );
}
