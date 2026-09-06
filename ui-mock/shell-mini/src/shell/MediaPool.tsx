/* Media pool — mock asset cards (D3.5, R18e).
   Click = append to the correct lane (audio→A1, video/image→V1).
   DRAG = pool→timeline DnD (R18e, the v0.2 deferral closed — pattern
   ported from the sibling shell-variants env, with a REAL commit on
   drop: the lane drop zones live in Timeline.tsx and call
   insertMediaAt, so a drop actually places the clip at the cursor
   position, not a toast).
   R18j: collapsible to a thin left rail (thread #14), hover-autoplay
   video previews (thread #15), images carry no duration chip (thread
   #18 — a still has no intrinsic length; its timeline extent is an
   edit decision, not a media fact). */

import { useEffect, useRef, useState, type DragEvent as ReactDragEvent } from 'react';
import { Film, Image as ImageIcon, AudioLines, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useMini } from '../state/useMini';
import { thumbGradientFor } from '../lib/filmstrip';
import { fmtTimecode } from '../lib/timecode';
import type { Media, TrackKind } from '../lib/mockData';

/** R18i (shell thread #11): pool type tabs — All / Video / Image / Audio.
 *  View-only filter state (local useState — no doc, no history): the
 *  reviewer wanted to "switch media types (at least audio vs video)";
 *  the head's "MEDIA" label became the segmented control itself. */
type PoolTab = Media['kind'] | 'all';

const POOL_TABS: { id: PoolTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'video', label: 'Video' },
  { id: 'image', label: 'Image' },
  { id: 'audio', label: 'Audio' },
];

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

/** R18j (thread #15): hover-preview interval — 100ms ticks read as a
 *  scrubbing timecode without flooding React at rAF rate. */
const PREVIEW_TICK_MS = 100;

function MediaCard({ media }: { media: Media }) {
  const addClipFromMedia = useMini((s) => s.addClipFromMedia);
  const [dragSource, setDragSource] = useState(false);
  /** R18j (thread #15) "autoplay videos when hovering": a real app mounts a
   *  <video> and .play()s it on hover (poster = first frame). This mock's
   *  media are synthetic, so the honest equivalent: the thumb animates (a
   *  slow pan over a doubled gradient = emulated camera motion) and the
   *  duration chip becomes a LIVE timecode that scrubs 0→duration on loop.
   *  Images never autoplay (stills); audio too (nothing visual to play).
   *  Keyboard parity: focus engages the same preview (focus-visible users
   *  get the affordance, not just pointer users). */
  const [previewT, setPreviewT] = useState<number | null>(null);
  const previewTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPreview = () => {
    if (previewTimer.current !== null) {
      clearInterval(previewTimer.current);
      previewTimer.current = null;
    }
    setPreviewT(null);
  };

  useEffect(() => stopPreview, []); // unmount: never a dangling interval

  const startPreview = () => {
    if (media.kind !== 'video') return; // stills / audio have nothing to autoplay
    if (previewTimer.current !== null) return;
    setPreviewT(0);
    previewTimer.current = setInterval(() => {
      setPreviewT((t) => (t === null ? 0 : (t + PREVIEW_TICK_MS / 1000) % media.duration));
    }, PREVIEW_TICK_MS);
  };

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

  const previewing = previewT !== null;
  // R18j (thread #18): an image has no intrinsic duration — no chip, and
  // the aria-label drops the duration clause for stills
  const durLabel = media.kind === 'image' ? '' : ` (${fmtTimecode(media.duration)})`;

  return (
    <button
      type="button"
      className={`mini-media-card${dragSource ? ' is-drag-source' : ''}${previewing ? ' is-previewing' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => addClipFromMedia(media.id)}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
      onFocus={startPreview}
      onBlur={stopPreview}
      data-testid={`mini-media-${media.id}`}
      data-media-id={media.id}
      aria-label={`Add ${media.name}${durLabel} — click appends, drag places on the timeline`}
      title="Click to append · drag onto a timeline lane to place"
    >
      <span
        className={`mini-media-card__thumb${previewing ? ' is-previewing' : ''}`}
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
        {/* R18j thread #18: no duration chip for images. While a video
            preview runs (thread #15) the chip scrubs live; at rest it
            shows the source length. */}
        {media.kind !== 'image' && (
          <span className="mini-media-card__dur mini-mono" data-testid={`mini-dur-${media.id}`}>
            {previewing ? `▶ ${fmtTimecode(previewT ?? 0)}` : fmtTimecode(media.duration)}
          </span>
        )}
      </span>
    </button>
  );
}

export function MediaPool() {
  const media = useMini((s) => s.doc.media);
  const [tab, setTab] = useState<PoolTab>('all');
  /* R18k (thread #23): video-only mode — the simplified special mode has
   * no media-type concept: no tabs, the list filters to video (audio is
   * what's baked into the clips; stills live in the full editor). The
   * local tab state survives the mode switch so paired mode restores
   * the reviewer's last filter. */
  const trackMode = useMini((s) => s.trackMode);
  const videoOnly = trackMode === 'video';
  const shown = videoOnly ? media.filter((m) => m.kind === 'video') : tab === 'all' ? media : media.filter((m) => m.kind === tab);

  /* R18j (thread #14): the pool collapses to a thin left rail. The rail's
   *  expand click is mode-aware: with viewerMax ON the rail means "hidden
   *  for max view", so clicking it EXITS max (restores the user's full
   *  layout); otherwise it just expands this panel. */
  const collapsed = useMini((s) => s.poolCollapsed || s.viewerMax);
  const viewerMax = useMini((s) => s.viewerMax);
  const togglePool = useMini((s) => s.togglePool);
  const setPoolCollapsed = useMini((s) => s.setPoolCollapsed);
  const toggleViewerMax = useMini((s) => s.toggleViewerMax);

  if (collapsed) {
    return (
      <aside
        className="mini-panel mini-pool is-collapsed"
        data-testid="mini-pool-collapsed"
        aria-label="Media pool collapsed"
      >
        <button
          type="button"
          className="mini-rail"
          onClick={() => (viewerMax ? toggleViewerMax() : setPoolCollapsed(false))}
          aria-label="Show media pool"
          title="Show media pool"
          data-testid="mini-btn-pool-expand"
        >
          <PanelLeftOpen size={14} strokeWidth={1.75} aria-hidden="true" />
          <span className="mini-rail__label">Media</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="mini-panel mini-pool" data-testid="mini-pool" aria-label="Media pool">
      {videoOnly ? (
        /* video-only head: a plain title + the collapse button (thread
           #23: "the media bin need no tabs as we filter to just video
           types") — the segmented control is the full editor's grammar */
        <div className="mini-panel__head mini-pool__head" data-testid="mini-pool-head-video">
          <span className="mini-pool__title">Media</span>
          <button
            type="button"
            className="mini-pool__collapse"
            aria-label="Collapse media pool"
            title="Collapse media pool"
            onClick={togglePool}
            data-testid="mini-btn-pool-collapse"
          >
            <PanelLeftClose size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="mini-panel__head mini-pool__tabs" role="group" aria-label="Filter media by type">
          {POOL_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`mini-pool__tab${tab === t.id ? ' is-active' : ''}`}
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
              data-testid={`mini-pool-tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            className="mini-pool__collapse"
            aria-label="Collapse media pool"
            title="Collapse media pool"
            onClick={togglePool}
            data-testid="mini-btn-pool-collapse"
          >
            <PanelLeftClose size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="mini-scroll mini-pool__list" data-testid="mini-pool-list">
        {shown.map((m) => (
          <MediaCard key={m.id} media={m} />
        ))}
        {shown.length === 0 && (
          <p className="mini-pool__empty" data-testid="mini-pool-empty">
            {videoOnly ? 'No video media in this project' : `No ${tab} media in this project`}
          </p>
        )}
      </div>
    </aside>
  );
}
