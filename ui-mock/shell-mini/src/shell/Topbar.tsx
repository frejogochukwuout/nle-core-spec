/* Topbar — floating panel strip: project name · Export CTA (honest toast,
   D3.9/m6). R18g (thread #25): the transport (play pill + timecode) moved
   down into the Viewer below the video, centered like RH — the topbar is
   chrome-only now. R18j (thread #17): slimmed to a dense strip.
   R20 (thread #30 follow-up): 36 → 40px — the user's "slightly taller"
   calibration between the R18j 36 and the pre-slim 56.

   ⚠ DOWNSTREAM CUSTOMIZATION POINT (thread #17) — project-context note,
   mirrored in README.md + .agents/HANDOFF.md:
   shell-mini is a UI template meant to be EMBEDDED in a host product,
   not a standalone app. This bar is where a downstream integration
   replaces our placeholder brand + Export with ITS chrome: the exit /
   "back to parent" affordance (cross button, breadcrumb, ESC-to-parent
   handshake), the host's project identity, and the real Export flow
   (render → progress → host artifact handoff). The current Export CTA
   is an honest mock stub on purpose. Keep this bar minimal and
   stateless so a host can swap it without touching the rest of the
   shell; anything richer belongs in the host, not here. */

import { Film } from 'lucide-react';
import { useMini } from '../state/useMini';

export function Topbar() {
  const pushToast = useMini((s) => s.pushToast);

  return (
    <header className="mini-panel mini-topbar" data-testid="mini-topbar">
      <div className="mini-topbar__brand">
        <Film size={14} className="mini-topbar__logo" />
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
