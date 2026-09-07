/* Toast — single honest-feedback surface (D3.9): bottom-center pill,
   RH chrome surface. Auto-dismiss after 2.6s.
   PR69 C6: honest feedback cuts both ways — errors outlive a single
   glance (8s TTL), hover/focus PAUSES the timer (a reader mid-sentence
   no longer loses the message), and errors carry a manual close
   affordance. Info toasts keep the 2.6s cadence (rapid actions replace
   by design — the toast is a status line, not a log). */

import { useEffect, useState } from 'react';
import { Info, AlertCircle, X } from 'lucide-react';
import { useMini } from '../state/useMini';

const TOAST_MS = 2600;
/** PR69 C6: refusals/errors need ~2 reads — the reviewer measured the
 * "lane is full" error at roughly that. Longer than info, bounded. */
const ERROR_TOAST_MS = 8000;

export function ToastRegion() {
  const toast = useMini((s) => s.toast);
  const dismiss = useMini((s) => s.dismissToast);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!toast || paused) return;
    const t = window.setTimeout(dismiss, toast.kind === 'error' ? ERROR_TOAST_MS : TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast, dismiss, paused]);

  if (!toast) return null;
  return (
    <div
      className={`mini-toast${toast.kind === 'error' ? ' is-error' : ''}`}
      /* R1-b P3-9: errors need ATTENTION — the polite status live region
       * could be missed; WCAG convention is role=alert for errors,
       * status stays for informational toasts. */
      role={toast.kind === 'error' ? 'alert' : 'status'}
      data-testid="mini-toast"
      key={toast.seq}
      /* PR69 C6: pause-on-hover/focus — the timer effect re-arms on the
       * paused flag; un-pausing restarts the full TTL (simple, honest —
       * the reader was just given an open-ended pause anyway). */
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {toast.kind === 'error' ? <AlertCircle size={14} /> : <Info size={14} />}
      <span>{toast.text}</span>
      {toast.kind === 'error' && (
        <button
          type="button"
          className="mini-toast__close"
          aria-label="Dismiss message"
          onClick={dismiss}
          data-testid="mini-toast-close"
        >
          <X size={12} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
