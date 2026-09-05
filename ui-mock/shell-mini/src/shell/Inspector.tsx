/* Inspector — read-only facts for the selection + the ONE real control:
   Nudge ±0.5s (neighbor-clamped, one history entry per click, D3.7/m10).
   No dead fields (zero-no-op discipline, R14). */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMini } from '../state/useMini';
import { fmtTimecode } from '../lib/timecode';
import { neighborBounds } from '../lib/geometry';

export function Inspector() {
  const doc = useMini((s) => s.doc);
  const selectedId = useMini((s) => s.selectedId);
  const nudge = useMini((s) => s.nudge);

  const clip = selectedId ? doc.clips.find((c) => c.id === selectedId) : undefined;
  const media = clip ? doc.media.find((m) => m.id === clip.mediaId) : undefined;
  const track = clip ? doc.tracks.find((t) => t.id === clip.trackId) : undefined;
  const canNudge = (delta: number): boolean => {
    if (!clip) return false;
    const { prevEnd, nextStart } = neighborBounds(doc, clip);
    const target = clip.start + delta;
    return target >= prevEnd && target + clip.duration <= nextStart;
  };

  return (
    <aside className="mini-panel mini-inspector" data-testid="mini-inspector" aria-label="Inspector">
      <div className="mini-panel__head">Inspector</div>
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
            <div>
              <dt>Source length</dt>
              <dd className="mini-mono">{fmtTimecode(media.duration)}</dd>
            </div>
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
          Select a clip to see its facts.
        </div>
      )}
    </aside>
  );
}
