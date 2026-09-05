/* Media pool — mock asset cards (D3.5, R18e).
   Click = append to the correct lane (audio→A1, video/image→V1).
   DRAG = pool→timeline DnD (R18e, the v0.2 deferral closed — pattern
   ported from the sibling shell-variants env, with a REAL commit on
   drop: the lane drop zones live in Timeline.tsx and call
   insertMediaAt, so a drop actually places the clip at the cursor
   position, not a toast). */

import { useState, type DragEvent as ReactDragEvent } from 'react';
import { Film, Image as ImageIcon, AudioLines } from 'lucide-react';
import { useMini } from '../state/useMini';
import { thumbGradientFor } from '../lib/filmstrip';
import { fmtTimecode } from '../lib/timecode';
import type { Media, TrackKind } from '../lib/mockData';

/** Drag payload type — the sibling's grammar: a custom MIME type so lanes
 *  can distinguish OUR drags from file drags / text selections. */
export const POOL_DRAG_TYPE = 'application/x-mini-media';

/** Module-level current-drag registry: dataTransfer.getData() is NOT
 *  readable during dragover (only at drop), so the lane drop zones need
 *  the dragged media id from somewhere else. Mock-grade mutable singleton
 *  (not store state — it is never rendered, only consulted during a
 *  gesture that the same page owns). */
export const poolDrag: { current: string | null } = { current: null };

/** Can media of this kind land on a track of that kind? (D3.2 routing) */
export function isDroppable(trackKind: TrackKind, mediaKind: Media['kind']): boolean {
  return trackKind === (mediaKind === 'audio' ? 'audio' : 'video');
}

/** Kind glyph for the pool thumb corner (R18g port of the reviewer's
 *  sibling-app feedback #28/#30: "an icon would be better… the standard
 *  NLE way" — video/image/audio get icon badges, not text pills). */
function KindIcon({ kind }: { kind: Media['kind'] }) {
  if (kind === 'audio') return <AudioLines size={12} aria-hidden="true" />;
  if (kind === 'image') return <ImageIcon size={12} aria-hidden="true" />;
  return <Film size={12} aria-hidden="true" />;
}

function MediaCard({ media }: { media: Media }) {
  const addClipFromMedia = useMini((s) => s.addClipFromMedia);
  const [dragSource, setDragSource] = useState(false);

  const onDragStart = (e: ReactDragEvent<HTMLElement>) => {
    e.dataTransfer.setData(POOL_DRAG_TYPE, media.id);
    e.dataTransfer.setData('text/plain', media.id);
    e.dataTransfer.effectAllowed = 'copy';
    poolDrag.current = media.id;
    setDragSource(true);
  };

  const onDragEnd = () => {
    poolDrag.current = null;
    setDragSource(false);
  };

  return (
    <button
      type="button"
      className={`mini-media-card${dragSource ? ' is-drag-source' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => addClipFromMedia(media.id)}
      data-testid={`mini-media-${media.id}`}
      data-media-id={media.id}
      aria-label={`Add ${media.name} (${fmtTimecode(media.duration)}) — click appends, drag places on the timeline`}
      title="Click to append · drag onto a timeline lane to place"
    >
      <span
        className="mini-media-card__thumb"
        aria-hidden="true"
        style={{ background: thumbGradientFor(media) }}
      >
      <span
        className="mini-media-card__kind"
        aria-hidden="true"
        title={media.kind}
      >
        <KindIcon kind={media.kind} />
      </span>
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
      <div className="mini-scroll mini-pool__list" data-testid="mini-pool-list">
        {media.map((m) => (
          <MediaCard key={m.id} media={m} />
        ))}
      </div>
    </aside>
  );
}
