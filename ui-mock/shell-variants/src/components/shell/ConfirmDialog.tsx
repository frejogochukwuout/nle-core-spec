/* ConfirmDialog — spec 18 §6.4 destructive-action confirmation: focus-
   trapped alertdialog, Esc and ⌘. cancel, danger styling on the confirm
   button (var(--danger)). API (context pattern, mounted in AppShell):

     const confirm = useConfirm();
     confirm({ title, body, confirmLabel, danger, onConfirm });

   Initial focus follows the WAI-ARIA dialog guidance + the mock's undo-is-
   the-safety-net story: for danger requests focus starts on the CANCEL
   (safe) button — the destructive action is a deliberate step, not the
   default; non-danger requests keep confirm-first. Consumers (per the
   task): SceneTabs close-tab with clips, clip-menu multi-delete with
   ≥ 5 selected elements. Everything else commits directly — undo is the
   safety net (§6.4). */

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean; // red confirm button
  onConfirm: () => void;
}

export type ConfirmFn = (opts: ConfirmOptions) => void;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error('useConfirm() requires <ConfirmProvider> (spec 18 §6.4)');
  return fn;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<ConfirmOptions | null>(null);
  const reqRef = useRef<ConfirmOptions | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    reqRef.current = opts;
    setReq(opts);
  }, []);

  const cancel = useCallback(() => {
    reqRef.current = null;
    setReq(null);
  }, []);

  const accept = useCallback(() => {
    const r = reqRef.current;
    reqRef.current = null;
    setReq(null);
    r?.onConfirm();
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {req && <ConfirmDialog req={req} onCancel={cancel} onConfirm={accept} />}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({ req, onCancel, onConfirm }: { req: ConfirmOptions; onCancel: () => void; onConfirm: () => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  /* initial focus: danger → the CANCEL (safe) button (R13 fix — destructive
     confirms must not default-focus the dangerous action); non-danger →
     confirm-first as before. Re-runs on every new request object. */
  useEffect(() => { (req.danger ? cancelRef : confirmRef).current?.focus(); }, [req]);

  const onKey = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // the modal owns the keyboard while open (cheat-sheet pattern)
    if (e.key === 'Escape' || ((e.metaKey || e.ctrlKey) && e.key === '.')) {
      e.preventDefault();
      onCancel(); // §6.4: ⌘. cancels
    } else if (e.key === 'Tab') {
      e.preventDefault(); // two-stop focus trap
      const btns = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLButtonElement[];
      if (btns.length === 0) return;
      const idx = btns.findIndex((b) => b === document.activeElement);
      const next = e.shiftKey
        ? (idx <= 0 ? btns.length - 1 : Math.max(0, idx - 1))
        : (idx === btns.length - 1 ? 0 : idx + 1);
      btns[next].focus();
    }
  };

  return (
    <div
      className="confirm-backdrop"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="shell-confirm-title"
        aria-describedby={req.body ? 'shell-confirm-body' : undefined}
        data-testid="shell-confirm"
        className="confirm-dialog"
        onKeyDown={onKey}
      >
        <h2 id="shell-confirm-title" className="text-[14px] font-semibold text-tprimary">{req.title}</h2>
        {req.body && (
          <p id="shell-confirm-body" className="mt-1.5 text-[12px] leading-snug text-tmuted">{req.body}</p>
        )}
        <div className="mt-3.5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" data-testid="shell-confirm-cancel" className="confirm-btn ghost" onClick={onCancel}>
            {req.cancelLabel ?? 'Cancel'}
          </button>
          <button
            ref={confirmRef}
            type="button"
            data-testid="shell-confirm-confirm"
            className={`confirm-btn ${req.danger ? 'danger' : 'primary'}`}
            onClick={onConfirm}
          >
            {req.confirmLabel ?? (req.danger ? 'Delete' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
