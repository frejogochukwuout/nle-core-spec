/* Media pool — 4 mock assets as rounded gradient cards (D3.5).
   Click = append to the correct lane (audio→A1, video/image→V1).
   Drag-to-timeline deliberately cut to v0.2 (DESIGN D3 deviations). */

import { useMini } from '../state/useMini';
import { thumbGradientFor } from '../lib/filmstrip';
import { fmtTimecode } from '../lib/timecode';
import type { Media } from '../lib/mockData';

function MediaCard({ media }: { media: Media }) {
  const addClipFromMedia = useMini((s) => s.addClipFromMedia);
  return (
    <button
      type="button"
      className="mini-media-card"
      onClick={() => addClipFromMedia(media.id)}
      data-testid={`mini-media-${media.id}`}
      aria-label={`Add ${media.name} (${fmtTimecode(media.duration)})`}
    >
      <span
        className="mini-media-card__thumb"
        aria-hidden="true"
        style={{ background: thumbGradientFor(media) }}
      >
        <span className="mini-media-card__kind">{media.kind}</span>
      </span>
      <span className="mini-media-card__meta">
        <span className="mini-media-card__name">{media.name}</span>
        <span className="mini-media-card__dur mini-mono">{fmtTimecode(media.duration)}</span>
      </span>
    </button>
  );
}

export function MediaPool() {
  const media = useMini((s) => s.doc.media);
  return (
    <aside className="mini-panel mini-pool" data-testid="mini-pool">
      <div className="mini-panel__head">Media</div>
      <div className="mini-scroll mini-pool__list">
        {media.map((m) => (
          <MediaCard key={m.id} media={m} />
        ))}
      </div>
    </aside>
  );
}
