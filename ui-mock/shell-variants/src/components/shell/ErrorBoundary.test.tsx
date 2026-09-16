/* ErrorBoundary — spec 18 §6.4 last-resort global failure boundary: a crashed
   child swaps to the fallback panel (role=alert, diagnostics pre, reload +
   copy buttons); copy goes through navigator.clipboard with an inline
   fail-state fallback when the clipboard is unavailable (headless jsdom) and
   a toast in both cases. */

import { describe, expect, it, afterEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { useUi } from '../../state/useUiStore';

const S = () => useUi.getState();

function Bomb(): never { throw new Error('boom kaboom'); }

afterEach(() => {
  vi.restoreAllMocks();
  // drop any clipboard stub installed by a test (configurable by definition)
  delete (navigator as { clipboard?: unknown }).clipboard;
});

describe('ErrorBoundary (spec 18 §6.4)', () => {
  it('a crashing child renders the fallback panel instead of the tree', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // silence React's crash log
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    const panel = screen.getByTestId('shell-failure-boundary');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('role', 'alert');
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/Error: boom kaboom/)).toBeInTheDocument(); // diagnostics pre
  });

  it('healthy children pass through untouched', () => {
    render(<ErrorBoundary><p>alive</p></ErrorBoundary>);
    expect(screen.getByText('alive')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-failure-boundary')).not.toBeInTheDocument();
  });

  it('copy diagnostics: clipboard success swaps the button and pushes a success toast', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    fireEvent.click(screen.getByRole('button', { name: /Copy diagnostics/ }));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('boom kaboom'); // full trace payload
    expect(await screen.findByText('Copied')).toBeInTheDocument();
    expect(S().toasts[0].kind).toBe('success');
    expect(S().toasts[0].title).toBe('Diagnostics copied');
  });

  it('copy diagnostics: no clipboard (headless) → inline fail state + error toast', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    fireEvent.click(screen.getByRole('button', { name: /Copy diagnostics/ }));
    expect(await screen.findByText('Copy failed')).toBeInTheDocument();
    expect(S().toasts[0].kind).toBe('error');
    expect(S().toasts[0].title).toBe('Copy failed');
  });
});
