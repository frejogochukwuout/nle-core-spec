/* ToastRegion — spec 18 §6.4 notification UX timings, driven with fake
   timers at exact millisecond boundaries: info/success auto-dismiss at 4 s,
   warning-class (persist) at 6 s, error has NO timer (× only), polite/alert
   roles, and the max-3 stack with bottom-up shell-toast-N ids. This is the
   only file using fake timers (per-suite convention). */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ToastRegion } from './ToastRegion';
import { useUi, type ToastKind } from '../../state/useUiStore';

const S = () => useUi.getState();

function push(kind: ToastKind, title: string) {
  act(() => { useUi.getState().pushToast({ kind, title }); });
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('ToastRegion (spec 18 §6.4)', () => {
  it('info toasts auto-dismiss at exactly 4 s', () => {
    render(<ToastRegion />);
    push('info', 'T-info');
    expect(screen.getByTestId('shell-toast-0')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3999); });
    expect(screen.getByTestId('shell-toast-0')).toBeInTheDocument(); // 1 ms early: still up
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByTestId('shell-toast-0')).not.toBeInTheDocument();
    expect(S().toasts).toHaveLength(0);
  });

  it('success is also 4 s; warning-class (persist) holds 6 s', () => {
    render(<ToastRegion />);
    push('success', 'T-ok');
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.queryByTestId('shell-toast-0')).not.toBeInTheDocument();
    push('persist', 'T-warn');
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByTestId('shell-toast-0')).toBeInTheDocument(); // still up at 4 s
    act(() => { vi.advanceTimersByTime(1999); });
    expect(screen.getByTestId('shell-toast-0')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByTestId('shell-toast-0')).not.toBeInTheDocument();
  });

  it('error toasts never auto-dismiss — only the × button clears them', () => {
    render(<ToastRegion />);
    push('error', 'T-err');
    act(() => { vi.advanceTimersByTime(600_000); });
    expect(screen.getByTestId('shell-toast-0')).toBeInTheDocument(); // no timer on error
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByTestId('shell-toast-0')).not.toBeInTheDocument();
    expect(S().toasts).toHaveLength(0);
  });

  it('roles: status for info/success, alert for error (§6.4 live semantics)', () => {
    render(<ToastRegion />);
    push('info', 'A');
    push('success', 'B');
    push('error', 'C');
    expect(screen.getByText('A').closest('[role="status"]')).toBeInTheDocument();
    expect(screen.getByText('B').closest('[role="status"]')).toBeInTheDocument();
    expect(screen.getByText('C').closest('[role="alert"]')).toBeInTheDocument();
  });

  it('max-3 stack: the OLDEST is dropped (registered mock deviation) + bottom-up ids', () => {
    render(<ToastRegion />);
    for (const t of ['t1', 't2', 't3', 't4']) push('info', t);
    // §6.4 says the oldest COLLAPSES to an icon row; the mock DROPS it in
    // pushToast — registered seal-item deviation, documented here as-is.
    expect(S().toasts.map((x) => x.title)).toEqual(['t2', 't3', 't4']);
    // array order oldest→newest; index 0 is the BOTTOM (newest) toast
    expect(within(screen.getByTestId('shell-toast-0')).getByText('t4')).toBeInTheDocument();
    expect(within(screen.getByTestId('shell-toast-1')).getByText('t3')).toBeInTheDocument();
    expect(within(screen.getByTestId('shell-toast-2')).getByText('t2')).toBeInTheDocument();
    expect(screen.queryByText('t1')).not.toBeInTheDocument();
  });

  it('renders nothing when the stack is empty', () => {
    const { queryByRole } = render(<ToastRegion />);
    expect(queryByRole('region', { name: 'Notifications' })).not.toBeInTheDocument();
  });
});
