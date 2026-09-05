/* Topbar — floating panel strip: project name · undo/redo · transport
   (play pill + timecode) · Export CTA (honest toast, D3.9/m6). */

import { Play, Pause, Film } from 'lucide-react';
import { useMini } from '../state/useMini';
import { fmtTimecode } from '../lib/timecode';
import { contentEnd } from '../lib/geometry';

export function Topbar() {
  const playing = useMini((s) => s.playing);
  const playhead = useMini((s) => s.playhead);
  const togglePlay = useMini((s) => s.togglePlay);
  const pushToast = useMini((s) => s.pushToast);
  const doc = useMini((s) => s.doc);

  const end = contentEnd(doc.clips);

  return (
    <header className="mini-panel mini-topbar" data-testid="mini-topbar">
      <div className="mini-topbar__brand">
        <Film size={16} className="mini-topbar__logo" />
        <span className="mini-topbar__title">Beach Doc — Mini Cut</span>
      </div>
      <div className="mini-topbar__transport">
        <button
          type="button"
          className="mini-iconbtn"
          aria-label={playing ? 'Pause' : 'Play'}
          title={playing ? 'Pause (Space)' : 'Play (Space)'}
          onClick={() => togglePlay()}
          data-testid="mini-btn-play"
        >
          {playing ? <Pause /> : <Play />}
        </button>
        <span className="mini-mono mini-tc" data-testid="mini-tc">
          {fmtTimecode(playhead)} / {fmtTimecode(end)}
        </span>
      </div>
      <button
        type="button"
        className="mini-cta"
        onClick={() => pushToast('info', 'Export isn’t wired in the mini — this is a UI mock.')}
        data-testid="mini-btn-export"
      >
        Export
      </button>
    </header>
  );
}
