/* ToastRegion — spec 18 §6.4 notification UX: fixed bottom-right, above the
   12px status strip + 42px app dock (§3.1). role="status" for info/success
   (polite live semantics), role="alert" for errors; the region never steals
   focus. Auto-dismiss: info/success 4 s, persist (warning-class) 6 s, error stays
   × button dismisses them. Max-3 stack is enforced by the store (pushToast).
   `data-testid="shell-toast-<n>"`, n = 0..len-1 counting BOTTOM-UP (the
   newest toast sits at the bottom of the stack and owns index 0).
   200 ms slide/fade in; prefers-reduced-motion is zeroed globally in
   app.css. */

import { useEffect } from 'react';
import { Info, CheckCircle2, TriangleAlert, X } from 'lucide-react';
import { useUi, type Toast, type ToastKind } from '../../state/useUiStore';

const ICON: Record<ToastKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  error: TriangleAlert,
  persist: TriangleAlert,
};

const ICON_COLOR: Record<ToastKind, string> = {
  info: 'var(--accent-focus)',
  success: 'var(--mk-green)',
  error: 'var(--danger)',
  persist: 'var(--mute-warn)', // warning-class: persists, but not an error
};

/* spec 18 §6.4: info/success 4 s; warning-class (persist kind) 6 s; error: no timer */
const AUTO_MS: Partial<Record<ToastKind, number>> = { info: 4000, success: 4000, persist: 6000 };

function ToastCard({ toast, testid, onDismiss }: { toast: Toast; testid: string; onDismiss: (id: number) => void }) {
  const ms = AUTO_MS[toast.kind];
  useEffect(() => {
    if (!ms) return;
    const t = window.setTimeout(() => onDismiss(toast.id), ms);
    return () => window.clearTimeout(t);
  }, [ms, toast.id, onDismiss]);

  const Icon = ICON[toast.kind];
  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      data-testid={testid}
      className={`toast-card is-${toast.kind}`}
    >
      <Icon size={14} strokeWidth={1.6} className="shrink-0" style={{ color: ICON_COLOR[toast.kind] }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold leading-snug text-tprimary">{toast.title}</div>
        {toast.detail && <div className="mt-0.5 text-[11px] leading-snug text-tmuted">{toast.detail}</div>}
      </div>
      <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => onDismiss(toast.id)}>
        <X size={11} strokeWidth={1.6} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastRegion() {
  const toasts = useUi((s) => s.toasts);
  const dismissToast = useUi((s) => s.dismissToast);
  if (toasts.length === 0) return null;
  return (
    <div className="toast-region" role="region" aria-label="Notifications">
      {toasts.map((t, i) => (
        /* array order is oldest→newest; index 0 is the BOTTOM (newest) toast */
        <ToastCard key={t.id} toast={t} testid={`shell-toast-${toasts.length - 1 - i}`} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
