/* Topbar — floating panel strip: project name · Export CTA (honest toast,
   D3.9/m6). R18g (thread #25): the transport (play pill + timecode) moved
   down into the Viewer below the video, centered like RH — the topbar is
   chrome-only now. */

import { Film } from 'lucide-react';
import { useMini } from '../state/useMini';

export function Topbar() {
  const pushToast = useMini((s) => s.pushToast);

  return (
    <header className="mini-panel mini-topbar" data-testid="mini-topbar">
      <div className="mini-topbar__brand">
        <Film size={16} className="mini-topbar__logo" />
        <span className="mini-topbar__title">Beach Doc — Mini Cut</span>
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
