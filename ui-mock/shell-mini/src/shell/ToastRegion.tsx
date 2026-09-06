/* Toast — single honest-feedback surface (D3.9): bottom-center pill,
   RH chrome surface. Auto-dismiss after 2.6s. */

import { useEffect } from 'react';
import { Info, AlertCircle } from 'lucide-react';
import { useMini } from '../state/useMini';

const TOAST_MS = 2600;

export function ToastRegion() {
  const toast = useMini((s) => s.toast);
  const dismiss = useMini((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(dismiss, TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast, dismiss]);

  if (!toast) return null;
  return (
    <div
      className={`mini-toast${toast.kind === 'error' ? ' is-error' : ''}`}
      role="status"
      data-testid="mini-toast"
      key={toast.seq}
    >
      {toast.kind === 'error' ? <AlertCircle size={14} /> : <Info size={14} />}
      <span>{toast.text}</span>
    </div>
  );
}
