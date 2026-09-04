/* ErrorBoundary — spec 18 §6.4 global failure boundary: one React boundary
   around the shell tree rendering "Something went wrong — reload / copy
   diagnostics". Last resort only: per-command errors are typed results and
   never reach it (spec 15 §6). Diagnostics = error + stack + component
   stack. Copy goes through navigator.clipboard (may fail headless → inline
   status + error toast). Toasts are ALSO pushed, but since <ToastRegion/>
   lives inside the crashed tree, the inline status is the guaranteed
   feedback channel. Mounted in App.tsx around <AppShell/> only — the debug
   overlay and cheat sheet stay alive after a crash. */

import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert, RotateCcw, Copy, Check } from 'lucide-react';
import { useUi } from '../../state/useUiStore';

interface BoundaryState {
  error: Error | null;
  componentStack: string | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error, componentStack: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, componentStack: info.componentStack ?? null });
  }

  render() {
    if (this.state.error) {
      return <FailurePanel error={this.state.error} componentStack={this.state.componentStack} />;
    }
    return this.props.children;
  }
}

function FailurePanel({ error, componentStack }: { error: Error; componentStack: string | null }) {
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle');

  const copyDiagnostics = async () => {
    const text = [
      `nle-shell mockup crash — ${error.name}: ${error.message}`,
      error.stack ?? '(no stack)',
      componentStack ? `\ncomponent stack:\n${componentStack}` : '',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('ok');
      useUi.getState().pushToast({ kind: 'success', title: 'Diagnostics copied', detail: 'Crash report is on the clipboard' });
    } catch {
      setCopyState('fail');
      useUi.getState().pushToast({ kind: 'error', title: 'Copy failed', detail: 'Clipboard unavailable — reload and reproduce to capture the trace' });
    }
  };

  return (
    <div
      role="alert"
      className="fixed inset-0 z-[99] flex flex-col items-center justify-center gap-3 bg-app/95 px-6 text-center"
      data-testid="shell-failure-boundary"
    >
      <TriangleAlert size={22} strokeWidth={1.6} className="text-[var(--danger)]" aria-hidden="true" />
      <h1 className="text-[16px] font-semibold text-tprimary">Something went wrong</h1>
      <p className="max-w-[440px] text-[12px] leading-snug text-tmuted">
        The shell hit a render error and stopped. This is the §6.4 last-resort boundary — command-level
        errors never land here. Reload restores the initial mock state.
      </p>
      <pre className="mono max-h-[26vh] w-full max-w-[560px] overflow-auto whitespace-pre-wrap rounded border border-soft bg-inset p-2 text-left text-[11px] leading-snug text-tmuted">
        {`${error.name}: ${error.message}\n${(componentStack ?? '').trim() || '(no component stack)'}`}
      </pre>
      <div className="flex gap-2">
        <button type="button" className="confirm-btn primary" onClick={() => location.reload()}>
          <RotateCcw size={13} strokeWidth={1.6} aria-hidden="true" /> Reload
        </button>
        <button type="button" className="confirm-btn ghost" onClick={copyDiagnostics}>
          {copyState === 'ok' ? <Check size={13} strokeWidth={1.6} aria-hidden="true" /> : <Copy size={13} strokeWidth={1.6} aria-hidden="true" />}
          {copyState === 'ok' ? 'Copied' : copyState === 'fail' ? 'Copy failed' : 'Copy diagnostics'}
        </button>
      </div>
    </div>
  );
}
