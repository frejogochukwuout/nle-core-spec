/* Inspector — read-only facts for the selection + the ONE real control:
   Nudge ±0.5s (neighbor-clamped, one history entry per click, D3.7/m10).
   No dead fields (zero-no-op discipline, R14).
   R18j: collapses to a thin right rail (thread #13, “INSPECTOR” 90° —
   the standard collapsed-panel style); images drop “Source length”
   (thread #18 — a still has no source length; its extent on the
   timeline is an edit decision, shown as Duration). */

import { ChevronLeft, ChevronRight, MousePointerClick, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useMini } from '../state/useMini';
import { fmtTimecode } from '../lib/timecode';
import { neighborBounds } from '../lib/geometry';

export function Inspector() {
  const doc = useMini((s) => s.doc);
  const selectedId = useMini((s) => s.selectedId);
  const nudge = useMini((s) => s.nudge);

  /* R18j (thread #13): collapse rail. Mode-aware like the pool's: with
   *  viewerMax ON the rail means “hidden for max view” and its click
   *  EXITS max mode; otherwise it just expands this panel. */
  const collapsed = useMini((s) => s.inspectorCollapsed || s.viewerMax);
  const viewerMax = useMini((s) => s.viewerMax);
  const toggleInspector = useMini((s) => s.toggleInspector);
  const setInspectorCollapsed = useMini((s) => s.setInspectorCollapsed);
  const toggleViewerMax = useMini((s) => s.toggleViewerMax);

  const clip = selectedId ? doc.clips.find((c) => c.id === selectedId) : undefined;
  const media = clip ? doc.media.find((m) => m.id === clip.mediaId) : undefined;
  const track = clip ? doc.tracks.find((t) => t.id === clip.trackId) : undefined;
  const canNudge = (delta: number): boolean => {
    if (!clip) return false;
    const { prevEnd, nextStart } = neighborBounds(doc, clip);
    const target = clip.start + delta;
    return target >= prevEnd && target + clip.duration <= nextStart;
  };

  if (collapsed) {
    return (
      <aside
        className="mini-panel mini-inspector is-collapsed"
        data-testid="mini-inspector-collapsed"
        aria-label="Inspector collapsed"
      >
        <button
          type="button"
          className="mini-rail"
          onClick={() => (viewerMax ? toggleViewerMax() : setInspectorCollapsed(false))}
          aria-label="Show inspector"
          title="Show inspector"
          data-testid="mini-btn-inspector-expand"
        >
          <PanelRightOpen size={14} strokeWidth={1.75} aria-hidden="true" />
          <span className="mini-rail__label">Inspector</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="mini-panel mini-inspector" data-testid="mini-inspector" aria-label="Inspector">
      <div className="mini-panel__head mini-inspector__head">
        <span className="mini-inspector__head-label">Inspector</span>
        <button
          type="button"
          className="mini-inspector__collapse"
          aria-label="Collapse inspector"
          title="Collapse inspector"
          onClick={toggleInspector}
          data-testid="mini-btn-inspector-collapse"
        >
          <PanelRightClose size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      {clip && media && track ? (
        <div className="mini-inspector__body">
          <div className="mini-inspector__name" data-testid="mini-inspector-name">
            {media.name}
          </div>
          <dl className="mini-inspector__facts">
            <div>
              <dt>Track</dt>
              <dd className="mini-mono">{track.label}</dd>
            </div>
            <div>
              <dt>Kind</dt>
              <dd>{media.kind}</dd>
            </div>
            <div>
              <dt>Start</dt>
              <dd className="mini-mono" data-testid="mini-inspector-start">
                {fmtTimecode(clip.start)}
              </dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd className="mini-mono">{fmtTimecode(clip.duration)}</dd>
            </div>
            <div>
              <dt>End</dt>
              <dd className="mini-mono">{fmtTimecode(clip.start + clip.duration)}</dd>
            </div>
            {/* R18j (thread #18): stills have no source length — the clip's
                Duration above IS the placement decision; showing a source
                length for an image invented a fact the media never had */}
            {media.kind !== 'image' && (
              <div>
                <dt>Source length</dt>
                <dd className="mini-mono">{fmtTimecode(media.duration)}</dd>
              </div>
            )}
          </dl>
          <div className="mini-inspector__nudge">
            <span className="mini-inspector__nudge-label">Nudge ±0.5s</span>
            <div className="mini-inspector__nudge-btns">
              <button
                type="button"
                className="mini-iconbtn"
                aria-label="Nudge left 0.5 seconds"
                disabled={!canNudge(-0.5)}
                onClick={() => nudge(clip.id, -0.5)}
                data-testid="mini-btn-nudge-left"
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                className="mini-iconbtn"
                aria-label="Nudge right 0.5 seconds"
                disabled={!canNudge(0.5)}
                onClick={() => nudge(clip.id, 0.5)}
                data-testid="mini-btn-nudge-right"
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mini-inspector__empty" data-testid="mini-inspector-empty">
          <MousePointerClick className="mini-inspector__empty-icon" size={22} strokeWidth={1.5} aria-hidden="true" />
          <span>Select a clip to see its facts.</span>
          <span className="mini-inspector__empty-hint">Click any clip on the timeline.</span>
        </div>
      )}
    </aside>
  );
}
